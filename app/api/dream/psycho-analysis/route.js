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

function validateOutputStructure(md) {
  const required = [
    "\\[\\s*무의식의\\s*핵심\\s*테마\\s*\\]",
    "\\[\\s*정신분석학적\\s*심층\\s*해독\\s*\\]",
    "\\[\\s*상징\\s*\\(\\s*Symbol\\s*\\)\\s*디코딩\\s*사전\\s*\\]",
    "\\[\\s*현실을\\s*위한\\s*인사이트\\s*\\]",
  ];
  return required.every((p) => new RegExp(p).test(md));
}

function getFirstHeadingSummary(md) {
  const s = String(md || "");
  const m1 = s.match(/\[무의식의 핵심 테마\]:([\s\S]*?)(\n\\[정신분석학적 심층 해독\\]:|$)/);
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

  const resp = await fetch(ANTHROPIC_ENDPOINT, {
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
  });

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
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY(또는 GOOGLE_API_KEY) 환경변수가 필요합니다."), {
      status: 500,
    });
  }

  // Gemini REST API
  // docs: https://ai.google.dev/gemini-api/docs
  const endpointModel = encodeURIComponent(model || "gemini-2.5-flash");
  const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", endpointModel);

  const resp = await fetch(endpoint + "?key=" + encodeURIComponent(apiKey), {
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
        temperature: 0.6,
        topP: 0.95,
      },
    }),
  });

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

const SYSTEM_PROMPT = `당신은 칼 융(Carl Jung)의 분석심리학과 지그문트 프로이트(Sigmund Freud)의 정신분석학, 그리고 인류 보편적 상징주의에 통달한 세계 최고의 무의식 분석가입니다.

중요 안전 안내:
- 이 결과는 의학적 진단이 아니며, 자기성찰을 돕는 참고용 해석입니다.
- 사용자를 단정하거나 공포를 조장하지 마세요.
- 개인의 위험(자해/타인해) 가능성을 암시하는 표현이 꿈에 있더라도, 즉시 전문가 상담을 권하는 완충 메시지를 '현실을 위한 인사이트'에 자연스럽게 포함하세요.

분석 프로세스 및 출력 포맷 (반드시 아래 마크다운 구조를 따를 것):

[무의식의 핵심 테마]: 꿈의 기저에 깔린 지배적인 감정과 무의식이 말하고자 하는 핵심 메시지를 2~3줄로 강력하게 요약합니다.

[정신분석학적 심층 해독]: 자아(Ego), 그림자(Shadow), 페르소나(Persona), 억압된 욕망 등의 심리학적 개념을 동원하여 꿈에 나타난 사건의 인과관계를 내면의 심리 상태와 연결하여 해석합니다.

[상징(Symbol) 디코딩 사전]: 꿈에 등장한 주요 사물, 인물, 배경 3~4가지를 추출하여, 각각이 상징하는 원형적 의미를 목록 형태로 상세히 풀이합니다.
- 목록은 반드시 '-'로 시작하는 불릿으로 작성합니다.

[현실을 위한 인사이트]: 이 꿈이 현재 깨어있는 삶(인간관계, 커리어, 심리적 갈등 등)에 어떤 영향을 미치는지, 그리고 앞으로 어떤 마음가짐을 가져야 하는지 실질적이고 따뜻한 조언을 제공합니다.

추가 규칙:
- 출력은 위 4개 섹션만 사용하세요.
- 섹션 사이에는 빈 줄을 1줄 유지하세요.
- 마크다운은 일반 텍스트 그대로 출력하세요. 백틱이나 코드블록 금지.`;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dreamText = String(body?.dreamText || "").trim();
    if (!dreamText || dreamText.length < 8) {
      return NextResponse.json({ ok: false, message: "꿈 내용을 입력해 주세요." }, { status: 400 });
    }

    const maxTokens = Number(process.env.PSYCHO_ANALYSIS_MAX_TOKENS || 2400);

    // Gemini 우선. (GEMINI_API_KEY가 있으면 Gemini로 실행)
    const useGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    const provider = useGemini ? "gemini" : "anthropic";

    const modelForKey = useGemini
      ? process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash"
      : process.env.PSYCHO_ANALYSIS_ANTHROPIC_MODEL || "default";

    let markdown = "";
    if (useGemini) {
      const model = process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "gemini-2.5-flash";
      markdown = await callGeminiDreamPsychoAnalysis({
        systemPrompt: SYSTEM_PROMPT,
        dreamText,
        model,
        maxTokens,
      });
    } else {
      const model = process.env.PSYCHO_ANALYSIS_ANTHROPIC_MODEL || undefined;
      markdown = await callAnthropicDreamPsychoAnalysis({
        systemPrompt: SYSTEM_PROMPT,
        dreamText,
        model,
        maxTokens,
      });
    }

    if (!validateOutputStructure(markdown)) {
      // 포맷이 깨졌으면 한 번 더 엄격 지시로 재시도합니다.
      const retryDreamText =
        dreamText +
        "\n\n[추가 지시] 반드시 아래의 4개 섹션 헤딩을 정확히 포함해 출력하세요:\n" +
        "- [무의식의 핵심 테마]:\n" +
        "- [정신분석학적 심층 해독]:\n" +
        "- [상징(Symbol) 디코딩 사전]:\n" +
        "- [현실을 위한 인사이트]:\n";

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
        return NextResponse.json(
          {
            ok: false,
            message: "LLM 출력 형식이 기대한 구조와 일치하지 않았습니다. (재시도 후에도 실패)",
          },
          { status: 502 },
        );
      }
    }

    const title = "정신분석 해몽";
    const summary = getFirstHeadingSummary(markdown);

    return NextResponse.json({
      ok: true,
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

    return NextResponse.json(
      {
        ok: false,
        message: isQuotaLike ? toFreudQuotaMessage() : error?.message || "psycho analysis failed",
      },
      { status: error?.status || 500 },
    );
  }
}

