import { jest } from '@jest/globals';
jest.unstable_mockModule('../../worker/lib/db.js', () => ({ connectDb: async () => {}, withMongoRetry: async (_env, run) => run() }));
jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ProfileCard: {} }));
jest.unstable_mockModule('../../worker/lib/content-unlocks.js', () => ({ findActivePaidContentUnlock: jest.fn(), grantPermanentUnlock: jest.fn(), invalidateAccessReadCaches: jest.fn() }));
jest.unstable_mockModule('../../worker/lib/honey-wallet.js', () => ({ HONEY_SCOPE: 'FORTUNE_TEA_HOUSE', honeyCollections: jest.fn(), honeyAttendanceStatus: jest.fn(), withHoneyTransaction: jest.fn() }));
let unlockHoneyContent, HONEY_UNLOCK_PRODUCTS, isBirthScopedUnlockFeatureKey;
beforeAll(async () => {
  ({ unlockHoneyContent } = await import('../../worker/lib/honey-unlocks.js'));
  ({ HONEY_UNLOCK_PRODUCTS } = await import('../../worker/lib/honey-unlock-catalog.js'));
  ({ isBirthScopedUnlockFeatureKey } = await import('../../worker/lib/paid-feature-registry.js'));
});
const base = { userId: 'owner', profileId: 'one', productId: 'ziwei_decade_luck', requestId: 'request-001' };
// 2026-11-04: 묶음 포함 키(rpt_specialCharmCard 등)는 꿀방울 신규 판매에서 빠졌다. 기본 상품은 판매 중인 출생 기반 키(30개)를 쓴다.
const SOLD_OUT_HONEY_KEYS = ['saju-career-style', 'section_summary', 'section_daewun', 'rpt_specialCharmCard', 'rpt_skillTreeCard', 'rpt_villainCard'];

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
      findOne: async query => state.ledgers.find(row => Object.entries(query).every(([key,value]) => row[key] === value)),
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

test('꿀방울 개별 상품은 모두 출생 기반이며 유료 상품은 전환에서 제외하고, 묶음 포함 6종은 판매 목록에 없다', () => {
  expect(HONEY_UNLOCK_PRODUCTS).toHaveLength(19);
  expect(HONEY_UNLOCK_PRODUCTS.filter(p => p.honeyCost === 6)).toHaveLength(0);
  for (const key of SOLD_OUT_HONEY_KEYS) expect(HONEY_UNLOCK_PRODUCTS.some(p => p.featureKey === key || p.productId === key)).toBe(false);
  for (const p of HONEY_UNLOCK_PRODUCTS) {
    expect(p.serviceScope).toBe('GGULGGUL');
    expect(isBirthScopedUnlockFeatureKey(p.featureKey)).toBe(p.billingType === 'birth_unlock');
    expect(p.cashPriceKRW / 1000 * 6).toBe(p.honeyCost);
    expect(p.cashCost * 100).toBe(p.cashPriceKRW);
  }
  for (const key of ['saju_ai_question_prompt', 'fortune-prompt-hub-generate']) expect(HONEY_UNLOCK_PRODUCTS.some(p => p.featureKey === key)).toBe(false);
});
test.each([['ziwei_decade_luck', 30], ['vedic_basic_reading', 30], ['astro_basic_deep_pack', 30]])('서버 가격 %s, 요청의 가격 조작 무시', async (productId, price) => {
  const f = fixture(150);
  expect((await f.run({ productId, honeyCost: 0 })).spent).toBe(price);
  expect(f.read().balance).toBe(150 - price);
});
test('동시 요청·응답 유실·같은 출생의 다른 프로필은 한 번만 차감한다', async () => {
  const f = fixture();
  const replies = await Promise.all([f.run(), f.run({ requestId: 'request-002' }), f.run({ profileId: 'same-birth' })]);
  expect(replies.reduce((sum, r) => sum + r.spent, 0)).toBe(30);
  expect(f.read().balance).toBe(30);
  expect((await f.run()).spent).toBe(0);
  expect((await f.run({ profileId: 'different', requestId: 'request-003' })).spent).toBe(30);
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
  await expect(f.run({ productId: 'vedic_basic_reading' })).rejects.toMatchObject({ status: 409 });
  expect(f.read().balance).toBe(30);
});
test.each(SOLD_OUT_HONEY_KEYS)('판매가 끝난 %s 는 꿀방울로 새로 사지 못하고 차감·원장·권리가 없다(409 PRODUCT_SALE_ENDED)', async productId => {
  const f = fixture(999);
  await expect(f.run({ productId })).rejects.toMatchObject({ status: 409, payload: { code: 'PRODUCT_SALE_ENDED', bundleFeatureKey: 'saju_lifetime_bundle' } });
  expect(f.read()).toEqual({ balance: 999, grants: [], ledgers: [] });
});
test.each(SOLD_OUT_HONEY_KEYS)('이미 산 %s 는 꿀방울 재요청에서 무차감으로 열린다', async productId => {
  const f = fixture(0); f.store.findUnlock = async () => ({ source: 'HONEY', active: true });
  expect(await f.run({ productId })).toMatchObject({ unlocked: true, spent: 0 });
  expect(f.read().ledgers).toHaveLength(0);
});
test('기존 구매 권리가 있으면 잔액이 없어도 추가 차감하지 않는다', async () => {
  const f = fixture(0); f.store.findUnlock = async () => ({ source: 'PAID', active: true });
  expect((await f.run()).spent).toBe(0);
  expect(f.read().ledgers).toHaveLength(0);
});


