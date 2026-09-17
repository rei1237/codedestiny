# 05. 이행·증빙 — 결제 후 지급·미이행 감지·주문 기록

현재 상태: 결제 확인 후 지급·재지급·중복 지급 방지는 기존에 있었고, 1단계에서 미이행·PG 대조 실패 운영자 알림(C7), 주문 시점 정책 버전(C6), 해외카드 판정 스냅숏(C4), 상점 대조 결과(C8)를 더했다. vedic·ziwei 생성 실패의 카드 환불은 없고, 알림 채널의 운영 설정은 확인하지 않았다. 완료 보고가 아니다.

- 측정일: 2026-09-17. 줄 번호는 1단계 커밋 후 워크트리 기준이다.
- 관련 문서: [03 상품 범위](03-overseas-card-product-scope.md) · [06 CS·사고 대응](06-customer-support-and-incident-response.md) · [08 테스트 결과](08-test-results.md)

## 1. 결제됨 ≠ 지급됨

| 단계 | 동작 | 근거 |
|---|---|---|
| 확정 | PortOne 재조회로 상태·금액·통화·결제번호(+ 응답에 있으면 상점)를 대조한 뒤 주문을 `paid` 로 바꾼다. 어긋나면 422 + 주문 `failed`(`failureStage:"pg-verify"`) | `worker/payments/pg.js` `verifyPgPayment`, `worker/payments/index.js:731` |
| 지급 | 단건 1회 이용 `grantPurchaseEntitlement`, 영구 열람 `grantEntitlement`+`markUserFeatureUnlocked`, 이용권 30일 활성화. 지급이 끝나면 `entitlementGrantedAt` 이 찍힌다 | `worker/payments/executions.js`, `worker/payments/entitlements.js`, `worker/lib/models.js:364` |
| 미지급 | `status:"paid"` 인데 `entitlementGrantedAt` 이 없으면 "결제됨·미지급"이다 | `worker/payments/reconcile.js` `unfulfilledClause` |
| 재지급 | 10분 크론이 미지급 주문을 다시 지급한다. 실패하면 5분 뒤 재시도, **횟수 제한 없음**. 1단계부터 실패마다 `metadata.fulfillmentAttempts` +1 | `worker/payments/reconcile.js` `regrantUnfulfilledOrders` |
| 중복 방지 | 같은 주문·실행은 한 번만 지급한다(주문 CAS·실행 기록 식별자·선물 1회 수령) | `worker/payments/orders.js`, `worker/payments/executions.js`, `worker/payments/gifts.js` |

- 사용자가 결과를 다시 여는 길: 로그인 후 같은 계정에서 재열람(영구 열람·실행 기록은 계정 귀속).
- 관리자 주문 화면 `/admin/orders` 는 목록·상세 조회, 운영자 환불(전액·부분), 대조 태스크 수동 실행을 제공한다(`app/admin/orders/page.tsx`, `worker/routes/admin-orders.js:153,218,272`).

## 2. 운영자 알림 (C7)

10분 크론 `runPaymentsV2Reconcile` 이 재지급·월정석 정리 뒤, 영수증 메일 앞에서 `alertPaymentAnomalies` 를 부른다(실패해도 앞 결과는 잃지 않는다).

| 구분 | 조건 | 반복 |
|---|---|---|
| A 미지급 | `paid` · 결제 30분+ · 미지급(재지급과 같은 `unfulfilledClause`) | 24시간 간격, 주문당 최대 7회 |
| B PG 대조 실패 | `failed` · `failureStage:"pg-verify"` · 30일 내 · `AMOUNT_MISMATCH`·`CURRENCY_MISMATCH`·`PAYMENT_ID_MISMATCH`·`STORE_ID_MISMATCH` | 주문당 1회 |

- 본문 한 줄 = 주문번호 뒤 8자 · 상품 키 · 유형 · 금액 · 경과 시간 · (A) 재지급 실패 횟수·마지막 오류 코드 / (B) 실패 코드. **userId·이메일·전화·PG 원문은 싣지 않는다.** 1,900자 안에서 섹션당 20건, 넘치면 "(외 N건은 다음 알림)".
- 채널: 운영자 전용 `worker/lib/feedback-notify.js` `notifyOperators` — 관리자 메일(`ADMIN_FEEDBACK_EMAIL`)·Discord·Slack 웹훅(`FEEDBACK_DISCORD_WEBHOOK_URL`·`FEEDBACK_SLACK_WEBHOOK_URL`). 🔴 공개 텔레그램 대화방으로 폴백하는 헬퍼는 import 하지 않는다(테스트가 소스와 fetch 0회로 고정).
- 전달 판정 = "성공이면서 건너뛰지 않은 채널 1개 이상". 발송 5초 상한. 표식(`metadata.fulfillmentAlert`·`metadata.verifyAlert`)은 **전달 성공 후에만** CAS 로 찍는다 → 실패·타임아웃·미설정이면 다음 틱에 다시 보낸다.
- 채널이 하나도 설정돼 있지 않으면 fetch 0회, `[pay-alert] unconfigured` 경고 로그만 남는다.
- 🔴 알림일 뿐이다. 지급·환불을 하지 않는다(자동 환불 신설 없음).
- 운영 설정 여부: 위 env 3종은 env 계약·`worker/wrangler.toml`·시크릿 동기화 목록에 없다. 이름만 확인했고 값은 보지 않았다 → **OWNER INPUT REQUIRED**(D4 채널·수신자 결정과 운영 설정 확인).

