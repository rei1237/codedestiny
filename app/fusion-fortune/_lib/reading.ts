/**
 * 결과 글자 수·읽는 시간. 서버의 `countFusionFortuneVisibleText`(worker/lib/fusion-fortune.js)와
 * 같은 방식(조각을 공백으로 잇고 `.length`)으로 세어 "30,000자" 하한과 화면 숫자가 어긋나지 않게 한다.
 * 🔴 서버 보관본의 `visibleTextLength` 를 대신 쓰지 않는다 — 2026-09-06 이전에 저장된 문서는
 * 그 값이 JSON 직렬화 길이(키·따옴표 포함, +7%)라 화면 숫자가 문서마다 어긋난다. 화면은
 * 언제나 손에 든 결과에서 직접 센다.
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

/**
 * 화면에 올리기 전에 의미 없는 공백 런을 접는다. 문단 구분(빈 줄 하나)은 남긴다.
 *
 * 🔴 서버(`normalizeFusionProseWhitespace`, worker/lib/fusion-fortune.js)와 **같은 규칙**의 짝이다.
 *    서버는 새로 생성되는 결과를 막고, 여기는 **이미 보관된 결과**를 막는다 — 2026-09-06 이전
 *    문서에는 본문 끝에 공백 9만 자가 붙은 것이 실제로 있고, 본문이 `whitespace-pre-wrap` 이라
 *    그대로 그리면 화면에 빈 공간 수천 화면분이 생기고 글자 수·읽는 시간도 함께 튄다.
 * 🔴 이 함수를 거친 결과가 상태에 들어가므로 글자 수·차례·PDF 가 전부 같은 문자열을 본다.
 */
export function tidyFusionProse<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(/\r\n?/g, "\n")
      .replace(/[^\S\n]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() as unknown as T;
  }
  if (Array.isArray(value)) return value.map(tidyFusionProse) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, tidyFusionProse(item)])) as T;
  }
  return value;
}

/** 분 단위 올림. 0자는 0분. */
export function readingMinutes(chars: number, charsPerMinute: number) {
  if (chars <= 0) return 0;
  return Math.max(1, Math.ceil(chars / Math.max(1, charsPerMinute)));
}
