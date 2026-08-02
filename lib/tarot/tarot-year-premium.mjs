const ZODIAC_SYMBOLISM = Object.freeze({
  "쥐": { strength: "기회를 포착하는 정보력", shadow: "가능성을 너무 빨리 좇는 조급함", action: "결정 전에 정보원을 두 곳으로 나눠 확인하세요." },
  "소": { strength: "천천히 쌓아 올리는 현실감", shadow: "익숙한 방식을 오래 붙드는 경직성", action: "작게라도 매주 같은 시간에 축적하는 루틴을 만드세요." },
  "호랑이": { strength: "막힌 판을 돌파하는 용기", shadow: "승부를 서두르며 협력자를 놓치는 태도", action: "가장 큰 승부수 하나만 정하고 나머지는 순서를 늦추세요." },
  "토끼": { strength: "관계의 온도와 미세한 변화를 읽는 감각", shadow: "상대의 기분을 먼저 살피느라 내 기준을 미루는 습관", action: "배려와 양보를 구분하는 한 문장을 준비하세요." },
  "용": { strength: "큰 그림을 그리고 상승의 문을 여는 비전", shadow: "계획의 크기가 실행의 속도를 앞서는 모습", action: "큰 목표를 이번 달에 확인할 한 가지 증거로 줄이세요." },
  "뱀": { strength: "숨은 흐름을 읽고 타이밍을 고르는 전략", shadow: "확신이 생길 때까지 지나치게 관망하는 태도", action: "드러나지 않은 조건을 문서로 확인한 뒤 조용히 움직이세요." },
  "말": { strength: "이동과 확장을 현실로 옮기는 추진력", shadow: "속도가 방향보다 앞서 계획이 흩어지는 흐름", action: "이동할 때마다 목적과 돌아올 기준을 한 줄로 적으세요." },
  "양": { strength: "조화와 회복을 만드는 섬세한 감수성", shadow: "갈등을 피하려고 필요한 말을 삼키는 습관", action: "관계를 지키기 위한 최소한의 경계를 먼저 말하세요." },
  "원숭이": { strength: "기술과 변칙으로 막힌 문제를 푸는 지혜", shadow: "새로운 방법을 찾느라 하나를 끝내지 못하는 분산", action: "새 도구는 하나만 고르고 기존 작업을 끝낸 뒤 바꾸세요." },
  "닭": { strength: "흐릿한 것을 정리하고 실력을 드러내는 표현력", shadow: "완성도를 높이려다 공개 시기를 놓치는 완벽주의", action: "검토 기준을 세 가지로 제한하고 결과를 먼저 공유하세요." },
  "개": { strength: "신뢰를 쌓고 사람과 약속을 지키는 보호 본능", shadow: "책임을 혼자 떠안아 관계의 균형을 잃는 모습", action: "역할과 답변 기한을 말로만 두지 말고 기록하세요." },
  "돼지": { strength: "풍요를 누리고 삶의 감각을 회복하는 힘", shadow: "편안함을 지키느라 필요한 정리를 미루는 흐름", action: "마무리할 일과 다음 달로 넘길 일을 분리해 적으세요." },
});

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

function cardName(month = {}) {
  return asText(month.mainCard?.nameKo || month.mainCard?.cardNameKo || month.cardName || "올해의 카드");
}

function animalMeaning(month = {}) {
  const animal = asText(month.zodiacAnimal);
  return ZODIAC_SYMBOLISM[animal] || { strength: "흐름을 읽고 균형을 잡는 감각", shadow: "신호를 한쪽으로만 해석하는 습관", action: "이번 달의 신호를 현실 행동 하나로 옮기세요." };
}

function representative(months = [], predicate = () => true) {
  return months.find(predicate) || months[0] || {};
}

function domainRollup(months, fields, label, fallback) {
  const source = months.map((month) => fields.map((field) => month?.[field])).flat();
  const excerpts = unique(source).slice(0, 2);
  return excerpts.length
    ? `${label}의 흐름은 한 번에 결론을 내리기보다 ${excerpts.join(" 또한 ")} 이라는 순서로 읽힙니다. 이 시기에는 신호를 크게 해석하기보다, 반복해서 확인되는 조건을 기준으로 선택하세요.`
    : fallback;
}

