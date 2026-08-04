/** @jest-environment node */
import { describe, expect, it, jest } from "@jest/globals";
import {
  FUSION_FORTUNE_TICKET_PRODUCT,
  assertFusionFortuneTicketPurchaseAllowed,
  buildFusionFortuneContext,
  buildFusionFortuneStatus,
  createMemoryFusionFortuneStore,
  generateFusionFortuneRequest,
  generateFusionFortuneWithMockLLM,
  generateFusionFortuneWithRealLLM,
  getFusionFortuneDateKey,
  selectFusionFortuneTarotSpread,
  validateFusionFortuneResult,
} from "../../worker/lib/fusion-fortune.js";
import { buildFusionFortunePrompt } from "../../worker/lib/fusion-fortune-prompt.js";
import {
  createFusionFortuneTicketOrder,
  isFusionFortuneTicketSalesEnabled,
} from "../../worker/lib/fusion-fortune-purchase.js";

const input = { birthDate: "1995-04-18", birthTime: "08:30", calendarType: "solar", gender: "female", topic: "삶의 전반적인 흐름", concern: "" };
const contextBuilder = async () => ({ ok: true, context: { birthTimeKnown: true } });
const ticketedStore = () => createMemoryFusionFortuneStore({ balances: { user: { totalRemaining: 1, purchasedTotal: 1, usedTotal: 0 } } });

function fusionAdapters(calls) {
  const mark = (name, value) => async () => { calls[name] += 1; return value; };
  return {
    saju: mark("saju", { dayMaster: "갑목", currentFlowSummary: "정리한 기준을 행동으로 옮기는 흐름", evidence: ["saju.dayMaster"] }),
    ziwei: mark("ziwei", { lifePalaceSummary: "명궁의 역할을 차분히 정리하는 흐름", topicPalaceSummary: "관록궁의 책임을 조율하는 흐름", evidence: ["ziwei.lifePalace"] }),
    vedic: mark("vedic", { moonSignSummary: "달의 감정 리듬을 살피는 흐름", nakshatraSummary: "나크샤트라의 반복 습관", innerRhythm: "감정의 속도를 알아차리는 리듬", evidence: ["vedic.nakshatra"] }),
    sukuyo: mark("sukuyo", { birthMansion: "묘숙", relationshipPattern: "관계의 거리를 천천히 맞추는 흐름", evidence: ["sukuyo.birthMansion"] }),
    astrology: mark("astrology", { sunSummary: "태양의 목표 방향", moonSummary: "달의 정서적 안정", currentMoodSummary: "기준을 먼저 확인하는 흐름", evidence: ["astrology.sun"] }),
    tarot: mark("tarot", {
      spreadType: "fusion_six_system_bridge", spreadId: "fusion_six_system_bridge", symbolicMessage: "여섯 장을 현실 행동으로 연결합니다.",
      cards: ["바보", "마법사", "여사제", "여황제", "황제", "연인"].map((name, index) => ({ name, orientation: "upright", positionKey: `position_${index}`, meaningSummary: `${name}의 선택 상징` })),
      evidence: ["tarot.cards"],
    }),
  };
}

