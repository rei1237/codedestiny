import { GANJI_ANIMAL_MAP, getGuardianCopy, normalizeGanji } from "../_lib/fortune/ganjiGuardianSprite.ts";
import type { Ganji60 } from "../_lib/fortune/ganjiGuardianSprite.ts";

export interface ApiResult {
  ok: boolean;
  result?: {
    dominantElement: string;
    secondaryElement: string;
    zodiac: string;
    colorKo: string;
    colorEn: string;
    animals: string[];
    mainAnimal: string;
    expressionKo: string;
    personalitySummaryKo: string;
    personalityLines: string[];
    headlineKo: string;
    dayPillar?: string;
    dayGanji?: string;
    ilju?: string;
    dayStemBranch?: string;
    fourPillars?: {
      year?: {
        ganji?: string;
        stem?: string;
        branch?: string;
      };
      month?: {
        ganji?: string;
        stem?: string;
        branch?: string;
      };
      day?: {
        ganji?: string;
        stem?: string;
        branch?: string;
      };
      hour?: {
        ganji?: string;
        stem?: string;
        branch?: string;
      };
    };
    saju?: {
      dayPillar?: string;
      dayGanji?: string;
      ilju?: string;
      dayStemBranch?: string;
      fourPillars?: {
        year?: {
          ganji?: string;
          stem?: string;
          branch?: string;
        };
        month?: {
          ganji?: string;
          stem?: string;
          branch?: string;
        };
        day?: {
          ganji?: string;
          stem?: string;
          branch?: string;
        };
        hour?: {
          ganji?: string;
          stem?: string;
          branch?: string;
        };
      };
    };
    hasBirthTime?: boolean;
  };
  imageUrl?: string;
  fallback?: boolean;
  fallbackMessage?: string;
  message?: string;
  dayPillar?: string;
  dayGanji?: string;
  ilju?: string;
  dayStemBranch?: string;
  fourPillars?: {
    year?: {
      ganji?: string;
      stem?: string;
      branch?: string;
    };
    month?: {
      ganji?: string;
      stem?: string;
      branch?: string;
    };
    day?: {
      ganji?: string;
      stem?: string;
      branch?: string;
    };
    hour?: {
      ganji?: string;
      stem?: string;
      branch?: string;
    };
  };
  resolvedGanji?: Ganji60 | null;
}

export const STEM_TO_ELEMENT: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",
};

export const BRANCH_TO_ZODIAC: Record<string, string> = {
  자: "쥐",
  축: "소",
  인: "호랑이",
  묘: "토끼",
  진: "용",
  사: "뱀",
  오: "말",
  미: "양",
  신: "원숭이",
  유: "닭",
  술: "개",
  해: "돼지",
};

export const ELEMENT_NEXT: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

export const ELEMENT_COLOR: Record<string, { ko: string; en: string }> = {
  목: { ko: "초록", en: "Green" },
  화: { ko: "코랄", en: "Coral" },
  토: { ko: "샌드", en: "Sand" },
  금: { ko: "아이보리", en: "Ivory" },
  수: { ko: "하늘", en: "Sky" },
};

type Pillar = { ganji: string; stem: string; branch: string };
export function guardianReading(pillars: {year: Pillar; month: Pillar; day: Pillar; hour?: Pillar | null}, hasBirthTime: boolean): ApiResult | null {
  const resolvedGanji = normalizeGanji(pillars?.day?.ganji ?? null);
  if (!resolvedGanji) return null;

  const dayStem = pillars.day.stem;
  const dominantElement = STEM_TO_ELEMENT[dayStem] ?? "토";
  const secondaryElement = ELEMENT_NEXT[dominantElement] ?? "금";
  const zodiac = BRANCH_TO_ZODIAC[pillars.year.branch] ?? "용";
  const mainAnimal = GANJI_ANIMAL_MAP[resolvedGanji] ?? "용";
  const copy = getGuardianCopy(resolvedGanji);
  const hourPillar = hasBirthTime ? pillars.hour : null;

  return {
    ok: true,
    resolvedGanji,
    result: {
      dominantElement,
      secondaryElement,
      zodiac,
      colorKo: ELEMENT_COLOR[dominantElement]?.ko ?? "파스텔",
      colorEn: ELEMENT_COLOR[dominantElement]?.en ?? "Pastel",
      animals: [mainAnimal],
      mainAnimal,
      expressionKo: `${mainAnimal} 기운이 깨어나는 날`,
      personalitySummaryKo: copy.short,
      personalityLines: copy.traits,
      headlineKo: copy.title,
      hasBirthTime,
      dayPillar: resolvedGanji,
      dayGanji: resolvedGanji,
      ilju: resolvedGanji,
      dayStemBranch: resolvedGanji,
      fourPillars: {
        year: {
          ganji: pillars.year.ganji,
          stem: pillars.year.stem,
          branch: pillars.year.branch,
        },
        month: {
          ganji: pillars.month.ganji,
          stem: pillars.month.stem,
          branch: pillars.month.branch,
        },
        day: {
          ganji: resolvedGanji,
          stem: pillars.day.stem,
          branch: pillars.day.branch,
        },
        hour: hasBirthTime && hourPillar
          ? {
              ganji: hourPillar.ganji,
              stem: hourPillar.stem,
              branch: hourPillar.branch,
            }
          : undefined,
      },
    },
  };
}
