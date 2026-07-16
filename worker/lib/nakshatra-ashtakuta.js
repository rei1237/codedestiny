// 나크샤트라 결정판 — 정밀 아쉬타쿠타(8쿠타 36점) 궁합 엔진
//
// vedic-astrology.html의 calcCompatibility는 여러 단순화가 있어(달 라시가 아닌 나크샤트라
// 인덱스로 Vashya/Bhakoot 근사, Nadi 단순 3-순환, Tara 길흉 반전) 정확도가 떨어진다.
// 이 모듈은 **달의 시데리얼 황경 → 정확한 라시(rashi)** 를 근거로 정통 규칙으로 재구성한다.
//
// 개선점(정통 대비):
//  - Varna(1): 달 라시의 4계층(물=Brahmin / 불=Kshatriya / 흙=Vaishya / 바람=Shudra) 기반.
//  - Vashya(2): 라시 5군(Chatushpada/Manava/Jalachara/Vanachara/Keeta) + 통제표.
//  - Tara(3): 상호 나크샤트라 count → 9구간. 길(2·4·6·8·9)만 가점(HTML은 길흉 반전이었음).
//  - Yoni(4): 14요니, 동일=4 / 천적쌍=0 / 그 외=2.
//  - Graha Maitri(5): 달 **라시 지배성** 자연 우정(나크샤트라 지배성 아님).
//  - Gana(6): Deva/Manushya/Rakshasa 정통 표(성별 옵션).
//  - Bhakoot(7): **정확한 라시 diff** — 2·12 / 5·9 / 6·8 도샤만 0.
//  - Nadi(8): 정통 지그재그(constants) — 동일 나디=0(도샤).

import { getNakshatraAttributes } from "../../constants/nakshatra-attributes.js";

const SIGNS_EN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGNS_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const RASHI_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

// 라시 → 바르나 계층 랭크(높을수록 상위). 물=Brahmin4/불=Kshatriya3/흙=Vaishya2/바람=Shudra1.
const RASHI_VARNA_RANK = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4]; // Aries..Pisces
const VARNA_KO = { 4: "브라흐민(물)", 3: "크샤트리아(불)", 2: "바이샤(흙)", 1: "슈드라(바람)" };

// 라시 → 바샤 그룹.
const RASHI_VASHYA = ["Chatushpada", "Chatushpada", "Manava", "Jalachara", "Vanachara", "Manava", "Manava", "Keeta", "Manava", "Jalachara", "Manava", "Jalachara"];

// 자연 행성 우정(달 라시 지배성 간). friend/neutral/enemy.
const PLANET_FRIENDS = {
  Sun: { friend: ["Moon", "Mars", "Jupiter"], enemy: ["Venus", "Saturn"] },
  Moon: { friend: ["Sun", "Mercury"], enemy: [] },
  Mars: { friend: ["Sun", "Moon", "Jupiter"], enemy: ["Mercury"] },
  Mercury: { friend: ["Sun", "Venus"], enemy: ["Moon"] },
  Jupiter: { friend: ["Sun", "Moon", "Mars"], enemy: ["Mercury", "Venus"] },
  Venus: { friend: ["Mercury", "Saturn"], enemy: ["Sun", "Moon"] },
  Saturn: { friend: ["Mercury", "Venus"], enemy: ["Sun", "Moon", "Mars"] },
};

// 요니 천적쌍(상호 = 0점).
const YONI_ENEMY_PAIRS = [
  ["Cow", "Tiger"], ["Elephant", "Lion"], ["Horse", "Buffalo"], ["Dog", "Deer"],
  ["Cat", "Rat"], ["Serpent", "Mongoose"], ["Monkey", "Goat"],
];

function rashiFromLongitude(siderealLon) {
  const lon = ((Number(siderealLon) % 360) + 360) % 360;
  if (!Number.isFinite(lon)) return null;
  return Math.floor(lon / 30); // 0..11
}

function planetRelation(a, b) {
  if (a === b) return "friend";
  const rel = PLANET_FRIENDS[a];
  if (!rel) return "neutral";
  if (rel.friend.includes(b)) return "friend";
  if (rel.enemy.includes(b)) return "enemy";
  return "neutral";
}

// ── 8쿠타 개별 계산 ───────────────────────────────────────────────────────────

