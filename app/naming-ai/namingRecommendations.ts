// 무료 초안 추천 로직 — index.html #namingPromptModal 스크립트의
// STYLE_PRESETS / ELEMENT_TONE_POOLS / rankStylePresets / generateDraftNames /
// generateMoodDrafts / scorePreset / splitHangulSyllables / uniqueList 를
// 로직 그대로 TypeScript로 포팅한 것입니다(결제와 무관한 참고용 기능).

export type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";

export type StylePreset = {
  id: string;
  label: string;
  keywords: string[];
  elements: ElementKey[];
  syllables: string[];
  moods: string[];
  genderLean?: "M" | "F";
};

export type DesiredNameDraft = { hangul: string };

export type NamingRecommendationInput = {
  familyName: string;
  nameLength: number;
  desiredType: string;
  preferenceTone: string;
  currentName: string;
  desiredSyllables: string[];
  requiredSyllables: string[];
  blockedSyllables: string[];
  desiredNames: DesiredNameDraft[];
  birthDate?: string;
  gender?: string;
};

/** 서버가 요구하는 main-shell-saju-engine 스키마 전체가 아니라, 초안 추천에 필요한 오행 힌트만 담은 최소 타입 */
export type NamingSajuHints = {
  yongshin?: ElementKey[];
  eokbuYongshin?: ElementKey[];
  johuYongshin?: ElementKey[];
  lacking?: ElementKey[];
};

export type DraftNameCandidate = { name: string; fullName: string; note: string };

export type RecommendationBundle = {
  candidates: DraftNameCandidate[];
  moods: string[];
  status: string;
};

export const ELEMENT_FULL_LABELS: Record<ElementKey, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

export const ELEMENT_TONE_POOLS: Record<ElementKey, { syllables: string[]; moods: string[] }> = {
  wood: { syllables: ["서", "하", "채", "린", "아", "온", "가", "주"], moods: ["맑은 숲빛", "산뜻한 결", "청명한 이미지"] },
  fire: { syllables: ["라", "나", "희", "채", "유", "빛", "도", "하"], moods: ["화사한 빛", "따뜻한 온기", "환한 에너지"] },
  earth: { syllables: ["온", "담", "연", "우", "현", "서", "주", "원"], moods: ["단단한 안정감", "포근한 무드", "중심 잡힌 분위기"] },
  metal: { syllables: ["시", "수", "진", "선", "재", "솔", "윤", "은"], moods: ["세련된 결", "정제된 맑음", "차분한 선명함"] },
  water: { syllables: ["유", "연", "수", "하", "윤", "린", "해", "아"], moods: ["달빛 같은 고요함", "물결 같은 부드러움", "깊고 맑은 이미지"] },
};

export const STYLE_PRESETS: StylePreset[] = [
  { id: "clean", label: "맑고 단정한 결", keywords: ["맑", "단정", "지적", "청아", "정갈"], elements: ["water", "metal", "wood"], syllables: ["서", "윤", "하", "린", "아", "온", "선", "채"], moods: ["새벽빛", "유리결", "차분한 도시감"] },
  { id: "warm", label: "따뜻하고 다정한 결", keywords: ["따뜻", "다정", "부드", "온화", "포근"], elements: ["earth", "fire", "wood"], syllables: ["나", "온", "아", "연", "하", "윤", "주", "담"], moods: ["햇살", "포근한 결", "살가운 분위기"] },
  { id: "bright", label: "밝고 화사한 결", keywords: ["밝", "화사", "환한", "활기", "반짝"], elements: ["fire", "wood"], syllables: ["라", "채", "희", "유", "하", "나", "도", "율"], moods: ["별빛", "꽃잎", "환한 온기"], genderLean: "F" },
  { id: "deep", label: "고요하고 깊은 결", keywords: ["고요", "깊", "차분", "신비", "은은"], elements: ["water", "earth", "metal"], syllables: ["유", "연", "수", "온", "현", "다", "은", "해"], moods: ["달빛", "안개", "깊은 물결"] },
  { id: "modern", label: "세련되고 현대적인 결", keywords: ["현대", "세련", "중성", "도시", "미니멀"], elements: ["metal", "water", "earth"], syllables: ["시", "준", "린", "우", "도", "이", "재", "솔"], moods: ["미니멀 무드", "도시 야경", "유광 실버"] },
];

