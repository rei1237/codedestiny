---
status: done
updated: 2026-10-11
next: "완료. 운영 마이그레이션 dry-run·--apply 는 사용자 승인 대기(결과 절)."
---

# 이용권 기간 제거: 한도 소진으로만 중지 + 프로필 상한 제거

## 왜

"프로필 개수 상한이 없어지도록 설정했으므로 이용권에 30일 제한 문구는 필요없어졌으니까 없애고, 한도 금액을 다쓰면 이용권이 중지되도록만 설정해줘" (2026-10-11). 사용자 결정은 다음과 같다.
- 서버의 30일 만료를 없앤다. 이용권이 끝나는 조건은 한도 소진 하나다.
- 이미 활성인 이용권도 만료일을 해제한다(마이그레이션).
- 프로필 개수 상한도 서버와 문구에서 함께 없앤다.

## 지금 상태 (2026-10-11 조사)

- 한도 소진 시 중지는 이미 있다(2026-09-04, b2a98214a).
  - `consumePassCoverage`(worker/payments/passes.js:557-645)가 `applyBudgetExhaustionTermination`(:651-661)을 부른다.
  - 그러면 `buildPassTerminationFields`(worker/lib/profile-limits.js:368-385)가 `expiresAt: now`, `tier: "free"`, 한도 0, `passExhaustedAt` 을 쓴다.
  - 종료 판정은 `isPassBudgetExhausted`(profile-limits.js:344)다. 남은 한도가 `MIN_PASS_COVERABLE_COIN`(10) 미만이면 종료다.
- 활성 판정·사이클 키·환불이 모두 `expiresAt`(구매 시각 + 30일)에 묶여 있다.
  - 활성: `normalizeHoneyPassEntitlement`(profile-limits.js:572), `canUseByPass`(:788), `presentPassSubscription`(passes.js:358-382), `terminatePassOnBudgetExhaustion` 필터(passes.js:534-550), 클라 `js/core/pass-verdict.js:592`.
  - 사이클 키: `resolvePremiumQuotaCycleKey`(profile-limits.js:52-57)가 `expiresAt.toISOString()` 이다. `evaluatePassCoverage`(passes.js:417-449)는 cycleKey 가 있을 때만 예산을 본다.
  - 만료 계산: `computePassExpiry`(profile-limits.js:212-220), `buildPassCycleFields`(:241), `buildPassRewindCycleFields`(:278), `evaluatePassTierTransition`(:194).
  - 30일 강제: `pass-policy.js:26-49` durationDays 30, `payments/index.js:383-388`(INVALID_SUBSCRIPTION_DURATION), `payments/index.js:900-940`, `payments/passes.js:52,62-68,139-140,251-315`, `payments/gifts.js:159`, `payments/foreign-card-policy.js:30-32,52`, `routes/app-store.js:19,271,956-984`, `lib/app-store-pricing.js:24,80-83`, `routes/billing.js:932-962, 4703-4714`, `routes/fortune.js:2463-2466, 6204`.
  - 환불: `revokePassGrantForOrder`(passes.js:324-355)와 `revokeMembershipPassGrant`(lib/payment-refund.js:95-137)는 개월 수만큼 만료일을 되감는다. `lib/pass-consumption.js:282-298` 은 소진 직후 환불 시 `passExhaustedFromExpiresAt` 로 복구한다.
  - 스키마: `worker/lib/models.js:131-166` profileSubscription(MongoDB, SQL 마이그레이션 없음).
- 프로필 상한은 아직 남아 있다.
  - `canAddProfile`(worker/lib/profile-card-mutation-policy.js:110-132)이 `maxProfiles` 로 `PROFILE_LIMIT_EXCEEDED` 를 내고, 이용권이 없으면 `PROFILE_SUBSCRIPTION_INACTIVE`(limit 1)를 낸다.
  - `HONEY_PASS_POLICY.maxProfiles`(profile-limits.js:411), `PROFILE_LIMIT_BY_TIER`(:448), 모든 플랜의 `profileLimit`(pass-policy.js).
  - 클라 응답: `routes/profile.js:276,284,1305,1327`, `routes/billing.js:5372`. 클라 코드: `js/destiny-profile.js:10257`.

## 목표 동작 (정본)

