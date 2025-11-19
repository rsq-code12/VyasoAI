import hashlib
import struct
import random
from typing import List

class MockEmbeddingAdapter:
    def __init__(self, dim: int = 128):
        self.dim = dim

    def embed(self, text: str) -> List[float]:
        h = hashlib.sha256(text.encode("utf-8")).digest()
        seed = struct.unpack("<Q", h[:8])[0]
        rng = random.Random(seed)
        return [rng.uniform(-1.0, 1.0) for _ in range(self.dim)]