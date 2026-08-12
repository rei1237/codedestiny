# MongoDB 구조 감사 — 2026-08 (Phase 1: 읽기 전용)

> 실측 기준: `code_destiny` 프로덕션 DB, 2026-08-12 조회
> 도구: `npm run audit:mongo-collections` · `npm run audit:user-fields` (둘 다 쓰기 연산 0건)
> 원자료: [raw/collections.json](raw/collections.json) · [raw/users-fields.json](raw/users-fields.json)

> 🔴 **이 문서(01~04)의 수치는 정리 작업 *이전* 기준선이다.** 2026-08-12 에 마이그레이션 4종을
> 실행해 현재 DB 상태는 다르다 — 무엇을 돌렸고 무엇이 남았는지는 [05-execution-log.md](05-execution-log.md)
> 를 볼 것. 여기 적힌 "37건", "160계정" 같은 숫자를 지금 상태로 오해하지 말 것.

## 이 문서는 무엇이고, 무엇이 아닌가

**이다** — 현재 DB에 실제로 무엇이 있고 코드가 그중 무엇을 쓰는지에 대한 증거 보고서.
**아니다** — 삭제 실행 계획서가 아니다. **이 감사에서는 어떤 필드도, 어떤 컬렉션도 삭제하지 않았고 스키마도 바꾸지 않았다.**

삭제 대상은 [02-users-fields.md](02-users-fields.md)에 `SAFE_TO_REMOVE` / `ARCHIVE_FIRST` / `KEEP` / `UNKNOWN` 로 **분류만** 되어 있다. 실제 제거는 이 보고서를 승인받은 뒤 별도 PR 로 진행한다.

## 한 장 요약

| 지표 | 실측값 |
|---|---|
| 컬렉션 수 | **67** |
| 전체 문서 수 | **26,128** |
| 코드에 등록된 mongoose 모델 | **48** |
| 모델이 없는 컬렉션 | **19** (그중 **12개는 코드 참조가 0건**) |
| 코드에만 있고 DB에 없는 컬렉션 | 0 |
| 선언됐지만 실제로 없는 인덱스 | **72** |
| `users` 문서 수 | **245** (탈퇴 1, `role:"admin"` **0명**) |
| `users` 에 실재하는 필드 경로 | **129** (스키마 선언 밖 유령 필드 **24개** 포함) |
| 전 계정이 기본값뿐인 필드 | **41개** |

### 가장 시급한 5가지

