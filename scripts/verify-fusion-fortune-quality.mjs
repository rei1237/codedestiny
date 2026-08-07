#!/usr/bin/env node
/**
 * 초융합 운세 결과 계약 검증 — **mock 기본**.
 *
 * 1회 30,000원으로 오르면서 분량 계약을 10,000~15,000자에서 20,000자 이상으로 올리고,
 * 생성을 단일 호출에서 4그룹 병렬로 바꿨다. 이 스크립트는 그 계약이 지켜지는지,
 * 한 그룹이 죽어도 나머지가 살아남는지, 시각화가 항상 그릴 수 있는 값으로 채워지는지를 본다.
 *
 * 🔴 실제 모델 호출은 하지 않는다. providerCall 을 주입해 가짜 응답만 흘린다
 *    (정본 패턴: scripts/verify-mindscan-reading.mjs 의 fetchImpl 주입).
 *    실호출이 필요하면 사용자 허락을 먼저 받고 별도 플래그를 만들 것.
 *
 * 사용: node scripts/verify-fusion-fortune-quality.mjs
 */
import {
  buildFusionFortuneContext,
  countFusionFortuneVisibleText,
  generateFusionFortuneWithMockLLM,
  generateFusionFortuneWithRealLLM,
  validateFusionFortuneGroup,
  validateFusionFortuneResult,
} from "../worker/lib/fusion-fortune.js";
import {
  buildFusionSectionGroupPrompt,
  FUSION_FORTUNE_LENGTH,
  FUSION_FORTUNE_RESPONSE_SCHEMA,
  FUSION_SECTION_GROUP_SPECS,
} from "../worker/lib/fusion-fortune-prompt.js";
import {
  FUSION_TIMELINE_MONTHS,
  FUSION_VISUAL_SYSTEMS,
  normalizeFusionFinalVerdict,
  normalizeFusionVisualization,
} from "../worker/lib/fusion-fortune-visual.js";

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

const built = await buildFusionFortuneContext(BASE_INPUT, { adapters: ADAPTERS });
if (!built.ok) {
  console.error(`[verify-fusion-fortune-quality] context failed: ${built.errorCode} (${built.failedSystem})`);
  process.exit(1);
}
const context = built.context;
const cards = context.tarotSpread.cards;

/** 그룹 하나가 돌려줄 법한 합격 응답. 문장마다 번호가 달라 반복 검사에 걸리지 않는다. */
function filler(seed, minChars) {
  let value = "";
  let index = 0;
  while (value.length < minChars) {
    value += `${seed} 근거 ${index}번은 서버가 확정한 값에서 출발해 지금의 선택 기준을 설명하고, 생활에서 그것이 드러나는 장면과 이번 주에 해볼 행동을 함께 담습니다. `;
    index += 1;
  }
  return value.trim();
}

function groupPayload(group, { shortBy = 0 } = {}) {
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
    if (key === "timingAndAction") {
      payload.timingAndAction = {
        title: "가까운 시기와 행동",
        content: filler("timingAndAction", Math.max(1, 2100 - shortBy)),
        luckyActions: ["기준 한 줄 적기", "경계 말하기", "지출 한 가지 줄이기"],
        cautionPatterns: ["답을 재촉하기", "속도를 남에게 맞추기", "한 번에 크게 바꾸기"],
      };
      continue;
    }
    if (key === "finalVerdict") {
      payload.finalVerdict = {
        headline: "지금은 방향을 바꾸기보다 힘의 배분을 조정할 때입니다.",
        confidence: 72,
        systemVerdicts: ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((system, index) => ({
          key: system,
          stance: index < 3 ? "agree" : index < 5 ? "conditional" : "caution",
          note: system + " 확정값이 이 결론에 대해 말하는 바를 한 줄로 적습니다.",
        })),
        rationale: filler("finalVerdict", 900),
        doNow: ["기준 한 줄 적기", "되돌릴 수 있는 크기로 시험하기", "반응을 기록으로 남기기"],
        avoid: ["답을 재촉하기", "한 번에 크게 바꾸기"],
      };
      continue;
    }
    if (key === "title") { payload.title = "여섯 체계가 만나는 자리"; continue; }
    if (key === "shareText") { payload.shareText = "여섯 운세 체계를 하나로 엮어 지금의 선택을 정리했어요."; continue; }
    if (key === "openingMessage") { payload.openingMessage = filler("openingMessage", 320); continue; }
    if (key === "closingMessage") { payload.closingMessage = filler("closingMessage", 900); continue; }
    if (key === "executiveSummary") { payload.executiveSummary = filler("executiveSummary", 1300); continue; }
    const minChars = key === "integratedReading" ? 3200 : 2400;
    const tarotNames = key === "tarotSection" ? ` 서버가 고른 카드는 ${cards.map((card) => card.name).join(", ")}입니다.` : "";
    payload[key] = { title: key, content: `${filler(key, minChars)}${tarotNames}`, keyPoints: ["남길 판단 하나", "확인할 사실 하나", "이번 주 행동 하나"] };
  }
  return payload;
}

