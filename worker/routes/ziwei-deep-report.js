/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  심화 자미두수 PDF  (ZIWEI_DEEP_PDF)  —  워커 라우트
 * ───────────────────────────────────────────────────────────────────────────
 *  회당 결제(per-use) LLM 15챕터 심층 리포트 생성 엔드포인트.
 *   - POST /api/ziwei-deep-report/prepare   결제 게이트(접근 확인 → 결제 필요 시 payload)
 *   - POST /api/ziwei-deep-report/generate  접근 검증 후 15챕터 LLM 생성(병렬) → 리포트 반환
 *   - GET  /api/ziwei-deep-report/plan       챕터 목차/목표 분량(정적)
 *
 *  결제: featureKey `ziwei-deep-pdf`(300코인=30,000원). 명반은 로컬 결정론 계산,
 *        해석 텍스트만 LLM(Gemini→Workers AI 폴백은 callGeminiText 내부 처리).
 *  프롬프트/챕터 정의: worker/lib/ziwei-deep-report-prompt.mjs
 *
 *  ▶ 접근 키워드: `ZIWEI_DEEP_PDF`, `ziwei-deep-pdf`, `handleZiweiDeepReportRoutes`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb } from "../lib/db.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { callGeminiText } from "../lib/gemini.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import {
  ZIWEI_DEEP_PDF_META,
  ZIWEI_DEEP_CHAPTERS,
  buildZiweiDeepChapterPrompt,
  getZiweiDeepReportPlan,
} from "../lib/ziwei-deep-report-prompt.mjs";

const SERVICE_KEY = "ziwei-deep-report";
const FEATURE_KEY = ZIWEI_DEEP_PDF_META.featureKey; // "ziwei-deep-pdf"
const ACCESS_TOKEN_TYPE = "ziwei-deep-pdf-access";
const ACCESS_TOKEN_TTL = "45m";
const TITLE = ZIWEI_DEEP_PDF_META.label; // "심화 자미두수 PDF"
const CHAPTER_CONCURRENCY = 4; // Gemini 병렬 호출 상한(레이트리밋·subrequest 안전)
const CHAPTER_BATCH_SIZE = CHAPTER_CONCURRENCY; // 한 요청에서 생성할 챕터 수(=1 동시성 웨이브)

const MESSAGES = {
  loginRequired: "심화 자미두수 PDF 리포트를 생성하려면 로그인이 필요합니다.",
  invalidInput: "생년월일과 출생시간(또는 '출생시간 모름')을 확인해 주세요.",
  paymentRequired: "심화 자미두수 PDF 리포트는 회당 결제가 필요합니다.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 끝났다면 잠시 후 다시 시도해 주세요.",
  calculationFailed: "명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverError: "리포트를 준비하는 중 문제가 발생했습니다. 결제나 이용권은 차감되지 않았습니다.",
};

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

/** 입력 정규화: 출생 정보만 필요(명반 계산용) */
function normalizeInput(body = {}) {
  const src = asObject(body.birthInfo || body);
  const birthInfo = {
    name: clean(src.name, 40),
    gender: clean(src.gender, 20),
    birthDate: clean(src.birthDate, 20),
    birthTime: clean(src.birthTime, 20),
    birthTimeUnknown: src.birthTimeUnknown === true || src.birthTimeUnknown === "true",
    calendarType: clean(src.calendarType).toLowerCase() === "lunar" ? "lunar" : "solar",
    isLeapMonth: src.isLeapMonth === true || src.isLeapMonth === "true",
  };
  if (!birthInfo.birthDate) return { ok: false, message: MESSAGES.invalidInput };
  if (!birthInfo.birthTime && !birthInfo.birthTimeUnknown) {
    return { ok: false, message: "출생시간을 입력하거나 '출생시간 모름'을 선택해 주세요." };
  }
  const inputHash = sha256(
    [birthInfo.birthDate, birthInfo.birthTime, birthInfo.birthTimeUnknown, birthInfo.calendarType, birthInfo.isLeapMonth, birthInfo.gender].join("|"),
  );
  return { ok: true, input: { birthInfo }, birthInfo, inputHash };
}

