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

type EnrichedRecommendedPlace = DestinyMeetingPlaceResult["recommendedPlaces"][number] & {
  secondaryElement?: DestinyElement;
  categoryLabel?: string;
  destinyGrade?: string;
  elementalProfile?: string;
  baziInsight?: string;
  fitStrategy?: string;
  avoidWhen?: string;
  bestTimeHint?: string;
  ritual?: string;
  purposeTags?: string[];
};

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
      whyItFits: `${ELEMENT_LABEL[profile.primaryElement]} 중심 기운과 ${profile.dayMasterLabel}의 관계 리듬이 맞물려, 첫 대화가 끊기지 않고 신뢰 형성 속도가 빨라집니다.`,
      examplePlaces: dominantStyle.examples,
      caution: dominantStyle.caution,
    },
    {
      title: `${ELEMENT_LABEL[profile.primaryElement]} 공명 루트`,
      description: "용신/희신 축의 오행을 공간으로 옮겨 인연 에너지를 키우는 방식입니다.",
      whyItFits: `당신의 사주에서 ${ELEMENT_LABEL[profile.primaryElement]} 기운은 경계심을 낮추고 대화의 결을 맞추는 핵심 신호로 작동합니다.`,
      examplePlaces: PLACE_POOL_BY_ELEMENT[profile.primaryElement].slice(0, 3).map((item) => item.name),
      caution: "한 번에 많은 장소를 돌기보다 한 공간에 충분히 머무는 편이 더 유리합니다.",
    },
  ];

  return uniqueBy([...base, ...additional], (item) => item.title).slice(0, 4);
}

function buildSceneDescription(
  placeName: string,
  placeType: DestinyMeetingPlaceResult["recommendedPlaces"][number]["type"],
  element: DestinyElement,
): string {
  const timeHint = ELEMENT_TIMING_MAP[element]?.times?.[0] || "오후 시간대";
  const scenicByType: Record<DestinyMeetingPlaceResult["recommendedPlaces"][number]["type"], string> = {
    city: `${timeHint}, 도시의 결이 살아나는 길목에서`,
    nature: `${timeHint}, 공기가 부드럽게 열리는 산책 동선에서`,
    cafe: `${timeHint}, 잔잔한 음악이 흐르는 창가 자리에서`,
    culture: `${timeHint}, 조용한 전시 동선과 해설 포인트 사이에서`,
    travel: `${timeHint}, 낯선 거리의 첫 장면이 펼쳐지는 순간`,
    spiritual: `${timeHint}, 호흡이 느려지는 고요한 공간에서`,
    water: `${timeHint}, 물결 반사가 부드럽게 흔들리는 자리에서`,
    mountain: `${timeHint}, 시야가 트이는 오르막과 쉼 구간에서`,
    night: `${timeHint}, 조명이 켜지며 분위기가 바뀌는 경계 시간에`,
    daily: `${timeHint}, 익숙한 동선이 편안해지는 루틴 안에서`,
  };

  return `${scenicByType[placeType]} ${placeName}의 장면은 시선, 보폭, 말의 속도를 같은 템포로 맞춰 첫 대화를 자연스럽게 길게 이어 줍니다.`;
}

function buildConversationOpener(placeType: DestinyMeetingPlaceResult["recommendedPlaces"][number]["type"]): string {
  const openerByType: Record<DestinyMeetingPlaceResult["recommendedPlaces"][number]["type"], string> = {
    city: "이 거리에서 유독 끌리는 간판이나 공간 하나만 고른다면 어디예요?",
    nature: "오늘 걸으면서 가장 마음이 편해진 지점이 어디였어요?",
    cafe: "이 공간의 분위기를 한 단어로 표현하면 뭐라고 하고 싶어요?",
    culture: "방금 본 작품 중 색감이 가장 오래 남는 건 어떤 장면이었어요?",
    travel: "이 도시에서 하루만 더 머문다면 가장 먼저 가고 싶은 곳이 어디예요?",
    spiritual: "요즘 마음을 진정시키는 루틴이 하나 있다면 뭐예요?",
    water: "물가를 볼 때마다 떠오르는 기억이나 장소가 있어요?",
    mountain: "오르막에서 숨 고를 때 드는 생각이 평소랑 좀 달라지나요?",
    night: "해 질 무렵이 되면 하루 감정이 어떻게 바뀌는 편이에요?",
    daily: "반복해서 찾게 되는 나만의 동네 루틴이 있어요?",
  };
  return openerByType[placeType];
}

