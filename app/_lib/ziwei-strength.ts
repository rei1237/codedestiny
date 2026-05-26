export type ZiweiStrengthSymbol = "◎" | "O" | "▲" | "△" | "X" | "";
export type ZiweiClassicStrength = "묘" | "왕" | "득" | "리" | "평" | "함" | "실" | "";

export function mapZiweiStrengthSymbol(brightness: string | undefined | null): "◎" | "O" | "▲" | "△" | "X" {
  const value = String(brightness ?? "").trim();

  if (value === "묘" || value === "왕") return "◎";
  if (value === "득") return "O";
  if (value === "리") return "▲";
  if (value === "평") return "△";
  if (value === "함" || value === "실") return "X";

  return "△";
}

const BRANCH_ALIAS_TO_HAN: Record<string, string> = {
  자: "子",
  축: "丑",
  인: "寅",
  묘: "卯",
  진: "辰",
  사: "巳",
  오: "午",
  미: "未",
  신: "申",
  유: "酉",
  술: "戌",
  해: "亥",
  子: "子",
  丑: "丑",
  寅: "寅",
  卯: "卯",
  辰: "辰",
  巳: "巳",
  午: "午",
  未: "未",
  申: "申",
  酉: "酉",
  戌: "戌",
  亥: "亥",
};

export function normalizeZiweiBranchToHan(branch: string | undefined): string {
  const v = String(branch || "").trim();
  return BRANCH_ALIAS_TO_HAN[v] || "";
}

export function normalizeZiweiClassicStrength(raw: string | undefined): ZiweiClassicStrength {
  const v = String(raw || "").trim();
  if (!v) return "";

  if (["묘", "묘왕", "묘왕지", "廟"].includes(v) || v === "◎") return "묘";
  if (["왕", "旺"].includes(v)) return "왕";
  if (["득", "득지", "得"].includes(v) || v === "○" || v === "O") return "득";
  if (["리", "리지", "利", "약"].includes(v) || v === "▲") return "리";
  if (["평", "평지", "平"].includes(v) || v === "△") return "평";
  if (["실"].includes(v)) return "실";
  if (["함", "함지", "陷", "극함", "심한함", "불", "불리", "충돌"].includes(v) || v === "×" || /^x$/i.test(v) || v === "X") return "함";
  if (["한", "이"].includes(v)) return "평";

  return "";
}

export function ziweiClassicStrengthFromSymbol(raw: string | undefined): ZiweiClassicStrength {
  const s = String(raw || "").trim();
  if (s === "◎") return "묘";
  if (s === "○" || s === "O") return "득";
  if (s === "▲") return "리";
  if (s === "△") return "평";
  if (s === "×" || /^x$/i.test(s)) return "함";
  return "";
}

export function ziweiClassicStrengthToSymbol(level: string | undefined): ZiweiStrengthSymbol {
  const normalized = normalizeZiweiClassicStrength(level);
  if (!normalized) return "";
  return mapZiweiStrengthSymbol(normalized);
}

