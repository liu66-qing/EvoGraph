"""Tests for GraphMerger conflict blocking."""

from unittest.mock import AsyncMock, patch

import pytest

from evograph.evolution.merger import GraphMerger
from evograph.models.domain import (
    ExtractionResult,
    ExtractedEntity,
    ExtractedRelation,
    EntityType,
    KnowledgeConflict,
    ConflictType,
    ConflictStatus,
    GraphRelation,
)


@pytest.fixture
def merger():
    return GraphMerger()


@pytest.fixture
def sample_extraction():
    return ExtractionResult(
        entities=[
            ExtractedEntity(name="Jose", type=EntityType.PERSON),
            ExtractedEntity(name="Macondo", type=EntityType.LOCATION),
        ],
        relations=[
            ExtractedRelation(
                source_entity="Jose",
                target_entity="Macondo",
                relation_type="FOUNDED",
                confidence=0.95,
            ),
        ],
        document_id="doc-1",
        chunk_id="chunk-1",
    )


class TestGraphMerger:
    @pytest.mark.asyncio
    async def test_no_conflict_creates_relation(self, merger, sample_extraction):
        with patch("evograph.evolution.merger.neo4j_client") as mock_neo4j, \
             patch("evograph.evolution.merger.conflict_detector") as mock_detector:
            mock_neo4j.execute_query = AsyncMock(return_value=[])
            mock_neo4j.execute_write = AsyncMock()
            mock_detector.detect_conflicts = AsyncMock(return_value=[])

            stats = await merger.merge_extraction(
                sample_extraction, {"Jose": "Jose", "Macondo": "Macondo"}
            )

        assert stats["relations_created"] == 1
        assert stats["conflicts_detected"] == 0

    @pytest.mark.asyncio
    async def test_conflict_creates_pending_relation(self, merger, sample_extraction):
        conflict = KnowledgeConflict(
            type=ConflictType.TEMPORAL_OVERLAP,
            status=ConflictStatus.OPEN,
            description="Temporal overlap on FOUNDED",
            fact_a=GraphRelation(source_id="a", target_id="b", relation_type="FOUNDED"),
            fact_b=GraphRelation(source_id="a", target_id="b", relation_type="FOUNDED"),
        )

        with patch("evograph.evolution.merger.neo4j_client") as mock_neo4j, \
             patch("evograph.evolution.merger.conflict_detector") as mock_detector:
            mock_neo4j.execute_query = AsyncMock(return_value=[])
            mock_neo4j.execute_write = AsyncMock()
            mock_detector.detect_conflicts = AsyncMock(return_value=[conflict])

            stats = await merger.merge_extraction(
                sample_extraction, {"Jose": "Jose", "Macondo": "Macondo"}
            )

        assert stats["conflicts_detected"] == 1
        assert stats["relations_created"] == 0
        # Verify pending relation was created (not active relation)
        write_calls = mock_neo4j.execute_write.call_args_list
        pending_calls = [c for c in write_calls if "pending_review" in str(c)]
        assert len(pending_calls) >= 1
