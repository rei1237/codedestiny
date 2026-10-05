import { getOptionalUserFromRequest } from '../lib/auth.js';
import { connectDb, mongoose, mongoTransactionOptions } from '../lib/db.js';
import { scopeConnection } from '../lib/db-scope-connection.js';
import { NeoOperationRoomConsultation } from '../lib/models.js';
import { isStoredPaidResultRevoked } from '../lib/paid-result-revocation.js';
import { json, readJson } from '../lib/http.js';
import { issueNeoStrategyBook, bookError, normalizeBookSelection } from '../lib/neo-strategy-book.js';

const FEATURE_KEY = 'neo-operation-room-consultation';
function publicBook(book) {
  const { _id: _unusedId, userId: _unusedOwner, ...visible } = book;
  return visible;
}
async function assertBookAccess(book, userId) {
  for (const id of book.sessionIds) {
    const doc = await NeoOperationRoomConsultation.findOne({ id, userId, status: 'completed' }).lean();
    if (!doc || await isStoredPaidResultRevoked(userId, FEATURE_KEY, doc)) throw bookError('RESULT_NOT_AVAILABLE', 403);
  }
}
export async function handleNeoStrategyBooks(request, env, path, backfill) {
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth?.userId) return json({ ok: false, reason: 'LOGIN_REQUIRED' }, { status: 401 });
  await connectDb(env);
  const userId = String(auth.userId), connection = scopeConnection() || mongoose.connection;
  const books = connection.db.collection('neo_operation_room_strategy_books');
  try {
    if (request.method === 'GET' && path === '/strategy-books') {
      const before = new URL(request.url).searchParams.get('before');
      const [beforeDate, beforeId, extra] = (before || '').split('|');
      if (before && (!Number.isFinite(Date.parse(beforeDate)) || !/^nsb_[a-f0-9]{40}$/.test(beforeId) || extra)) throw bookError('INVALID_CURSOR');
      const rows = await books.find({ userId, ...(before ? { $or: [{ createdAt: { $lt: new Date(beforeDate) } }, { createdAt: new Date(beforeDate), _id: { $lt: beforeId } }] } : {}) }, { projection: { id: 1, createdAt: 1, sessionIds: 1 } }).sort({ createdAt: -1, _id: -1 }).limit(21).toArray();
      const items = rows.slice(0, 20).map(({ _id: _unused, ...row }) => row);
      const last = items[items.length - 1];
      return json({ ok: true, items, nextCursor: rows.length > 20 ? `${new Date(last.createdAt).toISOString()}|${last.id}` : null });
    }
    if (request.method === 'GET' && path.startsWith('/strategy-books/')) {
      const id = path.slice('/strategy-books/'.length);
      if (!/^nsb_[a-f0-9]{40}$/.test(id)) throw bookError('BOOK_NOT_FOUND', 404);
      const book = await books.findOne({ _id: id, userId });
      if (!book) throw bookError('BOOK_NOT_FOUND', 404);
      await assertBookAccess(book, userId);
      return json({ ok: true, book: publicBook(book) });
    }
    if (request.method !== 'POST' || path !== '/strategy-books') throw bookError('METHOD_NOT_ALLOWED', 405);
    const body = await readJson(request);
    normalizeBookSelection(body.sessionIds);
    await backfill(userId);
    const result = await issueNeoStrategyBook({ ...body, userId }, {
      books, wallets: connection.db.collection('neo_operation_room_badge_wallets'), ledgers: connection.db.collection('neo_operation_room_badge_ledgers'),
      now: () => new Date(),
      readConsultation: (owner, id) => NeoOperationRoomConsultation.findOne({ userId: owner, id }).lean(),
      isRevoked: (owner, doc) => isStoredPaidResultRevoked(owner, FEATURE_KEY, doc),
      transaction: async callback => {
        const session = await connection.startSession();
        try { return await session.withTransaction(() => callback(session), mongoTransactionOptions(env)); }
        finally { await session.endSession(); }
      },
    });
    return json({ ok: true, book: publicBook(result.book), badge: { authenticated: true, balance: result.balance } });
  } catch (error) {
    if (error.status) return json({ ok: false, reason: error.reason }, { status: error.status });
    throw error;
  }
}
