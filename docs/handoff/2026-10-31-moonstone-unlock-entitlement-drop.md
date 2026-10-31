---
status: active
updated: 2026-10-31
next: "RED 착수 승인 → 운영 읽기 전용 피해 점검(0단계) → 설계 함정 1·3 결정 → 실패 테스트 먼저"
---

# 월정석 해금 경로: 차감 결과를 모르는 오류에도 권한을 지운다

색인: [2026-10-31-infra-followups-index.md](2026-10-31-infra-followups-index.md) (1순위)
출처: 인프라 최적화 브랜치 최종 리뷰 Important A. 이 브랜치 범위(Task 7, 이용권 해금)에서 같은 모양의 결함을 고치다 드러났고, 월정석 경로는 승인 범위 밖이라 고치지 않았다.

## 요약

- 대상: `POST /coin-gate/moonstone`의 **영구 해금형 상품**(`billingType !== "per_use"`). 회당 상품은 지급이 없어 해당 없음.
- 순서: 지급(`grantEntitlement`) → 차감(`spendMoonstone`) → 해금 목록(`markUserFeatureUnlocked`).
- 결함: `spendMoonstone`이 던지는 **모든** 오류에서 방금 만든 지급을 지운다. lot 차감이 이미 커밋된 뒤의 오류도 마찬가지다. 해당 오류는 정산 `updateOne` 실패, 소켓 7초 타임아웃, 응답 유실, `finishSpend` 예외다.
- 결과: 잔액은 빠졌는데 해금이 없다. 재시도 창 안에서는 409만 받는다. 새 requestId로 다시 사면 이중 과금이다.
- 부수 결함: 잔액 부족처럼 차감이 없었던 오류에서도 문제가 된다. 지급이 환불(REFUNDED) 행을 되살린 것이었으면 그 행이 **삭제**된다. 이는 전역 제약 "결제 내역을 삭제하거나 덮어쓰지 마라" 위반이고, Task 7에서 고친 것(이용권 경로 Ruling)과 같은 위반이다.
- 분류: **RED**(결제·권한). 운영 배포 전에 처리할 첫 결제 후속이다. 착수 전에 위험·검증·롤백을 먼저 보고하고 사용자 승인을 받는다. 이번 세션의 승인은 Task 3·7까지였고, 이 수정은 포함되지 않는다.

## 시작 조건

- 코드 기준: Task 7 커밋(`ec84c5805` 단일 트랜잭션, `ac1745c3c` CAS 패배 abort, `301e20800` 재시도 테스트)이 들어간 트리에서 시작한다. 이 커밋들은 `wt/infra-deploy-20261031-190620`에만 있다(HEAD `794eca3de`, 2026-10-31 21:30 기준 미push).
  - `git log origin/main --oneline | grep "이용권 해금 CAS 패배"`로 반영 여부를 확인한다.
  - 반영됐으면: `powershell -File scripts/create-safe-worktree.ps1 -Slug moonstone-unlock -Base origin/main`
  - 아직이면: 같은 명령에 `-Base wt/infra-deploy-20261031-190620`
- 공정: superpowers:brainstorming(설계 함정 결정) → writing-plans → TDD. RED이므로 계획 승인 전에는 코드를 바꾸지 않는다.

## 코드 위치

줄 번호는 배포 트리 `794eca3de` 기준이다. 줄이 밀렸으면 따옴표 안의 문자열로 다시 찾는다.

