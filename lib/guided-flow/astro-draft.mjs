// R5 출생 입력 공통 스텝(2026-11-21 승인: 서양 점성술 "서양 점성술만 먼저", 숙요·베다 "승인 받지 않은 부분에 대해서는 권장안으로 진행해줘") → 정적 셸 프로필 폼 초안.
// /astrology/ · /sukuyo/ · /vedic/ 흐름이 확인을 마치면 이 초안을 sessionStorage 에 한 번 남기고 /ggulggul/?action=cdHome{Astro,Sukuyo,Vedic}Entry 로 간다.
// 셸(js/destiny-profile.js)은 같은 키를 한 번 읽고 지운 뒤 기존 프로필 폼(_dpApplyProfileToForm)에 채운다.
// 저장·동의·로그인은 셸의 기존 dpSaveProfile 그대로다 — 이 초안은 저장 기록이 아니라 입력 전달용이다.
// 🔴 키·만료 값은 셸 사본과 같아야 한다(__tests__/ui/astro-guided-entry.test.mjs·sukuyo-vedic-guided-entry.test.mjs 가 묶는다).

export const ASTRO_DRAFT_KEY = "cd:guided-astro-draft:v1";
export const ASTRO_DRAFT_TTL_MS = 30 * 60 * 1000;
export const ASTRO_SHELL_ENTRY = "/ggulggul/?action=cdHomeAstroEntry";

/** 기능별 초안 키·셸 진입·되돌아올 가이드 입력 주소. astro 값은 R5 첫 배포와 같다(바꾸지 않는다). */
export const BIRTH_DRAFT_TARGETS = {
  astro: { key: ASTRO_DRAFT_KEY, entry: ASTRO_SHELL_ENTRY, landing: "/astrology/?step=name" },
  sukuyo: { key: "cd:guided-sukuyo-draft:v1", entry: "/ggulggul/?action=cdHomeSukuyoEntry", landing: "/sukuyo/?step=name" },
  vedic: { key: "cd:guided-vedic-draft:v1", entry: "/ggulggul/?action=cdHomeVedicEntry", landing: "/vedic/?step=name" },
};

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
export function writeBirthDraft(storage, key, profile, now = Date.now()) {
  if (!storage || !profile || !key) return false;
  try {
    storage.setItem(key, JSON.stringify({ at: now, profile }));
    return storage.getItem(key) != null;
  } catch {
    return false;
  }
}

export function writeAstroDraft(storage, profile, now = Date.now()) {
  return writeBirthDraft(storage, ASTRO_DRAFT_KEY, profile, now);
}