describe("Fusion Fortune ticket policy and mock generation", () => {
  it("defines a 10,000 KRW PG-only ticket", () => {
    expect(FUSION_FORTUNE_TICKET_PRODUCT).toMatchObject({ productId: "fusion_fortune_ticket_1", productType: "fusion_fortune_ticket", priceKRW: 10000, ticketAmount: 1, allowedPurchaseChannels: ["pg"] });
    expect(assertFusionFortuneTicketPurchaseAllowed("pg").channel).toBe("pg");
    for (const channel of ["pass", "family_pass", "conversation_credit", "price_coverage", "monthly_entitlement", "entitlement", "fusion_fortune_ticket"]) expect(() => assertFusionFortuneTicketPurchaseAllowed(channel)).toThrow();
  });

  it("does not allow ordinary passes or entitlements to substitute a ticket", async () => {
    const store = createMemoryFusionFortuneStore({
      balances: { user: { totalRemaining: 0, purchasedTotal: 0, usedTotal: 0 } },
      pass: { user: true },
      familyPass: { user: true },
      conversationCredits: { user: 10 },
      monthlyEntitlements: { user: true },
      priceCoverage: { user: true },
    });
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "no-ticket", store, contextBuilder });
    expect(result).toMatchObject({ ok: false, error: "FUSION_FORTUNE_NO_TICKET" });
  });

  it("reports login, ticket, sold-out, and disabled status independently", async () => {
    const now = new Date("2026-08-04T04:00:00.000Z");
    const emptyStore = createMemoryFusionFortuneStore();
    expect(await buildFusionFortuneStatus({ store: emptyStore, now })).toMatchObject({ isLoggedIn: false, nextAction: "login", canGenerate: false });
    expect(await buildFusionFortuneStatus({ userId: "user", store: emptyStore, now })).toMatchObject({ nextAction: "buy_ticket", ticket: { remaining: 0 }, canGenerate: false });
    expect(await buildFusionFortuneStatus({ userId: "user", store: ticketedStore(), now })).toMatchObject({ nextAction: "generate", ticket: { remaining: 1 }, canGenerate: true });
    expect(await buildFusionFortuneStatus({ userId: "user", store: ticketedStore(), now, enabled: false })).toMatchObject({ nextAction: "disabled", canGenerate: false });
  });

  it("creates only a server-priced PG order and keeps sales behind its own flag", async () => {
    expect(isFusionFortuneTicketSalesEnabled({ ENABLE_FUSION_FORTUNE_TICKET_SALES: "true" })).toBe(true);
    expect(isFusionFortuneTicketSalesEnabled({ ENABLE_FUSION_FORTUNE_TICKET_SALES: "false" })).toBe(false);
    const paymentModel = {
      findOne: jest.fn(() => ({ sort: () => ({ lean: async () => null }) })),
      create: jest.fn(async (record) => record),
    };
    const userModel = { findById: jest.fn(() => ({ select: () => ({ lean: async () => ({ name: "테스트 사용자" }) }) })) };
    const env = { PORTONE_STORE_ID: "store-test", PORTONE_CHANNEL_KEY: "channel-test", PORTONE_API_SECRET: "server-test-secret" };
    const body = { productId: "fusion_fortune_ticket_1", productType: "fusion_fortune_ticket", amount: 10000, paymentMethod: "pg", idempotencyKey: "fusion-order-test" };
    const prepared = await createFusionFortuneTicketOrder({ env, userId: "user", body, requestUrl: "https://code-destiny.com/points", paymentModel, userModel });
    expect(prepared).toMatchObject({ ok: true, order: { paymentMethod: "pg", product: { priceKRW: 10000, ticketAmount: 1 } } });
    expect(paymentModel.create).toHaveBeenCalledWith(expect.objectContaining({ paymentAmount: 10000, expectedChargedPoints: 0, membershipCreditCost: 0 }));
    await expect(createFusionFortuneTicketOrder({ env, userId: "user", body: { ...body, amount: 9999 }, paymentModel, userModel })).rejects.toMatchObject({ code: "FUSION_FORTUNE_PRODUCT_MISMATCH" });
    await expect(createFusionFortuneTicketOrder({ env, userId: "user", body: { ...body, paymentMethod: "conversation_credit" }, paymentModel, userModel })).rejects.toMatchObject({ code: "FUSION_FORTUNE_PURCHASE_CHANNEL_BLOCKED" });
  });

  it("builds fusion context by running all six explicit adapters exactly once", async () => {
    const calls = Object.fromEntries(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((name) => [name, 0]));
    const built = await buildFusionFortuneContext({
      ...input,
      birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
    }, { adapters: fusionAdapters(calls) });

    expect(built.ok).toBe(true);
    expect(Object.keys(built.context.systems)).toEqual(["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"]);
    expect(calls).toEqual({ saju: 1, ziwei: 1, vedic: 1, sukuyo: 1, astrology: 1, tarot: 1 });
    expect(built.context.tarotSpread.cards).toHaveLength(6);
  });

  it("fails the whole fusion context when a known system adapter fails", async () => {
    const calls = Object.fromEntries(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((name) => [name, 0]));
    const adapters = fusionAdapters(calls);
    adapters.saju = async () => { calls.saju += 1; throw new Error("calculator unavailable"); };
    const built = await buildFusionFortuneContext({
      ...input,
      birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
    }, { adapters });

    expect(built).toMatchObject({ ok: false, errorCode: "FUSION_FORTUNE_CONTEXT_FAILED", failedSystem: "saju" });
    expect(calls).toEqual({ saju: 1, ziwei: 0, vedic: 0, sukuyo: 0, astrology: 0, tarot: 0 });
  });

  it("uses at most one initial Gemini call and one repair before a context fallback", async () => {
    const calls = Object.fromEntries(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((name) => [name, 0]));
    const built = await buildFusionFortuneContext({
      ...input,
      birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
    }, { adapters: fusionAdapters(calls) });
    const providerCall = jest.fn(async () => ({ ok: true, provider: "gemini", model: "gemini-2.5-flash", text: "{invalid" }));
    const generated = await generateFusionFortuneWithRealLLM({
      input,
      context: built.context,
      requestId: "fusion-two-call-test",
      env: { NODE_ENV: "staging", ENABLE_FUSION_FORTUNE_REAL_LLM: "true", ALLOW_FUSION_FORTUNE_REAL_LLM: "true", GEMINI_API_KEY: "test-only-key" },
      providerCall,
    });

    expect(providerCall).toHaveBeenCalledTimes(2);
    expect(generated).toMatchObject({ deliverable: true, generationSource: "context_fallback", providerCalls: 2 });
    expect(validateFusionFortuneResult(generated.result, { birthTimeKnown: true, birthPlaceKnown: true, selectedTarotCards: built.context.tarotSpread.cards }).ok).toBe(true);
  });

  it("consumes exactly one ticket and one daily slot only after a valid result", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = ticketedStore();
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "success", dateKey, store, contextBuilder, generator: generateFusionFortuneWithMockLLM });
    expect(result.ok).toBe(true);
    expect((await store.getBalance("user")).totalRemaining).toBe(0);
    expect((await store.getDaily(dateKey)).successCount).toBe(1);
  });

  it("emits actual completed stages in the streamed public order before the final Fusion stage", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = ticketedStore();
    const completed = [];
    const contextBuilderWithStages = (candidate, options) => buildFusionFortuneContext({
      ...candidate,
      birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
    }, { adapters: fusionAdapters(Object.fromEntries(["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"].map((name) => [name, 0]))), onStage: options.onStage });
    const generated = await generateFusionFortuneRequest({
      input,
      userId: "user",
      requestId: "stream-stage-order",
      dateKey,
      store,
      contextBuilder: contextBuilderWithStages,
      generator: generateFusionFortuneWithMockLLM,
      onStage: (event) => completed.push(event.stage),
    });
    expect(generated.ok).toBe(true);
    expect(completed).toEqual(["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot", "fusion"]);
  });

  it("releases a reserved ticket and daily slot when the streamed request is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = ticketedStore();
    const generated = await generateFusionFortuneRequest({ input, userId: "user", requestId: "stream-cancelled", dateKey, store, contextBuilder, abortSignal: controller.signal });
    expect(generated).toMatchObject({ ok: false, error: "FUSION_FORTUNE_CANCELLED" });
    expect((await store.getBalance("user")).totalRemaining).toBe(1);
    expect((await store.getDaily(dateKey)).successCount).toBe(0);
  });

  it("does not consume a ticket or daily slot when the stream cannot deliver the final result", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = ticketedStore();
    const generated = await generateFusionFortuneRequest({
      input,
      userId: "user",
      requestId: "stream-undelivered",
      dateKey,
      store,
      contextBuilder,
      generator: generateFusionFortuneWithMockLLM,
      onDelivery: async () => { throw new Error("stream disconnected"); },
    });
    expect(generated).toMatchObject({ ok: false, error: "FUSION_FORTUNE_GENERATION_FAILED" });
    expect((await store.getBalance("user")).totalRemaining).toBe(1);
    expect((await store.getDaily(dateKey)).successCount).toBe(0);
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

  it("allows the hundredth success after ninety-nine completed results", async () => {
    const dateKey = getFusionFortuneDateKey();
    const store = createMemoryFusionFortuneStore({ balances: { user: { totalRemaining: 1 } }, daily: { [dateKey]: { dateKey, limit: 100, successCount: 99, reserved: 0 } } });
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "hundredth", dateKey, store, contextBuilder, generator: generateFusionFortuneWithMockLLM });
    expect(result.ok).toBe(true);
    expect((await store.getDaily(dateKey)).successCount).toBe(100);
    expect(result.fusionStatus.dailyLimit.isSoldOut).toBe(true);
  });

  it("resets the date key at KST midnight", () => {
    expect(getFusionFortuneDateKey(new Date("2026-08-03T14:59:59.999Z"))).toBe("2026-08-03");
    expect(getFusionFortuneDateKey(new Date("2026-08-03T15:00:00.000Z"))).toBe("2026-08-04");
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

  it("rejects padding that repeats the same long sentences across systems", async () => {
    const result = await generateFusionFortuneWithMockLLM({ context: { birthTimeKnown: true } });
    const repeated = {
      ...result,
      ziweiSection: { ...result.ziweiSection, content: result.sajuSection.content },
      vedicSection: { ...result.vedicSection, content: result.sajuSection.content },
    };
    expect(validateFusionFortuneResult(repeated)).toMatchObject({ ok: false, issues: ["repeated_sentence"] });
  });

  it("selects a six-position tarot spread on the server and never accepts client card names", () => {
    const spread = selectFusionFortuneTarotSpread(input);
    expect(spread).toMatchObject({ spreadType: "fusion_six_system_bridge" });
    expect(spread.cards).toHaveLength(6);
    expect(spread.cards.every((card) => /^major_[a-z_]+$/.test(card.cardId) && card.name && card.positionKey)).toBe(true);
  });
});
