import { pickExpertFields } from "../expert-evidence.js";
import { calculateLifeBookAiSaju } from "../../life-book-ai-saju.js";
import { arrayText, nonEmptyText, objectText, text } from "../../guardian-fortune-adapter-utils.js";

const TOPIC_FOCUS = {
  daily: "오늘의 속도와 에너지 배분",
  love: "관계에서 표현하고 기다리는 방식",
  money_work: "일의 우선순위와 결과를 만드는 힘",
  relationship: "사람 사이에서 역할과 거리감을 조절하는 방식",
  mind: "생각과 감정을 소모하는 패턴",
  decision: "선택 앞에서 기준과 책임을 세우는 방식",
};

function summarizeDistribution(value, label, maxItems = 5) {
  const entries = objectText(value, maxItems);
  return entries.length ? `${label}은 ${entries.join(", ")} 흐름으로 읽힙니다.` : undefined;
}

// 엔진은 문자열 대신 객체·배열을 돌려주는 필드가 많다. 문자열일 때만 그대로 쓰고,
// 객체를 String() 으로 흘려 "[object Object]" 가 프롬프트에 들어가지 않게 한다.
function plainText(value, max = 220) {
  return typeof value === "string" || typeof value === "number" ? nonEmptyText(value, max) : undefined;
}

function labelList(value, max = 4) {
  return Array.isArray(value) ? value.map((item) => nonEmptyText(item, 40)).filter(Boolean).slice(0, max) : [];
}

function describeRelations(value) {
  const legacy = plainText(value, 160);
  if (legacy) return `합충형파해와 관계 단서는 ${legacy} 쪽으로 읽습니다.`;
  if (!value || typeof value !== "object") return undefined;
  const support = labelList(value.supportLabels);
  const tension = labelList(value.tensionLabels);
  if (!support.length && !tension.length) {
    const pattern = plainText(value.mainPattern, 80);
    return pattern ? `원국의 합충형파해는 ${pattern}입니다.` : undefined;
  }
  const supportText = support.length ? `합으로 묶이는 단서는 ${support.join("·")}` : "합으로 묶이는 단서는 두드러지지 않고";
  const tensionText = tension.length ? `충·형·파·해의 긴장 단서는 ${tension.join("·")}입니다.` : "충·형·파·해의 긴장 단서는 두드러지지 않습니다.";
  return `원국에서 ${supportText}${support.length ? "이고" : ""}, ${tensionText}`;
}

function relationCaution(value) {
  const legacy = plainText(value);
  if (legacy) return legacy;
  const tension = labelList(value?.tensionLabels, 3);
  return tension.length ? `원국의 ${tension.join("·")}은 부딪히는 기운이라, 관계와 일정이 겹칠 때 마찰을 먼저 살핍니다.` : undefined;
}

function describeSeason(value) {
  const legacy = plainText(value?.summary, 160) || plainText(value?.caution, 160);
  if (legacy) return `월지와 계절감은 ${legacy} 흐름으로 참고합니다.`;
  if (!value || typeof value !== "object") return undefined;
  const month = [plainText(value.season, 8), plainText(value.monthBranch, 8) ? `월지 ${plainText(value.monthBranch, 8)}` : ""].filter(Boolean).join(" ");
  const climate = plainText(value.climate, 60);
  const state = plainText(value.dayMasterSeasonalState, 100);
  // 엔진은 adjustment 자리에 희용신 설명 전체(여러 문장)를 넣는다. 첫 문장만 근거로 쓴다.
  const adjustment = plainText(String(plainText(value.adjustment, 400) || "").split(/(?<=[.!?])\s/)[0], 140);
  const parts = [
    climate ? `${month ? `${month}의 ` : ""}계절감은 ${climate}입니다.` : (month ? `${month}의 계절감을 참고합니다.` : ""),
    state || "",
    adjustment ? `조후 보완: ${adjustment}` : "",
  ].filter(Boolean);
  return parts.length ? text(parts.join(" "), 320) : undefined;
}

