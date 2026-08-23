#!/usr/bin/env node
/**
 * Workers AI 폴백 경로의 실행 가드.
 *
 * 이 경로는 Gemini 가 살아 있는 동안 한 번도 안 돌아서 회귀가 조용히 쌓인다 —
 * `@cf/meta/llama-3.1-8b-instruct` 와 `@cf/moonshotai/kimi-k2.5` 가 폐기된 것도
 * Gemini 가 죽고 나서야 드러났다. 그래서 소스 단언이 아니라 **실제로 호출해** 확인한다.
 * `env.AI.run` 을 스텁으로 갈아끼우므로 네트워크·과금 없이 돈다.
 *
 * 특히 응답 파싱이 핵심이다. `@cf/meta/*` 는 `{ response }` 를, `@cf/zai-org/*` 같은
 * 신세대 모델은 OpenAI 호환 `{ choices: [{ message: { content } }] }` 를 준다.
 * 한쪽만 읽으면 그 모델의 응답이 전부 "빈 응답" 으로 실패한다.
 *
 * 실행: node --experimental-strip-types scripts/verify-workers-ai-fallback.mjs
 */

import { callLLM } from "../lib/llm-client.ts";
import { callGeminiText } from "../worker/lib/gemini.js";

// Gemini 를 확실히 실패시켜(키 없음) 폴백만 타게 한다 — fetch 가 나가지 않는다.
delete process.env.GEMINIF_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_GEMINI_API_KEY;

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

/** 호출 기록을 남기는 env.AI 스텁. handler(model, input) 가 응답 또는 throw 를 결정한다. */
function stubEnv(handler, extraEnv = {}) {
  const calls = [];
  return {
    calls,
    env: {
      ...extraEnv,
      AI: {
        run: async (model, input) => {
          calls.push({ model, input });
          return handler(model, input);
        },
      },
    },
  };
}

const DEPRECATED = "5028: This model was deprecated on 2026-05-30.";

// (1) OpenAI 호환 응답(choices) 을 읽어야 한다. 못 읽으면 1차 모델이 통째로 죽는다.
{
  const { env, calls } = stubEnv(() => ({
    choices: [{ message: { content: "글렘 응답 본문" } }],
  }));
  const result = await callLLM({ prompt: "테스트" }, env);
  assert(result.text === "글렘 응답 본문", "OpenAI 형 choices[0].message.content 를 읽지 못했다");
  assert(result.provider === "cloudflare", "폴백 응답의 provider 가 cloudflare 여야 한다");
  assert(
    calls[0]?.model === "@cf/zai-org/glm-4.7-flash",
    `체인 1차가 glm-4.7-flash 여야 한다 (실제: ${calls[0]?.model})`,
  );
}

// (2) 기존 `{ response }` 형(@cf/meta/*)도 그대로 읽어야 한다 — 종전 동작 보존.
{
  const { env } = stubEnv(() => ({ response: "라마 응답 본문" }));
  const result = await callLLM({ prompt: "테스트" }, env);
  assert(result.text === "라마 응답 본문", "기존 response 필드 파싱이 깨졌다");
}

// (3) 1차가 폐기(5028)돼도 2차가 받아야 한다. 체인이 존재하는 이유 그 자체.
{
  const { env, calls } = stubEnv((model) => {
    if (model.startsWith("@cf/zai-org/")) throw new Error(DEPRECATED);
    return { response: "2차 모델 본문" };
  });
  const result = await callLLM({ prompt: "테스트" }, env);
  assert(result.text === "2차 모델 본문", "1차 실패 시 2차 모델로 승계되지 않았다");
  assert(
    result.model === "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    `승계 후 model 이 실제 사용 모델이어야 한다 (실제: ${result.model})`,
  );
  assert(calls.length === 2, `체인이 2개 모델을 시도해야 한다 (실제: ${calls.length})`);
}

// (4) 빈 응답도 실패로 보고 다음 모델로 넘어가야 한다.
{
  const { env } = stubEnv((model) =>
    model.startsWith("@cf/zai-org/") ? { choices: [{ message: { content: "   " } }] } : { response: "폴백 본문" },
  );
  const result = await callLLM({ prompt: "테스트" }, env);
  assert(result.text === "폴백 본문", "빈 응답을 받은 모델에서 다음 모델로 넘어가지 않았다");
}

// (5) JSON 요청은 OpenAI 호환 모델에만 response_format 을 붙인다.
//     @cf/meta/* 의 JSON Mode 는 json_schema 를 요구하는데 우리 라우트엔 스키마가 없어,
//     붙이면 스키마 거부로 최후 안전망까지 잃는다.
{
  const { env, calls } = stubEnv((model) => {
    if (model.startsWith("@cf/zai-org/")) throw new Error(DEPRECATED);
    return { response: '{"ok":true}' };
  });
  await callLLM({ prompt: "테스트", responseMimeType: "application/json" }, env);
  const glmInput = calls.find((call) => call.model.startsWith("@cf/zai-org/"))?.input;
  const metaInput = calls.find((call) => call.model.startsWith("@cf/meta/"))?.input;
  assert(
    glmInput?.response_format?.type === "json_object",
    "OpenAI 호환 모델에 response_format: json_object 가 전달되지 않았다",
  );
  assert(!metaInput?.response_format, "@cf/meta/* 에는 response_format 을 붙이면 안 된다");
}

