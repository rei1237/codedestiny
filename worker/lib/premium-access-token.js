import { getEnv } from "./env.js";
import { signJwt, verifyJwt } from "./jwt.js";
import { normalizePaidFeatureKey } from "./paid-feature-registry.js";

const PREMIUM_ACCESS_TOKEN_TTL_SEC = 30 * 60;

function getTokenSecret(env) {
  return (
    getEnv(env, "PREMIUM_ACCESS_TOKEN_SECRET")
    || getEnv(env, "JWT_ACCESS_SECRET")
    || getEnv(env, "JWT_SECRET")
    || getEnv(env, "AUTH_SECRET")
    || "dev-secret"
  );
}

function getIssuer(env) {
  return getEnv(env, "JWT_ISSUER") || "code-destiny-api";
}

function getAudience(env) {
  return getEnv(env, "JWT_AUDIENCE") || getEnv(env, "AUTH_AUDIENCE") || "code-destiny-web";
}

export function resolvePremiumAccessReportType(featureKey = "", reason = "") {
  const key = String(featureKey || "").trim().toLowerCase();
  const canonicalKey = normalizePaidFeatureKey(featureKey);
  const why = String(reason || "").trim().toLowerCase();

  const reportTypeByFeatureKey = {
    "saju_life_book_pdf": "lifeBook",
    "saju_lifebook_pdf": "lifeBook",
    "saju_love_book_pdf": "loveSecret",
    "sajulovebookpdf": "loveSecret",
    "premium_pdf_saju_life_book": "lifeBook",
    "premium_pdf_saju_love_secret": "loveSecret",
    "premium_pdf_saju_love_secret_compat": "loveSecret",
    "premium-lifebook-report": "lifeBook",
    "premium-love-secret-solo": "loveSecret",
    "premium-love-secret-couple": "loveSecret",
    "saju_new_year_pdf": "sajuNewYear",
    "premium_pdf_saju_new_year": "sajuNewYear",
    "premium_pdf_saju_yearly": "sajuNewYear",
    "premium-saju-newyear-report": "sajuNewYear",
    "premium-saju-newyear-report-compat": "sajuNewYear",
    "premium-ziwei-report": "ziweiPremium",
    "premium-ziwei-report-compat": "ziweiPremium",
    "premium_pdf_ziwei": "ziweiPremium",
    "premium_pdf_ziwei_compat": "ziweiPremium",
    "premium-pdf-ziwei": "ziweiPremium",
    "premium-astrology-report": "westernAstrologyPremium",
    "premium-astrology-report-compat": "westernAstrologyPremium",
    "premium_pdf_western_astrology": "westernAstrologyPremium",
    "premium_pdf_western_astrology_compat": "westernAstrologyPremium",
    "premium-sukuyo-report": "sookyoPremium",
    "premium-sukuyo-report-compat": "sookyoPremium",
    "premium_pdf_sukyo": "sookyoPremium",
    "premium_pdf_sukyo_compat": "sookyoPremium",
    "premium-vedic-report": "vedicPremium",
    "premium-vedic-report-compat": "vedicPremium",
    "premium_pdf_vedic": "vedicPremium",
    "premium_pdf_vedic_compat": "vedicPremium",
    "premium_pdf_soul_origin": "soulOriginKarma",
    "premium-soul-origin-report": "soulOriginKarma",
    soulOriginKarma: "soulOriginKarma",
    soul_origin_karma: "soulOriginKarma",
    soul_origin_book: "soulOriginKarma",
    destiny_prayer_book: "soulOriginKarma",
    "premium-fpti-report": "fptiPremium",
    premium_fpti_report: "fptiPremium",
  };

  if (reportTypeByFeatureKey[canonicalKey]) {
    return reportTypeByFeatureKey[canonicalKey];
  }

  if (key === "premium-saju-newyear-report" || why.includes("신년운세")) {
    return "sajuNewYear";
  }

  return "";
}

export async function createPremiumAccessToken(env, payload = {}) {
  const userId = String(payload?.userId || "").trim();
  const reportType = String(payload?.reportType || "").trim();
  if (!userId || !reportType) return "";

  const featureKey = String(payload?.featureKey || "").trim();
  const reason = String(payload?.reason || "").trim();
  const transactionId = String(payload?.transactionId || "").trim();
  const chargedCoins = Number(payload?.chargedCoins || 0);

  return signJwt(
    {
      typ: "premium_access",
      userId,
      sub: userId,
      reportType,
      featureKey,
      reason,
      transactionId,
      chargedCoins: Number.isFinite(chargedCoins) ? chargedCoins : 0,
      freeBySubscription: payload?.freeBySubscription === true,
    },
    getTokenSecret(env),
    {
      expiresIn: `${PREMIUM_ACCESS_TOKEN_TTL_SEC}s`,
      issuer: getIssuer(env),
      audience: getAudience(env),
    },
  );
}

export async function verifyPremiumAccessToken(token, env, expected = {}) {
  const raw = String(token || "").trim();
  if (!raw) {
    return { ok: false, code: "PREMIUM_ACCESS_TOKEN_MISSING" };
  }

  try {
    const payload = await verifyJwt(raw, getTokenSecret(env), {
      issuer: getIssuer(env),
      audience: getAudience(env),
    });

    if (String(payload?.typ || "") !== "premium_access") {
      return { ok: false, code: "PREMIUM_ACCESS_TOKEN_TYPE_INVALID" };
    }

    const expectedUserId = String(expected?.userId || "").trim();
    if (expectedUserId && String(payload?.userId || payload?.sub || "") !== expectedUserId) {
      return { ok: false, code: "PREMIUM_ACCESS_TOKEN_USER_MISMATCH" };
    }

    const expectedReportType = String(expected?.reportType || "").trim();
    if (expectedReportType && String(payload?.reportType || "") !== expectedReportType) {
      return { ok: false, code: "PREMIUM_ACCESS_TOKEN_REPORTTYPE_MISMATCH" };
    }

    return { ok: true, payload };
  } catch (error) {
    return {
      ok: false,
      code: error?.name === "TokenExpiredError"
        ? "PREMIUM_ACCESS_TOKEN_EXPIRED"
        : "PREMIUM_ACCESS_TOKEN_INVALID",
    };
  }
}

export function buildPremiumAccessCookie(token, secure = true) {
  const value = encodeURIComponent(String(token || "").trim());
  const attrs = [
    "Path=/",
    `Max-Age=${PREMIUM_ACCESS_TOKEN_TTL_SEC}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) attrs.push("Secure");
  return `cd_premium_access=${value}; ${attrs.join("; ")}`;
}
