function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toUiCard(item) {
  return {
    cardId: item.cardId,
    name: item.name,
    nameKr: item.nameKr,
    nameKo: item.nameKo || item.nameKr || item.name,
    nameEn: item.nameEn || item.name,
    position: item.position,
    orientation: item.orientation,
    imageKey: item.imageKey,
    imageUrl: item.imageUrl,
    imageCandidates: item.imageCandidates,
    proxyImageUrl: item.proxyImageUrl,
    localImageUrl: item.localImageUrl,
    keywords: item.keywords,
  };
}

function normalizeGenericReadingPayload(payload) {
  const cardReadings = asArray(payload.cardReadings);
  return {
    story: payload.story,
    advice: payload.advice,
    cardNarratives: cardReadings.map((item) => ({
      cardId: item.cardId,
      position: item.position,
      interpretation: item.interpretation,
    })),
  };
}

function toText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

function buildConsultingHighlights(reading) {
  const priorityKeys = [
    "overallVibe",
    "deepReading",
    "realityAndFuture",
    "opening",
    "reunionOutcome",
    "lighthouseGuidance",
    "integrationMessage",
    "advice",
    "summary",
  ];

  const highlights = [];
  for (const key of priorityKeys) {
    const text = toText(reading?.[key]);
    if (!text) continue;
    highlights.push(text.replace(/\s+/g, " "));
    if (highlights.length >= 3) break;
  }
  return highlights;
}

const REUNION_BAD_PATTERNS = [
  /카드\(정방향\)/gi,
  /카드\(역방향\)/gi,
  /카드가\s*담은/gi,
  /카드가\s*보여주는/gi,
  /읽는\s*정확함/gi,
  /실전\s*읽는\s*정확함/gi,
  /포지션\s*핵심\s*의미/gi,
  /이번\s*리딩의\s*핵심은\s*재회\s*가능성\s*자체보다[^.。!?]*[.。!?]?/gi,
  /관계\s*상담\s*관점에서[^.。!?]*[.。!?]?/gi,
  /다섯\s*장의\s*카드가\s*재회의\s*실마리를[^.。!?]*[.。!?]?/gi,
];

