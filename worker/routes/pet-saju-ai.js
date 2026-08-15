// AI 반려동물 사주 — 유료 LLM 서술 API (심층 리포트 / 궁합).
// 수치·점수·추천 장소는 전부 결정론 엔진(worker/lib/pet/*)이 계산하고, LLM은 그 사실을 받아 서술만 만든다.
// 결제 확인은 Gemini 호출 이전에 서버에서 강제한다(클라 우회 직접 호출 시 무료 생성 차단, yoga-guru.js 선례).
// ⚠ 생성은 반드시 '동기'. ctx.waitUntil 백그라운드 전환은 Workers 요청 간 I/O 격리와 충돌해 결과가 고착된다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, cookieValue, HttpError } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { computePetBlueprint } from "./pet-saju.js";
import { buildPetCompat } from "../lib/pet/pet-compat.js";
import { normalizeRequestDate } from "../lib/pet/pet-input.js";

const REPORT_FEATURE_KEY = "pet-saju-ai-consultation";
const REPORT_TYPE = "petSajuReport";
const REPORT_TITLE = "반려동물 사주 AI 심층 리포트";

const COMPAT_FEATURE_KEY = "pet-compatibility-ai";
const COMPAT_REPORT_TYPE = "petCompatReport";
const COMPAT_TITLE = "반려동물 궁합 분석";

const SYSTEM_PROMPT = [
  "당신은 반려동물 행동과 명리학을 함께 다루는 상담가입니다.",
  "주어진 [사실] 수치는 이미 확정된 계산 결과입니다. 절대 바꾸거나 새 수치를 만들지 마세요.",
  "의학적 진단·처방·질병명은 쓰지 말고, 생활 관리와 보호자의 행동 제안으로만 표현하세요.",
  "문장은 보호자에게 직접 말하듯 담백하고 단정적으로 씁니다. 과장·미사여구·이모지는 쓰지 마세요.",
  "반드시 JSON 객체 하나만 출력하세요.",
].join("\n");

function clean(value) {
  return String(value || "").trim();
}

function starsText(stars) {
  return "★".repeat(Math.max(0, Math.min(5, Number(stars) || 0)));
}

async function resolveAccess(request, env, body, { featureKey, reportType, route }) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      throw new HttpError(401, "로그인 후 이용해 주세요.", { error: "UNAUTHORIZED" });
    }
    throw error;
  }

  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, reportType, {
    ...(body || {}),
    featureKey,
    reportType,
    transactionId: clean(body?.transactionId),
    purchaseId: clean(body?.purchaseId),
    requestId: clean(body?.requestId),
    sessionId: clean(body?.sessionId),
    premiumAccessToken: clean(
      request.headers.get("x-premium-access-token")
      || body?.premiumAccessToken
      || cookieValue(request, "cd_premium_access")
      || "",
    ) || undefined,
    _accessRoute: route,
  });

  if (!access?.ok) {
    const status = Number(access?.status || 402);
    throw new HttpError(status, status === 401 ? "로그인 후 이용해 주세요." : "결제 확인이 필요합니다.", {
      error: access?.code || "PAYMENT_REQUIRED",
    });
  }
  return { auth, access };
}

// ── 심층 리포트 ────────────────────────────────────────────────

