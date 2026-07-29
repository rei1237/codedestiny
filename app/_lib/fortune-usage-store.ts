/**
 * /all-fortunes 허브의 "최근 이용"·"즐겨찾기" 저장소.
 * 서버에 남길 만한 정보가 아니라 localStorage 로만 관리한다.
 */

const RECENT_KEY = "cd.fortuneRecent.v1";
const FAVORITES_KEY = "cd.fortuneFavorites.v1";
const RECENT_LIMIT = 8;

/** 저장소가 바뀌었음을 같은 탭 안에서 알리는 이벤트(storage 이벤트는 다른 탭에서만 온다). */
export const FORTUNE_USAGE_EVENT = "cd:fortune-usage-changed";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.length > 0);
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(FORTUNE_USAGE_EVENT));
  } catch {
    /* 저장 실패(용량·프라이빗 모드)는 조용히 넘긴다 — 부가 기능이라 흐름을 막지 않는다 */
  }
}

export function readRecentFortuneIds(): string[] {
  return readList(RECENT_KEY);
}

export function recordFortuneUse(id: string): void {
  if (!id) return;
  const next = [id, ...readList(RECENT_KEY).filter((item) => item !== id)].slice(0, RECENT_LIMIT);
  writeList(RECENT_KEY, next);
}

export function readFavoriteFortuneIds(): string[] {
  return readList(FAVORITES_KEY);
}

/** 즐겨찾기를 토글하고 토글 후 상태(true=즐겨찾기됨)를 돌려준다. */
export function toggleFavoriteFortune(id: string): boolean {
  if (!id) return false;
  const current = readList(FAVORITES_KEY);
  const isFavorite = current.includes(id);
  writeList(FAVORITES_KEY, isFavorite ? current.filter((item) => item !== id) : [id, ...current]);
  return !isFavorite;
}
