import { calculateLocalSaju } from "../engine/localSajuCalculator";
import { getAnimalByStage, getAnimalDisplayData } from "./animalMapping";
import { getTwelveStagesForPillars } from "./twelveStages";
import type {
  AnimalDestinyInput,
  AnimalTwelveResolvedResult,
  SajuEngineResult,
  StageSource,
  TwelveStage,
  TwelveStageResult,
} from "./types";

type ExistingSajuResult = SajuEngineResult;
type ResolveInput = AnimalDestinyInput | ExistingSajuResult;

const RESULT_CACHE = new Map<string, Promise<SajuEngineResult>>();
const DEFAULT_SAJU_TIMEOUT_MS = 9000;
const SAJU_ADAPTER_TEXT_TRANSLATIONS = {
  ko: {
    invalidBirthDate: "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)",
    checkSajuInput: "사주 계산 정보를 다시 확인해 주세요. (생년월일/시간/양력·음력)",
    mappingFailed: "운명 동물 매핑을 완료하지 못했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.",
  },
  en: {
    invalidBirthDate: "The birth date format is invalid. (YYYY-MM-DD)",
    checkSajuInput: "Please check the saju calculation information again. (birth date/time, solar/lunar calendar)",
    mappingFailed: "Could not complete the destiny animal mapping. Please check the input and try again.",
  },
  ja: {
    invalidBirthDate: "生年月日の形式が正しくありません。 (YYYY-MM-DD)",
    checkSajuInput: "四柱計算情報をもう一度確認してください。（生年月日/時刻/陽暦・陰暦）",
    mappingFailed: "運命動物のマッピングを完了できませんでした。入力情報を確認してもう一度お試しください。",
  },
} as const;

function parseBirthDate(input: string) {
  const raw = String(input || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(SAJU_ADAPTER_TEXT_TRANSLATIONS.ko.invalidBirthDate);
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
      hour: undefined as number | undefined,
      minute: undefined as number | undefined,
      hasTime: false,
    };
  }

  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return {
      hour: undefined as number | undefined,
      minute: undefined as number | undefined,
      hasTime: false,
    };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return {
      hour: undefined as number | undefined,
      minute: undefined as number | undefined,
      hasTime: false,
    };
  }

  return {
    hour,
    minute,
    hasTime: true,
  };
}

function isAnimalDestinyInput(input: ResolveInput): input is AnimalDestinyInput {
  const target = input as AnimalDestinyInput;
  return typeof target?.birthDate === "string";
}

function stableInputKey(input: AnimalDestinyInput) {
  return JSON.stringify({
    birthDate: input.birthDate,
    birthTime: input.birthTime || "",
    gender: input.gender || "unknown",
    calendarType: input.calendarType || "solar",
    lunarLeap: Boolean(input.lunarLeap),
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ms = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : DEFAULT_SAJU_TIMEOUT_MS;

  if (typeof AbortController === "undefined") {
    return fetch(url, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch (e) {
      // ignore abort failures
    }
  }, ms);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryFetchExternalSajuEngine(input: AnimalDestinyInput): Promise<SajuEngineResult | null> {
  const endpoint = String(process.env.NEXT_PUBLIC_ANIMAL_DESTINY_SAJU_ENDPOINT || "").trim();
  if (!endpoint) return null;

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        birthDate: input.birthDate,
        birthTime: input.birthTime || "",
        gender: input.gender,
        calendarType: input.calendarType || "solar",
        lunarLeap: Boolean(input.lunarLeap),
      }),
    }, DEFAULT_SAJU_TIMEOUT_MS);

    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") return null;

    const data = (payload as Record<string, unknown>).data;
    if (data && typeof data === "object") return data as SajuEngineResult;
    return payload as SajuEngineResult;
  } catch (e) {
    return null;
  }
}

