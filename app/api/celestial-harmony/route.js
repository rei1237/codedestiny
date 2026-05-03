import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const PLANET_LABELS = [
  "태양",
  "달",
  "수성",
  "금성",
  "화성",
  "목성",
  "토성",
  "천왕성",
  "해왕성",
  "명왕성",
  "지구",
];

function toText(value) {
  return String(value || "").trim();
}

function getGeminiModel() {
  return (
    toText(process.env.CELESTIAL_HARMONY_GEMINI_MODEL) ||
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

function resolveCardName(card) {
  if (!card || typeof card !== "object") return "미지정 카드";
  const fromDirect = toText(card.cardName || card.name || card.id);
  if (fromDirect) return fromDirect;

  const tarot = card.tarot && typeof card.tarot === "object" ? card.tarot : null;
  const fromTarotName = toText(tarot?.name || tarot?.title);
  if (fromTarotName) return fromTarotName;

  const partA = toText(tarot?.r);
  const partB = toText(tarot?.n);
  const merged = toText([partA, partB].filter(Boolean).join(" "));
  return merged || "미지정 카드";
}

function resolvePlanetName(card, idx) {
  const direct = toText(card?.planet || card?.planetName || card?.name);
  if (direct) return direct;
  return PLANET_LABELS[idx] || `행성 ${idx + 1}`;
}

function resolveQuestion(card) {
  return (
    toText(card?.question) ||
    "이 영역에서 현재 가장 중요한 메시지는 무엇인가요?"
  );
}

function extractGeminiText(payload) {
  if (!payload || typeof payload !== "object") return "";
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => toText(part?.text))
    .filter(Boolean)
    .join("\n")
    .trim();
  return text || "";
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
      // ignore parse candidates and continue
    }
  }
  return null;
}

function normalizePerCardItem(item, card, idx) {
  const planet = resolvePlanetName(card, idx);
  const question = resolveQuestion(card);
  const cardName = resolveCardName(card);

  return {
    planet,
    question,
    cardName: toText(item?.cardName) || cardName,
    core:
      toText(item?.core) ||
      `${planet}의 흐름에서 ${cardName} 카드는 지금 감정과 판단을 균형 있게 정리하라는 메시지를 줍니다.`,
    patterns:
      toText(item?.patterns) ||
      "최근 반복되는 선택 패턴을 점검하고, 감정 반응 대신 의도 기반 결정을 늘리는 것이 좋습니다.",
    energyReading:
      toText(item?.energyReading) ||
      "에너지는 상승 곡선이며, 작은 실행을 이어갈수록 명확성이 빠르게 커집니다.",
    shadowWork:
      toText(item?.shadowWork) ||
      "불안의 원인을 단정하지 말고, 사실과 해석을 분리해 기록하면서 내면 신호를 살펴보세요.",
    advice:
      toText(item?.advice) ||
      "이번 주에는 결정을 미루기보다 24시간 안에 작은 실행 한 가지를 완료해 흐름을 고정하세요.",
    action: toText(item?.action) || "오늘 해야 할 1가지 행동을 정하고 바로 10분만 시작하세요.",
    affirmation:
      toText(item?.affirmation) ||
      `나는 ${planet}의 흐름을 신뢰하며, 나에게 맞는 리듬으로 현실을 정렬한다.`,
  };
}

function buildFallbackResult(cards, goldenCard) {
  const perCard = cards.map((card, idx) =>
    normalizePerCardItem(null, card, idx)
  );

  const goldenName = resolveCardName(goldenCard || cards[0] || {});

  return {
    perCard,
    finalGolden: {
      title: "황금빛 통합 카드",
      goldenCard: goldenName,
      summary:
        "전체 흐름은 정리와 실행이 동시에 필요한 전환기입니다. 핵심 우선순위를 좁혀 꾸준히 밀고 가면 안정적으로 성과가 쌓입니다.",
      toneManner:
        "차분하지만 결단력 있는 톤으로 하루의 선택을 단순화하세요.",
      healing:
        "불확실성은 실패 신호가 아니라 성장 전조입니다. 몸의 리듬을 먼저 돌보면 판단도 선명해집니다.",
      encouragement:
        "당신은 이미 충분한 자원을 갖고 있습니다. 작은 실행을 반복하면 결과는 반드시 따라옵니다.",
      cosmicMessage:
        "우주는 속도를 요구하지 않고 방향을 요구합니다.",
      manifestation:
        "오늘의 단일 목표를 선언하고 취침 전 체크리스트에 완료 표시를 남기세요.",
    },
  };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const cards = Array.isArray(body?.cards) ? body.cards : [];
    const goldenCard = body?.goldenCard || null;

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { ok: false, message: "카드 데이터가 필요합니다." },
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

    const cardLines = cards
      .map((card, idx) => {
        return `${idx + 1}. 행성=${resolvePlanetName(card, idx)}, 카드=${resolveCardName(card)}, 질문=${resolveQuestion(card)}`;
      })
      .join("\n");

    const prompt = [
      "당신은 천체의 선율 타로 마스터입니다.",
      "아래 카드 목록을 바탕으로 11행성 리딩을 생성하세요.",
      "반드시 JSON만 출력하세요. 마크다운 금지.",
      "JSON 스키마:",
      '{"perCard":[{"planet":"","question":"","cardName":"","core":"","patterns":"","energyReading":"","shadowWork":"","advice":"","action":"","affirmation":""}],"finalGolden":{"title":"","goldenCard":"","summary":"","toneManner":"","healing":"","encouragement":"","cosmicMessage":"","manifestation":""}}',
      `황금 카드 힌트: ${resolveCardName(goldenCard || cards[0] || {})}`,
      "카드 목록:",
      cardLines,
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
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[celestial-harmony] Gemini API error:", errorData);
      const fallback = buildFallbackResult(cards, goldenCard);
      return NextResponse.json({
        ok: true,
        source: "fallback",
        message: "Gemini 응답 오류로 기본 리딩으로 대체되었습니다.",
        result: fallback,
      });
    }

    const data = await response.json();
    const rawText = extractGeminiText(data);
    const parsed = parseJsonFromText(rawText);

    const fallback = buildFallbackResult(cards, goldenCard);
    const perCardInput = Array.isArray(parsed?.perCard) ? parsed.perCard : [];
    const perCard = cards.map((card, idx) =>
      normalizePerCardItem(perCardInput[idx], card, idx)
    );

    const finalGoldenInput = parsed?.finalGolden && typeof parsed.finalGolden === "object"
      ? parsed.finalGolden
      : {};

    const finalGolden = {
      title: toText(finalGoldenInput.title) || fallback.finalGolden.title,
      goldenCard: toText(finalGoldenInput.goldenCard) || fallback.finalGolden.goldenCard,
      summary: toText(finalGoldenInput.summary) || fallback.finalGolden.summary,
      toneManner: toText(finalGoldenInput.toneManner) || fallback.finalGolden.toneManner,
      healing: toText(finalGoldenInput.healing) || fallback.finalGolden.healing,
      encouragement: toText(finalGoldenInput.encouragement) || fallback.finalGolden.encouragement,
      cosmicMessage: toText(finalGoldenInput.cosmicMessage) || fallback.finalGolden.cosmicMessage,
      manifestation: toText(finalGoldenInput.manifestation) || fallback.finalGolden.manifestation,
    };

    return NextResponse.json({
      ok: true,
      source: parsed ? "gemini" : "fallback",
      result: {
        perCard: perCard.length ? perCard : fallback.perCard,
        finalGolden,
      },
    });
  } catch (error) {
    console.error("[celestial-harmony] Error:", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
