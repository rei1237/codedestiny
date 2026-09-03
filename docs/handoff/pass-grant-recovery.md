---
status: active
updated: 2026-09-03
next: PR D(pr-d-pass-payment-hardening, base main) 사용자 머지 → 에이전트가 프로덕션 승격 1회(사용자 명시 요청) → 인덱스 --check 를 저장소 루트에서 → PR B(월 한도)
---

# 이용권 결제 승인 뒤 미지급 — 복구 경로 + 후속 PR

## 왜

카카오페이·카드로 이용권을 결제하면 PG 승인은 나는데 계정에 이용권이 안 붙는다(2026-09-03). 진단 결과 결제 실행이 아니라 **복구 주체 부재**였다 — 상세는 `C:\Users\user\.claude\plans\code-destiny-frolicking-taco.md`(1·2절). PR D 의 근거·결함표는 `C:\Users\user\.claude\plans\docs-handoff-pass-grant-recovery-md-lucky-gizmo.md`.

## 지금 상태

- PR A = **#1526** (A1~A6) — 2026-09-03 10:56Z 머지됨. 프로덕션 승격은 PR D 와 함께 한 번에: **에이전트가 승격을 대신 실행한다**(사용자가 명시 요청): `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`. 한 번뿐.
- PR D = `pr-d-pass-payment-hardening` (base `main`, #1526 스쿼시 위로 리베이스). D1~D5 구현·검증 완료:
  - D1 `PG_PAYMENT_NOT_PAID` 로 닫힌 주문을 Paid 웹훅(`evaluateConfirmable`)·구 크론(후보 쿼리 `failed+failureCode`)이 되살린다. 422→FAILED 계약은 유지.
  - D2 웹훅 전액취소가 이용권 주문이면 `revokePassGrantForOrder`(passes.js)로 `profileSubscription` 되감기. `lastPassOrderId` 불일치면 손대지 않고 `reviewRequired`.
  - D3 관리자 환불 `revokeMembershipPassGrant` 가 `metadata.durationMonths` 도 읽는다.
  - D4 지급 스킵·재지급 실패에 주문별 로그, 재지급은 `updatedAt` 최신 우선.
  - D5 (PR C 흡수) `cdco=1` 자동 모달 오픈 제거(사용자 결정: 상점 화면에 플랜 강조만), 결제 방식 모달 카드가 뷰포트 안에서 스크롤.
  - M10: 노브 변경 0. 낡은 주석만 정정(db.js·wrangler.toml 주석·dbConnect.js). 핀 44개(`build-9343e0008d7a`)는 `verify:payment-choice-parity` 요구값.
- Galaxia/Moneytree: 코드 0건(리포 전체 `git grep -i`), 삭제할 것 없음 — 보고 완료.

## 남은 작업

- [ ] PR D 머지 → 승격 → `/api/version` SHA 확인 → PortOne 콘솔에서 미지급 건 웹훅 **재전송**으로 실검증(스테이징은 `PORTONE_*` 없음)
- [ ] **인덱스 `--check` 미실행** — 워크트리에 `.env.local` 이 없어 `MONGO_URI` 를 못 읽는다. 저장소 루트에서 `node scripts/migrations/20260830-add-request-path-indexes.mjs --check`(읽기 전용). 생성은 프로덕션 쓰기라 **별도 승인** 뒤에만.
- [ ] 미지급 기존 사용자 실측 — 읽기 전용 Mongo 쿼리(첫 계획 5절). `cancelled` 건은 A1 이 못 살린다(취소 CAS) → 건별 승인 후 수동 `activatePassSubscription`. 이제 `failed+PG_PAYMENT_NOT_PAID` 건은 크론이 24h 창 안에서 스스로 살린다(창 밖은 수동).
- [ ] **PR B** 월 한도 집행 — `docs/handoff/pass-monthly-limit-enforcement.md` 2-A~2-E. `app/_lib/billing-client.ts` 는 wholeFile 동결 → `verify:payment-freeze -- --update`
- [ ] M10 후보(측정 전 변경 금지): `MONGO_DISABLE_RESET_ON_OPERATION_TIMEOUT` 은 불리언이라 수치 패리티 테스트 틀에 안 맞는다 — 넣으려면 테스트 틀부터.

## 정본 예시

- 되살리기 조건: `worker/payments/index.js` `evaluateConfirmable` 의 `revivable` · `worker/lib/payment-reconcile-task.js` 후보 쿼리 `$and[0].$or`
- 이용권 회수: `worker/payments/passes.js` `revokePassGrantForOrder` · `worker/lib/payment-refund.js` `revokeMembershipPassGrant`
- 크론 → V2 정산: `payment-reconcile-task.js` (`settleOrderFromReconcile` 호출부)
- 테스트: `__tests__/worker/payment-reconcile-v2-settle.test.js`, `payments-v2.{webhook,webhook-events,reconcile,subscription}.test.js`, `payment-refund.pass-duration.test.js`

## 함정

- 대기 문구 리터럴은 `scripts/verify-billing-pass-policy.mjs:616-623` 과 `__tests__/ui/points-shop-request-budget.static.test.js:124` 가 고정한다 — 문구를 바꾸면 둘 다.
- `PointsClient.tsx` 는 BOM+CRLF. Edit/sed 금지, node 패치 스크립트(EOL 감지)로. 워크트리 가드는 heredoc·`/tmp`·`$((…))`·루프+git 을 거부 — 스크립트는 Write 로 워크트리 안에 두고 `node` 한 줄로.
- `js/core/checkout-entry.js` 를 고치면 `sync:public` 이 캐시키를 돌려 index.html 계열 20여 파일이 함께 바뀌고, 독립 정적 페이지 22개의 `?v=` 핀은 `verify:payment-choice-parity` 가 알려주는 값으로 **손으로** 바꿔야 한다.
- 구 크론 클레임 CAS 는 `status: candidate.status` 라 `failed` 후보도 잡힌다 — `"pending"` 으로 바꾸면 되살리기가 조용히 죽는다.
- A2 잔여: 한 번도 프로브되지 않은 PENDING 주문은 취소되지 않고 남는다(의도).

## 검증

```
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest __tests__/worker/payments-v2 __tests__/worker/payment-reconcile-time-budget.test.js __tests__/worker/payment-reconcile-v2-settle.test.js __tests__/worker/db.vars-code-default-parity.test.js __tests__/billing/checkout-entry.test.js __tests__/worker/payment-refund.pass-duration.test.js
node --test __tests__/ui/points-shop-request-budget.static.test.js
npm run verify:billing-pass-policy && npm run verify:payment-choice-parity && npm run verify:checkout-pass-card && npm run verify:paid-gate-ui && npm run verify:portone-single-payment && npm run verify:payment-freeze
```

## 모르는 것

- 실제 미적용 건의 orderId/시각/수단 — 5절 쿼리 전엔 S1(취소) vs S2(무음 지급 실패) 비율을 모른다.
- **D6(보고만)**: 구 크론은 `isSinglePurchase` 를 `orderState==="PENDING"` 보다 먼저 봐서 V2 **단건** 주문(`orders.js` prepare 가 정확히 그 조합)을 레거시 `settleSinglePaymentForReconcile` 로 보낸다(`fulfilled` 로 닫고 `entitlementGrantedAt` 안 씀). 레거시 주문도 `orderState` 를 쓰므로 그 값만으로 V2/레거시 구분 불가 → 레거시 정산 동작이 미검증이라 순서를 못 바꿨다. 주석은 코드 순서대로 고쳐 뒀다.
