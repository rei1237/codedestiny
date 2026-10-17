import { jest } from '@jest/globals';
jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ProfileCard: {} }));
jest.unstable_mockModule('../../worker/lib/content-unlocks.js', () => ({ findActivePaidContentUnlock: jest.fn(), grantPermanentUnlock: jest.fn(), invalidateAccessReadCaches: jest.fn() }));
jest.unstable_mockModule('../../worker/lib/honey-wallet.js', () => ({ HONEY_SCOPE: 'FORTUNE_TEA_HOUSE', honeyCollections: jest.fn(), honeyAttendanceStatus: jest.fn(), withHoneyTransaction: jest.fn() }));
let unlockHoneyContent, HONEY_UNLOCK_PRODUCTS, isBirthScopedUnlockFeatureKey;
beforeAll(async () => {
  ({ unlockHoneyContent } = await import('../../worker/lib/honey-unlocks.js'));
  ({ HONEY_UNLOCK_PRODUCTS } = await import('../../worker/lib/honey-unlock-catalog.js'));
  ({ isBirthScopedUnlockFeatureKey } = await import('../../worker/lib/paid-feature-registry.js'));
});
const base = { userId: 'owner', profileId: 'one', productId: 'rpt_specialCharmCard', requestId: 'request-001' };

function fixture(balance = 60) {
  let state = { balance, grants: [], ledgers: [] }, queue = Promise.resolve();
  const key = input => `${input.userId}:${input.birthIdentity.birthKey}:${input.featureKey}`;
  const store = {
    transaction(run) {
      const operation = queue.then(async () => {
        const before = structuredClone(state);
        try { return await run({}); } catch (error) { state = before; throw error; }
      });
      queue = operation.catch(() => {});
      return operation;
    },
    findProfile: async ({ userId, profileId }) => userId === 'owner' && ['one', 'same-birth', 'different'].includes(profileId)
      ? { gender: 'FEMALE', birth: { year: 1990, month: 5, day: profileId === 'different' ? 2 : 1 } } : null,
    ledgers: {
      findOne: async ({ _id }) => state.ledgers.find(row => row._id === _id),
      insertOne: async row => { if (state.ledgers.some(item => item._id === row._id)) throw Object.assign(Error('duplicate'), { code: 11000 }); state.ledgers.push(row); },
    },
    wallets: { updateOne: async (query, update) => {
      if (state.balance < query.balance.$gte) return { modifiedCount: 0 };
      state.balance += update.$inc.balance; return { modifiedCount: 1 };
    } },
    findUnlock: async input => state.grants.includes(key(input)) ? { active: true } : null,
    grant: async input => { state.grants.push(key(input)); },
  };
  return { store, read: () => state, run: overrides => unlockHoneyContent({ ...base, ...overrides }, store) };
}

test('정본의 6개·30개 개별 상품은 모두 출생 기반이며 유료 상품은 전환에서 제외한다', () => {
  expect(HONEY_UNLOCK_PRODUCTS).toHaveLength(22);
  expect(HONEY_UNLOCK_PRODUCTS.filter(p => p.honeyCost === 6)).toHaveLength(2);
  for (const p of HONEY_UNLOCK_PRODUCTS) {
    expect(isBirthScopedUnlockFeatureKey(p.featureKey)).toBe(true);
    expect(p.cashPriceKRW / 1000 * 6).toBe(p.honeyCost);
    expect(p.cashCost * 100).toBe(p.cashPriceKRW);
  }
  for (const key of ['saju_ai_question_prompt', 'fortune-prompt-hub-generate']) expect(HONEY_UNLOCK_PRODUCTS.some(p => p.featureKey === key)).toBe(false);
});
test.each([['rpt_specialCharmCard', 6], ['vedic_basic_reading', 30], ['section_summary', 60], ['section_daewun', 120]])('서버 가격 %s, 요청의 가격 조작 무시', async (productId, price) => {
  const f = fixture(150);
  expect((await f.run({ productId, honeyCost: 0 })).spent).toBe(price);
  expect(f.read().balance).toBe(150 - price);
});
test('동시 요청·응답 유실·같은 출생의 다른 프로필은 한 번만 차감한다', async () => {
  const f = fixture();
  const replies = await Promise.all([f.run(), f.run({ requestId: 'request-002' }), f.run({ profileId: 'same-birth' })]);
  expect(replies.reduce((sum, r) => sum + r.spent, 0)).toBe(6);
  expect(f.read().balance).toBe(54);
  expect((await f.run()).spent).toBe(0);
  expect((await f.run({ profileId: 'different', requestId: 'request-003' })).spent).toBe(6);
});
test('잔액 부족과 권리 저장 실패는 원장·차감을 모두 롤백한다', async () => {
  const short = fixture(5);
  await expect(short.run()).rejects.toMatchObject({ status: 402 });
  expect(short.read()).toEqual({ balance: 5, grants: [], ledgers: [] });
  const f = fixture(); f.store.grant = async () => { throw Error('grant unavailable'); };
  await expect(f.run()).rejects.toThrow('grant unavailable');
  expect(f.read()).toEqual({ balance: 60, grants: [], ledgers: [] });
});
test('다른 계정·소유하지 않은 프로필·재사용 요청은 권리를 만들지 않는다', async () => {
  const f = fixture();
  await expect(f.run({ userId: 'other' })).rejects.toMatchObject({ status: 403 });
  await expect(f.run({ profileId: 'foreign' })).rejects.toMatchObject({ status: 403 });
  await f.run();
  await expect(f.run({ productId: 'rpt_skillTreeCard' })).rejects.toMatchObject({ status: 409 });
  expect(f.read().balance).toBe(54);
});
test('기존 구매 권리가 있으면 잔액이 없어도 추가 차감하지 않는다', async () => {
  const f = fixture(0); f.store.findUnlock = async () => ({ source: 'PAID', active: true });
  expect((await f.run()).spent).toBe(0);
  expect(f.read().ledgers).toHaveLength(0);
});
