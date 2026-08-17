#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const SAJU_KEYS = Object.freeze({
  DAEUN: "saju.daeunAnalysis",
  FULL: "saju.fullReading",
  COMPAT: "saju.compatibility",
});

const SAJU_FEATURE_KEYS = Object.freeze({
  DAEUN: "section_daewun",
  FULL: "section_summary",
  COMPAT: "section_compat",
});

const SAJU_FEATURE_BY_CONTENT_KEY = Object.freeze({
  [SAJU_KEYS.DAEUN]: SAJU_FEATURE_KEYS.DAEUN,
  [SAJU_KEYS.FULL]: SAJU_FEATURE_KEYS.FULL,
  [SAJU_KEYS.COMPAT]: SAJU_FEATURE_KEYS.COMPAT,
});

const successStatuses = new Set(["success", "paid", "fulfilled"]);
const blockedStatuses = new Set(["failed", "cancelled", "refunded", "pending", "expired"]);

function keyOf({ userId, profileId, serviceKey, contentKey }) {
  return [userId, profileId, serviceKey, contentKey, "PROFILE"].join("::");
}

function createHarness() {
  const unlocks = new Map();
  const payments = [];
  const histories = [];
  const users = new Map();

  function setUser(userId, patch) {
    users.set(userId, { id: userId, points: 0, ...users.get(userId), ...patch });
  }

  function getUser(userId) {
    return users.get(userId) || { id: userId, points: 0, passLimit: 0, monthlyBalance: 0 };
  }

  function hasUnlockedContent(input) {
    const row = unlocks.get(keyOf(input));
    return Boolean(row && row.status === "ACTIVE" && (!row.expiresAt || row.expiresAt > new Date()));
  }

  function upsertContentUnlock(input) {
    const key = keyOf(input);
    const prev = unlocks.get(key);
    const row = {
      ...(prev || {}),
      ...input,
      scope: "PROFILE",
      status: "ACTIVE",
      unlockedAt: prev?.unlockedAt || input.unlockedAt || new Date(),
      expiresAt: input.expiresAt ?? null,
    };
    unlocks.set(key, row);
    return row;
  }

  function getUnlockedContentKeys({ userId, profileId, serviceKey }) {
    return Array.from(unlocks.values())
      .filter((row) => row.userId === userId && row.profileId === profileId && row.serviceKey === serviceKey && row.status === "ACTIVE")
      .map((row) => row.contentKey);
  }

  function purchase({ userId, profileId, contentKey, coinAmount = 50 }) {
    const target = { userId, profileId, serviceKey: "saju", contentKey };
    if (hasUnlockedContent(target)) {
      return { ok: true, alreadyUnlocked: true, charged: 0, paymentWindowOpened: false };
    }
    const user = getUser(userId);
    user.points -= coinAmount;
    setUser(userId, user);
    histories.push({ userId, profileId, contentKey, kind: "deduct", coinAmount, status: "success" });
    upsertContentUnlock({ ...target, source: "COIN", coinAmount });
    return { ok: true, charged: coinAmount, paymentWindowOpened: false };
  }

  function passUnlock({ userId, profileId, contentKey }) {
    const user = getUser(userId);
    upsertContentUnlock({ userId, profileId, serviceKey: "saju", contentKey, source: "PASS", passId: "pass-1" });
    return { ok: true, paymentWindowOpened: false };
  }

  function accessCheck({ userId, profileId, contentKey, priceCoin }) {
    const target = { userId, profileId, serviceKey: "saju", contentKey };
    if (hasUnlockedContent(target)) {
      return {
        accessGranted: true,
        reason: "already_unlocked",
        shouldOpenPaymentSelector: false,
        paymentUiOpened: false,
      };
    }
    const user = getUser(userId);
    if (Number(user.passLimit || 0) >= Number(priceCoin || 0)) {
      upsertContentUnlock({ ...target, source: "PASS", passId: "pass-covered", coinAmount: 0 });
      return {
        accessGranted: true,
        reason: "pass_covered",
        shouldOpenPaymentSelector: false,
        paymentUiOpened: false,
      };
    }
    return {
      accessGranted: false,
      reason: "payment_required",
      shouldOpenPaymentSelector: true,
      paymentUiOpened: true,
    };
  }

  function monthlyCreditConsume({ userId, profileId, contentKey, coinAmount = 50, monthlyAmountUsed = 500, transactionId = "monthly-1" }) {
    histories.push({
      userId,
      profileId,
      contentKey,
      kind: "deduct",
      coinAmount,
      monthlyAmountUsed,
      status: "success",
      metadata: {
        accessType: "membership_credit",
        accessMethod: "MONTHLY",
        paymentMethod: "MONTHLY",
        transactionId,
      },
    });
    return { ok: true, monthlyAmountUsed, transactionId };
  }

  function monthlyUnlock({ userId, profileId, contentKey, coinAmount = 50, transactionId = "monthly-unlock" }) {
    const requiredMonthly = coinAmount * 10;
    const user = getUser(userId);
    if (Number(user.monthlyBalance || 0) < requiredMonthly) {
      return { ok: false, code: "MONTHLY_BALANCE_REQUIRED", deducted: 0 };
    }
    user.monthlyBalance = Number(user.monthlyBalance || 0) - requiredMonthly;
    setUser(userId, user);
    monthlyCreditConsume({ userId, profileId, contentKey, coinAmount, monthlyAmountUsed: requiredMonthly, transactionId });
    upsertContentUnlock({ userId, profileId, serviceKey: "saju", contentKey, source: "COIN", paymentId: transactionId, coinAmount });
    return { ok: true, deducted: requiredMonthly, remaining: user.monthlyBalance };
  }

  function paymentConfirm({ userId, profileId, contentKey, paymentId, status = "success" }) {
    payments.push({ userId, profileId, contentKey, paymentId, status, paymentType: "digital_content" });
    if (successStatuses.has(status) && !blockedStatuses.has(status)) {
      upsertContentUnlock({ userId, profileId, serviceKey: "saju", contentKey, source: "PAYMENT", paymentId });
    }
  }

  function backfill({ userId, profileId, contentKey }) {
    const target = { userId, profileId, serviceKey: "saju", contentKey };
    if (hasUnlockedContent(target)) return false;
    const payment = payments.find((row) => (
      row.userId === userId
      && row.profileId === profileId
      && row.contentKey === contentKey
      && row.paymentType === "digital_content"
      && successStatuses.has(row.status)
      && !blockedStatuses.has(row.status)
    ));
    const history = histories.find((row) => (
      row.userId === userId
      && row.profileId === profileId
      && row.contentKey === contentKey
      && row.kind === "deduct"
      && row.status === "success"
    ));
    if (!payment && !history) return false;
    upsertContentUnlock({
      ...target,
      source: "BACKFILL",
      paymentId: payment?.paymentId || "",
      coinAmount: history?.coinAmount || 0,
    });
    return true;
  }

  function accessApiFailureState() {
    return { bodyVisible: false, uiState: "error" };
  }

  function paymentVerificationFailure({ userId, profileId, contentKey }) {
    return {
      ok: false,
      accessStillGranted: hasUnlockedContent({ userId, profileId, serviceKey: "saju", contentKey }),
      shouldOpenPaymentSelector: false,
    };
  }

  function stalePaymentRequiredDecision({ userId, profileId, contentKey }) {
    return {
      reason: "payment_required",
      accessStillGranted: hasUnlockedContent({ userId, profileId, serviceKey: "saju", contentKey }),
      shouldRemoveExistingUnlock: false,
      shouldOpenPaymentSelector: false,
    };
  }

  return { unlocks, setUser, hasUnlockedContent, getUnlockedContentKeys, purchase, passUnlock, accessCheck, monthlyCreditConsume, monthlyUnlock, paymentConfirm, backfill, accessApiFailureState, paymentVerificationFailure, stalePaymentRequiredDecision };
}

