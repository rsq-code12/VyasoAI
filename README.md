# Vyaso AI Monorepo

Vyaso AI is a Pieces Replica: an on-device long-term memory agent that captures context across apps (browser, IDE, chats, docs), indexes it locally, and surfaces it via search, timeline views, and an LLM Copilot with strong privacy controls.

## Project Vision
- On-device capture across OS, browser, and IDE; cloud optional via user keys.
- Local storage + vector index with time-aware retrieval and provenance.
- Plugins and connectors to enrich capture and provide in-app overlays.
- Strong privacy: encryption-at-rest, per-app toggles, delete ranges, air-gapped mode.

## Repo Layout
- `agent-scripts/` — helper scripts and Go tools for capture.
- `daemon/` — Rust service that ingests events, stores timeline, and serves local APIs.
- `connectors/browser-extension/` — WebExtensions background/service worker.
- `connectors/vscode/` — VS Code extension for capture and Copilot hooks.
- `intelligence/` — Python space for embeddings/RAG and experiments.
- `app/` — desktop UI scaffold (timeline, search, chat) — TBD (Tauri/Electron).
- `infra/` — deployment bits (Docker, env, future packaging).
- `.github/workflows/ci.yml` — CI for unit tests, lint, and build.
 - `infra/CURRENT_INFRASTRUCTURE.md` — text description of the current infrastructure.

## Getting Started
- macOS dev prerequisites: run `scripts/install-dev-tools-macos.sh`.
- Common scripts: `make dev`, `make test`, `make lint`, `make build`.
- CI: pushes and PRs to `main` run tests/lint/build across languages.

## Agent Chats (placeholders)
- Chat 1: `docs/chats/agent1.md`
- Chat 2: `docs/chats/agent2.md`
- Chat 3: `docs/chats/agent3.md`
- Chat 4: `docs/chats/agent4.md`
- Chat 5: `docs/chats/agent5.md`

## Notes
- This is a skeleton for rapid iteration; components are minimal but wired for CI.
- See `PROJECT_BIBLE.md` for stack choices, APIs, security rules, and governance.