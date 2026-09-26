/** @jest-environment node */
import { trimPaidReportText, trimPaidReportSections } from "../../worker/lib/paid-report-length.js";
import { countPaidReportBodyChars } from "../../worker/lib/paid-report-quality.js";

it("bounds formatted Unicode text without splitting surrogate pairs or changing short text", () => {
  const text = "## 흐름\n\n" + "별🌙과 선택을 살펴봅니다. ".repeat(100);
  expect(trimPaidReportText(text, 5000)).toBe(text);
  const clipped = trimPaidReportText(text, 200);
  expect(countPaidReportBodyChars(clipped)).toBeLessThanOrEqual(200);
  expect(countPaidReportBodyChars(clipped)).toBeGreaterThan(180);
  expect(clipped).toContain("## 흐름");
  expect(clipped.isWellFormed()).toBe(true);
});
it("preserves section metadata and distributes the limit across all bodies", () => {
  const sections = { first: { title: "핵심", body: "가나다 ".repeat(100), evidence: ["a"] }, second: { title: "선택", body: "🌙별빛 ".repeat(200) } };
  const original = structuredClone(sections);
  const clipped = trimPaidReportSections(sections, 300);
  expect(sections).toEqual(original);
  expect(Object.keys(clipped)).toEqual(Object.keys(sections));
  expect(clipped.first.evidence).toEqual(["a"]);
  expect(clipped.first.title).toBe("핵심"); expect(clipped.second.title).toBe("선택");
  const sizes = Object.values(clipped).map(row => countPaidReportBodyChars(row.body));
  expect(sizes.every(size => size > 0)).toBe(true);
  expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(300);
});

it("does not erase tiny required bodies when another body dominates the group", () => {
  const clipped = trimPaidReportSections({ a: { body: "가" }, b: { body: "나" }, c: { body: "다".repeat(10000) } }, 300);
  expect(clipped.a.body).toBe("가"); expect(clipped.b.body).toBe("나");
  expect(countPaidReportBodyChars(Object.values(clipped).map(row => row.body).join("\n"))).toBeLessThanOrEqual(300);
});
