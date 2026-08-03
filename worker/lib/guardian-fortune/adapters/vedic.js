import { calculateVedicAiChart } from "../../vedic-ai-chart.js";
import { nonEmptyText, text } from "../../guardian-fortune-adapter-utils.js";

export async function buildVedicAdapter(input, options = {}) {
  if (!input.hasBirthPlace) {
    const error = new Error("VEDIC_BIRTH_PLACE_REQUIRED");
    error.code = "BIRTH_PLACE_REQUIRED";
    throw error;
  }

  const calculate = options.calculator || calculateVedicAiChart;
  const raw = await calculate(
    options.env,
    {
      birthInfo: {
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        birthTimeUnknown: !input.hasBirthTime,
        calendarType: input.calendarType,
        gender: input.gender,
        birthPlace: input.birthPlace,
      },
    },
    { requestUrl: options.requestUrl, now: options.now },
  );

  const moon = raw?.moon || {};
  const moonNakshatra = raw?.moonNakshatra || {};
  const lagna = input.hasBirthTime ? raw?.lagna || {} : {};
  const dasha = raw?.dasha || raw?.vimshottariDasha || {};
  const moonSign = nonEmptyText(moon.signKo || moon.sign || moon.rashiKo || moon.rashi);
  const nakshatra = nonEmptyText(moonNakshatra.name || moon.nakshatra || moonNakshatra.nakshatra);
  const pada = nonEmptyText(moonNakshatra.pada || moonNakshatra.padaName || moon.pada, 40);
  const lagnaSummary = input.hasBirthTime
    ? nonEmptyText(lagna.signKo || lagna.sign || lagna.rashiKo || lagna.rashi)
    : undefined;
  const dashaSummary = nonEmptyText(dasha.currentMahadasha || dasha.current?.lord || dasha.firstDashaLord);

  if (!moonSign && !nakshatra && !lagnaSummary && !dashaSummary) {
    const error = new Error("VEDIC_PROJECTION_EMPTY");
    error.code = "VEDIC_PROJECTION_EMPTY";
    throw error;
  }

  return {
    lagnaSummary: lagnaSummary ? `라그나는 ${lagnaSummary}의 방식으로 먼저 움직이는 경향을 보여줍니다.` : undefined,
    moonSignSummary: moonSign ? `달의 리듬은 ${moonSign} 쪽 감정 반응과 연결됩니다.` : undefined,
    nakshatraSummary: nakshatra ? `나크샤트라 ${text(nakshatra, 80)}는 반복되는 습관과 감정의 속도를 살펴보는 단서입니다.` : undefined,
    padaSummary: pada ? `파다 ${text(pada, 40)}는 같은 나크샤트라 안에서도 반응의 결이 어디로 기우는지 보는 보조 단서입니다.` : undefined,
    dashaSummary: dashaSummary ? `현재 다샤의 중심 주제는 ${text(dashaSummary, 100)} 흐름으로 정리됩니다.` : undefined,
    innerRhythm: moonSign || nakshatra
      ? "감정의 속도를 먼저 알아차리면 선택과 관계의 리듬을 안정시키기 쉽습니다."
      : "현재 리듬은 달과 나크샤트라의 흐름을 중심으로 낮은 확신으로 읽습니다.",
    evidence: [
      moonSign ? "vedic.moon" : null,
      nakshatra ? "vedic.nakshatra" : null,
      pada ? "vedic.pada" : null,
      lagnaSummary ? "vedic.lagna" : null,
      dashaSummary ? "vedic.dasha" : null,
    ].filter(Boolean),
  };
}
