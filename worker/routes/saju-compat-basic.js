// 꿀꿀 운세 「기본 사주 궁합」 LLM 서비스(선결제). 점수·등급·합충은 브라우저 엔진이 확정해 보내고(facts),
// 서버는 그 값을 검증·보존하며 서술만 생성한다. 결과는 완료 시 한 번 metadata.result 로 기록되는 불변 스냅샷이며
// 보관함 목록·상세는 그 스냅샷을 읽기만 한다(열람은 LLM 을 다시 부르지 않는다).
import { salvageTruncatedJsonObject } from "../../lib/llm-text.js";
import { HttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, cookieValue } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { withMongoRetry } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import { runPaidNarrativeDelivery } from "../lib/paid-narrative-delivery.js";
import { isStoredPaidResultRevoked } from "../lib/paid-result-revocation.js";
import { hasRepeatedReportPassage } from "../lib/paid-report-quality.js";
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import {
  SAJU_COMPAT_FEATURE_KEY, SAJU_COMPAT_REPORT_TYPE, SAJU_COMPAT_SHORTFALL_RATIO,
  assembleSajuCompatSnapshot, buildSajuCompatPart, completeSajuCompatPart, groupTargetChars, measureSajuCompatPart,
  mergeSajuCompatShaped, normalizeSajuCompatInput, parseSajuCompatResponse, sajuCompatSeenKeys, sajuCompatShapedChars,
  sajuCompatTasks, shapeSajuCompatGroup, sajuCompatResponseSchema,
} from "../lib/saju-compat-schema.js";
import { buildSajuCompatPrompt, buildSajuCompatSystemPrompt } from "../lib/saju-compat-prompts.js";

const ROUTE_PREFIX = "/api/saju-compat-basic";
const ARCHIVE_LIMIT = 30;
const RESULT_ID_RE = /^[a-zA-Z0-9:_-]{8,120}$/;
// 요청당 LLM 천장(85초)과 엣지 응답 한도(100초) 안에서 한 그룹을 만든다.
const PROVIDER_TIMEOUT_MS = clampSyncLlmTimeoutMs(75000);
const clean = (value) => String(value || "").trim();

const providerIsLive = (ai) => Boolean(ai?.ok) && !ai.isMock && !/mock/i.test(`${ai.provider || ""} ${ai.model || ""}`);

async function generateGroup(env, group, input, seen, promptOptions) {
  const ai = await callGeminiText(env, buildSajuCompatPrompt(group, input, promptOptions), {
    systemPrompt: buildSajuCompatSystemPrompt(),
    locale: "ko", // v1 서술은 한국어만(UI 로케일과 무관).
    temperature: 0.6,
    maxOutputTokens: 8192,
    thinkingBudget: 0,
    timeoutMs: PROVIDER_TIMEOUT_MS,
    fallbackToWorkersAI: false,
    responseMimeType: "application/json",
    responseSchema: sajuCompatResponseSchema(group, input),
  });
  if (!providerIsLive(ai)) return null;
  const parsed = parseSajuCompatResponse(ai.text, salvageTruncatedJsonObject);
  if (!parsed) return null;
  return { shaped: shapeSajuCompatGroup(group, parsed, input, new Set(seen)), model: clean(ai.model) };
}

