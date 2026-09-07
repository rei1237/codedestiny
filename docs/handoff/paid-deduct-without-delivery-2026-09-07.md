---
status: active
updated: 2026-09-07
next: F1 은 PR #1736 으로 끝났다(머지 여부부터 확인). 다음은 F2 — 아래 F2 절의 실측을 근거로 사전 보고 7항목부터 낸다.
---

# 결제 차감 후 결과 미전달 — 잔여 결함 (F1 수정 PR 대기, F2~F5 미착수)

- 작성 2026-09-07
- 선행: PR #1728(지연차감 register 증빙 5갈래 보강) 머지 완료(`f979d8ea4`). 이 문서는 **그 다음에 남은 것**이다.
- 🔴 **모바일 리다이렉트 복귀(자동 재개) 축은 사용자가 별도로 수정 중이다 — 여기서 건드리지 않는다.**
  그 축의 상태는 `docs/handoff/paid-feature-resume-2026-09-06.md`.

## 다음 세션 첫 문장

"**F1 은 PR #1736 으로 끝났다**(머지 여부부터 확인). 다음은 **F2(카드 단건 실패가 실행 등록 자체를 건너뜀)** 다 — 아래 F2 절의 실측을 근거로 사전 보고 7항목부터 낸다. `/effort high` 와 워크트리 필수."

## ~~F1~~ ✅ 수정 완료 — PR #1736 (`fix/moonstone-auto-refund-v2`, 머지 대기)

**고친 형태**: `resolveMonthlyCreditSourceTransactionId` 를 **바꾸지 않고**, `runMonthlyCreditRefund` 를
"PointHistory 갈래(구 데이터) → 비면 원장 갈래" 오케스트레이터로 쪼갰다. 원장 갈래는 정본
`findMoonstoneSpendEvidence` 에 위임한다(쿼리 복제 없음). 멱등키는 원장 id 가 아니라 **실행 id**
(`service-exec-refund:exec:<executionId>`) — 환불 표식이 SPEND 행에 찍히면 정본 조회기가 그 행을 영영
배제하므로 원장 기준 키는 재진입에서 되짚을 수 없다.
회귀 테스트 `__tests__/worker/service-execution-monthly-credit-refund.test.js`(변이로 무는 것 확인).

🔴 **머지 전이라면 아래 원본 진단이 여전히 프로덕션 상태다.**

<details><summary>원본 진단 (F1)</summary>

체인을 끝까지 확인했다:

1. `POST /api/billing/coin-gate` 의 MONTHLY 는 `worker/index.js:1421` 에서 V2(`/api/payments/coin-gate/moonstone`)로 재작성된다.
2. V2 `spendMoonstone` 은 **PointHistory 를 쓰지 않는다**(`worker/payments/moonstone.js:30` 독스트링 명시). 원장 metadata 는 `{purchaseId, productId}` 뿐이다(`:113-125`).
3. 환불 해석기 `resolveMonthlyCreditSourceTransactionId`(`worker/lib/service-execution-task.js:528-630`)의 **4갈래가 전부 PointHistory `_id` 로 끝난다** — 직접(`:536-542`) · 원장 `metadata.pointHistoryId`(`:556-558`, `:585-587`) · PointHistory `metadata.accessType:"membership_credit"`(`:620-629`). V2 원장에는 `pointHistoryId` 가 없고 그 PointHistory 행 자체가 없다.
4. → `:650` `{refunded:false, skipped:true, reason:"DEDUCT_HISTORY_NOT_FOUND"}`.
5. PointHistory 를 쓰던 구 경로 `consumeMembershipCreditIfAvailable` 의 호출자는 `worker/routes/billing.js:4102` **한 곳뿐**이고, 그건 위 1번이 가로채는 핸들러 안이다(전수 grep: 소스 1 + verify 1 + 테스트 1 + 문서 1).

