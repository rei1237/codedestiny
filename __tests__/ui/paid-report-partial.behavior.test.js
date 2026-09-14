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
  vm.runInContext(fn.getText(ast), context);
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
