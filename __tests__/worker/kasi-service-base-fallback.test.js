/**
 * KASI 업스트림 base URL 선택·403 처리 회귀 테스트.
 *
 * 🔴 배경(실측 2026-08-28): `get24DivisionsInfo` 가 프로덕션·스테이징 **양쪽 모두** 403 →
 * `source:"local"` 이었고, 같은 시각 `getLunCalInfo` 는 `source:"kasi"` 였다. 원인은 둘이다.
 *   ① `KASI_API_BASE_URL` 이 `configured` 로 **preferred 보다 먼저** 시도돼, 24절기 오퍼레이션이
 *      음양력 서비스로 나갔다. data.go.kr 은 그 조합을 403 으로 돌려준다.
 *   ② 403 을 만나면 그 자리에서 던져서 **메서드에 맞는 서비스에 닿아 보지도 못했다.**
 * 게다가 그 한 번의 403 이 base×키 후보마다 실패를 세어 회로(임계 3)를 혼자 열었고,
 * 정상 동작하던 음양력 조회까지 10분간 함께 죽였다.
 */
import { jest } from "@jest/globals";

import { requestKasiLegacyCalendarMethod } from "../../worker/routes/kasi.js";

const SPCDE = "SpcdeInfoService";
const LRSR = "LrsrCldInfoService";

const ENV = {
  KASI_SERVICE_KEY: "test-key",
  KASI_API_BASE_URL: `https://apis.data.go.kr/B090041/openapi/service/${LRSR}`,
  KASI_PROXY_TIMEOUT_MS: "1000",
};

function okPayload(rows) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      response: { header: { resultCode: "00" }, body: { items: { item: rows } } },
    }),
  };
}

const forbidden = { ok: false, status: 403, text: async () => "" };
const serverError = { ok: false, status: 500, text: async () => "" };

let originalFetch;
let calls;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  calls = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/** 요청 URL 을 기록하면서 base 별 응답을 고른다. */
function mockFetch(routeFor) {
  globalThis.fetch = jest.fn(async (url) => {
    calls.push(String(url));
    return routeFor(String(url));
  });
}

test("24절기는 KASI_API_BASE_URL 이 음양력 서비스로 고정돼 있어도 SpcdeInfoService 를 먼저 부른다", async () => {
  mockFetch((url) => (url.includes(SPCDE)
    ? okPayload([{ dateName: "입춘", locdate: "19910204", kst: "1708" }])
    : forbidden));

  const result = await requestKasiLegacyCalendarMethod(ENV, "get24DivisionsInfo", { solYear: "1991" });

  expect(result.source).toBe("kasi");
  expect(result.rows).toHaveLength(1);
  expect(calls[0]).toContain(SPCDE);
});

test("preferred 서비스가 403 이어도 남은 base URL 을 계속 시도한다", async () => {
  mockFetch((url) => (url.includes(LRSR)
    ? okPayload([{ dateName: "입춘", locdate: "19920204", kst: "2249" }])
    : forbidden));

  const result = await requestKasiLegacyCalendarMethod(ENV, "get24DivisionsInfo", { solYear: "1992" });

  // 🔴 예전에는 첫 403 에서 던져 로컬 폴백으로 떨어졌다.
  expect(result.source).toBe("kasi");
  expect(calls.some((url) => url.includes(SPCDE))).toBe(true);
  expect(calls.some((url) => url.includes(LRSR))).toBe(true);
});

test("실패는 요청당 한 번만 센다 — 두 번 실패로는 회로가 열리지 않는다", async () => {
  // 🔴 예전에는 base URL × 키 후보마다 실패를 세서, 전면 장애 요청 **두 번**이면 임계 3을 넘겨
  // 회로가 열렸다(base 2개 × 요청 2회 = 4). 회로가 열리면 멀쩡한 다른 서비스까지 10분간 죽는다.
  mockFetch(() => serverError);
  for (const solYear of ["1993", "1995"]) {
    const failed = await requestKasiLegacyCalendarMethod(ENV, "get24DivisionsInfo", { solYear });
    // 업스트림이 전부 죽으면 로컬 폴백으로 내려간다 — 그 자체는 설계대로다.
    expect(failed.source).toBe("local");
  }

  // 🔴 그 다음 요청은 업스트림에 **닿아야** 한다. 회로가 열렸다면 여기서 local 이 된다.
  mockFetch((url) => (url.includes(LRSR)
    ? okPayload([{ lunYear: "1994", lunMonth: "01", lunDay: "10" }])
    : serverError));
  const after = await requestKasiLegacyCalendarMethod(ENV, "getLunCalInfo", {
    solYear: "1994", solMonth: "02", solDay: "20",
  });
  expect(after.source).toBe("kasi");
});

// ── 커버리지 밖 연도 ────────────────────────────────────────────────────────
//
// 🔴 위 403 은 2026-08-28 에 **계정 쪽에서** 풀렸다(data.go.kr 특일 정보 활용신청 승인).
// 그러자 그 뒤에 가려져 있던 것이 드러났다: SpcdeInfoService 는 **2000~2028 만** 답하고
// 그 밖은 오류가 아니라 **HTTP 200 + totalCount 0** 으로 답한다(실측 1995~2035 전수).
// 같은 키의 음양력(LrsrCldInfoService)은 1391~2050 을 덮으므로 절기만 좁다.
//
// 그 빈 목록을 `source:"kasi"` 로 실어 보내면 소비자는 "KASI 가 절기가 없다고 답했다" 로 읽고,
// 게다가 30분간 캐시된다. 로컬 코어로 떨어뜨려 사실대로 알려야 한다.
test("24절기 커버리지 밖 연도는 빈 rows 를 kasi 로 위장하지 않고 로컬로 떨어진다", async () => {
  mockFetch(() => okPayload([]));

  const result = await requestKasiLegacyCalendarMethod(ENV, "get24DivisionsInfo", { solYear: "1997" });

  expect(result.source).toBe("local");
  expect(result.rows.length).toBeGreaterThan(0);
  expect(result.upstreamReason).toBe("KASI_YEAR_OUT_OF_COVERAGE");
  expect(result.warnings.join(" ")).toContain("1997");
});

test("음양력의 빈 응답은 로컬로 메우지 않는다 — '그런 날짜가 없다' 일 수 있다", async () => {
  // 🔴 위 폴백을 메서드 구분 없이 걸면, KASI 가 거절한 입력(없는 윤달 등)에 우리가 답하게 된다.
  mockFetch(() => okPayload([]));

  const result = await requestKasiLegacyCalendarMethod(ENV, "getLunCalInfo", {
    solYear: "1997", solMonth: "02", solDay: "10",
  });

  expect(result.source).toBe("kasi");
  expect(result.rows).toHaveLength(0);
});
