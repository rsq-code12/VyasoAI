from intelligence.chunking import chunk_text
from intelligence.embeddings.mock import MockEmbeddingAdapter
from intelligence.index.vector_index import VectorIndex
from intelligence.index.idmap import IdMap

def run_example():
    content = "# Title\n\nThis is a sample document. It has multiple sentences. It is used for testing.\n\n```python\ndef hello():\n    return 'world'\n```\n"
    chunks = []
    chunks.extend(chunk_text(content, "markdown", event_id="event-1"))
    adapter = MockEmbeddingAdapter()
    index = VectorIndex(dim=128)
    idmap = IdMap()
    ids = [idmap.get_int(c.chunk_id) for c in chunks]
    vecs = [adapter.embed(c.text) for c in chunks]
    index.add(ids, vecs)
    q = "sample document"
    qv = adapter.embed(q)
    rid, sims = index.search(qv, top_k=5)
    out = [(rid[i], sims[i], chunks[i].chunk_id) for i in range(min(len(rid), len(chunks)))]
    return out