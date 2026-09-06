#!/usr/bin/env node
/**
 * 초융합 운세 결과 계약 검증 — **mock 기본**.
 *
 * 1회 30,000원으로 오르면서 분량 계약을 20,000자에서 30,000자 이상으로 올리고,
 * 생성을 2단계(1단계 체계별 6그룹 → 2단계 통합·행동·판정 3그룹)로 바꿨다. 이 스크립트는
 * 그 계약이 지켜지는지, 한 그룹이 죽어도 나머지가 살아남는지, 2단계가 1단계 요약을 받는지,
 * 근거 인용 게이트가 배달을 막지 않고 보완만 부르는지, 시각화가 항상 그릴 수 있는 값으로
 * 채워지는지를 본다.
 *
 * 🔴 실제 모델 호출은 하지 않는다. providerCall 을 주입해 가짜 응답만 흘린다
 *    (정본 패턴: scripts/verify-mindscan-reading.mjs 의 fetchImpl 주입).
 *    실호출이 필요하면 사용자 허락을 먼저 받고 별도 플래그를 만들 것.
 *
 * 사용: node scripts/verify-fusion-fortune-quality.mjs
 */
import {
  buildFusionFortuneContext,
  collectFusionCrossSectionDuplicates,
  collectFusionEvidenceTokens,
  countFusionFortuneVisibleText,
  fusionStageReservationId,
  generateFusionFortuneWithMockLLM,
  generateFusionFortuneWithRealLLM,
  hasFusionStageOneResult,
  isFusionGroupEvidenceThin,
  validateFusionFortuneGroup,
  validateFusionFortuneResult,
} from "../worker/lib/fusion-fortune.js";
import {
  buildFusionSectionGroupPrompt,
  buildFusionStageOneDigest,
  FUSION_FORTUNE_LENGTH,
  FUSION_FORTUNE_RESPONSE_SCHEMA,
  FUSION_SECTION_GROUP_SPECS,
  FUSION_STAGE_COUNT,
  fusionGroupsForStage,
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

function groupPayload(group, { shortBy = 0, noEvidence = false } = {}) {
  const payload = {};
  // 실제 모델은 확정값을 인용하라는 지시를 받는다. 검증용 응답도 그 형태를 따라야
  // 근거 인용 게이트(evidence_thin)가 정상 응답을 보완 대상으로 읽지 않는다.
  const evidence = noEvidence ? "" : collectFusionEvidenceTokens(context, group).slice(0, 3).join(", ");
  const cite = (key) => (evidence ? ` ${key} 판단은 확정값 ${evidence}에서 출발합니다.` : "");
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
        content: `${filler("timingAndAction", Math.max(1, 3000 - shortBy))}${cite("timingAndAction")}`,
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
        rationale: `${filler("finalVerdict", 1150)}${cite("finalVerdict")}`,
        doNow: ["기준 한 줄 적기", "되돌릴 수 있는 크기로 시험하기", "반응을 기록으로 남기기"],
        avoid: ["답을 재촉하기", "한 번에 크게 바꾸기"],
      };
      continue;
    }
    if (key === "title") { payload.title = "여섯 체계가 만나는 자리"; continue; }
    if (key === "shareText") { payload.shareText = "여섯 운세 체계를 하나로 엮어 지금의 선택을 정리했어요."; continue; }
    if (key === "openingMessage") { payload.openingMessage = filler("openingMessage", 320); continue; }
    if (key === "closingMessage") { payload.closingMessage = `${filler("closingMessage", 1000)}${cite("closingMessage")}`; continue; }
    if (key === "executiveSummary") { payload.executiveSummary = `${filler("executiveSummary", 1700)}${cite("executiveSummary")}`; continue; }
    const minChars = 4000;
    const tarotNames = key === "tarotSection" ? ` 서버가 고른 카드는 ${cards.map((card) => card.name).join(", ")}입니다.` : "";
    payload[key] = { title: key, content: `${filler(key, minChars)}${tarotNames}${cite(key)}`, keyPoints: ["남길 판단 하나", "확인할 사실 하나", "이번 주 행동 하나"] };
  }
  return payload;
}

