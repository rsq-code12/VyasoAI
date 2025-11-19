from intelligence.rag import build_rag_context
from intelligence.embeddings.mock import MockEmbeddingAdapter
from intelligence.index.vector_index import VectorIndex
from intelligence.chunking.chunk_types import Chunk

def test_rag_context_basic():
    adapter = MockEmbeddingAdapter(dim=8)
    index = VectorIndex(dim=8)
    chunks = [Chunk(chunk_id="c1", event_id="e1", text="hello world", start_offset=0, end_offset=11, content_type="text")]
    index.add([1], [adapter.embed("hello world")])
    def lookup(ids):
        return [chunks[0] if i == 1 else None for i in ids]
    res = build_rag_context("hello", top_k=1, adapter=adapter, index=index, chunk_lookup=lookup, max_tokens=10)
    assert "context" in res
    assert res["provenance"][0]["chunk_id"] == "c1"