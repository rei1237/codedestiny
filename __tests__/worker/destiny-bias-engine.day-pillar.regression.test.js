/**
 * @jest-environment node
 */

describe("destiny-bias-engine day pillar regression", () => {
  let buildSajuProfile;

  beforeAll(async () => {
    const mod = await import("../../worker/lib/destiny-bias-engine.js");
    buildSajuProfile = mod.buildSajuProfile;
  });

  test("solar 1974-02-18 11:00 (Seoul baseline) resolves to 경인일주", () => {
    const profile = buildSajuProfile({
      name: "테스트",
      gender: "M",
      birth: {
        calendarType: "solar",
        birthDate: "1974-02-18",
        birthTime: "11:00",
      },
    });

    expect(profile?.pillars?.day?.ganji).toBe("庚寅");
  });

  test("dot date format keeps same day pillar", () => {
    const profile = buildSajuProfile({
      name: "테스트",
      gender: "M",
      birth: {
        calendarType: "solar",
        birthDate: "1974.02.18",
        birthTime: "11:00",
      },
    });

    expect(profile?.pillars?.day?.ganji).toBe("庚寅");
  });

  test("solar 1990-03-18 07:20 Seoul female resolves to 경오년 기묘월 임오일 계묘시", () => {
    const profile = buildSajuProfile({
      name: "테스트",
      gender: "female",
      hourPillarTimePolicy: "TRUE_SOLAR_TIME",
      birth: {
        calendarType: "solar",
        birthDate: "1990-03-18",
        birthTime: "07:20",
        birthPlace: "서울",
        timezone: "Asia/Seoul",
        longitude: 126.978,
        latitude: 37.5665,
      },
    });

    expect(profile?.pillars?.year?.ganji).toBe("庚午");
    expect(profile?.pillars?.month?.ganji).toBe("己卯");
    expect(profile?.pillars?.day?.ganji).toBe("壬午");
    expect(profile?.pillars?.hour?.ganji).toBe("癸卯");
    expect(profile?.sajuCoreResult?.daewoon?.direction).toBe("BACKWARD");
  });
});