const groupById = (id) => FUSION_SECTION_GROUP_SPECS.find((item) => item.id === id);
const STAGE_ONE_GROUPS = fusionGroupsForStage(1);
const STAGE_TWO_GROUPS = fusionGroupsForStage(2);

/** 실제 라우트가 하는 대로 1단계 → 2단계(1단계 결과를 priorResult 로)를 순서대로 돌린다. */
async function runTwoStages({ requestId, providerCall }) {
  const first = await generateFusionFortuneWithRealLLM({ input: BASE_INPUT, context, env: ENV, requestId, stage: 1, providerCall });
  const second = await generateFusionFortuneWithRealLLM({
    input: BASE_INPUT, context, env: ENV, requestId, stage: 2, providerCall,
    priorResult: first.result, priorGenerationSource: first.generationSource,
  });
  return { first, second };
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
  check("계약 하한이 30,000자", FUSION_FORTUNE_LENGTH.total.min >= 30000, String(FUSION_FORTUNE_LENGTH.total.min));
  // 🔴 상한은 폭주 완충이지 목표가 아니다. 2026-09-06 실호출 5차가 51,203자로 들어와 옛 상한
  //    46,000 을 넘겨 "넘쳤다는 이유로" degraded 강등이 났다(유료 품질 저하 고지까지 붙었다).
  //    그 실측 위에 완충이 남아 있는지를 여기서 고정한다.
  check("계약 상한이 5차 실측(51,203자) 위", FUSION_FORTUNE_LENGTH.total.max > 51203, String(FUSION_FORTUNE_LENGTH.total.max));
  check("2단계 구성", FUSION_STAGE_COUNT === 2 && STAGE_ONE_GROUPS.length === 6 && STAGE_TWO_GROUPS.length === 3, `stage1=${STAGE_ONE_GROUPS.length} stage2=${STAGE_TWO_GROUPS.length}`);
  check("모든 그룹이 단계를 가진다", FUSION_SECTION_GROUP_SPECS.every((group) => group.stage === 1 || group.stage === 2));
  check("1단계는 체계별 섹션만", STAGE_ONE_GROUPS.every((group) => group.systems.length === 1));
  check("통합·판정은 2단계", ["integration", "action", "verdict"].every((id) => groupById(id)?.stage === 2));
  console.log(`[spec] ${FUSION_SECTION_GROUP_SPECS.length}그룹 · 목표 합계 ${target.toLocaleString("ko-KR")}자 (계약 ${FUSION_FORTUNE_LENGTH.total.min.toLocaleString("ko-KR")}~${FUSION_FORTUNE_LENGTH.total.max.toLocaleString("ko-KR")}자)`);
}

