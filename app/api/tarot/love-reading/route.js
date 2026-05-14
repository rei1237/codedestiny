import { NextResponse } from "next/server";
import { buildReadingResponse, getTarotEngine, validateSpreadCardCount } from "../_engine";

export const runtime = "nodejs";

const REL_POSITION_LABELS = [
  "내가 바라보는 상대",
  "상대가 관계 전체를 보는 시각",
  "상대가 나를 바라보는 마음",
  "상대의 연애 의지와 열망",
  "관계를 가로막는 핵심 요인",
  "앞으로 펼쳐질 단기적 결말",
];

function removeRepeatedSentences(text) {
  const sentences = String(text || "")
    .split(/(?<=[.!?。！？]|입니다\.|세요\.|합니다\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const result = [];
  for (const sentence of sentences) {
    const normalized = sentence
      .replace(/\s+/g, " ")
      .replace(/[“”"']/g, "")
      .trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(sentence);
  }
  return result.join(" ");
}

const BANNED_RELATION_PHRASES = [
  /카드\(정방향\)의\s*포지션\s*핵심\s*의미는/gi,
  /카드\(역방향\)의\s*포지션\s*핵심\s*의미는/gi,
  /입니다\.\s*이\s*포지션의\s*메시지는/gi,
  /포지션\s*핵심\s*의미/gi,
  /카드가\s*가리키는\s*장애물/gi,
  /한\s*번에\s*한\s*가지씩\s*해결하세요/gi,
];

function cleanText(text) {
  let out = String(text || "").trim();
  BANNED_RELATION_PHRASES.forEach((pattern) => {
    out = out.replace(pattern, "");
  });
  out = removeRepeatedSentences(out);
  return out.replace(/\s{2,}/g, " ").trim();
}

function displayName(card) {
  const nameKo = String(card?.nameKo || card?.nameKr || "").trim();
  const nameEn = String(card?.nameEn || card?.name || "").trim();
  if (nameKo) return nameKo;
  if (nameEn) return nameEn;
  console.error("[api/tarot/love-reading] card name missing", card?.cardId || card?.id || "unknown");
  return "이름이 확인되지 않은 카드";
}

function buildPositionReading(cards, basePosition = []) {
  return cards.map((card, idx) => {
    const source = basePosition[idx] || {};
    const positionTitle = REL_POSITION_LABELS[idx] || `포지션 ${idx + 1}`;
    const cardName = displayName(card);
    const orientationLabel = card?.orientation === "reversed" ? "역방향" : "정방향";
    const baseSummary = cleanText(source.summary || source.detail || "");
    const fallbackHeadline = orientationLabel === "역방향"
      ? "호감은 있어도 확신 부족과 오해 관리가 우선인 흐름입니다."
      : "호감과 대화가 연결되면 관계가 안정적으로 전개될 수 있습니다.";

    const detailByIndex = [
      "당신이 상대를 어떻게 해석하는지에 따라 연락과 대화의 속도가 달라집니다. 상대의 한 장면보다 반복되는 행동 패턴을 기준으로 보는 것이 현실적입니다.",
      "상대는 관계를 가볍게 볼 수도, 신중하게 볼 수도 있습니다. 핵심은 반응 속도와 약속 이행률을 함께 확인해 부담과 의지를 분리해서 읽는 것입니다.",
      "상대가 느끼는 호감과 거리감은 동시에 존재할 수 있습니다. 말과 행동이 다를 때는 한 번의 표현보다 2~3주의 행동 패턴으로 해석해야 오해를 줄일 수 있습니다.",
      "연애 의지는 감정 선언보다 연락, 만남, 약속 이행으로 드러납니다. 감정은 있으나 움직이지 못하는 상태인지, 현실 문제로 미루는 상태인지 구체적으로 확인하세요.",
      "핵심 장애물은 소통 방식, 타이밍, 자존심, 외부 상황 중 하나로 압축됩니다. 상대를 바꾸려 하기 전에 내가 줄여야 할 반응 패턴을 먼저 정리하는 것이 효과적입니다.",
      "앞으로 2~6주의 단기 결말은 현재 패턴의 예상치입니다. 결론 압박보다 편안한 대화 1회와 작은 약속 이행이 흐름을 가장 크게 바꿉니다.",
    ];

    const adviceByIndex = [
      "내 기대를 확인 질문으로 바꿔 대화하세요.",
      "관계 속도에 대한 서로의 기준을 합의하세요.",
      "말보다 반복 행동으로 호감을 판단하세요.",
      "작은 약속부터 맞춰 의지를 확인하세요.",
      "오해를 키우는 추측 반응을 먼저 줄이세요.",
      "7일 안에 짧고 솔직한 대화를 1회 만드세요.",
    ];

    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: cleanText(source.headline || baseSummary || fallbackHeadline),
      summary: cleanText(baseSummary || fallbackHeadline),
      detail: cleanText(source.detail || detailByIndex[idx] || ""),
      relationshipInsight: cleanText(source.relationshipInsight || "연락·만남·대화·약속의 행동 패턴을 함께 볼 때 관계 해석 정확도가 올라갑니다."),
      advice: cleanText(source.advice || adviceByIndex[idx] || ""),
      caution: cleanText(source.caution || "답장 속도만으로 관계 전체를 단정하지 말고, 반복 회피 패턴은 기록하세요."),
      title: positionTitle,
      card: `${cardName} · ${orientationLabel}`,
    };
  });
}

function normalizeLoveReading(reading, cards) {
  const src = reading && typeof reading === "object" ? reading : {};
  const safeCards = Array.isArray(cards) ? cards : [];
  const positionBreakdown = buildPositionReading(safeCards, Array.isArray(src.positionBreakdown) ? src.positionBreakdown : []);
  const finalAdvice = {
    instantMission: "상대 반응을 추측해 결론 내리지 말고 최근 행동 3가지를 적어보세요.",
    conversationTip: "왜 그랬어? 대신 나는 그때 혼란스러웠어. 네 생각을 듣고 싶어 라고 말해 보세요.",
    relationshipBoundary: "답장이 늦다는 이유만으로 관계를 단정하지 않되 반복적으로 약속을 피하는 행동은 기록해 두세요.",
    nextSevenDays: "결론 압박보다 편안한 대화 1회를 만드는 것이 가장 큰 변화를 만듭니다.",
  };
  return {
    counselorTone: cleanText(src.counselorTone || "따뜻하지만 현실적인 연애 상담 톤으로 관계를 읽어드립니다."),
    overallVibe: cleanText(src.overallVibe || "호감은 존재하지만 관계 만족도는 대화 방식과 약속 이행에서 결정됩니다."),
    deepReading: cleanText(src.deepReading || "상대의 마음과 의지는 같을 수도 다를 수도 있으니 말보다 행동 패턴을 함께 확인하세요."),
    realityAndFuture: cleanText(src.realityAndFuture || "단기 결말은 현재 패턴의 연장선이며, 소통 방식이 바뀌면 결과도 바뀝니다."),
    positionBreakdown,
    finalAdvice,
    advice: [
      finalAdvice.instantMission,
      finalAdvice.conversationTip,
      finalAdvice.relationshipBoundary,
      finalAdvice.nextSevenDays,
    ],
  };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const cards = Array.isArray(body?.cards) ? body.cards : [];
    const engine = await getTarotEngine();
    const spreadType = "relationship_six_card";

    const countCheck = validateSpreadCardCount(spreadType, cards);
    if (!countCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "love-reading은 6장의 카드가 필요합니다.",
          expectedCardCount: countCheck.expected,
          receivedCardCount: cards.length,
        },
        { status: 400 }
      );
    }

    const payload = buildReadingResponse(engine, "love", spreadType, cards);
    payload.reading = normalizeLoveReading(payload?.reading, payload?.cards || []);
    payload.consultingHighlights = [payload.reading.overallVibe, payload.reading.deepReading, payload.reading.realityAndFuture]
      .map((line) => cleanText(line))
      .filter(Boolean)
      .slice(0, 3);
    payload.api = "love-reading";
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "love-reading failed";
    console.error("[api/tarot/love-reading]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
