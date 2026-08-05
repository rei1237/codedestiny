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

### 초융합 운세 상담권 예외 정책

- 상품은 `fusion_fortune_ticket_1` / `fusion_fortune_ticket`, 상담권 1회 10,000원, 결과 1회용이다.
- 구매는 PG만 허용하며, 일반 이용권·family 이용권·무료/이벤트권·대화권·credit·price coverage·monthly entitlement는 구매 또는 이용 수단이 될 수 없다.
- `GET|POST /api/payments/fusion-fortune/{catalog,balance,shop-preview,prepare,confirm}`는 전용 balance/transaction만 사용한다. 일반 entitlement 또는 price coverage는 초융합 생성 가능 여부에 조회하지 않는다.
- PG 확인 성공 후에만 purchase transaction을 적립하며 동일 `paymentId`는 unique transaction으로 중복 적립을 막는다.
- `/fusion-fortune#ticket`의 전용 구매 UI는 서버 catalog 가격을 표시하고 `prepare → PortOne V2 → confirm` 순서만 사용한다. 클라이언트 금액은 지급 판단에 사용하지 않으며 redirect 복귀도 같은 전용 confirm 경로에서 검증한다.
- 오늘의 귀인 대화권은 기존 `3회 10,000원`, `10회 30,000원`이며 선택한 단일 카테고리 상담에만 사용한다. 초융합 상담권과 양방향 교차 사용하지 않는다.
- 이용권 상점의 귀인·초융합 상담권 카드는 진입 시 catalog/balance를 자동 조회하지 않는다. 사용자가 `조회하기`를 누를 때만 인증 전용 `GET /api/payments/guardian-fortune/shop-preview` 또는 `GET /api/payments/fusion-fortune/shop-preview`를 1회 호출해 서버 상품·PG 채널·가격·보유량을 함께 확인한다. 503 등 조회 실패는 미확인 상태로 남기며 자동 재시도하지 않는다.
- 결제 취소 webhook이 들어와도 초융합 상담권은 사용 여부를 자동 판단해 회수하지 않고 관리자 검토 상태로 보낸다. 실제 환불은 별도 승인 범위다.
- 운영 PG E2E는 배포 SHA와 인덱스 준비 상태를 확인한 뒤 사용자가 결제창에서 직접 승인하는 한 건만 수행한다.

1. 프론트가 결제 가능한 featureKey와 사용 의도를 Worker에 보낸다.
2. `worker/lib/payment-service.js`가 명시적 결제 방식별 정책을 판단하고, `worker/routes/billing.js`는 HTTP 어댑터로 요청을 전달한다.
3. 결제창은 `이용권으로 구매`, `단건 결제`, `월정석`을 함께 보여야 한다.
4. 사용자가 `단건 결제`를 선택하면 `worker/routes/payments.js`가 PortOne 주문을 준비한다.
5. `단건 결제`와 `월정석` 경로는 이용권 DB를 조회하거나 이용권 방식으로 자동 전환하지 않는다.

### 달빛 이용권 상품 구매 정책

- 달빛 이용권 상품 자체는 `단건 결제`(원화 PG)로만 구매할 수 있다. 보유 월정석은 이용권 구매 수단이 아니다.
- `/api/payments/subscription/prepare`와 `/api/payments/subscription/confirm`은 `monthly_credit` 및 월정석 별칭 요청을 `SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED`로 거부한다.
- 월정석은 유료 기능 이용과 서버가 별도로 허용한 소비 흐름에만 사용하며, 이용권 구매 UI에는 구매 선택지로 노출하지 않는다. 이용권 가격·환불 정책은 변경하지 않는다.

## 결제 검증 흐름

1. PortOne 결제 완료 후 클라이언트 confirm 또는 webhook이 Worker로 들어온다.
2. `worker/routes/payments.js`가 PortOne REST로 결제 상태와 금액/통화/merchantUid를 검증한다.
3. webhook signature는 `worker/routes/payments.js`의 표준 webhook signature 검증 로직을 탄다.
4. 금액은 클라이언트 값을 신뢰하지 않고 server registry 또는 policy 상수와 대조한다.
5. 멱등성은 `idempotencyKey`, `merchantUid`, `impUid`, request id 계열 필드로 방어한다.

## 결제 성공 후 권한 반영 흐름

