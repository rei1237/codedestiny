// 휴먼 디자인 프리미엄 리포트 — 회당 결제(human-design-report, 100코인 = ₩10,000).
//
//   POST /api/human-design-report/start     결제 확인 + 차트 준비 + 문서 생성. 🔴 LLM 을 부르지 않는다
//   POST /api/human-design-report/generate  한 요청 = 한 웨이브(동시성 4). 🔴 결제를 재검증하지 않는다
//   GET  /api/human-design-report/result    재열람. 🔴 결제 게이트 없음
//
// 왜 무료 차트 라우트(human-design.js)와 파일을 나눴나
// ─────────────────────────────────────────────────────────────────────────────
// 무료 라우트는 무료 계약(인증만)을, 유료 라우트는 결제 계약을 각자 갖는다. 나크샤트라
// (nakshatra.js ↔ nakshatra-premium.js)와 운명의 지도(destiny-compass.js ↔ -ai.js)가 정한
// 관례이고, 한 파일에 섞으면 "무료 경로에 결제 검사가 새는" 사고가 반복된다.
//
// 왜 한 요청에 다 안 만드나
// ─────────────────────────────────────────────────────────────────────────────
// 엣지 응답 데드라인이 100초다. 25,000자는 gemini-2.5-flash 비스트리밍 기준 200초가 넘게 든다
// (인생의 책 실측). 그래서 서버가 18유닛으로 쪼개 한 요청당 4개씩만 만들고, 클라이언트가
// 끝날 때까지 반복 호출한다. 🔴 ctx.waitUntil 백그라운드 생성은 이 저장소에서 금지다.
//
// 결제와 생성을 한 트랜잭션으로 묶지 않는다
// ─────────────────────────────────────────────────────────────────────────────
// /start 가 결제를 확인하고 환불 가능 상태를 연다. 생성이 실패해도 결제를 되돌릴 뿐 결과를
// 버리지 않는다 — 렌더 가능한 분량이 남아 있으면 degraded 로 전달하고 결제를 유지한다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { HumanDesignCalculation, HumanDesignReport } from "../lib/models.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { calculateHumanDesignChart } from "../lib/human-design-ephemeris.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { escapeRawControlCharsInJsonStrings } from "../lib/json-text-repair.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { runWithConcurrency } from "../lib/concurrency.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import { completeServiceExecution, failServiceExecution, startServiceExecution } from "../lib/service-execution-task.js";
import { CALCULATION_VERSION } from "../../lib/human-design/version.js";
import { clean, computeInputHash, isValidBirth, normalizeBirthBody } from "../lib/human-design-birth-input.js";
import {
  HD_REPORT_DELIVER_MIN_SECTIONS,
  HD_REPORT_DELIVER_MIN_TOTAL_CHARS,
  HD_REPORT_LOCALES,
  HD_REPORT_LOCK_TTL_MS,
  HD_REPORT_MAX_SECTION_ATTEMPTS,
  HD_REPORT_MAX_WAVES,
  HD_REPORT_SECTIONS,
  HD_REPORT_SECTION_CONCURRENCY,
  HD_REPORT_SECTION_MAX_OUTPUT_TOKENS,
  HD_REPORT_SECTION_TIMEOUT_MS,
  HD_REPORT_STALE_MS,
  HD_REPORT_VERSION,
  HD_REPORT_WAVE_BUDGET_MS,
  buildAllowedIds,
  buildHumanDesignFactSnapshot,
  effectiveMinChars,
  hdReportFallbackMinChars,
  rememberSentences,
  requiredSubsectionIds,
  sectionCharCount,
  validateHumanDesignReportSection,
} from "../lib/human-design-report-contract.js";
import {
  HD_REPORT_SECTION_TITLES,
  buildHumanDesignReportSectionPrompt,
  sectionDigest,
} from "../lib/human-design-report-prompt.js";

// 레지스트리(worker/lib/paid-feature-registry.js)와 일치해야 한다.
// 🔴 scripts/verify-human-design-report.mjs 가 이 셋의 정합성을 강제한다.
const FEATURE_KEY = "human-design-report";
const COIN_PRICE = 100;
const AMOUNT_KRW = 10000;

const CHART_ARCHIVE_ID_PREFIX = "human-design-chart";

