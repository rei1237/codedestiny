---
status: active
updated: 2026-08-30
next: PR 머지 후 사용자 허가 받아 `npm run migrate:request-path-indexes` 1회 실행 → 그다음 캐시 확장(계획 5단계) 별도 PR
---

# MongoDB M10 최적화 — 풀 스캔 제거 · 캐시 확장 (2026-08-30)

## 왜

"캐시 레이어 도입 + DB 커넥션 싱글턴 + 인덱스 점검으로 풀 스캔·CPU 급등 방지". 정본 계획: `C:\Users\user\.claude\plans\db-wild-beaver.md` (단계 0~6).

## 지금 상태

- 브랜치 `perf/mongo-collscan-and-cache` — 계획 **1·2·3·6단계 완료**(PR 번호는 `gh pr list`). 4단계(정적 가드)·5단계(캐시)는 **미착수**, 별도 PR.
- 실측 결과 정본: [docs/db-query-plans-2026-08-30.md](../db-query-plans-2026-08-30.md). COLLSCAN 은 `users {referralCode}`(auth.js:186) 하나만 조치 대상. 계획 표의 나머지 인덱스 후보는 전부 IXSCAN 이라 **만들지 않는다**.
- 인덱스 **생성은 미실행**. 사용자 결정: 읽기 전용 실측 1회 허용(2026-08-30 사용 완료), 생성 실행은 별도 허가.

## 남은 작업

- [ ] 사용자 허가 후 `npm run migrate:request-path-indexes` 1회 (선행 `npm run verify:request-path-indexes` 로 MISSING 1건 확인). 판정: 재실행 시 `OK users :: referralCode` + `누락=0`.
- [ ] 5단계 캐시 확장 — 대상 순서: `worker/routes/insights.js` 공개 목록/상세 → `content.js` 공개 조회 → `/api/me/access-state` 스냅샷. 재사용 `worker/lib/cms-cache.js` `readCmsThroughCache`/`purgeCmsCache`(TTL·stale 파라미터 있음, 새 모듈 불필요). 🔴 insights 쓰기는 `worker/routes/insights.js` 에 없고 **admin.js** 에 있다 — 무효화 훅은 거기에. 결제 파일(`billing.js`·`payments.js`)·`/api/subscription/status`·`/api/billing/unlock-status` 제외. 판정: 라우트별 테스트에서 히트 시 `connectDb` 호출 0, 쓰기 후 무효화.
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
MONGO_URI=... npm run verify:request-path-indexes   # 읽기 전용, MISSING 1 이 정상(미실행 상태)
```

## 모르는 것

- 5단계 `/api/me/access-state` 캐시는 `paid-gate-auditor` 사전 감사 없이는 착수 금지(계획 5-3).
