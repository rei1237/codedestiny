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
