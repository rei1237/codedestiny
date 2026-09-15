import { getSwissWesternChart } from "../../../lib/swiss-ephemeris.js";
import { context, domain } from "../shared/domain";
import { chartInput } from "../shared/time";
import { FortuneError } from "../shared/contracts";
export const astrology = domain(
  "astrology",
  `서양 점성술 tropical/Placidus 체계다. 베다의 sidereal이나 다샤를 섞지 않는다.
태양·달·상승점과 각 행성의 sign/house/aspect를 교차 해석한다. aspect는 종류와 orb를 함께 읽고, 긴장각에도 재능과 조절 가능성을 설명한다.
역행을 실패로 단정하지 않는다. 트랜짓이 없으면 미래 시기를 창작하지 않는다. 성향과 갈등을 실제 관계·직업·욕망·선택의 언어로 풀어낸다.`,
  [
    "나를 움직이는 욕망",
    "감정과 안정감",
    "관계 속의 나",
    "직업과 재능",
    "내면의 갈등",
    "선택을 위한 조언",
  ],
  async (input, options = {}) => {
    const t = chartInput(input.personA!);
    if (Math.abs(t.lat) >= 66)
      throw new FortuneError("HOUSE_SYSTEM_UNAVAILABLE");
    const chart = await getSwissWesternChart(options.runtimeEnv || {}, t, {
      strictSwiss: true,
    });
    if (chart.fallbackUsed)
      throw new FortuneError("PRECISION_UNAVAILABLE", 503);
    return context("astrology", chart, [
      "출생 차트 해석이며 실시간 트랜짓은 포함하지 않습니다.",
    ]);
  },
);
