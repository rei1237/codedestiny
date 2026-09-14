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
  const persist = runFunction("worker/routes/destiny-compass-ai.js", "persistWaveB", {
    connectDb: async () => {}, console: { warn() {} }, clean: String,
    sectionsForDb: value => value,
    DestinyCompassReport: { findOne: async () => ({ sections: [], save: async () => { throw new Error("storage unavailable"); } }) },
  });
  await assert.rejects(persist({}, "owner", "report", [{ key: "a", body: "body" }], true), /storage unavailable/);
});

test("human design quality pause preserves result and never closes or refunds execution", async () => {
  const events = [];
  const section = { key: "a", status: "degraded", body: "읽을 수 있는 미완성 본문".repeat(50), attempts: 3, chars: 650 };
  let doc = { id: "owned", locale: "ko", status: "generating", sections: [section], waveCount: 1,
    lock: { token: "mine" }, basis: { snapshot: {}, allowed: {} } };
  const generate = runFunction("worker/routes/human-design-report.js", "handleGenerate", {
    requireAuth: async () => ({ userId: "owner" }), readJson: async () => ({ reportId: "owned" }),
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
    const wave = runFunction("worker/routes/master-love-codex.js", "runCodexWave", {
      clean: value => String(value || ""), resolveMode: () => ({ mode, chapters }),
      MasterLoveCodexSession: model, CHAPTER_BATCH_SIZE: 3, CHAPTER_CONCURRENCY: 3,
      buildMemory: () => "", runWithConcurrency: (items, _count, fn) => Promise.all(items.map(fn)),
      recoverCodexSession: async () => ({ session: stored }),
      planBatchCommit: results => results.slice(0, results.findIndex(item => item.status !== "ok") < 0 ? results.length : results.findIndex(item => item.status !== "ok")),
      refundSessionPassIfNeeded: async () => {}, refundSessionBillingIfNeeded: async () => {},
      console: { error() {}, warn() {} },
    });
    const generateChapter = async (_env, { chapter }) => ({ status: "ok", chapter: { ...chapter, ok: true, chars: 2500, body: "stored body" } });
    const run = () => wave({}, { sessionId: "book", userId: "owner", doc: structuredClone(stored), lockToken: "mock-lock", dependencies: { generateChapter } });
    assert.equal((await run()).outcome, "failed");
    assert.equal(stored.chapters.length, 0);
    assert.notEqual(stored.status, "completed");
    for (let i = 0; i < 7; i++) await run();
    const reopened = await model.findOne().lean();
    assert.equal(reopened.status, "completed");
    assert.deepEqual(reopened.chapters.map(item => item.id), chapters.map(item => item.id));
    assert.equal(reopened.totalCharCount, 50000);
    assert.equal((await run()).outcome, "completed");
  });
}
