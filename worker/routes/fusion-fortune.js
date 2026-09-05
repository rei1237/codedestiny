import { connectDb } from "../lib/db.js";
import { getOptionalUserFromRequest, requireUserFromRequest } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import {
  buildFusionFortuneStatus,
  createMongoFusionFortuneStore,
  generateFusionFortuneRequest,
  getFusionFortuneDateKey,
  isFusionFortuneApiEnabled,
  isFusionFortuneMockFlowEnabled,
  isFusionFortuneRealLlmAllowed,
  isFusionFortuneUiEnabled,
  FUSION_FORTUNE_ERROR_CODES,
  FUSION_FORTUNE_PAID_FEATURE_KEY,
  FUSION_GENERATION_DEADLINE_MS,
} from "../lib/fusion-fortune.js";
import {
  getFusionFortuneConsultation,
  getFusionFortuneConsultationByRequestId,
  listFusionFortuneConsultations,
  saveFusionFortuneConsultation,
} from "../lib/fusion-fortune-consultation.js";
import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";

function respond(payload) {
  const { status = 200, ...body } = payload || {};
  return json(body, { status });
}

function disabledStatus() {
  return respond({
    ok: true,
    isLoggedIn: false,
    pricing: { featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY },
    canGenerate: false,
    nextAction: "disabled",
    message: "초융합 운세는 준비 중입니다.",
  });
}

/**
 * 초융합 회당 결제 증빙 확인.
 *
 * 🔴 proven === null 은 DB 장애로 "확인 못 함"이다. 402 로 내리면 3만원을 낸 사용자가
 * 결과를 못 받으므로 degraded 로 올려 503(재시도 가능)으로 만든다.
 */
function buildFusionFortunePaidAccessResolver(env) {
  const coinPrice = Number(FEATURE_KEY_PRICE_TABLE[FUSION_FORTUNE_PAID_FEATURE_KEY]?.cost || 0);
  return async ({ userId, requestId }) => {
    if (!userId) return { ok: false };
    const proof = await verifyPerUsePayment(env, {
      userId,
      featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY,
      coinPrice,
      requestId,
    });
    logPerUsePaymentProof(FUSION_FORTUNE_PAID_FEATURE_KEY, proof);
    if (proof?.proven === true) return { ok: true };
    if (proof?.proven === null) return { ok: false, degraded: true };
    return { ok: false };
  };
}

const SSE_HEADERS = Object.freeze({
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
});

export function formatFusionFortuneSseEvent(event, payload) {
  return `event: ${String(event || "message")}\ndata: ${JSON.stringify(payload || {})}\n\n`;
}

function writeFusionFortuneSse(writer, event, payload) {
  return writer.write(new TextEncoder().encode(formatFusionFortuneSseEvent(event, payload)));
}

/**
 * 무음 구간을 없애는 심박. 네 묶음을 병렬로 쓰는 동안 이벤트가 55~110초 동안 하나도 안 나가는데,
 * 그 침묵을 중간 프록시가 끊으면 클라이언트는 result 없이 스트림이 닫힌 것만 보고 "결과를 받지
 * 못했어요"로 떨어진다. 진행 상황을 새로 만들어 내지 않고 "아직 살아 있다"만 보낸다.
 */
const FUSION_SSE_HEARTBEAT_MS = 15000;

/**
 * 데드라인을 넘긴 스트림을 서버가 **직접** 닫기까지의 유예.
 *
 * 🔴 abort 신호는 SSE 를 한 줄도 쓰지 않는다. 신호가 실제로 종료로 바뀌는 자리는 생성기 안의
 *    await 경계뿐이라, 그 경계 밖(그룹 병렬 대기·Mongo 저장)에서 걸리면 run 이 영원히 pending
 *    이고 finally 가 안 돌아 ping 만 15초마다 계속 나간다 — 화면이 영원히 도는 정체가 이것이다.
 *    유예 뒤에는 종료를 신호에 맡기지 않고 여기서 확정한다.
 */
const FUSION_STREAM_HARD_STOP_GRACE_MS = 5000;

function canGenerateFusionFortune(env) {
  return isFusionFortuneMockFlowEnabled(env) || isFusionFortuneRealLlmAllowed(env);
}

