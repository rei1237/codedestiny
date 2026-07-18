import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

function source(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function assertContains(text, marker, label = marker) {
  assert.ok(text.includes(marker), `${label}: missing marker`);
}

function assertNotContains(text, marker, label = marker) {
  assert.ok(!text.includes(marker), `${label}: unexpected marker`);
}

function assertBefore(text, first, second, label) {
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  assert.ok(firstIndex >= 0, `${label}: missing first marker`);
  assert.ok(secondIndex >= 0, `${label}: missing second marker`);
  assert.ok(firstIndex < secondIndex, `${label}: marker order changed`);
}

const security = source("worker/lib/security/index.js");
const models = source("worker/lib/models.js");
const payments = source("worker/routes/payments.js");
const billing = source("worker/routes/billing.js");
const profile = source("worker/routes/profile.js");
const workerIndex = source("worker/index.js");

[
  "validateSensitiveRequest",
  "enforceRateLimit",
  "enforceIdempotency",
  "completeIdempotency",
  "writeSecurityLog",
  "detectAbusePattern",
  "addAbuseScore",
  "checkSoftBlock",
  "requireOwnership",
  "validateProductAccess",
  "enforceAiRouteSecurity",
  "SECURITY_ERROR_MESSAGES",
].forEach((marker) => assertContains(security, `export ${marker === "SECURITY_ERROR_MESSAGES" ? "const" : "async function"} ${marker}`, `security export ${marker}`));

[
  "securityEventSchema",
  "idempotencyKeySchema",
  "abuseScoreSchema",
  "export const SecurityEvent",
  "export const IdempotencyKey",
  "export const AbuseScore",
].forEach((marker) => assertContains(models, marker, `model ${marker}`));

assertContains(payments, "enforcePaymentRouteSecurity(request, env, auth, path)", "payments security guard");
assertBefore(payments, "if (method === \"POST\" && path === \"/webhook\")", "const auth = await requireAuth(request, env);", "payments webhook stays before auth/security guard");
assertBefore(payments, "const security = await enforcePaymentRouteSecurity(request, env, auth, path);", "if (method === \"POST\" && path === \"/single/start\")", "payments guard before payment mutation dispatch");

assertContains(billing, "enforceBillingRouteSecurity(request, env, path, method)", "billing security guard");
assertBefore(billing, "const security = await enforceBillingRouteSecurity(request, env, path, method);", "if (method === \"GET\" && path === \"/features\")", "billing guard before dispatch");

assertContains(profile, "enforceProfileRouteSecurity(request, env, auth, method, path)", "profile security guard");
assertBefore(profile, "const auth = await requireUserFromRequest(request, env);", "const security = await enforceProfileRouteSecurity(request, env, auth, method, path);", "profile auth before security guard");
assertBefore(profile, "const security = await enforceProfileRouteSecurity(request, env, auth, method, path);", "await connectDb(env);", "profile guard before db mutation dispatch");

[
  ["fortune-tea-house", "handleFortuneTeaHouseRoutes"],
  ["ziwei-ai", "handleZiweiAiRoutes"],
  ["love-secret-ai", "handleLoveSecretAiRoutes"],
  ["new-year-ai", "handleNewYearAiRoutes"],
  ["karma-destiny-ai", "handleKarmaDestinyAiRoutes"],
  ["vedic-ai", "handleVedicAiRoutes"],
  ["neo-operation-room", "handleNeoOperationRoomRoutes"],
  ["life-book-ai", "handleLifeBookAiRoutes"],
  ["astrology-ai", "handleAstrologyAiRoutes"],
  ["sukuyo-compatibility-ai", "handleSukuyoCompatibilityAiRoutes"],
].forEach(([serviceKey, handler]) => {
  // 닫는 괄호를 포함하지 않는다: 일부 라우트는 `runAiRouteWithSecurity(..., handler, ctx)`처럼 ctx를 추가로 넘기므로
  // 접두 매칭으로 `handler)`·`handler, ctx)` 양쪽을 모두 허용한다(보안 배선 존재 검증 의도는 유지).
  assertContains(workerIndex, `runAiRouteWithSecurity(request, env, "${serviceKey}", ${handler}`, `ai route guard ${serviceKey}`);
});

assertNotContains(security, "usage_pass", "security module usage pass access type");
assertNotContains(security, "usagePass", "security module usage pass fields");

console.log("[verify-worker-security-guards] ok");
