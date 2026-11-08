import type { FortunePeriodId } from "./periods";

/** 일일 원고 풀의 '오늘'은 계산 대상 날짜를 가리킨다. 한국어 일일 본문 인용에만 적용한다. */
export function koreanDailyText(text: string, period: FortunePeriodId): string {
  return period === "tomorrow" ? text.replaceAll("오늘", "내일") : text;
}