// ── 1-b. 분량을 검증하는 필드는 모두 목표 분량 서술자를 받는가 ───────────────
// 🔴 2026-09-06 실호출 6차 사고: closingMessage 만 스키마가 맨 `"string"` 이어서 모델이 목표를
//    못 받았고, 임계 바로 아래(732·662자 / 800)에서 멈춰 verdict 묶음이 통째로 결정론 폴백으로
//    유료 배달됐다. 손으로 목록을 적으면 다음에 추가되는 필드가 또 빠지므로, **검증기가 최소치를
//    재는 키를 여기서 전수로 세우고 서술자가 없으면 실패시킨다**(미분류가 통과하지 못한다).
{
  // key → [계약 상수, 스키마에서 그 최소치를 지는 하위 필드]. 정본은 worker/lib/fusion-fortune.js
  // 의 validateFusionFortuneGroup 이 실제로 재는 자리다.
  const VALIDATED = new Map([
    ["executiveSummary", [FUSION_FORTUNE_LENGTH.executiveSummary, null]],
    ["integratedReading", [FUSION_FORTUNE_LENGTH.integratedReading, "content"]],
    ["timingAndAction", [FUSION_FORTUNE_LENGTH.timingAndAction, "content"]],
    ["closingMessage", [FUSION_FORTUNE_LENGTH.closingMessage, null]],
    ["finalVerdict", [FUSION_FORTUNE_LENGTH.finalVerdictRationale, "rationale"]],
  ]);
  for (const key of Object.keys(FUSION_FORTUNE_RESPONSE_SCHEMA)) {
    if (key.endsWith("Section")) VALIDATED.set(key, [FUSION_FORTUNE_LENGTH.section, "content"]);
  }

  for (const [key, [minChars, field]] of VALIDATED) {
    const node = FUSION_FORTUNE_RESPONSE_SCHEMA[key];
    const directive = field ? node?.[field] : node;
    const ok = typeof directive === "string" && directive.startsWith("string (") && directive.includes(`${minChars.toLocaleString("en-US")}자 이상, 목표`);
    check(`${key} 스키마에 목표 분량 서술자`, ok, String(directive).slice(0, 60));
  }

  // 그룹 명세의 minChars 는 프롬프트의 "최소 N자" 줄로 흘러간다 — 검증 상수와 벌어지면
  // 모델이 검증과 다른 기준을 받는다. 리터럴로 다시 적는 것을 여기서 막는다.
  for (const group of FUSION_SECTION_GROUP_SPECS) {
    for (const [key, value] of Object.entries(group.minChars || {})) {
      const contract = VALIDATED.get(key)?.[0];
      if (contract === undefined) continue;
      check(`${group.id}.minChars.${key} = 계약`, value === contract, `${value} vs ${contract}`);
    }
  }
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
  const integration = buildFusionSectionGroupPrompt({ context, group: groupById("integration") });
  check("통합 그룹이 교차 검증 표를 요구", integration.userPrompt.includes("교차 검증 표"));
  const action = buildFusionSectionGroupPrompt({ context, group: groupById("action") });
  check("행동 그룹이 12개월 라인을 요구", action.userPrompt.includes("12개월"));

  // 2단계 프롬프트는 1단계 섹션 요약을 받고, 1단계 프롬프트는 받지 않는다.
  const stageOne = await generateFusionFortuneWithMockLLM({ context });
  const digest = buildFusionStageOneDigest(stageOne);
  check("1단계 요약이 여섯 섹션 제목을 싣는다", ["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection"].every((key) => digest.includes(String(stageOne[key]?.title || "").slice(0, 20))), `digest=${digest.length}`);
  check("1단계 요약은 원문보다 짧다", digest.length > 0 && digest.length < countFusionFortuneVisibleText(stageOne) / 3, String(digest.length));
  const withPrior = buildFusionSectionGroupPrompt({ context, group: groupById("integration"), priorSections: stageOne });
  check("2단계 프롬프트가 1단계 요약을 싣는다", withPrior.userPrompt.includes("앞 단계에서 완성된 섹션 요약(") && withPrior.userPrompt.includes(String(stageOne.sajuSection?.title || "").slice(0, 20)));
  check("2단계 프롬프트에도 생년월일 없음", !withPrior.userPrompt.includes(BASE_INPUT.birthDate) && !withPrior.userPrompt.includes(BASE_INPUT.concern));
  const stageOnePrompt = buildFusionSectionGroupPrompt({ context, group: groupById("saju"), priorSections: stageOne });
  check("1단계 프롬프트는 요약을 싣지 않는다", !stageOnePrompt.userPrompt.includes("앞 단계에서 완성된 섹션 요약("));
  check("물타기 금지 규칙이 들어 있다", integration.userPrompt.includes("일반론") || integration.systemPrompt.includes("일반론"));
  console.log("[prompt] 그룹별 키 분리 · 교차 검증 표 · 12개월 라인 · 2단계 요약 주입 확인");
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

// ── 4. 1단계 6그룹 → 2단계 3그룹을 부르고 하나로 병합하는가 ─────────────────
{
  const seen = [];
  const { first, second } = await runTwoStages({
    requestId: "verify-fusion-groups",
    providerCall: async (_env, _prompt, options) => {
      seen.push(`${options.logContext.stage}:${options.logContext.sectionGroup}`);
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(groupPayload(groupById(options.logContext.sectionGroup))) };
    },
  });
  check("그룹 수만큼 호출", seen.length === FUSION_SECTION_GROUP_SPECS.length, `calls=${seen.length}`);
  check("모든 그룹이 한 번씩", new Set(seen).size === FUSION_SECTION_GROUP_SPECS.length);
  check("1단계 호출은 1단계 그룹만", seen.slice(0, STAGE_ONE_GROUPS.length).every((entry) => entry.startsWith("1:")), seen.join(","));
  check("2단계 호출은 2단계 그룹만", seen.slice(STAGE_ONE_GROUPS.length).every((entry) => entry.startsWith("2:")), seen.join(","));
  check("1단계 결과는 partial 등급", first.qualityTier === "partial" && first.stage === 1 && first.deliverable === true, `tier=${first.qualityTier} stage=${first.stage}`);
  check("1단계 결과는 2단계 키를 갖지 않는다", !("executiveSummary" in (first.result || {})) && !("finalVerdict" in (first.result || {})) && !("integratedReading" in (first.result || {})));
  check("1단계 결과가 2단계 입력 조건을 만족", hasFusionStageOneResult(first.result));
  check("전부 성공하면 generationSource=gemini", second.generationSource === "gemini", second.generationSource);
  check("2단계 결과에 1단계 본문이 그대로 남는다", String(second.result?.sajuSection?.content || "").includes("sajuSection"));
  const validated = validateFusionFortuneResult(second.result || {}, validationOptions);
  check("병합 결과가 계약을 통과", validated.ok, (validated.issues || []).join(","));
  check("병합 결과가 30,000자 이상", countFusionFortuneVisibleText(second.result || {}) >= 30000, String(countFusionFortuneVisibleText(second.result || {})));
  console.log(`[merge] 1단계 ${STAGE_ONE_GROUPS.length}그룹 + 2단계 ${STAGE_TWO_GROUPS.length}그룹 · 병합 ${countFusionFortuneVisibleText(second.result || {}).toLocaleString("ko-KR")}자`);
}

