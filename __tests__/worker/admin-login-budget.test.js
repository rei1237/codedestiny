/** @jest-environment node */
import { jest } from '@jest/globals';

const counter = jest.fn();
const operations = [];
let connectionDelay = 0;
// Model the existing DB wrapper's connection-inclusive deadline. No real DB.
const withMongoRetry = jest.fn(async (_env, operation, options) => {
  operations.push(options);
  let deadline;
  try {
    return await Promise.race([
      (async () => {
        await new Promise(resolve => setTimeout(resolve, connectionDelay));
        return operation();
      })(),
      new Promise((_resolve, reject) => {
        deadline = setTimeout(() => reject(new Error('synthetic DB deadline')), options.attemptTimeoutMS);
      }),
    ]);
  } finally {
    clearTimeout(deadline);
  }
});
jest.unstable_mockModule('../../worker/lib/db.js', () => ({
  connectDb: async () => {},
  mongoose: { Types: { ObjectId: { isValid: () => false } } },
  withMongoRetry,
}));
jest.unstable_mockModule('../../worker/lib/auth.js', () => ({
  getOptionalUserFromRequest: async () => null,
}));
const emptyModel = { findOne: () => ({ lean: async () => null }) };
jest.unstable_mockModule('../../worker/lib/models.js', () => ({
  AbuseScore: {
    ...emptyModel,
    findOneAndUpdate: () => ({ lean: counter }),
    updateOne: async () => {},
  },
  ContentEntitlement: emptyModel, PaidExecutionRecord: emptyModel,
  Payment: emptyModel, ProfileCard: emptyModel,
  SecurityEvent: { create: async () => ({}) },
}));
jest.unstable_mockModule('../../worker/lib/billing-feature-registry.js', () => ({ getBillingFeaturePricing: () => null }));
let enforceRateLimit, checkSoftBlock;
beforeAll(async () => {
  ({ enforceRateLimit, checkSoftBlock } = await import('../../worker/lib/security/index.js'));
});
beforeEach(() => {
  jest.useFakeTimers();
  counter.mockReset().mockResolvedValue({ score: 1 });
  operations.length = 0;
  withMongoRetry.mockClear();
  connectionDelay = 0;
});
afterEach(async () => {
  await jest.runAllTimersAsync();
  jest.useRealTimers();
});
const env = { SECURITY_GUARD_MODE: 'enforce', NODE_ENV: 'test' };
const request = () => new Request('https://local.invalid/api/admin/entry/password', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
});
const run = (endpoint = 'admin:/entry/password') => enforceRateLimit({
  env, request: request(), endpoint, key: 'synthetic-admin', limit: 20, windowSeconds: 600,
});
async function finish(promise, ms = 0) {
  await jest.advanceTimersByTimeAsync(ms);
  return promise;
}

test.each([1281, 1733, 2999])('admin counter succeeds after a %ims connection without retry', async delay => {
  connectionDelay = delay;
  expect((await finish(run(), delay)).ok).toBe(true);
  expect(counter).toHaveBeenCalledTimes(1);
  expect(withMongoRetry).toHaveBeenCalledTimes(1);
  expect(operations[0]).toMatchObject({
    attemptTimeoutMS: 3000, retries: 0, maxConcurrent: 2,
    admissionTimeoutMS: 250, respectServerSelectionFloor: false,
    resetOnOperationTimeout: false,
  });
});
test('admin connection exceeding 3s stays blocked with 503 and no wrapper retry', async () => {
  connectionDelay = 3500;
  const result = await finish(run(), 3000);
  expect(result.ok).toBe(false);
  expect(result.response.status).toBe(503);
  expect((await result.response.json()).code).toBe('RATE_LIMIT_UNAVAILABLE');
  expect(counter).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(500);
  // Existing wrapper may finish late, but must not retry or authorize the failed request.
  expect(counter).toHaveBeenCalledTimes(1);
  expect(withMongoRetry).toHaveBeenCalledTimes(1);
  expect(result.ok).toBe(false);
});
test.each(['billing:/checkout', 'admin:/other', 'admin:/entry/password/'])('other endpoint %s keeps 1s even with an admin request URL', async endpoint => {
  connectionDelay = 1281;
  const result = await finish(run(endpoint), 1000);
  expect(result.response.status).toBe(503);
  expect(operations[0].attemptTimeoutMS).toBe(1000);
});
test.each([null, { score: 0 }, { score: NaN }, { score: -1 }, { score: Infinity }, { score: 1.5 }])('invalid admin counter remains blocked: %j', async doc => {
  counter.mockResolvedValue(doc);
  expect((await finish(run())).response.status).toBe(503);
});
test('DB failure stays blocked without exposing internal error details', async () => {
  counter.mockRejectedValue(new Error('private synthetic database error'));
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const result = await finish(run());
  expect(result.response.status).toBe(503);
  expect(await result.response.text()).not.toContain('private synthetic');
  expect(warning).toHaveBeenCalledWith('[admin-entry] rate limit unavailable', {
    endpoint: 'admin:/entry/password', reason: 'database',
  });
  expect(JSON.stringify(warning.mock.calls)).not.toContain('private synthetic');
  warning.mockRestore();
});
test('20th attempt is permitted; 21st is blocked with retry-after', async () => {
  counter.mockResolvedValue({ score: 20 });
  expect((await finish(run())).ok).toBe(true);
  counter.mockResolvedValue({ score: 21 });
  const pending = run();
  await jest.runAllTimersAsync();
  const result = await pending;
  expect(result.ok).toBe(false);
  expect(result.response.status).toBe(429);
  expect(Number(result.response.headers.get('retry-after'))).toBeGreaterThan(0);
});
test('admin soft-block lookup keeps its original 1s budget', async () => {
  await finish(checkSoftBlock({ env, request: request(), endpoint: 'admin:/entry/password' }));
  expect(operations[0].attemptTimeoutMS).toBe(1000);
});

test.each(['ensure', 'start', 'start:daily', 'batch', 'result', 'read'])('tea %s counter permits a normal cold connection', async action => {
  connectionDelay = 1733;
  expect((await finish(run('ai:fortune-tea-house:' + action), 1733)).ok).toBe(true);
  expect(operations[0]).toMatchObject({ attemptTimeoutMS: 3000, retries: 0, maxConcurrent: 2, admissionTimeoutMS: 250 });
});

test('tea counter still fails closed beyond its deadline', async () => {
  connectionDelay = 3500;
  const result = await finish(run('ai:fortune-tea-house:start'), 3000);
  expect(result.response.status).toBe(503);
  expect((await result.response.json()).code).toBe('RATE_LIMIT_UNAVAILABLE');
});

test('similarly named services do not inherit the tea deadline', async () => {
  connectionDelay = 1733;
  expect((await finish(run('ai:fortune-tea-house-other:start'), 1000)).response.status).toBe(503);
  expect(operations[0].attemptTimeoutMS).toBe(1000);
});
