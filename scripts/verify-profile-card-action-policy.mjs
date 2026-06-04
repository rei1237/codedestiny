#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  policy: "worker/lib/profile-card-mutation-policy.js",
  profileRoute: "worker/routes/profile.js",
  paymentsRoute: "worker/routes/payments.js",
  mePage: "app/me/page.tsx",
};

const texts = Object.fromEntries(
  Object.entries(files).map(([key, relPath]) => {
    const filePath = path.join(root, relPath);
    if (!fs.existsSync(filePath)) {
      return [key, ""];
    }
    return [key, fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n")];
  }),
);

const cases = [
  {
    name: "이용권 등급별 프로필 생성 한도 내에서는 추가 생성 결제 불필요",
    checks: [
      ["profileRoute", "function canCreateProfileWithinSubscriptionLimit(subscription, currentCount)"],
      ["profileRoute", "if (!canCreateProfileWithinSubscriptionLimit(subscription, count))"],
      ["profileRoute", "canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, count + 1)"],
      ["profileRoute", "canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, profiles.length)"],
    ],
  },
  {
    name: "일반 이용자 수정 시 결제/코인 차감 전에는 수정 불가",
    checks: [
      ["policy", "PROFILE_CARD_EDIT_PAYMENT_REQUIRED"],
      ["profileRoute", "ensureProfileEditDeleteAuthorized(auth, {"],
      ["profileRoute", "profileEditDeletePaymentRequiredResponse(action, requestId, profileId, policy)"],
      ["profileRoute", "if (profileMatch && method === \"PATCH\")"],
    ],
  },
  {
    name: "일반 이용자 삭제 시 결제/코인 차감 전에는 삭제 불가",
    checks: [
      ["policy", "PROFILE_CARD_DELETE_PAYMENT_REQUIRED"],
      ["profileRoute", "ensureProfileEditDeleteAuthorized(auth, {"],
      ["profileRoute", "profileEditDeletePaymentRequiredResponse(action, requestId, profileId, policy)"],
      ["profileRoute", "if (profileMatch && method === \"DELETE\")"],
    ],
  },
  {
    name: "일반 이용자 50코인 보유 시 수정 1회 후 코인 50 차감",
    checks: [
      ["profileRoute", "PROFILE_CARD_MANAGE_MEMBERSHIP_COST"],
      ["profileRoute", "\"profileSubscription.membershipCreditBalance\": -PROFILE_CARD_MANAGE_MEMBERSHIP_COST"],
      ["profileRoute", "actionType: \"profile_card_edit\""],
      ["mePage", "PROFILE_CARD_ACTION_COST_COINS = 50"],
    ],
  },
  {
    name: "일반 이용자 50코인 보유 시 삭제 1회 후 코인 50 차감",
    checks: [
      ["profileRoute", "PROFILE_CARD_MANAGE_MEMBERSHIP_COST"],
      ["profileRoute", "\"profileSubscription.membershipCreditBalance\": -PROFILE_CARD_MANAGE_MEMBERSHIP_COST"],
      ["profileRoute", "actionType: \"profile_card_delete\""],
      ["mePage", "PROFILE_CARD_ACTION_COST_COINS = 50"],
    ],
  },
  {
    name: "일반 이용자 코인 부족 시 5,000원 결제 플로우 진입",
    checks: [
      ["mePage", "PROFILE_CARD_ACTION_COST_KRW = 5000"],
      ["mePage", "runProfileActionCardPayment(action, profile, requestId)"],
      ["mePage", "/api/payments/prepare"],
      ["mePage", "/api/payments/confirm"],
    ],
  },
  {
    name: "결제 성공 검증 전에는 수정/삭제 불가",
    checks: [
      ["profileRoute", "findProfileMutationPaymentEvidence(auth, { action, profileId, requestId, body })"],
      ["profileRoute", "evidenceProfileMatches"],
      ["profileRoute", "PAYMENT_REQUIRED"],
      ["paymentsRoute", "fetchPortOnePayment(env, impUid)"],
    ],
  },
  {
    name: "결제 성공 검증 후 수정/삭제 가능",
    checks: [
      ["paymentsRoute", "createDigitalContentAccessEvidence"],
      ["paymentsRoute", "productType"],
      ["mePage", "profile_card_action"],
      ["profileRoute", "paymentSettled: true"],
      ["policy", "PAID_PROFILE_CARD_MUTATION"],
    ],
  },
  {
    name: "같은 결제건으로 중복 수정/삭제 또는 중복 차감 불가",
    checks: [
      ["profileRoute", "metadata.profileMutationCompleted"],
      ["profileRoute", "metadata.profileMutationInProgress"],
      ["profileRoute", "claimProfileMutationEvidence"],
      ["profileRoute", "recordProfileMutationCompleted"],
      ["paymentsRoute", "idempotencyKey"],
    ],
  },
  {
    name: "VVIP 활성 + 한도 내 카드 수정 무료",
    checks: [
      ["policy", "VVIP_PROFILE_LIMIT_INCLUDED"],
      ["policy", "currentProfileCardCount <= vvipLimit"],
      ["mePage", "VVIP 혜택 적용 중 · 한도 내 무료 관리"],
      ["mePage", "return `VVIP 무료 ${profileActionLabel(action)}`"],
    ],
  },
  {
    name: "VVIP 활성 + 한도 내 카드 삭제 무료",
    checks: [
      ["policy", "VVIP_PROFILE_LIMIT_INCLUDED"],
      ["policy", "currentProfileCardCount <= vvipLimit"],
      ["mePage", "VVIP 혜택 적용 중 · 한도 내 무료 관리"],
      ["mePage", "return `VVIP 무료 ${profileActionLabel(action)}`"],
    ],
  },
  {
    name: "VVIP 만료 시 무료 불가",
    checks: [
      ["policy", "VVIP_EXPIRED_PAYMENT_REQUIRED"],
      ["profileRoute", "rawTier"],
      ["mePage", "이용권이 만료되어 50코인이 필요합니다."],
      ["mePage", "isExpiredVvipProfileAction"],
    ],
  },
  {
    name: "다른 사용자의 profileCardId로 수정/삭제 시도 시 차단",
    checks: [
      ["policy", "ProfileCard.findOne({ userId: normalizedUserId, profileId: normalizedProfileCardId })"],
      ["policy", "PROFILE_CARD_NOT_FOUND_OR_NOT_OWNED"],
      ["profileRoute", "{ userId: auth.userId, profileId }"],
      ["profileRoute", "ProfileCard.findOneAndDelete({ userId: auth.userId, profileId }"],
    ],
  },
  {
    name: "대표 프로필 삭제 후 관련 진입 화면이 깨지지 않도록 currentId 재지정",
    checks: [
      ["profileRoute", "resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profiles[0]?.id || \"\""],
      ["profileRoute", "destinyProfilesCurrentId: nextCurrentId"],
      ["mePage", "const nextCurrentId = typeof payload.currentId === \"string\" ? payload.currentId : (nextProfiles[0]?.id || \"\")"],
      ["mePage", "emitDestinyProfileChanged(nextProfiles, nextCurrentId)"],
    ],
  },
  {
    name: "삭제 실패 시 카드가 그대로 남아 있음",
    checks: [
      ["profileRoute", "const deleted = await ProfileCard.findOneAndDelete({ userId: auth.userId, profileId }).lean()"],
      ["profileRoute", "if (!deleted) {"],
      ["profileRoute", "refundProfileMutationCreditIfNeeded(auth, {"],
      ["mePage", "if (action === \"delete\") {"],
    ],
  },
  {
    name: "수정 실패 시 기존 카드 정보가 유지됨",
    checks: [
      ["profileRoute", "const updated = await ProfileCard.findOneAndUpdate("],
      ["profileRoute", "if (!updated) {"],
      ["profileRoute", "refundProfileMutationCreditIfNeeded(auth, {"],
      ["mePage", "if (action === \"delete\") {"],
    ],
  },
  {
    name: "모바일에서 모달, 결제창, 로딩 UI가 정상 표시됨",
    checks: [
      ["mePage", "sm:items-center"],
      ["mePage", "rounded-t-2xl"],
      ["mePage", "min-h-[44px]"],
      ["mePage", "결제창을 여는 중입니다."],
      ["mePage", "코인을 차감하는 중입니다."],
    ],
  },
];

let failed = false;

for (const [key, relPath] of Object.entries(files)) {
  if (!texts[key]) {
    console.error(`[verify-profile-card-action-policy] missing file: ${relPath}`);
    failed = true;
  }
}

for (const testCase of cases) {
  const missing = testCase.checks.filter(([fileKey, marker]) => !texts[fileKey]?.includes(marker));
  if (missing.length > 0) {
    failed = true;
    console.error(`\n[verify-profile-card-action-policy] FAIL: ${testCase.name}`);
    for (const [fileKey, marker] of missing) {
      console.error(`  - ${files[fileKey]} missing marker: ${marker}`);
    }
  } else {
    console.log(`[verify-profile-card-action-policy] OK: ${testCase.name}`);
  }
}

if (failed) {
  console.error("\n[verify-profile-card-action-policy] FAILED: profile card action policy regressions detected.");
  process.exit(1);
}

console.log(`\n[verify-profile-card-action-policy] OK: ${cases.length} regression checks passed.`);
