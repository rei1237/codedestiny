import { NextResponse } from "next/server";

const GEMINI_ENDPOINT_TEMPLATE =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiApiKeys() {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return [...new Set(keys)];
}

function normalizeModelId(raw) {
  const v = String(raw || "").trim().replace(/^models\//i, "");
  return v;
}

function modelName() {
  return normalizeModelId(
    process.env.GUARDIAN_AVATAR_GEMINI_MODEL || process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash"
  );
}

function modelCandidates() {
  const preferred = modelName();
  const candidates = [
    preferred,
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
  ]
    .map((v) => normalizeModelId(v))
    .filter(Boolean);
  return [...new Set(candidates)];
}

function safeInt(v, d) {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? d : n;
}

function toSafeElementMap(src, fallback = 0) {
  const out = { wood: fallback, fire: fallback, earth: fallback, metal: fallback, water: fallback };
  if (!src || typeof src !== "object") return out;
  Object.keys(out).forEach((k) => {
    const v = Number(src[k]);
    out[k] = Number.isFinite(v) ? v : fallback;
  });
  return out;
}

function normalizeSajuAnalysis(payload) {
  if (!payload || typeof payload !== "object") return null;
  const rawCounts =
    payload.five_elements_count ||
    payload.fiveElementsCount ||
    payload.element_counts ||
    payload.elementCounts ||
    payload.natal_counts ||
    payload.natalCounts ||
    payload.counts ||
    null;
  const rawRatios =
    payload.five_elements_ratio ||
    payload.fiveElementsRatio ||
    payload.element_ratios ||
    payload.elementRatios ||
    payload.natal_ratios ||
    payload.natalRatios ||
    payload.ratios ||
    null;

  const counts = toSafeElementMap(rawCounts, 0);
  const ratios = toSafeElementMap(rawRatios, 0);
  const countTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const ratioTotal = Object.values(ratios).reduce((a, b) => a + b, 0);
  if (countTotal <= 0 && ratioTotal <= 0) return null;

  if (ratioTotal <= 0 && countTotal > 0) {
    Object.keys(ratios).forEach((k) => {
      ratios[k] = Number(((counts[k] / countTotal) * 100).toFixed(1));
    });
  }
  if (countTotal <= 0 && ratioTotal > 0) {
    Object.keys(counts).forEach((k) => {
      counts[k] = Math.max(0, Math.round((ratios[k] / 100) * 10));
    });
  }

  return {
    counts,
    ratios,
    dominantElement: String(payload.dominant_element || payload.dominantElement || "").trim() || null,
  };
}

function analyzeSajuVisual(profile, sajuAnalysis) {
  const birth = (profile && profile.birth) || {};
  const year = safeInt(birth.year, 2000);
  const month = safeInt(birth.month, 1);
  const day = safeInt(birth.day, 1);
  const hour = safeInt(birth.hour, 12);

  const stemElements = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
  const branchElements = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];

  const normalized = normalizeSajuAnalysis(sajuAnalysis);
  const weights = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 };
  if (normalized) {
    weights.wood = normalized.counts.wood;
    weights.fire = normalized.counts.fire;
    weights.earth = normalized.counts.earth;
    weights.metal = normalized.counts.metal;
    weights.water = normalized.counts.water;
  }
  const stemIdx = ((year - 4) % 10 + 10) % 10;
  const yearBranchIdx = ((year - 4) % 12 + 12) % 12;
  const hourBranchIdx = Math.floor((((hour + 1) % 24) / 2));
  const seasonElement = month >= 3 && month <= 5 ? "wood" : month >= 6 && month <= 8 ? "fire" : month >= 9 && month <= 11 ? "metal" : "water";
  const dayElement = ["wood", "fire", "earth", "metal", "water"][Math.abs(year + month + day) % 5];

  if (!normalized) {
    weights[stemElements[stemIdx]] += 3;
    weights[branchElements[yearBranchIdx]] += 2;
    weights[branchElements[hourBranchIdx]] += 1;
    weights[seasonElement] += 2;
    weights[dayElement] += 2;
  }

  let dominant = "earth";
  if (normalized && normalized.dominantElement && Object.prototype.hasOwnProperty.call(weights, normalized.dominantElement)) {
    dominant = normalized.dominantElement;
  }
  ["wood", "fire", "earth", "metal", "water"].forEach((k) => {
    if (weights[k] > weights[dominant]) dominant = k;
  });

  const exprMap = {
    wood: "호기심 가득한 생기 있는 미소",
    fire: "열정적이고 활기찬 밝은 미소",
    earth: "포근하고 안정적인 따뜻한 미소",
    metal: "또렷하고 결의 있는 자신감 표정",
    water: "차분하고 신비로운 깊은 미소",
  };

  const bgMap = {
    wood: "연두빛 숲과 덩굴, 바람결",
    fire: "따뜻한 노을, 빛 입자, 황금 광채",
    earth: "파스텔 언덕, 꽃밭, 흙빛 오브제",
    metal: "은빛 수정, 별가루, 금속성 하이라이트",
    water: "달빛 물결, 안개, 구름",
  };

  return {
    dominantElement: dominant,
    fiveElements: weights,
    fiveElementRatios: normalized ? normalized.ratios : null,
    facialExpression: exprMap[dominant] || "부드러운 미소",
    backgroundMotif: bgMap[dominant] || "파스텔 자연 배경",
    summary:
      "오행 중심: " +
      dominant +
      " (wood " +
      weights.wood +
      ", fire " +
      weights.fire +
      ", earth " +
      weights.earth +
      ", metal " +
      weights.metal +
      ", water " +
      weights.water +
      ")",
  };
}

