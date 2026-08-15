/**
 * 운세 기간 4종의 정본.
 *
 * `daily-data.ts` 의 `FortunePeriod`("today"|"tomorrow")는 **하루짜리 로더의 입력 타입**이라
 * 그대로 두고, 라우트가 쓰는 기간 목록은 여기서 관리한다. 주간·월간은 범위라서 같은 타입에
 * 넣으면 "대표 하루"를 고르게 되고 그게 구 정적 셸이 하던 재탕이다.
 */
export type FortunePeriodId = "today" | "tomorrow" | "weekly" | "monthly";

export const FORTUNE_PERIOD_IDS: FortunePeriodId[] = ["today", "tomorrow", "weekly", "monthly"];

export const PERIOD_LABEL: Record<FortunePeriodId, string> = {
  today: "오늘",
  tomorrow: "내일",
  weekly: "이번 주",
  monthly: "이번 달",
};

/** 제목·문장에서 "~의 운세" 앞에 붙는 형태 */
export const PERIOD_TITLE: Record<FortunePeriodId, string> = {
  today: "오늘의",
  tomorrow: "내일의",
  weekly: "이번 주",
  monthly: "이번 달",
};

export function isFortunePeriodId(value: string): value is FortunePeriodId {
  return (FORTUNE_PERIOD_IDS as string[]).includes(value);
}

export function isDailyPeriod(value: FortunePeriodId): value is "today" | "tomorrow" {
  return value === "today" || value === "tomorrow";
}
