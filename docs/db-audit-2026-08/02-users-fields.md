# ②③④⑤⑥ users 필드 전체 분석

> 실측: `users` 245건 (탈퇴 1건 포함), 실재 필드 경로 **129개** (2026-08-12)
> 원자료: [raw/users-fields.json](raw/users-fields.json)
> 스키마 정본: [worker/lib/models.js:15-160](../../worker/lib/models.js)

## 표 읽는 법

- **존재 / 의미** — `존재` = 그 키가 문서에 있는 건수, `의미` = 값이 기본값(없음·null·`""`·0·빈배열·빈객체)이 **아닌** 건수. `존재 ≫ 의미` 는 "필드는 만들어졌지만 아무도 쓴 적 없다"를 뜻한다.
- **example 열은 없다.** 개인정보 무출력 원칙에 따라 값 샘플을 뽑지 않았다. 대신 타입과 (비민감 필드에 한해) 값 분포로 대체한다.
- **분류** — `KEEP` / `SAFE_TO_REMOVE` / `ARCHIVE_FIRST` / `UNKNOWN`. 정의는 [README](README.md#필드-처리-분류-02-users-fieldsmd).

---

## A. 회원 식별·상태

| 필드 | 타입 | 존재/의미 | 코드 사용 위치 | 정책 관련성 | 분류 | 위험도 |
|---|---|---|---|---|---|---|
| `email` | string | 245/245 | `worker/routes/auth.js` 전역, unique 인덱스 | 로그인 식별자 | **KEEP** | - |
| `name` | string | 245/245 | JWT 클레임(`worker/lib/auth.js:691`), 화면 표시 | 필수 | **KEEP** | - |
| `role` | string | 245/245 | `authorizeAdminRequest`(`worker/routes/admin.js:2978`) | 관리자 판정 | **KEEP** | 🔴 아래 참조 |
| `status` | string | **208**/208 | `isWithdrawnUser`(`worker/lib/auth.js:184`) | 탈퇴 판정 | **KEEP** | 🔴 아래 참조 |
| `withdrawnAt` | date\|null | 193/1 | `handleWithdraw`(`auth.js:3664`) | 탈퇴 시각 | **KEEP** | - |
| `joinedAt` | date | 245/245 | 가입일 표시 | 회원 기본 | **KEEP** | - |
| `createdAt` / `updatedAt` | date | 214/214, 219/219 | `{timestamps:true}` | 회원 기본 | **KEEP** | 🟡 31건에 `createdAt` 없음 |
| `passwordHash` | string | 245/**181** | `handleLogin`(`auth.js:2689`), `select:false` | 로컬 로그인 | **KEEP** | - |
| `profileImage` | string | 143/16 | JWT 클레임, 화면 | 표시용 | **KEEP** | - |

### 🔴 `status` 필드가 없는 문서가 37건이다

```
status 분포: active=207, (필드 없음)=37, withdrawn=1
```

mongoose 로 읽으면 기본값 `"active"` 가 채워지지만, **raw 쿼리로 `{status:"active"}` 를 걸면 이 37명이 결과에서 사라진다.** 관리자 회원 목록·통계·일괄 처리에서 곧바로 사고가 나는 형태다.

- 대응: 관리자 조회는 `{ status: { $ne: "withdrawn" } }` 로 짜거나, 백필로 `status` 를 채운다. → [04 Phase 5](04-migration-and-rollback.md)
- 이 사실을 모른 채 관리자 화면을 만들면 **회원 15%가 유령이 된다.**

### 🔴 `role:"admin"` 계정이 0명이다

```
role 분포: user=245
```

관리자 인가는 두 경로다 — ① JWT 의 `role==="admin"` ② 공유 비밀번호로 발급하는 flower-admin HMAC 토큰(`worker/routes/admin.js:4324`). ①에 해당하는 계정이 하나도 없으므로 **현재 관리자 접근은 전적으로 공유 비밀번호 하나에 의존**하며, 누가 무엇을 했는지 구분할 수 없다(`actorId = flower-admin:<jti>`). → [03](03-target-model-and-admin.md#감사-로그)

---

## B. 인증·소셜

| 필드 | 타입 | 존재/의미 | 코드 사용 위치 | 분류 | 위험도 |
|---|---|---|---|---|---|
| `socialAccounts.kakao.id` / `.connectedAt` | string / date | 214/**49** | `findOrCreateSocialUser`(`auth.js:1685`) | **KEEP** | - |
| `socialAccounts.google.id` / `.connectedAt` | string / date | 214/**17** | 동일 | **KEEP** | - |
| `socialAccounts.naver.id` / `.connectedAt` | string / date | 214/**1** | 동일 | **KEEP** | - |
| `localAuth.enabled` / `.activatedAt` | bool / date | 245/181 | 로그인 분기 | **KEEP** | - |
| `twoFA.enabled` | bool | 205/**0** | 레거시 Express 전용 (`server/middleware/auth.middleware.js:100`) | **SAFE_TO_REMOVE** | - |
| `twoFA.totpSecret` | string | 205/**0** | 동일 | **SAFE_TO_REMOVE** | 🔴 **평문 저장 스키마**(`models.js:87`) |
| `twoFA.backupCodesHash` | array | 205/**0** | 동일 | **SAFE_TO_REMOVE** | - |
| `adminRefreshTokenHash` | string | 205/**0** | 레거시 Express (`server/routes/admin.routes.js:582`) | **SAFE_TO_REMOVE** | - |
| `adminLastActivityAt` | null | 205/**0** | 동일 | **SAFE_TO_REMOVE** | - |

로그인 수단 실측: 로컬 181 · 카카오 49 · 구글 17 · 네이버 1 (합계가 245를 넘는 것은 연동 계정 중복 때문).

> `twoFA.*` 4개와 `adminRefresh*` 2개는 **205개 문서에 존재하지만 값이 하나도 없다.** 라이브 Worker 에는 읽는 코드조차 없다. TOTP 시크릿을 평문으로 담을 자리를 스키마가 열어두고 있다는 것 자체가 위험이므로, 정리 1순위다.

---

## C. 레거시 화폐

| 필드 | 타입 | 존재/의미 | 현재 코드 동작 | 분류 | 위험도 |
|---|---|---|---|---|---|
| `points` | int | 245/**160** | 차감 경로 전부 `402 legacyCoinDisabled`(`billing.js:4552`, `fortune.js:2493`). 환불 시 `$inc` 만 살아 있음 | 🔴 **KEEP** | 🔴 |
| `licenses.standard/premium/vvip` | int | 75/**0** | dev tester(`billing.js:5279`)만 씀 | **SAFE_TO_REMOVE** | - |
| `licenses.status` | string | 75/2 | `paid-feature-access.js` 읽기만 | **ARCHIVE_FIRST** | 🟡 |
| `licenses.expiresAt` | null | 75/**0** | 동일 | **SAFE_TO_REMOVE** | - |
| `monthlySubscription.active` | bool | 75/**0** | dev tester만 씀 | **SAFE_TO_REMOVE** | - |
| `monthlySubscription.status` / `.source` | string | 75/2 | 읽기만 | **ARCHIVE_FIRST** | 🟡 |
| `monthlySubscription.tier` / `.startedAt` / `.expiresAt` | - | 75/**0** | 동일 | **SAFE_TO_REMOVE** | - |

### 🔴 `points` — 160계정에 총 2,002,956,304 코인

```
pointsPositive: 160계정   pointsTotal: 2,002,956,304 코인
```

`worker/lib/billing-policy.js` 의 `KRW_PER_COIN = 100` 을 그대로 적용하면 명목상 2,000억 원이다. 시드·테스트로 부풀려진 값이 대부분이겠지만 **어느 계정이 정상 충전분이고 어느 계정이 시드분인지 이 감사만으로는 구분할 수 없다.**

- **삭제 절대 금지.** 사용자 재산권 주장 근거가 될 수 있고, `pointhistories` 19,524건이 그 이력을 갖고 있다.
- 동시에 **현재 정책과 맞지 않는다** — 코인으로 결제할 수 있는 경로가 하나도 없다. 잔액만 있고 쓸 수 없는 상태다.
- 필요한 것은 삭제가 아니라 **정책 결정**이다: (a) 그대로 동결 표시, (b) 월정석으로 전환(`billing.js:1554-1597` 의 `legacyCoinCreditSeeded` 경로가 이미 있음 — 94계정이 이미 전환됨), (c) 소멸 공지. 이 감사는 (b) 를 추천하되 **실행은 별도 승인 사항**으로 남긴다.

---

## D. 이용권 (`profileSubscription`)

| 필드 | 타입 | 존재/의미 | 현재 정책 관련성 | 분류 |
|---|---|---|---|---|
| `tier` | string | 218/218 | 이용권 등급 정본 | **KEEP** |
| `source` | string | 195/195 | 취득 경로 | **KEEP** |
| `passTier` | string | 79/**7** | 커버 판정(`profile-limits.js:532`) | **KEEP** |
| `maxCoveredCoin` / `freeLimit` / `passLimit` | int | 79/7, 79/5, 79/5 | 커버 한도 | **KEEP** |
| `expiresAt` / `startedAt` / `firstSubAt` | date | 217/10, 216/11, 216/9 | 만료 판정 | **KEEP** |
| `planId` / `productType` / `durationMonths` | - | 87/15, 79/5, 79/5 | 상품 식별 | **KEEP** |
| `profileLimit` | int | 87/81 | 프로필 카드 개수 제한 | **KEEP** |
| `premiumUseCycleKey` / `premiumUseCount` | - | 10/1 | 공정이용 카운터 | **KEEP** |
| `monthlySpendCoin` | int | — | 월 누적 커버 한도 | **KEEP** |
| `lastPassOrderId` | string | — | 신규 결제 컨텍스트 CAS | **KEEP** |
| `customerUid` / `paymentMethod` / `lastBillingAt` / `lastBillingStatus` | - | 192/3, 192/4, 187/4, 194/194 | 정기결제 흔적 | **UNKNOWN** |
| `cancelAtPeriodEnd` | bool | 203/**0** | 자동갱신 취소 — **자동갱신 자체가 없다** | **SAFE_TO_REMOVE** |
| `cancelRequestedAt` | null | 201/**0** | 동일 | **SAFE_TO_REMOVE** |
| `nextBillingAt` | null | 190/**0** | 정기결제 스케줄 — 구동 잡 없음 | **SAFE_TO_REMOVE** |
| `lastBillingError` | string | 192/**0** | 동일 | **SAFE_TO_REMOVE** |

```
tier 분포:     free=208, (없음)=27, family=7, premium=2, vvip=1
passTier 분포: (없음)=166, ""=72, family=7
활성 이용권 7건 / 만료 이용권 3건
```

> **이용권은 30일·자동갱신 없음** 정책인데(`CLAUDE.md`), `cancelAtPeriodEnd`·`cancelRequestedAt`·`nextBillingAt`·`lastBillingError` 4개는 자동갱신 구독을 전제한 필드다. 203·201·190·192개 문서에 존재하면서 **의미 있는 값은 단 하나도 없다.** 워커에 정기결제 잡도 없고 이용권 해지 엔드포인트도 없다 → 정책과 스키마의 불일치.

### 월정석 (`membershipCredit*`)

| 필드 | 존재/의미 | 분류 |
|---|---|---|
| `membershipCreditLots[]` | 95/**27** | 🔴 **KEEP** — 차감 원자성의 유일한 근거 |
| `membershipCreditLotsVersion` | 95/71 | 🔴 **KEEP** — 낙관적 락 카운터 |
| `membershipCreditBalance` | 99/27 | **KEEP** (lots 합계의 파생 캐시) |
| `membershipCreditGranted` / `membershipCreditUsed` | 99/95, 93/13 | **KEEP** |
| `legacyCoinCreditSeeded` / `SeededAt` / `SeededPoints` | 97/94, 95/17, 97/17 | **KEEP** — 재지급 방지 마커 |

```
잔액 보유 27계정 / 잔액 합계 1,035,099
누적 지급 21,350,444  ·  누적 사용 303,250
lot 배열 최대 길이 1 (평균 0.11)
```

> **지급 21,350,444 대비 잔액 1,035,099 · 사용 303,250** — 20배 이상 차이는 `scripts/migrations/20260730-zero-heavy-monthly-credit-balances.mjs`(대량 지급 계정 잔액 0 처리)가 이미 한 번 돈 흔적으로 보인다. `membershipCreditGranted` 는 누적값이라 되돌아가지 않는다. **정합성 오류가 아니다.**

---

## E. 콘텐츠 해금·프로필

| 필드 | 존재/의미 | 코드 | 분류 |
|---|---|---|---|
| `unlockedFeatures[]` | 207/**10** | `recordUserPaidFeature`(`payments.js:1537`), `paid-feature-access.js:331` | 🔴 **KEEP** |
| `paidFeatures[]` | 76/**1** | 같은 곳에서 `$addToSet` 동시 기록 | **KEEP** |
| `recentConsumeRequestIds[]` | 202/21 | 결제 멱등 마커. `$slice:-200` | **KEEP** |
| `destinyProfiles[]` | 199/**6** | Mixed 배열 | **UNKNOWN** |
| `destinyProfilesCurrentId` | 201/43 | 현재 선택 프로필 | **KEEP** |
| `destinyProfilesLockedCurrentId` / `LockedAt` | 95/27 | 프로필 잠금 | **KEEP** |
| `destinyProfilesCurrentIdUpdatedAt` | 36/5 | | **KEEP** |
| `tamagotchi` | 92/**0** | 읽는 코드 없음 | **SAFE_TO_REMOVE** |

```
배열 최대 길이: recentConsumeRequestIds 224 · unlockedFeatures 22 · paidFeatures 2 · destinyProfiles 1
해금 보유 10계정 · 해금 키 34종 (상위: section_daewun 4명, flower-fc 4명, rpt_skillTreeCard 4명)
```

### 🟡 `recentConsumeRequestIds` 최대 길이가 224 — 상한 200을 넘었다

`RECENT_CONSUME_REQUEST_ID_CAP = 200`([models.js:13](../../worker/lib/models.js))이고 모든 쓰기가 `$push … $slice:-200` 를 쓴다는 전제인데, **실제로 224개짜리 문서가 있다.** `$slice` 없이 `$push` 하는 경로가 하나 이상 존재한다는 뜻이다. `models.js:10-11` 주석이 경고한 "레거시 `server/routes/fortune.routes.js` 와 수치가 갈리면 작은 쪽이 큰 쪽의 유효 마커를 축출한다"는 상황의 전조다.
→ **별도 조사 필요(이번 범위 밖).** 결제 멱등성에 영향을 줄 수 있으므로 [04 위험](04-migration-and-rollback.md#-예상-위험)에 기록했다.

### 🟡 `unlockedFeatures` 10계정 vs `paidFeatures` 1계정

둘은 `recordUserPaidFeature`(`payments.js:1537-1552`)에서 **함께** `$addToSet` 되어야 하는데 9계정이 어긋나 있다. 해금 판정은 `unlockedFeatures` 만 보므로(`paid-feature-access.js`) **사용자 피해는 없다.** `paidFeatures` 는 사실상 쓰이지 않는 중복 필드다 → 통합 후보이나 **지금은 `KEEP`** (권한에 닿는 필드는 근거 없이 건드리지 않는다).

---

## F. 개인정보 (요청서 9번)

| 필드 | 존재/의미 | 저장 형태 실측 | 분류 |
|---|---|---|---|
| `phoneNumber` | 89/**33** | 🔴 **평문 32건 / 암호화 봉투 1건 / 빈값 212건** | **KEEP** (PG 결제 필요) |
| `birthDate` / `birthTime` | 245/240 | 평문. **JWT 액세스 토큰 클레임에도 실림**(`worker/lib/auth.js:691`) | **KEEP** |
| `gender` | 245/240 | `OTHER=218, F=16, M=6, ""=5` | **KEEP** |
| `guardianConsent.guardianEmail` / `.consentIp` | 10/**0** | 미수집 | **SAFE_TO_REMOVE** |

### 🔴 평문 전화번호 32건

```
phonePlaintext: 32   phoneEncrypted: 1   phoneEmpty: 212
```

스키마([models.js:22](../../worker/lib/models.js))는 평문 `01…` 과 AES-256-GCM 봉투 `v1:<iv>:<ct>` 를 **둘 다** 허용한다. 신규 쓰기는 봉투지만 기존 행 마이그레이션(`scripts/migrate-encrypt-user-phone.mjs`)이 사실상 실행되지 않아 **평문이 32건, 봉투는 1건뿐**이다.

- 전화번호는 PG 결제에 필요하므로 **삭제 대상이 아니다.** 필요한 것은 암호화 마이그레이션 실행이다.
- `migrate-encrypt-user-phone.mjs` 는 dry-run 기본 / `--apply` 옵트인이며 헤더에 "실행 전 백업 확보" 경고가 있다. **이번 감사 범위 밖이지만 우선순위가 높다.**

### 🟡 JWT 액세스 토큰에 생년월일·성별·포인트가 실린다

`signAuthToken`(`worker/lib/auth.js:680-701`)이 `birthDate/birthTime/gender/points` 를 클레임에 넣는다. JWT 는 서명만 되고 암호화되지 않으므로 브라우저 저장소나 로그에 그대로 노출된다. 모바일 앱은 이 토큰을 `localStorage` 에 보관한다(`app/_lib/auth-client.ts:155-195`). → 개인정보 최소화 관점의 개선 후보.

### `legalConsents` — 245건 중 7건만 존재, 5건만 값이 있다

```
termsVersion 분포: (없음)=238, 2026-04-11=5, ""=2
privacyVersion 분포: (없음)=238, 2026-08-04=5, ""=2
```

현행 동의 버전 기록 체계(`auth.js:2582-2605`) 도입 이후 가입한 계정이 5건뿐이라는 뜻이다. **238계정은 현행 약관·개인정보 동의 버전 기록이 없다.** 삭제 대상이 아니라 **보완이 필요한 결손**이다.

---

## G. 스키마에 선언됐지만 전 계정이 기본값인 필드 (41개)

전체 목록은 [raw/users-fields.json](raw/users-fields.json) `allDefaultFields`. 요약:

| 그룹 | 필드 | 존재 문서 | 분류 |
|---|---|---:|---|
| 2FA·구 관리자 | `twoFA.enabled/totpSecret/backupCodesHash`, `adminRefreshTokenHash`, `adminLastActivityAt` | 205 | **SAFE_TO_REMOVE** |
| 구 라이선스 | `licenses.standard/premium/vvip/expiresAt` | 75 | **SAFE_TO_REMOVE** |
| 구 월 구독 | `monthlySubscription.active/tier/startedAt/expiresAt` | 75 | **SAFE_TO_REMOVE** |
| 자동갱신 | `profileSubscription.cancelAtPeriodEnd/cancelRequestedAt/nextBillingAt/lastBillingError` | 190~203 | **SAFE_TO_REMOVE** |
| 유료 진입 플래그 | `has_started_paid_service`(인덱스 있음), `first_service_access_date` | 213, 212 | **ARCHIVE_FIRST** |
| 미성년 동의 | `guardianConsent.required/method/guardianEmail/consentIp/requestedAt/consentedAt/revokedAt` | 10 | **SAFE_TO_REMOVE** |
| 기타 | `tamagotchi` | 92 | **SAFE_TO_REMOVE** |

> `has_started_paid_service` 는 `index:true` 로 **실제 인덱스까지 만들어져 있는데 213건 전부 `false`** 다. 인덱스가 아무 선택도를 주지 못한다.

---

## H. 스키마 충돌 — 실측 증거

`users` 에는 **워커 스키마에 존재하지 않는 필드 24개**가 실재한다.

### H-1. `app/_lib/models/UserModel.js` 가 만든 문서 9건

아래 13개 필드가 **정확히 9건씩** 함께 존재한다 — 세 번째 User 스키마(`app/_lib/models/UserModel.js:24`)의 지문이다.

`lastLoginAt` · `bannedAt` · `banReason` · `destinyCurrentProfileId` · `profileSubscription.status` · `.autoRenewEnabled` · `.currentPeriodStart` · `.currentPeriodEnd` · `.priceCoins` · `.freeServiceThresholdCoins` · `.lastRenewedAt` · `.lastRenewalFailedAt` · `.renewalFailReason`

출처는 이 모델을 쓰는 시드 스크립트 4종(`seed-test-account.mjs`, `seed-inicis-test-account.mjs`, `verify-test-account-payment-flow.mjs`, `verify-all-paid-services-payment-flow.mjs`)이다. **런타임 라우트는 이 모델을 쓰지 않는다.**

- ⚠️ `banReason`/`bannedAt` 은 **회원 잠금 기능이 있다는 착각을 부른다.** 실제 잠금 로직은 코드 어디에도 없고 값도 전부 비어 있다.
- 분류: **SAFE_TO_REMOVE** (단, 9건이 테스트 계정이라는 전제 확인 필요 → `UNKNOWN` 로 두고 [04](04-migration-and-rollback.md)에서 계정 목록 확인 후 확정)

### H-2. 네이티브 드라이버로 쓰여 실제로 남은 유령 필드

mongoose strict 를 우회하는 `User.collection.*` 경로라 스키마에 없어도 저장된다.

| 필드 | 건수 | 출처 | 분류 |
|---|---:|---|---|
| `usagePasses` | **48** | 구 이용권 카운터. **읽는 코드 0건** | **SAFE_TO_REMOVE** |
| `profileSubscription.passRemainingUses` / `passTotalUses` / `passUsedCount` | **40** | 동일. `scripts/verify-billing-pass-policy.mjs:538` 이 이 이름의 **부활을 금지**하는 가드까지 두고 있다 | **SAFE_TO_REMOVE** |
| `metadata` | 5 | 출처 불명 | **UNKNOWN** |
| `profileSubscription.updatedAt` | 4 | `consumeTierPassIfAvailable`(`billing.js:866-929`)가 `$set` 하지만 스키마 미선언 | **KEEP** (쓰는 코드가 살아 있음 → **스키마에 추가**가 맞다) |
| `referralCode` / `referralCodeCreatedAt` / `referralProgram` | 3 | 카카오 추천 보상(`worker/routes/auth.js:349-486`) | **KEEP** (스키마에 추가 권장) |
| `phoneUpdatedAt` | 3 | `auth.js:2501` | **KEEP** (스키마에 추가 권장) |
| `profileMe` | 1 | 출처 불명 | **UNKNOWN** |

> **여기서 나뉘는 두 갈래를 혼동하지 말 것**
> - `usagePasses` / `passRemainingUses` 계열 = **읽지도 쓰지도 않는 죽은 잔량** → 제거 대상
> - `referralProgram` / `phoneUpdatedAt` / `profileSubscription.updatedAt` = **살아 있는 코드가 지금도 쓰는 값인데 스키마에만 없는 것** → 제거가 아니라 **스키마에 선언을 추가**해야 한다. 지금 상태로는 mongoose 경유 쓰기가 조용히 버려질 수 있다.

### H-3. 코드상 확정, 데이터상 미발현

`worker/routes/app-store.js:790-792` 는 Google Play 이용권 구매 시 `profileSubscription.status` / `.subscriptionStatus` / `.membershipStatus` 를 `findByIdAndUpdate` 로 `$set` 한다. 이 3개는 워커 스키마([models.js:92-149](../../worker/lib/models.js))에 없어 **mongoose strict 가 조용히 버린다.**

- 실측: `subscriptionStatus`·`membershipStatus` 는 DB에 **0건** → 코드 분석대로 실제로 버려지고 있다(또는 아직 Play 이용권 구매가 없었다).
- `profileSubscription.status` 9건은 H-1(시드 스크립트) 출처이지 app-store 경로가 아니다.
- 판정: **결함은 실재하나 아직 피해가 발생하지 않았다.** Google Play 이용권 구매가 시작되기 전에 고쳐야 한다. → [04 위험](04-migration-and-rollback.md#-예상-위험)

---

## ③ 실제 사용 중인 field (요약)

**회원**: `email` `name` `role` `status` `withdrawnAt` `joinedAt` `createdAt` `updatedAt` `passwordHash` `profileImage` `phoneNumber` `birthDate` `birthTime` `gender`
**인증**: `socialAccounts.{google,naver,kakao}.{id,connectedAt}` `localAuth.{enabled,activatedAt}` `legalConsents.*`
**이용권**: `profileSubscription.{tier,source,passTier,maxCoveredCoin,freeLimit,passLimit,profileLimit,planId,productType,durationMonths,startedAt,expiresAt,firstSubAt,premiumUseCycleKey,premiumUseCount,monthlySpendCoin,lastPassOrderId,lastBillingStatus}`
**월정석**: `profileSubscription.{membershipCreditLots,membershipCreditLotsVersion,membershipCreditBalance,membershipCreditGranted,membershipCreditUsed,legacyCoinCreditSeeded*}`
**해금·프로필**: `unlockedFeatures` `paidFeatures` `recentConsumeRequestIds` `destinyProfiles*`
**레거시이나 살아 있음**: `points`(환불 경로만)

## ④ legacy 의심 field (제거 후보)

`twoFA.*`(3) · `adminRefreshTokenHash` · `adminLastActivityAt` · `licenses.*`(5) · `monthlySubscription.*`(6) · `tamagotchi` · `guardianConsent.*`(7, `status` 제외) · `profileSubscription.{cancelAtPeriodEnd,cancelRequestedAt,nextBillingAt,lastBillingError}` · `usagePasses` · `profileSubscription.{passRemainingUses,passTotalUses,passUsedCount}` · `has_started_paid_service` · `first_service_access_date` · H-1 의 9건 계열 13개

## ⑤ 삭제하면 안 되는 field

🔴 `points` · `unlockedFeatures` · `paidFeatures` · `profileSubscription.membershipCreditLots` · `membershipCreditLotsVersion` · `membershipCreditBalance/Granted/Used` · `legacyCoinCreditSeeded*` · `recentConsumeRequestIds` · `profileSubscription` 이용권 계열 전부 · `email` · `passwordHash` · `socialAccounts.*` · `phoneNumber` · `status` · `withdrawnAt` · `legalConsents.*` · `role`

## ⑥ 현재 정책과 맞지 않는 데이터

| 항목 | 실측 | 성격 |
|---|---|---|
| `status` 필드 결손 | 37건 | 🔴 관리자 조회 사고 유발 |
| `role:"admin"` 부재 | 0명 | 🔴 관리자 행위 추적 불가 |
| 평문 전화번호 | 32건 | 🔴 개인정보 |
| 쓸 수 없는 코인 잔액 | 160계정 / 20억 코인 | 🔴 정책 결정 필요 |
| 자동갱신 전용 필드 | 190~203건 전부 빈값 | 🟡 정책-스키마 불일치 |
| 현행 동의 버전 결손 | 238건 | 🟡 보완 필요 |
| `profileSubscription` 자체가 없는 계정 | 26건 | 🟡 (245-219) |
| `licenses`/`monthlySubscription` 껍데기 | 75건 | 🟡 |
| `gender` 미수집 | `OTHER` 218건 | 🟡 사실상 수집 안 됨 |
| `recentConsumeRequestIds` 상한 초과 | 최대 224 (상한 200) | 🟡 별도 조사 |
| `unlockedFeatures` vs `paidFeatures` 불일치 | 10 vs 1 | 🟡 피해 없음 |