function kutaVarna(rashiA, rashiB) {
  // 신랑(A) 바르나 >= 신부(B) 바르나면 1점(정통 방향). 성별 미지정 시 A를 신랑 기준.
  const va = RASHI_VARNA_RANK[rashiA];
  const vb = RASHI_VARNA_RANK[rashiB];
  const score = va >= vb ? 1 : 0;
  return { score, max: 1, va, vb };
}

function kutaVashya(rashiA, rashiB) {
  const ga = RASHI_VASHYA[rashiA];
  const gb = RASHI_VASHYA[rashiB];
  let score;
  if (rashiA === rashiB || ga === gb) score = 2;
  else if ((ga === "Chatushpada" && gb === "Jalachara") || (ga === "Jalachara" && gb === "Chatushpada")) score = 1;
  else if (ga === "Vanachara" || gb === "Vanachara" || ga === "Keeta" || gb === "Keeta") score = 0;
  else score = 1;
  return { score, max: 2, ga, gb };
}

// 나크샤트라 count(1..27) → 타라(1..9). 길: 2,4,6,8,9 / 흉: 1,3,5,7.
function taraOf(fromIdx, toIdx) {
  const count = ((toIdx - fromIdx + 27) % 27) + 1;
  return ((count - 1) % 9) + 1;
}
const AUSPICIOUS_TARA = new Set([2, 4, 6, 8, 9]);

function kutaTara(nakA, nakB) {
  const tAB = taraOf(nakA, nakB);
  const tBA = taraOf(nakB, nakA);
  const goodAB = AUSPICIOUS_TARA.has(tAB);
  const goodBA = AUSPICIOUS_TARA.has(tBA);
  const score = (goodAB ? 1.5 : 0) + (goodBA ? 1.5 : 0);
  return { score, max: 3, tAB, tBA };
}

function kutaYoni(yoniA, yoniB) {
  let score;
  if (yoniA === yoniB) score = 4;
  else if (YONI_ENEMY_PAIRS.some((p) => (p[0] === yoniA && p[1] === yoniB) || (p[1] === yoniA && p[0] === yoniB))) score = 0;
  else score = 2;
  return { score, max: 4, yoniA, yoniB };
}

function kutaGrahaMaitri(rashiA, rashiB) {
  const la = RASHI_LORD[rashiA];
  const lb = RASHI_LORD[rashiB];
  const r1 = planetRelation(la, lb);
  const r2 = planetRelation(lb, la);
  const table = {
    "friend-friend": 5, "friend-neutral": 4, "neutral-friend": 4, "neutral-neutral": 3,
    "friend-enemy": 1, "enemy-friend": 1, "neutral-enemy": 0.5, "enemy-neutral": 0.5, "enemy-enemy": 0,
  };
  const score = table[`${r1}-${r2}`] ?? 3;
  return { score, max: 5, la, lb, r1, r2 };
}

function kutaGana(ganaA, ganaB, genderA, genderB) {
  if (ganaA === ganaB) return { score: 6, max: 6, ganaA, ganaB };
  const set = new Set([ganaA, ganaB]);
  if (set.has("Deva") && set.has("Manushya")) return { score: 5, max: 6, ganaA, ganaB };
  if (set.has("Deva") && set.has("Rakshasa")) return { score: 1, max: 6, ganaA, ganaB };
  // Manushya ↔ Rakshasa: 신랑이 Rakshasa면 0, 신부가 Rakshasa면 다소 완화(정통) — 성별 없으면 0.
  return { score: 0, max: 6, ganaA, ganaB };
}

function kutaBhakoot(rashiA, rashiB) {
  const c1 = ((rashiB - rashiA + 12) % 12) + 1;
  const c2 = ((rashiA - rashiB + 12) % 12) + 1;
  const pair = [c1, c2].sort((x, y) => x - y).join(",");
  const dosha = pair === "2,12" || pair === "5,9" || pair === "6,8";
  return { score: dosha ? 0 : 7, max: 7, c1, c2, dosha };
}

function kutaNadi(nadiA, nadiB) {
  const dosha = nadiA === nadiB;
  return { score: dosha ? 0 : 8, max: 8, nadiA, nadiB, dosha };
}

