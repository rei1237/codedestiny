/**
 * @jest-environment node
 *
 * 사주 원석 추천 답변 기록(sajuCrystal)의 다른 기기 동기화.
 * PATCH /api/profile/:id 에 { profile: { sajuCrystal } } 만 오면 전용 분기가 받는다.
 * - 허용 키만, 결과 본문 없음, 크기 상한(lib/saju/crystal-flow.mjs CRYSTAL_RECORD_MAX_BYTES)
 * - updatedAt이 더 늦을 때만 덮어쓴다(미래 시각은 서버 지금 시각으로 당긴다)
 * - 출생정보·이름은 건드리지 않고, 프로필 수정 내역(PointHistory)도 남기지 않는다
 * GET /api/profile/:id 상세 응답에는 sajuCrystal 키가 늘 있다(없으면 null) — 클라이언트가 지원 여부를 이것으로 본다.
 * DB·네트워크는 모두 목이다.
 */

import { jest } from "@jest/globals";

const TEST_USER_ID = "507f1f77bcf86cd799439011";

const withMongoRetry = jest.fn((env, op) => op());
const connectDb = jest.fn(async () => ({}));
const requireUserFromRequest = jest.fn();
const profileCardFindOne = jest.fn();
const profileCardFind = jest.fn();
const profileCardUpdateOne = jest.fn();
const userFindById = jest.fn();
const userUpdateOne = jest.fn();
const pointHistoryCreate = jest.fn();

function chain(value) {
  const node = { select: () => node, sort: () => node, lean: () => Promise.resolve(value) };
  return node;
}

let handleProfileRoutes;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({ connectDb, withMongoRetry })),
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireUserFromRequest,
      isAuthDbInfraError: () => false,
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      ProfileCard: { findOne: profileCardFindOne, find: profileCardFind, updateOne: profileCardUpdateOne },
      User: { findById: userFindById, updateOne: userUpdateOne },
      PointHistory: { create: pointHistoryCreate, findOne: jest.fn(() => chain(null)) },
      MonthlyCreditLedger: { find: () => ({ select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => [] }) },
    })),
    jest.unstable_mockModule("../../worker/lib/monthly-credit-store.js", () => ({
      restoreMonthlyCreditLot: jest.fn(),
    })),
    jest.unstable_mockModule("../../worker/lib/security/index.js", () => ({
      enforceSensitiveEndpointSecurity: jest.fn(async () => ({ ok: true })),
    })),
    jest.unstable_mockModule("../../worker/lib/access-state.js", () => ({
      invalidateAccessStateCacheForUser: jest.fn(),
    })),
  ]);
  ({ handleProfileRoutes } = await import("../../worker/routes/profile.js"));
});

const record = (overrides = {}) => ({
  v: 1,
  answers: {
    good: "listed",
    hard: "skip",
    entries: [{ year: 2015, month: null, kind: "good", areas: { work: "good" }, source: "volunteered" }],
    asked: [],
  },
  answersKey: "ca1-0123456789abcdef",
  resultKey: "cr1-fedcba9876543210",
  versions: { engine: "crystal-engine-v1", catalog: "crystal-catalog-v1", answers: "crystal-answers-v1" },
  updatedAt: "2026-11-10T00:00:00.000Z",
  ...overrides,
});

const profileDoc = (extra = {}) => ({
  userId: TEST_USER_ID,
  profileId: "dp_1",
  name: "연이",
  gender: "F",
  birth: { year: 1990, month: 5, day: 17, hour: 7, minute: 30, calType: "solar", timeUnknown: false },
  location: {},
  ...extra,
});

function request(method, body) {
  return new Request("https://example.com/api/profile/dp_1", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  withMongoRetry.mockImplementation((env, op) => op());
  requireUserFromRequest.mockResolvedValue({ userId: TEST_USER_ID, authUserDoc: { destinyProfilesCurrentId: "dp_1" } });
  profileCardFindOne.mockReturnValue(chain(profileDoc()));
  profileCardFind.mockReturnValue(chain([]));
  profileCardUpdateOne.mockResolvedValue({ acknowledged: true });
  userFindById.mockReturnValue(chain({ _id: TEST_USER_ID, destinyProfilesCurrentId: "dp_1" }));
  userUpdateOne.mockResolvedValue({ acknowledged: true });
});

