// 브라우저와 Worker가 같은 계산·상징 데이터를 사용한다.
import * as core from "../../lib/maya-calendar-symbols.mjs";

export type TzolkinSign = {
  key: string;
  ko: string;
  keywords: string[];
  light: string;
  shadow: string;
  promptHint: string;
};

export type HaabMonth = {
  key: string;
  ko: string;
  keywords: string[];
  theme: string;
  promptHint: string;
};

export const TZOLKIN_SIGNS: TzolkinSign[] = core.TZOLKIN_SIGNS;
export const HAAB_MONTHS: HaabMonth[] = core.HAAB_MONTHS;
