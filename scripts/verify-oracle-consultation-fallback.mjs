#!/usr/bin/env node
/**
 * 타로 오라클 상담의 Workers AI 폴백 배선 가드.
 *
 * 🔴 이 파일이 `verify-oracle-consultation.mjs` 와 **따로 있는 이유**: 오직 여기서만
 * `worker/lib/tarot-oracle-llm.js → structured-consultation.js → gemini.js → lib/llm-client.ts`
 * 체인을 실제로 문다. 그 체인은 `.ts` 를 포함해 `--experimental-strip-types` 가 필요하고,
 * 본 검증기는 플래그 없는 `node` 로 돌아야 하므로(모듈이 워커·node·Jest 세 곳에서 로드된다)
 * 두 파일을 합치면 한쪽이 반드시 깨진다. 선례: scripts/verify-workers-ai-fallback.mjs
 *
 * Gemini 키를 지우고 `env.AI.run` 을 스텁으로 갈아끼우므로 **네트워크·과금 0회**다.
 *
 * 실행: node --experimental-strip-types --no-warnings scripts/verify-oracle-consultation-fallback.mjs
 */

import { createOracleConsultationLlm } from "../worker/lib/tarot-oracle-llm.js";
import { resolveOracleConsultationTargetChars } from "../lib/tarot/oracle-consultation.mjs";

// Gemini 를 확실히 실패시켜(키 없음) 폴백만 타게 한다 — fetch 가 나가지 않는다.
delete process.env.GEMINIF_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_GEMINI_API_KEY;

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** 호출 기록을 남기는 env.AI 스텁. */
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

/** 렌더러가 그리는 필드를 채운, 길이를 마음대로 정할 수 있는 상담 JSON. */
function consultationJson(chars) {
  const filler = "이 흐름에서 지금 실제로 움직이고 있는 것을 조금 더 자세히 풀어 설명합니다. ";
  const body = filler.repeat(Math.max(1, Math.ceil(chars / filler.replace(/\s+/g, "").length)));
  return JSON.stringify({
    coreQuestion: body,
    bigPicture: "전체 흐름입니다.",
    positionReadings: [{ positionOrder: 1, headline: "핵심", reading: "해석입니다.", positionAdvice: "태도입니다." }],
    tension: "긴장입니다.",
    categoryFocus: "심화입니다.",
    caution: "주의입니다.",
    actions: ["행동입니다."],
    closingLine: "마무리입니다.",
  });
}

const PROMPTS = { systemPrompt: "시스템 지시", userPrompt: "사용자 프롬프트" };

console.log("타로 오라클 상담 Workers AI 폴백 배선 검증 (실호출 0회)\n");

// 3카드 기준으로 문턱을 잡는다. 어댑터는 targetChars * 0.4 를 fallbackMinChars 로 쓴다.
const target3 = resolveOracleConsultationTargetChars(3, {});
const minChars = Math.round(target3 * 0.4);
console.log(`[전제] 3카드 목표 ${target3}자 → 폴백 문턱 ${minChars}자\n`);

console.log("[1] Gemini 가 죽으면 Workers AI 체인 1차 모델로 넘어간다");
{
  const { env, calls } = stubEnv(() => ({ response: consultationJson(minChars * 2) }));
  const callJson = createOracleConsultationLlm(env, { locale: "ko", requestId: "req-1", targetChars: target3 });
  const result = await callJson(PROMPTS);
  check("ok:true", result?.ok === true, `reason=${result?.reason}`);
  check("env.AI.run 이 호출됐다", calls.length > 0, `calls=${calls.length}`);
  check(
    "1차 모델이 glm-4.7-flash 다",
    String(calls[0]?.model || "").includes("glm-4.7-flash"),
    `model=${calls[0]?.model}`,
  );
  check("provider 가 workers-ai 로 표시된다", result?.provider === "workers-ai", `provider=${result?.provider}`);
  check("본문이 그대로 올라온다", String(result?.text || "").includes("coreQuestion"));
}

console.log("\n[2] 🔴 짧은 폴백 응답은 거절된다 — fallbackMinChars 가 실제로 전달된다는 증명");
{
  // 문턱을 한참 밑도는 응답. 이게 통과하면 8% 분량이 정상 결제 결과로 나간다.
  const { env } = stubEnv(() => ({ response: '{"coreQuestion":"짧다."}' }));
  const callJson = createOracleConsultationLlm(env, { locale: "ko", requestId: "req-2", targetChars: target3 });
  const result = await callJson(PROMPTS);
  check("ok:false", result?.ok === false, `ok=${result?.ok}`);
  check(
    "reason=llm_fallback_output_too_short",
    result?.reason === "llm_fallback_output_too_short",
    `reason=${result?.reason}`,
  );
}

console.log("\n[3] 문턱은 카드 수에 비례한다 (고정 상수면 양끝이 둘 다 틀린다)");
{
  const target14 = resolveOracleConsultationTargetChars(14, {});
  check("14카드 목표가 3카드보다 크다", target14 > target3, `${target3} vs ${target14}`);
  // 3카드에서는 통과하지만 14카드에서는 미달인 길이를 골라, 문턱이 실제로 달라지는지 본다.
  const between = Math.round((target3 * 0.4 + target14 * 0.4) / 2);
  const body = consultationJson(between);
  const small = createOracleConsultationLlm(stubEnv(() => ({ response: body })).env, { targetChars: target3 });
  const large = createOracleConsultationLlm(stubEnv(() => ({ response: body })).env, { targetChars: target14 });
  const smallResult = await small(PROMPTS);
  const largeResult = await large(PROMPTS);
  check("같은 응답이 3카드에서는 통과", smallResult?.ok === true, `reason=${smallResult?.reason}`);
  check("같은 응답이 14카드에서는 거절", largeResult?.ok === false, `ok=${largeResult?.ok}`);
}

console.log("\n[4] WORKERS_AI_ENABLED=0 이면 폴백을 타지 않는다");
{
  const { env, calls } = stubEnv(() => ({ response: consultationJson(minChars * 2) }), { WORKERS_AI_ENABLED: "0" });
  const callJson = createOracleConsultationLlm(env, { targetChars: target3 });
  const result = await callJson(PROMPTS);
  check("ok:false", result?.ok === false, `ok=${result?.ok}`);
  check("env.AI.run 을 부르지 않았다", calls.length === 0, `calls=${calls.length}`);
}

console.log("\n[5] 토큰 리포트가 이 라우트를 식별할 수 있다");
{
  // logContext 가 빠지면 scripts/report-llm-token-usage.mjs 의 라우트별 집계에서 이 기능이 사라진다.
  const source = (await import("node:fs")).readFileSync(
    new URL("../worker/lib/tarot-oracle-llm.js", import.meta.url),
    "utf8",
  );
  check("logContext.featureKey 가 tarot-prompt-maker 다", source.includes('featureKey: "tarot-prompt-maker"'));
  check("컨텍스트 캐시를 쓰지 않는다", !/\bcache\s*:/.test(source), "유료 상담 결과가 캐시로 새면 안 된다");
}

console.log("");
if (failures.length) {
  console.log(`❌ 실패 ${failures.length}건`);
  for (const item of failures) console.log(`   - ${item}`);
  process.exit(1);
}
console.log("✅ 전부 통과");
