import { buildKuseiPromptPayload, type KuseiCalendarType, type NineStar } from "./kusei-calc";

// 프롬프트 허브 구성기학 도구 전용 — 허브 입력을 정본 구성기학 계산기(kusei-calc.ts)에 넘겨
// 본명성·월명성·현재 기학 흐름을 산출하고, 프롬프트에 주입할 한국어 [산출 데이터] 블록을 만든다.
// 절기 경계·구궁 배치 규칙은 여기서 만들지 않고 계산기의 확정값을 그대로 옮긴다.
//
// 🔴 buildKuseiPromptText() 를 쓰지 않는 이유: 그 함수는 역할 문장·답변 구조까지 담은 **완성
//    프롬프트**라서 허브 골격과 겹친다. 여기서는 산출값만 낸다.

export type KuseiFactsInput = {
  birthDate: string;
  calendarType?: string;
  leapMonth?: boolean;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthTimezone?: string;
  baseDate?: string;
  focusTopic?: string;
  question?: string;
};

function calendarTypeFor(value: string | undefined): KuseiCalendarType {
  const key = String(value || "").trim().toLowerCase();
  return key === "음력" || key === "lunar" ? "lunar" : "solar";
}

function parseHourMinute(value: string | undefined) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function starLabel(star: NineStar | null | undefined) {
  if (!star) return "미산출";
  const keywords = Array.isArray(star.keywords) ? star.keywords.slice(0, 3).join(", ") : "";
  const base = `${star.number}${star.koreanName}(${star.kanjiName}) · ${star.element}`;
  return keywords ? `${base} · 키워드 ${keywords}` : base;
}

/**
 * 구성기학 프롬프트에 붙일 산출 데이터 블록. 생년월일이 비었거나 계산이 실패하면 빈 문자열을
 * 돌려주어 호출부가 조용히 골격 프롬프트로 떨어지게 한다(숙요점 빌더와 같은 계약).
 */
export function buildKuseiPromptFacts(input: KuseiFactsInput): string {
  try {
    const birthDate = String(input.birthDate || "").trim();
    if (!birthDate) return "";
    const time = input.birthTimeUnknown ? null : parseHourMinute(input.birthTime);
    const baseDate = String(input.baseDate || "").trim();

    const payload = buildKuseiPromptPayload({
      // 🔴 성별은 이 엔진의 산출값에 전혀 쓰이지 않는다 — 본명성·월명성·현재 기학 흐름 모두
      //    생년월일과 절기만 본다(gender 는 buildKuseiPromptText 의 문장에만 등장). 허브 구성기학
      //    도구에는 성별 필드가 없고 validate 는 truthy 만 요구하므로 자리표시자를 넣고,
      //    산출 데이터에는 출력하지 않는다.
      gender: "male",
      birthDate,
      calendarType: calendarTypeFor(input.calendarType),
      isLeapMonth: Boolean(input.leapMonth),
      birthTimeKnown: Boolean(time),
      birthHour: time?.hour,
      birthMinute: time?.minute,
      timezone: String(input.birthTimezone || "").trim() || "Asia/Seoul",
      focusTopic: String(input.focusTopic || "").trim() || undefined,
      userQuestion: String(input.question || "").trim() || undefined,
      currentDateTime: baseDate || undefined,
    });
    const calc = payload.calculation;

    const lines: string[] = ["[구성기학 산출 데이터]"];
    lines.push(`- 생년월일(양력 환산): ${calc.solarBirthDate} · 출생 시각 ${calc.birthTimeLabel}`);
    lines.push(`- 기학 연도: ${calc.effectiveYear}년${calc.lichunAt ? ` (입춘 ${calc.lichunAt} 기준)` : ""}`);
    lines.push(`- 본명성: ${starLabel(calc.honmeiStar)}`);
    lines.push(`- 월명성: ${starLabel(calc.getsumeiStar)}`);
    lines.push(
      `- 기학 월: ${calc.kigakuMonthNo ? `${calc.kigakuMonthNo}월 기운 / 월지 ${calc.monthBranch || "미산출"} (${calc.monthStartSolarTerm}~${calc.monthEndSolarTerm})` : "미산출"}`,
    );
    lines.push(`- 본명성-월명성 관계: ${calc.honmeiToGetsumeiRelation}`);
    if (baseDate) lines.push(`- 분석 기준일(입력): ${baseDate}`);
    if (calc.currentYearStar) {
      lines.push(`- 기준일의 연반 중궁성: ${starLabel(calc.currentYearStar)} (기학 ${calc.currentKigakuYear}년)`);
    }
    if (calc.currentMonthStar) {
      lines.push(`- 기준일의 월반 중궁성: ${starLabel(calc.currentMonthStar)}`);
    }
    if (calc.honmeiToCurrentYearRelation) lines.push(`- 본명성-연반 관계: ${calc.honmeiToCurrentYearRelation}`);
    if (calc.honmeiToCurrentMonthRelation) lines.push(`- 본명성-월반 관계: ${calc.honmeiToCurrentMonthRelation}`);
    lines.push(`- 일명성·시명성: ${calc.dayStar} — ${calc.dayHourStarPolicy}`);
    for (const warning of calc.warnings) lines.push(`- 산출 주의: ${warning}`);
    lines.push(`- 산출 기준: ${calc.solarTermSource} (내부 구성기학 엔진 확정값)`);
    lines.push("");
    lines.push(
      "위 값은 이미 정확히 산출된 확정 데이터입니다. 본명성·월명성·중궁성을 다시 계산하지 말고 그대로 근거로 삼아, 방위와 시기의 선택지를 풀어 주세요. 일명성·시명성처럼 미산출로 표시된 항목은 지어내지 말고 미산출로 두세요.",
    );
    return lines.join("\n");
  } catch {
    return "";
  }
}
