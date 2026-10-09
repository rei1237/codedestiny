/**
 * 출생 정보 해금 신원(birthKey). **순수 함수만 둔다** — DB·요청 본문을 보지 않는다.
 *
 * 생년월일 기반 유료 해금은 "계정 + 출생 정보 + 콘텐츠" 단위다. 같은 계정에서 출생 정보가 같은
 * 프로필끼리는 해금을 공유하고, 출생 정보를 고치면 다시 잠기며, 되돌리면 다시 열린다.
 *
 * 🔴 입력은 **서버에 저장된 ProfileCard** 여야 한다. 클라이언트가 보낸 생년월일로 계산하면
 *    요청마다 다른 사람의 해금을 열 수 있다. 이름·출생지·profileId 는 신원에 넣지 않는다.
 * 🔴 음력은 양력으로 환산하지 않는다. calType(solar/lunar/lunar_leap)을 그대로 신원에 넣는다 —
 *    환산표가 바뀌면 이미 산 해금의 신원이 소리 없이 이동하기 때문이다.
 * 🔴 정규화 문자열 형식(v1)을 바꾸면 기존 해금이 전부 잠긴다. 바꿀 때는 버전을 올리고 마이그레이션을 쓴다.
 */
import { createHash } from "node:crypto";

export const BIRTH_KEY_VERSION = "v1";
export const BIRTH_ENTITLEMENT_SCOPE = "BIRTH";
export const BIRTH_ENTITLEMENT_PROFILE_PREFIX = "birth:";

const CAL_TYPES = new Set(["solar", "lunar", "lunar_leap"]);
const GENDERS = new Set(["M", "F", "OTHER"]);

function toInt(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const int = Math.trunc(num);
  return int >= min && int <= max ? int : null;
}

function pad(value, width) {
  return String(value).padStart(width, "0");
}

/**
 * ProfileCard → 정규화 문자열. 연·월·일이 없으면 신원을 만들 수 없으므로 "" 를 돌려준다
 * (호출부는 이를 잠금으로 다룬다).
 */
export function normalizeProfileBirth(card) {
  const birth = card?.birth && typeof card.birth === "object" ? card.birth : {};
  const year = toInt(birth.year, 1000, 9999);
  const month = toInt(birth.month, 1, 12);
  const day = toInt(birth.day, 1, 31);
  if (year === null || month === null || day === null) return "";

  const timeUnknown = birth.timeUnknown === true;
  // 스키마 기본값이 hour 0 / minute 0 이므로 누락은 0 으로 접는다. 시간 모름이면 시·분은 신원에서 뺀다.
  const hour = timeUnknown ? "" : pad(toInt(birth.hour, 0, 23) ?? 0, 2);
  const minute = timeUnknown ? "" : pad(toInt(birth.minute, 0, 59) ?? 0, 2);
  const rawCalType = String(birth.calType || "solar").trim().toLowerCase();
  const calType = CAL_TYPES.has(rawCalType) ? rawCalType : "solar";
  const rawGender = String(card?.gender || "OTHER").trim().toUpperCase();
  const gender = GENDERS.has(rawGender) ? rawGender : "OTHER";

  return [
    BIRTH_KEY_VERSION,
    pad(year, 4),
    pad(month, 2),
    pad(day, 2),
    hour,
    minute,
    timeUnknown ? "1" : "0",
    calType,
    gender,
  ].join("|");
}

function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** ProfileCard → birthKey(sha256 hex 64자). 출생 정보가 불완전하면 "". */
export function computeBirthKey(card) {
  const normalized = normalizeProfileBirth(card);
  return normalized ? sha256Hex(normalized) : "";
}

/**
 * 궁합 신원. **본인 → 상대 순서를 유지한다**(정렬하지 않는다). 둘 중 하나라도 불완전하면 "".
 */
export function computeCompatBirthKey(mainCard, partnerCard) {
  const main = normalizeProfileBirth(mainCard);
  const partner = normalizeProfileBirth(partnerCard);
  if (!main || !partner) return "";
  return sha256Hex(`compat|${main}||${partner}`);
}

/** 엔타이틀먼트 행의 profileId 자리에 넣는 합성 값. 기존 unique 인덱스가 출생 정보 단위로 걸린다. */
export function toBirthEntitlementProfileId(birthKey) {
  const key = String(birthKey || "").trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(key) ? `${BIRTH_ENTITLEMENT_PROFILE_PREFIX}${key}` : "";
}

export function isBirthEntitlementProfileId(value) {
  return /^birth:[0-9a-f]{64}$/.test(String(value || "").trim());
}
