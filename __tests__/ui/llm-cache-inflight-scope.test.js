const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { webcrypto } = require("node:crypto");

// llm-cache.ts 는 의존성이 없어야 한다 — require 없는 vm 샌드박스에서 돌려 그 계약도 함께 지킨다.
const source = readFileSync(resolve(__dirname, "../../lib/llm-cache.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, crypto: webcrypto, TextEncoder, setTimeout, clearTimeout, console: { info() {}, warn() {} } });
const { withLLMCache } = exportsObject;

// 테스트마다 프롬프트(=캐시 키)를 달리한다 — 모듈 전역 Map 에 남은 끝나지 않는 Promise 가 다른 케이스로 새지 않게.
const never = () => new Promise(() => {});

function withDeadline(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout: ${label}`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

test("different inflightScope never shares a pending call across requests", async () => {
  let calls = 0;
  void withLLMCache({ prompt: "scope-a" }, () => { calls += 1; return never(); }, { inflightScope: "A" });
  const resultB = { text: "B result", provider: "gemini" };
  const result = await withDeadline(
    withLLMCache({ prompt: "scope-a" }, async () => { calls += 1; return resultB; }, { inflightScope: "B" }),
    1000,
    "scope B waited on scope A",
  );
  assert.equal(result, resultB);
  assert.equal(calls, 2);
});

test("same inflightScope still dedups concurrent identical calls", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolveGate) => { release = resolveGate; });
  const response = { text: "shared", provider: "gemini" };
  const callUncached = async () => { calls += 1; await gate; return response; };
  const first = withLLMCache({ prompt: "scope-same" }, callUncached, { inflightScope: "A" });
  const second = withLLMCache({ prompt: "scope-same" }, callUncached, { inflightScope: "A" });
  await new Promise((resolveTick) => setTimeout(resolveTick, 20));
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a, response);
  assert.equal(b, response);
  assert.equal(calls, 1);
});

test("missing inflightScope does not dedup (safe default)", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolveGate) => { release = resolveGate; });
  const response = { text: "unshared", provider: "gemini" };
  const callUncached = async () => { calls += 1; await gate; return response; };
  const first = withLLMCache({ prompt: "scope-none" }, callUncached, {});
  const second = withLLMCache({ prompt: "scope-none" }, callUncached, { inflightScope: "" });
  await new Promise((resolveTick) => setTimeout(resolveTick, 20));
  release();
  await Promise.all([first, second]);
  assert.equal(calls, 2);
});

test("llm-client wires the request db scope id into the cache config", () => {
  const client = readFileSync(resolve(__dirname, "../../lib/llm-client.ts"), "utf8");
  assert.match(client, /inflightScope:\s*currentDbScopeId\(\)/);
});
