// 나크샤트라 결정판 — 영구 해금 심화 리포트 2종 배달 라우트.
//
//   POST /api/nakshatra-premium/lord-report  : 지배성 심화 리포트 (₩10,000)
//   POST /api/nakshatra-premium/dasha-map    : 다샤 인생지도 (₩10,000)
//
// 이 라우트는 "이미 해금된 사용자에게 본문을 준다"만 한다.
// 🔒 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등)은 공용 결제 게이트(/api/billing/coin-gate)가
//    이미 수행한다. 여기서 pass 판정을 또 하면 게이팅이 이중으로 걸려(원칙 6) 엔타이틀먼트 기록 없이
//    본문이 새거나 두 판정이 어긋난다 — 그래서 해금 상태만 읽는다.
//    같은 이유로 402 응답에 paymentMode 를 넣지 않는다(넣으면 이용권 선검사가 스킵된다).
//
// 정본 템플릿: worker/routes/ziwei-island-report.js (같은 계약의 결정론 유료 리포트).
// 무인증·무DB 계약인 무료 라우트(worker/routes/nakshatra.js)는 건드리지 않고 파일을 분리했다.

import { Solar } from "lunar-javascript";
import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { getOptionalUserFromRequest, isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { User } from "../lib/models.js";
import { getSwissVedicPlanets, getSwissMoonLongitudes } from "../lib/swiss-ephemeris.js";
import { nakshatraInfo, buildVimshottariDasha } from "../lib/vedic-derived-calculations.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { buildNakshatraLordReport } from "../lib/nakshatra-lord-report.js";
import { buildNakshatraDashaMap } from "../lib/nakshatra-dasha-map.js";
import { buildNakshatraMuhurta, listMuhurtaPurposes } from "../lib/nakshatra-muhurta.js";
import { buildNakshatraVvipCodex } from "../lib/nakshatra-vvip-codex.js";
import { verifyPerUsePayment, logPerUsePaymentProof } from "../lib/nakshatra-paid-access.js";
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
    coinPrice: 100,
    amountKRW: 10000,
    orderName: "나크샤트라 다샤 인생지도",
  }),
});

