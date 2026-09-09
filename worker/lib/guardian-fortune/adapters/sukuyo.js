// 음력 월·일은 결과 표시 메타데이터에만 사용한다. 숙 판정은 출생 장소·시각을
// UTC/JD로 정규화한 뒤 공통 Swiss 항성 달 황경에서 직접 계산한다.
import { solarToLunar } from "../../../../lib/korean-calendar/index.js";
import { buildSukuyoFromMoonLongitude, calculateSukuyoForMoment } from "../../sukuyo-astronomy.js";
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

function timeParts(value, fallbackHour = 12) {
  const [hour, minute] = String(value || `${String(fallbackHour).padStart(2, "0")}:00`).split(":").map(Number);
  return { hour: Number.isInteger(hour) ? hour : fallbackHour, minute: Number.isInteger(minute) ? minute : 0 };
}

function placeParts(input, options) {
  const place = input.birthPlace || {};
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone || options.timezone || "Asia/Seoul",
    birthPlace: place.city || place.name || undefined,
  };
}

export async function buildSukuyoAdapter(input, options = {}) {
  // calculator 는 테스트/명시적 어댑터 주입용이다. 실제 서비스 경로는 항상
  // KST/현지시각 → UTC/JD → Swiss 항성 달 황경 코어를 탄다.
  const calculate = options.calculator;
  const place = placeParts(input, options);
  const birthClock = timeParts(input.birthTime, 12);
  const birthDate = dateParts(input.birthDate);
  const targetDate = dateParts(input.targetDate);
  let birthMansion;
  let todayMansion;
  if (calculate) {
    const birth = lunarPartsForDate(input.birthDate, input.calendarType);
    const today = lunarPartsForDate(input.targetDate, "solar");
    birthMansion = await calculate(birth.lunarMonth, birth.lunarDay, {
      isLeapMonth: birth.isLeapMonth,
      source: "swiss-ephemeris-lahiri",
      moonLongitude: options.birthMoonLongitude,
    });
    todayMansion = await calculate(today.lunarMonth, today.lunarDay, {
      isLeapMonth: today.isLeapMonth,
      source: "swiss-ephemeris-lahiri",
      moonLongitude: options.targetMoonLongitude,
    });
  } else {
    birthMansion = await calculateSukuyoForMoment(options.env || {}, {
      ...birthDate,
      ...birthClock,
      ...place,
      calendarType: input.calendarType,
      birthTimeKnown: input.hasBirthTime,
    }, { timeCorrectionPolicy: options.timeCorrectionPolicy });
    todayMansion = await calculateSukuyoForMoment(options.env || {}, {
      ...targetDate,
      hour: 12,
      minute: 0,
      ...place,
      calendarType: "solar",
      birthTimeKnown: false,
    }, { timeCorrectionPolicy: options.timeCorrectionPolicy });
  }

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
