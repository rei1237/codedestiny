// Calendar ranges a question asks about, fixed against the consultation date (asOf, already in the user's timezone).
// A range is the civil period being consulted, never a claim that evidence exists at that resolution.
export const ASK_PERIOD_RESOLVER = 'ask-period-v1' as const;
export type AskPeriodScale = 'week' | 'month' | 'year';
export interface AskPeriodRange { scale: AskPeriodScale; label: string; start: string; end: string }
type YearResolver = (text: string, asOf: string) => { year: number; label: string }[];

// Same week policy as lib/fortune/range-data.ts (WEEK_STARTS_ON_MONDAY): Monday to Sunday.
const WEEK = /이번\s*주|다음\s*주|차주/gu;
const MONTH_WORD = /이번\s*달|이달|다음\s*달|내달/gu;
const YEAR_MONTH = /(20\d{2})\s*년\s*(\d{1,2})\s*(?:월\s*)?(?:(?:[~～–-]|부터)\s*(\d{1,2})\s*)?월(?:까지)?/gu;
const RELATIVE_MONTH = /(올해|금년|이번\s*해|내년|다음\s*해|명년)\s*(\d{1,2})\s*(?:월\s*)?(?:(?:[~～–-]|부터)\s*(\d{1,2})\s*)?월(?:까지)?/gu;
const BARE_MONTH = /(?<![\d년])(\d{1,2})\s*(?:월\s*)?(?:(?:[~～–-]|부터)\s*(\d{1,2})\s*)?월(?:까지)?(?!\s*\d)/gu;
const BARE_MONTH_DAY = /(?<![\d년])(\d{1,2})\s*월\s*\d{1,2}\s*일/gu;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const utc = (asOf: string) => new Date(`${asOf}T00:00:00Z`);
const monthEnd = (y: number, m: number) => ymd(new Date(Date.UTC(y, m, 0)));
const monthStart = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-01`;

function weekRange(asOf: string, next: boolean) {
  const d = utc(asOf), dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow) + (next ? 7 : 0));
  const end = new Date(d); end.setUTCDate(end.getUTCDate() + 6);
  return { start: ymd(d), end: ymd(end) };
}
function months(y: number, a: number, b = a): Omit<AskPeriodRange, 'label' | 'scale'> | undefined {
  if (a < 1 || a > 12 || b < a || b > 12) return;
  return { start: monthStart(y, a), end: monthEnd(y, b) };
}

/** Every week, month and year range the question names, in text order, deduplicated. */
export function resolveAskPeriods(question: string, asOf: string, resolveYears: YearResolver): AskPeriodRange[] {
  const base = Number(asOf.slice(0, 4)), currentMonth = Number(asOf.slice(5, 7));
  const namedYears = resolveYears(question, asOf);
  const namedYear = namedYears.length === 1 ? namedYears[0].year : undefined;
  const found: (AskPeriodRange & { at: number })[] = [];
  let rest = question;
  // Consumed text is blanked so '내년 3월' is one month range, not also the whole of next year.
  const take = (re: RegExp, make: (m: RegExpMatchArray) => AskPeriodRange | undefined) => {
    rest = rest.replace(re, (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpMatchArray, at = args[args.length - 2] as number;
      const range = make(m);
      if (!range) return m[0];
      found.push({ ...range, at });
      return ' '.repeat(m[0].length);
    });
  };
  take(YEAR_MONTH, m => { const r = months(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : undefined);
    return r && { scale: 'month', label: m[0].replace(/\s+/g, ' '), ...r }; });
  take(RELATIVE_MONTH, m => { const offset = /내년|다음\s*해|명년/.test(m[1]) ? 1 : 0;
    const r = months(base + offset, Number(m[2]), m[3] ? Number(m[3]) : undefined);
    return r && { scale: 'month', label: m[0].replace(/\s+/g, ' '), ...r }; });
  // A month without a year is the next time that month comes, counting the current month.
  const bare = (m: RegExpMatchArray, second?: string) => {
    const a = Number(m[1]), b = second ? Number(second) : a;
    const r = months(namedYear ?? (a >= currentMonth ? base : base + 1), a, b);
    return r && { scale: 'month' as const, label: m[0].replace(/\s+/g, ' '), ...r };
  };
  take(BARE_MONTH_DAY, m => bare(m));
  take(BARE_MONTH, m => bare(m, m[2]));
  take(MONTH_WORD, m => { const next = /다음|내달/.test(m[0]);
    const y = next && currentMonth === 12 ? base + 1 : base, mo = next ? currentMonth % 12 + 1 : currentMonth;
    return { scale: 'month', label: m[0].replace(/\s+/g, ' '), ...months(y, mo)! }; });
  take(WEEK, m => ({ scale: 'week', label: m[0].replace(/\s+/g, ' '), ...weekRange(asOf, /다음|차주/.test(m[0])) }));
  for (const y of resolveYears(rest, asOf))
    found.push({ scale: 'year', label: y.label, start: `${y.year}-01-01`, end: `${y.year}-12-31`, at: rest.indexOf(y.label) });
  const seen = new Set<string>();
  return found.sort((a, b) => a.at - b.at).filter(r => {
    const key = `${r.scale}:${r.start}:${r.end}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map(({ at: _at, ...r }) => r);
}

const DOW = '일월화수목금토';
/** '10.5(월)~10.11(일)' — the absolute dates shown beside a relative label. */
export function formatAskRange(range: Pick<AskPeriodRange, 'start' | 'end' | 'scale'>) {
  const part = (v: string) => { const d = utc(v); return `${d.getUTCMonth() + 1}.${d.getUTCDate()}(${DOW[d.getUTCDay()]})`; };
  if (range.scale === 'year') return `${range.start.slice(0, 4)}.1.1~12.31`;
  const y = range.start.slice(0, 4);
  return `${y}.${part(range.start)}~${range.end.slice(0, 4) !== y ? range.end.slice(0, 4) + '.' : ''}${part(range.end)}`;
}

/** The quick-select words. Each one is a phrase the resolver above already understands. */
export const ASK_PERIOD_CHIPS = ['이번 주', '다음 주', '이번 달', '다음 달', '올해', '내년'] as const;
const LEADING = new RegExp(`^\\s*(?:${ASK_PERIOD_CHIPS.map(w => w.replace(' ', '\\s*')).join('|')})(?:\\s+|$)`, 'u');
/**
 * Put a chip's phrase at the start of the question, replacing a chip phrase already there. A typed phrase
 * with a particle ('다음 달에') is part of the sentence and stays, so the preview shows both periods.
 */
export function applyAskPeriodChip(question: string, chip: string) {
  const body = question.replace(LEADING, '');
  return `${chip} ${body}`;
}