function buildYearTheme(months, annualSummary = {}) {
  const peak = annualSummary.bestMonth || representative(months, (month) => month.mainCard?.orientation !== "reversed");
  const meaning = animalMeaning(peak);
  const suit = asText(peak.mainCard?.suit).toLowerCase();
  const suitFlow = SUIT_LABELS[suit] || SUIT_LABELS.major;
  const name = cardName(peak);
  const keywords = unique(annualSummary.topKeywords, peak.keywords).slice(0, 4);

  return {
    mainCard: {
      cardId: asText(peak.mainCard?.cardId || peak.mainCard?.id),
      nameKo: name,
      nameEn: asText(peak.mainCard?.nameEn),
      orientation: asText(peak.mainCard?.orientation || peak.orientation) || "upright",
      suit,
      keywords,
    },
    keyword: keywords.join(" · ") || suitFlow,
    summary: `${monthLabel(peak)}의 ${asText(peak.zodiacAnimal) || "수호 흐름"}과 ${name}이 올해의 중심축을 이룹니다. ${suitFlow}이 생활 곳곳에서 반복되며, 한 번의 큰 도약보다 신호를 알아보고 현실의 순서로 옮기는 힘이 중요해집니다.`,
    light: `올해는 ${meaning.strength}을 활용할 때 관계와 일의 흐름이 자연스럽게 연결됩니다. 특히 ${monthLabel(peak)}에는 이미 준비해 온 것을 밖으로 꺼내 확인하기 좋습니다.`,
    shadow: `${meaning.shadow}이 카드의 그림자 면으로 나타날 수 있습니다. 좋은 흐름을 느꼈다는 이유만으로 속도를 올리기보다, 조건과 역할을 확인하면서 선택을 작게 나누는 편이 안전합니다.`,
    advice: `${meaning.action} ${asText(peak.advice) || "달마다 한 가지 기준을 정해 끝까지 확인하세요."}`,
    luckyAction: meaning.action,
  };
}

function buildAnnualOverview(months, annualSummary, yearTheme) {
  const strongestEnergy = asText(annualSummary.dominantSuit) || "혼합된 현실 감각";
  const transition = annualSummary.peakMonth || annualSummary.bestMonth || representative(months.slice(5), Boolean);
  const caution = annualSummary.cautionMonth || representative(months, (month) => month.orientation === "reversed");
  return {
    summary: asText(annualSummary.summary) || yearTheme.summary,
    overallFlow: asText(annualSummary.overallFlow) || "상반기에는 기준을 세우고, 중반에는 방향을 조정하며, 하반기에는 선택을 현실에 남기는 흐름입니다.",
    strongestEnergy: `${strongestEnergy}이 올해의 가장 강한 기운으로 읽힙니다. ${yearTheme.keyword}라는 키워드를 생활의 우선순위로 번역해 보세요.`,
    recurringTheme: `반복되는 주제는 ${yearTheme.keyword || "기준과 실행"}입니다. 카드가 바뀌어도 같은 질문이 되돌아온다면, 더 많은 정보보다 선택 기준을 정리할 때입니다.`,
    cautionPattern: `${monthLabel(caution)}에는 ${asText(caution.caution) || yearTheme.shadow}이 두드러질 수 있습니다. 불안을 예언처럼 받아들이기보다, 확인할 조건을 세분화하세요.`,
    openingPattern: `${monthLabel(transition)}에는 ${asText(transition.opportunity) || "작게 시험해 볼 수 있는 문"}이 열립니다. 완벽한 준비를 기다리기보다 결과를 확인할 수 있는 작은 실행을 시작하세요.`,
    stance: `올해 필요한 태도는 속도를 늦추는 것이 아니라 방향을 잃지 않는 것입니다. ${yearTheme.advice}`,
  };
}

