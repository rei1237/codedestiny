import {
  calculateMayaCalendar,
  type DateOnlyParts,
  type MayaCalendarResult,
} from "./maya-calendar";
import {
  MAYA_DAY_SIGNS,
  MAYA_TONES,
  type MayaDaySign,
  type MayaTone,
} from "./maya-data";

export type MayaReadingMode = "birth" | "daily";

export type MayaReadingResult = {
  mode: MayaReadingMode;
  calendar: MayaCalendarResult;
  daySign: MayaDaySign;
  tone: MayaTone;
  summary: string;
  strengths: string[];
  cautions: string[];
  actions: string[];
  message: string;
  relationshipFlow: string;
  workFlow: string;
  emotionFocus: string;
  avoid: string;
  timezoneLabel?: string;
};

function pickUnique(values: string[], count: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, count);
}

export function getMayaDaySign(signIndex: number): MayaDaySign {
  const sign = MAYA_DAY_SIGNS[signIndex];
  if (!sign) throw new Error("마야 날 기호를 찾지 못했습니다.");
  return sign;
}

export function getMayaTone(number: number): MayaTone {
  const tone = MAYA_TONES.find((item) => item.number === number);
  if (!tone) throw new Error("마야 13수를 찾지 못했습니다.");
  return tone;
}

export function buildMayaBirthReading(input: string | DateOnlyParts): MayaReadingResult {
  const calendar = calculateMayaCalendar(input);
  const daySign = getMayaDaySign(calendar.tzolkin.signIndex);
  const tone = getMayaTone(calendar.tzolkin.number);
  const strengths = pickUnique([...daySign.lightKeywords, ...tone.keywords], 5);
  const cautions = pickUnique(daySign.shadowKeywords, 4);

  return {
    mode: "birth",
    calendar,
    daySign,
    tone,
    summary: `${daySign.personalitySummary} ${tone.meaning} 그래서 ${calendar.tzolkin.label}의 흐름은 감각과 실행을 같은 방향으로 정렬할 때 더욱 선명하게 드러납니다.`,
    strengths,
    cautions,
    actions: [
      daySign.advice,
      tone.advice,
      "오늘부터 일주일 동안 반복할 작은 루틴 하나를 정하세요.",
    ],
    message: `${calendar.tzolkin.label}의 나왈은 당신 안의 ${daySign.symbolTitle}을 깨우며, 지금의 삶에 필요한 리듬을 부드럽게 비춥니다.`,
    relationshipFlow: daySign.relationshipPattern,
    workFlow: daySign.workPattern,
    emotionFocus: "감정이 먼저 움직일 때는 바로 결론을 내리기보다 몸의 긴장과 호흡을 함께 살피면 좋습니다.",
    avoid: cautions.length ? cautions.join(", ") : "서두른 단정",
  };
}

export function buildMayaDailyReading(
  input: string | DateOnlyParts,
  timezoneLabel?: string,
): MayaReadingResult {
  const calendar = calculateMayaCalendar(input);
  const daySign = getMayaDaySign(calendar.tzolkin.signIndex);
  const tone = getMayaTone(calendar.tzolkin.number);
  const strengths = pickUnique(daySign.lightKeywords, 4);
  const cautions = pickUnique(daySign.shadowKeywords, 4);

  return {
    mode: "daily",
    calendar,
    daySign,
    tone,
    summary: `${daySign.dailyMessage} ${tone.meaning}`,
    strengths,
    cautions,
    actions: [
      daySign.advice,
      tone.advice,
      "저녁에는 오늘의 선택 중 마음이 가장 편안했던 순간을 한 줄로 남기세요.",
    ],
    message: `${calendar.tzolkin.label}의 하루는 ${daySign.symbolTitle}을 통해 오늘의 리듬을 비춥니다.`,
    relationshipFlow: daySign.relationshipPattern,
    workFlow: daySign.workPattern,
    emotionFocus: "감정의 속도가 빨라지면 바로 반응하기보다 한 박자 늦게 답하는 편이 흐름을 지킵니다.",
    avoid: cautions[0] || "서두른 단정",
    timezoneLabel,
  };
}

export function formatMayaResultForCopy(result: MayaReadingResult): string {
  const modeLabel = result.mode === "birth" ? "내 마야 나왈" : "오늘의 마야점";
  return [
    `마야점 · ${modeLabel}`,
    `기준 날짜: ${result.calendar.gregorianDate}${result.timezoneLabel ? ` (${result.timezoneLabel})` : ""}`,
    `Tzolk’in: ${result.calendar.tzolkin.label} · ${result.daySign.koreanName}`,
    `Haab: ${result.calendar.haab.label}`,
    `Long Count: ${result.calendar.longCount.label}`,
    `핵심 키워드: ${result.daySign.coreKeywords.join(", ")}`,
    `흐름: ${result.summary}`,
    `맞는 행동: ${result.actions.join(" / ")}`,
    `한 줄 메시지: ${result.message}`,
    "계산 기준: GMT 584283 · Tzolk’in / Haab / Long Count · LLM 미사용",
  ].join("\n");
}
