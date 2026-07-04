# 결제/락 로직 Race Condition & Partial-Write 감사

> 대상: Cloudflare Workers(단일 요청 격리, 전역 락 부재) + MongoDB Atlas + PortOne(KG이니시스)
> 범위: 결제 요청→승인→웹훅→반영, 잠금 콘텐츠 해제/1회성 유료 차감, KRW 마이그레이션 이후 금액 경로
> 정본: `docs/payment-policy-*.md` 및 KRW 마이그레이션 결정(코인 폐지, `1코인=100원`)

## 이미 견고하게 처리되어 있던 부분 (수정 불필요)

| 항목 | 근거 |
|------|------|
| 웹훅 멱등성 인덱스 | `paymentWebhookEventSchema.index({provider,eventId},{unique:true})` (models.js:398), `create` 후 11000 캐치 |
| 주문 상태 원자 전이 | `findOneAndUpdate({_id, status:{$ne:"success"}})` 승자 판정 (payments.js) |
| 조건부 원자 차감 | 월정석/포인트 `{balance:{$gte:cost}}` + `$inc` + `recentConsumeRequestIds:{$ne:reqId}` |
| 트랜잭션 경계 | 구독확정·월정석소비·취소롤백 `session.withTransaction` + 미지원 폴백 |
| 금액 검증 | 서버 산정액 ↔ PortOne `amount.total` ↔ storeId/currency 3중 대조 |
| 콘텐츠 잠금 upsert 멱등 | `ContentEntitlement` unique `{userId,profileId,serviceKey,contentKey,scope}` + `findOneAndUpdate upsert` |

## 발견된 결함 및 조치

| # | 심각도 | 위치 | 유형 | 재현 시나리오 | 조치 |
|---|--------|------|------|--------------|------|
| **F1** | High | `payments.js` `handleWebhook` | 부분처리 / 웹훅 재시도 유실 | `Transaction.Paid` 웹훅 → 핸들러가 PortOne 조회 일시실패로 throw 없이 502 반환 → 이벤트가 `processed`로 마킹돼 PortOne 재전송이 duplicate로 영구 무시. 결제는 PAID인데 unlock 미반영(가상계좌·브라우저 이탈 치명) | ✅ 수정 |
| **F2** | High | `payments.js` `reservePortOneWebhookEvent` | 부분처리 / 스톨 | 첫 웹훅이 `processing` 삽입 후 isolate kill → `processing` 잔존. 재전송 시 `failed`가 아니라 재클레임 불가 → 영구 미반영 | ✅ 수정 |
| **F3** | Med-High | `fortune.js` `handlePigCoinConsume` | 부분쓰기 | 원자 차감 성공 후 `PointHistory.create` 직전 종료 → 포인트만 차감·reqId 등록. 재시도 시 차감필터 불일치로 402. 포인트만 잃고 접근 미부여·복구 불가 | ✅ 수정 (아래 ⚠️ 참조) |
| **F4** | Med | `fortune.js` `handlePigCoinConsume` | Race / 이중차감 | `requestId`·`payloadHash` 모두 없이 더블클릭 → `Date.now()` 기반 서로 다른 키 → 둘 다 차감 → 이중 차감 | ✅ 수정 (아래 ⚠️ 참조) |
| **F5** | Med | `payments.js` `handleSubscriptionMonthlyCreditConfirm` | Race / blind overwrite | 월정석 원장 생성 실패 시 `profileSubscription` 서브도큐먼트 전체 치환 롤백 → 동시 변경 소실. 또한 중복 원장(11000)이 정상 지급을 잘못 롤백 | ✅ 수정 |
| **P0** | Med(latent) | `payments.js` `resolveSinglePaymentPricing` | 가격 정합성 | 단건 KRW를 `coinPrice*100` 하드코딩 → 레지스트리 정본 `amountKRW`가 100의 배수가 아니면 반올림 과금돼 다른 결제 경로와 불일치 | ✅ 수정 |

## 적용된 수정

### F1 — 웹훅 성공 응답에서만 `processed` 확정
`handleWebhook`이 핸들러 응답 status를 검사해 **2xx(202 제외)** 일 때만 `markPortOneWebhookEventProcessed`, 그 외에는 `markPortOneWebhookEventFailed`로 남겨 재시도를 유지한다. 202(Accepted=미완료)와 4xx/5xx는 재시도 대상.
- 신규 헬퍼: `isSuccessfulWebhookResponse(response)`

### F2 — stale `processing` 웹훅 이벤트 재클레임
`reservePortOneWebhookEvent`가 duplicate 충돌 시 `failed` 뿐 아니라 **`lastAttemptAt`이 `WEBHOOK_STALE_PROCESSING_MS`(2분) 이상 지난 `processing`** 도 `lastAttemptAt:{$lte:staleCutoff}` 조건을 건 원자적 `findOneAndUpdate`로 재클레임(동시 재전송 중 한 요청만 승리, 진행 중 처리는 이중 반영 안 됨).
- 신규 헬퍼: `isWebhookEventReclaimable(existing, nowMs, staleMs)`, 상수 `WEBHOOK_STALE_PROCESSING_MS`

