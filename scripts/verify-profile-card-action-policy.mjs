#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  policy: "worker/lib/profile-card-mutation-policy.js",
  profileLimits: "worker/lib/profile-limits.js",
  profileRoute: "worker/routes/profile.js",
  billingRoute: "worker/routes/billing.js",
  paymentsRoute: "worker/routes/payments.js",
  mePage: "app/me/MeClient.tsx",
  billingClient: "app/_lib/billing-client.ts",
  profileStorage: "app/_lib/profile-card-storage.ts",
  yeonSeed: "lib/yeon/profileSeed.ts",
  fptiExperience: "components/fpti/FptiExperience.tsx",
  destinyBias: "app/saju/destiny-bias/DestinyBiasClient.tsx",
  loveSimulation: "app/saju/love-simulation/_components/LoveSimulationEngine.tsx",
  destinyProfile: "js/destiny-profile.js",
  mainRuntime: "js/core/index-inline-runtime.js",
  vedicBook: "js/vedic-book.js",
  olympusOracle: "js/olympus-oracle.js",
  shareRuntime: "js/share.js",
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
    name: "profile read/update/delete are authenticated and account-scoped",
    includes: [
      ["profileRoute", "async function handleGetProfiles"],
      ["profileRoute", "async function handleGetCurrentProfile"],
      ["profileRoute", "async function handleUpdateProfile"],
      ["profileRoute", "ProfileCard.find({ userId })"],
      ["profileRoute", "ProfileCard.findOne({ userId: auth.userId, profileId }).lean()"],
      ["profileRoute", "ProfileCard.findOneAndUpdate("],
      ["profileRoute", "{ userId: auth.userId, profileId }"],
      ["profileRoute", "ProfileCard.findOneAndDelete({ userId: auth.userId, profileId })"],
      ["profileRoute", "userId: String(doc.userId || \"\")"],
      ["profileRoute", "profiles: markCurrentProfile"],
    ],
  },
  {
    name: "logged-in profile state ignores global localStorage caches",
    includes: [
      ["profileStorage", "const GUEST_PROFILE_KEY = \"codeDestiny:guestProfile\""],
      ["profileStorage", "function isLoggedInProfileScope"],
      ["profileStorage", "scopedActiveProfileCacheKey(scope)"],
      ["profileStorage", "const localFallback = () => (isLoggedInProfileScope() ? null : readCurrentDestinyProfile(undefined, predicate))"],
      ["profileStorage", "store.removeItem(`${PROFILE_STORAGE_NS}.list`)"],
      ["profileStorage", "store.removeItem(`${PROFILE_STORAGE_NS}.current`)"],
      ["destinyProfile", "function _dpClearGlobalProfileBridge"],
      ["destinyProfile", "var hasInitialSessionHint = _dpHasSessionHint()"],
      // 237dcffa 에서 캐시 프로필 즉시 렌더로 바뀌었다. 교차 사용자 누출을 막는 실제 장치는
      // 스코프 저장소와 아래 _dpClearGlobalProfileBridge 이므로 그쪽을 계속 단언한다.
      ["destinyProfile", "var initialProfile = DPStorage.current()"],
      ["destinyProfile", "? [_dpGetScopedActiveProfileCacheKey(scope)]"],
      ["mePage", "clearProfileState()"],
      ["mePage", "/api/profile/current"],
    ],
  },
  {
    name: "profile delete requires profile-card payment policy",
    includes: [
      ["policy", "PROFILE_CARD_DELETE_PAYMENT_REQUIRED"],
      ["policy", "PROFILE_CARD_PAYMENT_BYPASS"],
      ["profileRoute", "ensureProfileDeleteAuthorized(auth, {"],
      ["profileRoute", "findProfileMutationPaymentEvidence(auth, { action, profileId, requestId, body })"],
      ["profileLimits", "if (profiles.length <= 1)"],
    ],
    excludes: [
      ["policy", "VVIP_PROFILE_LIMIT_INCLUDED"],
      ["policy", "PASS_PROFILE_LIMIT_INCLUDED"],
      ["mePage", "VVIP 무료"],
    ],
  },
  {
    name: "profile update uses the same Family bypass and 5,000 won payment policy",
    includes: [
      ["policy", "UPDATE: \"update\""],
      ["policy", "PROFILE_CARD_UPDATE_PAYMENT_REQUIRED"],
      ["policy", "normalizedAction === PROFILE_CARD_MUTATION_ACTIONS.UPDATE"],
      ["profileRoute", "action: PROFILE_CARD_MUTATION_ACTIONS.UPDATE"],
      ["profileRoute", "actionType: \"profile_card_update\""],
      ["billingRoute", "profile_card_update"],
      ["mePage", "profile_card_update_50c"],
      ["mePage", "프로필 수정·삭제에는 5,000원 단건 결제 또는 월정석 사용이 필요합니다."],
      ["destinyProfile", "method: isUpdate ? 'PATCH' : 'POST'"],
      ["destinyProfile", "window.dpEditProfile"],
    ],
  },
  {
    // 카드를 이미 가진 사용자의 "추가" 진입점은 두 번 사라진 적이 있다.
    // ① fd25c7cd9: _dpUpdateSaveBtn 이 hasProfiles 로 조기 반환해 저장 버튼이 영구 "수정"이 됐다.
    // ② 00fa86d97(#248): 한도 초과 alert 가 createRequiresPayment 과부하 탓에 수정 요청까지 삼켰다.
    // 추가/수정 구분은 _dpProfileEditTargetId 플래그 하나로만 하고, 한도 초과는 차단이 아니라
    // 서버 402 → _dpRunProfileManageGate 결제창으로 흘려보낸다(React /me·서버 정책과 동일).
    name: "profile add entry point stays reachable for existing card holders",
    includes: [
      ["destinyProfile", "var _dpProfileEditTargetId = ''"],
      ["destinyProfile", "window.dpStartProfileCreate"],
      ["destinyProfile", "function _dpClearProfileEditMode"],
      ["destinyProfile", "var isUpdate = !!_dpProfileEditTargetId"],
      ["destinyProfile", "var createRequiresPayment = !isUpdate && !canUsePlanSlot"],
      ["destinyProfile", "class=\"dp-list-add\""],
      ["mePage", "mePage.013"],
    ],
    excludes: [
      // 한도 초과를 alert 로 막으면 무료 사용자의 추가 버튼이 다시 죽는다.
      ["destinyProfile", "현재 이용권에서는 프로필 카드를 "],
      // 저장 버튼 라벨을 "카드 보유 여부"로 갈라 수정 모드에 가두는 회귀.
      ["destinyProfile", "var createRequiresPayment = isUpdate ? !isFamilyPlan : !canUsePlanSlot"],
    ],
  },
  {
    name: "profile delete modal opens before auth or payment network work",
    includes: [
      ["destinyProfile", "삭제창은 로컬 카드만으로 먼저 열어 체감 지연을 없앤다."],
      ["destinyProfile", "_dpRunProfileDeleteGate(profile, profileId, requestId)"],
      ["destinyProfile", "var isFamilyPlan = _dpSubIsActive && _dpSubTier === 'family'"],
      ["destinyProfile", "프로필 수정·삭제에는 5,000원 단건 결제 또는 월정석 사용이 필요합니다."],
    ],
    excludes: [
      ["destinyProfile", "_dpVerifyLoginSession(true).then(function(ok) {\n      if (!ok) throw new Error('AUTH_REQUIRED');\n      _dpSetPaymentPending(false);\n      return _dpRunProfileDeleteGate"],
    ],
  },
  {
    name: "profile create follows family bypass and paid fallback policy",
    includes: [
      ["policy", "resolveProfileCardActionAccess"],
      ["policy", "PROFILE_SUBSCRIPTION_INACTIVE"],
      ["policy", "FAMILY_OR_ABOVE_CAN_ADD_PROFILE = true"],
      ["policy", "buildFamilyProfileCardBypassPolicy"],
      ["policy", "if (isFamilyOrAbove(user))"],
      ["policy", "PROFILE_CARD_PAYMENT_BYPASS"],
      ["policy", "PROFILE_CARD_CREATE_PAYMENT_REQUIRED"],
      ["profileRoute", "const profilePolicySnapshot = buildProfilePolicySnapshot"],
      ["profileRoute", "const createFitsLocalPolicy = canCreateProfileWithinSubscriptionLimit"],
      ["profileRoute", "PROFILE_LIMIT_RECONCILE_REQUIRED"],
      ["mePage", "const isFamilyProfilePlan = subscription.isActive && subscription.tier === \"family\""],
      ["mePage", "const createRequiresProfileActionPayment = !isFamilyProfilePlan"],
      ["mePage", "Code Destiny Family 이용권으로 새 프로필 카드를 제한 없이 추가할 수 있습니다."],
    ],
    excludes: [
      ["mePage", "runProfileActionPassGate"],
      ["mePage", "/api/billing/coin-gate"],
    ],
  },
  {
    // 계정당 첫 프로필 카드는 이용권 유무·등급과 무관하게 무조건 무료다(docs/payment-policy-content-access.md:40).
    // 이 규칙이 등급(family) 검사보다 '먼저' 평가되어야 무과금·무이용권 유저도 첫 카드를 무료로 만든다.
    // buildInitialProfileCardFreePolicy가 결제 불필요·0원임을 함께 고정한다.
    name: "first profile card is unconditionally free before any tier check",
    includes: [
      ["policy", "FREE_INITIAL_PROFILE_CARD_COUNT = 1"],
      ["policy", "count < FREE_INITIAL_PROFILE_CARD_COUNT"],
      ["policy", "buildInitialProfileCardFreePolicy"],
      ["policy", "INITIAL_PROFILE_CARD_FREE"],
    ],
    // 첫 카드 무료 분기가 등급 검사(isFamilyOrAbove)보다 소스상 먼저 나와야 한다 — 순서가 뒤집히면
    // 첫 카드가 등급 판정에 좌우된다. resolveProfileCardActionAccess의 CREATE 블록에서 확인한다
    // (그 블록의 첫 카드 마커 `count < FREE_INITIAL_PROFILE_CARD_COUNT`가 `isFamilyOrAbove(user)`보다 앞).
    ordered: [
      ["policy", "if (count < FREE_INITIAL_PROFILE_CARD_COUNT) {", "if (isFamilyOrAbove(user)) {"],
    ],
    // buildInitialProfileCardFreePolicy는 무료여야 한다(결제 필요 표기 금지).
    freeInitialPolicy: true,
  },
  {
    // family 무료는 '이용권으로 결제'가 아니라 '가격이 0원'인 정책 바이패스다. 따라서 판정은 정책 계층
    // (profile-card-mutation-policy.js → worker/routes/profile.js)에만 있어야 하고, 결제 게이트(billing.js)의
    // 이용권 경로는 프로필 카드에 대해 아무 것도 내주면 안 된다 — 게이트는 profile.js가 402를 준 뒤에만 열린다.
    // (과거엔 billing.js가 pass 경로에서 정책을 재조회해 무료를 내주며 tier를 "family"로 하드코딩했고,
    //  그 탓에 이용권 없는 유저의 첫 카드가 family_pass로 오기록됐다. 그 하드코딩은 제거됐다.)
    name: "family-only profile bypass lives in the policy layer, not the billing pass gate",
    includes: [
      ["policy", "FAMILY_OR_ABOVE_FREE_PROFILE_DELETE = true"],
      ["policy", "FAMILY_OR_ABOVE_FREE_PROFILE_DELETE && normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.DELETE"],
      ["mePage", "const deleteRequiresProfileActionPayment = !isFamilyProfilePlan"],
      ["mePage", "Code Destiny Family 이용권으로 프로필 카드를 결제 없이 삭제할 수 있습니다."],
      ["billingRoute", "featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY && licenseTier !== \"FAMILY\""],
      ["billingRoute", "profile_card_pass_excluded"],
      ["billingRoute", "actionType: \"profile_card_add_extra\""],
    ],
    excludes: [
      ["mePage", "const deleteRequiresProfileActionPayment = true"],
      // 프로필 카드 이용권 제외를 featureKey 예외 분기로 되풀지 말 것 — premium/vvip가 "이용권으로 커버됨"
      // + 결제수단 전부 숨김을 받은 뒤 소비 단계에서 거부되는 막다른 길이 재발한다.
      ["billingRoute", "isPassExcludedPricing(pricing) && !isProfileCardManage"],
      ["billingRoute", "isPassExcludedPricing(pricing) && pricingFeatureKey !== PROFILE_CARD_MANAGE_FEATURE_KEY"],
    ],
  },
  {
    name: "single payment products are profile-card specific",
    includes: [
      ["mePage", "profile_card_delete_50c"],
      ["mePage", "profile_card_add_extra_50c"],
      ["mePage", "profile_card_delete"],
      ["mePage", "profile_card_add_extra"],
      ["mePage", "const runProfileActionCardPayment = useCallback"],
      ["mePage", "paymentMode: \"DIRECT_KRW\""],
      ["billingClient", "actionType: input.actionType"],
      ["billingClient", "profileCardId: input.profileCardId || input.profileId"],
      ["destinyProfile", "if (opts.actionType) checkoutPayload.actionType = opts.actionType"],
      ["destinyProfile", "checkoutPayload.profileCardId = opts.profileCardId || opts.profileId"],
      ["paymentsRoute", "createDigitalContentAccessEvidence"],
      ["paymentsRoute", "fetchPortOnePayment(env, impUid)"],
    ],
    excludes: [
      ["mePage", "/api/payments/prepare"],
      ["mePage", "/api/payments/confirm"],
      ["mePage", "window.PortOne"],
    ],
  },
  {
    name: "membership benefit cost is fixed at 50 and requires atomic Payment Service evidence",
    includes: [
      ["policy", "PROFILE_CARD_DELETE_COST_MONTHLY_STONES = PROFILE_CARD_DELETE_COST_COINS * 10"],
      ["profileRoute", "PROFILE_CARD_MANAGE_MEMBERSHIP_COST"],
      ["profileRoute", "evidencePaymentMethodMatches"],
      ["profileRoute", "profileCardActionPaymentRequiredResponse"],
      ["mePage", "const runProfileActionMonthlyPayment = useCallback"],
      ["mePage", "const result = await runBillingCoinGate({"],
      ["mePage", "paymentMode: \"MOONLIGHT_STONE\""],
      ["mePage", "paymentContext = await runProfileActionMonthlyPayment(action, profile, requestId)"],
      ["mePage", "paymentContext = await runProfileActionMonthlyPayment(\"create\", actionProfile, requestId)"],
      ["billingClient", "actionType?: string"],
      ["billingClient", "profileAction?: string"],
      ["mePage", "월정석 ${formatMonthlyStoneValue(PROFILE_CARD_ACTION_MEMBERSHIP_CREDIT_COST)} 사용"],
    ],
    excludes: [
      ["profileRoute", "consumeMonthlyCreditLots"],
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
      ["profileRoute", "resolveProfileMutationPaymentMethod"],
      ["profileRoute", "evidencePaymentMethodMatches"],
      ["profileRoute", "claimProfileMutationEvidence"],
      ["profileRoute", "recordProfileMutationCompleted"],
      ["billingRoute", "profile_card_pass_excluded"],
      ["mePage", "paymentMethod: \"single_purchase\""],
      ["mePage", "paymentMethod: \"membership_credit\""],
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
    name: "profile card birth date rehydrates into date input",
    includes: [
      ["destinyProfile", "bdEl.value = _dpBuildProfileBirthDateValue(b.year, b.month, b.day);"],
      ["profileRoute", "findProfileMutationPaymentEvidence(auth, { action, profileId, requestId, body })"],
    ],
    excludes: [
      ["destinyProfile", "bdEl.value = String(b.year || '').padStart(4, '0') + String(b.month || '').padStart(2,'0') + String(b.day || '').padStart(2,'0');"],
    ],
  },
  {
    name: "profile card result bridges normalize digit birth dates",
    includes: [
      ["mainRuntime", "function _dpParseBirthPartsForFeature(profile)"],
      ["mainRuntime", "datePart.replace(/\\D/g, '').slice(0, 4)"],
      ["mainRuntime", "var profiles = _dpNormalizeProfileListForFeature(s ? s.list() : []);"],
      ["mainRuntime", "profile = _dpNormalizeProfileForFeature(profile) || profile;"],
      ["mainRuntime", "row = _dpNormalizeProfileForFeature(row) || row;"],
    ],
  },
  {
    name: "shared profile storage normalizes profile birth date shapes",
    includes: [
      ["profileStorage", "export function resolveDestinyProfileBirthParts"],
      ["profileStorage", "export function normalizeDestinyProfileCard"],
      ["profileStorage", "birthDateDigits: birthDate.replace(/\\D/g, \"\")"],
      ["profileStorage", ".map((profile) => normalizeDestinyProfileCard(profile))"],
    ],
  },
  {
    name: "yeon and fpti use normalized profile-card birth dates",
    includes: [
      ["yeonSeed", "readCurrentDestinyProfile()"],
      ["yeonSeed", "resolveDestinyProfileBirthParts"],
      ["fptiExperience", "parseDatePartsFromText(profile.birthDate)"],
      ["fptiExperience", "const compact = source.match(/^(\\d{4})(\\d{2})(\\d{2})$/)"],
    ],
  },
  {
    name: "destiny bias reads current profile card before auth fallback",
    includes: [
      ["destinyBias", "readCurrentDestinyProfile"],
      ["destinyBias", "resolveDestinyProfileBirthParts"],
      ["destinyBias", "birthDateInput: profileBirthDateInput || fallbackBirthDateInput"],
    ],
  },
  {
    name: "love simulation reads current profile card and avoids fixed-date slicing",
    includes: [
      ["loveSimulation", "readCurrentDestinyProfile"],
      ["loveSimulation", "function parseProfileSeedBirthDate"],
      ["loveSimulation", "const currentProfile = readCurrentDestinyProfile() as StoredProfile | null"],
    ],
    excludes: [
      ["loveSimulation", "profileSeed.birthDate.split(\"-\")"],
      ["loveSimulation", "profileSeed.birthDate.slice(5, 7)"],
      ["loveSimulation", "profileSeed.birthDate.slice(8, 10)"],
    ],
  },
  {
    name: "vedic main form fallback accepts YYYYMMDD birth date input",
    includes: [
      ["mainRuntime", "var digits = bd.replace(/\\D/g, '');"],
      ["mainRuntime", "[digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]"],
    ],
    excludes: [
      ["mainRuntime", "var parts = bd.split('-');"],
    ],
  },
  {
    name: "static premium runtimes accept YYYYMMDD birth date fallback",
    includes: [
      ["vedicBook", "var dateParts = _parseBirthDateParts(birthDateEl.value);"],
      ["olympusOracle", "var digits = birthDate.replace(/\\D/g, '');"],
      ["shareRuntime", "var birthDateDigits = String(birthDate || '').replace(/\\D/g, '');"],
    ],
    excludes: [
      ["vedicBook", "birthDateEl.value.split('-')"],
      ["olympusOracle", "birthDate.split('-')"],
      ["shareRuntime", "birthDate.split('-')[0]"],
    ],
  },
  {
    name: "mobile modal and loading UI remain available",
    includes: [
      ["mePage", "sm:items-center"],
      ["mePage", "rounded-t-2xl"],
      ["mePage", "min-h-[44px]"],
      ["mePage", "결제창을 여는 중입니다."],
      ["mePage", "월정석을 적용하는 중입니다."],
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
  // ordered: [fileKey, earlierMarker, laterMarker] — earlierMarker가 소스상 laterMarker보다 앞에 있어야 한다.
  const orderViolations = (testCase.ordered || []).filter(([fileKey, earlier, later]) => {
    const src = texts[fileKey] || "";
    const ei = src.indexOf(earlier);
    const li = src.indexOf(later);
    return ei < 0 || li < 0 || ei >= li;
  });
  // freeInitialPolicy: buildInitialProfileCardFreePolicy가 requiresPayment:false + costKrw:0 를 반환해야 한다.
  const freeInitialViolation = testCase.freeInitialPolicy
    ? !/function buildInitialProfileCardFreePolicy[\s\S]{0,300}?requiresPayment:\s*false[\s\S]{0,200}?costKrw:\s*0/.test(texts.policy || "")
    : false;

  if (missing.length > 0 || presentButForbidden.length > 0 || orderViolations.length > 0 || freeInitialViolation) {
    failed = true;
    console.error(`\n[verify-profile-card-action-policy] FAIL: ${testCase.name}`);
    for (const [fileKey, marker] of missing) {
      console.error(`  - ${files[fileKey]} missing marker: ${marker}`);
    }
    for (const [fileKey, marker] of presentButForbidden) {
      console.error(`  - ${files[fileKey]} contains forbidden marker: ${marker}`);
    }
    for (const [fileKey, earlier, later] of orderViolations) {
      console.error(`  - ${files[fileKey]} order violation: "${earlier}" must precede "${later}"`);
    }
    if (freeInitialViolation) {
      console.error(`  - ${files.policy}: buildInitialProfileCardFreePolicy must return requiresPayment:false + costKrw:0`);
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