// ── 5. 한 그룹이 죽어도 나머지가 살아남는가 ─────────────────────────────────
{
  const { first, second } = await runTwoStages({
    requestId: "verify-fusion-partial",
    providerCall: async (_env, _prompt, options) => {
      const groupId = options.logContext.sectionGroup;
      if (groupId === "vedic") return { ok: false, error: "timeout" };
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(groupPayload(groupById(groupId))) };
    },
  });
  check("1단계 부분 실패는 gemini_partial", first.generationSource === "gemini_partial", first.generationSource);
  check("1단계 폴백이 섞이면 최종도 gemini_partial", second.generationSource === "gemini_partial", second.generationSource);
  check("살아남은 그룹은 LLM 본문 유지", String(second.result?.sajuSection?.content || "").includes("sajuSection"));
  check("죽은 그룹만 폴백으로 대체", !String(second.result?.vedicSection?.content || "").includes("vedicSection") && String(second.result?.vedicSection?.content || "").length >= 3600);
  const validated = validateFusionFortuneResult(second.result || {}, validationOptions);
  check("부분 실패 결과도 계약을 통과", validated.ok, (validated.issues || []).join(","));
  console.log("[partial] vedic 그룹만 폴백으로 대체 · 나머지 8그룹 보존");
}

// ── 6. 타로 환각이 그룹 경계에서 걸리는가 ───────────────────────────────────
{
  const group = groupById("tarot");
  const invented = groupPayload(group);
  invented.tarotSection.content += " 여기에 죽음 카드 이야기를 덧붙입니다.";
  check("서버가 안 뽑은 카드는 반려", validateFusionFortuneGroup(invented, group, validationOptions).issue === "invented_tarot_card");

  const missing = groupPayload(group);
  missing.tarotSection.content = missing.tarotSection.content.replace(` 서버가 고른 카드는 ${cards.map((card) => card.name).join(", ")}입니다.`, "");
  check("여섯 장을 다 언급하지 않으면 반려", validateFusionFortuneGroup(missing, group, validationOptions).issue === "missing_selected_tarot_card");

  const other = groupById("saju");
  check("타로 검사는 타로 그룹에만 적용", validateFusionFortuneGroup(groupPayload(other), other, validationOptions).ok === true);
  console.log("[tarot] 환각·누락 모두 그룹 경계에서 차단 · 다른 그룹에는 미적용");
}

