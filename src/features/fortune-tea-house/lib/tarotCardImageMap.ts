import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

const R2_ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "https://assets.code-destiny.com";
const CARETARO_OBJECT_PREFIX = "DestinyCafe/caretaro";

export const caretaroR2FileNames = [
  "고위여사제.webp",
  "교황.webp",
  "달.webp",
  "마법사.webp",
  "매달린남자.webp",
  "바보.webp",
  "별.webp",
  "세계.webp",
  "소드10.webp",
  "소드2.webp",
  "소드3.webp",
  "소드4.webp",
  "소드5.webp",
  "소드6.webp",
  "소드7.webp",
  "소드8.webp",
  "소드9.webp",
  "소드기사.webp",
  "소드에이스.webp",
  "소드퀸.webp",
  "소드킹.webp",
  "소드페이지.webp",
  "심판.webp",
  "악마.webp",
  "여황제.webp",
  "연인.webp",
  "완드10.webp",
  "완드2.webp",
  "완드3.webp",
  "완드4.webp",
  "완드5.webp",
  "완드6.webp",
  "완드7.webp",
  "완드8.webp",
  "완드9.webp",
  "완드기사.webp",
  "완드에이스.webp",
  "완드퀸.webp",
  "완드킹.webp",
  "완드페이지.webp",
  "운명의수레바퀴.webp",
  "은둔자.webp",
  "전차.webp",
  "절제.webp",
  "정의.webp",
  "죽음.webp",
  "컵10.webp",
  "컵2.webp",
  "컵3.webp",
  "컵4.webp",
  "컵5.webp",
  "컵6.webp",
  "컵7.webp",
  "컵8.webp",
  "컵9.webp",
  "컵기사.webp",
  "컵에이스.webp",
  "컵여왕.webp",
  "컵킹.webp",
  "컵페이지.webp",
  "탑.webp",
  "태양.webp",
  "펜타클10.webp",
  "펜타클2.webp",
  "펜타클3.webp",
  "펜타클4.webp",
  "펜타클5.webp",
  "펜타클6.webp",
  "펜타클7.webp",
  "펜타클8.webp",
  "펜타클9.webp",
  "펜타클기사.webp",
  "펜타클에이스.webp",
  "펜타클퀸.webp",
  "펜타클킹.webp",
  "펜타클페이지.webp",
  "황제.webp",
  "힘.webp",
] as const;

export const tarotCardImageBasenameByCanonicalKey = {
  fool: "바보",
  magician: "마법사",
  high_priestess: "고위여사제",
  empress: "여황제",
  emperor: "황제",
  hierophant: "교황",
  lovers: "연인",
  chariot: "전차",
  strength: "힘",
  hermit: "은둔자",
  wheel_of_fortune: "운명의수레바퀴",
  justice: "정의",
  hanged_man: "매달린남자",
  death: "죽음",
  temperance: "절제",
  devil: "악마",
  tower: "탑",
  star: "별",
  moon: "달",
  sun: "태양",
  judgement: "심판",
  world: "세계",
  ace_of_swords: "소드에이스",
  two_of_swords: "소드2",
  three_of_swords: "소드3",
  four_of_swords: "소드4",
  five_of_swords: "소드5",
  six_of_swords: "소드6",
  seven_of_swords: "소드7",
  eight_of_swords: "소드8",
  nine_of_swords: "소드9",
  ten_of_swords: "소드10",
  page_of_swords: "소드페이지",
  knight_of_swords: "소드기사",
  queen_of_swords: "소드퀸",
  king_of_swords: "소드킹",
  ace_of_wands: "완드에이스",
  two_of_wands: "완드2",
  three_of_wands: "완드3",
  four_of_wands: "완드4",
  five_of_wands: "완드5",
  six_of_wands: "완드6",
  seven_of_wands: "완드7",
  eight_of_wands: "완드8",
  nine_of_wands: "완드9",
  ten_of_wands: "완드10",
  page_of_wands: "완드페이지",
  knight_of_wands: "완드기사",
  queen_of_wands: "완드퀸",
  king_of_wands: "완드킹",
  ace_of_cups: "컵에이스",
  two_of_cups: "컵2",
  three_of_cups: "컵3",
  four_of_cups: "컵4",
  five_of_cups: "컵5",
  six_of_cups: "컵6",
  seven_of_cups: "컵7",
  eight_of_cups: "컵8",
  nine_of_cups: "컵9",
  ten_of_cups: "컵10",
  page_of_cups: "컵페이지",
  knight_of_cups: "컵기사",
  queen_of_cups: "컵여왕",
  king_of_cups: "컵킹",
  ace_of_pentacles: "펜타클에이스",
  two_of_pentacles: "펜타클2",
  three_of_pentacles: "펜타클3",
  four_of_pentacles: "펜타클4",
  five_of_pentacles: "펜타클5",
  six_of_pentacles: "펜타클6",
  seven_of_pentacles: "펜타클7",
  eight_of_pentacles: "펜타클8",
  nine_of_pentacles: "펜타클9",
  ten_of_pentacles: "펜타클10",
  page_of_pentacles: "펜타클페이지",
  knight_of_pentacles: "펜타클기사",
  queen_of_pentacles: "펜타클퀸",
  king_of_pentacles: "펜타클킹",
} as const;

