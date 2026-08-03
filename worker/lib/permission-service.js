import {
  getPaidFeatureBillingType,
  normalizePaidFeatureKey,
  PAID_FEATURE_BILLING_TYPES,
} from "./paid-feature-registry.js";

function hasUnlock(snapshot = {}, featureKey = "") {
  const unlockMap = snapshot?.unlockMap && typeof snapshot.unlockMap === "object"
    ? snapshot.unlockMap
    : snapshot?.permissions?.unlockedFeatures;
  if (unlockMap && unlockMap[featureKey] === true) return true;
  const ids = Array.isArray(snapshot?.unlockedFeatureIds)
    ? snapshot.unlockedFeatureIds
    : snapshot?.unlockedFeatures;
  return Array.isArray(ids) && ids.some((key) => normalizePaidFeatureKey(key) === featureKey);
}

export const PermissionService = Object.freeze({
  canUse(featureKey, snapshot = {}, options = {}) {
    const normalizedFeatureKey = normalizePaidFeatureKey(featureKey);
    const accessModel = getPaidFeatureBillingType(normalizedFeatureKey);
    if (accessModel === PAID_FEATURE_BILLING_TYPES.UNLOCK && hasUnlock(snapshot, normalizedFeatureKey)) {
      return { allowed: true, reason: "permanent_unlock", featureKey: normalizedFeatureKey, accessModel };
    }
    if (options.passCovered === true) {
      return { allowed: true, reason: "pass_covered", featureKey: normalizedFeatureKey, accessModel };
    }
    if (accessModel === PAID_FEATURE_BILLING_TYPES.PER_USE) {
      return { allowed: false, reason: "per_use_required", featureKey: normalizedFeatureKey, accessModel };
    }
    return { allowed: false, reason: "payment_required", featureKey: normalizedFeatureKey, accessModel };
  },
});

export default PermissionService;
