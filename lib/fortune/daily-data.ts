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
// 🔴 주 시작일·달 1일 규칙은 scripts/fortune-build-data.mjs 가 패키지를 만들 때 쓴 것과
//    **같은 함수**여야 한다. 폴백 경로에서 규칙이 갈리면 없는 파일을 찾아 빌드가 죽는다.
import { kstWeekStartYmd, kstMonthStartYmd } from "@/scripts/lib/fortune-date.mjs";

export type FortunePeriod = "today" | "tomorrow";

export const FORTUNE_PERIODS: FortunePeriod[] = ["today", "tomorrow"];

/**
 * 패키지를 고르는 **시드 기간**. `FortunePeriod` 를 늘리지 않은 이유가 있다 — 그쪽은
 * "하루짜리 로더의 입력 타입"이고 주간·월간은 범위다(lib/fortune/periods.ts 머리말).
 *
 * 🔴 주간·월간이 이 패키지에서 읽는 것은 `entry`(상시 톤 카피) 하나뿐이다. 달력·점수·절기는
 *    lib/fortune/range-data.ts 가 기간 전체에서 계산한다. 그 경계를 넘어 여기서
 *    `pkg.calendar` 를 읽으면 그 순간 "대표 하루"를 고르는 것이 되고, 그게 구 정적 셸이
 *    하던 재탕이다(range-data.ts 머리말).
 */
export type FortuneTonePeriod = FortunePeriod | "weekly" | "monthly";

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

/**
 * 🔴 scripts/fortune-build-data.mjs 가 prebuild 시점에 만든 매니페스트. 이 모듈은 그 뒤
 * next build 의 정적 생성 단계에서 별도로 실행되며, 그 사이 KST 자정을 지날 수 있다
 * (2026-08-22 실측: 이 경계에 걸려 daily-YYYY-MM-DD.json 이 ENOENT 로 프리렌더가 죽었다 —
 * prebuild 는 "오늘=D" 로 today/tomorrow 파일을 만들었는데, 이 함수가 render 시점에
 * 시계를 다시 읽어 "오늘=D+1" 로 계산해 존재하지 않는 tomorrow=D+2 파일을 찾았다).
 * 매니페스트가 있으면 prebuild 가 실제로 무엇을 만들었는지 그대로 따른다. 매니페스트가
 * 없으면(로컬 개발 등 prebuild 를 안 거친 경우) 기존처럼 시계를 읽어 폴백한다.
 */
type RunManifest = Record<FortuneTonePeriod, string>;
const MANIFEST_KEYS: FortuneTonePeriod[] = ["today", "tomorrow", "weekly", "monthly"];

let manifestCache: RunManifest | null = null;
let manifestRead = false;
function readRunManifest(): RunManifest | null {
  if (manifestRead) return manifestCache;
  manifestRead = true;
  try {
    const file = path.join(process.cwd(), "fortune", "data", "run-manifest.json");
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    // 🔴 키가 하나라도 없으면 매니페스트 전체를 버린다. 절반만 믿으면 나머지 기간이
    //    시계 폴백으로 떨어져 prebuild 가 만든 것과 다른 날짜를 찾는다.
    manifestCache = MANIFEST_KEYS.every((key) => typeof parsed?.[key] === "string")
      ? (parsed as RunManifest)
      : null;
  } catch {
    manifestCache = null;
  }
  return manifestCache;
}

export function resolvePeriodDate(period: FortuneTonePeriod): string {
  const manifest = readRunManifest();
  if (manifest) return manifest[period];
  const today = kstYmd(0);
  if (period === "tomorrow") return kstYmd(1);
  if (period === "weekly") return kstWeekStartYmd(today);
  if (period === "monthly") return kstMonthStartYmd(today);
  return today;
}

const cache = new Map<string, DailyPackage>();

export function loadDailyPackage(period: FortuneTonePeriod): DailyPackage {
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
