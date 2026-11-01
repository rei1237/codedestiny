/**
 * /fortune/{period}/{sign} Article JSON-LD 의 발행·수정 시각.
 *
 * 일일 패키지의 `generated_at` 은 묶음을 만든 시각이라 대상일과 무관하다(daily-2026-10-10.json 의
 * generated_at 이 2026-10-14). 그래서 이 글을 만든 시각은 **빌드(렌더) 시각**으로 본다.
 *   datePublished = min(대상일 00:00 KST, 빌드 시각) — 오늘·주간·월간은 대상일 00:00, 내일은 빌드 시각(전날)
 *   dateModified  = 빌드 시각
 * 둘 다 빌드 시각을 넘지 않는다. scripts/lib/fortune-date-contract.mjs 가 산출물에서 같은 규칙을 확인한다.
 *
 * 🔴 KST 계산은 +09:00 오프셋 산술로만 한다. 기계 시간대(CI 는 UTC, 로컬은 KST)를 읽지 않는다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

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

/**
 * @param {string} dateKey `YYYY-MM-DD` 또는 `YYYY-MM`
 * @param {Date} [now] 빌드(렌더) 시각
 * @returns {{ datePublished: string, dateModified: string }}
 */
export function fortuneArticleDates(dateKey, now = new Date()) {
  const target = targetStartMs(dateKey);
  const built = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(built)) throw new Error(`[fortune-article-dates] now 가 올바른 시각이 아닙니다: ${now}`);
  return { datePublished: formatKst(Math.min(target, built)), dateModified: formatKst(built) };
}
