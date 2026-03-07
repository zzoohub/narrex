set dotenv-load := false

# ─── Dynamic path resolution ─────────────────────────────────────────────────
# Supports both monorepo (services/api, clients/web) and flat (api, web) layouts

api_dir := if path_exists("services/api") == "true" { "services/api" } else { "api" }
worker_dir := if path_exists("services/worker") == "true" { "services/worker" } else { "worker" }
web_dir := if path_exists("clients/web") == "true" { "clients/web" } else { "web" }
mobile_dir := if path_exists("clients/mobile") == "true" { "clients/mobile" } else { "mobile" }

default:
    @just --list

# ─── Git ──────────────────────────────────────────────────────────────────────

log:
    git log --graph --oneline --all --decorate --color -20

push branch="main" msg="update":
    git add . && git commit -m "{{ msg }}" && git push origin {{ branch }}

# ─── DB ───────────────────────────────────────────────────────────────────────

db-migrate:
    cd db && echo "TODO: run migrations"

db-seed:
    cd db && echo "TODO: run seeds"

db-reset: db-migrate db-seed

# ─── API ──────────────────────────────────────────────────────────────────────
# NOTE: Adjust for your backend (Axum: cargo run, FastAPI: uvicorn)

api-install:
    cd {{ api_dir }} && uv sync

api-dev:
    cd {{ api_dir }} && PYTHONPATH=src uv run uvicorn app.main:create_app --factory --reload --host 0.0.0.0 --port 8080

api-start:
    cd {{ api_dir }} && PYTHONPATH=src uv run python -m app.main

api-test *args:
    cd {{ api_dir }} && PYTHONPATH=src uv run pytest {{ args }}

api-test-cov:
    cd {{ api_dir }} && PYTHONPATH=src uv run pytest --cov=src --cov-report=term-missing

api-lint:
    cd {{ api_dir }} && uv run ruff check .

api-clean:
    rm -rf {{ api_dir }}/.venv {{ api_dir }}/__pycache__

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
    rm -rf {{ web_dir }}/.next {{ web_dir }}/coverage

# ─── Mobile (Expo React Native) ───────────────────────────────────────────

mobile-install:
    cd {{ mobile_dir }} && bun install

mobile-dev:
    cd {{ mobile_dir }} && bunx expo start --dev-client

mobile-ios:
    cd {{ mobile_dir }} && bunx expo run:ios

mobile-android:
    cd {{ mobile_dir }} && bunx expo run:android

mobile-lint:
    cd {{ mobile_dir }} && bun run lint

mobile-typecheck:
    cd {{ mobile_dir }} && bun tsc --noEmit

mobile-test *args:
    cd {{ mobile_dir }} && bun vitest run {{ args }}

mobile-clean:
    rm -rf {{ mobile_dir }}/.expo {{ mobile_dir }}/node_modules

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

lint: api-lint worker-lint web-lint mobile-lint

test: api-test worker-test web-test mobile-test

check: lint test

# ─── Build ────────────────────────────────────────────────────────────────────

build service:
    #!/usr/bin/env sh
    if [ -d "services/{{ service }}" ]; then
        docker build -t {{ service }} -f services/{{ service }}/Dockerfile .
    else
        docker build -t {{ service }} -f {{ service }}/Dockerfile .
    fi