// ── 7. 목표에 크게 못 미친 그룹을 다시 부르는가 ─────────────────────────────
{
  const attempts = new Map();
  const { second } = await runTwoStages({
    requestId: "verify-fusion-short",
    providerCall: async (_env, _prompt, options) => {
      const groupId = options.logContext.sectionGroup;
      const round = (attempts.get(groupId) || 0) + 1;
      attempts.set(groupId, round);
      // action 그룹만 1차에서 목표의 절반쯤 쓰고 멈춘 상황을 흉내낸다.
      const shortBy = groupId === "action" && round === 1 ? 1500 : 0;
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(groupPayload(groupById(groupId), { shortBy })) };
    },
  });
  check("미달 그룹은 재생성", (attempts.get("action") || 0) === 2, `action attempts=${attempts.get("action")}`);
  check("충분한 그룹은 재생성하지 않음", (attempts.get("saju") || 0) === 1 && (attempts.get("verdict") || 0) === 1, `saju=${attempts.get("saju")} verdict=${attempts.get("verdict")}`);
  check("재생성 뒤 계약 통과", validateFusionFortuneResult(second.result || {}, validationOptions).ok);
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
  const group = groupById("verdict");
  check("판정 그룹이 최종 판정을 소유", group.keys.includes("finalVerdict") && group.stage === 2);

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

