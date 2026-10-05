/** @jest-environment node */
import { issueNeoStrategyBook, strategyBookChapter } from '../../worker/lib/neo-strategy-book.js';
import { readFileSync } from 'node:fs';

function fixture(balance = 5) {
  let state = { books: {}, ledgers: {}, wallet: { balance, totalSpent: 0 } }, queue = Promise.resolve();
  const docs = new Map(['a', 'b'].map((id, index) => [id, { id, userId: 'owner', status: 'completed', createdAt: new Date(2026, 0, index + 1), question: `Question ${id}`, selectedMethod: index ? 'vedic' : 'saju', initialBriefing: { frontlineSummary: `Verdict ${id}`, originalStrategy: { description: 'Original direction' }, actionOrders: ['Original step'] } }]));
  let fail = '', revoked = false;
  const mapCollection = name => ({
    async findOne(q) { const row = state[name][q._id]; return row && (!q.userId || row.userId === q.userId) ? structuredClone(row) : null; },
    async insertOne(doc) { if (fail === name) throw new Error('STORAGE_FAILURE'); if (state[name][doc._id]) throw Object.assign(new Error('duplicate'), { code: 11000 }); state[name][doc._id] = structuredClone(doc); },
  });
  const store = {
    books: mapCollection('books'), ledgers: mapCollection('ledgers'),
    wallets: {
      async findOne() { return structuredClone(state.wallet); },
      async updateOne(q, update) { if (state.wallet.balance < q.balance.$gte) return { modifiedCount: 0 }; for (const [k, v] of Object.entries(update.$inc)) state.wallet[k] += v; return { modifiedCount: 1 }; },
    },
    now: () => new Date('2026-10-05T00:00:00Z'),
    readConsultation: async (_, id) => docs.get(id), isRevoked: async () => revoked,
    transaction: callback => { const run = queue.then(async () => { const before = structuredClone(state); try { return await callback({}); } catch (e) { state = before; throw e; } }); queue = run.catch(() => {}); return run; },
  };
  return { store, docs, state: () => state, fail: name => { fail = name; }, revoke: () => { revoked = true; }, issue: (ids = ['a', 'b'], key = 'request-key-0001') => issueNeoStrategyBook({ userId: 'owner', sessionIds: ids, idempotencyKey: key }, store) };
}

test('legacy unlock requests preserve old access and never spend on a new exchange', async () => {
  const source = readFileSync(new URL('../../worker/routes/neo-operation-room.js', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('async function spendNeoBadges('), source.indexOf('async function handleEnsureAccess('));
  for (const unlocked of [false, true]) {
    const wallet = { balance: 5 };
    const spend = new Function('getOptionalUserFromRequest', 'clean', 'connectDb', 'ensureNeoBadgeBackfill', 'neoBadgeCollections', 'neoBadgePayload', 'NEO_BADGE_SCOPE', `${body}; return spendNeoBadges;`)(
      async () => ({ userId: 'owner' }), value => String(value || ''), async () => {}, async () => {},
      () => ({ wallets: { findOne: async () => wallet, updateOne: () => { throw new Error('UNEXPECTED_DEBIT'); } }, ledgers: { findOne: async () => unlocked ? { _id: 'old-spend' } : null, insertOne: () => { throw new Error('UNEXPECTED_LEDGER_WRITE'); } } }),
      (value, extra) => ({ ...value, ...extra }), 'NEO_OPERATION_ROOM');
    const result = await spend({}, {}, 'owned-session');
    expect(result.ok).toBe(unlocked); expect(wallet.balance).toBe(5);
    if (unlocked) expect(result.badge.benefitsUnlocked).toBe(true);
    else expect(result.reason).toBe('STRATEGY_BOOK_REQUIRED');
  }
});
test('four seals cannot issue; five seals atomically save one book and one spend', async () => {
  const poor = fixture(4); await expect(poor.issue()).rejects.toMatchObject({ reason: 'NOT_ENOUGH_BADGES' }); expect(poor.state().wallet.balance).toBe(4);
  const f = fixture(); const result = await f.issue(); expect(result.balance).toBe(0); expect(result.book.chapters.map(x => x.method)).toEqual(['saju', 'vedic']);
  expect(Object.values(f.state().ledgers).filter(x => x.type === 'spend')).toHaveLength(1);
});
test('concurrent requests and reordered selection return the same book and spend once', async () => {
  const f = fixture(10); const results = await Promise.all([f.issue(), f.issue(['b', 'a'], 'request-key-0002'), f.issue()]);
  expect(new Set(results.map(x => x.book.id)).size).toBe(1); expect(f.state().wallet).toEqual({ balance: 5, totalSpent: 5 });
});
test('book or ledger storage failure rolls back both the debit and book', async () => {
  for (const name of ['books', 'ledgers']) { const f = fixture(); f.fail(name); await expect(f.issue()).rejects.toThrow('STORAGE_FAILURE'); expect(f.state()).toEqual({ books: {}, ledgers: {}, wallet: { balance: 5, totalSpent: 0 } }); f.fail(''); expect((await f.issue()).balance).toBe(0); }
});
test('lost response replay and future consultation edits preserve the issued snapshot', async () => {
  const f = fixture(); const issued = await f.issue(); f.docs.get('a').initialBriefing.frontlineSummary = 'Edited later';
  const replay = await f.issue(); expect(replay.book).toEqual(issued.book); expect(replay.book.chapters[0].verdict).toBe('Verdict a'); expect(f.state().wallet.totalSpent).toBe(5);
});
test('ownership, completion, revocation and duplicate selection fail before debit', async () => {
  for (const mutate of [f => { f.docs.get('a').userId = 'other'; }, f => { f.docs.get('a').status = 'partial'; }, f => f.revoke()]) { const f = fixture(); mutate(f); await expect(f.issue()).rejects.toThrow(); expect(f.state().wallet.balance).toBe(5); }
  const f = fixture(); for (const ids of [[], ['a','a'], ['missing'], ['a','b','c','d','e','f']]) await expect(f.issue(ids)).rejects.toThrow();
});
test('one request ID cannot buy a different selection and revoked books cannot replay', async () => {
  const f = fixture(10); await f.issue(['a']); await expect(f.issue(['b'])).rejects.toMatchObject({ reason: 'REQUEST_CONFLICT' }); expect(f.state().wallet.balance).toBe(5);
  f.revoke(); await expect(f.issue(['a'])).rejects.toMatchObject({ reason: 'PAYMENT_REVOKED' });
});
test('latest refined actions take priority and absent fields stay absent', () => {
  const chapter = strategyBookChapter({ id: 'a', selectedMethod: 'saju', initialBriefing: { coreDiagnosis: 'Original verdict', actionOrders: ['Old'] }, refinedOrder: { verdict: { statement: 'Revised direction' }, thisWeekFirstStep: 'First', actionAlternatives: [{ timing: 'Now', action: 'New', rationale: 'Given reason' }] } });
  expect(chapter.verdict).toBe('Original verdict'); expect(chapter.strategy).toBe('Revised direction'); expect(chapter.firstAction).toBe('First'); expect(chapter.actions[0].action).toBe('New'); expect(chapter.strengths).toEqual([]);
});
