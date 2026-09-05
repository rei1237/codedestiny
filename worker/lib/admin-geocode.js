// 관리자 프롬프트 랩의 출생지 → 좌표 해석기.
//
// 왜 admin.js 밖에 있나: 좌표 해석을 쓰는 곳이 둘(GET /prompt-lab/geocode 와 프롬프트 생성 경로)이라
// 한 벌로 묶어야 하고(원칙 6), admin.js 가 이미 5천 줄이 넘어 같은 이유로 CMS 를 분리한 전례가 있다.
// fetchImpl 을 주입받는 것은 Nominatim 폴백을 전역 fetch 스텁 없이 시험하기 위해서다.
//
// 🔴 이 모듈은 던지지 않는다 — 못 찾음·네트워크 실패 모두 null 이다. 400 판정은 호출자가 한 곳에서만
//    한다(admin.js 의 assertAdminPromptProfileReady). 여기서 던지면 게이트가 두 곳이 된다.

import { ADMIN_GEOCODE_PRESETS } from "../../lib/admin/geocode-presets.mjs";
import { resolveGeoTimezone } from "./geo-timezone.js";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

export function normalizeAdminGeocodeKey(value) {
  return String(value == null ? "" : value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .toLowerCase();
}

/** 내장 도시표에서 찾는다. 부분일치까지 허용한다("서울특별시" → 서울). 없으면 null. */
export function findAdminGeocodePreset(query) {
  const key = normalizeAdminGeocodeKey(query);
  if (!key) return null;
  return ADMIN_GEOCODE_PRESETS.find((preset) => (
    preset.keys.some((item) => key === normalizeAdminGeocodeKey(item) || key.includes(normalizeAdminGeocodeKey(item)))
  )) || null;
}

/**
 * 지명 한 줄을 좌표·시간대로 바꾼다. 내장 도시표를 먼저 보고(네트워크 0회), 빗나갈 때만 Nominatim 을 1회 부른다.
 * @returns {Promise<{source:string,label:string,latitude:number,longitude:number,timezone:string}|null>}
 */
export async function resolveAdminBirthCoordinates(query, { fetchImpl } = {}) {
  const text = String(query == null ? "" : query).normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!text) return null;

  const preset = findAdminGeocodePreset(text);
  if (preset) {
    return {
      source: "admin-preset",
      label: preset.label,
      latitude: preset.latitude,
      longitude: preset.longitude,
      timezone: preset.timezone,
    };
  }

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "ko,en");
  // 🔴 addressdetails 가 없으면 응답에 address 가 안 실려 국가 코드로 시간대를 못 정한다.
  //    worker/index.js 의 공개 /api/geocode 가 같은 이유로 이미 붙여 뒀다.
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", text);

  const doFetch = typeof fetchImpl === "function" ? fetchImpl : fetch;
  let rows = null;
  try {
    const res = await doFetch(url.toString(), {
      headers: {
        "User-Agent": "CodeDestinyAdminPromptLab/1.0",
        "Accept": "application/json",
      },
    });
    if (!res || res.ok === false) return null;
    rows = await res.json();
  } catch {
    // 지오코딩 실패로 프롬프트 조립 전체를 죽이지 않는다. 좌표가 필수인 운세는 호출자가 400 으로 안내한다.
    return null;
  }

  const first = Array.isArray(rows) ? rows[0] : null;
  const latitude = Number(first?.lat);
  const longitude = Number(first?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  // 🔴 예전에는 여기서 시간대를 "Asia/Seoul" 로 고정했다. 그 값이 차트 계산에 그대로 들어가므로
  //    해외 지명은 좌표만 맞고 시각이 통째로 어긋났다. 판정 정본은 geo-timezone.js 하나다.
  const timezone = resolveGeoTimezone({ countryCode: first?.address?.country_code, longitude }) || "Asia/Seoul";

  return {
    source: "nominatim",
    label: String(first?.display_name || text).normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 120),
    latitude,
    longitude,
    timezone,
  };
}
