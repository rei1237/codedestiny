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
} from "../lib/fusion-fortune.js";
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
    dailyLimit: { dateKey: getFusionFortuneDateKey(), limit: 100, usedCount: 0, remainingCount: 0, isSoldOut: false },
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

function canGenerateFusionFortune(env) {
  return isFusionFortuneMockFlowEnabled(env) || isFusionFortuneRealLlmAllowed(env);
}

async function handleFusionFortuneStreamRoute(request, env, ctx) {
  if (!canGenerateFusionFortune(env)) {
    return respond({
      ok: false,
      status: 503,
      error: FUSION_FORTUNE_ERROR_CODES.FEATURE_DISABLED,
      message: "Fusion Fortune generation is not available right now.",
    });
  }

  const auth = await requireUserFromRequest(request, env, { allowDbFallback: true });
  const body = await readJson(request);
  await connectDb(env);
  const transformer = new TransformStream();
  const writer = transformer.writable.getWriter();
  const run = (async () => {
    try {
      await writeFusionFortuneSse(writer, "status", { status: "started" });
      const result = await generateFusionFortuneRequest({
        input: body,
        userId: String(auth.userId),
        requestId: body?.requestId || request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key"),
        dateKey: getFusionFortuneDateKey(),
        store: createMongoFusionFortuneStore(),
        resolvePaidAccess: buildFusionFortunePaidAccessResolver(env),
        env,
        ctx,
        abortSignal: request.signal,
        onStage: (stage) => writeFusionFortuneSse(writer, "stage", stage),
        onDelivery: (delivery) => writeFusionFortuneSse(writer, "result", delivery),
      });
      if (!result.ok) {
        await writeFusionFortuneSse(writer, "error", {
          error: result.error || FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED,
          message: result.message || "Unable to prepare the result.",
          requestId: result.requestId || "",
          // 402(결제 필요)/503(판단 보류)를 클라이언트가 구분할 수 있어야 결제 게이트를 열지,
          // 재시도를 안내할지 고를 수 있다. SSE 는 HTTP 상태를 다시 줄 수 없어 본문에 싣는다.
          status: Number(result.status || 0) || undefined,
          pricing: result.pricing || undefined,
          retryable: result.retryable === true ? true : undefined,
          retryRequestId: result.retryRequestId || undefined,
        });
        return;
      }
      await writeFusionFortuneSse(writer, "complete", {
        requestId: result.requestId,
        fusionStatus: result.fusionStatus,
      });
    } catch {
      await writeFusionFortuneSse(writer, "error", {
        error: FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED,
        message: "Unable to prepare the result.",
      }).catch(() => {});
    } finally {
      await writer.close().catch(() => {});
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
      const status = await buildFusionFortuneStatus({ userId: auth?.userId || "", store: createMongoFusionFortuneStore(), enabled: true });
      return respond({ ok: true, ...status });
    }

    if (method === "POST" && path === "/generate") {
      if (!isFusionFortuneMockFlowEnabled(env) && !isFusionFortuneRealLlmAllowed(env)) {
        return respond({ ok: false, status: 503, error: FUSION_FORTUNE_ERROR_CODES.FEATURE_DISABLED, message: "초융합 운세 생성은 아직 준비 중입니다." });
      }
      const auth = await requireUserFromRequest(request, env, { allowDbFallback: true });
      const body = await readJson(request);
      await connectDb(env);
      const result = await generateFusionFortuneRequest({
        input: body,
        userId: String(auth.userId),
        requestId: body?.requestId || request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key"),
        dateKey: getFusionFortuneDateKey(),
        store: createMongoFusionFortuneStore(),
        resolvePaidAccess: buildFusionFortunePaidAccessResolver(env),
        env,
        ctx,
      });
      return respond(result);
    }

    if (method === "POST" && path === "/generate/stream") {
      return await handleFusionFortuneStreamRoute(request, env, ctx);
    }

    if (["/status", "/generate", "/generate/stream"].includes(path)) return methodNotAllowed();
    return notFound();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "fusion-fortune", method, requestPath: new URL(request.url).pathname } });
  }
}

export const __fusionFortuneRouteTestUtils = { disabledStatus, formatFusionFortuneSseEvent };
