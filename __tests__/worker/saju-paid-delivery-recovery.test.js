/** @jest-environment node */
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { webcrypto } = require("node:crypto");
const prompt = require("../../worker/lib/saju-ai-prompt.js");
const quality = require("../../worker/lib/paid-report-quality.js");
const { toAiLocale, AI_OUTPUT_LOCALES } = require("../../lib/i18n/ai-locale.js");
const { isCompleteLlmResponse } = require("../../worker/lib/llm-result-delivery.js");
const gyeokgukGuard = require("../../lib/saju/gyeokguk-claim-guard.mjs");
const { NATAL_CORE_VERSION } = require("../../lib/saju/natal-core/version.mjs");
const rollout = require("../../worker/lib/engine-rollout.js");
const { buildShinsalFactsBlock } = require("../../lib/saju/shinsal-facts-block.mjs");
const lifeHistory = require("../../lib/life-calibration/personal-history-block.mjs");
const { GEMINI_INPUT_TOKEN_HARD_LIMIT } = require("../../lib/gemini-input-token-limit.mjs");
const source = fs.readFileSync(require.resolve("../../worker/routes/fortune.js"), "utf8");
const ast = ts.createSourceFile("fortune.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set([
  "handleSajuAIPrompt", "beginSajuAIConsultationGeneratingRecord", "saveSajuAIConsultationResultRecord",
  "sajuStorageError", "saveSajuAISectionCheckpoint", "validateSajuAISection", "validateSajuAIResultText", "findSajuAIUnsupportedAdvice",
  "dropSajuAIUnsupportedSentences", "buildSajuAIUnsupportedRepairLines", "buildSajuAISectionRetryLines", "sajuAIFinancialProductClaim",
  "runSajuAISectionWaves", "buildSajuAISectionPrompt", "buildSajuAISectionPromptPrefix", "buildSajuAISectionPromptSuffix",
  "formatSajuAIGroupChapterLines", "formatSajuAIOtherChapterTitles", "resolveSajuAIResultRubric", "formatSajuAIResultRubric",
  "normalizeSajuAIResultText", "normalizeSajuAIPersonaSummaryField", "extractSajuAIPersonaSummaries", "countSajuAIVisibleChars", "countSajuAIRequiredChapters", "hasSajuAINaturalEnding",
  "detectSajuAIIncompleteResult", "countSajuAICategoryMatches", "scoreSajuAISectionRow", "isSajuAISectionRowShort",
  "buildSajuAIStatusPayload", "mapSajuAIExecutionStatus", "buildSajuAIProgress", "normalizeSajuAIStoredResult",
  "findSajuAIExecutionForRead", "handleSajuAIConsultationStatus", "handleSajuAIConsultationResult",
  "sajuAIDeliveryV2Enabled", "isSajuAIDeliveryV2", "readSajuAIBestSectionText", "assembleSajuAIBestEffortText",
  "settleStuckDelivery", "readSajuAIPromptMonthlyRefundContext",
  "estimateSajuAIPromptTokens", "sajuAIShinsalBlock", "attachSajuAIShinsalBlock", "attachSajuAILifeHistoryBlock",
]);
const constants = new Set([
  "SAJU_AI_REQUIRED_CHAPTER_PATTERNS",
  "SAJU_AI_INCOMPLETE_TAIL_PATTERNS",
  "SAJU_AI_RESULT_FORBIDDEN_PATTERNS",
  "SAJU_AI_ELEMENT",
  "SAJU_AI_ELEMENT_STATE",
  "SAJU_AI_SENTENCE",
  "SAJU_AI_ELEMENT_MONEY",
  "SAJU_AI_ELEMENT_ORGAN",
  "sajuAIElementCausality",
  "SAJU_AI_FINANCIAL_PRODUCT",
  "SAJU_AI_FINANCIAL_ENDORSE",
  "SAJU_AI_FINANCIAL_NEGATION_WINDOW",
  "SAJU_AI_FINANCIAL_NEGATION",
  "SAJU_AI_RESULT_UNSUPPORTED_PATTERNS",
  "SAJU_AI_PROGRESS_STEPS",
  "SAJU_AI_PERSONA_SUMMARY_START",
  "SAJU_AI_PERSONA_SUMMARY_END",
  "SAJU_AI_PERSONA_SUMMARY_FIELDS",
  "SAJU_AI_DELIVERY_PLAN_VERSION",
  "SAJU_AI_SHINSAL_MAX_CHARS",
  "SAJU_AI_SHINSAL_MAX_LUCK",
  "SAJU_AI_SHINSAL_PROMPT_BUDGET",
]);
const extracted = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && names.has(node.name?.text)
  || ts.isVariableStatement(node) && node.declarationList.declarations.some((d) => constants.has(d.name.getText(ast))))
  .map((node) => node.getText(ast).replace(/^export /, "")).join("\n");
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const at = (obj, key) => key.split(".").reduce((value, part) => value?.[part], obj);
function set(obj, key, value) {
  const parts = key.split(".");
  const last = parts.pop();
  for (const part of parts) obj = obj[part] ||= {};
  obj[last] = clone(value);
}
function matches(obj, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some((item) => matches(obj, item));
    const actual = at(obj, key);
    if (value && typeof value === "object") {
      if ("$exists" in value) return (actual !== undefined) === value.$exists;
      if ("$in" in value) return value.$in.includes(actual);
      if ("$regex" in value) return new RegExp(value.$regex).test(actual || "");
    }
    return actual === value;
  });
}
function groupBody(group) {
  return group.chapters.map((chapter) => {
    let body = "";
    for (let i = 0; quality.countPaidReportBodyChars(body) < Math.ceil(group.minChars / group.chapters.length) + 80; i += 1) {
      body += `${chapter.no}장 ${i}번째 장면에서 진로 직업 재물 관계 연애 건강의 선택과 습관을 살펴보세요. 지금의 명식 근거를 생활 계획에 연결하는 순서 ${chapter.no}-${i}를 확인합니다.\n`;
    }
    return `${chapter.no}. ${chapter.title}\n${body}`;
  }).join("\n\n");
}
// 기존 테스트는 1판 기록으로 돈다(끄는 스위치). 2판 테스트는 env {}(기본 켜짐)로 새 기록을 만든다.
const V1_ENV = { SAJU_AI_DELIVERY_V2_ENABLED: "false" };
function harness(mode = "single", env = V1_ENV) {
  let record = null;
  let tick = 0;
  let fault = "";
  const charges = new Set();
  const calls = [];
  const ctx = {
    toAiLocale, getAmbientAiLocale: () => 'ko',
    ...prompt, ...quality, ...gyeokgukGuard, NATAL_CORE_VERSION, isCompleteLlmResponse,
    selectShinsalFacts: rollout.selectShinsalFacts, shinsalFactsPinned: rollout.shinsalFactsPinned, selectLifeCalibration: rollout.selectLifeCalibration, lifeCalibrationPinned: rollout.lifeCalibrationPinned, ...lifeHistory, buildShinsalFactsBlock, GEMINI_INPUT_TOKEN_HARD_LIMIT, Request, Response, Headers, Date, crypto: webcrypto,
    console: { info() {}, warn() {}, error() {} },
    SAJU_AI_PROMPT_ACCESS_MODE: "per_use", SAJU_AI_PROMPT_AMOUNT_KRW: 20000,
    SAJU_AI_RESULT_SYSTEM_PROMPT: "mock", FEATURE_AI_LLM_BUDGET_MS: 80000,
    SAJU_AI_SECTION_TIMEOUT_MS: 35000, SAJU_AI_SECTION_REPAIR_MIN_REMAINING_MS: 20000,
    SAJU_AI_SECTION_REPAIR_TIMEOUT_MS: 30000, SAJU_AI_SECTION_REPAIR_MAX_OUTPUT_TOKENS: 9600,
    readJson: (req) => req.json(), json: (data, init) => Response.json(data, init),
    buildSajuAIPromptError: (code, message, status, details = {}) => Response.json({ ok: false, code, message, ...details }, { status }),
    buildSajuAIPromptPaymentRequiredError: () => Response.json({ ok: false, code: "PAYMENT_REQUIRED" }, { status: 402 }),
    buildSajuAILlmRetryableError: (details) => Response.json({ ok: false, ...details }, { status: 503 }),
    buildSajuAIPromptWithDomain: () => ({ prompt: "same", digestSource: "same", domain: "life_direction", promptVersion: "v7", factSnapshot: {}, categoryRubric: { validationKeywords: [["진로"], ["직업"], ["재물"], ["관계"]] } }),
    resolveSajuAIProfileIdForConsultation: () => "profile", sha256Hex: async (text) => text,
    readAIPromptRequestId: (body) => body.idempotencyKey || body.requestId,
    buildSajuAIResultId: (id) => `result:${id}`,
    buildSajuAIPromptExecutionId: ({ userId, requestId }) => `${userId}:${requestId}`,
    primePromptTemplateOverrides: async () => {}, withMongoRetry: async (_env, fn) => fn(),
    findAIPromptPaidAccessEvidence: async () => ({ paid: true }),
    handlePigCoinConsume: async (req) => { const body = await req.json(); charges.add(body.requestId); return Response.json({ ok: true, accessMethod: mode }); },
    readSajuAIPromptPaymentIdentity: (_consume, _body, requestId) => ({ paymentId: requestId, orderId: requestId }),
    normalizeSajuAIPromptAccessMethod: () => mode,
    isSajuAIPromptStaleGeneratingExecution: (row) => row.stale === true,
    resolveSajuAIPromptFailureBilling: (row) => ({ refundOnFailure: row?.status === "generation_failed", skipCacheRead: row?.status === "generation_failed" }),
    createLlmCacheStore: () => null, cmsPromptText: async (_env, _key, fallback) => fallback,
    featureAiCallTimeoutMs: () => 30000, createGeminiContextCache: async () => null, deleteGeminiContextCache: async () => {},
    logSajuAIPromptStage: () => {}, validateSajuMyeongsikTenGodText: (text) => ({ ok: !text.includes("십성모순") }),
    buildSajuAIPromptResultPayload: ({ resultText, requestId, resultId }) => ({ ok: true, status: "completed", resultText, requestId, resultId }),
    refundSajuAIPromptMonthlyCredit: jest.fn(async () => ({ attempted: false, refundOk: false })),
    readSajuAIPromptPointRefundContext: () => ({}),
    reapStaleSajuAIExecution: async (row) => row,
    fetch: () => { throw new Error("External network forbidden"); },
  };
  ctx.callGeminiText = jest.fn(async (_env, text) => {
    const block = text.slice(text.indexOf("[이번에 쓸 챕터]"), text.indexOf("다음 챕터"));
    const group = prompt.SAJU_AI_SECTION_GROUPS.find((g) => g.chapters.every((c) => block.includes(`${c.no}. ${c.title}`)));
    calls.push(group.key);
    return { ok: true, text: fault === "short" ? "짧은 본문입니다." : groupBody(group), model: "mock", provider: "mock" };
  });
  ctx.PaidExecutionRecord = {
    findOne: (filter) => {
      const query = { sort: () => query, lean: async () => {
        if (fault === "confirm" && record?.status === "completed") throw new Error("read lost");
        return record && matches(record, filter) ? clone(record) : null;
      } }; return query;
    },
    findOneAndUpdate: (filter, update, options) => {
      const apply = async () => {
        if (fault === "checkpoint" && update.$set?.["result.sections"]) throw new Error("write lost");
        if (fault === "null" && update.$set?.["result.sections"]) return null;
        if (fault === "final" && update.$set?.status === "completed") throw new Error("final write lost");
        const existing = record && matches(record, filter);
        if (!existing && !options?.upsert) return null;
        if (!existing && record) { const error = new Error("duplicate"); error.code = 11000; throw error; }
        if (!existing) record = clone(update.$setOnInsert || {});
        for (const [key, value] of Object.entries(update.$set || {})) set(record, key, value);
        for (const key of Object.keys(update.$unset || {})) delete record[key];
        record.updatedAt = String(++tick);
        return clone(record);
      };
      const promise = apply();
      promise.lean = () => promise;
      return promise;
    },
    updateOne: async (filter, update) => {
      if (record && matches(record, filter)) for (const [key, value] of Object.entries(update.$set || {})) set(record, key, value);
      return { acknowledged: true };
    },
  };
  ctx.validateSajuNatalPayload = () => {}; // isolated persistence harness; natal contract tested separately
  vm.createContext(ctx); vm.runInContext(extracted, ctx);
  const body = { question: "앞으로 진로를 어떻게 정할까요", domain: "life_direction", sajuResult: {}, requestId: "same" };
  return {
    ctx, calls, charges,
    record: () => record, seed: (value) => { record = clone(value); }, fault: (value) => { fault = value; },
    post: (input = body, owner = "owner") => ctx.handleSajuAIPrompt(new Request("https://mock.invalid/create", { method: "POST", body: JSON.stringify(input) }), { userId: owner }, env),
    setEnv: (value) => { env = value; },
  };
}

