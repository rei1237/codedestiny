/**
 * @jest-environment node
 */

// worker/lib/destiny-bias-engine.js 의 resolveBirthLocation 회귀 테스트.
//
// 🔴 2026-09-12 이전 이 파일의 자체 parseTimezoneOffsetHours 는 "GMT/UTC±HH:MM" 표기만
//    인식했다. 숫자만 온 타임존(예: -5)은 null 을 돌려줬고, standardMeridianForTimezone 은
//    숫자가 아닌 문자열에서만 Intl DST 폴백을 타므로 숫자 오프셋 입력은 무조건 서울(135°)
//    기준 자오선으로 떨어졌다 — 한국이 아닌 지역의 진태양시 보정이 크게 어긋나는 실제 오차.
//    지금은 worker/lib/iana-offset.js 의 정본 resolveTimezoneOffsetHours 를 재사용한다.

describe("resolveBirthLocation 타임존 → 기준 자오선", () => {
  let resolveBirthLocation;

  beforeAll(async () => {
    ({ resolveBirthLocation } = await import("../../worker/lib/destiny-bias-engine.js"));
  });

  test("숫자 오프셋(-5)은 서울(135°)로 새지 않고 -75° 로 정확히 풀린다", () => {
    const location = resolveBirthLocation({
      year: 1997, month: 7, day: 4, hour: 12, minute: 0,
      timezone: -5,
      latitude: 40.7128,
      longitude: -74.006,
    });
    expect(location.standardMeridian).toBe(-75);
  });

  test("GMT/UTC 명시 표기는 그대로 유지된다", () => {
    const location = resolveBirthLocation({
      year: 2000, month: 1, day: 1, hour: 0, minute: 0,
      timezone: "UTC+2",
      latitude: 0,
      longitude: 0,
    });
    expect(location.standardMeridian).toBe(30);
  });

  test("IANA 지역명은 출생 순간의 실제 오프셋(서머타임 포함)을 기준 자오선에 반영한다", () => {
    // 진태양시 보정식 (경도 - 기준자오선) * 4 는 "그 순간 시계가 속한 오프셋"을 기준으로 해야
    // 한다 — 서머타임 중이면 시계 자체가 표준시보다 1시간 앞서 있으므로, 기준 자오선도
    // 표준(-75°)이 아니라 그 순간의 실효 오프셋(-4h → -60°)이어야 시:분 보정이 맞는다.
    const summer = resolveBirthLocation({
      year: 1997, month: 7, day: 4, hour: 12, minute: 0,
      timezone: "America/New_York",
      latitude: 40.7128,
      longitude: -74.006,
    });
    expect(summer.standardMeridian).toBe(-60);

    const winter = resolveBirthLocation({
      year: 1997, month: 1, day: 4, hour: 12, minute: 0,
      timezone: "America/New_York",
      latitude: 40.7128,
      longitude: -74.006,
    });
    expect(winter.standardMeridian).toBe(-75);
  });
});
