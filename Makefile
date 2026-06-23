# Pulso × DeFindex — developer entrypoints.
.DEFAULT_GOAL := help
SHELL := /usr/bin/env bash
QS := scripts/pulso-quickstart

.PHONY: help demo demo-negative demo-admission sdk-build sdk-test gate-test

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n",$$1,$$2}'

demo: ## Full proof-bound demo (readiness + positive[SEND=yes] + negative; ADMISSION_ZK=yes adds lane 4)
	@bash $(QS)/demo.sh

demo-negative: ## Only the fail-closed negative lane (no spend)
	@bash $(QS)/negative-rebalance.sh

demo-admission: ## ZK admission lane: regenerate + off-chain verify the membership proof
	@bash $(QS)/demo-admission-zk.sh

gate-test: ## Run the on-chain gate test suite (incl. ZK admission lane)
	@cargo test -p defindex-rebalance-gate

sdk-build: ## Build the TypeScript SDK
	@cd sdk && npm run build

sdk-test: ## Run the SDK test suite (vitest)
	@cd sdk && npm run test:run
