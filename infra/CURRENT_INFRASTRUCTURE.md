# Current Infrastructure — Vyaso AI

This document describes the current (skeleton) infrastructure of the Vyaso AI monorepo. It reflects what exists today and the immediate conventions for development, CI, build, and packaging.

## Scope
- Local-first development on macOS; Linux/Windows targeted later.
- No cloud runtime yet; CI runs on GitHub-hosted runners.
- Docker Compose is present as a placeholder; no services defined yet.

## Components (Codebase Inventory)
- `daemon/` — Rust crate for the local agent/daemon. Currently prints on start. Future: local HTTP/JSONRPC, timeline storage, vector index operations.
- `agent-scripts/` — Go tools (CLI) for capture/experiments. Currently a `collector` with unit test.
- `connectors/`
  - `browser-extension/` — MV3 scaffold, background service worker (`src/index.js`), basic tests.
  - `vscode/` — minimal extension activation and hello command, basic tests.
- `intelligence/` — Python space for embeddings/RAG experiments; basic unittest.
- `app/` — Desktop UI scaffold (Tauri/Electron TBD); JS placeholder with tests.
- `infra/` — Infrastructure docs and placeholders (`docker-compose.yml`).
- `.github/workflows/ci.yml` — CI pipeline for test, lint, build across languages.

## CI/CD (GitHub Actions)
- Triggers: `push` and `pull_request` on branch `main`.
- Runners: `ubuntu-latest`.
- Toolchains installed:
  - Node `20` via `actions/setup-node@v4`.
  - Python `3.11` via `actions/setup-python@v5`.
  - Go `1.22` via `actions/setup-go@v5`.
  - Rust stable via `dtolnay/rust-toolchain@stable`.
- Jobs executed:
  - `make test` — runs tests in Rust, Python, Go, JS.
  - `make build` — builds Rust and Go; JS build is a placeholder.
  - `make lint` — basic checks (`cargo check`, Python `compileall`, `go vet`, trivial JS check).

## Development Environment
- Script: `scripts/install-dev-tools-macos.sh` installs Rust, Go, Node, PNPM, Yarn, Python 3.11, and Docker Desktop; ensures Xcode CLTs.
- Make targets:
  - `make dev` — bootstrap guidance.
  - `make test` — runs unit tests across languages.
  - `make lint` — quick static checks.
  - `make build` — compiles Rust/Go and placeholder JS build.
- Package management:
  - Node: npm workspaces (`app`, `connectors/browser-extension`, `connectors/vscode`).
  - Rust: Cargo workspace planned; currently single crate in `daemon`.
  - Go: module in `agent-scripts`.
  - Python: requirements placeholder in `intelligence/requirements.txt`.

## Networking & Services (Current)
- No running network services yet.
- Planned: local HTTP/JSONRPC served by `daemon` on `127.0.0.1`, with connectors posting events and app fetching timeline/search.

## Storage & Index (Planned)
- Timeline metadata: SQLite.
- Content blobs: filesystem or SQLite BLOBs.
- Vector search: `hnswlib` or FAISS (quantized) embedded locally.
- Retention/compaction: periodic tasks within `daemon`.

## Security (Current/Planned)
- Current: repo-level only; no secrets in CI.
- Planned: per-device encryption-at-rest, opt-out for sensitive apps, redaction heuristics, explicit purge controls.

## Packaging & Deployment (Current)
- No installers yet.
- Planned: Tauri/Electron packaging, native installers for macOS/Windows/Linux; Docker images as needed for local LLM/index services.

## Observability
- Current: console logging only.
- Planned: local logs, basic metrics, and privacy-preserving telemetry with opt-in.

## Ports & Endpoints (Draft)
- Ports: None in use.
- Draft endpoints (once `daemon` exposes HTTP):
  - `POST /api/v1/events` — ingest capture events.
  - `GET /api/v1/timeline` — query timeline by time/app filters.
  - `GET /api/v1/memories/search` — time-aware vector search.
  - `POST /api/v1/privacy/purge` — delete by app/time range.

## Governance & Single-Project Rule
- Single monorepo governs agents, connectors, app, infra.
- Shared tooling and CI conventions; changes must keep CI green.

## Status
- This is a living document. Update as services, endpoints, and packaging evolve.