1. 🔴 **`users` 245건 중 37건에 `status` 필드가 아예 없다.** 관리자 목록을 `{status:"active"}` 로 짜면 이 37명이 통째로 안 보인다. 관리자 화면을 만들기 전에 반드시 알아야 할 사실이다. → [02](02-users-fields.md#a-회원-식별상태)
2. 🔴 **`role:"admin"` 계정이 0명이다.** 관리자 접근은 전적으로 공유 비밀번호 하나(`ADMIN_SECRET_HASH` → flower-admin 토큰)에 걸려 있고, **라이브 Worker 는 관리자 행위 감사 로그를 한 줄도 남기지 않는다**(`adminauditlogs` 0건). → [03](03-target-model-and-admin.md)
3. 🔴 **평문 전화번호 32건이 남아 있다** (암호화 봉투는 1건). `scripts/migrate-encrypt-user-phone.mjs` 가 사실상 미실행 상태다. → [02](02-users-fields.md#f-개인정보-요청서-9번)
4. 🟡 **`users` 문서가 3개의 서로 다른 스키마로 쓰이고 있다.** 9개 문서는 `app/_lib/models/UserModel.js` 의 `honey_*`/`banReason`/`currentPeriodStart` 계열 필드를 갖고 있다 — 워커 스키마에는 없는 형태다. → [02](02-users-fields.md#h-스키마-충돌-실측-증거)
5. 🟡 **`points` 잔액이 160계정에 총 2,002,956,304 코인** 남아 있다. 코인 차감 경로는 전부 402로 죽어 있어 쓸 수 없는데 잔액만 존재한다. 사용자 재산권이 걸려 있어 **삭제 불가(KEEP)**, 대신 정책 결정이 필요하다. → [02](02-users-fields.md#c-레거시-화폐)

## 분류 규칙

### 컬렉션 분류 ([01](01-collection-inventory.md))

| 분류 | 정의 |
|---|---|
| `ACTIVE` | 현재 서비스 코드가 읽고 쓴다 |
| `LEGACY` | 과거 기능의 데이터. 현재 핵심 기능에서는 안 쓴다 |
| `POTENTIALLY_UNUSED` | 코드 참조 0건이며 최근 쓰기 흔적도 없다 |
| `UNKNOWN` | 판단에 추가 검증이 필요하다 |
| `DO_NOT_DELETE` | 결제·회원권리·감사·법적 보존 가능성이 있다 (다른 분류보다 우선) |

### 필드 처리 분류 ([02](02-users-fields.md))

| 분류 | 정의 |
|---|---|
| `SAFE_TO_REMOVE` | 코드 읽기 0건 + 전 계정 기본값. 제거해도 동작·권리에 영향 없음 |
| `ARCHIVE_FIRST` | 값이 남아 있어 제거 전 별도 보관이 필요하다 |
| `KEEP` | 현재 정책이 실제로 쓰거나, 회원 권리·법적 보존 대상이다 |
| `UNKNOWN` | 판단 보류. 추가 확인 후 재분류 |

## 목차 (요청서 14번 12개 항목 대응)

| 문서 | 담긴 항목 |
|---|---|
| [01-collection-inventory.md](01-collection-inventory.md) | ① 현재 MongoDB collection 구조 |
| [02-users-fields.md](02-users-fields.md) | ② users field 전체 분석 · ③ 실제 사용 중인 field · ④ legacy 의심 field · ⑤ 삭제하면 안 되는 field · ⑥ 현재 정책과 맞지 않는 데이터 |
| [03-target-model-and-admin.md](03-target-model-and-admin.md) | ⑦ 새롭게 권장하는 schema · ⑧ 관리자 회원관리 화면 구조 · ⑨ 필요한 index |
| [04-migration-and-rollback.md](04-migration-and-rollback.md) | ⑩ migration 계획 · ⑪ 예상 위험 · ⑫ rollback 계획 |
| [05-execution-log.md](05-execution-log.md) | **실제 실행 기록**(2026-08-12) · 전후 대조 · 복구 자료 위치 · 미실행 항목 |

## 감사 도구의 안전성

두 스크립트 모두 **MongoDB 쓰기 연산을 한 줄도 포함하지 않는다.** 사용한 연산은 `listCollections` · `listIndexes` · `estimatedDocumentCount` · `countDocuments` · `find`(정렬 1건) · `aggregate`($group/$facet 계열, `$out`·`$merge` 없음) 뿐이다.

```
검증: insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|replaceOne|
      bulkWrite|createIndex|dropIndex|createCollection|.drop(|.save(|
      findOneAndUpdate|findOneAndDelete|findOneAndReplace|.remove(|
      renameCollection|$out|$merge
결과: 두 파일 모두 0건
```

모델을 `import` 하지만 `worker/lib/db.js:507` 이 `autoIndex: false` 로 연결하므로 인덱스가 생성되지 않는다. 실행 전후로 컬렉션 수(67)와 `users` 인덱스 수(9)가 동일함을 확인했다.

🔴 **개인정보 무출력**: 스크립트는 어떤 문서의 값도 출력하지 않는다. 이메일·이름·전화번호·비밀번호 해시·소셜 ID·TOTP 시크릿 등은 **카운트와 형식 분류만** 집계한다(예: 전화번호는 "평문 / 암호화 봉투 / 빈값" 개수). `raw/*.json` 스냅샷에도 개인정보가 없다.