/**
 * 완성된 결과를 보관본으로 남긴다.
 *
 * 🔴 저장 실패가 배달을 막으면 안 된다 — 결제는 이미 끝났고, 사용자가 기다리는 것은
 * 3만원짜리 결과지 저장 성공이 아니다. 실패는 로그만 남기고 빈 id 를 돌려준다.
 */
async function persistFusionDelivery({ userId, input, delivery }) {
  try {
    return await saveFusionFortuneConsultation({
      requestId: delivery?.requestId,
      userId,
      input: input || {},
      result: delivery?.result,
      generationSource: delivery?.generationSource,
      qualityTier: delivery?.qualityTier,
      qualityNotice: delivery?.qualityNotice,
      stage: delivery?.stage,
    });
  } catch (error) {
    console.warn("[fusion-fortune-persist-failed]", {
      requestId: String(delivery?.requestId || "").slice(0, 120),
      message: String(error?.message || "").slice(0, 200),
    });
    return "";
  }
}

/**
 * 2단계 생성의 앞 결과. 같은 requestId 로 저장된 1단계 보관본(partial)을 읽는다.
 * 조회 실패는 null 로 흡수한다 — 생성기가 STAGE_ONE_MISSING(409, retryable) 로 1단계부터 다시 하게 한다.
 */
async function loadFusionPriorConsultation({ userId, requestId }) {
  try {
    return await getFusionFortuneConsultationByRequestId({ userId, requestId });
  } catch (error) {
    console.warn("[fusion-fortune-prior-load-failed]", { requestId: String(requestId || "").slice(0, 120), message: String(error?.message || "").slice(0, 200) });
    return null;
  }
}

function respondFusionConsultation(consultation) {
  if (!consultation) {
    return respond({ ok: false, status: 404, error: "FUSION_FORTUNE_RESULT_NOT_FOUND", message: "저장된 결과를 찾지 못했어요." });
  }
  return respond({
    ok: true,
    consultation: {
      id: consultation.id,
      title: consultation.title || "",
      result: consultation.result,
      inputSummary: consultation.inputSummary || {},
      generationSource: consultation.generationSource || "",
      // 옛 보관본에는 이 필드가 없다 — 없으면 완전 등급으로 읽는다.
      qualityTier: consultation.qualityTier || "full",
      qualityNotice: consultation.qualityNotice || "",
      // 2단계 생성 이전 보관본에는 둘 다 없다 — 완료본으로 읽는다.
      status: consultation.status || "completed",
      stage: Number(consultation.stage) || 2,
      createdAt: consultation.createdAt,
    },
  });
}

/**
 * 보관본 조회. 인자가 없으면 최근 목록, `?id=` 면 단건, `?requestId=` 면 결제 키로 회수.
 *
 * 🔴 결제 게이트를 두지 않는다 — 본인이 이미 결제해 받은 결과를 다시 여는 것이다.
 *    생성 플래그(canGenerateFusionFortune)와도 무관하다: 생성이 꺼져도 재열람은 열려 있어야 한다.
 */
