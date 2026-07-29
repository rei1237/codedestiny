/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  마스터 인연의 서  (MASTER_LOVE_CODEX)  —  워커 라우트
 * ───────────────────────────────────────────────────────────────────────────
 *  회당 결제(per-use) LLM 20챕터·5만자 전자책 생성 엔드포인트.
 *   - GET  /api/master-love-codex/plan          챕터 목차/목표 분량(정적, 무인증)
 *   - POST /api/master-love-codex/ensure-access 이용권 선검사 → 커버 시 무료 통과 / 미커버 시 402
 *   - POST /api/master-love-codex/start         접근 검증 후 세션 생성(status: generating)
 *   - POST /api/master-love-codex/generate      4챕터씩 배치 생성 → 세션에 누적 저장
 *   - GET  /api/master-love-codex/session       저장된 세션 재열람(재결제 없음)
 *
 *  결제: featureKey `master-love-codex`(500코인=50,000원). 이용권은 family만 커버한다
 *        (PASS_LIMITS standard 30 / premium 50 / vvip 100 < 500).
 *  명식(사주)·명반(자미두수)은 로컬 결정론 계산, LLM은 해석 텍스트만 생성한다.
 *  챕터/프롬프트 정의: worker/lib/master-love-codex-prompt.mjs
 *
 *  ▶ 접근 키워드: `MASTER_LOVE_CODEX`, `master-love-codex`, `handleMasterLoveCodexRoutes`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import { MasterLoveCodexSession, MonthlyCreditLedger, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import {
  LOVE_DNA_METRICS,
  MASTER_LOVE_CODEX_CHAPTERS,
  MASTER_LOVE_CODEX_META,
  buildMasterLoveCodexChapterPrompt,
  getMasterLoveCodexPlan,
} from "../lib/master-love-codex-prompt.mjs";

const SERVICE_KEY = "master-love-codex";
const FEATURE_KEY = MASTER_LOVE_CODEX_META.featureKey;
const ACCESS_TOKEN_TYPE = "master-love-codex-access";
const ACCESS_TOKEN_TTL = "45m";
const TITLE = MASTER_LOVE_CODEX_META.label;

const CHAPTER_CONCURRENCY = 4; // Gemini 병렬 상한(레이트리밋·subrequest 안전)
const CHAPTER_BATCH_SIZE = CHAPTER_CONCURRENCY; // 한 요청 = 1 동시성 웨이브 → 엣지 100초 컷 회피
const CHAPTER_TIMEOUT_MS = 60000;
// 배치 1회(생성 + JSON 수선 재호출 최악 시간)를 덮어야 병렬 폴링이 같은 배치를 중복 기동하지 않는다.
const BATCH_LOCK_TTL_MS = 390_000;

const MESSAGES = {
  loginRequired: "마스터 인연의 서를 열려면 로그인이 필요합니다.",
  invalidInput: "생년월일과 태어난 시각(또는 '태어난 시각 모름')을 확인해 주세요.",
  paymentRequired: "마스터 인연의 서는 회당 결제가 필요합니다.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 끝났다면 잠시 후 다시 시도해 주세요.",
  calculationFailed: "명식과 명반을 세우는 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  notFound: "요청하신 인연의 서를 찾을 수 없습니다.",
  serverError: "인연의 서를 준비하는 중 문제가 발생했습니다.",
  busy: "이미 다른 창에서 이어 쓰는 중입니다. 잠시 후 다시 시도해 주세요.",
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}
function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function sha256(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}
function uniq(values = []) {
  return Array.from(new Set(values.map((value) => clean(value)).filter(Boolean)));
}
function objectIdLike(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function invalidInput(message = MESSAGES.invalidInput, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message }, { status });
}
function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.loginRequired }, { status: 401 });
}
function serverError(message = MESSAGES.serverError, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}
function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: MESSAGES.paymentVerifyFailed }, { status: 402 });
}
function isAdmin(auth = {}) {
  return clean(auth.role).toLowerCase() === "admin";
}

