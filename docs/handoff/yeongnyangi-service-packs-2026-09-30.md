---
status: active
implementationStatus: approved-catalog-implemented
updated: 2026-09-30
next: 승인된 판매 정책의 회귀 검사와 main CI를 확인한다.
---

# 영냥이 전용 횟수 이용권·선물

> 아래 빈 판매목록 기록은 이전 구현 당시의 이력이다. 2026-09-30 후속 사용자 승인으로 12개 상품을 등록했다. 최신 가격·횟수는 payment-gating 문서의 2026-09-30 승인 절과 SERVICE_PACK_PLANS를 따른다.

## 현재 상태

사용자가 “빈 판매목록으로 구매·선물 코드 적용 승인” 및 “이용권은 오직 단건 결제를 통해서만 구매 가능하도록해야해”를 명시했다. 이에 구매·보유·상담 소비·실패 복원·기존 선물 연동 코드를 적용했다. 상품 판매 가격·회수·기간은 아직 확정하지 않았으며 SERVICE_PACK_PLANS는 빈 객체다. 과거 검토 문서의 가격 후보는 운영 승인값이 아니다.

코드 적용 승인은 이미 받았고 전용 세트 서버 구현은 커밋했다. 현재 상태는 **구현 완료·판매 비활성(implemented-sales-disabled)**이며, 새 팩 통합 코드의 main CI는 통과했다. 이 문서는 전달 검증을 대체하지 않는다. 실 PG·운영 DB·환불 실행·LLM·배포는 이 기술 적용에서 수행하지 않았다.