function calculateLocalResult(input: AnimalDestinyInput): SajuEngineResult {
  const { year, month, day } = parseBirthDate(input.birthDate);
  const { hour, minute, hasTime } = parseBirthTime(input.birthTime);

  const local = calculateLocalSaju({
    year,
    month,
    day,
    hour,
    minute,
    hasTime,
    calendarType: input.calendarType || "solar",
    lunarLeap: Boolean(input.lunarLeap),
  });

  return {
    dayStem: local.dayStem,
    pillars: {
      year: local.pillars.year,
      month: local.pillars.month,
      day: local.pillars.day,
      hour: local.pillars.hour,
    },
    timeUnknown: local.timeUnknown,
    yearPillar: local.pillars.year,
    monthPillar: local.pillars.month,
    dayPillar: local.pillars.day,
    hourPillar: local.pillars.hour,
  } as SajuEngineResult;
}

/**
 * 사주 십이운성 동물점 계산에 필요한 사주 엔진 결과를 반환합니다.
 * 우선순위:
 * 1) 외부 엔드포인트(환경변수 설정 시)
 * 2) 로컬 deterministic 계산기
 */
export async function fetchSajuEngineResult(input: AnimalDestinyInput): Promise<SajuEngineResult> {
  const cacheKey = stableInputKey(input);

  if (!RESULT_CACHE.has(cacheKey)) {
    const pending = (async () => {
      const external = await tryFetchExternalSajuEngine(input);
      if (external) return external;
      return calculateLocalResult(input);
    })().finally(() => {
      RESULT_CACHE.delete(cacheKey);
    });

    RESULT_CACHE.set(cacheKey, pending);
  }

  const result = await RESULT_CACHE.get(cacheKey)!;
  return result;
}

function resolveSourceFromStageResults(stageResults: TwelveStageResult[]): StageSource {
  if (!stageResults.length) return "local-fallback";
  return stageResults.some((item) => item.source === "saju-engine") ? "saju-engine" : "local-fallback";
}

function pickRepresentativeStage(stageResults: TwelveStageResult[]): TwelveStageResult | null {
  const day = stageResults.find((item) => item.pillar === "day");
  if (day) return day;

  const month = stageResults.find((item) => item.pillar === "month");
  if (month) return month;

  if (!stageResults.length) return null;

  const count = new Map<TwelveStage, number>();
  stageResults.forEach((item) => {
    count.set(item.labelKo, (count.get(item.labelKo) || 0) + 1);
  });

  let winner: TwelveStage | null = null;
  let max = 0;
  count.forEach((value, stage) => {
    if (value > max) {
      max = value;
      winner = stage;
    }
  });

  return stageResults.find((item) => item.labelKo === winner) || stageResults[0] || null;
}

export async function resolveAnimalTwelveResult(input: ResolveInput): Promise<AnimalTwelveResolvedResult> {
  try {
    const sajuResult = isAnimalDestinyInput(input)
      ? await fetchSajuEngineResult(input)
      : (input as ExistingSajuResult);

    const pillars = getTwelveStagesForPillars(sajuResult);
    const stageResults = Array.isArray(pillars.stageResults) ? pillars.stageResults : [];
    const representativeStage = pickRepresentativeStage(stageResults);

    if (!representativeStage && isAnimalDestinyInput(input)) {
      return {
        ok: false,
        source: "local-fallback",
        sajuResult,
        representativeStage: null,
        allStages: [],
        profile: null,
        error: SAJU_ADAPTER_TEXT_TRANSLATIONS.ko.checkSajuInput,
      };
    }

    const stageLabel = representativeStage?.labelKo || pillars.primary || null;
    const animalId = stageLabel ? getAnimalByStage(stageLabel) : null;
    const profile = animalId ? getAnimalDisplayData(animalId) : null;

    if (!stageLabel || !profile) {
      return {
        ok: false,
        source: resolveSourceFromStageResults(stageResults),
        sajuResult,
        representativeStage,
        allStages: stageResults,
        profile: null,
        error: SAJU_ADAPTER_TEXT_TRANSLATIONS.ko.mappingFailed,
      };
    }

    return {
      ok: true,
      source: resolveSourceFromStageResults(stageResults),
      sajuResult,
      representativeStage,
      allStages: stageResults,
      profile,
      warning: stageResults.length < 4
        ? "시주 정보가 없거나 일부 데이터가 누락되어 연·월·일 중심으로 해석했어요."
        : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      source: "local-fallback",
      sajuResult: null,
      representativeStage: null,
      allStages: [],
      profile: null,
      error: error instanceof Error
        ? error.message
        : "사주 계산에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
}
