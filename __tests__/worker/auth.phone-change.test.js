/**
 * @jest-environment node
 *
 * 휴대폰 번호 변경(PATCH|POST /api/auth/me/phone-number) 계약 가드.
 *
 * 이 경로는 2026-08-19 에 생겼다. 그전까지 /me/phone-number 는 handleSavePaymentPhoneNumber
 * 의 **별칭**이라 이름과 달리 변경이 되지 않았다(기존 번호가 있으면 updated:false 로 조기 반환).
 * 번호가 가입 필수가 된 이상 오타를 고칠 경로가 없으면 개인정보 보호법 제36조(정정 요구권)를
 * 만족시킬 수 없어 갈라 놓았다.
 *
 * 여기서 못박는 것은 셋이다.
 *   ① 남의 번호를 바꿀 수 없다(대상은 언제나 토큰의 userId).
 *   ② 다른 계정이 쓰는 번호는 409 로 거절한다(계정을 자동 병합하지 않는다).
 *   ③ 시도 횟수에 상한이 있다 — 409 가 "이 번호는 이미 가입돼 있다"를 알려주므로,
 *      무제한이면 번호를 하나씩 넣어 보며 가입 여부를 훑을 수 있다.
 */

const ENCRYPTED_PREFIX = "v1:";
const mockEncryptPhoneNumber = jest.fn(async (value) => (value ? `${ENCRYPTED_PREFIX}enc(${value})` : ""));
const mockHashPhoneNumber = jest.fn(async (value) => (value ? "hash(" + value + ")" : ""));
const mockDecryptPhoneNumber = jest.fn(async (value) => {
  const stored = String(value || "");
  const match = stored.match(/^v1:enc\((\d+)\)$/);
  if (match) return match[1];
  return /^01\d{8,9}$/.test(stored) ? stored : "";
});

const mockUserFindById = jest.fn();
const mockCollectionFindOne = jest.fn();
const mockCollectionFindOneAndUpdate = jest.fn();

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: {
    connection: { name: "test" },
    Types: {
      ObjectId: class {
        constructor(id) { this.id = String(id || ""); }
        toString() { return this.id; }
        static isValid(value) { return /^[a-f0-9]{24}$/.test(String(value || "")); }
      },
    },
  },
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/pii-crypto.js", () => ({
  encryptPhoneNumber: mockEncryptPhoneNumber,
  decryptPhoneNumber: mockDecryptPhoneNumber,
  hashPhoneNumber: mockHashPhoneNumber,
  normalizeKoreanPhoneNumber: jest.fn((value) => {
    const digits = String(value || "").replace(/\D/g, "");
    const local = digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
    return /^01\d{8,9}$/.test(local) ? local : "";
  }),
  maskKoreanPhoneNumber: jest.fn((value) => {
    const digits = String(value || "");
    return /^01\d{8,9}$/.test(digits) ? `${digits.slice(0, 3)}-****-${digits.slice(-4)}` : "";
  }),
  isEncryptedPiiValue: jest.fn((value) => String(value || "").startsWith(ENCRYPTED_PREFIX)),
  ENCRYPTED_PII_PATTERN: /^v1:.+$/,
}));

jest.unstable_mockModule("../../worker/lib/password.js", () => ({
  hashPassword: jest.fn(async () => "hashed"),
  verifyPassword: jest.fn(async () => true),
  needsPasswordRehash: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  AbuseScore: {}, ContentOverride: {}, DailyFortuneSubscription: {}, DestinyBiasCard: {},
  Insight: {}, KarmaDestinyAiConsultation: {}, LifeBookAiConsultation: {}, LlmResponseCache: {},
  LoveSecretAiConsultation: {}, NewYearAiConsultation: {}, PaidExecutionRecord: {}, Payment: {},
  ProfileCard: {}, ServiceExecutionTransaction: {}, SukuyoCompatibilityAiConsultation: {},
  ZiweiAiConsultation: {}, MonthlyCreditLedger: {}, PointHistory: {},
  CONTENT_ENTITLEMENT_SOURCES: {}, CONTENT_ENTITLEMENT_STATUSES: {}, RECENT_CONSUME_REQUEST_ID_CAP: 200,
  RefreshTokenSession: {
    create: jest.fn(async (doc) => doc),
    findOne: jest.fn(() => ({ lean: async () => null })),
    findOneAndUpdate: jest.fn(() => ({ lean: async () => null })),
    updateMany: jest.fn(async () => ({})),
    updateOne: jest.fn(async () => ({})),
  },
  User: {
    findById: mockUserFindById,
    collection: {
      findOne: mockCollectionFindOne,
      findOneAndUpdate: mockCollectionFindOneAndUpdate,
    },
  },
}));

const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  AUTH_SECRET: "test-auth-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
  PII_ENC_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
};

const USER_ID = "64f0a1b2c3d4e5f678901234";
const OTHER_USER_ID = "64f0a1b2c3d4e5f678909999";
const OLD_PHONE = "01011112222";
const NEW_PHONE = "01033334444";

let authRoutes;
let accessToken;
// phoneHash 선점 조회가 돌려줄 주인. null 이면 "아무도 안 쓰는 번호".
let phoneHashOwner;

/** findById(...).select(...).maxTimeMS(...).lean() 체인을 그대로 흉내낸다. */
function findByIdChain(doc) {
  return { select: () => ({ maxTimeMS: () => ({ lean: async () => doc }) }) };
}

