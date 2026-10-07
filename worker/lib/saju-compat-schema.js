// 기본 사주 궁합(compat-saju-compatibility) LLM 서술 서비스의 계약.
//
// 역할 분리: 점수·등급·합충 판정은 브라우저의 결정론 엔진(analyzeCompat)이 이미 확정한 facts 이고,
// LLM 은 그 값을 서술만 한다. 서버는 엔진을 다시 돌릴 수 없으므로 facts 를 자기신고 값으로 보고
// (1) 닫힌 값 집합, (2) 값끼리의 산술·논리 일관성, (3) 기둥에서 다시 계산되는 합충 관계를 검증한다.
// 이 검증은 변조 방지가 아니라 "엔진 계약을 벗어난 값이 서술의 근거가 되지 않게" 하는 장치다.
import { createHash } from "node:crypto";
import { HttpError } from "./http.js";
import { countPaidReportBodyChars, reportSentenceKey } from "./paid-report-quality.js";
import { repairJsonFieldLocations } from "./json-text-repair.js";

export const SAJU_COMPAT_FEATURE_KEY = "compat-saju-compatibility";
export const SAJU_COMPAT_REPORT_TYPE = "sajuCompatBasic";
export const SAJU_COMPAT_TYPE = "saju-compat-basic";
export const SAJU_COMPAT_SCHEMA_VERSION = 1;
export const SAJU_COMPAT_PROMPT_VERSION = "saju-compat-basic-p1";
export const SAJU_COMPAT_GROUPS = ["core", "reasons", "practice", "pastLife"];

const MAX_FACTS_BYTES = 16 * 1024;
const FIELD_MIN_CHARS = 30; // 이보다 짧거나 한글이 없는 필드는 "비어 있음"(구조 결손)으로 본다.
const QUESTION_MIN_CHARS = 8;
const PARTNER_NAME_FALLBACK = "상대방";

const STEMS = [..."甲乙丙丁戊己庚辛壬癸"];
const BRANCHES = [..."子丑寅卯辰巳午未申酉戌亥"];
const ELEMENTS = ["wood", "fire", "earth", "metal", "water"];
const TYPES = ["love", "business", "friend"];
const GRADES = ["S", "A", "B", "C", "D", "F"];
const SHENG = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const KE = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
const STEM_HE = new Set(["甲己", "己甲", "乙庚", "庚乙", "丙辛", "辛丙", "丁壬", "壬丁", "戊癸", "癸戊"]);
const BRANCH_HE = new Set(["子丑", "丑子", "寅亥", "亥寅", "卯戌", "戌卯", "辰酉", "酉辰", "巳申", "申巳", "午未", "未午"]);
const STEM_CHONG = new Set(["甲庚", "庚甲", "乙辛", "辛乙", "丙壬", "壬丙", "丁癸", "癸丁"]);
const BRANCH_CHONG = new Set(["子午", "午子", "丑未", "未丑", "寅申", "申寅", "卯酉", "酉卯", "辰戌", "戌辰", "巳亥", "亥巳"]);

// 이유 코드 → 가감. 엔진(analyzeCompat)의 addReasonFact 21곳과 1:1 이며 계약 테스트가 둘을 대조한다.
export const REASON_DELTAS = {
  JOHU_COMPLEMENT: 4, JOHU_BOTH_HOT: -3, JOHU_BOTH_COLD: -3, JOHU_MILD: 1,
  MOIST_COMPLEMENT: 3, MOIST_BOTH: -2, MOIST_NEUTRAL: 0.5,
  ELEMENT_SAME: 1, ELEMENT_SAME_EXCESS: -2, ELEMENT_SHENG_SELF_TO_PARTNER: 3, ELEMENT_SHENG_PARTNER_TO_SELF: 3, ELEMENT_KE: -2,
  DAY_STEM_HE: 3, DAY_BRANCH_HE: 2, DAY_STEM_CHONG: -3, DAY_BRANCH_CHONG: -3,
  YONGSHIN_COMMON: 4, YONGSHIN_CLASH: -4, KIJI_CONTROL_FORWARD: 5, KIJI_CONTROL_REVERSE: 4, HE_TRAP: -4,
};
// 이유 없이 점수만 바꾸는 보정(유형 보정 5종·속궁합 11종) → [가감, 종류].
export const ADJUSTMENT_SPECS = {
  TYPE_LOVE_DAY_BRANCH_HE: [1, "type"], TYPE_LOVE_BOTH_HOT: [-1, "type"], TYPE_BUSINESS_BOTH_STRONG: [1, "type"],
  TYPE_BUSINESS_DAY_BRANCH_CHONG: [-1, "type"], TYPE_FRIEND_ELEMENT_KE: [1, "type"],
  SOK_JOHU_WARM_WARM: [2, "sok"], SOK_JOHU_COLD_COLD: [1, "sok"], SOK_JOHU_MIXED: [0, "sok"], SOK_JOHU_NEUTRAL: [0.5, "sok"],
  SOK_SEASON_COMPLEMENT: [2, "sok"], SOK_SEASON_SAME: [0.5, "sok"], SOK_SEASON_OTHER: [-0.5, "sok"],
  SOK_STEM_SAME: [1, "sok"], SOK_STEM_SAME_EXCESS: [-2, "sok"], SOK_STEM_SHENG: [0.5, "sok"], SOK_STEM_KE: [-1, "sok"],
};
const FACT_FLAGS = ["STRENGTH_SELF_LEADS", "STRENGTH_PARTNER_LEADS", "STRENGTH_PEER", "KE_SELF_OVER_PARTNER", "KE_PARTNER_OVER_SELF", "KIJI_RELIEF", "HE_TRAP"];
const TEN_GODS = ["bigeop", "siksang", "gwanseong", "inseong", "jaeseong"];
const STEM_RELATIONS = ["same", "sheng_self_to_partner", "sheng_partner_to_self", "ke_self_over_partner", "ke_partner_over_self"];