function getPricing() {
  const result = getBillingFeaturePricing({ featureKey: FEATURE_KEY, reason: TITLE });
  const pricing = result?.ok ? result.pricing : null;
  const coinPrice = Number(pricing?.cost || pricing?.coinPrice || ZIWEI_DEEP_PDF_META.costCoins);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  return { pricing, coinPrice, amountKRW, membershipCreditCost: calculateMembershipCreditCost(coinPrice) };
}

function paymentRequired(pricing, idempotencyKey) {
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: MESSAGES.paymentRequired,
    paymentPayload: {
      billingMode: "coin-gate",
      featureKey: FEATURE_KEY,
      serviceKey: SERVICE_KEY,
      serviceId: SERVICE_KEY,
      serviceType: FEATURE_KEY,
      categoryKey: "premium-report",
      subFeatureKey: FEATURE_KEY,
      contentId: FEATURE_KEY,
      contentType: SERVICE_KEY,
      title: TITLE,
      reason: TITLE,
      orderName: TITLE,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      totalAmount: pricing.amountKRW,
      paymentAmount: pricing.amountKRW,
      amountKRW: pricing.amountKRW,
      amountKrw: pricing.amountKRW,
      currency: "KRW",
      membershipCreditCost: pricing.membershipCreditCost,
      requestId: idempotencyKey,
      idempotencyKey,
      checkoutEndpoint: "/api/billing/checkout",
      confirmEndpoint: "/api/billing/confirm",
      runtimeGate: {
        title: TITLE,
        reason: TITLE,
        featureKey: FEATURE_KEY,
        categoryKey: "premium-report",
        subFeatureKey: FEATURE_KEY,
        serviceKey: SERVICE_KEY,
        cost: pricing.coinPrice,
        coinPrice: pricing.coinPrice,
        totalAmount: pricing.amountKRW,
        paymentAmount: pricing.amountKRW,
        amountKRW: pricing.amountKRW,
        amountKrw: pricing.amountKRW,
        membershipCreditCost: pricing.membershipCreditCost,
        productId: SERVICE_KEY,
        productType: SERVICE_KEY,
        serviceType: FEATURE_KEY,
        allowedPaymentModes: ["direct", "monthly", "pass"],
        requestId: idempotencyKey,
        idempotencyKey,
      },
    },
  }, { status: 402 });
}

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

function isAdmin(auth = {}) {
  return clean(auth.role).toLowerCase() === "admin";
}

/** 병렬 실행(동시성 제한) */
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => runner());
  await Promise.all(runners);
  return results;
}

async function generateChapter(env, chart, birthInfo, chapter) {
  const prompt = buildZiweiDeepChapterPrompt(chart, birthInfo, chapter);
  // 결정적(명반+생년월일 기반, 자유질문 없음) 챕터 해석 → LLM 응답 캐시 + in-flight dedup.
  const chapterLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: "ziwei-deep-report-v1",
  };
  try {
    const ai = await callGeminiText(env, prompt, {
      maxOutputTokens: 4096,
      temperature: 0.72,
      timeoutMs: 60000,
      cache: chapterLlmCache,
      // Workers AI 폴백이 챕터 최소 분량(2,200~3,000자)의 40% 미만이면 실패로 돌린다.
      // 아래 200자 게이트는 목적이 다르다 — 전 provider 대상 "렌더 가능한 본문" 하한.
      fallbackMinChars: Math.round((chapter.minChars || 2200) * 0.4),
    });
    const body = clean(ai?.text || "");
    if (body.length >= 200) {
      return { id: chapter.id, title: chapter.title, body, chars: body.length, provider: clean(ai?.provider || "gemini"), ok: true };
    }
    throw new Error("LLM_OUTPUT_TOO_SHORT");
  } catch (error) {
    // 폴백: 짧은 안내 문단(리포트 전체 실패를 막고 재생성 유도)
    const fallback = `● ${chapter.title.replace(/^제\d+장 · /, "")}\n이 장의 상세 해석을 생성하는 중 일시적인 문제가 발생했습니다. 잠시 후 다시 시도하면 명반(${birthInfo.name || "내담자"} · 명궁 ${chart?.lifePalace || "-"}) 기준으로 이 궁의 상세 해석이 채워집니다.`;
    return { id: chapter.id, title: chapter.title, body: fallback, chars: fallback.length, provider: "fallback", ok: false, error: clean(error?.message, 120) };
  }
}

