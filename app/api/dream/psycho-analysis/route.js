import { NextResponse } from "next/server";

// Path: `app/api/dream/psycho-analysis/route.js`
// Role: LLM(프로이트/융 심리학) 호출 -> 결과 markdown 생성 (DB 저장 없음 / 공유용 텍스트 반환)

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const GEMINI_ENDPOINT_TEMPLATE =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

const FREUD_QUOTA_MESSAGES = [
  "오늘의 상담 기록이 가득 차, 프로이트 박사가 잠시 휴식을 취하고 있습니다. 잠시 후 다시 찾아와 주세요.",
  "프로이트 박사의 만년필 잉크가 잠시 말랐습니다. 잠깐 숨을 고른 뒤 다시 상담을 이어가겠습니다.",
  "무의식의 서재가 잠시 정리 시간에 들어갔습니다. 잠시 후 다시 문을 열어 드리겠습니다.",
  "오늘의 해몽 배정 시간이 모두 소진되어, 프로이트 박사가 티타임을 갖고 있습니다. 잠시 후 다시 시도해 주세요.",
  "상담실의 기록 장치가 잠시 과열되었습니다. 프로이트 박사가 정돈을 마치면 다시 안내해 드리겠습니다.",
];

function toFreudQuotaMessage() {
  const idx = Math.floor(Math.random() * FREUD_QUOTA_MESSAGES.length);
  return FREUD_QUOTA_MESSAGES[idx];
}