// ---------------------------------------------------------------------------------------------
// 요청 검증
// ---------------------------------------------------------------------------------------------
const invalid = (field) => new HttpError(422, "궁합 입력을 확인해 주세요.", { code: "SAJU_COMPAT_INPUT_INVALID", field });
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const oneOf = (value, list, field) => { if (!list.includes(value)) throw invalid(field); return value; };
const stemOf = (value, field) => oneOf(value, STEMS, field);
const branchOf = (value, field) => oneOf(value, BRANCHES, field);
const elementOf = (value, field) => oneOf(value, ELEMENTS, field);
const elementList = (value, field) => {
  if (!Array.isArray(value) || value.length > 5 || new Set(value).size !== value.length) throw invalid(field);
  return value.map((element) => elementOf(element, field));
};
const gradeOfRaw = (raw) => (raw >= 13 ? "S" : raw >= 8 ? "A" : raw >= 3 ? "B" : raw >= -2 ? "C" : raw >= -6 ? "D" : "F");
const displayOfRaw = (raw) => Math.max(20, Math.min(96, Math.round(58 + raw * 2.8)));
const pastGradeOf = (pScore) => (pScore >= 6 ? "S" : pScore >= 3 ? "A" : pScore >= 1 ? "B" : pScore === 0 ? "C" : pScore >= -3 ? "D" : "F");
const yinYangMatches = (stem, branch) => STEMS.indexOf(stem) % 2 === BRANCHES.indexOf(branch) % 2;

