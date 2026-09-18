# 01. 현재 결제 구조 — KG이니시스 해외카드 특약 대비

현재 상태: 1단계(C1~C9) 구현 후 레포 실측으로 쓴 사실 정리다. 해외카드 결제는 켜져 있지 않고(`FOREIGN_CARD_ENABLED` 미설정), PG 특약도 처리중이다. 완료 보고가 아니다.

- 측정일: 2026-09-17. `파일:줄` 은 계획 수립 시점(`02cbb5127`)에 잰 값이다. 1단계에서 바뀐 파일은 줄이 밀렸으므로 심볼 이름으로 적는다.
- 시크릿·MID·사업자번호 **값**은 이 폴더 어디에도 적지 않는다. env **이름**과 상수 **위치**만 적는다.
- 관련 문서: [02 해외카드 구현](02-overseas-card-implementation.md) · [05 이행·증빙](05-fulfillment-and-evidence.md) · [08 테스트 결과](08-test-results.md) · 정본 정책 [PAYMENT_AND_ACCESS](../../PAYMENT_AND_ACCESS.md)

## 1. 한눈에

| 축 | 사실 | 근거 |
|---|---|---|
| PG | PortOne V2 REST 를 워커가 직접 호출한다. 카드 채널은 KG이니시스, 간편결제는 카카오페이 채널 | `worker/lib/portone.js` |
| 통화 | 승인·정산 모두 KRW. 확정 시 PortOne 재조회로 통화 KRW 를 대조한다 | `worker/payments/pg.js` `verifyPgPayment` |
| 시크릿 | env 이름만: `PORTONE_API_SECRET`·`PORTONE_CHANNEL_KEY`·`PORTONE_STORE_ID`·`PORTONE_WEBHOOK_SECRET`·`MID`·`INIsignkey`·`INIAPIKEY`·`INIAPI_IV`·`PORTONE_KAKAOPAY_CHANNEL_KEY`. wrangler toml 에 0건(시크릿 주입) → MID 하드코딩 없음 | `worker/lib/portone.js:5-137,296-306,335-423` |
| 결제 API | V2 `worker/payments/`(주문·확정·웹훅·크론). 구 라우터 `worker/routes/billing.js`·`worker/routes/payments.js` 는 라이브지만 성장 상한에 묶여 있다 | `config/payment-freeze.json` `growthCeilings` |
| 스테이징 | `APP_ENV=staging` + `PAYMENT_TEST_AMOUNT_KRW`(1000 이상이면 청구액 치환), 복구 크론 없음 | `worker/lib/portone.js:49,61-73`, `worker/wrangler.staging.toml:332`(`crons = []`) |

## 2. 결제 한 건의 흐름

1. **주문 생성(prepare)** — 로그인 필수(JWT). 서버 상품표가 금액을 정하고, 클라이언트 금액이 다르면 400 `CLIENT_AMOUNT_MISMATCH`. `orderId` 는 `cd` + sha256(userId:idempotencyKey) 38자라 같은 멱등키 재호출은 같은 주문이다(`worker/payments/orders.js` `deriveOrderId`).
   - 단건: `POST /api/payments/prepare`, 이용권(본인·선물): `/subscription/prepare`.
   - 1단계부터 여기서 해외카드 판정(`canUseForeignCard`)을 하고 주문에 스냅숏(`foreignCard`)과 게시 정책 버전(`policyVersions`)을 한 번 박는다 → [02](02-overseas-card-implementation.md), [05](05-fulfillment-and-evidence.md).
2. **결제창(requestPayment)** — 브라우저 SDK. `paymentId = order.merchantUid`, 금액 = `order.paymentAmount`, 통화 KRW.
3. **확정(confirm)** — PortOne 재조회로 paymentId·결제 완료·금액·KRW 를 대조하고, 응답에 storeId 가 있으면 상점도 대조한다(C8). 어긋나면 422 + 주문 FAILED(`failureStage: "pg-verify"`).
4. **지급** — `entitlementGrantedAt` CAS 로 한 번만 지급. 지급이 실패하면 200 `GRANT_PENDING` 을 돌려주고 크론이 재지급한다.
5. **웹훅** — HMAC-SHA256·상수시간 비교·24시간 창·`{provider,eventId}` 유니크. Paid 는 재조회 후 확정.
6. **크론(운영 `*/10`)** — PENDING 30분 만료, 미지급 재지급, 영수증 메일, 1단계부터 미지급·PG 대조 실패 운영자 알림(C7).

