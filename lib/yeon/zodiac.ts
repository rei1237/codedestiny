import type { ZodiacSign } from "./types";

export const zodiacList: Array<{ sign: ZodiacSign; icon: string; dateRange: string }> = [
  { sign: "양자리", icon: "♈", dateRange: "03.21 - 04.19" },
  { sign: "황소자리", icon: "♉", dateRange: "04.20 - 05.20" },
  { sign: "쌍둥이자리", icon: "♊", dateRange: "05.21 - 06.21" },
  { sign: "게자리", icon: "♋", dateRange: "06.22 - 07.22" },
  { sign: "사자자리", icon: "♌", dateRange: "07.23 - 08.22" },
  { sign: "처녀자리", icon: "♍", dateRange: "08.23 - 09.23" },
  { sign: "천칭자리", icon: "♎", dateRange: "09.24 - 10.22" },
  { sign: "전갈자리", icon: "♏", dateRange: "10.23 - 11.22" },
  { sign: "사수자리", icon: "♐", dateRange: "11.23 - 12.24" },
  { sign: "염소자리", icon: "♑", dateRange: "12.25 - 01.19" },
  { sign: "물병자리", icon: "♒", dateRange: "01.20 - 02.18" },
  { sign: "물고기자리", icon: "♓", dateRange: "02.19 - 03.20" },
];

export function getZodiacFromBirthDate(dateText?: string): ZodiacSign | null {
  if (!dateText) return null;
  const match = String(dateText).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;

  const mmdd = month * 100 + day;

  if (mmdd >= 321 && mmdd <= 419) return "양자리";
  if (mmdd >= 420 && mmdd <= 520) return "황소자리";
  if (mmdd >= 521 && mmdd <= 621) return "쌍둥이자리";
  if (mmdd >= 622 && mmdd <= 722) return "게자리";
  if (mmdd >= 723 && mmdd <= 822) return "사자자리";
  if (mmdd >= 823 && mmdd <= 923) return "처녀자리";
  if (mmdd >= 924 && mmdd <= 1022) return "천칭자리";
  if (mmdd >= 1023 && mmdd <= 1122) return "전갈자리";
  if (mmdd >= 1123 && mmdd <= 1224) return "사수자리";
  if (mmdd >= 1225 || mmdd <= 119) return "염소자리";
  if (mmdd >= 120 && mmdd <= 218) return "물병자리";
  return "물고기자리";
}