const validationOptions = {
  birthTimeKnown: true,
  birthPlaceKnown: true,
  sensitiveValues: [BASE_INPUT.birthDate, BASE_INPUT.birthTime, BASE_INPUT.concern],
  selectedTarotCards: cards,
};

// ── 1. 그룹 명세가 스키마 전체를 덮고 목표 합계가 하한 위인가 ────────────────
{
  const covered = FUSION_SECTION_GROUP_SPECS.flatMap((group) => group.keys).sort();
  const expected = Object.keys(FUSION_FORTUNE_RESPONSE_SCHEMA).sort();
  check("그룹 키 합집합 = 응답 스키마", covered.join(",") === expected.join(","), `covered=${covered.length} expected=${expected.length}`);
  const target = FUSION_SECTION_GROUP_SPECS.reduce((sum, group) => sum + group.targetChars, 0);
  check("목표 합계가 계약 하한보다 크다", target > FUSION_FORTUNE_LENGTH.total.min, `target=${target} min=${FUSION_FORTUNE_LENGTH.total.min}`);
  console.log(`[spec] ${FUSION_SECTION_GROUP_SPECS.length}그룹 · 목표 합계 ${target.toLocaleString("ko-KR")}자 (계약 ${FUSION_FORTUNE_LENGTH.total.min.toLocaleString("ko-KR")}~${FUSION_FORTUNE_LENGTH.total.max.toLocaleString("ko-KR")}자)`);
}

// ── 2. 그룹 프롬프트가 자기 키만 싣고 개인정보를 흘리지 않는가 ──────────────
{
  for (const group of FUSION_SECTION_GROUP_SPECS) {
    const prompt = buildFusionSectionGroupPrompt({ context, group });
    const schemaKeys = Object.keys(prompt.responseSchema);
    check(`${group.id} 스키마는 자기 키만`, schemaKeys.join(",") === group.keys.join(","), schemaKeys.join(","));
    check(`${group.id} 프롬프트에 생년월일 없음`, !prompt.userPrompt.includes(BASE_INPUT.birthDate));
    check(`${group.id} 프롬프트에 생시 없음`, !prompt.userPrompt.includes(BASE_INPUT.birthTime));
    check(`${group.id} 프롬프트에 고민 원문 없음`, !prompt.userPrompt.includes(BASE_INPUT.concern));
  }
  const synthesis = buildFusionSectionGroupPrompt({ context, group: FUSION_SECTION_GROUP_SPECS.find((group) => group.id === "synthesis") });
  check("통합 그룹이 교차 검증 표를 요구", synthesis.userPrompt.includes("교차 검증 표"));
  const action = buildFusionSectionGroupPrompt({ context, group: FUSION_SECTION_GROUP_SPECS.find((group) => group.id === "action") });
  check("행동 그룹이 12개월 라인을 요구", action.userPrompt.includes("12개월"));
  console.log("[prompt] 그룹별 키 분리 · 교차 검증 표 · 12개월 라인 지시 확인");
}

// ── 3. 결정론 폴백이 새 계약을 채우는가 ─────────────────────────────────────
// 폴백은 프로바이더가 죽었을 때 30,000원을 낸 사용자에게 나가는 결과물이다.
// 여기가 하한을 못 채우면 사용자는 결과 대신 오류를 받는다.
{
  const fallback = await generateFusionFortuneWithMockLLM({ context });
  const validated = validateFusionFortuneResult(fallback, validationOptions);
  check("폴백이 계약을 통과", validated.ok, (validated.issues || []).join(","));
  check("폴백 시각화가 채워짐", (fallback.visualization?.monthlyTimeline || []).length === FUSION_TIMELINE_MONTHS);
  console.log(`[fallback] ${countFusionFortuneVisibleText(fallback).toLocaleString("ko-KR")}자 · 계약 통과 ${validated.ok}`);
}

