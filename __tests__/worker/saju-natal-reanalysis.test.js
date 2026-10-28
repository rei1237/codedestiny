/**
 * @jest-environment node
 */

// 저장본 재분석 dry-run: 저장본은 그대로 두고, 지금 규칙으로 다시 계산하면 무엇이 달라지는지만 돌려준다.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

let inspectNatalReanalysis;
beforeAll(async () => {
  ({ inspectNatalReanalysis } = await import("../../worker/lib/saju-natal-reanalysis.js"));
});

const freeze = (value) => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
// 1975-01-22 14:00 甲寅 丁丑 戊辰 己未. 옛 엔진은 甲己를 합화로 보고 가색격을 냈고, 설문이 그것을 확정했다.
// 규칙으로 도출한 지금 판정: 丑 정기 己는 戊의 겁재 → 월겁격(일반격), 甲은 寅에 뿌리를 둔 칠살로 살아 있어 종격이 아니다.
const oldYeongnyangi = () => ({
  domain: "saju", engineVersion: "saju-natal-v2", calculatedAt: "2026-09-01T00:00:00.000Z", limitations: [],
  facts: [
    { id: "saju.pillars", label: "pillars", value: { year: "甲寅", month: "丁丑", day: "戊辰", hour: "己未" } },
    { id: "saju.jong", label: "jong", value: { isJong: true, isGaJong: false, name: "가색격", confirmedByUser: true, userCheck: { best: "yes", worst: "yes" } } },
    { id: "saju.strengthHeuristic", label: "strengthHeuristic", value: { isStrong: false, flippedByUser: true } },
    { id: "saju.advancedFactors", label: "advancedFactors", value: { gyeokguk: { finalGyeokguk: "가색격(稼穡格)", finalType: "특수격" } } },
  ],
});

describe("saju natal reanalysis dry-run", () => {
  test("a survey-confirmed 가색격 snapshot reports the survey marks and the new 월겁격 without touching the snapshot", () => {
    const snapshot = freeze(oldYeongnyangi());
    const copy = JSON.parse(JSON.stringify(snapshot));
    const r = inspectNatalReanalysis(snapshot);
    expect(snapshot).toEqual(copy);
    expect(r).toMatchObject({ status: "ok", source: "yeongnyangi", surveyAffected: true, storedNatalCoreVersion: null });
    expect(r.markers).toEqual(["jong.confirmedByUser", "strength.flippedByUser"]);
    expect(r.before).toMatchObject({ jong: { isJong: true, name: "가색격" }, gyeokguk: "가색격", strength: "신약" });
    expect(r.after).toMatchObject({ jong: { isJong: false, name: null }, gyeokguk: "월겁격", strength: "신강" });
    expect(r.changes).toEqual(["jong", "gyeokguk", "strength"]);
    // 저장본에 없던 용신·조후는 비교하지 않는다.
    expect(r.unchecked).toEqual(["usefulGod", "climate"]);
    expect(r.natalCore.analysisId).toMatch(/^nc1-/);
  });

  test("the main-shell 내격 전환 text is a survey mark; unreadable rows are reported, and the script writes only a summary file", () => {
    const shell = { pillars: { y: { g: "甲", j: "寅" }, m: { g: "丁", j: "丑" }, d: { g: "戊", j: "辰" }, h: { g: "己", j: "未" } },
      jong: { isJong: false, verifiedText: "<span>[일반 내격 전환]</span> 과거 운세 흐름이 종격의 길흉과 일치하지 않아" } };
    const r = inspectNatalReanalysis(shell);
    expect(r).toMatchObject({ source: "main-shell", markers: ["jong.verifiedText:rejected"], changes: [] });
    expect(r.unchecked).toEqual(["gyeokguk", "strength", "usefulGod", "climate"]);
    expect(inspectNatalReanalysis({}).status).toBe("unreadable");

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "natal-reanalysis-"));
    const input = path.join(dir, "rows.json"), out = path.join(dir, "report.json");
    fs.writeFileSync(input, JSON.stringify([
      { _id: "req-1", snapshot: { analysis: { contexts: { saju: oldYeongnyangi() } }, input: { birthDate: "1975-01-22" } } },
      { id: "ai-1", resumeBody: { sajuResult: shell } },
      { id: "broken" },
    ]));
    execFileSync(process.execPath, ["scripts/saju-natal-reanalysis-dry-run.mjs", "--input", input, "--out", out], { cwd: path.resolve(__dirname, "../.."), stdio: "pipe" });
    const report = JSON.parse(fs.readFileSync(out, "utf8"));
    expect(report.dryRun).toBe(true);
    expect(report.summary).toEqual({ total: 3, unreadable: 1, surveyAffected: 2, changed: 1, changedSurveyAffected: 1, byField: { jong: 1, gyeokguk: 1, strength: 1 } });
    expect(report.rows.map((row) => row.id)).toEqual(["req-1", "ai-1", "broken"]);
    expect(JSON.stringify(report)).not.toContain("1975-01-22");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
