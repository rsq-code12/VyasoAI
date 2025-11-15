# Storage & Indexing Plan

- Timeline metadata in SQLite (WAL enabled), migrations managed in daemon.
- Content blobs on disk under `storage/blobs/` referenced by content hash.
- Vector index (hnswlib/FAISS) persisted under `storage/index/` with snapshots:
  - Save index every N updates to `storage/index/index-<timestamp>.hnsw`.
  - On startup, load latest snapshot; if incompatible, rebuild from persisted embeddings.
- Export format: `export.tar.gz` containing `metadata.sqlite`, `blobs/`, `index/`.