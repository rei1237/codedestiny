import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { isDbUnavailableError, HttpError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { hasPurchasedAccountContentAccess } from "../lib/paid-content-read-access.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { buildBasicDeepReport, toNatalReadingChart, validateBasicDeepInput } from "../lib/astro-basic-deep-report.js";
import { calculateBasicAstrologyChart, normalizeBasicAstrologyInput } from "./astro.js";

const FEATURE_KEY = "astro_basic_deep_pack";
const degraded = () => json({
  ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true,
  message: "구매 권한을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
}, { status: 503 });

// POST는 출생 정보가 URL/공유 캐시에 남지 않게 하는 읽기 요청이다. 결제·해금 쓰기는 하지 않는다.
export async function handleAstroBasicDeep(request, env = {}) {
  if (request.method !== "POST") return methodNotAllowed();
  try {
    let auth;
    try {
      auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
    } catch (error) {
      if (isAuthDbInfraError(error) || isDbUnavailableError(error)) return degraded();
      throw error;
    }
    if (!auth?.userId) return json({
      ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 상세 해석을 확인해 주세요.",
    }, { status: 401 });

    let unlocked;
    try {
      unlocked = await hasPurchasedAccountContentAccess(env, { userId: auth.userId, featureKey: FEATURE_KEY });
    } catch {
      return degraded();
    }
    if (!unlocked) {
      const { pricing } = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
      return json({
        ok: false, reason: "PAYMENT_REQUIRED", featureKey: FEATURE_KEY,
        message: "이용권·월정석·단건 결제로 해금한 뒤 상세 해석을 확인해 주세요.",
        amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice,
      }, { status: 402 });
    }

    const input = validateBasicDeepInput(await readJson(request));
    const normalized = normalizeBasicAstrologyInput(input);
    if (!normalized.ok) throw new HttpError(400, "출생 정보와 시간대를 확인해 주세요.", { code: "ASTRO_INVALID_BIRTH_INPUT" });
    const chart = await calculateBasicAstrologyChart(normalized.value, request, env);
    let moonDay = null;
    if (!input.timeKnown) {
      // 시각 미상일에는 정오 차트를 쓰고 달의 별자리 변화 가능성도 기존 해석에 전달한다.
      const endpoints = await Promise.all(["00:00", "23:59"].map(async (time) => {
        const value = normalizeBasicAstrologyInput({ ...input, time }).value;
        return toNatalReadingChart(await calculateBasicAstrologyChart(value, request, env), false).moon.idx;
      }));
      moonDay = endpoints;
    }
    const asOf = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = buildBasicDeepReport(chart, input, { today: asOf, moonDay });
    return json({ ok: true, unlocked: true, featureKey: FEATURE_KEY, asOf, ...result });
  } catch (error) {
    if (error instanceof HttpError) return json({
      ok: false, code: error.payload?.code || "BAD_REQUEST", message: error.message,
    }, { status: error.status });
    return json({
      ok: false, reason: "REPORT_UNAVAILABLE", retryable: true,
      message: "상세 해석을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }
}
