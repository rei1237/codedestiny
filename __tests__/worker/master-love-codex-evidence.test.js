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
      evidenceId: record.id, subject: record.subject, system: record.system, period: record.period, certainty: record.certainty, explanation: "계산된 근거입니다",
    })), crossChecks: contract.crossChecks.map(record => ({ id: record.id, status: record.status, explanation: "각 체계의 방향을 구분합니다" })) };
    expect(() => assertCodexEvidence(parsed, contract)).not.toThrow();
    // Invented references are dropped; a system left without any real citation still fails.
    expect(() => assertCodexEvidence({ ...parsed, evidence: parsed.evidence.map(item => ({ ...item, evidenceId: "invented" })) }, contract)).toThrow("LLM_EVIDENCE_INCOMPLETE");
    // Facts and verdicts always come from the calculation contract, never from the model.
    const tampered = { ...parsed, evidence: parsed.evidence.map(item => ({ ...item, period: "2099" })),
      crossChecks: parsed.crossChecks.map(item => ({ ...item, status: "agreement" })) };
    expect(() => assertCodexEvidence(tampered, contract)).not.toThrow();
    expect(tampered.evidence.map(item => item.period)).toEqual(contract.records.map(record => record.period));
    expect(tampered.crossChecks.map(item => item.status)).toEqual(contract.crossChecks.map(record => record.status));
    const unexplained = { ...parsed, crossChecks: [] };
    expect(() => assertCodexEvidence(unexplained, contract)).not.toThrow();
    expect(unexplained.crossChecks).toEqual([]);
    expect(() => assertCodexEvidence({ ...parsed, body: "제공된 근거를 설명하지 않고 누구에게나 해당되는 조언을 길게 반복해서 분량만 채우는 문장입니다. ".repeat(3) }, contract)).toThrow("LLM_OUTPUT_REPEATED");
  });
}

test("unknown-time evidence keeps uncertainty without requiring Korean prose", () => {
  const unknown = { ...person, birthTimeUnknown: true };
  const contract = buildCodexEvidence({ chapter: MASTER_LOVE_CODEX_CHAPTERS[0], saju: chart(unknown), ziweiChart: ziwei(unknown) });
  const parsed = { body: "Keep the birth-time assumption separate from established facts.",
    evidence: contract.records.map(record => ({ evidenceId: record.id, subject: record.subject, system: record.system,
      period: record.period, certainty: record.certainty, explanation: "This placement is provisional because the birth time is unknown." })),
    crossChecks: contract.crossChecks.map(record => ({ id: record.id, status: record.status, explanation: "There is insufficient directional evidence." })) };
  expect(contract.records.some(record => record.certainty === "provisional")).toBe(true);
  expect(() => assertCodexEvidence(parsed, contract)).not.toThrow();
  const certified = { ...parsed, evidence: parsed.evidence.map(item => ({ ...item, certainty: "calculated" })) };
  expect(() => assertCodexEvidence(certified, contract)).not.toThrow();
  expect(certified.evidence.map(item => item.certainty)).toEqual(contract.records.map(record => record.certainty));
});

test("measured gemini evidence shapes (id / path aliases, no crossChecks) normalize to the contract", () => {
  const chapter = MASTER_LOVE_CODEX_COMPAT_CHAPTERS[0];
  const contract = buildCodexEvidence({ chapter, saju: selfSaju, ziweiChart: selfZiwei, partnerSaju, partnerZiweiChart, compatibility });
  const parsed = { body: "두 사람의 기질 차이를 대화에서 확인합니다.", evidence: contract.records.map((record, index) => index % 2
    ? { id: record.id, subject: record.subject, system: record.system, label: "근거", explanation: "계산된 근거입니다" }
    : { path: record.path, subject: record.subject, system: record.system === "saju" ? "사주" : "자미두수", label: "근거", explanation: "계산된 근거입니다" }) };
  expect(() => assertCodexEvidence(parsed, contract)).not.toThrow();
  expect(parsed.evidence.map(item => item.evidenceId)).toEqual(contract.records.map(record => record.id));
  expect(parsed.crossChecks).toEqual([]);
});
