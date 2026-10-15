// 운명 찻집 추가 질문 계약: 횟수·잠금·질문 검사·원래 결과 요약·답변 구조를 한 곳에 둔다.
// 가격에 포함된 1회다. 횟수를 바꿀 때는 TEA_FOLLOW_UP_LIMIT 하나만 바꾼다.
import { countPaidReportBodyChars } from "./paid-report-quality.js";
import { trimPaidReportSections, trimPaidReportText } from "./paid-report-length.js";

export const TEA_FOLLOW_UP_LIMIT = 1;
// 엣지 응답 한계보다 길게 잡아, 살아 있는 생성이 끝나기 전에 다른 요청이 잠금을 가져가지 못하게 한다.
export const TEA_FOLLOW_UP_LEASE_MS = 120000;
export const TEA_FOLLOW_UP_QUESTION_MIN_CHARS = 4;
export const TEA_FOLLOW_UP_QUESTION_MAX_CHARS = 600;
// 목표는 1,500~2,000자. 하한 미만이면 한 번 보강하고, 그 뒤에는 구조가 맞으면 받는다.
export const TEA_FOLLOW_UP_MIN_CHARS = 1200;
export const TEA_FOLLOW_UP_TARGET_CHARS = Object.freeze({ min: 1500, max: 2000 });
export const TEA_FOLLOW_UP_MAX_CHARS = 2400;
const DIGEST_MAX_CHARS = 4000;

export const TEA_FOLLOW_UP_ANSWER_EXAMPLE = Object.freeze({
  answerTitle: "",
  directAnswer: "",
  evidence: [""],
  guidance: "",
  caution: "",
  closing: "",
});
const FIELD_LIMITS = { answerTitle: 60, directAnswer: 700, evidence: 450, guidance: 800, caution: 450, closing: 300 };

const text = (value) => (typeof value === "string" ? value : "")
  .normalize("NFC")
  .replace(/\r\n?/g, "\n")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim();
const oneLine = (value, max) => Array.from(text(value).replace(/\s+/g, " ")).slice(0, max).join("");

export function teaFollowUpAllowance(doc) {
  const used = Math.min(TEA_FOLLOW_UP_LIMIT, Array.isArray(doc?.followUps) ? doc.followUps.length : 0);
  return { limit: TEA_FOLLOW_UP_LIMIT, used, remaining: TEA_FOLLOW_UP_LIMIT - used };
}

export function normalizeTeaFollowUpQuestion(value) {
  const question = text(value);
  const chars = countPaidReportBodyChars(question);
  if (chars < TEA_FOLLOW_UP_QUESTION_MIN_CHARS) return { ok: false, reason: "FOLLOW_UP_QUESTION_TOO_SHORT" };
  if (chars > TEA_FOLLOW_UP_QUESTION_MAX_CHARS || question.length > TEA_FOLLOW_UP_QUESTION_MAX_CHARS * 2) {
    return { ok: false, reason: "FOLLOW_UP_QUESTION_TOO_LONG" };
  }
  return { ok: true, question };
}

export function normalizeTeaFollowUpClientId(value) {
  const id = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9._:-]{8,100}$/.test(id) ? id : "";
}

