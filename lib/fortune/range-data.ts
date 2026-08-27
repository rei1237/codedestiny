/**
 * 주간·월간 운세의 범위 데이터 — 빌드 타임 전용.
 *
 * 🔴 왜 daily 로더를 늘리지 않았나.
 * `daily-data.ts` 의 `resolvePeriodDate` 는 하루를 돌려준다. 주간·월간은 **범위**라
 * 같은 타입에 밀어 넣으면 "대표 하루"를 고르게 되고, 그게 정확히 구 정적 셸이 하던
 * 재탕이다(js/fortune-engine.js:280-287 의 getDateStr 은 weekly/monthly 를 분기하지
 * 않아 today 와 같은 파일을 읽었다).
 *
 * 여기서 만드는 값은 전부 날짜에서 직접 계산한다. 일일 패키지를 그 기간만큼 생성할
 * 필요가 없다 — 필요한 것은 각 날짜의 간지와 달의 위치이고, 둘 다 순수 계산이다.
 */
// 🔴 간지·절기는 한국 음양력 코어에서만 나온다. lunar-javascript 는 중국 표준시(CST) 기준이라
// 절기 시각이 정확히 60분 이르고, 그 탓에 "기운이 바뀌는 날"이 하루 어긋나는 달이 있다
// (실측 2026-08-27: 2026 우수 = lj 02-18 23:51 vs 코어 02-19 00:52).
// 절기 이름도 그 라이브러리는 중국 간체(处暑·白露)를 내보내 한국어 화면에 그대로 나가고 있었다.
import {
  BRANCH_HANJA,
  STEM_HANJA,
  TERM_NAME_KO,
  ganji,
  solarTerms,
} from "@/lib/korean-calendar";
// 달의 궁·위상은 scripts/lib/moon-sky.mjs 가 astronomy-engine 으로 실계산한다.
// 같은 계산을 여기 다시 쓰지 않는다(코딩 원칙 6).
import { moonSkyForDate } from "@/scripts/lib/moon-sky.mjs";

/**
 * 🔴 주 시작 요일 — 이 레포에 규약이 없어 2026-08-16 에 새로 정한 값이다.
 * 한국 사용자가 "이번 주"를 월~일로 인식하고 ISO-8601 도 월요일 시작이라 월요일로 둔다.
 * 달력 UI(lib/sukuyo-calendar.ts)는 일요일 시작 그리드를 쓰지만 그건 격자 배치 규약이고
 * 기간 판정과는 별개다. 바꾸려면 여기 한 곳만 고치면 된다.
 */
export const WEEK_STARTS_ON_MONDAY = true;

const KST_TIME_ZONE = "Asia/Seoul";

export interface DayCell {
  /** YYYY-MM-DD */
  ymd: string;
  /** 요일 한 글자 */
  weekdayKo: string;
  /** 일진 간지 2글자 (예: "辛酉") */
  ganji: string;
  /** 달이 머무는 궁 (영문) */
  moonSign: string;
  moonPhase: string;
}

export interface WeekRange {
  start: string;
  end: string;
  days: DayCell[];
}

export interface MonthRange {
  year: number;
  month: number;
  /** 월건 간지 2글자 (예: "丙申") — 절입일에 바뀐다 */
  monthGanji: string;
  /** 그 달의 절기 구간 */
  termFrom: { name: string; ymd: string } | null;
  termTo: { name: string; ymd: string } | null;
  newMoonYmd: string;
  fullMoonYmd: string;
  moonSign: string;
  moonPhase: string;
  /** 대표 날짜(달 1일 또는 오늘) — 태양궁 판정에 쓴다 */
  anchorYmd: string;
  days: DayCell[];
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function kstToday(): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return { y, m, d };
}

