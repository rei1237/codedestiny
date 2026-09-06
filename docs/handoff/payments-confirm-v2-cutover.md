---
status: active
updated: 2026-09-06
next: worker/routes/payments.js:2486 의 기대금액 우선순위를 뒤집고 /api/payments/confirm 을 V2 confirmOrder 로 넘긴다
---

# `/api/payments/confirm` V2 컷오버 (결제 2단계)

## 왜

사용자 요구: "레거시 정리도 진행해주고 2단계는 다른 세션으로 빼자."

1단계(죽은 레거시 핸들러 삭제)는 끝났다. 남은 것은 **아직 구 라우트가 받는 유일한 결제 경로** `POST /api/payments/confirm` 을 V2 로 넘기면서, 그 안의 기대금액 우선순위 역전을 바로잡는 일이다.

## 지금 상태

- PR #1634 (스테이징 1,000원 테스트 모드) 머지 완료.
- PR #1658 (구 라우트 데드코드 1,154줄 삭제 · 미성년 결제 제한 삭제) — CI 9개 전부 통과, **사용자 머지 대기**. 브랜치 `worktree-legacy-payments-deadcode`.
- 2단계는 아직 **착수 전**. 코드 변경 0.

## 남은 작업

- [ ] **기대금액 우선순위 역전** — [worker/routes/payments.js:2486](worker/routes/payments.js#L2486) 의 `expectedAmount` 는 클라이언트가 보낸 `requestedAmount` 를 **준비된 주문 금액보다 먼저** 채택한다. 순서를 `paymentRecord.paymentAmount` → (없을 때만) `requestedAmount` 로 뒤집는다. 클라 값이 들어오는 입구는 [:3288](worker/routes/payments.js#L3288).
- [ ] **컷오버** — `worker/index.js` 의 `/api/payments/*` 가로채기 블록에 `/confirm` 을 추가해 V2 `confirmOrder`([worker/payments/index.js:658](worker/payments/index.js#L658))로 보낸다. 어댑터 선례는 [worker/payments/index.js:1004-1015](worker/payments/index.js#L1004-L1015)(구 `/api/billing/confirm` 재작성).
- [ ] **구 `handleConfirm` 삭제** — 위 둘이 끝나고 도달 불가가 확인된 뒤. 1단계와 같은 절차(3면 `git grep` → 래칫 `config/payment-freeze.json` · `verify-cron-mongo-op-coverage.mjs` 동시 갱신).
- **"됐다" 판정**: 스테이징에서 단건·이용권 결제 왕복이 confirm 까지 성공하고, `GET /api/payments/orders/:id` 가 `status: paid` · `entitlementGranted: true` 를 준다. 그리고 임의 `paymentAmount` 를 보낸 confirm 이 거부된다.

## 함정

- 🔴 **가드가 소스 문자열로 단언한다** — 구 라우트에서 코드를 지우면 그 정책이 조용히 사라진다. 1단계에서 2건이 실제로 그랬다(`scripts/verify-portone-single-payment-regression.mjs`, `__tests__/ui/points-shop-request-budget.static.test.js`). **지우기 전에 가드를 V2 소스로 옮겨 겨눈다.**
- 구 라우트에는 호출부 0인데 **일부러 남긴** 블록이 2개 있다(`SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED` 계열, `SUBSCRIPTION_BASE_PLANS`). 각 블록 위 주석에 해제 순서가 적혀 있다.
- 현재 상태가 취약점은 **아니다** — 방어 3겹 + `paymentType` 스키마 기본값 `point_charge` 가 막는다. 설계 역전을 바로잡는 작업이지 긴급 패치가 아니다.
- 결제 절대 순서·금지 패턴은 [docs/context/payment-gating.md](docs/context/payment-gating.md).

## 검증

```
npm run verify:portone-single-payment
npm run verify:billing-pass-policy
npm run verify:payment-freeze
npm run test:node
npx --no-install jest __tests__/worker/payments __tests__/worker/payments-v2
```

## 모르는 것

- 앱(Capacitor) 클라이언트가 `/api/payments/confirm` 을 웹과 같은 페이로드로 부르는지 미확인. 컷오버 전에 확인이 필요하다.

## 별도 축 — 사용자만 할 수 있는 수동 스테이징 테스트

PR #1634 배포분 검증. ① 카드/일반 PG ② 카카오페이 × 단건 · 이용권 4조합:
PG창 금액이 **1,000원**인지 → 승인 → `GET /api/payments/orders/:id` 의 `status` · `amountKRW: 1000` · `entitlementGranted`.
프로덕션에서는 결제창을 열어 **정가**로 뜨는지 1건만 확인(승인 불필요).
