#!/usr/bin/env node
/**
 * 초융합 "배달 바닥" 계약 검증 — **mock 기본, LLM 실호출 없음**.
 *
 * 왜 있는가: 결제는 생성 **전에** 끝난다. 그런데 예전에는 결과 검증에 실패하면 최후 폴백까지
 * **같은 검증기**를 통과해야 배달됐다(`buildValidatedFusionFallback`). 검증기에는 입력에 종속적인
 * 판정(분량 밴드·문장 반복·섹션 깊이)이 섞여 있어서, 그중 하나가 그 사용자의 컨텍스트에서 걸리면
 * **본 결과도 폴백도 같은 이유로 탈락**하고 같은 requestId 재시도가 영원히 같은 자리에서 죽었다.
 * 사용자 화면에는 "결과를 준비하지 못했어요"만 남고 30,000원은 이미 결제된 뒤였다.
 *
 * 이 스크립트가 고정하는 계약은 넷이다:
 *   ① 품질만 미달한 결과는 `tier:"degraded"` 로 **배달된다**(0을 받는 경로가 없다)
 *   ② 안전 위반(개인정보 노출·타로 환각·필수 키 누락)은 **여전히 반려된다**
 *   ③ 첫 위반만 돌려주는 기존 `validateFusionFortuneResult` 계약은 그대로다(가드 단언이 이 모양을 본다)
 *   ④ 🔴 **입력 조합 전수** — 생시 유무 × 출생지 유무 4조합 모두에서 배달된다
 *
 * ④ 를 뒤늦게 넣은 이유(2026-09-03 실사고): 이 스크립트의 유일한 입력 `BASE_INPUT` 이 생시와
 * 출생지를 **항상** 채우고 있었고 `OPTIONS` 도 `birthTimeKnown/birthPlaceKnown` 을 손으로 `true` 로
 * 박아 둬서, 나머지 세 조합을 한 번도 밟지 않았다. 그 사이 과장 탐지 정규식이 우리 시스템 자신의
 * 면책 문장("상승궁·하우스는 단정하지 않고…")을 과장으로 오인해 **생시/출생지 미상 입력 3조합이
 * 전부 영구 실패**하고 있었다 — 결정론 폴백까지 같은 게이트에 걸려 재시도해도 같은 자리에서 죽었다.
 * 그래서 조합 목록은 손으로 쓴 배열이 아니라 `[true,false] × [true,false]` 전개로 만든다.
 * 그리고 검사가 통째로 무력화되지 않았음을 **양방향**으로 고정한다 — 진짜 과장 문장을 주입하면
 * 해당 조합에서 `birth_*_overclaim` 이 여전히 나와야 한다.
 *
 * 🔴 실제 모델 호출은 하지 않는다. providerCall 을 주입해 가짜 응답만 흘린다
 *    (정본 패턴: scripts/verify-fusion-fortune-quality.mjs).
 *
 * 사용: node scripts/verify-fusion-fortune-delivery-floor.mjs
 */
import {
  buildFusionFortuneContext,
  countFusionFortuneVisibleText,
  evaluateFusionFortuneResult,
  generateFusionFortuneWithMockLLM,
  generateFusionFortuneWithRealLLM,
  resolveFusionFortuneDelivery,
  validateFusionFortuneResult,
} from "../worker/lib/fusion-fortune.js";
import { FUSION_FORTUNE_LENGTH, FUSION_SECTION_GROUP_SPECS } from "../worker/lib/fusion-fortune-prompt.js";
import { FUSION_TIMELINE_MONTHS, FUSION_VISUAL_SYSTEMS } from "../worker/lib/fusion-fortune-visual.js";

if (process.argv.includes("--live")) {
  console.error("실호출 경로는 이 스크립트에 없습니다. 필요하면 사용자 허락을 먼저 받고 별도 플래그를 만드세요.");
  process.exit(2);
}

const failures = [];
function check(label, condition, detail = "") {
  if (condition) return;
  failures.push(detail ? `${label} — ${detail}` : label);
}

