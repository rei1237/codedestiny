/** @jest-environment node */
import { pendingReportSections } from "../../worker/lib/paid-report-completeness.js";

test("a successful final wave cannot hide missing source sections", () => {
  expect(pendingReportSections(["source", "synthesis"], [{ key: "synthesis", body: "통합 해석" }])).toEqual(["source"]);
});
test("duplicate, empty and degraded sections cannot seal a report", () => {
  expect(pendingReportSections(["a", "b", "c"], [
    { key: "a", body: "정상" }, { key: "a", body: "중복" },
    { key: "b", body: " " }, { key: "c", body: "짧은 미완성", status: "degraded" },
  ])).toEqual(["b", "c"]);
});
test("repaired reports retain earlier good sections and become complete", () => {
  expect(pendingReportSections(["a", "b"], [{ key: "a", body: "저장된 본문" }, { key: "b", body: "보완한 본문", status: "ok" }])).toEqual([]);
});
