import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBatch, parsePrNumbers } from "../../scripts/delivery-batch-plan.mjs";

const ready = (number, files) => ({
  number,
  state: "OPEN",
  isDraft: false,
  baseRefName: "main",
  mergeable: "MERGEABLE",
  mergeStateStatus: "CLEAN",
  checksPass: true,
  files: files.map((path) => ({ path })),
});

test("저위험·비중첩 PR은 배치로 판정한다", () => {
  const report = analyzeBatch([ready(1, ["styles/a.css"]), ready(2, ["docs/b.md"])]);
  assert.equal(report.ok, true);
  assert.equal(report.mode, "batch");
});

test("파일 중첩은 배치를 차단한다", () => {
  const report = analyzeBatch([ready(1, ["styles/a.css"]), ready(2, ["styles/a.css"])]);
  assert.equal(report.ok, false);
  assert.ok(report.blockers.some((blocker) => blocker.includes("파일 중첩")));
});

test("Worker 변경이 포함된 다중 배치는 차단한다", () => {
  const report = analyzeBatch([ready(1, ["worker/routes/fortune.js"]), ready(2, ["styles/b.css"])]);
  assert.equal(report.ok, false);
  assert.ok(report.blockers.some((blocker) => blocker.includes("단독")));
});

test("PR 번호 중복과 과다 입력을 차단한다", () => {
  assert.throws(() => parsePrNumbers("1,1"), /중복/);
  assert.throws(() => parsePrNumbers("1,2,3,4,5"), /최대 4개/);
});
