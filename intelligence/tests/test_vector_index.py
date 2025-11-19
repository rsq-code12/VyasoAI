import os
import tempfile
from intelligence.index.vector_index import VectorIndex

def test_add_search_roundtrip():
    idx = VectorIndex(dim=8)
    ids = [1, 2, 3]
    vecs = [[1.0]*8, [0.5]*8, [0.0]*8]
    idx.add(ids, vecs)
    q = [1.0]*8
    rids, sims = idx.search(q, top_k=2)
    assert len(rids) == 2

def test_save_load_roundtrip():
    d = tempfile.mkdtemp()
    idx = VectorIndex(dim=8)
    ids = [1]
    vecs = [[0.2]*8]
    idx.add(ids, vecs)
    idx.save(d, encrypt=True)
    loaded = VectorIndex.load(d, decrypt=True)
    q = [0.2]*8
    r, s = loaded.search(q, top_k=1)
    assert len(r) == 1