1. 이용권에는 기간이 없다. 활성 = 등급이 있고 소진 종료되지 않았다. 시간이 지나도 끝나지 않는다.
2. 이용권은 한도(monthlyLimitCoin)를 다 쓰면 그 자리에서 중지된다. 기준과 문턱(`isPassBudgetExhausted`, 10코인)은 지금과 같다.
3. 재구매:
   - 활성 중 같은 등급 재구매 → 한도를 더한다(지금의 extend 와 같은 결과, 기간만 없음).
   - 상위 등급 → 등급을 올리고 사용액을 이어받는다(지금 규칙 유지).
   - 하위 등급 차단 → 지금 규칙 유지.
   - 소진·종료 후 구매 → 새 이용권.
4. 환불: 기간 되감기 대신 그 주문이 더한 한도를 빼서 되돌린다. 남은 한도가 문턱 미만이 되면 종료 필드로 정리한다. 기존처럼 판단이 안 되는 경우는 관리자 검토로 남긴다.
5. 프로필 개수 상한은 없다. 이용권 유무와 무관하게 추가를 막지 않는다. 추가·수정·삭제 수수료(1,000원 / 10코인 / 월정석 100개, 67801b2cc)는 그대로 둔다.
6. 가격, 건당 한도(maxCoveredCoin), 총 한도 금액, 결제 순서(이용권 → 월정석 → 단건)는 바꾸지 않는다.

## 설계 지침

- **활성 판정을 한 곳으로 모은다.** `isPassSubscriptionActive(sub, now)` 같은 헬퍼 하나를 만들고 위 '활성' 목록이 모두 그것을 쓰게 한다. `expiresAt > now` 를 직접 비교하는 코드가 남지 않게 grep 으로 확인한다.
- **사이클 키를 만료일에서 떼어낸다.** 이용권 시작 시점마다 바뀌는 값(예: 활성화 주문 id 또는 활성화 시각)을 쓴다. 구매·소진·환불·업그레이드에서 키가 바뀌는 시점이 지금과 같아야 한다. 이 키가 없으면 예산 검사가 꺼지므로(passes.js:417-449) 활성 이용권에 키가 비는 경로가 없어야 한다.
- **종료 필드:** `buildPassTerminationFields` 는 `expiresAt` 대신 종료 표시(`passExhaustedAt` 와 tier free)로 비활성을 표현한다. `expiresAt` 필드를 남길지는 구현자가 정하되, 남기면 활성 판정에 쓰지 않는다. `passExhaustedFromExpiresAt` 는 환불 복구(pass-consumption.js:282-298)가 계속 동작하도록 대체 필드로 바꾼다.
- **durationDays/durationMonths:** 요청 검증(INVALID_SUBSCRIPTION_DURATION, foreign-card PRODUCT_NOT_ELIGIBLE)은 기간 값을 요구하지 않게 한다. 다만 구 클라이언트가 `durationDays: 30` 을 보내도 그대로 통과해야 한다(하위 호환).
- **앱 상품 ID `cd_pass_*_30d_vN` 은 바꾸지 않는다.** Play 상품 ID는 바꿀 수 없다. 표시명·설명 문구만 바꾸고 Play Console 반영은 문서(docs/play-console-submission-values.md)로 남긴다. 콘솔에 직접 반영하지 않는다.
- **선물(gifts.js:159):** 선물 수령도 같은 규칙(기간 없음, 한도 추가)을 따른다.
- **dev 패치(billing.js:4703-4714), 클라 목업(index.html:13152)** 도 같은 모델로 맞춘다.

## 마이그레이션

- `scripts/migrations/` 에 스크립트를 추가한다. 대상은 `expiresAt > now` 이고 소진 종료되지 않은 활성 이용권이다. 이들에게 새 활성 표시와 사이클 키를 채운다. 사용액(monthlySpendCoin)과 한도는 그대로 둔다.
- 기본은 dry-run(대상 수와 샘플만 출력)이다. `--apply` 가 있어야 쓴다. 운영 DB 실행은 사용자 승인 후에만 한다.
- 배포 순서: 새 코드가 옛 문서(만료일만 있는 문서)도 활성으로 읽어야 한다. 그래서 코드 배포 → 마이그레이션 순서여도 배포와 실행 사이에 만료로 끊기는 사람이 없어야 한다. 이 호환 읽기를 테스트로 고정한다.

