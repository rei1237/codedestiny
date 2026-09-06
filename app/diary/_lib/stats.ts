/**
 * 통계·결 대조가 읽는 파생값. 🔴 저장소를 열지 않는다 — `DiaryStoreProvider` 가 한 번
 * 하이드레이션한 스냅샷에서 이미 편 `DiaryRecordRow[]` 와 원국 차트를 인자로 받는다
 * (원칙 6, 두 번째 리더 금지).
 *
 * 🔴 새로 저장하는 필드가 없다 — 여기 숫자는 전부 이미 적힌 것을 세기만 한 것이다.
 * 🔴 원국 차트를 여기서 만들지 않는다(차트당 1회 계약, `lib/diary/fortune-adapter.ts:97`).
 *    기간 안의 날짜만 `classifyDiaryDays` 에 넘긴다.
 *
 * 🔴 「표시된 날」과 「기록한 날」을 나눠 센다 — 분모를 하나로 합치면 안 적은 날이 성취 0% 로
 *    섞여 평균이 기록량에 끌려간다(승인본 확정 사항).
 */

import { DIARY_MOOD_EMOJIS } from "./entry-writes";
import { parseYmd, shiftYmd, weekdayIndex } from "./kst-date";
import { collectDiaryTagCounts, type DiaryRecordRow, type DiaryTagCount } from "./records";
import { classifyDiaryDays, type DiaryNatalChart } from "@/lib/diary/fortune-adapter";

export type DiaryStatsRange = "d30" | "d90" | "all";

export const DIARY_STATS_RANGES: readonly DiaryStatsRange[] = ["d30", "d90", "all"];

/** 기본 기간(승인본 결정 3). 한 달이면 결 5등급에 대체로 3일 이상씩 쌓인다. */
export const DIARY_STATS_DEFAULT_RANGE: DiaryStatsRange = "d30";

/**
 * 「전체」의 상한. 🔴 저장소는 손으로도 고쳐질 수 있어 옛 날짜 키가 하나만 있어도 그 사이의
 * 모든 날에 결을 계산하게 된다 — 3년으로 끊고, 실제로 센 기간은 화면이 함께 적는다.
 */
const ALL_RANGE_MAX_DAYS = 1095;

const RANGE_DAYS: Record<DiaryStatsRange, number> = {
  d30: 30,
  d90: 90,
  all: ALL_RANGE_MAX_DAYS,
};

/** 이 날 수부터 결을 비교한다. 모수가 적을 때의 평균은 그 자체가 근거처럼 읽힌다. */
export const DIARY_STATS_MIN_DAYS = 3;

/** 순위에 세우는 태그 수. 넘는 만큼은 기록 목록의 필터 줄에서 본다. */
const TAG_RANK_MAX = 8;

/** 주별 막대 수. 375px 에서 라벨이 겹치지 않는 상한이고, 넘으면 최근 것만 남긴다. */
const WEEK_BARS_MAX = 8;

/** 대조에 세우는 결 5등급. 순서는 달력 범례(`DiaryCalendarView` 의 `GRAIN_LEGEND`)와 같다. */
export const DIARY_STATS_TONES = ["very-good", "good", "normal", "bad", "very-bad"] as const;

export type DiaryStatsTone = (typeof DIARY_STATS_TONES)[number];

export interface DiaryStatsSummary {
  /** 기간 안에서 무언가 남긴 날. */
  written: number;
  /** 실제로 센 날 수. 「전체」는 상한에 걸릴 수 있어 화면이 이 값을 그대로 적는다. */
  span: number;
  /** 오늘(또는 어제)부터 거슬러 이어 쓴 날. 기간과 무관한 현재 연속이다. */
  streak: number;
  /** 루틴 + 할 일 완료율. 총량이 0이면 0. */
  achieve: number;
  /** 기간 안에서 쓴 태그 종류 수(순위 상한과 무관한 전체 수). */
  tags: number;
}

export interface DiaryGrainStat {
  tone: DiaryStatsTone;
  /** 그 결로 표시된 날. */
  shown: number;
  /** 그중 내가 무언가 남긴 날. */
  written: number;
  /** 기록이 모자라면 아래 넷은 전부 null 이다. */
  enough: boolean;
  achieve: number | null;
  topMood: { emoji: string; count: number } | null;
  /** 회고 만족도 평균(소수 한 자리). 매긴 날이 없으면 null. */
  rate: number | null;
}

export interface DiaryMoodStat {
  emoji: string;
  count: number;
}

export interface DiaryWeekStat {
  /** 주 시작(일요일) 날짜 키. */
  start: string;
  /** `8.10` 형태의 짧은 라벨. */
  label: string;
  percent: number;
}

export interface DiaryStats {
  range: DiaryStatsRange;
  from: string;
  to: string;
  summary: DiaryStatsSummary;
  /** 원국이 없으면 빈 배열이다 — 화면은 그때 대조 카드를 안내 문장으로 바꾼다. */
  grains: DiaryGrainStat[];
  moods: DiaryMoodStat[];
  /** 기분을 남긴 날 수. 0이면 화면이 블록을 통째로 접는다. */
  moodDays: number;
  weeks: DiaryWeekStat[];
  tags: DiaryTagCount[];
}

const EMPTY_SUMMARY: DiaryStatsSummary = { written: 0, span: 0, streak: 0, achieve: 0, tags: 0 };

