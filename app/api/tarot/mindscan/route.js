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
      `${pair.mainCardName}와 ${pair.subCardName}가 함께 나온 흐름을 보면, 상대방은 마음이 아예 없는 상태라기보다 상처받지 않으려고 조심하는 쪽에 가깝습니다. ` +
      "지금은 답을 몰아붙이기보다 가벼운 안부와 따뜻한 공감으로 숨통을 열어 주는 접근이 더 잘 맞습니다.",
    mainCardName: pair.mainCardName,
    subCardName: pair.subCardName,
  }));

  return {
    ok: true,
    source: "fallback",
    persona: "연애 상담사",
    intro: "지금 이 관계는 마음이 사라진 흐름이라기보다, 서로 다치지 않으려는 조심스러움이 앞서는 시기예요. 천천히 신뢰를 회복하면 분위기가 달라질 수 있어요.",
    sections,
    masterAdvice:
      "핵심은 속도보다 안정감이에요. 하루 한 번 짧은 안부로 연결감을 만들고, 상대의 반응 속도를 존중해 주세요. 조급함을 내려놓을수록 대화의 결이 부드러워집니다.",
    closing:
      "당신의 진심은 이미 충분히 따뜻해요. 지금은 크게 흔들기보다, 편안한 톤으로 곁을 지키는 방식이 관계를 다시 살립니다.",
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
      "당신은 연애 상담사입니다.",
      "아래 카드 페어를 바탕으로 상대방 속마음을 상담하듯 부드럽고 현실적으로 설명하세요.",
      "문장은 따뜻하고 단정하게, 어려운 전문 용어 없이 작성하세요.",
      "출력 형식은 JSON만 사용하고 마크다운은 사용하지 마세요.",
      "형식:",
      '{"persona":"","intro":"","sections":[{"slot":1,"title":"","content":"","mainCardName":"","subCardName":""}],"masterAdvice":"","closing":""}',
      "sections는 5개를 반환하고, 각 content는 2~4문장으로 작성하세요.",
      "절대 사용하지 말 것: JSON, 스키마, API, 데이터베이스, 알고리즘, 시스템, 엔진, 모델 같은 기술 용어.",
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
          `${pair.mainCardName}와 ${pair.subCardName}를 함께 보면, 상대는 관계를 가볍게 끝내기보다 천천히 마음의 안전함을 확인하고 싶어 하는 상태로 읽힙니다.`,
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
