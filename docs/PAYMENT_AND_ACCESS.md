# Payment and Access

## 원칙

- 사용자 문구와 정책 기준은 `이용권`, `월정석`, `단건 결제`다.
- 코인은 레거시 내부 계산 단위다. 새 사용자-facing 문구에 코인 중심 표현을 추가하지 않는다.
- 실결제, 운영 결제 취소/환불, 운영 DB 권한 반영 테스트는 사용자 명시 승인 없이는 금지다.
- 테스트는 mock/sandbox 결제로만 수행한다.

## PortOne / KG이니시스 연동 위치

- 클라이언트 SDK 로드: `lib/payment/portone.ts`
- Worker PortOne REST: `worker/lib/portone.js`
- 결제 route: `worker/routes/payments.js`
- 결제/권한 gate: `worker/routes/billing.js`
- 결제 정책/가격 registry: `worker/lib/paid-feature-registry.js`, `worker/lib/billing-feature-registry.js`, `worker/lib/billing-policy.js`
- 환불/취소 core: `worker/lib/payment-refund.js`
- 프로필 카드 관리 수수료: `worker/lib/profile-card-mutation-policy.js`, `worker/routes/profile.js`
- 검증 scripts: `verify:billing-pass-policy`, `verify:portone-single-payment`, `verify:paid-gate-ui`, `verify:payment-choice-parity`, `verify:checkout-pass-card`, `verify:payment-reconcile`

## 결제 생성 흐름

1. 프론트가 결제 가능한 featureKey와 사용 의도를 Worker에 보낸다.
2. `worker/routes/billing.js`가 feature pricing, 이용권, 월정석 가능 여부를 판단한다.
3. 결제창은 `이용권으로 구매`, `단건 결제`, `월정석`을 함께 보여야 한다.
4. 사용자가 `단건 결제`를 선택하면 `worker/routes/payments.js`가 PortOne 주문을 준비한다.
5. 주문 생성 직전에도 Worker가 이용권 커버를 다시 확인한다.

## 결제 검증 흐름

1. PortOne 결제 완료 후 클라이언트 confirm 또는 webhook이 Worker로 들어온다.
2. `worker/routes/payments.js`가 PortOne REST로 결제 상태와 금액/통화/merchantUid를 검증한다.
3. webhook signature는 `worker/routes/payments.js`의 표준 webhook signature 검증 로직을 탄다.
4. 금액은 클라이언트 값을 신뢰하지 않고 server registry 또는 policy 상수와 대조한다.
5. 멱등성은 `idempotencyKey`, `merchantUid`, `impUid`, request id 계열 필드로 방어한다.

## 결제 성공 후 권한 반영 흐름

- 단건 unlock: `ContentEntitlement` 또는 `User.unlockedFeatures`에 영구 해금 기록
- 회당 결제: `PaidExecutionRecord`, 상담별 collection, `Payment` 상태 갱신
- 월정석: `MonthlyCreditLedger`, `profileSubscription.membershipCreditLots[]` FIFO 차감
- 이용권: `profileSubscription`의 tier/expiry/limit/policy를 기준으로 무료 커버
- PDF/AI 상담: 결제 또는 access grant 후 실제 생성 수행

## 이용권/상품별 접근 권한

- A. 잠금 콘텐츠: 1회 해금 후 재열람 가능. 예: 사주 대운/총평 일부, 자미 심화, 숙요 1년운 일부
- B. 회당 결제: 매번 새로 생성/분석되는 상담. 예: AI 상담, 타로 premium, 궁합 AI
- C. 무료: registry에 등록되지 않은 기본 기능
- 십이지신 천운 타로(`tarot-year-fortune`): 신규 단건 결제 기준 100 내부 단위 / 10,000원. 완료된 연간 결과는 `PaidExecutionRecord`에 저장되어 같은 연도 재조회가 가능하며, 기존 구매 기록은 변경하지 않는다.
- D. 프로필 카드 추가/삭제: 이용권 결제 불가. 단건 결제 또는 월정석만 가능. family 무료는 결제가 아니라 정책 layer 0원 처리
- E. 음악 다운로드: 재생은 무료, 다운로드는 구매 UX gate

정본은 `docs/payment-policy-content-access.md`와 `worker/lib/paid-feature-registry.js`다.

## 환불/취소 관련 코드 위치

- 결제 취소/환불 공유 core: `worker/lib/payment-refund.js`
- 관리자 주문/환불 API: `worker/routes/admin-orders.js`, `worker/routes/admin.js` 확인 필요
- 결제 route cancel/webhook: `worker/routes/payments.js`
- 월정석 lot 복구: `worker/lib/monthly-credit-store.js`
- 권한 revoke: `revokeSinglePaymentContentAccess` in `worker/lib/payment-refund.js`
- 실패 reconcile: `worker/lib/payment-reconcile-task.js`, `npm run verify:payment-reconcile`

## 실패 시 복구 로직

- LLM 생성 실패: 각 AI route에서 차감분 또는 권한 복구 여부를 확인한다.
- 결제 성공/권한 미반영: `Payment.orderState`, `Payment.status`, `PaymentWebhookEvent`, `PaidExecutionRecord`, `ContentEntitlement`를 함께 본다.
- 월정석 실패: lot deduction/restore 기록과 `MonthlyCreditLedger`를 확인한다.
- PortOne webhook 실패: signature, event id unique index, webhook event 저장 여부 확인.
- pending 주문: reconcile cron 또는 `payment-reconcile-task` 경로 확인.

## 십이지신 천운 타로 결과 저장