const BASE_INPUT = {
  birthDate: "1995-04-18",
  birthTime: "08:30",
  calendarType: "solar",
  gender: "female",
  topic: "삶의 전반적인 흐름",
  concern: "비공개 고민",
  birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
};

/** 실제 계산기를 돌리지 않고 어댑터 결과만 흉내낸다(오프라인·결정론). */
const ADAPTERS = {
  saju: async () => ({ dayMaster: "갑목", currentFlowSummary: "정리한 기준을 행동으로 옮기는 흐름", evidence: ["saju.dayMaster"] }),
  ziwei: async () => ({ lifePalaceSummary: "명궁의 역할을 정리하는 흐름", topicPalaceSummary: "관록궁의 책임을 조율하는 흐름", evidence: ["ziwei.lifePalace"] }),
  vedic: async () => ({ moonSignSummary: "달의 감정 리듬", nakshatraSummary: "반복되는 회복 습관", innerRhythm: "감정의 속도를 알아차리는 리듬", evidence: ["vedic.nakshatra"] }),
  sukuyo: async () => ({ birthMansion: "묘숙", relationshipPattern: "관계의 거리를 천천히 맞추는 흐름", evidence: ["sukuyo.birthMansion"] }),
  astrology: async () => ({ sunSummary: "태양의 목표 방향", moonSummary: "달의 정서적 안정", currentMoodSummary: "기준을 먼저 확인하는 흐름", evidence: ["astrology.sun"] }),
  tarot: async () => ({
    spreadType: "fusion_six_system_bridge",
    spreadId: "fusion_six_system_bridge",
    symbolicMessage: "여섯 장을 현실 행동으로 연결합니다.",
    cards: ["바보", "마법사", "여사제", "여황제", "황제", "연인"].map((name, index) => ({
      name, orientation: "upright", positionKey: `position_${index}`, meaningSummary: `${name}의 선택 상징`,
    })),
  }),
};

const ENV = {
  NODE_ENV: "staging",
  ENABLE_FUSION_FORTUNE_REAL_LLM: "true",
  ALLOW_FUSION_FORTUNE_REAL_LLM: "true",
  GEMINI_API_KEY: "verify-only-not-a-real-key",
};

/** 입력 조합 하나를 실제 컨텍스트까지 세운다. 🔴 옵션은 손으로 박지 않고 컨텍스트에서 파생한다
 *  — 프로덕션의 `fusionValidationOptions` 와 같은 자리에서 같은 값을 읽어야 조합이 진짜로 재현된다. */
async function buildShape({ birthTimeKnown, birthPlaceKnown }) {
  const input = { ...BASE_INPUT };
  if (!birthTimeKnown) { input.birthTime = ""; input.birthTimeUnknown = true; }
  if (!birthPlaceKnown) delete input.birthPlace;
  const outcome = await buildFusionFortuneContext(input, { adapters: ADAPTERS });
  if (!outcome.ok) {
    console.error(`[verify-fusion-fortune-delivery-floor] context failed: ${outcome.errorCode} (${outcome.failedSystem}) — 생시=${birthTimeKnown} 장소=${birthPlaceKnown}`);
    process.exit(1);
  }
  const shapeContext = outcome.context;
  return {
    label: `생시${birthTimeKnown ? "O" : "X"} 장소${birthPlaceKnown ? "O" : "X"}`,
    input,
    context: shapeContext,
    cards: shapeContext.tarotSpread.cards,
    options: {
      birthTimeKnown: shapeContext.birthTimeKnown === true,
      birthPlaceKnown: shapeContext.birthPlaceKnown === true,
      sensitiveValues: [input.birthDate, input.birthTime, input.concern],
      selectedTarotCards: shapeContext.tarotSpread.cards,
    },
  };
}

const baseShape = await buildShape({ birthTimeKnown: true, birthPlaceKnown: true });
const context = baseShape.context;
const cards = baseShape.cards;
const OPTIONS = baseShape.options;

