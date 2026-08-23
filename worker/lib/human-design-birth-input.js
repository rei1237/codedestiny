// 휴먼 디자인 입력 정규화와 재열람 키.
//
// 🔴 무료 차트 라우트(human-design.js)와 유료 리포트 라우트(human-design-report.js)가 **같은
//    inputHash** 를 만들어야 한다. 리포트는 그 해시로 이미 계산된 차트를 찾기 때문이다. 두 곳에
//    같은 함수를 따로 두면 한쪽만 고쳐졌을 때 리포트가 자기 차트를 영영 못 찾고, 증상은
//    "결제했는데 차트가 없다" 로 나온다. 그래서 정본을 여기 하나로 둔다.

import { CALCULATION_VERSION } from "../../lib/human-design/version.js";

export function clean(value, max = 120) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 요청 본문 → 계산 입력.
 *
 * 🔴 위도·경도는 계산에 쓰이지 않는다. 휴먼 디자인 바디그래프는 하우스·상승궁을 쓰지 않아
 *    장소가 아니라 타임존만 결과를 바꾼다. 그래도 입력 기록으로 남긴다.
 */
export function normalizeBirthBody(body = {}) {
  const source = body && typeof body === "object" ? body : {};
  const birth = source.birth && typeof source.birth === "object" ? source.birth : source;
  const calendarRaw = clean(birth.calendar || birth.calendarType || "solar", 20).toLowerCase();
  const isLunar = calendarRaw.includes("lun") || calendarRaw.includes("음");
  const isLeap = calendarRaw.includes("leap") || String(birth.calendar || "").includes("윤") || birth.isLeapMonth === true;

  const latitude = Number(birth.latitude ?? birth.lat);
  const longitude = Number(birth.longitude ?? birth.lon ?? birth.lng);

  return {
    birthDate: clean(birth.birthDate || birth.date, 10),
    birthTime: clean(birth.birthTime || birth.time, 5),
    timezone: clean(birth.timezone || birth.tz, 80),
    calendar: isLunar ? (isLeap ? "lunar-leap" : "lunar") : "solar",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    city: clean(birth.city, 100),
    country: clean(birth.country, 100),
  };
}

export function isValidBirth(input) {
  return /^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)
    && /^\d{1,2}:\d{2}$/.test(input.birthTime)
    && input.timezone.length > 0;
}

/**
 * 재열람 판정 키의 재료. 🔴 계산 버전을 포함해야 엔진이 바뀐 뒤 옛 결과를 그대로 내주지 않는다.
 * 좌표는 결과를 바꾸지 않으므로 넣지 않는다 — 넣으면 같은 차트가 매번 새 문서가 된다.
 */
export function inputHashSource(input) {
  return [input.birthDate, input.birthTime, input.timezone, input.calendar, CALCULATION_VERSION].join("|");
}

export function computeInputHash(input) {
  return sha256Hex(inputHashSource(input));
}
