import type { CharacterId, LoveCharacter, LoveStats } from "../_data/loveCodeMvp";

type MatchElement = LoveCharacter["element"];
type MatchYinYang = LoveCharacter["yinYang"];

export type LoveCharacterMatchResult = {
  characterId: CharacterId;
  characterName: string;
  matchLabel: string;
  /**
   * 🔴 화면 문구가 아니라 **판정 키**다. 예전에는 `confidenceLabel: "높음" | "보통" | "낮음"`
   * 이었고 `RecommendedMatchCard` 가 그 한국어를 그대로 찍어, 비-ko 사용자가 자기 언어 옆에서
   * 한국어를 봤다. 문장은 `LOVE_MATCHING_COPY_KO.confidence` 가 갖는다.
   */
  confidenceKey: "high" | "medium" | "low";
  summary: string;
  reasonBullets: string[];
};

export type SajuCoupleCompatibility = {
  score: number;
  grade: string;
  summary: string;
  reasons: string[];
  chips: string[];
  risk: string;
  dateTip: string;
  statEffects: Partial<LoveStats>;
};

type ExtractedSajuProfile = {
  dayPillar: string;
  dayBranch: string | null;
  dayMaster: string | null;
  dayElement: MatchElement | null;
  strongElements: MatchElement[];
  yinYang: MatchYinYang | null;
  tenGodHints: string[];
  charmHints: string[];
  relationshipHints: string[];
  allHints: string[];
};

type ScoredMatch = LoveCharacterMatchResult & {
  score: number;
};

/**
 * 화면에 찍히는 문장의 **한국어 정본**. 다른 로케일은 `LoveSimulationEngine` 이 걸어 둔
 * `useLoveSimCopy("matching", LOVE_MATCHING_COPY_KO)` 가 사전
 * (`loveSimulation.matching.*`, 저작 정본 `i18n/authored/loveSimulation-*.json`)에서 가져간다.
 * 그러니 문장을 고치면 사전 키도 같이 고쳐야 한다 — 안 고치면 한국어만 바뀌고 나머지 11개는
 * 옛 문장을 계속 서빙한다.
 *
 * 🔴 이 파일에 남은 한국어 중 **여기 없는 것은 전부 기계 키**다(`GAN_DAY_MASTER` 의 `갑`,
 * `BRANCH_ELEMENT` 의 `자`, `TEN_GOD_TERMS` 의 `비견`, `FALLBACK_PROFILE` 의 키워드…).
 * 저것들은 사주 계산 결과 문자열과 대조하는 조회 키라 로케일 불문 한국어로 남는다 —
 * CLAUDE.md 의 "한국어 타입 리터럴 = 기계 키" 제외 대상과 같은 부류다. 사전으로 옮기면
 * 매칭이 통째로 죽는다.
 *
 * 🔴 `{...}` 자리에 들어가는 값 중 `characterName`·`archetype`·`profileLine`·`bestApproach`
 * 는 `_data/loveCodeMvp.ts` 가 갖는 한국어이고 아직 로케일화되지 않았다(콘텐츠 번역 슬라이스
 * 3·4). 그때까지 비-ko 화면은 **틀은 그 언어, 캐릭터 이름·소개는 한국어**로 섞여 나온다.
 */
