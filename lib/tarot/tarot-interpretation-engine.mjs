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
 
function getMeaningByQuestion(card, orientation, questionType) {
  const meaning = orientation === "reversed" ? card.reversed : card.upright;
  const key = questionType && meaning[questionType] ? questionType : "general";
  const line = Array.isArray(meaning[key]) && meaning[key].length
    ? meaning[key][0]
    : (Array.isArray(meaning.general) && meaning.general[0]) || "카드의 핵심 메시지를 더 자세히 읽어야 합니다.";
  const advice = (Array.isArray(meaning.advice) && meaning.advice[0]) || "조금 더 구체적인 흐름을 살펴보세요.";
  const core = (Array.isArray(meaning.core) && meaning.core[0]) || "핵심 메시지를 다시 확인하세요.";
  const keywords = Array.isArray(meaning.keywords) && meaning.keywords.length
    ? meaning.keywords.slice(0, 5)
    : card.keywords.slice(0, 5);
  return {
    line,
    advice,
    core,
    keywords,
    coreMeaning: asText(meaning.coreMeaning) || core,
    psychologicalMeaning: asText(meaning.psychologicalMeaning) || core,
    selfEsteemMeaning: asText(meaning.selfEsteemMeaning) || line,
    shadow: asText(meaning.shadowNote || meaning.shadowText),
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
    `상반기에는 ${firstQuarter || "초반 카드 흐름"}가 핵심 축을 만들고, 중반에는 ${secondQuarter || "십이지신 기운"}이 변곡점을 더하며, 하반기에는 ${thirdQuarter || "후반 카드 흐름"}가 결과를 정리합니다.`,
    `연말에는 ${fourthQuarter || "마무리 기운"}이 다음 주기로 넘어갈 준비를 돕습니다.`,
  ].join(" "));

  const annualAdvice = removeRepeatedTarotPhrases([
    bestMonth ? `${bestMonth.monthLabel || `${bestMonth.month}월`}의 카드가 제안하는 강점을 먼저 살리고,` : "강한 달의 흐름을 먼저 살리고,",
    cautionMonth ? `${cautionMonth.monthLabel || `${cautionMonth.month}월`}의 카드가 보여주는 약점은 속도 조절로 관리하세요.` : "흐트러지는 달은 속도 조절로 관리하세요.",
  ].join(" "));

  const summary = removeRepeatedTarotPhrases([
    `올해는 ${dominantSuitLabel} 성향이 우세하고, 정방향 ${safeMonths.length - reversedCount}개월과 역방향 ${reversedCount}개월이 교차하며`,
    `월별 기운은 ${topKeywords.slice(0, 3).join(", ") || "핵심 선택과 조율"}에 크게 반응합니다.`,
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
    focus: ["과거 경험", "반복된 관계 패턴", "인정 욕구", "선택 미루기"],
    keywords: ["불공정", "죄책감", "기준", "자기판단"],
  },
  inner_monster: {
    order: 2,
    icon: "👁",
    title: "왜 나는 거절을 어려워 할까",
    question: "부탁을 거절하면 어떤 상실이 올 것이라고 믿고 있는가?",
    focus: ["버림받을 두려움", "갈등 회피", "좋은 사람 욕구", "죄책감"],
    keywords: ["거절", "경계", "감정 조절", "관계 유지"],
  },
  current_damage: {
    order: 3,
    icon: "⚡",
    title: "눈치 보는 습관이 내게 주는 피해",
    question: "눈치 패턴이 내 감정, 몸, 관계에 어떤 손실을 만들고 있는가?",
    focus: ["에너지 소모", "자기검열", "분노 억압", "선택력 약화"],
    keywords: ["소진", "방어", "자기검열", "피로"],
  },
  mind_shield: {
    order: 4,
    icon: "🛡",
    title: "타인의 실망을 견뎌내는 방법",
    question: "상대의 감정을 내 책임에서 분리하려면 무엇을 지켜야 하는가?",
    focus: ["감정 분리", "건강한 경계", "설명 최소화", "기준 행동화"],
    keywords: ["자기주도", "권위", "경계", "리더십"],
  },
  levelup_mastery: {
    order: 5,
    icon: "✨",
    title: "내 마음을 1순위로 챙기는 방법",
    question: "내 일상 우선순위를 다시 내 마음 중심으로 되돌리려면 무엇부터 할 것인가?",
    focus: ["자기승인", "비교 중단", "작은 성공", "루틴 회복"],
    keywords: ["자기승인", "비교 중단", "회복", "자기돌봄"],
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

function validateSelfEsteemTarotDiversity(sections) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const issues = [];
  const sentenceMap = new Map();
  const actionSet = new Set();

  safeSections.forEach((section, idx) => {
    const merged = [
      section?.cardMeaning,
      section?.patternAnalysis,
      section?.selfEsteemImpact,
      section?.recoveryAdvice,
      section?.caution,
    ].map((line) => asText(line)).join(" ");

    merged
      .split(/(?<=[.!?。！？]|니다\.|요\.)\s+/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length >= 20)
      .forEach((line) => {
        const key = line.toLowerCase();
        if (!sentenceMap.has(key)) sentenceMap.set(key, []);
        sentenceMap.get(key).push(idx + 1);
      });

    const keywordCount = new Set((section?.keywords || []).map((item) => asText(item)).filter(Boolean)).size;
    if (keywordCount < 3) issues.push(`section_${idx + 1}_keyword_under_3`);

    const orientationWord = section?.orientation === "reversed" ? "역방향" : "정방향";
    const orientationText = `${asText(section?.cardMeaning)} ${asText(section?.patternAnalysis)} ${asText(section?.selfEsteemImpact)}`;
    if (!orientationText.includes(orientationWord)) {
      issues.push(`section_${idx + 1}_orientation_not_reflected`);
    }

    const action = asText(section?.todayAction);
    if (!action) issues.push(`section_${idx + 1}_today_action_empty`);
    if (action && actionSet.has(action)) issues.push(`section_${idx + 1}_today_action_duplicated`);
    if (action) actionSet.add(action);
  });

  sentenceMap.forEach((indexes) => {
    if (indexes.length >= 2) issues.push(`repeated_long_sentence_${indexes.join("_")}`);
  });

  for (let i = 0; i < safeSections.length; i += 1) {
    for (let j = i + 1; j < safeSections.length; j += 1) {
      const left = safeSections[i];
      const right = safeSections[j];
      const leftText = [left?.cardMeaning, left?.patternAnalysis, left?.selfEsteemImpact, left?.recoveryAdvice].join(" ");
      const rightText = [right?.cardMeaning, right?.patternAnalysis, right?.selfEsteemImpact, right?.recoveryAdvice].join(" ");
      if (jaccardSimilarity(leftText, rightText) >= 0.7) {
        issues.push(`section_structure_too_similar_${i + 1}_${j + 1}`);
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function buildSelfEsteemActionStep({ context, meaning, orientation }) {
  const seed = asText(meaning?.recoveryAdvice?.[0] || meaning?.advice || "");
  if (context.order === 1) return removeRepeatedSelfEsteemPhrases(`오늘은 타인 기준 체크를 멈추고 내 감정 기준 1개를 먼저 적으세요. ${seed}`);
  if (context.order === 2) return removeRepeatedSelfEsteemPhrases(`부탁을 받으면 즉답 대신 '지금은 어렵습니다, 저녁에 답할게요'를 한 번 실행하세요. ${seed}`);
  if (context.order === 3) return removeRepeatedSelfEsteemPhrases(`관계 피로가 올라오는 순간을 기록하고, 이유를 상대 반응이 아닌 내 몸 신호로 설명해 보세요. ${seed}`);
  if (context.order === 4) return removeRepeatedSelfEsteemPhrases(`상대 감정을 인정하되 결정은 바꾸지 않는 2문장 경계를 오늘 1회 사용하세요. ${seed}`);
  if (orientation === "reversed") return removeRepeatedSelfEsteemPhrases(`생활 루틴 1개를 줄여 에너지 누수를 멈추고, 남은 시간은 나를 회복시키는 행동에 배정하세요. ${seed}`);
  return removeRepeatedSelfEsteemPhrases(`오늘 지킨 기준 1개를 기록해 자기신뢰 증거를 남기세요. ${seed}`);
}

function containsForbiddenPhrase(text) {
  const source = asText(text);
  return FORBIDDEN_QUALITY_PHRASES.some((phrase) => source.includes(phrase));
}

function validateTarotReadingQuality({ spreadId, positions, levelUpGuide }) {
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
      const emotionalThemeOk = /(회복|경계|자기돌봄|자기승인|자기결정|자존감)/.test(`${interpretation} ${advice}`);
      if (!emotionalThemeOk) failures.push(`position_${idx + 1}_self_esteem_theme_missing`);
      if (interpretation.length < 140) failures.push(`position_${idx + 1}_interpretation_too_short`);
      if (advice.length < 70) failures.push(`position_${idx + 1}_advice_too_short`);
    }
  });

  if (spreadId === "self_esteem_levelup_five_card") {
    const guide = asText(levelUpGuide);
    if (!guide) failures.push("levelup_guide_empty");
    if (!/(에서|에서 시작해|에서 .*로 이어|->|→|\|)/.test(guide)) failures.push("levelup_flow_not_connected");
    if (containsForbiddenPhrase(guide)) failures.push("levelup_forbidden_phrase");
    const diversity = validateSelfEsteemTarotDiversity(safePositions);
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

function buildSelfEsteemLevelUpGuide({ spreadTitle, positionReadings }) {
  const safe = Array.isArray(positionReadings) ? positionReadings : [];
  const first = safe[0];
  const second = safe[1];
  const third = safe[2];
  const fourth = safe[3];
  const last = safe[safe.length - 1];
  const summaryKeywords = collectSelfEsteemKeywords([first, second, third, fourth, last]);

  const suitCounts = { cups: 0, swords: 0, wands: 0, pentacles: 0, major: 0 };
  safe.forEach((item) => {
    const key = asText(item?.cardCode).toUpperCase();
    if (key.startsWith("M")) suitCounts.major += 1;
    else if (key.startsWith("C")) suitCounts.cups += 1;
    else if (key.startsWith("S")) suitCounts.swords += 1;
    else if (key.startsWith("W")) suitCounts.wands += 1;
    else if (key.startsWith("P")) suitCounts.pentacles += 1;
  });

  const dominantSuit = Object.entries({
    cups: suitCounts.cups,
    swords: suitCounts.swords,
    wands: suitCounts.wands,
    pentacles: suitCounts.pentacles,
  }).sort((a, b) => b[1] - a[1])[0]?.[0] || "cups";

  const suitHint = dominantSuit === "cups"
    ? "감정 반응과 인정 욕구를 먼저 다루는 정서 회복이 핵심"
    : dominantSuit === "swords"
      ? "과잉 해석과 자동 사고를 사실 검증으로 바꾸는 인지 회복이 핵심"
      : dominantSuit === "wands"
        ? "즉각 반응 대신 경계 행동을 안정적으로 반복하는 실행 회복이 핵심"
        : "생활 루틴과 자원 기준을 복구하는 현실 회복이 핵심";

  const flow = formatSelfEsteemPipe([
    `${spreadTitle} 흐름`,
    `시작 카드 ${first?.cardName || "첫 카드"} ${first?.orientation === "reversed" ? "역방향" : "정방향"}`,
    `전환 카드 ${third?.cardName || "가운데 카드"} ${third?.orientation === "reversed" ? "역방향" : "정방향"}`,
    `도착 카드 ${last?.cardName || "마지막 카드"} ${last?.orientation === "reversed" ? "역방향" : "정방향"}`,
    `회복 축 ${suitHint}`,
  ]);
  const summaryPattern = formatSelfEsteemPipe([
    `반복 키워드 ${summaryKeywords.join(" · ")}`,
    first?.selfEsteemImpact,
    third?.selfEsteemImpact,
  ]);
  const rootCause = formatSelfEsteemPipe([
    `원인 카드 ${first?.cardName || "첫 카드"}`,
    first?.patternAnalysis,
    second?.patternAnalysis,
  ]);
  const drainArea = formatSelfEsteemPipe([
    `소모되는 지점 ${collectSelfEsteemKeywords([third], 2).join(" · ") || "경계 · 에너지"}`,
    third?.selfEsteemImpact,
  ]);
  const recoveryPoint = formatSelfEsteemPipe([
    `회복 키워드 ${collectSelfEsteemKeywords([fourth, last], 3).join(" · ") || "회복 · 기준"}`,
    fourth?.recoveryAdvice,
  ]);
  const longTermStandard = formatSelfEsteemPipe([
    `장기 기준 ${last?.cardName || "마지막 카드"}`,
    last?.recoveryAdvice,
  ]);
  const caution = formatSelfEsteemPipe([
    "주의할 생각 패턴",
    second?.caution || "상대가 실망할 때 내 가치까지 낮아진다고 느끼는 습관",
  ]);
  const practice = formatSelfEsteemPipe([
    "연습 문장",
    "나는 타인의 감정을 존중하지만 내 기준을 먼저 지킨다.",
  ]);
  const mission = [
    "1단계: 오늘 바로 할 행동 - 거절/수락 이전에 내 컨디션을 먼저 확인하고 10초 멈춘다.",
    "2단계: 이번 주 반복할 행동 - 주 3회, 사실과 추측을 분리해 기록한 뒤 대화한다.",
    "3단계: 앞으로 유지할 기준 - 시간, 돈, 몸 중 하나의 경계 기준을 문장으로 유지한다.",
  ];

  return {
    flow,
    summaryPattern,
    rootCause,
    drainArea,
    recoveryPoint,
    longTermStandard,
    caution,
    practice,
    mission,
    text: `${flow} ${summaryPattern} ${rootCause} ${drainArea} ${recoveryPoint} ${longTermStandard} ${caution} ${practice} ${mission.join(" ")}`,
  };
}

function buildSelfEsteemLevelUpQuests(positionReadings = []) {
  const first = positionReadings[0] || {};
  const third = positionReadings[2] || {};
  const last = positionReadings[4] || {};
  return [
    {
      title: "선택지 압축 퀘스트",
      difficulty: "easy",
      purpose: removeRepeatedSelfEsteemPhrases(`목적: ${asText(first.keywords?.[0] || "비교 과부하")}를 줄여 자기 기준을 회복`),
      action: removeRepeatedSelfEsteemPhrases("행동: 오늘 고민 중인 선택지를 2개만 남기고 나머지는 보류 목록으로 이동"),
      completionCheck: removeRepeatedSelfEsteemPhrases("완료 확인: '나는 모두를 만족시키지 않아도 된다' 문장을 기록"),
    },
    {
      title: "불안 검증 퀘스트",
      difficulty: "normal",
      purpose: removeRepeatedSelfEsteemPhrases(`목적: ${asText(third.keywords?.[0] || "과잉 걱정")}을 사실 검증으로 전환`),
      action: removeRepeatedSelfEsteemPhrases("행동: 지금 두려운 상황을 사실 3개와 추측 3개로 분리 작성"),
      completionCheck: removeRepeatedSelfEsteemPhrases("완료 확인: 추측이 더 많으면 오늘 결론을 미루고 확인 질문 1개만 실행"),
    },
    {
      title: "현실 기반 회복 퀘스트",
      difficulty: "hard",
      purpose: removeRepeatedSelfEsteemPhrases(`목적: ${asText(last.keywords?.[0] || "현실 기준")}을 일상 행동으로 고정`),
      action: removeRepeatedSelfEsteemPhrases("행동: 몸, 시간, 돈 중 한 영역의 기준을 정해 실제로 1회 지키기"),
      completionCheck: removeRepeatedSelfEsteemPhrases("완료 확인: 지킨 기준과 결과를 한 줄로 기록"),
    },
  ];
}

function generateTarotReading({ spreadId, spreadTitle, spreadTheme, positions, drawnCards, userQuestion, mode, questionType }) {
  const safePositions = Array.isArray(positions) ? positions : [];
  const safeDrawn = Array.isArray(drawnCards) ? drawnCards : [];
  const _unused = { spreadTheme, userQuestion, mode, questionType };
  void _unused;

  const positionReadings = safeDrawn.map((entry, idx) => {
    const position = safePositions[idx] || {};
    const meaning = entry?.meaning || {};
    const title = position?.label || `포지션 ${idx + 1}`;

    if (spreadId === "self_esteem_levelup_five_card") {
      const orientation = entry?.orientation === "reversed" ? "reversed" : "upright";
      const context = POSITION_SELF_ESTEEM_CONTEXT[position?.key] || {
        order: idx + 1,
        icon: "✦",
        title,
        question: title,
        focus: ["자기이해"],
        keywords: ["회복", "경계", "기준"],
      };
      const section = ensureSelfEsteemCardMeaningIncluded({
        order: context.order,
        icon: context.icon,
        title: context.title,
        cardNameKo: entry?.card?.nameKo || "",
        cardNameEn: entry?.card?.nameEn || "",
        cardCode: entry?.card?.code || "",
        orientation,
        keywords: pickKeywords(meaning, context.keywords || []),
        cardMeaning: formatSelfEsteemPipe([
          `키워드 ${pickKeywords(meaning, context.keywords || []).join(" · ")}`,
          `${entry?.card?.nameKo || "카드"} ${orientationLabel(orientation)}`,
          asText(meaning.coreMeaning),
        ]),
        patternAnalysis: formatSelfEsteemPipe([
          "상처의 패턴",
          asText(meaning.woundPattern?.[0] || meaning.psychologicalMeaning),
          asText(meaning.boundaryPattern?.[0] || meaning.shadow),
        ]),
        selfEsteemImpact: formatSelfEsteemPipe([
          `무너지는 지점 ${context.focus.slice(0, 2).join(" · ")}`,
          asText(meaning.selfEsteem?.[0] || meaning.selfEsteemMeaning),
        ]),
        recoveryAdvice: formatSelfEsteemPipe([
          `회복 처방 ${pickKeywords(meaning, context.keywords || []).slice(0, 2).join(" · ")}`,
          asText(meaning.recoveryAdvice?.[0] || meaning.advice),
        ]),
        caution: formatSelfEsteemPipe([
          "주의할 생각 패턴",
          asText(meaning.caution?.[0] || meaning.shadow),
          `${context.focus[0] || "관계"} 과부하 주의`,
        ]),
      });
      section.todayAction = buildSelfEsteemActionStep({ context, meaning, orientation });

      return {
        positionIndex: idx + 1,
        positionKey: position?.key || `position_${idx + 1}`,
        positionTitle: title,
        cardName: entry?.card?.nameKo || "",
        orientation,
        cardCode: entry?.card?.code || "",
        keywords: section.keywords,
        interpretation: formatSelfEsteemPipe([
          `${entry?.card?.nameKo || "카드"} ${orientationLabel(orientation)}`,
          section.keywords.join(" · "),
          section.cardMeaning,
          section.patternAnalysis,
        ]),
        advice: formatSelfEsteemPipe([
          `${entry?.card?.nameKo || "카드"} 회복 상담`,
          section.recoveryAdvice,
          section.selfEsteemImpact,
        ]),
        actionStep: section.todayAction,
        ...section,
      };
    }

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

  const levelUpGuide = spreadId === "self_esteem_levelup_five_card"
    ? buildSelfEsteemLevelUpGuide({ spreadTitle, positionReadings })
    : null;
  const levelUpQuests = spreadId === "self_esteem_levelup_five_card"
    ? buildSelfEsteemLevelUpQuests(positionReadings)
    : [];

  const quality = validateTarotReadingQuality({
    spreadId,
    positions: positionReadings,
    levelUpGuide: levelUpGuide?.text,
  });

  if (!quality.ok && spreadId === "self_esteem_levelup_five_card") {
    const repaired = positionReadings.map((item) => ({
      ...item,
      interpretation: containsForbiddenPhrase(item.interpretation)
        ? dedupeSentences(`${item.cardName} ${orientationLabel(item.orientation)}은 ${item.positionTitle} 자리에서 자기이해와 경계 회복이 핵심임을 보여줍니다. 상대 반응을 예측해 자신을 낮추기보다 내 감정을 먼저 확인하고, 선택의 기준을 내 쪽으로 되돌리는 연습이 필요합니다. 눈치를 보는 패턴은 소심함이 아니라 오래 버틴 생존 전략일 수 있으니, 오늘은 한 번만이라도 짧고 분명한 경계 문장을 실행해 보세요. 이 작은 실행이 자존감 회복의 첫 단추가 됩니다.`)
        : item.interpretation,
      advice: containsForbiddenPhrase(item.advice)
        ? "오늘의 조언은 단순합니다. 타인의 반응을 통제하려 하지 말고, 내 기준을 한 문장으로 먼저 말해 보세요. 불편함이 생겨도 그 불편함을 견디는 경험이 쌓일수록 자기승인이 강화됩니다. 관계를 끊기 위한 거절이 아니라, 관계를 건강하게 유지하기 위한 경계 설정이라는 관점을 반복해 주세요."
        : item.advice,
    }));

    return {
      positionReadings: repaired,
      levelUpGuide,
      levelUpQuests,
      quality: validateTarotReadingQuality({ spreadId, positions: repaired, levelUpGuide: levelUpGuide?.text }),
    };
  }

  return {
    positionReadings,
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
    levelUpGuide: generated.levelUpGuide || null,
    quality: generated.quality || null,
    spreadId,
    questionType,
  };
}

function mapRelationshipReading(result) {
  const positionBreakdown = result.cards.map((card, idx) => ({
    positionTitle: card.positionLabel,
    cardName: card.cardNameKo,
    orientationLabel: card.orientation === "reversed" ? "역방향" : "정방향",
    headline: card.questionSpecificMeaning,
    summary: `${card.positionLabel} 자리의 핵심은 ${card.questionSpecificMeaning}이며, 감정 해석보다 관계 리듬 확인이 먼저입니다.`,
    detail: card.orientation === "reversed"
      ? `${card.positionRole} 기준으로 연락 속도를 늦추고 대화의 순서를 정리하면 오해와 부담을 줄일 수 있습니다.`
      : `${card.positionRole} 기준으로 약속을 지키고 일관된 태도를 보이면 호감이 자연스럽게 쌓입니다.`,
    relationshipInsight: `${card.emotionalMessage} 호감과 거리감이 함께 보일 때는 말보다 상대의 실제 행동을 기준으로 판단하세요.`,
    advice: `${card.advice} 연락·만남·대화의 리듬을 한 번에 올리기보다 한 단계씩 맞춰 가세요. 감정 확인은 짧고 명료하게 끝내는 편이 좋습니다.`,
    caution: result.caution || "반응 속도만으로 결론을 내리지 마세요.",
    title: card.positionLabel,
    card: `${card.cardNameKo} · ${card.orientation === "reversed" ? "역방향" : "정방향"}`,
  }));

  return {
    title: result.title,
    summary: result.summary,
    overallVibe: `${result.summary} 지금은 누구의 마음이 더 크냐보다, 서로의 표현 방식이 맞는지 확인하는 구간입니다.`,
    deepReading: `${result.finalReading}\n상대를 설득하려는 대화보다 서로를 이해하려는 대화가 관계를 오래 살립니다.`,
    realityAndFuture: `${result.combinationReading}\n한 번의 대화보다 꾸준하고 솔직한 소통이 관계를 만들어 갑니다.`,
    positionBreakdown,
    finalAdvice: {
      instantMission: positionBreakdown[0]?.advice || result.advice,
      conversationTip: "감정 추궁보다 사실 확인 질문 1개를 먼저 던져 보세요.",
      relationshipBoundary: "상대 반응을 속도로 평가하지 말고 일관성으로 평가하세요.",
      nextSevenDays: "앞으로 7일은 짧고 따뜻한 대화 1회를 만드는 데 집중하세요.",
    },
    advice: [
      result.advice,
      "추측보다 확인 질문이 오해를 줄입니다.",
      "작은 약속 이행률을 기준으로 관계를 판단하세요.",
    ],
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    finalAdviceText: result.advice,
  };
}

const REUNION_POSITION_BLUEPRINT = [
  {
    key: "past_bond",
    title: "현재 관계의 에너지",
    question: "두 사람 사이에 아직 남아 있는 감정의 온도는 어떤가?",
    interpretationLens: "관계가 완전히 끝났는지, 미완의 감정이 남아 있는지",
    actionLens: "감정 과장이 아닌 현실 확인",
  },
  {
    key: "their_now",
    title: "상대방의 현재 속마음",
    question: "겉으로 보이는 태도와 실제 마음의 차이는 무엇인가?",
    interpretationLens: "그리움, 방어심, 체념, 혼란의 비율",
    actionLens: "단정 대신 관찰",
  },
  {
    key: "outside_factor",
    title: "상대가 연락하지 못하는 이유",
    question: "연락을 망설이게 하는 심리적/현실적 제약은 무엇인가?",
    interpretationLens: "자존심, 두려움, 죄책감, 회피, 현실 변수",
    actionLens: "압박 금지, 장벽 해소형 접근",
  },
  {
    key: "their_heart",
    title: "앞으로 연락이 올 가능성",
    question: "상대의 자발적 연락은 어떤 방식과 속도로 나타날 가능성이 있는가?",
    interpretationLens: "빠른 연락/지연/우연 접촉/무응답의 가능성",
    actionLens: "접촉 타이밍 관리",
  },
  {
    key: "reunion_outcome",
    title: "재회 가능성의 현실성과 회복 전략",
    question: "감정적 재회와 현실적 지속 가능성을 함께 만족할 수 있는가?",
    interpretationLens: "재접근 가능성, 지속 조건, 실패 위험",
    actionLens: "회복 전략과 금지 행동 명확화",
  },
];

const REUNION_ACTION_SCRIPT = {
  past_bond: {
    upright: "과거 잘잘못을 정리하려 들기보다, 마지막 충돌 이후 달라진 점 1가지만 짧게 공유하세요.",
    reversed: "감정 확인을 서두르지 말고, 답장을 압박하지 않는 안부 1회로 반응 패턴부터 확인하세요.",
  },
  their_now: {
    upright: "상대의 말보다 일관된 행동 신호를 기록해 해석 오차를 줄이세요.",
    reversed: "침묵을 거절로 단정하지 말고, 해석 대신 사실 확인 질문 1개만 남기세요.",
  },
  outside_factor: {
    upright: "연락이 막히는 현실 장벽을 먼저 낮추는 문장으로 접근하세요. 예: 부담 없이 시간 괜찮을 때 답해 줘.",
    reversed: "설명 요구를 줄이고 선택권을 상대에게 남겨 두세요. 한 번의 짧은 접촉 후 간격을 지키는 편이 안전합니다.",
  },
  their_heart: {
    upright: "접촉 타이밍은 저녁 늦은 시간보다 상대 일정이 안정된 시간대로 맞추고, 문장은 두 줄 이내로 끝내세요.",
    reversed: "재접촉 간격을 늘려 심리적 피로를 낮추세요. 무응답 구간에서는 추가 메시지 대신 다음 계기를 기다리세요.",
  },
  reunion_outcome: {
    upright: "재회 제안 전, 다시 만나면 지킬 약속 1개와 하지 않을 행동 1개를 먼저 정리하세요.",
    reversed: "관계 복구를 선언하기보다 신뢰 회복 루틴부터 합의하세요. 반복 갈등 주제를 먼저 차단해야 지속 가능성이 올라갑니다.",
  },
};

function buildReunionActionLine(positionKey, orientation, actionLead) {
  const key = asText(positionKey);
  const mode = orientation === "reversed" ? "reversed" : "upright";
  const lead = asText(actionLead) || "재회 실행 기준";
  const script = REUNION_ACTION_SCRIPT[key]?.[mode]
    || REUNION_ACTION_SCRIPT.reunion_outcome[mode]
    || "감정 확인보다 신뢰 회복 행동 1개를 먼저 실행하세요.";
  return removeRepeatedPhrases(`${lead}에 초점을 맞추세요. ${script}`);
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
  const cardMeaning = removeRepeatedPhrases(
    `${safeCard.nameKo || "카드"} ${orientationText}은 ${asText(meaning?.coreMeaning) || asText(meaning?.core?.[0])} ${asText(meaning?.love?.[0])}`
  );

  const reunionInterpretation = removeRepeatedPhrases(
    `${safePosition.title || "포지션"} 질문에서는 ${asText(meaning?.reunion?.[0])} ${roleNote} 기준으로 보면 ${asText(meaning?.psychologicalMeaning) || asText(meaning?.shadowText)}이 핵심 변수로 작동합니다.`
  );

  const actionLead = asText(safePosition.actionLens) || "재회 실행 기준";
  const advice = buildReunionActionLine(safePosition.key, orientation, actionLead);

  const caution = removeRepeatedPhrases(
    `${asText(meaning?.shadowText) || asText(meaning?.shadowNote) || asText(meaning?.shadow?.[0])} ${orientation === "reversed"
      ? "불안이 커질수록 확인 압박이 올라가기 쉬우니 장문 메시지와 연속 연락은 피하는 편이 좋습니다."
      : "긍정 신호가 보여도 재발 방지 합의 없이 속도를 올리면 같은 패턴이 되풀이될 수 있습니다."}`
  );

  const headline = removeRepeatedPhrases(
    `${safeCard.nameKo || "카드"} ${orientationText}: ${asText(meaning?.reunion?.[0]) || asText(meaning?.love?.[0])}`
  );

  const directAnswer = removeRepeatedPhrases(
    `${safePosition.question || "질문"}에 대한 답은 ${asText(meaning?.reunion?.[0]) || asText(meaning?.general?.[0])}`
  );

  const detailedReading = removeRepeatedPhrases(
    `${cardMeaning} ${reunionInterpretation}`
  );

  const reunionPoint = removeRepeatedPhrases(
    `${safePosition.title || "포지션"}의 실전 포인트는 ${asText(context?.suitHint)} ${asText(context?.majorHint)}`
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
  if (score >= 75) return "높음";
  if (score >= 58) return "조건부 높음";
  if (score >= 40) return "보통";
  return "낮음";
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
    cups: "감정과 미련의 결이 강하게 남아 있어 정서적 안정이 먼저입니다.",
    swords: "생각과 방어가 앞서므로 오해를 줄이는 대화 구조가 핵심입니다.",
    wands: "충동과 추진력이 강하니 속도 조절이 재회 안정성을 좌우합니다.",
    pentacles: "현실 조건과 타이밍이 핵심 변수라 실행 계획이 필요합니다.",
  };

  const majorHint = suitCount.major >= 2
    ? "메이저 아르카나 비중이 높아 이번 재회 문제는 인생 전환점 성격이 강합니다."
    : "메이저 영향은 중간 수준이므로 생활 리듬 조정으로 흐름 변화를 만들 여지가 있습니다.";

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
        reunionInterpretation: removeRepeatedPhrases(`${section.reunionInterpretation} ${anchor.question} 관점으로 다시 읽으면, 감정의 크기보다 재발 방지 합의 여부가 더 중요한 갈림점입니다.`),
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
    ? "감정은 남아 있으나 조심스러운 온도"
    : dominantSuit === "swords"
      ? "생각이 감정을 누르는 차가운 온도"
      : dominantSuit === "wands"
        ? "감정 기복이 큰 가변 온도"
        : "현실 조건이 우선인 신중 온도";

  const shouldMoveFirst = score >= 62
    ? "조건부 가능: 짧은 안부 1회는 허용"
    : "지금은 보류: 먼저 환경 정비가 우선";

  const biggestVariable = dominantSuit === "cups"
    ? "감정 회복 속도와 과거 갈등 재발 방지"
    : dominantSuit === "swords"
      ? "오해 해소 대화 구조와 방어심 완화"
      : dominantSuit === "wands"
        ? "충동적 연락 이후 지속성 유지"
        : "현실 여건(시간/거리/일정) 조율";

  const avoidNow = score < 58
    ? "답을 강요하는 장문 메시지, 연속 확인 연락"
    : "재회 확정 전 감정 결론 강요, 과거 책임 추궁";

  const oneLineAdvice = removeRepeatedPhrases(
    score >= 58
      ? "재회 가능성은 열려 있지만, 감정보다 재발 방지 대화 구조를 먼저 만들 때만 관계가 오래 갑니다."
      : "지금은 재회를 밀어붙일 때가 아니라, 관계를 무너뜨린 패턴을 정리한 뒤 접점을 설계해야 합니다."
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
    opening: removeRepeatedPhrases(`${result.summary} 재회는 감정 크기 자체보다, 관계를 다시 시작했을 때 같은 갈등을 막을 구조가 있는지에서 승부가 갈립니다.`),
    pastBond: positions[0]?.detailedReading || "",
    theirNow: positions[1]?.detailedReading || "",
    outsideFactor: positions[2]?.detailedReading || "",
    theirHeart: positions[3]?.detailedReading || "",
    reunionOutcome: positions[4]?.detailedReading || "",
    lighthouseGuidance: removeRepeatedPhrases(`${result.combinationReading} ${suitHintByType[dominantSuit]} ${majorHint}`),
    finalGuide: {
      shouldContactNow: score >= 58
        ? "지금 가능, 다만 짧은 안부만 추천"
        : "먼저 연락 비추천",
      messageExample: "요즘 문득 생각나서 짧게 안부 남겨. 부담 없다면 답장해 줘.",
      avoidThis: avoidNow,
      nextSevenDays: "앞으로 7일은 갈등 재발 방지 문장 1개와 연락 시 금지 문장 1개를 정리해 보세요.",
    },
    actionPlan: positions.map((item) => item.advice).filter(Boolean).slice(0, 6),
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    finalAdviceText: oneLineAdvice,
    diversity: validateTarotReadingDiversity(positions),
  };
}

function buildHealingCardAnchor(card, fallbackLabel) {
  const cardLabel = asText(card?.cardNameKo) || fallbackLabel;
  const direction = card?.orientation === "reversed" ? "역방향" : "정방향";
  const keyTokens = Array.isArray(card?.keywords)
    ? card.keywords.map((item) => asText(item)).filter(Boolean).slice(0, 2)
    : [];
  const keywordPhrase = keyTokens.length
    ? `핵심 상징은 ${keyTokens.join(" · ")}이고`
    : "핵심 상징은 내면의 균형 회복이고";
  return `${cardLabel} ${direction}은 ${keywordPhrase}`;
}

function buildHealingSectionText(card, fallbackLabel, tailGuide) {
  if (!card) return "";
  const position = asText(card.positionLabel) || fallbackLabel;
  const positionRole = asText(card.positionMeaning) || `${position} 자리의 메시지`;
  const interpretation = asText(card.questionSpecificMeaning);
  const emotional = asText(card.emotionalMessage);
  const anchor = buildHealingCardAnchor(card, fallbackLabel);
  const joined = `${positionRole} ${anchor} 지금의 마음을 비난하기보다 이해해야 다음 선택이 부드러워집니다. ${interpretation} ${emotional} ${tailGuide}`;
  return dedupeSentences(joined).replace(/\s+/g, " ").trim();
}

function buildHealingActionSteps(cards) {
  const steps = [];
  (cards || []).forEach((card, idx) => {
    const rawAdvice = asText(card?.advice);
    if (!rawAdvice) return;
    const direction = card?.orientation === "reversed" ? "속도를 늦추고" : "작게 시작하고";
    const cardName = asText(card?.cardNameKo) || `카드 ${idx + 1}`;
    const line = `${cardName}의 조언: ${direction} ${rawAdvice}`;
    steps.push(dedupeSentences(line));
  });
  return steps.slice(0, 4);
}

function mapHealingReading(result) {
  const cards = result.cards;
  const hiddenTruth = buildHealingSectionText(
    cards[0],
    "원인 카드",
    "지금 필요한 것은 원인을 단정하는 판단이 아니라, 마음이 아팠던 장면을 안전하게 이름 붙이는 일입니다."
  );
  const embracePain = buildHealingSectionText(
    cards[1],
    "수용 카드",
    "감정은 없애야 할 문제가 아니라 지나가게 도와야 할 신호라는 관점으로, 오늘은 내 감정을 짧게 인정해 주세요."
  );
  const silverLining = buildHealingSectionText(
    cards[2],
    "회복 카드",
    "작은 안도감을 주는 행동 하나를 정하면 회복 리듬이 다시 살아나고, 자기신뢰가 조용히 복원됩니다."
  );
  const stepForward = buildHealingSectionText(
    cards[3],
    "행동 카드",
    "완벽한 계획보다 오늘 가능한 10분짜리 실천이 훨씬 큰 변화를 만듭니다."
  );
  const actionPlan = buildHealingActionSteps(cards);
  const summary = dedupeSentences(
    `${result.summary} 오늘의 리딩은 마음을 밀어붙이는 방식이 아니라, 내 속도를 존중하며 회복을 설계하라는 메시지를 반복해서 보여줍니다.`
  );
  const finalAdvice = actionPlan[0] || asText(result.advice) || "오늘은 스스로를 탓하기보다, 몸과 마음이 편해지는 한 가지 행동을 먼저 해보세요.";

  return {
    title: result.title,
    summary,
    opening: `${summary} 지금은 마음을 고치려 하기보다, 지친 지점을 정확히 알아차리고 내 편이 되는 말부터 시작해 주세요.`,
    hiddenTruth,
    embracePain,
    silverLining,
    stepForward,
    integrationMessage: dedupeSentences(`${result.combinationReading} 치유는 거대한 결심보다 작은 안정 루틴의 반복에서 완성됩니다. 타로가 보여준 상징을 오늘의 생활 리듬으로 바꿀 때, 마음은 실제로 회복됩니다.`),
    actionPlan,
    finalAdvice,
    cardSections: result.cardSections,
    combinations: result.combinations,
    finalAdviceText: finalAdvice,
  };
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

    const overall = removeRepeatedTarotPhrases([
      `${months[idx] || `${idx + 1}월`}은 ${zodiac.animal}의 ${zodiac.theme}와 ${card.cardNameKo} ${orientationLabelText}이 맞물립니다.`,
      mainMonthly[0] || `${card.cardNameKo} ${orientationLabelText}은 이번 달의 중심 에너지를 결정합니다.`,
    ].join(" "));

    const zodiacReading = removeRepeatedTarotPhrases(`${zodiac.emoji} ${zodiac.animal}의 달은 ${zodiac.theme}을 드러내며, ${card.cardNameKo} ${orientationLabelText}과 결합될 때 ${mainMonthly[0] || card.questionSpecificMeaning} 같은 톤으로 작동합니다.`);
    const triadReading = removeRepeatedTarotPhrases(`원인·전개·결과는 현재 달의 주제를 분해해 보여 주는 장치이며, 이 달의 선택은 ${zodiac.theme}와 ${card.cardNameKo} ${orientationLabelText}의 합에서 읽어야 합니다.`);
    const love = removeRepeatedTarotPhrases(loveLines[0] || meaning.emotionalMessage || `${card.cardNameKo}는 관계에서 감정의 온도와 표현 방식을 함께 보게 합니다.`);
    const moneyWork = removeRepeatedTarotPhrases(moneyWorkLines[0] || meaning.moneyWork?.[0] || meaning.money?.[0] || meaning.career?.[0] || `${card.cardNameKo}는 금전과 일에서 현실적 우선순위를 다시 세우게 합니다.`);
    const healthMind = removeRepeatedTarotPhrases(healthMindLines[0] || meaning.healthMind?.[0] || `${card.cardNameKo}는 건강과 멘탈의 리듬을 살피게 합니다.`);
    const opportunity = removeRepeatedTarotPhrases(`${card.cardNameKo} ${orientationLabelText}은 ${monthlyKeywords.slice(0, 3).join(", ") || "실행의 기회"} 쪽에서 활용도가 높습니다.`);
    const caution = removeRepeatedTarotPhrases(cautionLines[0] || meaning.shadowText || `${card.cardNameKo} ${orientationLabelText}은 과속보다 점검이 우선입니다.`);
    const advice = removeRepeatedTarotPhrases(adviceLines[0] || card.advice || `${card.cardNameKo}의 흐름은 작은 실행 1개를 끝까지 지키는 데서 구체화됩니다.`);

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
      relationship: removeRepeatedTarotPhrases(`${love} ${zodiac.animal}의 관계 기운은 ${zodiac.theme}와 함께 읽을 때 더 정확합니다.`),
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
  const flowCard = {
    flow: asText(guide.flow),
    summaryPattern: asText(guide.summaryPattern),
    rootCause: asText(guide.rootCause),
    drainArea: asText(guide.drainArea),
    recoveryPoint: asText(guide.recoveryPoint),
    longTermStandard: asText(guide.longTermStandard),
    caution: asText(guide.caution),
    practice: asText(guide.practice),
    mission: Array.isArray(guide.mission) ? guide.mission : [],
  };

  const recoveryKeywords = Array.from(new Set(positionReadings.flatMap((item) => item?.keywords || []).map((item) => asText(item)).filter(Boolean))).slice(0, 3);
  const topSummary = {
    title: "자존감 레벨업 타로",
    flow: positionReadings.map((item) => `${item.cardName} ${orientationLabel(item.orientation)}`).join(" | "),
    corePattern: formatSelfEsteemPipe([flowCard.summaryPattern || byIndex(0), flowCard.drainArea]),
    recoveryKeywords,
    cognitiveTrap: formatSelfEsteemPipe([flowCard.caution]),
    representativeAction: formatSelfEsteemPipe([positionReadings[0]?.todayAction || positionReadings[0]?.actionStep]),
  };

  return {
    title: result.title,
    opening: `${result.summary} 이번 리딩은 위로보다 패턴 인식과 행동 전환에 초점을 둡니다.`,
    topSummary,
    pastDebuff: byIndex(0),
    innerMonster: byIndex(1),
    currentDamage: byIndex(2),
    mindShield: byIndex(3),
    levelupMastery: byIndex(4),
    levelupGuidance: flowCard.flow,
    levelupGuide: flowCard,
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
