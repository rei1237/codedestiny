/** @jest-environment node */
import { describe, expect, it } from "@jest/globals";
import {
  FUSION_FORTUNE_TICKET_PRODUCT,
  assertFusionFortuneTicketPurchaseAllowed,
  buildFusionFortuneStatus,
  createMemoryFusionFortuneStore,
  generateFusionFortuneRequest,
  generateFusionFortuneWithMockLLM,
  getFusionFortuneDateKey,
  selectFusionFortuneTarotSpread,
  validateFusionFortuneResult,
} from "../../worker/lib/fusion-fortune.js";
import { buildFusionFortunePrompt } from "../../worker/lib/fusion-fortune-prompt.js";

const input = { birthDate: "1995-04-18", birthTime: "08:30", calendarType: "solar", gender: "female", topic: "삶의 전반적인 흐름", concern: "" };
const contextBuilder = async () => ({ ok: true, context: { birthTimeKnown: true } });
const ticketedStore = () => createMemoryFusionFortuneStore({ balances: { user: { totalRemaining: 1, purchasedTotal: 1, usedTotal: 0 } } });

describe("Fusion Fortune ticket policy and mock generation", () => {
  it("defines a 10,000 KRW PG-only ticket", () => {
    expect(FUSION_FORTUNE_TICKET_PRODUCT).toMatchObject({ productId: "fusion_fortune_ticket_1", productType: "fusion_fortune_ticket", priceKRW: 10000, ticketAmount: 1, allowedPurchaseChannels: ["pg"] });
    expect(assertFusionFortuneTicketPurchaseAllowed("pg").channel).toBe("pg");
    for (const channel of ["pass", "family_pass", "conversation_credit", "price_coverage", "monthly_entitlement", "entitlement", "fusion_fortune_ticket"]) expect(() => assertFusionFortuneTicketPurchaseAllowed(channel)).toThrow();
  });

  it("does not allow ordinary passes or entitlements to substitute a ticket", async () => {
    const store = createMemoryFusionFortuneStore({ balances: { user: { totalRemaining: 0, purchasedTotal: 0, usedTotal: 0 } } });
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "no-ticket", store, contextBuilder });
    expect(result).toMatchObject({ ok: false, error: "FUSION_FORTUNE_NO_TICKET" });
  });

  it("consumes exactly one ticket and one daily slot only after a valid result", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = ticketedStore();
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "success", dateKey, store, contextBuilder, generator: generateFusionFortuneWithMockLLM });
    expect(result.ok).toBe(true);
    expect((await store.getBalance("user")).totalRemaining).toBe(0);
    expect((await store.getDaily(dateKey)).successCount).toBe(1);
  });

  it.each([
    ["context", async () => ({ ok: false })],
    ["llm", async () => { throw new Error("mock llm failure"); }],
    ["validator", async () => ({ title: "too short" })],
  ])("does not consume a ticket or a daily slot after %s failure", async (_name, generatorOrContext) => {
    const store = ticketedStore();
    const args = _name === "context" ? { contextBuilder: generatorOrContext } : { contextBuilder, generator: generatorOrContext };
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: `failure-${_name}`, store, ...args });
    expect(result.ok).toBe(false);
    expect((await store.getBalance("user")).totalRemaining).toBe(1);
    expect((await store.getDaily(getFusionFortuneDateKey())).successCount).toBe(0);
  });

  it("fails closed at 100 daily results and reports sold out", async () => {
    const dateKey = getFusionFortuneDateKey();
    const store = createMemoryFusionFortuneStore({ balances: { user: { totalRemaining: 1 } }, daily: { [dateKey]: { dateKey, limit: 100, successCount: 100, reserved: 0 } } });
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "sold-out", store, contextBuilder });
    expect(result.error).toBe("FUSION_FORTUNE_SOLD_OUT");
    expect((await buildFusionFortuneStatus({ userId: "user", store })).dailyLimit.isSoldOut).toBe(true);
  });

  it("reserves at most one hundred concurrent successful attempts", async () => {
    const dateKey = getFusionFortuneDateKey();
    const balances = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`u${index}`, { totalRemaining: 1 }]));
    const store = createMemoryFusionFortuneStore({ balances });
    const reservations = await Promise.all(Array.from({ length: 101 }, (_, index) => store.reserve(`u${index}`, dateKey, `parallel-${index}`)));
    expect(reservations.filter((item) => item.ok)).toHaveLength(100);
    expect(reservations.filter((item) => item.errorCode === "FUSION_FORTUNE_SOLD_OUT")).toHaveLength(1);
  });

  it("keeps mock result inside section, privacy, safety, and 10k to 15k bounds", async () => {
    const result = await generateFusionFortuneWithMockLLM({ context: { birthTimeKnown: true } });
    const checked = validateFusionFortuneResult(result, { birthTimeKnown: true, sensitiveValues: [input.birthDate, input.birthTime, "비공개 고민" ] });
    expect(checked.ok).toBe(true);
    expect(checked.length).toBeGreaterThanOrEqual(10000);
    expect(checked.length).toBeLessThanOrEqual(15000);
    expect(validateFusionFortuneResult({ ...result, openingMessage: `${result.openingMessage} ${input.birthDate}` }, { sensitiveValues: [input.birthDate] }).ok).toBe(false);
  });

  it("builds a six-domain expert prompt without raw personal input", () => {
    const prompt = buildFusionFortunePrompt({ context: {
      birthTimeKnown: true,
      topic: "일과 돈",
      systems: { saju: { dayMaster: "server-value" }, ziwei: {}, vedic: {}, sukuyo: {}, astrology: {} },
      tarotSpread: { spreadType: "fusion_six_system_bridge", cards: [{ cardId: "major_01", position: "core" }] },
      integratedInsight: { coreTheme: "server-theme" },
      inputSummary: { calendarType: "solar", gender: "unspecified", topic: "일과 돈" },
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      concern: "비공개 고민",
    } });
    for (const domain of ["사주", "자미두수", "베다점", "숙요점", "서양 점성술", "타로"]) expect(prompt.userPrompt).toContain(domain);
    expect(prompt.systemPrompt).toContain("10,000자 이상 15,000자 이하");
    expect(prompt.userPrompt).not.toContain(input.birthDate);
    expect(prompt.userPrompt).not.toContain(input.birthTime);
    expect(prompt.userPrompt).not.toContain("비공개 고민");
  });

  it("rejects shallow sections even when the total shape exists", async () => {
    const result = await generateFusionFortuneWithMockLLM({ context: { birthTimeKnown: true } });
    const checked = validateFusionFortuneResult({ ...result, sajuSection: { ...result.sajuSection, content: "짧은 해석" } });
    expect(checked).toMatchObject({ ok: false, issues: ["section_depth"] });
  });

  it("selects a six-position tarot spread on the server and never accepts client card names", () => {
    const spread = selectFusionFortuneTarotSpread(input);
    expect(spread).toMatchObject({ spreadType: "fusion_six_system_bridge" });
    expect(spread.cards).toHaveLength(6);
    expect(spread.cards.every((card) => /^major_\d+$/.test(card.cardId))).toBe(true);
  });
});