const MESSAGES = Object.freeze({
  login: "로그인이 필요합니다.",
  invalidInput: "생년월일·태어난 시각·타임존을 정확히 입력해 주세요.",
  degraded: "잠시 접속이 불안정합니다. 잠시 후 다시 시도해 주세요.",
  ephemeris: "천문 계산 엔진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  failed: "리포트를 만들지 못했습니다. 결제는 되돌려 드렸습니다.",
  busy: "리포트를 만드는 중입니다. 잠시 후 다시 시도해 주세요.",
  notFound: "리포트를 찾지 못했습니다.",
});

function degraded() {
  return json(
    { ok: false, retryable: true, reason: "TEMPORARILY_UNAVAILABLE", message: MESSAGES.degraded },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

const noStore = { "Cache-Control": "no-store" };

function resolveLocale(body) {
  const asked = clean(body?.locale || getAmbientAiLocale() || "ko", 10).toLowerCase();
  return HD_REPORT_LOCALES.includes(asked) ? asked : "ko";
}

function reportKeyOf(inputHash, locale) {
  return `${inputHash}:${locale}:${HD_REPORT_VERSION}`;
}

function executionKeyOf(requestId) {
  return `${FEATURE_KEY}:${requestId}`;
}

/** 화면·PDF 가 함께 쓰는 공개 형태. 저장 문서의 내부 필드(lock·basis)는 내보내지 않는다. */
function publicReport(doc) {
  const sections = (doc.sections || [])
    // 🔴 과금·전달 하한(handleGenerate 의 delivered)이 "ok || degraded" 를 세므로 여기도 같아야
    //    한다. ok 만 내보내면 진행률이 실제보다 적게 보고돼 클라이언트의 무진전 카운터가
    //    멀쩡한 생성을 끊고, 완성된 리포트도 결제 기준(14장)보다 적은 장수로 보인다.
    .filter((section) => section.status === "ok" || section.status === "degraded")
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      key: section.key,
      order: section.order,
      title: section.title,
      body: section.body,
      subsections: section.subsections || [],
      keyPoints: section.keyPoints || [],
      evidence: section.evidence || [],
    }));
  return {
    reportId: doc.id,
    contractVersion: doc.contractVersion,
    locale: doc.locale,
    status: doc.status,
    degraded: doc.degraded === true,
    totalChars: doc.totalChars || 0,
    progress: { completed: sections.length, total: HD_REPORT_SECTIONS.length },
    sections,
  };
}

// ── 저장 ─────────────────────────────────────────────────────────────────────

async function findReport(env, userId, filter) {
  await connectDb(env);
  return withMongoRetry(env, () => HumanDesignReport.findOne({ userId, ...filter }).lean());
}

async function findArchivedChart(env, userId, inputHash) {
  try {
    await connectDb(env);
    return await withMongoRetry(env, () => HumanDesignCalculation.findOne({
      userId,
      inputHash,
      calculationVersion: CALCULATION_VERSION,
    }).lean());
  } catch (error) {
    console.error("[human-design-report] chart lookup failed", clean(error?.message || error, 200));
    return null;
  }
}

/**
 * 🔴 락 획득과 문서 읽기를 **한 번의 왕복**으로 겸한다. `{new:true}` 가 갱신된 문서 전체를
 *    돌려주므로 웨이브당 DB 읽기가 1회로 끝난다(LAX↔서울 왕복이 1.3초라 이게 설계 목표다).
 *    획득 실패는 "이미 다른 요청이 이 리포트를 만들고 있다" 는 뜻이고, 그게 이중 팬아웃을 막는다.
 */
async function claimWave(env, userId, reportId) {
  await connectDb(env);
  const staleBefore = new Date(Date.now() - HD_REPORT_LOCK_TTL_MS);
  return withMongoRetry(env, () => HumanDesignReport.findOneAndUpdate(
    {
      id: reportId,
      userId,
      status: "generating",
      // 🔴 웨이브 상한. 이게 없으면 클라이언트가 /generate 를 무한히 부를 수 있고, 실패가
      //    반복되는 리포트 하나가 LLM 호출을 끝없이 태운다. 상한을 조건에 넣어야 원자적으로 막힌다.
      waveCount: { $lt: HD_REPORT_MAX_WAVES },
      $or: [
        { "lock.at": { $exists: false } },
        { "lock.at": null },
        { "lock.at": { $lt: staleBefore } },
      ],
    },
    { $inc: { waveCount: 1 }, $set: { "lock.at": new Date(), "lock.token": crypto.randomUUID() } },
    { new: true },
  ).lean());
}