test.each(AI_OUTPUT_LOCALES)('saved Saju language %s overrides later request language',async(locale)=>{
 const h=harness('pass');h.ctx.getAmbientAiLocale=()=>locale;
 await h.post();expect(h.record().result.resumeBody.locale).toBe(locale);
 h.ctx.getAmbientAiLocale=()=>locale==='ko'?'ja':'ko';
 for(let i=0;i<4;i++)await h.post();
 expect(h.record().status).toBe('completed');
 expect(h.ctx.callGeminiText.mock.calls).toHaveLength(5);
 for(const args of h.ctx.callGeminiText.mock.calls)expect(args[2].locale).toBe(locale);
 await h.post();expect(h.ctx.callGeminiText.mock.calls).toHaveLength(5);
 expect(h.charges.size).toBe(1);
});

describe.each(["pass", "monthly", "single"])("%s saved paid report", (mode) => {
  test("five stages preserve prior chapters, complete only after confirmed save and reuse without generation", async () => {
    const h = harness(mode);
    for (let index = 0; index < 5; index += 1) {
      const res = await h.post();
      const data = await res.json();
      expect(res.status).toBe(index === 4 ? 200 : 202);
      expect(data.saved).toBe(index === 4);
      expect(h.calls).toHaveLength(index + 1);
    }
    expect(quality.countPaidReportBodyChars(h.record().result.consultation.resultText)).toBeGreaterThanOrEqual(9600);
    expect((await h.post()).status).toBe(200);
    expect(h.calls).toHaveLength(5);
    expect(h.charges.size).toBe(1);
  });
  test.each(["checkpoint", "null", "final", "confirm"])("%s failure retains proof and never refunds or falsely completes", async (fault) => {
    const h = harness(mode);
    if (["final", "confirm"].includes(fault)) for (let i = 0; i < 4; i += 1) await h.post();
    h.fault(fault);
    const res = await h.post();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, reason: "RESULT_STORAGE_UNAVAILABLE", retryable: true, resultId: "result:same" });
    expect(h.ctx.refundSajuAIPromptMonthlyCredit).not.toHaveBeenCalled();
    expect(h.record().status).not.toBe("generation_failed");
    h.fault("");
    if (["final", "confirm"].includes(fault)) {
      expect((await h.post({ resumeJobId: "owner:same" })).status).toBe(200);
      expect(h.calls).toHaveLength(5);
    }
  });
  test("short output never becomes completed", async () => {
    const h = harness(mode); h.fault("short");
    expect((await h.post()).status).toBe(503);
    expect(h.record().status).toBe("generation_failed");
    expect(h.calls).toHaveLength(1);
  });
  test("duplicate requests use one claim and reject another account or refunded proof", async () => {
    const h = harness(mode);
    const responses = await Promise.all([h.post(), h.post()]);
    expect(responses.every((res) => res.status === 202)).toBe(true);
    expect(h.calls).toHaveLength(1);
    expect((await h.post({ resumeJobId: "owner:same" }, "other")).status).toBe(404);
    h.record().result.order.paymentStatus = "REFUNDED";
    expect((await h.post({ resumeJobId: "owner:same" })).status).toBe(402);
    expect(h.calls).toHaveLength(1);
  });
});

