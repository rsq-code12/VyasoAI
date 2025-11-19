import json
import tempfile
from intelligence.evaluation.evaluate import precision_at_k

def test_precision_at_k():
    retrieved = ["1", "2", "3", "4", "5"]
    relevant = ["2", "5", "8"]
    p = precision_at_k(retrieved, relevant, k=5)
    assert abs(p - 0.4) < 1e-6