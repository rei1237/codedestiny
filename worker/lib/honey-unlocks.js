import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
import { unlockHoneyUse } from './honey-per-use.js';
import { createHash } from 'node:crypto';
import { ProfileCard } from './models.js';
import { resolveBirthUnlockIdentity } from './birth-scoped-unlock-identity.js';
import { findActivePaidContentUnlock, grantPermanentUnlock, invalidateAccessReadCaches } from './content-unlocks.js';
import { createHttpError } from './http.js';
import { getHoneyUnlockProduct } from './honey-unlock-catalog.js';
import { SAJU_BUNDLE_FEATURE_KEY, isSajuBundleSaleClosed } from './saju-bundle-policy.js';
import { HONEY_SCOPE, honeyCollections, honeyAttendanceStatus, withHoneyTransaction } from './honey-wallet.js';

const fail = (status, code, message) => createHttpError(status, message, { code });
const hash = value => createHash('sha256').update(value).digest('hex');

// Injected storage keeps concurrency/rollback tests entirely offline.
export async function unlockHoneyContent({ userId, productId, profileId, requestId, input }, store) {
  if (isFreeFortuneFeatureKey(productId)) throw fail(409, "FEATURE_NOW_FREE", "무료로 볼 수 있는 콘텐츠예요. 꿀방울을 사용하지 않아도 돼요.");
  // 판매 종료 키는 카탈로그에서 빠졌지만, 이미 꿀방울로 산 사람의 재요청은 보유 확인으로 열어야 한다.
  // 그래서 보유 확인 뒤·차감 전에 409로 닫는 최소 상품 정보를 따로 둔다.
  const saleClosed = isSajuBundleSaleClosed(productId);
  const product = saleClosed ? { productId, featureKey: productId, billingType: 'birth_unlock', honeyCost: 0 } : getHoneyUnlockProduct(productId);
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
    if (saleClosed) throw createHttpError(409, '이 항목은 개별 판매가 끝났어요. 사주 전체 풀이 평생 소장으로 열 수 있어요.', { code: 'PRODUCT_SALE_ENDED', featureKey: product.featureKey, bundleFeatureKey: SAJU_BUNDLE_FEATURE_KEY });
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
