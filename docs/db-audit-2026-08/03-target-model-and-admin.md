# ⑦⑧⑨ 권장 schema · 관리자 회원관리 · 필요한 index

> 이 문서는 **설계안**이다. 이번 감사에서 구현·적용한 것은 없다.

---

## ⑦ 새롭게 권장하는 schema

### 설계 방침 (사용자 결정 반영)

| 결정 | 내용 |
|---|---|
| 컬렉션 분리 | **하지 않는다.** `users` 안의 이용권·월정석을 별도 컬렉션으로 빼지 않는다 |
| 회원 잠금(`suspended`) | **도입하지 않는다.** `status` 는 `active \| withdrawn` 2값 유지 |
| 정리 범위 | 죽은 필드 제거 + 유령 필드 선언 추가 |

### 🔴 분리하지 않는 이유 (기록용)

`profileSubscription.membershipCreditLots[]` 차감은 **단일 문서 CAS**(`membershipCreditLotsVersion` 낙관적 락, `worker/lib/monthly-credit-store.js:23-73`)가 유일한 동시성 안전장치다. 별도 컬렉션으로 빼면 이 원자성이 사라진다.

트랜잭션으로 대체할 수 없다는 근거가 실측으로 있다 — 기존 트랜잭션 경로(`worker/lib/payment-service.js:60-67`)는 replica set 이 없으면 `503 MONTHLY_ATOMIC_UNAVAILABLE` 로 영구 실패하며, 그래서 신규 컨텍스트(`worker/payments/moonstone.js`)는 **트랜잭션 없이 lot CAS + 원장 예약**으로 다시 짜여 있다. 분리는 이 설계를 정면으로 되돌리는 일이다.

결제·원장은 **이미 분리되어 있다** — `payments`(233) · `monthly_credit_ledger`(368) · `content_entitlements`(1,384) · `paid_execution_records`(30) · `pointhistories`(19,524). 요청서 6번이 말한 분리는 사실상 이미 완료된 상태다.

### 권장 변경 (3종)

#### (1) 제거 — `SAFE_TO_REMOVE` 25개 경로

```
twoFA.enabled / twoFA.totpSecret / twoFA.backupCodesHash
adminRefreshTokenHash / adminLastActivityAt
licenses.standard / .premium / .vvip / .expiresAt
monthlySubscription.active / .tier / .startedAt / .expiresAt
profileSubscription.cancelAtPeriodEnd / .cancelRequestedAt / .nextBillingAt / .lastBillingError
guardianConsent.required / .method / .guardianEmail / .consentIp / .requestedAt / .consentedAt / .revokedAt
tamagotchi
```
전부 **코드 읽기 0건 + 전 계정 기본값**. 제거 순서는 [04](04-migration-and-rollback.md) — **스키마 선언 제거가 먼저, 문서 `$unset` 은 한참 뒤**다.

> `licenses.status` · `monthlySubscription.status` · `monthlySubscription.source` 는 값이 2건씩 있고 `worker/lib/paid-feature-access.js` 가 아직 읽으므로 **이번 제거 대상에서 뺀다**(`ARCHIVE_FIRST`).

#### (2) 유령 필드 정리 — 두 갈래로 나눠 처리

| 처리 | 대상 | 이유 |
|---|---|---|
| **스키마에 선언 추가** | `referralCode` · `referralCodeCreatedAt` · `referralProgram` · `phoneUpdatedAt` · `profileSubscription.updatedAt` | 살아 있는 코드가 지금도 쓴다. 선언이 없으면 mongoose 경유 쓰기가 조용히 버려진다 |
| **문서에서 제거** | `usagePasses`(48) · `profileSubscription.passRemainingUses` / `passTotalUses` / `passUsedCount`(40) | 읽는 코드 0건. `verify-billing-pass-policy.mjs:538` 이 부활 금지 가드까지 두고 있다 |
| **판단 보류** | `metadata`(5) · `profileMe`(1) · H-1 계열 13개(9건) | 출처·계정 성격 확인 후 재분류 |

#### (3) 결함 수정 (스키마 정리와 별개, 우선순위 높음)

