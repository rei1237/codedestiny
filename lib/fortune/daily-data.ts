/**
 * 일일 운세 패키지 로더 — 빌드 타임 전용.
 *
 * scripts/fortune-build-data.mjs 가 prebuild:cf 에서 KST 오늘/내일분을 만들어 두고,
 * 이 모듈이 그것을 읽어 서버 컴포넌트에 넘긴다. 정적 export 빌드라 여기서 읽은 값이
 * HTML 에 그대로 굳고, 그래서 크롤러가 실제 운세 텍스트를 받는다.
 * (예전 fortune/*.html 은 이 JSON 을 브라우저에서 fetch 했기 때문에 크롤러가 받는 본문이 0자였다.)
 *
 * 🔴 파일이 없으면 빈 페이지를 내지 말고 빌드를 실패시킨다 — 빈 껍데기가 색인되는 것이
 *    바로 되돌리려는 그 상태다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export type FortunePeriod = "today" | "tomorrow";

export const FORTUNE_PERIODS: FortunePeriod[] = ["today", "tomorrow"];

/** 8개 언어 박스 — 이 페이지들은 kr 만 쓴다(로케일 확장은 별건). */
interface LangBox {
  kr: string;
  en?: string;
  [lang: string]: string | undefined;
}

export interface DailyScore {
  overall: number;
  love: number;
  money: number;
  health: number;
  work: number;
}

export interface DailySignEntry {
  keyword: LangBox;
  score: DailyScore;
  lucky: { color_kr: string; color_en?: string; number: number };
  sections: {
    overall: LangBox;
    love: LangBox;
    money: LangBox;
    health: LangBox;
    work: LangBox;
    advice: LangBox;
  };
  /** 별자리에만 있다 */
  planet_message?: LangBox;
  /** 띠에만 있다 */
  saju_insight?: string;
}

export interface DailyCalendar {
  solar_date: string;
  lunar_date: string;
  ilchin: string;
  wolgeon: string;
  year_ganji: string;
  current_jeolgi: string;
}

export interface DailySky {
  moon_phase: string;
  moon_sign: string;
  key_transits: string[];
  this_month_new_moon: string;
  this_month_full_moon: string;
}

export interface DailyPackage {
  date: string;
  generated_at: string;
  calendar: DailyCalendar;
  sky_today: DailySky;
  animals: Record<string, DailySignEntry>;
  zodiacs: Record<string, DailySignEntry>;
}

const KST_TIME_ZONE = "Asia/Seoul";

/** scripts/lib/fortune-date.mjs 의 kstYmdToday() 와 같은 규칙 */
function kstYmd(offsetDays = 0): string {
  const base = new Date();
  if (offsetDays !== 0) base.setUTCDate(base.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

export function resolvePeriodDate(period: FortunePeriod): string {
  return kstYmd(period === "tomorrow" ? 1 : 0);
}

const cache = new Map<string, DailyPackage>();

export function loadDailyPackage(period: FortunePeriod): DailyPackage {
  const date = resolvePeriodDate(period);
  const cached = cache.get(date);
  if (cached) return cached;

  const file = path.join(process.cwd(), "fortune", "data", `daily-${date}.json`);
  let parsed: DailyPackage;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8")) as DailyPackage;
  } catch (error) {
    throw new Error(
      `[fortune] 일일 패키지를 읽지 못했습니다: ${file}\n` +
        `prebuild:cf 의 scripts/fortune-build-data.mjs 가 먼저 실행돼야 합니다 ` +
        `(수동: npm run fortune:build-data). 원인: ${(error as Error).message}`,
    );
  }

  if (!parsed?.zodiacs || !parsed?.animals || parsed.date !== date) {
    throw new Error(`[fortune] 일일 패키지가 손상됐거나 날짜가 어긋납니다: ${file}`);
  }

  cache.set(date, parsed);
  return parsed;
}

export function getSignEntry(pkg: DailyPackage, kind: "zodiac" | "animal", id: string): DailySignEntry | null {
  const table = kind === "zodiac" ? pkg.zodiacs : pkg.animals;
  return table?.[id] || null;
}

/** "2026-08-15" → "2026년 8월 15일 (토)" */
export function formatKoreanDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][
    new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  ];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}