/** 입력 정규화: 명식·명반 계산에 필요한 출생 정보만 받는다. */
function normalizeInput(body = {}) {
  const src = asObject(body.birthInfo || body);
  const genderRaw = clean(src.gender).toLowerCase();
  const birthInfo = {
    name: clean(src.name, 40),
    gender: genderRaw === "male" || genderRaw === "female" ? genderRaw : "",
    birthDate: clean(src.birthDate, 10),
    birthTime: clean(src.birthTime, 5),
    birthTimeUnknown: src.birthTimeUnknown === true || src.birthTimeUnknown === "true",
    calendarType: clean(src.calendarType).toLowerCase() === "lunar" ? "lunar" : "solar",
    isLeapMonth: src.isLeapMonth === true || src.isLeapMonth === "true",
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthInfo.birthDate)) return { ok: false, message: MESSAGES.invalidInput };
  if (!birthInfo.gender) return { ok: false, message: "성별을 선택해 주세요." };
  if (!birthInfo.birthTime && !birthInfo.birthTimeUnknown) {
    return { ok: false, message: "태어난 시각을 입력하거나 '태어난 시각 모름'을 선택해 주세요." };
  }
  if (birthInfo.birthTimeUnknown) birthInfo.birthTime = "";

  const prologueChoiceRaw = clean(body.prologueChoice, 20).toLowerCase();
  const prologueChoice = ["yes", "unsure", "partner", "self"].includes(prologueChoiceRaw) ? prologueChoiceRaw : "";

  const inputHash = sha256([
    birthInfo.birthDate, birthInfo.birthTime, birthInfo.birthTimeUnknown,
    birthInfo.calendarType, birthInfo.isLeapMonth, birthInfo.gender,
  ].join("|"));

  return { ok: true, birthInfo, prologueChoice, inputHash };
}

/** 명식·명반을 함께 세운다. 실패 시 code=CALCULATION_FAILED */
function buildCharts(birthInfo) {
  try {
    const saju = calculateLifeBookAiSaju(birthInfo);
    const ziweiChart = calculateZiweiAiChart({ birthInfo }, { year: new Date().getFullYear() });
    return { saju, ziweiChart };
  } catch (error) {
    const failure = new Error(clean(error?.message, 200) || "chart calculation failed");
    failure.code = "CALCULATION_FAILED";
    throw failure;
  }
}

// ─── 가격 / 결제 페이로드 ────────────────────────────────────────────────────

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY, reason: TITLE });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || 0);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("master-love-codex price not found");
    error.code = "PRICE_NOT_FOUND";
    throw error;
  }
  return { pricing, coinPrice, amountKRW, membershipCreditCost: calculateMembershipCreditCost(coinPrice) };
}

/**
 * 결제창 페이로드. paymentMode 를 하드코딩하지 않는다 —
 * 하드코딩하면 클라이언트 게이트가 이용권 선검사를 건너뛰고 월정석 옵션이 사라진다.
 */
function buildBillingGatePayload(pricing, idempotencyKey) {
  const gate = {
    categoryKey: "premium-consultation",
    subFeatureKey: FEATURE_KEY,
    featureKey: FEATURE_KEY,
    reason: TITLE,
    productId: SERVICE_KEY,
    productType: SERVICE_KEY,
    serviceType: FEATURE_KEY,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    totalAmount: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    amountKRW: pricing.amountKRW,
    amountKrw: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
  };
  return {
    billingMode: "coin-gate",
    serviceKey: SERVICE_KEY,
    serviceId: SERVICE_KEY,
    contentId: FEATURE_KEY,
    contentType: SERVICE_KEY,
    title: TITLE,
    orderName: TITLE,
    currency: "KRW",
    checkoutEndpoint: "/api/billing/checkout",
    confirmEndpoint: "/api/billing/confirm",
    ...gate,
    runtimeGate: gate,
  };
}

