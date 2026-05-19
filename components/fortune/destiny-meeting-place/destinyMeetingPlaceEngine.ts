import type { SajuEngineResult } from "@/app/saju/animal-destiny/lib/types";
import {
  AVOID_PLACE_BY_ELEMENT,
  COUNTRY_POOL_BY_ELEMENT,
  DAY_MASTER_STYLE,
  DESTINY_ITEM_BY_ELEMENT,
  ELEMENT_LABEL,
  ELEMENT_TIMING_MAP,
  PLACE_POOL_BY_ELEMENT,
  STYLING_GUIDE_BY_ELEMENT,
  TEN_STAR_MEETING_STYLE,
} from "./destinyMeetingPlaceMappings";
import type { DestinyElement, DestinyMeetingPlaceResult, MeetingEnergyProfile } from "./destinyMeetingPlaceTypes";

const ELEMENT_KEYS: DestinyElement[] = ["wood", "fire", "earth", "metal", "water"];

const STEM_TO_ELEMENT: Record<string, DestinyElement> = {
  갑: "wood", 甲: "wood", 을: "wood", 乙: "wood",
  병: "fire", 丙: "fire", 정: "fire", 丁: "fire",
  무: "earth", 戊: "earth", 기: "earth", 己: "earth",
  경: "metal", 庚: "metal", 신: "metal", 辛: "metal",
  임: "water", 壬: "water", 계: "water", 癸: "water",
};

const BRANCH_TO_ELEMENT: Record<string, DestinyElement> = {
  자: "water", 子: "water", 해: "water", 亥: "water",
  인: "wood", 寅: "wood", 묘: "wood", 卯: "wood",
  사: "fire", 巳: "fire", 오: "fire", 午: "fire",
  진: "earth", 辰: "earth", 술: "earth", 戌: "earth", 축: "earth", 丑: "earth", 미: "earth", 未: "earth",
  신: "metal", 申: "metal", 유: "metal", 酉: "metal",
};

const COUNTER_ELEMENT: Record<DestinyElement, DestinyElement> = {
  wood: "metal",
  fire: "water",
  earth: "wood",
  metal: "fire",
  water: "earth",
};

const TENGOD_GROUP_BY_KEYWORD: Array<{ regex: RegExp; group: MeetingEnergyProfile["dominantTenStarGroup"] }> = [
  { regex: /(식신|상관|food|expression)/i, group: "expression" },
  { regex: /(편재|정재|wealth|재성)/i, group: "wealth" },
  { regex: /(편관|정관|officer|관성)/i, group: "officer" },
  { regex: /(편인|정인|resource|인성)/i, group: "resource" },
  { regex: /(비견|겁재|peer|비겁)/i, group: "peer" },
];

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

function stableSeedFromSaju(sajuResult: SajuEngineResult): number {
  const source = [
    toStringValue((sajuResult as Record<string, unknown>).birthDate),
    toStringValue((sajuResult as Record<string, unknown>).birthTime),
    toStringValue((sajuResult as Record<string, unknown>).dayStem),
    toStringValue((sajuResult as Record<string, unknown>).dayPillar),
    toStringValue((sajuResult as Record<string, unknown>).monthPillar),
    JSON.stringify((sajuResult as Record<string, unknown>).pillars || {}),
  ].join("|");
  return hashString(source || JSON.stringify(sajuResult));
}

function normalizeElement(value: unknown): DestinyElement | null {
  const raw = toStringValue(value).toLowerCase();
  if (!raw) return null;

  if (["wood", "목", "甲", "乙", "갑", "을"].some((keyword) => raw.includes(keyword.toLowerCase()))) return "wood";
  if (["fire", "화", "丙", "丁", "병", "정"].some((keyword) => raw.includes(keyword.toLowerCase()))) return "fire";
  if (["earth", "토", "戊", "己", "무", "기"].some((keyword) => raw.includes(keyword.toLowerCase()))) return "earth";
  if (["metal", "금", "庚", "辛", "경", "신"].some((keyword) => raw.includes(keyword.toLowerCase()))) return "metal";
  if (["water", "수", "壬", "癸", "임", "계"].some((keyword) => raw.includes(keyword.toLowerCase()))) return "water";

  return null;
}

