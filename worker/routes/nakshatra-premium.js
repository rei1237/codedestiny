// 나크샤트라 결정판 — 영구 해금 심화 리포트 2종 배달 라우트.
//
//   POST /api/nakshatra-premium/lord-report  : 지배성 심화 리포트 (₩10,000)
//   POST /api/nakshatra-premium/dasha-map    : 다샤 인생지도 (₩15,000)
//
// 이 라우트는 "이미 해금된 사용자에게 본문을 준다"만 한다.
// 🔒 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등)은 공용 결제 게이트(/api/billing/coin-gate)가
//    이미 수행한다. 여기서 pass 판정을 또 하면 게이팅이 이중으로 걸려(원칙 6) 엔타이틀먼트 기록 없이
//    본문이 새거나 두 판정이 어긋난다 — 그래서 해금 상태만 읽는다.
//    같은 이유로 402 응답에 paymentMode 를 넣지 않는다(넣으면 이용권 선검사가 스킵된다).
//
// 정본 템플릿: worker/routes/ziwei-island-report.js (같은 계약의 결정론 유료 리포트).
// 무인증·무DB 계약인 무료 라우트(worker/routes/nakshatra.js)는 건드리지 않고 파일을 분리했다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { User } from "../lib/models.js";
import { getSwissVedicPlanets } from "../lib/swiss-ephemeris.js";
import { nakshatraInfo, buildVimshottariDasha } from "../lib/vedic-derived-calculations.js";
import { buildNakshatraLordReport } from "../lib/nakshatra-lord-report.js";
import { buildNakshatraDashaMap } from "../lib/nakshatra-dasha-map.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";

// 레지스트리(worker/lib/paid-feature-registry.js) 등록값과 일치해야 한다.
const PRODUCTS = Object.freeze({
  "lord-report": Object.freeze({
    featureKey: "nakshatra-lord-report",
    coinPrice: 100,
    amountKRW: 10000,
    orderName: "나크샤트라 지배성 심화 리포트",
  }),
  "dasha-map": Object.freeze({
    featureKey: "nakshatra-dasha-map",
    coinPrice: 150,
    amountKRW: 15000,
    orderName: "나크샤트라 다샤 인생지도",
  }),
});

const MESSAGES = Object.freeze({
  login: "리포트를 열려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이 리포트는 1회 해금이 필요합니다. 이용권이 있으면 무료로 열립니다.",
  degraded: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
  invalidInput: "생년월일(year/month/day)이 필요합니다.",
  moonUnavailable: "달의 위치 계산에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  failed: "리포트를 만드는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
});

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
}

function degraded() {
  return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: MESSAGES.degraded }, { status: 503 });
}

/**
 * 계정 스코프 영구 해금 여부. billing.js 의 hasUserScopedPermanentUnlock 과 같은 판정(User.unlockedFeatures)이며,
 * coin-gate 결제·카드 단건결제(payments.js recordUserPaidFeature) 양쪽이 모두 이 배열에 기록한다.
 */
async function isUnlockedForUser(env, userId, featureKey) {
  await connectDb(env);
  const row = await withMongoRetry(env, () => User.exists({ _id: userId, unlockedFeatures: featureKey }));
  return Boolean(row);
}

// 무료 라우트(nakshatra.js)와 같은 입력 계약 — 프론트가 같은 폼 값을 그대로 보낸다.
function normalizeBirthBody(body) {
  const src = body && typeof body === "object" ? body : {};
  const timeUnknown = Boolean(src.timeUnknown === true || src.timeUnknown === "true");
  return {
    year: Number(src.year),
    month: Number(src.month),
    day: Number(src.day),
    hour: timeUnknown ? 12 : Number(src.hour ?? 12),
    minute: timeUnknown ? 0 : Number(src.minute ?? 0),
    timezone: Number(src.timezone ?? 9),
    lat: Number(src.lat ?? src.latitude ?? 37.5665),
    lon: Number(src.lon ?? src.lng ?? src.longitude ?? 126.978),
    timeUnknown,
    gender: src.gender === "male" || src.gender === "female" ? src.gender : "",
  };
}

function isValidBirth(input) {
  return (
    Number.isFinite(input.year)
    && Number.isFinite(input.month)
    && Number.isFinite(input.day)
    && input.month >= 1 && input.month <= 12
    && input.day >= 1 && input.day <= 31
  );
}