## 3. 서버 결제 코어 (에이전트 A 실측)

| 축 | 실측 | 근거 |
|---|---|---|
| 주문 생성·인증 | 전부 JWT: `POST /api/payments/prepare`·`/api/billing/checkout`(→V2)·V2 `/orders`·이용권 prepare·선물 POST. 무인증은 `GET /features`·`/config`·`POST /webhook`·선물 `/preview`·`/context` 뿐. **게스트 주문 경로 없음** | `worker/index.js:1358-1407`, `worker/payments/index.js`(라우트 표 `auth: "required"`), C2 테스트 |
| 금액·통화 | 서버 상품표가 결정, 확정 시 재조회 대조 → 422 + FAILED | `worker/payments/index.js`, `worker/payments/pg.js` |
| customer | 이름이 없으면 "Code Destiny 고객", 이메일 형식 오류면 대체 주소, 전화는 01X 만(그 외 빈 값). 주소·국가 없음 | `worker/payments/index.js` 결제 요청 customer 조립부 |
| DB | V2 는 네이티브 드라이버(`Model.collection.*`)라 mongoose strict 가 필드를 버리지 않는다. `Payment` 에 locale·UA·IP·country 없음. `autoIndex:false` | `worker/payments/db.js` 머리주석, `worker/lib/models.js` Payment 스키마 |
| 상태·지급 | 문서 단위 CAS, PAID→FAILED 불가, 지급 실패 = `GRANT_PENDING` + 크론 재지급(자동환불 없음) | `worker/payments/orders.js`, `worker/payments/reconcile.js` |
| 웹훅 | Failed/Cancelled 는 재조회 없이 반영(범위 밖 결함으로 보고). 분쟁·차지백 이벤트 처리 없음 | `worker/payments/webhook.js` |
| 카드 정보 | V2 는 `rawPortOne` 에 요약만(paymentId·status·amount·currency·payMethod·paidAt·receiptUrl + C8 `storeIdCheck`). 구 경로는 PortOne 원본 전체 저장. 로그는 민감키 제거·ID 뒤 8자 | `worker/payments/pg.js` `summarize`, `worker/payments/log.js` `maskId` |
| 환불 | 관리자 전액·부분(감사로그), PG 콘솔 전액취소 웹훅 → 환불·권한 회수. 셀프 취소는 V2 `paid` 주문에 400 | `worker/routes/admin-orders.js`, `worker/payments/index.js` |
| 알림 | Sentry 없음. 텔레그램은 크론·SNS 실패만(공개 채널 폴백이 있어 결제 알림에 쓰지 않는다). 1단계 C7 이 제보 알림 채널로 결제 알림을 붙였다 | `worker/lib/telegram.js`, `worker/lib/cron-failure-alert.js`, `worker/payments/fulfillment-alert.js` |
| 사기 방지 | V2 prepare·confirm 레이트리밋 없음(구 라우터만 `enforceSensitiveEndpointSecurity`), 반복 실패 탐지 없음 | `worker/lib/security/index.js:413-452` |
| 영수증 | 10분 크론, 한·영 병기, 판매자 정보·KRW·약관 §12·환불 링크. 철회 안내 본문은 한국어만 | `worker/payments/receipt-email.js` |

## 4. 클라이언트 결제 (에이전트 B 실측)

