import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { readProfileBirthUnlock } from "../lib/paid-content-read-access.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { buildSajuSnapshotFromBirth } from "../lib/saju-snapshot-from-birth.js";

const FEATURE_KEY = "saju-guardian-unlock";
// 사주 가디언은 이미지를 직접 만들지 않는다. 사주로 만든 이미지 프롬프트만 주고, 사용자가 외부 이미지 도구에 붙여 넣는다.
const IMAGE_GENERATION_RETIRED_MESSAGE = "이미지 직접 생성은 종료되었어요. 이미지 프롬프트를 복사해 외부 이미지 도구에서 사용해 주세요.";

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

// 클라이언트(app/saju-guardian)와 같은 규칙: 지배 오행·음양은 일간, 수호 동물은 일지 동물.
const STEM_ELEMENT = Object.freeze({
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
});
const YANG_STEMS = new Set(["갑", "병", "무", "경", "임"]);
const BRANCH_ANIMAL = Object.freeze({
  자: "쥐", 축: "소", 인: "호랑이", 묘: "토끼", 진: "용", 사: "뱀",
  오: "말", 미: "양", 신: "원숭이", 유: "닭", 술: "개", 해: "돼지",
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

const GUARDIAN_NEGATIVE_PROMPT = "text, letters, watermark, signature, logo, realistic human face, extra limbs, deformed anatomy, blurry, low quality";

function buildGuardianPromptPayload(sajuData) {
  return {
    prompt: buildGuardianImagePrompt(sajuData),
    negativePrompt: GUARDIAN_NEGATIVE_PROMPT,
    seed: resolveDeterministicSeed(sajuData),
    attributes: {
      element: resolveElement(sajuData),
      yinYang: cleanText(sajuData.polarity) === "음" ? "음" : "양",
      animal: cleanText(sajuData.mainAnimal),
      dayPillar: `${cleanText(sajuData.stem)}${cleanText(sajuData.branch)}`,
    },
  };
}

/** 🔴 이미지 입력은 저장된 프로필 카드의 출생 정보로만 만든다(본문 sajuData 무시). 계산 불가면 null. */
function buildGuardianSajuDataFromBirth(birth) {
  if (!birth) return null;
  const snapshot = buildSajuSnapshotFromBirth({
    birthDate: birth.date,
    birthTime: birth.time,
    birthTimeUnknown: !birth.timeKnown,
    calendarType: "solar",
    gender: birth.gender,
  });
  const stem = cleanText(snapshot?.pillars?.d?.g);
  const branch = cleanText(snapshot?.pillars?.d?.j);
  if (!STEM_ELEMENT[stem] || !BRANCH_ANIMAL[branch]) return null;
  return {
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: birth.timeKnown ? birth.hour : undefined,
    stem,
    branch,
    elements: STEM_ELEMENT[stem],
    mainAnimal: BRANCH_ANIMAL[branch],
    polarity: YANG_STEMS.has(stem) ? "양" : "음",
  };
}

async function handleImagePrompt(request, env, auth) {
  const body = await readJson(request);
  let access;
  try {
    access = await readProfileBirthUnlock(env, { userId: auth.userId, profileId: body?.profileId, featureKey: FEATURE_KEY });
  } catch {
    return json({
      ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true,
      message: "구매 권한을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }
  if (!access.ok) {
    const missing = access.reason === "MISSING_PROFILE_ID";
    return json({
      ok: false, reason: access.reason, code: access.reason, featureKey: FEATURE_KEY, requiresProfile: true,
      message: missing ? "프로필을 저장한 뒤 구매해 주세요." : "저장된 내 프로필을 선택해 주세요.",
    }, { status: missing ? 400 : 403 });
  }
  if (!access.unlocked) {
    const { pricing } = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
    return json({
      ok: false, reason: "PAYMENT_REQUIRED", featureKey: FEATURE_KEY,
      message: "이 생년월일은 별도 구매가 필요합니다. 사주 가디언 소환진을 먼저 해금해 주세요.",
      amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice,
    }, { status: 402 });
  }

  const sajuData = buildGuardianSajuDataFromBirth(access.birth);
  if (!sajuData) {
    return json({
      ok: false, reason: "INVALID_PROFILE_BIRTH", requiresProfile: true,
      message: "프로필의 출생 정보를 확인해 주세요.",
    }, { status: 400 });
  }

  return json({ ok: true, ...buildGuardianPromptPayload(sajuData) });
}

export async function handleSajuGuardianImageRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/guardian");

  try {
    if (method === "POST" && path === "/image-prompt") {
      const auth = await requireUserFromRequest(request, env);
      return await handleImagePrompt(request, env, auth);
    }
    // 예전 앱·캐시된 화면이 부르는 이미지 생성 경로. 외부 이미지 모델을 부르지 않고 종료만 알린다.
    if (method === "POST" && path === "/generate-image") {
      return json({
        ok: false, reason: "IMAGE_GENERATION_RETIRED", code: "IMAGE_GENERATION_RETIRED",
        message: IMAGE_GENERATION_RETIRED_MESSAGE,
      }, { status: 410 });
    }
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request, env });
  }
}
