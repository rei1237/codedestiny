import { unlockHoneyUse } from './honey-per-use.js';
import { createHash } from 'node:crypto';
import { ProfileCard } from './models.js';
import { resolveBirthUnlockIdentity } from './birth-scoped-unlock-identity.js';
import { findActivePaidContentUnlock, grantPermanentUnlock, invalidateAccessReadCaches } from './content-unlocks.js';
import { createHttpError } from './http.js';
import { getHoneyUnlockProduct } from './honey-unlock-catalog.js';
import { HONEY_SCOPE, honeyCollections, honeyAttendanceStatus, withHoneyTransaction } from './honey-wallet.js';

const fail = (status, code, message) => createHttpError(status, message, { code });
const hash = value => createHash('sha256').update(value).digest('hex');

// Injected storage keeps concurrency/rollback tests entirely offline.
export async function unlockHoneyContent({ userId, productId, profileId, requestId, input }, store) {
  const product = getHoneyUnlockProduct(productId);
  if (!product || product.productId !== productId) throw fail(400, 'INVALID_HONEY_PRODUCT', '콘텐츠를 다시 선택해 주세요.');
  if (product.billingType === 'per_use') return unlockHoneyUse({ userId, product, profileId, requestId, input }, store);
  if (!/^[\w:.-]{8,160}$/.test(String(requestId || ''))) throw fail(400, 'INVALID_REQUEST_ID', '요청을 다시 확인해 주세요.');
  const requestKey = `honey-unlock-request:${userId}:${requestId}`;
  const execute = () => store.transaction(async session => {
    const findProfileCard = input => store.findProfile(input, session);
    const identity = await resolveBirthUnlockIdentity({ userId, profileId, featureKey: product.featureKey }, { findProfileCard });
    const target = { userId, profileId, featureKey: product.featureKey, birthIdentity: identity, session };
    const receiptKey = `honey-unlock:${hash(`${userId}:${identity.birthKey}:${product.featureKey}`)}`;
    const request = await store.ledgers.findOne({ _id: requestKey }, { session });
    if (request && request.receiptKey !== receiptKey) throw fail(409, 'HONEY_REQUEST_MISMATCH', '다른 콘텐츠에 사용한 요청입니다. 새로 시도해 주세요.');
    const response = (spent, replayed, evidenceId) => ({ featureKey: product.featureKey, profileId, unlocked: true, spent, replayed, requestId,
      accessGrant: { ok: true, featureKey: product.featureKey, profileId, evidenceId, requestId, accessMethod: 'HONEY' },
      unlockMap: { [product.featureKey]: true } });
    const existing = await store.findUnlock(target);
    if (existing) return response(0, Boolean(request), String(existing.evidenceId || existing._id || receiptKey));
    const receipt = await store.ledgers.findOne({ _id: receiptKey }, { session });
    if (receipt || request) throw fail(409, 'HONEY_UNLOCK_REVIEW_REQUIRED', '이전 해금 내역을 확인해야 해요. 고객센터에 문의해 주세요.');
    await store.ledgers.insertOne({ _id: requestKey, userId, type: 'unlock_request', amount: 0, receiptKey, serviceScope: HONEY_SCOPE, createdAt: new Date() }, { session });
    // Deterministic receipt ID serializes different request IDs for the same birth/content.
    await store.ledgers.insertOne({ _id: receiptKey, userId, type: 'spend', amount: product.honeyCost,
      reason: 'HONEY_CONTENT_UNLOCK', featureKey: product.featureKey, serviceScope: HONEY_SCOPE,
      idempotencyKey: requestId, createdAt: new Date() }, { session });
    const debit = await store.wallets.updateOne({ userId, serviceScope: HONEY_SCOPE, balance: { $gte: product.honeyCost } }, {
      $inc: { balance: -product.honeyCost, totalSpent: product.honeyCost }, $set: { updatedAt: new Date() },
    }, { session });
    if (!debit.modifiedCount) throw fail(402, 'INSUFFICIENT_HONEY_DROPS', `꿀방울 ${product.honeyCost}개가 필요해요. 출석하고 모아보세요.`);
    await store.grant({ ...target, source: 'HONEY', evidenceId: receiptKey });
    return response(product.honeyCost, false, receiptKey);
  });
  try { return await execute(); }
  catch (error) {
    // A unique receipt race aborts the first transaction; reread in a fresh transaction.
    if (Number(error?.code) !== 11000) throw error;
    return execute();
  }
}

export async function spendHoneyUnlock(env, userId, input) {
  const result = await unlockHoneyContent({ ...input, userId: String(userId) }, {
    ...honeyCollections(),
    transaction: run => withHoneyTransaction(env, run),
    findProfile: ({ userId: uid, profileId }, session) => ProfileCard.findOne({ userId: uid, profileId }).select('profileId gender birth').session(session).lean(),
    findUnlock: findActivePaidContentUnlock,
    grant: grantPermanentUnlock,
  });
  // Invalidate again AFTER commit: a read during the transaction must not cache the old rights.
  invalidateAccessReadCaches(userId);
  return { ...result, honey: await honeyAttendanceStatus(env, userId) };
}
