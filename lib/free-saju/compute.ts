/**
 * `/saju/free` 초간단 만세력 계산(순수 함수).
 *
 * 엔진(`@/lib/korean-calendar` calculateNatalSaju)이 돌려준 한자 기둥("甲子")만 받아
 * 십신·오행 개수·12운성·재성 오행을 뽑는다. 엔진 로딩은 `./engine.ts` 가 맡는다.
 * calculateLocalSaju 는 같은 기둥을 감싸지만 번들이 3배 크고(139KB gz vs 42KB gz) 5배 느려서 쓰지 않는다.
 */
import { getTwelveLifeStage, type EarthlyBranch, type HeavenlyStem, type TwelveLifeStage } from "@/app/saju/animal-destiny/lib/calculateTwelveLifeStage";

export type { EarthlyBranch, HeavenlyStem, TwelveLifeStage };
export type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";
export type TenGod = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";

export const STEMS: readonly HeavenlyStem[] = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const BRANCHES: readonly EarthlyBranch[] = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export const ELEMENTS: readonly ElementKey[] = ["wood", "fire", "earth", "metal", "water"];
export const TEN_GODS: readonly TenGod[] = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];

const BRANCH_ELEMENT: Record<EarthlyBranch, ElementKey> = {
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire",
  午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water",
};

export function stemElement(stem: HeavenlyStem): ElementKey {
  return ELEMENTS[Math.floor(STEMS.indexOf(stem) / 2)];
}

export function branchElement(branch: EarthlyBranch): ElementKey {
  return BRANCH_ELEMENT[branch];
}

/** 일간 기준 대상 천간의 십신. 같은 음양이면 편(비견·식신·편재·편관·편인), 다르면 정. */
export function tenGodOf(dayStem: HeavenlyStem, target: HeavenlyStem): TenGod {
  const di = STEMS.indexOf(dayStem);
  const ti = STEMS.indexOf(target);
  if (di < 0 || ti < 0) throw new RangeError("INVALID_STEM");
  const relation = (Math.floor(ti / 2) - Math.floor(di / 2) + 5) % 5; // 0 같음 1 내가 낳음 2 내가 극함 3 나를 극함 4 나를 낳음
  const samePolarity = di % 2 === ti % 2;
  return TEN_GODS[relation * 2 + (samePolarity ? 0 : 1)];
}

/** 재성 = 일간이 극하는 오행. */
export function wealthElementOf(dayStem: HeavenlyStem): ElementKey {
  return ELEMENTS[(Math.floor(STEMS.indexOf(dayStem) / 2) + 2) % 5];
}

export type NatalPillars = { year: string; month: string; day: string; hour: string | null };

function splitPillar(pillar: string): [HeavenlyStem, EarthlyBranch] {
  const stem = pillar?.[0] as HeavenlyStem;
  const branch = pillar?.[1] as EarthlyBranch;
  if (!STEMS.includes(stem) || !BRANCHES.includes(branch)) throw new RangeError("INVALID_PILLAR");
  return [stem, branch];
}

/** 겉으로 드러난 여덟 글자(시간 모름이면 여섯 글자)의 오행 개수. */
export function countElements(pillars: NatalPillars): Record<ElementKey, number> {
  const counts: Record<ElementKey, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const pillar of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    if (!pillar) continue;
    const [stem, branch] = splitPillar(pillar);
    counts[stemElement(stem)] += 1;
    counts[branchElement(branch)] += 1;
  }
  return counts;
}

export type FreeSajuReading = {
  pillars: NatalPillars;
  dayStem: HeavenlyStem;
  dayBranch: EarthlyBranch;
  currentYearStem: HeavenlyStem;
  yearTenGod: TenGod;
  lifeStage: TwelveLifeStage;
  elements: Record<ElementKey, number>;
  wealthElement: ElementKey;
  wealthCount: number;
  timeUnknown: boolean;
};

export function buildFreeSajuReading(pillars: NatalPillars, currentYearPillar: string): FreeSajuReading {
  const [dayStem, dayBranch] = splitPillar(pillars.day);
  const [currentYearStem] = splitPillar(currentYearPillar);
  const elements = countElements(pillars);
  const wealthElement = wealthElementOf(dayStem);
  return {
    pillars,
    dayStem,
    dayBranch,
    currentYearStem,
    yearTenGod: tenGodOf(dayStem, currentYearStem),
    lifeStage: getTwelveLifeStage(dayStem, dayBranch),
    elements,
    wealthElement,
    wealthCount: elements[wealthElement],
    timeUnknown: !pillars.hour,
  };
}