function createUiUnlockHoldHarness() {
  let now = 1000;
  const ttlMs = 15000;
  const unlocked = Object.create(null);
  const holds = Object.create(null);

  function holdKey(featureKey, profileId) {
    return `${featureKey}::${profileId}`;
  }

  function mapContentKey(contentKey) {
    return SAJU_FEATURE_BY_CONTENT_KEY[contentKey] || contentKey;
  }

  function markUnlocked(featureKey) {
    unlocked[featureKey] = true;
  }

  function beginHold(featureKey, profileId) {
    markUnlocked(featureKey);
    holds[holdKey(featureKey, profileId)] = { featureKey, profileId, expiresAt: now + ttlMs };
  }

  function clearHold(featureKey, profileId) {
    delete holds[holdKey(featureKey, profileId)];
  }

  function isHeld(featureKey, profileId) {
    const key = holdKey(featureKey, profileId);
    const hold = holds[key];
    if (!hold) return false;
    if (hold.expiresAt <= now) {
      delete holds[key];
      return false;
    }
    return true;
  }

  function setState(state, rawKey, value) {
    const key = mapContentKey(rawKey);
    if (key) state[key] = value === true;
  }

  function collectAccessUnlocks(state, accessPayload) {
    if (!accessPayload || typeof accessPayload !== "object") return;
    const unlockRows = accessPayload.unlocks && typeof accessPayload.unlocks === "object" ? accessPayload.unlocks : {};
    for (const [contentKey, row] of Object.entries(unlockRows)) {
      if (row && typeof row === "object" && Object.prototype.hasOwnProperty.call(row, "unlocked")) setState(state, contentKey, row.unlocked === true);
      else if (row === true || row === false) setState(state, contentKey, row === true);
    }
    for (const contentKey of Array.isArray(accessPayload.unlockedContentKeys) ? accessPayload.unlockedContentKeys : []) {
      setState(state, contentKey, true);
    }
  }

  function buildState(snapshot) {
    const state = Object.create(null);
    const data = snapshot?.data && typeof snapshot.data === "object" ? snapshot.data : snapshot || {};
    for (const featureKey of Array.isArray(data.unlockedFeatures) ? data.unlockedFeatures : []) setState(state, featureKey, true);
    if (data.unlockMap && typeof data.unlockMap === "object") {
      for (const [featureKey, value] of Object.entries(data.unlockMap)) {
        if (value === true || value === false) setState(state, featureKey, value === true);
      }
    }
    collectAccessUnlocks(state, data);
    collectAccessUnlocks(state, data.accessUnlocks);
    return state;
  }

  function reconcile(snapshot, profileId) {
    const state = buildState(snapshot);
    for (const [featureKey, shouldUnlock] of Object.entries(state)) {
      if (shouldUnlock) {
        markUnlocked(featureKey);
        clearHold(featureKey, profileId);
      } else if (unlocked[featureKey] === true) {
        if (isHeld(featureKey, profileId)) continue;
        delete unlocked[featureKey];
      }
    }
  }

  return {
    beginHold,
    markUnlocked,
    reconcile,
    advance(ms) {
      now += ms;
    },
    isUnlocked(featureKey) {
      return unlocked[featureKey] === true;
    },
    isHeld,
  };
}

