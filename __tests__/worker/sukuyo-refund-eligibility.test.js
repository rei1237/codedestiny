/** @jest-environment node */
import { jest } from '@jest/globals';
import sift from 'sift';
import { canRestoreSukuyoDebit, findOtherSukuyoDelivery } from '../../worker/lib/sukuyo-refund-eligibility.js';

const args = { userId: '64b7f2a1c3d4e5f601234567', evidenceId: '64b7f2a1c3d4e5f600000008', requestId: 'request-one' };
const fixture = row => {
  const findLinked = jest.fn(async filter => row && sift(filter)(row) ? row : null);
  const verify = jest.fn(async () => ({ ok: true }));
  return { findLinked, verify };
};

test.each(['completed', 'delivery_pending', 'partial', 'generating', undefined])('같은 차감에 연결된 %s 결과는 복원을 차단한다', async status => {
  const linked = { userId: args.userId, paymentId: args.evidenceId, ...(status ? { status } : {}) };
  const deps = fixture(linked);
  expect(await canRestoreSukuyoDebit({}, args, deps)).toBe(false);
  expect(deps.verify).not.toHaveBeenCalled();
});

test('실패한 자기 기록은 일반 증빙 검사 후 복원을 허용한다', async () => {
  const deps = fixture({ userId: args.userId, paymentId: args.evidenceId, status: 'generation_failed' });
  expect(await canRestoreSukuyoDebit({}, args, deps)).toBe(true);
  expect(deps.verify).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ failedRequestId: args.requestId }));
});

test.each([
  { llmMeta: { sections: { opening: { body: 'saved' } } } },
  { messages: [{ role: 'assistant', content: 'saved' }] },
])('실패 표시된 오래된 문서라도 저장된 본문이 있으면 보존한다', async extra => {
  const deps = fixture({ userId: args.userId, paymentId: args.evidenceId, status: 'generation_failed', ...extra });
  expect(await canRestoreSukuyoDebit({}, args, deps)).toBe(false);
  expect(deps.verify).not.toHaveBeenCalled();
});

test.each([
  { userId: '64b7f2a1c3d4e5f601234568', paymentId: args.evidenceId, status: 'completed' },
  { userId: args.userId, paymentId: 'other-debit', status: 'completed' },
])('다른 계정 또는 차감의 기록은 현재 차감에 연결하지 않는다', async linked => {
  expect(await canRestoreSukuyoDebit({}, args, fixture(linked))).toBe(true);
});

test('증빙 검사 실패나 조회 장애는 복원을 허용하지 않는다', async () => {
  expect(await canRestoreSukuyoDebit({}, args, { findLinked: async () => null, verify: async () => ({ ok: false }) })).toBe(false);
  expect(await canRestoreSukuyoDebit({}, args, { findLinked: async () => { throw Error('unavailable'); } })).toBe(false);
  expect(await canRestoreSukuyoDebit({}, { ...args, requestId: '' }, fixture(null))).toBe(false);
});

test('다른 요청의 동일 구매 결과는 새 생성을 막고 원 요청의 재열람은 허용한다', async () => {
  const input = { userId: args.userId, evidenceIds: [args.evidenceId], requestId: args.requestId };
  const other = { userId: args.userId, paymentId: args.evidenceId, idempotencyKey: 'other', status: 'partial' };
  expect(await findOtherSukuyoDelivery(input, fixture(other))).toEqual(other);
  expect(await findOtherSukuyoDelivery(input, fixture({ ...other, idempotencyKey: args.requestId }))).toBeNull();
  expect(await findOtherSukuyoDelivery(input, fixture({ ...other, userId: '64b7f2a1c3d4e5f601234568' }))).toBeNull();
  expect(await findOtherSukuyoDelivery(input, fixture({ ...other, paymentId: 'other-debit' }))).toBeNull();
});
