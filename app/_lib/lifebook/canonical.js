const KOR_TO_EN_ELEMENT = {
  목: "wood",
  화: "fire",
  토: "earth",
  금: "metal",
  수: "water",
  wood: "wood",
  fire: "fire",
  earth: "earth",
  metal: "metal",
  water: "water",
};

const EN_TO_KOR_ELEMENT = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const HIDDEN_STEMS_BY_BRANCH = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

export const LIFEBOOK_FORBIDDEN_PHRASES = [
  "타고난 성향 자체보다 성향이 의사결정으로 변환되는 방식입니다.",
  "같은 사실을 보아도 어떤 사람은 관계를 우선하고",
  "반복 패턴은 사건이 아니라 반응에서 드러납니다.",
  "관계·일·돈은 분리된 주제가 아니라 같은 선택 체계의 다른 표면입니다.",
  "리스크는 운이 나빠서 생기기보다 누적된 미세 오차가 임계점을 넘을 때 발생합니다.",
  "실행 가이드는 거창할수록 실패합니다.",
  "첫 7일은 관찰, 다음 7일은 조정",
  "심화 실행 노트",
  "지금 내 선택이 3개월 뒤에도 유효한가?",
  "이번 주에는 가장 비용이 큰 습관 1개를 멈추고",
];

export const LIFEBOOK_SYSTEM_PROMPT =
  "너는 30년 경력의 사주명리 해석자다. 너는 사주를 계산하지 않는다. 모든 해석은 canonicalSajuChart JSON에 있는 값만 사용한다. JSON에 없는 원국, 십성, 용신, 대운, 세운, 신살, 12운성, 합충형파해를 절대 만들어내지 않는다. 데이터가 부족하면 일반론으로 채우지 말고 해당 챕터를 생성하지 않는다. 각 챕터는 반드시 실제 원국 데이터 최소 5개 이상을 포함해야 한다. 반복 문장으로 분량을 채우는 것은 금지한다.";

export const LIFEBOOK_MIN_CHAPTER_CHARS = 5050;
export const LIFEBOOK_MIN_TOTAL_CHARS = 50000;

export const LIFEBOOK_CHAPTERS = [
  { id: 1, title: "사주 원국 완전 해설 - 팔자 8글자의 비밀", purpose: "년주/월주/일주/시주와 지장간, 합충형파해를 원국 중심으로 해설" },
  { id: 2, title: "나의 설계도 - 월지·일간·조후와 기질의 뿌리", purpose: "월지 환경과 조후를 중심으로 한 기본 작동 방식 분석" },
  { id: 3, title: "숨겨진 무기 - 용신·희신과 나만의 필살기", purpose: "용신·희신·기신의 계산 근거와 실전 전략" },
  { id: 4, title: "대운 정밀 분석 - 인생의 큰 파도", purpose: "대운 방향/시작나이/현재·전후 대운 비교와 원국 상호작용" },
  { id: 5, title: "격국과 사회적 소명 - 나의 성공 방정식", purpose: "십성 분포와 월주 중심의 직업·사회성 전략" },
  { id: 6, title: "관계의 전략 - 인연의 법칙과 파트너십", purpose: "비겁·식상·재성·관성·인성 기반의 관계 패턴과 경계 전략" },
  { id: 7, title: "연애·결혼 완전 분석 - 사주가 말하는 나의 사랑", purpose: "배우자성/일지/합충형파해 기반 연애·결혼 전략" },
  { id: 8, title: "재물·직업 완전 전략 - 부의 그릇을 키우는 천기", purpose: "재성/식상생재/누수 패턴 중심의 재물 전략" },
  { id: 9, title: "건강·심신 에너지 완전 분석 - 오행으로 보는 회복법", purpose: "오행 과부족 기반 생활 리듬과 회복 전략" },
  { id: 10, title: "가족·뿌리·내면 아이 - 내가 짊어진 오래된 이야기", purpose: "가족 영향과 독립 과제의 현실 해석" },
  { id: 11, title: "인생의 위기와 전환점 - 무너질 때 다시 서는 법", purpose: "위기 신호 분석과 현실 대응 전략" },
  { id: 12, title: "나만의 성공 루틴 - 운을 현실로 바꾸는 실행법", purpose: "하루 루틴부터 1년 계획까지 실행 설계" },
  { id: 13, title: "최종 운명 선언문 - 내 삶을 다시 쓰는 문장", purpose: "핵심 구조 압축과 개인 맞춤 선언" },
];

