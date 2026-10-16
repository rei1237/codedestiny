import { NEO_EMAIL_FEATURE, NEO_LIMITS, neoError, neoUnitPrice, validateNeoInput } from '../../lib/neo-consultation/contract.js';
import { buildNeoEmail } from './mail.js';

const copy = value => structuredClone(value);
const fail = (code, message, status = 409) => { throw neoError(code, message, status); };
const paid = row => row.payment?.status === 'paid';
const requirePaid = row => { if (!paid(row)) fail('PAYMENT_REQUIRED', '결제 상태를 먼저 확인해 주세요.'); };
const requireAdmin = admin => { if (!admin?.id) fail('ADMIN_REQUIRED', '관리자 로그인이 필요합니다.', 403); };
const publicRow = row => {
  const result = copy(row);
  delete result.userId;
  delete result.mailJobs;
  result.deliveryStatus = Object.fromEntries(['receipt','answer'].map(kind => [kind, row.mailJobs.filter(job => job.kind === kind).at(-1)?.state || 'none']));
  result.questions = result.questions.map(q => ({ id: q.id, text: q.text, correction: q.correction || '', state: q.correction ? 'correction' : q.review ? 'reviewed' : 'received' }));
  result.deliveries = result.deliveries.map(delivery => ({
    key: delivery.key, sentAt: delivery.sentAt,
    questions: delivery.questions.map(q => ({ id: q.id, text: q.text, answer: q.answer, state: 'reviewed' })),
  }));
  return result;
};

