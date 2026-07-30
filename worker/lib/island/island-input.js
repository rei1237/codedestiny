// 운명의 섬 — 생년 입력 정규화(무료 blueprint / 유료 리포트 공용).
// 두 라우트가 서로 다른 기준으로 입력을 받으면 "무료는 되는데 유료는 안 되는" 어긋남이 생기므로
// 검증 규칙을 여기 한 곳에 둔다. 순수 함수 — DB·인증 의존 없음.

import { HttpError } from "../http.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isRealDate(text) {
  const match = String(text || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeGender(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "male" || text === "m") return "male";
  if (text === "female" || text === "f") return "female";
  return "";
}

export function kstDateString() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function invalidIslandInput(message) {
  return new HttpError(400, message, { error: "INVALID_INPUT" });
}

/** 생년 입력 → { chartInput, date, birthYear }. 실패 시 400 HttpError. */
export function normalizeIslandBirthInput(body) {
  const birthDate = String(body?.birthDate || "").trim();
  if (!DATE_PATTERN.test(birthDate) || !isRealDate(birthDate)) {
    throw invalidIslandInput("birthDate는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.");
  }
  const birthYear = Number(birthDate.slice(0, 4));
  if (birthYear < 1900 || birthYear > 2100) throw invalidIslandInput("지원 범위(1900~2100년)를 벗어난 생년입니다.");

  const birthTimeUnknown = body?.birthTimeUnknown === true;
  const birthTime = String(body?.birthTime || "").trim();
  if (!birthTimeUnknown && !TIME_PATTERN.test(birthTime)) {
    throw invalidIslandInput("birthTime은 HH:MM 형식이어야 합니다. 모르면 birthTimeUnknown=true로 보내주세요.");
  }

  const gender = normalizeGender(body?.gender);
  if (!gender) throw invalidIslandInput("gender는 male 또는 female이어야 합니다.");

  const calendarType = String(body?.calendarType || "solar").trim().toLowerCase() === "lunar" ? "lunar" : "solar";
  const isLeapMonth = body?.isLeapMonth === true;

  // 테스트/검증용 날짜 오버라이드(결정론 재현). 미지정 시 KST 오늘.
  let date = String(body?.date || "").trim();
  if (date) {
    if (!DATE_PATTERN.test(date) || !isRealDate(date)) throw invalidIslandInput("date는 YYYY-MM-DD 형식이어야 합니다.");
  } else {
    date = kstDateString();
  }

  return {
    chartInput: { birthDate, birthTime: birthTimeUnknown ? "" : birthTime, birthTimeUnknown, calendarType, isLeapMonth, gender },
    date,
    birthYear,
  };
}
