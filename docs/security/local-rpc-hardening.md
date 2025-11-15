# Local RPC Hardening Checklist

- Bind to loopback (`127.0.0.1`) or use Unix domain sockets.
- Require per-device tokens for privileged routes (purge/export).
- Origin checks for browser extension and webviews.
- Rate limit sensitive endpoints and confirm destructive actions.
- Log minimal metadata; avoid payload logging.