function paymentRequired(pricing, idempotencyKey) {
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: MESSAGES.paymentRequired,
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey),
  }, { status: 402 });
}

// ─── 결제 증거 확인 (requestId 바인딩) ───────────────────────────────────────
//
// 회당 결제이므로 "과거에 한 번 산 적이 있다"로 통과시키면 안 된다(무한 재생성).
// 이번 요청의 idempotencyKey/requestId 로 방금 완료된 결제만 인정한다.

function readBillingContext(body = {}) {
  const billing = asObject(body.billingGate || body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.billingConsume || body.consume || billing.consume);
  const accessGrant = asObject(body.billingAccessGrant || body.accessGrant || billing.accessGrant);
  return { billing, consume, accessGrant };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey,
    body.billingRequestId, body.paymentId, body.transactionId, body.purchaseId, body.requestId,
    ctx.billing.transactionId, ctx.billing.purchaseId, ctx.billing.paymentId, ctx.billing.requestId,
    ctx.consume.transactionId, ctx.consume.purchaseId, ctx.consume.requestId,
    ctx.consume.pointHistoryId, ctx.consume.ledgerId, ctx.consume.monthlyCreditLedgerId,
    ctx.accessGrant.purchaseId, ctx.accessGrant.paymentId, ctx.accessGrant.requestId,
  ]);
}

function metadataTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.transactionId": token });
    if (objectIdLike(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function paymentTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token }, { idempotencyKey: token }, { merchantUid: token }, { impUid: token });
    clauses.push({ "metadata.requestId": token }, { "metadata.idempotencyKey": token });
  });
  return clauses;
}

async function findBillingEvidence({ userId, idempotencyKey, body }) {
  if (!objectIdLike(userId)) return null;
  const tokens = collectBillingTokens(body, idempotencyKey);
  if (!tokens.length) return null;

  const pointClauses = metadataTokenClauses(tokens);
  const point = await PointHistory.findOne({
    userId,
    featureKey: FEATURE_KEY,
    kind: "deduct",
    "metadata.coinRefundedForUnlockFailure": { $ne: true },
    "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
    "metadata.refundedForServiceExecution": { $ne: true },
    $or: pointClauses,
  }).sort({ createdAt: -1 }).lean();
  if (point) {
    return { ok: true, accessType: "paid", paymentId: clean(point._id, 160), billingRequestId: clean(point?.metadata?.requestId || idempotencyKey, 180) };
  }

  const ledger = await MonthlyCreditLedger.findOne({
    userId,
    type: "MONTHLY_CREDIT_SPEND",
    "metadata.featureKey": FEATURE_KEY,
    "metadata.refundedForUnlockFailure": { $ne: true },
    "metadata.refundedForServiceExecution": { $ne: true },
    $or: pointClauses,
  }).sort({ createdAt: -1 }).lean();
  if (ledger) {
    return { ok: true, accessType: "monthly_credit", paymentId: clean(ledger._id, 160), billingRequestId: clean(ledger?.metadata?.requestId || idempotencyKey, 180) };
  }

  const payment = await Payment.findOne({
    userId,
    featureKey: FEATURE_KEY,
    status: { $in: ["paid", "success", "fulfilled"] },
    $or: paymentTokenClauses(tokens),
  }).sort({ updatedAt: -1, createdAt: -1 }).lean();
  if (payment) {
    return { ok: true, accessType: "paid", paymentId: clean(payment.merchantUid || payment.impUid || payment._id, 160), billingRequestId: clean(payment.requestId || payment.idempotencyKey || idempotencyKey, 180) };
  }

  return null;
}

// ─── 액세스 토큰 ─────────────────────────────────────────────────────────────

async function createAccessToken(env, payload) {
  return signJwt(
    { typ: ACCESS_TOKEN_TYPE, serviceKey: SERVICE_KEY, featureKey: FEATURE_KEY, ...payload },
    getAccessTokenSecret(env),
    { expiresIn: ACCESS_TOKEN_TTL, issuer: getJwtIssuer(env), audience: getJwtAudience(env) },
  );
}

