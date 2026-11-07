// Runs under Node and Bun without flags: instantiates a module directory the way
// @monoai/biscuit's loader does (the committed module/ unless a directory is given as the
// first argument) and checks that WebAssembly linear memory stops growing once warmed up.
// Linear memory never shrinks, so growth across the measured builds is the memory the
// builds retained. With wee_alloc as the global allocator, 200-fact authorizers kept about
// 155 KB each.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const directory = process.argv[2];
const base =
  directory === undefined
    ? new URL("../../module/", import.meta.url)
    : pathToFileURL(`${resolve(directory)}/`);
const bindings = await import(new URL("biscuit_bg.js", base).href);
const compiled = await WebAssembly.compile(await readFile(new URL("biscuit_bg.wasm", base)));
const imports = {};
for (const { module: name } of WebAssembly.Module.imports(compiled)) {
  imports[name] ??=
    name === "./biscuit_bg.js" ? bindings : await import(new URL(name, base).href);
}
const instance = await WebAssembly.instantiate(compiled, imports);
bindings.__wbg_set_wasm(instance.exports);
instance.exports.__wbindgen_start();
const memory = instance.exports.memory;

const factsPerAuthorizer = 200;
const warmUpBuilds = 300;
const measuredBuilds = 900;
const maxGrowthBytes = 8 * 1024 * 1024;

// One policy and parameterised facts, the shape of a request-time authorizer.
function buildAndAuthorize() {
  const builder = new bindings.AuthorizerBuilder();
  builder.addCodeWithParameters("allow if true;", {}, {});
  for (let fact = 0; fact < factsPerAuthorizer; fact++)
    builder.addCodeWithParameters("operation({id});", { id: `op-${fact}` }, {});
  const authorizer = builder.buildUnauthenticated();
  try {
    return authorizer.authorize();
  } finally {
    authorizer.free();
  }
}

function run(builds) {
  for (let build = 0; build < builds; build++)
    assert.equal(buildAndAuthorize(), 0, "the allow policy matches");
}

run(warmUpBuilds);
const warm = memory.buffer.byteLength;
run(measuredBuilds);
const grown = memory.buffer.byteLength - warm;

const mebibytes = (bytes) => (bytes / 1024 / 1024).toFixed(1);
assert.ok(
  grown < maxGrowthBytes,
  `linear memory grew ${mebibytes(grown)} MiB over ${measuredBuilds} builds after warm-up (limit ${mebibytes(maxGrowthBytes)} MiB)`,
);
console.log(
  `ok - linear memory grew ${mebibytes(grown)} MiB over ${measuredBuilds} builds after warm-up (${mebibytes(warm)} MiB warm)`,
);
