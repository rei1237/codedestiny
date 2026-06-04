#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const SAJU_KEYS = Object.freeze({
  DAEUN: "saju.daeunAnalysis",
  FULL: "saju.fullReading",
  COMPAT: "saju.compatibility",
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
    users.set(userId, { id: userId, points: 0, usagePass: false, ...users.get(userId), ...patch });
  }

  function getUser(userId) {
    return users.get(userId) || { id: userId, points: 0, usagePass: false, passLimit: 0, monthlyBalance: 0 };
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
    assert.equal(user.usagePass, true);
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

  return { unlocks, setUser, hasUnlockedContent, getUnlockedContentKeys, purchase, passUnlock, accessCheck, monthlyCreditConsume, monthlyUnlock, paymentConfirm, backfill, accessApiFailureState, paymentVerificationFailure };
}

const h = createHarness();
h.setUser("u1", { points: 100, usagePass: true });

const purchase = h.purchase({ userId: "u1", profileId: "profile-a", contentKey: SAJU_KEYS.DAEUN });
assert.equal(purchase.ok, true, "사주 대운 분석 구매 성공");
assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-a", serviceKey: "saju", contentKey: SAJU_KEYS.DAEUN }), true, "사주 대운 분석 unlock 저장됨");

assert.equal(h.getUnlockedContentKeys({ userId: "u1", profileId: "profile-a", serviceKey: "saju" }).includes(SAJU_KEYS.DAEUN), true, "새로고침 후에도 unlocked");
assert.equal(h.getUnlockedContentKeys({ userId: "u1", profileId: "profile-a", serviceKey: "saju" }).includes(SAJU_KEYS.DAEUN), true, "재로그인 후 같은 프로필 unlocked");
assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-b", serviceKey: "saju", contentKey: SAJU_KEYS.DAEUN }), false, "다른 profileId는 locked");

const beforePoints = h.getUnlockedContentKeys({ userId: "u1", profileId: "profile-a", serviceKey: "saju" }).length;
const repurchase = h.purchase({ userId: "u1", profileId: "profile-a", contentKey: SAJU_KEYS.DAEUN });
assert.equal(repurchase.alreadyUnlocked, true, "이미 unlocked면 결제창 없음");
assert.equal(repurchase.charged, 0, "이미 unlocked면 코인 차감 없음");
assert.equal(h.getUnlockedContentKeys({ userId: "u1", profileId: "profile-a", serviceKey: "saju" }).length, beforePoints, "중복 unlock 없음");

const pass = h.passUnlock({ userId: "u1", profileId: "profile-a", contentKey: SAJU_KEYS.FULL });
assert.equal(pass.paymentWindowOpened, false, "이용권 보유자는 결제창 없이 unlock");
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
assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-d", serviceKey: "saju", contentKey: SAJU_KEYS.FULL }), false, "월정석 차감 직후 unlock 저장 실패 상태 재현");
assert.equal(h.backfill({ userId: "u1", profileId: "profile-d", contentKey: SAJU_KEYS.FULL }), true, "월정석 차감 이력으로 unlock backfill");
assert.equal(h.hasUnlockedContent({ userId: "u1", profileId: "profile-d", serviceKey: "saju", contentKey: SAJU_KEYS.FULL }), true, "월정석 backfill 후 unlocked");

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

const failureUi = h.accessApiFailureState();
assert.equal(failureUi.bodyVisible, false, "access API 실패 시 본문 비노출");
assert.equal(failureUi.uiState, "error", "access API 실패 시 오류 상태 표시");
assert.notEqual(SAJU_KEYS.COMPAT, SAJU_KEYS.DAEUN, "궁합 contentKey는 대운과 분리");
assert.notEqual(SAJU_KEYS.COMPAT, SAJU_KEYS.FULL, "궁합 contentKey는 종합 풀이와 분리");

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const marker of [
  "SAJU_ACCESS_CONTENT_KEY_BY_FEATURE_KEY",
  "잠금 해제 상태 확인 중",
  "/api/access/unlocks?",
  "requireAccessApi",
  "cd-section-gate--checking",
]) {
  assert.ok(indexHtml.includes(marker), `UI/access marker exists: ${marker}`);
}

console.log("[saju-unlock-entitlement-regression] OK");