function collectElementsFromUnknown(value: unknown): DestinyElement[] {
  const out: DestinyElement[] = [];
  const queue: unknown[] = [value];

  while (queue.length) {
    const current = queue.shift();
    if (current == null) continue;

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    const asRecord = toRecord(current);
    if (asRecord) {
      Object.values(asRecord).forEach((item) => queue.push(item));
      continue;
    }

    const normalized = normalizeElement(current);
    if (normalized && !out.includes(normalized)) out.push(normalized);
  }

  return out;
}

function extractDayMaster(sajuResult: SajuEngineResult): { stem: string; label: string } {
  const root = sajuResult as Record<string, unknown>;
  const pillars = toRecord(root.pillars);
  const dayPillar = toRecord(pillars?.day);

  const candidates = [
    root.dayStem,
    root.dayMaster,
    root.dayGan,
    dayPillar?.stem,
    toStringValue(root.dayPillar).slice(0, 1),
  ];

  for (const candidate of candidates) {
    const stem = toStringValue(candidate);
    if (stem && STEM_TO_ELEMENT[stem]) {
      return { stem, label: `${stem} 일간` };
    }
  }

  return { stem: "갑", label: "갑 일간" };
}

function incrementElement(counter: Record<DestinyElement, number>, value: unknown, amount = 1) {
  const element = normalizeElement(value);
  if (!element) return;
  counter[element] += amount;
}

function extractElementDistribution(sajuResult: SajuEngineResult): Record<DestinyElement, number> {
  const root = sajuResult as Record<string, unknown>;
  const counts: Record<DestinyElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  const fiveElementsCandidates = [
    root.fiveElements,
    root.elements,
    root.elementCount,
    toRecord(root.natal)?.counts,
    toRecord(root.natal)?.ratios,
  ];

  fiveElementsCandidates.forEach((candidate) => {
    const record = toRecord(candidate);
    if (!record) return;
    Object.entries(record).forEach(([key, value]) => {
      const element = normalizeElement(key);
      if (!element) return;
      counts[element] += toNumber(value);
    });
  });

  const pillars = toRecord(root.pillars);
  const pillarKeys: Array<"year" | "month" | "day" | "hour"> = ["year", "month", "day", "hour"];

  pillarKeys.forEach((pillarKey) => {
    const pillar = toRecord(pillars?.[pillarKey]);
    if (pillar) {
      incrementElement(counts, pillar.stem, 1.5);
      incrementElement(counts, pillar.branch, 1.25);
    }
  });

  [root.yearPillar, root.monthPillar, root.dayPillar, root.hourPillar].forEach((pillarText) => {
    const text = toStringValue(pillarText);
    if (!text) return;
    const chars = Array.from(text);
    if (chars[0]) incrementElement(counts, chars[0], 1.2);
    if (chars[1]) incrementElement(counts, chars[1], 1.0);
  });

  if (Object.values(counts).every((value) => value <= 0)) {
    const dayMaster = extractDayMaster(sajuResult);
    const dayElement = STEM_TO_ELEMENT[dayMaster.stem] || "wood";
    counts[dayElement] = 2;
    counts[COUNTER_ELEMENT[dayElement]] = 0.6;
    counts.earth += 0.8;
    counts.water += 0.8;
  }

  return counts;
}

function sortElementsByScore(counts: Record<DestinyElement, number>): DestinyElement[] {
  return [...ELEMENT_KEYS].sort((a, b) => counts[b] - counts[a]);
}

function extractUsefulAndAvoidElements(sajuResult: SajuEngineResult): { useful: DestinyElement[]; avoid: DestinyElement[] } {
  const root = sajuResult as Record<string, unknown>;
  const usefulGods = toRecord(root.usefulGods);

  const usefulCandidates: unknown[] = [
    usefulGods?.yongsin,
    usefulGods?.huisin,
    usefulGods?.yongshin,
    usefulGods?.heesin,
    root.yongshin,
    root.huisin,
    root.heesin,
    toRecord(root.power)?.yongshin,
  ];

  const avoidCandidates: unknown[] = [
    usefulGods?.gisin,
    usefulGods?.kisin,
    usefulGods?.hansin,
    root.gisin,
    root.kijishin,
    root.kisin,
    root.hansin,
    toRecord(root.power)?.kijishin,
  ];

  const useful = usefulCandidates.flatMap((candidate) => collectElementsFromUnknown(candidate));
  const avoid = avoidCandidates.flatMap((candidate) => collectElementsFromUnknown(candidate));

  return {
    useful: Array.from(new Set(useful)).slice(0, 3),
    avoid: Array.from(new Set(avoid)).slice(0, 3),
  };
}