const h = createHarness();
h.setUser("u1", { points: 100 });

const purchase = h.purchase({ userId: "u1", profileId: "profile-a", contentKey: SAJU_KEYS.DAEUN });
assert.equal(purchase.ok, true, "사주 대운 분석 구매 성공");
assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-a", serviceKey: "saju", contentKey: SAJU_KEYS.DAEUN }), true, "사주 대운 분석 unlock 저장됨");

assert.equal(h.getUnlockedContentKeys({ userId: "u1", profileId: "profile-a", serviceKey: "saju" }).includes(SAJU_KEYS.DAEUN), true, "새로고침 후에도 unlocked");
assert.equal(h.getUnlockedContentKeys({ userId: "u1", profileId: "profile-a", serviceKey: "saju" }).includes(SAJU_KEYS.DAEUN), true, "재로그인 후 같은 프로필 unlocked");
assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-b", serviceKey: "saju", contentKey: SAJU_KEYS.DAEUN }), false, "다른 profileId는 locked");

const pass = h.passUnlock({ userId: "u1", profileId: "profile-a", contentKey: SAJU_KEYS.FULL });
assert.equal(pass.paymentWindowOpened, false, "Pass unlock keeps payment selector closed");

const beforePoints = h.getUnlockedContentKeys({ userId: "u1", profileId: "profile-a", serviceKey: "saju" }).length;
const repurchase = h.purchase({ userId: "u1", profileId: "profile-a", contentKey: SAJU_KEYS.DAEUN });
assert.equal(repurchase.alreadyUnlocked, true, "이미 unlocked면 결제창 없음");
assert.equal(repurchase.charged, 0, "이미 unlocked면 추가 유료 처리 없음");
assert.equal(h.getUnlockedContentKeys({ userId: "u1", profileId: "profile-a", serviceKey: "saju" }).length, beforePoints, "중복 unlock 없음");

assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-a", serviceKey: "saju", contentKey: SAJU_KEYS.FULL }), true, "이용권 unlock 저장");

h.paymentConfirm({ userId: "u1", profileId: "profile-a", contentKey: SAJU_KEYS.COMPAT, paymentId: "pay-compat", status: "success" });
h.paymentConfirm({ userId: "u1", profileId: "profile-a", contentKey: SAJU_KEYS.COMPAT, paymentId: "pay-compat", status: "success" });
assert.equal(h.getUnlockedContentKeys({ userId: "u1", profileId: "profile-a", serviceKey: "saju" }).filter((key) => key === SAJU_KEYS.COMPAT).length, 1, "webhook/confirm 동시 호출에도 unlock 1개");

h.paymentConfirm({ userId: "u1", profileId: "profile-a", contentKey: "saju.refunded", paymentId: "pay-refund", status: "refunded" });
assert.equal(h.backfill({ userId: "u1", profileId: "profile-a", contentKey: "saju.refunded" }), false, "환불 상태는 backfill 불가");

h.paymentConfirm({ userId: "u1", profileId: "profile-c", contentKey: SAJU_KEYS.DAEUN, paymentId: "pay-old", status: "success" });
h.unlocks.delete(keyOf({ userId: "u1", profileId: "profile-c", serviceKey: "saju", contentKey: SAJU_KEYS.DAEUN }));
assert.equal(h.backfill({ userId: "u1", profileId: "profile-c", contentKey: SAJU_KEYS.DAEUN }), true, "기존 성공 결제 기록 backfill");
assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-c", serviceKey: "saju", contentKey: SAJU_KEYS.DAEUN }), true, "backfill 후 unlocked");

h.monthlyCreditConsume({ userId: "u1", profileId: "profile-d", contentKey: SAJU_KEYS.FULL, coinAmount: 50, monthlyAmountUsed: 500, transactionId: "monthly-full" });
assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-d", serviceKey: "saju", contentKey: SAJU_KEYS.FULL }), false, "이용권 혜택 처리 직후 unlock 저장 실패 상태 재현");
assert.equal(h.backfill({ userId: "u1", profileId: "profile-d", contentKey: SAJU_KEYS.FULL }), true, "이용권 혜택 처리 이력으로 unlock backfill");
assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-d", serviceKey: "saju", contentKey: SAJU_KEYS.FULL }), true, "이용권 혜택 backfill 후 unlocked");

