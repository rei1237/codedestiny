import type { TimeThemeKey } from "./types";

export const timeThemeMap: Record<
  TimeThemeKey,
  {
    label: string;
    background: string;
    cardTint: string;
  }
> = {
  dawn: {
    label: "새벽 라벤더",
    background:
      "radial-gradient(circle at 20% 15%, rgba(254, 215, 255, 0.35), transparent 40%), linear-gradient(140deg, #6d5aa8 0%, #88a8da 52%, #b9d6ff 100%)",
    cardTint: "rgba(250, 240, 255, 0.2)",
  },
  morning: {
    label: "복숭아 아침",
    background:
      "radial-gradient(circle at 80% 10%, rgba(255, 249, 213, 0.4), transparent 42%), linear-gradient(140deg, #ffc9b8 0%, #ffe0b8 52%, #fff4d6 100%)",
    cardTint: "rgba(255, 247, 235, 0.35)",
  },
  afternoon: {
    label: "연분홍 민트",
    background:
      "radial-gradient(circle at 25% 20%, rgba(255, 212, 232, 0.3), transparent 35%), linear-gradient(135deg, #ffcadf 0%, #c5ffe4 48%, #bdf4ff 100%)",
    cardTint: "rgba(246, 255, 251, 0.3)",
  },
  sunset: {
    label: "코랄 노을",
    background:
      "radial-gradient(circle at 75% 25%, rgba(255, 218, 173, 0.4), transparent 40%), linear-gradient(140deg, #ff9ea2 0%, #ffc07a 52%, #ffd9b4 100%)",
    cardTint: "rgba(255, 245, 232, 0.34)",
  },
  night: {
    label: "네이비 별밤",
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
