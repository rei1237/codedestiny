/**
 * `/saju/free` 엔진 로더. 입력란 포커스 때 preloadFreeSajuEngine() 으로 미리 받아 두면
 * 제출 뒤 계산은 1ms 안팎이다(2026-11-08 node 측정: 따뜻한 상태 평균 0.29ms).
 * 출생지는 받지 않으므로 calculateLocalSaju 의 한국 기본값과 같은 서울 기본 출생지로 계산된다.
 */
import { buildFreeSajuReading, type FreeSajuReading } from "./compute";

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
  return buildFreeSajuReading(natal.pillars, today.pillars.year);
}