async function releaseLock(env, userId, reportId, token) {
  try {
    await connectDb(env);
    await withMongoRetry(env, () => HumanDesignReport.updateOne(
      { id: reportId, userId, "lock.token": token },
      { $set: { lock: null } },
    ));
  } catch (error) {
    // 락은 만료로도 풀린다. 해제 실패가 생성을 막지 않는다.
    console.warn("[human-design-report] lock release failed", clean(error?.message || error, 200));
  }
}

/** 🔴 이번 웨이브에서 만든 섹션만 제자리 갱신 — arrayFilters 로 쓰기 1회. */
async function saveWave(env, userId, reportId, produced, totals) {
  if (!produced.length) return;
  const set = {
    totalChars: totals.totalChars,
    degraded: totals.degraded,
    qualityIssues: totals.qualityIssues.slice(0, 40),
    llmMeta: totals.llmMeta,
  };
  const filters = [];
  produced.forEach((section, index) => {
    set[`sections.$[s${index}]`] = section;
    filters.push({ [`s${index}.key`]: section.key });
  });
  await connectDb(env);
  await withMongoRetry(env, () => HumanDesignReport.updateOne(
    { id: reportId, userId },
    { $set: set },
    { arrayFilters: filters },
  ));
}

async function finalizeReport(env, userId, reportId, status, extra = {}) {
  await connectDb(env);
  await withMongoRetry(env, () => HumanDesignReport.updateOne(
    { id: reportId, userId },
    { $set: { status, lock: null, completedAt: status === "completed" ? new Date() : null, ...extra } },
  ));
}

// ── 결제 · 환불 ──────────────────────────────────────────────────────────────

async function openRefundableExecution(env, userId, requestId, reportId, transactionId) {
  // 이용권·관리자 통과는 차감이 없으므로 되돌릴 것도 없다.
  if (!transactionId) return;
  await startServiceExecution(env, userId, {
    executionKey: executionKeyOf(requestId),
    requestId: executionKeyOf(requestId),
    featureKey: FEATURE_KEY,
    cost: COIN_PRICE,
    sourceTransactionId: transactionId,
    reportId,
    reportType: "humanDesignPremiumReport",
    idempotencyKey: requestId,
    metadata: { featureKey: FEATURE_KEY, reportId },
  }).catch((error) => {
    console.warn("[human-design-report] execution open failed", clean(error?.message || error, 200));
  });
}

async function closeExecution(env, userId, requestId, reportId) {
  if (!requestId) return;
  await completeServiceExecution(env, userId, {
    executionKey: executionKeyOf(requestId),
    requestId: executionKeyOf(requestId),
    reportId,
    metadata: { featureKey: FEATURE_KEY, reportId },
  }).catch((error) => {
    console.warn("[human-design-report] execution close failed", clean(error?.message || error, 200));
  });
}

async function refundExecution(env, userId, requestId, reportId, reasonMessage) {
  if (!requestId) return false;
  const result = await failServiceExecution(env, userId, {
    executionKey: executionKeyOf(requestId),
    requestId: executionKeyOf(requestId),
    reportId,
    reasonCode: "human_design_report_generation_failed",
    reasonMessage: clean(reasonMessage, 300),
    failureStage: "generation",
    forceRefundOnClose: true,
  }).catch((error) => {
    console.error("[human-design-report] execution refund failed", clean(error?.message || error, 200));
    return null;
  });
  return Boolean(result);
}

// ── 생성 ─────────────────────────────────────────────────────────────────────

function parseSectionPayload(raw) {
  const attempt = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };
  let parsed = attempt(raw);
  // 🔴 responseMimeType 을 줘도 gemini-2.5-flash 는 긴 한국어의 문자열 안에 raw 개행을 넣어
  //    Bad control character 로 파싱을 깨뜨린다(worker/lib/json-text-repair.js 실측 주석).
  if (!parsed) parsed = attempt(escapeRawControlCharsInJsonStrings(String(raw)));
  if (!parsed) {
    const start = String(raw).indexOf("{");
    const end = String(raw).lastIndexOf("}");
    if (start >= 0 && end > start) parsed = attempt(String(raw).slice(start, end + 1));
  }
  return parsed && typeof parsed === "object" ? parsed : null;
}

