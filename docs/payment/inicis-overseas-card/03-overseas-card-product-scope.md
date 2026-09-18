# 03. 해외카드 상품 범위 — 대상 유형·가격·제공기간

현재 상태: 해외카드 대상 유형은 서버 정책 표(`FOREIGN_CARD_PRODUCT_POLICY`)로 정했고, 가격·제공기간은 레포 상품표에서 잰 값이다. 플래그가 꺼져 있어 지금 해외카드로 팔리는 상품은 없다. 판매 가중 평균은 운영 주문을 열람하지 않아 산출하지 않았다. 완료 보고가 아니다.

- 측정일: 2026-09-17. 가격은 워크트리에서 레지스트리를 import 해 node 로 집계했다([08](08-test-results.md) 에 명령·출력).
- 관련 문서: [02 해외카드 구현](02-overseas-card-implementation.md) · [05 이행·증빙](05-fulfillment-and-evidence.md) · [09 신청 사실](09-inicis-application-facts.md)

## 1. 파는 것 — 전부 디지털 콘텐츠

| 유형(정책 키) | 무엇 | 해외카드 대상 | 근거 |
|---|---|---|---|
| `digital_content` | 운세·상담 결과 단건 171개 = 1회 이용 `per_use` 124개 + 계정 귀속 영구 열람 `unlock` 47개(`getPaidFeatureBillingType` 기준). 영냥이 28개(카드 단건 전용 `direct_only`)는 1회 이용 124개에 포함된다 | 대상(플래그 ON 시) | `worker/lib/paid-feature-registry.js` `getPaidFeatureBillingType`·`YEONGNYANGI_PAID_FEATURE_KEYS`, `worker/lib/billing-feature-registry.js` `listBillingFeatures` |
| `membership_pass` | 달빛 이용권 4등급, 본인 구매, **30일 고정**, 자동갱신 없음 | 대상(30일만) | `lib/payment/pass-pricing.js` `PASS_MONTHLY_WON`, `worker/payments/passes.js` `resolvePassPlan` |
| `membership_pass_gift` | 이용권 4등급을 선물로 구매(수령 링크) | 대상(30일만) | `worker/payments/index.js` `handlePassPrepare` GIFT 분기, `lib/payment/gift-policy.js` |
| 그 밖 | 표에 없는 유형은 전부 `PRODUCT_NOT_ELIGIBLE` | 불가 | `worker/payments/foreign-card-policy.js` |

- 월정석은 카드로 파는 상품이 아니라 서비스 이용 시 차감하는 결제수단이다. 이용권도 월정석으로는 살 수 없다(`SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED`).
- 음원 트랙 열람(₩1,000, `lib/music-access-policy.js` `MUSIC_TRACK_UNLOCK_PRICE_KRW`)은 아래 171개 상품표 밖이다. 최저가(₩1,000)와 같아 통계의 최저·최고는 바뀌지 않는다.
- 🔴 선물은 **선불·양도 가능 상품**이다(결제자와 이용자가 다를 수 있음). PG 위험 요인으로 숨기지 않고 신청서에 그대로 적는다(D3). **2026-09-18 오너 확인: 선물을 해외카드 대상에 포함하기로 확정** — 정책 표 기본값(대상)을 그대로 유지한다. `GIFTS_ENABLED`(문자열 `"1"` 일 때만 신규 구매 허용, 지금은 꺼짐) 자체의 운영 전환은 이 결정과 별개이며, [02](02-overseas-card-implementation.md) §7 체크리스트에 따라 특약 승인 후 플래그를 켜는 시점에 진행한다.
- 한 줄 끄기: 정책 표의 한 줄을 `false` 로 바꾸면 그 유형만 해외카드 대상에서 빠진다(예: 선물 제외).

## 2. 실물·배송

