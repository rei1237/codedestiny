/**
 * @jest-environment node
 *
 * 2026-11-12 C1 무료 전환: 무료 키는 구매 경로가 409(FEATURE_NOW_FREE)로 닫히므로, 결과 라우트는
 * 결제 증빙 없이 열어야 한다. LLM 을 부르는 마인드스캔은 계속 증빙을 요구한다.
 * 진짜 무료 정책(lib/payment/free-fortune-policy.mjs)을 쓴다 — 여기서 정책을 mock 하지 말 것.
 */
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from "@jest/globals";
import { createHttpError } from "../../worker/lib/http.js";
import { drawPremiumYearCards } from "../../lib/tarot/tarot-year-premium.mjs";

const USER_ID = "507f1f77bcf86cd799439011";
let authResult = null;
let verifyCalls = [];
let accessCalls = [];
let saves = 0;
let handleTarotRoutes;
let handlePromptHubRoutes;
let PROMPT_HUB_TOOLS;
const PROMPT_HUB_BASIC_BODY = { toolId: "basic", computedFacts: "", fields: [{ id: "question", label: "질문", value: "올해 일 흐름" }] };

const chain = (value) => { const node = { select: () => node, sort: () => node, lean: () => Promise.resolve(value) }; return node; };
const requireUser = async () => {
  if (!authResult) throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
  return authResult;
};

beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn() })),
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireAuth: requireUser,
      requireUserFromRequest: requireUser,
      isAuthDbInfraError: () => false,
      getOptionalUserFromRequest: async () => null,
      PAID_FEATURE_ACCESS_USER_PROJECTION: "",
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      PaidExecutionRecord: {
        findOne: () => chain(null),
        findOneAndUpdate: () => { saves += 1; return chain(null); },
        updateOne: async () => { saves += 1; return {}; },
      },
    })),
    jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => withSettle({
      verifyPerUsePayment: async (_env, input) => { verifyCalls.push(input); return { proven: false, source: "", reason: "NO_RECORD" }; },
      logPerUsePaymentProof: () => {},
    })),
    jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
      canAccessPaidFeature: async (...args) => { accessCalls.push(args); return { allowed: false, reason: "PAYMENT_REQUIRED" }; },
      PAID_FEATURE_ACCESS_USER_PROJECTION: "",
    })),
    jest.unstable_mockModule("../../worker/lib/security/index.js", () => ({ enforceSensitiveEndpointSecurity: async () => ({ ok: true }) })),
    jest.unstable_mockModule("../../worker/lib/honey-wallet.js", () => ({
      honeyAttendanceStatus: async () => ({ balance: 0, attended: false }),
      attendHoney: async () => { throw new Error("무료 생성은 출석을 건드리지 않는다"); },
      bindPromptHubPayment: async () => { throw new Error("무료 생성은 결제를 묶지 않는다"); },
      spendPromptHubHoney: async () => { throw new Error("무료 생성은 꿀방울을 쓰지 않는다"); },
    })),
  ]);
  ({ handleTarotRoutes } = await import("../../worker/routes/tarot.js"));
  ({ handlePromptHubRoutes } = await import("../../worker/routes/prompt-hub.js"));
  ({ PROMPT_HUB_TOOLS } = await import("../../lib/fortune/prompt-hub-template.js"));
});

beforeEach(() => {
  authResult = null;
  verifyCalls = [];
  accessCalls = [];
  saves = 0;
});

const post = (path, body) => new Request("https://code-destiny.com" + path, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

test("직관 타로는 증빙 조회 없이 리딩을 준다", async () => {
  authResult = { userId: USER_ID, authUserDoc: { _id: USER_ID, role: "user" } };
  const cards = ["M00", "M01", "M03", "M19", "M10", "M16", "M07"].map((cardId, i) => ({ cardId, nameKr: "카드" + cardId, orientation: i % 3 ? "upright" : "reversed" }));
  const res = await handleTarotRoutes(post("/api/tarot/ijik-reading", { cards, requestId: "tarot-ijik:req:1-a" }), {});
  expect(res.status).toBe(200);
  expect(verifyCalls).toHaveLength(0);
});

test("크리스탈 소울은 증빙 조회 없이 리딩을 준다", async () => {
  authResult = { userId: USER_ID, authUserDoc: { _id: USER_ID, role: "user" } };
  const res = await handleTarotRoutes(post("/api/tarot/crystal-soul", {
    crystalSoulVersion: "gem-v3", gem: { id: "amethyst", name: "자수정" }, positions: ["a", "b", "c", "d", "e"],
    requestId: "tarot-crystal-soul-reading:req:1-a",
  }), {});
  expect(res.status).toBe(200);
  expect(verifyCalls).toHaveLength(0);
});

test("수비학 타로는 로그인·증빙 없이 5장 해석을 준다", async () => {
  const res = await handleTarotRoutes(post("/api/tarot/numerology-reading", {
    readingId: "reading-free", name: "홍길동", birthDate: "1990-03-15", topic: "love", question: "이 관계를 이어가도 될까요?",
  }), {});
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.interpretation?.cards).toHaveLength(5);
  expect(verifyCalls).toHaveLength(0);
});

test("올해 타로 12장은 결제 판정·저장 없이 public 으로 돌려준다", async () => {
  authResult = { userId: USER_ID, authUserDoc: { _id: USER_ID, role: "user" } };
  const cards = drawPremiumYearCards({ seed: "c1-free", year: 2026 }).map(({ cardId, position, orientation }) => ({ cardId, position, orientation }));
  const res = await handleTarotRoutes(post("/api/tarot/reading", {
    category: "general", spreadType: "yearly_twelve_card", cards, year: 2026, requestId: "tarot-year:2026:free",
  }), {});
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data).toMatchObject({ ok: true, accessSource: "public", stored: false, year: 2026 });
  expect(accessCalls).toHaveLength(0);
  expect(verifyCalls).toHaveLength(0);
  expect(saves).toBe(0);
});

test("LLM 마인드스캔은 계속 증빙을 요구한다", async () => {
  authResult = { userId: USER_ID, authUserDoc: { _id: USER_ID, role: "user" } };
  const res = await handleTarotRoutes(post("/api/tarot/mindscan", {
    pairs: Array.from({ length: 5 }, (_, i) => ({ slot: i + 1, mainCardId: i, subCardId: i + 5 })),
    drawId: "c1-mindscan-draw", question: "요즘 마음이 어지럽습니다", requestId: "tarot-mindscan:req:1-a",
  }), {});
  expect(res.status).not.toBe(200);
});

test("프롬프트 허브 생성은 로그인만 확인하고 paidWith public 으로 준다", async () => {
  expect(PROMPT_HUB_TOOLS).toBeTruthy();
  const body = { ...PROMPT_HUB_BASIC_BODY, requestId: "req-free-0001" };
  expect((await handlePromptHubRoutes(post("/api/fortune/prompt-hub/generate", body), {})).status).toBe(401);
  authResult = { userId: USER_ID };
  const res = await handlePromptHubRoutes(post("/api/fortune/prompt-hub/generate", body), {});
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data).toMatchObject({ ok: true, paidWith: "public" });
  expect(verifyCalls).toHaveLength(0);
});
