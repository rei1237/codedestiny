// AI 운세 상담의 "계산 근거"를 기능과 무관한 단일 형태로 실어 나르는 계약.
//
// 각 기능(자미두수·점성술·베다·숙요·사주)은 이미 서버에서 결정론적으로 계산한 명반/차트/명식을 갖고 있지만,
// 지금까지는 그 값이 LLM 프롬프트로만 흘러가고 화면에는 남지 않았다. 이 모듈은 그 계산값을
//   groups = 결과 화면이 그대로 렌더할 항목 묶음
//   stages = 대기 화면이 순서대로 채워 넣을 계산 단계
// 두 가지로 정규화해, 프런트 컴포넌트 하나가 다섯 기능을 모두 렌더할 수 있게 한다.
//
// buildBasisFactLines는 같은 groups를 프롬프트의 [계산 확정값] 블록으로도 바꿔 준다.
// 화면과 프롬프트가 같은 원본을 보게 만들어, LLM이 화면에 없는 수치를 지어내는 경로를 막는다.

import { lookupTerm } from "./fortune-glossary.js";

const MAX_LABEL = 60;
const MAX_VALUE = 300;
const MAX_ITEMS_PER_GROUP = 40;

export const BASIS_TONES = Object.freeze(["positive", "caution", "neutral"]);

function clean(value, max = MAX_VALUE) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeTone(tone) {
  const text = clean(tone, 16);
  return BASIS_TONES.includes(text) ? text : "neutral";
}

/**
 * 근거 항목 하나. term을 주면 용어 풀이(termHint/termDetail)를 함께 실어 보내
 * React 화면과 바닐라 화면이 같은 툴팁 문장을 쓰게 한다.
 * @param {string} label 항목 이름 (예: "명궁")
 * @param {unknown} value 계산된 값 (예: "축궁 · 자미(廟), 천부(得)")
 * @param {{ term?: string, tone?: "positive"|"caution"|"neutral" }} [options]
 */
export function basisItem(label, value, options = {}) {
  const item = { label: clean(label, MAX_LABEL), value: clean(value) };
  // term을 명시하지 않아도 항목명 자체가 용어사전에 있으면 자동으로 붙인다(어댑터마다 반복하지 않도록).
  const entry = lookupTerm(clean(options.term, MAX_LABEL) || item.label);
  if (entry) {
    item.term = entry.term;
    item.termHint = entry.oneLiner;
    if (entry.detail) item.termDetail = entry.detail;
  }
  const tone = clean(options.tone, 16);
  if (tone) item.tone = normalizeTone(tone);
  return item;
}

/**
 * 근거 묶음 하나. 결과 화면에서 카드 한 장이 된다.
 * @param {string} key 안정적인 식별자 (stages[].groupKeys가 이 값을 가리킨다)
 * @param {string} title 사람이 읽는 제목
 * @param {Array<ReturnType<typeof basisItem>|null|undefined>} items
 * @param {{ hint?: string }} [options] hint는 "이 표를 어떻게 읽는지" 한 줄 안내
 */
export function basisGroup(key, title, items, options = {}) {
  const group = {
    key: clean(key, MAX_LABEL),
    title: clean(title, MAX_LABEL),
    items: (Array.isArray(items) ? items : [])
      .filter((item) => item && clean(item.label) && clean(item.value))
      .slice(0, MAX_ITEMS_PER_GROUP),
  };
  const hint = clean(options.hint);
  if (hint) group.hint = hint;
  return group;
}

/**
 * 대기 화면의 계산 단계 하나. groupKeys에 적힌 묶음이 이 단계에서 화면에 드러난다.
 * @param {string} key
 * @param {string} label 단계 제목 (예: "명궁을 세우는 중")
 * @param {string} detail 한 줄 부연 (예: "12궁 배치 계산")
 * @param {string[]} groupKeys
 */
export function basisStage(key, label, detail, groupKeys) {
  return {
    key: clean(key, MAX_LABEL),
    label: clean(label, MAX_LABEL),
    detail: clean(detail, MAX_LABEL),
    groupKeys: (Array.isArray(groupKeys) ? groupKeys : []).map((groupKey) => clean(groupKey, MAX_LABEL)).filter(Boolean),
  };
}

/**
 * 라우트 어댑터가 만든 groups/stages를 최종 응답 형태로 봉인한다.
 * 빈 묶음은 떨어뜨리고, 실재하지 않는 groupKey를 가리키는 단계도 정리한다.
 * @param {{ featureKey: string, groups: unknown[], stages?: unknown[], uncertainty?: Record<string, unknown> }} input
 */
