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
 */
import { computeBirthKey, toBirthEntitlementProfileId, BIRTH_ENTITLEMENT_SCOPE } from "../../worker/lib/birth-key.js";
import { isBirthScopedUnlockFeatureKey, normalizePaidFeatureKey } from "../../worker/lib/paid-feature-registry.js";
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

function rowFeatureKey(row) {
  const raw = clean(row?.featureKey) || resolveUnlockedFeatureKeyFromContentKey(row?.contentKey || row?.contentId);
  return normalizePaidFeatureKey(raw) || raw;
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
  };

  const groups = new Map();
  const excludes = [];
  const excludedUserIds = new Set();
  const affectedUserIds = new Set();
  // 배열에만 남은 구매를 세려면 "어떤 원천이든 이 사용자·키를 덮었는가"를 알아야 한다.
  const coveredUserFeatures = new Set();

  function exclude(row, reason) {
    stats.excludedByReason[reason] += 1;
    affectedUserIds.add(clean(row.userId, 120));
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

    // V2 가 한동안 serviceKey=featureKey 로 쓴 행은 정본 serviceKey 로 접는다(리더가 그 값으로만 찾는다).
    const sourceServiceKey = clean(source.serviceKey, 80);
    const target = resolvePaidContentUnlockTarget({
      userId,
      featureKey,
      serviceKey: sourceServiceKey && sourceServiceKey !== featureKey ? sourceServiceKey : "",
      contentKey: source.contentKey,
    });
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
    });
  }

  for (const item of evidence) {
    const raw = clean(item?.featureKey);
    const featureKey = normalizePaidFeatureKey(raw) || raw;
    if (!isBirthScopedUnlockFeatureKey(featureKey)) continue;
    addSource({
      userId: item.userId,
      featureKey,
      serviceKey: item.serviceKey,
      contentKey: item.contentKey,
      orderId: clean(item.orderId),
      purchaseProfileId: clean(item.profileId, 80),
      at: item.at,
    });
  }

  const arrayOnlyUsers = new Set();
  for (const user of users) {
    const userId = clean(user?._id, 120);
    const keys = new Set(
      [...(user?.unlockedFeatures || []), ...(user?.paidFeatures || [])]
        .map((key) => normalizePaidFeatureKey(clean(key)) || clean(key))
        .filter((key) => isBirthScopedUnlockFeatureKey(key)),
    );
    for (const key of keys) {
      if (coveredUserFeatures.has(`${userId}\u0000${key}`)) continue;
      stats.arrayOnlyUnknownProfileKeys += 1;
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

  stats.birthRowsPlanned = creates.length;
  stats.excludedRows = excludes.length;
  stats.excludedUsers = excludedUserIds.size;
  stats.arrayOnlyUnknownProfileUsers = arrayOnlyUsers.size;
  stats.affectedUsers = affectedUserIds.size;
  return { creates, excludes, stats };
}