describe("PATCH /api/profile/:id — sajuCrystal 전용 분기", () => {
  test("저장된 기록이 없으면 검사한 기록만 $set 한다", async () => {
    const response = await handleProfileRoutes(request("PATCH", { profile: { sajuCrystal: record() } }), {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, applied: true });
    expect(payload.sajuCrystal).toEqual(record());
    expect(profileCardUpdateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = profileCardUpdateOne.mock.calls[0];
    expect(filter).toEqual({ userId: TEST_USER_ID, profileId: "dp_1" });
    expect(Object.keys(update.$set)).toEqual(["sajuCrystal"]);
    expect(update.$set.sajuCrystal).toEqual(record());
    expect(pointHistoryCreate).not.toHaveBeenCalled();
  });

  test("서버 기록이 같거나 더 늦으면 덮어쓰지 않고 서버 기록을 돌려준다", async () => {
    const stored = record({ updatedAt: "2026-11-11T00:00:00.000Z", answersKey: "ca1-aaaaaaaaaaaaaaaa" });
    profileCardFindOne.mockReturnValue(chain(profileDoc({ sajuCrystal: stored })));

    for (const updatedAt of ["2026-11-10T00:00:00.000Z", "2026-11-11T00:00:00.000Z"]) {
      const response = await handleProfileRoutes(request("PATCH", { profile: { sajuCrystal: record({ updatedAt }) } }), {});
      const payload = await response.json();
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({ ok: true, applied: false });
      expect(payload.sajuCrystal.answersKey).toBe("ca1-aaaaaaaaaaaaaaaa");
    }
    expect(profileCardUpdateOne).not.toHaveBeenCalled();
  });

  test("더 늦은 기록은 덮어쓴다", async () => {
    profileCardFindOne.mockReturnValue(chain(profileDoc({ sajuCrystal: record({ updatedAt: "2026-11-09T00:00:00.000Z" }) })));
    const response = await handleProfileRoutes(request("PATCH", { profile: { sajuCrystal: record() } }), {});
    expect((await response.json()).applied).toBe(true);
    expect(profileCardUpdateOne).toHaveBeenCalledTimes(1);
  });

  test("미래 updatedAt은 서버 지금 시각으로 당겨 저장한다", async () => {
    const before = Date.now();
    await handleProfileRoutes(request("PATCH", { profile: { sajuCrystal: record({ updatedAt: "2099-01-01T00:00:00.000Z" }) } }), {});
    const saved = profileCardUpdateOne.mock.calls[0][1].$set.sajuCrystal;
    const time = Date.parse(saved.updatedAt);
    expect(time).toBeGreaterThanOrEqual(before);
    expect(time).toBeLessThanOrEqual(Date.now());
  });

  test.each([
    ["결과 본문", record({ crystals: [{ id: "amethyst" }] })],
    ["답변의 모르는 키", record({ answers: { ...record().answers, note: "x" } })],
    ["항목의 모르는 키", record({ answers: { ...record().answers, entries: [{ ...record().answers.entries[0], memo: "x" }] } })],
    ["버전 틀림", record({ v: 2 })],
    ["키 형식 틀림", record({ resultKey: "cr1-<script>" })],
    ["시각 아님", record({ updatedAt: "어제" })],
    ["배열", [record()]],
  ])("형식이 틀리면 400 이고 쓰지 않는다: %s", async (_label, bad) => {
    const response = await handleProfileRoutes(request("PATCH", { profile: { sajuCrystal: bad } }), {});
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_SAJU_CRYSTAL");
    expect(profileCardUpdateOne).not.toHaveBeenCalled();
  });

  test("크기 상한을 넘으면 413 이다", async () => {
    const response = await handleProfileRoutes(request("PATCH", { profile: { sajuCrystal: record({ updatedAt: "x".repeat(4000) }) } }), {});
    expect(response.status).toBe(413);
    expect(profileCardFindOne).not.toHaveBeenCalled();
    expect(profileCardUpdateOne).not.toHaveBeenCalled();
  });

  test("남의 카드·없는 카드는 404 이다(소유자 조건으로만 찾는다)", async () => {
    profileCardFindOne.mockReturnValue(chain(null));
    const response = await handleProfileRoutes(request("PATCH", { profile: { sajuCrystal: record() } }), {});
    expect(response.status).toBe(404);
    expect(profileCardFindOne.mock.calls[0][0]).toEqual({ userId: TEST_USER_ID, profileId: "dp_1" });
    expect(profileCardUpdateOne).not.toHaveBeenCalled();
  });

  test("다른 필드와 함께 오면 전용 분기가 아니고, 일반 수정은 sajuCrystal을 쓰지 않는다", async () => {
    await handleProfileRoutes(request("PATCH", {
      requestId: "req-1",
      profile: { name: "연이", birthDate: "1990-05-17", birthTime: "07:30", sajuCrystal: record() },
    }), {});
    for (const [, update] of profileCardUpdateOne.mock.calls) {
      expect(update?.$set && "sajuCrystal" in update.$set).toBe(false);
    }
  });
});

describe("GET /api/profile/:id — 상세 응답의 sajuCrystal", () => {
  test("저장 기록이 없으면 null 키를 싣는다(지원 표시)", async () => {
    const response = await handleProfileRoutes(request("GET"), {});
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.profile).toHaveProperty("sajuCrystal", null);
  });

  test("저장 기록은 다시 검사해 싣고, 깨진 기록은 null", async () => {
    profileCardFindOne.mockReturnValue(chain(profileDoc({ sajuCrystal: record() })));
    let payload = await (await handleProfileRoutes(request("GET"), {})).json();
    expect(payload.profile.sajuCrystal).toEqual(record());

    profileCardFindOne.mockReturnValue(chain(profileDoc({ sajuCrystal: { v: 1, answers: {}, result: "본문" } })));
    payload = await (await handleProfileRoutes(request("GET"), {})).json();
    expect(payload.profile.sajuCrystal).toBeNull();
  });
});
