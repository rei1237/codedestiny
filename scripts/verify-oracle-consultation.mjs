#!/usr/bin/env node
// 타로 오라클 상담(lib/tarot/oracle-consultation.mjs) 회귀 검증
// - mock fetch로 카드 검증·LLM 성공/HTTP 오류/JSON 깨짐 케이스에서 source·필드·재시도 동작을 검증한다.
// - `node scripts/verify-oracle-consultation.mjs --live` 실행 시 실제 GEMINIF_API_KEY로 1회 호출해 실물 품질을 출력한다.
import { readFileSync } from "node:fs";
import {
  buildOracleConsultationPrompt,
  generateOracleConsultation,
  measureConsultationChars,
  resolveOracleConsultationTargetChars,
  validateOracleConsultationInput,
} from "../lib/tarot/oracle-consultation.mjs";

const LIVE = process.argv.includes("--live");

const SAMPLE_INPUT = {
  spreadTitle: "3장 흐름 배열",
  category: "love",
  question: "그 사람이 지금 나를 어떻게 생각할까요?",
  tone: "consult",
  cards: [
    { cardId: "M06", orientation: "upright", positionLabel: "과거", positionDescription: "지금 관계의 배경" },
    { cardId: "M00", orientation: "reversed", positionLabel: "현재", positionDescription: "" },
    { cardId: "M21", orientation: "upright", positionLabel: "미래", positionDescription: "앞으로의 흐름" },
  ],
};

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function mockFetch(handler) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return handler(calls.length);
  };
  impl.calls = calls;
  return impl;
}

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

// 분량 게이트가 생긴 뒤로 fixture 는 "목표 분량을 넘는 정상 응답"이어야 한다 —
// 짧으면 재요청 경로로 빠져 source 가 llm_short 가 된다(그 경로는 케이스 5가 따로 본다).
function sentences(seed, count) {
  const out = [];
  for (let index = 0; index < count; index += 1) {
    out.push(`${seed}에 대해 ${index + 1}번째로 짚어 보면, 지금 흐름에서 실제로 무엇이 움직이고 있는지가 더 또렷해집니다.`);
  }
  return out.join(" ");
}

function fixtureConsultation() {
  return {
    coreQuestion: sentences("질문자가 지금 묻고 있는 진짜 주제", 3),
    bigPicture: sentences("스프레드 전체에서 먼저 보이는 큰 흐름", 6),
    positionReadings: [
      { positionOrder: 1, headline: "과거의 진심", reading: sentences("연인 카드가 놓인 과거 자리", 7), positionAdvice: sentences("이 자리에서 취할 태도", 2) },
      { positionOrder: 2, headline: "흔들리는 현재", reading: sentences("역방향 바보가 놓인 현재 자리", 7), positionAdvice: sentences("이 자리에서 취할 태도", 2) },
      { positionOrder: 3, headline: "완성으로 가는 미래", reading: sentences("세계 카드가 놓인 미래 자리", 7), positionAdvice: sentences("이 자리에서 취할 태도", 2) },
    ],
    cardSynergies: [
      { pairLabel: "1번 연인 × 3번 세계", insight: sentences("두 카드가 함께 만드는 의미", 4) },
      { pairLabel: "2번 바보 × 3번 세계", insight: sentences("두 카드가 함께 만드는 의미", 4) },
    ],
    timeline: {
      now: sentences("지금 국면에서 일어나고 있는 것", 3),
      near: sentences("다가오는 국면", 3),
      turning: sentences("흐름이 갈리는 분기점", 3),
    },
    tension: sentences("카드들이 서로 만드는 긴장과 조화", 5),
    categoryFocus: sentences("이 카테고리에서만 의미가 있는 심화 조언", 5),
    caution: sentences("조심해야 할 착각과 과잉 기대", 4),
    actions: [
      sentences("오늘부터 가능한 첫 번째 행동", 2),
      sentences("오늘부터 가능한 두 번째 행동", 2),
      sentences("오늘부터 가능한 세 번째 행동", 2),
      sentences("오늘부터 가능한 네 번째 행동", 2),
    ],
    closingLine: sentences("마음을 정리하는 마지막 한마디", 3),
  };
}

// 렌더러가 그리는 필드가 거의 비어 있어 목표 분량에 한참 못 미치는 응답.
function shortFixtureConsultation() {
  return {
    coreQuestion: "짧습니다.",
    bigPicture: "짧습니다.",
    positionReadings: [{ positionOrder: 1, headline: "짧음", reading: "짧습니다." }],
    tension: "짧습니다.",
    caution: "짧습니다.",
    actions: ["짧습니다."],
    closingLine: "짧습니다.",
  };
}

