# ③ 인덱스와 TTL 실물 대조

> 실측: `listIndexes` 전수, 2026-08-16. 원자료 [raw/collections.json](raw/collections.json)
> `worker/lib/db.js:633` 이 `autoIndex:false` 이므로 **스키마 선언은 실재를 뜻하지 않는다.**

## 선언 81개가 실재하지 않는다 (2026-08-12 대비 +9)

핵심은 개수가 아니라 **어느 컬렉션에 걸려 있느냐**다. 문서 수를 곱해 정렬하면 이렇다.

| 컬렉션 | 문서 | 미생성 | 실익 판정 |
|---|---:|---:|---|
| `content_entitlements` | 1,384 | 1 (`{featureKey}`) | ⚪ 단일 필드 보조 인덱스. 이미 `{userId,serviceKey,status,expiresAt}` 복합이 있어 실사용 쿼리는 커버된다 |
| `checkout_funnel_events` | 588 | 4 (TTL 포함) | 🔴 **TTL 은 이번에 생성** — 나머지 3개는 관리자 조회용이라 실익 없음 |
| `paid_execution_records` | 33 | 1 (`{paymentId}` unique) | 🟡 정합성 항목. 문서 33건이라 급하지 않으나 중복 방지 의미는 있다 |
| `fortuneChatSessions` | 12 | 2 | ⚪ |
| `astrologyAiConsultations` | 9 | 1 (`{id}` unique) | 🟡 정합성 |
| `guardianFortuneAnonymousMerges` | 9 | 1 | ⚪ |
| `adminauditlogs` | 6 | 1 | ⚪ |
| `ziweiAiConsultations` · `lifeBookAiConsultations` · `karmaDestinyAiConsultations` | 각 2~4 | 각 1 | ⚪ |
| `masterLoveCodexSessions` | **1** | **11** | ⚪ 문서 1건. 선언만 화려하다 |
| `nakshatraAiConsultations` | **1** | **8** | ⚪ 동일 |
| `cmsentries` | 1 | 3 | ⚪ |
| 나머지 | 0 | 다수 | ⚪ 문서 0건 |

