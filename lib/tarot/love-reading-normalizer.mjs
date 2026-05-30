const REL_POSITION_LABELS = [
  "내가 바라보는 상대",
  "상대가 관계 전체를 보는 시각",
  "상대가 나를 바라보는 마음",
  "상대의 연애 의지와 열망",
  "관계를 가로막는 핵심 요인",
  "앞으로 펼쳐질 단기적 결말",
];

const POSITION_LENS = [
  {
    title: "내가 바라보는 상대",
    detailFocus: "내가 상대를 해석하는 프레임",
    insightFocus: "내 인식과 실제 행동의 간극",
    adviceFocus: "질문 방식 정비",
  },
  {
    title: "상대가 관계 전체를 보는 시각",
    detailFocus: "상대의 관계 관점과 속도 기준",
    insightFocus: "관계 정의와 책임감의 균형",
    adviceFocus: "관계 속도 합의",
  },
  {
    title: "상대가 나를 바라보는 마음",
    detailFocus: "상대가 지금 나를 어떻게 느끼는지",
    insightFocus: "상대가 나에게 느끼는 감정의 온도",
    adviceFocus: "상대에게 신뢰를 주는 행동",
  },
  {
    title: "상대의 연애 의지와 열망",
    detailFocus: "상대가 나와 연애로 발전하고 싶은 마음이 있는지",
    insightFocus: "상대의 연애 의지가 실제 행동으로 나타나고 있는지",
    adviceFocus: "관계를 발전시킬 작은 행동 하나",
  },
  {
    title: "관계를 가로막는 핵심 요인",
    detailFocus: "두 사람 사이를 막고 있는 것",
    insightFocus: "갈등이나 오해가 반복되는 이유",
    adviceFocus: "장애물을 줄이는 구체적 행동",
  },
  {
    title: "앞으로 펼쳐질 단기적 결말",
    detailFocus: "2~6주 단기 흐름 전망",
    insightFocus: "현재 패턴의 귀결",
    adviceFocus: "결말을 바꾸는 실행",
  },
];

const BANNED_RELATION_PHRASES = [
  /카드\(정방향\)의\s*포지션\s*핵심\s*의미는/gi,
  /카드\(역방향\)의\s*포지션\s*핵심\s*의미는/gi,
  /입니다\.\s*이\s*포지션의\s*메시지는/gi,
  /포지션\s*핵심\s*의미/gi,
  /카드가\s*가리키는\s*장애물/gi,
  /한\s*번에\s*한\s*가지씩\s*해결하세요/gi,
];

