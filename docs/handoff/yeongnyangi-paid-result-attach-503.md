---
status: active
updated: 2026-09-24
next: 설계안 A(끝난 호출의 op 을 ping-skip 이웃 판정에서 제외) 승인을 받아 db.js 에 구현하고, 같은 스테이징 재현 4회로 [db-op-timeout] 0건을 확인한다
---
# 영냥이 결제 직후 "상담 기록에 잠시 연결하지 못했어요" — 인수인계 (2026-09-24)

## 끝난 것 (main)
- `dbeab8865` Result.tsx: activate 가 실패해도 읽은 요청 행 유지(`node scripts/verify-yeongnyangi-result-retry.mjs`). `89f4d3334` DB-503 문구. `7d1989347` recovery.js: DB 일시 오류면 5분 보류. `60d4cf1da` 재현 픽스처 `analysis` 수정.
- `011a3c527`(머지 `d2e138ca1`) db.js **계측만, 동작 변경 없음**: `[db-op-timeout]` 의 `lastCheckOutFailReason` 은 그 시도에 checkOutFailed 가 있을 때만 붙는다. `pending[]`(응답 없는 명령·커넥션) 추가. 풀이 소켓을 열 때 `[db-conn-open] {conn}` — 소켓을 연 요청의 tail 이벤트에 찍힌다.

## 원인 (스테이징 실측, 승인된 재현 1회)
재현: `YN_READ_REPEATS=10 node scripts/verify-yeongnyangi-worker-mongo-staging.mjs --staging-fixtures` + `npx wrangler tail code-destiny-web-staging --config worker/wrangler.staging.toml --format json`. 1회차 28행(조회 반복)에서 503. PG·LLM 0, 픽스처 정리 PASS.
- 🔴 이전 판정 "poolClosed 체크아웃 8초 정지"는 **오진**. poolClosed 는 예전 실패가 남은 전역 값이었고 증분은 checkOutFailed 0·commandStarted 만 증가 = **명령은 나갔는데 답이 없다.** (mongo-m10-phase2-2026-09-06.md ⓐ 도 같은 오독)
- 측정: 끝내 답이 없던 명령 5/5 가 **소켓을 연 요청이 끝난 뒤** 보낸 명령이다(로그인이 연 소켓의 create 3건, 끝난 GET 이 연 소켓의 ping, 끝난 activate 가 연 소켓의 find → 8000ms → 503). 웜 ping 도 끝난 요청의 소켓 3/3 실패, 자기 요청이 연 소켓 4/4 성공.
- 503 경로(실측+코드): activate 동시 2건이 1000ms 시도 예산을 넘겨 재시도(둘 다 200) → 걸린 시도가 settle 하지 않아 `finalizeOperation` 이 op 기록을 못 지움(`ABANDONED_OP_MAX_AGE_MS` 15초까지) → 다음 GET 이 `countActiveMongoOps() > activeOpsOwned` 로 **웜 ping 을 건너뜀** → LIFO 풀이 끝난 activate 의 소켓을 내줌 → 정지. 로그 inFlightOps=3 = 좀비 2 + 자기 1.
- 부수: fresh-connection 거짓 실패 가드(`FRESH_CONNECTION_MAX_AGE_MS`)가 끝난 GET 이 연 1초짜리 소켓의 ping 정지를 "거짓 실패"로 보고 유지했다.
- 미해명: 살아 있는 activate 끼리 보낸 명령 2건도 1000ms 안에 답이 없었다(서버 잠금 대기인지 못 가름). activate 시도 예산이 왜 1000ms 인지도 미확인.

## 설계안 (RED, 공용 DB 계층 — 승인 후)
- **A (권장, 작음):** withMongoRetry 가 반환·throw 한 op 은 걸린 시도가 남아도 ping-skip 이웃 판정에서 뺀다(리셋 안전 회계는 그대로). 이번 503 은 ping 실패 → 분리 → 재연결로 바뀐다. 한계: 살아 있는 이웃이 있을 때 풀이 끝난 요청의 소켓을 내주는 경우는 남는다.
- B: 거짓 실패 가드를 "이 요청이 연 소켓"일 때로 좁힌다(opener 식별은 AsyncLocalStorage — [db-conn-open] 이 opener 컨텍스트에서 찍히는 것은 실측됨).
- C (구조, 큼): 요청 범위 클라이언트로 소켓을 요청 밖에서 재사용하지 않는다. 전 라우트 영향.
- 성공 기준: 같은 재현 4회 PASS, [db-op-timeout] 0건. 기존 계약 테스트 `db.mongoose-detach-contract`·`db.warm-teardown-off-critical-path`·`cron-shared-connection-teardown` 유지.

## 남은 것
1. 설계안 A 승인 → 구현 → 재현.
2. **피해 주문 조회(읽기 전용, 운영 DB → 실행 전 승인):** `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny` 와 `payments` 중 `requestId:/^yn-[a-f0-9]{64}$/`, 결제 완료, `metadata.consumedBy:null`, `metadata.yeongnyangiRecoveryAfter` 가 미래인 건. 해제 쓰기는 별도 승인.
3. 범위 밖 보고: `verify-yeongnyangi-result-retry.mjs` 가 package.json·CI 에 배선돼 있지 않고, `paid-flow-gates.yml` 트리거에 `app/yeongnyangi/**`·`worker/yeongnyangi/**` 가 없다.

다음 세션 첫 문장: "docs/handoff/yeongnyangi-paid-result-attach-503.md 를 읽고 남은 것 1(설계안 A)을 진행해줘."