async function generateReport(env, chart, birthInfo) {
  const chapters = await runWithConcurrency(
    ZIWEI_DEEP_CHAPTERS,
    CHAPTER_CONCURRENCY,
    (chapter) => generateChapter(env, chart, birthInfo, chapter),
  );
  const totalChars = chapters.reduce((sum, ch) => sum + (ch.chars || 0), 0);
  return {
    featureKey: FEATURE_KEY,
    label: TITLE,
    generatedAt: new Date().toISOString(),
    chapterCount: chapters.length,
    totalChars,
    minTotalChars: ZIWEI_DEEP_PDF_META.minTotalChars,
    chapters: chapters.map(({ id, title, body, chars, provider, ok }) => ({ id, title, body, chars, provider, ok })),
  };
}

/**
 * 배치 생성: startIndex부터 CHAPTER_BATCH_SIZE개 챕터만 생성한다.
 * 챕터는 명반+생년월일 기반 결정론(자유질문 없음)이라 각 배치는 서로 독립·멱등하며,
 * 챕터 단위 LLM 캐시로 재요청 시 재사용된다. 한 요청의 wall-clock을 1 웨이브로 묶어
 * Cloudflare/브라우저 타임아웃 위험을 제거한다.
 */
async function generateReportBatch(env, chart, birthInfo, startIndex) {
  const totalChapters = ZIWEI_DEEP_CHAPTERS.length;
  const start = Math.max(0, Math.min(Math.trunc(startIndex) || 0, totalChapters));
  const slice = ZIWEI_DEEP_CHAPTERS.slice(start, start + CHAPTER_BATCH_SIZE);
  const chapters = await runWithConcurrency(
    slice,
    CHAPTER_CONCURRENCY,
    (chapter) => generateChapter(env, chart, birthInfo, chapter),
  );
  const nextIndex = start + slice.length;
  return {
    startIndex: start,
    nextIndex,
    totalChapters,
    done: nextIndex >= totalChapters,
    chapters: chapters.map(({ id, title, body, chars, provider, ok }) => ({ id, title, body, chars, provider, ok })),
  };
}

// ─── Handlers ────────────────────────────────────────────────────────────

async function handlePrepare(request, env) {
  const body = await readJson(request);
  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 120) || sha256(String(Date.now()));
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);

  // 명반 계산 가능 여부 사전 검증
  try {
    calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() });
  } catch (_) {
    return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 });
  }

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true, userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  if (!auth) return loginRequired();
  const pricing = getPricing();

  if (isAdmin(auth)) {
    return json({
      ok: true,
      accessType: "admin",
      accessToken: await createAccessToken(env, { userId: auth.userId, accessType: "admin", idempotencyKey, inputHash: normalized.inputHash }),
    });
  }

  await connectDb(env);
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE, userDoc: auth.authUserDoc });
  if (decision?.allowed) {
    return json({
      ok: true,
      accessType: "paid",
      accessToken: await createAccessToken(env, { userId: auth.userId, accessType: "paid", idempotencyKey, inputHash: normalized.inputHash }),
    });
  }
  return paymentRequired(pricing, idempotencyKey);
}

async function resolveGenerateAccess(request, env, auth, body, normalized, idempotencyKey) {
  // 1) 액세스 토큰(prepare에서 발급)
  const token = clean(asObject(body).accessToken || request.headers.get("x-ziwei-deep-access-token"));
  if (token) {
    try {
      const payload = await verifyAccessToken(env, token);
      if (clean(payload.userId) === clean(auth.userId) && clean(payload.idempotencyKey) === idempotencyKey && clean(payload.inputHash) === normalized.inputHash) {
        const accessType = clean(payload.accessType);
        if (accessType === "admin" || accessType === "paid") return { ok: true, accessType };
      }
    } catch (_) { /* fall through */ }
  }
  if (isAdmin(auth)) return { ok: true, accessType: "admin" };
  // 2) 엔타이틀먼트/이용권/방금 완료된 회당 결제 확인
  await connectDb(env);
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE, userDoc: auth.authUserDoc });
  if (decision?.allowed) return { ok: true, accessType: "paid" };
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