test("body count excludes headings, markup, whitespace and TOC; 19999/20000 boundary", () => {
  for (const length of [19999, 20000]) {
    expect(quality.countPaidReportBodyChars(`# 제목\n1. 목차\n- [챕터](#chapter)\n**${"가".repeat(length)}** \n`)).toBe(length);
  }
  expect(quality.hasRepeatedReportPassage(`${"긴문장".repeat(30)}.\n${"긴문장".repeat(30)}.`)).toBe(true);
});


describe("length-only chapter recovery", () => {
  const shortGroup = (group, paragraphs = 4) => group.chapters.map(chapter =>
    `${chapter.no}. ${chapter.title}\n` + Array.from({ length: paragraphs }, (_, i) =>
      `${chapter.no}장 ${i}번째 진로 직업 재물 관계 연애 건강의 선택을 명식과 연결해서 살펴보세요. 장면 ${chapter.no}-${i}는 생활 속에서 확인할 근거와 실행할 조언을 따로 정리합니다.`).join("\n")
  ).join("\n\n");
  test.each(["shorter", "empty", "repeated", "grounding", "cross-repeat"])("a valid short draft needs no %s repair", async kind => {
    const h = harness();
    const group = prompt.SAJU_AI_SECTION_GROUPS[0];
    const draft = shortGroup(group);
    const repeat = "이 문장은 상대방의 속도를 존중하면서 자신의 선택을 점검하고 현실에서 실행할 수 있는 행동을 정리하는 데 쓰이는 반복된 상담 문장입니다.";
    h.ctx.callGeminiText.mockReset().mockResolvedValueOnce({ ok: true, text: draft });
    let repaired = kind === "empty" ? "" : kind === "shorter" ? shortGroup(group, 2) : groupBody(group);
    if (kind === "repeated") repaired += "\n" + Array(4).fill(repeat).join("\n");
    if (kind === "grounding") repaired += "\n십성모순입니다.";
    if (kind === "cross-repeat") {
      // First obtain another paid checkpoint, then retry a short second group with a shared passage.
      h.ctx.callGeminiText.mockReset().mockResolvedValueOnce({ ok: true, text: groupBody(group) });
      await h.post();
      const second = prompt.SAJU_AI_SECTION_GROUPS[1];
      const secondDraft = shortGroup(second);
      repaired = groupBody(second) + "\n" + groupBody(group).split("\n").slice(1, 3).join("\n");
      h.ctx.callGeminiText.mockResolvedValueOnce({ ok: true, text: secondDraft }).mockResolvedValueOnce({ ok: true, text: repaired });
      expect((await h.post()).status).toBe(202);
      expect(h.record().result.sections[1]).toMatchObject({ text: secondDraft, valid: true });
      return;
    }
    h.ctx.callGeminiText.mockResolvedValueOnce({ ok: true, text: repaired });
    expect((await h.post()).status).toBe(202);
    expect(h.record().result.sections[0]).toMatchObject({ text: draft, valid: true, attempts: 1 });
    expect(h.ctx.callGeminiText).toHaveBeenCalledTimes(1);
  });
  test("a saved short draft stays partial when this request has no repair time left", async () => {
    const h = harness();
    h.ctx.SAJU_AI_SECTION_REPAIR_MIN_REMAINING_MS = 1000000;
    const draft = shortGroup(prompt.SAJU_AI_SECTION_GROUPS[0]);
    h.ctx.callGeminiText.mockResolvedValue({ ok: true, text: draft });
    expect((await h.post()).status).toBe(202);
    expect(h.record().status).toBe("partial");
    expect(h.record().result.sections[0]).toMatchObject({ text: draft, valid: true, attempts: 1 });
    expect(h.ctx.refundSajuAIPromptMonthlyCredit).not.toHaveBeenCalled();
  });
  test("last reservation interruption revalidates saved drafts without another call", async () => {
    const h = harness();
    await h.post();
    h.record().status = "partial";
    h.record().result.sections = prompt.SAJU_AI_SECTION_GROUPS.map(group => ({ key: group.key, text: groupBody(group), attempts: 4, valid: false }));
    const calls = h.ctx.callGeminiText.mock.calls.length;
    expect((await h.post()).status).toBe(200);
    expect(h.ctx.callGeminiText).toHaveBeenCalledTimes(calls);
  });
  test("short total completes with one call per group and no refund", async () => {
    const h = harness();
    h.ctx.callGeminiText.mockImplementation(async (_env, text) => {
      const block = text.slice(text.indexOf("[이번에 쓸 챕터]"), text.indexOf("다음 챕터"));
      const group = prompt.SAJU_AI_SECTION_GROUPS.find(g => g.chapters.every(c => block.includes(`${c.no}. ${c.title}`)));
      return { ok: true, text: shortGroup(group) };
    });
    let completed = null;
    for (let i = 0; i < 12; i += 1) {
      const response = await h.post();
      if (response.status === 200) { completed = response; break; }
      expect(response.status).toBe(202);
    }
    expect(completed?.status).toBe(200);
    const completedData = await completed.json();
    expect(h.record().status).toBe("completed");
    expect(quality.countPaidReportBodyChars(completedData.resultText)).toBeLessThan(prompt.SAJU_AI_MIN_RESULT_CHARS);
    const calls = h.ctx.callGeminiText.mock.calls.length;
    expect(calls).toBe(prompt.SAJU_AI_SECTION_GROUPS.length);
    const res = await h.post();
    expect(res.status).toBe(200);
    expect((await res.json()).saved).toBe(true);
    expect(h.ctx.callGeminiText).toHaveBeenCalledTimes(calls);
    expect(h.ctx.refundSajuAIPromptMonthlyCredit).not.toHaveBeenCalled();
  });
});