function ymdOf(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type CoreTerm = { index: number; year: number; month: number; day: number };

/** 코어가 그 날짜를 답하지 못하면 조용히 중국 달력으로 떨어지지 않고 멈춘다. */
function coreGanjiAtMidnight(y: number, m: number, d: number) {
  const core = ganji({ year: y, month: m, day: d, hour: 0, minute: 0 });
  if (!core) throw new RangeError(`한국 음양력 코어가 ${ymdOf(y, m, d)} 를 답하지 못했습니다(지원 1900~2100).`);
  return core;
}

function pillarHanja(part: { stemIndex: number; branchIndex: number }): string {
  return `${STEM_HANJA[part.stemIndex]}${BRANCH_HANJA[part.branchIndex]}`;
}

/**
 * 앵커 날짜(민용일) 기준 직전·직후 24절기.
 * 🔴 예전 `getPrevJieQi(true)` 와 같이 **그날에 든 절기는 "직전"으로 친다**.
 * 해 경계를 넘을 수 있어 전후 해를 함께 늘어놓는다(코어의 한 해 절기는 그 양력 해 안에 닫힌다).
 */
function surroundingTerms(y: number, m: number, d: number): { prev: CoreTerm | null; next: CoreTerm | null } {
  const anchor = Date.UTC(y, m - 1, d);
  let prev: CoreTerm | null = null;
  let next: CoreTerm | null = null;
  for (const year of [y - 1, y, y + 1]) {
    for (const term of solarTerms(year) || []) {
      const at = Date.UTC(term.year, term.month - 1, term.day);
      if (at <= anchor) prev = term;
      else if (!next) next = term;
    }
  }
  return { prev, next };
}

function buildDayCell(y: number, m: number, d: number): DayCell {
  const core = coreGanjiAtMidnight(y, m, d);
  const sky = moonSkyForDate(y, m, d);
  return {
    ymd: ymdOf(y, m, d),
    weekdayKo: WEEKDAY_KO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
    ganji: pillarHanja(core.day),
    moonSign: sky.moonSignEn,
    moonPhase: sky.moonPhaseLabel,
  };
}

/** KST 기준 이번 주(월~일). WEEK_STARTS_ON_MONDAY 를 끄면 일~토가 된다. */
export function loadWeekRange(): WeekRange {
  const { y, m, d } = kstToday();
  const anchor = new Date(Date.UTC(y, m - 1, d));
  const dow = anchor.getUTCDay(); // 일=0
  const offsetToStart = WEEK_STARTS_ON_MONDAY ? (dow === 0 ? -6 : 1 - dow) : -dow;

  const days: DayCell[] = [];
  for (let i = 0; i < 7; i += 1) {
    const cur = new Date(anchor.getTime());
    cur.setUTCDate(cur.getUTCDate() + offsetToStart + i);
    days.push(buildDayCell(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate()));
  }

  return { start: days[0].ymd, end: days[6].ymd, days };
}

/** KST 기준 이번 달. 월건·절기는 한국 음양력 코어(KST)의 값이다. */
export function loadMonthRange(): MonthRange {
  const { y, m, d } = kstToday();
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const days: DayCell[] = [];
  for (let day = 1; day <= lastDay; day += 1) {
    days.push(buildDayCell(y, m, day));
  }

  const anchorCore = coreGanjiAtMidnight(y, m, d);
  const sky = moonSkyForDate(y, m, d);

  // 🔴 절기는 일일 패키지의 calendar.current_jeolgi 를 쓰지 않는다 —
  //    그 값은 "절기 전환기 · 기운 정돈" 고정 문자열이라 매달 같다(실측).
  const { prev, next } = surroundingTerms(y, m, d);
  const toTerm = (term: CoreTerm | null) =>
    term ? { name: TERM_NAME_KO[term.index], ymd: ymdOf(term.year, term.month, term.day) } : null;

  return {
    year: y,
    month: m,
    monthGanji: pillarHanja(anchorCore.month),
    termFrom: toTerm(prev),
    termTo: toTerm(next),
    newMoonYmd: sky.newMoonYmd,
    fullMoonYmd: sky.fullMoonYmd,
    moonSign: sky.moonSignEn,
    moonPhase: sky.moonPhaseLabel,
    anchorYmd: ymdOf(y, m, d),
    days,
  };
}

/** "2026-08-17" → "8월 17일" */
export function formatShortDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일`;
}