**영향**: 월정석으로 결제 → 생성 실패 → 환불이 조용히 skip → `refundStatus:"refund_failed"` 로 종결 고착(`:974-995`), 재시도 리퍼는 `pending` 만 집으므로 다시 안 잡는다. 사용자가 재시도하면 새 requestId 라 **월정석이 또 빠진다**.
**해당 라우트**: `astrology-ai` · `neo-operation-room` · `nakshatra-ai` · `human-design-report` · `ziwei-deep-report` · `destiny-compass-ai`.
**고치는 형태**: 해석기를 원장 기준으로 교체한다. 이미 그렇게 하는 짝이 둘 있다 — `worker/routes/fortune.js:1127-1180`, `worker/routes/naming-prompt.js:1430-1490`(`findMoonstoneSpendEvidence` 로 SPEND 원장을 찾아 GRANT 를 쓴다). 원칙 15 대로 이 형태를 따른다.
**등급 RED**: 공유 모듈 + 결제. 사전 보고 7항목 · `/effort high` · 워크트리 필수.

</details>

## F2 (다음 차례 · **실측 확인 완료**) 카드 단건 실패는 실행 등록 자체를 건너뛴다

2026-09-07 두 파일을 직접 열어 확인했다. `startRefundableExecution` 이 **첫 줄에서** 빠진다:
`astrology-ai.js:1417` · `neo-operation-room.js:1216` 모두
`if (access.source !== "billing-gate" || !access.executionSourceTransactionId) return null;`.
카드는 `source:"payment"` 라 실행이 아예 등록되지 않고, 실패해도 `failServiceExecution` 이 404 로 끝나
환불·기록이 0. **월정석이라도 `ctx.transactionId` 가 비면 같은 줄에서 빠진다** — F1 이 구제할 수 있는
범위도 이 조건만큼 좁다. 정본 짝은 `worker/routes/fortune.js:1242`(`autoRefundSinglePaymentDeliveryFailure`).

## F3 (중간 · 부분 실측) `/deferred/cancel` 이 아무것도 복원하지 않는다

`worker/routes/billing.js:2465-2474` — status 를 `generation_failed` 로 `$set` 할 뿐 이용권·월정석·카드 어느 것도 복원하지 않는다(직접 확인). 지연차감은 결제가 끝난 뒤 등록되므로 이 시점에 재화는 이미 나갔다.
여기에 서브에이전트 보고가 겹친다(미검증): `karma-destiny-ai.js:841` · `new-year-ai.js:1177` 이 증빙 목록에서 `generation_failed` 를 빼고, `love-secret-ai.js:631` 은 `generating` 까지 뺀다 → **cancel 이 자기 증빙을 스스로 지운다.**
**고치는 형태**: 세 라우트의 상태 목록을 정본 4개(`paid_pending_generation`·`generating`·`generation_failed`·`completed`, 정본 `fortune-tea-house.js:64`·`life-book-ai.js:912`)로 맞추고 손수 쓴 조회를 `findVerifiedDeferredBillingEvidence` 에 위임한다.
🔴 **`worker/routes/billing.js` 는 7147줄 / 동결 상한 7148 — 여유 1줄이다**(실측). cancel 복원을 인라인으로 넣으면 상한을 넘긴다. 로직은 `worker/lib/` 헬퍼로 빼고 billing.js 에는 호출 한 줄만 남긴다. (`worker/routes/payments.js` 도 3696/3697 로 같은 상황.)

## F4 (중간 · 실측) 이용권 증빙 행이 유실되면 영구 402 — 라이브 폴백 없는 라우트

