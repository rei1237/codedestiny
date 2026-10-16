import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { isDbUnavailableError, HttpError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { hasLegacyBundlePurchase, readAccountLegacyUnlock, readProfileBirthUnlock } from "../lib/paid-content-read-access.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { SAJU_SECTION_FEATURE_KEYS, SajuSectionInputError, buildSajuSectionHtml } from "../lib/saju-section/report.js";

const degraded = () => json({
  ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true,
  message: "구매 권한을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
}, { status: 503 });

// 묶음·옛 상품으로 산 사람도 이 카드를 연다 — /api/fortune/balance 가 화면 해금에 쓰는 별칭
// (worker/routes/fortune.js PERSISTENT_UNLOCK_ALIAS_MAP)을 거꾸로 읽은 것이다.
// 출생 기반 별칭은 같은 출생 정보(또는 옛 계정 단위 행)로만, 옛 묶음 키는 계정 단위 구매 기록으로 인정한다.
const BIRTH_ALIAS_KEYS = Object.freeze({ rpt_energyCoordCard: ["travelDestiny"], rpt_healthReportCard: ["healthReport"] });
const BUNDLE_ALIAS_KEYS = Object.freeze({ rpt_energyCoordCard: ["allPaidSaju"], rpt_healthReportCard: ["allPaidSaju"] });

function bodyBirth(body) {
  const birth = body?.birth && typeof body.birth === "object" ? body.birth : {};
  return {
    calendarDate: String(birth.date || ""), calType: birth.calType, timeKnown: birth.timeKnown !== false,
    hour: birth.hour, minute: birth.minute,
  };
}

// 사주 종합(section_summary)·대운 풀이(section_daewun)·퀀텀 명리 엔진(rpt_quantumCard)·극T 관계 회로(sukuyo-extreme-t-relationship)·
// 숙요 인연 도감(sukuyo-relationship-encyclopedia)·에너지 원정 리포트(rpt_energyCoordCard)
// ·요주의 빌런 블랙리스트(rpt_villainCard)·명리 헬스 리포트(rpt_healthReportCard)
// 본문 읽기. 결제·해금 쓰기는 하지 않는다.
// 저장 프로필이 있으면 그 카드의 출생 정보로만 계산하고, 없으면 계정 단위 옛 해금(USER 행)만 인정한다.
export async function handleSajuSection(request, env = {}) {
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
      ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 풀이를 확인해 주세요.",
    }, { status: 401 });

    const body = await readJson(request);
    const featureKey = String(body?.featureKey || "");
    if (!SAJU_SECTION_FEATURE_KEYS.includes(featureKey)) return json({
      ok: false, code: "SAJU_INVALID_FEATURE", message: "지원하지 않는 항목입니다.",
    }, { status: 400 });

    const profileId = String(body?.profileId || "").trim();
    const readBirth = (key) => (profileId
      ? readProfileBirthUnlock(env, { userId: auth.userId, profileId, featureKey: key })
      : readAccountLegacyUnlock(env, { userId: auth.userId, featureKey: key }));
    let access;
    try {
      access = await readBirth(featureKey);
      for (const alias of BIRTH_ALIAS_KEYS[featureKey] || []) {
        if (!access.ok || access.unlocked) break;
        const viaAlias = await readBirth(alias);
        if (viaAlias.ok && viaAlias.unlocked) access = viaAlias;
      }
      const bundleKeys = BUNDLE_ALIAS_KEYS[featureKey] || [];
      if (access.ok && !access.unlocked && bundleKeys.length && await hasLegacyBundlePurchase(env, { userId: auth.userId, bundleKeys })) {
        access = { ...access, unlocked: true };
      }
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
    if (profileId && !access.birth) return json({
      ok: false, code: "SAJU_INVALID_BIRTH", message: "프로필의 출생 정보를 확인해 주세요.",
    }, { status: 400 });

    // 🔴 프로필 해금은 그 카드의 출생 정보 단위다 — 본문 생년월일·성별은 무시한다.
    //    출생지·종격 검증 답·화면 모드는 신원(birthKey)에 들어가지 않으므로 요청 값을 쓴다.
    const birth = profileId
      ? { calendarDate: access.birth.calendarDate, calType: access.birth.calType, timeKnown: access.birth.timeKnown, hour: access.birth.hour, minute: access.birth.minute }
      : bodyBirth(body);
    const gender = profileId ? access.card?.gender : body?.gender;
    const result = buildSajuSectionHtml({
      featureKey, birth, gender: gender === "M" ? "M" : "F",
      name: body?.name, mode: body?.mode === "neo" ? "neo" : "pig", lang: typeof body?.lang === "string" ? body.lang.slice(0, 8) : "ko",
      place: body?.place, jongDecision: body?.jongDecision, daewun: body?.daewun, encyclopedia: body?.encyclopedia, energy: body?.energy,
    });
    return json({ ok: true, unlocked: true, featureKey, ...result });
  } catch (error) {
    if (error instanceof SajuSectionInputError) return json({ ok: false, code: error.code, message: error.message }, { status: 400 });
    if (error instanceof HttpError) return json({ ok: false, code: error.payload?.code || "BAD_REQUEST", message: error.message }, { status: error.status });
    console.error("[saju-section] render failed", error?.message || error);
    return json({ ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true, message: "풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
}
