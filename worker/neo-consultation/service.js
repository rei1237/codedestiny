import { NEO_EMAIL_FEATURE, NEO_LIMITS, NEO_PRICING_VERSION, neoError, neoUnitPrice, neoTotal, neoQuoteItems, neoQuestionPrice, neoReadingMode, neoChartReading, neoCombinedMode, neoReviewReady, validateNeoInput } from '../../lib/neo-consultation/contract.js';
import { buildNeoEmail } from './mail.js';

const copy = value => structuredClone(value);
const fail = (code, message, status = 409) => { throw neoError(code, message, status); };
const paid = row => row.payment?.status === 'paid';
const requirePaid = row => { if (!paid(row) || row.payment.blocked || row.cancellationRequestedAt) fail('PAYMENT_REQUIRED', '결제 또는 취소 요청 상태를 먼저 확인해 주세요.'); };
const requireAdmin = admin => { if (!admin?.id) fail('ADMIN_REQUIRED', '관리자 로그인이 필요합니다.', 403); };
const requireStoredDelivery = row => {
  if (row.deliveryMode === 'manual_email') fail('MANUAL_EMAIL_ONLY', '이 주문은 외부 이메일로 전달합니다. 서비스에 답변을 저장하지 않습니다.');
};
const publicRow = row => {
  const result = copy(row);
  delete result.userId;
  delete result.mailJobs;
  delete result.checkout;
  result.deliveryStatus = Object.fromEntries(['receipt','answer'].map(kind => [kind, row.mailJobs.filter(job => job.kind === kind).at(-1)?.state || 'none']));
  result.questions = result.questions.map(q => ({ id: q.id, text: q.text, readingMode: neoReadingMode(q), chartReading: neoChartReading(q), correction: q.correction || '', state: q.correction ? 'correction' : q.review ? 'reviewed' : 'received' }));
  result.deliveries = result.deliveries.map(delivery => ({
    key: delivery.key, sentAt: delivery.sentAt,
    questions: delivery.questions.map(q => ({ id: q.id, text: q.text, readingMode: neoReadingMode(q), chartReading: neoChartReading(q), answer: q.answer, state: 'reviewed' })),
  }));
  return result;
};

