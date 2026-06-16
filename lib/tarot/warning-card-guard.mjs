const WARNING_CARD_PROFILES = {
  M16: {
    names: ["탑", "The Tower", "Tower"],
    keywords: ["붕괴", "문제 노출", "구조 점검", "충격"],
    meaning: "탑은 약한 기반이 갑자기 흔들리며 숨은 문제가 표면으로 올라오는 카드입니다.",
    caution: "문제를 덮거나 급히 키우면 균열이 더 커질 수 있습니다.",
    advice: "확장보다 구조 점검, 계약·비용·관계 균열 확인을 먼저 두세요.",
    pulse: "갑작스러운 변화가 들어와도 바로 밀어붙이기보다 흔들린 기반을 먼저 확인해야 합니다.",
    opportunity: "좋게 살릴 수 있는 단서는 빠른 확장이 아니라, 무너질 부분을 먼저 발견해 손실을 줄이는 데 있습니다.",
    actions: ["숨은 비용과 책임 소재를 적습니다.", "계약·일정·사람 사이의 균열을 확인합니다."],
  },
  M15: {
    names: ["악마", "The Devil", "Devil"],
    keywords: ["집착", "유혹", "의존", "속박"],
    meaning: "악마는 강한 끌림과 욕망 뒤에 빠져나오기 어려운 조건이 붙는 카드입니다.",
    caution: "달콤한 제안, 반복되는 집착, 의존 구조를 가볍게 넘기면 선택권이 줄어듭니다.",
    advice: "수익이나 끌림보다 해지 조건, 위약금, 중독성 패턴, 경계선을 먼저 확인하세요.",
    pulse: "욕망의 힘이 강할수록 지금은 매력보다 묶이는 조건을 차갑게 봐야 합니다.",
    opportunity: "좋게 살릴 수 있는 단서는 욕망을 키우는 데가 아니라, 묶인 고리를 알아차리고 선택권을 되찾는 데 있습니다.",
    actions: ["해지 조건과 책임 범위를 확인합니다.", "반복되는 집착 행동 하나를 중단 목록에 적습니다."],
  },
  M18: {
    names: ["달", "The Moon", "Moon"],
    keywords: ["불안", "착각", "모호함", "숨은 감정"],
    meaning: "달은 불안, 착각, 숨은 감정이 섞여 판단이 흐려지는 카드입니다.",
    caution: "직감만 믿고 단정하면 상상과 사실이 뒤엉킬 수 있습니다.",
    advice: "확인된 행동, 기록, 약속과 머릿속 가정을 분리한 뒤 판단하세요.",
    pulse: "모호함이 짙은 자리라 지금은 느낌을 부정하지 않되 사실 확인을 앞세워야 합니다.",
    opportunity: "좋게 살릴 수 있는 단서는 더 큰 확신이 아니라, 불안을 기록하고 확인 가능한 근거를 되찾는 데 있습니다.",
    actions: ["사실과 추측을 두 칸으로 나눠 적습니다.", "확인되지 않은 감정 결론은 하루 보류합니다."],
  },
  S10: {
    names: ["소드 텐", "소드 10", "검 10", "Ten of Swords", "10 of Swords"],
    keywords: ["종결", "소진", "배신감", "최악의 생각"],
    meaning: "소드 10은 생각과 긴장이 한계에 닿아 더 버티는 방식이 끝나는 카드입니다.",
    caution: "끝난 패턴을 억지로 되살리면 소진과 상처가 반복될 수 있습니다.",
    advice: "무리한 재시작보다 중단, 회복, 손실 확정을 먼저 받아들이세요.",
    pulse: "지금은 다시 밀어붙일 때가 아니라 끝난 구조를 인정하고 회복 공간을 확보할 때입니다.",
    opportunity: "좋게 살릴 수 있는 단서는 재도전의 속도가 아니라, 멈춰야 할 패턴을 분명히 끝내는 데 있습니다.",
    actions: ["오늘 중단할 행동 하나를 정합니다.", "몸과 일정의 회복 시간을 먼저 확보합니다."],
  },
  P05: {
    names: ["펜타클 파이브", "펜타클 5", "Five of Pentacles", "5 of Pentacles"],
    keywords: ["결핍", "재정 압박", "소외", "지원 부족"],
    meaning: "펜타클 5는 돈, 몸, 관계에서 부족함과 고립감이 현실 압박으로 떠오르는 카드입니다.",
    caution: "혼자 버티거나 없는 자원을 있는 것처럼 계산하면 손실이 커질 수 있습니다.",
    advice: "비용 축소, 도움 요청, 회수 일정, 생활 기반 점검을 먼저 하세요.",
    pulse: "지금은 낙관으로 덮기보다 부족한 자원과 실제 지원선을 확인해야 합니다.",
    opportunity: "좋게 살릴 수 있는 단서는 큰 수익 기대가 아니라, 누수와 고립을 줄이는 현실 지원을 찾는 데 있습니다.",
    actions: ["고정비와 당장 줄일 지출을 분리합니다.", "도움을 요청할 사람이나 제도를 하나 확인합니다."],
  },
};

