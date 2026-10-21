#!/usr/bin/env bash
# Full fork gate: run with the toolchain from mise.toml (mise exec -- bash monoai/gates.sh).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== rust checks"
cargo fmt --check
cargo clippy --locked -- -D warnings

echo "== reproducible build matches committed module/"
bash monoai/rebuild.sh
if ! git diff --exit-code --stat -- module; then
  echo "module/ differs from a fresh build; run monoai/rebuild.sh and commit the result" >&2
  exit 1
fi
if [ -n "$(git ls-files --others --exclude-standard -- module)" ]; then
  echo "module/ has uncommitted build output" >&2
  exit 1
fi

echo "== upstream JS tests"
(cd js-tests && npm ci --no-audit --no-fund && npm test)

echo "== evaluation limits on every consumer runtime"
mise exec node@22.23.1 -- node monoai/test/limits.mjs
mise exec node@24.22.0 -- node monoai/test/limits.mjs
mise exec bun@1.4.3 -- bun monoai/test/limits.mjs
