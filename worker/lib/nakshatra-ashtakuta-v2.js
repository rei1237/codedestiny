import { YONI_ORDER, YONI_POINTS, VASHYA_ORDER, VASHYA_POINTS, GANA_ORDER, GANA_POINTS } from '../../constants/nakshatra-koota-tables.js';
// Source-versioned traditional scoring; not a prediction of relationship success.
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

function vashyaGroup(rashi, longitude) {
  const degree = ((longitude % 30) + 30) % 30;
  if (rashi === 8) return degree < 15 ? 'Manava' : 'Chatushpada';
  if (rashi === 9) return degree < 15 ? 'Chatushpada' : 'Jalachara';
  return RASHI_VASHYA[rashi];
}
function kutaVashya(rashiA, rashiB, moonLonA = rashiA * 30, moonLonB = rashiB * 30) {
  const ga = vashyaGroup(rashiA, moonLonA), gb = vashyaGroup(rashiB, moonLonB);
  return { score: VASHYA_POINTS[VASHYA_ORDER.indexOf(gb)][VASHYA_ORDER.indexOf(ga)], max: 2, ga, gb };
}

// 나크샤트라 count(1..27) → 타라(1..9). Saravali Dina: 3,5,7만 무점수; 잔마(1) 포함 나머지는 방향별 1.5점.
function taraOf(fromIdx, toIdx) {
  const count = ((toIdx - fromIdx + 27) % 27) + 1;
  return ((count - 1) % 9) + 1;
}
const AUSPICIOUS_TARA = new Set([1, 2, 4, 6, 8, 9]);

function kutaTara(nakA, nakB) {
  const tAB = taraOf(nakA, nakB);
  const tBA = taraOf(nakB, nakA);
  const goodAB = AUSPICIOUS_TARA.has(tAB);
  const goodBA = AUSPICIOUS_TARA.has(tBA);
  const score = (goodAB ? 1.5 : 0) + (goodBA ? 1.5 : 0);
  return { score, max: 3, tAB, tBA };
}

function kutaYoni(yoniA, yoniB) {
  const a = YONI_ORDER.indexOf(yoniA), b = YONI_ORDER.indexOf(yoniB);
  return { score: a < 0 || b < 0 ? null : YONI_POINTS[b][a], max: 4, yoniA, yoniB };
}

function kutaGrahaMaitri(rashiA, rashiB) {
  const la = RASHI_LORD[rashiA];
  const lb = RASHI_LORD[rashiB];
  const r1 = planetRelation(la, lb);
  const r2 = planetRelation(lb, la);
  const table = {
    "friend-friend": 5, "friend-neutral": 4, "neutral-friend": 4, "neutral-neutral": 3,
    "friend-enemy": 2, "enemy-friend": 2, "neutral-enemy": 1, "enemy-neutral": 1, "enemy-enemy": 0,
  };
  const score = table[`${r1}-${r2}`] ?? 3;
  return { score, max: 5, la, lb, r1, r2 };
}

