# 이용권 월간 사용한도(monthlySpendCoin) 미복구 — 후속 과제

## 배경

PR #1954 에서 `verifyPerUsePayment` 의 이용권(pass) 커버 분기가 `profileSubscription.monthlySpendCoin` 을
차감하고도 뒤 단계(AI 생성) 실패 시 되돌리지 않던 결함을, **실제 환급 배선이 있는 `human-design-report.js`
한 곳만** 고쳤다(범위는 사용자 승인). 같은 결함을 공유하는 나머지 호출부는 이번에 손대지 않았다 —
아래 두 그룹이 남는다.

## 후속 과제 1 — 같은 `consumePassForFeature` 결함을 공유하는 라우트

이용권 커버 시 `monthlySpendCoin` 을 차감하지만 실패 시 되돌리는 배선이 없다:

- `worker/routes/master-love-codex.js`
- `worker/routes/fortune.js` (ziwei-ai 경로)
- `worker/routes/ziwei-island-ai.js`
- `worker/payments/index.js` (V2 이용권 코인게이트)

**수정 방향(제안)**: `human-design-report.js` 에 적용한 패턴(`verifyPerUsePayment` → `passRefund` 반환 →
`ServiceExecutionTransaction` 메타데이터에 실어 `runPassQuotaRefund` 가 되돌림)을 각 라우트가 이미
`ServiceExecutionTransaction`/`startServiceExecution` 배선을 갖고 있는지부터 확인한 뒤 이식한다.
`runPassQuotaRefund` 자체(`worker/lib/service-execution-task.js`)는 이미 범용으로 구현되어 있어
새 라우트마다 재구현할 필요는 없다.

## 후속 과제 2 — `verifyPerUsePayment` 호출부 중 환급 장치 자체가 없는 7개 라우트

아래는 이용권뿐 아니라 코인·월정석 소비까지 포함해 **AI 생성 실패 시 어떤 결제 수단이든 환급 장치가
전혀 없다**(설계상 같은 `requestId` 재사용 재시도만 허용):

- `worker/routes/tarot.js`
- `worker/routes/fusion-fortune.js`
- `worker/routes/animal-totem.js`
- `worker/routes/nakshatra-premium.js`
- `worker/routes/nakshatra.js`
- `worker/routes/relationship-boundary-test.js`
- `worker/routes/fortune.js` (수호신 resolver 경로)

**수정 방향(제안)**: 이번 이용권 한정 결함과 결이 다른 별도 과제 — 코인/월정석/이용권 세 갈래 모두
`ServiceExecutionTransaction` 기반 환급 배선을 새로 여는 작업이 필요하다. 먼저 사용자와 우선순위·범위
(코인만? 세 갈래 다?)를 확정한 뒤 진행한다. 재시도 설계(같은 requestId 재사용)가 사용자에게 실제로
잘 노출되고 있는지도 함께 확인 필요.

## 참고

- 이번 PR 의 재사용 가능한 구성요소: `worker/lib/service-execution-task.js` 의 `runPassQuotaRefund`
  (이용권 사이클 키·잔액 조건부 `$inc` 환급 + `metadata.passRefund.refundedAt` 멱등 마커).
- 형제 패턴: `runMonthlyCreditRefund`(월정석), `runCoinRefund`(코인 계좌) — 동일 파일 내 비교 가능.
