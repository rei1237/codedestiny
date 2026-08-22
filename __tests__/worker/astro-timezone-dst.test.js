/**
 * @jest-environment node
 */

// /api/astro/* 의 타임존 해석 — 서머타임 회귀 방지.
//
// 🔴 2026-08-23 이전 worker/routes/astro.js 의 parseTimezoneOffsetHours 는 하드코딩 표였다:
//      America/New_York → 항상 -5,  America/Los_Angeles → 항상 -8,  Asia/Seoul → 항상 +9
//    그래서 여름 출생이면 UTC 가 1시간 밀리고, 상승궁·하우스 커스프가 약 15° 어긋났다.
//    한국도 1987~1988 두 해는 +10 이라 Asia/Seoul 고정값 역시 틀렸다.
//
// 이 테스트는 라우트가 실제로 만드는 UTC 를 확인한다 — 오프셋 함수 단위가 아니라
// 응답에 실리는 birthUtc 를 본다. 그래야 "함수는 고쳤는데 호출 순서 탓에 안 먹는" 회귀도 잡힌다.

import { jest } from "@jest/globals";

const getSwissWesternChart = jest.fn();
const getSwissVedicPlanets = jest.fn();

jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
  getSwissWesternChart,
  getSwissVedicPlanets,
}));
jest.unstable_mockModule("../../worker/lib/cms-records.js", () => ({ primeCmsRecords: jest.fn() }));
jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ requireAuth: jest.fn() }));
jest.unstable_mockModule("../../worker/lib/astro-premium-generator.js", () => ({
  buildAstroLocalChartJson: jest.fn(),
  normalizeAstroPremiumBirthInput: jest.fn(),
}));
jest.unstable_mockModule("../../worker/lib/vedic-premium-generator.js", () => ({
  buildVedicLocalChartJson: jest.fn(),
}));

let handleAstrologyRoutes;

beforeAll(async () => {
  ({ handleAstrologyRoutes } = await import("../../worker/routes/astro.js"));
});

beforeEach(() => {
  getSwissWesternChart.mockReset();
  // 라우트가 UTC 를 어떻게 세웠는지만 보면 되므로, 차트 본문은 최소 형태로 돌려준다.
  getSwissWesternChart.mockResolvedValue({
    planets: {
      Sun: { longitude: 0, sign: "Aries", degreeInSign: 0 },
      Moon: { longitude: 0, sign: "Aries", degreeInSign: 0 },
    },
    ascendant: { longitude: 0, sign: "Aries", degreeInSign: 0 },
    midheaven: { longitude: 0, sign: "Aries", degreeInSign: 0 },
    houseCusps: Array.from({ length: 12 }, () => 0),
    aspects: [],
    source: "swiss-wasm-local",
    engineQuality: "swiss",
    fallbackUsed: false,
  });
});

async function birthUtcFor(body) {
  const request = new Request("https://code-destiny.com/api/astrology/basic", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await handleAstrologyRoutes(request, {});
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`astro basic 실패 ${response.status}: ${JSON.stringify(payload)}`);
  }
  // 라우트가 Swiss 로 넘긴 입력이 곧 그 라우트가 판정한 오프셋이다.
  const [, chartInput] = getSwissWesternChart.mock.calls.at(-1);
  return chartInput;
}

const BASE = { latitude: 40.7128, longitude: -74.006 };

