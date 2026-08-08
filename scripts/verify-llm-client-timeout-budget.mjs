#!/usr/bin/env node
/**
 * Gemini 재시도 + Workers AI 폴백이 timeoutMs 예산을 이중으로 소비하지 않는지 확인하는 가드.
 *
 * `scripts/verify-workers-ai-fallback.mjs`는 Gemini 키를 아예 지워 폴백 체인 자체(모델 승계·
 * 파싱·체인 내부 시간 상한)만 검증한다 — Gemini가 fetch를 한 번도 안 타므로 "Gemini 재시도가
 * 이미 예산을 쓴 뒤 폴백이 그 사실을 모르고 timeoutMs를 통째로 다시 받는" 문제는 그 스크립트로는
 * 안 잡힌다. 이 스크립트는 `fetch`를 스텁으로 갈아끼워 Gemini 단계까지 포함한 전체 호출
 * (`callGeminiWithRetry` → `callCloudflareWorkersAI`)이 하나의 공유 예산(deadlineAt) 안에서
 * 끝나는지를 확인한다. 네트워크·과금 없이 돈다(CLAUDE.md 코딩 원칙 8 — mock 기본).
 *
 * 실행: node --experimental-strip-types --no-warnings scripts/verify-llm-client-timeout-budget.mjs
 */

import { callLLM } from "../lib/llm-client.ts";

process.env.GEMINIF_API_KEY = "test-key";

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

function fakeResponse(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function geminiOkBody(text = "정상 응답 본문") {
  return { candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] };
}

/** 지정한 상태코드로 매번 즉시 실패 응답을 주는 fetch 스텁. */
function instantFailFetch(status) {
  const calls = [];
  return {
    calls,
    fetch: async (url, init) => {
      calls.push({ url, init });
      return fakeResponse(status, { error: { message: `boom ${status}` } });
    },
  };
}

/** 즉시 성공하는 fetch 스텁. */
function instantOkFetch(text) {
  const calls = [];
  return {
    calls,
    fetch: async (url, init) => {
      calls.push({ url, init });
      return fakeResponse(200, geminiOkBody(text));
    },
  };
}

/**
 * AbortSignal이 실제로 끊길 때까지 응답하지 않는 fetch 스텁.
 * `createTimeoutSignal`이 attemptTimeoutMs 뒤 controller.abort()를 호출하므로,
 * 이 스텁은 그 abort가 발생한 시점에만 reject한다 — 실제 fetch의 타임아웃 동작을 흉내낸다.
 */
