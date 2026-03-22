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

function analyzeSajuVisual(profile) {
  const birth = (profile && profile.birth) || {};
  const year = safeInt(birth.year, 2000);
  const month = safeInt(birth.month, 1);
  const day = safeInt(birth.day, 1);
  const hour = safeInt(birth.hour, 12);

  const stemElements = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
  const branchElements = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];

  const weights = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 };
  const stemIdx = ((year - 4) % 10 + 10) % 10;
  const yearBranchIdx = ((year - 4) % 12 + 12) % 12;
  const hourBranchIdx = Math.floor((((hour + 1) % 24) / 2));
  const seasonElement = month >= 3 && month <= 5 ? "wood" : month >= 6 && month <= 8 ? "fire" : month >= 9 && month <= 11 ? "metal" : "water";
  const dayElement = ["wood", "fire", "earth", "metal", "water"][Math.abs(year + month + day) % 5];

  weights[stemElements[stemIdx]] += 3;
  weights[branchElements[yearBranchIdx]] += 2;
  weights[branchElements[hourBranchIdx]] += 1;
  weights[seasonElement] += 2;
  weights[dayElement] += 2;

  let dominant = "earth";
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

function buildPrompt(profile, visual) {
  const name = (profile && profile.name) || "사용자";
  const birth = (profile && profile.birth) || {};
  const loc = (profile && profile.location) || {};
  return [
    "너는 사주 기반 캐릭터 디렉터다.",
    "반드시 JSON만 출력하고, svg 필드에는 완전한 단일 SVG 마크업을 넣어라.",
    "SVG는 512x512, 귀여운 파스텔 톤, 동화풍, 저작권 문제 없는 오리지널로 생성하라.",
    "캐릭터 디테일을 구체적으로 표현하라: 표정(눈, 입, 볼터치), 헤어/귀/꼬리/장신구, 의상 포인트, 전경 소품, 배경 레이어, 광원, 색조 대비.",
    "결과는 완성 일러스트 품질이어야 하며, 스케치나 아이콘 수준이 아니어야 한다.",
    "사주 성향 기반 표정과 오행 기반 배경을 반드시 반영하라.",
    "사용자 프로필:",
    JSON.stringify({
      name,
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

async function callGemini(profile, visual) {
  const keys = pickGeminiApiKeys();
  if (!keys.length) {
    throw Object.assign(new Error("GEMINI_API_KEY 또는 GOOGLE_API_KEY가 필요합니다."), { status: 500 });
  }

  const model = modelName();
  const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", encodeURIComponent(model));
  const prompt = buildPrompt(profile, visual);

  let lastError = null;
  for (const key of keys) {
    try {
      const res = await fetch(endpoint + "?key=" + encodeURIComponent(key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
            maxOutputTokens: 2800,
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
        title: String(obj.title || "사주로 보는 내 모습은?").trim(),
        summary: String(obj.summary || visual.summary || "사주 기반 가디언 아바타").trim(),
        facialExpression: String(obj.facial_expression || visual.facialExpression || "부드러운 미소").trim(),
        backgroundMotif: String(obj.background_motif || visual.backgroundMotif || "파스텔 자연 배경").trim(),
        illustrationPrompt: String(
          obj.illustration_prompt ||
            "귀여운 파스텔톤 동물 가디언, 표정: " + (obj.facial_expression || visual.facialExpression) + ", 배경: " + (obj.background_motif || visual.backgroundMotif)
        ).trim(),
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
    if (!profile || !profile.birth) {
      return NextResponse.json({ ok: false, message: "profile.birth가 필요합니다." }, { status: 400 });
    }

    const visual = analyzeSajuVisual(profile);
    const guardian = await callGemini(profile, visual);

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