async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), { issuer: getJwtIssuer(env), audience: getJwtAudience(env) });
  if (payload?.typ !== ACCESS_TOKEN_TYPE || payload?.serviceKey !== SERVICE_KEY || payload?.featureKey !== FEATURE_KEY) {
    const error = new Error("invalid access token");
    error.code = "INVALID_ACCESS_TOKEN";
    throw error;
  }
  return payload;
}

async function loadBillingUser(userId) {
  if (!objectIdLike(userId)) return null;
  return User.findById(userId)
    .select("role points profileSubscription subscription membership pass entitlement")
    .lean();
}

// ─── 챕터 생성 ───────────────────────────────────────────────────────────────

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
  return results;
}

function chapterCache(env) {
  // 명식·명반 기반 결정론(자유질문 없음)이라 응답 캐시 + in-flight dedup 이 안전하다.
  return { store: createLlmCacheStore(env), deterministic: true, ttlSeconds: 30 * 24 * 60 * 60, keyExtra: "master-love-codex-v1" };
}

function fallbackChapterBody(chapter, birthInfo) {
  return [
    `● ${clean(chapter.title).replace(/^제\d+장 · /, "")}`,
    `이 장의 이야기를 옮겨 적는 중 잠시 손이 멈췄습니다. 잠시 후 다시 열면 ${clean(birthInfo?.name) || "당신"}님의 명식과 명반을 근거로 이 장이 채워집니다.`,
    "이미 완성된 다른 장은 그대로 남아 있으니 먼저 읽으셔도 좋습니다.",
  ].join("\n");
}

function normalizeLoveDna(parsed) {
  const source = asObject(parsed);
  const byKey = new Map(
    (Array.isArray(source.metrics) ? source.metrics : [])
      .map((item) => [clean(asObject(item).key), asObject(item)]),
  );
  const metrics = LOVE_DNA_METRICS.map(({ key, label }) => {
    const raw = byKey.get(key) || {};
    const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
    return { key, label, score, basis: clean(raw.basis, 300) };
  });
  return {
    typeName: clean(source.typeName, 40),
    typeSummary: clean(source.typeSummary, 200),
    metrics,
  };
}

async function generateChapter(env, { saju, ziweiChart, birthInfo, chapter, prologueChoice, memory }) {
  const prompt = buildMasterLoveCodexChapterPrompt({ saju, ziweiChart, birthInfo, chapter, prologueChoice, memory });
  const cache = chapterCache(env);
  try {
    if (chapter.jsonMode) {
      const ai = await callGeminiJsonWithRetry(env, prompt, {
        attempts: 3,
        baseTokens: 6000,
        capTokens: 14000,
        temperature: 0.6,
        timeoutMs: CHAPTER_TIMEOUT_MS,
        fallbackToWorkersAI: false,
        cache,
      });
      const parsed = JSON.parse(clean(ai?.text || "{}"));
      const body = clean(parsed?.body || "");
      if (body.length < 200) throw new Error("LLM_OUTPUT_TOO_SHORT");
      return {
        chapter: { id: chapter.id, order: chapter.order, symbol: chapter.symbol, title: chapter.title, body, chars: body.length, provider: clean(ai?.provider || "gemini", 40), ok: true },
        loveDna: normalizeLoveDna(parsed),
      };
    }

    const ai = await callGeminiText(env, prompt, {
      maxOutputTokens: 8000,
      temperature: 0.72,
      timeoutMs: CHAPTER_TIMEOUT_MS,
      fallbackToWorkersAI: false,
      cache,
    });
    const body = clean(ai?.text || "");
    if (body.length < 200) throw new Error("LLM_OUTPUT_TOO_SHORT");
    return {
      chapter: { id: chapter.id, order: chapter.order, symbol: chapter.symbol, title: chapter.title, body, chars: body.length, provider: clean(ai?.provider || "gemini", 40), ok: true },
      loveDna: null,
    };
  } catch (error) {
    // 결제 후 결과는 반드시 전달한다 — 한 장이 실패해도 책 전체를 실패시키지 않는다.
    console.error("[master-love-codex] chapter", chapter.id, clean(error?.message, 200));
    const body = fallbackChapterBody(chapter, birthInfo);
    return {
      chapter: { id: chapter.id, order: chapter.order, symbol: chapter.symbol, title: chapter.title, body, chars: body.length, provider: "fallback", ok: false },
      loveDna: null,
    };
  }
}

