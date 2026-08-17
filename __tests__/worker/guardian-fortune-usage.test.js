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

// 무료 3회를 모두 쓴 계정. 이 지점부터는 회당 결제(fortune-chat-consultation)가 관문이다.
const exhaustedStore = (userId) => createMemoryGuardianFortuneStore({
  daily: { [`${userId}:${DATE_KEY}`]: { userId, dateKey: DATE_KEY, freeLimit: 3, freeUsed: 3, reserved: 0 } },
});
// 결제 증빙 판정은 라우트가 주입하는 콜백이 맡는다. 테스트는 그 콜백만 갈아끼운다.
const paidAccess = async () => ({ ok: true });
const degradedAccess = async () => ({ ok: false, degraded: true });

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

  // 무료 상담은 로그인해야 받는다(2026-08-17 정책). 비로그인은 0회다.
  it("gives guests no free reservation and sends them to login", async () => {
    const store = createMemoryGuardianFortuneStore();
    const first = await reserveGuardianFortuneUsage({ guestIdHash: "guest-hash-0001", dateKey: DATE_KEY, requestId: "guest-request-1", store, now: NOW });
    expect(first).toMatchObject({ ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.GUEST_LIMIT_EXCEEDED, status: 429 });

    const status = await buildGuardianFortuneUsageStatus({ guestIdHash: "guest-hash-0001", dateKey: DATE_KEY, store, now: NOW });
    expect(status).toMatchObject({ guestFreeUsed: 0, guestFreeRemaining: 0, canGenerate: false, nextAction: "login" });
  });

  it("allows exactly one account reservation and never resets at KST midnight", async () => {
    const store = createMemoryGuardianFortuneStore();
    for (let index = 0; index < 1; index += 1) {
      const reservation = await reserveGuardianFortuneUsage({ userId: "user-1", dateKey: DATE_KEY, requestId: `daily-request-${index}`, store, now: NOW });
      expect(reservation).toMatchObject({ ok: true, source: "daily_free" });
      await commitGuardianFortuneUsage(reservation, { store, now: NOW });
    }
    const blocked = await reserveGuardianFortuneUsage({ userId: "user-1", dateKey: DATE_KEY, requestId: "daily-request-2", store, now: NOW });
    expect(blocked).toMatchObject({ ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED });

    const nextDay = await reserveGuardianFortuneUsage({ userId: "user-1", dateKey: "2026-08-03", requestId: "daily-request-next", store, now: new Date("2026-08-02T15:00:00.000Z") });
    expect(nextDay).toMatchObject({ ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED });
  });

  it("falls through to per-use payment once the free quota is exhausted", async () => {
    const store = exhaustedStore("user-2");
    const reservation = await reserveGuardianFortuneUsage({ userId: "user-2", dateKey: DATE_KEY, requestId: "paid-request-1", store, resolvePaidAccess: paidAccess, now: NOW });
    // 결제분은 무료 카운터를 건드리지 않는다 — 그래서 source 가 daily_free 가 아니다.
    expect(reservation).toMatchObject({ ok: true, source: "paid" });
    await commitGuardianFortuneUsage(reservation, { store, now: NOW });
    const status = await buildGuardianFortuneUsageStatus({ userId: "user-2", dateKey: DATE_KEY, store, now: NOW });
    expect(status).toMatchObject({ dailyFreeRemaining: 0, generationSource: "paid", nextAction: "purchase", canGenerate: true });
  });

  it("answers an unverifiable payment with a retryable 503, never 402", async () => {
    // 402 로 내리면 이미 결제한 사용자가 결제창을 다시 보게 된다.
    const store = exhaustedStore("user-degraded");
    const reservation = await reserveGuardianFortuneUsage({ userId: "user-degraded", dateKey: DATE_KEY, requestId: "degraded-request", store, resolvePaidAccess: degradedAccess, now: NOW });
    expect(reservation).toMatchObject({ ok: false, status: 503, retryable: true, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_CHECK_DEGRADED });
  });

  it("treats a throwing payment check as unverifiable rather than unpaid", async () => {
    const store = exhaustedStore("user-throw");
    const reservation = await reserveGuardianFortuneUsage({ userId: "user-throw", dateKey: DATE_KEY, requestId: "throwing-request", store, resolvePaidAccess: async () => { throw new Error("mongo down"); }, now: NOW });
    expect(reservation).toMatchObject({ ok: false, status: 503, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_CHECK_DEGRADED });
  });

  it("lets a paid request retry on the same id after a failed generation", async () => {
    // 결제 증빙은 requestId 에 묶여 있다. 실패한 시도를 409 로 잠그면 이미 결제한 사용자가
    // 새 requestId 로도 증빙을 못 찾아 결과를 영원히 못 받는다.
    const store = exhaustedStore("user-retry");
    const first = await reserveGuardianFortuneUsage({ userId: "user-retry", dateKey: DATE_KEY, requestId: "retry-request", store, resolvePaidAccess: paidAccess, now: NOW });
    expect(first.ok).toBe(true);
    await releaseGuardianFortuneUsage(first, { store, errorCode: "GUARDIAN_FORTUNE_GENERATION_FAILED", now: NOW });

    const second = await reserveGuardianFortuneUsage({ userId: "user-retry", dateKey: DATE_KEY, requestId: "retry-request", store, resolvePaidAccess: paidAccess, now: NOW });
    expect(second).toMatchObject({ ok: true, source: "paid" });
  });

  it("lets a blocked request retry on the same id once the payment lands", async () => {
    const store = exhaustedStore("user-late-pay");
    const blocked = await reserveGuardianFortuneUsage({ userId: "user-late-pay", dateKey: DATE_KEY, requestId: "late-pay", store, resolvePaidAccess: async () => ({ ok: false }), now: NOW });
    expect(blocked).toMatchObject({ ok: false, status: 402 });

    const paid = await reserveGuardianFortuneUsage({ userId: "user-late-pay", dateKey: DATE_KEY, requestId: "late-pay", store, resolvePaidAccess: paidAccess, now: NOW });
    expect(paid).toMatchObject({ ok: true, source: "paid" });
  });

  it("still refuses to replay a completed request", async () => {
    // 끝난 상담을 같은 id 로 다시 돌리면 결제 1회로 결과가 여러 번 나온다.
    const store = exhaustedStore("user-done");
    const first = await reserveGuardianFortuneUsage({ userId: "user-done", dateKey: DATE_KEY, requestId: "done-request", store, resolvePaidAccess: paidAccess, now: NOW });
    await commitGuardianFortuneUsage(first, { store, now: NOW });

    const replay = await reserveGuardianFortuneUsage({ userId: "user-done", dateKey: DATE_KEY, requestId: "done-request", store, resolvePaidAccess: paidAccess, now: NOW });
    expect(replay).toMatchObject({ ok: false, status: 409, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS });
  });

  it("blocks a logged-in user with no payment proof at 402", async () => {
    const store = exhaustedStore("user-unpaid");
    const reservation = await reserveGuardianFortuneUsage({ userId: "user-unpaid", dateKey: DATE_KEY, requestId: "unpaid-request", store, resolvePaidAccess: async () => ({ ok: false }), now: NOW });
    expect(reservation).toMatchObject({ ok: false, status: 402, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED });
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
    expect(dailyResults.filter((item) => item.ok)).toHaveLength(1);

    // 결제 경로는 무료 자리를 잡지 않으므로 동시성 상한이 없다. 중복을 막는 것은 requestId
    // 멱등성뿐이라, 같은 requestId 를 동시에 세 번 보내도 하나만 통과해야 한다.
    const paidStore = exhaustedStore("user-paid");
    const sameRequest = await Promise.all(Array.from({ length: 3 }, () => reserveGuardianFortuneUsage({
      userId: "user-paid",
      dateKey: DATE_KEY,
      requestId: "concurrent-same-request",
      store: paidStore,
      resolvePaidAccess: paidAccess,
      now: NOW,
    })));
    expect(sameRequest.filter((item) => item.ok)).toHaveLength(1);
  });

  it("releases a failed reservation without consuming it", async () => {
    const store = createMemoryGuardianFortuneStore();
    const reservation = await reserveGuardianFortuneUsage({ userId: "user-release", dateKey: DATE_KEY, requestId: "release-request-1", store, now: NOW });
    await releaseGuardianFortuneUsage(reservation, { store, errorCode: "TEST_FAILURE", now: NOW });
    const status = await buildGuardianFortuneUsageStatus({ userId: "user-release", dateKey: DATE_KEY, store, now: NOW });
    expect(status).toMatchObject({ dailyFreeUsed: 0, dailyFreeRemaining: 1, canGenerate: true });
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

  it("hands the exhausted-quota CTA to the shared payment gate", () => {
    // /points 로 보내면 이용권 보유자가 결제창의 [이용권으로 구매] 카드를 만나지 못한다.
    const cta = buildGuardianFortuneLimitCta(GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED, true);
    expect(cta).toMatchObject({ featureKey: "fortune-chat-consultation" });
    expect(cta.targetPath).toBeUndefined();
    expect(cta.reason).not.toContain("대화권");
  });
});
