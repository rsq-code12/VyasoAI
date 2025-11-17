# Vyaso AI VS Code Connector

## Features
- Command: `vyaso.sendSelection` — Send active selection to local daemon
- Buffering with exponential backoff + jitter and health gate
- File save hook with unified diff, preview, and content hash

## Setup
- `npm install`
- `npm run build`

## Unit Tests
- `npm run test` (runs TypeScript test scripts via ts-node)

## Integration Tests
- `npm run vscode:test` (launches VS Code tests using @vscode/test-electron with a mock daemon)

## Usage
-- Open a file, select text, run command "Send Selection to Memory"
-- Save a file to emit a diff-based event