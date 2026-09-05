# 인덱스 사용량 실측과 조치 — 2026-08-24

> 실측: `$indexStats` 전수 + `$collStats.storageStats`, db=`code_destiny`.
> 관측 창 `2026-08-12T16:16Z ~ 2026-08-23T16:16Z` (카운터 시작 시각 범위).
> 이 문서는 [db-cost-audit-2026-08-16/03-index-and-ttl.md](db-cost-audit-2026-08-16/03-index-and-ttl.md) 가
> **근거 부족으로 보류한 판단**을 채운 기록이다.

## 왜 이제야 쟀나

2026-08-16 감사는 `pointhistories.userId_1` 을 "완전히 중복"으로 인정하면서도 삭제하지 않았다:

> 요청서 §7 의 삭제 기준 6개 중 "실제 운영 환경에서 사용되지 않는다는 근거"를 `$indexStats` 로
> 확인하지 않았으므로 **보고만 한다.**

2026-08-24 에 사용자가 프로덕션 읽기 전용 점검을 허가해 그 실측을 했다.

## 전체 수치

| 항목 | 값 |
|---|---:|
| 전체 인덱스 | 387 |
| `ops > 0` | 107 |
| 문서가 있는 컬렉션의 `ops = 0` (`_id_` 제외) | 196 |
| 그중 제약(unique/TTL/partial/sparse) | 29 |
| 평범한 보조 인덱스 = 삭제 후보 | 167 |

주요 8개 컬렉션만 크기로 보면:

```
삭제 후보 66개 = 3.07 MiB    유지 인덱스 = 2.98 MiB
```

**안 쓰이는 인덱스가 쓰이는 인덱스보다 많았다.**

## 🔴 계측을 먼저 검증했다

아무것도 안 쓰인 것으로 나오면 그건 발견이 아니라 고장난 측정이다. `ops > 0` 상위:

```
6688  payments :: status_1
4133  users :: _id_
1564  monthly_credit_ledger :: type_1
 986  profilecards :: userId_1_createdAt_1
 653  insights :: type_1_status_1_updatedAt_-1
  57  content_entitlements :: userId_1_serviceKey_1_status_1_expiresAt_1
  33  pointhistories :: user_kind_feature_lookup
```

핫패스가 납득 가능하게 나온다. 또 `pointhistories` 는 `user_kind_feature_lookup`(33)·
`userId_1_kind_1_createdAt_-1`(2)이 트래픽을 흡수하고 나머지 6개가 0인데, 이는 2026-08-16
감사가 구조로 예측한 것과 정확히 일치한다.

**`readPreference` 를 설정하는 코드가 0건이므로**(전 레포 grep) 앱 트래픽은 전부 프라이머리로
가고, 프라이머리에서 읽은 `$indexStats` 가 이 앱에 대해 대표성이 있다.

## 🔴 ops=0 은 삭제 근거가 아니다 — 두 가지 함정

### ① 트래픽이 없어서 0인 것

이 서비스는 트래픽이 적다(90일 결제 시도자 20명). "12일간 안 쓰였다"와 "그 쿼리가 안 돌았다"가
구분되지 않는다.

실제 사례: `pointhistories.userId_1_createdAt_-1` 은 `/points/history` 가 쓰는 경로다. ops=0
이지만 그건 12일간 아무도 그 페이지를 안 열었다는 뜻이고, 지우면 다음 방문자가 느려진다.
**지우지 않았다.**

### ② 제약이 0으로 보이는 것 (더 위험)

`accesses.ops` 는 **조회 계획에 쓰인 횟수**다. **쓰기 시 유니크 강제는 여기 안 잡힌다.**
그래서 멀쩡히 살아 있는 제약이 0으로 나온다:

```
0  pointhistories :: dedupeKey_1                         ← 포인트 중복 지급 방지
0  content_entitlements :: permanent_unlock_identity     ← 영구 해금 신원
0  payments :: userId_1_idempotencyKey_1_paymentType_1   ← 결제 멱등
0  users :: socialAccounts.{google,kakao,naver}.id_1     ← 소셜 계정 신원
0  refresh_tokens :: expiresAt_1                         ← TTL
```

