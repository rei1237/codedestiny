/**
 * 결제(V2) 컨텍스트의 출생 기반 해금 신원. 해석 규칙은 worker/lib/birth-scoped-unlock-identity.js 하나이고,
 * 여기는 ProfileCard 조회를 결제 db 래퍼(db.findOne)로 돌리고 오류를 결제 오류표 코드로 옮길 뿐이다.
 *
 * - 주문 발급 시점에 계산한 birthKey 를 pricingSnapshot 에 박는다(birthIdentityFromSnapshot).
 *   결제창이 떠 있는 동안 생년월일을 고쳐도 지급은 **결제를 시작한 생년월일**에 떨어진다.
 * - 계정 단위 키·회당 상품은 null — 호출부는 종전 신원을 그대로 쓴다.
 */
// 네임스페이스 import — models.js 를 부분 목으로 대역하는 테스트에서도 링크가 깨지지 않게 한다.
import * as models from "../lib/models.js";
import { BIRTH_ENTITLEMENT_SCOPE, toBirthEntitlementProfileId } from "../lib/birth-key.js";
import {
  isBirthScopedUnlockFeatureKey,
  isBirthUnlockIdentityError,
  resolveBirthUnlockIdentity,
} from "../lib/birth-scoped-unlock-identity.js";
import { PAID_FEATURE_BILLING_TYPES, getPaidFeatureBillingType } from "../lib/paid-feature-registry.js";
import { paymentError } from "./errors.js";
import { toObjectId } from "./db.js";

function clean(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

export function paymentFindProfileCard(db) {
  return async ({ userId, profileId }) => {
    const uid = toObjectId(userId);
    if (!uid) return null;
    return db.findOne(models.ProfileCard, { userId: uid, profileId }, { projection: { profileId: 1, gender: 1, birth: 1 } });
  };
}

/** 영구 해금형 + 출생 기반 키. 구 가격 체인(resolveLegacyProduct)은 billingType 을 싣지 않아 레지스트리로 판정한다. */
export function isBirthScopedProduct(product) {
  const featureKey = clean(product?.featureKey, 160);
  if (!isBirthScopedUnlockFeatureKey(featureKey)) return false;
  const billingType = clean(product?.billingType, 40) || getPaidFeatureBillingType(featureKey) || PAID_FEATURE_BILLING_TYPES.PER_USE;
  return billingType !== PAID_FEATURE_BILLING_TYPES.PER_USE;
}

/** 엄격 해석. 출생 기반이 아니면 null, 프로필이 없거나 남의 것이면 MISSING_PROFILE_ID / INVALID_PROFILE. */
export async function resolvePaymentBirthIdentity(db, { userId, profileId, partnerProfileId = "", featureKey }) {
  if (!isBirthScopedUnlockFeatureKey(featureKey)) return null;
  try {
    return await resolveBirthUnlockIdentity(
      { userId, profileId, partnerProfileId, featureKey },
      { findProfileCard: paymentFindProfileCard(db) },
    );
  } catch (error) {
    if (!isBirthUnlockIdentityError(error)) throw error;
    throw paymentError(error.code, error.message, { featureKey: clean(featureKey, 160), requiresProfile: true });
  }
}

/** 주문 스냅샷에 박힌 신원. 없거나 형식이 틀리면 null(구 주문 — 호출부가 profileId 로 다시 해석한다). */
export function birthIdentityFromSnapshot(snapshot = {}, featureKey = "") {
  const birthKey = clean(snapshot?.birthKey, 80);
  const entitlementProfileId = toBirthEntitlementProfileId(birthKey);
  if (!entitlementProfileId) return null;
  return {
    profileId: clean(snapshot.profileId, 80),
    partnerProfileId: clean(snapshot.partnerProfileId, 80),
    birthKey,
    partnerBirthKey: clean(snapshot.partnerBirthKey, 80),
    entitlementProfileId,
    scope: BIRTH_ENTITLEMENT_SCOPE,
    featureKey: clean(featureKey, 160),
  };
}

/** pricingSnapshot 에 실을 필드. 합성 profileId("birth:…")는 싣지 않는다 — 실제 구매 프로필만 남긴다. */
export function birthSnapshotFields(identity) {
  if (!identity) return {};
  return {
    profileId: identity.profileId,
    partnerProfileId: identity.partnerProfileId,
    birthKey: identity.birthKey,
    partnerBirthKey: identity.partnerBirthKey,
    scope: BIRTH_ENTITLEMENT_SCOPE,
  };
}
