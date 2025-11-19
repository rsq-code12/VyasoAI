# Vyaso AI Daemon

Local-first agent daemon skeleton.

## Build & Run

- `cargo run`
  - macOS/Linux: listens on a Unix Domain Socket
    - macOS: `~/Library/Application Support/VyasoAI/vyasoai.sock`
    - Linux: `$XDG_RUNTIME_DIR/vyasoai.sock` (fallback `/tmp/vyasoai.sock`)
  - Windows: listens on `127.0.0.1:8765`

- `cargo test`
  - Runs the health endpoint test using a loopback TCP port.

## API

- `GET /v1/health` -> `{ "status": "ok" }`
- `POST /v1/events` -> `202 Accepted`
  - Accepts Event Envelope (metadata only), validates, and enqueues.

See `infra/api/openapi.yaml` for the OpenAPI v3 spec.