// ── 10. 교차 섹션 중복이 재생성으로 편입되는가 ──────────────────────────────
// 분량 계약(20,000자)만 보면 같은 문장을 두 섹션에 그대로 실어도 통과한다. 30,000원을 낸
// 사용자가 실제로 받는 내용은 그만큼 줄어든다. 중복은 배달을 막지 않고(강등 배달 원칙)
// 재생성을 부른 뒤, 그래도 남으면 사유로만 기록된다.
{
  const DUPLICATE_LINES = [
    "같은 문장을 두 섹션에 그대로 옮겨 적으면 읽는 사람은 새로운 근거를 하나도 받지 못한 채 분량만 늘어난 글을 마주하게 됩니다.",
    "여섯 체계를 한자리에 모았다는 말만 되풀이하면 어느 체계가 어떤 확정값을 근거로 그렇게 읽었는지가 끝내 드러나지 않습니다.",
  ];
  // 표본이 검출 하한(60자)보다 짧아지면 이 절이 조용히 무의미해진다.
  check("중복 표본이 검출 하한보다 길다", DUPLICATE_LINES.every((line) => line.length >= 60), DUPLICATE_LINES.map((line) => line.length).join(","));

  // 1단계 타로 본문과 2단계 통합 본문에 같은 문장을 심는다 — 그룹 안이 아니라 **단계를 건너는 섹션 사이** 중복이다.
  // 1단계 안에서는 한 섹션에만 있어 중복이 아니고, 2단계에서 통합 그룹이 1단계 본문을 베낀 순간 걸려야 한다.
  const withDuplicates = (group) => {
    const payload = groupPayload(group);
    if (group.id === "tarot") payload.tarotSection.content += ` ${DUPLICATE_LINES.join(" ")}`;
    if (group.id === "integration") payload.integratedReading.content += ` ${DUPLICATE_LINES.join(" ")}`;
    return payload;
  };

  const attempts = new Map();
  const repairPrompts = [];
  const { first: repairedFirst, second: repaired } = await runTwoStages({
    requestId: "verify-fusion-duplicate",
    providerCall: async (_env, prompt, options) => {
      const groupId = options.logContext.sectionGroup;
      const round = (attempts.get(groupId) || 0) + 1;
      attempts.set(groupId, round);
      const group = groupById(groupId);
      if (round > 1) repairPrompts.push(prompt);
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(round === 1 ? withDuplicates(group) : groupPayload(group)) };
    },
  });
  check("1단계 안에서는 한 섹션뿐이라 재생성하지 않음", (attempts.get("tarot") || 0) === 1, `tarot attempts=${attempts.get("tarot")}`);
  check("1단계 결과에 중복 사유 없음", !(repairedFirst.qualityIssues || []).includes("cross_section_duplicate"), (repairedFirst.qualityIssues || []).join(","));
  check("1단계 본문을 베낀 2단계 그룹은 재생성", (attempts.get("integration") || 0) === 2, `integration attempts=${attempts.get("integration")}`);
  check("중복 없는 그룹은 재생성하지 않음", (attempts.get("saju") || 0) === 1 && (attempts.get("verdict") || 0) === 1, `saju=${attempts.get("saju")} verdict=${attempts.get("verdict")}`);
  check("재생성 프롬프트가 중복 문장을 되돌려 준다", repairPrompts.some((prompt) => prompt.includes(DUPLICATE_LINES[0])), `repairPrompts=${repairPrompts.length}`);
  check("중복만으로 부른 재생성에는 분량 미달 지시를 붙이지 않는다", repairPrompts.every((prompt) => !prompt.includes("크게 못 미칩니다")));
  const repairedDuplicates = collectFusionCrossSectionDuplicates(repaired.result || {});
  check("재생성이 중복을 지운다", repairedDuplicates.length === 0, repairedDuplicates.map((item) => item.keys.join("/")).join(","));
  check("중복이 해소되면 사유로 남기지 않는다", !(repaired.qualityIssues || []).includes("cross_section_duplicate"), (repaired.qualityIssues || []).join(","));

  // 🔴 재생성해도 계속 베끼는 모델이라면? 그래도 배달은 막지 않는다.
  const { second: persisted } = await runTwoStages({
    requestId: "verify-fusion-duplicate-persist",
    providerCall: async (_env, _prompt, options) => ({ ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(withDuplicates(groupById(options.logContext.sectionGroup))) }),
  });
  check("중복이 남아도 배달한다", persisted.deliverable === true);
  check("남은 중복은 사유로 기록", (persisted.qualityIssues || []).includes("cross_section_duplicate"), (persisted.qualityIssues || []).join(","));
  check("중복은 결과 등급을 떨어뜨리지 않는다", persisted.qualityTier === "full", String(persisted.qualityTier));
  check("중복이 남아도 계약 검증은 그대로", validateFusionFortuneResult(persisted.result || {}, validationOptions).ok);
  console.log("[duplicate] 교차 섹션 중복 → 재생성 편입 · 남으면 사유만 기록(배달 유지)");
}

