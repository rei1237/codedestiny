import { jest } from '@jest/globals';
import { notifyTickFailures } from '../../worker/lib/cron-tick-failure-alert.js';

// IdempotencyKey stand-in: the unique {userId,endpoint,keyHash} index is a Set of joined keys.
function fakeKeyModel() {
  const keys = new Set();
  const create = jest.fn(async (doc) => {
    const id = `${doc.userId}|${doc.endpoint}|${doc.keyHash}`;
    if (keys.has(id)) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    keys.add(id);
    return doc;
  });
  return { create, keys };
}
const delivered = () => jest.fn(async () => ({ results: [{ ok: true }] }));
const T0 = Date.UTC(2026, 9, 31, 3, 10); // 2026-10-31 12:10 KST
const HOUR = 3_600_000;
// settleWithin warns once per swallowed DB failure; the DB-outage cases expect that and assert it.
const quietWarn = () => jest.spyOn(console, 'warn').mockImplementation(() => {});
afterEach(() => jest.restoreAllMocks());
const opts = (model, send, now = T0, extra = {}) => ({
  model, send, now, connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn(), ...extra,
});

test('(a) a second call in the same KST hour is suppressed and sends nothing more', async () => {
  const model = fakeKeyModel(); const send = delivered();
  const first = await notifyTickFailures({}, [{ name: 'task-a1', message: 'boom' }], opts(model, send));
  const second = await notifyTickFailures({}, [{ name: 'task-a1', message: 'boom' }], opts(model, send, T0 + 20 * 60_000));
  expect(first).toEqual({ sent: ['task-a1'], suppressed: [] });
  expect(second).toEqual({ sent: [], suppressed: ['task-a1'] });
  expect(send).toHaveBeenCalledTimes(1);
});

test('(a2) one message per tick; only tasks that are not suppressed go into it', async () => {
  const model = fakeKeyModel(); const send = delivered();
  await notifyTickFailures({}, [{ name: 'task-a2x', message: 'x' }], opts(model, send));
  const result = await notifyTickFailures({}, [{ name: 'task-a2x', message: 'x' }, { name: 'task-a2y', message: 'y' }],
    opts(model, send, T0 + 10 * 60_000));
  expect(result).toEqual({ sent: ['task-a2y'], suppressed: ['task-a2x'] });
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[1][1].text).toContain('task-a2y');
  expect(send.mock.calls[1][1].text).not.toContain('task-a2x');
});

test('(b) the next KST hour alerts again, with the documented key and 3h expiry', async () => {
  const model = fakeKeyModel(); const send = delivered();
  await notifyTickFailures({}, [{ name: 'task-b', message: 'boom' }], opts(model, send));
  const next = await notifyTickFailures({}, [{ name: 'task-b', message: 'boom' }], opts(model, send, T0 + HOUR));
  expect(next.sent).toEqual(['task-b']);
  expect(send).toHaveBeenCalledTimes(2);
  expect(model.create.mock.calls[0][0]).toEqual({
    userId: null, endpoint: 'cron10-failure-alert', keyHash: 'task-b:2026-10-31T12', expiresAt: new Date(T0 + 3 * HOUR),
  });
  expect(model.create.mock.calls[1][0].keyHash).toBe('task-b:2026-10-31T13');
});

test('(c) a DB outage still sends once, and the isolate-local bucket suppresses the repeat', async () => {
  const warn = quietWarn(); const send = delivered();
  const model = { create: jest.fn(async () => { throw Object.assign(new Error('no primary'), { name: 'MongoServerSelectionError' }); }) };
  const first = await notifyTickFailures({}, [{ name: 'task-c', message: 'down' }], opts(model, send));
  const again = await notifyTickFailures({}, [{ name: 'task-c', message: 'down' }], opts(model, send, T0 + 10 * 60_000));
  const later = await notifyTickFailures({}, [{ name: 'task-c', message: 'down' }], opts(model, send, T0 + HOUR));
  expect(first.sent).toEqual(['task-c']);
  expect(again).toEqual({ sent: [], suppressed: ['task-c'] });
  expect(later.sent).toEqual(['task-c']);
  expect(send).toHaveBeenCalledTimes(2);
  expect(warn).toHaveBeenCalled();
});

