set dotenv-load := false

# ─── Path resolution ─────────────────────────────────────────────────────────
svc_dir     := "services"
api_dir     := "services/api"
worker_dir  := "services/worker"
web_dir     := "web"

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

# ─── API (Rust / Axum) ───────────────────────────────────────────────────────

api-dev:
    cd {{ svc_dir }} && cargo watch -x 'run --bin narrex-api'

api-build:
    cd {{ svc_dir }} && cargo build --release --bin narrex-api

api-check:
    cd {{ svc_dir }} && cargo check

api-test *args:
    cd {{ svc_dir }} && cargo test {{ args }}

api-lint:
    cd {{ svc_dir }} && cargo clippy -- -D warnings

api-clean:
    cd {{ svc_dir }} && cargo clean

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

# ─── Web (TanStack Start / SolidJS) ──────────────────────────────────────────

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