// (6) 텍스트 요청에는 어느 모델에도 response_format 을 붙이지 않는다.
{
  const { env, calls } = stubEnv(() => ({ choices: [{ message: { content: "본문" } }] }));
  await callLLM({ prompt: "테스트" }, env);
  assert(!calls[0]?.input?.response_format, "텍스트 요청에 response_format 이 붙었다");
}

// (7) env 오버라이드는 쉼표 목록을 받아 그 순서가 체인이 된다 —
//     모델이 또 폐기됐을 때 배포 없이 갈아끼우는 탈출구다.
{
  const { env, calls } = stubEnv(
    (model) => (model === "@cf/first/one" ? Promise.reject(new Error(DEPRECATED)) : { response: "본문" }),
    { WORKERS_AI_MODEL: "@cf/first/one, @cf/second/two" },
  );
  const result = await callLLM({ prompt: "테스트" }, env);
  assert(
    calls.map((call) => call.model).join(",") === "@cf/first/one,@cf/second/two",
    `env 오버라이드 목록 순서대로 시도해야 한다 (실제: ${calls.map((call) => call.model).join(",")})`,
  );
  assert(result.model === "@cf/second/two", "오버라이드 체인의 성공 모델이 보고되지 않았다");
}

// (8) 전부 실패하면 모델별 사유를 모두 담아 올린다 — 어느 모델이 왜 죽었는지 로그로 남아야 한다.
{
  const { env } = stubEnv(() => {
    throw new Error(DEPRECATED);
  });
  let message = "";
  try {
    await callLLM({ prompt: "테스트" }, env);
  } catch (error) {
    message = String(error?.message || "");
  }
  assert(message.includes("@cf/zai-org/glm-4.7-flash"), "실패 메시지에 1차 모델명이 없다");
  assert(message.includes("@cf/meta/llama-3.3-70b-instruct-fp8-fast"), "실패 메시지에 2차 모델명이 없다");
}

// (9) 🔴 무응답 모델을 시간으로 끊어야 한다.
//     `env.AI.run` 은 AbortSignal 을 보장하지 않아 signal 로는 못 끊는다. 이 상한이 없던 동안
//     한 호출의 실제 상한은 "timeoutMs(Gemini) + 무제한(폴백 2개 순차)"이었고, 그 초과분을
//     엣지(100초)가 끊으면 라우트의 실패 처리·정리 코드가 아예 돌지 못했다.
{
  const { env, calls } = stubEnv(() => new Promise(() => {}));
  const startedAt = Date.now();
  let message = "";
  try {
    await callLLM({ prompt: "테스트", timeoutMs: 300 }, env);
  } catch (error) {
    message = String(error?.message || "");
  }
  const elapsedMs = Date.now() - startedAt;
  assert(message.includes("timed out"), `무응답 모델을 시간으로 끊어야 한다 (실제: ${message})`);
  assert(elapsedMs < 3000, `폴백 체인이 예산(300ms) 안에서 끝나야 한다 (실제 ${elapsedMs}ms)`);
  // 예산은 모델마다가 아니라 체인 전체에 걸린다 — 1차가 다 써 버리면 2차는 호출조차 하지 않는다.
  assert(calls.length === 1, `예산 소진 후 다음 모델을 호출하면 안 된다 (실제 ${calls.length}회 호출)`);
  assert(
    message.includes("fallback budget exhausted"),
    `건너뛴 모델의 사유가 실패 메시지에 남아야 한다 (실제: ${message})`,
  );
}

// (10) 예산 안에서 끝난 느린 응답은 종전대로 성공해야 한다(상한 도입이 정상 경로를 깨지 않을 것).
{
  const { env } = stubEnv(() => new Promise((resolve) => setTimeout(() => resolve({ response: "느리지만 성공" }), 120)));
  const result = await callLLM({ prompt: "테스트", timeoutMs: 5000 }, env);
  assert(result.text === "느리지만 성공", "예산 안에서 끝난 응답은 그대로 성공해야 한다");
}

// (11) 레이스에서 진 프라미스가 나중에 거부해도 unhandled rejection 으로 새면 안 된다
//      (Workers 런타임에서 처리되지 않은 거부는 요청을 통째로 죽일 수 있다).
{
  let unhandled = null;
  const onUnhandled = (reason) => { unhandled = reason; };
  process.on("unhandledRejection", onUnhandled);
  const { env } = stubEnv(() => new Promise((_, reject) => setTimeout(() => reject(new Error("late boom")), 250)));
  try {
    await callLLM({ prompt: "테스트", timeoutMs: 60 }, env);
  } catch {
    // 예상된 실패 — 여기서 확인할 것은 아래의 미처리 거부 여부다.
  }
  await new Promise((resolve) => setTimeout(resolve, 450));
  process.off("unhandledRejection", onUnhandled);
  assert(unhandled === null, `레이스에서 진 프라미스의 거부가 새어 나왔다 (${unhandled?.message || unhandled})`);
}

