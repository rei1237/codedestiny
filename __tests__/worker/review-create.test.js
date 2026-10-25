/** @jest-environment node */
import { jest } from "@jest/globals";
const create = jest.fn();
const findExisting = jest.fn();
let authenticated = true;
const usage = jest.fn(async () => ({ featureKey: "tarot-year-fortune", sources: ["payment"] }));
let handleReviewRoutes;
beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: async () => {}, withMongoRetry: async (_env, operation) => operation(),
  }));
  await jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    requireUserFromRequest: async () => authenticated ? ({ userId: "507f1f77bcf86cd799439011", name: "mock" }) : null,
    isAuthDbInfraError: () => false,
  }));
  await jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    User: { findById: () => ({ select: () => ({ lean: async () => ({ name: "mock" }) }) }) },
  }));
  await jest.unstable_mockModule("../../worker/lib/review-models.js", () => ({
    PUBLIC_REVIEW_STATUS: "approved", REVIEW_BODY_MAX_LENGTH: 1000, REVIEW_BODY_MIN_LENGTH: 20, REVIEW_TITLE_MAX_LENGTH: 60,
    Review: { create, aggregate: async () => [], findOne: () => ({ select: () => ({ lean: findExisting }) }) },
  }));
  await jest.unstable_mockModule("../../worker/lib/review-eligibility.js", () => ({
    findUsedReviewProduct: usage, listReviewableProducts: async () => [],
    resolveUsageVerification: () => ({ isVerifiedPurchase: true, usageSource: "purchase" }),
  }));
  await jest.unstable_mockModule("../../worker/lib/review-reward.js", () => ({ REVIEW_REWARD_AMOUNT: 3000, REVIEW_REWARD_KRW: 30000 }));
  ({ handleReviewRoutes } = await import("../../worker/routes/reviews.js"));
});
beforeEach(() => {
  jest.clearAllMocks();
  authenticated = true;
  findExisting.mockResolvedValue(null);
  usage.mockResolvedValue({ featureKey: "tarot-year-fortune", sources: ["payment"] });
  create.mockResolvedValue({ _id: "507f1f77bcf86cd799439099" });
});
const request = () => new Request("https://mock.local/api/reviews", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ productId: "tarot", rating: 4, body: "카드 설명이 구체적이라 지금 고민을 정리하는 데 도움이 되었어요." }),
});
const socialRequest = (override = {}) => new Request('https://mock.local/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: 'tarot', rating: 1, title: '아쉬운 점', body: '카드 설명은 좋았지만 조금 더 구체적인 조언이 있었으면 좋겠어요.', submissionId: '507f1f77bcf86cd799439099', socialProof: { platform: 'threads', url: 'https://www.threads.com/@reader/post/123', disclosed: true }, ...override }) });
test('SNS evidence and low ratings remain pending', async () => {
  expect((await handleReviewRoutes(socialRequest(), {})).status).toBe(201);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ rating: 1, status: 'pending', socialProof: { platform: 'threads', url: 'https://www.threads.com/@reader/post/123', disclosed: true } }));
});
test('invalid proof, missing disclosure, and unauthenticated requests cannot submit', async () => {
  expect((await handleReviewRoutes(socialRequest({ socialProof: { platform: 'threads', url: 'javascript:alert(1)', disclosed: true } }), {})).status).toBe(400);
  expect((await handleReviewRoutes(socialRequest({ socialProof: { platform: 'threads', url: 'https://www.threads.com/@reader/post/123', disclosed: false } }), {})).status).toBe(400);
  authenticated = false;
  expect((await handleReviewRoutes(socialRequest(), {})).status).toBe(401);
  expect(create).not.toHaveBeenCalled();
});
test('same account and product may submit again with a new identity', async () => {
  expect((await handleReviewRoutes(socialRequest(), {})).status).toBe(201);
  expect((await handleReviewRoutes(socialRequest({ submissionId: '507f1f77bcf86cd799439098' }), {})).status).toBe(201);
  expect(create).toHaveBeenCalledTimes(2);
});
test('lost response retries are idempotent and changed payloads conflict', async () => {
  create.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000 }));
  const payload = await socialRequest().json();
  findExisting.mockResolvedValue({ ...payload, status: 'pending' });
  const response = await handleReviewRoutes(socialRequest(), {});
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ idempotent: true });
  create.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000 }));
  expect((await handleReviewRoutes(socialRequest({ body: '새로운 내용으로 다시 제출하는 별도의 후기입니다.' }), {})).status).toBe(409);
});
test("제출은 pending이며 서버 이용 기록으로 인증한다", async () => {
  const response = await handleReviewRoutes(request(), {});
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ status: "pending" });
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ status: "pending", userId: "507f1f77bcf86cd799439011", isVerifiedPurchase: true }));
});
test("중복은 409로 반환하고 이용 기록 없는 제출은 403으로 막는다", async () => {
  create.mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: 11000 }));
  expect((await handleReviewRoutes(request(), {})).status).toBe(409);
  usage.mockResolvedValueOnce(null);
  expect((await handleReviewRoutes(request(), {})).status).toBe(403);
  expect(create).toHaveBeenCalledTimes(1);
});
test("공개 상품 API의 보상 조건은 기존 승인 보상 상수에서 나온다", async () => {
  const response = await handleReviewRoutes(new Request("https://mock.local/api/reviews/products"), {});
  expect((await response.json()).rewardPolicy).toEqual({ amount: 3000, valueKRW: 30000, currency: "moonstone", trigger: "approved" });
});
