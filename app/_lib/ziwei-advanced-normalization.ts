export type TransformationType = "록" | "권" | "과" | "기";

export type FourTransformation = {
  type: TransformationType;
  starName: string;
  palaceName: string;
  palaceIndex: number;
  palaceBranch: string;
};

export type FourTransformationSummary = {
  yearStem: string;
  byType: Record<TransformationType, FourTransformation | null>;
  byPalace: Record<string, FourTransformation[]>;
  byStar: Record<string, TransformationType[]>;
};

export const ZIWEI_ENGINE_VERSION = "ziwei-engine-v2.1-four-transformations";

export const PALACE_NAME_NORMALIZE_MAP: Record<string, string> = {
  명궁: "명궁",
  형제궁: "형제궁",
  부부궁: "부부궁",
  부처궁: "부부궁",
  배우자궁: "부부궁",
  자녀궁: "자녀궁",
  재백궁: "재백궁",
  질액궁: "질액궁",
  천이궁: "천이궁",
  교우궁: "교우궁",
  노복궁: "교우궁",
  관록궁: "관록궁",
  사업궁: "관록궁",
  전택궁: "전택궁",
  복덕궁: "복덕궁",
  부모궁: "부모궁",
};

const YEAR_STEM_NORMALIZE_MAP: Record<string, string> = {
  갑: "갑",
  을: "을",
  병: "병",
  정: "정",
  무: "무",
  기: "기",
  경: "경",
  신: "신",
  임: "임",
  계: "계",
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

export const FOUR_TRANSFORMATIONS_BY_YEAR_STEM = {
  갑: {
    록: "염정",
    권: "파군",
    과: "무곡",
    기: "태양",
  },
  을: {
    록: "천기",
    권: "천량",
    과: "자미",
    기: "태음",
  },
  병: {
    록: "천동",
    권: "천기",
    과: "문창",
    기: "염정",
  },
  정: {
    록: "태음",
    권: "천동",
    과: "천기",
    기: "거문",
  },
  무: {
    록: "탐랑",
    권: "태음",
    과: "우필",
    기: "천기",
  },
  기: {
    록: "무곡",
    권: "탐랑",
    과: "천량",
    기: "문곡",
  },
  경: {
    록: "태양",
    권: "무곡",
    과: "태음",
    기: "천동",
  },
  신: {
    록: "거문",
    권: "태양",
    과: "문곡",
    기: "문창",
  },
  임: {
    록: "천량",
    권: "자미",
    과: "좌보",
    기: "무곡",
  },
  계: {
    록: "파군",
    권: "거문",
    과: "태음",
    기: "탐랑",
  },
} as const;

type StarLike = string | { name?: string } | null | undefined;

type PalaceLike = {
  index?: number;
  name?: string;
  normalizedName?: string;
  branch?: string;
  earthlyBranch?: string;
  mainStars?: StarLike[];
  subStars?: StarLike[];
  minorStars?: StarLike[];
  auxiliaryStars?: StarLike[];
  maleficStars?: StarLike[];
  luckyStars?: StarLike[];
  stars?: StarLike[];
  allStars?: StarLike[];
};

export function normalizePalaceName(name?: string): string {
  const raw = String(name || "").trim();
  if (!raw) return "";
  return PALACE_NAME_NORMALIZE_MAP[raw] || raw;
}

export function normalizeYearStem(stem?: string): string {
  const raw = String(stem || "").trim();
  if (!raw) return "";
  return YEAR_STEM_NORMALIZE_MAP[raw] || raw;
}

export function normalizeZiweiStarName(name?: string): string {
  if (!name) return "";

  return String(name)
    .replace(/\s/g, "")
    .replace(/化祿|化禄|화록/g, "")
    .replace(/化權|化权|화권/g, "")
    .replace(/化科|화과/g, "")
    .replace(/化忌|화기/g, "")
    .replace(/紫微/g, "자미")
    .replace(/天機/g, "천기")
    .replace(/太阳|太陽/g, "태양")
    .replace(/武曲/g, "무곡")
    .replace(/天同/g, "천동")
    .replace(/廉貞|廉贞/g, "염정")
    .replace(/天府/g, "천부")
    .replace(/太陰|太阴/g, "태음")
    .replace(/貪狼|贪狼/g, "탐랑")
    .replace(/巨門|巨门/g, "거문")
    .replace(/天相/g, "천상")
    .replace(/天梁/g, "천량")
    .replace(/七殺|七杀/g, "칠살")
    .replace(/破軍|破军/g, "파군")
    .replace(/文昌/g, "문창")
    .replace(/文曲/g, "문곡")
    .replace(/左輔|左辅/g, "좌보")
    .replace(/右弼/g, "우필")
    .trim();
}

export function getOppositePalaceIndex(index: number): number {
  return (index + 6) % 12;
}

export function getSanFangSiZhengIndexes(index: number): number[] {
  return [index, (index + 4) % 12, (index + 8) % 12, getOppositePalaceIndex(index)];
}

function readStarName(star: StarLike): string {
  if (!star) return "";
  if (typeof star === "string") return star;
  return String(star.name || "");
}

function collectPalaceStarNames(palace: PalaceLike): string[] {
  const merged = [
    ...(palace.mainStars || []),
    ...(palace.subStars || []),
    ...(palace.minorStars || []),
    ...(palace.auxiliaryStars || []),
    ...(palace.maleficStars || []),
    ...(palace.luckyStars || []),
    ...(palace.stars || []),
    ...(palace.allStars || []),
  ];

  return merged
    .map(readStarName)
    .map(normalizeZiweiStarName)
    .filter(Boolean);
}

export function transformationTypeToLabel(type: TransformationType): "화록" | "화권" | "화과" | "화기" {
  if (type === "록") return "화록";
  if (type === "권") return "화권";
  if (type === "과") return "화과";
  return "화기";
}

export function calculateFourTransformations(params: {
  yearStem: string;
  palaces: PalaceLike[];
}): FourTransformationSummary {
  const stem = normalizeYearStem(params.yearStem);
  const table = FOUR_TRANSFORMATIONS_BY_YEAR_STEM[stem as keyof typeof FOUR_TRANSFORMATIONS_BY_YEAR_STEM];

  if (!table) {
    throw new Error(`[Ziwei] Unknown yearStem for four transformations: ${params.yearStem}`);
  }

  const byType: Record<TransformationType, FourTransformation | null> = {
    록: null,
    권: null,
    과: null,
    기: null,
  };

  const byPalace: Record<string, FourTransformation[]> = {};
  const byStar: Record<string, TransformationType[]> = {};

  for (const [type, starName] of Object.entries(table) as [TransformationType, string][]) {
    const normalizedTarget = normalizeZiweiStarName(starName);
    const foundIndex = params.palaces.findIndex((palace) => {
      const starNames = collectPalaceStarNames(palace);
      return starNames.includes(normalizedTarget);
    });

    if (foundIndex < 0) {
      byType[type] = null;
      if (!byStar[starName]) byStar[starName] = [];
      byStar[starName].push(type);
      continue;
    }

    const foundPalace = params.palaces[foundIndex] || {};
    const palaceName = normalizePalaceName(foundPalace.normalizedName || foundPalace.name || "") || String(foundPalace.name || "");
    const palaceBranch = String(foundPalace.branch || foundPalace.earthlyBranch || "");

    const item: FourTransformation = {
      type,
      starName,
      palaceName,
      palaceIndex: Number.isFinite(foundPalace.index) ? Number(foundPalace.index) : foundIndex,
      palaceBranch,
    };

    byType[type] = item;

    if (!byPalace[palaceName]) byPalace[palaceName] = [];
    byPalace[palaceName].push(item);

    if (!byStar[starName]) byStar[starName] = [];
    byStar[starName].push(type);
  }

  return {
    yearStem: stem,
    byType,
    byPalace,
    byStar,
  };
}