function deepClone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function toNonEmptyString(value) {
  const v = String(value ?? "").trim();
  return v;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeElement(value) {
  const raw = toNonEmptyString(value).toLowerCase();
  const cleaned = raw.replace(/[()\s]/g, "");
  return KOR_TO_EN_ELEMENT[cleaned] || "";
}

function normalizeElementKo(value) {
  const en = normalizeElement(value);
  return EN_TO_KOR_ELEMENT[en] || "";
}

function normalizeHiddenStems(branch, hiddenStems) {
  const arr = Array.isArray(hiddenStems) ? hiddenStems.map((v) => toNonEmptyString(v)).filter(Boolean) : [];
  if (arr.length) return arr;
  return Array.isArray(HIDDEN_STEMS_BY_BRANCH[branch]) ? HIDDEN_STEMS_BY_BRANCH[branch] : [];
}

function buildPillar(input = {}, dayStem = "") {
  const stem = toNonEmptyString(input.stem || input.g || "");
  const branch = toNonEmptyString(input.branch || input.j || "");
  const ganji = toNonEmptyString(input.ganji || `${stem}${branch}`.trim());
  return {
    stem,
    branch,
    ganji,
    stemElement: toNonEmptyString(input.stemElement || normalizeElementKo(input.stemElement || input.gE || "")),
    branchElement: toNonEmptyString(input.branchElement || normalizeElementKo(input.branchElement || input.jE || "")),
    tenGod: toNonEmptyString(input.tenGod || ""),
    hiddenStems: normalizeHiddenStems(branch, input.hiddenStems),
    dayMaster: dayStem && stem ? `${stem}${normalizeElementKo(input.stemElement || input.gE || "")}` : undefined,
  };
}

function buildFiveElements(raw = {}) {
  const wood = toNumber(raw.wood, 0);
  const fire = toNumber(raw.fire, 0);
  const earth = toNumber(raw.earth, 0);
  const metal = toNumber(raw.metal, 0);
  const water = toNumber(raw.water, 0);
  const pairs = [
    ["wood", wood],
    ["fire", fire],
    ["earth", earth],
    ["metal", metal],
    ["water", water],
  ];
  pairs.sort((a, b) => b[1] - a[1]);
  const dominant = pairs[0]?.[1] > 0 ? pairs[0][0] : "";
  const weakest = pairs[pairs.length - 1]?.[1] >= 0 ? pairs[pairs.length - 1][0] : "";
  const missing = pairs.filter(([, score]) => score <= 0).map(([key]) => key);
  return {
    wood,
    fire,
    earth,
    metal,
    water,
    dominant,
    weakest,
    missing,
    balanceComment: toNonEmptyString(raw.balanceComment || ""),
  };
}

function normalizeTenGodDistribution(raw = {}) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const result = {};
    for (const [k, v] of Object.entries(raw)) {
      const key = toNonEmptyString(k);
      if (!key) continue;
      result[key] = toNumber(v, 0);
    }
    return result;
  }
  return {};
}

function missingIf(condition, key, target) {
  if (!condition) target.push(key);
}

function hasObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function validateCanonicalSajuChart(canonical) {
  const missingFields = [];
  const chart = canonical || {};

  const pillars = chart.fourPillars || {};
  const year = pillars.year || {};
  const month = pillars.month || {};
  const day = pillars.day || {};
  const hour = pillars.hour || {};

  missingIf(Boolean(year.stem && year.branch), "fourPillars.year", missingFields);
  missingIf(Boolean(month.stem && month.branch), "fourPillars.month", missingFields);
  missingIf(Boolean(day.stem && day.branch), "fourPillars.day", missingFields);
  missingIf(Boolean(hour.stem && hour.branch), "fourPillars.hour", missingFields);

  missingIf(Boolean(chart?.dayMaster?.stem), "dayMaster.stem", missingFields);
  missingIf(Boolean(chart?.fiveElements?.dominant), "fiveElements.dominant", missingFields);
  missingIf(Boolean(chart?.fiveElements?.weakest), "fiveElements.weakest", missingFields);
  missingIf(hasObject(chart?.tenGods?.distribution) && Object.keys(chart.tenGods.distribution).length > 0, "tenGods.distribution", missingFields);
  missingIf(Boolean(chart?.usefulGods?.yongsin?.element), "usefulGods.yongsin.element", missingFields);
  missingIf(Boolean(chart?.usefulGods?.huisin?.element), "usefulGods.huisin.element", missingFields);
  missingIf(Boolean(chart?.usefulGods?.gisin?.element), "usefulGods.gisin.element", missingFields);
  missingIf(Boolean(chart?.luckCycles?.currentDaewoon?.ganji), "luckCycles.currentDaewoon", missingFields);
  missingIf(Boolean(Number.isFinite(Number(chart?.annualLuck?.year))), "annualLuck.year", missingFields);
  missingIf(Boolean(chart?.annualLuck?.ganji), "annualLuck.ganji", missingFields);

  const hasFourPillars = [year, month, day, hour].every((p) => Boolean(p?.stem && p?.branch));
  const hasDayMaster = Boolean(chart?.dayMaster?.stem);
  const hasFiveElements = Boolean(chart?.fiveElements?.dominant && chart?.fiveElements?.weakest);
  const hasTenGods = hasObject(chart?.tenGods?.distribution) && Object.keys(chart.tenGods.distribution).length > 0;
  const hasUsefulGods = Boolean(chart?.usefulGods?.yongsin?.element && chart?.usefulGods?.huisin?.element && chart?.usefulGods?.gisin?.element);
  const hasDaewoon = Boolean(chart?.luckCycles?.currentDaewoon?.ganji);
  const hasAnnualLuck = Boolean(Number.isFinite(Number(chart?.annualLuck?.year)) && chart?.annualLuck?.ganji);

  return {
    isValid: missingFields.length === 0,
    hasFourPillars,
    hasDayMaster,
    hasFiveElements,
    hasTenGods,
    hasUsefulGods,
    hasDaewoon,
    hasAnnualLuck,
    missingFields,
  };
}