function hangingUntilAbortFetch() {
  const calls = [];
  return {
    calls,
    fetch: (url, init) => {
      calls.push({ url, init });
      return new Promise((_, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) {
          reject(new Error("aborted"));
          return;
        }
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    },
  };
}

function stubAiRun(handler) {
  const calls = [];
  return {
    calls,
    env: {
      GEMINIF_API_KEY: "test-key",
      AI: {
        run: async (model, input) => {
          calls.push({ model, input });
          return handler(model, input);
        },
      },
    },
  };
}

const originalFetch = globalThis.fetch;
/** 시나리오 하나를 실행하는 동안 fn이 globalThis.fetch를 자유롭게 갈아끼우고, 끝나면 원복한다. */
async function isolated(fn) {
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// (1) 정상 성공 경로: Gemini가 1차 시도에서 바로 성공하면 재시도·폴백 없이 즉시 반환된다.
await isolated(async () => {
  const { fetch, calls } = instantOkFetch("첫 시도 성공");
  globalThis.fetch = fetch;
  const startedAt = Date.now();
  const result = await callLLM({ prompt: "테스트", timeoutMs: 60000 });
  const elapsedMs = Date.now() - startedAt;
  assert(result.provider === "gemini", `1차 성공은 provider가 gemini여야 한다 (실제: ${result.provider})`);
  assert(result.text === "첫 시도 성공", "1차 성공 응답 텍스트가 그대로 전달되어야 한다");
  assert(calls.length === 1, `1차 성공이면 fetch가 1회만 호출되어야 한다 (실제 ${calls.length}회)`);
  assert(elapsedMs < 2000, `1차 성공은 즉시 끝나야 한다 (실제 ${elapsedMs}ms)`);
});

// (2) 일시적 오류(5xx) 3회 소진 후 Workers AI 폴백 성공 — 총 소요시간이 timeoutMs를 넘지 않아야 한다.
await isolated(async () => {
  const { fetch, calls: fetchCalls } = instantFailFetch(500);
  globalThis.fetch = fetch;
  const { env, calls: aiCalls } = stubAiRun(() => ({ response: "폴백 성공 본문" }));
  const startedAt = Date.now();
  const result = await callLLM({ prompt: "테스트", timeoutMs: 5000 }, env);
  const elapsedMs = Date.now() - startedAt;
  assert(result.provider === "cloudflare", `Gemini 전멸 후엔 폴백으로 넘어가야 한다 (실제: ${result.provider})`);
  assert(fetchCalls.length === 3, `일시적 오류는 최대 3회(1차+재시도2) 시도해야 한다 (실제 ${fetchCalls.length}회)`);
  assert(aiCalls.length === 1, `1차 폴백 모델이 성공하면 2차는 호출되지 않아야 한다 (실제 ${aiCalls.length}회)`);
  assert(
    elapsedMs < 5000,
    `Gemini 재시도 + 폴백 총 소요시간이 timeoutMs(5000ms) 안에서 끝나야 한다 (실제 ${elapsedMs}ms)`,
  );
  assert(elapsedMs >= 1300, `백오프(400ms+900ms)를 실제로 기다려야 한다 (실제 ${elapsedMs}ms)`);
});

// (3) 🔴 핵심 재현 케이스: 느린 1차 시도가 예산을 통째로 써버리면 폴백은 호출조차 되지 않고
//     즉시 스킵되어야 한다 — 수정 전 버그라면 폴백이 timeoutMs를 다시 통째로 받아 총 소요시간이
//     2배 가까이 늘어났을 지점이다.
await isolated(async () => {
  const { fetch, calls: fetchCalls } = hangingUntilAbortFetch();
  globalThis.fetch = fetch;
  const { env, calls: aiCalls } = stubAiRun(() => ({ response: "호출되면 안 되는 응답" }));
  const startedAt = Date.now();
  let message = "";
  try {
    await callLLM({ prompt: "테스트", timeoutMs: 500 }, env);
  } catch (error) {
    message = String(error?.message || "");
  }
  const elapsedMs = Date.now() - startedAt;
  assert(fetchCalls.length === 1, `타임아웃은 재시도 대상이 아니므로 fetch는 1회만 호출되어야 한다 (실제 ${fetchCalls.length}회)`);
  assert(aiCalls.length === 0, `예산이 바닥나면 폴백 모델을 호출하면 안 된다 (실제 ${aiCalls.length}회 호출)`);
  assert(
    message.includes("skipped (fallback budget exhausted)"),
    `건너뛴 폴백 모델의 사유가 에러 메시지에 남아야 한다 (실제: ${message})`,
  );
  assert(
    elapsedMs < 500 * 1.8,
    `Gemini 타임아웃(500ms) 이후 폴백이 예산을 다시 받으면 안 된다 — 총 소요시간이 timeoutMs의 1.8배를 넘었다 (실제 ${elapsedMs}ms)`,
  );
});

// (4) 백오프 대기 직전에 남은 예산이 부족하면 대기하지 않고 마지막 실제 에러를 즉시 던져야 한다
//     (예산이 없는데도 900ms를 더 기다리다 결국 실패하면 그만큼 폴백 몫을 갉아먹는다).
await isolated(async () => {
  const { fetch, calls: fetchCalls } = instantFailFetch(503);
  globalThis.fetch = fetch;
  const startedAt = Date.now();
  let message = "";
  try {
    // 예산 500ms: 1차(즉시 실패) + 400ms 백오프 여유는 있지만, 그다음 900ms 백오프는 감당 못 한다.
    await callLLM({ prompt: "테스트", timeoutMs: 500, fallbackToWorkersAI: false });
  } catch (error) {
    message = String(error?.message || "");
  }
  const elapsedMs = Date.now() - startedAt;
  assert(fetchCalls.length === 2, `두 번째 백오프 예산이 없으면 3차 시도는 하지 않아야 한다 (실제 ${fetchCalls.length}회)`);
  assert(message.includes("boom 503"), `예산 소진 시 마지막 실제 에러를 그대로 던져야 한다 (실제: ${message})`);
  assert(elapsedMs < 500 + 200, `900ms 백오프를 기다리지 않고 즉시 실패해야 한다 (실제 ${elapsedMs}ms)`);
});

// (5) 4xx는 재시도 대상이 아니므로 fetch가 정확히 1회만 호출되어야 한다(회귀 방지).
await isolated(async () => {
  const { fetch, calls: fetchCalls } = instantFailFetch(400);
  globalThis.fetch = fetch;
  let threw = false;
  try {
    await callLLM({ prompt: "테스트", timeoutMs: 5000, fallbackToWorkersAI: false });
  } catch {
    threw = true;
  }
  assert(threw, "4xx는 실패로 던져져야 한다");
  assert(fetchCalls.length === 1, `4xx는 재시도하면 안 된다 (실제 ${fetchCalls.length}회)`);
});

// (6) fallbackToWorkersAI:false면 예산이 바닥나도 폴백을 절대 호출하지 않아야 한다
//     (이어쓰기 repair 호출 등 폴백이 켜지면 안 되는 경로의 계약 유지 확인).
await isolated(async () => {
  const { fetch, calls: fetchCalls } = hangingUntilAbortFetch();
  globalThis.fetch = fetch;
  const { env, calls: aiCalls } = stubAiRun(() => ({ response: "호출되면 안 되는 응답" }));
  const startedAt = Date.now();
  let message = "";
  try {
    await callLLM({ prompt: "테스트", timeoutMs: 300, fallbackToWorkersAI: false }, env);
  } catch (error) {
    message = String(error?.message || "");
  }
  const elapsedMs = Date.now() - startedAt;
  assert(aiCalls.length === 0, `fallbackToWorkersAI:false면 폴백을 호출하면 안 된다 (실제 ${aiCalls.length}회)`);
  assert(message.includes("timed out"), `타임아웃 에러가 그대로 전달되어야 한다 (실제: ${message})`);
  assert(elapsedMs < 300 * 1.8, `재시도만으로도 예산(300ms)을 넘기면 안 된다 (실제 ${elapsedMs}ms)`);
  assert(fetchCalls.length === 1, `타임아웃은 재시도 대상이 아니다 (실제 ${fetchCalls.length}회)`);
});

globalThis.fetch = originalFetch;

if (failures.length) {
  console.error("❌ LLM 클라이언트 타임아웃 예산 가드 실패:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("✅ LLM 클라이언트 타임아웃 예산 가드 통과 (Gemini 재시도 + Workers AI 폴백이 timeoutMs 하나를 공유)");