`recordPassUsageEvidence`(`worker/payments/passes.js:588-629`)는 증빙 쓰기 실패를 **`} catch {` 로 삼킨다**. `worker/payments/index.js:1215-1217`(마커 히트 재시도)과 `:1231`(alreadyOwned)은 증빙 기록 `:1251` **앞에서 return** 한다 — 이 경로엔 증빙 행이 애초에 없다. 소비 마커(`User.recentConsumeRequestIds`)만 남는데, **그 마커를 읽는 곳은 `worker/lib/deferred-billing-proof.js` 한 곳뿐**(PR #1728 에서 추가).

- **면역 9개 파일**(이용권을 라이브로 재판정·멱등 소비): `fusion-fortune` · `fortune` · `animal-totem` · `billing` · `nakshatra` · `nakshatra-premium` · `human-design-report` · `tarot` · `master-love-codex`(1단계 조회 실패 시 `:880` 로 폴백).
- **노출**: 자체 증빙 조회만 쓰는 나머지. 그중 `sukuyo-compatibility-ai.js:1080-1121` 은 PaidExecutionRecord 갈래마저 없어 2갈래뿐이라는 보고가 있다(미검증, 착수 전 확인).

## F5 (찻집 · 실측) 생성 실패 시 유료 차감이 남고 재시도가 재과금이다

`worker/routes/fortune-tea-house.js` 에 `failServiceExecution`/`forceRefundOnClose` 가 **없다**(전수 grep). 환불 writer 는 `refundHoneyLetterSpend:4680` 하나이고 그건 꿀방울(내부 재화) 축이다. `refundedForServiceExecution` 은 `:1247` 에서 조회 제외 절로만 쓰인다.
대신 `generation_failed`(retryable, `:4117`) + 같은 requestId 무료 재시도 창(`:64`)에 기대는데, **클라가 그 키를 재사용하지 않는다** — `FortuneTeaHousePage.tsx:882` 가 제출마다 새 `attemptId` 를 만들고 시드에 `Date.now()`·`Math.random()` 이 들어간다(`lib/honeyDrops.ts:28-41`).

## 검증 (F1 에서 실제로 돌린 것 — 다음 축도 같은 세트)

```
npm run verify:payment-concurrency-guards   # 환불 지점 자동 발견 — 환불 코드를 고치면 이게 1순위
npm run verify:billing-pass-policy · verify:portone-single-payment · verify:paid-gate-ui
npm run verify:payment-choice-parity · verify:checkout-pass-card · verify:payment-freeze
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest <파일> --runInBand --testEnvironment node
npm run lint && npm run typecheck && npm run check:quick -- --skip-build
```

🔴 워크트리에서 jest 를 맨손으로 부르면 ESM 파싱 실패한다 — 위처럼 `NODE_OPTIONS` 를 붙일 것.
🔴 `check:quick --skip-build` 은 `build:worker` 에서 항상 실패한다(`workers-og` 미설치, `main` 도 동일).
CI `build` 잡이 잡으므로 그 한 줄은 무시한다.

## 미검증 · 남은 구멍

- **런타임 재현 0건.** 전부 정적 판독이다. DB 조회도 안 했으므로 실제 피해 건수와 지금 `refund_failed` 로 굳은 실행이 있는지는 모른다.
- 환불 write 로 **추정**만 하고 본문을 열지 않은 곳: `ziwei-ai.js:2092/2104` · `vedic-ai.js:731/743` · `sukuyo-compatibility-ai.js:1675/1687` · `ziwei-island-ai.js:429/436` · `love-secret-ai.js:964/981/1015` · `life-book-ai.js:1787-1825` · `naming-prompt.js:1441-1488`.
- 유료 여부조차 확인 안 한 라우트: `pet-saju-ai` · `dream` · `oracle` · `palm` · `celestial-harmony` · `ziwei-island-report` · `ziwei-daehan` · `saju-new-year` · `destiny-flower` · `fpti` · `guardian-image` · `rpg` · `yoga-guru` · `sibyl` · `music`.
- 클라 재시도 키 재사용을 실측한 것은 넷뿐이다(셸 per-use `js/destiny-profile.js:12615-12618` · 게이트 재사용 TTL 10초 `app/_lib/billing-client.ts:459` · `astrology-ai` `:1876` · `palm`). karma·new-year·love-secret·life-book·sukuyo 는 미검증이고, 이것이 F1·F3 의 실제 피해 규모를 좌우한다.

## 범위 밖 (고치지 않고 보고만 — 원칙 14)

`docs/handoff/sukuyo-duplicate-generation-window.md` 가 `status: active` 인데 그 중복 생성 창은 이미 닫혔다(`worker/routes/sukuyo-compatibility-ai.js:1981-1987`). 문서 낡음.
