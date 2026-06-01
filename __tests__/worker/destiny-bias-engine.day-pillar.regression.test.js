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

  test("korean lunar leap flags are normalized without falling back to solar", () => {
    const leapByLabel = buildSajuProfile({
      name: "테스트",
      gender: "female",
      birth: {
        calendarType: "음력윤달",
        birthDate: "1990-05-01",
        birthTime: "12:00",
      },
    });
    const leapByBoolean = buildSajuProfile({
      name: "테스트",
      gender: "female",
      birth: {
        calendarType: "음력",
        isLeapMonth: true,
        birthDate: "1990-05-01",
        birthTime: "12:00",
      },
    });

    expect(leapByLabel?.birth?.calendarType).toBe("lunar_leap");
    expect(leapByBoolean?.birth?.calendarType).toBe("lunar_leap");
  });

  test("solar 1991-02-20 Seoul male keeps month/day, hour changes by corrected time policy", () => {
    const morning = buildSajuProfile({
      name: "테스트",
      gender: "male",
      hourPillarTimePolicy: "TRUE_SOLAR_TIME",
      birth: {
        calendarType: "solar",
        birthDate: "1991-02-20",
        birthTime: "07:00",
        birthPlace: "서울",
        timezone: "Asia/Seoul",
        longitude: 126.978,
        latitude: 37.5665,
      },
    });
    const later = buildSajuProfile({
      name: "테스트",
      gender: "male",
      hourPillarTimePolicy: "TRUE_SOLAR_TIME",
      birth: {
        calendarType: "solar",
        birthDate: "1991-02-20",
        birthTime: "08:40",
        birthPlace: "서울",
        timezone: "Asia/Seoul",
        longitude: 126.978,
        latitude: 37.5665,
      },
    });

    expect(morning?.pillars?.year?.ganji).toBe("辛未");
    expect(morning?.pillars?.month?.ganji).toBe("庚寅");
    expect(morning?.pillars?.day?.ganji).toBe("辛酉");
    expect(morning?.pillars?.hour?.ganji).toBe("辛卯");

    expect(later?.pillars?.year?.ganji).toBe("辛未");
    expect(later?.pillars?.month?.ganji).toBe("庚寅");
    expect(later?.pillars?.day?.ganji).toBe("辛酉");
    expect(later?.pillars?.hour?.ganji).toBe("壬辰");

    expect(morning?.sajuCoreResult?.daewoon?.direction).toBe("BACKWARD");
    expect(later?.sajuCoreResult?.daewoon?.direction).toBe("BACKWARD");
    expect(morning?.sajuCoreResult?.daewoon?.list?.[0]?.pillar).toBe("己丑");
    expect(later?.sajuCoreResult?.daewoon?.list?.[0]?.pillar).toBe("己丑");
    expect((morning?.sajuCoreResult?.daewoon?.list || []).length).toBeGreaterThanOrEqual(9);
  });
});