- 기존 월정석·이미지 변경 기준: 38ebd153baf1eff3af7976581934fd0de1a8cc0b. [CI 실행 36683071504](https://github.com/rei1237/codedestiny/actions/runs/36683071504)는 해당 SHA의 completed/success이며 CI required도 success다. 이 성공을 새 팩 변경의 CI 성공으로 확대하지 않는다.
- 새 세트 서버: f9583c2b6705ec5906998bdd143c969eec564d2c (feat: add direct-purchase fish passes and atomic gifting with sales closed).
- 새 경로·인증 테스트: c1fbd8f8071033531d345021fd372ca6ca6304af (test: declare service pack routes and authentication requirements), 해당 suite 76/76 PASS.
- 첫 통합 전달 093f01962b99e7e336a41fdac0017fd6742037ab의 CI 36685868126은 변경 파일 린트에서 서버 helper `useId`를 React Hook으로 판단해 실패했다. 증빙 ID 산식은 유지하고 이름만 `packUseEvidenceId`로 바로잡았다. 동일 38파일 변경 린트와 관련 Jest 2 suites / 42 tests가 통과했으며, 보완 커밋 5c5fbacb8216c10545da6daeee4b06aa730b7f42의 최종 CI 성공을 아래에 기록했다.
- 동일 주문 재개 UI: 9600c7974b50f556b13f1beb8497cac1a63775a0 커밋이 존재한다. 원주문 ID 대조 보완 f866fe7db와 함께 main에 전달했다.

## 실제 구현

- 정본: worker/payments/service-pack-policy.js. 빈 상품은 주문 쓰기 전에 PRODUCT_NOT_FOUND로 거절한다.
- 회계: worker/payments/service-packs.js와 purchase-entitlement-model.js. 일반 profileSubscription과 독립된 계정별 PurchaseEntitlement에 총/잔여 횟수·구매 스냅샷·개별 만료일을 보유한다.
- 적용: 해당 생선 등급의 사주·자미두수·숙요점·베다점·서양 점성술·타로 6개 체계에서 상담 한 건당 1회를 차감한다. 다른 생선과 융합 상담은 제외한다.
- 구매: SELF/GIFT 모두 기존 normalizePurchasePaymentMethod가 pg로 판정한 단건 결제수단만 허용한다. HTTP prepare와 내부 주문 생성 모두 같은 정본을 사용한다. 클라이언트 가격·회수·무료 권리 주장은 지급 근거가 아니다.
- 기존 상담의 월정석 사용과 Family 권리는 유지한다. 월정석/기존 이용권을 새 세트 구매에 사용하지 않는다. 일반 Standard/Premium/VVIP를 영냥이 공용 예산으로 전환하는 폐기안은 적용하지 않았다.
- 소비: 같은 상담의 PG·Family·월정석과 공유하는 결제 예약 CAS, 1회 차감, 영구 증빙, 요청 PAID 연결을 한 트랜잭션에서 처리한다.
- 재개/조회/이미 처리한 요청 재전송은 무차감이다. 원주문 보류·취소 또는 원래 증빙 훼손은 SELF 권리의 사용/조회/생성 lease/결과 커밋을 막는다.
- 실패: 기존 terminal failure의 결과 0건·저장 draft 없음·활성 lease 없음일 때만 1회 복원한다. 요청/횟수/원증빙/복원 증빙을 함께 커밋한다. PG 현금 환급·부분 사용분 환급 산식·만료 연장을 새로 만들지 않았다.
- API: /api/payments/service-packs의 catalog, wallet, quote, prepare, consume 및 orders/:id/confirm·status. confirm/status는 기존 PG 검증을 재사용한다.
- UI 연결 위치: app/components/service-packs/, app/points/PointsClient.tsx, app/checkout/CheckoutClient.tsx, app/gift/ServicePackGiftDetails.tsx 및 기존 선물 페이지. 가격/회수/만료를 임의로 하드코딩하지 않고 서버 응답을 사용한다.

## 기존 선물 정책과 구별

- 기존 Gift/GiftGrant/GiftClaimContext, 링크·선물함·수락 API를 사용한다. 새 선물 시스템은 없다.
- 구매 승인 시 Gift PAID만 생성하고 구매자 팩 권리는 지급하지 않는다. 구매자의 Payment.userId는 그대로다.
- 기존 결제 후 1년 수락 기한과 본인 수락 허용을 유지한다. 승인될 상품 validityDays의 사용기간은 수락 시점부터 시작한다.
- Payment의 직렬화 쓰기, Gift CLAIMED CAS, 수락자 권리, GiftGrant는 동일한 기존 수락 트랜잭션에 묶는다. 중첩 트랜잭션을 열지 않는다.
- 수락 응답 유실/같은 계정 동시 수락은 같은 권리의 실제 잔여 횟수를 재열람한다. 다른 계정의 재수락은 거절한다.
- 팩은 일반 이용권과 독립이므로 다른 일반 이용권 등급 보유를 이유로 수락을 막지 않는다. 일반 이용권 선물의 동일 등급 연장·다른 활성 등급 대기는 그대로다.
- 수락 전 환급 보류·전액/부분 취소는 수락을 막는다. **CLAIMED 후 PG 취소는 기존 선물 정책대로 수락자 권리를 자동 회수하지 않고 운영 검토로 남긴다.** 예외는 검증된 Gift·GiftGrant·수락자 권리·원구매자 주문·상품 스냅샷 연결에만 적용한다.
- 기존 GIFTS_ENABLED, 앱 제한, 필수 unique index 및 구매/HTTP confirm의 Origin 보호를 재사용한다. 내부 webhook·reconcile에는 브라우저 Origin을 요구하지 않는다.
- 선물 수락은 구매가 아니므로 월정석이나 다른 잔액을 추가 차감하지 않는다.

## PENDING 주문과 결제창 닫힘

createServicePackOrder는 동일한 멱등키의 기존 PENDING/PAID 주문을 재사용하며, 기존 일반 createPayableOrder의 자동 새 세대 주문 정책으로 우회하지 않는다. 확인 응답이 유실되거나 결제창을 닫았다는 클라이언트 신호만으로 새 주문·멱등키를 자동 생성하지 않는다.

현재 소스의 resumePendingPackPurchase와 ServicePacks UI는 사용자가 다시 동의하고 명시적으로 재개를 눌렀을 때만 동작한다. 계정·보관된 주문·구매 스냅샷을 확인한 뒤 기존 주문을 서버 confirm으로 먼저 재확인한다. 이미 결제·지급이 끝났으면 SDK를 열지 않고 SELF는 복구 완료, GIFT는 기존 선물 완료 화면으로 이동한다.

서버가 PG_PAYMENT_NOT_PAID를 반환한 경우에만 현재 catalog와 기존 스냅샷의 일치를 확인하고, 같은 멱등키로 prepare한다. 반환 주문 ID도 기존 ID와 같아야 SDK를 연다. prepare 사이에 PAID로 바뀌어도 SDK를 열지 않는다. 응답 유실·서버 장애·확정 실패/취소·계정 변경·스냅샷 변경·새 동의 없음에서는 SDK를 열거나 새 주문을 자동 생성하지 않는다. 서버 confirm 역시 PG_PAYMENT_NOT_PAID에서는 PENDING을 실패로 바꾸지 않는다. 재개 prepare에는 기존 주문 ID를 expectedOrderId로 보낸다. 서버는 계정과 기존 멱등키에서 deriveOrderId(userId, "service-pack:"+key)로 계산한 ID를 expectedOrderId와 **주문 upsert 전에** 대조한다. 잘못된 ID·손상된 키·다른 계정이면 ORDER_NOT_CONFIRMABLE로 거절하여 새 PENDING 행도 만들지 않는다. 일반 신규 구매는 expectedOrderId를 생략한다.

신규 __tests__/ui/service-pack-pending-resume.behavior.test.mjs의 22개 시나리오가 동일 주문/동의/응답 유실/기결제 SDK 0회/스냅샷·계정 경계를 검사한다. 실제 PG 창 닫힘, 지연 승인, 모바일 복귀를 포함한 실결제 종단 검증은 하지 않았다. 판매 활성화 전 후속 검증이 필요하며, 유료 검증에는 별도 승인이 필요하다.

## 검증

적용 전 검토본: 25파일, 메모리 mock 74/74 PASS, 4진입점 compile-only bundle PASS, 독립 감사의 HTTP Origin 반례 2/2 PASS. 이는 실제 Mongo/PG 검증이 아니다.

실제 소스 적용 후 targeted Jest:

- 11 suites / 271 tests PASS (7.341초).
- 신규 세트/선물 74개에 PG 전용 구매 17개를 추가하여 신규 91개 PASS.
- PG 전용 검사: SELF/GIFT 각각 13종 비PG 수단 거절, 4종 PG 수단 허용, 기존 이용권/월정석 보존, 서버 금액 사용.
- 기존 월정석·Family 환급·결제 증빙·동시성·응답 유실 회귀 포함.
- 초기 actual Jest에서 외부 VM realm의 Date를 fake DB가 빈 객체로 복제한 fixture 결함을 고쳤다. 날짜 태그로 복제하며 회귀 1개를 추가했다. 런타임 가드/정책/검사 상한은 완화하지 않았다.
- 후속 상품 ID 접두사 회귀: orders.js는 실제 service_pack 타입을 기준으로 선물 스냅샷을 저장한다. 비접두사 fixture의 HTTP prepare → PG 응답 주입 confirm → 수락 검사 추가 후 관련 2 suites / 87 tests PASS (2.321초). 신규 세트 검사는 총 92개다.
- git diff --check PASS.
- 경로 계약 suite: 새 7개 API·공개 catalog·나머지 6개 인증 필수 조건을 반영한 뒤 76/76 PASS (1.367초). runtime 변경 없이 기존 정확한 목록을 갱신했다.
- 동일 주문 재개 UI 테스트 22/22 PASS (349.19ms, UI 담당 실행). 새 구매 필드 생략·원주문 ID 전달·키 손상 시 SDK 0회를 포함한다. 명령: node --test __tests__/ui/service-pack-pending-resume.behavior.test.mjs.
- 원주문 대조 서버 회귀 4개 추가 후 관련 3 suites / 167 tests PASS (5.316초). SELF/GIFT 모두 잘못된 ID·키 손상·다른 계정의 Payment upsert 호출 0회/신규 주문 0건, 정상 동일 주문 재사용을 확인했다. 신규 세트 검사는 총 96개다.
- 부모 통합 로컬 검사: 첫 check:fast에서 Jest 324 suites 중 323개가 통과했고, 새 경로 목록 2개 단언이 실패했다. 수정 후 해당 suite 76/76 PASS를 확인했으며 이어 남은 typecheck·Node 2,111개 검사·Worker build·guards가 통과했다. **전체 check:fast를 다시 실행해 성공한 결과는 아니다.**
- 최종 코드 5c5fbacb8216c10545da6daeee4b06aa730b7f42의 [CI 36686426683](https://github.com/rei1237/codedestiny/actions/runs/36686426683)이 completed/success다. Typecheck and lint, Build Pages and Worker, Critical checks, Static guards, CI required가 모두 success이며 CI required job은 109797216127이다. 같은 SHA의 paid-flow-gates와 replica-transactions도 success다. 이는 실제 PG·운영 DB·LLM·운영 배포 검증을 대신하지 않는다.

명령:

~~~powershell
node scripts/run-mock-tests.mjs jest --runTestsByPath __tests__/worker/yeongnyangi-service-packs.test.js __tests__/worker/yeongnyangi-service-pack-repository.test.js __tests__/worker/yeongnyangi-service-pack-gifts.test.js __tests__/worker/payments-v2.moonstone.test.js __tests__/worker/yeongnyangi-payment-intent.test.js __tests__/worker/yeongnyangi-moonstone-funding.test.js __tests__/worker/yeongnyangi-moonstone-refund-repository.test.js __tests__/worker/per-use-proof-roundtrip.test.js __tests__/worker/pass-consumption.refund.test.js __tests__/worker/service-execution-pass-quota-refund.test.js __tests__/worker/fake-payment-db.transaction.test.js --runInBand
~~~

## 판매 정책과 후속 원가

빈 판매목록을 유지한다. 최종 가격·회수·사용기간, 월 고정 서버비와 판매량/가입 혜택을 반영한 이익률이 아직 승인된 판매 정본으로 확정되지 않았다. 기존 고등어 실측 자료와 상한 추정은 구분해야 하며, 이번 기술 적용에서 추가 유료 원가 측정을 수행하지 않았다. 상위 생선 원가 및 후속 가격안의 실제 비용을 측정 완료로 표현하지 않는다.

기술 테스트의 fixture 가격·회수·90일은 판매 정책이 아니다. 예전 가격 후보를 복사해 catalog를 채우거나 판매 버튼을 활성화하지 않는다. 부분 사용 후 환불액·운영 정산 조건을 새로 정하지 않았으며, 기존 승인된 선물 취소 정책을 유지한다.

## 재개 정보

- 작업 디렉터리: D:\Development\code-destiny
- 문서: D:\Development\code-destiny\docs\handoff\yeongnyangi-service-packs-2026-09-30.md
- 마지막 검증 코드 커밋: 5c5fbacb8216c10545da6daeee4b06aa730b7f42
- 다음 행동: 빈 판매목록을 유지하면서 별도 원가/판매 정책 확정 작업을 진행한다. 기존 후보 가격을 판매 정본에 자동 적용하지 않는다.

~~~text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\yeongnyangi-service-packs-2026-09-30.md를 읽고, git status와 마지막 기준 커밋 5c5fbacb8216c10545da6daeee4b06aa730b7f42 및 이후 커밋을 확인한 뒤 빈 판매목록을 유지한 원가·가격·회수·기간 검토부터 이어서 진행하라. 다른 세션의 변경을 보존하고 판매 catalog는 비워 둬라.
~~~