| 항목 | 상태 | 근거 |
|---|---|---|
| 실물 상품 | 없음 | 상품표 전부 디지털 콘텐츠·이용권 |
| 해외배송 | 해당 없음 — 배송할 물건이 없다 | 주문 문서에 주소·배송 필드 없음(`worker/lib/models.js` Payment 스키마, 결제 요청 customer 에 주소 없음) |
| 배송추적 | 해당 없음 — 같은 이유 | 위와 같음 |

배송 필드는 만들지 않는다(원 요청 절대 금지 6).

## 3. 가격 (KRW, 승인·정산 모두 원화)

단건 상품표 171개(`listBillingFeatures().legacyFeatureTable`, 이용권 제외)

| 통계 | 값 |
|---|---|
| 개수 | 171 |
| 최저 | ₩1,000 |
| 최고 | ₩30,000 |
| 중앙값 | ₩5,000 |
| 단순 평균 | ₩9,392 |
| 판매 가중 평균 | **산출 불가** — 운영 주문 데이터를 열람하지 않았다(운영 DB 접근 금지) |

가격대 분포

| 가격 | 개수 |
|---|---|
| ₩1,000 | 6 |
| ₩3,000 | 26 |
| ₩5,000 | 63 |
| ₩7,000 | 1 |
| ₩10,000 | 47 |
| ₩20,000 | 11 |
| ₩30,000 | 17 |

이용권 4등급(`PASS_MONTHLY_WON`, 30일)

| 등급 | 가격 |
|---|---|
| standard | ₩9,900 |
| premium | ₩29,900 |
| vvip | ₩59,000 |
| family | ₩149,000 |

단건 + 이용권 175개: 최저 ₩1,000 · 최고 ₩149,000 · 중앙값 ₩5,000 · 단순 평균 ₩10,593. 선물은 이용권과 같은 가격이다.

- 클라이언트 가격은 믿지 않는다. 서버 상품표가 금액을 정하고, 요청 금액이 다르면 400 `CLIENT_AMOUNT_MISMATCH`, 확정 시 PortOne 재조회 금액·KRW 가 다르면 422 + 주문 FAILED 다([01](01-current-payment-architecture.md)).
- 스테이징은 `PAYMENT_TEST_AMOUNT_KRW` 로 청구액을 치환하므로 스테이징 결제 금액을 가격 근거로 쓰지 않는다.

## 4. 제공기간

| 상품 | 제공 시점·기간 | 근거 |
|---|---|---|
| 단건(per_use) | 결제 확인 후 즉시 지급, 이어서 결과 생성. 초 단위 보장은 없다. 결과는 로그인 후 계정에서 다시 열람 | `worker/payments/executions.js` `grantPurchaseEntitlement` |
| 단건(unlock) | 결제 확인 후 즉시 계정에 영구 열람 권한 | `worker/payments/entitlements.js` `grantEntitlement`·`markUserFeatureUnlocked` |
| 이용권 | 결제 확인 후 30일. 재구매하면 만료일을 연장한다. 자동갱신 없음 | `worker/payments/passes.js` |
| 선물 | 수령 기한 = 결제 시각 + 1년(말일 보정). 수령 후 이용권 30일 | `worker/payments/gifts.js` `giftExpiry` |

- 지급 실패는 "결제됨·미지급"으로 남고 크론이 재지급하며, 1단계부터 30분이 지나면 운영자에게 알린다([05](05-fulfillment-and-evidence.md)).

## 5. 판정

| 항목 | 상태 |
|---|---|
| 해외카드 대상 유형 서버 표 | READY |
| 실물·배송 없음 | READY |
| 가격 최저·최고·중앙·단순 평균 | READY |
| 판매 가중 평균 | NOT READY(운영 데이터 필요) |
| 선물의 해외카드 대상 포함 여부 | READY(2026-09-18 오너 확인 — 포함) |

**최종 판정: READY** — 상품·가격·기간 사실이 확정됐고, 선물을 해외카드 대상에 포함하기로 2026-09-18 오너가 확정했다. `GIFTS_ENABLED` 운영 전환 자체는 특약 승인 후 플래그 ON 시점([02](02-overseas-card-implementation.md) §7)으로 남는다.
