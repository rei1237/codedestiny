/** @jest-environment node */
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const quality = require("../../worker/lib/paid-report-quality.js");
const lovePrompt = require("../../worker/lib/love-secret-ai-prompt.js");
const clone = value => JSON.parse(JSON.stringify(value));
function load(ctx, path, names) {
  const source = fs.readFileSync(require.resolve(path), "utf8");
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  vm.createContext(ctx);
  vm.runInContext(ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text))
    .map(node => node.getText(ast).replace(/^export /, "")).join("\n"), ctx);
}
function prose(label, chars) {
  let text = "";
  for (let i = 0; quality.countPaidReportBodyChars(text) < chars; i++)
    text += `${label}의 ${i}번째 장면에서는 마음의 속도와 현실적인 조건을 살피며 각자의 생활에서 실행할 수 있는 선택을 정리합니다. 구체적인 관찰 ${label}-${i}를 기록해서 변화의 근거를 확인해 보세요.\n`;
  return text.trim();
}
function teaHarness(state) {
  const saved = [];
  const ctx = { PAID_LLM_PARTS_PER_REQUEST: 4, ...quality, structuredClone, Date, Promise, getAmbientAiLocale: () => "ko", hasGeminiKey: () => true,
    runWithAiLocale: (_locale, fn) => fn(),
    generateFortuneTeaGroup: jest.fn(async () => ({ ok: false })),
    mergeLlmResult: (base, candidate) => ({ ...base, ...candidate }),
    assertConsultQuality: result => { if (Object.values(result).some(value => String(value).includes("unsafe"))) throw Error("unsafe content"); },
    saveTeaCheckpoint: async (_auth, _id, _lock, value) => saved.push(clone(value)),
    TAROT_CARD_DETAIL_FIELDS: ["coreMeaning", "currentSituation", "questionLink", "advice", "caution"],
  };
  load(ctx, "../../worker/routes/fortune-tea-house.js", ["teaField", "teaSet", "teaNarrativeText", "pickTeaCheckpointFields", "teaCheckpointProgress", "generateTeaCheckpoint"]);
  const run = () => ctx.generateTeaCheckpoint({}, {}, {}, { auth: {}, resultId: "same", lockToken: "lock", checkpoint: state, body: {} });
  return { ctx, run, saved };
}
function teaState(a = 500, b = 20500) {
  return { request: { consultationMode: "tarot" }, fallback: {}, locale: "ko", repairs: [], attempts: { a: 1, b: 1 },
    groups: [{ key: "a", paths: ["actionPrescription"], label: "action", minChars: 1000 }, { key: "b", paths: ["closingLine"], label: "closing", minChars: 21000 }],
    parts: { a: { actionPrescription: prose("a", a) }, b: { closingLine: prose("b", b) } } };
}
describe("tea checkpoint length recovery", () => {
  test.each(["본문처럼 보이는 문자열입니다.", { title: "제목", summary: "요약" }, { title: "제목", summary: {}, sajuTarotBridge: "연결" }])("malformed nested fields cannot be filled by deterministic text", value => {
    const h = teaHarness(teaState());
    expect(h.ctx.pickTeaCheckpointFields({ synthesis: value }, { paths: ["synthesis"] })).toBeNull();
  });
  test.each(["shorter", "empty", "invalid", "repeated", "unsafe", "cross-repeat"])("%s repair keeps the saved valid draft", async kind => {
    const state = teaState(); state.groups[1].minChars = 20000;
    const before = clone(state.parts.a);
    const h = teaHarness(state);
    h.ctx.generateFortuneTeaGroup.mockImplementation(async () => {
      expect(h.saved.at(-1).attempts["a:lengthRepair"]).toBe(1);
      const text = kind === "empty" ? "" : kind === "invalid" ? 123 : kind === "shorter" ? prose("short", 100)
        : kind === "unsafe" ? prose("unsafe", 1500) : kind === "cross-repeat" ? state.parts.b.closingLine
        : Array(5).fill(prose("repeat", 300)).join("\n");
      return { ok: true, parsed: { actionPrescription: text } };
    });
    expect((await h.run()).result).toBeDefined();
    expect(state.parts.a).toEqual(before);
    expect(h.ctx.generateFortuneTeaGroup).toHaveBeenCalledTimes(1);
  });
  test("repair reservation survives interruption and does not repeat", async () => {
    const state = teaState(); state.groups[1].minChars = 20000;
    const h = teaHarness(state);
    h.ctx.generateFortuneTeaGroup.mockRejectedValueOnce(Error("interrupted"));
    await expect(h.run()).rejects.toThrow("interrupted");
    expect(state.attempts["a:lengthRepair"]).toBe(1);
    expect((await h.run()).result).toBeDefined();
    expect(h.ctx.generateFortuneTeaGroup).toHaveBeenCalledTimes(1);
  });
  test("exhausted repair keys do not block completion after another group fills the total", async () => {
    const state = teaState(1000, 1000);
    state.attempts = { a: 3, b: 2 }; state.repairs = ["a", "b"]; state.qualityError = "report body length";
    const h = teaHarness(state);
    h.ctx.generateFortuneTeaGroup.mockResolvedValue({ ok: true, parsed: { closingLine: prose("fixed", 20000) } });
    expect((await h.run()).result).toBeDefined();
    expect(h.ctx.generateFortuneTeaGroup).toHaveBeenCalledTimes(1);
  });
  test("short total remains partial after the original budget is exhausted", async () => {
    const state = teaState(500, 500); const h = teaHarness(state);
    for (let i = 0; i < 4; i++) expect((await h.run()).partial).toBeDefined();
    const calls = h.ctx.generateFortuneTeaGroup.mock.calls.length;
    expect((await h.run()).partial.retryable).toBe(false);
    expect(h.ctx.generateFortuneTeaGroup).toHaveBeenCalledTimes(calls);
    expect(state.parts.a).toBeDefined(); expect(state.parts.b).toBeDefined();
  });
  test.each([{}, { actionPrescription: "" }, { actionPrescription: 123 }])("missing or invalid required field is not replaced with fallback", async parsed => {
    const state = teaState(); delete state.parts.a;
    const h = teaHarness(state);
    h.ctx.generateFortuneTeaGroup.mockResolvedValue({ ok: true, parsed });
    expect((await h.run()).partial).toBeDefined();
    expect(state.parts.a).toBeUndefined();
  });
});
function loveHarness(rows, attempts = {}) {
  const saved = [];
  const groups = rows.map(row => ({ key: row.key }));
  const ctx = { ...quality, Date, Promise, Map,
    LOVE_SECRET_AI_GROUPS: groups, LOVE_SECRET_AI_GROUP_TIMEOUT_MS: 54000, LOVE_SECRET_AI_REPAIR_TIMEOUT_MS: 24000,
    LOVE_SECRET_AI_LLM_DEADLINE_MS: 86000, LOVE_SECRET_AI_REPAIR_MIN_REMAINING_MS: 22000,
    LOVE_SECRET_AI_MIN_USABLE_GROUPS: groups.length, LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS: 20000,
    createLlmCacheStore: () => null, cmsPromptText: async () => "", LOVE_SECRET_AI_SYSTEM_PROMPT: "",
    buildLoveSecretGroundingTerms: () => [], logLoveSecretAi() {}, clean: value => String(value || ""),
    assembleLoveSecretConsultation: data => ({ answer: data.filter(row => row.ok).map(row => row.sections[0].body).join("\n"), rows: data }),
    validateLoveSecretConsultation: result => {
      const issues = result.rows.filter(row => !row.ok).map(row => `SECTION_EMPTY:${row.key}`);
      result.rows.filter(row => row.ok && row.lengthShort && !row.lengthRepair).forEach(row => issues.push(`SECTION_MIN_CHARS:${row.key}`));
      if (quality.countPaidReportBodyChars(result.answer) < 20000) issues.push("TOTAL_BELOW_TARGET:short");
      if (quality.hasRepeatedReportPassage(result.answer)) issues.push("REPEATED_PASSAGE");
      if (result.answer.includes("unsafe")) issues.push("UNSAFE_RELATIONSHIP_ADVICE");
      return { issues };
    },
    mapLoveSecretIssuesToGroups: lovePrompt.mapLoveSecretIssuesToGroups,
    countLoveSecretConsultationBodyChars: result => quality.countPaidReportBodyChars(result.answer),
    generateLoveSecretGroup: jest.fn(async () => ({ ok: false })),
  };
  load(ctx, "../../worker/routes/love-secret-ai.js", ["generateFirstConsultation"]);
  const run = () => ctx.generateFirstConsultation({}, {}, {}, {}, { savedGroups: rows, attempts,
    onReserve: async key => { attempts[key] = (attempts[key] || 0) + 2; },
    onCheckpoint: async row => { const i = rows.findIndex(value => value.key === row.key); rows[i] = clone(row); saved.push(clone(row)); },
  });
  return { ctx, run, saved };
}
function loveRow(key, chars, extra = {}) {
  const body = prose(key, chars);
  return { key, ok: true, sections: [{ title: key, body }], chars: quality.countPaidReportBodyChars(body), extras: {}, ...extra };
}
describe("love secret bounded length recovery", () => {
  test.each(["shorter", "empty", "unsafe", "cross-repeat"])("%s repair preserves the longest valid draft", async kind => {
    const rows = [loveRow("core", 500, { lengthShort: true }), loveRow("timing", 20500)];
    const draft = rows[0].sections[0].body;
    const h = loveHarness(rows);
    h.ctx.generateLoveSecretGroup.mockResolvedValueOnce(rows[0]).mockImplementationOnce(async () => {
      expect(h.saved.at(-1).lengthRepair).toBe(true);
      return kind === "empty" ? { ok: false } : kind === "cross-repeat" ? { ...rows[1], key: "core" }
        : loveRow(kind === "unsafe" ? "unsafe" : "core", kind === "unsafe" ? 3000 : 100, { key: "core", lengthShort: true });
    });
    const result = await h.run();
    expect(result.complete).toBe(true);
    expect(rows[0].sections[0].body).toBe(draft);
    expect(h.ctx.generateLoveSecretGroup).toHaveBeenCalledTimes(2);
  });
  test("last reservation interruption settles saved short content without extra calls", async () => {
    const rows = [loveRow("core", 500, { lengthShort: true }), loveRow("timing", 20500)];
    const h = loveHarness(rows, { core: 4 });
    expect((await h.run()).complete).toBe(true);
    expect(h.ctx.generateLoveSecretGroup).not.toHaveBeenCalled();
  });
  test("a total-length repair bypasses the previous short response cache within its reserved budget", async () => {
    const rows = [loveRow("core", 500, { lengthShort: true, lengthRepair: true }), loveRow("timing", 5000)];
    const attempts = { core: 2, timing: 2 };
    const h = loveHarness(rows, attempts);
    h.ctx.generateLoveSecretGroup.mockImplementation(async (_env, options) => options.cache.skipRead
      ? loveRow("core", 16000) : rows[0]);
    expect((await h.run()).complete).toBe(true);
    expect(attempts.core).toBe(4);
    expect(h.ctx.generateLoveSecretGroup).toHaveBeenCalledTimes(1);
  });
  test("short total never completes and does not call exhausted groups", async () => {
    const rows = [loveRow("core", 500, { lengthShort: true }), loveRow("timing", 500, { lengthShort: true })];
    const h = loveHarness(rows, { core: 4, timing: 4 });
    expect((await h.run()).complete).toBe(false);
    expect(h.ctx.generateLoveSecretGroup).not.toHaveBeenCalled();
  });
});
describe("love secret parser keeps content checks on length repairs", () => {
  const group = lovePrompt.LOVE_SECRET_AI_GROUPS[0];
  const response = () => ({ sections: group.sections.map((section, i) => ({ title: section.title, body: prose(`section${i}`, 100) })) });
  test("short complete sections are recoverable but not silently treated as full length", () => {
    const text = JSON.stringify(response());
    expect(lovePrompt.parseLoveSecretGroupResponse(text, group).ok).toBe(false);
    expect(lovePrompt.parseLoveSecretGroupResponse(text, group, { lengthRepair: true })).toMatchObject({ ok: true, lengthShort: true });
  });
  test.each(["missing", "empty", "object", "repeat"])("%s content remains rejected", kind => {
    const value = response();
    if (kind === "missing") value.sections.pop();
    else if (kind === "empty") value.sections[0].body = "";
    else if (kind === "object") value.sections[0].body = { body: prose("bad", 2000) };
    else value.sections[0].body = Array(5).fill(prose("repeat", 200)).join("\n");
    expect(lovePrompt.parseLoveSecretGroupResponse(JSON.stringify(value), group, { lengthRepair: true }).ok).toBe(false);
  });
});


