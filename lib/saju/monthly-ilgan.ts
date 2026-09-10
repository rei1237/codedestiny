import {
  STEM_HANGUL,
  STEM_HANJA,
  TERM_NAME_HANJA,
  TERM_NAME_KO,
  formatPillar,
  ganji,
  nodeTerms,
} from "@/lib/korean-calendar";
import { elementOfStem, tenGodOfStem } from "@/lib/five-element-colors";
import {
  ILGAN_MONTHLY_MONTHS,
  ILGAN_MONTHLY_STEMS,
  getIlganMonthlyMonth,
  getIlganMonthlyStem,
} from "./ilgan-monthly-registry.mjs";

export type IlganMonthlyPeriod = {
  key: string;
  year: number;
  month: number;
  label: string;
  primaryKeyword: string;
  monthGanji: string;
  monthGanjiHanja: string;
  monthStemKo: string;
  monthStemHanja: string;
  monthElement: string;
  stemTenGod: string;
  termFrom: TermBoundary;
  termTo: TermBoundary;
};

export type TermBoundary = {
  name: string;
  hanja: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  label: string;
};

export type IlganMonthlyPage = {
  path: string;
  period: IlganMonthlyPeriod;
  profile: (typeof ILGAN_MONTHLY_STEMS)[number];
};

const SUPPORTED_MONTH_KEYS = Object.keys(ILGAN_MONTHLY_MONTHS) as string[];

function dateTimeValue(term: { year: number; month: number; day: number; hour: number; minute: number }): number {
  return Date.UTC(term.year, term.month - 1, term.day, term.hour, term.minute);
}

function formatTermLabel(term: { year: number; month: number; day: number; hour: number; minute: number }): string {
  return `${term.year}년 ${term.month}월 ${term.day}일 ${String(term.hour).padStart(2, "0")}:${String(term.minute).padStart(2, "0")} KST`;
}

function getMonthBoundaries(year: number, month: number): { from: TermBoundary; to: TermBoundary } {
  const anchor = Date.UTC(year, month - 1, 15, 12, 0);
  const terms = [year - 1, year, year + 1]
    .flatMap((termYear) => nodeTerms(termYear) || [])
    .sort((a, b) => dateTimeValue(a) - dateTimeValue(b));
  const from = [...terms].reverse().find((term) => dateTimeValue(term) <= anchor);
  const to = terms.find((term) => dateTimeValue(term) > anchor);

  if (!from || !to) {
    throw new RangeError(`한국 음양력 코어가 ${year}-${String(month).padStart(2, "0")}의 절기 경계를 답하지 못했습니다.`);
  }

  const toBoundary = (term: typeof from): TermBoundary => ({
    name: TERM_NAME_KO[term.index],
    hanja: TERM_NAME_HANJA[term.index],
    year: term.year,
    month: term.month,
    day: term.day,
    hour: term.hour,
    minute: term.minute,
    label: formatTermLabel(term),
  });

  return { from: toBoundary(from), to: toBoundary(to) };
}

function buildPeriod(monthKey: string): IlganMonthlyPeriod | null {
  const config = getIlganMonthlyMonth(monthKey);
  if (!config) return null;

  // 15일 정오를 앵커로 쓰되, 월건과 절기 경계는 모두 한국 음양력 코어가 판정한다.
  const core = ganji({ year: config.year, month: config.month, day: 15, hour: 12, minute: 0 });
  if (!core) throw new RangeError(`한국 음양력 코어가 ${monthKey}의 월건을 답하지 못했습니다.`);
  const boundaries = getMonthBoundaries(config.year, config.month);
  const monthGanji = formatPillar(core.month.stemIndex, core.month.branchIndex, "hangul");
  const monthGanjiHanja = formatPillar(core.month.stemIndex, core.month.branchIndex, "hanja");
  const monthStemKo = STEM_HANGUL[core.month.stemIndex];
  const monthStemHanja = STEM_HANJA[core.month.stemIndex];

  return {
    key: monthKey,
    year: config.year,
    month: config.month,
    label: config.label,
    primaryKeyword: config.primaryKeyword,
    monthGanji,
    monthGanjiHanja,
    monthStemKo,
    monthStemHanja,
    monthElement: elementOfStem(monthStemKo) || "",
    // 개별 일간과 월간의 십성은 페이지 생성 시 아래 profile에 대입한다.
    stemTenGod: "",
    termFrom: boundaries.from,
    termTo: boundaries.to,
  };
}

export function getIlganMonthlyPeriod(monthKey: string): IlganMonthlyPeriod | null {
  return buildPeriod(monthKey);
}

export function getIlganMonthlyPage(monthKey: string, slug: string): IlganMonthlyPage | null {
  if (!SUPPORTED_MONTH_KEYS.includes(monthKey)) return null;
  const profile = getIlganMonthlyStem(slug);
  const period = buildPeriod(monthKey);
  if (!profile || !period) return null;

  return {
    path: `/saju/monthly/${monthKey}/${slug}`,
    period: {
      ...period,
      stemTenGod: tenGodOfStem(profile.stemKo, period.monthStemKo) || "관계 확인 필요",
    },
    profile,
  };
}

export function getIlganMonthlyMonthKeys(): string[] {
  return [...SUPPORTED_MONTH_KEYS];
}

export function getIlganMonthlyStemSlugs(): string[] {
  return ILGAN_MONTHLY_STEMS.map((profile) => profile.slug);
}

export function stemLabel(profile: IlganMonthlyPage["profile"]): string {
  return `${profile.stemKo}${profile.element}일간(${profile.stemHanja}${profile.element === "목" ? "木" : profile.element === "화" ? "火" : profile.element === "토" ? "土" : profile.element === "금" ? "金" : "水"})`;
}

export function monthLabelWithScripts(period: IlganMonthlyPeriod): string {
  return `${period.monthGanji}월(${period.monthGanjiHanja}月)`;
}

export function formatBoundaryRange(period: IlganMonthlyPeriod): string {
  return `${period.termFrom.name}(${period.termFrom.hanja}) ${period.termFrom.label}부터 ${period.termTo.name}(${period.termTo.hanja}) ${period.termTo.label} 전까지`;
}

export function getIlganMonthlyPrimaryKeyword(monthKey: string): string | null {
  return getIlganMonthlyMonth(monthKey)?.primaryKeyword || null;
}

export { ILGAN_MONTHLY_MONTHS, ILGAN_MONTHLY_STEMS };