### F3 — pig-coin 포인트 차감 원자화 (트랜잭션 + 보상 saga)
차감+`PointHistory.create`를 `session.withTransaction`으로 묶고, 트랜잭션 미지원 시 이력 실패하면 `compensateCoinDeduct`로 포인트 원복 + reqId 해제(월정석 경로와 동일 패턴). 로컬 헬퍼 `isTransactionUnsupported` 추가.

### F4 — pig-coin 멱등성 키 결정성
`coinRequestId`의 `Date.now()` 폴백 제거. `requestId` 부재 시 `payloadHash || categoryKey:subFeatureKey:cost`로 **결정적** 스코프를 파생해 동일 요청은 항상 같은 키 → 동시 더블클릭이 `recentConsumeRequestIds` 가드에 수렴(이중 차감 차단).

### F5 — 월정석 원장 실패 롤백 안전화
- 중복 원장(11000): 멱등 재시도로 간주, 롤백 없이 기존 원장 재사용해 정상 완료.
- 그 외 실패: `profileSubscription` 전체 치환 대신 **`expiresAt` 가드**(`User.updateOne({_id, "profileSubscription.expiresAt": expiresAt}, …)`)로 우리 활성이 최신일 때만 스냅샷 복원 → 동시 변경 소실 방지.

### P0 — 단건결제 가격 정본화
`resolveSinglePaymentPricing`가 `coinPrice*100` 대신 **`normalizeKrwAmount(pricing.amountKRW) || calculateKrwAmountFromCoins(coinPrice)`** 로 산정. 레지스트리 정본가를 우선 사용해 100의 배수가 아닌 가격도 정확히 청구, 다른 결제 경로와 일치.

## 단건결제 가격 정합성 판정 (결론)

**PG를 통한 실제 청구액이 서버 산정가와 정확히 일치하며, 불일치 시 콘텐츠가 지급되지 않는다.**

1. 서버가 `featureKey`로 가격 산정 — 클라이언트 조작 불가(`CLIENT_COIN_PRICE_MISMATCH` 가드).
2. 산정가를 주문 `paymentAmount`로 고정 저장(`pricingSnapshot.amountKRW` 동봉).
3. 결제 완료 시 PortOne 단건 조회로 **실제 승인액(`amount.total`) == 저장 산정액** 대조(`AMOUNT_MISMATCH`), storeId·KRW 통화까지 검증. 불일치 시 unlock 차단.
4. P0 수정으로 산정 단계가 레지스트리 정본가를 사용 → 전 경로 동일 금액.

## ⚠️ pig-coin(코인) 경로 현재 상태 — 향후 코인 충전 재도입용 세팅

**현재 유료 결제는 월정석(monthly-credit)이 활성 경로이며, pig-coin/코인 차감 경로(`handlePigCoinConsume` 등)는 사실상 미사용이다.** 코드 곳곳의 `coin`/`points` 참조는 내부 계산·레거시 호환 목적으로 의도적으로 남겨둔 것으로, 지금 제거하지 않는다.

- **F3·F4 수정의 위치づけ**: 두 수정은 코인 경로를 지금 되살리는 것이 아니라, **나중에 "코인 충전(포인트 충전) 방식"을 재도입할 때 곧바로 안전하게 쓸 수 있도록 정합성·멱등성 세팅만 미리 맞춰둔 것**이다.
  - F3: 차감+이력 원자화(트랜잭션/보상) → 재도입 시 부분쓰기로 인한 포인트 유실 없음.
  - F4: 결정적 멱등성 키 → 재도입 시 동시 요청 이중 차감 없음.
- **재도입 시 추가로 필요한 작업(TODO)**:
  1. 포인트 충전(top-up) 결제 흐름 복구 — 현재 `settlePaymentByImpUid`의 `point_charge`/prepaid 경로는 410으로 폐기됨(payments.js). 충전 상품 등록 + PG 결제→포인트 적립 경로 재활성 필요.
  2. `forceDeduct === "COIN"` 게이팅을 UI/정책에서 다시 노출(현재 월정석·원화 단건 우선으로 402 반환).
  3. 코인↔KRW 환산은 `worker/lib/billing-policy.js`(`KRW_PER_COIN`) 단일 정본 유지 — 신규 표시 로직은 하드코딩 금지.
  4. 재도입 전 `verify:payment-concurrency-guards`의 F3·F4 시나리오가 그대로 통과하는지 확인.

## 회귀 방지 테스트

`scripts/verify-payment-concurrency-guards.mjs` (`npm run verify:payment-concurrency-guards`)

1. **동일 웹훅 2회 처리** — processing 재클레임 판정(F2)
2. **웹훅·콜백 실패 응답 재시도 유지** — 2xx(202 제외)만 processed(F1)
3. **트랜잭션 중간 실패 롤백** — 코인 차감 saga 불변식(F3)
4. **단건결제 가격 정합성** — 정본 amountKRW 우선 + PG 승인액 대조 가드(P0)
5. **pig-coin 멱등성 키 결정성** — Date.now() 폴백 제거(F4)
6. **월정석 원장 실패 롤백 안전성** — 11000 멱등 + expiresAt 가드 복원(F5)

기존 `verify:portone-webhook-signature`, `verify:portone-single-payment`, `verify:billing-pass-policy`, `verify:ai-prompt-billing-policy`, `verify:paid-feature-common-flow` 및 `typecheck` 통과 확인.
