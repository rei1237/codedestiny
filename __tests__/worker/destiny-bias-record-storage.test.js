/** @jest-environment node */
import { jest } from '@jest/globals';
let route;
const database = jest.fn(() => { throw new Error('Free results must not access storage'); });
const authenticate = jest.fn(() => { throw new Error('Retired storage needs no authentication'); });
beforeAll(async () => {
  const db = await import('../../worker/lib/db.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: database }));
  jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ requireAuth: authenticate }));
  ({ handleDestinyBiasRoutes: route } = await import('../../worker/routes/destiny-bias.js'));
});
beforeEach(() => { database.mockClear(); authenticate.mockClear(); });
test.each(['cards', 'share'])('%s creation is retired before auth, parsing or database writes', async path => {
  const response = await route(new Request('https://fixture.invalid/api/destiny-bias/' + path, { method: 'POST', body: 'invalid JSON' }), {});
  expect(response.status).toBe(410);
  expect(await response.json()).toMatchObject({ ok: false, error: 'FREE_RESULT_STORAGE_DISABLED' });
  expect(database).not.toHaveBeenCalled();
  expect(authenticate).not.toHaveBeenCalled();
});
test('legacy collection listing returns no free cards and no storage access', async () => {
  const response = await route(new Request('https://fixture.invalid/api/destiny-bias/cards'), {});
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ items: [], pagination: { total: 0 }, gates: { canSaveCollection: false } });
  expect(database).not.toHaveBeenCalled();
  expect(authenticate).not.toHaveBeenCalled();
});
