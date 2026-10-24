import { neoReadingLabel, neoBirthLabel, neoMoney } from '../../lib/neo-consultation/contract.js';
import { AI_LOCALE_LABEL, toAiLocale } from '../../lib/i18n/ai-locale.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function buildNeoEmail(row, job, operatorEmail) {
  const receipt = job.kind !== 'answer';
  const to = receipt ? operatorEmail : job.snapshot.email;
  if (typeof to !== 'string' || /[\r\n]/.test(to) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('INVALID_MAIL_RECIPIENT');
  const text = receipt
    ? ['주문 ' + row.id, '요청 답변 언어: ' + AI_LOCALE_LABEL[toAiLocale(row.locale)] + ' · 이 언어로 답변을 작성하고 검수해 주세요.', '질문 ' + row.questions.length + '개 · ' + row.quote.totalKRW + '원', job.kind === 'cancellation' ? '취소·전액 환불 요청: 답변 발송을 중지했습니다. 기존 관리자 주문 화면에서 결제 상태를 확인하고 환불을 처리해 주세요.' : (row.deliveryMode === 'manual_email' ? '서버 결제 확인 완료. 접수 내용을 읽고 내부 시스템에서 답변을 작성·검수한 뒤 직접 이메일로 보내 주세요. 답변 본문은 서비스에 저장하지 말고 관리자 화면에서 발송 완료만 기록해 주세요.' : '서버 결제 확인 완료. 관리자 화면에서 질문을 확인하고 답변을 작성·검수해 주세요.'), ...(job.kind === 'receipt' && row.quote.pricingVersion >= 2 ? ['회신 이메일: ' + row.email, '출생정보: ' + neoBirthLabel(row.birth), '상황 설명: ' + (row.context || '없음'), '특별히 좋았던 시기: ' + (row.goodPeriod || '입력하지 않음'), '힘들었던 시기: ' + (row.difficultPeriod || '입력하지 않음'), ...row.questions.map((q,i) => '질문 ' + (i+1) + ' · ' + neoReadingLabel(q) + ' · ' + neoMoney(row.quote.items.find(item => item.questionId === q.id).unitKRW) + '\n' + q.text)] : []), 'https://code-destiny.com/admin/neo-consultations/'].join('\n\n')
    : ['네오에게 물어봐', '네오가 직접 검수한 답변입니다.', ...job.snapshot.questions.map((q,i) => '질문 ' + (i+1) + '. ' + q.text + '\n풀이 방식: ' + neoReadingLabel(q) + '\n\n' + q.answer)].join('\n\n');
  return { to, subject: '[Code Destiny] ' + String(row.id).replace(/[^a-zA-Z0-9-]/g,'') + ' · 이메일 상담 ' + (receipt ? '접수' : '답변'), text, html: '<div style="white-space:pre-wrap;line-height:1.8">' + escape(text) + '</div>' };
}
export function neoMailAdapter(sendEmail, env) {
  return async (message, { idempotencyKey }) => {
    const result = await sendEmail(env, { ...message, idempotencyKey });
    return result?.ok ? { state: 'sent', providerId: result.data?.id }
      : { state: result?.status >= 400 && result.status < 500 && result.status !== 408 ? 'failed' : 'unknown' };
  };
}
