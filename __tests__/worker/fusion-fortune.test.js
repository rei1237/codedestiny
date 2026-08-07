/** @jest-environment node */
import { describe, expect, it, jest } from "@jest/globals";
import {
  FUSION_FORTUNE_PAID_FEATURE_KEY,
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
import { FEATURE_KEY_PRICE_TABLE, isPerUsePaidFeatureKey } from "../../worker/lib/paid-feature-registry.js";

const input = { birthDate: "1995-04-18", birthTime: "08:30", calendarType: "solar", gender: "female", topic: "삶의 전반적인 흐름", concern: "" };
const contextBuilder = async () => ({ ok: true, context: { birthTimeKnown: true } });
// 결제는 스토어가 아니라 라우트가 주입하는 콜백이 판정한다. 테스트는 그 콜백만 갈아끼운다.
const paidAccess = async () => ({ ok: true });
const unpaidAccess = async () => ({ ok: false });
const degradedAccess = async () => ({ ok: false, degraded: true });
const emptyStore = () => createMemoryFusionFortuneStore();

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

describe("Fusion Fortune per-use billing and mock generation", () => {
  it("prices the reading at 300 coins (30,000 KRW) as a per-use feature", () => {
    expect(FUSION_FORTUNE_PAID_FEATURE_KEY).toBe("fusion-fortune-consultation");
    expect(FEATURE_KEY_PRICE_TABLE[FUSION_FORTUNE_PAID_FEATURE_KEY]).toMatchObject({ cost: 300, amountKRW: 30000 });
    // 회당 결제여야 매번 재판정된다. 영구 해금으로 등록되면 1회 결제로 무제한이 된다.
    expect(isPerUsePaidFeatureKey(FUSION_FORTUNE_PAID_FEATURE_KEY)).toBe(true);
  });

  it("refuses to generate without a payment proof", async () => {
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "unpaid", store: emptyStore(), resolvePaidAccess: unpaidAccess, contextBuilder });
    expect(result).toMatchObject({ ok: false, status: 402, error: "FUSION_FORTUNE_PAYMENT_REQUIRED" });
    expect(result.pricing).toMatchObject({ featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY });
  });

  it("🔴 treats an unverifiable payment as retryable 503, never as 402", async () => {
    // 402 로 내리면 3만원을 낸 사용자가 결제창을 다시 보게 된다.
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "degraded", store: emptyStore(), resolvePaidAccess: degradedAccess, contextBuilder });
    expect(result).toMatchObject({ ok: false, status: 503, retryable: true, error: "FUSION_FORTUNE_PAYMENT_CHECK_DEGRADED" });
  });

  it("does not burn a daily slot when the payment check fails", async () => {
    const dateKey = getFusionFortuneDateKey();
    const store = emptyStore();
    await generateFusionFortuneRequest({ input, userId: "user", requestId: "unpaid-slot", dateKey, store, resolvePaidAccess: unpaidAccess, contextBuilder });
    expect((await store.getDaily(dateKey))).toMatchObject({ successCount: 0, reserved: 0 });
  });

  it("reports login, sold-out, and disabled status without consulting a wallet", async () => {
    const now = new Date("2026-08-04T04:00:00.000Z");
    expect(await buildFusionFortuneStatus({ store: emptyStore(), now })).toMatchObject({ isLoggedIn: false, nextAction: "login", canGenerate: false });
    // 진입 시 결제 선검사를 하지 않으므로 로그인만 되어 있으면 canGenerate 다.
    expect(await buildFusionFortuneStatus({ userId: "user", store: emptyStore(), now })).toMatchObject({ nextAction: "generate", canGenerate: true, pricing: { featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY } });
    expect(await buildFusionFortuneStatus({ userId: "user", store: emptyStore(), now, enabled: false })).toMatchObject({ nextAction: "disabled", canGenerate: false });
  });

  it("keeps the retired ticket product unsellable regardless of its old env flag", async () => {
    // 워커가 티켓을 더 이상 소비하지 않으므로 팔면 소비 불가능한 재화를 파는 셈이다.
    expect(isFusionFortuneTicketSalesEnabled({ ENABLE_FUSION_FORTUNE_TICKET_SALES: "true" })).toBe(false);
    const paymentModel = {
      findOne: jest.fn(() => ({ sort: () => ({ lean: async () => null }) })),
      create: jest.fn(async (record) => record),
    };
    const userModel = { findById: jest.fn(() => ({ select: () => ({ lean: async () => ({ name: "테스트 사용자" }) }) })) };
    const env = { PORTONE_STORE_ID: "store-test", PORTONE_CHANNEL_KEY: "channel-test", PORTONE_API_SECRET: "server-test-secret" };
    const body = { productId: "fusion_fortune_ticket_1", productType: "fusion_fortune_ticket", amount: 10000, paymentMethod: "pg", idempotencyKey: "fusion-order-test" };
    await expect(createFusionFortuneTicketOrder({ env, userId: "user", body, requestUrl: "https://code-destiny.com/points", paymentModel, userModel }))
      .rejects.toMatchObject({ code: "FUSION_FORTUNE_TICKET_SALES_ENDED" });
    expect(paymentModel.create).not.toHaveBeenCalled();
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
    const store = emptyStore();
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "success", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM });
    expect(result.ok).toBe(true);
    expect((await store.getDaily(dateKey)).successCount).toBe(1);
  });

  it("emits actual completed stages in the streamed public order before the final Fusion stage", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = emptyStore();
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
      resolvePaidAccess: paidAccess,
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
    const store = emptyStore();
    const generated = await generateFusionFortuneRequest({ input, userId: "user", requestId: "stream-cancelled", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, abortSignal: controller.signal });
    expect(generated).toMatchObject({ ok: false, error: "FUSION_FORTUNE_CANCELLED" });
    expect((await store.getDaily(dateKey)).successCount).toBe(0);
  });

  it("does not consume a ticket or daily slot when the stream cannot deliver the final result", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = emptyStore();
    const generated = await generateFusionFortuneRequest({
      input,
      userId: "user",
      requestId: "stream-undelivered",
      dateKey,
      store,
      resolvePaidAccess: paidAccess,
      contextBuilder,
      generator: generateFusionFortuneWithMockLLM,
      onDelivery: async () => { throw new Error("stream disconnected"); },
    });
    expect(generated).toMatchObject({ ok: false, error: "FUSION_FORTUNE_GENERATION_FAILED" });
    expect((await store.getDaily(dateKey)).successCount).toBe(0);
  });

  it.each([
    ["context", async () => ({ ok: false })],
    ["llm", async () => { throw new Error("mock llm failure"); }],
    ["validator", async () => ({ title: "too short" })],
  ])("does not consume a ticket or a daily slot after %s failure", async (_name, generatorOrContext) => {
    const store = emptyStore();
    const args = _name === "context" ? { contextBuilder: generatorOrContext } : { contextBuilder, generator: generatorOrContext };
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: `failure-${_name}`, store, resolvePaidAccess: paidAccess, ...args });
    expect(result.ok).toBe(false);
    expect((await store.getDaily(getFusionFortuneDateKey())).successCount).toBe(0);
  });

  it("fails closed at 100 daily results and reports sold out", async () => {
    const dateKey = getFusionFortuneDateKey();
    const store = createMemoryFusionFortuneStore({ daily: { [dateKey]: { dateKey, limit: 100, successCount: 100, reserved: 0 } } });
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "sold-out", store, resolvePaidAccess: paidAccess, contextBuilder });
    expect(result.error).toBe("FUSION_FORTUNE_SOLD_OUT");
    expect((await buildFusionFortuneStatus({ userId: "user", store })).dailyLimit.isSoldOut).toBe(true);
  });

  it("allows the hundredth success after ninety-nine completed results", async () => {
    const dateKey = getFusionFortuneDateKey();
    const store = createMemoryFusionFortuneStore({ daily: { [dateKey]: { dateKey, limit: 100, successCount: 99, reserved: 0 } } });
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "hundredth", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM });
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
    const store = emptyStore();
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