export function buildAnalysisBasisPayload({ featureKey, groups, stages, uncertainty } = {}) {
  const safeGroups = (Array.isArray(groups) ? groups : []).filter((group) => group && group.key && group.items?.length);
  const knownKeys = new Set(safeGroups.map((group) => group.key));
  // 가리키는 묶음이 하나도 남지 않은 단계는 떨어뜨린다.
  // (입력이 부족해 그 묶음이 통째로 비면, 대기 화면에 내용 없는 단계 라벨만 남는다.)
  const safeStages = (Array.isArray(stages) ? stages : [])
    .map((stage) => ({ ...stage, groupKeys: (stage?.groupKeys || []).filter((key) => knownKeys.has(key)) }))
    .filter((stage) => stage.key && stage.label && stage.groupKeys.length);

  const payload = {
    ok: true,
    featureKey: clean(featureKey, MAX_LABEL),
    computedAt: new Date().toISOString(),
    groups: safeGroups,
    stages: safeStages,
  };
  if (uncertainty && typeof uncertainty === "object" && Object.keys(uncertainty).length) {
    payload.uncertainty = uncertainty;
  }
  return payload;
}

/**
 * 계약 위반을 즉시 드러낸다. 검증 하네스(verify-analysis-basis-contract.mjs)가 쓴다.
 * @param {unknown} payload
 * @returns {string[]} 위반 목록 (빈 배열이면 통과)
 */
export function collectBasisShapeIssues(payload) {
  const issues = [];
  if (!payload || typeof payload !== "object") return ["payload_not_object"];
  if (!clean(payload.featureKey)) issues.push("featureKey_missing");
  if (!Array.isArray(payload.groups) || !payload.groups.length) issues.push("groups_empty");

  const seenKeys = new Set();
  for (const group of Array.isArray(payload.groups) ? payload.groups : []) {
    if (!group?.key) issues.push("group_key_missing");
    else if (seenKeys.has(group.key)) issues.push(`group_key_duplicated:${group.key}`);
    else seenKeys.add(group.key);
    if (!group?.title) issues.push(`group_title_missing:${group?.key || "?"}`);
    if (!Array.isArray(group?.items) || !group.items.length) issues.push(`group_items_empty:${group?.key || "?"}`);
    for (const item of Array.isArray(group?.items) ? group.items : []) {
      if (!item?.label || !item?.value) issues.push(`item_incomplete:${group?.key || "?"}`);
      if (item?.tone && !BASIS_TONES.includes(item.tone)) issues.push(`item_tone_invalid:${item.tone}`);
    }
  }

  for (const stage of Array.isArray(payload.stages) ? payload.stages : []) {
    if (!stage?.key || !stage?.label) issues.push("stage_incomplete");
    for (const groupKey of Array.isArray(stage?.groupKeys) ? stage.groupKeys : []) {
      if (!seenKeys.has(groupKey)) issues.push(`stage_group_key_unknown:${groupKey}`);
    }
  }
  return issues;
}

/**
 * 같은 groups를 프롬프트의 [계산 확정값] 블록으로 바꾼다.
 * 화면에 보이는 항목명을 LLM이 그대로 인용하게 만들어, 근거 배지와 본문이 어긋나지 않게 한다.
 * @param {{ groups?: unknown[] }} payload
 * @returns {string[]}
 */
export function buildBasisFactLines(payload) {
  const lines = [];
  for (const group of Array.isArray(payload?.groups) ? payload.groups : []) {
    if (!group?.items?.length) continue;
    lines.push(`[${group.title}]`);
    for (const item of group.items) {
      lines.push(`- ${item.label}: ${item.value}`);
    }
  }
  return lines;
}

/**
 * 본문이 인용해야 할 항목명 화이트리스트. 프롬프트 근거 규칙과 프런트 근거 배지가 같이 쓴다.
 * @param {{ groups?: unknown[] }} payload
 * @returns {string[]}
 */
export function collectBasisLabels(payload) {
  const labels = [];
  for (const group of Array.isArray(payload?.groups) ? payload.groups : []) {
    for (const item of Array.isArray(group?.items) ? group.items : []) {
      if (item?.label && !labels.includes(item.label)) labels.push(item.label);
    }
  }
  return labels;
}