const alreadyUnlockedAccess = h.accessCheck({ userId: "u1", profileId: "profile-a", contentKey: SAJU_KEYS.DAEUN, priceCoin: 50 });
assert.equal(alreadyUnlockedAccess.accessGranted, true, "phase10 already unlocked access granted");
assert.equal(alreadyUnlockedAccess.reason, "already_unlocked", "phase10 already unlocked reason");
assert.equal(alreadyUnlockedAccess.shouldOpenPaymentSelector, false, "phase10 already unlocked selector closed");
assert.equal(alreadyUnlockedAccess.paymentUiOpened, false, "phase10 already unlocked payment UI closed");

h.setUser("u-pass", { passLimit: 100, monthlyBalance: 0 });
const passCoveredAccess = h.accessCheck({ userId: "u-pass", profileId: "profile-pass", contentKey: SAJU_KEYS.FULL, priceCoin: 80 });
assert.equal(passCoveredAccess.accessGranted, true, "phase10 pass covered access granted");
assert.equal(passCoveredAccess.reason, "pass_covered", "phase10 pass covered reason");
assert.equal(passCoveredAccess.shouldOpenPaymentSelector, false, "phase10 pass covered selector closed");
assert.equal(h.hasUnlockedContent({ userId: "u-pass", profileId: "profile-pass", serviceKey: "saju", contentKey: SAJU_KEYS.FULL }), true, "phase10 pass covered saved unlock");

h.setUser("u-over", { passLimit: 30, monthlyBalance: 0 });
const passOverLimitAccess = h.accessCheck({ userId: "u-over", profileId: "profile-over", contentKey: SAJU_KEYS.COMPAT, priceCoin: 80 });
assert.equal(passOverLimitAccess.accessGranted, false, "phase10 over-limit pass denied");
assert.equal(passOverLimitAccess.reason, "payment_required", "phase10 over-limit pass payment required");
assert.equal(passOverLimitAccess.shouldOpenPaymentSelector, true, "phase10 over-limit pass selector opens only as required");

h.paymentConfirm({ userId: "u-pay", profileId: "profile-pay", contentKey: SAJU_KEYS.COMPAT, paymentId: "pay-phase10", status: "success" });
assert.equal(h.hasUnlockedContent({ userId: "u-pay", profileId: "profile-pay", serviceKey: "saju", contentKey: SAJU_KEYS.COMPAT }), true, "phase10 one-time payment saved unlock");
const paidReloadAccess = h.accessCheck({ userId: "u-pay", profileId: "profile-pay", contentKey: SAJU_KEYS.COMPAT, priceCoin: 80 });
assert.equal(paidReloadAccess.accessGranted, true, "phase10 one-time reload access granted");
assert.equal(paidReloadAccess.shouldOpenPaymentSelector, false, "phase10 one-time reload selector closed");

h.setUser("u-monthly", { monthlyBalance: 1000 });
const monthlyUnlock = h.monthlyUnlock({ userId: "u-monthly", profileId: "profile-monthly", contentKey: SAJU_KEYS.FULL, coinAmount: 80, transactionId: "monthly-phase10" });
assert.equal(monthlyUnlock.ok, true, "phase10 monthly unlock success");
assert.equal(monthlyUnlock.deducted, 800, "phase10 monthly cost is coin times ten");
assert.equal(monthlyUnlock.remaining, 200, "phase10 monthly balance deducted");
assert.equal(h.hasUnlockedContent({ userId: "u-monthly", profileId: "profile-monthly", serviceKey: "saju", contentKey: SAJU_KEYS.FULL }), true, "phase10 monthly saved unlock");
const monthlyReloadAccess = h.accessCheck({ userId: "u-monthly", profileId: "profile-monthly", contentKey: SAJU_KEYS.FULL, priceCoin: 80 });
assert.equal(monthlyReloadAccess.accessGranted, true, "phase10 monthly reload access granted");
assert.equal(monthlyReloadAccess.shouldOpenPaymentSelector, false, "phase10 monthly reload selector closed");

const paymentFailure = h.paymentVerificationFailure({ userId: "u-pay", profileId: "profile-pay", contentKey: SAJU_KEYS.COMPAT });
assert.equal(paymentFailure.ok, false, "phase10 payment verification failure reproduced");
assert.equal(paymentFailure.accessStillGranted, true, "phase10 payment failure keeps existing unlock");
assert.equal(paymentFailure.shouldOpenPaymentSelector, false, "phase10 payment failure does not relock selector");

const refreshRegression = h.accessCheck({ userId: "u-monthly", profileId: "profile-monthly", contentKey: SAJU_KEYS.FULL, priceCoin: 80 });
assert.equal(refreshRegression.accessGranted, true, "phase10 refresh uses server access");
assert.equal(refreshRegression.shouldOpenPaymentSelector, false, "phase10 refresh does not auto-open payment selector");

const stalePaymentRequired = h.stalePaymentRequiredDecision({ userId: "u-monthly", profileId: "profile-monthly", contentKey: SAJU_KEYS.FULL });
assert.equal(stalePaymentRequired.accessStillGranted, true, "phase10 stale payment_required keeps existing unlock");
assert.equal(stalePaymentRequired.shouldRemoveExistingUnlock, false, "phase10 stale payment_required does not remove unlock");
assert.equal(stalePaymentRequired.shouldOpenPaymentSelector, false, "phase10 stale payment_required does not auto-open selector");

