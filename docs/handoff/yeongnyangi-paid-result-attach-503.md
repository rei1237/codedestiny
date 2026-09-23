---
status: active
updated: 2026-09-24
next: 설계안 D(진행 중인 웜 ping 을 뒤따라 들어온 요청이 기다린다) 승인을 받아 db.js 에 구현하고, 재현 스크립트의 호라리 결함을 먼저 고친 뒤 같은 재현 4회로 스크립트 PASS·끝난 요청 소켓 위 [db-op-timeout] 0건을 확인한다
---
# 영냥이 결제 직후 "상담 기록에 잠시 연결하지 못했어요" — 인수인계 (2026-09-24)

## 끝난 것 (main)
- `dbeab8865` Result.tsx: activate 가 실패해도 읽은 요청 행 유지(`node scripts/verify-yeongnyangi-result-retry.mjs`). `89f4d3334` DB-503 문구. `7d1989347` recovery.js: DB 일시 오류면 5분 보류. `60d4cf1da` 재현 픽스처 `analysis` 수정.
- `011a3c527`(머지 `d2e138ca1`) db.js **계측만, 동작 변경 없음**: `[db-op-timeout]` 의 `lastCheckOutFailReason` 은 그 시도에 checkOutFailed 가 있을 때만 붙는다. `pending[]`(응답 없는 명령·커넥션) 추가. 풀이 소켓을 열 때 `[db-conn-open] {conn}` — 소켓을 연 요청의 tail 이벤트에 찍힌다.
- `0b644f4d6` db.js **설계안 A**: `countLiveMongoOps()` = 아직 호출자에게 안 돌아간 op. 웜 ping-skip 과 fresh 거짓 실패 가드의 이웃 판정만 이것으로 바꿨다(withMongoRetry finally 에서 `returnedToCaller`). 리셋 안전 회계(`countActiveMongoOps`)는 그대로. `[db-op-timeout]` 에 `liveOps` 추가. 테스트 2건(`db.warm-connection-revalidation`), 두 판정 지점 모두 변이로 테스트가 무는 것 확인. main CI(PR CI 1aa020451, 재실행 1회 — 러너 인증서 플레이크) 녹색.

## 원인 (스테이징 실측, 승인된 재현 1회)
재현: `YN_READ_REPEATS=10 node scripts/verify-yeongnyangi-worker-mongo-staging.mjs --staging-fixtures` + `npx wrangler tail code-destiny-web-staging --config worker/wrangler.staging.toml --format json`. 1회차 28행(조회 반복)에서 503. PG·LLM 0, 픽스처 정리 PASS.
- 🔴 이전 판정 "poolClosed 체크아웃 8초 정지"는 **오진**. poolClosed 는 예전 실패가 남은 전역 값이었고 증분은 checkOutFailed 0·commandStarted 만 증가 = **명령은 나갔는데 답이 없다.** (mongo-m10-phase2-2026-09-06.md ⓐ 도 같은 오독)
- 측정: 끝내 답이 없던 명령 5/5 가 **소켓을 연 요청이 끝난 뒤** 보낸 명령이다(로그인이 연 소켓의 create 3건, 끝난 GET 이 연 소켓의 ping, 끝난 activate 가 연 소켓의 find → 8000ms → 503). 웜 ping 도 끝난 요청의 소켓 3/3 실패, 자기 요청이 연 소켓 4/4 성공.
- 503 경로(실측+코드): activate 동시 2건의 1000ms 시도가 예산을 넘김(둘 다 200 — 보안 가드 fail-open, 아래 재현 결과로 정정) → 걸린 시도가 settle 하지 않아 `finalizeOperation` 이 op 기록을 못 지움(`ABANDONED_OP_MAX_AGE_MS` 15초까지) → 다음 GET 이 `countActiveMongoOps() > activeOpsOwned` 로 **웜 ping 을 건너뜀** → LIFO 풀이 끝난 activate 의 소켓을 내줌 → 정지. 로그 inFlightOps=3 = 좀비 2 + 자기 1.
- 부수: fresh-connection 거짓 실패 가드(`FRESH_CONNECTION_MAX_AGE_MS`)가 끝난 GET 이 연 1초짜리 소켓의 ping 정지를 "거짓 실패"로 보고 유지했다.
- 미해명→해명: activate 시도 예산이 왜 1000ms 인가 → 보안 가드 레인(아래 재현 결과). 살아 있는 activate 끼리 보낸 명령이 1000ms 안에 답이 없던 것은 여전히 서버 잠금 대기인지 새 소켓 준비 대기인지 못 가른다.