const NAME_TO_CODE = Object.entries(WARNING_CARD_PROFILES).reduce((map, [code, profile]) => {
  profile.names.forEach((name) => map.set(normalizeCardToken(name), code));
  return map;
}, new Map());

const OPTIMISM_REPLACEMENTS = [
  [/에너지가\s*자연스럽게\s*움직이는\s*신호입니다\.?/g, "경고 신호가 선명하게 드러나는 자리입니다."],
  [/흐름은\s*비교적\s*열려\s*있으며,\s*행동을\s*붙이면\s*현실\s*변화로\s*이어질\s*가능성이\s*큽니다\.?/g, "흐름을 낙관으로 덮기보다 먼저 위험 조건을 확인해야 합니다."],
  [/오늘\s*가능한\s*실행\s*단위를\s*작게\s*설정하고\s*끝까지\s*완료하세요\.?/g, "오늘은 실행보다 확인과 정리를 먼저 끝내세요."],
  [/작은\s*실행을\s*반복(?:해|할수록)[^.。!?]*[.。!?]?/g, "작게 움직이기 전 위험 조건을 먼저 분리하세요."],
  [/가능성이\s*(?:올라갑니다|큽니다|살아\s*있습니다)\.?/g, "가능성보다 경계 조건이 먼저입니다."],
  [/좋은\s*결과가\s*기대됩니다\.?/g, "낙관보다 점검이 먼저입니다."],
  [/과감히\s*확장(?:하세요|합니다|해도\s*좋습니다)?\.?/g, "확장보다 구조와 손실선을 먼저 확인하세요."],
  [/기대\s*이상의\s*결과를\s*만들\s*수\s*있습니다\.?/g, "기대보다 손실 제한이 먼저입니다."],
  [/흐름이\s*안정적으로\s*강화됩니다\.?/g, "불안정한 조건을 먼저 낮춰야 합니다."],
  [/현실로\s*드러나기\s*쉽습니다\.?/g, "현실 변수로 드러날 수 있어 확인이 필요합니다."],
];

function asText(value) {
  return String(value || "").trim();
}

function normalizeCardToken(value) {
  return asText(value).toLowerCase().replace(/[\s_·\-]+/g, "");
}

function getCandidateTokens(cardLike = {}) {
  if (typeof cardLike === "string") return [cardLike];
  if (!cardLike || typeof cardLike !== "object") return [];
  return [
    cardLike.code,
    cardLike.cardCode,
    cardLike.cardId,
    cardLike.id,
    cardLike.nameKo,
    cardLike.nameKr,
    cardLike.cardNameKo,
    cardLike.cardNameKr,
    cardLike.nameEn,
    cardLike.name,
    cardLike.cardNameEn,
    cardLike.cardName,
  ].filter(Boolean);
}

function normalizeWarningCardCode(cardLike) {
  for (const token of getCandidateTokens(cardLike)) {
    const clean = asText(token).toUpperCase();
    if (WARNING_CARD_PROFILES[clean]) return clean;
    const byName = NAME_TO_CODE.get(normalizeCardToken(token));
    if (byName) return byName;
  }
  return "";
}

function getWarningCardGuard(cardLike) {
  const code = normalizeWarningCardCode(cardLike);
  return code ? { code, ...WARNING_CARD_PROFILES[code] } : null;
}

function containsWarningSignal(text, profile) {
  const source = asText(text);
  if (!source || !profile) return false;
  return [...profile.keywords, "점검", "확인", "보류", "중단", "손실", "경계", "균열", "압박"].some((word) => source.includes(word));
}

function stripLeadingCardSubject(text, profile) {
  let next = asText(text);
  (profile?.names || []).forEach((name) => {
    const lead = asText(name);
    if (lead) next = next.replace(new RegExp(`^${lead}[은는]\\s*`), "");
  });
  return next;
}

function guardWarningTarotText(text, cardLike, options = {}) {
  const profile = getWarningCardGuard(cardLike);
  let next = asText(text || options.fallback);
  if (!profile || !next) return next;

  OPTIMISM_REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });

  const field = asText(options.field);
  if (field === "meaning" || field === "cardMeaning" || field === "interpretation") {
    next = containsWarningSignal(next, profile) ? next : `${profile.meaning} ${next}`;
  }
  if (field === "caution") {
    next = next.includes(profile.caution)
      ? next
      : (containsWarningSignal(next, profile) ? `${profile.caution} ${next}` : profile.caution);
  }
  if (field === "advice" || field === "action" || field === "actionStep" || field === "uplift" || field === "opportunity") {
    const fallbackAdvice = field === "opportunity" ? profile.opportunity : (profile.actions[0] || profile.advice);
    next = containsWarningSignal(next, profile) ? next : fallbackAdvice;
  }
  if (field === "pulse") {
    next = profile.pulse;
  }

  return next.replace(/\s{2,}/g, " ").trim();
}

