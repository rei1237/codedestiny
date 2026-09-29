---
status: in-progress
updated: 2026-09-30
next: Complete targeted browser checks and main CI; physical-device app return remains unverified.
---

# 영냥이 카카오페이 거래 조사 — 2026-09-30

## 실제 거래 결론

운영 PortOne 콘솔, V2 GET 결제 조회, 운영 MongoDB의 제한된 읽기 전용 조회로 확인했다. 실결제·취소·환불·웹훅 재발송·운영 DB 쓰기·LLM 호출은 실행하지 않았다. 고객 이름·연락처·토큰·상담 본문은 증거 문서에서 제외했다. A/B는 거래번호 끝 8자리만 표시한다.

| 항목 | A: …53e58eb6 | B: …00c0054c |
|---|---|---|
| 상품 | 영냥이 베다 고등어 | 동일 |
| 주문명 | yeongnyangi-checkout | 동일 |
| 주문/통화 | 1,000 KRW | 1,000 KRW |
| PG 조회 버전·환경 | V2 / LIVE / KAKAOPAY | V2 / LIVE / INICIS_V2 |
| CID/MID | …7418 | …6307 |
| PG 요청 (UTC) | 2026-09-29 13:23:12.711 | 13:24:14.184 |
| PG 최종 상태 | FAILED | PAID |
| PG 실패/승인 (UTC) | 13:23:54.963 | 13:24:38.000 |
| 콘솔 표시 | 22:23:54 | 22:24:38 |
| 원본 실패 | pgCode=CANCEL / 사용자가 프로세스를 중단하였습니다. | 없음 |
| 서버 주문 상태 | FAILED / pg_webhook_failed | PAID_VERIFIED |
| 결제 세대 | 0 | 1 |

**분류: PG가 보고한 사용자 중단.** 승인 거절·채널 설정 오류로 분류할 증거는 없다. 이 코드는 사용자가 의도적으로 취소했는지, 앱 전환/복귀 문제가 중단을 유발했는지까지 입증하지 않는다. 단일 사례로 카카오페이 전체 장애나 가격·상품 전략 실패를 판단할 수 없다.

동일 사용자 `userId` 및 동일 `requestId`를 두 주문에서 직접 대조했다. 따라서 **고객 1명, 구매 의도 1개, 서버 주문/결제 시도 2개, 최종 구매 성공 1개**이다. 이름과 시간으로 연결한 것이 아니다. 첫 주문의 콘솔 히스토리에는 22:22:44 카드 요청도 있다. 한 merchant paymentId 아래 PG 트랜잭션이 둘 이상일 수 있으므로 서버 주문 개수를 PG 창 호출 횟수라고 부르면 안 된다.

콘솔의 두 시각은 API UTC 시각에 정확히 9시간을 더한 값이다. **표시값의 UTC+09:00 대응을 검증**했으며, 별도의 콘솔 시간대 설정 메뉴 값은 확인하지 못했다. 서버 기록은 UTC로 비교했다.

PortOne failure 응답에는 reason과 pgCode가 있고 별도의 PortOne 오류 코드 필드는 없었다. 당시 SDK callback 전체는 보존되지 않아 그 code를 PG 코드와 동일하다고 추정하지 않는다. 브라우저 SDK는 코드상 비고정 CDN `https://cdn.portone.io/v2/browser-sdk.js`; 사고 당시 세부 빌드 버전은 미확인이다.

## 모바일·전달 증거

- 콘솔 결제환경 MOBILE. 실패 직후 13:23:57.537Z client_report의 UA를 메모리에서 분류하면 **iOS + KAKAOTALK**이다. 원본 UA와 IP는 공개하지 않는다.
- 실패 웹훅 Transaction.Failed 수신 13:23:55.162Z → processed 13:23:55.267Z, attempts=1, lastError 없음.
- 성공 웹훅 Transaction.Paid 수신 13:24:38.572Z → processed 13:24:38.705Z, attempts=1, lastError 없음.
- B 권한 부여 13:24:38.698Z → 상담에 결제 연결/consume 13:24:44.289Z → **COMPLETED 13:26:37.729Z**.
- 상담 `chapters` 실제 배열 길이 **5**, snapshot manifest 길이 **5**, completedChapters **5**. 결제부터 저장 완료까지 약 **120초**. 저장된 본문은 읽거나 재생성하지 않았다.
- 해당 사용자의 보관함 첫 페이지와 같은 소유자·정렬·상한 조회에서 상담이 포함된다. `worker/routes/yeongnyangi.js` 목록은 이 COMPLETED·paid 행을 제거하지 않는다. 따라서 **저장 완료 및 목록 조회 가능**을 확인했다. 고객 화면 렌더/실제 열람 여부는 미확인이다.
- 콘솔 웹훅 발송 성공과 서버 processed를 교차 확인했다. 당시 HTTP 응답 전문/상태 코드, SDK 요청 전체, redirectUrl 실제 문자열, 앱 전환 이벤트는 보존된 조회 자료에서 확인하지 못했다. DB의 returnPath/paidResume 값도 이번 두 주문에서는 확인되지 않았다. 현재 코드가 올바른 복귀 URL을 구성한다는 사실로 과거 값을 대신하지 않는다.