| 결함 | 조치 |
|---|---|
| `worker/routes/app-store.js:790-792` 가 미선언 3필드를 `$set` → 조용히 버려짐 | 해당 `$set` 3줄을 **삭제**한다. `profileSubscription.tier`/`passTier`/`expiresAt` 로 이미 판정이 되므로 상태 필드가 필요 없다 |
| `worker/routes/auth.js:94` `signupMembershipCreditGrantedAt` 버려짐 | 동일하게 제거하거나 선언 추가 |
| `status` 결손 37건 | `$set {status:"active"}` 백필 (별도 마이그레이션) |
| 평문 전화번호 32건 | `scripts/migrate-encrypt-user-phone.mjs --apply` 실행 (백업 선행) |

### 권장 최종 `users` 형태

요청서 5번의 예시(`_id/email/name/role/status/authProviders/...`)처럼 **회원 정보만 남기는 형태로 줄이지 않는다.** 위 (1)(2) 적용 후에도 `profileSubscription`·`unlockedFeatures`·`points`·`recentConsumeRequestIds` 는 그대로 남는다 — 전부 원자성·권한 판정에 필요한 자리다.

줄어드는 것은 **필드 129개 → 약 100개**, 그중 "전 계정 기본값" 41개 → 약 16개다. 이것이 이 서비스에서 안전하게 도달 가능한 최소 형태다.

---

## ⑧ 관리자 회원관리 화면 구조

### 지금 없는 것

`app/admin/*` 에는 content / cms / insights / orders / monthly-credits / feedback / reviews / cache-status 만 있다. **회원 목록·검색·상세가 없다.** 회원 CRUD 는 배포되지 않는 레거시 Express(`server/routes/admin.routes.js:902-1060`)에만 존재한다.

### 재사용할 것 (새로 만들지 말 것)

| 필요 | 이미 있는 것 |
|---|---|
| 관리자 페이지 접근 차단 | `middleware.ts:508-513` (`flower_admin_token` 쿠키 없으면 `/admin/login` 리다이렉트) |
| 토큰 발급 | `worker/routes/admin.js:4324 handleEntryPassword` (HMAC, TTL 8h, 20회/10분 레이트리밋) |
| 서버측 인가 | `worker/routes/admin.js:2978 authorizeAdminRequest` |
| 라우트 등록 패턴 | `worker/routes/admin.js:5106-5110` (인증은 dispatcher 에서 끝내고 핸들러만 동적 import) |
| 신규 라우트 파일 템플릿 | `worker/routes/admin-monthly-credits.js` (입력 정규화 → 멱등키 → `withMongoRetry` → 원장) |
| 클라이언트 fetch | `app/admin/cms/_lib/admin-api.ts` 의 `adminFetch()` (`x-admin-token` 부착, 401 시 로그인 리다이렉트) |
| 화면 템플릿 | `app/admin/monthly-credits/page.tsx`(단순 폼) · `app/admin/orders/page.tsx`(목록+상세+액션) |
| 환불 | `worker/routes/admin-orders.js:213` (`refundPaymentAsOperator`, 해금 회수 포함) |
| 이용권 지급 | 🔴 **없다.** 월정석 지급(`admin-monthly-credits.js`)만 있고 이용권 tier 지급 엔드포인트는 없다 |

### 제안 라우트 (신규)

```
GET  /api/admin/users            목록 · 검색 · 페이지네이션
GET  /api/admin/users/:id        상세 (회원 + 이용권 + 월정석 + 결제 + 사용내역 집계)
```

`worker/routes/admin-users.js` 신규 파일 1개 + `admin.js` dispatcher 에 3줄 등록. `admin-monthly-credits.js` 와 동일한 형태를 따른다.

### 화면 구조

#### 목록 `/admin/users`

