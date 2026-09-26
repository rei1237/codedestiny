import { countPaidReportBodyChars, hasRepeatedReportPassage } from './paid-report-quality.js';

// Only a structurally complete narrative can bypass a length target. Structured
// JSON products keep their own producer validation and are not repaired here.
export function completeNarrativeBody(body) {
  if (typeof body !== 'string' || !body.trim() || hasRepeatedReportPassage(body)) return false;
  const paragraphs = body.trim().split(/\n\s*\n/u).filter(Boolean);
  return paragraphs.length > 1 && paragraphs.every(text => /[.!?。？！]["'”’)]?\s*$/u.test(text));
}

export function selectNarrativeCandidate(previous, body) {
  if (!completeNarrativeBody(body)) return previous || null;
  return !previous || countPaidReportBodyChars(body) > countPaidReportBodyChars(previous) ? body : previous;
}

export function narrativeRepairTask(task, draft) {
  if (!draft) return task;
  return { ...task, prompt: `${task.prompt || task.title || ''}\n[저장된 초안 보완]\n${draft}\n위 근거와 답변을 보존하고 이 항목에서 부족한 설명·반대 조건·행동 조언만 보완한 전체 본문을 반환하세요. 다른 항목은 다시 쓰지 마세요. 분량을 채우기 위한 반복이나 새로운 계산값은 금지합니다.` };
}