const raceUi = createUiUnlockHoldHarness();
raceUi.beginHold(SAJU_FEATURE_KEYS.FULL, "profile-race");
raceUi.reconcile({
  profileId: "profile-race",
  unlockMap: { [SAJU_FEATURE_KEYS.FULL]: false },
  accessUnlocks: {
    profileId: "profile-race",
    unlocks: { [SAJU_KEYS.FULL]: { unlocked: false } },
  },
}, "profile-race");
assert.equal(raceUi.isUnlocked(SAJU_FEATURE_KEYS.FULL), true, "verified hold keeps section_summary unlocked through a false race snapshot");
assert.equal(raceUi.isHeld(SAJU_FEATURE_KEYS.FULL, "profile-race"), true, "verified hold remains active until server true");

const contentKeyUi = createUiUnlockHoldHarness();
contentKeyUi.reconcile({
  profileId: "profile-content",
  accessUnlocks: {
    profileId: "profile-content",
    unlockedContentKeys: [SAJU_KEYS.FULL],
    unlocks: { [SAJU_KEYS.FULL]: { unlocked: true } },
  },
}, "profile-content");
assert.equal(contentKeyUi.isUnlocked(SAJU_FEATURE_KEYS.FULL), true, "unlockedContentKeys maps saju.fullReading to section_summary");

raceUi.reconcile({
  profileId: "profile-race",
  unlockMap: { [SAJU_FEATURE_KEYS.FULL]: true },
  accessUnlocks: {
    profileId: "profile-race",
    unlockedContentKeys: [SAJU_KEYS.FULL],
    unlocks: { [SAJU_KEYS.FULL]: { unlocked: true } },
  },
}, "profile-race");
assert.equal(raceUi.isUnlocked(SAJU_FEATURE_KEYS.FULL), true, "server true keeps section_summary unlocked");
assert.equal(raceUi.isHeld(SAJU_FEATURE_KEYS.FULL, "profile-race"), false, "server true clears verified hold");

const staleUi = createUiUnlockHoldHarness();
staleUi.markUnlocked(SAJU_FEATURE_KEYS.FULL);
staleUi.reconcile({
  profileId: "profile-stale",
  unlockMap: { [SAJU_FEATURE_KEYS.FULL]: false },
  accessUnlocks: {
    profileId: "profile-stale",
    unlocks: { [SAJU_KEYS.FULL]: { unlocked: false } },
  },
}, "profile-stale");
assert.equal(staleUi.isUnlocked(SAJU_FEATURE_KEYS.FULL), false, "authoritative false relocks stale unlock without hold");

const mismatchedProfileUi = createUiUnlockHoldHarness();
mismatchedProfileUi.beginHold(SAJU_FEATURE_KEYS.FULL, "profile-paid");
mismatchedProfileUi.reconcile({
  profileId: "profile-other",
  unlockMap: { [SAJU_FEATURE_KEYS.FULL]: false },
  accessUnlocks: {
    profileId: "profile-other",
    unlocks: { [SAJU_KEYS.FULL]: { unlocked: false } },
  },
}, "profile-other");
assert.equal(mismatchedProfileUi.isUnlocked(SAJU_FEATURE_KEYS.FULL), false, "verified hold only protects matching profile false snapshots");

const expiredUi = createUiUnlockHoldHarness();
expiredUi.beginHold(SAJU_FEATURE_KEYS.FULL, "profile-expired");
expiredUi.advance(15001);
expiredUi.reconcile({
  profileId: "profile-expired",
  unlockMap: { [SAJU_FEATURE_KEYS.FULL]: false },
  accessUnlocks: {
    profileId: "profile-expired",
    unlocks: { [SAJU_KEYS.FULL]: { unlocked: false } },
  },
}, "profile-expired");
assert.equal(expiredUi.isUnlocked(SAJU_FEATURE_KEYS.FULL), false, "expired verified hold allows authoritative relock");

const failureUi = h.accessApiFailureState();
assert.equal(failureUi.bodyVisible, false, "access API 실패 시 본문 비노출");
assert.equal(failureUi.uiState, "error", "access API 실패 시 오류 상태 표시");
assert.notEqual(SAJU_KEYS.COMPAT, SAJU_KEYS.DAEUN, "궁합 contentKey는 대운과 분리");
assert.notEqual(SAJU_KEYS.COMPAT, SAJU_KEYS.FULL, "궁합 contentKey는 종합 풀이와 분리");

// --- 재잠김/이력유실 버그 회귀: destinyProfilesCurrentId CAS 가드 ---
// worker/routes/user.js·profile.js의 실제 로직을 그대로 미러링한다.
function resolveCasGuardedCurrentId({ storedCurrentId, validRequestedId, validStoredId, baseCurrentId }) {
  const isIntentionalSwitch = Boolean(validRequestedId) && validRequestedId !== validStoredId;
  const switchIsSafe = !storedCurrentId || baseCurrentId === storedCurrentId || storedCurrentId === validRequestedId;
  const currentIdChanged = isIntentionalSwitch && switchIsSafe;
  return {
    currentId: currentIdChanged ? validRequestedId : (validStoredId || validRequestedId || ""),
    accepted: currentIdChanged,
  };
}

