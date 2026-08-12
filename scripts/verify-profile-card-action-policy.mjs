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
  billingClient: "app/_lib/billing-client.ts",
  profileStorage: "app/_lib/profile-card-storage.ts",
  yeonSeed: "lib/yeon/profileSeed.ts",
  fptiExperience: "components/fpti/FptiExperience.tsx",
  destinyBias: "app/saju/destiny-bias/DestinyBiasClient.tsx",
  loveSimulation: "app/saju/love-simulation/_components/LoveSimulationEngine.tsx",
  destinyProfile: "js/destiny-profile.js",
  mainRuntime: "js/core/index-inline-runtime.js",
  olympusOracle: "js/olympus-oracle.js",
  shareRuntime: "js/share.js",
  mobileTabs: "app/_lib/mobile-tabs.ts",
  appTabBar: "app/app/_components/AppTabBar.tsx",
};

/**
 * 프로필 카드 관리 화면은 정적 셸의 하단 시트 하나가 정본이다.
 * React 에 두 번째 구현(app/me)이 있던 시절, 같은 결제 정책을 두 벌로 유지하느라
 * 마커 38개가 MeClient.tsx 에 걸려 있었고 화면은 중복·오작동 상태로 방치됐다.
 * 다시 생기면 같은 이중화가 재발하므로 여기서 막는다.
 */
