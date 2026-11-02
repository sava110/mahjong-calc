# 1. Rust → WASM (wasm/decomposer/pkg)
FROM rust:1-slim-bookworm AS wasm
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && rustup target add wasm32-unknown-unknown \
  && cargo install wasm-pack --locked
WORKDIR /src/wasm/decomposer
COPY wasm/decomposer ./
RUN wasm-pack build

# 2. Vite build + test (plugins/commit-hash.ts が git を使うので .git もコピーする)
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
COPY --from=wasm /src/wasm/decomposer/pkg wasm/decomposer/pkg
RUN git config --global --add safe.directory /src \
  && HUSKY=0 npm ci \
  && npm test \
  && npm run build

# 3. 配信
FROM nginx:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
