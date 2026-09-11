// 음력 월·일은 결과 표시 메타데이터에만 사용한다. 숙 판정은 출생 장소·시각을
// UTC/JD로 정규화한 뒤 공통 Swiss 항성 달 황경에서 직접 계산한다.
import { calculateSukuyoForMoment } from "../../sukuyo-astronomy.js";
import { judgeDayFortune } from "../../sukuyo-relation-core.js";
import { pickExpertFields } from "../expert-evidence.js";
import { nonEmptyText, text } from "../../guardian-fortune-adapter-utils.js";

const MANSION_EXPERT_FIELDS = ["nameKo", "nameHan", "index", "direction", "element", "keywords", "strengths", "shadows", "calculationBasis", "moonSiderealLongitude"];

function dateParts(date) {
  const [year, month, day] = String(date).split("-").map(Number);
  if (![year, month, day].every(Number.isInteger)) throw new Error("SUKUYO_DATE_INVALID");
  return { year, month, day };
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
  // calculator 는 테스트 주입용으로 코어와 같은 (env, moment, options) 시그니처를 받는다.
  // 실제 서비스 경로는 항상 KST/현지시각 → UTC/JD → Swiss 항성 달 황경 코어를 탄다.
  const calculate = options.calculator || calculateSukuyoForMoment;
  const env = options.env || {};
  const calcOptions = { timeCorrectionPolicy: options.timeCorrectionPolicy };
  const place = placeParts(input, options);
  const birthMansion = await calculate(env, {
    ...dateParts(input.birthDate),
    ...timeParts(input.birthTime, 12),
    ...place,
    calendarType: input.calendarType,
    birthTimeKnown: input.hasBirthTime,
  }, calcOptions);
  const todayMansion = await calculate(env, {
    ...dateParts(input.targetDate),
    hour: 12,
    minute: 0,
    ...place,
    calendarType: "solar",
    birthTimeKnown: false,
  }, calcOptions);

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
    ...(options.fusionExpert ? { expertEvidence: {
      birth: pickExpertFields(birthMansion, MANSION_EXPERT_FIELDS),
      target: pickExpertFields(todayMansion, MANSION_EXPERT_FIELDS),
      targetDate: input.targetDate,
      dayFortune: pickExpertFields(judgeDayFortune(birthMansion?.index, todayMansion?.index), ["relationType", "aRole", "bRole", "forwardDistance", "tier", "tierLabel", "advice"]),
    } } : {}),
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
