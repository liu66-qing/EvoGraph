"""Admin and system endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from evograph.models.api_schemas import HealthResponse
from evograph.graph.neo4j_client import neo4j_client
from evograph.storage.redis_cache import redis_client
from evograph.storage.vector_store import vector_store

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    neo4j_ok = await neo4j_client.health_check()
    redis_ok = await redis_client.health_check()
    qdrant_ok = vector_store.health_check()

    return HealthResponse(
        status="healthy" if all([neo4j_ok, redis_ok, qdrant_ok]) else "degraded",
        neo4j="ok" if neo4j_ok else "error",
        postgres="ok",  # TODO: actual check
        redis="ok" if redis_ok else "error",
        qdrant="ok" if qdrant_ok else "error",
    )


@router.get("/metrics")
async def get_metrics() -> dict:
    from evograph.llm.client import llm_client
    return llm_client.get_stats()
