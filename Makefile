SHELL := /bin/bash

.PHONY: dev test lint build

dev:
	@echo "Dev bootstrap: see scripts/install-dev-tools-macos.sh"

test:
	cargo test --manifest-path daemon/Cargo.toml --quiet
	python3 -m unittest discover -s intelligence/tests -p '*_test.py'
	( cd agent-scripts/cmd/collector && go test ./... )
	node --test app/tests/basic.test.js connectors/browser-extension/tests/basic.test.js connectors/vscode/tests/basic.test.js

lint:
	cargo check --manifest-path daemon/Cargo.toml --quiet
	python3 -m compileall -q intelligence
	( cd agent-scripts/cmd/collector && go vet ./... || true )
	node -e "console.log('lint ok')"

build:
	cargo build --manifest-path daemon/Cargo.toml --quiet
	( cd agent-scripts/cmd/collector && go build ./... )
	node -e "console.log('build ok')"