export function buildCanonicalSajuChart(input = {}) {
  const source = hasObject(input?.canonicalSajuChart) ? deepClone(input.canonicalSajuChart) : {};
  const profile = hasObject(input?.profile) ? input.profile : {};
  const engine = hasObject(input?.engineData) ? input.engineData : {};

  const dayStem = toNonEmptyString(source?.fourPillars?.day?.stem || engine?.pillars?.d?.g || "");
  const dayStemElementKo = normalizeElementKo(source?.dayMaster?.element || engine?.pillars?.d?.gE || "");

  const canonical = {
    reportType: "saju-life-book",
    profile: {
      name: toNonEmptyString(source?.profile?.name || profile?.name || input?.name || "사용자"),
      gender: toNonEmptyString(source?.profile?.gender || profile?.gender || input?.gender || ""),
      birth: {
        solarDate: toNonEmptyString(source?.profile?.birth?.solarDate || profile?.birth?.solarDate || input?.solarDate || ""),
        lunarDate: toNonEmptyString(source?.profile?.birth?.lunarDate || profile?.birth?.lunarDate || input?.lunarDate || "") || null,
        time: toNonEmptyString(source?.profile?.birth?.time || profile?.birth?.time || input?.time || ""),
        timezone: toNonEmptyString(source?.profile?.birth?.timezone || profile?.birth?.timezone || input?.timezone || "Asia/Seoul"),
        locationName: toNonEmptyString(source?.profile?.birth?.locationName || profile?.birth?.locationName || input?.locationName || "") || null,
        isLeapMonth: source?.profile?.birth?.isLeapMonth ?? profile?.birth?.isLeapMonth ?? input?.isLeapMonth ?? null,
      },
    },
    calculationMeta: {
      engine: "internal-saju-engine",
      calendarSource: toNonEmptyString(source?.calculationMeta?.calendarSource || input?.calendarSource || "internal") || "internal",
      solarTermApplied: source?.calculationMeta?.solarTermApplied ?? true,
      calculatedAt: toNonEmptyString(source?.calculationMeta?.calculatedAt || new Date().toISOString()),
      methodVersion: toNonEmptyString(source?.calculationMeta?.methodVersion || input?.methodVersion || "lifebook-canonical-v1"),
    },
    fourPillars: {
      year: buildPillar(source?.fourPillars?.year || engine?.pillars?.y || {}, dayStem),
      month: buildPillar(source?.fourPillars?.month || engine?.pillars?.m || {}, dayStem),
      day: buildPillar(source?.fourPillars?.day || engine?.pillars?.d || {}, dayStem),
      hour: buildPillar(source?.fourPillars?.hour || engine?.pillars?.h || {}, dayStem),
    },
    dayMaster: {
      stem: toNonEmptyString(source?.dayMaster?.stem || dayStem),
      element: toNonEmptyString(source?.dayMaster?.element || dayStemElementKo),
      yinYang: toNonEmptyString(source?.dayMaster?.yinYang || engine?.dayMaster?.yinYang || ""),
      strength: toNonEmptyString(source?.dayMaster?.strength || engine?.dayMaster?.strength || input?.strength || ""),
      strengthScore: toNumber(source?.dayMaster?.strengthScore ?? engine?.dayMaster?.strengthScore ?? input?.strengthScore, 0),
      reasoning: Array.isArray(source?.dayMaster?.reasoning)
        ? source.dayMaster.reasoning.map((v) => toNonEmptyString(v)).filter(Boolean)
        : Array.isArray(engine?.dayMaster?.reasoning)
          ? engine.dayMaster.reasoning.map((v) => toNonEmptyString(v)).filter(Boolean)
          : [],
    },
    fiveElements: buildFiveElements(source?.fiveElements || engine?.elementWeights || input?.elementWeights || {}),
    tenGods: {
      distribution: normalizeTenGodDistribution(source?.tenGods?.distribution || engine?.tenGods?.distribution || input?.tenGodDistribution || {}),
      dominantTenGods: Array.isArray(source?.tenGods?.dominantTenGods) ? source.tenGods.dominantTenGods : [],
      weakTenGods: Array.isArray(source?.tenGods?.weakTenGods) ? source.tenGods.weakTenGods : [],
      relationshipToDayMaster: Array.isArray(source?.tenGods?.relationshipToDayMaster) ? source.tenGods.relationshipToDayMaster : [],
    },
    usefulGods: {
      yongsin: {
        element: toNonEmptyString(source?.usefulGods?.yongsin?.element || engine?.usefulGods?.yongsin?.element || input?.yongsin || ""),
        reason: toNonEmptyString(source?.usefulGods?.yongsin?.reason || engine?.usefulGods?.yongsin?.reason || ""),
      },
      huisin: {
        element: toNonEmptyString(source?.usefulGods?.huisin?.element || engine?.usefulGods?.huisin?.element || input?.huisin || ""),
        reason: toNonEmptyString(source?.usefulGods?.huisin?.reason || engine?.usefulGods?.huisin?.reason || ""),
      },
      gisin: {
        element: toNonEmptyString(source?.usefulGods?.gisin?.element || engine?.usefulGods?.gisin?.element || input?.gisin || ""),
        reason: toNonEmptyString(source?.usefulGods?.gisin?.reason || engine?.usefulGods?.gisin?.reason || ""),
      },
      gusinhansin: Array.isArray(source?.usefulGods?.gusinhansin) ? source.usefulGods.gusinhansin : [],
    },
    relations: {
      heavenlyStemCombinations: Array.isArray(source?.relations?.heavenlyStemCombinations) ? source.relations.heavenlyStemCombinations : [],
      earthlyBranchCombinations: Array.isArray(source?.relations?.earthlyBranchCombinations) ? source.relations.earthlyBranchCombinations : [],
      clashes: Array.isArray(source?.relations?.clashes) ? source.relations.clashes : [],
      punishments: Array.isArray(source?.relations?.punishments) ? source.relations.punishments : [],
      harms: Array.isArray(source?.relations?.harms) ? source.relations.harms : [],
      breaks: Array.isArray(source?.relations?.breaks) ? source.relations.breaks : [],
      threeHarmony: Array.isArray(source?.relations?.threeHarmony) ? source.relations.threeHarmony : [],
      directionalCombinations: Array.isArray(source?.relations?.directionalCombinations) ? source.relations.directionalCombinations : [],
    },
    twelveStages: Array.isArray(source?.twelveStages) ? source.twelveStages : [],
    specialStars: Array.isArray(source?.specialStars) ? source.specialStars : [],
    luckCycles: {
      direction: toNonEmptyString(source?.luckCycles?.direction || ""),
      startAge: toNumber(source?.luckCycles?.startAge, 0),
      currentDaewoon: hasObject(source?.luckCycles?.currentDaewoon) ? source.luckCycles.currentDaewoon : null,
      daewoonList: Array.isArray(source?.luckCycles?.daewoonList) ? source.luckCycles.daewoonList : [],
    },
    annualLuck: {
      year: toNumber(source?.annualLuck?.year, 0),
      ganji: toNonEmptyString(source?.annualLuck?.ganji || ""),
      stem: toNonEmptyString(source?.annualLuck?.stem || ""),
      branch: toNonEmptyString(source?.annualLuck?.branch || ""),
      tenGod: toNonEmptyString(source?.annualLuck?.tenGod || ""),
      interactionWithNatal: Array.isArray(source?.annualLuck?.interactionWithNatal) ? source.annualLuck.interactionWithNatal : [],
      monthlyLuck: Array.isArray(source?.annualLuck?.monthlyLuck) ? source.annualLuck.monthlyLuck : [],
    },
    lifeThemes: hasObject(source?.lifeThemes)
      ? source.lifeThemes
      : {
          career: {},
          wealth: {},
          relationship: {},
          health: {},
          family: {},
          socialMission: {},
        },
    validation: {
      hasFourPillars: false,
      hasDayMaster: false,
      hasFiveElements: false,
      hasTenGods: false,
      hasUsefulGods: false,
      hasDaewoon: false,
      hasAnnualLuck: false,
      missingFields: [],
    },
  };

  const validation = validateCanonicalSajuChart(canonical);
  canonical.validation = {
    hasFourPillars: validation.hasFourPillars,
    hasDayMaster: validation.hasDayMaster,
    hasFiveElements: validation.hasFiveElements,
    hasTenGods: validation.hasTenGods,
    hasUsefulGods: validation.hasUsefulGods,
    hasDaewoon: validation.hasDaewoon,
    hasAnnualLuck: validation.hasAnnualLuck,
    missingFields: validation.missingFields,
  };

  return canonical;
}