/** 앞 장의 요약(첫 소제목 문장)만 모아 중복 서술을 줄인다. */
function buildMemory(chapters = []) {
  return chapters
    .slice(-8)
    .map((entry) => {
      const firstLine = clean(entry?.body, 4000).split("\n").map((line) => clean(line)).find((line) => line && !line.startsWith("●"));
      return firstLine ? `${clean(entry.title)}: ${clean(firstLine, 160)}` : "";
    })
    .filter(Boolean);
}

// ─── 세션 저장 ───────────────────────────────────────────────────────────────

function createSessionId(userId) {
  const tail = clean(userId, 24).slice(-6) || "anon";
  return `mlc_${tail}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function publicSession(doc) {
  const chapters = (Array.isArray(doc?.chapters) ? doc.chapters : [])
    .slice()
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map(({ id, order, symbol, title, body, chars, ok }) => ({ id, order, symbol, title, body, chars, ok }));
  return {
    ok: true,
    sessionId: clean(doc?.id),
    status: clean(doc?.status) || "generating",
    accessType: clean(doc?.accessType),
    label: TITLE,
    narrator: MASTER_LOVE_CODEX_META.narrator,
    birthInfo: doc?.birthInfo || null,
    prologueChoice: clean(doc?.prologueChoice),
    sajuResult: doc?.sajuResult || null,
    ziweiChart: doc?.ziweiChart || null,
    chapters,
    loveDna: doc?.loveDna || null,
    totalChapters: MASTER_LOVE_CODEX_CHAPTERS.length,
    totalCharCount: Number(doc?.totalCharCount || 0),
    createdAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
  };
}

// ─── 핸들러 ──────────────────────────────────────────────────────────────────

function handlePlan() {
  return json({ ok: true, plan: getMasterLoveCodexPlan() });
}

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 120) || sha256(String(Date.now()));
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);

  try {
    buildCharts(normalized.birthInfo);
  } catch (_) {
    return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 });
  }

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  const pricing = getPricing();
  const grant = async (accessType) => json({
    ok: true,
    accessType,
    accessToken: await createAccessToken(env, { userId: auth.userId, accessType, idempotencyKey, inputHash: normalized.inputHash }),
  });

  if (isAdmin(auth)) return grant("admin");

  await connectDb(env);
  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (clean(user?.role).toLowerCase() === "admin") return grant("admin");

  // 이용권 선검사 — 커버되면 결제창 없이 무료 통과한다.
  if (canUseByPass(normalizeHoneyPassEntitlement(user || {}), pricing.coinPrice)) return grant("pass");

  return paymentRequired(pricing, idempotencyKey);
}

async function resolveStartAccess(request, env, auth, body, normalized, idempotencyKey) {
  const token = clean(asObject(body).accessToken || request.headers.get("x-master-love-codex-token"));
  if (token) {
    try {
      const payload = await verifyAccessToken(env, token);
      if (clean(payload.userId) === clean(auth.userId)
        && clean(payload.idempotencyKey) === idempotencyKey
        && clean(payload.inputHash) === normalized.inputHash
        && ["admin", "pass"].includes(clean(payload.accessType))) {
        return { ok: true, accessType: clean(payload.accessType), paymentId: "", billingRequestId: idempotencyKey };
      }
    } catch (_) { /* fall through */ }
  }
  if (isAdmin(auth)) return { ok: true, accessType: "admin", paymentId: "", billingRequestId: idempotencyKey };

  await connectDb(env);
  const evidence = await findBillingEvidence({ userId: auth.userId, idempotencyKey, body });
  if (evidence?.ok) return evidence;

  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (clean(user?.role).toLowerCase() === "admin") return { ok: true, accessType: "admin", paymentId: "", billingRequestId: idempotencyKey };
  if (canUseByPass(normalizeHoneyPassEntitlement(user || {}), getPricing().coinPrice)) {
    return { ok: true, accessType: "pass", paymentId: "", billingRequestId: idempotencyKey };
  }
  return { ok: false };
}

async function handleStart(request, env) {
  const body = await readJson(request);
  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 120) || sha256(String(Date.now()));
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  let charts;
  try {
    charts = buildCharts(normalized.birthInfo);
  } catch (_) {
    return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 });
  }

  const access = await resolveStartAccess(request, env, auth, body, normalized, idempotencyKey);
  if (!access.ok) return paymentVerifyFailed();

  await connectDb(env);
  // 같은 결제 건(idempotencyKey)으로 이미 시작했다면 그 세션을 그대로 돌려준다(재결제·중복생성 방지).
  const existing = await MasterLoveCodexSession.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  if (existing) {
    return json({
      ...publicSession(existing),
      accessToken: await createAccessToken(env, { userId: auth.userId, accessType: clean(existing.accessType), sessionId: clean(existing.id) }),
    });
  }

  const sessionId = createSessionId(auth.userId);
  const doc = await MasterLoveCodexSession.create({
    id: sessionId,
    userId: clean(auth.userId),
    birthInfo: normalized.birthInfo,
    prologueChoice: normalized.prologueChoice,
    sajuResult: charts.saju,
    ziweiChart: charts.ziweiChart,
    chapters: [],
    accessType: clean(access.accessType) || "paid",
    paymentId: clean(access.paymentId, 160),
    billingRequestId: clean(access.billingRequestId, 180),
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
  });

  return json({
    ...publicSession(doc.toObject ? doc.toObject() : doc),
    accessToken: await createAccessToken(env, { userId: auth.userId, accessType: clean(access.accessType), sessionId }),
  });
}

/** 배치 락 확보 — 병렬 요청이 같은 구간을 중복 생성하지 않게 한다. */
async function acquireBatchLock(sessionId, userId) {
  const now = Date.now();
  const lockToken = `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const updated = await MasterLoveCodexSession.findOneAndUpdate(
    {
      id: sessionId,
      userId,
      status: "generating",
      $or: [
        { "generationProgress.lockedAt": { $exists: false } },
        { "generationProgress.lockedAt": null },
        { "generationProgress.lockedAt": { $lt: new Date(now - BATCH_LOCK_TTL_MS) } },
      ],
    },
    { $set: { "generationProgress.lockedAt": new Date(now), "generationProgress.lockToken": lockToken } },
    { new: true },
  ).lean();
  return updated ? { ok: true, lockToken, doc: updated } : { ok: false };
}