- 브라우저 정본은 `js/core/payment-service.js`다. React `app/_lib/billing-client.ts`, 정적 홈, 독립 외부 페이지는 이 facade를 통해 결제 명령과 하나의 결제창을 사용한다.
- 모든 성공 방식은 `PaymentSuccessEvent` 하나로 수렴한다. 필드는 `operationId`, `requestId`, `productId`, `featureKey`, `profileId`, `method`, `accessGrant`, `unlockMap`, `monthlyBalance`, `snapshotPatch`, `completedAt`으로 고정한다.
- 성공 응답은 AccessStore, 인증 store, Snapshot, 잠금 맵과 월정석 잔량에 동기 반영한다. 성공 직후 entitlement GET은 호출하지 않으며, idle 시점의 사용자별 single-flight Snapshot 동기화만 허용한다.
- 영구 unlock: 결제 수단과 무관하게 `ContentEntitlement`의 `grantType:"permanent_unlock"` 한 곳에 기록. `User.unlockedFeatures`/`paidFeatures`는 기존 데이터 읽기 호환 전용
- 회당 결제: `PaidExecutionRecord`, 상담별 collection, `Payment` 상태 갱신
- 월정석: 이벤트 재화이지만 정식 결제 수단이다. `worker/lib/payment-service.js`가 `profileSubscription.membershipCreditLots[]` FIFO 차감, `PointHistory`, `MonthlyCreditLedger`, `ContentEntitlement`, 멱등 기록을 하나의 Mongo 트랜잭션으로 커밋한다. 트랜잭션을 사용할 수 없으면 차감 전에 `MONTHLY_ATOMIC_UNAVAILABLE`로 실패한다.
- 이용권: `profileSubscription`의 tier/expiry/limit/policy를 기준으로 무료 커버
- PDF/AI 상담: 결제 또는 access grant 후 실제 생성 수행

## 이용권/상품별 접근 권한

- A. 잠금 콘텐츠: registry의 `accessModel:"unlock"` 대상은 단건 결제·월정석·이용권 중 어떤 방식으로 처음 열어도 영구 해금되어 재열람 가능
- B. 회당 결제: 매번 새로 생성/분석되는 상담. 예: AI 상담, 타로 premium, 궁합 AI
- C. 무료: registry에 등록되지 않은 기본 기능
- 십이지신 천운 타로(`tarot-year-fortune`): 신규 단건 결제 기준 100 내부 단위 / 10,000원. 완료된 연간 결과는 `PaidExecutionRecord`에 저장되어 같은 연도 재조회가 가능하며, 기존 구매 기록은 변경하지 않는다.
- D. 프로필 카드 추가/수정/삭제: 이용권 결제 불가. React와 정적 화면 모두 브라우저 Payment Service를 통해 `DIRECT_KRW` 또는 `MOONLIGHT_STONE` 명령을 먼저 완료하고, 프로필 route는 해당 결제 증거만 소비한다. family 무료는 결제가 아니라 정책 layer 0원 처리
- E. 음악 다운로드: 재생은 무료, 다운로드는 구매 UX gate

정본은 `docs/payment-policy-content-access.md`와 `worker/lib/paid-feature-registry.js`다.

## 환불/취소 관련 코드 위치

- 결제 취소/환불 공유 core: `worker/lib/payment-refund.js`
- 관리자 주문/환불 API: `worker/routes/admin-orders.js`, `worker/routes/admin.js` 확인 필요
- 결제 route cancel/webhook: `worker/routes/payments.js`
- 월정석 lot 복구: `worker/lib/monthly-credit-store.js`
- 관리자 마케팅 지급: `POST /api/admin/monthly-credits/grant` — 관리자 인증과 `ADMIN_MONTHLY_CREDIT_GRANT_ENABLED` 플래그가 모두 필요하며, 기존 잔액에 신규 30일 lot을 누적하고 `MonthlyCreditLedger`에 `MONTHLY_CREDIT_GRANT` 원장을 남긴다.
- 권한 revoke: `revokeSinglePaymentContentAccess` in `worker/lib/payment-refund.js`
- 실패 reconcile: `worker/lib/payment-reconcile-task.js`, `npm run verify:payment-reconcile`

## 실패 시 복구 로직

