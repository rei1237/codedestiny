// AI 반려동물 사주 — 프로필 입력 정규화(무료 blueprint / 유료 리포트·궁합 공용).
// 두 라우트가 서로 다른 기준으로 입력을 받으면 "무료는 되는데 유료는 안 되는" 어긋남이 생기므로
// 검증 규칙을 여기 한 곳에 둔다. 순수 함수 — DB·인증 의존 없음.

import { HttpError } from "../http.js";
import { fnv1a32 } from "../island/island-weights.js";
import {
  ACTIVITY_LEVELS,
  COMPANION_TABLE,
  ENVIRONMENT_TABLE,
  GENERIC_BREED_KEY,
  TRAIT_TABLE,
  getBreed,
  getSpecies,
} from "./pet-elements.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MAX_NAME_LENGTH = 20;
const MAX_TRAITS = 10;

function isRealDate(text) {
  const match = String(text || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function kstDateString() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function invalidPetInput(message) {
  return new HttpError(400, message, { error: "INVALID_INPUT" });
}

function normalizeGender(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "male" || text === "m") return "male";
  if (text === "female" || text === "f") return "female";
  return "unknown";
}

/** 반려동물 프로필 → 정규화 입력. 실패 시 400 HttpError. */
export function normalizePetProfile(raw, label = "프로필") {
  const body = raw && typeof raw === "object" ? raw : {};

  const species = String(body.species || "").trim();
  if (!getSpecies(species)) throw invalidPetInput(`${label}: 지원하지 않는 종(species)입니다.`);

  const breedRaw = String(body.breed || "").trim() || GENERIC_BREED_KEY;
  const breed = getBreed(species, breedRaw) ? breedRaw : GENERIC_BREED_KEY;

  const birthDate = String(body.birthDate || "").trim();
  if (!DATE_PATTERN.test(birthDate) || !isRealDate(birthDate)) {
    throw invalidPetInput(`${label}: birthDate는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.`);
  }
  const birthYear = Number(birthDate.slice(0, 4));
  if (birthYear < 1900 || birthYear > 2100) throw invalidPetInput(`${label}: 지원 범위(1900~2100년)를 벗어난 생년입니다.`);

  const birthTimeUnknown = body.birthTimeUnknown === true || !String(body.birthTime || "").trim();
  const birthTime = String(body.birthTime || "").trim();
  if (!birthTimeUnknown && !TIME_PATTERN.test(birthTime)) {
    throw invalidPetInput(`${label}: birthTime은 HH:MM 형식이어야 합니다. 모르면 birthTimeUnknown=true로 보내주세요.`);
  }

  const traits = Array.isArray(body.traits)
    ? Array.from(new Set(body.traits.map((item) => String(item || "").trim()).filter((item) => TRAIT_TABLE[item]))).slice(0, MAX_TRAITS)
    : [];

  const activityLevel = ACTIVITY_LEVELS[String(body.activityLevel || "").trim()] ? String(body.activityLevel).trim() : "medium";
  const environment = ENVIRONMENT_TABLE[String(body.environment || "").trim()] ? String(body.environment).trim() : "balanced";
  const companion = COMPANION_TABLE[String(body.companion || "").trim()] ? String(body.companion).trim() : "alone";

  return {
    name: String(body.name || "").trim().slice(0, MAX_NAME_LENGTH),
    species,
    breed,
    birthDate,
    birthTime: birthTimeUnknown ? "" : birthTime,
    birthTimeUnknown,
    gender: normalizeGender(body.gender),
    neutered: body.neutered === true,
    activityLevel,
    environment,
    companion,
    traits,
  };
}

/** 테스트/검증용 날짜 오버라이드(결정론 재현). 미지정 시 KST 오늘. */
export function normalizeRequestDate(value) {
  const date = String(value || "").trim();
  if (!date) return kstDateString();
  if (!DATE_PATTERN.test(date) || !isRealDate(date)) throw invalidPetInput("date는 YYYY-MM-DD 형식이어야 합니다.");
  return date;
}

/** 프로필 → 결정론 시드 키. 이름/성별은 오행에 영향이 없어 시드에도 넣지 않는다. */
export function buildPetKey(profile) {
  return fnv1a32(
    [
      profile.species,
      profile.breed,
      profile.birthDate,
      profile.birthTimeUnknown ? "unknown" : profile.birthTime,
      profile.environment,
      profile.companion,
      profile.activityLevel,
      [...profile.traits].sort().join(","),
    ].join("|"),
  ).toString(16);
}