function buildCategoryReading(months, yearTheme) {
  const money = domainRollup(months, ["moneyWork", "money"], "금전운", `금전 흐름은 ${yearTheme.keyword}을 현실적인 예산과 반복 가능한 수익 구조로 바꿀 때 안정됩니다. 큰 확장보다 지출의 기준과 작은 수익 루트를 먼저 정리하세요.`);
  const career = domainRollup(months, ["moneyWork", "flow", "overall"], "일·사업운", "일과 사업에서는 잘하는 일을 넓히기보다 반복 가능한 방식으로 정리하는 과정이 중요합니다. 결과를 보여줄 기준과 마감일을 먼저 정하면 기회가 더 또렷해집니다.");
  const love = domainRollup(months, ["love", "relationship"], "연애·관계운", "연애와 관계에서는 마음의 크기보다 서로의 속도와 약속을 맞추는 일이 중요합니다. 상대의 마음을 단정하기보다 확인할 수 있는 대화를 남겨 두세요.");
  const health = domainRollup(months, ["healthMind"], "건강·컨디션", "컨디션은 의지보다 리듬의 영향을 크게 받습니다. 몰아서 회복하려 하기보다 수면, 식사, 휴식의 기준을 작은 단위로 고정하는 쪽이 좋습니다.");
  const family = domainRollup(months, ["relationship", "zodiacReading"], "가족·인간관계", "가까운 관계에서는 모두를 책임지려는 태도보다 역할과 경계를 분명히 하는 것이 관계를 오래 지키는 방법입니다.");
  const growth = domainRollup(months, ["advice", "exam"], "성장·공부", "성장운은 새 정보를 많이 모으는 데서보다, 하나를 반복해 결과로 남기는 데서 살아납니다. 배운 것을 설명하거나 기록해 자신의 기준으로 바꾸세요.");
  const noble = domainRollup(months, ["opportunity", "zodiacReading"], "귀인운", "귀인은 정답을 대신 주는 사람보다 다음 행동을 선명하게 해 주는 사람의 모습으로 들어옵니다. 도움을 받기 전에 원하는 역할과 질문을 구체화하세요.");
  const caution = domainRollup(months, ["caution"], "피해야 할 선택", "올해 피해야 할 선택은 불안 때문에 한 번에 크게 뒤집는 결정입니다. 감정이 커질수록 계약, 비용, 일정처럼 확인 가능한 조건부터 점검하세요.");
  return { money, career, love, health, family, growth, noblePerson: noble, caution };
}

function buildTurningPoints(months, annualSummary) {
  const first = representative(months.slice(0, 3));
  const middle = annualSummary.peakMonth || representative(months.slice(5, 8));
  const last = representative(months.slice(9, 12));
  return [
    {
      period: `상반기 · ${monthLabel(first)}~${monthLabel(representative(months.slice(2, 3)), monthLabel(first))}`,
      meaning: `초반에는 ${cardName(first)}과 ${asText(first.zodiacAnimal) || "수호 흐름"}이 기준을 세우는 역할을 합니다. 여러 가능성을 동시에 키우기보다 올해 끝까지 가져갈 기준을 하나 정하세요.`,
      advice: asText(first.advice) || "이번 분기에 확인할 결과를 한 가지로 좁혀 기록하세요.",
    },
    {
      period: `방향 전환 · ${monthLabel(middle)}`,
      meaning: `${cardName(middle)}이 보여주는 선택의 결이 한 해의 방향을 바꾸는 지점입니다. 익숙한 방식과 새로운 선택을 비교하되, 감정이 아니라 실제 결과를 기준으로 조정하세요.`,
      advice: asText(middle.advice) || asText(middle.opportunity) || "작은 실험으로 방향을 확인한 뒤 다음 단계를 정하세요.",
    },
    {
      period: `하반기 현실화 · ${monthLabel(last)}`,
      meaning: `후반부에는 앞서 세운 기준이 ${asText(last.zodiacAnimal) || "마무리 흐름"}과 만나 현실적인 결과로 남습니다. 덜어낼 것과 이어갈 것을 구분할수록 성과가 선명해집니다.`,
      advice: asText(last.advice) || "완료한 일과 다음 해로 넘길 일을 분리해 정리하세요.",
    },
  ];
}

