// 🔴 음력일은 한국 음양력 코어에서만 나온다. lunar-javascript 는 **중국 표준시(CST) 기준 중국 음력**이라
// 삭이 CST 23시대에 들면 그 달 전체의 음력일이 하루 밀린다 — 실측 2026-08-27 기준 1900~2100 전수
// 73,414일 중 2,997일(4.08%)이 갈린다. 27수는 음력 월·일로 직접 결정되므로 그 하루가 곧 다른 수(宿)다.
import { solarToLunar } from "../../../../lib/korean-calendar/index.js";
import { buildSukuyoFromLunar } from "../../sukuyo-ai-calculation.js";
import { nonEmptyText, text } from "../../guardian-fortune-adapter-utils.js";

function dateParts(date) {
  const [year, month, day] = String(date).split("-").map(Number);
  if (![year, month, day].every(Number.isInteger)) throw new Error("SUKUYO_DATE_INVALID");
  return { year, month, day };
}

function lunarPartsForDate(date, calendarType) {
  const parts = dateParts(date);
  if (calendarType === "lunar") {
    return { lunarMonth: parts.month, lunarDay: parts.day, isLeapMonth: false };
  }
  const lunar = solarToLunar(parts.year, parts.month, parts.day);
  if (!lunar) throw new Error("SUKUYO_DATE_OUT_OF_RANGE");
  return {
    lunarMonth: lunar.lunarMonth,
    lunarDay: lunar.lunarDay,
    isLeapMonth: lunar.isLeapMonth,
  };
}

function mansionLabel(mansion) {
  return nonEmptyText(mansion?.nameKo || mansion?.name || mansion?.nameHan, 80);
}

export function buildSukuyoAdapter(input, options = {}) {
  const calculate = options.calculator || buildSukuyoFromLunar;
  const birth = lunarPartsForDate(input.birthDate, input.calendarType);
  const today = lunarPartsForDate(input.targetDate, "solar");
  const birthMansion = calculate(birth.lunarMonth, birth.lunarDay, {
    isLeapMonth: birth.isLeapMonth,
    source: "korean-calendar-core",
  });
  const todayMansion = calculate(today.lunarMonth, today.lunarDay, {
    isLeapMonth: today.isLeapMonth,
    source: "korean-calendar-core",
  });

  const birthLabel = mansionLabel(birthMansion);
  const todayLabel = mansionLabel(todayMansion);
  if (!birthLabel && !todayLabel) {
    const error = new Error("SUKUYO_PROJECTION_EMPTY");
    error.code = "SUKUYO_PROJECTION_EMPTY";
    throw error;
  }

  const keywords = [
    ...(Array.isArray(birthMansion?.keywords) ? birthMansion.keywords : []),
    ...(Array.isArray(todayMansion?.keywords) ? todayMansion.keywords : []),
  ].map((item) => text(item, 40)).filter(Boolean).slice(0, 4);
  const keywordHint = keywords.length ? ` ${keywords.join(", ")}의 결이 함께 보입니다.` : "";

  return {
    birthMansion: birthLabel,
    todayMansion: todayLabel,
    emotionalPattern: `감정이 움직일 때 표정이나 말투로 분위기를 먼저 조절하려는 흐름${keywordHint}`,
    relationshipPattern: input.topic === "love" || input.topic === "relationship"
      ? "가까워지고 싶은 마음과 안전한 거리를 남겨두려는 마음이 함께 작동할 수 있습니다."
      : "관계에서는 상대의 반응을 살피면서 자신의 속도를 조절하는 패턴이 나타납니다.",
    distancePattern: todayLabel
      ? `오늘의 숙 ${todayLabel} 흐름에서는 빠른 결론보다 서로의 간격을 확인하는 방식이 어울립니다.`
      : "확신을 재촉하기보다 관계의 간격을 관찰하는 편이 좋습니다.",
    evidence: [
      birthLabel ? "sukuyo.birthMansion" : null,
      todayLabel ? "sukuyo.todayMansion" : null,
      "sukuyo.relationshipPattern",
    ].filter(Boolean),
  };
}
