/**
 * 회원 탈퇴 API 단위 테스트
 *
 * 프레임워크: Jest + @jest-environment node
 *
 * 실행:
 *   npx jest __tests__/api/auth/withdraw.test.js --testEnvironment node
 *
 * 커버리지 대상:
 *   1. 인증 검증 (JWT 누락/만료/위조)
 *   2. CSRF 검증
 *   3. Rate Limiting
 *   4. 비밀번호 재확인 (로컬 계정)
 *   5. 탈퇴 처리 (User 비식별화, Payment 익명화, PointHistory 삭제)
 *   6. 탈퇴 감사 로그 기록
 *   7. 이미 탈퇴된 계정 재요청 차단
 *   8. CSRF 토큰 발급 (GET)
 */

import { jest } from "@jest/globals";
import { createHmac } from "node:crypto";

// ─────────────────────────────────────────────────────────────────
// 환경 변수 설정 (테스트 전용)
// ─────────────────────────────────────────────────────────────────
process.env.JWT_SECRET    = "test-jwt-secret-min-32-chars-here!";
process.env.CSRF_SECRET   = "test-csrf-secret";
process.env.NODE_ENV      = "test";

// ─────────────────────────────────────────────────────────────────
// 모듈 모킹
// ─────────────────────────────────────────────────────────────────

// mongoose 모킹 — 실제 DB 연결 없이 동작
const mockUser = {
  _id: "user123",
  name:         "홍길동",
  email:        "test@example.com",
  passwordHash: "$2a$10$hashedpassword",  // bcrypt 해시 (모킹)
  status:       "active",
  localAuth:    { enabled: true },
  socialAccounts: {
    google: { id: "", connectedAt: null },
    naver:  { id: "", connectedAt: null },
    kakao:  { id: "", connectedAt: null },
  },
};

// getUserModel 모킹
const mockUserFindById = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn();

jest.mock("../../../app/_lib/models/UserModel.js", () => ({
  getUserModel: jest.fn().mockResolvedValue({
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
  }),
}));

// getPaymentModel 모킹
const mockPaymentAggregate = jest.fn().mockResolvedValue([{ total: 9900 }]);
const mockPaymentUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });

jest.mock("../../../app/_lib/models/PaymentModel.js", () => ({
  getPaymentModel: jest.fn().mockResolvedValue({
    aggregate:   mockPaymentAggregate,
    updateMany:  mockPaymentUpdateMany,
  }),
}));

// getPointHistoryModel 모킹
const mockPointHistoryDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });

jest.mock("../../../app/_lib/models/PointHistoryModel.js", () => ({
  getPointHistoryModel: jest.fn().mockResolvedValue({
    deleteMany: mockPointHistoryDeleteMany,
  }),
}));

// getFortuneViewLogModel 모킹
const mockViewLogUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });

jest.mock("../../../app/_lib/models/FortuneViewLogModel.js", () => ({
  getFortuneViewLogModel: jest.fn().mockResolvedValue({
    updateMany: mockViewLogUpdateMany,
  }),
}));

// getDeletedAccountLogModel 모킹
const mockDeletedLogCreate = jest.fn().mockResolvedValue({});

jest.mock("../../../app/_lib/models/DeletedAccountLogModel.js", () => ({
  getDeletedAccountLogModel: jest.fn().mockResolvedValue({
    create: mockDeletedLogCreate,
  }),
}));

