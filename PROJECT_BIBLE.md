# PROJECT BIBLE — Vyaso AI

## Stack Choices
- Desktop runtime: target Tauri (Rust + webview) for small footprint; Electron acceptable early for prototyping.
- Daemon/agent: Rust (cross-platform, system APIs) with local IPC (`JSONRPC`/HTTP over `localhost`).
- Connectors:
  - Browser extension: WebExtensions MV3 (`service_worker`).
  - VS Code extension: Node/JS using VS Code Extension API.
- Storage/Index: SQLite for timeline + filesystem blobs; vector index via `hnswlib` or FAISS (quantized) for local search.
- Embeddings/LLMs: adapters for local (llama.cpp/Ollama) and cloud (OpenAI/Anthropic) via user opt-in.
- Frontend: React + Tailwind inside Tauri/Electron; later native packaging.

## API Endpoints (local daemon — draft)
- `POST /api/v1/events` — ingest raw capture events (window/URL/selection/snippets).
- `GET /api/v1/timeline?from=&to=&app=` — paginated timeline with filters.
- `POST /api/v1/memories` — add enriched memory fragments.
- `GET /api/v1/memories/search?query=&k=&app=` — time-aware vector search.
- `GET /api/v1/memories/:id/provenance` — show source links for a fragment.
- `DELETE /api/v1/memories/:id` — remove memory by id.
- `POST /api/v1/embeddings/batch` — generate embeddings for chunks.
- `POST /api/v1/privacy/purge` — delete by app/time range.

Transport: local HTTP on `127.0.0.1` or Unix socket JSONRPC. Air-gapped defaults.

## Security Rules
- Encryption at rest using per-device keychain; explicit cloud opt-in.
- Default opt-out for sensitive apps (password managers, banking).
- Redaction heuristics and per-app capture toggles.
- Provenance-first UX: “show me source” for any generated answer.
- Telemetry minimal and anonymized; enterprise controls later.

## Single-Project Rule
- One repo owns agents, connectors, app, and infra.
- Shared conventions and tooling; avoid fragmentation across repos.
- Changes must keep CI green (tests, lint, build).

## CI & Quality Gates
- On every push/PR to `main`:
  - `make test`: Rust (`cargo test`), Python (`unittest`), Go (`go test`), JS (`node --test`).
  - `make build`: Rust `cargo build`, Go `go build`, JS placeholder build.
  - `make lint`: syntax checks; enrich later with `eslint`, `ruff`, and `clippy`.

## Ownership & Structure
- `daemon/` owns local APIs, indexing, and privacy operations.
- `connectors/` own capture scope, overlay UIs, and transport.
- `intelligence/` owns embeddings, RAG policies, and experiments.
- `app/` owns user-facing timeline/search/chat.
- `infra/` owns packaging and deployment.