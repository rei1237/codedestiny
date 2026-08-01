// 나크샤트라 결정판 — 무인증 무료 계산 라우트 (I/O 배선)
//
//   POST /api/nakshatra/resolve  : 생년월일(+시각·출생지) → 동양/인도/통합 3-뷰
//   GET  /api/nakshatra/today    : 오늘의 달(달의 나크샤트라 + 대응 숙요) + (선택)개인 격각·타라발라
//   POST /api/nakshatra/compat   : 동서 통합 궁합(유료·회당결제 ₩10,000)
//
// 위 두 무료 라우트는 결제 게이팅·인증이 없다. compat 만 인증 + 결제 증빙 확인을 거친다.
// 순수 조립 로직은 worker/lib/nakshatra-codex.js(WASM 비의존)에 있고, 이 파일은
// Swiss WASM(시데리얼 Lahiri) + lunar-javascript(음력) I/O만 배선한다.

import { Solar } from "lunar-javascript";
import { handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { getSwissVedicPlanets } from "../lib/swiss-ephemeris.js";
import { assembleNatalCodex, assembleTodayMoon } from "../lib/nakshatra-codex.js";
import { assembleNakshatraCompat } from "../lib/nakshatra-compat.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { verifyPerUsePayment, logPerUsePaymentProof } from "../lib/nakshatra-paid-access.js";

// 레지스트리(worker/lib/paid-feature-registry.js) 등록값과 일치해야 한다.
const COMPAT_FEATURE_KEY = "nakshatra-compat";
const COMPAT_COIN_PRICE = 100;

// ── I/O 배선 ─────────────────────────────────────────────────────────────────

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
    gender: src.gender === "male" || src.gender === "female" ? src.gender : undefined,
  };
}

// 한 사람의 달 시데리얼 황경 + 숙요 객체를 구한다(Swiss + 음력).
async function resolvePersonMoonAndSukuyo(env, input, requestUrl) {
  const swiss = await getSwissVedicPlanets(env, input, { requestUrl });
  const moonLon = Number(swiss?.planets?.Moon);
  if (!Number.isFinite(moonLon)) return null;
  const lunar = lunarFromInput(input);
  const sukuyo = buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: lunar.isLeap });
  return { moonLon, sukuyo, gender: input.gender };
}

// 동서 통합 궁합(유료 nakshatra-compat) — 프론트 useCoinGate 결제 후 호출. requireAuth로 보호.
async function resolveCompat(env, body, options) {
  const src = body && typeof body === "object" ? body : {};
  const inA = normalizeBirthBody(src.a);
  const inB = normalizeBirthBody(src.b);
  if (!isValidBirth(inA) || !isValidBirth(inB)) {
    return json({ ok: false, code: "INVALID_INPUT", message: "두 사람의 생년월일(a/b)이 필요합니다." }, { status: 400 });
  }
  const [personA, personB] = await Promise.all([
    resolvePersonMoonAndSukuyo(env, inA, options?.requestUrl),
    resolvePersonMoonAndSukuyo(env, inB, options?.requestUrl),
  ]);
  if (!personA || !personB) {
    return json({ ok: false, code: "SWISS_MOON_UNAVAILABLE", message: "달의 위치 계산에 실패했습니다." }, { status: 502 });
  }
  const compat = assembleNakshatraCompat(personA, personB);
  return json({ ok: true, ...compat });
}

function isValidBirth(input) {
  return (
    Number.isFinite(input.year) &&
    Number.isFinite(input.month) &&
    Number.isFinite(input.day) &&
    input.month >= 1 && input.month <= 12 &&
    input.day >= 1 && input.day <= 31
  );
}

function birthUtcFromInput(input) {
  const utcMillis =
    Date.UTC(input.year, input.month - 1, input.day, 0, 0, 0, 0) +
    (input.hour + input.minute / 60 - input.timezone) * 3600000;
  return new Date(utcMillis);
}

