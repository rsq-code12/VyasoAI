from intelligence.embeddings.mock import MockEmbeddingAdapter
from intelligence.embeddings.adapter import EmbeddingAdapter

def test_mock_embedding_deterministic():
    a = MockEmbeddingAdapter(dim=16)
    v1 = a.embed("hello")
    v2 = a.embed("hello")
    assert v1 == v2
    assert len(v1) == 16

def test_adapter_interface():
    assert hasattr(EmbeddingAdapter, "embed")