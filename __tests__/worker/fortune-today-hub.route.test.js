/**
 * @jest-environment node
 */
// GET /api/fortune/today-hub — 홈 "오늘의 운세" 허브 라우트 계약.
// 네트워크·DB·LLM 없음. env 는 빈 객체라 Swiss 외부 제공자도 타지 않는다.
// (Swiss WASM 이 이 환경에서 못 뜨면 vedic 은 null 로 떨어지는 것이 설계된 동작이다.)

let handleFortuneTodayRoutes;

beforeAll(async () => {
  ({ handleFortuneTodayRoutes } = await import("../../worker/routes/fortune-today.js"));
});

const TIERS = ["pivotal", "great-auspicious", "auspicious", "caution", "great-caution"];

function call(query) {
  return handleFortuneTodayRoutes(new Request(`https://code-destiny.com/api/fortune/today-hub${query}`), {});
}

function expectCardShape(card) {
  expect(typeof card.anchor).toBe("string");
  expect(card.anchor.length).toBeGreaterThan(0);
  expect(typeof card.headline).toBe("string");
  expect(card.headline.length).toBeGreaterThan(0);
  expect(typeof card.body).toBe("string");
  expect(card.body.length).toBeGreaterThan(0);
  expect(TIERS).toContain(card.tier);
  expect(typeof card.tierLabel).toBe("string");
  expect(card.score).toBeGreaterThanOrEqual(0);
  expect(card.score).toBeLessThanOrEqual(100);
}

describe("today-hub 라우트", () => {
  test("생년월일이 없으면 400 — 프로필 카드 없이는 계산하지 않는다", async () => {
    const res = await call("");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_BIRTH");
  });

  test("형식이 어긋난 생년월일도 400", async () => {
    for (const q of ["?birth=1990-5-14", "?birth=abcd-ef-gh", "?birth=1799-01-01"]) {
      const res = await call(q);
      expect(res.status).toBe(400);
    }
  });

  test("GET 이 아니면 405", async () => {
    const res = await handleFortuneTodayRoutes(
      new Request("https://code-destiny.com/api/fortune/today-hub?birth=1990-05-14", { method: "POST" }),
      {},
    );
    expect(res.status).toBe(405);
  });

  test("유효한 생년이면 사주·숙요 카드가 길흉 등급과 함께 나온다", async () => {
    const res = await call("?birth=1990-05-14&time=09:30&cal=solar&gender=female");
    expect(res.status).toBe(200);
    // 개인 생년이 쿼리에 실리므로 공유 캐시에 올리면 안 된다.
    expect(res.headers.get("Cache-Control")).toContain("private");

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expectCardShape(body.systems.saju);
    expect(body.systems.saju.anchor).toContain("오늘의 일진");
    expectCardShape(body.systems.sukuyo);
    expect(body.systems.sukuyo.anchor).toContain("오늘의 수");

    // 베다는 Swiss 가 없으면 조용히 비지만, 있으면 같은 계약을 지켜야 한다.
    if (body.systems.vedic) expectCardShape(body.systems.vedic);
  });

  test("음력 프로필도 계산된다(기본 숙요점과 같은 음력 취급)", async () => {
    const res = await call("?birth=1990-05-14&cal=lunar&gender=male");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expectCardShape(body.systems.sukuyo);
  });

  test("프로필 카드가 다르면 결과가 다르다", async () => {
    const results = [];
    for (const birth of ["1988-02-04", "1990-05-14", "1995-11-20", "2001-07-07"]) {
      const body = await (await call(`?birth=${birth}&time=09:30&cal=solar&gender=female`)).json();
      results.push(`${body.systems.saju?.score}:${body.systems.sukuyo?.score}`);
    }
    expect(new Set(results).size).toBeGreaterThan(1);
  });

  test("today-hub 외의 경로는 404 — 이 모듈은 한 라우트만 맡는다", async () => {
    const res = await handleFortuneTodayRoutes(new Request("https://code-destiny.com/api/fortune/check"), {});
    expect(res.status).toBe(404);
  });
});
