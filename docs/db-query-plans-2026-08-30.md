# 요청 경로 쿼리 플랜 실측 — 2026-08-30

> 실측: `npm run audit:mongo-query-plans` (읽기 전용 `explain("executionStats")` + `$indexStats`), db=`code_destiny`,
> 2026-08-30T14:41Z. 재현: `MONGO_URI=... node scripts/audit-mongo-query-plans.mjs`.
> 이 문서는 계획 "M10 MongoDB 전반 최적화" 1단계의 결과다. 08-24 의 [db-index-usage-2026-08-24.md](db-index-usage-2026-08-24.md) 가
> "어느 인덱스가 쓰이나"를 쟀다면, 여기는 "어느 쿼리가 인덱스를 못 타나"를 쟀다.

## 결론

정적 분석으로 지목한 후보 16개 중 **COLLSCAN 은 2개**, 둘 다 `users`(267건).

| 위치 | 판정 | 조치 |
|---|---|---|
| `worker/routes/auth.js:186` `users {referralCode}` | 🔴 COLLSCAN 267/0 — 가입마다 최대 8회, 문서 수에 선형 | `{referralCode:1}` sparse 인덱스 — [scripts/migrations/20260830-add-request-path-indexes.mjs](../scripts/migrations/20260830-add-request-path-indexes.mjs) (**미실행**, `--check` 만) |
| `worker/lib/monthly-credit-store.js:12` `users $or membershipCreditLotsVersion` | 🔴 COLLSCAN 267 → 178 반환 | 선택도가 없어 인덱스로 못 푼다. 크론·저빈도. 조치 없음 |
| 나머지 14개 | ✅ IXSCAN | 조치 없음 |

계획 표의 추정 중 **틀린 것** (인덱스 만들지 않는다):
- `pointhistories $or metadata.profileId` — `user_kind_feature_lookup`(userId,kind,featureKey,createdAt) 이 잡고 `$or` 는 FETCH 필터. keys 6 / docs 6.
- `payments` 백필 조회 — `userId_1_createdAt_-1` 로 9건만 본다. 4키 복합 인덱스 불필요(사용자당 결제 수가 작다).
- `billing.js:876` — 필터에 `_id: authUserId` 가 있어 `_id_` 점조회. COLLSCAN 후보 지목 자체가 오류.
- `insights` limit 6000 — 문서 1건, `type_1_status_1_updatedAt_-1` IXSCAN. JS 필터(`isPublicInsight` 가 status 없는 문서를 `isPublished` 로 판정, 대소문자 무시)는 서버 필터와 등가가 아니라 **옮기지 않는다**. 성장 대비 레버는 캐시(계획 5단계).
- 관리자 `countDocuments({})` — 계획의 "×13" 은 오류, 실제 1곳(`admin.js:3977`). `estimatedDocumentCount()` 로 바꿨다.

## 컬렉션 규모와 인덱스 (ops 는 2026-08-27 카운터 리셋 이후 3일치)

| 컬렉션 | 문서 수 | 인덱스 키 (ops) |
|---|---:|---|
| users | 267 | `_id`(794) · `has_started_paid_service`(0) · `socialAccounts.google.id`(0) · `profileSubscription.membershipCreditLots.expiresAt`(3) · `email`(5) · `twoFA.enabled`(0) · `status`(0) · `socialAccounts.naver.id`(0) · `socialAccounts.kakao.id`(0) |
| pointhistories | 19,684 | `_id`(0) · `paymentId`(0) · `impUid`(0) · `userId,createdAt`(0) · `dedupeKey`(0) · `kind`(1) · `merchantUid`(0) · `userId,kind,createdAt`(0) · `userId,kind,featureKey,createdAt`(3) |
| payments | 348 | `_id`(3) · `userId,idempotencyKey,paymentType`(0) · `accessType`(0) · `impUid`(1) · `merchantUid`(5) · `paymentType`(0) · `idempotencyKey`(4) · `featureKey`(6) · `status`(**2110**) · `userId,createdAt`(1) · `reportId`(0) · `productId`(0) · `requestId`(0) · `sessionId`(0) · `orderState`(0) |
| insights | 1 | `_id`(0) · `slug`(4) · `status,updatedAt`(62) · `category,updatedAt`(0) · `isFeatured,updatedAt`(0) · `type,status,updatedAt`(344) |
| dailyfortunesubscriptions | 2 | `_id`(0) · `email`(0) · `isActive`(0) · `isActive,subDaily`(0) |