🔴 **ops 만 보고 지웠으면 이 셋이 사라진다.** 삭제 스크립트가 `unique`·TTL·partial·sparse·
`_id_` 를 전부 차단하는 이유가 이것이다.

## 조치한 것 — 10개 드롭 (2026-08-24 적용 완료)

트래픽과 무관하게 성립하는 근거가 있는 것만 지웠다.

| 근거 | 대상 |
|---|---|
| **구조적 중복** — 키가 같은 컬렉션 다른 인덱스의 진부분 접두 | `pointhistories.userId_1` · `security_events` 의 `userId_1`·`ipHash_1`·`reason_1` |
| **읽기 경로 0건** — 모델에 조회 호출 자체가 없음 | `security_events` 보조 인덱스 6개 |

`SecurityEvent` 의 유일한 사용처는 `worker/lib/security/index.js:119` 의 `.create()` 다.
`find`·`findOne`·`aggregate`·`countDocuments`·`distinct` 가 `worker/ lib/ app/ scripts/ __tests__/`
전체에 0건이다.

적용 후 실측:

```
security_events    10개 → 1개 (_id_ 만)
pointhistories     10개 → 9개  (dedupeKey_1 [unique,partial] 생존 확인)
```

정본: `scripts/migrations/20260824-drop-unused-secondary-indexes.mjs`.
이 스크립트는 목록을 믿지 않고 **실행 시점에** 제약 4종·`ops`·**관측 창 7일 이상**·접두를
덮는 인덱스 존재를 다시 확인하고, 하나라도 어긋나면 실행 전체를 실패시킨다.

## 같은 날 함께 만든 것 — 유니크 인덱스 2개

`verify:mongo-launch-indexes` 가 보고한 미생성 7건 중 5건은 값이 거의 상수인 단일 필드
인덱스라 만들지 않았다(`schemaVersion` 기본 1 · `serviceType` 기본값 · `degraded` 불리언 ·
`featureKey` 기본값 · `content_entitlements.featureKey` 는 복합이 커버). 나머지 2건은
성능이 아니라 **제약**이라 만들었다.

```
CREATED  paid_execution_records.paymentId_unique_nonempty   [unique,partial]
CREATED  astrologyAiConsultations.id_1                       [unique,partial]
```

🔴 astrology 쪽은 첫 설계가 **실 데이터에 대고 돌릴 수 없는 것**이었다. 중복 사전 스캔이
잡았다 — 전체 9건 중 8건이 `id` 필드를 아예 갖고 있지 않아(null 0 · 빈 문자열 0) 필터 없는
유니크 인덱스는 그 8건이 서로 충돌해 생성 자체가 불가능했다. `partialFilterExpression` 으로
옛 문서를 제외해 해결했고, 같은 커밋에서 `worker/lib/models.js` 의 선언도 필드 레벨에서
`schema.index()` 로 옮겼다(같은 키에 둘을 함께 두면 `IndexOptionsConflict` 로 plain 이 이겨
유니크가 조용히 사라진다 — 이 레포가 2026-07-05·2026-08-21 에 두 번 겪은 사고).

## 🔴 이득의 정직한 크기

**Atlas 요금은 1원도 줄지 않는다.** M10 은 고정 청구다
([04-tier-decision.md](db-cost-audit-2026-08-16/04-tier-decision.md)). 줄어든 것은
**쓰기마다 유지하던 인덱스 수**다 — 19,684건 원장과 쓰기 전용 감사 로그에서.
3 MiB 라는 크기 자체는 10 GB 대비 의미 없다.

티어를 Flex 로 내리면 그때부터 ops/sec 이 요금이 되므로 이 정리가 요금에 반영된다.

## 남긴 것 — 조치 안 함 (56개)

전부 `ops=0` 이지만 위 두 근거가 없다.

