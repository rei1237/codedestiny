// 숙요점(宿曜占) 27수 관계 분류 정본(single source of truth).
//
// 과거에 sukuyo-ai-calculation.js 와 sukuyo-premium.js 두 곳에 같은 관계 분류 로직이
// 중복되어, 6번째 관계명이 한쪽은 "위성"·다른 쪽 소비처는 "성위"로 어긋나 있었다.
// 그 재발을 막기 위해 관계 분류(거리→관계)와 정본 명칭을 이 파일 한 곳으로 모은다.
// 정본 명칭은 "성위(成危)" — 서비스 전반의 다른 소비처가 이미 "성위"를 기준으로 삼고 있다.

const SUKUYO_RELATION_HAN = {
  "명": "命",
  "업태": "業胎",
  "영친": "榮親",
  "안괴": "安壞",
  "우쇠": "友衰",
  "성위": "成危",
};

function normalizeIndex(index) {
  const n = Number(index);
  if (!Number.isFinite(n)) return null;
  return ((Math.floor(n) % 27) + 27) % 27;
}

// 27수 순행 거리(0~26) → 6종 관계와 방향별 역할(aRole=기준 자리, bRole=상대 자리).
function relationFromForwardDistance(forwardDistance) {
  const d = normalizeIndex(forwardDistance);
  if (d == null) return null;
  if (d === 0) return { relationType: "명", relationTypeHan: SUKUYO_RELATION_HAN["명"], aRole: "명", bRole: "명" };
  if (d === 9) return { relationType: "업태", relationTypeHan: SUKUYO_RELATION_HAN["업태"], aRole: "업", bRole: "태" };
  if (d === 18) return { relationType: "업태", relationTypeHan: SUKUYO_RELATION_HAN["업태"], aRole: "태", bRole: "업" };
  if ([1, 10, 19].includes(d)) return { relationType: "영친", relationTypeHan: SUKUYO_RELATION_HAN["영친"], aRole: "영", bRole: "친" };
  if ([8, 17, 26].includes(d)) return { relationType: "영친", relationTypeHan: SUKUYO_RELATION_HAN["영친"], aRole: "친", bRole: "영" };
  if ([2, 11, 20].includes(d)) return { relationType: "우쇠", relationTypeHan: SUKUYO_RELATION_HAN["우쇠"], aRole: "우", bRole: "쇠" };
  if ([7, 16, 25].includes(d)) return { relationType: "우쇠", relationTypeHan: SUKUYO_RELATION_HAN["우쇠"], aRole: "쇠", bRole: "우" };
  if ([3, 12, 21].includes(d)) return { relationType: "안괴", relationTypeHan: SUKUYO_RELATION_HAN["안괴"], aRole: "안", bRole: "괴" };
  if ([6, 15, 24].includes(d)) return { relationType: "안괴", relationTypeHan: SUKUYO_RELATION_HAN["안괴"], aRole: "괴", bRole: "안" };
  if ([4, 13, 22].includes(d)) return { relationType: "성위", relationTypeHan: SUKUYO_RELATION_HAN["성위"], aRole: "위", bRole: "성" };
  if ([5, 14, 23].includes(d)) return { relationType: "성위", relationTypeHan: SUKUYO_RELATION_HAN["성위"], aRole: "성", bRole: "위" };
  return { relationType: "명", relationTypeHan: SUKUYO_RELATION_HAN["명"], aRole: "명", bRole: "명" };
}

// 방향별 역할(내 자리/상대 자리) 해설의 정본 프로필.
const SUKUYO_ROLE_PROFILES = {
  명: { han: "命", meaning: "같은 리듬을 비추는 거울의 자리" },
  업: { han: "業", meaning: "오래된 숙제를 되짚게 하는 자리" },
  태: { han: "胎", meaning: "새 마음을 품고 시작하게 하는 자리" },
  영: { han: "榮", meaning: "상대를 빛나게 하고 베풀게 되는 자리" },
  친: { han: "親", meaning: "가까이 기대며 마음을 붙이는 자리" },
  우: { han: "友", meaning: "곁을 지키는 동반의 자리" },
  쇠: { han: "衰", meaning: "기운을 내어주다 쉽게 소모되는 자리" },
  안: { han: "安", meaning: "안심과 편안함을 건네는 자리" },
  괴: { han: "壞", meaning: "흔들림과 변화를 일으키는 자리" },
  성: { han: "成", meaning: "일을 이루도록 밀어주는 자리" },
  위: { han: "危", meaning: "긴장과 자극을 일으키는 자리" },
};