function buildReportFacts(blueprint) {
  const name = blueprint.name || "이 아이";
  const elements = blueprint.elements.map((item) => `${item.key} ${item.percent}%`).join(" / ");
  const metrics = blueprint.metrics.map((item) => `${item.labelKo} ${item.value}점`).join(" / ");
  const habitats = blueprint.deep.habitats
    .map((item, index) => `${index + 1}. ${item.labelKo}(${item.category}) ${starsText(item.stars)} — 채우는 기운 ${item.supplies.join("·")}, 눌러 주는 기운 ${item.soothes.join("·")}`)
    .join("\n");
  const daily = blueprint.daily.map((item) => `${item.labelKo} ${starsText(item.stars)}`).join(" / ");

  return [
    `[사실]`,
    `이름=${name}`,
    `종=${blueprint.species.labelKo} (기본 키워드: ${blueprint.species.keywords.join(", ")})`,
    `품종=${blueprint.breed ? blueprint.breed.labelKo : "일반"}${blueprint.breed?.note ? ` — ${blueprint.breed.note}` : ""}`,
    `성장단계=${blueprint.stage.labelKo} (약 ${blueprint.stage.ageYears}살)`,
    `생활환경=${blueprint.environment.labelKo} / ${blueprint.environment.companionLabelKo}`,
    `명식=${blueprint.natal.pillars.year} ${blueprint.natal.pillars.month} ${blueprint.natal.pillars.day} ${blueprint.natal.pillars.hour || "(시주 미상)"}`,
    `오행분포=${elements}`,
    `가장 강한 기운=${blueprint.balance.excessElement} / 가장 부족한 기운=${blueprint.balance.usefulElement}`,
    `오늘 일진=${blueprint.today.ganji}(${blueprint.today.element}) — 부족 기운과의 관계: ${blueprint.today.relation}`,
    `8지표=${metrics}`,
    `오늘의 운세=${daily}`,
    `추천 환경 5곳:`,
    habitats,
    `추천 놀이=${blueprint.deep.plays.map((item) => item.labelKo).join(", ")}`,
    `행복 코치 행동=${blueprint.deep.coach?.action || ""}`,
  ].join("\n");
}

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return SYSTEM_PROMPT;
}

/* 관리자 프롬프트 랩 전용. 결제·LLM 없이 프로덕션과 똑같은 프롬프트를 조립한다
   (lib/admin/prompt-lab-registry.mjs 참고). 생년 프로필이 아니라 반려동물 정보를 받는다. */
export function buildAdminLabPrompt(body = {}) {
  const date = normalizeRequestDate(body?.date);
  const { blueprint } = computePetBlueprint(body?.pet, date);

  return {
    systemPrompt: SYSTEM_PROMPT,
    prompt: buildReportPrompt(blueprint),
  };
}

function buildReportPrompt(blueprint) {
  return [
    buildReportFacts(blueprint),
    "",
    "위 사실만 근거로 아래 JSON 스키마를 채우세요. 수치는 사실 그대로 인용하고 새로 만들지 마세요.",
    JSON.stringify({
      personality: ["문단1", "문단2", "문단3"],
      habitats: [{ id: "사실의 장소 id 그대로", reading: "왜 이 장소가 이 아이에게 맞는지 2~3문장" }],
      plays: ["놀이 제안 1", "놀이 제안 2", "놀이 제안 3"],
      coach: "오늘 보호자가 할 행동 1가지를 2문장으로",
      care: "생활 관리 관점의 컨디션 조언 3~4문장 (진단·질병명 금지)",
      closing: "보호자에게 건네는 마무리 2문장",
    }),
    "",
    "personality는 각 문단 3~5문장. habitats는 사실에 나온 5곳 전부를 같은 순서로 채우세요.",
  ].join("\n");
}

function fallbackReport(blueprint) {
  const name = blueprint.name || "이 아이";
  const useful = blueprint.balance.usefulElement;
  const excess = blueprint.balance.excessElement;
  return {
    personality: blueprint.summary.paragraphs,
    habitats: blueprint.deep.habitats.map((item) => ({
      id: item.id,
      reading: `${item.labelKo}은(는) ${item.supplies.join("·")}기운을 채워 주고 ${item.soothes.join("·")}기운을 눌러 줍니다. ${name}에게 부족한 ${useful}을 보충하는 자리라 머무는 시간이 길수록 컨디션이 안정됩니다.`,
    })),
    plays: blueprint.deep.plays.map((item) => `${item.labelKo} — 부족한 ${useful}기운을 자연스럽게 채워 줍니다.`),
    coach: blueprint.deep.coach?.action || `오늘은 ${useful}기운을 채우는 시간을 15분만 만들어 주세요.`,
    care: `${excess}기운이 강해 쉽게 달아오를 수 있습니다. 활동 뒤에는 반드시 조용한 회복 시간을 붙여 주세요. 식사와 잠자리 시간을 매일 같게 유지하면 기복이 줄어듭니다. 평소와 다른 신호가 이어지면 생활 리듬부터 먼저 점검해 주세요.`,
    closing: `${name}의 기운은 보호자가 만들어 주는 하루의 리듬을 그대로 따라갑니다. 오늘 한 가지만 바꿔도 충분합니다.`,
    degraded: true,
  };
}

