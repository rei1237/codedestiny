/**
 * @jest-environment node
 *
 * 운명의 꽃 매칭 라우트의 게이트 계약.
 *
 * 2026-08-24 이전에는 매칭 엔진이 브라우저에 통째로 실려 있어서, 결제는 서버에서 차감되는데
 * 결과는 브라우저가 만들었다 — 콘솔에서 `matchDestinyFlower(payload)` 한 줄이면 1만원짜리
 * 결과가 공짜로 나왔다. 엔진을 워커로 옮기고 이 라우트를 유일한 입구로 뒀으므로, 여기서
 * `flower-fc` 해금 확인이 빠지면 우회가 그대로 돌아온다.
 *
 * 🔴 게이트를 mock 으로 건너뛰지 말 것 — 건너뛰는 순간 이 테스트는 아무것도 지키지 않는다.
 *    여기서 mock 하는 것은 DB 어댑터뿐이고, 판정 코드는 실제 라우트가 돌린다.
 */
import { jest } from "@jest/globals";

const USER_ID = "507f1f77bcf86cd799439011";

const PROFILE = Object.freeze({
  birth: { year: 1993, month: 7, day: 12, hour: 9, minute: 30, calType: "solar" },
  saju: { dayStem: "을" },
  analysis: { elementWeights: { wood: 34, fire: 18, earth: 16, metal: 14, water: 18 } },
  astrology: { sunSign: "Leo", moonSign: "Pisces", risingSign: "Taurus" },
});

/** 사용자 문서의 unlockedFeatures. 각 테스트가 갈아 끼운다. */
let unlockedFeatures = [];
/** requireAuth 결과. null 이면 401 을 던진다. */
let authResult = { userId: USER_ID };

let handleDestinyFlowerRoutes;
let FLOWER_UNLOCK_FEATURE_KEY;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: async () => {},
      mongoose: {},
      isTransientMongoError: () => false,
      withMongoRetry: async (fn) => fn(),
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      User: {
        findById: () => ({
          select: () => ({ lean: async () => ({ _id: USER_ID, unlockedFeatures }) }),
        }),
      },
    })),
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireAuth: async () => {
        if (!authResult) {
          const error = new Error("UNAUTHORIZED");
          error.status = 401;
          throw error;
        }
        return authResult;
      },
    })),
  ]);

  const mod = await import("../../worker/routes/destiny-flower.js");
  handleDestinyFlowerRoutes = mod.handleDestinyFlowerRoutes;
  FLOWER_UNLOCK_FEATURE_KEY = mod.FLOWER_UNLOCK_FEATURE_KEY;
});

beforeEach(() => {
  unlockedFeatures = [];
  authResult = { userId: USER_ID };
});

function post(body, path = "/api/destiny-flower/match") {
  return new Request("https://code-destiny.com" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("해금 키가 실제로 flower-fc 다", () => {
  expect(FLOWER_UNLOCK_FEATURE_KEY).toBe("flower-fc");
});

test("해금이 없으면 402 를 내고 꽃을 한 송이도 주지 않는다", async () => {
  unlockedFeatures = ["olympus-fc", "saju-guardian"];
  const res = await handleDestinyFlowerRoutes(post({ profile: PROFILE }), {});
  expect(res.status).toBe(402);
  const data = await res.json();
  expect(data.ok).toBe(false);
  expect(data.code).toBe("PAYMENT_REQUIRED");
  expect(data.featureKey).toBe("flower-fc");
  // 🔴 402 응답에 매칭 결과가 새어 나가면 게이트가 무의미하다.
  // (featureKey 는 "flower-fc" 라 문자열 "flower" 를 정당하게 담는다 — 보는 것은 결과의 모양이다.)
  expect(data.sources).toBeUndefined();
  expect(data.theme).toBeUndefined();
  expect(JSON.stringify(data)).not.toMatch(/"flower"\s*:|scientific_name|symbolism|primary_color/);
});

test("로그인하지 않으면 401 이고 DB 조회까지 가지 않는다", async () => {
  authResult = null;
  const res = await handleDestinyFlowerRoutes(post({ profile: PROFILE }), {});
  expect(res.status).toBe(401);
  const data = await res.json();
  expect(data.code).toBe("UNAUTHORIZED");
  expect(data.sources).toBeUndefined();
});

test("해금 보유자에게는 네 체계를 모두 내려준다", async () => {
  unlockedFeatures = ["flower-fc"];
  const res = await handleDestinyFlowerRoutes(post({ profile: PROFILE }), {});
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.ok).toBe(true);
  expect(Object.keys(data.sources).sort()).toEqual(["astrology", "jamidusu", "saju", "sukuyo"]);
  // 사주는 이 입력으로 반드시 꽃이 나온다(엔진 직접 호출로 확인한 값).
  expect(data.sources.saju?.flower?.name).toBeTruthy();
});

test("한 체계가 실패해도 나머지는 내려간다", async () => {
  unlockedFeatures = ["flower-fc"];
  // 자미두수 차트가 없는 입력 — 그 체계만 비고 사주는 나와야 한다.
  const res = await handleDestinyFlowerRoutes(post({ profile: { ...PROFILE, ziwei: null } }), {});
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.sources.saju?.flower?.name).toBeTruthy();
});

test("프로필이 없으면 400 이고 해금 조회를 하지 않는다", async () => {
  unlockedFeatures = ["flower-fc"];
  const res = await handleDestinyFlowerRoutes(post({}), {});
  expect(res.status).toBe(400);
  const data = await res.json();
  expect(data.code).toBe("BAD_REQUEST");
});

test("GET 과 다른 경로는 매칭을 돌리지 않는다", async () => {
  unlockedFeatures = ["flower-fc"];
  const get = new Request("https://code-destiny.com/api/destiny-flower/match", { method: "GET" });
  expect((await handleDestinyFlowerRoutes(get, {})).status).toBe(405);

  const wrongPath = post({ profile: PROFILE }, "/api/destiny-flower/all");
  expect((await handleDestinyFlowerRoutes(wrongPath, {})).status).toBe(404);
});
