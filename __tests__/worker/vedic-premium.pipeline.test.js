/**
 * @jest-environment node
 */

let vedic;

beforeAll(async () => {
  vedic = await import("../../worker/lib/vedic-premium-generator.js");
});

function makeInput(overrides = {}) {
  return {
    name: "홍길동",
    gender: "남성",
    birthDate: "1991-02-20",
    birthTime: "07:00",
    timezone: "Asia/Seoul",
    birthPlace: "서울",
    latitude: 37.5665,
    longitude: 126.978,
    chart: {
      planets: {
        Sun: 330.2,
        Moon: 15.2,
        Mercury: 310.8,
        Venus: 289.1,
        Mars: 142.3,
        Jupiter: 104.6,
        Saturn: 276.4,
        Rahu: 61.9,
        Ketu: 241.9,
      },
      retrograde: {
        Saturn: true,
      },
      ayanamsa: 24.1,
      ascendantSidereal: 45.2,
      source: "unit-test",
    },
    ...overrides,
  };
}

describe("vedic premium local-first pipeline", () => {
  test("birthInput 정규화가 표준 스키마를 충족한다", () => {
    const normalized = vedic.normalizeVedicPremiumBirthInput(makeInput());
    expect(normalized.birthYear).toBe(1991);
    expect(normalized.birthMonth).toBe(2);
    expect(normalized.birthDay).toBe(20);
    expect(normalized.birthHour).toBe(7);
    expect(normalized.birthMinute).toBe(0);
    expect(normalized.timezone).toBe("Asia/Seoul");
    expect(normalized.gender).toBe("male");
  });

  test("시간 누락이면 결제 전 검증이 실패한다", () => {
    const validation = vedic.validateVedicPayloadForApi(makeInput({ birthTime: "", chart: { planets: {} } }));
    expect(validation.ok).toBe(false);
    expect(validation.code).toBe("BIRTH_INPUT_INVALID");
    expect(Array.isArray(validation.missing)).toBe(true);
  });

  test("LLM 실패에도 로컬 원고로 10챕터가 생성된다", async () => {
    const generated = await vedic.generateVedicPremiumReport({}, makeInput());
    expect(generated.chapterCount).toBe(10);
    expect(Array.isArray(generated.chapters)).toBe(true);
    expect(generated.chapters).toHaveLength(10);
    expect(generated.fallbackUsed).toBe(true);
    expect(generated.pdfReady && generated.pdfReady.html).toBeTruthy();
  });

  test("금지어가 최종 원고에서 제거된다", async () => {
    const generated = await vedic.generateVedicPremiumReport({}, makeInput());
    const html = String(generated.pdfReady && generated.pdfReady.html || "");
    expect(html.includes("자동 복구 생성")).toBe(false);
    expect(/\bfallback\b/i.test(html)).toBe(false);
    expect(/chapter\s*1\s*chapter\s*1/i.test(html)).toBe(false);
    expect(html.includes("데이터가 부족합니다")).toBe(false);
    expect(/\bpayload\b/i.test(html)).toBe(false);
    expect(/\bJSON\b/i.test(html)).toBe(false);
    expect(/\bdebug\b/i.test(html)).toBe(false);
  });
});
