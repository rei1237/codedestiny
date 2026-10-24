import { FEATURE_KEY_PRICE_TABLE } from '../../worker/lib/paid-feature-registry.js';
import { NEO_POLICY_VERSION } from './policy.js';
import { toAiLocale } from '../i18n/ai-locale.js';

export const NEO_EMAIL_FEATURE = 'neo-email-consultation';
export const NEO_EMAIL_PORTRAIT = '/images/master-profiles/neo-strategy-portrait.webp';
// 표시와 서버 결제 관문은 같은 가격 등록소의 판매 상태를 사용한다.
export const NEO_EMAIL_SALE_ENABLED = FEATURE_KEY_PRICE_TABLE[NEO_EMAIL_FEATURE].saleEnabled === true;
export const NEO_LIMITS = Object.freeze({ questions: 10, question: 1000, context: 3000, period: 1000, answer: 30000 });
export const neoUnitPrice = () => FEATURE_KEY_PRICE_TABLE[NEO_EMAIL_FEATURE].amountKRW;
// 2026-10-18 v3: 사주가 기본이고 자미두수·원국/명반 해석은 질문별 추가 선택이다.
// ziwei·ziwei_saju는 v1·v2 주문의 표시와 가격 재검증에만 쓰는 레거시 방식이다.
export const NEO_READING_MODES = Object.freeze({ saju: '사주', saju_ziwei: '사주 + 자미두수', ziwei: '자미두수', ziwei_saju: '자미두수 + 사주' });
export const NEO_ORDER_MODES = Object.freeze(['saju', 'saju_ziwei']);
export const NEO_PRICING_VERSION = 3;
const LEGACY_MODES = ['ziwei', 'ziwei_saju'];
const COMBINED_MODES = ['ziwei_saju', 'saju_ziwei'];
export const neoSajuAddonPrice = () => FEATURE_KEY_PRICE_TABLE[NEO_EMAIL_FEATURE].sajuAddonKRW;
export const neoZiweiAddonPrice = () => FEATURE_KEY_PRICE_TABLE[NEO_EMAIL_FEATURE].ziweiAddonKRW;
export const neoChartAddonPrice = () => FEATURE_KEY_PRICE_TABLE[NEO_EMAIL_FEATURE].chartAddonKRW;
export function neoReadingMode(question) {
  const mode = question?.readingMode ?? 'ziwei';
  if (!Object.hasOwn(NEO_READING_MODES, mode)) throw neoError('READING_MODE_INVALID', '질문별 풀이 방식을 다시 선택해 주세요.');
  return mode;
}
export const neoLegacyMode = question => LEGACY_MODES.includes(neoReadingMode(question));
export const neoCombinedMode = question => COMBINED_MODES.includes(neoReadingMode(question));
export const neoChartReading = question => !neoLegacyMode(question) && question?.chartReading === true;
export const neoChartLabel = question => neoReadingMode(question) === 'saju' ? '사주 원국 해석' : '사주 원국·자미두수 명반 해석';
export const neoReadingLabel = question => NEO_READING_MODES[neoReadingMode(question)] + (neoChartReading(question) ? ' · ' + neoChartLabel(question) : '');
export function neoQuestionPrice(question) {
  const mode = neoReadingMode(question);
  if (mode === 'ziwei') return neoUnitPrice();
  if (mode === 'ziwei_saju') return neoUnitPrice() + neoSajuAddonPrice();
  return neoUnitPrice() + (mode === 'saju_ziwei' ? neoZiweiAddonPrice() : 0) + (neoChartReading(question) ? neoChartAddonPrice() : 0);
}
export const neoTotal = questions => Array.isArray(questions) ? questions.reduce((sum, q) => sum + neoQuestionPrice(q), 0) : neoUnitPrice() * questions;
// 레거시 항목은 v2 견적과 JSON이 같아야 하므로 키 순서를 바꾸지 않는다.
export const neoQuoteItems = questions => questions.map(q => neoLegacyMode(q)
  ? { questionId: q.id, readingMode: neoReadingMode(q), unitKRW: neoQuestionPrice(q) }
  : { questionId: q.id, readingMode: neoReadingMode(q), chartReading: neoChartReading(q), unitKRW: neoQuestionPrice(q) });
