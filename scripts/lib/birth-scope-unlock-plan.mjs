/**
 * 출생 정보 단위 해금 마이그레이션의 **순수 계획기**(I/O 없음 — 단위 테스트 대상).
 * 실행 스크립트: scripts/migrations/20261010-birth-scope-unlocks.mjs
 *
 * 입력
 *  - entitlements: ContentEntitlement 원본 행(ACTIVE)
 *  - evidence:     행이 없는 구매의 증거(Payment.pricingSnapshot.profileId · PointHistory.metadata.profileId)
 *                  { userId, featureKey, profileId, orderId, serviceKey?, contentKey?, source, at }
 *  - profiles:     ProfileCard { userId, profileId, gender, birth } — **현재** 출생 정보
 *  - users:        { _id, unlockedFeatures, paidFeatures } — 배열에만 남은 구매를 세기 위함
 *
 * 규칙
 *  - 출생 기반 키만 다룬다(paid-feature-registry.js BIRTH_SCOPED_UNLOCK_FEATURE_KEYS).
 *  - 구매 프로필을 아는 원천은 그 프로필의 **현재** 출생 정보로 birthKey 를 계산해 BIRTH 행을 **복사 생성**한다.
 *    원본 행은 고치지 않는다(profileId 는 감사용으로 남는다).
 *  - 같은 userId+birthKey+serviceKey+contentKey 로 모이는 원천은 한 행으로 병합하고
 *    sourceEntitlementIds / mergedOrderIds 에 모두 남긴다.
 *  - 구매 프로필을 모르는 USER 행, 프로필이 삭제된 행, 출생 정보가 불완전한 행, 상대를 모르는 궁합 행은
 *    birthScopeExcludedAt 으로 **표시만** 한다(삭제 X).
 *  - 표시한 원천과 배열에만 남은 키는 claims[](BirthScopeLegacyClaim)가 된다 — 사용자가 저장 프로필을 고르면
 *    그 생년월일 하나로 지급한다(기존 구매는 사라지지 않는다). P0-1 대기 주문(heldForProfileClaim)은 그 목록이 다룬다.
 */
import { createHash } from "node:crypto";
import { computeBirthKey,toBirthEntitlementProfileId, BIRTH_ENTITLEMENT_SCOPE } from "../../worker/lib/birth-key.js";
import {
  BIRTH_SCOPED_UNLOCK_FEATURE_KEYS,
  PAID_FEATURE_KEY_ALIASES,
  isBirthScopedUnlockFeatureKey,
  normalizePaidFeatureKey,
} from "../../worker/lib/paid-feature-registry.js";
import {
  USER_SCOPE_PROFILE_ID,
  resolvePaidContentUnlockTarget,
  resolveUnlockedFeatureKeyFromContentKey,
} from "../../worker/lib/content-unlocks.js";

export const EXCLUDE_REASONS = Object.freeze({
  UNKNOWN_PURCHASE_PROFILE: "unknown_purchase_profile",
  PROFILE_DELETED: "purchase_profile_deleted",
  INCOMPLETE_BIRTH: "incomplete_birth",
  COMPAT_PARTNER_UNKNOWN: "compat_partner_unknown",
});
// 계정 배열에만 남은 키 — 엔타이틀먼트·결제·차감 어디에도 근거가 없다.
export const ARRAY_ONLY_CLAIM_REASON = "array_only_unknown_profile";

/** 레거시 지급 대기의 클라이언트 노출 id. 같은 출처는 몇 번 돌려도 같은 id 다(재실행 안전). */
export function legacyClaimId(userId, sourceKind, sourceId) {
  return createHash("sha256").update(`${clean(userId, 120)}|${sourceKind}|${clean(sourceId, 180)}`).digest("hex").slice(0, 24);
}