// ── 기준선: 결정론 폴백 그 자체 ──────────────────────────────────────
// 이것이 "모델이 통째로 죽었을 때 사용자가 받는 글"이다. 여기가 무너지면 바닥이 없다.
const baseline = await generateFusionFortuneWithMockLLM({ context, now: new Date("2026-08-16T00:00:00Z") });
const baselineEval = evaluateFusionFortuneResult(baseline, OPTIONS);
check("결정론 폴백은 그 자체로 계약을 통과한다", baselineEval.issues.length === 0, baselineEval.issues.join(","));

// 🔴 `missing_selected_tarot_card` 를 안전(차단)으로 분류해 둔 근거를 여기서 실측한다.
//    폴백이 서버가 뽑은 여섯 장을 하나라도 빠뜨리면 그 분류가 곧 새로운 막다른 길이 된다.
const tarotText = `${baseline.tarotSection?.title || ""} ${baseline.tarotSection?.content || ""} ${(baseline.tarotSection?.keyPoints || []).join(" ")}`;
const missingCard = cards.map((card) => card.name).find((name) => !tarotText.includes(name));
check("결정론 폴백이 선택된 여섯 장을 모두 언급한다", !missingCard, `누락: ${missingCard || ""}`);

// ── ① 품질만 미달하면 배달된다 ────────────────────────────────────────
const shortSection = { ...baseline, sajuSection: { ...baseline.sajuSection, content: "짧은 해석" } };
const shortSectionDelivery = resolveFusionFortuneDelivery(shortSection, OPTIONS);
check("섹션 깊이 미달은 강등 배달된다", shortSectionDelivery.deliverable === true && shortSectionDelivery.tier === "degraded",
  `deliverable=${shortSectionDelivery.deliverable} tier=${shortSectionDelivery.tier}`);
check("강등 배달은 사유를 남긴다", (shortSectionDelivery.issues || []).includes("section_depth") && Boolean(shortSectionDelivery.qualityNotice));
// ③ 기존 계약은 그대로 — 가드가 보는 모양이 바뀌면 안 된다.
check("같은 결과를 엄격 계약은 여전히 반려한다", validateFusionFortuneResult(shortSection, OPTIONS).ok === false);

// hasRepeatedLongSentence 는 섹션 **안**의 중복을 한 번으로 세고 70자 이상만 본다.
// 그래서 같은 장문을 서로 다른 세 섹션에 옮겨 붙여야 실제 판정을 재현한다.
const repeatedSentence = "검증기는 같은 문장이 여러 섹션에 반복되는 것을 분량 채우기로 보고 그 결과를 유료로 내보내지 않으며 다시 쓰도록 되돌립니다.";
const repeated = { ...baseline, executiveSummary: `${repeatedSentence} ${baseline.executiveSummary}` };
for (const key of ["sajuSection", "ziweiSection"]) {
  repeated[key] = { ...baseline[key], content: `${repeatedSentence} ${baseline[key].content}` };
}
const repeatedDelivery = resolveFusionFortuneDelivery(repeated, OPTIONS);
check("문장 반복은 강등 배달된다", repeatedDelivery.deliverable === true && repeatedDelivery.tier === "degraded",
  `tier=${repeatedDelivery.tier} issues=${(repeatedDelivery.issues || []).join(",")}`);

// 총 분량 하한 미달 — 예전에는 폴백도 이 밴드를 못 맞추면 사용자가 0을 받았다.
const trimmed = { ...baseline };
for (const key of ["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection"]) {
  trimmed[key] = { ...baseline[key], content: baseline[key].content.slice(0, FUSION_FORTUNE_LENGTH.section) };
}
const trimmedDelivery = resolveFusionFortuneDelivery(trimmed, OPTIONS);
check("총 분량 미달도 배달을 막지 않는다", trimmedDelivery.deliverable === true && trimmedDelivery.tier === "degraded",
  `length=${countFusionFortuneVisibleText(trimmed)} tier=${trimmedDelivery.tier}`);

// ── ② 안전 위반은 여전히 반려된다 ─────────────────────────────────────
const leaked = { ...baseline, openingMessage: `${baseline.openingMessage} ${BASE_INPUT.birthDate}` };
const leakedDelivery = resolveFusionFortuneDelivery(leaked, OPTIONS);
check("개인정보 노출은 배달하지 않는다", leakedDelivery.deliverable === false && leakedDelivery.tier === "rejected",
  `tier=${leakedDelivery.tier}`);

