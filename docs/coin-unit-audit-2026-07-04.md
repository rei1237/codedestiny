# 코인 단위 잔재 전수 조사 (2026-07-04)

> ⚠️ **작성 시점(2026-07-04) 스냅샷.** 본문의 가격 수치는 그 시점 값이며 현행과 다르다
> (예: `compat-sukuyo-compatibility`는 2026-08-12에 100코인 → 50코인으로 인하됐다).
> 현행 전수 목록은 [docs/pricing/PRICING_AUDIT.md](pricing/PRICING_AUDIT.md) 참고.

## 목적
- "코인" 결제 단위를 전면 폐지하고 원(KRW) 단건 결제로 통일하는 리팩터(가격 단위 정상화) 작업의 사전 진단 결과를 기록한다.
- 이 문서는 조사 결과만 기록하며, 실제 코드 변경은 이후 커밋(변수명 교체, 월정석/이용권 표현 수정, `PAYMENT_POLICY.md` 신규 작성, 기존 문서 정리)에서 진행한다.

## 조사 범위
`worker/`, `app/`, `server/`, `lib/`, `components/`, `models/`, `scripts/`, 루트 `*.md`, `docs/`. `.wrangler/`, `node_modules/`, `dist/`, `out/`, `public/js`(빌드 산출물 중복 배포본)는 제외.

## 1. 코인 단위 잔재 파일 목록 (실질 로직/데이터, 수정 대상)

### 환산 핵심 (단일 진실 소스)
- `worker/lib/billing-policy.js` — `KRW_PER_COIN = 100`, `calculateKrwAmountFromCoins()`, `calculateCoinsFromKrwAmount()`, `normalizePaidFeaturePricingShape()`
- `worker/lib/paid-feature-registry.js` — `RAW_PIG_COIN_UNLOCK_PRODUCTS`, `FEATURE_KEY_PRICE_TABLE` 전부 `coinPrice`/`cost` 정수 기반
- `worker/lib/models.js` — 스키마 필드 자체가 코인 단위: `coinPrice`, `coinAmount`, `amountCoins`, `maxCoveredCoin`, `legacyCoinCreditSeededPoints`

### 결제 게이트 라우트 (worker/routes, 12개 이상)
- `worker/routes/billing.js` — `resolvePricingCoinCost()`, `coinPrice`, `priceCoin`, `maxCoinLimit`, `"COIN"` 결제수단 상수, `processCoinGateFromPricing()`
- `worker/routes/access.js`, `worker/routes/app-store.js`, `worker/routes/astrology-ai.js`, `worker/routes/karma-destiny-ai.js`, `worker/routes/new-year-ai.js`, `worker/routes/fortune-tea-house.js`, `worker/routes/astro.js`, `worker/routes/celestial-harmony.js`, `worker/routes/music.js`, `worker/routes/destiny-bias.js`, `worker/routes/fpti.js` — 기능별 `coinPrice`/`coinCost`/`amountCoins`/`chargedCoins` 반복
- `worker/lib/content-unlocks.js` — `coinAmount` 파라미터로 잠금해제 기록

### server/ (Express 레거시, `npm run api`) — worker와 별개로 코인 로직 중복 구현
- `server/routes/fortune.routes.js` — `PIG_COIN_PACKAGES`, `PIG_COIN_UNLOCK_PRODUCTS`, `user.points` 직접 차감(`$inc: { points: -requiredCoins }`)
- `server/models/User.js` — `source: enum["coin","card"]`, `newUserCoins`
- **주의**: 사용자 확인 결과 server/도 수정 대상에 포함(2026-07-04 확정)

### 프론트엔드
- `app/hooks/useCoinGate.ts` — `requiredCoins`, `chargedCoins`, `coinPrice` 상태
- `app/astrology-ai/AstrologyAiClient.tsx` — `coinPrice`
- `app/components/DevPaymentTester.tsx` — `maxCoveredCoin`
- `app/auth/_components/StaticOAuthCallbackRedirect.tsx` — `legacyCoinBalance`, `/api/fortune/pig-coin/*`
- `app/components/FeatureMarketingDetailModal.tsx` — `coinPrice`로 노출 판단, `"달빛"` 단위 표기

## 2. 단순 네이밍/주석만 코인인 파일 (로직 무관 또는 이미 KRW)
- `app/components/FeatureLandingPage.tsx` — 타입명 `PAID_SLUG_META.coins`이지만 실값은 이미 `"5,000원"` 문자열
- `app/fortune/prompt-hub/PromptHubClient.tsx` — 주역(I-Ching) 동전점(coin toss) 로직, 결제와 무관 (오탐)

## 3. 문서(md) 중 코인 단위 언급
- `CLAUDE.md` — "코인(포인트)" 개념, `1코인=100원` 환산율 명시. 리팩터 후 갱신 필요
- `docs/admin-coin-paid-flow-checklist-2026-04-14.md`, `docs/admin-subscription-tier-simulation-checklist-2026-04-22.md` — `recommendedCoins`, `/pig-coin/consume` 응답 체크리스트
- `docs/payment-auto-refund-rollback.md` — `POST /coin-gate`, coin deduction 언급
- `scripts/grant-monthly-coins.mjs` — 운영 스크립트명 자체가 coins 단위