// bcrypt 모킹 — 실제 해시 연산 생략
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────────────────────────
// CSRF 토큰 생성 헬퍼 (테스트용 실제 서명)
// ─────────────────────────────────────────────────────────────────
function makeRealCsrfToken() {
  const timestamp = Date.now().toString(36);
  const random    = "abcd1234";
  const payload   = `${timestamp}.${random}`;
  const sig       = createHmac("sha256", "test-csrf-secret")
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

// ─────────────────────────────────────────────────────────────────
// JWT 토큰 생성 헬퍼
// ─────────────────────────────────────────────────────────────────
import jwt from "jsonwebtoken";

function makeJwt(payload = {}, expiresIn = "1h") {
  return jwt.sign(
    { userId: "user123", email: "test@example.com", role: "user", ...payload },
    "test-jwt-secret-min-32-chars-here!",
    { expiresIn, issuer: "code-destiny-api" },
  );
}

// ─────────────────────────────────────────────────────────────────
// Request 빌더 헬퍼
// ─────────────────────────────────────────────────────────────────
function makeRequest({
  body = {},
  jwtToken = null,
  csrfToken = null,
  cookie = null,
  method = "POST",
  ip = "127.0.0.1",
} = {}) {
  const csrfInCookie = csrfToken || "";
  const cookieStr = cookie
    ?? [
        jwtToken ? `fortune_auth_token=${jwtToken}` : "",
        csrfInCookie ? `cd_csrf_token=${csrfInCookie}` : "",
       ].filter(Boolean).join("; ");

  const headers = new Headers({
    "content-type":      "application/json",
    "x-forwarded-for":   ip,
    cookie:              cookieStr,
  });

  if (csrfToken) {
    headers.set("x-csrf-token", csrfToken);
  }

  return new Request("http://localhost/api/auth/withdraw", {
    method,
    headers,
    body: method !== "GET" ? JSON.stringify(body) : undefined,
  });
}

// ─────────────────────────────────────────────────────────────────
// import 대상 — 모킹 후 동적 import
// ─────────────────────────────────────────────────────────────────
let POST, GET;

beforeAll(async () => {
  const mod = await import("../../../app/api/auth/withdraw/route.js");
  POST = mod.POST;
  GET  = mod.GET;
});

// ─────────────────────────────────────────────────────────────────
// 각 테스트 전 목 초기화
// ─────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();

  // 기본 모킹: 정상 사용자 반환
  mockUserFindById.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...mockUser }),
    }),
  });
  mockUserFindByIdAndUpdate.mockResolvedValue({});
  bcrypt.compare.mockResolvedValue(true); // 기본값: 비밀번호 일치
});

// ─────────────────────────────────────────────────────────────────
// 테스트 그룹
// ─────────────────────────────────────────────────────────────────

