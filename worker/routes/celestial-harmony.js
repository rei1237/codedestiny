import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, cookieValue } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildCelestialMelodyReading,
  persistCelestialSession,
  restorePaidCelestialSession,
  sanitizeCelestialMelodyText,
} from "../../lib/tarot/celestial-melody-reading.mjs";

const SESSION_CACHE = new Map();
const CELESTIAL_FEATURE_KEY = "tarot-celestial-harmony";

function text(value) {
  return String(value || "").trim();
}

function cacheSet(key, value) {
  const token = text(key);
  if (!token || !value) return;
  SESSION_CACHE.set(token, { value, savedAt: Date.now() });
}

function cacheGet(key) {
  const token = text(key);
  if (!token) return null;
  const hit = SESSION_CACHE.get(token);
  if (!hit) return null;
  if (Date.now() - Number(hit.savedAt || 0) > 1000 * 60 * 60 * 12) {
    SESSION_CACHE.delete(token);
    return null;
  }
  return hit.value;
}

function extractPaymentEvidence(body = {}) {
  const payload = body && typeof body === "object" ? body : {};
  const accessGrant = payload.accessGrant && typeof payload.accessGrant === "object" ? payload.accessGrant : {};
  const consume = payload.consume && typeof payload.consume === "object" ? payload.consume : {};
  const payment = payload.payment && typeof payload.payment === "object" ? payload.payment : {};

  return {
    accessGrant,
    consume,
    payment,
    reportId: text(payload.reportId || accessGrant.reportId || payment.reportId),
    transactionId: text(
      payload.transactionId
      || payload.purchaseId
      || accessGrant.purchaseId
      || consume.transactionId
      || payment.transactionId,
    ),
  };
}

async function verifyCelestialAccess({ request, env, auth, body, reportId = "", transactionId = "", premiumAccessToken = "" }) {
  const evidence = extractPaymentEvidence(body);
  const accessPayload = {
    ...(body && typeof body === "object" ? body : {}),
    featureKey: CELESTIAL_FEATURE_KEY,
    reportType: "celestialHarmony",
    reportId: text(reportId || evidence.reportId),
    transactionId: text(transactionId || evidence.transactionId),
    purchaseId: text((body && body.purchaseId) || evidence.accessGrant.purchaseId || evidence.consume.transactionId),
    sessionId: text((body && body.sessionId) || (body && body.reportSessionId) || evidence.accessGrant.sessionId),
    reportSessionId: text((body && body.reportSessionId) || evidence.accessGrant.sessionId),
    accessGrant: evidence.accessGrant,
    consume: evidence.consume,
    payment: {
      ...evidence.payment,
      featureKey: text(evidence.payment.featureKey || CELESTIAL_FEATURE_KEY),
      reportId: text(evidence.payment.reportId || reportId || evidence.reportId),
      transactionId: text(evidence.payment.transactionId || transactionId || evidence.transactionId),
    },
    premiumAccessToken: text(
      premiumAccessToken
      || (body && (body.premiumAccessToken || body._premiumAccessToken))
      || cookieValue(request, "cd_premium_access")
      || "",
    ) || undefined,
    _accessRoute: "/api/celestial-harmony",
  };

  return requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "celestialHarmony", accessPayload);
}

async function enrichFinalOracle(env, reading) {
  const modelPrompt = [
    "당신은 프리미엄 타로 상담가입니다.",
    "아래 요약을 바탕으로 한국어 최종 오라클 메시지 3~4문장만 생성하세요.",
    "진단/단정 금지, 상징 기반의 자기성찰 문체 유지.",
    `dominantLayer=${reading?.summary?.dominantLayer || ""}`,
    `strongestPlanetSignal=${reading?.summary?.strongestPlanetSignal || ""}`,
    `deepestShadow=${reading?.summary?.deepestShadow || ""}`,
    `soulLesson=${reading?.summary?.soulLesson || ""}`,
    `integrationPath=${reading?.summary?.integrationPath || ""}`,
  ].join("\n");

  const ai = await callGeminiText(env, modelPrompt, {
    modelEnvKeys: ["CELESTIAL_HARMONY_GEMINI_MODEL"],
    temperature: 0.65,
    maxOutputTokens: 420,
    timeoutMs: Number(env.CELESTIAL_HARMONY_PROVIDER_TIMEOUT_MS || 12000),
  });

  if (!ai.ok) return { used: false, message: ai.message || "" };
  const finalOracle = sanitizeCelestialMelodyText(ai.text);
  if (!finalOracle) return { used: false, message: "" };

  return { used: true, finalOracle };
}

