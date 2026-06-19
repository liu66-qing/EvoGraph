"""Unified LLM client supporting OpenAI-compatible APIs (DeepSeek, etc.)."""

from __future__ import annotations

import time
from typing import Any

from openai import AsyncOpenAI
import structlog

from evograph.config import settings

logger = structlog.get_logger()


class LLMClient:
    def __init__(self) -> None:
        self._client = AsyncOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
        )
        self._model = settings.llm_model_id
        self._call_stats: list[dict] = []
        self._total_tokens: int = 0
        self._total_cost: float = 0.0

    async def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
        max_tokens: int = 4096,
        response_format: dict[str, str] | None = None,
    ) -> str:
        kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            kwargs["response_format"] = response_format

        start_time = time.time()
        response = await self._client.chat.completions.create(**kwargs)
        latency_ms = int((time.time() - start_time) * 1000)

        if response.usage:
            usage = response.usage
            stat = {
                "model": self._model,
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
                "timestamp": time.time(),
                "latency_ms": latency_ms,
            }
            self._call_stats.append(stat)
            self._total_tokens += usage.total_tokens
            self._total_cost += (usage.prompt_tokens * 0.001 + usage.completion_tokens * 0.002) / 1000

        return response.choices[0].message.content or ""

    async def chat_json(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
    ) -> str:
        return await self.chat(
            messages,
            temperature=temperature,
            response_format={"type": "json_object"},
        )

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
    ):
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=temperature,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def get_stats(self) -> dict:
        return {
            "total_calls": len(self._call_stats),
            "total_tokens": self._total_tokens,
            "total_cost_yuan": round(self._total_cost, 4),
            "avg_latency_ms": int(
                sum(s["latency_ms"] for s in self._call_stats) / max(len(self._call_stats), 1)
            ),
            "recent_calls": self._call_stats[-10:],
        }

    def reset_stats(self) -> None:
        self._call_stats.clear()
        self._total_tokens = 0
        self._total_cost = 0.0


llm_client = LLMClient()