export const ZIWEI_CLASSICAL_STATE: Record<string, Record<string, string>> = {
  자미: { 子: "평", 丑: "묘", 寅: "왕", 卯: "왕", 辰: "묘", 巳: "평", 午: "묘", 未: "묘", 申: "평", 酉: "평", 戌: "묘", 亥: "평" },
  천기: { 子: "평", 丑: "함", 寅: "왕", 卯: "왕", 辰: "평", 巳: "리", 午: "함", 未: "평", 申: "묘", 酉: "왕", 戌: "평", 亥: "묘" },
  태양: { 子: "함", 丑: "함", 寅: "묘", 卯: "묘", 辰: "왕", 巳: "왕", 午: "묘", 未: "왕", 申: "평", 酉: "함", 戌: "함", 亥: "함" },
  무곡: { 子: "묘", 丑: "왕", 寅: "리", 卯: "평", 辰: "묘", 巳: "평", 午: "평", 未: "평", 申: "왕", 酉: "묘", 戌: "함", 亥: "리" },
  천동: { 子: "왕", 丑: "함", 寅: "평", 卯: "묘", 辰: "함", 巳: "평", 午: "함", 未: "묘", 申: "평", 酉: "평", 戌: "리", 亥: "왕" },
  염정: { 子: "평", 丑: "평", 寅: "묘", 卯: "평", 辰: "묘", 巳: "함", 午: "묘", 未: "묘", 申: "묘", 酉: "평", 戌: "평", 亥: "평" },
  천부: { 子: "묘", 丑: "묘", 寅: "왕", 卯: "평", 辰: "묘", 巳: "평", 午: "묘", 未: "묘", 申: "왕", 酉: "평", 戌: "묘", 亥: "평" },
  태음: { 子: "왕", 丑: "묘", 寅: "평", 卯: "평", 辰: "함", 巳: "함", 午: "함", 未: "평", 申: "평", 酉: "묘", 戌: "묘", 亥: "왕" },
  탐랑: { 子: "왕", 丑: "평", 寅: "묘", 卯: "리", 辰: "평", 巳: "묘", 午: "왕", 未: "평", 申: "묘", 酉: "묘", 戌: "평", 亥: "묘" },
  거문: { 子: "왕", 丑: "묘", 寅: "평", 卯: "함", 辰: "함", 巳: "묘", 午: "함", 未: "묘", 申: "묘", 酉: "평", 戌: "함", 亥: "묘" },
  천상: { 子: "묘", 丑: "묘", 寅: "왕", 卯: "평", 辰: "왕", 巳: "리", 午: "묘", 未: "묘", 申: "왕", 酉: "평", 戌: "묘", 亥: "평" },
  천량: { 子: "평", 丑: "묘", 寅: "묘", 卯: "묘", 辰: "묘", 巳: "평", 午: "묘", 未: "함", 申: "묘", 酉: "평", 戌: "묘", 亥: "함" },
  칠살: { 子: "묘", 丑: "평", 寅: "묘", 卯: "평", 辰: "왕", 巳: "평", 午: "묘", 未: "왕", 申: "묘", 酉: "평", 戌: "묘", 亥: "평" },
  파군: { 子: "왕", 丑: "함", 寅: "묘", 卯: "함", 辰: "묘", 巳: "함", 午: "왕", 未: "함", 申: "함", 酉: "함", 戌: "묘", 亥: "리" },
  좌보: { 子: "왕", 丑: "묘", 寅: "왕", 卯: "묘", 辰: "묘", 巳: "리", 午: "왕", 未: "묘", 申: "왕", 酉: "리", 戌: "왕", 亥: "리" },
  우필: { 子: "왕", 丑: "묘", 寅: "왕", 卯: "리", 辰: "왕", 巳: "리", 午: "왕", 未: "묘", 申: "왕", 酉: "리", 戌: "묘", 亥: "리" },
  문창: { 子: "리", 丑: "왕", 寅: "묘", 卯: "왕", 辰: "왕", 巳: "왕", 午: "리", 未: "왕", 申: "묘", 酉: "왕", 戌: "리", 亥: "왕" },
  문곡: { 子: "리", 丑: "왕", 寅: "묘", 卯: "왕", 辰: "리", 巳: "왕", 午: "리", 未: "왕", 申: "리", 酉: "왕", 戌: "리", 亥: "왕" },
  녹존: { 子: "묘", 丑: "왕", 寅: "리", 卯: "왕", 辰: "리", 巳: "리", 午: "왕", 未: "왕", 申: "리", 酉: "왕", 戌: "리", 亥: "리" },
  천괴: { 子: "평", 丑: "평", 寅: "왕", 卯: "평", 辰: "평", 巳: "평", 午: "왕", 未: "평", 申: "왕", 酉: "평", 戌: "평", 亥: "평" },
  천월: { 子: "평", 丑: "평", 寅: "평", 卯: "평", 辰: "평", 巳: "평", 午: "평", 未: "리", 申: "묘", 酉: "리", 戌: "평", 亥: "평" },
  천마: { 子: "왕", 丑: "리", 寅: "묘", 卯: "리", 辰: "왕", 巳: "리", 午: "묘", 未: "리", 申: "왕", 酉: "리", 戌: "묘", 亥: "리" },
  경양: { 子: "리", 丑: "리", 寅: "왕", 卯: "묘", 辰: "왕", 巳: "리", 午: "리", 未: "리", 申: "왕", 酉: "묘", 戌: "묘", 亥: "리" },
  타라: { 子: "리", 丑: "리", 寅: "리", 卯: "왕", 辰: "묘", 巳: "함", 午: "리", 未: "리", 申: "함", 酉: "리", 戌: "왕", 亥: "리" },
  화성: { 子: "리", 丑: "왕", 寅: "왕", 卯: "리", 辰: "왕", 巳: "리", 午: "리", 未: "평", 申: "왕", 酉: "함", 戌: "왕", 亥: "리" },
  영성: { 子: "리", 丑: "리", 寅: "묘", 卯: "묘", 辰: "왕", 巳: "리", 午: "리", 未: "리", 申: "왕", 酉: "함", 戌: "왕", 亥: "리" },
  지공: { 子: "리", 丑: "리", 寅: "리", 卯: "왕", 辰: "묘", 巳: "묘", 午: "리", 未: "리", 申: "리", 酉: "왕", 戌: "묘", 亥: "왕" },
  지겁: { 子: "리", 丑: "리", 寅: "리", 卯: "리", 辰: "리", 巳: "평", 午: "리", 未: "리", 申: "리", 酉: "왕", 戌: "묘", 亥: "왕" },
};

export function getZiweiClassicalStrength(starName: string, branch: string): ZiweiClassicStrength {
  const zhi = normalizeZiweiBranchToHan(branch);
  if (!zhi) return "";
  const table = ZIWEI_CLASSICAL_STATE[String(starName || "").trim()];
  if (!table) return "";
  return normalizeZiweiClassicStrength(table[zhi]);
}
