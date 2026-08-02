import {
  YEAR_PHASES,
  ZODIAC_YEAR_PROFILES,
  drawPremiumYearCards,
  getAnnualCardProfile,
  getZodiacProfile,
} from "./tarot-year-data.mjs";

const SUIT_LABELS = Object.freeze({
  cups: "감정과 관계의 흐름",
  wands: "추진력과 실행의 흐름",
  swords: "판단과 소통의 흐름",
  pentacles: "돈과 현실 기반의 흐름",
  major: "삶의 방향이 크게 움직이는 흐름",
});

function asText(value) {
  return String(value || "").trim();
}

function list(value) {
  return Array.isArray(value) ? value.map(asText).filter(Boolean) : [];
}

function unique(...values) {
  return Array.from(new Set(values.flatMap((value) => (Array.isArray(value) ? value : [value])).map(asText).filter(Boolean)));
}

function monthLabel(month = {}, fallback = "해당 시기") {
  return asText(month.monthLabel) || (month.month ? `${month.month}월` : fallback);
}

function cardCode(month = {}) {
  return asText(month.mainCard?.cardId || month.mainCard?.id || month.cardId).toUpperCase();
}

function cardName(month = {}) {
  return asText(month.mainCard?.nameKo || month.mainCard?.cardNameKo || month.cardName || "올해의 카드");
}

function sentenceCount(value) {
  return asText(value).split(/[.!?。！？]+/u).map((part) => part.trim()).filter(Boolean).length;
}