async function runMockSuite() {
  const env = { GEMINIF_API_KEY: "test-key" };

  console.log("\n[케이스 0] 입력 검증");
  check(
    "알 수 없는 카드 ID는 서버에서 걸러진다",
    validateOracleConsultationInput({ ...SAMPLE_INPUT, cards: [{ cardId: "", orientation: "upright" }] }).ok === false,
  );
  check("스프레드 제목 없으면 거부", validateOracleConsultationInput({ ...SAMPLE_INPUT, spreadTitle: "" }).ok === false);
  check("카드 0장이면 거부", validateOracleConsultationInput({ ...SAMPLE_INPUT, cards: [] }).ok === false);

  console.log("\n[케이스 1] LLM 정상 JSON 응답");
  const fixture = fixtureConsultation();
  const okFetch = mockFetch(() => jsonResponse({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(fixture) }] } }],
  }));
  const okResult = await generateOracleConsultation(SAMPLE_INPUT, { env, fetchImpl: okFetch });
  check("source가 llm", okResult?.source === "llm", `ok=${okResult?.ok} reason=${okResult?.reason}`);
  check("coreQuestion 반영", okResult?.consultation?.coreQuestion === fixture.coreQuestion);
  check("positionReadings 3개 반영", okResult?.consultation?.positionReadings?.length === 3);

  const requestBody = JSON.parse(okFetch.calls[0]?.init?.body || "{}");
  const promptText = requestBody?.contents?.[0]?.parts?.[0]?.text || "";
  check("프롬프트에 질문 영역 고정 블록 포함", promptText.includes("[질문 영역 고정]"));
  check("프롬프트에 사용자 질문 반영", promptText.includes(SAMPLE_INPUT.question));
  check("프롬프트에 카드 3장 모두 반영", (promptText.match(/"positionOrder"/g) || []).length >= 3);
  check("responseMimeType=application/json", requestBody?.generationConfig?.responseMimeType === "application/json");
  check("모델 gemini-2.5-flash 사용", String(okFetch.calls[0]?.url || "").includes("gemini-2.5-flash"));
  // topic-lock 이 실제로 걸렸는지 — "연애" 카테고리인데 재물/커리어 어휘가 핵심 결론으로 들어가면 안 된다는 규칙 문구.
  check("프롬프트에 이탈 방지(topic-lock) 규칙 포함", promptText.includes("최종 결론은 반드시 이 질문 영역에 대한 답이어야 한다"));

  console.log("\n[케이스 2] LLM HTTP 500 → 재시도 후 실패 반환(과금 없음 전제)");
  const errorFetch = mockFetch(() => jsonResponse({}, 500));
  const errorResult = await generateOracleConsultation(SAMPLE_INPUT, { env, fetchImpl: errorFetch });
  check("ok:false", errorResult?.ok === false);
  check("reason 기록", errorResult?.reason === "gemini_http_500", `reason=${errorResult?.reason}`);
  check("최대 3회까지 시도", errorFetch.calls.length >= 1 && errorFetch.calls.length <= 3, `calls=${errorFetch.calls.length}`);

  console.log("\n[케이스 3] LLM 깨진 JSON → 실패 반환");
  const brokenFetch = mockFetch(() => jsonResponse({
    candidates: [{ content: { parts: [{ text: "죄송합니다. JSON이 아닌 자유 서술 응답입니다." }] } }],
  }));
  const brokenResult = await generateOracleConsultation(SAMPLE_INPUT, { env, fetchImpl: brokenFetch });
  check("ok:false", brokenResult?.ok === false);
  check("reason=invalid_json", brokenResult?.reason === "invalid_json", `reason=${brokenResult?.reason}`);

  console.log("\n[케이스 4] Gemini 키 없음 → missing_config 로 즉시 실패(재시도 없음)");
  const noKeyResult = await generateOracleConsultation(SAMPLE_INPUT, { env: {}, fetchImpl: okFetch });
  check("reason=missing_config", noKeyResult?.reason === "missing_config", `reason=${noKeyResult?.reason}`);

  console.log("\n[케이스 5] 분량 미달 → 보강 지시로 재요청, 끝까지 미달이면 결과를 버리지 않는다");
  const shortFetch = mockFetch(() => jsonResponse({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(shortFixtureConsultation()) }] } }],
  }));
  const shortResult = await generateOracleConsultation(SAMPLE_INPUT, { env, fetchImpl: shortFetch });
  // 🔴 이미 결제가 끝난 사용자에게 실패 화면을 주지 않는다 — 짧아도 결과는 나가야 한다.
  check("ok:true (결과 유지)", shortResult?.ok === true, `ok=${shortResult?.ok} reason=${shortResult?.reason}`);
  check("source=llm_short", shortResult?.source === "llm_short", `source=${shortResult?.source}`);
  check("3회까지 재요청", shortFetch.calls.length === 3, `calls=${shortFetch.calls.length}`);
  const retryPrompt = JSON.parse(shortFetch.calls[1]?.init?.body || "{}")?.contents?.[0]?.parts?.[0]?.text || "";
  check("2회차 프롬프트에 보강 지시가 붙는다", retryPrompt.includes("[재작성]"));
  const firstPrompt = JSON.parse(shortFetch.calls[0]?.init?.body || "{}")?.contents?.[0]?.parts?.[0]?.text || "";
  check("1회차에는 보강 지시가 없다", !firstPrompt.includes("[재작성]"));

  console.log("\n[케이스 6] 확대된 출력 스키마와 목표 분량이 프롬프트에 실린다");
  const NEW_KEYS = ["positionAdvice", "cardSynergies", "timeline", "categoryFocus"];
  for (const key of NEW_KEYS) {
    check(`프롬프트에 ${key} 포함`, promptText.includes(key));
  }
  const target3 = resolveOracleConsultationTargetChars(3, {});
  check("프롬프트에 목표 분량 숫자 포함", promptText.includes(String(target3)), `target=${target3}`);
  check("조합 개수 지시 포함", promptText.includes("[조합 개수]"));

  // 🔴 카드 수에 비례하는지 — 값을 손으로 적지 않고 실제 빌더 출력에서 확인한다.
  const targets = [1, 3, 7, 10, 14].map((n) => {
    const cards = Array.from({ length: n }, (_, i) => ({ cardId: SAMPLE_INPUT.cards[i % 3].cardId, orientation: "upright", positionLabel: `P${i}` }));
    const validated = validateOracleConsultationInput({ ...SAMPLE_INPUT, cards });
    return validated.ok ? buildOracleConsultationPrompt({ ...validated.data, locale: "ko" }).targetChars : -1;
  });
  check("목표 분량이 카드 수에 따라 단조 증가", targets.every((v, i) => v > 0 && (i === 0 || v > targets[i - 1])), `targets=${targets.join(",")}`);

  // 🔴 상수를 실측에 결박한다. 목표가 실제 출력보다 한참 낮으면 미달 게이트의 하한도 같이
  // 낮아져 정작 짧은 응답을 못 잡고, 한참 높으면 매번 재요청이 돌아 시간·비용만 늘어난다.
  // 기준값은 2026-08-27 실측(3카드 3,132자 / 14카드 6,128자)이며 ±15% 를 허용한다.
  const MEASURED = [{ cards: 3, chars: 3132 }, { cards: 14, chars: 6128 }];
  for (const row of MEASURED) {
    const target = resolveOracleConsultationTargetChars(row.cards, {});
    const ratio = target / row.chars;
    check(
      `${row.cards}카드 목표가 실측 ${row.chars}자의 ±15% 안에 있다`,
      ratio >= 0.85 && ratio <= 1.15,
      `target=${target} 실측=${row.chars} 비율=${ratio.toFixed(2)}`,
    );
  }

  console.log("\n[케이스 7] measureConsultationChars 는 렌더러가 그리는 필드만 센다");
  const measured = measureConsultationChars(fixtureConsultation());
  check("정상 fixture 가 3카드 목표를 넘는다", measured >= Math.round(target3 * 0.7), `measured=${measured} min=${Math.round(target3 * 0.7)}`);
  check("빈 값은 0", measureConsultationChars(null) === 0 && measureConsultationChars({}) === 0);
  const withHiddenKey = { ...fixtureConsultation(), notRenderedByTheClient: "가".repeat(5000) };
  check("렌더링 안 되는 키는 세지 않는다", measureConsultationChars(withHiddenKey) === measured);
  check("공백은 제외한다", measureConsultationChars({ coreQuestion: "가 나 다" }) === 3);

  console.log("\n[케이스 7-1] 데드라인이 가장 큰 스프레드의 생성 시간을 두 번 담는다");
  // 🔴 데드라인은 한 번의 생성 시간이 아니라 **재시도까지의 예산**이다. 14카드 실측이 25.3초인데
  // 예산이 그 2배 미만이면 첫 시도가 끝나는 순간 남은 시간이 모자라 전송 재시도도 분량 미달
  // 재요청도 못 들어간다(`remainingMs <= 1500` 에서 즉시 break). 상수는 소스에서 직접 읽는다 —
  // 손으로 적은 사본을 두면 본체를 낮춰도 이 검사가 계속 초록불이다.
  const MEASURED_SLOWEST_MS = 25284; // 14카드, 2026-08-27
  const source = readFileSync(new URL("../lib/tarot/oracle-consultation.mjs", import.meta.url), "utf8");
  const deadlineMatch = source.match(/ORACLE_CONSULTATION_TOTAL_TIMEOUT_MS,\s*(\d+)\s*,/);
  check("데드라인 기본값을 소스에서 읽어냈다", Boolean(deadlineMatch), "정규식이 빗나갔다 — 상수 표기가 바뀌었는지 확인할 것");
  if (deadlineMatch) {
    const deadlineMs = Number(deadlineMatch[1]);
    check(
      `데드라인 ${deadlineMs}ms 가 최장 생성(${MEASURED_SLOWEST_MS}ms)의 2배 이상`,
      deadlineMs >= MEASURED_SLOWEST_MS * 2,
      `deadline=${deadlineMs} 필요=${MEASURED_SLOWEST_MS * 2}`,
    );
  }

  console.log("\n[케이스 8] 안전 차단은 JSON 깨짐과 구분되고 재시도하지 않는다");
  // 차단되면 Gemini 는 candidates 를 통째로 비우고 promptFeedback 만 보낸다.
  const blockedFetch = mockFetch(() => jsonResponse({ promptFeedback: { blockReason: "SAFETY" } }));
  const blockedResult = await generateOracleConsultation(SAMPLE_INPUT, { env, fetchImpl: blockedFetch });
  check("reason=blocked_SAFETY", blockedResult?.reason === "blocked_SAFETY", `reason=${blockedResult?.reason}`);
  check("재시도하지 않는다(1회)", blockedFetch.calls.length === 1, `calls=${blockedFetch.calls.length}`);

  const finishBlockedFetch = mockFetch(() => jsonResponse({ candidates: [{ finishReason: "SAFETY", content: { parts: [] } }] }));
  const finishBlockedResult = await generateOracleConsultation(SAMPLE_INPUT, { env, fetchImpl: finishBlockedFetch });
  check("finishReason 차단도 blocked_ 로", finishBlockedResult?.reason === "blocked_SAFETY", `reason=${finishBlockedResult?.reason}`);
  check("finishReason 차단도 1회", finishBlockedFetch.calls.length === 1, `calls=${finishBlockedFetch.calls.length}`);

  const emptyFetch = mockFetch(() => jsonResponse({ candidates: [] }));
  const emptyResult = await generateOracleConsultation(SAMPLE_INPUT, { env, fetchImpl: emptyFetch });
  check("candidates 없음은 empty_candidates", emptyResult?.reason === "empty_candidates", `reason=${emptyResult?.reason}`);

  console.log("\n[케이스 9] 재시도 대상 분류 — 429/5xx 는 다시, 4xx 는 그만");
  const rateLimitedFetch = mockFetch(() => jsonResponse({}, 429));
  const rateLimitedResult = await generateOracleConsultation(SAMPLE_INPUT, { env, fetchImpl: rateLimitedFetch });
  check("429 는 reason 유지", rateLimitedResult?.reason === "gemini_http_429", `reason=${rateLimitedResult?.reason}`);
  check("429 는 재시도한다(3회)", rateLimitedFetch.calls.length === 3, `calls=${rateLimitedFetch.calls.length}`);

  const badRequestFetch = mockFetch(() => jsonResponse({}, 400));
  const badRequestResult = await generateOracleConsultation(SAMPLE_INPUT, { env, fetchImpl: badRequestFetch });
  check("400 은 reason 유지", badRequestResult?.reason === "gemini_http_400", `reason=${badRequestResult?.reason}`);
  check("400 은 재시도하지 않는다(1회)", badRequestFetch.calls.length === 1, `calls=${badRequestFetch.calls.length}`);
}