async function handleFusionFortuneResultRoute(request, env) {
  let auth;
  try {
    auth = await requireUserFromRequest(request, env, { allowDbFallback: true });
  } catch (error) {
    // DB 장애로 신원을 확인하지 못한 것을 401 로 내리면 로그인한 사용자가 자기 결과를
    // 못 보고 재로그인을 반복한다. 재시도 가능한 503 으로 표면화한다.
    if (Number(error?.status) === 401) throw error;
    return respond({ ok: false, status: 503, retryable: true, error: "FUSION_FORTUNE_RESULT_DEGRADED", message: "결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
  }
  await connectDb(env);
  const userId = String(auth.userId);
  const params = new URL(request.url).searchParams;
  const id = params.get("id") || "";
  // 🔴 결제 증빙 키로 되찾는 경로. 스트림이 result 를 못 보내고 끊긴 사용자가 3만원짜리
  //    결과를 회수하는 유일한 자리다 — 저장이 배달보다 먼저 끝나므로 여기 있으면 있다.
  const requestId = params.get("requestId") || "";
  if (!id && requestId) {
    return respondFusionConsultation(await getFusionFortuneConsultationByRequestId({ userId, requestId }));
  }

  if (!id) {
    const consultations = await listFusionFortuneConsultations({ userId });
    return respond({
      ok: true,
      consultations: consultations.map((item) => ({
        id: item.id,
        title: item.title || "초융합 운세",
        topic: item.inputSummary?.topic || "",
        nickname: item.inputSummary?.nickname || "",
        qualityTier: item.qualityTier || "full",
        createdAt: item.createdAt,
      })),
    });
  }

  const consultation = await getFusionFortuneConsultation({ userId, id });
  return respondFusionConsultation(consultation);
}

async function handleFusionFortuneStreamRoute(request, env, ctx) {
  if (!canGenerateFusionFortune(env)) {
    return respond({
      ok: false,
      status: 503,
      error: FUSION_FORTUNE_ERROR_CODES.FEATURE_DISABLED,
      message: "초융합 운세 생성을 지금 시작할 수 없어요. 잠시 후 다시 시도해 주세요.",
    });
  }

  const auth = await requireUserFromRequest(request, env, { allowDbFallback: true });
  const body = await readJson(request);
  await connectDb(env);
  const transformer = new TransformStream();
  const writer = transformer.writable.getWriter();
  let consultationId = "";
  let heartbeat = null;
  const stopHeartbeat = () => {
    if (heartbeat === null) return;
    clearInterval(heartbeat);
    heartbeat = null;
  };
  // 🔴 이 타이머는 이미 날아간 LLM fetch 를 실제로 끊지 못한다 — abortController.signal 은
  //    providerCall(callGeminiJsonWithRetry → callGeminiText)에 전달되지 않아, 진행 중인
  //    Promise.allSettled 는 각 호출 자신의 timeoutMs 로만 끝난다. 이 가드가 실제로 하는 일은
  //    (1) 미달 그룹 보완 물결(retryTargets)을 새로 시작하지 않게 막고 (2) generator 호출 전/후
  //    같은 await 경계에서 throwIfFusionFortuneAborted 로 CANCELLED 를 던져 release + 에러
  //    SSE(retryRequestId 포함)를 내보내는 것뿐이다. 그래서 이 값은 생성기가 내부에서 쓰는
  //    FUSION_GENERATION_DEADLINE_MS 와 **반드시 같아야** 한다 — 여기가 더 짧으면(과거 90000 vs
  //    120000) 생성기가 "아직 예산이 남았다"고 판단해 진행 중인데 바깥은 이미 포기 판정을 내려
  //    두 시계가 서로 다른 답을 낸다. 플랫폼이 실제로 요청을 강제 종료하는 경우(이 신호로는
  //    막을 수 없다)의 안전망은 store 의 FUSION_RESERVATION_FRESHNESS_MS 신선도 창이다.
  const edgeDeadlineMs = FUSION_GENERATION_DEADLINE_MS;
  const abortController = new AbortController();
  const onClientAbort = () => abortController.abort();
  request.signal?.addEventListener?.("abort", onClientAbort, { once: true });
  const edgeTimer = setTimeout(() => abortController.abort(), edgeDeadlineMs);
  const streamRequestId = String(body?.requestId || request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key") || "").slice(0, 180);
  // 2단계 생성. stage 2 는 같은 requestId 의 1단계 보관본(status partial 또는 completed)을
  // 앞 결과로 넘긴다. 없으면 생성기가 STAGE_ONE_MISSING(409, retryable) 로 1단계부터 다시 하게 한다.
  const streamStage = Number(body?.stage) === 2 ? 2 : 1;
  const priorConsultation = streamStage === 2 ? await loadFusionPriorConsultation({ userId: String(auth.userId), requestId: streamRequestId }) : null;
  // 🔴 스트림의 **종료 주체**. 이 자리가 비어 있어서 2026-09-03 에 결제한 사용자의 화면이
  //    영원히 돌았다(원칙 6 확인: 추가가 아니라 없던 주체를 만드는 것 — 종료를 담당하던
  //    코드는 run 의 finally 뿐이었고, run 이 pending 이면 그 finally 는 영원히 안 돈다).
  //    성공·실패·하드 스톱 어느 경로로 들어와도 한 번만 실행된다.
  let hardStopTimer = null;
  let settled = false;
  const settleStream = async (errorPayload) => {
    if (settled) return;
    settled = true;
    clearTimeout(edgeTimer);
    if (hardStopTimer !== null) clearTimeout(hardStopTimer);
    request.signal?.removeEventListener?.("abort", onClientAbort);
    stopHeartbeat();
    if (errorPayload) await writeFusionFortuneSse(writer, "error", errorPayload).catch(() => {});
    await writer.close().catch(() => {});
  };
  hardStopTimer = setTimeout(() => {
    console.warn("[fusion-fortune-stream-hard-stop]", { requestId: streamRequestId, deadlineMs: edgeDeadlineMs, graceMs: FUSION_STREAM_HARD_STOP_GRACE_MS });
    void settleStream({
      error: FUSION_FORTUNE_ERROR_CODES.STREAM_TIMEOUT,
      message: "시간 안에 결과를 완성하지 못했어요. 같은 요청으로 다시 시도하면 추가 결제는 없습니다.",
      requestId: streamRequestId,
      status: 504,
      retryable: true,
      // 🔴 결제 증빙 키를 반드시 실어 보낸다. 이 값이 없으면 3만원을 낸 요청을 화면에서
      //    되찾을 방법이 없다(클라이언트가 이 키로 보관본을 조회한다).
      retryRequestId: streamRequestId,
    });
  }, edgeDeadlineMs + FUSION_STREAM_HARD_STOP_GRACE_MS);
  const run = (async () => {
    try {
      await writeFusionFortuneSse(writer, "status", { status: "started" });
      heartbeat = setInterval(() => {
        writeFusionFortuneSse(writer, "ping", {}).catch(stopHeartbeat);
      }, FUSION_SSE_HEARTBEAT_MS);
      const result = await generateFusionFortuneRequest({
        input: body,
        userId: String(auth.userId),
        requestId: body?.requestId || request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key"),
        dateKey: getFusionFortuneDateKey(),
        store: createMongoFusionFortuneStore(),
        resolvePaidAccess: buildFusionFortunePaidAccessResolver(env),
        env,
        ctx,
        abortSignal: abortController.signal,
        stage: streamStage,
        priorResult: priorConsultation?.result || null,
        priorGenerationSource: priorConsultation?.generationSource || "",
        onStage: (stage) => writeFusionFortuneSse(writer, "stage", stage),

        // 저장을 배달보다 **먼저** 한다. 마지막 write 직전 연결이 끊겨도 결과는 남아
        // 재열람이 복구 경로가 된다(예전에는 그 순간 3만원짜리 결과가 그대로 사라졌다).
        onDelivery: async (delivery) => {
          consultationId = await persistFusionDelivery({ userId: String(auth.userId), input: body, delivery });
          await writeFusionFortuneSse(writer, "result", { ...delivery, consultationId });
        },
      });
      if (!result.ok) {
        await writeFusionFortuneSse(writer, "error", {
          error: result.error || FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED,
          message: result.message || "결과를 준비하지 못했어요. 같은 요청으로 다시 시도하면 추가 결제는 없습니다.",
          requestId: result.requestId || "",
          // 402(결제 필요)/503(판단 보류)를 클라이언트가 구분할 수 있어야 결제 게이트를 열지,
          // 재시도를 안내할지 고를 수 있다. SSE 는 HTTP 상태를 다시 줄 수 없어 본문에 싣는다.
          status: Number(result.status || 0) || undefined,
          pricing: result.pricing || undefined,
          retryable: result.retryable === true ? true : undefined,
          retryRequestId: result.retryRequestId || undefined,
          stage: Number(result.stage) || streamStage,
          // 어느 관문에서 죽었는지. 계약 위반 코드만 나가고 본문·개인정보는 실리지 않는다.
          issues: Array.isArray(result.issues) && result.issues.length ? result.issues.slice(0, 8) : undefined,
        });
        return;
      }
      await writeFusionFortuneSse(writer, "complete", {
        requestId: result.requestId,
        fusionStatus: result.fusionStatus,
        // 1단계면 partial — 클라이언트가 같은 requestId 로 stage 2 를 이어서 요청한다.
        stage: Number(result.stage) || streamStage,
        status: result.stageStatus || "completed",
        // 클라이언트가 ?cid= 딥링크를 남기는 데 쓴다. 저장이 실패했으면 빈 문자열이다.
        consultationId,
        qualityTier: result.qualityTier || undefined,
        qualityNotice: result.qualityNotice || undefined,
      });
    } catch {
      await writeFusionFortuneSse(writer, "error", {
        error: FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED,
        message: "결과를 준비하지 못했어요. 같은 요청으로 다시 시도하면 추가 결제는 없습니다.",
      }).catch(() => {});
    } finally {
      // 하드 스톱이 먼저 닫았으면 settleStream 이 아무것도 하지 않는다(이중 종료 방지).
      await settleStream(null);
    }
  })();
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(run);
  else void run;
  return new Response(transformer.readable, { headers: SSE_HEADERS });
}


export async function handleFusionFortuneRoutes(request, env, ctx = null) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/fusion-fortune");
  try {
    if (!isFusionFortuneApiEnabled(env)) {
      if (method === "GET" && path === "/status") return disabledStatus();
      return respond({ ok: false, status: 403, error: FUSION_FORTUNE_ERROR_CODES.FEATURE_DISABLED, message: "초융합 운세는 준비 중입니다." });
    }

    if (method === "GET" && path === "/status") {
      if (!isFusionFortuneUiEnabled(env)) return disabledStatus();
      const auth = await getOptionalUserFromRequest(request, env, { allowDbFallback: true, surfaceDbInfraError: true });
      await connectDb(env);
      const status = await buildFusionFortuneStatus({ userId: auth?.userId || "", enabled: true });
      return respond({ ok: true, ...status });
    }

    if (method === "POST" && path === "/generate") {
      if (!isFusionFortuneMockFlowEnabled(env) && !isFusionFortuneRealLlmAllowed(env)) {
        return respond({ ok: false, status: 503, error: FUSION_FORTUNE_ERROR_CODES.FEATURE_DISABLED, message: "초융합 운세 생성은 아직 준비 중입니다." });
      }
      const auth = await requireUserFromRequest(request, env, { allowDbFallback: true });
      const body = await readJson(request);
      await connectDb(env);
      const requestId = body?.requestId || request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key");
      // 2단계 생성. stage 를 지정하면 그 단계만, 없으면 1→2 를 이어서 돈다(스트림과 같은 계약).
      const requestedStage = Number(body?.stage);
      const stages = requestedStage === 1 || requestedStage === 2 ? [requestedStage] : [1, 2];
      let prior = stages[0] === 2 ? await loadFusionPriorConsultation({ userId: String(auth.userId), requestId }) : null;
      let result = null;
      let consultationId = "";
      for (const stage of stages) {
        result = await generateFusionFortuneRequest({
          input: body,
          userId: String(auth.userId),
          requestId,
          dateKey: getFusionFortuneDateKey(),
          store: createMongoFusionFortuneStore(),
          resolvePaidAccess: buildFusionFortunePaidAccessResolver(env),
          env,
          ctx,
          stage,
          priorResult: prior?.result || null,
          priorGenerationSource: prior?.generationSource || "",
        });
        if (!result?.ok) return respond(result);
        consultationId = await persistFusionDelivery({
          userId: String(auth.userId),
          input: body,
          delivery: { requestId: result.requestId, result: result.result, generationSource: result.generationSource, qualityTier: result.qualityTier, qualityNotice: result.qualityNotice, stage: result.stage },
        });
        prior = { result: result.result, generationSource: result.generationSource };
      }
      return respond({ ...result, consultationId, status: result.stageStatus || "completed" });
    }

    if (method === "POST" && path === "/generate/stream") {
      return await handleFusionFortuneStreamRoute(request, env, ctx);
    }

    // 재열람은 생성 플래그와 무관하게 열려 있어야 한다 — 이미 결제해 받은 결과다.
    if (method === "GET" && path === "/result") {
      return await handleFusionFortuneResultRoute(request, env);
    }

    if (["/status", "/generate", "/generate/stream", "/result"].includes(path)) return methodNotAllowed();
    return notFound();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "fusion-fortune", method, requestPath: new URL(request.url).pathname } });
  }
}

export const __fusionFortuneRouteTestUtils = { disabledStatus, formatFusionFortuneSseEvent };
