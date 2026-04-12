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
  const schema = {
    perCard: [
      {
        idx: 1,
        planet: "태양",
        question: "...",
        cardName: "XIX 태양",
        core: "【필수: 최소 700자】 이 행성과 타로 카드의 심층 결합 해석. 행성 에너지의 원형적 의미, 타로 카드의 상징 체계, 두 에너지의 공명 방식, 현재 삶의 영역에 미치는 구체적 영향, 과거·현재·미래 시간축에서의 에너지 흐름을 포함할 것. 고급스럽고 따뜻한 코칭 톤으로 작성하되 깊이 있는 영적 통찰을 담을 것.",
        patterns: "【필수: 최소 500자】 이 행성 에너지가 만들어내는 심리적·행동적 패턴 심층 분석. 반복되는 무의식적 패턴, 관계에서의 투영, 내면 동기와 두려움의 연결고리, 이 패턴이 삶의 다양한 영역에 나타나는 방식을 구체적으로 서술할 것.",
        energyReading: "【필수: 최소 400자】 현재 이 행성 에너지의 강도와 방향성. 우주적 리듬과의 공명 상태, 에너지가 과활성 또는 저활성일 때의 증상, 건강한 채널링 방법을 서술할 것.",
        shadowWork: "【필수: 최소 400자】 이 행성 에너지의 그림자 측면 탐구. 억압되거나 부정된 내면의 모습, 두려움과 방어 기제, 그림자와 화해하는 구체적인 내면 작업 방법을 서술할 것.",
        advice: "【필수: 최소 500자】 이 포지션에서 나온 구체적이고 실행 가능한 삶의 조언. 단기(이번 주), 중기(이번 달), 장기(3개월) 관점의 행동 지침을 포함하고, 현실적이며 단계적인 가이드를 제시할 것.",
        action: "【필수: 최소 150자】 오늘 당장 실행할 수 있는 매우 구체적인 행동 1-2가지. 방법과 이유를 포함할 것.",
        affirmation: "【필수: 최소 100자】 이 행성의 에너지를 강화하는 강력하고 현재형의 긍정 확언 2-3문장."
      }
    ],
    finalGolden: {
      title: "황금빛 통합 카드",
      goldenCard: "카드명 (로마숫자 포함)",
      summary: "【필수: 최소 700자】 11개 행성 리딩을 통합하는 전체 흐름 요약. 주요 주제의 연결고리, 현재 삶의 핵심 과제, 우주적 타이밍과 기회의 창, 앞으로 나아가야 할 방향을 통합적으로 서술할 것.",
      toneManner: "【필수: 최소 250자】 이번 리딩 전체의 에너지 톤, 우주가 이 사람에게 보내는 핵심 메시지의 뉘앙스를 서술할 것.",
      healing: "【필수: 최소 500자】 깊은 치유의 메시지. 과거의 상처, 현재의 피로, 미래에 대한 두려움을 다독이는 따뜻하고 심층적인 힐링 메시지를 담을 것.",
      encouragement: "【필수: 최소 500자】 진심 어린 응원과 지지의 메시지. 이 사람이 지닌 고유한 강점과 잠재력을 인정하며, 앞으로의 여정에 대한 구체적인 응원을 담을 것.",
      cosmicMessage: "【필수: 최소 350자】 우주적 관점에서의 특별 메시지. 현재 우주의 에너지 흐름이 이 사람에게 전달하는 심층적 메시지를 서술할 것.",
      manifestation: "【필수: 최소 350자】 원하는 현실을 창조하기 위한 구체적 현현 가이드. 의도 설정, 행동, 에너지 정렬 방법을 구체적으로 안내할 것."
    }
  };

  return [
    "당신은 세계 최고 수준의 타로 마스터이자 점성술 해석가, 그리고 영적 코치입니다.",
    "반드시 한국어로만 작성하고, 순수 JSON만 출력하세요 (마크다운 코드블록 없이).",
    "문체는 신비롭고 고급스러우며 따뜻한 코칭 톤을 유지하세요.",
    "각 필드의 【필수: 최소 N자】 지시를 반드시 준수하세요. 각 카드 전체 해석 분량은 최소 2,000자 이상이어야 합니다.",
    "단순 반복이나 빈 말은 금물입니다. 모든 내용은 구체적이고 통찰력 있어야 합니다.",
    "아래 스키마를 정확히 따르세요:",
    JSON.stringify(schema, null, 2),
    "",
    "해석 대상 카드 및 행성 에너지:",
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
              temperature: 0.82,
              maxOutputTokens: 65536,
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
        if (!parsed || !Array.isArray(parsed?.perCard) || parsed.perCard.length < 11 || !parsed?.finalGolden) {
          lastError = new Error("Gemini JSON 파싱 실패 또는 카드 수 부족");
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
