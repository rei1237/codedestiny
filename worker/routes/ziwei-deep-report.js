/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  심화 자미두수 심층 리포트  (ZIWEI_DEEP_PDF)  —  워커 라우트
 * ───────────────────────────────────────────────────────────────────────────
 *  회당 결제(per-use) LLM 15챕터 심층 리포트 생성 엔드포인트.
 *   - POST /api/ziwei-deep-report/prepare   결제 게이트(접근 확인 → 결제 필요 시 payload)
 *   - POST /api/ziwei-deep-report/generate  접근 검증 후 15챕터를 4개씩 배치 생성 → 누적 저장
 *   - GET  /api/ziwei-deep-report/result    재열람(id 지정) / 내 리포트 목록(id 없음)
 *   - GET  /api/ziwei-deep-report/plan      챕터 목차/목표 분량(정적)
 *
 *  결제: featureKey `ziwei-deep-pdf`(300코인=30,000원). 명반은 로컬 결정론 계산,
 *        해석 텍스트만 LLM(Gemini→Workers AI 폴백은 callGeminiText 내부 처리).
 *  프롬프트/챕터 정의: worker/lib/ziwei-deep-report-prompt.mjs
 *
 *  🔮 통합(2026-08-13): 같은 화면에 나란히 있던 "별궁 전문가 상담"(ziwei-ai-consultation,
 *     30,000원)을 이 상품으로 흡수했다. 관심분야·자유질문을 받아 15챕터 전체 프롬프트에
 *     주입하므로, 사용자는 30,000원 한 번으로 질문 맞춤 심층 리포트를 받는다.
 *     독립 페이지 /ziwei-ai 와 worker/routes/ziwei-ai.js 는 그대로 살아 있다.
 *
 *  ▶ 접근 키워드: `ZIWEI_DEEP_PDF`, `ziwei-deep-pdf`, `handleZiweiDeepReportRoutes`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb } from "../lib/db.js";
import { ZiweiDeepReport } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { callGeminiText } from "../lib/gemini.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import { startServiceExecution, completeServiceExecution, failServiceExecution } from "../lib/service-execution-task.js";
import {
  ZIWEI_DEEP_PDF_META,
  ZIWEI_DEEP_CHAPTERS,
  buildZiweiDeepChapterPrompt,
  getZiweiDeepReportPlan,
} from "../lib/ziwei-deep-report-prompt.mjs";

const SERVICE_KEY = "ziwei-deep-report";
const FEATURE_KEY = ZIWEI_DEEP_PDF_META.featureKey; // "ziwei-deep-pdf"
const REPORT_TYPE = "ziwei-deep-report";
const ACCESS_TOKEN_TYPE = "ziwei-deep-pdf-access";
const ACCESS_TOKEN_TTL = "45m";
const TITLE = ZIWEI_DEEP_PDF_META.label; // "심화 자미두수 PDF"
const CHAPTER_CONCURRENCY = 4; // Gemini 병렬 호출 상한(레이트리밋·subrequest 안전)
const CHAPTER_BATCH_SIZE = CHAPTER_CONCURRENCY; // 한 요청에서 생성할 챕터 수(=1 동시성 웨이브)

// 전달 하한 — 폴백 문단이 다수 섞인 리포트를 "완성"으로 배달하지 않기 위한 게이트.
// 🔴 이 게이트 없이는 15장 중 열 장이 2줄짜리 안내문이어도 30,000원이 정상 결제됐다.
// 비율 0.55 는 자매 라우트(worker/routes/ziwei-ai.js 의 minDeliverableChars)와 같은 값이다.
const MIN_DELIVERABLE_CHARS = Math.round(ZIWEI_DEEP_PDF_META.minTotalChars * 0.55);
// 글자수만 보면 한 장이 길게 나와 나머지 실패를 가릴 수 있다. 살아남은 장 수도 함께 본다.
const MIN_DELIVERABLE_CHAPTERS = Math.ceil(ZIWEI_DEEP_CHAPTERS.length * 0.6); // 15장 중 9장

// `generating` 문서를 "아직 누가 만들고 있다"고 믿어 줄 창(자매 라우트와 동일한 완충).
const GENERATING_FRESHNESS_MS = 150000;

