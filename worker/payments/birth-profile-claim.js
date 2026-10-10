/**
 * 프로필 선택 지급 — "결제는 됐는데 열람할 생년월일을 몰라 지급하지 못한 주문"을 푼다.
 *
 * 출생 기반 해금(userId + birthKey + contentKey) 전환 전에 만든 주문은 pricingSnapshot 에 생년월일이 없다.
 * 그 주문의 저장 프로필이 없거나 지워졌으면 지급 대상을 알 수 없다 — 구 웹(payments.js)·구글(app-store.js)·
 * V2 크론(reconcile.js)은 모두 `delivery_failed_manual_review` 를 달고 멈춘다. 사용자가 저장 프로필을 고르면
 * 그 출생 정보로 BIRTH 행을 지급한다. 환불하지 않는다(2026-10-10 사용자 결정).
 *
 * 여기는 대기 정의와 주문 문서 CAS 만 둔다. 신원 해석·지급을 엮는 흐름은 index.js 가 조립한다
 * (형제 파일은 서로를 부르지 않는다 — birth-identity.js 는 공용 leaf 다).
 * 목록·지급·집계 스크립트(scripts/audit-birth-scope-pending-orders.mjs)가 이 정의 하나를 쓴다.
 */
import { BirthScopeLegacyClaim, Payment } from "../lib/models.js";
import { FEATURE_KEY_PRICE_TABLE, UNLOCK_PRODUCT_BY_FEATURE_KEY, normalizePaidFeatureKey } from "../lib/paid-feature-registry.js";
import { requiresPartnerProfile } from "../lib/birth-scoped-unlock-identity.js";
import { MANUAL_REVIEW_FAILURE_CODE, orderNeedsBirthProfileSelection } from "./birth-identity.js";
import { toObjectId, toUserIdString } from "./db.js";

/** 환불·취소·결제 전 상태는 대상이 아니다. processing 은 구 단건의 "결제 확인·해금 보류" 상태다. */
export const BIRTH_PROFILE_PENDING_STATUSES = Object.freeze(["paid", "processing", "success", "fulfilled"]);
const LIST_LIMIT = 20;

/**
 * 프로필 선택 대기 주문인가.
 * - 출생 기반 영구 해금 + 스냅샷 생년월일 없음(orderNeedsBirthProfileSelection)
 * - 종결 표식(구 웹·구글·V2 크론 공통) 또는 V2 확정 직후 미지급(크론이 표식을 달기 전)
 */
export function isBirthProfilePendingOrder(order) {
  if (!order || !BIRTH_PROFILE_PENDING_STATUSES.includes(String(order.status || ""))) return false;
  if (String(order.purchaseType || "") === "GIFT") return false;
  if (!orderNeedsBirthProfileSelection(order)) return false;
  if (String(order.failureCode || "") === MANUAL_REVIEW_FAILURE_CODE) return true;
  return order.status === "paid" && !order.entitlementGrantedAt;
}

/** 본인 대기 후보 조회 필터. 출생 기반 키·스냅샷 판정은 별칭·연도 접미사가 있어 isBirthProfilePendingOrder 로 거른다. */
export function birthProfilePendingFilter(userId) {
  return {
    userId: toObjectId(userId),
    status: { $in: [...BIRTH_PROFILE_PENDING_STATUSES] },
    purchaseType: { $ne: "GIFT" },
    $or: [
      { failureCode: MANUAL_REVIEW_FAILURE_CODE },
      { status: "paid", entitlementGrantedAt: null },
    ],
  };
}

export async function listBirthProfilePendingOrders(db, { userId }) {
  const uid = toObjectId(userId);
  if (!uid) return [];
  const candidates = await db.find(Payment, birthProfilePendingFilter(userId), { sort: { _id: -1 }, limit: LIST_LIMIT });
  return candidates.filter(isBirthProfilePendingOrder);
}

