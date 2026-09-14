/** @jest-environment node */
import { calculateLifeBookAiSaju } from "../../worker/lib/life-book-ai-saju.js";
import { calculateZiweiAiChart } from "../../worker/lib/ziwei-ai-chart.js";
import { buildMasterLoveCodexCompatibility, buildSajuLoveCompatibility } from "../../worker/lib/master-love-codex-compat.js";
import { buildCodexEvidence, assertCodexEvidence } from "../../worker/lib/master-love-codex-evidence.js";
import { MASTER_LOVE_CODEX_CHAPTERS } from "../../worker/lib/master-love-codex-prompt.mjs";
import { MASTER_LOVE_CODEX_COMPAT_CHAPTERS } from "../../worker/lib/master-love-codex-compat-prompt.mjs";

const person = { birthDate: "1990-05-12", birthTime: "09:30", gender: "female", calendarType: "solar" };
const chart = input => calculateLifeBookAiSaju(input, { year: 2026 });
const ziwei = input => calculateZiweiAiChart({ birthInfo: input }, { year: 2026 });

test("leap month is the same date in both engines, never silently regularized", () => {
  const leap = { ...person, birthDate: "2023-02-01", calendarType: "lunar", isLeapMonth: true };
  const regular = { ...leap, isLeapMonth: false };
  expect(chart(leap).calculationMeta.solarDate).not.toBe(chart(regular).calculationMeta.solarDate);
  const solar = { ...person, birthDate: chart(leap).calculationMeta.solarDate };
  expect(chart(leap).dayPillar).toBe(chart(solar).dayPillar);
  expect(ziwei(leap).palaces).toEqual(ziwei(solar).palaces);
  const invalid = { ...leap, birthDate: "2024-02-01" };
  expect(() => chart(invalid)).toThrow();
  expect(() => ziwei(invalid)).toThrow();
});

test("valid lunar February 30 is not rejected using Gregorian validation", () => {
  const lunar = { ...person, birthDate: "2023-02-30", calendarType: "lunar" };
  expect(() => chart(lunar)).not.toThrow();
  expect(() => ziwei(lunar)).not.toThrow();
  expect(() => chart({ ...lunar, calendarType: "solar" })).toThrow();
  expect(() => ziwei({ ...lunar, calendarType: "solar" })).toThrow();
});

test("unknown time ignores stale form time and does not certify cross agreement", () => {
  const unknown = { ...person, birthTimeUnknown: true };
  const saju = chart(unknown);
  expect(saju).toEqual(chart({ ...unknown, birthTime: "23:59" }));
  expect(saju.hourPillar).toBeUndefined();
  const compatibility = buildMasterLoveCodexCompatibility({ selfSaju: saju, selfZiwei: ziwei(unknown), partnerSaju: chart(person), partnerZiwei: ziwei(person) });
  expect(compatibility.cross.convergence).toEqual([]);
  expect(compatibility.cross.divergence).toEqual([]);
  expect(compatibility.cross.pending.length).toBeGreaterThan(0);
});

test("wording cannot change element balancing or the compatibility signature", () => {
  const selfSaju = chart(person);
  const partnerSaju = chart({ ...person, birthDate: "1991-11-03" });
  const expected = buildSajuLoveCompatibility({ selfSaju, partnerSaju });
  const reworded = { ...selfSaju, usefulGod: "새 설명입니다", unfavorableGod: "다른 설명입니다" };
  expect(buildSajuLoveCompatibility({ selfSaju: reworded, partnerSaju })).toEqual(expected);
  expect(selfSaju.elementBalance.method).toBe("element-count-balance");
});

const selfSaju = chart(person);
const selfZiwei = ziwei(person);
const partnerSaju = chart({ ...person, birthDate: "1991-11-03" });
const partnerZiweiChart = ziwei({ ...person, birthDate: "1991-11-03" });
const compatibility = buildMasterLoveCodexCompatibility({ selfSaju, selfZiwei, partnerSaju, partnerZiwei: partnerZiweiChart });
for (const [mode, chapters] of [["solo", MASTER_LOVE_CODEX_CHAPTERS], ["compat", MASTER_LOVE_CODEX_COMPAT_CHAPTERS]]) {
  test.each(chapters)(`${mode} $id has bounded, attributable evidence and immutable verdicts`, chapter => {
    const input = { chapter, saju: selfSaju, ziweiChart: selfZiwei,
      ...(mode === "compat" ? { partnerSaju, partnerZiweiChart, compatibility } : {}) };
    const contract = buildCodexEvidence(input);
    expect(buildCodexEvidence(input)).toEqual(contract);
    expect(contract.records.some(item => item.system === "saju")).toBe(true);
    expect(contract.records.some(item => item.system === "ziwei")).toBe(true);
    const parsed = { body: "기질의 차이를 대화에서 확인합니다.", evidence: contract.records.map(record => ({
      evidenceId: record.id, subject: record.subject, system: record.system, period: record.period, explanation: "계산된 근거입니다",
    })), crossChecks: contract.crossChecks.map(record => ({ id: record.id, status: record.status, explanation: "각 체계의 방향을 구분합니다" })) };
    expect(() => assertCodexEvidence(parsed, contract)).not.toThrow();
    expect(() => assertCodexEvidence({ ...parsed, evidence: [{ ...parsed.evidence[0], evidenceId: "invented" }] }, contract)).toThrow("LLM_EVIDENCE_INVALID");
    expect(() => assertCodexEvidence({ ...parsed, evidence: [{ ...parsed.evidence[0], period: "2099" }] }, contract)).toThrow("LLM_EVIDENCE_INVALID");
    expect(() => assertCodexEvidence({ ...parsed, crossChecks: [] }, contract)).toThrow("LLM_CROSS_VERDICT_INVALID");
    expect(() => assertCodexEvidence({ ...parsed, body: "제공된 근거를 설명하지 않고 누구에게나 해당되는 조언을 길게 반복해서 분량만 채우는 문장입니다. ".repeat(3) }, contract)).toThrow("LLM_OUTPUT_REPEATED");
  });
}