describe("POST /api/auth/withdraw — 인증 검증", () => {
  test("JWT 토큰 누락 시 401 반환", async () => {
    const csrfToken = makeRealCsrfToken();
    const req = makeRequest({
      body:      { confirmText: "회원탈퇴", agreeIrreversible: true },
      csrfToken,
      jwtToken:  null, // JWT 없음
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.message).toMatch(/토큰/);
  });

  test("만료된 JWT 토큰 시 401 반환", async () => {
    const expiredToken = makeJwt({}, "-1s"); // 이미 만료
    const csrfToken = makeRealCsrfToken();
    const req = makeRequest({
      body:      { confirmText: "회원탈퇴", agreeIrreversible: true },
      csrfToken,
      jwtToken:  expiredToken,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("위조된 JWT 서명 시 401 반환", async () => {
    const fakeToken = makeJwt({}, "1h").split(".").slice(0, 2).join(".") + ".invalidsig";
    const csrfToken = makeRealCsrfToken();
    const req = makeRequest({
      body:      { confirmText: "회원탈퇴", agreeIrreversible: true },
      csrfToken,
      jwtToken:  fakeToken,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────
describe("POST /api/auth/withdraw — CSRF 검증", () => {
  test("CSRF 토큰 헤더 누락 시 403 반환", async () => {
    const jwtToken = makeJwt();
    const req = makeRequest({
      body:      { confirmText: "회원탈퇴", agreeIrreversible: true },
      jwtToken,
      csrfToken: null, // CSRF 없음
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.message).toMatch(/CSRF|보안/);
  });

  test("CSRF 쿠키와 헤더 불일치 시 403 반환", async () => {
    const jwtToken  = makeJwt();
    const realToken = makeRealCsrfToken();
    const fakeToken = realToken + "tampered";

    const cookieStr = `fortune_auth_token=${jwtToken}; cd_csrf_token=${realToken}`;
    const headers   = new Headers({
      "content-type":    "application/json",
      cookie:            cookieStr,
      "x-csrf-token":    fakeToken,  // 쿠키와 다름
      "x-forwarded-for": "127.0.0.1",
    });
    const req = new Request("http://localhost/api/auth/withdraw", {
      method: "POST",
      headers,
      body: JSON.stringify({ confirmText: "회원탈퇴", agreeIrreversible: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────
describe("POST /api/auth/withdraw — 입력 검증", () => {
  test("동의 체크박스 미체크 시 400 반환", async () => {
    const jwtToken  = makeJwt();
    const csrfToken = makeRealCsrfToken();
    const req = makeRequest({
      body:      { confirmText: "회원탈퇴", agreeIrreversible: false }, // 미동의
      jwtToken,
      csrfToken,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/동의/);
  });

  test("confirmText 불일치 시 400 반환", async () => {
    const jwtToken  = makeJwt();
    const csrfToken = makeRealCsrfToken();
    const req = makeRequest({
      body:      { confirmText: "탈퇴", agreeIrreversible: true }, // 오타
      jwtToken,
      csrfToken,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/회원탈퇴/);
  });

  test("로컬 계정 비밀번호 누락 시 400 반환", async () => {
    const jwtToken  = makeJwt();
    const csrfToken = makeRealCsrfToken();
    const req = makeRequest({
      body:      { confirmText: "회원탈퇴", agreeIrreversible: true, password: "" },
      jwtToken,
      csrfToken,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/비밀번호/);
  });

  test("비밀번호 불일치 시 403 반환", async () => {
    bcrypt.compare.mockResolvedValue(false); // 비밀번호 틀림

    const jwtToken  = makeJwt();
    const csrfToken = makeRealCsrfToken();
    const req = makeRequest({
      body: {
        confirmText:       "회원탈퇴",
        agreeIrreversible: true,
        password:          "wrongpassword123",
      },
      jwtToken,
      csrfToken,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.message).toMatch(/비밀번호/);
  });
});

// ─────────────────────────────────────────────────────────────────
describe("POST /api/auth/withdraw — 탈퇴 처리", () => {
  function makeValidRequest() {
    const jwtToken  = makeJwt();
    const csrfToken = makeRealCsrfToken();
    return makeRequest({
      body: {
        confirmText:       "회원탈퇴",
        agreeIrreversible: true,
        password:          "correctpassword123",
      },
      jwtToken,
      csrfToken,
    });
  }

  test("정상 탈퇴 시 200 반환 + 쿠키 만료 헤더 포함", async () => {
    const res = await POST(makeValidRequest());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.message).toMatch(/탈퇴/);

    // 쿠키 만료 확인
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toMatch(/fortune_auth_token/);
    expect(setCookie).toMatch(/Max-Age=0|max-age=0/i);
  });

  test("User 비식별화 업데이트 호출 확인", async () => {
    await POST(makeValidRequest());

    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
      "user123",
      expect.objectContaining({
        $set: expect.objectContaining({
          name:         "[탈퇴한 회원]",
          passwordHash: "",
          status:       "withdrawn",
        }),
      }),
    );
  });

  test("PointHistory 삭제 호출 확인", async () => {
    await POST(makeValidRequest());
    expect(mockPointHistoryDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ userId: expect.anything() }),
    );
  });

  test("Payment 익명화 호출 확인 (userId 제거)", async () => {
    await POST(makeValidRequest());
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ userId: expect.anything() }),
      expect.objectContaining({
        $unset: { userId: "" },
        $set:   expect.objectContaining({ _anonymized: true }),
      }),
    );
  });

  test("탈퇴 감사 로그 생성 확인 (PII 미포함)", async () => {
    await POST(makeValidRequest());
    expect(mockDeletedLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        emailHash:    expect.any(String),   // 원본 이메일 아닌 해시
        withdrawnAt:  expect.any(Date),
        reason:       "self",
      }),
    );

    // 원본 이메일이 로그에 포함되지 않았는지 확인
    const callArg = mockDeletedLogCreate.mock.calls[0][0];
    expect(callArg).not.toHaveProperty("email");
    expect(callArg.emailHash).not.toBe("test@example.com");
  });

  test("이미 탈퇴된 계정 재요청 시 409 반환", async () => {
    // withdrawn 상태 사용자 반환 모킹
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ ...mockUser, status: "withdrawn" }),
      }),
    });

    const res = await POST(makeValidRequest());
    expect(res.status).toBe(409);
  });

  test("사용자 미존재 시 404 반환", async () => {
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    const res = await POST(makeValidRequest());
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────
describe("POST /api/auth/withdraw — Rate Limiting", () => {
  test("동일 IP에서 초과 요청 시 429 반환", async () => {
    // RATE_LIMIT_MAX(3) 초과 시뮬레이션
    // → 동일 IP로 4번 연속 호출

    // DB 조회 실패로 빠르게 실패시켜 각 요청 처리 속도 향상
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null), // 404로 빠르게 종료
      }),
    });

    const RATE_IP = `192.0.2.${Math.floor(Math.random() * 200) + 10}`; // 고유 IP

    let lastStatus = 0;
    for (let i = 0; i < 4; i++) {
      const jwtToken  = makeJwt();
      const csrfToken = makeRealCsrfToken();
      const req = makeRequest({
        body: { confirmText: "회원탈퇴", agreeIrreversible: true, password: "pass1234" },
        jwtToken,
        csrfToken,
        ip: RATE_IP,
      });
      const res = await POST(req);
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});

// ─────────────────────────────────────────────────────────────────
describe("GET /api/auth/withdraw — CSRF 토큰 발급", () => {
  test("로그인된 사용자에게 CSRF 토큰 발급", async () => {
    const jwtToken = makeJwt();
    const req = makeRequest({ jwtToken, method: "GET" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.csrfToken).toBe("string");
    expect(data.csrfToken.split(".")).toHaveLength(3); // timestamp.random.sig 형식
  });

  test("미인증 상태에서 CSRF 토큰 요청 시 401 반환", async () => {
    const req = makeRequest({ jwtToken: null, method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test("발급된 CSRF 토큰이 cd_csrf_token 쿠키로 설정됨", async () => {
    const jwtToken = makeJwt();
    const req = makeRequest({ jwtToken, method: "GET" });
    const res = await GET(req);

    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toMatch(/cd_csrf_token/);
    expect(setCookie).toMatch(/SameSite=Strict/i);
  });
});

// ─────────────────────────────────────────────────────────────────
describe("CSRF 유틸 — verifyCsrfToken", () => {
  let verifyCsrfToken;
  let generateCsrfToken;

  beforeAll(async () => {
    const mod = await import("../../../app/_lib/csrf.js");
    verifyCsrfToken  = mod.verifyCsrfToken;
    generateCsrfToken = mod.generateCsrfToken;
  });

  test("정상 토큰은 valid:true 반환", () => {
    const token  = generateCsrfToken();
    const result = verifyCsrfToken(token);
    expect(result.valid).toBe(true);
  });

  test("위변조된 토큰은 valid:false 반환", () => {
    const token  = generateCsrfToken();
    const parts  = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.invalidsignature`;
    const result = verifyCsrfToken(tampered);
    expect(result.valid).toBe(false);
  });

  test("형식 오류 토큰은 valid:false 반환", () => {
    const result = verifyCsrfToken("malformedtoken");
    expect(result.valid).toBe(false);
  });

  test("빈 토큰은 valid:false 반환", () => {
    expect(verifyCsrfToken("").valid).toBe(false);
    expect(verifyCsrfToken(null).valid).toBe(false);
  });
});