/** 지급에 쓸 상품 정보. 단종·가격 변경과 무관하게 **실제 결제 금액**을 권한 행의 회계 필드로 남긴다. */
export function claimProductFromOrder(order) {
  const raw = String(order?.featureKey || "").trim();
  const base = raw.includes(":") ? raw.slice(0, raw.indexOf(":")) : raw;
  return {
    featureKey: normalizePaidFeatureKey(base) || base,
    priceCoins: Math.max(0, Math.floor(Number(order?.coinPrice || order?.expectedChargedPoints || 0))),
    priceKRW: Math.max(0, Math.floor(Number(order?.paymentAmount || 0))),
  };
}

/**
 * 선점. 같은 주문을 서로 다른 생년월일로 두 번 지급하지 않게 한다 — 첫 선택의 birthKey 만 이어서 진행한다.
 * 같은 birthKey 의 재시도(중단 후 다시 누름)는 통과한다. 실패하면 null.
 */
export async function reserveBirthProfileClaim(db, { order, identity, now = new Date() }) {
  return db.findOneAndUpdate(Payment, {
    merchantUid: String(order.merchantUid),
    status: String(order.status),
    $or: [
      { "metadata.birthProfileClaim.birthKey": { $exists: false } },
      { "metadata.birthProfileClaim.birthKey": identity.birthKey },
    ],
  }, {
    $set: {
      "metadata.birthProfileClaim.profileId": identity.profileId,
      "metadata.birthProfileClaim.partnerProfileId": identity.partnerProfileId || "",
      "metadata.birthProfileClaim.birthKey": identity.birthKey,
      "metadata.birthProfileClaim.claimedAt": now,
    },
  }, { returnDocument: "after" });
}

/**
 * 마무리. 지급이 끝난 뒤에만 부른다 — 표식을 먼저 지우면 지급 실패 주문이 대기 목록에서 사라진다.
 * 스냅샷에 고른 출생 정보를 박아 이후 재지급·환불이 같은 BIRTH 행을 가리키게 한다.
 */
export async function finalizeBirthProfileClaim(db, { order, identity, snapshotFields, now = new Date() }) {
  const set = {
    ...Object.fromEntries(Object.entries(snapshotFields).map(([key, value]) => [`pricingSnapshot.${key}`, value])),
    failureCode: null,
    failureMessage: null,
    failureStage: null,
    "metadata.birthProfileClaim.grantedAt": now,
    updatedAt: now,
  };
  if (!order.entitlementGrantedAt) set.entitlementGrantedAt = now;
  // 구 단건: 결제 확인·해금 보류(processing) → 정상 완료와 같은 상태. 구 재조정 크론도 더는 집지 않는다.
  if (order.status === "processing") {
    set.status = "fulfilled";
    set.orderState = "UNLOCKED";
    set.lastErrorAt = null;
  }
  // 구글: 의도 기록 신원 실패로 남긴 검토 표식을 푼다.
  if (order.pricingSnapshot?.birthUnlockReviewRequired) set["pricingSnapshot.birthUnlockReviewRequired"] = false;
  return db.updateOne(Payment, {
    merchantUid: String(order.merchantUid),
    status: String(order.status),
    "metadata.birthProfileClaim.birthKey": identity.birthKey,
  }, { $set: set });
}

/** 클라이언트에 내보낼 모양. 주문 id·금액·기능만 — 프로필·생년월일은 싣지 않는다. */
export function presentBirthProfilePendingOrder(order) {
  return {
    orderId: String(order.merchantUid || ""),
    featureKey: String(order.featureKey || ""),
    productName: String(order.orderName || order.pricingSnapshot?.reason || "").slice(0, 80),
    amountKRW: Number(order.paymentAmount || 0),
    paidAt: order.paidAt || null,
    requiresPartner: requiresPartnerProfile(claimProductFromOrder(order).featureKey),
  };
}

