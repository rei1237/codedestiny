/** @jest-environment node */
import { jest } from '@jest/globals';
import { readBoundedText } from '../../worker/lib/request-body.js';

const counter = jest.fn();
const securityEvents = [];
jest.unstable_mockModule('../../worker/lib/db.js', () => ({
  connectDb: async () => {},
  mongoose: { Types: { ObjectId: { isValid: () => false } } },
  withMongoRetry: (_env, operation) => operation(),
}));
jest.unstable_mockModule('../../worker/lib/auth.js', () => ({
  getOptionalUserFromRequest: async () => ({ userId: 'synthetic-owner' }),
}));
const emptyModel = { findOne: () => ({ lean: async () => null }) };
jest.unstable_mockModule('../../worker/lib/models.js', () => ({
  AbuseScore: {
    ...emptyModel,
    findOneAndUpdate: () => ({ lean: counter }),
  },
  ContentEntitlement: emptyModel, PaidExecutionRecord: emptyModel,
  Payment: emptyModel, ProfileCard: emptyModel,
  SecurityEvent: { create: async value => { securityEvents.push(value); return value; } },
}));
jest.unstable_mockModule('../../worker/lib/billing-feature-registry.js', () => ({ getBillingFeaturePricing: () => null }));
let enforceSensitiveEndpointSecurity, enforceAiRouteSecurity, writeSecurityLog, readJson;
beforeAll(async () => {
  ({ enforceSensitiveEndpointSecurity, enforceAiRouteSecurity, writeSecurityLog } = await import('../../worker/lib/security/index.js'));
  ({ readJson } = await import('../../worker/lib/http.js'));
});
const env = { SECURITY_GUARD_MODE: 'enforce', NODE_ENV: 'test' };
const request = (body = '{}', headers = {}) => new Request('https://local.invalid/api/example', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body,
});
const guard = (req, options = {}) => enforceSensitiveEndpointSecurity({
  request: req, env, userId: 'synthetic-owner', endpoint: 'synthetic-boundary',
  rateLimit: { limit: 5, windowSeconds: 60 }, maxPayloadBytes: 32, ...options,
});

beforeEach(() => { counter.mockReset().mockResolvedValue({ score: 1 }); securityEvents.length = 0; });

test.each([{}, { 'content-length': '1' }, { 'content-length': '1000' }])('oversized body is rejected before counters with headers %j', async headers => {
  const result = await guard(request(JSON.stringify({ text: 'x'.repeat(100) }), headers));
  expect(result.ok).toBe(false);
  expect(result.response.status).toBe(413);
  expect(counter).not.toHaveBeenCalled();
});
test('byte budget counts UTF-8, and valid original body remains readable', async () => {
  const body = JSON.stringify({ text: '한'.repeat(10) });
  expect(body.length).toBeLessThan(32);
  expect((await guard(request(body))).response.status).toBe(413);
  const normal = request('{"text":"한"}');
  expect((await guard(normal)).ok).toBe(true);
  expect(await normal.json()).toEqual({ text: '한' });
});
test('explicit upload budget and original multipart bytes are preserved', async () => {
  const req = request('x'.repeat(64), { 'content-type': 'multipart/form-data; boundary=synthetic' });
  expect((await guard(req, { requireJson: false, maxPayloadBytes: 64 })).ok).toBe(true);
  expect((await req.text()).length).toBe(64);
});
test('stream stops at the first overflowing chunk and cancels without draining', async () => {
  let pulls = 0, cancelled = false;
  const body = new ReadableStream({
    pull(controller) { pulls += 1; controller.enqueue(new Uint8Array(8)); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  await expect(readBoundedText({ body, headers: new Headers() }, 16)).rejects.toMatchObject({ code: 'REQUEST_BODY_TOO_LARGE' });
  expect(pulls).toBe(3);
  expect(cancelled).toBe(true);
});
test('split UTF-8 chunks retain the exact webhook-style text', async () => {
  const expected = '{ "text": "한글", "amount": 1 }\r\n';
  const bytes = new TextEncoder().encode(expected);
  const body = new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } });
  expect(await readBoundedText({ body, headers: new Headers() }, bytes.length)).toBe(expected);
});
test('monitor mode observes but does not introduce enforcement', async () => {
  expect((await guard(request('x'.repeat(64)), { env: { ...env, SECURITY_GUARD_MODE: 'monitor' } })).ok).toBe(true);
});
test('malformed JSON retains 400, empty JSON retains existing empty-object contract', async () => {
  await expect(readJson(request('{'))).rejects.toMatchObject({ status: 400 });
  expect(await readJson(request(''))).toEqual({});
});
test('common JSON reader has a finite 16 MiB ceiling without trusting length header', async () => {
  const status = await readJson(request(JSON.stringify({ text: 'x'.repeat(16 * 1024 * 1024) })))
    .then(() => 200, error => error.status);
  expect(status).toBe(413);
});
test.each([null, { score: NaN }, { score: -1 }, { score: Infinity }])('invalid counter cannot authorize work: %j', async doc => {
  counter.mockResolvedValue(doc);
  const result = await guard(request());
  expect(result.ok).toBe(false);
  expect(result.response.status).toBe(503);
});
test('counter failure blocks AI work without leaking DB errors', async () => {
  counter.mockRejectedValue(new Error('synthetic database failure'));
  const result = await enforceAiRouteSecurity({ request: request(), env, serviceKey: 'ziwei-ai', path: '/api/ziwei-ai/start' });
  expect(result.ok).toBe(false);
  expect(result.response.status).toBe(503);
  expect(await result.response.text()).not.toContain('synthetic database failure');
});
test('normal quota and exhausted quota keep existing behavior', async () => {
  expect((await guard(request())).ok).toBe(true);
  counter.mockResolvedValue({ score: 6 });
  const result = await guard(request());
  expect(result.response.status).toBe(429);
  expect(result.response.headers.get('retry-after')).toBeTruthy();
});
test('deep metadata is omitted rather than returning unsanitized input', async () => {
  const metadata = { event: 'synthetic', a: { b: { c: { token: 'synthetic-marker', text: 'x'.repeat(1000) } } } };
  await writeSecurityLog({ env, reason: 'TEST', metadata });
  expect(securityEvents[0].metadata.event).toBe('synthetic');
  expect(JSON.stringify(securityEvents[0].metadata)).not.toContain('synthetic-marker');
  expect(JSON.stringify(securityEvents[0].metadata).length).toBeLessThan(600);
});
