---
status: active
updated: 2026-09-08
next: PR #1810의 CI 결과를 확인하고 스테이징 Atlas 인덱스를 READY까지 적용한다.
---

# Worker CPU와 Atlas Search 적용

## 왜

`/api/profile`, `/api/insights`, `/api/auth/me`의 Cloudflare CPU 시간을 낮추기 위해
인사이트 목록을 Worker 전체 문서 처리에서 MongoDB 집계·Atlas Search로 옮겼다.

## 지금 상태

- 브랜치 `wt/worker-cpu-optimization-20260908-064412`, PR #1810이 열려 있으며 아직 머지되지 않았다.
- 커밋 `3541904e9`는 인사이트 집계, 읽기 라우트 지연 로딩, projection, 인덱스 check를 포함한다.

## 남은 작업

- [ ] 스테이징 Atlas에서 `npm run migrate:insight-public-read-indexes -- --apply` 1회를 실행한다.
- [ ] `npm run verify:insight-public-read-indexes`가 Search 인덱스 READY와 일반 인덱스를 모두 확인하고, `/api/insights?q=사주`가 200으로 응답하면 완료다.
- [ ] PR CI 통과 뒤 스테이징의 URL별 CPU를 배포 전 값과 비교한다. 운영 적용은 별도 승인 뒤 같은 순서로 한다.

## 정본 예시

`worker/routes/insights.js:440`

## 함정

- `insights_public_search_v1` 없이 `q` 검색을 배포하면 Atlas Search 단계가 실패한다. 인덱스를 READY로 만든 뒤 Worker를 배포한다.
- `worker/lib/db.js`에 요청 간 Promise 캐시를 추가하지 않는다. Cloudflare의 교차 요청 컨텍스트 경고와 충돌한다.

## 검증

```
npm run verify:insight-public-read-indexes
npm run audit:mongo-query-plans
```

## 모르는 것

- 스테이징 Atlas 계정의 Search 인덱스 생성 권한과 실제 READY까지 걸리는 시간은 아직 확인하지 않았다.
