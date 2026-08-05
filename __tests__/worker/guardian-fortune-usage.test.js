/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import {
  buildGuardianFortuneUsageStatus,
  buildGuardianFortuneLimitCta,
  commitGuardianFortuneUsage,
  createMemoryGuardianFortuneStore,
  getGuardianFortuneDateKey,
  GUARDIAN_FORTUNE_ERROR_CODES,
  hashGuardianFortuneGuestId,
  releaseGuardianFortuneUsage,
  reserveGuardianFortuneUsage,
} from "../../worker/lib/guardian-fortune-usage.js";

const NOW = new Date("2026-08-02T03:00:00.000Z");
const DATE_KEY = "2026-08-02";

describe("Guardian Fortune usage service", () => {
  it("creates a KST date key across the UTC boundary", () => {
    expect(getGuardianFortuneDateKey(new Date("2026-08-01T14:59:00.000Z"))).toBe("2026-08-01");
    expect(getGuardianFortuneDateKey(new Date("2026-08-01T15:00:00.000Z"))).toBe("2026-08-02");
    expect(getGuardianFortuneDateKey(new Date("2026-08-02T14:59:00.000Z"))).toBe("2026-08-02");
    expect(getGuardianFortuneDateKey(new Date("2026-08-02T15:00:00.000Z"))).toBe("2026-08-03");
  });

  it("hashes guest IDs even when no worker secret is configured", async () => {
    const guestId = "123e4567-e89b-12d3-a456-426614174000";
    const first = await hashGuardianFortuneGuestId(guestId, { env: {} });
    const second = await hashGuardianFortuneGuestId(guestId, { env: {} });
    const different = await hashGuardianFortuneGuestId("123e4567-e89b-12d3-a456-426614174001", { env: {} });
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
    expect(different).not.toBe(first);
  });

  it("allows one guest reservation and does not allow the second", async () => {
    const store = createMemoryGuardianFortuneStore();
    const first = await reserveGuardianFortuneUsage({ guestIdHash: "guest-hash-0001", dateKey: DATE_KEY, requestId: "guest-request-1", store, now: NOW });
    expect(first).toMatchObject({ ok: true, source: "guest_free" });
    await commitGuardianFortuneUsage(first, { store, now: NOW });

    const status = await buildGuardianFortuneUsageStatus({ guestIdHash: "guest-hash-0001", dateKey: DATE_KEY, store, now: NOW });
    expect(status).toMatchObject({ guestFreeUsed: 1, guestFreeRemaining: 0, canGenerate: false, nextAction: "login" });

    const second = await reserveGuardianFortuneUsage({ guestIdHash: "guest-hash-0001", dateKey: DATE_KEY, requestId: "guest-request-2", store, now: NOW });
    expect(second).toMatchObject({ ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.GUEST_LIMIT_EXCEEDED, status: 429 });
  });

  it("allows exactly three account reservations and never resets at KST midnight", async () => {
    const store = createMemoryGuardianFortuneStore();
    for (let index = 0; index < 3; index += 1) {
      const reservation = await reserveGuardianFortuneUsage({ userId: "user-1", dateKey: DATE_KEY, requestId: `daily-request-${index}`, store, now: NOW });
      expect(reservation).toMatchObject({ ok: true, source: "daily_free" });
      await commitGuardianFortuneUsage(reservation, { store, now: NOW });
    }
    const blocked = await reserveGuardianFortuneUsage({ userId: "user-1", dateKey: DATE_KEY, requestId: "daily-request-4", store, now: NOW });
    expect(blocked).toMatchObject({ ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.NO_CREDITS });

    const nextDay = await reserveGuardianFortuneUsage({ userId: "user-1", dateKey: "2026-08-03", requestId: "daily-request-next", store, now: new Date("2026-08-02T15:00:00.000Z") });
    expect(nextDay).toMatchObject({ ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.NO_CREDITS });
  });

  it("uses paid credit only after the daily free quota is exhausted", async () => {
    const store = createMemoryGuardianFortuneStore({
      daily: {
        [`user-2:${DATE_KEY}`]: { userId: "user-2", dateKey: DATE_KEY, freeLimit: 3, freeUsed: 3, reserved: 0 },
      },
      credits: {
        "user-2": { userId: "user-2", remaining: 2, reserved: 0, purchasedTotal: 2, usedTotal: 0, refundedTotal: 0 },
      },
    });
    const reservation = await reserveGuardianFortuneUsage({ userId: "user-2", dateKey: DATE_KEY, requestId: "credit-request-1", store, now: NOW });
    expect(reservation).toMatchObject({ ok: true, source: "paid_credit" });
    await commitGuardianFortuneUsage(reservation, { store, now: NOW });
    const status = await buildGuardianFortuneUsageStatus({ userId: "user-2", dateKey: DATE_KEY, store, now: NOW });
    expect(status).toMatchObject({ dailyFreeRemaining: 0, paidCreditsRemaining: 1, generationSource: "paid_credit" });
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0]).toMatchObject({ type: "use", amount: -1 });
    expect(store.transactions.some((item) => ["purchase", "refund"].includes(item.type))).toBe(false);
  });

  it("prevents concurrent requests from exceeding daily or credit limits", async () => {
    const dailyStore = createMemoryGuardianFortuneStore();
    const dailyResults = await Promise.all(Array.from({ length: 8 }, (_, index) => reserveGuardianFortuneUsage({
      userId: "user-concurrent",
      dateKey: DATE_KEY,
      requestId: `concurrent-daily-${index}`,
      store: dailyStore,
      now: NOW,
    })));
    expect(dailyResults.filter((item) => item.ok)).toHaveLength(3);

    const creditStore = createMemoryGuardianFortuneStore({
      daily: { [`user-credit:${DATE_KEY}`]: { userId: "user-credit", dateKey: DATE_KEY, freeLimit: 3, freeUsed: 3, reserved: 0 } },
      credits: { "user-credit": { userId: "user-credit", remaining: 1, reserved: 0, purchasedTotal: 1, usedTotal: 0 } },
    });
    const creditResults = await Promise.all(Array.from({ length: 5 }, (_, index) => reserveGuardianFortuneUsage({
      userId: "user-credit",
      dateKey: DATE_KEY,
      requestId: `concurrent-credit-${index}`,
      store: creditStore,
      now: NOW,
    })));
    expect(creditResults.filter((item) => item.ok)).toHaveLength(1);
  });

  it("releases a failed reservation without consuming it", async () => {
    const store = createMemoryGuardianFortuneStore();
    const reservation = await reserveGuardianFortuneUsage({ userId: "user-release", dateKey: DATE_KEY, requestId: "release-request-1", store, now: NOW });
    await releaseGuardianFortuneUsage(reservation, { store, errorCode: "TEST_FAILURE", now: NOW });
    const status = await buildGuardianFortuneUsageStatus({ userId: "user-release", dateKey: DATE_KEY, store, now: NOW });
    expect(status).toMatchObject({ dailyFreeUsed: 0, dailyFreeRemaining: 3, canGenerate: true });
    expect(store.state.daily.get("user-release")).toMatchObject({ reserved: 0, freeUsed: 0 });
  });

  it("blocks duplicate request IDs before a second reservation", async () => {
    const store = createMemoryGuardianFortuneStore();
    const first = await reserveGuardianFortuneUsage({ userId: "user-idempotent", dateKey: DATE_KEY, requestId: "same-request-1", store, now: NOW });
    const duplicate = await reserveGuardianFortuneUsage({ userId: "user-idempotent", dateKey: DATE_KEY, requestId: "same-request-1", store, now: NOW });
    expect(first.ok).toBe(true);
    expect(duplicate).toMatchObject({ ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS, status: 409 });
    await releaseGuardianFortuneUsage(first, { store, now: NOW });
  });

  it("returns the live conversation-credit CTA after the free quota is exhausted", () => {
    const cta = buildGuardianFortuneLimitCta(GUARDIAN_FORTUNE_ERROR_CODES.NO_CREDITS, true);
    expect(cta).toMatchObject({ label: "대화권 보기", targetPath: "/points" });
    expect(cta.reason).toContain("보유 대화권");
    expect(cta.reason).not.toContain("후속 단계");
  });
});
