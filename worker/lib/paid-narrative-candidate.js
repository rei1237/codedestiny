import { salvageTruncatedJsonObject } from '../../lib/llm-text.js';
import { countPaidReportBodyChars, hasRepeatedReportPassage } from './paid-report-quality.js';
import { dedupeCodexBody } from './master-love-codex-quality.js';

// Keep provider prose, removing exact duplicate paragraphs and an unfinished tail.
// JSON products retain their adapter's validation; never treat JSON syntax as prose.
export function normalizeNarrativeBody(body, priorBodies = []) {
  if (typeof body !== 'string' || /^\s*[\[{]/u.test(body)) return body;
  const normalized = [...new Set(body.split(/\n\s*\n/u).map(paragraph => {
    const text = paragraph.trim();
    if (/[.!?。？！]["'”’)\]」』]*\s*$/u.test(text)) return text;
    const sentences = [...text.matchAll(/[.!?。？！]["'”’)\]」』]*(?=\s|$)/gu)];
    const last = sentences.at(-1);
    return last ? text.slice(0, last.index + last[0].length) : '';
  }).filter(Boolean))].join('\n\n');
  const edited = dedupeCodexBody(normalized, priorBodies);
  // Exact sentence edits reuse provider prose; a mostly copied answer still fails.
  return countPaidReportBodyChars(edited) >= countPaidReportBodyChars(normalized) * 0.8 ? edited : '';
}
export function completeNarrativeBody(body) {
  if (typeof body !== 'string' || hasRepeatedReportPassage(body)) return false;
  const paragraphs = body.trim().split(/\n\s*\n/u).filter(Boolean);
  return (paragraphs.length > 1 || countPaidReportBodyChars(body) >= 40) && paragraphs.every(text => /[.!?。？！]["'”’)\]」』]*\s*$/u.test(text));
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
  let value;
  try { value = JSON.parse(raw); } catch { value = salvageTruncatedJsonObject(raw); }
  if (!value || typeof value.body !== 'string' || (value.evidenceHash && value.evidenceHash !== evidenceHash)) return null;
  return { ...value, evidenceHash, body: [...new Set(value.body.split(/\n\s*\n/u).map(p => p.trim()).filter(Boolean))].join('\n\n') };
}