function birthUtcFromInput(input) {
  return new Date(
    Date.UTC(input.year, input.month - 1, input.day, 0, 0, 0, 0)
    + (input.hour + input.minute / 60 - input.timezone) * 3600000,
  );
}

async function resolveMoon(env, input, requestUrl) {
  const swiss = await getSwissVedicPlanets(env, input, { requestUrl });
  const moonLon = Number(swiss?.planets?.Moon);
  return Number.isFinite(moonLon) ? moonLon : null;
}

// 동양 대운(절기 기반)만 뽑아 온다. 성별 미상이면 majorLuck.available === false 로 돌아오고,
// 인생지도는 인도 축만으로 렌더된다(엔진이 그 분기를 안내 문장으로 처리한다).
function resolveMajorLuck(input) {
  if (!input.gender) return { available: false, reason: "성별 비공개 입력이어서 대운 순행·역행을 단정하지 않습니다." };
  try {
    const pad = (value) => String(value).padStart(2, "0");
    const saju = calculateLifeBookAiSaju({
      birthDate: `${input.year}-${pad(input.month)}-${pad(input.day)}`,
      birthTime: input.timeUnknown ? "" : `${pad(input.hour)}:${pad(input.minute)}`,
      birthTimeUnknown: input.timeUnknown,
      calendarType: "solar",
      gender: input.gender,
    });
    return saju?.majorLuck || { available: false, reason: "대운을 계산하지 못했습니다." };
  } catch {
    // 대운은 보조 축이다. 실패해도 인도 축 지도는 온전히 나가야 하므로 여기서 삼킨다.
    return { available: false, reason: "대운을 계산하지 못했습니다." };
  }
}

async function handleProduct(request, env, product, kind) {
  let auth = null;
  try {
    auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  } catch (error) {
    // 🔴 DB 인프라 장애를 401로 세탁하지 않는다 — 로그인한 사용자가 게스트로 강등되는 회귀의 원인.
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return degraded();
    throw error;
  }
  if (!auth?.userId) return loginRequired();

  let unlocked = false;
  try {
    unlocked = await isUnlockedForUser(env, auth.userId, product.featureKey);
  } catch (error) {
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return degraded();
    throw error;
  }

  if (!unlocked) {
    // 결제수단 판정(단건/월정석 동등, 이용권 선검사)은 클라이언트 공용 게이트가 서버 결정으로 수행한다.
    // 여기서 paymentMode 를 지정하면 이용권 선검사를 건너뛰게 되므로 절대 넣지 않는다.
    return json({
      ok: false,
      reason: "PAYMENT_REQUIRED",
      message: MESSAGES.paymentRequired,
      featureKey: product.featureKey,
      title: product.orderName,
      coinPrice: product.coinPrice,
      amountKRW: product.amountKRW,
    }, { status: 402 });
  }

  const body = await readJson(request);
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const moonLon = await resolveMoon(env, input, request.url);
  if (moonLon == null) {
    return json({ ok: false, retryable: true, reason: "SWISS_MOON_UNAVAILABLE", message: MESSAGES.moonUnavailable }, { status: 502 });
  }

  const birthUtc = birthUtcFromInput(input);
  const now = new Date();
  const nak = nakshatraInfo(moonLon);
  const dasha = buildVimshottariDasha(moonLon, birthUtc, now);

  const report = kind === "lord-report"
    ? buildNakshatraLordReport({
      nakIndex: nak.index,
      pada: nak.pada,
      dasha,
      timeUnknown: input.timeUnknown,
    })
    : buildNakshatraDashaMap({
      dasha,
      majorLuck: resolveMajorLuck(input),
      nakIndex: nak.index,
      birthUtc,
      now,
    });

  if (!report) {
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }

  return json(
    { ok: true, unlocked: true, featureKey: product.featureKey, report },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function handleNakshatraPremiumRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/nakshatra-premium");
  try {
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (method === "POST") {
      const kind = path.replace(/^\/+/, "");
      const product = PRODUCTS[kind];
      if (product) return await handleProduct(request, env, product, kind);
    }
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ ok: false, reason: error.payload?.error || "BAD_REQUEST", message: error.message }, { status: error.status });
    }
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return degraded();
    console.error("[nakshatra-premium]", String(error?.message || error).slice(0, 300));
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }
}

export const __nakshatraPremiumTestUtils = { PRODUCTS, normalizeBirthBody, isValidBirth, birthUtcFromInput };
