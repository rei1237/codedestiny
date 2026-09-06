---
status: active
updated: 2026-09-06
next: 스테이징 배포가 반영된 뒤 confirm 왕복(단건·이용권)을 사용자가 확인한다. 실패하면 PR #1679 revert 가 유일한 복구 수단이다.
---

# `/api/payments/confirm` V2 컷오버 (결제 3단계)

## 지금 상태

- 1단계(죽은 구 핸들러 1,154줄 삭제) PR #1658 · 2단계(기대금액 우선순위 역전 + `/api/payments/confirm` 컷오버) PR #1672 · 3단계(구 `handleConfirm` 연쇄 1,058줄 삭제 + 가드 3건 재조준) PR #1679 — **전부 머지 완료**. `worker/routes/payments.js` 4,754줄 → 3,696줄.
- 삭제가 여러 PR 로 나뉘었으므로 원칙 9에 따라 **머지 후 main 에서 `npm run check:critical` 1회 완료** — `build:worker` 를 뺀 전 게이트 통과. `build:worker` 는 로컬 `workers-og` 미해석(레포 기지 실패)이라 CI 가 정본이고, PR #1679 의 `Build Pages and Worker` · `Critical checks` 가 pass.
- **코드 작업은 남지 않았다.** 남은 것은 스테이징 실검증 하나다.

## 남은 작업

- [ ] **스테이징 confirm 왕복 (사용자만 가능)** — 단건·이용권 결제가 confirm 까지 성공하고 `GET /api/payments/orders/:id` 가 `status: paid` · `entitlementGranted: true` 를 준다. 임의 `paymentAmount` 를 보낸 confirm 은 거부된다.
- 🔴 **실패 시 복구 수단은 PR #1679 revert 하나다.** 예전처럼 `worker/index.js` 훅 블록만 걷어내면 구 핸들러가 되받는 구조가 아니다 — 되받을 것이 없어 `POST /api/payments/confirm` 이 404 가 된다.

## 다음 세션이 알아야 하는 것

- 호출부 0인데 **가드가 문자열로 잡고 있어 지우면 안 되는 것**: `SUBSCRIPTION_BASE_PLANS` · `SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED_CODE`/`_MESSAGE` · `isSubscriptionMonthlyCreditMethod` · `rejectSubscriptionMonthlyCreditPurchase` · `logPaymentOrderTrace` · `maskPaymentIdentifier`. lint 가 미사용 경고를 내도 **그대로 둔다.**
- 단건 결제의 판정 키는 `accessMethod` 가 아니라 `worker/payments/compat.js` 의 `accessType: "single_purchase"` 다 — V2 는 `accessMethod` 를 이용권/월정석에만 싣고, 정적 셸 판정기가 실제로 읽는 것도 `accessType` 이다. `verify-billing-pass-policy` · `verify-profile-card-action-policy` 가 이 문자열을 단언한다. 🔴 `compat.js` 에 `accessType: "single_purchase"` 가 2곳이라 **변이 테스트는 전량 치환으로** 해야 실제로 무는지 보인다.
- `verify:cron-mongo-op-coverage` 의 부채 원장 `"worker/routes/payments.js": 15` 는 삭제 전후 모두 미보호 op 21건으로 동일해 갱신 불필요했다.
- `worker/routes/payments.js` 를 건드리면 CI 는 `critical` 티어로 잡히고 `paid-flow-gates.yml` 이 깨어난다.
- jest 는 `NODE_OPTIONS=--experimental-vm-modules` 없이는 ESM 스위트를 통째로 못 읽는다.

## 후속 과제 (범위 밖, 고치지 않음)

- `app/points/PointsClient.tsx` 의 죽은 `fortune_pending_order` 분기.
- `worker/routes/billing.js` 의 동명 `handleConfirm` — `/api/billing/confirm` 이 가로채이므로 도달 불가로 **추정**(라우터 표 1곳만 확인, 미검증).
- `PAYMENT_CONCURRENCY_AUDIT.md:69` 가 사라진 `settlePaymentByImpUid` 를 언급한다.

## 별도 축 — 사용자만 할 수 있는 수동 스테이징 테스트

PR #1634 배포분 검증. ① 카드/일반 PG ② 카카오페이 × 단건 · 이용권 4조합:
PG창 금액이 **1,000원**인지 → 승인 → `GET /api/payments/orders/:id` 의 `status` · `amountKRW: 1000` · `entitlementGranted`.
프로덕션에서는 결제창을 열어 **정가**로 뜨는지 1건만 확인(승인 불필요).