function kutaGana(ganaA, ganaB) {
  return { score: GANA_POINTS[GANA_ORDER.indexOf(ganaB)][GANA_ORDER.indexOf(ganaA)], max: 6, ganaA, ganaB };
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
  const vashya = kutaVashya(rA, rB, a.moonLon, b.moonLon);
  const tara = kutaTara(a.nakIndex, b.nakIndex);
  const yoni = kutaYoni(attrA.yoni, attrB.yoni);
  const grahaMaitri = kutaGrahaMaitri(rA, rB);
  const gana = kutaGana(attrA.gana, attrB.gana, a.gender, b.gender);
  const bhakoot = kutaBhakoot(rA, rB);
  const nadi = kutaNadi(attrA.nadi, attrB.nadi);

  const items = [
    { key: "varna", label: "바르나 (가치·역할)", ...varna, note: `${VARNA_KO[varna.va]} ↔ ${VARNA_KO[varna.vb]}` },
    { key: "vashya", label: "바샤 (끌림·주도)", ...vashya, note: `${vashya.ga} ↔ ${vashya.gb}` },
    { key: "tara", label: "타라 (관계의 리듬)", ...tara, note: `상호 타라 ${tara.tAB}·${tara.tBA}` },
    { key: "yoni", label: "요니 (본능·친밀)", ...yoni, note: `${yoni.yoniA} ↔ ${yoni.yoniB}` },
    { key: "grahaMaitri", label: "그라하 마이트리 (정신·가치관)", ...grahaMaitri, note: `${grahaMaitri.la} ↔ ${grahaMaitri.lb} (${grahaMaitri.r1}/${grahaMaitri.r2})` },
    { key: "gana", label: "가나 (기질)", ...gana, note: `${attrA.ganaKo} ↔ ${attrB.ganaKo}` },
    { key: "bhakoot", label: "바쿠트 (번영·가정)", ...bhakoot, note: bhakoot.dosha ? "바쿠트 도샤" : `${bhakoot.c1}·${bhakoot.c2}` },
    { key: "nadi", label: "나디 (전통적 기질 분류)", ...nadi, note: nadi.dosha ? "나디 도샤(동일 나디)" : `${attrA.nadiKo} ↔ ${attrB.nadiKo}` },
  ];

  const total = items.reduce((s, it) => s + it.score, 0);
  const totalRounded = Math.round(total * 10) / 10;
  const pct = Math.round((total / 36) * 100);
  const verdict = pct >= 75 ? "매우 좋은 궁합" : pct >= 60 ? "좋은 궁합" : pct >= 50 ? "보통 — 노력으로 보완" : "신중한 접근 권장";

  const doshas = [];
  if (bhakoot.dosha) doshas.push("바쿠트 도샤(번영·가정 운영 주의)");
  if (nadi.dosha) doshas.push("같은 나디 분류 — 건강·임신 가능성의 판단이 아닙니다");
  if (gana.score === 0) doshas.push("가나 부조화(기질 충돌 주의)");

  return { total: totalRounded, max: 36, pct, verdict, items, doshas };
}

// 달 시데리얼 황경으로부터 rashi를 구해 계산.
export function ashtakutaFromMoon({ nakIndexA, moonLonA, genderA, nakIndexB, moonLonB, genderB }) {
  const rashiIndexA = rashiFromLongitude(moonLonA);
  const rashiIndexB = rashiFromLongitude(moonLonB);
  const a = { nakIndex: nakIndexA, rashiIndex: rashiIndexA, moonLon: moonLonA, gender: genderA };
  const b = { nakIndex: nakIndexB, rashiIndex: rashiIndexB, moonLon: moonLonB, gender: genderB };
  const directed = genderA === 'male' && genderB === 'female' || genderA === 'female' && genderB === 'male';
  const forward = computeAshtakuta(directed && genderA === 'female' ? b : a, directed && genderA === 'female' ? a : b);
  if (!forward) return null;
  const reverse = directed ? forward : computeAshtakuta(b, a);
  const totals = [forward.total, reverse.total].sort((x,y) => x-y);
  return { ...forward, totalRange: totals,
    items: forward.items.map((item,i) => ({ ...item, scoreRange: [item.score, reverse.items[i].score].sort((x,y)=>x-y) })),
    method: 'ashtakuta-maitreya-tables-v2',
    orientation: directed ? '전통 신랑·신부 방향 기준' : '전통 성별 역할을 지정하지 않아 두 방향의 범위를 병기합니다.',
    source: 'https://saravali.github.io/astrology/koota_yoni.html',
    verdict: '전통 규칙의 항목별 비교입니다. 점수는 관계 성공 확률이 아닙니다.' };

}

export const __ashtakutaTestUtils = {
  rashiFromLongitude, taraOf, kutaTara, kutaBhakoot, kutaNadi, kutaGana, kutaYoni, kutaGrahaMaitri,
  SIGNS_EN, SIGNS_KO, RASHI_LORD, vashyaGroup, kutaVashya,
};
