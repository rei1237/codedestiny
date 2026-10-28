import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
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
import { isTransientMongoError } from "../lib/db.js";
import { readProfileBirthUnlock } from "../lib/paid-content-read-access.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import { buildIslandBlueprint } from "../lib/island/island-blueprint.js";
import { buildIslandDeepReport } from "../lib/island/island-report.js";
import { invalidIslandInput, normalizeIslandBirthInput } from "../lib/island/island-input.js";
import { fnv1a32 } from "../lib/island/island-weights.js";

// 레지스트리(worker/lib/paid-feature-registry.js) 등록값과 일치해야 한다.
const FEATURE_KEY = "ziwei-island-deep-report";
const COIN_PRICE = FEATURE_KEY_PRICE_TABLE[FEATURE_KEY].cost;
const AMOUNT_KRW = COIN_PRICE * 100;
const ORDER_NAME = "운명의 섬 12궁 심층 리포트";

const MESSAGES = Object.freeze({
  login: "심층 리포트를 열려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이 생년월일은 별도 구매가 필요합니다. 이용권이 있으면 무료로 열립니다.",
  missingProfile: "프로필을 저장한 뒤 구매해 주세요.",
  invalidProfile: "저장된 내 프로필을 선택해 주세요.",
  profileGender: "프로필에 성별(남/여)을 저장한 뒤 다시 시도해 주세요.",
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
 * 🔴 해금은 userId + 저장 프로필의 출생 정보(birthKey) 단위다. 명반도 그 프로필의 저장된 출생 정보로만 만든다 —
 *    요청 본문의 생년월일로 계산하면 한 번의 구매로 아무 사람의 리포트나 열린다.
 *    자미두수 명반 계산기가 음력을 직접 환산하므로 저장된 달력 날짜(calendarDate)를 그대로 넘긴다.
 *    body.date(결정론 재현용 기준일)는 신원이 아니므로 요청 값을 유지한다.
 */
function islandInputFromProfileBirth(body, birth) {
  const gender = birth.gender === "M" ? "male" : birth.gender === "F" ? "female" : "";
  if (!gender) throw invalidIslandInput(MESSAGES.profileGender);
  return {
    date: body && typeof body === "object" ? body.date : undefined,
    birthDate: birth.calendarDate,
    birthTime: birth.timeKnown ? birth.time : "",
    birthTimeUnknown: !birth.timeKnown,
    calendarType: birth.calendarType,
    isLeapMonth: birth.isLeapMonth === true,
    gender,
  };
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

  const body = await readJson(request);
  let access;
  try {
    access = await readProfileBirthUnlock(env, { userId: auth.userId, profileId: body?.profileId, featureKey: FEATURE_KEY });
  } catch {
    // 권한 조회 실패는 미구매(402)가 아니다 — 재시도 가능한 503.
    return degraded();
  }
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    const missing = access.reason === "MISSING_PROFILE_ID";
    return json({
      ok: false,
      reason: access.reason,
      code: access.reason,
      featureKey: FEATURE_KEY,
      requiresProfile: true,
      message: missing ? MESSAGES.missingProfile : MESSAGES.invalidProfile,
    }, { status: missing ? 400 : 403 });
  }

  if (!access.unlocked) {
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

  if (!access.birth) throw invalidIslandInput("프로필의 출생 정보를 확인해 주세요.");
  const report = buildReportFromBirth(islandInputFromProfileBirth(body, access.birth));
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
