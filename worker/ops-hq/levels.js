// 운영 레벨 공식. 고객 월정석·이용권과 무관한 운영자 전용 진행도다.
//
//   레벨 L → L+1 에 필요한 XP: 100 + 40(L−1)
//   레벨 L 진입 누적 XP:        T(L) = 100(L−1) + 20(L−1)(L−2)
//   T(1)=0, T(2)=100, T(3)=240, T(5)=640, T(10)=2340

export const LEVEL_TITLES = Object.freeze([
  { from: 1, title: "별빛 견습생" },
  { from: 5, title: "운명 기록가" },
  { from: 10, title: "별의 안내자" },
  { from: 20, title: "천체 설계자" },
  { from: 30, title: "운명 길드장" },
]);

/** 등급 문장 6단계 — 칭호 5개 + Lv40 문장(칭호는 운명 길드장 유지). */
export const RANK_TIERS = Object.freeze([1, 5, 10, 20, 30, 40]);

const MAX_LEVEL = 999;

export function levelStartXp(level) {
  const n = Math.max(1, Math.floor(level)) - 1;
  return 100 * n + 20 * n * (n - 1);
}

export function xpToNextLevel(level) {
  return 100 + 40 * (Math.max(1, Math.floor(level)) - 1);
}

export function levelForXp(totalXp) {
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
  let level = 1;
  while (level < MAX_LEVEL && levelStartXp(level + 1) <= xp) level += 1;
  return level;
}

export function titleForLevel(level) {
  let title = LEVEL_TITLES[0].title;
  for (const row of LEVEL_TITLES) if (level >= row.from) title = row.title;
  return title;
}

export function rankTierForLevel(level) {
  let tier = 0;
  RANK_TIERS.forEach((from, index) => { if (level >= from) tier = index; });
  return tier;
}

export function describeLevel(totalXp) {
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
  const level = levelForXp(xp);
  const start = levelStartXp(level);
  const need = xpToNextLevel(level);
  return {
    totalXp: xp,
    level,
    title: titleForLevel(level),
    rankTier: rankTierForLevel(level),
    levelStartXp: start,
    nextLevelXp: start + need,
    intoLevel: xp - start,
    needForNext: need,
    progress: Math.min(1, (xp - start) / need),
  };
}
