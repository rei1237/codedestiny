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
});
