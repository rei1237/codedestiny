// 운명의 섬 — 자미두수 명반 → 섬 청사진 결정론 변환 API.
// 무인증·무DB 순수 계산 엔드포인트(kasi.js 선례). Mongo 의존이 없으므로
// runAiRouteWithSecurity(몽고 레이트리밋)를 쓰지 않고 인메모리 버킷으로만 제한한다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import { buildIslandBlueprint } from "../lib/island/island-blueprint.js";
import { invalidIslandInput, normalizeIslandBirthInput } from "../lib/island/island-input.js";
import { fnv1a32 } from "../lib/island/island-weights.js";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestBuckets = new Map();

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
    // 버킷이 무한히 자라지 않게 만료분을 함께 청소한다(워커 인스턴스 수명 동안만 사는 맵이다).
    if (requestBuckets.size > 512) {
      for (const [bucketKey, bucket] of requestBuckets) {
        if (bucket.resetAt <= now) requestBuckets.delete(bucketKey);
      }
    }
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

async function handleBlueprint(request) {
  const body = await readJson(request);
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
