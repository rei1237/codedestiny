// 운명의 섬 — 자미두수 명반 → 섬 청사진 결정론 변환 API.
// 무인증·무DB 순수 계산 엔드포인트(kasi.js 선례). Mongo 의존이 없으므로
// runAiRouteWithSecurity(몽고 레이트리밋)를 쓰지 않고 인메모리 버킷으로만 제한한다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import { buildIslandBlueprint } from "../lib/island/island-blueprint.js";
import { fnv1a32 } from "../lib/island/island-weights.js";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestBuckets = new Map();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function readClientKey(request) {
  return String(
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local",
  ).slice(0, 160);
}

function checkRateLimit(request) {
  const key = readClientKey(request);
  const now = Date.now();
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function isRealDate(text) {
  const match = String(text || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeGender(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "male" || text === "m") return "male";
  if (text === "female" || text === "f") return "female";
  return "";
}

function kstDateString() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function invalidInput(message) {
  return new HttpError(400, message, { error: "INVALID_INPUT" });
}

function normalizeBlueprintInput(body) {
  const birthDate = String(body?.birthDate || "").trim();
  if (!DATE_PATTERN.test(birthDate) || !isRealDate(birthDate)) {
    throw invalidInput("birthDate는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.");
  }
  const birthYear = Number(birthDate.slice(0, 4));
  if (birthYear < 1900 || birthYear > 2100) throw invalidInput("지원 범위(1900~2100년)를 벗어난 생년입니다.");

  const birthTimeUnknown = body?.birthTimeUnknown === true;
  const birthTime = String(body?.birthTime || "").trim();
  if (!birthTimeUnknown && !TIME_PATTERN.test(birthTime)) {
    throw invalidInput("birthTime은 HH:MM 형식이어야 합니다. 모르면 birthTimeUnknown=true로 보내주세요.");
  }

  const gender = normalizeGender(body?.gender);
  if (!gender) throw invalidInput("gender는 male 또는 female이어야 합니다.");

  const calendarType = String(body?.calendarType || "solar").trim().toLowerCase() === "lunar" ? "lunar" : "solar";
  const isLeapMonth = body?.isLeapMonth === true;

  // 테스트/검증용 날짜 오버라이드(결정론 재현). 미지정 시 KST 오늘.
  let date = String(body?.date || "").trim();
  if (date) {
    if (!DATE_PATTERN.test(date) || !isRealDate(date)) throw invalidInput("date는 YYYY-MM-DD 형식이어야 합니다.");
  } else {
    date = kstDateString();
  }

  return {
    chartInput: { birthDate, birthTime: birthTimeUnknown ? "" : birthTime, birthTimeUnknown, calendarType, isLeapMonth, gender },
    date,
    birthYear,
  };
}

async function handleBlueprint(request) {
  const body = await readJson(request);
  const { chartInput, date, birthYear } = normalizeBlueprintInput(body);
  const currentYear = Number(date.slice(0, 4));

  let chart;
  try {
    chart = calculateZiweiAiChart(chartInput, { year: currentYear });
  } catch (error) {
    if (error?.code === "INVALID_INPUT") throw invalidInput("생년월일 정보로 명반을 계산할 수 없습니다.");
    throw error;
  }

  const userKey = fnv1a32(
    [chartInput.birthDate, chartInput.birthTimeUnknown ? "unknown" : chartInput.birthTime, chartInput.gender, chartInput.calendarType, chartInput.isLeapMonth ? "leap" : "plain"].join("|"),
  ).toString(16);

  const blueprint = buildIslandBlueprint(chart, { userKey, date, currentYear, birthYear });
  return json({ ok: true, blueprint });
}

function routeError(error) {
  if (error instanceof HttpError) {
    return json({ ok: false, error: error.payload?.error || "BAD_REQUEST", message: error.message }, { status: error.status });
  }
  console.error("[ziwei-island] blueprint failed", { name: error?.name, message: String(error?.message || "").slice(0, 300) });
  return json({ ok: false, error: "ISLAND_BUILD_FAILED", message: "섬 청사진 생성 중 오류가 발생했습니다." }, { status: 500 });
}

export async function handleZiweiIslandRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/ziwei-island");
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (path === "/blueprint") {
      if (method !== "POST") return methodNotAllowed();
      if (!checkRateLimit(request)) {
        return json(
          { ok: false, error: "RATE_LIMITED", message: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." },
          { status: 429, headers: { "Retry-After": "60" } },
        );
      }
      return await handleBlueprint(request);
    }
    return notFound();
  } catch (error) {
    return routeError(error);
  }
}