🔴 `$indexStats` 카운터가 **2026-08-27 에 리셋**됐다(08-24 관측 창 종료). 08-24 스크립트의 7일 최소 관측 창 규칙대로, 이 ops 값으로 드롭 판단을 하지 않는다.
`payments.status_1` ops 2,110/3일 = 결제 대사 크론(`payment-reconcile-task.js:74`, `status $in [pending,processing]`)이 정상 사용 중.

## 쿼리별 winningPlan

| 위치 | 컬렉션·op | 스테이지 | 인덱스 | nReturned | keys | docs | 판정 |
|---|---|---|---|---:|---:|---:|---|
| auth.js:186 | users·find | LIMIT>COLLSCAN | - | 0 | 0 | 267 | 🔴 COLLSCAN |
| access.js:259 | pointhistories·find | LIMIT>FETCH>SORT_MERGE>IXSCAN | user_kind_feature_lookup | 1 | 6 | 6 | ✅ |
| access.js:281 | payments·find | LIMIT>FETCH>IXSCAN | userId_1_createdAt_-1 | 0 | 9 | 9 | ✅ (표본 0건) |
| access.js:358 | payments·find | SORT>FETCH>IXSCAN | userId_1_createdAt_-1 | 0 | 9 | 9 | ✅ (표본 0건) |
| fortune.js:2342 | pointhistories·distinct | FETCH>IXSCAN | user_kind_feature_lookup | 1 | 7 | 6 | ✅ |
| fortune.js:2360 | pointhistories·distinct | PROJECTION_COVERED>DISTINCT_SCAN | user_kind_feature_lookup | 1 | 2 | 0 | ✅ 커버드 |
| fortune.js:5989 | pointhistories·count | COUNT>COUNT_SCAN | userId_1_kind_1_createdAt_-1 | 0 | 1 | 0 | ✅ 커버드 |
| billing.js:876 | users·find | LIMIT>FETCH>IXSCAN | _id_ | 0 | 1 | 1 | ✅ 점조회 |
| insights.js:364 | insights·find | SUBPLAN>LIMIT>FETCH>IXSCAN | type_1_status_1_updatedAt_-1 | 1 | 1 | 1 | ✅ |
| insights.js:496 | insights·find | SORT>FETCH>OR>IXSCAN | status_1_updatedAt_-1 | 0 | 0 | 0 | ✅ |
| insights.js:540 | insights·find | FETCH>OR>IXSCAN | status_1_updatedAt_-1 | 0 | 0 | 0 | ✅ |
| rpg.js:897 | payments·find | LIMIT>FETCH>IXSCAN | userId_1_createdAt_-1 | 0 | 9 | 9 | ✅ (표본 0건) |
| payment-reconcile-task.js:74 (cron) | payments·find | FETCH>IXSCAN | status_1 | 0 | 1 | 0 | ✅ |
| daily-fortune-task.js:456 (cron) | dailyfortunesubscriptions·find | FETCH>IXSCAN | isActive_1_subDaily_1 | 1 | 1 | 1 | ✅ |
| monthly-credit-expiry-task.js:102 (cron) | users·find | FETCH>IXSCAN | membershipCreditLots.expiresAt_1 | 0 | 0 | 0 | ✅ |
| monthly-credit-store.js:12 (cron) | users·find | SUBPLAN>COLLSCAN | - | 178 | 0 | 267 | 🔴 COLLSCAN (선택도 없음) |

표본: `pointhistories` 의 실제 `deduct` 문서 1건에서 userId·profileId·featureKey 를 뽑았다(표본 사용자는 referralCode 가 없어 `auth.js:186` 은 nReturned 0 — COLLSCAN 판정에는 영향 없음). "표본 0건"은 그 사용자에게 해당 결제가 없다는 뜻이고 docs 9 = 그 사용자의 결제 전체 수다.

## 안 한 것

- 인덱스 **생성** 실행 — 사용자 별도 허가 필요. 명령: `npm run migrate:request-path-indexes` (`--check` 는 `npm run verify:request-path-indexes`).
- 관리자 `$regex i` 검색(`admin.js`·`content.js`·`admin-orders.js`) — 관리자 전용·저빈도, 인덱스로 못 푼다. 미수정.
- 기존 인덱스 드롭 — 카운터 리셋으로 관측 창 3일. 08-24 보류 사유 유지.