const hallucinated = { ...baseline, tarotSection: { ...baseline.tarotSection, content: `${baseline.tarotSection.content} 은둔자 카드가 함께 나왔습니다.` } };
const hallucinatedDelivery = resolveFusionFortuneDelivery(hallucinated, OPTIONS);
check("뽑지 않은 타로 카드는 배달하지 않는다", hallucinatedDelivery.deliverable === false && hallucinatedDelivery.tier === "rejected",
  `issues=${(hallucinatedDelivery.issues || []).join(",")}`);

const missingKey = { ...baseline, closingMessage: "" };
check("필수 키 누락은 배달하지 않는다", resolveFusionFortuneDelivery(missingKey, OPTIONS).deliverable === false);

// 🔴 안전 위반이 품질 미달과 **함께** 왔을 때 품질 쪽으로 새지 않아야 한다.
//    예전 검증기는 첫 위반에서 멈춰서, 앞선 품질 위반이 뒤의 안전 위반을 가렸다.
const bothIssues = { ...leaked, sajuSection: { ...baseline.sajuSection, content: "짧은 해석" } };
const bothDelivery = resolveFusionFortuneDelivery(bothIssues, OPTIONS);
check("품질 미달이 안전 위반을 가리지 않는다", bothDelivery.deliverable === false && bothDelivery.tier === "rejected",
  `tier=${bothDelivery.tier} issues=${(bothDelivery.issues || []).join(",")}`);

// ── 생성기 전체 경로: 네 묶음이 전부 분량 미달로 와도 사용자는 글을 받는다 ──
function filler(seed, minChars) {
  let value = "";
  let index = 0;
  while (value.length < minChars) {
    value += `${seed} 근거 ${index}번은 서버가 확정한 값에서 출발해 지금의 선택 기준을 설명하고, 생활에서 그것이 드러나는 장면과 이번 주에 해볼 행동을 함께 담습니다. `;
    index += 1;
  }
  return value.trim();
}

/** 계약을 만족하되 목표 분량의 절반만 쓰는 그룹 응답 — 실제 Gemini 미달 케이스를 흉내낸다. */
function shortGroupPayload(group, groupCards = cards) {
  const payload = {};
  for (const key of group.keys) {
    if (key === "visualization") {
      payload.visualization = {
        systemScores: FUSION_VISUAL_SYSTEMS.map((system, index) => ({ key: system.key, score: 52 + index * 6, note: "신호 강도" })),
        monthlyTimeline: Array.from({ length: FUSION_TIMELINE_MONTHS }, (_, index) => ({ label: `${index + 1}월`, intensity: 48 + (index % 5) * 9, note: `${index + 1}번째 달에 점검할 한 가지를 정합니다.` })),
        crossChecks: {
          aligned: [{ theme: "속도 조절", systems: ["saju", "ziwei"], meaning: "두 체계가 같은 방향을 가리키므로 우선순위로 둡니다." }],
          divergent: [{ theme: "표현의 강도", systems: ["astrology", "sukuyo"], meaning: "상황에 따라 어느 쪽을 따를지 나눠 둡니다." }],
        },
      };
      continue;
    }
    if (key === "finalVerdict") {
      payload.finalVerdict = {
        headline: "기준을 문장으로 적어 두고 한 걸음씩 확인하세요.",
        confidence: 68,
        systemVerdicts: FUSION_VISUAL_SYSTEMS.map((system) => ({ key: system.key, stance: "conditional", note: "조건을 확인한 뒤 움직이라는 신호입니다." })),
        rationale: filler("최종 판정 근거.", FUSION_FORTUNE_LENGTH.finalVerdictRationale + 60),
        doNow: ["기준을 문장으로 적기", "대화 전 질문 세 개 준비", "주 1회 회고"],
        avoid: ["급하게 결론 내리기", "확인 없이 미루기"],
      };
      continue;
    }
    if (key === "timingAndAction") {
      payload.timingAndAction = {
        title: "언제, 무엇을",
        content: filler("시기와 행동.", FUSION_FORTUNE_LENGTH.timingAndAction + 60),
        luckyActions: ["기준을 문장으로 적어 두기", "대화 전에 질문 세 개 준비하기", "주 1회 회고 남기기"],
        cautionPatterns: ["급하게 결론 내리기", "같은 이야기를 반복하기", "확인 없이 미루기"],
      };
      continue;
    }
    if (key === "title") { payload.title = "여섯 체계가 함께 읽은 흐름"; continue; }
    if (key === "shareText") { payload.shareText = "여섯 체계가 함께 읽은 흐름 요약"; continue; }
    if (key === "openingMessage") { payload.openingMessage = filler("여는 말.", 300); continue; }
    if (key === "executiveSummary") { payload.executiveSummary = filler("한 문단 요약.", FUSION_FORTUNE_LENGTH.executiveSummary + 60); continue; }
    if (key === "closingMessage") { payload.closingMessage = filler("맺음말.", FUSION_FORTUNE_LENGTH.closingMessage + 60); continue; }
    const minChars = key === "integratedReading" ? FUSION_FORTUNE_LENGTH.integratedReading : FUSION_FORTUNE_LENGTH.section;
    const cardNames = key === "tarotSection" ? ` ${groupCards.map((card) => card.name).join(", ")} 카드가 함께 나왔습니다.` : "";
    payload[key] = { title: `${key} 해석`, content: `${filler(`${key} 본문.`, minChars + 40)}${cardNames}`, keyPoints: ["첫 번째 신호", "두 번째 신호", "세 번째 신호"] };
  }
  return payload;
}

