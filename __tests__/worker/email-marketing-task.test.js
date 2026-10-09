/**
 * @jest-environment node
 *
 * 주간 광고 메일 크론. 지키는 것: 창 밖·킬스위치 꺼짐이면 아무것도 하지 않는다, 동의·주소·나이 제외는 보내지 않는다,
 * CAS 선점에 진 수신자는 보내지 않는다, 설정 오류는 첫 실패에서 멈추고 알림을 1회만 보낸다, 시간 예산과 주간 상한.
 */
import { jest } from '@jest/globals';

const NOW = new Date('2026-10-13T01:30:00Z'); // 화 10:30 KST
const EPOCH = new Date(0);
const state = {};
const fakeQuery = rows => { const q = { sort: () => q, limit: jest.fn(() => q), select: () => q, lean: async () => rows }; return q; };
const connectDb = jest.fn();
const sendEmail = jest.fn();
const sendTelegramMessage = jest.fn(async () => ({ ok: true }));
const Pref = {
  find: jest.fn(filter => {
    if ('noticePendingAt' in filter) return fakeQuery(state.pending);
    if ('reconfirmDueAt' in filter) return fakeQuery(state.due);
    return (state.candidateQuery = fakeQuery(state.candidates));
  }),
  findById: jest.fn(() => fakeQuery({ consent: { granted: true } })),
  updateOne: jest.fn(async filter => ({ modifiedCount: state.cas(filter) ? 1 : 0 })),
};
const State = {
  findById: jest.fn(() => fakeQuery(state.control)),
  findOneAndUpdate: jest.fn(() => fakeQuery(state.run)),
  updateOne: jest.fn(async filter => ({ modifiedCount: 'alertedAt' in filter ? state.alertClaims-- > 0 ? 1 : 0 : 1 })),
};
const UserModel = { find: jest.fn(() => fakeQuery(state.users)) };

let runEmailMarketingTasks, MARKETING_FROM;
beforeAll(async () => {
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ connectDb, withMongoRetry: jest.fn((_env, op) => op()) }));
  jest.unstable_mockModule('../../worker/lib/models.js', () => ({ User: UserModel }));
  jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ getAccessTokenSecret: () => 'test-secret' }));
  jest.unstable_mockModule('../../worker/lib/email-marketing-models.js', () => ({ EmailMarketingPreference: Pref, EmailMarketingState: State }));
  jest.unstable_mockModule('../../worker/lib/resend.js', () => ({ sendEmail }));
  jest.unstable_mockModule('../../worker/lib/telegram.js', () => ({ sendTelegramMessage, escapeTelegramHtml: v => String(v ?? '') }));
  ({ runEmailMarketingTasks, MARKETING_FROM } = await import('../../worker/lib/email-marketing-task.js'));
});

const id = n => `64b7f0c2a1b2c3d4e5f6070${n}`;
const pref = n => ({ _id: id(n), consent: { granted: true, version: 'email-marketing-2026-10-v1' }, lastSentAt: EPOCH });
const user = (n, extra = {}) => ({ _id: id(n), email: `user${n}@gmail.com`, status: 'active', ...extra });
const run = (opts = {}) => runEmailMarketingTasks({}, { now: NOW, sleep: async () => {}, ...opts });
const sentTo = () => sendEmail.mock.calls.map(([, m]) => m.to);
const prefUpdates = () => Pref.updateOne.mock.calls.map(([filter, update]) => ({ filter, update }));

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(state, {
    pending: [], due: [], candidates: [pref(1), pref(2)], users: [user(1), user(2)],
    control: { enabled: true, weeklyCap: 300 }, run: { _id: 'run:2026-10-13', sent: 0 }, alertClaims: 1, cas: () => true,
  });
  sendEmail.mockResolvedValue({ ok: true, status: 200 });
});

test('outside both windows nothing touches the database', async () => {
  const result = await run({ now: new Date('2026-10-13T12:00:00Z') });
  expect(result.weekly.skipped).toBe('outside_window');
  expect(connectDb).not.toHaveBeenCalled();
  expect(Pref.find).not.toHaveBeenCalled();
});

test('a missing control document means no weekly query and no mail', async () => {
  state.control = null;
  const result = await run();
  expect(result.weekly).toEqual({ skipped: 'disabled' });
  expect(Pref.find.mock.calls.every(([f]) => 'noticePendingAt' in f || 'reconfirmDueAt' in f)).toBe(true);
  expect(sendEmail).not.toHaveBeenCalled();
});

