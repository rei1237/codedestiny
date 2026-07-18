import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";

const FEATURE_KEY = "saju-guardian-unlock";
// NVIDIA NIM Visual GenAI — flux.1-schnell. 엔드포인트에 모델이 포함되므로 body에 model을 넣지 않는다.
const NVIDIA_ENDPOINT = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";
const GUARDIAN_IMAGE_TIMEOUT_MS = 60_000;

const ELEMENT_VISUAL_KEYWORDS = Object.freeze({
  목: "ancient mystical forest guardian spirit, jade green energy aura, flowing vine armor",
  화: "celestial phoenix guardian warrior, crimson flame aura, vermillion feather mantle",
  토: "stone sentinel guardian deity, golden earth energy, terracotta warrior aesthetic",
  금: "lunar blade guardian knight, silver moonlight aura, crystalline armor shards",
  수: "abyssal tide guardian sage, deep indigo water flow, ink wash silhouette",
});

const ELEMENT_ALIASES = Object.freeze({
  wood: "목", 목: "목", 木: "목",
  fire: "화", 화: "화", 火: "화",
  earth: "토", 토: "토", 土: "토",
  metal: "금", 금: "금", 金: "금",
  water: "수", 수: "수", 水: "수",
});

const ELEMENT_COLOR_EN = Object.freeze({
  목: "jade green", 화: "crimson coral", 토: "golden sand", 금: "ivory silver", 수: "deep sky blue",
});

const ANIMAL_EN = Object.freeze({
  쥐: "rat", 소: "ox", 호랑이: "tiger", 토끼: "rabbit", 용: "dragon", 뱀: "snake",
  말: "horse", 양: "goat", 원숭이: "monkey", 닭: "rooster", 개: "dog", 돼지: "pig",
});

function cleanText(value) {
  return String(value ?? "").trim();
}

function resolveElement(sajuData = {}) {
  const raw = cleanText(sajuData.elements || sajuData.element || sajuData.dominantElement).toLowerCase();
  return ELEMENT_ALIASES[raw] || ELEMENT_ALIASES[raw.charAt(0)] || "목";
}

function buildGuardianImagePrompt(sajuData = {}) {
  const element = resolveElement(sajuData);
  const elementKeyword = ELEMENT_VISUAL_KEYWORDS[element];
  const animalKo = cleanText(sajuData.mainAnimal || sajuData.animal);
  const animalEn = ANIMAL_EN[animalKo] || "mythical beast";
  const colorEn = ELEMENT_COLOR_EN[element] || "luminous";
  const polarity = cleanText(sajuData.polarity);
  const toneKeyword = polarity === "음"
    ? "gentle, mysterious, moonlit, serene expression"
    : "radiant, bold, dynamic, sunlit expression";
  return [
    "A cute yet majestic Korean mythological guardian spirit (수호신)",
    `in the form of a small adorable ${animalEn} companion,`,
    `${elementKeyword},`,
    `${colorEn} glowing aura, ${toneKeyword},`,
    "summoning circle mandala background with classical Korean geometric patterns (팔괘, 천간지지 symbols),",
    "divine ethereal presence, intricate detail,",
    "ink wash painting meets digital art (수묵화 style with luminous energy), premium storybook illustration charm,",
    "dramatic sacred lighting, mystical atmosphere,",
    "no text, no letters, no watermark, no signature, no real human face,",
    "ultra detailed, 8k resolution, masterpiece",
  ].join(" ");
}

function resolveDeterministicSeed(sajuData = {}) {
  const year = Number(sajuData.year) || 0;
  const month = Number(sajuData.month) || 0;
  const day = Number(sajuData.day) || 0;
  const hour = Number(sajuData.hour);
  const hourPart = Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : 0;
  return (year * 100000 + month * 1000 + day * 10 + (hourPart % 10)) % 2147483647;
}

function createTimeoutSignal(timeoutMs = GUARDIAN_IMAGE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
}

function extractImageBase64(payload = {}) {
  const artifact = Array.isArray(payload?.artifacts) ? payload.artifacts[0] : null;
  const dataItem = Array.isArray(payload?.data) ? payload.data[0] : null;
  return cleanText(
    artifact?.base64
    || artifact?.b64_json
    || dataItem?.b64_json
    || payload?.image
    || (Array.isArray(payload?.images) ? payload.images[0] : ""),
  );
}

async function requestGuardianImage(env, sajuData) {
  const apiKey = cleanText(env?.NVIDIA_DRAW_API_KEY);
  if (!apiKey) throw new Error("NVIDIA_DRAW_API_KEY is not configured.");

  const seed = resolveDeterministicSeed(sajuData);
  const prompt = buildGuardianImagePrompt(sajuData);
  const timeout = createTimeoutSignal();

  try {
    const response = await fetch(NVIDIA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt,
        mode: "base",
        cfg_scale: 0,
        width: 1024,
        height: 1024,
        seed,
        steps: 4,
        samples: 1,
      }),
      signal: timeout.signal,
    });

    const payload = await response.json().catch(() => ({}));
    const base64 = extractImageBase64(payload);
    if (!response.ok || !base64) {
      const detail = cleanText(JSON.stringify(payload)).slice(0, 300);
      throw new Error(`NVIDIA image generation failed (status=${response.status}) ${detail}`);
    }

    return { imageBase64: base64, seed };
  } finally {
    timeout.clear();
  }
}

async function handleGenerateImage(request, env, auth) {
  const access = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env });
  if (!access.allowed) {
    return json({
      ok: false,
      reason: access.reason || "PAYMENT_REQUIRED",
      message: "사주 가디언 소환진을 먼저 해금해 주세요.",
    }, { status: 402 });
  }

  const body = await readJson(request);
  const sajuData = body?.sajuData && typeof body.sajuData === "object" ? body.sajuData : {};

  try {
    const result = await requestGuardianImage(env, sajuData);
    return json({ ok: true, ...result });
  } catch (error) {
    console.error("[guardian-image-generation-failed]", String(error?.message || error));
    return json({
      ok: false,
      reason: "IMAGE_GENERATION_FAILED",
      message: "수호신 이미지를 생성하지 못했어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }
}

export async function handleSajuGuardianImageRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/guardian");

  try {
    if (method === "POST" && path === "/generate-image") {
      const auth = await requireUserFromRequest(request, env);
      return await handleGenerateImage(request, env, auth);
    }
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request, env });
  }
}