## 문구 (30일 · 프로필 상한 제거)

- 바꾸는 곳은 이용권 기간과 프로필 상한 문구뿐이다. 12개 로케일 모두 같은 키를 바꾼다.
  - 홈 셸: `index.html` 의 `home.gardenCopy.pass*`(:9338-9367), 등급 라벨(:14930), `home.passMini.*`(:17547-17658, chipThirtyDays 포함), `goldenPackages`(:20955-20958), `passHint.store`(:21597), `passShop.*`(:29246, 29297, 29304).
  - i18n 원본(`i18n/authored/`): `passPricing-01`, `passShopPackages-01`, `shellCopy-01`(terminationNote 는 "만료일·프로필 상한 유지"라고 해서 새 정책과 모순이므로 고친다), `shellCopy-02`, `shellCopy-04`, `shellCopy-10`(무관한 미커밋 변경이 있으니 해당 키만), `shellRuntime-09`(g0, g8), `shellRuntime-10`(s25-s29), `shellRuntime-60`(f3297, f3298, f3303, f3305, f3308), `shellRuntime-62`(f3376, f3378, f3383). `i18n/.footer-strings.json`, `i18n/pending/*.ko.json`, `i18n/glossary.json` 도 본다.
  - Next.js: `app/points/PointsClient.tsx`(문구와 `durationDays: 30` 요청 값, 플랜 옵션 "30d"), `app/app/_lib/copy.ts`(passTerminationNote 포함), `app/gift/*`, `app/terms-of-service/TermsContent.jsx`(85, 150, 153, 159, 171, 200), `lib/legal/refund-policy-rows.js`(14, 18), `app/_content/faq-copy.js:33`, `app/components/SiteFooterHub.jsx:230`, `lib/i18n/siteFooterHubCopy.ts:314`.
  - 약관 환불 조항은 "이미 제공된 기간" 대신 "이미 사용한 한도"를 기준으로 쓴다. 소진 후 "30일과 월 이용 한도가 다시 시작" 문구(:85, f3378)는 지운다.
  - 문서: `docs/context/payment-gating.md`(80, 81, 86, 175 + 아래 승인 절 추가), `docs/payment-policy-overview.md`, `docs/payment-policy-flow.md:107`, `docs/payment-policy-content-access.md:34`, `docs/PAYMENT_AND_ACCESS.md:29`, `docs/play-console-submission-values.md:119-122`, `scripts/create-play-console-products.mjs:59-62`(표시명만).
- **바꾸지 않는 30일:** 월정석 30일 유효 로트, "그 사실을 안 날부터 30일" 법정 기한, 악용 정의 "직전 30일간", 운세 타임라인·아카이브·기사 등. 이들은 이용권과 무관하다.
- 생성물은 손으로 고치지 않는다. 다음으로 다시 만든다: `node scripts/i18n-merge-authored.mjs --core`, `npm run sync:public`, 필요하면 `node scripts/sync-flower-price-copy.mjs`. `public/static/policies/*` 빌드 사본도 같은 경로로 갱신되는지 확인한다.
- `docs/context/payment-gating.md` 끝에 "## 2026-10-11 승인: 이용권 기간 제거, 한도 소진으로만 중지, 프로필 상한 제거" 절을 추가한다. 위 '목표 동작'과 마이그레이션, 상품 ID 유지를 적는다.

## 회귀 방지 규칙

