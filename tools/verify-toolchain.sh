#!/usr/bin/env bash
set -euo pipefail

echo "Verifying toolchain versions..."

# Node
if [[ -f .node-version ]]; then
  NODE_EXPECTED=$(cat .node-version)
  NODE_ACTUAL=$(node -v | sed 's/v//')
  echo "Node expected: $NODE_EXPECTED, actual: $NODE_ACTUAL"
fi

# Python
if [[ -f .python-version ]]; then
  PY_EXPECTED=$(cat .python-version)
  PY_ACTUAL=$(python3 --version | awk '{print $2}')
  echo "Python expected: $PY_EXPECTED, actual: $PY_ACTUAL"
fi

# Go
if [[ -f agent-scripts/go.mod ]]; then
  GO_EXPECTED=$(grep '^go ' agent-scripts/go.mod | awk '{print $2}')
  GO_ACTUAL=$(go version | awk '{print $3}' | sed 's/go//')
  echo "Go expected: $GO_EXPECTED, actual: $GO_ACTUAL"
fi

# Rust (rust-toolchain.toml presence check)
if [[ -f rust-toolchain.toml ]]; then
  echo "Rust toolchain file detected: rust-toolchain.toml"
  rustc --version
fi

echo "Toolchain verification complete"