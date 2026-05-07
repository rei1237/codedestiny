/**
 * @jest-environment node
 *
 * 실행 예시:
 * $env:NODE_OPTIONS='--experimental-vm-modules'; npx jest __tests__/worker/sukuyo-natal-premium.quality.test.js --testEnvironment node --runInBand
 */

let __sukuyoTestUtils;

let buildSukuyoFromLunarV2;
let getSukuyoNatalChapterSpec;
let buildCanonicalSukuyoNatal;
let validateCanonicalSukuyoNatal;
let buildSukuyoNatalDataSummaryTable;
let validateSukuyoNatalChapterText;
let SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS;
let detectSukuyoRepeatedSentences;

function makeInput(overrides = {}) {
  return {
    year: 1991,
    month: 2,
    day: 20,
    hour: 12,
    minute: 30,
    timezone: 9,
    ...overrides,
  };
}

function makeCanonical(overrides = {}) {
  const input = makeInput(overrides.input || {});
  const sukuyo = overrides.sukuyo || buildSukuyoFromLunarV2(overrides.lunarMonth || 1, overrides.lunarDay || 8, { source: "test" });
  return buildCanonicalSukuyoNatal({
    name: overrides.name || "A",
    gender: overrides.gender || "F",
    input,
    sukuyo,
    lunarPhase: overrides.lunarPhase === undefined ? { label: "차는 달", illumination: 75, phaseAngle: 120, waxingOrWaning: "waxing" } : overrides.lunarPhase,
    calendarSource: "test",
    methodVersion: "test-v1",
  });
}

function makeChapterText(canonical, chapter, extra = "") {
  const spec = getSukuyoNatalChapterSpec(chapter);
  const sections = (spec && spec.sections) || [];
  const n = canonical.natalSukuyo || {};
  const head = [
    buildSukuyoNatalDataSummaryTable(canonical),
    `${n.nameKo}宿(${n.nameHan}宿) index ${n.index} 방향 ${n.direction} 속성 ${n.element} ${canonical.profile.birth.lunarDate}`,
  ];
  const body = sections.map((s, i) => `## ${i + 1}. ${s}\n${n.nameKo}宿 ${n.nameHan}宿 ${n.index} ${n.direction} ${n.element} ${canonical.profile.birth.lunarDate} ${Array.isArray(n.keywords) ? n.keywords.join(" ") : ""} ${extra}`);
  return head.concat(body).join("\n\n");
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __sukuyoTestUtils = mod.__sukuyoTestUtils;

  ({
    buildSukuyoFromLunarV2,
    getSukuyoNatalChapterSpec,
    buildCanonicalSukuyoNatal,
    validateCanonicalSukuyoNatal,
    buildSukuyoNatalDataSummaryTable,
    validateSukuyoNatalChapterText,
    SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS,
    detectSukuyoRepeatedSentences,
  } = __sukuyoTestUtils);
});

