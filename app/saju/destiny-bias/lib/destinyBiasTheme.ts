export const destinyBiasTheme = {
  colors: {
    bgDeep: "#070314",
    bgPurple: "#16072e",
    neonPink: "#ff4fd8",
    neonViolet: "#8b5cf6",
    auroraCyan: "#22d3ee",
    chromeSilver: "#f8fafc",
    softGold: "#facc15",
  },
  gradients: {
    aurora: "linear-gradient(135deg, #ff4fd8, #8b5cf6, #22d3ee)",
    chrome: "linear-gradient(135deg, #ffffff, #f0abfc, #93c5fd, #ffffff)",
    midnight: "linear-gradient(180deg, #10051f, #05020d)",
  },
} as const;

export type DestinyBiasThemeChoice = {
  key: string;
  name: string;
  premium: boolean;
  description: string;
  preview: string;
};

type DestinyBiasThemeLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW";

const DESTINY_BIAS_THEME_TEXT_TRANSLATIONS: Record<DestinyBiasThemeLocale, Record<string, string>> = {
  ko: {
    moonlight_neon: "오로라 빛이 흐르는 유리 포토카드",
    gold_nocturne: "실버 크롬 테두리와 별빛 반사",
    coral_haze: "핑크 스티커 감성 탑꾸 에디션",
    skywave_mint: "콘서트 무대의 딥 블루 네온",
    jade_orbit: "민트 펄이 도는 편지형 포토카드",
  },
  en: {
    moonlight_neon: "A glass photocard washed in aurora light",
    gold_nocturne: "Silver chrome edges with starlit reflections",
    coral_haze: "A pink sticker-style top-loader edition",
    skywave_mint: "Deep blue neon from a concert stage",
    jade_orbit: "A letter-style photocard with mint pearl light",
  },
  ja: {
    moonlight_neon: "オーロラの光が流れるガラス風フォトカード",
    gold_nocturne: "シルバークロムの縁取りと星明かりの反射",
    coral_haze: "ピンクステッカー感覚のトプク風エディション",
    skywave_mint: "コンサートステージのディープブルーネオン",
    jade_orbit: "ミントパールが漂う手紙風フォトカード",
  },
  "zh-CN": {
    moonlight_neon: "流淌极光色彩的玻璃感小卡",
    gold_nocturne: "银色铬边与星光反射",
    coral_haze: "粉色贴纸风小卡装饰版",
    skywave_mint: "演唱会舞台般的深蓝霓虹",
    jade_orbit: "带着薄荷珍珠光的信件式小卡",
  },
  "zh-TW": {
    moonlight_neon: "流動極光色彩的玻璃感小卡",
    gold_nocturne: "銀色鉻邊與星光反射",
    coral_haze: "粉色貼紙風小卡裝飾版",
    skywave_mint: "演唱會舞台般的深藍霓虹",
    jade_orbit: "帶著薄荷珍珠光的信件式小卡",
  },
};

const DESTINY_BIAS_THEME_BASE_CHOICES = [
  {
    key: "moonlight_neon",
    name: "Aurora Glass",
    premium: false,
    preview: "linear-gradient(135deg, rgba(255,79,216,0.95), rgba(139,92,246,0.9), rgba(34,211,238,0.92))",
  },
  {
    key: "gold_nocturne",
    name: "Chrome Star",
    premium: true,
    preview: "linear-gradient(135deg, rgba(248,250,252,0.92), rgba(251,207,232,0.86), rgba(191,219,254,0.9))",
  },
  {
    key: "coral_haze",
    name: "Pink Top-kku",
    premium: false,
    preview: "linear-gradient(135deg, rgba(255,126,227,0.95), rgba(251,113,133,0.92), rgba(192,132,252,0.9))",
  },
  {
    key: "skywave_mint",
    name: "Midnight Stage",
    premium: true,
    preview: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(59,130,246,0.86), rgba(34,211,238,0.84))",
  },
  {
    key: "jade_orbit",
    name: "Soft Fan Letter",
    premium: true,
    preview: "linear-gradient(135deg, rgba(209,250,229,0.96), rgba(167,243,208,0.88), rgba(147,197,253,0.8))",
  },
] as const;

function normalizeDestinyBiasThemeLocale(value?: string | null): DestinyBiasThemeLocale {
  const normalized = String(value || "").trim().replace("_", "-").toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "ja" || normalized.startsWith("ja-")) return "ja";
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk") return "zh-TW";
  return "ko";
}

export function getDestinyBiasThemeChoices(locale?: string | null): DestinyBiasThemeChoice[] {
  const lang = normalizeDestinyBiasThemeLocale(locale);
  const descriptions = DESTINY_BIAS_THEME_TEXT_TRANSLATIONS[lang] || DESTINY_BIAS_THEME_TEXT_TRANSLATIONS.ko;
  return DESTINY_BIAS_THEME_BASE_CHOICES.map((choice) => ({
    ...choice,
    description: descriptions[choice.key] || DESTINY_BIAS_THEME_TEXT_TRANSLATIONS.ko[choice.key] || "",
  }));
}

export const destinyBiasThemeChoices: DestinyBiasThemeChoice[] = getDestinyBiasThemeChoices();
