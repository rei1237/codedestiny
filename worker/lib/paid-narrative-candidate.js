import { countPaidReportBodyChars, hasRepeatedReportPassage } from './paid-report-quality.js';

// Only a structurally complete narrative can bypass a length target. Structured
// JSON products keep their own producer validation and are not repaired here.
export function completeNarrativeBody(body) {
  if (typeof body !== 'string' || !body.trim() || hasRepeatedReportPassage(body)) return false;
  const paragraphs = body.trim().split(/\n\s*\n/u).filter(Boolean);
  return paragraphs.length > 1 && paragraphs.every(text => /[.!?。？！]["'”’)\]」』]*\s*$/u.test(text));
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

// Recover only provider-authored prose. A cut-off JSON wrapper is not a reason
// to purchase the same answer again; an explicit foreign evidence hash remains
// a different input and cannot be relabelled as this customer's consultation.
export function recoverNarrativeResponse(raw, evidenceHash) {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value;
  try { value = JSON.parse(clean); } catch {
    const body = clean.match(/"body"\s*:\s*("(?:[^"\\]|\\.)*")/s);
    const evidence = clean.match(/"evidenceHash"\s*:\s*"([^"\\]*)"/);
    if (!body) return null;
    try { value = { body: JSON.parse(body[1]), ...(evidence && { evidenceHash: evidence[1] }) }; } catch { return null; }
  }
  if (!value || typeof value.body !== 'string') return null;
  if (value.evidenceHash && value.evidenceHash !== evidenceHash) return null;
  return { ...value, evidenceHash };
}

export function normalizeDeliverableNarrative(body) {
  if (typeof body !== 'string' || /<\/?[a-z][^>]*>/i.test(body)) return null;
  const seen = new Set();
  const paragraphs = body.trim().split(/\n\s*\n/u).map(p => p.trim()).filter(p => {
    const key = p.replace(/\s/gu, '');
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
  const text = paragraphs.join('\n\n');
  return completeNarrativeBody(text) ? text : null;
}
