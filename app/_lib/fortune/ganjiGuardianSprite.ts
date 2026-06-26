export const GANJI_60 = [
  "갑자", "을축", "병인", "정묘", "무진", "기사", "경오", "신미", "임신", "계유",
  "갑술", "을해", "병자", "정축", "무인", "기묘", "경진", "신사", "임오", "계미",
  "갑신", "을유", "병술", "정해", "무자", "기축", "경인", "신묘", "임진", "계사",
  "갑오", "을미", "병신", "정유", "무술", "기해", "경자", "신축", "임인", "계묘",
  "갑진", "을사", "병오", "정미", "무신", "기유", "경술", "신해", "임자", "계축",
  "갑인", "을묘", "병진", "정사", "무오", "기미", "경신", "신유", "임술", "계해",
] as const;

export type Ganji60 = (typeof GANJI_60)[number];
export type GanjiGuardianLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW";

const GANJI_GUARDIAN_TEXT_TRANSLATIONS: Record<GanjiGuardianLocale, {
  elements: Record<"wood" | "fire" | "earth" | "metal" | "water", string>;
}> = {
  ko: { elements: { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" } },
  en: { elements: { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" } },
  ja: { elements: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" } },
  "zh-CN": { elements: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" } },
  "zh-TW": { elements: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" } },
};

function normalizeGanjiGuardianLocale(value?: string | null): GanjiGuardianLocale {
  const normalized = String(value || "").trim().replace("_", "-").toLowerCase();
  if (normalized === "ja" || normalized.startsWith("ja-")) return "ja";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk") return "zh-TW";
  return "ko";
}

function ganjiGuardianElementLabel(key: "wood" | "fire" | "earth" | "metal" | "water", locale?: string | null) {
  const lang = normalizeGanjiGuardianLocale(locale);
  return GANJI_GUARDIAN_TEXT_TRANSLATIONS[lang].elements[key] || GANJI_GUARDIAN_TEXT_TRANSLATIONS.ko.elements[key];
}

export const GANJI_ANIMAL_MAP: Record<Ganji60, string> = {
  갑자: "쥐",
  을축: "소",
  병인: "호랑이",
  정묘: "토끼",
  무진: "용",
  기사: "뱀",
  경오: "말",
  신미: "양",
  임신: "원숭이",
  계유: "닭",
  갑술: "개",
  을해: "돼지",
  병자: "쥐",
  정축: "소",
  무인: "호랑이",
  기묘: "토끼",
  경진: "용",
  신사: "뱀",
  임오: "말",
  계미: "양",
  갑신: "원숭이",
  을유: "닭",
  병술: "개",
  정해: "돼지",
  무자: "쥐",
  기축: "소",
  경인: "호랑이",
  신묘: "토끼",
  임진: "용",
  계사: "뱀",
  갑오: "말",
  을미: "양",
  병신: "원숭이",
  정유: "닭",
  무술: "개",
  기해: "돼지",
  경자: "쥐",
  신축: "소",
  임인: "호랑이",
  계묘: "토끼",
  갑진: "용",
  을사: "뱀",
  병오: "말",
  정미: "양",
  무신: "원숭이",
  기유: "닭",
  경술: "개",
  신해: "돼지",
  임자: "쥐",
  계축: "소",
  갑인: "호랑이",
  을묘: "토끼",
  병진: "용",
  정사: "뱀",
  무오: "말",
  기미: "양",
  경신: "원숭이",
  신유: "닭",
  임술: "개",
  계해: "돼지",
};

export const SPRITE_CONFIG = {
  src: "/fuctionassets/60%EA%B0%91%EC%9E%90.webp",
  fallbackSrc: "/fuctionassets/60갑자.webp",
  imageWidth: 1055,
  imageHeight: 1491,
  gridX: 18,
  gridY: 232,
  cardWidth: 97,
  cardHeight: 176,
  pitchX: 103,
  pitchY: 224,
  columns: 10,
  rows: 6,
} as const;

export function normalizeGanji(value?: string | null): Ganji60 | null {
  if (!value) return null;

  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/일주/g, "")
    .replace(/日柱/g, "")
    .replace(/일/g, "")
    .trim();

  const found = GANJI_60.find((ganji) => cleaned.includes(ganji));
  return found ?? null;
}

export function getGanjiSpritePosition(ganji: Ganji60) {
  const index = GANJI_60.indexOf(ganji);
  const columns = SPRITE_CONFIG.columns;
  const rows = SPRITE_CONFIG.rows;

  if (index < 0) {
    return null;
  }

  return {
    index,
    row: Math.floor(index / columns),
    col: index % columns,
    columns,
    rows,
    animal: GANJI_ANIMAL_MAP[ganji],
  };
}

export function getGanjiSpriteRect(ganji: Ganji60) {
  const position = getGanjiSpritePosition(ganji);
  if (!position) return null;

  const x = SPRITE_CONFIG.gridX + position.col * SPRITE_CONFIG.pitchX;
  const rawY = SPRITE_CONFIG.gridY + position.row * SPRITE_CONFIG.pitchY;
  const maxTop = SPRITE_CONFIG.imageHeight - SPRITE_CONFIG.cardHeight;
  const y = Math.min(rawY, maxTop);

  return {
    ...position,
    x,
    y,
    width: SPRITE_CONFIG.cardWidth,
    height: SPRITE_CONFIG.cardHeight,
    src: SPRITE_CONFIG.src,
    fallbackSrc: SPRITE_CONFIG.fallbackSrc,
    imageWidth: SPRITE_CONFIG.imageWidth,
    imageHeight: SPRITE_CONFIG.imageHeight,
  };
}

export function getStemElement(ganji: Ganji60, locale?: string | null) {
  const stem = ganji[0];

  if (stem === "갑" || stem === "을") {
    return {
      key: "wood",
      label: ganjiGuardianElementLabel("wood", locale),
      gradient: "from-emerald-200 via-lime-100 to-green-50",
      border: "border-emerald-300",
      glow: "shadow-emerald-200/70",
      text: "text-emerald-700",
    };
  }

  if (stem === "병" || stem === "정") {
    return {
      key: "fire",
      label: ganjiGuardianElementLabel("fire", locale),
      gradient: "from-rose-200 via-orange-100 to-pink-50",
      border: "border-rose-300",
      glow: "shadow-rose-200/70",
      text: "text-rose-700",
    };
  }

  if (stem === "무" || stem === "기") {
    return {
      key: "earth",
      label: ganjiGuardianElementLabel("earth", locale),
      gradient: "from-amber-200 via-yellow-100 to-stone-50",
      border: "border-amber-300",
      glow: "shadow-amber-200/70",
      text: "text-amber-700",
    };
  }

  if (stem === "경" || stem === "신") {
    return {
      key: "metal",
      label: ganjiGuardianElementLabel("metal", locale),
      gradient: "from-yellow-100 via-stone-50 to-white",
      border: "border-yellow-300",
      glow: "shadow-yellow-100/80",
      text: "text-yellow-700",
    };
  }

  return {
    key: "water",
    label: ganjiGuardianElementLabel("water", locale),
    gradient: "from-sky-200 via-blue-100 to-indigo-50",
    border: "border-sky-300",
    glow: "shadow-sky-200/70",
    text: "text-blue-700",
  };
}

export function getGuardianCopy(ganji: Ganji60) {
  const animal = GANJI_ANIMAL_MAP[ganji];
  const element = getStemElement(ganji);

  return {
    title: `${ganji}일주의 ${animal} 가디언`,
    subtitle: `${element.label}의 기운을 품은 당신의 수호 동물`,
    short: `${ganji}일주의 가디언은 ${animal}의 상징을 통해 당신이 타고난 본능, 회복력, 관계 방식을 귀엽고 직관적으로 보여줍니다.`,
    traits: [
      `${animal} 가디언은 상황을 빠르게 읽고 핵심 에너지를 지키는 힘이 강합니다.`,
      `${element.label} 성향이 강하게 활성화될수록 당신의 선택은 더 선명해집니다.`,
      `관계에서는 진정성 있는 템포를 유지할 때 가장 큰 행운이 들어옵니다.`,
    ],
    caution: `${ganji}일주는 과열된 감정에서 결정을 서두르면 흐름이 흔들릴 수 있으니, 호흡을 한 번 고른 뒤 움직이는 것이 좋습니다.`,
  };
}
