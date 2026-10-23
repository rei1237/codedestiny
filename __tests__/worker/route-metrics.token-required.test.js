/** @jest-environment node */
let worker;
beforeAll(async () => {
  ({ default: worker } = await import('../../worker/index.js'));
});

const metrics = (env, headers = {}) => worker.fetch(
  new Request('https://api.code-destiny.com/api/health/route-metrics', { headers }),
  env,
  { waitUntil() {} },
);

test('route metrics stay closed when no token is configured outside local dev', async () => {
  const r = await metrics({ NODE_ENV: 'production' });
  expect(r.status).toBe(401);
});

test('route metrics open without a token only in explicit local dev', async () => {
  const r = await metrics({ NODE_ENV: 'development' });
  expect(r.status).toBe(200);
});

test('route metrics require the exact configured token via header or bearer', async () => {
  const env = { NODE_ENV: 'production', WORKER_ROUTE_METRICS_TOKEN: 'synthetic-metrics-token' };
  expect((await metrics(env)).status).toBe(401);
  expect((await metrics(env, { 'x-cd-route-metrics-token': 'synthetic-metrics-tokeX' })).status).toBe(401);
  expect((await metrics(env, { authorization: 'Bearer short' })).status).toBe(401);
  expect((await metrics(env, { 'x-cd-route-metrics-token': 'synthetic-metrics-token' })).status).toBe(200);
  expect((await metrics(env, { authorization: 'Bearer synthetic-metrics-token' })).status).toBe(200);
});
