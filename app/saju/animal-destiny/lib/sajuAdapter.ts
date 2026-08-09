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

export function parseBirthDate(input: string) {
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

export function parseBirthTime(input?: string) {
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

async function stableInputKey(input: AnimalDestinyInput) {
  const raw = JSON.stringify({
    birthDate: input.birthDate,
    birthTime: input.birthTime || "",
    gender: input.gender || "unknown",
    calendarType: input.calendarType || "solar",
    lunarLeap: Boolean(input.lunarLeap),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
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

const KASI_CALENDAR_ENDPOINT = "/api/kasi/calendar";

export interface KasiPrefetchResult {
  kasiSolarDate?: { year: number; month: number; day: number };
  kasiSolarTerms?: Array<{ name: string; isoLocal: string }>;
}

function pad2Str(value: number): string {
  return String(value).padStart(2, "0");
}

function isVerifiedKasiSource(source: unknown): boolean {
  const normalized = String(source || "").toLowerCase();
  return normalized === "kasi" || normalized === "cache";
}

async function postKasiCalendar(body: unknown): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetchWithTimeout(KASI_CALENDAR_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(body),
    }, DEFAULT_SAJU_TIMEOUT_MS);
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") return null;
    return payload as Record<string, unknown>;
  } catch (e) {
    return null;
  }
}

/**
 * KASI(한국천문연구원) 권위 데이터를 프리페치한다. 정적 export 런타임(브라우저)에서만 시도하며,
 * 어떤 실패(오프라인/CORS/프리렌더/미검증 소스)든 빈 결과를 돌려주어 로컬 계산 폴백으로 진행한다.
 * - 음력 입력: getSolCalInfo로 양력 변환 → kasiSolarDate
 * - 24절기: 양력 출생연도 Y-1, Y, Y+1을 조회 → kasiSolarTerms(검증된 KASI 소스만)
 */
export async function prefetchKasiContext(input: AnimalDestinyInput): Promise<KasiPrefetchResult> {
  if (typeof window === "undefined") return {};

  const result: KasiPrefetchResult = {};
  try {
    const { year, month, day } = parseBirthDate(input.birthDate);
    let solarYear = year;

    if ((input.calendarType || "solar") === "lunar") {
      const conv = await postKasiCalendar({
        method: "getSolCalInfo",
        params: {
          lunYear: String(year),
          lunMonth: pad2Str(month),
          lunDay: pad2Str(day),
          lunLeapmonth: input.lunarLeap ? "윤" : "평",
        },
      });
      const rows = conv && Array.isArray(conv.rows) ? (conv.rows as Array<Record<string, unknown>>) : [];
      if (conv && isVerifiedKasiSource(conv.source) && rows.length) {
        const row = rows[0] || {};
        const sy = Number(row.solYear);
        const sm = Number(row.solMonth);
        const sd = Number(row.solDay);
        if (Number.isFinite(sy) && Number.isFinite(sm) && Number.isFinite(sd)) {
          result.kasiSolarDate = { year: sy, month: sm, day: sd };
          solarYear = sy;
        }
      }
    }

    const years = [solarYear - 1, solarYear, solarYear + 1];
    const responses = await Promise.all(
      years.map((y) => postKasiCalendar({ year: y, month: 6, day: 15 })),
    );

    const terms: Array<{ name: string; isoLocal: string }> = [];
    responses.forEach((resp) => {
      if (!resp || !isVerifiedKasiSource(resp.source) || !Array.isArray(resp.solarTerms)) return;
      (resp.solarTerms as Array<Record<string, unknown>>).forEach((term) => {
        const name = String(term?.name || "").trim();
        const isoLocal = String(term?.isoLocal || "").trim();
        if (name && isoLocal) terms.push({ name, isoLocal });
      });
    });
    if (terms.length) result.kasiSolarTerms = terms;
  } catch (e) {
    // 어떤 실패든 로컬 계산으로 진행(주입 생략).
  }
  return result;
}

/**
 * 기본 사주 분석과 동일한 옵션으로 로컬 명식(natalAnalysis 포함 full result)을 계산한다.
 * calculateLocalResult(동물점)와 러브심 궁합 엔진이 이 단일 함수를 공유해 일주 로직을 100% 일치시킨다.
 */
export function computeNatalFromInput(input: AnimalDestinyInput, kasi?: KasiPrefetchResult) {
  const { year, month, day } = parseBirthDate(input.birthDate);
  const { hour, minute, hasTime } = parseBirthTime(input.birthTime);

  return calculateLocalSaju({
    year,
    month,
    day,
    hour,
    minute,
    hasTime,
    calendarType: input.calendarType || "solar",
    lunarLeap: Boolean(input.lunarLeap),
    kasiSolarDate: kasi?.kasiSolarDate,
    kasiSolarTerms: kasi?.kasiSolarTerms,
  });
}

function calculateLocalResult(input: AnimalDestinyInput, kasi?: KasiPrefetchResult): SajuEngineResult {
  const local = computeNatalFromInput(input, kasi);

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
  const cacheKey = await stableInputKey(input);

  if (!RESULT_CACHE.has(cacheKey)) {
    const pending = (async () => {
      const external = await tryFetchExternalSajuEngine(input);
      if (external) return external;
      const kasi = await prefetchKasiContext(input);
      return calculateLocalResult(input, kasi);
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