| 위치 | 내용 |
|---|---|
| `worker/payments/index.js:1599` `"POST /coin-gate/moonstone"` | 컷오버 어댑터. 머리 주석(:1590-1598)에 오류 계약이 있다 |
| `worker/payments/index.js:1640-1650` | `if (unlock) grantEntitlement(... source: "MONTHLY")`. `alreadyOwned`이면 차감 없이 재열람으로 반환 |
| `worker/payments/index.js:1651-1664` | **결함 지점**: `try { spendMoonstone } catch { if (grantedIdentity) dropEntitlementByIdentity; throw }` |
| `worker/payments/index.js:1667` | 차감 뒤 `markUserFeatureUnlocked` |
| `worker/payments/index.js:1670-1686` | 레거시 오류 계약. IN_PROGRESS·CONTENDED → 409 `MONTHLY_CREDIT_CONSUME_IN_PROGRESS`(셸이 같은 requestId로 3회 재시도), INSUFFICIENT → 402 `INSUFFICIENT_MONTHLY_CREDITS` + 잔액 필드 |
| `worker/payments/moonstone.js:1-40` | 설계 주석. 트랜잭션 없이 "원장 예약 → lot 차감 → 정산" 순서로 원자성을 얻는다. **구 트랜잭션 경로를 되살리지 말 것** |
| `worker/payments/moonstone.js:115` | `STALE_RESERVATION_TAKEOVER_MS = 90_000`. 미정산 예약을 죽은 것으로 보고 이어받는 나이 |
| `worker/payments/moonstone.js:147` | `spendMoonstone(db, {...}, deps = {})`. `deps.consumeLots` 주입 가능(테스트용) |
| `worker/payments/moonstone.js:222-259` | 예약 E11000 분기. 정산됨이면 replay, 90초 미만이면 IN_PROGRESS, 90초 이상이면 차감 증거로 정산 또는 이어받기 |
| `worker/payments/moonstone.js:262-287` | lot 차감(동결 대상, 재구현 금지). 미차감이면 예약을 지우고 INSUFFICIENT / UNAUTHORIZED / CONTENDED를 던진다 |
| `worker/payments/moonstone.js:294-299` | 정산 `updateOne`. **여기와 `finishSpend`에서 나는 오류가 "차감 뒤 오류"다** |
| `worker/payments/moonstone.js:313` `settleOrphanSpends` | 크론(10분 결제 재조정, `index.js:2273` 주석). 5분 넘은 미정산 예약을 처리한다. 차감됨이면 원장 정산**만**, 미차감이면 예약 삭제. 권한 복구와 알림은 없다 |
| `worker/payments/entitlements.js:153` `grantEntitlement` | 신규 삽입이면 `{alreadyOwned:false, entitlement:null}`, REFUNDED 부활이면 `{alreadyOwned:false, entitlement:<before-image>}`. 부활은 같은 행의 orderId를 이번 requestId로 덮어쓴다. 같은 orderId의 REFUNDED면 `INVALID_REQUEST` |
| `worker/payments/entitlements.js:290` `dropEntitlementByIdentity` | `deleteOne` (filter `{userId, profileId, serviceKey, contentKey, scope, orderId}`). 부활 행도 orderId가 바뀌어 있어 지워진다 |
| `worker/payments/index.js:514` `class PassUnlockCasLost`, `:1815-1852` | Task 7 패턴(이용권). 트랜잭션 + sentinel abort로 신규 지급과 REFUNDED 복원을 함께 롤백한다. :1836 주석에 drop 금지 이유가 있다 |

## 오류별 차감 여부

설계의 핵심은 "어떤 오류가 **확정 미차감**인가"를 명시적 허용 목록으로 고정하는 것이다.

| 오류 | 차감 | 근거 |
|---|---|---|
| `UNAUTHORIZED`(uid 없음), 기능 비활성 코드, `IDEMPOTENCY_KEY_REQUIRED`, `PRODUCT_NOT_FOUND`, `INVALID_REQUEST`, `MONTHLY_NOT_ALLOWED` | 미차감 확정 | 예약 전 검증 (`moonstone.js:154-173`) |
| `IDEMPOTENCY_CONFLICT` | 이번 요청은 미차감 | 같은 requestId 원장이 다른 상품·금액이거나 복원된 결제 (`:226-231`) |
| `INSUFFICIENT_MOONSTONE`, `MOONSTONE_CONTENDED`, 차감 뒤 `UNAUTHORIZED`(USER_NOT_FOUND) | 미차감 확정 | 예약을 지운 뒤 던진다 (`:268-287`) |
| `MOONSTONE_IN_PROGRESS` | **모름** | 같은 requestId의 이전 예약이 90초 미만이라 형제가 진행 중이다 |
| 그 밖의 모든 오류: 예약 insert의 11000 외 오류, `consumeLots` 자체 throw, 정산 `updateOne` 실패, 타임아웃, `finishSpend`(영냥이 funding) 예외 | **모름**(차감됐을 수 있다) | |