async function generateSection(env, context, spec, attemptState) {
  const { snapshot, allowed, locale, priorDigests, seenSentences, cacheStore, inputHash } = context;
  const requiredIds = requiredSubsectionIds(spec, allowed);
  const built = buildHumanDesignReportSectionPrompt({
    snapshot,
    spec,
    locale,
    requiredIds,
    priorDigests,
    repairIssues: attemptState.issues,
  });

  const ai = await callGeminiJsonWithRetry(env, built.prompt, {
    systemPrompt: built.systemPrompt,
    baseTokens: HD_REPORT_SECTION_MAX_OUTPUT_TOKENS,
    capTokens: HD_REPORT_SECTION_MAX_OUTPUT_TOKENS,
    temperature: 0.8,
    taskType: "fortune",
    timeoutMs: HD_REPORT_SECTION_TIMEOUT_MS,
    // 🔴 폴백을 켠 유료 라우트는 이게 필수다. 안 주면 Workers AI 가 8% 분량을 내놔도
    //    정상 결제 결과로 전달되고 재시도·환불 경로가 사라진다.
    fallbackMinChars: hdReportFallbackMinChars(spec),
    cache: {
      store: cacheStore,
      deterministic: true,
      keyExtra: `${HD_REPORT_VERSION}:${locale}:${spec.key}:${inputHash}`,
      // 🔴 안 주면 분량 미달 응답이 TTL 30일 동안 굳어, 재생성이 같은 미달을 다시 받는다.
      minChars: effectiveMinChars(spec, requiredIds.length),
      skipRead: attemptState.attempt > 1,
    },
    logContext: { route: "human-design-report", section: spec.key, locale },
  });

  if (!ai?.ok || !ai.text) {
    return { ok: false, issues: [`ai_unavailable:${clean(ai?.error, 40) || "unknown"}`], meta: ai };
  }
  const payload = parseSectionPayload(ai.text);
  if (!payload) return { ok: false, issues: ["ai_malformed"], meta: ai };

  const verdict = validateHumanDesignReportSection(payload, {
    spec, snapshot, locale, allowed, requiredIds, seenSentences,
  });
  return { ok: verdict.ok, issues: verdict.issues, payload, verdict, meta: ai };
}

/** 검증을 통과했거나(ok) 시도를 다 쓴 섹션을 저장 형태로 만든다. */
function toStoredSection(spec, locale, result) {
  const title = HD_REPORT_SECTION_TITLES[spec.key]?.[locale] || spec.key;
  const payload = result.payload || {};
  const subsections = result.verdict?.keptSubsections || [];
  return {
    key: spec.key,
    order: spec.order,
    title: clean(payload.title || title, 160),
    body: String(payload.body || "").trim(),
    subsections,
    keyPoints: (payload.keyPoints || []).map((point) => clean(point, 240)).filter(Boolean).slice(0, 8),
    evidence: result.verdict?.evidence || [],
    chars: sectionCharCount({ ...payload, subsections }),
    status: result.ok ? "ok" : "degraded",
    attempts: result.attempts,
    issues: result.issues.slice(0, 6),
  };
}

// ── 라우트 ───────────────────────────────────────────────────────────────────