function lunarFromInput(input) {
  const lunar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getLunar();
  // lunar-javascript: 윤달이면 getMonth()가 음수. 절댓값이 월, 음수면 윤달.
  const rawMonth = lunar.getMonth();
  return { month: Math.abs(rawMonth), day: lunar.getDay(), isLeap: rawMonth < 0 };
}

async function resolveNatal(env, body, options) {
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, code: "INVALID_INPUT", message: "생년월일(year/month/day)이 필요합니다." }, { status: 400 });
  }
  const swiss = await getSwissVedicPlanets(env, input, { requestUrl: options?.requestUrl });
  const moonLon = Number(swiss?.planets?.Moon);
  if (!Number.isFinite(moonLon)) {
    return json({ ok: false, code: "SWISS_MOON_UNAVAILABLE", message: "달의 위치 계산에 실패했습니다." }, { status: 502 });
  }
  const lunar = lunarFromInput(input);
  const birthUtc = birthUtcFromInput(input);
  const codex = assembleNatalCodex({ moonLon, birthUtc, lunar, timeUnknown: input.timeUnknown, now: new Date() });
  return json({
    ok: true,
    input: {
      year: input.year, month: input.month, day: input.day,
      hour: input.hour, minute: input.minute, timezone: input.timezone,
      lat: input.lat, lon: input.lon, timeUnknown: input.timeUnknown,
    },
    ...codex,
  });
}

async function resolveTodayMoon(env, query, options) {
  const now = new Date();
  // KST 정오 기준으로 오늘 날짜를 잡는다(달 나크샤트라 일간 안정).
  const kst = new Date(now.getTime() + 9 * 3600000);
  const input = {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    hour: 12, minute: 0, timezone: 9,
    lat: 37.5665, lon: 126.978,
  };

  const swiss = await getSwissVedicPlanets(env, input, { requestUrl: options?.requestUrl });
  const moonLon = Number(swiss?.planets?.Moon);
  if (!Number.isFinite(moonLon)) {
    return json({ ok: false, code: "SWISS_MOON_UNAVAILABLE", message: "오늘 달의 위치 계산에 실패했습니다." }, { status: 502 });
  }
  const lunar = lunarFromInput(input);
  const myMansionIndex = query?.get ? query.get("sukuyoIndex") : null;
  const today = assembleTodayMoon({ moonLon, lunar, myMansionIndex });
  return json(
    { ok: true, date: `${input.year}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`, ...today },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

export async function handleNakshatraRoutes(request, env) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  try {
    if (path === "/api/nakshatra/resolve") {
      if (request.method !== "POST") return methodNotAllowed();
      const body = await readJson(request);
      return await resolveNatal(env, body, { requestUrl: request.url });
    }
    if (path === "/api/nakshatra/today") {
      if (request.method !== "GET") return methodNotAllowed();
      const url = new URL(request.url);
      return await resolveTodayMoon(env, url.searchParams, { requestUrl: request.url });
    }
    if (path === "/api/nakshatra/compat") {
      if (request.method !== "POST") return methodNotAllowed();
      // 유료(nakshatra-compat) — 결제창은 프론트 useCoinGate(pass-first)가 처리하고,
      // 서버는 그 결제가 실제로 일어났는지만 DB 기록으로 확인한다.
      // 🔴 1단계는 관측 전용이다 — 로그만 남기고 막지 않는다(차단은 실로그 확인 후 2단계에서).
      const auth = await requireAuth(request, env);
      const body = await readJson(request);
      logPerUsePaymentProof(COMPAT_FEATURE_KEY, await verifyPerUsePayment(env, {
        userId: auth?.userId,
        featureKey: COMPAT_FEATURE_KEY,
        coinPrice: COMPAT_COIN_PRICE,
        requestId: body?.requestId || body?.idempotencyKey || "",
      }));
      return await resolveCompat(env, body, { requestUrl: request.url });
    }
    return notFound(); // /api/nakshatra/* 하위 미해당 경로.
  } catch (error) {
    return handleRouteError(error);
  }
}