export const LOVE_MATCHING_COPY_KO = {
  /** 일간 표시 이름. 조회 키는 `GAN_DAY_MASTER` 가 따로 갖는다(그쪽은 한국어 고정). */
  dayMasterNames: {
    jiaWood: "갑목",
    yiWood: "을목",
    bingFire: "병화",
    dingFire: "정화",
    wuEarth: "무토",
    jiEarth: "기토",
    gengMetal: "경금",
    xinMetal: "신금",
    renWater: "임수",
    guiWater: "계수",
  },
  /** 배우자궁(일지) 표시 이름. */
  branchNames: {
    zi: "자",
    chou: "축",
    yin: "인",
    mao: "묘",
    chen: "진",
    si: "사",
    wu: "오",
    wei: "미",
    shen: "신",
    you: "유",
    xu: "술",
    hai: "해",
  },
  elementNames: {
    wood: "목",
    fire: "화",
    earth: "토",
    metal: "금",
    water: "수",
  },
  yinYangNames: {
    yin: "음",
    yang: "양",
  },
  unknownElement: "미확인",
  elementEnergy: "{element} 기운",
  coupleGrade: {
    excellent: "상급 궁합",
    generating: "자연 상생궁합",
    tuning: "설렘 조율궁합",
    pacing: "속도 조절궁합",
    cooling: "냉각 주의궁합",
  },
  elementRelation: {
    unknown: "오행 정보 일부 미확인",
    resonance: "{element} 기운 공명",
    generating: "오행 상생 흐름",
    controlling: "오행 긴장 흐름",
    neutral: "오행 중립 흐름",
  },
  coupleReason: {
    sameDayMaster: "두 사람의 일간이 {dayMaster}으로 같아 감정의 반응 속도를 서로 빨리 알아차립니다.",
    sameElement: "{element} 기운이 함께 울려 취향과 표현 방식이 자연스럽게 닿습니다.",
    generating: "{relation}이라 한쪽의 마음이 다른 쪽의 안정과 설렘을 살려줍니다.",
    controlling: "{relation}이라 강하게 끌리지만 표현 방식이 부딪힐 수 있습니다.",
    sameBranch: "배우자궁의 지지가 {branch}으로 같아 관계의 기본 리듬이 닮아 있습니다.",
    sameBranchElement: "배우자궁의 바탕 기운이 {element}으로 맞아 생활 감각을 맞추기 쉽습니다.",
    branchControlling: "배우자궁의 기운이 서로를 자극해 작은 오해도 크게 번질 수 있습니다.",
    sameYinYang: "{yinYang}의 리듬이 닮아 관계 속도를 맞추기 좋습니다.",
    differentYinYang: "음양이 달라 서로의 빈칸을 채우지만, 확인의 언어를 자주 맞춰야 합니다.",
    sharedElements: "강한 오행 중 {elements}이 겹쳐 반복되는 끌림 포인트가 있습니다.",
    sharedKeywords: "관계 키워드가 일부 겹쳐 서로가 원하는 안정감의 모양이 비슷합니다.",
  },
  chip: {
    yinYangSync: "음양 동조",
    yinYangComplement: "음양 보완",
    yinYangUnknown: "음양 일부 미확인",
    spousePalace: "배우자궁 {self}-{partner}",
    spousePalaceUnknown: "배우자궁 일부 미확인",
  },
  risk: {
    controlling: "강한 끌림이 먼저 올라오는 대신, 말의 속도와 자존심이 부딪히면 긴장이 빨리 커집니다.",
    smooth: "관계가 비교적 자연스럽게 흐르지만, 익숙함 때문에 확인을 생략하면 온도가 서서히 낮아질 수 있습니다.",
    steady: "서로의 마음을 단정하기보다 반응을 짧고 자주 확인해야 안정감이 쌓입니다.",
  },
  dateTip: {
    smooth: "첫 데이트는 오래 걷는 동선보다 서로의 취향을 확인할 수 있는 작은 선택지가 많은 코스가 좋습니다.",
    controlling: "처음부터 결론을 내기보다 짧은 대화, 분명한 약속, 가벼운 애프터로 긴장을 낮추는 편이 좋습니다.",
    steady: "대화가 끊기지 않는 조용한 공간에서 호감 표현보다 생활 리듬을 먼저 맞춰보세요.",
  },
  coupleSummary:
    "{self}인 당신과 {partner}인 상대는 {relation}으로 읽힙니다. 전체 궁합은 {grade}이며, 설렘보다 오래 남는 포인트는 {reason}입니다.",
  coupleSummaryFallbackReason: "서로의 반응을 천천히 확인하는 태도",
  confidence: {
    high: "높음",
    medium: "보통",
    low: "낮음",
  },
  matchReason: {
    dayMaster: "{dayMaster} 일간의 결이 {name}형 관계 패턴과 닮아 있습니다.",
    element: "{element}의 기운이 관계 표현 방식과 자연스럽게 맞닿습니다.",
    generating: "오행의 흐름이 서로를 돕는 상생의 방향으로 이어집니다.",
    yinYang: "{yinYang}의 리듬이 캐릭터의 거리감과 비슷합니다.",
    keywords: "사주 결과의 관계 힌트가 캐릭터 키워드와 일부 겹칩니다.",
    tenGod: "십성 성향에서 가까운 관계 반응이 보입니다.",
    charm: "매력 신살의 분위기가 캐릭터의 끌림 방식과 닮았습니다.",
    relationship: "관계 성향 요약에서 비슷한 흐름이 잡힙니다.",
    fallbackArchetype: "{name}형은 {archetype}의 결을 가진 페르소나입니다.",
    fallbackDisclaimer: "시뮬레이션을 위한 성향 매칭으로, 실제 상대를 단정하지 않습니다.",
  },
  matchLabel: "{name}형 성향과 가까워요",
  matchSummary: "{profileLine}으로 해석됩니다. 관계에서는 {bestApproach}",
};

