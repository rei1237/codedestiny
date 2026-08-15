/**
 * 그날의 일진·천체 위치와 각 띠·별자리의 실제 관계를 계산한다.
 *
 * 왜 필요한가: 일일 패키지의 문장만 쓰면 24개 페이지가 "오늘의 카피 + 고정 해설"로 끝난다.
 * 여기서 계산하는 값은 날짜가 바뀌면 반드시 바뀌고 띠마다 다르므로, 페이지마다 그날에만
 * 해당하는 문장이 생긴다. 임의 생성이 아니라 명리·점성의 기본 관계다.
 *
 *  - 띠   : 십이지 삼합(三合)·충(沖)·비화(比和). 일진 간지의 두 번째 글자(지지)로 판정한다.
 *  - 별자리: 날짜로 정해지는 태양궁과, 일일 패키지가 담고 있는 그날의 달 자리.
 */
import type { SignProfile } from "./sign-profiles";

/** 띠 → 십이지 지지 */
const BRANCH_BY_ANIMAL: Record<string, string> = {
  rat: "子",
  ox: "丑",
  tiger: "寅",
  rabbit: "卯",
  dragon: "辰",
  snake: "巳",
  horse: "午",
  goat: "未",
  monkey: "申",
  rooster: "酉",
  dog: "戌",
  pig: "亥",
};

const BRANCH_KO: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

const ANIMAL_KO_BY_BRANCH: Record<string, string> = {
  子: "쥐",
  丑: "소",
  寅: "범",
  卯: "토끼",
  辰: "용",
  巳: "뱀",
  午: "말",
  未: "양",
  申: "원숭이",
  酉: "닭",
  戌: "개",
  亥: "돼지",
};

/** 삼합(三合) — 세 지지가 한 국(局)을 이룬다 */
const TRINES: { members: string[]; label: string }[] = [
  { members: ["申", "子", "辰"], label: "수국(水局)" },
  { members: ["亥", "卯", "未"], label: "목국(木局)" },
  { members: ["寅", "午", "戌"], label: "화국(火局)" },
  { members: ["巳", "酉", "丑"], label: "금국(金局)" },
];

/** 충(沖) — 정면으로 마주 보는 관계 */
const CLASHES: Record<string, string> = {
  子: "午",
  午: "子",
  丑: "未",
  未: "丑",
  寅: "申",
  申: "寅",
  卯: "酉",
  酉: "卯",
  辰: "戌",
  戌: "辰",
  巳: "亥",
  亥: "巳",
};

export type DayRelationKind = "trine" | "clash" | "same" | "neutral";

export interface DayRelation {
  kind: DayRelationKind;
  /** 화면에 붙는 짧은 배지 */
  badge: string;
  /** 한 문단 설명 — 매일 달라진다 */
  detail: string;
}

/** 일진 간지("辛酉")에서 지지 한 글자를 뽑는다 */
export function dayBranchOf(ilchin: string): string | null {
  const chars = Array.from(String(ilchin || "").trim());
  const branch = chars[chars.length - 1];
  return branch && BRANCH_KO[branch] ? branch : null;
}

export function animalDayRelation(animalId: string, ilchin: string): DayRelation | null {
  const own = BRANCH_BY_ANIMAL[animalId];
  const day = dayBranchOf(ilchin);
  if (!own || !day) return null;

  const dayKo = `${BRANCH_KO[day]}(${day})`;
  const dayAnimal = ANIMAL_KO_BY_BRANCH[day];

  if (own === day) {
    return {
      kind: "same",
      badge: "비화 · 같은 기운",
      detail: `오늘 일진의 지지가 ${dayKo}로 이 띠와 같습니다. 같은 기운이 겹치는 비화(比和)의 날이라 평소 성향이 그대로, 그리고 조금 더 진하게 나옵니다. 강점도 습관도 함께 커지므로 잘하던 방식을 밀고 나가되 과해지지 않도록만 살피세요.`,
    };
  }

  if (CLASHES[own] === day) {
    return {
      kind: "clash",
      badge: `충 · ${BRANCH_KO[own]}${BRANCH_KO[day]}충`,
      detail: `오늘 일진의 지지 ${dayKo}는 이 띠와 정면으로 부딪히는 충(沖)입니다. 흉한 날이라는 뜻이 아니라 변동 폭이 커지는 날입니다. 이동·연락·계획이 예정대로 가지 않을 수 있으니 여유를 두고, 감정이 실린 결정은 하루 미루면 대개 정리됩니다.`,
    };
  }

  const trine = TRINES.find((t) => t.members.includes(own) && t.members.includes(day));
  if (trine) {
    const partner = trine.members.filter((m) => m !== own && m !== day)[0];
    return {
      kind: "trine",
      badge: `삼합 · ${trine.label}`,
      detail: `오늘 일진의 지지 ${dayKo}는 이 띠와 삼합(三合)을 이뤄 ${trine.label}을 만듭니다. ${dayAnimal}띠·${ANIMAL_KO_BY_BRANCH[partner]}띠와 결이 맞는 날이라 협력과 부탁이 잘 통합니다. 혼자 끌고 가던 일을 나누기 좋은 자리입니다.`,
    };
  }

  return {
    kind: "neutral",
    badge: `일진 ${dayKo}`,
    detail: `오늘 일진의 지지는 ${dayKo}로, 이 띠와 특별한 합이나 충을 이루지 않습니다. 외부 변수가 적은 만큼 결과가 자기 준비대로 나오는 날입니다. 평소 미뤄 둔 일을 처리하기에 무난합니다.`,
  };
}