function normalizeReport(parsed, blueprint) {
  if (!parsed || typeof parsed !== "object") return null;
  const personality = Array.isArray(parsed.personality) ? parsed.personality.map(clean).filter(Boolean) : [];
  if (personality.length < 2) return null;

  const readingById = new Map();
  for (const item of Array.isArray(parsed.habitats) ? parsed.habitats : []) {
    const id = clean(item?.id);
    const reading = clean(item?.reading);
    if (id && reading) readingById.set(id, reading);
  }

  return {
    personality,
    habitats: blueprint.deep.habitats.map((item) => ({
      id: item.id,
      reading: readingById.get(item.id) || `${item.labelKo}은(는) ${item.supplies.join("·")}기운을 채워 주는 자리입니다.`,
    })),
    plays: (Array.isArray(parsed.plays) ? parsed.plays.map(clean).filter(Boolean) : []).slice(0, 5),
    coach: clean(parsed.coach) || blueprint.deep.coach?.action || "",
    care: clean(parsed.care),
    closing: clean(parsed.closing),
    degraded: false,
  };
}

// ── 궁합 ──────────────────────────────────────────────────────

function buildCompatFacts(compat, blueprintA, blueprintB) {
  const nameA = blueprintA.name || "첫째";
  const nameB = blueprintB.name || "둘째";
  const dims = compat.dimensions.map((item) => `${item.labelKo} ${item.value}점 ${starsText(item.stars)}`).join(" / ");
  const places = compat.sharedPlaces.map((item, index) => `${index + 1}. ${item.labelKo}(${item.category}) ${starsText(item.stars)}`).join("\n");

  return [
    `[사실]`,
    `${nameA}=${blueprintA.species.labelKo}/${blueprintA.breed ? blueprintA.breed.labelKo : "일반"}, 강한 기운 ${compat.pets[0].excessElement}, 부족한 기운 ${compat.pets[0].usefulElement}`,
    `${nameB}=${blueprintB.species.labelKo}/${blueprintB.breed ? blueprintB.breed.labelKo : "일반"}, 강한 기운 ${compat.pets[1].excessElement}, 부족한 기운 ${compat.pets[1].usefulElement}`,
    `오행 관계=${nameA}→${nameB} ${compat.elementRelation.aToB} / ${nameB}→${nameA} ${compat.elementRelation.bToA}`,
    `보완 점수=${compat.complement} / 증폭 위험=${compat.amplifyRisk}`,
    `종합 점수=${compat.score}점 (${compat.grade})`,
    `5축=${dims}`,
    `함께 가면 좋은 장소:`,
    places,
    `엔진 메모:`,
    compat.notes.map((note) => `- ${note}`).join("\n"),
  ].join("\n");
}

function buildCompatPrompt(compat, blueprintA, blueprintB) {
  return [
    buildCompatFacts(compat, blueprintA, blueprintB),
    "",
    "위 사실만 근거로 아래 JSON 스키마를 채우세요. 점수·등급·장소는 사실 그대로 쓰고 새로 만들지 마세요.",
    JSON.stringify({
      verdict: "두 아이 관계를 한 문장으로",
      overview: ["문단1", "문단2"],
      dimensions: [{ key: "사실의 5축 key 그대로", reading: "이 축이 왜 이 점수인지 2문장" }],
      places: [{ id: "사실의 장소 id 그대로", reading: "두 아이가 함께 있을 때 이 장소가 좋은 이유 2문장" }],
      cautions: ["주의할 상황 1", "주의할 상황 2"],
      routine: "두 아이가 함께 지내는 하루 루틴 제안 3~4문장",
    }),
    "",
    "dimensions는 5축 전부를 같은 순서로 채우세요. places는 사실에 나온 장소 전부를 채우세요.",
  ].join("\n");
}