/* ── 레거시 해금(BirthScopeLegacyClaim) ─────────────────────────────────
   출생 기반 전환 전에 산 해금 중 구매 프로필을 알 수 없는 것(USER 행·삭제·불완전 프로필·상대 미상·
   계정 배열/이용 내역에만 남은 키)은 마이그레이션(20261010-birth-scope-unlocks.mjs)이 여기에 대기로 남긴다.
   주문 대기와 같은 카드·같은 API 로 고르게 하되, id 는 `legacy-<claimId>` 로 구분한다. */
const LEGACY_ORDER_ID_PREFIX = "legacy-";

export function isLegacyClaimOrderId(orderId) {
  return /^legacy-[a-f0-9]{24}$/.test(String(orderId || ""));
}

export function legacyClaimIdFromOrderId(orderId) {
  return isLegacyClaimOrderId(orderId) ? String(orderId).slice(LEGACY_ORDER_ID_PREFIX.length) : "";
}

export function legacyBirthClaimPendingFilter(userId) {
  return {
    userId: toUserIdString(userId),
    claimId: { $exists: true },
    sourceKind: { $exists: true },
    "claim.grantedAt": { $exists: false },
  };
}

export async function listLegacyBirthClaims(db, { userId }) {
  if (!toUserIdString(userId)) return [];
  return db.find(BirthScopeLegacyClaim, legacyBirthClaimPendingFilter(userId), { sort: { paidAt: -1 }, limit: LIST_LIMIT });
}

export async function findLegacyBirthClaim(db, { claimId }) {
  if (!claimId) return null;
  return db.findOne(BirthScopeLegacyClaim, { claimId: String(claimId), sourceKind: { $exists: true } });
}

/** 레거시 claim 을 주문 지급 모양으로 — claimProductFromOrder 가 연도 접미사를 떼고 실제 금액을 남긴다. */
export function legacyClaimProduct(claim) {
  return claimProductFromOrder({ featureKey: claim?.featureKey, coinPrice: claim?.priceCoins, paymentAmount: claim?.priceKRW });
}

export function presentLegacyBirthClaim(claim) {
  const { featureKey } = legacyClaimProduct(claim);
  const name = FEATURE_KEY_PRICE_TABLE[featureKey]?.reason || UNLOCK_PRODUCT_BY_FEATURE_KEY[featureKey]?.reason || featureKey;
  return {
    orderId: `${LEGACY_ORDER_ID_PREFIX}${String(claim.claimId || "")}`,
    featureKey: String(claim.featureKey || ""),
    productName: String(name || "").slice(0, 80),
    amountKRW: Number(claim.priceKRW || 0),
    paidAt: claim.paidAt || null,
    requiresPartner: requiresPartnerProfile(featureKey),
  };
}

/** 선점. 주문 선점과 같다 — 처음 고른 birthKey 만 이어서 진행하고, 같은 birthKey 재시도는 통과한다. */
export async function reserveLegacyBirthClaim(db, { claim, identity, now = new Date() }) {
  return db.findOneAndUpdate(BirthScopeLegacyClaim, {
    claimId: String(claim.claimId),
    userId: toUserIdString(claim.userId),
    $or: [
      { "claim.birthKey": { $exists: false } },
      { "claim.birthKey": identity.birthKey },
    ],
  }, {
    $set: {
      "claim.profileId": identity.profileId,
      "claim.partnerProfileId": identity.partnerProfileId || "",
      "claim.birthKey": identity.birthKey,
      "claim.claimedAt": now,
      updatedAt: now,
    },
  }, { returnDocument: "after" });
}

/** 마무리. 지급이 끝난 뒤에만 부른다 — 먼저 찍으면 지급 실패 claim 이 목록에서 사라진다. */
export async function finalizeLegacyBirthClaim(db, { claim, identity, now = new Date() }) {
  return db.updateOne(BirthScopeLegacyClaim, {
    claimId: String(claim.claimId),
    "claim.birthKey": identity.birthKey,
  }, { $set: { "claim.grantedAt": now, updatedAt: now } });
}
