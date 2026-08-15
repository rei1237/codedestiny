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
// lib/sukuyo-calendar.ts:3 과 같은 방식으로 가져온다(CJS 패키지지만 Next 가 처리한다).
import { Solar } from "lunar-javascript";
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

/** 간지에서 뒤에 붙는 "月"·"年" 같은 꼬리를 떼고 2글자만 남긴다 */
function bareGanji(value: string): string {
  return Array.from(String(value || "").trim()).slice(0, 2).join("");
}

function buildDayCell(y: number, m: number, d: number): DayCell {
  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();
  const sky = moonSkyForDate(y, m, d);
  return {
    ymd: ymdOf(y, m, d),
    weekdayKo: WEEKDAY_KO[solar.getWeek()],
    ganji: bareGanji(lunar.getDayInGanZhi()),
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

/** KST 기준 이번 달. 월건·절기는 lunar-javascript 의 실계산 값이다. */
export function loadMonthRange(): MonthRange {
  const { y, m, d } = kstToday();
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const days: DayCell[] = [];
  for (let day = 1; day <= lastDay; day += 1) {
    days.push(buildDayCell(y, m, day));
  }

  const anchorSolar = Solar.fromYmd(y, m, d);
  const anchorLunar = anchorSolar.getLunar();
  const sky = moonSkyForDate(y, m, d);

  // 🔴 절기는 일일 패키지의 calendar.current_jeolgi 를 쓰지 않는다 —
  //    그 값은 "절기 전환기 · 기운 정돈" 고정 문자열이라 매달 같다(실측).
  const prev = anchorLunar.getPrevJieQi(true);
  const next = anchorLunar.getNextJieQi(true);
  const toTerm = (jq: unknown) => {
    if (!jq || typeof jq !== "object") return null;
    const item = jq as { getName?: () => string; getSolar?: () => { toYmd?: () => string } };
    const name = item.getName?.();
    const ymd = item.getSolar?.()?.toYmd?.();
    return name && ymd ? { name, ymd } : null;
  };

  return {
    year: y,
    month: m,
    monthGanji: bareGanji(anchorLunar.getMonthInGanZhiExact()),
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
