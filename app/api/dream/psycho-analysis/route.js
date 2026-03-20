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
    shadow_analysis: String(obj.shadow_analysis || obj.psychoanalytic_interpretation || "").trim(),
    archetype_exploration: String(obj.archetype_exploration || obj.psychological_state || "").trim(),
    advice: String(obj.advice || obj.insights || "").trim(),
  };
}

function isValidAnalysisObject(obj) {
  if (!obj || typeof obj !== "object") return false;
  const hasSymbols = Array.isArray(obj.symbols) && obj.symbols.length >= 1 && obj.symbols.length <= 3;
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
      return m ? `- **[${s}]**: ${m}` : `- **[${s}]**`;
    })
    .filter(Boolean)
    .join("\n");

  return [
    "### 무의식의 핵심 테마",
    String(analysis?.psychological_state || "분석 결과를 정리 중입니다."),
    "",
    "### 정신분석학적 심층 해독",
    String(analysis?.psychoanalytic_interpretation || "해석 결과를 정리 중입니다."),
    "",
    "### 상징(Symbol) 디코딩 사전",
    symbolLines || "- 핵심 상징을 추출하지 못했습니다. 다시 시도해 주세요.",
    "",
    "### 억압된 그림자와 감정선 분석",
    String(analysis?.shadow_analysis || "그림자 분석을 정리 중입니다."),
    "",
    "### 시공간을 초월한 원형(Archetype) 탐구",
    String(analysis?.archetype_exploration || "원형 탐구를 정리 중입니다."),
    "",
    "### 현실을 위한 통찰",
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
    /###\s*무의식의\s*핵심\s*테마/,
    /###\s*정신분석학적\s*심층\s*해독/,
    /###\s*상징\s*\(\s*Symbol\s*\)\s*디코딩\s*사전/,
    /###\s*억압된\s*그림자와\s*감정선\s*분석/,
    /###\s*시공간을\s*초월한\s*원형\s*\(\s*Archetype\s*\)\s*탐구/,
    /###\s*현실을\s*위한\s*통찰/,
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
  const m1 = s.match(/###\s*무의식의 핵심 테마\s*([\s\S]*?)(\n###\s*정신분석학적 심층 해독|$)/);
  const core = (m1?.[1] || "").trim();
  return core ? core.replace(/\s+/g, " ").slice(0, 140) : s.replace(/\s+/g, " ").slice(0, 140);
}

function toEmergencyMarkdownFromRaw(rawText) {
  const raw = String(rawText || "").replace(/\s+/g, " ").trim();
  const clipped = raw.slice(0, 900);
  return [
    "### 무의식의 핵심 테마",
    "억압과 경계 불안이 반복 상징으로 표면화된 상태로 해석된다.",
    "",
    "### 정신분석학적 심층 해독",
    clipped || "원문 응답이 불완전하여 핵심 해독 문장을 정규화했다.",
    "",
    "### 상징(Symbol) 디코딩 사전",
    "- **[반복 장면]**: 미해결 정동의 재귀적 회귀를 시사한다.",
    "- **[경계 신호]**: 자아 방어가 과가동 중임을 드러낸다.",
    "- **[긴장 감각]**: 현실 과제와 무의식 욕구의 충돌 축으로 볼 수 있다.",
    "",
    "### 억압된 그림자와 감정선 분석",
    "회피해 온 감정이 상징 이미지로 우회 발현된 흐름이 확인된다.",
    "",
    "### 시공간을 초월한 원형(Archetype) 탐구",
    "문턱/거울/추락 계열의 원형은 자기 인식 전환 국면의 신호로 읽힌다.",
    "",
    "### 현실을 위한 통찰",
    "반복 상징을 기록해 현실 촉발 요인과 연결하라. 불면과 공황이 동반되면 전문가 상담 권유를 즉시 따르라.",
  ].join("\n");
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
  // 배포 환경에서는 여러 키를 순차 사용해 quota/rate limit에 대한 내성을 높입니다.
  const keyCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  const apiKeys = [...new Set(keyCandidates)];
  if (!apiKeys.length) {
    throw Object.assign(
      new Error(
        "API Key not found: GEMINI_API_KEY/GOOGLE_API_KEY(+_2,+_3) 환경변수가 필요합니다."
      ),
      { status: 500 }
    );
  }

  // Gemini REST API
  // docs: https://ai.google.dev/gemini-api/docs
  const endpointModel = encodeURIComponent(model || "gemini-2.5-flash");
  const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", endpointModel);

  let lastError = null;
  for (const apiKey of apiKeys) {
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
    if (resp.ok) {
      const out =
        payload?.candidates?.[0]?.content?.parts
          ?.map((p) => p?.text)
          ?.filter(Boolean)
          ?.join("") ||
        payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "";
      return stripCodeFences(out);
    }

    const rawMessage = payload?.error?.message || payload?.message || `Gemini 호출 실패(${resp.status})`;
    const lower = String(rawMessage || "").toLowerCase();
    const isQuotaLike =
      resp.status === 429 ||
      lower.includes("quota") ||
      lower.includes("resource exhausted") ||
      lower.includes("rate limit") ||
      lower.includes("too many requests");

    lastError = Object.assign(new Error(isQuotaLike ? toFreudQuotaMessage() : rawMessage), {
      status: resp.status,
      quotaLike: isQuotaLike,
    });

    // quota/rate limit 계열이면 다음 키로 즉시 재시도
    if (isQuotaLike) continue;
    throw lastError;
  }

  throw lastError || Object.assign(new Error("Gemini 호출 실패"), { status: 502 });
}

const SYSTEM_PROMPT = `# Role & Persona
당신은 30년 이상의 임상 경험을 가진 수석 무의식 해독가다. 분석은 심리학적 근거와 상징 해석의 깊이를 동시에 갖춰야 한다.

# Core Directives
1) AI, 모델, 시스템 정체성을 언급하거나 암시하지 않는다.
2) 인사말/결론/군더더기를 금지하고, 분석 데이터만 출력한다.
3) 문체는 단호하고 확신에 찬 문어체를 사용한다. "~이다", "~로 해석된다", "~의 발현으로 볼 수 있다"를 우선한다.
4) 입력된 꿈 내용 바깥의 사실을 지어내지 않는다.

중요 안전 안내:
- 사용자를 단정하거나 공포를 조장하지 않는다.
- 자해/타해 위험 신호가 보이면 advice에 "전문가 상담 권유"를 포함한다.

출력은 반드시 JSON 객체 하나만 반환한다. 코드블록/설명 문장 금지.

JSON 스키마:
{
  "symbols": [
    { "symbol": "상징 키워드", "meaning": "집단 무의식 + 개인 심리 교차 해석" }
  ],
  "psychological_state": "무의식의 핵심 테마 1~2문장",
  "psychoanalytic_interpretation": "정신분석학적 심층 해독 4~7문장",
  "shadow_analysis": "억압된 그림자와 감정선 분석 3~5문장",
  "archetype_exploration": "시공간을 초월한 원형(Archetype) 탐구 3~5문장",
  "advice": "현실을 위한 통찰 3~5문장"
}

추가 규칙:
- symbols는 최대 3개
- symbols는 반드시 입력된 꿈에서만 추출
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

    // Gemini/Anthropic 서버사이드 전용 키 사용 (클라이언트 노출 금지)
    const useGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    const useAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
    const provider = useGemini ? "gemini" : useAnthropic ? "anthropic" : "none";

    const modelForKey = useGemini
      ? process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash"
      : useAnthropic
        ? process.env.PSYCHO_ANALYSIS_ANTHROPIC_MODEL || "claude-sonnet-4-20250514"
        : "default";

    let markdown = "";
    let analysis = null;
    if (useGemini) {
      try {
        const model = process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash";
        const raw = await callGeminiDreamPsychoAnalysis({
          systemPrompt: SYSTEM_PROMPT,
          dreamText,
          model,
          maxTokens,
        });
        if (validateOutputStructure(raw)) {
          markdown = String(raw || "").trim();
        } else {
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
          markdown = toEmergencyMarkdownFromRaw(raw);
        } else {
          markdown = analysisToMarkdown(analysis);
        }
        }
      } catch (geminiError) {
        const lower = String(geminiError?.message || "").toLowerCase();
        const geminiQuotaLike =
          Number(geminiError?.status) === 429 ||
          lower.includes("quota") ||
          lower.includes("resource exhausted") ||
          lower.includes("rate limit") ||
          lower.includes("too many requests");
        if (useAnthropic && geminiQuotaLike) {
          const model = process.env.PSYCHO_ANALYSIS_ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
          markdown = await callAnthropicDreamPsychoAnalysis({
            systemPrompt: SYSTEM_PROMPT,
            dreamText,
            model,
            maxTokens,
          });
        } else {
          throw geminiError;
        }
      }
    } else if (useAnthropic) {
      const model = process.env.PSYCHO_ANALYSIS_ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
      markdown = await callAnthropicDreamPsychoAnalysis({
        systemPrompt: SYSTEM_PROMPT,
        dreamText,
        model,
        maxTokens,
      });
    } else {
      return jsonWithCors(
        request,
        {
          ok: false,
          message: "API Key not found: GOOGLE_API_KEY/GEMINI_API_KEY 또는 ANTHROPIC_API_KEY 환경변수가 필요합니다.",
        },
        { status: 500 },
      );
    }

    if (!validateOutputStructure(markdown)) {
      // 포맷이 깨졌으면 한 번 더 엄격 지시로 재시도합니다.
      const retryDreamText =
        dreamText +
        "\n\n[추가 지시] 아래 항목을 모두 채운 JSON 객체 하나만 반환:\n" +
        "- psychological_state\n" +
        "- psychoanalytic_interpretation\n" +
        "- symbols(최대 3개)\n" +
        "- shadow_analysis\n" +
        "- archetype_exploration\n" +
        "- advice\n";

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
          raw.length >= 120 && /###/.test(raw) && /무의식|상징|그림자|원형|통찰|정신분석/.test(raw);
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