// ── 4. 네 그룹을 병렬로 부르고 하나로 병합하는가 ────────────────────────────
{
  const seen = [];
  const generated = await generateFusionFortuneWithRealLLM({
    input: BASE_INPUT,
    context,
    env: ENV,
    requestId: "verify-fusion-groups",
    providerCall: async (_env, _prompt, options) => {
      seen.push(options.logContext.sectionGroup);
      const group = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === options.logContext.sectionGroup);
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(groupPayload(group)) };
    },
  });
  check("그룹 수만큼 호출", seen.length === FUSION_SECTION_GROUP_SPECS.length, `calls=${seen.length}`);
  check("모든 그룹이 한 번씩", new Set(seen).size === FUSION_SECTION_GROUP_SPECS.length);
  check("전부 성공하면 generationSource=gemini", generated.generationSource === "gemini", generated.generationSource);
  const validated = validateFusionFortuneResult(generated.result || {}, validationOptions);
  check("병합 결과가 계약을 통과", validated.ok, (validated.issues || []).join(","));
  console.log(`[merge] ${seen.length}그룹 병렬 · 병합 ${countFusionFortuneVisibleText(generated.result || {}).toLocaleString("ko-KR")}자`);
}

// ── 5. 한 그룹이 죽어도 나머지가 살아남는가 ─────────────────────────────────
{
  const generated = await generateFusionFortuneWithRealLLM({
    input: BASE_INPUT,
    context,
    env: ENV,
    requestId: "verify-fusion-partial",
    providerCall: async (_env, _prompt, options) => {
      const groupId = options.logContext.sectionGroup;
      if (groupId === "traditions") return { ok: false, error: "timeout" };
      const group = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === groupId);
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(groupPayload(group)) };
    },
  });
  check("부분 실패는 gemini_partial", generated.generationSource === "gemini_partial", generated.generationSource);
  check("살아남은 그룹은 LLM 본문 유지", String(generated.result?.sajuSection?.content || "").includes("sajuSection"));
  check("죽은 그룹만 폴백으로 대체", !String(generated.result?.vedicSection?.content || "").includes("vedicSection"));
  const validated = validateFusionFortuneResult(generated.result || {}, validationOptions);
  check("부분 실패 결과도 계약을 통과", validated.ok, (validated.issues || []).join(","));
  console.log("[partial] traditions 그룹만 폴백으로 대체 · 나머지 3그룹 보존");
}

// ── 6. 타로 환각이 그룹 경계에서 걸리는가 ───────────────────────────────────
{
  const group = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === "synthesis");
  const invented = groupPayload(group);
  invented.tarotSection.content += " 여기에 죽음 카드 이야기를 덧붙입니다.";
  check("서버가 안 뽑은 카드는 반려", validateFusionFortuneGroup(invented, group, validationOptions).issue === "invented_tarot_card");

  const missing = groupPayload(group);
  missing.tarotSection.content = missing.tarotSection.content.replace(` 서버가 고른 카드는 ${cards.map((card) => card.name).join(", ")}입니다.`, "");
  check("여섯 장을 다 언급하지 않으면 반려", validateFusionFortuneGroup(missing, group, validationOptions).issue === "missing_selected_tarot_card");

  const other = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === "foundation");
  check("타로 검사는 통합 그룹에만 적용", validateFusionFortuneGroup(groupPayload(other), other, validationOptions).ok === true);
  console.log("[tarot] 환각·누락 모두 그룹 경계에서 차단 · 다른 그룹에는 미적용");
}

