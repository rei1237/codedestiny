import { calculateZiweiAiChart } from "../../../lib/ziwei-ai-chart.js";
import { context, domain } from "../shared/domain";
import {koreanCivilProfile} from '../shared/korean-time';
import {calculateRelationshipZiwei} from '../relationship-calculation';
import type { FortuneDomain } from "../shared/contracts";
import { ZIWEI_READING_FRAME } from "./reading-rules";
import { enrichZiweiContext } from "./reading-facts";
import {buildZiweiBusinessBasis,buildZiweiHealthBasis} from './derived';
const base = domain(
  "ziwei",
  `한국 음력으로 계산된 자미두수 명반이다. 명궁·신궁·12궁과 주성/보조성/살성의 강약, 사화, 대궁·삼합(삼방사정)을 함께 읽는다.
생년사화·대한사화·유년사화를 구분하고 궁간과 시기를 섞지 않는다. 빈 궁을 불운이라고 단정하지 않는다.
살성/화기는 두려움의 근거가 아니라 긴장과 과제를 설명하는 단서다. 궁과 별 이름 나열로 끝내지 말고 왜 그런 행동 패턴이 나타날 수 있는지 말한다.
${ZIWEI_READING_FRAME}`,
  [
    "삶의 중심과 기질",
    "관계의 방식",
    "일과 재물의 구조",
    "현재의 변화",
    "주의할 패턴",
    "영냥이의 조언",
  ],
  async (input, options = {}) => {
    if(options.relationshipReading)return calculateRelationshipZiwei(input.personA!,new Date(options.asOf||Date.now()).toISOString().slice(0,10));
    // 해외 출생 거부(SAJU_KST_REQUIRED)만 여기서 한다. 시계는 원본 그대로 넘기고 엔진이 출생지 경도·과거
    // 서머타임으로 한 번 보정한다(lib/ziwei-birth-clock.js) — KST 로 미리 바꾸면 서머타임이 두 번 빠진다.
    koreanCivilProfile(input.personA!);
    const r = calculateZiweiAiChart(input.personA!,{year:new Date(new Date(options.asOf || Date.now()).getTime()+9*3600000).getUTCFullYear()});
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
        yearlyTimeline: Array.from({length:10},(_,i)=>calculateZiweiAiChart(input.personA!,{year:new Date(new Date(options.asOf||Date.now()).getTime()+9*3600000).getUTCFullYear()+i}).yearlyLuck),
        sanFangSiZheng: r.sanFangSiZheng,
        // 재백궁+자녀궁(+전택·관록)을 궁간 비화로 이은 사업운 근거와 질액궁 중심 건강 근거(derived.ts).
        businessBasis: buildZiweiBusinessBasis(r.palaces,r.uncertainty?.birthTimeUnknown===true),
        healthBasis: buildZiweiHealthBasis(r.palaces,r.uncertainty?.birthTimeUnknown===true),
        bureau: r.bureau,
        lunar: r.lunar,
      },
      ["출생지 경도·과거 서머타임으로 보정한 시각과 한국 음력으로 계산한 명반입니다."],
    );
  },
);
// 저장 context 는 그대로 두고 프롬프트에 넣을 때만 궁 강약·관계·판단 문장을 붙인다(reading-facts.ts 머리말).
export const ziwei: FortuneDomain = { ...base, buildPrompt: (i, c, f) => base.buildPrompt(i, enrichZiweiContext(c), f) };
