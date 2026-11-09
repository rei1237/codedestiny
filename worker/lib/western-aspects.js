export function normalizeLongitude(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

/**
 * 두 황경 사이의 주요 애스펙트(오브 8도). 순수 함수 — 시나스트리(neo-synastry.js)가
 * 같은 규칙을 다시 쓰기 위해 export 한다. 여기 규칙을 복제하면 네이탈과 시나스트리의
 * 오브가 조용히 갈라진다.
 */
export function aspectBetween(a, b) {
  const diff = Math.abs(normalizeLongitude(a) - normalizeLongitude(b));
  const normalized = diff > 180 ? 360 - diff : diff;
  const defs = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]];
  for (const [deg, type] of defs) {
    const orb = Math.abs(normalized - deg);
    if (orb <= 8) {
      return { type, orb: Math.round(orb * 100) / 100 };
    }
  }
  return null;
}

export function calcAspects(planetsBySignInfo) {
  const aspects = [];
  const names = Object.keys(planetsBySignInfo);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const hit = aspectBetween(planetsBySignInfo[names[i]].longitude, planetsBySignInfo[names[j]].longitude);
      if (hit) {
        aspects.push({ p1: names[i], p2: names[j], ...hit });
      }
    }
  }
  return aspects;
}
