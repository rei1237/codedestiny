import { NextResponse } from "next/server";

export const runtime = "nodejs";

const STEM_ELEMENTS = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];
const BRANCH_TO_ELEMENT = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];
const ZODIACS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

const ELEMENT_META = {
  목: {
    paletteKo: "민트/연두",
    paletteEn: "mint and soft green",
    animals: ["토끼", "호랑이"],
  },
  화: {
    paletteKo: "베이비핑크/피치",
    paletteEn: "baby pink and peach",
    animals: ["뱀", "말"],
  },
  토: {
    paletteKo: "베이지/버터옐로우",
    paletteEn: "beige and butter yellow",
    animals: ["소", "개", "용"],
  },
  금: {
    paletteKo: "크림화이트/연회색",
    paletteEn: "cream white and light gray",
    animals: ["원숭이", "닭"],
  },
  수: {
    paletteKo: "스카이블루/연보라",
    paletteEn: "sky blue and soft lilac",
    animals: ["쥐", "돼지"],
  },
};

const FALLBACK_IMAGE_URL = "/fuctionassets/Who%20am%20I%20with%20saju.webp";
const FALLBACK_MESSAGE = "앗, 동물을 데려오다가 길을 잃었어요! 기본 동물 이미지를 보여드릴게요 😢";
const GEMINI_ENDPOINT_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function toInt(value, defaultValue = 0) {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function parseBirthInput(payload) {
  const year = toInt(payload?.birthYear);
  const month = toInt(payload?.birthMonth);
  const day = toInt(payload?.birthDay);
  const hour = toInt(payload?.birthHour, 12);
  const minute = toInt(payload?.birthMinute, 0);

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("invalid-birth-input");
  }

  return { year, month, day, hour, minute };
}

