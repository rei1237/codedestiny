const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "app/fortune-planner/recurrence.ts"), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleBox = { exports: {} };
vm.runInNewContext(output, { module: moduleBox, exports: moduleBox.exports, crypto: { randomUUID: () => "one-off-id" }, Date, Set, Array, Math });
const { appliesOn, applyOccurrencePatch, deleteOccurrence } = moduleBox.exports;

const weekly = { id: "series-1", date: "2026-08-03", repeat: "weekly", title: "팀 회의" };

test("weekly recurrence respects weekday and excluded dates", () => {
  assert.equal(appliesOn(weekly, "2026-08-10"), true);
  assert.equal(appliesOn(weekly, "2026-08-11"), false);
  assert.equal(appliesOn({ ...weekly, excludedDates: ["2026-08-10"] }, "2026-08-10"), false);
});

test("editing one repeat occurrence preserves parent and materializes a one-off", () => {
  const result = applyOccurrencePatch(weekly, "2026-08-10", { title: "변경된 회의" }, "one");
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].excludedDates, ["2026-08-10"]);
  assert.equal(result[1].id, "one-off-id");
  assert.equal(result[1].repeat, "none");
  assert.equal(result[1].date, "2026-08-10");
  assert.equal(result[1].title, "변경된 회의");
});

test("deleting following occurrences closes the original series before selected date", () => {
  const result = deleteOccurrence(weekly, "2026-08-17", "following");
  assert.equal(result.length, 1);
  assert.equal(result[0].repeatUntil, "2026-08-16");
});
