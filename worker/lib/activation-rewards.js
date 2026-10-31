import { ACTIVATION_REWARD_VERSION, FIRST_PAID_REWARD, TUTORIAL_REWARD, FIRST_PAID_REWARD_START, activationRewardId, hasLegacySignupReward } from '../../js/core/activation-reward-policy.mjs';
import { mongoose } from './db.js';
import { User, Payment, ProfileCard, MonthlyCreditLedger, PaidExecutionRecord, ServiceExecutionTransaction } from './models.js';
import { YeongnyangiRequest } from './yeongnyangi-models.js';
import { ActivationReward } from './activation-reward-models.js';
import { grantMonthlyCreditLotDetailed } from './monthly-credit-store.js';
import { ensureLotsForBalance, resolveNextExpiry } from './monthly-credit-lots.js';
import { computeBirthKey } from './birth-key.js';
import { createHttpError } from './http.js';
import { getBillingFeaturePricing } from './billing-feature-registry.js';
import { getPaidFeaturePaymentPolicy, MOONSTONE_MIN_PRODUCT_KRW, PER_USE_PAID_FEATURE_KEYS } from './paid-feature-registry.js';
import { REVIEW_REWARD_AMOUNT } from './review-reward.js';

const error = (status, code, message) => createHttpError(status, message, { code });
const ownerId = id => new mongoose.Types.ObjectId(String(id));
const paid = ['paid', 'success', 'fulfilled'];
const publicReceipt = receipt => receipt ? { kind: receipt.kind, status: receipt.status, amount: receipt.amount || 0, grantedAt: receipt.grantedAt, expiresAt: receipt.expiresAt } : null;

export async function legacySignupRewardReceived(user) {
  if (hasLegacySignupReward(user)) return true;
  return Boolean(await MonthlyCreditLedger.findOne({ userId: user._id, type: 'MONTHLY_CREDIT_GRANT',
    $or: [{ sourceId: `signup:${user._id}` }, { serviceKey: 'signup_bonus' }] }).select('_id').lean());
}

export async function readActivationRewards(userId) {
  const user = await User.findById(userId).select('profileSubscription').lean();
  if (!user) throw error(401, 'UNAUTHORIZED', '로그인 상태를 다시 확인해 주세요.');
  const [receipts, legacy] = await Promise.all([
    Promise.all(['tutorial', 'first_paid'].map(kind => ActivationReward.findById(activationRewardId(userId, kind)).lean())).then(rows => rows.filter(Boolean)), legacySignupRewardReceived(user),
  ]);
  const lots = user.profileSubscription?.membershipCreditLots || [];
  const normalized = ensureLotsForBalance(user.profileSubscription, Date.now());
  const tutorial = receipts.find(row => row.kind === 'tutorial');
  const firstPaid = receipts.find(row => row.kind === 'first_paid');
  const recommendations = [
    { featureKey: 'yeongnyangi-saju-salmon', title: '영냥이의 한 걸음 깊은 상담', description: '지금 고민을 질문으로 남기고, 나에게 맞는 해석을 받아 보세요.', href: '/yeongnyangi/fortune/' },
    { featureKey: 'fortune-tea-house-saju-consultation', title: '연이의 사주 상담', description: '마음에 남은 고민을 조금 더 다정하게 풀어볼까요?', href: '/fortune-tea-house/' },
  ].flatMap(item => {
    const price = getBillingFeaturePricing({ featureKey: item.featureKey });
    if (!price.ok || !price.pricing) return [];
    return [{ ...item, amountKRW: price.pricing.amountKRW, moonstonesAllowed: !getPaidFeaturePaymentPolicy(item.featureKey).monthlyExcluded }];
  });
  return { accountId: String(userId), policy: { tutorial: TUTORIAL_REWARD, firstPaid: FIRST_PAID_REWARD, review: { amount: REVIEW_REWARD_AMOUNT, days: 30, trigger: 'approved' } },
    wallet: { balance: normalized.balance, nextExpiry: resolveNextExpiry(lots, Date.now()), minimumProductKRW: MOONSTONE_MIN_PRODUCT_KRW },
    recommendations,
    tutorial: { eligible: !legacy && tutorial?.status !== 'granted', legacySignupReceived: legacy, profileId: tutorial?.profileId || null, receipt: publicReceipt(tutorial) },
    firstPaid: { receipt: publicReceipt(firstPaid) } };
}