/** 외부 효과는 어댑터로 주입하고 결제 확정과 메일 발송을 분리한다. */
export function createNeoService({ repository, payments, sendMail, operatorEmail, reserveCapacity = async () => {}, now = () => new Date().toISOString(), id = () => crypto.randomUUID(), sendTimeoutMs = 8000 }) {
  async function read(orderId) {
    const row = await repository.get(orderId);
    if (!row) fail('NOT_FOUND', '상담을 찾지 못했어요.', 404);
    return row;
  }
  async function own(orderId, userId) {
    if (!userId) fail('UNAUTHORIZED', '로그인이 필요합니다.', 401);
    const row = await read(orderId);
    if (row.userId !== userId) fail('NOT_FOUND', '상담을 찾지 못했어요.', 404);
    return row;
  }
  async function save(row, expectedVersion) {
    const next = { ...row, version: expectedVersion + 1, updatedAt: now() };
    if (!await repository.compareAndSwap(row.id, expectedVersion, next)) fail('STALE_ORDER', '다른 변경이 있어요. 새로 확인한 뒤 다시 시도해 주세요.');
    return next;
  }
  function assertVersion(row, version) {
    if (version !== row.version) fail('STALE_ORDER', '주문이 변경됐어요. 최신 내용을 확인해 주세요.');
  }
  function question(row, questionId) {
    const found = row.questions.find(q => q.id === questionId);
    if (!found) fail('QUESTION_NOT_FOUND', '질문을 찾지 못했어요.', 404);
    return found;
  }
  async function syncPayment(row) {
    if (!row.payment?.id) return row;
    const payment = await payments.read(row.payment.id);
    row.payment.blocked = payment.blocked === true;
    if (payment.status === 'failed' && row.state === 'pending') {
      return save({...row,state:'payment_failed'},row.version);
    }
    if (['cancelled','refunded'].includes(payment.status) && row.payment.status !== payment.status) {
      return save({ ...row, payment: { ...row.payment, status: payment.status }, state: payment.status,
        contentDeleteAfter:row.contentDeleteAfter || new Date(Date.parse(now())+7*86400000).toISOString() }, row.version);
    }
    return row;
  }
  return {
    async maintenance(orderId) {
      const row=await syncPayment(await read(orderId));
      return save({...row,maintenanceAt:now()},row.version);
    },
    async purgeExpiredContent(orderId) {
      const row = await read(orderId);
      const expiredDraft = row.state === 'draft' && Date.parse(now())-Date.parse(row.createdAt)>=7*86400000;
      if (row.contentDeletedAt || (!expiredDraft && (!row.contentDeleteAfter || row.contentDeleteAfter>now()))) return;
      if (row.mailJobs.some(j => j.state === 'sending' && Date.parse(now())-Date.parse(j.claimedAt)<15*60000)) return;
      row.email=''; row.context=''; row.goodPeriod=''; row.difficultPeriod=''; row.birth=null; row.partnerBirth=null;
      delete row.checkout;
      row.questions=row.questions.map(q => ({id:q.id,text:'',readingMode:neoReadingMode(q),chartReading:neoChartReading(q),answerVersion:q.answerVersion,review:q.review}));
      if (row.quote) row.quote.questions=row.quote.questions.map(q=>({id:q.id}));
      row.deliveries=[];
      row.mailJobs=row.mailJobs.map(({snapshot,...job})=>({...job,state:['pending','retry'].includes(job.state)?'expired':job.state}));
      row.contentDeletedAt=now();
      await save(row,row.version);
    },
    async create(userId, input) {
      if (!userId) fail('UNAUTHORIZED', '로그인이 필요합니다.', 401);
      const valid = validateNeoInput(input);
      const row = { id: id(), userId, ...valid, deliveryMode: 'manual_email', version: 1, state: 'draft', payment: null, quote: null, mailJobs: [], deliveries: [], createdAt: now(), updatedAt: now() };
      await repository.insert(row);
      return publicRow(row);
    },
    async update(userId, orderId, input, version) {
      const row = await own(orderId, userId);
      assertVersion(row, version);
      const valid = validateNeoInput(input);
      if (paid(row) || row.deliveries.length || row.state === 'preparing') fail('ORDER_LOCKED', '결제 준비 중이거나 결제한 질문은 변경할 수 없어요.');
      if (row.payment?.id) await payments.cancelPending(row.payment.id);
      return publicRow(await save({ ...row, ...valid, quote: null, payment: null, state: 'draft' }, row.version));
    },
    async quote(userId, orderId, version) {
      const row = await own(orderId, userId);
      assertVersion(row, version);
      if (row.state !== 'draft') fail('ORDER_LOCKED', '이미 준비한 주문입니다. 현재 주문을 확인해 주세요.');
      validateNeoInput(row);
      const quantity = row.questions.length;
      const quote = { id: id(), pricingVersion: NEO_PRICING_VERSION, unitKRW: row.questions.every(q => neoQuestionPrice(q) === neoUnitPrice()) ? neoUnitPrice() : null, items: neoQuoteItems(row.questions), quantity, totalKRW: neoTotal(row.questions), questions: copy(row.questions), createdAt: now() };
      return publicRow(await save({ ...row, quote }, row.version));
    },
    async prepare(userId, orderId, quoteId) {
      let row = await own(orderId, userId);
      if (!row.quote || row.quote.id !== quoteId) fail('QUOTE_CHANGED', '질문과 가격을 다시 확인해 주세요.');
      if (row.payment) return publicRow(row);
      if (!['draft','preparing'].includes(row.state)) fail('ORDER_LOCKED', '결제 준비할 수 없는 상태입니다.');
      if (row.state === 'draft') row = await save({ ...row, state: 'preparing',
        capacityDay: new Date(Date.parse(now()) + 9 * 3600000).toISOString().slice(0,10) }, row.version);
      try { await reserveCapacity(row); }
      catch (error) {
        if (error.code === 'DAILY_CAPACITY_FULL') await save({...row,state:'draft',capacityDay:null},row.version);
        throw error;
      }
      const payment = await payments.prepare({ userId, featureKey: NEO_EMAIL_FEATURE, requestId: row.id, idempotencyKey: row.quote.id, amountKRW: row.quote.totalKRW, consultation: copy(row.quote) });
      // 같은 견적의 느린 재시도가 먼저 저장한 결제 연결을 덮어쓰지 않는다.
      const latest = await own(orderId, userId);
      if (latest.payment) {
        if (latest.payment.id !== payment.id) fail('PAYMENT_MISMATCH', '기존 결제 주문을 다시 확인해 주세요.');
        return publicRow(latest);
      }
      row = latest;
      if (row.state !== 'preparing' || row.quote?.id !== quoteId) fail('QUOTE_CHANGED', '질문과 가격을 다시 확인해 주세요.');
      return publicRow(await save({ ...row, ...(payment.checkout ? {checkout:payment.checkout} : {}), payment: { id: payment.id, status: 'pending' }, state: 'pending' }, row.version));
    },
    async acceptPayment(orderId) {
      let row = await read(orderId);
      if (!row.payment) fail('PAYMENT_REQUIRED', '결제 준비가 필요합니다.');
      const payment = await payments.read(row.payment.id);
      if (payment.status !== 'paid') fail('PAYMENT_NOT_PAID', '결제 확인이 완료되지 않았어요.');
      if (payment.userId !== row.userId || payment.featureKey !== NEO_EMAIL_FEATURE || payment.amountKRW !== row.quote.totalKRW
        || payment.requestId !== row.id || payment.quoteId !== row.quote.id) fail('PAYMENT_MISMATCH', '주문과 결제 정보가 일치하지 않습니다.');
      if (paid(row)) return publicRow(row);
      if (!['pending','payment_failed'].includes(row.state)) fail('ORDER_LOCKED', '접수 가능한 주문 상태가 아닙니다.');
      row = await save({ ...row, payment: { ...row.payment, status: 'paid' }, state: 'received',
        mailJobs: [{ key: row.id + ':receipt', kind: 'receipt', state: 'pending', attempt: 0 }] }, row.version);
      return publicRow(row);
    },
    async get(userId, orderId) { return publicRow(await syncPayment(await own(orderId, userId))); },
    async requestCancellation(userId, orderId, version) {
      const row = await syncPayment(await own(orderId,userId));
      assertVersion(row,version);
      if (row.cancellationRequestedAt) return publicRow(row);
      requirePaid(row);
      if (row.manualDelivery) fail('DELIVERY_CHECK_REQUIRED', '답변 이메일 발송이 기록된 주문입니다. 회사 이메일로 문의해 주세요.');
      if (row.mailJobs.some(j => j.kind === 'answer' && ['sending','unknown','sent'].includes(j.state)))
        fail('DELIVERY_CHECK_REQUIRED','발송 여부 확인이 필요합니다. 회사 이메일로 취소·환불을 요청해 주세요.');
      row.cancellationRequestedAt = now();
      row.state = 'cancellation_requested';
      row.mailJobs.push({key:row.id+':cancellation',kind:'cancellation',state:'pending',attempt:0});
      return publicRow(await save(row,row.version));
    },
    async list(userId) {
      if (!userId) fail('UNAUTHORIZED', '로그인이 필요합니다.', 401);
      return (await repository.list(userId)).map(publicRow);
    },
    async adminList(admin) { requireAdmin(admin); return repository.list(); },
    async adminGet(admin, orderId) { requireAdmin(admin); return syncPayment(await read(orderId)); },
    async completeManualDelivery(admin, orderId, version, confirmed) {
      requireAdmin(admin);
      const row = await syncPayment(await read(orderId));
      requirePaid(row); assertVersion(row, version);
      if (row.deliveryMode !== 'manual_email') fail('LEGACY_DELIVERY', '기존 주문의 발송 절차를 이용해 주세요.');
      if (row.manualDelivery) return row;
      if (confirmed !== true || row.questions.some(q => q.correction)) fail('DELIVERY_CONFIRMATION_REQUIRED', '질문 정정을 마치고, 모든 선택 풀이의 검수와 실제 이메일 발송을 확인해 주세요.');
      row.manualDelivery = { by: admin.id, sentAt: now() };
      row.state = 'sent';
      row.contentDeleteAfter = new Date(Date.parse(now()) + 7 * 86400000).toISOString();
      return save(row, row.version);
    },
    async editAnswer(admin, orderId, questionId, answer, version) {
      requireAdmin(admin);
      const row = await syncPayment(await read(orderId));
      requirePaid(row); assertVersion(row, version);
      requireStoredDelivery(row);
      if (row.mailJobs.some(j => j.kind === 'answer' && ['pending','retry','sending','unknown'].includes(j.state))) fail('DELIVERY_PENDING', '기존 발송 결과를 확인한 뒤 수정해 주세요.');
      if (typeof answer !== 'string' || answer.length > NEO_LIMITS.answer) fail('ANSWER_LENGTH', '답변은 30,000자 이내로 작성해 주세요.');
      const q = question(row, questionId);
      q.answer = answer.trim(); q.answerVersion = (q.answerVersion || 0) + 1; q.review = null; q.correction = '';
      row.state = 'editing';
      return save(row, row.version);
    },
    async requestCorrection(admin, orderId, questionId, message, version) {
      requireAdmin(admin);
      const row = await syncPayment(await read(orderId));
      requirePaid(row); assertVersion(row, version);
      if (row.manualDelivery) fail('ORDER_LOCKED', '이메일 전달을 완료한 주문의 질문은 변경할 수 없어요.');
      if (row.mailJobs.some(j => j.kind === 'answer' && ['pending','retry','sending','unknown'].includes(j.state))) fail('DELIVERY_PENDING', '발송 결과를 먼저 확인해 주세요.');
      if (!String(message || '').trim() || message.length > 1000) fail('CORRECTION_REQUIRED', '정정할 내용을 1,000자 이내로 알려 주세요.');
      const q = question(row, questionId);
      q.correction = message.trim(); q.review = null; row.state = 'correction';
      return save(row, row.version);
    },
    async correct(userId, orderId, questionId, text, version) {
      const row = await syncPayment(await own(orderId, userId));
      requirePaid(row); assertVersion(row, version);
      if (row.manualDelivery) fail('ORDER_LOCKED', '이메일 전달을 완료한 주문의 질문은 변경할 수 없어요.');
      const q = question(row, questionId);
      if (!q.correction) fail('CORRECTION_NOT_REQUESTED', '정정 요청된 질문만 수정할 수 있어요.');
      const valid = validateNeoInput({ ...row, questions: [{ text, readingMode: neoReadingMode(q), chartReading: q.chartReading }] }, { requireBirth: false, allowLegacyModes: true, allowChartReading: true });
      q.text = valid.questions[0].text; q.correction = ''; q.answer = ''; q.review = null;
      q.answerVersion = (q.answerVersion || 0) + 1;
      row.state = row.questions.some(item => item.correction) ? 'correction' : 'received';
      return publicRow(await save(row, row.version));
    },
    async review(admin, orderId, questionId, version, combinedReadingConfirmed = false, chartReadingConfirmed = false) {
      requireAdmin(admin);
      const row = await syncPayment(await read(orderId));
      requirePaid(row); assertVersion(row, version);
      requireStoredDelivery(row);
      const q = question(row, questionId);
      if (!q.answer || q.correction) fail('ANSWER_REQUIRED', '정정 요청을 해결하고 답변을 입력해 주세요.');
      if (neoCombinedMode(q) && combinedReadingConfirmed !== true) fail('COMBINED_REVIEW_REQUIRED', '자미두수와 사주 풀이가 모두 포함됐는지 확인해 주세요.');
      if (neoChartReading(q) && chartReadingConfirmed !== true) fail('CHART_REVIEW_REQUIRED', '원국·명반 해석이 포함됐는지 확인해 주세요.');
      q.review = { by: admin.id, at: now(), answerVersion: q.answerVersion, combinedReadingConfirmed: combinedReadingConfirmed === true, chartReadingConfirmed: chartReadingConfirmed === true };
      row.state = row.questions.every(neoReviewReady) ? 'reviewed' : 'editing';
      return save(row, row.version);
    },
    async enqueueAnswer(admin, orderId, version, resend = false) {
      requireAdmin(admin);
      const row = await syncPayment(await read(orderId));
      requirePaid(row); assertVersion(row, version);
      requireStoredDelivery(row);
      if (!row.questions.every(neoReviewReady)) fail('REVIEW_REQUIRED', '모든 질문의 답변을 네오가 검수한 뒤 보낼 수 있어요.');
      if (row.mailJobs.some(j => j.kind === 'answer' && ['pending','sending','unknown','retry'].includes(j.state))) fail('DELIVERY_PENDING', '이미 예약된 발송을 확인해 주세요.');
      const answerKey = row.questions.map(q => q.answerVersion).join('-');
      const previous = row.mailJobs.filter(j => j.kind === 'answer' && j.answerKey === answerKey);
      if (previous.length && !resend) return row;
      if (resend && !previous.some(j => j.state === 'sent')) fail('RESEND_UNAVAILABLE', '발송 완료한 답변만 재발송할 수 있어요.');
      row.mailJobs.push({ key: row.id + ':answer:' + answerKey + ':' + previous.length, kind: 'answer', answerKey, state: 'pending', attempt: 0,
        snapshot: { email: row.email, questions: copy(row.questions), reviewedAt: now() } });
      return save(row, row.version);
    },
    async deliver(orderId, jobKey) {
      let row = await syncPayment(await read(orderId));
      const job = row.mailJobs.find(j => j.key === jobKey);
      if (job?.kind === 'answer') requireStoredDelivery(row);
      if (job?.kind !== 'cancellation') requirePaid(row);
      else if (!row.cancellationRequestedAt) fail('CANCELLATION_REQUIRED','취소 요청을 확인해 주세요.');
      if (!job || !['pending','retry'].includes(job.state)) return row;
      if (job.kind === 'answer' && (!row.questions.every(neoReviewReady) || !job.snapshot.questions.every(neoReviewReady))) fail('REVIEW_REQUIRED', '질문별 풀이와 최신 답변 검수를 확인해 주세요.');
      job.state = 'sending'; job.attempt++; job.claimedAt = now(); job.lastAttemptAt = now();
      row = await save(row, row.version);
      let outcome;
      let timer;
      try {
        outcome = await Promise.race([
          sendMail(buildNeoEmail(row, job, operatorEmail), { idempotencyKey: job.key }),
          new Promise(resolve => { timer = setTimeout(() => resolve({ state: 'unknown' }), sendTimeoutMs); }),
        ]);
      }
      catch { outcome = { state: 'unknown' }; }
      finally { clearTimeout(timer); }
      const current = await read(orderId);
      const currentJob = current.mailJobs.find(j => j.key === jobKey);
      if (currentJob?.state !== 'sending') return current;
      currentJob.state = outcome?.state === 'sent' ? 'sent' : outcome?.state === 'failed' ? 'retry' : 'unknown';
      currentJob.providerId = outcome?.providerId || null;
      if (currentJob.state === 'sent') {
        currentJob.sentAt = now();
        if (currentJob.kind === 'answer') {
          current.deliveries.push({ key: job.key, ...copy(currentJob.snapshot), sentAt: now() });
          current.contentDeleteAfter ||= new Date(Date.parse(now())+7*86400000).toISOString();
          if (paid(current)) current.state = 'sent';
        }
      }
      return save(current, current.version);
    },
    async resolveDelivery(admin, orderId, jobKey, resolution, version) {
      requireAdmin(admin);
      const row = await syncPayment(await read(orderId));
      requirePaid(row); assertVersion(row, version);
      const job = row.mailJobs.find(j => j.key === jobKey);
      if (!job || !['sending','unknown'].includes(job.state) || !['sent','not_sent'].includes(resolution)) fail('DELIVERY_RESOLUTION', '전달 확인이 필요한 메일을 선택해 주세요.');
      if (job.state === 'sending' && Date.parse(now()) - Date.parse(job.claimedAt) < 15 * 60 * 1000) fail('DELIVERY_IN_PROGRESS', '메일 전달 처리 중입니다. 결과 확인 후 다시 시도해 주세요.');
      job.resolvedBy = admin.id; job.resolvedAt = now();
      job.state = resolution === 'sent' ? 'sent' : 'retry';
      if (resolution === 'sent' && job.kind === 'answer' && !row.contentDeletedAt && !row.deliveries.some(d => d.key === job.key)) {
        row.deliveries.push({ key: job.key, ...copy(job.snapshot), sentAt: now() }); row.state = 'sent';
        row.contentDeleteAfter ||= new Date(Date.parse(now())+7*86400000).toISOString();
      }
      return save(row, row.version);
    },
  };
}
