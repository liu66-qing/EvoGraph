"""Tests for AgentOrchestrator."""

import json
from unittest.mock import AsyncMock, patch

import pytest

from evograph.agent.orchestrator import AgentOrchestrator
from evograph.models.domain import QueryIntent, ReasoningStep


@pytest.fixture
def orchestrator():
    return AgentOrchestrator(max_iterations=2)


def _make_plan_result():
    return (
        QueryIntent.FACTUAL,
        [ReasoningStep(step_id=1, action="search", tool="hybrid_search", input_params={"query": "test"})],
    )


class TestAgentOrchestrator:
    @pytest.mark.asyncio
    async def test_run_full_cycle(self, orchestrator):
        synthesis_response = json.dumps({
            "answer": "Macondo was founded by Jose Arcadio Buendia.",
            "confidence": 0.9,
            "key_facts": ["Jose founded Macondo"],
            "unresolved_conflicts": [],
            "evidence_gaps": [],
        })
        validation_response = json.dumps({
            "is_valid": True,
            "issues": [],
            "suggested_confidence": 0.9,
        })

        tool_result = {"success": True, "data": {"chunks": [{"text": "Jose founded Macondo"}], "graph_context": []}}

        with patch.object(orchestrator.planner, "plan", new_callable=AsyncMock) as mock_plan, \
             patch("evograph.agent.orchestrator.llm_client") as mock_llm, \
             patch("evograph.agent.orchestrator.tool_registry") as mock_tools, \
             patch("evograph.agent.orchestrator.session_memory") as mock_memory:
            mock_plan.return_value = _make_plan_result()
            mock_llm.chat_json = AsyncMock(side_effect=[synthesis_response, validation_response])
            mock_llm._total_tokens = 100
            mock_llm._total_cost = 0.001
            mock_tools.execute = AsyncMock(return_value=tool_result)
            mock_memory.get_history = AsyncMock(return_value=[])
            mock_memory.add = AsyncMock()

            result = await orchestrator.run("Who founded Macondo?")

        assert result.answer == "Macondo was founded by Jose Arcadio Buendia."
        assert result.confidence == 0.9
        assert len(result.reasoning_trace) >= 1

    @pytest.mark.asyncio
    async def test_replan_on_validation_failure(self, orchestrator):
        synthesis_response = json.dumps({
            "answer": "Some answer",
            "confidence": 0.5,
            "key_facts": [],
            "unresolved_conflicts": [],
            "evidence_gaps": ["missing info"],
        })
        validation_fail = json.dumps({
            "is_valid": False,
            "issues": ["claim not grounded"],
            "suggested_confidence": 0.3,
        })
        validation_pass = json.dumps({
            "is_valid": True,
            "issues": [],
            "suggested_confidence": 0.7,
        })

        tool_result = {"success": True, "data": {"chunks": [{"text": "data"}], "graph_context": []}}

        with patch.object(orchestrator.planner, "plan", new_callable=AsyncMock) as mock_plan, \
             patch("evograph.agent.orchestrator.llm_client") as mock_llm, \
             patch("evograph.agent.orchestrator.tool_registry") as mock_tools, \
             patch("evograph.agent.orchestrator.session_memory") as mock_memory:
            mock_plan.return_value = _make_plan_result()
            mock_llm.chat_json = AsyncMock(side_effect=[
                synthesis_response, validation_fail,
                synthesis_response, validation_pass,
            ])
            mock_llm._total_tokens = 200
            mock_llm._total_cost = 0.002
            mock_tools.execute = AsyncMock(return_value=tool_result)
            mock_memory.get_history = AsyncMock(return_value=[])
            mock_memory.add = AsyncMock()

            result = await orchestrator.run("Complex question")

        assert result.confidence == 0.7
        assert result.total_duration_ms > 0
