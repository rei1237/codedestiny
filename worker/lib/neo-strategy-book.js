import { createHash } from 'node:crypto';

export const NEO_STRATEGY_BOOK_COST = 5;
export const NEO_BADGE_SCOPE = 'NEO_OPERATION_ROOM';
export function bookError(reason, status = 400) { return Object.assign(new Error(reason), { reason, status }); }
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const text = value => typeof value === 'string' ? value.trim() : '';
const strings = value => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
export function normalizeBookSelection(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5 || value.some(id => typeof id !== 'string' || !id.trim() || id.length > 180)) throw bookError('INVALID_SELECTION');
  const ids = [...new Set(value.map(id => id.trim()))].sort();
  if (ids.length !== value.length) throw bookError('INVALID_SELECTION');
  return ids;
}

// Only existing report fields are selected. No new interpretation, score or prediction.
export function strategyBookChapter(doc) {
  const b = doc.initialBriefing || {}, r = doc.refinedOrder || {};
  const refinedActions = (Array.isArray(r.actionAlternatives) ? r.actionAlternatives : []).filter(a => text(a.action)).map(a => ({ timing: text(a.timing), action: text(a.action), reason: text(a.rationale) }));
  const relationshipActions = (Array.isArray(b.relationStrategy?.steps) ? b.relationStrategy.steps : []).filter(a => text(a.doThis)).map(a => ({ timing: text(a.stage), action: text(a.doThis), reason: text(a.avoidThis) }));
  const missions = (Array.isArray(b.sevenDayMission) ? b.sevenDayMission : []).filter(a => text(a.mission)).map(a => ({ timing: String(a.day || ''), action: text(a.mission), reason: '' }));
  const caution = r.forbiddenAction || b.forbiddenAction || {};
  return {
    sessionId: doc.id, createdAt: doc.createdAt, method: text(doc.selectedMethod), topic: text(doc.topic),
    question: text(doc.question), title: text(r.operationTitle) || text(b.operationTitle),
    verdict: text(b.frontlineSummary) || text(b.coreDiagnosis),
    pattern: text((b.repeatedChoice || b.repeatedPattern)?.description),
    strategy: text(r.verdict?.statement) || text(r.neoReview) || text(b.originalStrategy?.description),
    firstAction: text(r.thisWeekFirstStep) || text(refinedActions[0]?.action) || strings(b.actionOrders)[0] || '',
    strengths: strings(b.innateStrength?.strongPoints), cautions: strings(b.innateStrength?.weakPoints),
    actions: refinedActions.length ? refinedActions : strings(r.thirtyDayStrategy).length ? strings(r.thirtyDayStrategy).map(action => ({ timing: '', action, reason: '' })) : relationshipActions.length ? relationshipActions : missions.length ? missions : strings(b.actionOrders).map(action => ({ timing: '', action, reason: '' })),
    hasRefinedActions: Boolean(doc.refinedOrder),
    forbidden: [text(caution.title), text(caution.reason)].filter(Boolean).join('\n'),
    closing: text(r.tsundereClosing) || text(b.tsundereClosing),
    originalUrl: `/records/view/?source=neo&id=${encodeURIComponent(doc.id)}`,
  };
}

/** Store operations and transaction are injected so failure/concurrency tests never access a DB. */
export async function issueNeoStrategyBook(input, store) {
  const userId = text(input.userId), ids = normalizeBookSelection(input.sessionIds);
  if (!userId) throw bookError('LOGIN_REQUIRED', 401);
  const key = text(input.idempotencyKey);
  if (key.length < 12 || key.length > 180) throw bookError('INVALID_REQUEST_ID');
  const id = `nsb_${hash([userId, ids]).slice(0, 40)}`;
  const requestId = `book-request:${hash([userId, key])}`;
  // Access checks also run on a replay; a stored book never bypasses revocation.
  const docs = [];
  for (const sessionId of ids) {
    const doc = await store.readConsultation(userId, sessionId);
    if (!doc || String(doc.userId) !== userId || doc.status !== 'completed' || !doc.initialBriefing) throw bookError('RESULT_NOT_AVAILABLE', 404);
    if (await store.isRevoked(userId, doc)) throw bookError('PAYMENT_REVOKED', 403);
    docs.push(doc);
  }
  docs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id));
  const run = () => store.transaction(async session => {
    const options = { session };
    const request = await store.ledgers.findOne({ _id: requestId }, options);
    if (request && request.bookId !== id) throw bookError('REQUEST_CONFLICT', 409);
    let book = await store.books.findOne({ _id: id, userId }, options);
    if (!book) {
      const now = store.now();
      const deducted = await store.wallets.updateOne({ userId, serviceScope: NEO_BADGE_SCOPE, balance: { $gte: NEO_STRATEGY_BOOK_COST } },
        { $inc: { balance: -NEO_STRATEGY_BOOK_COST, totalSpent: NEO_STRATEGY_BOOK_COST }, $set: { updatedAt: now } }, options);
      if (!deducted.modifiedCount) throw bookError('NOT_ENOUGH_BADGES', 409);
      book = { _id: id, id, userId, version: 1, createdAt: now, sessionIds: ids, chapters: docs.map(strategyBookChapter) };
      await store.books.insertOne(book, options);
      await store.ledgers.insertOne({ _id: `book-spend:${id}`, userId, serviceScope: NEO_BADGE_SCOPE, type: 'spend', amount: NEO_STRATEGY_BOOK_COST, reason: 'NEO_STRATEGY_BOOK', bookId: id, createdAt: now }, options);
    }
    if (!request) await store.ledgers.insertOne({ _id: requestId, userId, serviceScope: NEO_BADGE_SCOPE, type: 'book_request', amount: 0, bookId: id, createdAt: store.now() }, options);
    const wallet = await store.wallets.findOne({ userId, serviceScope: NEO_BADGE_SCOPE }, options);
    return { book, balance: wallet?.balance || 0 };
  });
  // A concurrent insert can win the deterministic book/request ID. The aborted
  // transaction has not spent anything; one replay reads the committed winner.
  try { return await run(); } catch (error) { if (Number(error.code) !== 11000) throw error; return run(); }
}
