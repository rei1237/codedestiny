---
status: active
updated: 2026-09-06
next: 스테이징에서 confirm 왕복을 확인한 뒤 worker/routes/payments.js 의 구 handleConfirm 을 지운다 (3단계)
---

# `/api/payments/confirm` V2 컷오버 (결제 3단계)

## 왜

사용자 요구: "레거시 정리도 진행해주고 2단계는 다른 세션으로 빼자."

1단계(죽은 구 핸들러 1,154줄 삭제)·2단계(기대금액 우선순위 역전 + `/api/payments/confirm` 컷오버)는 끝났다. 남은 것은 도달 불가가 실제로 확인된 뒤 구 `handleConfirm` 을 지우는 일이다.

## 지금 상태

- PR #1634(스테이징 1,000원 테스트 모드) 머지 완료. PR #1658(1단계) 는 사용자 머지 대기.
- 2단계 코드 변경 완료 — `worker/index.js` 가로채기 훅 추가, `worker/routes/payments.js` 기대금액 역전, `worker/payments/index.js` 에 `body.impUid` 폴백, 라우터 정적 가드에 순서 단언 1건.
- 구 `handleConfirm` 은 **남아 있다** — 훅을 걷어내면 그 자리에서 다시 답하는 롤백 수단이다.

## 남은 작업

- [ ] **스테이징 왕복 확인** — 단건·이용권 결제가 confirm 까지 성공하고 `GET /api/payments/orders/:id` 가 `status: paid` · `entitlementGranted: true` 를 준다. 임의 `paymentAmount` 를 보낸 confirm 은 거부된다.
- [ ] **구 `handleConfirm` 삭제** — 위가 확인된 뒤. 1단계와 같은 절차(3면 `git grep` → `config/payment-freeze.json` 상한 · `verify-cron-mongo-op-coverage.mjs` 동시 갱신).

## 함정

- 🔴 **가드가 소스 문자열로 단언한다** — 구 라우트에서 코드를 지우면 그 정책이 조용히 사라진다. 1단계에서 2건이 실제로 그랬다. 지우기 전에 가드를 V2 소스로 겨눈다.
- 🔴 **훅 순서가 계약이다** — `/api/payments/confirm` 훅이 `handlePaymentRoutes` 폴스루보다 뒤로 밀리면 조건은 그대로인 채 트래픽만 조용히 구 핸들러로 돌아간다. `__tests__/worker/router.legacy-payment-alias.static.test.js` 가 순서를 고정한다.
- 구 라우트에는 호출부 0인데 **일부러 남긴** 블록이 2개 있다(`SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED` 계열, `SUBSCRIPTION_BASE_PLANS`). 블록 위 주석에 해제 순서가 있다.
- 결제 절대 순서·금지 패턴은 [docs/context/payment-gating.md](docs/context/payment-gating.md).

## 검증

```
npm run verify:portone-single-payment
npm run verify:billing-pass-policy
npm run verify:paid-gate-ui
npm run verify:payment-freeze
node scripts/verify-payment-concurrency-guards.mjs
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest __tests__/worker/payments __tests__/worker/router.legacy-payment-alias.static.test.js --runInBand --testEnvironment node
```

- 🔴 jest 는 `NODE_OPTIONS=--experimental-vm-modules` 없이는 ESM 스위트를 통째로 못 읽는다(`test:jest` 배선과 동일).
- `check:quick -- --skip-build` 은 로컬에서 `build:worker` 의 `workers-og` 미해석으로 실패한다(환경 문제, CI 가 잡는다). `test:node` 의 yehwa 생성물 1건도 같은 축의 기존 실패다.

## 알아낸 것 (2단계)

- **`/points` 단건 confirm 클라 경로는 이미 죽어 있다** — `fortune_pending_order` 의 writer 가 레포 어디에도 없다(`public/**` 미러 포함 `git grep`). writer 는 `8be13e6af` 에서 사라졌고, 남은 실호출부는 캐시된 구 번들뿐이다. 그것이 V2 어댑터에 `body.impUid` 폴백을 남긴 유일한 근거다.
- 앱(Capacitor)은 별도 소스가 없고 같은 웹 번들을 싣는다 — 1단계의 "모르는 것"은 해소됐다.

## 후속 과제 (이번 범위 밖, 고치지 않음)

- `app/points/PointsClient.tsx` 의 죽은 `fortune_pending_order` 분기.
- `worker/routes/billing.js` 의 `handleConfirm` — 내부 `delegateToPayments` 가 `worker/index.js` 를 우회하지만 `/api/billing/confirm` 자체가 가로채이므로 도달 불가로 **추정**(라우터 표 1곳만 확인, 미검증).

## 별도 축 — 사용자만 할 수 있는 수동 스테이징 테스트

PR #1634 배포분 검증. ① 카드/일반 PG ② 카카오페이 × 단건 · 이용권 4조합:
PG창 금액이 **1,000원**인지 → 승인 → `GET /api/payments/orders/:id` 의 `status` · `amountKRW: 1000` · `entitlementGranted`.
프로덕션에서는 결제창을 열어 **정가**로 뜨는지 1건만 확인(승인 불필요).
