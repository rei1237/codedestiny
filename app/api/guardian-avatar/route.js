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

function modelName() {
  return String(process.env.GUARDIAN_AVATAR_GEMINI_MODEL || process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash");
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
  const name = String(payload.name || "").trim();
  const nameEn = String(payload.nameEn || "").trim();
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

function fallbackAnimalByElement(element) {
  const map = {
    wood: { name: "아기 사슴", nameEn: "baby deer" },
    fire: { name: "아기 사자", nameEn: "baby lion cub" },
    earth: { name: "아기 곰", nameEn: "baby bear" },
    metal: { name: "아기 늑대", nameEn: "baby wolf" },
    water: { name: "아기 거북이", nameEn: "baby turtle" },
  };
  return map[element] || map.wood;
}

function buildPrompt(profile, visual, totemAnimal, renderMode, styleIntensity) {
  const birth = (profile && profile.birth) || {};
  const loc = (profile && profile.location) || {};

  if (renderMode === "profile-mini") {
    return [
      "너는 프로필 카드용 미니 가디언 아이콘 디자이너다.",
      "반드시 JSON만 출력하고, svg 필드에는 완전한 단일 SVG 마크업을 넣어라.",
      "SVG는 정확히 160x160, 정사각형, 작은 썸네일에서도 식별 가능한 단순 만화풍 아이콘으로 생성하라.",
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
  const animalName = String(animal?.name || fallbackAnimal.name || "아기 사슴").trim();
  const animalNameEn = String(animal?.nameEn || fallbackAnimal.nameEn || "baby deer").trim();
  const animalKeyword = String(animal?.keyword || "").trim();
  const animalTraits = String(animal?.traits || "").trim();
  const styleGuide =
    styleIntensity === "strong"
      ? "선명한 만화풍(굵은 윤곽선, 명확한 명암, 중간 이상 채도)"
      : "부드러운 만화풍(유연한 윤곽선, 은은한 명암, 파스텔 중심)";

  return [
    "너는 사주 기반 캐릭터 디렉터다.",
    "반드시 JSON만 출력하고, svg 필드에는 완전한 단일 SVG 마크업을 넣어라.",
    "SVG는 512x512, 따뜻한 파스텔 만화풍 캐릭터 스타일(SD/chibi), 두꺼운 라인과 부드러운 셀 셰이딩, 저작권 문제 없는 오리지널로 생성하라.",
    "스타일은 동화풍이 아니라 분명한 만화풍으로, 명확한 윤곽선과 선명한 실루엣을 유지하라.",
    "만화풍 강도 지시: " + styleGuide,
    "반드시 동물 가디언을 주인공으로 그리고, 사주 동물 힌트와 동일한 동물 종을 유지하라.",
    "캐릭터 디테일을 구체적으로 표현하라: 표정(눈, 입, 볼터치), 머리/귀/꼬리/장신구, 의상 포인트, 전경 소품, 배경 레이어, 광원, 색조 대비.",
    "결과는 완성 일러스트 품질이어야 하며, 스케치나 아이콘 수준이 아니어야 한다.",
    "캐릭터 비율은 2.5등신 내외의 마스코트형으로 만들고, 얼굴 비중을 크게 해서 사랑스럽게 보이게 하라.",
    "색감은 파스텔톤 중심(저채도, 부드러운 명도 대비)으로 통일하고 공격적/다크 톤은 금지한다.",
    "이미지 안에 문자, 로고, 워터마크, 이름을 절대 넣지 마라.",
    "사주 성향 기반 표정과 오행 기반 배경을 반드시 반영하라.",
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
    }),
    '반드시 "' + animalNameEn + '" (' + animalName + ') 동물을 주인공으로 표현하라.',
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

function parseGeminiText(payload) {
  const parts = (((payload || {}).candidates || [])[0] || {}).content?.parts || [];
  return parts.map((p) => (p && p.text ? p.text : "")).join("\n").trim();
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = String(text || "").match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

async function callGemini(profile, visual, totemAnimal, renderMode, styleIntensity) {
  const keys = pickGeminiApiKeys();
  if (!keys.length) {
    throw Object.assign(new Error("GEMINI_API_KEY 또는 GOOGLE_API_KEY가 필요합니다."), { status: 500 });
  }

  const normalizedMode = normalizeRenderMode(renderMode);
  const normalizedStyle = normalizeStyleIntensity(styleIntensity);
  const model = modelName();
  const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", encodeURIComponent(model));
  const prompt = buildPrompt(profile, visual, totemAnimal, normalizedMode, normalizedStyle);

  let lastError = null;
  for (const key of keys) {
    try {
      const res = await fetch(endpoint + "?key=" + encodeURIComponent(key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: normalizedMode === "profile-mini" ? 0.65 : 0.85,
            topP: 0.95,
            maxOutputTokens: normalizedMode === "profile-mini" ? 480 : 2800,
            responseMimeType: "application/json",
          },
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        lastError = new Error(payload?.error?.message || payload?.message || "Gemini call failed");
        continue;
      }

      const rawText = parseGeminiText(payload);
      const obj = parseJson(rawText);
      if (!obj) {
        lastError = new Error("Gemini JSON parse failed");
        continue;
      }

      const svg = normalizeSvg(obj.svg);
      if (!svg) {
        lastError = new Error("Gemini SVG parse failed");
        continue;
      }

      return {
        title: String(
          obj.title ||
            (normalizedMode === "profile-mini"
              ? "미니 가디언"
              : totemAnimal && totemAnimal.name
                ? totemAnimal.name + " 가디언"
                : "사주 동물 아트")
        ).trim(),
        summary: String(
          obj.summary || visual.summary || (normalizedMode === "profile-mini" ? "프로필 카드용 미니 가디언" : "사주 기반 동물 아트")
        ).trim(),
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
      };
    } catch (e) {
      lastError = e;
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
    if (!profile || !profile.birth) {
      return NextResponse.json({ ok: false, message: "profile.birth가 필요합니다." }, { status: 400 });
    }

    const visual = analyzeSajuVisual(profile, sajuAnalysis);
    const guardian = await callGemini(profile, visual, totemAnimal, renderMode, styleIntensity);

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
        style_intensity: guardian.styleIntensity,
      },
      saju_visual: visual,
    });
  } catch (error) {
    console.error("[api/guardian-avatar]", error);
    return NextResponse.json(
      {
        ok: false,
        message: "이용자가 많아서 실패했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 503 }
    );
  }
}
