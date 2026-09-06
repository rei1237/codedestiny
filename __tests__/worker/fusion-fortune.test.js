/** @jest-environment node */
import { describe, expect, it, jest } from "@jest/globals";
import {
  FUSION_FORTUNE_PAID_FEATURE_KEY,
  FUSION_RESERVATION_FRESHNESS_MS,
  buildFusionFortuneContext,
  buildFusionFortuneStatus,
  createMemoryFusionFortuneStore,
  generateFusionFortuneRequest,
  generateFusionFortuneWithMockLLM,
  generateFusionFortuneWithRealLLM,
  getFusionFortuneDateKey,
  isFusionFortuneRealLlmAllowed,
  selectFusionFortuneTarotSpread,
  validateFusionFortuneGroup,
  validateFusionFortuneResult,
} from "../../worker/lib/fusion-fortune.js";
import {
  buildFusionFortunePrompt,
  buildFusionSectionGroupPrompt,
  FUSION_FORTUNE_LENGTH,
  FUSION_FORTUNE_RESPONSE_SCHEMA,
  FUSION_SECTION_GROUP_SPECS,
  toGeminiSchema,
} from "../../worker/lib/fusion-fortune-prompt.js";
import { FEATURE_KEY_PRICE_TABLE, isPerUsePaidFeatureKey } from "../../worker/lib/paid-feature-registry.js";

const input = { birthDate: "1995-04-18", birthTime: "08:30", calendarType: "solar", gender: "female", topic: "삶의 전반적인 흐름", concern: "" };
const contextBuilder = async () => ({ ok: true, context: { birthTimeKnown: true } });
// 결제는 스토어가 아니라 라우트가 주입하는 콜백이 판정한다. 테스트는 그 콜백만 갈아끼운다.
const paidAccess = async () => ({ ok: true });
const unpaidAccess = async () => ({ ok: false });
const degradedAccess = async () => ({ ok: false, degraded: true });
const emptyStore = () => createMemoryFusionFortuneStore();

/**
 * 그룹 하나가 돌려줄 법한 "합격 응답"을 만든다. 문장마다 번호가 달라 반복 검사에 걸리지 않고,
 * 본문에 키 이름을 심어 두어 어느 그룹의 글이 살아남았는지 결과에서 되짚을 수 있다.
 */
function fusionFiller(seed, minChars) {
  let value = "";
  let index = 0;
  while (value.length < minChars) {
    value += `${seed} 근거 ${index}번은 서버가 확정한 값에서 출발해 지금의 선택 기준을 설명하고, 생활에서 그것이 드러나는 장면과 이번 주에 해볼 행동을 함께 담습니다. `;
    index += 1;
  }
  return value.trim();
}

function buildFusionGroupPayload(group, cards = []) {
  const payload = {};
  for (const key of group.keys) {
    if (key === "visualization") {
      payload.visualization = {
        systemScores: ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((system, index) => ({ key: system, score: 55 + index * 5, note: "신호 강도" })),
        monthlyTimeline: Array.from({ length: 12 }, (_, index) => ({ label: `${index + 1}월`, intensity: 50 + (index % 5) * 8, note: `${index + 1}번째 달에 점검할 한 가지를 정합니다.` })),
        crossChecks: {
          aligned: [{ theme: "속도 조절", systems: ["saju", "ziwei"], meaning: "두 체계가 같은 방향을 가리키므로 우선순위로 둡니다." }],
          divergent: [{ theme: "표현의 강도", systems: ["astrology", "sukuyo"], meaning: "상황에 따라 어느 쪽을 따를지 나눠 둡니다." }],
        },
      };
      continue;
    }
    if (key === "timingAndAction") {
      payload.timingAndAction = { title: "가까운 시기와 행동", content: fusionFiller("timingAndAction", 3000), luckyActions: ["기준 한 줄 적기", "경계 말하기", "지출 한 가지 줄이기"], cautionPatterns: ["답을 재촉하기", "속도를 남에게 맞추기", "한 번에 크게 바꾸기"] };
      continue;
    }
    if (key === "finalVerdict") {
      payload.finalVerdict = {
        headline: "지금은 방향을 바꾸기보다 힘의 배분을 조정할 때입니다.",
        confidence: 72,
        systemVerdicts: ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((system, index) => ({
          key: system,
          stance: index < 3 ? "agree" : index < 5 ? "conditional" : "caution",
          note: system + " 확정값이 이 결론에 대해 말하는 바를 한 줄로 적습니다.",
        })),
        rationale: fusionFiller("finalVerdict", 1150),
        doNow: ["기준 한 줄 적기", "되돌릴 수 있는 크기로 시험하기", "반응을 기록으로 남기기"],
        avoid: ["답을 재촉하기", "한 번에 크게 바꾸기"],
      };
      continue;
    }
    if (key === "title") { payload.title = "여섯 체계가 만나는 자리"; continue; }
    if (key === "shareText") { payload.shareText = "여섯 운세 체계를 하나로 엮어 지금의 선택을 정리했어요."; continue; }
    if (key === "openingMessage") { payload.openingMessage = fusionFiller("openingMessage", 320); continue; }
    if (key === "closingMessage") { payload.closingMessage = fusionFiller("closingMessage", 1000); continue; }
    if (key === "executiveSummary") { payload.executiveSummary = fusionFiller("executiveSummary", 1700); continue; }
    const minChars = 4000;
    const tarotNames = key === "tarotSection" ? ` 서버가 고른 카드는 ${cards.map((card) => card.name).join(", ")}입니다.` : "";
    payload[key] = { title: key, content: `${fusionFiller(key, minChars)}${tarotNames}`, keyPoints: ["남길 판단 하나", "확인할 사실 하나", "이번 주 행동 하나"] };
  }
  return payload;
}

