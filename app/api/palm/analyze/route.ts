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
import { analyzePalmHandInput } from "@/lib/palm/palm-map-engine";
import { requireRouteAuth } from "@/app/_lib/route-auth";

// ─── Gemini Vision 손금 분석 ───────────────────────────────────────────────

const GEMINI_VISION_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

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

const PALM_VISION_SYSTEM_PROMPT = `당신은 전통 손금 전문가입니다. 업로드된 손바닥 사진을 보고 정밀하게 손금을 분석하세요.
반드시 사진에 실제로 보이는 근거만 사용하고, 보이지 않는 정보는 추측하지 마세요.
감지되지 않은 항목은 detected=false 또는 strength=none으로 두세요.
건강/수명/사고/재난을 단정하지 말고, 조언은 현실적인 행동 지침 중심으로 작성하세요.
반드시 아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만 출력하세요.
{
  "palmDetected": true,
  "handSide": "right 또는 left",
  "handShape": {
    "type": "earth|fire|air|water|mixed",
    "labelKo": "흙손|불손|바람손|물손|혼합형",
    "palmRatio": "wide|normal|narrow",
    "fingerRatio": "long|normal|short",
    "summary": "손 형태 한줄 설명"
  },
  "majorLines": {
    "lifeLine": {
      "detected": true,
      "length": "long|medium|short",
      "depth": "deep|medium|faint",
      "curvature": "wide|normal|narrow",
      "breaks": 0,
      "branches": 0,
      "summary": "생명선 특징 요약",
      "advice": "조언"
    },
    "headLine": {
      "detected": true,
      "length": "long|medium|short",
      "direction": "straight|curved|downward",
      "startRelationWithLifeLine": "joined|separated",
      "breaks": 0,
      "branches": 0,
      "summary": "두뇌선 특징 요약",
      "advice": "조언"
    },
    "heartLine": {
      "detected": true,
      "length": "long|medium|short",
      "curvature": "strong|soft|straight",
      "endingArea": "underIndex|underMiddle|between",
      "breaks": 0,
      "branches": 0,
      "summary": "감정선 특징 요약",
      "advice": "조언"
    },
    "fateLine": {
      "detected": true,
      "strength": "strong|medium|weak|none",
      "startArea": "wrist|lifeLine|moonMount|middlePalm",
      "endArea": "saturnMount|middlePalm",
      "breaks": 0,
      "summary": "운명선 특징 요약",
      "advice": "조언"
    }
  },
  "minorLines": {
    "sunLine": { "detected": true, "strength": "strong|medium|weak|none", "summary": "태양선 요약" },
    "moneyLine": { "detected": false, "strength": "none", "summary": "재물선 요약" },
    "marriageLine": { "detected": true, "strength": "medium", "summary": "결혼선 요약" },
    "mercuryLine": { "detected": false, "strength": "none", "summary": "수성선 요약" }
  },
  "mounts": {
    "venus": { "fullness": "strong|medium|weak", "summary": "금성구 요약" },
    "moon": { "fullness": "medium", "summary": "월구 요약" },
    "jupiter": { "fullness": "strong", "summary": "목성구 요약" },
    "saturn": { "fullness": "medium", "summary": "토성구 요약" },
    "sun": { "fullness": "medium", "summary": "태양구 요약" },
    "mercury": { "fullness": "medium", "summary": "수성구 요약" },
    "mars": { "fullness": "medium", "summary": "화성구 요약" }
  },
  "scores": {
    "love": 75,
    "career": 80,
    "wealth": 70,
    "vitality": 85,
    "creativity": 78,
    "communication": 72
  },
  "overall": {
    "title": "전체 손금 특징 제목",
    "summary": "전체 손금에 대한 종합 설명 (3-4문장)",
    "strengths": ["강점1", "강점2", "강점3"],
    "cautions": ["주의점1", "주의점2"],
    "recommendedActions": ["실천사항1", "실천사항2"]
  },
  "imageQuality": {
    "brightness": "good|normal|dark",
    "sharpness": "good|normal|blurry",
    "palmCoverage": 0.75
  },
  "purposeAnalysis": {
    "summary": "핵심 요약 (3~5문장)",
    "evidence": [
      { "label": "생명선", "text": "관련 근거" },
      { "label": "기타", "text": "관련 근거" }
    ],
    "details": "상세 해석 (충분히 긴 상담형 문장)",
    "cautions": ["주의할 점 1", "주의할 점 2"],
    "actions": ["실천 가능한 행동 가이드 1", "실천 가능한 행동 가이드 2"],
    "sections": [
      { "title": "카테고리 맞춤 섹션 1", "content": "상세 내용" },
      { "title": "카테고리 맞춤 섹션 2", "content": "상세 내용" }
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

  const userPrompt = `이 사진은 ${declaredSide === "right" ? "오른손" : "왼손"} 바닥입니다. 사용자의 분석 목적은 '${purposeText}'입니다. 이 목적에 맞춰 각 선의 특징과 조언을 구체적으로 분석하여 JSON으로만 응답하세요.`;

  let payload: unknown;
  try {
    const res = await fetch(`${endpoint}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PALM_VISION_SYSTEM_PROMPT },
              { text: userPrompt },
              { inline_data: { mime_type: imageInfo.mimeType, data: imageInfo.data } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
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
      palmCoverage: Number(iq?.palmCoverage ?? 0.7),
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
      summary: str(hs.summary, "손 형태를 분석했습니다."),
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
export const maxDuration = 30;

type RawImageInput = File | string | Record<string, unknown> | null | undefined;

type ParsedPayload = {
  uploadedHandSide: string;
  leftPalmImage: RawImageInput;
  rightPalmImage: RawImageInput;
  leftHandLandmarks: Record<string, unknown> | null;
  rightHandLandmarks: Record<string, unknown> | null;
  leftLineCandidates: Array<Record<string, unknown>>;
  rightLineCandidates: Array<Record<string, unknown>>;
  leftImageQuality: Record<string, unknown> | null;
  rightImageQuality: Record<string, unknown> | null;
  handLandmarks: Record<string, unknown> | null;
  lineCandidates: Array<Record<string, unknown>>;
  imageQuality: Record<string, unknown> | null;
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

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toCandidateArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

async function parsePayload(req: NextRequest): Promise<ParsedPayload> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return {
      uploadedHandSide: toNonEmptyString(form.get("uploadedHandSide")),
      leftPalmImage: (form.get("leftPalmImage") as RawImageInput) ?? null,
      rightPalmImage: (form.get("rightPalmImage") as RawImageInput) ?? null,
      leftHandLandmarks: toObject(form.get("leftHandLandmarks")),
      rightHandLandmarks: toObject(form.get("rightHandLandmarks")),
      leftLineCandidates: toCandidateArray(form.get("leftLineCandidates")),
      rightLineCandidates: toCandidateArray(form.get("rightLineCandidates")),
      leftImageQuality: toObject(form.get("leftImageQuality")),
      rightImageQuality: toObject(form.get("rightImageQuality")),
      handLandmarks: toObject(form.get("handLandmarks")),
      lineCandidates: toCandidateArray(form.get("lineCandidates")),
      imageQuality: toObject(form.get("imageQuality")),
      dominantHand: toNonEmptyString(form.get("dominantHand")),
      analysisPurpose: toNonEmptyString(form.get("analysisPurpose")),
    };
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  return {
    uploadedHandSide: toNonEmptyString(body.uploadedHandSide),
    leftPalmImage: (body.leftPalmImage as RawImageInput) ?? null,
    rightPalmImage: (body.rightPalmImage as RawImageInput) ?? null,
    leftHandLandmarks: toObject(body.leftHandLandmarks),
    rightHandLandmarks: toObject(body.rightHandLandmarks),
    leftLineCandidates: toCandidateArray(body.leftLineCandidates),
    rightLineCandidates: toCandidateArray(body.rightLineCandidates),
    leftImageQuality: toObject(body.leftImageQuality),
    rightImageQuality: toObject(body.rightImageQuality),
    handLandmarks: toObject(body.handLandmarks),
    lineCandidates: toCandidateArray(body.lineCandidates),
    imageQuality: toObject(body.imageQuality),
    dominantHand: toNonEmptyString(body.dominantHand),
    analysisPurpose: toNonEmptyString(body.analysisPurpose),
  };
}

function hasMeaningfulInput(sideData: {
  image: RawImageInput;
  landmarks: Record<string, unknown> | null;
  candidates: Array<Record<string, unknown>>;
}) {
  return Boolean(sideData.image || sideData.landmarks || sideData.candidates.length > 0);
}

function toSide(side: "left" | "right", payload: ParsedPayload) {
  const genericSide = payload.uploadedHandSide.toLowerCase();
  const useGeneric = genericSide === side;

  const image = side === "left" ? payload.leftPalmImage : payload.rightPalmImage;
  const landmarks =
    (side === "left" ? payload.leftHandLandmarks : payload.rightHandLandmarks) || (useGeneric ? payload.handLandmarks : null);
  const candidates =
    (side === "left" ? payload.leftLineCandidates : payload.rightLineCandidates) || (useGeneric ? payload.lineCandidates : []);
  const quality =
    (side === "left" ? payload.leftImageQuality : payload.rightImageQuality) || (useGeneric ? payload.imageQuality : null);

  return {
    image,
    landmarks,
    candidates,
    quality,
  };
}

function isEnoughQuality(recognition: any) {
  const q = recognition?.imageQuality || {};
  return Boolean(
    recognition?.palmDetected &&
      q.brightness !== "dark" &&
      q.sharpness !== "blurry" &&
      q.contrast !== "low" &&
      Number(q.palmCoverage || 0) >= 0.42,
  );
}

function pickRepresentativeImageQuality(analyses: Array<{ side: "left" | "right"; recognitionData: any }>) {
  const hasPalm = analyses.some((a) => a?.recognitionData?.palmDetected);
  const preferred = analyses.find((a) => isEnoughQuality(a.recognitionData)) || analyses.find((a) => a?.recognitionData?.palmDetected) || analyses[0];
  const q = preferred?.recognitionData?.imageQuality || {};
  const warnings: string[] = [];
  for (const entry of analyses) {
    const list = entry?.recognitionData?.extraction?.warnings;
    if (Array.isArray(list)) {
      warnings.push(...list.map((w) => String(w)));
    }
  }
  return {
    isPalmDetected: hasPalm,
    handSide: analyses.length === 2 ? "unknown" : analyses[0]?.side || "unknown",
    brightness: q.brightness || "normal",
    sharpness: q.sharpness || "normal",
    palmCoverage: Number(q.palmCoverage || 0),
    rotation: 0,
    warnings,
  } as const;
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRouteAuth(req);
    if (!auth.ok) return auth.response;

    const payload = await parsePayload(req);
    const dominantHand = normalizeDominantHand(payload.dominantHand);
    const analysisPurpose = normalizeAnalysisPurpose(payload.analysisPurpose);

    const leftInput = toSide("left", payload);
    const rightInput = toSide("right", payload);

    const hasLeftImage = typeof payload.leftPalmImage === "string" && (payload.leftPalmImage as string).startsWith("data:");
    const hasRightImage = typeof payload.rightPalmImage === "string" && (payload.rightPalmImage as string).startsWith("data:");
    const hasAnyImage = hasLeftImage || hasRightImage;

    if (!hasMeaningfulInput(leftInput) && !hasMeaningfulInput(rightInput) && !hasAnyImage) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_IMAGE",
          error: "left/right 입력 중 최소 하나는 이미지 또는 인식 데이터(lineCandidates/handLandmarks)가 필요합니다.",
        },
        { status: 400 },
      );
    }

    if (!dominantHand) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_DOMINANT_HAND",
          error: "dominantHand 입력이 필요합니다.",
        },
        { status: 400 },
      );
    }

    if (!analysisPurpose) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_ANALYSIS_PURPOSE",
          error: "analysisPurpose 입력이 필요합니다.",
        },
        { status: 400 },
      );
    }

    // ─── Gemini Vision으로 이미지 직접 분석 (클라이언트 CV 분석과 병렬 실행) ───
    const [visionLeft, visionRight] = await Promise.all([
      hasLeftImage
        ? analyzeHandWithGeminiVision(payload.leftPalmImage as string, "left", analysisPurpose).catch(() => null)
        : Promise.resolve(null),
      hasRightImage
        ? analyzeHandWithGeminiVision(payload.rightPalmImage as string, "right", analysisPurpose).catch(() => null)
        : Promise.resolve(null),
    ]);

    const analyses: Array<{
      side: "left" | "right";
      handReading: any;
      recognitionData: any;
      overlayPaths: any;
      hasMajorDetected: boolean;
      handRole: string;
      purposeAnalysis: any;
    }> = [];

    const processedSides = new Set<"left" | "right">();

    // Gemini Vision 결과 우선 사용 (클라이언트 CV 분석 결과보다 정확)
    if (visionLeft?.palmDetected) {
      const left = analyzePalmHandInput({
        uploadedHandSide: "left",
        dominantHand,
        analysisPurpose,
        rawImage: leftInput.image,
        imageQuality: visionLeft.imageQuality,
        handLandmarks: leftInput.landmarks,
        lineCandidates: leftInput.candidates,
      });
      analyses.push({
        side: "left",
        handReading: visionLeft.handReading,
        recognitionData: {
          palmDetected: true,
          imageQuality: visionLeft.imageQuality,
          extraction: { warnings: [] },
          visionSource: "gemini",
        },
        overlayPaths: left.overlayPaths,
        hasMajorDetected: true,
        handRole: left.handRole,
        purposeAnalysis: visionLeft.purposeAnalysis,
      });
      processedSides.add("left");
    }

    if (visionRight?.palmDetected) {
      const right = analyzePalmHandInput({
        uploadedHandSide: "right",
        dominantHand,
        analysisPurpose,
        rawImage: rightInput.image,
        imageQuality: visionRight.imageQuality,
        handLandmarks: rightInput.landmarks,
        lineCandidates: rightInput.candidates,
      });
      analyses.push({
        side: "right",
        handReading: visionRight.handReading,
        recognitionData: {
          palmDetected: true,
          imageQuality: visionRight.imageQuality,
          extraction: { warnings: [] },
          visionSource: "gemini",
        },
        overlayPaths: right.overlayPaths,
        hasMajorDetected: true,
        handRole: right.handRole,
        purposeAnalysis: visionRight.purposeAnalysis,
      });
      processedSides.add("right");
    }

    // 클라이언트 CV 분석 결과 폴백 (Gemini Vision이 실패한 경우)
    if (!processedSides.has("left") && hasMeaningfulInput(leftInput)) {
      const left = analyzePalmHandInput({
        uploadedHandSide: "left",
        dominantHand,
        analysisPurpose,
        rawImage: leftInput.image,
        imageQuality: leftInput.quality,
        handLandmarks: leftInput.landmarks,
        lineCandidates: leftInput.candidates,
      });
      analyses.push({
        side: "left",
        handReading: left.handReading,
        recognitionData: left.recognitionData,
        overlayPaths: left.overlayPaths,
        hasMajorDetected: left.hasMajorDetected,
        handRole: left.handRole,
        purposeAnalysis: null,
      });
    }

    if (!processedSides.has("right") && hasMeaningfulInput(rightInput)) {
      const right = analyzePalmHandInput({
        uploadedHandSide: "right",
        dominantHand,
        analysisPurpose,
        rawImage: rightInput.image,
        imageQuality: rightInput.quality,
        handLandmarks: rightInput.landmarks,
        lineCandidates: rightInput.candidates,
      });
      analyses.push({
        side: "right",
        handReading: right.handReading,
        recognitionData: right.recognitionData,
        overlayPaths: right.overlayPaths,
        hasMajorDetected: right.hasMajorDetected,
        handRole: right.handRole,
        purposeAnalysis: null,
      });
    }

    // 이미지가 있었지만 Vision 분석도 실패하고 클라이언트 데이터도 없는 경우 최소 결과 생성
    if (analyses.length === 0 && hasAnyImage) {
      const fallbackSide = hasRightImage ? "right" : "left";
      const fallbackVision = fallbackSide === "left" ? visionLeft : visionRight;
      if (fallbackVision) {
        const fb = analyzePalmHandInput({
          uploadedHandSide: fallbackSide,
          dominantHand,
          analysisPurpose,
          rawImage: null,
          imageQuality: fallbackVision.imageQuality,
          handLandmarks: null,
          lineCandidates: [],
        });
        analyses.push({
          side: fallbackSide,
          handReading: fallbackVision.handReading,
          recognitionData: { palmDetected: true, imageQuality: fallbackVision.imageQuality, extraction: { warnings: [] } },
          overlayPaths: fb.overlayPaths,
          hasMajorDetected: true,
          handRole: fb.handRole,
          purposeAnalysis: fallbackVision.purposeAnalysis,
        });
      }
    }

    const palmDetectedAny = analyses.some((a) => a?.recognitionData?.palmDetected);
    if (!palmDetectedAny) {
      return NextResponse.json(
        {
          ok: false,
          code: "PALM_NOT_DETECTED",
          error: "손바닥 인식에 실패했습니다. 손바닥 전체가 잘 보이는 사진으로 다시 시도해 주세요.",
          checks: analyses.map((item) => ({
            side: item.side,
            isPalmDetected: item?.recognitionData?.palmDetected,
            warnings: item?.recognitionData?.extraction?.warnings || [],
          })),
        },
        { status: 422 },
      );
    }

    // Quality check no longer rejects - it will be set as estimated mode in canonical validation
    // Removing the 423 IMAGE_QUALITY_LOW response to allow partial success

    const uploadedHands = analyses.map((a) => a.side) as Array<"left" | "right">;
    const leftAnalysis = analyses.find((a) => a.side === "left") || null;
    const rightAnalysis = analyses.find((a) => a.side === "right") || null;

    const leftHandReading = leftAnalysis?.handReading || null;
    const rightHandReading = rightAnalysis?.handReading || null;

    const imageQuality = pickRepresentativeImageQuality(analyses as any);
    const bothHandsComparison = buildBothHandsComparison({
      uploadedHands,
      dominantHand,
      leftHandRole: leftAnalysis?.handRole || "unknown",
      rightHandRole: rightAnalysis?.handRole || "unknown",
      leftHandReading,
      rightHandReading,
    });

    const primarySide =
      (payload.uploadedHandSide.toLowerCase() === "left" || payload.uploadedHandSide.toLowerCase() === "right"
        ? (payload.uploadedHandSide.toLowerCase() as "left" | "right")
        : uploadedHands[0]) || "right";

    const primaryRecognition =
      analyses.find((a) => a.side === primarySide)?.recognitionData || analyses[0]?.recognitionData || null;

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
      purposeAnalysis: leftAnalysis?.purposeAnalysis || rightAnalysis?.purposeAnalysis || null,
    });

    const interpretation = buildPalmInterpretationReport(canonical);

    const overlayPathsBySide = {
      left: leftAnalysis?.overlayPaths || null,
      right: rightAnalysis?.overlayPaths || null,
    };

    const overlayPaths =
      overlayPathsBySide[primarySide] || leftAnalysis?.overlayPaths || rightAnalysis?.overlayPaths || null;

    const recognitionData = {
      primarySide,
      primary: primaryRecognition,
      bySide: {
        left: leftAnalysis?.recognitionData || null,
        right: rightAnalysis?.recognitionData || null,
      },
    };

    const resultSections = Array.isArray(primaryRecognition?.sections) ? primaryRecognition.sections : [];

    return NextResponse.json({
      ...canonical,
      interpretation,
      overlayPaths,
      overlayPathsBySide,
      recognitionData,
      resultSections,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
