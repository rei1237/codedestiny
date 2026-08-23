/**
 * @jest-environment node
 *
 * 결제 확인이 없던 타로 콘텐츠 엔드포인트 2곳의 게이트 계약.
 *
 * 2026-08-24 감사에서 발견. 둘 다 유료 리딩을 내려주면서 **결제 확인을 하지 않았다** —
 * 클라이언트가 `ensurePaidAccess` 로 결제를 마친 뒤 부르긴 했지만 서버는 그것을 확인하지
 * 않았고 requestId 도 받지 않았다.
 *
 * - `/crystal-soul` — 라우터 상단 `requireAuth` 는 통과했으므로 **로그인 사용자면** 결제 없이
 *   직접 POST 해서 받을 수 있었다.
 * - `/mindscan` — 그 상단 인증에서 **명시적으로 제외**돼 있어(`path !== "/mindscan"`) 아무나
 *   부를 수 있었고, **Gemini 를 직접 부르므로** LLM 비용까지 열려 있었다.
 *
 * 🔴 게이트를 mock 으로 건너뛰지 말 것. 여기서 가는 것은 인증·증빙 조회뿐이고 분기는 실제 라우트가 돈다.
 */
import { jest } from "@jest/globals";
// 🔴 실제 requireAuth 는 HttpError 를 던진다. 평범한 Error 는 handleRouteError 가 상태를 못 읽어
//    500 이 되고, 그러면 테스트가 제품이 아니라 픽스처를 재게 된다.
import { createHttpError } from "../../worker/lib/http.js";

const USER_ID = "507f1f77bcf86cd799439011";

let authResult = { userId: USER_ID, authUserDoc: { _id: USER_ID, role: "user" } };
let proofResult = { proven: false, source: "", reason: "NO_RECORD" };
let accessDecision = { allowed: false };
let verifyCalls = [];
let mindscanBuilt = 0;
let crystalBuilt = 0;

let handleTarotRoutes;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireAuth: async () => {
        if (!authResult) {
          throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
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
    jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
      canAccessPaidFeature: async () => accessDecision,
      PAID_FEATURE_ACCESS_USER_PROJECTION: "",
    })),
    // 🔴 생성기가 **한 번이라도 돌았는지** 세야 "402 인데 LLM 은 이미 태웠다" 를 잡을 수 있다.
    jest.unstable_mockModule("../../lib/tarot/mindscan-reading.mjs", () => ({
      buildMindscanReadingPayload: async () => {
        mindscanBuilt += 1;
        return { ok: true, sections: [{ title: "t", body: "b" }] };
      },
    })),
    jest.unstable_mockModule("../../lib/tarot/crystal-soul-reading.mjs", () => ({
      buildCrystalSoulV3Reading: () => {
        crystalBuilt += 1;
        return { ok: true, reading: "x" };
      },
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
  mindscanBuilt = 0;
  crystalBuilt = 0;
});

function post(path, body) {
  return new Request("https://code-destiny.com/api/tarot" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CRYSTAL_BODY = {
  crystalSoulVersion: "gem-v3",
  gem: { id: "amethyst", name: "자수정" },
  positions: ["a", "b", "c", "d", "e"],
  requestId: "tarot-crystal-soul-reading:req:1755300000000-abc1234",
};
const MINDSCAN_BODY = {
  pairs: [{ a: "M00", b: "M01" }],
  question: "요즘 마음이 어지럽습니다",
  requestId: "tarot-mindscan:req:1755300000000-abc1234",
};

describe("/crystal-soul", () => {
  test("증빙이 없으면 402 이고 리딩을 만들지도 않는다", async () => {
    const res = await handleTarotRoutes(post("/crystal-soul", CRYSTAL_BODY), {});
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.code).toBe("CRYSTAL_SOUL_PAYMENT_NOT_VERIFIED");
    expect(data.reading).toBeUndefined();
    expect(crystalBuilt).toBe(0);
  });

  test("증빙 조회에 tarot-crystal-soul-reading 과 requestId 를 넘긴다", async () => {
    await handleTarotRoutes(post("/crystal-soul", CRYSTAL_BODY), {});
    expect(verifyCalls).toHaveLength(1);
    expect(verifyCalls[0].featureKey).toBe("tarot-crystal-soul-reading");
    expect(verifyCalls[0].requestId).toBe(CRYSTAL_BODY.requestId);
  });

  test("증빙되면 리딩이 나온다", async () => {
    proofResult = { proven: true, source: "coin", reason: "" };
    const res = await handleTarotRoutes(post("/crystal-soul", CRYSTAL_BODY), {});
    expect(res.status).toBe(200);
    expect(crystalBuilt).toBe(1);
  });

  test("비로그인은 401 이고 증빙 조회까지 가지 않는다", async () => {
    authResult = null;
    const res = await handleTarotRoutes(post("/crystal-soul", CRYSTAL_BODY), {});
    expect(res.status).toBe(401);
    expect(verifyCalls).toHaveLength(0);
    expect(crystalBuilt).toBe(0);
  });
});

describe("/mindscan", () => {
  test("증빙이 없으면 402 이고 🔴 Gemini 를 부르지 않는다", async () => {
    const res = await handleTarotRoutes(post("/mindscan", MINDSCAN_BODY), {});
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.code).toBe("MINDSCAN_PAYMENT_NOT_VERIFIED");
    expect(data.sections).toBeUndefined();
    // 게이트가 생성기 앞에 있어야 LLM 비용이 새지 않는다.
    expect(mindscanBuilt).toBe(0);
  });

  test("증빙 조회에 tarot-mindscan 과 requestId 를 넘긴다", async () => {
    await handleTarotRoutes(post("/mindscan", MINDSCAN_BODY), {});
    expect(verifyCalls).toHaveLength(1);
    expect(verifyCalls[0].featureKey).toBe("tarot-mindscan");
    expect(verifyCalls[0].requestId).toBe(MINDSCAN_BODY.requestId);
  });

  test("증빙되면 리딩이 나온다", async () => {
    proofResult = { proven: true, source: "monthly", reason: "" };
    const res = await handleTarotRoutes(post("/mindscan", MINDSCAN_BODY), {});
    expect(res.status).toBe(200);
    expect(mindscanBuilt).toBe(1);
  });

  test("DB 일시 장애는 503 이고 미결제로 세탁하지 않는다", async () => {
    proofResult = { proven: null, source: "", reason: "DB_UNAVAILABLE" };
    const res = await handleTarotRoutes(post("/mindscan", MINDSCAN_BODY), {});
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.code).toBe("MINDSCAN_VERIFY_UNAVAILABLE");
    expect(mindscanBuilt).toBe(0);
  });

  test("이용권 커버는 차감 기록 없이 통과한다", async () => {
    accessDecision = { allowed: true, accessSource: "pass" };
    const res = await handleTarotRoutes(post("/mindscan", MINDSCAN_BODY), {});
    expect(res.status).toBe(200);
    expect(verifyCalls).toHaveLength(0);
    expect(mindscanBuilt).toBe(1);
  });
});
