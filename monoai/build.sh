#!/usr/bin/env bash
# Builds module/ from source. Runs inside monoai/Dockerfile.build; use
# monoai/rebuild.sh to run it. The image pins the host, Rust and wasm-bindgen, so
# the output is byte-identical everywhere; monoai/gates.sh requires the committed
# module/ to match.
set -euo pipefail
cd "$(dirname "$0")/.."
export SOURCE_DATE_EPOCH=0
export CARGO_INCREMENTAL=0
export CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1
export RUSTFLAGS="--remap-path-prefix=$PWD=/src --remap-path-prefix=${CARGO_HOME:-$HOME/.cargo}=/cargo"
cargo build --locked --release --target wasm32-unknown-unknown --lib
rm -rf module
wasm-bindgen --target bundler --out-dir module --out-name biscuit \
  target/wasm32-unknown-unknown/release/biscuit_wasm.wasm
cat snippets/*.js >> module/biscuit.js
cat snippets/definitions/*.d.ts >> module/biscuit.d.ts
