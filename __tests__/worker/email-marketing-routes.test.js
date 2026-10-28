/** @jest-environment node */
const USER_ID = '64b7f0c2a1b2c3d4e5f60718';
const OTHER_ID = '64b7f0c2a1b2c3d4e5f60719';
jest.unstable_mockModule('../../worker/lib/db.js', () => ({ connectDb: jest.fn(), withMongoRetry: jest.fn((_env, fn) => fn()) }));
jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ requireAuth: jest.fn(async () => ({ userId: USER_ID })), getAccessTokenSecret: () => 'test-secret' }));
jest.unstable_mockModule('../../worker/lib/models.js', () => ({ User: { findById: jest.fn(() => ({ select: () => ({ lean: async () => ({ email: 'someone@gmail.com' }) }) })) } }));
jest.unstable_mockModule('../../worker/lib/kakao-crm-models.js', () => ({ CrmPreference: {}, CrmRelationship: {} }));
jest.unstable_mockModule('../../worker/lib/email-marketing-models.js', () => ({
  EmailMarketingPreference: {
    updateOne: jest.fn(async () => ({ matchedCount: 1 })),
    findById: jest.fn(() => ({ select: () => ({ lean: async () => null }) })),
  },
  EmailMarketingState: { updateOne: jest.fn(async () => ({ matchedCount: 1 })) },
}));
jest.unstable_mockModule('../../worker/lib/email-marketing-task.js', () => ({ DEFAULT_WEEKLY_CAP: 300, MAX_WEEKLY_CAP: 5000 }));
let handleEmailMarketingRoutes, handleAdminEmailMarketingRoutes, EmailMarketingState, EmailMarketingPreference, createUnsubscribeToken, VERSION;
beforeAll(async () => {
  ({ handleEmailMarketingRoutes } = await import('../../worker/routes/email-marketing.js'));
  ({ handleAdminEmailMarketingRoutes } = await import('../../worker/routes/admin-email-marketing.js'));
  ({ EmailMarketingPreference, EmailMarketingState } = await import('../../worker/lib/email-marketing-models.js'));
  ({ createUnsubscribeToken } = await import('../../worker/lib/email-marketing-token.js'));
  ({ EMAIL_MARKETING_CONSENT_VERSION: VERSION } = await import('../../lib/marketing/email-marketing.mjs'));
});
beforeEach(() => jest.clearAllMocks());
const env = {};
const prefs = (body, headers = {}) => new Request('https://code-destiny.com/api/email-marketing/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://code-destiny.com', ...headers }, body: JSON.stringify(body) });
const unsub = (token, init = {}) => new Request(`https://code-destiny.com/api/email-marketing/unsubscribe?t=${encodeURIComponent(token)}`, init);
const oneClick = { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' };

test('consent saves server time, exact wording, history, notice and the two-year reconfirm date', async () => {
  const r = await handleEmailMarketingRoutes(prefs({ granted: true, version: VERSION, source: 'preferences' }), env);
  expect(r.status).toBe(200);
  const [filter, update, options] = EmailMarketingPreference.updateOne.mock.calls[0];
  expect(filter).toEqual({ _id: USER_ID });
  expect(options).toEqual({ upsert: true });
  expect(update.$set.consent).toEqual(expect.objectContaining({ granted: true, version: VERSION, source: 'preferences', at: expect.any(Date) }));
  expect(update.$push.history.$each).toEqual([update.$set.consent]);
  expect(update.$set.noticePendingAt).toBeInstanceOf(Date);
  expect(update.$set.reconfirmDueAt.getTime()).toBeGreaterThan(Date.now() + 690 * 86400000);
  expect(update.$setOnInsert).toEqual({ lastSentAt: new Date(0) });
  const body = await r.json();
  expect(body).toEqual(expect.objectContaining({ emailUsable: true, maskedEmail: 'so*****@gmail.com', consentVersion: VERSION }));
});

test('repeating the same decision does not queue another notice', async () => {
  EmailMarketingPreference.findById.mockReturnValueOnce({ select: () => ({ lean: async () => ({ consent: { granted: true } }) }) });
  await handleEmailMarketingRoutes(prefs({ granted: true, version: VERSION, source: 'preferences' }), env);
  expect(EmailMarketingPreference.updateOne.mock.calls[0][1].$set.noticePendingAt).toBeUndefined();
});

test('foreign origin, stale wording and server-only sources are rejected', async () => {
  expect((await handleEmailMarketingRoutes(prefs({ granted: true, version: VERSION, source: 'preferences' }, { Origin: 'https://evil.test' }), env)).status).toBe(403);
  expect((await handleEmailMarketingRoutes(prefs({ granted: true, version: 'old', source: 'preferences' }), env)).status).toBe(400);
  expect((await handleEmailMarketingRoutes(prefs({ granted: true, version: VERSION, source: 'email_one_click' }), env)).status).toBe(400);
  expect(EmailMarketingPreference.updateOne).not.toHaveBeenCalled();
});

test('unsubscribe GET only shows a confirmation page and never writes', async () => {
  const token = await createUnsubscribeToken(env, USER_ID);
  const r = await handleEmailMarketingRoutes(unsub(token), env);
  expect(r.status).toBe(200);
  expect(await r.text()).toContain('method="post"');
  expect(EmailMarketingPreference.updateOne).not.toHaveBeenCalled();
});

test('one-click POST withdraws consent for the signed user and returns an empty 200', async () => {
  const token = await createUnsubscribeToken(env, USER_ID);
  EmailMarketingPreference.findById.mockReturnValueOnce({ select: () => ({ lean: async () => ({ consent: { granted: true } }) }) });
  const r = await handleEmailMarketingRoutes(unsub(token, oneClick), env);
  expect(r.status).toBe(200);
  expect(await r.text()).toBe('');
  const [filter, update] = EmailMarketingPreference.updateOne.mock.calls[0];
  expect(filter).toEqual({ _id: USER_ID });
  expect(update.$set.consent).toEqual(expect.objectContaining({ granted: false, source: 'email_one_click' }));
  expect(update.$set.reconfirmDueAt).toBeNull();
  expect(update.$set.noticePendingAt).toBeInstanceOf(Date);
});

test('form POST from the confirmation page withdraws and shows completion', async () => {
  const token = await createUnsubscribeToken(env, USER_ID);
  const r = await handleEmailMarketingRoutes(unsub(token, { method: 'POST' }), env);
  expect(await r.text()).toContain('수신거부가 완료되었어요');
  expect(EmailMarketingPreference.updateOne.mock.calls[0][1].$set.consent.source).toBe('email_unsubscribe');
});

test('tampered, swapped or foreign-secret tokens are rejected without writing', async () => {
  const token = await createUnsubscribeToken(env, USER_ID);
  const other = await createUnsubscribeToken(env, OTHER_ID);
  const [, , sig] = token.split('.');
  const [, otherId] = other.split('.');
  const flipped = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
  for (const bad of [flipped, `v1.${otherId}.${sig}`, 'v1..', '', 'garbage']) {
    expect((await handleEmailMarketingRoutes(unsub(bad, oneClick), env)).status).toBe(400);
  }
  const { verifyUnsubscribeToken } = await import('../../worker/lib/email-marketing-token.js');
  expect(await verifyUnsubscribeToken(env, other)).toBe(OTHER_ID);
  expect(EmailMarketingPreference.updateOne).not.toHaveBeenCalled();
});

test('admin control validates the cap and re-enabling clears the current week config abort', async () => {
  const control = body => new Request('https://code-destiny.com/api/admin/email-marketing/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  for (const bad of [{ enabled: 'yes', weeklyCap: 10 }, { enabled: true, weeklyCap: 0 }, { enabled: true, weeklyCap: 5001 }, { enabled: true, weeklyCap: 1.5 }]) {
    expect((await handleAdminEmailMarketingRoutes('/control', control(bad), env, { userId: 'admin-1' })).status).toBe(400);
  }
  expect(EmailMarketingState.updateOne).not.toHaveBeenCalled();
  expect((await handleAdminEmailMarketingRoutes('/control', control({ enabled: true, weeklyCap: 5 }), env, { userId: 'admin-1' })).status).toBe(200);
  const [[controlFilter, controlUpdate, controlOptions], [runFilter, runUpdate]] = EmailMarketingState.updateOne.mock.calls;
  expect(controlFilter).toEqual({ _id: 'control' });
  expect(controlUpdate).toEqual({ $set: { enabled: true, weeklyCap: 5, updatedBy: 'admin-1' } });
  expect(controlOptions).toEqual({ upsert: true });
  expect(runFilter._id).toMatch(/^run:\d{4}-\d{2}-\d{2}$/);
  expect(runUpdate).toEqual({ $unset: { configAbortedAt: '', alertedAt: '' } });
  EmailMarketingState.updateOne.mockClear();
  await handleAdminEmailMarketingRoutes('/control', control({ enabled: false, weeklyCap: 5 }), env, { userId: 'admin-1' });
  expect(EmailMarketingState.updateOne).toHaveBeenCalledTimes(1);
});