/** 네 묶음이 전부 분량 미달로 돌아오는 실전 경로 — providerCall 주입이라 실호출은 없다. */
async function runShortGeneration(shape) {
  const events = [];
  const outcome = await generateFusionFortuneWithRealLLM({
    input: shape.input,
    context: shape.context,
    env: ENV,
    requestId: `verify-delivery-floor-${shape.label}`,
    now: new Date("2026-08-16T00:00:00Z"),
    onStage: (stage) => { events.push(stage); },
    providerCall: async (_env, _prompt, options) => {
      const group = FUSION_SECTION_GROUP_SPECS.find((spec) => spec.id === options?.logContext?.sectionGroup);
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(shortGroupPayload(group, shape.cards)) };
    },
  });
  return { generated: outcome, stageEvents: events };
}

const { generated, stageEvents } = await runShortGeneration(baseShape);

check("네 묶음이 모두 분량 미달이어도 결과가 배달된다", generated.deliverable === true && Boolean(generated.result),
  `deliverable=${generated.deliverable}`);
check("강등 배달은 모델 본문을 유지한다(폴백으로 갈아타지 않는다)", generated.generationSource !== "context_fallback",
  `generationSource=${generated.generationSource}`);
check("강등 등급과 사유가 호출자에게 전달된다", generated.qualityTier === "degraded" && (generated.qualityIssues || []).length > 0,
  `tier=${generated.qualityTier} issues=${(generated.qualityIssues || []).join(",")}`);

// ── 진행 이벤트: 총량을 넘는 카운터가 없어야 한다("6 / 4" 재발 방지) ──
const composeEvents = stageEvents.filter((event) => event.stage === "compose");
check("진행 카운터가 총량을 넘지 않는다",
  composeEvents.every((event) => Number(event.completedGroups) <= Number(event.totalGroups)),
  composeEvents.map((event) => `${event.phase}:${event.completedGroups}/${event.totalGroups}`).join(" "));
check("보완 국면은 별도 phase 로 알린다",
  composeEvents.every((event) => event.phase === "compose" || event.phase === "repair"),
  composeEvents.map((event) => String(event.phase)).join(","));

