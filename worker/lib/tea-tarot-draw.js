import { createHash } from 'node:crypto';
import { commitDeck, selectDeckSlots } from '../../lib/tarot/committed-deck.mjs';
import { teaSpread, spreadSnapshot, teaDrawCards, TEA_TAROT_VERSION } from '../../lib/fortune-tea-house/tarot-contract.mjs';
const fail = (code, status = 409) => { const e = new Error(code); e.code = code; e.status = status; throw e; };
const idFor = (owner, attempt) => createHash('sha256').update(owner + ':' + attempt).digest('hex');
export function teaDrawFingerprint(input) {
  return createHash('sha256').update(JSON.stringify({
    question: String(input.question || '').trim().replace(/\r\n/g, '\n'), spreadId: input.tarotSpreadId,
    cupId: input.selectedTeaCupId, topic: input.concernTopic || '',
  })).digest('hex');
}
export async function prepareTeaDraw(collection, owner, input) {
  const spread = teaSpread(input.tarotSpreadId);
  if (!spread || !/^[a-zA-Z0-9_-]{8,180}$/.test(input.attemptId || '') || String(input.question || '').trim().replace(/\r\n/g, '\n').length < 4 || String(input.question || '').trim().length > 1200) fail('INVALID_TAROT_REQUEST', 400);
  const _id = idFor(owner, input.attemptId), fingerprint = teaDrawFingerprint(input);
  const value = { _id, owner, attemptId: input.attemptId, fingerprint, version: TEA_TAROT_VERSION,
    spread: spreadSnapshot(spread), deck: commitDeck(), createdAt: new Date(), status: 'awaiting_draw' };
  try { await collection.updateOne({ _id }, { $setOnInsert: value }, { upsert: true }); }
  catch (e) { if (e?.code !== 11000) throw e; }
  const doc = await collection.findOne({ _id, owner });
  if (!doc || doc.fingerprint !== fingerprint) fail('TAROT_DRAFT_CHANGED');
  return publicTeaDraw(doc);
}
export function publicTeaDraw(doc) {
  return { version: doc.version, attemptId: doc.attemptId, status: doc.status,
    spread: doc.spread, deckSize: doc.deck.order.length,
    ...(doc.draw ? { draw: doc.draw, cards: doc.cards } : {}) };
}
export async function confirmTeaDraw(collection, owner, input) {
  const query = { _id: idFor(owner, input.attemptId || ''), owner };
  const doc = await collection.findOne(query);
  if (!doc) fail('TAROT_DRAFT_NOT_FOUND', 404);
  // An already committed selection wins even when a double click sends different picks.
  if (doc.draw) return publicTeaDraw(doc);
  let draw;
  try { draw = selectDeckSlots(input, doc.spread.cardCount); } catch { fail('INVALID_TAROT_PICKS', 400); }
  const cards = teaDrawCards(doc.spread, doc.deck, draw.picks);
  await collection.updateOne({ ...query, status: 'awaiting_draw' },
    { $set: { status: 'drawn', cards, draw: { ...draw, drawnAt: new Date().toISOString() } } });
  const saved = await collection.findOne(query);
  if (!saved?.draw) fail('TAROT_DRAW_STORAGE_UNAVAILABLE', 503);
  return publicTeaDraw(saved);
}
export async function readTeaDraw(collection, owner, input) {
  const doc = await collection.findOne({ _id: idFor(owner, input.attemptId || ''), owner });
  if (!doc?.draw) fail('TAROT_DRAW_REQUIRED', 422);
  if (doc.fingerprint !== teaDrawFingerprint(input)) fail('TAROT_DRAFT_CHANGED');
  const size = doc.spread.cardCount === 5 ? 'five' : 'three';
  if (input.tarotSpread !== size) fail('TAROT_PRODUCT_MISMATCH', 422);
  return doc;
}