function clean(value, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function isActive(row, now) {
  if (clean(row?.status, 20).toUpperCase() !== "ACTIVE") return false;
  const expiresAt = toDate(row?.expiresAt);
  return !expiresAt || expiresAt > now;
}

function swapSeparators(key) {
  return [key, key.replace(/_/g, "-"), key.replace(/-/g, "_")];
}

/**
 * 출생 기반 키가 원천에 남아 있을 수 있는 표기 전부 — 정본, `_`/`-` 바꿈, 정본이 출생 기반인 별칭(원형·소문자).
 * 마이그레이션 조회의 $in 과 `^(표기):` 접두 정규식(연도 접미사 키)에 쓴다.
 */
export function birthScopedFeatureKeyVariants() {
  const keys = new Set();
  for (const key of BIRTH_SCOPED_UNLOCK_FEATURE_KEYS) for (const variant of swapSeparators(key)) keys.add(variant);
  for (const alias of Object.keys(PAID_FEATURE_KEY_ALIASES)) {
    if (!isBirthScopedUnlockFeatureKey(PAID_FEATURE_KEY_ALIASES[alias])) continue;
    keys.add(alias);
    keys.add(alias.toLowerCase());
  }
  return Array.from(keys);
}

/**
 * 원 키(별칭·대소문자·`_`/`-` 바꿈·`:접미사`)를 정본 출생 기반 키로 접는다. 출생 기반이 아니면 "".
 * `:접미사`는 연도 상품의 콘텐츠 구분이라 남긴다(sukyo_yearly_fortune_unlock:2027).
 */
export function canonicalBirthFeatureKey(raw) {
  const text = clean(raw);
  if (!text) return "";
  const cut = text.indexOf(":");
  const base = cut >= 0 ? text.slice(0, cut) : text;
  const suffix = cut >= 0 ? text.slice(cut) : "";
  for (const candidate of swapSeparators(base)) {
    const key = normalizePaidFeatureKey(candidate) || candidate;
    if (isBirthScopedUnlockFeatureKey(key)) return `${key}${suffix}`;
  }
  return "";
}

const POINT_REFUND_LINK_FIELDS = ["refundForPointHistoryId", "sourceTransactionId", "originalPointHistoryId", "refundedEvidenceId"];
// 월정석 환불은 refund 행 없이 원 차감에 표식만 남긴다(worker/routes/fortune.js findAIPromptPaymentEvidence 와 같은 목록).
const POINT_DEDUCT_REFUND_FLAGS = [
  "refundedForUnlockFailure",
  "monthlyCreditRefundedForUnlockFailure",
  "monthlyCreditRefundedForLedgerFailure",
  "monthlyCreditRefundedForServiceExecution",
];

/**
 * 코인 차감과 환불을 짝지어 **환불되지 않은 차감만** 남긴다. 환불 한 건이 같은 키의 다른 구매까지 지우지 않게 한다.
 * 입력 행: { _id, userId, featureKey(정본), metadata, createdAt }.
 * 짝 찾는 순서: 환불 metadata 의 원 차감 id → 같은 requestId → (차감 자체의 환불 표식은 먼저 뺀다) →
 * 짝이 없으면 같은 사용자·키에서 환불 시각 이전의 가장 최근 차감 하나만 상쇄한다(휴리스틱 — 건수를 보고한다).
 */
export function pairPointRefunds(deducts = [], refunds = []) {
  const stats = { deducts: deducts.length, refunds: refunds.length, byFlag: 0, byLink: 0, byRequestId: 0, byFallback: 0, linkedElsewhere: 0, unmatched: 0 };
  const userKey = (row) => `${clean(row?.userId, 120)}\u0000${clean(row?.featureKey)}`;
  const removed = new Set();
  const byId = new Map(deducts.map((row) => [clean(row?._id, 64), row]));
  for (const row of deducts) {
    if (POINT_DEDUCT_REFUND_FLAGS.some((flag) => row?.metadata?.[flag] === true)) {
      removed.add(row);
      stats.byFlag += 1;
    }
  }

  // 1) 원 차감 id 로 이어진 환불. 이미 표식으로 빠진 차감을 가리키면 그 환불은 소진된 것으로 본다.
  const pending = [];
  for (const refund of refunds) {
    const linkIds = POINT_REFUND_LINK_FIELDS.map((field) => clean(refund?.metadata?.[field], 64)).filter(Boolean);
    const target = linkIds.map((id) => byId.get(id)).find(Boolean);
    if (target) {
      if (!removed.has(target)) {
        removed.add(target);
        stats.byLink += 1;
      }
      continue;
    }
    // 우리가 모르는 차감(다른 키·다른 시스템)을 가리키는 환불은 여기 차감을 상쇄하지 않는다.
    if (linkIds.length) {
      stats.linkedElsewhere += 1;
      continue;
    }
    pending.push(refund);
  }

  // 2) 같은 requestId. 3) 짝 없는 환불은 가장 최근 차감 하나.
  const unmatched = [];
  for (const refund of pending) {
    const requestId = clean(refund?.metadata?.requestId, 160);
    const sameRequest = requestId
      ? deducts.filter((row) => userKey(row) === userKey(refund) && clean(row?.metadata?.requestId, 160) === requestId)
      : [];
    if (!sameRequest.length) {
      unmatched.push(refund);
      continue;
    }
    const target = sameRequest.find((row) => !removed.has(row));
    if (target) {
      removed.add(target);
      stats.byRequestId += 1;
    }
  }
  for (const refund of unmatched) {
    const at = toDate(refund?.createdAt);
    const candidates = deducts
      .filter((row) => !removed.has(row) && userKey(row) === userKey(refund))
      .sort((a, b) => (toDate(b?.createdAt)?.getTime() || 0) - (toDate(a?.createdAt)?.getTime() || 0));
    const target = candidates.find((row) => !at || !toDate(row?.createdAt) || toDate(row.createdAt) <= at) || candidates[0];
    if (target) {
      removed.add(target);
      stats.byFallback += 1;
    } else {
      stats.unmatched += 1;
    }
  }
  return { kept: deducts.filter((row) => !removed.has(row)), stats };
}

function rowFeatureKey(row) {
  const raw = clean(row?.featureKey) || resolveUnlockedFeatureKeyFromContentKey(row?.contentKey || row?.contentId);
  return canonicalBirthFeatureKey(raw) || normalizePaidFeatureKey(raw) || raw;
}

function profileMapKey(userId, profileId) {
  return `${clean(userId, 120)}\u0000${clean(profileId, 80)}`;
}

function isUserScopedRow(row) {
  return clean(row?.scope, 20) === "USER" || clean(row?.profileId, 100) === USER_SCOPE_PROFILE_ID || !clean(row?.profileId, 100);
}

export function planBirthScopeMigration({
  entitlements = [],
  evidence = [],
  profiles = [],
  users = [],
  now = new Date(),
} = {}) {
  const profileByKey = new Map();
  for (const card of profiles) profileByKey.set(profileMapKey(card?.userId, card?.profileId), card);

  const stats = {
    scannedRows: entitlements.length,
    scannedEvidence: evidence.length,
    existingBirthRows: 0,
    inactiveRows: 0,
    accountScopedRows: 0,
    birthScopedSources: 0,
    birthRowsPlanned: 0,
    mergedGroups: 0,
    mergedSources: 0,
    excludedRows: 0,
    excludedUsers: 0,
    excludedByReason: Object.fromEntries(Object.values(EXCLUDE_REASONS).map((reason) => [reason, 0])),
    deletedProfileSources: 0,
    arrayOnlyUnknownProfileKeys: 0,
    arrayOnlyUnknownProfileUsers: 0,
    affectedUsers: 0,
    claimsPlanned: 0,
    claimUsers: 0,
    claimsByReason: {},
    claimsCoveredByBirthRow: 0,
    claimsDeduplicated: 0,
    claimsSkippedHeldOrder: 0,
  };

  const groups = new Map();
  const excludes = [];
  const excludedUserIds = new Set();
  const affectedUserIds = new Set();
  // 배열에만 남은 구매를 세려면 "어떤 원천이든 이 사용자·키를 덮었는가"를 알아야 한다.
  const coveredUserFeatures = new Set();
  // 표시만 하고 옮기지 못한 원천 — 프로필 선택 지급(BirthScopeLegacyClaim) 후보다.
  const claimCandidates = [];
  const heldOrders = new Set();

  function targetFor(source) {
    // V2 가 한동안 serviceKey=featureKey 로 쓴 행은 정본 serviceKey 로 접는다(리더가 그 값으로만 찾는다).
    const sourceServiceKey = clean(source.serviceKey, 80);
    return resolvePaidContentUnlockTarget({
      userId: clean(source.userId, 120),
      featureKey: source.featureKey,
      serviceKey: sourceServiceKey && sourceServiceKey !== source.featureKey ? sourceServiceKey : "",
      contentKey: source.contentKey,
    });
  }

  function exclude(row, reason) {
    stats.excludedByReason[reason] += 1;
    affectedUserIds.add(clean(row.userId, 120));
    claimCandidates.push({ source: row, reason });
    // 증거(Payment/PointHistory)는 표시할 엔타이틀먼트 행이 없다 — 숫자만 센다.
    if (!row._id) return;
    excludes.push({ _id: clean(row._id, 64), userId: clean(row.userId, 120), reason });
    excludedUserIds.add(clean(row.userId, 120));
  }

  function addSource(source) {
    const userId = clean(source.userId, 120);
    const featureKey = source.featureKey;
    coveredUserFeatures.add(`${userId}\u0000${featureKey}`);
    stats.birthScopedSources += 1;

    if (featureKey === "section_compat") {
      // 기존 궁합 행에는 상대 프로필이 없다 — 상대 birthKey 를 만들 수 없다.
      exclude(source, EXCLUDE_REASONS.COMPAT_PARTNER_UNKNOWN);
      return;
    }
    const purchaseProfileId = source.purchaseProfileId;
    if (!purchaseProfileId) {
      exclude(source, EXCLUDE_REASONS.UNKNOWN_PURCHASE_PROFILE);
      return;
    }
    const card = profileByKey.get(profileMapKey(userId, purchaseProfileId));
    if (!card) {
      stats.deletedProfileSources += 1;
      exclude(source, EXCLUDE_REASONS.PROFILE_DELETED);
      return;
    }
    const birthKey = computeBirthKey(card);
    const birthProfileId = toBirthEntitlementProfileId(birthKey);
    if (!birthProfileId) {
      exclude(source, EXCLUDE_REASONS.INCOMPLETE_BIRTH);
      return;
    }

    const target = targetFor(source);
    const groupKey = [userId, birthKey, target.serviceKey, target.contentKey].join("\u0000");
    const at = toDate(source.at) || now;
    let group = groups.get(groupKey);
    if (!group) {
      group = {
        filter: {
          userId,
          profileId: birthProfileId,
          serviceKey: target.serviceKey,
          contentKey: target.contentKey,
          scope: BIRTH_ENTITLEMENT_SCOPE,
        },
        doc: {
          userId,
          profileId: birthProfileId,
          scope: BIRTH_ENTITLEMENT_SCOPE,
          featureKey: target.featureKey,
          serviceKey: target.serviceKey,
          contentKey: target.contentKey,
          status: "ACTIVE",
          source: "BACKFILL",
          grantType: "permanent_unlock",
          evidenceId: clean(source.orderId, 180),
          orderId: clean(source.orderId, 160),
          birthKey,
          purchaseProfileId,
          unlockedAt: at,
          grantedAt: at,
          expiresAt: null,
        },
        sourceEntitlementIds: new Set(),
        mergedOrderIds: new Set(),
        purchaseProfileIds: new Set(),
        sources: 0,
      };
      groups.set(groupKey, group);
    }
    group.sources += 1;
    group.doc.unlockedAt = minDate(group.doc.unlockedAt, at);
    group.doc.grantedAt = group.doc.unlockedAt;
    if (source._id) group.sourceEntitlementIds.add(clean(source._id, 64));
    if (source.orderId) group.mergedOrderIds.add(clean(source.orderId, 160));
    group.purchaseProfileIds.add(purchaseProfileId);
    affectedUserIds.add(userId);
  }

  for (const row of entitlements) {
    if (clean(row?.scope, 20) === BIRTH_ENTITLEMENT_SCOPE) {
      stats.existingBirthRows += 1;
      continue;
    }
    if (!isActive(row, now)) {
      stats.inactiveRows += 1;
      continue;
    }
    const featureKey = rowFeatureKey(row);
    if (!isBirthScopedUnlockFeatureKey(featureKey)) {
      stats.accountScopedRows += 1;
      continue;
    }
    addSource({
      _id: row._id,
      userId: row.userId,
      featureKey,
      serviceKey: row.serviceKey,
      contentKey: row.contentKey || row.contentId,
      orderId: clean(row.orderId) || clean(row.paymentId) || clean(row.evidenceId),
      purchaseProfileId: isUserScopedRow(row) ? clean(row.evidenceProfileId, 80) : clean(row.profileId, 80),
      at: row.grantedAt || row.unlockedAt || row.createdAt,
      sourceKind: "entitlement",
      sourceId: clean(row._id, 64),
      paymentId: clean(row.paymentId),
      priceKRW: row.amountKRW,
      priceCoins: row.coinAmount || row.coinPrice,
    });
  }

  for (const item of evidence) {
    const featureKey = canonicalBirthFeatureKey(item?.featureKey);
    if (!featureKey) continue;
    // P0-1 프로필 선택 대기·지급 주문은 그 목록(birth-profile-claim.js)이 다룬다. 출처로 쓰지 않고
    // 덮인 것으로만 센다 — 같은 구매가 두 목록에 떠 생년월일 두 개로 열리는 일을 막는다.
    if (item.heldForProfileClaim) {
      coveredUserFeatures.add(`${clean(item.userId, 120)}\u0000${featureKey}`);
      if (clean(item.orderId)) heldOrders.add(`${clean(item.userId, 120)}\u0000${clean(item.orderId, 160)}`);
      stats.claimsSkippedHeldOrder += 1;
      continue;
    }
    addSource({
      userId: item.userId,
      featureKey,
      serviceKey: item.serviceKey,
      contentKey: item.contentKey,
      orderId: clean(item.orderId),
      purchaseProfileId: clean(item.profileId, 80),
      at: item.at,
      sourceKind: item.sourceKind,
      sourceId: clean(item.sourceId, 180) || clean(item.orderId),
      paymentId: clean(item.paymentId),
      priceKRW: item.priceKRW,
      priceCoins: item.priceCoins,
    });
  }

  const arrayOnlyUsers = new Set();
  for (const user of users) {
    const userId = clean(user?._id, 120);
    const keys = new Set(
      [...(user?.unlockedFeatures || []), ...(user?.paidFeatures || [])]
        .map((key) => canonicalBirthFeatureKey(key))
        .filter(Boolean),
    );
    for (const key of keys) {
      if (coveredUserFeatures.has(`${userId}\u0000${key}`)) continue;
      stats.arrayOnlyUnknownProfileKeys += 1;
      claimCandidates.push({
        source: { userId, featureKey: key, sourceKind: "user_array", sourceId: key },
        reason: ARRAY_ONLY_CLAIM_REASON,
      });
      arrayOnlyUsers.add(userId);
      affectedUserIds.add(userId);
    }
  }

  const creates = [];
  for (const group of groups.values()) {
    if (group.sources > 1) {
      stats.mergedGroups += 1;
      stats.mergedSources += group.sources;
    }
    creates.push({
      filter: group.filter,
      doc: {
        ...group.doc,
        sourceEntitlementIds: Array.from(group.sourceEntitlementIds),
        mergedOrderIds: Array.from(group.mergedOrderIds),
      },
      purchaseProfileIds: Array.from(group.purchaseProfileIds),
    });
  }

  // 레거시 지급 대기. 같은 구매가 다른 원천으로 이미 BIRTH 행이 됐으면 빼고(주문 id),
  // 같은 주문이 USER 행과 결제 증거로 두 번 잡히면 한 건만 둔다(엔타이틀먼트가 먼저 들어온다).
  const coveredOrders = new Set();
  for (const group of groups.values()) {
    for (const orderId of group.mergedOrderIds) coveredOrders.add(`${group.filter.userId}\u0000${orderId}`);
  }
  const claims = [];
  const claimUsers = new Set();
  const seenClaims = new Set();
  for (const { source, reason } of claimCandidates) {
    const userId = clean(source.userId, 120);
    const orderId = clean(source.orderId, 160);
    const sourceKind = clean(source.sourceKind, 20) || "payment";
    const sourceId = clean(source.sourceId, 180) || orderId;
    if (!userId || !sourceId) continue;
    if (orderId && coveredOrders.has(`${userId}\u0000${orderId}`)) {
      stats.claimsCoveredByBirthRow += 1;
      continue;
    }
    if (orderId && heldOrders.has(`${userId}\u0000${orderId}`)) {
      stats.claimsSkippedHeldOrder += 1;
      continue;
    }
    const dedupeKey = orderId ? `${userId}\u0000order\u0000${orderId}` : `${userId}\u0000${sourceKind}\u0000${sourceId}`;
    if (seenClaims.has(dedupeKey)) {
      stats.claimsDeduplicated += 1;
      continue;
    }
    seenClaims.add(dedupeKey);
    const target = targetFor(source);
    claims.push({
      claimId: legacyClaimId(userId, sourceKind, sourceId),
      userId,
      sourceKind,
      sourceId,
      reason,
      featureKey: target.featureKey,
      serviceKey: target.serviceKey,
      contentKey: target.contentKey,
      orderId,
      paymentId: clean(source.paymentId, 160),
      priceKRW: Math.max(0, Math.floor(Number(source.priceKRW || 0))),
      priceCoins: Math.max(0, Math.floor(Number(source.priceCoins || 0))),
      paidAt: toDate(source.at),
    });
    claimUsers.add(userId);
    stats.claimsByReason[reason] = (stats.claimsByReason[reason] || 0) + 1;
  }

  stats.birthRowsPlanned = creates.length;
  stats.excludedRows = excludes.length;
  stats.excludedUsers = excludedUserIds.size;
  stats.arrayOnlyUnknownProfileUsers = arrayOnlyUsers.size;
  stats.affectedUsers = affectedUserIds.size;
  stats.claimsPlanned = claims.length;
  stats.claimUsers = claimUsers.size;
  return { creates, excludes, claims, stats };
}
