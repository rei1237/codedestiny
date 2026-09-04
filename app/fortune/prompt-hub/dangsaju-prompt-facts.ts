import { calculateDangsajuChart, type DangsajuCalendarType } from "./dangsaju-calc";

// 프롬프트 허브 당사주 도구 전용 — 허브 입력(생년월일·양음력·출생시각)을 정본 당사주 계산기
// (dangsaju-calc.ts)에 그대로 넘겨 초년/청년/중년/말년 12성 배치를 산출하고, 프롬프트에 주입할
// 한국어 [산출 데이터] 블록으로 옮긴다. 별표·키워드·오행 규칙은 여기서 만들지 않는다.
//
// 🔴 buildDangsajuPrompt() 를 쓰지 않는 이유: 그 함수는 역할 문장·해석 원칙까지 포함한 **완성
//    프롬프트**를 내놓아서, 허브가 이미 붙이는 골격과 이중으로 겹친다. 여기서는 확정 산출값만 낸다.

export type DangsajuFactsInput = {
  birthDate: string;
  calendarType?: string;
  leapMonth?: boolean;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  question?: string;
  lifeArea?: string;
};

function calendarTypeFor(input: DangsajuFactsInput): DangsajuCalendarType {
  const key = String(input.calendarType || "").trim().toLowerCase();
  const isLunar = key === "음력" || key === "lunar";
  if (!isLunar) return "solar";
  return input.leapMonth ? "lunarLeap" : "lunar";
}

function stageLine(
  label: string,
  stage: { starName: string; branch?: string; keywords: string[]; summary: string },
) {
  const branch = stage.branch ? `${label}(${stage.branch})` : label;
  const keywords = stage.keywords.filter(Boolean).slice(0, 3).join(", ");
  const parts = [`${branch}: ${stage.starName}`];
  if (keywords) parts.push(`키워드 ${keywords}`);
  if (stage.summary) parts.push(stage.summary);
  return `- ${parts.join(" · ")}`;
}

/**
 * 당사주 프롬프트에 붙일 산출 데이터 블록. 생년월일이 비었거나 계산이 실패하면 빈 문자열을
 * 돌려주어 호출부가 조용히 골격 프롬프트로 떨어지게 한다(숙요점 빌더와 같은 계약).
 */
export function buildDangsajuPromptFacts(input: DangsajuFactsInput): string {
  try {
    if (!String(input.birthDate || "").trim()) return "";
    // 출생 시각이 비어 있으면 계산기가 예외를 던지므로 '모름' 으로 접는다.
    const timeUnknown = Boolean(input.birthTimeUnknown) || !String(input.birthTime || "").trim();
    const chart = calculateDangsajuChart({
      birthDate: String(input.birthDate).trim(),
      calendarType: calendarTypeFor(input),
      birthTime: String(input.birthTime || "").trim(),
      timeUnknown,
      question: String(input.question || "").trim(),
      // 기준일은 이 블록에 쓰이지 않는다(계산기가 결과에 그대로 담아 두기만 한다).
      baseDate: "",
    });

    const birth = chart.normalizedBirth;
    const lines: string[] = ["[당사주 산출 데이터]"];
    lines.push(
      `- 생년월일: 양력 ${birth.solarDate} / 음력 ${birth.lunarDate}${birth.isLeapMonth ? "(윤달)" : ""}`,
    );
    lines.push(
      `- 출생 시각: ${birth.birthTime || "모름"}${birth.hourBranch ? ` (시지 ${birth.hourBranch})` : ""}`,
    );
    lines.push(
      `- 사주 지지: 연 ${birth.yearBranch} · 월 ${birth.monthBranch || "미산출"} · 일 ${birth.dayBranch || "미산출"} · 시 ${birth.timeBranch || "미산출"}`,
    );
    lines.push(stageLine("초년", chart.stages.early));
    lines.push(stageLine("청년", chart.stages.youth));
    lines.push(stageLine("중년", chart.stages.middle));
    lines.push(stageLine("말년", chart.stages.later));
    lines.push(`- 핵심 흐름: ${chart.corePattern}`);
    if (chart.strengthKeywords.length) lines.push(`- 강점 키워드: ${chart.strengthKeywords.join(", ")}`);
    if (chart.cautionKeywords.length) lines.push(`- 주의 키워드: ${chart.cautionKeywords.join(", ")}`);
    if (chart.actionAdvice.increase.length) lines.push(`- 늘리면 좋은 것: ${chart.actionAdvice.increase.join(", ")}`);
    if (chart.actionAdvice.reduce.length) lines.push(`- 줄이면 좋은 것: ${chart.actionAdvice.reduce.join(", ")}`);
    if (input.lifeArea) lines.push(`- 중점 영역(입력): ${input.lifeArea}`);
    for (const warning of birth.warnings) lines.push(`- 산출 주의: ${warning}`);
    lines.push("- 산출 기준: 한국 음양력 코어로 정규화한 사주 지지 배치 기반 12성 (내부 당사주 엔진 확정값)");
    lines.push("");
    lines.push(
      "위 값은 이미 정확히 산출된 확정 데이터입니다. 12성과 지지를 다시 계산하지 말고 그대로 해석의 근거로 삼아, 시기별 흐름과 지금 질문의 자리를 이어 주세요.",
    );
    return lines.join("\n");
  } catch {
    return "";
  }
}
