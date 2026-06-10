import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "./tarot-cards.mjs";
import { analyzeTarotCombinations } from "./tarot-combination-engine.mjs";
import { expectedCardCount, getSpreadDefinition, normalizeSpreadType } from "./spreads.mjs";

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
  const advice = (Array.isArray(meaning.advice) && meaning.advice[0])
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
    const missing = keywords.filter((keyword) => !text.includes(keyword)).slice(0, 2);
    safe[field] = removeRepeatedTarotPhrases(
      missing.length ? `${text} 핵심 키워드: ${missing.join(", ")}.` : text,
    );
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

  safeMonths.forEach((month) => {
    const card = month?.mainCard || {};
    const suit = asText(card.suit).toLowerCase();
    if (suitCounts[suit] !== undefined) suitCounts[suit] += 1;
    else suitCounts.major += Number(asText(card.arcana).toLowerCase() === "major");
    if (card.orientation === "reversed") reversedCount += 1;

    const rankKey = asText(card.number || card.rank || card.cardNumber || card.cardId);
    if (rankKey) rankCounts.set(rankKey, (rankCounts.get(rankKey) || 0) + 1);
    const cardName = asText(card.nameKo || card.cardNameKo);
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

  const overallFlow = removeRepeatedTarotPhrases([
    `상반기에는 ${firstQuarter || "초반 카드 흐름"} 흐름이 한 해의 첫 리듬을 세우고, 중반에는 ${secondQuarter || "십이지신 기운"} 기운이 방향을 바꾸는 문을 엽니다.`,
    `하반기에는 ${thirdQuarter || "후반 카드 흐름"} 흐름이 결실의 모양을 만들고, 연말에는 ${fourthQuarter || "마무리 기운"} 기운이 다음 주기로 넘어갈 준비를 돕습니다.`,
  ].join(" "));

  const annualAdvice = removeRepeatedTarotPhrases([
    bestMonth ? `${bestMonth.monthLabel || `${bestMonth.month}월`}의 카드가 여는 강점을 먼저 살리고,` : "강한 달의 흐름을 먼저 살리고,",
    cautionMonth ? `${cautionMonth.monthLabel || `${cautionMonth.month}월`}의 카드가 비추는 약점은 속도 조절로 관리하세요.` : "흐트러지는 달은 속도 조절로 관리하세요.",
  ].join(" "));

  const summary = removeRepeatedTarotPhrases([
    `올해는 ${dominantSuitLabel} 기운이 한 해의 바탕을 만들고, ${reversedCount}개월은 막힘이 아니라 방향을 가다듬으라는 속도 조절 신호를 보냅니다.`,
    `열두 달의 월운은 ${topKeywords.slice(0, 3).join(", ") || "핵심 선택과 조율"}에 크게 반응하며, 달마다 다른 수호 기운으로 현실의 선택을 비춥니다.`,
  ].join(" "));

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
  };
}

