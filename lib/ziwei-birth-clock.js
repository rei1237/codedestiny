/**
 * 자미두수 명반에 넣는 출생 시각 — 셸·워커·앱 진입점이 함께 쓰는 정본 (2026-10-02).
 *
 * 기준은 사이트 사주 공개 방법론(lib/brand/expertise-facts.mjs)과 같다: 출생지 경도와 과거
 * 서머타임으로 보정한 지방 평균시. 계산은 사주 정본 calculateNatalSaju 를 그대로 재사용한다
 * (출생지 미입력 = 서울 126.978°, 약 −32분). 보정 시각 23시대의 다음 날 子時 처리는 엔진이 한다.
 *
 * ── 왜 만들었나 ─────────────────────────────────────────────────────────────
 * 같은 사람인데 서비스마다 다른 시각을 넣었다: 셸은 경도만 보정, 워커·섬·앱은 입력 시계 그대로,
 * 영냥이는 서머타임만 빼고 경도 보정 없음. 그래서 홀수 시 정각~31분 출생은 서비스마다 시지와
 * 명궁이 갈렸다.
 *
 * 🔴 정적 셸 js/saju-engine.js 는 클래식 전역 스크립트라 이 파일을 import 할 수 없다. 셸은 같은
 * calculateNatalSaju 의 calculationMeta.corrected 를 직접 쓴다.
 * 🔴 이미 보정한 시계(해외 진태양시 등)를 다시 넣으면 이중 보정이다 — 엔진에 birthClock:'corrected'.
 */
import { calculateNatalSaju, lunarToSolar } from "./korean-calendar/index.js";

export const ZIWEI_BIRTH_CLOCK_POLICY = "ziwei-local-mean-dst-v1";

// 시각을 정할 수 없는 입력(서머타임 전환 틈·겹침, 출생지·시간대 불명)은 거절하지 않고 입력 시계로
// 명반을 낸다 — 명반이 안 나오는 것이 최악이다. 그 외 오류는 입력 오류로 돌려준다.
const CIVIL_FALLBACK = new Set(["AMBIGUOUS_BIRTH_TIME", "INVALID_BIRTH_PLACE", "INVALID_BIRTH_TIMEZONE"]);

const pad = (value) => String(value).padStart(2, "0");

/**
 * @param {{year:number,month:number,day:number,hour:number,minute:number,calendarType?:string,isLeapMonth?:boolean,birthPlace?:object}} input
 *   시각을 아는 출생만 넣는다(모르면 보정할 시계가 없다). 음력이면 year/month/day 가 음력이다.
 * @returns {{policy:string,method:string,appliedMinutes:number,reason?:string,
 *   civil:{year:number,month:number,day:number},
 *   corrected:{year:number,month:number,day:number,hour:number,minute:number}}}
 */
export function ziweiBirthClock(input) {
  const lunar = input.calendarType === "lunar" || input.calendarType === "lunar_leap";
  const leap = input.isLeapMonth === true || input.calendarType === "lunar_leap";
  const natalInput = {
    birthDate: `${input.year}-${pad(input.month)}-${pad(input.day)}`,
    birthTime: `${pad(input.hour)}:${pad(input.minute)}`,
    calendarType: lunar ? (leap ? "lunar_leap" : "lunar") : "solar",
    // 이름 문자열뿐인 출생지는 좌표가 없으니 기본값(서울)으로 본다 — 보정을 통째로 건너뛰지 않는다.
    birthPlace: input.birthPlace && typeof input.birthPlace === "object" ? input.birthPlace : undefined,
  };
  try {
    const meta = calculateNatalSaju(natalInput, { allowMissingLongitude: true }).calculationMeta;
    return {
      policy: ZIWEI_BIRTH_CLOCK_POLICY,
      method: meta.correction.method,
      appliedMinutes: meta.correction.appliedMinutes,
      ...(meta.correction.reason ? { reason: meta.correction.reason } : {}),
      civil: { year: meta.civil.year, month: meta.civil.month, day: meta.civil.day },
      corrected: { ...meta.corrected },
    };
  } catch (error) {
    if (!CIVIL_FALLBACK.has(error?.code)) {
      const invalid = new Error(error?.code || "INVALID_BIRTH_INFO");
      invalid.code = "INVALID_INPUT";
      throw invalid;
    }
    const civil = lunar ? lunarToSolar(input.year, input.month, input.day, leap) : { year: input.year, month: input.month, day: input.day };
    if (!civil) {
      const invalid = new Error("INVALID_LUNAR_DATE");
      invalid.code = "INVALID_INPUT";
      throw invalid;
    }
    return {
      policy: ZIWEI_BIRTH_CLOCK_POLICY,
      method: "CIVIL_TIME",
      appliedMinutes: 0,
      reason: error.code.toLowerCase(),
      civil: { year: civil.year, month: civil.month, day: civil.day },
      corrected: { year: civil.year, month: civil.month, day: civil.day, hour: input.hour, minute: input.minute },
    };
  }
}