## 3. 상품별 생성 실패 처리

| 상품 | 결제 후 생성이 실패하면 | 상태 | 근거 |
|---|---|---|---|
| astrology-ai | 카드 결제 자동 환불 | READY | `worker/routes/astrology-ai.js` `refundCardPaymentOnFailure` |
| vedic-ai | `generation_failed` 저장, 선결제(월정석·이용권)만 복구. **카드 환불 분기 없음**. 같은 요청의 재요청은 409 `GENERATION_FAILED`. 안내 문구는 "차감된 내역이 있다면 자동으로 복구됩니다" | NOT READY | `worker/routes/vedic-ai.js:154,1521,1575-1577` `restorePrepaidAccessOnFailure` |
| ziwei-ai | vedic 과 같은 구조(선결제만 복구, 카드 환불 없음) | NOT READY | `worker/routes/ziwei-ai.js:179,2455,2509-2512` |
| 그 밖 단건 | 구매권 유지 + 같은 requestId 재시도 | READY(재시도) | `worker/payments/executions.js` `USABLE_EXECUTION_STATUSES` |

- vedic·ziwei 는 구매권이 `granted` 로 남아 "지급 완료"로 보이므로 C7 미지급 알림에도 잡히지 않는다. 카드 환불·알림 분기는 옆 세션 vedic 작업과 겹쳐 이번 범위 밖이며, 플래그 ON 선결 조건 6이다([02](02-overseas-card-implementation.md)).

## 4. 주문에 남는 증빙

| 증빙 | 필드 | 성격 | 근거 |
|---|---|---|---|
| 주문번호 | `merchantUid`(= PortOne paymentId = 확정 시 `impUid`) | 식별자 | `worker/payments/orders.js:213`, `worker/payments/pg.js:104,147` |
| 시각 | `createdAt`·`paidAt`·`updatedAt` | 사실 | Payment 스키마 |
| PG 요약 | `rawPortOne` = paymentId·status·amount·currency·payMethod·paidAt·receiptUrl·`storeIdCheck` | 요약본. 구매자 정보(customer)는 담지 않는다 | `worker/payments/orders.js:219`, `worker/payments/pg.js` `summarize` |
| 상점 대조 결과(C8) | `rawPortOne.storeIdCheck` = `"matched"` \| `"absent"` | 결과만. storeId 값은 시크릿 분류라 저장하지 않는다 | `worker/payments/pg.js` `extractStoreId` |
| 해외카드 판정(C4) | `foreignCard` = `{offered, reason, policyVersion, decidedAt}` \| `null` | 주문 시점 서버 판정 | `worker/payments/foreign-card-policy.js` `toForeignCardSnapshot`, `orders.js:161`, `passes.js:132` |
| 정책 버전(C6) | `policyVersions` = `{terms:"2026-04-11", privacy:"2026-08-25"}` | 🔴 주문 시점에 **게시된** 버전. 동의 기록이 아니다 | `worker/payments/policy-versions.js`, `orders.js:163`, `passes.js:134` |
| 가입 동의 | `User.legalConsents` | 가입 때 동의 기록 | `worker/lib/models.js:78` |
| 알림 이력(C7) | `metadata.fulfillmentAlert{lastAlertedAt,count}`·`metadata.verifyAlert{lastAlertedAt}`·`metadata.fulfillmentAttempts` | 운영 기록 | `worker/payments/reconcile.js` |

없는 증빙
- 서버측 환불 동의 기록 없음 — 이용권 모달의 환불 동의 체크박스는 클라이언트에서만 결제 버튼을 잠근다(`app/points/PointsClient.tsx:4867`). 단건 결제창에는 체크박스가 없다. 2단계 과제.
- 결제창에서 본 고지 문구 버전은 저장하지 않는다.

## 5. 카드번호·CVC

- 카드번호·CVC·유효기간을 받거나 저장하는 필드가 없다. 카드 입력은 PortOne·KG이니시스 결제창에서만 일어난다.
  - 근거: `worker/lib/models.js`·`worker/payments/*.js` 에 카드번호·CVC 필드 없음(2026-09-17 `git grep -i "cardnumber\|cvc"` 결과 로그 마스킹 목록 외 0건).
  - 로그 마스킹: `worker/payments/log.js:25` 가 `card`·`cardnumber`·`cardno`·`pan`·`cvc` 키를 가린다.

## 6. 판정

| 항목 | 상태 |
|---|---|
| 결제 확인 후 지급·무제한 재지급·중복 방지 | READY |
| 미이행 30분+·PG 대조 실패 운영자 알림 코드 | READY(C7 테스트) |
| 알림 채널 운영 설정·수신자 | NOT READY(OWNER INPUT REQUIRED) |
| 주문 시점 스냅숏·정책 버전·상점 대조 결과 | READY(C4·C6·C8) |
| 카드번호·CVC 미저장 | READY |
| astrology 생성 실패 카드 환불 | READY |
| vedic·ziwei 생성 실패 카드 환불·알림 | NOT READY |
| 서버측 환불 동의 기록 | NOT READY(2단계) |

**최종 판정: OWNER INPUT REQUIRED** — 감지·기록 코드는 준비됐다. 알림 채널 운영 설정과 수신자 확인, vedic·ziwei 카드 환불 결정이 남아 있다.
