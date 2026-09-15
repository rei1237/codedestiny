import { calculateZiweiAiChart } from "../../../lib/ziwei-ai-chart.js";
import { context, domain } from "../shared/domain";
import {koreanCivilProfile} from '../shared/korean-time';
export const ziwei = domain(
  "ziwei",
  `한국 음력으로 계산된 자미두수 명반이다. 명궁·신궁·12궁과 주성/보조성/살성의 명암, 사화, 삼방사정을 함께 읽는다.
생년사화·대한사화·유년사화를 구분하고 궁간과 시기를 섞지 않는다. 빈 궁을 불운이라고 단정하지 않는다.
살성/화기는 두려움의 근거가 아니라 긴장과 과제를 설명하는 단서다. 궁과 별 이름 나열로 끝내지 말고 왜 그런 행동 패턴이 나타날 수 있는지 말한다.`,
  [
    "삶의 중심과 기질",
    "관계의 방식",
    "일과 재물의 구조",
    "현재의 변화",
    "주의할 패턴",
    "영냥이의 조언",
  ],
  async (input, env = {}) => {
    input={...input,personA:koreanCivilProfile(input.personA!).profile};
    const r = calculateZiweiAiChart(input.personA!,{year:new Date(new Date(env.AS_OF || Date.now()).getTime()+9*3600000).getUTCFullYear()});
    return context(
      "ziwei",
      {
        lifePalace: r.lifePalace,
        bodyPalace: r.bodyPalace,
        palaces: r.palaces,
        fourTransformations: r.fourTransformations,
        majorLuck: r.majorLuck,
        minorLuck: r.minorLuck,
        yearlyLuck: r.yearlyLuck,
        yearlyTimeline: Array.from({length:10},(_,i)=>calculateZiweiAiChart(input.personA!,{year:new Date(new Date(env.AS_OF||Date.now()).getTime()+9*3600000).getUTCFullYear()+i}).yearlyLuck),
        sanFangSiZheng: r.sanFangSiZheng,
        bureau: r.bureau,
        lunar: r.lunar,
      },
      ["한국 음력·표준시를 기준으로 계산한 명반입니다."],
    );
  },
);