export function cleanString(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

export function uniqueList<T>(values: T[]): T[] {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = cleanString(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function splitHangulSyllables(value: unknown): string[] {
  return Array.from(cleanString(value)).filter((char) => /^[가-힣]$/.test(char));
}

function extractElementKeys(hints: NamingSajuHints | null | undefined): ElementKey[] {
  if (!hints) return [];
  const keys: ElementKey[] = [
    ...(hints.yongshin || []),
    ...(hints.eokbuYongshin || []),
    ...(hints.johuYongshin || []),
  ];
  if (!keys.length && hints.lacking?.length) keys.push(...hints.lacking);
  return uniqueList(keys).slice(0, 2);
}

function scorePreset(preset: StylePreset, queryText: string, elementKeys: ElementKey[], gender: string): number {
  let score = 0;
  preset.keywords.forEach((keyword) => {
    if (queryText.indexOf(keyword) >= 0) score += 4;
  });
  preset.elements.forEach((element) => {
    if (elementKeys.indexOf(element) >= 0) score += 3;
  });
  if (!queryText && preset.id === "clean") score += 1;
  // 성별과 반대로 치우친 프리셋은 완전히 배제하지 않고 후순위로만 민다 —
  // 사주 보완/사용자 키워드 매칭이 충분히 강하면 여전히 추천될 수 있다.
  if (preset.genderLean && gender && preset.genderLean !== gender) score -= 2;
  return score;
}

function rankStylePresets(input: NamingRecommendationInput, elementKeys: ElementKey[]): StylePreset[] {
  const query = [input.desiredType, input.preferenceTone, input.currentName].map(cleanString).join(" ");
  const gender = cleanString(input.gender).toUpperCase();
  return STYLE_PRESETS
    .map((preset) => ({ preset, score: scorePreset(preset, query, elementKeys, gender) }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.preset)
    .slice(0, 3);
}

function buildCandidateNote(preset: StylePreset | undefined, elementKeys: ElementKey[]): string {
  const parts: string[] = [];
  if (elementKeys.length) parts.push(`${elementKeys.map((key) => ELEMENT_FULL_LABELS[key] || key).join("·")} 보완`);
  if (preset?.label) parts.push(preset.label);
  return parts.join(" · ") || "입력 조건 기준 초안";
}

function generateDraftNames(input: NamingRecommendationInput, presets: StylePreset[], elementKeys: ElementKey[]): DraftNameCandidate[] {
  const length = Math.max(1, Math.min(4, Number(input.nameLength) || 2));
  const blocked = uniqueList(input.blockedSyllables.reduce<string[]>((acc, item) => acc.concat(splitHangulSyllables(item)), []));
  const required = uniqueList(input.requiredSyllables.reduce<string[]>((acc, item) => acc.concat(splitHangulSyllables(item)), []))
    .filter((item) => blocked.indexOf(item) < 0);
  const preferred = uniqueList(input.desiredSyllables.reduce<string[]>((acc, item) => acc.concat(splitHangulSyllables(item)), []))
    .filter((item) => blocked.indexOf(item) < 0);
  const currentNameChars = splitHangulSyllables(input.currentName).filter((item) => blocked.indexOf(item) < 0);
  const existingNames = uniqueList(
    input.desiredNames.map((item) => item?.hangul || "").concat(input.currentName || ""),
  );

  let basePool: string[] = [];
  required.concat(preferred).concat(currentNameChars).forEach((item) => basePool.push(item));
  elementKeys.forEach((key) => {
    (ELEMENT_TONE_POOLS[key]?.syllables || []).forEach((item) => basePool.push(item));
  });
  presets.forEach((preset) => {
    (preset.syllables || []).forEach((item) => basePool.push(item));
  });
  basePool = uniqueList(basePool).filter((item) => /^[가-힣]$/.test(item) && blocked.indexOf(item) < 0);

  const results: DraftNameCandidate[] = [];
  if (currentNameChars.length === length && currentNameChars.length) {
    const currentName = currentNameChars.join("");
    results.push({
      name: currentName,
      fullName: (input.familyName || "") + currentName,
      note: "현재 생각 중인 이름을 중심으로 다시 보는 초안",
    });
  }

  presets.forEach((preset) => {
    const localPool = uniqueList((preset.syllables || []).concat(basePool));
    for (let offset = 0; offset < localPool.length && results.length < 5; offset += 1) {
      const chars: string[] = [];
      required.forEach((item) => {
        if (chars.length < length && chars.indexOf(item) < 0) chars.push(item);
      });
      for (let idx = 0; idx < localPool.length && chars.length < length; idx += 1) {
        const syllable = localPool[(offset + idx) % localPool.length];
        if (!syllable || chars.indexOf(syllable) >= 0 || blocked.indexOf(syllable) >= 0) continue;
        chars.push(syllable);
      }
      if (chars.length !== length) continue;
      const candidate = chars.join("");
      if (existingNames.indexOf(candidate) >= 0 || results.some((row) => row.name === candidate)) continue;
      results.push({
        name: candidate,
        fullName: (input.familyName || "") + candidate,
        note: buildCandidateNote(preset, elementKeys),
      });
    }
  });

  return results.slice(0, 5);
}

function generateMoodDrafts(input: NamingRecommendationInput, presets: StylePreset[], elementKeys: ElementKey[]): string[] {
  const moods: string[] = [];
  if (input.desiredType) moods.push(input.desiredType);
  elementKeys.forEach((key) => {
    (ELEMENT_TONE_POOLS[key]?.moods || []).forEach((item) => moods.push(item));
  });
  presets.forEach((preset) => {
    moods.push(preset.label);
    (preset.moods || []).forEach((item) => moods.push(item));
  });
  return uniqueList(moods).slice(0, 5);
}

export function buildRecommendationBundle(input: NamingRecommendationInput, sajuHints: NamingSajuHints | null): RecommendationBundle {
  const elementKeys = extractElementKeys(sajuHints);
  const presets = rankStylePresets(input, elementKeys);
  const candidates = generateDraftNames(input, presets, elementKeys);
  const moods = generateMoodDrafts(input, presets, elementKeys);
  const statusParts: string[] = [];
  if (elementKeys.length) {
    statusParts.push(`사주 보완 축 ${elementKeys.map((key) => ELEMENT_FULL_LABELS[key] || key).join(" · ")}을 반영해 초안을 골랐습니다.`);
  } else {
    statusParts.push("성씨와 원하는 분위기를 기준으로 먼저 초안을 골랐습니다.");
  }
  if (!input.birthDate || !input.gender) {
    statusParts.push("생년월일과 성별이 들어오면 오행 축을 더 정교하게 맞춥니다.");
  }
  statusParts.push("초안 추천은 참고용이며 최종 판단은 프리미엄 프롬프트가 다시 정리합니다.");
  return { candidates, moods, status: statusParts.join(" ") };
}