describe("IANA 지역 이름은 그 날짜의 실제 서머타임 규칙을 탄다", () => {
  test("America/New_York — 여름은 -4(EDT), 겨울은 -5(EST)", async () => {
    const summer = await birthUtcFor({ ...BASE, date: "1985-07-04", time: "14:20", timezone: "America/New_York" });
    expect(summer.timezone).toBe(-4);

    const winter = await birthUtcFor({ ...BASE, date: "1985-01-04", time: "14:20", timezone: "America/New_York" });
    expect(winter.timezone).toBe(-5);
  });

  test("America/Los_Angeles — 여름은 -7(PDT), 겨울은 -8(PST)", async () => {
    const summer = await birthUtcFor({ ...BASE, date: "1997-07-04", time: "12:00", timezone: "America/Los_Angeles" });
    expect(summer.timezone).toBe(-7);

    const winter = await birthUtcFor({ ...BASE, date: "1997-11-09", time: "15:01", timezone: "America/Los_Angeles" });
    expect(winter.timezone).toBe(-8);
  });

  test("Europe/London — 여름은 +1(BST), 겨울은 0(GMT)", async () => {
    const summer = await birthUtcFor({ ...BASE, date: "2005-09-11", time: "11:45", timezone: "Europe/London" });
    expect(summer.timezone).toBe(1);

    const winter = await birthUtcFor({ ...BASE, date: "2005-12-11", time: "11:45", timezone: "Europe/London" });
    expect(winter.timezone).toBe(0);
  });

  test("Europe/Paris — 여름은 +2(CEST), 겨울은 +1(CET)", async () => {
    const summer = await birthUtcFor({ ...BASE, date: "2000-09-09", time: "12:00", timezone: "Europe/Paris" });
    expect(summer.timezone).toBe(2);

    const winter = await birthUtcFor({ ...BASE, date: "2000-12-09", time: "12:00", timezone: "Europe/Paris" });
    expect(winter.timezone).toBe(1);
  });

  test("🔴 Asia/Seoul — 1987~1988 서머타임 시행 연도는 +10, 그 밖은 +9", async () => {
    const dst = await birthUtcFor({ ...BASE, date: "1988-05-08", time: "09:00", timezone: "Asia/Seoul" });
    expect(dst.timezone).toBe(10);

    const standard = await birthUtcFor({ ...BASE, date: "1991-02-20", time: "08:30", timezone: "Asia/Seoul" });
    expect(standard.timezone).toBe(9);
  });

  test("30분 오프셋 지역도 정확히 풀린다", async () => {
    const kabul = await birthUtcFor({ ...BASE, date: "2016-07-08", time: "12:00", timezone: "Asia/Kabul" });
    expect(kabul.timezone).toBe(4.5);

    const delhi = await birthUtcFor({ ...BASE, date: "1977-06-21", time: "12:00", timezone: "Asia/Kolkata" });
    expect(delhi.timezone).toBe(5.5);
  });

  test("서머타임을 쓰지 않는 지역은 계절과 무관하게 같다", async () => {
    const summer = await birthUtcFor({ ...BASE, date: "1993-07-14", time: "10:00", timezone: "Pacific/Honolulu" });
    const winter = await birthUtcFor({ ...BASE, date: "1993-01-14", time: "10:00", timezone: "Pacific/Honolulu" });
    expect(summer.timezone).toBe(-10);
    expect(winter.timezone).toBe(-10);
  });
});

describe("날짜와 무관한 표기는 그대로 유지된다", () => {
  test.each([
    ["숫자", 9, 9],
    ["음수", -5.5, -5.5],
    ["UTC", "UTC", 0],
    ["GMT", "gmt", 0],
    ["KST 약어", "KST", 9],
    ["JST 약어", "jst", 9],
    ["+09:00 표기", "+09:00", 9],
    ["-0330 표기", "-0330", -3.5],
  ])("%s", async (_label, timezone, expected) => {
    const input = await birthUtcFor({ ...BASE, date: "2000-07-01", time: "12:00", timezone });
    expect(input.timezone).toBe(expected);
  });
});

describe("해석 불가 타임존은 조용히 기본값으로 새지 않는다", () => {
  test("알 수 없는 이름은 ASTRO_INVALID_BIRTH_INPUT 이다", async () => {
    const request = new Request("https://code-destiny.com/api/astrology/basic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...BASE, date: "2000-07-01", time: "12:00", timezone: "Not/AZone" }),
    });
    const response = await handleAstrologyRoutes(request, {});
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.code).toBe("ASTRO_INVALID_BIRTH_INPUT");
    expect(payload.missing).toContain("timezone");
  });
});
