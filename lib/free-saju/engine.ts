/**
 * `/saju/free` 엔진 로더. 입력란 포커스 때 preloadFreeSajuEngine() 으로 미리 받아 두면
 * 제출 뒤 계산은 1ms 안팎이다(2026-11-08 node 측정: 따뜻한 상태 평균 0.29ms).
 * 출생지는 받지 않으므로 calculateLocalSaju 의 한국 기본값과 같은 서울 기본 출생지로 계산된다.
 * 신살 요약(reading.shinsal)은 SAJU_SHINSAL_FACTS_V1 의 'free-saju' 가 켜졌을 때만 ./shinsal 을 동적으로 받아 붙인다.
 */
import { buildFreeSajuReading, type FreeSajuReading } from "./compute";
import { ENGINE_ROLLOUT_FLAGS, shinsalFactsOn } from "@/worker/lib/engine-rollout.js";

type KoreanCalendar = typeof import("@/lib/korean-calendar");
let enginePromise: Promise<KoreanCalendar> | null = null;

export function preloadFreeSajuEngine(): Promise<KoreanCalendar> {
  if (!enginePromise) {
    enginePromise = import("@/lib/korean-calendar").catch((error) => {
      enginePromise = null; // 네트워크가 끊겼다 돌아오면 다시 받는다
      throw error;
    });
  }
  return enginePromise;
}

export type FreeSajuInput = {
  birthDate: string; // YYYY-MM-DD
  birthTime: string | null; // HH:MM, 모름이면 null
  calendarType: "solar" | "lunar";
  leapMonth: boolean;
};

/** 한국 시각 기준 오늘 날짜(YYYY-MM-DD). 올해 천간은 입춘 기준이라 오늘의 연주에서 읽는다. */
export function seoulToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export async function computeFreeSaju(input: FreeSajuInput, now = new Date()): Promise<FreeSajuReading> {
  const { calculateNatalSaju } = await preloadFreeSajuEngine();
  const calendarType = input.calendarType === "lunar" ? (input.leapMonth ? "lunar_leap" : "lunar") : "solar";
  const natal = calculateNatalSaju({
    birthDate: input.birthDate,
    birthTime: input.birthTime || undefined,
    calendarType,
    isLeapMonth: calendarType === "lunar_leap",
  });
  const today = calculateNatalSaju({ birthDate: seoulToday(now), birthTime: "12:00", calendarType: "solar" });
  const reading = buildFreeSajuReading(natal.pillars, today.pillars.year);
  if (!shinsalFactsOn(ENGINE_ROLLOUT_FLAGS, "free-saju")) return reading;
  try {
    const { summarizeFreeSajuShinsal } = await import("./shinsal");
    return { ...reading, shinsal: summarizeFreeSajuShinsal(natal.pillars) };
  } catch {
    return reading; // 신살 묶음을 못 받아도 명식 결과는 그대로 보여 준다
  }
}
