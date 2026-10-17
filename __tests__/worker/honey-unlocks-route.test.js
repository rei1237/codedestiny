import { jest } from '@jest/globals';
const auth = jest.fn(), spend = jest.fn(), security = jest.fn(), purge = jest.fn();
jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ requireUserFromRequest: auth }));
jest.unstable_mockModule('../../worker/lib/db.js', () => ({ connectDb: async () => {} }));
jest.unstable_mockModule('../../worker/lib/security/index.js', () => ({ enforceSensitiveEndpointSecurity: security }));
jest.unstable_mockModule('../../worker/lib/honey-wallet.js', () => ({ PROMPT_HUB_HONEY_COST: 1 }));
jest.unstable_mockModule('../../worker/lib/honey-unlocks.js', () => ({ spendHoneyUnlock: spend }));
jest.unstable_mockModule('../../worker/lib/content-unlocks.js', () => ({ getUnlockedContentSnapshot: async () => ({ featureKeys: [] }) }));
jest.unstable_mockModule('../../worker/lib/credential-scoped-cache.js', () => ({ CREDENTIAL_CACHE_PREFIXES: ['access-state'], purgeCredentialCache: purge }));
let route;
beforeAll(async () => { ({ handleHoneyUnlockRoutes: route } = await import('../../worker/routes/honey-unlocks.js')); });
const request = body => new Request('https://example.test/api/honey/unlocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => { jest.clearAllMocks(); auth.mockResolvedValue({ userId: 'owner' }); security.mockResolvedValue({ ok: true }); spend.mockResolvedValue({ unlocked: true }); });
test('public catalog exposes eligible Ggulggul prices without unrelated spending options', async () => {
  const response = await route(new Request('https://example.test/api/honey/catalog'), {});
  const data = await response.json();
  expect(auth).not.toHaveBeenCalled();
  expect(data.products).toHaveLength(24);
  expect(data.products.find(row => row.productId === 'section_summary')).toMatchObject({ cashPriceKRW: 10000, honeyCost: 60 });
  expect(data.products.find(row => row.productId === 'section_daewun')).toMatchObject({ cashPriceKRW: 20000, honeyCost: 120 });
  expect(data.otherUses).toEqual([]);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
});
test('only authenticated owner and three allowed input fields reach the atomic service', async () => {
  const response = await route(request({ productId: 'section_summary', profileId: 'profile', requestId: 'request-1', userId: 'victim', honeyCost: 0, birthIdentity: { birthKey: 'forged' } }), {});
  expect(response.status).toBe(200);
  expect(spend).toHaveBeenCalledWith({}, 'owner', { productId: 'section_summary', profileId: 'profile', requestId: 'request-1' });
  expect(purge).toHaveBeenCalledTimes(1);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
});
test('security rejection cannot debit or grant', async () => {
  security.mockResolvedValueOnce({ ok: false, response: new Response('denied', { status: 403 }) });
  expect((await route(request({}), {})).status).toBe(403);
  expect(spend).not.toHaveBeenCalled();
  expect(purge).not.toHaveBeenCalled();
});