function chapterRequiredDataPoints(chapterId) {
  const map = {
    1: ["fourPillars.year.ganji", "fourPillars.month.ganji", "fourPillars.day.ganji", "fourPillars.hour.ganji", "relations"],
    2: ["dayMaster.stem", "dayMaster.strength", "fourPillars.month.branch", "fiveElements", "tenGods.distribution"],
    3: ["usefulGods.yongsin", "usefulGods.huisin", "usefulGods.gisin", "fiveElements", "tenGods.distribution"],
    4: ["luckCycles.direction", "luckCycles.startAge", "luckCycles.currentDaewoon", "luckCycles.daewoonList", "relations.clashes"],
    5: ["fourPillars.month", "tenGods.distribution", "fiveElements", "usefulGods", "dayMaster"],
    6: ["tenGods.distribution", "relations", "dayMaster", "fiveElements", "usefulGods"],
    7: ["fourPillars.day.branch", "tenGods.distribution", "relations", "usefulGods", "luckCycles.currentDaewoon"],
    8: ["tenGods.distribution", "fiveElements", "usefulGods", "luckCycles.currentDaewoon", "relations"],
    9: ["fiveElements", "dayMaster", "usefulGods", "annualLuck", "luckCycles.currentDaewoon"],
    10: ["specialStars", "twelveStages", "relations", "fourPillars", "tenGods.distribution"],
    11: ["annualLuck.year", "annualLuck.ganji", "annualLuck.monthlyLuck", "luckCycles.currentDaewoon", "relations"],
    12: ["fourPillars", "usefulGods", "luckCycles", "annualLuck", "lifeThemes"],
    13: ["fiveElements", "usefulGods", "tenGods.distribution", "luckCycles.currentDaewoon", "annualLuck.ganji"],
  };
  return map[chapterId] || [];
}

