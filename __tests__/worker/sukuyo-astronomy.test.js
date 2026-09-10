import { describe, expect, test } from "@jest/globals";
import {
  buildSukuyoFromMoonLongitude,
  julianDateFromUtcTimestamp,
  localMomentToUtc,
  SUKUYO_ASTRONOMY_CONSTANTS,
} from "../../worker/lib/sukuyo-astronomy.js";
import { buildBirthTimeContext } from "../../worker/lib/birth-time-context.js";

describe("숙요 천문 공통 코어", () => {
  test("KST 입력을 UTC와 JD로 연속 변환한다", () => {
    const moment = localMomentToUtc({ year: 1991, month: 9, day: 2, hour: 0, minute: 0, timezoneOffset: 9 });
    expect(moment.utcIso).toBe("1991-09-01T15:00:00.000Z");
    expect(julianDateFromUtcTimestamp(moment.utcTimestamp)).toBeCloseTo(2448501.125, 9);
  });

  test("27개 경계에서 -epsilon/exact/+epsilon을 자동으로 다음 숙으로 넘긴다", () => {
    const { MANSION_SPAN_DEGREES: span } = SUKUYO_ASTRONOMY_CONSTANTS;
    const before = buildSukuyoFromMoonLongitude(4 * span - 1e-9);
    const exact = buildSukuyoFromMoonLongitude(4 * span);
    const after = buildSukuyoFromMoonLongitude(4 * span + 1e-9);
    expect(before.nameHan).toBe("參");
    expect(exact.nameHan).toBe("井");
    expect(after.nameHan).toBe("井");
    expect(exact.mansionIdx).toBe((before.mansionIdx + 1) % 27);
  });

  test("1991-09-02의 한 시간 표본에서 參→井이 역행 없이 발생한다", () => {
    const names = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const longitude = 43.16661747025512 + (56.602758063129386 - 43.16661747025512) * hour / 23;
      names.push(buildSukuyoFromMoonLongitude(longitude).nameHan);
    }
    expect(names[0]).toBe("參");
    expect(names.at(-1)).toBe("井");
    expect(names.filter((name) => name === "參").length).toBeGreaterThan(0);
    expect(names.filter((name) => name === "井").length).toBeGreaterThan(0);
  });

  test("출생 장소와 시간대가 진태양시 컨텍스트에 반영된다", () => {
    const moment = localMomentToUtc({ year: 2024, month: 7, day: 1, hour: 12, minute: 0, timezone: "America/New_York" });
    const context = buildBirthTimeContext(
      { ...moment, year: 2024, month: 7, day: 1, hour: 12, minute: 0, timezone: "America/New_York", latitude: 40.7128, longitude: -74.006 },
      moment,
      julianDateFromUtcTimestamp(moment.utcTimestamp),
    );
    expect(moment.utcIso).toBe("2024-07-01T16:00:00.000Z");
    expect(context.location.provided).toBe(true);
    expect(context.location.longitude).toBe(-74.006);
    expect(context.location.standardMeridian).toBe(-75);
    expect(context.trueSolar.longitudeCorrectionMinutes).toBeCloseTo(3.976, 6);
    expect(context.julianDate).toBeCloseTo(2460493.1666666665, 8);
  });
});