function normalizeSvg(raw) {
  const text = String(raw || "").trim();
  const m = text.match(/<svg[\s\S]*<\/svg>/i);
  return m && m[0] ? m[0] : "";
}

function toDataUri(svg) {
  const b64 = Buffer.from(String(svg || ""), "utf8").toString("base64");
  return "data:image/svg+xml;base64," + b64;
}

function normalizeTotemAnimal(payload) {
  if (!payload || typeof payload !== "object") return null;
  const name = sanitizeAnimalNameKr(String(payload.name || "").trim());
  const nameEn = sanitizeAnimalNameEn(String(payload.nameEn || "").trim());
  const keyword = String(payload.keyword || "").trim();
  const traits = String(payload.traits || "").trim();
  const dayZhi = String(payload.dayZhi || "").trim();
  const element = String(payload.element || "").trim();
  if (!name && !nameEn) return null;
  return { name, nameEn, keyword, traits, dayZhi, element };
}

function normalizeRenderMode(mode) {
  const v = String(mode || "").trim().toLowerCase();
  if (v === "profile-mini" || v === "profile" || v === "mini") return "profile-mini";
  return "saju-animal";
}

function normalizeStyleIntensity(intensity) {
  const v = String(intensity || "").trim().toLowerCase();
  return v === "strong" ? "strong" : "soft";
}

function normalizeOutputSize(size, renderMode) {
  const mode = normalizeRenderMode(renderMode);
  if (mode === "profile-mini") return 160;
  const parsed = safeInt(size, 640);
  const clamped = Math.max(384, Math.min(1024, parsed));
  return Math.max(384, Math.round(clamped / 32) * 32);
}