## 고객에게 보이는 결과

1. **차감 뒤 정산 실패**: 잔액이 빠지고 권한이 지워진 채 5xx를 받는다.
   - 셸이 같은 requestId로 3회 재시도한다. 매번 지급 → 예약 E11000 → 90초 미만이라 IN_PROGRESS → 권한 삭제 → 409가 반복된다.
   - 90초 뒤 같은 requestId로 다시 오면 이어받기(차감 증거 있음 → 정산 → replay)로 회복된다.
   - 셸은 requestId를 세션 단위로 캐시한다. 새 세션에서 다시 사면 새 requestId이므로 **이중 과금**이다.
2. **아무도 다시 오지 않으면**: `settleOrphanSpends`가 5분 뒤 원장만 정산한다. 권한은 영구히 없고 운영자 알림도 없다. 지시서 최우선 과제인 "유료 결과 미전달"이 그대로 남는다.
3. **환불 뒤 재구매 + 잔액 부족**: 지급이 REFUNDED 행을 되살렸다가 drop이 그 행을 지운다. 과금은 없지만 환불 기록 행이 사라진다.

## 기존 결정과 제약 (설계 전에 읽기)

- **트랜잭션으로 감싸지 않는다.** 머리 주석의 결정이다(`moonstone.js:31-34`). 또한 예약 단계가 E11000을 잡아 이어 가는 구조라, 트랜잭션 안에서는 E11000이 트랜잭션을 abort시킨다(Task 7에서 확인한 NoSuchTransaction 문제와 같다). 이용권 경로의 Task 7 패턴을 그대로 옮길 수 없는 이유다.
- **지급을 먼저 하는 순서는 유지한다.** 이미 가진 콘텐츠의 재열람이 차감되지 않게 하려는 순서다. 서로 다른 requestId로 동시에 와도 지급 upsert가 잠금 역할을 해 한쪽만 과금된다. 차감을 먼저 하는 순서(아래 `/moonstone/spend` 방식)는 이 보호를 잃는다.
- **`dropEntitlementByIdentity`가 상태 변경이 아니라 삭제인 이유**: `alreadyOwned` 판정이 상태가 아니라 문서 존재 여부다(`entitlements.js:278-289` 주석). REFUNDED로 바꿔 남기면 같은 requestId 재시도가 `INVALID_REQUEST`로 영영 막힌다(`:241-243`).
- **오류 응답 계약을 바꾸지 않는다.** 셸 판정기가 409·402와 잔액 필드에 걸려 있다.
- **lot 차감 CAS(`consumeMonthlyCreditLotsWithDb`)는 재구현하지 않는다.**
- **가드 사각**: `verify-payment-freeze`(`config/payment-freeze.json`)는 legacy `billing.js`·`payments.js`만 덮는다. `worker/payments/*`의 회귀는 테스트로만 막힌다.

## 0단계: 운영 피해 점검 (읽기 전용, 코드 수정 전)

이미 피해 고객이 있는지부터 본다. 운영 DB는 **읽기만** 하고, 출력은 건수와 마스킹 ID(뒤 8자)뿐이다. 이메일·생년정보·결과 본문은 출력하지 않는다. 이번 세션의 사용자 허가는 "읽기 전용 전부"였지만, 새 세션은 실행 전에 다시 확인받는다.