function guardWarningTarotList(list, cardLike, options = {}) {
  const source = Array.isArray(list) ? list : [];
  const guarded = source.map((item) => guardWarningTarotText(item, cardLike, options)).filter(Boolean);
  const profile = getWarningCardGuard(cardLike);
  if (profile && !guarded.some((item) => containsWarningSignal(item, profile))) {
    guarded.unshift(options.field === "caution" ? profile.caution : profile.advice);
  }
  return Array.from(new Set(guarded));
}

function buildWarningCardMeaningOverride(cardLike, orientation = "upright") {
  const profile = getWarningCardGuard(cardLike);
  if (!profile) return null;
  const reversed = orientation === "reversed";
  const firstAction = profile.actions[0] || profile.advice;
  const secondAction = profile.actions[1] || firstAction;
  const prefix = reversed
    ? `${profile.names[0]} 역방향은 경고가 사라진 것이 아니라 지연되거나 안쪽으로 숨어 있는 상태입니다.`
    : `${profile.names[0]} 정방향은 ${stripLeadingCardSubject(profile.meaning, profile)}`;
  return {
    keywords: profile.keywords,
    core: [prefix, profile.pulse],
    light: [profile.opportunity],
    shadow: [profile.caution],
    monthly: [`이번 달에는 ${profile.advice}`],
    love: [`연애에서는 감정의 크기보다 ${profile.advice}`],
    relationship: [`관계에서는 단정과 과속보다 ${profile.advice}`],
    reunion: [`재회에서는 그리움보다 ${profile.advice}`],
    exMind: [`상대의 속마음은 확신보다 경계가 앞설 수 있어 ${profile.advice}`],
    currentMind: [`현재 심리는 불안과 방어가 섞여 있어 ${profile.advice}`],
    future: [`가까운 흐름은 무리하게 열기보다 ${profile.advice}`],
    career: [`진로와 일에서는 ${profile.advice}`],
    money: [`금전에서는 ${profile.advice}`],
    moneyWork: [`금전과 일에서는 ${profile.advice}`],
    healthMind: [`건강과 멘탈에서는 ${profile.advice}`],
    daily: [`오늘은 ${profile.advice}`],
    general: [`전체 흐름은 낙관보다 ${profile.advice}`],
    advice: [firstAction, secondAction],
    caution: [profile.caution],
    recoveryAdvice: [firstAction],
    coreMeaning: prefix,
    psychologicalMeaning: profile.caution,
    selfEsteemMeaning: `자기 기준을 지키려면 ${secondAction}`,
    shadowText: profile.caution,
    shadowNote: profile.caution,
    adviceText: firstAction,
  };
}

function guardWarningTarotSection(section, cardLike) {
  const profile = getWarningCardGuard(cardLike || section);
  if (!profile || !section || typeof section !== "object") return section;
  const next = { ...section };
  const meaningFields = ["meaning", "content", "cardMeaning", "interpretation", "topicInterpretation", "hiddenPattern", "questionSpecificMeaning", "summary", "overall", "overallFlow", "strongestSignal", "oracleMessage", "storyFlow", "finalReading"];
  const cautionFields = ["caution", "risk", "shadow", "shadowText"];
  const adviceFields = ["advice", "action", "actionTip", "actionStep", "uplift", "opportunity", "finalAdvice", "timingAdvice", "recoveryAdvice"];

  meaningFields.forEach((field) => {
    if (next[field]) next[field] = guardWarningTarotText(next[field], profile, { field: "meaning" });
  });
  cautionFields.forEach((field) => {
    if (next[field]) next[field] = guardWarningTarotText(next[field], profile, { field: "caution" });
  });
  adviceFields.forEach((field) => {
    if (next[field]) next[field] = guardWarningTarotText(next[field], profile, { field: "advice" });
  });
  if (Array.isArray(next.practicalActions)) {
    next.practicalActions = guardWarningTarotList(next.practicalActions, profile, { field: "advice" }).slice(0, 5);
  }
  if (Array.isArray(next.actionPlan)) {
    next.actionPlan = guardWarningTarotList(next.actionPlan, profile, { field: "advice" }).slice(0, 6);
  }
  return next;
}

export {
  buildWarningCardMeaningOverride,
  getWarningCardGuard,
  guardWarningTarotList,
  guardWarningTarotSection,
  guardWarningTarotText,
  isWarningTarotCard,
  normalizeWarningCardCode,
};

function isWarningTarotCard(cardLike) {
  return Boolean(normalizeWarningCardCode(cardLike));
}
