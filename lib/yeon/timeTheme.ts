import type { TimeThemeKey } from "./types";

type TimeThemeLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW";

const YEON_TIME_THEME_TEXT_TRANSLATIONS: Record<TimeThemeLocale, Record<TimeThemeKey, string>> = {
  ko: {
    dawn: "새벽 라벤더",
    morning: "복숭아 아침",
    afternoon: "연분홍 민트",
    sunset: "코랄 노을",
    night: "네이비 별밤",
  },
  en: {
    dawn: "Dawn Lavender",
    morning: "Peach Morning",
    afternoon: "Blush Mint",
    sunset: "Coral Sunset",
    night: "Navy Star Night",
  },
  ja: {
    dawn: "夜明けのラベンダー",
    morning: "桃色の朝",
    afternoon: "淡紅ミント",
    sunset: "コーラルの夕暮れ",
    night: "ネイビーの星夜",
  },
  "zh-CN": {
    dawn: "拂晓薰衣草",
    morning: "蜜桃清晨",
    afternoon: "淡粉薄荷",
    sunset: "珊瑚晚霞",
    night: "海军蓝星夜",
  },
  "zh-TW": {
    dawn: "拂曉薰衣草",
    morning: "蜜桃清晨",
    afternoon: "淡粉薄荷",
    sunset: "珊瑚晚霞",
    night: "海軍藍星夜",
  },
};

function normalizeTimeThemeLocale(value?: string | null): TimeThemeLocale {
  const normalized = String(value || "").trim().replace("_", "-").toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "ja" || normalized.startsWith("ja-")) return "ja";
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk") return "zh-TW";
  return "ko";
}

export function getTimeThemeLabel(key: TimeThemeKey, locale?: string | null) {
  const lang = normalizeTimeThemeLocale(locale);
  return YEON_TIME_THEME_TEXT_TRANSLATIONS[lang][key] || YEON_TIME_THEME_TEXT_TRANSLATIONS.ko[key];
}

export const timeThemeMap: Record<
  TimeThemeKey,
  {
    label: string;
    background: string;
    cardTint: string;
  }
> = {
  dawn: {
    label: getTimeThemeLabel("dawn"),
    background:
      "radial-gradient(circle at 20% 15%, rgba(254, 215, 255, 0.35), transparent 40%), linear-gradient(140deg, #6d5aa8 0%, #88a8da 52%, #b9d6ff 100%)",
    cardTint: "rgba(250, 240, 255, 0.2)",
  },
  morning: {
    label: getTimeThemeLabel("morning"),
    background:
      "radial-gradient(circle at 80% 10%, rgba(255, 249, 213, 0.4), transparent 42%), linear-gradient(140deg, #ffc9b8 0%, #ffe0b8 52%, #fff4d6 100%)",
    cardTint: "rgba(255, 247, 235, 0.35)",
  },
  afternoon: {
    label: getTimeThemeLabel("afternoon"),
    background:
      "radial-gradient(circle at 25% 20%, rgba(255, 212, 232, 0.3), transparent 35%), linear-gradient(135deg, #ffcadf 0%, #c5ffe4 48%, #bdf4ff 100%)",
    cardTint: "rgba(246, 255, 251, 0.3)",
  },
  sunset: {
    label: getTimeThemeLabel("sunset"),
    background:
      "radial-gradient(circle at 75% 25%, rgba(255, 218, 173, 0.4), transparent 40%), linear-gradient(140deg, #ff9ea2 0%, #ffc07a 52%, #ffd9b4 100%)",
    cardTint: "rgba(255, 245, 232, 0.34)",
  },
  night: {
    label: getTimeThemeLabel("night"),
    background:
      "radial-gradient(circle at 10% 15%, rgba(181, 210, 255, 0.3), transparent 35%), radial-gradient(circle at 78% 16%, rgba(227, 196, 255, 0.22), transparent 40%), linear-gradient(145deg, #121833 0%, #2f2f61 52%, #3e4a85 100%)",
    cardTint: "rgba(25, 30, 64, 0.45)",
  },
};

export function getTimeThemeByLocalHour(date = new Date()): TimeThemeKey {
  const hour = date.getHours();
  if (hour >= 4 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "sunset";
  return "night";
}