test("love public progress includes groups that have not been generated yet", () => {
  const ctx = { ...lovePrompt, clean: value => String(value || ""), publicSajuSummary: () => ({}) };
  load(ctx, "../../worker/routes/love-secret-ai.js", ["publicSession"]);
  const groups = [loveRow("core", 5500)];
  expect(ctx.publicSession({ status: "partial", llmMeta: { delivery: { groups, attempts: { core: 2 } }, residualIssues: ["SECTION_EMPTY:timing"] } }).retryable).toBe(true);
  const attempts = Object.fromEntries(lovePrompt.LOVE_SECRET_AI_GROUPS.map(group => [group.key, 4]));
  expect(ctx.publicSession({ status: "partial", llmMeta: { delivery: { groups, attempts } } }).retryable).toBe(false);
});
test("tea compares all content errors so fixing one issue does not hide another", () => {
  const ctx = {
    resolveSajuCategoryRule: () => ({ requiredTerms: [] }), getSajuRequiredSectionTitles: () => ["required"],
    normalizeDeepSections: rows => rows, assertText: value => { if (!value) throw Error("empty"); },
    collectConsultText: value => value.saju.deepSections[0].body,
    getSajuMinResultChars: () => 20000,
    SYSTEM_COPY_PATTERN: /system-copy/, SAJU_FORBIDDEN_COPY_PATTERN: /forbidden/,
    hasRepeatedLongBlock: () => false,
  };
  load(ctx, "../../worker/routes/fortune-tea-house.js", ["assertSajuDeepQuality"]);
  const result = body => ({ saju: { deepSections: [{ title: "required", body }] } });
  const before = [], after = [], unsafe = [];
  ctx.assertSajuDeepQuality(result("이 선택을 살펴보세요."), {}, { lengthRepair: true, contentOnly: true, errors: before });
  ctx.assertSajuDeepQuality(result("일간과 오행을 살펴보세요."), {}, { lengthRepair: true, contentOnly: true, errors: after });
  ctx.assertSajuDeepQuality(result("일간과 오행을 살펴보세요. forbidden"), {}, { lengthRepair: true, contentOnly: true, errors: unsafe });
  expect(before).toEqual(expect.arrayContaining(["fortune tea house quality failed: saju fact terms", "fortune tea house quality failed: saju luck flow"]));
  expect(after).toEqual(["fortune tea house quality failed: saju luck flow"]);
  expect(unsafe).toContain("fortune tea house quality failed: saju forbidden copy");
  expect(() => ctx.assertSajuDeepQuality(result("일간 오행 대운입니다."), {}, { lengthRepair: true })).toThrow("saju length");
  ctx.resolveSajuCategoryRule = () => ({ requiredTerms: ["첫째근거", "둘째근거"] });
  const missingBoth = [], missingOne = [];
  ctx.assertSajuDeepQuality(result("일간 오행 대운입니다."), {}, { lengthRepair: true, contentOnly: true, errors: missingBoth });
  ctx.assertSajuDeepQuality(result("일간 오행 대운 첫째근거입니다."), {}, { lengthRepair: true, contentOnly: true, errors: missingOne });
  expect(missingBoth).toHaveLength(2);
  expect(missingOne).toHaveLength(1);
  expect(missingOne.every(error => missingBoth.includes(error))).toBe(true);
});
test("tea sukuyo candidate comparison omits total length but final delivery still requires it", () => {
  const ctx = { assertText: value => { if (!value) throw Error("empty"); }, cleanText: value => String(value || ""),
    SUKUYO_MIN_RESULT_CHARS: 8000, isSajuFamilyMode: () => false, koreanAnchorsApply: () => false, assertNoMechanicalCopy() {},
  };
  load(ctx, "../../worker/routes/fortune-tea-house.js", ["assertConsultQuality"]);
  const result = { consultationMode: "sukuyo", sessionTitle: "제목", questionSummary: "질문", saju: { title: "제목", summary: "요약" }, tarot: { reading: "해석" },
    synthesis: { title: "제목", summary: "요약", sajuTarotBridge: "연결" }, yeoniReading: { intro: "시작", main: "본문", advice: "조언", caution: "주의" },
    actionPrescription: "실행", closingLine: "마침", luckyKeywords: ["하나", "둘"],
    emotionAnalysis: Array.from({ length: 4 }, () => ({ label: "감정", description: "설명", value: 50 })),
    choiceSimulation: Array.from({ length: 3 }, () => ({ title: "제목", subtitle: "설명", result: "선택", caution: "주의" })),
    sukuyoCompatibility: { available: true, title: "제목", summary: "사용자숙 상대숙 관계", relationType: "관계", user: { name: "본인", sukuyoName: "사용자숙" }, partner: { name: "상대", sukuyoName: "상대숙" } },
  };
  const errors = [];
  ctx.assertConsultQuality(result, result, { lengthRepair: true, contentOnly: true, errors });
  expect(errors).toEqual([]);
  expect(() => ctx.assertConsultQuality(result, result, { lengthRepair: true })).toThrow("sukuyo length");
});
