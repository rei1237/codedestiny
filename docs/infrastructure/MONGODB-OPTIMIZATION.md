# MongoDB 최적화: 부하·연결·쿼리·인덱스 (2026-10-31)

- **측정 시각**(모두 2026-10-31 KST):
  - 15:42: serverStatus·dbStats·$collStats, 60초 표본
  - 16:59: Atlas 30일 지표
  - 17:06: 인덱스 드리프트 `--check`, listIndexes
  - 17:12: 연결 카운터 재측정
- **출처:** [INFRASTRUCTURE-AUDIT 출처 목록](INFRASTRUCTURE-AUDIT.md#출처-목록)의 ATL·MDB·MDB2·IDX·LST·LEDGER. 운영 DB 쓰기는 0회다.
- **기준 커밋:** origin/main `f4c5458a0`, 작성 시점 브랜치 HEAD `35be53295`. **운영 미배포.**
- **함께 보는 문서**(이 문서는 내용을 옮기지 않고 링크만 한다):
  - 2026-08 연결·ops: [01-connection-and-ops](../db-cost-audit-2026-08-16/01-connection-and-ops.md)
  - 2026-08 쿼리 목록: [02-query-inventory](../db-cost-audit-2026-08-16/02-query-inventory.md)
  - 2026-08 인덱스·TTL: [03-index-and-ttl](../db-cost-audit-2026-08-16/03-index-and-ttl.md)
  - 2026-08-30 explain 실측: [db-query-plans-2026-08-30](../db-query-plans-2026-08-30.md)
  - M10 2단계 인수인계: [mongo-m10-phase2-2026-09-06](../handoff/mongo-m10-phase2-2026-09-06.md)

## 결론

- **부하는 M10 용량에 비해 작다.**
  - 30일 노드 최대 CPU는 14.34%, 최대 ops/s는 47.79다.
  - 데이터는 80.5MB로, 디스크 10.63GB 중 2.58GB를 쓴다.
  - 이 수치로 등급을 판정한 결과는 [COST-OPTIMIZATION](COST-OPTIMIZATION.md#등급-판정-m10-유지-vs-flex)에 있다.
- **연결이 병목이다. 연결 수가 아니라 연결 생성 쪽이다.**
  - 프라이머리가 기동한 뒤 새 연결 132,231건이 만들어졌다. 그중 17,523건이 거부됐다(생성률 제한 대상의 14.6%).
  - 관측 구간 15:42~17:12에는 거부 증가가 0이었다.
  - 요청마다 연결하는 구조(Q1)는 그대로다. 판정은 [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#1-do-연결-프록시)에 있다.
- **결제 멱등을 받치는 unique 인덱스는 모두 운영에 실재한다.** 누락 0이다. TTL 11개도 실재한다. 근거는 [10D 표](#결제-멱등-unique-인덱스와-ttl-10d)다.
- **쿼리 개선:**
  - Q2·Q5는 해결, Q3·Q4는 완화했다.
  - Q6(`users {referralCode}` COLLSCAN)과 드리프트 소형 7건은 운영 인덱스 생성이라 **승인 항목**으로 남겼다.
  - 모두 **운영 미배포로 after 미측정**이다.

## 클러스터와 데이터

| 항목 | 값 | 출처 |
|---|---|---|
| 등급·구성 | M10, AWS 서울 리전, 3노드 레플리카셋, MongoDB 8.0.34 | ATL |
| 자동 확장 | 컴퓨트 꺼짐(scaleDown 꺼짐, 상한 없음), 디스크 켜짐 | ATL |
| 디스크 | 10GB 할당. 파일시스템 사용 2.58 / 10.63GB | ATL |
| 데이터 | dataSize 80.5MB, storageSize 33.6MB, indexSize 16.3MB | MDB |
| 규모 | 컬렉션 99, 문서 33,230, 인덱스 406 | MDB |

**큰 컬렉션**(MDB, 데이터 크기 기준)

| 컬렉션 | 크기 | 문서 수 |
|---|---|---|
| `yeongnyangi_requests` | 37.9MB | 156 |
| `pointhistories` | 14.0MB | 19,754 |
| `serviceexecutiontransactions` | 3.8MB | 17 |
| `newYearAiConsultations` | 3.5MB | 12 |
| `llm_response_cache` | 2.8MB | 191 |
| `users` | 2.0MB | 932 |
| `payments` | 1.3MB | 582 |

## 30일 부하

출처는 ATL이다. 기간은 P30D이고, 연결 지표는 PT1H 단위 724표본이다. 값은 p50 / p95 / max다.

| 노드 | 역할 | 연결 | ops/s | 네트워크 GB/일 | CPU % |
|---|---|---|---|---|---|
| 00 | 세컨더리 | 53 / 72 / 81 | 18.39 / 19.18 / 22.86 | 9.25 / 10.32 / 10.33 | 2.71 / 3.59 / 7.57 |
| 01 | 세컨더리 | 65 / 80 / 95 | 22.13 / 24.96 / 47.79 | 10.02 / 11.25 / 11.44 | 3.62 / 4.93 / 14.34 |
| 02 | 프라이머리 | 62 / 89 / 100 | 18.88 / 27.97 / 44.31 | 10.09 / 11.61 / 12.00 | 3.15 / 5.19 / 10.47 |

- **쿼리 타기팅**(스캔한 문서 수 / 반환한 문서 수):
  - p95: 노드 00이 0.6, 01이 2.75, 02가 3.09다.
  - max: 노드 00이 6.52, 01이 **116.1**, 02가 6.65다.
- 노드 01의 최대 116.1은 한 시간 표본에서 생긴 값이다. 어떤 쿼리가 원인인지는 미측정이다.
  - 측정 방법: Atlas Query Insights나 Profiler에서 같은 시각의 느린 쿼리를 확인한다. M10에는 Performance Advisor가 있다.

## 연결

**프라이머리 serverStatus `connections`**(MDB 15:42, MDB2 17:12)

| 항목 | 15:42 | 17:12 | 차이 |
|---|---|---|---|
| current | 90 | 90 | 0 |
| available | 1,410 | — | — |
| totalCreated | 132,231 | 134,127 | +1,896(90분, 0.35/초) |
| rejected | 17,523 | 17,523 | **+0** |
| exempted | 29,508 | 30,677 | +1,169 |
| queuedForEstablishment | — | 0 | — |
| interruptedDueToClientDisconnect | — | 3 | — |

**계산**

- 노드 연결 한도: current 90 + available 1,410 = 1,500이다.
- 기동 후 평균 생성률: 132,231 / 136,450초 = 0.97/초다.
  - 136,450초는 17:12 기준 uptime 141,850초에서 5,400초를 뺀 15:42 기준값이다.
  - 따라서 프라이머리 기동 시각은 약 10-30 01:47 KST다.
- 생성률 제한 대상: 132,231 − 29,508(면제) = 120,246이다. 거부 비율은 17,523 / 120,246 = 14.6%다.

**해석**

- M10·M20에는 노드당 새 연결 생성을 초당 15개로 묶는 제한이 있다. M30 이상에는 없다(Atlas 문서 기준). 거부(rejected)는 이 제한에 걸린 연결이다.
- 거부는 기동(10-30 01:47 KST 무렵)부터 15:42 사이에 생겼다. 그 뒤 90분 관측에서는 0이다.
- 배포 직후 연결이 한꺼번에 몰렸을 때 생긴 것으로 **추정**한다. 시각을 대조해 보지는 않았다.
- 같은 기간 네트워크 송신은 18.78GB(약 11.9GB/일)였다. 요청 수 3,475,711건으로 계산하면 약 25.5건/초다.

**다음 측정**

- 운영 승격(배포) 직후 15분 동안 `rejected`를 다시 읽는다.
- 증가하면 [SERVER-PERFORMANCE 확장 계획](SERVER-PERFORMANCE.md#확장-계획-임계값--단계)의 연결 거부 행으로 넘어간다.
- 운영 승격 전이므로 **운영 미배포로 after 미측정**이다.

## 쿼리 개선 (Q2~Q6)

| # | 대상 | 상태 | 커밋 | 변경 | 효과 |
|---|---|---|---|---|---|
| Q2 | `worker/routes/access.js` 백필 증빙 | 해결 | `8ce66f1a0` | 이력 행마다 하던 결제 `findOne`을 `Payment.find({_id: {$in}})` 1회로 합쳤다. 이력 한도가 20이라 `$in`은 최대 20개다 | 왕복이 최대 20회에서 1회로 준다(테스트 단언). 운영 지연은 운영 미배포로 after 미측정 |
| Q3 | `worker/routes/insights.js` 공개 목록 | 완화 | `a9d025f93` | 집계 2개를 `withMongoRetry`로 감쌌다. 일시 오류가 나면 1회 재시도한다. 캐시는 의도적으로 넣지 않았다(`X-CD-Cache: bypass` 유지) | 일시 오류 1회에서도 200(테스트). 운영은 운영 미배포로 after 미측정 |
| Q4 | ops-hq XP·업적 동기화(10분 크론) | 완화 | `34f7ae386` | 원장 `find({})` 2회를 `$group` 1회로 바꿨다. 업적은 남은 것만 판정한다 | 전송은 소수 그룹으로 준다. 집계는 여전히 원장 전체 스캔이다(원장 약 105행). 증가 상한용 변경이다 |
| Q5 | 인덱스 드리프트 스크립트 | 해결 | `30ef0c7ac` | TTL 선언을 키와 만료 값까지 비교한다. `--self-test`는 22건 모두 통과한다 | TTL 값만 다른 경우(키가 같으면 메인 흐름이 missing에서 제외)는 collMod가 필요해 후속 결정으로 남겼다 |
| Q6 | 가입 시 `users {referralCode}` | 잔여 | — | 코드 변경 없음. 가입 1회에 최대 8번 COLLSCAN한다(`worker/routes/auth.js`) | 2026-08-30 explain에서는 users 267건이 COLLSCAN이었다([db-query-plans](../db-query-plans-2026-08-30.md)). 지금 users는 932건이다(MDB). 인덱스 생성은 [승인 항목](#인덱스-생성-승인-항목) |

- **정적 가드:** `npm run verify:mongo-query-index-shapes`는 위반 0으로 통과했다(Task 8·Task 10 보고).
- **Q1(요청마다 새 MongoClient):** [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md)에서 다룬다.

## 인덱스 드리프트 점검

출처는 IDX다. `npm run migrate:reconcile-index-drift -- --check`(읽기 전용)를 17:06 KST에 실행했다.

| 판정 | 건수 | 내용 |
|---|---|---|
| 모델 / 컬렉션 | 58 / 58 | — |
| 실물 없는 선언 | 16 | 아래 create·redundant·unused로 나뉜다 |
| 실물 원장 기준 COLLSCAN 리터럴 쿼리 | 54 | 정적 추출 기준이다. 문서 수가 작은 컬렉션이 대부분이다 |
| create | 7 | `relationshipBoundaryTests` 3개(`{id}` unique, `{userId, idempotencyKey}` unique, `{userId, createdAt:-1}`), `destinyBiasShares` 2개(`{shareId}`, `{contentHash}` unique), `resultSharedSnapshots` 2개(같은 구성). 대상 컬렉션 문서 수는 0~1이다 |
| redundant-prefix | 1 | `relationshipBoundaryTests {userId}`. 선언된 복합 인덱스의 접두다. 코드에서 선언만 지운다 |
| unused | 8 | 리터럴 쿼리가 선두 키로 쓰지 않는 선언이다. 이 중 `destinyBiasShares`·`resultSharedSnapshots`의 `{expiresAt}` 2건은 TTL 인덱스다. 쿼리용이 아니므로 unused로 본 것은 오판이다. DB에는 손대지 않는다 |
| drop | 0 | — |

`--apply`의 효과는 두 가지뿐이다(스크립트 머리말).

- create 판정만 만든다.
- 증명된 실물 중복만 지운다.

unused·redundant는 DB에 손대지 않는다.

## 결제 멱등 unique 인덱스와 TTL (10D)

- 출처: LST. listIndexes 전수 조회(읽기 전용), 2026-10-31T08:06:49Z, 컬렉션 99. unique 70개, TTL 11개다.
- 표의 표시: "부분"은 partialFilterExpression이 있다는 뜻이다. "sparse"는 필드가 없는 문서를 제외한다는 뜻이다.

| 컬렉션 | 인덱스 이름 | 키 | 종류 | 받치는 불변식 | 실재 |
|---|---|---|---|---|---|
| `payment_webhook_events` | `provider_1_eventId_1` | `{provider, eventId}` | unique | 같은 웹훅 이벤트 1회 처리 | 있음 |
| `idempotency_keys` | `userId_1_endpoint_1_keyHash_1` | `{userId, endpoint, keyHash}` | unique | 같은 요청 키 1회 처리 | 있음 |
| `idempotency_keys` | `expiresAt_1` | `{expiresAt}` | TTL 0초(문서의 만료 시각 기준) | 만료된 멱등 키 정리 | 있음 |
| `payments` | `userId_1_idempotencyKey_1_paymentType_1` | `{userId, idempotencyKey, paymentType}` | unique, 부분(`idempotencyKey`가 빈 문자열 아닌 문자열) | 같은 결제 요청 1건 | 있음 |
| `payments` | `impUid_1` | `{impUid}` | unique, sparse | PG 거래 1건 = 결제 1건 | 있음 |
| `payments` | `merchantUid_1` | `{merchantUid}` | unique, sparse | 결정적 주문 ID 1건 = 결제 1건 | 있음 |
| `paid_execution_records` | `userId_1_featureId_1_profileId_1_requestId_1` | `{userId, featureId, profileId, requestId}` | unique | 같은 유료 실행 1건 | 있음 |
| `paid_execution_records` | `executionId_1` | `{executionId}` | unique | 실행 ID 유일 | 있음 |
| `paid_execution_records` | `paymentId_unique_nonempty` | `{paymentId}` | unique, 부분(빈 문자열 아닌 문자열) | 결제 1건 = 실행 기록 1건 | 있음 |
| `content_entitlements` | `userId_1_profileId_1_serviceKey_1_contentKey_1_scope_1` | 5키 | unique | 같은 이용권 1건 | 있음 |
| `content_entitlements` | `permanent_unlock_identity` | `{userId, profileId, featureKey, contentKey, scope}` | unique, 부분(`featureKey`가 빈 문자열 아닌 문자열) | 영구 해금 1건 | 있음 |
| `content_entitlements` | `birth_unlock_identity` | `{userId, birthKey, serviceKey, contentKey}` | unique, 부분(`scope: "BIRTH"`, `birthKey`가 문자열) | 생년 해금 1건 | 있음 |
| `monthly_credit_ledger` | `userId_1_type_1_sourceId_1` | `{userId, type, sourceId}` | unique | 같은 원천의 크레딧 1회 지급 | 있음 |
| `pointhistories` | `dedupeKey_1` | `{dedupeKey}` | unique, 부분(빈 문자열 아닌 문자열) | 같은 포인트 이력 1건 | 있음 |
| `serviceexecutiontransactions` | `userId_1_executionKey_1` | `{userId, executionKey}` | unique | 같은 실행 거래 1건 | 있음 |
| `serviceexecutiontransactions` | `unpaid_intent_retention_v1` | `{retentionUntil}` | TTL 0초, 부분(`status: "awaiting_payment"`) | 미결제 의도만 정리, 결제된 거래는 보존 | 있음 |
| `users` | `email_1` | `{email}` | unique | 계정 이메일 유일 | 있음 |

**결제 멱등 unique 누락: 0건.** 계획이 "빠진 것으로 드러나면 생성"이라고 한 결제 unique 인덱스는 만들 것이 없다.

**그 밖의 TTL**(LST)

| 컬렉션 | 인덱스 | 만료 |
|---|---|---|
| `abuse_scores` | `expiresAt_1` | 0초(문서 만료 시각) |
| `app_purchase_intents` | `expiresAt_1` | 0초 |
| `fusionFortuneGenerationAttempts` | `fusion_attempt_expiry_ttl` | 0초 |
| `guardianFortuneGenerationAttempts` | `guardian_attempt_expiry_ttl` | 0초 |
| `guardianFortuneSharedSnapshots` | `guardian_shared_snapshot_expiry_ttl` | 0초 |
| `llm_response_cache` | `expiresAt_1` | 0초 |
| `refresh_tokens` | `expiresAt_1` | 0초 |
| `checkout_funnel_events` | `createdAt_ttl_90d` | 7,776,000초(90일) |
| `security_events` | `createdAt_ttl_90d` | 7,776,000초(90일) |

**앱이 인덱스를 만들지 않는 구조:** `worker/lib/db.js`가 `autoIndex: false`, `autoCreate: false`로 연결한다. 그래서 스키마 선언만으로는 인덱스가 생기지 않고, 실물은 마이그레이션이 만든 것뿐이다. 앱 DB 사용자에게 인덱스 관리 권한이 필요 없다는 근거이기도 하다([SECURITY-AUDIT](SECURITY-AUDIT.md#런북-2-앱-사용자-최소-권한)).

## 인덱스 생성 승인 항목

자동으로 실행하지 않는다. 승인 항목 2다.

| 대상 | 명령 | 사전 확인 | 실행 | 사후 확인 | 롤백 |
|---|---|---|---|---|---|
| `users {referralCode: 1}`, sparse, unique 아님(Q6) | `npm run verify:request-path-indexes`(읽기 전용) → 승인 → `npm run migrate:request-path-indexes` | `npm run backup:mongo`로 덤프. `--check` 출력에서 생성 대상 1건 확인 | 승인 후 1회 | 가입 경로 쿼리 explain에서 IXSCAN 확인 | 이름으로 `dropIndex` |
| 드리프트 create 7건(문서 0~1건 컬렉션) | `npm run migrate:reconcile-index-drift -- --check` → 승인 → `-- --apply --expect 7` | 덤프. `--check`에서 create 7, drop 0 재확인 | 승인 후 1회 | `--check` 재실행 시 create 0 | 이름으로 `dropIndex` |

- **실행 위치:** 두 명령 모두 운영 DB 연결 정보가 필요하다. 사용자 셸에서 실행한다. 연결 문자열은 문서나 로그에 남기지 않는다.
- **위험:**
  - 대상 문서 수가 932건 이하라 빌드 부하는 작을 것으로 본다. 실측은 아니다.
  - 기존 중복이 있으면 unique 생성은 실패한다. `relationshipBoundaryTests`는 문서가 1건이라 해당하지 않는다.