/**
 * 정밀 아쉬타쿠타 계산.
 * @param {{nakIndex, rashiIndex, gender?}} a  A(신랑 기준)
 * @param {{nakIndex, rashiIndex, gender?}} b  B(신부 기준)
 */
export function computeAshtakuta(a, b) {
  const attrA = getNakshatraAttributes(a.nakIndex);
  const attrB = getNakshatraAttributes(b.nakIndex);
  if (!attrA || !attrB || a.rashiIndex == null || b.rashiIndex == null) return null;
  const rA = a.rashiIndex;
  const rB = b.rashiIndex;

  const varna = kutaVarna(rA, rB);
  const vashya = kutaVashya(rA, rB);
  const tara = kutaTara(a.nakIndex, b.nakIndex);
  const yoni = kutaYoni(attrA.yoni, attrB.yoni);
  const grahaMaitri = kutaGrahaMaitri(rA, rB);
  const gana = kutaGana(attrA.gana, attrB.gana, a.gender, b.gender);
  const bhakoot = kutaBhakoot(rA, rB);
  const nadi = kutaNadi(attrA.nadi, attrB.nadi);

  const items = [
    { key: "varna", label: "바르나 (가치·역할)", ...varna, note: `${VARNA_KO[varna.va]} ↔ ${VARNA_KO[varna.vb]}` },
    { key: "vashya", label: "바샤 (끌림·주도)", ...vashya, note: `${vashya.ga} ↔ ${vashya.gb}` },
    { key: "tara", label: "타라 (건강·운의 흐름)", ...tara, note: `상호 타라 ${tara.tAB}·${tara.tBA}` },
    { key: "yoni", label: "요니 (본능·친밀)", ...yoni, note: `${yoni.yoniA} ↔ ${yoni.yoniB}` },
    { key: "grahaMaitri", label: "그라하 마이트리 (정신·가치관)", ...grahaMaitri, note: `${grahaMaitri.la} ↔ ${grahaMaitri.lb} (${grahaMaitri.r1}/${grahaMaitri.r2})` },
    { key: "gana", label: "가나 (기질)", ...gana, note: `${attrA.ganaKo} ↔ ${attrB.ganaKo}` },
    { key: "bhakoot", label: "바쿠트 (번영·가정)", ...bhakoot, note: bhakoot.dosha ? "바쿠트 도샤" : `${bhakoot.c1}·${bhakoot.c2}` },
    { key: "nadi", label: "나디 (체질·자녀운)", ...nadi, note: nadi.dosha ? "나디 도샤(동일 나디)" : `${attrA.nadiKo} ↔ ${attrB.nadiKo}` },
  ];

  const total = items.reduce((s, it) => s + it.score, 0);
  const totalRounded = Math.round(total * 10) / 10;
  const pct = Math.round((total / 36) * 100);
  const verdict = pct >= 75 ? "매우 좋은 궁합" : pct >= 60 ? "좋은 궁합" : pct >= 50 ? "보통 — 노력으로 보완" : "신중한 접근 권장";

  const doshas = [];
  if (bhakoot.dosha) doshas.push("바쿠트 도샤(번영·가정 운영 주의)");
  if (nadi.dosha) doshas.push("나디 도샤(체질·건강·자녀운 주의)");
  if (gana.score === 0) doshas.push("가나 부조화(기질 충돌 주의)");

  return { total: totalRounded, max: 36, pct, verdict, items, doshas };
}

// 달 시데리얼 황경으로부터 rashi를 구해 계산.
export function ashtakutaFromMoon({ nakIndexA, moonLonA, genderA, nakIndexB, moonLonB, genderB }) {
  const rashiIndexA = rashiFromLongitude(moonLonA);
  const rashiIndexB = rashiFromLongitude(moonLonB);
  return computeAshtakuta(
    { nakIndex: nakIndexA, rashiIndex: rashiIndexA, gender: genderA },
    { nakIndex: nakIndexB, rashiIndex: rashiIndexB, gender: genderB },
  );
}

export const __ashtakutaTestUtils = {
  rashiFromLongitude, taraOf, kutaTara, kutaBhakoot, kutaNadi, kutaGana, kutaYoni,
  SIGNS_EN, SIGNS_KO, RASHI_LORD,
};