const REMOVED_REACT_PROFILE_ROUTE = "app/me";

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
      ["destinyProfile", "method: isUpdate ? 'PATCH' : 'POST'"],
      ["destinyProfile", "window.dpEditProfile"],
    ],
  },
  {
    // 카드를 이미 가진 사용자의 "추가" 진입점은 두 번 사라진 적이 있다.
    // ① fd25c7cd9: _dpUpdateSaveBtn 이 hasProfiles 로 조기 반환해 저장 버튼이 영구 "수정"이 됐다.
    // ② 00fa86d97(#248): 한도 초과 alert 가 createRequiresPayment 과부하 탓에 수정 요청까지 삼켰다.
    // 추가/수정 구분은 _dpProfileEditTargetId 플래그 하나로만 하고, 한도 초과는 차단이 아니라
    // 서버 402 → _dpRunProfileManageGate 결제창으로 흘려보낸다(서버 정책과 동일).
    name: "profile add entry point stays reachable for existing card holders",
    includes: [
      ["destinyProfile", "var _dpProfileEditTargetId = ''"],
      ["destinyProfile", "window.dpStartProfileCreate"],
      ["destinyProfile", "function _dpClearProfileEditMode"],
      ["destinyProfile", "var isUpdate = !!_dpProfileEditTargetId"],
      ["destinyProfile", "var createRequiresPayment = !isUpdate && !canUsePlanSlot"],
      ["destinyProfile", "class=\"dp-list-add\""],
      // 입력폼의 슬롯·편집 안내 — 셸 마크업에 없어 JS 가 만든다.
      // #dpProfileQuotaText 가 없으면 _dpUpdateProfileQuotaText 가 조용히 early-return 해
      // 슬롯·편집 안내가 화면에 뜨지 않는다(#416 에서 실제로 그 상태로 배포됐다).
      ["destinyProfile", "function _dpEnsureProfileFormControls"],
      ["destinyProfile", "quota.id = 'dpProfileQuotaText'"],
      // 🔴 폼 안의 추가 버튼(`dp-form-add`) 마커는 뺐다(2026-08-08).
      // 47e62424b 가 그 버튼을 지운 것은 목록의 `dp-list-add` 와 중복이었기 때문이고,
      // 이 검사가 지키려는 것은 특정 버튼이 아니라 "카드를 이미 가진 사용자에게 추가 진입점이
      // 남아 있는가" 다. 그 계약은 위 `class="dp-list-add"` 가 그대로 강제한다.
      // 진입점이 하나로 줄었으므로, 그 하나가 사라지면 여기서 바로 실패한다.
    ],
    excludes: [
      // 한도 초과를 alert 로 막으면 무료 사용자의 추가 버튼이 다시 죽는다.
      ["destinyProfile", "현재 이용권에서는 프로필 카드를 "],
      // 저장 버튼 라벨을 "카드 보유 여부"로 갈라 수정 모드에 가두는 회귀.
      ["destinyProfile", "var createRequiresPayment = isUpdate ? !isFamilyPlan : !canUsePlanSlot"],
    ],
  },
  {
    // 프로필 카드 관리의 두 번째 구현(React /me)이 되살아나면, 같은 결제 정책을 두 벌로
    // 유지해야 하고 그 화면은 지난번처럼 중복·오작동 상태로 방치된다. 진입점까지 함께 막는다.
    name: "profile card management lives only in the static shell",
    includes: [
      // React 하단 네비·앱 탭바의 마이 탭은 셸 액션으로 넘어간다.
      ["mobileTabs", "export const PROFILE_SHEET_ACTION = \"dpOpenList\""],
      ["mobileTabs", "href: `/?action=${PROFILE_SHEET_ACTION}`"],
      ["appTabBar", "PROFILE_SHEET_ACTION"],
      ["appTabBar", "function targetsStaticShell"],
      // 셸이 ?action=dpOpenList 를 자동 실행할 수 있어야 그 이동이 시트 열기로 이어진다.
      ["mainRuntime", "dpOpenList: true"],
    ],
    excludes: [
      ["mobileTabs", "\"/me\""],
      ["appTabBar", "\"/me\""],
    ],
    removedRoute: REMOVED_REACT_PROFILE_ROUTE,
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
      ["billingRoute", "featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY && licenseTier !== \"FAMILY\""],
      ["billingRoute", "profile_card_pass_excluded"],
      ["billingRoute", "actionType: \"profile_card_add_extra\""],
    ],
    excludes: [
      // 프로필 카드 이용권 제외를 featureKey 예외 분기로 되풀지 말 것 — premium/vvip가 "이용권으로 커버됨"
      // + 결제수단 전부 숨김을 받은 뒤 소비 단계에서 거부되는 막다른 길이 재발한다.
      ["billingRoute", "isPassExcludedPricing(pricing) && !isProfileCardManage"],
      ["billingRoute", "isPassExcludedPricing(pricing) && pricingFeatureKey !== PROFILE_CARD_MANAGE_FEATURE_KEY"],
    ],
  },
  {
    name: "single payment products are profile-card specific",
    includes: [
      ["billingClient", "actionType: input.actionType"],
      ["billingClient", "profileCardId: input.profileCardId || input.profileId"],
      ["destinyProfile", "if (opts.actionType) checkoutPayload.actionType = opts.actionType"],
      ["destinyProfile", "checkoutPayload.profileCardId = opts.profileCardId || opts.profileId"],
      ["paymentsRoute", "createDigitalContentAccessEvidence"],
      ["paymentsRoute", "fetchPortOnePayment(env, impUid)"],
    ],
  },
  {
    name: "membership benefit cost is fixed at 50 and requires atomic Payment Service evidence",
    includes: [
      ["policy", "PROFILE_CARD_DELETE_COST_MONTHLY_STONES = PROFILE_CARD_DELETE_COST_COINS * 10"],
      ["profileRoute", "PROFILE_CARD_MANAGE_MEMBERSHIP_COST"],
      ["profileRoute", "evidencePaymentMethodMatches"],
      ["profileRoute", "profileCardActionPaymentRequiredResponse"],
      ["billingClient", "actionType?: string"],
      ["billingClient", "profileAction?: string"],
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
    ],
  },
  {
    name: "delete refreshes active profile safely",
    includes: [
      ["profileRoute", "const nextCurrentId = resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profiles[0]?.id || \"\""],
      ["profileRoute", "destinyProfilesCurrentId: nextCurrentId"],
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
      ["olympusOracle", "var digits = birthDate.replace(/\\D/g, '');"],
      ["shareRuntime", "var birthDateDigits = String(birthDate || '').replace(/\\D/g, '');"],
    ],
    excludes: [
      ["olympusOracle", "birthDate.split('-')"],
      ["shareRuntime", "birthDate.split('-')[0]"],
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
  // removedRoute: 그 디렉터리가 되살아나면 프로필 카드 관리가 다시 두 벌이 된다.
  const removedRouteViolation = testCase.removedRoute
    ? fs.existsSync(path.join(root, testCase.removedRoute))
    : false;

  if (missing.length > 0 || presentButForbidden.length > 0 || orderViolations.length > 0 || freeInitialViolation || removedRouteViolation) {
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
    if (removedRouteViolation) {
      console.error(`  - ${testCase.removedRoute}/ 가 되살아났습니다. 프로필 카드 관리는 정적 셸(js/destiny-profile.js)이 정본입니다.`);
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