export const neoBirthLabel = birth => birth ? [birth.date, birth.calendar === 'lunar' ? '음력' : '양력', birth.calendar === 'lunar' ? (birth.leapMonth ? '윤달' : '평달') : '', birth.timeUnknown ? '시간 모름' : birth.time].filter(Boolean).join(' · ') : '입력하지 않음';
export const neoReviewReady = q => Boolean(q.answer && !q.correction && q.review?.answerVersion === q.answerVersion && (!neoCombinedMode(q) || q.review?.combinedReadingConfirmed === true) && (!neoChartReading(q) || q.review?.chartReadingConfirmed === true));
export const neoMoney = amount => amount.toLocaleString('ko-KR') + '원';
export const NEO_STATUS_LABELS = Object.freeze({
  draft: '작성 중', preparing: '주문 준비 중', pending: '결제 대기', received: '접수 완료', editing: '답변 작성 중',
  correction: '질문 정정 요청', reviewed: '네오 검수 완료', sent: '답변 발송 완료',
  cancelled: '취소', refunded: '환불', retry: '전달 재시도', unknown: '전달 확인 필요',
  cancellation_requested: '취소·환불 요청 접수',
  payment_failed:'결제 실패 · 재확인 필요',
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
export function validateNeoInput(input, { requireBirth = true, allowLegacyModes = false } = {}) {
  if (!input || !Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > NEO_LIMITS.questions) {
    fail('QUESTION_COUNT', '질문은 1개부터 10개까지 작성해 주세요.');
  }
  const questions = input.questions.map((item, index) => {
    const text = String(typeof item === 'string' ? item : item?.text || '').trim();
    if (!text || text.length > NEO_LIMITS.question) fail('QUESTION_LENGTH', `질문 ${index + 1}을 1~1,000자로 작성해 주세요.`);
    if (hasMultipleQuestions(text)) fail('MULTIPLE_QUESTIONS', `질문 ${index + 1}에 여러 질문이 있어요. 질문 추가 버튼으로 나눠 주세요.`);
    const readingMode = neoReadingMode({ readingMode: item?.readingMode ?? (allowLegacyModes ? 'ziwei' : 'saju') });
    if (!allowLegacyModes && !NEO_ORDER_MODES.includes(readingMode)) fail('READING_MODE_INVALID', '질문별 풀이 방식을 다시 선택해 주세요.');
    const chartReading = item?.chartReading;
    if (chartReading != null && typeof chartReading !== 'boolean') fail('READING_MODE_INVALID', '질문별 풀이 방식을 다시 선택해 주세요.');
    if (LEGACY_MODES.includes(readingMode)) {
      if (chartReading === true) fail('READING_MODE_INVALID', '질문별 풀이 방식을 다시 선택해 주세요.');
      return { id: `q${index + 1}`, text, readingMode };
    }
    return { id: `q${index + 1}`, text, readingMode, chartReading: chartReading === true };
  });
  const periods = {};
  for (const key of ['goodPeriod', 'difficultPeriod']) {
    if (input[key] != null && typeof input[key] !== 'string') fail('PERIOD_INVALID', '시기 기록은 글로 작성해 주세요.');
    periods[key] = (input[key] || '').trim();
    if (periods[key].length > NEO_LIMITS.period) fail('PERIOD_LENGTH', '각 시기 기록은 1,000자 이내로 작성해 주세요.');
  }
  const context = String(input.context || '').trim();
  if (context.length > NEO_LIMITS.context) fail('CONTEXT_LENGTH', '상황 설명은 3,000자 이내로 작성해 주세요.');
  const email = String(input.email || '').trim();
  if (email.length > 254 || /[\r\n]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('EMAIL_INVALID', '회신받을 이메일 주소를 확인해 주세요.');
  if (input.consent !== true) fail('CONSENT_REQUIRED', '상담 정보 수집·이용 안내를 확인해 주세요.');
  if (requireBirth && (!input.birth?.date || input.birth.timeUnknown !== false || !input.birth.time)) fail('BIRTH_REQUIRED', '생년월일과 출생시간을 모두 입력해 주세요.');
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
  return { questions, context, ...periods, email, birth, locale: toAiLocale(input.locale), consent: true, policyVersion:NEO_POLICY_VERSION };
}
