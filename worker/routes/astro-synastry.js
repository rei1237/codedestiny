import { createHash } from "node:crypto";
import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { isDbUnavailableError, HttpError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { readProfileBirthUnlock } from "../lib/paid-content-read-access.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { claimRequestBillingEvidence, evidenceClaimErrorBody } from "../lib/billing-evidence-claim.js";
import {
  ASTRO_CELEB_SYNASTRY_FEATURE_KEY, ASTRO_DIRECT_SYNASTRY_FEATURE_KEY, buildAstroCelebSynastry, buildAstroDirectSynastry, findAstroSynastryCeleb,
} from "../lib/astro-section/synastry.js";
import { calculateBasicAstrologyChart } from "./astro.js";

const degraded = () => json({
  ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true,
  message: "구매 권한을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
}, { status: 503 });

const unavailable = () => json({
  ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true, message: "궁합을 계산하지 못했어요. 잠시 후 다시 시도해 주세요.",
}, { status: 503 });

const badInput = (code, message) => json({ ok: false, code, message }, { status: 400 });

// 화면의 _seNewCompatArchiveRequestId 와 같은 모양만 받는다: compat-archive:<기능>:<꼬리>.
const TAIL_PATTERN = /^[a-z0-9]{6,40}$/;
function synastryRequestId(featureKey, raw) {
  const requestId = typeof raw === "string" ? raw.trim() : "";
  const prefix = `compat-archive:${featureKey}:`;
  return requestId.startsWith(prefix) && TAIL_PATTERN.test(requestId.slice(prefix.length)) ? requestId : null;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// 시각 입력(type=time)은 초가 붙어 올 수 있다 — 화면도 시·분만 썼다.
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
function parseDate(value) {
  const m = DATE_PATTERN.exec(String(value || "").trim());
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (year < 1000 || year > 2400 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}
function parseTime(value) {
  const m = TIME_PATTERN.exec(String(value || "").trim());
  if (!m) return null;
  const [hour, minute] = [Number(m[1]), Number(m[2])];
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}
function finiteIn(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
const two = (n) => String(n).padStart(2, "0");

// 내 출생 순간. 저장 카드가 있으면 그 카드의 (양력) 날짜·시각, 없으면 요청 값. 출생지·시간대는 요청 값이다
// (화면도 window._astroBirth 의 좌표·시간대로 계산한다). 시각 모름은 화면과 같이 12:00 이다.
async function resolveMyMoment(env, userId, featureKey, body) {
  const timezone = finiteIn(body?.timezone, -14, 14);
  const lat = finiteIn(body?.latitude, -90, 90);
  const lon = finiteIn(body?.longitude, -180, 180);
  if (timezone === null || lat === null || lon === null) return { error: badInput("ASTRO_INVALID_BIRTH_INPUT", "출생지와 시간대를 확인해 주세요.") };
  const profileId = String(body?.profileId || "").trim().slice(0, 80);
  let date = parseDate(body?.date);
  let time = body?.timeKnown === false ? { hour: 12, minute: 0 } : parseTime(body?.time);
  if (profileId) {
    let card;
    try {
      card = await readProfileBirthUnlock(env, { userId, profileId, featureKey });
    } catch {
      return { error: degraded() };
    }
    if (card?.ok && card.birth) {
      date = { year: card.birth.year, month: card.birth.month, day: card.birth.day };
      time = { hour: card.birth.hour, minute: card.birth.minute };
    }
  }
  if (!date || !time) return { error: badInput("ASTRO_INVALID_BIRTH_INPUT", "출생 정보를 확인해 주세요.") };
  return { profileId, moment: { ...date, ...time, timezone, lat, lon } };
}

function directPartner(body) {
  const raw = body?.partner && typeof body.partner === "object" ? body.partner : {};
  const date = parseDate(raw.date);
  const time = parseTime(raw.time || "12:00");
  const tz = finiteIn(raw.tzOffsetHours, -14, 14);
  const lat = finiteIn(raw.latitude, -90, 90);
  const lon = finiteIn(raw.longitude, -180, 180);
  if (!date || !time || tz === null || lat === null || lon === null) return null;
  const name = String(raw.name == null ? "" : raw.name).trim().slice(0, 60) || "상대방";
  const gender = raw.gender === "M" || raw.gender === "F" ? raw.gender : "OTHER";
  return {
    name, gender, tzOffsetHours: tz, latitude: lat, longitude: lon,
    date: `${date.year}-${two(date.month)}-${two(date.day)}`, time: `${two(time.hour)}:${two(time.minute)}`,
    cityLabel: String(raw.cityLabel == null ? "" : raw.cityLabel).slice(0, 80),
    moment: { ...date, ...time, timezone: tz, lat, lon },
  };
}

// ── 점성술 시나스트리 궁합(유명인 compat-astro-synastry · 직접 입력 compat-astro-direct-synastry) — 회당 결제 50코인 ──
// 게이트가 결제에 쓴 requestId 로 그 결제를 정본 verifyPerUsePayment 로 찾고, 찾은 증빙을 (requestId, 두 사람의 출생 입력)에
// claim 한다 — 같은 결제로 상대만 바꿔 다른 궁합을 여는 재생은 409, 같은 조합 재요청(새로고침·보관함 재개)은 다시 준다.
// 두 차트는 요청의 차트 값이 아니라 서버 Swiss 계산으로만 만들고, 결제를 쓰기 전에 먼저 그린다(계산 실패는 차감 없이 503).
// 🔴 DB 판단 보류·claim 저장소 장애는 503 이다 — 결제한 사람에게 402/409 를 주지 않는다.
export async function handleAstroSynastry(request, env = {}) {
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
      ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 궁합을 확인해 주세요.",
    }, { status: 401 });
    const userId = auth.userId;

    const body = await readJson(request);
    const featureKey = String(body?.featureKey || "");
    if (featureKey !== ASTRO_CELEB_SYNASTRY_FEATURE_KEY && featureKey !== ASTRO_DIRECT_SYNASTRY_FEATURE_KEY) return badInput("ASTRO_INVALID_FEATURE", "지원하지 않는 항목입니다.");
    const requestId = synastryRequestId(featureKey, body?.requestId);
    if (!requestId) return badInput("REQUEST_ID_INVALID", "결제 요청 번호가 이 궁합의 결제가 아닙니다.");

    const mine = await resolveMyMoment(env, userId, featureKey, body);
    if (mine.error) return mine.error;
    const lang = typeof body?.lang === "string" ? body.lang.slice(0, 8) : "ko";
    const isCeleb = featureKey === ASTRO_CELEB_SYNASTRY_FEATURE_KEY;

    let celeb = null;
    let partner = null;
    if (isCeleb) {
      const raw = body?.celeb && typeof body.celeb === "object" ? body.celeb : {};
      celeb = findAstroSynastryCeleb({ name: raw.name, birth: raw.birth, lang });
      if (!celeb) return badInput("ASTRO_CELEB_UNKNOWN", "목록에 있는 유명인을 골라 주세요.");
    } else {
      partner = directPartner(body);
      if (!partner) return badInput("ASTRO_INVALID_PARTNER_INPUT", "상대의 생년월일·시각·출생지를 확인해 주세요.");
    }

    let chart;
    let otherChart;
    try {
      [chart, otherChart] = await Promise.all([
        calculateBasicAstrologyChart(mine.moment, request, env),
        calculateBasicAstrologyChart(isCeleb ? { ...celeb.moment, timezone: celeb.moment.tz } : partner.moment, request, env),
      ]);
    } catch (error) {
      console.error("[astro-synastry] astronomy failed", error?.message || error);
      return unavailable();
    }
    // 결제를 쓰기 전에 먼저 그린다 — 여기서 실패하면 이용권 차감·claim 없이 503 이다.
    let report;
    try {
      report = isCeleb
        ? buildAstroCelebSynastry({ chart, celebChart: otherChart, celeb, lang })
        : buildAstroDirectSynastry({ chart, partnerChart: otherChart, partner, lang });
    } catch (error) {
      console.error("[astro-synastry] render failed", error?.message || error);
      return unavailable();
    }

    const accessMethod = String(body?.accessMethod || "").trim().toLowerCase();
    const proofInput = { userId, featureKey, coinPrice: Number(FEATURE_KEY_PRICE_TABLE[featureKey]?.cost) || 0, requestId, profileId: mine.profileId };
    let proof;
    try {
      proof = await verifyPerUsePayment(env, { ...proofInput, requireExisting: true });
      // 이용권으로 연 결제는 화면이 먼저 열리고 기록이 뒤에 온다 — 그때만 이 requestId 로 이용권 사용을 직접 확정한다.
      if (proof?.proven === false && accessMethod === "pass") proof = await verifyPerUsePayment(env, proofInput);
    } catch {
      return degraded();
    }
    logPerUsePaymentProof(featureKey, proof);
    if (proof?.proven !== true && proof?.proven !== false) return degraded();
    if (proof.proven !== true) {
      const { pricing } = getBillingFeaturePricing({ featureKey });
      return json({
        ok: false, reason: "PAYMENT_REQUIRED", featureKey,
        message: "이번 궁합 결제 기록을 찾지 못했어요. 결제한 뒤 다시 열어 주세요.",
        amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice,
      }, { status: 402 });
    }
    if (proof.source !== "admin") {
      const evidenceId = proof.transactionId || `${proof.source || "per-use"}-use:${userId}:${featureKey}:${requestId}`;
      const m = mine.moment;
      const pair = createHash("sha256").update(JSON.stringify({
        me: { y: m.year, mo: m.month, d: m.day, h: m.hour, mi: m.minute, tz: m.timezone, lat: m.lat, lon: m.lon },
        partner: isCeleb
          ? { celeb: celeb.name, birth: celeb.birth }
          : { name: partner.name, date: partner.date, time: partner.time, gender: partner.gender, tz: partner.tzOffsetHours, lat: partner.latitude, lon: partner.longitude },
      })).digest("hex").slice(0, 32);
      // claim 실패(중복 사용 409·DB 503)는 claimRequestBillingEvidence 가 결과로 돌려준다 — 본문 없이 그대로 돌려준다.
      const claim = await claimRequestBillingEvidence(env, {
        userId, requestId: `${requestId}|${pair}`, evidenceIds: [evidenceId], featureKey, kind: "astro-synastry",
      });
      if (!claim.ok) return json(evidenceClaimErrorBody(claim), { status: claim.status });
    }
    return json({
      ok: true, unlocked: true, featureKey, html: report.html, result: report.result,
      ...(isCeleb ? {} : { llmPayload: report.llmPayload }),
    });
  } catch (error) {
    if (error instanceof HttpError) return json({
      ok: false, code: error.payload?.code || "BAD_REQUEST", message: error.message,
    }, { status: error.status });
    console.error("[astro-synastry] failed", error?.message || error);
    return unavailable();
  }
}