describe("rejected section recovery", () => {
  const first = prompt.SAJU_AI_SECTION_GROUPS[0];
  const withSentence = (text, sentence) => text.replace(/\n/, `\n${sentence}\n`);
  test("numbered sub-headings inside a chapter are body text", () => {
    const h = harness();
    const group = prompt.SAJU_AI_SECTION_GROUPS.find(g => g.key === "life_domains");
    const text = groupBody(group).replace(/\n/, "\n**1) 일(직업) 리듬**\n").replace(/\n(?=[^\n]*\n[^\n]*$)/, "\n2. 돈의 흐름\n");
    expect(h.ctx.validateSajuAISection(text, group, {}, { lengthRepair: true })).toBe(true);
    expect(h.ctx.validateSajuAISection(`${text}\n\n1. ${prompt.SAJU_AI_SECTION_GROUPS[0].chapters[0].title}\n본문`, group, {}, { lengthRepair: true })).toBe(false);
  });
  test("a sentence-scoped unsupported claim is dropped instead of discarding the draft", async () => {
    const h = harness();
    const claim = "금 기운이 강해 연봉이 오르고 승진이 빨라집니다.";
    h.ctx.callGeminiText.mockReset().mockResolvedValueOnce({ ok: true, text: withSentence(groupBody(first), claim) });
    expect((await h.post()).status).toBe(202);
    expect(h.record().result.sections[0]).toMatchObject({ valid: true, attempts: 1 });
    expect(h.record().result.sections[0].text).not.toContain(claim);
    expect(h.ctx.callGeminiText).toHaveBeenCalledTimes(1);
  });
  test("the second attempt is told why the first was rejected, within two calls", async () => {
    const h = harness();
    const claim = "부동산 시장의 흐름을 함께 봅니다. 이 시기에는 그 선택이 현명하다고 추천합니다.";
    h.ctx.callGeminiText.mockReset()
      .mockResolvedValueOnce({ ok: true, text: withSentence(groupBody(first), claim) })
      .mockResolvedValueOnce({ ok: true, text: groupBody(first) });
    expect((await h.post()).status).toBe(503);
    expect(h.record().result.sections[0]).toMatchObject({ valid: false, attempts: 1, lastFailure: "specific-financial-product" });
    expect((await h.post()).status).toBe(202);
    expect(h.ctx.callGeminiText.mock.calls[1][1]).toContain("specific-financial-product 유형의 근거 밖 인과·조언");
    expect(h.record().result.sections[0]).toMatchObject({ valid: true, attempts: 2 });
    expect(h.ctx.callGeminiText).toHaveBeenCalledTimes(2);
  });
  test("a MAX_TOKENS cut is not salvaged and the retry gets twice the token budget", async () => {
    const h = harness();
    h.ctx.callGeminiText.mockReset()
      .mockResolvedValueOnce({ ok: true, text: groupBody(first).slice(0, -30), finishReason: "MAX_TOKENS" })
      .mockResolvedValueOnce({ ok: true, text: groupBody(first) });
    expect((await h.post()).status).toBe(503);
    expect(h.ctx.callGeminiText.mock.calls[0][2]).toMatchObject({ maxOutputTokens: prompt.SAJU_AI_SECTION_MAX_OUTPUT_TOKENS });
    expect(h.ctx.callGeminiText.mock.calls[0][2].preserveTermination).toBeUndefined();
    expect(h.record().result.sections[0]).toMatchObject({ valid: false, attempts: 1, truncated: true });
    expect((await h.post()).status).toBe(202);
    expect(h.ctx.callGeminiText.mock.calls[1][2].maxOutputTokens).toBe(prompt.SAJU_AI_SECTION_MAX_OUTPUT_TOKENS * 2);
    expect(h.record().result.sections[0]).toMatchObject({ valid: true, attempts: 2 });
    expect(h.record().result.sections[0].truncated).toBeUndefined();
  });
  test("a locally recovered cut that fails validation also gets twice the token budget", async () => {
    const h = harness();
    h.ctx.callGeminiText.mockReset()
      .mockResolvedValueOnce({ ok: true, text: "1.\n\n짧게 남은 문장입니다.", finishReason: "LOCAL_RECOVERY", recoveredLocally: true })
      .mockResolvedValueOnce({ ok: true, text: groupBody(first) });
    expect((await h.post()).status).toBe(503);
    expect(h.record().result.sections[0]).toMatchObject({ valid: false, attempts: 1, truncated: true });
    expect((await h.post()).status).toBe(202);
    expect(h.ctx.callGeminiText.mock.calls[1][2].maxOutputTokens).toBe(prompt.SAJU_AI_SECTION_MAX_OUTPUT_TOKENS * 2);
  });
});