// 원래 결과에서 답의 맥락만 뽑는다. 모델이 새 근거를 만들지 않도록 계산 사실은 따로 넘긴다.
export function buildTeaFollowUpDigest(result) {
  const source = result && typeof result === "object" ? result : {};
  const lines = [];
  let length = 0;
  // 프롬프트 크기를 묶는 값이라 공백까지 센다. 넘치는 줄은 통째로 뺀다.
  const add = (label, value, max = 300) => {
    const body = oneLine(value, max);
    const line = body && `${label}: ${body}`;
    if (!line || length + line.length + 1 > DIGEST_MAX_CHARS) return;
    lines.push(line);
    length += line.length + 1;
  };
  add("상담 제목", source.sessionTitle, 120);
  add("처음 질문", source.questionSummary, 400);
  add("핵심 풀이", source.saju?.summary || source.sukuyoCompatibility?.summary || source.tarot?.reading, 500);
  add("한 줄 조언", source.saju?.oneLineAdvice, 200);
  const chapters = [
    ...(Array.isArray(source.saju?.deepSections) ? source.saju.deepSections : []),
    ...(Array.isArray(source.sukuyoCompatibility?.chapters) ? source.sukuyoCompatibility.chapters : []),
  ];
  for (const chapter of chapters) add(`장 「${oneLine(chapter?.title, 60)}」`, chapter?.body, 200);
  for (const card of Array.isArray(source.tarotCardReadings) ? source.tarotCardReadings : []) {
    add(`카드 「${oneLine(card?.positionLabel || card?.positionId, 40)}」`, card?.coreMeaning || card?.questionLink, 200);
  }
  add("연이의 흐름 읽기", source.yeoniReading?.main, 300);
  add("연이의 조언", source.yeoniReading?.advice, 200);
  add("종합", source.synthesis?.summary, 300);
  add("실천 처방", source.actionPrescription, 300);
  add("맺음말", source.closingLine, 200);
  return lines.join("\n");
}

// 구조만 검사한다. 길면 문장 경계에서 결정적으로 자르고, 짧다는 이유만으로 거부하지 않는다.
export function normalizeTeaFollowUpAnswer(value) {
  const source = value && typeof value === "object" ? value : {};
  const field = (key) => trimPaidReportText(text(source[key]), FIELD_LIMITS[key]);
  const evidence = (Array.isArray(source.evidence) ? source.evidence : [])
    .map((item) => trimPaidReportText(text(item), FIELD_LIMITS.evidence))
    .filter(Boolean)
    .slice(0, 5);
  const draft = {
    answerTitle: oneLine(source.answerTitle, FIELD_LIMITS.answerTitle) || "연이의 추가 답변",
    directAnswer: field("directAnswer"),
    evidence,
    guidance: field("guidance"),
    caution: field("caution"),
    closing: field("closing"),
  };
  if (!draft.directAnswer || !draft.guidance || evidence.length < 2) {
    return { ok: false, reason: "FOLLOW_UP_ANSWER_STRUCTURE" };
  }
  const sections = {
    directAnswer: { body: draft.directAnswer },
    ...Object.fromEntries(evidence.map((body, index) => [`evidence${index}`, { body }])),
    guidance: { body: draft.guidance },
    caution: { body: draft.caution },
    closing: { body: draft.closing },
  };
  const trimmed = trimPaidReportSections(sections, TEA_FOLLOW_UP_MAX_CHARS);
  const answer = {
    answerTitle: draft.answerTitle,
    directAnswer: trimmed.directAnswer.body,
    evidence: evidence.map((_, index) => trimmed[`evidence${index}`].body),
    guidance: trimmed.guidance.body,
    caution: trimmed.caution.body,
    closing: trimmed.closing.body,
  };
  const chars = teaFollowUpAnswerChars(answer);
  return { ok: true, answer, chars, needsRepair: chars < TEA_FOLLOW_UP_MIN_CHARS };
}

export function teaFollowUpAnswerChars(answer) {
  return [answer?.directAnswer, ...(answer?.evidence || []), answer?.guidance, answer?.caution, answer?.closing]
    .reduce((sum, item) => sum + countPaidReportBodyChars(item), 0);
}

// 저장된 추가 질문만 내보낸다. 잠금·모델 정보는 손님 화면에 필요 없다.
export function publicTeaFollowUps(doc) {
  return (Array.isArray(doc?.followUps) ? doc.followUps : []).slice(0, TEA_FOLLOW_UP_LIMIT).flatMap((item) => {
    const normalized = normalizeTeaFollowUpAnswer(item?.answer);
    if (!normalized.ok) return [];
    const createdAt = item?.createdAt ? new Date(item.createdAt) : null;
    return [{
      id: oneLine(item.id, 100),
      clientQuestionId: normalizeTeaFollowUpClientId(item.clientQuestionId) || undefined,
      question: text(item.question),
      answer: normalized.answer,
      createdAt: createdAt && Number.isFinite(createdAt.getTime()) ? createdAt.toISOString() : undefined,
    }];
  });
}
