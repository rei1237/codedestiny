import { callGeminiJsonWithRetry } from "./structured-consultation.js";
import { runWithAiLocale } from "./ai-locale-context.js";
import { countPaidReportBodyChars, hasRepeatedReportPassage, paidReportBody } from "./paid-report-quality.js";

function repeated(text) {
  if (hasRepeatedReportPassage(text)) return true;
  const sentences = paidReportBody(text).split(/[.!?。？！\n]+/u).map(value => value.replace(/\s/gu, "")).filter(value => value.length >= 8);
  const counts = new Map();
  for (const sentence of sentences) counts.set(sentence, (counts.get(sentence) || 0) + 1);
  return [...counts.values()].some(count => count >= 5 && count >= sentences.length * 0.2);
}

// 🔴 evidenceHash 는 프롬프트가 실어 보낸 값을 되돌려받는 echo 라 근거 대조가 되지 못한다.
//    저장될 본문이 계산된 확정 점수를 지키는지는 계산값으로 직접 대조한다.
const SCORE_CLAIM = /(\d{1,3})\s*(?:점|\/\s*100)/gu;
/** 대조 기준은 계산이 확정한 점수다. 이 배포 전에 시작된 문서는 같은 값이 실린 framePrompt 에서 읽는다. */
export function relationshipScoreAnchor(meta) {
  const direct = Number(meta?.scoreAnchor?.score);
  if (Number.isInteger(direct) && direct >= 0 && direct <= 100) return direct;
  const legacy = String(meta?.framePrompt || "").match(/\[확정 점수\] (\d{1,3})\/100/u);
  const parsed = legacy ? Number(legacy[1]) : NaN;
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}
/** 기준이 없으면 검사 생략이 아니라 거절한다(코딩 원칙 10). citation 인 장 앞부분은 인용까지 요구한다. */
export function relationshipScoreBasisOk(text, score, { citation = false } = {}) {
  if (score === null) return false;
  let cited = false;
  for (const [, claimed] of String(text ?? "").matchAll(SCORE_CLAIM)) {
    if (Number(claimed) !== score) return false;
    cited = true;
  }
  return citation ? cited : true;
}
export const RELATIONSHIP_PART_IDS = [...Array.from({ length: 10 }, (_, i) => String(i)), "frame"];
export function relationshipDeliveryComplete(delivery) {
  return RELATIONSHIP_PART_IDS.every(id => delivery.parts?.[id])
    && countPaidReportBodyChars(Array.from({ length: 10 }, (_, i) => delivery.parts[String(i)]?.body || "").join("\n")) >= 20000;
}
export function relationshipContent(meta) {
  return {
    ...(meta.delivery.parts.frame || { character: { title: "리포트 작성 중", caption: "저장된 장면부터 읽어 보세요." }, summary: "", finalMessage: "" }),
    sections: meta.titles.map((title, i) => ({ title, body: [meta.delivery.parts[String(i * 2)]?.body, meta.delivery.parts[String(i * 2 + 1)]?.body].filter(Boolean).join("\n\n") })),
  };
}
export async function generateRelationshipWave(env, meta, checkpoint) {
  let delivery = structuredClone(meta.delivery);
  const score = relationshipScoreAnchor(meta);
  const missing = RELATIONSHIP_PART_IDS.filter(id => !delivery.parts[id] && (delivery.attempts[id] || 0) < 3).slice(0, 4);
  for (const id of missing) delivery.attempts[id] = (delivery.attempts[id] || 0) + 1;
  if (missing.length) await checkpoint(structuredClone(delivery));
  let queue = Promise.resolve();
  const settled = await Promise.allSettled(missing.map(async id => {
    const frame = id === "frame", index = Number(id), chapter = Math.floor(index / 2);
    const cites = !frame && index % 2 === 0;
    const instruction = frame
      ? `마지막 JSON에 evidenceHash: "${meta.evidenceHash}"도 포함하세요. character.title/caption, summary, finalMessage는 모두 비어 있지 않아야 합니다. 확정 점수 ${score}점 외의 다른 점수는 쓰지 마세요.`
      : `이번 호출은 ${chapter + 1}장 중 ${index % 2 + 1}/2 부분만 작성합니다. 앞선 전체 장 출력 지시 대신 JSON {"evidenceHash":"${meta.evidenceHash}","body":"본문"}만 반환하세요. 본문은 제목·마크다운·공백 제외 최소 2000자, 목표 2200~2500자입니다. ${index % 2 ? "앞부분의 근거/패턴 설명을 반복하지 말고 반대 조건, 주의점, 상황별 대화와 실천 순서를 설명하세요." : `계산된 근거와 관계에서 나타날 수 있는 여러 생활 패턴을 구체적으로 설명하세요. 본문에 확정 점수 ${score}점을 최소 한 번 그대로 인용하세요. 행동 조언은 뒤 부분의 몫입니다.`} 적용 조건과 출생시각 미상 등 계산 한계를 명시하고 확정 점수 ${score}점 외의 새로운 점수나 명식을 만들지 마세요.`;
    const requestPrompt = `${frame ? meta.framePrompt : meta.sectionPrompts[chapter]}\n\n${instruction}`;
    let response;
    try {
      response = await runWithAiLocale(meta.locale || "ko", () => callGeminiJsonWithRetry(env, requestPrompt, {
        temperature: 0.72, baseTokens: 9500, capTokens: 9500, attempts: 1,
        timeoutMs: 45000, taskType: "fortune", fallbackToWorkersAI: false,
      }));
    } catch { return; }
    let value;
    try { value = JSON.parse(response?.text || ""); } catch { value = null; }
    const genuine = response?.ok && !response.truncated && !response.isMock && !/mock/i.test(`${response.provider || ""} ${response.model || ""}`);
    const shaped = genuine && value?.evidenceHash === meta.evidenceHash && (frame
      ? [value.character?.title, value.character?.caption, value.summary, value.finalMessage].every(v => typeof v === "string" && v.trim())
      : typeof value.body === "string" && countPaidReportBodyChars(value.body) >= 2000);
    // 저장될 본문만 대조한다. 장 앞부분은 계산된 확정 점수를 인용해야 하고, 어느 본문도 다른 점수를 말할 수 없다.
    const stored = shaped && (frame ? [value.character.title, value.character.caption, value.summary, value.finalMessage].join("\n") : value.body);
    const valid = shaped && relationshipScoreBasisOk(stored, score, { citation: cites });
    const part = valid ? frame ? { character: { title: value.character.title.slice(0, 40), caption: value.character.caption.slice(0, 300) }, summary: value.summary.slice(0, 1000), finalMessage: value.finalMessage.slice(0, 2000) } : { body: value.body } : null;
    const persist = async () => {
      const existing = Object.values(delivery.parts).map(part => part.body || "").join("\n");
      if (!part || repeated(part.body || JSON.stringify(part)) || (part.body && repeated(existing + "\n" + part.body))) {
        if (response?.ok) { delivery.invalidAttempts[id] = (delivery.invalidAttempts[id] || 0) + 1; await checkpoint(structuredClone(delivery)); }
        return;
      }
      delivery = { ...delivery, parts: { ...delivery.parts, [id]: part } };
      await checkpoint(structuredClone(delivery));
    };
    queue = queue.then(persist, persist); await queue;
  }));
  const failure = settled.find(value => value.status === "rejected");
  if (failure) throw failure.reason;
  return {
    delivery,
    limited: RELATIONSHIP_PART_IDS.some(id => !delivery.parts[id] && delivery.attempts[id] >= 3),
    knownFailed: RELATIONSHIP_PART_IDS.some(id => !delivery.parts[id] && delivery.invalidAttempts[id] >= 3),
  };
}
