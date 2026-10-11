import { createHash } from "node:crypto";
import { requireUserFromRequest } from "../lib/auth.js";
import { connectDb } from "../lib/db.js";
import { createHttpError, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { enforceSensitiveEndpointSecurity } from "../lib/security/index.js";
import { verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { attendHoney, bindPromptHubPayment, honeyAttendanceStatus, spendPromptHubHoney } from "../lib/honey-wallet.js";
import { PROMPT_HUB_TOOLS, buildStructuredFortunePrompt } from "../../lib/fortune/prompt-hub-template.js";

// 꿀방울이 없을 때의 대체 결제(₩3,000). 정본 가격은 paid-feature-registry.js.
const PROMPT_HUB_GENERATE_FEATURE_KEY = "fortune-prompt-hub-generate";

const LIMITS = Object.freeze({ fields: 40, label: 40, value: 2000, facts: 20000, id: 40, requestId: 160 });
const MESSAGES = Object.freeze({
  INSUFFICIENT_HONEY_DROPS: "꿀방울이 부족해요. 오늘 출석하거나 3,000원으로 1회 생성할 수 있어요.",
  PROMPT_HUB_REQUEST_MISMATCH: "이미 다른 입력으로 만든 요청이에요. 새로 생성해 주세요.",
  PAYMENT_REQUIRED: "결제 확인이 필요해요. 결제를 마친 뒤 다시 시도해 주세요.",
  PAYMENT_VERIFY_UNAVAILABLE: "결제 확인이 지연되고 있어요. 같은 요청을 다시 확인해 주세요.",
  INVALID_PROMPT_HUB_REQUEST: "입력을 확인해 주세요.",
});
const fail = (status, code, extra = {}) => createHttpError(status, MESSAGES[code] || code, { code, ...extra });
const text = (value, max) => String(value ?? "").trim().slice(0, max);

function parseGenerateBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw fail(400, "INVALID_PROMPT_HUB_REQUEST");
  const toolId = text(body.toolId, LIMITS.id);
  if (!Object.hasOwn(PROMPT_HUB_TOOLS, toolId)) throw fail(400, "INVALID_PROMPT_HUB_REQUEST");
  const requestId = text(body.requestId, LIMITS.requestId);
  if (!/^[\w:.-]{8,160}$/.test(requestId)) throw fail(400, "INVALID_PROMPT_HUB_REQUEST");
  const rawFields = Array.isArray(body.fields) ? body.fields : [];
  if (rawFields.length > LIMITS.fields) throw fail(400, "INVALID_PROMPT_HUB_REQUEST");
  const fields = rawFields.map((field) => ({
    id: text(field?.id, LIMITS.id),
    label: text(field?.label, LIMITS.label),
    value: text(field?.value, LIMITS.value),
  })).filter((field) => field.id && field.label);
  const computedFacts = String(body.computedFacts ?? "");
  if (computedFacts.length > LIMITS.facts) throw fail(400, "INVALID_PROMPT_HUB_REQUEST");
  const horary = toolId === "horary" && body.horary && typeof body.horary === "object" ? body.horary : null;
  if (toolId === "horary" && !horary) throw fail(400, "INVALID_PROMPT_HUB_REQUEST");
  const paymentRequestId = text(body.paymentRequestId, LIMITS.requestId);
  const inputHash = createHash("sha256")
    .update(JSON.stringify({ toolId, fields, computedFacts, horary }))
    .digest("hex");
  return { toolId, requestId, fields, computedFacts, horary, paymentRequestId, inputHash, locale: text(body.locale, 10) };
}

async function assemblePrompt(env, input) {
  if (input.toolId !== "horary") return buildStructuredFortunePrompt(input.toolId, input.fields, input.computedFacts);
  // 호라리 계산은 무료 엔드포인트(/api/yeongnyangi/free/horary)와 같은 산출이다. 계산이 실패하면
  // 차감 전에 끝나도록 결제보다 먼저 부른다.
  const { prepareHoraryPrompt } = await import("../yeongnyangi/fortune/free/horary.ts");
  const result = await prepareHoraryPrompt(env, { ...input.horary, locale: input.locale });
  return result.prompt;
}

async function settle(env, userId, input) {
  if (!input.paymentRequestId) {
    const honey = await spendPromptHubHoney(env, userId, input);
    return { paidWith: "honey", replayed: honey.replayed, honey };
  }
  const pricing = FEATURE_KEY_PRICE_TABLE[PROMPT_HUB_GENERATE_FEATURE_KEY];
  const proof = await verifyPerUsePayment(env, {
    userId, featureKey: PROMPT_HUB_GENERATE_FEATURE_KEY, coinPrice: pricing.cost, requestId: input.paymentRequestId,
  });
  if (proof.proven === null) throw fail(503, "PAYMENT_VERIFY_UNAVAILABLE");
  if (proof.proven !== true) throw fail(402, "PAYMENT_REQUIRED");
  const bound = await bindPromptHubPayment(env, userId, { ...input, source: proof.source });
  return { paidWith: proof.source || "payment", replayed: bound.replayed, honey: await honeyAttendanceStatus(env, userId) };
}

export async function handlePromptHubRoutes(request, env) {
  try {
    const url = new URL(request.url), method = request.method.toUpperCase();
    const isAttendance = url.pathname.replace(/\/$/, "") === "/api/honey/attendance";
    const isGenerate = url.pathname.replace(/\/$/, "") === "/api/fortune/prompt-hub/generate";
    if (!isAttendance && !isGenerate) return notFound();
    if (isGenerate ? method !== "POST" : !["GET", "POST"].includes(method)) return methodNotAllowed();

    const auth = await requireUserFromRequest(request, env);
    if (method === "POST") {
      const security = await enforceSensitiveEndpointSecurity({
        env, request, userId: auth.userId, endpoint: isGenerate ? "prompt-hub:generate" : "honey:attendance",
        allowedMethods: ["POST"], requireJson: true, rateLimit: { limit: 20, windowSeconds: 60 },
        rateLimitKey: `${auth.userId}:prompt-hub:write`, maxPayloadBytes: 64000,
      });
      if (!security.ok) return security.response;
    }
    await connectDb(env);
    const noStore = { headers: { "Cache-Control": "no-store" } };

    if (isAttendance) {
      const state = method === "GET" ? await honeyAttendanceStatus(env, auth.userId) : await attendHoney(env, auth.userId);
      return json({ ok: true, ...state }, noStore);
    }

    const input = parseGenerateBody(await readJson(request));
    const prompt = await assemblePrompt(env, input);
    let settled;
    try {
      settled = await settle(env, auth.userId, input);
    } catch (error) {
      if (error?.payload?.code === "INSUFFICIENT_HONEY_DROPS") {
        const state = await honeyAttendanceStatus(env, auth.userId);
        throw fail(402, "INSUFFICIENT_HONEY_DROPS", {
          balance: state.balance, nextRewardIn: state.nextRewardIn, attended: state.attended,
          featureKey: PROMPT_HUB_GENERATE_FEATURE_KEY, pricing: FEATURE_KEY_PRICE_TABLE[PROMPT_HUB_GENERATE_FEATURE_KEY],
        });
      }
      if (MESSAGES[error?.payload?.code]) throw fail(error.status, error.payload.code);
      throw error;
    }
    return json({ ok: true, toolId: input.toolId, prompt, paidWith: settled.paidWith, replayed: settled.replayed, honey: settled.honey }, noStore);
  } catch (error) {
    return handleRouteError(error, { request, env });
  }
}
