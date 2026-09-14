// AI 반려동물 사주 — 유료 LLM 서술 API (심층 리포트 / 궁합).
// 수치·점수·추천 장소는 전부 결정론 엔진(worker/lib/pet/*)이 계산하고, LLM은 그 사실을 받아 서술만 만든다.
// 결제 확인은 Gemini 호출 이전에 서버에서 강제한다(클라 우회 직접 호출 시 무료 생성 차단, yoga-guru.js 선례).
// ⚠ 생성은 반드시 '동기'. ctx.waitUntil 백그라운드 전환은 Workers 요청 간 I/O 격리와 충돌해 결과가 고착된다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, cookieValue, HttpError } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";



import { computePetBlueprint } from "./pet-saju.js";
import { buildPetCompat } from "../lib/pet/pet-compat.js";
import { normalizeRequestDate } from "../lib/pet/pet-input.js";
import { runPaidNarrativeDelivery } from "../lib/paid-narrative-delivery.js";
import { renderPetNarrative, seedPetReport, seedPetCompat } from "../lib/pet-report-delivery.js";


const REPORT_FEATURE_KEY = "pet-saju-ai-consultation";
const REPORT_TYPE = "petSajuReport";


const COMPAT_FEATURE_KEY = "pet-compatibility-ai";
const COMPAT_REPORT_TYPE = "petCompatReport";


const SYSTEM_PROMPT = [
  "당신은 반려동물 행동과 명리학을 함께 다루는 상담가입니다.",
  "주어진 [사실] 수치는 이미 확정된 계산 결과입니다. 절대 바꾸거나 새 수치를 만들지 마세요.",
  "의학적 진단·처방·질병명은 쓰지 말고, 생활 관리와 보호자의 행동 제안으로만 표현하세요.",
  "문장은 보호자에게 직접 말하듯 가능성과 관찰 조건을 구분해 담백하게 씁니다. 과장·미사여구·이모지는 쓰지 마세요.",
  "반드시 JSON 객체 하나만 출력하세요.",
].join("\n");

function clean(value) {
  return String(value || "").trim();
}

function starsText(stars) {
  return "★".repeat(Math.max(0, Math.min(5, Number(stars) || 0)));
}

async function resolveAccess(request, env, body, { featureKey, reportType, route }, knownAuth) {
  let auth = knownAuth;
  try {
    if (!auth) auth = await requireAuth(request, env);
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

async function handlePetDelivery(request, env, kind) {
  const body = request.method === "POST" ? await readJson(request) : {};
  const auth = await requireAuth(request, env);
  const featureKey = kind === "report" ? REPORT_FEATURE_KEY : COMPAT_FEATURE_KEY;
  const reportType = kind === "report" ? REPORT_TYPE : COMPAT_REPORT_TYPE;
  return runPaidNarrativeDelivery(request, env, auth, body, {
    featureKey, reportType, render: renderPetNarrative,
    timeoutMs: env.PET_SAJU_PROVIDER_TIMEOUT_MS,
    verify: original => resolveAccess(request, env, original, { featureKey, reportType, route: `/api/pet-saju-ai/${kind}` }, auth),
    seed: original => {
      const date = normalizeRequestDate(original.date);
      if (kind === "report") {
        const { blueprint } = computePetBlueprint(original.pet, date);
        return seedPetReport(blueprint, buildReportPrompt(blueprint), SYSTEM_PROMPT);
      }
      const pets = [computePetBlueprint(original.petA, date, "첫째 프로필").blueprint, computePetBlueprint(original.petB, date, "둘째 프로필").blueprint];
      const compat = buildPetCompat(...pets);
      return seedPetCompat(compat, pets, buildCompatPrompt(compat, ...pets), SYSTEM_PROMPT);
    },
  });
}
const handleReport = (request, env) => handlePetDelivery(request, env, "report");
const handleCompat = (request, env) => handlePetDelivery(request, env, "compat");

function routeError(error) {
  if (error.code === "RESULT_STORAGE_UNAVAILABLE") return json({ ok: false, retryable: true, reason: error.code, resultId: error.resultId }, { status: 503 });
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
    if (path === "/result") {
      if (method !== "GET") return methodNotAllowed();
      const kind = new URL(request.url).searchParams.get("kind");
      if (!["report", "compat"].includes(kind)) return json({ ok: false, reason: "INVALID_REPORT_KIND" }, { status: 422 });
      return await handlePetDelivery(request, env, kind);
    }
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
