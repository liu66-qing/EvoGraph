"""Redis-backed session memory for multi-turn dialogue."""

from __future__ import annotations

import json
import time

from evograph.storage.redis_cache import redis_client

SESSION_TTL = 7200


class SessionMemory:
    @staticmethod
    async def add(session_id: str, entry: dict) -> None:
        key = f"session:{session_id}:memory"
        entry["timestamp"] = time.time()
        await redis_client.client.rpush(key, json.dumps(entry, default=str))
        await redis_client.client.expire(key, SESSION_TTL)

    @staticmethod
    async def get_history(session_id: str, limit: int = 10) -> list[dict]:
        key = f"session:{session_id}:memory"
        raw = await redis_client.client.lrange(key, -limit, -1)
        return [json.loads(item) for item in raw]

    @staticmethod
    async def clear(session_id: str) -> None:
        await redis_client.client.delete(f"session:{session_id}:memory")


session_memory = SessionMemory()