- 최근 90일 `MonthlyCreditLedger{type:"SPEND", settledAt 있음}` 중 영구 해금형 상품을 고른다. 그 `sourceId`를 orderId로 가진 `ContentEntitlement{status:"ACTIVE"}`가 없는 건이 대상이다. 환불·복원된 원장(`isMoonstoneSpendRefunded`)은 제외한다.
- 미정산 SPEND 예약(`settledAt` 없음)이 5분을 넘겨 남아 있는 건수.
- 결과가 1건 이상이면 수정과 별개로 바로 사용자에게 보고한다. 복구(권한 지급·환불)는 운영 쓰기라 승인 항목이다.

## 권장 설계 (안 A, 최종 리뷰 제안)

1. **확정 미차감 오류에서만 즉시 보상한다**(위 표의 "미차감 확정" 허용 목록).
   - 신규 삽입 지급이면 지금처럼 drop한다.
   - 부활 지급이면 before-image로 CAS 복원한다. 조건은 `{...identity, orderId: requestId, status: ACTIVE}`이고, before-image 필드를 `$set`하고 부활 때 새로 생긴 필드는 `$unset`한다. 삭제하지 않는다.
2. **그 밖의 오류는 권한을 남기고** 오류를 그대로 돌려준다(응답 계약 유지). 차감 여부 판정은 `settleOrphanSpends` 한 곳에 맡긴다.
   - 차감됨: 원장 정산, `markUserFeatureUnlocked` 보강, 운영자 알림 1줄.
   - 미차감: 예약 삭제, 이 sourceId로 생긴 MONTHLY 권한 회수(신규면 삭제, 부활이면 복원).
3. **같은 requestId 재시도는 자기가 남긴 지급을 "이미 소유"로 단락하지 않는다.** `grantEntitlement`가 `alreadyOwned`를 돌려줘도 그 행의 orderId가 이번 requestId이고 원장이 미정산이면 `spendMoonstone`을 다시 불러 이어받게 한다. 90초 게이트와 이어받기는 기존 그대로다. 이것이 없으면 2번에서 남긴 권한이 미차감인 채 무료 해금이 된다.
4. 알림은 운영자 전용 채널(`createOperatorAlertSender`)로 보낸다. 본문은 maskId 뒤 8자, featureKey, 경과 시간만이다. 표식은 전달 성공 뒤에만 찍는다(6A 섹션 C와 같은 계약).

기각한 안:
- 트랜잭션 래핑: 위 제약 1.
- 차감 먼저 후 지급: 제약 2. 서로 다른 requestId 동시 요청이 이중 차감될 수 있다.

## 설계 함정 (계획 전에 결정할 것)

1. **부활 행의 before-image는 첫 요청 메모리에만 있다.** 재시도나 크론이 미차감을 판정할 때는 복원할 값이 없다. 선택지:
   - (a) 부활 시 권한 행에 `metadata.revivedFrom`(이전 orderId·status·환불 시각)을 남긴다. `grantEntitlement`는 카드·이용권 경로도 쓰므로 공용 변경이다.
   - (b) 월정석 경로에서는 REFUNDED 부활 대상이면 차감을 먼저 하고 성공한 뒤 부활시킨다. 재구매 경로만 순서가 달라진다.
   - (c) 원장 예약 행 metadata에 부활 before-image를 적는다. 원장은 월정석 전용이라 공용 변경이 없다. 다만 `spendMoonstone` 입력을 넓혀야 한다.
