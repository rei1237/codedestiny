import { createPaymentContext, withPaymentDb } from '../payments/db.js';
import { findOrder, toOrderStatus } from '../payments/orders.js';
import { handlePaymentsContext } from '../payments/index.js';
import { createNeoRepository } from './repository.js';
import { createNeoService } from './service.js';
import { neoMailAdapter } from './mail.js';
import { sendEmail } from '../lib/resend.js';
import { BUSINESS_IDENTITY } from '../../lib/site-policy-config.js';
import { NEO_EMAIL_FEATURE, neoError } from '../../lib/neo-consultation/contract.js';
import { reserveNeoCapacity } from './capacity.js';

// DB 작업만 재시도한다. PG·메일 I/O를 DB 재시도 콜백 안에서 실행하지 않는다.
export function createNeoRuntime(env, request) {
  const dbCall = fn => withPaymentDb(env, createPaymentContext({ route: 'neo-consultation' }), fn);
  const repository = Object.fromEntries(['get','list','insert','compareAndSwap'].map(method =>
    [method, (...args) => dbCall(db => createNeoRepository(db)[method](...args))]));
  async function paymentCall(path, body) {
    if (!request) throw neoError('REQUEST_REQUIRED', '고객 요청에서만 결제를 준비할 수 있습니다.');
    const headers = new Headers(request.headers);
    headers.set('Content-Type','application/json');
    headers.delete('content-length');
    const response = await handlePaymentsContext(new Request(new URL('/api/payments' + path, request.url), {
      method:'POST', headers, body:JSON.stringify(body),
    }), env, { neoPreparation:path === '/prepare' });
    const data = await response.json();
    if (!response.ok) throw neoError(data.code || 'PAYMENT_UNAVAILABLE', data.message || '결제 상태를 다시 확인해 주세요.', response.status);
    return data;
  }
  const payments = {
    async prepare(input) {
      const data = await paymentCall('/prepare', {
        featureKey:NEO_EMAIL_FEATURE, requestId:input.requestId, idempotencyKey:input.idempotencyKey,
        paymentMethod:'card_general', refundConsent:true,
        returnPath:'/neo-consultation/?order=' + encodeURIComponent(input.requestId),
      });
      if (!data.order?.merchantUid) throw neoError('PAYMENT_UNAVAILABLE','결제 준비를 다시 확인해 주세요.',503);
      return { id:data.order.merchantUid, checkout:data.order };
    },
    async read(id) {
      const row = await dbCall(db => findOrder(db,{orderId:id}));
      if (!row) throw neoError('PAYMENT_NOT_FOUND','결제 주문을 찾지 못했습니다.',404);
      return { id, userId:String(row.userId), status:toOrderStatus(row).toLowerCase(),
        featureKey:row.featureKey, amountKRW:row.paymentAmount, requestId:row.requestId,
        quoteId:row.pricingSnapshot?.consultation?.quoteId,
        blocked:Boolean(row.refundRequestedAt || row.refundLock || row.metadata?.cancellationReviewRequired
          || ['partial_cancel_admin_review','cancel_admin_review'].includes(row.failureCode)) };
    },
    async cancelPending() {
      // 이미 열린 PG 창의 승인 가능성이 남아 있으므로 로컬 상태만 취소하지 않는다.
      throw neoError('PAYMENT_CHANGED','결제 준비한 질문은 변경할 수 없습니다. 기존 주문의 결제 상태를 먼저 확인해 주세요.');
    },
  };
  const service = createNeoService({repository,payments,operatorEmail:BUSINESS_IDENTITY.email,sendMail:neoMailAdapter(sendEmail,env),
    reserveCapacity:row => dbCall(db => reserveNeoCapacity(db,row))});
  return { service, repository, payments, paymentCall };
}