// (12) 🔴 짧은 폴백은 유료 결과로 나가면 안 된다.
//      70B 는 장문 지시에도 ~1,700자에서 스스로 멈춘다. 그런 응답이 2만자 상품의 결과로
//      전달되면 "정상 결제 + 8% 분량"이 되고 재시도·환불 경로가 사라진다.
//      fallbackMinChars 를 준 호출은 미달 시 실패로 돌아 라우트의 기존 실패 처리를 타야 한다.
{
  const { env } = stubEnv(() => ({ response: "짧은 폴백 본문." }));
  const rejected = await callGeminiText(env, "테스트", { fallbackMinChars: 400 });
  assert(rejected?.ok === false, "짧은 폴백이 성공으로 통과했다 — 유료 결과로 나간다");
  assert(rejected?.error === "fallback_output_too_short", `실패 사유가 fallback_output_too_short 여야 한다 (실제: ${rejected?.error})`);
  assert(rejected?.status === 503, `재시도 가능한 503 이어야 한다 (실제: ${rejected?.status})`);

  // 문턱을 넘는 폴백은 종전대로 통과해야 한다 — 게이트가 정상 폴백까지 막으면 안 된다.
  const longEnough = "폴백 본문 ".repeat(200);
  const { env: okEnv } = stubEnv(() => ({ response: longEnough }));
  const accepted = await callGeminiText(okEnv, "테스트", { fallbackMinChars: 400 });
  assert(accepted?.ok === true, "문턱을 넘는 폴백까지 거부됐다 — 게이트가 과대하다");

  // 게이트를 주지 않은 호출의 동작은 바뀌지 않아야 한다(기존 라우트 보호).
  const { env: bareEnv } = stubEnv(() => ({ response: "짧은 폴백 본문." }));
  const bare = await callGeminiText(bareEnv, "테스트", {});
  assert(bare?.ok === true, "게이트 없는 호출의 기존 동작이 바뀌었다");
}

// (13) 🔴 WORKERS_AI_ENABLED = "false" 는 env.AI.run 에 닿기 전에 끊어야 한다.
//      이 값을 읽는 코드가 0건이던 동안(2026-08-23 실측) 스테이징의 "AI 실호출 차단"은
//      Gemini 만 막았고, 키가 없으니 모든 요청이 이 폴백으로 내려와 과금 호출이 됐다.
//      🔴 스텁 호출 횟수 0 을 함께 단언한다 — 던지기만 하고 이미 호출한 뒤면 의미가 없다.
{
  for (const off of ["false", "0", "off", "FALSE", " off "]) {
    const { env, calls } = stubEnv(() => ({ response: "여기 오면 안 된다" }), { WORKERS_AI_ENABLED: off });
    let message = "";
    try {
      await callLLM({ prompt: "테스트" }, env);
    } catch (error) {
      message = String(error?.message || "");
    }
    assert(calls.length === 0, `WORKERS_AI_ENABLED="${off}" 인데 env.AI.run 이 ${calls.length}회 호출됐다`);
    assert(
      message.includes("WORKERS_AI_ENABLED"),
      `차단 사유가 실패 메시지에 남아야 한다 (off="${off}", 실제: ${message})`,
    );
  }

  // 명시적으로 켠 값과 미설정은 종전대로 돌아야 한다. 미설정이 막히면 이 스크립트 자신과
  // 프로덕션(값을 넣긴 하지만 "true")이 함께 죽는다.
  const { env: onEnv, calls: onCalls } = stubEnv(() => ({ response: "켜짐 본문" }), { WORKERS_AI_ENABLED: "true" });
  const on = await callLLM({ prompt: "테스트" }, onEnv);
  assert(on.text === "켜짐 본문", "WORKERS_AI_ENABLED=true 가 폴백을 막았다");
  assert(onCalls.length === 1, `켜짐 상태에서 정확히 1회 호출돼야 한다 (실제: ${onCalls.length})`);

  const { env: unsetEnv } = stubEnv(() => ({ response: "미설정 본문" }));
  const unset = await callLLM({ prompt: "테스트" }, unsetEnv);
  assert(unset.text === "미설정 본문", "미설정 환경에서 폴백이 막혔다 — 기본값은 허용이어야 한다");

  // 빈 문자열도 미설정과 같게 본다(wrangler 에서 값을 지우는 대신 비우는 경우).
  const { env: emptyEnv } = stubEnv(() => ({ response: "빈값 본문" }), { WORKERS_AI_ENABLED: "" });
  const empty = await callLLM({ prompt: "테스트" }, emptyEnv);
  assert(empty.text === "빈값 본문", "빈 문자열이 차단으로 해석됐다");
}

if (failures.length) {
  console.error("❌ Workers AI 폴백 가드 실패:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("✅ Workers AI 폴백 가드 통과 (체인 승계·응답 파싱 2종·JSON 모드·env 오버라이드·시간 상한·분량 게이트·실호출 차단 스위치)");