- 새 worktree 브랜치에서 작업한다. main 의 미커밋 파일(마스터 인연의 서 가격, shellCopy-10 등)은 되돌리거나 섞지 않는다.
- 이번 범위 밖은 고치지 않는다. 발견하면 결과 절에 후속으로 적는다. 예: goldenPackages 의 옛 금액(월 300/1000/2000/5000, VVIP 59000).
- 결제 금액, 결제 순서, 건당 한도, 총 한도, 소진 문턱, 웹훅 재생 방지, 이미 결제된 주문 인정 규칙은 바뀌면 안 된다. 기존 테스트가 이를 지킨다.
- 테스트는 '기간'을 기대하는 단언만 새 정책으로 바꾼다. 금액·한도·소진 단언은 그대로 통과해야 한다. 지워서 통과시키지 않는다.
- 아래 테스트를 새로 하나씩 둔다(근처 테스트 파일 크기에 맞춘다).
  - 구매 후 30일(그리고 365일)이 지나도 남은 한도가 있으면 활성이다.
  - 한도를 다 쓰면 그 호출에서 중지되고 다음 유료 항목은 월정석 → 단건으로 넘어간다.
  - 같은 등급 재구매는 한도를 더하고, 업그레이드는 사용액을 이어받는다.
  - 환불은 그 주문의 한도만 빼고, 문턱 미만이면 종료된다. 소진 직후 환불은 복구된다.
  - 만료일만 있는 옛 문서도 마이그레이션 전에 활성으로 읽힌다.
  - 이용권이 없어도, 프로필이 많아도 프로필 추가가 막히지 않는다. 수수료는 그대로 붙는다.

## 갱신이 필요한 테스트·검증기

- Jest(`__tests__/`): `worker/payments-v2.pass-check.test.js`(:581 은 소스 문자열 단언), `worker/payments-v2.subscription.test.js`(:182 90일 거부), `worker/app-store.google-billing.test.js:348-429`, `worker/pass-budget-hard-gate.test.js`, `worker/pass-policy-v2.test.js`, `worker/pass-policy-v4.test.js`, `worker/pass-consumption.refund.test.js`, `worker/payment-refund.pass-duration.test.js`, `worker/payments-v2.foreign-card-policy.test.js:18-72`, `worker/payments-v2.webhook-replay.test.js`, `worker/payments-v2.staging-test-amount.test.js`, `worker/payments-v2.pass-confirm-order-only.test.js`, `worker/billing.pass-first-gate.test.js`, `worker/entitlement-policy.test.js:107`, `billing/pass-verdict.test.js`, `tests/integration/gifts.replica.integration.js:41`, 프로필 추가 정책 테스트.
- 검증기(`scripts/`): `verify-billing-pass-policy.mjs`(:433-446 만료 행렬, :899 "Family 30일"), `verify-pass-tier-policy.mjs`(:330 "30일 ·" 카드 탐색, :378-389 설명 4부분 → 기간·프로필 빠진 형식으로, :435-464 소진 검사는 유지), `verify-payment-legal-copy.mjs:280-281`, `verify-app-store-billing-policy.mjs:171`, `verify-app-store-pricing.mjs:177`, `verify-gift-ui.mjs`, `verify-gift-checkout.mjs`, `verify-payments-v2-live-smoke.mjs:157`, `verify-checkout-pass-card.mjs:1075`, `verify-pass-eligibility-copy.mjs`, `verify-pass-snapshot-single-source.mjs`, `verify-i18n-price-drift.mjs`.
- 검증기는 "30일이 없어야 한다"와 "프로필 최대가 없어야 한다"를 새로 단언한다. 단, 위 '바꾸지 않는 30일'은 예외로 둔다.

## 단계

- [x] 1. 활성 판정 헬퍼·사이클 키 분리·종료 필드 변경(worker/lib/profile-limits.js, payments/passes.js). 옛 문서 호환 읽기 테스트.
- [x] 2. 구매·선물·앱·해외카드·dev 경로에서 만료 계산 제거와 재구매 규칙.
- [x] 3. 환불·소진 복구를 한도 기준으로.
- [x] 4. 프로필 상한 제거(canAddProfile, maxProfiles/profileLimit 응답과 클라 분기).
- [x] 5. 마이그레이션 스크립트(dry-run 기본).
- [x] 6. 문구·약관·문서, 생성물 재생성.
- [x] 7. 테스트·검증기 갱신, 아래 '완료 확인' 전부 통과.

## 완료 확인

- `npx jest __tests__/worker __tests__/billing` 와 관련 UI 테스트가 통과한다.
- `npm run check:critical` 가 통과한다(verify:billing-pass-policy, verify:pass-tier-policy 포함). `npm run i18n:check` 가 통과한다.
- grep 확인:
  - 활성 판정에 `expiresAt > now` 직접 비교가 0건이다.
  - `30 * 24 * 60 * 60`, `durationDays: 30` 강제 검증이 0건이다(하위 호환 수용은 예외).
  - 이용권 문구의 "30일 / 30 days / 30日 / 30天"이 12개 로케일에서 0건이다(제외 목록 빼고).
  - "프로필 최대" 문구가 0건이다.
