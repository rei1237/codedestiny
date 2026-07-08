export type FiveElement = "목" | "화" | "토" | "금" | "수";

export const FIVE_ELEMENT_TOKENS: Record<FiveElement, { color: string; soft: string; hanja: string }> = {
  목: { color: "#5fd198", soft: "rgba(95,209,152,0.16)", hanja: "木" },
  화: { color: "#f08a8a", soft: "rgba(240,138,138,0.16)", hanja: "火" },
  토: { color: "#caa45a", soft: "rgba(202,164,90,0.16)", hanja: "土" },
  금: { color: "#d9d3c1", soft: "rgba(217,211,193,0.18)", hanja: "金" },
  수: { color: "#69a7f7", soft: "rgba(105,167,247,0.16)", hanja: "水" },
};

const STEM_TO_ELEMENT: Record<string, FiveElement> = {
  갑: "목", 을: "목",
  병: "화", 정: "화",
  무: "토", 기: "토",
  경: "금", 신: "금",
  임: "수", 계: "수",
};

const BRANCH_TO_ELEMENT: Record<string, FiveElement> = {
  인: "목", 묘: "목",
  사: "화", 오: "화",
  진: "토", 술: "토", 축: "토", 미: "토",
  신: "금", 유: "금",
  해: "수", 자: "수",
};

export function elementOfStem(stem: string): FiveElement | null {
  return STEM_TO_ELEMENT[String(stem || "").trim().charAt(0)] || null;
}

export function elementOfBranch(branch: string): FiveElement | null {
  return BRANCH_TO_ELEMENT[String(branch || "").trim().charAt(0)] || null;
}

/** "갑자" 같은 2글자 간지 문자열에서 천간/지지를 분리한다. */
export function splitGanji(ganji: string): { stem: string; branch: string } {
  const trimmed = String(ganji || "").trim();
  return { stem: trimmed.charAt(0), branch: trimmed.charAt(1) };
}
