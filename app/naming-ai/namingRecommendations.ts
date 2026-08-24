// 무료 초안 추천 로직 — index.html #namingPromptModal 스크립트의
// STYLE_PRESETS / ELEMENT_TONE_POOLS / rankStylePresets / generateDraftNames /
// generateMoodDrafts / scorePreset / splitHangulSyllables / uniqueList 를
// 로직 그대로 TypeScript로 포팅한 것입니다(결제와 무관한 참고용 기능).
//
// 사주 힌트(용신)가 들어오면 오행 축과 소리오행 흐름까지 반영해 후보를 다시 줄세운다.
// 힌트는 유료 프롬프트와 같은 모듈(worker/lib/saju-yongshin-policy.js)에서 나오므로
// "무료 초안에선 金이라더니 결과는 水" 같은 어긋남이 생기지 않는다.

import { analyzeSoundFlow, soundElementOf } from "@/worker/lib/naming-sound-elements.js";
import { getNamingDraftCopy, type NamingDraftCopy } from "./namingDraftCopy";
import {
  getNamePool,
  resolveNamePoolBucket,
  type LocaleNameEntry,
  type NamePoolBucket,
  type NamePoolSpec,
} from "./namingNamePools";

export type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";

export type GenderLean = "M" | "F";

export type SyllablePool = {
  /** 남녀 공용 기본 음절. 성별 미입력이면 이것만 쓴다. */
  syllables: string[];
  /** 남아 이름에서 자주 쓰는 음절. 성별이 M이면 기본 음절보다 앞에 온다. */
  syllablesM?: string[];
  /** 여아 이름에서 자주 쓰는 음절. 성별이 F이면 기본 음절보다 앞에 온다. */
  syllablesF?: string[];
};

