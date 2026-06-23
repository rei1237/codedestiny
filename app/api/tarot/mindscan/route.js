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
    process.env.GEMINIF_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
  ]
    .map((key) => toText(key))
    .filter(Boolean);
}

function pickGeminiKey() {
  const keys = getGeminiKeyPool();
  if (!keys.length) return null;
  return keys[0];
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
    const question = toText(body?.question);

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json(
        { ok: false, message: "카드 페어 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { ok: false, message: "상담 질문이 필요합니다." },
        { status: 400 }
      );
    }

    const { buildMindscanReadingPayload } = await import("../../../../lib/tarot/mindscan-reading.mjs");
    const reading = await buildMindscanReadingPayload(pairs, { question, env: process.env });
    if (!reading?.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: reading?.message || "카드 의미 데이터가 누락되어 정확한 해석을 생성할 수 없습니다",
        },
        { status: 422 },
      );
    }

    return NextResponse.json(reading);
  } catch (error) {
    console.error("[tarot/mindscan] Error:", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