// ── ④ 입력 조합 전수: 생시 유무 × 출생지 유무 ────────────────────────
// 🔴 목록을 손으로 쓰지 않는다. 축을 늘리면 조합이 자동으로 늘고, 빠뜨릴 수 없다.
const SHAPE_AXES = [true, false];
const SHAPES = SHAPE_AXES.flatMap((birthTimeKnown) => SHAPE_AXES.map((birthPlaceKnown) => ({ birthTimeKnown, birthPlaceKnown })));
check("조합 축이 4개 전부를 만든다", SHAPES.length === 4, `조합 수=${SHAPES.length}`);

// 검사가 통째로 지워지지 않았음을 반대 방향으로 고정한다. 조합별로 "미상"인 축에 대해서만
// 진짜 과장 문장이 여전히 검출돼야 한다 — 정규식을 완화했지 없앤 것이 아니다.
const GENUINE_OVERCLAIM = {
  birth_time_overclaim: "상승궁은 사자자리로 확실합니다. 하우스 배치가 분명하게 재물운을 보장합니다.",
  birth_place_overclaim: "나크샤트라는 아쉬위니로 단정할 수 있습니다. 라그나 역시 처녀자리로 확실합니다.",
};

for (const axes of SHAPES) {
  const shape = await buildShape(axes);
  check(`[${shape.label}] 컨텍스트가 요청한 축을 그대로 반영한다`,
    shape.options.birthTimeKnown === axes.birthTimeKnown && shape.options.birthPlaceKnown === axes.birthPlaceKnown,
    `timeKnown=${shape.options.birthTimeKnown} placeKnown=${shape.options.birthPlaceKnown}`);

  // (1) 결정론 폴백 — 모델이 통째로 죽었을 때 사용자가 받는 글. 여기가 무너지면 바닥이 없다.
  const fallback = await generateFusionFortuneWithMockLLM({ context: shape.context, now: new Date("2026-08-16T00:00:00Z") });
  const fallbackEval = evaluateFusionFortuneResult(fallback, shape.options);
  check(`[${shape.label}] 결정론 폴백이 계약을 통과한다`, fallbackEval.issues.length === 0, fallbackEval.issues.join(","));
  const fallbackDelivery = resolveFusionFortuneDelivery(fallback, shape.options);
  check(`[${shape.label}] 결정론 폴백은 배달된다`, fallbackDelivery.deliverable === true,
    `tier=${fallbackDelivery.tier} issues=${(fallbackDelivery.issues || []).join(",")}`);

  // (2) 생성기 전 경로 — 네 묶음이 전부 미달이어도 이 조합에서 0이 나오면 안 된다.
  const { generated: shapeGenerated } = await runShortGeneration(shape);
  check(`[${shape.label}] 네 묶음 미달에도 결과가 배달된다`,
    shapeGenerated.deliverable === true && Boolean(shapeGenerated.result),
    `deliverable=${shapeGenerated.deliverable} issues=${(shapeGenerated.qualityIssues || []).join(",")}`);

  // (3) 반대 방향 — 진짜 과장은 여전히 잡힌다. 미상인 축에 대해서만 성립하는 검사다.
  for (const [issue, sentence] of Object.entries(GENUINE_OVERCLAIM)) {
    const axisKnown = issue === "birth_time_overclaim" ? shape.options.birthTimeKnown : shape.options.birthPlaceKnown;
    if (axisKnown) continue;
    const overclaimed = { ...fallback, sajuSection: { ...fallback.sajuSection, content: `${sentence} ${fallback.sajuSection.content}` } };
    const overclaimedEval = evaluateFusionFortuneResult(overclaimed, shape.options);
    check(`[${shape.label}] 진짜 과장은 ${issue} 로 여전히 검출된다`,
      overclaimedEval.issues.includes(issue), `issues=${overclaimedEval.issues.join(",")}`);
    // 검출되더라도 배달은 막지 않는다 — 막는 자리는 재작성 기회가 있는 그룹 검증이다.
    check(`[${shape.label}] ${issue} 는 배달을 막지 않는다(강등)`,
      resolveFusionFortuneDelivery(overclaimed, shape.options).deliverable === true);
  }
}

if (failures.length) {
  console.error("\n[verify-fusion-fortune-delivery-floor] FAIL");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[verify-fusion-fortune-delivery-floor] PASS (mock only — 실제 모델 호출 없음)");
