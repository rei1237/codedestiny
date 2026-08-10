import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "./tarot-cards.mjs";
import { analyzeTarotCombinations } from "./tarot-combination-engine.mjs";
import { expectedCardCount, getSpreadDefinition, normalizeSpreadType } from "./spreads.mjs";
import { SUN_RECOVERY_CARD_COPY } from "./sun-recovery-card-copy.mjs";

const TAROT_INTERPRETATION_TEXT_TRANSLATIONS = {
  ko: {
    "tarotInterpretation.title.001": "선택지 정리 연습",
    "tarotInterpretation.title.002": "불안 확인 연습",
    "tarotInterpretation.title.003": "현실 기준 회복 연습",
    "tarotInterpretation.label.001": "연애",
    "tarotInterpretation.label.002": "관계",
    "tarotInterpretation.label.003": "재회",
    "tarotInterpretation.label.004": "상대의 속마음",
    "tarotInterpretation.label.005": "현재 마음",
    "tarotInterpretation.label.006": "가까운 흐름",
    "tarotInterpretation.label.007": "진로와 일",
    "tarotInterpretation.label.008": "금전",
    "tarotInterpretation.label.009": "오늘",
    "tarotInterpretation.label.010": "힐링",
    "tarotInterpretation.label.011": "연간운",
    "tarotInterpretation.label.012": "자기 기준",
    "tarotInterpretation.label.013": "종합",
    "tarotInterpretation.label.014": "내가 바라보는 상대",
    "tarotInterpretation.label.015": "상대가 관계 전체를 보는 시각",
    "tarotInterpretation.label.016": "상대가 나를 바라보는 마음",
    "tarotInterpretation.label.017": "상대의 연애 의지와 열망",
    "tarotInterpretation.label.018": "관계를 가로막는 핵심 요인",
    "tarotInterpretation.label.019": "가까운 흐름과 선택 기준",
    "tarotInterpretation.label.020": "컵(물)",
    "tarotInterpretation.label.021": "완드(불)",
    "tarotInterpretation.label.022": "소드(바람)",
    "tarotInterpretation.label.023": "펜타클(흙)",
    "tarotInterpretation.label.024": "메이저 아르카나",
    "tarotInterpretation.label.025": "혼합 슈트",
    "tarotInterpretation.title.004": "아직 남아 있는 마음",
    "tarotInterpretation.title.005": "상대가 보이는 마음의 결",
    "tarotInterpretation.title.006": "연락이 멈춘 현실 신호",
    "tarotInterpretation.title.007": "다시 닿을 수 있는 거리",
    "tarotInterpretation.title.008": "관계 회복의 조건과 기준",
  },
};

function tarotInterpretationText(key) {
  return TAROT_INTERPRETATION_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

class TarotInterpretationError extends Error {
  constructor(code, message, userMessage, meta = {}) {
    super(message);
    this.name = "TarotInterpretationError";
    this.code = code;
    this.userMessage = userMessage || "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    this.meta = meta;
  }
}

function asText(value) {
  return String(value || "").trim();
}

function normalizeOrientation(value) {
  return value === "reversed" ? "reversed" : "upright";
}

function relationshipSuitSignals(suit, orientation) {
  const reversed = orientation === "reversed";
  if (suit === "cups") {
    return reversed
      ? {
        attractionSignal: "감정은 존재하지만 표현의 타이밍이 어긋나 오해를 낳기 쉽습니다.",
        fearSignal: "감정 노출 뒤 상처받을 가능성을 크게 경계합니다.",
        communicationPattern: "직접적 고백보다 우회적 반응과 침묵이 늘어나는 패턴입니다.",
        commitmentSignal: "정서적 확신이 생기기 전까지 관계 정의를 미루려는 경향이 강합니다.",
      }
      : {
        attractionSignal: "정서적 끌림과 호감이 비교적 분명하게 드러납니다.",
        fearSignal: "감정이 커질수록 상호 기대치 불일치를 두려워합니다.",
        communicationPattern: "감정 공유형 대화에서 진심이 빠르게 드러나는 패턴입니다.",
        commitmentSignal: "감정 교류가 안정되면 관계를 관계답게 정의하려는 힘이 생깁니다.",
      };
  }
  if (suit === "wands") {
    return reversed
      ? {
        attractionSignal: "순간적 끌림은 강하지만 속도 조절 실패로 피로가 누적되기 쉽습니다.",
        fearSignal: "관계가 통제 불가로 번질 것을 경계해 갑자기 거리를 둘 수 있습니다.",
        communicationPattern: "반응은 빠르지만 톤이 들쭉날쭉해 안정감을 해칩니다.",
        commitmentSignal: "열정 대비 책임감이 늦게 따라오는 구조라 정의를 망설일 수 있습니다.",
      }
      : {
        attractionSignal: "끌림, 욕망, 추진력이 살아 있어 관계의 불씨가 강합니다.",
        fearSignal: "속도 불균형으로 한쪽이 압박을 느끼는 상황을 두려워합니다.",
        communicationPattern: "빠른 연락과 행동 제안이 관계를 밀어붙이는 패턴입니다.",
        commitmentSignal: "감정이 확인되면 단기간에 관계를 진전시키려는 경향이 강합니다.",
      };
  }
  if (suit === "swords") {
    return reversed
      ? {
        attractionSignal: "감정보다 판단이 앞서 마음 표현이 차갑게 전달되기 쉽습니다.",
        fearSignal: "말 한마디의 오해와 해석 충돌을 크게 경계합니다.",
        communicationPattern: "명확히 말하고 싶지만 부담 때문에 결론을 흐리는 패턴입니다.",
        commitmentSignal: "정의 이전에 기준 합의를 우선시하며 결정을 지연시킬 수 있습니다.",
      }
      : {
        attractionSignal: "감정은 통제하지만 판단 기준이 서면 빠르게 결론으로 갑니다.",
        fearSignal: "비효율적인 감정 소모를 피하려는 방어가 강합니다.",
        communicationPattern: "질문과 검증 중심 대화가 많고 감정어는 적은 패턴입니다.",
        commitmentSignal: "논리적 확신이 생기면 실행 속도가 빨라지는 타입입니다.",
      };
  }
  if (suit === "pentacles") {
    return reversed
      ? {
        attractionSignal: "호감은 있어도 현실 우선순위 충돌로 관계 투자 비율이 흔들립니다.",
        fearSignal: "시간·책임·생활 리듬이 깨질 가능성을 두려워합니다.",
        communicationPattern: "감정보다 일정·상황 설명이 길어지는 패턴입니다.",
        commitmentSignal: "현실 기반이 정리되기 전까지 관계 확정을 유보하기 쉽습니다.",
      }
      : {
        attractionSignal: "안정감과 신뢰 기반의 끌림이 꾸준히 축적됩니다.",
        fearSignal: "약속 이행률이 흔들리면 감정이 빠르게 식을 수 있습니다.",
        communicationPattern: "행동과 책임으로 마음을 증명하려는 패턴입니다.",
        commitmentSignal: "지속 가능성이 보이면 관계를 현실적으로 고정하려는 힘이 큽니다.",
      };
  }
  return reversed
    ? {
      attractionSignal: "강한 끌림이 있지만 방향성 정리가 늦어 변동성이 큽니다.",
      fearSignal: "운명적 압력을 느끼면서도 통제 상실을 두려워합니다.",
      communicationPattern: "중요한 말을 미루거나 상징적으로 돌려 말하는 패턴입니다.",
      commitmentSignal: "전환의 필요성은 알지만 결정은 지연되기 쉽습니다.",
    }
    : {
      attractionSignal: "관계의 큰 전환을 일으킬 수 있는 강한 테마가 작동합니다.",
      fearSignal: "중요한 선택이 관계 구조를 바꿀 수 있다는 부담을 느낍니다.",
      communicationPattern: "상대의 작은 신호를 큰 의미로 읽는 경향이 강해집니다.",
      commitmentSignal: "관계의 이름과 방향을 정해야 한다는 압력이 커집니다.",
    };
}

function parseRelationshipCardMeta(card) {
  const code = asText(card?.code || card?.cardCode || card?.cardId).toUpperCase();
  const suitCode = code.slice(0, 1);
  const rank = Number(code.slice(1));
  const isMajor = suitCode === "M";
  const suit = isMajor
    ? "major"
    : ({ C: "cups", W: "wands", S: "swords", P: "pentacles" }[suitCode] || "minor");
  const isCourt = !isMajor && rank >= 11 && rank <= 14;
  return { code, suit, rank, isMajor, isCourt };
}

function getRelationshipCardMeaning(card, orientation, positionKey) {
  const meta = parseRelationshipCardMeta(card);
  const signals = relationshipSuitSignals(meta.suit, orientation);
  const direction = orientation === "reversed" ? "역방향" : "정방향";
  const name = asText(card?.nameKo || card?.nameEn || "카드");
  const rankHint = Number.isFinite(meta.rank) ? `랭크 ${meta.rank}` : "랭크 미상";
  const positionHint = asText(positionKey) || "관계 포지션";
  const shadow = orientation === "reversed"
    ? "지연, 왜곡, 회피, 내면화된 불안이 관계 판단을 흐릴 수 있습니다."
    : "표현 에너지가 직접적이어서 관계 속도를 올리지만, 조율 없는 가속은 충돌을 낳을 수 있습니다.";
  const advice = orientation === "reversed"
    ? "감정 결론을 미루고 오해를 줄이는 짧은 사실 대화를 먼저 실행하세요."
    : "호감 신호를 확인했더라도 속도와 경계선을 동시에 합의하세요.";

  return {
    core: `${name} ${direction}은 ${positionHint}에서 ${signals.attractionSignal}`,
    attractionSignal: signals.attractionSignal,
    fearSignal: signals.fearSignal,
    communicationPattern: signals.communicationPattern,
    commitmentSignal: signals.commitmentSignal,
    shadow,
    advice,
    keywords: uniqueKeywordList(card?.keywords || [], [meta.suit, direction, rankHint]).slice(0, 6),
  };
}

const REUNION_FAMILY_QUESTION_TYPES = new Set(["reunion", "exMind", "currentMind"]);

function getMeaningByQuestion(card, orientation, questionType) {
  const meaning = orientation === "reversed" ? card.reversed : card.upright;
  const relationshipSeed = questionType === "relationship"
    ? getRelationshipCardMeaning(card, orientation, "relationship")
    : null;
  const hasRelationship = Array.isArray(meaning.relationship) && meaning.relationship.length;
  const key = questionType === "relationship"
    ? (hasRelationship ? "relationship" : (questionType && meaning[questionType] ? questionType : "general"))
    : (questionType && meaning[questionType] ? questionType : "general");
  const line = Array.isArray(meaning[key]) && meaning[key].length
    ? meaning[key][0]
    : (Array.isArray(meaning.general) && meaning.general[0])
      || relationshipSeed?.core
      || "카드의 핵심 메시지를 더 자세히 읽어야 합니다.";
  // 재회 전용으로 쓰인 조언이 공용 advice 자리에 있으면 재물운·직장운 답변까지 따라 들어간다.
  // 재회 계열 질문일 때만 꺼내 쓰고, 나머지 주제는 일반 조언으로 돌아간다.
  const scopedAdvice = REUNION_FAMILY_QUESTION_TYPES.has(questionType)
    && Array.isArray(meaning.reunionAdvice) && meaning.reunionAdvice.length
    ? meaning.reunionAdvice[0]
    : "";
  const advice = scopedAdvice
    || (Array.isArray(meaning.advice) && meaning.advice[0])
    || relationshipSeed?.advice
    || "조금 더 구체적인 흐름을 살펴보세요.";
  const core = (Array.isArray(meaning.core) && meaning.core[0])
    || relationshipSeed?.core
    || "핵심 메시지를 다시 확인하세요.";
  const keywords = Array.isArray(meaning.keywords) && meaning.keywords.length
    ? meaning.keywords.slice(0, 5)
    : (relationshipSeed?.keywords || card.keywords.slice(0, 5));
  return {
    line,
    advice,
    core,
    keywords,
    coreMeaning: asText(meaning.coreMeaning) || core,
    psychologicalMeaning: asText(meaning.psychologicalMeaning) || relationshipSeed?.communicationPattern || core,
    selfEsteemMeaning: asText(meaning.selfEsteemMeaning) || line,
    shadow: asText(meaning.shadowNote || meaning.shadowText) || relationshipSeed?.shadow,
    relationship: relationshipSeed,
  };
}

function removeRepeatedTarotPhrases(text) {
  const source = asText(text);
  if (!source) return "";
  const seen = new Set();
  const unique = [];
  sentenceSplit(source).forEach((line) => {
    const next = line.replace(/\s+/g, " ").trim();
    if (!next || seen.has(next)) return;
    seen.add(next);
    unique.push(next);
  });
  return unique.join(" ");
}

function pickMeaningLines(meaning, key) {
  const source = meaning && Array.isArray(meaning[key]) ? meaning[key] : [];
  return source.map((line) => asText(line)).filter(Boolean);
}

function uniqueKeywordList(...lists) {
  const merged = [];
  lists.forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((item) => {
      const text = asText(item);
      if (text) merged.push(text);
    });
  });
  return Array.from(new Set(merged)).slice(0, 6);
}

function ensureCardMeaningIncluded(section) {
  const safe = section && typeof section === "object" ? { ...section } : {};
  const keywords = uniqueKeywordList(safe.keywords, safe.mainCardKeywords, safe.zodiacKeywords);
  const targetFields = ["overall", "zodiacReading", "triadReading", "love", "moneyWork", "healthMind", "opportunity", "caution", "advice"];

  targetFields.forEach((field) => {
    const text = asText(safe[field]);
    if (!text) return;
    safe[field] = removeRepeatedTarotPhrases(text);
  });

  safe.keywords = keywords;
  return safe;
}

