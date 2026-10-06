/** @jest-environment node */
import { jest } from '@jest/globals';
let route, owner;
const database = jest.fn(() => { throw new Error('Free chart storage forbidden'); });
const calculationStore = jest.fn(() => { throw new Error('Free calculation must not be persisted'); });
const chart = { calculationVersion: 'fixture', type: 'Generator', activations: [] };
const calculate = jest.fn(async () => chart);
beforeAll(async () => {
  const db = await import('../../worker/lib/db.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: database }));
  jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ requireAuth: async () => ({ userId: owner }), isAuthDbInfraError: () => false }));
  jest.unstable_mockModule('../../worker/lib/models.js', () => ({ HumanDesignCalculation: { findOne: calculationStore, updateOne: calculationStore }, HumanDesignInterpretation: {} }));
  jest.unstable_mockModule('../../worker/lib/human-design-ephemeris.js', () => ({ calculateHumanDesignChart: calculate }));
  ({ handleHumanDesignRoutes: route } = await import('../../worker/routes/human-design.js'));
});
beforeEach(() => { database.mockClear(); calculationStore.mockClear(); calculate.mockClear(); owner = expect.getState().currentTestName; });
const request = () => new Request('https://fixture.invalid/api/human-design/chart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ birthDate: '1991-02-20', birthTime: '08:30', timezone: 'Asia/Seoul', calendar: 'solar', city: '전주', country: 'KR' }) });
test('repeated free charts return a fresh calculation without reading or writing result storage', async () => {
  for (let count = 0; count < 2; count++) {
    const response = await route(request(), {});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, free: true, reused: false, chart });
  }
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(database).not.toHaveBeenCalled();
  expect(calculationStore).not.toHaveBeenCalled();
});
test('free chart calculation keeps its rate limit without storing any results', async () => {
  for (let count = 0; count < 20; count++) expect((await route(request(), {})).status).toBe(200);
  expect((await route(request(), {})).status).toBe(429);
  expect(calculate).toHaveBeenCalledTimes(20);
  expect(database).not.toHaveBeenCalled();
  expect(calculationStore).not.toHaveBeenCalled();
});