async function handleGenerate(request, env) {
  const body = await readJson(request);
  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 120) || sha256(String(Date.now()));
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true, userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  if (!auth) return loginRequired();

  const access = await resolveGenerateAccess(request, env, auth, body, normalized, idempotencyKey);
  if (!access.ok) return paymentVerifyFailed();

  let chart;
  try {
    chart = calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() });
  } catch (_) {
    return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 });
  }

  // startIndex가 있으면 배치 모드(신규 클라이언트). 없으면 기존 단일 생성(구버전 호환).
  const rawStartIndex = Number(asObject(body).startIndex);
  const batchMode = Number.isFinite(rawStartIndex);

  try {
    if (batchMode) {
      const batch = await generateReportBatch(env, chart, normalized.birthInfo, rawStartIndex);
      // 다음 배치가 DB·결제 조회 없이 순수 JWT 검증만으로 접근하도록 재사용 토큰을 발급한다(과금 없음).
      const accessToken = await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        idempotencyKey,
        inputHash: normalized.inputHash,
      });
      return json({
        ok: true,
        accessType: access.accessType,
        accessToken,
        reportMeta: {
          featureKey: FEATURE_KEY,
          label: TITLE,
          minTotalChars: ZIWEI_DEEP_PDF_META.minTotalChars,
          chapterCount: batch.totalChapters,
          generatedAt: new Date().toISOString(),
        },
        ...(batch.startIndex === 0 ? { birthInfo: normalized.birthInfo, ziweiChart: chart } : {}),
        batch,
      });
    }
    const report = await generateReport(env, chart, normalized.birthInfo);
    return json({ ok: true, accessType: access.accessType, birthInfo: normalized.birthInfo, ziweiChart: chart, report });
  } catch (error) {
    console.error("[ziwei-deep-report] generate", clean(error?.message, 300));
    return serverError("리포트 생성에 실패했습니다. 결제 권한은 보존되니 잠시 후 다시 시도해 주세요.", 503);
  }
}

function handlePlan() {
  return json({ ok: true, plan: getZiweiDeepReportPlan() });
}

/**
 * 심화 자미두수 웹 리포트(20,000원 영구 잠금 `premium-ziwei`)의 서버 엔타이틀먼트 확인.
 * 클라이언트(V2)가 마운트 시 호출해 잠금 여부를 서버 권위로 판정한다(과금 우회 차단).
 * 오류 시 클라이언트는 fail-open 처리(콘텐츠 노출)하도록 unlocked=true 대신 error 플래그를 준다.
 */
async function handleWebAccess(request, env) {
  const auth = await getOptionalUserFromRequest(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  if (!auth) return json({ ok: true, unlocked: false, reason: "LOGIN_REQUIRED" });
  if (isAdmin(auth)) return json({ ok: true, unlocked: true, accessType: "admin" });
  try {
    await connectDb(env);
    const decision = await canAccessPaidFeature(auth.userId, "premium-ziwei", { env, reason: "심화 자미두수", userDoc: auth.authUserDoc });
    return json({ ok: true, unlocked: Boolean(decision?.allowed) });
  } catch (error) {
    console.error("[ziwei-deep-report] access", clean(error?.message, 200));
    return json({ ok: false, unlocked: false, error: true });
  }
}

export async function handleZiweiDeepReportRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/ziwei-deep-report");
  try {
    if (method === "GET" && (path === "/plan" || path === "")) return handlePlan();
    if (method === "GET" && path === "/access") return await handleWebAccess(request, env);
    if (method === "POST" && path === "/prepare") return await handlePrepare(request, env);
    if (method === "POST" && path === "/generate") return await handleGenerate(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[ziwei-deep-report]", clean(error?.code || error?.message || error, 300));
    return serverError();
  }
}

export const __ziweiDeepReportTestUtils = { FEATURE_KEY, SERVICE_KEY, normalizeInput, getPricing };