function removeRepeatedSentences(text) {
  const sentences = String(text || "")
    .split(/(?<=[.!?。！？]|입니다\.|해요\.|세요\.|합니다\.)\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const sentence of sentences) {
    const normalized = sentence
      .replace(/\s+/g, " ")
      .replace(/[“”"']/g, "")
      .replace(/읽는\s*정확함/g, "해석 정확도")
      .trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(sentence);
  }
  return out.join(" ");
}

function cleanReunionText(value) {
  let out = String(value || "").trim();
  if (!out) return "";
  REUNION_BAD_PATTERNS.forEach((pattern) => {
    out = out.replace(pattern, "");
  });
  out = out.replace(/읽는\s*정확함/g, "해석 정확도");
  out = removeRepeatedSentences(out);
  return out.replace(/\s{2,}/g, " ").trim();
}

function reunionCardName(card) {
  return String(card?.nameKo || card?.nameKr || card?.nameEn || card?.name || "").trim() || "이름이 확인되지 않은 카드";
}

function reunionOrientationLabel(orientation) {
  return orientation === "reversed" ? "역방향" : "정방향";
}

function calculateReunionChance(cards) {
  let score = 50;
  const rules = [
    { ids: ["M06", "C02", "C06", "M20", "M17"], upright: 12, reversed: 4 },
    { ids: ["S10", "S03", "C05", "M16", "C08"], upright: -14, reversed: -6 },
    { ids: ["W11", "C11", "C12"], upright: 8, reversed: -2 },
    { ids: ["S02", "S04", "M12"], upright: -2, reversed: -5 },
    { ids: ["P13", "P14", "M14"], upright: 7, reversed: -4 },
  ];
  cards.forEach((card) => {
    const id = String(card?.cardId || "").toUpperCase();
    const reversed = card?.orientation === "reversed";
    rules.forEach((rule) => {
      if (!rule.ids.includes(id)) return;
      score += reversed ? rule.reversed : rule.upright;
    });
  });
  return Math.max(0, Math.min(100, Math.round(score)));
}

function reunionChanceLabel(score) {
  if (score >= 75) return "높음";
  if (score >= 58) return "조건부 높음";
  if (score >= 40) return "보통";
  return "낮음";
}

function normalizeReunionReading(reading, cards) {
  const src = reading && typeof reading === "object" ? reading : {};
  const safeCards = Array.isArray(cards) ? cards : [];
  const score = Number(src?.summary?.reunionChanceScore || calculateReunionChance(safeCards));
  const summary = {
    reunionChanceLabel: cleanReunionText(src?.summary?.reunionChanceLabel || reunionChanceLabel(score)),
    reunionChanceScore: Math.max(0, Math.min(100, Math.round(score))),
    partnerState: cleanReunionText(src?.summary?.partnerState || "관망 중"),
    bestContactTiming: cleanReunionText(src?.summary?.bestContactTiming || "자연스러운 계기 필요"),
    mainObstacle: cleanReunionText(src?.summary?.mainObstacle || "오해"),
    oneLineAdvice: cleanReunionText(src?.summary?.oneLineAdvice || "긴 고백보다 짧은 안부가 유리합니다."),
  };

  const titles = ["과거의 인연", "상대의 현재 근황", "주변의 방해물 또는 상황", "나를 향한 속마음", "재회의 가능성과 결과"];
  const fallbackTexts = [src.pastBond, src.theirNow, src.outsideFactor, src.theirHeart, src.reunionOutcome];
  const positions = (Array.isArray(src.positions) && src.positions.length ? src.positions : titles.map((positionTitle, idx) => ({
    positionTitle,
    detailedReading: fallbackTexts[idx] || "",
  }))).slice(0, 5).map((item, idx) => ({
    positionTitle: cleanReunionText(item?.positionTitle || titles[idx]),
    cardName: reunionCardName(safeCards[idx]),
    orientationLabel: reunionOrientationLabel(safeCards[idx]?.orientation),
    headline: cleanReunionText(item?.headline || ""),
    directAnswer: cleanReunionText(item?.directAnswer || item?.summary || ""),
    detailedReading: cleanReunionText(item?.detailedReading || item?.detail || ""),
    reunionPoint: cleanReunionText(item?.reunionPoint || item?.relationshipInsight || ""),
    advice: cleanReunionText(item?.advice || ""),
  }));

  const finalGuide = {
    shouldContactNow: cleanReunionText(src?.finalGuide?.shouldContactNow || "지금은 긴 감정 고백보다 짧은 안부가 적합합니다."),
    messageExample: cleanReunionText(src?.finalGuide?.messageExample || "요즘 문득 생각나서 짧게 안부 전하고 싶었어. 부담 갖지 않아도 괜찮아."),
    avoidThis: cleanReunionText(src?.finalGuide?.avoidThis || "답을 강요하는 질문은 피하세요."),
    nextSevenDays: cleanReunionText(src?.finalGuide?.nextSevenDays || "앞으로 7일은 과거 갈등을 한 문장으로 정리해 보세요."),
  };

  return {
    ...src,
    opening: cleanReunionText(src.opening || ""),
    summary,
    positions,
    finalGuide,
    pastBond: positions[0]?.detailedReading || "",
    theirNow: positions[1]?.detailedReading || "",
    outsideFactor: positions[2]?.detailedReading || "",
    theirHeart: positions[3]?.detailedReading || "",
    reunionOutcome: positions[4]?.detailedReading || "",
    lighthouseGuidance: cleanReunionText(src.lighthouseGuidance || finalGuide.nextSevenDays),
    actionPlan: (Array.isArray(src.actionPlan) ? src.actionPlan : [summary.oneLineAdvice, finalGuide.shouldContactNow, finalGuide.nextSevenDays])
      .map(cleanReunionText)
      .filter(Boolean),
  };
}

let cachedEngine = null;

export async function getTarotEngine() {
  if (cachedEngine) return cachedEngine;
  const mod = await import("../../../server/services/tarot-engine.service.js");
  cachedEngine = mod?.default || mod;
  return cachedEngine;
}

export function validateSpreadCardCount(spreadType, cards) {
  const expectedCountBySpread = {
    relationship_six_card: 6,
    healing_rising_four_card: 4,
    reunion_lighthouse_five_card: 5,
    yearly_twelve_card: 12,
    yearly_three_card: 3,
    self_esteem_levelup_five_card: 5,
    job_change_seven_card: 7,
    one_card: 1,
    three_card_past_present_future: 3,
    three_card_cause_process_outcome: 3,
  };

  const expected = expectedCountBySpread[spreadType];
  if (!expected) {
    return { ok: true };
  }

  if (!Array.isArray(cards) || cards.length !== expected) {
    return {
      ok: false,
      message: `${spreadType}은(는) ${expected}장의 카드가 필요합니다.`,
      expected,
    };
  }

  return { ok: true };
}

export function applyEngineQuality(engine, spreadType, reading, cardReadings) {
  try {
    const enhanced = engine.enhanceTarotReadingPayload({
      spreadType,
      reading,
      cardReadings,
    });
    return enhanced || reading;
  } catch (error) {
    console.error("[api/tarot] quality enhancer fallback:", error?.message || error);
    return reading;
  }
}

export function buildReadingResponse(engine, category, spreadType, drawnCards) {
  let result = null;
  const normalizedCategory = category || "general";

  if (spreadType === "relationship_six_card") {
    result = engine.createRelationshipReading({ drawnCards });
  } else if (spreadType === "healing_rising_four_card") {
    result = engine.createHealingRisingReading({ drawnCards });
  } else if (spreadType === "reunion_lighthouse_five_card") {
    result = engine.createReunionLighthouseReading({ drawnCards });
  } else if (spreadType === "yearly_twelve_card") {
    result = engine.createYearlyTwelveCardReading({ drawnCards });
  } else if (spreadType === "yearly_three_card") {
    result = engine.createYearlyFromThreeCardReading({ drawnCards });
  } else if (spreadType === "self_esteem_levelup_five_card") {
    result = engine.createSelfEsteemLevelupReading({ drawnCards });
  } else if (spreadType === "job_change_seven_card") {
    result = engine.createJobChangeTarotReading({ drawnCards });
  } else {
    result = engine.createReading({
      category: normalizedCategory,
      spreadType,
      drawnCards,
    });
  }

  const cardReadings = asArray(result?.cardReadings);
  const cards = cardReadings.map(toUiCard);
  const rawReading = result?.reading && typeof result.reading === "object"
    ? result.reading
    : normalizeGenericReadingPayload(asObject(result));
  const enhancedReading = applyEngineQuality(engine, spreadType, rawReading, cardReadings);
  const reading = spreadType === "reunion_lighthouse_five_card"
    ? normalizeReunionReading(enhancedReading, cards)
    : enhancedReading;
  const consultingHighlights = buildConsultingHighlights(reading);

  const payload = {
    ok: true,
    category: result?.category || normalizedCategory,
    spreadType: result?.spreadType || spreadType,
    cards,
    reading,
    consultingHighlights,
    engineMeta: {
      source: "server/services/tarot-engine.service.js",
      qualityEnhanced: reading !== rawReading,
      cardCount: cards.length,
      spreadType: result?.spreadType || spreadType,
    },
  };

  if (spreadType === "relationship_six_card") payload.isRelationshipReading = true;
  if (spreadType === "healing_rising_four_card") payload.isHealingReading = true;
  if (spreadType === "reunion_lighthouse_five_card") payload.isReunionReading = true;
  if (spreadType === "yearly_twelve_card") payload.isYearlyTwelveCardReading = true;
  if (spreadType === "yearly_three_card") payload.isYearlyThreeCardReading = true;
  if (spreadType === "self_esteem_levelup_five_card") payload.isSelfEsteemReading = true;
  if (spreadType === "job_change_seven_card") payload.isJobChangeReading = true;

  return payload;
}
