import { isValidGregorianDate } from './maya-calendar-core.mjs';
const clean = value => String(value ?? '').trim();
const invalid = (message, code) => Object.assign(new Error(message), { status: 400, code });

// 구매 전 UI와 서버 seed가 동일한 입력 규칙을 사용한다.
export function normalizeMayaConsultationInput(body) {
  const question = clean(body.question);
  if (question.length < 2 || question.length > 500) throw invalid('상담 질문을 2~500자로 입력해 주세요.', 'INVALID_QUESTION');
  const { year, month, day } = body;
  if (!isValidGregorianDate(year, month, day) || year > 9999) throw invalid('상담 기준 날짜를 확인해 주세요.', 'INVALID_DATE');
  const birthDate = clean(body.birthDate);
  if (birthDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
    if (!match || !isValidGregorianDate(...match.slice(1).map(Number))) throw invalid('생년월일을 확인해 주세요.', 'INVALID_BIRTH_DATE');
  }
  return { question, birthDate, name: clean(body.name).slice(0, 80), topic: clean(body.topic).slice(0, 60), year, month, day };
}