/** 라우트가 하는 대로 1단계 → 2단계(1단계 결과를 priorResult 로)를 순서대로 돌린다. */
async function runFusionStages(args) {
  const first = await generateFusionFortuneWithRealLLM({ ...args, stage: 1 });
  const second = await generateFusionFortuneWithRealLLM({ ...args, stage: 2, priorResult: first.result, priorGenerationSource: first.generationSource });
  return { first, second };
}

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

  it("🔴 opens the real LLM gate on the canonical GEMINIF_API_KEY, not only its aliases", () => {
    // 이 게이트가 GEMINI_API_KEY/GOOGLE_API_KEY 만 보던 시절, 정본 시크릿(GEMINIF_API_KEY)만 있는
    // 프로덕션에서 결제 성공 후 503(FEATURE_DISABLED)이 났다. 생성 경로는 pickGeminiKeys() 로
    // 같은 키를 잘 찾았으므로, 게이트가 자기가 지키는 호출보다 엄격했던 것이다.
    const base = { NODE_ENV: "staging", ENABLE_FUSION_FORTUNE_REAL_LLM: "true", ALLOW_FUSION_FORTUNE_REAL_LLM: "true" };
    expect(isFusionFortuneRealLlmAllowed({ ...base, GEMINIF_API_KEY: "test-only-key" })).toBe(true);
    expect(isFusionFortuneRealLlmAllowed({ ...base, GEMINI_API_KEY: "test-only-key" })).toBe(true);
    expect(isFusionFortuneRealLlmAllowed({ ...base, GOOGLE_GEMINI_API_KEY: "test-only-key" })).toBe(true);
    // 키가 없거나 플래그가 꺼져 있으면 그대로 막힌다.
    expect(isFusionFortuneRealLlmAllowed(base)).toBe(false);
    expect(isFusionFortuneRealLlmAllowed({ ...base, NODE_ENV: "test", GEMINIF_API_KEY: "test-only-key" })).toBe(false);
    expect(isFusionFortuneRealLlmAllowed({ ...base, ALLOW_FUSION_FORTUNE_REAL_LLM: "false", GEMINIF_API_KEY: "test-only-key" })).toBe(false);
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
    expect(store.attempts.get("unpaid-slot")).toBeUndefined();
  });

  it("lets a paid request retry on the same id after a failed generation", async () => {
    // 결제 증빙이 requestId 에 묶여 있어, 실패한 시도를 409 로 잠그면 3만원을 낸 사용자가
    // 결과를 받을 길이 사라진다.
    const dateKey = getFusionFortuneDateKey();
    const store = emptyStore();
    const failed = await generateFusionFortuneRequest({ input, userId: "user", requestId: "retry-same-id", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder: async () => ({ ok: false }) });
    expect(failed.ok).toBe(false);
    expect(failed.retryRequestId).toBe("retry-same-id");

    const retried = await generateFusionFortuneRequest({ input, userId: "user", requestId: "retry-same-id", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM });
    expect(retried.ok).toBe(true);
    expect(store.attempts.get("retry-same-id")).toMatchObject({ status: "completed" });
  });

  it("still refuses to replay a completed request", async () => {
    const dateKey = getFusionFortuneDateKey();
    const store = emptyStore();
    await generateFusionFortuneRequest({ input, userId: "user", requestId: "replay-id", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM });
    const replay = await generateFusionFortuneRequest({ input, userId: "user", requestId: "replay-id", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM });
    expect(replay).toMatchObject({ ok: false, error: "FUSION_FORTUNE_REQUEST_IN_PROGRESS" });
  });

  it("keeps a fresh 'reserved' attempt locked — it may still be in flight", async () => {
    const store = emptyStore();
    const dateKey = getFusionFortuneDateKey();
    const first = await store.reserve("user", dateKey, "fresh-reserved");
    expect(first.ok).toBe(true);
    const second = await store.reserve("user", dateKey, "fresh-reserved");
    expect(second).toMatchObject({ ok: false, errorCode: "FUSION_FORTUNE_REQUEST_IN_PROGRESS", status: 409 });
  });

  it("🔴 reopens a paid reservation stuck in 'reserved' past the freshness window instead of locking it for the full TTL", async () => {
    // 플랫폼이 생성 도중 워커를 강제 종료하면 store.release()가 아예 호출되지 못해 예약이
    // "reserved"로 멈춘다. 신선도 창(FUSION_RESERVATION_FRESHNESS_MS)이 없으면 결제한 사용자는
    // 만료 TTL(10분) 내내 같은 requestId로 재시도해도 409만 받는다.
    const store = emptyStore();
    const dateKey = getFusionFortuneDateKey();
    const stuckAt = new Date("2026-08-19T00:00:00.000Z");
    const stuck = await store.reserve("user", dateKey, "stuck-reserved", stuckAt);
    expect(stuck.ok).toBe(true);

    // 신선도 창 안에서는 계속 진행 중일 수 있으므로 여전히 막는다.
    const stillWithinWindow = new Date(stuckAt.getTime() + FUSION_RESERVATION_FRESHNESS_MS - 1000);
    const tooSoon = await store.reserve("user", dateKey, "stuck-reserved", stillWithinWindow);
    expect(tooSoon).toMatchObject({ ok: false, errorCode: "FUSION_FORTUNE_REQUEST_IN_PROGRESS", status: 409 });

    // 창을 넘기면 같은 requestId로 다시 열리고, 생성도 정상적으로 이어서 끝까지 완료된다 —
    // 재시도가 실제로 살아 있어야 결제한 사용자가 결과를 받을 수 있다.
    const pastWindow = new Date(stuckAt.getTime() + FUSION_RESERVATION_FRESHNESS_MS + 1000);
    const retried = await generateFusionFortuneRequest({ input, userId: "user", requestId: "stuck-reserved", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM, now: pastWindow });
    expect(retried.ok).toBe(true);
    expect(store.attempts.get("stuck-reserved")).toMatchObject({ status: "completed" });
  });

  it("reports login and disabled status without consulting a wallet", async () => {
    const now = new Date("2026-08-04T04:00:00.000Z");
    expect(await buildFusionFortuneStatus({ store: emptyStore(), now })).toMatchObject({ isLoggedIn: false, nextAction: "login", canGenerate: false });
    // 진입 시 결제 선검사를 하지 않으므로 로그인만 되어 있으면 canGenerate 다.
    expect(await buildFusionFortuneStatus({ userId: "user", store: emptyStore(), now })).toMatchObject({ nextAction: "generate", canGenerate: true, pricing: { featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY } });
    expect(await buildFusionFortuneStatus({ userId: "user", store: emptyStore(), now, enabled: false })).toMatchObject({ nextAction: "disabled", canGenerate: false });
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

  it("runs six stage-one groups then three stage-two groups and retries each once before a context fallback", async () => {
    const calls = Object.fromEntries(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((name) => [name, 0]));
    const built = await buildFusionFortuneContext({
      ...input,
      birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
    }, { adapters: fusionAdapters(calls) });
    const providerCall = jest.fn(async () => ({ ok: true, provider: "gemini", model: "gemini-2.5-flash", text: "{invalid" }));
    const { first, second: generated } = await runFusionStages({
      input,
      context: built.context,
      requestId: "fusion-group-call-test",
      env: { NODE_ENV: "staging", ENABLE_FUSION_FORTUNE_REAL_LLM: "true", ALLOW_FUSION_FORTUNE_REAL_LLM: "true", GEMINI_API_KEY: "test-only-key" },
      providerCall,
    });

    // 그룹 9개(1단계 6 + 2단계 3) × (1차 + 미달 재생성 1회). 단일 호출로는 30,000자 계약을 채울 수 없다.
    expect(providerCall).toHaveBeenCalledTimes(FUSION_SECTION_GROUP_SPECS.length * 2);
    expect(new Set(providerCall.mock.calls.map(([, , options]) => options.logContext.sectionGroup)))
      .toEqual(new Set(FUSION_SECTION_GROUP_SPECS.map((group) => group.id)));
    // 1단계는 전체 계약을 평가하지 않고 partial 로 넘기며 2단계 키를 갖지 않는다.
    expect(first).toMatchObject({ deliverable: true, generationSource: "context_fallback", providerCalls: 12, qualityTier: "partial", stage: 1 });
    expect(first.result).not.toHaveProperty("executiveSummary");
    expect(generated).toMatchObject({ deliverable: true, generationSource: "context_fallback", providerCalls: 6, stage: 2 });
    expect(validateFusionFortuneResult(generated.result, { birthTimeKnown: true, birthPlaceKnown: true, selectedTarotCards: built.context.tarotSpread.cards }).ok).toBe(true);
  });

  it("keeps eight good groups when one group fails and fills only that group from the fallback", async () => {
    const calls = Object.fromEntries(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((name) => [name, 0]));
    const built = await buildFusionFortuneContext({
      ...input,
      birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
    }, { adapters: fusionAdapters(calls) });
    const cards = built.context.tarotSpread.cards;
    const providerCall = jest.fn(async (_env, _prompt, options) => {
      const groupId = options.logContext.sectionGroup;
      if (groupId === "vedic") return { ok: false, error: "timeout" };
      const group = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === groupId);
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(buildFusionGroupPayload(group, cards)) };
    });
    const { second: generated } = await runFusionStages({
      input,
      context: built.context,
      requestId: "fusion-partial-group-test",
      env: { NODE_ENV: "staging", ENABLE_FUSION_FORTUNE_REAL_LLM: "true", ALLOW_FUSION_FORTUNE_REAL_LLM: "true", GEMINI_API_KEY: "test-only-key" },
      providerCall,
    });

    expect(generated).toMatchObject({ deliverable: true, generationSource: "gemini_partial" });
    // 살아남은 그룹은 LLM 본문 그대로, 실패한 그룹만 결정론 폴백으로 채워진다.
    expect(generated.result.sajuSection.content).toContain("sajuSection");
    expect(generated.result.tarotSection.content).toContain("tarotSection");
    expect(generated.result.vedicSection.content).not.toContain("vedicSection");
    expect(validateFusionFortuneResult(generated.result, { birthTimeKnown: true, birthPlaceKnown: true, selectedTarotCards: cards }).ok).toBe(true);
  });

  it("ignores keys a group does not own so it cannot clobber another group's section", async () => {
    const calls = Object.fromEntries(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((name) => [name, 0]));
    const built = await buildFusionFortuneContext({
      ...input,
      birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
    }, { adapters: fusionAdapters(calls) });
    const cards = built.context.tarotSpread.cards;
    const providerCall = jest.fn(async (_env, _prompt, options) => {
      const group = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === options.logContext.sectionGroup);
      const payload = buildFusionGroupPayload(group, cards);
      // saju 그룹이 남의 구역(tarotSection)까지 써서 돌려주는 상황.
      if (group.id === "saju") payload.tarotSection = { title: "남의 구역", content: "가로채기", keyPoints: ["1", "2", "3"] };
      return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(payload) };
    });
    const { second: generated } = await runFusionStages({
      input,
      context: built.context,
      requestId: "fusion-stray-keys-test",
      env: { NODE_ENV: "staging", ENABLE_FUSION_FORTUNE_REAL_LLM: "true", ALLOW_FUSION_FORTUNE_REAL_LLM: "true", GEMINI_API_KEY: "test-only-key" },
      providerCall,
    });

    expect(generated).toMatchObject({ deliverable: true, generationSource: "gemini" });
    expect(generated.result.tarotSection.content).toContain("tarotSection");
    expect(generated.result.tarotSection.content).not.toContain("가로채기");
  });

  it("rejects a tarot hallucination at the group boundary, not only after merging", async () => {
    const group = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === "tarot");
    const cards = [{ name: "별" }, { name: "태양" }];
    const payload = buildFusionGroupPayload(group, cards);
    payload.tarotSection.content += " 여기에 죽음 카드 이야기를 덧붙입니다.";
    expect(validateFusionFortuneGroup(payload, group, { selectedTarotCards: cards })).toMatchObject({ ok: false, issue: "invented_tarot_card" });
  });

  it("consumes exactly one ticket and one daily slot only after a valid result", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = emptyStore();
    const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "success", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM });
    expect(result.ok).toBe(true);
    expect([...store.attempts.values()].filter((item) => item.status === "completed")).toHaveLength(1);
  });

  it("emits actual completed stages in the streamed public order before the final Fusion stage", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = emptyStore();
    const completed = [];
    const contextBuilderWithStages = (candidate, options) => buildFusionFortuneContext({
      ...candidate,
      birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
    }, { adapters: fusionAdapters(Object.fromEntries(["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"].map((name) => [name, 0]))), onStage: options.onStage });
    const common = { input, userId: "user", requestId: "stream-stage-order", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder: contextBuilderWithStages, generator: generateFusionFortuneWithMockLLM, onStage: (event) => completed.push(event.stage) };
    const first = await generateFusionFortuneRequest({ ...common, stage: 1 });
    expect(first).toMatchObject({ ok: true, stage: 1, stageStatus: "partial" });
    // 1단계는 fusion 단계를 알리지 않는다 — 통합·판정은 아직 없다.
    expect(completed).toEqual(["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"]);
    completed.length = 0;
    const generated = await generateFusionFortuneRequest({ ...common, stage: 2, priorResult: first.result });
    expect(generated).toMatchObject({ ok: true, stage: 2, stageStatus: "completed" });
    expect(completed).toEqual(["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot", "fusion"]);
  });

  it("keeps the stage-one reservation and books stage two under its own key", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = emptyStore();
    const common = { input, userId: "user", requestId: "two-stage-keys", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM };
    const first = await generateFusionFortuneRequest({ ...common, stage: 1 });
    expect(first.ok).toBe(true);
    // 1단계 예약이 completed 로 잠긴 뒤에도 같은 requestId 의 2단계는 #s2 키로 들어간다(409 아님).
    const second = await generateFusionFortuneRequest({ ...common, stage: 2, priorResult: first.result });
    expect(second).toMatchObject({ ok: true, stage: 2, stageStatus: "completed" });
    const keys = [...store.attempts.keys()].map(String);
    expect(keys.some((key) => key.includes("two-stage-keys#s2"))).toBe(true);
    expect([...store.attempts.values()].filter((item) => item.status === "completed")).toHaveLength(2);
  });

  it("sends stage two back to stage one when the stage-one result is missing", async () => {
    const store = emptyStore();
    for (const priorResult of [undefined, null, {}, { sajuSection: { content: "짧음" } }]) {
      const result = await generateFusionFortuneRequest({ input, userId: "user", requestId: "stage-two-orphan", store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM, stage: 2, priorResult });
      expect(result).toMatchObject({ ok: false, status: 409, error: "FUSION_FORTUNE_STAGE_ONE_MISSING", retryable: true, stage: 1 });
    }
    expect(store.attempts.size).toBe(0);
  });

  it("rejects an unknown stage and a stage-one result without the six system sections", async () => {
    const store = emptyStore();
    const bad = await generateFusionFortuneRequest({ input, userId: "user", requestId: "stage-three", store, resolvePaidAccess: paidAccess, contextBuilder, generator: generateFusionFortuneWithMockLLM, stage: 3 });
    expect(bad).toMatchObject({ ok: false, status: 400 });
    const thin = await generateFusionFortuneRequest({ input, userId: "user", requestId: "stage-one-thin", store, resolvePaidAccess: paidAccess, contextBuilder, generator: async () => ({ title: "only title" }), stage: 1 });
    expect(thin.ok).toBe(false);
    expect([...store.attempts.values()].filter((item) => item.status === "completed")).toHaveLength(0);
  });

  it("releases a reserved ticket and daily slot when the streamed request is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = emptyStore();
    const generated = await generateFusionFortuneRequest({ input, userId: "user", requestId: "stream-cancelled", dateKey, store, resolvePaidAccess: paidAccess, contextBuilder, abortSignal: controller.signal });
    expect(generated).toMatchObject({ ok: false, error: "FUSION_FORTUNE_CANCELLED" });
    expect([...store.attempts.values()].filter((item) => item.status === "completed")).toHaveLength(0);
  });

  it("🔴 delivers a finished result even when the request was cancelled during generation", async () => {
    // 2026-09-03: 배달 직전·직후에 취소 검사가 있어, 완성된 3만원짜리 글을 손에 쥔 채로
    // CANCELLED 를 던지는 경로가 둘 있었다. 결제는 생성 **전에** 끝나므로 그 순간의 취소는
    // 사용자 손실이다. 취소는 아직 만들지 않은 것을 안 만들게 하는 장치일 뿐이다.
    const controller = new AbortController();
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = emptyStore();
    const delivered = [];
    const generated = await generateFusionFortuneRequest({
      input,
      userId: "user",
      requestId: "stream-cancelled-after-generation",
      dateKey,
      store,
      resolvePaidAccess: paidAccess,
      contextBuilder,
      // 생성을 마친 직후 연결이 끊긴 상황.
      generator: async (args) => {
        const result = await generateFusionFortuneWithMockLLM(args);
        controller.abort();
        return result;
      },
      abortSignal: controller.signal,
      onDelivery: async (delivery) => { delivered.push(delivery); },
    });

    expect(delivered).toHaveLength(1);
    expect(generated).toMatchObject({ ok: true });
    expect([...store.attempts.values()].filter((item) => item.status === "completed")).toHaveLength(1);
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
    expect([...store.attempts.values()].filter((item) => item.status === "completed")).toHaveLength(0);
  });

  it("keeps a delivered paid result successful when the final attempt commit fails", async () => {
    const dateKey = getFusionFortuneDateKey(new Date("2026-08-04T05:00:00.000Z"));
    const store = emptyStore();
    store.commit = async () => null;
    const delivered = [];
    const generated = await generateFusionFortuneRequest({
      input,
      userId: "user",
      requestId: "stream-delivered-commit-failed",
      dateKey,
      store,
      resolvePaidAccess: paidAccess,
      contextBuilder,
      generator: generateFusionFortuneWithMockLLM,
      onDelivery: async (delivery) => { delivered.push(delivery); },
    });

    expect(delivered).toHaveLength(1);
    expect(generated).toMatchObject({ ok: true, requestId: "stream-delivered-commit-failed" });
    expect(generated.result).toBe(delivered[0].result);
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
    expect([...store.attempts.values()].filter((item) => item.status === "completed")).toHaveLength(0);
  });

  it("resets the date key at KST midnight", () => {
    expect(getFusionFortuneDateKey(new Date("2026-08-03T14:59:59.999Z"))).toBe("2026-08-03");
    expect(getFusionFortuneDateKey(new Date("2026-08-03T15:00:00.000Z"))).toBe("2026-08-04");
  });

  it("keeps the deterministic fallback inside section, privacy, safety, and the paid length contract", async () => {
    const result = await generateFusionFortuneWithMockLLM({ context: { birthTimeKnown: true } });
    const checked = validateFusionFortuneResult(result, { birthTimeKnown: true, sensitiveValues: [input.birthDate, input.birthTime, "비공개 고민" ] });
    // 🔴 폴백이 계약 하한을 못 넘기면, 생성이 실패한 결제 사용자가 결과 대신 오류를 받는다.
    expect(checked.ok).toBe(true);
    expect(checked.length).toBeGreaterThanOrEqual(FUSION_FORTUNE_LENGTH.total.min);
    expect(checked.length).toBeLessThanOrEqual(FUSION_FORTUNE_LENGTH.total.max);
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
    expect(prompt.systemPrompt).toContain("30,000자 이상");
    expect(prompt.userPrompt).not.toContain(input.birthDate);
    expect(prompt.userPrompt).not.toContain(input.birthTime);
    expect(prompt.userPrompt).not.toContain("비공개 고민");
  });

  it("🔴 converts the whole pseudo-schema into the Gemini schema subset — an unknown keyword is a 400 and fusion has no fallback", () => {
    // Gemini generationConfig.responseSchema 가 받는 키만. 초융합은 fallbackToWorkersAI:false 라
    // 400 하나면 아홉 묶음이 전부 결정론적 폴백으로 떨어진다.
    const allowed = ["type", "description", "properties", "required", "propertyOrdering", "items", "minItems"];
    const walk = (node) => {
      expect(Object.keys(node).filter((key) => !allowed.includes(key))).toEqual([]);
      expect(["OBJECT", "ARRAY", "STRING", "NUMBER"]).toContain(node.type);
      if (node.type === "OBJECT") {
        // required 가 properties 를 벗어나면 그것도 400 이다.
        expect(node.required.filter((key) => !node.properties[key])).toEqual([]);
        expect(node.required.length).toBeGreaterThan(0);
        Object.values(node.properties).forEach(walk);
      }
      if (node.type === "ARRAY") walk(node.items);
    };
    const schema = toGeminiSchema(FUSION_FORTUNE_RESPONSE_SCHEMA);
    walk(schema);
    expect(schema.required).toEqual(Object.keys(FUSION_FORTUNE_RESPONSE_SCHEMA));
    // 분량 지시는 스키마 키워드로 표현할 수 없어 description 으로만 살아남는다.
    expect(schema.properties.sajuSection.properties.content.description).toContain("자 이상");
  });

  it("🔴 states a target above the minimum in the length description — the 2026-09-06 live run landed at 79~82% of the threshold", () => {
    // 최소치만 적으면 모델이 그것을 목표로 읽고 그 아래에서 멈춘다(saju 2,860 · tarot 2,967 / 3,600자).
    const schema = toGeminiSchema(FUSION_FORTUNE_RESPONSE_SCHEMA);
    const lengthFields = [
      [schema.properties.sajuSection.properties.content, FUSION_FORTUNE_LENGTH.section],
      [schema.properties.integratedReading.properties.content, FUSION_FORTUNE_LENGTH.integratedReading],
      [schema.properties.timingAndAction.properties.content, FUSION_FORTUNE_LENGTH.timingAndAction],
      [schema.properties.executiveSummary, FUSION_FORTUNE_LENGTH.executiveSummary],
      [schema.properties.finalVerdict.properties.rationale, FUSION_FORTUNE_LENGTH.finalVerdictRationale],
    ];
    for (const [node, minChars] of lengthFields) {
      const numbers = [...node.description.matchAll(/([\d,]+)자/g)].map((match) => Number(match[1].replace(/,/g, "")));
      expect(numbers).toContain(minChars);
      // 최소치보다 위의 목표가 함께 있어야 한다 — 없으면 모델은 최소치 아래에서 멈춘다.
      expect(Math.max(...numbers)).toBeGreaterThan(minChars);
      expect(node.description).toContain("반려");
      // 🔴 FORBIDDEN(무조건·반드시)을 프롬프트에 넣지 않는다 — 모델이 되받아 쓰면 unsafe_phrase 로 자기 응답이 반려된다.
      expect(node.description).not.toMatch(/무조건|반드시/);
    }
  });

  it("🔴 transmits a schema that requires keyPoints — the 2026-09-06 live run omitted it in five of eight rejected groups", () => {
    const group = FUSION_SECTION_GROUP_SPECS.find((spec) => spec.keys.includes("sukuyoSection"));
    const prompt = buildFusionSectionGroupPrompt({ context: { birthTimeKnown: true }, group });
    expect(prompt.geminiSchema.required).toEqual(group.keys);
    // 프롬프트 본문용 스키마는 형태를 유지한다 — verify:fusion-fortune-quality 가 키 순서를 단언한다.
    expect(Object.keys(prompt.responseSchema)).toEqual(group.keys);
    const section = prompt.geminiSchema.properties.sukuyoSection;
    expect(section.required).toEqual(["title", "content", "keyPoints"]);
    expect(section.properties.keyPoints).toMatchObject({ type: "ARRAY", minItems: 3 });
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
