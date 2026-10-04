# 영냥이 최종 복구 실패 자동 환불

2026-10-05 사용자가 ‘재시도 복구도 안되면 환불’로 변경을 승인했다. 실제 PG 취소·운영 DB 정산·배포는 실행하지 않았다.

## 확인한 기존 결함과 변경

- 기존 자동 복원은 `completedChapters:0`에만 적용됐다. 부분 결과가 있으면 최종 실패해도 환불되지 않았다. 카드 결제의 생성 최종 실패는 자동 PG 취소로 연결되지 않았다.
- 최초 생성 2회, 기존 서버 복구 1회와 남아 있는 제한된 hold 복구를 사용한다. hold 복구는 구매자의 클릭을 기다리지 않고 기존 크론이 자동 실행한다. 기존 시도 카운터를 초기화하거나 무제한 재시도하지 않는다.
- 현재 ordinal의 검증된 저장 초안이 있으면 저장 복구를 우선한다. 이전 ordinal의 초안은 최종 실패 환불을 막지 않는다. 저장 초안을 재사용하는 경로는 생성 시도 카운터를 늘리지 않는다.
- 전체 배열이 저장돼도 최종 품질·질문 답변 저장 검증을 통과하지 못한 결과는 완료로 간주하지 않는다. `COMPLETED`, 활성 lease, 현재 저장 초안, 남은 복구 기회는 자동 환불 대상이 아니다.
- 환불 예약은 소유자·상품·원 결제·`metadata.consumedBy`를 검증하고 Request와 Payment를 같은 transaction에서 고정한다. `generationCheckpoint.deliveryRefund.status=pending`, `DELIVERY_REFUND_PENDING`을 사용하며 새 결제나 생성은 요구하지 않는다.
- 오래된 생성 claim/reconcile이 환불 예약을 덮을 수 있는 경합을 찾았다. 사전 검사와 실제 CAS 모두 marker guard를 적용했다. 완료·큐·retry·조회 heartbeat도 예약된 주문을 생성하지 않는다.
- 이용권 quota, 사용 증빙, Request, 환불 receipt는 같은 transaction에서 복원한다. 월정석과 서비스 이용 횟수도 원 증빙·기존 receipt로 정확히 한 번 복원한다. 저장 챕터는 삭제하지 않는다.
- 카드 단건 결제는 성공 응답을 검사하는 기존 `refundPaymentAsOperator`와 결제별 안정적인 PG idempotency key를 사용한다. 결제사 실패·pending·응답 유실은 환불 완료로 표시하지 않는다. 이미 취소된 결제의 재시도는 PG를 중복 취소하지 않는다.
- 기존 복구 크론에서 provider/queue와 독립적으로 환불을 재시도한다. PG 호출은 한 tick 최대 3건이고, 실패 건은 지수 backoff로 재조회한다. 다른 보류 결과가 pending 환불을 가리지 않도록 두 범위를 별도 조회한다.

## 범위와 보존

`yeongnyangi-*`의 `DIRECT_KRW`, `FAMILY`, `MOONLIGHT_STONE`, `SERVICE_PACK` 및 과거 paymentId 연결 단건 상담에 적용한다. 꿀꿀 운세의 별도 연이·네오 `PER_USE` 대화 상품, 선물·구독 구매 자체·가격·소비 비용은 변경하지 않는다. 기존 환불 후 결과 접근 차단 정책을 유지한다.

데이터 이동 마이그레이션은 없다. 새 marker는 기존 Mixed checkpoint에 저장한다. 남아 있는 과거 최종 실패도 기존 크론에서 소유권·복구 가능 여부를 다시 판정한다. TTL로 삭제된 주문에는 적용할 수 없다.

운영 환경에 코드를 반영한 후에만 새 크론 동작이 시작된다. 결제사·DB 장애나 만료된 이용권 cycle의 증빙 불일치는 환불 확인 중으로 보존하며 성공을 지어내지 않는다. 실제 운영 정산·결제사 응답과 크론 실행 증거는 별도 확인이 필요하다.

## 검증

신규 terminal refund, 월정석·서비스팩 repository, quota refund, recovery, 통합 기록/최애 저장 mock 7개 suite 89개 PASS. 현금 실패·응답 유실·중복 정산·단건 결제 할인 월정석 복원·웹훅 선확정 후 정산 재시도, 소유자/결제 연결, 현재/과거 초안, 최종 복구 선행, 월정석·서비스팩·family quota 복원, stale claim/reconcile 경합을 검증했다. 독립 기술 검토의 P1 경합 2건을 수정하고 해당 경합 테스트를 추가했다.

실행 명령: `npm run test:jest -- --runInBand --runTestsByPath __tests__/worker/yeongnyangi-terminal-refund.test.js __tests__/worker/yeongnyangi-moonstone-refund-repository.test.js __tests__/worker/yeongnyangi-service-pack-repository.test.js __tests__/worker/yeongnyangi-recovery.test.js __tests__/worker/pass-consumption.refund.test.js __tests__/worker/record-library.test.js __tests__/worker/destiny-bias-record-storage.test.js`

실 PG·실 LLM·운영 DB 호출은 없었다. 공식 check:fast 및 main CI의 최종 결과는 작업 종료 보고에서 확인한다.
