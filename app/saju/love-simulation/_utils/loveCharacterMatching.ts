import type { CharacterId, LoveCharacter } from "../_data/loveCodeMvp";

type MatchElement = LoveCharacter["element"];
type MatchYinYang = LoveCharacter["yinYang"];

export type LoveCharacterMatchResult = {
  characterId: CharacterId;
  characterName: string;
  matchLabel: string;
  confidenceLabel: "높음" | "보통" | "낮음";
  summary: string;
  reasonBullets: string[];
};

type ExtractedSajuProfile = {
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

const CODE_TO_KOREAN_ELEMENT: Record<MatchElement, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const GENERATES: Record<MatchElement, MatchElement> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
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
  const dayElement = normalizeElement(record.dayMasterElement ?? record.dayElement) ?? (dayMaster ? KOREAN_ELEMENT_TO_CODE[dayMaster.charAt(1)] ?? null : null);
  const strongElements = Array.from(new Set([dayElement, ...strongestElements(record.elements ?? record.elementDistribution ?? record.elementCounts)].filter(Boolean))) as MatchElement[];
  const directYinYang = stringValue(record.yinYang ?? record.yinyang);
  const yinYang = directYinYang.includes("yang") || directYinYang.includes("양") ? "yang" : directYinYang.includes("yin") || directYinYang.includes("음") ? "yin" : GAN_YIN_YANG[dayGan] ?? null;
  const allHints = collectStrings(sajuResult).map((item) => item.trim()).filter(Boolean);
  const joinedHints = allHints.join(" ");

  return {
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

function hasGeneratingRelation(source: MatchElement | null, target: MatchElement) {
  if (!source) return false;
  return GENERATES[source] === target || GENERATES[target] === source;
}

function countMatches(source: string[], target: string[]) {
  const sourceText = source.join(" ");
  return target.filter((item) => sourceText.includes(item) || source.some((sourceItem) => item.includes(sourceItem))).length;
}

function confidenceLabel(score: number): LoveCharacterMatchResult["confidenceLabel"] {
  if (score >= 55) return "높음";
  if (score >= 32) return "보통";
  return "낮음";
}

function buildSummary(character: LoveCharacter) {
  return `${character.profileLine}으로 해석됩니다. 관계에서는 ${character.bestApproach}`;
}

function scoreCharacter(character: LoveCharacter, sajuProfile: ExtractedSajuProfile): ScoredMatch {
  const profile = getProfile(character);
  let score = 0;
  const reasons: string[] = [];

  if (sajuProfile.dayMaster && (character.dayMaster === sajuProfile.dayMaster || profile.primaryDayMasters?.includes(sajuProfile.dayMaster))) {
    score += 30;
    reasons.push(`${sajuProfile.dayMaster} 일간의 결이 ${character.name}형 관계 패턴과 닮아 있습니다.`);
  }

  if (sajuProfile.strongElements.includes(character.element) || profile.elementBias?.some((element) => sajuProfile.strongElements.includes(element as MatchElement))) {
    score += 20;
    reasons.push(`${CODE_TO_KOREAN_ELEMENT[character.element]}의 기운이 관계 표현 방식과 자연스럽게 맞닿습니다.`);
  } else if (hasGeneratingRelation(sajuProfile.dayElement, character.element)) {
    score += 10;
    reasons.push("오행의 흐름이 서로를 돕는 상생의 방향으로 이어집니다.");
  }

  if (sajuProfile.yinYang && (profile.yinYang === sajuProfile.yinYang || profile.yinYang === "balanced" || character.yinYang === sajuProfile.yinYang)) {
    score += profile.yinYang === "balanced" ? 4 : 8;
    reasons.push(`${sajuProfile.yinYang === "yin" ? "음" : "양"}의 리듬이 캐릭터의 거리감과 비슷합니다.`);
  }

  const matchKeywords = [...(character.matchKeywords ?? []), ...character.keywords, ...(profile.relationshipKeywords ?? [])];
  const keywordMatches = countMatches(sajuProfile.allHints, matchKeywords);
  if (keywordMatches > 0) {
    score += Math.min(keywordMatches, 5) * 3;
    reasons.push("사주 결과의 관계 힌트가 캐릭터 키워드와 일부 겹칩니다.");
  }

  const tenGodMatches = countMatches(sajuProfile.tenGodHints, profile.tenGodHints ?? []);
  if (tenGodMatches > 0) {
    score += tenGodMatches * 5;
    reasons.push("십성 성향에서 가까운 관계 반응이 보입니다.");
  }

  const charmMatches = countMatches(sajuProfile.charmHints, profile.charmHints ?? []);
  if (charmMatches > 0) {
    score += charmMatches * 5;
    reasons.push("매력 신살의 분위기가 캐릭터의 끌림 방식과 닮았습니다.");
  }

  const relationshipMatches = countMatches(sajuProfile.relationshipHints, profile.relationshipKeywords ?? []);
  if (relationshipMatches > 0) {
    score += relationshipMatches * 5;
    reasons.push("관계 성향 요약에서 비슷한 흐름이 잡힙니다.");
  }

  const fallbackReasons = [
    `${character.name}형은 ${character.archetype}의 결을 가진 페르소나입니다.`,
    "시뮬레이션을 위한 성향 매칭으로, 실제 상대를 단정하지 않습니다.",
  ];

  return {
    characterId: character.id,
    characterName: character.name,
    confidenceLabel: confidenceLabel(score),
    matchLabel: `${character.name}형 성향과 가까워요`,
    reasonBullets: Array.from(new Set([...reasons, ...fallbackReasons])).slice(0, 3),
    score,
    summary: buildSummary(character),
  };
}

export function matchLoveCharactersFromSaju(
  sajuResult: unknown,
  characters: LoveCharacter[],
  targetGender?: LoveCharacter["gender"],
): LoveCharacterMatchResult[] {
  const sajuProfile = extractSajuProfile(sajuResult);
  if (!sajuProfile.dayMaster && !sajuProfile.dayElement && sajuProfile.strongElements.length === 0) return [];
  const candidateCharacters = targetGender ? characters.filter((character) => character.gender === targetGender) : characters;
  if (candidateCharacters.length === 0) return [];

  return candidateCharacters
    .map((character) => scoreCharacter(character, sajuProfile))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, ...result }) => result);
}