// ── 11. 근거 인용 게이트는 보완만 부르고 배달을 막지 않는가 ─────────────────
// 일반론 정규식은 두지 않는다(2026-09-03 overclaim 정규식 사고). 컨텍스트의 짧은 확정값을
// 하나도 인용하지 않은 그룹만 보완 대상이 되고, 잴 수 없는 그룹(후보 2개 미만)은 판정하지 않는다.
{
  const vedic = groupById("vedic");
  const vedicTokens = collectFusionEvidenceTokens(context, vedic);
  check("vedic 그룹은 인용 후보가 2개 이상", vedicTokens.length >= 2, vedicTokens.join(","));
  check("확정값을 인용한 응답은 thin 이 아니다", isFusionGroupEvidenceThin(groupPayload(vedic), vedic, vedicTokens) === false);
  check("확정값을 하나도 인용하지 않으면 thin", isFusionGroupEvidenceThin(groupPayload(vedic, { noEvidence: true }), vedic, vedicTokens) === true);
  const saju = groupById("saju");
  const sajuTokens = collectFusionEvidenceTokens(context, saju);
  check("후보가 모자라면 판정하지 않는다", sajuTokens.length < 2 && isFusionGroupEvidenceThin(groupPayload(saju, { noEvidence: true }), saju, sajuTokens) === false, sajuTokens.join(","));
  check("2단계 그룹은 여섯 체계 값을 전부 후보로 본다", collectFusionEvidenceTokens(context, groupById("integration")).length > vedicTokens.length);
  check("thin 은 그룹 반려 사유가 아니다", validateFusionFortuneGroup(groupPayload(vedic, { noEvidence: true }), vedic, validationOptions).ok === true);

  const attempts = new Map();
  const repairPrompts = [];
  const { first } = await runTwoStages({
    requestId: "verify-fusion-evidence",
    providerCall: async (_env, prompt, options) => {
      const groupId = options.logContext.sectionGroup;
      const round = (attempts.get(groupId) || 0) + 1;
      attempts.set(groupId, round);
      if (round > 1) repairPrompts.push(prompt);
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(groupPayload(groupById(groupId), { noEvidence: groupId === "vedic" && round === 1 })) };
    },
  });
  check("근거 없는 그룹은 보완 물결에 편입", (attempts.get("vedic") || 0) === 2, `vedic attempts=${attempts.get("vedic")}`);
  check("근거를 인용한 그룹은 재생성하지 않음", (attempts.get("astrology") || 0) === 1 && (attempts.get("tarot") || 0) === 1, `astrology=${attempts.get("astrology")} tarot=${attempts.get("tarot")}`);
  check("보완 프롬프트가 인용할 값을 건넨다", repairPrompts.some((prompt) => prompt.includes("서버 확정값을 하나도 인용하지") && vedicTokens.some((token) => prompt.includes(token))), `repairPrompts=${repairPrompts.length}`);
  check("보완 뒤 vedic 본문이 확정값을 인용", vedicTokens.some((token) => String(first.result?.vedicSection?.content || "").includes(token)));

  // 🔴 보완해도 계속 인용하지 않는 모델이라면? 그래도 배달은 막지 않고 폴백으로 바꾸지도 않는다.
  const { second: stubborn } = await runTwoStages({
    requestId: "verify-fusion-evidence-persist",
    providerCall: async (_env, _prompt, options) => ({ ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(groupPayload(groupById(options.logContext.sectionGroup), { noEvidence: true })) }),
  });
  check("근거가 없어도 배달한다", stubborn.deliverable === true && stubborn.generationSource === "gemini", `source=${stubborn.generationSource}`);
  check("근거 없음은 계약 검증을 바꾸지 않는다", validateFusionFortuneResult(stubborn.result || {}, validationOptions).ok);
  console.log("[evidence] 확정값 미인용 그룹 → 보완 1회 · 잴 수 없으면 판정 없음 · 배달 유지");
}

