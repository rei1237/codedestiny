# 영냥이 결제 직후 "상담 기록에 잠시 연결하지 못했어요" — 인수인계 (2026-09-24)

## 끝난 것 (main, CI 통과)
- `dbeab8865` Result.tsx `load()`: activate 가 실패해도 이미 읽은 요청 행을 버리지 않는다. 일시 오류는 기존 결제 대기 폴링이 재시도한다. 검증: `node scripts/verify-yeongnyangi-result-retry.mjs` (activate 503 경우 추가, 옛 코드로 되돌리면 실패하는 것 확인)
- `89f4d3334` api.ts DB-503 문구 → "영냥이 서버에 잠시 연결하지 못했어요. 결제한 상담은 그대로 있어요. …" (CD 상담 기록 연결 단계는 존재하지 않음 — 오해 문구였음)
- `7d1989347` recovery.js: 미연결 유료 주문 재활성화가 `isDbUnavailableError` 면 5분 보류(다음 틱), 그 밖은 기존 24시간.

## 남은 것 (다음 세션)
1. **503 실제 원인 미확인.** 운영 Workers Logs 에서 `/api/yeongnyangi/requests/*/activate` 의 `[worker-route-error]` name/code/message 확인(사용자), 또는 `scripts/verify-yeongnyangi-worker-mongo-staging.mjs --staging-fixtures` 실행(스테이징 DB 쓰기 → 승인 필요). 후보(추정): 트랜잭션·시도 상한 동일 8000ms, 큐 activate 와의 WriteConflict.
2. **피해 주문 조회(읽기 전용, 운영 DB → 실행 전 승인):** `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny` 와 `payments` 중 `requestId:/^yn-[a-f0-9]{64}$/`, 결제 완료, `metadata.consumedBy:null`, `metadata.yeongnyangiRecoveryAfter` 가 미래인 건. 이미 24시간 보류된 건은 이번 수정으로 앞당겨지지 않는다 — 해제 쓰기는 별도 승인.
3. 범위 밖 보고: `verify-yeongnyangi-result-retry.mjs` 가 package.json·CI 에 배선돼 있지 않고, `paid-flow-gates.yml` 트리거에 `app/yeongnyangi/**`·`worker/yeongnyangi/**` 가 없다.

다음 세션 첫 문장: "docs/handoff/yeongnyangi-paid-result-attach-503.md 를 읽고 남은 것 1(503 원인) 또는 2(피해 주문 조회) 중 승인된 것부터 진행해줘."