/** 성취율. 🔴 `done` 을 `total` 로 자른다 — 셸이 항목을 지우면 완료 수가 총량을 넘을 수 있다. */
function achieveOf(rows: DiaryRecordRow[]): number {
  let done = 0;
  let total = 0;
  for (const row of rows) {
    if (row.total <= 0) continue;
    done += Math.min(row.done, row.total);
    total += row.total;
  }
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

/** 기간 안의 모든 날짜 키(오름차순). 결 계산과 「센 날 수」가 같은 목록을 본다. */
function rangeYmds(rows: DiaryRecordRow[], todayYmd: string, range: DiaryStatsRange): string[] {
  if (!parseYmd(todayYmd)) return [];

  const floor = shiftYmd(todayYmd, -(RANGE_DAYS[range] - 1));
  /* rows 는 최신순이라 마지막이 가장 오래된 기록이다. 미래 날짜 키가 섞여 있어도 오늘을 넘지 않는다. */
  const oldest = rows.length ? rows[rows.length - 1].ymd : todayYmd;
  const earliest = oldest > todayYmd ? todayYmd : oldest;
  const from = range === "all" && earliest > floor ? earliest : floor;

  const list: string[] = [];
  let cursor = from;
  while (cursor <= todayYmd && list.length < ALL_RANGE_MAX_DAYS) {
    list.push(cursor);
    cursor = shiftYmd(cursor, 1);
  }
  return list;
}

/** 오늘부터 거슬러 이어 쓴 날. 오늘 아직 안 적었으면 어제부터 센다. */
function streakOf(rows: DiaryRecordRow[], todayYmd: string): number {
  if (!rows.length || !parseYmd(todayYmd)) return 0;
  const written = new Set(rows.map((row) => row.ymd));
  let cursor = written.has(todayYmd) ? todayYmd : shiftYmd(todayYmd, -1);
  let count = 0;
  while (written.has(cursor) && count < rows.length) {
    count += 1;
    cursor = shiftYmd(cursor, -1);
  }
  return count;
}

/** 가장 자주 남긴 기분. 같은 횟수면 이모지 정의 순서(셸 공유 6종)를 따른다. */
function topMoodOf(rows: DiaryRecordRow[]): { emoji: string; count: number } | null {
  let best: { emoji: string; count: number } | null = null;
  for (const emoji of DIARY_MOOD_EMOJIS) {
    const count = rows.filter((row) => row.mood === emoji).length;
    if (count > 0 && (!best || count > best.count)) best = { emoji, count };
  }
  return best;
}

/** 회고 만족도 평균. 매기지 않은 날(`rate === null`)은 분모에도 들어가지 않는다. */
function rateOf(rows: DiaryRecordRow[]): number | null {
  const rated = rows.filter((row) => row.rate !== null);
  if (!rated.length) return null;
  const sum = rated.reduce((acc, row) => acc + (row.rate as number), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

/**
 * 주별 성취. 🔴 총량이 0인 주는 막대를 만들지 않는다 — 루틴도 할 일도 없던 주를 0% 로 그리면
 * 「못 했다」로 읽히지만 실제로는 셀 것이 없던 주다.
 */
function weeksOf(rows: DiaryRecordRow[]): DiaryWeekStat[] {
  const buckets = new Map<string, DiaryRecordRow[]>();
  for (const row of rows) {
    if (row.total <= 0) continue;
    const start = shiftYmd(row.ymd, -weekdayIndex(row.ymd));
    const bucket = buckets.get(start);
    if (bucket) bucket.push(row);
    else buckets.set(start, [row]);
  }

  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(-WEEK_BARS_MAX)
    .map(([start, bucket]) => {
      const parts = parseYmd(start);
      return {
        start,
        label: parts ? `${parts.month}.${parts.day}` : start,
        percent: achieveOf(bucket),
      };
    });
}

/**
 * 기간 하나치 통계를 만든다. `chart` 가 없으면 `grains` 만 비고 나머지는 그대로 나온다 —
 * 원국이 없어도 내가 남긴 것은 셀 수 있다.
 */
export function buildDiaryStats(
  rows: DiaryRecordRow[],
  chart: DiaryNatalChart | null,
  todayYmd: string,
  range: DiaryStatsRange,
): DiaryStats {
  const ymds = rangeYmds(rows, todayYmd, range);
  const from = ymds[0] || todayYmd;
  const inRange = rows.filter((row) => row.ymd >= from && row.ymd <= todayYmd);
  const tags = collectDiaryTagCounts(inRange);

  if (!ymds.length) {
    return {
      range,
      from,
      to: todayYmd,
      summary: EMPTY_SUMMARY,
      grains: [],
      moods: [],
      moodDays: 0,
      weeks: [],
      tags: [],
    };
  }

  const toneByYmd = new Map<string, string>();
  for (const day of classifyDiaryDays(chart, ymds)) toneByYmd.set(day.ymd, day.tone);

  const grains: DiaryGrainStat[] = chart
    ? DIARY_STATS_TONES.map((tone) => {
        const shown = ymds.filter((ymd) => toneByYmd.get(ymd) === tone).length;
        const written = inRange.filter((row) => toneByYmd.get(row.ymd) === tone);
        const enough = written.length >= DIARY_STATS_MIN_DAYS;
        return {
          tone,
          shown,
          written: written.length,
          enough,
          achieve: enough ? achieveOf(written) : null,
          topMood: enough ? topMoodOf(written) : null,
          rate: enough ? rateOf(written) : null,
        };
      })
    : [];

  const moods = DIARY_MOOD_EMOJIS.map((emoji) => ({
    emoji,
    count: inRange.filter((row) => row.mood === emoji).length,
  }));

  return {
    range,
    from,
    to: todayYmd,
    summary: {
      written: inRange.length,
      span: ymds.length,
      streak: streakOf(rows, todayYmd),
      achieve: achieveOf(inRange),
      tags: tags.length,
    },
    grains,
    moods,
    moodDays: moods.reduce((acc, item) => acc + item.count, 0),
    weeks: weeksOf(inRange),
    tags: tags.slice(0, TAG_RANK_MAX),
  };
}
