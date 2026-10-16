const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function buildNeoEmail(row, job, operatorEmail) {
  const receipt = job.kind === 'receipt';
  const to = receipt ? operatorEmail : job.snapshot.email;
  if (typeof to !== 'string' || /[\r\n]/.test(to) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('INVALID_MAIL_RECIPIENT');
  const b = row.birth;
  const birth = b ? [b.date, b.calendar === 'lunar' ? '음력' : '양력', b.leapMonth ? '윤달' : '평달', b.timeUnknown ? '시간 모름' : b.time].join(' / ') : '출생정보 미입력';
  const text = receipt
    ? ['주문 ' + row.id, '질문 ' + row.questions.length + '개 · ' + row.quote.totalKRW + '원', '서버 결제 확인 완료', '회신: ' + row.email, birth, '상황: ' + row.context, ...row.questions.map((q,i) => (i+1) + '. ' + q.text)].join('\n\n')
    : ['네오에게 물어봐', '네오가 직접 검수한 답변입니다.', ...job.snapshot.questions.map((q,i) => '질문 ' + (i+1) + '. ' + q.text + '\n\n' + q.answer)].join('\n\n');
  return { to, subject: '[Code Destiny] ' + String(row.id).replace(/[^a-zA-Z0-9-]/g,'') + ' · 이메일 상담 ' + (receipt ? '접수' : '답변'), text, html: '<div style="white-space:pre-wrap;line-height:1.8">' + escape(text) + '</div>' };
}
export function neoMailAdapter(sendEmail, env) {
  return async (message, { idempotencyKey }) => {
    const result = await sendEmail(env, { ...message, idempotencyKey });
    return result?.ok ? { state: 'sent', providerId: result.data?.id }
      : { state: result?.status >= 400 && result.status < 500 && result.status !== 408 ? 'failed' : 'unknown' };
  };
}