// ── 7. 목표에 크게 못 미친 그룹을 다시 부르는가 ─────────────────────────────
{
  const attempts = new Map();
  const generated = await generateFusionFortuneWithRealLLM({
    input: BASE_INPUT,
    context,
    env: ENV,
    requestId: "verify-fusion-short",
    providerCall: async (_env, _prompt, options) => {
      const groupId = options.logContext.sectionGroup;
      const round = (attempts.get(groupId) || 0) + 1;
      attempts.set(groupId, round);
      const group = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === groupId);
      // action 그룹만 1차에서 목표의 절반쯤 쓰고 멈춘 상황을 흉내낸다.
      const shortBy = groupId === "action" && round === 1 ? 1200 : 0;
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(groupPayload(group, { shortBy })) };
    },
  });
  check("미달 그룹은 재생성", (attempts.get("action") || 0) === 2, `action attempts=${attempts.get("action")}`);
  check("충분한 그룹은 재생성하지 않음", (attempts.get("foundation") || 0) === 1, `foundation attempts=${attempts.get("foundation")}`);
  check("재생성 뒤 계약 통과", validateFusionFortuneResult(generated.result || {}, validationOptions).ok);
  console.log("[retry] 목표의 80% 미만 그룹만 1회 재생성");
}

// ── 8. 시각화가 어떤 입력에서도 그릴 수 있는 값이 되는가 ────────────────────
{
  for (const [label, raw] of [
    ["없음", undefined],
    ["빈 객체", {}],
    ["형식 붕괴", { systemScores: "nope", monthlyTimeline: [{ label: 1 }], crossChecks: { aligned: [{}], divergent: null } }],
    ["범위 초과", { systemScores: [{ key: "saju", score: 9999 }], monthlyTimeline: Array.from({ length: 40 }, () => ({ intensity: -5 })) }],
  ]) {
    const visual = normalizeFusionVisualization(raw, context, { now: new Date("2026-08-08T00:00:00Z") });
    check(`시각화(${label}) 체계 6개`, visual.systemScores.length === FUSION_VISUAL_SYSTEMS.length);
    check(`시각화(${label}) 12개월`, visual.monthlyTimeline.length === FUSION_TIMELINE_MONTHS);
    check(`시각화(${label}) 점수 범위`, visual.systemScores.every((item) => item.score >= 0 && item.score <= 100));
    check(`시각화(${label}) 강도 범위`, visual.monthlyTimeline.every((item) => item.intensity >= 0 && item.intensity <= 100));
    check(`시각화(${label}) 월별 지침 존재`, visual.monthlyTimeline.every((item) => item.label && item.note));
    check(`시각화(${label}) 교차 검증 존재`, visual.crossChecks.aligned.length >= 1 && visual.crossChecks.divergent.length >= 1);
  }
  console.log("[visual] 누락·형식 붕괴·범위 초과 모두 결정론 백필로 복구");
}

// ── 9. 최종 교차 판정이 형식을 지키는가 ────────────────────────────────────
{
  const group = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === "action");
  check("행동 그룹이 최종 판정을 소유", group.keys.includes("finalVerdict"));

  const complete = groupPayload(group);
  check("정상 판정은 통과", validateFusionFortuneGroup(complete, group, validationOptions).ok === true);

  const missingSystem = groupPayload(group);
  missingSystem.finalVerdict.systemVerdicts = missingSystem.finalVerdict.systemVerdicts.slice(0, 4);
  check("여섯 체계를 다 판정하지 않으면 반려", validateFusionFortuneGroup(missingSystem, group, validationOptions).ok === false);

  const shortRationale = groupPayload(group);
  shortRationale.finalVerdict.rationale = "짧은 근거";
  check("근거가 짧으면 반려", validateFusionFortuneGroup(shortRationale, group, validationOptions).ok === false);

  // 합의 강도는 모델이 부른 값이 아니라 stance 분포를 따른다.
  const inflated = groupPayload(group);
  inflated.finalVerdict.confidence = 100;
  const normalized = normalizeFusionFinalVerdict(inflated.finalVerdict);
  check("과장된 합의 강도는 stance 분포로 교정", normalized.ok && normalized.value.confidence < 100, String(normalized.value?.confidence));
  console.log("[verdict] 여섯 체계 판정 필수 · 근거 하한 · 합의 강도 교정 확인");
}

if (failures.length) {
  console.error(`\n[verify-fusion-fortune-quality] FAIL (${failures.length})`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\n[verify-fusion-fortune-quality] PASS (mock only — 실제 모델 호출 없음)");
