/**
 * @jest-environment node
 */

describe("Astro premium generator local-first pipeline", () => {
  let astro;

  beforeAll(async () => {
    astro = await import("../../worker/lib/astro-premium-generator.js");
  });

  test("LLM 키가 없어도 로컬 10챕터로 최종 원고와 pdfReady를 생성해야 한다", async () => {
    const input = {
      birthInput: {
        name: "테스터",
        gender: "female",
        birthDate: "1991-02-20",
        birthYear: 1991,
        birthMonth: 2,
        birthDay: 20,
        birthTime: "07:00",
        birthHour: 7,
        birthMinute: 0,
        timezone: "Asia/Seoul",
        birthPlace: "서울",
        latitude: 37.5665,
        longitude: 126.978,
      },
      chart: {},
    };

    const generated = await astro.generateAstroPremiumReport({}, input);

    expect(generated.chapterCount).toBe(10);
    expect(Array.isArray(generated.chapters)).toBe(true);
    expect(generated.chapters).toHaveLength(10);
    expect(generated.fallbackUsed).toBe(true);
    expect(generated.manuscriptSource).toBe("local");
    expect(generated.totalLength).toBeGreaterThanOrEqual(25000);
    expect(generated.pdfReady && generated.pdfReady.html).toBeTruthy();

    const html = String(generated.pdfReady && generated.pdfReady.html || "");
    expect(html.includes("제1장 나의 코즈믹 설계도")).toBe(true);
    expect(html.includes("fallback")).toBe(false);
    expect(html.includes("자동 복구 생성")).toBe(false);
    expect(html.includes("Internal server error")).toBe(false);
    expect(html.includes("about:blank")).toBe(false);
  });

  test("birth input 정규화가 한국어 시간/별칭 필드를 처리해야 한다", () => {
    const normalized = astro.normalizeAstroPremiumBirthInput({
      name: "사용자",
      sex: "남성",
      date: "1991-02-20",
      timeText: "오전 7시",
      place: "서울",
      tz: "Asia/Seoul",
      lat: 37.5665,
      lng: 126.978,
      birth_hour: 7,
    });

    expect(normalized.birthDate).toBe("1991-02-20");
    expect(normalized.birthYear).toBe(1991);
    expect(normalized.birthMonth).toBe(2);
    expect(normalized.birthDay).toBe(20);
    expect(normalized.birthHour).toBe(7);
    expect(normalized.birthMinute).toBe(0);
    expect(normalized.timezone).toBe("Asia/Seoul");
    expect(normalized.gender).toBe("male");
  });
});