/** 상대 호칭을 JSON 문자열 값으로만 쓰기 위한 정제: 글자·숫자·공백·몇몇 기호만, 20자까지. */
export function cleanPartnerName(value) {
  const name = String(value ?? "").normalize("NFC")
    .replace(/[^\p{L}\p{N}\s._'’·-]/gu, "").replace(/\s+/g, " ").trim();
  return Array.from(name).slice(0, 20).join("") || PARTNER_NAME_FALLBACK;
}

function pillarsOf(value, field) {
  if (!isObject(value) || !Array.isArray(value.pillars) || value.pillars.length !== 4) throw invalid(field);
  return value.pillars.map((pillar, index) => {
    if (!isObject(pillar)) throw invalid(`${field}.${index}`);
    const gan = stemOf(pillar.gan, `${field}.${index}.gan`);
    const ji = branchOf(pillar.ji, `${field}.${index}.ji`);
    if (!yinYangMatches(gan, ji)) throw invalid(`${field}.${index}`);
    return { gan, ji };
  });
}

function reasonEvidenceOf(code, evidence, field) {
  const raw = isObject(evidence) ? evidence : {};
  switch (code) {
    case "MOIST_BOTH": return { moist: oneOf(raw.moist, ["wet", "dry"], field) };
    case "ELEMENT_SAME": case "ELEMENT_SAME_EXCESS": return { element: elementOf(raw.element, field) };
    case "ELEMENT_SHENG_SELF_TO_PARTNER": case "ELEMENT_SHENG_PARTNER_TO_SELF":
      return { from: elementOf(raw.from, field), to: elementOf(raw.to, field) };
    case "ELEMENT_KE": return { self: elementOf(raw.self, field), partner: elementOf(raw.partner, field) };
    case "DAY_STEM_HE": case "DAY_STEM_CHONG": return { self: stemOf(raw.self, field), partner: stemOf(raw.partner, field) };
    case "DAY_BRANCH_HE": case "DAY_BRANCH_CHONG": return { self: branchOf(raw.self, field), partner: branchOf(raw.partner, field) };
    case "YONGSHIN_COMMON": case "YONGSHIN_CLASH": return { elements: elementList(raw.elements, field) };
    case "KIJI_CONTROL_FORWARD": case "KIJI_CONTROL_REVERSE": {
      if (!Array.isArray(raw.events) || raw.events.length === 0 || raw.events.length > 16) throw invalid(field);
      const glyphs = [...STEMS, ...BRANCHES];
      return { events: raw.events.map((event) => ({ char: oneOf(event?.char, glyphs, field), by: oneOf(event?.by, glyphs, field) })) };
    }
    case "HE_TRAP": {
      const glyphs = [...STEMS, ...BRANCHES];
      return { self: oneOf(raw.self, glyphs, field), partner: oneOf(raw.partner, glyphs, field), resultElement: elementOf(raw.resultElement, field) };
    }
    default: return {};
  }
}

function crossKindOf(he, chong, same) { return he ? "he" : chong ? "chong" : same ? "same" : "none"; }
function crossKinds(fromPillar, toPillar) {
  return {
    gan: crossKindOf(STEM_HE.has(fromPillar.gan + toPillar.gan), STEM_CHONG.has(fromPillar.gan + toPillar.gan), fromPillar.gan === toPillar.gan),
    ji: crossKindOf(BRANCH_HE.has(fromPillar.ji + toPillar.ji), BRANCH_CHONG.has(fromPillar.ji + toPillar.ji), fromPillar.ji === toPillar.ji),
  };
}
const crossScore = (kind) => (kind === "he" ? 2 : kind === "chong" ? -2 : kind === "same" ? 1 : 0);

function pastLifeFactsOf(raw, self, partner) {
  if (!isObject(raw) || !isObject(raw.grade) || !Array.isArray(raw.cross) || raw.cross.length !== 2) throw invalid("facts.pastLife");
  const pScore = raw.grade.pScore;
  if (!Number.isInteger(pScore) || Math.abs(pScore) > 16) throw invalid("facts.pastLife.grade.pScore");
  const dirs = [
    ["self_day_to_partner_year", self[2], partner[0]],
    ["partner_day_to_self_year", partner[2], self[0]],
  ];
  let total = 0;
  const cross = dirs.map(([dir, from, to], index) => {
    const item = raw.cross[index];
    if (!isObject(item) || item.dir !== dir) throw invalid(`facts.pastLife.cross.${index}`);
    if (item.from?.gan !== from.gan || item.from?.ji !== from.ji || item.to?.gan !== to.gan || item.to?.ji !== to.ji) throw invalid(`facts.pastLife.cross.${index}.pillars`);
    const kinds = crossKinds(from, to);
    if (item.gan !== kinds.gan || item.ji !== kinds.ji) throw invalid(`facts.pastLife.cross.${index}.kind`);
    total += crossScore(kinds.gan) + crossScore(kinds.ji);
    return { dir, from: { ...from }, to: { ...to }, gan: kinds.gan, ji: kinds.ji };
  });
  if (total !== pScore) throw invalid("facts.pastLife.grade.pScore");
  if (raw.grade.code !== pastGradeOf(pScore)) throw invalid("facts.pastLife.grade.code");
  return { grade: { code: raw.grade.code, pScore }, cross };
}

function sokFactsOf(raw, type) {
  if (!isObject(raw)) throw invalid("facts.sok");
  const johuPair = oneOf(raw.johuPair, ["warm_warm", "cold_cold", "mixed", "neutral"], "facts.sok.johuPair");
  const seasonPair = oneOf(raw.seasonPair, ["complement", "same", "other"], "facts.sok.seasonPair");
  const seasons = ["spring", "summer", "autumn", "winter"];
  const stem = isObject(raw.stem) ? raw.stem : {};
  const nullable = (value, list, field) => (value === null || value === undefined ? null : oneOf(value, list, field));
  const adjustments = adjustmentsOf(raw.adjustments, "facts.sok.adjustments").filter((item) => item.kind === "sok" || (() => { throw invalid("facts.sok.adjustments"); })());
  return {
    johuPair,
    seasons: { self: oneOf(raw.seasons?.self, seasons, "facts.sok.seasons.self"), partner: oneOf(raw.seasons?.partner, seasons, "facts.sok.seasons.partner") },
    seasonPair,
    stem: {
      self: nullable(stem.self, ELEMENTS, "facts.sok.stem.self"), partner: nullable(stem.partner, ELEMENTS, "facts.sok.stem.partner"),
      relation: nullable(stem.relation, STEM_RELATIONS, "facts.sok.stem.relation"), sameExcess: stem.sameExcess === true,
    },
    tenGods: { self: nullable(raw.tenGods?.self, TEN_GODS, "facts.sok.tenGods.self"), partner: nullable(raw.tenGods?.partner, TEN_GODS, "facts.sok.tenGods.partner") },
    adjustments,
    type,
  };
}

function adjustmentsOf(raw, field) {
  if (!Array.isArray(raw) || raw.length > 16) throw invalid(field);
  const seen = new Set();
  return raw.map((item, index) => {
    const spec = ADJUSTMENT_SPECS[item?.code];
    if (!spec || item.delta !== spec[0] || item.kind !== spec[1] || seen.has(item.code)) throw invalid(`${field}.${index}`);
    seen.add(item.code);
    return { kind: spec[1], code: item.code, delta: spec[0] };
  });
}

/**
 * 요청 본문 → 검증·정제된 입력. 생년월일 평문은 받지도 저장하지도 않는다(기둥과 facts 만).
 * 반환값은 새 객체이며, 알 수 없는 필드는 모두 버린다.
 */
export function normalizeSajuCompatInput(body) {
  if (!isObject(body)) throw invalid("body");
  const compatType = oneOf(body.compatType, TYPES, "compatType");
  const self = pillarsOf(body.self, "self");
  const partner = pillarsOf(body.partner, "partner");
  const raw = body.facts;
  if (!isObject(raw)) throw invalid("facts");
  if (JSON.stringify(raw).length > MAX_FACTS_BYTES) throw invalid("facts.size");
  if (raw.type !== compatType) throw invalid("facts.type");

  const rawScore = raw.score?.raw;
  if (typeof rawScore !== "number" || !Number.isFinite(rawScore) || !Number.isInteger(rawScore * 2) || Math.abs(rawScore) > 80) throw invalid("facts.score.raw");
  if (raw.score.display !== displayOfRaw(rawScore)) throw invalid("facts.score.display");
  if (raw.grade?.code !== gradeOfRaw(rawScore)) throw invalid("facts.grade.code");

  const reasonSeen = new Set();
  const reasons = (Array.isArray(raw.reasons) && raw.reasons.length <= 21 ? raw.reasons : (() => { throw invalid("facts.reasons"); })()).map((item, index) => {
    const delta = REASON_DELTAS[item?.code];
    const field = `facts.reasons.${index}`;
    if (delta === undefined || item.delta !== delta || item.polarity !== (delta > 0 ? "+" : "-") || reasonSeen.has(item.code)) throw invalid(field);
    reasonSeen.add(item.code);
    return { code: item.code, polarity: item.polarity, delta, evidence: reasonEvidenceOf(item.code, item.evidence, `${field}.evidence`) };
  });
  const adjustments = adjustmentsOf(raw.adjustments, "facts.adjustments");
  const total = reasons.reduce((sum, item) => sum + item.delta, 0) + adjustments.reduce((sum, item) => sum + item.delta, 0);
  if (total !== rawScore) throw invalid("facts.score.sum");
  const typePrefix = `TYPE_${compatType.toUpperCase()}_`;
  if (adjustments.some((item) => item.kind === "type" && !item.code.startsWith(typePrefix))) throw invalid("facts.adjustments.type");

  const johuOf = (side, field) => ({
    type: oneOf(side?.type, ["hot", "warm", "neutral", "cool", "cold"], `${field}.type`),
    moist: oneOf(side?.moist, ["wet", "dry", "balanced"], `${field}.moist`),
  });
  const dominantOf = (side, field) => {
    const count = side?.count;
    if (!Number.isInteger(count) || count < 0 || count > 8) throw invalid(`${field}.count`);
    return { element: elementOf(side?.element, `${field}.element`), count };
  };
  const dayOf = (side, pillar, field) => {
    if (side?.gan !== pillar.gan || side?.ji !== pillar.ji) throw invalid(field);
    return { gan: pillar.gan, ji: pillar.ji };
  };
  const dominant = { self: dominantOf(raw.dominantElements?.self, "facts.dominantElements.self"), partner: dominantOf(raw.dominantElements?.partner, "facts.dominantElements.partner") };
  const strength = { self: oneOf(raw.strength?.self, ["strong", "weak"], "facts.strength.self"), partner: oneOf(raw.strength?.partner, ["strong", "weak"], "facts.strength.partner") };
  const yong = isObject(raw.yongshin) ? raw.yongshin : {};
  const yongshin = {
    self: elementList(yong.self, "facts.yongshin.self"), partner: elementList(yong.partner, "facts.yongshin.partner"),
    kijiSelf: elementList(yong.kijiSelf, "facts.yongshin.kijiSelf"), kijiPartner: elementList(yong.kijiPartner, "facts.yongshin.kijiPartner"),
    common: elementList(yong.common, "facts.yongshin.common"), clash: elementList(yong.clash, "facts.yongshin.clash"),
    jong: { self: yong.jong?.self === true, partner: yong.jong?.partner === true },
  };

  const flags = Array.isArray(raw.factFlags) && raw.factFlags.length <= 4 ? raw.factFlags : (() => { throw invalid("facts.factFlags"); })();
  if (new Set(flags).size !== flags.length || flags.some((flag) => !FACT_FLAGS.includes(flag))) throw invalid("facts.factFlags");
  const strengthFlag = strength.self === "strong" && strength.partner === "weak" ? "STRENGTH_SELF_LEADS"
    : strength.self === "weak" && strength.partner === "strong" ? "STRENGTH_PARTNER_LEADS" : "STRENGTH_PEER";
  const keFlag = KE[dominant.self.element] === dominant.partner.element ? "KE_SELF_OVER_PARTNER"
    : KE[dominant.partner.element] === dominant.self.element ? "KE_PARTNER_OVER_SELF" : null;
  const hasReason = (code) => reasonSeen.has(code);
  const expectedFlags = [strengthFlag, keFlag, hasReason("KIJI_CONTROL_FORWARD") ? "KIJI_RELIEF" : null, hasReason("HE_TRAP") ? "HE_TRAP" : null].filter(Boolean);
  if (flags.length !== expectedFlags.length || expectedFlags.some((flag) => !flags.includes(flag))) throw invalid("facts.factFlags.consistency");

  const dayStemHe = STEM_HE.has(self[2].gan + partner[2].gan);
  const dayBranchHe = BRANCH_HE.has(self[2].ji + partner[2].ji);
  const dayStemChong = STEM_CHONG.has(self[2].gan + partner[2].gan);
  const dayBranchChong = BRANCH_CHONG.has(self[2].ji + partner[2].ji);
  if (hasReason("DAY_STEM_HE") !== dayStemHe || hasReason("DAY_BRANCH_HE") !== dayBranchHe
    || hasReason("DAY_STEM_CHONG") !== dayStemChong || hasReason("DAY_BRANCH_CHONG") !== dayBranchChong) throw invalid("facts.reasons.dayRelations");

  const conflictBand = hasReason("HE_TRAP") ? "he_trap" : yongshin.clash.length ? "yongshin_clash" : "calm";
  if (raw.conflictBand !== conflictBand) throw invalid("facts.conflictBand");
  const prescriptionBand = rawScore >= 8 ? "keep" : rawScore >= 3 ? "grow" : rawScore >= -2 ? "communicate" : "survive";
  if (raw.prescriptionBand !== prescriptionBand) throw invalid("facts.prescriptionBand");
  const display = raw.score.display;
  const longTermBand = display >= 80 ? "high" : display >= 65 ? "good" : display >= 50 ? "mid" : "low";
  if (raw.longTermBand !== longTermBand) throw invalid("facts.longTermBand");

  const sok = sokFactsOf(raw.sok, compatType);
  const sokFromAdjustments = adjustments.filter((item) => item.kind === "sok").map((item) => item.code).sort();
  if (JSON.stringify(sokFromAdjustments) !== JSON.stringify(sok.adjustments.map((item) => item.code).sort())) throw invalid("facts.sok.adjustments.consistency");
  delete sok.type;

  const facts = {
    type: compatType,
    score: { raw: rawScore, display },
    grade: { code: raw.grade.code },
    prescriptionBand, longTermBand, conflictBand,
    johu: { self: johuOf(raw.johu?.self, "facts.johu.self"), partner: johuOf(raw.johu?.partner, "facts.johu.partner") },
    dominantElements: dominant,
    dayPillars: { self: dayOf(raw.dayPillars?.self, self[2], "facts.dayPillars.self"), partner: dayOf(raw.dayPillars?.partner, partner[2], "facts.dayPillars.partner") },
    strength, yongshin, factFlags: expectedFlags, reasons, adjustments, sok,
    pastLife: pastLifeFactsOf(raw.pastLife, self, partner),
  };
  return { compatType, partnerName: cleanPartnerName(body.partnerName), self: { pillars: self }, partner: { pillars: partner }, facts };
}

/** 같은 조건(유형·이름·두 사람 기둥·프롬프트 버전)의 결과를 알아보는 해시. 결제 전 중복 안내용. */
export function sajuCompatInputHash(input) {
  const pillars = (side) => side.pillars.map((pillar) => pillar.gan + pillar.ji).join("");
  return createHash("sha256")
    .update([SAJU_COMPAT_PROMPT_VERSION, input.compatType, input.partnerName, pillars(input.self), pillars(input.partner)].join("|"))
    .digest("hex").slice(0, 32);
}

// ---------------------------------------------------------------------------------------------
// 그룹 필드 명세 — 프롬프트·정제·완결 판정이 모두 이 목록을 따른다.
// ---------------------------------------------------------------------------------------------
// target: 프롬프트에 주는 목표 글자 수(공백 제외), cap: 이를 넘으면 문장 경계에서 결정적으로 자른다(거부 아님).
const text = (path, target, when) => ({ path, kind: "text", target, cap: Math.round(target * 1.7), when });
const list = (path, count, target) => ({ path, kind: "list", count, target, cap: Math.round(target * 1.7) });

const CORE_FIELDS = [
  text("overview", 400), text("gradeComment", 220),
  text("energyHarmony.johu", 350), text("energyHarmony.elements", 300), text("energyHarmony.season", 220), text("energyHarmony.tenGods", 220, "tenGods"),
  text("detailCards.emotionRhythm", 300), text("detailCards.conflictSwitch", 300), text("detailCards.realOps", 300), text("detailCards.longTerm", 300),
];
const PRACTICE_FIELDS = [
  text("reality.strength", 220), text("reality.ke", 200, "ke"), text("reality.kijiRelief", 200, "kijiRelief"), text("reality.heTrap", 200, "heTrap"),
  text("reality.repeatScene", 220), text("reality.recovery", 220),
  text("loveMarriage.emotion", 200, "love"), text("loveMarriage.conflict", 200, "love"), text("loveMarriage.home", 200, "love"), text("loveMarriage.growth", 200, "love"),
  text("prescription.gradeAdvice", 240), text("prescription.typeSecret", 240), text("prescription.conflictRoutine", 240), text("prescription.growthGoal", 200),
];
const PAST_LIFE_FIELDS = [
  text("pastLife.gradeDesc", 250), text("pastLife.crossReadings.selfToPartner", 220), text("pastLife.crossReadings.partnerToSelf", 220),
  text("pastLife.story", 450), text("pastLife.prescription", 250), list("pastLife.questions", 3, 70),
];
const REASON_DETAIL_TARGET = 170;

function applies(when, input) {
  if (!when) return true;
  const { facts } = input;
  if (when === "love") return input.compatType === "love";
  if (when === "tenGods") return Boolean(facts.sok.tenGods.self || facts.sok.tenGods.partner);
  if (when === "ke") return facts.factFlags.some((flag) => flag.startsWith("KE_"));
  if (when === "kijiRelief") return facts.factFlags.includes("KIJI_RELIEF");
  if (when === "heTrap") return facts.factFlags.includes("HE_TRAP");
  return true;
}

/** 이 입력에서 그룹이 만들어야 하는 필드와, 해당 없음(null 고정)인 필드. */
export function groupFields(group, input) {
  const base = group === "core" ? CORE_FIELDS : group === "practice" ? PRACTICE_FIELDS : group === "pastLife" ? PAST_LIFE_FIELDS
    : input.facts.reasons.map((reason) => text(`reasonDetails.${reason.code}`, REASON_DETAIL_TARGET));
  return { required: base.filter((spec) => applies(spec.when, input)), notApplicable: base.filter((spec) => !applies(spec.when, input)).map((spec) => spec.path) };
}

/** 서술이 필요한 그룹만 task 로 만든다(근거 코드가 하나도 없으면 reasons 그룹은 생략). */
export function sajuCompatTasks(input) {
  return SAJU_COMPAT_GROUPS.map((group) => {
    const { required } = groupFields(group, input);
    if (!required.length) return null;
    const target = required.reduce((sum, spec) => sum + spec.target * (spec.count || 1), 0);
    // 엔진의 minChars 는 1(완결된 part 는 받는다). 분량 미달은 거부가 아니라 produce 가 한 번 보강을 요청하는
    // 신호이고(SAJU_COMPAT_SHORTFALL_RATIO), 보강본·마지막 시도는 분량으로 거부하지 않는다(원칙 17).
    return { id: group, minChars: 1, targetChars: target };
  }).filter(Boolean);
}

/** 이 비율 미만이면 1차 시도를 "분량 부족"으로 보고 한 번 보강을 요청한다(거부 아님). */
export const SAJU_COMPAT_SHORTFALL_RATIO = 0.6;

export const groupTargetChars = (group, input) => groupFields(group, input).required.reduce((sum, spec) => sum + spec.target * (spec.count || 1), 0);

// Use the same field registry for Gemini's structural contract and local validation.
export function sajuCompatResponseSchema(group, input) {
  const root = { type: "OBJECT", properties: {}, required: [] };
  for (const spec of groupFields(group, input).required) {
    const keys = spec.path.split(".");
    let node = root;
    for (const key of keys.slice(0, -1)) {
      if (!node.properties[key]) {
        node.properties[key] = { type: "OBJECT", properties: {}, required: [] };
        node.required.push(key);
      }
      node = node.properties[key];
    }
    const key = keys.at(-1);
    node.properties[key] = spec.kind === "list" ? { type: "ARRAY", items: { type: "STRING" } } : { type: "STRING" };
    node.required.push(key);
  }
  return root;
}

// ---------------------------------------------------------------------------------------------
// 파싱·정제·린트 (거부 대신 결정적 교정)
// ---------------------------------------------------------------------------------------------
const getPath = (object, path) => path.split(".").reduce((node, key) => (isObject(node) ? node[key] : undefined), object);
function setPath(object, path, value) {
  const keys = path.split(".");
  let node = object;
  for (const key of keys.slice(0, -1)) node = isObject(node[key]) ? node[key] : (node[key] = {});
  node[keys.at(-1)] = value;
}

/** LLM 응답 문자열 → 객체. 코드펜스·앞뒤 군말·잘린 JSON 을 복구한다. */
export function parseSajuCompatResponse(textValue, salvage) {
  const source = String(textValue || "").trim();
  if (!source) return null;
  const candidates = [source];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const first = source.indexOf("{");
  const last = source.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(source.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isObject(parsed)) return parsed;
    } catch { /* 다음 후보 */ }
  }
  const salvaged = typeof salvage === "function" ? salvage(source) : null;
  return isObject(salvaged) ? salvaged : null;
}

