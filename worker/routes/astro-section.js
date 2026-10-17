import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { isDbUnavailableError, HttpError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { readAccountLegacyUnlock, readProfileBirthUnlock } from "../lib/paid-content-read-access.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { validateBasicDeepInput } from "../lib/astro-basic-deep-report.js";
import { ASTRO_SECTION_FEATURE_KEYS, buildAstroSectionHtml } from "../lib/astro-section/report.js";
import { ASTRO_YEARLY_TRANSIT_KEY, buildAstroYearlyHtml } from "../lib/astro-section/yearly.js";
import { calculateBasicAstrologyChart, normalizeBasicAstrologyInput } from "./astro.js";

const degraded = () => json({
  ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true,
  message: "구매 권한을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
}, { status: 503 });

// 점성술 상담 유료 본문(커리어·재능·관계·과제 심화 분석) 읽기. 결제·해금 쓰기는 하지 않는다.
// 저장 프로필이 있으면 그 카드의 출생 정보로만 계산하고, 없으면 계정 단위 옛 해금(USER 행)만 인정한다.
// 차트는 요청의 차트 값이 아니라 서버 Swiss 계산으로만 만든다.
export async function handleAstroSection(request, env = {}) {
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
      ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 심화 분석을 확인해 주세요.",
    }, { status: 401 });

    const body = await readJson(request);
    const featureKey = String(body?.featureKey || "");
    const yearly = featureKey === ASTRO_YEARLY_TRANSIT_KEY;
    if (!yearly && !ASTRO_SECTION_FEATURE_KEYS.includes(featureKey)) return json({
      ok: false, code: "ASTRO_INVALID_FEATURE", message: "지원하지 않는 항목입니다.",
    }, { status: 400 });

    const profileId = String(body?.profileId || "").trim();
    let access;
    try {
      access = profileId
        ? await readProfileBirthUnlock(env, { userId: auth.userId, profileId, featureKey })
        : await readAccountLegacyUnlock(env, { userId: auth.userId, featureKey });
    } catch {
      return degraded();
    }
    if (!access.ok) {
      const missing = access.reason === "MISSING_PROFILE_ID";
      return json({
        ok: false, reason: access.reason, code: access.reason, featureKey, requiresProfile: true,
        message: missing ? "프로필을 저장한 뒤 구매해 주세요." : "저장된 내 프로필을 선택해 주세요.",
      }, { status: missing ? 400 : 403 });
    }
    if (!access.unlocked) {
      const { pricing } = getBillingFeaturePricing({ featureKey });
      return json({
        ok: false, reason: "PAYMENT_REQUIRED", featureKey, requiresProfile: !profileId,
        message: profileId ? "이 생년월일은 별도 구매가 필요합니다." : "프로필을 저장하면 이 생년월일로 구매할 수 있어요.",
        amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice,
      }, { status: 402 });
    }
    if (profileId && !access.birth) throw new HttpError(400, "프로필의 출생 정보를 확인해 주세요.", { code: "ASTRO_INVALID_BIRTH_INPUT" });

    // 🔴 프로필 해금은 그 카드의 출생 정보 단위다 — 본문 생년월일·시각은 무시한다.
    //    출생지·시간대는 신원(birthKey)에 들어가지 않으므로 요청 값을 쓴다.
    const source = body && typeof body === "object" ? body : {};
    const input = validateBasicDeepInput(profileId
      ? { ...source, date: access.birth.date, time: access.birth.time, timeKnown: access.birth.timeKnown }
      : source);
    const normalized = normalizeBasicAstrologyInput(input);
    if (!normalized.ok) throw new HttpError(400, "출생 정보와 시간대를 확인해 주세요.", { code: "ASTRO_INVALID_BIRTH_INPUT" });
    const chart = await calculateBasicAstrologyChart(normalized.value, request, env);
    const lang = typeof body?.lang === "string" ? body.lang.slice(0, 8) : "ko";
    // 12개월 흐름: 오늘은 서버 시계 + 화면 기기 시간대(transitTz, 시간 단위)로만 정한다. 범위 밖이면 한국 시간.
    const transitTz = Number(body?.transitTz);
    const { html } = yearly
      ? await buildAstroYearlyHtml({ env, request, chart, input, tz: Number.isFinite(transitTz) && transitTz >= -14 && transitTz <= 14 ? transitTz : 9 })
      : buildAstroSectionHtml({ featureKey, chart, lang });
    return json({ ok: true, unlocked: true, featureKey, html });
  } catch (error) {
    if (error instanceof HttpError) return json({
      ok: false, code: error.payload?.code || "BAD_REQUEST", message: error.message,
    }, { status: error.status });
    console.error("[astro-section] render failed", error?.message || error);
    return json({
      ok: false, reason: "REPORT_UNAVAILABLE", retryable: true,
      message: "심화 분석을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }
}