async function runLive() {
  if (!process.env.GEMINIF_API_KEY) {
    console.error("--live 실행에는 GEMINIF_API_KEY 환경변수가 필요합니다.");
    process.exitCode = 1;
    return;
  }
  console.log("\n[라이브] 실제 Gemini 호출 1회");
  const result = await generateOracleConsultation(SAMPLE_INPUT, { env: process.env });
  const chars = measureConsultationChars(result?.consultation);
  const target = resolveOracleConsultationTargetChars(SAMPLE_INPUT.cards.length, process.env);
  console.log(`ok: ${result?.ok} source: ${result?.source} reason: ${result?.reason || "(없음)"}`);
  console.log(`분량: ${chars}자 (목표 ${target}자, 하한 ${Math.round(target * 0.7)}자)`);
  console.log(JSON.stringify(result?.consultation, null, 2));
  // llm_short 도 성공이다 — 분량 미달이어도 결제한 사용자에게 결과는 나간다.
  check("라이브 생성 성공", result?.ok === true, `ok=${result?.ok} reason=${result?.reason}`);
  check("라이브 분량이 목표 하한 이상(source=llm)", result?.source === "llm", `source=${result?.source} chars=${chars}`);
}

if (LIVE) {
  await runLive();
} else {
  await runMockSuite();
}

if (failures.length) {
  console.error(`\n검증 실패 ${failures.length}건: ${failures.join(" / ")}`);
  process.exit(1);
}
console.log("\n모든 타로 오라클 상담 검증 통과 ✅");
