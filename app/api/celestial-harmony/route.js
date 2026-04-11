import { NextResponse } from "next/server";

const GEMINI_ENDPOINT_TEMPLATE =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

const QUESTIONS = [
  "다른 사람들이 나에게서 가장 먼저 알아보는 것은 무엇인가",
  "나는 다른 사람들과 어떻게 지적으로 교류하는가",
  "나는 내 삶에서 다른 사람들을 어떻게 사랑하는가",
  "무엇이 나를 안정적인 사람으로 만드는가",
  "내가 가장 강하게 느끼는 감정은 무엇인가",
  "나는 대립이나 갈등 상황에 어떻게 대처하는가",
  "나는 재정적인 삶을 어떻게 관리하는가",
  "나는 어떻게 더 규율을 잘 지킬 수 있는가",
  "내 삶에서 나를 옭아매는 제약은 무엇인가",
  "나는 어떻게 무조건적인 사랑을 보여줄 수 있는가",
  "내 삶에서 변형하고 탈바꿈해야 할 것은 무엇인가",
];

function pickGeminiApiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINIF_API_KEY5,
    process.env.GEMINIF_API_KEY6,
    process.env.GEMINIF_API_KEY7,
    process.env.GEMINIF_API_KEY8,
    process.env.GEMINIF_API_KEY9,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function parseGeminiText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        return null;
      }
    }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildFallback(cards, goldenCard) {
  const perCard = cards.map((card, idx) => ({
    idx: idx + 1,
    planet: card.planet,
    question: card.question,
    cardName: `${card.tarot.r} ${card.tarot.n}`,
    core: `${card.planet} 포지션은 ${card.tarot.n}의 상징을 통해 현재의 핵심 과제를 드러냅니다.`,
    patterns: "반복되는 감정·관계·행동 패턴을 관찰하면 다음 선택의 정확도가 올라갑니다.",
    advice: "작은 실천 하나를 이번 주에 고정 루틴으로 만들고, 결과를 기록해 보세요.",
    action: "오늘 바로 가능한 10분 행동 1개를 정해 실행하세요.",
    affirmation: "나는 우주의 흐름과 조화를 이루며, 매일 더 명료하게 성장한다.",
  }));

  return {
    perCard,
    finalGolden: {
      title: "황금빛 통합 카드",
      goldenCard: `${goldenCard?.r || "X"} ${goldenCard?.n || "The Wheel"}`,
      summary:
        "지금의 당신은 변화의 문턱에 서 있습니다. 관계와 감정, 재정과 규율의 축을 동시에 정렬하면 흐름이 크게 열립니다.",
      toneManner:
        "신비롭지만 단정한 어조, 위로와 추진력을 함께 주는 코칭 톤을 유지하세요.",
      healing:
        "충분히 잘 해왔습니다. 완벽이 아니라 지속이 당신의 운명을 바꿉니다.",
      encouragement:
        "오늘의 작은 선택이 내일의 큰 기회를 부릅니다. 당신은 이미 올바른 길 위에 있습니다.",
    },
  };
}

function buildPrompt(cards, goldenCard) {
  return [
    "당신은 세계 최고 수준의 타로 마스터이자 점성술 해석가입니다.",
    "반드시 한국어로 작성하고, JSON만 출력하세요.",
    "문체는 고급스럽고 따뜻한 코칭 톤을 유지하세요.",
    "각 카드 해석은 매우 구체적이고 실행 가능해야 합니다.",
    "아래 스키마를 정확히 지키세요:",
    "{",
    '  "perCard": [',
    "    {",
    '      "idx": 1,',
    '      "planet": "태양",',
    '      "question": "...",',
    '      "cardName": "XIX 태양",',
    '      "core": "핵심 해석(4~5문장)",',
    '      "patterns": "패턴 분석(3~4문장)",',
    '      "advice": "구체적 조언(3~4문장)",',
    '      "action": "오늘 실행할 행동 1개",',
    '      "affirmation": "짧고 강한 확언 1문장"',
    "    }",
    "  ],",
    '  "finalGolden": {',
    '    "title": "황금빛 통합 카드",',
    '    "goldenCard": "카드명",',
    '    "summary": "전체 흐름 요약(5~6문장)",',
    '    "toneManner": "이번 리딩의 톤앤매너 요약(2~3문장)",',
    '    "healing": "치유 메시지(3~4문장)",',
    '    "encouragement": "응원 메시지(3~4문장)"',
    "  }",
    "}",
    "해석 대상 카드:",
    JSON.stringify({ cards, goldenCard, questions: QUESTIONS }, null, 2),
  ].join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const cards = Array.isArray(body?.cards) ? body.cards.slice(0, 11) : [];
    const goldenCard = body?.goldenCard || null;

    if (cards.length !== 11) {
      return NextResponse.json(
        { ok: false, message: "11장의 카드 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    const keys = pickGeminiApiKeys();
    if (!keys.length) {
      return NextResponse.json(
        { ok: true, result: buildFallback(cards, goldenCard), fallback: true },
        { status: 200 }
      );
    }

    const model = String(
      process.env.CELESTIAL_HARMONY_GEMINI_MODEL ||
        process.env.PSYCHO_ANALYSIS_GEMINI_MODEL ||
        "gemini-2.5-flash"
    ).trim();

    const endpoint = GEMINI_ENDPOINT_TEMPLATE.replace("{model}", encodeURIComponent(model));
    const prompt = buildPrompt(cards, goldenCard);

    let lastError = null;
    for (const key of keys) {
      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.75,
              maxOutputTokens: 8192,
            },
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          lastError = new Error(
            payload?.error?.message || payload?.message || `Gemini 요청 실패 (${response.status})`
          );
          continue;
        }

        const text = parseGeminiText(payload);
        const parsed = safeJsonParse(text);
        if (!parsed || !Array.isArray(parsed?.perCard) || !parsed?.finalGolden) {
          lastError = new Error("Gemini JSON 파싱 실패");
          continue;
        }

        return NextResponse.json({ ok: true, result: parsed, model });
      } catch (error) {
        lastError = error;
      }
    }

    return NextResponse.json({ ok: true, result: buildFallback(cards, goldenCard), fallback: true, message: String(lastError?.message || "fallback") }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: String(error?.message || "요청 처리에 실패했습니다.") },
      { status: 500 }
    );
  }
}
