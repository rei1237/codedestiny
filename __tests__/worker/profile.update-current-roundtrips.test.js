/**
 * @jest-environment node
 *
 * PATCH /api/profile/current 이 잡는 Mongo admission 슬롯 수를 고정한다.
 *
 * 왜 슬롯 수를 세는가: withMongoRetry 는 호출 1회당 전역 게이트 슬롯 1개를 잡는다
 * (worker/lib/db.js, limit 5). 초과분은 MongoOperationOverloadedError 로 떨어지는데
 * 이건 **재시도 대상이 아니라서** 그대로 503 이 되고, 쓰기 경로는 GET 과 달리 degrade 하지
 * 않으므로 사용자에게 503 이 그대로 나간다. 프로필 전환은 홈 진입 팬아웃과 같은 순간에
 * 일어나므로 이 라우트가 슬롯을 몇 개 먹는지가 곧 503 확률이다.
 * 따라서 withMongoRetry 목의 호출 횟수 = 슬롯 수를 직접 단언한다.
 */

import { jest } from "@jest/globals";

const TEST_USER_ID = "507f1f77bcf86cd799439011";

const withMongoRetry = jest.fn((env, op) => op());
const connectDb = jest.fn(async () => ({}));
const requireUserFromRequest = jest.fn();
const profileCardFindOne = jest.fn();
const profileCardFind = jest.fn();
const userFindById = jest.fn();
const userUpdateOne = jest.fn();

/** mongoose 체이너(.select().lean()) 흉내 — 최종 값만 돌려준다. */
function chain(value) {
  const node = {
    select: () => node,
    sort: () => node,
    lean: () => Promise.resolve(value),
  };
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
      ProfileCard: { findOne: profileCardFindOne, find: profileCardFind },
      User: { findById: userFindById, updateOne: userUpdateOne },
      PointHistory: {},
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

function patchRequest(body) {
  return new Request("https://example.com/api/profile/current", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function userDoc(overrides = {}) {
  return {
    _id: TEST_USER_ID,
    profileSubscription: { tier: "premium", isActive: true },
    destinyProfilesCurrentId: "dp_1",
    destinyProfilesLockedCurrentId: "",
    destinyProfilesLockedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  withMongoRetry.mockImplementation((env, op) => op());
  requireUserFromRequest.mockResolvedValue({ userId: TEST_USER_ID, authUserDoc: null });
  profileCardFindOne.mockReturnValue(chain({ userId: TEST_USER_ID, profileId: "dp_2" }));
  profileCardFind.mockReturnValue(chain([]));
  userFindById.mockReturnValue(chain(userDoc()));
  userUpdateOne.mockResolvedValue({ acknowledged: true });
});

async function callPatch(body) {
  return handleProfileRoutes(patchRequest(body), {});
}

describe("PATCH /api/profile/current — Mongo 왕복 예산", () => {
  test("정상 전환은 admission 슬롯을 2개만 쓴다 (읽기 1 + 쓰기 1)", async () => {
    const response = await callPatch({ currentId: "dp_2", baseCurrentId: "dp_1" });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.currentId).toBe("dp_2");
    // 🔴 4로 되돌아가면(직렬 조회 부활) 여기서 실패한다.
    expect(withMongoRetry).toHaveBeenCalledTimes(2);
  });

  test("두 읽기는 같은 슬롯 안에서 병렬로 나간다", async () => {
    await callPatch({ currentId: "dp_2", baseCurrentId: "dp_1" });

    expect(profileCardFindOne).toHaveBeenCalledTimes(1);
    expect(userFindById).toHaveBeenCalledTimes(1);
    // 첫 슬롯이 두 읽기를 모두 담당하고, 두 번째 슬롯은 쓰기다.
    expect(withMongoRetry).toHaveBeenCalledTimes(2);
  });

  test("성공 경로는 전체 카드 목록을 읽지 않는다 (죽은 lockedId 조회 부활 차단)", async () => {
    await callPatch({ currentId: "dp_2", baseCurrentId: "dp_1" });

    expect(profileCardFind).not.toHaveBeenCalled();
  });

  test("실제 전환값을 쓴다", async () => {
    await callPatch({ currentId: "dp_2", baseCurrentId: "dp_1" });

    expect(userUpdateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = userUpdateOne.mock.calls[0];
    expect(filter).toEqual({ _id: TEST_USER_ID });
    expect(update.$set.destinyProfilesCurrentId).toBe("dp_2");
  });

  test("없는 카드면 404 이고 쓰기를 하지 않는다", async () => {
    profileCardFindOne.mockReturnValue(chain(null));

    const response = await callPatch({ currentId: "dp_missing", baseCurrentId: "dp_1" });

    expect(response.status).toBe(404);
    expect(userUpdateOne).not.toHaveBeenCalled();
  });

  test("baseCurrentId 가 어긋나면 staleSwitchIgnored 로 거부하고 쓰기를 하지 않는다", async () => {
    const response = await callPatch({ currentId: "dp_2", baseCurrentId: "dp_stale" });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.staleSwitchIgnored).toBe(true);
    expect(payload.currentId).toBe("dp_1");
    expect(userUpdateOne).not.toHaveBeenCalled();
  });

  test("baseCurrentId 가 비면 다른 카드로의 전환은 수용되지 않는다 (클라이언트가 반드시 실어야 하는 이유)", async () => {
    const response = await callPatch({ currentId: "dp_2" });
    const payload = await response.json();

    expect(payload.staleSwitchIgnored).toBe(true);
    expect(userUpdateOne).not.toHaveBeenCalled();
  });
});