// ── 배달 2판 (새 기록만, 끄는 스위치 SAJU_AI_DELIVERY_V2_ENABLED=false) ──
describe("delivery plan v2", () => {
  const { createHash } = require("node:crypto");
  const sha = (text) => createHash("sha256").update(String(text)).digest("hex");
  const groupOf = (text) => {
    const block = text.slice(text.indexOf("[이번에 쓸 챕터]"), text.indexOf("다음 챕터"));
    return prompt.SAJU_AI_SECTION_GROUPS.find((g) => g.chapters.every((c) => block.includes(`${c.no}. ${c.title}`)));
  };
  async function drive(h, limit = 20) {
    const statuses = [];
    for (let i = 0; i < limit; i += 1) {
      const res = await h.post();
      statuses.push(res.status);
      if (res.status !== 202) return { res, statuses };
    }
    return { res: null, statuses };
  }

  test("new records carry deliveryPlanVersion 2; kill switch and existing v1 records stay v1", async () => {
    const v2 = harness("single", {});
    await v2.post();
    expect(v2.record().result.deliveryPlanVersion).toBe(2);
    const off = harness("single", { SAJU_AI_DELIVERY_V2_ENABLED: "false" });
    await off.post();
    expect(off.record().result.deliveryPlanVersion).toBeUndefined();
    // 1판으로 시작한 기록은 스위치를 켠 뒤에도 1판으로 끝난다.
    const legacy = harness("single", V1_ENV); legacy.fault("short");
    expect((await legacy.post()).status).toBe(503);
    legacy.setEnv({});
    await legacy.post();
    expect(legacy.record().result.deliveryPlanVersion).toBeUndefined();
    expect(legacy.record().status).toBe("generation_failed");
  });

  test("v1 and v2 send byte-identical prompts (sha256)", async () => {
    const v1 = harness("single", V1_ENV); const v2 = harness("single", {});
    for (let i = 0; i < 5; i += 1) { await v1.post(); await v2.post(); }
    const a = v1.ctx.callGeminiText.mock.calls.map((args) => sha(args[1]));
    const b = v2.ctx.callGeminiText.mock.calls.map((args) => sha(args[1]));
    expect(a).toHaveLength(5);
    expect(b).toEqual(a);
    expect(v2.record().status).toBe("completed");
  });

  test("an invalid group with attempts left returns a 202 checkpoint instead of failing", async () => {
    const h = harness("single", {}); h.fault("short");
    const res = await h.post();
    expect(res.status).toBe(202);
    expect(h.record().status).toBe("partial");
    expect(h.record().result.sections[0]).toMatchObject({ valid: false, attempts: 1 });
    expect(h.ctx.refundSajuAIPromptMonthlyCredit).not.toHaveBeenCalled();
  });

  test("one group that never validates: other groups continue and the best text is delivered without refund", async () => {
    const h = harness("single", {});
    const broken = prompt.SAJU_AI_SECTION_GROUPS[2];
    const claim = "금 기운이 강해 연봉이 오르고 승진이 빨라집니다. 그래서 부동산 투자를 추천합니다.";
    h.ctx.callGeminiText.mockImplementation(async (_env, text) => {
      const group = groupOf(text);
      // 장 제목이 하나 빠지고 근거 밖 조언이 든 초안 — 구조 검증을 끝내 통과하지 못한다.
      if (group.key === broken.key) return { ok: true, text: `${groupBody(group).split(`\n\n${group.chapters[1].no}.`)[0]}\n${claim}\n`, model: "mock", provider: "mock" };
      return { ok: true, text: groupBody(group), model: "mock", provider: "mock" };
    });
    const { res, statuses } = await drive(h);
    expect(statuses.slice(0, -1).every((status) => status === 202)).toBe(true);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(h.record().status).toBe("completed");
    expect(data.resultText).toContain(`${broken.chapters[0].no}. ${broken.chapters[0].title}`);
    expect(data.resultText).not.toContain("승진이 빨라집니다");
    expect(data.qualityWarning).toBeTruthy();
    expect(h.ctx.callGeminiText).toHaveBeenCalledTimes(6);
    expect(h.ctx.refundSajuAIPromptMonthlyCredit).not.toHaveBeenCalled();
  });

  test("all groups short: delivers the drafts that exist instead of failing or stalling", async () => {
    const h = harness("single", {}); h.fault("short");
    const { res } = await drive(h);
    expect(res?.status).toBe(200);
    expect(h.record().status).toBe("completed");
    expect((await res.json()).resultText).toContain("짧은 본문입니다.");
    expect(h.ctx.callGeminiText).toHaveBeenCalledTimes(prompt.SAJU_AI_SECTION_GROUPS.length * 2);
    expect(h.ctx.refundSajuAIPromptMonthlyCredit).not.toHaveBeenCalled();
  });

  test("refunds only when no section has any text", async () => {
    const h = harness("single", {});
    h.ctx.callGeminiText.mockImplementation(async () => ({ ok: true, text: "", model: "mock", provider: "mock" }));
    const { res } = await drive(h);
    expect(res?.status).toBe(503);
    expect(h.record().status).toBe("generation_failed");
    expect(h.ctx.refundSajuAIPromptMonthlyCredit).not.toHaveBeenCalled();
    const calls = h.ctx.callGeminiText.mock.calls.length;
    // 두 번째 실패(2-스트라이크)에서 환불한다. 시도가 다 쓰여 더 부르지 않는다.
    expect((await h.post()).status).toBe(503);
    expect(h.ctx.refundSajuAIPromptMonthlyCredit).toHaveBeenCalledTimes(1);
    expect(h.ctx.callGeminiText).toHaveBeenCalledTimes(calls);
  });

  test("a final quality failure resets attempts once, then delivers the scrubbed text with a warning", async () => {
    const h = harness("single", {});
    const original = h.ctx.validateSajuAIResultText;
    h.ctx.validateSajuAIResultText = (...args) => ({ ...original(...args), ok: false, reason: "cross-chapter" });
    for (let i = 0; i < 5; i += 1) expect((await h.post()).status).toBe(202);
    expect(h.record().result.sections.find((row) => row.key === "life_domains"))
      .toMatchObject({ valid: false, qualityRepair: true, attempts: 0, qualityRepairs: 1 });
    const { res, statuses } = await drive(h);
    expect(statuses).toEqual([202, 200]);
    expect(h.record().status).toBe("completed");
    expect((await res.json()).qualityWarning).toBe("cross-chapter");
    expect(h.ctx.callGeminiText).toHaveBeenCalledTimes(7);
    expect(h.ctx.refundSajuAIPromptMonthlyCredit).not.toHaveBeenCalled();
  });

  test("v1 keeps throwing on a final quality failure", async () => {
    const h = harness("single", V1_ENV);
    const original = h.ctx.validateSajuAIResultText;
    h.ctx.validateSajuAIResultText = (...args) => ({ ...original(...args), ok: false, reason: "cross-chapter" });
    const { res } = await drive(h);
    expect(res.status).toBe(503);
    expect(h.record().status).toBe("generation_failed");
    expect(h.record().result.sections.find((row) => row.key === "life_domains")).toMatchObject({ qualityRepair: true, attempts: 1 });
  });
});

