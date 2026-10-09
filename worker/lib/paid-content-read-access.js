import mongoose from "mongoose";
import { connectDb, withMongoRetry } from "./db.js";
// 네임스페이스 import — models.js 를 부분 목으로 대역하는 테스트에서 ProfileCard 가 없어도 링크가 깨지지 않게 한다.
import * as models from "./models.js";
import { lunarToSolar } from "../../lib/korean-calendar/index.js";
import { findActivePaidContentUnlock, isProfileScopedContentUnlockFeatureKey } from "./content-unlocks.js";
import {
  isUnlockPaidFeatureKey,
  normalizePaidFeatureKey,
  LOVE_CODE_FEATURE_KEY,
  LEGACY_LOVE_CODE_FEATURE_KEYS,
} from "./paid-feature-registry.js";

// billing의 계정 해금 읽기 계약. 스냅샷이 없는 상세 조회는 두 레거시 필드를 모두 읽는다.
export async function hasUserScopedPermanentUnlock(env, { userId, featureKey, unlockedFeatures = null }) {
  const key = normalizePaidFeatureKey(featureKey);
  const legacyLoveCodeLookup = key === LOVE_CODE_FEATURE_KEY;
  if (!userId || !key || (!isUnlockPaidFeatureKey(key) && !legacyLoveCodeLookup) || isProfileScopedContentUnlockFeatureKey(key)) return false;
  if (Array.isArray(unlockedFeatures)) {
    if (legacyLoveCodeLookup) return unlockedFeatures.some((entry) => LEGACY_LOVE_CODE_FEATURE_KEYS.includes(String(entry || "").trim()));
    return unlockedFeatures.some((entry) => normalizePaidFeatureKey(entry) === key);
  }
  await connectDb(env);
  const readKeys = key === LOVE_CODE_FEATURE_KEY ? [key, ...LEGACY_LOVE_CODE_FEATURE_KEYS] : [key];
  return Boolean(await models.User.exists({
    _id: userId,
    $or: [{ unlockedFeatures: { $in: readKeys } }, { paidFeatures: { $in: readKeys } }],
  }));
}

// 구매 후 계정 단위 재열람 전용. 이용권 판정·차감·해금 생성·접근 허용 캐시는 없다.
// DB 오류는 호출자에게 전달하여 미구매(402)로 바뀌지 않게 한다.
export async function hasPurchasedAccountContentAccess(env, { userId, featureKey }) {
  const key = normalizePaidFeatureKey(featureKey);
  if (!userId || !key || !isUnlockPaidFeatureKey(key) || isProfileScopedContentUnlockFeatureKey(key)) return false;
  return withMongoRetry(env, async () => {
    await connectDb(env);
    const [entitlement, legacyUnlock] = await Promise.all([
      findActivePaidContentUnlock({ userId, featureKey: key }),
      hasUserScopedPermanentUnlock(env, { userId, featureKey: key }),
    ]);
    return Boolean(entitlement || legacyUnlock);
  });
}

function pad(value, width) {
  return String(value).padStart(width, "0");
}

/** 저장된 ProfileCard 의 출생 정보 → 계산용 양력 입력. 음력은 여기서만 환산한다(신원 birthKey 는 환산하지 않는다). */
export function profileCardSolarBirth(card) {
  const birth = card?.birth && typeof card.birth === "object" ? card.birth : {};
  let year = Number(birth.year);
  let month = Number(birth.month);
  let day = Number(birth.day);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const calType = String(birth.calType || "solar");
  const isLunar = calType === "lunar" || calType === "lunar_leap";
  // 음력 그대로 받는 계산기(자미두수 등)용 원본 달력 날짜.
  const calendarDate = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  if (isLunar) {
    const solar = lunarToSolar(year, month, day, calType === "lunar_leap");
    if (!solar) return null;
    ({ year, month, day } = solar);
  }
  const timeKnown = birth.timeUnknown !== true;
  const hour = timeKnown ? Math.trunc(Number(birth.hour) || 0) : 12;
  const minute = timeKnown ? Math.trunc(Number(birth.minute) || 0) : 0;
  return {
    year, month, day, hour, minute, timeKnown,
    calType,
    calendarType: isLunar ? "lunar" : "solar",
    isLeapMonth: calType === "lunar_leap",
    calendarDate,
    gender: String(card?.gender || ""),
    date: `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`,
    time: timeKnown ? `${pad(hour, 2)}:${pad(minute, 2)}` : "",
  };
}

/**
 * 출생 기반 유료 콘텐츠 라우트의 단일 읽기 입구.
 * - profileId 는 필수, 이 계정 소유의 저장 프로필이어야 한다(아니면 MISSING_PROFILE_ID / INVALID_PROFILE).
 * - 해금 여부는 그 프로필의 **현재 출생 정보(birthKey)** 로만 판정한다. USER 행·계정 배열은 근거가 아니다.
 * - 라우트는 요청 본문의 생년월일 대신 반환된 birth 로 계산해야 한다(다른 사람 출생으로 열람 차단).
 * - DB 오류는 호출자에게 전달한다(미구매 402 로 바뀌지 않게).
 * @returns {Promise<{ok:boolean, reason?:string, unlocked:boolean, card?:object, birth?:object|null}>}
 */
export async function readProfileBirthUnlock(env, { userId, profileId, partnerProfileId = "", featureKey }) {
  const uid = String(userId || "").trim();
  const pid = String(profileId || "").trim().slice(0, 80);
  const key = normalizePaidFeatureKey(featureKey);
  if (!uid) return { ok: false, reason: "LOGIN_REQUIRED", unlocked: false };
  if (!pid || pid.startsWith("birth:")) return { ok: false, reason: "MISSING_PROFILE_ID", unlocked: false };
  return withMongoRetry(env, async () => {
    await connectDb(env);
    if (!mongoose.isValidObjectId(uid)) return { ok: false, reason: "INVALID_PROFILE", unlocked: false };
    if (!models.ProfileCard) throw new Error("ProfileCard model is unavailable");
    const findCard = (profileIdToFind) => models.ProfileCard.findOne({ userId: uid, profileId: profileIdToFind })
      .select("profileId gender birth").lean();
    const card = await findCard(pid);
    if (!card) return { ok: false, reason: "INVALID_PROFILE", unlocked: false };
    const doc = await findActivePaidContentUnlock({
      userId: uid,
      profileId: pid,
      partnerProfileId,
      featureKey: key,
      findProfileCard: async ({ profileId: wanted }) => (wanted === pid ? card : findCard(wanted)),
    });
    return { ok: true, unlocked: Boolean(doc), card, birth: profileCardSolarBirth(card) };
  });
}
