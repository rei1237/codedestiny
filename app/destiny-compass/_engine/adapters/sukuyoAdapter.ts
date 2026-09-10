/**
 * 숙요(27수) 어댑터 — 기존 숙요 엔진(calcSukuyoForServer)을 읽기 전용으로 소비해 방향성 기여로 변환.
 * 본명숙의 칠요(七曜: 일월화수목금토) 원형 → 6축 매핑 + talent 강도 변조. 근거=27수 원용어.
 * 결정론: 난수·현재시각을 쓰지 않고 입력 순간을 Swiss Ephemeris로 계산한다.
 */
import { lunarToSolar } from "@/lib/korean-calendar";
import { calcSukuyoForServer } from "@/lib/sukuyo-engine-server";
import type { EngineAdapter } from "./types";
import type { CompassInput, DirectionKey, EngineContribution } from "../types";

// 칠요 원형 → 방향 축 가중치(합 ≈ 1). 본명숙 하나의 요(曜)만 적용된다.
const ELEMENT_DIRECTION: Record<string, [DirectionKey, number][]> = {
  일: [["career", 0.6], ["venture", 0.4]], // 태양 — 리더십·존재감
  월: [["relationship", 0.5], ["love", 0.3], ["rest", 0.2]], // 태음 — 감정·돌봄
  화: [["venture", 0.5], ["career", 0.3], ["health", 0.2]], // 화성 — 행동·추진
  수: [["study", 0.5], ["wealth", 0.3], ["relationship", 0.2]], // 수성 — 지성·거래
  목: [["study", 0.5], ["health", 0.3], ["venture", 0.2]], // 목성 — 성장·확장
  금: [["love", 0.5], ["wealth", 0.4], ["relationship", 0.1]], // 금성 — 매력·재물
  토: [["health", 0.4], ["rest", 0.3], ["relationship", 0.3]], // 토성 — 안정·인내
};

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

// 생년월일(+음력 변환) → 양력 Y/M/D + hour. 순수(난수·Date 미사용).
function toSolarYmd(birth: CompassInput["birth"]): {
  y: number; m: number; d: number; hour: number; minute: number;
  timezone?: string; timezoneOffset?: number; latitude?: number; longitude?: number; standardMeridian?: number;
} {
  const [yy, mm, dd] = birth.birthDate.split("-").map(Number);
  const [rawHour, rawMinute] = birth.birthTime ? birth.birthTime.split(":").map(Number) : [12, 0];
  const hour = Number.isFinite(rawHour) ? rawHour : 12;
  const minute = Number.isFinite(rawMinute) ? rawMinute : 0;
  const timezoneOffset = Number.isFinite(birth.timezoneOffset)
    ? birth.timezoneOffset
    : Number.isFinite(birth.timezoneOffsetMinutes)
      ? Number(birth.timezoneOffsetMinutes) / 60
      : undefined;
  if (birth.calendarType === "lunar") {
    // 🔴 음력→양력도 한국 음양력 코어가 한다. 중국 음력은 3.7% 의 날짜에서 하루 어긋나고
    //    그 하루가 그대로 다른 수(宿)가 된다. 실패 시 상위 try/catch가 흡수한다.
    const solar = lunarToSolar(yy, mm, dd, Boolean(birth.lunarLeap));
    if (!solar) throw new RangeError("음력 생년월일을 양력으로 옮기지 못했습니다(지원 1900~2100).");
    return {
      y: solar.year, m: solar.month, d: solar.day, hour, minute,
      timezone: birth.timezone,
      timezoneOffset,
      latitude: birth.latitude,
      longitude: birth.longitude,
      standardMeridian: birth.standardMeridian,
    };
  }
  return {
    y: yy, m: mm, d: dd, hour, minute,
    timezone: birth.timezone,
    timezoneOffset,
    latitude: birth.latitude,
    longitude: birth.longitude,
    standardMeridian: birth.standardMeridian,
  };
}

export const sukuyoAdapter: EngineAdapter = {
  system: "sukuyo",
  baseWeight: 0.25,
  isAvailable(input: CompassInput): boolean {
    return Boolean(input.birth?.birthDate);
  },
  async contribute(input: CompassInput): Promise<EngineContribution> {
    const { y, m, d, hour, minute, timezone, timezoneOffset, latitude, longitude, standardMeridian } = toSolarYmd(input.birth);
    const res = await calcSukuyoForServer(y, m, d, hour, minute, {
      timezone,
      timezoneOffset,
      latitude,
      longitude,
      standardMeridian,
      birthTimeKnown: Boolean(input.birth.birthTime),
    });

    const el = res.element;
    const talent = typeof res.traits?.talent === "number" ? res.traits.talent : 80;
    // 강도: talent(0..100)로 0.6~1.0 범위 변조 → 요(曜) 가중치에 곱.
    const intensity = 0.6 + 0.4 * clamp01(talent / 100);

    const directions: Partial<Record<DirectionKey, number>> = {};
    for (const [dir, w] of ELEMENT_DIRECTION[el] ?? []) {
      directions[dir] = clamp01((directions[dir] || 0) + w * intensity);
    }

    const m01 = clamp01(talent / 100);
    const timelineHint = { d30: m01, d90: m01, y1: m01, y3: m01 };

    return {
      directions,
      timelineHint,
      dataQuality: input.birth.birthTime ? 0.95 : 0.8,
      // 🔴 evidence[0] 고정(본명숙) — 신규는 뒤로만 append.
      evidence: [
        {
          system: "sukuyo",
          term: `${res.mansion.split("(")[0]}수(${res.mansionCh}宿)`,
          detail: `${el}요 · ${res.direction}방 · ${res.animal}`,
          id: "sukuyo.mansion",
          group: "core",
        },
        {
          system: "sukuyo",
          term: "본명숙 기질",
          detail: `재능 ${talent} · ${String(res.traits?.desc || "").slice(0, 120)}`.trim(),
          id: "sukuyo.traits",
          group: "core",
        },
        {
          system: "sukuyo",
          term: "분야별 결",
          detail: [
            res.traits?.work ? `일: ${String(res.traits.work).slice(0, 70)}` : "",
            res.traits?.love ? `사랑: ${String(res.traits.love).slice(0, 70)}` : "",
            res.traits?.wealth ? `재물: ${String(res.traits.wealth).slice(0, 70)}` : "",
          ]
            .filter(Boolean)
            .join(" / "),
          id: "sukuyo.field",
          group: "structure",
        },
      ],
    };
  },
};
