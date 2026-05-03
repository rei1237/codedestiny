import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const POSITION_TITLES = [
  "표면 감정",
  "과거의 잔상",
  "핵심 진심",
  "미래 기대",
  "무의식 욕구",
];

const MAJOR = [
  "The Fool",
  "The Magician",
  "The High Priestess",
  "The Empress",
  "The Emperor",
  "The Hierophant",
  "The Lovers",
  "The Chariot",
  "Strength",
  "The Hermit",
  "Wheel of Fortune",
  "Justice",
  "The Hanged Man",
  "Death",
  "Temperance",
  "The Devil",
  "The Tower",
  "The Star",
  "The Moon",
  "The Sun",
  "Judgement",
  "The World",
];
const SUITS = ["Wands", "Cups", "Swords", "Pentacles"];
const RANKS = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Page", "Knight", "Queen", "King"];

function toText(value) {
  return String(value || "").trim();
}

function getGeminiModel() {
  return (
    toText(process.env.MINDSCAN_GEMINI_MODEL) ||
    toText(process.env.GEMINI_MODEL) ||
    DEFAULT_GEMINI_MODEL
  );
}

function getGeminiKeyPool() {
  return [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ]
    .map((key) => toText(key))
    .filter(Boolean);
}

function pickGeminiKey() {
  const keys = getGeminiKeyPool();
  if (!keys.length) return null;
  const index = Math.floor(Math.random() * keys.length);
  return keys[index];
}

function cardNameFromId(id) {
  const n = ((Number(id) % 78) + 78) % 78;
  if (n < 22) return MAJOR[n];
  const m = n - 22;
  return `${RANKS[m % 14]} of ${SUITS[Math.floor(m / 14)]}`;
}

function normalizePair(pair, idx) {
  const slot = Number(pair?.slot || idx + 1);
  const mainCardName = toText(pair?.mainCardName) || cardNameFromId(pair?.mainCardId ?? idx);
  const subCardName = toText(pair?.subCardName) || cardNameFromId(pair?.subCardId ?? (idx + 5));

  return {
    slot,
    positionLabel: toText(pair?.positionLabel) || POSITION_TITLES[idx] || `포지션 ${slot}`,
    positionMeaning: toText(pair?.positionMeaning) || "이 위치의 감정 흐름을 읽어냅니다.",
    mainCardName,
    subCardName,
  };
}

function extractGeminiText(payload) {
  if (!payload || typeof payload !== "object") return "";
  return (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => toText(part?.text))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseJsonFromText(text) {
  const source = toText(text);
  if (!source) return null;
  const candidates = [source];

  const fenceMatch = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) candidates.push(fenceMatch[1]);

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw.trim());
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {
      // try next candidate
    }
  }
  return null;
}

function buildFallbackReading(pairs) {
  const normalized = pairs.map(normalizePair);
  const sections = normalized.map((pair, idx) => ({
    slot: idx + 1,
    title: pair.positionLabel,
    content:
      `${pair.mainCardName}와 ${pair.subCardName} 조합은 이 위치에서 감정을 숨기기보다 안전하게 표현할 때 관계의 신뢰가 회복된다는 신호입니다. ` +
      "당장 결론을 내리기보다 상대의 반응 패턴을 관찰하고, 질문형 대화를 늘리는 것이 좋습니다.",
    mainCardName: pair.mainCardName,
    subCardName: pair.subCardName,
  }));

  return {
    ok: true,
    source: "fallback",
    persona: "공감형 심층 분석가",
    intro: "현재 에너지는 감정의 명료화 단계에 있습니다. 서로의 의도를 확인하는 대화가 핵심입니다.",
    sections,
    masterAdvice:
      "핵심은 속도보다 방향입니다. 하루에 한 번 솔직한 감정 문장을 나누고, 상대의 답을 판단 없이 끝까지 듣는 루틴을 유지하세요.",
    closing:
      "상대의 마음을 읽는 가장 강한 방법은 추측이 아니라 일관된 관심입니다. 지금의 진심은 충분히 전달될 수 있습니다.",
  };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const pairs = Array.isArray(body?.pairs) ? body.pairs.slice(0, 5) : [];

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json(
        { ok: false, message: "카드 페어 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    // Gemini API 키 확인
    const apiKey = pickGeminiKey();
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: "Gemini API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const normalizedPairs = pairs.map(normalizePair);
    const pairLines = normalizedPairs
      .map((pair, idx) => {
        return `${idx + 1}. slot=${pair.slot}, position=${pair.positionLabel}, meaning=${pair.positionMeaning}, main=${pair.mainCardName}, sub=${pair.subCardName}`;
      })
      .join("\n");

    const prompt = [
      "당신은 마인드 스캔 타로 마스터입니다.",
      "아래 카드 페어를 바탕으로 상대방 속마음을 분석하세요.",
      "반드시 JSON만 출력하세요. 마크다운 금지.",
      "JSON 스키마:",
      '{"persona":"","intro":"","sections":[{"slot":1,"title":"","content":"","mainCardName":"","subCardName":""}],"masterAdvice":"","closing":""}',
      "sections는 5개를 반환하고, 각 content는 2~4문장으로 작성하세요.",
      "카드 페어:",
      pairLines,
    ].join("\n\n");

    // Gemini API 호출
    const model = getGeminiModel();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[tarot/mindscan] Gemini API error:", errorData);
      const fallback = buildFallbackReading(normalizedPairs);
      return NextResponse.json({
        ...fallback,
        message: "Gemini 응답 오류로 기본 리딩으로 대체되었습니다.",
      });
    }

    const data = await response.json();
    const rawText = extractGeminiText(data);
    const parsed = parseJsonFromText(rawText);
    const fallback = buildFallbackReading(normalizedPairs);

    const rawSections = Array.isArray(parsed?.sections) ? parsed.sections : [];
    const normalizedSections = normalizedPairs.map((pair, idx) => {
      const item = rawSections[idx] || {};
      return {
        slot: Number(item.slot || idx + 1),
        title: toText(item.title) || pair.positionLabel,
        content:
          toText(item.content) ||
          `${pair.mainCardName}와 ${pair.subCardName}의 조합은 상대가 관계의 안정성과 진정성을 동시에 확인하고 싶어 한다는 신호입니다.`,
        mainCardName: toText(item.mainCardName) || pair.mainCardName,
        subCardName: toText(item.subCardName) || pair.subCardName,
      };
    });

    return NextResponse.json({
      ok: true,
      source: parsed ? "gemini" : fallback.source,
      persona: toText(parsed?.persona) || fallback.persona,
      intro: toText(parsed?.intro) || fallback.intro,
      sections: normalizedSections,
      masterAdvice: toText(parsed?.masterAdvice) || fallback.masterAdvice,
      closing: toText(parsed?.closing) || fallback.closing,
    });
  } catch (error) {
    console.error("[tarot/mindscan] Error:", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