describe("Sukuyo Natal Premium Quality Tests (A~K)", () => {
  test("A. 기본 화면 본명숙과 canonical natalSukuyo.nameKo가 일치해야 한다", () => {
    const lunarMonth = 1;
    const lunarDay = 8;
    const sukuyo = buildSukuyoFromLunarV2(lunarMonth, lunarDay, { source: "client-existing-engine" });
    const canonical = makeCanonical({ sukuyo, lunarMonth, lunarDay });
    expect(canonical.natalSukuyo.nameKo).toBe(sukuyo.nameKo);
  });

  test("B. natalSukuyo.index가 없으면 validation은 실패해야 한다", () => {
    const canonical = makeCanonical();
    canonical.natalSukuyo.index = null;
    const result = validateCanonicalSukuyoNatal(canonical);
    expect(result.hasIndex).toBe(false);
    expect(result.missingFields).toContain("natalSukuyo.index");
  });

  test("C. 음력 변환 실패(=lunarDate 누락) 시 validation은 실패해야 한다", () => {
    const canonical = makeCanonical();
    canonical.profile.birth.lunarDate = null;
    const result = validateCanonicalSukuyoNatal(canonical);
    expect(result.hasLunarDate).toBe(false);
    expect(result.missingFields).toContain("profile.birth.lunarDate");
  });

  test("D. 계산 데이터 요약표에 본명숙/index/음력 생일이 포함되어야 한다", () => {
    const canonical = makeCanonical();
    const table = buildSukuyoNatalDataSummaryTable(canonical);
    expect(table.includes("본명숙")).toBe(true);
    expect(table.includes("27숙 index")).toBe(true);
    expect(table.includes("음력 생일")).toBe(true);
  });

  test("E. Chapter 12 외 챕터에 30일 실행 가이드가 나오면 실패해야 한다", () => {
    const canonical = makeCanonical();
    const text = makeChapterText(canonical, 3, "30일 실행 가이드");
    const spec = getSukuyoNatalChapterSpec(3);
    const result = validateSukuyoNatalChapterText(text, canonical, spec, 3, []);
    expect(result.isValid).toBe(false);
    expect(result.details.wrongRunGuidePlacement).toBe(true);
  });

  test("F. 금지 공통 섹션 반복은 실패로 간주되어야 한다", () => {
    const canonical = makeCanonical();
    const phrase = SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS[0];
    const prev = [
      `## ${phrase}\n이전 챕터 텍스트`,
      `## ${phrase}\n또 다른 이전 챕터 텍스트`,
    ];
    const text = makeChapterText(canonical, 4, phrase);
    const spec = getSukuyoNatalChapterSpec(4);
    const result = validateSukuyoNatalChapterText(text, canonical, spec, 4, prev);
    expect(result.isValid).toBe(false);
    expect(result.details.repeatedCommonSections.length).toBeGreaterThan(0);
  });

  test("G. 30자 이상 동일 문장 2회 반복은 탐지되어야 한다", () => {
    const repeated = "숙요 데이터 기반 해석은 본명숙 인덱스와 음력 정보를 함께 확인해야 안정적으로 동작합니다";
    const text = `${repeated}.\n다른 문장입니다.\n${repeated}.`;
    const hits = detectSukuyoRepeatedSentences(text, 30);
    expect(hits.length).toBeGreaterThan(0);
  });

  test("H. 챕터별 소제목 스펙이 존재하고 중복 없이 구성되어야 한다", () => {
    const seen = new Set();
    for (let i = 1; i <= 13; i += 1) {
      const spec = getSukuyoNatalChapterSpec(i);
      expect(spec).toBeTruthy();
      const sections = spec.sections || [];
      const local = new Set(sections);
      expect(local.size).toBe(sections.length);
      for (const s of sections) {
        const k = `${i}:${s}`;
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
    }
  });

  test("I. lunarPhase 없는 상태에서 월상/삭망각/조도를 만들어내면 실패해야 한다", () => {
    const canonical = makeCanonical({ lunarPhase: null });
    const spec = getSukuyoNatalChapterSpec(2);
    const text = makeChapterText(canonical, 2, "조도 80% 삭망각 120도 월상 차는 달");
    const result = validateSukuyoNatalChapterText(text, canonical, spec, 2, []);
    expect(result.isValid).toBe(false);
    expect(result.details.lunarInventedWithoutData).toBe(true);
  });

  test("J. about:blank가 본문에 포함되면 실패해야 한다", () => {
    const canonical = makeCanonical();
    const spec = getSukuyoNatalChapterSpec(5);
    const text = makeChapterText(canonical, 5, "about:blank");
    const result = validateSukuyoNatalChapterText(text, canonical, spec, 5, []);
    expect(result.isValid).toBe(false);
    expect(result.details.hasAboutBlank).toBe(true);
  });

  test("K. 사용자 A/B는 서로 다른 입력이면 서로 다른 본명숙/해석 기반을 가져야 한다", () => {
    const a = makeCanonical({ name: "A", lunarMonth: 1, lunarDay: 8 });
    const b = makeCanonical({ name: "B", lunarMonth: 9, lunarDay: 21 });
    expect(`${a.natalSukuyo.nameKo}:${a.natalSukuyo.index}`).not.toBe(`${b.natalSukuyo.nameKo}:${b.natalSukuyo.index}`);
  });
});
