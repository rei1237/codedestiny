---
status: active
updated: 2026-09-06
next: 스테이징에서 confirm 왕복(단건·이용권)을 사용자가 확인한 뒤 3단계 PR 을 머지한다
---

# `/api/payments/confirm` V2 컷오버 (결제 3단계)

## 왜

사용자 요구: "레거시 정리도 진행해주고 2단계는 다른 세션으로 빼자."

## 지금 상태

- 1단계(죽은 구 핸들러 1,154줄 삭제) PR #1658 · 2단계(기대금액 우선순위 역전 + `/api/payments/confirm` 컷오버) PR #1672 — **둘 다 머지 완료**.
- 3단계(구 `handleConfirm` 및 연쇄 데드코드 1,058줄 삭제 + 가드 3건 재조준) — PR #1679 (`payments/drop-legacy-handleconfirm`) **머지 대기**.
- `worker/routes/payments.js` 4,754줄 → 3,696줄.

## 남은 작업

- [ ] **스테이징 confirm 왕복 (사용자만 가능)** — 단건·이용권 결제가 confirm 까지 성공하고 `GET /api/payments/orders/:id` 가 `status: paid` · `entitlementGranted: true` 를 준다. 임의 `paymentAmount` 를 보낸 confirm 은 거부된다. **이것을 확인한 뒤 3단계 PR 을 머지한다.**

## 알아낸 것 (3단계)

- 🔴 **롤백 성격이 바뀌었다** — 예전에는 `worker/index.js` 훅 블록만 걷어내면 구 핸들러가 되받았다. 이제 되받을 것이 없어 `POST /api/payments/confirm` 이 404 가 된다. **복구 수단은 3단계 PR 의 revert 하나다.**
- 가드가 구 핸들러 본문 문자열을 단언하던 것이 3건이었고 전부 `assertContains` 라 **조용히 사라지지 않고 즉시 FAIL** 했다(1단계 사고와 다른 유형). V2 로 재조준한 지점:
  - `verify-billing-pass-policy.mjs` — `accessMethod: "CARD"`(구 핸들러 유일 출처) → `worker/payments/compat.js` 의 `accessType: "single_purchase"`. V2 는 `accessMethod` 를 이용권/월정석에만 싣고 단건은 `accessType` 으로 구분하며, 셸 판정기 `index.html:24037` 이 실제로 읽는 것도 그쪽이다.
  - `verify-profile-card-action-policy.mjs` — `createDigitalContentAccessEvidence` → `compat.js` 의 `accessType`·`profileCardId`, `fetchPortOnePayment(env, impUid)` → 생존 호출부 `payments.js` 의 `fetchPortOnePayment(env, paymentId)`.
  - 🔴 두 마커 모두 **변이 테스트로 실제로 무는 것을 확인**했다(대상 문자열을 망가뜨리면 FAIL). `compat.js` 에 `accessType: "single_purchase"` 가 2곳이라 한 곳만 바꾸면 통과하니, 다음에 확인할 때는 전량 치환으로 볼 것.
- `verify-cron-mongo-op-coverage` 의 부채 원장 `"worker/routes/payments.js": 15` 는 **갱신 불필요**했다 — 삭제 전후 모두 미보호 op 21건으로 동일. 지운 코드는 크론 그래프에서 도달하지 않았다.
- `config/payment-freeze.json` 의 상한은 가드가 자동으로 조인다(4754 → 3697). 실패는 안 하지만 JSON 이 바뀌므로 같은 커밋에 담아야 한다.
- 호출부 0인데 **가드가 문자열로 잡고 있어 지우면 안 되는 것** 3종: `SUBSCRIPTION_BASE_PLANS` · `SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED_CODE/_MESSAGE` · (같은 축) `isSubscriptionMonthlyCreditMethod`·`rejectSubscriptionMonthlyCreditPurchase`·`logPaymentOrderTrace`·`maskPaymentIdentifier`. lint 가 미사용 경고를 내지만 **그대로 둔다.**

## 검증 (3단계에서 실제로 돌린 것)

```
npm run verify:billing-pass-policy · profile-card-action-policy · cron-mongo-op-coverage
npm run verify:payment-freeze · portone-single-payment · payment-reconcile
npm run verify:worker-security-guards · security-hardening · paid-gate-ui · guard-wiring
node scripts/verify-payment-concurrency-guards.mjs
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest __tests__/worker/payments __tests__/worker/router.legacy-payment-alias.static.test.js --runInBand --testEnvironment node
npm run lint && npm run typecheck && npm run check:quick -- --skip-build
```

- 🔴 jest 는 `NODE_OPTIONS=--experimental-vm-modules` 없이는 ESM 스위트를 통째로 못 읽는다.
- `worker/routes/payments.js` 를 건드리면 CI 는 `critical` 티어로 잡히고 `paid-flow-gates.yml` 이 깨어난다.

## 후속 과제 (범위 밖, 고치지 않음)

- `app/points/PointsClient.tsx` 의 죽은 `fortune_pending_order` 분기.
- `worker/routes/billing.js` 의 동명 `handleConfirm` — `/api/billing/confirm` 이 가로채이므로 도달 불가로 **추정**(라우터 표 1곳만 확인, 미검증).
- `PAYMENT_CONCURRENCY_AUDIT.md:69` 가 사라진 `settlePaymentByImpUid` 를 언급한다.

## 별도 축 — 사용자만 할 수 있는 수동 스테이징 테스트

PR #1634 배포분 검증. ① 카드/일반 PG ② 카카오페이 × 단건 · 이용권 4조합:
PG창 금액이 **1,000원**인지 → 승인 → `GET /api/payments/orders/:id` 의 `status` · `amountKRW: 1000` · `entitlementGranted`.
프로덕션에서는 결제창을 열어 **정가**로 뜨는지 1건만 확인(승인 불필요).