2. **동시 같은 requestId**: B가 `alreadyOwned`로 200을 받는 사이 A가 미차감 보상을 하면, B의 셸은 해금으로 보지만 권한이 없다. 현재도 같은 동작이다. 설계 3이 이 경우를 어떻게 바꾸는지 테스트로 고정한다.
3. **`MOONSTONE_IN_PROGRESS`일 때 이번 요청이 새로 만든 지급을 남길지**는 설계 3과 함께 정한다. 남기면 재시도가 이어받고, 지우면 지금의 "지급 → 삭제 반복"이 남는다.
4. **`markUserFeatureUnlocked` 실패**: 차감 성공 뒤 throw하면 500이 나지만 권한은 남는다. 그런데 재시도는 `alreadyOwned`로 단락해서 `unlockedFeatures`를 보강하지 않는다. 이 목록이 접근 판정에 쓰이는지는 **미확인**이다.
5. **영냥이 상품 funding**(`reserveFortuneFunding` / `completeFortuneFunding` / `releaseFortuneFunding`): `finishSpend` 예외는 차감이 끝난 뒤의 오류다. 보상할 때 funding release 순서를 확인한다.

## 같은 계열 다른 호출부 (확인만)

- `POST /moonstone/spend` (`index.js:1939`): 차감 먼저 → 지급 순서다. 지급이 실패하면 잔액만 빠진다. 같은 idempotencyKey로 재시도하면 replay → 지급으로 회복되지만, 재시도가 없으면 그대로 남는다. 안 A의 크론 보강을 여기에도 걸지 정한다. 다만 크론은 contentKey·scope·출생 신원을 몰라 지급을 대신할 수 없다. 서로 다른 키의 동시 요청이 이중 차감되는지도 확인한다.

## 실패 테스트 (먼저 RED 확인)

라우트 테스트는 기존 `__tests__/worker/payments-v2.moonstone.test.js`의 fake db 방식을 따른다. 정산 실패 주입은 db 어댑터의 `updateOne`(MonthlyCreditLedger 대상)을 throw하도록 감싸서 한다.

1. lot 차감 성공 뒤 정산 `updateOne` throw: 권한 행 유지. 같은 requestId 재시도(90초 경과로 시계를 고정)가 200 replay를 받는다. 잔액 차감 1회, 원장 1행 정산.
2. 1과 같은 상태에서 90초 안 재시도: 409 계약을 유지하고, 권한 `deleteOne` 0회(지급 → 삭제 반복 없음).
3. INSUFFICIENT + 신규 지급: 권한 행 없음, 402 응답 필드 그대로.
4. INSUFFICIENT + REFUNDED 부활: 행이 남고 status REFUNDED, orderId 이전 값으로 복원. `deleteOne` 0회.
5. 미차감 고아(예약만 있고 `recentConsumeRequestIds`에 없음) + 남은 권한: `settleOrphanSpends`가 예약을 삭제하고 권한을 회수 또는 복원한다.
6. 차감된 고아: 정산, `unlockedFeatures` 보강, 알림 1회. 발송 실패 시 표식 없이 다음 틱에 재발송.
7. 회귀: `npm run test:jest -- payments-v2.moonstone moonstone-minimum payments-v2.already-unlocked-parity payments-v2.pass-check payments-v2.context billing.coin-gate-consume-retry yeongnyangi-moonstone profile-moonstone-roundtrip`

## 검증 · 배포

- `npm run check:payment`, `npm run verify:payment-concurrency-guards`, `npm run verify:cron-mongo-op-coverage`
- 크론에 새 조회 모양이 생기면 `npm run verify:mongo-query-index-shapes`도 돌린다. 인덱스는 만들지 않고 allowlist에 근거를 적는다.
- 스테이징: 스테이징 DB의 테스트 계정 월정석만 쓴다. 운영 DB 쓰기와 실결제는 금지다. 정산 실패는 스테이징에서 재현하지 않는다(테스트로만).
- 운영 배포는 사용자의 1회성 명시 요청이 있을 때만 한다. 요청이 없으면 "운영 미배포"로 보고한다.

## 롤백

- 커밋 revert 1회. 데이터 마이그레이션은 없다.
- 설계 함정 1에서 (a)나 (c)를 고르면 메타 필드가 남는다. 읽는 코드가 없으면 무해하고, 지우지 않는다(결제 기록 보존).