export type LoveMatchingCopy = typeof LOVE_MATCHING_COPY_KO;

/** 조회 키(한국어 고정) → 표시 이름 키. 사전이 덮는 것은 오른쪽뿐이다. */
const DAY_MASTER_COPY_KEY: Record<string, keyof LoveMatchingCopy["dayMasterNames"]> = {
  갑목: "jiaWood",
  을목: "yiWood",
  병화: "bingFire",
  정화: "dingFire",
  무토: "wuEarth",
  기토: "jiEarth",
  경금: "gengMetal",
  신금: "xinMetal",
  임수: "renWater",
  계수: "guiWater",
};

const BRANCH_COPY_KEY: Record<string, keyof LoveMatchingCopy["branchNames"]> = {
  자: "zi",
  축: "chou",
  인: "yin",
  묘: "mao",
  진: "chen",
  사: "si",
  오: "wu",
  미: "wei",
  신: "shen",
  유: "you",
  술: "xu",
  해: "hai",
};

/**
 * `{name}` 자리를 채운다. 사전이 채우지 못한 자리는 남겨 두지 않고 빈 문자열로 지운다 —
 * 번역이 자리표시자를 빠뜨렸을 때 화면에 `{name}` 이 그대로 찍히는 것보다 낫다.
 */
function formatTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

/** 사전에 없는 일간·지지(계산기가 새 값을 내놓은 경우)는 원문을 그대로 보여준다. */
function dayMasterName(copy: LoveMatchingCopy, dayMaster: string): string {
  const key = DAY_MASTER_COPY_KEY[dayMaster];
  return key ? copy.dayMasterNames[key] : dayMaster;
}

function branchName(copy: LoveMatchingCopy, branch: string): string {
  const key = BRANCH_COPY_KEY[branch];
  return key ? copy.branchNames[key] : branch;
}

const GAN_DAY_MASTER: Record<string, string> = {
  갑: "갑목",
  을: "을목",
  병: "병화",
  정: "정화",
  무: "무토",
  기: "기토",
  경: "경금",
  신: "신금",
  임: "임수",
  계: "계수",
};

const GAN_YIN_YANG: Record<string, MatchYinYang> = {
  갑: "yang",
  병: "yang",
  무: "yang",
  경: "yang",
  임: "yang",
  을: "yin",
  정: "yin",
  기: "yin",
  신: "yin",
  계: "yin",
};

const KOREAN_ELEMENT_TO_CODE: Record<string, MatchElement> = {
  목: "wood",
  화: "fire",
  토: "earth",
  금: "metal",
  수: "water",
};

const GENERATES: Record<MatchElement, MatchElement> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROLS: Record<MatchElement, MatchElement> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

const BRANCH_ELEMENT: Record<string, MatchElement> = {
  자: "water",
  축: "earth",
  인: "wood",
  묘: "wood",
  진: "earth",
  사: "fire",
  오: "fire",
  미: "earth",
  신: "metal",
  유: "metal",
  술: "earth",
  해: "water",
};

const TEN_GOD_TERMS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
const CHARM_TERMS = ["도화", "홍염", "화개"];
const RELATION_TERMS = ["배우자궁", "연애", "관계", "신뢰", "표현", "자유", "안정", "집착", "거리감", "관찰", "배려", "주도", "치유"];

