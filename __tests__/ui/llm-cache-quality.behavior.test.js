const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { webcrypto } = require("node:crypto");
const source = readFileSync(resolve(__dirname, "../../lib/llm-cache.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, crypto: webcrypto, TextEncoder, setTimeout, clearTimeout, console: { info() {}, warn() {} } });
const { withLLMCache } = exportsObject;

for (const [name, cached] of [
  ["short legacy entry", { text: "짧은 응답", provider: "gemini" }],
  ["truncated legacy entry", { text: "아직 완성되지 않은 본문".repeat(20), provider: "gemini", truncated: true }],
  ["whitespace entry", { text: " ".repeat(300), provider: "gemini" }],
]) {
  test(`${name} is bypassed and replaced after generation`, async () => {
    const complete = { text: "완성된 상담문".repeat(40), provider: "gemini" };
    let generated = 0;
    let saved;
    const result = await withLLMCache({ prompt: name }, async () => { generated += 1; return complete; }, {
      deterministic: true, minChars: 100,
      store: { get: async () => cached, set: async (_key, value) => { saved = value; } },
    });
    assert.equal(generated, 1);
    assert.equal(result, complete);
    assert.equal(saved, complete);
  });
}

test("a valid cached result avoids another provider call", async () => {
  const cached = { text: "검증된 본문".repeat(30), provider: "gemini" };
  const result = await withLLMCache({ prompt: "valid" }, async () => { throw new Error("must not generate"); }, {
    deterministic: true, minChars: 100, store: { get: async () => cached, set: async () => { throw new Error("must not store"); } },
  });
  assert.equal(result, cached);
});

test("a failed generation never poisons the next retry cache", async () => {
  let saves = 0;
  const result = await withLLMCache({ prompt: "retry" }, async () => ({ text: "미완성", truncated: true }), {
    deterministic: true, minChars: 100, store: { get: async () => null, set: async () => { saves += 1; } },
  });
  assert.equal(result.truncated, true);
  assert.equal(saves, 0);
});
