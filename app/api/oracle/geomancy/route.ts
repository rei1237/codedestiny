import { NextResponse } from "next/server";

type JudgePayload = {
  english?: string;
  korean?: string;
  element?: string;
  meaning?: string;
  advice?: string;
};

type GeomancyRequest = {
  question?: string;
  theme?: "alchemist" | "sultan" | string;
  judge?: JudgePayload;
};

const GEMINI_ENDPOINT_TEMPLATE =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiApiKeys(): string[] {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
  ];
  return candidates.map((v) => String(v || "").trim()).filter(Boolean);
}

function pickGeminiModels(): string[] {
  const configured = String(
    process.env.GEOMANCY_ORACLE_GEMINI_MODEL || process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || ""
  )
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const defaults = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];
  return Array.from(new Set([...configured, ...defaults]));
}

function normalizeText(value: unknown, max = 1200): string {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max) : text;
}

function extractFirstJsonObject(text: string): string {
  const src = String(text || "").trim();
  if (!src) return "";
  const jsonMatch = src.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : "";
}

function stripCodeFence(text: string): string {
  const src = String(text || "").trim();
  if (!src) return "";
  return src.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function decodeJsonStringValue(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractQuotedField(src: string, key: string): string {
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*"`, "i");
  const match = keyPattern.exec(src);
  if (!match || typeof match.index !== "number") return "";

  let i = match.index + match[0].length;
  let out = "";
  let escaped = false;

  while (i < src.length) {
    const ch = src[i];
    if (escaped) {
      out += `\\${ch}`;
      escaped = false;
      i += 1;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      i += 1;
      continue;
    }
    if (ch === '"') {
      break;
    }
    out += ch;
    i += 1;
  }

  return decodeJsonStringValue(out).trim();
}

function parseLooseOracleJson(text: string): Partial<Record<string, string>> {
  const src = stripCodeFence(String(text || ""));
  if (!src) return {};

  const fields = ["answer", "keyJudgement", "energyFlow", "risk", "timing", "actionTip"] as const;
  const out: Partial<Record<string, string>> = {};
  for (const field of fields) {
    const v = extractQuotedField(src, field);
    if (v) out[field] = v;
  }
  return out;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseNestedAnswerJson(text: string): Partial<Record<string, string>> {
  const src = stripCodeFence(String(text || "").trim());
  if (!src || !src.includes('"answer"')) return {};

  const jsonCandidate = extractFirstJsonObject(src);
  if (jsonCandidate) {
    try {
      const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        return {
          answer: stringOrEmpty(parsed.answer).trim(),
          keyJudgement: stringOrEmpty(parsed.keyJudgement).trim(),
          energyFlow: stringOrEmpty(parsed.energyFlow).trim(),
          risk: stringOrEmpty(parsed.risk).trim(),
          timing: stringOrEmpty(parsed.timing).trim(),
          actionTip: stringOrEmpty(parsed.actionTip).trim(),
        };
      }
    } catch {
      // Ignore parse error and try loose extraction.
    }
  }

  return parseLooseOracleJson(src);
}

function parseGeminiText(payload: unknown): string {
  const root = payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }
  return "";
}

function ensureFields(raw: Record<string, unknown> | null | undefined, fallbackAnswer: string) {
  const rawAnswer = stringOrEmpty(raw?.answer);
  const nested = parseNestedAnswerJson(rawAnswer);
  const answer = normalizeText(nested.answer || rawAnswer || fallbackAnswer, 3000);
  return {
    answer,
    keyJudgement: normalizeText(stringOrEmpty(raw?.keyJudgement) || nested.keyJudgement, 600),
    energyFlow: normalizeText(stringOrEmpty(raw?.energyFlow) || nested.energyFlow, 600),
    risk: normalizeText(stringOrEmpty(raw?.risk) || nested.risk, 600),
    timing: normalizeText(stringOrEmpty(raw?.timing) || nested.timing, 600),
    actionTip: normalizeText(stringOrEmpty(raw?.actionTip) || nested.actionTip, 600),
  };
}

function fallbackOracle(input: { question: string; theme: string; judge: JudgePayload }) {
  const isAlchemist = input.theme === "alchemist";
  const judgeName = normalizeText(input.judge.korean || input.judge.english || "재판관");
  const element = normalizeText(input.judge.element || "원소 미상");
  const meaning = normalizeText(input.judge.meaning || "지금은 흐름을 관찰하고 판단을 늦출 때입니다.");
  const adviceBase = normalizeText(input.judge.advice || "작은 행동 하나를 오늘 안에 실행해 방향성을 고정하세요.");

  return {
    answer: isAlchemist
      ? `${judgeName}의 판결은 도가니 속 불순물을 먼저 걷어내라는 뜻입니다. ${element}의 성질이 강하게 드러나므로, 질문의 핵심을 하나로 정제해야 결과가 선명해집니다. ${meaning}`
      : `${judgeName}의 판결은 서두르기보다 별의 간격을 읽으라는 뜻입니다. ${element}의 결이 크게 작용하므로, 지금은 방향을 세운 뒤 속도를 조절할 때입니다. ${meaning}`,
    keyJudgement: "당장의 결론보다 질문의 중심축을 좁혀야 정답이 또렷해집니다.",
    energyFlow: "초반에는 흔들림이 있으나, 우선순위를 1개로 고정하면 흐름이 빠르게 안정됩니다.",
    risk: "여러 선택지를 동시에 추진하면 판단 피로가 커지고 기회 타이밍이 흩어질 수 있습니다.",
    timing: "오늘부터 3일은 정리, 이후 7일은 실행에 집중하는 2단계 전개가 유리합니다.",
    actionTip: adviceBase,
    provider: "fallback",
  };
}

function buildPrompt(input: { question: string; theme: string; judge: JudgePayload }) {
  const tone =
    input.theme === "alchemist"
      ? "연금술 은유(원소, 도가니, 정제, 변환, 현자의 돌)를 자연스럽게 사용하는 신비로운 톤"
      : "사막, 별, 오아시스 은유를 자연스럽게 사용하는 격식 있고 차분한 톤";

  return [
    "너는 지오맨시 전문 신탁 해석가다.",
    "반드시 한국어로만 답하고, JSON 객체만 반환하라.",
    "불필요한 코드블록 마크다운을 절대 포함하지 마라.",
    "",
    `질문: ${input.question}`,
    `재판관 형상(영문): ${normalizeText(input.judge.english || "")}`,
    `재판관 형상(한글): ${normalizeText(input.judge.korean || "")}`,
    `원소: ${normalizeText(input.judge.element || "")}`,
    `기본 의미: ${normalizeText(input.judge.meaning || "")}`,
    `기본 조언: ${normalizeText(input.judge.advice || "")}`,
    "",
    `문체: ${tone}`,
    "",
    "아래 키를 모두 포함한 JSON만 반환:",
    "{",
    '  "answer": "질문에 대한 직접 답변 3~5문장",',
    '  "keyJudgement": "핵심 판결 1~2문장",',
    '  "energyFlow": "현재-근미래 흐름 1~2문장",',
    '  "risk": "주의할 함정 1~2문장",',
    '  "timing": "실행 타이밍 1~2문장",',
    '  "actionTip": "오늘 실행할 구체적 행동 1~2문장"',
    "}",
  ].join("\n");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  let body: GeomancyRequest = {};
  try {
    body = (await request.json()) as GeomancyRequest;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const question = normalizeText(body.question, 400);
  const theme = normalizeText(body.theme || "alchemist", 40);
  const judge = body.judge || {};

  if (!question) {
    return NextResponse.json({ error: "question-required" }, { status: 400 });
  }

  const fallback = fallbackOracle({ question, theme, judge });
  const keys = pickGeminiApiKeys();
  const models = pickGeminiModels();

  if (keys.length === 0) {
    return NextResponse.json(fallback);
  }

  const prompt = buildPrompt({ question, theme, judge });

  for (const model of models) {
    for (const apiKey of keys) {
      const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", encodeURIComponent(model));
      const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;

      try {
        const response = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.75,
                topP: 0.9,
                maxOutputTokens: 2048,
              },
            }),
          },
          25000
        );

        if (!response.ok) continue;

        const payload = await response.json();
        const rawText = parseGeminiText(payload);
        if (!rawText) continue;

        const cleanedText = stripCodeFence(rawText);
        const jsonCandidate = extractFirstJsonObject(cleanedText);
        if (jsonCandidate) {
          try {
            const parsed = JSON.parse(jsonCandidate);
            const shaped = ensureFields(parsed, fallback.answer);
            return NextResponse.json({ ...shaped, provider: "gemini", model });
          } catch {
            // Fall through to plain-text shaping.
          }
        }

        const looseParsed = parseLooseOracleJson(cleanedText);
        const shaped = ensureFields(
          {
            answer: looseParsed.answer || cleanedText,
            keyJudgement: looseParsed.keyJudgement,
            energyFlow: looseParsed.energyFlow,
            risk: looseParsed.risk,
            timing: looseParsed.timing,
            actionTip: looseParsed.actionTip,
          },
          fallback.answer
        );

        // Never surface raw JSON fragments to the UI.
        if (shaped.answer.startsWith('{"answer"') || shaped.answer.startsWith('{')) {
          return NextResponse.json({ ...fallback, provider: "fallback-json-recovery" });
        }
        return NextResponse.json({ ...shaped, provider: "gemini", model });
      } catch {
        // Try next key/model pair.
      }
    }
  }

  return NextResponse.json(fallback);
}
