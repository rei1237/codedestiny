/** @jest-environment node */
let worker;
beforeAll(async () => { ({ default: worker } = await import('../../worker/index.js')); });
const env = { NODE_ENV: 'production' };
const preflight = origin => worker.fetch(new Request('https://api.code-destiny.com/api/health/route-metrics', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET' } }), env, { waitUntil() {} });
test.each(['https://code-destiny.com', 'https://www.code-destiny.com', 'https://code-destiny.pages.dev'])('소유 origin 유지: %s', async origin => {
  const response = await preflight(origin);
  expect(response.headers.get('access-control-allow-origin')).toBe(origin);
});
test('미소유 pages.dev를 허용 origin으로 반사하지 않는다', async () => {
  const origin = 'https://codedestiny.pages.dev';
  const response = await preflight(origin);
  expect(response.headers.get('access-control-allow-origin')).not.toBe(origin);
});