| 축 | 실측 | 근거 |
|---|---|---|
| requestPayment 호출부 | 정적 셸 `index.html` `_cdRunDirectKrwCheckout`(동결 region), App Router 유료 공용 `js/destiny-profile.js`, 이용권·선물 `app/points/PointsClient.tsx`, `lib/payment/portone.ts`(임포터 0, 가드 정본 파일) | `config/payment-freeze.json` |
| 결제수단 | 카드(이니시스)·계좌이체·상품권·카카오페이. MOBILE 꺼짐 | `js/core/checkout-entry.js` 결제수단 표 |
| 복귀·재개 | 단건 = 현재 URL + `portone_redirect=1`, 이용권 = `/points` + `portone_subscription_redirect=1`, 선물 = `/gift/complete?orderId=`. localStorage 재개 티켓 30분 + 서버 암호화 resume context | `js/core/checkout-entry.js`, `worker/payments/resume-context.js` |
| 결제창 고지 | 비한국어 로케일에 원화 승인·환율 고지. 1단계 C1 이 "해외 카드 사용 가능" 단정을 "준비 중" 문구로 바꿨다 | `payment.overseas.chargedInKrw`(12개 사전), `scripts/verify-overseas-payment-notice.mjs` |
| 해외카드 파라미터 | 1단계 C5 부터 서버 판정이 열린 주문에만 `P_RESERVED: ["global_visa3d=Y"]` 를 싣는다(판정 없으면 미전송) | `js/core/checkout-entry.js` `portoneBypass(decision)` |
| 단건 결제창 | 상품·금액·비한국어 해외 고지·제공시점. 2단계에서 하단 정책 링크 줄(이용약관·환불·개인정보·결제 문의, 화면 언어별 URL·새 탭) 추가. 2026-09-18 3차 세션에서 **환불·청약철회 동의 체크박스 추가** — 미동의면 `[data-mode="direct"]` 카드가 진짜 `disabled` 이고, 서버는 주문 문서 `refundConsent`(`source="direct_modal"`)에 남긴다 | `index.html`·`js/destiny-profile.js`·`app/_lib/billing-client.ts` 렌더러 3종, 빌더 `js/core/checkout-entry.js` `buildPaymentPolicyLinksHtml`·`buildRefundConsentCheckboxHtml`·`bindRefundConsentGate` |
| 이용권 모달 | KRW·30일 안내·환불 동의 체크박스 필수. 2단계에서 **서버 기록 추가** — 주문 문서 `refundConsent`(`agreed`·`agreedAt`·`termsVersion`·`source="pass_modal"`). 본문 한국어 하드코딩은 그대로(2단계 ① 잔여) | `app/points/PointsClient.tsx`, 기록 `worker/payments/policy-versions.js` `buildRefundConsentRecord` |

## 5. 동결·상한 (결제 코드 변경 규칙)

- 동결 region: `index.html` 결제 3곳(`_cdChooseServicePaymentMode`·`_cdRunDirectKrwCheckout`·`_cdOpenPaidServiceGate`) + `_dpRenderStandalonePaymentChoice`. 통파일 동결: `app/_lib/billing-client.ts`·`app/hooks/useCoinGate.ts`·`lib/payment/portone.ts`.
- 성장 상한: `worker/routes/billing.js`·`worker/routes/payments.js` — 줄 수가 늘면 실패한다. 1단계는 두 파일을 한 줄도 늘리지 않았다.
- 바꾸면 `node scripts/verify-payment-freeze.mjs --update` 로 매니페스트를 같은 커밋에 갱신한다(C5 가 `_cdRunDirectKrwCheckout` sha 1줄을 갱신).

## 6. 판정

| 항목 | 상태 |
|---|---|
| 결제 구조 사실 정리(서버·클라이언트·동결) | READY |
| 게스트 주문 경로 부재 | READY(C2 테스트로 고정) |
| V2 레이트리밋·반복 실패 탐지 | NOT READY(플래그 ON 선결 조건) |
| 분쟁·차지백 이벤트 처리 | NOT READY |

**최종 판정: READY** — 이 문서는 구조 사실 정리이며 사실 확인이 끝났다. 해외카드 개통 여부는 [02](02-overseas-card-implementation.md)·[09](09-inicis-application-facts.md) 의 판정(PG APPROVAL REQUIRED)을 따른다.