export function buildLifebookChapterPlan(canonical) {
  const validation = validateCanonicalSajuChart(canonical);
  return LIFEBOOK_CHAPTERS.map((chapter) => {
    let enabled = true;
    let reason = "";
    let mode = "full";

    if (chapter.id === 3 && !validation.hasUsefulGods) {
      enabled = false;
      reason = "usefulGods.missing";
    }
    if (chapter.id === 4 && !validation.hasDaewoon) {
      enabled = false;
      reason = "luckCycles.currentDaewoon.missing";
    }
    if (chapter.id === 11 && !validation.hasAnnualLuck) {
      enabled = false;
      reason = "annualLuck.missing";
    }
    if (chapter.id === 10) {
      const hasSpecialStars = Array.isArray(canonical?.specialStars) && canonical.specialStars.length > 0;
      const hasTwelveStages = Array.isArray(canonical?.twelveStages) && canonical.twelveStages.length > 0;
      if (!hasSpecialStars && !hasTwelveStages) {
        mode = "reduced";
      }
    }

    return {
      ...chapter,
      enabled,
      mode,
      reason,
      requiredDataPoints: chapterRequiredDataPoints(chapter.id),
    };
  });
}

function keySentencesFromPrevious(previousTexts = []) {
  const seen = new Set();
  const out = [];
  const arr = Array.isArray(previousTexts) ? previousTexts : [];
  for (const text of arr) {
    const sentences = String(text || "")
      .split(/[\n.!?]+/)
      .map((v) => v.trim())
      .filter((v) => v.length >= 25)
      .slice(0, 3);
    for (const s of sentences) {
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
      if (out.length >= 12) return out;
    }
  }
  return out;
}

export function buildChapterPromptPayload(chapterMeta, canonical, previousTexts = []) {
  const relevantLuck = chapterMeta.id === 4 || chapterMeta.id === 11 || chapterMeta.id === 12
    ? {
        luckCycles: canonical?.luckCycles || null,
        annualLuck: canonical?.annualLuck || null,
      }
    : null;

  const forbidden = [...LIFEBOOK_FORBIDDEN_PHRASES, ...keySentencesFromPrevious(previousTexts)];

  return {
    chapterTitle: chapterMeta.title,
    chapterPurpose: chapterMeta.purpose,
    relevantPillars: canonical?.fourPillars || {},
    relevantTenGods: canonical?.tenGods || {},
    relevantElements: canonical?.fiveElements || {},
    relevantUsefulGods: canonical?.usefulGods || {},
    relevantLuck,
    relevantRelations: canonical?.relations || null,
    requiredDataPoints: chapterMeta.requiredDataPoints || [],
    forbiddenRepeatedPhrases: forbidden,
    requiredOutputStructure: [
      "1. 사용 데이터 요약표",
      "2. 핵심 결론",
      "3. 심층 해석",
      "4. 현실 적용",
      "5. 그림자와 주의점",
      "6. 강화 전략(오늘/이번 주/90일)",
      "7. 챕터 요약",
    ],
    minLength: LIFEBOOK_MIN_CHAPTER_CHARS,
    maxLength: 8200,
  };
}

export function buildChapterUserPrompt(payload, canonical) {
  return [
    "아래 JSON을 근거로 챕터를 작성하라.",
    "출력은 반드시 한국어 Markdown이다.",
    "JSON에 없는 값을 절대 생성하지 마라.",
    "필수 구조를 지키되, 데이터가 없으면 해당 항목을 제거하거나 챕터를 생성하지 말라.",
    "---",
    "[chapterPromptPayload]",
    JSON.stringify(payload, null, 2),
    "---",
    "[canonicalSajuChart]",
    JSON.stringify(canonical, null, 2),
  ].join("\n");
}