- LLM 생성 실패: 각 AI route에서 차감분 또는 권한 복구 여부를 확인한다.
- 결제 성공/권한 미반영: `Payment.orderState`, `Payment.status`, `PaymentWebhookEvent`, `PaidExecutionRecord`, `ContentEntitlement`를 함께 본다.
- 월정석 실패: lot deduction/restore 기록과 `MonthlyCreditLedger`를 확인한다.
- 관리자 마케팅 지급은 결제가 아니며 이용권·단건 결제 정책을 우회하지 않는다. 동일 `idempotencyKey`는 계정별로 한 번만 지급되고, 지급분은 지급일 기준 30일 후 만료된다.
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
- 명시적인 `MEMBERSHIP_PASS` 선택에 대한 서버 이용권 검증 제거
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
- `pass`, `subscription`, `bundle`, and `family` products require direct `pg` checkout. `monthly_credit`, pass, entitlement, family, coin, balance, and credit methods cannot purchase pass-like products.
- Server checkout preparation and confirmation must call `validatePurchasePolicy`. Client fields such as `coveredByPass` and `userEntitlement` are untrusted.
- Google Play pass SKUs are legacy/deprecated for new entitlement grants. Content SKUs remain a separate policy surface.
- Policy implementation: `worker/lib/entitlement-policy.js`; audit events are written through `writeSecurityLog` without payment credentials or raw personal data.

## Unlock state and shop read separation

- Lock UI hydration uses one complete `GET /api/me/access-state?profileId=...` snapshot after login and after an explicit profile change. React, the main static shell, and standalone static consumers read the same `CodeDestinyAccessStore` projection.
- The complete snapshot reads the authenticated user document once and `ContentEntitlement` once. Registry-confirmed account unlock keys in legacy `User.unlockedFeatures`/`paidFeatures` remain read-compatible; hot-path `PointHistory.distinct` and Payment scans are not used. Requested `profileId` takes precedence over a previously stored profile id.
- `/api/access/unlocks` remains a read-only compatibility/status route. It is not the normal display hydration source and must not be called per card or per render.
- `GET /api/access/unlocks` is read-only. Legacy `includeBackfill=1` and `backfill=1` are accepted as compatibility inputs only and must not run `PointHistory`/`Payment` scans or write `ContentEntitlement` records during a normal lookup.
- Legacy entitlement repair must run through an explicit backfill/reconcile path, not through page-entry GET requests.
- The points shop initial summary uses one in-flight `GET /api/payments/me?view=shop` request per page entry. It reuses the auth-loaded user snapshot for pass and monthly-credit state and defers payment, point-history, and monthly-credit-ledger reads to the dedicated history surface.
- Static shell moonlight balance hydration uses the compact `/api/billing/balance?moonlightStone=1` path only. It must not call `/api/payments/me` as an automatic balance fallback during page entry.
- Monthly-credit and legacy coin balance reads are reserved for payment/store entry and explicit payment refresh flows.
- The client unlock map and shop summary are display state only. Server-side content access checks, pass purchase policy, payment confirmation, and post-payment entitlement writes remain authoritative.
- A DB lookup failure must never grant access or authorize a deduction. The read-only shop summary may return `200` with `degraded:true`, `source:"token"`, and `degradedMonthlyCredits:true`; its placeholder balance is not authoritative and the client must keep the last verified display snapshot instead of treating that placeholder as a real zero.

## Verified pass snapshot and checkout recovery

- A recent successful `/api/me/access-state` bootstrap hydrates the shared pass, monthly-credit, account unlock, and current-profile unlock snapshot for `standard`, `premium`, `vvip`, and `family`. Unverified or expired local auth data must not grant access.
- A last-known-good pass or unlock snapshot survives transient Mongo failures. An authenticated display read may return `200 + degraded:true + authority:"none"`; this must not be interpreted as logout or an empty authoritative snapshot.
- A verified payment response carries `unlockGrant`. `CodeDestinyAccessStore` v4 applies it in the same frame, stores confirmed grants without TTL by user/profile, shares them with other tabs, and performs one background reconciliation. Only an explicit versioned `revokedFeatureIds` response may remove a confirmed grant.
- `401` is an authentication result only after the auth client has attempted its refresh flow. `403` and `404` are permission/profile results and must not clear the login session or last-known-good unlock snapshot.
- Snapshot coverage is an optimistic read path only. Family premium-quota decisions, monthly-credit deduction, PortOne order creation, payment confirmation, and entitlement writes remain server-authoritative.
- A fresh verified Snapshot may keep the existing immediate-pass UX at paid-entry. Once the user explicitly chooses `MEMBERSHIP_PASS` inside a payment-choice modal, every renderer must call the server-final pass command without a Snapshot fast-path: `pass_applied` or `already_unlocked` continues without a PG order, only an explicit `payment_required`/402 may open the pass shop, and timeout/5xx/degraded keeps the modal open for retry.
- That modal's existing pass-checking UI first waits for the shared authenticated-session single-flight to settle (including a safe cookie refresh when needed), then sends the server-final `MEMBERSHIP_PASS` command. A transient or unresolved auth check is not `payment_required`: keep the modal open with retry guidance. This preparation does not add an automatic payment POST retry.
- An explicit `DIRECT_KRW` choice must create exactly one PortOne order after the click and must never be converted to pass access. Only an already persisted permanent unlock may stop a duplicate purchase.
- Only explicit `MEMBERSHIP_PASS` requests apply pass coverage. `standard`, `premium`, and `vvip` reads do not synchronously update `User` or create `PointHistory`; metered `family` quota and permanent unlock persistence remain synchronous and server-authoritative.
- Opening the payment-choice modal may preload the PortOne SDK and `/api/payments/config` GET, but it must not POST `/api/billing/checkout`. Payment POST requests are not automatically retried after network, 503, or token-refresh failures.
- Billing-to-payments delegation may reuse authentication verified from the same original request. Payment route security, minor restrictions, server pricing, provider verification, and idempotency checks must still run.
- `GET /api/payments/me?view=shop` may use a cryptographically verified access-token identity when the canonical user read is temporarily unavailable. This fallback is read-only and cannot create an order, deduct monthly credits, grant an entitlement, or revive a withdrawn account once Mongo is available again.
- Mongo operation admission may shed excess display reads, but a lone timed-out driver operation must reset its dead pool. Deferring reset until an already-hung promise settles can pin an isolate in a permanent 503 loop; concurrent healthy operations remain protected and repeated failures retain the forced-reset escape hatch.

