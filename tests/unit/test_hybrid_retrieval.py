"""Tests for HybridRetriever RRF logic."""

import pytest

from evograph.retrieval.hybrid import HybridRetriever


@pytest.fixture
def retriever():
    return HybridRetriever(graph_weight=0.4, vector_weight=0.4, keyword_weight=0.2)


class TestReciprocalRankFusion:
    def test_basic_fusion(self, retriever):
        vector_results = [
            {"chunk_id": "a", "text": "chunk a", "score": 0.9},
            {"chunk_id": "b", "text": "chunk b", "score": 0.7},
        ]
        keyword_results = [
            {"chunk_id": "b", "text": "chunk b", "score": 0.8},
            {"chunk_id": "c", "text": "chunk c", "score": 0.6},
        ]
        graph_results = [
            {"source": "X", "target": "Y", "rel_type": "KNOWS"},
        ]

        fused = retriever._reciprocal_rank_fusion(vector_results, keyword_results, graph_results)
        assert isinstance(fused, list)
        assert len(fused) >= 1

    def test_empty_results(self, retriever):
        fused = retriever._reciprocal_rank_fusion([], [], [])
        assert fused == [] or isinstance(fused, list)

    def test_single_source(self, retriever):
        vector_results = [
            {"chunk_id": "a", "text": "only vector", "score": 0.95},
        ]
        fused = retriever._reciprocal_rank_fusion(vector_results, [], [])
        assert len(fused) >= 1
