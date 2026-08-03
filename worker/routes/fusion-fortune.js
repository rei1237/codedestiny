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
  isFusionFortuneUiEnabled,
  FUSION_FORTUNE_ERROR_CODES,
} from "../lib/fusion-fortune.js";

function respond(payload) {
  const { status = 200, ...body } = payload || {};
  return json(body, { status });
}

function disabledStatus() {
  return respond({
    ok: true,
    isLoggedIn: false,
    ticket: { remaining: 0, canUse: false },
    dailyLimit: { dateKey: getFusionFortuneDateKey(), limit: 100, usedCount: 0, remainingCount: 0, isSoldOut: false },
    canGenerate: false,
    nextAction: "disabled",
    message: "초융합 운세는 준비 중입니다.",
  });
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
      if (!isFusionFortuneMockFlowEnabled(env)) {
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
        // Feature flag가 켜져도 이 엔드포인트는 mock만 사용한다. 실제 제공자 호출은 별도 서버 전용 구현과 명시 승인 후 추가한다.
        ctx,
      });
      return respond(result);
    }

    if (["/status", "/generate"].includes(path)) return methodNotAllowed();
    return notFound();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "fusion-fortune", method, requestPath: new URL(request.url).pathname } });
  }
}

export const __fusionFortuneRouteTestUtils = { disabledStatus };
