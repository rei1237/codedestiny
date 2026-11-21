// R5 점성술 공통 스텝 입력(2026-11-21 승인 "서양 점성술만 먼저") → 정적 셸 프로필 폼 초안.
// /astrology/ 흐름이 확인을 마치면 이 초안을 sessionStorage 에 한 번 남기고 /ggulggul/?action=cdHomeAstroEntry 로 간다.
// 셸(js/destiny-profile.js)은 같은 키를 한 번 읽고 지운 뒤 기존 프로필 폼(_dpApplyProfileToForm)에 채운다.
// 저장·동의·로그인은 셸의 기존 dpSaveProfile 그대로다 — 이 초안은 저장 기록이 아니라 입력 전달용이다.
// 🔴 키·만료 값은 셸 사본과 같아야 한다(__tests__/ui/astro-guided-entry.test.mjs 가 묶는다).

export const ASTRO_DRAFT_KEY = "cd:guided-astro-draft:v1";
export const ASTRO_DRAFT_TTL_MS = 30 * 60 * 1000;
export const ASTRO_SHELL_ENTRY = "/ggulggul/?action=cdHomeAstroEntry";

const CAL_TYPES = { solar: "solar", lunar: "lunar", leap: "lunar_leap" };

/**
 * readBirthAnswers() 결과 → 셸 프로필 모양 {name, gender 'F'|'M', birth:{...}, location?}.
 * 필수 값(이름·성별·생년월일·달력)이 빠지면 null.
 */
export function astroDraftProfile(birth) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birth?.date || ""));
  const gender = birth?.gender === "female" ? "F" : birth?.gender === "male" ? "M" : "";
  const calType = CAL_TYPES[birth?.calendar];
  const name = String(birth?.name || "").trim();
  if (!match || !gender || !calType || !name) return null;
  const time = /^(\d{2}):(\d{2})$/.exec(String(birth?.time || ""));
  const profile = {
    name,
    gender,
    birth: {
      year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
      hour: time ? Number(time[1]) : null, minute: time ? Number(time[2]) : null,
      timeUnknown: !time, calType,
    },
  };
  const place = birth?.place;
  if (place && place.timezone && Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    profile.location = { tz: place.timezone, lat: place.lat, lng: place.lng };
  }
  return profile;
}

/** 초안을 남긴다. 저장이 막혀 있으면 false(호출부는 셸로 보내지 않고 안내만 한다 — 되돌이 방지). */
export function writeAstroDraft(storage, profile, now = Date.now()) {
  if (!storage || !profile) return false;
  try {
    storage.setItem(ASTRO_DRAFT_KEY, JSON.stringify({ at: now, profile }));
    return storage.getItem(ASTRO_DRAFT_KEY) != null;
  } catch {
    return false;
  }
}
