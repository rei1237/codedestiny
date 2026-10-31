/** @jest-environment node */
jest.unstable_mockModule('../../worker/lib/db.js', () => ({ connectDb: jest.fn(), withMongoRetry: jest.fn((_env, fn) => fn()) }));
jest.unstable_mockModule('../../worker/lib/models.js', () => ({ AbuseScore: {}, DailyFortuneSubscription: { updateOne: jest.fn(async () => ({ matchedCount: 1 })) } }));
let handleSubscriptionRoutes, DailyFortuneSubscription;
beforeAll(async () => {
  ({ handleSubscriptionRoutes } = await import('../../worker/routes/subscriptions.js'));
  ({ DailyFortuneSubscription } = await import('../../worker/lib/models.js'));
});
beforeEach(() => jest.clearAllMocks());
const unsub = (email, method = 'GET') => new Request(`https://code-destiny.com/api/subscriptions/daily-fortune/unsubscribe?email=${encodeURIComponent(email)}`, { method });

test('unsubscribe page escapes the email query and locks the response down', async () => {
  const payload = '<img src=x onerror=alert(1)>@a.co';
  const r = await handleSubscriptionRoutes(unsub(payload), {});
  const html = await r.text();
  expect(r.status).toBe(200);
  expect(html).not.toContain('<img');
  expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;@a.co');
  expect(r.headers.get('x-content-type-options')).toBe('nosniff');
  expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");
  expect(DailyFortuneSubscription.updateOne).toHaveBeenCalledWith({ email: payload }, expect.anything());
});

test('a normal address is shown as is and POST keeps its empty 200', async () => {
  const page = await handleSubscriptionRoutes(unsub('Reader@Example.com'), {});
  expect(await page.text()).toContain('reader@example.com 주소로');
  const post = await handleSubscriptionRoutes(unsub('reader@example.com', 'POST'), {});
  expect(post.status).toBe(200);
  expect(await post.text()).toBe('');
});
