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
 *
 * 두 번째 계약(2026-08-30 추가): **AI 라우트 경로는 하나도 빠짐없이 분류돼야 한다.**
 * 예전에는 분류기가 못 알아본 경로에 `""` 를 돌려줬고 `enforceAiRouteSecurity` 가 그걸 보고
 * 즉시 통과시켜, 21개 경로가 레이트리밋·메서드 허용목록·페이로드 상한·소프트블록을 하나도
 * 안 거쳤다. 아래 "전수 대조" describe 가 라우트 소스에서 경로를 **직접 발견해** 미분류를
 * 실패시킨다 — 손으로 쓴 경로 목록은 가드가 아니다(코딩 원칙 10).
 */

// 🔴 정적 import 를 하나라도 두면 이 파일은 네이티브 ESM 으로 돌아 `jest` 전역이 사라진다.
//    다른 __tests__/worker 스위트와 같은 방식으로 명시 import 한다.
import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

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

function postRequest(pathname, method = "POST") {
  return {
    method,
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

async function callAiSecurity(serviceKey, pathname, method = "POST") {
  const { enforceAiRouteSecurity } = await import("../../worker/lib/security/index.js");
  RATE_LIMIT_CALLS.length = 0;
  const result = await enforceAiRouteSecurity({
    request: withHeaderGet(postRequest(pathname, method)),
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

describe("예전에 보안 계층을 통째로 빠져나가던 경로", () => {
  // 🔴 아래 버킷은 전부 **경로마다 따로 잰 값**이다. 임의로 옮기면 살아 있는 흐름이 429 로 끊긴다.
  //    `/generate-batch` 는 락 대기 중 분당 약 48회까지 치므로 `generate`(30) 로 옮기면 안 된다.
  test.each([
    ["karma-destiny-ai", "/api/karma-destiny-ai/generate-batch", "batch"],
    ["destiny-compass-ai", "/api/destiny-compass-ai/report/continue", "batch"],
    ["destiny-compass-ai", "/api/destiny-compass-ai/report", "start"],
    ["pet-saju-ai", "/api/pet-saju-ai/report", "start"],
    ["pet-saju-ai", "/api/pet-saju-ai/compat", "start"],
    ["guardian", "/api/guardian/generate-image", "start"],
    ["naming-prompt", "/api/naming-prompt/verify-payment", "ensure"],
    ["ziwei-ai", "/api/ziwei-ai/basis", "basis"],
    ["vedic-ai", "/api/vedic-ai/basis", "basis"],
    ["astrology-ai", "/api/astrology-ai/basis", "basis"],
    ["sukuyo-compatibility-ai", "/api/sukuyo-compatibility-ai/basis", "basis"],
    ["fortune-tea-house", "/api/fortune-tea-house/honey-drops/tarot-album/unlock", "unlock"],
    ["neo-operation-room", "/api/neo-operation-room/badges/unlock-benefits", "unlock"],
  ])("POST %s%s 는 %s 버킷을 쓴다", async (serviceKey, pathname, action) => {
    const { result, endpoints } = await callAiSecurity(serviceKey, pathname);
    expect(result.ok).toBe(true);
    // 🔴 이 배열이 비면 곧 "레이트리밋이 안 돌았다" = 우회 회귀다.
    expect(endpoints[0]).toBe(`ai:${serviceKey}:${action}`);
  });

  // 라우트가 GET 만 받는 경로들. read 액션은 GET 을 허용목록에 넣어야 405 가 안 난다.
  test.each([
    ["fortune-tea-house", "/api/fortune-tea-house/honey-drops"],
    ["fortune-tea-house", "/api/fortune-tea-house/honey-drops/balance"],
    ["neo-operation-room", "/api/neo-operation-room/badges"],
    ["neo-operation-room", "/api/neo-operation-room/badges/balance"],
    ["ziwei-deep-report", "/api/ziwei-deep-report/plan"],
    ["master-love-codex", "/api/master-love-codex/plan"],
  ])("GET %s%s 는 read 버킷이고 405 가 아니다", async (serviceKey, pathname) => {
    const { result, endpoints } = await callAiSecurity(serviceKey, pathname, "GET");
    expect(result.ok).toBe(true);
    expect(endpoints).toEqual([`ai:${serviceKey}:read`]);
  });

  test("분류 안 된 경로도 더 이상 통과하지 않는다 — 기본 버킷으로 떨어진다", async () => {
    const { AI_FALLBACK_ACTION } = await import("../../worker/lib/security/index.js");
    const { result, endpoints } = await callAiSecurity("ziwei-ai", "/api/ziwei-ai/some-unclassified-route");
    expect(result.ok).toBe(true);
    expect(endpoints).toEqual([`ai:ziwei-ai:${AI_FALLBACK_ACTION}`]);
  });

  test("이어짓기 폴링 상한은 실측 천장(분당 48회) 위에 있다", async () => {
    const { AI_ACTION_PER_MINUTE } = await import("../../worker/lib/security/index.js");
    // KarmaDestinyAiResultClient 의 무진척 라운드: 타이머 900ms + 왕복 ≈ 분당 48회.
    expect(AI_ACTION_PER_MINUTE.batch).toBeGreaterThanOrEqual(60);
  });
});

/* ── 전수 대조: AI 라우트 경로는 하나도 빠짐없이 분류돼야 한다 ─────────────────────────
   손으로 쓴 경로 목록은 가드가 아니다(코딩 원칙 10). worker/index.js 의 보안 배선에서
   serviceKey → 라우트 파일을 뽑고, 각 라우트 파일이 실제로 디스패치하는 경로 리터럴을 읽어
   분류기에 먹인다. 하나라도 기본 버킷으로 떨어지면 실패다 — 그 경로의 상한을 아무도 재지
   않았다는 뜻이기 때문이다.

   🔴 분류기에 먹이는 값은 라우트 파일이 보는 `path`(접두 제거본)가 아니라 worker/index.js 가
      실제로 넘기는 **전체 pathname** 이다(`runAiRouteWithSecurity` 의 `path: url.pathname`).
      접두를 빼고 먹이면 `/generate-batch` 가 우연히 분류돼 이 가드가 조용히 통과한다 —
      2026-08-30 첫 측정이 실제로 그렇게 빗나갔다(우회 6건으로 과소 보고). */
describe("AI 라우트 경로 전수 분류", () => {
  function source(relativePath) {
    return readFileSync(resolve(REPO_ROOT, relativePath), "utf8");
  }

  // 정규식 리터럴 라우트(`/^\/result\/[^/]+$/.test(path)`)를 실제로 매칭될 경로 하나로 환원한다.
  function probeFromRegexLiteral(literal) {
    return literal
      .replace(/\\\//g, "/")
      .replace(/\[\^\/\]\+/g, "sample")
      .replace(/\[a-z-\]\+/g, "sample")
      .replace(/\[a-f0-9\]\{24\}/g, "a".repeat(24));
  }

  function discoverRoutePaths() {
    const workerIndex = source("worker/index.js");
    const wired = new Map();
    for (const [, serviceKey, handler] of workerIndex.matchAll(
      /runAiRouteWithSecurity\(request, env, "([^"]+)", (\w+)/g,
    )) {
      wired.set(serviceKey, handler);
    }
    const lazyModules = new Map();
    for (const [, handler, file] of workerIndex.matchAll(
      /const (\w+) = createLazyRouteHandler\("\.\/routes\/([\w.-]+)"/g,
    )) {
      lazyModules.set(handler, file);
    }

    const rows = [];
    for (const [serviceKey, handler] of wired) {
      const file = lazyModules.get(handler);
      expect(`${serviceKey}:${handler}:${file || "MISSING"}`).not.toContain("MISSING");
      const routeSource = source(`worker/routes/${file}`);
      const seen = new Set();
      for (const line of routeSource.split("\n")) {
        if (!line.includes("path")) continue;
        for (const [, literal] of line.matchAll(/path === "([^"]*)"/g)) seen.add(literal);
        for (const [, prefix] of line.matchAll(/path\.startsWith\("([^"]*)"\)/g)) seen.add(`${prefix}sample`);
        for (const [, literal] of line.matchAll(/\/\^(\\\/[^\s]*?)\$\/i?\.test\(path\)/g)) {
          seen.add(probeFromRegexLiteral(literal));
        }
      }
      for (const routePath of seen) rows.push({ serviceKey, pathname: `/api/${serviceKey}${routePath}` });
    }
    return { wiredCount: wired.size, rows };
  }

  test("배선된 모든 AI 라우트 경로가 측정된 버킷을 받는다", async () => {
    const { aiActionFromPath, AI_FALLBACK_ACTION } = await import("../../worker/lib/security/index.js");
    const { wiredCount, rows } = discoverRoutePaths();
    // 발견 자체가 실패하면 통과가 아니라 실패여야 한다(fail-closed) — 2026-08-30 실측 19서비스·100경로.
    expect(wiredCount).toBeGreaterThanOrEqual(19);
    expect(rows.length).toBeGreaterThanOrEqual(90);

    const unclassified = rows
      .filter(({ serviceKey, pathname }) => aiActionFromPath(pathname, serviceKey) === AI_FALLBACK_ACTION)
      .map(({ pathname }) => pathname);
    // 🔴 여기 경로가 뜨면 "분류기에 규칙 하나 추가"로 끝내지 말고 그 경로의 호출 빈도를 먼저 잰다.
    //    상한을 잘못 주면 살아 있는 흐름이 429 로 끊긴다.
    expect(unclassified).toEqual([]);
  });
});