function removeRepeatedSentences(text) {
  const sentences = String(text || "")
    .split(/(?<=[.!?。！？]|입니다\.|세요\.|합니다\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const sentence of sentences) {
    const normalized = sentence
      .replace(/\s+/g, " ")
      .replace(/[“”"']/g, "")
      .trim()
      .toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(sentence);
  }
  return out.join(" ");
}

function cleanText(text) {
  let out = String(text || "").trim();
  for (const pattern of BANNED_RELATION_PHRASES) {
    out = out.replace(pattern, "");
  }
  out = removeRepeatedSentences(out);
  return out.replace(/\s{2,}/g, " ").trim();
}

function displayName(card) {
  const nameKo = String(card?.nameKo || card?.nameKr || "").trim();
  const nameEn = String(card?.nameEn || card?.name || "").trim();
  if (nameKo) return nameKo;
  if (nameEn) return nameEn;
  return "이름이 확인되지 않은 카드";
}

function normalizeOrientation(card) {
  return String(card?.orientation || "").toLowerCase() === "reversed" ? "reversed" : "upright";
}

function analyzeCard(card) {
  const cardId = String(card?.cardId || "").toUpperCase();
  const orientation = normalizeOrientation(card);
  const suitCode = cardId[0];
  const rankCode = Number(cardId.slice(1));
  const isMajor = suitCode === "M";

  let suit = "major";
  if (!isMajor) {
    if (suitCode === "C") suit = "cups";
    else if (suitCode === "W") suit = "wands";
    else if (suitCode === "S") suit = "swords";
    else if (suitCode === "P") suit = "pentacles";
    else suit = "minor";
  }

  const courtRank = rankCode >= 11 && rankCode <= 14;
  const orientationLabel = orientation === "reversed" ? "역방향" : "정방향";
  const keywords = Array.isArray(card?.keywords)
    ? card.keywords.map((k) => String(k || "").trim()).filter(Boolean).slice(0, 3)
    : [];

  return {
    suit,
    isMajor,
    orientation,
    orientationLabel,
    courtRank,
    keywords,
  };
}

function suitMessage(suit, orientation) {
  const rev = orientation === "reversed";
  if (suit === "major") return rev
    ? "큰 전환 신호가 들어왔지만 감정 정리가 늦어 결정을 미루는 흐름"
    : "관계의 방향 자체를 바꿀 수 있는 굵직한 전환 신호";
  if (suit === "cups") return rev
    ? "감정은 있으나 표현이 비틀려 오해가 쌓이기 쉬운 흐름"
    : "감정 교류와 정서적 공감이 핵심 동력인 흐름";
  if (suit === "wands") return rev
    ? "열정은 있지만 타이밍이 어긋나 번아웃이나 급발진이 생기기 쉬운 흐름"
    : "끌림과 추진력이 살아 있어 관계 진전을 만들 수 있는 흐름";
  if (suit === "swords") return rev
    ? "생각이 과열되어 말의 날이 서고 방어가 강해지는 흐름"
    : "명확한 기준과 솔직한 대화가 관계를 정리해 주는 흐름";
  if (suit === "pentacles") return rev
    ? "현실 조건 점검이 부족해 약속 신뢰도가 흔들리기 쉬운 흐름"
    : "현실성, 꾸준함, 책임감으로 신뢰를 쌓는 흐름";
  return rev
    ? "관계 해석이 흔들려 결론을 서두르기 쉬운 흐름"
    : "관계의 기본 리듬을 안정적으로 만들 수 있는 흐름";
}

function courtMessage(courtRank, orientation) {
  if (!courtRank) return "";
  return orientation === "reversed"
    ? "인물 카드의 역방향 성향이 보여 감정 표현의 미성숙 또는 방어적 태도를 점검할 필요가 있습니다."
    : "인물 카드 성향이 강해 관계를 움직이는 주체적 선택과 말투 조절이 결과를 좌우합니다.";
}

function keywordHint(keywords) {
  if (!keywords.length) return "";
  return `이번 카드의 핵심 키워드는 ${keywords.join(" · ")}입니다.`;
}

function pickSourceOrFallback(sourceText, fallbackText) {
  const cleaned = cleanText(sourceText);
  if (!cleaned) return cleanText(fallbackText);
  if (cleaned.length < 32) return cleanText(fallbackText);
  return cleaned;
}

function normalizeForComparison(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”"'`.,!?;:()\[\]{}]/g, "")
    .trim();
}

function buildDiversifiedFallback(field, row, idx) {
  const lens = POSITION_LENS[idx] || POSITION_LENS[POSITION_LENS.length - 1];
  const suitFlow = suitMessage(row.__meta.suit, row.__meta.orientation);
  const orientationLine = row.__meta.orientation === "reversed"
    ? "지금은 속도를 낮추고 사실 확인 순서를 먼저 세워야 합니다."
    : "지금은 표현의 일관성을 유지하며 작은 합의를 쌓아야 합니다.";

  if (field === "headline") {
    return `${row.positionTitle} 핵심은 '${lens.detailFocus}'의 정확도를 높이는 것입니다. ${suitFlow}`;
  }
  if (field === "summary") {
    return `${row.positionTitle} 요약: ${lens.detailFocus} 기준에서 ${suitFlow} ${orientationLine}`;
  }
  if (field === "detail") {
    return `${lens.detailFocus} 관점에서는 감정 크기보다 반복 행동의 일관성과 약속 이행률이 결과를 좌우합니다. ${orientationLine}`;
  }
  if (field === "relationshipInsight") {
    return `${lens.insightFocus}를 볼 때는 말보다 상대의 실제 행동을 기준으로 보세요.`;
  }
  if (field === "advice") {
    return `${lens.adviceFocus} 실행: 오늘은 질문 1개와 실행 약속 1개만 남기고, 반응 속도 추측은 멈추세요.`;
  }
  if (field === "caution") {
    return row.__meta.orientation === "reversed"
      ? "불안한 마음에 계속 확인을 요구하면 상대가 오히려 마음을 닫을 수 있어요."
      : "호감 신호가 보여도 결론을 서두르면 리듬이 깨질 수 있습니다.";
  }
  return "";
}

function enforcePositionTextDiversity(rows) {
  const fields = ["headline", "summary", "detail", "relationshipInsight", "advice", "caution"];
  const seenByField = new Map(fields.map((field) => [field, new Set()]));

  rows.forEach((row, idx) => {
    const seenInRow = new Set();

    fields.forEach((field) => {
      let value = cleanText(row[field]);
      let key = normalizeForComparison(value);

      if (key && seenInRow.has(key)) {
        value = cleanText(row.__fallback[field] || "");
        key = normalizeForComparison(value);
      }

      if (!key || seenInRow.has(key) || seenByField.get(field).has(key)) {
        value = cleanText(buildDiversifiedFallback(field, row, idx));
        key = normalizeForComparison(value);
      }

      if (!key) {
        value = cleanText(buildDiversifiedFallback(field, row, idx));
        key = normalizeForComparison(value);
      }

      row[field] = value;
      if (key) {
        seenInRow.add(key);
        seenByField.get(field).add(key);
      }
    });

    delete row.__fallback;
    delete row.__meta;
  });

  return rows;
}

function buildPositionReading(cards, basePosition = []) {
  const rows = cards.map((card, idx) => {
    const source = basePosition[idx] || {};
    const lens = POSITION_LENS[idx] || POSITION_LENS[POSITION_LENS.length - 1];
    const positionTitle = REL_POSITION_LABELS[idx] || `포지션 ${idx + 1}`;
    const cardName = displayName(card);
    const parsed = analyzeCard(card);

    const headlineFallback = `${positionTitle}에서는 ${suitMessage(parsed.suit, parsed.orientation)}이 드러납니다.`;
    const summaryFallback = `${lens.detailFocus} 관점에서 보면 ${suitMessage(parsed.suit, parsed.orientation)}입니다. ${keywordHint(parsed.keywords)}`;
    const detailFallback = `${lens.title} 기준으로 지금 중요한 것은 감정의 크기보다 반복 행동의 일관성입니다. ${courtMessage(parsed.courtRank, parsed.orientation)}`;
    const insightFallback = `${lens.insightFocus}를 볼 때는 답장 속도보다 상대가 약속을 지키는지, 지속적으로 연락을 유지하는지를 먼저 확인하세요.`;
    const adviceFallback = `${lens.adviceFocus}에 집중하세요. ${parsed.orientation === "reversed"
      ? "확인 질문 1개와 경계 문장 1개만 짧게 전달해 관계 피로를 줄이세요."
      : "가벼운 안부와 작은 실행 약속을 묶어 신뢰를 천천히 쌓아가세요."}`;
    const cautionFallback = parsed.orientation === "reversed"
      ? "감정 불안을 확인 강요로 표출하면 관계가 급격히 닫힐 수 있습니다."
      : "좋은 반응이 나와도 결론을 서두르면 리듬이 깨질 수 있습니다.";

    return {
      positionTitle,
      cardName,
      orientationLabel: parsed.orientationLabel,
      headline: pickSourceOrFallback(source.headline, headlineFallback),
      summary: pickSourceOrFallback(source.summary || source.detail, summaryFallback),
      detail: pickSourceOrFallback(source.detail, detailFallback),
      relationshipInsight: pickSourceOrFallback(source.relationshipInsight, insightFallback),
      advice: pickSourceOrFallback(source.advice, adviceFallback),
      caution: pickSourceOrFallback(source.caution, cautionFallback),
      title: positionTitle,
      card: `${cardName} · ${parsed.orientationLabel}`,
      __fallback: {
        headline: headlineFallback,
        summary: summaryFallback,
        detail: detailFallback,
        relationshipInsight: insightFallback,
        advice: adviceFallback,
        caution: cautionFallback,
      },
      __meta: parsed,
    };
  });

  return enforcePositionTextDiversity(rows);
}

export function normalizeLoveReadingPayload(reading, cards) {
  const src = reading && typeof reading === "object" ? reading : {};
  const safeCards = Array.isArray(cards) ? cards : [];
  const positionBreakdown = buildPositionReading(
    safeCards,
    Array.isArray(src.positionBreakdown) ? src.positionBreakdown : []
  );

  const finalAdvice = {
    instantMission: cleanText(src?.finalAdvice?.instantMission || "상대의 최근 행동 3가지와 내 해석 3가지를 분리해 적어 감정 추측을 줄이세요."),
    conversationTip: cleanText(src?.finalAdvice?.conversationTip || "너 왜 그래? 대신 나는 이 장면에서 이렇게 느꼈어. 네 기준을 듣고 싶어 로 시작하세요."),
    relationshipBoundary: cleanText(src?.finalAdvice?.relationshipBoundary || "답장 속도보다 반복된 회피 행동을 기준으로 관계의 건강도를 판단하세요."),
    nextSevenDays: cleanText(src?.finalAdvice?.nextSevenDays || "앞으로 7일은 결론 요구를 멈추고 짧은 대화 1회와 작은 약속 1회를 만드는 데 집중하세요."),
  };

  const advice = [
    finalAdvice.instantMission,
    finalAdvice.conversationTip,
    finalAdvice.relationshipBoundary,
    finalAdvice.nextSevenDays,
  ].filter(Boolean);

  return {
    counselorTone: cleanText(src.counselorTone || "최고의 타로 상담사가 카드 배열과 행동 패턴을 함께 읽듯, 따뜻하지만 단정하지 않는 방식으로 안내합니다."),
    overallVibe: cleanText(src.overallVibe || "호감 유무보다 관계를 움직이는 실제 행동 리듬이 더 중요합니다. 이번 배열은 감정과 실행 간격을 세밀하게 보여줍니다."),
    deepReading: cleanText(src.deepReading || "상대가 나를 보는 마음, 관계 자체를 보는 기준, 연애 의지의 강도는 같은 축이 아닙니다. 각 포지션을 분리해서 읽어야 정확도가 올라갑니다."),
    realityAndFuture: cleanText(src.realityAndFuture || "단기 결말은 현재 패턴의 연장선입니다. 대화 톤과 약속 이행률을 조정하면 2~6주 흐름은 충분히 바뀔 수 있습니다."),
    positionBreakdown,
    finalAdvice,
    advice,
  };
}

export function buildLoveConsultingHighlights(reading) {
  const src = reading && typeof reading === "object" ? reading : {};
  return [src.overallVibe, src.deepReading, src.realityAndFuture]
    .map((line) => cleanText(line))
    .filter(Boolean)
    .slice(0, 3);
}