- 마이그레이션 dry-run 결과(대상 수)를 결과 절에 적는다. `--apply` 는 사용자 승인 뒤에 한다.

## 결과

2026-10-11 완료. 커밋: 6ad346571(1~5단계 서버·마이그레이션), 067748135(6·7단계 문구·이름·검증기), 686dc83b4(origin/main 병합·캐시 핀·환불 테스트 시각 비교 보정).

- 검증: `npm run check:critical`·`npm run check:fast` 통과(jest 378 스위트 / 5718 테스트). `npm run i18n:check`, verify-pass-tier-policy·verify-billing-pass-policy·verify-payment-copy-dictionary·verify-payment-choice-parity·verify-payment-freeze·sitemap:check 통과.
- 설계 편차: 'active 플래그' 대신 **만료일 센티널**을 썼다. 새 이용권의 `expiresAt` 은 활성화 + 100년(`PASS_OPEN_ENDED_MS`)이고, 남은 기간이 10년을 넘으면 기간 없음으로 본다(`isOpenEndedPassExpiry`). 그래서 기존 `expiresAt > now` 판정·사이클 키·소진 CAS 는 그대로 두었다. 위 '완료 확인'의 "`expiresAt > now` 직접 비교 0건"은 이 설계에서는 적용하지 않는다.
- 환불 회수: 기간 되감기 대신 그 주문이 더한 한도를 빼고, 남은 한도로 열 수 있는 게 없으면 free 로 내린다(`buildPassRefundRevokeFields`, 이때 `expiresAt = 회수 시각`).
- 마이그레이션 `scripts/migrations/20261011-pass-open-ended-expiry.mjs`: `--self-test` 만 확인했다. 🔴 운영 dry-run·`--apply` 는 사용자 승인 대기다(새 코드 배포 → 백업 → dry-run → `--apply --expect <n>`). 그 전까지 옛 활성 이용권은 원래 만료일에 끝난다.
- 이름 변경(사용자 승인 '꿀단지 크기' 안, 표시 이름만): standard=작은 꿀단지, premium=중간 꿀단지, vvip=큰 꿀단지, family=패밀리 꿀단지(en Small/Medium/Large/Family Honey Jar). 등급 ID·앱 SKU `cd_pass_*_30d_vN`·가격·한도 불변. 서버의 이름 기반 등급 인식(profile-limits tierFromValue·billing.js 별칭·fortune.js·pass-verdict normalizeTier)은 옛 이름을 그대로 인식한다.

### 후속(범위 밖)

- 운영 마이그레이션 dry-run·`--apply`(사용자 승인 필요). Play Console 상품 제목은 콘솔에서 직접 바꿔야 한다(docs/play-console-submission-values.md 참고).
- 약관 법무 검토: "유효한 이용권 계약기간 동안", "이용권 기간 연장" 잔여 표현, 약관 한도 숫자(30/100/200/500k)와 정책 불일치, family "10회" 조항, `TERMS_EFFECTIVE_DATE` 미갱신, 비-CJK legalContent 영어 폴백.
- isPassPolicyMix: 옛 정책 이용권이 활성인 동안 새 정책 이용권을 살 수 없다(소진해야 한다).
- worker/routes/payments.js `SUBSCRIPTION_BASE_PLANS` 상품명 "30일"(호출부 없음), PaymentProcessingContext 레거시 메시지 정규식.
- verify-play-console-products `_vN` SKU 불일치, `_moduleCopy-skeleton` 번역 누락이 `i18n-merge-authored --core` 를 막음.
- goldenPackages 옛 금액, en notAutoBilling 불일치, 미사용 키 payment.passShop.profileUnlimited, featurePreview.paywall.passActive* "프리미엄 이용권" 표기, fusion_fortune FAQ 비-ko 옛 문구, PointsClient 의 en 화면 ko 이름 표시(:2443)·family 분기 없음(:4963), goldenGrainBalanceText 자리표시자, docs/purchase-journey/inventory.json 미재생성.
