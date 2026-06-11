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
    return [key, fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n") : ""];
  }),
);

const cases = [
  {
    name: "profile view is free and owner-scoped",
    includes: [
      ["profileRoute", "async function handleGetProfileDetail"],
      ["profileRoute", "ProfileCard.findOne({ userId: auth.userId, profileId })"],
      ["profileRoute", "if (profileMatch && method === \"GET\")"],
      ["mePage", "/api/profile/${encodeURIComponent(profile.id)}"],
    ],
  },
  {
    name: "profile delete requires profile-card payment policy",
    includes: [
      ["policy", "PROFILE_CARD_DELETE_PAYMENT_REQUIRED"],
      ["policy", "PROFILE_CARD_PAYMENT_BYPASS"],
      ["profileRoute", "ensureProfileDeleteAuthorized(auth, {"],
      ["profileRoute", "profileCardActionPaymentRequiredResponse(action, requestId, profileId, policy)"],
      ["profileRoute", "if (profileCount <= 1)"],
    ],
    excludes: [
      ["policy", "VVIP_PROFILE_LIMIT_INCLUDED"],
      ["policy", "PASS_PROFILE_LIMIT_INCLUDED"],
      ["mePage", "VVIP 무료"],
    ],
  },
  {
    name: "extra profile add uses slot limit, not content pass coin limit",
    includes: [
      ["policy", "resolveProfileCardActionAccess"],
      ["policy", "PROFILE_CARD_SLOT_AVAILABLE"],
      ["policy", "PROFILE_CARD_ADD_EXTRA_PAYMENT_REQUIRED"],
      ["profileRoute", "const createPolicy = await resolveProfileCardActionAccess"],
      ["mePage", "const canCreateWithinProfileLimit"],
      ["mePage", "const createRequiresProfileActionPayment"],
    ],
    excludes: [
      ["mePage", "runProfileActionPassGate"],
      ["mePage", "/api/billing/coin-gate"],
    ],
  },
  {
    name: "single payment products are profile-card specific",
    includes: [
      ["mePage", "profile_card_delete_50c"],
      ["mePage", "profile_card_add_extra_50c"],
      ["mePage", "profile_card_delete"],
      ["mePage", "profile_card_add_extra"],
      ["paymentsRoute", "createDigitalContentAccessEvidence"],
      ["paymentsRoute", "fetchPortOnePayment(env, impUid)"],
    ],
  },
  {
    name: "monthly stones cost is fixed at 500 and recorded atomically",
    includes: [
      ["policy", "PROFILE_CARD_DELETE_COST_MONTHLY_STONES = 500"],
      ["profileRoute", "PROFILE_CARD_MANAGE_MEMBERSHIP_COST"],
      ["profileRoute", "\"profileSubscription.membershipCreditBalance\": -PROFILE_CARD_MANAGE_MEMBERSHIP_COST"],
      ["profileRoute", "\"profileSubscription.membershipCreditUsed\": PROFILE_CARD_MANAGE_MEMBERSHIP_COST"],
      ["mePage", "월정석 500개"],
    ],
  },
  {
    name: "payment evidence cannot be reused across action/profile/cost",
    includes: [
      ["profileRoute", "evidenceProfileMatches"],
      ["profileRoute", "evidenceActionMatches"],
      ["profileRoute", "evidenceCostMatches"],
      ["profileRoute", "metadata.profileMutationCompleted"],
      ["profileRoute", "metadata.profileMutationInProgress"],
      ["profileRoute", "claimProfileMutationEvidence"],
      ["profileRoute", "recordProfileMutationCompleted"],
    ],
  },
  {
    name: "delete refreshes active profile safely",
    includes: [
      ["profileRoute", "const nextCurrentId = resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profiles[0]?.id || \"\""],
      ["profileRoute", "destinyProfilesCurrentId: nextCurrentId"],
      ["mePage", "emitDestinyProfileChanged(nextProfiles, nextCurrentId)"],
    ],
  },
  {
    name: "mobile modal and loading UI remain available",
    includes: [
      ["mePage", "sm:items-center"],
      ["mePage", "rounded-t-2xl"],
      ["mePage", "min-h-[44px]"],
      ["mePage", "결제창을 여는 중입니다."],
      ["mePage", "월정석을 차감하는 중입니다."],
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
  const missing = (testCase.includes || []).filter(([fileKey, marker]) => !texts[fileKey]?.includes(marker));
  const presentButForbidden = (testCase.excludes || []).filter(([fileKey, marker]) => texts[fileKey]?.includes(marker));

  if (missing.length > 0 || presentButForbidden.length > 0) {
    failed = true;
    console.error(`\n[verify-profile-card-action-policy] FAIL: ${testCase.name}`);
    for (const [fileKey, marker] of missing) {
      console.error(`  - ${files[fileKey]} missing marker: ${marker}`);
    }
    for (const [fileKey, marker] of presentButForbidden) {
      console.error(`  - ${files[fileKey]} contains forbidden marker: ${marker}`);
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
