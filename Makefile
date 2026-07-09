# oahs — dev & ops entrypoints. Scoped to the @oahs/* workspace so BMAD's root
# npm scripts are never triggered. See apps/oahs/Dockerfile + docker-compose.yaml.
# TypeScript is gated by `typecheck` (tsc); eslint config covers the repo's JS.

OAHS_PORT ?= 4521
DATA_DIR  ?= .oahs/data
OAHS      := --filter "@oahs/*"
COMPOSE   := docker compose

.DEFAULT_GOAL := help

.PHONY: help install build build-ui serve dev test typecheck lint check clean \
        docker-build up down restart logs ps sh pg-up bootstrap

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2}'

install: ## Install workspace dependencies (pnpm)
	pnpm install

build: ## Build the CLI bundle (bin + PGlite worker + public UI)
	pnpm -C apps/oahs build

build-ui: ## Rebuild only the web UI bundle
	pnpm -C apps/spine-api build:ui

serve: build ## Build then run the spine locally (durable PGlite under DATA_DIR)
	OAHS_ADMIN_TOKEN=$${OAHS_ADMIN_TOKEN:-change-me} \
	  node apps/oahs/bin/oahs.mjs serve --data $(DATA_DIR) --port $(OAHS_PORT)

dev: serve ## Alias for `serve`

test: ## Run all @oahs/* package tests (vitest)
	pnpm -r $(OAHS) run test

typecheck: ## Typecheck all @oahs/* packages (the TypeScript gate)
	pnpm -r $(OAHS) run typecheck

lint: ## Lint the repo (eslint flat config — JS/mjs/yaml)
	pnpm exec eslint .

check: typecheck test ## Typecheck + test everything

clean: ## Remove build artifacts + local data
	rm -rf apps/oahs/bin apps/oahs/dist apps/oahs/public apps/spine-api/public \
	  packages/*/dist .oahs coverage
	find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete

docker-build: ## Build the oahs docker image
	$(COMPOSE) build oahs

up: ## Build + start the container in the background
	$(COMPOSE) up -d --build oahs
	@echo "oahs → http://localhost:$(OAHS_PORT)/ui"

down: ## Stop and remove the container
	$(COMPOSE) down

restart: ## Restart the container (data persists on the volume)
	$(COMPOSE) restart oahs

logs: ## Follow the container logs
	$(COMPOSE) logs -f oahs

ps: ## Show compose service status
	$(COMPOSE) ps

sh: ## Shell into the running container
	$(COMPOSE) exec oahs /bin/sh

pg-up: ## Start the optional postgres service (future DATABASE_URL path)
	$(COMPOSE) --profile postgres up -d postgres

bootstrap: ## Seed an admin demo into a running server (feature + items + personas)
	./tools/oahs-bootstrap.sh
