import { calculateZiweiAiChart } from "../../ziwei-ai-chart.js";
import { arrayText, nonEmptyText, text } from "../../guardian-fortune-adapter-utils.js";

const TOPIC_PALACE_ALIASES = {
  daily: ["명궁", "命宮"],
  love: ["부처궁", "夫妻", "배우자"],
  money_work: ["재백궁", "財帛", "관록궁", "官祿"],
  relationship: ["명궁", "命宮", "부처궁", "夫妻"],
  mind: ["복덕궁", "福德", "명궁", "命宮"],
  decision: ["명궁", "命宮", "관록궁", "官祿"],
};

function findTopicPalace(palaces, topic) {
  if (!Array.isArray(palaces) || palaces.length === 0) return null;
  const aliases = TOPIC_PALACE_ALIASES[topic] || TOPIC_PALACE_ALIASES.daily;
  return palaces.find((palace) => aliases.some((alias) => String(palace?.name || "").includes(alias))) || palaces[0];
}

function palaceSummary(palace) {
  if (!palace) return undefined;
  const name = nonEmptyText(palace.name, 80);
  const stars = [
    ...(Array.isArray(palace.mainStars) ? palace.mainStars : []),
    ...(Array.isArray(palace.assistantStars) ? palace.assistantStars : []),
  ].map((star) => text(star, 60)).filter(Boolean).slice(0, 5);
  if (!name && stars.length === 0) return undefined;
  return `${name || "관련 궁"}${stars.length ? `에 ${stars.join(", ")} 흐름이 보입니다.` : "을 중심으로 읽을 수 있습니다."}`;
}

export async function buildZiweiAdapter(input, options = {}) {
  if (!input.hasBirthTime) {
    const error = new Error("ZIWEI_BIRTH_TIME_REQUIRED");
    error.code = "BIRTH_TIME_UNKNOWN";
    throw error;
  }

  const calculate = options.calculator || calculateZiweiAiChart;
  const raw = await calculate({
    birthInfo: {
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthTimeUnknown: false,
      calendarType: input.calendarType,
      gender: input.gender,
    },
  }, { year: Number(input.targetDate.slice(0, 4)) });

  const lifePalaceSummary = palaceSummary(
    Array.isArray(raw?.palaces) ? raw.palaces.find((palace) => String(palace?.name || "").includes("명궁") || String(palace?.name || "").includes("命宮")) : null,
  ) || palaceSummary(raw?.palaces?.[0]) || nonEmptyText(raw?.chartSummary);
  const topicPalaceSummary = palaceSummary(findTopicPalace(raw?.palaces, input.topic));
  const keyStars = arrayText(raw?.keyFeatures?.keyStars || raw?.mainStars, 6);
  const strengths = [
    keyStars.length ? `주요 별의 흐름은 ${keyStars.join(", ")}로 정리됩니다.` : "명궁과 관련 궁의 연결을 중심으로 방향을 읽습니다.",
    nonEmptyText(raw?.chartSummary),
  ].filter(Boolean).slice(0, 3);
  const cautions = raw?.uncertainty?.note ? ["출생 시각이 정확할수록 궁과 별의 해석이 더 세밀해집니다."] : [];

  if (!lifePalaceSummary && !topicPalaceSummary && !keyStars.length) {
    const error = new Error("ZIWEI_PROJECTION_EMPTY");
    error.code = "ZIWEI_PROJECTION_EMPTY";
    throw error;
  }

  return {
    lifePalaceSummary,
    topicPalaceSummary,
    keyStarsSummary: keyStars.length ? `주요 별은 ${keyStars.join(", ")}의 결로 나타납니다.` : undefined,
    strengths,
    cautions,
    evidence: [
      lifePalaceSummary ? "ziwei.lifePalace" : null,
      topicPalaceSummary ? `ziwei.${input.topic}.palace` : null,
      keyStars.length ? "ziwei.keyStars" : null,
    ].filter(Boolean),
  };
}