test('(c2) connectDb throwing falls back to the local bucket and still sends once', async () => {
  const warn = quietWarn(); const send = delivered(); const model = fakeKeyModel();
  const result = await notifyTickFailures({}, [{ name: 'task-c2', message: 'x' }],
    opts(model, send, T0, { connectDb: async () => { throw new Error('connect failed'); } }));
  expect(result.sent).toEqual(['task-c2']);
  expect(model.create).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledTimes(1);
  expect(warn).toHaveBeenCalled();
});

test('(c3) a hanging DB step is bounded: the alert goes out within the wait, once per task per hour', async () => {
  const send = delivered(); const never = new Promise(() => {});
  const hang = { withMongoRetry: () => never, waitMs: 25 };
  const started = Date.now();
  const first = await notifyTickFailures({}, [{ name: 'task-c3a', message: 'x' }, { name: 'task-c3b', message: 'y' }],
    opts(fakeKeyModel(), send, T0, hang));
  expect(Date.now() - started).toBeLessThan(1_000);
  expect(first.sent).toEqual(['task-c3a', 'task-c3b']);
  expect(send).toHaveBeenCalledTimes(1);
  const again = await notifyTickFailures({}, [{ name: 'task-c3a', message: 'x' }], opts(fakeKeyModel(), send, T0 + 600_000, hang));
  expect(again.suppressed).toEqual(['task-c3a']);
});

test('(c4) the create runs inside withMongoRetry with retries: 0', async () => {
  const send = delivered(); const model = fakeKeyModel();
  const withMongoRetry = jest.fn(async (_env, fn) => fn());
  await notifyTickFailures({}, [{ name: 'task-c4', message: 'x' }], opts(model, send, T0, { withMongoRetry }));
  expect(withMongoRetry).toHaveBeenCalledTimes(1);
  expect(withMongoRetry.mock.calls[0][2]).toEqual({ retries: 0 });
});

test('(d) no failures means no DB call and no send', async () => {
  const model = fakeKeyModel(); const send = delivered(); const connectDb = jest.fn(async () => {});
  expect(await notifyTickFailures({}, [], opts(model, send, T0, { connectDb }))).toEqual({ sent: [], suppressed: [] });
  expect(await notifyTickFailures({}, undefined, opts(model, send, T0, { connectDb }))).toEqual({ sent: [], suppressed: [] });
  expect(connectDb).not.toHaveBeenCalled();
  expect(model.create).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

test('(e) the message names the task, caps the reason at 200 chars and points to Workers Logs', async () => {
  const model = fakeKeyModel(); const send = delivered();
  await notifyTickFailures({}, [{ name: 'task-e', message: 'z'.repeat(300) }], opts(model, send));
  const [, message] = send.mock.calls[0];
  expect(message.subject).toContain('10분 크론');
  expect(message.text).toContain('task-e');
  expect(message.text).toContain('z'.repeat(200));
  expect(message.text).not.toContain('z'.repeat(201));
  expect(message.text).toContain('Workers Logs에서 [task-e] 검색');
});

test('an undelivered alert keeps its claim: the next tick of the hour does not resend', async () => {
  const model = fakeKeyModel(); const send = jest.fn(async () => ({ results: [{ ok: false }] }));
  const first = await notifyTickFailures({}, [{ name: 'task-u', message: 'x' }], opts(model, send));
  const second = await notifyTickFailures({}, [{ name: 'task-u', message: 'x' }], opts(model, send, T0 + 600_000));
  expect(first).toEqual({ sent: [], suppressed: [] });
  expect(second).toEqual({ sent: [], suppressed: ['task-u'] });
  expect(send).toHaveBeenCalledTimes(1);
});
