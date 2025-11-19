import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

from intelligence.chunking.chunker import chunk_text
from intelligence.embeddings.mock import MockEmbeddingAdapter
try:
    from intelligence.embeddings.llama_cpp import LlamaCppEmbeddingAdapter
except Exception:
    LlamaCppEmbeddingAdapter = None  # type: ignore
from intelligence.index.vector_index import VectorIndex
from intelligence.index.metadata import read_meta
from intelligence.index.idmap import IdMap

try:
    import zstandard as zstd
except Exception:
    zstd = None  # type: ignore

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    import hashlib
except Exception:
    AESGCM = None  # type: ignore


def _repo_root() -> Path:
    p = Path(__file__).resolve()
    return p.parents[2]


def _ensure_dirs():
    root = _repo_root()
    for rel in ["data/intel/in", "data/intel/out", "data/intel/logs", "data/intel/index"]:
        (root / rel).mkdir(parents=True, exist_ok=True)


def _load_blob(path: Path) -> bytes:
    data = path.read_bytes()
    if AESGCM is None:
        return data
    passphrase = os.getenv("VYASOAI_DEV_PASSPHRASE")
    if not passphrase:
        return data
    dig = hashlib.sha256(passphrase.encode("utf-8")).digest()
    key = dig[:32]
    aes = AESGCM(key)
    try:
        pt = aes.decrypt(data[:12], data[12:], None)
    except Exception:
        return data
    if zstd is None:
        return pt
    try:
        dctx = zstd.ZstdDecompressor()
        return dctx.decompress(pt)
    except Exception:
        return pt


def _detect_content_type(envelope: Dict[str, Any]) -> str:
    ct = envelope.get("content_type")
    if isinstance(ct, str) and ct:
        return ct
    src = str(envelope.get("source", ""))
    if src.endswith(".md"):
        return "markdown"
    if src.endswith(".html") or src.endswith(".htm"):
        return "html"
    return "prose"


def _select_adapter(name: str) -> Tuple[Any, int, str]:
    if name == "llama" and LlamaCppEmbeddingAdapter is not None:
        # Placeholder: expects external embedding_fn to be wired
        adapter = LlamaCppEmbeddingAdapter(model_path="", embedding_fn=None)
        return adapter, 768, "llama-cpp-emb-768"
    adapter = MockEmbeddingAdapter(dim=128)
    return adapter, 128, "mock-emb-128"


def process_job(job: Dict[str, Any], backend: str, log_path: Path) -> Dict[str, Any]:
    start = time.time()
    event_id = job.get("event_id")
    blob_path = job.get("blob_path")
    content_type = _detect_content_type(job)
    timings = {"load": 0, "chunk": 0, "embed": 0, "index": 0}

    try:
        bp = Path(blob_path)
        if not bp.is_absolute():
            bp = _repo_root() / blob_path
        t0 = time.time()
        content = _load_blob(bp)
        timings["load"] = int((time.time() - t0) * 1000)
        text = content.decode("utf-8", errors="replace")
    except Exception as e:
        log_path.write_text(f"load_error: {e}\n")
        return {"status": "error", "errors": [{"code": "LOAD_FAIL", "message": str(e)}]}

    t1 = time.time()
    chunks = chunk_text(text, content_type, event_id=event_id)
    timings["chunk"] = int((time.time() - t1) * 1000)

    adapter, dim, model_ver = _select_adapter(backend)
    index = VectorIndex(dim=dim)
    idmap = IdMap()
    ids = [idmap.get_int(c.chunk_id) for c in chunks]

    t2 = time.time()
    vectors = [adapter.embed(c.text) for c in chunks]
    timings["embed"] = int((time.time() - t2) * 1000)

    t3 = time.time()
    index.add(ids, vectors)
    index_dir = _repo_root() / "data/intel/index"
    index.save(str(index_dir), encrypt=True, model_version=model_ver)
    timings["index"] = int((time.time() - t3) * 1000)

    chunk_items = [
        {
            "id": c.chunk_id,
            "start": c.start_offset,
            "end": c.end_offset,
            "type": c.content_type,
        }
        for c in chunks
    ]
    prov_map = [{"chunk_id": c.chunk_id, "offset": c.start_offset} for c in chunks]
    out = {
        "status": "ok",
        "event_id": event_id,
        "chunk_ids": [c.chunk_id for c in chunks],
        "chunks": chunk_items,
        "provenance": {
            "source": job.get("source"),
            "mapping": prov_map,
        },
        "index": {"backend": "hnsw" if hasattr(index, "_use_hnsw") and index._use_hnsw else "store", "dimensions": dim, "added": len(chunks)},
        "timings_ms": timings,
        "errors": [],
    }
    return out