function validateMonthlyTarotDiversity(months) {
  const safeMonths = Array.isArray(months) ? months : [];
  const failures = [];
  const sentenceIndex = new Map();
  const adviceIndex = new Map();

  safeMonths.forEach((month, idx) => {
    const merged = [month?.overall, month?.zodiacReading, month?.triadReading, month?.love, month?.moneyWork, month?.healthMind, month?.opportunity, month?.caution, month?.advice]
      .map((value) => asText(value))
      .filter(Boolean)
      .join(" ");

    sentenceSplit(merged).forEach((line) => {
      const normalized = line.replace(/[“”"']/g, "").replace(/\s+/g, " ").trim();
      if (normalized.length < 20) return;
      if (!sentenceIndex.has(normalized)) sentenceIndex.set(normalized, []);
      sentenceIndex.get(normalized).push(idx + 1);
    });

    const advice = asText(month?.advice);
    if (advice) {
      const normalizedAdvice = advice.replace(/\s+/g, " ").trim();
      if (!adviceIndex.has(normalizedAdvice)) adviceIndex.set(normalizedAdvice, []);
      adviceIndex.get(normalizedAdvice).push(idx + 1);
    }

    if (uniqueKeywordList(month?.keywords, month?.mainCardKeywords).length < 3) {
      failures.push(`month_${idx + 1}_keyword_insufficient`);
    }
    if (!asText(month?.triadReading)) failures.push(`month_${idx + 1}_triad_missing`);
    if (!asText(month?.zodiacReading)) failures.push(`month_${idx + 1}_zodiac_missing`);
  });

  sentenceIndex.forEach((indexes) => {
    if (indexes.length > 1) failures.push(`repeated_sentence_${indexes.join("_")}`);
  });
  adviceIndex.forEach((indexes) => {
    if (indexes.length > 2) failures.push(`repeated_advice_${indexes.join("_")}`);
  });

  return {
    ok: failures.length === 0,
    failures,
  };
}

function buildAnnualTarotSummary(months) {
  const safeMonths = Array.isArray(months) ? months : [];
  const suitCounts = { major: 0, wands: 0, cups: 0, swords: 0, pentacles: 0 };
  const rankCounts = new Map();
  const courtCounts = new Map();
  let reversedCount = 0;
  const majorCards = [];

  safeMonths.forEach((month) => {
    const card = month?.mainCard || {};
    const suit = asText(card.suit).toLowerCase();
    if (suitCounts[suit] !== undefined) suitCounts[suit] += 1;
    else suitCounts.major += Number(asText(card.arcana).toLowerCase() === "major");
    if (card.orientation === "reversed") reversedCount += 1;

    const rankKey = asText(card.number || card.rank || card.cardNumber || card.cardId);
    if (rankKey) rankCounts.set(rankKey, (rankCounts.get(rankKey) || 0) + 1);
    const cardName = asText(card.nameKo || card.cardNameKo);
    if ((suit === "major" || asText(card.arcana).toLowerCase() === "major") && cardName) {
      majorCards.push(cardName);
    }
    if (/(페이지|나이트|퀸|킹)/.test(cardName)) {
      courtCounts.set(cardName, (courtCounts.get(cardName) || 0) + 1);
    }
  });

  const dominantSuit = Object.entries(suitCounts)
    .filter(([key]) => key !== "major")
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "major";
  const dominantSuitLabel = {
    major: "메이저",
    wands: "완드",
    cups: "컵",
    swords: "소드",
    pentacles: "펜타클",
  }[dominantSuit] || "메이저";

  const majorCount = suitCounts.major;
  const reversedRatio = safeMonths.length ? Math.round((reversedCount / safeMonths.length) * 100) : 0;
  const majorRatio = safeMonths.length ? Math.round((majorCount / safeMonths.length) * 100) : 0;
  const repeatedRanks = Array.from(rankCounts.entries()).filter(([, count]) => count >= 2).map(([rank, count]) => `${rank}×${count}`);
  const repeatedCourts = Array.from(courtCounts.entries()).filter(([, count]) => count >= 2).map(([name, count]) => `${name}×${count}`);

  const bestMonth = safeMonths.reduce((best, month) => {
    if (!month) return best;
    const card = month.mainCard || {};
    const score = (card.orientation === "reversed" ? -1 : 2)
      + (asText(card.arcana).toLowerCase() === "major" ? 2 : 0)
      + (Array.isArray(month.keywords) ? month.keywords.length : 0)
      + (/(용|태양|별|세계|심판)/.test(asText(card.nameKo || card.cardNameKo)) ? 1 : 0);
    if (!best || score > best.score) return { month, score };
    return best;
  }, null)?.month || null;

  const cautionMonth = safeMonths.reduce((worst, month) => {
    if (!month) return worst;
    const card = month.mainCard || {};
    const score = (card.orientation === "reversed" ? 0 : 1)
      + (asText(card.arcana).toLowerCase() === "major" ? 1 : 0)
      + (Array.isArray(month.keywords) ? Math.max(0, month.keywords.length - 1) : 0)
      + (/(달|탑|악마|소드|절제)/.test(asText(card.nameKo || card.cardNameKo)) ? -1 : 0);
    if (!worst || score < worst.score) return { month, score };
    return worst;
  }, null)?.month || null;

  const firstQuarter = safeMonths.slice(0, 3).map((month) => month?.mainCard?.nameKo || month?.mainCard?.cardNameKo).filter(Boolean).join(" → ");
  const secondQuarter = safeMonths.slice(3, 6).map((month) => month?.zodiacAnimal || month?.monthLabel).filter(Boolean).join(" · ");
  const thirdQuarter = safeMonths.slice(6, 9).map((month) => month?.mainCard?.nameKo || month?.mainCard?.cardNameKo).filter(Boolean).join(" → ");
  const fourthQuarter = safeMonths.slice(9, 12).map((month) => month?.zodiacAnimal || month?.monthLabel).filter(Boolean).join(" · ");
  const topKeywords = uniqueKeywordList(...safeMonths.map((month) => month?.keywords || [])).slice(0, 6);
  const transitionMonth = safeMonths[6] || safeMonths[5] || null;
  const majorPair = majorCards.slice(0, 2).join(" + ");
  const dominantSuitMeaning = yearlyDominantSuitMeaning(dominantSuit);
  const bestReason = bestMonth ? yearlyMonthReason(bestMonth) : "실행 가능한 선택이 가장 또렷해지는 달";
  const cautionReason = cautionMonth ? yearlyMonthReason(cautionMonth) : "속도보다 점검이 필요한 달";
  const transitionLabel = transitionMonth?.monthLabel || (transitionMonth?.month ? `${transitionMonth.month}월` : "7월");

  const overallFlow = removeRepeatedTarotPhrases([
    `상반기는 ${firstQuarter || "초반 카드 흐름"} 순서로 기준을 세우고, ${secondQuarter || "중반 십이지신"}의 달에서 생활 리듬을 조율합니다.`,
    `하반기는 ${thirdQuarter || "후반 카드 흐름"}을 지나 ${fourthQuarter || "마무리 십이지신"}의 결로 한 해의 선택을 현실에 남깁니다.`,
  ].join(" "));

  const annualAdvice = removeRepeatedTarotPhrases([
    bestMonth ? `${bestMonth.monthLabel || `${bestMonth.month}월`}에는 ${bestReason}을 한 가지 행동으로 옮기세요.` : "기회가 또렷한 달에는 가장 현실적인 선택을 먼저 실행하세요.",
    cautionMonth ? `${cautionMonth.monthLabel || `${cautionMonth.month}월`}에는 ${cautionReason} 때문에 결정을 작게 나누는 편이 안정됩니다.` : "흐트러지는 달에는 결정을 작게 나누는 편이 안정됩니다.",
  ].join(" "));

  const summary = removeRepeatedTarotPhrases([
    `올해는 ${dominantSuitLabel} 슈트가 우세해 ${dominantSuitMeaning} ${reversedCount}개월의 역방향은 멈춤이 아니라 달마다 선택 기준을 다시 고르라는 신호로 작동합니다.`,
    `상반기는 ${firstQuarter || "초반 카드"} 흐름으로 시작해 ${transitionLabel}에서 방향이 바뀌고, 하반기는 ${thirdQuarter || "후반 카드"}의 결을 현실로 옮기는 쪽으로 전개됩니다.`,
    bestMonth ? `${bestMonth.monthLabel || `${bestMonth.month}월`}은 ${bestReason} 때문에 가장 또렷한 문이 열립니다.` : "",
    cautionMonth ? `${cautionMonth.monthLabel || `${cautionMonth.month}월`}은 ${cautionReason} 때문에 속도를 낮춰야 합니다.` : "",
    majorPair ? `${majorPair} 조합은 오래된 방식과 새 선택이 맞물리는 인생 단위 전환을 요구합니다.` : "",
  ].filter(Boolean).join(" "));

  return {
    summary,
    overallFlow,
    annualAdvice,
    dominantSuit: dominantSuitLabel,
    majorRatio,
    reversedRatio,
    repeatedRanks,
    repeatedCourts,
    bestMonth,
    cautionMonth,
    topKeywords,
    majorCount,
    reversedCount,
    suitCounts,
    rxMonthCount: reversedCount,
    peakMonth: bestMonth,
    majorPair,
    storyArc: overallFlow,
  };
}

const FORBIDDEN_QUALITY_PHRASES = [
  "지금 이 자리에서 이미 회복 가능한 힘이 작동하고 있음이 드러납니다.",
  "지금 이 자리에서 멈춰 서서 내 패턴을 재정비하라는 신호입니다.",
  "현재 에너지를 현실 행동으로 연결할 수 있는 타이밍을 비춥니다.",
  "겉으로는 버티지만 내면에서는 리듬을 잃기 쉬운 구간이 드러납니다.",
  "겉으로는 괜찮아 보여도 내면에서는 자기검열과 긴장이 늘어납니다.",
  "완벽한 반응을 만드는 것이 아니라, 나를 지키는 기준을 먼저 세웁니다.",
  "자존감은 큰 결심보다 작은 자기승인 행동이 반복될 때 안정됩니다.",
  "오늘 단 한 번은 나를 지키는 기준을 먼저 말하고 필요한 설명만 짧게 덧붙여 보세요.",
  "지금은 작게 시작해 반복하는 방식이 가장 강합니다.",
  "타인의 반응을 예측하지 말고 내 감정을 먼저 한 문장으로 말해 보세요.",
  "오늘 가능한 실행 단위를 작게 설정하고 끝까지 완료하세요.",
  "작은 실천을 꾸준히 이어가다 보면 자신에 대한 믿음이 조금씩 회복됩니다.",
  "지금 감정은 작은 결정 하나로 방향을 잡을 수 있습니다.",
  "반응을 늦추고 사실을 재확인하면 과잉 해석을 줄일 수 있습니다.",
  "마음 회복의 관점에서는 타인의 반응과 내 가치를 분리해 기준을 세우는 연습이 핵심입니다.",
  "좋은 흐름일수록 타인의 기대까지 한 번에 책임지려는 과부하를 경계해야 합니다.",
  "상대 반응을 예측하며 스스로를 먼저 낮추는 패턴이 반복될 수 있습니다.",
  "조심할 마음의 결론",
  "반복 신호",
  "흔들리는 지점",
  "회복 방향",
];

const MONTHLY_ZODIAC_FLOW = [
  { month: 1, animal: "쥐", emoji: "🐭", theme: "시작, 눈치, 기회 포착, 생존 감각" },
  { month: 2, animal: "소", emoji: "🐮", theme: "축적, 인내, 현실 기반, 느린 성장" },
  { month: 3, animal: "호랑이", emoji: "🐯", theme: "돌파, 용기, 경쟁, 자기표현" },
  { month: 4, animal: "토끼", emoji: "🐰", theme: "관계 조율, 감수성, 회복, 섬세한 선택" },
  { month: 5, animal: "용", emoji: "🐉", theme: "상승운, 확장, 명예, 큰 기회" },
  { month: 6, animal: "뱀", emoji: "🐍", theme: "통찰, 숨은 변수, 전략, 내면 변화" },
  { month: 7, animal: "말", emoji: "🐴", theme: "이동, 속도, 활동성, 외부 확장" },
  { month: 8, animal: "양", emoji: "🐑", theme: "평온, 협력, 감정 회복, 생활 안정" },
  { month: 9, animal: "원숭이", emoji: "🐵", theme: "기지, 전환, 실험, 새로운 방법" },
  { month: 10, animal: "닭", emoji: "🐔", theme: "정리, 판단, 루틴, 결과 확인" },
  { month: 11, animal: "개", emoji: "🐶", theme: "신뢰, 약속, 보호, 인간관계 검증" },
  { month: 12, animal: "돼지", emoji: "🐷", theme: "마무리, 풍요, 회복, 다음 주기 준비" },
];

const POSITION_SELF_ESTEEM_CONTEXT = {
  past_debuff: {
    order: 1,
    icon: "🌑",
    title: "내 기준이 흐려지기 시작한 자리",
    question: "타인의 표정과 평가가 내 기준보다 먼저 떠오르게 된 흐름은 무엇인가?",
    focus: ["표정 감지", "분위기 파악", "인정 욕구", "관계 유지"],
    keywords: ["눈치", "표정", "분위기", "인정욕구", "생존전략"],
  },
  inner_monster: {
    order: 2,
    icon: "👁",
    title: "거절 앞에서 마음이 작아지는 이유",
    question: "거절 앞에서 어떤 상실감과 죄책감이 먼저 올라오는가?",
    focus: ["상실 두려움", "실망 공포", "죄책감", "경계 약화"],
    keywords: ["거절", "실망", "죄책감", "상실", "경계"],
  },
  current_damage: {
    order: 3,
    icon: "⚡",
    title: "타인의 시선이 지금 마음을 소모시키는 지점",
    question: "눈치 패턴이 내 감정, 몸, 관계에서 어디를 가장 소모시키는가?",
    focus: ["과잉 시뮬레이션", "자기검열", "피로 누적", "욕구 억압"],
    keywords: ["과잉분석", "자기검열", "피로", "분노억압", "선택력"],
  },
  mind_shield: {
    order: 4,
    icon: "🛡",
    title: "실망을 두려워하지 않고 나를 지키는 말",
    question: "상대의 감정과 내 책임을 분리하려면 어떤 말을 지켜야 하는가?",
    focus: ["감정 분리", "설명 최소화", "경계 유지", "미안함 감내"],
    keywords: ["경계", "분리", "설명", "기준", "실망"],
  },
  levelup_mastery: {
    order: 5,
    icon: "✨",
    title: "오늘 다시 붙잡을 나의 기준",
    question: "오늘 내 마음을 다시 먼저 확인하려면 무엇부터 할 수 있는가?",
    focus: ["감정 우선 확인", "기준 기록", "자기신뢰", "독립감"],
    keywords: ["자기승인", "기준", "자기신뢰", "독립감", "회복"],
  },
};

function normalizeLength(text, minimumLength) {
  const source = asText(text);
  if (source.length >= minimumLength) return source;
  return source;
}

function dedupeSentences(text) {
  const source = asText(text);
  if (!source) return "";
  const parts = source
    .split(/(?<=[.!?。！？]|니다\.|요\.)\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const seen = new Set();
  const unique = [];
  parts.forEach((line) => {
    if (seen.has(line)) return;
    seen.add(line);
    unique.push(line);
  });
  return unique.join(" ");
}

function orientationLabel(orientation) {
  return orientation === "reversed" ? "역방향" : "정방향";
}

function pickKeywords(meaning, fallback = []) {
  const source = Array.isArray(meaning?.keywords) && meaning.keywords.length
    ? meaning.keywords
    : fallback;
  return source.slice(0, 3);
}

function removeRepeatedSelfEsteemPhrases(text) {
  let next = asText(text);
  if (!next) return "";
  FORBIDDEN_QUALITY_PHRASES.forEach((phrase) => {
    next = next.split(phrase).join("");
  });
  return dedupeSentences(next).replace(/\s{2,}/g, " ").trim();
}

function cleanSelfEsteemFragment(text) {
  return removeRepeatedSelfEsteemPhrases(asText(text))
    .replace(/^(현재 자존감 패턴 요약|가장 깊은 원인|가장 크게 소모되는 영역|회복의 첫 번째 열쇠|장기적으로 세워야 할 자기 기준|가장 주의할 자동 사고|조심할 마음의 결론|오늘의 연습 문장|심리 패턴 분석|자존감 영향|내 마음에 남기는 영향|회복 관점|회복 방향|주의할 점)\s*:\s*/u, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .trim();
}

function formatSelfEsteemPipe(parts = []) {
  return parts
    .map((part) => cleanSelfEsteemFragment(part))
    .filter(Boolean)
    .join(" | ");
}

function removeSelfEsteemPipes(text) {
  return asText(text).replace(/\|/g, " · ");
}

function normalizeSelfEsteemText(text) {
  return removeRepeatedSelfEsteemPhrases(removeSelfEsteemPipes(text))
    .replace(/자동 사고/g, "마음의 결론")
    .replace(/상처의 패턴/g, "반복 신호")
    .replace(/무너지는 지점/g, "흔들리는 지점")
    .replace(/회복 처방/g, "회복 방향")
    .replace(/자존감 레벨업 타로/g, "자기 기준 회복 타로")
    .replace(/퀘스트/g, "연습")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sentenceSplitSelfEsteem(text) {
  return asText(text)
    .split(/(?<=[.!?。！？]|니다\.|요\.|다\.)\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function selfEsteemDisplayName(card, context) {
  return asText(card?.nameKo || card?.nameKr || card?.nameEn || card?.name || context?.title || "카드");
}

function parseSelfEsteemCardMeta(card) {
  const code = asText(card?.code || card?.cardCode || card?.cardId || card?.id).toUpperCase();
  const suitCode = code.slice(0, 1);
  const rankRaw = Number.parseInt(code.slice(1), 10);
  const isMajor = suitCode === "M";
  const suit = isMajor ? "major" : ({ C: "cups", W: "wands", S: "swords", P: "pentacles" }[suitCode] || "minor");
  const isCourt = !isMajor && Number.isFinite(rankRaw) && rankRaw >= 11 && rankRaw <= 14;
  const courtLabel = isCourt ? ({ 11: "Page", 12: "Knight", 13: "Queen", 14: "King" }[rankRaw] || "Court") : "";
  return {
    code,
    suit,
    rank: Number.isFinite(rankRaw) ? rankRaw : 0,
    isMajor,
    isCourt,
    courtLabel,
    cardName: selfEsteemDisplayName(card, null),
  };
}

function selfEsteemSuitLabel(meta) {
  if (!meta) return "카드";
  if (meta.isMajor) return "메이저";
  return ({ cups: "컵", swords: "소드", wands: "완드", pentacles: "펜타클" }[meta.suit] || "카드");
}

function selfEsteemSuitPsychology(meta, orientation) {
  const reversed = orientation === "reversed";
  if (meta.isMajor) {
    return reversed
      ? "오래된 인생 패턴이 뒤집히지 않은 채 자동 반응으로 남아 있는 상태입니다."
      : "오래된 심리 구조가 의식 위로 올라와 인생 패턴 전체를 드러내는 상태입니다.";
  }
  if (meta.suit === "cups") {
    return reversed
      ? "감정 의존과 인정 욕구가 막히거나 과해져 관계 온도에 더 민감해진 상태입니다."
      : "감정 의존과 인정 욕구가 분명하게 드러나며, 관계 분위기에 매우 민감한 상태입니다.";
  }
  if (meta.suit === "pentacles") {
    return reversed
      ? "안정감과 생활 기반이 흔들리면서 쓸모와 가치가 연결되어 보이는 상태입니다."
      : "안정감, 현실 조건, 생활 기반을 통해 자기를 확인하려는 경향이 살아 있는 상태입니다.";
  }
  if (meta.suit === "swords") {
    return reversed
      ? "생각 과잉과 자기검열이 강해져 상대 반응을 미리 결론짓는 마음이 커진 상태입니다."
      : "생각 과잉과 눈치 계산이 의식적으로 드러나며, 말하기 전 검증 욕구가 강한 상태입니다.";
  }
  return reversed
    ? "행동 욕구와 분노가 막히거나 왜곡되어, 반응을 참다가 한꺼번에 소모되는 상태입니다."
    : "행동 욕구와 인정받고 싶은 열정이 분명하게 살아 있는 상태입니다.";
}

function selfEsteemCourtPsychology(meta, orientation) {
  if (!meta.isCourt) return "";
  const reversed = orientation === "reversed";
  if (meta.courtLabel === "Page") {
    return reversed
      ? "미숙한 자기표현이 평가받는 두려움과 만나, 말하기 전부터 스스로를 낮추기 쉬운 시기입니다."
      : "미숙하지만 솔직한 자기표현이 시작되는 시기라, 평가에 예민하면서도 배우려는 힘이 있습니다.";
  }
  if (meta.courtLabel === "Knight") {
    return reversed
      ? "감정이나 행동이 앞서 달리다 조절 없이 소진되기 쉬운 시기입니다."
      : "감정이나 행동이 빠르게 움직이며 인정받고 싶은 마음이 먼저 몸을 움직이는 시기입니다.";
  }
  if (meta.courtLabel === "Queen") {
    return reversed
      ? "돌봄과 수용이 과해져 내 감정보다 타인 감정 관리가 앞서는 시기입니다."
      : "돌봄과 수용의 힘이 살아 있어, 마음의 온도를 섬세하게 다루는 시기입니다.";
  }
  if (meta.courtLabel === "King") {
    return reversed
      ? "통제와 책임감이 경직되어 나까지 몰아세우는 방식으로 굳기 쉬운 시기입니다."
      : "통제와 기준, 책임감이 분명해져 나를 지키는 규칙을 만들기 좋은 시기입니다.";
  }
  return "";
}

function selfEsteemTransitionNote(previousSection, nextSection) {
  const pieces = [];
  if (previousSection?.positionTitle) {
    pieces.push(`이전 단계의 ${previousSection.positionTitle}가 현재 패턴의 시작점을 비춥니다.`);
  }
  if (nextSection?.positionTitle) {
    pieces.push(`다음 단계의 ${nextSection.positionTitle}가 이 문제를 어디로 풀어갈지 이어 줍니다.`);
  }
  return pieces.join(" ");
}

function selfEsteemCleanSentence(text, fallback) {
  return normalizeSelfEsteemText(text || fallback || "");
}

function selfEsteemMakeUniqueAction(contextKey, baseAction) {
  const map = {
    past_debuff: "오늘은 내 감정보다 상대 표정을 먼저 읽는 순간을 한 번 적어 보세요.",
    inner_monster: "오늘은 거절이 필요할 때 바로 답하지 않고, 한 문장만 남긴 뒤 멈춰 보세요.",
    current_damage: "오늘은 답장과 결정을 미루기 전에 사실과 추측을 한 줄씩 나눠 적어 보세요.",
    mind_shield: "오늘은 상대가 실망해도 설명을 두 문장 안에서 끝내고 결정을 바꾸지 마세요.",
    levelup_mastery: "오늘은 내가 지킨 기준 하나를 적고, 그것을 스스로의 성취로 인정해 보세요.",
  };
  return selfEsteemCleanSentence(baseAction || map[contextKey] || "오늘은 내 기준을 한 문장으로 적어 보세요.", map[contextKey]);
}

function buildSelfEsteemPsychologicalReading({ card, orientation, context, previousSection, nextSection, meaning }) {
  const safeCard = card || {};
  const safeContext = context || {};
  const meta = parseSelfEsteemCardMeta(safeCard);
  const direction = orientation === "reversed" ? "역방향" : "정방향";
  const suitLabel = selfEsteemSuitLabel(meta);
  const suitPsychology = selfEsteemSuitPsychology(meta, orientation);
  const courtPsychology = selfEsteemCourtPsychology(meta, orientation);
  const transitionNote = selfEsteemTransitionNote(previousSection, nextSection);
  const meaningCore = asText(meaning?.selfEsteemMeaning || meaning?.psychologicalMeaning || meaning?.line || "");
  const meaningWound = asText((Array.isArray(meaning?.woundPattern) && meaning.woundPattern[0]) || meaning?.shadow || "");
  const meaningRecovery = asText((Array.isArray(meaning?.recoveryAdvice) && meaning.recoveryAdvice[0]) || meaning?.advice || "");
  const meaningCaution = asText((Array.isArray(meaning?.caution) && meaning.caution[0]) || meaning?.shadow || "");
  const name = selfEsteemDisplayName(safeCard, safeContext);
  const nameEn = asText(safeCard.nameEn || safeCard.nameKr || safeCard.name || "");
  const code = meta.code || asText(safeCard.code || safeCard.cardCode || safeCard.cardId || safeCard.id).toUpperCase();
  const title = asText(safeContext.title || "");
  const question = asText(safeContext.question || "");
  const focus = Array.isArray(safeContext.focus) ? safeContext.focus.filter(Boolean) : [];
  const focusText = focus.join(" · ");
  const bridge = transitionNote ? `${transitionNote} ` : "";
  const contextLine = `${name} ${direction}`;
  // 개선된 카드 데이터의 고유 의미(meaningCore)를 자리 심리 문장에 엮어 카드별 차별성을 살린다.
  const themeLine = `${contextLine}은 ${suitLabel} 계열 ${direction}으로, ${suitPsychology}${courtPsychology ? ` ${courtPsychology}` : ""}${meaningCore ? ` ${meaningCore}` : ""}`;

  let easyAnswer = "";
  let whyThisHappens = "";
  let realLifeExample = "";
  let woundPattern = "";
  let selfEsteemImpact = "";
  let recoveryReframe = "";
  let actionPractice = "";
  let caution = "";
  let innerSentence = "";
  let healingSentence = "";

  if (safeContext.key === "past_debuff") {
    easyAnswer = `${contextLine}은 사람의 표정과 말투, 분위기 변화를 빠르게 읽어 내는 섬세함을 드러냅니다. 눈치를 보는 이유는 소심해서가 아니라, 관계의 기류가 흔들릴 때 먼저 맞추며 마음을 지키는 방식을 익혀왔기 때문입니다.`;
    whyThisHappens = `${themeLine} 과거에 내 감정보다 상대 반응을 먼저 살피는 편이 안전했던 경험이 있었을 수 있습니다. 상대의 표정이 굳거나 말투가 차가워질 때 곧바로 내가 조정해야 한다고 느끼면서, 배려와 긴장이 함께 굳어졌을 수 있습니다.`;
    realLifeExample = `회의나 대화에서 상대가 잠깐 무표정해지면 내 의견을 끝까지 말하지 못하고, 먼저 분위기를 부드럽게 만들기 위해 상대 말에 맞춰 버리는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `내 감정이 맞는지 확인하기 전에 먼저 상대의 기분을 읽고 내 선택을 뒤로 미루는 습관입니다.`;
    selfEsteemImpact = `이 습관은 나를 배려 깊은 사람으로 보이게 할 수 있지만, 오래 이어지면 내 감정의 중심이 자꾸 밖으로 옮겨갑니다.`;
    recoveryReframe = `회복은 내 감정을 먼저 확인한 뒤 선택을 미루지 않는 데서 시작됩니다. 오래 익숙해진 방식을 지금의 나에게 맞게 다시 배우는 것이 핵심입니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `오늘은 상대 표정을 보기 전에 내 감정과 원하는 것 1개를 먼저 적어 보세요.`);
    caution = meaningCaution || `조심할 마음의 결론은 "내가 먼저 맞추지 않으면 관계가 틀어진다"는 생각입니다.`;
    innerSentence = `나는 분위기를 읽지만 내 감정은 내 것이다.`;
    healingSentence = `상대의 표정은 정보일 뿐, 내 가치는 내가 정한다.`;
  } else if (safeContext.key === "inner_monster") {
    easyAnswer = `${contextLine}은 거절을 하면 관계가 멀어지거나 상대가 실망할 것 같은 두려움을 드러냅니다. 그래서 거절이 어려운 이유는 말하기가 힘들어서만이 아니라, 상실과 비난을 동시에 떠올리는 마음이 너무 빨리 움직이기 때문입니다.`;
    whyThisHappens = `${themeLine} 부탁을 들어줘야 사랑받는다는 마음의 결론이 오래 쌓였을 수 있습니다. 상대가 실망하면 내가 잘못한 것 같고, 부탁을 거절하면 관계의 기반과 도움받을 가능성까지 흔들릴 것처럼 느껴지면서 죄책감이 먼저 올라와 경계선이 약해집니다.`;
    realLifeExample = `상대가 무리한 부탁을 했을 때 "지금은 어렵다"고 말하고 싶어도, 머릿속에 관계가 멀어지는 장면이 먼저 떠올라 결국 수락해 버리는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `거절 문장을 입 밖에 내기 전에 이미 죄책감이 올라와 스스로를 설득하는 방식입니다.`;
    selfEsteemImpact = `이 패턴이 길어지면 내 기준보다 타인의 만족이 우선되고, 자존감은 "내가 해야만 괜찮은 사람"이라는 조건에 쉽게 흔들립니다.`;
    recoveryReframe = `거절은 관계를 끊는 말이 아니라 내가 감당 가능한 범위를 알려주는 말입니다. 실망이 생기더라도 그 감정은 상대의 몫이고, 내 선택이 틀렸다는 뜻은 아닙니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `"지금은 어렵지만, 가능한 범위를 다시 알려줄게"라고 짧게 말해 보세요.`);
    caution = meaningCaution || `조심할 마음의 결론은 "부탁을 들어줘야 좋은 사람이다"라는 생각입니다.`;
    innerSentence = `실망은 관계의 끝이 아니라 경계를 배우는 신호다.`;
    healingSentence = `나는 상대를 실망시킬 수 있어도 나를 버릴 필요는 없다.`;
  } else if (safeContext.key === "current_damage") {
    easyAnswer = `${contextLine}은 눈치 보는 습관이 내 일상에서 어떤 손실을 만드는지 드러냅니다. 상대의 말과 표정을 머릿속에서 계속 시뮬레이션하다 보면, 정작 내 욕구는 뒤로 밀리고 몸과 감정은 먼저 지치게 됩니다.`;
    whyThisHappens = `${themeLine} 사람의 반응을 미리 계산하는 습관은 한때 도움이 되었지만, 지금은 내 선택권을 계속 소모시킵니다. "어떻게 보일까"를 먼저 따지느라 하고 싶은 말을 삼키고, 분노나 피로 신호가 몸에 쌓여도 그걸 나중으로 미루는 방식이 반복될 수 있습니다.`;
    realLifeExample = `메신저 답장을 보내기 전에 문장을 여러 번 고치거나, 누군가의 표정을 떠올리며 이미 혼나는 장면을 먼저 상상해 긴장을 키우는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `상대의 반응을 예측하는 데 에너지를 쓰느라 내 감정의 정확한 신호를 놓치는 것입니다.`;
    selfEsteemImpact = `이런 소모가 계속되면 나는 조용하고 착한 사람처럼 보일 수 있지만, 실제로는 자기검열과 피로 때문에 선택력이 약해지고 분노는 안쪽에 쌓입니다.`;
    recoveryReframe = `회복 방향은 오래된 보호 방식을 인정한 뒤, 지금은 더 이상 나를 소모시키지 않는 방향으로 쓰는 데 있습니다. 반응을 늦추고 사실만 확인하면 과잉 해석이 줄어듭니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `오늘은 답장이나 결정 전에 사실과 추측을 한 줄씩 나눠 적어 보세요.`);
    caution = meaningCaution || `조심할 마음의 결론은 "아직 상대가 말하지 않았지만 이미 나를 평가했을 것"이라는 생각입니다.`;
    innerSentence = `나는 지금 반응을 예측하는 사람이 아니라, 내 감정을 확인해야 하는 사람이다.`;
    healingSentence = `내 욕구를 늦게 말해도 지금부터 나를 지키면 된다.`;
  } else if (safeContext.key === "mind_shield") {
    easyAnswer = `${contextLine}은 타인의 실망을 받아들이면서도 내 기준을 지키는 법을 비춥니다. 상대가 실망해도 그 감정을 내가 책임질 필요는 없고, 설명을 길게 하지 않아도 경계는 충분히 전달될 수 있습니다.`;
    whyThisHappens = `${themeLine} 오래전부터 "미안해하고 설명을 많이 해야 관계가 유지된다"는 습관이 있었다면, 상대의 감정이 곧 내 책임처럼 느껴졌을 수 있습니다. 하지만 상대의 실망은 상대의 감정이고, 내 선택은 내 책임이라는 분리가 서야 경계가 살아납니다.`;
    realLifeExample = `누군가의 부탁을 거절한 뒤 길게 해명하다가 오히려 더 지치거나, 반대로 아무 말도 못 하고 허둥대며 결국 내 기준을 접어 버리는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `실망을 피하려고 설명을 과하게 늘리거나, 미안함 때문에 경계 문장을 너무 빨리 접는 습관입니다.`;
    selfEsteemImpact = `이런 방식은 관계를 부드럽게 보이게 할 수 있지만, 내 결정이 상대의 편안함에만 기대도록 만들 수 있습니다.`;
    recoveryReframe = `회복은 상대의 감정과 내 책임을 분리하는 데서 시작합니다. 미안함을 느껴도 기준은 지킬 수 있고, 설명은 한 문장으로 충분합니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `"네 마음은 이해하지만, 나는 이번에는 이렇게 할게"라고 짧게 말해 보세요.`);
    caution = meaningCaution || `조심할 마음의 결론은 "상대가 실망하면 내가 잘못한 사람"이라는 생각입니다.`;
    innerSentence = `미안함은 느낄 수 있지만 내 선택은 포기하지 않는다.`;
    healingSentence = `나는 상대를 배려하면서도 내 기준을 지킬 수 있다.`;
  } else {
    easyAnswer = `${contextLine}은 내 마음을 1순위로 두는 힘이 단순한 위로가 아니라 실제 생활 기준을 지키는 습관이라는 점을 비춥니다. 내 감정과 시간을 먼저 확인하고, 타인의 평가보다 내가 지킨 기준을 기록할수록 자존감은 조용히 단단해집니다.`;
    whyThisHappens = `${themeLine} 이제는 비교를 멈추고 오늘의 시간과 몸 상태를 먼저 확인하는 루틴이 필요합니다. 작은 성공을 반복해서 증거로 남길수록 "나는 나를 지킬 수 있다"는 신뢰가 쌓이고, 타인의 반응이 내 가치 판단을 흔드는 힘은 줄어듭니다.`;
    realLifeExample = `하루를 시작할 때 먼저 남의 요청부터 처리하지 않고, 오늘 지킬 기준 한 가지를 적어 두거나 끝냈던 일을 기록하면서 스스로를 인정하는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `내 시간을 남의 일정에 넘기고도 그 피로를 참는 방식이 익숙해지는 것입니다.`;
    selfEsteemImpact = `이 상태가 오래가면 자존감이 안정되기보다 "늘 뒤에 있는 사람"처럼 느껴지고, 독립감과 자기소유감이 약해집니다.`;
    recoveryReframe = `회복 방향은 내 감정과 시간을 먼저 확인하는 것에서 시작합니다. 내가 지킨 기준을 기록하면, 평가보다 사실이 자존감의 근거가 됩니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `오늘 내가 지킨 기준 1개를 적고, 그것을 성취로 인정해 보세요.`);
    caution = meaningCaution || `조심할 마음의 결론은 "내가 먼저 챙기면 이기적인 사람"이라는 생각입니다.`;
    innerSentence = `내 마음을 먼저 보는 것은 책임감이다.`;
    healingSentence = `오늘 지킨 기준 하나가 내 자존감의 증거가 된다.`;
  }

  const keywords = Array.from(new Set([
    ...(Array.isArray(safeContext.keywords) ? safeContext.keywords : []),
    ...(Array.isArray(meaning?.keywords) ? meaning.keywords : []),
    suitLabel,
    direction,
    meta.courtLabel,
    safeContext.key,
  ].map((item) => asText(item)).filter(Boolean))).slice(0, 5);

  const normalized = {
    positionIndex: Number(safeContext.order || 0),
    positionKey: asText(safeContext.key || ""),
    positionTitle: title,
    question,
    cardName: name,
    cardNameEn: nameEn,
    cardCode: code,
    orientation: orientation === "reversed" ? "reversed" : "upright",
    orientationLabel: direction,
    keywords,
    easyAnswer: selfEsteemCleanSentence(easyAnswer, `${name} ${direction}`),
    whyThisHappens: selfEsteemCleanSentence(whyThisHappens, suitPsychology),
    realLifeExample: selfEsteemCleanSentence(realLifeExample, `${name}의 실제 생활 예시입니다.`),
    woundPattern: selfEsteemCleanSentence(woundPattern, meaningWound || `${name}이 드러내는 상처 패턴입니다.`),
    selfEsteemImpact: selfEsteemCleanSentence(selfEsteemImpact, `${name}이 내 마음에 남기는 영향입니다.`),
    recoveryReframe: selfEsteemCleanSentence(recoveryReframe, meaningRecovery || `${name}이 보여주는 회복 방향입니다.`),
    actionPractice: selfEsteemCleanSentence(actionPractice, selfEsteemMakeUniqueAction(safeContext.key, "오늘의 연습")),
    caution: selfEsteemCleanSentence(caution, meaningCaution || `${name}이 알려주는 조심할 마음의 결론입니다.`),
    innerSentence: selfEsteemCleanSentence(innerSentence, `${name}은 내면 문장입니다.`),
    healingSentence: selfEsteemCleanSentence(healingSentence, `${name}은 회복 문장입니다.`),
  };

  return {
    ...normalized,
    cardMeaning: normalized.easyAnswer,
    patternAnalysis: normalized.woundPattern,
    recoveryAdvice: normalized.recoveryReframe,
    interpretation: selfEsteemCleanSentence(`${normalized.easyAnswer} ${normalized.whyThisHappens}`),
    advice: normalized.actionPractice,
    todayAction: normalized.actionPractice,
    cardType: suitLabel,
  };
}

function buildSelfEsteemTopSummary(positionReadings = []) {
  const safe = Array.isArray(positionReadings) ? positionReadings : [];
  const first = safe[0] || {};
  const second = safe[1] || {};
  const third = safe[2] || {};
  const fourth = safe[3] || {};
  const fifth = safe[4] || {};
  return {
    flowLine: selfEsteemCleanSentence(
      `${first.cardName || "첫 카드"} ${first.orientationLabel || "정방향"}에서 시작해 ${second.cardName || "두 번째 카드"} ${second.orientationLabel || "정방향"}의 불안, ${third.cardName || "세 번째 카드"} ${third.orientationLabel || "정방향"}의 과잉 해석을 지나 ${fourth.cardName || "네 번째 카드"} ${fourth.orientationLabel || "정방향"}의 경계 연습과 ${fifth.cardName || "다섯 번째 카드"} ${fifth.orientationLabel || "정방향"}의 자기소유감으로 이어지는 흐름입니다.`,
      "감정 민감성에서 경계 회복으로 이어지는 흐름입니다.",
    ),
    corePattern: selfEsteemCleanSentence(
      `상대가 실망할까 봐 내 욕구를 먼저 접는 습관이 반복됩니다.`,
      `상대가 실망할까 봐 내 욕구를 먼저 접는 습관이 반복됩니다.`,
    ),
    rootCause: selfEsteemCleanSentence(
      `관계 분위기가 나빠지는 것을 내 책임처럼 느껴 온 경험이 눈치 보기의 시작점입니다.`,
      `관계 분위기를 내 책임처럼 느껴 온 경험이 눈치 보기의 시작점입니다.`,
    ),
    mainDamage: selfEsteemCleanSentence(
      `상대의 말과 표정을 과도하게 해석하면서 정작 내 감정과 선택은 뒤로 밀립니다.`,
      `상대의 말과 표정을 과도하게 해석하는 데 에너지가 소모됩니다.`,
    ),
    recoveryKey: "감정 분리 · 짧은 거절 · 기준 기록",
    automaticThought: selfEsteemCleanSentence(
      `거절하면 관계가 끊기고, 실망이 오면 내가 잘못한 사람이 된다는 결론이 너무 빨리 올라옵니다.`,
      `거절하면 관계가 끊긴다는 결론이 너무 빨리 올라옵니다.`,
    ),
    todayAction: selfEsteemCleanSentence(
      `거절하기 전, 먼저 '내가 감당 가능한가?'를 한 줄로 적으세요.`,
      `거절 전에 내가 감당 가능한지 한 줄로 적으세요.`,
    ),
  };
}

function buildSelfEsteemLevelUpGuide({ spreadTitle, positionReadings }) {
  const safe = Array.isArray(positionReadings) ? positionReadings : [];
  const first = safe[0] || {};
  const second = safe[1] || {};
  const third = safe[2] || {};
  const fourth = safe[3] || {};
  const fifth = safe[4] || {};
  const flow = selfEsteemCleanSentence(
    `이번 흐름은 ${first.cardName || "첫 카드"} ${first.orientationLabel || "정방향"}의 감정 민감성에서 시작해 ${second.cardName || "두 번째 카드"} ${second.orientationLabel || "정방향"}의 안정감 불안, ${third.cardName || "세 번째 카드"} ${third.orientationLabel || "정방향"}의 과잉 해석을 지나 ${fourth.cardName || "네 번째 카드"} ${fourth.orientationLabel || "정방향"}의 경계 행동과 ${fifth.cardName || "다섯 번째 카드"} ${fifth.orientationLabel || "정방향"}의 자기소유감으로 회복되는 구조입니다. ${spreadTitle || "자기 기준 회복 타로"}는 남의 반응을 읽는 능력을 내 선택을 지키는 힘으로 바꾸는 여정입니다.`,
    `이번 흐름은 ${spreadTitle || "자기 기준 회복 타로"}의 다섯 장 연결을 비춥니다.`,
  );
  const rootPattern = selfEsteemCleanSentence(
    `상대의 표정과 분위기를 먼저 읽고 나를 뒤로 미루는 패턴이 뿌리입니다.`,
    `상대 반응을 먼저 읽고 나를 뒤로 미루는 패턴이 뿌리입니다.`,
  );
  const woundStory = selfEsteemCleanSentence(
    `눈치 보기로 시작한 생존 전략은 거절의 죄책감과 과잉 분석을 거쳐, 피로와 자기검열로 이어졌습니다. 그 결과 나는 착한 사람처럼 보일 수 있지만 내 마음을 우선하는 감각은 약해졌습니다.`,
    `생존 전략이 피로와 자기검열로 이어진 이야기입니다.`,
  );
  const recoveryPath = selfEsteemCleanSentence(
    `회복은 감정 분리에서 시작해 짧은 거절로 연습하고, 기준을 기록해 자기신뢰를 증거로 쌓는 순서로 갑니다. 마지막에는 내 시간을 내가 먼저 확인하는 습관이 자존감의 중심이 됩니다.`,
    `감정 분리부터 기준 기록까지 이어지는 회복 순서입니다.`,
  );
  const boundaryPractice = selfEsteemCleanSentence(
    `상대의 감정은 상대의 것이고, 내 선택은 내 것이라는 문장을 짧게 반복해 보세요. 설명은 한 문장만, 결정은 바꾸지 않는 연습이 경계선을 살립니다.`,
    `상대의 감정과 내 선택을 분리하는 연습이 필요합니다.`,
  );
  const sevenDayQuest = [
    "1일차: 오늘 내 감정과 시간을 먼저 확인하고, 어떤 부탁을 바로 받아들이고 싶은지 적기",
    "2일차: 거절이 필요한 상황에서 사용할 짧은 문장 1개를 소리 내어 읽기",
    "3일차: 머릿속 추측과 사실을 각각 3개씩 적어 과잉 해석을 분리하기",
    "4일차: 오늘 지킨 기준 1개를 기록하고, 그 선택이 왜 필요했는지 적기",
    "5일차: 누군가의 실망을 떠올렸을 때 그 감정과 내 책임을 따로 적어 보기",
    "6일차: 내 시간, 내 몸, 내 돈 중 하나의 경계를 실제로 지키고 결과를 기록하기",
    "7일차: 이번 주에 지킨 기준과 내 마음의 중심이 어떻게 단단해졌는지 한 문단으로 정리하기",
  ];
  const practiceSentence = selfEsteemCleanSentence(
    `오늘은 내가 감당 가능한지 먼저 묻고, 그렇지 않다면 짧게 거절하겠습니다.`,
    `오늘은 내가 감당 가능한지 먼저 묻고 짧게 답하겠습니다.`,
  );

  return {
    flow,
    rootPattern,
    woundStory,
    recoveryPath,
    boundaryPractice,
    sevenDayQuest,
    practiceSentence,
    text: `${flow} ${rootPattern} ${woundStory} ${recoveryPath} ${boundaryPractice} ${sevenDayQuest.join(" ")} ${practiceSentence}`,
  };
}

function collectSelfEsteemKeywords(items = [], limit = 3) {
  return Array.from(
    new Set(
      items.flatMap((item) => item?.keywords || [])
        .map((item) => asText(item))
        .filter(Boolean),
    ),
  ).slice(0, limit);
}

function ensureSelfEsteemCardMeaningIncluded(section) {
  const next = { ...(section || {}) };
  const keywords = Array.isArray(next.keywords)
    ? next.keywords.map((item) => asText(item)).filter(Boolean)
    : [];
  const fallbackKeywords = [
    ...keywords,
    ...String(next.cardMeaning || "").split(/[\s,·/()]+/),
    ...String(next.patternAnalysis || "").split(/[\s,·/()]+/),
  ].map((item) => asText(item)).filter((item) => item.length >= 2);
  next.keywords = Array.from(new Set(fallbackKeywords)).slice(0, 5);
  if (next.keywords.length < 3) {
    next.keywords = Array.from(new Set([...(keywords || []), "경계", "회복", "기준"]))
      .slice(0, 3);
  }
  return next;
}

function jaccardSimilarity(a, b) {
  const tokenSet = (input) => new Set(
    String(input || "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2),
  );
  const aSet = tokenSet(a);
  const bSet = tokenSet(b);
  if (!aSet.size || !bSet.size) return 0;
  let intersection = 0;
  aSet.forEach((item) => {
    if (bSet.has(item)) intersection += 1;
  });
  const union = aSet.size + bSet.size - intersection;
  return union ? intersection / union : 0;
}

function validateSelfEsteemTarotDiversity(sections, extras = {}) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const issues = [];
  const sentenceMap = new Map();
  const actionSet = new Set();
  const seenPipes = (text) => /\|/.test(asText(text));

  safeSections.forEach((section, idx) => {
    const merged = [
      section?.easyAnswer,
      section?.whyThisHappens,
      section?.realLifeExample,
      section?.woundPattern,
      section?.selfEsteemImpact,
      section?.recoveryReframe,
      section?.actionPractice,
      section?.caution,
      section?.innerSentence,
      section?.healingSentence,
      section?.cardMeaning,
      section?.patternAnalysis,
      section?.recoveryAdvice,
      section?.interpretation,
      section?.advice,
    ].map((line) => asText(line)).join(" ");

    if ([section?.easyAnswer, section?.whyThisHappens, section?.realLifeExample, section?.woundPattern, section?.selfEsteemImpact, section?.recoveryReframe, section?.actionPractice, section?.caution, section?.innerSentence, section?.healingSentence].some(seenPipes)) {
      issues.push(`section_${idx + 1}_pipe_character`);
    }

    sentenceSplitSelfEsteem(merged)
      .filter((line) => line.length >= 24)
      .forEach((line) => {
        const key = line.toLowerCase();
        if (!sentenceMap.has(key)) sentenceMap.set(key, []);
        sentenceMap.get(key).push(idx + 1);
      });

    if ((Array.isArray(section?.keywords) ? section.keywords : []).filter(Boolean).length < 3) {
      issues.push(`section_${idx + 1}_keyword_under_3`);
    }
    if (asText(section?.easyAnswer).length < 80) issues.push(`section_${idx + 1}_easy_answer_too_short`);
    if (asText(section?.whyThisHappens).length < 120) issues.push(`section_${idx + 1}_why_short`);
    if (!asText(section?.realLifeExample)) issues.push(`section_${idx + 1}_example_missing`);
    if (!asText(section?.healingSentence)) issues.push(`section_${idx + 1}_healing_missing`);
    if (!asText(section?.actionPractice)) issues.push(`section_${idx + 1}_action_missing`);

    const orientationWord = section?.orientation === "reversed" ? "역방향" : "정방향";
    const orientationText = `${asText(section?.easyAnswer)} ${asText(section?.whyThisHappens)} ${asText(section?.woundPattern)} ${asText(section?.selfEsteemImpact)} ${asText(section?.recoveryReframe)} ${asText(section?.cardMeaning)} ${asText(section?.patternAnalysis)}`;
    if (!orientationText.includes(orientationWord)) {
      issues.push(`section_${idx + 1}_orientation_not_reflected`);
    }

    const action = asText(section?.actionPractice || section?.todayAction);
    if (!action) issues.push(`section_${idx + 1}_today_action_empty`);
    if (action && actionSet.has(action)) issues.push(`section_${idx + 1}_today_action_duplicated`);
    if (action) actionSet.add(action);
  });

  sentenceMap.forEach((indexes) => {
    const uniqueIndexes = Array.from(new Set(indexes));
    if (uniqueIndexes.length >= 2) issues.push(`repeated_long_sentence_${uniqueIndexes.join("_")}`);
  });

  for (let i = 0; i < safeSections.length; i += 1) {
    for (let j = i + 1; j < safeSections.length; j += 1) {
      const left = safeSections[i];
      const right = safeSections[j];
      const leftText = [left?.easyAnswer, left?.whyThisHappens, left?.woundPattern, left?.selfEsteemImpact, left?.recoveryReframe].join(" ");
      const rightText = [right?.easyAnswer, right?.whyThisHappens, right?.woundPattern, right?.selfEsteemImpact, right?.recoveryReframe].join(" ");
      if (jaccardSimilarity(leftText, rightText) >= 0.72) {
        issues.push(`section_structure_too_similar_${i + 1}_${j + 1}`);
      }
    }
  }

  const summaryText = [extras.topSummary?.flowLine, extras.topSummary?.corePattern, extras.topSummary?.rootCause, extras.topSummary?.mainDamage, extras.topSummary?.recoveryKey, extras.topSummary?.automaticThought, extras.topSummary?.todayAction].map((item) => asText(item)).join(" ");
  if (seenPipes(summaryText)) issues.push("top_summary_pipe_character");
  if (extras.topSummary) {
    const flowSource = asText(extras.topSummary.flowLine || extras.topSummary.flow || "");
    const coverage = safeSections.filter((section) => flowSource.includes(asText(section?.cardName)) || flowSource.includes(asText(section?.positionTitle))).length;
    if (coverage < 3) issues.push("top_summary_flow_not_connected");
  }

  const guideText = [extras.levelUpGuide?.flow, extras.levelUpGuide?.rootPattern, extras.levelUpGuide?.woundStory, extras.levelUpGuide?.recoveryPath, extras.levelUpGuide?.boundaryPractice, Array.isArray(extras.levelUpGuide?.sevenDayQuest) ? extras.levelUpGuide.sevenDayQuest.join(" ") : "", extras.levelUpGuide?.practiceSentence].map((item) => asText(item)).join(" ");
  if (seenPipes(guideText)) issues.push("levelup_pipe_character");
  if (extras.levelUpGuide) {
    const flowSource = asText(extras.levelUpGuide.flow || "");
    if (flowSource.length < 40) issues.push("levelup_flow_not_connected");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function buildSelfEsteemActionStep({ card, orientation, context, meaning, previousSection, nextSection }) {
  return buildSelfEsteemPsychologicalReading({ card, orientation, context, meaning, previousSection, nextSection }).actionPractice;
}

function containsForbiddenPhrase(text) {
  const source = asText(text);
  return FORBIDDEN_QUALITY_PHRASES.some((phrase) => source.includes(phrase));
}

function validateTarotReadingQuality({ spreadId, positions, levelUpGuide, topSummary }) {
  const failures = [];
  const safePositions = Array.isArray(positions) ? positions : [];

  safePositions.forEach((pos, idx) => {
    const interpretation = asText(pos?.interpretation);
    const advice = asText(pos?.advice);
    if (!interpretation) failures.push(`position_${idx + 1}_interpretation_empty`);
    if (!advice) failures.push(`position_${idx + 1}_advice_empty`);
    if (containsForbiddenPhrase(interpretation) || containsForbiddenPhrase(advice)) {
      failures.push(`position_${idx + 1}_forbidden_phrase`);
    }
    if (!asText(pos?.cardName) || !asText(pos?.positionTitle)) {
      failures.push(`position_${idx + 1}_missing_core_fields`);
    }
    if (safePositions.some((other, otherIdx) => otherIdx !== idx && asText(other?.interpretation) === interpretation)) {
      failures.push(`position_${idx + 1}_duplicated_interpretation`);
    }
    if (spreadId === "self_esteem_levelup_five_card") {
      const richSelfEsteemText = [
        pos?.easyAnswer,
        pos?.whyThisHappens,
        pos?.realLifeExample,
        pos?.woundPattern,
        pos?.selfEsteemImpact,
        pos?.recoveryReframe,
        pos?.actionPractice,
        pos?.caution,
        pos?.innerSentence,
        pos?.healingSentence,
      ].map((line) => asText(line)).join(" ");
      const emotionalThemeOk = /(회복|경계|자기돌봄|자기승인|자기결정|자존감|자기신뢰|독립감|거절|실망|죄책감)/.test(richSelfEsteemText);
      if (!emotionalThemeOk) failures.push(`position_${idx + 1}_self_esteem_theme_missing`);
      if (asText(pos?.easyAnswer).length < 80) failures.push(`position_${idx + 1}_easy_answer_too_short`);
      if (asText(pos?.whyThisHappens).length < 120) failures.push(`position_${idx + 1}_why_short`);
      if (!asText(pos?.realLifeExample)) failures.push(`position_${idx + 1}_example_missing`);
      if (!asText(pos?.healingSentence)) failures.push(`position_${idx + 1}_healing_missing`);
    }
  });

  if (spreadId === "self_esteem_levelup_five_card") {
    const diversity = validateSelfEsteemTarotDiversity(safePositions, { topSummary, levelUpGuide });
    if (!diversity.ok) {
      failures.push(...diversity.issues);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

// 사용자가 고른 category/serviceKey 에서 질문 유형을 읽는다.
// 어느 규칙에도 걸리지 않으면 null 을 돌려준다 — "general 로 단정"과 "모르겠다"를
// 구분해야 스프레드 기본값을 덮어쓸지 말지 판단할 수 있다.
function matchQuestionTypeFromCategory(category, serviceKey) {
  const categoryKey = asText(category).toLowerCase();
  const serviceKeyRaw = asText(serviceKey).toLowerCase();
  const merged = `${categoryKey} ${serviceKeyRaw}`;

  if (/reunion|재회/.test(merged)) return "reunion";
  if (/exmind|mindscan|속마음|상대방/.test(merged)) return "exMind";
  if (/relationship|연애|love/.test(merged)) return categoryKey === "love" ? "love" : "relationship";
  if (/career|job|직업|진로/.test(merged)) return "career";
  if (/money|finance|금전|재물/.test(merged)) return "money";
  if (/daily|오늘/.test(merged)) return "daily";
  if (/future|yearly|연간|year/.test(merged)) return "future";
  return null;
}

function inferQuestionType({ questionType, category, spreadId, serviceKey }) {
  const explicitQuestionType = asText(questionType).toLowerCase();
  if (["love", "relationship", "reunion", "exmind", "currentmind", "future", "career", "money", "daily", "general"].includes(explicitQuestionType)) {
    if (explicitQuestionType === "exmind") return "exMind";
    if (explicitQuestionType === "currentmind") return "currentMind";
    return explicitQuestionType;
  }

  // 사용자가 고른 주제가 스프레드에 박힌 기본값보다 우선한다.
  // 이 순서가 뒤집혀 있어서 "재물운을 골랐는데 general 필드에서 카드 의미를 뽑는"
  // 질문 분야 이탈이 발생했다. 매칭되지 않으면 아래 스프레드 기본값이 그대로 돈다.
  const categoryQuestionType = matchQuestionTypeFromCategory(category, serviceKey);
  if (categoryQuestionType) return categoryQuestionType;

  const normalizedSpread = normalizeSpreadType(spreadId || "");
  const spread = getSpreadDefinition(normalizedSpread);
  if (spread?.questionType) return spread.questionType;

  return "general";
}

function ensureSpreadAndCount(spreadId, drawnCards) {
  const normalizedSpreadId = normalizeSpreadType(spreadId || "one_card");
  const spread = getSpreadDefinition(normalizedSpreadId);
  if (!spread) {
    throw new TarotInterpretationError(
      "UNSUPPORTED_SPREAD",
      `Unsupported spread: ${normalizedSpreadId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { spreadId: normalizedSpreadId },
    );
  }

  const expected = expectedCardCount(normalizedSpreadId);
  if (!Array.isArray(drawnCards) || drawnCards.length !== expected) {
    throw new TarotInterpretationError(
      "INVALID_CARD_COUNT",
      `${normalizedSpreadId} requires ${expected} cards`,
      `${normalizedSpreadId}은(는) ${expected}장의 카드가 필요합니다.`,
      { spreadId: normalizedSpreadId, expected, received: Array.isArray(drawnCards) ? drawnCards.length : 0 },
    );
  }

  return { spread, normalizedSpreadId };
}

function normalizeDrawnCardsForSpread(spreadId, cards) {
  const normalizedSpreadId = normalizeSpreadType(spreadId || "one_card");
  const spread = getSpreadDefinition(normalizedSpreadId);
  if (!spread) {
    throw new TarotInterpretationError(
      "UNSUPPORTED_SPREAD",
      `Unsupported spread: ${normalizedSpreadId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { spreadId: normalizedSpreadId },
    );
  }

  const safeCards = Array.isArray(cards) ? cards : [];
  return safeCards.map((item, idx) => {
    const position = spread.positions[idx] || spread.positions[0];
    const positionKey = asText(item?.positionKey || item?.position || position?.key);
    const card = getTarotCardByAnyId(item?.cardId || item?.id || item?.code);

    if (!card) {
      throw new TarotInterpretationError(
        "CARD_DATA_MISSING",
        `Card not found: ${item?.cardId || item?.id || item?.code || "(empty)"}`,
        "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
        { cardInput: item },
      );
    }

    return {
      cardId: card.code,
      positionKey: positionKey || position?.key || `position_${idx + 1}`,
      orientation: normalizeOrientation(item?.orientation),
    };
  });
}

function drawTarotCardsForSpread(spreadId) {
  const normalizedSpreadId = normalizeSpreadType(spreadId || "one_card");
  const spread = getSpreadDefinition(normalizedSpreadId);
  if (!spread) {
    throw new TarotInterpretationError(
      "UNSUPPORTED_SPREAD",
      `Unsupported spread: ${normalizedSpreadId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { spreadId: normalizedSpreadId },
    );
  }

  const shuffled = TAROT_CARDS.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return spread.positions.map((position, idx) => {
    const card = shuffled[idx];
    const orientation = Math.random() < 0.5 ? "upright" : "reversed";
    const meaning = getMeaningByQuestion(card, orientation, spread.questionType || "general");
    const images = buildImageCandidates(card.code);

    return {
      cardId: card.code,
      id: card.id,
      name: card.nameEn,
      nameEn: card.nameEn,
      nameKr: card.nameKo,
      nameKo: card.nameKo,
      position: position.key,
      positionKey: position.key,
      orientation,
      imageKey: card.imageKey || card.code.toLowerCase(),
      imageUrl: images[0],
      imageCandidates: images,
      proxyImageUrl: "",
      localImageUrl: images[0],
      keywords: card.keywords.slice(0, 5),
      interpretation: meaning.line,
    };
  });
}

function buildCardSection(interpretedCard) {
  const orientationLabel = interpretedCard.orientation === "reversed" ? "역방향" : "정방향";
  return {
    positionLabel: interpretedCard.positionLabel,
    cardName: interpretedCard.cardNameKo,
    orientationLabel,
    keywords: interpretedCard.keywords.slice(0, 5),
    cardMeaning: interpretedCard.coreMeaning,
    meaning: interpretedCard.questionSpecificMeaning,
    relationshipMessage: interpretedCard.emotionalMessage,
    advice: interpretedCard.advice,
    caution: interpretedCard.caution,
    actionStep: interpretedCard.actionStep,
  };
}

function summarizeCombinations(combinations) {
  return (Array.isArray(combinations) ? combinations : [])
    .map((item) => `${item.title}: ${item.description}`)
    .join("\n");
}

function buildSelfEsteemLevelUpQuests(positionReadings = []) {
  const first = positionReadings[0] || {};
  const third = positionReadings[2] || {};
  const last = positionReadings[4] || {};
  return [
    {
      title: tarotInterpretationText("tarotInterpretation.title.001"),
      difficulty: "easy",
      purpose: removeRepeatedSelfEsteemPhrases(`${asText(first.keywords?.[0] || "비교 과부하")}를 줄이고 자기 기준을 회복합니다.`),
      action: removeRepeatedSelfEsteemPhrases("오늘 고민 중인 선택지를 2개만 남기고 나머지는 보류 목록으로 이동합니다."),
      completionCheck: removeRepeatedSelfEsteemPhrases("'나는 모두를 만족시키지 않아도 된다' 문장을 기록합니다."),
    },
    {
      title: tarotInterpretationText("tarotInterpretation.title.002"),
      difficulty: "normal",
      purpose: removeRepeatedSelfEsteemPhrases(`${asText(third.keywords?.[0] || "과잉 걱정")}을 사실 검증으로 전환합니다.`),
      action: removeRepeatedSelfEsteemPhrases("지금 두려운 상황을 사실 3개와 추측 3개로 분리해 작성합니다."),
      completionCheck: removeRepeatedSelfEsteemPhrases("추측이 더 많으면 오늘 결론을 미루고 확인 질문 1개만 실행합니다."),
    },
    {
      title: tarotInterpretationText("tarotInterpretation.title.003"),
      difficulty: "hard",
      purpose: removeRepeatedSelfEsteemPhrases(`${asText(last.keywords?.[0] || "현실 기준")}을 일상 행동으로 고정합니다.`),
      action: removeRepeatedSelfEsteemPhrases("몸, 시간, 돈 중 한 영역의 기준을 정해 실제로 1회 지킵니다."),
      completionCheck: removeRepeatedSelfEsteemPhrases("지킨 기준과 결과를 한 줄로 기록합니다."),
    },
  ];
}

const TAROT_FEATURE_FORMATTERS = {
  love: {
    label: tarotInterpretationText("tarotInterpretation.label.001"),
    summaryFocus: "감정의 온도와 실제 행동의 간격",
    context: "상대의 말보다 반복된 행동, 표현의 속도, 약속을 지키는 방식을 함께 봐야 합니다.",
    advice: "오늘은 감정 확인을 길게 끌기보다 실제로 지켜진 행동과 내가 원하는 경계를 따로 적으세요.",
    caution: "호감이 있어도 속도와 경계가 맞지 않으면 작은 오해가 관계의 피로로 번질 수 있습니다.",
    final: "연애에서는 결론을 앞당기기보다 반복된 행동의 온도를 차분히 확인하는 쪽이 안전합니다.",
  },
  relationship: {
    label: tarotInterpretationText("tarotInterpretation.label.002"),
    summaryFocus: "거리, 역할, 말의 온도",
    context: "가까움의 크기보다 서로의 역할과 책임, 넘지 말아야 할 선이 더 중요하게 떠오릅니다.",
    advice: "오늘은 상대의 속마음을 단정하기보다 최근 행동 세 가지와 내가 지킬 경계 하나를 분리하세요.",
    caution: "비교심과 침묵이 길어지면 작은 말도 주도권 싸움처럼 받아들여질 수 있습니다.",
    final: "관계에서는 마음의 크기보다 지켜지는 선과 반복되는 태도가 흐름을 정합니다.",
  },
  reunion: {
    label: tarotInterpretationText("tarotInterpretation.label.003"),
    summaryFocus: "남은 감정과 다시 닿기 전의 조건",
    context: "그리움만으로 움직이기보다 과거에 반복된 문제와 다시 연락해도 되는 조건을 함께 살펴야 합니다.",
    advice: "오늘은 연락을 서두르기보다 재접근 전에 확인할 경계, 사과, 속도 기준을 한 줄씩 적으세요.",
    caution: "미련을 가능성으로 착각하면 같은 상처를 다시 열 수 있습니다.",
    final: "재회는 감정의 잔열보다 다시 만나도 무너지지 않을 조건이 먼저입니다.",
  },
  exMind: {
    label: tarotInterpretationText("tarotInterpretation.label.004"),
    summaryFocus: "겉태도 뒤의 두려움과 기대",
    context: "상대의 마음은 단정할수록 흐려지므로 표현, 회피, 실제 행동을 나누어 읽어야 합니다.",
    advice: "오늘은 상대가 한 말보다 피한 말, 지킨 약속, 반복한 행동을 따로 기록하세요.",
    caution: "침묵을 곧바로 거절이나 호감으로 단정하면 판단이 쉽게 치우칩니다.",
    final: "속마음은 맞히는 문제가 아니라, 드러난 행동과 숨은 두려움의 간격을 살피는 자리입니다.",
  },
  currentMind: {
    label: tarotInterpretationText("tarotInterpretation.label.005"),
    summaryFocus: "지금 올라온 감정과 방어 반응",
    context: "마음의 반응이 빠를수록 사실과 상상을 분리해야 선택이 덜 흔들립니다.",
    advice: "오늘은 바로 답을 정하기보다 내 감정, 확인된 사실, 아직 모르는 부분을 세 줄로 나누세요.",
    caution: "불안한 날의 결론을 전체 관계나 인생 결론으로 키우지 않는 편이 좋습니다.",
    final: "현재 마음은 결론보다 정리가 먼저이며, 감정과 사실을 나눌 때 길이 보입니다.",
  },
  future: {
    label: tarotInterpretationText("tarotInterpretation.label.006"),
    summaryFocus: "앞으로 드러날 변수와 선택 기준",
    context: "가까운 미래는 확정된 예언보다 지금 선택이 굳어질 방향을 비춥니다.",
    advice: "오늘은 기대보다 변수 목록을 먼저 적고, 바꿀 수 있는 행동 하나만 정하세요.",
    caution: "타이밍만 믿고 움직이면 준비되지 않은 조건이 뒤늦게 부담으로 돌아올 수 있습니다.",
    final: "가까운 흐름은 기다리는 운보다 지금 정리한 기준을 따라 기울어집니다.",
  },
  career: {
    label: tarotInterpretationText("tarotInterpretation.label.007"),
    summaryFocus: "역할, 평가, 일정 압박",
    context: "의욕보다 역할 범위, 책임자, 평가 기준, 마감의 압력이 현실을 움직입니다.",
    advice: "오늘은 업무 범위, 승인권자, 마감일, 책임 소재를 문장으로 남기세요.",
    caution: "성과를 빨리 내려고 기준 없이 움직이면 같은 일이 재작업으로 돌아올 수 있습니다.",
    final: "일의 흐름은 속도보다 책임의 위치가 분명할 때 단단해집니다.",
  },
  money: {
    label: tarotInterpretationText("tarotInterpretation.label.008"),
    summaryFocus: "수입보다 비용 구조와 회수 조건",
    context: "돈의 흐름은 수익 기대보다 계약, 정산일, 고정비, 회수 가능성에서 먼저 갈립니다.",
    advice: "오늘은 새로 벌 방법보다 나가는 돈, 묶인 돈, 회수 시점을 먼저 확인하세요.",
    caution: "불분명한 조건을 낙관으로 덮으면 작은 지출이 손실 구조로 굳어질 수 있습니다.",
    final: "금전운은 더 벌 수 있는가보다 어디서 새는가를 볼 때 선명해집니다.",
  },
  daily: {
    label: tarotInterpretationText("tarotInterpretation.label.009"),
    summaryFocus: "하루 안에서 바로 조정할 선택",
    context: "오늘의 카드는 큰 결론보다 당장 줄일 것과 지킬 것을 나누는 데 힘이 있습니다.",
    advice: "오늘은 가장 영향이 큰 일 하나만 정하고, 나머지는 보류 목록으로 밀어 두세요.",
    caution: "모든 일을 한 번에 해결하려 하면 중요한 신호가 소음에 묻힐 수 있습니다.",
    final: "오늘의 흐름은 크게 움직이기보다 하나를 분명히 고르는 데서 정리됩니다.",
  },
  healing: {
    label: tarotInterpretationText("tarotInterpretation.label.010"),
    summaryFocus: "지친 마음과 회복 가능한 온도",
    context: "상처를 억지로 고치기보다 지금 덜어낼 긴장과 회복할 리듬을 먼저 살펴야 합니다.",
    advice: "오늘은 마음을 몰아붙이지 말고, 몸과 감정이 덜 소모되는 행동 하나를 고르세요.",
    caution: "회복을 서두르면 피로가 다시 쌓일 수 있으니 작은 휴식과 경계가 먼저입니다.",
    final: "힐링의 흐름은 강한 결심보다 나를 덜 다치게 하는 작은 선택에서 살아납니다.",
  },
  yearly: {
    label: tarotInterpretationText("tarotInterpretation.label.011"),
    summaryFocus: "시기별 변화와 반복되는 선택 패턴",
    context: "한 해의 흐름은 한 번의 사건보다 반복되는 달의 리듬과 준비 상태에서 갈립니다.",
    advice: "이번 흐름에서는 서두를 달과 기다릴 달을 나누고, 중요한 결정은 기준표로 남기세요.",
    caution: "좋은 달만 믿거나 흔들리는 달을 과하게 두려워하면 한 해의 균형이 깨질 수 있습니다.",
    final: "연간운은 좋고 나쁨보다 어느 달에 무엇을 줄이고 무엇을 키울지 정하는 데 힘이 있습니다.",
  },
  selfEsteem: {
    label: tarotInterpretationText("tarotInterpretation.label.012"),
    summaryFocus: "눈치 보기와 자기검열이 약해지는 지점",
    context: "타인의 반응보다 내가 지킬 기준, 거절 문장, 회복 루틴이 더 중요하게 떠오릅니다.",
    advice: "오늘은 상대를 만족시키려는 행동 하나를 멈추고, 내 기준 문장 하나를 짧게 적으세요.",
    caution: "모두를 편하게 만들려는 습관이 길어지면 내 욕구와 피로가 뒤로 밀릴 수 있습니다.",
    final: "자기 기준은 큰 자신감보다 오늘 지킨 작은 경계에서 다시 단단해집니다.",
  },
  general: {
    label: tarotInterpretationText("tarotInterpretation.label.013"),
    summaryFocus: "현재 가장 강한 주제와 선택의 기준",
    context: "여러 신호가 섞일수록 먼저 손봐야 할 축을 하나로 좁히는 일이 중요합니다.",
    advice: "오늘은 핵심 주제 하나, 미룰 일 하나, 바로 확인할 일 하나를 나누세요.",
    caution: "운의 흐름을 핑계로 현실 판단을 미루면 선택지가 더 복잡해질 수 있습니다.",
    final: "종합운은 모든 일을 넓게 보는 것이 아니라, 가장 먼저 정리할 축을 찾을 때 힘이 납니다.",
  },
};

function getTarotFeatureFormatter(questionType, spreadId) {
  const spread = asText(spreadId);
  if (spread.includes("reunion")) return TAROT_FEATURE_FORMATTERS.reunion;
  if (spread.includes("relationship")) return TAROT_FEATURE_FORMATTERS.relationship;
  if (spread.includes("healing")) return TAROT_FEATURE_FORMATTERS.healing;
  if (spread.includes("yearly")) return TAROT_FEATURE_FORMATTERS.yearly;
  if (spread.includes("self_esteem")) return TAROT_FEATURE_FORMATTERS.selfEsteem;
  if (spread.includes("mindscan")) return TAROT_FEATURE_FORMATTERS.exMind;
  const key = asText(questionType);
  return TAROT_FEATURE_FORMATTERS[key] || TAROT_FEATURE_FORMATTERS.general;
}

function tarotFirstSentence(text) {
  const parts = asText(text).split(/(?<=[.!?。！？]|니다\.|요\.)\s+/);
  return (parts[0] || "").trim();
}

// 개선된 카드 데이터 필드(배열/문자열)에서 첫 문장을 안전하게 뽑는다.
function pickFirstLine(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = asText(item);
      if (text) return text;
    }
    return "";
  }
  return asText(value);
}

// 목적격 조사(을/를)를 받침 유무에 맞게 반환
function objectParticle(word) {
  const ch = asText(word).slice(-1);
  const code = ch.charCodeAt(0);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return "를";
  return (code - 0xac00) % 28 !== 0 ? "을" : "를";
}

function cardCoreSentence(cardName, orientationLabelText, core) {
  const cleanCore = asText(core);
  if (!cleanCore) return `${cardName} ${orientationLabelText}은 지금 질문의 중심 상징을 비춥니다.`;
  if (cleanCore.startsWith(cardName) || cleanCore.includes(`${cardName} ${orientationLabelText}`)) return cleanCore;
  return `${cardName} ${orientationLabelText}은 ${cleanCore}`;
}

function stripTopicLead(line) {
  return asText(line)
    .replace(/^(금전|연애|관계|재회|진로와 일|진로|건강과 멘탈|오늘|전체 흐름)에서는\s*/, "")
    .replace(/^(상대의 속마음|현재 심리|가까운 흐름|전체 흐름)은\s*/, "")
    .replace(/^오늘은\s*/, "")
    .trim();
}

// 카드 핵심(core) 문장 뒤에 붙는 포지션 적용 문장을 만든다.
// - 질문유형별 고유 해석(meaning.line)이 core와 다르면 포지션 이름으로 자연스럽게 프레이밍
// - core와 사실상 같은 문장(주로 general 질문)이면 반복을 피하고 포지션 역할만 짧게 덧붙임
function buildPositionApplication({ title, role, questionLine, coreText }) {
  const positionTitle = asText(title);
  const roleText = asText(role);
  const stripped = stripTopicLead(questionLine);
  const coreClean = asText(coreText);
  const qFirst = tarotFirstSentence(stripped);
  const alreadyInCore = coreClean && qFirst && coreClean.includes(qFirst);

  if (!stripped || alreadyInCore) {
    if (roleText && positionTitle) return `이 카드가 놓인 '${positionTitle}' 자리는 ${roleText}에 해당합니다.`;
    if (roleText) return `이 자리는 ${roleText}에 해당합니다.`;
    return "";
  }
  if (positionTitle) return `'${positionTitle}' 자리에서는 ${stripped}`;
  return stripped;
}

function selectFeatureAdvice(meaning, formatter) {
  const advice = asText(meaning?.advice);
  if (!advice) return formatter.advice;
  // 자존감/힐링 등 개념 특화 조언은 포매터의 컨셉 문구를 그대로 사용
  if (/상대를 설득하기 전에 내 기준|과잉 사과|자존감 관점/.test(advice)) return formatter.advice;
  // 그 외에는 카드 고유의 조언을 우선(제네릭 문구 반복 제거)
  return advice;
}

function selectFeatureCaution(meaning, formatter) {
  const caution = asText(meaning?.shadow || meaning?.psychologicalMeaning);
  if (!caution) return formatter.caution;
  if (/타인의 기대|모두를 만족|자존감 관점|상대 반응을 예측/.test(caution)) return formatter.caution;
  return caution;
}

function formatActionStep(title, adviceLine) {
  const clean = asText(adviceLine)
    .replace(/^오늘은\s*/, "")
    .replace(/^이번 흐름에서는\s*/, "")
    .trim();
  return `${title}에서는 ${clean || "확인 가능한 행동 하나를 정하세요."}`;
}

function buildFeaturePositionReading(entry, position, idx, { questionType, spreadId }) {
  const meaning = entry?.meaning || {};
  const card = entry?.card || {};
  const title = position?.label || `포지션 ${idx + 1}`;
  const role = asText(position?.role);
  const cardName = asText(card?.nameKo || card?.nameEn || `카드 ${idx + 1}`);
  const orientation = entry?.orientation === "reversed" ? "reversed" : "upright";
  const orientationLabelText = orientation === "reversed" ? "역방향" : "정방향";
  const formatter = getTarotFeatureFormatter(questionType, spreadId);
  const core = cardCoreSentence(cardName, orientationLabelText, meaning.coreMeaning || meaning.core);
  const questionLine = asText(meaning.line);
  const adviceLine = selectFeatureAdvice(meaning, formatter);
  const cautionLine = selectFeatureCaution(meaning, formatter);
  const positionApplication = buildPositionApplication({ title, role, questionLine, coreText: core });

  const interpretation = removeRepeatedTarotPhrases(dedupeSentences([
    core,
    positionApplication,
  ].filter(Boolean).join(" ")));
  const advice = removeRepeatedTarotPhrases(dedupeSentences(adviceLine));
  const caution = removeRepeatedTarotPhrases(dedupeSentences(cautionLine));
  const actionStep = removeRepeatedTarotPhrases(dedupeSentences(formatActionStep(title, adviceLine)));

  return {
    positionIndex: idx + 1,
    positionKey: position?.key || `position_${idx + 1}`,
    positionTitle: title,
    cardName,
    cardNameEn: asText(card?.nameEn),
    cardCode: asText(card?.code),
    orientation,
    orientationLabel: orientationLabelText,
    keywords: pickKeywords(meaning, card?.keywords || []),
    cardMeaning: core,
    interpretation,
    advice,
    caution,
    actionStep,
    featureLabel: formatter.label,
  };
}

function buildTarotSpreadSummary({ title, interpretedCards, questionType, spreadId }) {
  const formatter = getTarotFeatureFormatter(questionType, spreadId);
  const cardFlow = interpretedCards.map((card) => `${card.cardNameKo} ${orientationLabel(card.orientation)}`).filter(Boolean).join(", ");
  const countLabel = interpretedCards.length === 1 ? "한 장" : `${interpretedCards.length}장`;
  return removeRepeatedTarotPhrases(`${title}에서는 ${cardFlow || countLabel}의 흐름이 ${formatter.summaryFocus} 쪽을 비춥니다. ${formatter.final}`);
}

function buildTarotFinalReading({ summary, combinationReading, questionType, spreadId }) {
  const formatter = getTarotFeatureFormatter(questionType, spreadId);
  return removeRepeatedTarotPhrases([
    summary,
    asText(combinationReading),
    `${formatter.label}의 핵심은 상징을 크게 부풀리는 것이 아니라, 오늘 바로 확인할 현실 조건 하나로 좁히는 데 있습니다.`,
  ].filter(Boolean).join("\n"));
}

function generateTarotReading({ spreadId, spreadTitle, spreadTheme, positions, drawnCards, userQuestion, mode, questionType }) {
  const safePositions = Array.isArray(positions) ? positions : [];
  const safeDrawn = Array.isArray(drawnCards) ? drawnCards : [];
  const _unused = { spreadTheme, userQuestion, mode, questionType };
  void _unused;
  let positionReadings = [];

  if (spreadId === "self_esteem_levelup_five_card") {
    safeDrawn.forEach((entry, idx) => {
      const position = safePositions[idx] || {};
      const meaning = entry?.meaning || {};
      const title = position?.label || `포지션 ${idx + 1}`;
      const orientation = entry?.orientation === "reversed" ? "reversed" : "upright";
      const context = Object.assign({ key: position?.key || `position_${idx + 1}` }, POSITION_SELF_ESTEEM_CONTEXT[position?.key] || {
        order: idx + 1,
        icon: "✦",
        title,
        question: title,
        focus: ["자기이해"],
        keywords: ["회복", "경계", "기준"],
      });
      const previousSection = positionReadings[idx - 1] || null;
      const nextPosition = safePositions[idx + 1] || null;
      const nextCard = safeDrawn[idx + 1];
      const nextSection = nextPosition
        ? {
          positionTitle: nextPosition.label || nextPosition.role || `포지션 ${idx + 2}`,
          title: nextPosition.label || nextPosition.role || `포지션 ${idx + 2}`,
          cardName: nextCard?.card?.nameKo || nextCard?.card?.nameEn || nextCard?.card?.name || nextPosition.label || "",
        }
        : null;
      const section = buildSelfEsteemPsychologicalReading({
        card: entry?.card || {},
        orientation,
        context,
        previousSection,
        nextSection,
        meaning,
      });

      section.positionIndex = idx + 1;
      section.positionKey = position?.key || `position_${idx + 1}`;
      section.positionTitle = title;
      section.cardName = entry?.card?.nameKo || section.cardName || "";
      section.cardNameEn = entry?.card?.nameEn || section.cardNameEn || "";
      section.cardCode = entry?.card?.code || section.cardCode || "";
      section.keywords = Array.isArray(section.keywords) && section.keywords.length ? section.keywords : pickKeywords(meaning, context.keywords || []);
      section.todayAction = section.actionPractice;

      positionReadings.push(section);
    });
  } else {
    positionReadings = safeDrawn.map((entry, idx) => {
      const position = safePositions[idx] || {};
      return buildFeaturePositionReading(entry, position, idx, { questionType, spreadId });
    });
  }

  const topSummary = spreadId === "self_esteem_levelup_five_card"
    ? buildSelfEsteemTopSummary(positionReadings)
    : null;
  const levelUpGuide = spreadId === "self_esteem_levelup_five_card"
    ? buildSelfEsteemLevelUpGuide({ spreadTitle, positionReadings })
    : null;
  const levelUpQuests = spreadId === "self_esteem_levelup_five_card"
    ? buildSelfEsteemLevelUpQuests(positionReadings)
    : [];

  const quality = validateTarotReadingQuality({
    spreadId,
    positions: positionReadings,
    levelUpGuide,
    topSummary,
  });

  if (!quality.ok && spreadId === "self_esteem_levelup_five_card") {
    const repaired = positionReadings.map((item, idx) => {
      const next = { ...item };
      const ensure = (value, fallback) => selfEsteemCleanSentence(removeSelfEsteemPipes(value), fallback);
      next.easyAnswer = ensure(next.easyAnswer, `${next.cardName || "카드"} ${next.orientationLabel || "정방향"}은 ${next.positionTitle || "이 자리"}에 직접 답합니다.`);
      if (next.easyAnswer.length < 80) {
        next.easyAnswer = selfEsteemCleanSentence(`${next.easyAnswer} ${next.positionTitle || "이 자리"}에서 이 카드는 내 감정과 기준을 다시 연결해 줍니다.`, next.easyAnswer);
      }
      next.whyThisHappens = ensure(next.whyThisHappens, `${next.positionTitle || "이 자리"}는 ${next.cardName || "이 카드"}가 내 선택과 경계를 동시에 드러내기 때문에 이런 패턴으로 읽힙니다.`);
      if (next.whyThisHappens.length < 120) {
        next.whyThisHappens = selfEsteemCleanSentence(`${next.whyThisHappens} ${next.cardName || "이 카드"} ${next.orientationLabel || "정방향"}의 성격이 내 감정 반응과 행동 기준을 동시에 건드립니다.`, next.whyThisHappens);
      }
      next.realLifeExample = ensure(next.realLifeExample, `일상에서 ${next.cardName || "이 카드"}가 보여주는 모습은 내 선택을 미루게 하거나, 반대로 경계를 세우는 순간으로 드러납니다.`);
      next.woundPattern = ensure(next.woundPattern, `${next.positionTitle || "이 자리"}의 상처 패턴을 다시 읽어 보세요.`);
      next.selfEsteemImpact = ensure(next.selfEsteemImpact, `${next.positionTitle || "이 자리"}가 내 마음에 남기는 영향을 다시 정리합니다.`);
      next.recoveryReframe = ensure(next.recoveryReframe, `${next.positionTitle || "이 자리"}는 회복 방향을 이렇게 바꿉니다.`);
      next.actionPractice = selfEsteemMakeUniqueAction(next.positionKey, next.actionPractice);
      next.caution = ensure(next.caution, `${next.positionTitle || "이 자리"}에서 조심할 마음의 결론을 다시 확인합니다.`);
      next.innerSentence = ensure(next.innerSentence, `나는 내 기준을 먼저 확인할 수 있다.`);
      next.healingSentence = ensure(next.healingSentence, `나는 내 선택을 지킬 수 있다.`);
      next.cardMeaning = next.easyAnswer;
      next.patternAnalysis = next.woundPattern;
      next.recoveryAdvice = next.recoveryReframe;
      next.interpretation = ensure(`${next.easyAnswer} ${next.whyThisHappens}`, next.easyAnswer);
      next.advice = next.actionPractice;
      next.todayAction = next.actionPractice;
      next.keywords = Array.from(new Set([
        ...(Array.isArray(next.keywords) ? next.keywords : []),
        next.positionKey,
        next.cardType,
        next.orientationLabel,
      ].map(asText).filter(Boolean))).slice(0, 5);
      return next;
    });
    const repairedTopSummary = buildSelfEsteemTopSummary(repaired);
    const repairedLevelUpGuide = buildSelfEsteemLevelUpGuide({ spreadTitle, positionReadings: repaired });
    const repairedQuality = validateTarotReadingQuality({
      spreadId,
      positions: repaired,
      levelUpGuide: repairedLevelUpGuide,
      topSummary: repairedTopSummary,
    });
    if (!repairedQuality.ok) {
      console.error("[SelfEsteemTarot][QualityFail]", repairedQuality.failures);
    }

    return {
      positionReadings: repaired,
      topSummary: repairedTopSummary,
      levelUpGuide: repairedLevelUpGuide,
      levelUpQuests: buildSelfEsteemLevelUpQuests(repaired),
      quality: repairedQuality,
    };
  }

  return {
    positionReadings,
    topSummary,
    levelUpGuide,
    levelUpQuests,
    quality,
  };
}

function interpretTarotReading(input) {
  const questionType = inferQuestionType(input || {});
  const spreadId = normalizeSpreadType(input?.spreadId || "one_card");
  const { spread } = ensureSpreadAndCount(spreadId, input?.drawnCards);

  const normalizedDrawn = normalizeDrawnCardsForSpread(spreadId, input.drawnCards);

  const entries = normalizedDrawn.map((drawn, idx) => {
    const card = getTarotCardByAnyId(drawn.cardId);
    if (!card) {
      throw new TarotInterpretationError(
        "CARD_DATA_MISSING",
        `Card data missing for ${drawn.cardId}`,
        "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
        { drawn },
      );
    }

    const position = spread.positions.find((item) => item.key === drawn.positionKey) || spread.positions[idx];
    const meaning = getMeaningByQuestion(card, drawn.orientation, questionType);

    const interpretedCard = {
      positionLabel: position?.label || `포지션 ${idx + 1}`,
      positionRole: position?.role || "현재 흐름을 읽는 자리",
      cardNameKo: card.nameKo,
      cardNameEn: card.nameEn,
      orientation: drawn.orientation,
      keywords: meaning.keywords.slice(0, 5),
      positionMeaning: `${position?.label || `포지션 ${idx + 1}`}은(는) ${position?.role || "핵심 흐름"}을 비추는 자리입니다.`,
      questionSpecificMeaning: meaning.line,
      emotionalMessage: `${card.nameKo} 카드에 닿은 감정의 결은 '${meaning.psychologicalMeaning}' 쪽에 가깝습니다.`,
      advice: meaning.advice,
      caution: meaning.shadow,
      coreMeaning: meaning.coreMeaning,
      cardCode: card.code,
      cardId: card.id,
      meaning,
    };

    return {
      card,
      orientation: drawn.orientation,
      position,
      meaning,
      interpretedCard,
    };
  });

  const combinations = analyzeTarotCombinations(entries, questionType, spread, input?.locale);
  const generated = generateTarotReading({
    spreadId,
    spreadTitle: spread.title || "타로 리딩",
    spreadTheme: spread?.title || "",
    positions: spread.positions,
    drawnCards: entries,
    userQuestion: asText(input?.userQuestion),
    mode: "local_template",
    questionType,
  });

  const positionReadingMap = new Map((generated.positionReadings || []).map((item, idx) => [idx, item]));
  const interpretedCards = entries.map((entry) => entry.interpretedCard);
  interpretedCards.forEach((card, idx) => {
    const mapped = positionReadingMap.get(idx);
    if (!mapped) return;
    card.questionSpecificMeaning = mapped.interpretation;
    card.advice = mapped.advice;
    card.caution = mapped.caution || card.caution;
    card.coreMeaning = mapped.cardMeaning || card.coreMeaning;
    card.keywords = Array.isArray(mapped.keywords) ? mapped.keywords.slice(0, 5) : card.keywords;
    card.actionStep = mapped.actionStep;
  });
  const cardSections = interpretedCards.map(buildCardSection);

  const title = spread.title || "타로 리딩";
  const summary = buildTarotSpreadSummary({ title, interpretedCards, questionType, spreadId });
  const combinationReading = spreadId === "self_esteem_levelup_five_card"
    ? (generated.levelUpGuide?.text || "")
    : summarizeCombinations(combinations);
  const finalReading = buildTarotFinalReading({ summary, combinationReading, questionType, spreadId });

  const adviceCandidates = interpretedCards.map((card) => card.advice).filter(Boolean);
  const advice = adviceCandidates[0] || "지금은 결론을 서두르기보다 오늘 가능한 작은 행동 기준을 먼저 정하는 편이 좋습니다.";

  const reversedRatio = entries.filter((entry) => entry.orientation === "reversed").length / Math.max(1, entries.length);
  const caution = reversedRatio >= 0.5
    ? "역방향 카드 비율이 높습니다. 조급한 결론보다 속도 조절이 필요합니다."
    : undefined;

  return {
    title,
    summary,
    cards: interpretedCards,
    cardSections,
    combinations,
    combinationReading,
    finalReading,
    advice,
    caution,
    positionReadings: generated.positionReadings || [],
    topSummary: generated.topSummary || null,
    levelUpGuide: generated.levelUpGuide || null,
    levelUpQuests: generated.levelUpQuests || [],
    quality: generated.quality || null,
    spreadId,
    questionType,
  };
}

const RELATIONSHIP_POSITION_META = [
  {
    key: "self_view_of_other",
    label: tarotInterpretationText("tarotInterpretation.label.014"),
    role: "내가 상대를 어떻게 해석하고 있는지, 기대·두려움·투사의 방향",
    readingFocus: "내가 보고 있는 상대의 모습이 실제 상대인지, 내 감정이 덧씌운 이미지인지",
  },
  {
    key: "other_view_of_relationship",
    label: tarotInterpretationText("tarotInterpretation.label.015"),
    role: "상대가 이 관계를 가볍게 보는지, 조심스럽게 보는지, 가능성으로 보는지",
    readingFocus: "상대가 이 관계의 이름과 속도를 어떻게 정하고 있는지",
  },
  {
    key: "other_feeling_toward_me",
    label: tarotInterpretationText("tarotInterpretation.label.016"),
    role: "상대가 나에게 느끼는 감정의 온도, 매력, 부담, 거리감",
    readingFocus: "상대가 나에게 실제로 느끼는 끌림·경계·혼란",
  },
  {
    key: "other_romantic_will",
    label: tarotInterpretationText("tarotInterpretation.label.017"),
    role: "상대가 이 관계를 실제 연애나 더 깊은 관계로 발전시키려는 의지",
    readingFocus: "마음은 있어도 움직일 의지가 있는지, 혹은 마음보다 상황/두려움이 큰지",
  },
  {
    key: "core_block",
    label: tarotInterpretationText("tarotInterpretation.label.018"),
    role: "두 사람 사이에서 반복되는 오해, 타이밍, 자존심, 현실 문제, 두려움",
    readingFocus: "관계가 앞으로 나아가지 못하는 진짜 병목",
  },
  {
    key: "short_term_outcome",
    label: tarotInterpretationText("tarotInterpretation.label.019"),
    role: "현재 흐름이 유지될 경우 2~6주 안에 드러나기 쉬운 관계 온도",
    readingFocus: "현재 패턴이 향하는 방향과 내가 조정할 수 있는 지점",
  },
];

function relationshipRankLabel(rank, isMajor) {
  if (isMajor) return "Major";
  const map = {
    1: "Ace",
    2: "Two",
    3: "Three",
    4: "Four",
    5: "Five",
    6: "Six",
    7: "Seven",
    8: "Eight",
    9: "Nine",
    10: "Ten",
    11: "Page",
    12: "Knight",
    13: "Queen",
    14: "King",
  };
  return map[rank] || "Unknown";
}

function relationshipSuitProfile(suit) {
  return {
    cups: {
      label: tarotInterpretationText("tarotInterpretation.label.020"),
      focus: "감정, 애착, 정서 교류가 관계의 바닥을 적십니다. 말보다 마음의 안전감이 먼저 열려야 다음 선택이 부드러워집니다.",
      short: "컵의 물",
    },
    wands: {
      label: tarotInterpretationText("tarotInterpretation.label.021"),
      focus: "끌림, 속도, 추진력이 관계를 앞으로 밀어냅니다. 다만 불꽃이 빨리 번질수록 서로의 페이스를 맞추는 감각이 필요합니다.",
      short: "완드의 불",
    },
    swords: {
      label: tarotInterpretationText("tarotInterpretation.label.022"),
      focus: "말, 판단, 해석의 결이 관계를 흔듭니다. 감정보다 표현 방식과 오해 관리가 두 사람의 거리를 좌우합니다.",
      short: "소드의 바람",
    },
    pentacles: {
      label: tarotInterpretationText("tarotInterpretation.label.023"),
      focus: "현실, 책임, 지속 가능성이 관계의 중심에 놓입니다. 마음이 있어도 시간, 생활 리듬, 약속 이행이 함께 맞아야 안정됩니다.",
      short: "펜타클의 흙",
    },
    major: {
      label: tarotInterpretationText("tarotInterpretation.label.024"),
      focus: "일상적 호감보다 관계의 국면 자체를 다시 정렬하려는 압력이 떠오릅니다. 선택 하나가 두 사람의 이름과 거리를 바꿀 수 있습니다.",
      short: "메이저의 전환",
    },
  }[suit] || {
    label: tarotInterpretationText("tarotInterpretation.label.025"),
    focus: "감정과 현실, 말과 행동이 한쪽으로만 기울지 않고 섞입니다. 한 가지 신호만 붙잡기보다 반복되는 패턴을 함께 보아야 합니다.",
    short: "혼합된 결",
  };
}

function relationshipReversalPhrase(reversedCount, total) {
  if (reversedCount <= 0) {
    return "정방향의 흐름이 앞에 서 있어 마음과 행동이 비교적 바깥으로 드러나는 배열입니다.";
  }
  if (reversedCount >= total) {
    return "역방향의 그늘이 짙어 말해지지 않은 마음, 지연된 선택, 안으로 눌린 욕망을 먼저 살펴야 합니다.";
  }
  if (reversedCount > total / 2) {
    return "역방향 쪽이 더 무게를 가져 표현보다 내면의 망설임과 굴절된 반응이 크게 떠오릅니다.";
  }
  return "정방향과 역방향이 섞여 겉으로는 움직임이 있어도 안쪽에는 아직 정리되지 않은 감정이 머무릅니다.";
}

function relationshipCardSymbolCue(card) {
  const majorCue = {
    M00: "절벽 끝의 젊은 이와 작은 보따리",
    M01: "하늘과 땅을 잇는 손, 탁자 위 네 도구",
    M02: "두 기둥과 장막, 무릎 위의 책",
    M03: "풍요로운 들판과 쿠션의 왕좌",
    M04: "단단한 왕좌와 붉은 옷",
    M05: "두 신도와 축복의 손짓",
    M06: "두 인물 사이에 내려앉은 선택의 천사",
    M07: "두 스핑크스와 정면을 향한 전차",
    M08: "사자의 입을 어루만지는 인물과 무한대",
    M09: "등불을 든 은둔자와 산길",
    M10: "회전하는 바퀴와 네 방위 상징",
    M11: "저울과 검을 든 반듯한 인물",
    M12: "거꾸로 매달린 몸과 후광",
    M13: "검은 깃발과 흰 말",
    M14: "두 컵 사이를 오가는 물",
    M15: "사슬에 묶인 두 인물",
    M16: "번개 맞은 탑과 떨어지는 인물",
    M17: "별빛 아래 물을 붓는 여인",
    M18: "달빛, 늑대와 개, 물가의 게",
    M19: "해바라기와 말 탄 아이",
    M20: "트럼펫 소리와 깨어나는 사람들",
    M21: "월계관 안의 인물과 네 방위 상징",
  }[card.cardId];
  if (majorCue) return majorCue;

  const rankCue = {
    Ace: "에이스의 씨앗",
    Two: "둘의 선택과 균형",
    Three: "셋의 확장",
    Four: "넷의 고정",
    Five: "다섯의 충돌",
    Six: "여섯의 회복",
    Seven: "일곱의 시험",
    Eight: "여덟의 반복",
    Nine: "아홉의 응축",
    Ten: "열의 완성",
    Page: "페이지의 첫 소식",
    Knight: "나이트의 움직임",
    Queen: "퀸의 내면 통제",
    King: "킹의 책임과 결단",
  }[card.rank] || "숫자의 리듬";
  return `${relationshipSuitProfile(card.suit).short}과 ${rankCue}`;
}

function relationshipPositionAdvice(f) {
  if (f.positionKey === "self_view_of_other") {
    return "오늘 상대의 실제 행동 근거를 세 가지로만 적고, 상상으로 덧붙인 장면은 따로 표시하세요.";
  }
  if (f.positionKey === "other_view_of_relationship") {
    return "\"우리 지금 어떤 속도가 편할까?\"처럼 관계 이름보다 속도를 묻는 한 문장만 남기세요.";
  }
  if (f.positionKey === "other_feeling_toward_me") {
    return "감정 확인 질문은 멈추고, 상대가 부담 없이 답할 수 있는 짧은 안부 하나만 보내세요.";
  }
  if (f.positionKey === "other_romantic_will") {
    return "고백을 요구하지 말고, 짧은 만남이나 다음 연락 시간처럼 실행 가능한 제안 하나만 확인하세요.";
  }
  if (f.positionKey === "core_block") {
    return "일주일 동안 연속 확인 메시지를 줄이고, 연락 간격과 기대 수준을 먼저 낮추세요.";
  }
  return "앞으로 7일 동안 결론 요구를 미루고, 지킬 연락 기준과 넘지 않을 대화 선을 메모해 두세요.";
}

function relationshipCardFacts(card, idx) {
  const meta = parseRelationshipCardMeta({ code: card?.cardCode || card?.cardId || "" });
  const relMeta = RELATIONSHIP_POSITION_META[idx] || RELATIONSHIP_POSITION_META[RELATIONSHIP_POSITION_META.length - 1];
  const orientation = card?.orientation === "reversed" ? "reversed" : "upright";
  const relMeaning = getRelationshipCardMeaning(
    { code: card?.cardCode || "", nameKo: card?.cardNameKo || "", nameEn: card?.cardNameEn || "", keywords: card?.keywords || [] },
    orientation,
    relMeta.key,
  );
  return {
    positionTitle: relMeta.label,
    positionKey: relMeta.key,
    positionRole: relMeta.role,
    readingFocus: relMeta.readingFocus,
    positionOrder: idx + 1,
    cardName: asText(card?.cardNameKo),
    cardNameEn: asText(card?.cardNameEn),
    cardId: asText(card?.cardCode || card?.cardId),
    suit: meta.suit,
    rank: relationshipRankLabel(meta.rank, meta.isMajor),
    isMajor: meta.isMajor,
    isCourt: meta.isCourt,
    orientation,
    orientationLabel: orientationLabel(orientation),
    keywords: uniqueKeywordList(card?.keywords || [], relMeaning?.keywords || []).slice(0, 6),
    relMeaning,
    baseMeaning: asText(card?.questionSpecificMeaning || card?.meaning?.line),
    baseAdvice: asText(card?.advice || card?.meaning?.advice),
    // 포지션별 관계 해석 라인(개선된 카드 데이터). detail 조합에서 슈트 일반론 대신 사용.
    meaningLine: asText(card?.meaning?.line || card?.questionSpecificMeaning),
    cardCore: asText(card?.meaning?.coreMeaning || card?.meaning?.core),
    cardCaution: asText(card?.meaning?.shadow || card?.meaning?.psychologicalMeaning),
  };
}

function mapRelationshipReading(result) {
  const cards = Array.isArray(result?.cards) ? result.cards : [];
  const facts = cards.map((card, idx) => relationshipCardFacts(card, idx));
  const [c1, c2, c3, c4, c5, c6] = facts;

  const suitCount = { cups: 0, wands: 0, swords: 0, pentacles: 0, major: 0 };
  let majorCount = 0;
  let reversedCount = 0;
  let courtCount = 0;
  facts.forEach((f) => {
    if (f?.suit && suitCount[f.suit] !== undefined) suitCount[f.suit] += 1;
    if (f?.isMajor) majorCount += 1;
    if (f?.orientation === "reversed") reversedCount += 1;
    if (f?.isCourt) courtCount += 1;
  });

  const dominantSuit = Object.entries(suitCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "major";
  const dominantSuitProfile = relationshipSuitProfile(dominantSuit);
  const dominantSuitLabel = `${dominantSuitProfile.label} 우세: ${dominantSuitProfile.focus}`;
  const reversalSignal = relationshipReversalPhrase(reversedCount, facts.length);

  const projectionGap = `${c1.cardName} ${c1.orientationLabel}에는 내가 상대에게 씌운 기대의 렌즈가, ${c3.cardName} ${c3.orientationLabel}에는 상대 마음의 실제 결이 드러납니다. 두 신호가 어긋나면 크게 해석한 장면과 반복된 행동을 분리해 보는 편이 안전합니다.`;
  const relationshipFrame = `${c2.cardName} ${c2.orientationLabel}은 관계의 이름과 속도를 재는 태도이고, ${c4.cardName} ${c4.orientationLabel}은 그 태도가 행동으로 내려오는 방식입니다. 같은 결이면 움직임은 자연스럽고, 어긋나면 마음보다 속도 조율이 먼저입니다.`;
  const blockToOutcome = `${c5.cardName} ${c5.orientationLabel}의 병목이 그대로 남으면 ${c6.cardName} ${c6.orientationLabel}의 가까운 흐름은 지연이나 유보처럼 느껴질 수 있습니다. 이 배열은 확정된 결말보다, 막힌 지점을 다루는 태도에 따라 달라질 온도를 가리킵니다.`;

  const sequenceFlow = `${c1.cardName}(${c1.orientationLabel}) → ${c2.cardName}(${c2.orientationLabel}) → ${c3.cardName}(${c3.orientationLabel}) → ${c4.cardName}(${c4.orientationLabel}) → ${c5.cardName}(${c5.orientationLabel}) → ${c6.cardName}(${c6.orientationLabel})`;
  const wholeStory = `${sequenceFlow}. 시작의 ${c1.cardName}, 마지막의 ${c6.cardName} 사이에서 첫 인상과 가까운 흐름의 온도 차가 드러납니다. ${majorCount >= 2 ? "메이저 카드가 두드러져 감정만이 아니라 관계 구조를 다시 살필 필요가 있습니다." : "메이저의 압력은 낮아도 반복되는 소통 방식은 관계의 리듬을 천천히 굳힙니다."} ${reversalSignal} ${dominantSuitLabel}`;

  const positionBreakdown = facts.map((f, idx) => {
    const prev = idx > 0 ? facts[idx - 1] : null;
    const next = idx < facts.length - 1 ? facts[idx + 1] : null;
    const orderConnection = idx === 0
      ? `1번의 시선이 2번의 관계 속도(${next.cardName} ${next.orientationLabel})로 이어지며, 내가 기대한 흐름과 실제 리듬을 비교하게 합니다.`
      : idx === 1
        ? `2번은 1번의 기대와 3번의 감정 온도 사이에서 관계의 현실 리듬을 확인하는 자리입니다.`
        : idx === 2
          ? `3번의 감정 온도는 4번의 의지 카드와 함께 볼 때 느낌과 실행 사이의 차이를 드러냅니다.`
          : idx === 3
            ? `4번의 의지가 보여도 5번 병목(${next.cardName} ${next.orientationLabel})을 다루지 않으면 흐름은 쉽게 무거워집니다.`
            : idx === 4
              ? `5번 병목이 완화되지 않으면 6번(${next.cardName} ${next.orientationLabel})은 지연이나 거리 조절의 신호로 읽힐 수 있습니다.`
              : `6번은 1번에서 시작한 시선이 가까운 현실에서 어떤 온도로 드러나는지 보여주는 마무리 카드입니다.`;

    const symbolCue = relationshipCardSymbolCue(f);
    const headline = "";
    // 카드 고유의 관계 해석(개선된 카드 데이터: core + 포지션별 관계 의미)을 중심에 두고,
    // 슈트 일반론과 모든 포지션에 반복되던 고정 꼬리 문장을 제거한다.
    const cardMeaningLine = asText(f.meaningLine) || asText(f.relMeaning?.attractionSignal);
    const summary = removeRepeatedTarotPhrases(dedupeSentences([
      `${f.positionTitle}에서 ${f.cardName} ${f.orientationLabel}은 ${f.readingFocus}${objectParticle(f.readingFocus)} 비춥니다.`,
      cardMeaningLine,
    ].filter(Boolean).join(" ")));
    const detail = removeRepeatedTarotPhrases(dedupeSentences([
      `${f.cardName} ${f.orientationLabel}은 '${f.positionTitle}' 자리에서 ${f.readingFocus}${objectParticle(f.readingFocus)} 비춥니다.`,
      symbolCue ? `${symbolCue} 상징이 이 자리의 결을 더 선명하게 합니다.` : "",
      asText(f.cardCore),
      cardMeaningLine,
    ].filter(Boolean).join(" ")));
    const relationshipInsight = "";
    const advice = `${f.cardName} ${f.orientationLabel}의 오늘 선택은 하나입니다. ${relationshipPositionAdvice(f)}`;
    const caution = removeRepeatedTarotPhrases(dedupeSentences(asText(f.cardCaution)));

    return {
      positionTitle: f.positionTitle,
      positionKey: f.positionKey,
      positionOrder: f.positionOrder,
      cardName: f.cardName,
      cardNameEn: f.cardNameEn,
      cardId: f.cardId,
      suit: f.suit,
      rank: f.rank,
      isMajor: f.isMajor,
      isCourt: f.isCourt,
      orientation: f.orientation,
      orientationLabel: f.orientationLabel,
      keywords: f.keywords,
      headline,
      summary,
      detail,
      relationshipInsight,
      advice,
      caution,
      rawCardMeaning: f.baseMeaning,
      orderConnection,
      title: f.positionTitle,
      card: `${f.cardName} · ${f.orientationLabel}`,
      previousCard: prev ? `${prev.cardName} ${prev.orientationLabel}` : "",
      nextCard: next ? `${next.cardName} ${next.orientationLabel}` : "",
    };
  });

  const overallVibe = `${c1.cardName} ${c1.orientationLabel}부터 ${c6.cardName} ${c6.orientationLabel}까지의 배열은 내 시선, 상대의 프레임, 감정, 의지, 막힘, 가까운 흐름을 한 장면으로 묶습니다. ${reversalSignal} 슈트 분포에서는 ${dominantSuitLabel} 지금의 핵심 긴장은 마음의 크기보다 서로의 속도와 해석 방식을 맞출 수 있느냐에 있습니다. 동시에 이 긴장은 결론 압박을 낮추고 반복되는 행동을 살피면 관계의 기준을 새로 세울 기회가 됩니다.`;

  const deepReading = `${c2.cardName} ${c2.orientationLabel}의 ${relationshipCardSymbolCue(c2)} 상징은 상대가 관계의 이름을 고르며 잠시 멈춘 마음을 가리키고, ${c3.cardName} ${c3.orientationLabel}의 ${relationshipCardSymbolCue(c3)} 상징은 나를 향한 감정의 질감을 드러냅니다. 여기에 ${c4.cardName} ${c4.orientationLabel}의 ${relationshipCardSymbolCue(c4)} 상징이 겹치면, 상대 안에서는 느끼는 마음과 실제로 움직일 의지 사이에 간격이 생깁니다. 감정은 올라와도 행동 조건이 갖춰지지 않으면 다정한 말만 남고, 행동 의지가 먼저 서면 마음의 표현은 건조하게 느껴질 수 있습니다. 지금은 마음을 캐묻기보다 상대가 감당할 수 있는 약속의 크기를 작게 맞추세요.`;

  const realityAndFuture = `${c5.cardName} ${c5.orientationLabel}의 병목은 관계의 부재보다 속도 불균형, 급한 확인, 타이밍 압박에 가깝습니다. 이 매듭이 풀리지 않으면 ${c6.cardName} ${c6.orientationLabel}의 가까운 흐름은 유보나 거리 조절로 굳어질 수 있습니다. 내가 조정할 수 있는 영역은 연락 리듬, 질문의 길이, 결론을 요구하는 강도입니다. 당분간은 짧은 대화와 속도 낮추기를 병행하고, 애매함이 길어질 때 지킬 기준선도 함께 세워야 합니다.`;

  const finalAdvice = {
    instantMission: `${c5.cardName} ${c5.orientationLabel}의 매듭을 건드리지 않도록, 오늘은 관계 이름 대신 확인된 사실 질문 하나만 남기세요.`,
    conversationTip: `${c6.cardName} ${c6.orientationLabel}처럼 낮은 온도로 "나는 천천히 맞춰 가고 싶어"까지만 전하세요.`,
    relationshipBoundary: `${c5.cardName} ${c5.orientationLabel}의 압박을 반복하지 말고, 답이 늦어도 추가 메시지는 하루 한 번 이상 보내지 마세요.`,
    nextSevenDays: `${c6.cardName} ${c6.orientationLabel}의 리듬에 맞춰 7일 동안 결론 요구를 멈추고, 지켜진 약속만 기록하세요.`,
    checklist: [
      `${c5.cardName} 신호: 연속 확인 메시지를 줄이고 간격을 남기기`,
      `${c3.cardName} 신호: 감정 단정 대신 확인된 사실만 말하기`,
      `${c4.cardName} 신호: 말보다 실제 일정 제안 여부를 보기`,
      `${c2.cardName} 신호: 관계의 이름보다 편한 속도부터 맞추기`,
      `${c6.cardName} 신호: 애매함이 길어질 때 내가 지킬 기준 적어 두기`,
    ],
  };

  const mapped = {
    title: result.title,
    summary: result.summary,
    counselorTone: "관계 감정의 온도와 실행 의지를 분리하고, 카드 순서에 담긴 서사를 단정 없이 풀어냅니다.",
    overallVibe,
    deepReading,
    realityAndFuture,
    relationshipMatrix: {
      projectionGap,
      relationshipFrame,
      blockToOutcome,
      wholeStory,
      dominantSuit: dominantSuitLabel,
      majorArcanaSignal: majorCount > 0
        ? "메이저 카드가 관여해 관계의 국면 전환 압력이 떠오릅니다."
        : "메이저 카드 비중은 낮고 일상적 패턴 관리가 가까운 흐름을 좌우합니다.",
      reversedSignal: reversalSignal,
      courtCardSignal: courtCount > 0
        ? "궁정카드가 섞여 인물별 말투와 태도 관리가 핵심입니다."
        : "궁정카드 비중이 낮아 감정 구조보다 패턴 전개가 더 강하게 작동합니다.",
      sequenceFlow,
    },
    positionBreakdown,
    finalAdvice,
    advice: [
      finalAdvice.instantMission,
      finalAdvice.conversationTip,
      finalAdvice.relationshipBoundary,
      finalAdvice.nextSevenDays,
    ],
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    finalAdviceText: `${c5.cardName}과 ${c6.cardName}를 중심으로 속도를 낮추고, ${c3.cardName}·${c4.cardName} 기준으로 오해를 줄이는 대화를 남기세요.`,
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[RelationshipTarot] spreadId", result?.spreadId || "relationship_six_card");
    console.log("[RelationshipTarot] drawnCards", facts.map((f) => `${f.positionOrder}:${f.cardName}(${f.orientationLabel})`));
    console.log("[RelationshipTarot] sequenceFlow", sequenceFlow);
    console.log("[RelationshipTarot] relationshipMatrix", mapped.relationshipMatrix);
  }

  return mapped;
}

const REUNION_POSITION_BLUEPRINT = [
  {
    key: "past_bond",
    title: tarotInterpretationText("tarotInterpretation.title.004"),
    question: "내 감정의 온도와 미완의 감정 잔여량은 아직 연결을 원하는 쪽에 가까울까요?",
    spreadQuestion: "두 사람 사이의 온기는 아직 남아 있을까요?",
    interpretationLens: "내 감정의 온도와 미완의 감정 잔여량",
    coreDirection: "아직 연결을 원하는지, 그리움과 체념이 섞여 있는지",
    actionLens: "내 감정의 실제 온도 확인",
  },
  {
    key: "their_now",
    title: tarotInterpretationText("tarotInterpretation.title.005"),
    question: "상대의 내면 상태와 겉표현 아래 남은 감정의 결은 어디로 기울어 있을까요?",
    spreadQuestion: "겉표현 아래 남은 감정의 결은 무엇일까요?",
    interpretationLens: "그리움, 경계심, 체념, 혼란의 비율",
    coreDirection: "상대의 그리움, 경계심, 체념, 혼란이 어떻게 배합되어 있는지",
    actionLens: "단정 대신 관찰",
  },
  {
    key: "outside_factor",
    title: tarotInterpretationText("tarotInterpretation.title.006"),
    question: "연락 단절의 실제 이유에는 어떤 감정과 현실 변수가 함께 걸려 있을까요?",
    spreadQuestion: "연락이 멈춘 배경에는 어떤 감정과 현실 변수가 있을까요?",
    interpretationLens: "자존심, 두려움, 죄책감, 회피, 현실 변수",
    coreDirection: "자존심, 두려움, 죄책감, 회피, 현실 변수 중 무엇이 멈추게 했는지",
    actionLens: "압박 없이 장벽을 낮추는 접근",
  },
  {
    key: "their_heart",
    title: tarotInterpretationText("tarotInterpretation.title.007"),
    question: "재접근은 어느 정도의 거리와 속도에서 가장 안전하게 열릴까요?",
    spreadQuestion: "다시 닿으려면 어느 정도의 거리와 속도가 안전할까요?",
    interpretationLens: "짧은 접촉, 지연, 우연한 계기, 기다림의 필요성",
    coreDirection: "짧은 접촉, 지연, 우연한 계기, 기다림 중 어느 방향이 더 안전한지",
    actionLens: "타이밍과 톤 조절",
  },
  {
    key: "reunion_outcome",
    title: tarotInterpretationText("tarotInterpretation.title.008"),
    question: "다시 만나도 오래 가려면 어떤 내부 조건과 기준이 먼저 세워져야 할까요?",
    spreadQuestion: "다시 만나도 오래 갈 수 있는 조건은 무엇일까요?",
    interpretationLens: "재접근 여지, 지속 조건, 반복 위험",
    coreDirection: "재접근 여지와 지속 조건, 반복 위험 요소",
    actionLens: "회복 전략과 금지 행동의 정리",
  },
];

const REUNION_ACTION_SCRIPT = {
  past_bond: {
    upright: "오늘 연락 전에 마지막 갈등 이후 내가 달라진 점 한 가지를 한 문장으로 적어보세요.",
    reversed: "오늘은 연락하지 말고, 그리움과 실제 재회 의지를 각각 한 줄씩 분리해 적어보세요.",
  },
  their_now: {
    upright: "상대의 마지막 말과 최근 행동 세 가지를 적고, 감정 추측과 확인된 사실을 나눠보세요.",
    reversed: "상대의 침묵을 결론으로 쓰지 말고, 답을 기다릴 기준 시간을 먼저 정해두세요.",
  },
  outside_factor: {
    upright: "첫 문장은 두 줄 이내로 줄이고, 답을 강요하지 않는 문장으로 끝내보세요.",
    reversed: "연락이 막힌 이유를 묻기 전에, 내가 사과하거나 정리할 현실 항목 하나를 먼저 쓰세요.",
  },
  their_heart: {
    upright: "연락은 늦은 밤을 피하고, 상대가 답하기 쉬운 시간에 질문 없이 짧게 남겨보세요.",
    reversed: "무응답이면 추가 메시지를 보내지 말고, 다음 자연스러운 계기까지 최소 7일 간격을 두세요.",
  },
  reunion_outcome: {
    upright: "재회 제안 전, 지킬 약속 한 가지와 반복하지 않을 행동 한 가지를 메모장에 남겨두세요.",
    reversed: "재회 말보다 1~2주 동안 지킬 연락 간격과 갈등 중단 기준을 먼저 정하세요.",
  },
};

const REUNION_CAUTION_SCRIPT = {
  past_bond: "감정이 남아 있다는 사실을 곧 재회 의지로 착각할 수 있습니다. 원하는 마음과 실제로 다시 견딜 수 있는 구조는 다른 질문입니다.",
  their_now: "상대의 침묵을 내 감정 온도로 해석하면 오독이 생깁니다. 상대는 그리움보다 경계심을 먼저 정리하는 중일 수 있습니다.",
  outside_factor: "연락이 멈춘 이유를 감정 문제로만 보면 현실 변수를 놓칩니다. 시간, 책임, 죄책감, 생활 압박을 함께 보세요.",
  their_heart: "첫 반응이 부드럽다고 속도를 올리면 다시 닫힐 수 있습니다. 가까워질수록 답장 간격과 문장 길이를 더 낮춰야 합니다.",
  reunion_outcome: "회복 조건을 말로만 합의하면 같은 패턴이 반복됩니다. 합의한 행동이 실제로 지켜지는지 1~2주 관찰하세요.",
};

const REUNION_CARD_SYMBOLS = {
  M06: { scene: "천사가 내려다보는 아래, 두 사람이 서로를 마주 보며 선택의 순간 앞에 서 있습니다.", upright: "감정의 갈림길에서 다시 선택할 의지", reversed: "엇갈린 시선처럼 선택을 미루고 연결을 두려워하는 마음" },
  M07: { scene: "전사가 두 스핑크스를 앞에 두고 전차 위에서 방향을 붙잡고 있습니다.", upright: "의지로 움직이는 재회와 결심이 앞서는 접근", reversed: "방향을 잃은 전차처럼 추진력이 흩어지는 상태" },
  M08: { scene: "여인이 사자의 입을 부드럽게 닫으며 거친 힘을 다스리고 있습니다.", upright: "강요 없는 설득과 감정을 다스리는 인내", reversed: "부드러운 통제가 풀려 두려움과 자존심이 앞서는 흐름" },
  M09: { scene: "노인이 산 위에서 등불을 들고 홀로 길을 비추고 있습니다.", upright: "혼자 내면을 정리하며 회복하는 시간", reversed: "꺼져가는 등불처럼 고립이 길어져 연락을 거부하는 상태" },
  M10: { scene: "거대한 바퀴가 여러 상징 사이에서 천천히 돌아가고 있습니다.", upright: "흐름이 바뀌는 타이밍과 재회 기회의 창", reversed: "바퀴가 어긋나 같은 타이밍을 놓치는 반복" },
  M16: { scene: "벼락 맞은 탑에서 사람들이 추락하고, 숨겨진 균열이 한순간 드러납니다.", upright: "관계 붕괴의 원인을 직면하고 구조를 다시 세워야 하는 신호", reversed: "흔들리지만 버티는 탑처럼 충격을 흡수하는 중인 경고" },
  M17: { scene: "별빛 아래 여인이 두 항아리로 물을 조용히 붓고 있습니다.", upright: "상처 뒤의 회복과 서두르지 않는 희망", reversed: "쏟아진 물처럼 희망이 소진되고 치유가 지연된 상태" },
  M18: { scene: "늑대와 개가 달을 향해 울고, 가재가 물가에서 두 탑 사이의 길로 올라옵니다.", upright: "진심을 가린 불안과 아직 밝혀지지 않은 감정", reversed: "흐린 달빛이 걷히며 두려움이 서서히 정리되는 과정" },
  M19: { scene: "환한 태양 아래 아이가 흰 말을 타고 밝게 앞으로 나아갑니다.", upright: "솔직한 감정 표현과 밝은 재출발 가능성", reversed: "흐린 빛처럼 기쁨이 지연되고 자신감이 위축된 회복" },
  M20: { scene: "천사의 트럼펫 소리에 인물들이 관에서 깨어나 위를 바라봅니다.", upright: "과거 패턴을 직면하고 다시 부를 수 있는 대화", reversed: "소리를 듣지 못하듯 직면을 미루고 과거를 반복하는 상태" },
  M21: { scene: "월계관 안의 무용수가 완성의 춤을 추고 네 수호 상징이 둘러서 있습니다.", upright: "한 사이클의 완성과 재회보다 새 출발이 맞는 타이밍", reversed: "멈춘 춤처럼 감정의 매듭이 아직 완성되지 않은 상태" },
  P01: { scene: "구름 속 손 위에 황금 동전이 놓이고, 정원 너머 길이 열려 있습니다.", upright: "새로운 현실 기반과 재출발 조건의 형성", reversed: "손의 동전이 무거워져 조건이 아직 잡히지 않은 상태" },
  P02: { scene: "인물이 두 동전을 무한대 모양으로 돌리며 출렁이는 배경 앞에 서 있습니다.", upright: "재회와 일상 사이의 저울질과 균형 유지", reversed: "두 동전의 균형이 무너져 마음과 생활이 동시에 흔들리는 흐름" },
  P03: { scene: "세 사람이 성당 안에서 설계도를 함께 보며 구조를 맞추고 있습니다.", upright: "합의된 계획과 함께 짓는 관계 설계", reversed: "흩어진 설계도처럼 기대치와 역할이 어긋난 상태" },
  P04: { scene: "인물이 동전을 머리와 가슴, 발 아래에 꼭 쥐고 성 앞에 앉아 있습니다.", upright: "감정 방어와 재회 시도에 대한 통제 욕구", reversed: "쥔 손이 굳어 마음을 열기보다 잃을 것을 먼저 걱정하는 흐름" },
  P05: { scene: "눈보라 속 두 사람이 스테인드글라스 불빛 아래를 지나가고 있습니다.", upright: "외로움과 결핍, 도움이 필요해도 요청하지 못하는 마음", reversed: "불빛을 다시 알아차리며 결핍에서 벗어나려는 움직임" },
  P06: { scene: "저울을 든 사람이 한쪽에 동전을 나누고, 다른 이들은 손을 내밀고 있습니다.", upright: "주고받는 균형과 한쪽으로 기운 관계 구조의 재확인", reversed: "기울어진 저울처럼 일방적 희생이 커지는 위험" },
  P07: { scene: "농부가 펜타클이 열린 덤불 앞에서 수확을 기다리며 쉬고 있습니다.", upright: "기다리는 시간과 당장 움직이지 않아도 되는 타이밍", reversed: "수확을 재촉해 아직 익지 않은 결과를 흔드는 상태" },
  P08: { scene: "장인이 동전을 하나씩 새기며 같은 자세로 꾸준히 작업하고 있습니다.", upright: "관계 개선을 위한 반복 훈련과 꾸준한 노력", reversed: "같은 실수를 고치지 못해 노력의 방향이 흐려진 상태" },
  P09: { scene: "홀로 정원에 선 여인이 매를 손에 얹고 풍요로운 포도밭을 지킵니다.", upright: "자립과 자기 완성, 혼자도 충분한 상태", reversed: "정원의 안정이 흔들려 외로움을 재회 이유로 삼기 쉬운 흐름" },
  P10: { scene: "가족과 개, 문장이 새겨진 아치가 한 공간에 모여 오래된 기반을 이룹니다.", upright: "장기 안정과 공식적 관계, 미래를 함께 그릴 토대", reversed: "가문의 문장처럼 무거운 조건이 관계를 압박하는 상태" },
  P11: { scene: "젊은 페이지가 동전을 바라보며 가능성을 조심스럽게 살피고 있습니다.", upright: "작은 신호와 가능성을 탐색하는 초기 단계", reversed: "작은 신호를 현실 행동으로 옮기지 못하고 망설이는 상태" },
  P12: { scene: "기사가 말을 멈춘 채 들판 위에서 동전을 단단히 들고 있습니다.", upright: "신중한 접근과 서두르지 않는 재회 시도", reversed: "멈춰 선 말처럼 신중함이 정체로 바뀐 흐름" },
  P13: { scene: "풍요로운 왕좌의 여인이 토끼와 꽃 사이에서 동전을 품고 앉아 있습니다.", upright: "현실 기반 안정감과 실질적 돌봄", reversed: "기울어진 왕좌처럼 돌봄 여력이 소진되고 닫힌 마음" },
  P14: { scene: "왕좌의 왕이 풍요로운 배경 속에서 동전을 들고 현실의 무게를 살핍니다.", upright: "책임감 있는 재출발과 현실 안정 우선", reversed: "기울어진 왕좌처럼 현실 부담이 과해 재회 여력이 부족한 상태" },
  C01: { scene: "넘치는 컵 위로 물이 흐르고, 비둘기가 축복처럼 내려옵니다.", upright: "새로운 감정의 시작과 재회에 열린 마음", reversed: "넘친 물이 안으로 고여 감정 표현이 막힌 상태" },
  C02: { scene: "두 사람이 서로 잔을 교환하고, 위에는 결합의 상징이 떠 있습니다.", upright: "상호 감정 확인과 동등한 재연결 의지", reversed: "엇갈린 잔처럼 한쪽만 원하는 재회와 감정 불일치" },
  C03: { scene: "세 여인이 잔을 들고 함께 원을 이루며 기쁨을 나눕니다.", upright: "가벼운 만남과 분위기 전환을 통한 회복", reversed: "즐거움 뒤에 남은 비교나 주변 시선이 흐름을 흐리는 상태" },
  C04: { scene: "팔짱 낀 인물이 눈앞의 컵을 보지 않고, 구름 속 손이 새 컵을 내밉니다.", upright: "제안을 보지 못하는 무관심과 마음의 닫힘", reversed: "고개를 들며 놓쳤던 제안을 다시 살피는 흐름" },
  C05: { scene: "검은 망토의 인물이 엎질러진 컵 앞에 서 있고, 뒤에는 아직 선 컵이 남아 있습니다.", upright: "상실감과 아직 슬픔 안에 머문 상태", reversed: "뒤의 컵을 돌아보기 시작하며 재회 가능성의 싹이 트는 흐름" },
  C06: { scene: "어린 시절의 마당에서 한 아이가 다른 아이에게 꽃이 든 컵을 건넵니다.", upright: "과거의 추억과 옛 감정의 귀환", reversed: "추억이 현재를 붙잡아 현실 판단을 흐리는 상태" },
  C07: { scene: "인물이 구름 속 일곱 컵을 바라보고, 각 컵에는 서로 다른 환상이 떠 있습니다.", upright: "선택지 과잉과 현실감 부족, 결정하지 못하는 마음", reversed: "환상이 걷히며 실제로 가능한 선택을 고르는 과정" },
  C08: { scene: "인물이 쌓인 컵을 뒤로하고 달빛 아래 산길로 떠나갑니다.", upright: "자발적 거리두기와 상대가 먼저 떠난 이유", reversed: "떠난 길에서 다시 돌아볼지 망설이는 흐름" },
  C09: { scene: "인물이 아홉 잔 앞에 만족스러운 표정으로 앉아 있습니다.", upright: "감정적 충족과 바라던 결과 가능성", reversed: "만족이 채워지지 않아 기대가 과해지는 상태" },
  C10: { scene: "무지개 아래 열 개의 컵이 뜨고, 가족이 서로를 향해 팔을 들어 올립니다.", upright: "감정적 완성과 재회 후 안정적 미래 가능성", reversed: "행복한 그림은 있으나 현실의 합의가 따라오지 못하는 상태" },
  C11: { scene: "페이지가 컵 안의 물고기를 바라보며 뜻밖의 감정 신호를 마주합니다.", upright: "작고 불확실하지만 살아 있는 감정 신호", reversed: "감정 신호가 수줍음이나 회피로 안에 머무는 상태" },
  C12: { scene: "기사가 말을 타고 컵을 내밀며 부드럽게 다가옵니다.", upright: "감정적 제안과 로맨틱한 재회 시도 의지", reversed: "제안의 말은 있으나 실행이 불안정한 흐름" },
  C13: { scene: "바다 앞 왕좌의 여왕이 장식된 컵을 조용히 품고 있습니다.", upright: "감정적 수용과 직관으로 상대를 이해하는 능력", reversed: "감정이 과해져 상대보다 내 상처를 먼저 읽는 상태" },
  C14: { scene: "파도 위 왕좌의 왕이 흔들리는 바다 가운데서도 컵을 안정적으로 들고 있습니다.", upright: "감정 통제와 흔들리지 않는 감정 기반", reversed: "겉은 잔잔하지만 속의 파도가 감정을 압박하는 상태" },
  W01: { scene: "구름 속 손에서 잎이 돋은 지팡이가 힘 있게 뻗어 나옵니다.", upright: "재회를 향한 새로운 의지와 첫 행동의 불씨", reversed: "불씨가 흩어져 첫 행동의 힘이 약해진 상태" },
  W02: { scene: "지구본을 든 인물이 성 위에서 먼 지평선을 바라봅니다.", upright: "재회 계획의 구상 단계와 아직 행동 전인 마음", reversed: "계획은 있으나 결정하지 못해 시야가 좁아진 상태" },
  W03: { scene: "인물이 바다 건너 배를 기다리며 먼 곳의 흐름을 살피고 있습니다.", upright: "상대의 귀환을 기대하는 기다림", reversed: "기다림이 길어져 기대와 실망이 엇갈리는 상태" },
  W04: { scene: "화환 아치 아래 사람들이 축제처럼 모여 안정된 공간을 나눕니다.", upright: "재회 후 안정적 결합과 관계의 기념비", reversed: "축제의 문 앞에서 안정 조건이 아직 덜 맞은 상태" },
  W05: { scene: "여러 사람이 지팡이를 들고 서로 부딪치며 방향 없이 겨룹니다.", upright: "갈등 지속과 재회 전 해소해야 할 충돌", reversed: "싸움을 피하려다 핵심 갈등을 덮어두는 흐름" },
  W06: { scene: "월계관을 쓴 인물이 말 위에서 사람들의 시선을 받으며 돌아옵니다.", upright: "성공적 귀환과 재회 시도가 받아들여질 흐름", reversed: "인정받고 싶은 마음이 앞서 진심 전달이 늦어지는 상태" },
  W08: { scene: "여덟 개의 지팡이가 하늘을 빠르게 가로질러 한 방향으로 날아갑니다.", upright: "빠른 전개와 연락 재개의 속도", reversed: "흩어진 지팡이처럼 소통 단절과 타이밍 엇갈림" },
  W09: { scene: "상처 입은 인물이 지팡이를 붙잡고 마지막 경계를 세우고 있습니다.", upright: "지쳤지만 포기하지 않은 상태와 마지막 경계", reversed: "상처가 깊어 경계가 방어벽으로 굳어진 상태" },
  W10: { scene: "인물이 열 개의 지팡이를 무겁게 안고 마을을 향해 걸어갑니다.", upright: "관계에서 혼자 짊어진 부담과 과부하", reversed: "짐을 내려놓지 못해 재접근 자체가 부담이 되는 상태" },
  W13: { scene: "해바라기와 고양이 곁의 여왕이 자신감 있는 자세로 왕좌에 앉아 있습니다.", upright: "자기 확신과 매력적인 재접근 태도", reversed: "자신감이 방어로 바뀌어 상대를 시험하기 쉬운 흐름" },
  W14: { scene: "불꽃 무늬 왕좌의 왕이 지팡이를 들고 앞으로 움직일 준비를 합니다.", upright: "강한 의지와 재회를 이끌 추진력", reversed: "추진력이 조급함으로 기울어 상대를 압박하는 상태" },
  S01: { scene: "구름 속 손에서 검이 솟고, 검 끝에는 왕관과 월계가 걸려 있습니다.", upright: "명확한 진실과 재회 전 솔직한 대화 필요", reversed: "검끝이 흐려져 말의 진실이 왜곡되거나 늦어지는 상태" },
  S02: { scene: "눈을 가린 인물이 두 검을 교차해 들고 고요한 물가에 앉아 있습니다.", upright: "결정 회피와 아직 어느 쪽도 선택하지 못한 상태", reversed: "가린 눈을 풀기 전 불편한 결정을 피할 수 없는 흐름" },
  S03: { scene: "비 내리는 하늘 아래 심장에 세 자루 검이 꽂혀 있습니다.", upright: "상처의 핵심과 재회 전 반드시 다뤄야 할 고통", reversed: "검이 빠지기 시작하며 최악의 통증에서 회복되는 과정" },
  S04: { scene: "인물이 검 아래에 누워 고요히 쉬고, 곁에는 세 검이 걸려 있습니다.", upright: "회복을 위한 거리와 상대가 쉬고 있는 상태", reversed: "휴식이 길어져 회복보다 회피에 가까워진 상태" },
  S05: { scene: "한 인물이 검을 주워 들고, 뒤의 사람들은 패배한 듯 멀어집니다.", upright: "갈등 후 상처와 승패보다 관계 복원이 먼저인 흐름", reversed: "이긴 말과 진 마음을 되돌아보며 화해 가능성을 살피는 상태" },
  S06: { scene: "배가 검들을 싣고 물을 건너고, 인물들은 조용히 다른 기슭으로 향합니다.", upright: "고통에서 벗어나는 중이라 아직 돌아볼 여유가 부족한 상태", reversed: "배가 앞으로 나가지 못해 과거의 물결에 붙잡힌 흐름" },
  S07: { scene: "인물이 검 다섯 자루를 몰래 들고 진영을 빠져나가며 뒤를 살핍니다.", upright: "솔직하지 못한 소통과 회피성 철수", reversed: "숨긴 검을 내려놓고 사실을 말해야 하는 압력" },
  S08: { scene: "눈을 가리고 묶인 인물이 여덟 검 사이에 서 있어 길이 막힌 듯 보입니다.", upright: "자기 제한과 실제보다 크게 느끼는 장벽", reversed: "묶임이 느슨해지며 스스로 만든 장벽을 알아차리는 흐름" },
  S09: { scene: "인물이 밤중에 침대에서 머리를 감싸고, 뒤에는 아홉 검이 줄지어 있습니다.", upright: "불안과 자책, 밤마다 되새기는 상처", reversed: "긴 밤이 지나며 자책에서 벗어나려는 회복" },
  S10: { scene: "등에 열 자루 검이 꽂힌 인물이 바닥에 쓰러지고, 먼 하늘에는 새벽빛이 보입니다.", upright: "완전한 단절과 끝을 인정해야 가능한 새 시작", reversed: "최저점을 지나 재회 가능성의 새벽이 열리는 흐름" },
  S11: { scene: "페이지가 바람 속에서 검을 들고 주변을 예민하게 살피고 있습니다.", upright: "조심스러운 정보 탐색과 상대가 상황을 살피는 중인 흐름", reversed: "살핌이 의심으로 기울어 말이 날카로워지는 상태" },
};

const REUNION_MAJOR_FALLBACK_SYMBOLS = {
  M00: { scene: "바보가 작은 보따리와 흰 장미를 들고 절벽 끝에서 하늘을 바라봅니다.", upright: "새 출발의 충동과 아직 검증되지 않은 가능성", reversed: "준비 없는 접근과 상황을 가볍게 보는 위험" },
  M01: { scene: "마법사가 한 손은 하늘로, 한 손은 땅으로 향하고 탁자 위 도구들을 펼쳐 놓았습니다.", upright: "말과 행동으로 관계를 현실화하려는 의지", reversed: "말은 능숙하지만 실행이 비어 신뢰가 흔들리는 상태" },
  M02: { scene: "여사제가 두 기둥 사이에 앉아 두루마리를 품고 고요히 침묵합니다.", upright: "드러나지 않은 마음과 아직 말하지 않은 진심", reversed: "침묵이 길어져 진심보다 의심이 커지는 흐름" },
  M03: { scene: "여황제가 풍요로운 들판과 물가에 앉아 자연의 생명력을 품고 있습니다.", upright: "돌봄과 애정이 다시 자랄 수 있는 온기", reversed: "돌봄이 과해지거나 기대가 부담으로 바뀐 상태" },
  M04: { scene: "황제가 돌 왕좌에 앉아 질서와 책임의 상징을 단단히 쥐고 있습니다.", upright: "관계를 다시 세울 규칙과 책임 분담", reversed: "통제와 고집이 관계 회복을 막는 흐름" },
  M05: { scene: "교황이 두 사람 앞에서 손을 들어 전통과 약속의 문을 열고 있습니다.", upright: "신뢰와 공식적인 약속을 통해 회복되는 관계", reversed: "기존 규칙이나 주변 시선이 재회를 어렵게 하는 상태" },
  M11: { scene: "정의가 검과 저울을 들고 감정이 아니라 균형의 기준을 바라봅니다.", upright: "공정한 책임 정리와 다시 만날 기준", reversed: "책임 회피와 불공정한 기억이 남은 상태" },
  M12: { scene: "매달린 사람이 거꾸로 멈춰 있지만 얼굴에는 조용한 깨달음이 있습니다.", upright: "멈춤 속에서 관점을 바꾸어야 하는 재회", reversed: "기다림을 견디지 못해 성급히 결론내는 흐름" },
  M13: { scene: "죽음의 기사가 흰 말을 타고 지나가며 오래된 것이 물러나는 장면입니다.", upright: "한 패턴의 종료와 다른 방식으로만 가능한 새 시작", reversed: "끝난 방식을 붙잡아 변화가 지연되는 상태" },
  M14: { scene: "천사가 두 컵 사이로 물을 옮기며 한 발은 물에, 한 발은 땅에 둡니다.", upright: "중간 단계와 기다림, 다시 연결되는 호흡", reversed: "속도와 온도가 맞지 않아 조율이 깨진 상태" },
  M15: { scene: "악마 앞에 묶인 두 사람이 느슨한 사슬을 차고 서로의 욕망을 마주합니다.", upright: "미련과 집착이 강하게 얽힌 관계", reversed: "묶인 사슬을 알아차리고 벗어나려는 움직임" },
};

const REUNION_SUIT_FALLBACK = {
  cups: { object: "컵", field: "감정", upright: "마음의 물결이 다시 움직이는 흐름", reversed: "감정의 물이 안으로 고여 표현이 늦어지는 흐름" },
  swords: { object: "검", field: "생각과 말", upright: "말과 판단이 관계의 방향을 가르는 흐름", reversed: "생각이 엉켜 말이 늦거나 날카로워지는 흐름" },
  wands: { object: "지팡이", field: "의지와 속도", upright: "행동의 불씨가 다시 살아나는 흐름", reversed: "속도가 어긋나 불씨가 흩어지는 흐름" },
  pentacles: { object: "동전", field: "현실 조건", upright: "현실 기반을 다지며 천천히 회복되는 흐름", reversed: "현실 부담이 마음의 문을 늦추는 흐름" },
  major: { object: "상징", field: "관계 전환", upright: "큰 방향 전환이 드러나는 흐름", reversed: "전환을 알면서도 미루는 흐름" },
};

const REUNION_RANK_FALLBACK = {
  1: "구름 속 손이 새로운 상징을 건네며 시작의 문을 엽니다.",
  2: "인물이 두 상징 사이에서 균형을 잡으며 아직 한쪽을 고르지 못합니다.",
  3: "세 인물 또는 세 상징이 모여 관계의 다음 구조를 만들려 합니다.",
  4: "네 상징이 안정된 틀을 만들지만, 그 안정이 멈춤으로 굳을 수 있습니다.",
  5: "다섯 상징이 갈등과 결핍을 드러내며 관계의 불편한 지점을 보여줍니다.",
  6: "여섯 상징이 지나간 상처 뒤의 회복과 이동을 조용히 가리킵니다.",
  7: "일곱 상징 앞에서 인물이 경계하거나 계산하며 쉽게 결론내리지 못합니다.",
  8: "여덟 상징이 빠른 변화나 묶임을 만들며 다음 움직임을 압박합니다.",
  9: "아홉 상징이 쌓여 내면의 정리와 마지막 경계를 보여줍니다.",
  10: "열 상징이 한 주기의 끝과 감당해야 할 결과를 드러냅니다.",
  11: "페이지가 작은 상징을 들고 가능성을 조심스럽게 살핍니다.",
  12: "기사가 상징을 들고 움직이려 하지만 속도와 방향을 시험받습니다.",
  13: "여왕이 상징을 품고 감정과 현실을 돌보는 태도를 보여줍니다.",
  14: "왕이 상징을 들고 책임과 결정을 현실로 고정하려 합니다.",
};

function getReunionCardCode(card) {
  return asText(card?.code || card?.cardCode || card?.cardId).toUpperCase();
}

function hasKoreanBatchim(text) {
  const source = asText(text).replace(/[^\uac00-\ud7a3]+$/g, "");
  const last = source.charCodeAt(source.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false;
  return ((last - 0xac00) % 28) !== 0;
}

function withKoreanParticle(text, type) {
  const source = asText(text);
  if (!source) return "";
  const batchim = hasKoreanBatchim(source);
  const pairs = {
    subject: batchim ? "이" : "가",
    object: batchim ? "을" : "를",
    topic: batchim ? "은" : "는",
  };
  return `${source}${pairs[type] || ""}`;
}

function normalizeReunionCardSymbol(symbol, orientation, cardName) {
  const mode = orientation === "reversed" ? "reversed" : "upright";
  const scene = asText(symbol?.[`${mode}Scene`]) || asText(symbol?.scene) || `${cardName}의 고유 장면이 지금 관계의 방향을 비춥니다.`;
  const meaning = asText(symbol?.[mode]) || (mode === "reversed"
    ? `${cardName}의 상징이 지연되거나 굴절되는 흐름`
    : `${cardName}의 상징이 비교적 선명하게 작동하는 흐름`);
  return {
    scene,
    meaning,
  };
}

function inferReunionCardSymbol(card, orientation) {
  const safeCard = card || {};
  const code = getReunionCardCode(safeCard);
  const cardName = asText(safeCard.nameKo || safeCard.nameEn || "이 카드");
  const direct = REUNION_CARD_SYMBOLS[code] || REUNION_MAJOR_FALLBACK_SYMBOLS[code];
  if (direct) return normalizeReunionCardSymbol(direct, orientation, cardName);

  const suit = asText(safeCard.suit || "").toLowerCase();
  const rank = Number(code.slice(1) || safeCard.number);
  const suitInfo = REUNION_SUIT_FALLBACK[suit] || REUNION_SUIT_FALLBACK.major;
  const rankScene = REUNION_RANK_FALLBACK[rank] || `${cardName}의 그림 속 인물과 ${suitInfo.object}이 관계의 다음 단서를 드러냅니다.`;
  const meaning = orientation === "reversed" ? suitInfo.reversed : suitInfo.upright;
  return {
    scene: `${rankScene} ${suitInfo.object}은 ${suitInfo.field}의 문제를 현실 장면으로 끌어옵니다.`,
    meaning,
  };
}

function buildReunionCardScene(cardName, orientationText, symbol) {
  return cleanReunionLanguage(`${symbol.scene} ${cardName} ${orientationText}은 ${withKoreanParticle(symbol.meaning, "object")} 이 자리의 첫 장면으로 올립니다.`);
}

function buildReunionFlowInterpretation(position, cardName, orientation, symbol, cardReunionMeaning) {
  const title = asText(position?.title) || "이 자리";
  const direction = asText(position?.coreDirection) || asText(position?.interpretationLens) || "재회 흐름의 핵심";
  const modeLine = orientation === "reversed"
    ? `역방향이라 ${withKoreanParticle(symbol.meaning, "subject")} 곧장 움직이지 못하고 지연되거나 굴절됩니다.`
    : `정방향이라 ${withKoreanParticle(symbol.meaning, "subject")} 지금 흐름 안에서 비교적 선명하게 작동합니다.`;
  const titleWithTopic = withKoreanParticle(title, "topic");
  // 개선된 카드 데이터의 재회 해석(정/역방향별)을 자리별 렌즈 문장에 이어 붙인다.
  const cardLine = asText(cardReunionMeaning);
  const withCard = (base) => cleanReunionLanguage(cardLine ? `${base} ${cardLine}` : base);

  if (position?.key === "past_bond") {
    return withCard(`${titleWithTopic} 상대보다 내 마음의 온도를 먼저 읽습니다. ${symbol.scene} ${modeLine} 이 장면처럼 마음은 아직 닿고 싶은 쪽으로 기울 수 있지만, ${withKoreanParticle(direction, "object")} 분리해 보아야 합니다.`);
  }
  if (position?.key === "their_now") {
    return withCard(`${titleWithTopic} 상대의 겉표현 아래 남은 결을 읽습니다. ${symbol.scene} ${modeLine} 이 장면은 상대 안에서 ${withKoreanParticle(direction, "object")} 섞어 보여 줍니다.`);
  }
  if (position?.key === "outside_factor") {
    return withCard(`${titleWithTopic} 연락을 멈추게 한 실제 이유를 봅니다. ${symbol.scene} ${modeLine} 이 장면은 감정 하나보다 ${withKoreanParticle(direction, "subject")} 함께 얽힌 상태를 가리킵니다.`);
  }
  if (position?.key === "their_heart") {
    return withCard(`${titleWithTopic} 다시 닿는 속도와 거리를 정합니다. ${symbol.scene} ${modeLine} 이 장면은 ${withKoreanParticle(direction, "object")} 현실적으로 고르라고 말합니다.`);
  }
  return withCard(`${titleWithTopic} 다시 만나도 오래 갈 수 있는 조건을 읽습니다. ${symbol.scene} ${modeLine} 이 장면은 ${withKoreanParticle(direction, "object")} 세우지 않으면 재회가 다시 같은 파도에 흔들릴 수 있음을 말합니다.`);
}

function buildReunionActionLine(positionKey, orientation) {
  const key = asText(positionKey);
  const mode = orientation === "reversed" ? "reversed" : "upright";
  const script = REUNION_ACTION_SCRIPT[key]?.[mode]
    || REUNION_ACTION_SCRIPT.reunion_outcome[mode]
    || "감정 확인보다 신뢰 회복 행동 1개를 먼저 실행하세요.";
  return cleanReunionLanguage(script);
}

function buildReunionCautionLine(positionKey) {
  const key = asText(positionKey);
  return cleanReunionLanguage(REUNION_CAUTION_SCRIPT[key] || REUNION_CAUTION_SCRIPT.reunion_outcome);
}

function sentenceSplit(text) {
  return String(text || "")
    .split(/(?<=[.!?。！？]|니다\.|요\.|세요\.|합니다\.)\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function removeRepeatedPhrases(text) {
  const source = asText(text);
  if (!source) return "";

  const bannedPhrases = [
    /상대방도\s*마음이\s*있을\s*수\s*있습니다\.?/g,
    /천천히\s*기다려보세요\.?/g,
    /상황을\s*지켜보는\s*것이\s*좋습니다\.?/g,
    /좋은\s*흐름입니다\.?/g,
  ];

  const openerBans = [
    /^이 카드는\s*/,
    /^현재 상황은\s*/,
    /^상대방은\s*/,
    /^중요합니다[, ]*/,
  ];

  let prepared = source;
  bannedPhrases.forEach((pattern) => {
    prepared = prepared.replace(pattern, "");
  });

  const seen = new Set();
  const lines = [];
  sentenceSplit(prepared).forEach((line) => {
    let next = line;
    openerBans.forEach((pattern) => {
      next = next.replace(pattern, "");
    });
    next = next.trim();
    if (!next) return;
    const normalized = next.replace(/[“”"']/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    lines.push(next);
  });

  return lines.join(" ").replace(/\s{2,}/g, " ").trim();
}

function cleanReunionLanguage(text) {
  const subjectParticle = (word) => {
    const chars = Array.from(asText(word)).reverse();
    const last = chars.find((char) => {
      const code = char.charCodeAt(0);
      return code >= 0xac00 && code <= 0xd7a3;
    });
    if (!last) return "가";
    return ((last.charCodeAt(0) - 0xac00) % 28) === 0 ? "가" : "이";
  };
  return removeRepeatedPhrases(asText(text)
    .replace(/([가-힣]+)이\(가\)/g, (_, word) => `${word}${subjectParticle(word)}`)
    .replace(/([가-힣]+)은\s+\1은/g, "$1은")
    .replace(/([가-힣]+)는\s+\1는/g, "$1는")
    .replace(/([가-힣]+)입니다\.이/g, "$1입니다. 이")
    .replace(/\.이\s*/g, ". 이 ")
    .replace(/감정로/g, "감정으로")
    .replace(/조건로/g, "조건으로")
    .replace(/기준로/g, "기준으로")
    .replace(/\s+/g, " ")
    .trim());
}

function uniqueKeywords(list, minimum = 2, fallback = []) {
  const source = (Array.isArray(list) ? list : [])
    .map((line) => asText(line))
    .filter(Boolean);
  const merged = Array.from(new Set([...source, ...(Array.isArray(fallback) ? fallback : [])].map((line) => asText(line)).filter(Boolean)));
  return merged.slice(0, Math.max(3, minimum));
}

function validateTarotReadingDiversity(sections) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const issues = [];

  const sentenceIndex = new Map();
  const openerIndex = new Map();

  safeSections.forEach((section, idx) => {
    const textFields = [
      section?.cardMeaning,
      section?.reunionInterpretation,
      section?.advice,
      section?.caution,
      section?.headline,
      section?.directAnswer,
      section?.detailedReading,
      section?.reunionPoint,
    ]
      .map((line) => asText(line))
      .filter(Boolean);

    const merged = textFields.join(" ");
    sentenceSplit(merged).forEach((line) => {
      const normalized = line.replace(/[“”"']/g, "").replace(/\s+/g, " ").trim();
      if (normalized.length < 20) return;
      if (!sentenceIndex.has(normalized)) sentenceIndex.set(normalized, []);
      sentenceIndex.get(normalized).push(idx);
    });

    const opener = asText(section?.reunionInterpretation || section?.directAnswer).slice(0, 14);
    if (opener) {
      if (!openerIndex.has(opener)) openerIndex.set(opener, []);
      openerIndex.get(opener).push(idx);
    }

    const keywordCount = Array.isArray(section?.keywords)
      ? new Set(section.keywords.map((item) => asText(item)).filter(Boolean)).size
      : 0;
    if (keywordCount < 2) {
      issues.push(`section_${idx + 1}_keyword_too_few`);
    }
  });

  sentenceIndex.forEach((indexes) => {
    const uniqueIndexes = Array.from(new Set(indexes));
    if (uniqueIndexes.length > 1) {
      issues.push(`repeated_long_sentence_${uniqueIndexes.join("_")}`);
    }
  });

  openerIndex.forEach((indexes) => {
    const uniqueIndexes = Array.from(new Set(indexes));
    if (uniqueIndexes.length > 1) {
      issues.push(`repeated_opener_${uniqueIndexes.join("_")}`);
    }
  });

  return {
    ok: issues.length === 0,
    issues,
  };
}

function enrichCardPositionMeaning(card, position, orientation, context = {}) {
  const safeCard = card || {};
  const safePosition = position || {};
  const meaning = orientation === "reversed" ? safeCard.reversed : safeCard.upright;
  const orientationText = orientation === "reversed" ? "역방향" : "정방향";
  const cardName = asText(safeCard.nameKo || safeCard.nameEn || "이 카드");
  const symbol = inferReunionCardSymbol(safeCard, orientation);

  const baseKeywords = uniqueKeywords(meaning?.keywords, 3, [
    ...(safeCard.keywords || []),
    ...(meaning?.core || []),
    symbol.meaning,
  ]);

  // 개선된 카드 데이터의 재회 해석/조언/주의(정·역방향별)를 자리 템플릿에 주입한다.
  const cardReunionMeaning = pickFirstLine(meaning?.reunion) || pickFirstLine(meaning?.currentMind);
  const cardReunionAdvice = pickFirstLine(meaning?.advice);
  const cardReunionCaution = pickFirstLine(meaning?.caution) || pickFirstLine(meaning?.shadow);

  const cardMeaning = buildReunionCardScene(cardName, orientationText, symbol);
  const reunionInterpretation = buildReunionFlowInterpretation(safePosition, cardName, orientation, symbol, cardReunionMeaning);
  const actionLead = asText(safePosition.actionLens);
  const scriptAdvice = buildReunionActionLine(safePosition.key, orientation, actionLead);
  const advice = cardReunionAdvice ? cleanReunionLanguage(`${scriptAdvice} ${cardReunionAdvice}`) : scriptAdvice;
  const scriptCaution = buildReunionCautionLine(safePosition.key);
  const caution = cardReunionCaution ? cleanReunionLanguage(`${scriptCaution} ${cardReunionCaution}`) : scriptCaution;

  const headline = cleanReunionLanguage(
    `${cardName} ${orientationText}: ${symbol.meaning}`
  );

  const directAnswer = cleanReunionLanguage(
    `${safePosition.title || "이 자리"}에서는 ${withKoreanParticle(symbol.meaning, "subject")} ${asText(safePosition.interpretationLens) || "재회 흐름"} 안에서 드러납니다.`
  );

  const detailedReading = cleanReunionLanguage(
    `${safePosition.title || "이 자리"}은 ${cardName} ${orientationText}을 통해 ${asText(safePosition.coreDirection) || asText(safePosition.interpretationLens) || "재회 흐름"}를 좁혀 보고, 다음 행동을 하나로 줄이는 자리입니다.`
  );

  const reunionPoint = cleanReunionLanguage(
    `${safePosition.title || "포지션"}의 등대 포인트는 ${asText(context?.suitHint)}`
  );

  return {
    order: Number(context?.order || 0),
    title: asText(safePosition.title) || `포지션 ${context?.order || 0}`,
    question: asText(safePosition.question) || "재회 흐름 확인",
    spreadQuestion: asText(safePosition.spreadQuestion),
    cardNameKo: cardName,
    cardNameEn: asText(safeCard.nameEn),
    orientation,
    orientationLabel: orientationText,
    keywords: baseKeywords,
    symbolMeaning: symbol.meaning,
    cardScene: cardMeaning,
    reunionFlow: reunionInterpretation,
    cardMeaning,
    reunionInterpretation,
    advice,
    caution,
    headline,
    directAnswer,
    detailedReading,
    reunionPoint,
  };
}

function reunionScoreFromResult(result) {
  const positive = (result.combinations || []).filter((item) => item.type === "supportivePair").length;
  const negative = (result.combinations || []).filter((item) => item.type === "conflictPair").length;
  const reversed = (result.cards || []).filter((item) => item.orientation === "reversed").length;
  const raw = 58 + (positive * 8) - (negative * 9) - (reversed * 4);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function reunionLabel(score) {
  if (score >= 75) return "문이 열리는 흐름";
  if (score >= 58) return "조건을 맞추면 열리는 흐름";
  if (score >= 40) return "거리를 조율해야 하는 흐름";
  return "회복을 먼저 돌봐야 하는 흐름";
}

function reunionVerdict(score, first, last) {
  const uprightCount = [first, last].filter((item) => item?.orientation === "upright").length;
  if (score >= 68 && uprightCount >= 1) return "긍정";
  if (score >= 42) return "조건부";
  return "보류";
}

function reunionCardLabel(section) {
  return `${asText(section?.cardNameKo || section?.cardName || "카드")} ${asText(section?.orientationLabel || "")}`.trim();
}

function buildReunionOpening(score, dominantSuit) {
  const tide = score >= 68
    ? "먼바다의 별빛은 아직 물결 위에 남아 있고, 닿을 길도 완전히 닫히지 않았습니다"
    : score >= 42
      ? "먼바다에는 희미한 별빛이 남아 있지만, 물결은 아직 쉽게 잦아들지 않습니다"
      : "밤바다는 깊고 조용하며, 지금은 멀리 보이는 불빛보다 발밑의 물결을 먼저 살필 때입니다";
  const suitLine = dominantSuit === "cups"
    ? "마음은 따뜻하지만 물결이 깊어 천천히 건너야 합니다"
    : dominantSuit === "swords"
      ? "생각의 바람이 세어 말의 순서를 낮추어야 합니다"
      : dominantSuit === "wands"
        ? "불씨는 살아 있으나 바람을 만나면 쉽게 번질 수 있습니다"
        : "현실의 모래톱을 지나야 온기가 오래 머뭅니다";
  return cleanReunionLanguage(`${tide}. ${suitLine}. 재회 가능성은 서두른 고백보다 조용한 거리 조율 속에서 다시 숨을 찾습니다.`);
}

function buildReunionSummary({ score, positions, dominantSuit }) {
  const first = positions[0] || {};
  const second = positions[1] || {};
  const third = positions[2] || {};
  const fourth = positions[3] || {};
  const fifth = positions[4] || {};
  const verdict = reunionVerdict(score, first, fifth);
  const firstLabel = reunionCardLabel(first);
  const secondLabel = reunionCardLabel(second);
  const thirdLabel = reunionCardLabel(third);
  const fourthLabel = reunionCardLabel(fourth);
  const fifthLabel = reunionCardLabel(fifth);
  const timing = score >= 70
    ? `${fourthLabel} 흐름상 오늘 또는 2~3일 안에 질문 없는 짧은 안부가 가장 안전합니다.`
    : score >= 52
      ? `${fourthLabel} 흐름상 1~2주 뒤, 상대가 답하기 쉬운 시간대에 두 줄 이내로 닿는 편이 좋습니다.`
      : `${fourthLabel} 흐름상 지금은 기다림이 먼저이고, 자연스러운 계기가 생길 때만 짧게 움직이세요.`;
  const partnerState = `${secondLabel}의 장면처럼 상대 마음은 ${second.symbolMeaning || "겉표현과 속마음 사이의 조심스러운 흔들림"} 쪽으로 기울어 있습니다.`;
  const obstacle = `${thirdLabel}이 가리키는 장벽은 ${third.symbolMeaning || "감정 문제와 현실 부담이 함께 얽힌 단절 이유"}입니다.`;
  const standard = `${fifthLabel} 기준으로, ${fifth.advice || "지킬 약속 한 가지와 반복하지 않을 행동 한 가지를 먼저 정하세요."}`;
  const contactBySuit = dominantSuit === "cups"
    ? "감정은 남아도 답을 재촉하지 않는 따뜻한 간격이 필요합니다."
    : dominantSuit === "swords"
      ? "오해를 줄이는 짧은 문장이 긴 감정 설명보다 안전합니다."
      : dominantSuit === "wands"
        ? "첫 반응 뒤 속도를 올리지 않는 것이 핵심입니다."
        : "현실 일정과 부담을 낮춘 접촉이 먼저입니다.";
  const avoidNow = score < 58
    ? "장문 메시지, 답을 요구하는 추가 연락"
    : "재회를 결론으로 몰아가는 말, 과거 책임을 한 번에 추궁하는 대화";
  const oneLineAdvice = `${verdict}: ${firstLabel}의 남은 온도와 ${fifthLabel}의 회복 기준을 함께 보면, ${contactBySuit}`;

  return {
    reunionChanceLabel: oneLineAdvice,
    reunionChanceScore: score,
    partnerState: cleanReunionLanguage(partnerState),
    bestContactTiming: cleanReunionLanguage(timing),
    mainObstacle: cleanReunionLanguage(obstacle),
    oneLineAdvice: cleanReunionLanguage(standard),
    comprehensive: {
      reunionChanceVerdict: cleanReunionLanguage(`${verdict}: ${firstLabel}의 온기와 ${fifthLabel}의 조건이 함께 맞아야 열리는 흐름입니다.`),
      partnerEmotionTemperature: cleanReunionLanguage(partnerState),
      contactPossibility: cleanReunionLanguage(timing),
      shouldYouMoveFirst: score >= 58 ? "가벼운 첫 문장은 가능하지만, 답을 재촉하지 않는 간격이 필요합니다." : "먼저 움직이기보다 내 감정과 생활 리듬을 정리하는 시간이 우선입니다.",
      biggestVariable: cleanReunionLanguage(obstacle),
      avoidNow,
      finalOneLineAdvice: cleanReunionLanguage(standard),
    },
  };
}

function buildReunionFinalGuide({ score, positions }) {
  const fourth = positions[3] || {};
  const fifth = positions[4] || {};
  const shouldContactNow = score >= 58
    ? `${reunionCardLabel(fourth)} 기준으로 짧은 접촉은 가능하지만, 질문 없이 안부만 남기는 거리가 안전합니다.`
    : `${reunionCardLabel(fourth)} 기준으로 지금은 먼저 움직이기보다 다음 자연스러운 계기를 기다리는 편이 안전합니다.`;
  return {
    shouldContactNow: cleanReunionLanguage(shouldContactNow),
    messageExample: "문득 생각나서 안부만 남겨.\n부담 없이 편할 때 답해줘도 괜찮아.",
    avoidThis: "왜 답이 없냐고 묻는 말, 우리 다시 시작할 수 있냐고 바로 결론을 요구하는 말은 잠시 아껴두세요.",
    nextSevenDays: cleanReunionLanguage(`${reunionCardLabel(fifth)} 흐름처럼 7일 동안은 지킬 약속 한 가지와 반복하지 않을 행동 한 가지가 실제로 가능한지 먼저 확인하세요.`),
  };
}

function buildReunionSevenDayChecklist(positions) {
  const labels = ["1일차", "2일차", "3~4일차", "5~6일차", "7일차"];
  return positions.slice(0, 5).map((item, idx) => {
    const label = labels[idx] || `${idx + 1}일차`;
    return cleanReunionLanguage(`${label}: ${reunionCardLabel(item)} 기준으로 ${item.advice || "오늘 할 수 있는 행동 하나를 정하세요."}`);
  }).filter(Boolean);
}

function mapReunionReading(result) {
  const score = reunionScoreFromResult(result);
  const suitCount = { cups: 0, swords: 0, wands: 0, pentacles: 0, major: 0 };
  (result.cards || []).forEach((card) => {
    const code = asText(card?.cardCode || "").toUpperCase();
    if (code.startsWith("M")) {
      suitCount.major += 1;
      return;
    }
    const prefix = code.charAt(0);
    if (prefix === "C") suitCount.cups += 1;
    else if (prefix === "S") suitCount.swords += 1;
    else if (prefix === "W") suitCount.wands += 1;
    else if (prefix === "P") suitCount.pentacles += 1;
  });

  const dominantSuit = Object.entries({
    cups: suitCount.cups,
    swords: suitCount.swords,
    wands: suitCount.wands,
    pentacles: suitCount.pentacles,
  }).sort((a, b) => b[1] - a[1])[0]?.[0] || "cups";

  const suitHintByType = {
    cups: "그리움이 아직 진해서, 서두르기보다 마음을 안정시키는 대화가 먼저입니다.",
    swords: "생각과 경계심이 앞서 있어, 오해를 줄이는 말의 순서가 중요합니다.",
    wands: "감정의 파도가 큰 흐름이라, 속도 조절이 다시 닿은 뒤의 안정성을 좌우합니다.",
    pentacles: "현실 조건과 타이밍이 중요하니, 감정보다 실행 계획이 먼저 필요합니다.",
  };

  const majorHint = suitCount.major >= 2
    ? "메이저 카드가 많이 나와 이번 흐름은 단순한 안부보다 관계의 방향을 다시 정하는 전환점에 가깝습니다."
    : "메이저 영향이 과하지 않아, 생활 리듬과 말투를 바꾸는 작은 실천으로도 흐름을 바꿀 수 있습니다.";

  let positions = (result.cards || []).slice(0, 5).map((card, idx) => {
    const spec = REUNION_POSITION_BLUEPRINT[idx] || REUNION_POSITION_BLUEPRINT[REUNION_POSITION_BLUEPRINT.length - 1];
    const cardModel = getTarotCardByAnyId(card.cardCode || card.cardId);
    const orientation = card.orientation === "reversed" ? "reversed" : "upright";
    const section = enrichCardPositionMeaning(cardModel, spec, orientation, {
      order: idx + 1,
      suitHint: suitHintByType[dominantSuit] || "흐름의 결을 현실 행동으로 바꾸는 단계가 필요합니다.",
      majorHint,
    });

    return {
      ...section,
      positionTitle: section.title,
      cardName: section.cardNameKo,
    };
  });

  const diversity = validateTarotReadingDiversity(positions);
  if (!diversity.ok) {
    positions = positions.map((section, idx) => {
      const anchor = REUNION_POSITION_BLUEPRINT[idx] || REUNION_POSITION_BLUEPRINT[0];
      return {
        ...section,
        reunionInterpretation: cleanReunionLanguage(`${section.reunionInterpretation} ${anchor.title}에서는 ${withKoreanParticle(anchor.coreDirection || "이 자리의 질문", "object")} 다시 분리해 읽어야 합니다.`),
        caution: buildReunionCautionLine(anchor.key),
      };
    });
  }

  const summary = buildReunionSummary({ score, positions, dominantSuit });
  const opening = buildReunionOpening(score, dominantSuit);
  const finalGuide = buildReunionFinalGuide({ score, positions });
  const actionPlan = buildReunionSevenDayChecklist(positions);

  return {
    title: result.title,
    summary,
    positions,
    opening,
    pastBond: positions[0]?.detailedReading || "",
    theirNow: positions[1]?.detailedReading || "",
    outsideFactor: positions[2]?.detailedReading || "",
    theirHeart: positions[3]?.detailedReading || "",
    reunionOutcome: positions[4]?.detailedReading || "",
    lighthouseGuidance: removeRepeatedPhrases(`${result.combinationReading} ${suitHintByType[dominantSuit]} ${majorHint} 중요한 건 정답을 맞히는 것이 아니라, 서로의 마음이 안전해지는 속도로 다가가는 것입니다.`),
    finalGuide,
    actionPlan,
    parts: {
      prologue: opening,
      positionReadings: positions,
      preparation: [
        summary.reunionChanceLabel,
        summary.partnerState,
        summary.bestContactTiming,
        summary.mainObstacle,
        summary.oneLineAdvice,
        finalGuide.messageExample,
        finalGuide.avoidThis,
      ],
      sevenDayChecklist: actionPlan,
    },
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    finalAdviceText: summary.oneLineAdvice,
    diversity: validateTarotReadingDiversity(positions),
  };
}

const HEALING_POSITION_LABELS = ["마음이 지친 자리", "감정의 온도", "회복의 단서", "오늘의 회복 행동"];
const HEALING_POSITION_KEYS = ["hiddenTruth", "emotionAcceptance", "recoveryClue", "nextAction"];

// 카드별 회복 문장 정본은 sun-recovery-card-copy.mjs(78장 × 정/역 = 156엔트리).
// 아래 HEALING_SUIT_COPY는 그 테이블에 구멍이 생겼을 때만 쓰이는 방어용 폴백이며,
// scripts/verify-sun-recovery-card-copy.mjs가 실제 발동이 불가능함을 강제한다.
const HEALING_SUIT_COPY = {
  cups: {
    keywords: ["감정 정화", "온화한 수용", "마음의 옹달샘"],
    shortMessage: "차갑게 굳은 감정이 천천히 풀릴 수 있는 안전한 자리가 필요합니다.",
    meaning: "컵의 기운은 상처와 지친 마음을 억지로 덮거나 성급하게 지워내려 하지 말라고 말합니다. 슬픔이나 쓸쓸함도 내 마음이 지나온 흔적입니다. '그동안 많이 애썼구나' 하고 감정의 온도를 인정할 때, 마음의 결은 조금씩 부드러워집니다.",
    shadow: "타인의 기분과 상황을 먼저 살피느라 내 마음이 겪는 앓이를 너무 늦게 발견하곤 합니다.",
    recoveryAdvice: "오늘 스쳐 간 감정에 이름을 붙이고, 그 감정이 가장 바라는 작은 돌봄 하나를 조용히 건네 보세요.",
  },
  pentacles: {
    keywords: ["대지의 안전감", "몸의 회복", "작은 일상 루틴"],
    shortMessage: "회복은 생각을 더 밀어붙이는 일이 아니라, 몸의 리듬을 다시 돌보는 데서 시작됩니다.",
    meaning: "펜타클의 기운은 복잡한 생각보다 몸의 감각에 현실의 닻을 내리라고 말합니다. 따뜻한 차 한 잔을 천천히 마시거나, 방 한구석을 정돈하고, 편안한 잠자리를 만드는 손에 잡히는 행동들이 흩어진 마음을 다시 모아 줍니다.",
    shadow: "나아지는 결실이 당장 눈에 보이지 않는다고 해서 스스로의 가치와 노력을 쉽게 깎아내리기 쉽습니다.",
    recoveryAdvice: "복잡한 생각은 잠시 내려두고, 내 몸이 편안함을 느낄 작은 공간 정리나 가벼운 스트레칭을 10분만 해 보세요.",
  },
  swords: {
    keywords: ["마음의 여백", "해석의 분리", "고요한 시선"],
    shortMessage: "생각의 거품을 걷어내면, 상처 뒤에 남은 사실의 윤곽이 조금 더 맑아집니다.",
    meaning: "검의 카드는 불안과 상처가 해로운 상상으로 커지지 않도록, 냉철하지만 다정한 관찰자가 되어야 한다고 말합니다. 머릿속의 모든 걱정이 진실은 아닙니다. 상상이 보태는 두려움을 걷어내고 있는 그대로의 사실을 바라볼 때, 마음은 다시 숨 쉴 자리를 찾습니다.",
    shadow: "생각이 꼬리를 물수록 아직 다가오지 않은 최악의 시나리오를 지어내 스스로를 다치게 만들기 쉽습니다.",
    recoveryAdvice: "노트에 '내가 본 실제 사실'과 '마음이 덧붙인 걱정'을 한 줄씩 나누어 적으며 마음의 과열을 식혀 보세요.",
  },
  wands: {
    keywords: ["부드러운 열기", "에너지 보존", "다정한 쉼표"],
    shortMessage: "열정의 불꽃은 꺼진 것이 아니라, 지금은 그 온기를 조심히 지켜야 할 때입니다.",
    meaning: "완드의 기운은 무언가를 이루고 싶은 열망과 누적된 피로가 함께 올라온 상태를 비춥니다. 의욕이 사라진 것이 아니라 에너지가 소진된 것에 가깝습니다. 스스로를 다그쳐 다시 뛰게 만들기보다, 가장 편안한 속도로 힘을 채워야 합니다.",
    shadow: "마음이 조급할수록 신체적 피로를 무시하고 섣부른 행동이나 계획을 앞세워 에너지를 소모해 버리기 쉽습니다.",
    recoveryAdvice: "해야 할 일의 긴 목록에서 오늘은 단 하나만 고르고, 남은 시간에는 목적 없는 쉼을 허락해 보세요.",
  },
  major: {
    keywords: ["삶의 거대한 계절", "내면의 나침반", "자연스러운 탈바꿈"],
    shortMessage: "지금의 고단함은 흠집이 아니라, 마음의 계절이 조용히 바뀌고 있다는 신호일 수 있습니다.",
    meaning: "메이저 아르카나는 지금 마주한 내면의 진통이 무의미한 방황만은 아니라고 비춥니다. 삶이 한 단계 더 성숙한 리듬으로 넘어가려 할 때, 마음은 잠시 낯선 무게를 느낄 수 있습니다. 고치거나 서두르려 하지 마세요. 계절이 흐르듯, 회복에도 자기만의 속도가 있습니다.",
    shadow: "상황의 의미를 너무 크고 무겁게 받아들여, 오늘 당장 실천할 수 있는 소박한 회복의 한 걸음을 주저하기 쉽습니다.",
    recoveryAdvice: "큰 변화의 의미를 오늘 다 해석하려 들지 말고, 지금 내 마음이 덜 다칠 수 있는 작은 선택 하나를 먼저 고르세요.",
  },
};

function healingSuitKey(card) {
  const id = asText(card?.cardId || card?.cardCode).toLowerCase();
  const en = asText(card?.cardNameEn).toLowerCase();
  if (id.startsWith("major_") || en.startsWith("the ")) return "major";
  if (id.includes("cups") || en.includes("cup")) return "cups";
  if (id.includes("pentacles") || en.includes("pentacle")) return "pentacles";
  if (id.includes("swords") || en.includes("sword")) return "swords";
  if (id.includes("wands") || en.includes("wand")) return "wands";
  return "major";
}

function cleanHealingLanguage(text) {
  return dedupeSentences(asText(text)
    .replace(/은\(는\)/g, "은")
    .replace(/\u0e41\u0e25\u0e30/g, "과")
    .replace(/아니에요/g, "아닙니다")
    .replace(/괜찮아요/g, "괜찮습니다")
    .replace(/흘러가 볼게요/g, "흘러가도 좋습니다")
    .replace(/뿐이랍니다/g, "뿐입니다")
    .replace(/존재해 줄게요/g, "존재해도 좋습니다")
    .replace(/토닥여 줍니다/g, "차분히 확인합니다")
    .replace(/사르르 녹여줄/g, "천천히 풀어 줄")
    .replace(/영혼/g, "마음")
    .replace(/숭고한/g, "깊은")
    .replace(/아름다운 국면/g, "조용한 전환점")
    .replace(/서슬 퍼런/g, "날카로운")
    .replace(/구원하기 위해/g, "달래기 위해")
    .replace(/나지막이 읊조려/g, "조용히 건네")
    .replace(/가만히 미소 짓게 만드는/g, "작게 안심하게 하는")
    .replace(/온전히 음미/g, "천천히 확인")
    .replace(/단서은/g, "단서는")
    .replace(/제안은 ([^.]+)\.입니다\./g, "제안은 $1.")
    .replace(/입니다\.입니다\./g, "입니다.")
    .replace(/마음의 결로는/g, "마음의 결은")
    .replace(/흐름이 보이지만, 이 부분은/g, "이 흐름은")
    .replace(/치유 행동/g, "회복 행동")
    .replace(/치유/g, "회복")
    .replace(/자존감 관점에서는/g, "마음 회복의 관점에서는")
    .replace(/타인 반응을 내 가치와 분리하는 경계 훈련/g, "타인의 반응과 내 가치를 분리해 마음의 경계를 세우는 연습")
    .replace(/오늘 가능한 실행 단위를 작게 설정하고 끝까지 완료하세요\./g, "오늘 가능한 회복 장면을 작게 정하고 편안히 마무리해 보세요.")
    .replace(/작은 실천/g, "작은 회복 루틴")
    .replace(/짧은 실행/g, "작은 회복 행동")
    .replace(/\s+/g, " ")
    .trim());
}

// 회복 문장 조회 키는 카드 코드다. 과거에는 영문 카드명("Three of Swords")으로 찾았는데,
// 표기가 조금만 달라도 조용히 폴백으로 새기 때문에 코드 조회로 바꿨다.
function healingCardCode(card) {
  const direct = asText(card?.cardCode).toUpperCase();
  if (SUN_RECOVERY_CARD_COPY[direct]) return direct;
  const resolved = getTarotCardByAnyId(card?.cardId || card?.cardCode);
  return asText(resolved?.code).toUpperCase();
}

function healingCardCopy(card) {
  const orientation = card?.orientation === "reversed" ? "reversed" : "upright";
  const exact = SUN_RECOVERY_CARD_COPY[healingCardCode(card)]?.[orientation];
  if (exact) return { ...exact, authored: true };
  const base = HEALING_SUIT_COPY[healingSuitKey(card)] || HEALING_SUIT_COPY.major;
  const directionText = orientation === "reversed"
    ? "역방향은 마음이 늦어졌다는 뜻이 아니라, 지금은 속도와 경계를 다시 맞추라는 부드러운 신호입니다."
    : "정방향은 이미 회복을 향한 작은 빛이 켜져 있으며, 그 빛을 현실의 행동으로 옮길 수 있음을 비춥니다.";
  return {
    keywords: base.keywords,
    shortMessage: base.shortMessage,
    meaning: `${base.meaning} ${directionText}`,
    shadow: base.shadow,
    recoveryAdvice: base.recoveryAdvice,
    authored: false,
  };
}

function buildHealingCardReading(card, idx) {
  const copy = healingCardCopy(card);
  const cardName = asText(card?.cardNameKo) || `카드 ${idx + 1}`;
  const orientation = card?.orientation === "reversed" ? "reversed" : "upright";
  const orientationLabelText = orientation === "reversed" ? "역방향" : "정방향";
  const keywords = Array.from(new Set([...(copy.keywords || []), ...((card?.keywords || []).map((item) => asText(item)).filter(Boolean))])).slice(0, 3);
  // 집필된 회복 문장(sun-recovery-card-copy.mjs)은 이미 카드 고유이므로 core를 덧붙이지 않는다.
  // 폴백으로 내려온 경우에만 수트 공용 문단의 획일성을 core로 보정한다.
  // card.meaning.advice는 재회·자존감 오버라이드에 전역 오염되므로 어느 경로에서도 참조하지 않는다.
  const cardCore = copy.authored ? "" : asText(card?.coreMeaning || card?.meaning?.coreMeaning);
  return {
    position: HEALING_POSITION_KEYS[idx] || `position_${idx + 1}`,
    positionLabel: HEALING_POSITION_LABELS[idx] || asText(card?.positionLabel) || `카드 ${idx + 1}`,
    cardName,
    cardNameEn: asText(card?.cardNameEn),
    orientation,
    orientationLabel: orientationLabelText,
    keywords,
    shortMessage: cleanHealingLanguage(copy.shortMessage),
    meaning: cleanHealingLanguage(cardCore ? `${copy.meaning} ${cardCore}` : copy.meaning),
    shadow: cleanHealingLanguage(copy.shadow),
    recoveryAdvice: cleanHealingLanguage(copy.recoveryAdvice),
  };
}

function healingCardDeepDiveText(item, idx) {
  return cleanHealingLanguage(`${idx + 1}. ${item.positionLabel} - ${item.cardName} ${item.orientationLabel}: ${item.meaning} 조심히 살필 부분은 ${item.shadow} 오늘의 회복 행동은 ${item.recoveryAdvice}`);
}

// 수트별 회복 루틴. 정방향이 많은 수트는 채우는 쪽(upright), 역방향이 많은 수트는
// 덜어내는 쪽(reversed) 루틴을 준다. 같은 수트가 몰려 나와도 두 변형이 서로 달라
// 화면에 동일한 루틴이 두 번 뜨지 않는다.
const HEALING_SUIT_ROUTINES = {
  cups: {
    upright: {
      title: "감정에 이름 붙이기",
      description: "정리되지 않은 기분은 이름이 붙는 순간 크기가 줄어듭니다.",
      action: "오늘 스쳐 간 감정 세 가지를 단어로만 적고, 왜 그랬는지는 설명하지 마세요.",
      timeGuide: "7분",
    },
    reversed: {
      title: "고인 감정 흘려보내기",
      description: "오래 눌러 둔 감정은 표현할 자리를 만들어야 빠져나갑니다.",
      action: "누구에게도 보내지 않을 메모장을 열어, 하고 싶었던 말을 검열 없이 끝까지 적으세요.",
      timeGuide: "10분",
    },
  },
  swords: {
    upright: {
      title: "사실과 걱정 나누기",
      description: "머릿속 해석이 커질 때 회복의 기준선을 다시 세웁니다.",
      action: "종이를 반으로 나눠 '내가 실제로 본 것'과 '내가 걱정한 것'을 한 줄씩 옮겨 적으세요.",
      timeGuide: "7분",
    },
    reversed: {
      title: "확인 멈추는 시간",
      description: "반복 확인은 안심을 주지 못하고 불안만 유지시킵니다.",
      action: "자꾸 들여다보게 되는 것 하나를 정해, 정해진 시각까지 한 번도 열지 않기로 하세요.",
      timeGuide: "2시간",
    },
  },
  wands: {
    upright: {
      title: "몸부터 깨우기",
      description: "생각이 엉킬 때는 몸을 먼저 움직이는 편이 빠릅니다.",
      action: "자리에서 일어나 집 밖이나 복도를 천천히 걷고, 걷는 동안 결정은 하지 마세요.",
      timeGuide: "10분",
    },
    reversed: {
      title: "오늘 할 일 덜어내기",
      description: "의욕이 나지 않을 때 필요한 것은 동기가 아니라 분량 축소입니다.",
      action: "오늘 목록에서 미뤄도 되는 항목 하나를 실제로 지우고, 지운 뒤 다시 넣지 마세요.",
      timeGuide: "5분",
    },
  },
  pentacles: {
    upright: {
      title: "공간 한 칸 정리",
      description: "손에 잡히는 변화가 흩어진 마음을 다시 모아 줍니다.",
      action: "책상 위나 눈에 거슬리던 한 곳만 정리하고, 나머지 구역은 그대로 두세요.",
      timeGuide: "10분",
    },
    reversed: {
      title: "무너진 기본 되돌리기",
      description: "잠과 끼니가 흐트러지면 어떤 회복법도 잘 듣지 않습니다.",
      action: "잠·식사·물 중 가장 무너진 하나를 골라, 오늘은 그것만 제대로 챙기세요.",
      timeGuide: "오늘 중",
    },
  },
  major: {
    upright: {
      title: "하루의 크기 줄이기",
      description: "큰 의미를 붙이려 할수록 오늘 할 수 있는 일이 멀어집니다.",
      action: "지금 상황의 의미를 해석하는 대신, 오늘 안에 끝날 일 하나만 정해 마무리하세요.",
      timeGuide: "15분",
    },
    reversed: {
      title: "큰 결정 미뤄 두기",
      description: "지친 상태에서 내린 결정은 대개 다시 되돌리게 됩니다.",
      action: "고민 중인 큰 결정 하나에 '언제까지 판단하지 않는다'는 기한을 적어 두세요.",
      timeGuide: "5분",
    },
  },
};

function buildHealingRoutines(cardReadings, cards = []) {
  // 뽑힌 카드의 수트 분포와 방향 비율로 루틴을 고른다. 카드가 달라지면 루틴도 달라져야 한다.
  const stats = new Map();
  cards.slice(0, 4).forEach((card, idx) => {
    const suit = healingSuitKey(card);
    const entry = stats.get(suit) || { suit, count: 0, reversed: 0, firstIdx: idx };
    entry.count += 1;
    if ((cardReadings[idx]?.orientation || card?.orientation) === "reversed") entry.reversed += 1;
    stats.set(suit, entry);
  });

  const ranked = Array.from(stats.values()).sort((a, b) => b.count - a.count || a.firstIdx - b.firstIdx);
  const pickRoutine = (entry, flip) => {
    const pool = HEALING_SUIT_ROUTINES[entry.suit] || HEALING_SUIT_ROUTINES.major;
    const leansReversed = entry.reversed * 2 > entry.count;
    const variant = flip ? (leansReversed ? "upright" : "reversed") : (leansReversed ? "reversed" : "upright");
    return pool[variant];
  };

  const routines = [];
  if (ranked[0]) routines.push(pickRoutine(ranked[0], false));
  // 두 번째 수트가 없으면(같은 수트만 나온 경우) 첫 수트의 반대 변형으로 채운다.
  if (ranked[1]) routines.push(pickRoutine(ranked[1], false));
  else if (ranked[0]) routines.push(pickRoutine(ranked[0], true));

  const finalAdvice = cardReadings[3]?.recoveryAdvice || cardReadings[0]?.recoveryAdvice;
  const finalCardName = asText(cardReadings[3]?.cardName || cardReadings[0]?.cardName);
  if (finalAdvice) {
    routines.push({
      title: finalCardName ? `오늘의 회복 행동 · ${finalCardName}` : "오늘의 회복 행동",
      description: "마지막 카드가 가리킨, 오늘 무리 없이 시작할 수 있는 한 걸음입니다.",
      action: finalAdvice,
      timeGuide: "오늘 중",
    });
  }

  // 카드 정보가 비어 있는 예외 상황에서도 최소 한 개는 남긴다.
  if (!routines.length) routines.push(HEALING_SUIT_ROUTINES.major.upright);
  return routines.slice(0, 3);
}

function mapHealingReading(result) {
  const cards = Array.isArray(result.cards) ? result.cards.slice(0, 4) : [];
  const cardReadings = cards.map((card, idx) => buildHealingCardReading(card, idx));
  const cardDeepDive = cardReadings.map((item, idx) => healingCardDeepDiveText(item, idx));
  const cardFlow = cardReadings.map((item) => `${item.cardName} ${item.orientationLabel}`).filter(Boolean).join(" → ");
  const oneLineMessage = cleanHealingLanguage(cardReadings[0]?.shortMessage || "지친 마음의 온도를 가만히 살피고, 서두르지 않는 새벽빛으로 하루를 안아줄 시간이에요.");
  const storyFlow = cleanHealingLanguage(`이번 리딩은 ${cardFlow || "네 장의 카드"}가 그리는 새벽빛의 흐름을 따라갑니다. 첫 번째 카드는 마음이 지친 자리를 비추고, 두 번째 카드는 밀어내지 않아도 되는 감정의 온도를 확인합니다. 세 번째 카드는 다시 따뜻해질 수 있는 단서를 열어 주며, 마지막 카드는 오늘 무리 없이 시작할 작은 회복 행동을 알려줍니다. 억지로 고치려 애쓰기보다, 지금 가능한 만큼만 빛을 들이는 것이 핵심입니다.`);
  const recoveryRoutines = buildHealingRoutines(cardReadings, cards);
  const actionPlan = recoveryRoutines.map((item) => `${item.title}: ${item.action}`);
  const finalAdvice = cleanHealingLanguage(cardReadings[3]?.recoveryAdvice || cardReadings[0]?.recoveryAdvice || "오늘 하루만큼은 자신을 매섭게 몰아세우지 말고, 따뜻한 차 한 잔을 곁에 둔 사람처럼 편안하고 다정하게 머물러 보세요.");

  return {
    title: "태양 회복 타로",
    subtitle: "마음의 흔적을 억지로 지우기보다, 그 자리에 조용히 새벽빛을 들이는 회복 리딩",
    oneLineMessage,
    sunLine: oneLineMessage,
    summary: oneLineMessage,
    opening: cleanHealingLanguage("오늘의 카드는 지친 마음을 섣불리 고치거나 다그치지 않습니다. 오래 머물렀던 어두운 구석에 부드러운 햇살을 비추고, 지금 편안하게 숨 쉴 수 있는 작은 온기를 건넵니다."),
    cardReadings,
    cardDeepDive,
    hiddenTruth: cardReadings[0]?.meaning || "",
    embracePain: cardReadings[1]?.meaning || "",
    silverLining: cardReadings[2]?.meaning || "",
    stepForward: cardReadings[3]?.meaning || "",
    storyFlow,
    integrationMessage: storyFlow,
    recoveryRoutines,
    actionPlan,
    affirmation: cleanHealingLanguage("오늘만큼은 나를 다그치지 않고, 흔들리는 마음까지 내 편으로 두겠습니다."),
    notice: "이 리딩은 타로 상징을 바탕으로 한 정서적 안내입니다. 의료, 심리 치료, 법률·재정 판단을 대신하지 않습니다.",
    finalAdvice,
    cardSections: result.cardSections,
    combinations: result.combinations,
    finalAdviceText: finalAdvice,
  };
}

function cleanYearlyLanguage(text) {
  return removeRepeatedTarotPhrases(asText(text)
    .replace(/오늘 가능한 실행 단위를 작게 설정하고 끝까지 완료하세요\./g, "이번 달에는 욕심낸 계획보다 끝까지 지킬 한 가지 약속을 먼저 세워 보세요.")
    .replace(/작은 실천을 꾸준히 이어가다 보면 자신에 대한 믿음이 조금씩 회복됩니다\./g, "반복 가능한 루틴이 쌓일수록 월운의 힘이 안정됩니다.")
    .replace(/자존감 관점에서는 타인 반응을 내 가치와 분리하는 경계 훈련이 핵심입니다\./g, "월운의 관점에서는 주변 반응보다 내가 지킬 기준을 먼저 세우는 일이 중요합니다.")
    .replace(/감각와/g, "감각의 기운과")
    .replace(/기운와/g, "기운과")
    .replace(/([가-힣]+)\.라는 결/g, "$1라는 결")
    .replace(/\s+/g, " ")
    .trim());
}

const YEARLY_SUIT_FLOW = {
  cups: {
    label: "컵",
    annual: "관계의 진심, 선택의 감정값, 미뤄 둔 마음 정리가 한 해를 관통합니다.",
    upright: "감정과 관계의 물길이 바깥으로 흐르며 선택을 부드럽게 엽니다.",
    reversed: "감정적 기대와 현실 감각이 어긋난 지점을 정리하게 합니다.",
  },
  wands: {
    label: "완드",
    annual: "실행력, 이동, 도전의 속도가 한 해의 문을 자주 두드립니다.",
    upright: "행동의 불씨가 빠르게 살아나며 먼저 움직일 명분을 만듭니다.",
    reversed: "의욕은 있으나 방향이 흩어져 속도 조절과 재점화가 필요합니다.",
  },
  swords: {
    label: "소드",
    annual: "말, 판단, 계약, 정보 정리가 올해의 승패를 가르는 축이 됩니다.",
    upright: "생각과 말이 선명해져 결정을 자르는 힘이 살아납니다.",
    reversed: "해석이 날카로워지거나 늦어져 사실 확인이 먼저 요구됩니다.",
  },
  pentacles: {
    label: "펜타클",
    annual: "돈, 몸, 일상 루틴, 지속 가능한 기반이 한 해의 실제 결과를 만듭니다.",
    upright: "현실 기반이 단단해지고 손에 잡히는 결과가 쌓입니다.",
    reversed: "돈과 몸, 일정의 기반이 느슨해져 재정비가 먼저 필요합니다.",
  },
  major: {
    label: "메이저",
    annual: "개인의 습관을 넘어 삶의 방향, 관계 이름, 책임 구조가 바뀌는 해입니다.",
    upright: "삶의 큰 문이 열리며 선택 하나가 다음 국면을 바꿉니다.",
    reversed: "알고도 미룬 전환이 안쪽에서 압력을 키웁니다.",
  },
  minor: {
    label: "타로",
    annual: "일상 선택과 관계 반응이 한 해의 실제 흐름을 촘촘히 만듭니다.",
    upright: "상징이 비교적 선명하게 드러나 현실 행동으로 이어집니다.",
    reversed: "상징이 안쪽으로 접혀 점검과 회복의 시간을 요구합니다.",
  },
};

const YEARLY_RANK_FLOW = {
  1: "새 씨앗을 어디에 심을지 고르는 문제",
  2: "두 선택 사이 균형을 잡는 문제",
  3: "협력과 확장을 현실로 옮기는 문제",
  4: "안정과 고착을 구분하는 문제",
  5: "갈등과 결핍을 직면하는 문제",
  6: "회복과 이동의 방향을 찾는 문제",
  7: "많은 신호 속에서 진짜 선택을 가려내는 문제",
  8: "반복과 속도를 조절하는 문제",
  9: "응축된 결과를 다루는 문제",
  10: "한 주기의 마감과 책임을 정리하는 문제",
  11: "작은 소식과 배움의 태도를 다루는 문제",
  12: "움직임의 속도와 제안 방식을 고르는 문제",
  13: "돌봄과 수용의 경계를 세우는 문제",
  14: "책임과 결단을 현실에 고정하는 문제",
};

const YEARLY_ZODIAC_LEAD = {
  쥐: "눈치 빠른 쥐의 달",
  소: "느리게 쌓는 소의 달",
  호랑이: "돌파를 부르는 호랑이의 달",
  토끼: "섬세하게 조율하는 토끼의 달",
  용: "크게 확장되는 용의 달",
  뱀: "깊은 직관이 깨어나는 뱀의 달",
  말: "속도와 자유가 살아나는 말의 달",
  양: "감수성과 협력이 부드러워지는 양의 달",
  원숭이: "기지와 변통이 시험받는 원숭이의 달",
  닭: "분석과 정리가 날카로워지는 닭의 달",
  개: "신뢰와 경계가 함께 서는 개의 달",
  돼지: "풍요와 마무리가 맞물리는 돼지의 달",
};

const YEARLY_ADVICE_ACTION = {
  쥐: "선택지 목록을 꺼내 실제로 잡을 수 있는 것과 흘려보낼 것을 표시하세요.",
  소: "일정, 예산, 체력처럼 반복 관리할 항목을 한 표에 모아 월말까지 추적하세요.",
  호랑이: "바로 실행할 일 하나와 멈춰야 할 일 하나를 정해 행동 순서를 분리하세요.",
  토끼: "대화가 필요한 사람에게 짧은 확인 문장을 먼저 보내고 추측은 기록에서 지우세요.",
  용: "크게 벌릴 일은 목표, 비용, 책임자를 한 줄씩 적은 뒤 시작하세요.",
  뱀: "혼자 품은 의심이나 집착은 사실, 추측, 바람으로 나누어 적으세요.",
  말: "이동, 약속, 업무량을 줄 세우고 가장 늦춰도 되는 일부터 덜어내세요.",
  양: "감정적으로 끌리는 선택과 실제로 감당 가능한 선택을 따로 적어 비교하세요.",
  원숭이: "새 방법을 쓰되 세 번 이상 반복할 수 있는 절차인지 먼저 확인하세요.",
  닭: "검토 기준을 세 가지로 제한하고, 그 기준을 넘으면 결정을 더 미루지 마세요.",
  개: "불안한 약속은 말로 넘기지 말고 날짜, 역할, 답변 기한을 확인하세요.",
  돼지: "마무리할 일, 나눌 것, 다음 달로 넘길 것을 세 칸으로 정리하세요.",
};

function yearlyDominantSuitMeaning(suit) {
  return (YEARLY_SUIT_FLOW[suit] || YEARLY_SUIT_FLOW.minor).annual;
}

function yearlyMonthReason(month) {
  const card = month?.mainCard || {};
  const suit = asText(card.suit).toLowerCase();
  const flow = YEARLY_SUIT_FLOW[suit] || YEARLY_SUIT_FLOW.minor;
  const cardName = asText(card.nameKo || card.cardNameKo || "메인 카드");
  const orientationText = card.orientation === "reversed" ? "역방향" : "정방향";
  const animal = asText(month?.zodiacAnimal || month?.monthLabel || "이 달");
  return `${animal}의 흐름과 ${cardName} ${orientationText}이 만나 ${yearlyNominalize(card.orientation === "reversed" ? flow.reversed : flow.upright)}`;
}

function yearlyCardCode(card) {
  return asText(card?.cardCode || card?.cardId || card?.code || card?.id).toUpperCase();
}

function yearlyCardName(card) {
  return asText(card?.cardNameKo || card?.nameKo || card?.nameKr || card?.name || card?.cardNameEn || card?.nameEn || "이 카드");
}

function yearlyCardMeta(card) {
  const code = yearlyCardCode(card);
  const parsed = parseRelationshipCardMeta({ code });
  const suit = parsed.suit && parsed.suit !== "minor"
    ? parsed.suit
    : asText(card?.meaning?.suit || card?.suit || "minor").toLowerCase();
  return { ...parsed, code, suit: YEARLY_SUIT_FLOW[suit] ? suit : parsed.suit };
}

function yearlyCardSymbol(card, meta, orientation) {
  const code = meta.code;
  const cardName = yearlyCardName(card);
  const direct = REUNION_CARD_SYMBOLS[code] || REUNION_MAJOR_FALLBACK_SYMBOLS[code];
  const suitInfo = YEARLY_SUIT_FLOW[meta.suit] || YEARLY_SUIT_FLOW.minor;
  const rankScene = REUNION_RANK_FALLBACK[meta.rank] || `${cardName}의 그림 속 인물과 상징이 이달의 선택을 드러냅니다.`;
  const scene = asText(direct?.scene) || rankScene;
  const rankMeaning = YEARLY_RANK_FLOW[meta.rank] || "상징이 놓인 자리의 선택을 다루는 문제";
  const directionMeaning = orientation === "reversed" ? suitInfo.reversed : suitInfo.upright;
  return {
    scene,
    meaning: meta.isMajor ? directionMeaning : `${rankMeaning}와 ${directionMeaning}`,
  };
}

function yearlyInlineScene(scene) {
  return asText(scene)
    .replace(/[.!?。]+$/u, "")
    .replace(/있습니다$/u, "있는")
    .replace(/입니다$/u, "인");
}

function yearlyNominalize(text) {
  return asText(text)
    .replace(/[.!?。]+$/u, "")
    .replace(/바꿉니다$/u, "바꾸는 흐름")
    .replace(/엽니다$/u, "여는 흐름")
    .replace(/만듭니다$/u, "만드는 흐름")
    .replace(/요구합니다$/u, "요구하는 흐름")
    .replace(/필요합니다$/u, "필요한 흐름")
    .replace(/합니다$/u, "하는 흐름")
    .replace(/됩니다$/u, "되는 흐름")
    .replace(/입니다$/u, "인 흐름");
}

function yearlyZodiacDynamic(zodiac, meta, orientation, cardName) {
  const animal = zodiac?.animal || "십이지신";
  const reversed = orientation === "reversed";
  const suitLabel = (YEARLY_SUIT_FLOW[meta.suit] || YEARLY_SUIT_FLOW.minor).label;
  const table = {
    쥐: reversed
      ? ["보완", `쥐의 빠른 감지력은 ${cardName}의 굴절된 ${suitLabel} 신호 속에서 잡을 것과 버릴 것을 구분하게 합니다.`]
      : ["공명", `쥐의 기회 포착력은 ${cardName}의 ${suitLabel} 흐름을 빠르게 읽어 첫 행동으로 옮기게 합니다.`],
    소: reversed
      ? ["보완", `소의 인내는 ${cardName} 역방향을 정체가 아니라 천천히 익히는 숙성의 시간으로 바꿉니다.`]
      : ["공명", `소의 축적 본능은 ${cardName}의 흐름을 오래 유지할 현실 기반으로 굳힙니다.`],
    호랑이: reversed
      ? ["충돌", `호랑이의 돌파력은 ${cardName} 역방향의 제동과 부딪혀 충동을 다루라는 압박을 만듭니다.`]
      : ["공명", `호랑이의 용기는 ${cardName}의 전진 신호와 맞물려 과감한 선택을 밀어 올립니다.`],
    토끼: meta.suit === "swords"
      ? ["충돌", `토끼의 회피 본능은 ${cardName}의 소드성 판단과 부딪혀 말하지 않은 갈등을 드러냅니다.`]
      : ["보완", `토끼의 조율 감각은 ${cardName}의 흐름을 부드러운 대화와 관계 회복으로 낮춰 줍니다.`],
    용: meta.isMajor
      ? ["공명", `용의 확장성은 ${cardName}의 큰 전환과 공명해 삶의 방향을 키우는 결정을 부릅니다.`]
      : ["충돌", `용의 과잉 확장은 ${cardName}의 현실 신호를 크게 부풀릴 수 있어 크기보다 기준을 먼저 보게 합니다.`],
    뱀: reversed
      ? ["충돌", `뱀의 깊은 직관은 ${cardName} 역방향과 만나 집착으로 굳기 쉬우니 사실 확인이 필요합니다.`]
      : ["공명", `뱀의 은밀한 지혜는 ${cardName}의 상징을 안쪽에서 읽어 숨은 변수를 찾아냅니다.`],
    말: meta.suit === "pentacles"
      ? ["충돌", `말의 속도감은 ${cardName}의 펜타클 현실성과 부딪혀 먼저 기반을 점검하게 합니다.`]
      : ["공명", `말의 자유로운 움직임은 ${cardName}의 흐름을 빠른 전개와 외부 활동으로 넓힙니다.`],
    양: meta.suit === "cups" && reversed
      ? ["충돌", `양의 감수성은 ${cardName} 역방향의 눌린 감정과 부딪혀 표현을 미루게 만들 수 있습니다.`]
      : ["보완", `양의 부드러운 감성은 ${cardName}의 상징을 창의적 협력과 생활 안정으로 다듬습니다.`],
    원숭이: meta.suit === "swords"
      ? ["공명", `원숭이의 기지는 ${cardName}의 판단력과 맞물려 영리한 돌파구를 찾습니다.`]
      : ["충돌", `원숭이의 산만함은 ${cardName}의 흐름을 여러 갈래로 흩을 수 있어 선택을 좁혀야 합니다.`],
    닭: reversed
      ? ["충돌", `닭의 분석 본능은 ${cardName} 역방향과 만나 과잉 검토로 결정이 늦어질 수 있습니다.`]
      : ["보완", `닭의 예리함은 ${cardName}의 상징을 정리해 실행 기준을 분명히 세웁니다.`],
    개: reversed
      ? ["충돌", `개의 경계심은 ${cardName} 역방향과 만나 의심과 불안을 키울 수 있어 약속 확인이 중요합니다.`]
      : ["공명", `개의 신뢰감은 ${cardName}의 흐름을 오래 지킬 약속과 보호 본능으로 연결합니다.`],
    돼지: meta.suit === "cups"
      ? ["공명", `돼지의 풍요로운 마무리는 ${cardName}의 컵 흐름과 만나 감정 정산을 부드럽게 돕습니다.`]
      : ["보완", `돼지의 관대함은 ${cardName}의 흐름을 한 해의 결실과 다음 준비로 정리합니다.`],
  };
  const picked = table[animal] || ["보완", `${animal}의 월운은 ${cardName}의 상징을 이달 생활 조건에 맞게 조율합니다.`];
  return { type: picked[0], text: picked[1] };
}

function buildYearlyCoreSentence({ monthLabel, zodiac, cardName, orientationText, symbol, dynamic }) {
  const lead = YEARLY_ZODIAC_LEAD[zodiac.animal] || `${zodiac.animal || monthLabel}의 달`;
  const meaning = yearlyNominalize(symbol.meaning);
  const ending = dynamic.type === "충돌"
    ? "서두르기 전에 속도와 기준을 따로 세울 시간입니다."
    : dynamic.type === "공명"
      ? "잡아야 할 신호가 비교적 선명하게 떠오르는 시간입니다."
      : "부족한 결을 보완하며 현실적인 선택을 고를 시간입니다.";
  return cleanYearlyLanguage(`${lead}에 ${cardName} ${orientationText}의 장면이 열립니다. ${meaning}이 ${monthLabel}의 중심에 놓이니, ${ending}`);
}

function buildYearlyZodiacReading({ zodiac, cardName, orientationText, symbol, dynamic, orientation }) {
  const scene = yearlyInlineScene(symbol.scene);
  const directionLine = orientation === "reversed"
    ? `${cardName} 역방향은 상징이 곧장 움직이지 못하고 지연되거나 안쪽으로 접히는 흐름입니다.`
    : `${cardName} 정방향은 상징이 비교적 바깥으로 드러나 실행과 선택을 밀어 줍니다.`;
  return cleanYearlyLanguage(`${dynamic.type}의 역학입니다. ${dynamic.text} 카드 그림에는 ${scene} 모습이 나타나고, ${directionLine} ${zodiac.animal}의 ${zodiac.theme}은 이 장면을 한 달의 생활 리듬으로 끌어내립니다.`);
}

function buildYearlyTriadReading({ zodiac, cardName, symbol, dynamic, orientation }) {
  const scene = yearlyInlineScene(symbol.scene);
  const mid = orientation === "reversed"
    ? `과정에서는 ${zodiac.animal}의 달에 미뤄 둔 판단과 ${cardName}의 잔상이 먼저 올라옵니다.`
    : `과정에서는 ${zodiac.animal}의 달답게 작은 실행이 다음 신호를 부르고 ${cardName}의 윤곽이 월중부터 또렷해집니다.`;
  const end = dynamic.type === "충돌"
    ? `${cardName}의 결과는 성급한 확정보다 수정 가능한 결론에 가깝고, 남겨 둘 것과 멈출 것을 나누며 마무리됩니다.`
    : dynamic.type === "공명"
      ? `${cardName}의 결과는 처음 포착한 신호가 현실 행동으로 이어지며 한 가지 문을 더 또렷하게 엽니다.`
      : `${cardName}의 결과는 부족했던 기준을 보완하고 다음 달로 넘길 힘을 차분히 남깁니다.`;
  return cleanYearlyLanguage(`원인은 ${zodiac.animal}의 ${zodiac.theme}이 ${cardName}의 상징을 월초부터 자극하기 때문입니다. 월중에는 ${scene} 모습처럼 흐름의 초점이 좁혀집니다. ${mid} ${end}`);
}

function buildYearlyDomainReadings({ zodiac, cardName, symbol, meta, orientation, enriched = {} }) {
  const suit = YEARLY_SUIT_FLOW[meta.suit] || YEARLY_SUIT_FLOW.minor;
  const reversed = orientation === "reversed";
  const scene = yearlyInlineScene(symbol.scene);
  // 개선된 카드 데이터의 도메인별 해석(정/역방향)을 십이지 템플릿에 이어 붙인다.
  const withEnriched = (base, line) => cleanYearlyLanguage(asText(line) ? `${base} ${asText(line)}` : base);
  const relationshipTail = reversed
    ? `${zodiac.animal}의 달에는 답을 재촉하기 전 기대한 장면과 확인된 사실을 분리하세요.`
    : `${zodiac.animal}의 달에는 다가갈 사람에게 길게 설명하지 말고 확인할 약속 하나만 건네세요.`;
  const relationship = withEnriched(`${scene} 모습은 관계에서 상대를 상상으로 채우기보다 실제 말과 행동을 놓고 보아야 함을 드러냅니다. ${relationshipTail}`, enriched.love);
  const moneyTail = reversed
    ? `${cardName} 역방향에서는 새로 벌리기보다 이미 열어 둔 지출, 일정, 역할을 줄이는 편이 낫습니다.`
    : `${cardName} 정방향에서는 가장 현실적인 옵션 하나에 날짜와 책임 범위를 붙이세요.`;
  const moneyWork = withEnriched(`${cardName}의 ${suit.label} 흐름은 금전과 일에서 ${meta.suit === "pentacles" ? "계약, 일정, 고정비처럼 손에 잡히는 조건" : "선택의 우선순위와 실행 순서"}를 먼저 보게 합니다. ${moneyTail}`, enriched.moneyWork);
  const healthMind = withEnriched(`${zodiac.animal}의 월운은 몸에도 같은 리듬으로 들어옵니다. ${scene} 모습처럼 시선이 한곳에 묶이면 피로가 쌓이니, ${reversed ? "수면 시간과 약속 수를 줄여 회복 공간을 만드세요." : "움직일 시간과 쉬는 시간을 달력에 같이 고정하세요."}`, enriched.healthMind);
  return { relationship, love: relationship, moneyWork, healthMind };
}

function buildYearlyAdvice(zodiac, meta, orientation) {
  const base = YEARLY_ADVICE_ACTION[zodiac.animal] || "이번 달 안에 실행할 일 하나와 미룰 일 하나를 나누어 적으세요.";
  const suitAction = meta.suit === "cups"
    ? `${zodiac.animal}의 컵 흐름에서는 감정이 큰 선택을 하루 뒤 다시 읽고 결정하세요.`
    : meta.suit === "swords"
      ? `${zodiac.animal}의 소드 흐름에서는 중요한 말을 보내기 전에 근거와 감정을 한 줄씩 분리하세요.`
      : meta.suit === "pentacles"
        ? `${zodiac.animal}의 펜타클 흐름에서는 돈과 일정이 걸린 선택을 숫자로 확인한 뒤 움직이세요.`
        : `${zodiac.animal}의 완드 흐름에서는 행동이 앞서기 전에 중간 점검 시간을 먼저 확보하세요.`;
  const directionAction = orientation === "reversed"
    ? `${zodiac.animal}의 달에는 결정을 한 번에 끝내지 말고 삭제, 보류, 실행 세 칸으로 나누세요.`
    : `${zodiac.animal}의 달에는 실행할 항목에 날짜, 사람, 완료 기준을 붙이세요.`;
  return cleanYearlyLanguage(`${base} ${suitAction} ${directionAction}`);
}

function buildYearlyOpportunity({ cardName, symbol, dynamic }) {
  const scene = yearlyInlineScene(symbol.scene);
  return cleanYearlyLanguage(`${dynamic.type}이 맞아떨어지는 순간은 ${cardName}의 장면이 실제 선택으로 좁혀질 때입니다. ${scene} 상징을 현실에서 하나의 행동으로 줄일 때 문이 열립니다.`);
}

function buildYearlyCaution({ cardName, orientation, dynamic }) {
  const direction = orientation === "reversed"
    ? `${cardName} 역방향에서는 늦어진 흐름을 실패로 단정하지 말고, 왜 미뤄졌는지 조건을 확인하세요.`
    : `${cardName} 정방향에서는 좋은 흐름이라도 한 번에 너무 크게 확정하면 부담이 커집니다.`;
  return cleanYearlyLanguage(`${cardName}의 흐름은 ${dynamic.type}으로 작동합니다. ${direction}`);
}

function buildYearlyExamLine({ cardName, symbol, orientation }) {
  const scene = yearlyInlineScene(symbol.scene);
  const tail = orientation === "reversed"
    ? "막판에는 새 자료를 늘리기보다 틀린 문제, 빠뜨린 문서, 컨디션 변수를 줄이세요."
    : "평가나 시험은 반복 루틴과 제출 기준을 지킬수록 결과가 안정됩니다.";
  return cleanYearlyLanguage(`${scene} 그림은 평가 영역에서 집중해야 할 장면을 하나로 좁혀 줍니다. ${tail}`);
}

function mapYearlyReading(result) {
  const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const monthlyReadings = (Array.isArray(result.cards) ? result.cards : []).slice(0, 12).map((card, idx) => {
    const zodiac = MONTHLY_ZODIAC_FLOW[idx] || MONTHLY_ZODIAC_FLOW[0];
    const orientation = card.orientation === "reversed" ? "reversed" : "upright";
    const orientationLabelText = orientation === "reversed" ? "역방향" : "정방향";
    const meaning = card.meaning || {};
    const monthlyKeywords = uniqueKeywordList(meaning.keywords, card.keywords, pickMeaningLines(meaning, "monthly"));
    const mainMonthly = pickMeaningLines(meaning, "monthly");
    const cardName = yearlyCardName(card);
    const meta = yearlyCardMeta(card);
    const symbol = yearlyCardSymbol(card, meta, orientation);
    const dynamic = yearlyZodiacDynamic(zodiac, meta, orientation, cardName);
    const monthLabel = months[idx] || `${idx + 1}월`;
    // 원본 카드 모델에서 정/역방향별 도메인 해석을 뽑아 십이지 도메인 문장에 주입한다.
    const rawModel = getTarotCardByAnyId(card.cardCode || card.cardId);
    const rawOrient = rawModel && (orientation === "reversed" ? rawModel.reversed : rawModel.upright);
    const enrichedDomains = {
      love: pickFirstLine(rawOrient?.love),
      moneyWork: pickFirstLine(rawOrient?.moneyWork) || pickFirstLine(rawOrient?.money),
      healthMind: pickFirstLine(rawOrient?.healthMind),
    };
    const overall = buildYearlyCoreSentence({ monthLabel, zodiac, cardName, orientationText: orientationLabelText, symbol, dynamic });
    const zodiacReading = buildYearlyZodiacReading({ zodiac, cardName, orientationText: orientationLabelText, symbol, dynamic, orientation });
    const triadReading = buildYearlyTriadReading({ zodiac, cardName, symbol, dynamic, orientation });
    const domainReadings = buildYearlyDomainReadings({ zodiac, cardName, symbol, meta, orientation, enriched: enrichedDomains });
    const love = domainReadings.love;
    const relationship = domainReadings.relationship;
    const moneyWork = domainReadings.moneyWork;
    const healthMind = domainReadings.healthMind;
    const opportunity = buildYearlyOpportunity({ cardName, symbol, dynamic });
    const caution = buildYearlyCaution({ cardName, orientation, dynamic });
    const advice = buildYearlyAdvice(zodiac, meta, orientation);
    const exam = buildYearlyExamLine({ cardName, symbol, orientation });

    return ensureCardMeaningIncluded({
      month: idx + 1,
      monthLabel,
      zodiacAnimal: zodiac.animal,
      zodiacSymbol: zodiac.emoji,
      zodiacTheme: zodiac.theme,
      orientation,
      zodiacTarotDynamic: dynamic.type,
      cardScene: symbol.scene,
      mainCard: {
        cardId: card.cardCode || card.cardId,
        nameKo: card.cardNameKo || cardName,
        nameEn: card.cardNameEn,
        arcana: card.meaning?.arcana || (meta.isMajor ? "major" : "minor"),
        suit: meta.suit,
        number: card.meaning?.number || card.number || meta.rank || null,
        orientation,
        keywords: monthlyKeywords,
        questionSpecificMeaning: overall,
        advice: advice,
        caution: caution,
        monthly: mainMonthly,
        love: pickMeaningLines(meaning, "love"),
        moneyWork: pickMeaningLines(meaning, "moneyWork"),
        healthMind: pickMeaningLines(meaning, "healthMind"),
        scene: symbol.scene,
      },
      keywords: monthlyKeywords,
      overall,
      flow: overall,
      zodiacReading,
      triadReading,
      love,
      moneyWork,
      relationship,
      healthMind,
      opportunity,
      caution,
      advice,
      exam,
    });
  });

  const annualSummary = buildAnnualTarotSummary(monthlyReadings);
  const monthlyQuality = validateMonthlyTarotDiversity(monthlyReadings);

  const summary = removeRepeatedTarotPhrases(annualSummary.summary || result.summary || "연간 흐름을 읽는 기준이 됩니다.");
  const finalAdvice = removeRepeatedTarotPhrases(annualSummary.annualAdvice || result.advice || "월별 신호를 작은 현실 행동으로 옮기면 한 해의 선택 기준이 선명해집니다.");

  return {
    title: result.title,
    summary,
    finalAdvice,
    annualSummary,
    monthlyReadings,
    cardSections: monthlyReadings.map((month) => ({
      positionLabel: `${month.monthLabel} · ${month.zodiacAnimal}`,
      cardName: month.mainCard?.nameKo || "",
      orientation: month.orientation,
      orientationLabel: month.orientation === "reversed" ? "역방향" : "정방향",
      zodiacTarotDynamic: month.zodiacTarotDynamic,
      summary: month.overall,
      zodiacReading: month.zodiacReading,
      triadReading: month.triadReading,
      advice: month.advice,
    })),
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    quality: monthlyQuality,
  };
}

function mapSelfEsteemReading(result) {
  const byIndex = (idx) => result.cards[idx]?.questionSpecificMeaning || "";
  const positionReadings = Array.isArray(result.positionReadings) ? result.positionReadings : [];
  const guide = result.levelUpGuide || {};
  const quests = Array.isArray(result.levelUpQuests) ? result.levelUpQuests : [];
  const generatedSummary = result.topSummary && typeof result.topSummary === "object" ? result.topSummary : {};
  const levelupGuide = {
    flow: asText(guide.flow),
    rootPattern: asText(guide.rootPattern),
    woundStory: asText(guide.woundStory),
    recoveryPath: asText(guide.recoveryPath),
    boundaryPractice: asText(guide.boundaryPractice),
    sevenDayQuest: Array.isArray(guide.sevenDayQuest) ? guide.sevenDayQuest : [],
    practiceSentence: asText(guide.practiceSentence),
    summaryPattern: asText(guide.summaryPattern || guide.rootPattern),
    rootCause: asText(guide.rootCause || guide.rootPattern),
    drainArea: asText(guide.drainArea || guide.woundStory),
    recoveryPoint: asText(guide.recoveryPoint || guide.recoveryPath),
    longTermStandard: asText(guide.longTermStandard || guide.boundaryPractice),
    caution: asText(guide.caution || positionReadings[1]?.caution),
    practice: asText(guide.practice || guide.practiceSentence),
    mission: Array.isArray(guide.mission) && guide.mission.length ? guide.mission : (Array.isArray(guide.sevenDayQuest) ? guide.sevenDayQuest : []),
    text: asText(guide.text),
  };

  const recoveryKeywords = Array.from(new Set(positionReadings.flatMap((item) => item?.keywords || []).map((item) => asText(item)).filter(Boolean))).slice(0, 3);
  const cardFlow = positionReadings.map((item) => `${item.cardName} ${orientationLabel(item.orientation)}`).filter(Boolean).join(", ");
  const opening = selfEsteemCleanSentence(
    `자기 기준 회복 타로가 ${cardFlow || "다섯 장의 카드"}의 흐름을 통해 마음의 성장 지도를 엽니다. 오늘의 리딩은 눈치 보기와 자기검열을 비난하지 않고, 그 감각이 어디서 시작되어 어떤 경계와 루틴으로 다시 단단해지는지 비춥니다.`,
    "자기 기준 회복 타로가 다섯 장의 카드로 마음의 성장 지도를 엽니다.",
  );
  const topSummary = {
    title: "자기 기준 회복 타로",
    flowLine: asText(generatedSummary.flowLine || generatedSummary.flow) || selfEsteemCleanSentence(`${cardFlow || "다섯 장의 카드"} 흐름이 상처의 뿌리에서 자기 기준 회복으로 이어집니다.`, "상처의 뿌리에서 자기 기준 회복으로 이어지는 흐름입니다."),
    flow: asText(generatedSummary.flowLine || generatedSummary.flow) || selfEsteemCleanSentence(`${cardFlow || "다섯 장의 카드"} 흐름이 상처의 뿌리에서 자기 기준 회복으로 이어집니다.`, "상처의 뿌리에서 자기 기준 회복으로 이어지는 흐름입니다."),
    corePattern: normalizeSelfEsteemText(generatedSummary.corePattern || levelupGuide.summaryPattern || byIndex(0)),
    rootCause: normalizeSelfEsteemText(generatedSummary.rootCause || levelupGuide.rootCause || positionReadings[1]?.whyThisHappens),
    mainDamage: normalizeSelfEsteemText(generatedSummary.mainDamage || levelupGuide.drainArea || positionReadings[2]?.selfEsteemImpact),
    recoveryKey: normalizeSelfEsteemText(generatedSummary.recoveryKey || levelupGuide.recoveryPoint || "감정 분리 · 짧은 거절 · 기준 기록"),
    automaticThought: normalizeSelfEsteemText(generatedSummary.automaticThought || levelupGuide.caution || positionReadings[1]?.caution),
    todayAction: normalizeSelfEsteemText(generatedSummary.todayAction || levelupGuide.practice || positionReadings[4]?.todayAction || positionReadings[0]?.todayAction),
    recoveryKeywords,
    cognitiveTrap: normalizeSelfEsteemText(generatedSummary.automaticThought || levelupGuide.caution),
    representativeAction: normalizeSelfEsteemText(generatedSummary.todayAction || positionReadings[0]?.todayAction || positionReadings[0]?.actionStep),
  };

  return {
    title: result.title,
    opening,
    topSummary,
    pastDebuff: byIndex(0),
    innerMonster: byIndex(1),
    currentDamage: byIndex(2),
    mindShield: byIndex(3),
    levelupMastery: byIndex(4),
    levelupGuidance: levelupGuide.flow,
    levelupGuide,
    positionReadings,
    positionInsights: positionReadings.map((item) => ({
      position: item.positionKey || `slot_${item.positionIndex}`,
      order: Number(item.order || item.positionIndex || 0),
      icon: asText(item.icon || "✦"),
      question: asText(item.question || item.positionTitle),
      title: item.positionTitle,
      subtitle: orientationLabel(item.orientation),
      cardLabel: `${item.cardName} · ${orientationLabel(item.orientation)}`,
      message: item.interpretation,
      cardMeaning: asText(item.cardMeaning),
      patternAnalysis: asText(item.patternAnalysis),
      selfEsteemImpact: asText(item.selfEsteemImpact),
      recoveryAdvice: asText(item.recoveryAdvice || item.advice),
      caution: asText(item.caution),
      todayAction: asText(item.todayAction || item.actionStep),
      advice: item.advice,
      actionStep: item.actionStep,
      keywords: item.keywords,
      cardNameKo: asText(item.cardNameKo || item.cardName),
      cardNameEn: asText(item.cardNameEn),
      orientation: item.orientation === "reversed" ? "reversed" : "upright",
    })),
    actionPlan: quests.map((item) => `${item.title}: ${item.action}`),
    levelupQuests: quests,
    cardSections: result.cardSections,
    combinations: result.combinations,
    quality: result.quality,
  };
}

function mapGenericReading(result) {
  return {
    title: result.title,
    story: `${result.finalReading}\n핵심은 정답 찾기가 아니라, 지금 가능한 가장 현실적인 한 걸음을 고르는 것입니다.`,
    advice: result.advice,
    cardNarratives: result.cards.map((card) => ({
      position: card.positionLabel,
      cardName: card.cardNameKo,
      interpretation: card.questionSpecificMeaning,
    })),
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    finalAdvice: result.advice,
  };
}

function buildLegacyReadingPayload(result, { spreadId }) {
  const normalizedSpread = normalizeSpreadType(spreadId || result.spreadId || "one_card");
  if (normalizedSpread === "relationship_six_card") return mapRelationshipReading(result);
  if (normalizedSpread === "reunion_lighthouse_five_card") return mapReunionReading(result);
  if (normalizedSpread === "healing_rising_four_card") return mapHealingReading(result);
  if (normalizedSpread === "yearly_twelve_card" || normalizedSpread === "yearly_three_card") return mapYearlyReading(result);
  if (normalizedSpread === "self_esteem_levelup_five_card") return mapSelfEsteemReading(result);
  return mapGenericReading(result);
}

function buildConsultingHighlights(reading) {
  const keys = [
    "oneLineMessage",
    "storyFlow",
    "affirmation",
    "overallVibe",
    "deepReading",
    "realityAndFuture",
    "opening",
    "summary",
    "finalAdvice",
    "combinationReading",
  ];

  const lines = [];
  keys.forEach((key) => {
    const value = reading?.[key];
    const text = Array.isArray(value)
      ? value.map((item) => asText(item)).filter(Boolean).join(" ")
      : asText(value);
    if (!text) return;
    lines.push(text.replace(/\s+/g, " "));
  });

  return lines.slice(0, 4);
}

export {
  TarotInterpretationError,
  generateTarotReading,
  validateTarotReadingQuality,
  removeRepeatedSelfEsteemPhrases,
  validateSelfEsteemTarotDiversity,
  ensureSelfEsteemCardMeaningIncluded,
  removeRepeatedTarotPhrases,
  removeRepeatedPhrases,
  validateMonthlyTarotDiversity,
  ensureCardMeaningIncluded,
  validateTarotReadingDiversity,
  enrichCardPositionMeaning,
  getMeaningByQuestion,
  inferQuestionType,
  normalizeDrawnCardsForSpread,
  drawTarotCardsForSpread,
  interpretTarotReading,
  buildLegacyReadingPayload,
  buildConsultingHighlights,
};
