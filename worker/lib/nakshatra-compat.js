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
    expectedNakshatraKo: cross ? cross.nakshatraKo : null,
  };
}

// 인도(0–36→0–100)와 동양(chemistry/stability 0–99)을 blend해 통합 총평 생성.
function buildUnifiedVerdict(ashtakuta, sukuyoCompat) {
  const indiaPct = ashtakuta ? ashtakuta.pct : 0;
  const eastChem = sukuyoCompat ? Number(sukuyoCompat.chemistryScore) || 0 : 0;
  const eastStab = sukuyoCompat ? Number(sukuyoCompat.stabilityScore) || 0 : 0;
  const eastPct = Math.round((eastChem + eastStab) / 2);
  const blended = Math.round((indiaPct + eastPct) / 2);
  const gap = Math.abs(indiaPct - eastPct);

  let convergence;
  if (indiaPct >= 60 && eastPct >= 60) {
    convergence = "인도 아쉬타쿠타와 동양 숙요 격각이 둘 다 높게 맞물립니다 — 서로 다른 두 전통이 같은 결론(안정적 결합)을 가리키니, 신뢰해도 좋은 조합이에요.";
  } else if (indiaPct < 50 && eastPct < 50) {
    convergence = "두 전통 모두 신중한 신호를 냅니다 — 감정보다 규칙·합의로 관계를 설계할 때 오래갑니다.";
  } else {
    convergence = "두 전통이 공통으로 짚는 강점을 축으로 삼으세요 — 한쪽이 낮아도 다른 쪽이 받쳐 주는 보완 구조입니다.";
  }

  let divergence;
  if (gap >= 25) {
    divergence = `인도 관점(${indiaPct}점)과 동양 관점(${eastPct}점)의 간극이 큽니다 — 체질·궁합의 구조(인도)와 관계의 거리·역할(동양) 중 어디서 어긋나는지 항목을 나눠 보면, 그 지점이 이 관계의 과제이자 성장점입니다.`;
  } else {
    divergence = "두 관점의 편차가 크지 않아, 한 축이 흔들려도 다른 축이 균형을 잡아 줍니다. 큰 위기보다 사소한 리듬 차이를 관리하는 게 핵심이에요.";
  }

  const verdict = blended >= 70 ? "매우 잘 맞는 인연" : blended >= 55 ? "잘 맞는 인연" : blended >= 45 ? "노력으로 깊어지는 인연" : "신중히 가꿔야 할 인연";
  return { blendedPct: blended, indiaPct, eastPct, verdict, convergence, divergence };
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

  return {
    personA: personSummary(a.moonLon, a.sukuyo),
    personB: personSummary(b.moonLon, b.sukuyo),
    india: ashtakuta, // { total, max:36, pct, verdict, items[8], doshas[] }
    dongyang: sukuyoCompat
      ? {
          relationType: sukuyoCompat.relationType,
          relationTypeHan: sukuyoCompat.relationTypeHan,
          distanceLabel: sukuyoCompat.distanceLabel,
          chemistryScore: sukuyoCompat.chemistryScore,
          stabilityScore: sukuyoCompat.stabilityScore,
          conflictScore: sukuyoCompat.conflictScore,
          roleActionGuide: sukuyoCompat.roleActionGuide,
        }
      : null,
    unified,
  };
}
