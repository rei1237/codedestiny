import type { AnimalDestinyInput, SajuEngineResult } from "./types";

function parseBirthDate(input: string) {
  const raw = String(input || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)");
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseBirthTime(input?: string) {
  const raw = String(input || "").trim();
  if (!raw) {
    return {
      hour: 12,
      minute: 0,
      hasTime: false,
    };
  }

  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error("태어난 시간 형식이 올바르지 않습니다. (HH:mm)");
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    hasTime: true,
  };
}

function toLegacyGender(value: AnimalDestinyInput["gender"]) {
  if (value === "male") return "남";
  if (value === "female") return "여";
  return "미상";
}

function normalizePillarsShape(source: Record<string, unknown>) {
  const pillars = (source.pillars && typeof source.pillars === "object")
    ? (source.pillars as Record<string, unknown>)
    : {};

  if (pillars.year || pillars.month || pillars.day || pillars.hour) return;

  source.pillars = {
    year: pillars.y || source.yearPillar || null,
    month: pillars.m || source.monthPillar || null,
    day: pillars.d || source.dayPillar || source.dayStemBranch || null,
    hour: pillars.h || source.hourPillar || null,
  };
}

export async function fetchSajuEngineResult(input: AnimalDestinyInput): Promise<SajuEngineResult> {
  const { year, month, day } = parseBirthDate(input.birthDate);
  const { hour, minute, hasTime } = parseBirthTime(input.birthTime);

  const body = {
    name: String(input.name || "사용자").trim() || "사용자",
    gender: toLegacyGender(input.gender),
    year,
    month,
    day,
    hour,
    minute,
    calendarType: input.calendarType || "solar",
  };

  const response = await fetch("/api/love-saju-pillar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`기존 사주 엔진 API 호출 실패 (${response.status})`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  payload.timeUnknown = !hasTime;
  normalizePillarsShape(payload);
  return payload;
}
