#!/usr/bin/env bash
# Rebuilds module/ in the pinned image (monoai/Dockerfile.build). Use this, not
# monoai/build.sh, on a workstation: the image fixes the host, so every machine
# produces the committed bytes.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf module
docker buildx build --platform linux/amd64 --file monoai/Dockerfile.build --output module .
