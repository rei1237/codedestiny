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
import {
  getFusionFortuneConsultation,
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
 * 보관본 조회. 인자가 없으면 최근 목록, `?id=` 면 단건.
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
  const id = new URL(request.url).searchParams.get("id") || "";

  if (!id) {
    const consultations = await listFusionFortuneConsultations({ userId });
    return respond({
      ok: true,
      consultations: consultations.map((item) => ({
        id: item.id,
        title: item.title || "초융합 운세",
        topic: item.inputSummary?.topic || "",
        nickname: item.inputSummary?.nickname || "",
        createdAt: item.createdAt,
      })),
    });
  }

  const consultation = await getFusionFortuneConsultation({ userId, id });
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
      createdAt: consultation.createdAt,
    },
  });
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
        });
        return;
      }
      await writeFusionFortuneSse(writer, "complete", {
        requestId: result.requestId,
        fusionStatus: result.fusionStatus,
        // 클라이언트가 ?cid= 딥링크를 남기는 데 쓴다. 저장이 실패했으면 빈 문자열이다.
        consultationId,
      });
    } catch {
      await writeFusionFortuneSse(writer, "error", {
        error: FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED,
        message: "결과를 준비하지 못했어요. 같은 요청으로 다시 시도하면 추가 결제는 없습니다.",
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
      if (result?.ok) {
        const consultationId = await persistFusionDelivery({
          userId: String(auth.userId),
          input: body,
          delivery: { requestId: result.requestId, result: result.result, generationSource: result.generationSource },
        });
        return respond({ ...result, consultationId });
      }
      return respond(result);
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