// 서버 재개(cron)와 라우트가 같은 produce·render 를 쓴다.
export function sajuCompatNarrativeAdapter(env) {
  return {
    reportType: SAJU_COMPAT_REPORT_TYPE,
    completeBody: completeSajuCompatPart,
    measureBody: measureSajuCompatPart,
    // Exhausted legacy attempts can contain all the prose at the wrong JSON path.
    // Revalidate the saved response locally, under the engine's owner/lease checks.
    recoverSavedPart: (task, state) => {
      if (task.id !== "pastLife" || Number(state.attempts?.[task.id]) < 2) return null;
      const parsed = parseSajuCompatResponse(state.rawResponses?.[task.id], salvageTruncatedJsonObject);
      if (!parsed) return null;
      const seen = sajuCompatSeenKeys(state.parts);
      let shaped = shapeSajuCompatGroup(task.id, parsed, state.input, new Set(seen));
      const stash = state.lenient?.[task.id];
      if (stash) shaped = mergeSajuCompatShaped(task.id, state.input, shaped, stash, new Set(seen));
      // Local recovery only completes fully restored content, never waives holes.
      if (shaped.missing.length) return null;
      return acceptable(state, task.id, shaped, stash?.model || "", state.attempts[task.id])?.body || null;
    },
    // 한 요청에 한 그룹. 1차 시도에서 필수 항목이 비었거나 분량이 목표의 60% 미만이면 부분 결과를 state.lenient 에
    // 맡겨 두고 null 을 돌려 한 번 보강한다. 2차(마지막) 시도는 1차 결과와 합쳐, 한도 안의 결손이면 분량과
    // 무관하게 받아들인다(분량 미달만으로 결과를 거부하지 않는다).
    produce: async (task, state) => {
      const group = task.id;
      const attempt = Number(state.attempts?.[group]) || 1;
      const seen = sajuCompatSeenKeys(state.parts);
      const stash = state.lenient?.[group] || null;
      const retry = attempt > 1 ? { issues: state.issues?.[group] || [], shortfall: Boolean(state.shortfall?.[group]) } : {};
      let fresh = null;
      try { fresh = await generateGroup(env, group, state.input, seen, retry); } catch { fresh = null; }
      let shaped = fresh?.shaped || null;
      const model = fresh?.model || stash?.model || "";
      if (attempt < 2) {
        const short = shaped && !shaped.missing.length
          && sajuCompatShapedChars(group, state.input, shaped) < groupTargetChars(group, state.input) * SAJU_COMPAT_SHORTFALL_RATIO;
        if (shaped && !shaped.missing.length && !short) return acceptable(state, group, shaped, model, attempt);
        if (shaped) {
          state.lenient = { ...state.lenient, [group]: { ...shaped, model } };
          state.issues = { ...state.issues, [group]: shaped.missing };
          state.shortfall = { ...state.shortfall, [group]: Boolean(short) };
        }
        return null;
      }
      if (shaped && stash) shaped = mergeSajuCompatShaped(group, state.input, shaped, stash, new Set(seen));
      else shaped = shaped || stash;
      if (!shaped) return null;
      return acceptable(state, group, shaped, model, attempt);
    },
    render: assembleSajuCompatSnapshot,
  };
}

// 엔진의 반복 문단 검사를 통과하지 못할 본문은 내지 않는다(정제 단계가 미리 막아 두므로 방어선이다).
function acceptable(state, group, shaped, model, attempt) {
  const body = buildSajuCompatPart(group, shaped, { model, attempt });
  return hasRepeatedReportPassage(body) ? null : { evidenceHash: state.evidenceHash, body };
}

async function handleGenerate(request, env) {
  const body = request.method === "POST" ? await readJson(request) : {};
  if (request.method === "POST" && !body.resumeResultId) normalizeSajuCompatInput(body);
  const auth = await requireAuth(request, env);
  return runPaidNarrativeDelivery(request, env, auth, body, {
    ...sajuCompatNarrativeAdapter(env),
    featureKey: SAJU_COMPAT_FEATURE_KEY,
    verify: async (original) => {
      const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, SAJU_COMPAT_REPORT_TYPE, {
        ...original,
        featureKey: SAJU_COMPAT_FEATURE_KEY,
        reportType: SAJU_COMPAT_REPORT_TYPE,
        premiumAccessToken: clean(request.headers.get("x-premium-access-token") || original.premiumAccessToken || cookieValue(request, "cd_premium_access")) || undefined,
        _accessRoute: ROUTE_PREFIX,
      });
      if (!access?.ok) throw new HttpError(Number(access?.status || 402), "결제 확인이 필요합니다.", { code: access?.code || "PAYMENT_REQUIRED" });
    },
    seed: (original) => {
      const input = normalizeSajuCompatInput(original);
      const tasks = sajuCompatTasks(input);
      return { input, tasks, minBodyChars: tasks.reduce((sum, task) => sum + task.minChars, 0) };
    },
  });
}

// ---------------------------------------------------------------------------------------------
// 보관함 — 완료된 스냅샷만. 목록은 요약 투영, 상세는 metadata.result 전체. paidNarrative(원본 요청·원문 응답)는 투영하지 않는다.
// ---------------------------------------------------------------------------------------------
const completedFilter = (userId, extra = {}) => ({
  userId, featureKey: SAJU_COMPAT_FEATURE_KEY, "metadata.paidNarrative": { $exists: true }, premiumStatus: "completed", status: "success", ...extra,
});
const pillarKey = (side) => (Array.isArray(side?.pillars) ? side.pillars.map((pillar) => `${pillar.gan}${pillar.ji}`).join(" ") : "");