## Server payment command boundary

- `worker/lib/payment-service.js` is the server payment domain entry point. Its command contract is `executePayment({ method, productId, featureKey, profileId, requestId, priceQuoteToken })`; HTTP routes and PortOne code are adapters around that boundary.
- Payment method is selected before any pass lookup. Only an explicit `MEMBERSHIP_PASS` command may synchronously query and validate membership-pass coverage. `MONTHLY` and `DIRECT_KRW` perform zero membership-pass reads.
- A verified snapshot may grant optimistic UI access immediately, but it cannot authorize monthly-credit deduction, a PortOne order, payment confirmation, or an entitlement write. Background reconciliation must not block the user flow.
- A new monthly payment commits the FIFO lot deduction, `PointHistory`, `MonthlyCreditLedger`, idempotency evidence, and `ContentEntitlement` in one Mongo transaction. If transactions are unavailable, the route returns `503 MONTHLY_ATOMIC_UNAVAILABLE` before committing any write. If the entitlement write fails, the transaction aborts and returns `503 MONTHLY_ATOMIC_WRITE_FAILED`.
- The former deduct-then-restore compensation path is not a valid payment-write fallback. Restore remains available only for explicit refund/recovery workflows backed by existing evidence.
- An explicit `DIRECT_KRW` command does not re-check membership-pass coverage. Any PDF pass discount must arrive as a short-lived server-signed `priceQuoteToken` issued by the explicit pass-validation command.
- A card-confirm transport or provider 5xx after approval is preserved as `503 PENDING_CONFIRMATION` with the same order identity. Clients must not automatically POST confirm again or encourage a second payment; recovery/reconciliation reuses the existing order evidence.

## Browser payment command boundary

- `js/core/payment-service.js` owns browser command single-flight, optimistic Snapshot pass, the single payment-window renderer, and the success reducer. UI components may render labels and collect choices but may not own payment policy or POST retry loops.
- The in-flight key includes the stable request identity. React Strict Mode, hydration, duplicate provider mounts, and modal re-clicks therefore share the same promise instead of issuing duplicate commands.
- A Snapshot-confirmed pass returns a synthetic grant immediately. The same request may schedule one non-blocking verification; a 503 from that background read does not revoke the already verified last-known-good Snapshot.
- Balance fields are emitted only when the success payload contains an authoritative finite balance. Pass and card success without a balance must not reset the AuthStore monthly balance to zero.

## Unified access-state Snapshot

