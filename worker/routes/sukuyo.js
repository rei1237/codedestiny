import { Solar } from "lunar-javascript";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import {
  SUKYO_PDF_ALIAS_FEATURE_KEY,
  SUKYO_PDF_CHAPTER_COUNT,
  SUKYO_PDF_CHAPTERS,
  SUKYO_PDF_FEATURE_KEY,
  buildSukyoPdfSeed,
  generateSukyoPremiumReport,
} from "../lib/sukyo-pdf.js";
import { buildCanonicalSukuyoCompatibility, buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function toNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseDateParts(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = toNumber(match[1]);
  const month = toNumber(match[2]);
  const day = toNumber(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseTimeParts(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return { hour: 12, minute: 0, hasTime: false };
  const hour = Math.max(0, Math.min(23, toNumber(match[1], 12)));
  const minute = Math.max(0, Math.min(59, toNumber(match[2], 0)));
  return { hour, minute, hasTime: true };
}

function normalizeProfile(raw = {}, fallbackName = "사용자") {
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : raw;
  const parts = parseDateParts(profile.birthDate || raw.birthDate || profile.date);
  const time = parseTimeParts(profile.birthTime || raw.birthTime || profile.time);
  return {
    name: clean(profile.name || raw.name) || fallbackName,
    gender: clean(profile.gender || raw.gender),
    birthDate: clean(profile.birthDate || raw.birthDate || profile.date),
    birthTime: time.hasTime ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}` : "",
    calendarType: clean(profile.calendarType || raw.calendarType || profile.calType || "solar") || "solar",
    year: parts?.year,
    month: parts?.month,
    day: parts?.day,
    hour: time.hour,
    minute: time.minute,
  };
}

function toLunarBirth(profile) {
  if (!Number.isFinite(profile.year) || !Number.isFinite(profile.month) || !Number.isFinite(profile.day)) {
    throw Object.assign(new Error("본인과 상대방의 생년월일 정보를 확인해 주세요."), { status: 400, code: "SUKUYO_MISSING_BIRTH" });
  }
  const calendarType = clean(profile.calendarType).toLowerCase();
  if (calendarType.includes("lunar")) {
    return {
      lunarYear: profile.year,
      lunarMonth: profile.month,
      lunarDay: profile.day,
      isLeapMonth: calendarType.includes("leap") || calendarType.includes("윤"),
      source: "user-lunar-input",
    };
  }
  const solar = Solar.fromYmdHms(profile.year, profile.month, profile.day, profile.hour || 12, profile.minute || 0, 0);
  const lunar = solar.getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return {
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  };
}

function buildPersonSukuyo(profile) {
  const lunar = toLunarBirth(profile);
  const sukuyo = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, {
    isLeapMonth: lunar.isLeapMonth,
    source: lunar.source,
  });
  if (!sukuyo) {
    throw Object.assign(new Error("숙요점 관계 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요."), { status: 422, code: "SUKUYO_CALC_FAILED" });
  }
  return { ...sukuyo, lunarYear: lunar.lunarYear };
}

function readPremiumAccessToken(request, body = {}) {
  const headerToken = clean(request.headers.get("x-premium-access-token"));
  if (headerToken) return headerToken;
  return clean(body?.premiumAccessToken || body?._premiumAccessToken || body?.accessToken);
}

function buildSukuyoSeedFromBody(body = {}) {
  const user = normalizeProfile(body.user || body.userProfile || {}, "사용자");
  const partner = normalizeProfile(body.partner || body.partnerProfile || {}, "상대방");
  const personASukuyo = buildPersonSukuyo(user);
  const personBSukuyo = buildPersonSukuyo(partner);
  const canonical = buildCanonicalSukuyoCompatibility({
    reportType: "compatibility",
    personAName: user.name,
    personBName: partner.name,
    personAInput: user,
    personBInput: partner,
    personASukuyo,
    personBSukuyo,
    calendarSource: "lunar-javascript",
    methodVersion: "sukyo-premium-compat-15-v1",
  });

  if (!canonical?.validation?.hasPersonAHost || !canonical?.validation?.hasPersonBHost || !canonical?.validation?.hasRelationType) {
    throw Object.assign(new Error("숙요점 관계 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요."), {
      status: 422,
      code: "SUKUYO_PDF_MISSING_FIELDS",
      missing: canonical?.validation?.missingFields || [],
    });
  }

  return buildSukyoPdfSeed({
    mode: "compatibility",
    userProfile: user,
    partnerProfile: partner,
    userSukyo: canonical.personA?.sukuyo,
    partnerSukyo: canonical.personB?.sukuyo,
    canonical,
  });
}

async function handleSukuyoPremiumPrepare(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const premiumAccessToken = readPremiumAccessToken(request, body);
  const featureKey = clean(body?.featureKey) || SUKYO_PDF_FEATURE_KEY;

  if (!body?.user && !body?.userProfile) {
    return json({ ok: false, code: "SUKUYO_MISSING_USER", message: "숙요점 PDF 생성을 위해 본인 생년월일 정보를 확인해 주세요." }, { status: 400 });
  }
  if (!body?.partner && !body?.partnerProfile) {
    return json({ ok: false, code: "SUKUYO_MISSING_PARTNER", message: "숙요점 궁합 PDF는 상대방 생년월일 정보가 필요합니다." }, { status: 400 });
  }

  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "sookyoPremium", {
    reportType: "sookyoPremium",
    mode: "compatibility",
    reportMode: "compatibility",
    featureKey,
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/sukuyo/premium/prepare",
  });

  if (!access?.ok) {
    return json({
      ok: false,
      code: access?.code || "SUKUYO_PAYMENT_REQUIRED",
      message: access?.message || "프리미엄 궁합 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다.",
    }, { status: Number(access?.status) || 403 });
  }

  const seed = buildSukuyoSeedFromBody(body);
  const generated = await generateSukyoPremiumReport(env, seed);
  const reportId = `sukyo-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return json({
    ok: true,
    reportType: "sookyoPremium",
    mode: "compatibility",
    featureKey,
    canonicalFeatureKey: SUKYO_PDF_FEATURE_KEY,
    aliasFeatureKey: SUKYO_PDF_ALIAS_FEATURE_KEY,
    chapterCount: generated.chapterCount,
    fallbackUsed: Boolean(generated.fallbackUsed),
    reportId,
    chapters: generated.chapters,
    payload: generated.payload,
    pdfReady: generated.pdfReady,
  });
}

export async function handleSukuyoRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/sukuyo");

    if (path === "/premium/chapters") {
      if (method !== "GET") return methodNotAllowed();
      return json({
        ok: true,
        reportType: "sookyoPremium",
        mode: "compatibility",
        featureKey: SUKYO_PDF_FEATURE_KEY,
        aliasFeatureKey: SUKYO_PDF_ALIAS_FEATURE_KEY,
        chapterCount: SUKYO_PDF_CHAPTER_COUNT,
        chapters: SUKYO_PDF_CHAPTERS,
      });
    }

    if (path === "/premium/prepare") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoPremiumPrepare(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    const status = Number(error?.status) || 0;
    if (status >= 400 && status < 500) {
      return json({
        ok: false,
        code: clean(error?.code) || "SUKUYO_REQUEST_FAILED",
        message: clean(error?.message) || "숙요점 PDF 요청을 처리하지 못했습니다.",
        missing: Array.isArray(error?.missing) ? error.missing : undefined,
      }, { status });
    }
    return handleRouteError(error);
  }
}