/** @jest-environment node */
/* 2026-10-11 이용권 기간 없음 — 한도 소진으로만 끝난다(profile-limits.js PASS_OPEN_ENDED_MS). */
import { jest } from "@jest/globals";
import {
  buildPassCycleFields,
  buildPassRefundRevokeFields,
  computePassExpiry,
  evaluatePassTierTransition,
  isOpenEndedPassExpiry,
  normalizeHoneyPassEntitlement,
} from "../../worker/lib/profile-limits.js";
import { CURRENT_PASS_POLICY_VERSION, currentPassPlan } from "../../lib/payment/pass-policy.js";

const DAY_MS = 86_400_000;
const now = new Date("2026-10-11T00:00:00Z");
const base = currentPassPlan("standard").monthlyLimitCoin;
const pass = (fields) => ({ tier: "standard", passTier: "standard", passPolicyVersion: CURRENT_PASS_POLICY_VERSION, ...fields });

function activate(prior, tier = "standard", at = now) {
  const transition = evaluatePassTierTransition(prior, tier, at);
  const expiresAt = computePassExpiry({ transition, paidAt: at, now: at });
  return { expiresAt, ...buildPassCycleFields({ priorSubscription: prior, tier, expiresAt, now: at, passPolicyVersion: CURRENT_PASS_POLICY_VERSION }) };
}

afterEach(() => jest.useRealTimers());

test("새 이용권은 30일·365일이 지나도 활성이다", () => {
  const { expiresAt } = activate({});
  expect(isOpenEndedPassExpiry(expiresAt, now)).toBe(true);
  for (const days of [31, 365]) {
    jest.useFakeTimers({ now: now.getTime() + days * DAY_MS });
    expect(normalizeHoneyPassEntitlement({ profileSubscription: pass({ expiresAt }) }).isActive).toBe(true);
  }
});

test("같은 등급 재구매는 만료일·사이클 키를 그대로 두고 한도를 더하며 사용액을 잇는다", () => {
  const first = activate({});
  const prior = pass({ expiresAt: first.expiresAt, premiumUseCycleKey: first.premiumUseCycleKey, monthlySpendCoin: 120, monthlyLimitCoin: base });
  const next = activate(prior);
  expect(next.expiresAt.getTime()).toBe(first.expiresAt.getTime());
  expect(next).toMatchObject({ premiumUseCycleKey: first.premiumUseCycleKey, monthlySpendCoin: 120, monthlyLimitCoin: base * 2 });
});

test("기간 있던 옛 이용권은 활성으로 읽히고, 재구매하면 기간 없는 이용권으로 바뀌며 사용액·한도를 잇는다", () => {
  const legacyExpiry = new Date(now.getTime() + 10 * DAY_MS);
  const prior = pass({ expiresAt: legacyExpiry, premiumUseCycleKey: legacyExpiry.toISOString(), monthlySpendCoin: 50 });
  jest.useFakeTimers({ now: now.getTime() });
  expect(normalizeHoneyPassEntitlement({ profileSubscription: prior }).isActive).toBe(true);
  const next = activate(prior);
  expect(isOpenEndedPassExpiry(next.expiresAt, now)).toBe(true);
  expect(next).toMatchObject({ monthlySpendCoin: 50, monthlyLimitCoin: base * 2 });
});

test("업그레이드는 새 이용권으로 시작하고 사용액을 잇는다", () => {
  const first = activate({});
  const prior = pass({ expiresAt: first.expiresAt, premiumUseCycleKey: first.premiumUseCycleKey, monthlySpendCoin: 150 });
  const next = activate(prior, "premium", new Date(now.getTime() + 60_000));
  expect(next.premiumUseCycleKey).not.toBe(first.premiumUseCycleKey);
  expect(next).toMatchObject({ monthlySpendCoin: 150, monthlyLimitCoin: currentPassPlan("premium").monthlyLimitCoin });
});

test("환불 회수는 그 주문의 한도만 빼고, 남은 한도로 열 수 있는 게 없으면 종료한다", () => {
  const { expiresAt, premiumUseCycleKey } = activate({});
  const stacked = (spend) => pass({ expiresAt, premiumUseCycleKey, monthlySpendCoin: spend, monthlyLimitCoin: base * 2 });
  expect(buildPassRefundRevokeFields({ subscription: stacked(50), now })).toEqual({ downgraded: false, fields: { monthlyLimitCoin: base, updatedAt: now } });
  expect(buildPassRefundRevokeFields({ subscription: stacked(base), now })).toMatchObject({ downgraded: true, fields: { tier: "free", expiresAt: now } });
  const single = pass({ expiresAt, premiumUseCycleKey, monthlySpendCoin: 0, monthlyLimitCoin: base });
  expect(buildPassRefundRevokeFields({ subscription: single, now })).toMatchObject({ downgraded: true, fields: { tier: "free", monthlyLimitCoin: 0 } });
});