function buildEmotionalHook(profile: MeetingEnergyProfile, placeElement: DestinyElement, secondaryElement?: DestinyElement): string {
  const base = `${ELEMENT_LABEL[placeElement]} 기운은 ${profile.relationshipPattern} 리듬을 강화해 상대의 경계심을 천천히 낮추고 대화의 안전지대를 만듭니다.`;
  if (profile.primaryElement === placeElement) {
    return `${base} 특히 당신의 핵심 인연 축과 직접 공명해, 디테일을 알아보는 사람을 안정적으로 끌어당기는 힘이 강해집니다.`;
  }
  if (secondaryElement && profile.usefulElements.includes(secondaryElement)) {
    return `${base} 여기에 ${ELEMENT_LABEL[secondaryElement]} 보조 기운이 붙어 부족한 흐름을 채우고, 호감이 실제 약속으로 이어질 가능성을 높입니다.`;
  }
  return `${base} 보조 오행으로 작동해 과열된 감정 대신 오래 가는 호기심과 신뢰를 남기는 데 유리합니다.`;
}

function buildPlaceDestinyGrade(score: number, categoryLabel: string): string {
  if (score >= 94) return "대길지";
  if (score >= 89) return categoryLabel;
  if (score >= 82) return "길지";
  return "보완지";
}

function buildElementalProfile(mainElement: DestinyElement, secondaryElement?: DestinyElement): string {
  return secondaryElement
    ? `주기운 ${ELEMENT_LABEL[mainElement]} · 보조기운 ${ELEMENT_LABEL[secondaryElement]}`
    : `주기운 ${ELEMENT_LABEL[mainElement]}`;
}

function buildBaziPlaceInsight(
  profile: MeetingEnergyProfile,
  item: { element: DestinyElement; secondaryElement?: DestinyElement; baziInsight: string },
): string {
  const elements = [item.element, item.secondaryElement].filter(Boolean) as DestinyElement[];
  const usefulMatches = elements.filter((element) => profile.usefulElements.includes(element));
  const weakMatches = elements.filter((element) => element === profile.weakestElement);
  const avoidMatches = elements.filter((element) => profile.avoidElements.includes(element));

  if (usefulMatches.length) {
    return `${item.baziInsight} 당신의 사주에서는 ${usefulMatches.map((element) => ELEMENT_LABEL[element]).join("·")} 기운이 용신·희신 축과 맞닿아 장소 자체가 인연운을 여는 부적처럼 작동합니다.`;
  }
  if (weakMatches.length) {
    return `${item.baziInsight} 특히 부족한 ${weakMatches.map((element) => ELEMENT_LABEL[element]).join("·")} 기운을 채워, 움츠러든 표현과 감정 순환을 다시 살려줍니다.`;
  }
  if (avoidMatches.length) {
    return `${item.baziInsight} 다만 ${avoidMatches.map((element) => ELEMENT_LABEL[element]).join("·")} 기운이 과열되기 쉬우니 머무는 시간을 짧고 선명하게 잡을 때 길하게 바뀝니다.`;
  }
  return `${item.baziInsight} 당신의 사주에서는 과한 기운을 누르고 부족한 기운을 부드럽게 잇는 완충 장소로 읽힙니다.`;
}

