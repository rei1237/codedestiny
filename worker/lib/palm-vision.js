// 손금 Gemini Vision 판독 — 워커 정본.
//
// 배경: 프로덕션 빌드는 next.config.mjs 의 output:"export" 라 app/api/** 라우트가 통째로
// 빌드에서 빠진다. 그래서 Gemini Vision 이 들어있던 app/api/palm/analyze/route.ts 는
// 로컬 dev 에서만 돌았고, 실제 트래픽(code-destiny.com/api/* → 워커)이 타는
// worker/routes/palm.js 에는 LLM 호출이 한 줄도 없었다. 사용자가 본 "AI 손금"은
// 고정 좌표 가이드라인 + 정적 템플릿이었다. 이 모듈이 그 공백을 메운다.
//
// 🔴 비전 호출은 반드시 fallbackToWorkersAI:false. Workers AI 폴백 경로는
//    normalized.prompt 만으로 메시지를 만들어 inline_data(사진)를 버리기 때문에,
//    켜두면 "사진 없이 손금을 판독하라"를 받은 텍스트 모델이 판독을 지어낸다.
//    비전의 올바른 degrade 는 Workers AI 가 아니라 결정론 엔진(palm-map-engine)이다.
//    폴백을 끄므로 fallbackMinChars 규칙은 비전 호출엔 해당하지 않는다.
//    반대로 심층 해석(buildPalmDeepConsult)은 텍스트 전용이라 폴백을 켜고
//    fallbackMinChars 를 준다.

import { callGeminiJsonWithRetry } from "./structured-consultation.js";
import { callGeminiText } from "./gemini.js";

// 심층 해석의 최소 분량. Workers AI 폴백 문턱은 관례대로 이 값 × 0.4.
export const PALM_CONSULT_MIN_CHARS = 1200;
const PALM_CONSULT_FALLBACK_MIN_CHARS = Math.round(PALM_CONSULT_MIN_CHARS * 0.4);

// 손당 비전 타임아웃. 양손이면 병렬 2회이므로 기본 30초를 그대로 쓰면 예산을 넘긴다.
const VISION_TIMEOUT_MS = 20000;
const CONSULT_TIMEOUT_MS = 25000;

const PURPOSE_KO = {
  general: "전체 운세",
  love: "연애운",
  wealth: "재물운",
  career: "직업운",
  personality: "성격분석",
  relationship: "관계 패턴",
};