// 문장 끝 + 따옴표·괄호. 소수점(3.5)은 뒤에 공백이나 끝이 아니므로 문장 경계가 아니다.
const SENTENCE_RE = /[^\n]*?[.!?。？！]+["'”’)\]」』]*(?=\s|$)\s*|[^\n]+$/gu;
const sentencesOf = (paragraph) => paragraph.match(SENTENCE_RE) || [];

const SOFT_WORDS = [[/반드시/g, "되도록"], [/무조건/g, "가급적"], [/틀림없이/g, "아마도"], [/확실히/g, "대체로"]];
// 공포·확정 예언·결과 보장·단정. 문장 단위로 제거한다(제거 수는 meta.lintDrops).
const FORBIDDEN_RES = [
  /(헤어지게\s*됩니다|헤어질\s*수밖에|이혼하게\s*됩니다|이별하게\s*됩니다|결별하게\s*됩니다|파경|파탄)/u,
  /(운명(이라|이므로|이기에|적으로)[^.。!?]*(벗어날|피할)\s*수\s*없|숙명|저주|재앙|흉운|액운|불길)/u,
  /(업보|악연)[^.。!?]*(벗어날|피할|끊을)\s*수\s*없/u,
  /(사망|죽음|죽게|자살|암에\s*걸|큰\s*병)/u,
  /(병원에\s*가|약을\s*먹|치료를\s*받|진단을\s*받|소송|고소하|주식|투자하세요|대출)/u,
  /(100\s*%|백\s*퍼센트)\s*(확실|성공|보장|맞)/u,
];
// 엔진이 계산하지 않은(= 근거로 주지 않은) 사주 요소.
const UNPROVIDED_RE = /(대운|세운|월운|연운|삼합|방합|반합|삼형|상형|자형|육해|육파|원진|귀문|천을귀인|도화|역마|화개|공망|백호|양인|괴강|신살|납음|격국|십이운성|12운성|지장간|시주|시지|월주)/u;

// 엔진의 hasRepeatedReportPassage 는 JSON 본문을 . ! ? 。 ？ ！ 줄바꿈 으로 자른 조각을 reportSentenceKey 로 비교한다.
// 문장 끝 따옴표·괄호가 다음 조각 앞에 붙는 차이까지 잡도록 같은 방식으로 조각을 자르고 가장자리 따옴표를 뗀다.
// 엔진 기준(24자)보다 낮은 20자부터 중복으로 본다(앞에 붙는 따옴표·이스케이프 몇 글자 차이 흡수).
const FRAGMENT_EDGE_RE = /^[\s"'“”‘’()\[\]「」『』]+|[\s"'“”‘’()\[\]「」『』]+$/gu;
const FRAGMENT_MIN_KEY = 20;
function fragmentKeys(sentence) {
  return String(sentence || "").split(/[.!?。？！\n]+/u)
    .map((fragment) => reportSentenceKey(fragment.replace(FRAGMENT_EDGE_RE, "")))
    .filter((key) => key.length >= FRAGMENT_MIN_KEY);
}

const compact = (value) => Array.from(String(value || "").replace(/\s/gu, "")).length;
const hangulCount = (value) => (String(value || "").match(/[가-힣]/gu) || []).length;

function numbersMismatch(sentence, input) {
  const allowedScores = new Set([100, input.facts.score.display, input.facts.score.raw, Math.abs(input.facts.score.raw)]);
  for (const match of sentence.matchAll(/(\d{1,3}(?:\.\d)?)\s*(?:점|\/\s*100)/gu)) if (!allowedScores.has(Number(match[1]))) return true;
  const allowedGrades = new Set([input.facts.grade.code, input.facts.pastLife.grade.code]);
  for (const match of sentence.matchAll(/(?<![A-Za-z])([SABCDF])\s*급/gu)) if (!allowedGrades.has(match[1])) return true;
  return false;
}

function paragraphize(sentences) {
  const paragraphs = [];
  let current = "";
  sentences.forEach((sentence, index) => {
    current += sentence;
    if (compact(current) >= 150 && index < sentences.length - 1) { paragraphs.push(current.trim()); current = ""; }
  });
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs.join("\n\n");
}

/**
 * 한 필드의 문자열을 정제한다. 서식 제거 → 부드러운 단어 치환 → 문장 단위 린트·중복 제거 → 상한 절단.
 * seen 은 앞선 필드·앞선 part 의 문장 키(24자 이상)이며 이 호출이 새 문장을 추가한다.
 */
function shapeText(value, spec, input, seen, stats) {
  if (typeof value !== "string") return "";
  let cleaned = value.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[*_`#>|~]/g, "")
    .replace(/^\s*(?:[-•]\s+|\d+[.)]\s+)/gmu, "").replace(/[ \t]+/g, " ");
  for (const [pattern, replacement] of SOFT_WORDS) cleaned = cleaned.replace(pattern, replacement);
  const kept = [];
  let size = 0;
  for (const paragraph of cleaned.split(/\n+/).map((line) => line.trim()).filter(Boolean)) {
    for (const raw of sentencesOf(paragraph)) {
      const sentence = raw.trim();
      if (!sentence) continue;
      if (FORBIDDEN_RES.some((pattern) => pattern.test(sentence)) || UNPROVIDED_RE.test(sentence) || numbersMismatch(sentence, input)) { stats.lintDrops += 1; continue; }
      const keys = fragmentKeys(sentence);
      if (keys.some((key) => seen.has(key))) { stats.dedupeDrops += 1; continue; }
      if (size + compact(sentence) > spec.cap && kept.length) { stats.truncated += 1; break; }
      keys.forEach((key) => seen.add(key));
      kept.push(`${sentence} `);
      size += compact(sentence);
    }
  }
  let out = paragraphize(kept.map((sentence) => sentence));
  if (compact(out) > spec.cap) {
    // 문장 하나가 상한을 넘는 경우: 상한 글자 수에서 자르고 말줄임표를 붙인다.
    out = `${Array.from(out).slice(0, spec.cap).join("").trimEnd()}…`;
    stats.truncated += 1;
  }
  return out;
}

/**
 * 파싱된 응답 → 그룹 값. 해당 없음 필드는 null 로 고정하고, 필수 필드의 결손(없음·너무 짧음·한글 없음)은
 * missing 에 모은다. seen 은 앞선 part 에서 이미 쓴 문장 키 집합(복사본을 넘긴다).
 */
export function shapeSajuCompatGroup(group, parsed, input, seen = new Set()) {
  const { required, notApplicable } = groupFields(group, input);
  const value = {};
  const missing = [];
  const stats = { lintDrops: 0, dedupeDrops: 0, truncated: 0 };
  const known = repairJsonFieldLocations(isObject(parsed) ? parsed : {}, sajuCompatResponseSchema(group, input));
  for (const path of notApplicable) setPath(value, path, null);
  for (const spec of required) {
    if (spec.kind === "list") {
      const items = [];
      for (const item of (Array.isArray(getPath(known, spec.path)) ? getPath(known, spec.path) : []).slice(0, spec.count)) {
        const shaped = shapeText(item, spec, input, seen, stats).replace(/\n+/g, " ").trim();
        if (compact(shaped) >= QUESTION_MIN_CHARS && hangulCount(shaped) >= 4) items.push(shaped);
      }
      setPath(value, spec.path, items);
      if (!items.length) missing.push(spec.path);
      continue;
    }
    const shaped = shapeText(getPath(known, spec.path), spec, input, seen, stats);
    const ok = compact(shaped) >= FIELD_MIN_CHARS && hangulCount(shaped) >= 8;
    setPath(value, spec.path, ok ? shaped : "");
    if (!ok) missing.push(spec.path);
  }
  return { value, missing, stats, required: required.map((spec) => spec.path) };
}

/**
 * 1차 시도의 부분 결과(other)와 2차 시도 결과(preferred)를 필드별로 합친다. 채워진 쪽을, 둘 다면 더 긴 쪽을 고르고(같으면 preferred),
 * 합친 값을 다시 정제해 두 시도 사이의 반복 문장을 제거한다. 통계는 세 번의 합이다.
 */
export function mergeSajuCompatShaped(group, input, preferred, other, seen = new Set()) {
  const { required } = groupFields(group, input);
  const filled = (spec, value) => (spec.kind === "list"
    ? Array.isArray(value) && value.length > 0
    : typeof value === "string" && compact(value) >= FIELD_MIN_CHARS && hangulCount(value) >= 8);
  const merged = {};
  for (const spec of required) {
    const a = getPath(preferred?.value, spec.path);
    const b = getPath(other?.value, spec.path);
    let chosen;
    if (spec.kind === "list") chosen = (Array.isArray(a) ? a.length : 0) >= (Array.isArray(b) ? b.length : 0) ? a : b;
    else if (filled(spec, a) && filled(spec, b)) chosen = compact(b) > compact(a) ? b : a;
    else chosen = filled(spec, a) ? a : filled(spec, b) ? b : a;
    setPath(merged, spec.path, chosen);
  }
  const reshaped = shapeSajuCompatGroup(group, merged, input, seen);
  const sum = (key) => (preferred?.stats?.[key] || 0) + (other?.stats?.[key] || 0) + reshaped.stats[key];
  return { ...reshaped, stats: { lintDrops: sum("lintDrops"), dedupeDrops: sum("dedupeDrops"), truncated: sum("truncated") } };
}

/** 정제된 그룹 결과가 채운 필수 필드의 글자 수(공백 제외). */
export function sajuCompatShapedChars(group, input, shaped) {
  return groupFields(group, input).required.reduce((sum, spec) => {
    const value = getPath(shaped?.value, spec.path);
    return sum + compact(Array.isArray(value) ? value.join("") : value);
  }, 0);
}

/** 이미 확정된 part 들의 본문 문장 키(24자 이상). 새 part 가 같은 문장을 반복하지 않게 한다. */
export function sajuCompatSeenKeys(parts) {
  const seen = new Set();
  for (const part of Object.values(parts || {})) {
    const parsed = parsePart(part);
    if (!parsed) continue;
    const { _meta, ...rest } = parsed;
    const walk = (node) => {
      if (typeof node === "string") {
        for (const paragraph of node.split(/\n+/)) for (const sentence of sentencesOf(paragraph)) fragmentKeys(sentence).forEach((key) => seen.add(key));
      } else if (Array.isArray(node)) node.forEach(walk);
      else if (isObject(node)) Object.values(node).forEach(walk);
    };
    walk(rest);
  }
  return seen;
}

// ---------------------------------------------------------------------------------------------
// part 본문(JSON 문자열) — 엔진이 part 단위로 저장·완결 판정·반복 검사를 한다.
// ---------------------------------------------------------------------------------------------
/**
 * _meta 를 맨 앞에 둔다. 엔진의 반복 문단 검사는 JSON 문자열을 마침표 단위로 자르므로, 메타(고유한 at)가
 * 첫 문장과 같은 조각으로 묶이면 서로 다른 part 의 머리말이 우연히 겹칠 일이 없다. at 은 소수점 없는 초 단위.
 */
const encodePath = (path) => String(path).replaceAll(".", "/");
const decodePath = (path) => String(path).replaceAll("/", ".");

export function buildSajuCompatPart(group, shaped, { model = "", at = Math.floor(Date.now() / 1000), attempt = 1 } = {}) {
  const meta = {
    g: group, v: SAJU_COMPAT_SCHEMA_VERSION, p: SAJU_COMPAT_PROMPT_VERSION, m: String(model || "").replace(/\./g, "_"),
    at, a: attempt, req: shaped.required.map(encodePath), ld: shaped.stats.lintDrops, dd: shaped.stats.dedupeDrops, tr: shaped.stats.truncated,
    ...(shaped.missing.length ? { miss: shaped.missing.map(encodePath) } : {}),
  };
  return JSON.stringify({ _meta: meta, ...shaped.value });
}

export function parsePart(body) {
  if (typeof body !== "string") return null;
  try {
    const parsed = JSON.parse(body);
    return isObject(parsed) && isObject(parsed._meta) ? parsed : null;
  } catch { return null; }
}

const textAt = (parsed, path) => {
  const value = getPath(parsed, path);
  return Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : "";
};
const isFilled = (parsed, path) => {
  const value = getPath(parsed, path);
  if (Array.isArray(value)) return value.length > 0 && value.every((item) => typeof item === "string" && compact(item) >= QUESTION_MIN_CHARS);
  return typeof value === "string" && compact(value) >= FIELD_MIN_CHARS && hangulCount(value) >= 8;
};
const maxHoles = (required) => Math.max(2, Math.floor(required.length * 0.34));

/**
 * 엔진의 completeBody: 구조가 완결인가. 필수 경로는 채워졌거나 _meta.miss 에 기록돼 있어야 하고,
 * 기록된 결손은 허용 한도(필수의 약 1/3, 최소 2) 이하여야 한다. 분량 자체는 거부 사유가 아니다.
 * 결손이 있는 part 를 받아들일지는 produce 가 시도 횟수로 정한다(1차 시도는 null 로 재시도).
 */
export function completeSajuCompatPart(body) {
  const parsed = parsePart(body);
  const meta = parsed?._meta;
  if (!meta || !SAJU_COMPAT_GROUPS.includes(meta.g) || meta.v !== SAJU_COMPAT_SCHEMA_VERSION || !Array.isArray(meta.req) || !meta.req.length) return false;
  const required = meta.req.map(decodePath);
  const missing = Array.isArray(meta.miss) ? meta.miss.map(decodePath) : [];
  if (missing.some((path) => !required.includes(path)) || missing.length > maxHoles(required)) return false;
  return required.every((path) => missing.includes(path) || isFilled(parsed, path));
}

/** 엔진의 measureBody: 읽는 글자 수(공백 제외). 미완결 part 는 0 이라 minChars 경로로도 받아들여지지 않는다. */
export function measureSajuCompatPart(body) {
  if (!completeSajuCompatPart(body)) return 0;
  const parsed = parsePart(body);
  return parsed._meta.req.reduce((sum, path) => sum + countPaidReportBodyChars(textAt(parsed, decodePath(path))), 0);
}

// ---------------------------------------------------------------------------------------------
// 스냅샷 조립 — 완료 시 metadata.result 로 한 번 기록되고 이후 읽기 전용이다.
// ---------------------------------------------------------------------------------------------
export function assembleSajuCompatSnapshot(state) {
  const input = state.input;
  const narrative = {};
  const metas = [];
  for (const task of state.tasks || []) {
    const parsed = parsePart(state.parts?.[task.id]);
    if (!parsed) continue;
    const { _meta, ...rest } = parsed;
    metas.push(_meta);
    for (const [key, value] of Object.entries(rest)) narrative[key] = isObject(value) && isObject(narrative[key]) ? { ...narrative[key], ...value } : value;
  }
  const at = Math.max(0, ...metas.map((meta) => Number(meta.at) || 0));
  const model = metas.map((meta) => String(meta.m || "").replace(/_/g, ".")).find(Boolean) || "";
  return {
    schemaVersion: SAJU_COMPAT_SCHEMA_VERSION,
    type: SAJU_COMPAT_TYPE,
    promptVersion: SAJU_COMPAT_PROMPT_VERSION,
    model,
    generatedAt: at ? new Date(at * 1000).toISOString() : null,
    locale: "ko",
    input: { compatType: input.compatType, partnerName: input.partnerName, self: input.self, partner: input.partner },
    facts: input.facts,
    narrative,
    meta: {
      groups: metas.length,
      lintDrops: metas.reduce((sum, meta) => sum + (Number(meta.ld) || 0), 0),
      dedupeDrops: metas.reduce((sum, meta) => sum + (Number(meta.dd) || 0), 0),
      missing: metas.flatMap((meta) => (meta.miss || []).map(decodePath)),
      inputHash: sajuCompatInputHash(input),
    },
  };
}
