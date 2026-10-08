// 나크샤트라 결정판 — 동서 통합 궁합 조립 (순수·WASM 비의존)
//
// 두 사람의 [달 시데리얼 황경 + 숙요 객체]를 받아
//  - 인도: 정밀 아쉬타쿠타 36점(nakshatra-ashtakuta.js)
//  - 동양: 숙요 격각 궁합(buildSukuyoAiCompatibility)
//  - 통합: 크로스워크 + 수렴/발산 총평
// 을 한 객체로 조립한다. Swiss·음력 I/O는 라우트가 담당하고 여기선 순수 계산만.

import { nakshatraInfo } from "./vedic-derived-calculations.js";
import { ashtakutaFromMoon } from "./nakshatra-ashtakuta.js";
import { buildSukuyoAiCompatibility } from "./sukuyo-ai-calculation.js";
import { getNakshatraAttributes } from "../../constants/nakshatra-attributes.js";
import { crosswalkFromSukuyo } from "../../constants/nakshatra-crosswalk.js";

function personSummary(moonLon, sukuyo) {
  const nak = nakshatraInfo(moonLon);
  const attrs = getNakshatraAttributes(nak.index);
  const cross = crosswalkFromSukuyo(sukuyo ? sukuyo.index : null);
  return {
    nakIndex: nak.index,
    nakshatraKo: attrs ? attrs.nameKo : null,
    nakshatraEn: attrs ? attrs.nameEn : null,
    ganaKo: attrs ? attrs.ganaKo : null,
    lord: attrs ? attrs.lord : null,
    sukuyoIndex: sukuyo ? sukuyo.index : null,
    sukuyoKo: sukuyo ? sukuyo.nameKo : null,
    sukuyoHan: sukuyo ? sukuyo.nameHan : null,
    expectedNakshatraKo: !sukuyo?.calculationBasis && cross ? cross.nakshatraKo : null,
    japaneseLunar: sukuyo?.lunar || null, sukuyoMethod: sukuyo?.calculationBasis || "legacy",
    siderealMoonLongitude: moonLon, ayanamsa: "Lahiri",
  };
}

// 두 체계를 구분해 읽고, 점수의 평균은 만들지 않는다.
function buildUnifiedVerdict(ashtakuta, sukuyoCompat) {
  const strengths = ashtakuta?.items.filter(item => item.score / item.max >= .75).map(item=>item.label) || [];
  const discussion = ashtakuta?.items.filter(item => item.score / item.max < .5).map(item=>item.label) || [];
  return { verdict: '두 사람의 관계를 읽는 두 시선',
    convergence: strengths.length ? '베다 항목 중 ' + strengths.join(' · ') + '에서 공통 리듬을 살펴볼 수 있습니다. 실제로 편안했던 장면을 서로 이야기해 보세요.' : '두 사람의 차이를 점수 하나로 결론내리지 않고, 항목별로 살펴봅니다.',
    divergence: '일본 숙요의 ' + (sukuyoCompat?.relationType || '') + ' 관계는 서로의 역할을, 베다의 8항목은 기질과 생활 리듬을 읽습니다. 서로 다른 척도이므로 평균하지 않습니다.',
    discussion: discussion.length ? discussion : ['연락과 혼자 쉬는 시간', '돈과 생활 역할', '갈등 뒤 대화를 다시 시작하는 방법'],
  };
}

/**
 * 동서 통합 궁합 조립.
 * @param {{moonLon, sukuyo, gender?}} a
 * @param {{moonLon, sukuyo, gender?}} b
 */
export function assembleNakshatraCompat(a, b) {
  const nakA = nakshatraInfo(a.moonLon);
  const nakB = nakshatraInfo(b.moonLon);

  const ashtakuta = ashtakutaFromMoon({
    nakIndexA: nakA.index, moonLonA: a.moonLon, genderA: a.gender,
    nakIndexB: nakB.index, moonLonB: b.moonLon, genderB: b.gender,
  });

  const sukuyoCompat = (a.sukuyo && b.sukuyo)
    ? buildSukuyoAiCompatibility(a.sukuyo, b.sukuyo)
    : null;

  const unified = buildUnifiedVerdict(ashtakuta, sukuyoCompat);
  const forwardDistance = sukuyoCompat ? ((b.sukuyo.index - a.sukuyo.index) % 27 + 27) % 27 : null;
  const shortestDistance = Math.min(forwardDistance, 27 - forwardDistance);
  // Japanese relation wheel: 栄親 short distances 1/8/10, 友衰 2/7/11,
  // 安壊 3/6/12, 危成 4/5/13. 命 and 業胎 have no distance tier.
  const distanceLabel = shortestDistance === 0 ? '동숙' : shortestDistance === 9 ? '특수관계'
    : shortestDistance <= 4 ? '근거리' : shortestDistance <= 8 ? '중거리' : '원거리';

  return {
    calculationVersion: 'nakshatra-compat-v2',
    uncertainty: [a.uncertainty, b.uncertainty].filter(Boolean),
    personA: personSummary(a.moonLon, a.sukuyo),
    personB: personSummary(b.moonLon, b.sukuyo),
    india: ashtakuta, // { total, max:36, pct, verdict, items[8], doshas[] }
    dongyang: sukuyoCompat
      ? {
          relationType: sukuyoCompat.relationType,
          relationTypeHan: sukuyoCompat.relationTypeHan,
          distanceLabel, forwardDistance, reverseDistance: (27 - forwardDistance) % 27,
          method: "jp-sanku-v1", source: "https://yakumoin.net/about/aisyou",
          chemistryScore: sukuyoCompat.chemistryScore,
          stabilityScore: sukuyoCompat.stabilityScore,
          conflictScore: sukuyoCompat.conflictScore,
          roleActionGuide: sukuyoCompat.roleActionGuide,
        }
      : null,
    unified,
  };
}