| 열 | 원천 | 주의 |
|---|---|---|
| 이름 / 이메일 | `users.name` / `.email` | |
| 가입일 | `joinedAt` | |
| 가입 방식 | `localAuth.enabled` + `socialAccounts.*.id` 존재 여부 | |
| 최근 로그인 | 🔴 **필드가 없다** — `lastLoginAt` 은 시드 9건에만 존재 | 대체: `refresh_tokens` 최신 `createdAt`. 아래 참조 |
| 회원 상태 | `status` | 🔴 **`{$ne:"withdrawn"}` 로 조회할 것.** `{status:"active"}` 는 37명을 누락시킨다 |
| 이용권 | `profileSubscription.{passTier,tier,expiresAt}` | 만료 판정은 화면에서 `expiresAt > now` |
| 월정석 잔액 | `profileSubscription.membershipCreditLots` 의 **미만료 `remaining` 합** | 🔴 `membershipCreditBalance` 스칼라를 그대로 쓰지 말 것 — 파생 캐시다. `sumActiveBalance`(`worker/lib/monthly-credit-lots.js`) 재사용 |

검색: 이메일 완전일치(unique 인덱스 활용) + 이름 부분일치. 245건 규모에서는 정규식 스캔으로 충분하다.

> **최근 로그인**: `users` 에 저장하려면 로그인마다 쓰기가 한 번 늘어난다. 245명 규모에서는 `refresh_tokens`(78건, `{userId, revokedAt, expiresAt:-1}` 인덱스 존재)의 최신 세션 생성 시각으로 대체하는 편이 싸다. `lastLoginAt` 필드를 새로 도입하는 것은 **권장하지 않는다**(H-1 시드 필드와 이름이 겹쳐 혼동을 부른다).

#### 상세 `/admin/users/:id`

| 섹션 | 원천 |
|---|---|
| 기본정보 | `users`: `_id` `name` `email` `joinedAt` `createdAt` `status` `role` `localAuth` `socialAccounts` |
| 이용권 | `profileSubscription`: `tier` `passTier` `maxCoveredCoin` `passLimit` `startedAt` `expiresAt` `premiumUseCount`/`premiumUseCycleKey` `monthlySpendCoin` |
| 월정석 | `membershipCreditLots[]` 개별 lot (`amount`/`remaining`/`grantedAt`/`expiresAt`) + `Granted`/`Used` 누계 + `monthly_credit_ledger` 최근 N건 |
| 결제 | `payments`: `merchantUid` `impUid` `paymentAmount` `featureKey` `status` `orderState` `paidAt` `refundedAt` — 기존 `{userId, createdAt:-1}` 인덱스 활용 |
| 이용내역 | `paid_execution_records`(회당결제 영수증) + `content_entitlements`(해금) + `pointhistories`(증빙 원장) |
| 레거시 | `points` 잔액 (🔴 "사용 불가 잔액"으로 명시 표기) |

#### 관리 기능 — **이번 설계에서 넣는 것과 빼는 것**

| 기능 | 채택 | 근거 |
|---|:--:|---|
| 회원 조회·검색 | ✅ | 신규 |
| 월정석 지급 | ✅ | `admin-monthly-credits.js` 재사용 |
| 결제 조회·환불 | ✅ | `admin-orders.js` 재사용 |
| **회원 잠금/해제** | ❌ | **사용자가 도입하지 않기로 결정.** `status` 는 `active\|withdrawn` 2값 유지. 문제 계정은 기존 `abuse_scores.blockedUntil` 또는 탈퇴 처리로 대응 |
| 이용권 지급/회수 | ⏸ | 엔드포인트가 없다. 만들려면 `profileSubscription` 직접 쓰기 + 원장이 필요해 **결제 정책 변경**에 해당 → 별도 승인 사항 |
| 탈퇴 처리(관리자) | ⏸ | 현재 탈퇴는 본인 확인(비밀번호+확인문구) 전제(`auth.js:3584`). 관리자 대행은 정책 결정 필요 |

### 감사 로그

🔴 **라이브 Worker 는 관리자 행위를 어디에도 기록하지 않는다.** `adminauditlogs` 컬렉션은 존재하나 **0건**이고, 쓰는 코드는 배포되지 않는 Express 뿐이다. 현재 유일한 흔적은 환불이 `paymentfailurelogs` 에 `stage:"admin_order_refund"` + `payload.actorId` 로 남는 것뿐이다(`admin-orders.js:240-252`).

