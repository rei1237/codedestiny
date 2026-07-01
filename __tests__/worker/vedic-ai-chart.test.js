/**
 * @jest-environment node
 */

let utils;

beforeAll(async () => {
  utils = await import("../../worker/lib/vedic-derived-calculations.js");
});

describe("vedic AI chart derived calculations", () => {
  test("nakshatra boundaries and pada boundaries are exact", () => {
    const oneNakshatra = 13 + 20 / 60;
    const onePada = 3 + 20 / 60;

    expect(utils.nakshatraInfo(0)).toMatchObject({ name: "Ashwini", lord: "Ketu", pada: 1, index: 0 });
    expect(utils.nakshatraInfo(onePada)).toMatchObject({ name: "Ashwini", lord: "Ketu", pada: 2, index: 0 });
    expect(utils.nakshatraInfo(oneNakshatra)).toMatchObject({ name: "Bharani", lord: "Venus", pada: 1, index: 1 });
    expect(utils.nakshatraInfo(oneNakshatra * 26)).toMatchObject({ name: "Revati", lord: "Mercury", index: 26 });
  });

  test("rashi boundaries normalize longitude", () => {
    expect(utils.signName(0)).toBe("Aries");
    expect(utils.signName(30)).toBe("Taurus");
    expect(utils.signName(60)).toBe("Gemini");
    expect(utils.signName(360)).toBe("Aries");
    expect(utils.signIndex(360)).toBe(0);
  });

  test("ketu is exactly opposite rahu", () => {
    expect(utils.ketuLongitudeFromRahu(0)).toBe(180);
    expect(utils.ketuLongitudeFromRahu(181)).toBe(1);
    expect(utils.ketuLongitudeFromRahu(359.5)).toBe(179.5);
  });

  test("vimshottari dasha follows order and totals 120 years", () => {
    const birth = new Date("2000-01-01T00:00:00.000Z");
    const dasha = utils.buildVimshottariDasha(0, birth, new Date("2001-01-01T00:00:00.000Z"));
    const order = dasha.periods.slice(0, 9).map((period) => period.lord);
    const total = dasha.periods.reduce((sum, period) => sum + Number(period.durationYears), 0);

    expect(order).toEqual(["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]);
    expect(Math.round(total * 1000) / 1000).toBe(120);
    expect(dasha.firstDashaLord).toBe("Ketu");
    expect(dasha.birthNakshatra).toBe("Ashwini");
    expect(dasha.birthBalanceYears).toBe(7);
    expect(dasha.currentMahadasha).toBe("Ketu");
  });

  test("vimshottari birth balance reflects remaining nakshatra ratio", () => {
    const birth = new Date("2000-01-01T00:00:00.000Z");
    const halfwayAshwini = (13 + 20 / 60) / 2;
    const dasha = utils.buildVimshottariDasha(halfwayAshwini, birth, birth);

    expect(dasha.firstDashaLord).toBe("Ketu");
    expect(dasha.birthBalanceYears).toBeCloseTo(3.5, 3);
    expect(dasha.periods[0].durationYears).toBeCloseTo(3.5, 3);
  });
});