## 실제 연동 및 확인된 코드 문제

영냥이 `/checkout/` → `runPaidAccessGate` → 공통 정적 결제 런타임을 사용한다. 꿀꿀 운세도 같은 `checkout-entry.js` 수단 표와 PortOne V2 호출부를 사용한다. KAKAOPAY는 `EASY_PAY` + `kakaopayChannelKey`; 이니시스 CARD와 별개이다. 카카오페이에 이니시스 bypass를 넣지 않는다. 공식 V2 문서와 일치하며 SDK 마이그레이션/채널 변경/카카오페이 숨김은 하지 않았다.

수정한 별도 결함(이번 CANCEL의 원인으로 단정하지 않음):

1. 실패 웹훅 재조회에서 `status !== paid`를 실패로 인정해 READY/UNKNOWN도 FAILED로 기록할 수 있었다. 이제 PG FAILED만 적용한다.
2. READY 응답이 PG_PAYMENT_NOT_PAID/422로 영구 실패 기록되는 경로를 확인 중/409 retryable로 바꿨다. PG 실패·PG 취소와 구분하며 원본 주문은 보존한다.
3. 새 영냥이 결제 시도 전에 현재 세대의 PG 상태를 서버에서 조회한다. PAID는 공통 검증/확정으로 복구, READY/UNKNOWN/조회 오류는 새 결제를 막는다. 실패/취소가 확인되면 기존 세대 CAS로 새 고유 주문을 발급한다. SDK 요청 전 실패로 PG 기록 자체가 없는 경우에는 정확한 404 PAYMENT_NOT_FOUND에 한해서 기존 ID를 재사용한다.
4. PG 실패로 닫힌 주문에 지연 승인이 오면 서버 조회·금액·통화·상점/채널 검증 후 확정할 수 있게 했다. 금액 불일치 등 보안 대조 실패 및 환불 상태는 이 예외에 포함하지 않는다.
5. 상담 문서의 `paymentClaimOrderId` CAS로 두 승인이 상담 권한을 두 번 만들지 않게 한다. 추가 승인에는 `metadata.duplicatePaymentReviewRequired`/duplicateOf를 남긴다. 상담 연결도 이 claim을 따른다. 실제 취소·환불은 하지 않는다.
6. 결제 세대 0의 쿼리에서 중복 `$or` 키가 Family 접근 조건을 덮어쓰던 문제를 `$and`로 수정했다.
7. PG 검증 결과에서 provider/outcome/pgCode만 보관해 취소와 실패를 분리한다. 과거 행에 없는 수단을 최초 선택값으로 추정하지 않는다.

결제 상태와 전달 상태는 기존 Payment / YeongnyangiRequest·queue·recovery 분리를 유지한다. 결제 완료 주문 자체가 큐 전송 실패 시 재등록의 근거이며, 결과 읽기와 크론 복구는 저장된 챕터와 기존 재시도 예산을 사용한다. 본 작업은 LLM 예산을 늘리지 않는다.

## 지표와 중복 승인 대응

읽기 전용 `scripts/report-payment-attempts.mjs`는 결제 시도와 uniqueCustomers/purchaseIntents를 구분하고, 수단별 success/failure/cancel/unconfirmed, 재시도 성공, 수단 전환 성공, 미분류 재시도, 두 승인 구매 의도, 운영 검토 표시를 집계한다. 고객 식별자는 출력하지 않는다.

```powershell
node scripts/report-payment-attempts.mjs --db=code_destiny --since=2026-09-29T13:20:00Z --until=2026-09-29T13:30:00Z --env-file=D:/Development/code-destiny/.env.local
```