function fallbackCompat(compat) {
  const [petA, petB] = compat.pets;
  return {
    verdict: `${compat.grade} — 종합 ${compat.score}점의 관계입니다.`,
    overview: compat.notes.slice(0, 2),
    dimensions: compat.dimensions.map((item) => ({
      key: item.key,
      reading: `${item.labelKo}은(는) ${item.value}점입니다. ${item.inverted ? "수치가 낮을수록 좋은 축이며, 자원이 겹치는 상황을 줄이면 더 내려갑니다." : "지금 흐름을 유지하면 이 축은 안정적으로 이어집니다."}`,
    })),
    places: compat.sharedPlaces.map((item) => ({
      id: item.id,
      reading: `${item.labelKo}은(는) 두 아이가 각자 원하는 거리를 지키면서도 같은 공간에 있을 수 있는 자리입니다.`,
    })),
    cautions: [
      `${petA.excessElement}기운과 ${petB.excessElement}기운이 동시에 올라가는 시간대에는 자원(밥그릇·잠자리)을 분리해 주세요.`,
      `한쪽이 먼저 지치면 나머지가 계속 요구할 수 있습니다. 각자의 휴식 공간을 따로 확보해 주세요.`,
    ],
    routine: `아침에는 각자 따로 활동을 시작하고, 낮에 짧은 합동 놀이를 한 번 넣습니다. 저녁에는 다시 각자의 자리로 분리해 휴식하게 하세요. 하루 한 번은 두 아이를 같은 공간에서 같은 시간에 먹이면 관계가 안정됩니다.`,
    degraded: true,
  };
}

function normalizeCompat(parsed, compat) {
  if (!parsed || typeof parsed !== "object") return null;
  const overview = Array.isArray(parsed.overview) ? parsed.overview.map(clean).filter(Boolean) : [];
  if (!clean(parsed.verdict) || overview.length < 1) return null;

  const dimById = new Map();
  for (const item of Array.isArray(parsed.dimensions) ? parsed.dimensions : []) {
    const key = clean(item?.key);
    const reading = clean(item?.reading);
    if (key && reading) dimById.set(key, reading);
  }
  const placeById = new Map();
  for (const item of Array.isArray(parsed.places) ? parsed.places : []) {
    const id = clean(item?.id);
    const reading = clean(item?.reading);
    if (id && reading) placeById.set(id, reading);
  }

  return {
    verdict: clean(parsed.verdict),
    overview,
    dimensions: compat.dimensions.map((item) => ({
      key: item.key,
      reading: dimById.get(item.key) || `${item.labelKo}은(는) ${item.value}점입니다.`,
    })),
    places: compat.sharedPlaces.map((item) => ({
      id: item.id,
      reading: placeById.get(item.id) || `${item.labelKo}은(는) 두 아이가 함께 머물기 좋은 자리입니다.`,
    })),
    cautions: (Array.isArray(parsed.cautions) ? parsed.cautions.map(clean).filter(Boolean) : []).slice(0, 4),
    routine: clean(parsed.routine),
    degraded: false,
  };
}

// ── 생성 공통 ─────────────────────────────────────────────────

function parseJsonLoose(text) {
  const source = clean(text);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (_) {
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(source.slice(start, end + 1));
    } catch (_) {
      return null;
    }
  }
}