export type StylePreset = SyllablePool & {
  id: string;
  label: string;
  keywords: string[];
  elements: ElementKey[];
  moods: string[];
  genderLean?: GenderLean;
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

/**
 * 초안 추천에 필요한 오행 힌트만 담은 최소 타입.
 * worker/lib/saju-yongshin-policy.js 의 resolveNamingYongshin() 결과를 그대로 받을 수 있게 맞춰 뒀다.
 */
export type NamingSajuHints = {
  yongshin?: ElementKey[];
  eokbuYongshin?: ElementKey[];
  johuYongshin?: ElementKey[];
  finalYongshin?: ElementKey[];
  lacking?: ElementKey[];
  /** 이름에 담을 오행(용신 우선 + 부족 오행). 소리오행 가점의 기준. */
  nameElements?: ElementKey[];
  /** 이름에서 피할 오행(기신 + 과다 오행). 소리오행 감점의 기준. */
  avoidElements?: ElementKey[];
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

export const ELEMENT_TONE_POOLS: Record<ElementKey, SyllablePool & { moods: string[] }> = {
  wood: {
    syllables: ["서", "하", "채", "린", "아", "온", "가", "주"],
    syllablesM: ["건", "우", "진", "규", "준", "서", "원", "주"],
    syllablesF: ["서", "아", "린", "채", "온", "가", "예", "하"],
    moods: ["맑은 숲빛", "산뜻한 결", "청명한 이미지"],
  },
  fire: {
    syllables: ["라", "나", "희", "채", "유", "빛", "도", "하"],
    syllablesM: ["도", "현", "찬", "우", "준", "명", "해", "빛"],
    syllablesF: ["채", "희", "라", "나", "하", "유", "빛", "담"],
    moods: ["화사한 빛", "따뜻한 온기", "환한 에너지"],
  },
  earth: {
    syllables: ["온", "담", "연", "우", "현", "서", "주", "원"],
    syllablesM: ["온", "우", "진", "현", "호", "건", "담", "원"],
    syllablesF: ["연", "서", "아", "온", "유", "주", "원", "담"],
    moods: ["단단한 안정감", "포근한 무드", "중심 잡힌 분위기"],
  },
  metal: {
    syllables: ["시", "수", "진", "선", "재", "솔", "윤", "은"],
    syllablesM: ["진", "우", "재", "수", "선", "준", "강", "석"],
    syllablesF: ["시", "은", "솔", "선", "윤", "수", "지", "세"],
    moods: ["세련된 결", "정제된 맑음", "차분한 선명함"],
  },
  water: {
    syllables: ["유", "연", "수", "하", "윤", "린", "해", "아"],
    syllablesM: ["수", "호", "해", "준", "우", "진", "현", "하"],
    syllablesF: ["유", "연", "수", "하", "윤", "린", "아", "설"],
    moods: ["달빛 같은 고요함", "물결 같은 부드러움", "깊고 맑은 이미지"],
  },
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "clean",
    label: "맑고 단정한 결",
    keywords: ["맑", "단정", "지적", "청아", "정갈"],
    elements: ["water", "metal", "wood"],
    // 성별 목록은 "앞에서부터 두 글자씩 이어 읽어도 실제로 쓰는 이름"이 되도록 순서를 잡았다
    // (준서·서현·현우… / 서윤·윤하·하은…). 후보 생성이 이 순서를 회전시키며 조합하기 때문에
    // 순서를 흩뜨리면 곧바로 어색한 이름이 나온다.
    syllables: ["서", "윤", "하", "린", "아", "온", "선", "채"],
    syllablesM: ["준", "서", "현", "우", "진", "성", "민", "재"],
    syllablesF: ["서", "윤", "하", "은", "지", "아", "린", "채"],
    moods: ["새벽빛", "유리결", "차분한 도시감"],
  },
  {
    id: "warm",
    label: "따뜻하고 다정한 결",
    keywords: ["따뜻", "다정", "부드", "온화", "포근"],
    elements: ["earth", "fire", "wood"],
    syllables: ["나", "온", "아", "연", "하", "윤", "주", "담"],
    syllablesM: ["시", "우", "진", "호", "연", "준", "성", "윤"],
    syllablesF: ["다", "은", "지", "아", "연", "서", "윤", "하"],
    moods: ["햇살", "포근한 결", "살가운 분위기"],
  },
  {
    id: "bright",
    label: "밝고 화사한 결",
    keywords: ["밝", "화사", "환한", "활기", "반짝"],
    elements: ["fire", "wood"],
    syllables: ["라", "채", "희", "유", "하", "나", "도", "율"],
    syllablesM: ["도", "현", "우", "빈", "하", "준", "서", "진"],
    syllablesF: ["채", "원", "서", "아", "린", "하", "유", "나"],
    moods: ["별빛", "꽃잎", "환한 온기"],
    genderLean: "F",
  },
  {
    id: "deep",
    label: "고요하고 깊은 결",
    keywords: ["고요", "깊", "차분", "신비", "은은"],
    elements: ["water", "earth", "metal"],
    syllables: ["유", "연", "수", "온", "현", "다", "은", "해"],
    syllablesM: ["재", "현", "수", "호", "진", "우", "성", "훈"],
    syllablesF: ["다", "연", "수", "지", "은", "소", "현", "유"],
    moods: ["달빛", "안개", "깊은 물결"],
    genderLean: "M",
  },
  {
    id: "modern",
    label: "세련되고 현대적인 결",
    keywords: ["현대", "세련", "중성", "도시", "미니멀"],
    elements: ["metal", "water", "earth"],
    syllables: ["시", "준", "린", "우", "도", "이", "재", "솔"],
    syllablesM: ["시", "우", "진", "서", "준", "도", "윤", "재"],
    syllablesF: ["서", "아", "린", "지", "우", "시", "은", "솔"],
    moods: ["미니멀 무드", "도시 야경", "유광 실버"],
    genderLean: "M",
  },
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

/** 폼은 "M" | "F" | "OTHER" | "" 만 보낸다 — 남녀 둘 중 하나로 확정되지 않으면 중성 풀을 쓴다. */
function normalizeGender(value: unknown): GenderLean | "" {
  const raw = cleanString(value).toUpperCase();
  if (raw === "M" || raw === "MALE") return "M";
  if (raw === "F" || raw === "FEMALE") return "F";
  return "";
}

/** 성별이 확정되면 그 성별 음절이 앞, 공용 음절이 뒤. 미확정이면 공용 음절만 쓴다. */
function pickGenderedSyllables(pool: SyllablePool | undefined, gender: GenderLean | ""): string[] {
  if (!pool) return [];
  const leaning = gender === "M" ? pool.syllablesM : gender === "F" ? pool.syllablesF : [];
  return uniqueList((leaning || []).concat(pool.syllables || []));
}

function extractElementKeys(hints: NamingSajuHints | null | undefined): ElementKey[] {
  if (!hints) return [];
  const keys: ElementKey[] = [
    ...(hints.finalYongshin || []),
    ...(hints.yongshin || []),
    ...(hints.eokbuYongshin || []),
    ...(hints.johuYongshin || []),
  ];
  if (!keys.length && hints.lacking?.length) keys.push(...hints.lacking);
  return uniqueList(keys).slice(0, 2);
}

function scorePreset(preset: StylePreset, queryText: string, elementKeys: ElementKey[], gender: GenderLean | ""): number {
  let score = 0;
  preset.keywords.forEach((keyword) => {
    if (queryText.indexOf(keyword) >= 0) score += 4;
  });
  preset.elements.forEach((element) => {
    if (elementKeys.indexOf(element) >= 0) score += 3;
  });
  if (!queryText && preset.id === "clean") score += 1;
  // 성별이 확정되면 그쪽으로 기운 프리셋을 끌어올리고 반대쪽을 내린다. 사용자 키워드 매칭(4점)이
  // 충분히 강하면 여전히 뒤집을 수 있어 완전 배제는 아니다.
  if (preset.genderLean && gender) {
    score += preset.genderLean === gender ? 3 : -3;
  }
  return score;
}

function rankStylePresets(input: NamingRecommendationInput, elementKeys: ElementKey[], gender: GenderLean | ""): StylePreset[] {
  const query = [input.desiredType, input.preferenceTone, input.currentName].map(cleanString).join(" ");
  return STYLE_PRESETS
    .map((preset) => ({ preset, score: scorePreset(preset, query, elementKeys, gender) }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.preset)
    .slice(0, 3);
}

const ELEMENT_SHORT_LABELS: Record<ElementKey, string> = {
  wood: "목", fire: "화", earth: "토", metal: "금", water: "수",
};

/**
 * 소리오행 기준 "그 오행의 초성을 실제로 가진" 이름 음절.
 *
 * 🔴 ELEMENT_TONE_POOLS 와 혼동하지 말 것 — 그쪽은 분위기(느낌) 기반 목록이라 초성 오행과 무관하다
 * (예: wood 목록의 "서"는 초성 ㅅ = 金). 용신을 실제로 이름에 담으려면 초성이 그 오행이어야 하므로
 * 별도 표를 둔다. 木 ㄱㅋ / 火 ㄴㄷㄹㅌ / 土 ㅇㅎ / 金 ㅅㅈㅊ / 水 ㅁㅂㅍ (작명 실무설 정본).
 */
const SOUND_ELEMENT_SYLLABLES: Record<ElementKey, { M: string[]; F: string[] }> = {
  wood: { M: ["건", "규", "강"], F: ["가", "경", "기"] },
  fire: { M: ["도", "태", "담"], F: ["다", "라", "린", "나"] },
  earth: { M: ["현", "우", "호", "원"], F: ["아", "연", "윤", "은", "하"] },
  metal: { M: ["준", "진", "서", "재", "찬"], F: ["서", "지", "채", "수", "선"] },
  water: { M: ["민", "빈", "범"], F: ["민", "미", "별", "보"] },
};

/** 성별이 확정되지 않으면 남녀 목록을 합쳐 쓴다. */
function pickSoundElementSyllables(element: ElementKey, gender: GenderLean | ""): string[] {
  const table = SOUND_ELEMENT_SYLLABLES[element];
  if (!table) return [];
  if (gender === "M") return table.M;
  if (gender === "F") return table.F;
  return uniqueList(table.M.concat(table.F));
}

/** 성씨부터 이어지는 초성 오행 흐름을 짧게 적는다(예: "소리 토→금→토 상생"). */
function soundFlowNote(familyName: string, name: string): string {
  const flow = analyzeSoundFlow(`${familyName || ""}${name}`);
  if (!flow.elements.length || !flow.elements.every(Boolean) || flow.elements.length < 2) return "";
  const chain = flow.elements.map((key) => ELEMENT_SHORT_LABELS[key as ElementKey] || key).join("→");
  return `소리 ${chain} ${flow.harmonious ? "상생" : `상극 ${flow.clashCount}`}`;
}

/**
 * 소리오행 점수. 사주 힌트가 있을 때만 후보 줄세우기에 쓴다.
 * - 성씨부터 이름 끝까지 상극이 없으면 가점, 상극이 있으면 그만큼 감점
 * - 이름 글자의 초성 오행이 용신(nameElements)이면 가점, 기신(avoidElements)이면 감점
 */
function scoreCandidateSound(
  familyName: string,
  name: string,
  nameElements: ElementKey[],
  avoidElements: ElementKey[],
): number {
  const flow = analyzeSoundFlow(`${familyName || ""}${name}`);
  let score = flow.harmonious ? 4 : -2 * flow.clashCount;
  Array.from(name).forEach((syllable) => {
    const element = soundElementOf(syllable) as ElementKey | "";
    if (!element) return;
    if (nameElements.indexOf(element) >= 0) score += 3;
    if (avoidElements.indexOf(element) >= 0) score -= 3;
  });
  return score;
}

function buildCandidateNote(
  preset: StylePreset | undefined,
  elementKeys: ElementKey[],
  gender: GenderLean | "",
  soundNote: string,
): string {
  const parts: string[] = [];
  if (gender) parts.push(gender === "M" ? "남아" : "여아");
  if (elementKeys.length) parts.push(`${elementKeys.map((key) => ELEMENT_FULL_LABELS[key] || key).join("·")} 보완`);
  if (soundNote) parts.push(soundNote);
  if (preset?.label) parts.push(preset.label);
  return parts.join(" · ") || "입력 조건 기준 초안";
}

type DraftResult = { candidates: DraftNameCandidate[]; notices: string[] };

/** 줄세우기 전에 모아 둘 후보 수. 5개만 만들면 소리오행으로 고를 여지가 없다. */
const RAW_CANDIDATE_LIMIT = 30;
const FINAL_CANDIDATE_LIMIT = 5;

function generateDraftNames(
  input: NamingRecommendationInput,
  presets: StylePreset[],
  elementKeys: ElementKey[],
  gender: GenderLean | "",
  hints: NamingSajuHints | null,
): DraftResult {
  const length = Math.max(1, Math.min(4, Number(input.nameLength) || 2));
  const notices: string[] = [];
  const blocked = uniqueList(input.blockedSyllables.reduce<string[]>((acc, item) => acc.concat(splitHangulSyllables(item)), []));
  const isUsable = (syllable: string) => /^[가-힣]$/.test(syllable) && blocked.indexOf(syllable) < 0;

  const requiredChars = uniqueList(
    input.requiredSyllables.reduce<string[]>((acc, item) => acc.concat(splitHangulSyllables(item)), []),
  ).filter(isUsable);
  const preferredChars = uniqueList(
    input.desiredSyllables.reduce<string[]>((acc, item) => acc.concat(splitHangulSyllables(item)), []),
  ).filter(isUsable);
  const currentNameChars = splitHangulSyllables(input.currentName).filter(isUsable);
  const existingNames = uniqueList(
    input.desiredNames.map((item) => item?.hangul || "").concat(input.currentName || ""),
  );

  // 사용자가 직접 적어 준 이름은 항상 맨 위에 고정한다(줄세우기 대상이 아니다).
  const pinned: DraftNameCandidate[] = [];
  const generated: DraftNameCandidate[] = [];
  const takenNames = new Set<string>();
  const familyName = input.familyName || "";
  const addCandidate = (bucket: DraftNameCandidate[], name: string, note: string) => {
    if (!name || takenNames.has(name)) return;
    takenNames.add(name);
    bucket.push({ name, fullName: familyName + name, note });
  };
  const pushCandidate = (name: string, note: string) => {
    if (pinned.length >= FINAL_CANDIDATE_LIMIT) return;
    addCandidate(pinned, name, note);
  };

  // 1) "반드시 넣고 싶은 글자"에 이름을 통째로 적은 경우 — 그대로 첫 후보로 둔다.
  //    예전에는 이 글자들을 무조건 후보 맨 앞에 프리픽스해서 "병호" + "서윤" = "병호서윤"이 나왔다.
  const writtenNames = uniqueList(
    input.requiredSyllables.map((token) => splitHangulSyllables(token).join("")),
  ).filter((name) => name.length > 1 && Array.from(name).every(isUsable));
  const pinnedNames = writtenNames.filter((name) => name.length === length);
  pinnedNames.forEach((name) => pushCandidate(name, "직접 적어 주신 이름 그대로"));
  if (pinnedNames.length) {
    notices.push("직접 적어 주신 이름을 그대로 첫 후보로 두고, 그 글자를 살린 변형을 이어서 골랐습니다.");
  }
  // 글자 수만 맞추면 원문 그대로 쓸 수 있는 경우에만 안내한다. 필수 글자가 이름 길이를 넘어서는
  // 경우는 아래에서 "앞의 N자만 반영" 안내가 따로 나가므로 여기서 겹쳐 말하지 않는다.
  if (requiredChars.length <= length) {
    writtenNames
      .filter((name) => name.length !== length)
      .forEach((name) => {
        notices.push(`‘${name}’을(를) 그대로 쓰시려면 이름 글자 수를 ${name.length}자로 맞춰 주세요. 지금은 ${length}자 이름 안에 그 글자를 넣어 조합했습니다.`);
      });
  }

  // 2) 현재 생각 중인 이름은 글자 수가 맞으면 그대로 다시 보여준다(기존 동작 유지).
  if (currentNameChars.length === length) {
    pushCandidate(currentNameChars.join(""), "현재 생각 중인 이름을 중심으로 다시 보는 초안");
  }

  let requiredForFill = requiredChars;
  if (requiredChars.length > length) {
    requiredForFill = requiredChars.slice(0, length);
    notices.push(`반드시 넣고 싶은 글자가 이름 글자 수(${length}자)보다 많아 앞의 ${length}자만 반영했습니다.`);
  }
  const slots = Math.max(0, length - requiredForFill.length);
  if (slots === 0 && requiredForFill.length) {
    notices.push("필수 글자가 이름을 꽉 채워 조합이 하나뿐입니다. 다른 안도 보시려면 일부 글자를 ‘사용하고 싶은 음절’로 옮겨 주세요.");
  }

  // 사용자가 적은 음절이 프리셋 음절보다 앞에 오도록 조립한다 — 예전에는 프리셋 음절이 항상 앞이라
  // "사용하고 싶은 음절"이 상위 5개 후보에 거의 등장하지 못했다.
  // 현재 생각 중인 이름의 글자는 넣지 않는다(무관한 후보에 그 글자가 섞여 나오던 오염 제거).
  let basePool: string[] = [];
  preferredChars.forEach((item) => basePool.push(item));
  requiredForFill.forEach((item) => basePool.push(item));
  elementKeys.forEach((key) => {
    pickGenderedSyllables(ELEMENT_TONE_POOLS[key], gender).forEach((item) => basePool.push(item));
  });
  presets.forEach((preset) => {
    pickGenderedSyllables(preset, gender).forEach((item) => basePool.push(item));
  });
  basePool = uniqueList(basePool).filter(isUsable);

  // 후보 생성 — 한 출처(음절 목록)씩 따로 돈다. 각 목록은 앞에서부터 두 글자씩 이어 읽어도 실제
  // 이름이 되도록 정렬돼 있어서 인접한 글자만 뽑으면 어색한 짝이 잘 나오지 않는다. 반대로 여러
  // 목록을 하나의 큰 풀로 합치면 목록이 맞닿는 경계에서 이름이 아닌 조합(석시·솔서 따위)이 생긴다.
  const emitFrom = (
    preset: StylePreset | undefined,
    pool: string[],
    anchor: string,
    maxCount = RAW_CANDIDATE_LIMIT,
    startOffset = 0,
  ) => {
    const anchors = anchor && requiredForFill.indexOf(anchor) < 0
      ? requiredForFill.concat(anchor)
      : requiredForFill;
    if (anchors.length > length) return;
    const localSlots = length - anchors.length;
    const localPool = uniqueList(preferredChars.concat(pool)).filter(isUsable);
    const stopAt = Math.min(RAW_CANDIDATE_LIMIT, generated.length + maxCount);
    for (let step = 0; step < Math.max(1, localPool.length) && generated.length < stopAt; step += 1) {
      const offset = localPool.length ? (startOffset + step) % localPool.length : 0;
      const filler: string[] = [];
      for (let idx = 0; idx < localPool.length && filler.length < localSlots; idx += 1) {
        const syllable = localPool[(offset + idx) % localPool.length];
        if (!syllable || filler.indexOf(syllable) >= 0 || anchors.indexOf(syllable) >= 0) continue;
        filler.push(syllable);
      }
      if (filler.length !== localSlots) continue;
      // 고정 글자 묶음을 앞·중간·뒤로 옮겨 가며 배치한다. 항상 맨 앞에 두면 사용자가 적은 이름에
      // 추천 음절이 그대로 이어 붙은 모양이 된다.
      for (let placement = 0; placement <= localSlots && generated.length < RAW_CANDIDATE_LIMIT; placement += 1) {
        const chars = filler.slice(0, placement).concat(anchors, filler.slice(placement));
        if (chars.length !== length) continue;
        const candidate = chars.join("");
        if (existingNames.indexOf(candidate) >= 0) continue;
        addCandidate(generated, candidate, buildCandidateNote(preset, elementKeys, gender, soundFlowNote(familyName, candidate)));
      }
    }
  };

  // 용신 오행을 이름에 담으려면 그 오행의 초성을 가진 글자가 한 자 들어가야 한다. 같은 오행 글자를
  // 두 자 붙이면(건규·솔선) 이름이 되지 않으므로, 용신 글자는 한 자만 고정하고 나머지 칸은 자연스러운
  // 스타일 음절에서 채운다. 그래야 "용신 보완 + 부르기 좋은 이름"이 동시에 성립한다.
  // 앵커 하나당 상한을 둔다 — 안 두면 "김민재·김민수·김민진·김민성"처럼 같은 글자로 시작하는
  // 후보가 목록을 독식한다.
  if (slots >= 1) {
    let anchorIndex = 0;
    elementKeys.forEach((key) => {
      pickSoundElementSyllables(key, gender).forEach((anchor) => {
        if (!isUsable(anchor)) return;
        // 앵커마다 채움 음절을 한 칸씩 돌린다 — 안 돌리면 앞글자만 바뀌고 뒷글자가 전부 같아진다.
        emitFrom(presets[0], pickGenderedSyllables(presets[0], gender), anchor, 2, anchorIndex);
        anchorIndex += 1;
      });
    });
  }
  presets.forEach((preset) => emitFrom(preset, pickGenderedSyllables(preset, gender), ""));
  // 마지막 폴백 — 피하고 싶은 글자가 많아 위 목록이 다 걸러졌을 때만 실질적으로 쓰인다.
  emitFrom(presets[0], basePool, "");

  // 사주 힌트가 있으면 소리오행 흐름과 용신 적합도로 다시 줄세운다. 힌트가 없으면 기존처럼
  // 생성 순서를 그대로 쓴다(계산 근거가 없는데 임의로 순서를 바꾸지 않는다).
  const nameElements = uniqueList((hints?.nameElements || []).concat(elementKeys));
  const avoidElements = uniqueList(hints?.avoidElements || []);
  let ranked = generated;
  if (nameElements.length || avoidElements.length) {
    ranked = generated
      .map((candidate, index) => ({
        candidate,
        index,
        score: scoreCandidateSound(familyName, candidate.name, nameElements, avoidElements),
      }))
      .sort((a, b) => (b.score - a.score) || (a.index - b.index))
      .map((row) => row.candidate);
  }

  return {
    candidates: pinned.concat(ranked).slice(0, FINAL_CANDIDATE_LIMIT),
    notices: uniqueList(notices),
  };
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

/* ------------------------------------------------------------------
 * 비-한국어 로케일 경로 — 조합이 아니라 실재 이름 목록에서 고른다.
 *
 * 🔴 위쪽 한국어 경로와 코드를 공유하지 않는다. 그쪽은 한글 음절을 회전시켜 **조합**하고
 *    초성 소리오행으로 줄세우는데, 두 축 모두 한국어 전용이다(초성이 없는 문자에는 적용 자체가
 *    성립하지 않는다). 억지로 공유하면 한국어 경로가 흔들리고, 그 경로는 골든 동작이다.
 * ------------------------------------------------------------------ */

/** 라틴권 이름에는 "음절" 개념이 없다 — 대소문자 무시 부분 문자열로 본다. */
function containsToken(name: string, token: string): boolean {
  return name.toLowerCase().indexOf(token.toLowerCase()) >= 0;
}

function localeCandidateNote(entry: LocaleNameEntry, copy: NamingDraftCopy): string {
  const parts: string[] = [];
  parts.push(entry.gender === "N" ? copy.genderNeutral : entry.gender === "M" ? copy.genderM : copy.genderF);
  parts.push(copy.supplements(copy.elementLabels[entry.element] || entry.element));
  const reading = entry.reading ? copy.reading(entry.reading) : "";
  if (reading) parts.push(reading);
  if (entry.meaning) parts.push(entry.meaning);
  return parts.join(" · ") || copy.noteFallback;
}

function scoreLocaleEntry(
  entry: LocaleNameEntry,
  nameElements: ElementKey[],
  avoidElements: ElementKey[],
  gender: GenderLean | "",
  requiredTokens: string[],
  preferredTokens: string[],
): number {
  let score = 0;
  if (nameElements.indexOf(entry.element) >= 0) score += 4;
  if (avoidElements.indexOf(entry.element) >= 0) score -= 4;
  // 그 문화권에서 실제로 남녀 공용인 이름은 반대 성별 취급을 하지 않는다(중립 가점).
  if (gender) score += entry.gender === gender ? 2 : entry.gender === "N" ? 1 : -3;
  requiredTokens.forEach((token) => {
    if (containsToken(entry.name, token)) score += 5;
  });
  preferredTokens.forEach((token) => {
    if (containsToken(entry.name, token)) score += 2;
  });
  return score;
}

function buildLocaleBundle(
  input: NamingRecommendationInput,
  hints: NamingSajuHints | null,
  elementKeys: ElementKey[],
  gender: GenderLean | "",
  pool: NamePoolSpec,
  copy: NamingDraftCopy,
): RecommendationBundle {
  const familyName = input.familyName || "";
  const notices: string[] = [];
  const length = Math.max(1, Math.min(4, Number(input.nameLength) || 2));

  const blockedTokens = uniqueList(input.blockedSyllables.map(cleanString)).filter(Boolean);
  const requiredTokens = uniqueList(input.requiredSyllables.map(cleanString)).filter(Boolean);
  const preferredTokens = uniqueList(input.desiredSyllables.map(cleanString)).filter(Boolean);
  const currentName = cleanString(input.currentName);
  const existingNames = uniqueList(
    input.desiredNames.map((item) => cleanString(item?.hangul)).concat(currentName),
  );
  const isBlocked = (name: string) => blockedTokens.some((token) => containsToken(name, token));

  let entries = pool.entries.filter((entry) => !isBlocked(entry.name) && existingNames.indexOf(entry.name) < 0);
  if (pool.honorsNameLength) {
    const sized = entries.filter((entry) => Array.from(entry.name).length === length);
    // 요청한 글자 수의 후보가 하나도 없으면 조건을 풀되, 푼 사실을 말한다(조용히 무시하지 않는다).
    if (sized.length) entries = sized;
    else notices.push(copy.statusLengthRelaxed(length));
  } else {
    notices.push(copy.statusLengthNotApplicable);
  }

  const nameElements = uniqueList((hints?.nameElements || []).concat(elementKeys));
  const avoidElements = uniqueList(hints?.avoidElements || []);

  const taken = new Set<string>();
  const pinned: DraftNameCandidate[] = [];
  const generated: DraftNameCandidate[] = [];
  const addCandidate = (bucket: DraftNameCandidate[], name: string, note: string) => {
    if (!name || taken.has(name) || pinned.length + generated.length >= FINAL_CANDIDATE_LIMIT) return;
    taken.add(name);
    bucket.push({ name, fullName: pool.joinFullName(familyName, name), note });
  };

  // 사용자가 이름을 통째로 적어 준 경우 — 그대로 첫 후보로 둔다(한국어 경로와 같은 규칙).
  // 라틴권은 글자 수 조건이 없으므로 길이로 거르지 않는다.
  const writtenNames = requiredTokens.filter((token) => Array.from(token).length > 1 && !isBlocked(token));
  const pinnedNames = pool.honorsNameLength
    ? writtenNames.filter((name) => Array.from(name).length === length)
    : writtenNames;
  pinnedNames.forEach((name) => addCandidate(pinned, name, copy.pinnedNote));
  if (pinnedNames.length) notices.push(copy.statusPinnedNotice);
  if (currentName && !isBlocked(currentName) && (!pool.honorsNameLength || Array.from(currentName).length === length)) {
    addCandidate(pinned, currentName, copy.currentNameNote);
  }

  entries
    .map((entry, index) => ({
      entry,
      index,
      score: scoreLocaleEntry(entry, nameElements, avoidElements, gender, requiredTokens, preferredTokens),
    }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .forEach((row) => addCandidate(generated, row.entry.name, localeCandidateNote(row.entry, copy)));

  const moods: string[] = [];
  if (input.desiredType) moods.push(cleanString(input.desiredType));
  elementKeys.forEach((key) => (copy.moodsByElement[key] || []).forEach((item) => moods.push(item)));
  copy.moodsGeneral.forEach((item) => moods.push(item));

  const labelsOf = (keys: ElementKey[]) => keys.map((key) => copy.elementLabels[key] || key).join(" · ");
  const statusParts: string[] = [];
  if (elementKeys.length) {
    statusParts.push(copy.statusWithElements(labelsOf(elementKeys)));
    if (avoidElements.length) statusParts.push(copy.statusAvoid(labelsOf(avoidElements)));
  } else if (gender) {
    statusParts.push(copy.statusGender(gender === "M" ? copy.genderM : copy.genderF));
  } else {
    statusParts.push(copy.statusNoElements);
  }
  statusParts.push(copy.statusPoolScope);
  uniqueList(notices).forEach((notice) => statusParts.push(notice));
  if (!gender) statusParts.push(copy.statusGenderPrompt);
  if (!elementKeys.length && input.birthDate) statusParts.push(copy.statusComputing);
  else if (!input.birthDate) statusParts.push(copy.statusNeedBirthDate);
  statusParts.push(copy.statusReference);

  return {
    candidates: pinned.concat(generated).slice(0, FINAL_CANDIDATE_LIMIT),
    moods: uniqueList(moods).slice(0, 5),
    status: statusParts.join(" "),
  };
}

/**
 * @param locale 화면 로케일. 🔴 비워 두면 한국어 경로다 — 기존 호출부와 테스트가 그대로 돌아야 하고,
 *   알 수 없는 값을 조용히 영어로 흘리지 않기 위해서다(resolveNamePoolBucket 이 ko/빈 값을 null 로 준다).
 */
export function buildRecommendationBundle(
  input: NamingRecommendationInput,
  sajuHints: NamingSajuHints | null,
  locale?: string,
): RecommendationBundle {
  const elementKeys = extractElementKeys(sajuHints);
  const gender = normalizeGender(input.gender);
  const bucket: NamePoolBucket | null = resolveNamePoolBucket(locale || "");
  if (bucket) {
    return buildLocaleBundle(input, sajuHints, elementKeys, gender, getNamePool(bucket), getNamingDraftCopy(locale || "en"));
  }
  const presets = rankStylePresets(input, elementKeys, gender);
  const draft = generateDraftNames(input, presets, elementKeys, gender, sajuHints);
  const moods = generateMoodDrafts(input, presets, elementKeys);
  const statusParts: string[] = [];
  if (elementKeys.length) {
    statusParts.push(`사주 용신을 계산해 보완 축 ${elementKeys.map((key) => ELEMENT_FULL_LABELS[key] || key).join(" · ")}을 잡고, 성씨부터 이어지는 소리오행 흐름까지 함께 보고 골랐습니다.`);
    const avoid = uniqueList(sajuHints?.avoidElements || []);
    if (avoid.length) {
      statusParts.push(`${avoid.map((key) => ELEMENT_FULL_LABELS[key] || key).join(" · ")} 기운은 이름에서 피했습니다.`);
    }
  } else if (gender) {
    statusParts.push(`${gender === "M" ? "남아" : "여아"} 기준으로 성씨와 원하는 분위기에 맞춰 초안을 골랐습니다.`);
  } else {
    statusParts.push("성씨와 원하는 분위기를 기준으로 먼저 초안을 골랐습니다.");
  }
  draft.notices.forEach((notice) => statusParts.push(notice));
  if (!gender) {
    statusParts.push("성별을 선택하면 남아·여아에 맞는 음절로 후보를 다시 고릅니다.");
  }
  if (!elementKeys.length && input.birthDate) {
    statusParts.push("사주 용신을 계산하는 중입니다. 잠시 뒤 오행 축이 반영된 후보로 바뀝니다.");
  } else if (!input.birthDate) {
    statusParts.push("생년월일이 들어오면 사주 용신을 계산해 오행 축을 맞춥니다.");
  }
  statusParts.push("초안 추천은 참고용이며 최종 판단은 프리미엄 프롬프트가 다시 정리합니다.");
  return { candidates: draft.candidates, moods, status: statusParts.join(" ") };
}