test('sends an (광고) mail with one-click unsubscribe headers after claiming the recipient', async () => {
  const result = await run();
  expect(result.weekly).toEqual(expect.objectContaining({ sent: 2, failed: 0 }));
  const [, mail] = sendEmail.mock.calls[0];
  expect(mail.from).toBe(MARKETING_FROM);
  expect(mail.subject.startsWith('(광고) ')).toBe(true);
  expect(mail.html).toContain('수신거부');
  expect(mail.headers['List-Unsubscribe']).toMatch(/^<https:\/\/code-destiny\.com\/api\/email-marketing\/unsubscribe\?t=v1\./);
  expect(mail.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  const claim = prefUpdates()[0];
  expect(claim.filter).toEqual({ _id: id(1), 'consent.granted': true, lastSentAt: EPOCH });
  expect(claim.update.$set.lastSentAt).toEqual(NOW);
});

test('withdrawn, placeholder-address and minor accounts are never mailed', async () => {
  state.candidates = [pref(1), pref(2), pref(3), pref(4)];
  state.users = [user(1, { status: 'withdrawn' }), user(2, { email: 'kakao_9@social.code-destiny.local' }), user(3, { guardianConsent: { required: true } }), user(4)];
  const result = await run();
  expect(sentTo()).toEqual(['user4@gmail.com']);
  expect(result.weekly.excluded).toEqual({ withdrawn: 1, email_unusable: 1, minor: 1 });
  const withdrawal = prefUpdates().find(u => u.filter._id === id(1));
  expect(withdrawal.update.$set.consent).toEqual(expect.objectContaining({ granted: false, source: 'account_withdrawn' }));
  expect(withdrawal.update.$set.noticePendingAt).toBeUndefined();
});

test('losing the claim (concurrent tick or withdrawal) means no send', async () => {
  state.cas = filter => filter._id !== id(1);
  await run();
  expect(sentTo()).toEqual(['user2@gmail.com']);
});

test('config errors stop the batch, mark the week and alert exactly once', async () => {
  sendEmail.mockResolvedValue({ ok: false, status: 403, error: 'domain is not verified', configError: true, from: MARKETING_FROM });
  const result = await run();
  expect(result.weekly.stopped).toBe('config_error');
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(State.updateOne).toHaveBeenCalledWith({ _id: 'run:2026-10-13' }, { $set: { configAbortedAt: NOW } });
  expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  const rollback = prefUpdates().find(u => u.filter.lastSentAt?.getTime?.() === NOW.getTime());
  expect(rollback.update.$set.lastSentAt).toEqual(EPOCH);
  await run();
  expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  state.run = { ...state.run, configAbortedAt: NOW };
  sendEmail.mockClear();
  expect((await run()).weekly.skipped).toBe('config_aborted');
  expect(sendEmail).not.toHaveBeenCalled();
});

test('transient failures roll the claim back, address rejections do not', async () => {
  sendEmail.mockResolvedValueOnce({ ok: false, status: 500, error: 'boom' }).mockResolvedValueOnce({ ok: false, status: 422, error: 'invalid to' });
  const result = await run();
  expect(result.weekly).toEqual(expect.objectContaining({ sent: 0, failed: 2 }));
  const [first, second] = prefUpdates().filter(u => u.filter.lastSentAt?.getTime?.() === NOW.getTime());
  expect(first.update.$set.lastSentAt).toEqual(EPOCH);
  expect(second.update.$set.lastSentAt).toBeUndefined();
  expect(second.update.$set.lastError).toBe('invalid to');
});

test('a 429 ends the tick', async () => {
  sendEmail.mockResolvedValue({ ok: false, status: 429, error: 'rate limited' });
  expect((await run()).weekly.stopped).toBe('rate_limited');
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

test('time budget stops the loop', async () => {
  let clock = Date.now();
  const spy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
  try {
    const result = await run({ sleep: async () => { clock += 5 * 60 * 1000; } });
    expect(result.weekly.stopped).toBe('time_budget');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  } finally { spy.mockRestore(); }
});

test('the weekly cap bounds the query and stops once reached', async () => {
  state.control = { enabled: true, weeklyCap: 5 };
  state.run = { _id: 'run:2026-10-13', sent: 4 };
  await run();
  expect(state.candidateQuery.limit).toHaveBeenCalledWith(1);
  state.run = { _id: 'run:2026-10-13', sent: 5 };
  Pref.find.mockClear();
  sendEmail.mockClear();
  expect((await run()).weekly.skipped).toBe('weekly_cap');
  expect(sendEmail).not.toHaveBeenCalled();
});

test('consent result notices are not ads and are claimed before sending', async () => {
  state.control = null;
  const at = new Date('2026-10-12T05:00:00Z');
  state.pending = [{ _id: id(1), consent: { granted: false, at }, noticePendingAt: at }];
  const result = await run();
  expect(result.notices.consentNotices).toBe(1);
  const [, mail] = sendEmail.mock.calls[0];
  expect(mail.subject).not.toMatch(/광고\)/);
  expect(mail.subject).toContain('거부');
  expect(prefUpdates()[0]).toEqual({ filter: { _id: id(1), noticePendingAt: at }, update: { $unset: { noticePendingAt: '' } } });
});
