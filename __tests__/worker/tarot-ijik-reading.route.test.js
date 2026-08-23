/**
 * @jest-environment node
 *
 * 커리어 전환 타로 리딩 라우트의 게이트 계약.
 *
 * 2026-08-24 이전에는 결제만 서버에서 차감되고 리딩은 브라우저가 만들었다. 생성기를 워커로
 * 옮기고 이 라우트를 유일한 입구로 뒀으므로, 여기서 회당 결제 증빙이 빠지면 우회가 그대로
 * 돌아온다.
 *
 * 🔴 게이트를 mock 으로 건너뛰지 말 것 — 여기서 mock 하는 것은 증빙 조회와 인증뿐이고,
 *    분기 판정은 실제 라우트가 돌린다.
 */
import { jest } from "@jest/globals";

const USER_ID = "507f1f77bcf86cd799439011";
const REQUEST_ID = "tarot-ijik:req:1755300000000-a1b2c3d";
const CARDS = ["M00", "M01", "M03", "M19", "M10", "M16", "M07"].map((id, i) => ({
  cardId: id,
  nameKr: "카드" + id,
  orientation: i % 3 === 0 ? "reversed" : "upright",
}));

/** 각 테스트가 갈아 끼운다. */
let authResult = { userId: USER_ID, authUserDoc: { _id: USER_ID, role: "user" } };
let proofResult = { proven: false, source: "", reason: "NO_RECORD" };
let accessDecision = { allowed: false };
let verifyCalls = [];

let handleTarotRoutes;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireAuth: async () => {
        if (!authResult) {
          const error = new Error("UNAUTHORIZED");
          error.status = 401;
          throw error;
        }
        return authResult;
      },
      isAuthDbInfraError: () => false,
      getOptionalUserFromRequest: async () => null,
      PAID_FEATURE_ACCESS_USER_PROJECTION: "",
    })),
    jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({
      verifyPerUsePayment: async (env, input) => {
        verifyCalls.push(input);
        return proofResult;
      },
      logPerUsePaymentProof: () => {},
    })),
    // 🔴 이용권 지름길은 별도 모듈이다(paid-feature-access.js). 여기서 안 갈면
    //    이용권 보유자 경로가 실제로 열리는지 확인할 수 없다.
    jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
      canAccessPaidFeature: async () => accessDecision,
      PAID_FEATURE_ACCESS_USER_PROJECTION: "",
    })),
  ]);

  const mod = await import("../../worker/routes/tarot.js");
  handleTarotRoutes = mod.handleTarotRoutes;
});

beforeEach(() => {
  authResult = { userId: USER_ID, authUserDoc: { _id: USER_ID, role: "user" } };
  proofResult = { proven: false, source: "", reason: "NO_RECORD" };
  accessDecision = { allowed: false };
  verifyCalls = [];
});

function post(body, path = "/api/tarot/ijik-reading") {
  return new Request("https://code-destiny.com" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("증빙이 없으면 402 를 내고 리딩을 한 줄도 주지 않는다", async () => {
  const res = await handleTarotRoutes(post({ cards: CARDS, requestId: REQUEST_ID }), {});
  expect(res.status).toBe(402);
  const data = await res.json();
  expect(data.ok).toBe(false);
  expect(data.code).toBe("IJIK_TAROT_PAYMENT_NOT_VERIFIED");
  // 🔴 402 응답에 결과가 새어 나가면 게이트가 무의미하다.
  expect(data.reading).toBeUndefined();
  expect(data.assessment).toBeUndefined();
  expect(data.aiPrompt).toBeUndefined();
});

test("증빙 조회에 tarot-ijik 과 결제 requestId 를 그대로 넘긴다", async () => {
  await handleTarotRoutes(post({ cards: CARDS, requestId: REQUEST_ID }), {});
  expect(verifyCalls).toHaveLength(1);
  expect(verifyCalls[0].featureKey).toBe("tarot-ijik");
  expect(verifyCalls[0].requestId).toBe(REQUEST_ID);
  expect(verifyCalls[0].userId).toBe(USER_ID);
});

test("DB 일시 장애(proven=null)를 미결제로 세탁하지 않는다", async () => {
  proofResult = { proven: null, source: "", reason: "DB_UNAVAILABLE" };
  const res = await handleTarotRoutes(post({ cards: CARDS, requestId: REQUEST_ID }), {});
  expect(res.status).toBe(503);
  const data = await res.json();
  expect(data.code).toBe("IJIK_TAROT_VERIFY_UNAVAILABLE");
  expect(data.message).toMatch(/추가 결제 없이/);
});

test("로그인하지 않으면 401 이고 증빙 조회까지 가지 않는다", async () => {
  authResult = null;
  const res = await handleTarotRoutes(post({ cards: CARDS, requestId: REQUEST_ID }), {});
  expect(res.status).toBe(401);
  const data = await res.json();
  expect(data.code).toBe("IJIK_TAROT_AUTH_REQUIRED");
  expect(verifyCalls).toHaveLength(0);
});

test("증빙된 사용자에게는 판정·리딩·프롬프트를 내려준다", async () => {
  proofResult = { proven: true, source: "coin", reason: "" };
  const res = await handleTarotRoutes(post({ cards: CARDS, requestId: REQUEST_ID }), {});
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.ok).toBe(true);
  expect(data.accessVerified).toBe(true);
  expect(data.accessSource).toBe("coin");
  expect(data.assessment.direction.label).toBeTruthy();
  expect(data.reading.length).toBeGreaterThan(500);
  expect(data.aiPrompt.length).toBeGreaterThan(500);
});

test("이용권 커버는 차감 기록 없이도 통과한다", async () => {
  accessDecision = { allowed: true, accessSource: "pass" };
  const res = await handleTarotRoutes(post({ cards: CARDS, requestId: REQUEST_ID }), {});
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.accessSource).toBe("pass");
  // 지름길로 통과했으므로 증빙 조회는 돌지 않는다.
  expect(verifyCalls).toHaveLength(0);
});

test("카드가 7장이 아니면 400 이고 결제 확인 뒤에 걸린다", async () => {
  proofResult = { proven: true, source: "coin", reason: "" };
  const res = await handleTarotRoutes(post({ cards: CARDS.slice(0, 3), requestId: REQUEST_ID }), {});
  expect(res.status).toBe(400);
  const data = await res.json();
  expect(data.code).toBe("IJIK_TAROT_BAD_SPREAD");
  expect(data.reading).toBeUndefined();
});
