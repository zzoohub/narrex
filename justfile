set dotenv-load := false

# ─── Path resolution ─────────────────────────────────────────────────────────

api_dir := "apps/api"
worker_dir := "apps/worker"
web_dir := "apps/web"
mobile_dir := "apps/mobile"

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

# ─── API (Rust / Axum) ──────────────────────────────────────────────────────

api-dev:
    cd {{ api_dir }} && cargo run

api-test *args:
    cd {{ api_dir }} && cargo nextest run {{ args }}

api-test-cov:
    cd {{ api_dir }} && cargo llvm-cov nextest --lcov

api-lint:
    cd {{ api_dir }} && cargo clippy -- -D warnings

api-fmt:
    cd {{ api_dir }} && cargo fmt --check

api-clean:
    cd {{ api_dir }} && cargo clean

# ─── Worker (Rust) ───────────────────────────────────────────────────────────

worker-dev:
    cd {{ worker_dir }} && cargo run

worker-jobs:
    cd {{ worker_dir }} && echo "TODO: start job queue consumer"

worker-cron:
    cd {{ worker_dir }} && echo "TODO: start cron scheduler"

worker-sub:
    cd {{ worker_dir }} && echo "TODO: start pub/sub subscribers"

worker-test *args:
    cd {{ worker_dir }} && cargo nextest run {{ args }}

worker-lint:
    cd {{ worker_dir }} && cargo clippy -- -D warnings

worker-clean:
    cd {{ worker_dir }} && cargo clean

# ─── Web ──────────────────────────────────────────────────────────────────────

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

# ─── Mobile (Expo React Native) ──────────────────────────────────────────────

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

# ─── Quality ─────────────────────────────────────────────────────────────────

lint: api-lint worker-lint web-lint mobile-lint

test: api-test worker-test web-test mobile-test

check: lint test

# ─── Build ───────────────────────────────────────────────────────────────────

build service:
    docker build -t {{ service }} -f apps/{{ service }}/Dockerfile .

# ─── Deploy ──────────────────────────────────────────────────────────────────

deploy-api:
    gcloud run deploy api --source {{ api_dir }}

deploy-worker:
    gcloud run deploy worker --source {{ worker_dir }}
