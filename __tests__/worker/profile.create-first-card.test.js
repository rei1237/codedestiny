/**
 * @jest-environment node
 *
 * POST /api/profile — 신규 회원의 "첫 카드 생성"이 죽지 않는가.
 *
 * 왜 이 계약인가: 이 라우트는 회원가입 직후, 홈 진입 팬아웃(/api/auth/me ·
 * /api/me/access-state · /api/billing/balance · /api/subscription/status)과 같은 순간에
 * 불린다. withMongoRetry 는 호출 1회당 전역 admission 슬롯 1개를 잡고(worker/lib/db.js,
 * 기본 한도 8), 초과분은 MongoOperationOverloadedError 로 떨어지는데 그건 **재시도 제외**다.
 * 그래서 이 핸들러가 슬롯을 몇 개 먹는지가 곧 신규 회원의 첫 카드 실패 확률이다.
 *
 * 그리고 실패했을 때의 상태코드가 500 이면 클라이언트가 재시도하지 않는다
 * (js/destiny-profile.js `_dpIsTransientResult` 는 0/503/504 만 일시 장애로 본다).
 * 즉 "대답을 못한 것"을 "서버가 거절한 것"으로 내보내면 1회 블립이 곧 영구 실패가 된다.
 */

import { jest } from "@jest/globals";

const TEST_USER_ID = "507f1f77bcf86cd799439011";

const withMongoRetry = jest.fn((env, op) => op());
const connectDb = jest.fn(async () => ({}));
const requireUserFromRequest = jest.fn();
const profileCardFindOne = jest.fn();
const profileCardFind = jest.fn();
const profileCardCountDocuments = jest.fn();
const profileCardCreate = jest.fn();
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
      ProfileCard: {
        findOne: profileCardFindOne,
        find: profileCardFind,
        countDocuments: profileCardCountDocuments,
        create: profileCardCreate,
      },
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

const NEW_CARD = {
  profileId: "dp_new_1",
  name: "첫째",
  gender: "M",
  birthDate: "1991-03-20",
  birthTime: "08:42",
  birth: { year: 1991, month: 3, day: 20, hour: 8, minute: 42, calType: "solar" },
  location: { label: "대한민국 · 서울", tz: "Asia/Seoul", lng: 127.0, lat: 37.5 },
};

function storedCard(overrides = {}) {
  return {
    userId: TEST_USER_ID,
    profileId: NEW_CARD.profileId,
    name: NEW_CARD.name,
    gender: "M",
    birth: NEW_CARD.birth,
    location: NEW_CARD.location,
    ...overrides,
  };
}

function createdDoc() {
  const raw = storedCard();
  return { ...raw, toObject: () => raw };
}

/** 신규 회원 문서 — 카드 0개, 무료 등급(profileLimit 1). */
function newUserDoc(overrides = {}) {
  return {
    _id: TEST_USER_ID,
    profileSubscription: { tier: "free", profileLimit: 1 },
    destinyProfilesCurrentId: "",
    destinyProfilesLockedCurrentId: "",
    destinyProfilesLockedAt: null,
    ...overrides,
  };
}