/** 태양이 각 궁에 머무는 구간 — 경계일은 해마다 하루 정도 움직인다(그래서 근사) */
const SUN_SIGN_RANGES: { id: string; from: [number, number]; to: [number, number] }[] = [
  { id: "capricorn", from: [12, 22], to: [1, 19] },
  { id: "aquarius", from: [1, 20], to: [2, 18] },
  { id: "pisces", from: [2, 19], to: [3, 20] },
  { id: "aries", from: [3, 21], to: [4, 19] },
  { id: "taurus", from: [4, 20], to: [5, 20] },
  { id: "gemini", from: [5, 21], to: [6, 21] },
  { id: "cancer", from: [6, 22], to: [7, 22] },
  { id: "leo", from: [7, 23], to: [8, 22] },
  { id: "virgo", from: [8, 23], to: [9, 22] },
  { id: "libra", from: [9, 23], to: [10, 23] },
  { id: "scorpio", from: [10, 24], to: [11, 22] },
  { id: "sagittarius", from: [11, 23], to: [12, 21] },
];

export function sunSignIdOf(ymd: string): string | null {
  const [, m, d] = ymd.split("-").map(Number);
  if (!m || !d) return null;
  for (const range of SUN_SIGN_RANGES) {
    const [fm, fd] = range.from;
    const [tm, td] = range.to;
    if (fm <= tm) {
      if ((m === fm && d >= fd) || (m === tm && d <= td) || (m > fm && m < tm)) return range.id;
    } else if ((m === fm && d >= fd) || (m === tm && d <= td)) {
      // 염소자리처럼 해를 넘기는 구간
      return range.id;
    }
  }
  return null;
}

export function zodiacDayRelation(
  profile: SignProfile,
  ymd: string,
  moonSignEn: string,
): DayRelation | null {
  const sunId = sunSignIdOf(ymd);
  const moonMatches = String(moonSignEn || "").trim().toLowerCase() === profile.nameEn.toLowerCase();

  if (sunId === profile.id) {
    return {
      kind: "same",
      badge: "태양이 머무는 자리",
      detail: `오늘 태양은 ${profile.nameKo}에 머물러 있습니다. 자기 궁에 태양이 있는 시기라 존재감과 주도권이 올라가고, 시작한 일에 힘이 실립니다. 한 해 중 자기 이야기를 꺼내기 가장 좋은 구간입니다.`,
    };
  }

  if (moonMatches) {
    return {
      kind: "trine",
      badge: "달이 머무는 자리",
      detail: `오늘 달이 ${profile.nameKo}를 지납니다. 달은 약 2~3일마다 궁을 옮기는데, 자기 궁에 달이 든 날은 감정이 선명해지고 직관이 잘 맞습니다. 마음이 기우는 쪽을 신뢰해도 좋은 날입니다.`,
    };
  }

  const sunProfileName = sunId ? SUN_SIGN_KO[sunId] : null;
  return {
    kind: "neutral",
    badge: sunProfileName ? `태양 ${sunProfileName} 구간` : "오늘의 하늘",
    detail: sunProfileName
      ? `오늘 태양은 ${sunProfileName}에 머물고 달은 ${moonSignEn || "이동 중"} 자리를 지납니다. ${profile.nameKo}에게는 외부 기운이 강하게 끌어당기지 않는 구간이라, 흐름을 타기보다 자기 계획대로 밀고 가는 편이 결과가 좋습니다.`
      : `${profile.nameKo}에게 오늘은 외부 기운의 개입이 적은 날입니다. 자기 계획대로 움직이세요.`,
  };
}

const SUN_SIGN_KO: Record<string, string> = {
  aries: "양자리",
  taurus: "황소자리",
  gemini: "쌍둥이자리",
  cancer: "게자리",
  leo: "사자자리",
  virgo: "처녀자리",
  libra: "천칭자리",
  scorpio: "전갈자리",
  sagittarius: "궁수자리",
  capricorn: "염소자리",
  aquarius: "물병자리",
  pisces: "물고기자리",
};
