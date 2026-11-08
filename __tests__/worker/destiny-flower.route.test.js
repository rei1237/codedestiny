/** @jest-environment node */
// Server computation, per-IP limit, no login needed (2026-11-08). The saju result card is free; the atelier detail
// (other three sources, candidates, story, deep flower language) goes only to flower-fc holders (user decision 2026-11-08).
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
/** getOptionalUserFromRequest 결과. null 이면 비로그인. */
let authResult = { userId: USER_ID };
let authCalls = 0;
/** 권한 조회가 던질 오류(DB 장애 흉내). */
let accessError = null;
/** incrementRateLimit 대역. 각 테스트가 갈아 끼운다. */
let rateLimit;

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
      getOptionalUserFromRequest: async () => {
        authCalls += 1;
        return authResult;
      },
    })),
    jest.unstable_mockModule("../../worker/lib/paid-content-read-access.js", () => ({
      hasPurchasedAccountContentAccess: async (_env, { userId, featureKey }) => {
        if (accessError) throw accessError;
        return Boolean(userId) && unlockedFeatures.includes(featureKey);
      },
    })),
    jest.unstable_mockModule("../../worker/lib/rate-limit.js", () => ({
      incrementRateLimit: (...args) => rateLimit(...args),
    })),
  ]);

  const mod = await import("../../worker/routes/destiny-flower.js");
  handleDestinyFlowerRoutes = mod.handleDestinyFlowerRoutes;
  FLOWER_UNLOCK_FEATURE_KEY = mod.FLOWER_UNLOCK_FEATURE_KEY;
});

beforeEach(() => {
  unlockedFeatures = [];
  authResult = { userId: USER_ID };
  authCalls = 0;
  accessError = null;
  rateLimit = jest.fn(async () => ({ count: 1, resetAt: Date.now() + 60000 }));
});

function post(body, path = "/api/destiny-flower/match", ip = "203.0.113.7") {
  return new Request("https://code-destiny.com" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify(body),
  });
}

const DETAIL_FIELDS = ["candidates", "narrative", "rationale_points", "bloom_story", "destiny_flower_language", "day_master_environment", "algorithm"];

function expectFreeCardOnly(data) {
  expect(data.ok).toBe(true);
  expect(data.atelierUnlocked).toBe(false);
  expect(Object.keys(data.sources)).toEqual(["saju"]);
  const card = data.sources.saju;
  expect(card.flower?.name).toBeTruthy();
  expect(card.saju_verdict).toBeTruthy();
  expect(card.profile.domains.saju.day_master).toBeTruthy();
  for (const field of DETAIL_FIELDS) expect(card[field]).toBeUndefined();
  expect(Object.keys(card.flower_data).every((key) => ["sticker_label", "day_master_badge", "season_label", "scenario_title", "scenario_reason"].includes(key))).toBe(true);
  expect(JSON.stringify(card)).not.toMatch(/ritual_tip|relationship_theme|career_theme|growth_cycle/);
}

test("미해금 로그인 사용자는 사주 결과 카드만 받는다", async()=>{
 const res=await handleDestinyFlowerRoutes(post({profile:PROFILE}),{});
 expect(res.status).toBe(200);
 expectFreeCardOnly(await res.json());
});

test("과거 구매 키는 기록 호환을 위해 유지한다", () => {
  expect(FLOWER_UNLOCK_FEATURE_KEY).toBe("flower-fc");
});

test("로그인하지 않아도 200 으로 결과 카드를 받고 상세는 없다", async () => {
  authResult = null;
  unlockedFeatures = ["flower-fc"];
  const res = await handleDestinyFlowerRoutes(post({ profile: PROFILE }), {});
  expect(res.status).toBe(200);
  const data = await res.json();
  expectFreeCardOnly(data);
  expect(data.entitlementDegraded).toBe(false);
});

test("권한 조회가 DB 장애면 결과 카드는 주고 degraded 로 알린다(미구매로 바꾸지 않는다)", async () => {
  unlockedFeatures = ["flower-fc"];
  accessError = new Error("mongo down");
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const res = await handleDestinyFlowerRoutes(post({ profile: PROFILE }), {});
  warn.mockRestore();
  expect(res.status).toBe(200);
  const data = await res.json();
  expectFreeCardOnly(data);
  expect(data.entitlementDegraded).toBe(true);
});

test("IP 한도는 해시한 IP 로 세고 원문 IP 를 저장소에 넘기지 않는다", async () => {
  await handleDestinyFlowerRoutes(post({ profile: PROFILE }), {});
  expect(rateLimit).toHaveBeenCalledTimes(1);
  const arg = rateLimit.mock.calls[0][0];
  expect(arg.endpoint).toBe("destiny-flower:match");
  expect(arg.windowMs).toBe(60000);
  expect(arg.subjectHash).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(arg)).not.toContain("203.0.113.7");
});