export type TarotCardCanonicalImageKey = keyof typeof tarotCardImageBasenameByCanonicalKey;

export type TarotCardImageLookupInput = {
  cardId?: string;
  id?: string;
  nameKo?: string;
  nameKr?: string;
  nameEn?: string;
  suit?: string;
  rank?: string | number;
  number?: number;
  arcana?: string;
};

export type TarotCardImageResolution = {
  canonicalKey: TarotCardCanonicalImageKey;
  basename: string;
  fileName: string;
  objectKey: string;
  url: string;
};

const caretaroR2FileNameByBasename = caretaroR2FileNames.reduce<Record<string, string>>((map, fileName) => {
  map[fileName.replace(/\.[^.]+$/u, "")] = fileName;
  return map;
}, {});

const majorCanonicalKeysByNumber = [
  "fool",
  "magician",
  "high_priestess",
  "empress",
  "emperor",
  "hierophant",
  "lovers",
  "chariot",
  "strength",
  "hermit",
  "wheel_of_fortune",
  "justice",
  "hanged_man",
  "death",
  "temperance",
  "devil",
  "tower",
  "star",
  "moon",
  "sun",
  "judgement",
  "world",
] as const satisfies readonly TarotCardCanonicalImageKey[];

const rankKeyByNumber = [
  "",
  "ace",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "page",
  "knight",
  "queen",
  "king",
] as const;

type MinorSuitKey = "wands" | "cups" | "swords" | "pentacles";
type MinorRankKey = Exclude<(typeof rankKeyByNumber)[number], "">;

const suitAliases: Record<string, MinorSuitKey> = {
  wand: "wands",
  wands: "wands",
  cup: "cups",
  cups: "cups",
  sword: "swords",
  swords: "swords",
  pentacle: "pentacles",
  pentacles: "pentacles",
  coin: "pentacles",
  coins: "pentacles",
};

const rankAliases: Record<string, MinorRankKey> = {
  ace: "ace",
  one: "ace",
  "1": "ace",
  "01": "ace",
  two: "two",
  "2": "two",
  "02": "two",
  three: "three",
  "3": "three",
  "03": "three",
  four: "four",
  "4": "four",
  "04": "four",
  five: "five",
  "5": "five",
  "05": "five",
  six: "six",
  "6": "six",
  "06": "six",
  seven: "seven",
  "7": "seven",
  "07": "seven",
  eight: "eight",
  "8": "eight",
  "08": "eight",
  nine: "nine",
  "9": "nine",
  "09": "nine",
  ten: "ten",
  "10": "ten",
  page: "page",
  "11": "page",
  knight: "knight",
  "12": "knight",
  queen: "queen",
  "13": "queen",
  king: "king",
  "14": "king",
};

const explicitCanonicalAliases: Record<string, TarotCardCanonicalImageKey> = {};
const missingImageWarnings = new Set<string>();

function normalizeCardKey(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^the\s+/u, "")
    .replace(/&/gu, "and")
    .replace(/[^0-9a-z가-힣]+/gu, "_")
    .replace(/^the_/u, "")
    .replace(/^_+|_+$/gu, "");
}

function addAlias(alias: string, canonicalKey: TarotCardCanonicalImageKey) {
  explicitCanonicalAliases[normalizeCardKey(alias)] = canonicalKey;
}

