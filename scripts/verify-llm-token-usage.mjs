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

import { callLLM, createGeminiContextCache, deleteGeminiContextCache } from "../lib/llm-client.ts";

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

// ── 3-B. Gemini 명시적 컨텍스트 캐싱의 전송 계약 ─────────────────────────────
//
// 이 계약은 틀려도 결과가 정상으로 보인다 — 캐시가 무시되면 그냥 정가로 나갈 뿐이라
// 화면에도 로그에도 증상이 없다. 그래서 나가는 요청 바디를 직접 본다.
{
  const requests = [];
  /** handler(요청바디, 순번) 가 응답을 정한다. cachedContents 왕복은 따로 모은다. */
  function stubRecordingGemini(handler) {
    requests.length = 0;
    globalThis.fetch = async (url, init) => {
      const href = String(url);
      const method = String(init?.method || "GET").toUpperCase();
      const body = JSON.parse(String(init?.body || "{}"));
      requests.push({ href, method, body });
      return handler({ href, method, body }, requests.length - 1);
    };
  }
  const ok = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  const geminiOk = () => ok({
    candidates: [{ content: { parts: [{ text: "상담 본문" }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 26000, candidatesTokenCount: 3000, cachedContentTokenCount: 25733 },
  });

  const env = { GEMINIF_API_KEY: "test-key" };
  const PREFIX = "불변 접두사입니다. 명식과 내부 지시문이 여기에 들어갑니다. ".repeat(120);
  const SUFFIX = "이번에 쓸 챕터는 1번입니다.";
  const FULL = `${PREFIX}\n\n${SUFFIX}`;
  const SYSTEM = "테스트 시스템 프롬프트";
  const CACHE_NAME = "cachedContents/verify-token-usage";

  // (a) 생성 요청의 바디 — model 은 "models/" 접두사, systemInstruction 은 캐시가 소유한다.
  stubRecordingGemini(() => ok({ name: CACHE_NAME }));
  const created = await createGeminiContextCache({ prefix: PREFIX, systemPrompt: SYSTEM }, env);
  assert(created?.name === CACHE_NAME, "컨텍스트 캐시 생성이 핸들을 돌려주지 않았다");
  assert(created?.prefix === PREFIX, "캐시 핸들의 prefix 가 요청과 다르다");
  assert(requests[0]?.href.includes("/cachedContents"), "캐시 생성이 cachedContents 엔드포인트로 가지 않았다");
  assert(
    String(requests[0]?.body?.model || "").startsWith("models/"),
    `캐시 생성 model 에 "models/" 접두사가 없다 (${requests[0]?.body?.model})`,
  );
  assert(
    requests[0]?.body?.systemInstruction?.parts?.[0]?.text === SYSTEM,
    "systemInstruction 이 캐시에 구워지지 않았다 — 호출 쪽에서 빠지므로 지시가 통째로 사라진다",
  );

  // (b) 참조 — 접두사는 떼고, cachedContent 를 가리키고, systemInstruction 은 보내지 않는다.
  stubRecordingGemini(() => geminiOk());
  const cachedRun = await callLLM(
    { prompt: FULL, systemPrompt: SYSTEM, taskType: "fortune", geminiCachedContent: created },
    env,
  );
  assert(cachedRun.provider === "gemini", "캐시 참조 호출이 Gemini 로 나가지 않았다");
  assert(requests[0]?.body?.cachedContent === CACHE_NAME, "요청이 cachedContent 를 가리키지 않는다 — 절감이 0이다");
  assert(
    requests[0]?.body?.systemInstruction === undefined,
    "cachedContent 와 systemInstruction 을 함께 보냈다 — Gemini 가 요청 자체를 거절한다",
  );
  const sentText = requests[0]?.body?.contents?.[0]?.parts?.[0]?.text || "";
  assert(!sentText.includes(PREFIX), "접두사가 본문에 그대로 실려 나갔다");
  assert(sentText.includes(SUFFIX), "접미사가 잘려 나갔다 — 그룹 지시가 사라진다");
  assert(cachedRun.usage?.cachedInputTokens === 25733, "캐시 할인 토큰이 계측되지 않았다");

  // (c) 🔴 게이트가 하나라도 어긋나면 캐시를 쓰지 않고 지금까지와 같은 바디를 보낸다.
  //     prompt 가 접두사로 시작하지 않는 경우 — 캐시 내용과 본문이 어긋난 채 나가면 안 된다.
  stubRecordingGemini(() => geminiOk());
  await callLLM(
    { prompt: `다른 접두사\n\n${SUFFIX}`, systemPrompt: SYSTEM, taskType: "fortune", geminiCachedContent: created },
    env,
  );
  assert(requests[0]?.body?.cachedContent === undefined, "prompt 가 접두사로 시작하지 않는데 캐시를 참조했다");
  assert(requests[0]?.body?.systemInstruction?.parts?.[0]?.text === SYSTEM, "캐시를 안 쓰는 경로에서 systemInstruction 이 빠졌다");

  //     systemPrompt 가 캐시에 구운 값과 다른 경우 — 캐시가 옛 지시를 들고 있으므로 쓰면 안 된다.
  stubRecordingGemini(() => geminiOk());
  await callLLM(
    { prompt: FULL, systemPrompt: "다른 시스템 프롬프트", taskType: "fortune", geminiCachedContent: created },
    env,
  );
  assert(requests[0]?.body?.cachedContent === undefined, "systemPrompt 가 캐시와 다른데 캐시를 참조했다");

  // (d) 🔴 캐시 참조가 실패하면 Workers AI 로 내려가기 전에 캐시 없이 한 번 더 Gemini 를 부른다.
  //     이 단계가 없으면 핸들 하나가 잘못될 때 병렬 그룹이 **전부** 폴백으로 떨어져,
  //     폴백 분량 게이트(fallbackMinChars)에 걸려 유료 상담이 통째로 실패한다.
  //     env 에 AI 바인딩이 없으므로 provider === "gemini" 가 곧 강등이 돌았다는 증거다.
  stubRecordingGemini((request) => (request.body?.cachedContent
    ? ok({ error: { message: "CachedContent not found" } }, 400)
    : geminiOk()));
  const degraded = await callLLM(
    { prompt: FULL, systemPrompt: SYSTEM, taskType: "fortune", geminiCachedContent: created },
    env,
  );
  assert(degraded.provider === "gemini", "캐시 참조 실패 후 무캐시 재시도가 돌지 않았다");
  assert(requests.length === 2, `캐시 실패 강등이 ${requests.length}콜이다 — 캐시 1회 + 무캐시 1회여야 한다`);
  assert(requests[1]?.body?.cachedContent === undefined, "재시도가 같은 캐시를 또 가리켰다 — 같은 실패를 반복한다");
  assert(
    (requests[1]?.body?.contents?.[0]?.parts?.[0]?.text || "").includes(PREFIX),
    "무캐시 재시도가 접두사를 빠뜨렸다 — 모델이 명식을 못 본다",
  );
  assert(requests[1]?.body?.systemInstruction?.parts?.[0]?.text === SYSTEM, "무캐시 재시도에 systemInstruction 이 없다");

  // (e) 만들지 말아야 할 때는 왕복조차 하지 않는다.
  stubRecordingGemini(() => ok({ name: CACHE_NAME }));
  assert(
    await createGeminiContextCache({ prefix: "너무 짧은 접두사", systemPrompt: SYSTEM }, env) === null,
    "최소 크기 미달 접두사로 캐시를 만들려 했다 — API 가 거절하고 왕복만 버린다",
  );
  assert(
    await createGeminiContextCache({ prefix: PREFIX }, { ...env, GEMINI_CONTEXT_CACHE: "0" }) === null,
    "GEMINI_CONTEXT_CACHE=0 인데 캐시를 만들었다 — 킬 스위치가 듣지 않는다",
  );
  assert(requests.length === 0, `만들지 말아야 할 캐시에 ${requests.length}회 왕복했다`);

  // (f) 생성 실패는 던지지 않고 null 로 접는다. 결제가 끝난 경로라 여기서 던지면 무결과가 된다.
  stubRecordingGemini(() => ok({ error: { message: "boom" } }, 500));
  assert(await createGeminiContextCache({ prefix: PREFIX, systemPrompt: SYSTEM }, env) === null, "캐시 생성 실패가 null 로 접히지 않았다");
  stubRecordingGemini(() => { throw new Error("network down"); });
  assert(await createGeminiContextCache({ prefix: PREFIX, systemPrompt: SYSTEM }, env) === null, "네트워크 오류가 null 로 접히지 않았다");

  // (g) 삭제는 DELETE 로 나가고, 실패해도 던지지 않는다(TTL 이 안전망).
  stubRecordingGemini(() => ok({}));
  await deleteGeminiContextCache(created, env);
  assert(requests[0]?.method === "DELETE", "캐시 삭제가 DELETE 로 나가지 않았다");
  assert(requests[0]?.href.includes(CACHE_NAME), "삭제 URL 에 캐시 이름이 없다");
  stubRecordingGemini(() => { throw new Error("delete down"); });
  let deleteThrew = false;
  try {
    await deleteGeminiContextCache(created, env);
  } catch {
    deleteThrew = true;
  }
  assert(!deleteThrew, "캐시 삭제 실패가 던졌다 — 이미 만들어 놓은 상담 결과를 통째로 잃는다");
}

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
console.log("  컨텍스트 캐시: 생성 바디 · 접두사 제거 · systemInstruction 이관 · 게이트 2종 · 무캐시 강등 · 실패 흡수");
