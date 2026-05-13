import { calculateLocalSaju } from "../engine/localSajuCalculator";
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
      hour: undefined as number | undefined,
      hasTime: false,
    };
  }

  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    // 시간 형식 불일치 시 시간 미상 처리 (에러 대신 graceful 처리)
    return {
      hour: undefined as number | undefined,
      hasTime: false,
    };
  }

  return {
    hour: Number(match[1]),
    hasTime: true,
  };
}

/**
 * 사주 십이운성 동물점 계산에 필요한 사주 엔진 결과를 반환합니다.
 *
 * 외부 API(/api/love-saju-pillar)를 제거하고 로컬 deterministic 계산으로 대체합니다.
 * 동일 입력값 → 항상 동일 결과 (503 오류 없음).
 */
export async function fetchSajuEngineResult(input: AnimalDestinyInput): Promise<SajuEngineResult> {
  const { year, month, day } = parseBirthDate(input.birthDate);
  const { hour, hasTime } = parseBirthTime(input.birthTime);

  // 로컬 계산 — 외부 API 호출 없음
  const localResult = calculateLocalSaju({ year, month, day, hour, hasTime });

  // SajuEngineResult (Record<string, unknown>) 로 변환
  // twelveStages.ts 의 extractDayStem / extractBranchFromPillar 가 읽을 수 있는 구조
  const result: SajuEngineResult = {
    dayStem: localResult.dayStem,
    pillars: {
      year: localResult.pillars.year,
      month: localResult.pillars.month,
      day: localResult.pillars.day,
      hour: localResult.pillars.hour,
    },
    timeUnknown: localResult.timeUnknown,
    // 하위 호환용 별칭 필드
    yearPillar: localResult.pillars.year,
    monthPillar: localResult.pillars.month,
    dayPillar: localResult.pillars.day,
    hourPillar: localResult.pillars.hour,
  };

  return result;
}
