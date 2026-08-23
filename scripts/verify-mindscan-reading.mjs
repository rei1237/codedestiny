#!/usr/bin/env node
// 마인드 스캔 타로 리딩 회귀 검증
// - mock fetch로 LLM 성공/HTTP 오류/JSON 깨짐 3케이스에서 source·섹션 수·머지 동작을 검증한다.
// - `node scripts/verify-mindscan-reading.mjs --live` 실행 시 실제 GEMINIF_API_KEY로 1회 호출해 실물 품질을 출력한다.
import { buildMindscanReadingPayload } from "../lib/tarot/mindscan-reading.mjs";

const LIVE = process.argv.includes("--live");

const SAMPLE_PAIRS = [
  { slot: 1, mainCardId: 0, subCardId: 22 },
  { slot: 2, mainCardId: 6, subCardId: 30 },
  { slot: 3, mainCardId: 13, subCardId: 45 },
  { slot: 4, mainCardId: 17, subCardId: 51 },
  { slot: 5, mainCardId: 20, subCardId: 63 },
];
const SAMPLE_QUESTION = "헤어진 상대에게서 다시 연락이 올까요?";

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function buildLlmReadingFixture() {
  const sections = Array.from({ length: 7 }, (_, idx) => ({
    slot: idx + 1,
    title: `LLM 섹션 제목 ${idx + 1}`,
    orientation: "upright",
    cardMeaning: `LLM-CARD-${idx + 1} 절벽 끝에 선 인물과 하얀 강아지의 장면이 이 자리의 감정 온도를 비춥니다. 원소의 흐름은 조심스러운 시작을 말하고 있습니다. 상대의 마음은 아직 정리되지 않은 채 방향을 찾는 중입니다.`,
    positionMeaning: `LLM-POS-${idx + 1} 이 포지션은 질문의 축과 직접 연결됩니다. 카드가 놓인 자리의 물음에 답하는 흐름입니다. 이전 포지션의 결을 이어받아 해석했습니다.`,
    emotionalReading: `LLM-EMO-${idx + 1} 상대는 감정이 남아 있으나 표현을 미루는 상태로 읽힙니다. 침묵은 무관심이 아니라 안전을 확인하는 시간에 가깝습니다. 재접근의 문은 부담 없는 접점에서 열립니다.`,
    hiddenMessage: `LLM-HID-${idx + 1} 겉으로 드러나지 않은 결은 그리움과 자존심의 긴장입니다. 확답을 미루는 이유가 여기에 있습니다.`,
    caution: `LLM-CAU-${idx + 1} 반응 지연을 거절로 단정하지 마세요. 추궁의 강도를 높이면 방어가 굳어집니다.`,
    advice: `LLM-ADV-${idx + 1} 짧은 안부와 넉넉한 간격이 지금의 최선입니다. ${idx + 1}번째 자리만의 리듬을 지키세요.`,
    summary: `LLM-SUM-${idx + 1} 질문에 대한 이 자리의 답은 조건부 긍정입니다.`,
    keywords: [`키워드${idx + 1}A`, `키워드${idx + 1}B`, `키워드${idx + 1}C`],
  }));
  return {
    persona: "LLM 마인드 스캔 리더",
    intro: "LLM-INTRO 질문의 핵심은 재회 가능성이 아니라 회복의 조건입니다. 카드를 그 축으로 읽겠습니다.",
    sections,
    summaryCard: {
      emotionalTemperature: 4,
      emotionalTemperatureText: "LLM-TEMP 감정은 식지 않았고 방어만 두꺼워진 온도입니다. 접점이 생기면 빠르게 데워질 수 있습니다.",
      corePsychology: "LLM-PSY 그리움과 자존심이 교차하는 심리입니다. 먼저 움직이는 쪽이 지는 게임이라고 느끼고 있습니다.",
      contactChance: "LLM-CONTACT 조건이 갖춰지면 가벼운 형식으로 연락이 열릴 흐름입니다. 긴 설명보다 짧은 신호가 유효합니다.",
      relationFlow: "LLM-FLOW 관계는 정리보다 재정렬 쪽으로 기울어 있습니다.",
      reApproachChance: "LLM-RE 재접근 여지는 남아 있으나 같은 방식의 반복이면 닫힙니다.",
      recommendedAction: "LLM-ACT 확인보다 안정적인 리듬을 먼저 보여주세요.",
      relationshipStage: "재정렬 단계",
      silenceDriver: "LLM-SIL 침묵의 동인은 상처 재발에 대한 두려움입니다.",
      situationPressure: "LLM-PRESS 주변 시선과 현실 조건이 속도를 늦추고 있습니다.",
      emotionalNeed: "LLM-NEED 안전하다는 확신이 상대의 숨은 욕구입니다.",
    },
    innerHeartSummary: {
      emotionalTemperature: "LLM-IH-TEMP 전체 온도는 미련과 경계가 공존하는 3.5도입니다.",
      hiddenCore: "LLM-IH-CORE 핵심은 아직 정리되지 않은 마음입니다.",
      contactPossibility: "LLM-IH-CONTACT 부담 없는 접점에서 가능성이 열립니다.",
      relationshipRisk: "LLM-IH-RISK 같은 갈등 패턴의 반복이 최대 위험입니다.",
      recommendedAttitude: "LLM-IH-ATT 기다림이 아니라 기준 있는 여유가 필요합니다.",
      finalFlow: "LLM-IH-FINAL 흐름은 조건부 회복 쪽으로 움직입니다.",
      oracleMessage: "LLM-IH-ORACLE 안전하다고 느낄 때 마음은 스스로 문을 엽니다.",
    },
    insightDeck: [
      {
        slot: 1,
        category: "감정 조합",
        title: "LLM 조합 제목 1",
        message: "LLM-DECK-1 두 카드가 만나며 미련의 물결과 방어의 칼끝이 동시에 드러납니다. 감정은 살아 있으나 표현 경로가 막힌 화학작용입니다. 이 조합에서는 속도를 줄이는 쪽이 유리합니다.",
        action: "오늘은 확인 질문 대신 짧은 안부 한 줄만 남기세요.",
        riskLevel: "중간",
      },
    ],
    masterAdvice: "LLM-MASTER 감정을 증명하려 하지 말고 달라진 리듬을 먼저 보여주세요. 그것이 이 스프레드 전체가 가리키는 단 하나의 문입니다.",
    suggestedMessages: [
      { tone: "부담 완화", text: "LLM-MSG-1 잘 지내는지 문득 궁금해서 안부 남겨." },
      { tone: "재접점", text: "LLM-MSG-2 요즘 얘기부터 가볍게 나누고 싶어." },
      { tone: "경계 존중", text: "LLM-MSG-3 네 속도를 존중할게, 편할 때 답해줘." },
    ],
    oneLineConclusion: "LLM-ONE 조건이 달라지면 문은 다시 열립니다.",
    closing: "LLM-CLOSING 오늘의 카드는 조급함이 아니라 기준을 요구합니다. 그 기준이 관계를 지킵니다.",
  };
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
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

async function runMockSuite() {
  const env = { GEMINIF_API_KEY: "test-key" };

  console.log("\n[케이스 1] LLM 정상 JSON 응답");
  const fixture = buildLlmReadingFixture();
  const okFetch = mockFetch(() => jsonResponse({
    candidates: [{ content: { parts: [{ text: JSON.stringify(fixture) }] } }],
  }));
  const okReading = await buildMindscanReadingPayload(SAMPLE_PAIRS, {
    question: SAMPLE_QUESTION,
    env,
    fetchImpl: okFetch,
  });
  check("source가 llm", okReading?.source === "llm", `source=${okReading?.source} errors=${JSON.stringify(okReading?.validation?.errors || [])}`);
  check("섹션 7개", Array.isArray(okReading?.sections) && okReading.sections.length === 7);
  check("1번 섹션에 LLM 텍스트 반영", String(okReading?.sections?.[0]?.cardMeaning || "").includes("LLM-CARD-1"));
  check("7번 섹션에 LLM 텍스트 반영", String(okReading?.sections?.[6]?.emotionalReading || "").includes("LLM-EMO-7"));
  check("insightDeck에 LLM 텍스트 반영", String(okReading?.insightDeck?.[0]?.headline || "").includes("LLM-DECK-1"));
  check("summaryCard에 LLM 텍스트 반영", String(okReading?.summaryCard?.corePsychology || "").includes("LLM-PSY"));
  check("validation 통과", okReading?.validation?.ok === true, JSON.stringify(okReading?.validation?.errors || []));

  const requestBody = JSON.parse(okFetch.calls[0]?.init?.body || "{}");
  const promptText = requestBody?.contents?.[0]?.parts?.[0]?.text || "";
  check("프롬프트에 7개 포지션 전달", (promptText.match(/"positionTitle"/g) || []).length === 7);
  check("프롬프트에 insightSeeds 포함", promptText.includes("insightSeeds"));
  check("responseMimeType=application/json", requestBody?.generationConfig?.responseMimeType === "application/json");
  check("모델 gemini-2.5-flash 사용", String(okFetch.calls[0]?.url || "").includes("gemini-2.5-flash"));
  check("프롬프트에 말·행동·침묵·속도 분리 규칙", promptText.includes("말·행동·침묵·관계 거리·다가갈 속도"));
  check("프롬프트에 보조 카드 역할 규칙", promptText.includes("보조 카드는 메인 카드의 반복이 아니라"));
  check("프롬프트에 확정 표현 금지", promptText.includes("100%") && promptText.includes("운명이다"));

  console.log("\n[케이스 2] LLM HTTP 500 → 룰엔진 폴백");
  const errorFetch = mockFetch(() => jsonResponse({}, 500));
  const errorReading = await buildMindscanReadingPayload(SAMPLE_PAIRS, {
    question: SAMPLE_QUESTION,
    env,
    fetchImpl: errorFetch,
  });
  check("source가 rule-engine", errorReading?.source === "rule-engine", `source=${errorReading?.source}`);
  check("llmFailReason 기록", errorReading?.validation?.llmFailReason === "gemini_http_500", `reason=${errorReading?.validation?.llmFailReason}`);
  check("최대 2회 재시도 수행(총 3회 호출)", errorFetch.calls.length === 3, `calls=${errorFetch.calls.length}`);
  check("폴백 섹션 7개", Array.isArray(errorReading?.sections) && errorReading.sections.length === 7);
  const fallbackText = (errorReading?.sections || []).map((section) => [section.cardMeaning, section.positionMeaning, section.emotionalReading, section.hiddenMessage, section.caution, section.advice].join(" ")).join(" ");
  check("폴백이 보조 카드 조합을 반영", fallbackText.includes("보조 카드"));
  check("폴백 포지션별 조언이 구분됨", new Set((errorReading?.sections || []).map((section) => section.advice)).size > 1);
  check("폴백 결정론 표현 완화", !/(100\s*%|무조건|반드시|운명이다)/.test(fallbackText));

  console.log("\n[케이스 3] LLM 깨진 JSON → 룰엔진 폴백");
  const brokenFetch = mockFetch(() => jsonResponse({
    candidates: [{ content: { parts: [{ text: "죄송합니다. JSON이 아닌 자유 서술 응답입니다." }] } }],
  }));
  const brokenReading = await buildMindscanReadingPayload(SAMPLE_PAIRS, {
    question: SAMPLE_QUESTION,
    env,
    fetchImpl: brokenFetch,
  });
  check("source가 rule-engine", brokenReading?.source === "rule-engine", `source=${brokenReading?.source}`);
  check("llmFailReason=invalid_json", brokenReading?.validation?.llmFailReason === "invalid_json", `reason=${brokenReading?.validation?.llmFailReason}`);

  console.log("\n[케이스 4] locale=en → 프롬프트에 영어 출력 지시문 포함(실호출 없음, mock)");
  const enFixtureFetch = mockFetch(() => jsonResponse({
    candidates: [{ content: { parts: [{ text: JSON.stringify(buildLlmReadingFixture()) }] } }],
  }));
  await buildMindscanReadingPayload(SAMPLE_PAIRS, {
    question: SAMPLE_QUESTION,
    env,
    fetchImpl: enFixtureFetch,
    locale: "en",
  });
  const enRequestBody = JSON.parse(enFixtureFetch.calls[0]?.init?.body || "{}");
  const enPromptText = enRequestBody?.contents?.[0]?.parts?.[0]?.text || "";
  check("영어 지시문 포함", enPromptText.includes("Write the ENTIRE response in English only."));
  check("한국어 하드코딩 지시를 무효화한다는 override 포함", enPromptText.includes("overrides every other language instruction above"));

  console.log("\n[케이스 5] locale 미지정 → 기존 한국어 전용 동작과 100% 동일(회귀 없음)");
  const koFetch = mockFetch(() => jsonResponse({
    candidates: [{ content: { parts: [{ text: JSON.stringify(buildLlmReadingFixture()) }] } }],
  }));
  await buildMindscanReadingPayload(SAMPLE_PAIRS, {
    question: SAMPLE_QUESTION,
    env,
    fetchImpl: koFetch,
  });
  const koRequestBody = JSON.parse(koFetch.calls[0]?.init?.body || "{}");
  const koPromptText = koRequestBody?.contents?.[0]?.parts?.[0]?.text || "";
  check("locale 미지정 시 출력 언어 지시문 없음(기존 프롬프트 불변)", !koPromptText.includes("[OUTPUT LANGUAGE"));
}

async function runLive() {
  if (!process.env.GEMINIF_API_KEY) {
    console.error("--live 실행에는 GEMINIF_API_KEY 환경변수가 필요합니다.");
    process.exitCode = 1;
    return;
  }
  console.log("\n[라이브] 실제 Gemini 호출 1회");
  const reading = await buildMindscanReadingPayload(SAMPLE_PAIRS, {
    question: SAMPLE_QUESTION,
    env: process.env,
  });
  console.log(`source: ${reading?.source}`);
  console.log(`llmFailReason: ${reading?.validation?.llmFailReason || "(없음)"}`);
  console.log(`validation.errors: ${JSON.stringify(reading?.validation?.errors || [])}`);
  console.log(`intro: ${reading?.intro}`);
  (reading?.sections || []).forEach((section, idx) => {
    console.log(`\n--- 섹션 ${idx + 1}: ${section.title} (${section.cardNameKo}) ---`);
    console.log(`cardMeaning: ${section.cardMeaning}`);
    console.log(`emotionalReading: ${section.emotionalReading}`);
    console.log(`advice: ${section.advice}`);
  });
  console.log(`\nmasterAdvice: ${reading?.masterAdvice}`);
  console.log(`oneLineConclusion: ${reading?.oneLineConclusion}`);
  check("라이브 source가 llm", reading?.source === "llm", `source=${reading?.source} reason=${reading?.validation?.llmFailReason}`);
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
console.log("\n모든 마인드스캔 리딩 검증 통과 ✅");
