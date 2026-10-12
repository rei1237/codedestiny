# content_entitlements 유니크 인덱스 3종 — 확인·생성 절차

> 2026-10-13 작성. **절차 문서다 — 작성 과정에서 어떤 명령도 실행하지 않았다(DB 읽기 포함).**
> 인덱스 생성은 DB 쓰기이므로 사용자 승인 뒤에만 한다. 확인(읽기 전용)이 항상 먼저다.

## 왜 문서로 두는가

`worker/lib/db.js` 가 `autoIndex: false`([db.js:996](../worker/lib/db.js#L996), [db.js:1389](../worker/lib/db.js#L1389))라
`worker/lib/models.js` 의 `index(...)` 선언은 **인덱스를 만들지 않는다.** 선언이 있다는 것과 운영 DB 에 있다는 것은 별개고,
환경(운영·스테이징·로컬)마다 따로 확인해야 한다.

영구 해금 지급(`grantEntitlement`, [entitlements.js](../worker/payments/entitlements.js))의 중복 방지는 유니크 인덱스가 있을 때
DB 가 보장한다. 인덱스가 없으면 동시 upsert 가 두 행을 만들 수 있고(이때 E11000 이 나지 않으므로 코드의 재조회 폴백도
돌지 않는다), 월정석·이용권 경로의 `alreadyOwned` 판정이 흔들린다 — 결제 정합성 문제다.

## 세 인덱스

| # | 이름 | 키 | 유니크 필터(partial) | 선언 | 생성 수단 | 마지막 실측 |
|---|---|---|---|---|---|---|
| 1 | `userId_1_profileId_1_serviceKey_1_contentKey_1_scope_1` (기본 이름) | `{userId, profileId, serviceKey, contentKey, scope}` | 없음 | [models.js:522-525](../worker/lib/models.js#L522-L525) | 전용 스크립트 **없음**(§4-③) | 2026-08-16 존재(unique), [raw](db-cost-audit-2026-08-16/raw/collections.json) |
| 2 | `permanent_unlock_identity` | `{userId, profileId, featureKey, contentKey, scope}` | `featureKey` 가 비어 있지 않은 문자열 | [models.js:533-540](../worker/lib/models.js#L533-L540) | `scripts/migrations/20260804-add-permanent-unlock-index.mjs` | 2026-08-16 존재 — [03-index-and-ttl.md:46](db-cost-audit-2026-08-16/03-index-and-ttl.md) |
| 3 | `birth_unlock_identity` | `{userId, birthKey, serviceKey, contentKey}` | `scope: "BIRTH"` 이고 `birthKey` 가 문자열 | [models.js:544-551](../worker/lib/models.js#L544-L551) | `scripts/migrations/20261010-birth-scope-unlocks.mjs --create-index` | **미확인**(2026-10-10 도입, 이후 실측 없음) |

- 지급·조회가 쓰는 신원 필터는 1번과 같다(`identityFilter`, [entitlements.js:101-109](../worker/payments/entitlements.js#L101-L109)).
  출생 기반 행도 합성 `profileId`(`birth:<birthKey>`)와 `scope: BIRTH` 로 같은 필터를 탄다.
- 3번은 같은 정체성을 `birthKey` 로 한 번 더 못 박는 보강이다([models.js:542-543](../worker/lib/models.js#L542-L543)).
  없어도 1번이 같은 중복을 막는다. 대신 마이그레이션 `--apply` 이전 단계 가정(이 인덱스 존재)을 두는 코드가 있는지는
  스크립트 머리말의 운영 순서를 따른다.
- 🔴 `docs/db-index-usage-2026-08-24.md` 가 적었듯 유니크 인덱스는 조회 통계(`$indexStats` ops)가 0 이어도 **지우면
  제약이 사라진다.** ops=0 을 삭제 근거로 쓰지 않는다.

## 1. 확인(읽기 전용) — 먼저, 환경마다

### 1-0. 어느 DB 를 가리키는지부터

스크립트는 `.env.local` → `.env` 의 `MONGO_URI`(또는 `MONGODB_URI`)와 `MONGO_DB_NAME`(또는 `MONGODB_DB_NAME`·`DB_NAME`)을
읽는다. 실행 전에 **운영인지 스테이징인지** 확인한다. 연결 문자열 값은 터미널·로그·티켓에 붙여 넣지 않는다.

### 1-1. 2번 — `permanent_unlock_identity`

```bash
node scripts/migrations/20260804-add-permanent-unlock-index.mjs --check
```

- 읽기만 한다(`indexes()` + 중복 집계). **플래그 없이 실행하면 인덱스를 만든다** — 확인 목적이면 반드시 `--check`
  (또는 `--dry-run`)를 붙인다.
- 출력: `OK|MISSING permanent_unlock_identity`, `SCANNED_GROUPS n`, `CONFLICTING_ROWS n`, 마지막 `RESULT OK | MISSING_INDEX | DUPLICATES`.
  종료 코드 1 은 중복 또는(`--check` 일 때) 인덱스 없음이다.

### 1-2. 3번 — `birth_unlock_identity`

```bash
node scripts/migrations/20261010-birth-scope-unlocks.mjs --check
```

- 인덱스 존재와 중복만 본다. 기본(플래그 없음)은 `--dry-run` 이고 쓰기가 없지만, `--apply`·`--create-index` 는 쓴다.
- 출력: `OK|MISSING birth_unlock_identity`, `INDEX_DUPLICATE_GROUPS n`, `RESULT OK | MISSING_INDEX | DUPLICATES`.

### 1-3. 1번 — 기본 유니크 인덱스(전용 스크립트 없음)

`mongosh` 로 읽기 전용 두 가지:

```js
// 선언(models.js)과 같은 키·unique 인지 대조한다.
db.content_entitlements.getIndexes()

// 중복 사전 스캔 — 결과가 비어야 유니크 인덱스를 만들 수 있다. (missing 필드는 null 로 묶인다 = 인덱스 의미와 같다)
db.content_entitlements.aggregate([
  { $group: { _id: { userId: "$userId", profileId: "$profileId", serviceKey: "$serviceKey", contentKey: "$contentKey", scope: "$scope" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
  { $limit: 200 },
], { allowDiskUse: true })
```

### 1-4. 기록

확인한 날짜·환경·결과(이름과 건수만)를 아래 표에 남긴다. 값(userId 등 식별자)은 적지 않는다.

| 날짜 | 환경 | 1번 | 2번 | 3번 | 중복 그룹 수 | 확인자 |
|---|---|---|---|---|---|---|
| | | | | | | |

## 2. 결과별 판단

| 확인 결과 | 의미 | 다음 |
|---|---|---|
| 셋 다 존재 · 중복 0 | 정상 | 기록만 남긴다 |
| 존재하지만 중복 > 0 | 생성 시점 이후 제약이 깨졌다는 뜻이 아니다 — 필터가 다르거나 인덱스가 부분적일 수 있다 | `getIndexes()` 로 이름·키·partial 대조 후 보고 |
| 없음 · 중복 0 | 생성 가능 | §3 승인 요청 |
| 없음 · 중복 > 0 | 생성이 E11000 으로 실패한다 | §5 — 정리는 정책 판단, 자동 삭제 금지 |

## 3. 생성(승인 후에만)

사전 조건: §1 결과가 있고, 대상 환경의 중복이 0 이며, Atlas 스냅샷(또는 최근 백업) 시각을 확인했다.
컬렉션이 작다(2026-08-16 기준 1,384건)지만 **건수는 그 시점에 다시 센다.**

1. **1번(없을 때만)** — 전용 스크립트가 없다. 선언과 동일 옵션으로 만든다:
   ```js
   db.content_entitlements.createIndex(
     { userId: 1, profileId: 1, serviceKey: 1, contentKey: 1, scope: 1 },
     { unique: true },
   )
   ```
   (스크립트화가 필요하면 `20260804-…mjs` 를 본뜬다 — 중복 사전 스캔 → 생성 → 결과 한 줄.)
2. **2번** — 플래그 없이 실행하면 중복이 없을 때 만든다(`CREATED permanent_unlock_identity`):
   ```bash
   node scripts/migrations/20260804-add-permanent-unlock-index.mjs
   ```
3. **3번** — 스크립트 머리말의 운영 순서를 지킨다(🔴 **운영 승격 전에** 끝낸다):
   ```bash
   node scripts/migrations/20261010-birth-scope-unlocks.mjs            # --dry-run(기본): 계획·수치 검토
   node scripts/migrations/20261010-birth-scope-unlocks.mjs --apply
   node scripts/migrations/20261010-birth-scope-unlocks.mjs --create-index
   ```

생성 뒤 §1 을 다시 돌려 `OK` 와 `RESULT OK` 를 확인하고 §1-4 표에 적는다.

## 4. 롤백

`db.content_entitlements.dropIndex("<이름>")`. 단, 지우면 **그 인덱스가 하던 중복 방지가 사라진다**(§왜 문서로 두는가).
생성이 장애를 일으킨 경우가 아니면 지우지 않는다. 3번은 1번이 같은 정체성을 막고 있으므로 가장 부담이 작다.

## 5. 중복이 나왔을 때

- 스크립트는 중복을 **지우거나 고치지 않는다**(둘 다 같은 원칙). 어느 행이 이기는가는 정책 판단이다.
- 스캔 출력의 `DUP` 줄이 `userId profileId featureKey contentKey scope count=n` 을 준다. 같은 그룹의 행을 `status`
  (`ACTIVE`/`REFUNDED`)·`orderId`·`grantedAt` 으로 비교해, 환불된 행과 활성 행이 섞여 있는지부터 본다.
- 정리 쿼리를 쓰기 전에 대상 `_id` 목록을 보고서로 먼저 남기고 승인을 받는다. 결제(`payments`)·환불 이력과 연결된
  `orderId` 를 가진 행은 회계 근거다 — 삭제하지 않고 상태로 표시하는 쪽을 먼저 검토한다.

## 6. 코드 쪽 방어와 그 한계

- `grantEntitlement` 는 upsert 가 E11000 을 받으면 재조회로 접는다([entitlements.js:202-208](../worker/payments/entitlements.js#L202-L208)).
  **인덱스가 있을 때만** 쓸모가 있다.
- 인덱스가 없는 환경에서는 동시 요청이 두 행을 만들 수 있다. 따라서 "코드가 막아 준다"로 §1 확인을 대신하지 않는다.

관련: [db-cost-audit-2026-08-16/03-index-and-ttl.md](db-cost-audit-2026-08-16/03-index-and-ttl.md) ·
[db-index-usage-2026-08-24.md](db-index-usage-2026-08-24.md) ·
`scripts/migrations/20260804-add-permanent-unlock-index.mjs` · `scripts/migrations/20261010-birth-scope-unlocks.mjs`