async function ownedProfile(userId, profileId) {
  if (!profileId || String(profileId).length > 80) throw error(400, 'PROFILE_REQUIRED', '내 프로필을 저장한 뒤 무료 사주를 다시 확인해 주세요.');
  const card = await ProfileCard.findOne({ userId: String(userId), profileId: String(profileId) }).select('profileId birth').lean();
  if (!computeBirthKey(card)) throw error(403, 'INVALID_PROFILE', '저장된 내 프로필을 선택해 주세요.');
  return card;
}

export async function startFreeSajuTutorial(userId, profileId) {
  const user = await User.findById(userId).select('profileSubscription').lean();
  if (!user) throw error(401, 'UNAUTHORIZED', '로그인이 필요해요.');
  if (await legacySignupRewardReceived(user)) return { alreadyReceived: true, ...(await readActivationRewards(userId)) };
  await ownedProfile(userId, profileId);
  const _id = activationRewardId(userId, 'tutorial');
  await ActivationReward.findOneAndUpdate({ _id }, { $setOnInsert: { _id, userId: ownerId(userId), kind: 'tutorial',
    profileId: String(profileId), policyVersion: ACTIVATION_REWARD_VERSION, status: 'started', amount: TUTORIAL_REWARD.amount } }, { upsert: true, new: true }).lean();
  return { started: true, ...(await readActivationRewards(userId)) };
}

// A cash receipt alone is insufficient: its report must also have been delivered.
export async function findFirstDeliveredCashPurchase(userId) {
  const owner = ownerId(userId);
  const order = await Payment.findOne({ userId: owner, featureKey: { $in: PER_USE_PAID_FEATURE_KEYS }, status: { $in: paid }, paymentType: 'digital_content',
    purchaseType: { $ne: 'GIFT' }, paymentAmount: { $gt: 0 }, refundLock: null, refundRequestedAt: null,
    'metadata.unlockRevoked': { $ne: true }, 'metadata.yeongnyangiRefundPending': { $ne: true },
    'pricingSnapshot.fulfillmentType': { $ne: 'service_pack' } }).sort({ paidAt: 1, createdAt: 1, _id: 1 }).lean();
  const paidAtMs = order ? new Date(order.paidAt || order.createdAt).getTime() : NaN;
  if (!order || !Number.isFinite(paidAtMs) || paidAtMs < Date.parse(FIRST_PAID_REWARD_START)) return null;
  const ids = [...new Set([String(order._id), order.merchantUid, order.impUid, order.requestId, order.idempotencyKey].filter(Boolean))];
  const refs = fields => ({ $or: fields.map(field => ({ [field]: { $in: ids } })) });
  const evidence = await Promise.all([
    YeongnyangiRequest.findOne({ userId: owner, state: 'COMPLETED', $or: [{ paymentId: order._id },
      { perUseSource: 'payment', perUseEvidenceId: { $in: ids } }] }).select('_id').lean(),
    PaidExecutionRecord.findOne({ userId: String(userId), status: 'completed', accessMethod: 'single', result: { $ne: null }, ...refs(['paymentId', 'orderId']) }).select('_id').lean(),
    ServiceExecutionTransaction.findOne({ userId: owner, status: 'success', deliveryStatus: 'delivered',
      refundStatus: 'none', ...refs(['paymentId', 'orderId', 'paymentRef.paymentId', 'paymentRef.merchantUid', 'paymentRef.impUid']) }).select('_id').lean(),
  ]);
  return evidence.some(Boolean) ? order : null;
}