- `GET /api/me/access-state` is enabled by default in every runtime; `ACCESS_STATE_ENABLED=false` is an emergency disable only. Login/bootstrap consumers use its existing user-scoped single-flight instead of mounting separate pass, monthly-balance, entitlement, and profile probes.
- The response includes the active pass, canonical unexpired monthly lots/balance, current profile, `ContentEntitlement` grouped by profile, product ownership, `unlockMap`, `lockMap`, and `entitlementVersion`.
- The static home alone requests `GET /api/me/access-state?include=guardian`. A successful optional Guardian read is returned as `freeUsage.guardian` and participates in `versions.accessStateVersion`/ETag. A Guardian-only query failure returns `freeUsage.guardian.degraded=true` without downgrading the authoritative entitlement snapshot or inventing a zero balance.
- The access-state single-flight key is the locally JWT-verified user id plus requested profile and include set. It is installed before the authenticated user DB lookup, while every later sequential request still performs the canonical auth check. Failed promises and partial Guardian snapshots are not cached.
- Only the current profile plus user-scoped entitlements are projected into the active `unlockMap`. Entitlements for other profiles remain in `profileEntitlements` and never unlock the current profile by accident.
- `CodeDestinyAccessStore` may read this Snapshot first, preserve a verified stale read during a transient failure, and apply optimistic success patches. It cannot deduct monthly credits, create orders, or grant server authority.
- `/api/billing/coin-gate` remains an explicit server command after the user selects `이용권` or `월정석`; it is not part of snapshot hydration. Static membership commands prepare auth before sending one POST and do not replay that POST after a 401. Fresh snapshot balances are reused for display, while `fresh=1` remains limited to explicit refresh or completed payment/use reconciliation.

## Feature route boundary

- AI and profile feature routes consume the access grant produced by the billing Payment Service. They do not import `consumeMonthlyCreditLots` or create a `MONTHLY_CREDIT_SPEND` ledger.
- A legacy monthly request without a billing grant fails closed with `PAYMENT_ACCESS_GRANT_REQUIRED` or the existing payment-required response. It must not inspect a balance and deduct locally.
- Refund and recovery paths may read spend evidence and create an idempotent restore/grant ledger, but those operations are not new payment execution and remain evidence-bound.
- `npm run verify:payment-service-boundary` fails when a UI screen calls coin-gate outside the compatibility adapters, or when a feature route reintroduces a direct monthly lot deduction/spend-ledger write.

## Mobile fortune entry read policy

- The mobile “모든 운세” overview does not mount the feature preview dialog until the user opens a card. Closing the dialog removes it after the exit animation, and the original trigger remains the focus return target.
- On mobile, closed fortune collections keep metadata and viewport placeholders only. A real card is mounted when its placeholder intersects the viewport or when the user explicitly opens it from a favorite/recent entry. Feature components outside the viewport must not start effects or data requests.
- The overview loads the Worker-backed bulk pricing catalog only when the overview is explicitly opened. Cards, the preview sheet, and payment UI consume the same canonical `featureKey` snapshot; a missing price disables the paid CTA instead of displaying a client fallback.
- Unlock reads use a user-and-profile single-flight cache key. Page/provider mount, sheet close, and an ordinary card render do not trigger `/api/access/unlocks`; login bootstrap, profile change, and verified payment reconciliation use the complete access-state endpoint.

## Legacy COIN 차감 제거와 호환성 경계

- 신규 콘텐츠 해금과 신규 결제에서는 `User.points`를 차감하지 않는다. 이용 가능한 결제 방식은 `이용권`, `월정석`, `단건 결제`다.
- 호환성을 위해 `/api/billing/coin-gate`와 레거시 fortune/daehan 경로 이름은 유지하지만, `paymentMode=COIN`, `forceDeduct`, 결제 방식이 없는 구형 요청은 `PAYMENT_REQUIRED`로 fail-closed 처리한다.
- 차단 응답에는 `legacyCoinDisabled: true`, `blockedPaymentMode: "COIN"`, 현재 결제 선택 정보가 포함되며, 차단 경로에서 포인트 조회·차감·신규 `PointHistory` 생성은 하지 않는다.
- 기존 `ContentEntitlement`, `User.unlockedFeatures`, `PointHistory`, `daehan_purchases` 및 과거 결제 기록은 삭제하지 않는다. backfill·환불·보상 복구는 과거 거래 증거가 있을 때만 읽기 호환으로 유지한다.
- 신규 영구 해금 인덱스는 `scripts/migrations/20260804-add-permanent-unlock-index.mjs`로 별도 적용한다. 기존 문서를 backfill하거나 삭제하지 않으며 운영 실행은 별도 승인이 필요하다.
- 메인 셸과 일반 잠금 상태 조회는 `/api/access/unlocks` 또는 entitlement 전용 조회를 사용한다. 월정석/레거시 잔액 조회는 결제 선택창과 명시적 결제 갱신에서만 수행한다.

## 운세 플래너 예외

- `/fortune-planner`와 legacy `/luck-sync-diary`는 운기·기일 다이어리의 무료 후속 기능이다. 이 경로에서는 entitlement, 이용권, 월정석, 결제 이력, 무료 체험 및 PG 분기를 조회하거나 차감하지 않는다.
- 이 예외는 플래너 전용이다. paid-feature registry와 다른 유료 운세의 이용권·월정석·단건 결제 정책에는 적용하지 않는다.
