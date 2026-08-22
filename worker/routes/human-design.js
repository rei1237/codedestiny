// 휴먼 디자인 바디그래프 — 회당 결제(human-design-chart, 100코인 = ₩10,000) 배달 라우트.
//
//   POST /api/human-design/chart   : 출생 데이터 → 26 activation → BodyGraph → 핵심 판정
//
// 계약 (정본 템플릿: worker/routes/nakshatra-premium.js 의 택일/VVIP 통합서)
// ─────────────────────────────────────────────────────────────────────────────
// 🔒 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등)은 공용 결제 게이트가 이미 수행한다.
//    여기서 pass 판정을 다시 하지 않는다 — 이중 게이팅(원칙 6)이 되어 엔타이틀먼트 기록 없이
//    본문이 새거나 두 판정이 어긋난다.
// 🔴 canAccessPaidFeature 로 관문을 세우지 않는다. 그 함수는 엔티틀먼트 전용이라 회당결제
//    키에는 언제나 PAYMENT_REQUIRED 를 돌려주고, 이미 차감된 사용자가 402 를 맞아 돈만 나간다.
//
// 재열람
// ─────────────────────────────────────────────────────────────────────────────
// 차트는 같은 출생 데이터면 항상 같은 결과다. 그래서 (userId, inputHash, calculationVersion)
// 조합의 저장 문서가 있으면 **재결제 없이** 그대로 돌려준다(sukuyo-past-life-reading 의
// 아카이브와 같은 계약). 🔴 영구 해금이 아니다 — 출생 데이터가 다르면 새 결제다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { HumanDesignCalculation } from "../lib/models.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { calculateHumanDesignChart } from "../lib/human-design-ephemeris.js";
import { CALCULATION_VERSION } from "../../lib/human-design/version.js";

// 레지스트리(worker/lib/paid-feature-registry.js) 등록값과 일치해야 한다.
// 🔴 scripts/verify-human-design.mjs 가 이 셋의 정합성을 강제한다.
const FEATURE_KEY = "human-design-chart";
const COIN_PRICE = 100;
const AMOUNT_KRW = 10000;

// 🔴 1단계는 관측 전용이다 — 증빙 결과를 로그로만 남기고 아무것도 막지 않는다.
//    차단(402)은 실사용 로그에서 정상 결제 경로가 전부 proven:true 로 찍히는 것을 확인한 뒤 켠다.
//    이 순서를 지키는 이유: 검증이 과하면 이미 결제한 사용자가 402 를 맞아 돈만 나간다.
//    (nakshatra-premium.js 의 PER_USE_ENFORCE 와 같은 계약)
const PER_USE_ENFORCE = false;

const MESSAGES = Object.freeze({
  login: "로그인이 필요합니다.",
  invalidInput: "생년월일·태어난 시각·타임존을 정확히 입력해 주세요.",
  failed: "휴먼 디자인 차트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
  degraded: "잠시 접속이 불안정합니다. 잠시 후 다시 시도해 주세요.",
  ephemeris: "천문 계산 엔진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
});

