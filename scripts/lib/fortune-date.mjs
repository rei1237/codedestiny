/**
 * 운세 일일 패키지용 날짜 (기본: Asia/Seoul 오늘)
 * FORTUNE_DATE=YYYY-MM-DD 또는 --date=YYYY-MM-DD
 */
function parseArg(argv) {
  for (const a of argv) {
    if (a.startsWith('--date=')) return a.slice(7).trim();
  }
  return null;
}

function isValidYmd(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function formatKstYmdFromDate(d) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(d)
    .filter((x) => x.type !== 'literal');
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * KST 달력 기준 오늘.
 *
 * `now` 를 받는 이유 — 하루치 발행은 **하나의 기준 날짜**로 오늘과 내일을 모두 도출해야 한다.
 * 호출하는 곳마다 따로 `new Date()` 를 읽으면 자정 경계에서 두 값이 갈라져
 * today=D 인데 tomorrow=D+2 가 될 수 있다. 기본값이 있어 기존 호출부는 그대로 동작한다.
 */
export function kstYmdToday(now = new Date()) {
  return formatKstYmdFromDate(now);
}

/**
 * YYYY-MM-DD 의 다음 날. 순수 함수라 시계나 OS 타임존에 의존하지 않는다.
 * 날짜 산술을 UTC 자정에서 하므로 DST가 없는 KST 달력과 결과가 같다.
 */
export function kstYmdNextDay(ymd) {
  if (!isValidYmd(ymd)) throw new Error(`[fortune-date] YYYY-MM-DD 가 아닙니다: ${ymd}`);
  const [y, m, d] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

/** KST 달력 기준 내일 (자정이 지난 ‘다음 날’ 파일을 미리 만들 때 등) */
export function kstYmdTomorrow(now = new Date()) {
  return kstYmdNextDay(kstYmdToday(now));
}

/**
 * 그 날짜가 속한 KST 주의 시작일(월요일).
 *
 * 🔴 규약의 정본은 lib/fortune/range-data.ts 의 `WEEK_STARTS_ON_MONDAY` 다. 여기 규칙을
 *    다시 적는 이유는 그 파일이 korean-calendar·astronomy-engine 을 끌고 오는 TS 모듈이라
 *    빌드 전 단계의 .mjs 스크립트에서 부를 수 없기 때문이다. 값이 어긋나면
 *    scripts/verify-fortune-freshness.mjs 의 assertWeekStartsOnMonday 가 멈춘다.
 * 순수 함수라 시계·OS 타임존에 의존하지 않는다(UTC 자정 산술 = DST 없는 KST 달력).
 */
export function kstWeekStartYmd(ymd) {
  if (!isValidYmd(ymd)) throw new Error(`[fortune-date] YYYY-MM-DD 가 아닙니다: ${ymd}`);
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay: 0=일 … 1=월. 월요일 시작이므로 일요일은 6일 전이 주 시작이다.
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}

/** 그 날짜가 속한 달의 1일. 월간 운세의 기간 키다. */
export function kstMonthStartYmd(ymd) {
  if (!isValidYmd(ymd)) throw new Error(`[fortune-date] YYYY-MM-DD 가 아닙니다: ${ymd}`);
  return `${ymd.slice(0, 7)}-01`;
}

export function parseFortuneDate(argv) {
  const fromEnv = typeof process.env.FORTUNE_DATE === 'string' && process.env.FORTUNE_DATE.trim();
  const fromArg = parseArg(argv);
  const raw = fromEnv || fromArg || kstYmdToday();
  if (!isValidYmd(raw)) {
    console.error('[gen-daily] Invalid date. Use YYYY-MM-DD (FORTUNE_DATE or --date=). Got:', raw);
    process.exit(1);
  }
  return raw;
}

/** KST 기준 ISO 타임스탬프 (+09:00) — 생성 시각 */
export function kstIsoNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(new Date())
    .filter((x) => x.type !== 'literal');
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+09:00`;
}
