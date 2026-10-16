import { FEATURE_KEY_PRICE_TABLE } from '../../worker/lib/paid-feature-registry.js';

export const NEO_EMAIL_FEATURE = 'neo-email-consultation';
export const NEO_EMAIL_PORTRAIT = '/images/master-profiles/neo-strategy-portrait.webp';
// 출시 정책 확정 전에는 환경값·클라이언트 플래그로 열 수 없다.
export const NEO_EMAIL_SALE_ENABLED = false;
export const NEO_LIMITS = Object.freeze({ questions: 10, question: 1000, context: 3000, answer: 30000 });
export const neoUnitPrice = () => FEATURE_KEY_PRICE_TABLE[NEO_EMAIL_FEATURE].amountKRW;
export const neoTotal = count => neoUnitPrice() * count;
export const neoMoney = amount => amount.toLocaleString('ko-KR') + '원';
export const NEO_STATUS_LABELS = Object.freeze({
  draft: '작성 중', preparing: '주문 준비 중', pending: '결제 대기', received: '접수 완료', editing: '답변 작성 중',
  correction: '질문 정정 요청', reviewed: '네오 검수 완료', sent: '답변 발송 완료',
  cancelled: '취소', refunded: '환불', retry: '전달 재시도', unknown: '전달 확인 필요',
});

export function neoError(code, message, status = 400) {
  return Object.assign(new Error(message), { code, status });
}
const fail = (code, message) => { throw neoError(code, message); };
export function hasMultipleQuestions(value) {
  const text = String(value || '');
  return (text.match(/(?:^|\n)\s*(?:\d+[.)]|[-*•])\s*\S/g) || []).length > 1
    || (text.match(/[?？]/g) || []).length > 1;
}
export function validateNeoInput(input) {
  if (!input || !Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > NEO_LIMITS.questions) {
    fail('QUESTION_COUNT', '질문은 1개부터 10개까지 작성해 주세요.');
  }
  const questions = input.questions.map((item, index) => {
    const text = String(typeof item === 'string' ? item : item?.text || '').trim();
    if (!text || text.length > NEO_LIMITS.question) fail('QUESTION_LENGTH', `질문 ${index + 1}을 1~1,000자로 작성해 주세요.`);
    if (hasMultipleQuestions(text)) fail('MULTIPLE_QUESTIONS', `질문 ${index + 1}에 여러 질문이 있어요. 질문 추가 버튼으로 나눠 주세요.`);
    return { id: `q${index + 1}`, text };
  });
  const context = String(input.context || '').trim();
  if (context.length > NEO_LIMITS.context) fail('CONTEXT_LENGTH', '상황 설명은 3,000자 이내로 작성해 주세요.');
  const email = String(input.email || '').trim();
  if (email.length > 254 || /[\r\n]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('EMAIL_INVALID', '회신받을 이메일 주소를 확인해 주세요.');
  if (input.consent !== true) fail('CONSENT_REQUIRED', '상담 정보 수집·이용 안내를 확인해 주세요.');
  let birth = null;
  if (input.birth?.date) {
    const b = input.birth, date = String(b.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('BIRTH_INVALID', '생년월일을 확인해 주세요.');
    const [y,m,d] = date.split('-').map(Number);
    if (y < 1900 || y > new Date().getFullYear() || m < 1 || m > 12 || d < 1 || d > (b.calendar === 'lunar' ? 30 : new Date(Date.UTC(y,m,0)).getUTCDate())) fail('BIRTH_INVALID', '생년월일을 확인해 주세요.');
    if (!['solar','lunar'].includes(b.calendar)) fail('BIRTH_INVALID', '양력 또는 음력을 선택해 주세요.');
    if (b.calendar === 'lunar' && typeof b.leapMonth !== 'boolean') fail('BIRTH_INVALID', '윤달 여부를 선택해 주세요.');
    if (typeof b.timeUnknown !== 'boolean') fail('BIRTH_INVALID', '출생시간 또는 시간 모름을 선택해 주세요.');
    if (!b.timeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(b.time || ''))) fail('BIRTH_INVALID', '출생시간을 입력하거나 시간 모름을 선택해 주세요.');
    birth = { date, calendar: b.calendar, leapMonth: b.calendar === 'lunar' && b.leapMonth, timeUnknown: b.timeUnknown, time: b.timeUnknown ? null : b.time };
  }
  return { questions, context, email, birth, consent: true };
}
