#!/usr/bin/env bash
set -e

echo "Installing dev prerequisites on macOS..."

# Homebrew
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew not found. Install from https://brew.sh and rerun."
  exit 1
fi

# Xcode CLI
if ! xcode-select -p >/dev/null 2>&1; then
  echo "Xcode Command Line Tools missing. Installing..."
  xcode-select --install || true
fi

# Rust
if ! command -v rustup >/dev/null 2>&1; then
  brew install rustup-init
  rustup-init -y
fi
rustup update

# Go
brew install go

# Node + package managers
brew install node
brew install pnpm
brew install yarn

# Python
brew install python@3.11 || true
python3 --version || true

# Docker Desktop
brew install --cask docker || true

echo "Done. Start Docker Desktop manually if needed."