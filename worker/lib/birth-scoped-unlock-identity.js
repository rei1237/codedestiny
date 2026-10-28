/**
 * 출생 기반 영구 해금의 신원 해석기. **지급·조회 경로가 모두 이 한 곳을 지난다.**
 *
 * - 입력은 profileId(+궁합은 partnerProfileId)뿐이다. 생년월일은 **서버에 저장된 이 계정의 ProfileCard**
 *   에서만 읽는다. 요청 본문의 birth 는 절대 보지 않는다.
 * - profileId 가 없으면 MISSING_PROFILE_ID, 이 계정 소유가 아니거나 출생 정보가 불완전하면 INVALID_PROFILE.
 * - 결과의 entitlementProfileId("birth:<sha256>")를 ContentEntitlement.profileId 에, scope 는 "BIRTH" 로 쓴다.
 *   그래서 기존 unique 인덱스({userId, profileId, serviceKey, contentKey, scope})가 출생 정보 단위로 걸린다.
 *
 * findProfileCard 주입: mongoose 경로(기본)와 payments V2 의 db.findOne 경로가 같은 해석을 쓰게 한다.
 */
import mongoose from "mongoose";
// 네임스페이스 import — models.js 를 부분 목으로 대역하는 테스트에서도 링크가 깨지지 않게 한다.
import * as models from "./models.js";
import { createHttpError } from "./http.js";
import {
  BIRTH_ENTITLEMENT_SCOPE,
  computeBirthKey,
  computeCompatBirthKey,
  isBirthEntitlementProfileId,
  toBirthEntitlementProfileId,
} from "./birth-key.js";
import { isBirthScopedUnlockFeatureKey, normalizePaidFeatureKey } from "./paid-feature-registry.js";

const COMPAT_FEATURE_KEY = "section_compat";

function clean(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

export function requiresPartnerProfile(featureKey) {
  return normalizePaidFeatureKey(clean(featureKey, 160)) === COMPAT_FEATURE_KEY;
}

async function defaultFindProfileCard({ userId, profileId }) {
  const uid = clean(userId, 120);
  if (!mongoose.isValidObjectId(uid)) return null;
  if (!models.ProfileCard) throw new Error("ProfileCard model is unavailable");
  return models.ProfileCard.findOne({ userId: uid, profileId }).select("profileId gender birth").lean();
}

// billing.js 등은 error.code 를 본다(HttpError 는 payload.code 만 가진다) — 둘 다 싣는다.
function identityError(status, message, code, reason) {
  const error = createHttpError(status, message, { code, reason, requiresProfile: true });
  error.code = code;
  return error;
}

function missingProfile(message = "이 콘텐츠는 저장된 프로필을 선택한 뒤 구매할 수 있습니다.") {
  return identityError(400, message, "MISSING_PROFILE_ID", "missing_profile_id");
}

function invalidProfile(message = "선택한 프로필을 확인할 수 없습니다. 저장된 내 프로필을 선택해 주세요.") {
  return identityError(403, message, "INVALID_PROFILE", "invalid_profile");
}

/**
 * 엄격 해석. 실패하면 던진다(지급·결제 시작 경로용).
 * @returns {Promise<{profileId:string, partnerProfileId:string, birthKey:string, partnerBirthKey:string,
 *   entitlementProfileId:string, scope:"BIRTH", featureKey:string}>}
 */
export async function resolveBirthUnlockIdentity({
  userId,
  profileId,
  partnerProfileId = "",
  featureKey,
} = {}, { findProfileCard = defaultFindProfileCard } = {}) {
  const uid = clean(userId, 120);
  const pid = clean(profileId, 80);
  const feature = normalizePaidFeatureKey(clean(featureKey, 160)) || clean(featureKey, 160);
  if (!uid) throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
  // 합성 신원("birth:…")은 서버 내부 값이다. 클라이언트가 보낸 값으로는 받지 않는다.
  if (!pid || isBirthEntitlementProfileId(pid)) throw missingProfile();

  const card = await findProfileCard({ userId: uid, profileId: pid });
  if (!card) throw invalidProfile();

  let birthKey = computeBirthKey(card);
  let partnerBirthKey = "";
  let partnerPid = "";
  if (requiresPartnerProfile(feature)) {
    partnerPid = clean(partnerProfileId, 80);
    if (!partnerPid || isBirthEntitlementProfileId(partnerPid)) {
      throw missingProfile("궁합은 상대방도 저장된 프로필로 선택해야 구매할 수 있습니다.");
    }
    const partner = await findProfileCard({ userId: uid, profileId: partnerPid });
    if (!partner) throw invalidProfile("궁합 상대 프로필을 확인할 수 없습니다.");
    partnerBirthKey = computeBirthKey(partner);
    birthKey = computeCompatBirthKey(card, partner);
  }
  const entitlementProfileId = toBirthEntitlementProfileId(birthKey);
  if (!entitlementProfileId) throw invalidProfile("프로필의 생년월일 정보가 완전하지 않습니다.");

  return {
    profileId: pid,
    partnerProfileId: partnerPid,
    birthKey,
    partnerBirthKey,
    entitlementProfileId,
    scope: BIRTH_ENTITLEMENT_SCOPE,
    featureKey: feature,
  };
}

/** 관대 해석. 실패하면 null(조회 경로용 — 신원을 못 만들면 잠금이다). DB 오류는 그대로 던진다. */
export async function tryResolveBirthUnlockIdentity(input = {}, options = {}) {
  try {
    return await resolveBirthUnlockIdentity(input, options);
  } catch (error) {
    const code = String(error?.code || "");
    if (code === "MISSING_PROFILE_ID" || code === "INVALID_PROFILE" || code === "UNAUTHORIZED") return null;
    throw error;
  }
}

export function isBirthUnlockIdentityError(error) {
  const code = String(error?.code || "");
  return code === "MISSING_PROFILE_ID" || code === "INVALID_PROFILE";
}

export { isBirthScopedUnlockFeatureKey };