// The canonical lot writer is idempotent. The permanent receipt also survives expiry/lot pruning.
export async function settleActivationReward(userId, kind, { profileId = '' } = {}) {
  const _id = activationRewardId(userId, kind), owner = ownerId(userId);
  let receipt = await ActivationReward.findById(_id).lean();
  if (receipt?.status === 'granted') return { replayed: true, ...(await readActivationRewards(userId)) };
  if (kind === 'tutorial') {
    const user = await User.findById(userId).select('profileSubscription').lean();
    if (!user) throw error(401, 'UNAUTHORIZED', '로그인이 필요해요.');
    if (await legacySignupRewardReceived(user)) return { alreadyReceived: true, ...(await readActivationRewards(userId)) };
    if (!receipt || receipt.profileId !== String(profileId)) throw error(409, 'TUTORIAL_REQUIRED', '내 프로필로 무료 사주를 확인한 뒤 선물을 받아 주세요.');
    await ownedProfile(userId, profileId);
  } else if (kind === 'first_paid') {
    const order = await findFirstDeliveredCashPurchase(userId);
    if (!order) return { eligible: false, ...(await readActivationRewards(userId)) };
    receipt = await ActivationReward.findOneAndUpdate({ _id }, { $setOnInsert: { _id, userId: owner, kind,
      proofId: String(order._id), status: 'verified', policyVersion: ACTIVATION_REWARD_VERSION, amount: FIRST_PAID_REWARD.amount } }, { new: true, upsert: true }).lean();
    if (receipt.proofId !== String(order._id)) throw error(409, 'REWARD_PROOF_CHANGED', '첫 구매 내역을 확인 중이에요. 잠시 후 다시 확인해 주세요.');
  } else throw error(400, 'INVALID_REWARD_KIND', '혜택 종류를 확인해 주세요.');
  await ActivationReward.updateOne({ _id, grantStartedAt: null }, { $set: { grantStartedAt: new Date() } });
  receipt = await ActivationReward.findById(_id).lean();
  if (Date.now() - new Date(receipt.grantStartedAt).getTime() > 30 * 86400000) throw error(409, 'REWARD_REVIEW_REQUIRED', '이전 선물 처리 내역을 확인해야 해요. 문의해 주세요.');
  const amount = kind === 'tutorial' ? TUTORIAL_REWARD.amount : FIRST_PAID_REWARD.amount;
  const result = await grantMonthlyCreditLotDetailed({ userId: owner, lotId: _id, amount });
  if (!result?.user) throw error(503, 'REWARD_PENDING', '선물을 확인 중이에요. 다시 받기를 눌러도 중복 지급되지 않아요.');
  const lot = result.lot || result.user.profileSubscription?.membershipCreditLots?.find(item => item.lotId === _id);
  if (!lot) throw error(503, 'REWARD_PENDING', '선물 기록을 확인 중이에요. 잠시 후 다시 확인해 주세요.');
  await MonthlyCreditLedger.updateOne({ userId: owner, type: 'MONTHLY_CREDIT_GRANT', sourceId: _id }, { $setOnInsert: {
    userId: owner, type: 'MONTHLY_CREDIT_GRANT', sourceId: _id, amount, beforeBalance: result.beforeBalance,
    afterBalance: result.afterBalance, reason: kind === 'tutorial' ? '무료 사주 튜토리얼 완료 선물' : '첫 유료 상담 이용 선물',
    serviceKey: kind === 'tutorial' ? 'tutorial_bonus' : 'first_paid_bonus', metadata: { policyVersion: ACTIVATION_REWARD_VERSION, proofId: receipt.proofId || receipt.profileId },
  } }, { upsert: true });
  await ActivationReward.updateOne({ _id }, { $set: { status: 'granted', amount, grantedAt: lot.grantedAt, expiresAt: lot.expiresAt } });
  return { granted: true, replayed: result.added !== true, ...(await readActivationRewards(userId)) };
}