test("한도를 넘으면 429 이고 매칭을 돌리지 않는다", async () => {
  rateLimit = jest.fn(async () => ({ count: 31, resetAt: Date.now() + 60000 }));
  const res = await handleDestinyFlowerRoutes(post({ profile: PROFILE }), {});
  expect(res.status).toBe(429);
  expect(res.headers.get("Retry-After")).toBe("60");
  const data = await res.json();
  expect(data.code).toBe("RATE_LIMITED");
  expect(data.sources).toBeUndefined();
});

test("한도 저장소가 실패하면 아이솔레이트 폴백으로 같은 한도를 센다", async () => {
  rateLimit = jest.fn(async () => { throw new Error("db down"); });
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const ip = "198.51.100.99";
  const statuses = [];
  for (let i = 0; i < 31; i += 1) {
    statuses.push((await handleDestinyFlowerRoutes(post({ profile: PROFILE }, "/api/destiny-flower/match", ip), {})).status);
  }
  expect(statuses.slice(0, 30).every((status) => status === 200)).toBe(true);
  expect(statuses[30]).toBe(429);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

test("해금 보유자에게는 네 체계를 모두 내려준다", async () => {
  unlockedFeatures = ["flower-fc"];
  const res = await handleDestinyFlowerRoutes(post({ profile: PROFILE }), {});
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.ok).toBe(true);
  expect(data.atelierUnlocked).toBe(true);
  expect(Object.keys(data.sources).sort()).toEqual(["astrology", "jamidusu", "saju", "sukuyo"]);
  expect(Array.isArray(data.sources.saju.candidates)).toBe(true);
  expect(data.sources.saju.destiny_flower_language).toBeTruthy();
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

test("개화 서사는 점수에 든 신호의 단계만 만들고 공유 훅에 지어낸 확률이 없다", async () => {
  const { matchDestinyFlower } = await import("../../worker/lib/destiny-flower-engine.js");
  for (const saju of [{ dayStem: "을" }, { dayStem: "을", is_strong: false, johu_type: "hot" }, { dayStem: "경", is_strong: true }]) {
    const result = matchDestinyFlower({ ...PROFILE, saju }, { limit: 3 });
    const signals = result.candidates[0].matchedSignals;
    const stages = result.bloom_story.map((s) => s.stage);
    expect(stages[stages.length - 1]).toBe("bloom");
    expect(stages.includes("season")).toBe(signals.includes("season"));
    const lightSignals = ["strength_release", "strength_support", "yongshin_element", "johu_warm", "johu_cool"];
    expect(stages.filter((s) => s === "light").length).toBe(signals.filter((s) => lightSignals.includes(s)).length);
    expect(result.destiny_flower_language).toContain(result.flower.flower_language);
    expect(result.share_hook.rarity_line).not.toMatch(/%/);
  }
});

test("친구 꽃 공개 카드는 로그인 없이 꽃 정보만 주고 모르는 id 는 404", async () => {
  authResult = null;
  const get = (id) => new Request("https://code-destiny.com/api/destiny-flower/flower/" + id, { method: "GET" });
  const res = await handleDestinyFlowerRoutes(get("magnolia"), {});
  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toMatch(/public/);
  const data = await res.json();
  expect(Object.keys(data.flower).sort()).toEqual(
    ["elements", "flower_language", "id", "name", "primary_color", "scientific_name", "secondary_color", "title", "vibe_message"],
  );
  expect(data.flower.flower_language).toBeTruthy();
  for (const bad of ["nope", "..%2Fmatch", "%E0%A4%A"]) {
    expect((await handleDestinyFlowerRoutes(get(bad), {})).status).toBe(404);
  }
  const post = new Request("https://code-destiny.com/api/destiny-flower/flower/magnolia", { method: "POST" });
  expect((await handleDestinyFlowerRoutes(post, {})).status).toBe(405);
});

test("lang 을 보내면 꽃 이름·꽃말·나의 꽃말을 그 언어로 내려주고 ko 는 그대로다", async () => {
  unlockedFeatures = ["flower-fc"];
  const pick = async (body) => (await (await handleDestinyFlowerRoutes(post(body), {})).json()).sources.saju;
  const ko = await pick({ profile: PROFILE });
  const ja = await pick({ profile: PROFILE, lang: "ja" });
  expect(ja.flower.id).toBe(ko.flower.id);
  for (const field of [(r) => r.flower.name, (r) => r.flower.flower_language, (r) => r.destiny_flower_language]) {
    expect(field(ja)).not.toMatch(/[가-힣]/);
    expect(field(ja)).not.toBe(field(ko));
  }
  expect(ko.flower.flower_language).toBe((await pick({ profile: PROFILE, lang: "ko" })).flower.flower_language);
});