Object.entries(tarotCardImageBasenameByCanonicalKey).forEach(([canonicalKey, basename]) => {
  addAlias(canonicalKey, canonicalKey as TarotCardCanonicalImageKey);
  addAlias(basename, canonicalKey as TarotCardCanonicalImageKey);
});

majorCanonicalKeysByNumber.forEach((canonicalKey, index) => {
  addAlias(`major_${index}`, canonicalKey);
  addAlias(`major_${String(index).padStart(2, "0")}`, canonicalKey);
});

[
  ["fool", ["the_fool", "major_00_fool", "0", "0_fool"]],
  ["magician", ["the_magician", "major_01_magician", "1", "1_magician"]],
  ["high_priestess", ["the_high_priestess", "priestess", "major_02_high_priestess", "2", "2_high_priestess"]],
  ["empress", ["the_empress", "major_03_empress", "3", "3_empress"]],
  ["emperor", ["the_emperor", "major_04_emperor", "4", "4_emperor"]],
  ["hierophant", ["the_hierophant", "pope", "major_05_hierophant", "5", "5_hierophant"]],
  ["lovers", ["the_lovers", "major_06_lovers", "6", "6_lovers"]],
  ["chariot", ["the_chariot", "major_07_chariot", "7", "7_chariot"]],
  ["strength", ["the_strength", "major_08_strength", "8", "8_strength"]],
  ["hermit", ["the_hermit", "major_09_hermit", "9", "9_hermit"]],
  ["wheel_of_fortune", ["fortune_wheel", "the_wheel_of_fortune", "major_10_wheel_of_fortune", "10", "10_wheel_of_fortune"]],
  ["justice", ["the_justice", "major_11_justice", "11", "11_justice"]],
  ["hanged_man", ["the_hanged_man", "hanged", "major_12_hanged_man", "12", "12_hanged_man"]],
  ["death", ["the_death", "major_13_death", "13", "13_death"]],
  ["temperance", ["the_temperance", "major_14_temperance", "14", "14_temperance"]],
  ["devil", ["the_devil", "major_15_devil", "15", "15_devil"]],
  ["tower", ["the_tower", "major_16_tower", "16", "16_tower"]],
  ["star", ["the_star", "major_17_star", "17", "17_star"]],
  ["moon", ["the_moon", "major_18_moon", "18", "18_moon"]],
  ["sun", ["the_sun", "major_19_sun", "19", "19_sun"]],
  ["judgement", ["judgment", "the_judgement", "the_judgment", "major_20_judgement", "major_20_judgment", "20", "20_judgement", "20_judgment"]],
  ["world", ["the_world", "major_21_world", "21", "21_world"]],
].forEach(([canonicalKey, aliases]) => {
  (aliases as string[]).forEach((alias) => addAlias(alias, canonicalKey as TarotCardCanonicalImageKey));
});

function normalizeSuit(value: unknown): MinorSuitKey | undefined {
  return suitAliases[normalizeCardKey(value)];
}

function normalizeRank(value: unknown): MinorRankKey | undefined {
  return rankAliases[normalizeCardKey(value)];
}

function toMinorCanonicalKey(rank: MinorRankKey, suit: MinorSuitKey): TarotCardCanonicalImageKey {
  return `${rank}_of_${suit}` as TarotCardCanonicalImageKey;
}

function resolveFromNormalizedKey(normalizedKey: string): TarotCardCanonicalImageKey | undefined {
  if (!normalizedKey) return undefined;
  const direct = explicitCanonicalAliases[normalizedKey];
  if (direct) return direct;

  const majorIdMatch = /^major_(\d{1,2})(?:_[0-9a-z_]+)?$/u.exec(normalizedKey);
  if (majorIdMatch) {
    return majorCanonicalKeysByNumber[Number(majorIdMatch[1])];
  }

  const minorIdMatch = /^minor_([a-z]+)_(\d{1,2})$/u.exec(normalizedKey);
  if (minorIdMatch) {
    const suit = normalizeSuit(minorIdMatch[1]);
    const rank = normalizeRank(minorIdMatch[2]);
    return suit && rank ? toMinorCanonicalKey(rank, suit) : undefined;
  }

  const ofMatch = /^([a-z0-9]+)_of_([a-z]+)$/u.exec(normalizedKey);
  if (ofMatch) {
    const rank = normalizeRank(ofMatch[1]);
    const suit = normalizeSuit(ofMatch[2]);
    return rank && suit ? toMinorCanonicalKey(rank, suit) : undefined;
  }

  const pairMatch = /^([a-z]+)_([a-z0-9]+)$/u.exec(normalizedKey);
  if (pairMatch) {
    const firstSuit = normalizeSuit(pairMatch[1]);
    const secondRank = normalizeRank(pairMatch[2]);
    if (firstSuit && secondRank) return toMinorCanonicalKey(secondRank, firstSuit);

    const firstRank = normalizeRank(pairMatch[1]);
    const secondSuit = normalizeSuit(pairMatch[2]);
    if (firstRank && secondSuit) return toMinorCanonicalKey(firstRank, secondSuit);
  }

  return undefined;
}