export function dataUrlToBase64(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/* ------------------------------------------------------------------ *
 * 프롬프트
 * ------------------------------------------------------------------ */

export const PALM_VISION_SYSTEM_PROMPT = `당신은 전통 손금과 현대 손금학(Palm-Astro)을 함께 다루는 최고 수준의 손금 판독 전문가입니다.
업로드된 손바닥 사진을 보고 손금을 판독하세요.

[근거 원칙 — 가장 중요]
1. 반드시 사진에 실제로 보이는 것만 근거로 쓰세요. 보이지 않는 것은 추측하지 마세요.
2. 확실하지 않으면 detected=false, confidence=0 으로 두세요. 애매한 것을 "있다"고 하는 것보다 "없다"고 하는 쪽이 항상 낫습니다.
3. confidence 는 사진에서 그 선/문양을 실제로 식별한 확신도입니다(0.0~1.0). 굵고 뚜렷한 주요선만 0.7 이상을 줄 수 있습니다. 미세한 잔선·문양이 0.6 을 넘는 일은 드뭅니다.
4. 손바닥이 아닌 사진이거나 손금을 식별할 수 없으면 palmDetected=false 로 응답하고 억지로 판독하지 마세요.
5. 사진이 어둡거나 흐리면 imageQuality 에 정직하게 반영하고, 판독 항목 수를 줄이세요. 품질이 나쁠수록 detected=true 는 적어야 합니다.

[판독 원칙]
6. 주요선(생명선·두뇌선·감정선·운명선)에 가장 큰 비중을 두세요. 이들은 대개 식별 가능합니다.
7. 보조선과 문양은 명확히 보일 때만 detected=true. 안 보이면 그냥 false 로 두고 넘어가세요.
8. 각 선은 길이·깊이·곡률·끊김·갈라짐·시작점·끝점을 관찰해 해석하세요.
9. 다음 3가지 지표를 반드시 포함하세요:
   - 우세선(Dominant Line): 생명선·두뇌선·감정선 중 가장 길고 뚜렷한 선
   - 손바닥 곡률 유형(Palm Type): "곡선형/표현형", "균형형", "직선형/실용형" 중 하나
   - 직업 변화 지표(Career Shift): 두뇌선의 꺾임과 생명선-두뇌선 시작점 관계 기반
10. 건강·수명·사고·재난·질병을 단정하지 마세요. 의학적 진단을 하지 마세요. 조언은 현실적인 행동 지침으로 쓰세요.
11. summary 는 키워드 나열이 아니라, 전문가가 마주 앉아 설명하듯 구체적인 문장으로 쓰세요.
12. 설명·인사말·코드펜스 없이 아래 JSON 스키마로만 응답하세요.

{
  "palmDetected": true,
  "handSide": "right | left",
  "notPalmReason": "palmDetected=false 일 때만 이유를 한 문장으로. 아니면 빈 문자열",
  "handShape": {
    "type": "earth|fire|air|water|mixed",
    "labelKo": "흙손|불손|바람손|물손|혼합형",
    "palmRatio": "wide|normal|narrow",
    "fingerRatio": "long|normal|short",
    "summary": "손 형태와 기질 설명 (3~4문장)"
  },
  "majorLines": {
    "lifeLine":  { "detected": false, "confidence": 0.0, "length": "long|medium|short", "depth": "deep|medium|faint", "curvature": "wide|normal|narrow", "breaks": 0, "branches": 0, "startPoint": "관찰된 시작 위치", "endPoint": "관찰된 끝 위치", "summary": "생명선 심층 분석 (생명력·체력·삶의 리듬)", "advice": "실천 조언" },
    "headLine":  { "detected": false, "confidence": 0.0, "length": "long|medium|short", "depth": "deep|medium|faint", "direction": "straight|curved|downward", "startRelationWithLifeLine": "joined|separated", "breaks": 0, "branches": 0, "summary": "두뇌선 심층 분석 (사고방식·판단·적성)", "advice": "실천 조언" },
    "heartLine": { "detected": false, "confidence": 0.0, "length": "long|medium|short", "depth": "deep|medium|faint", "curvature": "strong|soft|straight", "endingArea": "underIndex|underMiddle|between", "breaks": 0, "branches": 0, "summary": "감정선 심층 분석 (애정 표현·감정 처리)", "advice": "실천 조언" },
    "fateLine":  { "detected": false, "confidence": 0.0, "strength": "strong|medium|weak|none", "startArea": "wrist|lifeLine|moonMount|middlePalm", "endArea": "saturnMount|middlePalm", "breaks": 0, "summary": "운명선 심층 분석 (직업·사회적 궤도)", "advice": "실천 조언" }
  },
  "minorLines": {
    "sunLine":       { "detected": false, "confidence": 0.0, "strength": "strong|medium|weak|none", "summary": "태양선 (인정·명예·매력)" },
    "moneyLine":     { "detected": false, "confidence": 0.0, "strength": "none", "summary": "재물선 (재물 축적 패턴)" },
    "marriageLine":  { "detected": false, "confidence": 0.0, "strength": "none", "summary": "결혼선 (인연·결혼 성향)" },
    "mercuryLine":   { "detected": false, "confidence": 0.0, "strength": "none", "summary": "수성선 (소통·사업 감각)" },
    "healthLine":    { "detected": false, "confidence": 0.0, "strength": "none", "summary": "건강선 (체력 관리 경향 — 질병 단정 금지)" },
    "intuitionLine": { "detected": false, "confidence": 0.0, "strength": "none", "summary": "직관선 (통찰·감수성)" },
    "girdleOfVenus": { "detected": false, "confidence": 0.0, "strength": "none", "summary": "금성대 (감수성·예민함)" },
    "travelLine":    { "detected": false, "confidence": 0.0, "strength": "none", "summary": "여행선 (이동·변화)" },
    "braceletLine":  { "detected": false, "confidence": 0.0, "strength": "none", "summary": "손목선 (기초 체력·생활 기반)" }
  },
  "specialMarks": [
    { "code": "cross|triangle|star|island|square|grid", "labelKo": "십자문|삼각문|별문|섬문|사각문|격자문", "location": "관찰된 위치(구/선 이름)", "detected": false, "confidence": 0.0, "summary": "의미 해석" }
  ],
  "mounts": {
    "venus":   { "fullness": "strong|medium|weak", "summary": "금성구 (애정·활력)" },
    "moon":    { "fullness": "medium", "summary": "월구 (상상력·직관)" },
    "jupiter": { "fullness": "medium", "summary": "목성구 (리더십·야망)" },
    "saturn":  { "fullness": "medium", "summary": "토성구 (인내·책임)" },
    "sun":     { "fullness": "medium", "summary": "태양구 (창조·표현)" },
    "mercury": { "fullness": "medium", "summary": "수성구 (기지·사업)" },
    "mars":    { "fullness": "medium", "summary": "화성구 (투지·회복력)" }
  },
  "scores": { "love": 75, "career": 80, "wealth": 70, "vitality": 85, "creativity": 78, "communication": 72 },
  "overall": {
    "title": "판독을 관통하는 핵심 제목",
    "summary": "우세선과 손바닥 곡률 유형을 포함한 종합 설명 (5문장 이상)",
    "dominantLine": "생명선|두뇌선|감정선 중 하나 + 근거",
    "palmType": "곡선형/표현형|균형형|직선형/실용형 + 근거",
    "careerShift": "직업 변화 가능성 유무 + 근거",
    "strengths": ["강점1", "강점2", "강점3"],
    "cautions": ["주의점1", "주의점2"],
    "recommendedActions": ["실천사항1", "실천사항2"]
  },
  "imageQuality": {
    "brightness": "good|normal|dark",
    "sharpness": "good|normal|blurry",
    "palmCoverage": 0.85,
    "notes": "판독을 제한한 사진 문제가 있으면 한 문장"
  },
  "purposeAnalysis": {
    "summary": "선택된 분석 목적에 맞는 핵심 요약 (3~5문장)",
    "evidence": [
      { "label": "우세선", "text": "근거" },
      { "label": "손금 유형", "text": "근거" },
      { "label": "커리어 변화 지표", "text": "근거" }
    ],
    "details": "목적에 대한 상세 심층 분석 (상담사가 직접 말하듯)",
    "cautions": ["주의사항1", "주의사항2"],
    "actions": ["행동 가이드1", "행동 가이드2"],
    "sections": [
      { "title": "심층 분석 1", "content": "구체적 내용" },
      { "title": "심층 분석 2", "content": "구체적 내용" }
    ]
  }
}`;

function buildVisionUserPrompt(declaredSide, analysisPurpose) {
  const purposeText = PURPOSE_KO[analysisPurpose] || PURPOSE_KO.general;
  const sideText = declaredSide === "left" ? "왼손" : "오른손";
  return `이 사진은 ${sideText} 바닥입니다. 사용자의 분석 목적은 '${purposeText}'입니다.

이 목적에 맞춰 각 손금 영역을 깊이 있게 풀이하세요. summary 는 키워드 나열이 아니라 전문가가 대면 상담하듯 구체적인 문장으로 작성하세요.
반드시 우세선·손바닥 곡률 유형·커리어 변화 지표 3가지를 명시하세요.

다시 강조합니다: 사진에서 실제로 보이지 않는 선과 문양은 detected=false, confidence=0 으로 두세요. 항목 수를 채우려고 지어내지 마세요.
JSON 으로만 응답하세요.`;
}

/* ------------------------------------------------------------------ *
 * 응답 강제(coercion)
 * ------------------------------------------------------------------ */

function str(v, fallback) {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function bool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  if (typeof v === "string") {
    const lowered = v.trim().toLowerCase();
    if (lowered === "true" || lowered === "yes" || lowered === "y" || lowered === "1") return true;
    if (lowered === "false" || lowered === "no" || lowered === "n" || lowered === "0") return false;
  }
  return fallback;
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function unit(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function asObj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function asArr(v) {
  return Array.isArray(v) ? v : [];
}

function majorLine(raw, defaults) {
  const o = asObj(raw);
  const detected = bool(o.detected, false);
  return {
    detected,
    // 미검출이면 신뢰도도 0 으로 눌러 UI 가 "감지됨 0%" 같은 모순을 그리지 않게 한다.
    confidence: detected ? unit(o.confidence) : 0,
    breaks: num(o.breaks, 0),
    branches: num(o.branches, 0),
    startPoint: str(o.startPoint, ""),
    endPoint: str(o.endPoint, ""),
    summary: str(o.summary, defaults.summary),
    advice: str(o.advice, defaults.advice),
  };
}

function minorLine(raw, defaultSummary) {
  const o = asObj(raw);
  const detected = bool(o.detected, false);
  return {
    detected,
    confidence: detected ? unit(o.confidence) : 0,
    strength: detected ? str(o.strength, "medium") : "none",
    summary: str(o.summary, defaultSummary),
  };
}

const SPECIAL_MARK_LABELS = {
  cross: "십자문",
  triangle: "삼각문",
  star: "별문",
  island: "섬문",
  square: "사각문",
  grid: "격자문",
};

function normalizeSpecialMarks(raw) {
  return asArr(raw)
    .map((item) => {
      const o = asObj(item);
      const code = str(o.code, "").toLowerCase();
      if (!SPECIAL_MARK_LABELS[code]) return null;
      // 🔴 미검출 기본값 — detected 가 명시적으로 true 가 아니면 버린다.
      //    "항목을 채우려고" 만들어낸 문양이 화면에 올라가지 않게 하는 지점.
      if (!bool(o.detected, false)) return null;
      const confidence = unit(o.confidence);
      if (confidence <= 0) return null;
      return {
        code,
        labelKo: str(o.labelKo, SPECIAL_MARK_LABELS[code]),
        location: str(o.location, ""),
        detected: true,
        confidence,
        summary: str(o.summary, ""),
      };
    })
    .filter(Boolean);
}

function mount(raw) {
  const o = asObj(raw);
  return {
    fullness: str(o.fullness, "medium"),
    summary: str(o.summary, ""),
  };
}

export function geminiResultToHandReading(g) {
  const ml = asObj(g.majorLines);
  const mn = asObj(g.minorLines);
  const mt = asObj(g.mounts);
  const sc = asObj(g.scores);
  const ov = asObj(g.overall);
  const hs = asObj(g.handShape);

  const lifeLine = majorLine(ml.lifeLine, {
    summary: "생명선을 판독했습니다.",
    advice: "규칙적인 생활 리듬을 유지하세요.",
  });
  const headLine = majorLine(ml.headLine, {
    summary: "두뇌선을 판독했습니다.",
    advice: "명확한 목표 설정이 도움이 됩니다.",
  });
  const heartLine = majorLine(ml.heartLine, {
    summary: "감정선을 판독했습니다.",
    advice: "감정 표현을 솔직하게 하는 연습이 도움이 됩니다.",
  });
  const fateLine = majorLine(ml.fateLine, {
    summary: "운명선을 판독했습니다.",
    advice: "꾸준한 노력이 결실을 맺습니다.",
  });

  return {
    handShape: {
      type: str(hs.type, "mixed"),
      labelKo: str(hs.labelKo, "혼합형"),
      palmRatio: str(hs.palmRatio, "normal"),
      fingerRatio: str(hs.fingerRatio, "normal"),
      summary: str(hs.summary, "손 형태를 분석했습니다."),
    },
    majorLines: {
      lifeLine: {
        ...lifeLine,
        length: str(asObj(ml.lifeLine).length, "medium"),
        depth: str(asObj(ml.lifeLine).depth, "medium"),
        curvature: str(asObj(ml.lifeLine).curvature, "normal"),
      },
      headLine: {
        ...headLine,
        length: str(asObj(ml.headLine).length, "medium"),
        depth: str(asObj(ml.headLine).depth, "medium"),
        direction: str(asObj(ml.headLine).direction, "straight"),
        startRelationWithLifeLine: str(asObj(ml.headLine).startRelationWithLifeLine, "joined"),
      },
      heartLine: {
        ...heartLine,
        length: str(asObj(ml.heartLine).length, "medium"),
        depth: str(asObj(ml.heartLine).depth, "medium"),
        curvature: str(asObj(ml.heartLine).curvature, "soft"),
        endingArea: str(asObj(ml.heartLine).endingArea, "underMiddle"),
      },
      fateLine: {
        ...fateLine,
        strength: fateLine.detected ? str(asObj(ml.fateLine).strength, "medium") : "none",
        startArea: str(asObj(ml.fateLine).startArea, "wrist"),
        endArea: str(asObj(ml.fateLine).endArea, "saturnMount"),
      },
    },
    minorLines: {
      sunLine: minorLine(mn.sunLine, "태양선을 분석했습니다."),
      moneyLine: minorLine(mn.moneyLine, "재물선을 분석했습니다."),
      marriageLine: minorLine(mn.marriageLine, "결혼선을 분석했습니다."),
      mercuryLine: minorLine(mn.mercuryLine, "수성선을 분석했습니다."),
      healthLine: minorLine(mn.healthLine, "건강선을 분석했습니다."),
      intuitionLine: minorLine(mn.intuitionLine, "직관선을 분석했습니다."),
      girdleOfVenus: minorLine(mn.girdleOfVenus, "금성대를 분석했습니다."),
      travelLine: minorLine(mn.travelLine, "여행선을 분석했습니다."),
      braceletLine: minorLine(mn.braceletLine, "손목선을 분석했습니다."),
    },
    specialMarks: normalizeSpecialMarks(g.specialMarks),
    mounts: {
      venus: mount(mt.venus),
      moon: mount(mt.moon),
      jupiter: mount(mt.jupiter),
      saturn: mount(mt.saturn),
      sun: mount(mt.sun),
      mercury: mount(mt.mercury),
      mars: mount(mt.mars),
    },
    scores: {
      love: num(sc.love, null),
      career: num(sc.career, null),
      wealth: num(sc.wealth, null),
      vitality: num(sc.vitality, null),
      creativity: num(sc.creativity, null),
      communication: num(sc.communication, null),
    },
    overall: {
      title: str(ov.title, "손금 분석 결과"),
      summary: str(ov.summary, "손금을 분석했습니다."),
      dominantLine: str(ov.dominantLine, ""),
      palmType: str(ov.palmType, ""),
      careerShift: str(ov.careerShift, ""),
      strengths: asArr(ov.strengths).map((s) => String(s)),
      cautions: asArr(ov.cautions).map((s) => String(s)),
      recommendedActions: asArr(ov.recommendedActions).map((s) => String(s)),
    },
  };
}

export function extractDetectedLineKeys(handReading) {
  if (!handReading || typeof handReading !== "object") return [];
  const major = handReading.majorLines || {};
  const minor = handReading.minorLines || {};
  const keys = [];
  for (const key of ["lifeLine", "headLine", "heartLine", "fateLine"]) {
    if (major[key]?.detected) keys.push(key);
  }
  for (const key of [
    "sunLine",
    "moneyLine",
    "marriageLine",
    "mercuryLine",
    "healthLine",
    "intuitionLine",
    "girdleOfVenus",
    "travelLine",
    "braceletLine",
  ]) {
    if (minor[key]?.detected) keys.push(key);
  }
  return keys;
}

function qualityLabelToScore(value, kind) {
  const normalized = String(value || "").toLowerCase();
  if (kind === "brightness") {
    if (normalized === "good") return 1;
    if (normalized === "normal") return 0.72;
    return 0.28;
  }
  if (normalized === "good") return 1;
  if (normalized === "normal") return 0.74;
  return 0.25;
}

export function computeQualityScore(input) {
  const imageQuality = input.imageQuality || {};
  const lineCount = Math.max(0, Number(input.detectedLineKeys?.length || 0));
  const coverage = Math.max(0, Math.min(1, Number(imageQuality.palmCoverage || 0)));
  const brightnessScore = qualityLabelToScore(String(imageQuality.brightness || "normal"), "brightness");
  const sharpnessScore = qualityLabelToScore(String(imageQuality.sharpness || "normal"), "sharpness");
  const lineScore = Math.min(1, lineCount / 4);
  const detectedBonus = input.palmDetected ? 0.08 : 0;
  const score = coverage * 0.34 + brightnessScore * 0.2 + sharpnessScore * 0.2 + lineScore * 0.26 + detectedBonus;
  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

export function majorLineDetectedCount(handReading) {
  const major = handReading?.majorLines;
  if (!major) return 0;
  return [major.lifeLine, major.headLine, major.heartLine, major.fateLine].filter((line) => Boolean(line?.detected))
    .length;
}

export function resolveAnalysisMode(input) {
  if (!input.palmDetected) return "fallback";
  if (input.majorLineCount >= 3 && input.qualityScore >= 0.62) return "full";
  if (input.majorLineCount >= 1 || input.qualityScore >= 0.45) return "partial";
  return "fallback";
}

/* ------------------------------------------------------------------ *
 * 비전 판독
 * ------------------------------------------------------------------ */

function parseVisionJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const jsonText = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(jsonText.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * 한 손을 Gemini Vision 으로 판독한다.
 * 실패는 throw 하지 않고 null 을 돌려주되, 원인을 반드시 로깅한다
 * (기존 route.ts 는 전 경로를 .catch(()=>null) 로 삼켜 Gemini 장애와 "손 없음"이
 *  프로덕션 로그에서 구분되지 않았다).
 *
 * @returns {Promise<null | {handReading, palmDetected, imageQuality, purposeAnalysis, raw, detectedLineKeys, qualityScore, notPalmReason}>}
 */
export async function analyzeHandWithGeminiVision(env, imageDataUrl, declaredSide, analysisPurpose, logContext = {}) {
  const imageInfo = dataUrlToBase64(imageDataUrl);
  if (!imageInfo) {
    console.warn("[palm-vision] invalid data url", { side: declaredSide });
    return null;
  }

  const userPrompt = buildVisionUserPrompt(declaredSide, analysisPurpose);
  const parts = [
    { text: PALM_VISION_SYSTEM_PROMPT },
    { text: userPrompt },
    { inline_data: { mime_type: imageInfo.mimeType, data: imageInfo.data } },
  ];

  const ai = await callGeminiJsonWithRetry(env, userPrompt, {
    attempts: 2,
    baseTokens: 8192,
    capTokens: 12288,
    temperature: 0.2,
    taskType: "fortune",
    timeoutMs: VISION_TIMEOUT_MS,
    geminiParts: parts,
    // 🔴 폴백 경로는 이미지를 버린다 — 켜면 사진 없이 판독을 지어낸다. 파일 상단 주석 참고.
    fallbackToWorkersAI: false,
    logContext: { ...logContext, serviceId: "palm-reading", stage: `vision:${declaredSide}` },
  });

  if (!ai?.ok) {
    console.warn("[palm-vision] gemini call failed", {
      side: declaredSide,
      error: ai?.error,
      status: ai?.status,
    });
    return null;
  }

  const parsed = parseVisionJson(ai.text);
  if (!parsed) {
    console.warn("[palm-vision] json parse failed", {
      side: declaredSide,
      truncated: ai.truncated === true,
      chars: String(ai.text || "").length,
    });
    return null;
  }

  const handReading = geminiResultToHandReading(parsed);
  const detectedLineKeys = extractDetectedLineKeys(handReading);
  // palmDetected=false 는 모델의 명시적 거부다. 존중한다 — 선이 몇 개 잡혔다고 뒤집지 않는다.
  // (기존 route.ts 는 여기서 뒤집어, 손이 아닌 사진도 판독이 나오는 원인 중 하나였다.)
  const palmDetected = parsed.palmDetected === false ? false : parsed.palmDetected === true || detectedLineKeys.length > 0;

  const iq = asObj(parsed.imageQuality);
  const imageQuality = {
    isPalmDetected: palmDetected,
    handSide: str(parsed.handSide, declaredSide),
    brightness: str(iq.brightness, "normal"),
    sharpness: str(iq.sharpness, "normal"),
    palmCoverage: num(iq.palmCoverage, detectedLineKeys.length > 0 ? 0.58 : 0.36),
    rotation: 0,
    notes: str(iq.notes, ""),
    warnings: [],
  };

  const purposeAnalysis = asObj(parsed.purposeAnalysis);

  return {
    handReading,
    palmDetected,
    imageQuality,
    purposeAnalysis: Object.keys(purposeAnalysis).length > 0 ? purposeAnalysis : null,
    raw: parsed,
    detectedLineKeys,
    qualityScore: computeQualityScore({ imageQuality, detectedLineKeys, palmDetected }),
    notPalmReason: str(parsed.notPalmReason, ""),
    provider: ai.provider,
    model: ai.model,
  };
}

/**
 * Gemini 비전 결과를 worker/routes/palm.js 의 결정론 엔진 결과와 같은 형태로 감싼다.
 */
export function visionToSideAnalysis(vision, side) {
  if (!vision) return null;
  const resolvedSide = String(vision.imageQuality?.handSide || side).toLowerCase() === "left" ? "left" : "right";
  return {
    side: resolvedSide,
    source: "gemini",
    handReading: vision.handReading,
    palmDetected: vision.palmDetected,
    detectedLineKeys: vision.detectedLineKeys,
    imageQuality: vision.imageQuality,
    purposeAnalysis: vision.purposeAnalysis,
    specialMarks: vision.handReading?.specialMarks || [],
    raw: vision.raw,
    recognitionData: {
      palmDetected: vision.palmDetected,
      imageQuality: vision.imageQuality,
      visionSource: "gemini_palm_astro",
      detectedLines: vision.detectedLineKeys,
      provider: vision.provider,
      model: vision.model,
    },
    qualityScore: vision.qualityScore,
  };
}

/* ------------------------------------------------------------------ *
 * 심층 해석 (구 palm-reading-ai-consult — 이제 기본 분석에 통합)
 * ------------------------------------------------------------------ */

const DEEP_CONSULT_SYSTEM_PROMPT = `당신은 30년 경력의 손금 상담 전문가입니다. 이미 판독이 끝난 손금 데이터를 받아, 내담자가 마주 앉아 듣는 것 같은 깊이 있는 상담문을 씁니다.

[작성 규칙]
1. 주어진 판독 데이터에 있는 근거만 사용하세요. 사진을 다시 추측하지 마세요.
2. detected=false 인 선과 문양은 "이번 사진에서는 확인되지 않았다"고 쓰거나 아예 언급하지 마세요. 있는 것처럼 쓰지 마세요.
3. 사람이 쓴 조언처럼 직설적이고 구체적으로 쓰세요. "~할 수도 있습니다" 같은 애매한 표현 대신 "~하세요"로 쓰세요.
4. 건강·수명·질병·사고를 단정하지 마세요. 의학적 진단 금지.
5. 각 항목은 최소 3문장 이상, 추상적 덕담이 아니라 이 사람의 판독 결과에 붙는 내용이어야 합니다.
6. 마크다운 제목(#) 없이, 아래 형식의 일반 텍스트로 쓰세요.

[출력 형식]
■ 한 문장 요약
■ 타고난 성향
■ 주요 선이 말하는 것
■ 성격과 사고방식
■ 숨겨진 재능
■ 연애운
■ 결혼·인연
■ 재물운
■ 직업운
■ 건강·활력 (생활 습관 관점)
■ 인간관계
■ 현재 흐름
■ 향후 변화
■ 강점
■ 약점
■ 주의할 점
■ 종합 조언
■ 오늘의 한마디`;

/**
 * 판독 결과 기반 심층 해석문. 텍스트 전용이라 Workers AI 폴백을 켜고
 * fallbackMinChars 로 "짧은 폴백이 유료 결과로 나가는 것"을 막는다.
 * 실패해도 throw 하지 않는다 — 결제 후 결과는 항상 전달한다(degrade-not-throw).
 */
export async function buildPalmDeepConsult(env, input, logContext = {}) {
  const context = JSON.stringify(
    {
      analysisPurpose: input.analysisPurpose,
      dominantHand: input.dominantHand,
      uploadedHands: input.uploadedHands,
      leftHandRole: input.leftHandRole,
      rightHandRole: input.rightHandRole,
      mode: input.mode,
      qualityScore: input.qualityScore,
      leftHandReading: input.leftHandReading,
      rightHandReading: input.rightHandReading,
      bothHandsComparison: input.bothHandsComparison,
      specialMarks: input.specialMarks,
      missingData: input.missingData,
    },
    null,
    2,
  );

  const handsNote =
    Array.isArray(input.uploadedHands) && input.uploadedHands.length >= 2
      ? "양손이 모두 등록되어 선천(비주로 쓰는 손)과 후천(주로 쓰는 손)의 차이를 함께 짚어 주세요."
      : "한 손만 등록되었습니다. 그 손의 역할(선천/후천)을 명시하고, 없는 손을 추측해 쓰지 마세요.";

  const userPrompt = `아래 손금 판독 데이터를 바탕으로 심층 상담문을 작성하세요.

${handsNote}

판독 데이터:
${context}`;

  const ai = await callGeminiText(env, userPrompt, {
    systemPrompt: DEEP_CONSULT_SYSTEM_PROMPT,
    maxOutputTokens: 8192,
    temperature: 0.75,
    taskType: "fortune",
    timeoutMs: CONSULT_TIMEOUT_MS,
    // 텍스트 전용이라 폴백이 안전하다. 다만 유료 경로이므로 짧은 폴백은 거부한다.
    fallbackMinChars: PALM_CONSULT_FALLBACK_MIN_CHARS,
    logContext: { ...logContext, serviceId: "palm-reading", stage: "deep-consult" },
  });

  if (!ai?.ok) {
    console.warn("[palm-vision] deep consult failed", { error: ai?.error, status: ai?.status });
    return null;
  }

  const text = String(ai.text || "").trim();
  return text ? { text, provider: ai.provider, model: ai.model } : null;
}
