/**
 * @jest-environment node
 *
 * AI 라우트 레이트리밋 버킷 계약(worker/lib/security/index.js 의 enforceAiRouteSecurity).
 *
 * 왜 못박는가: 리포트형 상품은 엣지 응답 데드라인(100초) 때문에 한 요청에 다 담기지 않아
 * 클라이언트가 `/generate` 를 완료까지 반복 호출한다(휴먼 디자인 18섹션 = 서버 상한 10웨이브).
 * 그런데 `/generate` 가 `/start` 와 **같은 일일 버킷**을 쓰면 리포트 1건이 일일 예산을
 * 6~11건씩 먹어, 60건 예산이 사용자당 하루 8~10건으로 쪼그라든다(2026-08-30 확인).
 * 반대로 `/generate` 가 `/start` 의 **별칭**인 서비스(ziwei-ai 등)에 별도 버킷을 주면
 * 일일 천장이 두 배가 된다. 이 파일은 그 둘을 동시에 못박는다.
 *
 * 버킷의 정체는 enforceRateLimit 이 AbuseScore 에 쓰는 `endpoint` 문자열로 관측한다 —
 * 키(subjectHash)는 해시라 읽을 수 없지만 endpoint 는 그대로 나간다.
 *
 * 🔴 검사 대상인 security 모듈 자체는 목으로 대체하지 않는다(레이트리밋 로직이 실물이어야
 *    이 계약을 검사할 수 있다). DB·인증·모델만 목이다.
 */

const RATE_LIMIT_CALLS = [];

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: { Types: { ObjectId: { isValid: () => false } } },
  withMongoRetry: (_env, operation) => operation(),
}));

jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
  getOptionalUserFromRequest: jest.fn(async () => ({ userId: "user-1" })),
}));

jest.unstable_mockModule("../../worker/lib/env.js", () => ({
  getEnv: (env, key) => (env && env[key] != null ? String(env[key]) : ""),
}));

jest.unstable_mockModule("../../worker/lib/http.js", () => ({
  getRequestMeta: () => ({ ip: "203.0.113.7", userAgent: "jest" }),
  json: (body, init = {}) => ({ body, status: init.status || 200 }),
}));

const noopModel = () => ({
  findOne: () => ({ lean: async () => null }),
  findOneAndUpdate: async () => null,
  create: async () => null,
});

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  AbuseScore: {
    findOne: () => ({ lean: async () => null }),
    findOneAndUpdate: async (filter, update) => {
      if (filter?.kind === "rate_limit") {
        RATE_LIMIT_CALLS.push({ endpoint: filter.endpoint, limitSeen: update?.$inc?.score });
      }
      return { score: 1 };
    },
    create: async () => null,
  },
  ContentEntitlement: noopModel(),
  PaidExecutionRecord: noopModel(),
  Payment: noopModel(),
  ProfileCard: noopModel(),
  SecurityEvent: noopModel(),
}));

jest.unstable_mockModule("../../worker/lib/billing-feature-registry.js", () => ({
  getBillingFeaturePricing: () => null,
}));

/** SECURITY_GUARD_MODE=enforce 로 둬야 레이트리밋이 실제로 돈다(monitor 도 카운트는 하지만 명시한다). */
const ENV = { SECURITY_GUARD_MODE: "enforce" };

function postRequest(pathname) {
  return {
    method: "POST",
    url: `https://api.code-destiny.com${pathname}`,
    headers: new Map([["content-type", "application/json"]]),
  };
}

// worker/lib/http.js 를 목으로 갈았으므로 headers 는 Map 이면 충분하지만 get() 시그니처는 맞춘다.
function withHeaderGet(request) {
  const map = request.headers;
  request.headers = { get: (key) => map.get(String(key).toLowerCase()) || null };
  return request;
}

async function callAiSecurity(serviceKey, pathname) {
  const { enforceAiRouteSecurity } = await import("../../worker/lib/security/index.js");
  RATE_LIMIT_CALLS.length = 0;
  const result = await enforceAiRouteSecurity({
    request: withHeaderGet(postRequest(pathname)),
    env: ENV,
    serviceKey,
    path: pathname,
    userId: "user-1",
  });
  return { result, endpoints: RATE_LIMIT_CALLS.map((call) => call.endpoint) };
}

describe("enforceAiRouteSecurity 의 /generate 일일 버킷", () => {
  test("웨이브형 서비스의 /generate 는 /start 와 다른 버킷을 쓴다", async () => {
    const start = await callAiSecurity("human-design-report", "/api/human-design-report/start");
    const generate = await callAiSecurity("human-design-report", "/api/human-design-report/generate");

    expect(start.result.ok).toBe(true);
    expect(generate.result.ok).toBe(true);
    expect(start.endpoints).toEqual([
      "ai:human-design-report:start",
      "ai:human-design-report:start:daily",
    ]);
    expect(generate.endpoints).toEqual([
      "ai:human-design-report:generate",
      "ai:human-design-report:generate:daily",
    ]);
    // 🔴 이 교집합이 비어야 리포트 1건이 일일 예산 1건으로만 세어진다.
    expect(generate.endpoints.filter((endpoint) => start.endpoints.includes(endpoint))).toEqual([]);
  });

  test.each([
    ["master-love-codex", "/api/master-love-codex/generate"],
    ["nakshatra-ai", "/api/nakshatra-ai/generate"],
    ["naming-prompt", "/api/naming-prompt/generate"],
    ["ziwei-deep-report", "/api/ziwei-deep-report/generate"],
  ])("%s 의 /generate 도 이어짓기 버킷이다", async (serviceKey, pathname) => {
    const { endpoints } = await callAiSecurity(serviceKey, pathname);
    expect(endpoints).toEqual([`ai:${serviceKey}:generate`, `ai:${serviceKey}:generate:daily`]);
  });

  test.each([
    ["ziwei-ai", "/api/ziwei-ai/generate"],
    ["life-book-ai", "/api/life-book-ai/generate"],
    ["love-secret-ai", "/api/love-secret-ai/generate"],
    ["ziwei-island-ai", "/api/ziwei-island-ai/generate"],
    ["sukuyo-compatibility-ai", "/api/sukuyo-compatibility-ai/generate"],
  ])("%s 의 /generate 는 /start 별칭이라 같은 버킷에 남는다", async (serviceKey, pathname) => {
    const { endpoints } = await callAiSecurity(serviceKey, pathname);
    expect(endpoints).toEqual([`ai:${serviceKey}:start`, `ai:${serviceKey}:start:daily`]);
  });

  test("start 버킷의 endpoint 문자열은 바뀌지 않는다(기존 카운터 유지)", async () => {
    const { endpoints } = await callAiSecurity("ziwei-ai", "/api/ziwei-ai/start");
    expect(endpoints).toEqual(["ai:ziwei-ai:start", "ai:ziwei-ai:start:daily"]);
  });

  test("start·result 외 액션은 일일 버킷을 쓰지 않는다", async () => {
    const { endpoints } = await callAiSecurity("human-design-report", "/api/human-design-report/prepare");
    expect(endpoints).toEqual(["ai:human-design-report:ensure"]);
  });
});