function uniqueSentences(...values) {
  const seen = new Set();
  const output = [];
  values.flatMap((value) => (Array.isArray(value) ? value : [value])).forEach((value) => {
    const text = asText(value);
    if (!text) return;
    const key = text.replace(/[“”"']/g, "").replace(/\s+/g, " ").trim();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });
  return output;
}

function normalizeMonth(month, index) {
  const phase = YEAR_PHASES[index] || YEAR_PHASES[0];
  const source = month && typeof month === "object" ? month : {};
  return {
    ...source,
    month: Number(source.month) || index + 1,
    monthLabel: monthLabel(source, `${index + 1}월`),
    keyword: asText(source.keyword) || phase.keyword || list(source.keywords || source.mainCard?.keywords).slice(0, 3).join(" · ") || "이번 달의 선택 기준",
    direction: asText(source.direction) || (source.orientation === "reversed" ? "역방향" : "정방향"),
    summary: asText(source.summary) || asText(source.overall) || asText(source.flow),
    money: asText(source.money) || asText(source.moneyWork),
    work: asText(source.work) || asText(source.moneyWork),
    relationship: asText(source.relationship) || asText(source.love),
    health: asText(source.health) || asText(source.mind) || asText(source.healthMind),
    caution: asText(source.caution) || asText(source.mainCard?.caution),
    action: asText(source.action) || asText(source.advice),
    phase,
  };
}

function monthlyCombination(month, card, zodiac, phase) {
  const cardNameText = card.nameKo || cardName(month);
  const phaseName = typeof phase === "object" ? phase.phase : asText(phase);
  const relation = zodiac.animal === "호랑이" || zodiac.animal === "용" || zodiac.animal === "말" ? "공명" : zodiac.animal === "뱀" || zodiac.animal === "닭" ? "보완" : "조율";
  const title = relation === "공명"
    ? `${zodiac.animal}의 힘과 ${cardNameText}의 방향이 함께 커지는 달`
    : relation === "보완"
      ? `${zodiac.animal}의 감각이 ${cardNameText}의 빈틈을 메우는 달`
      : `${zodiac.animal}의 결로 ${cardNameText}의 속도를 조율하는 달`;
  const summary = `${zodiac.animal}의 ${zodiac.symbol}이 ${cardNameText}의 ${card.annualTheme}과 만납니다. ${zodiac.annualTheme}이라는 배경이 카드의 메시지를 ${phaseName || "이번 시기"}의 현실적인 선택으로 번역합니다.`;
  const advice = `${zodiac.luckyAction} ${card.annualAdvice}`;
  return { type: relation, title, summary, advice };
}

function buildMonthlyReading(sourceMonth, index) {
  const month = normalizeMonth(sourceMonth, index);
  const orientation = month.orientation === "reversed" ? "reversed" : "upright";
  const card = getAnnualCardProfile(cardCode(month), orientation);
  const zodiac = getZodiacProfile(asText(month.zodiacAnimal) || ZODIAC_YEAR_PROFILES[index]?.animal);
  const phase = month.phase || YEAR_PHASES[index] || YEAR_PHASES[0];
  const combination = monthlyCombination(month, card, zodiac, phase);
  const flow = uniqueSentences(
    month.flow || month.overall,
    phase.flow,
    `${zodiac.animal}의 ${zodiac.symbol}이 이번 달의 선택 기준을 현실에 붙잡아 줍니다.`,
    card.annualTheme,
  ).join(" ");
  const money = uniqueSentences(month.money || month.moneyWork, phase.money, zodiac.moneyPattern, card.money).join(" ");
  const work = uniqueSentences(month.work || month.moneyWork, phase.work, zodiac.careerPattern, card.career).join(" ");
  const relationship = uniqueSentences(month.relationship || month.love, phase.relationship, zodiac.relationshipPattern, card.relationship, card.love).join(" ");
  const health = uniqueSentences(month.health || month.mind || month.healthMind, phase.health, card.health, `${zodiac.animal}의 체력은 중요한 선택을 오래 지킬 수 있는 리듬을 만들 때 안정됩니다.`).join(" ");
  const caution = uniqueSentences(month.caution, phase.caution, zodiac.caution, card.shadow, card.avoid).join(" ");
  const action = uniqueSentences(month.action || month.advice, phase.action, zodiac.luckyAction, card.annualAdvice).join(" ");
  const summary = uniqueSentences(month.summary || month.overall, phase.flow, combination.summary).join(" ");
  return {
    ...month,
    month: index + 1,
    monthLabel: month.monthLabel,
    phase: phase.phase,
    phaseKeyword: phase.keyword,
    keyword: month.keyword || phase.keyword,
    direction: month.direction,
    orientation,
    zodiacAnimal: zodiac.animal,
    zodiacSymbol: asText(month.zodiacSymbol) || zodiac.symbol,
    zodiacTheme: zodiac.annualTheme,
    zodiacProfile: zodiac,
    zodiacTarotDynamic: combination.type,
    cardReading: card,
    combinationReading: combination,
    summary,
    overall: summary,
    flow,
    money,
    moneyWork: asText(month.moneyWork) || `${money} ${work}`,
    work,
    love: asText(month.love) || `${card.love} ${phase.relationship}`,
    relationship,
    health,
    healthMind: asText(month.healthMind) || health,
    caution,
    action,
    advice: asText(month.advice) || action,
    exam: asText(month.exam) || `${phase.work} ${card.advice}`,
    mainCard: {
      ...(month.mainCard || {}),
      cardId: cardCode(month),
      nameKo: asText(month.mainCard?.nameKo) || card.nameKo,
      nameEn: asText(month.mainCard?.nameEn) || card.nameEn,
      orientation,
      keywords: unique(month.mainCard?.keywords, card.keywords, phase.keyword).slice(0, 6),
      annualTheme: card.annualTheme,
      annualAdvice: card.annualAdvice,
      money: card.money,
      career: card.career,
      love: card.love,
      health: card.health,
      caution: card.shadow,
      advice: card.annualAdvice,
    },
  };
}

function pickMainMonth(months, annualSummary = {}) {
  if (annualSummary.bestMonth && typeof annualSummary.bestMonth === "object") {
    const monthNumber = Number(annualSummary.bestMonth.month);
    return months.find((month) => month.month === monthNumber) || months[0] || {};
  }
  return months.reduce((best, month) => {
    const card = month.cardReading || {};
    const score = (month.orientation === "reversed" ? 0 : 2) + (card.nameKo === "태양" || card.nameKo === "별" || card.nameKo === "세계" ? 2 : 0) + sentenceCount(month.flow);
    if (!best || score > best.score) return { month, score };
    return best;
  }, null)?.month || months[0] || {};
}

function buildAnnualSummary(months, previous = {}) {
  const mainMonth = pickMainMonth(months, previous);
  const mainCard = mainMonth.cardReading || getAnnualCardProfile(cardCode(mainMonth), mainMonth.orientation);
  const zodiac = mainMonth.zodiacProfile || getZodiacProfile(mainMonth.zodiacAnimal);
  const keywords = unique(previous.topKeywords, mainMonth.keyword, mainCard.keywords, zodiac.symbol).slice(0, 3);
  const summary = asText(previous.summary) || `${zodiac.animal}의 ${zodiac.annualTheme}이 ${mainCard.nameKo}의 ${mainCard.annualTheme}과 만나 올해의 중심축을 이룹니다.`;
  const oneLineMessage = `${zodiac.animal}의 감각과 ${mainCard.nameKo}의 방향을 한곳에 모을 때, 올해의 문이 현실적인 선택으로 열립니다.`;
  const coreAdvice = `${zodiac.luckyAction} ${mainCard.annualAdvice}`;
  return {
    ...previous,
    zodiacAnimal: zodiac.animal,
    zodiacAnimals: months.map((month) => month.zodiacAnimal),
    mainCard: {
      cardId: cardCode(mainMonth),
      nameKo: mainCard.nameKo,
      nameEn: mainCard.nameEn,
      orientation: mainMonth.orientation,
      keywords: mainCard.keywords,
    },
    keywords,
    topKeywords: keywords,
    oneLineMessage,
    coreAdvice,
    overallMood: `${zodiac.symbol}과 ${SUIT_LABELS[asText(mainMonth.mainCard?.suit).toLowerCase()] || "삶의 방향"}이 올해의 분위기를 이끕니다.`,
    summary,
    bestMonth: mainMonth,
  };
}

function buildYearNarrative(months, annualSummary) {
  const first = months[0] || {};
  const middle = months[5] || months[6] || first;
  const final = months[11] || months[10] || first;
  return [
    `1월의 ${first.zodiacAnimal}과 ${cardName(first)}은 올해 무엇을 시작할지보다 무엇을 기준으로 삼을지를 먼저 묻습니다.`,
    `2월에는 그 기준이 예산과 일정에 닿으며 오래 지킬 수 있는 방식으로 다듬어집니다.`,
    `3월의 ${cardName(months[2])}은 준비한 능력을 바깥에 보여 주고 첫 반응을 확인하게 합니다.`,
    `4월에는 관계와 협업이 흐름에 들어오며 혼자 세운 계획이 함께 지킬 약속으로 바뀝니다.`,
    `5월에는 가능성이 많아지는 만큼 선택과 집중이 올해의 첫 번째 시험이 됩니다.`,
    `6월의 ${middle.zodiacAnimal}은 상반기의 결과를 근거로 방향을 다시 조정하는 전환점을 엽니다.`,
    `7월에는 활동 반경과 무대가 넓어지지만 목적지와 경계를 함께 정해야 확장이 남습니다.`,
    `8월은 바깥의 속도를 안쪽의 품질과 회복으로 가져오는 정비의 달입니다.`,
    `9월에는 여러 시도 중 실제로 남길 것을 수익·성장·관계의 질로 가려냅니다.`,
    `10월에는 ${cardName(months[9])}의 결과가 책임과 계약의 이름을 얻으며 현실에 고정됩니다.`,
    `11월에는 올해 나를 살린 습관과 소모시킨 습관을 구분하며 다음 주기를 위한 공간을 만듭니다.`,
    `12월의 ${final.zodiacAnimal}은 ${annualSummary.mainCard?.nameKo || cardName(final)}의 메시지를 결실로 봉인하고 다음 해에 가져갈 씨앗만 남깁니다.`,
  ];
}

function fieldSentences(months, field, cardField) {
  return uniqueSentences(
    months[0]?.[field],
    months[3]?.[field],
    months[5]?.[field],
    months[8]?.[field],
    months[11]?.[field],
    months[0]?.cardReading?.[cardField],
  ).slice(0, 4);
}

function category(title, keyword, reading, caution, action) {
  return { title, keyword, reading: uniqueSentences(reading).join(" "), caution: asText(caution), action: asText(action) };
}

function buildCategoryReadings(months, annualSummary) {
  const main = months[0]?.cardReading || {};
  const money = fieldSentences(months, "money", "money");
  const work = fieldSentences(months, "work", "career");
  const love = fieldSentences(months, "love", "love");
  const relationship = fieldSentences(months, "relationship", "relationship");
  const health = fieldSentences(months, "health", "health");
  const actions = uniqueSentences(...months.map((month) => month.action));
  const opportunities = uniqueSentences(months[2]?.combinationReading?.summary, months[6]?.combinationReading?.summary, months[9]?.combinationReading?.summary);
  const turning = uniqueSentences(months[0]?.summary, months[5]?.summary, months[9]?.summary);
  const zodiacAction = uniqueSentences(...months.map((month) => month.zodiacProfile?.luckyAction));
  return {
    money: category("금전운", "반복 가능한 수익 구조", [...money, main.money], main.avoid, actions[0]),
    career: category("일·사업운", "실력을 결과와 책임으로 바꾸기", [...work, main.career], main.avoid, actions[1] || actions[0]),
    love: category("연애운", "감정과 현실의 속도 맞추기", [...love, main.love], main.avoid, actions[2] || actions[0]),
    relationship: category("인간관계운", "오래 남을 사람을 구분하기", [...relationship, months[5]?.zodiacProfile?.relationshipPattern], months[5]?.caution, actions[3] || actions[0]),
    health: category("건강·컨디션", "리듬을 지키는 회복", [...health, main.health], months[7]?.caution, actions[4] || actions[0]),
    family: category("가족·생활운", "돌봄과 경계의 균형", [months[3]?.relationship, months[5]?.relationship, months[10]?.relationship, months[11]?.zodiacProfile?.relationshipPattern], months[3]?.caution, actions[5] || actions[0]),
    growth: category("공부·성장운", "하나를 반복해 자산으로 만들기", [months[1]?.work, months[7]?.work, months[8]?.work, main.career], months[4]?.caution, actions[6] || actions[0]),
    noblePerson: category("귀인운", "다음 행동을 선명하게 하는 사람", [months[2]?.combinationReading?.summary, months[6]?.combinationReading?.summary, months[9]?.combinationReading?.summary, annualSummary.coreAdvice], "도움을 받기 전에 원하는 역할과 질문을 구체화하세요.", zodiacAction[0]),
    caution: category("주의해야 할 선택", "불안에 휩쓸린 큰 결론 줄이기", [months[4]?.caution, months[7]?.caution, months[10]?.caution, main.shadow], "감정이 커질수록 계약·비용·일정처럼 확인 가능한 조건부터 점검하세요.", "결정 전 사실·추측·바람을 나누어 적으세요."),
    opportunity: category("올해의 기회", "준비된 실력을 현실에 공개하기", opportunities, "작은 반응을 전체 성공으로 확대하지 말고 다음 증거를 확인하세요.", actions[0]),
    turningPoint: category("올해의 전환점", "상반기 결과를 하반기 기준으로 바꾸기", turning, "전환의 순간에 모든 것을 한 번에 뒤집지 마세요.", months[5]?.action),
    luckyAction: category("올해의 행운 행동", "기준을 기록하고 반복하기", [...zodiacAction.slice(0, 2), ...actions.slice(0, 2), annualSummary.coreAdvice], "행동을 크게 만들기보다 매달 다시 확인할 수 있게 남기세요.", actions[0]),
  };
}

function buildLegacyCategoryReading(categoryReadings) {
  return {
    money: categoryReadings.money.reading,
    career: categoryReadings.career.reading,
    love: categoryReadings.love.reading,
    health: categoryReadings.health.reading,
    family: categoryReadings.family.reading,
    growth: categoryReadings.growth.reading,
    noblePerson: categoryReadings.noblePerson.reading,
    caution: categoryReadings.caution.reading,
  };
}

function buildTurningPoints(months) {
  const first = months[0] || {};
  const middle = months[5] || months[6] || first;
  const last = months[9] || months[11] || first;
  return [
    { period: `상반기 기준 · ${monthLabel(first)}~${monthLabel(months[2], monthLabel(first))}`, meaning: `${first.zodiacAnimal}의 상징과 ${cardName(first)}이 올해의 기준을 세웁니다. 여러 가능성을 동시에 키우기보다 끝까지 가져갈 기준을 하나 정하세요.`, advice: first.action },
    { period: `방향 전환 · ${monthLabel(middle)}`, meaning: `${middle.zodiacAnimal}의 결이 ${cardName(middle)}의 메시지와 만나 상반기 결과를 하반기 선택으로 바꿉니다. 감정이 아니라 확인된 결과를 기준으로 조정하세요.`, advice: middle.action },
    { period: `현실화와 결실 · ${monthLabel(last)}~${monthLabel(months[11], monthLabel(last))}`, meaning: `${last.zodiacAnimal}과 ${cardName(last)}이 앞서 세운 기준을 책임과 결과의 형태로 남깁니다. 덜어낼 것과 이어갈 것을 구분할수록 성과가 선명해집니다.`, advice: last.action },
  ];
}

function buildPremiumYearReading({ reading = {}, year } = {}) {
  const rawMonths = Array.isArray(reading.monthlyReadings) ? reading.monthlyReadings.slice(0, 12) : [];
  const months = Array.from({ length: 12 }, (_, index) => buildMonthlyReading(rawMonths[index] || {}, index));
  const previousAnnual = reading.annualSummary && typeof reading.annualSummary === "object" ? reading.annualSummary : {};
  const annualSummary = buildAnnualSummary(months, previousAnnual);
  const mainMonth = annualSummary.bestMonth || months[0];
  const mainCard = mainMonth.cardReading || getAnnualCardProfile(cardCode(mainMonth), mainMonth.orientation);
  const mainZodiac = mainMonth.zodiacProfile || getZodiacProfile(mainMonth.zodiacAnimal);
  const categoryReadings = buildCategoryReadings(months, annualSummary);
  const yearNarrative = buildYearNarrative(months, annualSummary);
  const turningPoints = buildTurningPoints(months);
  const luckyActions = uniqueSentences(
    mainZodiac.luckyAction,
    mainCard.annualAdvice,
    ...months.slice(0, 4).map((month) => month.action),
    ...months.map((month) => month.zodiacProfile?.luckyAction),
  ).slice(0, 7);
  const finalMessage = {
    oneLine: annualSummary.oneLineMessage,
    attitude: `${annualSummary.coreAdvice} ${annualSummary.overallMood}`,
    opportunity: categoryReadings.opportunity.action,
    release: categoryReadings.caution.caution,
    zodiacMessage: `${mainZodiac.animal}의 상징은 올해의 운이 정해진 결말보다 매달의 선택이 이어 만든 방향임을 전합니다.`,
    text: uniqueSentences(
      annualSummary.oneLineMessage,
      annualSummary.summary,
      annualSummary.coreAdvice,
      categoryReadings.opportunity.reading,
      categoryReadings.caution.action,
      `${mainZodiac.animal}의 ${mainZodiac.luckyAction}`,
      "올해의 결실은 서두른 확정보다 반복 가능한 선택에서 오래 남습니다.",
    ).join(" "),
  };
  const mainCardReading = {
    ...mainCard,
    basicMeaning: `${mainCard.nameKo} 카드는 ${mainCard.annualTheme}을 상징합니다.`,
    yearAppearance: mainCard.premiumText,
    brightSide: mainCard.light,
    shadowSide: mainCard.shadow,
    moneyMeaning: mainCard.money,
    careerMeaning: mainCard.career,
    relationshipMeaning: `${mainCard.love} ${mainCard.relationship}`,
    healthMeaning: mainCard.health,
    bestUse: mainCard.annualAdvice,
    avoidAttitude: mainCard.avoid,
    combinationReading: monthlyCombination(mainMonth, mainCard, mainZodiac, mainMonth.phase),
  };
  return {
    ...reading,
    monthlyReadings: months,
    schemaVersion: "tarot-year-v3",
    year: Number(year) || new Date().getFullYear(),
    annualSummary,
    mainCardReading,
    zodiacProfiles: ZODIAC_YEAR_PROFILES,
    zodiacGuardians: months.map((month) => ({ month: month.month, animal: month.zodiacAnimal, symbol: month.zodiacSymbol, theme: month.zodiacTheme })),
    yearNarrative,
    yearTheme: {
      ...(reading.yearTheme || {}),
      mainCard: annualSummary.mainCard,
      keyword: annualSummary.keywords.join(" · "),
      summary: annualSummary.summary,
      light: mainCard.light,
      shadow: mainCard.shadow,
      advice: annualSummary.coreAdvice,
      luckyAction: mainZodiac.luckyAction,
    },
    annualOverview: {
      ...(reading.annualOverview || {}),
      summary: annualSummary.summary,
      overallFlow: yearNarrative.slice(0, 4).join(" ") + " " + yearNarrative.slice(4, 8).join(" ") + " " + yearNarrative.slice(8).join(" "),
      strongestEnergy: annualSummary.overallMood,
      recurringTheme: `올해 반복되는 주제는 ${annualSummary.keywords.join("·") || "기준과 실행"}입니다.`,
      cautionPattern: categoryReadings.caution.caution,
      openingPattern: categoryReadings.opportunity.reading,
      stance: annualSummary.coreAdvice,
    },
    categoryReadings,
    categoryReading: buildLegacyCategoryReading(categoryReadings),
    turningPoints,
    luckyActions,
    finalMessage,
    finalAdvice: finalMessage.text,
    premiumQuality: {
      monthlyCount: months.length,
      categoryCount: Object.keys(categoryReadings).length,
      zodiacProfileCount: ZODIAC_YEAR_PROFILES.length,
      turningPointCount: turningPoints.length,
      luckyActionCount: luckyActions.length,
      sentenceCount: yearNarrative.reduce((total, line) => total + sentenceCount(line), 0),
    },
  };
}

function validatePremiumYearReading(reading = {}) {
  const months = Array.isArray(reading.monthlyReadings) ? reading.monthlyReadings : [];
  const categories = reading.categoryReadings && typeof reading.categoryReadings === "object"
    ? reading.categoryReadings
    : reading.categoryReading && typeof reading.categoryReading === "object" ? reading.categoryReading : {};
  const isLegacyV2 = reading.schemaVersion === "tarot-year-v2" || !reading.categoryReadings;
  const requiredCategories = isLegacyV2
    ? ["money", "career", "love", "health", "family", "growth", "noblePerson", "caution"]
    : ["money", "career", "love", "relationship", "health", "family", "growth", "noblePerson", "caution", "opportunity", "turningPoint", "luckyAction"];
  const missingCategories = requiredCategories.filter((key) => !categories[key]);
  const monthlyFailures = months.flatMap((month, index) => {
    const failures = [];
    const monthlyField = (field) => ({
      money: month?.money || month?.moneyWork,
      work: month?.work || month?.moneyWork,
      health: month?.health || month?.healthMind,
      action: month?.action || month?.advice,
    }[field] || month?.[field]);
    ["flow", "money", "work", "relationship", "health", "caution", "action"].forEach((field) => {
      if (!asText(monthlyField(field))) failures.push(`month_${index + 1}_${field}_missing`);
    });
    if (!isLegacyV2 && sentenceCount(month?.flow) < 2) failures.push(`month_${index + 1}_flow_short`);
    return failures;
  });
  return {
    ok: months.length === 12
      && missingCategories.length === 0
      && Array.isArray(reading.turningPoints)
      && reading.turningPoints.length >= 3
      && (!reading.schemaVersion || reading.schemaVersion === "tarot-year-v2" || reading.schemaVersion === "tarot-year-v3"),
    monthlyCount: months.length,
    categoryCount: Object.keys(categories).length,
    missingCategories,
    monthlyFailures,
    missing: [
      !reading.annualSummary?.mainCard?.nameKo && "annualSummary.mainCard",
      !asText(reading.annualSummary?.oneLineMessage || reading.annualSummary?.summary) && "annualSummary.summary",
      !asText(reading.annualOverview?.summary) && "annualOverview.summary",
      !asText(reading.finalMessage?.text || reading.finalAdvice) && "finalMessage.text",
    ].filter(Boolean),
  };
}

export {
  buildPremiumYearReading,
  validatePremiumYearReading,
  drawPremiumYearCards,
  ZODIAC_YEAR_PROFILES,
};

