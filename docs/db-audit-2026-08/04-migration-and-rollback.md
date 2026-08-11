# ⑩⑪⑫ migration 계획 · 예상 위험 · rollback 계획

> 이 문서는 **계획서**다. 이번 감사에서 실행한 마이그레이션은 없다.
> 🔴 아래 어느 단계도 사용자 승인 없이 실행하지 않는다.

---

## ⑩ migration 계획

### 진행 원칙

1. **스키마 변경과 데이터 변경을 같은 PR에 넣지 않는다.** 요청서 13번.
2. **선언 제거 → (관찰 기간) → 문서 `$unset`** 순서. 반대로 하면 롤백 시 값이 이미 없다.
3. 모든 데이터 스크립트는 **dry-run 기본 / `--apply` 옵트인**. 정본: `scripts/migrate-encrypt-user-phone.mjs`, `scripts/migrate-ziwei-entitlement-service-key.mjs`.
4. 각 마이그레이션에 `--check` 짝을 만들고 `package.json` 에 `migrate:X` / `verify:X` 로 등록한다. 정본: `scripts/migrations/20260810-add-point-history-feature-lookup-index.mjs`.
5. `DO_NOT_DELETE` 컬렉션([01 B](01-collection-inventory.md#b-do_not_delete--결제권리법적-보존))은 전 단계에서 손대지 않는다.

### 단계

| Phase | 내용 | 상태 |
|:--:|---|---|
| **1** | 읽기 전용 분석 | ✅ **완료** — 이 보고서 |
| **2** | 미사용 field/collection 목록 확정 | ✅ **완료** — [02 ④](02-users-fields.md#-legacy-의심-field-제거-후보) · [01 C](01-collection-inventory.md#c-legacy--potentially_unused--모델-없는-19개). ⚠️ 단 `UNKNOWN` 4종(`metadata` · `profileMe` · H-1 계열 · 시드 계정 9건 성격)은 미확정 |
| **3** | 백업 | ⏸ **선행 필수 · 도구 없음** — 아래 참조 |
| **4** | 결함 수정 + 인덱스 (코드 PR, 데이터 무변경) | ⏸ |
| **5** | 데이터 보정 (`status` 백필, 전화번호 암호화) | ⏸ |
| **6** | read/write 검증 | ⏸ |
| **7** | 신구 데이터 대조 | ⏸ |
| **8** | legacy archive | ⏸ |
| **9** | 실제 `$unset` | ⏸ |

### Phase 3 — 백업 (🔴 도구가 없다)

레포 전체에 `mongodump`/`mongorestore` 참조가 **0건**이다. 백업/복원/내보내기 스크립트가 아무것도 없다. 유일한 언급은 `scripts/migrate-encrypt-user-phone.mjs:5` 의 "🔴 실행 전 MongoDB 백업을 확보할 것" 주석뿐 — **수동 Atlas 백업을 전제**하고 있다.

Phase 4 이후로 넘어가기 전에 필요한 것:
- Atlas 스냅샷 복원 가능 여부 확인 (M0 무료 티어는 자동 백업이 없다 — **현재 티어 확인 필요**)
- 최소한 `users` 245건 + `payments` 233건 + `content_entitlements` 1,384건의 JSON 덤프 (전체 26,128건도 소규모라 전량 덤프가 현실적이다)
- 덤프에는 개인정보가 포함되므로 레포에 커밋 금지, 보관 위치·기간 별도 결정

> **이것이 해결되기 전에는 Phase 5 이후를 시작하지 않는다.** 롤백 근거가 없는 상태에서의 데이터 변경은 요청서 11번 위반이다.

### Phase 4 — 코드 PR (데이터 무변경)

세 개의 독립 PR 로 나눈다. 각각 단독으로 롤백 가능해야 한다.

| PR | 내용 | CI 티어 |
|---|---|---|
| 4-a | `worker/routes/app-store.js:790-792` 의 미선언 3필드 `$set` 제거 + `auth.js:94` 정리 | critical (worker/·결제) |
| 4-b | 스키마 선언 추가: `referralCode` `referralCodeCreatedAt` `referralProgram` `phoneUpdatedAt` `profileSubscription.updatedAt` | critical |
| 4-c | 인덱스 3종 적용 — `npm run migrate:point-history-feature-lookup-index` · `20260804-add-permanent-unlock-index.mjs` · `checkout_funnel_events` TTL | critical |

4-c 는 인덱스 생성이므로 데이터 변경은 아니지만 **`permanent_unlock_index` 스크립트는 중복 사전 스캔을 포함**한다. 중복이 발견되면 unique 인덱스 생성이 실패하므로, 실패 시 중복 해소 방안을 먼저 사용자에게 보고한다.

### Phase 5 — 데이터 보정 (신규 스크립트 2개)

| 스크립트 | 대상 | 기대 변경 건수 |
|---|---|---|
| `scripts/migrations/<date>-backfill-user-status.mjs` | `{status:{$exists:false}}` → `$set {status:"active"}` | **정확히 37건** |
| `scripts/migrate-encrypt-user-phone.mjs --apply` (기존) | 평문 전화번호 → AES-GCM 봉투 | **정확히 32건** |

두 스크립트 모두 실행 전 대상 건수를 세고 **기대값과 다르면 즉시 중단**한다(요청서 11번).

### Phase 6~7 — 검증

Phase 5 직후 다음이 전부 통과해야 한다.

```
npm run verify:mongo-launch-indexes
npm run verify:billing-pass-policy
npm run verify:portone-single-payment
npm run verify:paid-gate-ui
npm run verify:payment-choice-parity
npm run verify:checkout-pass-card
npm run verify:paid-feature-billing-policy
npm run verify:phone-encryption
npm run audit:mongo-collections     # 컬렉션 67개 · 문서 수 대조
npm run audit:user-fields           # 필드 카운트 대조
```

**대조 기준선은 이 감사의 `raw/*.json` 이다.** 감사 스냅샷을 다시 뜬 뒤 diff 해서 의도한 항목 외에 바뀐 게 없는지 확인한다.

### Phase 8~9 — archive 후 실제 제거

- Phase 4-b 배포 후 **최소 2주 관찰**. 그 사이 `SAFE_TO_REMOVE` 필드에 쓰기가 발생하지 않는지 감사 스냅샷 재실행으로 확인한다.
- archive: 제거 대상 필드만 뽑아 `users` `_id` 와 함께 JSON 으로 보관(레포 외부).
- `$unset` 은 **필드 그룹 단위로 나눠** 실행한다. 한 번에 25개 경로를 지우지 않는다.
  1. `twoFA.*` + `adminRefresh*` (205건)
  2. `licenses.{standard,premium,vvip,expiresAt}` + `monthlySubscription.{active,tier,startedAt,expiresAt}` (75건)
  3. `profileSubscription.{cancelAtPeriodEnd,cancelRequestedAt,nextBillingAt,lastBillingError}` (190~203건)
  4. `guardianConsent.*`(7개) + `tamagotchi` (10건, 92건)
  5. `usagePasses` + `profileSubscription.{passRemainingUses,passTotalUses,passUsedCount}` (48건, 40건)
- 컬렉션 삭제(`POTENTIALLY_UNUSED` 12개)는 **가장 마지막**. 문서가 0건인 5개부터 시작한다.

---

## ⑪ 예상 위험

### 🔴 높음

| 위험 | 내용 | 완화 |
|---|---|---|
| **백업 부재** | 롤백 근거가 없다. Atlas 티어에 따라 자동 백업이 없을 수 있다 | Phase 3 을 하드 게이트로 둔다 |
| **`points` 20억 코인 처리** | 160계정의 재산권. 삭제·전환 어느 쪽도 되돌리기 어렵다 | 이번 범위에서 **손대지 않는다.** 정책 결정 후 별도 진행 |
| **`recentConsumeRequestIds` 상한 초과(최대 224)** | `$slice` 없는 `$push` 경로가 존재한다는 뜻. 결제 멱등 마커가 예상보다 빨리 축출되면 **중복 차감**이 가능하다 | **별도 조사 과제.** 이 감사 범위 밖이지만 결제 안전성에 직결되므로 우선 처리 권장 |
| **`permanent_unlock_identity` 부재** | 영구해금 중복 방지 장치가 없다. unique 인덱스 생성 시 기존 중복이 있으면 실패 | 스크립트의 사전 스캔 결과를 먼저 보고 |
| **`app-store.js` 미선언 필드** | Google Play 이용권 구매가 시작되면 상태 필드가 버려진 채 결제가 진행된다. 현재는 구매 실적이 없어 발현 전 | Phase 4-a 우선 처리 |

### 🟡 중간

| 위험 | 내용 | 완화 |
|---|---|---|
| **`status` 결손 37건** | 관리자 조회·일괄 처리에서 15% 누락 | Phase 5 백필. 그전까지는 `{$ne:"withdrawn"}` 로 조회 |
| **`migrate-withdraw-indexes.mjs` 오작동** | 실행하면 존재하지 않는 `point_histories`·`fortune_view_logs` 를 생성 | 실행 금지 표시. 컬렉션명 수정 후에만 실행 |
| **평문 전화번호 32건** | 개인정보 노출 | Phase 5 |
| **3중 User 스키마** | `server/models/User.js`·`app/_lib/models/UserModel.js` 가 같은 모델명으로 등록. 시드 스크립트 실행 시 워커에 없는 필드가 다시 생긴다 | 시드 스크립트를 워커 모델로 통일 (별도 과제) |
| **`UNKNOWN` 4종 미확정** | `metadata`(5) · `profileMe`(1) · H-1 계열(9) · 시드 계정 성격 | Phase 2 잔여. 확정 전 제거 금지 |

### ⚪ 낮음

- `checkout_funnel_events` TTL 부재로 545건 누적 — 익명 이벤트라 개인정보 위험 없음
- `POTENTIALLY_UNUSED` 12개 컬렉션(합계 60건 미만) — 방치해도 무해

### 회귀 위험이 있는 지점 (수정 시 반드시 확인)

`profileSubscription` 하위 필드 제거는 **공유 모듈 4곳**이 함께 읽는다 — `worker/lib/profile-limits.js` · `entitlement-policy.js` · `paid-feature-access.js` · `access-state.js`. 이 중 `profile-limits.js:327-338` 과 `entitlement-policy.js:159-169` 는 **레거시 필드까지 폴백으로 읽는다.** 필드를 지우면 폴백 분기가 조용히 다른 경로를 타므로, 제거 전 해당 폴백 목록에 대상 필드가 있는지 반드시 확인한다.

---

## ⑫ rollback 계획

### 모든 마이그레이션에 필수 기록

실행 전:

| 항목 | 예 |
|---|---|
| migration ID | `20260813-backfill-user-status` |
| 실행 시각 (UTC) | |
| 대상 document 수 (사전 count) | 37 |
| 백업 위치·해시 | |
| dry-run 출력 | 전량 첨부 |

실행 후:

| 항목 | |
|---|---|
| 실제 변경 document 수 | **사전 count 와 일치해야 한다** |
| 불일치 시 | **즉시 중단, 이후 단계 진행 금지** |

### 자동 검증 (실행 직후)

| 항목 | 기대값 (2026-08-12 기준선) | 확인 방법 |
|---|---|---|
| 회원 수 | 245 | `audit:user-fields` |
| 탈퇴 회원 수 | 1 | 동일 |
| 결제 기록 수 | 233 | `audit:mongo-collections` |
| 이용권 활성 계정 | 7 | `audit:user-fields` `policyMetrics.passActive` |
| 월정석 잔액 보유 계정 / 합계 | 27 / 1,035,099 | `policyMetrics.creditBalance*` |
| 영구해금 보유 계정 | 10 | `policyMetrics.hasUnlocks` |
| `points` 보유 계정 / 합계 | 160 / 2,002,956,304 | `policyMetrics.points*` |
| 관리자 계정 | 0 | `policyMetrics.admins` |
| 컬렉션 수 / 문서 수 | 67 / 26,128 | `audit:mongo-collections` |

**하나라도 다르면 마이그레이션을 중단하고 롤백한다.**

### 수동 검증 (Phase 6)

- 로컬 로그인 · 소셜 로그인 3종 · 회원가입
- 무료 이용(비로그인 1회 / 로그인 3회 — `guardianFortune*Usages`)
- 이용권 커버 통과 · PG 단건결제 · 월정석 차감
- 결제 후 권한 unlock · 재열람
- 자미두수 · 숙요점 · 베다점 · 점성술 · 초융합 사주 · AI 상담
- 회원 탈퇴
- 관리자 주문 조회 · 월정석 지급

### 롤백 절차

| 단계 | 롤백 방법 |
|---|---|
| Phase 4 (코드) | PR revert → main 머지 → 릴리스 워크플로가 자동 배포. 데이터 변경이 없어 무손실 |
| Phase 4-c (인덱스) | `dropIndex`. 인덱스는 파생물이라 재생성 가능, 데이터 손실 없음 |
| Phase 5 (`status` 백필) | 백필 스크립트가 변경한 `_id` 목록을 파일로 남기고, 롤백 시 그 목록에만 `$unset {status:""}` |
| Phase 5 (전화번호 암호화) | 🔴 **되돌릴 수 없다.** 복호화 키를 잃으면 데이터가 사라진다. 백업 필수 |
| Phase 9 (`$unset`) | archive JSON 에서 `_id` 별로 `$set` 복원 |
| 최후 수단 | 전체 DB 스냅샷 복원 |

> 🔴 **전화번호 암호화는 이 계획에서 유일하게 비가역적인 단계다.** 백업과 `PII_ENCRYPTION_KEY` 보관이 확인되기 전에는 실행하지 않는다.

### 배포 흐름 준수

모든 코드 변경은 `feature/*`·`chore/*` 브랜치 → PR → PR CI → 사용자 머지 → 자동 배포다. `main` 직접 push 와 로컬 프로덕션 배포는 차단되어 있다. 결제·인증·`worker/`·DB 스키마 경로가 걸리므로 **위 PR 은 전부 `critical` 티어**로 판정되어 전체 회귀 검증이 돈다.