function buildRecommendedPlaces(profile: MeetingEnergyProfile): DestinyMeetingPlaceResult["recommendedPlaces"] {
  const focusElements = uniqueBy(
    [profile.primaryElement, profile.secondaryElement, ...profile.usefulElements, profile.weakestElement].filter(Boolean) as DestinyElement[],
    (element) => element,
  );
  const basePool = focusElements.flatMap((element) =>
    PLACE_POOL_BY_ELEMENT[element].map((item) => ({ ...item, element })),
  );

  const scored = shuffleWithSeed(basePool, profile.seed + 17).map((item, order) => {
    const elements = [item.element, item.secondaryElement].filter(Boolean) as DestinyElement[];
    const sinsalBoost =
      (profile.sinsalSignals.dohwa && (item.type === "night" || item.type === "culture" || item.purposeTags.includes("도화")) ? 8 : 0)
      + (profile.sinsalSignals.hongyeom && (item.type === "cafe" || item.type === "night" || item.purposeTags.includes("홍염")) ? 6 : 0)
      + (profile.sinsalSignals.yeokma && (item.type === "travel" || item.purposeTags.includes("이동운")) ? 7 : 0)
      + (profile.sinsalSignals.hwagae && (item.type === "spiritual" || item.purposeTags.includes("관계 숙성")) ? 6 : 0);
    const usefulBoost = elements.reduce((score, element) => score + (profile.usefulElements.includes(element) ? 8 : 0), 0);
    const weakBoost = elements.reduce((score, element) => score + (element === profile.weakestElement ? 5 : 0), 0);
    const primaryBoost = item.element === profile.primaryElement ? 5 : 0;
    const secondaryBoost = item.element === profile.secondaryElement || item.secondaryElement === profile.secondaryElement ? 3 : 0;
    const avoidPenalty = elements.reduce((score, element) => score + (profile.avoidElements.includes(element) ? 8 : 0), 0);
    const score = 72 + usefulBoost + weakBoost + primaryBoost + secondaryBoost + sinsalBoost - avoidPenalty;
    return { item, order, score };
  });

  const selected = uniqueBy(
    scored.sort((a, b) => b.score - a.score || a.order - b.order),
    ({ item }) => item.name,
  ).slice(0, 5);

  return selected.map(({ item, score }, index) => {
    const romancePotential = Math.max(60, Math.min(98, score + (4 - index) * 2));
    const conversationOpener = buildConversationOpener(item.type);

    const enrichedPlace: EnrichedRecommendedPlace = {
      rank: index + 1,
      name: item.name,
      type: item.type,
      element: item.element,
      secondaryElement: item.secondaryElement,
      categoryLabel: item.categoryLabel,
      destinyGrade: buildPlaceDestinyGrade(romancePotential, item.categoryLabel),
      elementalProfile: buildElementalProfile(item.element, item.secondaryElement),
      baziInsight: buildBaziPlaceInsight(profile, item),
      fitStrategy: item.fitStrategy,
      avoidWhen: item.avoidWhen,
      bestTimeHint: item.bestTimeHint,
      ritual: item.ritual,
      purposeTags: item.purposeTags,
      sceneDescription: buildSceneDescription(item.name, item.type, item.element),
      emotionalHook: buildEmotionalHook(profile, item.element, item.secondaryElement),
      conversationOpener,
      reason: `${item.reason} 이 공간은 ${profile.relationshipPattern} 흐름과 맞물려, 첫 만남에서도 대화의 깊이를 빠르게 확보하기 좋습니다.`,
      actionTip: `${item.actionTip} 도착 후 3분 안에 "${conversationOpener}"처럼 감각 질문으로 첫 문장을 열면 호감 형성 속도가 눈에 띄게 좋아집니다.`,
      romancePotential,
    };
    return enrichedPlace;
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
    explanation: `${ELEMENT_LABEL[profile.primaryElement]} 기운이 강해지는 시간대에는 말의 톤과 표정 텐션이 안정되어 인연 운이 선명하게 상승합니다. ${profile.sinsalSignals.yeokma ? "이동이 포함된 일정은 우연한 접점을 크게 늘려 귀인운 체감이 빨라집니다." : "같은 요일·같은 시간대의 반복 방문 루틴은 관계 전개 확률을 꾸준히 높입니다."}`,
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
    reason: `${ELEMENT_LABEL[avoidElement]} 과열 구간에서는 상대의 의도를 과해석하거나 결론을 서두르기 쉽습니다. 결정 속도를 반 박자 늦추면 관계의 질과 지속성이 동시에 좋아집니다.`,
  };
}

function buildPracticalPlan(profile: MeetingEnergyProfile, places: DestinyMeetingPlaceResult["recommendedPlaces"]): DestinyMeetingPlaceResult["practicalPlan"] {
  const topPlace = places[0]?.name || "강변 산책길";
  const secondPlace = places[1]?.name || "전시 공간";

  return {
    todayAction: `오늘은 ${topPlace}에서 최소 30분 머물며, 상대 반응이 좋았던 대화 키워드 1개를 메모해 다음 만남의 오프너로 저장하세요.`,
    thisWeekAction: `이번 주에는 ${secondPlace}를 포함한 2곳을 같은 시간대에 방문해, 인연운이 잘 열리는 리듬을 몸에 고정하세요.`,
    thisMonthAction: `이번 달에는 ${ELEMENT_LABEL[profile.primaryElement]} 무드를 유지하는 코디·향·동선을 3회 이상 반복해 첫인상 일관성을 강화하세요.`,
    travelAction: `${COUNTRY_POOL_BY_ELEMENT[profile.primaryElement][0].country} · ${COUNTRY_POOL_BY_ELEMENT[profile.primaryElement][0].cities[0]} 스타일의 1박 2일 코스를 미리 설계해 두면, 우연한 만남을 관계 전개로 연결하기 쉬워집니다.`,
    toneReminder: `${ELEMENT_LABEL[profile.primaryElement]} 무드를 유지하면 관계 속도를 무리하게 당기지 않고, 신뢰를 먼저 쌓는 건강한 흐름이 강해집니다.`,
    microActions: [
      "첫 대화는 취향 질문 1개로 시작하고, 바로 자신의 짧은 답을 덧붙이기",
      "만남 후 10분 안에 기억에 남은 포인트 1줄을 메모해 다음 대화의 실마리로 쓰기",
      "약속 시간보다 12분 먼저 도착해 호흡을 정리하고 표정 텐션을 안정시키기",
    ],
  };
}

function buildPromptPack(
  profile: MeetingEnergyProfile,
  places: DestinyMeetingPlaceResult["recommendedPlaces"],
  countries: DestinyMeetingPlaceResult["recommendedCountries"],
  luckyTiming: DestinyMeetingPlaceResult["luckyTiming"],
  stylingGuide: DestinyMeetingPlaceResult["stylingGuide"],
  avoidGuide: DestinyMeetingPlaceResult["avoidGuide"],
  practicalPlan: DestinyMeetingPlaceResult["practicalPlan"],
): DestinyMeetingPlaceResult["promptPack"] {
  const topPlace = places[0];
  const secondPlace = places[1];
  const travel = countries[0];
  const primaryLabel = ELEMENT_LABEL[profile.primaryElement];
  const secondaryLabel = ELEMENT_LABEL[profile.secondaryElement];
  const bestTime = luckyTiming.bestTimeOfDay.join(", ");
  const bestMonths = luckyTiming.bestMonths.join(", ");
  const microActions = practicalPlan.microActions?.join("\n- ") || "첫 대화의 온도, 이동 동선, 마무리 인사를 차분히 기록하기";

  return {
    title: `${profile.dayMasterLabel} 인연 프롬프트 북`,
    intro: `${primaryLabel} 기운이 열리는 장소와 ${secondaryLabel} 보조 흐름을 엮어, 오늘 바로 쓸 수 있는 인연 질문과 실천 문장을 준비했습니다.`,
    prompts: [
      {
        id: "meeting-place-oracle",
        title: "인연 장소 리딩",
        category: "장소",
        intent: "나에게 맞는 만남의 공간을 깊게 해석할 때",
        relatedPlace: topPlace?.name,
        prompt: [
          "당신은 사주 명리와 관계 심리를 함께 읽는 인연 상담가입니다.",
          `나의 일간은 ${profile.dayMasterLabel}, 핵심 인연 기운은 ${primaryLabel}, 보조 기운은 ${secondaryLabel}입니다.`,
          `추천 장소는 ${topPlace?.name || "차분한 산책 공간"}이며, 이 장소의 분위기는 "${topPlace?.sceneDescription || profile.meetingStyle}"입니다.`,
          `이 장소가 나의 관계 패턴 "${profile.relationshipPattern}"과 어떻게 맞물리는지, 첫 만남의 감정선과 신뢰가 열리는 장면을 중심으로 풀어주세요.`,
          "문장은 신비롭지만 현실적인 톤으로 쓰고, 마지막에는 오늘 바로 실행할 작은 행동 하나를 제안해주세요.",
        ].join("\n"),
      },
      {
        id: "conversation-opener",
        title: "첫 대화 문장",
        category: "대화",
        intent: "어색함 없이 첫 문장을 열고 싶을 때",
        relatedPlace: topPlace?.name,
        prompt: [
          "당신은 사주 흐름에 맞는 첫 대화의 문장을 고르는 관계 코치입니다.",
          `나는 ${primaryLabel} 기운이 살아나는 ${topPlace?.name || "편안한 공간"}에서 인연운이 열립니다.`,
          `기본 대화 실마리는 "${topPlace?.conversationOpener || "이 공간에서 가장 마음이 편해지는 지점이 어디인가요?"}"입니다.`,
          "이 문장을 바탕으로 부담 없이 시작할 수 있는 첫 대화 문장 7개를 만들어주세요.",
          "각 문장은 상대를 시험하지 않고, 취향과 감각을 자연스럽게 열어주는 말이어야 합니다.",
        ].join("\n"),
      },
      {
        id: "date-route",
        title: "데이트 동선 설계",
        category: "동선",
        intent: "장소를 실제 만남 루트로 바꾸고 싶을 때",
        relatedPlace: `${topPlace?.name || "첫 장소"} · ${secondPlace?.name || "두 번째 장소"}`,
        prompt: [
          "당신은 사주 오행과 장소 무드를 엮어 만남의 동선을 설계하는 기획자입니다.",
          `나에게 좋은 장소는 ${topPlace?.name || "첫 장소"}와 ${secondPlace?.name || "두 번째 장소"}입니다.`,
          `좋은 시간대는 ${bestTime}, 좋은 달은 ${bestMonths}입니다.`,
          `나의 관계 흐름은 "${profile.meetingStyle}"이고, 오늘의 실천 문장은 "${practicalPlan.todayAction}"입니다.`,
          "첫 만남, 두 번째 만남, 관계가 깊어지는 세 번째 만남까지 이어지는 동선을 제안해주세요.",
          "각 동선에는 머무는 시간, 대화 주제, 피해야 할 과속 지점을 함께 담아주세요.",
        ].join("\n"),
      },
      {
        id: "travel-romance",
        title: "여행 인연 시나리오",
        category: "여행",
        intent: "도시·해외 인연운을 상상하고 준비할 때",
        relatedPlace: travel ? `${travel.country} ${travel.cities[0]}` : undefined,
        prompt: [
          "당신은 사주와 도시의 기운을 함께 읽는 여행 인연 큐레이터입니다.",
          `나에게 어울리는 여행 무드는 ${travel?.country || "따뜻한 도시"}의 ${travel?.cities.join(", ") || "고요한 거리"}입니다.`,
          `이 여행지는 "${travel?.travelMood || "낯선 풍경 속에서 마음이 천천히 열리는 흐름"}"을 품고 있습니다.`,
          `핵심 오행은 ${primaryLabel}, 보조 오행은 ${secondaryLabel}입니다.`,
          "이 도시에서 인연을 만날 가능성이 높은 장소, 시간, 대화의 시작점, 혼자 있을 때의 태도를 하나의 짧은 여행 리딩으로 써주세요.",
        ].join("\n"),
      },
      {
        id: "style-scent",
        title: "매력 스타일링",
        category: "스타일",
        intent: "첫인상을 사주 기운에 맞게 정리할 때",
        prompt: [
          "당신은 사주 오행과 첫인상 이미지를 함께 다루는 매력 스타일리스트입니다.",
          `나의 인연 무드는 "${stylingGuide.mood}"입니다.`,
          `어울리는 색은 ${stylingGuide.colors.join(", ")}이며, 의상 방향은 "${stylingGuide.outfit}"입니다.`,
          `향과 장신구 힌트는 "${stylingGuide.fragrance || "은은한 잔향"}", "${stylingGuide.accessory || "작고 선명한 포인트"}"입니다.`,
          "첫 만남에서 과하지 않게 매력이 살아나는 스타일링 리딩을 써주세요.",
          "옷, 향, 표정, 첫 인사, 자리 선택까지 한 번에 실천할 수 있게 정리해주세요.",
        ].join("\n"),
      },
      {
        id: "avoid-shadow",
        title: "피해야 할 인연 흐름",
        category: "주의",
        intent: "관계가 어긋나는 장소와 타이밍을 피하고 싶을 때",
        prompt: [
          "당신은 인연운의 밝은 문과 그림자를 함께 읽는 사주 상담가입니다.",
          `내가 피해야 할 장소는 ${avoidGuide.avoidPlaces.join(", ")}입니다.`,
          `주의할 시간은 ${avoidGuide.avoidTiming.join(", ")}이고, 반복하기 쉬운 패턴은 ${avoidGuide.avoidPatterns.join(", ")}입니다.`,
          `그 이유는 "${avoidGuide.reason}"입니다.`,
          "이 흐름을 겁주는 말이 아니라 품위 있는 경계 문장으로 풀어주세요.",
          "마지막에는 같은 에너지를 좋은 방향으로 바꾸는 대체 장소와 대체 행동을 제안해주세요.",
        ].join("\n"),
      },
      {
        id: "seven-day-ritual",
        title: "7일 인연 의식",
        category: "실천",
        intent: "이번 주 인연운을 실제 행동으로 열고 싶을 때",
        prompt: [
          "당신은 사주 흐름을 일상 속 작은 의식으로 바꾸는 라이프 리딩 전문가입니다.",
          `오늘의 행동은 "${practicalPlan.todayAction}"입니다.`,
          `이번 주 행동은 "${practicalPlan.thisWeekAction}"입니다.`,
          `이번 달 흐름은 "${practicalPlan.thisMonthAction}"입니다.`,
          `마이크로 액션은 다음과 같습니다.\n- ${microActions}`,
          "이 내용을 바탕으로 7일 동안 실천할 수 있는 인연 의식 플랜을 만들어주세요.",
          "각 날짜는 한 문장의 마음가짐, 하나의 행동, 하나의 기록 질문으로 구성해주세요.",
        ].join("\n"),
      },
    ],
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
  const promptPack = buildPromptPack(profile, recommendedPlaces, recommendedCountries, luckyTiming, stylingGuide, avoidGuide, practicalPlan);

  return {
    summary: {
      title: "사주로 보는 운명의 장소",
      oneLine: `당신의 운명은 ${ELEMENT_LABEL[profile.primaryElement]} 기운이 머무는 장소에서 가장 선명하게 숨을 고릅니다. 공간의 오행이 사주의 부족한 결을 채우면 첫 호감은 신뢰가 되고, 우연한 동선은 인연의 문으로 바뀝니다.`,
      mainEnergy: ELEMENT_LABEL[profile.primaryElement],
      romanceKeyword: style.romanceKeyword,
      placeTheme: `${ELEMENT_LABEL[profile.primaryElement]} 중심의 운명 장소 루트`,
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
    promptPack,
  };
}
