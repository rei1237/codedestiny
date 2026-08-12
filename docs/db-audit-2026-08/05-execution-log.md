# 실행 기록 — 2026-08-12

> 이 문서는 [01](01-collection-inventory.md)~[04](04-migration-and-rollback.md)의 계획 중 **실제로 실행한 것**을 남긴다.
> 앞 문서들의 수치는 **실행 이전 기준선**이므로 현재 DB 상태와 다르다.

## 무엇을 실행했나

프로덕션 `code_destiny` 에 아래 순서로 적용했다. 전부 `--apply` 옵트인이며, 각 스크립트가 변경 전 이미지를 남겼다.

| 순서 | 스크립트 | 결과 |
|:--:|---|---|
| 0 | `npm run backup:mongo` | 전량 백업 — 67 컬렉션 / 26,135건 |
| 1 | `migrate:legacy-points --apply` | 봉인 **142** · 잔액0 **159** · 원장 **159** · 건너뜀 1 · 실패 0 |
| 2 | `migrate:user-status-backfill --apply` | matched/modified **37** |
| 3 | `migrate:ghost-user-fields --group legacy-pass-counters --apply` | **48** |
| 3 | `migrate:ghost-user-fields --group third-schema --apply` | **11** |
| 3 | `migrate:ghost-user-fields --group unknown-origin --apply` | **6** |
| 4 | `migrate:truncate-consume-ids --apply` | **2** |

1번의 "건너뜀 1"은 오너 계정이다 — 이미 봉인돼 있고 잔액 유지 대상이라 쓸 것이 없었다(정상).

## 전후 대조

| 항목 | 실행 전 | 실행 후 |
|---|---:|---:|
| 미봉인 계정(월정석 자동발행 위험) | **142** | **0** |
| `points > 0` 계정 / 합계 | 160 / 2,002,956,304 | **1 / 600** (오너) |
| `status` 결손 | 37 | **0** |
| `users` 실재 필드 경로 | 129 | **110** |
| 전 계정 기본값뿐인 필드 | 41 | **27** |
| `recentConsumeRequestIds` 최대 길이 | 224 | **200** |
| 평문 전화번호 / 봉투 | 32 / 1 | **32 / 1** (미실행) |

**변하지 않아야 할 것 — 전부 유지됐다**: 회원 245 · 탈퇴 1 · `payments` 234 · 이용권 활성 7 · 월정석 잔액 27계정 / 1,035,099 · 영구해금 10계정 · `content_entitlements` 1,384 · `monthly_credit_ledger` 368 · 컬렉션 67개.

`pointhistories` 만 19,524 → **19,683**(+159)으로 늘었다. 이번에 남긴 `kind:"adjust"` 감사 원장 행 수와 정확히 일치한다. **기존 증빙은 한 건도 삭제하지 않았다.**

## 복구 자료

레포 밖 `D:\Development\codedestiny-backups\` 에 보관(개인정보 포함 — 검증 후 파기 대상).

- `20260812-pre-migration/` — 실행 직전 전량 백업. 컬렉션별 canonical EJSON + `manifest.json`(문서 수·인덱스·sha256)
- `20260812-migration-artifacts/` — 마이그레이션별 변경 전 이미지 6개 + 실행 후 감사 스냅샷 2개

정밀 롤백은 변경 전 이미지로 해당 문서의 해당 필드만 되돌린다. 전량 백업은 최후 안전망이다.

## 실행하지 않은 것

### 🟡 전화번호 암호화 32건 (보류)

`scripts/migrate-encrypt-user-phone.mjs --apply`. 이 작업에서 **유일하게 비가역**인 단계라 별도 판단으로 미뤘다.

준비는 끝나 있다:
- `npm run verify:phone-encryption-key` 통과 — 라이브 워커가 만든 봉투 1건이 로컬 키로 복호화됨(= `PII_ENC_KEY` 가 프로덕션과 일치)
- PortOne 으로 가는 읽기 경로 5곳 전부 복호화가 배선돼 있음(`payments.js` `buildSinglePaymentCustomer` 외)
- 전량 백업 확보

**기능상 급하지 않은 이유**: `decryptPhoneNumber` 는 봉투가 아니면 평문으로 간주해 그대로 통과시킨다(`worker/lib/pii-crypto.js:104`, 하위호환 읽기). 32건이 평문이어도 결제·조회는 정상 동작한다.

**그래도 남는 문제**: 가입 화면 문구와 개인정보처리방침이 "AES-256 암호화 보관"을 안내한다(`scripts/verify-phone-encryption.mjs` 12번 단언). 그 32건에 대해서는 고지와 실제가 다르다. 기능 결함이 아니라 고지 정합성 문제이며, 나중에 언제든 처리할 수 있다.

실행할 때는 반드시 이 순서로:
```
npm run backup:mongo -- --out backups/mongodb/<date>
npm run verify:phone-encryption-key
node scripts/migrate-encrypt-user-phone.mjs --limit=1 --apply   # 1건 시범
#   → 해당 계정의 GET /api/me/payment-phone 확인
node scripts/migrate-encrypt-user-phone.mjs --apply             # 나머지
```

### 인덱스 3종 (미실행)

[03 ⑨](03-target-model-and-admin.md#-필요한-index)에서 필요하다고 판단한 것들. 계획만 있고 돌리지 않았다.

| 우선 | 대상 | 명령 |
|:--:|---|---|
| 🔴 | `pointhistories.user_kind_feature_lookup` (19,683건 스캔 중) | `npm run migrate:point-history-feature-lookup-index` |
| 🔴 | `content_entitlements.permanent_unlock_identity` (중복 방지, 정합성) | `node scripts/migrations/20260804-add-permanent-unlock-index.mjs` |
| 🟡 | `checkout_funnel_events` 90일 TTL | 별도 |
| — | `adminauditlogs` (PR #486 신설) | `npm run migrate:admin-audit-log-indexes` |

`permanent_unlock_identity` 는 unique 라 기존 중복이 있으면 **실패한다**. 스크립트에 사전 스캔이 있으니 결과를 먼저 볼 것.

### `role:"admin"` 부여 (미실행)

`npm run admin:grant-role -- --email <addr> --apply`. 실행 전 부작용을 화면에 출력한다 — 유료 AI 32개 지점 무료 통과 + 임의 주문 취소/환불 권한이 붙어, 그 계정으로는 유료 결제 실환경 테스트가 불가능해진다.

현재 프로덕션 `role:"admin"` 계정은 **0명**이며, 관리자 감사 로그(PR #486)는 배포돼 있으나 행위자가 공유 세션(`flower-admin:<jti>`)으로만 기록된다.

## 후속 확인 과제

- **며칠 뒤 `npm run verify:truncate-consume-ids`** — 다시 200을 넘으면 아직 찾지 못한 상한 없는 쓰기 경로가 실재한다는 뜻이다. 현재 판단은 "2026-07-16 이전 `$addToSet` 잔재"이고, 이 재확인이 유일한 확실한 검증 수단이다.
- **`scripts/migrate-withdraw-indexes.mjs`** — PR #484 에서 컬렉션명을 런타임과 맞추고 미존재 컬렉션 가드를 넣었지만 **아직 실행하지 않았다**. 실행하면 법적 보존용 TTL(`deleted_account_logs` 5년, `payments._anonymizedAt` 5년)이 생긴다. 현재 `deleted_account_logs` 인덱스는 `_id` 하나뿐이다.
