---
status: active
updated: 2026-08-31
next: 4단계 가드 PR(브랜치 `perf/mongo-query-index-shapes`) 머지 → 사용자 허가 받아 `npm run migrate:request-path-indexes` 1회 → 스테이징에서 5단계 캐시 hit 판정
---

# MongoDB M10 최적화 — 풀 스캔 제거 · 캐시 확장 (2026-08-30)

## 왜

"캐시 레이어 도입 + DB 커넥션 싱글턴 + 인덱스 점검으로 풀 스캔·CPU 급등 방지". 정본 계획: `C:\Users\user\.claude\plans\db-wild-beaver.md` (단계 0~6).

## 지금 상태

- 계획 **1·2·3·6단계 머지 완료**(PR #1346), **5단계 캐시 머지 완료**(PR #1350). **4단계 정적 가드 구현 완료**(2026-08-31, 브랜치 `perf/mongo-query-index-shapes`, PR 번호는 `gh pr list`).
- 4단계 실체: `scripts/verify-mongo-query-index-shapes.mjs`(acorn AST, 원장 = `worker/lib/*models.js` 의 `schema.indexes()` 런타임 import + 마이그레이션 createIndex 리터럴) · 예외 원장 `config/mongo-query-index-allowlist.json`(사유 필수, 낡은 항목 실패) · `__tests__/scripts/verify-mongo-query-index-shapes.test.js` · `pr-ci.yml` critical 잡 배선. 첫 실행 실측: 쿼리 840 = indexed 688 · dynamic 144 · raw 6 · allowlisted 2(죽은 `releaseStaleReservations` 스윕 2건) · 위반 0.
- 4단계 한계(알고 수용): `dynamic` 144건(식별자·스프레드 필터)은 검사 밖 — 그 안의 COLLSCAN 은 이 가드가 못 본다. 판정은 **선두 키 존재**뿐이라 복합 인덱스 접두 길이·ESR 은 안 본다. 마이그레이션 중 모델 2개 이상을 겨냥하는 5개 파일의 리터럴은 원장에 귀속하지 못한다(실행 출력의 `원장 주의`) — 그 인덱스가 models.js 에도 선언돼 있어 지금은 위반 0.
- 5단계(머지됨) 정본은 코드: 키 원장·무효화 `worker/lib/insight-public-cache.js`, 가드 `verify:public-api-edge-cache`, 테스트 `__tests__/worker/insights-public-cache.route.test.js`.
- 5단계에서 **안 한 것**: `/api/content` 목록·상세 — 소비자 0(2026-08-31 `git grep` 전수, `admin.js:3590` 의 URL 문자열뿐)이고 필터별 키는 엣지에서 못 지운다. `/api/me/access-state` — 이미 60s 인메모리 캐시가 있고(중첩 사전검사, 원칙 6) 병목은 그 앞의 인증 DB 히트라 `readThroughCredentialCache` 로 가야 하는데 그 경로는 ETag/`private` 헤더를 버리고 `profileId`/`include` 가 키에 못 들어간다. 착수하려면 `paid-gate-auditor` 사전 감사부터.
- 5단계 회귀 위험(수용): 상세 `viewCount` 는 미스 때만 +1(TTL 당 1회 표본). 관련글·이전/다음은 최대 5분 낡음. 예약 발행은 목록에선 즉시, **피드·상세에선 최대 5분 늦게** 실린다.
- 실측 정본 [docs/db-query-plans-2026-08-30.md](../db-query-plans-2026-08-30.md): 조치 대상은 `users {referralCode}` 하나, 나머지 후보는 IXSCAN 이라 **만들지 않는다**.
- 인덱스 **생성은 미실행**. 사용자 결정: 읽기 전용 실측 1회 허용(2026-08-30 사용 완료), 생성 실행은 별도 허가.

## 남은 작업

- [ ] 사용자 허가 후 `npm run migrate:request-path-indexes` 1회 (선행 `npm run verify:request-path-indexes` 로 MISSING 1건 확인). 판정: 재실행 시 `OK users :: referralCode` + `누락=0`.
- [x] 5단계 캐시 확장 — insights 목록/상세·content 피드 완료(위 "지금 상태"). `/api/me/access-state` 는 보류(사유 위). 남은 판정: 스테이징 머지 후 `curl -sI https://staging.code-destiny.com/api/insights | grep -i x-cd-cache` 두 번 → `miss` 다음 `hit`.
- [x] 4단계 정적 가드 — 구현·배선 완료(위 "지금 상태"). PR #1353 CI(run 33319863161) 에서 스텝 "Verify Mongo query shapes match declared indexes" 가 로컬과 같은 수치(위반 0)로 돈 것을 확인(2026-08-31). 남은 판정 없음.

## 정본 예시

`scripts/audit-mongo-query-plans.mjs:47` (쿼리 모양 목록 — 코드가 바뀌면 여기도 갱신), `scripts/migrations/20260830-add-request-path-indexes.mjs:44` (대상 인덱스).

## 함정

- 워크트리에는 `.env.local` 이 없다. 실 DB 스크립트는 저장소 루트의 `.env.local` 값을 셸로 넘긴다(값이 `"..."` 로 따옴표 감싸져 있어 `Trim('"')` 필요). Bash 툴은 `../../../` 참조를 막으므로 PowerShell 로.
- `$indexStats` 카운터가 2026-08-27 리셋됐다 — 09-03 전에는 ops 로 드롭 판단 금지.
- `verify-guard-wiring` 은 `verify:*` 만 발견한다. `audit:*` 스크립트는 등록 대상이 아니다.
- `isPublicInsight`(insights.js:270) 는 `buildPublicInsightStatusQuery` 와 등가가 아니다 — 목록 필터를 서버로 옮기면 status 없는 문서 판정이 바뀐다.

## 검증

```
npm run lint && npm run typecheck && npm run verify:guard-wiring
npm run verify:mongo-query-index-shapes -- --self-test && npm run verify:mongo-query-index-shapes -- --report   # 4단계 가드
npx --no-install cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand --testEnvironment node __tests__/scripts/verify-mongo-query-index-shapes.test.js
node scripts/verify-public-api-edge-cache.mjs --self-test   # 5단계 가드, self-test 14
npx --no-install cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand --testEnvironment node __tests__/worker/insights-public-cache.route.test.js
MONGO_URI=... npm run verify:request-path-indexes   # 읽기 전용, MISSING 1 이 정상(미실행 상태)
```

## 모르는 것

- 5단계 `/api/me/access-state` 캐시는 `paid-gate-auditor` 사전 감사 없이는 착수 금지(계획 5-3).
