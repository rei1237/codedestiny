---
status: active
updated: 2026-08-31
next: 결제 직후 access-state 정합성 구멍 2건(결제 라우트 무효화 미호출 · refreshUserAccessAfterPayment 호출자 0) — 아래 "남은 작업".
---

# MongoDB M10 최적화 — 풀 스캔 제거 · 캐시 확장 (2026-08-30)

## 왜

"캐시 레이어 도입 + DB 커넥션 싱글턴 + 인덱스 점검으로 풀 스캔·CPU 급등 방지". 정본 계획: `C:\Users\user\.claude\plans\db-wild-beaver.md` (단계 0~6).

## 지금 상태

- 계획 **1·2·3·6단계 머지 완료**(PR #1346), **5단계 캐시 머지 완료**(PR #1350). **4단계 정적 가드 구현 완료**(2026-08-31, 브랜치 `perf/mongo-query-index-shapes`, PR 번호는 `gh pr list`).
- 4단계 실체: `scripts/verify-mongo-query-index-shapes.mjs`(acorn AST, 원장 = `worker/lib/*models.js` 의 `schema.indexes()` 런타임 import + 마이그레이션 createIndex 리터럴) · 예외 원장 `config/mongo-query-index-allowlist.json`(사유 필수, 낡은 항목 실패) · `__tests__/scripts/verify-mongo-query-index-shapes.test.js` · `pr-ci.yml` critical 잡 배선. 첫 실행 실측: 쿼리 840 = indexed 688 · dynamic 144 · raw 6 · allowlisted 2(죽은 `releaseStaleReservations` 스윕 2건) · 위반 0.
- 4단계 한계(알고 수용): `dynamic` 144건(식별자·스프레드 필터)은 검사 밖 — 그 안의 COLLSCAN 은 이 가드가 못 본다. 판정은 **선두 키 존재**뿐이라 복합 인덱스 접두 길이·ESR 은 안 본다. 마이그레이션 중 모델 2개 이상을 겨냥하는 5개 파일의 리터럴은 원장에 귀속하지 못한다(실행 출력의 `원장 주의`) — 그 인덱스가 models.js 에도 선언돼 있어 지금은 위반 0.
- 5단계(머지됨) 정본은 코드: 키 원장·무효화 `worker/lib/insight-public-cache.js`, 가드 `verify:public-api-edge-cache`, 테스트 `__tests__/worker/insights-public-cache.route.test.js`.
- 5단계에서 **안 한 것**: `/api/content` 목록·상세 — 소비자 0(2026-08-31 `git grep` 전수, `admin.js:3590` 의 URL 문자열뿐)이고 필터별 키는 엣지에서 못 지운다. `/api/me/access-state` 는 뒤늦게 별도 PR 로 처리했다(아래).
- 5단계 회귀 위험(수용): 상세 `viewCount` 는 미스 때만 +1(TTL 당 1회 표본). 관련글·이전/다음은 최대 5분 낡음. 예약 발행은 목록에선 즉시, **피드·상세에선 최대 5분 늦게** 실린다.
- **`/api/me/access-state` 조기 조회**(PR #1364, 2026-08-31): `credential-scoped-cache` 를 씌우지 **않았다** — 그 경로는 ETag/`private` 헤더를 버리고 `profileId`/`include` 가 키에 못 들어간다. 대신 기존 60s 스냅샷 캐시 조회를 `requireUserFromRequest` **위로** 옮겼다(히트해도 인증 Mongo 왕복은 매 요청 냈으므로 그게 병목이었다). 조기 경로는 `profileId` 가 실린 GET 에서만 탄다 — 현재 프로필의 정본은 DB 라 아이솔레이트 로컬 폴백을 쓰면 옛 프로필 스냅샷이 나간다.
- 🔴 그래서 **호출자에 따라 효과가 갈린다**(2026-08-31 `git grep` 전수): `?profileId=` 를 붙이는 곳은 `js/core/access-store.js:824` 하나뿐이고 — 계획이 겨냥한 중복 호출이 이것이다 — 정적 셸의 부트스트랩 `ensureLoaded`(`index.html:397`)는 `?include=guardian` 만 붙여 **조기 경로를 타지 않는다**. 셸까지 태우려면 그 URL 에 현재 profileId 를 실어야 하고, 그건 별건이다.
- 🔴 그 과정에서 `worker/lib/access-state.js` 를 갈랐다: TTL 저장소는 **의존 0** 인 `worker/lib/access-state-cache.js`, 스냅샷 빌더는 그대로. 무효화 한 줄 때문에 `access-state.js` 를 import 하면 `models.js` 가 딸려와 그것을 부분 모킹한 스위트 11개(109건)가 죽는다(실측). **무효화가 필요한 라우트는 반드시 leaf 쪽을 import 한다** — 가드가 그 import 모양을 강제한다.
- 실측 정본 [docs/db-query-plans-2026-08-30.md](../db-query-plans-2026-08-30.md): 조치 대상은 `users {referralCode}` 하나, 나머지 후보는 IXSCAN 이라 **만들지 않는다**.
- 인덱스 `users {referralCode}` 는 **존재 확인 완료**(2026-08-31, 아래 남은 작업).

## 남은 작업

- [x] `users {referralCode}` 인덱스 — 2026-08-31 허가 실행. 선행 `--check` 가 이미 `OK … 누락=0`(실행 전에 존재, 생성 주체 미확인) 이라 apply 는 no-op 였다. 사후 `verify:request-path-indexes` = `누락=0 충돌=0`.
- [x] 5단계 캐시 확장 — insights 목록/상세·content 피드 완료(위 "지금 상태"). `/api/me/access-state` 는 보류(사유 위). 스테이징 판정 완료(2026-08-31): 연속 2회 GET 에서 `X-CD-Cache: miss` → `hit`. 🔴 `curl -sI`(HEAD)는 405 라 헤더가 안 나온다 — `curl -s -D - -o /dev/null https://staging.code-destiny.com/api/insights` 로 잴 것. 응답의 `Cache-Control: no-store` 는 결함이 아니다: 이 캐시는 브라우저/CDN 이 아니라 워커 내부(아이솔레이트 memo + `caches.default`)이고, 판정 신호는 `X-CD-Cache` 하나다.
- [x] `/api/me/access-state` 조기 조회 — PR #1364. 착수 조건이던 `paid-gate-auditor` 사전 감사 완료(판정 **조건부 착수**, 9개 조건 전부 반영). 가드 `verify:access-state-cache-order`(fail-closed, 축 2개: 조회 순서 · 탈퇴 무효화 배선을 `worker/**` 에서 전수 발견, 0건이면 실패) · 테스트 `__tests__/worker/access-state.early-cache.test.js`.
- [ ] 🔴 **결제 직후 정합성 구멍 2건**(감사가 함께 찾은 **기존** 결함, PR #1364 범위 밖) — ① 결제 라우트가 `invalidateAccessStateCacheForUser` 를 부르지 않는다 ② `refreshUserAccessAfterPayment` 는 **호출자 0개**다. 결제 직후 최대 60초간 옛 스냅샷이 나갈 수 있다(진입 판정은 로컬 스냅샷이므로 유료 기능이 잠긴 채로 보일 수 있다). 서버는 이제 `x-code-destiny-cache-refresh: 1` 을 받으면 즉시 무효화하고, 그 헤더를 붙이는 코드는 양쪽 표면에 이미 있다(`index.html:462` · `app/_lib/user-session-cache.ts:504`) — **둘 다 `refreshUserAccessAfterPayment` 안에 있고 그 함수를 부르는 곳이 없다**(2026-08-31 `git grep` 전수: 정의 2 · 훅 배선 1 · 호출 0). 즉 배관은 다 깔렸고 **결제 완료 지점에서 그 함수를 부르기만 하면 된다**. 착수 전 `paid-gate-auditor` 재감사 권장.
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
npm run verify:access-state-cache-order && npm run verify:access-state-cache-order -- --self-test   # 라우트 7 · 배선 2 · 발견 1
npx --no-install cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand --testEnvironment node __tests__/worker/access-state.early-cache.test.js
npx --no-install cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand --testEnvironment node __tests__/worker/insights-public-cache.route.test.js
MONGO_URI=... npm run verify:request-path-indexes   # 읽기 전용, MISSING 1 이 정상(미실행 상태)
```

## 모르는 것

- 조기 조회의 실 절감폭은 **미측정** — 스테이징에서 로그인 후 `/api/me/access-state?profileId=…` 를 연속 2회 호출해 응답 본문 `source`(`cache`) 와 지연을 비교하면 된다.
