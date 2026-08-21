#!/usr/bin/env node
// 타로 오라클 상담(lib/tarot/oracle-consultation.mjs) 회귀 검증
// - mock fetch로 카드 검증·LLM 성공/HTTP 오류/JSON 깨짐 케이스에서 source·필드·재시도 동작을 검증한다.
// - `node scripts/verify-oracle-consultation.mjs --live` 실행 시 실제 GEMINIF_API_KEY로 1회 호출해 실물 품질을 출력한다.
import { generateOracleConsultation, validateOracleConsultationInput } from "../lib/tarot/oracle-consultation.mjs";

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

function fixtureConsultation() {
  return {
    coreQuestion: "지금 상대의 마음이 어디로 향해 있는지가 핵심입니다.",
    bigPicture: "전체 흐름은 과거의 선택이 현재의 망설임을 거쳐 새로운 시작으로 이어집니다.",
    positionReadings: [
      { positionOrder: 1, headline: "과거의 진심", reading: "연인 카드는 두 사람이 가치관을 나누며 진심으로 이어졌던 시기를 보여줍니다." },
      { positionOrder: 2, headline: "흔들리는 현재", reading: "역방향 바보는 지금 확신 없이 결정을 미루는 상태를 나타냅니다." },
      { positionOrder: 3, headline: "완성으로 가는 미래", reading: "세계 카드는 매듭짓고 다음 단계로 나아갈 가능성을 보여줍니다." },
    ],
    tension: "과거의 확신과 현재의 망설임이 부딪히지만, 그 긴장이 결국 성숙한 선택으로 이어집니다.",
    caution: "상대의 침묵을 무관심으로 단정하지 마세요.",
    actions: ["먼저 가벼운 안부를 건네 보세요.", "확답을 재촉하지 말고 여지를 남겨 두세요."],
    closingLine: "마음이 아직 그 자리에 있다면, 서두르지 않아도 길은 다시 이어집니다.",
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
}

async function runLive() {
  if (!process.env.GEMINIF_API_KEY) {
    console.error("--live 실행에는 GEMINIF_API_KEY 환경변수가 필요합니다.");
    process.exitCode = 1;
    return;
  }
  console.log("\n[라이브] 실제 Gemini 호출 1회");
  const result = await generateOracleConsultation(SAMPLE_INPUT, { env: process.env });
  console.log(`ok: ${result?.ok} source: ${result?.source} reason: ${result?.reason || "(없음)"}`);
  console.log(JSON.stringify(result?.consultation, null, 2));
  check("라이브 source가 llm", result?.ok === true && result?.source === "llm", `ok=${result?.ok} reason=${result?.reason}`);
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