function stripCodeFences(text) {
  const t = String(text || "").trim();
  if (/^```/.test(t)) {
    return t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  return t;
}

function parseAllowedOriginsFromEnv() {
  const raw = String(process.env.PSYCHO_ANALYSIS_ALLOWED_ORIGINS || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeMarkdownForValidation(md) {
  return String(md || "")
    .replace(/\r\n/g, "\n")
    .replace(/［/g, "[")
    .replace(/］/g, "]")
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, " ");
}

function sanitizeDreamText(input) {
  const t = String(input || "").replace(/\r\n/g, "\n").trim();
  // 과도한 토큰 사용 방지 (배포 환경 안정성)
  return t.length > 4000 ? t.slice(0, 4000) : t;
}

function extractFirstJsonObject(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  const direct = s.match(/\{[\s\S]*\}/);
  return direct ? direct[0] : "";
}

function normalizeAnalysisObject(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  const symbolsRaw = Array.isArray(obj.symbols) ? obj.symbols : [];
  const symbols = symbolsRaw
    .map((it) => {
      if (typeof it === "string") return { symbol: it.trim(), meaning: "" };
      if (it && typeof it === "object") {
        return {
          symbol: String(it.symbol || "").trim(),
          meaning: String(it.meaning || "").trim(),
        };
      }
      return { symbol: "", meaning: "" };
    })
    .filter((it) => it.symbol)
    .slice(0, 6);

  return {
    symbols,
    psychological_state: String(obj.psychological_state || "").trim(),
    psychoanalytic_interpretation: String(obj.psychoanalytic_interpretation || "").trim(),
    advice: String(obj.advice || "").trim(),
  };
}

function isValidAnalysisObject(obj) {
  if (!obj || typeof obj !== "object") return false;
  const hasSymbols = Array.isArray(obj.symbols) && obj.symbols.length >= 1;
  const hasState = String(obj.psychological_state || "").length >= 20;
  const hasInterpretation = String(obj.psychoanalytic_interpretation || "").length >= 40;
  const hasAdvice = String(obj.advice || "").length >= 20;
  return hasSymbols && hasState && hasInterpretation && hasAdvice;
}

function analysisToMarkdown(analysis) {
  const symbols = Array.isArray(analysis?.symbols) ? analysis.symbols : [];
  const symbolLines = symbols
    .map((it) => {
      const s = String(it?.symbol || "").trim();
      const m = String(it?.meaning || "").trim();
      if (!s) return "";
      return m ? `- ${s}: ${m}` : `- ${s}`;
    })
    .filter(Boolean)
    .join("\n");

  return [
    "## [정신 분석 결과 보고서: 무의식의 투사]",
    "",
    "### 1. 상징적 전이 분석 (Symbolic Transfer)",
    String(analysis?.psychological_state || "분석 결과를 정리 중입니다."),
    "",
    symbolLines
      ? "- 꿈 속 핵심 상징과 전이 단서"
      : "- 꿈의 상징 단서가 명확하지 않아, 반복 등장한 정서를 중심으로 전이를 추적했습니다.",
    symbolLines || "- 핵심 상징을 추출하지 못했습니다. 다시 시도해 주세요.",
    "",
    "### 2. 무의식의 역동과 갈등 (Unconscious Dynamics)",
    String(analysis?.psychoanalytic_interpretation || "해석 결과를 정리 중입니다."),
    "",
    "### 3. 정신역동적 처방 (Psychodynamic Guidance)",
    String(analysis?.advice || "조언을 생성하지 못했습니다. 다시 시도해 주세요."),
  ].join("\n");
}

function getProviderTimeoutMs() {
  const ms = Number(process.env.PSYCHO_ANALYSIS_PROVIDER_TIMEOUT_MS || 45000);
  return Number.isFinite(ms) && ms > 0 ? ms : 45000;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const ms = getProviderTimeoutMs();
  const t = Number(timeoutMs || ms);
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = setTimeout(function () {
    try {
      if (controller) controller.abort();
    } catch (_) {}
  }, t);

  try {
    if (controller) {
      return await fetch(url, { ...(options || {}), signal: controller.signal });
    }
    return await fetch(url, options);
  } catch (error) {
    if (controller && (error?.name === "AbortError" || String(error?.code || "").toUpperCase() === "ABORT_ERR")) {
      const err = new Error(`psycho analysis provider timeout (${t}ms)`);
      err.status = 504;
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** LLM이 전각 괄호·띄어쓰기·콜론 위치를 살짝 바꿔도 통과하도록 완화 */
function validateOutputStructure(md) {
  const n = normalizeMarkdownForValidation(md);
  const required = [
    /##\s*\[\s*정신\s*분석\s*결과\s*보고서\s*:\s*무의식의\s*투사\s*\]/,
    /###\s*1\.\s*상징적\s*전이\s*분석\s*\(\s*Symbolic\s*Transfer\s*\)/,
    /###\s*2\.\s*무의식의\s*역동과\s*갈등\s*\(\s*Unconscious\s*Dynamics\s*\)/,
    /###\s*3\.\s*정신역동적\s*처방\s*\(\s*Psychodynamic\s*Guidance\s*\)/,
  ];
  return required.every((re) => re.test(n));
}

function corsHeaders(request) {
  const origin = request.headers.get("origin");
  if (!origin) return {};
  const allowlist = parseAllowedOriginsFromEnv();
  if (allowlist.length > 0 && allowlist.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-cd-anon-key",
      Vary: "Origin",
    };
  }
  const ok =
    origin === "https://code-destiny.com" ||
    origin === "https://www.code-destiny.com" ||
    (() => {
      try {
        const h = new URL(origin).hostname.toLowerCase();
        return h.endsWith(".pages.dev") || h === "localhost" || h === "127.0.0.1";
      } catch {
        return false;
      }
    })();
  if (!ok) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-cd-anon-key",
    Vary: "Origin",
  };
}

function jsonWithCors(request, data, init) {
  const status = init?.status ?? 200;
  const extra = init?.headers && typeof init.headers === "object" ? init.headers : {};
  return NextResponse.json(data, {
    status,
    headers: { ...extra, ...corsHeaders(request) },
  });
}

export async function OPTIONS(request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

function getFirstHeadingSummary(md) {
  const s = String(md || "");
  const m1 = s.match(/###\s*1\.\s*상징적 전이 분석 \(Symbolic Transfer\)\s*([\s\S]*?)(\n###\s*2\.|$)/);
  const core = (m1?.[1] || "").trim();
  return core ? core.replace(/\s+/g, " ").slice(0, 140) : s.replace(/\s+/g, " ").slice(0, 140);
}

async function callAnthropicDreamPsychoAnalysis({ systemPrompt, dreamText, model, maxTokens }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("ANTHROPIC_API_KEY 환경변수가 필요합니다."), { status: 500 });
  }

  const userMsg = [
    "사용자가 입력한 꿈:",
    dreamText,
  ].join("\n");

  const resp = await fetchWithTimeout(
    ANTHROPIC_ENDPOINT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-20250514",
        max_tokens: maxTokens || 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }),
    },
    getProviderTimeoutMs()
  );

  const payload = await resp.json().catch(() => null);
  if (!resp.ok) {
    const message = payload?.error?.message || payload?.message || `Anthropic 호출 실패(${resp.status})`;
    const err = new Error(message);
    err.status = resp.status;
    throw err;
  }

  const out =
    payload?.content?.find((p) => p?.type === "text")?.text ||
    payload?.content?.[0]?.text ||
    "";

  return stripCodeFences(out);
}

async function callGeminiDreamPsychoAnalysis({ systemPrompt, dreamText, model, maxTokens }) {
  // Gemini 키는 반드시 환경변수로만 관리합니다.
  // 배포 환경에서는 GOOGLE_API_KEY를 우선 사용하고, 기존 GEMINI_API_KEY도 호환 지원합니다.
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("API Key not found: GEMINI_API_KEY 환경변수가 필요합니다."), {
      status: 500,
    });
  }

  // Gemini REST API
  // docs: https://ai.google.dev/gemini-api/docs
  const endpointModel = encodeURIComponent(model || "gemini-2.5-flash");
  const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", endpointModel);

  const resp = await fetchWithTimeout(
    endpoint + "?key=" + encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          role: "system",
          parts: [{ text: String(systemPrompt || "") }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: ["사용자가 입력한 꿈:", String(dreamText || "")].join("\n") }],
          },
        ],
        generationConfig: {
          maxOutputTokens: Number(maxTokens || 1200),
          temperature: 0.5,
          topP: 0.95,
          responseMimeType: "application/json",
        },
      }),
    },
    getProviderTimeoutMs()
  );

  const payload = await resp.json().catch(() => null);
  if (!resp.ok) {
    const rawMessage =
      payload?.error?.message ||
      payload?.message ||
      `Gemini 호출 실패(${resp.status})`;
    const lower = String(rawMessage || "").toLowerCase();

    // 무료/사용량 한도 초과(429, quota/resource exhausted)는 톤앤매너 메시지로 변환
    const isQuotaLike =
      resp.status === 429 ||
      lower.includes("quota") ||
      lower.includes("resource exhausted") ||
      lower.includes("rate limit") ||
      lower.includes("too many requests");

    const message = isQuotaLike ? toFreudQuotaMessage() : rawMessage;
    const err = new Error(message);
    err.status = resp.status;
    throw err;
  }

  const out =
    payload?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text)
      ?.filter(Boolean)
      ?.join("") ||
    payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";

  return stripCodeFences(out);
}

const SYSTEM_PROMPT = `# Role: 30년 경력의 시니어 심리 분석 및 전문 해몽가
너는 AI가 아니라, 30년간 수만 명의 무의식을 분석해온 전문 심리 분석가이자 정신역동 해몽 전문가로서 답한다.

# Strict Constraints (절대 규칙)
1. 정체성 은폐: 자신이 AI, LLM, 또는 특정 모델임을 암시하는 문구를 절대 사용하지 않는다.
2. 전문적 권위: 가벼운 조언이 아니라 내담자의 심연을 꿰뚫는 통찰력 있고 무게감 있는 어조를 유지한다.
3. 분석적 접근: 프로이트와 융의 관점을 함께 사용해 무의식의 역동을 해석한다.

# Tone & Manner (말투 및 문체)
- "안녕하신가요?", "~인 것 같아요" 같은 가벼운 문체를 금지한다.
- "~로 분석됩니다", "~를 시사합니다", "결코 가볍게 넘길 지점이 아닙니다" 같은 단정적이고 깊이 있는 문체를 유지한다.
- 페르소나, 개성화 과정, 투사, 억압, 방어기제 같은 전문 용어를 문맥에 맞게 사용한다.

중요 안전 안내:
- 사용자를 단정하거나 공포를 조장하지 않는다.
- 개인의 위험(자해/타인해) 가능성을 암시하는 꿈이면 advice에 "전문가 상담 권유"를 반드시 포함한다.

출력은 반드시 JSON 객체 하나만 반환하고, 코드블록/설명 문장을 절대 추가하지 마라.

반드시 다음 스키마를 지켜라:
{
  "symbols": [
    { "symbol": "상징", "meaning": "의미" }
  ],
  "psychological_state": "상징적 전이 분석 중심의 해석 3~5문장",
  "psychoanalytic_interpretation": "무의식의 역동과 갈등을 프로이트/융 관점으로 심층 해석 4~7문장",
  "advice": "정신역동적 처방 및 실천 태도 제언 3~5문장"
}

추가 규칙:
- symbols는 최소 3개, 최대 6개
- 추상어보다 꿈 속 실제 장면/대상을 우선
- 한국어로 작성`;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dreamText = sanitizeDreamText(body?.dreamText);
    if (!dreamText || dreamText.length < 8) {
      return jsonWithCors(
        request,
        { ok: false, message: "꿈 내용을 입력해 주세요." },
        { status: 400 },
      );
    }

    const maxTokens = Number(process.env.PSYCHO_ANALYSIS_MAX_TOKENS || 2400);

    // Gemini API 서버사이드 전용 키 사용 (클라이언트 노출 금지)
    const useGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    const provider = useGemini ? "gemini" : "anthropic";

    const modelForKey = useGemini
      ? process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash"
      : process.env.PSYCHO_ANALYSIS_ANTHROPIC_MODEL || "default";

    let markdown = "";
    let analysis = null;
    if (useGemini) {
      const model = process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash";
      const raw = await callGeminiDreamPsychoAnalysis({
        systemPrompt: SYSTEM_PROMPT,
        dreamText,
        model,
        maxTokens,
      });
      const parsed = (() => {
        try {
          return JSON.parse(raw);
        } catch {
          const extracted = extractFirstJsonObject(raw);
          if (!extracted) return null;
          try {
            return JSON.parse(extracted);
          } catch {
            return null;
          }
        }
      })();
      analysis = normalizeAnalysisObject(parsed);
      if (!isValidAnalysisObject(analysis)) {
        return jsonWithCors(
          request,
          {
            ok: false,
            message:
              "분석 결과 형식(JSON)을 안정적으로 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          },
          { status: 502 },
        );
      }
      markdown = analysisToMarkdown(analysis);
    } else {
      return jsonWithCors(
        request,
        {
          ok: false,
          message: "API Key not found: GEMINI_API_KEY 환경변수가 필요합니다.",
        },
        { status: 500 },
      );
    }

    if (!validateOutputStructure(markdown)) {
      // 포맷이 깨졌으면 한 번 더 엄격 지시로 재시도합니다.
      const retryDreamText =
        dreamText +
        "\n\n[추가 지시] 반드시 아래의 보고서 헤딩을 정확히 포함한 내용을 생성 가능한 JSON으로 반환하세요:\n" +
        "- psychological_state: 1) 상징적 전이 분석\n" +
        "- psychoanalytic_interpretation: 2) 무의식의 역동과 갈등\n" +
        "- advice: 3) 정신역동적 처방\n";

      if (useGemini) {
        const model = process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash";
        markdown = await callGeminiDreamPsychoAnalysis({
          systemPrompt: SYSTEM_PROMPT,
          dreamText: retryDreamText,
          model,
          maxTokens,
        });
      } else {
        const model = process.env.PSYCHO_ANALYSIS_ANTHROPIC_MODEL || undefined;
        markdown = await callAnthropicDreamPsychoAnalysis({
          systemPrompt: SYSTEM_PROMPT,
          dreamText: retryDreamText,
          model,
          maxTokens,
        });
      }

      if (!validateOutputStructure(markdown)) {
        const raw = String(markdown || "").trim();
        const usableFallback =
          raw.length >= 120 && /\[[^\]]+\]/.test(raw) && /무의식|상징|인사이트|정신분석/.test(raw);
        if (!usableFallback) {
          return jsonWithCors(
            request,
            {
              ok: false,
              message:
                "분석 결과 형식을 안정적으로 맞추지 못했습니다. 잠시 후 다시 시도해 주세요.",
            },
            { status: 502 },
          );
        }
      }
    }

    const title = "정신분석 해몽";
    const summary = getFirstHeadingSummary(markdown);
    const formatWarning = !validateOutputStructure(markdown);

    return jsonWithCors(request, {
      ok: true,
      formatWarning,
      analysis: analysis || null,
      record: {
        id: "temp-no-db",
        createdAt: new Date().toISOString(),
        type: "psycho_analysis",
        title,
        summary,
        markdown,
        source: provider,
        model: modelForKey,
      },
      cached: false,
    });
  } catch (error) {
    console.error("[dream/psycho-analysis]", error);
    const lower = String(error?.message || "").toLowerCase();
    const isQuotaLike =
      Number(error?.status) === 429 ||
      lower.includes("quota") ||
      lower.includes("resource exhausted") ||
      lower.includes("rate limit") ||
      lower.includes("too many requests");

    return jsonWithCors(
      request,
      {
        ok: false,
        message: isQuotaLike
          ? toFreudQuotaMessage()
          : lower.includes("timeout")
            ? "분석 제공자 응답이 지연되어 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."
            : error?.message || "psycho analysis failed",
      },
      { status: error?.status || 500 },
    );
  }
}

