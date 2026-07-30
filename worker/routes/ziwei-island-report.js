// 운명의 섬 12궁 심층 리포트 (₩5,000) — 정적 결정론 콘텐츠 배달 라우트.
//
// 이 라우트는 "이미 해금된 사용자에게 본문을 준다"만 한다.
// 🔒 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등)은 공용 결제 게이트(/api/billing/coin-gate)가
//    이미 수행한다. 여기서 pass 판정을 또 하면 게이팅이 이중으로 걸려(원칙 6) 엔타이틀먼트 기록 없이
//    본문이 새거나 두 판정이 어긋난다 — 그래서 해금 상태만 읽는다.
//
// 무료 blueprint 라우트(worker/routes/ziwei-island.js)는 무인증·무DB 계약이라 건드리지 않고 파일을 분리했다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { User } from "../lib/models.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import { buildIslandBlueprint } from "../lib/island/island-blueprint.js";
import { buildIslandDeepReport } from "../lib/island/island-report.js";
import { invalidIslandInput, normalizeIslandBirthInput } from "../lib/island/island-input.js";
import { fnv1a32 } from "../lib/island/island-weights.js";

// 레지스트리(worker/lib/paid-feature-registry.js) 등록값과 일치해야 한다.
const FEATURE_KEY = "ziwei-island-deep-report";
const COIN_PRICE = 50;
const AMOUNT_KRW = 5000;
const ORDER_NAME = "운명의 섬 12궁 심층 리포트";

const MESSAGES = Object.freeze({
  login: "심층 리포트를 열려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "심층 리포트는 1회 해금이 필요합니다. 이용권이 있으면 무료로 열립니다.",
  degraded: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
  failed: "심층 리포트를 만드는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
});

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
}

function degraded() {
  return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: MESSAGES.degraded }, { status: 503 });
}

/**
 * 계정 스코프 영구 해금 여부. billing.js의 hasUserScopedPermanentUnlock과 같은 판정(User.unlockedFeatures)이며,
 * coin-gate 결제·카드 단건결제(payments.js recordUserPaidFeature) 양쪽이 모두 이 배열에 기록한다.
 */
async function isUnlockedForUser(env, userId) {
  await connectDb(env);
  const row = await withMongoRetry(env, () => User.exists({ _id: userId, unlockedFeatures: FEATURE_KEY }));
  return Boolean(row);
}

function buildReportFromBirth(body) {
  const { chartInput, date, birthYear } = normalizeIslandBirthInput(body);
  const currentYear = Number(date.slice(0, 4));

  let chart;
  try {
    chart = calculateZiweiAiChart(chartInput, { year: currentYear });
  } catch (error) {
    if (error?.code === "INVALID_INPUT") throw invalidIslandInput("생년월일 정보로 명반을 계산할 수 없습니다.");
    throw error;
  }

  const userKey = fnv1a32(
    [chartInput.birthDate, chartInput.birthTimeUnknown ? "unknown" : chartInput.birthTime, chartInput.gender, chartInput.calendarType, chartInput.isLeapMonth ? "leap" : "plain"].join("|"),
  ).toString(16);

  const blueprint = buildIslandBlueprint(chart, { userKey, date, currentYear, birthYear });
  // 🔴 chart를 함께 넘긴다 — 삼방사정·대운 타임라인·유년 주성은 blueprint가 싣지 않는다.
  //    blueprint 스키마를 늘리면 무인증·무DB인 무료 라우트와 클라이언트 캐시 계약이 깨지므로 이 경로를 쓴다.
  return buildIslandDeepReport(blueprint, chart);
}

async function handleReport(request, env) {
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
    unlocked = await isUnlockedForUser(env, auth.userId);
  } catch (error) {
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return degraded();
    throw error;
  }

  if (!unlocked) {
    // 결제수단 판정(단건/월정석 동등, 이용권 선검사)은 클라이언트 공용 게이트가 서버 결정으로 수행한다.
    // 여기서 paymentMode를 지정하면 이용권 선검사를 건너뛰게 되므로 절대 넣지 않는다.
    return json({
      ok: false,
      reason: "PAYMENT_REQUIRED",
      message: MESSAGES.paymentRequired,
      featureKey: FEATURE_KEY,
      title: ORDER_NAME,
      coinPrice: COIN_PRICE,
      amountKRW: AMOUNT_KRW,
    }, { status: 402 });
  }

  const body = await readJson(request);
  const report = buildReportFromBirth(body);
  return json({ ok: true, unlocked: true, report }, { headers: { "Cache-Control": "no-store" } });
}

export async function handleZiweiIslandReportRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/ziwei-island-report");
  try {
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (method === "POST" && (path === "" || path === "/" || path === "/result")) return await handleReport(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ ok: false, error: error.payload?.error || "BAD_REQUEST", message: error.message }, { status: error.status });
    }
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return degraded();
    console.error("[ziwei-island-report]", String(error?.message || error).slice(0, 300));
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }
}

export const __ziweiIslandReportTestUtils = { FEATURE_KEY, COIN_PRICE, AMOUNT_KRW, buildReportFromBirth };
