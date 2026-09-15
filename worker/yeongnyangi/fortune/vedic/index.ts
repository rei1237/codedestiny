import { calculateVedicAiChart } from "../../../lib/vedic-ai-chart.js";
import { context, domain } from "../shared/domain";
import { chartInput } from "../shared/time";
import { FortuneError } from '../shared/contracts';
export const vedic = domain(
  "vedic",
  `Jyotish: sidereal Lahiri와 whole-sign bhava 체계다. 서양 tropical sign/Placidus와 혼용하지 않는다.
Lagna·Moon·Nakshatra/Pada를 출발점으로 graha의 dignity/house/aspect를 교차 확인한다.
Dasha와 Antardasha는 같은 기간인지 확인하며 기간 없는 사건을 예언하지 않는다. Yoga는 구성 근거와 강도 제약을 함께 읽는다.
분할 차트는 해당 주제의 보조 근거이며 단독 확정 근거가 아니다. 전문용어는 한국어 생활 언어로 설명한다.`,
  [
    "삶을 마주하는 태도",
    "마음의 바탕",
    "관계와 재능",
    "일과 자원",
    "다샤의 흐름",
    "균형을 위한 조언",
  ],
  async (input, engineEnv = {}) => {
    chartInput(input.personA!);
    const chart = await calculateVedicAiChart(engineEnv, {
      birthInfo: { ...input.personA!, birthPlace: input.personA!.birthPlace },
    }, { now: new Date(engineEnv.AS_OF || Date.now()) });
    if(chart.calculationMeta?.fallbackUsed) throw new FortuneError('PRECISE_EPHEMERIS_UNAVAILABLE',503);
    const { chartSummary: _summary, ...facts } = chart;
    return context("vedic", facts, [
      "요가·분할 차트는 원차트와 함께 해석합니다.",
      "분할 차트의 행성 배치는 완전한 분할 하우스 명반이 아닙니다.",
    ]);
  },
);
