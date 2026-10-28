/**
 * 대운·종합 사주를 결제했는데 해금 행이 없는 고객(2026-06 프로필 단위 전환 전 코인 차감 등)의 **순수 복구 계획기**.
 * 실행 스크립트: scripts/migrations/20261011-backfill-legacy-saju-profile-unlocks.mjs
 *
 * 입력
 *  - evidence:     환불되지 않은 결제 증거 { userId, featureKey(정본), profileId, orderId, sourceKind, sourceId, at, priceCoins, priceKRW }
 *  - entitlements: 같은 키의 ContentEntitlement 행. 2026-06 무렵 행은 featureKey 없이 contentKey 만 있다.
 *  - profiles:     살아 있는 ProfileCard { userId, profileId }
 *
 * 대상 프로필(확실한 경우만)
 *  (a) 증거의 profileId 가 살아 있는 본인 카드면 그 카드
 *  (b) 본인 카드가 정확히 1개면 그 카드
 *  그 밖(카드 0개·여러 개)은 REPORT_ONLY — 쓰지 않는다(출생 기반 승격 후 프로필 선택 지급으로 넘어간다).
 *
 * 건너뛰기
 *  - 같은 키의 ACTIVE USER 행이 있으면 이미 계정 전체에서 열린다.
 *  - 증거의 주문 id 가 이미 어떤 ACTIVE 행에 기록돼 있으면 그 행이 이 구매다.
 *  - 대상 카드에 같은 키의 ACTIVE PROFILE 행이 있으면 이미 열린다.
 */
import { createHash } from "node:crypto";
import {
  resolvePaidContentUnlockTarget,
  resolveUnlockedFeatureKeyFromContentKey,
  USER_SCOPE_PROFILE_ID,
} from "../../worker/lib/content-unlocks.js";

export const LEGACY_SAJU_FEATURE_KEYS = Object.freeze(["section_daewun", "section_summary"]);

export const TARGET_RULES = Object.freeze({
  EVIDENCE_PROFILE: "evidence_profile",
  SINGLE_CARD: "single_card",
  REPORT_ONLY: "report_only",
});

export const SKIP_REASONS = Object.freeze({
  ACCOUNT_ROW: "account_row",
  ORDER_RECORDED: "order_recorded",
  PROFILE_ROW: "profile_row",
  DUPLICATE_EVIDENCE: "duplicate_evidence",
});

