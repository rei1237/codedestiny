---
status: active
updated: 2026-08-31
next: 스택 PR 2개(자식 5단계 캐시 → 부모 1·2·3·6단계) 머지 → 사용자 허가 받아 `npm run migrate:request-path-indexes` 1회 → 4단계 정적 가드 별도 PR
---

# MongoDB M10 최적화 — 풀 스캔 제거 · 캐시 확장 (2026-08-30)

## 왜

"캐시 레이어 도입 + DB 커넥션 싱글턴 + 인덱스 점검으로 풀 스캔·CPU 급등 방지". 정본 계획: `C:\Users\user\.claude\plans\db-wild-beaver.md` (단계 0~6).

## 지금 상태

- 브랜치 `worktree-perf-mongo-collscan-and-cache` — 계획 **1·2·3·6단계 완료**. 브랜치 `perf/insight-public-cache`(위에 스택) — **5단계 캐시 완료**(2026-08-31). PR 번호는 `gh pr list`. 4단계(정적 가드)는 **미착수**.
- 5단계 적용 범위: `/api/insights` 목록(키 1개, 필터·`isPublicInsight` 는 캐시 밖)·상세(슬러그별 키, 404 미캐시, `shareUrl` 은 캐시 밖)·`/rss.xml`·`/sitemap-insights.xml` 피드(키 2개). TTL 300s/stale 900s. 키 원장·무효화: `worker/lib/insight-public-cache.js`, 호출은 `admin.js` Insight 쓰기 7곳. 가드: `verify:public-api-edge-cache`(insights·content 분류 추가, self-test 14). 테스트: `__tests__/worker/insights-public-cache.route.test.js`.
- 5단계에서 **안 한 것**: `/api/content` 목록·상세 — 소비자 0(2026-08-31 `git grep` 전수, `admin.js:3590` 의 URL 문자열뿐)이고 필터별 키는 엣지에서 못 지운다. `/api/me/access-state` — 이미 60s 인메모리 캐시가 있고(중첩 사전검사, 원칙 6) 병목은 그 앞의 인증 DB 히트라 `readThroughCredentialCache` 로 가야 하는데 그 경로는 ETag/`private` 헤더를 버리고 `profileId`/`include` 가 키에 못 들어간다. 착수하려면 `paid-gate-auditor` 사전 감사부터.
- 5단계 회귀 위험(수용): 상세 `viewCount` 는 미스 때만 +1(TTL 당 1회 표본). 관련글·이전/다음은 최대 5분 낡음. 예약 발행은 목록에선 즉시, **피드·상세에선 최대 5분 늦게** 실린다.
- 실측 결과 정본: [docs/db-query-plans-2026-08-30.md](../db-query-plans-2026-08-30.md). COLLSCAN 은 `users {referralCode}`(auth.js:186) 하나만 조치 대상. 계획 표의 나머지 인덱스 후보는 전부 IXSCAN 이라 **만들지 않는다**.
- 인덱스 **생성은 미실행**. 사용자 결정: 읽기 전용 실측 1회 허용(2026-08-30 사용 완료), 생성 실행은 별도 허가.

## 남은 작업

- [ ] 사용자 허가 후 `npm run migrate:request-path-indexes` 1회 (선행 `npm run verify:request-path-indexes` 로 MISSING 1건 확인). 판정: 재실행 시 `OK users :: referralCode` + `누락=0`.
- [x] 5단계 캐시 확장 — insights 목록/상세·content 피드 완료(위 "지금 상태"). `/api/me/access-state` 는 보류(사유 위). 남은 판정: 스테이징 머지 후 `curl -sI https://staging.code-destiny.com/api/insights | grep -i x-cd-cache` 두 번 → `miss` 다음 `hit`.
- [ ] 4단계 `scripts/verify-mongo-query-index-shapes.mjs` 정적 가드 — 계획 4단계 그대로. 워크플로 `paths` 에 `worker/routes/**` 를 가진 것은 `ai-locale-gate.yml` 뿐(2026-08-30 grep)이라 배선 워크플로는 `verify:guard-wiring` 출력으로 고른다.

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
node scripts/verify-public-api-edge-cache.mjs --self-test   # 5단계 가드, self-test 14
npx --no-install cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand --testEnvironment node __tests__/worker/insights-public-cache.route.test.js
MONGO_URI=... npm run verify:request-path-indexes   # 읽기 전용, MISSING 1 이 정상(미실행 상태)
```

## 모르는 것

- 5단계 `/api/me/access-state` 캐시는 `paid-gate-auditor` 사전 감사 없이는 착수 금지(계획 5-3).