function postRequest(body) {
  return new Request("https://example.com/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function callCreate(body = { profile: NEW_CARD, profileId: NEW_CARD.profileId, action: "create" }) {
  return handleProfileRoutes(postRequest(body), {});
}

/** worker/lib/db.js 의 createMongoOperationOverloadedError 와 같은 모양. */
function overloadError() {
  const error = new Error("MongoDB operation capacity is temporarily saturated.");
  error.name = "MongoOperationOverloadedError";
  error.code = "MONGO_OPERATION_ADMISSION_TIMEOUT";
  return error;
}

function duplicateKeyError() {
  const error = new Error("E11000 duplicate key error collection: profilecards index: userId_1_profileId_1");
  error.code = 11000;
  return error;
}

beforeEach(() => {
  jest.clearAllMocks();
  withMongoRetry.mockImplementation((env, op) => op());
  requireUserFromRequest.mockResolvedValue({ userId: TEST_USER_ID, authUserDoc: null });
  userFindById.mockReturnValue(chain(newUserDoc()));
  userUpdateOne.mockResolvedValue({ acknowledged: true });
  profileCardCountDocuments.mockResolvedValue(0);
  profileCardFindOne.mockReturnValue(chain(null));
  profileCardFind.mockReturnValue(chain([storedCard()]));
  profileCardCreate.mockResolvedValue(createdDoc());
});

describe("POST /api/profile — 신규 회원 첫 카드", () => {
  test("카드 0개면 결제 없이 생성된다", async () => {
    const response = await callCreate();
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.profile.id).toBe(NEW_CARD.profileId);
    expect(payload.currentId).toBe(NEW_CARD.profileId);
    expect(profileCardCreate).toHaveBeenCalledTimes(1);
  });

  test("첫 카드 생성이 admission 슬롯을 3개만 쓴다 (읽기 1 + 생성 1 + 마무리 1)", async () => {
    await callCreate();

    // 🔴 6으로 되돌아가면(직렬 조회·선행 중복검사 부활) 여기서 실패한다.
    // 홈 진입 팬아웃이 이미 5~6을 쓰는데 한도는 8이라, 이 라우트가 6을 먹으면 초과가 기본값이 된다.
    expect(withMongoRetry).toHaveBeenCalledTimes(3);
  });

  test("선행 중복검사로 슬롯을 낭비하지 않는다 (unique 인덱스 + 11000 처리가 같은 일을 한다)", async () => {
    await callCreate();

    expect(profileCardFindOne).not.toHaveBeenCalled();
  });

  test("admission 포화는 500 이 아니라 503 이어야 한다 (클라이언트가 재시도할 수 있게)", async () => {
    withMongoRetry.mockImplementation(() => Promise.reject(overloadError()));

    const response = await callCreate();
    const payload = await response.json();

    // 500 이면 js/destiny-profile.js 의 transient 재시도가 돌지 않아 1회 블립이 영구 실패가 된다.
    expect(response.status).toBe(503);
    expect(payload.code).toBe("SERVICE_UNAVAILABLE");
  });

  test("Mongo op 타임아웃도 503 으로 나간다", async () => {
    withMongoRetry.mockImplementation(() => Promise.reject(new Error("MongoDB operation timed out in Worker.")));

    const response = await callCreate();

    expect(response.status).toBe(503);
  });

  test("재시도가 만든 중복키는 실패가 아니라 이미 만들어진 카드로 이어진다", async () => {
    // 1차 시도가 실제로 삽입된 뒤 응답만 유실 → 재시도(클라이언트든 withMongoRetry든)가 11000 을 본다.
    profileCardCreate.mockRejectedValue(duplicateKeyError());
    profileCardFindOne.mockReturnValue(chain(storedCard()));

    const response = await callCreate();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.profile.id).toBe(NEW_CARD.profileId);
  });

  test("중복키인데 카드가 실제로 없으면 종전대로 409 로 거절한다", async () => {
    profileCardCreate.mockRejectedValue(duplicateKeyError());
    profileCardFindOne.mockReturnValue(chain(null));

    const response = await callCreate();

    expect(response.status).toBe(409);
  });

  test("진짜 버그(비 DB 예외)는 500 이되, 사용자에게 기계 코드를 보여주지 않는다", async () => {
    profileCardCreate.mockRejectedValue(new TypeError("boom"));

    const response = await callCreate();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("PROFILE_CREATE_INTERNAL_ERROR");
    // message 는 그대로 window.alert() 된다 — 영문 에러코드가 실리면 안 된다.
    expect(payload.message).not.toBe("PROFILE_CREATE_INTERNAL_ERROR");
    expect(payload.message).toMatch(/[가-힣]/);
  });
});
