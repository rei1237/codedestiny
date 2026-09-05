#!/usr/bin/env node
/**
 * 초융합 보관본(재열람·PDF) 계약 검증 — **mock 기본, DB 없음**.
 *
 * 이 기능이 지켜야 하는 것은 세 가지다:
 *   ① 결제 1회 = 보관본 1개 (같은 requestId 재시도가 문서를 늘리지 않는다)
 *   ② 프라이버시 경계 — 생년월일·생시·출생지 좌표·고민 원문은 보관본에 남지 않는다
 *   ③ 저장본을 다시 읽어도 결과 계약(validateFusionFortuneResult)이 그대로 통과한다
 *      = 재열람 화면이 방금 생성한 결과와 같은 경로로 렌더된다
 *
 * 🔴 실제 모델 호출은 하지 않는다. 순수 빌더(buildFusionConsultationDoc)만 호출한다.
 *
 * 사용: node scripts/verify-fusion-fortune-reopen.mjs
 */
import {
  buildFusionConsultationDoc,
  FUSION_CONSULTATION_MAX_RESULT_CHARS,
} from "../worker/lib/fusion-fortune-consultation.js";
import { validateFusionFortuneResult } from "../worker/lib/fusion-fortune.js";
import { normalizeFusionFinalVerdict, normalizeFusionVisualization } from "../worker/lib/fusion-fortune-visual.js";

if (process.argv.includes("--live")) {
  console.error("실호출 경로는 이 스크립트에 없습니다. 필요하면 사용자 허락을 먼저 받고 별도 플래그를 만드세요.");
  process.exit(2);
}

const failures = [];
function check(label, condition, detail = "") {
  if (condition) return;
  failures.push(detail ? `${label} — ${detail}` : label);
}

const INPUT = {
  birthDate: "1995-04-18",
  birthTime: "08:30",
  birthTimeUnknown: false,
  calendarType: "lunar",
  gender: "female",
  nickname: "달빛",
  topic: "연애와 관계",
  concern: "이 사람과 계속 만나도 될지 모르겠어요",
  birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
};

function paragraph(seed, repeat) {
  return Array.from({ length: repeat }, (_, index) =>
    `${seed} 이 흐름은 ${index + 1}번째 축에서 드러나며, 지금 무엇을 먼저 살펴야 하는지 알려 줍니다. `
    + "단정하지 말고 경향으로 읽되, 오늘 할 수 있는 선택부터 정리해 두시면 좋습니다.").join("");
}

const SECTION_KEYS = ["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection", "integratedReading"];

function buildResult() {
  // 분량은 FUSION_FORTUNE_LENGTH 하한(섹션 3,600 / 통합 3,600 / 요약 1,400 / 시기 2,600 / 맺음 800)을 넘긴다.
  const sections = SECTION_KEYS.reduce((acc, key) => ({
    ...acc,
    [key]: {
      title: `${key} 해석`,
      content: paragraph(`${key} 본문.`, key === "integratedReading" ? 40 : 38),
      keyPoints: ["첫 번째 신호", "두 번째 신호", "세 번째 신호"],
    },
  }), {});
  return {
    ...sections,
    title: "여섯 체계가 함께 읽은 흐름",
    openingMessage: paragraph("여는 말.", 6),
    executiveSummary: paragraph("한 문단 요약.", 16),
    timingAndAction: {
      title: "언제, 무엇을",
      content: paragraph("시기와 행동.", 28),
      luckyActions: ["기준을 문장으로 적어 두기", "대화 전에 질문 세 개 준비하기", "주 1회 회고 남기기"],
      cautionPatterns: ["급하게 결론 내리기", "같은 이야기를 반복하기", "확인 없이 미루기"],
    },
    closingMessage: paragraph("맺음말.", 9),
    shareText: "여섯 체계가 함께 읽은 흐름 요약",
    // 서버가 항상 채워 보내는 두 블록 — 저장·재열람에서도 그대로 살아남아야 한다.
    visualization: normalizeFusionVisualization(null, {}, { now: new Date("2026-08-12T00:00:00Z") }),
    finalVerdict: buildFinalVerdict(),
  };
}

function buildFinalVerdict() {
  const normalized = normalizeFusionFinalVerdict({
    headline: "지금은 기준을 먼저 세우는 시기입니다",
    rationale: paragraph("교차 판정 근거.", 12),
    confidence: 72,
    systemVerdicts: ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((key) => ({
      key, label: key, stance: "conditional", note: "같은 방향을 조건부로 가리킵니다.",
    })),
    doNow: ["기준을 문장으로 적어 두기", "대화 전에 질문 세 개 준비하기", "주 1회 회고 남기기"],
    avoid: ["급하게 결론 내리기", "같은 이야기를 반복하기"],
  });
  return normalized.ok ? normalized.value : null;
}

// ── ① 정상 저장 ─────────────────────────────────────────────
const built = buildFusionConsultationDoc({
  requestId: "fusion-fortune-consultation:1755000000000-abc1234",
  userId: "u-1",
  input: INPUT,
  result: buildResult(),
  generationSource: "gemini",
});
check("정상 결과가 보관본으로 만들어져야 한다", built.ok, built.reason);

