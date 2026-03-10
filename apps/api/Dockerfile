# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM rust:1.92-bookworm AS builder

ARG TARGETPLATFORM
RUN case "$TARGETPLATFORM" in \
      "linux/arm64") echo "aarch64-unknown-linux-gnu" > /tmp/rust-target ;; \
      *)             echo "x86_64-unknown-linux-gnu"  > /tmp/rust-target ;; \
    esac \
    && rustup target add $(cat /tmp/rust-target)

# Install cross-compilation toolchain for arm64
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ] && [ "$(uname -m)" != "aarch64" ]; then \
      apt-get update && apt-get install -y --no-install-recommends \
        gcc-aarch64-linux-gnu libc6-dev-arm64-cross \
      && rm -rf /var/lib/apt/lists/*; \
    fi

ENV CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc

WORKDIR /build

# 1) Copy manifests + lock first for layer caching
COPY Cargo.toml Cargo.lock ./
COPY crates/llm/Cargo.toml crates/llm/Cargo.toml

# 2) Create dummy sources so cargo can resolve the dependency graph
RUN mkdir src && echo "fn main(){}" > src/main.rs \
    && mkdir -p crates/llm/src && echo "" > crates/llm/src/lib.rs

# 3) Build dependencies only (cached unless Cargo.toml/lock change)
RUN cargo build --release --target $(cat /tmp/rust-target) \
    && rm -rf src crates/llm/src

# 4) Copy real source code
COPY src/ src/
COPY crates/ crates/

# 5) Force rebuild of application code (not deps)
RUN touch src/main.rs crates/llm/src/lib.rs \
    && cargo build --release --target $(cat /tmp/rust-target) \
    && cp target/$(cat /tmp/rust-target)/release/narrex-api /build/narrex-api

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash app
USER app

COPY --from=builder /build/narrex-api /usr/local/bin/narrex-api

EXPOSE 8080

ENTRYPOINT ["narrex-api"]