const FORBIDDEN_QUALITY_PHRASES = [
  "지금 이 자리에서 이미 회복 가능한 힘이 작동하고 있음을 보여줍니다.",
  "지금 이 자리에서 멈춰 서서 내 패턴을 재정비하라는 신호입니다.",
  "현재 에너지를 현실 행동으로 연결할 수 있는 타이밍을 보여줍니다.",
  "겉으로는 버티지만 내면에서는 리듬을 잃기 쉬운 구간을 보여줍니다.",
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
  "자존감 관점에서는 타인 반응을 내 가치와 분리하는 경계 훈련이 핵심입니다.",
  "좋은 흐름일수록 타인의 기대까지 한 번에 책임지려는 과부하를 경계해야 합니다.",
  "상대 반응을 예측하며 스스로를 먼저 낮추는 패턴이 반복될 수 있습니다.",
  "주의할 생각 패턴",
  "상처의 패턴",
  "무너지는 지점",
  "회복 처방",
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
    title: "내가 남의 눈치를 살피게 된 이유",
    question: "왜 타인의 표정과 평가가 내 선택 기준이 되었는가?",
    focus: ["표정 감지", "분위기 파악", "인정 욕구", "관계 유지"],
    keywords: ["눈치", "표정", "분위기", "인정욕구", "생존전략"],
  },
  inner_monster: {
    order: 2,
    icon: "👁",
    title: "왜 나는 거절을 어려워 할까",
    question: "부탁을 거절하면 어떤 상실과 죄책감이 따라올 것이라고 믿고 있는가?",
    focus: ["상실 두려움", "실망 공포", "죄책감", "경계 약화"],
    keywords: ["거절", "실망", "죄책감", "상실", "경계"],
  },
  current_damage: {
    order: 3,
    icon: "⚡",
    title: "눈치 보는 습관이 내게 주는 피해",
    question: "눈치 패턴이 내 감정, 몸, 관계에 어떤 손실을 만들고 있는가?",
    focus: ["과잉 시뮬레이션", "자기검열", "피로 누적", "욕구 억압"],
    keywords: ["과잉분석", "자기검열", "피로", "분노억압", "선택력"],
  },
  mind_shield: {
    order: 4,
    icon: "🛡",
    title: "타인의 실망을 견뎌내는 방법",
    question: "상대의 감정을 내 책임에서 분리하려면 무엇을 지켜야 하는가?",
    focus: ["감정 분리", "설명 최소화", "경계 유지", "미안함 감내"],
    keywords: ["경계", "분리", "설명", "기준", "실망"],
  },
  levelup_mastery: {
    order: 5,
    icon: "✨",
    title: "내 마음을 1순위로 챙기는 방법",
    question: "내 일상 우선순위를 다시 내 마음 중심으로 되돌리려면 무엇부터 할 것인가?",
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
    .replace(/^(현재 자존감 패턴 요약|가장 깊은 원인|가장 크게 소모되는 영역|회복의 첫 번째 열쇠|장기적으로 세워야 할 자기 기준|가장 주의할 자동 사고|오늘의 연습 문장|심리 패턴 분석|자존감 영향|회복 관점|주의할 점)\s*:\s*/u, "")
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
      ? "생각 과잉과 자기검열이 강해져 상대 반응을 미리 계산하는 자동 사고가 커진 상태입니다."
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
    pieces.push(`이전 단계의 ${previousSection.positionTitle}가 현재 패턴의 시작점을 보여줍니다.`);
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
  const themeLine = `${contextLine}은 ${suitLabel} 계열 ${direction}으로, ${suitPsychology}${courtPsychology ? ` ${courtPsychology}` : ""}`;

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
    easyAnswer = `${contextLine}은 사람의 표정과 말투, 분위기 변화를 빠르게 읽어 내는 힘을 보여줍니다. 눈치를 보는 이유는 소심해서가 아니라, 관계의 기류가 흔들릴 때 먼저 맞추며 살아남는 방식을 익혔기 때문입니다.`;
    whyThisHappens = `${themeLine} 과거에 내 감정보다 상대 반응을 먼저 살피는 편이 안전했던 경험이 있었을 수 있습니다. 상대의 표정이 굳거나 말투가 차가워질 때 곧바로 내가 조정해야 한다고 느끼면서, 착해서가 아니라 관계를 지키기 위해 반응을 먼저 바꾸는 방식이 굳어졌을 수 있습니다.`;
    realLifeExample = `회의나 대화에서 상대가 잠깐 무표정해지면 내 의견을 끝까지 말하지 못하고, 먼저 분위기를 부드럽게 만들기 위해 상대 말에 맞춰 버리는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `내 감정이 맞는지 확인하기 전에 먼저 상대의 기분을 읽고 내 선택을 뒤로 미루는 습관입니다.`;
    selfEsteemImpact = `이 습관은 나를 배려 깊은 사람으로 보이게 할 수 있지만, 자존감에는 내가 내 감정의 주인이 아니라 주변 반응의 조정자가 된다는 신호로 남습니다.`;
    recoveryReframe = `회복은 내 감정을 먼저 확인한 뒤 선택을 미루지 않는 데서 시작됩니다. 착해서 맞추는 사람이 아니라, 살아남기 위해 익힌 방식을 지금의 나에게 맞게 다시 배우는 것이 핵심입니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `오늘은 상대 표정을 보기 전에 내 감정과 원하는 것 1개를 먼저 적어 보세요.`);
    caution = meaningCaution || `주의할 자동 사고는 "내가 먼저 맞추지 않으면 관계가 틀어진다"는 생각입니다.`;
    innerSentence = `나는 분위기를 읽지만 내 감정은 내 것이다.`;
    healingSentence = `상대의 표정은 정보일 뿐, 내 가치는 내가 정한다.`;
  } else if (safeContext.key === "inner_monster") {
    easyAnswer = `${contextLine}은 거절을 하면 관계가 끊기거나 상대가 실망해 버릴 것 같은 두려움을 보여줍니다. 그래서 거절이 어려운 이유는 말하기가 힘들어서가 아니라, 상실과 비난을 동시에 떠올리는 마음이 너무 빨리 움직이기 때문입니다.`;
    whyThisHappens = `${themeLine} 부탁을 들어줘야 사랑받는다는 자동 사고가 오래 쌓였을 수 있습니다. 상대가 실망하면 내가 나쁜 사람이 된 것 같고, 부탁을 거절하면 관계의 기반과 도움받을 가능성까지 무너질 것처럼 느껴지면서 죄책감이 먼저 올라와 경계선이 약해집니다.`;
    realLifeExample = `상대가 무리한 부탁을 했을 때 "지금은 어렵다"고 말하고 싶어도, 머릿속에 관계가 멀어지는 장면이 먼저 떠올라 결국 수락해 버리는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `거절 문장을 입 밖에 내기 전에 이미 죄책감이 올라와 스스로를 설득하는 방식입니다.`;
    selfEsteemImpact = `이 패턴이 길어지면 내 기준보다 타인의 만족이 우선되고, 자존감은 "내가 해야만 괜찮은 사람"이라는 조건부 구조로 굳어집니다.`;
    recoveryReframe = `거절은 관계를 끊는 말이 아니라 내가 감당 가능한 범위를 알려주는 말입니다. 실망이 생기더라도 그 감정은 상대의 몫이고, 내 선택이 틀렸다는 뜻은 아닙니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `"지금은 어렵지만, 가능한 범위를 다시 알려줄게"라고 짧게 말해 보세요.`);
    caution = meaningCaution || `주의할 자동 사고는 "부탁을 들어줘야 좋은 사람이다"라는 생각입니다.`;
    innerSentence = `실망은 관계의 끝이 아니라 경계를 배우는 신호다.`;
    healingSentence = `나는 상대를 실망시킬 수 있어도 나를 버릴 필요는 없다.`;
  } else if (safeContext.key === "current_damage") {
    easyAnswer = `${contextLine}은 눈치 보는 습관이 내 일상에서 어떤 손실을 만드는지 보여줍니다. 상대의 말과 표정을 머릿속에서 계속 시뮬레이션하다 보면, 정작 내 욕구는 뒤로 밀리고 몸과 감정은 먼저 지치게 됩니다.`;
    whyThisHappens = `${themeLine} 사람의 반응을 미리 계산하는 습관은 한때 도움이 되었지만, 지금은 내 선택권을 계속 소모시킵니다. "어떻게 보일까"를 먼저 따지느라 하고 싶은 말을 삼키고, 분노나 피로 신호가 몸에 쌓여도 그걸 나중으로 미루는 방식이 반복될 수 있습니다.`;
    realLifeExample = `메신저 답장을 보내기 전에 문장을 여러 번 고치거나, 누군가의 표정을 떠올리며 이미 혼나는 장면을 먼저 상상해 긴장을 키우는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `상대의 반응을 예측하는 데 에너지를 쓰느라 내 감정의 정확한 신호를 놓치는 것입니다.`;
    selfEsteemImpact = `이런 소모가 계속되면 나는 조용하고 착한 사람처럼 보일 수 있지만, 실제로는 자기검열과 피로 때문에 선택력이 약해지고 분노는 안쪽에 쌓입니다.`;
    recoveryReframe = `회복 관점에서는 착한 척이 아니라 생존 전략이었던 방식을 인정한 뒤, 지금은 더 이상 나를 소모시키지 않는 방향으로 써야 합니다. 반응을 늦추고 사실만 확인하면 과잉 해석이 줄어듭니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `오늘은 답장이나 결정 전에 사실과 추측을 한 줄씩 나눠 적어 보세요.`);
    caution = meaningCaution || `주의할 자동 사고는 "아직 상대가 말하지 않았지만 이미 나를 평가했을 것"이라는 생각입니다.`;
    innerSentence = `나는 지금 반응을 예측하는 사람이 아니라, 내 감정을 확인해야 하는 사람이다.`;
    healingSentence = `내 욕구를 늦게 말해도 지금부터 나를 지키면 된다.`;
  } else if (safeContext.key === "mind_shield") {
    easyAnswer = `${contextLine}은 타인의 실망을 받아들이면서도 내 기준을 지키는 법을 보여줍니다. 상대가 실망해도 그 감정을 내가 책임질 필요는 없고, 설명을 길게 하지 않아도 경계는 충분히 전달될 수 있습니다.`;
    whyThisHappens = `${themeLine} 오래전부터 "미안해하고 설명을 많이 해야 관계가 유지된다"는 습관이 있었다면, 상대의 감정이 곧 내 책임처럼 느껴졌을 수 있습니다. 하지만 상대의 실망은 상대의 감정이고, 내 선택은 내 책임이라는 분리가 서야 경계가 살아납니다.`;
    realLifeExample = `누군가의 부탁을 거절한 뒤 길게 해명하다가 오히려 더 지치거나, 반대로 아무 말도 못 하고 허둥대며 결국 내 기준을 접어 버리는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `실망을 피하려고 설명을 과하게 늘리거나, 미안함 때문에 경계 문장을 너무 빨리 접는 습관입니다.`;
    selfEsteemImpact = `이런 방식은 관계를 부드럽게 보이게 할 수 있지만, 자존감에는 "내 결정은 상대가 편해야만 성립한다"는 약한 기준을 남깁니다.`;
    recoveryReframe = `회복은 상대의 감정과 내 책임을 분리하는 데서 시작합니다. 미안함을 느껴도 기준은 지킬 수 있고, 설명은 한 문장으로 충분합니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `"네 마음은 이해하지만, 나는 이번에는 이렇게 할게"라고 짧게 말해 보세요.`);
    caution = meaningCaution || `주의할 자동 사고는 "상대가 실망하면 내가 나쁜 사람"이라는 결론입니다.`;
    innerSentence = `미안함은 느낄 수 있지만 내 선택은 포기하지 않는다.`;
    healingSentence = `나는 상대를 배려하면서도 내 기준을 지킬 수 있다.`;
  } else {
    easyAnswer = `${contextLine}은 내 마음을 1순위로 두는 힘이 단순한 위로가 아니라 실제 생활 기준을 지키는 습관이라는 것을 보여줍니다. 내 감정과 시간을 먼저 확인하고, 타인의 평가보다 내가 지킨 기준을 기록할수록 자존감은 조용히 단단해집니다.`;
    whyThisHappens = `${themeLine} 이제는 비교를 멈추고 오늘의 시간과 몸 상태를 먼저 확인하는 루틴이 필요합니다. 작은 성공을 반복해서 증거로 남길수록 "나는 나를 지킬 수 있다"는 신뢰가 쌓이고, 타인의 반응이 내 가치 판단을 흔드는 힘은 줄어듭니다.`;
    realLifeExample = `하루를 시작할 때 먼저 남의 요청부터 처리하지 않고, 오늘 지킬 기준 한 가지를 적어 두거나 끝냈던 일을 기록하면서 스스로를 인정하는 모습으로 나타날 수 있습니다.`;
    woundPattern = meaningWound || `내 시간을 남의 일정에 넘기고도 그 피로를 참는 방식이 익숙해지는 것입니다.`;
    selfEsteemImpact = `이 상태가 오래가면 자존감은 높아지는 대신 "늘 뒤에 있는 사람"처럼 느껴지고, 독립감과 자기소유감이 약해집니다.`;
    recoveryReframe = `회복 관점은 내 감정과 시간을 먼저 확인하는 것에서 시작합니다. 내가 지킨 기준을 기록하면, 평가보다 사실이 자존감의 근거가 됩니다.`;
    actionPractice = selfEsteemMakeUniqueAction(safeContext.key, `오늘 내가 지킨 기준 1개를 적고, 그것을 성취로 인정해 보세요.`);
    caution = meaningCaution || `주의할 자동 사고는 "내가 먼저 챙기면 이기적인 사람"이라는 생각입니다.`;
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
    selfEsteemImpact: selfEsteemCleanSentence(selfEsteemImpact, `${name}이 자존감에 주는 영향입니다.`),
    recoveryReframe: selfEsteemCleanSentence(recoveryReframe, meaningRecovery || `${name}이 보여주는 회복 관점입니다.`),
    actionPractice: selfEsteemCleanSentence(actionPractice, selfEsteemMakeUniqueAction(safeContext.key, "오늘의 연습")),
    caution: selfEsteemCleanSentence(caution, meaningCaution || `${name}의 주의할 자동 사고입니다.`),
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
      `거절하면 관계가 끊기고, 실망이 오면 내가 나쁜 사람이 된다는 생각이 자동으로 올라옵니다.`,
      `거절하면 관계가 끊긴다는 자동 사고가 올라옵니다.`,
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
    `이번 흐름은 ${first.cardName || "첫 카드"} ${first.orientationLabel || "정방향"}의 감정 민감성에서 시작해 ${second.cardName || "두 번째 카드"} ${second.orientationLabel || "정방향"}의 안정감 불안, ${third.cardName || "세 번째 카드"} ${third.orientationLabel || "정방향"}의 과잉 해석을 지나 ${fourth.cardName || "네 번째 카드"} ${fourth.orientationLabel || "정방향"}의 경계 행동과 ${fifth.cardName || "다섯 번째 카드"} ${fifth.orientationLabel || "정방향"}의 자기소유감으로 회복되는 구조입니다. ${spreadTitle || "자존감 레벨업 타로"}는 결국 남의 반응을 읽는 능력을 내 선택을 지키는 힘으로 바꾸는 여정입니다.`,
    `이번 흐름은 ${spreadTitle || "자존감 레벨업 타로"}의 5장 연결을 보여줍니다.`,
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
    "7일차: 이번 주에 지킨 기준과 내 자존감이 어떻게 달라졌는지 한 문단으로 정리하기",
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

function inferQuestionType({ questionType, category, spreadId, serviceKey }) {
  const explicitQuestionType = asText(questionType).toLowerCase();
  if (["love", "relationship", "reunion", "exmind", "currentmind", "future", "career", "money", "daily", "general"].includes(explicitQuestionType)) {
    if (explicitQuestionType === "exmind") return "exMind";
    if (explicitQuestionType === "currentmind") return "currentMind";
    return explicitQuestionType;
  }

  const normalizedSpread = normalizeSpreadType(spreadId || "");
  const spread = getSpreadDefinition(normalizedSpread);
  if (spread?.questionType) return spread.questionType;

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
    meaning: interpretedCard.questionSpecificMeaning,
    relationshipMessage: interpretedCard.emotionalMessage,
    advice: interpretedCard.advice,
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
      title: "선택지 압축 퀘스트",
      difficulty: "easy",
      purpose: removeRepeatedSelfEsteemPhrases(`${asText(first.keywords?.[0] || "비교 과부하")}를 줄이고 자기 기준을 회복합니다.`),
      action: removeRepeatedSelfEsteemPhrases("오늘 고민 중인 선택지를 2개만 남기고 나머지는 보류 목록으로 이동합니다."),
      completionCheck: removeRepeatedSelfEsteemPhrases("'나는 모두를 만족시키지 않아도 된다' 문장을 기록합니다."),
    },
    {
      title: "불안 검증 퀘스트",
      difficulty: "normal",
      purpose: removeRepeatedSelfEsteemPhrases(`${asText(third.keywords?.[0] || "과잉 걱정")}을 사실 검증으로 전환합니다.`),
      action: removeRepeatedSelfEsteemPhrases("지금 두려운 상황을 사실 3개와 추측 3개로 분리해 작성합니다."),
      completionCheck: removeRepeatedSelfEsteemPhrases("추측이 더 많으면 오늘 결론을 미루고 확인 질문 1개만 실행합니다."),
    },
    {
      title: "현실 기반 회복 퀘스트",
      difficulty: "hard",
      purpose: removeRepeatedSelfEsteemPhrases(`${asText(last.keywords?.[0] || "현실 기준")}을 일상 행동으로 고정합니다.`),
      action: removeRepeatedSelfEsteemPhrases("몸, 시간, 돈 중 한 영역의 기준을 정해 실제로 1회 지킵니다."),
      completionCheck: removeRepeatedSelfEsteemPhrases("지킨 기준과 결과를 한 줄로 기록합니다."),
    },
  ];
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
      const meaning = entry?.meaning || {};
      const title = position?.label || `포지션 ${idx + 1}`;
      return {
        positionIndex: idx + 1,
        positionKey: position?.key || `position_${idx + 1}`,
        positionTitle: title,
        cardName: entry?.card?.nameKo || "",
        orientation: entry?.orientation === "reversed" ? "reversed" : "upright",
        keywords: pickKeywords(meaning, entry?.card?.keywords || []),
        interpretation: dedupeSentences(`${asText(meaning.line)} ${asText(meaning.psychologicalMeaning)}`),
        advice: dedupeSentences(`${asText(meaning.advice)} ${asText(meaning.selfEsteemMeaning) || "실행 가능한 작은 행동으로 연결하세요."}`),
        actionStep: dedupeSentences(`${title}에서는 ${asText(meaning.advice)}를 오늘 한 번 실행해 보세요.`),
      };
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
      next.selfEsteemImpact = ensure(next.selfEsteemImpact, `${next.positionTitle || "이 자리"}가 자존감에 주는 영향을 다시 정리합니다.`);
      next.recoveryReframe = ensure(next.recoveryReframe, `${next.positionTitle || "이 자리"}는 회복 관점을 이렇게 바꿉니다.`);
      next.actionPractice = selfEsteemMakeUniqueAction(next.positionKey, next.actionPractice);
      next.caution = ensure(next.caution, `${next.positionTitle || "이 자리"}에서 주의할 자동 사고를 다시 확인합니다.`);
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
      positionMeaning: `${position?.label || `포지션 ${idx + 1}`}은(는) ${position?.role || "핵심 흐름"}을 보여주는 자리입니다.`,
      questionSpecificMeaning: meaning.line,
      emotionalMessage: `${card.nameKo} 카드가 말하는 감정의 결은 '${meaning.psychologicalMeaning}' 쪽에 가깝습니다.`,
      advice: meaning.advice,
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

  const combinations = analyzeTarotCombinations(entries, questionType, spread);
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
    card.keywords = Array.isArray(mapped.keywords) ? mapped.keywords.slice(0, 5) : card.keywords;
    card.actionStep = mapped.actionStep;
  });
  const cardSections = interpretedCards.map(buildCardSection);

  const title = spread.title || "타로 리딩";
  const summary = `${title} 결과입니다. 이번 리딩은 ${interpretedCards.map((card) => card.cardNameKo).join(", ")} 흐름으로 구성되며, 단정 대신 흐름을 읽을수록 해석 정확도가 높아집니다.`;
  const combinationReading = spreadId === "self_esteem_levelup_five_card"
    ? (generated.levelUpGuide?.text || "")
    : summarizeCombinations(combinations);
  const finalReading = `${summary}\n${combinationReading}\n지금 중요한 건 감정의 크기보다 대화의 방식과 타이밍을 맞추는 일입니다.`.trim();

  const adviceCandidates = interpretedCards.map((card) => card.advice).filter(Boolean);
  const advice = adviceCandidates[0] || "지금은 감정 확인보다 작은 행동 합의가 우선입니다.";

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
    label: "내가 바라보는 상대",
    role: "내가 상대를 어떻게 해석하고 있는지, 기대·두려움·투사의 방향",
    readingFocus: "내가 보고 있는 상대의 모습이 실제 상대인지, 내 감정이 덧씌운 이미지인지",
  },
  {
    key: "other_view_of_relationship",
    label: "상대가 관계 전체를 보는 시각",
    role: "상대가 이 관계를 가볍게 보는지, 조심스럽게 보는지, 가능성으로 보는지",
    readingFocus: "상대가 이 관계의 이름과 속도를 어떻게 정하고 있는지",
  },
  {
    key: "other_feeling_toward_me",
    label: "상대가 나를 바라보는 마음",
    role: "상대가 나에게 느끼는 감정의 온도, 매력, 부담, 거리감",
    readingFocus: "상대가 나에게 실제로 느끼는 끌림·경계·혼란",
  },
  {
    key: "other_romantic_will",
    label: "상대의 연애 의지와 열망",
    role: "상대가 이 관계를 실제 연애나 더 깊은 관계로 발전시키려는 의지",
    readingFocus: "마음은 있어도 움직일 의지가 있는지, 혹은 마음보다 상황/두려움이 큰지",
  },
  {
    key: "core_block",
    label: "관계를 가로막는 핵심 요인",
    role: "두 사람 사이에서 반복되는 오해, 타이밍, 자존심, 현실 문제, 두려움",
    readingFocus: "관계가 앞으로 나아가지 못하는 진짜 병목",
  },
  {
    key: "short_term_outcome",
    label: "앞으로 펼쳐질 단기적 결말",
    role: "현재 흐름이 유지될 경우 2~6주 안에 나타날 가능성 높은 결과",
    readingFocus: "현재 패턴의 자연스러운 귀결과 바꿀 수 있는 지점",
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
  const dominantSuitLabel = {
    cups: "컵 우세: 감정/애착/정서 교류",
    wands: "완드 우세: 끌림/속도/추진력",
    swords: "소드 우세: 판단/말/오해 관리",
    pentacles: "펜타클 우세: 현실/책임/지속성",
    major: "메이저 우세: 관계의 큰 전환점",
  }[dominantSuit] || "혼합 우세";

  const projectionGap = `${c1.cardName} ${c1.orientationLabel}로 상대를 해석하는 당신의 렌즈와, ${c3.cardName} ${c3.orientationLabel}로 드러난 상대의 실제 감정 온도 사이에는 간극이 있습니다. 내가 본 상대 이미지가 상대의 실제 감정 반응보다 더 극적으로 확대되었는지 점검해야 오해를 줄일 수 있습니다.`;
  const relationshipFrame = `${c2.cardName} ${c2.orientationLabel}은 상대가 관계의 이름과 속도를 어떻게 정의하는지 보여주고, ${c4.cardName} ${c4.orientationLabel}은 그 생각이 실제 행동 의지로 이어지는지 드러냅니다. 생각과 실행이 같은 축이면 진전이 빠르지만, 어긋나면 마음은 있으나 정의를 미루는 구도로 흐릅니다.`;
  const blockToOutcome = `${c5.cardName} ${c5.orientationLabel}로 나타난 병목이 유지되면 ${c6.cardName} ${c6.orientationLabel}의 단기 결말로 이어집니다. 즉 장애물 자체보다 장애물을 다루는 방식이 2~6주 결말을 결정하며, 속도와 기준선을 조정하면 결과 곡선을 바꿀 수 있습니다.`;

  const sequenceFlow = `${c1.cardName}(${c1.orientationLabel}) → ${c2.cardName}(${c2.orientationLabel}) → ${c3.cardName}(${c3.orientationLabel}) → ${c4.cardName}(${c4.orientationLabel}) → ${c5.cardName}(${c5.orientationLabel}) → ${c6.cardName}(${c6.orientationLabel})`;
  const wholeStory = `${sequenceFlow}. 시작 카드 ${c1.cardName}와 마지막 카드 ${c6.cardName}의 대비는 '해석의 충격'에서 '결정 유보 또는 정의 지연'으로 이동하는 관계 서사를 만듭니다. ${majorCount >= 2 ? "시작/끝 구간 메이저 카드가 관여해 작은 기분 문제가 아니라 관계 구조를 바꾸는 전환 압력이 큽니다." : "메이저 비중이 낮아도 현재 패턴이 누적되면 단기 결말은 빠르게 굳어질 수 있습니다."} 역방향 비율 ${Math.round((reversedCount / Math.max(1, facts.length)) * 100)}%는 표현 지연과 해석 왜곡 가능성을 함께 보여 주며, ${dominantSuitLabel} 신호가 이번 관계의 주된 공기입니다.`;

  const positionBreakdown = facts.map((f, idx) => {
    const prev = idx > 0 ? facts[idx - 1] : null;
    const next = idx < facts.length - 1 ? facts[idx + 1] : null;
    const orderConnection = idx === 0
      ? `1번의 해석 렌즈가 2번의 관계 프레임(${next.cardName} ${next.orientationLabel})으로 넘어가며 관계 속도 기준을 만듭니다.`
      : idx === 1
        ? `2번의 관계 프레임은 1번의 기대와 3번의 실제 감정 사이에서 현실성을 검증하는 분기점입니다.`
        : idx === 2
          ? `3번에서 확인된 감정 온도는 4번의 의지 카드와 비교될 때 '느낌'과 '실행'의 차이를 드러냅니다.`
          : idx === 3
            ? `4번의 의지가 강해도 5번의 병목(${next.cardName} ${next.orientationLabel})을 넘지 못하면 관계 진전은 막힙니다.`
            : idx === 4
              ? `5번 병목이 완화되지 않으면 6번 결말(${next.cardName} ${next.orientationLabel})이 선택 유보/정의 지연으로 수렴할 가능성이 높습니다.`
              : `6번은 1번에서 시작한 해석 프레임이 단기적으로 어떤 현실 결과로 굳는지 보여주는 결론 카드입니다.`;

    const headline = `${f.cardName} ${f.orientationLabel}이 ${f.positionOrder}번 '${f.positionTitle}'에 오면, ${f.readingFocus}를 관계의 핵심 질문으로 삼아야 합니다.`;
    const summary = `${f.positionTitle}에서 ${f.cardName} ${f.orientationLabel}은 ${f.relMeaning.attractionSignal} 이 신호는 '${f.positionRole}'를 읽을 때 단순 호감 유무가 아니라 감정과 판단의 비율을 함께 보라는 메시지입니다.`;
    const detail = `${f.cardName} ${f.orientationLabel}은 ${f.positionTitle} 자리에서 '${f.readingFocus}'를 매우 직접적으로 드러냅니다. 이 포지션의 핵심은 카드 일반론이 아니라 두 사람의 현재 상호작용에서 이 신호가 어떤 방식으로 반복되는지를 확인하는 것입니다. 특히 ${f.relMeaning.communicationPattern} 패턴이 이어지면, 같은 문장을 말해도 서로 다른 의미로 받아들이는 오해가 누적될 수 있습니다. ${f.relMeaning.commitmentSignal} 흐름이 동시에 보이므로 상대 감정과 관계 정의를 같은 타이밍에 강요하면 오히려 결론이 늦어집니다. 따라서 ${f.positionRole}를 읽을 때는 말의 온도와 행동의 일관성을 분리해 관찰해야 정확도가 올라갑니다.`;
    const relationshipInsight = `${f.positionTitle} 관점에서 보면 ${f.relMeaning.attractionSignal} 그러나 동시에 ${f.relMeaning.fearSignal} 이 양가감정이 현재 관계의 미세한 거리 조절을 만들어, 한쪽은 가까워졌다고 느끼고 다른 한쪽은 아직 탐색 단계라고 느낄 수 있습니다.`;

    let advice = `${f.cardName} ${f.orientationLabel} 기준 실전 조언은 '${f.readingFocus}'에 맞춘 대화 설계입니다. `;
    if (f.positionKey === "self_view_of_other") advice += "확인 강요보다 내가 왜 이 사람에게 이렇게 크게 흔들리는지부터 분리해 기록하고, 상대의 실제 행동 근거 3개만 남기세요.";
    if (f.positionKey === "other_view_of_relationship") advice += "상대가 가능성을 말하는지, 실제 일정/약속을 제안하는지 분리해서 보며 관계의 이름보다 속도 합의 문장을 먼저 맞추세요.";
    if (f.positionKey === "other_feeling_toward_me") advice += "감정 확인 질문을 길게 던지기보다 오해를 줄이는 단문 대화로 접근하고, 감정 단정 대신 상대가 불편해하는 표현을 하나씩 줄이세요.";
    if (f.positionKey === "other_romantic_will") advice += "상대의 추진력이 논리와 속도로 나타날 수 있으니 감정 설득보다 기준 정리형 대화를 택하고, 논쟁 대신 결정 조건을 서로 명시하세요.";
    if (f.positionKey === "core_block") advice += "연락 속도·답장 압박·급전개 패턴을 1주일만 낮춰 타이밍 압박을 제거하고, 관계를 서두르는 행동을 절반으로 줄이세요.";
    if (f.positionKey === "short_term_outcome") advice += "관계 정의를 당장 확정하려 하기보다 애매함이 길어지는 한계선을 먼저 설정하고, 합의되지 않은 기대치는 즉시 수정하세요.";

    const caution = `${f.cardName} ${f.orientationLabel}의 그림자는 ${f.relMeaning.shadow} ${f.positionTitle}에서 이 그림자가 커지면 상대의 침묵을 거절로 단정하거나, 반대로 작은 호감 신호를 과대해석해 관계 리듬을 깨뜨릴 수 있습니다.`;

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

  const overallVibe = `${c1.cardName} ${c1.orientationLabel}에서 출발해 ${c6.cardName} ${c6.orientationLabel}로 도착하는 6장 배열은 관계를 단순 호감 판정이 아닌 '해석-정의-감정-의지-병목-결말'의 순서로 보여줍니다. 시작 카드가 주는 강한 인상은 상대를 크게 해석하게 만들지만, 마지막 카드가 말하는 단기 결말은 선택 유보와 기준 불일치 가능성을 경고합니다. 즉 지금의 핵심은 누가 더 좋아하느냐보다 서로의 속도와 해석 체계를 맞출 수 있느냐입니다. ${dominantSuitLabel} 신호가 강하고 역방향 카드가 ${reversedCount}장이라, 감정 자체보다 대화 해석 오차와 타이밍 관리가 성패를 가릅니다. 전체 분위기는 뜨거운 끌림이 있어도 결론은 지연될 수 있는 '고밀도 탐색 구간'입니다.`;

  const deepReading = `${c2.cardName} ${c2.orientationLabel}은 상대가 이 관계를 어떤 이름으로 두고 싶은지, 얼마나 조심스럽게 속도를 재는지 보여줍니다. ${c3.cardName} ${c3.orientationLabel}은 상대가 나에게 실제로 느끼는 감정 온도를 드러내지만, 이 감정은 관계 정의와 동일하지 않습니다. ${c4.cardName} ${c4.orientationLabel}은 감정이 행동 의지로 번역되는 지점을 보여 주며, 마음이 있어도 실행 방식이 차갑거나 급할 수 있다는 점을 분리해 읽어야 합니다. 그래서 3번은 '감정의 온도', 4번은 '실행의 엔진'으로 다르게 해석되어야 정확합니다. 이 배열에서 상대는 완전히 닫힌 태도보다 가능성을 탐색하면서도 판단 기준을 강하게 유지하는 흐름에 가깝습니다. 감정 확인을 재촉하면 방어를 자극할 수 있으니, 상대가 실제로 움직일 조건을 짧게 합의하는 대화가 관계 정확도를 올립니다.`;

  const realityAndFuture = `${c5.cardName} ${c5.orientationLabel}이 보여주는 병목은 관계 자체의 부재보다 속도 불균형, 급한 확인, 타이밍 압박에 가깝습니다. 이 병목이 정리되지 않으면 ${c6.cardName} ${c6.orientationLabel}의 단기 결말처럼 선택 유보, 정의 지연, 기준 불일치로 연결되기 쉽습니다. 바꿀 수 있는 영역은 내 쪽의 연락 리듬, 질문 길이, 결론 요구 강도입니다. 바꾸기 어려운 영역은 상대의 감정 정리 속도와 최종 결심 시점이며, 이를 억지로 당기면 오히려 후퇴가 생깁니다. 따라서 2~6주 동안은 오해를 줄이는 짧은 대화와 속도 낮추기를 병행하고, 애매함이 길어질 때의 기준선도 함께 설정해야 합니다. 결말을 바꾸는 핵심은 추측 확대가 아니라 병목 관리의 일관성입니다.`;

  const finalAdvice = {
    instantMission: `${c5.cardName} ${c5.orientationLabel}과 ${c6.cardName} ${c6.orientationLabel} 조합 기준으로, 오늘은 관계 정의 질문을 잠시 멈추고 연락 속도를 한 단계 낮춘 뒤 오해를 줄이는 사실 질문 1개만 남기세요.`,
    conversationTip: `${c3.cardName} ${c3.orientationLabel}이 말하는 감정 혼선과 ${c4.cardName} ${c4.orientationLabel}의 실행 성향을 고려해, 감정 추궁 대신 "우리가 맞춰야 할 기준 1가지만 정해보자"라는 문장으로 대화를 여세요.`,
    relationshipBoundary: `${c6.cardName} ${c6.orientationLabel} 흐름에서는 애매함이 길어질수록 소모가 커지므로, 7일 내 확인할 행동 기준(연락 주기/약속 이행/대화 톤) 3가지를 경계선으로 명시하세요.`,
    nextSevenDays: `첫 카드 ${c1.cardName}에서 마지막 카드 ${c6.cardName}로 이어지는 흐름을 고려하면, 앞으로 7일은 결론 압박보다 속도 조절과 오해 축소에 집중해야 단기 결말을 수정할 여지가 생깁니다.`,
    checklist: [
      `${c5.cardName} 기반 속도 과열 신호를 멈추기: 연속 확인 메시지 중단`,
      `${c3.cardName} 기반 오해 축소: 감정 단정 문장 대신 사실 문장 사용`,
      `${c4.cardName} 기반 실행 확인: 상대의 말보다 실제 일정 제안 여부 체크`,
      `${c2.cardName} 기반 관계 프레임 점검: 관계의 이름보다 속도 합의 우선`,
      `${c6.cardName} 기반 경계 설정: 애매함 지속 시 내가 지킬 기준 명문화`,
    ],
  };

  const mapped = {
    title: result.title,
    summary: result.summary,
    counselorTone: "관계 감정의 온도와 실행 의지를 분리해 읽고, 카드 순서가 말하는 서사를 중심으로 단정 없이 해석합니다.",
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
        ? `메이저 카드 ${majorCount}장이 관여해 관계의 국면 전환 압력이 큽니다.`
        : "메이저 카드 비중이 낮아 일상적 패턴 관리가 결말을 좌우합니다.",
      reversedSignal: `역방향 ${reversedCount}장으로 해석 지연/오해 가능성이 높아 속도 조절이 중요합니다.`,
      courtCardSignal: courtCount > 0
        ? `궁정카드 ${courtCount}장이 보여 인물별 말투와 태도 관리가 핵심입니다.`
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
    finalAdviceText: `${c5.cardName}과 ${c6.cardName}를 중심으로 속도를 낮추고, ${c3.cardName}·${c4.cardName} 기준으로 오해를 줄이는 대화를 설계하세요.`,
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
    title: "아직 남아 있는 마음",
    question: "두 사람 사이의 온기는 아직 남아 있을까요?",
    interpretationLens: "끝난 듯 보여도 남아 있는 미완의 감정",
    actionLens: "감정 과장보다 사실 확인",
  },
  {
    key: "their_now",
    title: "그 사람의 지금 마음",
    question: "겉모습 뒤에 숨은 진짜 마음은 무엇일까요?",
    interpretationLens: "그리움, 경계심, 체념, 혼란의 비율",
    actionLens: "단정 대신 관찰",
  },
  {
    key: "outside_factor",
    title: "연락이 막히는 이유",
    question: "연락을 망설이게 만드는 장벽은 무엇일까요?",
    interpretationLens: "자존심, 두려움, 죄책감, 회피, 현실 변수",
    actionLens: "압박 없이 장벽을 낮추는 접근",
  },
  {
    key: "their_heart",
    title: "다시 연락이 올 가능성",
    question: "상대의 연락은 어떤 속도로 다가올까요?",
    interpretationLens: "빠른 연락, 지연, 우연 접촉, 무응답의 가능성",
    actionLens: "타이밍과 톤 조절",
  },
  {
    key: "reunion_outcome",
    title: "재회의 현실성과 회복 전략",
    question: "다시 만나도 오래 갈 수 있는 조건은 무엇일까요?",
    interpretationLens: "재접근 가능성, 지속 조건, 실패 위험",
    actionLens: "회복 전략과 금지 행동의 정리",
  },
];

const REUNION_ACTION_SCRIPT = {
  past_bond: {
    upright: "잘잘못을 길게 따지기보다, 마지막 갈등 이후 달라진 점 한 가지를 짧게 전해 보세요.",
    reversed: "감정 확인을 서두르지 말고, 부담 없는 안부 한 번으로 분위기부터 살펴보세요.",
  },
  their_now: {
    upright: "말보다 행동의 반복을 보세요. 작은 일관성이 진짜 마음을 보여 줍니다.",
    reversed: "침묵을 즉시 거절로 단정하지 말고, 사실 확인 질문 한 개만 남겨 두세요.",
  },
  outside_factor: {
    upright: "연락을 막는 현실 장벽부터 낮추는 문장으로 시작하세요. 예: 부담 없을 때 편하게 답해 줘.",
    reversed: "설명 요구를 줄이고 선택권을 상대에게 남겨 두세요. 짧은 접촉 후 간격을 지키는 편이 안전합니다.",
  },
  their_heart: {
    upright: "연락 시간은 늦은 밤보다 상대 일정이 한가한 시간에 맞추고, 문장은 두 줄 이내로 끝내세요.",
    reversed: "재접촉 간격을 조금 늘려 피로를 줄이세요. 무응답일 때는 추가 메시지보다 다음 계기를 기다리세요.",
  },
  reunion_outcome: {
    upright: "재회 제안 전에, 지킬 약속 한 가지와 하지 않을 행동 한 가지를 먼저 정리해 두세요.",
    reversed: "관계 복구를 서두르기보다 신뢰 회복 루틴부터 합의하세요. 반복 갈등 주제를 먼저 막아야 오래 갑니다.",
  },
};

function buildReunionActionLine(positionKey, orientation, actionLead) {
  const key = asText(positionKey);
  const mode = orientation === "reversed" ? "reversed" : "upright";
  const lead = asText(actionLead) || "재회 실행 기준";
  const last = lead.charCodeAt(lead.length - 1);
  const particle = last >= 0xac00 && last <= 0xd7a3 && ((last - 0xac00) % 28) === 0 ? "가" : "이";
  const script = REUNION_ACTION_SCRIPT[key]?.[mode]
    || REUNION_ACTION_SCRIPT.reunion_outcome[mode]
    || "감정 확인보다 신뢰 회복 행동 1개를 먼저 실행하세요.";
  return removeRepeatedPhrases(`이번 장면에서는 ${lead}${particle} 핵심입니다. ${script}`);
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
    if (indexes.length > 1) {
      issues.push(`repeated_long_sentence_${indexes.join("_")}`);
    }
  });

  openerIndex.forEach((indexes) => {
    if (indexes.length > 1) {
      issues.push(`repeated_opener_${indexes.join("_")}`);
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

  const baseKeywords = uniqueKeywords(meaning?.keywords, 3, [
    ...(safeCard.keywords || []),
    ...(meaning?.core || []),
  ]);

  const roleNote = asText(safePosition.interpretationLens) || "재회 흐름의 핵심 축";
  const coreMeaningText = asText(meaning?.coreMeaning || meaning?.core?.[0]);
  const cardMeaning = cleanReunionLanguage(
    `${coreMeaningText || `${safeCard.nameKo || "카드"} ${orientationText}은 관계의 현재 장면을 비춥니다.`} ${asText(meaning?.love?.[0])}`
  );
  const coreVariable = asText(meaning?.psychologicalMeaning) || asText(meaning?.shadowText) || "상대의 감정 온도";

  const reunionInterpretation = cleanReunionLanguage(
    `${safePosition.title || "포지션"} 자리에서 ${safeCard.nameKo || "이 카드"} 카드는 '${asText(meaning?.reunion?.[0])}'라는 신호를 보여줍니다. ${roleNote} 관점에서는 '${coreVariable}'라는 신호가 핵심 변수입니다.`
  );

  const actionLead = asText(safePosition.actionLens) || "다시 닿기 전의 안전 기준";
  const advice = buildReunionActionLine(safePosition.key, orientation, actionLead);

  const caution = cleanReunionLanguage(
    `${asText(meaning?.shadowText) || asText(meaning?.shadowNote) || asText(meaning?.shadow?.[0])} ${orientation === "reversed"
      ? "불안이 커질수록 확인 압박이 올라가기 쉬우니 장문 메시지와 연속 연락은 피하는 편이 좋습니다."
      : "긍정 신호가 보여도 재발 방지 합의 없이 속도를 올리면 같은 패턴이 되풀이될 수 있습니다."}`
  );

  const headline = cleanReunionLanguage(
    `${safeCard.nameKo || "카드"} ${orientationText}: ${asText(meaning?.reunion?.[0]) || asText(meaning?.love?.[0])}`
  );

  const directAnswer = cleanReunionLanguage(
    `${safePosition.title || "이 자리"}: ${asText(meaning?.reunion?.[0]) || asText(meaning?.general?.[0])}`
  );

  const detailedReading = cleanReunionLanguage(
    `${cardMeaning} ${reunionInterpretation}`
  );

  const reunionPoint = cleanReunionLanguage(
    `${safePosition.title || "포지션"}의 등대 포인트는 ${asText(context?.suitHint)} ${asText(context?.majorHint)}`
  );

  return {
    order: Number(context?.order || 0),
    title: asText(safePosition.title) || `포지션 ${context?.order || 0}`,
    question: asText(safePosition.question) || "재회 흐름 확인",
    cardNameKo: asText(safeCard.nameKo),
    cardNameEn: asText(safeCard.nameEn),
    orientation,
    orientationLabel: orientationText,
    keywords: baseKeywords,
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
        reunionInterpretation: cleanReunionLanguage(`${section.reunionInterpretation} ${anchor.title}에서는 감정의 크기보다 같은 상처를 반복하지 않을 약속이 더 중요한 갈림점입니다.`),
        caution: removeRepeatedPhrases(`${section.caution} 특히 ${idx + 1}번 포지션에서는 같은 질문을 반복 추궁하는 방식이 관계 피로를 빠르게 키울 수 있습니다.`),
      };
    });
  }

  const contactByScore = score >= 72
    ? "높음"
    : score >= 56
      ? "중간"
      : "낮음";
  const partnerTemp = dominantSuit === "cups"
    ? "마음은 남아 있지만 쉽게 다가오지 못하는 온도"
    : dominantSuit === "swords"
      ? "생각이 감정을 누르는 조심스러운 온도"
      : dominantSuit === "wands"
        ? "감정 기복이 커서 뜨거웠다 식었다 하는 온도"
        : "현실 조건이 먼저인 차분한 온도";

  const shouldMoveFirst = score >= 62
    ? "조건부 가능: 부담 없는 첫 문장 1회는 괜찮습니다"
    : "지금은 보류: 마음과 상황을 먼저 정리해 주세요";

  const biggestVariable = dominantSuit === "cups"
    ? "감정 회복 속도와 과거 갈등 재발 방지"
    : dominantSuit === "swords"
      ? "오해를 풀 대화 구조와 방어심 완화"
      : dominantSuit === "wands"
        ? "충동적 연락 이후 꾸준함 유지"
        : "현실 여건(시간, 거리, 일정) 조율";

  const avoidNow = score < 58
    ? "답을 강요하는 장문 메시지, 연속 확인 연락"
    : "다시 만나자는 결론 강요, 과거 책임 추궁";

  const oneLineAdvice = removeRepeatedPhrases(
    score >= 58
      ? "지금의 인연은 완전히 닫힌 흐름이 아닙니다. 짧고 따뜻한 첫 문장으로 문을 두드리되, 같은 상처가 반복되지 않게 대화의 약속부터 세워 주세요."
      : "지금은 다시 만나자는 말보다, 내 마음을 먼저 돌보고 관계를 힘들게 했던 패턴을 정리하는 시간이 더 필요합니다."
  );
  const cardFlow = (result.cards || []).slice(0, 5).map((card) => `${asText(card?.cardNameKo)} ${orientationLabel(card?.orientation)}`).filter(Boolean).join(", ");
  const opening = removeRepeatedPhrases(
    `별 헤는 밤바다 재회운 타로가 ${cardFlow || "다섯 장의 카드"} 흐름으로 두 사람 사이의 남은 온도와 현실 조건을 비춥니다. 이 리딩은 돌아올지 말지를 단정하지 않고, 다시 닿아도 안전한 속도와 피해야 할 파도를 함께 알려줍니다.`
  );

  return {
    title: result.title,
    summary: {
      reunionChanceLabel: reunionLabel(score),
      reunionChanceScore: score,
      partnerState: positions[1]?.directAnswer || "관망 중",
      bestContactTiming: score >= 70 ? "짧은 안부만 추천" : score >= 52 ? "1~2주 조율 후 접촉" : "자연스러운 계기 필요",
      mainObstacle: positions[2]?.directAnswer || "오해와 경계",
      oneLineAdvice,
      comprehensive: {
        reunionChanceVerdict: reunionLabel(score),
        partnerEmotionTemperature: partnerTemp,
      contactPossibility: contactByScore,
        shouldYouMoveFirst: shouldMoveFirst,
        biggestVariable,
        avoidNow,
        finalOneLineAdvice: oneLineAdvice,
      },
    },
    positions,
    opening,
    pastBond: positions[0]?.detailedReading || "",
    theirNow: positions[1]?.detailedReading || "",
    outsideFactor: positions[2]?.detailedReading || "",
    theirHeart: positions[3]?.detailedReading || "",
    reunionOutcome: positions[4]?.detailedReading || "",
    lighthouseGuidance: removeRepeatedPhrases(`${result.combinationReading} ${suitHintByType[dominantSuit]} ${majorHint} 중요한 건 정답을 맞히는 것이 아니라, 서로의 마음이 안전해지는 속도로 다가가는 것입니다.`),
    finalGuide: {
      shouldContactNow: score >= 58
        ? "지금 가능, 다만 부담 없는 첫 문장만 추천"
        : "먼저 연락 비추천",
      messageExample: "문득 네 생각이 나서 조심스럽게 안부 남겨. 부담 없다면 편할 때 답해 줘.",
      avoidThis: avoidNow,
      nextSevenDays: "앞으로 7일은 다시 만나면 지키고 싶은 약속 1개와 절대 반복하지 않을 행동 1개를 적어 보세요.",
    },
    actionPlan: positions.map((item) => item.advice).filter(Boolean).slice(0, 6),
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    finalAdviceText: oneLineAdvice,
    diversity: validateTarotReadingDiversity(positions),
  };
}

