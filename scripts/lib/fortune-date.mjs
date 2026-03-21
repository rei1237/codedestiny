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

export function kstYmdToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date())
    .filter((x) => x.type !== 'literal');
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
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
