/**
 * 운기 엔진 계층3 — **배선만 한다. 판정 로직은 한 줄도 없다.**
 *
 * 계층0 `lib/korean-calendar`(무수정) → 계층1 `lib/saju/natal-power.js` →
 * 계층2 `lib/diary/fortune-core.js` 를 이어 붙여, `/diary` 가 부르는 유일한 표면을 만든다.
 *
 * 🔴 **동치 3축을 여기서 명시 고정한다.** 하나만 어긋나도 셸 모달과 판정이 조용히 갈린다.
 *  1. 야자시 `NIGHT_ZI_POLICY.KEEP_DAY` — 코어 기본값은 SHIFT_DAY 라, 안 넘기면 23시대가 하루 밀린다.
 *  2. 일진 조회 시각 `hour: 12` — 셸 달력이 셀 날짜를 정오로 만들어 조회하는 것과 같은 축이다.
 *  3. 날짜축 `Asia/Seoul` — 이 파일은 `new Date()` 를 아예 쓰지 않고 `YYYY-MM-DD`(KST)만 받는다.
 *     오늘을 구하는 곳은 `app/diary/_lib/kst-date.ts` 의 `kstTodayYmd()` 하나다.
 *
 * 원본 대응: `js/luck-sync-diary.js` 의 `_coreGanjiPillars:368` · `getGanZhiByDate:450` ·
 * `_activeProfilePillars:465` · `renderMzSections:1560`(`_lsdCtx` 조립).
 */

import { formatPillar, ganji, NIGHT_ZI_POLICY } from "@/lib/korean-calendar";
import { calcPower, detectJong } from "@/lib/saju/natal-power";
import {
  calcTenStar,
  classifyDayFromSaju,
  GAN_ELEM,
  getLuckyElement,
} from "@/lib/diary/fortune-core";

/** 🔴 일진 조회 시각. 셸 달력의 `new Date(y, m, d, 12)` 와 같은 축이다. */
const DAY_LOOKUP_HOUR = 12;

export interface DiaryBirthInput {
  year: number;
  month: number;
  day: number;
  /** 모르면 12시로 본다 — 셸 `_activeProfilePillars:485` 와 같은 기본값이다. */
  hour?: number | null;
  minute?: number | null;
}

export interface GanjiPair {
  g: string;
  j: string;
}

export interface DiaryNatalChart {
  pillars: { y: GanjiPair; m: GanjiPair; d: GanjiPair; h: GanjiPair };
  power: ReturnType<typeof calcPower>;
  jong: ReturnType<typeof detectJong>;
  dayMasterEl: string;
  /** 🔴 기준일 일진으로 **한 번만** 계산한다 — 셸이 `_lsdCtx.luckyEl` 을 그렇게 쓴다. */
  luckyEl: string;
  referenceYmd: string;
}

export interface DiaryDayFortune {
  ymd: string;
  tone: "very-good" | "good" | "normal" | "bad" | "very-bad" | "profile";
  goodness: number | null;
  badness: number | null;
  scores: { wealth: number; love: number; fame: number; health: number; study: number } | null;
  gz: GanjiPair | null;
}

function parseYmd(ymd: string): { year: number; month: number; day: number } | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return { year, month, day };
}

function pairOf(pillar: { stemIndex: number; branchIndex: number } | null | undefined): GanjiPair | null {
  if (!pillar) return null;
  const hanja = formatPillar(pillar.stemIndex, pillar.branchIndex, "hanja");
  if (!hanja || hanja.length < 2) return null;
  return { g: hanja.charAt(0), j: hanja.charAt(1) };
}

/** 그날의 일진. 셸 `getGanZhiByDate` 와 같은 값을 내야 한다(정오 조회 + KEEP_DAY). */
export function dayGanji(ymd: string): GanjiPair | null {
  const parts = parseYmd(ymd);
  if (!parts) return null;
  const gz = ganji(
    { year: parts.year, month: parts.month, day: parts.day, hour: DAY_LOOKUP_HOUR, minute: 0 },
    { nightZiPolicy: NIGHT_ZI_POLICY.KEEP_DAY },
  );
  return gz ? pairOf(gz.day) : null;
}

/**
 * 생년월일시 → 원국 4기둥 + 억부 + 종격 + 행운 오행.
 *
 * `referenceYmd` 는 행운 오행을 뽑는 기준일이다(보통 오늘). 셸이 `_lsdCtx.luckyEl` 을 그날의
 * 일진으로 한 번 계산해 달력 42칸 전체에 그대로 쓰므로, 여기서도 차트당 한 번만 계산한다.
 */
export function buildDiaryNatalChart(birth: DiaryBirthInput, referenceYmd: string): DiaryNatalChart | null {
  const year = Number(birth?.year);
  const month = Number(birth?.month);
  const day = Number(birth?.day);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  let hour = Number(birth.hour);
  let minute = Number(birth.minute);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) hour = 12;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) minute = 0;

  const gz = ganji({ year, month, day, hour, minute }, { nightZiPolicy: NIGHT_ZI_POLICY.KEEP_DAY });
  if (!gz) return null;

  const y = pairOf(gz.year);
  const m = pairOf(gz.month);
  const d = pairOf(gz.day);
  const h = pairOf(gz.hour);
  if (!y || !m || !d || !h) return null;

  const pillars = { y, m, d, h };
  const power = calcPower(pillars);
  const jong = detectJong(pillars);
  const referenceGz = dayGanji(referenceYmd);

  return {
    pillars,
    power,
    jong,
    dayMasterEl: GAN_ELEM[d.g] || "earth",
    luckyEl: getLuckyElement(power, jong, referenceGz),
    referenceYmd,
  };
}

/** 하루의 운기 등급. 원국이 없으면 `tone: "profile"` 이 그대로 올라온다. */
export function classifyDiaryDay(chart: DiaryNatalChart | null, ymd: string): DiaryDayFortune | null {
  if (!chart) return null;
  const gz = dayGanji(ymd);
  /* 코어는 타입 없는 JS 축자 사본이라 `tone` 이 넓은 string 으로 추론된다. 값은 아래 다섯 개
     열거값뿐이며(`fortune-core.js:226-237`), 그 동치는 패리티 테스트가 전건으로 증명한다. */
  const verdict = classifyDayFromSaju(
    gz,
    chart.pillars,
    chart.power,
    chart.jong,
    chart.dayMasterEl,
    chart.luckyEl,
  ) as Omit<DiaryDayFortune, "ymd">;
  return { ymd, ...verdict };
}

export function classifyDiaryDays(chart: DiaryNatalChart | null, ymds: string[]): DiaryDayFortune[] {
  if (!chart) return [];
  return ymds.map((ymd) => classifyDiaryDay(chart, ymd)).filter((day): day is DiaryDayFortune => day !== null);
}

/** 그날 일간이 보는 십성. 셸 `mainTenStar`(:4127)와 같은 호출이다. */
export function tenStarOfDay(chart: DiaryNatalChart | null, ymd: string): string | null {
  if (!chart) return null;
  const gz = dayGanji(ymd);
  return gz ? calcTenStar(chart.pillars.d.g, gz.g) : null;
}
