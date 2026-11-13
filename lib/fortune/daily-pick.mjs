/**
 * 날짜별 원고 풀에서 문장을 고른다 — 대상 날짜(target day)만의 함수다.
 *
 * 왜 필요한가 (2026-11-13 실측):
 *   기존 `hashPick(date|sign|section)` 은 날짜마다 독립 추첨이라, 같은 sign·같은 칸이
 *   이틀 연속 같은 문장을 받는 일이 이웃 날짜 30쌍의 날짜별 풀 4,320칸 중 91칸(약 2.1%) 있었다. 오늘 페이지와
 *   내일 페이지가 같은 원고를 나란히 노출하는 직접 원인이다.
 *
 * 규칙: 풀 크기 n 마다 하나의 블록. 블록 안에서는 키별 시드 순열을 따라 n 일 동안 겹치지 않고,
 *   블록 경계에서는 앞 블록 마지막 문장과 새 블록 첫 문장이 같으면 첫 두 칸을 바꾼다.
 *   n ≥ 3 이면 앞 블록의 마지막 칸은 바뀌지 않으므로 이웃한 두 날짜는 항상 다른 문장을 받는다.
 *   같은 날짜는 언제 계산해도 같은 문장이다(오늘 페이지·내일 페이지·날짜 아카이브가 일치).
 */

function hash32(input) {
  let value = 2166136261;
  for (const char of String(input)) {
    value ^= char.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  value ^= value >>> 16;
  value = Math.imul(value, 2246822507);
  value ^= value >>> 13;
  return value >>> 0;
}

/** YYYY-MM-DD → 1970-01-01 기준 일수(UTC 달력, 시간대 영향 없음). */
export function dayNumber(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr));
  if (!match) throw new Error(`INVALID_DATE: ${dateStr}`);
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
}

function blockPermutation(key, block, size) {
  const order = Array.from({ length: size }, (_, index) => index);
  let state = hash32(`${key}|block:${block}`) || 1;
  for (let i = size - 1; i > 0; i -= 1) {
    state = hash32(`${state}|${i}`);
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** 대상 날짜·키로 고른 풀의 인덱스. */
export function dayRotationIndex(dateStr, key, size) {
  if (!Number.isInteger(size) || size <= 0) throw new Error('EMPTY_POOL');
  if (size === 1) return 0;
  const day = dayNumber(dateStr);
  if (size === 2) return (day + (hash32(key) % 2)) % 2;
  const block = Math.floor(day / size);
  const position = day - block * size;
  const order = blockPermutation(key, block, size);
  const previousLast = blockPermutation(key, block - 1, size)[size - 1];
  if (order[0] === previousLast) [order[0], order[1]] = [order[1], order[0]];
  return order[position];
}

export function dayRotationPick(dateStr, key, pool) {
  return pool[dayRotationIndex(dateStr, key, pool.length)];
}
