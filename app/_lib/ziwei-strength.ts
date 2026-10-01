// 별 강약(廟旺得利平不陷)은 정본 lib/ziwei-star-strength.js 의 starStrength 를 그대로 읽는다
// (『紫微斗數全書』 권3 우선, 원전이 비운 칸만 iztro). 꿀꿀 셸·워커 프롬프트와 같은 값이다.
// 7등급을 접지 않는다(묘≠왕, 불≠평≠함). 표에 없는 별(좌보·우필·녹존·천괴·천월·천마·지공·지겁 등)은
// 강약을 매기지 않는다 — 글자도 붙이지 않는다. 강약은 길흉이 아니라 그 별의 성질이 얼마나 또렷하게 드러나는가다.
import { starStrength } from "../../lib/ziwei-star-strength.js";

export type ZiweiStrengthSymbol = "廟" | "旺" | "得" | "利" | "平" | "不" | "陷" | "";
export type ZiweiClassicStrength = "묘" | "왕" | "득" | "리" | "평" | "불" | "함" | "";

type Grade = Exclude<ZiweiClassicStrength, "">;

const GRADE_GLYPH: Record<Grade, Exclude<ZiweiStrengthSymbol, "">> = {
  묘: "廟",
  왕: "旺",
  득: "得",
  리: "利",
  평: "平",
  불: "不",
  함: "陷",
};

// 하나로 정해지는 표기만 받는다. 옛 5기호(◎ O ▲ △ X)는 저장된 옛 명반이 아직 들고 있으므로 받아들인다 —
// 옛 기호는 일곱 등급을 다섯으로 접었으므로 원래 이름(◎=묘, O=득, ▲=리, △=평, X=함)으로 읽는다.
const GRADE_BY_TOKEN: Record<string, Grade> = {
  묘: "묘", 廟: "묘", 庙: "묘", 묘지: "묘", "◎": "묘",
  왕: "왕", 旺: "왕", 왕지: "왕",
  득: "득", 得: "득", 得地: "득", 득지: "득", O: "득", "○": "득", "◉": "득",
  리: "리", 利: "리", 리지: "리", "▲": "리",
  평: "평", 平: "평", 평지: "평", "△": "평",
  불: "불", 不: "불", 不得地: "불",
  함: "함", 陷: "함", 함지: "함", X: "함", x: "함", "×": "함",
};

/** 강약 표기 → 7등급 이름. 모르는 표기는 '' — 없는 강약을 만들지 않는다. */
export function normalizeZiweiClassicStrength(raw: string | undefined): ZiweiClassicStrength {
  return GRADE_BY_TOKEN[String(raw || "").trim()] || "";
}

/** 7등급 이름(또는 아는 표기) → 화면 글자(한자 한 글자). 모르면 ''. */
export function ziweiClassicStrengthToSymbol(level: string | undefined): ZiweiStrengthSymbol {
  const grade = normalizeZiweiClassicStrength(level);
  return grade ? GRADE_GLYPH[grade] : "";
}

/** 별 하나의 강약. branchIndex 는 子=0 … 亥=11. 강약을 매기지 않는 별·앉지 못하는 자리는 빈 값. */
export function ziweiStarStrength(star: string, branchIndex: number): { strength: ZiweiClassicStrength; symbol: ZiweiStrengthSymbol } {
  const result = starStrength(star, ((branchIndex % 12) + 12) % 12);
  const grade = result.status === "rated" ? normalizeZiweiClassicStrength(result.rawKo || "") : "";
  return grade ? { strength: grade, symbol: GRADE_GLYPH[grade] } : { strength: "", symbol: "" };
}
