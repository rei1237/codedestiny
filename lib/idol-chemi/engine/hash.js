// 결정론 해시 — 결과 식별·카피 슬롯 선택용. 암호학적 용도 아님.
export function fnv1a32(input) {
  const text = String(input ?? "");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function fnv1aHex(input) {
  return fnv1a32(input).toString(16).padStart(8, "0");
}

/** 풀에서 결정론적으로 하나 고른다. 빈 풀은 null. */
export function pickDeterministic(pool, seed, slot) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  return pool[fnv1a32(`${seed}:${slot}`) % pool.length];
}