- 생성 API: `POST /api/tarot/reading` with `spreadType: yearly_twelve_card`
- 재조회 API: `GET /api/tarot/year/result?year=YYYY` 또는 `?resultId=...`
- 저장 상태: `generating` → `completed`; 저장 실패는 `generation_failed`와 `retryEligible`로 기록한다.
- 결과 생성은 결정론적 카드 엔진이며 실제 LLM 호출을 사용하지 않는다.

## “결제는 되었는데 이용권이 반영되지 않는 문제” 추적 파일

1. `worker/routes/payments.js`
2. `worker/routes/billing.js`
3. `worker/lib/portone.js`
4. `worker/lib/payment-reconcile-task.js`
5. `worker/lib/profile-limits.js`
6. `worker/lib/monthly-credit-store.js`
7. `worker/lib/content-unlocks.js`
8. `worker/lib/models.js`
9. `app/_lib/billing-client.ts`
10. `js/core/checkout-entry.js`
11. `js/core/pass-verdict.js`

확인할 DB collection:

- `payments`
- `paymentwebhookevents`
- `point histories` 또는 `pointhistories`
- `monthlycreditledgers`
- `contententitlements`
- `paidexecutionrecords`
- `users.profileSubscription`
- `check_key_funnel_events` 또는 `CheckoutFunnelEvent` 실제 collection명 확인 필요

## 절대 건드리면 안 되는 부분

- 실제 PortOne 운영 결제 실행
- 운영 결제 취소/환불
- 운영 DB 직접 쓰기/마이그레이션
- `worker/wrangler.toml` binding/route/secret 정책 변경
- 이용권/월정석/단건 결제 우선순위 변경
- `grantPassFreeAccessBeforeCardIfAvailable` 안전망 약화
- `paymentMode:"DIRECT_KRW"` 하드코딩으로 월정석/이용권 옵션 제거
- 프로필 카드 관리 수수료의 passExcluded 정책 우회

## 테스트 원칙

- 결제는 mock 또는 sandbox만 사용한다.
- 실제 카드 결제, 운영 webhook replay, 운영 취소/환불은 사용자 승인 후 1회 한정으로만 가능하다.
- DB 쓰기 검증은 test DB 또는 mock DB만 사용한다.
- 실행 가능한 기본 검증:
  - `npm run verify:billing-pass-policy`
  - `npm run verify:portone-single-payment`
  - `npm run verify:paid-gate-ui`
  - `npm run verify:payment-choice-parity`
  - `npm run verify:checkout-pass-card`
  - `npm run verify:paid-feature-billing-policy`
  - `npm run verify:ai-prompt-billing-policy`
  - `npm run verify:payment-reconcile`

## Pass tier and purchase policy (pass-purchase-v2)

- `profileSubscription` is the canonical entitlement. Legacy fields are read-only compatibility data and never elevate the canonical tier.
- Conflicting active legacy entitlements fail closed with `LEGACY_ENTITLEMENT_CONFLICT`.
- `standard`, `premium`, and `vvip` feature access uses the shared 30/50/100 coin limits. Family is feature access only and is never a payment substitute.
- `pass`, `subscription`, `bundle`, and `family` products require `pg` or an explicitly approved `monthly_credit` flow. Pass, entitlement, family, coin, balance, and credit methods cannot purchase pass-like products.
- Server checkout preparation and confirmation must call `validatePurchasePolicy`. Client fields such as `coveredByPass` and `userEntitlement` are untrusted.
- Google Play pass SKUs are legacy/deprecated for new entitlement grants. Content SKUs remain a separate policy surface.
- Policy implementation: `worker/lib/entitlement-policy.js`; audit events are written through `writeSecurityLog` without payment credentials or raw personal data.

## Unlock state and balance read separation

- Main-shell unlock hydration uses `GET /api/access/unlocks?profileId=...&serviceKey=saju,ziwei&includeBackfill=1`.
- This endpoint reads the profile/account-scoped `ContentEntitlement` snapshot only. It does not require monthly-credit or legacy `User.points` balance reads.
- `includeBackfill=1` remains enabled so legacy `PointHistory`/`Payment` evidence can restore missing entitlement records without deleting or resetting existing unlocks.
- Monthly-credit and legacy coin balance reads are reserved for payment/store entry and explicit payment refresh flows.
- The client unlock map is display state only. Server-side content access checks and post-payment entitlement writes remain authoritative.

## Legacy COIN 차감 제거와 호환성 경계

- 신규 콘텐츠 해금과 신규 결제에서는 `User.points`를 차감하지 않는다. 이용 가능한 결제 방식은 `이용권`, `월정석`, `단건 결제`다.
- 호환성을 위해 `/api/billing/coin-gate`와 레거시 fortune/daehan 경로 이름은 유지하지만, `paymentMode=COIN`, `forceDeduct`, 결제 방식이 없는 구형 요청은 `PAYMENT_REQUIRED`로 fail-closed 처리한다.
- 차단 응답에는 `legacyCoinDisabled: true`, `blockedPaymentMode: "COIN"`, 현재 결제 선택 정보가 포함되며, 차단 경로에서 포인트 조회·차감·신규 `PointHistory` 생성은 하지 않는다.
- 기존 `ContentEntitlement`, `User.unlockedFeatures`, `PointHistory`, `daehan_purchases` 및 과거 결제 기록은 삭제하지 않는다. backfill·환불·보상 복구는 과거 거래 증거가 있을 때만 읽기 호환으로 유지한다.
- 메인 셸과 일반 잠금 상태 조회는 `/api/access/unlocks` 또는 entitlement 전용 조회를 사용한다. 월정석/레거시 잔액 조회는 결제 선택창과 명시적 결제 갱신에서만 수행한다.
