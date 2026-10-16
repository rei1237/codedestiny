import { createNeoService } from '../../worker/neo-consultation/service.js';
import { createNeoMemoryRepository } from '../../worker/neo-consultation/memory.js';
import { priceNeoOrder } from '../../worker/neo-consultation/payment.js';
import { resolveProduct } from '../../worker/payments/catalog.js';
import { NEO_EMAIL_FEATURE } from '../../lib/neo-consultation/contract.js';

export function createNeoMock() {
  const repository = createNeoMemoryRepository(), paymentRows = new Map(), mails = [];
  let sequence = 0, mailOutcome = 'sent', currentTime = '2026-10-16T04:00:00.000Z';
  const payments = {
    async prepare(input) {
      const row = await repository.get(input.requestId);
      const product = priceNeoOrder(resolveProduct({ featureKey: NEO_EMAIL_FEATURE }), row, input.userId, input.idempotencyKey);
      const id = 'mock-payment-' + input.idempotencyKey;
      if (!paymentRows.has(id)) paymentRows.set(id, { id, userId: input.userId, featureKey: NEO_EMAIL_FEATURE,
        requestId: input.requestId, quoteId: input.idempotencyKey, amountKRW: product.priceKRW, status: 'pending' });
      return structuredClone(paymentRows.get(id));
    },
    async read(id) { if (!paymentRows.has(id)) throw new Error('PAYMENT_NOT_FOUND'); return structuredClone(paymentRows.get(id)); },
    async cancelPending(id) {
      if (paymentRows.get(id)?.status !== 'pending') throw Object.assign(new Error('결제 상태를 먼저 확인해 주세요.'), { code: 'PAYMENT_CHANGED', status: 409 });
      paymentRows.get(id).status = 'cancelled';
    },
  };
  const service = createNeoService({ repository, payments, operatorEmail: 'operator@example.invalid',
    id: () => 'mock-neo-' + (++sequence), now: () => currentTime,
    sendMail: async (message, meta) => {
      mails.push({ message, ...meta });
      return { state: mailOutcome, providerId: mailOutcome === 'sent' ? 'mock-mail-' + mails.length : undefined };
    },
  });
  return { service, repository, payments, paymentRows, mails,
    setMailOutcome(value) { mailOutcome = value; },
    setNow(value) { currentTime = value; },
    async pay(id) {
      const row = await repository.get(id);
      const payment = paymentRows.get(row.payment.id);
      if (payment.status !== 'pending' && payment.status !== 'paid') throw new Error('PAYMENT_CLOSED');
      payment.status = 'paid';
      return service.acceptPayment(id);
    },
  };
}
