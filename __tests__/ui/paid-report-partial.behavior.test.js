const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function runFunction(file, name, state) {
  const source = fs.readFileSync(path.join(__dirname, "../..", file), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, name);
  const context = vm.createContext(state);
  vm.runInContext(fn.getText(ast).replace(/^export\s+/, ""), context);
  return context[name];
}

test("compass storage errors cannot become a completed response", async () => {
  const persist = runFunction("worker/routes/destiny-compass-ai.js", "saveCompassDelivery", {
    resultStorageUnavailable: () => new Error("storage unavailable"),
    DestinyCompassReport: { updateOne: async () => { throw new Error("storage unavailable"); } },
  });
  await assert.rejects(persist({}, { userId: "owner" }, { status: "completed" }, "report"), /storage unavailable/);
});

test("human design quality pause preserves result and never closes or refunds execution", async () => {
  const events = [];
  const section = { key: "a", status: "degraded", body: "읽을 수 있는 미완성 본문".repeat(50), attempts: 3, chars: 650 };
  let doc = { id: "owned", locale: "ko", status: "generating", sections: [section], waveCount: 1,
    lock: { token: "mine" }, basis: { snapshot: {}, allowed: {} } };
  const generate = runFunction("worker/routes/human-design-report.js", "handleGenerate", {
    requireAuth: async () => ({ userId: "owner" }), readJson: async () => ({ reportId: "owned" }),
    verifyStoredHdAccess: async () => true, HD_REPORT_MAX_WAVES: 10,
    hdSectionBody: row => row.body, countPaidReportBodyChars: body => body.length,
    saveHdDelivery: async (_env, _filter, fields) => { doc = { ...doc, ...fields }; events.push(fields.status); return doc; },
    clean: String, claimWave: async () => doc, HD_REPORT_SECTIONS: [{ key: "a" }],
    HD_REPORT_MAX_SECTION_ATTEMPTS: 3, HD_REPORT_SECTION_CONCURRENCY: 4,
    HD_REPORT_WAVE_BUDGET_MS: 1000, HD_REPORT_DELIVER_MIN_SECTIONS: 1, HD_REPORT_DELIVER_MIN_TOTAL_CHARS: 400,
    rememberSentences() {}, sectionDigest() {}, createLlmCacheStore: () => ({}),
    runWithConcurrency: async () => [], releaseLock: async () => {}, saveWave: async () => {},
    pendingReportSections: () => ["a"], hasRenderableLlmText: () => true,
    finalizeReport: async (_env, _user, _id, status) => { doc = { ...doc, status }; events.push(status); },
    closeExecution: async () => events.push("charged"), refundExecution: async () => events.push("refunded"),
    findReport: async () => doc, publicReport: value => value, json: value => value, noStore: {},
  });
  const result = await generate({}, {});
  assert.equal(result.status, "partial");
  assert.equal(result.sections[0].body, section.body);
  assert.equal(result.retryable, true);
  assert.deepEqual(events, ["partial"]);
});

test("partial human design result is returned on re-entry without generating or charging", async () => {
  const doc = { id: "owned", status: "partial", sections: [{ body: "saved" }] };
  const generate = runFunction("worker/routes/human-design-report.js", "handleGenerate", {
    requireAuth: async () => ({ userId: "owner" }), readJson: async () => ({ reportId: "owned" }),
    verifyStoredHdAccess: async () => true,
    clean: String, claimWave: async () => null, findReport: async () => doc,
    publicReport: value => value, json: value => value, noStore: {},
  });
  assert.equal((await generate({}, {})).status, "partial");
});

for (const mode of ["solo", "compat"]) {
  test(`codex ${mode} resumes saved chapters after storage failure and rereads all 20`, async () => {
    const chapters = Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1) }));
    let stored = { id: "book", userId: "owner", mode, chapters: [], status: "generating" };
    let failSave = true;
    const model = {
      findOne: () => ({ lean: async () => structuredClone(stored) }),
      updateOne: async (_filter, update) => {
        if (update.$set.chapters && failSave) { failSave = false; throw new Error("storage unavailable"); }
        stored = { ...stored, ...update.$set };
        return { matchedCount: 1 };
      },
    };
    const storageError = () => new Error("RESULT_STORAGE_UNAVAILABLE");
    const save = runFunction("worker/routes/master-love-codex.js", "saveCodexDelivery", {
      MasterLoveCodexSession: model, resultStorageUnavailable: storageError,
    });
    // 미완 장을 "시도 가능 / 소진"으로 가르는 규칙은 테스트에 복제하지 않고 실제 함수를 꺼내 쓴다
    // — 웨이브·조회·크론이 같은 판정을 본다는 것이 이 수정의 핵심이다.
    const splitPendingChapters = runFunction("worker/routes/master-love-codex.js", "splitPendingChapters", { CHAPTER_ATTEMPT_LIMIT: 3 });
    const wave = runFunction("worker/routes/master-love-codex.js", "runCodexWaveInternal", {
      sha256: value => value, syncCodexExecution: async () => true, splitPendingChapters,
      CODEX_EVIDENCE_VERSION: "test-evidence",
      clean: value => String(value || ""), resolveMode: () => ({ mode, chapters }),
      // 기대 목록의 정본은 세션에 고정된 manifest 이고, 없으면 모드 구성으로 폴백한다.
      expectedChapters: () => chapters, CHAPTER_ATTEMPT_LIMIT: 3,
      saveCodexDelivery: save, resultStorageUnavailable: storageError,
      hasRepeatedReportPassage: () => false, dedupeChapterAgainst: chapter => chapter,
      codexChapterFloor: spec => Math.ceil((spec.minChars || 2400) * 0.7), codexDedupedChapterFloor: spec => Math.ceil((spec.minChars || 2400) * 0.5), countPaidReportBodyChars: body => body.replace(/\s/g, "").length,
      MasterLoveCodexSession: model, CHAPTER_BATCH_SIZE: 3, CHAPTER_CONCURRENCY: 3,
      buildMemory: () => "", runWithConcurrency: (items, _count, fn) => Promise.all(items.map(fn)),
      recoverCodexSession: async () => ({ session: stored }),
      refundSessionPassIfNeeded: async () => {}, refundSessionBillingIfNeeded: async () => {},
      console: { error() {}, warn() {} },
    });
    const generateChapter = async (_env, { chapter }) => ({ status: "ok", chapter: { ...chapter, ok: true, chars: 2500, body: `chapter ${chapter.id} ` + "본문".repeat(1250) } });
    const run = () => wave({}, { sessionId: "book", userId: "owner", doc: structuredClone(stored), lockToken: "mock-lock", dependencies: { generateChapter } });
    assert.equal((await run()).outcome, "storage_failed");
    assert.equal(stored.chapters.length, 3);
    assert.notEqual(stored.status, "completed");
    for (let i = 0; i < 7; i++) await run();
    const reopened = await model.findOne().lean();
    assert.equal(reopened.status, "completed");
    assert.deepEqual(reopened.chapters.map(item => item.id), chapters.map(item => item.id));
    assert.equal(reopened.totalCharCount, reopened.chapters.reduce((sum, chapter) => sum + chapter.body.length, 0));
    assert.equal((await run()).outcome, "completed");
  });
}
