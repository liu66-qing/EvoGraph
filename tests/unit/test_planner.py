"""Tests for QueryPlanner."""

import json
from unittest.mock import AsyncMock, patch

import pytest

from evograph.agent.planner import QueryPlanner
from evograph.models.domain import QueryIntent


@pytest.fixture
def planner():
    return QueryPlanner()


class TestQueryPlanner:
    @pytest.mark.asyncio
    async def test_plan_returns_intent_and_steps(self, planner):
        mock_response = json.dumps({
            "intent": "factual",
            "steps": [
                {"action": "search", "tool": "hybrid_search", "params": {"query": "test"}},
                {"action": "verify", "tool": "graph_query", "params": {"query": "test"}},
            ],
        })
        with patch("evograph.agent.planner.llm_client.chat_json", new_callable=AsyncMock) as mock_chat:
            mock_chat.return_value = mock_response
            intent, steps = await planner.plan("Who founded Macondo?")

        assert intent == QueryIntent.FACTUAL
        assert len(steps) >= 1
        assert steps[0].tool in ("hybrid_search", "graph_query", "vector_search")

    @pytest.mark.asyncio
    async def test_plan_fallback_on_invalid_json(self, planner):
        with patch("evograph.agent.planner.llm_client.chat_json", new_callable=AsyncMock) as mock_chat:
            mock_chat.return_value = "not valid json at all"
            intent, steps = await planner.plan("What happened?")

        assert intent == QueryIntent.FACTUAL
        assert len(steps) >= 1
