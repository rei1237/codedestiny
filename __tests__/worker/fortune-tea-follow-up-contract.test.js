/** @jest-environment node */
import {
  TEA_FOLLOW_UP_MAX_CHARS,
  buildTeaFollowUpDigest,
  normalizeTeaFollowUpAnswer,
  normalizeTeaFollowUpQuestion,
  publicTeaFollowUps,
  teaFollowUpAllowance,
} from "../../worker/lib/fortune-tea-follow-up-contract.js";

const sentence = (topic, n) => Array.from({ length: n }, (_, i) => `${topic}의 ${i + 1}번째 근거를 차분히 짚어 봅니다.`).join(" ");
const answer = (n) => ({
  answerTitle: "이직 시기",
  directAnswer: sentence("핵심 답", n),
  evidence: [sentence("일간", n), sentence("대운", n), sentence("세운", n)],
  guidance: sentence("해볼 일", n),
  caution: sentence("주의", 2),
  closing: "천천히 정해도 늦지 않아요.",
});

test("결과 1건당 추가 질문은 1회다", () => {
  expect(teaFollowUpAllowance({})).toEqual({ limit: 1, used: 0, remaining: 1 });
  expect(teaFollowUpAllowance({ followUps: [{}, {}] })).toEqual({ limit: 1, used: 1, remaining: 0 });
});

test("질문은 공백을 뺀 4~600자만 받고 제어 문자를 지운다", () => {
  expect(normalizeTeaFollowUpQuestion("네 ?")).toEqual({ ok: false, reason: "FOLLOW_UP_QUESTION_TOO_SHORT" });
  expect(normalizeTeaFollowUpQuestion("가".repeat(601)).reason).toBe("FOLLOW_UP_QUESTION_TOO_LONG");
  expect(normalizeTeaFollowUpQuestion("  이직은 언제가\u0007 좋을까요?  ")).toEqual({ ok: true, question: "이직은 언제가 좋을까요?" });
});

test("답변은 구조만 검사하고, 길면 자르고 짧으면 보강 신호만 낸다", () => {
  expect(normalizeTeaFollowUpAnswer({ ...answer(3), evidence: ["하나뿐인 근거"] })).toEqual({ ok: false, reason: "FOLLOW_UP_ANSWER_STRUCTURE" });
  const long = normalizeTeaFollowUpAnswer({ ...answer(30), evidence: Array(7).fill(sentence("근거", 30)) });
  expect(long.ok).toBe(true);
  expect(long.answer.evidence).toHaveLength(5);
  expect(long.chars).toBeLessThanOrEqual(TEA_FOLLOW_UP_MAX_CHARS);
  expect(long.needsRepair).toBe(false);
  const short = normalizeTeaFollowUpAnswer(answer(2));
  expect([short.ok, short.needsRepair]).toEqual([true, true]);
});

test("요약은 원래 결과의 질문·장 제목·처방만 담고 4,000자를 넘지 않는다", () => {
  const digest = buildTeaFollowUpDigest({
    questionSummary: "올해 이직해도 될까요?",
    saju: { summary: "경금 일간의 단단한 결", deepSections: Array.from({ length: 30 }, (_, i) => ({ title: `장 ${i + 1}`, body: sentence("장", 20) })) },
    actionPrescription: "이번 달은 이력서만 다듬어 두세요.",
  });
  expect(digest).toContain("처음 질문: 올해 이직해도 될까요?");
  expect(digest).toContain("장 「장 1」");
  expect(Array.from(digest).length).toBeLessThanOrEqual(4000);
});

test("공개 목록은 잠금·모델 정보를 내보내지 않는다", () => {
  const [item] = publicTeaFollowUps({ followUps: [{ id: "f1", clientQuestionId: "client-question-1", question: "언제요?", answer: answer(3), model: "gemini", lease: "x", createdAt: new Date("2026-10-16T00:00:00Z") }] });
  expect(Object.keys(item).sort()).toEqual(["answer", "clientQuestionId", "createdAt", "id", "question"]);
  expect(item.createdAt).toBe("2026-10-16T00:00:00.000Z");
});