function sanitizeAnimalNameKr(value) {
  return String(value || "")
    .replace(/^\s*아기\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeAnimalNameEn(value) {
  return String(value || "")
    .replace(/\b(cute|baby|little|tiny)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProfileGender(value) {
  const v = String(value || "").trim().toUpperCase();
  if (v === "F" || v.includes("FEMALE") || v.includes("WOMAN") || v.includes("여")) return "F";
  if (v === "M" || v.includes("MALE") || v.includes("MAN") || v.includes("남")) return "M";
  return "U";
}

function genderStyleHint(gender) {
  if (gender === "F") {
    return "여성형 무드를 반영해 부드러운 곡선 라인, 섬세한 속눈썹, 은은한 하이라이트를 사용하되 과장된 장식은 피하라.";
  }
  if (gender === "M") {
    return "남성형 무드를 반영해 또렷한 이목구비, 선명한 라인, 안정적인 광원 대비를 사용하되 강압적 느낌은 피하라.";
  }
  return "중성형 무드로 균형감 있는 이목구비와 부드러운 라인, 자연스러운 명암을 사용하라.";
}

function normalizeAnimalSpeciesToken(value) {
  const v = String(value || "").toLowerCase();
  if (!v) return "";
  if (v.includes("chick") || v.includes("chicken") || v.includes("hen") || v.includes("rooster")) return "chick";
  if (v.includes("puppy") || v.includes("dog")) return "dog";
  if (v.includes("kitty") || v.includes("kitten") || v.includes("cat")) return "cat";
  if (v.includes("bunny") || v.includes("rabbit") || v.includes("hare")) return "rabbit";
  if (v.includes("deer") || v.includes("fawn") || v.includes("stag")) return "deer";
  if (v.includes("bear") || v.includes("panda")) return "bear";
  if (v.includes("fox")) return "fox";
  if (v.includes("wolf")) return "wolf";
  if (v.includes("tiger")) return "tiger";
  if (v.includes("lion")) return "lion";
  if (v.includes("dragon")) return "dragon";
  if (v.includes("snake")) return "snake";
  if (v.includes("horse") || v.includes("foal")) return "horse";
  if (v.includes("sheep") || v.includes("lamb")) return "lamb";
  if (v.includes("monkey")) return "monkey";
  if (v.includes("pig") || v.includes("piglet")) return "pig";
  if (v.includes("eagle")) return "eagle";
  if (v.includes("turtle") || v.includes("tortoise")) return "turtle";
  if (v.includes("dolphin")) return "dolphin";
  if (v.includes("seal")) return "seal";
  return "";
}

function fallbackAnimalByElement(element) {
  const map = {
    wood: { name: "사슴", nameEn: "deer" },
    fire: { name: "사자", nameEn: "lion" },
    earth: { name: "곰", nameEn: "bear" },
    metal: { name: "늑대", nameEn: "wolf" },
    water: { name: "거북이", nameEn: "turtle" },
  };
  return map[element] || map.wood;
}

function buildPrompt(profile, visual, totemAnimal, renderMode, styleIntensity, outputSize, avatarPrompt, imagePrompt) {
  const birth = (profile && profile.birth) || {};
  const loc = (profile && profile.location) || {};
  const gender = normalizeProfileGender(profile && profile.gender);
  const targetSize = normalizeOutputSize(outputSize, renderMode);
  const promptSeed = String(avatarPrompt || imagePrompt || "").trim();

  if (renderMode === "profile-mini") {
    return [
      "너는 프로필 카드용 미니 가디언 아이콘 디자이너다.",
      "반드시 JSON만 출력하고, svg 필드에는 완전한 단일 SVG 마크업을 넣어라.",
      "SVG는 정확히 " + targetSize + "x" + targetSize + ", 정사각형, 작은 썸네일에서도 식별 가능한 단순 만화풍 아이콘으로 생성하라.",
      "얼굴 중심(머리 위주) 클로즈업만 그리고, 배경은 완전 단색 하나만 사용하라.",
      "디테일 과잉, 복잡한 레이어, 미세 텍스처를 금지한다.",
      "소품/장식 요소를 넣지 말고, 한눈에 인지되는 얼굴 실루엣만 남겨라.",
      "텍스트/로고/워터마크를 절대 넣지 마라.",
      "사용자 프로필:",
      JSON.stringify({
        birth: {
          year: birth.year,
          month: birth.month,
          day: birth.day,
          hour: birth.hour,
          minute: birth.minute,
          calType: birth.calType,
        },
        location: {
          label: loc.label,
          tz: loc.tz,
          lat: loc.lat,
          lng: loc.lng,
        },
        sajuVisual: visual,
      }),
      "출력 스키마:",
      "{",
      '  "title": "string",',
      '  "summary": "string",',
      '  "facial_expression": "string",',
      '  "background_motif": "string",',
      '  "illustration_prompt": "string",',
      '  "svg": "<svg ...>...</svg>"',
      "}",
    ].join("\n");
  }

  const fallbackAnimal = fallbackAnimalByElement(visual?.dominantElement || "wood");
  const animal = totemAnimal || fallbackAnimal;
  const animalName = sanitizeAnimalNameKr(String(animal?.name || fallbackAnimal.name || "사슴").trim()) || "사슴";
  const animalNameEn = sanitizeAnimalNameEn(String(animal?.nameEn || fallbackAnimal.nameEn || "deer").trim()) || "deer";
  const animalKeyword = String(animal?.keyword || "").trim();
  const animalTraits = String(animal?.traits || "").trim();
  const styleGuide = "고해상도 귀여운 만화풍(굵고 깔끔한 윤곽선, 세밀한 눈/털 표현, 선명한 명암, 파스텔 기반 색감)";
  const targetSpecies = normalizeAnimalSpeciesToken(animalNameEn || animalName);

  return [
    "너는 사주 기반 캐릭터 디렉터다.",
    "반드시 JSON만 출력하고, svg 필드에는 완전한 단일 SVG 마크업을 넣어라.",
    "SVG는 " + targetSize + "x" + targetSize + ", 고퀄리티 파스텔 만화풍 캐릭터 일러스트(SD/chibi), 선명한 라인과 정교한 셀 셰이딩, 저작권 문제 없는 오리지널로 생성하라.",
    "스타일은 동화풍 스케치가 아니라 완성된 만화풍 일러스트로, 명확한 윤곽선과 디테일한 눈동자/헤어(털) 결을 표현하라.",
    "만화풍 강도 지시: " + styleGuide,
    "반드시 동물 가디언을 주인공으로 그리고, 사주 동물 힌트와 동일한 동물 종을 유지하라.",
    "다른 종으로 치환하지 말고, 목표 동물의 얼굴/귀/코/입/체형 특징을 분명히 드러내라.",
    "캐릭터 디테일을 구체적으로 표현하라: 표정(눈, 입, 볼터치), 머리/귀/꼬리/장신구, 전경 소품, 배경 레이어, 광원, 색조 대비.",
    "구도 지시: 얼굴+상반신이 캔버스 60~70%를 차지하고, 배경은 30~40% 영역에서 명확히 보이게 하라.",
    "배경 지시: 단색 배경 금지. 최소 2개 이상의 레이어(원거리/중거리)를 사용해 깊이감 있는 배경을 구성하라.",
    "배경은 흐릿한 장식이 아니라 동물과 어울리는 자연/판타지 요소를 식별 가능하게 포함하라.",
    "성별 반영 지시: " + genderStyleHint(gender),
    "결과는 완성 일러스트 품질이어야 하며, 스케치나 아이콘 수준이 아니어야 한다.",
    "캐릭터 비율은 2.5등신 내외의 마스코트형으로 만들고, 얼굴 비중을 크게 해서 사랑스럽게 보이게 하라.",
    "색감은 파스텔톤 중심(저채도, 부드러운 명도 대비)으로 통일하고 공격적/다크 톤은 금지한다.",
    "이미지 안에 문자, 로고, 워터마크, 이름을 절대 넣지 마라.",
    "사주 성향 기반 표정과 오행 기반 배경을 반드시 반영하라.",
    promptSeed ? ("아바타 프롬프트 시드: " + promptSeed) : "아바타 프롬프트 시드: pastel cute guardian with clear species identity.",
    "사용자 프로필:",
    JSON.stringify({
      birth: {
        year: birth.year,
        month: birth.month,
        day: birth.day,
        hour: birth.hour,
        minute: birth.minute,
        calType: birth.calType,
      },
      location: {
        label: loc.label,
        tz: loc.tz,
        lat: loc.lat,
        lng: loc.lng,
      },
      sajuVisual: visual,
      totemAnimalHint: {
        name: animalName,
        nameEn: animalNameEn,
        keyword: animalKeyword,
        traits: animalTraits,
      },
      profileGender: gender,
    }),
    '반드시 "' + animalNameEn + '" (' + animalName + ') 동물을 주인공으로 표현하라.',
    '동물 종 식별자(animal_species_en)는 반드시 "' + (targetSpecies || animalNameEn) + '" 로 출력하라.',
    "출력 스키마:",
    "{",
    '  "title": "string",',
    '  "summary": "string",',
    '  "facial_expression": "string",',
    '  "background_motif": "string",',
    '  "illustration_prompt": "string",',
    '  "animal_species_en": "string",',
    '  "svg": "<svg ...>...</svg>"',
    "}",
  ].join("\n");
}

function parseGeminiText(payload) {
  const parts = (((payload || {}).candidates || [])[0] || {}).content?.parts || [];
  return parts.map((p) => (p && p.text ? p.text : "")).join("\n").trim();
}

function toGuardianLabel(name) {
  const kr = sanitizeAnimalNameKr(name);
  const en = sanitizeAnimalNameEn(name);
  return kr || en || "수호 동물";
}

function sanitizeOutputCopy(value) {
  return String(value || "")
    .replace(/아기\s*/g, "")
    .replace(/\b(cute|baby|little|tiny)\b/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const fence = String(text || "").match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence && fence[1]) {
      try {
        return JSON.parse(fence[1].trim());
      } catch {
        /* noop */
      }
    }
    const m = String(text || "").match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fallbackPalette(element, styleIntensity) {
  const soft = {
    wood: { bg1: "#d8f5db", bg2: "#ecfff0", face: "#f8fff7", stroke: "#2f6a3f", accent: "#7bcf8f" },
    fire: { bg1: "#ffd8c3", bg2: "#fff3e6", face: "#fff8f4", stroke: "#9e4a2c", accent: "#ff996b" },
    earth: { bg1: "#f2e3cf", bg2: "#fff7ee", face: "#fff9f2", stroke: "#7b5a3f", accent: "#d9a97b" },
    metal: { bg1: "#e7ebf7", bg2: "#f8faff", face: "#fcfdff", stroke: "#4d5a75", accent: "#9eb3de" },
    water: { bg1: "#d7f0ff", bg2: "#f0f9ff", face: "#f7fcff", stroke: "#305b7a", accent: "#78bde8" },
  };
  const strong = {
    wood: { bg1: "#84d48f", bg2: "#c7f3cd", face: "#f3fff2", stroke: "#215831", accent: "#4ab96a" },
    fire: { bg1: "#ff9d72", bg2: "#ffd6bf", face: "#fff5ee", stroke: "#7d3418", accent: "#ff7247" },
    earth: { bg1: "#d9bc99", bg2: "#f0dcc3", face: "#fff5ea", stroke: "#61462f", accent: "#b98358" },
    metal: { bg1: "#b9c4de", bg2: "#e1e8f7", face: "#fafcff", stroke: "#38455f", accent: "#7b95c6" },
    water: { bg1: "#89c8ec", bg2: "#cbeaf9", face: "#f2fbff", stroke: "#1f4f70", accent: "#4a9fd0" },
  };
  const table = styleIntensity === "strong" ? strong : soft;
  return table[element] || table.wood;
}

function detectFallbackSpecies(totemAnimal, dominantElement) {
  const base = String(
    (totemAnimal && [totemAnimal.name, totemAnimal.nameEn, totemAnimal.keyword, totemAnimal.dayZhi].filter(Boolean).join(" ")) || ""
  )
    .toLowerCase()
    .trim();

  const rules = [
    { species: "rabbit", words: ["rabbit", "bunny", "hare", "토끼"] },
    { species: "fox", words: ["fox", "vulpes", "여우"] },
    { species: "wolf", words: ["wolf", "늑대"] },
    { species: "tiger", words: ["tiger", "호랑이"] },
    { species: "bear", words: ["bear", "곰"] },
    { species: "lion", words: ["lion", "사자"] },
    { species: "turtle", words: ["turtle", "거북", "tortoise"] },
    { species: "deer", words: ["deer", "stag", "fawn", "사슴"] },
  ];

  for (const rule of rules) {
    if (rule.words.some((w) => base.includes(w))) return rule.species;
  }

  const byElement = {
    wood: "deer",
    fire: "lion",
    earth: "bear",
    metal: "wolf",
    water: "turtle",
  };
  return byElement[dominantElement] || "deer";
}

function speciesOuterFeatures(species, size, palette, stroke, cx, cy, headRadius, mode) {
  const lw = Math.max(2, Math.round(stroke * 0.9));
  const leftEarX = Math.round(size * 0.33);
  const rightEarX = Math.round(size * 0.67);
  const earY = Math.round(size * 0.34);

  if (species === "rabbit") {
    return (
      '<ellipse cx="' + leftEarX + '" cy="' + Math.round(size * 0.22) + '" rx="' + Math.round(size * 0.06) + '" ry="' + Math.round(size * 0.14) + '" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>' +
      '<ellipse cx="' + rightEarX + '" cy="' + Math.round(size * 0.22) + '" rx="' + Math.round(size * 0.06) + '" ry="' + Math.round(size * 0.14) + '" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>' +
      '<ellipse cx="' + leftEarX + '" cy="' + Math.round(size * 0.22) + '" rx="' + Math.round(size * 0.025) + '" ry="' + Math.round(size * 0.08) + '" fill="' + palette.accent + '" opacity="0.85"/>' +
      '<ellipse cx="' + rightEarX + '" cy="' + Math.round(size * 0.22) + '" rx="' + Math.round(size * 0.025) + '" ry="' + Math.round(size * 0.08) + '" fill="' + palette.accent + '" opacity="0.85"/>'
    );
  }

  if (species === "wolf" || species === "fox" || species === "tiger") {
    const earTop = Math.round(size * 0.14);
    const earWide = Math.round(size * 0.06);
    const earBaseY = Math.round(size * 0.33);
    return (
      '<path d="M ' + (leftEarX - earWide) + ' ' + earBaseY + ' L ' + leftEarX + ' ' + earTop + ' L ' + (leftEarX + earWide) + ' ' + earBaseY + ' Z" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>' +
      '<path d="M ' + (rightEarX - earWide) + ' ' + earBaseY + ' L ' + rightEarX + ' ' + earTop + ' L ' + (rightEarX + earWide) + ' ' + earBaseY + ' Z" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>'
    );
  }

  if (species === "lion") {
    return (
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + Math.round(headRadius * 1.15) + '" fill="' + palette.accent + '" opacity="0.9"/>' +
      '<circle cx="' + leftEarX + '" cy="' + earY + '" r="' + Math.round(headRadius * 0.28) + '" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + rightEarX + '" cy="' + earY + '" r="' + Math.round(headRadius * 0.28) + '" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>'
    );
  }

  if (species === "turtle") {
    return (
      '<ellipse cx="' + cx + '" cy="' + Math.round(size * 0.64) + '" rx="' + Math.round(headRadius * 1.05) + '" ry="' + Math.round(headRadius * 0.68) + '" fill="' + palette.accent + '" opacity="0.42"/>' +
      '<path d="M ' + Math.round(size * 0.39) + ' ' + Math.round(size * 0.71) + ' Q ' + cx + ' ' + Math.round(size * 0.79) + ' ' + Math.round(size * 0.61) + ' ' + Math.round(size * 0.71) + '" fill="none" stroke="' + palette.stroke + '" stroke-width="' + lw + '" opacity="0.6"/>'
    );
  }

  if (species === "deer") {
    const antlerY = Math.round(size * 0.17);
    return (
      '<ellipse cx="' + leftEarX + '" cy="' + earY + '" rx="' + Math.round(headRadius * 0.2) + '" ry="' + Math.round(headRadius * 0.28) + '" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>' +
      '<ellipse cx="' + rightEarX + '" cy="' + earY + '" rx="' + Math.round(headRadius * 0.2) + '" ry="' + Math.round(headRadius * 0.28) + '" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>' +
      '<path d="M ' + Math.round(size * 0.41) + ' ' + Math.round(size * 0.31) + ' L ' + Math.round(size * 0.37) + ' ' + antlerY + ' M ' + Math.round(size * 0.37) + ' ' + antlerY + ' L ' + Math.round(size * 0.34) + ' ' + Math.round(size * 0.2) + ' M ' + Math.round(size * 0.37) + ' ' + antlerY + ' L ' + Math.round(size * 0.4) + ' ' + Math.round(size * 0.2) + '" fill="none" stroke="' + palette.stroke + '" stroke-width="' + lw + '" stroke-linecap="round"/>' +
      '<path d="M ' + Math.round(size * 0.59) + ' ' + Math.round(size * 0.31) + ' L ' + Math.round(size * 0.63) + ' ' + antlerY + ' M ' + Math.round(size * 0.63) + ' ' + antlerY + ' L ' + Math.round(size * 0.66) + ' ' + Math.round(size * 0.2) + ' M ' + Math.round(size * 0.63) + ' ' + antlerY + ' L ' + Math.round(size * 0.6) + ' ' + Math.round(size * 0.2) + '" fill="none" stroke="' + palette.stroke + '" stroke-width="' + lw + '" stroke-linecap="round"/>'
    );
  }

  return (
    '<circle cx="' + leftEarX + '" cy="' + earY + '" r="' + Math.round(headRadius * 0.3) + '" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>' +
    '<circle cx="' + rightEarX + '" cy="' + earY + '" r="' + Math.round(headRadius * 0.3) + '" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>'
  );
}

function speciesInnerFeatures(species, size, palette, stroke, cx, cy) {
  const lw = Math.max(2, Math.round(stroke * 0.65));

  if (species === "wolf" || species === "fox") {
    return '<path d="M ' + cx + ' ' + Math.round(size * 0.55) + ' L ' + Math.round(size * 0.47) + ' ' + Math.round(size * 0.63) + ' L ' + Math.round(size * 0.53) + ' ' + Math.round(size * 0.63) + ' Z" fill="' + palette.accent + '"/>';
  }
  if (species === "tiger") {
    return (
      '<path d="M ' + Math.round(size * 0.39) + ' ' + Math.round(size * 0.43) + ' L ' + Math.round(size * 0.36) + ' ' + Math.round(size * 0.49) + '" stroke="' + palette.stroke + '" stroke-width="' + lw + '" stroke-linecap="round"/>' +
      '<path d="M ' + Math.round(size * 0.61) + ' ' + Math.round(size * 0.43) + ' L ' + Math.round(size * 0.64) + ' ' + Math.round(size * 0.49) + '" stroke="' + palette.stroke + '" stroke-width="' + lw + '" stroke-linecap="round"/>'
    );
  }
  if (species === "turtle") {
    return (
      '<circle cx="' + Math.round(size * 0.44) + '" cy="' + Math.round(size * 0.56) + '" r="' + Math.round(size * 0.012) + '" fill="' + palette.accent + '"/>' +
      '<circle cx="' + Math.round(size * 0.56) + '" cy="' + Math.round(size * 0.56) + '" r="' + Math.round(size * 0.012) + '" fill="' + palette.accent + '"/>'
    );
  }
  if (species === "deer") {
    return '<ellipse cx="' + cx + '" cy="' + Math.round(size * 0.6) + '" rx="' + Math.round(size * 0.09) + '" ry="' + Math.round(size * 0.055) + '" fill="' + palette.accent + '" opacity="0.9"/>';
  }

  return '<ellipse cx="' + cx + '" cy="' + Math.round(size * 0.58) + '" rx="' + Math.round(size * 0.05) + '" ry="' + Math.round(size * 0.035) + '" fill="' + palette.accent + '"/>';
}

function buildFallbackGuardianSvg(visual, totemAnimal, renderMode, styleIntensity, outputSize) {
  const mode = normalizeRenderMode(renderMode);
  const size = normalizeOutputSize(outputSize, mode);
  const dominant = String((visual && visual.dominantElement) || "wood").trim() || "wood";
  const palette = fallbackPalette(dominant, normalizeStyleIntensity(styleIntensity));
  const animalName = escapeXml(String((totemAnimal && (totemAnimal.nameEn || totemAnimal.name)) || "baby guardian").trim());
  const species = detectFallbackSpecies(totemAnimal, dominant);

  const stroke = mode === "profile-mini" ? 4 : 8;
  const headRadius = mode === "profile-mini" ? 52 : 168;
  const eyeR = mode === "profile-mini" ? 5 : 16;
  const cx = Math.round(size * 0.5);
  const cy = Math.round(size * 0.54);
  const mouthY = mode === "profile-mini" ? 97 : 308;
  const outerFeatures = speciesOuterFeatures(species, size, palette, stroke, cx, cy, headRadius, mode);
  const innerFeatures = speciesInnerFeatures(species, size, palette, stroke, cx, cy);

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' +
    size + ' ' + size + '">' +
    '<defs>' +
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="' + palette.bg1 + '"/>' +
    '<stop offset="100%" stop-color="' + palette.bg2 + '"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="100%" height="100%" rx="' + Math.round(size * 0.14) + '" fill="url(#bg)"/>' +
    outerFeatures +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + headRadius + '" fill="' + palette.face + '" stroke="' + palette.stroke + '" stroke-width="' + stroke + '"/>' +
    '<circle cx="' + Math.round(size * 0.42) + '" cy="' + Math.round(size * 0.5) + '" r="' + eyeR + '" fill="' + palette.stroke + '"/>' +
    '<circle cx="' + Math.round(size * 0.58) + '" cy="' + Math.round(size * 0.5) + '" r="' + eyeR + '" fill="' + palette.stroke + '"/>' +
    innerFeatures +
    '<path d="M ' + Math.round(size * 0.44) + ' ' + mouthY + ' Q ' + Math.round(size * 0.5) + ' ' + (mouthY + Math.round(size * 0.045)) + ' ' + Math.round(size * 0.56) + ' ' + mouthY + '" fill="none" stroke="' + palette.stroke + '" stroke-width="' + Math.max(2, Math.round(stroke * 0.66)) + '" stroke-linecap="round"/>' +
    '<title>' + animalName + '</title>' +
    '</svg>'
  );
}

function buildFallbackGuardian(profile, visual, totemAnimal, renderMode, styleIntensity, reason, outputSize) {
  const mode = normalizeRenderMode(renderMode);
  const style = normalizeStyleIntensity(styleIntensity);
  const fallbackAnimal = fallbackAnimalByElement((visual && visual.dominantElement) || "wood");
  const animalName = String((totemAnimal && totemAnimal.name) || fallbackAnimal.name || "아기 수호동물").trim();
  const animalNameEn = String((totemAnimal && (totemAnimal.nameEn || totemAnimal.name)) || fallbackAnimal.nameEn || "baby guardian").trim();
  const svg = buildFallbackGuardianSvg(visual, totemAnimal, mode, style, outputSize);

  return {
    title: mode === "profile-mini" ? "미니 가디언" : animalName + " 가디언",
    summary: String((visual && visual.summary) || "사주 오행 기반 가디언 일러스트") + " (fallback)",
    facialExpression: String((visual && visual.facialExpression) || "부드러운 미소"),
    backgroundMotif: String((visual && visual.backgroundMotif) || "오행 파스텔 배경"),
    illustrationPrompt:
      (mode === "profile-mini" ? "프로필 카드용 미니 가디언" : "사주 기반 동물 가디언") +
      ": " +
      animalNameEn,
    styleIntensity: style,
    svg,
    source: "fallback",
    fallbackReason: String(reason || "gemini-unavailable"),
  };
}

async function callGemini(profile, visual, totemAnimal, renderMode, styleIntensity, outputSize, avatarPrompt, imagePrompt) {
  const keys = pickGeminiApiKeys();
  if (!keys.length) {
    throw Object.assign(new Error("GEMINI_API_KEY 또는 GOOGLE_API_KEY가 필요합니다."), { status: 500 });
  }

  const normalizedMode = normalizeRenderMode(renderMode);
  const normalizedStyle = "strong";
  const normalizedSize = normalizeOutputSize(outputSize, normalizedMode);
  const prompt = buildPrompt(profile, visual, totemAnimal, normalizedMode, normalizedStyle, normalizedSize, avatarPrompt, imagePrompt);
  const models = modelCandidates();
  const expectedSpecies = normalizeAnimalSpeciesToken((totemAnimal && (totemAnimal.nameEn || totemAnimal.name)) || "");
  let lastError = null;
  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", encodeURIComponent(model));
    for (const key of keys) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort("guardian-avatar-timeout"), 30000);
          const res = await fetch(endpoint + "?key=" + encodeURIComponent(key), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: normalizedMode === "profile-mini" ? 0.65 : 0.85,
                topP: 0.95,
                maxOutputTokens:
                  normalizedMode === "profile-mini" ? 700 : normalizedSize <= 640 ? 2200 : normalizedSize <= 768 ? 2800 : 3400,
              },
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const payload = await res.json().catch(() => null);
          if (!res.ok) {
            const retryable = res.status === 429 || res.status >= 500;
            lastError = Object.assign(new Error(payload?.error?.message || payload?.message || "Gemini call failed"), {
              status: res.status,
              retryable,
              model,
            });
            if (retryable && attempt === 0) {
              await wait(450);
              continue;
            }
            break;
          }

          const rawText = parseGeminiText(payload);
          const obj = parseJson(rawText);
          if (!obj) {
            lastError = Object.assign(new Error("Gemini JSON parse failed"), { status: 502, model });
            break;
          }

          const svg = normalizeSvg(obj.svg || obj.guardian?.svg || obj.result?.svg || obj.data?.svg);
          if (!svg) {
            lastError = Object.assign(new Error("Gemini SVG parse failed"), { status: 502, model });
            break;
          }

          if (expectedSpecies) {
            const receivedSpecies = normalizeAnimalSpeciesToken(
              obj.animal_species_en || obj.animal || obj.species || obj.title || obj.summary || obj.illustration_prompt
            );
            if (receivedSpecies && receivedSpecies !== expectedSpecies) {
              lastError = Object.assign(
                new Error("Gemini animal species mismatch: expected " + expectedSpecies + ", got " + receivedSpecies),
                { status: 502, model }
              );
              break;
            }
          }

          return {
            title: sanitizeOutputCopy(
              obj.title ||
                (normalizedMode === "profile-mini"
                  ? "미니 가디언"
                  : totemAnimal && totemAnimal.name
                    ? toGuardianLabel(totemAnimal.name) + " 수호 캐릭터"
                    : "사주 동물 아트")
            ),
            summary: sanitizeOutputCopy(
              obj.summary || visual.summary || (normalizedMode === "profile-mini" ? "프로필 카드용 미니 가디언" : "사주 기반 수호 캐릭터 아트")
            ),
            facialExpression: String(obj.facial_expression || visual.facialExpression || "부드러운 미소").trim(),
            backgroundMotif: String(obj.background_motif || visual.backgroundMotif || "파스텔 자연 배경").trim(),
            illustrationPrompt: String(
              obj.illustration_prompt ||
                (normalizedMode === "profile-mini"
                  ? "프로필 카드용 미니 만화풍 가디언 아이콘"
                  : "귀여운 파스텔톤 동물 가디언(" + ((totemAnimal && (totemAnimal.nameEn || totemAnimal.name)) || "baby animal") + "), 표정: " +
                    (obj.facial_expression || visual.facialExpression) + ", 배경: " + (obj.background_motif || visual.backgroundMotif))
            ).trim(),
            styleIntensity: normalizedStyle,
            svg,
            source: "gemini",
            model,
          };
        } catch (e) {
          lastError = e;
          if (attempt === 0) {
            await wait(350);
            continue;
          }
          break;
        }
      }
    }
  }

  throw lastError || new Error("Gemini 요청에 실패했습니다.");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const profile = body?.profile || null;
    const sajuAnalysis = body?.sajuAnalysis || null;
    const totemAnimal = normalizeTotemAnimal(body?.totemAnimal || null);
    const renderMode = normalizeRenderMode(body?.renderMode || null);
    const styleIntensity = normalizeStyleIntensity(body?.styleIntensity || null);
    const outputSize = normalizeOutputSize(body?.outputSize || null, renderMode);
    const avatarPrompt = String(body?.avatarPrompt || "").trim();
    const imagePrompt = String(body?.imagePrompt || "").trim();
    if (!profile || !profile.birth) {
      return NextResponse.json({ ok: false, message: "profile.birth가 필요합니다." }, { status: 400 });
    }

    const visual = analyzeSajuVisual(profile, sajuAnalysis);
    let guardian;
    try {
      guardian = await callGemini(profile, visual, totemAnimal, renderMode, styleIntensity, outputSize, avatarPrompt, imagePrompt);
    } catch (geminiError) {
      console.warn("[api/guardian-avatar] Gemini failed, using fallback guardian", geminiError);
      guardian = buildFallbackGuardian(
        profile,
        visual,
        totemAnimal,
        renderMode,
        styleIntensity,
        geminiError?.message || "gemini-call-failed",
        outputSize
      );
    }

    return NextResponse.json({
      ok: true,
      guardian: {
        title: guardian.title,
        summary: guardian.summary,
        facial_expression: guardian.facialExpression,
        background_motif: guardian.backgroundMotif,
        illustration_prompt: guardian.illustrationPrompt,
        svg_data_uri: toDataUri(guardian.svg),
        created_at: new Date().toISOString(),
        render_mode: renderMode,
        output_size: outputSize,
        style_intensity: guardian.styleIntensity,
        generation_source: guardian.source || "unknown",
        fallback_reason: guardian.fallbackReason || null,
        warning_message:
          guardian.source === "fallback"
            ? "현재 API 이용자가 많아 임시 고화질 폴백 이미지로 표시했어요. 잠시 후 다시 시도하면 AI 원본 결과를 받을 수 있어요."
            : null,
      },
      saju_visual: visual,
    });
  } catch (error) {
    console.error("[api/guardian-avatar]", error);
    const status = Number.isFinite(error?.status) ? error.status : 503;
    const message =
      status >= 500
        ? "현재 이미지 서버 응답이 불안정합니다. 잠시 후 다시 시도해주세요."
        : String(error?.message || "요청 처리에 실패했습니다.");
    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status }
    );
  }
}
