import { salvageTruncatedJsonObject } from '../../lib/llm-text.js';
import { countPaidReportBodyChars, hasRepeatedReportPassage } from './paid-report-quality.js';
import { repairStructuredJsonText } from './json-text-repair.js';

// The server binds evidenceHash to the purchase; a provider copying the 64-character
// hash dropped otherwise usable answers, so the response carries only the body.
export const NARRATIVE_RESPONSE_SCHEMA = Object.freeze({
  type: 'OBJECT', required: ['body'],
  properties: { body: { type: 'STRING' } },
});
const SENTENCE_END = /[.!?。？！]["'”’)\]」』]*\s*$/u;
// A label introducing the next paragraph ("**4주 실행 계획:**", "다음과 같습니다:") is finished.
export const NARRATIVE_LABEL_END = /[:：](?:\*\*|__)?\s*$/u;

// The client escapes HTML, so block tags a provider returns become paragraph breaks.
export function stripNarrativeMarkup(body) {
  if (typeof body !== 'string' || !/<\/?(?:p|br|div)\b/iu.test(body)) return body;
  return body.replace(/<br\s*\/?>/giu, '\n').replace(/<\/?(?:p|div)\b[^>]*>/giu, '\n\n')
    .replace(/[ \t]+\n/gu, '\n').replace(/\n{3,}/gu, '\n\n').trim();
}

// Keep provider prose, removing exact duplicate paragraphs and an unfinished tail.
// JSON products retain their adapter's validation; never treat JSON syntax as prose.
// A bold or markdown label paragraph ("**힘을 실어주는 요소:**") introduces the next paragraph.
const LABEL_PARAGRAPH = /^(?:#{1,6}\s+\S.*|\*\*[^*\n]+\*\*:?)$/u;
export function normalizeNarrativeBody(body) {
  if (typeof body !== 'string' || /^\s*[\[{]/u.test(body)) return body;
  const paragraphs = [...new Set(stripNarrativeMarkup(body).split(/\n\s*\n/u).map(paragraph => {
    const text = paragraph.trim();
    // R6 2026-10-10: a finished sentence followed by a balanced evidence citation "(명궁: … 천동(평))" is complete.
    if (paragraphComplete(text)) return text;
    const sentences = [...text.matchAll(/[.!?。？！]["'”’)\]」』]*(?=\s|$)/gu)];
    const last = sentences.at(-1);
    return last ? text.slice(0, last.index + last[0].length) : '';
  }).filter(Boolean))];
  while (paragraphs.length && LABEL_PARAGRAPH.test(paragraphs.at(-1))) paragraphs.pop();
  return paragraphs.join('\n\n');
}
function paragraphComplete(paragraph) {
  const text = paragraph.trim();
  return SENTENCE_END.test(text) || LABEL_PARAGRAPH.test(text) || NARRATIVE_LABEL_END.test(text) || SENTENCE_END.test(withoutClosingCitation(text));
}
function withoutClosingCitation(text) {
  if (!/[)）]$/u.test(text)) return '';
  for (let i = text.length - 1, depth = 0; i >= 0; i--) {
    if (/[)）]/u.test(text[i])) depth++;
    else if (/[(（]/u.test(text[i]) && --depth === 0) return text.slice(0, i).trimEnd();
  }
  return '';
}
export function completeNarrativeBody(body) {
  if (typeof body !== 'string' || hasRepeatedReportPassage(body)) return false;
  const paragraphs = body.trim().split(/\n\s*\n/u).filter(Boolean);
  const last = paragraphs.at(-1)?.trim() || '';
  return (paragraphs.length > 1 || countPaidReportBodyChars(body) >= 40) && paragraphs.every(paragraphComplete)
    && !LABEL_PARAGRAPH.test(last) && !NARRATIVE_LABEL_END.test(last);
}

// A structured adapter passes its own completeness and length (see the delivery
// engine's completeBody/measureBody); narrative products keep the defaults.
export function selectNarrativeCandidate(previous, body, { complete = completeNarrativeBody, measure = countPaidReportBodyChars } = {}) {
  if (!complete(body)) return previous || null;
  return !previous || measure(body) > measure(previous) ? body : previous;
}

export function narrativeRepairTask(task, draft) {
  if (!draft) return task;
  return { ...task, prompt: `${task.prompt || task.title || ''}\n[저장된 초안 보완]\n${draft}\n위 근거와 답변을 보존하고 이 항목에서 부족한 설명·반대 조건·행동 조언만 보완한 전체 본문을 반환하세요. 다른 항목은 다시 쓰지 마세요. 분량을 채우기 위한 반복이나 새로운 계산값은 금지합니다.` };
}

// Restore JSON framing and citation metadata locally, without inventing prose.
// An explicit foreign hash is never reassigned to the current purchase.
export function parseNarrativeResponse(raw, evidenceHash) {
  raw = repairStructuredJsonText(raw, {
    ...NARRATIVE_RESPONSE_SCHEMA,
    // evidenceHash stays parseable so a foreign hash nested in an envelope is still rejected.
    properties: { ...NARRATIVE_RESPONSE_SCHEMA.properties, evidenceHash: { type: 'STRING' }, claims: { type: 'ARRAY' } },
  });
  let value;
  try { value = JSON.parse(raw); } catch { value = salvageTruncatedJsonObject(raw); }
  if (!value || typeof value.body !== 'string' || (value.evidenceHash && value.evidenceHash !== evidenceHash)) return null;
  return { ...value, evidenceHash, body: [...new Set(stripNarrativeMarkup(value.body).split(/\n\s*\n/u).map(p => p.trim()).filter(Boolean))].join('\n\n') };
}

// A part is one section of a report whose renderer adds the headings, so a provider's
// own markdown heading line ("### 3. …") inside the body is removed, not rejected.
export function stripNarrativeHeadings(body) {
  if (typeof body !== 'string') return body;
  return body.replace(/^[ \t]*#{1,6}\s.*$/gmu, '').replace(/\n\s*\n(?:\s*\n)+/gu, '\n\n').trim();
}

// Last-attempt salvage for a narrative part that came back as a JSON document:
// its multi-word string values become paragraphs; ids and keys are dropped.
export function narrativeTextFromJson(body) {
  let value;
  try { value = JSON.parse(body); } catch { value = salvageTruncatedJsonObject(body); }
  const texts = [];
  const walk = node => typeof node === 'string' ? /\s/u.test(node.trim()) && texts.push(node.trim())
    : node && typeof node === 'object' && Object.values(node).forEach(walk);
  walk(value);
  return normalizeNarrativeBody(texts.join('\n\n'));
}

// One opening sentence per earlier accepted part, so a later part continues the
// reading and keeps its conclusion instead of restarting it from the chart.
export function narrativePriorDigest(state, task, limit = 160) {
  const rows = (state.tasks || []).filter(row => row.id !== task.id && typeof state.parts?.[row.id] === 'string' && !/^\s*[\[{]/u.test(state.parts[row.id]))
    .map(row => `- ${row.title || row.id}: ${state.parts[row.id].trim().split(/(?<=[.!?。？！])\s/u)[0].slice(0, limit)}`);
  return rows.length ? `\n[앞 부분 요지]\n${rows.join('\n')}\n위 내용을 다시 쓰지 말고 이번 범위만 이어서 쓰세요. 앞에서 내린 결론과 모순되는 판단을 하지 않습니다.` : '';
}
