import { connectDb, withMongoRetry } from "./db.js";
import { User } from "./models.js";
import { findActivePaidContentUnlock, isProfileScopedContentUnlockFeatureKey } from "./content-unlocks.js";
import {
  isUnlockPaidFeatureKey,
  normalizePaidFeatureKey,
  LOVE_CODE_FEATURE_KEY,
  LEGACY_LOVE_CODE_FEATURE_KEYS,
} from "./paid-feature-registry.js";

// billing의 계정 해금 읽기 계약. 스냅샷이 없는 상세 조회는 두 레거시 필드를 모두 읽는다.
export async function hasUserScopedPermanentUnlock(env, { userId, featureKey, unlockedFeatures = null }) {
  const key = normalizePaidFeatureKey(featureKey);
  if (!userId || !key || !isUnlockPaidFeatureKey(key) || isProfileScopedContentUnlockFeatureKey(key)) return false;
  if (Array.isArray(unlockedFeatures)) {
    return unlockedFeatures.some((entry) => normalizePaidFeatureKey(entry) === key);
  }
  await connectDb(env);
  const readKeys = key === LOVE_CODE_FEATURE_KEY ? [key, ...LEGACY_LOVE_CODE_FEATURE_KEYS] : [key];
  return Boolean(await User.exists({
    _id: userId,
    $or: [{ unlockedFeatures: { $in: readKeys } }, { paidFeatures: { $in: readKeys } }],
  }));
}

// 구매 후 계정 단위 재열람 전용. 이용권 판정·차감·해금 생성·접근 허용 캐시는 없다.
// DB 오류는 호출자에게 전달하여 미구매(402)로 바뀌지 않게 한다.
export async function hasPurchasedAccountContentAccess(env, { userId, featureKey }) {
  const key = normalizePaidFeatureKey(featureKey);
  if (!userId || !key || !isUnlockPaidFeatureKey(key) || isProfileScopedContentUnlockFeatureKey(key)) return false;
  return withMongoRetry(env, async () => {
    await connectDb(env);
    const [entitlement, legacyUnlock] = await Promise.all([
      findActivePaidContentUnlock({ userId, featureKey: key }),
      hasUserScopedPermanentUnlock(env, { userId, featureKey: key }),
    ]);
    return Boolean(entitlement || legacyUnlock);
  });
}