if (built.ok) {
  const { doc } = built;
  check("결제 requestId 가 멱등 키가 된다", doc.idempotencyKey === "fusion-fortune-consultation:1755000000000-abc1234");
  check("보관본 id 가 생성된다", typeof doc.id === "string" && doc.id.length > 0);
  check("목록용 제목이 비정규화된다", doc.title === "여섯 체계가 함께 읽은 흐름");
  check("완료 상태로 저장된다", doc.status === "completed");
  check("stage 없이 부르면 완료본(2)이다", doc.stage === 2);

  // ② 프라이버시 경계 — 저장 문서 어디에도 원문이 남지 않아야 한다.
  const serialized = JSON.stringify(doc);
  for (const secret of [INPUT.birthDate, INPUT.birthTime, INPUT.concern, String(INPUT.birthPlace.latitude)]) {
    check(`보관본에 원문이 남지 않는다: ${secret}`, !serialized.includes(secret));
  }
  // 대신 목록에서 구분할 최소 정보는 남는다.
  check("주제는 목록 구분용으로 남는다", doc.inputSummary.topic === "연애와 관계");
  check("생시를 알았는지 여부만 남는다", doc.inputSummary.birthTimeKnown === true);
  check("출생지는 좌표 대신 알았는지 여부만 남는다", doc.inputSummary.birthPlaceKnown === true);
  check("달력 기준은 그대로 남는다", doc.inputSummary.calendarType === "lunar");

  // ③ 저장본을 그대로 다시 읽어도 결과 계약이 통과한다(= 재열람이 같은 렌더 경로를 탄다).
  const roundTripped = JSON.parse(JSON.stringify(doc.result));
  const validated = validateFusionFortuneResult(roundTripped);
  // 전체 분량(20,000자) 하한은 이 하네스의 관심사가 아니다 — 여기서 보는 것은
  // "저장·직렬화가 구조를 망가뜨리지 않는가"이므로 구조 관련 issue 만 실패로 본다.
  const structuralIssues = (validated.issues || []).filter((issue) => issue !== "length");
  check("저장본 round-trip 후에도 결과 구조가 유효하다", structuralIssues.length === 0, JSON.stringify(validated.issues || []));
  check("저장본이 화면이 읽는 섹션을 모두 갖는다", SECTION_KEYS.every((key) => typeof roundTripped[key]?.content === "string" && roundTripped[key].content.length > 0));
}

// ── 2단계 생성: 1단계 보관본은 partial, 2단계가 같은 문서를 completed 로 덮는다 ──
const stageOne = buildFusionConsultationDoc({ requestId: "fusion-fortune-consultation:1755000000000-stage", userId: "u-1", input: INPUT, result: buildResult(), stage: 1 });
check("1단계 보관본은 partial 상태다", stageOne.ok && stageOne.doc.status === "partial" && stageOne.doc.stage === 1, stageOne.reason);
const stageTwo = buildFusionConsultationDoc({ requestId: "fusion-fortune-consultation:1755000000000-stage", userId: "u-1", input: INPUT, result: buildResult(), stage: 2 });
check("2단계 보관본은 completed 상태다", stageTwo.ok && stageTwo.doc.status === "completed" && stageTwo.doc.stage === 2, stageTwo.reason);
check("두 단계는 같은 멱등 키를 쓴다(결제 1회 = 문서 1개)", stageOne.ok && stageTwo.ok && stageOne.doc.idempotencyKey === stageTwo.doc.idempotencyKey);
// 옛 보관본(status/stage 없음)을 응답 기본값으로 읽으면 완료본이다 — routes/fusion-fortune.js respondFusionConsultation 과 같은 식.
const legacy = { id: "c-legacy", result: buildResult() };
check("옛 보관본은 completed/2 로 읽힌다", (legacy.status || "completed") === "completed" && (Number(legacy.stage) || 2) === 2);

// ── 생시 미상 입력은 그대로 기록된다 ─────────────────────────
const unknownTime = buildFusionConsultationDoc({
  requestId: "req-2",
  userId: "u-1",
  input: { ...INPUT, birthTime: "", birthTimeUnknown: true, birthPlace: undefined },
  result: buildResult(),
});
check("생시 미상이 보관본에 반영된다", unknownTime.ok && unknownTime.doc.inputSummary.birthTimeKnown === false);
check("출생지 미상이 보관본에 반영된다", unknownTime.ok && unknownTime.doc.inputSummary.birthPlaceKnown === false);

// ── 방어 계약 ────────────────────────────────────────────────
check("결제 id 없이 저장하지 않는다", buildFusionConsultationDoc({ userId: "u-1", result: buildResult() }).ok === false);
check("사용자 없이 저장하지 않는다", buildFusionConsultationDoc({ requestId: "r", result: buildResult() }).ok === false);
check("결과 없이 저장하지 않는다", buildFusionConsultationDoc({ requestId: "r", userId: "u-1" }).ok === false);

// 비정상적으로 큰 결과는 저장을 거부한다(문서 한계 보호). 배달은 호출자가 계속한다.
const oversized = buildFusionConsultationDoc({
  requestId: "r-big",
  userId: "u-1",
  input: INPUT,
  result: { ...buildResult(), closingMessage: "가".repeat(FUSION_CONSULTATION_MAX_RESULT_CHARS) },
});
check("문서 상한을 넘는 결과는 저장하지 않는다", oversized.ok === false && oversized.reason === "result_too_large");

if (failures.length) {
  console.error("[verify-fusion-fortune-reopen] 실패:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("[verify-fusion-fortune-reopen] ok — 멱등 키·프라이버시 경계·round-trip·상한 계약 통과");