async function handleGenerate(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, code: "UNAUTHORIZED", message: "로그인 후 천체의 선율 타로를 이용해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  const cards = Array.isArray(body?.cards) ? body.cards : [];
  const paymentEvidence = extractPaymentEvidence(body);
  const reportId = paymentEvidence.reportId;
  const transactionId = paymentEvidence.transactionId;
  const restoredFromPaidSession = Boolean(body?.restoredFromPaidSession || body?.payment?.restoredFromPaidSession);
  const premiumAccessToken = text(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || "",
  );

  const access = await verifyCelestialAccess({
    request,
    env,
    auth,
    body,
    reportId,
    transactionId,
    premiumAccessToken,
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return json({
      ok: false,
      code: access?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED"),
      message: status === 401
        ? "로그인 후 천체의 선율 타로를 이용해 주세요."
        : "결제 확인이 필요합니다. 메인 화면에서 100코인 결제를 먼저 진행해 주세요.",
    }, { status });
  }

  if (!cards.length) {
    const restored = restorePaidCelestialSession(reportId || transactionId);
    if (restored) {
      return json({ ok: true, source: "restored", result: restored });
    }
    return json({ ok: false, message: "카드 데이터가 필요합니다." }, { status: 400 });
  }

  const local = buildCelestialMelodyReading({
    cards,
    payment: {
      coinCharged: Boolean(body?.coinCharged !== false || access?.accessType),
      transactionId,
      reportId,
      restoredFromPaidSession,
      accessType: text(access?.accessType),
      apiUsed: false,
    },
    version: "20260530-worker-v2",
  });

  const reading = local.reading;
  const ai = await enrichFinalOracle(env, reading);
  if (ai.used && ai.finalOracle) {
    reading.summary.finalOracle = ai.finalOracle;
    reading.meta.apiUsed = true;
  }

  if (reportId) cacheSet(`report:${reportId}`, reading);
  if (transactionId) cacheSet(`tx:${transactionId}`, reading);

  // Browser local restore helper (no-op on worker runtime).
  persistCelestialSession(reading);

  return json({
    ok: true,
    source: ai.used ? "local+gemini" : "local",
    quality: local.quality,
    result: reading,
  });
}

async function handleRestore(request, env) {
  const url = new URL(request.url);
  const reportId = text(url.searchParams.get("reportId"));
  const transactionId = text(url.searchParams.get("transactionId"));

  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, code: "UNAUTHORIZED", message: "로그인 후 결과 복구가 가능합니다." }, { status: 401 });
    }
    throw error;
  }

  const access = await verifyCelestialAccess({ request, env, auth, body: { reportId, transactionId }, reportId, transactionId });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return json({
      ok: false,
      code: access?.code || "PAYMENT_REQUIRED",
      message: status === 401
        ? "로그인 후 결과 복구가 가능합니다."
        : "결제 확인 후 결과 복구가 가능합니다.",
    }, { status });
  }

  const byReport = reportId ? cacheGet(`report:${reportId}`) : null;
  const byTx = !byReport && transactionId ? cacheGet(`tx:${transactionId}`) : null;
  const restored = byReport || byTx || restorePaidCelestialSession(reportId || transactionId);

  if (!restored) {
    return json({ ok: false, code: "REPORT_NOT_FOUND", message: "복구 가능한 리딩이 없습니다." }, { status: 404 });
  }

  return json({ ok: true, source: "restore", result: restored });
}

export async function handleCelestialHarmonyRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (!["GET", "POST"].includes(method)) return methodNotAllowed();

    const path = getRoutePath(request, "/api/celestial-harmony");
    if (path !== "/") return notFound();

    if (method === "GET") return await handleRestore(request, env);
    return await handleGenerate(request, env);
  } catch (error) {
    return handleRouteError(error);
  }
}
