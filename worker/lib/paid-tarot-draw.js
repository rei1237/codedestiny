import { createHash } from 'node:crypto';
import { createHttpError } from './http.js';
import { withMongoRetry } from './db.js';
import { paidTarotDrawCollection } from './paid-tarot-draw-store.js';
import { commitDeck, selectDeckSlots } from '../../lib/tarot/committed-deck.mjs';
import { getSpreadDefinition } from '../../lib/tarot/spreads.mjs';
import { getMeaningByQuestion } from '../../lib/tarot/tarot-interpretation-engine.mjs';
import { buildImageCandidates, cardCodeToLegacyNumericId, getTarotCardByAnyId, legacyNumericIdToCardCode } from '../../lib/tarot/tarot-cards.mjs';

// Paid love and mindscan readings read only cards the server dealt. Before checkout the client
// sends picks (or auto) under its own drawId; the server shuffles a committed deck, stores the dealt
// cards, and the paid route later refuses a body whose cards differ from that draw. The first stored
// draw for a drawId wins, so a double click cannot re-deal. Anonymous draws are allowed (the card
// stage comes before login); the first paid request that binds a draw becomes its owner.
export const PAID_TAROT_DRAW_VERSION = 'paid-tarot-draw-v1';
const FAMILIES = Object.freeze({
  'tarot-love-relationship': { cardCount: 6, spreadId: 'relationship_six_card' },
  // Five main cards, then five sub cards, in position order.
  'tarot-mindscan': { cardCount: 10 },
});
const DRAW_ID = /^[a-zA-Z0-9:_-]{8,180}$/;
export const paidTarotDrawKey = (featureKey, drawId) => createHash('sha256').update(`${featureKey}:${drawId}`).digest('hex');
const required = () => createHttpError(409, '카드를 다시 뽑아 주세요.', { reason: 'TAROT_DRAW_REQUIRED', retryable: false });

function presentDraw(featureKey, doc) {
  const base = { ok: true, version: PAID_TAROT_DRAW_VERSION, featureKey, drawId: doc.drawId };
  if (featureKey === 'tarot-mindscan') {
    return { ...base, cards: doc.cards.map(card => ({ cardId: card.cardId, numericId: cardCodeToLegacyNumericId(card.cardId), orientation: card.orientation })) };
  }
  const spread = getSpreadDefinition(FAMILIES[featureKey].spreadId);
  return { ...base, spreadType: spread.id, cards: doc.cards.map((saved, index) => {
    const card = getTarotCardByAnyId(saved.cardId), position = spread.positions[index], images = buildImageCandidates(card.code);
    return { cardId: card.code, id: card.id, name: card.nameEn, nameEn: card.nameEn, nameKr: card.nameKo, nameKo: card.nameKo,
      position: position.key, positionKey: position.key, orientation: saved.orientation, imageKey: card.imageKey || card.code.toLowerCase(),
      imageUrl: images[0], imageCandidates: images, proxyImageUrl: '', localImageUrl: images[0], keywords: card.keywords.slice(0, 5),
      interpretation: getMeaningByQuestion(card, saved.orientation, spread.questionType || 'general').line };
  }) };
}

export async function createPaidTarotDraw(env, body) {
  const featureKey = String(body?.featureKey || ''), family = FAMILIES[featureKey], drawId = body?.drawId;
  if (!family || typeof drawId !== 'string' || !DRAW_ID.test(drawId)) throw createHttpError(400, '카드 뽑기 요청을 확인해 주세요.', { reason: 'INVALID_TAROT_DRAW' });
  let draw;
  try { draw = selectDeckSlots(body, family.cardCount); } catch { throw createHttpError(400, '카드 선택을 확인해 주세요.', { reason: 'INVALID_TAROT_PICKS' }); }
  const deck = commitDeck(), _id = paidTarotDrawKey(featureKey, drawId);
  const value = { _id, featureKey, drawId, owner: '', version: PAID_TAROT_DRAW_VERSION, deckVersion: deck.version, method: draw.method, picks: draw.picks,
    cards: draw.picks.map(slot => ({ cardId: deck.order[slot], orientation: deck.reversed[slot] ? 'reversed' : 'upright' })), createdAt: new Date() };
  const collection = await paidTarotDrawCollection(env);
  try { await withMongoRetry(env, () => collection.updateOne({ _id }, { $setOnInsert: value }, { upsert: true })); }
  catch (error) { if (error?.code !== 11000) throw error; }
  const saved = await withMongoRetry(env, () => collection.findOne({ _id }));
  if (!Array.isArray(saved?.cards) || saved.cards.length !== family.cardCount) throw createHttpError(503, '카드를 저장하지 못했습니다. 다시 시도해 주세요.', { reason: 'TAROT_DRAW_STORAGE_UNAVAILABLE', retryable: true });
  return presentDraw(featureKey, saved);
}

const code = value => (typeof value === 'number' ? legacyNumericIdToCardCode(value) : getTarotCardByAnyId(value)?.code) || '';
// The body's cards, index by index, in the stored draw's terms. Mindscan orientation is derived
// from the pair, so only its card identities are compared.
function bodyCards(featureKey, body) {
  if (featureKey === 'tarot-mindscan') {
    const pairs = Array.isArray(body?.pairs) ? body.pairs : [];
    const side = key => pairs.map(pair => ({ cardId: code(pair?.[`${key}CardId`] ?? pair?.[`${key}CardCode`] ?? pair?.[`${key}CardName`]) }));
    return [...side('main'), ...side('sub')];
  }
  return (Array.isArray(body?.cards) ? body.cards : []).map(card => ({ cardId: code(card?.cardId), orientation: String(card?.orientation || '') }));
}

/** Refuses a paid body whose cards are not the server draw it names; adopts an unowned draw. */
export async function bindPaidTarotDraw(env, { featureKey, owner, body }) {
  const family = FAMILIES[featureKey], drawId = body?.drawId;
  if (!family) throw createHttpError(400, '카드 뽑기 요청을 확인해 주세요.', { reason: 'INVALID_TAROT_DRAW' });
  if (typeof drawId !== 'string' || !DRAW_ID.test(drawId)) throw required();
  const _id = paidTarotDrawKey(featureKey, drawId), userId = String(owner || '');
  const collection = await paidTarotDrawCollection(env);
  let doc = await withMongoRetry(env, () => collection.findOne({ _id }));
  if (!Array.isArray(doc?.cards) || doc.cards.length !== family.cardCount) throw required();
  if (!doc.owner && userId) {
    await withMongoRetry(env, () => collection.updateOne({ _id, owner: '' }, { $set: { owner: userId, boundAt: new Date() } }));
    doc = await withMongoRetry(env, () => collection.findOne({ _id }));
  }
  if (!doc || doc.owner !== userId) throw createHttpError(403, '다른 계정에서 사용한 카드입니다. 카드를 다시 뽑아 주세요.', { reason: 'TAROT_DRAW_OWNER_MISMATCH', retryable: false });
  const sent = bodyCards(featureKey, body);
  if (sent.length !== doc.cards.length || sent.some((card, index) => card.cardId !== doc.cards[index].cardId
    || (card.orientation !== undefined && card.orientation !== doc.cards[index].orientation))) {
    throw createHttpError(400, '뽑은 카드와 요청 카드가 다릅니다. 카드를 다시 뽑아 주세요.', { reason: 'TAROT_CARDS_FORGED', retryable: false });
  }
  return doc;
}