조회 결과 고객 1 / 구매 의도 1 / 주문 2 / 재시도 성공 1. 과거 DB의 첫 paymentMethod는 card_general이지만, 같은 ID의 뒤 카카오페이 요청을 반영하지 않으므로 PG 수단 집계는 UNKNOWN으로 남긴다. 이 사건의 수단 전환은 위의 실제 PG 조회로 별도 확인했다. SDK 호출 전 주문도 만들어지지 않은 실패는 이 집계에 포함되지 않으며, 0건으로 해석하면 안 된다.

중복 승인 대응 순서: 검토 표시/두 PAID 탐지 → 같은 사용자·상담 연결 및 PG 최신 승인·취소 조회 → 기존 결과 제공 유지 → 담당자의 중복 승인 확인 및 고객 안내 → **별도 승인 후** 취소·환불 절차. 고객에게 재결제를 요구하지 않는다. 자동 취소/환불 경로는 추가하지 않는다.

## 검증 범위 및 미확인

검증 결과는 완료 시 이 절을 갱신한다. mock 통과는 실제 PG/실기기 성공 증거가 아니다.

| 요구 시나리오 | 검사 계층 |
|---|---|
| 카카오 승인 → 결과 | 실제 React + SDK/HTTP mock, Chromium/WebKit |
| 취소/PG 실패 → 카드 | 서버 PG 상태 fixture → 다음 고유 주문, 동일 상담 유지 |
| SDK 요청 전 예외 | 정확한 PG not-found만 기존 ID 복구; 브라우저 SDK 예외 경로는 기존 회귀 검사 |
| 모바일 복귀/새로고침 | 실제 React·공통 런타임 브라우저 mock |
| 웹훅만 수신/지연·중복·역순 | 서명된 라우트 mock 및 queue/recovery 검사 |
| 승인 후 DB/작업 등록 실패 | PG 승인 후 저장 실패 주입 및 기존 queue/recovery 검사 |
| PG timeout → 나중 승인 | pending-confirm 및 payment-intent mock |
| 반복 클릭/동시 요청 | 브라우저 mock + 서버 CAS 검사 |
| 미확정 카카오 → 카드 | payment-intent mock에서 차단 |
| 지연 카카오 + 카드 이중 승인 | 동시 claim 1건, 추가 승인 검토 표시 검사 |
| 기존 루트/언어별 복귀 | legacy-home-target 테스트, 기존 복귀 URL/query/hash 유지 |

남은 확인: iOS Safari/카카오 인앱 실기기의 앱 실행·취소·복귀·세션 소실, Android Chrome 실기기, 배포된 앱 WebView/외부 앱 정책, 실제 PG 테스트 환경 왕복, 운영 승격 후 승인된 실결제 검증. 기존 Android 앱은 웹 PortOne과 Play Billing 정책 경계를 확인해야 하며 웹 mock을 앱 검증으로 대체하지 않는다. 본 사고에서 CSP/팝업 차단 로그가 없으므로 설정 변경의 근거로 삼지 않았다.

## 유지 영역·롤백

가격/상품/이용권/월정석/단건 결제 정책, 인증, 메인 진입점, 포털 연출, 채널/CID, 운영 설정, LLM 호출/예산은 유지했다. 상담 claim 필드만 스키마에 추가하며 운영 마이그레이션은 실행하지 않았다.

롤백은 이 작업 커밋만 `git revert <payment-fix-commit>` 후 main CI로 확인한다. 다른 작업을 reset하지 않는다. 저장된 claim/검토 메타데이터는 지우지 않으며 회계 증거로 보존한다. 이미 발생한 중복 승인은 코드 롤백으로 해소되지 않는다. 운영 승격은 별도 승인 범위이다.

## 공식 문서

- [PortOne V2 카카오페이](https://developers.portone.io/docs/ko/v2-payment/pg/kakaopay)
- [V2 결제 요청](https://developers.portone.io/sdk/ko/v2-sdk/payment-request)
- [V2 웹훅: 서명 및 결제 재조회](https://developers.portone.io/opi/ko/integration/webhook/readme-v2)
- [V2 결제 조회 API](https://developers.portone.io/api/rest-v2/payment)

문서 확인일: 2026-09-30. 카카오페이는 EASY_PAY, 모바일 REDIRECTION을 사용한다. 프런트 callback이나 웹훅 payload만으로 권한을 부여하지 않는다.
