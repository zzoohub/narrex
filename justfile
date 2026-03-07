set dotenv-load := false

# ─── Dynamic path resolution ─────────────────────────────────────────────────
# Supports both monorepo (services/api, clients/web) and flat (api, web) layouts

services_dir := if path_exists("services") == "true" { "services" } else { "." }
worker_dir := if path_exists("services/worker") == "true" { "services/worker" } else { "worker" }
web_dir := if path_exists("clients/web") == "true" { "clients/web" } else { "web" }

default:
    @just --list

# ─── Git ──────────────────────────────────────────────────────────────────────

log:
    git log --graph --oneline --all --decorate --color -20

push branch="main" msg="update":
    git add . && git commit -m "{{ msg }}" && git push origin {{ branch }}

# ─── DB ───────────────────────────────────────────────────────────────────────

db-migrate:
    cd {{ services_dir }} && cargo sqlx migrate run --source ../db/migrations

db-seed:
    cd db && echo "TODO: run seeds"

db-reset: db-migrate db-seed

# ─── API (Rust / Axum) ───────────────────────────────────────────────────────

api-check:
    cd {{ services_dir }} && cargo check

api-dev:
    cd {{ services_dir }} && cargo watch -x 'run -p narrex-api'

api-start:
    cd {{ services_dir }} && cargo run -p narrex-api

api-test *args:
    cd {{ services_dir }} && cargo nextest run {{ args }}

api-lint:
    cd {{ services_dir }} && cargo clippy --all-targets -- -D warnings

api-fmt:
    cd {{ services_dir }} && cargo fmt --all

api-clean:
    cd {{ services_dir }} && cargo clean

# ─── Worker ───────────────────────────────────────────────────────────────────
# NOTE: Adjust commands for your framework (Celery, BullMQ, Temporal, etc.)

worker-dev:
    cd {{ worker_dir }} && echo "TODO: start all workers"

worker-jobs:
    cd {{ worker_dir }} && echo "TODO: start job queue consumer"

worker-cron:
    cd {{ worker_dir }} && echo "TODO: start cron scheduler"

worker-sub:
    cd {{ worker_dir }} && echo "TODO: start pub/sub subscribers"

worker-test *args:
    cd {{ worker_dir }} && echo "TODO: run worker tests" {{ args }}

worker-lint:
    cd {{ worker_dir }} && echo "TODO: lint worker"

worker-clean:
    cd {{ worker_dir }} && echo "TODO: clean worker artifacts"

# ─── Web ───────────────────────────────────────────────────────────────────

web-install:
    cd {{ web_dir }} && bun install

web-dev:
    cd {{ web_dir }} && bun run dev

web-build:
    cd {{ web_dir }} && bun run build

web-start:
    cd {{ web_dir }} && bun run start

web-lint:
    cd {{ web_dir }} && bun run lint

web-typecheck:
    cd {{ web_dir }} && bun tsc --noEmit

web-test *args:
    cd {{ web_dir }} && bun vitest run {{ args }}

web-test-watch *args:
    cd {{ web_dir }} && bun vitest {{ args }}

web-test-cov:
    cd {{ web_dir }} && bun vitest run --coverage

web-clean:
    rm -rf {{ web_dir }}/.output {{ web_dir }}/coverage

# ─── E2E (Playwright) ────────────────────────────────────────────────────────
# Runs from project root against e2e/ directory.
# Expects playwright.config.ts at root.

e2e-install:
    cd e2e && bun install && bun playwright install --with-deps chromium

e2e *args:
    cd e2e && bun playwright test --project=chromium {{ args }}

e2e-smoke:
    cd e2e && bun playwright test --project=chromium --grep @smoke

e2e-ui:
    cd e2e && bun playwright test --ui

e2e-report:
    cd e2e && bun playwright show-report

# ─── Quality ──────────────────────────────────────────────────────────────────

lint: api-lint web-lint

test: api-test web-test

check: lint test

# ─── Build ────────────────────────────────────────────────────────────────────

build service:
    #!/usr/bin/env sh
    if [ -d "services/{{ service }}" ]; then
        docker build -t {{ service }} -f services/{{ service }}/Dockerfile .
    else
        docker build -t {{ service }} -f {{ service }}/Dockerfile .
    fi
