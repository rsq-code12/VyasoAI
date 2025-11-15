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
  - Rust stable via `dtolnay/rust-toolchain@stable` (with `rustfmt`, `clippy`).
 - Jobs:
  - `verify-toolchain` — runs `tools/verify-toolchain.sh` to compare pinned versions against runner.
  - `test-rust`, `test-go`, `test-python`, `test-js` — per-language unit tests with caching.
  - `build-all` — builds Rust/Go and JS placeholder after tests succeed.
  - `lint-all` — runs `make ci-lint` (rustfmt/clippy, go fmt).
  - `integration-smoke` — daemon boot smoke and OpenAPI presence check.
 - Caching:
  - Cargo registry/git and `daemon/target`.
  - Go modules (`~/go/pkg/mod`).
  - Pip cache (`~/.cache/pip`).
  - npm cache (`~/.npm`).

## Development Environment
- Script: `scripts/install-dev-tools-macos.sh` installs Rust, Go, Node, PNPM, Yarn, Python 3.11, and Docker Desktop; ensures Xcode CLTs.
- Make targets:
  - `make dev` — bootstrap guidance.
  - `make test` — runs unit tests across languages.
  - `make lint` — quick static checks.
  - `make build` — compiles Rust/Go and placeholder JS build.
  - `make ci-lint` — formatting and static analysis (rustfmt, clippy, go fmt).
- Package management:
  - Node: npm workspaces (`app`, `connectors/browser-extension`, `connectors/vscode`).
  - Rust: Cargo workspace planned; currently single crate in `daemon`.
  - Go: module in `agent-scripts`.
  - Python: requirements placeholder in `intelligence/requirements.txt`.
 - Toolchain pinning:
   - `.node-version`, `.python-version`, `rust-toolchain.toml`.
   - Verification script: `tools/verify-toolchain.sh`.

## Networking & Services (Current)
- No running network services yet.
- Planned: local HTTP/JSONRPC served by `daemon` on `127.0.0.1`, with connectors posting events and app fetching timeline/search.
 - API contract: OpenAPI spec at `infra/api/openapi.yaml` is the authoritative source.
 - Port (draft): `127.0.0.1:8765` for local HTTP; Unix socket alternative planned.

## Storage & Index (Planned)
- Timeline metadata: SQLite.
- Content blobs: filesystem or SQLite BLOBs.
- Vector search: `hnswlib` or FAISS (quantized) embedded locally.
- Retention/compaction: periodic tasks within `daemon`.
 - See `docs/storage/indexing.md` for persistence, snapshots, and export format.

## Security (Current/Planned)
- Current: repo-level only; no secrets in CI.
- Planned: per-device encryption-at-rest, opt-out for sensitive apps, redaction heuristics, explicit purge controls.
 - See `docs/security/local-rpc-hardening.md` for local RPC hardening checklist.

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
- Recent updates: CI split into per-language jobs with caching; toolchain pinning and verification added; OpenAPI spec authored at `infra/api/openapi.yaml`; security and storage docs linked.