export function resolveTarotCardCanonicalKey(input: TarotCardImageLookupInput): TarotCardCanonicalImageKey | undefined {
  const fromParts = input.suit && (input.rank !== undefined || input.number !== undefined)
    ? (() => {
        const suit = normalizeSuit(input.suit);
        const rank = normalizeRank(input.rank ?? input.number);
        return suit && rank ? toMinorCanonicalKey(rank, suit) : undefined;
      })()
    : undefined;
  if (fromParts) return fromParts;

  const candidateValues = [input.cardId, input.id, input.nameEn, input.nameKo, input.nameKr];
  for (const value of candidateValues) {
    const canonicalKey = resolveFromNormalizedKey(normalizeCardKey(value));
    if (canonicalKey) return canonicalKey;
  }

  if (input.arcana === "major" && typeof input.number === "number") {
    return majorCanonicalKeysByNumber[input.number];
  }

  return undefined;
}

function warnMissingTarotCardImage(input: TarotCardImageLookupInput, reason: string) {
  const warningKey = `${reason}:${input.cardId || input.id || input.nameEn || input.nameKo || input.nameKr || input.suit || "unknown"}`;
  if (missingImageWarnings.has(warningKey)) return;
  missingImageWarnings.add(warningKey);
  console.warn("[FortuneTeaHouse] Tarot card image mapping failed", {
    reason,
    cardId: input.cardId,
    id: input.id,
    nameKo: input.nameKo,
    nameKr: input.nameKr,
    nameEn: input.nameEn,
    suit: input.suit,
    rank: input.rank,
    number: input.number,
    arcana: input.arcana,
  });
}

export function resolveTarotCardImage(input: TarotCardImageLookupInput): TarotCardImageResolution | null {
  const canonicalKey = resolveTarotCardCanonicalKey(input);
  if (!canonicalKey) {
    warnMissingTarotCardImage(input, "unknown-card-key");
    return null;
  }

  const basename = tarotCardImageBasenameByCanonicalKey[canonicalKey];
  const fileName = caretaroR2FileNameByBasename[basename];
  if (!fileName) {
    warnMissingTarotCardImage(input, `missing-r2-file:${basename}`);
    return null;
  }

  const objectKey = `${CARETARO_OBJECT_PREFIX}/${fileName}`;
  return {
    canonicalKey,
    basename,
    fileName,
    objectKey,
    url: getAssetUrlFromPublicPath(`/${objectKey}`, {
      baseUrl: R2_ASSET_BASE_URL,
      fallbackPublicPath: `/${objectKey}`,
      prefix: "",
    }),
  };
}

export function getTarotCardImageUrl(input: TarotCardImageLookupInput) {
  return resolveTarotCardImage(input)?.url || "";
}

export function getTarotCardImageCoverage() {
  const canonicalKeys = Object.keys(tarotCardImageBasenameByCanonicalKey);
  const mappedBasenames = canonicalKeys.map((key) => tarotCardImageBasenameByCanonicalKey[key as TarotCardCanonicalImageKey]);
  const duplicateBasenames = mappedBasenames.filter((basename, index) => mappedBasenames.indexOf(basename) !== index);
  const missingFiles = mappedBasenames.filter((basename) => !caretaroR2FileNameByBasename[basename]);
  const unusedFiles = caretaroR2FileNames
    .map((fileName) => fileName.replace(/\.[^.]+$/u, ""))
    .filter((basename) => !mappedBasenames.includes(basename as (typeof mappedBasenames)[number]));

  return {
    expectedCards: 78,
    mappedCards: canonicalKeys.length,
    r2Files: caretaroR2FileNames.length,
    duplicateBasenames,
    missingFiles,
    unusedFiles,
  };
}
