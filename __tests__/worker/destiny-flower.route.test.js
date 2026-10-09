/** @jest-environment node */
// Authentication and server computation remain; no purchase is required from 2026-10-08.
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

test("미해금 로그인 사용자도 네 체계를 무료로 받는다", async()=>{
 const res=await handleDestinyFlowerRoutes(post({profile:PROFILE}),{});
 expect(res.status).toBe(200);const data=await res.json();expect(data.ok).toBe(true);
 expect(Object.keys(data.sources).sort()).toEqual(['astrology','jamidusu','saju','sukuyo']);
 expect(data.sources.saju?.flower?.name).toBeTruthy();
});

test("과거 구매 키는 기록 호환을 위해 유지한다", () => {
  expect(FLOWER_UNLOCK_FEATURE_KEY).toBe("flower-fc");
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

test("89종 꽃 모두 꽃말이 있고 응답 꽃에 flower_language 가 실린다", async () => {
  const { unifiedFlowerCatalog } = await import("../../worker/lib/destiny-flower-engine.js");
  const { FLOWER_LANGUAGE_KO } = await import("../../worker/lib/destiny-flower-traits.js");
  const missing = unifiedFlowerCatalog.map((f) => f.id).filter((id) => !FLOWER_LANGUAGE_KO[id]);
  expect(missing).toEqual([]);
  const res = await handleDestinyFlowerRoutes(post({ profile: PROFILE }), {});
  const data = await res.json();
  const sajuFlower = data.sources.saju.flower;
  expect(sajuFlower.flower_language).toBe(FLOWER_LANGUAGE_KO[sajuFlower.id]);
});