**판정: 지금 만들 실익이 있는 인덱스는 없다.** 요청서 §8("인덱스 개수를 줄이는 것 자체를 목표로
하지 말고 실제 workload 에 맞는 최소 구성") 에 따라, 문서 수가 유의미하게 늘어난 컬렉션이
생겼을 때 그 컬렉션에 한해 만든다.

🔴 단, `{id} unique` · `{paymentId} unique` 계열은 **성능이 아니라 정합성**이다. 문서가 적다고
안전한 것이 아니라 "아직 중복이 안 났을 뿐"이다. 해당 기능 작업 시 함께 처리할 것.

> ✅ **2026-08-24 처리 완료.** `paid_execution_records.paymentId_unique_nonempty` 와
> `astrologyAiConsultations.id_1` 을 만들었다(둘 다 `[unique,partial]`).
> 🔴 astrology 쪽은 **첫 설계가 실 데이터에 대고 돌릴 수 없는 것이었다** — 전체 9건 중 8건이
> `id` 필드를 아예 갖고 있지 않아 필터 없는 유니크 인덱스는 그 8건이 서로 충돌해 생성 자체가
> 막혔다. 중복 사전 스캔이 승인·실행 전에 잡았다. 상세: [db-index-usage-2026-08-24.md](../db-index-usage-2026-08-24.md).

## 2026-08-12 기록의 정정

[db-audit-2026-08/05-execution-log.md:71-82](../db-audit-2026-08/05-execution-log.md) 이
"미실행"으로 남긴 인덱스 3종을 실측했다.

| 인덱스 | 문서 기록 | 2026-08-16 실측 |
|---|---|---|
| `pointhistories.user_kind_feature_lookup` `{userId,kind,featureKey,createdAt:-1}` | 🔴 미실행 | ✅ **존재** |
| `content_entitlements.permanent_unlock_identity` (unique, partial) | 🔴 미실행 | ✅ **존재** |
| `checkout_funnel_events` `createdAt` TTL 90일 | 🟡 미실행 | ❌ 없음 → **이번에 생성** |

`pointhistories` 는 현재 인덱스 10개를 갖고 있고 그중 3개가 `userId` 접두를 공유한다
(`{userId}` · `{userId,createdAt:-1}` · `{userId,kind,createdAt:-1}` · `{userId,kind,featureKey,createdAt:-1}`).
단일 `{userId}` 는 나머지 복합 인덱스의 접두라 **완전히 중복**이다.

🔴 그럼에도 **삭제하지 않는다.** 19,684건 × 인덱스 1개의 RAM·쓰기 비용은 M10 에서 무시할 수준이고,
삭제가 잘못됐을 때 되돌리는 비용(19,684건 재빌드)이 절감액보다 크다. 요청서 §7 의 삭제 기준 6개 중
"실제 운영 환경에서 사용되지 않는다는 근거"를 `$indexStats` 로 확인하지 않았으므로 **보고만 한다.**

> 🔴 **2026-08-24 해소 — 위 문단은 더 이상 현재 상태가 아니다.** 그 `$indexStats` 실측을 했고
> (관측 창 12일: `userId_1` ops=0, `user_kind_feature_lookup` ops=33), `pointhistories.userId_1` 은
> **드롭했다.** 같은 실행에서 `security_events` 보조 인덱스 9개도 드롭했다 — 그 모델은 읽기 호출이
> 코드에 아예 없다. 근거·수치·남긴 56개의 목록은 [db-index-usage-2026-08-24.md](../db-index-usage-2026-08-24.md).
>
> 🔴 그 문서가 이 문단보다 중요하게 기록한 것: **`ops=0` 은 삭제 근거가 아니다.** 트래픽이 없어서
> 0인 인덱스와, 유니크 제약이라 조회 통계에 안 잡혀 0인 인덱스가 섞여 있다. 후자를 지우면 제약이
> 사라진다.

## TTL 현황

### 실재하는 TTL 인덱스 10종 (2026-08-16)

`abuse_scores` · `app_purchase_intents` · `fusionFortuneGenerationAttempts` ·
`guardianFortuneGenerationAttempts` · `idempotency_keys` · `llm_response_cache` ·
`premium_runtime_store` · `refresh_tokens` · `serviceexecutiontransactions.retentionUntil` ·
**`checkout_funnel_events.createdAt_ttl_90d`** ← 이번 작업으로 추가

### 이번에 생성한 TTL — 안전 확인 기록

`checkout_funnel_events` 는 스키마가 90일 TTL 을 선언(`worker/lib/models.js:547`)했지만 실물이 없어
**자동 삭제가 한 번도 돈 적이 없었다.**

생성 전에 즉시 삭제될 문서를 먼저 셌다(읽기 전용):

```
total: 588,  wouldDeleteNow: 0,  missingCreatedAt: 0,  oldest: 2026-07-31T16:47:59.388Z
```

최고령이 16일 전이라 **삭제 0건**이었고, 생성 후 문서 수도 588건 그대로다.
개인식별자를 저장하지 않는 익명 집계 이벤트라 권리·법적 보존 문제도 없다.

```bash
node scripts/migrations/20260812-add-checkout-funnel-ttl-index.mjs          # 생성
node scripts/migrations/20260812-add-checkout-funnel-ttl-index.mjs --check  # OK (검증 완료)
```

### 선언됐지만 없는 TTL — 남은 것

| 컬렉션 | 선언 | 판정 |
|---|---|---|
| `guardianFortuneSharedSnapshots` | `expiresAt` | ✅ **2026-08-24 실측 해소** — `20260821` 마이그레이션이 이미 적용돼 있다(`--check` problems=0). TTL 3종 + `shareId`/`sourceRequestId` unique 전부 실재 |
| `deleted_account_logs` | 5년 | 🔴 **법적 보존 기간 장치**다. 비용 항목이 아니라 컴플라이언스 항목 |
| `payments._anonymizedAt` | 5년 | 🔴 동일 |

`scripts/migrate-withdraw-indexes.mjs` 가 뒤 둘을 만든다. PR #484 에서 컬렉션명을 런타임과 맞추고
미존재 컬렉션 가드를 넣었으나 **아직 실행되지 않았다.** 이는 비용 절감 작업의 범위 밖이므로
[db-audit-2026-08/05-execution-log.md:93](../db-audit-2026-08/05-execution-log.md) 의 후속 과제로 남긴다.

### 🔴 TTL 을 적용하지 않는 것

요청서 §9 의 금지 목록 그대로다. `payments` · `pointhistories`(19,684건, 결제 증빙 겸 멱등 원장) ·
`monthly_credit_ledger` · `content_entitlements` · `paid_execution_records` ·
`payment_webhook_events` · `paymentfailurelogs` · `users`.

`security_events`(3,301건, 0.95 MB)는 로그 성격이라 TTL 후보로 보일 수 있으나, **보안 사고 조사에
필요한 기록**이고 보존 정책이 정해져 있지 않다. 정책 결정 전까지 **후보로만 기록**한다.

## 검증

```bash
npm run verify:mongo-launch-indexes    # 20개 런치 모델의 선언 vs 실물 (읽기 전용, MONGO_URI 필요)
npm run audit:mongo-collections        # 전체 인벤토리 (읽기 전용)
npm run verify:checkout-funnel-ttl     # 이번에 만든 TTL
npm run verify:daehan-purchase-index   # 신규 — daehan_purchases unique
```

이들은 전부 `verify-guard-wiring.mjs` 의 `UNWIRED_BY_DESIGN` 에 **"실 DB 인덱스 점검 — MONGO_URI 필요"**
사유로 선언돼 있다. CI 러너에는 프로덕션 DB 접근이 없고, 있어서도 안 된다.
