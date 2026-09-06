/**
 * 다이어리의 날짜축은 언제나 Asia/Seoul 이다. `new Date().getFullYear()` 처럼 로컬 TZ 에
 * 기대는 계산을 쓰지 않는다 — 셸 모달과 하루가 어긋나면 같은 날의 기록이 두 날짜로 갈린다.
 *
 * 규칙은 lib/fortune/daily-data.ts:92-104 의 kstYmd() 와 같다(원칙 15 짝 구현).
 * 🔴 PR-B 에서 운기 엔진을 옮길 때 js/luck-sync-diary.js 의 `_getSeoulDateParts`(:302)와
 *    같은 값을 내는지 확인하고, 새 날짜 유틸을 또 만들지 말고 이 파일을 쓴다.
 */

const KST_TIME_ZONE = "Asia/Seoul";

/** `YYYY-MM-DD` (KST). 다이어리의 날짜 키 형식이자 `?d=` 쿼리 형식이다. */
export function kstTodayYmd(base: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** `2026년 9월 6일 (일)` — 사람이 읽는 표기. 로케일은 ko 전용 + en 폴백 방침을 따른다. */
export function formatKoreanDate(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const [, year, month, day] = match;
  const weekday = WEEKDAY_KO[new Date(`${ymd}T00:00:00Z`).getUTCDay()];
  return `${year}년 ${Number(month)}월 ${Number(day)}일 (${weekday})`;
}
