/**
 * 결과 글자 수·읽는 시간. 서버의 `countFusionFortuneVisibleText`(worker/lib/fusion-fortune.js)와
 * 같은 방식(조각을 공백으로 잇고 `.length`)으로 세어 "30,000자" 하한과 화면 숫자가 어긋나지 않게 한다.
 * 서버가 보관본에 남기는 `visibleTextLength` 는 JSON 직렬화 길이라 표시에 못 쓴다.
 */

import { SECTION_KEYS, type Result, type Section } from "../fusion-thread";

const joinedLength = (parts: (string | undefined)[]) => parts.filter(Boolean).join(" ").length;

export function countSectionChars(section: Pick<Section, "title" | "content" | "keyPoints"> | undefined) {
  if (!section) return 0;
  return joinedLength([section.title, section.content, ...(section.keyPoints || [])]);
}

export function countTimingChars(timing: Result["timingAndAction"] | undefined) {
  if (!timing?.content) return 0;
  return joinedLength([timing.title, timing.content, ...(timing.luckyActions || []), ...(timing.cautionPatterns || [])]);
}

export function countVerdictChars(verdict: Result["finalVerdict"]) {
  if (!verdict) return 0;
  return joinedLength([verdict.headline, verdict.rationale, ...verdict.systemVerdicts.map((item) => item.note), ...verdict.doNow, ...verdict.avoid]);
}

export function countResultChars(result: Result) {
  return joinedLength([result.title, result.openingMessage, result.executiveSummary, result.closingMessage])
    + SECTION_KEYS.reduce((sum, key) => sum + countSectionChars(result[key]), 0)
    + countTimingChars(result.timingAndAction)
    + countVerdictChars(result.finalVerdict);
}

/** 분 단위 올림. 0자는 0분. */
export function readingMinutes(chars: number, charsPerMinute: number) {
  if (chars <= 0) return 0;
  return Math.max(1, Math.ceil(chars / Math.max(1, charsPerMinute)));
}
