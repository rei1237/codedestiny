# 영냥이 결제 직후 "상담 기록에 잠시 연결하지 못했어요" — 인수인계 (2026-09-24)

## 끝난 것 (main, CI 통과)
- `dbeab8865` Result.tsx `load()`: activate 가 실패해도 이미 읽은 요청 행을 버리지 않는다. 일시 오류는 기존 결제 대기 폴링이 재시도한다. 검증: `node scripts/verify-yeongnyangi-result-retry.mjs` (activate 503 경우 추가, 옛 코드로 되돌리면 실패하는 것 확인)
- `89f4d3334` api.ts DB-503 문구 → "영냥이 서버에 잠시 연결하지 못했어요. 결제한 상담은 그대로 있어요. …" (CD 상담 기록 연결 단계는 존재하지 않음 — 오해 문구였음)
- `7d1989347` recovery.js: 미연결 유료 주문 재활성화가 `isDbUnavailableError` 면 5분 보류(다음 틱), 그 밖은 기존 24시간.

## 503 원인 실측 (2026-09-24, 스테이징, 사용자 승인)
`YN_READ_REPEATS=10 node scripts/verify-yeongnyangi-worker-mongo-staging.mjs --staging-fixtures` 를 4회 돌리며
`wrangler tail code-destiny-web-staging --format json` 을 함께 받았다(캡처는 스크래치패드, 커밋 안 함). PG·LLM 0건.
- 유료 경로(로그인 → 조회 → activate 동시 2건 → 조회 12건): **전부 200**. WriteConflict·트랜잭션 오류 0건.
- 503 은 2건. 동시 2건 요청(`attendance`, `free/unlock`)에서만 났고, **둘 다 같은 모양**이다:
  `[db-op-timeout] opMs=8000 inFlightOps=1 lastCheckOutFailReason:"poolClosed"` → `MongoDB operation timed out in Worker.` → 503.
- 해석(로그로 확인한 부분 + 추정): 이웃 요청이 웜 ping 실패로 `detachDeadWarmConnection()`(db.js:466, 호출 800)을 타서
  옛 클라이언트를 배경에서 닫는다. db.js:760 주석은 "그 위의 이웃 op 은 빨리 실패하고 withMongoRetry 가 새 커넥션을 탄다"고
  가정하지만, 실측은 **빨리 실패하지 않고 풀 체크아웃이 poolClosed 로 막힌 채 8000ms 예산을 다 쓴다.**
  결제 직후 결과 화면은 조회·activate·결제 대기 폴링·큐 소비가 겹치므로 같은 경로로 503 을 받는다고 본다(추정 — 유료 경로에서 직접 재현은 못 함).
- 테스트 데이터 결함도 고쳤다: `analysis:{}` 는 mongoose 가 빈 객체를 저장하지 않아 `presentFortune` 이 500 으로 죽었다(d218731c6 이후). `analysis:{topicId:'general'}` 로 교체.
- 이 스크립트는 지금도 attendance/unlock 동시 구간에서 위 503 때문에 간헐 실패한다.

## 남은 것 (다음 세션)
1. **db.js 이웃 op poolClosed 8000ms 정지 수정 (RED, 공용 DB 계층).** 방향 후보: detach 된 클라이언트 위의 op 을 poolClosed 체크아웃 실패 즉시 transient 로 끊어 withMongoRetry 가 새 커넥션으로 재시도하게. 기존 계약 테스트 `__tests__/worker/db.mongoose-detach-contract.test.js`·`db.warm-teardown-off-critical-path.test.js` 와 db.js 주석의 과거 사고(08-08 전역 disconnect, 09-06 거짓 실패) 먼저 읽을 것. 재현: 위 스크립트 + tail, 성공 기준 = `poolClosed` 8000ms 0건.
2. **피해 주문 조회(읽기 전용, 운영 DB → 실행 전 승인):** `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny` 와 `payments` 중 `requestId:/^yn-[a-f0-9]{64}$/`, 결제 완료, `metadata.consumedBy:null`, `metadata.yeongnyangiRecoveryAfter` 가 미래인 건. 이미 24시간 보류된 건은 이번 수정으로 앞당겨지지 않는다 — 해제 쓰기는 별도 승인.
3. 범위 밖 보고: `verify-yeongnyangi-result-retry.mjs` 가 package.json·CI 에 배선돼 있지 않고, `paid-flow-gates.yml` 트리거에 `app/yeongnyangi/**`·`worker/yeongnyangi/**` 가 없다.

다음 세션 첫 문장: "docs/handoff/yeongnyangi-paid-result-attach-503.md 를 읽고 남은 것 1(503 원인) 또는 2(피해 주문 조회) 중 승인된 것부터 진행해줘."
