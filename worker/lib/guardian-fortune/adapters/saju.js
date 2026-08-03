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

function summarizeDistribution(value, label) {
  const entries = objectText(value, 5);
  return entries.length ? `${label}은 ${entries.join(", ")} 흐름으로 읽힙니다.` : undefined;
}

function buildCautions(raw) {
  const candidates = [
    ...arrayText(raw?.cautions),
    nonEmptyText(raw?.unfavorableGod),
    nonEmptyText(raw?.relationSummary),
    nonEmptyText(raw?.seasonalBalance?.caution),
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
  });

  const dayMaster = nonEmptyText(raw?.dayMaster, 80);
  const fiveElementsSummary = summarizeDistribution(raw?.fiveElements, "오행");
  const tenGodsSummary = summarizeDistribution(raw?.tenGods, "십성");
  const currentFlow = nonEmptyText(raw?.yearlyLuck?.summary)
    || nonEmptyText(raw?.yearlyLuck?.message)
    || nonEmptyText(raw?.fortuneFacts?.currentFlow)
    || nonEmptyText(raw?.relationSummary);
  const seasonSummary = nonEmptyText(raw?.seasonalBalance?.summary)
    || nonEmptyText(raw?.seasonalBalance?.caution)
    || nonEmptyText(raw?.monthBranchSummary)
    || nonEmptyText(raw?.monthPillarSummary);
  const relationSummary = nonEmptyText(raw?.relationSummary);

  if (!dayMaster && !fiveElementsSummary && !tenGodsSummary && !currentFlow) {
    const error = new Error("SAJU_PROJECTION_EMPTY");
    error.code = "SAJU_PROJECTION_EMPTY";
    throw error;
  }

  const focus = TOPIC_FOCUS[input.topic] || TOPIC_FOCUS.daily;
  return {
    dayMaster,
    tenGodsSummary: tenGodsSummary || `십성은 ${focus}를 살펴보는 단서로 사용합니다.`,
    fiveElementsSummary: fiveElementsSummary || "오행의 균형은 행동의 속도와 회복 리듬을 살펴보는 단서입니다.",
    currentFlow: currentFlow || `${focus}에 에너지를 나누어 쓰는 흐름입니다.`,
    seasonSummary: seasonSummary ? `월지와 계절감은 ${text(seasonSummary, 160)} 흐름으로 참고합니다.` : undefined,
    relationSummary: relationSummary ? `합충형파해와 관계 단서는 ${text(relationSummary, 160)} 쪽으로 읽습니다.` : undefined,
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
