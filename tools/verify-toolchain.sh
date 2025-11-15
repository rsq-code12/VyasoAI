#!/usr/bin/env bash
set -euo pipefail

echo "Verifying toolchain versions..."

FAILURES=()

# Node
if [[ -f .node-version ]]; then
  NODE_EXPECTED=$(cat .node-version)
  NODE_ACTUAL=$(node -v | sed 's/v//')
  echo "Node expected: $NODE_EXPECTED, actual: $NODE_ACTUAL"
  if [[ "$NODE_ACTUAL" != "$NODE_EXPECTED"* ]]; then
    FAILURES+=("node:$NODE_EXPECTED!=$NODE_ACTUAL")
  fi
fi

# Python
if [[ -f .python-version ]]; then
  PY_EXPECTED=$(cat .python-version)
  PY_ACTUAL=$(python3 --version | awk '{print $2}')
  echo "Python expected: $PY_EXPECTED, actual: $PY_ACTUAL"
  if [[ "$PY_ACTUAL" != "$PY_EXPECTED"* ]]; then
    FAILURES+=("python:$PY_EXPECTED!=$PY_ACTUAL")
  fi
fi

# Go
if [[ -f agent-scripts/go.mod ]]; then
  GO_EXPECTED=$(grep '^go ' agent-scripts/go.mod | awk '{print $2}')
  GO_ACTUAL=$(go version | awk '{print $3}' | sed 's/go//')
  echo "Go expected: $GO_EXPECTED, actual: $GO_ACTUAL"
  if [[ "$GO_ACTUAL" != "$GO_EXPECTED"* ]]; then
    FAILURES+=("go:$GO_EXPECTED!=$GO_ACTUAL")
  fi
fi

# Rust (rust-toolchain.toml presence check)
if [[ -f rust-toolchain.toml ]]; then
  echo "Rust toolchain file detected: rust-toolchain.toml"
  rustc --version || FAILURES+=("rust:rustc-not-found")
fi

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo "Toolchain verification failed:" >&2
  for f in "${FAILURES[@]}"; do
    echo " - $f" >&2
  done
  exit 1
else
  echo "Toolchain verification complete"
fi