async function handleArchiveList(request, env) {
  const auth = await requireAuth(request, env);
  const rows = await withMongoRetry(env, () => ServiceExecutionTransaction.find(completedFilter(auth.userId))
    .select({
      executionKey: 1, createdAt: 1,
      "metadata.result.schemaVersion": 1, "metadata.result.generatedAt": 1,
      "metadata.result.input.compatType": 1, "metadata.result.input.partnerName": 1, "metadata.result.input.self": 1, "metadata.result.input.partner": 1,
      "metadata.result.facts.score": 1, "metadata.result.facts.grade": 1, "metadata.result.facts.pastLife.grade": 1,
    })
    .sort({ createdAt: -1 }).limit(ARCHIVE_LIMIT).lean());
  const items = (rows || []).filter((row) => row?.metadata?.result).map((row) => {
    const result = row.metadata.result;
    return {
      resultId: row.executionKey,
      createdAt: row.createdAt,
      generatedAt: result.generatedAt || null,
      schemaVersion: result.schemaVersion,
      compatType: result.input?.compatType || "",
      partnerName: result.input?.partnerName || "",
      selfKey: pillarKey(result.input?.self),
      partnerKey: pillarKey(result.input?.partner),
      score: result.facts?.score?.display ?? null,
      grade: result.facts?.grade?.code || "",
      pastLifeGrade: result.facts?.pastLife?.grade?.code || "",
    };
  });
  return json({ ok: true, items });
}

async function handleArchiveDetail(request, env, resultId) {
  const auth = await requireAuth(request, env);
  if (!RESULT_ID_RE.test(resultId)) return notFound();
  const row = await withMongoRetry(env, () => ServiceExecutionTransaction.findOne(completedFilter(auth.userId, { executionKey: resultId }))
    .select({
      executionKey: 1, createdAt: 1, status: 1, idempotencyKey: 1, paymentId: 1, orderId: 1, sessionId: 1, reportId: 1,
      "metadata.result": 1, "metadata.paidNarrativeProof.transactionId": 1,
      "metadata.paidNarrative.body.requestId": 1, "metadata.paidNarrative.body.transactionId": 1, "metadata.paidNarrative.body.purchaseId": 1,
      "metadata.paidNarrative.body.paymentId": 1, "metadata.paidNarrative.body.sessionId": 1,
    }).lean());
  if (!row?.metadata?.result) return notFound();
  // 엔진의 재열람 판정(paid-narrative-delivery revoked)과 같은 증빙 식별자를 쓴다. 이 값들은 응답에 싣지 않는다.
  const original = row.metadata?.paidNarrative?.body || {};
  const evidence = {
    status: row.status, executionKey: row.executionKey, idempotencyKey: row.idempotencyKey, orderId: row.orderId, reportId: row.reportId,
    requestId: original.requestId, purchaseId: original.purchaseId,
    paymentId: row.paymentId || original.paymentId, sessionId: row.sessionId || original.sessionId,
    transactionId: row.metadata?.paidNarrativeProof?.transactionId || original.transactionId || "",
  };
  if (await withMongoRetry(env, () => isStoredPaidResultRevoked(auth.userId, SAJU_COMPAT_FEATURE_KEY, evidence))) {
    return json({ ok: false, retryable: false, reason: "PAYMENT_REVOKED" }, { status: 403 });
  }
  return json({ ok: true, resultId: row.executionKey, createdAt: row.createdAt, result: row.metadata.result });
}

export async function handleSajuCompatBasicRoutes(request, env = {}) {
  try {
    const path = getRoutePath(request, ROUTE_PREFIX);
    if (path === "/generate") return ["POST", "GET"].includes(request.method) ? await handleGenerate(request, env) : methodNotAllowed();
    if (path === "/archive") return request.method === "GET" ? await handleArchiveList(request, env) : methodNotAllowed();
    const detail = path.match(/^\/archive\/([^/]+)$/);
    if (detail) return request.method === "GET" ? await handleArchiveDetail(request, env, decodeURIComponent(detail[1])) : methodNotAllowed();
    return notFound();
  } catch (error) {
    if (error.code === "RESULT_STORAGE_UNAVAILABLE") return json({ ok: false, retryable: true, reason: error.code, resultId: error.resultId }, { status: 503 });
    return handleRouteError(error, { request, env });
  }
}