async function generateNarration(env, prompt, cacheKeyExtra, baseTokens, minChars) {
  const ai = await callGeminiJsonWithRetry(env, prompt, {
    systemPrompt: SYSTEM_PROMPT,
    taskType: "fortune",
    temperature: 0.55,
    attempts: 2,
    timeoutMs: Number(env.PET_SAJU_PROVIDER_TIMEOUT_MS || 45000),
    baseTokens,
    capTokens: Math.round(baseTokens * 1.8),
    fallbackToWorkersAI: true,
    // 짧은 폴백 응답이 정상 리포트로 팔리지 않게 막는다(관례: 최소 분량 × 0.4).
    // 미달이면 호출이 실패로 돌아 아래 degraded 템플릿(fallbackReport/fallbackCompat)이 대신한다.
    fallbackMinChars: Math.round(minChars * 0.4),
    cache: {
      store: createLlmCacheStore(env),
      deterministic: true,
      ttlSeconds: 7 * 24 * 60 * 60,
      keyExtra: cacheKeyExtra,
    },
  });
  if (!ai?.ok || !hasRenderableLlmText(ai.text)) return null;
  return parseJsonLoose(ai.text);
}

// ── 라우트 핸들러 ─────────────────────────────────────────────

async function handleReport(request, env) {
  const body = await readJson(request);
  await resolveAccess(request, env, body, {
    featureKey: REPORT_FEATURE_KEY,
    reportType: REPORT_TYPE,
    route: "/api/pet-saju-ai/report",
  });

  const date = normalizeRequestDate(body?.date);
  const { blueprint } = computePetBlueprint(body?.pet, date);

  const parsed = await generateNarration(
    env,
    buildReportPrompt(blueprint),
    `pet-report-v1-${blueprint.petKey}-${date}`,
    3400,
    1400, // 리포트 문장 스펙 합산(성격 문단 + 명당 5곳 + 코칭/케어/맺음) 최소치
  );
  const report = normalizeReport(parsed, blueprint) || fallbackReport(blueprint);

  return json({ ok: true, title: REPORT_TITLE, blueprint, report });
}

async function handleCompat(request, env) {
  const body = await readJson(request);
  await resolveAccess(request, env, body, {
    featureKey: COMPAT_FEATURE_KEY,
    reportType: COMPAT_REPORT_TYPE,
    route: "/api/pet-saju-ai/compat",
  });

  const date = normalizeRequestDate(body?.date);
  const { blueprint: blueprintA } = computePetBlueprint(body?.petA, date, "첫째 프로필");
  const { blueprint: blueprintB } = computePetBlueprint(body?.petB, date, "둘째 프로필");
  const compat = buildPetCompat(blueprintA, blueprintB);

  const parsed = await generateNarration(
    env,
    buildCompatPrompt(compat, blueprintA, blueprintB),
    `pet-compat-v1-${blueprintA.petKey}-${blueprintB.petKey}-${date}`,
    3000,
    1200, // 궁합 문장 스펙 합산(차원 리딩 + 공유 명당 + 주의/루틴) 최소치
  );
  const reading = normalizeCompat(parsed, compat) || fallbackCompat(compat);

  return json({ ok: true, title: COMPAT_TITLE, compat, reading, pets: [blueprintA, blueprintB] });
}

function routeError(error) {
  if (error instanceof HttpError) {
    return json({ ok: false, error: error.payload?.error || "BAD_REQUEST", message: error.message }, { status: error.status });
  }
  console.error("[pet-saju-ai] generation failed", { name: error?.name, message: String(error?.message || "").slice(0, 300) });
  return json({ ok: false, error: "PET_AI_FAILED", message: "리포트 생성 중 오류가 발생했습니다." }, { status: 500 });
}

export async function handlePetSajuAiRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/pet-saju-ai");
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (path === "/report") {
      if (method !== "POST") return methodNotAllowed();
      return await handleReport(request, env);
    }
    if (path === "/compat") {
      if (method !== "POST") return methodNotAllowed();
      return await handleCompat(request, env);
    }
    return notFound();
  } catch (error) {
    return routeError(error);
  }
}