async function handleStart(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const locale = resolveLocale(body);
  const requestId = clean(body?.requestId || body?.idempotencyKey, 180);
  const inputHash = await computeInputHash(input);
  const reportKey = reportKeyOf(inputHash, locale);

  // 🔴 이미 만든 리포트면 결제 검사 없이 그대로 돌려준다. 본인이 이미 결제해 받은 것을
  //    다시 여는 길이다(fusion-fortune.js 의 재열람 계약과 같다).
  const existing = await findReport(env, auth.userId, { reportKey });
  if (existing && existing.status !== "generation_failed") {
    return json({ ok: true, reused: true, ...publicReport(existing) }, { headers: noStore });
  }

  // 🔴 차트 조회와 결제 증빙을 **겹쳐서** 읽는다. 둘은 서로를 필요로 하지 않고,
  //    LAX↔서울 왕복이 1.3초라 직렬로 두면 그만큼 그대로 늘어난다.
  const [archived, proof] = await Promise.all([
    findArchivedChart(env, auth.userId, inputHash),
    verifyPerUsePayment(env, {
      userId: auth.userId,
      featureKey: FEATURE_KEY,
      coinPrice: COIN_PRICE,
      requestId,
    }).catch((error) => {
      console.error("[human-design-report] payment verify threw", clean(error?.message || error, 200));
      return { proven: null, source: "", reason: "VERIFY_THREW" };
    }),
  ]);
  logPerUsePaymentProof(FEATURE_KEY, proof);

  // 🔴 null 은 판단 보류(DB 장애)다. 402 로 세탁하면 결제한 사용자가 막힌다 — 503 이어야 한다.
  if (proof.proven === null) return degraded();
  if (proof.proven !== true) {
    return json(
      { ok: false, reason: "PAYMENT_REQUIRED", featureKey: FEATURE_KEY, coinPrice: COIN_PRICE, amountKRW: AMOUNT_KRW },
      { status: 402, headers: noStore },
    );
  }

  // 🔴 클라이언트가 보낸 차트를 믿지 않는다 — 믿으면 결제 없이도 리포트를 받을 수 있다.
  let calculation = archived?.calculation || null;
  if (!calculation) {
    try {
      calculation = await calculateHumanDesignChart(env, input, {
        requestUrl: request.url,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[human-design-report] calculation failed", clean(error?.message || error, 300));
      return json({ ok: false, retryable: true, reason: "EPHEMERIS_UNAVAILABLE", message: MESSAGES.ephemeris }, { status: 502 });
    }
  }

  let snapshot;
  let allowed;
  try {
    snapshot = buildHumanDesignFactSnapshot(calculation);
    allowed = buildAllowedIds(calculation);
  } catch (error) {
    // fail-closed — 계산 결과가 온전하지 않으면 모델에게 넘기지 않는다.
    console.error("[human-design-report] basis refused", clean(error?.message || error, 200));
    return json({ ok: false, reason: "CALCULATION_INCOMPLETE", message: MESSAGES.failed }, { status: 500 });
  }

  const reportId = `${FEATURE_KEY}:${auth.userId}:${inputHash}:${locale}`;
  const doc = {
    id: reportId,
    userId: auth.userId,
    profileId: clean(body?.profileId, 120),
    reportKey,
    idempotencyKey: requestId || reportKey,
    calculationId: archived?.id || `${CHART_ARCHIVE_ID_PREFIX}:${auth.userId}:${inputHash}`,
    inputHash,
    calculationVersion: calculation.calculationVersion || CALCULATION_VERSION,
    contractVersion: HD_REPORT_VERSION,
    locale,
    basis: { snapshot, allowed: { ...allowed, all: [...allowed.all] } },
    status: "generating",
    // 18유닛 자리를 미리 심어 둔다 — 이후 웨이브가 배열 push 없이 제자리 갱신만 하면 된다.
    sections: HD_REPORT_SECTIONS.map((spec) => ({
      key: spec.key,
      order: spec.order,
      title: HD_REPORT_SECTION_TITLES[spec.key]?.[locale] || spec.key,
      body: "",
      subsections: [],
      keyPoints: [],
      evidence: [],
      chars: 0,
      status: "pending",
      attempts: 0,
      issues: [],
    })),
    accessType: proof.source === "pass" ? "pass" : (proof.source === "monthly" ? "membership_credit" : "paid"),
    accessSource: clean(proof.source, 40),
    billingRequestId: requestId,
  };

  await connectDb(env);
  if (existing) {
    // 🔴 여기 도달하는 existing 은 generation_failed 하나뿐이다(위 재열람 분기가 나머지를 돌려준다).
    //    그런데 $setOnInsert 는 **기존 문서에 아무것도 쓰지 못한다.** 닫힌 문서를 그대로 두면
    //    /generate 가 곧바로 409 GENERATION_ALREADY_FAILED 를 돌려주고, 사용자는 다시 결제하고도
    //    잠금 화면으로 되돌아온다. reportKey 가 결정적이라 그 고착은 영구적이다.
    // 🔴 waveCount·lock 은 doc 에 없으므로 여기서 따로 되돌린다. 소진된 waveCount 가 남으면
    //    claimWave 의 상한 조건이 첫 웨이브부터 걸린다.
    // 🔴 billingRequestId 는 doc 안에서 이번 requestId 로 갱신된다 — 옛 값을 남기면 이후 환불이
    //    이미 환불된 실행을 다시 닫고, 이번 결제금은 영영 돌아가지 않는다.
    await withMongoRetry(env, () => HumanDesignReport.updateOne(
      { userId: auth.userId, reportKey, status: "generation_failed" },
      {
        $set: {
          ...doc,
          waveCount: 0,
          providerCallCount: 0,
          totalChars: 0,
          qualityIssues: [],
          degraded: false,
          lock: null,
          generationError: null,
          llmMeta: null,
          completedAt: null,
        },
      },
    ));
  } else {
    await withMongoRetry(env, () => HumanDesignReport.updateOne(
      { userId: auth.userId, reportKey },
      { $setOnInsert: doc },
      { upsert: true },
    ));
  }

  await openRefundableExecution(env, auth.userId, requestId, reportId, clean(proof.transactionId, 120));

  return json(
    {
      ok: true,
      reused: false,
      reportId,
      locale,
      status: "generating",
      progress: { completed: 0, total: HD_REPORT_SECTIONS.length },
      plan: HD_REPORT_SECTIONS.map((spec) => ({
        key: spec.key,
        order: spec.order,
        title: HD_REPORT_SECTION_TITLES[spec.key]?.[locale] || spec.key,
      })),
    },
    { headers: noStore },
  );
}

async function handleGenerate(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const reportId = clean(body?.reportId, 200);
  if (!reportId) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  // 🔴 결제를 다시 검증하지 않는다. 문서 자체가 증빙이다 — 증빙된 결제 없이는 /start 가
  //    문서를 만들지 않는다. 소유권은 { id, userId } 조건이 본다.
  const claimed = await claimWave(env, auth.userId, reportId);
  if (!claimed) {
    const current = await findReport(env, auth.userId, { id: reportId });
    if (!current) return json({ ok: false, reason: "REPORT_NOT_FOUND", message: MESSAGES.notFound }, { status: 404 });
    if (current.status === "completed") {
      return json({ ok: true, ...publicReport(current) }, { headers: noStore });
    }
    if (current.status === "generation_failed") {
      return json({ ok: false, reason: "GENERATION_ALREADY_FAILED", message: MESSAGES.failed }, { status: 409, headers: noStore });
    }
    // 🔴 웨이브를 다 썼는데 아직 완성이 아니다 — 더 부르게 두지 않고 닫고 환불한다.
    //    그대로 두면 클라이언트가 409 를 영원히 받으며 "만드는 중" 화면에 갇힌다.
    if (Number(current.waveCount || 0) >= HD_REPORT_MAX_WAVES) {
      await finalizeReport(env, auth.userId, reportId, "generation_failed", {
        generationError: { reason: "WAVE_BUDGET_EXHAUSTED", waves: current.waveCount, at: new Date().toISOString() },
      });
      const refunded = await refundExecution(env, auth.userId, current.billingRequestId, reportId, "wave budget exhausted");
      return json(
        { ok: false, retryable: false, reason: "GENERATION_STALLED", refunded, message: MESSAGES.failed },
        { status: 503, headers: noStore },
      );
    }
    // 다른 요청이 웨이브를 잡고 있다. 이중 팬아웃을 막는 자리다.
    // 🔴 retryable 을 붙이지 않는다. 붙이면 postPaidBody 가 이 409 를 스스로 5회 재시도해
    //    useReportGeneration 의 4초 양보 위에 재시도가 한 겹 더 쌓이고(코딩 원칙 6),
    //    웨이브당 요청이 5배가 되어 /start 와 공유하는 분당 15회 상한을 넘긴다.
    //    재시도 주기는 아래 Retry-After 를 보고 클라이언트가 정한다.
    return json(
      { ok: false, reason: "GENERATION_IN_PROGRESS", message: MESSAGES.busy },
      { status: 409, headers: { ...noStore, "Retry-After": "4" } },
    );
  }

  const lockToken = claimed.lock?.token || "";
  const locale = claimed.locale;
  const snapshot = claimed.basis?.snapshot;
  const rawAllowed = claimed.basis?.allowed;
  if (!snapshot || !rawAllowed) {
    await releaseLock(env, auth.userId, reportId, lockToken);
    return json({ ok: false, reason: "CALCULATION_INCOMPLETE", message: MESSAGES.failed }, { status: 500 });
  }
  const allowed = { ...rawAllowed, all: new Set(rawAllowed.all || []) };

  const stored = [...(claimed.sections || [])].sort((a, b) => a.order - b.order);
  const done = stored.filter((section) => section.status === "ok" || section.status === "degraded");
  const pending = stored
    .filter((section) => section.status === "pending" || (section.status === "failed" && section.attempts < HD_REPORT_MAX_SECTION_ATTEMPTS))
    .slice(0, HD_REPORT_SECTION_CONCURRENCY);

  // 앞선 섹션의 문장과 요약 — 반복 금지와 문맥 연결의 재료다.
  const seenSentences = new Set();
  for (const section of done) rememberSentences(seenSentences, section);
  const priorDigests = done.slice(-6).map((section) => sectionDigest(section, locale));

  const cacheStore = createLlmCacheStore(env);
  const context = { snapshot, allowed, locale, priorDigests, seenSentences, cacheStore, inputHash: claimed.inputHash };
  const waveDeadline = Date.now() + HD_REPORT_WAVE_BUDGET_MS;

  let produced = [];
  try {
    produced = (await runWithConcurrency(pending, HD_REPORT_SECTION_CONCURRENCY, async (storedSection) => {
      const spec = HD_REPORT_SECTIONS.find((item) => item.key === storedSection.key);
      if (!spec || Date.now() > waveDeadline) return null;

      let attempt = Number(storedSection.attempts || 0);
      let result = null;
      // 교정은 1회만. 그 이상은 다음 웨이브가 이어받는다(요청 예산을 지키기 위해).
      for (let round = 0; round < 2; round += 1) {
        attempt += 1;
        result = await generateSection(env, context, spec, { attempt, issues: round === 0 ? [] : result.issues });
        result.attempts = attempt;
        if (result.ok) break;
        if (attempt >= HD_REPORT_MAX_SECTION_ATTEMPTS || Date.now() > waveDeadline) break;
      }
      if (!result) return null;
      if (!result.payload) {
        return { ...storedSection, status: attempt >= HD_REPORT_MAX_SECTION_ATTEMPTS ? "failed" : "pending", attempts: attempt, issues: result.issues.slice(0, 6) };
      }
      // 🔴 검증에 걸려도 본문이 있으면 버리지 않는다 — degraded 로 전달하고 결제를 유지한다
      //    (경량 보장 계약). 버리는 것은 본문 자체가 없을 때뿐이다.
      const section = toStoredSection(spec, locale, result);
      if (result.ok) rememberSentences(seenSentences, section);
      return section;
    })).filter(Boolean);
  } finally {
    await releaseLock(env, auth.userId, reportId, lockToken);
  }

  const merged = new Map(stored.map((section) => [section.key, section]));
  for (const section of produced) merged.set(section.key, section);
  const all = [...merged.values()];
  const delivered = all.filter((section) => section.status === "ok" || section.status === "degraded");
  const totalChars = delivered.reduce((sum, section) => sum + Number(section.chars || 0), 0);
  const qualityIssues = delivered.flatMap((section) => (section.issues || []).map((issue) => `${section.key}:${issue}`));

  await saveWave(env, auth.userId, reportId, produced, {
    totalChars,
    degraded: delivered.some((section) => section.status === "degraded"),
    qualityIssues,
    llmMeta: { at: new Date().toISOString(), waves: claimed.waveCount },
  });

  const exhausted = all.every((section) => section.status === "ok" || section.status === "degraded" || section.attempts >= HD_REPORT_MAX_SECTION_ATTEMPTS);
  if (!exhausted) {
    const fresh = await findReport(env, auth.userId, { id: reportId });
    return json({ ok: true, ...publicReport(fresh || claimed), status: "generating" }, { status: 202, headers: { ...noStore, "Retry-After": "1" } });
  }

  // 🔴 전달 경계 — "리포트라고 부를 수 있는가". 넘으면 결제 유지, 미달이면 환불한다.
  const renderable = hasRenderableLlmText(delivered.map((section) => section.body).join("\n"), { minChars: 400 });
  if (delivered.length >= HD_REPORT_DELIVER_MIN_SECTIONS && totalChars >= HD_REPORT_DELIVER_MIN_TOTAL_CHARS && renderable) {
    await finalizeReport(env, auth.userId, reportId, "completed");
    await closeExecution(env, auth.userId, claimed.billingRequestId, reportId);
    const fresh = await findReport(env, auth.userId, { id: reportId });
    return json({ ok: true, ...publicReport(fresh || claimed), status: "completed" }, { headers: noStore });
  }

  await finalizeReport(env, auth.userId, reportId, "generation_failed", {
    generationError: { reason: "BELOW_DELIVERY_FLOOR", sections: delivered.length, totalChars, at: new Date().toISOString() },
  });
  const refunded = await refundExecution(env, auth.userId, claimed.billingRequestId, reportId, "delivery floor not met");
  return json(
    { ok: false, retryable: true, reason: "REPORT_UNDELIVERABLE", refunded, message: MESSAGES.failed },
    { status: 503, headers: noStore },
  );
}

async function handleResult(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const reportId = clean(url.searchParams.get("reportId"), 200);
  const inputHash = clean(url.searchParams.get("inputHash"), 80);
  const locale = HD_REPORT_LOCALES.includes(clean(url.searchParams.get("locale"), 10)) ? clean(url.searchParams.get("locale"), 10) : "";

  let doc = null;
  if (reportId) doc = await findReport(env, auth.userId, { id: reportId });
  else if (inputHash && locale) doc = await findReport(env, auth.userId, { reportKey: reportKeyOf(inputHash, locale) });
  else {
    await connectDb(env);
    const list = await withMongoRetry(env, () => HumanDesignReport
      .find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("id locale status totalChars createdAt")
      .lean());
    return json({ ok: true, reports: list || [] }, { headers: noStore });
  }

  if (!doc) return json({ ok: false, reason: "REPORT_NOT_FOUND", message: MESSAGES.notFound }, { status: 404, headers: noStore });

  // 🔴 좀비 승격 — 생성 중인데 오래 갱신이 없으면 실패로 닫고 환불한다. 그대로 두면
  //    사용자가 "만드는 중" 화면에 영원히 갇힌다.
  if (doc.status === "generating" && Date.now() - new Date(doc.updatedAt || doc.createdAt).getTime() > HD_REPORT_STALE_MS) {
    await finalizeReport(env, auth.userId, doc.id, "generation_failed", {
      generationError: { reason: "STALLED", at: new Date().toISOString() },
    });
    const refunded = await refundExecution(env, auth.userId, doc.billingRequestId, doc.id, "generation stalled");
    return json({ ok: false, retryable: true, reason: "GENERATION_STALLED", refunded, message: MESSAGES.failed }, { status: 503, headers: noStore });
  }

  if (doc.status === "generating") {
    return json({ ok: true, ...publicReport(doc) }, { status: 202, headers: { ...noStore, "Retry-After": "3" } });
  }
  if (doc.status === "generation_failed") {
    return json({ ok: false, reason: "GENERATION_FAILED", message: MESSAGES.failed }, { status: 409, headers: noStore });
  }
  // 🔴 결제 게이트를 두지 않는다 — 본인이 이미 결제해 받은 결과를 다시 여는 것이다.
  return json({ ok: true, ...publicReport(doc) }, { headers: noStore });
}

export async function handleHumanDesignReportRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/human-design-report");
  try {
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/generate") return await handleGenerate(request, env);
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (error instanceof HttpError) {
      const reason = error.payload?.error || (error.status === 401 ? "LOGIN_REQUIRED" : "BAD_REQUEST");
      return json(
        { ok: false, reason, message: error.status === 401 ? MESSAGES.login : error.message },
        { status: error.status },
      );
    }
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return degraded();
    console.error("[human-design-report]", clean(error?.message || error, 300));
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }
}

export const __humanDesignReportTestUtils = {
  FEATURE_KEY,
  COIN_PRICE,
  AMOUNT_KRW,
  reportKeyOf,
  executionKeyOf,
  parseSectionPayload,
  publicReport,
};
