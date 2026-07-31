#!/usr/bin/env node
/**
 * 토큰 계측의 실행 가드.
 *
 * 계측은 "있는 줄 알았는데 안 찍히는" 실패가 조용하다 — 비용 판단의 근거가 통째로
 * 사라지는데 화면에는 아무 증상이 없다. 그래서 소스 단언이 아니라 실제로 호출해
 * usageMetadata 파싱과 로그 형식을 확인한다.
 *
 * fetch / env.AI.run 을 스텁으로 갈아끼우므로 네트워크·과금이 없다.
 *
 * 실행: node --experimental-strip-types --no-warnings scripts/verify-llm-token-usage.mjs
 */

import { callLLM } from "../lib/llm-client.ts";

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

/** console.info 를 가로채 [llm token_usage] 줄만 모으고, run 의 반환값도 함께 돌려준다. */
async function captureLogs(run) {
  const original = console.info;
  const lines = [];
  console.info = (...args) => {
    if (String(args[0] || "").includes("[llm token_usage]")) lines.push(args[1]);
  };
  try {
    const value = await run();
    return { value, lines };
  } finally {
    console.info = original;
  }
}

const realFetch = globalThis.fetch;

function stubGemini(payload) {
  globalThis.fetch = async () => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ── 1. Gemini usageMetadata 파싱 ──────────────────────────────────────────────
stubGemini({
  candidates: [{ content: { parts: [{ text: "상담 본문" }] }, finishReason: "STOP" }],
  usageMetadata: {
    promptTokenCount: 8200,
    candidatesTokenCount: 32100,
    cachedContentTokenCount: 1024,
    thoughtsTokenCount: 0,
    totalTokenCount: 41324,
  },
});
const { value: geminiResult, lines: geminiLogs } = await captureLogs(() => callLLM(
  { prompt: "안녕", maxTokens: 33000, taskType: "fortune", logContext: { serviceId: "astrology-ai" } },
  { GEMINIF_API_KEY: "test-key" },
));
const logs = geminiLogs;

assert(geminiResult.usage, "Gemini 응답에 usage 가 없다");
assert(geminiResult.usage?.inputTokens === 8200, `입력 토큰 파싱 실패: ${geminiResult.usage?.inputTokens}`);
assert(geminiResult.usage?.outputTokens === 32100, `출력 토큰 파싱 실패: ${geminiResult.usage?.outputTokens}`);
assert(geminiResult.usage?.cachedInputTokens === 1024, `캐시 입력 토큰 파싱 실패: ${geminiResult.usage?.cachedInputTokens}`);
assert(!geminiResult.usage?.estimated, "실제 사용량이 있는데 estimated 로 표시됐다");

assert(logs.length === 1, `token_usage 로그가 1줄이어야 하는데 ${logs.length}줄`);
for (const field of ["provider", "model", "serviceId", "inputTokens", "outputTokens", "cachedInputTokens", "thinkingTokens", "maxTokens"]) {
  assert(field in (logs[0] || {}), `token_usage 로그에 ${field} 필드가 없다 — 집계 스크립트가 이 필드를 읽는다`);
}
assert(logs[0]?.serviceId === "astrology-ai", "logContext.serviceId 가 로그에 실리지 않았다");

// ── 2. usageMetadata 가 없으면 추정치로 채우고 estimated 를 세운다 ─────────────
stubGemini({ candidates: [{ content: { parts: [{ text: "가".repeat(500) }] }, finishReason: "STOP" }] });
const noMeta = await callLLM({ prompt: "나".repeat(200), taskType: "fortune" }, { GEMINIF_API_KEY: "test-key" });
assert(noMeta.usage?.estimated === true, "usageMetadata 가 없는데 estimated 표시가 없다");
assert(noMeta.usage?.outputTokens > 0, "추정 출력 토큰이 0이다");

// ── 3. Workers AI 폴백도 계측된다 ─────────────────────────────────────────────
globalThis.fetch = async () => { throw new Error("gemini down"); };
const { value: fallback, lines: fallbackLogs } = await captureLogs(() => callLLM(
  { prompt: "안녕", taskType: "fortune", logContext: { serviceId: "oracle" } },
  {
    GEMINIF_API_KEY: "test-key",
    AI: { run: async () => ({ choices: [{ message: { content: "폴백 본문입니다." } }] }) },
  },
));
assert(fallback.provider === "cloudflare", "폴백 경로를 타지 않았다");
assert(fallback.usage?.estimated === true, "Workers AI 사용량이 estimated 로 표시되지 않았다");
assert(fallback.usage?.outputTokens > 0, "Workers AI 출력 토큰이 0이다");
assert(fallbackLogs.length === 1 && fallbackLogs[0]?.provider === "cloudflare", "Workers AI 폴백의 token_usage 로그가 없다");

globalThis.fetch = realFetch;

// ── 4. 집계 스크립트가 이 로그 모양을 실제로 파싱하는지 ──────────────────────
const { execFileSync } = await import("node:child_process");
const sample = `[llm token_usage] ${JSON.stringify({
  action: "token_usage", provider: "gemini", model: "gemini-2.5-flash", taskType: "fortune",
  serviceId: "astrology-ai", requestId: "r1", inputTokens: 8200, outputTokens: 32100,
  cachedInputTokens: 0, thinkingTokens: 0, maxTokens: 33000, estimated: false,
})}`;
const report = execFileSync(process.execPath, ["scripts/report-llm-token-usage.mjs", "--json"], {
  input: sample,
  encoding: "utf8",
});
const parsed = JSON.parse(report);
assert(parsed.rows === 1, `집계 스크립트가 로그를 파싱하지 못했다 (rows=${parsed.rows})`);
assert(parsed.services?.[0]?.serviceId === "astrology-ai", "집계 결과의 serviceId 가 틀렸다");
assert(parsed.services?.[0]?.avgOutput === 32100, "집계 결과의 출력 토큰이 틀렸다");

if (failures.length) {
  console.error("[verify:llm-token-usage] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("[verify:llm-token-usage] PASS");
console.log("  Gemini usageMetadata 파싱 · 추정 폴백 · Workers AI 계측 · 집계 스크립트 파싱");