async function handleGenerate(request, env) {
  const body = await readJson(request);
  const sessionId = clean(asObject(body).sessionId, 120);
  if (!sessionId) return invalidInput("세션 정보가 없습니다. 처음부터 다시 시작해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  const token = clean(asObject(body).accessToken || request.headers.get("x-master-love-codex-token"));
  let tokenOk = false;
  if (token) {
    try {
      const payload = await verifyAccessToken(env, token);
      tokenOk = clean(payload.userId) === clean(auth.userId) && clean(payload.sessionId) === sessionId;
    } catch (_) { tokenOk = false; }
  }
  if (!tokenOk && !isAdmin(auth)) return paymentVerifyFailed();

  await connectDb(env);
  const lock = await acquireBatchLock(sessionId, clean(auth.userId));
  if (!lock.ok) {
    const current = await MasterLoveCodexSession.findOne({ id: sessionId, userId: clean(auth.userId) }).lean();
    if (!current) return json({ ok: false, reason: "NOT_FOUND", message: MESSAGES.notFound }, { status: 404 });
    if (clean(current.status) === "completed") return json({ ...publicSession(current), done: true });
    return json({ ok: false, reason: "GENERATION_IN_PROGRESS", message: MESSAGES.busy, retryable: true }, { status: 409 });
  }

  const doc = lock.doc;
  const existingChapters = Array.isArray(doc.chapters) ? doc.chapters.slice() : [];
  const startIndex = existingChapters.length; // 서버가 진행 위치의 정본이다(클라이언트 값 미신뢰)
  const slice = MASTER_LOVE_CODEX_CHAPTERS.slice(startIndex, startIndex + CHAPTER_BATCH_SIZE);

  if (!slice.length) {
    await MasterLoveCodexSession.updateOne(
      { id: sessionId },
      { $set: { status: "completed", "generationProgress.lockedAt": null, "generationProgress.lockToken": "" } },
    );
    const finished = await MasterLoveCodexSession.findOne({ id: sessionId }).lean();
    return json({ ...publicSession(finished), done: true });
  }

  try {
    const memory = buildMemory(existingChapters);
    const results = await runWithConcurrency(slice, CHAPTER_CONCURRENCY, (chapter) => generateChapter(env, {
      saju: doc.sajuResult,
      ziweiChart: doc.ziweiChart,
      birthInfo: doc.birthInfo,
      chapter,
      prologueChoice: clean(doc.prologueChoice),
      memory,
    }));

    const newChapters = results.map((result) => result.chapter);
    const loveDna = results.map((result) => result.loveDna).find(Boolean) || null;
    const merged = [...existingChapters, ...newChapters];
    const totalCharCount = merged.reduce((sum, chapter) => sum + Number(chapter.chars || 0), 0);
    const done = merged.length >= MASTER_LOVE_CODEX_CHAPTERS.length;

    await MasterLoveCodexSession.updateOne({ id: sessionId }, {
      $set: {
        chapters: merged,
        totalCharCount,
        status: done ? "completed" : "generating",
        ...(loveDna ? { loveDna } : {}),
        generationProgress: { completed: merged.length, total: MASTER_LOVE_CODEX_CHAPTERS.length, lockedAt: null, lockToken: "" },
      },
    });

    const updated = await MasterLoveCodexSession.findOne({ id: sessionId }).lean();
    return json({ ...publicSession(updated), done, batchStartIndex: startIndex, batchSize: newChapters.length });
  } catch (error) {
    console.error("[master-love-codex] generate", clean(error?.message, 300));
    await MasterLoveCodexSession.updateOne(
      { id: sessionId },
      { $set: { "generationProgress.lockedAt": null, "generationProgress.lockToken": "" } },
    ).catch(() => {});
    return serverError("이야기를 이어 쓰는 중 문제가 생겼습니다. 결제와 지금까지 쓰인 장은 보존되니 잠시 후 다시 시도해 주세요.", 503);
  }
}

async function handleSession(request, env) {
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId"), 120);
  if (!sessionId) return invalidInput("세션 정보가 없습니다.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const doc = await withMongoRetry(env, () => MasterLoveCodexSession.findOne({ id: sessionId, userId: clean(auth.userId) }).lean());
  if (!doc) return json({ ok: false, reason: "NOT_FOUND", message: MESSAGES.notFound }, { status: 404 });
  return json(publicSession(doc));
}

export async function handleMasterLoveCodexRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/master-love-codex");
  try {
    if (method === "GET" && (path === "/plan" || path === "")) return handlePlan();
    if (method === "GET" && path === "/session") return await handleSession(request, env);
    if (method === "POST" && (path === "/ensure-access" || path === "/prepare")) return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/generate") return await handleGenerate(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[master-love-codex]", clean(error?.code || error?.message || error, 300));
    return serverError();
  }
}

export const __masterLoveCodexTestUtils = { FEATURE_KEY, SERVICE_KEY, normalizeInput, getPricing, buildBillingGatePayload, normalizeLoveDna };