const staleTabSwitch = resolveCasGuardedCurrentId({
  storedCurrentId: "profile-a",
  validStoredId: "profile-a",
  validRequestedId: "profile-b",
  baseCurrentId: "", // 스테일 탭은 서버의 최신 currentId를 모른다
});
assert.equal(staleTabSwitch.accepted, false, "스테일 탭의 currentId 전환은 거부된다");
assert.equal(staleTabSwitch.currentId, "profile-a", "스테일 탭 거부 시 서버 저장값 유지");

const freshTabSwitch = resolveCasGuardedCurrentId({
  storedCurrentId: "profile-a",
  validStoredId: "profile-a",
  validRequestedId: "profile-b",
  baseCurrentId: "profile-a", // 이 탭은 전환 직전 서버 최신값을 알고 있었다
});
assert.equal(freshTabSwitch.accepted, true, "최신 상태를 아는 탭의 전환은 수용된다");
assert.equal(freshTabSwitch.currentId, "profile-b", "정상 전환 시 요청된 프로필로 변경");

const firstEverSwitch = resolveCasGuardedCurrentId({
  storedCurrentId: "",
  validStoredId: "",
  validRequestedId: "profile-a",
  baseCurrentId: "",
});
assert.equal(firstEverSwitch.accepted, true, "최초 프로필 선택(저장값 없음)은 항상 수용된다");

// --- 재잠김/이력유실 버그 회귀: 교차 프로필 잠금 해제 누수 차단 ---
// worker/routes/billing.js resolveProfileScopedUnlocks의 실제 필터 로직을 그대로 미러링한다.
function isProfileScopedUnlockKeySim(key) {
  return Object.values(SAJU_FEATURE_KEYS).includes(key);
}
function resolveProfileScopedUnlocksSim({ accountFeatureKeys, legacyProfileKeys, entitlementFeatureKeys }) {
  return Array.from(new Set([
    ...accountFeatureKeys.filter((key) => !isProfileScopedUnlockKeySim(key)),
    ...legacyProfileKeys,
    ...entitlementFeatureKeys,
  ]));
}

const leakedAccountArray = [SAJU_FEATURE_KEYS.DAEUN]; // 프로필 A 구매가 계정 전역 배열에도 반영된 상태 시뮬레이션
const profileBResolved = resolveProfileScopedUnlocksSim({
  accountFeatureKeys: leakedAccountArray,
  legacyProfileKeys: [],
  entitlementFeatureKeys: [], // 프로필 B는 실제 entitlement 없음
});
assert.equal(profileBResolved.includes(SAJU_FEATURE_KEYS.DAEUN), false, "계정 전역 배열의 프로필 스코프 키는 다른 프로필로 새어나가지 않는다");

const accountWideResolved = resolveProfileScopedUnlocksSim({
  accountFeatureKeys: ["premiumDivinationPack"],
  legacyProfileKeys: [],
  entitlementFeatureKeys: [],
});
assert.equal(accountWideResolved.includes("premiumDivinationPack"), true, "계정 전역 스코프 키는 정상적으로 union된다");

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const marker of [
  "SAJU_ACCESS_CONTENT_KEY_BY_FEATURE_KEY",
  "잠금 해제 상태 확인 중",
  "결제 응답 자체가 권한 증거다.",
  "Payment Service가 사용자 흐름 밖 idle 시점에 사용자별 single-flight 동기화를 수행한다.",
  "SAJU_VERIFIED_UNLOCK_HOLD_TTL_MS = 15000",
  "sajuVerifiedUnlockHoldMap",
  "_cdBeginVerifiedSajuUnlockHold",
  "_cdIsVerifiedSajuUnlockHoldActive",
  "if (!profileId) return merged;",
  "verified-unlock-hold-skip-relock",
  "saju-verified-unlock-hold-v20260630-begin",
  "결제가 확인되었습니다. 콘텐츠 잠금 해제를 반영하는 중입니다.",
  "잠금 해제가 완료되었습니다.",
  "잠금 상태 다시 확인",
  "[Saju Unlock UI Refresh]",
  "window.refreshSajuEntitlements",
  "requireAccessApi",
  "cd-section-gate--checking",
  "__cdDirectPaymentChoiceConfirmed",
  "단건결제는 결제 방식 선택창에서 단건결제를 선택한 뒤에만 열 수 있습니다.",
  "var passMode = 'pass-store'",
  // 🔴 문구가 아니라 i18n 키를 단언한다. 예전에는 이용권 상점 카드의 한국어 문장 리터럴을 봤는데,
  // #124가 그 문장을 재작성하면서 이 가드가 깨졌고(UI는 오히려 상시 노출로 강화됨) 아무도 못 알아챘다.
  // 키는 문구가 바뀌어도 유지되므로 "이용권 상점 카드가 존재하는가"라는 원래 의도만 정확히 지킨다.
  "payment.directModal.passHint.store",
  "pass_store_opened",
]) {
  assert.ok(indexHtml.includes(marker), `UI/access marker exists: ${marker}`);
}
assert.ok(
  !indexHtml.includes("SAJU_UNLOCK_CONFIRM_DELAYS_MS"),
  "payment success must not schedule blocking entitlement GET retries",
);
assert.ok(
  !indexHtml.includes("/api/billing/saju-analysis/entitlements?"),
  "static shell must not call the legacy Saju entitlement endpoint directly",
);
assert.ok(
  !indexHtml.includes("/api/access/unlocks?"),
  "static shell must not own direct unlock requests",
);
const accessStoreSource = fs.readFileSync(path.join(root, "js/core/access-store.js"), "utf8");
assert.ok(
  accessStoreSource.includes("/api/me/access-state?profileId="),
  "AccessStore remains the single owner of complete unlock snapshot requests",
);
assert.ok(
  !accessStoreSource.includes("/api/access/unlocks?profileId="),
  "AccessStore must not issue profile unlock reads per surface",
);
assert.ok(!indexHtml.includes("이용권으로 사용"), "payment selector must not offer pass usage inside modal");