const MESSAGES = {
  loginRequired: "심화 자미두수 리포트를 생성하려면 로그인이 필요합니다.",
  invalidInput: "생년월일과 출생시간(또는 '출생시간 모름')을 확인해 주세요.",
  paymentRequired: "심화 자미두수 심층 리포트는 회당 결제가 필요합니다.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 끝났다면 잠시 후 다시 시도해 주세요.",
  calculationFailed: "명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverError: "리포트를 준비하는 중 문제가 발생했습니다. 결제나 이용권은 차감되지 않았습니다.",
  generationFailed: "리포트를 완성하지 못했습니다. 결제는 되돌렸으니 잠시 후 다시 시도해 주세요.",
  dbDegraded: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
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

/**
 * 입력 정규화: 출생 정보(명반 계산용) + 통합된 상담 입력(관심분야·자유질문).
 * 🔴 상담 입력은 inputHash 에 들어간다 — 배치 도중 질문이 바뀌면 앞뒤 장의 맥락이
 *    어긋나므로, 액세스 토큰 검증에서 그런 요청을 걸러 새 생성으로 돌린다.
 */
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
  const consultation = {
    focusArea: clean(body.focusArea, 40),
    topic: clean(body.topic, 80),
    question: clean(body.question || body.userQuestion, 1200),
  };
  const inputHash = sha256([
    birthInfo.birthDate,
    birthInfo.birthTime,
    birthInfo.birthTimeUnknown,
    birthInfo.calendarType,
    birthInfo.isLeapMonth,
    birthInfo.gender,
    consultation.focusArea,
    consultation.topic,
    consultation.question,
  ].join("|"));
  return { ok: true, input: { birthInfo }, birthInfo, consultation, inputHash };
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

async function generateChapter(env, chart, birthInfo, chapter, consultation) {
  const prompt = buildZiweiDeepChapterPrompt(chart, birthInfo, chapter, consultation);
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

/**
 * 배치 생성: startIndex부터 CHAPTER_BATCH_SIZE개 챕터만 생성한다.
 * 챕터는 명반+상담 입력 기반 결정론이라 각 배치는 서로 독립·멱등하며, 챕터 단위 LLM
 * 캐시로 재요청 시 재사용된다. 한 요청의 wall-clock을 1 웨이브로 묶어 Cloudflare/브라우저
 * 타임아웃 위험을 제거한다.
 *
 * 예전에 있던 "전체를 한 번에 만드는" 비배치 경로는 제거했다. 호출자가 없었고(패널은 항상
 * startIndex 를 보낸다), 두 경로를 남기면 아래 전달 게이트와 누적 저장을 이중으로 구현해야
 * 해서 한쪽에만 게이트가 걸리는 구멍이 생긴다.
 */
async function generateReportBatch(env, chart, birthInfo, consultation, startIndex) {
  const totalChapters = ZIWEI_DEEP_CHAPTERS.length;
  const start = Math.max(0, Math.min(Math.trunc(startIndex) || 0, totalChapters));
  const slice = ZIWEI_DEEP_CHAPTERS.slice(start, start + CHAPTER_BATCH_SIZE);
  const chapters = await runWithConcurrency(
    slice,
    CHAPTER_CONCURRENCY,
    (chapter) => generateChapter(env, chart, birthInfo, chapter, consultation),
  );
  const nextIndex = start + slice.length;
  return {
    startIndex: start,
    nextIndex,
    totalChapters,
    done: nextIndex >= totalChapters,
    chapters: chapters.map(({ id, title, body, chars, provider, ok }, index) => ({
      id, title, body, chars, provider, ok, order: start + index,
    })),
  };
}

// ─── 선차감 복원(환불) ───────────────────────────────────────────
// 결제는 프론트의 공용 게이트가 이미 끝냈다. 전달 게이트에 걸리면 여기서 되돌린다.
// 🔴 세 호출 모두 실패해도 리포트 전달을 막지 않는다(로그만) — 환불 실패가 결과 유실이 되면 안 된다.

function executionKeyOf(idempotencyKey) {
  return `${FEATURE_KEY}:${idempotencyKey}`;
}

/**
 * 차감 증거는 클라이언트가 결제 게이트 응답에서 실어 보낸다(ZiweiDeepPdfPanel 의 extractPayment).
 * canAccessPaidFeature 는 matchedTransactionId 를 주지 않으므로 body 에서 찾는다 —
 * worker/routes/sukuyo.js 가 쓰는 것과 같은 폴백 순서다.
 */
function resolveSourceTransactionId(body = {}) {
  const record = asObject(body);
  return clean(
    record.transactionId
    || asObject(record.consume).transactionId
    || asObject(record.accessGrant).transactionId
    || record.ledgerId
    || record.purchaseId
    || record.paymentId,
    120,
  );
}

async function startRefundableExecution(env, userId, sourceTransactionId, idempotencyKey, reportId, pricing) {
  if (!sourceTransactionId) return false; // 이용권·관리자 통과 등 차감이 없던 경로 → 되돌릴 것도 없다.
  const result = await startServiceExecution(env, userId, {
    executionKey: executionKeyOf(idempotencyKey),
    requestId: executionKeyOf(idempotencyKey),
    featureKey: FEATURE_KEY,
    cost: pricing.coinPrice,
    amountKRW: pricing.amountKRW,
    sourceTransactionId,
    reportId,
    reportType: REPORT_TYPE,
    idempotencyKey,
    metadata: { serviceKey: SERVICE_KEY, featureKey: FEATURE_KEY, reportId },
  }).catch((error) => {
    console.warn("[ziwei-deep-report] execution guard start failed", clean(error?.message || error, 300));
    return null;
  });
  return Boolean(result?.execution);
}

async function completeRefundableExecution(env, userId, idempotencyKey, reportId) {
  await completeServiceExecution(env, userId, {
    executionKey: executionKeyOf(idempotencyKey),
    requestId: executionKeyOf(idempotencyKey),
    reportId,
    metadata: { serviceKey: SERVICE_KEY, featureKey: FEATURE_KEY, reportId },
  }).catch((error) => {
    console.warn("[ziwei-deep-report] execution guard complete failed", clean(error?.message || error, 300));
  });
}

async function refundExecution(env, userId, idempotencyKey, reportId, reasonMessage) {
  const result = await failServiceExecution(env, userId, {
    executionKey: executionKeyOf(idempotencyKey),
    requestId: executionKeyOf(idempotencyKey),
    reportId,
    reasonCode: "ziwei_deep_report_generation_failed",
    reasonMessage: clean(reasonMessage || MESSAGES.generationFailed, 300),
    failureStage: "generation",
    // 이 플래그가 없으면 soft-abandon 유예(202)로 빠져 즉시 환불되지 않는다.
    forceRefundOnClose: true,
  }).catch((error) => {
    console.error("[ziwei-deep-report] execution guard refund failed", clean(error?.message || error, 300));
    return null;
  });
  return Boolean(result?.ok);
}

// ─── 영속화 ──────────────────────────────────────────────────────
// 🔴 쓰기는 전부 best-effort 다. DB 가 흔들려도 생성·전달은 그대로 진행해야 한다 —
//    저장을 못 했다고 결제한 결과를 버리면 그게 더 큰 사고다.
//    읽기(/result)만 예외로, 실패를 transient 503 으로 올려 클라가 재시도하게 한다.

function chaptersForDb(chapters) {
  return chapters.map((ch) => ({
    id: ch.id, order: ch.order, title: ch.title,
    body: ch.body, chars: ch.chars, provider: ch.provider, ok: ch.ok !== false,
  }));
}

function buildReportId(userId, inputHash, idempotencyKey) {
  return `zwdr_${sha256(`${userId}|${inputHash}|${idempotencyKey}`).slice(0, 32)}`;
}

async function loadStoredReport(env, userId, { idempotencyKey, reportId }) {
  try {
    await connectDb(env);
    const query = reportId
      ? { id: reportId, userId: clean(userId) }
      : { userId: clean(userId), idempotencyKey };
    return await ZiweiDeepReport.findOne(query).lean();
  } catch (error) {
    console.warn("[ziwei-deep-report] report load failed", clean(error?.message || error, 200));
    return null;
  }
}

/** 첫 배치: 문서를 통째로 세운다(멱등 upsert). */
async function persistFirstBatch(env, userId, normalized, reportId, chart, chapters, accessType) {
  try {
    await connectDb(env);
    await ZiweiDeepReport.findOneAndUpdate(
      { userId: clean(userId), idempotencyKey: normalized.idempotencyKey },
      {
        $set: {
          id: reportId,
          userId: clean(userId),
          idempotencyKey: normalized.idempotencyKey,
          inputHash: normalized.inputHash,
          birthInfo: normalized.birthInfo,
          focusArea: normalized.consultation.focusArea,
          topic: normalized.consultation.topic,
          userQuestion: normalized.consultation.question,
          ziweiChart: chart,
          chapters: chaptersForDb(chapters),
          status: "partial",
          accessType: clean(accessType, 40),
          generationError: null,
        },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    console.warn("[ziwei-deep-report] first batch persist failed", clean(error?.message || error, 200));
  }
}

/**
 * 챕터 머지 — 같은 id 면 새 것으로 덮어쓰고 order 로 정렬한다.
 * 🔴 `$push` 를 쓰지 않는 이유 — 배치가 재시도되면 같은 챕터가 중복 적재된다.
 */
function mergeChapters(existing, incoming) {
  const byId = new Map((existing || []).map((ch) => [ch.id, ch]));
  for (const ch of chaptersForDb(incoming || [])) byId.set(ch.id, ch);
  return [...byId.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/** 이후 배치: 읽어서 머지한 뒤 저장한다. */
async function persistNextBatch(env, userId, reportId, chapters, complete) {
  try {
    await connectDb(env);
    const doc = await ZiweiDeepReport.findOne({ id: reportId, userId: clean(userId) });
    if (!doc) return;
    doc.chapters = mergeChapters(doc.chapters, chapters);
    doc.status = complete ? "completed" : "partial";
    if (complete && !doc.usageAppliedAt) doc.usageAppliedAt = new Date();
    await doc.save();
  } catch (error) {
    console.warn("[ziwei-deep-report] next batch persist failed", clean(error?.message || error, 200));
  }
}

async function markReportFailed(env, userId, normalized, reportId, reason) {
  try {
    await connectDb(env);
    await ZiweiDeepReport.findOneAndUpdate(
      { userId: clean(userId), idempotencyKey: normalized.idempotencyKey },
      {
        $set: {
          id: reportId,
          userId: clean(userId),
          idempotencyKey: normalized.idempotencyKey,
          inputHash: normalized.inputHash,
          status: "generation_failed",
          generationError: { reason: clean(reason, 200), at: new Date().toISOString() },
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.warn("[ziwei-deep-report] fail-mark failed", clean(error?.message || error, 200));
  }
}

/** 저장본 → 응답 봉투. 재열람과 멱등 재요청이 같은 모양을 받는다. */
function publicStoredReport(doc) {
  const chapters = (doc.chapters || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  return {
    ok: true,
    restored: true,
    reportId: doc.id,
    accessType: clean(doc.accessType, 40),
    status: doc.status,
    done: doc.status === "completed",
    birthInfo: doc.birthInfo || null,
    consultation: {
      focusArea: clean(doc.focusArea, 40),
      topic: clean(doc.topic, 80),
      question: clean(doc.userQuestion, 1200),
    },
    ziweiChart: doc.ziweiChart || null,
    reportMeta: {
      featureKey: FEATURE_KEY,
      label: TITLE,
      minTotalChars: ZIWEI_DEEP_PDF_META.minTotalChars,
      chapterCount: ZIWEI_DEEP_CHAPTERS.length,
      generatedAt: doc.updatedAt || doc.createdAt || null,
    },
    chapters,
    // 미완성 저장본이면 여기부터 이어 만들면 된다. 배치는 순차라 중간에 빠진 장이 없다.
    nextIndex: chapters.length,
    totalChapters: ZIWEI_DEEP_CHAPTERS.length,
    totalChars: chapters.reduce((sum, ch) => sum + (ch.chars || 0), 0),
    degraded: chapters.some((ch) => ch.ok === false),
  };
}

/**
 * 전달 게이트 — 15장을 다 모은 시점에만 판정한다.
 * 챕터 단위 폴백 문단(generateChapter 의 catch)은 유지한다. 한 장 실패로 열네 장을 버리는
 * 것이 사용자에게 더 나쁘기 때문이다. 이 게이트는 폴백이 다수일 때만 걸린다.
 */
function judgeDeliverable(totalChars, okChapters) {
  if (okChapters < MIN_DELIVERABLE_CHAPTERS) {
    return { ok: false, reason: `usable chapters ${okChapters} < ${MIN_DELIVERABLE_CHAPTERS}` };
  }
  if (totalChars < MIN_DELIVERABLE_CHARS) {
    return { ok: false, reason: `total chars ${totalChars} < ${MIN_DELIVERABLE_CHARS}` };
  }
  return { ok: true };
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
  // 1) 액세스 토큰(prepare 또는 직전 배치에서 발급)
  const token = clean(asObject(body).accessToken || request.headers.get("x-ziwei-deep-access-token"));
  if (token) {
    try {
      const payload = await verifyAccessToken(env, token);
      if (clean(payload.userId) === clean(auth.userId) && clean(payload.idempotencyKey) === idempotencyKey && clean(payload.inputHash) === normalized.inputHash) {
        const accessType = clean(payload.accessType);
        if (accessType === "admin" || accessType === "paid") {
          // 누적 분량은 서명된 토큰으로 옮긴다 — 클라이언트가 조작할 수 없고, DB 저장이
          // best-effort 라 실패해도 전달 게이트 판정이 흔들리지 않는다.
          return {
            ok: true,
            accessType,
            charsSoFar: Math.max(0, Number(payload.charsSoFar) || 0),
            okChaptersSoFar: Math.max(0, Number(payload.okChaptersSoFar) || 0),
          };
        }
      }
    } catch (_) { /* fall through */ }
  }
  if (isAdmin(auth)) return { ok: true, accessType: "admin", charsSoFar: 0, okChaptersSoFar: 0 };
  // 2) 엔타이틀먼트/이용권/방금 완료된 회당 결제 확인
  await connectDb(env);
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE, userDoc: auth.authUserDoc });
  if (decision?.allowed) return { ok: true, accessType: "paid", charsSoFar: 0, okChaptersSoFar: 0 };
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

/**
 * 토큰이 누적을 못 실어 온 경우(엔타이틀먼트 경로로 이어붙은 요청)의 보조 소스.
 * 저장본이 정본이므로 거기서 다시 센다.
 */
function accumulatedFromStored(stored) {
  const chapters = Array.isArray(stored?.chapters) ? stored.chapters : [];
  return {
    chars: chapters.reduce((sum, ch) => sum + (Number(ch.chars) || 0), 0),
    okChapters: chapters.filter((ch) => ch.ok !== false).length,
  };
}

async function handleGenerate(request, env) {
  const body = await readJson(request);
  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 120) || sha256(String(Date.now()));
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  normalized.idempotencyKey = idempotencyKey;

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true, userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  if (!auth) return loginRequired();

  const access = await resolveGenerateAccess(request, env, auth, body, normalized, idempotencyKey);
  if (!access.ok) return paymentVerifyFailed();

  const reportId = buildReportId(auth.userId, normalized.inputHash, idempotencyKey);
  const rawStartIndex = Number(asObject(body).startIndex);
  const startIndex = Number.isFinite(rawStartIndex) ? Math.max(0, Math.trunc(rawStartIndex)) : 0;
  const isFirstBatch = startIndex === 0;

  // 같은 요청 키로 다시 들어오면 재생성하지 않는다 — 이미 낸 돈으로 만든 리포트를 그대로 돌려준다.
  // (새로고침·이중 클릭·네트워크 재시도가 두 번째 생성을 부르지 않게)
  // 조기 return 이라 아래 startRefundableExecution 에 도달하지 않아 재과금도 없다.
  if (isFirstBatch) {
    const stored = await loadStoredReport(env, auth.userId, { idempotencyKey });
    if (stored && stored.chapters?.length && stored.status !== "generation_failed") {
      const accumulated = accumulatedFromStored(stored);
      return json({
        ...publicStoredReport(stored),
        accessType: access.accessType,
        accessToken: await createAccessToken(env, {
          userId: auth.userId,
          accessType: access.accessType,
          idempotencyKey,
          inputHash: normalized.inputHash,
          charsSoFar: accumulated.chars,
          okChaptersSoFar: accumulated.okChapters,
        }),
      });
    }
  }

  let chart;
  try {
    chart = calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() });
  } catch (_) {
    return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 });
  }

  // 선차감을 되돌릴 수 있는 상태로 연다. 첫 배치에서만 — 이후 배치는 같은 실행에 이어붙는다.
  const sourceTransactionId = resolveSourceTransactionId(body);
  if (isFirstBatch) {
    await startRefundableExecution(env, auth.userId, sourceTransactionId, idempotencyKey, reportId, getPricing());
  }

  try {
    const batch = await generateReportBatch(env, chart, normalized.birthInfo, normalized.consultation, startIndex);

    // 누적 집계 — 토큰에 실린 값을 1차 소스로 쓴다(서명돼 있고 DB 저장 실패와 무관하다).
    let priorChars = Number(access.charsSoFar) || 0;
    let priorOkChapters = Number(access.okChaptersSoFar) || 0;
    if (!isFirstBatch && !priorChars) {
      const stored = await loadStoredReport(env, auth.userId, { reportId });
      const accumulated = accumulatedFromStored(stored);
      priorChars = accumulated.chars;
      priorOkChapters = accumulated.okChapters;
    }
    const charsSoFar = priorChars + batch.chapters.reduce((sum, ch) => sum + (ch.chars || 0), 0);
    const okChaptersSoFar = priorOkChapters + batch.chapters.filter((ch) => ch.ok !== false).length;

    // 🔴 전달 게이트는 15장을 다 모은 마지막 배치에서만 판정한다.
    if (batch.done) {
      const verdict = judgeDeliverable(charsSoFar, okChaptersSoFar);
      if (!verdict.ok) {
        console.warn("[ziwei-deep-report] not deliverable", clean(verdict.reason, 200));
        const refunded = await refundExecution(env, auth.userId, idempotencyKey, reportId, MESSAGES.generationFailed);
        await markReportFailed(env, auth.userId, normalized, reportId, verdict.reason);
        return json({
          ok: false,
          reason: "GENERATION_FAILED",
          retryable: true,
          refunded,
          message: refunded ? MESSAGES.generationFailed : "리포트를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        }, { status: 503 });
      }
    }

    if (isFirstBatch) {
      await persistFirstBatch(env, auth.userId, normalized, reportId, chart, batch.chapters, access.accessType);
    } else {
      await persistNextBatch(env, auth.userId, reportId, batch.chapters, batch.done);
    }
    if (batch.done) {
      await completeRefundableExecution(env, auth.userId, idempotencyKey, reportId);
    }

    // 다음 배치가 DB·결제 조회 없이 순수 JWT 검증만으로 접근하도록 재사용 토큰을 발급한다(과금 없음).
    const accessToken = await createAccessToken(env, {
      userId: auth.userId,
      accessType: access.accessType,
      idempotencyKey,
      inputHash: normalized.inputHash,
      charsSoFar,
      okChaptersSoFar,
    });
    return json({
      ok: true,
      accessType: access.accessType,
      accessToken,
      reportId,
      reportMeta: {
        featureKey: FEATURE_KEY,
        label: TITLE,
        minTotalChars: ZIWEI_DEEP_PDF_META.minTotalChars,
        chapterCount: batch.totalChapters,
        generatedAt: new Date().toISOString(),
      },
      ...(isFirstBatch ? { birthInfo: normalized.birthInfo, ziweiChart: chart } : {}),
      batch,
    });
  } catch (error) {
    console.error("[ziwei-deep-report] generate", clean(error?.message, 300));
    // 첫 배치가 통째로 실패하면 아무것도 못 받은 것이므로 선차감을 되돌린다.
    // 이후 배치 실패는 이미 받은 장이 저장돼 있어 재진입으로 이어붙일 수 있으니 유지한다.
    if (isFirstBatch) {
      const refunded = await refundExecution(env, auth.userId, idempotencyKey, reportId, clean(error?.message, 300));
      await markReportFailed(env, auth.userId, normalized, reportId, clean(error?.message, 200));
      return json({
        ok: false,
        reason: "GENERATION_FAILED",
        retryable: true,
        refunded,
        message: refunded ? MESSAGES.generationFailed : "리포트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return serverError("리포트 생성에 실패했습니다. 지금까지 만든 장은 저장돼 있으니 잠시 후 다시 시도해 주세요.", 503);
  }
}

/**
 * GET /result       → 내 리포트 목록(최근 20개, 본문 제외)
 * GET /result?id=…  → 저장본 재열람
 * 여기서는 DB 실패를 삼키지 않는다 — 읽기 전용이라 재시도가 안전하고,
 * 조용히 "없음"을 돌려주면 사용자가 결제한 리포트가 사라진 것처럼 보인다.
 */
async function handleResult(request, env) {
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();
  const reportId = clean(new URL(request.url).searchParams.get("id"), 120);

  try {
    await connectDb(env);
    if (!reportId) {
      const rows = await ZiweiDeepReport
        .find({ userId: clean(auth.userId) }, { id: 1, birthInfo: 1, topic: 1, userQuestion: 1, status: 1, createdAt: 1, updatedAt: 1 })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      return json({
        ok: true,
        reports: rows.map((row) => ({
          id: clean(row.id),
          name: clean(row.birthInfo?.name, 80),
          topic: clean(row.topic, 80),
          question: clean(row.userQuestion, 200),
          status: clean(row.status, 30),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
      });
    }

    const doc = await ZiweiDeepReport.findOne({ id: reportId, userId: clean(auth.userId) }).lean();
    if (!doc) return notFound();
    if (doc.status === "generation_failed") {
      return json({ ok: false, reason: "GENERATION_FAILED", message: MESSAGES.generationFailed }, { status: 409 });
    }
    if (doc.status === "generating") {
      // 신선도 창을 넘긴 `generating`은 생성 주체가 이미 사라진 좀비다 — 그 자리에서 종단시킨다.
      const ageMs = Date.now() - new Date(doc.updatedAt || doc.createdAt).getTime();
      if (ageMs >= GENERATING_FRESHNESS_MS) {
        return json({ ok: false, reason: "GENERATION_FAILED", message: MESSAGES.generationFailed }, { status: 409 });
      }
      return json(
        { ok: true, reportId: doc.id, status: "generating" },
        { status: 202, headers: { "Retry-After": "3" } },
      );
    }
    return json(publicStoredReport(doc));
  } catch (error) {
    console.warn("[ziwei-deep-report] result", clean(error?.message || error, 200));
    return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: MESSAGES.dbDegraded }, { status: 503 });
  }
}

function handlePlan() {
  return json({ ok: true, plan: getZiweiDeepReportPlan() });
}

// GET /access 는 제거했다(2026-08-13). 잠금 상품 `premium-ziwei` 의 엔타이틀먼트를 조회하던
// 엔드포인트인데, 심화 화면이 "명반 무료 열람"으로 바뀌면서 호출자가 0이 됐다.
// 🔴 `premium-ziwei` 잠금 자체는 살아 있다 — 게이팅 정본은 worker/lib/access-control.js
// (`ziweiPremium`)와 worker/routes/fortune.js 의 PERSISTENT_UNLOCK_KEY_SET 이다.

export async function handleZiweiDeepReportRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/ziwei-deep-report");
  try {
    if (method === "GET" && (path === "/plan" || path === "")) return handlePlan();
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "POST" && path === "/prepare") return await handlePrepare(request, env);
    if (method === "POST" && path === "/generate") return await handleGenerate(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[ziwei-deep-report]", clean(error?.code || error?.message || error, 300));
    return serverError();
  }
}

export const __ziweiDeepReportTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  MIN_DELIVERABLE_CHARS,
  MIN_DELIVERABLE_CHAPTERS,
  normalizeInput,
  getPricing,
  judgeDeliverable,
  buildReportId,
  chaptersForDb,
  mergeChapters,
  publicStoredReport,
  accumulatedFromStored,
  resolveSourceTransactionId,
};