// ── 신살 사실 블록 (S9, SAJU_SHINSAL_FACTS_V1 'saju-ai') ──
// 핀(result.shinsalFacts)은 새 기록에만 박힌다. 블록은 해시·다이제스트·기록 선점이 끝난 뒤 접두사에 한 번 붙고
// 해시·저장 결과·캐시 접미에는 들어가지 않는다. 실패나 예산 초과는 블록만 뺀다.
describe("shinsal facts block (SAJU_SHINSAL_FACTS_V1 saju-ai)", () => {
  const { createHash } = require("node:crypto");
  const sha = (text) => createHash("sha256").update(String(text)).digest("hex");
  const HEADER = "[신살 계산값";
  const ON = { ...V1_ENV, SAJU_SHINSAL_FACTS_V1: "saju-ai" };
  const SNAPSHOT = {
    pillars: { year: { stem: "甲", branch: "子" }, month: { stem: "丙", branch: "寅" }, day: { stem: "甲", branch: "申" }, hour: { stem: "癸", branch: "辰" } },
    luck: { luckRows: [
      { scope: "daewoon", stem: "己", branch: "巳", age: 24 },
      { scope: "daewoon", stem: "庚", branch: "午", age: 34 },
      { scope: "daewoon", stem: "辛", branch: "未", age: 44 },
      { scope: "sewoon", stem: "乙", branch: "巳", year: 2025 },
      { scope: "sewoon", stem: "丙", branch: "午", year: 2026 },
    ] },
  };
  const BODY = { question: "앞으로 진로를 어떻게 정할까요", domain: "life_direction", requestId: "same",
    sajuResult: { targetYear: 2026, engineContext: { quantumMyeongli: { currentAge: 37 } } } };
  // 지금 대운(37세 → 34세 庚午)과 상담 연도 세운(2026 丙午)만 고른 결과와 같아야 한다.
  const BLOCK = buildShinsalFactsBlock({
    pillars: SNAPSHOT.pillars, timeUnknown: false,
    luckRows: [{ scope: "daewoon", stem: "庚", branch: "午", age: 34 }, { scope: "sewoon", stem: "丙", branch: "午", year: 2026 }],
  }, { maxChars: 900, maxLuck: 12 });
  function run(env) {
    const h = harness("single", env);
    h.ctx.buildSajuAIPromptWithDomain = () => ({ prompt: "same", digestSource: "same", domain: "life_direction", promptVersion: "v7",
      factSnapshot: clone(SNAPSHOT), categoryRubric: { validationKeywords: [["진로"], ["직업"], ["재물"], ["관계"]] } });
    const post = (input = BODY) => h.post(input);
    const drive = async (limit = 20) => {
      const statuses = [];
      for (let i = 0; i < limit; i += 1) {
        const res = await post();
        statuses.push(res.status);
        if (res.status !== 202) break;
      }
      return statuses;
    };
    const prompts = () => h.ctx.callGeminiText.mock.calls.map((args) => args[1]);
    return { ...h, post, drive, prompts };
  }

  test("the block holds the natal lines, the current 대운 and the consultation-year 세운 only", () => {
    expect(BLOCK.startsWith(HEADER)).toBe(true);
    expect(BLOCK).toContain("대운 34세 庚午");
    expect(BLOCK).toContain("세운 2026년 丙午");
    expect(BLOCK).not.toMatch(/대운 (?:24|44)세|乙巳|현재/);
    expect(BLOCK.length).toBeLessThanOrEqual(900);
    const h = run(ON);
    expect(h.ctx.sajuAIShinsalBlock({ factSnapshot: SNAPSHOT }, BODY.sajuResult)).toBe(BLOCK);
    // 나이·연도를 모르면 운 줄 없이 원국만 낸다. 어느 대운이 지금인지 추정하지 않는다.
    const natal = h.ctx.sajuAIShinsalBlock({ factSnapshot: SNAPSHOT }, {});
    expect(natal.startsWith(HEADER)).toBe(true);
    expect(natal).not.toMatch(/대운|세운/);
    expect(h.ctx.sajuAIShinsalBlock(null, null)).toBe("");
  });

  test("off keeps the prompt bytes; on adds the block exactly once per chapter group and nothing else", async () => {
    const off = run(V1_ENV);
    const other = run({ ...V1_ENV, SAJU_SHINSAL_FACTS_V1: "love-codex,yearly" });
    const on = run(ON);
    expect(await off.drive()).toEqual([202, 202, 202, 202, 200]);
    expect(await other.drive()).toEqual([202, 202, 202, 202, 200]);
    expect(await on.drive()).toEqual([202, 202, 202, 202, 200]);
    expect(off.prompts()).toHaveLength(5);
    expect(other.prompts().map(sha)).toEqual(off.prompts().map(sha));
    for (const text of off.prompts()) expect(text).not.toContain(HEADER);
    on.prompts().forEach((text, index) => {
      expect(text.split(BLOCK)).toHaveLength(2);
      expect(text.length - off.prompts()[index].length).toBe(BLOCK.length + 2);
      expect(text.replace(`${BLOCK}\n\n`, "")).toBe(off.prompts()[index]);
    });
    expect(on.record().status).toBe("completed");
    expect(on.record().result.consultation.resultText).toBe(off.record().result.consultation.resultText);
  });

  test("payloadHash, resultId, promptDigest and the cache key suffix are identical on and off; the block is never stored", async () => {
    const off = run(V1_ENV); const on = run(ON);
    await off.post(); await on.post();
    expect(on.record().result.shinsalFacts).toBe("shinsal-facts-v1");
    expect(off.record().result.shinsalFacts).toBeUndefined();
    expect(on.record().result.payloadHash).toBe(off.record().result.payloadHash);
    expect(on.record().resultId).toBe(off.record().resultId);
    expect(JSON.stringify(on.record())).not.toContain(HEADER);
    await off.drive(); await on.drive();
    expect(on.record().result.promptDigest).toBe(off.record().result.promptDigest);
    const keys = (h) => h.ctx.callGeminiText.mock.calls.map((args) => args[2].cache?.keyExtra);
    expect(keys(on)).toEqual(keys(off));
    expect(keys(on).every((key) => key.startsWith(`v7|${NATAL_CORE_VERSION}-`))).toBe(true);
    expect(JSON.stringify(on.record())).not.toContain(HEADER);
  });

  test("the pin survives claim, checkpoint, a failed attempt, retry and resume without 409", async () => {
    const on = run(ON);
    on.fault("short");
    expect((await on.post()).status).toBe(503);
    expect(on.record()).toMatchObject({ status: "generation_failed", result: { shinsalFacts: "shinsal-facts-v1" } });
    on.fault("");
    const statuses = [(await on.post()).status];
    expect(on.record().result.shinsalFacts).toBe("shinsal-facts-v1");
    statuses.push((await on.post({ resumeJobId: "owner:same" })).status);
    expect(on.record().result.shinsalFacts).toBe("shinsal-facts-v1");
    statuses.push(...await on.drive());
    expect(statuses).not.toContain(409);
    expect(statuses.at(-1)).toBe(200);
    expect(on.record().status).toBe("completed");
    for (const text of on.prompts()) expect(text.split(BLOCK)).toHaveLength(2);
  });

  test("a record started off stays off after the flag turns on, and clearing the flag is a kill switch", async () => {
    const legacy = run(V1_ENV);
    expect((await legacy.post()).status).toBe(202);
    legacy.setEnv(ON);
    expect((await legacy.post()).status).toBe(202);
    expect(legacy.record().result.shinsalFacts).toBeUndefined();
    const legacyStatuses = await legacy.drive();
    expect(legacyStatuses).not.toContain(409);
    expect(legacyStatuses.at(-1)).toBe(200);
    expect(legacy.prompts()).toHaveLength(5);
    for (const text of legacy.prompts()) expect(text).not.toContain(HEADER);

    const pinned = run(ON);
    expect((await pinned.post()).status).toBe(202);
    expect(pinned.prompts()[0].split(BLOCK)).toHaveLength(2);
    pinned.setEnv(V1_ENV);
    expect((await pinned.post()).status).toBe(202);
    expect(pinned.record().result.shinsalFacts).toBe("shinsal-facts-v1");
    const pinnedStatuses = await pinned.drive();
    expect(pinnedStatuses).not.toContain(409);
    expect(pinnedStatuses.at(-1)).toBe(200);
    expect(pinned.prompts().slice(1).some((text) => text.includes(HEADER))).toBe(false);
  });

  test("an over-budget prompt or a failing block builder drops only the block and still delivers", async () => {
    const h = run(ON);
    const budget = vm.runInContext("SAJU_AI_SHINSAL_PROMPT_BUDGET", h.ctx);
    expect(budget).toBe(Math.floor(GEMINI_INPUT_TOKEN_HARD_LIMIT * 0.95));
    expect(h.ctx.estimateSajuAIPromptTokens("가1ab c")).toBe(4);
    const built = h.ctx.buildSajuAIPromptWithDomain();
    const largest = Math.max(...prompt.SAJU_AI_SECTION_GROUPS.map((group) =>
      h.ctx.estimateSajuAIPromptTokens(h.ctx.buildSajuAISectionPrompt({ ...built, shinsalBlock: BLOCK }, group))));
    const attach = () => h.ctx.attachSajuAIShinsalBlock(built, { env: ON, existingExecution: null, sajuResult: BODY.sajuResult });
    h.ctx.cmsPromptText = async () => "가".repeat(budget - largest);
    expect((await attach()).shinsalBlock).toBe(BLOCK);
    h.ctx.cmsPromptText = async () => "가".repeat(budget - largest + 1);
    expect(await attach()).toBe(built);

    const big = run(ON);
    big.ctx.cmsPromptText = async () => "가".repeat(budget);
    expect((await big.drive()).at(-1)).toBe(200);
    expect(big.prompts()).toHaveLength(5);
    for (const text of big.prompts()) expect(text).not.toContain(HEADER);

    const broken = run(ON);
    broken.ctx.buildShinsalFactsBlock = () => { throw new Error("shinsal build failed"); };
    expect((await broken.drive()).at(-1)).toBe(200);
    expect(broken.prompts()).toHaveLength(5);
    for (const text of broken.prompts()) expect(text).not.toContain(HEADER);
    expect(broken.record().status).toBe("completed");
  });

  test("a real prompt carries the block once per group, and an answer quoting it passes every validator", async () => {
    const h = run(ON);
    h.ctx.validateSajuMyeongsikTenGodText = prompt.validateSajuMyeongsikTenGodText;
    const gans = "甲乙丙丁戊己庚辛壬癸"; const zhis = "子丑寅卯辰巳午未申酉戌亥";
    const daewun = Array.from({ length: 9 }, (_, i) => ({ age: 4 + i * 10, gan: gans[(3 + i) % 10], zhi: zhis[(3 + i) % 12], score: 60, label: "t" }));
    const sajuResult = {
      profile: { name: "테스트", gender: "F", birth: { year: 1990, month: 3, day: 18, hour: 7, minute: 20 } },
      pillars: { y: { g: "甲", j: "子" }, m: { g: "丙", j: "寅" }, d: { g: "甲", j: "申" }, h: { g: "癸", j: "辰" } },
      power: { isStrong: true, yongshin: ["화"], kijishin: ["금"] }, targetYear: 2026,
      engineContext: { quantumMyeongli: { dayStem: "甲", monthBranch: "寅", currentAge: 37, elementMap: [], daewun } },
    };
    const built = prompt.buildSajuAIPromptWithDomain({ question: BODY.question, sajuResult, domain: "life_direction" });
    const block = h.ctx.sajuAIShinsalBlock(built, sajuResult);
    expect(block).toContain("대운 34세 庚午");
    expect(block).toContain("세운 2026년 丙午");
    const on = await h.ctx.attachSajuAIShinsalBlock(built, { env: ON, existingExecution: null, sajuResult });
    expect(on.shinsalBlock).toBe(block);
    for (const group of prompt.SAJU_AI_SECTION_GROUPS) {
      const withBlock = h.ctx.buildSajuAISectionPrompt(on, group);
      expect(withBlock.split(block)).toHaveLength(2);
      expect(withBlock.length - h.ctx.buildSajuAISectionPrompt(built, group).length).toBe(block.length + 2);
    }

    // 블록 줄을 그대로 옮긴 목록과 줄마다 풀어 쓴 산문을 첫 챕터에 넣는다.
    const lines = block.split("\n").filter((line) => line.startsWith("- ")).map((line) => line.slice(2));
    const prose = lines.map((line) => `${line.replace(/ · /, "에서 ")}로 잡혀 있어 성향의 보조 단서로만 참고합니다.`).join(" ");
    const quoteInto = (text) => text.replace(/\n/, `\n${block}\n${prose}\n`);
    const fact = h.ctx.gyeokgukClaimFact(built.factSnapshot?.majorStructures?.gyeokguk);
    const groups = prompt.SAJU_AI_SECTION_GROUPS.map((group, index) => (index === 0 ? quoteInto(groupBody(group)) : groupBody(group)));
    prompt.SAJU_AI_SECTION_GROUPS.forEach((group) => {
      const quoted = quoteInto(groupBody(group));
      expect(h.ctx.validateSajuAISection(quoted, group, built.factSnapshot)).toBe(true);
      expect(vm.runInContext("SAJU_AI_RESULT_FORBIDDEN_PATTERNS", h.ctx).some((pattern) => pattern.test(quoted))).toBe(false);
      expect(h.ctx.findSajuAIUnsupportedAdvice(quoted)).toBeNull();
      expect(prompt.validateSajuMyeongsikTenGodText(quoted, built.factSnapshot).ok).toBe(true);
      const guarded = h.ctx.correctGyeokgukText(quoted, fact);
      expect(guarded.replaced || guarded.dropped || 0).toBeFalsy();
    });
    const full = groups.join("\n\n");
    const result = h.ctx.validateSajuAIResultText(full, built.factSnapshot, { domain: "life_direction", categoryRubric: { validationKeywords: [["진로"], ["직업"], ["재물"], ["관계"]] } });
    expect(result.ok).toBe(true);
  });
});