function extractDominantTenStarGroup(sajuResult: SajuEngineResult): MeetingEnergyProfile["dominantTenStarGroup"] {
  const root = sajuResult as Record<string, unknown>;
  const candidates = [
    root.tenStars,
    root.tenGodCounts,
    root.tenStarGroups,
    root.tenGodGroupCounts,
    root.tenGodSummary,
  ];

  const score: Record<MeetingEnergyProfile["dominantTenStarGroup"], number> = {
    expression: 0,
    wealth: 0,
    officer: 0,
    resource: 0,
    peer: 0,
  };

  candidates.forEach((candidate) => {
    const record = toRecord(candidate);
    if (!record) return;

    Object.entries(record).forEach(([key, value]) => {
      const text = `${key}:${toStringValue(value)}`;
      const group = TENGOD_GROUP_BY_KEYWORD.find((item) => item.regex.test(text))?.group;
      if (!group) return;
      score[group] += Math.max(1, toNumber(value));
    });
  });

  const sorted = (Object.keys(score) as Array<MeetingEnergyProfile["dominantTenStarGroup"]>).sort(
    (a, b) => score[b] - score[a],
  );

  return score[sorted[0]] > 0 ? sorted[0] : "resource";
}

function extractSinsalSignals(sajuResult: SajuEngineResult): MeetingEnergyProfile["sinsalSignals"] {
  const source = JSON.stringify(sajuResult || {});
  return {
    dohwa: /도화|桃花|dohwa/i.test(source),
    hongyeom: /홍염|紅艶|hongyeom|hongyeom/i.test(source),
    hwagae: /화개|華蓋|hwagae/i.test(source),
    yeokma: /역마|驛馬|yeokma/i.test(source),
  };
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const next = [...items];
  let state = seed || 1;
  for (let i = next.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    const temp = next[i];
    next[i] = next[j];
    next[j] = temp;
  }
  return next;
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  items.forEach((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

function deriveMeetingEnergyProfile(sajuResult: SajuEngineResult): MeetingEnergyProfile {
  const seed = stableSeedFromSaju(sajuResult);
  const dayMaster = extractDayMaster(sajuResult);
  const counts = extractElementDistribution(sajuResult);
  const sortedByStrong = sortElementsByScore(counts);
  const strongestElement = sortedByStrong[0];
  const weakestElement = [...sortedByStrong].reverse()[0];

  const usefulAvoid = extractUsefulAndAvoidElements(sajuResult);
  const usefulElements = usefulAvoid.useful.length ? usefulAvoid.useful : [weakestElement, strongestElement].filter(Boolean) as DestinyElement[];
  const avoidElements = usefulAvoid.avoid.length ? usefulAvoid.avoid : [COUNTER_ELEMENT[strongestElement]];

  const primaryElement = usefulElements[0] || weakestElement || "water";
  const secondaryElement = usefulElements[1] || weakestElement || strongestElement || "wood";

  const style = DAY_MASTER_STYLE[dayMaster.stem] || DAY_MASTER_STYLE.갑;
  const dominantTenStarGroup = extractDominantTenStarGroup(sajuResult);

  return {
    seed,
    dayMasterLabel: dayMaster.label,
    dayMasterStem: dayMaster.stem,
    usefulElements,
    avoidElements,
    strongestElement,
    weakestElement,
    primaryElement,
    secondaryElement,
    relationshipPattern: style.relationTone,
    meetingStyle: style.meetingStyle,
    dominantTenStarGroup,
    sinsalSignals: extractSinsalSignals(sajuResult),
  };
}

function buildMeetingPlaceTypes(profile: MeetingEnergyProfile) {
  const dominantStyle = TEN_STAR_MEETING_STYLE[profile.dominantTenStarGroup];
  const additional: DestinyMeetingPlaceResult["meetingPlaceTypes"] = [];

  if (profile.sinsalSignals.dohwa) additional.push({
    title: "도화 강화 루트",
    description: "사람 밀도가 높은 예술/사진 무대에서 도화 매력이 강하게 드러납니다.",
    whyItFits: "도화 신호가 활성화된 시기에는 시각적 자극과 유동 인구가 많은 장소에서 인연 접점이 빠르게 열립니다.",
    examplePlaces: ["사진 전시 오프닝", "라이브 공연장", "감성 팝업"],
    caution: "첫인상 속도가 빠른 만큼 경계선은 분명히 두세요.",
  });

  if (profile.sinsalSignals.hongyeom) additional.push({
    title: "홍염 무드 루트",
    description: "야경과 향, 패션 무드가 만남 확률을 끌어올립니다.",
    whyItFits: "홍염 성향은 분위기·감각·스타일 자극에서 강하게 반응해 대화의 점화 속도가 빨라집니다.",
    examplePlaces: ["루프탑", "야간 산책", "분위기 카페"],
    caution: "감정 과열을 피하려면 대화 속도를 천천히 맞추세요.",
  });

  if (profile.sinsalSignals.hwagae) additional.push({
    title: "화개 감성 루트",
    description: "고요한 전시/사찰/서점에서 깊은 대화형 인연이 열립니다.",
    whyItFits: "화개 신호는 정적이고 사유가 깊어지는 공간에서 내면 대화를 자연스럽게 확장시킵니다.",
    examplePlaces: ["독립서점", "사찰 산책", "소규모 전시"],
    caution: "침묵이 길어지면 질문 하나로 흐름을 열어주세요.",
  });

  if (profile.sinsalSignals.yeokma) additional.push({
    title: "역마 이동 루트",
    description: "이동 동선과 여행지에서 우연한 인연 운이 강합니다.",
    whyItFits: "역마 성향은 이동 자체가 트리거가 되어 예상 밖의 만남 확률을 구조적으로 높입니다.",
    examplePlaces: ["공항 라운지", "기차역 카페", "항구 도시 숙소"],
    caution: "즉흥 이동 시 일정과 귀가 동선은 미리 고정하세요.",
  });

  const base = [
    {
      title: dominantStyle.title,
      description: dominantStyle.description,
      whyItFits: `${ELEMENT_LABEL[profile.primaryElement]} 중심 기운과 ${profile.dayMasterLabel}의 관계 리듬이 맞아 만남의 밀도가 높아집니다.`,
      examplePlaces: dominantStyle.examples,
      caution: dominantStyle.caution,
    },
    {
      title: `${ELEMENT_LABEL[profile.primaryElement]} 공명 루트`,
      description: "용신/희신 축의 오행을 공간으로 옮겨 인연 에너지를 키우는 방식입니다.",
      whyItFits: `당신의 사주에서 ${ELEMENT_LABEL[profile.primaryElement]} 기운은 관계의 문을 여는 핵심 신호입니다.`,
      examplePlaces: PLACE_POOL_BY_ELEMENT[profile.primaryElement].slice(0, 3).map((item) => item.name),
      caution: "한 번에 많은 장소를 돌기보다 한 공간에 충분히 머무는 편이 더 유리합니다.",
    },
  ];

  return uniqueBy([...base, ...additional], (item) => item.title).slice(0, 4);
}

function buildRecommendedPlaces(profile: MeetingEnergyProfile): DestinyMeetingPlaceResult["recommendedPlaces"] {
  const basePool = [
    ...PLACE_POOL_BY_ELEMENT[profile.primaryElement].map((item) => ({ ...item, element: profile.primaryElement })),
    ...PLACE_POOL_BY_ELEMENT[profile.secondaryElement].map((item) => ({ ...item, element: profile.secondaryElement })),
  ];

  const shuffled = shuffleWithSeed(basePool, profile.seed + 17);
  const selected = uniqueBy(shuffled, (item) => item.name).slice(0, 5);

  return selected.map((item, index) => {
    const sinsalBoost =
      (profile.sinsalSignals.dohwa && (item.type === "night" || item.type === "culture") ? 8 : 0)
      + (profile.sinsalSignals.hongyeom && (item.type === "cafe" || item.type === "night") ? 6 : 0)
      + (profile.sinsalSignals.yeokma && item.type === "travel" ? 7 : 0)
      + (profile.sinsalSignals.hwagae && item.type === "spiritual" ? 6 : 0);

    const usefulBoost = profile.usefulElements.includes(item.element) ? 7 : 0;
    const avoidPenalty = profile.avoidElements.includes(item.element) ? 14 : 0;

    const romancePotential = Math.max(60, Math.min(98, 72 + usefulBoost + sinsalBoost - avoidPenalty + (4 - index) * 2));

    return {
      rank: index + 1,
      name: item.name,
      type: item.type,
      element: item.element,
      reason: `${item.reason} ${profile.relationshipPattern} 흐름과도 잘 맞습니다.`,
      actionTip: item.actionTip,
      romancePotential,
    };
  });
}

function buildRecommendedCountries(profile: MeetingEnergyProfile): DestinyMeetingPlaceResult["recommendedCountries"] {
  const candidate = [
    ...COUNTRY_POOL_BY_ELEMENT[profile.primaryElement].map((item) => ({ ...item, element: profile.primaryElement })),
    ...COUNTRY_POOL_BY_ELEMENT[profile.secondaryElement].map((item) => ({ ...item, element: profile.secondaryElement })),
  ];

  const selected = uniqueBy(shuffleWithSeed(candidate, profile.seed + 37), (item) => `${item.country}:${item.cities[0]}`).slice(0, 5);

  return selected.map((item, index) => ({
    rank: index + 1,
    country: item.country,
    cities: item.cities,
    element: item.element,
    reason: item.reason,
    bestFor: item.bestFor,
    travelMood: item.travelMood,
  }));
}

function buildLuckyTiming(profile: MeetingEnergyProfile): DestinyMeetingPlaceResult["luckyTiming"] {
  const primaryTiming = ELEMENT_TIMING_MAP[profile.primaryElement];
  const secondaryTiming = ELEMENT_TIMING_MAP[profile.secondaryElement];

  const bestSeasons = uniqueBy([...primaryTiming.seasons, ...secondaryTiming.seasons], (value) => value).slice(0, 3);
  const bestMonths = uniqueBy([...primaryTiming.months, ...secondaryTiming.months], (value) => value).slice(0, 4);
  const bestTimeOfDay = uniqueBy([...primaryTiming.times, ...secondaryTiming.times], (value) => value).slice(0, 3);

  return {
    bestSeasons,
    bestMonths,
    bestTimeOfDay,
    explanation: `${ELEMENT_LABEL[profile.primaryElement]} 기운이 강해지는 구간에 만남 운이 확실히 상승합니다. ${profile.sinsalSignals.yeokma ? "이동이 있는 일정에서 귀인운이 더 크게 열립니다." : "반복 방문 루틴을 만들면 인연 확률이 꾸준히 높아집니다."}`,
  };
}

function buildDestinyItems(profile: MeetingEnergyProfile): DestinyMeetingPlaceResult["destinyItems"] {
  const items = [
    ...DESTINY_ITEM_BY_ELEMENT[profile.primaryElement].map((item) => ({ ...item, element: profile.primaryElement })),
    ...DESTINY_ITEM_BY_ELEMENT[profile.secondaryElement].map((item) => ({ ...item, element: profile.secondaryElement })),
  ];

  return uniqueBy(shuffleWithSeed(items, profile.seed + 59), (item) => item.item)
    .slice(0, 5)
    .map((item) => ({
      item: item.item,
      element: item.element,
      usage: item.usage,
      reason: item.reason,
    }));
}

function buildAvoidGuide(profile: MeetingEnergyProfile): DestinyMeetingPlaceResult["avoidGuide"] {
  const avoidElement = profile.avoidElements[0] || COUNTER_ELEMENT[profile.primaryElement];
  const avoidPlaces = AVOID_PLACE_BY_ELEMENT[avoidElement] || AVOID_PLACE_BY_ELEMENT.fire;

  const avoidPatterns = [
    "첫 만남에서 관계를 서둘러 확정하려는 패턴",
    profile.dominantTenStarGroup === "expression" ? "메시지 텐션만 올리고 실제 만남을 미루는 패턴" : "대화보다 조건 검증만 반복하는 패턴",
    profile.dominantTenStarGroup === "resource" ? "감정을 속으로만 정리하고 표현을 미루는 패턴" : "피로한 날에도 무리하게 약속을 이어가는 패턴",
  ];

  return {
    avoidPlaces,
    avoidTiming: ["과로 직후 심야 약속", "감정 소모가 큰 날의 즉흥 만남"],
    avoidPatterns,
    reason: `${ELEMENT_LABEL[avoidElement]} 과열 구간에서는 상대의 신호를 오해하기 쉽습니다. 속도를 반 박자 늦추면 관계의 질이 훨씬 좋아집니다.`,
  };
}

function buildPracticalPlan(profile: MeetingEnergyProfile, places: DestinyMeetingPlaceResult["recommendedPlaces"]): DestinyMeetingPlaceResult["practicalPlan"] {
  const topPlace = places[0]?.name || "강변 산책길";
  const secondPlace = places[1]?.name || "전시 공간";

  return {
    todayAction: `오늘은 ${topPlace}에 30분만 머물며 대화의 소재를 1개 기록해 보세요.`,
    thisWeekAction: `이번 주에는 ${secondPlace} 포함 2곳을 방문해, 같은 시간대 반복 노출 루틴을 만드세요.`,
    thisMonthAction: `이번 달엔 ${ELEMENT_LABEL[profile.primaryElement]} 무드를 유지하는 코디/향/동선을 3회 이상 실천해 보세요.`,
    travelAction: `${COUNTRY_POOL_BY_ELEMENT[profile.primaryElement][0].country} · ${COUNTRY_POOL_BY_ELEMENT[profile.primaryElement][0].cities[0]} 스타일의 1박 2일 동선을 미리 설계해 두면 인연운 체감이 빨라집니다.`,
  };
}

export function generateDestinyMeetingPlaceResult(sajuResult: SajuEngineResult): DestinyMeetingPlaceResult {
  const profile = deriveMeetingEnergyProfile(sajuResult);
  const style = DAY_MASTER_STYLE[profile.dayMasterStem] || DAY_MASTER_STYLE.갑;

  const recommendedPlaces = buildRecommendedPlaces(profile);
  const recommendedCountries = buildRecommendedCountries(profile);
  const meetingPlaceTypes = buildMeetingPlaceTypes(profile);
  const luckyTiming = buildLuckyTiming(profile);
  const destinyItems = buildDestinyItems(profile);
  const avoidGuide = buildAvoidGuide(profile);
  const practicalPlan = buildPracticalPlan(profile, recommendedPlaces);
  const stylingGuide = STYLING_GUIDE_BY_ELEMENT[profile.primaryElement];

  return {
    summary: {
      title: "사주로 보는 인연의 장소",
      oneLine: `당신의 인연은 ${ELEMENT_LABEL[profile.primaryElement]} 기운이 머무는 공간에서 특히 선명하게 열립니다. 천천히 대화를 쌓는 동선이 관계의 결을 깊게 만듭니다.`,
      mainEnergy: ELEMENT_LABEL[profile.primaryElement],
      romanceKeyword: style.romanceKeyword,
      placeTheme: `${ELEMENT_LABEL[profile.primaryElement]} 중심의 ${profile.meetingStyle}`,
    },
    energyProfile: {
      dayMaster: profile.dayMasterLabel,
      usefulElements: profile.usefulElements,
      avoidElements: profile.avoidElements,
      strongestElement: profile.strongestElement,
      weakestElement: profile.weakestElement,
      relationshipPattern: profile.relationshipPattern,
      meetingStyle: profile.meetingStyle,
    },
    recommendedPlaces,
    recommendedCountries,
    meetingPlaceTypes,
    luckyTiming,
    destinyItems,
    stylingGuide,
    avoidGuide,
    practicalPlan,
  };
}
