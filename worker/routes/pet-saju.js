// AI 반려동물 사주 — 프로필 → 오행 청사진 결정론 변환 API.
// 무인증·무DB 순수 계산 엔드포인트(ziwei-island.js 선례). Mongo 의존이 없으므로
// runAiRouteWithSecurity(몽고 레이트리밋)를 쓰지 않고 인메모리 버킷으로만 제한한다.
// 무료 구간이므로 유료 전용 섹션(blueprint.deep)은 응답에서 제거하고 내려준다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { buildPetBlueprint } from "../lib/pet/pet-blueprint.js";
import { SPECIES_TABLE, BREED_TABLE, TRAIT_TABLE, ACTIVITY_LEVELS, ENVIRONMENT_TABLE, COMPANION_TABLE } from "../lib/pet/pet-elements.js";
import { buildPetKey, invalidPetInput, normalizePetProfile, normalizeRequestDate } from "../lib/pet/pet-input.js";

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

/** 반려동물 사주 계산 — 프로필 정규화 → 명식 → 청사진. 유료 라우트와 공용. */
export function computePetBlueprint(rawProfile, date, label = "프로필") {
  const profile = normalizePetProfile(rawProfile, label);
  let saju;
  try {
    saju = calculateLifeBookAiSaju({
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthTimeUnknown: profile.birthTimeUnknown,
      calendarType: "solar",
    });
  } catch (error) {
    if (error?.code === "INVALID_BIRTH_DATE" || error?.code === "INVALID_BIRTH_TIME") {
      throw invalidPetInput(`${label}: 생년월일 정보로 명식을 계산할 수 없습니다.`);
    }
    throw error;
  }
  const petKey = buildPetKey(profile);
  return { profile, saju, blueprint: buildPetBlueprint(profile, saju, { date, petKey }) };
}

function stripPaidSections(blueprint) {
  const { deep, ...free } = blueprint;
  return free;
}

async function handleBlueprint(request) {
  const body = await readJson(request);
  const date = normalizeRequestDate(body?.date);
  const { blueprint } = computePetBlueprint(body?.pet || body, date);
  return json({ ok: true, blueprint: stripPaidSections(blueprint) });
}

/** 프론트가 종/품종/성격 목록을 하드코딩하지 않도록 서버 상수를 그대로 내려준다. */
function handleCatalog() {
  const species = Object.entries(SPECIES_TABLE).map(([key, value]) => ({
    key,
    labelKo: value.labelKo,
    emoji: value.emoji,
    keywords: value.keywords,
    themeId: value.themeId,
    themeLabel: value.themeLabel,
    effect: value.effect,
    intro: value.intro,
    elements: value.ratio,
  }));
  const breeds = Object.fromEntries(
    Object.entries(BREED_TABLE).map(([speciesKey, table]) => [
      speciesKey,
      Object.entries(table).map(([key, value]) => ({ key, labelKo: value.labelKo, note: value.note })),
    ]),
  );
  const traits = Object.entries(TRAIT_TABLE).map(([key, value]) => ({ key, labelKo: value.labelKo }));
  const activityLevels = Object.entries(ACTIVITY_LEVELS).map(([key, value]) => ({ key, labelKo: value.labelKo }));
  const environments = Object.entries(ENVIRONMENT_TABLE).map(([key, value]) => ({ key, labelKo: value.labelKo }));
  const companions = Object.entries(COMPANION_TABLE).map(([key, value]) => ({ key, labelKo: value.labelKo }));
  return json({ ok: true, catalog: { species, breeds, traits, activityLevels, environments, companions } });
}

function routeError(error) {
  if (error instanceof HttpError) {
    return json({ ok: false, error: error.payload?.error || "BAD_REQUEST", message: error.message }, { status: error.status });
  }
  console.error("[pet-saju] blueprint failed", { name: error?.name, message: String(error?.message || "").slice(0, 300) });
  return json({ ok: false, error: "PET_BLUEPRINT_FAILED", message: "반려동물 사주 계산 중 오류가 발생했습니다." }, { status: 500 });
}

export async function handlePetSajuRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/pet-saju");
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (path === "/catalog") {
      if (method !== "GET") return methodNotAllowed();
      return handleCatalog();
    }
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
