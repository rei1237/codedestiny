/** @jest-environment node */
import { calculateLifeBookAiSaju } from "../../worker/lib/life-book-ai-saju.js";
import { calculateZiweiAiChart } from "../../worker/lib/ziwei-ai-chart.js";
import { buildMasterLoveCodexCompatibility, buildSajuLoveCompatibility } from "../../worker/lib/master-love-codex-compat.js";
import { buildCodexEvidence, assertCodexEvidence, formatCodexEvidence, stripCodexEvidenceIds } from "../../worker/lib/master-love-codex-evidence.js";
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
test.each([["self", "self"], ["other", "partner"]])("compat %s accepts only its intended person's evidence", (id, subject) => {
  const chapter = MASTER_LOVE_CODEX_COMPAT_CHAPTERS.find(row => row.id === id);
  const contract = buildCodexEvidence({ chapter, saju: selfSaju, ziweiChart: selfZiwei, partnerSaju, partnerZiweiChart, compatibility });
  expect([...new Set(contract.records.map(row => row.subject))]).toEqual([subject]);
  const parsed = { body: "이 사람의 관계 기질을 설명합니다.", evidence: contract.records.map(row => ({ evidenceId: row.id, explanation: "계산된 근거의 해설" })) };
  expect(() => assertCodexEvidence(parsed, contract)).not.toThrow();
  expect(contract.crossChecks.every(row => row.status === "pending")).toBe(true);
});

test("pair chapters still reject missing partner evidence", () => {
  const contract = buildCodexEvidence({ chapter: MASTER_LOVE_CODEX_COMPAT_CHAPTERS[0], saju: selfSaju, ziweiChart: selfZiwei, partnerSaju, partnerZiweiChart, compatibility });
  const parsed = { body: "두 사람의 기질", evidence: contract.records.filter(row => row.subject === "self").map(row => ({ evidenceId: row.id, explanation: "근거" })) };
  expect(() => assertCodexEvidence(parsed, contract)).toThrow("LLM_PARTNER_EVIDENCE_MISSING");
});
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

// 🔴 R4 (2026-10-10): 본문이 "(self.saju.natalInteractions)" 처럼 증거 ID 를 그대로 인용했다.
test("evidence IDs stay in evidenceId/crossChecks.id only, never in reader prose", () => {
  const chapter = MASTER_LOVE_CODEX_COMPAT_CHAPTERS[0];
  const contract = buildCodexEvidence({ chapter, saju: selfSaju, ziweiChart: selfZiwei, partnerSaju, partnerZiweiChart, compatibility });
  const formatted = formatCodexEvidence(contract);
  expect(formatted).not.toContain("ID와 값만 인용");
  expect(formatted).toMatch(/독자용 문장에는 id/);
  const id = contract.records[0].id;
  const ID_LIKE = /\b(?:self|partner|pair)\.(?:saju|ziwei)\.|\bcross\.[a-z]|\bT\d{3}\b|\bF-[A-Za-z0-9]/;
  const text = `진유합이 있습니다(${id}). 끌림은 크지 않습니다 [cross.attraction.resonance, pair.ziwei.palaceOverlay]. `
    + `부부궁(근거: self.ziwei.palaces.부부궁)에서는 표 T055 와 F-12 를 봅니다. self.ziwei.palaces.명궁에서는 차분합니다.`;
  const stripped = stripCodexEvidenceIds(text, contract);
  expect(stripped).not.toMatch(ID_LIKE);
  expect(stripped).toBe("진유합이 있습니다. 끌림은 크지 않습니다. 부부궁에서는 표 와 를 봅니다. 에서는 차분합니다.");
  expect(stripCodexEvidenceIds("자미(묘)와 2027년 세운, T-셔츠 같은 말은 그대로 둡니다.", contract))
    .toBe("자미(묘)와 2027년 세운, T-셔츠 같은 말은 그대로 둡니다.");
});

test("missing model labels fall back to Korean terms, not English paths", () => {
  const chapter = MASTER_LOVE_CODEX_COMPAT_CHAPTERS[0];
  const contract = buildCodexEvidence({ chapter, saju: selfSaju, ziweiChart: selfZiwei, partnerSaju, partnerZiweiChart, compatibility });
  const parsed = { evidence: contract.records.map(record => ({ evidenceId: record.id, explanation: "계산된 근거입니다" })) };
  assertCodexEvidence(parsed, contract);
  for (const item of parsed.evidence) expect(item.label).toMatch(/^(본인|상대|두 사람) [가-힣0-9 ]+$/);
});

test("cross.context pending reason is a Korean sentence, not an English code", () => {
  const contract = buildCodexEvidence({ chapter: MASTER_LOVE_CODEX_CHAPTERS[0], saju: chart(person), ziweiChart: ziwei(person) });
  const context = contract.crossChecks.find(record => record.id === "cross.context");
  expect(context.reason).toMatch(/^[가-힣 ,.]+$/);
  expect(formatCodexEvidence(contract)).not.toContain("no_calculated_direction");
});
