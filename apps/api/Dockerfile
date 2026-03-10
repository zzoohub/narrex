# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM rust:1.92-bookworm AS builder

WORKDIR /build

# 1) Copy manifests + lock first for layer caching
COPY Cargo.toml Cargo.lock ./
COPY crates/llm/Cargo.toml crates/llm/Cargo.toml

# 2) Create dummy sources so cargo can resolve the dependency graph
RUN mkdir src && echo "fn main(){}" > src/main.rs \
    && mkdir -p crates/llm/src && echo "" > crates/llm/src/lib.rs

# 3) Build dependencies only (cached unless Cargo.toml/lock change)
RUN cargo build --release && rm -rf src crates/llm/src

# 4) Copy real source code
COPY src/ src/
COPY crates/ crates/

# 5) Force rebuild of application code (not deps)
RUN touch src/main.rs crates/llm/src/lib.rs \
    && cargo build --release

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash app
USER app

COPY --from=builder /build/target/release/narrex-api /usr/local/bin/narrex-api

EXPOSE 8080

ENTRYPOINT ["narrex-api"]
