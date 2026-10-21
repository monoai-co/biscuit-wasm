#!/bin/sh
# Validates the fork workflow and its runner-label config with the pinned actionlint image.
set -eu
cd "$(dirname "$0")/.."
docker run --rm --volume "$PWD:/repo:ro" --workdir /repo \
  rhysd/actionlint:1.7.7@sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9 \
  -config-file monoai/actionlint.yaml .github/workflows/monoai-gates.yml