// ── 인생 보정 블록 (P4, LIFE_CALIBRATION_V1 'saju-ai') ──
// 핀(result.lifeCalibration)은 새 기록에만 박힌다. 블록은 해시·기록 선점 뒤 접두사에 붙고 해시·저장 결과에는 들어가지 않는다.
// 계산 실패·동의 없음·예산 초과는 블록만 뺀다. 모순 가드는 블록을 받은 기록의 생성문에만 돈다.
describe("life history block (LIFE_CALIBRATION_V1 saju-ai)", () => {
  const { createHash } = require("node:crypto");
  const { computeLifeCalibration } = require("../../lib/life-calibration/life-calibration.mjs");
  const sha = (text) => createHash("sha256").update(String(text)).digest("hex");
  const HEADER = "[사용자가 직접 적은 지난 경험";
  const ON = { ...V1_ENV, LIFE_CALIBRATION_V1: "saju-ai" };
  const CALIBRATION = computeLifeCalibration({
    events: [[2015, "career", "good"], [2016, "money", "good"], [2019, "career", "bad"]].map(([year, domain, outcome]) => ({ year, month: null, domain, outcome, certainty: "sure" })),
    signals: [{ engine: "saju", version: "mock", status: "available", years: { 2015: { tone: "favorable" }, 2016: { tone: "unfavorable" }, 2019: { tone: "unfavorable" } }, months: {} }],
  });
  const BLOCK = lifeHistory.buildPersonalHistoryBlock(CALIBRATION);
  function run(env, load = async () => ({ status: "ok", cache: "hit", calibration: CALIBRATION })) {
    const h = harness("single", env);
    h.ctx.loadSajuAILifeCalibration = jest.fn(load);
    const drive = async (limit = 20) => {
      const statuses = [];
      for (let i = 0; i < limit; i += 1) {
        const res = await h.post();
        statuses.push(res.status);
        if (res.status !== 202) break;
      }
      return statuses;
    };
    const prompts = () => h.ctx.callGeminiText.mock.calls.map((args) => args[1]);
    return { ...h, drive, prompts };
  }

  test("off and other consumer ids keep the prompt bytes and never load the calibration", async () => {
    const off = run(V1_ENV); const api = run({ ...V1_ENV, LIFE_CALIBRATION_V1: "api,neo" });
    expect(await off.drive()).toEqual([202, 202, 202, 202, 200]);
    expect(await api.drive()).toEqual([202, 202, 202, 202, 200]);
    expect(api.prompts().map(sha)).toEqual(off.prompts().map(sha));
    for (const text of off.prompts()) expect(text).not.toContain(HEADER);
    expect(off.ctx.loadSajuAILifeCalibration).not.toHaveBeenCalled();
    expect(api.ctx.loadSajuAILifeCalibration).not.toHaveBeenCalled();
    expect(off.record().result.lifeCalibration).toBeUndefined();
    const built = { prompt: "p" };
    expect(await off.ctx.attachSajuAILifeHistoryBlock(built, { env: V1_ENV, existingExecution: null, auth: { userId: "u" }, profileId: "p" })).toBe(built);
  });

  test("on adds the block once per group, keeps hashes and stores neither block nor facts", async () => {
    const off = run(V1_ENV); const on = run(ON);
    expect(BLOCK.startsWith(HEADER)).toBe(true);
    await off.post(); await on.post();
    expect(on.record().result.lifeCalibration).toBe("life-calibration-v1");
    expect(off.record().result.lifeCalibration).toBeUndefined();
    expect(on.record().result.payloadHash).toBe(off.record().result.payloadHash);
    expect(on.record().resultId).toBe(off.record().resultId);
    expect(JSON.stringify(on.record())).not.toContain(HEADER);
    expect(await on.drive()).toEqual([202, 202, 202, 200]);
    await off.drive();
    expect(on.ctx.loadSajuAILifeCalibration.mock.calls[0][1]).toEqual({ uid: "owner", profileId: "profile" });
    on.prompts().forEach((text, index) => {
      expect(text.split(BLOCK)).toHaveLength(2);
      expect(text.replace(`${BLOCK}\n\n`, "")).toBe(off.prompts()[index]);
    });
    expect(on.record().result.promptDigest).toBe(off.record().result.promptDigest);
    expect(JSON.stringify(on.record())).not.toContain(HEADER);
    expect(JSON.stringify(on.record())).not.toContain("lifeHistoryFacts");
  });

  test("no consent, a failing loader or a kill switch drops only the block and still delivers", async () => {
    for (const load of [async () => ({ status: "consent-required" }), async () => { throw new Error("db down"); }]) {
      const h = run(ON, load);
      expect((await h.drive()).at(-1)).toBe(200);
      for (const text of h.prompts()) expect(text).not.toContain(HEADER);
      expect(h.record().status).toBe("completed");
    }
    const pinned = run(ON);
    expect((await pinned.post()).status).toBe(202);
    pinned.setEnv(V1_ENV);
    const statuses = await pinned.drive();
    expect(statuses).not.toContain(409);
    expect(statuses.at(-1)).toBe(200);
    expect(pinned.prompts().slice(1).some((text) => text.includes(HEADER))).toBe(false);
  });

  test("the contradiction guard swaps a sentence that reverses a reported year, only for pinned records", async () => {
    const wrong = "2015년 직업은 큰 시련이 이어진 해였어요.";
    const inject = (h) => {
      const base = h.ctx.callGeminiText.getMockImplementation();
      h.ctx.callGeminiText.mockImplementation(async (...args) => {
        const out = await base(...args);
        return { ...out, text: out.text.replace(/\n/, `\n${wrong}\n`) };
      });
    };
    const on = run(ON); inject(on);
    const off = run(V1_ENV); inject(off);
    expect((await on.drive()).at(-1)).toBe(200);
    expect((await off.drive()).at(-1)).toBe(200);
    const onText = on.record().result.consultation.resultText;
    expect(onText).not.toContain(wrong);
    expect(onText).toContain("2015년 직업 흐름은 겪은 대로 보세요.");
    expect(off.record().result.consultation.resultText).toContain(wrong);
  });
});

