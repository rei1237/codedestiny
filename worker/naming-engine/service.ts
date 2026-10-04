// 라우트(worker/routes/naming-prompt.js)가 부르는 작명 v2 입구. 라우트 입력 → 엔진 입력 변환, 정본 사주 스냅샷 1회 계산,
// 저장용 엔진 요약(view)과 화면용 사주 근거를 함께 돌려준다. 결제·이용권 판정은 하지 않는다.

import { ENGINE_VERSION, runNamingEngine, type NamingInput } from "./engine";
import { engineView, type EngineView } from "./facts";
import { sajuNeedsFromSnapshot, sajuSnapshotFromBirth, type NamingBirth } from "./saju-input";
import { NamingEngineError, type Element } from "./types";

export { ENGINE_VERSION } from "./engine";
export { NamingEngineError } from "./types";
export { correctText, findViolations } from "./checker";
export { deterministicNarration, engineCards, engineChapterBody, factParagraph, engineView } from "./facts";
export {
  CHAPTER_COUNT, buildNamingV2Prompt, confirmedEmptyNamingFailureV2, generateNamingWaveV2, initialDeliveryV2,
  namingChaptersTextV2, namingReportCompleteV2,
} from "./report";

const STEM_ELEMENT: Record<string, Element> = {
  갑: "wood", 을: "wood", 병: "fire", 정: "fire", 무: "earth", 기: "earth", 경: "metal", 신: "metal", 임: "water", 계: "water",
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
};

const pad2 = (value: unknown) => String(Number(value) || 0).padStart(2, "0");

/** 라우트 normalizeInput 결과 → 엔진 입력. 성 한자가 없으면 v2 가 아니다(라우트가 먼저 거른다). */
export function engineInputFromRoute(input: any): NamingInput {
  const gender = String(input?.gender || "").trim().toUpperCase();
  const time = String(input?.birthTime || "").trim();
  const calendar = String(input?.calendarType || "solar");
  const birth: NamingBirth = {
    date: `${String(Number(input?.year) || 0).padStart(4, "0")}-${pad2(input?.month)}-${pad2(input?.day)}`,
    time: !input?.birthTimeUnknown && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null,
    calendarType: calendar === "lunar_leap" || (calendar === "lunar" && input?.isLeapMonth) ? "lunar_leap" : calendar === "lunar" ? "lunar" : "solar",
  };
  return {
    surname: { hangul: String(input?.familyName || "").trim(), hanja: Array.from(String(input?.surnameHanja || "")) },
    gender: gender === "M" || gender === "MALE" ? "M" : gender === "F" || gender === "FEMALE" ? "F" : "N",
    birth,
    nameLength: Number(input?.nameLength) === 1 ? 1 : 2,
    fixedChar: input?.fixedChar || null,
    avoidChars: Array.isArray(input?.avoidChars) ? input.avoidChars : [],
    mode: input?.engineMode || "hanja",
    schoolPreset: input?.schoolPreset || undefined,
    // 직접 고른 이름은 라우트 normalizeDesiredNames 결과({hangul, hanjaCandidates})에서 한글만 넘긴다(한자는 엔진이 찾는다).
    ...(input?.nameStrategy === "choose"
      ? { strategy: "choose" as const, desiredNames: (Array.isArray(input?.desiredNames) ? input.desiredNames : []).map((d: any) => String(d?.hangul ?? d ?? "")) }
      : {}),
  };
}

/** 라우트 buildSajuContext 가 읽는 모양(main-shell evidence)으로 정본 스냅샷을 옮긴다. 일간 오행은 천간에서 읽는다. */
function displayEvidenceOf(snapshot: any) {
  const pillars: Record<string, any> = {};
  for (const key of ["y", "m", "d", "h"]) {
    const pillar = snapshot?.pillars?.[key];
    if (!pillar) continue;
    pillars[key] = { g: pillar.g, j: pillar.j, ...(STEM_ELEMENT[pillar.g] ? { gE: STEM_ELEMENT[pillar.g] } : {}) };
  }
  return {
    engineVersion: ENGINE_VERSION,
    pillars,
    natal: { counts: { ...(snapshot?.natal?.elements || {}) } },
    power: snapshot?.power || {},
    johu: snapshot?.johu || {},
    jong: snapshot?.jong || {},
  };
}

function compute(input: any, tier: "free" | "paid"): { view: EngineView; displayEvidence: ReturnType<typeof displayEvidenceOf> } {
  const engineInput = engineInputFromRoute(input);
  const snapshot = sajuSnapshotFromBirth(engineInput.birth as NamingBirth, engineInput.gender);
  if (!snapshot) throw new NamingEngineError("saju-unavailable", "생년월일로 사주를 계산하지 못했다");
  const result = runNamingEngine(engineInput, { tier, saju: sajuNeedsFromSnapshot(snapshot) });
  const view = engineView(result);
  const displayEvidence = displayEvidenceOf(snapshot);
  // 결과 화면의 오행 요약이 저장 레코드만으로 그려지도록 원국 기둥·개수를 view 에 싣는다(엔진 계산과 무관).
  view.saju = { ...view.saju, pillars: displayEvidence.pillars, counts: { ...displayEvidence.natal.counts } };
  return { view, displayEvidence };
}

/** 유료(12개) — 결과 레코드에 저장할 view 와 사주 근거. */
export function prepareNamingV2(input: any) {
  return compute(input, "paid");
}

/** 무료(5개) — LLM 0회. */
export function namingBasisV2(input: any) {
  return compute(input, "free");
}