const MESSAGES = Object.freeze({
  login: "리포트를 열려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이 리포트는 1회 해금이 필요합니다. 이용권이 있으면 무료로 열립니다.",
  paymentRequiredPerUse: "결제 확인이 필요합니다. 결제창에서 다시 진행해 주세요.",
  degraded: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
  invalidInput: "생년월일(year/month/day)이 필요합니다.",
  invalidPurpose: "택일 목적을 골라 주세요.",
  invalidRange: "조회할 기간을 만들 수 없습니다. 시작 날짜를 확인해 주세요.",
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

// ── 택일(무후르타) — 회당 결제 ───────────────────────────────────────────────
//
// 앞의 두 리포트와 달리 영구 해금이 아니라 매번 결제하는 기능이라 해금 상태를 읽지 않는다.
// 결제창(이용권 선검사 → 단건/월정석 동등 노출)은 프론트 공용 게이트(useCoinGate)가 처리하고,
// 서버는 **그 결제가 실제로 일어났는지**만 DB 기록으로 확인한다(worker/lib/nakshatra-paid-access.js).
// 🔴 canAccessPaidFeature 로 관문을 세우지 않는다 — 그 함수는 엔티틀먼트 전용이라 회당결제
//    키에는 언제나 PAYMENT_REQUIRED 를 돌려주고, 이미 차감된 사용자가 402 를 맞아 돈만 나간다.
const MUHURTA_MAX_DAYS = 60;

// 회당 결제 상품 — 레지스트리 등록값과 일치해야 한다(이용권 커버 판정에 코인가가 필요).
const PER_USE_PRODUCTS = Object.freeze({
  muhurta: Object.freeze({ featureKey: "nakshatra-muhurta", coinPrice: 50 }),
  "vvip-codex": Object.freeze({ featureKey: "nakshatra-vvip-codex", coinPrice: 300 }),
});

// 🔴 1단계는 관측 전용이다 — 증빙 결과를 로그로만 남기고 아무것도 막지 않는다.
//    차단(402)은 실사용 로그에서 정상 결제 경로가 전부 proven:true 로 찍히는 것을 확인한 뒤 켠다.
//    이 순서를 지키는 이유: 검증이 과하면 이미 결제한 사용자가 402 를 맞아 돈만 나간다.
const PER_USE_ENFORCE = false;

async function observePerUsePayment(env, auth, kind, body) {
  const product = PER_USE_PRODUCTS[kind];
  if (!product) return null;
  try {
    const proof = await verifyPerUsePayment(env, {
      userId: auth?.userId,
      featureKey: product.featureKey,
      coinPrice: product.coinPrice,
      requestId: body?.requestId || body?.idempotencyKey || "",
    });
    logPerUsePaymentProof(product.featureKey, proof);
    return proof;
  } catch (error) {
    // 🔴 증빙 확인이 터져도 결제한 사용자의 본문을 막지 않는다 — 관측 단계에서 500 을 새로 만드는 것은
    //    고치려던 문제보다 나쁘다. 차단을 켤 때도 이 경로는 "판단 보류"로 남아 503 이 된다.
    logPerUsePaymentProof(product.featureKey, { proven: null, source: "", reason: "VERIFY_THREW" });
    console.error("[nakshatra-paid-access] verify failed", String(error?.message || error).slice(0, 200));
    return { proven: null, source: "", reason: "VERIFY_THREW" };
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

// KST 벽시계 기준으로 하루씩 전진하며 날짜·요일·숙요를 만든다.
function buildScanDays(startDate, dayCount) {
  const base = new Date(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(base.getTime())) return [];
  const out = [];
  for (let offset = 0; offset < dayCount; offset += 1) {
    const cursor = new Date(base.getTime() + offset * 86400000);
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const day = cursor.getUTCDate();
    const lunar = Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar();
    const rawMonth = lunar.getMonth();
    const suk = buildSukuyoFromLunar(Math.abs(rawMonth), lunar.getDay(), { isLeapMonth: rawMonth < 0 });
    if (!suk) continue;
    out.push({
      date: `${year}-${pad2(month)}-${pad2(day)}`,
      weekdayIndex: cursor.getUTCDay(),
      sukuyoIndex: suk.index,
      moment: { year, month, day, hour: 12, minute: 0, timezone: 9 },
    });
  }
  return out;
}

async function handleMuhurta(request, env) {
  const auth = await requireAuth(request, env);

  const body = await readJson(request);
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const proof = await observePerUsePayment(env, auth, "muhurta", body);
  if (PER_USE_ENFORCE && proof) {
    if (proof.proven === null) return degraded();
    if (proof.proven === false) return json({ ok: false, reason: "PAYMENT_REQUIRED", message: MESSAGES.paymentRequiredPerUse }, { status: 402 });
  }

  const purposeKey = String(body?.purpose || "").trim();
  if (!listMuhurtaPurposes().some((item) => item.key === purposeKey)) {
    return json({ ok: false, reason: "INVALID_PURPOSE", message: MESSAGES.invalidPurpose, purposes: listMuhurtaPurposes() }, { status: 400 });
  }

  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.startDate || ""))
    ? String(body.startDate)
    : new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const dayCount = Math.min(MUHURTA_MAX_DAYS, Math.max(14, Number(body?.days) || MUHURTA_MAX_DAYS));

  // 본인 명식 — 본명수(숙요)와 본명 나크샤트라. Swiss 호출 1회.
  const moonLon = await resolveMoon(env, input, request.url);
  if (moonLon == null) {
    return json({ ok: false, retryable: true, reason: "SWISS_MOON_UNAVAILABLE", message: MESSAGES.moonUnavailable }, { status: 502 });
  }
  const myLunar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getLunar();
  const myRawMonth = myLunar.getMonth();
  const mySuk = buildSukuyoFromLunar(Math.abs(myRawMonth), myLunar.getDay(), { isLeapMonth: myRawMonth < 0 });
  if (!mySuk) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const scan = buildScanDays(startDate, dayCount);
  if (!scan.length) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidRange }, { status: 400 });
  }

  // 🔴 날짜별 나크샤트라는 그날 달의 실제 황경에서 나와야 한다. 숙요에서 크로스워크로
  //    유도하면 타라발라가 격각과 같은 값의 함수가 되어 "두 체계의 교집합"이 가짜가 된다.
  const longitudes = await getSwissMoonLongitudes(env, scan.map((day) => day.moment), { requestUrl: request.url });

  const report = buildNakshatraMuhurta({
    purposeKey,
    myMansionIndex: mySuk.index,
    myNakIndex: nakshatraInfo(moonLon).index,
    days: scan.map((day, index) => ({
      date: day.date,
      weekdayIndex: day.weekdayIndex,
      sukuyoIndex: day.sukuyoIndex,
      moonLongitude: longitudes[index],
    })),
  });
  if (!report) {
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }

  return json(
    { ok: true, featureKey: "nakshatra-muhurta", report },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// ── VVIP 결정판 통합서 — 회당 결제 ──────────────────────────────────────────
// 택일과 같은 계약(회당 결제). 위 handleMuhurta 주석 참고.
async function handleVvipCodex(request, env) {
  const auth = await requireAuth(request, env);

  const body = await readJson(request);
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const proof = await observePerUsePayment(env, auth, "vvip-codex", body);
  if (PER_USE_ENFORCE && proof) {
    if (proof.proven === null) return degraded();
    if (proof.proven === false) return json({ ok: false, reason: "PAYMENT_REQUIRED", message: MESSAGES.paymentRequiredPerUse }, { status: 402 });
  }

  const moonLon = await resolveMoon(env, input, request.url);
  if (moonLon == null) {
    return json({ ok: false, retryable: true, reason: "SWISS_MOON_UNAVAILABLE", message: MESSAGES.moonUnavailable }, { status: 502 });
  }

  const lunar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getLunar();
  const rawMonth = lunar.getMonth();
  const sukuyo = buildSukuyoFromLunar(Math.abs(rawMonth), lunar.getDay(), { isLeapMonth: rawMonth < 0 });
  if (!sukuyo) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const birthUtc = birthUtcFromInput(input);
  const now = new Date();
  const nak = nakshatraInfo(moonLon);
  const report = buildNakshatraVvipCodex({
    nak,
    sukuyo,
    pada: nak.pada,
    dasha: buildVimshottariDasha(moonLon, birthUtc, now),
    majorLuck: resolveMajorLuck(input),
    birthUtc,
    now,
    timeUnknown: input.timeUnknown,
  });
  if (!report) {
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }

  return json(
    { ok: true, featureKey: "nakshatra-vvip-codex", report },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function handleNakshatraPremiumRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/nakshatra-premium");
  try {
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (method === "GET" && path === "/muhurta/purposes") {
      return json({ ok: true, purposes: listMuhurtaPurposes() }, { headers: { "Cache-Control": "public, max-age=3600" } });
    }
    if (method === "POST") {
      const kind = path.replace(/^\/+/, "");
      if (kind === "muhurta") return await handleMuhurta(request, env);
      if (kind === "vvip-codex") return await handleVvipCodex(request, env);
      const product = PRODUCTS[kind];
      if (product) return await handleProduct(request, env, product, kind);
    }
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (error instanceof HttpError) {
      // 401 을 BAD_REQUEST 로 세탁하지 않는다 — requireAuth 는 payload.error 를 싣지 않아
      // 그대로 두면 인증 실패가 "잘못된 요청"으로 보고된다(과거 오진의 원인).
      const reason = error.payload?.error || (error.status === 401 ? "LOGIN_REQUIRED" : "BAD_REQUEST");
      return json({ ok: false, reason, message: error.status === 401 ? MESSAGES.login : error.message }, { status: error.status });
    }
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return degraded();
    console.error("[nakshatra-premium]", String(error?.message || error).slice(0, 300));
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }
}

export const __nakshatraPremiumTestUtils = { PRODUCTS, normalizeBirthBody, isValidBirth, birthUtcFromInput };
