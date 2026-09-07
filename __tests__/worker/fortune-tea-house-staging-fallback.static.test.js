const fs = require("fs");
const path = require("path");
const test = typeof globalThis.test === "function" ? globalThis.test : require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.join(__dirname, "..", "..");
const ROUTE = fs.readFileSync(
  path.join(ROOT, "worker", "routes", "fortune-tea-house.js"),
  "utf8",
);

test("스테이징 무과금 fallback 은 APP_ENV=staging 과 WORKERS_AI_ENABLED=false 에만 열린다", () => {
  assert.ok(ROUTE.includes("function isStagingNoCostFallbackEnv(env = {})"), "staging fallback 환경 가드가 없다");
  assert.ok(ROUTE.includes("cleanText(env?.APP_ENV, 40).toLowerCase() === \"staging\""), "APP_ENV=staging 조건이 없다");
  assert.ok(ROUTE.includes("cleanText(env?.WORKERS_AI_ENABLED, 20).toLowerCase() === \"false\""), "Workers AI 비활성 조건이 없다");
});

test("프로덕션 Gemini 키 누락 실패는 staging fallback 이 아니면 그대로 503 이다", () => {
  assert.ok(
    ROUTE.includes("if (!isLocalLikeEnv(env) && !stagingNoCostFallback)"),
    "비-local/non-staging 키 누락 503 가드가 느슨해졌다",
  );
  assert.ok(
    ROUTE.includes("const error = new Error(\"fortune tea house llm unavailable\");")
      && ROUTE.includes("error.status = 503;"),
    "Gemini 키 누락 503 실패가 사라졌다",
  );
  assert.ok(
    ROUTE.includes("reason: stagingNoCostFallback ? \"staging_missing_gemini_key\" : \"missing_gemini_key\""),
    "staging fallback 과 일반 local fallback reason 을 구분하지 않는다",
  );
});