## 4. 월정석/이용권 "구독" 표현 정리 (2026-07-04 최종 확정)

### 방침 확정
- **이용권**은 30일 단위로 지속되므로 "구독(형 이용권)"으로 표기해도 무방하다. 다만 **자동결제(auto-renewal)는 없음** — 만료 후 사용자가 매번 직접 재결제해야 한다. 이 점만 명확히 하면 됨. 코드 내부 명칭(`profileSubscription`, `accessSource: "subscription"`, `monthlySubscription` 등)은 변경하지 않는다.
- **월정석**은 어떤 의미로도 "구독"이 아니다 — 이벤트 지급 전용 포인트이며 구매·자동갱신 개념 자체가 없다. 이용권(구독형)과 절대 혼동하지 않도록 문서·주석에서 구분한다.
- 실제 UI(`app/`)에는 "구독 아님"류 오표기 문구가 존재하지 않음(그리드 검색 결과 없음) — 수정 필요한 사용자 노출 텍스트는 없다.

### 참고: 미구현 자동결제 스캐폴딩 (그대로 유지, 오표기 아님)
- `worker/lib/subscription-billing-task.js` — `CARD_SUBSCRIPTION_PLANS`, `runCardSubscriptionBillingTask`, `buildRecurringMerchantUid`. 58행에서 `disabled: true`로 죽은 코드. 향후 자동갱신 기능을 실제로 구현할 때 사용할 스캐폴딩이므로 삭제하지 않음
- `worker/lib/portone.js:347` — `chargePortOneBilling` 미구현 함수(실사용 라우트 미호출 확인됨)
- `worker/lib/models.js` — `accessType` enum의 `"subscription"` 문자열, `monthlySubscription` 서브도큐먼트(94-101행, `app/_lib/models/UserModel.js`에도 동일) — 이용권을 구독으로 표기하는 방침과 일치하므로 그대로 유지
- `worker/lib/paid-feature-access.js:94-124` — `resolveMonthlySubscription`, `accessSource: "monthlySubscription"` 게이팅 로직, 실사용 결제 경로 없음(dev 전용) — 변경 불필요

## 5. family 이용권 정책
- `worker/lib/profile-limits.js:49-79` `HONEY_PASS_POLICY` — DB 조회가 아닌 하드코딩된 JS 상수. `worker/routes/billing.js`에 `tier === "family"` 삼항연산자 하드코딩이 15곳 이상 중복

## 6. 잠금 콘텐츠 vs 회당결제 혼용 실태
- `app/hooks/useCoinGate.ts` — 잠금/회당 구분 파라미터 없음. `featureKey` 문자열이 서버 목록(`UNLOCK_PAID_FEATURE_KEY_SET` vs `PER_USE_PAID_FEATURE_KEY_LIST`) 중 어디 속하는지로만 결정
- `app/components/PremiumBlurGate.tsx` — 잠금 전용 prop 없는 범용 컴포넌트(현재는 `AdvancedZiweiSection.tsx`의 자미두수 잠금에만 쓰이나 구조상 혼용 가능)
- `forceDeduct: true`가 잠금(`RAW_PIG_COIN_UNLOCK_PRODUCTS`)과 회당결제 AI 상담(`life-book-ai.js`, `fortune-tea-house.js`) 양쪽에 동일하게 재사용됨

## 7. 숙요점 궁합 — 비잠금 회당결제 (2026-07-04 확정)
- `compat-sukuyo-compatibility`(기본 숙요점 궁합 체크, 100코인=10,000원), `premium-sukuyo-compat-extra`(정밀 궁합 확장 분석, 120코인=12,000원), `sukuyo-compatibility-ai`(숙요점 궁합 AI 상담, 300코인=30,000원)는 모두 **유료 회당 결제**로 유지한다.
- "숙요점 궁합=비잠금"이라는 표현은 "잠금 콘텐츠(자물쇠·영구 해제)가 아니다"라는 뜻이며, "결제 없이 무료"라는 뜻이 아니다. **콘텐츠 자체는 잠금 UI 없이 노출**되지만, 실행(궁합 계산)할 때마다 **회당 결제**한다. 즉 노출은 자유롭고 이용 시 매번 과금하는 per-use 결제 기능이다.
- 결제 판정은 이용권 커버 규칙(B유형 공통)을 따른다: 이용권이 있고 가격을 커버하면 무료, 아니면 코인/PG 결제.

## 8. 수정 필요 총 파일 수 요약
- 실질 코인 로직 파일: `worker/lib` 3개 + `worker/routes` 12개 이상 + `server/routes`·`server/models` 2개 + `app/hooks`·`app/components` 4개 = 약 22개 핵심 파일
- 월정석/이용권 오표기 스캐폴딩: 4개 파일(`subscription-billing-task.js`, `portone.js`, `models.js`, `paid-feature-access.js`)
- 문서(md): `CLAUDE.md`, `docs/admin-coin-paid-flow-checklist-2026-04-14.md`, `docs/admin-subscription-tier-simulation-checklist-2026-04-22.md`, `docs/payment-auto-refund-rollback.md`, `scripts/grant-monthly-coins.mjs` = 5개
- 잠금/회당결제 혼용 컴포넌트: 2개(`useCoinGate.ts`, `PremiumBlurGate.tsx`)