function normalizeSentence(raw) {
  return String(raw || "")
    .replace(/["'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectRepeatedLongSentences(text, minLength = 30) {
  const normalized = String(text || "");
  const parts = normalized.split(/[\n.!?]+/);
  const counts = new Map();
  for (const part of parts) {
    const sentence = normalizeSentence(part);
    if (sentence.length < minLength) continue;
    counts.set(sentence, (counts.get(sentence) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([sentence, count]) => ({ sentence, count }));
}

export function findForbiddenPhrases(text, forbiddenPhrases = LIFEBOOK_FORBIDDEN_PHRASES) {
  const source = String(text || "");
  return (Array.isArray(forbiddenPhrases) ? forbiddenPhrases : [])
    .map((phrase) => toNonEmptyString(phrase))
    .filter(Boolean)
    .filter((phrase) => source.includes(phrase));
}

function dataEvidenceTokens(canonical) {
  const tokens = [];
  const pillars = canonical?.fourPillars || {};
  for (const key of ["year", "month", "day", "hour"]) {
    const p = pillars[key] || {};
    [p.ganji, p.stem, p.branch, p.tenGod].forEach((v) => {
      const t = toNonEmptyString(v);
      if (t) tokens.push(t);
    });
  }
  [
    canonical?.dayMaster?.stem,
    canonical?.dayMaster?.element,
    canonical?.fiveElements?.dominant,
    canonical?.fiveElements?.weakest,
    canonical?.usefulGods?.yongsin?.element,
    canonical?.usefulGods?.huisin?.element,
    canonical?.usefulGods?.gisin?.element,
    canonical?.luckCycles?.currentDaewoon?.ganji,
    canonical?.annualLuck?.ganji,
  ].forEach((v) => {
    const t = toNonEmptyString(v);
    if (t) tokens.push(t);
  });
  return Array.from(new Set(tokens));
}

export function countSajuEvidencePoints(text, canonical) {
  const source = String(text || "");
  const tokens = dataEvidenceTokens(canonical);
  let count = 0;
  for (const token of tokens) {
    if (source.includes(token)) count += 1;
  }
  return count;
}

function buildSummaryRows(canonical) {
  const rows = [];
  const day = canonical?.fourPillars?.day || {};
  const month = canonical?.fourPillars?.month || {};
  rows.push(["일간", `${day.stem || ""}${day.stemElement || ""}`.trim()]);
  rows.push(["월지", `${month.branch || ""}`.trim()]);
  rows.push([
    "오행 분포",
    `목 ${canonical?.fiveElements?.wood ?? 0} / 화 ${canonical?.fiveElements?.fire ?? 0} / 토 ${canonical?.fiveElements?.earth ?? 0} / 금 ${canonical?.fiveElements?.metal ?? 0} / 수 ${canonical?.fiveElements?.water ?? 0}`,
  ]);
  rows.push(["최강 오행", toNonEmptyString(canonical?.fiveElements?.dominant || "")]);
  rows.push([
    "부족 오행",
    Array.isArray(canonical?.fiveElements?.missing) && canonical.fiveElements.missing.length
      ? canonical.fiveElements.missing.join(", ")
      : toNonEmptyString(canonical?.fiveElements?.weakest || ""),
  ]);
  rows.push(["용신", toNonEmptyString(canonical?.usefulGods?.yongsin?.element || "")]);
  rows.push([
    "현재 대운",
    toNonEmptyString(canonical?.luckCycles?.currentDaewoon?.ganji || "없음"),
  ]);
  return rows;
}

export function withSummaryTable(text, canonical) {
  const src = String(text || "").trim();
  if (!src) return src;
  if (src.includes("| 항목 | 값 |")) return src;
  const rows = buildSummaryRows(canonical)
    .filter(([, value]) => toNonEmptyString(value))
    .map(([label, value]) => `| ${label} | ${String(value).replace(/\|/g, "/")} |`)
    .join("\n");
  const table = `1. 사용 데이터 요약표\n\n| 항목 | 값 |\n|---|---|\n${rows}`;
  return `${table}\n\n${src}`;
}

export function validateGeneratedChapterText(text, payload, canonical) {
  const errors = [];
  const source = String(text || "");
  const minLength = Number(payload?.minLength || LIFEBOOK_MIN_CHAPTER_CHARS);

  if (!source.trim()) {
    errors.push("빈 본문");
    return { isValid: false, errors, evidenceCount: 0, repeatedSentences: [] };
  }

  if (source.length < minLength) {
    errors.push(`최소 글자수 미달: ${source.length}/${minLength}`);
  }

  if (/심화\s*실행\s*노트\s*\d*/i.test(source)) {
    errors.push("금지된 '심화 실행 노트 n' 구조 탐지");
  }

  const forbiddenHits = findForbiddenPhrases(source, payload?.forbiddenRepeatedPhrases || LIFEBOOK_FORBIDDEN_PHRASES);
  if (forbiddenHits.length) {
    errors.push(`금지 문구 사용: ${forbiddenHits.slice(0, 3).join(", ")}`);
  }

  const repeatedSentences = detectRepeatedLongSentences(source, 30);
  if (repeatedSentences.length) {
    errors.push("동일 30자 이상 문장 반복 탐지");
  }

  const evidenceCount = countSajuEvidencePoints(source, canonical);
  if (evidenceCount < 5) {
    errors.push(`사주 근거 데이터 부족: ${evidenceCount}/5`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    evidenceCount,
    repeatedSentences,
  };
}