function rankElements(counts) {
  return Object.entries(counts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
}

function deriveSajuSignals({ year, month, day, hour }) {
  const stemIndex = ((year - 4) % 10 + 10) % 10;
  const branchIndex = ((year - 4) % 12 + 12) % 12;
  const monthStemIndex = ((year * 12 + month + 1) % 10 + 10) % 10;
  const dayStemIndex = ((year * 372 + month * 31 + day) % 10 + 10) % 10;
  const hourBranchIndex = Math.floor(((hour % 24) + 1) / 2) % 12;

  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  counts[STEM_ELEMENTS[stemIndex]] += 2;
  counts[STEM_ELEMENTS[monthStemIndex]] += 2;
  counts[STEM_ELEMENTS[dayStemIndex]] += 3;
  counts[BRANCH_TO_ELEMENT[branchIndex]] += 2;
  counts[BRANCH_TO_ELEMENT[hourBranchIndex]] += 1;

  const ranked = rankElements(counts);
  const dominant = ranked[0][0];
  const secondary = ranked[1][0];
  const zodiac = ZODIACS[branchIndex];

  return {
    dominantElement: dominant,
    secondaryElement: secondary,
    zodiac,
    elementCounts: counts,
    totalWeight: Object.values(counts).reduce((sum, n) => sum + n, 0),
  };
}

function chooseAnimals(signal) {
  const primaryPool = ELEMENT_META[signal.dominantElement].animals;
  const secondaryPool = ELEMENT_META[signal.secondaryElement].animals;

  const primary = primaryPool.includes(signal.zodiac) ? signal.zodiac : primaryPool[0];
  const animals = [primary];

  if (secondaryPool.length && signal.secondaryElement !== signal.dominantElement) {
    const mix = secondaryPool.find((a) => a !== primary) || secondaryPool[0];
    animals.push(mix);
  }

  return Array.from(new Set(animals));
}

function derivePersonality(signal) {
  const counts = signal.elementCounts;
  const dominantScore = counts[signal.dominantElement];
  const ratio = dominantScore / Math.max(signal.totalWeight, 1);

  if (signal.dominantElement === "목") {
    return {
      expressionKo: ratio > 0.45 ? "눈을 반짝이며 윙크하는" : "살짝 웃으며 호기심 어린",
      personalitySummaryKo: "장난기 가득하고 탐험심이 강하며, 새로움을 두려워하지 않는 활발한",
      lines: [
        "새로운 경험을 즐기고 빠르게 적응하는 타입이에요.",
        "마음에 불이 붙으면 집중력이 폭발적으로 올라갑니다.",
        "관계에서는 먼저 다가가는 따뜻한 추진력이 강점입니다.",
      ],
    };
  }

  if (signal.dominantElement === "화") {
    return {
      expressionKo: ratio > 0.45 ? "볼이 살짝 상기된 환하게 웃는" : "따뜻하게 미소 짓는",
      personalitySummaryKo: "표현력이 풍부하고 에너지가 밝아서 주변 분위기를 살리는",
      lines: [
        "감정 전달이 솔직해서 사람들을 끌어당기는 매력이 있어요.",
        "열정이 올라오면 실행 속도가 매우 빠른 편입니다.",
        "가끔 과열되기 쉬워 리듬 조절이 행운 포인트예요.",
      ],
    };
  }

  if (signal.dominantElement === "토") {
    return {
      expressionKo: ratio > 0.45 ? "차분하게 눈웃음 짓는" : "포근하고 안정감 있는 미소의",
      personalitySummaryKo: "신중하고 배려심이 깊어 주변을 편안하게 만드는",
      lines: [
        "기본기가 탄탄해서 오래 가는 성취를 잘 만듭니다.",
        "현실 감각이 뛰어나 팀에서 균형을 잡아주는 역할이에요.",
        "천천히 시작해도 끝까지 완주하는 힘이 강합니다.",
      ],
    };
  }

  if (signal.dominantElement === "금") {
    return {
      expressionKo: ratio > 0.45 ? "또렷한 눈빛으로 자신감 있게 웃는" : "정돈된 분위기의 부드러운 미소",
      personalitySummaryKo: "판단이 명확하고 디테일을 놓치지 않는 세련된",
      lines: [
        "기준이 분명해 의사결정이 빠르고 정확한 편입니다.",
        "완성도에 민감해서 결과물을 깔끔하게 만드는 재능이 있어요.",
        "완벽주의가 올라올 땐 스스로를 다독여 주는 것이 중요합니다.",
      ],
    };
  }

  return {
    expressionKo: ratio > 0.45 ? "맑은 눈으로 평온하게 웃는" : "몽글몽글한 눈빛의 잔잔한 미소",
    personalitySummaryKo: "감수성이 풍부하고 공감력이 높아 분위기를 읽는 데 능한",
    lines: [
      "사람의 감정을 섬세하게 캐치해 조율을 잘해요.",
      "직관이 좋아 타이밍을 읽는 감각이 뛰어납니다.",
      "혼자만의 충전 시간을 가지면 잠재력이 크게 살아납니다.",
    ],
  };
}

function buildResultObject(signal) {
  const animals = chooseAnimals(signal);
  const personality = derivePersonality(signal);
  const dominantMeta = ELEMENT_META[signal.dominantElement];

  return {
    dominantElement: signal.dominantElement,
    secondaryElement: signal.secondaryElement,
    zodiac: signal.zodiac,
    colorKo: dominantMeta.paletteKo,
    colorEn: dominantMeta.paletteEn,
    animals,
    mainAnimal: animals[0],
    expressionKo: personality.expressionKo,
    personalitySummaryKo: personality.personalitySummaryKo,
    personalityLines: personality.lines,
    headlineKo: `당신은 ${dominantMeta.paletteKo} ${animals.join(" + ")} 입니다!`,
  };
}

function buildImagePrompt(result) {
  return `A cute and soft pastel tone ${result.colorEn} colored ${result.animals.join(" and ")}. The animal has a ${result.expressionKo} expression, showing a ${result.personalitySummaryKo} personality. Simple flat vector illustration style. Clean light colored background, adorable and cozy mood. No text.`;
}

function normalizeModelId(raw) {
  return String(raw || "").trim().replace(/^models\//i, "");
}

function pickGeminiApiKeys() {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINIF_API_KEY5,
    process.env.GEMINIF_API_KEY6,
    process.env.GEMINIF_API_KEY7,
    process.env.GEMINIF_API_KEY8,
    process.env.GEMINIF_API_KEY9,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return [...new Set(keys)];
}

function modelCandidates() {
  const preferred = normalizeModelId(process.env.SAJU_ANIMAL_GEMINI_MODEL || "gemini-2.0-flash-preview-image-generation");
  const candidates = [
    preferred,
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.5-flash-image-preview",
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
  ]
    .map((v) => normalizeModelId(v))
    .filter(Boolean);
  return [...new Set(candidates)];
}

function parseGeminiInlineImage(payload) {
  const candidates = (payload && payload.candidates) || [];
  for (const candidate of candidates) {
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    for (const part of parts) {
      const inlineData = part && (part.inlineData || part.inline_data);
      const mimeType = String((inlineData && (inlineData.mimeType || inlineData.mime_type)) || "").trim();
      const data = String((inlineData && inlineData.data) || "").trim();
      if (data && /^image\//i.test(mimeType)) {
        return `data:${mimeType};base64,${data}`;
      }

      const fileData = part && (part.fileData || part.file_data);
      const fileUri = String((fileData && (fileData.fileUri || fileData.file_uri || fileData.uri)) || "").trim();
      if (fileUri && /^https?:\/\//i.test(fileUri)) {
        return fileUri;
      }
    }
  }
  return "";
}

function isUnknownFieldError(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("unknown name") || text.includes("unknown field") || text.includes("unrecognized field");
}

function classifyGeminiFailure(message) {
  const text = String(message || "").toLowerCase();
  if (!text) return { code: "gemini-image-failed", fallbackMessage: FALLBACK_MESSAGE };
  if (text.includes("missing-gemini-api-key")) {
    return {
      code: "missing-gemini-api-key",
      fallbackMessage: "Gemini API 키가 설정되지 않아 기본 이미지를 표시했어요. 서버 환경변수 GEMINI_API_KEY 또는 GOOGLE_API_KEY를 확인해 주세요.",
    };
  }
  if (text.includes("api key") || text.includes("permission") || text.includes("unauthenticated") || text.includes("forbidden")) {
    return {
      code: "gemini-auth-error",
      fallbackMessage: "Gemini API 인증에 실패해 기본 이미지를 표시했어요. API 키 권한/유효기간을 확인해 주세요.",
    };
  }
  if (text.includes("quota") || text.includes("resource exhausted") || text.includes("429")) {
    return {
      code: "gemini-quota-exceeded",
      fallbackMessage: "Gemini 호출 한도에 도달해 기본 이미지를 표시했어요. 잠시 후 다시 시도하거나 예비 키를 설정해 주세요.",
    };
  }
  if (text.includes("timeout") || text.includes("abort")) {
    return {
      code: "gemini-timeout",
      fallbackMessage: "Gemini 응답 지연으로 기본 이미지를 표시했어요. 네트워크 상태 확인 후 다시 시도해 주세요.",
    };
  }
  if (text.includes("not found") || text.includes("model") || text.includes("unsupported")) {
    return {
      code: "gemini-model-unavailable",
      fallbackMessage: "현재 설정된 Gemini 이미지 모델이 사용 불가하여 기본 이미지를 표시했어요. SAJU_ANIMAL_GEMINI_MODEL 값을 점검해 주세요.",
    };
  }
  return { code: "gemini-image-failed", fallbackMessage: FALLBACK_MESSAGE };
}

function buildGeminiRequestVariants(prompt) {
  return [
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 512,
      },
    },
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 512,
      },
    },
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    },
  ];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImage(prompt) {
  const keys = pickGeminiApiKeys();
  if (!keys.length) {
    const failure = classifyGeminiFailure("missing-gemini-api-key");
    return {
      imageUrl: FALLBACK_IMAGE_URL,
      fallback: true,
      fallbackMessage: failure.fallbackMessage,
      error: failure.code,
    };
  }

  let lastError = null;
  const models = modelCandidates();
  const requestVariants = buildGeminiRequestVariants(prompt);

  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", encodeURIComponent(model));
    for (const key of keys) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        for (const bodyVariant of requestVariants) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort("saju-animal-timeout"), 30000);
          try {
            const res = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bodyVariant),
              signal: controller.signal,
              cache: "no-store",
            });
            clearTimeout(timer);

            const payload = await res.json().catch(() => null);
            if (!res.ok) {
              const message = payload?.error?.message || payload?.message || `gemini-image-error-${res.status}`;
              const retryable = res.status === 429 || res.status >= 500;
              const unknownField = isUnknownFieldError(message);
              lastError = new Error(message);
              if (unknownField) {
                continue;
              }
              if (retryable && attempt === 0) {
                await wait(450);
                continue;
              }
              break;
            }

            const imageUrl = parseGeminiInlineImage(payload);
            if (!imageUrl) {
              lastError = new Error("gemini-image-empty");
              continue;
            }

            return {
              imageUrl,
              fallback: false,
              fallbackMessage: "",
              model,
            };
          } catch (error) {
            clearTimeout(timer);
            lastError = error;
            if (attempt === 0) {
              await wait(350);
              continue;
            }
            break;
          }
        }
      }
    }
  }

  const failure = classifyGeminiFailure(String(lastError || "gemini-image-failed"));
  return {
    imageUrl: FALLBACK_IMAGE_URL,
    fallback: true,
    fallbackMessage: failure.fallbackMessage,
    error: failure.code,
  };
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const birth = parseBirthInput(payload);
    const signal = deriveSajuSignals(birth);
    const result = buildResultObject(signal);
    const prompt = buildImagePrompt(result);
    const generated = await generateImage(prompt);

    return NextResponse.json({
      ok: true,
      input: birth,
      result,
      prompt,
      imageUrl: generated.imageUrl,
      fallback: generated.fallback,
      fallbackMessage: generated.fallbackMessage,
      fallbackReason: generated.error || "",
      model: generated.model || "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "생년월일시 입력을 다시 확인해 주세요.",
        fallback: true,
        fallbackMessage: FALLBACK_MESSAGE,
        imageUrl: FALLBACK_IMAGE_URL,
        error: String(error),
      },
      { status: 400 }
    );
  }
}
