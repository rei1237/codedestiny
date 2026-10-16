import { NEO_EMAIL_FEATURE, neoError, neoUnitPrice } from '../../lib/neo-consultation/contract.js';
import { FEATURE_KEY_PRICE_TABLE } from '../lib/paid-feature-registry.js';

/** 저장된 서버 견적으로만 수량 가격을 계산한다. 프런트 body.quantity/amount는 받지 않는다. */
export function priceNeoOrder(product, row, userId, quoteId) {
  if (product.featureKey !== NEO_EMAIL_FEATURE) return product;
  const quote = row?.quote;
  if (!row || row.userId !== String(userId) || !quote || quote.id !== quoteId || row.cancellationRequestedAt || !['draft','preparing','pending'].includes(row.state)) throw neoError('NEO_QUOTE_INVALID', '상담 질문과 가격을 다시 확인해 주세요.', 409);
  if (quote.quantity !== row.questions.length || quote.quantity < 1 || quote.quantity > 10
    || quote.unitKRW !== neoUnitPrice() || quote.totalKRW !== quote.quantity * quote.unitKRW
    || JSON.stringify(quote.questions) !== JSON.stringify(row.questions)) throw neoError('NEO_QUOTE_INVALID', '상담 질문과 가격을 다시 확인해 주세요.', 409);
  return { ...product, priceKRW: quote.totalKRW, priceCoins: FEATURE_KEY_PRICE_TABLE[NEO_EMAIL_FEATURE].cost * quote.quantity,
    monthlyCost: 0, consultationSnapshot: { consultationId: row.id, quoteId: quote.id, quantity: quote.quantity, unitKRW: quote.unitKRW, totalKRW: quote.totalKRW } };
}

/** 운영 판매는 레지스트리에서 차단. 출시 시에도 결제 코어의 동일 준비 경로를 사용한다. */
export async function resolveNeoOrderProduct(db, product, userId, requestId, quoteId) {
  if (product.featureKey !== NEO_EMAIL_FEATURE) return product;
  const { createNeoRepository } = await import('./repository.js');
  const row = await createNeoRepository(db).get(requestId);
  const priced = priceNeoOrder(product,row,userId,quoteId);
  if (row.payment) throw neoError('ORDER_ALREADY_PREPARED','기존 상담 주문의 결제창을 다시 열어 주세요.',409);
  if (!row.capacityDay || !['preparing','pending'].includes(row.state)) throw neoError('NEO_QUOTE_INVALID','상담 화면에서 주문 준비를 먼저 완료해 주세요.',409);
  const { reserveNeoCapacity } = await import('./capacity.js');
  await reserveNeoCapacity(db,row);
  return priced;
}

/** PG 검증을 끝낸 기존 결제 지급 경로에서만 호출한다. 메일 I/O는 하지 않는다. */
export async function acceptNeoConfirmedPayment(db, payment) {
  if (payment.featureKey !== NEO_EMAIL_FEATURE) return;
  const [{ createNeoRepository }, { createNeoService }] = await Promise.all([import('./repository.js'), import('./service.js')]);
  const service = createNeoService({
    repository: createNeoRepository(db),
    payments: { read: async id => {
      if (id !== payment.merchantUid) throw neoError('PAYMENT_MISMATCH', '결제 주문이 일치하지 않습니다.',409);
      return { id, status: payment.status, userId: String(payment.userId), featureKey: payment.featureKey,
        amountKRW: payment.paymentAmount, requestId: payment.requestId, quoteId: payment.pricingSnapshot?.consultation?.quoteId };
    } },
    // 접수 확정은 outbox 저장만 한다. 이 경로에서 발송 시도 자체를 금지한다.
    sendMail: async () => { throw new Error('MAIL_NOT_ALLOWED_IN_PAYMENT'); },
  });
  await service.acceptPayment(payment.requestId);
}