function describeCurrentFlow(raw, targetYear) {
  const legacy = plainText(raw?.yearlyLuck?.summary) || plainText(raw?.yearlyLuck?.message) || plainText(raw?.fortuneFacts?.currentFlow);
  if (legacy) return legacy;
  const years = Array.isArray(raw?.yearlyLuck) ? raw.yearlyLuck : [];
  const index = Math.max(0, years.findIndex((entry) => Number(entry?.year) === targetYear));
  const yearText = (entry) => entry?.pillar
    ? `${entry.year}년 세운 ${text(entry.pillar, 8)}${entry.stemTenGod ? `(천간 ${text(entry.stemTenGod, 8)})` : ""}`
    : "";
  const cycle = raw?.majorLuck?.currentCycle;
  const cycleNotes = [
    cycle?.startAge !== undefined && cycle?.endAge !== undefined ? `${cycle.startAge}~${cycle.endAge}세` : "",
    cycle?.stemTenGod ? `천간 ${text(cycle.stemTenGod, 8)}` : "",
  ].filter(Boolean);
  const parts = [
    cycle?.pillar ? `현재 대운은 ${text(cycle.pillar, 8)}${cycleNotes.length ? `(${cycleNotes.join(", ")})` : ""}` : "",
    yearText(years[index]),
    yearText(years[index + 1]) ? `다음 해는 ${yearText(years[index + 1])}` : "",
  ].filter(Boolean);
  return parts.length ? `${parts.join(", ")}의 흐름입니다.` : plainText(raw?.relationSummary);
}

function buildCautions(raw) {
  const candidates = [
    ...arrayText(raw?.cautions),
    plainText(raw?.unfavorableGod),
    relationCaution(raw?.relationSummary),
    plainText(raw?.seasonalBalance?.caution),
  ].filter(Boolean);
  return candidates.slice(0, 3);
}

export async function buildSajuAdapter(input, options = {}) {
  const calculate = options.calculator || calculateLifeBookAiSaju;
  const raw = await calculate({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthTimeUnknown: !input.hasBirthTime,
    calendarType: input.calendarType,
    gender: input.gender,
    birthPlace: input.birthPlace,
    isLeapMonth: input.isLeapMonth || input.leapMonth,
  }, options.fusionExpert ? { now: options.now } : {});

  const dayMaster = nonEmptyText(raw?.dayMaster, 80);
  const fiveElementsSummary = summarizeDistribution(raw?.fiveElements, "오행");
  // 십성은 열 개가 한 묶음이다. 앞 다섯 개만 남기면 식신·상관 같은 축이 통째로 빠진다.
  const tenGodsSummary = summarizeDistribution(raw?.tenGods, "십성", 10);
  const targetYear = Number(String(input.targetDate || "").slice(0, 4)) || new Date().getFullYear();
  const currentFlow = describeCurrentFlow(raw, targetYear);
  const legacyMonth = plainText(raw?.monthBranchSummary, 160) || plainText(raw?.monthPillarSummary, 160);
  const seasonSummary = describeSeason(raw?.seasonalBalance)
    || (legacyMonth ? `월지와 계절감은 ${legacyMonth} 흐름으로 참고합니다.` : undefined);
  const relationSummary = describeRelations(raw?.relationSummary);

  if (!dayMaster && !fiveElementsSummary && !tenGodsSummary && !currentFlow) {
    const error = new Error("SAJU_PROJECTION_EMPTY");
    error.code = "SAJU_PROJECTION_EMPTY";
    throw error;
  }

  const focus = TOPIC_FOCUS[input.topic] || TOPIC_FOCUS.daily;
  return {
    ...(options.fusionExpert ? { expertEvidence: {
      ...pickExpertFields(raw, ["usefulGod", "unfavorableGod", "majorLuck", "yearlyLuck", "natalInteractions", "seasonalBalance"]),
      gyeokguk: raw.advancedFactors?.gyeokguk,
      hiddenStemExposures: raw.advancedFactors?.hiddenStemExposures,
    } } : {}),
    pillars: {year:raw.yearPillar,month:raw.monthPillar,day:raw.dayPillar,hour:raw.hourPillar || null},
    calculationMeta: raw.calculationMeta,
    dayMaster,
    tenGodsSummary: tenGodsSummary || `십성은 ${focus}를 살펴보는 단서로 사용합니다.`,
    fiveElementsSummary: fiveElementsSummary || "오행의 균형은 행동의 속도와 회복 리듬을 살펴보는 단서입니다.",
    currentFlow: currentFlow || `${focus}에 에너지를 나누어 쓰는 흐름입니다.`,
    seasonSummary,
    relationSummary,
    personalityHook: dayMaster
      ? `${dayMaster}의 기질이 ${focus}에서 드러나며, 마음속 기준을 현실의 행동으로 옮기려는 힘이 있습니다.`
      : `${focus}에서 생각보다 행동의 순서가 중요하게 작동하는 흐름입니다.`,
    cautions: buildCautions(raw),
    evidence: [
      dayMaster ? "saju.dayMaster" : null,
      fiveElementsSummary ? "saju.fiveElements" : null,
      tenGodsSummary ? "saju.tenGods" : null,
      seasonSummary ? "saju.season" : null,
      relationSummary ? "saju.relation" : null,
      input.hasBirthTime ? null : "saju.birth_time_unknown",
    ].filter(Boolean),
    source: text(raw?.calculationMeta?.method || "saju-core", 80),
  };
}
