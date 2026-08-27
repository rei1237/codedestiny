// 나크샤트라 결정판 — 무인증 무료 계산 라우트 (I/O 배선)
//
//   POST /api/nakshatra/resolve  : 생년월일(+시각·출생지) → 동양/인도/통합 3-뷰
//   GET  /api/nakshatra/today    : 오늘의 달(달의 나크샤트라 + 대응 숙요) + (선택)개인 격각·타라발라
//   POST /api/nakshatra/compat   : 동서 통합 궁합(유료·회당결제 ₩10,000)
//
// 위 두 무료 라우트는 결제 게이팅·인증이 없다. compat 만 인증 + 결제 증빙 확인을 거친다.
// 순수 조립 로직은 worker/lib/nakshatra-codex.js(WASM 비의존)에 있고, 이 파일은
// Swiss WASM(시데리얼 Lahiri) + 한국 음양력 코어(음력) I/O만 배선한다.

import { solarToLunar } from "../../lib/korean-calendar/index.js";
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
  const sukuyo = buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: lunar.isLeap, source: "korean-calendar-core" });
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
    // 🔴 한국 음양력 코어의 지원 범위(1900~2100)다. 밖이면 음력을 못 만들므로 여기서 400 으로 끊는다.
    Number.isFinite(input.year) && input.year >= 1900 && input.year <= 2100 &&
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

// 🔴 음력은 한국 음양력 코어(KST 삭 기준)가 낸다. 중국 음력(lunar-javascript)은 삭이 CST 23시대에
//    들면 그 달 전체가 하루 밀려 27수 본명숙이 통째로 다른 수가 된다(실측 3.57%).
//    생시는 음력일을 바꾸지 않으므로 코어는 날짜만 받는다.
function lunarFromInput(input) {
  const lunar = solarToLunar(input.year, input.month, input.day);
  if (!lunar) throw new RangeError(`지원 범위 밖 생년월일: ${input.year}-${input.month}-${input.day}`);
  return { month: lunar.lunarMonth, day: lunar.lunarDay, isLeap: lunar.isLeapMonth };
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
      // 🔴 증빙 확인이 터져도 결제한 사용자의 본문을 막지 않는다(관측 단계에서 500 을 새로 만들지 않는다).
      try {
        logPerUsePaymentProof(COMPAT_FEATURE_KEY, await verifyPerUsePayment(env, {
          userId: auth?.userId,
          featureKey: COMPAT_FEATURE_KEY,
          coinPrice: COMPAT_COIN_PRICE,
          requestId: body?.requestId || body?.idempotencyKey || "",
        }));
      } catch (error) {
        logPerUsePaymentProof(COMPAT_FEATURE_KEY, { proven: null, source: "", reason: "VERIFY_THREW" });
        console.error("[nakshatra-paid-access] verify failed", String(error?.message || error).slice(0, 200));
      }
      return await resolveCompat(env, body, { requestUrl: request.url });
    }
    return notFound(); // /api/nakshatra/* 하위 미해당 경로.
  } catch (error) {
    return handleRouteError(error);
  }
}

// 🔴 검증 전용 표면. verify:sukuyo-korean-calendar 가 음력 축을 **실제로 실행해** 본다 —
//    import 수준 검사만으로는 이관이 남긴 죽은 참조를 못 본다(PR-E2 에서 실제로 놓쳤다).
export const __nakshatraTestUtils = { normalizeBirthBody, isValidBirth, lunarFromInput };