function buildRequest(body, { token = accessToken } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) {
    headers.set("cookie", `fortune_auth_token=${token}`);
    headers.set("authorization", `Bearer ${token}`);
  }
  return new Request("https://code-destiny.com/api/auth/me/phone-number", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

async function callChange(body, options) {
  const response = await authRoutes.__authTestUtils.handleChangePhoneNumber(buildRequest(body, options), ENV);
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
  const { signJwt } = await import("../../worker/lib/jwt.js");
  accessToken = await signJwt(
    { userId: USER_ID, email: "tester@example.com", role: "user" },
    ENV.JWT_ACCESS_SECRET,
    { expiresIn: "30m", issuer: ENV.JWT_ISSUER, audience: ENV.JWT_AUDIENCE },
  );
});

beforeEach(() => {
  jest.clearAllMocks();
  authRoutes.__authTestUtils.clearPhoneChangeRateLimitState();
  phoneHashOwner = null;
  // User.collection.findOne 은 두 목적으로 불린다 — 인증(resolveActiveUserAuth)과 번호 선점 조회.
  // 질의 모양으로 갈라 주지 않으면 선점 조회가 인증용 문서를 받아 "항상 중복"이 된다.
  mockCollectionFindOne.mockImplementation(async (query) => (
    query && "phoneHash" in query
      ? phoneHashOwner
      : { _id: USER_ID, email: "tester@example.com", role: "user", status: "active" }
  ));
  mockUserFindById.mockReturnValue(findByIdChain({
    _id: USER_ID,
    phoneNumber: `${ENCRYPTED_PREFIX}enc(${OLD_PHONE})`,
    phoneHash: `hash(${OLD_PHONE})`,
  }));
  mockCollectionFindOneAndUpdate.mockResolvedValue({
    value: { _id: USER_ID, phoneNumber: `${ENCRYPTED_PREFIX}enc(${NEW_PHONE})` },
  });
});

describe("번호 변경", () => {
  test("기존 번호가 있어도 덮어쓴다 — 이게 /me/payment-phone 과 갈라진 이유다", async () => {
    const { status, payload } = await callChange({ phoneNumber: "010-3333-4444" });

    expect(status).toBe(200);
    expect(payload.updated).toBe(true);
    const [, update] = mockCollectionFindOneAndUpdate.mock.calls[0];
    expect(update.$set.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${NEW_PHONE})`);
    // 🔴 해시가 같이 안 바뀌면 옛 번호가 unique 인덱스를 계속 점유한다.
    expect(update.$set.phoneHash).toBe(`hash(${NEW_PHONE})`);
    expect(update.$set["legalConsents.phoneAcceptedAt"]).toBeInstanceOf(Date);
  });

  test("같은 번호를 다시 보내면 저장 없이 updated:false 로 끝난다", async () => {
    const { status, payload } = await callChange({ phoneNumber: OLD_PHONE });

    expect(status).toBe(200);
    expect(payload.updated).toBe(false);
    expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
  });

  test("형식이 어긋나면 400 이고 저장하지 않는다", async () => {
    for (const phoneNumber of ["", "02-123-4567", "0103333", "없음", undefined]) {
      const { status, payload } = await callChange({ phoneNumber });
      expect(status).toBe(400);
      expect(payload.code).toBe("invalid_phone_number");
    }
    expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
  });

  test("다른 계정이 쓰는 번호는 409 로 거절하고 계정을 합치지 않는다", async () => {
    phoneHashOwner = { _id: OTHER_USER_ID };

    const { status, payload } = await callChange({ phoneNumber: NEW_PHONE });

    expect(status).toBe(409);
    expect(payload.code).toBe("duplicate_phone");
    expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
  });

  test("선점 조회는 자기 문서를 제외한다 — 아니면 아무도 번호를 못 바꾼다", async () => {
    await callChange({ phoneNumber: NEW_PHONE });

    const takenQuery = mockCollectionFindOne.mock.calls
      .map(([query]) => query)
      .find((query) => query && "phoneHash" in query);
    expect(takenQuery).toBeDefined();
    expect(String(takenQuery._id.$ne)).toBe(USER_ID);
  });

  test("🔴 대상은 언제나 토큰의 userId 다 — 본문의 userId 를 읽지 않는다", async () => {
    await callChange({ phoneNumber: NEW_PHONE, userId: OTHER_USER_ID, _id: OTHER_USER_ID });

    const [filter] = mockCollectionFindOneAndUpdate.mock.calls[0];
    expect(String(filter._id)).toBe(USER_ID);
  });

  // requireAuth 는 401 Response 대신 HttpError 를 던지고, 라우터의 handleRouteError 가 응답으로
  // 바꾼다(다른 인증 필요 핸들러와 같은 계약이다).
  test("로그인하지 않으면 바꿀 수 없다", async () => {
    await expect(authRoutes.__authTestUtils.handleChangePhoneNumber(
      buildRequest({ phoneNumber: NEW_PHONE }, { token: "" }),
      ENV,
    )).rejects.toMatchObject({ status: 401 });
    expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
  });

  test("시도 횟수에 상한이 있다 — 번호 열거를 막는다", async () => {
    let limited = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { status } = await callChange({ phoneNumber: NEW_PHONE });
      if (status === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
  });
});

describe("/me/payment-phone 은 그대로 최초 등록 전용이다", () => {
  test("이미 번호가 있으면 새 값을 무시하고 updated:false 를 돌려준다", async () => {
    const response = await authRoutes.__authTestUtils.handleSavePaymentPhoneNumber(
      buildRequest({ phoneNumber: NEW_PHONE }),
      ENV,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.updated).toBe(false);
    expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
