# monoai maintenance of biscuit-wasm

- **Upstream:** [eclipse-biscuit/biscuit-wasm](https://github.com/eclipse-biscuit/biscuit-wasm), `main`.
- **Branch:** `monoai`, consumed by `monoai-co/monoai` as a pinned submodule and a
  pinned package at the same commit.
- **Purpose:** `AuthorizerBuilder.setLimits`. In `biscuit-auth` 6, `authorizeWithLimits`
  and `queryWithLimits` evaluate rules under the authorizer's own limits (1000 facts,
  100 iterations, 1 ms by default); the limits passed in apply only to checks and
  policies. `setLimits` sets the authorizer's limits before it is built.

## Changes from upstream

- `src/authorizer.rs`: `AuthorizerBuilder.setLimits`.
- `src/builder.rs`: one redundant borrow removed for clippy 1.99.
- `Cargo.lock`: `wasm-bindgen` 0.2.129 and `js-sys`/`web-sys` 0.3.106. 0.2.104 emits its
  cast imports in hash-map order, so two builds of one input differ.
- `mise.toml`: host tools for checks and tests: Rust, Node and Bun.
- `module/`: committed build output, so the package installs without a Rust toolchain.
- `monoai/`: build image, gates, tests, workflow validation, hooks and schemas.
- `.github/workflows/monoai-gates.yml`: the only enabled workflow.

## Build and gates

```bash
bash monoai/rebuild.sh
mise exec -- bash monoai/gates.sh
```

`monoai/rebuild.sh` builds `module/` in `monoai/Dockerfile.build`: a digest-pinned
`linux/amd64` Rust image and a checksum-pinned `wasm-bindgen` CLI. Cargo's metadata
hashes include the host triple, so builds on different hosts lay out data differently;
the image fixes the host and the bytes. The gate rebuilds and fails if the committed
`module/` differs. `monoai/test/limits.mjs` runs under Node 22, Node 24 and Bun, the
runtimes of this package's consumers. Install the hook with
`git config core.hooksPath monoai/hooks`.

## Updating

1. Merge the upstream release into `monoai`; resolve conflicts in the files above.
2. Run `monoai/rebuild.sh`, commit `module/`, and run `monoai/gates.sh`.
3. Push; the gates must pass on `monoai`.
4. In `monoai-co/monoai`, advance the submodule gitlink and the package pin to the
   same commit, then run `@monoai/biscuit`'s tests and its consumers' checks.

No issues or pull requests are opened upstream.
