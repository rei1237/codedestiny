import { isHoneySpendProduct, HONEY_SCOPE_MESSAGE } from './honey-unlock-catalog.js';
import { mongoose, mongoTransactionOptions, withMongoRetry } from './db.js';
import { scopeConnection } from './db-scope-connection.js';
import { createHttpError } from './http.js';
import { HONEY_SCOPE } from './honey-wallet.js';
import { findSpirit, SPIRIT_HONEY_COST, spiritExp } from '../../js/core/profile-characters.mjs';

const unwrap = result => result && Object.hasOwn(result, 'value') ? result.value : result;
const fail = (status, code) => createHttpError(status, code, { code });
function collections() {
  const db = (scopeConnection() || mongoose.connection).db;
  return { states: db.collection('profile_spirits'), wallets: db.collection('fortune_tea_house_honey_wallets'), ledgers: db.collection('fortune_tea_house_honey_ledgers') };
}
function cleanState(state) {
  const ownedIds = (state?.ownedIds || []).filter(id => Boolean(findSpirit(id)));
  return { ownedIds, equippedId: ownedIds.includes(state?.equippedId) ? state.equippedId : null };
}
export async function getProfileSpirits(env, userId) {
  return withMongoRetry(env, async () => {
    const { states, wallets } = collections();
    const [state, wallet] = await Promise.all([states.findOne({ _id: String(userId) }), wallets.findOne({ userId: String(userId), serviceScope: HONEY_SCOPE })]);
    return { ...cleanState(state), balance: Math.max(0, Number(wallet?.balance) || 0), cost: SPIRIT_HONEY_COST };
  });
}
export async function profileSpiritExp(env, userId, kind, baseExp) {
  if (kind !== 'checkin' && kind !== 'quest') return baseExp;
  return withMongoRetry(env, async () => {
    const state = cleanState(await collections().states.findOne({ _id: String(userId) }));
    return spiritExp(kind, baseExp, state.ownedIds, state.equippedId);
  });
}
export async function unlockProfileSpirit(env, userId, { characterId, requestId }) {
  if (!findSpirit(characterId)) throw fail(400, 'INVALID_SPIRIT');
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(String(requestId || ''))) throw fail(400, 'INVALID_REQUEST_ID');
  const uid = String(userId), now = new Date();
  await withMongoRetry(env, async () => {
    const session = await (scopeConnection() || mongoose).startSession();
    try {
      await session.withTransaction(async () => {
        const { states, wallets, ledgers } = collections();
        const receiptId = `profile-spirit:${uid}:${requestId}`;
        const receipt = await ledgers.findOne({ _id: receiptId }, { session });
        if (receipt) {
          if (receipt.characterId !== characterId) throw fail(409, 'SPIRIT_REQUEST_MISMATCH');
          return;
        }
        const state = cleanState(await states.findOne({ _id: uid }, { session }));
        if (state.ownedIds.includes(characterId)) return;
        if (!isHoneySpendProduct('profile-spirit')) throw createHttpError(403, HONEY_SCOPE_MESSAGE, { code: 'HONEY_GGULGGUL_ONLY' });
        const wallet = unwrap(await wallets.findOneAndUpdate(
          { userId: uid, serviceScope: HONEY_SCOPE, balance: { $gte: SPIRIT_HONEY_COST } },
          { $inc: { balance: -SPIRIT_HONEY_COST, totalSpent: SPIRIT_HONEY_COST }, $set: { updatedAt: now } },
          { returnDocument: 'after', session },
        ));
        if (!wallet) throw fail(402, 'INSUFFICIENT_HONEY_DROPS');
        await states.updateOne({ _id: uid }, { $addToSet: { ownedIds: characterId }, $set: { updatedAt: now }, $setOnInsert: { equippedId: null, createdAt: now } }, { upsert: true, session });
        await ledgers.insertOne({ _id: receiptId, userId: uid, serviceScope: HONEY_SCOPE, type: 'spend', amount: SPIRIT_HONEY_COST, reason: 'PROFILE_SPIRIT_UNLOCK', characterId, idempotencyKey: requestId, createdAt: now }, { session });
      }, mongoTransactionOptions(env));
    } finally { await session.endSession(); }
  });
  return getProfileSpirits(env, uid);
}
export async function equipProfileSpirit(env, userId, characterId) {
  if (characterId !== null && !findSpirit(characterId)) throw fail(400, 'INVALID_SPIRIT');
  await withMongoRetry(env, async () => {
    const { states } = collections(), uid = String(userId);
    if (characterId === null) {
      await states.updateOne({ _id: uid }, { $set: { equippedId: null, updatedAt: new Date() } });
    } else {
      const updated = await states.updateOne({ _id: uid, ownedIds: characterId }, { $set: { equippedId: characterId, updatedAt: new Date() } });
      if (!updated.matchedCount) throw fail(403, 'SPIRIT_NOT_OWNED');
    }
  });
  return getProfileSpirits(env, userId);
}
