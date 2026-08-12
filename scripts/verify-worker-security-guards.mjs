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

// enforceIdempotency/completeIdempotency 는 목록에서 제거됐다(2026-08-12) — 호출 0곳인 사어를
// 삭제했기 때문. 결제 멱등성의 실제 담당은 prepare 유니크 업서트와 V2 파생 주문 id 다.
[
  "validateSensitiveRequest",
  "enforceRateLimit",
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
// 인증 호출의 "인자까지" 고정하지 않는다 — 닫는 괄호를 뺀 접두로만 맞춘다(위 runAiRouteWithSecurity 와 같은 이유).
// 과거 이 마커가 `requireAuth(request, env);` 로 리터럴 고정돼 있었는데, 결제 라우트가 인증 왕복을 줄이려
// `requireUserFromRequest(request, env, { userProjection: ... })` 로 바뀌자 지키려던 불변식(웹훅이 인증 앞에
// 처리된다)은 멀쩡한데 가드만 깨졌다. 여기서 검증할 것은 호출 형태가 아니라 순서다.
assertBefore(payments, "if (method === \"POST\" && path === \"/webhook\")", "const delegatedAuth =", "payments webhook stays before delegated auth/security guard");
assertBefore(payments, "const auth = delegatedAuth?.userId", "const security = await enforcePaymentRouteSecurity(request, env, auth, path);", "payments auth stays before security guard");
assertBefore(payments, "const security = await enforcePaymentRouteSecurity(request, env, auth, path);", "if (method === \"POST\" && path === \"/single/start\")", "payments guard before payment mutation dispatch");

assertContains(billing, "enforceBillingRouteSecurity(request, env, path, method)", "billing security guard");
assertBefore(billing, "const security = await enforceBillingRouteSecurity(request, env, path, method);", "if (method === \"GET\" && path === \"/features\")", "billing guard before dispatch");

assertContains(profile, "enforceProfileRouteSecurity(request, env, auth, method, path)", "profile security guard");
assertBefore(profile, "const auth = await requireUserFromRequest(request, env", "const security = await enforceProfileRouteSecurity(request, env, auth, method, path);", "profile auth before security guard");
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
  ["destiny-compass-ai", "handleDestinyCompassAiRoutes"],
].forEach(([serviceKey, handler]) => {
  // 닫는 괄호를 포함하지 않는다: 일부 라우트는 `runAiRouteWithSecurity(..., handler, ctx)`처럼 ctx를 추가로 넘기므로
  // 접두 매칭으로 `handler)`·`handler, ctx)` 양쪽을 모두 허용한다(보안 배선 존재 검증 의도는 유지).
  assertContains(workerIndex, `runAiRouteWithSecurity(request, env, "${serviceKey}", ${handler}`, `ai route guard ${serviceKey}`);
});

/* 접두사가 겹치는 형제 라우트의 순서.
   유료 `-ai` 블록이 무인증 형제 블록 아래로 내려가면, 무인증 핸들러가 유료 경로를 먹어
   결제·인증 없이 결과가 나간다. 지금은 무인증 쪽이 `"/api/x/"`(슬래시 포함) 접두로만 매칭돼
   우연히 안전하지만, 그 슬래시가 빠지는 순간 조용히 뚫린다 — 순서로 고정한다. */
[
  ["/api/ziwei-island-ai", "/api/ziwei-island"],
  ["/api/pet-saju-ai", "/api/pet-saju"],
  ["/api/destiny-compass-ai", "/api/destiny-compass"],
].forEach(([paid, free]) => {
  assertBefore(
    workerIndex,
    `url.pathname === "${paid}" || url.pathname.startsWith("${paid}/")`,
    `url.pathname === "${free}" || url.pathname.startsWith("${free}/")`,
    `paid sibling route ${paid} must be matched before ${free}`,
  );
});

assertNotContains(security, "usage_pass", "security module usage pass access type");
assertNotContains(security, "usagePass", "security module usage pass fields");

/* 인증 진입점은 재시도로 감싸지 않는다.
   인증의 실제 DB 읽기는 auth.js 안쪽(resolveActiveUserAuth·verifyRefreshSessionToAuth)에서 이미
   재시도된다. 그 위 계층을 또 감싸면 시도 횟수와 재연결이 배수로 늘 뿐, op-타임아웃은 설계상
   재시도 대상이 아니라 정작 나아지는 것이 없다. 상세 검사는 verify:no-nested-retry 가 맡는다. */
const authSource = source("worker/lib/auth.js");
[
  ["export async function requireUserFromRequest", "requireUserFromRequest"],
  ["export async function resolvePaidRouteAuth", "resolvePaidRouteAuth"],
].forEach(([marker, label]) => {
  const start = authSource.indexOf(marker);
  assert.ok(start > 0, `auth entry point missing -> ${label}`);
  const body = authSource.slice(start, start + 1400);
  assert.ok(
    !body.includes("withMongoRetry("),
    `${label}: 인증 진입점을 withMongoRetry로 감쌌습니다 — 안쪽 재시도와 중첩됩니다.`,
  );
});

console.log("[verify-worker-security-guards] ok");