const HEALING_POSITION_LABELS = ["숨겨진 진실", "감정 수용", "회복 단서", "다음 행동"];
const HEALING_POSITION_KEYS = ["hiddenTruth", "emotionAcceptance", "recoveryClue", "nextAction"];

const SUN_RECOVERY_CARD_COPY = {
  "Ten of Cups": {
    upright: {
      keywords: ["정서적 안식", "소중한 연결", "소박한 기쁨"],
      shortMessage: "지친 마음의 가장 깊은 곳에는, 다시 편안해지고 다정해지고 싶은 온기가 고요히 기다리고 있습니다.",
      meaning: "컵 10번 정방향은 무언가 허물어지고 차갑게 식어버린 일상 속에서도, 우리가 꼭 지켜내고 싶었던 영혼의 가장 따뜻한 풍경이 훼손되지 않은 채 그대로 보존되어 있음을 일깨워 줍니다. 지금은 억지로 모든 갈등을 풀거나 거창한 결말을 내려고 조급해하지 마세요. 그저 함께 마음을 나눴던 작고 소중한 순간, 혹은 오롯이 내 방에서 혼자 느낄 수 있는 소박한 안전감을 마음의 안식처로 삼는 것이 회복의 지혜로운 시작입니다.",
      shadow: "모두를 만족시키고 배려하려다 정작 내 지친 마음의 그늘을 외면하지 않도록 조심하세요.",
      recoveryAdvice: "나를 가만히 미소 짓게 만드는 소박한 공간이나 다정한 기억 속의 사람을 떠올리며 그 따스한 온기를 조용히 음미해 보세요.",
    },
  },
  "Seven of Pentacles": {
    reversed: {
      keywords: ["기다림의 지혜", "과도한 헌신 내려놓기", "나의 속도 되찾기"],
      shortMessage: "오래 버텨내느라 수고한 내 영혼이, 이제 애태우며 기다리던 버릇을 그만 멈추자고 부드럽게 속삭입니다.",
      meaning: "펜타클 7번 역방향은 애쓰고 헌신했음에도 온전한 대답이 돌아오지 않아 서글퍼진 마음에 조용한 쉼표를 찍어줍니다. 이 카드는 끈기가 부족하다거나 더 견뎌야 한다는 가혹한 채찍질이 아니에요. 오히려 내가 온 마음을 다해 기다려 줄 수 있는 한계선이 어디까지였는지 찬찬히 확인하고, 나를 갉아먹지 않는 건강한 거리와 속도로 스스로를 데려다 놓아야 할 때임을 비춰줍니다.",
      shadow: "기다림이 지연되었다고 해서 당신이 쏟은 시간และ 존재의 가치마저 의심하지는 마세요.",
      recoveryAdvice: "내 힘으로 어찌할 수 없는 기대와 조바심을 가만히 내려두고, 지금 내가 스스로에게 베풀 수 있는 가장 가볍고 쉬운 돌봄 하나를 고르는 일에 집중해 보세요.",
    },
  },
  "The Chariot": {
    reversed: {
      keywords: ["부드러운 제동", "조급한 채찍질 멈추기", "내면의 방향 조율"],
      shortMessage: "앞을 향해 거칠게 달리던 말들을 부드럽게 멈춰 세우고, 내 영혼의 고요한 숨소리를 들을 시간입니다.",
      meaning: "전차 역방향은 머리로는 다급하게 결론을 짓고 달려 나가고 싶지만, 지쳐버린 내면의 중심은 '잠시 멈추고 싶다'고 말하는 미세한 불일치를 상징합니다. 멈추거나 뒤로 물러서는 것을 두려워하지 마세요. 이는 실패나 후퇴가 아니라, 억지로 엔진을 돌리느라 상처 입은 스스로에게 잠시 숨을 고르고 진짜 내가 편안하게 나아갈 수 있는 길을 다시 선택할 수 있게 돕는 따뜻한 보호의 신호입니다.",
      shadow: "상황을 내 마음대로 전부 통제하려 들수록 작은 일에도 마음의 파동이 커지기 쉽습니다.",
      recoveryAdvice: "중요한 결정을 잠시 내일의 햇살 아래로 미뤄두고, 오늘만큼은 내 몸과 마음에 무해한 쉼표 하나를 조용히 선물해 보세요.",
    },
  },
  "King of Wands": {
    reversed: {
      keywords: ["부드러운 자애", "강박적 책임 내려놓기", "따뜻한 경계선"],
      shortMessage: "모든 것을 짊어지고 꿋꿋하게 버텨온 마음이, 이제는 무거운 갑옷을 내려놓고 숨을 쉬고자 합니다.",
      meaning: "완드 킹 역방향은 강해져야 한다는 책임감และ 잘 해내야 한다는 불안함이 겹쳐, 나도 모르게 스스로와 타인에게 서슬 퍼런 잣대를 들이대며 마음의 열기를 끓어올렸을 수 있음을 속삭여 줍니다. 오늘의 회복은 상대를 굴복시키거나 끝끝내 이겨내는 단단한 힘에 있지 않습니다. 그저 내 연약함을 솔직히 마주하고, 내 마음의 경계를 부드럽고 다정하게 전하는 유연함에 있습니다.",
      shadow: "지치고 불안할수록 먼저 판단해 버리거나 성급하게 밀어붙이려는 내면의 충동을 알아차려 주세요.",
      recoveryAdvice: "단정 짓는 말 대신, 가슴 깊이 숨을 한 번 들이마셨다가 내쉬며 나를 재촉하지 않는 다정한 한마디를 나지막이 읊조려 보세요.",
    },
  },
};

