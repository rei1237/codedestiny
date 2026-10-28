/**
 * 출생 정보(생년월일) 단위 영구 해금 키의 클라이언트 사본.
 *
 * 정본은 서버 worker/lib/paid-feature-registry.js 의 BIRTH_SCOPED_UNLOCK_FEATURE_KEY_LIST 와
 * PAID_FEATURE_KEY_ALIASES 다. 이 파일은 그 사본이며 scripts/verify-birth-scope-client-mirror.mjs 가
 * 두 목록이 같은지 고정한다(서버에 키를 추가하면 여기도 같이 고칠 것).
 *
 * 규칙(서버 isBirthScopedUnlockFeatureKey 와 같다):
 *   - 정확한 키 목록이다. 접두사 규칙은 없다.
 *   - `:` 뒤 접미사(sukyo_yearly_fortune_unlock:2027)는 떼고 본다.
 *   - 별칭(openSajuGuardianPage → saju-guardian-unlock 등)은 정규 키로 접어서 본다.
 *
 * 출생 기반 해금은 "계정 + 저장된 프로필의 출생 정보" 단위라 계정 단위 localStorage
 * (cd_tile_locks_v2::*, fortune_auth_user.unlockMap 등)에 읽고 쓰지 않는다.
 *
 * 로딩 방식: 브라우저 classic script(window.CD_BIRTH_SCOPED_UNLOCK_KEYS, window.cdIsBirthScopedUnlockKey)
 *           · Node require(module.exports).
 */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") {
    globalThis.__cdBirthScopeUnlocks = api;
    globalThis.CD_BIRTH_SCOPED_UNLOCK_KEYS = api.CD_BIRTH_SCOPED_UNLOCK_KEYS;
    globalThis.cdIsBirthScopedUnlockKey = api.cdIsBirthScopedUnlockKey;
    globalThis.cdProfileBirthSignature = api.cdProfileBirthSignature;
  }
})(function () {
  "use strict";

  var CD_BIRTH_SCOPED_UNLOCK_KEYS = Object.freeze([
    "section_summary",
    "section_daewun",
    "section_compat",
    "rpt_specialCharmCard",
    "rpt_quantumCard",
    "rpt_healthReportCard",
    "rpt_skillTreeCard",
    "rpt_energyCoordCard",
    "rpt_villainCard",
    "rpt_secretHouseEntryCard",
    "ziwei_decade_luck",
    "ziwei_love_deep",
    "ziwei_twelve_palaces",
    "ziwei_symbolic_layer",
    "ziwei_life_yearly_flow",
    "ziwei-island-deep-report",
    "sukyo_yearly_fortune_unlock",
    "sukuyo-relationship-encyclopedia",
    "sukuyo-nature-deep-dive",
    "sukuyo-extreme-t-relationship",
    "nakshatra-lord-report",
    "nakshatra-dasha-map",
    "vedic_basic_reading",
    "astro_career_talent_deep",
    "astro_talent_attraction_deep",
    "astro_relationship_deep",
    "astro_growth_shadow_deep",
    "astro_basic_deep_pack",
    "astro_stellar_career_room",
    "astro_stellar_talent_room",
    "astro_stellar_relationship_room",
    "astro_stellar_growth_room",
    "astro_yearly_transit",
    "animal-destiny-unlock",
    "saju-guardian-unlock",
    "premium-sibyl-dominator",
    "premium-fpti-report",
    "travelDestiny",
    "healthReport"
  ]);

  /* 서버 PAID_FEATURE_KEY_ALIASES 중 정규 키가 출생 기반인 항목만. */
  var CD_BIRTH_SCOPED_UNLOCK_KEY_ALIASES = Object.freeze({
    openSajuGuardianPage: "saju-guardian-unlock",
    openSajuAnimalPage: "saju-guardian-unlock",
    generateSibylDominatorReport: "premium-sibyl-dominator",
    openSibylDominator: "premium-sibyl-dominator",
    "sibyl-dominator": "premium-sibyl-dominator",
    "sibyl-dominator-report": "premium-sibyl-dominator",
    "premium-sibyl-dominator-report": "premium-sibyl-dominator",
    premium_fpti_report: "premium-fpti-report",
    generateFptiDeepReport: "premium-fpti-report",
    openFptiDeepReport: "premium-fpti-report",
    "extreme-t-relationship-circuit": "sukuyo-extreme-t-relationship"
  });

  var KEY_SET = Object.create(null);
  CD_BIRTH_SCOPED_UNLOCK_KEYS.forEach(function (key) { KEY_SET[key] = true; });
  var ALIAS_LOOKUP = Object.create(null);
  Object.keys(CD_BIRTH_SCOPED_UNLOCK_KEY_ALIASES).forEach(function (alias) {
    ALIAS_LOOKUP[alias] = CD_BIRTH_SCOPED_UNLOCK_KEY_ALIASES[alias];
    ALIAS_LOOKUP[alias.toLowerCase()] = CD_BIRTH_SCOPED_UNLOCK_KEY_ALIASES[alias];
  });

  function cdIsBirthScopedUnlockKey(featureKey) {
    var raw = String(featureKey == null ? "" : featureKey).trim();
    if (!raw) return false;
    var colon = raw.indexOf(":");
    var base = colon >= 0 ? raw.slice(0, colon) : raw;
    var key = ALIAS_LOOKUP[base] || ALIAS_LOOKUP[base.toLowerCase()] || base;
    return KEY_SET[key] === true;
  }

  function pad(value, width) {
    var text = String(value);
    while (text.length < width) text = "0" + text;
    return text;
  }

  function toInt(value, min, max) {
    var num = Number(value);
    if (!isFinite(num)) return null;
    var int = num < 0 ? Math.ceil(num) : Math.floor(num);
    return int >= min && int <= max ? int : null;
  }

  /**
   * 프로필의 출생 신원 문자열(서버 normalizeProfileBirth 와 같은 필드: 연·월·일·시·분·시간모름·역법·성별).
   * 같은 profileId 에서 이 값이 바뀌면 "출생 정보 수정"이다 — 출생 기반 해금은 다시 서버에 물어야 한다.
   * 연·월·일이 없으면 "" 를 돌려준다.
   */
  function cdProfileBirthSignature(profile) {
    var card = profile && typeof profile === "object" ? profile : {};
    var birth = card.birth && typeof card.birth === "object" ? card.birth : {};
    var year = toInt(birth.year, 1000, 9999);
    var month = toInt(birth.month, 1, 12);
    var day = toInt(birth.day, 1, 31);
    if (year === null || month === null || day === null) return "";
    var timeUnknown = birth.timeUnknown === true;
    var hourValue = toInt(birth.hour, 0, 23);
    var minuteValue = toInt(birth.minute, 0, 59);
    var hour = timeUnknown ? "" : pad(hourValue === null ? 0 : hourValue, 2);
    var minute = timeUnknown ? "" : pad(minuteValue === null ? 0 : minuteValue, 2);
    var calType = String(birth.calType || "solar").trim().toLowerCase();
    if (calType !== "solar" && calType !== "lunar" && calType !== "lunar_leap") calType = "solar";
    var gender = String(card.gender || "OTHER").trim().toUpperCase();
    if (gender !== "M" && gender !== "F" && gender !== "OTHER") gender = "OTHER";
    return ["v1", pad(year, 4), pad(month, 2), pad(day, 2), hour, minute, timeUnknown ? "1" : "0", calType, gender].join("|");
  }

  return {
    CD_BIRTH_SCOPED_UNLOCK_KEYS: CD_BIRTH_SCOPED_UNLOCK_KEYS,
    CD_BIRTH_SCOPED_UNLOCK_KEY_ALIASES: CD_BIRTH_SCOPED_UNLOCK_KEY_ALIASES,
    cdIsBirthScopedUnlockKey: cdIsBirthScopedUnlockKey,
    cdProfileBirthSignature: cdProfileBirthSignature
  };
});
