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
  expect(card.personalized).toBe(true);
}

// 공개 모드: 날짜만으로 참인 값은 채우되 개인 길흉(등급·점수)은 비어 있어야 한다.
function expectPublicCardShape(card) {
  expect(typeof card.anchor).toBe("string");
  expect(card.anchor.length).toBeGreaterThan(0);
  expect(typeof card.body).toBe("string");
  expect(card.body.length).toBeGreaterThan(0);
  expect(card.personalized).toBe(false);
  expect(card.tier).toBeNull();
  expect(card.tierLabel).toBeNull();
  expect(card.score).toBeNull();
}

describe("today-hub 라우트", () => {
  // 2026-08 계약 변경: 생년이 "없는 것"과 "틀린 것"은 다르다.
  // 없으면 날짜만으로 참인 공개 모드로 200, 형식이 틀린 것만 400.
  test("생년월일이 없으면 공개 모드로 200 — 개인 길흉은 내지 않는다", async () => {
    const res = await call("");
    expect(res.status).toBe(200);
    // 개인 정보가 없으므로 공유 캐시에 올려도 된다.
    expect(res.headers.get("Cache-Control")).toContain("public");

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.personalized).toBe(false);
    expectPublicCardShape(body.systems.saju);
    expectPublicCardShape(body.systems.sukuyo);
    if (body.systems.vedic) expectPublicCardShape(body.systems.vedic);
  });

  test("형식이 어긋난 생년월일은 400", async () => {
    for (const q of ["?birth=1990-5-14", "?birth=abcd-ef-gh", "?birth=1799-01-01"]) {
      const res = await call(q);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("INVALID_BIRTH");
    }
  });

  test("detail=1 이 아니면 sections 를 싣지 않는다 — 홈 payload 를 무겁게 하지 않는다", async () => {
    const light = await (await call("?birth=1990-05-14&time=09:30&cal=solar&gender=female")).json();
    expect(light.systems.saju.sections).toBeUndefined();
    expect(Array.isArray(light.systems.saju.highlights)).toBe(true);
    expect(light.systems.saju.highlights.length).toBeLessThanOrEqual(3);

    const deep = await (await call("?birth=1990-05-14&time=09:30&cal=solar&gender=female&detail=1")).json();
    expect(Array.isArray(deep.systems.saju.sections)).toBe(true);
    expect(deep.systems.saju.sections.length).toBeGreaterThan(2);
    for (const section of deep.systems.saju.sections) {
      expect(typeof section.title).toBe("string");
      expect(section.title.length).toBeGreaterThan(0);
      expect(Array.isArray(section.items) || Array.isArray(section.lines)).toBe(true);
    }
    expect(Array.isArray(deep.systems.sukuyo.sections)).toBe(true);
    expect(deep.systems.sukuyo.sections.length).toBeGreaterThan(2);
  });

  test("공개 모드에서도 detail=1 이면 날짜 기반 섹션이 나온다", async () => {
    const body = await (await call("?detail=1")).json();
    expect(body.systems.saju.sections.length).toBeGreaterThan(0);
    expect(body.systems.sukuyo.sections.length).toBeGreaterThan(0);
    // 개인 판정이 섞여 들어오면 안 된다 — 생년이 없는데 등급이 나오는 것은 지어낸 값이다.
    expect(body.systems.saju.tier).toBeNull();
    expect(body.systems.sukuyo.tier).toBeNull();
    // 생년이 없는데 "내 일간 / 내 본명수" 같은 개인 값이 항목으로 들어오면 지어낸 값이다.
    // (해설 문장 안에 그 낱말이 나오는 것은 설명이므로 항목 라벨·값만 본다.)
    for (const card of Object.values(body.systems)) {
      if (!card) continue;
      expect(card.detail).toBe("");
      for (const section of card.sections) {
        for (const item of section.items || []) {
          expect(item.label).not.toMatch(/^내 /);
          expect(String(item.value)).not.toMatch(/^내 /);
        }
      }
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