// 복구 크론 정체 확정(S16): 글이 하나도 없는 정체 건은 핸들러 실패 경로와 같은 환불 함수로 즉시 환불한다.
describe("stuck delivery settlement", () => {
  const NOW = Date.parse("2026-11-24T00:00:00.000Z");
  const stuck = (over = {}) => ({
    executionId: "owner:same", userId: "owner", requestId: "same", featureId: "saju_ai_question_prompt", status: "generating",
    updatedAt: "2026-11-20T00:00:00.000Z", deliveryWatch: { stalls: 6 },
    result: { leaseToken: "old", sections: [], order: { paymentStatus: "PAID", accessMethod: "single" },
      resumeBody: { question: "앞으로 진로를 어떻게 정할까요", requestId: "same", paymentMode: "COIN", transactionId: "tx1" } },
    ...over,
  });
  const routes = {
    coin: { point: { isPointSpend: true, chargedCoins: 200, sourceTransactionId: "tx1" }, fn: "handlePigCoinRefund" },
    card: { point: { isCardSpend: true, sourceTransactionId: "pay1" }, fn: "refundAIPromptCardPaymentOnFailure" },
    pass: { point: { isPassSpend: true }, fn: "restoreAIPromptPassOnFailure" },
    monthly: { point: {}, consume: { accessType: "membership_credit", membershipCreditCost: 3, ledgerId: "507f1f77bcf86cd799439011" }, fn: "refundSajuAIPromptMonthlyCredit" },
  };
  function settler(route = "coin", ok = true, record = stuck()) {
    const h = harness("single");
    const spec = routes[route];
    Object.assign(h.ctx, {
      connectDb: async () => {}, STUCK_LIVE_LEASE_MS: 120000, SAJU_AI_PROMPT_STALE_GENERATING_MS: 120000,
      SAJU_AI_PROMPT_FEATURE_KEY: "saju_ai_question_prompt", SAJU_AI_PROMPT_PRICE: 200,
      findAIPromptPaidAccessEvidence: jest.fn(async () => ({ source: "point_history", record: { _id: "tx1" } })),
      buildAIPromptVerifiedConsumePayload: jest.fn(() => ({ accessMethod: "COIN", ...(spec.consume || {}) })),
      readSajuAIPromptPointRefundContext: () => spec.point,
      normalizeSajuAIPromptAccessMethod: () => (route === "monthly" ? "monthly" : "single"),
      handlePigCoinRefund: jest.fn(async () => Response.json({ ok }, { status: ok ? 200 : 409 })),
      refundAIPromptCardPaymentOnFailure: jest.fn(async () => ({ refunded: ok })),
      restoreAIPromptPassOnFailure: jest.fn(async () => ok),
      refundSajuAIPromptMonthlyCredit: jest.fn(async () => ({ attempted: route === "monthly", refundOk: route === "monthly" && ok })),
      logStuckSettled: jest.fn(), logStuckUnsettled: jest.fn(),
    });
    h.seed(record);
    return { h, spec, run: () => h.ctx.settleStuckDelivery({}, { doc: { executionId: "owner:same", userId: "owner" }, now: NOW }) };
  }
  const refundFns = ["handlePigCoinRefund", "refundAIPromptCardPaymentOnFailure", "restoreAIPromptPassOnFailure"];

  test.each(Object.keys(routes))("%s payment with no saved text is refunded and recorded as refunded", async (route) => {
    const { h, spec, run } = settler(route);
    expect(await run()).toEqual({ outcome: "generation_failed", refundStatus: "refunded" });
    expect(h.ctx[spec.fn]).toHaveBeenCalledTimes(1);
    for (const fn of refundFns.filter((name) => name !== spec.fn)) expect(h.ctx[fn]).not.toHaveBeenCalled();
    expect(h.ctx.findAIPromptPaidAccessEvidence.mock.calls[0][0]).toMatchObject({ auth: { userId: "owner" }, requestId: "same", body: { transactionId: "tx1" } });
    if (route === "coin") expect(await h.ctx.handlePigCoinRefund.mock.calls[0][0].json()).toMatchObject({ cost: 200, sourceTransactionId: "tx1", requestId: "refund:same" });
    expect(h.record()).toMatchObject({ status: "generation_failed", error: { code: "GENERATION_FAILED_REFUNDED" }, result: { order: { paymentStatus: "REFUNDED" } } });
    expect(h.ctx.logStuckSettled).toHaveBeenCalledWith(expect.objectContaining({ service: "fortune", outcome: "generation_failed", refundStatus: "refunded" }));
  });

  test("a refund that does not go through keeps the payment for a free retry", async () => {
    const { h, run } = settler("coin", false);
    expect(await run()).toEqual({ outcome: "generation_failed", refundStatus: "pending" });
    expect(h.record()).toMatchObject({ status: "generation_failed", error: { code: "LLM_GENERATION_RETRYABLE" }, result: { order: { paymentStatus: "PAID" } } });
    expect(h.ctx.logStuckUnsettled).toHaveBeenCalled();
  });

  test.each([
    ["saved text", stuck({ result: { ...stuck().result, sections: [{ key: "a", text: "이미 저장된 상담 본문입니다." }] } }), "unsettled"],
    ["a live lease", stuck({ updatedAt: new Date(NOW - 30000).toISOString() }), "leased"],
    ["a refunded order", stuck({ result: { ...stuck().result, order: { paymentStatus: "REFUNDED" } } }), "unsettled"],
    ["no stored input", stuck({ result: { ...stuck().result, resumeBody: undefined } }), "unsettled"],
    ["missing payment proof", stuck(), "unsettled"],
    ["a finished record", stuck({ status: "completed" }), "progressed"],
  ])("%s never moves money", async (label, record, outcome) => {
    const { h, run } = settler("coin", true, record);
    if (label === "missing payment proof") h.ctx.findAIPromptPaidAccessEvidence.mockResolvedValue(null);
    expect((await run()).outcome).toBe(outcome);
    for (const fn of [...refundFns, "refundSajuAIPromptMonthlyCredit"]) expect(h.ctx[fn]).not.toHaveBeenCalled();
    expect(h.record().status).toBe(record.status);
  });
});