// 오늘의 수(bRole)가 본명수에게 갖는 자리별 길흉 등급.
// tier: pivotal(특별·양날의검) / great-auspicious(대길) / auspicious(길) / caution(흉) / great-caution(대흉)
const DAY_ROLE_FORTUNE = {
  명: { tier: "pivotal", score: 80 },
  영: { tier: "great-auspicious", score: 92 },
  친: { tier: "auspicious", score: 74 },
  안: { tier: "auspicious", score: 72 },
  우: { tier: "auspicious", score: 70 },
  성: { tier: "auspicious", score: 76 },
  쇠: { tier: "caution", score: 42 },
  괴: { tier: "caution", score: 38 },
  위: { tier: "caution", score: 40 },
  업: { tier: "great-caution", score: 24 },
  태: { tier: "great-caution", score: 22 },
};

const DAY_TIER_LABEL = {
  "pivotal": "특별한 날",
  "great-auspicious": "대길일",
  "auspicious": "길일",
  "caution": "주의일",
  "great-caution": "흉일",
};

const DAY_TIER_ADVICE = {
  "pivotal": "본명수와 같은 결의 날이라 큰 결정에는 힘이 실리지만, 과욕은 그대로 되돌아옵니다. 핵심 하나에만 집중하세요.",
  "great-auspicious": "베풀고 나설수록 크게 돌아오는 날입니다. 미뤄둔 제안·부탁·시작을 오늘 꺼내 보세요.",
  "auspicious": "관계와 협력이 부드럽게 풀리는 날입니다. 사람을 만나고 손을 내밀기 좋습니다.",
  "caution": "기운이 새거나 마찰이 생기기 쉬운 날입니다. 큰 결정보다 컨디션 관리와 거리 조절에 집중하세요.",
  "great-caution": "숙제 같은 일과 충돌이 겹치기 쉬운 날입니다. 중요한 계약·담판·무리한 시작은 다른 날로 미루세요.",
};

/**
 * 특정 날짜의 수(dayMansionIndex)가 본명수(myMansionIndex)에게 갖는 그날의 길흉.
 * 두 인덱스 모두 0~26. 유효하지 않으면 null.
 */
function judgeDayFortune(myMansionIndex, dayMansionIndex) {
  if (myMansionIndex == null || dayMansionIndex == null) return null;
  const myIdx = normalizeIndex(myMansionIndex);
  const dayIdx = normalizeIndex(dayMansionIndex);
  if (myIdx == null || dayIdx == null) return null;
  const forwardDistance = (dayIdx - myIdx + 27) % 27;
  const relation = relationFromForwardDistance(forwardDistance);
  if (!relation) return null;
  // 오늘의 수는 상대(b) 자리 — "오늘이 나에게 어떤 자리인가".
  const role = relation.bRole;
  const fortune = DAY_ROLE_FORTUNE[role] || { tier: "auspicious", score: 60 };
  const profile = SUKUYO_ROLE_PROFILES[role] || { han: "", meaning: "확인된 자리" };
  const tierLabel = DAY_TIER_LABEL[fortune.tier];
  return {
    relationType: relation.relationType,
    relationTypeHan: relation.relationTypeHan,
    aRole: relation.aRole,
    bRole: role,
    roleHan: profile.han,
    forwardDistance,
    tier: fortune.tier,
    tierLabel,
    score: fortune.score,
    headline: `${relation.relationType}의 결 — ${tierLabel} (오늘은 ${role}(${profile.han})의 자리)`,
    advice: DAY_TIER_ADVICE[fortune.tier],
  };
}

export {
  SUKUYO_RELATION_HAN,
  SUKUYO_ROLE_PROFILES,
  normalizeIndex,
  relationFromForwardDistance,
  judgeDayFortune,
};
