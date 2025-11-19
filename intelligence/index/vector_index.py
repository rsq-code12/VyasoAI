import os
import json
from typing import List, Tuple
from .encryption import get_or_create_key, encrypt_bytes, decrypt_bytes
from .metadata import write_meta, read_meta
import hashlib

class VectorIndex:
    def __init__(self, dim: int, space: str = "cosine"):
        self.dim = dim
        self.space = space
        self._use_hnsw = False
        self._index = None
        try:
            import hnswlib
            self._hnswlib = hnswlib
            self._index = hnswlib.Index(space=space, dim=dim)
            self._index.init_index(max_elements=100000, ef_construction=200, M=16)
            self._index.set_ef(64)
            self._use_hnsw = True
        except Exception:
            self._store = {}

    def add(self, ids: List[int], vectors: List[List[float]]):
        if self._use_hnsw:
            self._index.add_items(vectors, ids)
        else:
            for i, v in zip(ids, vectors):
                self._store[i] = v

    def search(self, vector: List[float], top_k: int) -> Tuple[List[int], List[float]]:
        if self._use_hnsw:
            labels, distances = self._index.knn_query([vector], k=top_k)
            return list(labels[0]), list(distances[0])
        scores = []
        for i, v in self._store.items():
            s = sum(a*b for a, b in zip(vector, v))
            scores.append((i, s))
        scores.sort(key=lambda x: x[1], reverse=True)
        ids = [x[0] for x in scores[:top_k]]
        sims = [x[1] for x in scores[:top_k]]
        return ids, sims

    def remove(self, ids: List[int]):
        if self._use_hnsw:
            for i in ids:
                try:
                    self._index.mark_deleted(i)
                except Exception:
                    pass
        else:
            for i in ids:
                self._store.pop(i, None)

    def save(self, path: str, encrypt: bool = True, model_version: str = "mock-emb-128"):
        os.makedirs(path, exist_ok=True)
        index_path = os.path.join(path, "index.hnsw")
        meta_path = os.path.join(path, "index.meta.json")
        key_info_path = os.path.join(path, "index.enc_key")
        if self._use_hnsw:
            self._index.save_index(index_path)
            if encrypt:
                with open(index_path, "rb") as f:
                    raw = f.read()
                checksum = hashlib.sha256(raw).hexdigest()
                key, key_info = get_or_create_key()
                enc = encrypt_bytes(key, raw)
                with open(index_path, "wb") as f:
                    f.write(enc)
                with open(key_info_path, "w", encoding="utf-8") as f:
                    if key_info.startswith("env:") or key_info == "keyring":
                        f.write(key_info)
                    else:
                        f.write(key.hex())
            enc_info = {"key_source": key_info, "checksum_sha256": checksum}
            write_meta(meta_path, self.dim, self.count(), self.space, model_version, encryption=enc_info)
        else:
            with open(index_path, "w", encoding="utf-8") as f:
                json.dump(self._store, f)
            if encrypt:
                key, key_info = get_or_create_key()
                with open(index_path, "rb") as f:
                    raw = f.read()
                checksum = hashlib.sha256(raw).hexdigest()
                enc = encrypt_bytes(key, raw)
                with open(index_path, "wb") as f:
                    f.write(enc)
                with open(key_info_path, "w", encoding="utf-8") as f:
                    if key_info.startswith("env:") or key_info == "keyring":
                        f.write(key_info)
                    else:
                        f.write(key.hex())
            enc_info = {"key_source": key_info, "checksum_sha256": checksum}
            write_meta(meta_path, self.dim, self.count(), self.space, model_version, encryption=enc_info)

    @classmethod
    def load(cls, path: str, decrypt: bool = True):
        meta_path = os.path.join(path, "index.meta.json")
        index_path = os.path.join(path, "index.hnsw")
        m = read_meta(meta_path)
        dim = int(m["dimension"]) if "dimension" in m else 128
        space = m.get("space", "cosine")
        inst = cls(dim=dim, space=space)
        if decrypt:
            key_info_path = os.path.join(path, "index.enc_key")
            with open(key_info_path, "r", encoding="utf-8") as f:
                info = f.read().strip()
            if info.startswith("env:") or info == "keyring":
                from .encryption import get_or_create_key
                key, _ = get_or_create_key()
            else:
                key = bytes.fromhex(info)
            with open(index_path, "rb") as f:
                enc = f.read()
            raw = decrypt_bytes(key, enc)
            with open(index_path, "wb") as f:
                f.write(raw)
        if inst._use_hnsw:
            inst._index.load_index(index_path)
            inst._index.set_ef(64)
        else:
            with open(index_path, "r", encoding="utf-8") as f:
                inst._store = json.load(f)
        return inst

    def count(self) -> int:
        if self._use_hnsw:
            return self._index.get_current_count()
        return len(self._store)