function buildPremiumYearReading({ reading = {}, year } = {}) {
  const months = (Array.isArray(reading.monthlyReadings) ? reading.monthlyReadings.slice(0, 12) : []).map((month, index) => ({
    ...month,
    month: Number(month.month) || index + 1,
    monthLabel: monthLabel(month, `${index + 1}월`),
    keyword: asText(month.keyword) || list(month.keywords || month.mainCard?.keywords).slice(0, 3).join(" · ") || "이번 달의 선택 기준",
    direction: asText(month.direction) || (month.orientation === "reversed" ? "역방향" : "정방향"),
    summary: asText(month.summary) || asText(month.overall) || asText(month.flow),
    money: asText(month.money) || asText(month.moneyWork),
    work: asText(month.work) || asText(month.moneyWork),
    relationship: asText(month.relationship) || asText(month.love),
    mind: asText(month.mind) || asText(month.healthMind),
    caution: asText(month.caution) || asText(month.mainCard?.caution),
  }));
  const annualSummary = reading.annualSummary && typeof reading.annualSummary === "object" ? reading.annualSummary : {};
  const yearTheme = buildYearTheme(months, annualSummary);
  const annualOverview = buildAnnualOverview(months, annualSummary, yearTheme);
  const categoryReading = buildCategoryReading(months, yearTheme);
  const turningPoints = buildTurningPoints(months, annualSummary);
  const luckyActions = Array.from(new Set([
    yearTheme.luckyAction,
    ...months.slice(0, 4).map((month) => month.advice),
    ...months.map((month) => animalMeaning(month).action),
    "이번 달의 선택 기준을 한 문장으로 적고, 다음 달 첫 주에 다시 확인하세요.",
    "중요한 약속과 비용은 말보다 기록으로 남겨 흐름을 현실에 고정하세요.",
  ].map(asText).filter(Boolean))).slice(0, 5);
  const finalMessage = {
    oneLine: `${yearTheme.keyword || "한 해의 기준"}을 현실의 한 걸음으로 옮길 때 천운의 문이 열립니다.`,
    attitude: annualOverview.stance,
    opportunity: turningPoints[1]?.advice || yearTheme.advice,
    release: annualOverview.cautionPattern,
    zodiacMessage: `열두 수호신은 올해의 운이 이미 정해진 결말이 아니라, 매달의 선택이 이어 만든 방향임을 전합니다.`,
    text: asText(reading.finalAdvice) || annualOverview.stance,
  };

  return {
    ...reading,
    monthlyReadings: months,
    schemaVersion: "tarot-year-v2",
    year: Number(year) || new Date().getFullYear(),
    zodiacGuardians: months.map((month) => ({
      month: month.month,
      animal: month.zodiacAnimal,
      symbol: month.zodiacSymbol,
      theme: month.zodiacTheme,
    })),
    yearTheme,
    annualOverview,
    categoryReading,
    turningPoints,
    luckyActions,
    finalMessage,
    finalAdvice: finalMessage.text,
    premiumQuality: {
      monthlyCount: months.length,
      categoryCount: Object.keys(categoryReading).length,
      turningPointCount: turningPoints.length,
      luckyActionCount: luckyActions.length,
    },
  };
}

function validatePremiumYearReading(reading = {}) {
  const months = Array.isArray(reading.monthlyReadings) ? reading.monthlyReadings : [];
  const categories = reading.categoryReading && typeof reading.categoryReading === "object" ? reading.categoryReading : {};
  const requiredCategories = ["money", "career", "love", "health", "family", "growth", "noblePerson", "caution"];
  const emptyCategories = requiredCategories.filter((key) => !asText(categories[key]));
  return {
    ok: months.length === 12 && emptyCategories.length === 0 && Array.isArray(reading.turningPoints) && reading.turningPoints.length >= 3,
    monthlyCount: months.length,
    emptyCategories,
    missing: [
      !reading.yearTheme?.mainCard?.nameKo && "yearTheme.mainCard",
      !asText(reading.annualOverview?.summary) && "annualOverview.summary",
      !asText(reading.finalMessage?.text) && "finalMessage.text",
    ].filter(Boolean),
  };
}

export { buildPremiumYearReading, validatePremiumYearReading, ZODIAC_SYMBOLISM };
