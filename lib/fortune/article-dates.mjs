/**
 * /fortune/{period}/{sign} Article JSON-LD 의 발행·수정 시각.
 *
 * 일일 패키지의 `generated_at` 은 묶음을 만든 시각이라 대상일과 무관하다(daily-2026-10-10.json 의
 * generated_at 이 2026-10-14). 그래서 이 글을 만든 시각은 **빌드(렌더) 시각이 속한 KST 날**로 본다.
 *   datePublished = min(대상일 00:00, 빌드 날 00:00) — 오늘·주간·월간은 대상일, 내일은 빌드 날(전날)
 *   dateModified  = max(datePublished, 갱신 주기 시작) — 주간은 빌드 주의 월요일, 나머지는 빌드 날
 * 둘 다 빌드 시각을 넘지 않는다. scripts/lib/fortune-date-contract.mjs 가 산출물에서 같은 규칙을 확인한다.
 *
 * 🔴 빌드 시각을 그대로 쓰지 않는 이유(2026-11-02) — 하루에 배포가 여러 번 나가면 본문은 그대로인데
 *    dateModified 만 배포마다 올라갔다. 주간 화면은 한 주 내내 같은 본문인데도 매일 "수정" 을
 *    신고했다. 날짜는 본문이 실제로 바뀌는 주기(scripts/lib/sitemap-lastmod.mjs 의
 *    FORTUNE_VOLATILE_CADENCES 와 같다)에만 움직여야 신선도 신호로 믿을 수 있다.
 *
 * 🔴 KST 계산은 +09:00 오프셋 산술로만 한다. 기계 시간대(CI 는 UTC, 로컬은 KST)를 읽지 않는다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** ms 시각을 `YYYY-MM-DDTHH:mm:ss+09:00` 로 쓴다. 밀리초는 버린다(내림). */
function formatKst(ms) {
  return `${new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 19)}+09:00`;
}

/** `YYYY-MM-DD`(일간·주간 시작일) 또는 `YYYY-MM`(월간, 1일)의 00:00 KST. */
function targetStartMs(dateKey) {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(dateKey));
  const [y, m, d] = match ? [Number(match[1]), Number(match[2]), Number(match[3] ?? "1")] : [];
  const utc = match ? new Date(Date.UTC(y, m - 1, d)) : null;
  if (!utc || utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) {
    throw new Error(`[fortune-article-dates] dateKey 는 YYYY-MM-DD 또는 YYYY-MM 이어야 합니다: ${dateKey}`);
  }
  return utc.getTime() - KST_OFFSET_MS;
}

/** ms 시각이 속한 KST 날의 00:00. */
function kstDayStartMs(ms) {
  return Math.floor((ms + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;
}

/** KST 날 00:00 이 속한 주(월요일 시작)의 월요일 00:00. scripts/lib/fortune-date.mjs kstWeekStartYmd 와 같은 규칙. */
function kstWeekStartMs(dayStartMs) {
  const weekday = new Date(dayStartMs + KST_OFFSET_MS).getUTCDay();
  return dayStartMs - ((weekday + 6) % 7) * DAY_MS;
}

/**
 * @param {string} period `today`·`tomorrow`·`weekly`·`monthly`
 * @param {string} dateKey `YYYY-MM-DD` 또는 `YYYY-MM`
 * @param {Date} [now] 빌드(렌더) 시각
 * @returns {{ datePublished: string, dateModified: string }}
 */
export function fortuneArticleDates(period, dateKey, now = new Date()) {
  const target = targetStartMs(dateKey);
  const built = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(built)) throw new Error(`[fortune-article-dates] now 가 올바른 시각이 아닙니다: ${now}`);
  const builtDay = kstDayStartMs(built);
  const published = Math.min(target, builtDay);
  const refresh = period === "weekly" ? kstWeekStartMs(builtDay) : builtDay;
  return { datePublished: formatKst(published), dateModified: formatKst(Math.max(published, refresh)) };
}
