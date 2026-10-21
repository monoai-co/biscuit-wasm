// Runs under Node and Bun without flags: instantiates the committed module/ the
// way @monoai/biscuit's loader does.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = new URL("../../module/", import.meta.url);
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

const generous = { max_facts: 100000, max_iterations: 10000, max_time_micro: 50000 };

// A recursive rule over a membership chain: about 20 iterations and well over 1 ms.
function chain(depth) {
  let code = 'relation("u", "member", "t0");';
  for (let i = 0; i < depth; i++) code += `relation("t${i}", "member", "t${i + 1}");`;
  return `${code}
in_team($u, $t) <- relation($u, "member", $t);
in_team($u, $p) <- in_team($u, $t), relation($t, "member", $p);
allow if in_team("u", "t${depth}");`;
}

// 800 loaded facts, one derived fact each: over the 1000-fact default once derived.
function manyFacts(count) {
  let code = "";
  for (let i = 0; i < count; i++) code += `relation("u${i}", "member", "team");`;
  return `${code}
member_of($u) <- relation($u, "member", "team");
allow if member_of("u${count - 1}");`;
}

function authorize(code, builderLimits) {
  const builder = new bindings.AuthorizerBuilder();
  if (builderLimits !== undefined) builder.setLimits(builderLimits);
  builder.addCode(code);
  const authorizer = builder.buildUnauthenticated();
  try {
    authorizer.authorizeWithLimits(builderLimits ?? generous);
    return "allow";
  } catch (error) {
    return error?.RunLimit ?? JSON.stringify(error);
  } finally {
    authorizer.free();
  }
}

const cases = [
  ["chain without builder limits keeps the 1 ms default", chain(20), undefined, "Timeout"],
  ["chain with builder limits completes", chain(20), generous, "allow"],
  ["facts without builder limits keep the 1000-fact default", manyFacts(800), undefined, "TooManyFacts"],
  ["facts with builder max_facts 100000 complete", manyFacts(800), generous, "allow"],
  ["builder max_facts is enforced", manyFacts(800), { ...generous, max_facts: 500 }, "TooManyFacts"],
  ["builder max_iterations is enforced", chain(20), { ...generous, max_iterations: 5 }, "TooManyIterations"],
  ["builder max_time_micro is enforced", chain(20), { ...generous, max_time_micro: 1 }, "Timeout"],
];

for (const [name, code, limits, expected] of cases) {
  assert.equal(authorize(code, limits), expected, name);
  console.log(`ok - ${name}`);
}
console.log(`${cases.length} passed`);