const billingSource = fs.readFileSync(path.join(root, "worker/routes/billing.js"), "utf8");
for (const marker of [
  "MISSING_PROFILE_ID",
  "const accessProfileId = cleanProfileId",
  "profileId: accessProfileId",
  "handleSajuAnalysisEntitlements",
  "SAJU_ANALYSIS_ENTITLEMENT_NO_STORE_HEADERS",
  "proxy-revalidate",
  "[Saju Unlock Entitlement]",
  "[Saju Payment Unlock Applied]",
]) {
  assert.ok(billingSource.includes(marker), `billing/access marker exists: ${marker}`);
}
assert.ok(
  billingSource.includes(".filter((key) => !isProfileScopedUnlockKey(key))"),
  "resolveProfileScopedUnlocks가 계정 전역 배열에서 프로필 스코프 키를 걸러낸다",
);

const fortuneSource = fs.readFileSync(path.join(root, "worker/routes/fortune.js"), "utf8");
// 🔴 지키려는 것은 "entitlement 조회가 재시도 안에서 돈다"이지 특정 호출 형태가 아니다.
// 2026-08-14 에 이 조회를 PointHistory 조회와 같은 슬롯에서 Promise.all 로 묶으면서 형태가 바뀌었다
// (왕복 1회·슬롯 1개 절약). 그래서 리터럴 문자열 대신 함수 본문을 잘라 재시도 포함 여부를 본다.
const persistedUnlockStart = fortuneSource.indexOf("async function resolvePersistedUnlockFeatures");
assert.ok(persistedUnlockStart >= 0, "resolvePersistedUnlockFeatures가 존재한다");
const persistedUnlockBody = fortuneSource.slice(
  persistedUnlockStart,
  fortuneSource.indexOf("\n}\n", persistedUnlockStart),
);
assert.ok(
  persistedUnlockBody.includes("getUnlockedContentSnapshot("),
  "resolvePersistedUnlockFeatures가 entitlement 스냅샷을 조회한다",
);
assert.ok(
  persistedUnlockBody.includes("withMongoRetry(env, () => Promise.all(["),
  "resolvePersistedUnlockFeatures가 entitlement 조회를 withMongoRetry 슬롯 안에서 낸다",
);
// 형태가 또 바뀌어도 "재시도 밖에서 직접 부르는" 회귀는 이 단언이 잡는다(옛 리터럴 단언은 못 잡았다).
assert.ok(
  !/await\s+getUnlockedContentSnapshot\(/.test(fortuneSource),
  "entitlement 조회를 withMongoRetry 밖에서 직접 await 하지 않는다",
);
assert.ok(
  !fortuneSource.includes("entitlementKeys = [];"),
  "일시적 Mongo 에러를 빈 배열(미구매)로 삼키던 코드가 제거되었다",
);
assert.ok(
  !/catch \(e\) \{\s*unlockedFeatures = \[\];\s*\}/.test(fortuneSource),
  "handleBalance가 더 이상 에러를 삼켜 unlockedFeatures를 빈 배열로 덮어쓰지 않는다",
);

const userRouteSource = fs.readFileSync(path.join(root, "worker/routes/user.js"), "utf8");
for (const marker of ["baseCurrentId", "switchIsSafe", "destinyProfilesCurrentIdUpdatedAt"]) {
  assert.ok(userRouteSource.includes(marker), `user.js CAS marker exists: ${marker}`);
}

const profileRouteSource = fs.readFileSync(path.join(root, "worker/routes/profile.js"), "utf8");
for (const marker of ["baseCurrentId", "staleSwitchIgnored", "switchIsSafe"]) {
  assert.ok(profileRouteSource.includes(marker), `profile.js CAS marker exists: ${marker}`);
}

const userSessionCacheSource = fs.readFileSync(path.join(root, "app/_lib/user-session-cache.ts"), "utf8");
assert.ok(userSessionCacheSource.includes("cacheGeneration"), "user-session-cache.ts에 generation 토큰 가드가 존재한다");

const billingClientSource = fs.readFileSync(path.join(root, "app/_lib/billing-client.ts"), "utf8");
assert.ok(billingClientSource.includes("billingBalanceRecentByUser"), "billing-client.ts의 balance 캐시가 유저별로 스코프된다");
assert.ok(billingClientSource.includes("cd:auth-changed"), "billing-client.ts가 로그인/로그아웃 시 balance 캐시를 무효화한다");

assert.ok(fs.existsSync(path.join(root, "app/_lib/use-content-unlock.ts")), "공용 useContentUnlock 훅 파일이 존재한다");

// 예전 계약은 "확정(ready) 상태에서만 미구매 리다이렉트를 판단한다" 였다. 2026-08-10 에
// 진입 리다이렉트 자체를 걷어내면서(셸의 openLoveSimulation 액션이 이 라우트로 되돌려 두
// 화면이 무한 왕복했다) 그 단언은 의미를 잃었다. 지금 지켜야 할 것은 더 강한 계약이다 —
// 진입에서는 아예 판단하지 않고, 결제는 실행 CTA 한 곳에서 공용 게이트로만 돈다.
const loveSimulationSource = fs.readFileSync(path.join(root, "app/saju/love-simulation/LoveSimulationClient.tsx"), "utf8");
assert.ok(
  !/window\.location\.replace|useContentUnlock/.test(loveSimulationSource),
  "LoveSimulationClient가 진입 시 해금을 검사하거나 리다이렉트하지 않는다(무한 왕복 재발 방지)",
);

const loveSimulationEngineSource = fs.readFileSync(path.join(root, "app/saju/love-simulation/_components/LoveSimulationEngine.tsx"), "utf8");
for (const marker of ["runPaidAccessGate", "openPaidFeatureGate", "LOVE_SIMULATION_FEATURE_KEY"]) {
  assert.ok(
    loveSimulationEngineSource.includes(marker),
    `러브 코드 결제가 실행 CTA 에서 공용 게이트로 돈다: ${marker}`,
  );
}

// ── 잠긴 프리미엄 섹션은 본문을 만들지 않는다 (2026-08-17) ──────────────────────
// 예전에는 renderSummary/renderDaewun 이 결제 여부와 무관하게 #summaryArea·#dwGrid 를 채우고
// CSS blur 만 씌웠다(index.html 의 .cd-section-gate__body filter:blur). 개발자도구로 그 클래스
// 하나만 지우면 5,000원짜리 종합 풀이(A4 20페이지)와 대운표가 그대로 읽혔다. 이제 잠긴 동안에는
// 렌더러가 DOM 을 만들지 않고, 해금 시 applySectionGates 가 한 번 만든다.
const sajuEngineSource = fs.readFileSync(path.join(root, "js/saju-engine.js"), "utf8");

assert.ok(
  /function _cdSajuGateUnlocked\(/.test(sajuEngineSource),
  "saju-engine 에 섹션 게이트 판정 헬퍼(_cdSajuGateUnlocked)가 있다",
);

// 호출부를 전수로 훑는다 — 새 호출부가 게이트 없이 추가되면 여기서 실패한다.
const summaryCallLines = sajuEngineSource
  .split("\n")
  .filter((line) => line.includes("renderSummary(") && !line.includes("function renderSummary("));
assert.ok(
  summaryCallLines.length > 0,
  "renderSummary 호출부를 하나도 찾지 못했다 — 마커가 바뀌었는지 확인할 것(검사 대상 0은 통과가 아니다)",
);
for (const line of summaryCallLines) {
  assert.ok(
    line.includes("_cdSajuGateUnlocked('section_summary')"),
    `renderSummary 는 section_summary 해금 뒤에서만 호출한다: ${line.trim()}`,
  );
}

// window.G_DAEWUN 은 시빌라·퀀텀 등 다른 기능이 소비하므로 게이트보다 먼저 채워야 한다.
const daewunGlobalAt = sajuEngineSource.indexOf("if(_dwGlobalArr.length>0)window.G_DAEWUN=_dwGlobalArr;");
const daewunGateAt = sajuEngineSource.indexOf("if(_cdSajuGateUnlocked('section_daewun')){");
assert.ok(daewunGlobalAt > 0 && daewunGateAt > 0, "대운 전역 기록과 게이트 마커가 둘 다 있다");
assert.ok(
  daewunGlobalAt < daewunGateAt,
  "window.G_DAEWUN 기록은 게이트 밖(앞)이어야 한다 — 잠금이 시빌라·퀀텀의 대운 소비를 끊으면 안 된다",
);
for (const guarded of [
  "if(_cdSajuGateUnlocked('section_daewun')){\n      document.getElementById('dwGrid').innerHTML=",
  "if(_cdSajuGateUnlocked('section_daewun')){\n      var grid=document.getElementById('dwGrid');",
]) {
  assert.ok(
    sajuEngineSource.includes(guarded),
    `대운표 DOM 기록이 section_daewun 게이트 안에 있다: ${guarded.split("\n")[1].trim()}`,
  );
}

// 잠긴 동안 본문이 만들어진 적이 없으므로, 해금은 클래스 토글만으로 끝나지 않는다.
for (const marker of [
  "window.__cdLastSummaryArgs={p:p,johu:johu,natal:natal};",
  "if(unlocked&&sg.unlockKey==='section_summary'",
  "if(unlocked&&sg.unlockKey==='section_daewun'",
]) {
  const source = marker.startsWith("window.__cdLastSummaryArgs") ? sajuEngineSource : indexHtml;
  assert.ok(source.includes(marker), `해금 시 본문 생성 배선 유지: ${marker}`);
}

console.log("[saju-unlock-entitlement-regression] OK");