const HEALING_SUIT_COPY = {
  cups: {
    keywords: ["감정 정화", "온화한 수용", "마음의 옹달샘"],
    shortMessage: "상처 입어 차갑게 얼어붙은 감정이 안전하게 녹아내릴 수 있는 공간이 필요합니다.",
    meaning: "컵의 기운은 상처와 지친 마음을 억지로 덮거나 성급하게 지워내려 하지 말라고 당부합니다. 슬픔이나 쓸쓸함도 내 존재의 일부입니다. '그동안 많이 애썼구나' 하고 그 감정의 온도를 온전히 인정하고 흘려보내 줄 때, 마음의 결이 다시 비단처럼 부드럽고 맑게 살아납니다.",
    shadow: "타인의 기분과 상황을 먼저 살피느라 내 마음이 겪는 앓이를 너무 늦게 발견하곤 합니다.",
    recoveryAdvice: "오늘 내 마음에 스쳐 지나간 감정에 고요히 이름을 붙여주고, 그 감정이 가장 바라고 있을 조용한 위로의 배려를 하나만 내어주세요.",
  },
  pentacles: {
    keywords: ["대지의 안전감", "몸의 치유", "작은 일상 루틴"],
    shortMessage: "회복은 생각의 머리가 아니라, 발을 딛고 서 있는 대지와 내 몸의 리듬을 돌보는 데서 싹트기 시작합니다.",
    meaning: "펜타클의 기운은 지쳐버린 마음을 구원하기 위해 복잡한 생각에 잠기기보다, 내 몸의 감각에 현실의 닻을 내리라고 일러줍니다. 따뜻한 차 한 잔을 온전히 음미하며 마시거나, 방 한구석을 정돈하고, 편안한 잠자리를 만드는 소박하고 손에 잡히는 일상의 작은 행동들이 흩어진 자아를 단단하게 모아줍니다.",
    shadow: "나아지는 결실이 당장 눈에 보이지 않는다고 해서 스스로의 가치와 노력을 쉽게 깎아내리기 쉽습니다.",
    recoveryAdvice: "복잡한 생각은 잠시 멈추고, 내 몸이 편안함을 느낄 수 있는 작은 공간 정리나 가벼운 스트레칭을 10분만 즐겨보세요.",
  },
  swords: {
    keywords: ["마음의 여백", "해석의 분리", "고요한 시선"],
    shortMessage: "생각의 거품을 걷어내면, 상처의 이면에 숨겨진 맑고 투명한 진실의 하늘이 열립니다.",
    meaning: "검의 카드는 불안과 상처가 스스로를 해치는 부정적인 상상과 해석의 악순환으로 이어지지 않도록 냉철하지만 다정한 관찰자가 되어야 한다고 일러줍니다. 머릿속의 모든 걱정이 진실은 아닙니다. 상상이 보태는 두려움을 걷어내고, 있는 그대로의 사실만을 맑게 응시하는 고요한 시선이 회복을 돕는 방패가 됩니다.",
    shadow: "생각이 꼬리를 물수록 아직 다가오지 않은 최악의 시나리오를 지어내 스스로를 다치게 만들기 쉽습니다.",
    recoveryAdvice: "하얀 노트 위에 '내가 겪은 실제 사실'과 '마음이 덧붙인 두려운 생각'을 가만히 두 갈래로 쪼개어 적으며 마음의 과열을 식혀 보세요.",
  },
  wands: {
    keywords: ["부드러운 열기", "에너지 보존", "다정한 쉼표"],
    shortMessage: "열정의 불꽃은 꺼지지 않았지만, 지금은 그 불꽃을 억지로 키우기보다 조심히 덮어두고 온기를 지킬 때입니다.",
    meaning: "완드의 기운은 무언가를 이루고 싶은 강한 열망과 만성적인 피로가 복잡하게 얽혀 있는 당신의 상태를 비춥니다. 의욕이 꺾인 것이 아니라 에너지가 소진된 것뿐이니, 스스로를 다그쳐 다시 뛰게 만들지 마세요. 지금은 조바심을 내려놓고 가장 편안하고 무해한 속도로 에너지를 보충해야 할 영혼의 겨울잠 기간입니다.",
    shadow: "마음이 조급할수록 신체적 피로를 무시하고 섣부른 행동이나 계획을 앞세워 에너지를 소모해 버리기 쉽습니다.",
    recoveryAdvice: "해야 할 일의 긴 목록에서 오늘만큼은 단 하나만 골라 가볍게 실행하고, 남은 하루는 아무런 목적 없는 온전한 쉼으로 채워보세요.",
  },
  major: {
    keywords: ["삶의 거대한 계절", "내면의 나침반", "자연스러운 탈바꿈"],
    shortMessage: "지금의 고단함은 흠집이 아니라, 영혼의 계절이 겨울에서 봄으로 바뀌기 직전의 아름다운 국면입니다.",
    meaning: "메이저 아르카나의 웅장한 메시지는 현재 당신이 마주한 내면의 진통이 결코 무의미한 방황이 아님을 말해 줍니다. 이는 당신의 삶이 한 단계 더 성숙하고 단단한 차원으로 거듭나기 위한 영혼의 숭고한 여정입니다. 고치거나 서두르려 하지 마세요. 계절이 흐르듯, 당신 안의 치유 리듬도 완벽한 자기만의 속도로 빛을 향해 가고 있습니다.",
    shadow: "상황의 의미를 너무 크고 무겁게 받아들여, 오늘 당장 실천할 수 있는 소박한 회복의 한 걸음을 주저하기 쉽습니다.",
    recoveryAdvice: "내 삶에 일어나는 큰 변화의 물결을 섣불리 통제하려 들지 않고, '결국 모든 것이 흐르고 나아질 것'이라는 다정한 신뢰를 마음에 심어 보세요.",
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

function healingCardCopy(card) {
  const en = asText(card?.cardNameEn);
  const orientation = card?.orientation === "reversed" ? "reversed" : "upright";
  const exact = SUN_RECOVERY_CARD_COPY[en]?.[orientation];
  if (exact) return exact;
  const base = HEALING_SUIT_COPY[healingSuitKey(card)] || HEALING_SUIT_COPY.major;
  const directionText = orientation === "reversed"
    ? "역방향은 마음이 늦어졌다는 뜻이 아니라, 지금은 속도와 경계를 다시 맞추라는 부드러운 신호입니다."
    : "정방향은 이미 회복을 향한 작은 빛이 켜져 있으며, 그 빛을 현실의 행동으로 옮길 수 있음을 보여줍니다.";
  return {
    keywords: base.keywords,
    shortMessage: base.shortMessage,
    meaning: `${base.meaning} ${directionText}`,
    shadow: base.shadow,
    recoveryAdvice: base.recoveryAdvice,
  };
}

function buildHealingCardReading(card, idx) {
  const copy = healingCardCopy(card);
  const cardName = asText(card?.cardNameKo) || `카드 ${idx + 1}`;
  const orientation = card?.orientation === "reversed" ? "reversed" : "upright";
  const orientationLabelText = orientation === "reversed" ? "역방향" : "정방향";
  const keywords = Array.from(new Set([...(copy.keywords || []), ...((card?.keywords || []).map((item) => asText(item)).filter(Boolean))])).slice(0, 3);
  return {
    position: HEALING_POSITION_KEYS[idx] || `position_${idx + 1}`,
    positionLabel: HEALING_POSITION_LABELS[idx] || asText(card?.positionLabel) || `카드 ${idx + 1}`,
    cardName,
    cardNameEn: asText(card?.cardNameEn),
    orientation,
    orientationLabel: orientationLabelText,
    keywords,
    shortMessage: cleanHealingLanguage(copy.shortMessage),
    meaning: cleanHealingLanguage(copy.meaning),
    shadow: cleanHealingLanguage(copy.shadow),
    recoveryAdvice: cleanHealingLanguage(copy.recoveryAdvice),
  };
}

function healingCardDeepDiveText(item, idx) {
  return cleanHealingLanguage(`${idx + 1}. ${item.positionLabel} - ${item.cardName} ${item.orientationLabel}: ${item.meaning} 살펴볼 부분은 ${item.shadow} 오늘의 회복 행동은 ${item.recoveryAdvice}`);
}

function buildHealingRoutines(cardReadings) {
  const candidates = [
    {
      title: "10분 햇빛 루틴",
      description: "몸의 긴장을 먼저 낮추고 마음이 따라올 시간을 줍니다.",
      action: "창가나 조용한 자리에서 물 한 잔을 마신 뒤, 오늘 나를 덜 몰아붙일 행동 하나를 정하세요.",
      timeGuide: "10분",
    },
    {
      title: "감정과 사실 분리 메모",
      description: "마음속 해석이 커질 때 회복의 기준선을 다시 세웁니다.",
      action: "종이에 '내가 실제로 본 것'과 '내가 걱정한 것'을 한 줄씩 나누어 적어 보세요.",
      timeGuide: "7분",
    },
    {
      title: "부드러운 경계 문장",
      description: "나를 지키는 말을 강하게 밀어붙이지 않고 분명하게 꺼냅니다.",
      action: "'지금은 조금 천천히 생각해 보고 싶어'처럼 오늘 쓸 수 있는 문장 하나를 준비하세요.",
      timeGuide: "5분",
    },
  ];
  const finalAdvice = cardReadings[3]?.recoveryAdvice || cardReadings[0]?.recoveryAdvice;
  if (finalAdvice) candidates[0] = { ...candidates[0], action: finalAdvice };
  return candidates.slice(0, 3);
}

function mapHealingReading(result) {
  const cards = Array.isArray(result.cards) ? result.cards.slice(0, 4) : [];
  const cardReadings = cards.map((card, idx) => buildHealingCardReading(card, idx));
  const cardDeepDive = cardReadings.map((item, idx) => healingCardDeepDiveText(item, idx));
  const cardFlow = cardReadings.map((item) => `${item.cardName} ${item.orientationLabel}`).filter(Boolean).join(" → ");
  const oneLineMessage = cleanHealingLanguage(cardReadings[0]?.shortMessage || "지친 마음의 온도를 가만히 살피고, 서두르지 않는 새벽빛으로 하루를 안아줄 시간이에요.");
  const storyFlow = cleanHealingLanguage(`이번 리딩은 ${cardFlow || "네 장의 카드"}가 그리는 새벽빛의 온화한 흐름을 따라갑니다. 첫 번째 카드는 상처 뒤에 숨어 가만히 누워 쉬고 싶어 하는 마음의 진짜 자리를 비춰주고, 두 번째 카드는 밀어내지 않고 따뜻하게 품어주어야 할 감정의 온도를 토닥여 줍니다. 세 번째 카드는 얼어붙은 가슴을 사르르 녹여줄 다시 따뜻해지는 단서를 열어주며, 마지막 카드는 오늘 당신이 지치지 않고 가볍게 선물할 수 있는 일상의 작은 회복 행동을 속삭입니다. 억지로 고치려 애쓰지 않아도 괜찮아요. 한 걸음씩 그저 편안히 흘러가 볼게요.`);
  const recoveryRoutines = buildHealingRoutines(cardReadings);
  const actionPlan = recoveryRoutines.map((item) => `${item.title}: ${item.action}`);
  const finalAdvice = cleanHealingLanguage(cardReadings[3]?.recoveryAdvice || cardReadings[0]?.recoveryAdvice || "오늘 하루만큼은 자신을 매섭게 몰아세우지 말고, 그저 따뜻한 차 한 잔 마시듯 편안하고 다정하게 존재해 줄게요.");

  return {
    title: "태양 회복 타로",
    subtitle: "상처를 억지로 지우려 하기보다, 그 자리에 조용히 새벽빛을 들여놓는 다정한 동행",
    oneLineMessage,
    sunLine: oneLineMessage,
    summary: oneLineMessage,
    opening: cleanHealingLanguage("오늘의 카드는 지친 당신의 마음을 섣불리 교정하거나 다그치지 않습니다. 그저 오래 머물렀던 마음의 어두운 구석구석에 부드러운 햇살을 가만히 비추고, 지금 이 순간 당신이 편안하게 숨 쉴 수 있는 작고 소박한 온기를 건넬 뿐이랍니다."),
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
    affirmation: cleanHealingLanguage("오늘만큼은 나를 다그치지 않고, 상처 입고 흔들리는 내 모습까지 온전히 품에 안으며 따스한 온기가 차오르기를 기다리겠습니다."),
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

function mapYearlyReading(result) {
  const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const monthlyReadings = (Array.isArray(result.cards) ? result.cards : []).slice(0, 12).map((card, idx) => {
    const zodiac = MONTHLY_ZODIAC_FLOW[idx] || MONTHLY_ZODIAC_FLOW[0];
    const orientationLabelText = card.orientation === "reversed" ? "역방향" : "정방향";
    const meaning = card.meaning || {};
    const monthlyKeywords = uniqueKeywordList(meaning.keywords, card.keywords, pickMeaningLines(meaning, "monthly"));
    const mainMonthly = pickMeaningLines(meaning, "monthly");
    const loveLines = pickMeaningLines(meaning, "love");
    const moneyWorkLines = uniqueKeywordList(pickMeaningLines(meaning, "moneyWork"), pickMeaningLines(meaning, "money"), pickMeaningLines(meaning, "career"));
    const healthMindLines = uniqueKeywordList(pickMeaningLines(meaning, "healthMind"), pickMeaningLines(meaning, "daily"));
    const cautionLines = pickMeaningLines(meaning, "caution");
    const adviceLines = pickMeaningLines(meaning, "advice");
    const monthlySignal = cleanYearlyLanguage(mainMonthly[0] || card.questionSpecificMeaning || `${card.cardNameKo} ${orientationLabelText}은 이번 달의 중심 리듬을 정합니다.`);

    const overall = cleanYearlyLanguage([
      `${months[idx] || `${idx + 1}월`}은 ${zodiac.animal}의 ${zodiac.theme} 기운과 ${card.cardNameKo} ${orientationLabelText}이 만나 한 달의 문을 엽니다.`,
      monthlySignal,
    ].join(" "));

    const zodiacReading = cleanYearlyLanguage(`${zodiac.emoji} ${zodiac.animal}의 달은 ${zodiac.theme}의 수호 리듬을 열고, ${card.cardNameKo} ${orientationLabelText}과 만나 이 달의 결을 만듭니다. ${monthlySignal}`);
    const triadReading = cleanYearlyLanguage(`월초·월중·월말의 세 갈래 월운은 이 달의 선택을 비추는 거울입니다. ${zodiac.theme}의 기운과 ${card.cardNameKo} ${orientationLabelText}이 만나는 지점에서 방향을 잡아야 합니다.`);
    const love = cleanYearlyLanguage(loveLines[0] || meaning.emotionalMessage || `${card.cardNameKo}는 관계에서 감정의 온도와 표현 방식을 함께 보게 합니다.`);
    const moneyWork = cleanYearlyLanguage(moneyWorkLines[0] || meaning.moneyWork?.[0] || meaning.money?.[0] || meaning.career?.[0] || `${card.cardNameKo}는 금전과 일에서 현실적 우선순위를 다시 세우게 합니다.`);
    const healthMind = cleanYearlyLanguage(healthMindLines[0] || meaning.healthMind?.[0] || `${card.cardNameKo}는 건강과 멘탈의 리듬을 살피게 합니다.`);
    const opportunity = cleanYearlyLanguage(`${card.cardNameKo} ${orientationLabelText}은 ${monthlyKeywords.slice(0, 3).join(", ") || "실행의 기회"}에서 가장 선명한 빛을 냅니다.`);
    const caution = cleanYearlyLanguage(cautionLines[0] || meaning.shadowText || `${card.cardNameKo} ${orientationLabelText}은 과속보다 점검이 우선입니다.`);
    const advice = cleanYearlyLanguage(adviceLines[0] || card.advice || `${card.cardNameKo}의 흐름은 작은 실행 1개를 끝까지 지키는 데서 구체화됩니다.`);

    return ensureCardMeaningIncluded({
      month: idx + 1,
      monthLabel: months[idx] || `${idx + 1}월`,
      zodiacAnimal: zodiac.animal,
      zodiacSymbol: zodiac.emoji,
      zodiacTheme: zodiac.theme,
      orientation: card.orientation,
      mainCard: {
        cardId: card.cardId || card.cardCode || card.cardId,
        nameKo: card.cardNameKo,
        nameEn: card.cardNameEn,
        arcana: card.meaning?.arcana || (card.cardId && String(card.cardId).startsWith("M") ? "major" : "minor"),
        suit: card.meaning?.suit || card.suit || "",
        number: card.meaning?.number || card.number || null,
        orientation: card.orientation,
        keywords: monthlyKeywords,
        questionSpecificMeaning: removeRepeatedTarotPhrases(card.questionSpecificMeaning || mainMonthly[0] || ""),
        advice: advice,
        caution: caution,
        monthly: mainMonthly,
        love: loveLines,
        moneyWork: pickMeaningLines(meaning, "moneyWork"),
        healthMind: pickMeaningLines(meaning, "healthMind"),
      },
      keywords: monthlyKeywords,
      overall,
      flow: overall,
      zodiacReading,
      triadReading,
      love,
      moneyWork,
      relationship: cleanYearlyLanguage(`${love} ${zodiac.animal}의 관계 기운은 ${zodiac.theme}의 흐름과 함께 읽을 때 결이 더 선명해집니다.`),
      healthMind,
      opportunity,
      caution,
      advice,
      exam: removeRepeatedTarotPhrases(`${card.cardNameKo}는 실무 학습과 집중 루틴을 통해 기회가 살아나는 카드입니다.`),
    });
  });

  const annualSummary = buildAnnualTarotSummary(monthlyReadings);
  const monthlyQuality = validateMonthlyTarotDiversity(monthlyReadings);

  const summary = removeRepeatedTarotPhrases(annualSummary.summary || result.summary || "연간 흐름을 읽는 기준이 됩니다.");
  const finalAdvice = removeRepeatedTarotPhrases(annualSummary.annualAdvice || result.advice || "월별 메시지를 현실 행동으로 바꾸면 한 해가 선명해집니다.");

  return {
    title: result.title,
    summary,
    finalAdvice,
    annualSummary,
    monthlyReadings,
    cardSections: result.cardSections,
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
    `자존감 레벨업 타로가 ${cardFlow || "다섯 장의 카드"}의 흐름을 통해 마음의 성장 지도를 엽니다. 오늘의 리딩은 눈치 보기와 자기검열을 비난하지 않고, 그 감각이 어디서 시작되어 어떤 경계와 루틴으로 다시 단단해지는지 보여줍니다.`,
    "자존감 레벨업 타로가 다섯 장의 카드로 마음의 성장 지도를 엽니다.",
  );
  const topSummary = {
    title: "자존감 레벨업 타로",
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
  inferQuestionType,
  normalizeDrawnCardsForSpread,
  drawTarotCardsForSpread,
  interpretTarotReading,
  buildLegacyReadingPayload,
  buildConsultingHighlights,
};