test('꿀꿀 기본 상품만 허용하며 영냥이와 별도 상담은 제외한다', async () => {
  const f = fixture(999);
  for (const productId of ['yeongnyangi-mackerel', 'fortune-tea-house-tarot-consultation', 'neo-operation-room', 'tarot-reunion-reading']) {
    await expect(f.run({ productId })).rejects.toMatchObject({ status: 400 });
  }
  expect(HONEY_UNLOCK_PRODUCTS.filter(p=>p.billingType==='per_use').map(p=>p.productId)).toEqual(['compat-sukuyo-compatibility','tarot-myeongri-three-card']);
});
const pairInput = { date:'1990-05-01',calType:'solar',hour:12,minute:0,gender:'F' };
test('궁합 꿀방울은 같은 요청에 한 번만 차감하고 상대 변경·타계정 재사용을 거부한다', async () => {
  const f = fixture(90);
  const args = {productId:'compat-sukuyo-compatibility',requestId:'sukuyo-paid:compat-sukuyo-compatibility|one|hnyabcdef',input:pairInput};
  const results = await Promise.all([f.run(args),f.run(args)]);
  expect(results.map(r=>r.spent)).toEqual([30,0]); expect(f.read().balance).toBe(60); expect(f.read().grants).toEqual([]);
  await expect(f.run({...args,input:{...pairInput,date:'1990-05-02'}})).rejects.toMatchObject({status:409});
  await expect(f.run({...args,profileId:'foreign',requestId:args.requestId.replace('|one|','|foreign|')})).rejects.toMatchObject({status:403});
  await expect(f.run({...args,userId:'other'})).rejects.toMatchObject({status:403});
});
test('회당 꿀방울 잔액 부족·원장 오류는 차감하지 않으며 타로도 영구 권리를 만들지 않는다', async () => {
  const short=fixture(29);
  await expect(short.run({productId:'compat-sukuyo-compatibility',requestId:'sukuyo-paid:compat-sukuyo-compatibility|one|hnyabcdef',input:pairInput})).rejects.toMatchObject({status:402});
  expect(short.read()).toEqual({balance:29,grants:[],ledgers:[]});
  const f=fixture(60);
  const input={cat:'love',cards:JSON.stringify([{id:'1',rev:false},{id:'2',rev:true},{id:'3',rev:false}])};
  expect((await f.run({productId:'tarot-myeongri-three-card',requestId:'tarot-myeongri-three-card:hnyabcdef',input})).spent).toBe(30);
  expect((await f.run({productId:'tarot-myeongri-three-card',requestId:'tarot-myeongri-three-card:hnyabcdef',input})).spent).toBe(0);
  expect(f.read().grants).toEqual([]);
});

test('실제 꿀방울 원장 writer와 reader가 동일 증빙을 읽고 다른 계정·프로필·상품은 거절한다', async () => {
  const f = fixture(60);
  const requestId = 'sukuyo-paid:compat-sukuyo-compatibility|one|hnyroundtrip1';
  const featureKey = 'compat-sukuyo-compatibility';
  await f.run({ productId: featureKey, requestId, input: pairInput });
  const { honeyCollections } = await import('../../worker/lib/honey-wallet.js');
  honeyCollections.mockReturnValue(f.store);
  const { readHoneyUseReceipt } = await import('../../worker/lib/honey-per-use.js');
  const query = { userId:'owner', featureKey, profileId:'one', requestId };
  expect(await readHoneyUseReceipt({}, query)).toMatchObject({ amount:30, inputHash:expect.any(String) });
  for (const change of [{userId:'other'}, {profileId:'different'}, {featureKey:'premium-sukuyo-compat-extra'}]) {
    expect(await readHoneyUseReceipt({}, {...query,...change})).toBeFalsy();
  }
});

test('판매 중인 30개 출생 상품은 잔액 부족·실패 재시도·동시 해금·다른 카드·재로그인에서 중복 차감하지 않는다', async () => {
 const productId='vedic_basic_reading';
 const short=fixture(29); await expect(short.run({productId})).rejects.toMatchObject({status:402}); expect(short.read().balance).toBe(29);
 const f=fixture(60), grant=f.store.grant;
 f.store.grant=async()=>{throw Error('grant failure');};
 await expect(f.run({productId})).rejects.toThrow('grant failure'); expect(f.read()).toEqual({balance:60,grants:[],ledgers:[]});
 f.store.grant=grant;
 const replies=await Promise.all([f.run({productId}),f.run({productId,requestId:'request-002'}),f.run({productId,profileId:'same-birth',requestId:'request-003'})]);
 expect(replies.reduce((sum,row)=>sum+row.spent,0)).toBe(30); expect(f.read().balance).toBe(30); expect(f.read().grants).toHaveLength(1);
 expect((await unlockHoneyContent({...base,productId,requestId:'relogin-001'},f.store)).spent).toBe(0);
 expect((await f.run({productId,profileId:'different',requestId:'different-001'})).spent).toBe(30);
});
