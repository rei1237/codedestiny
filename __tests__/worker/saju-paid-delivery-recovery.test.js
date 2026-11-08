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
    ...prompt, ...quality, ...gyeokgukGuard, NATAL_CORE_VERSION, isCompleteLlmResponse, Request, Response, Headers, Date, crypto: webcrypto,
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
    record: () => record, fault: (value) => { fault = value; },
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
