---
status: active
updated: 2026-09-03
next: PR #1526 사용자 머지 → 에이전트가 프로덕션 승격 1회(사용자 명시 요청) → PR C(모바일 이용권 상점) → PR B(월 한도)
---

# 이용권 결제 승인 뒤 미지급 — 복구 경로 + 후속 두 PR

## 왜

카카오페이·카드로 이용권을 결제하면 PG 승인은 나는데 계정에 이용권이 안 붙는다(2026-09-03). 진단 결과 결제 실행이 아니라 **복구 주체 부재**였다 — 상세는 `C:\Users\user\.claude\plans\code-destiny-frolicking-taco.md`(1·2절). 사용자: "급선무이므로 바로 승격시켜줘".

## 지금 상태

- PR A = **#1526** (`worktree-pass-grant-recovery`, A1~A6) — CI 대기/통과 확인 중. 머지되면 **에이전트가 승격을 대신 실행한다**(사용자가 이 세션에서 명시 요청): `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`. 한 번뿐.
- Galaxia/Moneytree: 코드 0건(리포 전체 `git grep -i`), 삭제할 것 없음 — 사용자에게 보고 완료.

## 남은 작업

- [ ] #1526 머지 확인 → 승격 실행 → `/api/version` 으로 SHA 확인 → PortOne 콘솔에서 미지급 건 웹훅 **재전송**으로 실검증(스테이징은 `PORTONE_*` 없음)
- [ ] 미지급 기존 사용자 실측 — 읽기 전용 Mongo 쿼리(계획 5절). 누가 돌릴지(관리자 화면/Atlas) 사용자 확인. `cancelled` 건은 A1 이 못 살린다(취소 CAS) → 건별 승인 후 수동 `activatePassSubscription`
- [ ] **PR C** 모바일 이용권 상점: (1) 모바일에서 이용권 상점 결제창이 잘려 나옴 → 모바일 UI/UX 최적화 (2) 이용권 구매는 **/points 상점 화면 자체**로 보내 대안을 볼 수 있게 하고, "선택한 서비스 가격에만 해당하는 이용권 구매 창"으로 가지 않게 한다. 미착수 — dp 코어/`js/core/checkout-entry.js`/유료 게이트 진입(`data-mode="pass-store"`)이 어느 창을 여는지부터 실측
- [ ] **PR B** 월 한도 집행(PR 2) — `docs/handoff/pass-monthly-limit-enforcement.md` 2-A~2-E. `app/_lib/billing-client.ts` 는 wholeFile 동결 → `verify:payment-freeze -- --update`

## 정본 예시

- 크론 → V2 정산: `worker/lib/payment-reconcile-task.js` (`settleOrderFromReconcile` 호출부) · `worker/payments/index.js` `settleOrderFromReconcile`
- 웹훅 중복 3상태(`claimed/duplicate/busy`): `worker/payments/webhook.js` `reserveEvent`
- 클라이언트 부팅 재확인·수단 라벨: `app/points/PointsClient.tsx` `withSubscriptionMethod`, `pendingSubscriptionBootRetryRef` 효과
- 테스트: `__tests__/worker/payment-reconcile-v2-settle.test.js`, `payments-v2.{webhook,webhook-events,reconcile,subscription}.test.js`

## 함정

- 대기 문구 리터럴은 `scripts/verify-billing-pass-policy.mjs:616-623` 과 `__tests__/ui/points-shop-request-budget.static.test.js:124` 가 고정한다 — 문구를 바꾸면 둘 다.
- `PointsClient.tsx` 는 BOM+CRLF. Edit/sed 금지, node 패치 스크립트(EOL 감지)로.
- A5 잔여 위험: 결제창을 연 뒤 60초 지나 다른 탭에서 `/points` 를 열면 미결제 주문이 422 로 `failed` 확정된다(웹훅은 여전히 확정 가능, 구 크론은 `pending` 만 훑음).
- A2 잔여: 한 번도 프로브되지 않은 PENDING 주문은 취소되지 않고 남는다(의도).

## 검증

```
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest __tests__/worker/payments-v2.*.test.js __tests__/worker/payment-reconcile-time-budget.test.js __tests__/worker/payment-reconcile-v2-settle.test.js
node --test __tests__/ui/points-shop-request-budget.static.test.js
npm run verify:billing-pass-policy && npm run verify:payment-choice-parity && npm run verify:checkout-pass-card && npm run verify:payment-freeze
```

## 모르는 것

- 실제 미적용 건의 orderId/시각/수단 — 5절 쿼리 전엔 S1(취소) vs S2(무음 지급 실패) 비율을 모른다.
- PR C 의 "결제창 잘림"이 어느 창인지(dp 코어 결제창 vs `/points` 카드 모달) — 스크린샷 없이 미확정.