const FALLBACK_PROFILE: Record<CharacterId, NonNullable<LoveCharacter["sajuMatchProfile"]>> = {
  "kang-taejun": {
    primaryDayMasters: ["병화", "갑목", "무토"],
    elementBias: ["fire", "wood"],
    yinYang: "yang",
    tenGodHints: ["비견", "겁재", "편관"],
    charmHints: ["홍염"],
    relationshipKeywords: ["직진", "열정", "승부", "응원", "확신"],
  },
  "kwon-sehyun": {
    primaryDayMasters: ["경금", "신금", "기토"],
    elementBias: ["metal", "earth"],
    yinYang: "yang",
    tenGodHints: ["정관", "편관", "정재"],
    charmHints: ["화개"],
    relationshipKeywords: ["신뢰", "통제", "책임", "거리감", "완벽주의"],
  },
  michael: {
    primaryDayMasters: ["계수", "임수", "신금"],
    elementBias: ["water", "metal"],
    yinYang: "yin",
    tenGodHints: ["정인", "편인", "정관"],
    charmHints: ["화개"],
    relationshipKeywords: ["고요", "관찰", "비밀", "신뢰", "절제"],
  },
  "seo-yuan": {
    primaryDayMasters: ["기토", "정화", "을목"],
    elementBias: ["earth", "fire"],
    yinYang: "yin",
    tenGodHints: ["정인", "정관", "식신"],
    charmHints: ["화개"],
    relationshipKeywords: ["배려", "안정", "포근함", "감사", "편안함"],
  },
  "seo-ijun": {
    primaryDayMasters: ["임수", "계수", "경금"],
    elementBias: ["water", "metal"],
    yinYang: "yang",
    tenGodHints: ["편인", "상관", "정인"],
    charmHints: ["화개"],
    relationshipKeywords: ["관찰", "지성", "고독", "거리감", "깊은 대화"],
  },
  "yoon-siwoo": {
    primaryDayMasters: ["갑목", "병화", "임수"],
    elementBias: ["wood", "water"],
    yinYang: "yang",
    tenGodHints: ["정관", "식신", "정재"],
    charmHints: ["도화"],
    relationshipKeywords: ["청춘", "성실", "성장", "계획", "친절"],
  },
  "han-yunseo": {
    primaryDayMasters: ["정화", "병화", "을목"],
    elementBias: ["fire", "wood"],
    yinYang: "yin",
    tenGodHints: ["상관", "식신", "편재"],
    charmHints: ["도화", "홍염"],
    relationshipKeywords: ["창의성", "자유", "무대", "장난기", "표현"],
  },
  "kim-ming": {
    primaryDayMasters: ["신금", "계수", "기토"],
    elementBias: ["metal", "water"],
    yinYang: "yin",
    tenGodHints: ["정인", "정재", "정관"],
    charmHints: ["도화"],
    relationshipKeywords: ["섬세함", "감성", "분위기", "로맨틱", "예의"],
  },
  "park-jieun": {
    primaryDayMasters: ["계수", "신금", "정화"],
    elementBias: ["water", "metal"],
    yinYang: "yin",
    tenGodHints: ["편인", "편관", "겁재"],
    charmHints: ["홍염", "화개"],
    relationshipKeywords: ["신비", "질투", "집착", "진심 확인", "비밀"],
  },
  saebyeok: {
    primaryDayMasters: ["병화", "경금", "정화"],
    elementBias: ["fire", "metal"],
    yinYang: "yang",
    tenGodHints: ["편관", "정재", "비견"],
    charmHints: ["홍염"],
    relationshipKeywords: ["자신감", "주도", "도회적", "확실한 표현", "성숙"],
  },
  seoyeon: {
    primaryDayMasters: ["을목", "정화", "계수"],
    elementBias: ["wood", "fire"],
    yinYang: "yin",
    tenGodHints: ["식신", "정인", "정관"],
    charmHints: ["도화"],
    relationshipKeywords: ["다정함", "로맨틱", "따뜻함", "꾸준함", "설렘"],
  },
  soha: {
    primaryDayMasters: ["갑목", "병화", "임수"],
    elementBias: ["wood", "fire"],
    yinYang: "yang",
    tenGodHints: ["식신", "비견", "정재"],
    charmHints: ["도화"],
    relationshipKeywords: ["운동", "건강", "긍정", "에너지", "응원"],
  },
  jiyoon: {
    primaryDayMasters: ["임수", "병화", "갑목"],
    elementBias: ["water", "wood"],
    yinYang: "yang",
    tenGodHints: ["식신", "편재", "정인"],
    charmHints: ["도화", "홍염"],
    relationshipKeywords: ["자유", "긍정", "편안한 대화", "여행", "밝은 리듬"],
  },
  harin: {
    primaryDayMasters: ["정화", "병화", "을목"],
    elementBias: ["fire", "wood"],
    yinYang: "yin",
    tenGodHints: ["식신", "상관", "편재"],
    charmHints: ["도화", "홍염"],
    relationshipKeywords: ["장난", "반응", "친구 같은 연애", "트렌드", "밝은 표현"],
  },
  neo: {
    primaryDayMasters: ["신금", "계수", "기토"],
    elementBias: ["metal", "water"],
    yinYang: "yin",
    tenGodHints: ["정인", "편인", "정관"],
    charmHints: ["화개"],
    relationshipKeywords: ["섬세함", "관찰", "거리감", "취향", "조용한 신뢰"],
  },
  yeoni: {
    primaryDayMasters: ["을목", "계수", "정화"],
    elementBias: ["wood", "water"],
    yinYang: "yin",
    tenGodHints: ["정인", "식신", "정관"],
    charmHints: ["도화", "화개"],
    relationshipKeywords: ["치유", "섬세함", "전통미", "따뜻함", "천천히"],
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeElement(value: unknown): MatchElement | null {
  const raw = stringValue(value).trim();
  if (raw === "wood" || raw === "fire" || raw === "earth" || raw === "metal" || raw === "water") return raw;
  return KOREAN_ELEMENT_TO_CODE[raw] ?? null;
}

function normalizeDayMaster(value: unknown): string | null {
  const raw = stringValue(value);
  const direct = Object.values(GAN_DAY_MASTER).find((dayMaster) => raw.includes(dayMaster));
  if (direct) return direct;

  const gan = raw.charAt(0);
  return GAN_DAY_MASTER[gan] ?? null;
}

function collectStrings(value: unknown, output: string[] = [], depth = 0): string[] {
  if (depth > 4 || output.length > 80) return output;
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output, depth + 1));
    return output;
  }
  const record = asRecord(value);
  if (record) {
    Object.values(record).forEach((item) => collectStrings(item, output, depth + 1));
  }
  return output;
}