// ── 12. 2단계 계약 — 예약 키·1단계 결과 조건·2단계 폴백 ─────────────────────
{
  check("2단계 예약 키는 #s2 접미", fusionStageReservationId("verify-stage", 2).endsWith("#s2") && fusionStageReservationId("verify-stage", 2).length <= 120);
  check("1단계 예약 키는 requestId 그대로", fusionStageReservationId("verify-stage", 1) === "verify-stage");
  check("긴 requestId 도 모델 상한 안", fusionStageReservationId("x".repeat(200), 2).length <= 120);
  check("빈 1단계 결과는 2단계 입력이 아니다", hasFusionStageOneResult(null) === false && hasFusionStageOneResult({}) === false && hasFusionStageOneResult({ sajuSection: { content: "짧음" } }) === false);
  check("폴백 결과는 2단계 입력 조건을 만족", hasFusionStageOneResult(await generateFusionFortuneWithMockLLM({ context })));

  // 2단계 프로바이더가 전부 죽어도 1단계 본문은 남고 2단계 키는 폴백으로 채워져 배달된다.
  const { first, second } = await runTwoStages({
    requestId: "verify-fusion-stage-two-down",
    providerCall: async (_env, _prompt, options) => {
      if (options.logContext.stage === 2) return { ok: false, error: "timeout" };
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(groupPayload(groupById(options.logContext.sectionGroup))) };
    },
  });
  check("1단계는 정상", first.generationSource === "gemini", first.generationSource);
  check("2단계 전멸도 배달한다", second.deliverable === true, String(second.deliverable));
  check("2단계 전멸은 gemini_partial", second.generationSource === "gemini_partial", second.generationSource);
  check("1단계 본문은 보존", String(second.result?.tarotSection?.content || "").includes("tarotSection"));
  check("2단계 키는 폴백으로 채움", String(second.result?.executiveSummary || "").length >= FUSION_FORTUNE_LENGTH.executiveSummary && (second.result?.visualization?.monthlyTimeline || []).length === FUSION_TIMELINE_MONTHS);
  check("2단계 전멸 결과도 계약을 통과", validateFusionFortuneResult(second.result || {}, validationOptions).ok);
  console.log("[stage] #s2 예약 키 · 1단계 결과 조건 · 2단계 전멸 시 폴백 배달 확인");
}

// ── 13. 한 필드 안 문장 반복이 그룹 경계에서 걸리는가 ───────────────────────
// 🔴 이 축은 다른 두 검사가 못 본다 — 교차 섹션 중복은 서로 다른 섹션에 걸친 것만 세고,
//    전체 검증(hasRepeatedLongSentence)은 섹션마다 중복을 지운 뒤 3개 섹션 이상을 요구한다.
//    2026-09-06 실호출 4·5차의 astrology 동어반복 루프가 실제로 이 틈으로 지나갔다.
{
  const group = groupById("saju");
  const loop = "같은 문장을 되풀이해 분량을 채운 응답이 그대로 유료로 배달되지 않도록 이 문장을 여기서 여러 번 반복합니다.";
  check("반복 표본이 최소 길이(60자) 위", loop.length >= 60, String(loop.length));

  const repeat = (times) => {
    const payload = groupPayload(group);
    payload.sajuSection = { ...payload.sajuSection, content: `${payload.sajuSection.content} ${Array.from({ length: times }, () => loop).join(" ")}` };
    return validateFusionFortuneGroup(payload, group, validationOptions);
  };

  check("한 필드 안 3회 반복은 그룹 반려", repeat(3).issue === "repeated_sentence", JSON.stringify(repeat(3)).slice(0, 160));
  check("반려 사유가 필드를 지목", repeat(3).detail === "sajuSection", String(repeat(3).detail));
  // 무는 가드임을 변이로 확인한다 — 반복만 없애면 같은 본문이 통과해야 한다.
  check("2회까지는 통과", repeat(2).ok === true, JSON.stringify(repeat(2)).slice(0, 160));
  check("반복 없는 정상 본문은 통과", validateFusionFortuneGroup(groupPayload(group), group, validationOptions).ok === true);
  console.log("[repeat] 한 필드 안 60자 이상 문장 3회 반복 → repeated_sentence 로 보완 물결행");
}

if (failures.length) {
  console.error(`\n[verify-fusion-fortune-quality] FAIL (${failures.length})`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\n[verify-fusion-fortune-quality] PASS (mock only — 실제 모델 호출 없음)");
