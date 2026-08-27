/**
 * 베다(Jyotish) 어댑터 — 판차앙가(Panchanga)의 한 요소인 '바라(Vāra: 요일 지배성)'로 방향성 기여를 만든다.
 * 각 요일은 고유 행성(그라하)이 지배한다: 일=태양·월=달·화=화성·수=수성·목=목성·금=금성·토=토성.
 * 숙요(27수)와는 완전히 다른 축(요일→행성)이라 신호 중복이 없다.
 * 결정론: 난수·Date 미사용 — Zeller 합동식(순수 산술)로 생년월일→요일 계산. 음력은 한국 음양력 코어로 양력 변환 후 산정.
 */
import { lunarToSolar } from "@/lib/korean-calendar";
import type { EngineAdapter } from "./types";
import type { CompassInput, DirectionKey, EngineContribution } from "../types";

// 바라(요일) 행성 지배 → 방향 축(합 ≈ 1). 인덱스는 Zeller h(0=토,1=일,2=월,…,6=금).
const VARA: { planet: string; ko: string; dirs: [DirectionKey, number][] }[] = [
  { planet: "Shani", ko: "토요일·토성(사니)", dirs: [["health", 0.5], ["rest", 0.5]] },          // 0 토 — 인내·수련
  { planet: "Surya", ko: "일요일·태양(수리야)", dirs: [["career", 0.55], ["health", 0.45]] },     // 1 일 — 존재감·활력
  { planet: "Chandra", ko: "월요일·달(찬드라)", dirs: [["relationship", 0.5], ["rest", 0.5]] },    // 2 월 — 감정·돌봄
  { planet: "Mangala", ko: "화요일·화성(망갈라)", dirs: [["venture", 0.55], ["career", 0.45]] },   // 3 화 — 추진·용기
  { planet: "Budha", ko: "수요일·수성(부다)", dirs: [["study", 0.5], ["wealth", 0.5]] },           // 4 수 — 지성·거래
  { planet: "Guru", ko: "목요일·목성(구루)", dirs: [["study", 0.55], ["wealth", 0.45]] },          // 5 목 — 지혜·확장
  { planet: "Shukra", ko: "금요일·금성(슈크라)", dirs: [["love", 0.55], ["wealth", 0.45]] },       // 6 금 — 매력·재물
];

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

// 생년월일(음력이면 양력 변환) → {y,m,d}. 순수(난수·Date 미사용).
function toSolarYmd(birth: CompassInput["birth"]): { y: number; m: number; d: number } {
  const [yy, mm, dd] = birth.birthDate.split("-").map(Number);
  if (birth.calendarType === "lunar") {
    // 🔴 음력→양력도 한국 음양력 코어가 한다. 중국 음력은 3.70% 의 날짜에서 하루 어긋나고(실측
    //    1950~2030 표본 28,188건 중 1,044건) 그 하루가 그대로 다른 요일 → 다른 바라(지배 행성)가 된다.
    const solar = lunarToSolar(yy, mm, dd, Boolean(birth.lunarLeap));
    if (!solar) throw new RangeError("음력 생년월일을 양력으로 옮기지 못했습니다(지원 1900~2100).");
    return { y: solar.year, m: solar.month, d: solar.day };
  }
  return { y: yy, m: mm, d: dd };
}

// Zeller 합동식 — 그레고리력 Y/M/D → 요일 h(0=토,1=일,2=월,…,6=금). 순수 산술(결정론).
function zellerWeekday(y: number, m: number, d: number): number {
  let Y = y;
  let M = m;
  if (M < 3) { M += 12; Y -= 1; }
  const K = Y % 100;
  const J = Math.floor(Y / 100);
  const h = (d + Math.floor((13 * (M + 1)) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) + 5 * J) % 7;
  return ((h % 7) + 7) % 7;
}

export const vedicAdapter: EngineAdapter = {
  system: "vedic",
  baseWeight: 0.12,
  isAvailable(input: CompassInput): boolean {
    return Boolean(input.birth?.birthDate);
  },
  async contribute(input: CompassInput): Promise<EngineContribution> {
    const { y, m, d } = toSolarYmd(input.birth);
    const vara = VARA[zellerWeekday(y, m, d)];

    const directions: Partial<Record<DirectionKey, number>> = {};
    for (const [dir, w] of vara.dirs) {
      directions[dir] = clamp01((directions[dir] || 0) + w);
    }

    return {
      directions,
      // 바라는 타고난 리듬 → 전 구간에 은은히.
      timelineHint: { d30: 0.7, d90: 0.7, y1: 0.7, y3: 0.7 },
      // 요일 기반 단일 요소라 명식 확정 신호보다 낮게.
      dataQuality: 0.7,
      // 🔴 evidence[0] 고정. 두 번째 항목은 '정직성 라벨'이다 — 이 어댑터는 판차앙가 5요소 중
      //    바라(요일 지배성) 하나만 계산한다. 이 문장을 프롬프트 입력에 그대로 실어, 상담 문장이
      //    라그나·다샤·나크샤트라를 아는 척하지 못하게 막는다(서버 검증기와 이중 차단).
      evidence: [
        { system: "vedic", term: `${vara.ko}`, detail: `바라 지배성 · ${vara.planet}`, id: "vedic.vara", group: "core" },
        {
          system: "vedic",
          term: "베다 산출 범위",
          detail: "판차앙가 5요소 중 바라(요일 지배성)만 계산 — 라그나·바바·다샤·나크샤트라는 미산출",
          id: "vedic.varaScope",
          group: "core",
          tone: "neutral",
        },
      ],
    };
  },
};
