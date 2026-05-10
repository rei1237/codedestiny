import { NextRequest, NextResponse } from "next/server";
import {
  createDefaultCanonicalPalmReading,
  type CanonicalPalmReading,
  type PalmAnalysisPurpose,
  type PalmDominantHand,
  type PalmHandReading,
} from "@/types/palm-reading";
import { buildPalmInterpretationReport } from "@/lib/palm/interpretation-engine";
import { buildBothHandsComparison } from "@/lib/palm/both-hands-comparison";
import { requireRouteAuth } from "@/app/_lib/route-auth";
import fs from "fs";
import path from "path";

const GEMINI_VISION_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickVisionKey(): string {
  const keys = [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  if (!keys.length) return "";
  return keys[Math.floor(Math.random() * keys.length)];
}

function dataUrlToBase64(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// Few-shot learning images
function getTrainingImages() {
  const results = [];
  try {
    const p1 = "C:\\Users\\Neo\\Desktop\\손금\\images.jpg";
    if (fs.existsSync(p1)) {
      results.push({
        text: "Reference Image 1: Learn from this typical palm line distribution.",
        inline_data: { mime_type: "image/jpeg", data: fs.readFileSync(p1).toString("base64") }
      });
    }
    const p2 = "C:\\Users\\Neo\\Desktop\\손금\\images (1).jpg";
    if (fs.existsSync(p2)) {
      results.push({
        text: "Reference Image 2: Learn from this alternate palm line structure.",
        inline_data: { mime_type: "image/jpeg", data: fs.readFileSync(p2).toString("base64") }
      });
    }
  } catch (e) {
    // Ignore errors in production
  }
  return results;
}

const PALM_VISION_SYSTEM_PROMPT = `당신은 전통 손금 및 현대 AI 손금(Palm-Astro) 융합 전문가입니다. 
업로드된 손바닥 사진을 보고 정밀하게 손금을 분석하세요. 
반드시 사진에 실제로 보이는 근거만 사용하고, 보이지 않는 정보는 추측하지 마세요.
감지되지 않은 항목은 detected=false 또는 strength=none으로 두세요.

[분석 원칙 - 중요]
1. 오직 '손금'에 대한 분석 결과만 풍부하고 정확하게 출력하세요. 쓸데없는 일반론이나 인사말은 제외하세요.
2. 초점이 맞지 않거나 보기 어려운 미세한 잔선(어려운 손금)은 억지로 찾지 마세요. 대신 누구나 식별하기 쉬운 **생명선, 감정선, 두뇌선, 재물선, 운명선** 등 가장 기본적이고 굵은 핵심 선들에 집중하여 분석의 품질을 대폭 높이십시오.
3. 각 기본 선들의 형태, 굵기, 길이, 곡률 등을 바탕으로 매우 풍부하고 이해하기 쉬운 상세한 결과를 도출하세요.
4. Palm-Astro-Application의 특성을 반영하여 다음 3가지 핵심 지표를 반드시 분석 내용에 포함하세요:
   - 우세선(Dominant Line): 생명선, 두뇌선, 감정선 중 가장 길고 뚜렷한 선 (예: "두뇌선 우세")
   - 손바닥 곡률 유형(Palm Type): 손금 선들의 전반적인 곡률(Curvature)에 따라 "곡선형/표현형(Curved/Expressive)", "균형형(Balanced)", "직선형/실용형(Straight/Practical)" 중 하나로 분류.
   - 직업 변화 지표(Career Shift Indicator): 두뇌선(Head Line)의 꺾임 각도와 생명선-두뇌선 교차점의 형태를 바탕으로 한 직업/진로 변경 가능성 유무.
5. 건강/수명/사고/재난을 단정하지 말고, 조언은 현실적인 행동 지침 중심으로 작성하세요.
6. 설명 없이 반드시 아래 JSON 형식으로만 응답하세요.

{
  "palmDetected": true,
  "handSide": "right 또는 left",
  "handShape": {
    "type": "earth|fire|air|water|mixed",
    "labelKo": "흙손|불손|바람손|물손|혼합형",
    "palmRatio": "wide|normal|narrow",
    "fingerRatio": "long|normal|short",
    "summary": "손 형태와 기질에 대한 아주 깊고 풍부한 설명 (3~4문장)"
  },
  "majorLines": {
    "lifeLine": { "detected": true, "length": "long|medium|short", "depth": "deep|medium|faint", "curvature": "wide|normal|narrow", "breaks": 0, "branches": 0, "summary": "생명선 심층 분석 (에너지, 생명력)", "advice": "건강 관리 조언" },
    "headLine": { "detected": true, "length": "long|medium|short", "direction": "straight|curved|downward", "startRelationWithLifeLine": "joined|separated", "breaks": 0, "branches": 0, "summary": "두뇌선 심층 분석 (사고방식, 커리어)", "advice": "사고력 활용 조언" },
    "heartLine": { "detected": true, "length": "long|medium|short", "curvature": "strong|soft|straight", "endingArea": "underIndex|underMiddle|between", "breaks": 0, "branches": 0, "summary": "감정선 심층 분석 (연애, 감정표현)", "advice": "인간관계 조언" },
    "fateLine": { "detected": true, "strength": "strong|medium|weak|none", "startArea": "wrist|lifeLine|moonMount|middlePalm", "endArea": "saturnMount|middlePalm", "breaks": 0, "summary": "운명선 심층 분석 (직업, 성공)", "advice": "목표 달성 조언" }
  },
  "minorLines": {
    "sunLine": { "detected": true, "strength": "strong|medium|weak|none", "summary": "태양선 심층 분석 (인기, 명예)" },
    "moneyLine": { "detected": true, "strength": "medium", "summary": "재물선 심층 분석 (재물 축적 패턴)" },
    "marriageLine": { "detected": true, "strength": "medium", "summary": "결혼선 심층 분석 (결혼/연애 성향)" },
    "mercuryLine": { "detected": true, "strength": "none", "summary": "수성선 심층 분석 (소통, 사업)" }
  },
  "mounts": {
    "venus": { "fullness": "strong|medium|weak", "summary": "금성구 (열정, 가족애) 분석" },
    "moon": { "fullness": "medium", "summary": "월구 (상상력, 직관) 분석" },
    "jupiter": { "fullness": "strong", "summary": "목성구 (리더십, 야망) 분석" },
    "saturn": { "fullness": "medium", "summary": "토성구 (인내, 책임감) 분석" },
    "sun": { "fullness": "medium", "summary": "태양구 (창조력, 성공) 분석" },
    "mercury": { "fullness": "medium", "summary": "수성구 (기지, 사업) 분석" },
    "mars": { "fullness": "medium", "summary": "화성구 (투지, 용기) 분석" }
  },
  "scores": {
    "love": 75, "career": 80, "wealth": 70, "vitality": 85, "creativity": 78, "communication": 72
  },
  "overall": {
    "title": "분석 결과를 관통하는 핵심 제목",
    "summary": "우세선(Dominant Line)과 손바닥 곡률 유형(Palm Type)을 포함한 손금 전체에 대한 종합 심층 설명 (5문장 이상)",
    "strengths": ["구체적인 강점1", "구체적인 강점2", "구체적인 강점3"],
    "cautions": ["직업 변화 지표(Career Shift Indicator)를 고려한 주의점1", "주의점2"],
    "recommendedActions": ["구체적인 실천사항1", "실천사항2"]
  },
  "imageQuality": {
    "brightness": "good|normal|dark",
    "sharpness": "good|normal|blurry",
    "palmCoverage": 0.85
  },
  "purposeAnalysis": {
    "summary": "선택된 분석 목적에 맞는 핵심 요약 (3~5문장)",
    "evidence": [
      { "label": "우세선(Dominant Line)", "text": "생명선/두뇌선/감정선 중 어느 선이 가장 두드러지는지 및 그 의미" },
      { "label": "곡률 기반 손금 유형(Palm Type)", "text": "곡선형(Expressive)/균형형(Balanced)/직선형(Practical) 판별 결과" },
      { "label": "커리어 변화 지표(Career Shift)", "text": "두뇌선의 각도와 교차점 분석을 통한 직업 변동성 유무 분석" }
    ],
    "details": "선택된 목적에 대한 매우 상세하고 풍부한 심층 분석 결과 (상담사가 직접 말하듯 풍부한 내용)",
    "cautions": ["목적에 따른 주의사항 1", "주의사항 2"],
    "actions": ["목적에 따른 행동 가이드 1", "행동 가이드 2"],
    "sections": [
      { "title": "목적 맞춤 심층 분석 1", "content": "매우 상세하고 전문적인 내용" },
      { "title": "목적 맞춤 심층 분석 2", "content": "매우 상세하고 전문적인 내용" }
    ]
  }
}`;

async function analyzeHandWithGeminiVision(
  imageDataUrl: string,
  declaredSide: "left" | "right",
  analysisPurpose: string,
): Promise<{ handReading: PalmHandReading; palmDetected: boolean; imageQuality: Record<string, unknown>; purposeAnalysis: any; raw: unknown } | null> {
  const key = pickVisionKey();
  if (!key) return null;

  const imageInfo = dataUrlToBase64(imageDataUrl);
  if (!imageInfo) return null;

  const model = "gemini-2.0-flash";
  const endpoint = GEMINI_VISION_ENDPOINT.replace("{model}", model);

  const purposeKo: Record<string, string> = {
    general: "전체 운세",
    love: "연애운",
    wealth: "재물운",
    career: "직업운",
    personality: "성격분석",
    relationship: "관계 패턴",
  };
  const purposeText = purposeKo[analysisPurpose] || "전체 운세";

  const userPrompt = `이 사진은 ${declaredSide === "right" ? "오른손" : "왼손"} 바닥입니다. 사용자의 분석 목적은 '${purposeText}'입니다. 이 목적에 맞춰 각 손금 영역을 깊이 있게 풀이하세요. 결과는 단순한 키워드 나열이 아니라, 전문가가 직접 대면 상담하듯 매우 길고 구체적이며 심층적인 문장으로 작성해야 합니다. 또한 반드시 우세선, 곡률 기반 손금 유형, 커리어 변화 지표 3가지를 명시하세요. 결과는 JSON으로만 응답하세요.`;

  const trainingImages = getTrainingImages();
  const parts = [
    { text: PALM_VISION_SYSTEM_PROMPT },
    ...trainingImages.flatMap(img => [{ text: img.text }, { inline_data: img.inline_data }]),
    { text: userPrompt },
    { inline_data: { mime_type: imageInfo.mimeType, data: imageInfo.data } },
  ];

  let payload: unknown;
  try {
    const res = await fetch(`${endpoint}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    });
    if (!res.ok) return null;
    payload = await res.json();
  } catch {
    return null;
  }

  const text = extractGeminiText(payload);
  if (!text) return null;

  const jsonText = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    const match = jsonText.match(/\{[\s\S]+\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  const handReading = geminiResultToHandReading(parsed);
  const purposeAnalysis = asObj(parsed.purposeAnalysis);
  const iq = parsed.imageQuality as Record<string, unknown> | undefined;
  return {
    handReading,
    palmDetected: parsed.palmDetected !== false,
    imageQuality: {
      isPalmDetected: parsed.palmDetected !== false,
      handSide: parsed.handSide || declaredSide,
      brightness: iq?.brightness || "normal",
      sharpness: iq?.sharpness || "normal",
      palmCoverage: Number(iq?.palmCoverage ?? 0.85),
      rotation: 0,
      warnings: [],
    },
    purposeAnalysis: Object.keys(purposeAnalysis).length > 0 ? purposeAnalysis : null,
    raw: parsed,
  };
}

function extractGeminiText(payload: unknown): string {
  const p = payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  for (const c of p?.candidates ?? []) {
    for (const part of c?.content?.parts ?? []) {
      if (part?.text?.trim()) return part.text.trim();
    }
  }
  return "";
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function geminiResultToHandReading(g: Record<string, unknown>): PalmHandReading {
  const ml = asObj(g.majorLines);
  const ll = asObj(ml.lifeLine);
  const hl = asObj(ml.headLine);
  const htl = asObj(ml.heartLine);
  const fl = asObj(ml.fateLine);
  const mn = asObj(g.minorLines);
  const mt = asObj(g.mounts);
  const sc = asObj(g.scores);
  const ov = asObj(g.overall);
  const hs = asObj(g.handShape);

  return {
    handShape: {
      type: str(hs.type, "mixed") as PalmHandReading["handShape"]["type"],
      labelKo: str(hs.labelKo, "혼합형"),
      palmRatio: str(hs.palmRatio, "normal"),
      fingerRatio: str(hs.fingerRatio, "normal"),
      summary: str(hs.summary, "손 형태를 깊이 있게 분석했습니다."),
    },
    majorLines: {
      lifeLine: {
        detected: ll.detected !== false,
        length: str(ll.length, "medium") as PalmHandReading["majorLines"]["lifeLine"]["length"],
        depth: str(ll.depth, "medium") as PalmHandReading["majorLines"]["lifeLine"]["depth"],
        curvature: str(ll.curvature, "normal") as PalmHandReading["majorLines"]["lifeLine"]["curvature"],
        breaks: num(ll.breaks, 0),
        branches: num(ll.branches, 0),
        summary: str(ll.summary, "생명선을 감지했습니다."),
        advice: str(ll.advice, "규칙적인 생활 리듬을 유지하세요."),
      },
      headLine: {
        detected: hl.detected !== false,
        length: str(hl.length, "medium") as PalmHandReading["majorLines"]["headLine"]["length"],
        direction: str(hl.direction, "straight") as PalmHandReading["majorLines"]["headLine"]["direction"],
        startRelationWithLifeLine: str(hl.startRelationWithLifeLine, "joined") as PalmHandReading["majorLines"]["headLine"]["startRelationWithLifeLine"],
        breaks: num(hl.breaks, 0),
        branches: num(hl.branches, 0),
        summary: str(hl.summary, "두뇌선을 감지했습니다."),
        advice: str(hl.advice, "명확한 목표 설정이 도움이 됩니다."),
      },
      heartLine: {
        detected: htl.detected !== false,
        length: str(htl.length, "medium") as PalmHandReading["majorLines"]["heartLine"]["length"],
        curvature: str(htl.curvature, "soft") as PalmHandReading["majorLines"]["heartLine"]["curvature"],
        endingArea: str(htl.endingArea, "underMiddle") as PalmHandReading["majorLines"]["heartLine"]["endingArea"],
        breaks: num(htl.breaks, 0),
        branches: num(htl.branches, 0),
        summary: str(htl.summary, "감정선을 감지했습니다."),
        advice: str(htl.advice, "감정 표현을 솔직하게 하는 연습이 도움이 됩니다."),
      },
      fateLine: {
        detected: fl.detected !== false,
        strength: str(fl.strength, "medium") as PalmHandReading["majorLines"]["fateLine"]["strength"],
        startArea: str(fl.startArea, "wrist") as PalmHandReading["majorLines"]["fateLine"]["startArea"],
        endArea: str(fl.endArea, "saturnMount") as PalmHandReading["majorLines"]["fateLine"]["endArea"],
        breaks: num(fl.breaks, 0),
        summary: str(fl.summary, "운명선을 감지했습니다."),
        advice: str(fl.advice, "꾸준한 노력이 결실을 맺을 것입니다."),
      },
    },
    minorLines: {
      sunLine: {
        detected: asObj(mn.sunLine).detected !== false,
        strength: str(asObj(mn.sunLine).strength, null as unknown as string),
        summary: str(asObj(mn.sunLine).summary, "태양선을 분석했습니다."),
      },
      moneyLine: {
        detected: Boolean(asObj(mn.moneyLine).detected),
        strength: str(asObj(mn.moneyLine).strength, null as unknown as string),
        summary: str(asObj(mn.moneyLine).summary, "재물선을 분석했습니다."),
      },
      marriageLine: {
        detected: Boolean(asObj(mn.marriageLine).detected),
        strength: str(asObj(mn.marriageLine).strength, null as unknown as string),
        summary: str(asObj(mn.marriageLine).summary, "결혼선을 분석했습니다."),
      },
      mercuryLine: {
        detected: Boolean(asObj(mn.mercuryLine).detected),
        strength: str(asObj(mn.mercuryLine).strength, null as unknown as string),
        summary: str(asObj(mn.mercuryLine).summary, "수성선을 분석했습니다."),
      },
    },
    mounts: {
      venus: { fullness: str(asObj(mt.venus).fullness, "medium") as PalmHandReading["mounts"]["venus"]["fullness"], summary: str(asObj(mt.venus).summary, "") },
      moon: { fullness: str(asObj(mt.moon).fullness, "medium") as PalmHandReading["mounts"]["moon"]["fullness"], summary: str(asObj(mt.moon).summary, "") },
      jupiter: { fullness: str(asObj(mt.jupiter).fullness, "medium") as PalmHandReading["mounts"]["jupiter"]["fullness"], summary: str(asObj(mt.jupiter).summary, "") },
      saturn: { fullness: str(asObj(mt.saturn).fullness, "medium") as PalmHandReading["mounts"]["saturn"]["fullness"], summary: str(asObj(mt.saturn).summary, "") },
      sun: { fullness: str(asObj(mt.sun).fullness, "medium") as PalmHandReading["mounts"]["sun"]["fullness"], summary: str(asObj(mt.sun).summary, "") },
      mercury: { fullness: str(asObj(mt.mercury).fullness, "medium") as PalmHandReading["mounts"]["mercury"]["fullness"], summary: str(asObj(mt.mercury).summary, "") },
      mars: { fullness: str(asObj(mt.mars).fullness, "medium") as PalmHandReading["mounts"]["mars"]["fullness"], summary: str(asObj(mt.mars).summary, "") },
    },
    scores: {
      love: num(sc.love, null as unknown as number),
      career: num(sc.career, null as unknown as number),
      wealth: num(sc.wealth, null as unknown as number),
      vitality: num(sc.vitality, null as unknown as number),
      creativity: num(sc.creativity, null as unknown as number),
      communication: num(sc.communication, null as unknown as number),
    },
    overall: {
      title: str(ov.title, "손금 분석 결과"),
      summary: str(ov.summary, "손금을 분석했습니다."),
      strengths: asArr(ov.strengths).map((s) => String(s)),
      cautions: asArr(ov.cautions).map((s) => String(s)),
      recommendedActions: asArr(ov.recommendedActions).map((s) => String(s)),
    },
  };
}

export const runtime = "nodejs";
export const maxDuration = 45;

type RawImageInput = File | string | Record<string, unknown> | null | undefined;

type ParsedPayload = {
  uploadedHandSide: string;
  leftPalmImage: RawImageInput;
  rightPalmImage: RawImageInput;
  dominantHand: string;
  analysisPurpose: string;
};

function toNonEmptyString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeDominantHand(value: string): PalmDominantHand | null {
  const lowered = value.trim().toLowerCase();
  if (lowered === "right") return "right";
  if (lowered === "left") return "left";
  if (lowered === "both") return "both";
  return null;
}

function normalizeAnalysisPurpose(value: string): PalmAnalysisPurpose | null {
  const lowered = value.trim().toLowerCase();
  if (lowered === "overall") return "general";
  if (lowered === "general") return "general";
  if (lowered === "love") return "love";
  if (lowered === "wealth") return "wealth";
  if (lowered === "career") return "career";
  if (lowered === "personality") return "personality";
  if (lowered === "relationship") return "relationship";
  return null;
}

async function parsePayload(req: NextRequest): Promise<ParsedPayload> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return {
      uploadedHandSide: toNonEmptyString(form.get("uploadedHandSide")),
      leftPalmImage: (form.get("leftPalmImage") as RawImageInput) ?? null,
      rightPalmImage: (form.get("rightPalmImage") as RawImageInput) ?? null,
      dominantHand: toNonEmptyString(form.get("dominantHand")),
      analysisPurpose: toNonEmptyString(form.get("analysisPurpose")),
    };
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  return {
    uploadedHandSide: toNonEmptyString(body.uploadedHandSide),
    leftPalmImage: (body.leftPalmImage as RawImageInput) ?? null,
    rightPalmImage: (body.rightPalmImage as RawImageInput) ?? null,
    dominantHand: toNonEmptyString(body.dominantHand),
    analysisPurpose: toNonEmptyString(body.analysisPurpose),
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRouteAuth(req);
    if (!auth.ok) {
      return "response" in auth ? (auth as any).response : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await parsePayload(req);
    const dominantHand = normalizeDominantHand(payload.dominantHand);
    const analysisPurpose = normalizeAnalysisPurpose(payload.analysisPurpose);

    const hasLeftImage = typeof payload.leftPalmImage === "string" && (payload.leftPalmImage as string).startsWith("data:");
    const hasRightImage = typeof payload.rightPalmImage === "string" && (payload.rightPalmImage as string).startsWith("data:");
    const hasAnyImage = hasLeftImage || hasRightImage;

    if (!hasAnyImage) {
      return NextResponse.json(
        { ok: false, code: "MISSING_IMAGE", error: "손바닥 이미지가 필요합니다." },
        { status: 400 }
      );
    }
    if (!dominantHand) {
      return NextResponse.json({ ok: false, code: "MISSING_DOMINANT_HAND", error: "주로 사용하는 손 정보가 필요합니다." }, { status: 400 });
    }
    if (!analysisPurpose) {
      return NextResponse.json({ ok: false, code: "MISSING_ANALYSIS_PURPOSE", error: "분석 목적 정보가 필요합니다." }, { status: 400 });
    }

    const [visionLeft, visionRight] = await Promise.all([
      hasLeftImage ? analyzeHandWithGeminiVision(payload.leftPalmImage as string, "left", analysisPurpose).catch(() => null) : Promise.resolve(null),
      hasRightImage ? analyzeHandWithGeminiVision(payload.rightPalmImage as string, "right", analysisPurpose).catch(() => null) : Promise.resolve(null),
    ]);

    const analyses: Array<{
      side: "left" | "right";
      handReading: any;
      recognitionData: any;
      handRole: string;
      purposeAnalysis: any;
    }> = [];

    const getHandRole = (side: string, dom: string): "innate" | "acquired" | "mixed" | "unknown" => {
      if (dom === "both") return "mixed";
      if (dom === "right") return side === "right" ? "acquired" : "innate";
      if (dom === "left") return side === "left" ? "acquired" : "innate";
      return "unknown";
    };

    if (visionLeft?.palmDetected) {
      analyses.push({
        side: "left",
        handReading: visionLeft.handReading,
        recognitionData: { palmDetected: true, imageQuality: visionLeft.imageQuality, visionSource: "gemini_palm_astro" },
        handRole: getHandRole("left", dominantHand),
        purposeAnalysis: visionLeft.purposeAnalysis,
      });
    }

    if (visionRight?.palmDetected) {
      analyses.push({
        side: "right",
        handReading: visionRight.handReading,
        recognitionData: { palmDetected: true, imageQuality: visionRight.imageQuality, visionSource: "gemini_palm_astro" },
        handRole: getHandRole("right", dominantHand),
        purposeAnalysis: visionRight.purposeAnalysis,
      });
    }

    if (analyses.length === 0) {
      return NextResponse.json(
        { ok: false, code: "PALM_NOT_DETECTED", error: "손바닥 인식에 실패했습니다. 손바닥 전체가 잘 보이는 사진으로 다시 시도해 주세요." },
        { status: 422 }
      );
    }

    const uploadedHands = analyses.map((a) => a.side) as Array<"left" | "right">;
    const leftAnalysis = analyses.find((a) => a.side === "left") || null;
    const rightAnalysis = analyses.find((a) => a.side === "right") || null;
    const leftHandReading = leftAnalysis?.handReading || null;
    const rightHandReading = rightAnalysis?.handReading || null;
    
    const primarySide =
      (payload.uploadedHandSide.toLowerCase() === "left" || payload.uploadedHandSide.toLowerCase() === "right"
        ? (payload.uploadedHandSide.toLowerCase() as "left" | "right")
        : uploadedHands[0]) || "right";
    
    const primaryAnalysis = analyses.find((a) => a.side === primarySide) || analyses[0];
    const imageQuality = primaryAnalysis.recognitionData.imageQuality;

    const bothHandsComparison = buildBothHandsComparison({
      uploadedHands,
      dominantHand,
      leftHandRole: leftAnalysis?.handRole || "unknown",
      rightHandRole: rightAnalysis?.handRole || "unknown",
      leftHandReading,
      rightHandReading,
    });

    const canonical: CanonicalPalmReading = createDefaultCanonicalPalmReading({
      dominantHand,
      analysisPurpose,
      uploadedHands,
      leftHandRole: leftAnalysis?.handRole || "unknown",
      rightHandRole: rightAnalysis?.handRole || "unknown",
      imageQuality,
      leftHandReading,
      rightHandReading,
      comparison: bothHandsComparison,
      purposeAnalysis: primaryAnalysis.purposeAnalysis || null,
    });

    const interpretation = buildPalmInterpretationReport(canonical);

    const recognitionData = {
      primarySide,
      primary: primaryAnalysis.recognitionData,
      bySide: {
        left: leftAnalysis?.recognitionData || null,
        right: rightAnalysis?.recognitionData || null,
      },
    };

    return NextResponse.json({
      ok: true,
      data: {
        canonical,
        interpretation,
        recognitionData,
      },
    });
  } catch (error: any) {
    console.error("[Palm Analyze Route] Error:", error);
    return NextResponse.json({ ok: false, error: "서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