function degraded() {
  return json(
    { ok: false, retryable: true, reason: "TEMPORARILY_UNAVAILABLE", message: MESSAGES.degraded },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function clean(value, max = 120) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 요청 본문 → 계산 입력.
 *
 * 🔴 위도·경도는 계산에 쓰이지 않는다. 휴먼 디자인 바디그래프는 하우스·상승궁을 쓰지 않아
 *    장소가 아니라 타임존만 결과를 바꾼다. 그래도 입력 기록으로 남긴다.
 */
function normalizeBirthBody(body = {}) {
  const source = body && typeof body === "object" ? body : {};
  const birth = source.birth && typeof source.birth === "object" ? source.birth : source;
  const calendarRaw = clean(birth.calendar || birth.calendarType || "solar", 20).toLowerCase();
  const isLunar = calendarRaw.includes("lun") || calendarRaw.includes("음");
  const isLeap = calendarRaw.includes("leap") || String(birth.calendar || "").includes("윤") || birth.isLeapMonth === true;

  const latitude = Number(birth.latitude ?? birth.lat);
  const longitude = Number(birth.longitude ?? birth.lon ?? birth.lng);

  return {
    birthDate: clean(birth.birthDate || birth.date, 10),
    birthTime: clean(birth.birthTime || birth.time, 5),
    timezone: clean(birth.timezone || birth.tz, 80),
    calendar: isLunar ? (isLeap ? "lunar-leap" : "lunar") : "solar",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    city: clean(birth.city, 100),
    country: clean(birth.country, 100),
  };
}

function isValidBirth(input) {
  return /^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)
    && /^\d{1,2}:\d{2}$/.test(input.birthTime)
    && input.timezone.length > 0;
}

/**
 * 재열람 판정 키. 🔴 계산 버전을 포함해야 엔진이 바뀐 뒤 옛 결과를 그대로 내주지 않는다.
 * 좌표는 결과를 바꾸지 않으므로 해시에 넣지 않는다 — 넣으면 같은 차트에 재결제를 요구하게 된다.
 */
function inputHashSource(input) {
  return [input.birthDate, input.birthTime, input.timezone, input.calendar, CALCULATION_VERSION].join("|");
}

async function observePerUsePayment(env, auth, body) {
  try {
    const proof = await verifyPerUsePayment(env, {
      userId: auth?.userId,
      featureKey: FEATURE_KEY,
      coinPrice: COIN_PRICE,
      requestId: clean(body?.requestId || body?.idempotencyKey, 180),
    });
    logPerUsePaymentProof(FEATURE_KEY, proof);
    return proof;
  } catch (error) {
    // 🔴 증빙 확인이 터져도 결제한 사용자의 본문을 막지 않는다 — 관측 단계에서 500 을 새로
    //    만드는 것은 고치려던 문제보다 나쁘다. 차단을 켤 때도 이 경로는 "판단 보류"로 남는다.
    logPerUsePaymentProof(FEATURE_KEY, { proven: null, source: "", reason: "VERIFY_THREW" });
    console.error("[human-design-paid-access] verify failed", String(error?.message || error).slice(0, 200));
    return { proven: null, source: "", reason: "VERIFY_THREW" };
  }
}

/** 저장된 차트를 찾는다. DB 가 흔들려도 본문을 막지 않으므로 실패는 null 로 접는다. */
async function findArchivedChart(userId, inputHash) {
  try {
    await connectDb();
    return await withMongoRetry(() => HumanDesignCalculation.findOne({
      userId,
      inputHash,
      calculationVersion: CALCULATION_VERSION,
    }).lean());
  } catch (error) {
    console.error("[human-design] archive lookup failed", String(error?.message || error).slice(0, 200));
    return null;
  }
}

/** 아카이브 기록. 실패해도 사용자에게는 차트를 준다(결제는 이미 끝났다). */
async function archiveChart(doc) {
  try {
    await connectDb();
    await withMongoRetry(() => HumanDesignCalculation.updateOne(
      { userId: doc.userId, idempotencyKey: doc.idempotencyKey },
      { $setOnInsert: doc },
      { upsert: true },
    ));
    return true;
  } catch (error) {
    console.error("[human-design] archive write failed", String(error?.message || error).slice(0, 200));
    return false;
  }
}

/**
 * 로딩 화면이 쓸 **실측** 단계 시간. 가짜 진행률을 만들지 않기 위해(요구사항 22)
 * 각 단계의 소요 ms 를 재서 그대로 돌려준다.
 */
function createStageTimer(now) {
  const stages = [];
  let last = now();
  return {
    mark(stage) {
      const at = now();
      stages.push({ stage, ms: Math.max(0, Math.round(at - last)) });
      last = at;
    },
    stages,
  };
}

async function handleChart(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const now = () => Date.now();
  const timer = createStageTimer(now);
  const inputHash = await sha256Hex(inputHashSource(input));
  timer.mark("BIRTH_DATA");

  // 같은 출생 데이터를 다시 열면 재결제 없이 저장본을 준다.
  const archived = await findArchivedChart(auth.userId, inputHash);
  if (archived?.calculation) {
    timer.mark("ARCHIVE_HIT");
    return json(
      { ok: true, featureKey: FEATURE_KEY, reused: true, chart: archived.calculation, pipeline: timer.stages },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const proof = await observePerUsePayment(env, auth, body);
  if (PER_USE_ENFORCE && proof) {
    if (proof.proven === null) return degraded();
    if (proof.proven === false) {
      return json(
        { ok: false, reason: "PAYMENT_REQUIRED", featureKey: FEATURE_KEY, coinPrice: COIN_PRICE, amountKRW: AMOUNT_KRW },
        { status: 402 },
      );
    }
  }
  timer.mark("PAYMENT_PROOF");

  let chart;
  try {
    chart = await calculateHumanDesignChart(env, input, {
      requestUrl: request.url,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = String(error?.message || error);
    console.error("[human-design] calculation failed", message.slice(0, 300));
    if (/wasm|ephemer|swiss/i.test(message)) {
      return json({ ok: false, retryable: true, reason: "EPHEMERIS_UNAVAILABLE", message: MESSAGES.ephemeris }, { status: 502 });
    }
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }
  timer.mark("CHART");

  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 180) || `${FEATURE_KEY}:${inputHash}`;
  await archiveChart({
    id: `${FEATURE_KEY}:${auth.userId}:${inputHash}`,
    userId: auth.userId,
    profileId: clean(body?.profileId, 120),
    idempotencyKey,
    inputHash,
    birthInput: chart.birthInput,
    calculationVersion: chart.calculationVersion,
    ephemerisVersion: chart.ephemerisVersion,
    mappingVersion: chart.mappingVersion,
    nodeMode: chart.nodeMode,
    calculation: chart,
    designMomentUtc: chart.moments?.designUtc || "",
    hdType: chart.type,
    authority: chart.authority,
    profile: chart.profile,
    definition: chart.definition,
    accessType: "paid",
    accessSource: clean(proof?.source, 40),
    billingRequestId: clean(body?.requestId, 180),
    calculatedAt: new Date(),
  });
  timer.mark("ARCHIVE");

  return json(
    { ok: true, featureKey: FEATURE_KEY, reused: false, chart, pipeline: timer.stages },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function handleHumanDesignRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/human-design");
  try {
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (method === "POST" && path === "/chart") return await handleChart(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (error instanceof HttpError) {
      // 401 을 BAD_REQUEST 로 세탁하지 않는다 — requireAuth 는 payload.error 를 싣지 않아
      // 그대로 두면 인증 실패가 "잘못된 요청"으로 보고된다.
      const reason = error.payload?.error || (error.status === 401 ? "LOGIN_REQUIRED" : "BAD_REQUEST");
      return json(
        { ok: false, reason, message: error.status === 401 ? MESSAGES.login : error.message },
        { status: error.status },
      );
    }
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return degraded();
    console.error("[human-design]", String(error?.message || error).slice(0, 300));
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }
}

export const __humanDesignRouteTestUtils = {
  FEATURE_KEY,
  COIN_PRICE,
  AMOUNT_KRW,
  PER_USE_ENFORCE,
  normalizeBirthBody,
  isValidBirth,
  inputHashSource,
};