/** 외부 효과는 어댑터로 주입. 런타임 라우트는 출시 전 이 서비스를 생성하지 않는다. */
export function createNeoService({ repository, payments, sendMail, operatorEmail, now = () => new Date().toISOString(), id = () => crypto.randomUUID(), sendTimeoutMs = 8000 }) {
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
    if (['cancelled','refunded'].includes(payment.status) && row.payment.status !== payment.status) {
      return save({ ...row, payment: { ...row.payment, status: payment.status }, state: payment.status }, row.version);
    }
    return row;
  }
  return {
    async create(userId, input) {
      if (!userId) fail('UNAUTHORIZED', '로그인이 필요합니다.', 401);
      const valid = validateNeoInput(input);
      const row = { id: id(), userId, ...valid, version: 1, state: 'draft', payment: null, quote: null, mailJobs: [], deliveries: [], createdAt: now(), updatedAt: now() };
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
      const quantity = row.questions.length;
      const quote = { id: id(), unitKRW: neoUnitPrice(), quantity, totalKRW: quantity * neoUnitPrice(), questions: copy(row.questions), createdAt: now() };
      return publicRow(await save({ ...row, quote }, row.version));
    },
    async prepare(userId, orderId, quoteId) {
      let row = await own(orderId, userId);
      if (!row.quote || row.quote.id !== quoteId) fail('QUOTE_CHANGED', '질문과 가격을 다시 확인해 주세요.');
      if (row.payment) return publicRow(row);
      if (!['draft','preparing'].includes(row.state)) fail('ORDER_LOCKED', '결제 준비할 수 없는 상태입니다.');
      if (row.state === 'draft') row = await save({ ...row, state: 'preparing' }, row.version);
      const payment = await payments.prepare({ userId, featureKey: NEO_EMAIL_FEATURE, requestId: row.id, idempotencyKey: row.quote.id, amountKRW: row.quote.totalKRW, consultation: copy(row.quote) });
      return publicRow(await save({ ...row, payment: { id: payment.id, status: 'pending' }, state: 'pending' }, row.version));
    },
    async acceptPayment(orderId) {
      let row = await read(orderId);
      if (!row.payment) fail('PAYMENT_REQUIRED', '결제 준비가 필요합니다.');
      const payment = await payments.read(row.payment.id);
      if (payment.status !== 'paid') fail('PAYMENT_NOT_PAID', '결제 확인이 완료되지 않았어요.');
      if (payment.userId !== row.userId || payment.featureKey !== NEO_EMAIL_FEATURE || payment.amountKRW !== row.quote.totalKRW
        || payment.requestId !== row.id || payment.quoteId !== row.quote.id) fail('PAYMENT_MISMATCH', '주문과 결제 정보가 일치하지 않습니다.');
      if (paid(row)) return publicRow(row);
      if (row.state !== 'pending') fail('ORDER_LOCKED', '접수 가능한 주문 상태가 아닙니다.');
      row = await save({ ...row, payment: { ...row.payment, status: 'paid' }, state: 'received',
        mailJobs: [{ key: row.id + ':receipt', kind: 'receipt', state: 'pending', attempt: 0 }] }, row.version);
      return publicRow(row);
    },
    async get(userId, orderId) { return publicRow(await syncPayment(await own(orderId, userId))); },
    async list(userId) {
      if (!userId) fail('UNAUTHORIZED', '로그인이 필요합니다.', 401);
      return (await repository.list(userId)).map(publicRow);
    },
    async adminList(admin) { requireAdmin(admin); return repository.list(); },
    async adminGet(admin, orderId) { requireAdmin(admin); return syncPayment(await read(orderId)); },
    async editAnswer(admin, orderId, questionId, answer, version) {
      requireAdmin(admin);
      const row = await syncPayment(await read(orderId));
      requirePaid(row); assertVersion(row, version);
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
      if (row.mailJobs.some(j => j.kind === 'answer' && ['pending','retry','sending','unknown'].includes(j.state))) fail('DELIVERY_PENDING', '발송 결과를 먼저 확인해 주세요.');
      if (!String(message || '').trim() || message.length > 1000) fail('CORRECTION_REQUIRED', '정정할 내용을 1,000자 이내로 알려 주세요.');
      const q = question(row, questionId);
      q.correction = message.trim(); q.review = null; row.state = 'correction';
      return save(row, row.version);
    },
    async correct(userId, orderId, questionId, text, version) {
      const row = await syncPayment(await own(orderId, userId));
      requirePaid(row); assertVersion(row, version);
      const q = question(row, questionId);
      if (!q.correction) fail('CORRECTION_NOT_REQUESTED', '정정 요청된 질문만 수정할 수 있어요.');
      const valid = validateNeoInput({ ...row, questions: [text] });
      q.text = valid.questions[0].text; q.correction = ''; q.answer = ''; q.review = null;
      q.answerVersion = (q.answerVersion || 0) + 1;
      row.state = row.questions.some(item => item.correction) ? 'correction' : 'received';
      return publicRow(await save(row, row.version));
    },
    async review(admin, orderId, questionId, version) {
      requireAdmin(admin);
      const row = await syncPayment(await read(orderId));
      requirePaid(row); assertVersion(row, version);
      const q = question(row, questionId);
      if (!q.answer || q.correction) fail('ANSWER_REQUIRED', '정정 요청을 해결하고 답변을 입력해 주세요.');
      q.review = { by: admin.id, at: now(), answerVersion: q.answerVersion };
      row.state = row.questions.every(item => item.review && !item.correction) ? 'reviewed' : 'editing';
      return save(row, row.version);
    },
    async enqueueAnswer(admin, orderId, version, resend = false) {
      requireAdmin(admin);
      const row = await syncPayment(await read(orderId));
      requirePaid(row); assertVersion(row, version);
      if (!row.questions.every(q => q.answer && q.review?.answerVersion === q.answerVersion && !q.correction)) fail('REVIEW_REQUIRED', '모든 질문의 답변을 네오가 검수한 뒤 보낼 수 있어요.');
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
      requirePaid(row);
      const job = row.mailJobs.find(j => j.key === jobKey);
      if (!job || !['pending','retry'].includes(job.state)) return row;
      job.state = 'sending'; job.attempt++; job.claimedAt = now();
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
      currentJob.state = outcome?.state === 'sent' ? 'sent' : outcome?.state === 'failed' ? 'retry' : 'unknown';
      currentJob.providerId = outcome?.providerId || null;
      if (currentJob.state === 'sent') {
        currentJob.sentAt = now();
        if (currentJob.kind === 'answer') {
          current.deliveries.push({ key: job.key, ...copy(currentJob.snapshot), sentAt: now() });
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
      if (resolution === 'sent' && job.kind === 'answer' && !row.deliveries.some(d => d.key === job.key)) {
        row.deliveries.push({ key: job.key, ...copy(job.snapshot), sentAt: now() }); row.state = 'sent';
      }
      return save(row, row.version);
    },
  };
}