| 컬렉션 | 개수 | 왜 안 지웠나 |
|---|---:|---|
| `serviceexecutiontransactions` | 25 | 🔴 **문서가 5건이다.** 인덱스를 안 쓰는 건 쓸모없어서가 아니라 컬렉션이 작아 Mongo 가 COLLSCAN 을 고르기 때문. **"아직 작다"를 "쓸모없다"로 읽으면 안 된다** |
| `content_entitlements` | 14 | 단일 필드 다수. 결제 경로라 코드 경로 분석이 선행돼야 한다 |
| `payments` | 7 | 동상 |
| `pointhistories` | 5 | `paymentId`·`impUid`·`merchantUid`·`kind`·`userId_1_createdAt_-1`. 재조정·원장 조회 경로가 쓸 수 있어 호출부 전수 확인이 필요하다 |
| `users` | 3 | 261건. 규모 판단 필요 |
| `monthly_credit_ledger` | 2 | 301건. 동상 |

**새로 생긴 후보 1건**: `paid_execution_records.paymentId_1`(plain)은 이번에 만든
`paymentId_unique_nonempty` 와 키가 같다. 빈/누락 값까지 덮는다는 차이만 있어 사실상 중복일
가능성이 높으나, 이번 측정 이후에 생긴 상태라 **다음 관측 창에서 다시 재고 판단한다.**

## 2026-09-06 재판정 — 선언과 실물의 드리프트

`$indexStats` 는 새 관측 창이 없어 다시 재지 않았다(위 56개는 그대로 "조치 안 함"). 대신 축을 바꿨다:
`autoIndex:false` 라 **스키마 선언은 아무것도 만들지 않는데**, 선언만 있고 실물이 없는 인덱스가
100건이었다. 정적 COLLSCAN 가드의 원장을 선언이 아니라 **실물**로 바꿔 돌려 판정했다
(`npm run verify:reconcile-index-drift`, 읽기 전용).

| 판정 | 건수 | 처리 |
|---|---:|---|
| create — 실물이 없어 오늘 COLLSCAN 인 리터럴 쿼리를 고친다 | 5 | 마이그레이션 `20260906-reconcile-index-drift` |
| create — `unique` 선언인데 실물이 없어 중복이 안 막힌다 | 9 | 동상 |
| create — 동적 필터의 실제 조회(`fortuneChatSessions.anonymousSessionId`, 비회원 bootstrap) | 1 | 동상, `DYNAMIC_READERS` 에 근거 |
| drop — `paid_execution_records.paymentId_1`(위 "새로 생긴 후보") | 1 | hint explain 으로 `paymentId_unique_nonempty` 가 등호 조회를 타는 것을 증명한 뒤 드롭 |
| 실물 복합의 접두이거나 어느 쿼리도 안 쓰는 선언 | 84 | **코드에서 선언 삭제**(실물이 없으니 프로덕션 성능은 안 바뀐다 — 가드의 거짓 통과만 사라진다) |

위 "만들지 않은 5건"(`schemaVersion`·`serviceType`·`degraded`·`featureKey` 2)도 이번에 선언을 지웠다.
`GuardianFortuneDailyUsage` 모델은 읽는 코드가 없고 문서도 0건이라 모델째 지우고 컬렉션은
`20260906-purge-test-reports-and-orphan-collections` 의 드롭 목록에 넣었다.

🔴 `security_events` 는 3,302건이 쓰기만 되고 TTL 이 없다 — 보존 기간은 사용자 결정 사항이라 남겨 뒀다.

## 재현

```bash
npm run verify:reconcile-index-drift            # 읽기 전용 — 선언 vs 실물 드리프트 판정(2026-09-06)
npm run verify:drop-unused-secondary-indexes    # 읽기 전용 — 드롭 대상 현재 상태
npm run verify:integrity-unique-indexes         # 읽기 전용 — 유니크 2건 + 중복 스캔
npm run verify:mongo-launch-indexes             # 런치 모델 20개 선언 vs 실물
npm run audit:mongo-collections                 # 전체 인벤토리
```

🔴 `$indexStats` 카운터는 노드 재시작·페일오버·인덱스 재생성에서 0으로 돌아간다. 위 수치를
인용하기 전에 `accesses.since` 를 먼저 보고, 관측 창이 7일 미만이면 그 값으로 판단하지 않는다.