## 설계안 A 재현 결과 (스테이징 4회, 워커 15c754ab = 1aa020451, A 포함)
- ✅ 결제 결과 연결 경로 4/4 통과: 동시 activate 200, 조회 GET 56건 비정상 0(최대 wall 4128ms). 위 원래 503(조회 반복 중 503)은 재현되지 않았다.
- ❌ 스크립트는 4/4 FAIL. 1·3회차는 동시 attendance 503 에서 단언 실패, 2·4회차는 attendance 503 이 단언(`attendance[0]` 만 봄)을 비껴간 뒤 호라리 400 에서 실패(범위 밖 참조). 픽스처 정리 4/4 PASS, PG·LLM 0.
- ❌ `[db-op-timeout]` 25건 — 성공 기준(0건) 미달. tail 의 `pending[].conn` 을 `[db-conn-open]` 과 대조한 분류(실측):
  - **4건 = 사용자 503(동시 attendance, 4/4 회차).** 늦게 들어온 쪽(형제보다 22~42ms 뒤)의 find 가 **끝난 요청(직전 activate 402)이 연 소켓** 위에서 8000ms 정지. 그 요청은 ping 로그 없음·connectMs 0 = 형제가 웜 ping 300ms 창에 있는 동안 살아 있는 이웃으로 세어 ping 을 건너뛰었다(A 의 알려진 한계 그대로). 형제는 ping 실패 → detach → 재연결 → 200.
  - 🔴 **detach 는 이미 나간 이웃의 명령을 깨우지 않았다.** 형제의 `[db-detach] stale client closed`(+1140ms) 뒤에도 503 쪽 find 는 8000ms 까지 pending. db.js catch 주석("그 위의 이웃 op 은 세션 종료/미연결 에러로 빨리 실패하고")은 체크아웃 전 op 에만 맞는다. 원인(드라이버 close 가 체크아웃된 커넥션을 즉시 끊지 않음)은 추정·미검증.
  - **21건 = 보안 가드 레인의 1000ms 예산**(`worker/lib/security/index.js` `SECURITY_DB_TIMEOUT_MS=1000`, retries 0, fail-open). activate 10·free/reading 9·unlock 2, 해당 요청은 전부 정상 응답(200/예정된 402). 끝난 요청 소켓 위 정지는 0건 — 걸린 명령은 자기 요청이 연 소켓·살아 있는 형제의 소켓이거나, 새 소켓 준비(~870ms)를 기다리다 마감 130ms 전에야 나갔다(free/reading 예). 1000ms 출처 판정 근거: worker/lib·worker/payments·worker/yeongnyangi·worker/routes/yeongnyangi.js 에서 1000ms 시도 예산을 주는 곳이 이것뿐(코드 대조, 호출 스택은 로그에 없음). activate 의 "재시도로 회복"도 사실은 가드 fail-open 이다.
- 결론: 성공 기준 "[db-op-timeout] 0건"은 연결 계층 설계로는 닿지 않는다(21/25 가 보안 레인 예산). 기준을 **재현 스크립트 4/4 PASS + 끝난 요청 소켓 위 [db-op-timeout] 0건**으로 좁히고, 보안 레인은 별도 과제로 둔다.

## 설계안 (RED, 공용 DB 계층 — 승인 후)
- A: 완료(`0b644f4d6`). 좀비 op 이 ping 을 끄던 경로는 막혔다.
- **D (권장, 작음, 신규):** 웜 ping 이 진행 중이면 뒤따라 들어온 요청은 ping 을 건너뛰지 말고 그 검증(과 이어지는 재연결 `connectPromise`)을 함께 기다린다(single-flight). 4/4 실측 경로를 정면으로 막는다 — 503 쪽이 형제의 ping 실패 → 재연결을 기다려 새 커넥션을 탄다(예상 ≈ 형제 wall 4초, 8초 503 대신). 이웃이 **op 을 돌리는 중**(크론 등)이면 종전대로 ping 생략이라 `cron-shared-connection-teardown` 계약은 그대로다. 기존 장치 확인: `connectPromise` 는 수립만 공유하고 검증은 공유하지 않는다(db.js `if (!connectPromise)`). 롤백은 그 커밋 revert.
  - 한계(A 와 공통): 이웃이 op 을 돌리는 중에 들어온 요청은 여전히 ping 없이 풀의 끝난 요청 소켓을 받을 수 있다 — 근본은 C.
- B: 거짓 실패 가드를 "이 요청이 연 소켓"일 때로 좁힌다(AsyncLocalStorage). 이번 503 4건에는 개입하지 않았다 → 우선순위 낮춤.
- C (구조, 큼): 요청 범위 클라이언트. 매 요청 핸드셰이크 ~1.5초(스테이징 `[db-connect] elapsedMs` 1537~1565 실측) × 전 라우트.
- 계약 테스트 유지: `db.mongoose-detach-contract`·`db.warm-teardown-off-critical-path`·`cron-shared-connection-teardown`.

## 남은 것
1. **재현 스크립트 호라리 결함 수정(선행) → 설계안 D 승인 → 구현 → 재현 4회.** `scripts/verify-yeongnyangi-worker-mongo-staging.mjs` 가 categories.json 전 카테고리를 무료 리딩으로 요청해 호라리에서 400 `HORARY_FREE_PROMPT_REQUIRED` 를 받는다(DB 문제 아님). attendance 단언이 `attendance[0]` 만 봐서 503 이 섞여도 통과할 수 있는 것도 함께 본다.
2. **피해 주문 조회(읽기 전용, 운영 DB → 실행 전 승인):** `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny` 와 `payments` 중 `requestId:/^yn-[a-f0-9]{64}$/`, 결제 완료, `metadata.consumedBy:null`, `metadata.yeongnyangiRecoveryAfter` 가 미래인 건. 해제 쓰기는 별도 승인.
3. 범위 밖 보고: `verify-yeongnyangi-result-retry.mjs` 가 package.json·CI 에 배선돼 있지 않고, `paid-flow-gates.yml` 트리거에 `app/yeongnyangi/**`·`worker/yeongnyangi/**` 가 없다. 보안 가드 레인이 새 소켓 준비(~870ms)에 밀려 POST 마다 ~1초를 쓰고 fail-open 한다(그 순간 가드는 사실상 꺼짐). db.js catch 주석의 "이웃 op 은 빨리 실패" 서술은 위 실측과 어긋난다(D 구현 때 함께 고친다).

다음 세션 첫 문장: "docs/handoff/yeongnyangi-paid-result-attach-503.md 를 읽고 남은 것 1(호라리 결함 수정 후 설계안 D)을 진행해줘."