function extractTerms(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term));
}

function strongestElements(elements: unknown): MatchElement[] {
  const record = asRecord(elements);
  if (!record) return [];

  return Object.entries(record)
    .map(([key, value]) => ({
      element: normalizeElement(key),
      value: typeof value === "number" ? value : Number(value),
    }))
    .filter((item): item is { element: MatchElement; value: number } => Boolean(item.element) && Number.isFinite(item.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((item) => item.element);
}

function extractSajuProfile(sajuResult: unknown): ExtractedSajuProfile {
  const record = asRecord(sajuResult) ?? {};
  const dayPillar = stringValue(record.dayPillar ?? record.day_pillar);
  const dayMaster = normalizeDayMaster(record.dayMasterName ?? record.dayMaster ?? record.day_master ?? record.dayStem ?? dayPillar);
  const dayGan = dayMaster?.charAt(0) || dayPillar.charAt(0);
  const dayBranch = dayPillar.charAt(1) || null;
  const dayElement = normalizeElement(record.dayMasterElement ?? record.dayElement) ?? (dayMaster ? KOREAN_ELEMENT_TO_CODE[dayMaster.charAt(1)] ?? null : null);
  const strongElements = Array.from(new Set([dayElement, ...strongestElements(record.elements ?? record.elementDistribution ?? record.elementCounts)].filter(Boolean))) as MatchElement[];
  const directYinYang = stringValue(record.yinYang ?? record.yinyang);
  const yinYang = directYinYang.includes("yang") || directYinYang.includes("양") ? "yang" : directYinYang.includes("yin") || directYinYang.includes("음") ? "yin" : GAN_YIN_YANG[dayGan] ?? null;
  const allHints = collectStrings(sajuResult).map((item) => item.trim()).filter(Boolean);
  const joinedHints = allHints.join(" ");

  return {
    dayPillar,
    dayBranch,
    dayMaster,
    dayElement,
    strongElements,
    yinYang,
    tenGodHints: extractTerms(joinedHints, TEN_GOD_TERMS),
    charmHints: extractTerms(joinedHints, CHARM_TERMS),
    relationshipHints: extractTerms(joinedHints, RELATION_TERMS),
    allHints,
  };
}

function getProfile(character: LoveCharacter) {
  return character.sajuMatchProfile ?? FALLBACK_PROFILE[character.id];
}

function hasGeneratingRelation(source: MatchElement | null, target: MatchElement | null) {
  if (!source || !target) return false;
  return GENERATES[source] === target || GENERATES[target] === source;
}

function hasControllingRelation(source: MatchElement | null, target: MatchElement | null) {
  if (!source || !target) return false;
  return CONTROLS[source] === target || CONTROLS[target] === source;
}

function countMatches(source: string[], target: string[]) {
  const sourceText = source.join(" ");
  return target.filter((item) => sourceText.includes(item) || source.some((sourceItem) => item.includes(sourceItem))).length;
}

function resolveCoupleGrade(score: number, copy: LoveMatchingCopy) {
  if (score >= 86) return copy.coupleGrade.excellent;
  if (score >= 76) return copy.coupleGrade.generating;
  if (score >= 64) return copy.coupleGrade.tuning;
  if (score >= 52) return copy.coupleGrade.pacing;
  return copy.coupleGrade.cooling;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function elementLabel(element: MatchElement | null, copy: LoveMatchingCopy) {
  return element ? copy.elementNames[element] : copy.unknownElement;
}

function profileLabel(profile: ExtractedSajuProfile, copy: LoveMatchingCopy) {
  if (profile.dayMaster) return dayMasterName(copy, profile.dayMaster);
  return formatTemplate(copy.elementEnergy, { element: elementLabel(profile.dayElement, copy) });
}

function elementRelationLabel(selfElement: MatchElement | null, partnerElement: MatchElement | null, copy: LoveMatchingCopy) {
  if (!selfElement || !partnerElement) return copy.elementRelation.unknown;
  if (selfElement === partnerElement) {
    return formatTemplate(copy.elementRelation.resonance, { element: elementLabel(selfElement, copy) });
  }
  if (hasGeneratingRelation(selfElement, partnerElement)) return copy.elementRelation.generating;
  if (hasControllingRelation(selfElement, partnerElement)) return copy.elementRelation.controlling;
  return copy.elementRelation.neutral;
}

function buildCoupleStatEffects(score: number, hasControl: boolean): Partial<LoveStats> {
  if (score >= 86) return { affection: 7, trust: 8, chemistry: 6, stability: 7, tension: -5 };
  if (score >= 76) return { affection: 5, trust: 6, chemistry: 5, stability: 5, tension: -3 };
  if (score >= 64) return { affection: 4, trust: 3, chemistry: 5, stability: 2, tension: hasControl ? 2 : 0 };
  if (score >= 52) return { affection: 2, trust: 2, chemistry: 3, stability: 1, tension: hasControl ? 5 : 2 };
  return { affection: -2, trust: -1, chemistry: 2, stability: -2, tension: 8 };
}

export function buildSajuCoupleCompatibility(
  selfSaju: unknown,
  partnerSaju: unknown,
  copy: LoveMatchingCopy,
): SajuCoupleCompatibility | null {
  const self = extractSajuProfile(selfSaju);
  const partner = extractSajuProfile(partnerSaju);
  if (!self.dayMaster && !self.dayElement && !partner.dayMaster && !partner.dayElement) return null;

  let score = 58;
  const reasons: string[] = [];
  const selfElement = self.dayElement;
  const partnerElement = partner.dayElement;
  const hasControl = hasControllingRelation(selfElement, partnerElement);

  if (self.dayMaster && partner.dayMaster && self.dayMaster === partner.dayMaster) {
    score += 8;
    reasons.push(formatTemplate(copy.coupleReason.sameDayMaster, { dayMaster: dayMasterName(copy, self.dayMaster) }));
  } else if (selfElement && partnerElement && selfElement === partnerElement) {
    score += 10;
    reasons.push(formatTemplate(copy.coupleReason.sameElement, { element: elementLabel(selfElement, copy) }));
  } else if (hasGeneratingRelation(selfElement, partnerElement || null)) {
    score += 14;
    reasons.push(
      formatTemplate(copy.coupleReason.generating, { relation: elementRelationLabel(selfElement, partnerElement, copy) }),
    );
  } else if (hasControl) {
    score -= 10;
    reasons.push(
      formatTemplate(copy.coupleReason.controlling, { relation: elementRelationLabel(selfElement, partnerElement, copy) }),
    );
  }

  const selfBranchElement = self.dayBranch ? BRANCH_ELEMENT[self.dayBranch] ?? null : null;
  const partnerBranchElement = partner.dayBranch ? BRANCH_ELEMENT[partner.dayBranch] ?? null : null;
  if (self.dayBranch && partner.dayBranch && self.dayBranch === partner.dayBranch) {
    score += 5;
    reasons.push(formatTemplate(copy.coupleReason.sameBranch, { branch: branchName(copy, self.dayBranch) }));
  } else if (selfBranchElement && partnerBranchElement && selfBranchElement === partnerBranchElement) {
    score += 4;
    reasons.push(
      formatTemplate(copy.coupleReason.sameBranchElement, { element: elementLabel(selfBranchElement, copy) }),
    );
  } else if (hasControllingRelation(selfBranchElement, partnerBranchElement)) {
    score -= 5;
    reasons.push(copy.coupleReason.branchControlling);
  }

  if (self.yinYang && partner.yinYang) {
    if (self.yinYang === partner.yinYang) {
      score += 5;
      reasons.push(formatTemplate(copy.coupleReason.sameYinYang, { yinYang: copy.yinYangNames[self.yinYang] }));
    } else {
      score += 3;
      reasons.push(copy.coupleReason.differentYinYang);
    }
  }

  const sharedStrongElements = self.strongElements.filter((element) => partner.strongElements.includes(element));
  if (sharedStrongElements.length > 0) {
    score += Math.min(sharedStrongElements.length, 2) * 3;
    reasons.push(
      formatTemplate(copy.coupleReason.sharedElements, {
        elements: sharedStrongElements.map((element) => elementLabel(element, copy)).join(", "),
      }),
    );
  }

  const sharedRelationHints = countMatches(self.relationshipHints, partner.relationshipHints);
  if (sharedRelationHints > 0) {
    score += Math.min(sharedRelationHints, 2) * 4;
    reasons.push(copy.coupleReason.sharedKeywords);
  }

  const finalScore = clampScore(score);
  const grade = resolveCoupleGrade(finalScore, copy);
  const relationLabel = elementRelationLabel(selfElement, partnerElement, copy);
  const selfLabel = profileLabel(self, copy);
  const partnerLabel = profileLabel(partner, copy);
  const chips = [
    `${selfLabel} × ${partnerLabel}`,
    relationLabel,
    self.yinYang && partner.yinYang
      ? self.yinYang === partner.yinYang
        ? copy.chip.yinYangSync
        : copy.chip.yinYangComplement
      : copy.chip.yinYangUnknown,
    self.dayBranch && partner.dayBranch
      ? formatTemplate(copy.chip.spousePalace, {
          self: branchName(copy, self.dayBranch),
          partner: branchName(copy, partner.dayBranch),
        })
      : copy.chip.spousePalaceUnknown,
  ];
  const risk = hasControl ? copy.risk.controlling : finalScore >= 76 ? copy.risk.smooth : copy.risk.steady;
  const dateTip = finalScore >= 76 ? copy.dateTip.smooth : hasControl ? copy.dateTip.controlling : copy.dateTip.steady;

  return {
    score: finalScore,
    grade,
    summary: formatTemplate(copy.coupleSummary, {
      self: selfLabel,
      partner: partnerLabel,
      relation: relationLabel,
      grade,
      reason: reasons[0] || copy.coupleSummaryFallbackReason,
    }),
    reasons: Array.from(new Set(reasons)).slice(0, 4),
    chips,
    risk,
    dateTip,
    statEffects: buildCoupleStatEffects(finalScore, hasControl),
  };
}

function confidenceKey(score: number): LoveCharacterMatchResult["confidenceKey"] {
  if (score >= 55) return "high";
  if (score >= 32) return "medium";
  return "low";
}

function buildSummary(character: LoveCharacter, copy: LoveMatchingCopy) {
  return formatTemplate(copy.matchSummary, {
    profileLine: character.profileLine,
    bestApproach: character.bestApproach,
  });
}

function scoreCharacter(character: LoveCharacter, sajuProfile: ExtractedSajuProfile, copy: LoveMatchingCopy): ScoredMatch {
  const profile = getProfile(character);
  let score = 0;
  const reasons: string[] = [];

  if (sajuProfile.dayMaster && (character.dayMaster === sajuProfile.dayMaster || profile.primaryDayMasters?.includes(sajuProfile.dayMaster))) {
    score += 30;
    reasons.push(
      formatTemplate(copy.matchReason.dayMaster, {
        dayMaster: dayMasterName(copy, sajuProfile.dayMaster),
        name: character.name,
      }),
    );
  }

  if (sajuProfile.strongElements.includes(character.element) || profile.elementBias?.some((element) => sajuProfile.strongElements.includes(element as MatchElement))) {
    score += 20;
    reasons.push(formatTemplate(copy.matchReason.element, { element: elementLabel(character.element, copy) }));
  } else if (hasGeneratingRelation(sajuProfile.dayElement, character.element)) {
    score += 10;
    reasons.push(copy.matchReason.generating);
  }

  if (sajuProfile.yinYang && (profile.yinYang === sajuProfile.yinYang || profile.yinYang === "balanced" || character.yinYang === sajuProfile.yinYang)) {
    score += profile.yinYang === "balanced" ? 4 : 8;
    reasons.push(formatTemplate(copy.matchReason.yinYang, { yinYang: copy.yinYangNames[sajuProfile.yinYang] }));
  }

  const matchKeywords = [...(character.matchKeywords ?? []), ...character.keywords, ...(profile.relationshipKeywords ?? [])];
  const keywordMatches = countMatches(sajuProfile.allHints, matchKeywords);
  if (keywordMatches > 0) {
    score += Math.min(keywordMatches, 5) * 3;
    reasons.push(copy.matchReason.keywords);
  }

  const tenGodMatches = countMatches(sajuProfile.tenGodHints, profile.tenGodHints ?? []);
  if (tenGodMatches > 0) {
    score += tenGodMatches * 5;
    reasons.push(copy.matchReason.tenGod);
  }

  const charmMatches = countMatches(sajuProfile.charmHints, profile.charmHints ?? []);
  if (charmMatches > 0) {
    score += charmMatches * 5;
    reasons.push(copy.matchReason.charm);
  }

  const relationshipMatches = countMatches(sajuProfile.relationshipHints, profile.relationshipKeywords ?? []);
  if (relationshipMatches > 0) {
    score += relationshipMatches * 5;
    reasons.push(copy.matchReason.relationship);
  }

  const fallbackReasons = [
    formatTemplate(copy.matchReason.fallbackArchetype, { name: character.name, archetype: character.archetype }),
    copy.matchReason.fallbackDisclaimer,
  ];

  return {
    characterId: character.id,
    characterName: character.name,
    confidenceKey: confidenceKey(score),
    matchLabel: formatTemplate(copy.matchLabel, { name: character.name }),
    reasonBullets: Array.from(new Set([...reasons, ...fallbackReasons])).slice(0, 3),
    score,
    summary: buildSummary(character, copy),
  };
}

export function matchLoveCharactersFromSaju(
  sajuResult: unknown,
  characters: LoveCharacter[],
  copy: LoveMatchingCopy,
  targetGender?: LoveCharacter["gender"],
): LoveCharacterMatchResult[] {
  const sajuProfile = extractSajuProfile(sajuResult);
  if (!sajuProfile.dayMaster && !sajuProfile.dayElement && sajuProfile.strongElements.length === 0) return [];
  const candidateCharacters = targetGender ? characters.filter((character) => character.gender === targetGender) : characters;
  if (candidateCharacters.length === 0) return [];

  return candidateCharacters
    .map((character) => scoreCharacter(character, sajuProfile, copy))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, ...result }) => result);
}
