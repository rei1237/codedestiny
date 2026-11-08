/**
 * 심화 자미두수(ziwei-deep-report) 판 2 배달 규칙. 새 리포트만 llmMeta.deliveryPlanVersion = 2로 고정한다.
 * 판 1과 다른 점: 질문은 1장에서 한 번만 답하고(P5), 시도를 다 쓴 장은 환불 대신 가장 나은 초안에서
 * 반복을 걷어 내 배달하거나 건너뛴다(P1, 장이 하나도 없을 때만 실패), 말투 이탈·질문 재인용은 1회 힌트 수리한다(P4).
 */
import { countPaidReportBodyChars, dropRepeatedReportSentences } from "./paid-report-quality.js";
import { detectZiweiSoftIssues, scrubZiweiSoftIssues, ziweiSoftIssueHint } from "./ziwei-ai-delivery-v2.js";

export const ZIWEI_DEEP_DELIVERY_PLAN_VERSION = 2;
const SALVAGE_MIN_CHARS = 40;

/** 끄는 스위치: ZIWEI_DEEP_DELIVERY_V2_ENABLED=false 면 새 리포트도 판 1로 만든다. */
export function ziweiDeepDeliveryV2Enabled(env) {
  return String(env?.ZIWEI_DEEP_DELIVERY_V2_ENABLED ?? "").trim().toLowerCase() !== "false";
}

export function isZiweiDeepPlanV2(doc) {
  return Number(doc?.llmMeta?.deliveryPlanVersion) === ZIWEI_DEEP_DELIVERY_PLAN_VERSION;
}

/** 시도를 다 썼거나(구제) 본문이 없어 건너뛴 장. 다시 생성하지 않는다. */
export function isZiweiDeepChapterSettled(id, attempts = {}) {
  return Boolean(attempts?.[`${id}:salvaged`] || attempts?.[`${id}:skipped`]);
}

/** 한국어 무성 말투 이탈과, 1장이 아닌 장의 질문 재인용. 다른 언어는 검사하지 않는다. */
export function ziweiDeepSoftIssues(body, { questionOwner = false, question = "", locale = "ko" } = {}) {
  if (String(locale || "ko").toLowerCase().split("-")[0] !== "ko") return [];
  return detectZiweiSoftIssues({ chapter: { body: String(body || "") } }, { questionOwner, question });
}

export function ziweiDeepRepairHint(issues = []) {
  return issues.length ? `\n[보정] ${ziweiSoftIssueHint(issues)}` : "";
}

/** 마지막 시도 뒤에도 남은 이탈 문장을 걷어 낸다(85% 하한은 scrubZiweiSoftIssues가 지킨다). */
export function scrubZiweiDeepBody(body, issues = []) {
  return String(scrubZiweiSoftIssues({ chapter: { body: String(body || "") } }, issues).chapter.body || "");
}

/**
 * 시도를 다 쓴 장의 구제. 저장된 초안들 중 다른 장(prior)과 겹치는 문장·장 안 반복을 걷어 내고 가장 긴 것을 고른다.
 * 40자 미만만 남으면 빈 문자열(그 장은 건너뛴다).
 */
export function salvageZiweiDeepChapter(drafts = [], prior = "") {
  const best = drafts
    .map((draft) => dropRepeatedReportSentences(String(draft?.body ?? draft ?? ""), prior))
    .filter((body) => typeof body === "string")
    .sort((a, b) => countPaidReportBodyChars(b) - countPaidReportBodyChars(a))[0] || "";
  return countPaidReportBodyChars(best) >= SALVAGE_MIN_CHARS ? best : "";
}

/**
 * 판 2 본문 정리(2026-11-08 실호출에서 발견). 화면은 본문을 그대로 찍고 PDF도 ●/# 제목만 해석하므로
 * 마크다운 굵게 표시(**…**)가 별표째 보였고, 일부 장은 본문 첫 줄에 "제6장 · 장 제목"을 되풀이했다.
 * 굵게 표식만 벗기고, 맨 앞의 장 제목 되풀이 줄만 지운다. 다른 문장은 건드리지 않는다.
 */
export function tidyZiweiDeepBody(body, chapter = {}) {
  const text = String(body || "").replace(/\*\*([^*\n]+?)\*\*/g, "$1").replace(/\*\*/g, "");
  const lines = text.split("\n");
  const first = lines.findIndex((line) => line.trim());
  if (first < 0) return text;
  const head = lines[first].trim().replace(/^#{1,4}\s+/, "");
  const title = String(chapter?.title || "").trim();
  if ((title && head === title) || /^제\s*\d+\s*장\s*[·:.\-]/.test(head)) {
    return lines.slice(first + 1).join("\n").replace(/^\s*\n/, "");
  }
  return text;
}