def main():
    parser = argparse.ArgumentParser(prog="vyaso_intel")
    sub = parser.add_subparsers(dest="cmd")
    p = sub.add_parser("process")
    p.add_argument("event_id")
    p.add_argument("--job", required=True)
    p.add_argument("--backend", choices=["mock", "llama"], default="mock")
    p.add_argument("--infile")
    p.add_argument("--outfile")
    k = sub.add_parser("key")
    ks = k.add_subparsers(dest="key_cmd")
    kr = ks.add_parser("rotate")
    kr.add_argument("--index_dir", default=str(_repo_root() / "data/intel/index"))
    kr.add_argument("--force-env", action="store_true")
    args = parser.parse_args()

    if args.cmd == "key" and args.key_cmd == "rotate":
        _ensure_dirs()
        index_dir = Path(args.index_dir)
        try:
            idx = VectorIndex.load(str(index_dir), decrypt=True)
        except Exception:
            idx = None
        try:
            from intelligence.keyring.interface import set_index_key
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
            new_key = AESGCM.generate_key(bit_length=256)
            ok = set_index_key(new_key.hex())
            if not ok:
                if not args.force_env:
                    print(json.dumps({"status": "error", "errors": [{"code": "NO_KEYRING", "message": "keyring not available"}]}))
                    sys.exit(2)
                index_path = index_dir / "index.hnsw"
                raw = index_path.read_bytes()
                from intelligence.index.encryption import encrypt_bytes
                enc = encrypt_bytes(new_key, raw)
                index_path.write_bytes(enc)
                (index_dir / "index.enc_key").write_text(new_key.hex(), encoding="utf-8")
            else:
                if idx is None:
                    idx = VectorIndex(dim=128)
                idx.save(str(index_dir), encrypt=True, model_version="rotated")
            meta_path = index_dir / "index.meta.json"
            m = read_meta(str(meta_path))
            enc = m.get("encryption", {})
            v = int(enc.get("key_version", 0)) + 1
            enc["key_version"] = v
            enc["rotated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            with open(meta_path, "w", encoding="utf-8") as f:
                m["encryption"] = enc
                json.dump(m, f)
            print(json.dumps({"status": "ok", "key_version": v}))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"status": "error", "errors": [{"code": "ROTATE_FAIL", "message": str(e)}]}))
            sys.exit(4)

    if args.cmd != "process":
        parser.print_help()
        sys.exit(2)

    _ensure_dirs()
    root = _repo_root()
    job_path = Path(args.infile) if args.infile else (root / f"data/intel/in/{args.job}.json")
    out_path = Path(args.outfile) if args.outfile else (root / f"data/intel/out/{args.job}.json")
    log_path = root / f"data/intel/logs/{args.job}.log"
    try:
        job = json.loads(job_path.read_text(encoding="utf-8"))
    except Exception as e:
        log_path.write_text(f"envelope_error: {e}\n")
        print(json.dumps({"status": "error", "errors": [{"code": "ENVELOPE_READ_FAIL", "message": str(e)}]}))
        sys.exit(2)

    try:
        result = process_job(job, args.backend, log_path)
        out_path.write_text(json.dumps({"job_id": args.job, **result}, ensure_ascii=False), encoding="utf-8")
        if result.get("status") == "ok":
            sys.exit(0)
        sys.exit(3)
    except Exception as e:
        log_path.write_text(f"process_error: {e}\n")
        print(json.dumps({"status": "error", "errors": [{"code": "PROCESS_FAIL", "message": str(e)}]}))
        sys.exit(4)