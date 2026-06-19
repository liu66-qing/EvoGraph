"""Tests for SessionMemory."""

import json
from unittest.mock import AsyncMock, patch, MagicMock

import pytest

from evograph.memory.session_store import SessionMemory


class TestSessionMemory:
    @pytest.mark.asyncio
    async def test_add(self):
        mock_redis = MagicMock()
        mock_redis.rpush = AsyncMock()
        mock_redis.expire = AsyncMock()

        with patch("evograph.memory.session_store.redis_client") as mock_client:
            mock_client.client = mock_redis
            await SessionMemory.add("session-1", {"question": "hello", "answer": "world"})

        mock_redis.rpush.assert_called_once()
        key = mock_redis.rpush.call_args[0][0]
        assert key == "session:session-1:memory"
        data = json.loads(mock_redis.rpush.call_args[0][1])
        assert data["question"] == "hello"
        assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_get_history(self):
        stored = [
            json.dumps({"question": "q1", "answer": "a1", "timestamp": 1.0}),
            json.dumps({"question": "q2", "answer": "a2", "timestamp": 2.0}),
        ]
        mock_redis = MagicMock()
        mock_redis.lrange = AsyncMock(return_value=stored)

        with patch("evograph.memory.session_store.redis_client") as mock_client:
            mock_client.client = mock_redis
            history = await SessionMemory.get_history("session-1", limit=10)

        assert len(history) == 2
        assert history[0]["question"] == "q1"
        assert history[1]["question"] == "q2"

    @pytest.mark.asyncio
    async def test_clear(self):
        mock_redis = MagicMock()
        mock_redis.delete = AsyncMock()

        with patch("evograph.memory.session_store.redis_client") as mock_client:
            mock_client.client = mock_redis
            await SessionMemory.clear("session-1")

        mock_redis.delete.assert_called_once_with("session:session-1:memory")
