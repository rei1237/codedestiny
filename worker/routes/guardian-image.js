import { handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";

const FEATURE_KEY = "saju-guardian-unlock";
const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/infer";
const NVIDIA_MODEL = "black-forest-labs/flux.1-schnell";
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

function cleanText(value) {
  return String(value ?? "").trim();
}

function resolveElementVisualKeyword(sajuData = {}) {
  const raw = cleanText(sajuData.elements || sajuData.element || sajuData.dominantElement).toLowerCase();
  const normalized = ELEMENT_ALIASES[raw] || ELEMENT_ALIASES[raw.charAt(0)] || "목";
  return ELEMENT_VISUAL_KEYWORDS[normalized];
}

function buildGuardianImagePrompt(sajuData = {}) {
  const elementKeyword = resolveElementVisualKeyword(sajuData);
  return [
    "A majestic Korean mythological guardian spirit (수호신),",
    `${elementKeyword},`,
    "summoning circle mandala background with classical Korean geometric patterns (팔괘, 천간지지 symbols),",
    "divine ethereal presence, intricate detail,",
    "ink wash painting meets digital art (수묵화 style with luminous energy),",
    "dramatic sacred lighting, mystical atmosphere,",
    "ultra detailed, 8k resolution, masterpiece",
  ].join(" ");
}

function resolveDeterministicSeed(sajuData = {}) {
  const year = Number(sajuData.year) || 0;
  const month = Number(sajuData.month) || 0;
  const day = Number(sajuData.day) || 0;
  return (year * 1000 + month * 100 + day) % 2147483647;
}

function createTimeoutSignal(timeoutMs = GUARDIAN_IMAGE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
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
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        prompt,
        negative_prompt: "blurry, low quality, text, watermark, signature",
        width: 1024,
        height: 1024,
        num_inference_steps: 4,
        seed,
        cfg_scale: 1.0,
      }),
      signal: timeout.signal,
    });

    const payload = await response.json().catch(() => ({}));
    const base64 = payload?.artifacts?.[0]?.base64;
    if (!response.ok || !base64) {
      throw new Error(`NVIDIA image generation failed (${response.status}).`);
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
  const pathname = new URL(request.url).pathname;

  try {
    if (method === "POST" && pathname === "/api/guardian/generate-image") {
      const auth = await requireUserFromRequest(request, env);
      return await handleGenerateImage(request, env, auth);
    }
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request, env });
  }
}