function clean(value, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActive(row, now) {
  if (clean(row?.status, 20).toUpperCase() !== "ACTIVE") return false;
  const expiresAt = toDate(row?.expiresAt);
  return !expiresAt || expiresAt > now;
}

// featureKey 가 없는 옛 행은 contentKey 로 키를 정한다(운영 리더와 같은 규칙).
function rowFeatureKey(row) {
  return clean(row?.featureKey, 80) || resolveUnlockedFeatureKeyFromContentKey(row?.contentKey);
}

function isAccountRow(row) {
  return clean(row?.scope, 20) === "USER" || clean(row?.profileId, 100) === USER_SCOPE_PROFILE_ID;
}

export function hashUserId(userId) {
  return createHash("sha256").update(clean(userId, 120)).digest("hex").slice(0, 12);
}

/** 대상 카드를 고른다. cardProfileIds 는 그 사용자의 살아 있는 카드 profileId 목록이다. */
export function selectLegacyProfileTarget({ evidenceProfileId = "", cardProfileIds = [] } = {}) {
  const cards = Array.from(new Set(cardProfileIds.map((id) => clean(id, 80)).filter(Boolean)));
  const fromEvidence = clean(evidenceProfileId, 80);
  if (fromEvidence && fromEvidence !== USER_SCOPE_PROFILE_ID && cards.includes(fromEvidence)) {
    return { rule: TARGET_RULES.EVIDENCE_PROFILE, profileId: fromEvidence };
  }
  if (cards.length === 1) return { rule: TARGET_RULES.SINGLE_CARD, profileId: cards[0] };
  return { rule: TARGET_RULES.REPORT_ONLY, profileId: "", cardCount: cards.length };
}

export function planLegacySajuProfileUnlocks({ evidence = [], entitlements = [], profiles = [], now = new Date() } = {}) {
  const cardsByUser = new Map();
  for (const card of profiles) {
    const userId = clean(card?.userId, 120);
    if (!userId) continue;
    if (!cardsByUser.has(userId)) cardsByUser.set(userId, []);
    cardsByUser.get(userId).push(clean(card?.profileId, 80));
  }

  const accountRows = new Set();
  const profileRows = new Set();
  const recordedOrders = new Set();
  for (const row of entitlements) {
    if (!isActive(row, now)) continue;
    const userId = clean(row?.userId, 120);
    const featureKey = rowFeatureKey(row);
    if (isAccountRow(row)) accountRows.add(`${userId}\u0000${featureKey}`);
    else profileRows.add(`${userId}\u0000${clean(row?.profileId, 100)}\u0000${featureKey}`);
    for (const id of [row?.orderId, row?.paymentId, row?.evidenceId].map((value) => clean(value, 180)).filter(Boolean)) {
      recordedOrders.add(`${userId}\u0000${featureKey}\u0000${id}`);
    }
  }

  const stats = {
    scannedEvidence: evidence.length,
    writes: 0,
    reportOnly: 0,
    byRule: Object.fromEntries(Object.values(TARGET_RULES).map((rule) => [rule, 0])),
    skipped: Object.fromEntries(Object.values(SKIP_REASONS).map((reason) => [reason, 0])),
  };
  const writes = [];
  const reportOnly = [];
  const planned = new Set();
  const ordered = [...evidence].sort((a, b) => (toDate(a?.at)?.getTime() || 0) - (toDate(b?.at)?.getTime() || 0));

  for (const item of ordered) {
    const userId = clean(item?.userId, 120);
    const featureKey = clean(item?.featureKey, 80);
    if (!userId || !LEGACY_SAJU_FEATURE_KEYS.includes(featureKey)) continue;
    const orderId = clean(item?.orderId, 160);
    if (accountRows.has(`${userId}\u0000${featureKey}`)) {
      stats.skipped[SKIP_REASONS.ACCOUNT_ROW] += 1;
      continue;
    }
    if (orderId && recordedOrders.has(`${userId}\u0000${featureKey}\u0000${orderId}`)) {
      stats.skipped[SKIP_REASONS.ORDER_RECORDED] += 1;
      continue;
    }
    const target = selectLegacyProfileTarget({
      evidenceProfileId: item?.profileId,
      cardProfileIds: cardsByUser.get(userId) || [],
    });
    stats.byRule[target.rule] += 1;
    if (target.rule === TARGET_RULES.REPORT_ONLY) {
      stats.reportOnly += 1;
      reportOnly.push({ userId, featureKey, orderId, cardCount: target.cardCount, sourceKind: clean(item?.sourceKind, 20) });
      continue;
    }
    const identity = `${userId}\u0000${target.profileId}\u0000${featureKey}`;
    if (profileRows.has(identity)) {
      stats.skipped[SKIP_REASONS.PROFILE_ROW] += 1;
      continue;
    }
    if (planned.has(identity)) {
      stats.skipped[SKIP_REASONS.DUPLICATE_EVIDENCE] += 1;
      continue;
    }
    planned.add(identity);

    const unlock = resolvePaidContentUnlockTarget({ userId, featureKey });
    const at = toDate(item?.at) || now;
    const filter = {
      userId,
      profileId: target.profileId,
      serviceKey: unlock.serviceKey,
      contentKey: unlock.contentKey,
      scope: "PROFILE",
    };
    writes.push({
      rule: target.rule,
      filter,
      doc: {
        ...filter,
        featureKey: unlock.featureKey,
        status: "ACTIVE",
        source: "BACKFILL",
        grantType: "permanent_unlock",
        orderId,
        evidenceId: clean(item?.sourceId, 180) || orderId,
        coinAmount: Math.max(0, Math.floor(Number(item?.priceCoins || 0))),
        amountKRW: Math.max(0, Math.floor(Number(item?.priceKRW || 0))),
        unlockedAt: at,
        grantedAt: at,
        expiresAt: null,
      },
    });
  }
  stats.writes = writes.length;
  return { writes, reportOnly, stats };
}
