import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiKeys() {
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

function pickModels() {
  const configured = String(
    process.env.CRYSTAL_SOUL_GEMINI_MODEL ||
      process.env.MINDSCAN_GEMINI_MODEL ||
      process.env.LIFEBOOK_GEMINI_MODEL ||
      "gemini-2.5-flash"
  )
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const defaults = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
  return Array.from(new Set([...configured, ...defaults]));
}

function parseTextFromGemini(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const c of candidates) {
    for (const part of c?.content?.parts || []) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

function buildFallbackReading(topic, gem, cards, assignments, positions, GEMSTONES_MAP) {
  const cardLines = cards
    .map((c, i) => {
      const ag = assignments[String(i)] ? GEMSTONES_MAP[assignments[String(i)]] : null;
      return `- ${positions[i]}: ${c}${ag ? ` (${ag.name} · ${ag.theme})` : ""}`;
    })
    .join("\n");

  return [
    `오늘 ${gem.name}의 에너지가 당신의 질문 앞에 고요히 펼쳐집니다.`,
    `\n${topic.name} 주제로 뽑힌 카드들을 하나하나 살펴보면,`,
    `\n${cardLines}`,
    `\n이 카드들이 전하는 메시지는 명확합니다. 지금 당신 앞에 놓인 흐름은 방해받은 것이 아니라, 더 깊이 성숙하기 위한 준비 과정에 있습니다.`,
    `${gem.name}의 특성인 '${gem.theme}'이 이 배열 전체에 스며들어, 표면의 어려움 너머에 있는 본질적인 에너지를 조명해 줍니다.`,
    `\n지금 가장 중요한 것은 결과를 서두르지 않는 것입니다. 원석이 수백만 년에 걸쳐 완성되듯, 당신의 상황도 그에 맞는 시간이 필요합니다.`,
    `이 순간을 믿고, 당신 내면의 목소리에 귀 기울이세요. 빛은 반드시 찾아옵니다. ✦`,
  ].join(" ");
}

function buildPrompt(topic, gem, cards, assignments, positions, GEMSTONES_MAP) {
  const cardLines = cards
    .map((c, i) => {
      const ag = assignments[String(i)] ? GEMSTONES_MAP[assignments[String(i)]] : null;
      return `${i + 1}. [${positions[i]}] ${c}${ag ? ` / 함께한 원석: ${ag.name}(${ag.theme})` : ""}`;
    })
    .join("\n");

  return [
    "너는 한국 최고의 크리스탈 소울 타로 마스터야.",
    "'호랑 타로' 채널처럼 따뜻하고 신비로우며 공감적인 말투로 리딩해줘.",
    "문체는 '~해요', '~해주고 있네요', '그랬군요' 같은 대화체를 사용해.",
    "사용자의 이름은 부르지 말고, '지금 당신에게...', '이 카드는...' 처럼 2인칭으로 자연스럽게 말해.",
    "각 카드에 선택된 원석이 있으면, 그 원석의 에너지가 카드 의미를 어떻게 증폭하는지 자연스럽게 언급해.",
    "전체 리딩을 하나의 흐름 있는 이야기로 1000자 이상 상세하게 작성해.",
    "마지막에 핵심 메시지를 한 문장으로 정리해줘.",
    "---",
    `주제: ${topic.name}`,
    `주 원석: ${gem.name} (${gem.theme})`,
    `스프레드: ${topic.spread.name}`,
    "",
    "카드 배열:",
    cardLines,
    "",
    `리딩 방향: ${topic.hint}`,
  ].join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const topic = body?.topic;
    const gem = body?.gem;
    const cards = Array.isArray(body?.cards) ? body.cards : [];
    const assignments = body?.assignments || {};
    const positions = Array.isArray(body?.positions) ? body.positions : [];
    const gemstonesMap = body?.gemstonesMap || {};

    if (!topic || !gem || cards.length === 0) {
      return NextResponse.json(
        { error: "topic, gem, cards 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    const keys = pickGeminiKeys();
    const models = pickModels();
    const prompt = buildPrompt(topic, gem, cards, assignments, positions, gemstonesMap);

    if (keys.length === 0) {
      const fallback = buildFallbackReading(
        topic,
        gem,
        cards,
        assignments,
        positions,
        gemstonesMap
      );
      return NextResponse.json({ reading: fallback, source: "local" });
    }

    let lastError = "";
    for (const model of models) {
      const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
      for (const apiKey of keys) {
        try {
          const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.85,
                maxOutputTokens: /gemini-2\.5-pro/i.test(model) ? 32768 : 8192,
              },
            }),
          });
          const payload = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            lastError = String(
              payload?.error?.message || `Gemini 요청 실패 (${resp.status})`
            );
            continue;
          }
          const text = parseTextFromGemini(payload);
          if (text) {
            return NextResponse.json({ reading: text, source: "gemini" });
          }
          lastError = "Gemini 응답 텍스트가 비어 있습니다.";
        } catch (e) {
          lastError = String(e?.message || e);
        }
      }
    }

    // 모든 키/모델 실패 시 로컬 폴백
    const fallback = buildFallbackReading(
      topic,
      gem,
      cards,
      assignments,
      positions,
      gemstonesMap
    );
    return NextResponse.json({ reading: fallback, source: "local" });
  } catch (error) {
    return NextResponse.json(
      { error: String(error?.message || "서버 오류가 발생했습니다.") },
      { status: 500 }
    );
  }
}