제안: `worker/lib/models.js` 에 `AdminAuditLog` 모델을 추가(컬렉션명은 기존 `adminauditlogs` 재사용)하고 `authorizeAdminRequest` 를 통과한 **모든 변경 요청**에 대해 `{action, actorId, targetUserId, before, after, ip, userAgent}` 를 남긴다. 조회 전용 GET 은 제외한다.

⚠️ 단, `actorId` 는 현재 `flower-admin:<jti>` 라 **사람을 특정하지 못한다**(`role:"admin"` 계정 0명). 감사 로그의 실효성을 위해서는 관리자별 계정 도입이 선행되어야 한다 — 이는 **인증 정책 변경**이므로 별도 승인 사항으로 남긴다.

---

## ⑨ 필요한 index

> 요청서 8번: "실제 query pattern을 분석해서 필요한 index만 생성한다. 불필요한 index는 만들지 마라."

### `users` — 신규 인덱스 **불필요**

현재 `users` 인덱스 9개: `_id` · `email`(unique) · `status` · `twoFA.enabled` · `has_started_paid_service` · `socialAccounts.{google,naver,kakao}.id`(partial) · `profileSubscription.membershipCreditLots.expiresAt`

- **문서가 245건이다.** 정렬·필터 전부 COLLSCAN 으로 밀리초 단위다. `createdAt`/`joinedAt`/`lastLoginAt` 인덱스를 추가할 근거가 없다.
- 오히려 **줄일 후보**가 있다: `twoFA.enabled`(205건 전부 `false`)와 `has_started_paid_service`(213건 전부 `false`)는 선택도가 0이라 아무 일도 하지 않는다. 해당 필드를 제거할 때 함께 정리한다.
- 회원 수가 수만 건대로 늘면 그때 `{status:1, joinedAt:-1}` 하나를 재검토한다. **지금은 아니다.**

### 실제로 필요한 인덱스 — `users` 밖에 있다

| 우선 | 컬렉션 | 인덱스 | 근거 |
|:--:|---|---|---|
| 🔴 1 | `pointhistories` (19,524건) | `user_kind_feature_lookup` `{userId,kind,featureKey,createdAt:-1}` | 선언만 있고 실재하지 않음. 영구해금 역추론(`fortune.js:2042-2074`)이 최대 컬렉션을 매번 스캔. 마이그레이션 스크립트 이미 존재: `npm run migrate:point-history-feature-lookup-index` |
| 🔴 2 | `content_entitlements` (1,384건) | `permanent_unlock_identity` (unique, partial) | 성능이 아니라 **정합성**. 영구해금 중복 방지 장치 부재. 스크립트 존재: `scripts/migrations/20260804-add-permanent-unlock-index.mjs`(중복 사전 스캔 포함) |
| 🟡 3 | `checkout_funnel_events` (545건) | `{createdAt:1}` TTL 90일 | 자동 삭제가 안 돌아 무기한 누적 |
| ⚪ 4 | 관리자 상세용 | **추가 불필요** | `payments {userId,createdAt:-1}` · `monthly_credit_ledger {userId,createdAt:-1}` · `content_entitlements {userId,serviceKey,status,expiresAt}` · `paid_execution_records {userId,featureId,profileId,requestId}` 모두 **이미 존재** |

> 🔴 `scripts/migrate-withdraw-indexes.mjs` 는 **지금 상태로 실행하지 말 것.** 존재하지 않는 `point_histories`·`fortune_view_logs` 컬렉션을 새로 만들어 버린다. 컬렉션명을 런타임과 맞춘 뒤 실행한다. → [01 D](01-collection-inventory.md#d-코드--db-이름-드리프트-실측-판정)

### 검증

인덱스를 만든 뒤에는 `npm run verify:mongo-launch-indexes` 로 확인한다. 이 스크립트는 20개 핵심 모델의 선언 인덱스가 실재하는지 대조한다(현재는 다수 실패 상태다 — [01 E](01-collection-inventory.md#e-인덱스--선언-72개가-실재하지-않는다)).
