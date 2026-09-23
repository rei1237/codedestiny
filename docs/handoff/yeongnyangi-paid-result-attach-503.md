---
status: active
updated: 2026-09-24
next: 설계안 D 는 스테이징 재현에서 반증돼 revert 했다. "다른 요청이 연 소켓은 그 요청이 살아 있어도 답하지 않는다" 가설을 계측(동작 변경 없음)으로 확정한 뒤 설계안 C(요청 범위 클라이언트)를 설계한다
---
# 영냥이 결제 직후 "상담 기록에 잠시 연결하지 못했어요" — 인수인계 (2026-09-24)

## 끝난 것 (main)
- `dbeab8865` Result.tsx: activate 가 실패해도 읽은 요청 행 유지(`node scripts/verify-yeongnyangi-result-retry.mjs`). `89f4d3334` DB-503 문구. `7d1989347` recovery.js: DB 일시 오류면 5분 보류. `60d4cf1da` 재현 픽스처 `analysis` 수정.
- `011a3c527`(머지 `d2e138ca1`) db.js **계측만, 동작 변경 없음**: `[db-op-timeout]` 의 `lastCheckOutFailReason` 은 그 시도에 checkOutFailed 가 있을 때만 붙는다. `pending[]`(응답 없는 명령·커넥션) 추가. 풀이 소켓을 열 때 `[db-conn-open] {conn}` — 소켓을 연 요청의 tail 이벤트에 찍힌다.
- `0b644f4d6` db.js **설계안 A**: `countLiveMongoOps()` = 아직 호출자에게 안 돌아간 op. 웜 ping-skip 과 fresh 거짓 실패 가드의 이웃 판정만 이것으로 바꿨다(withMongoRetry finally 에서 `returnedToCaller`). 리셋 안전 회계(`countActiveMongoOps`)는 그대로. `[db-op-timeout]` 에 `liveOps` 추가. 테스트 2건(`db.warm-connection-revalidation`), 두 판정 지점 모두 변이로 테스트가 무는 것 확인. main CI(PR CI 1aa020451, 재실행 1회 — 러너 인증서 플레이크) 녹색.
- `04948d2bc` 재현 스크립트: 호라리는 무료 리딩에서 400 `HORARY_FREE_PROMPT_REQUIRED` 가 계약이므로(free-service.ts) 그 거절을 단언하고 나머지 15개만 저장 기대. 동시 attendance·unlock 은 **모든** 응답 200 을 단언(`attendance[0]` 만 보던 구멍 제거).
- `a7af98e15`(머지 `ea7d0381e`) 설계안 D → **revert `56bbe9f2b`**(아래 재현 결과). db.js·테스트는 D 이전과 동일.

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

## 설계안 D 재현 결과 (스테이징, 워커 86a6490c = ea7d0381e, D 포함) — 반증, revert
재현 2회 완주 + 3회차 도중 중단(아래 고아 픽스처). main CI `CI required` 녹색. PG·LLM 0, 완주 회차 픽스처 정리 PASS.
- ❌ 2/2 FAIL. 1회차 조회 GET 503(8005ms), 2회차 동시 attendance 503(11748ms). D 자체는 동작했다: 합류 10건·포기 0.
- **attendance 503 = D 의 전제 반증(실측).** 뒤따른 요청은 형제(리더)의 ping 실패 → 재수립을 1932ms 기다린 뒤 새 커넥션을 탔다. 그런데 find 가 **리더가 연 소켓** `io15#1` 로 나갔고 8000ms 무응답이었다. 리더는 그 뒤로도 2.4초 살아 있었다(rtt ~180ms).
- **GET 503 = D 와 무관한 기존 경로.** 직전 GET 이 재수립하고 끝난 지 213ms 뒤에 들어왔고, 그때 스크립트 밖의 `/api/reviews` 요청이 op 을 돌리는 중이어서 이웃 skip 으로 ping 을 건너뛰었다. find 는 끝난 GET 이 연 `6bsy#1` 위에서 정지했다(설계안 D·A 공통 한계 = C 영역).
- `[db-op-timeout]` 8건. 소켓을 연 쪽 기준: 끝난 요청 2(위 GET + activate 1000ms 레인 1)·살아 있는 요청 5(attendance 1 + activate 1000ms 레인 4)·자기 요청 2(겹침 있음).
- 🔴 **가설(추정):** 다른 요청이 연 소켓은 그 요청이 **살아 있어도** 응답이 오지 않는다. 근거는 살아 있는 형제의 소켓 위 정지 5건이고, 응답이 확인된 웜 ping 은 모두 자기 요청이 연 소켓이었다. 반증 사례는 셀 수 없다 — 성공한 명령의 conn id 가 로그에 없다.
- **재사용 실측:** DB 를 쓴 요청 중 웜 ping 성공(재사용)은 1건, ping 실패 → 재수립은 24건이다(재수립 1305~1882ms). 스테이징에서 웜 커넥션은 요청 사이에서 사실상 재사용되지 않는다. 요청마다 이미 ping 300 + 재수립 ~1.5초를 내고 있어, C 의 요청당 핸드셰이크 비용은 현재와 비슷하다(프로덕션은 미측정).
- 분석기: `wrangler tail --format json` 을 파싱해 `[db-op-timeout].pending[].conn` 을 `[db-conn-open]` 과 대조(opener 판정)했다. 이전 세션의 analyze.mjs 에 joins·around·pending503·reuse 모드를 더했다(스크래치, 레포에 없음).

## 설계안 (RED, 공용 DB 계층 — 승인 후)
- A: 완료(`0b644f4d6`). 좀비 op 이 ping 을 끄던 경로는 막혔다.
- **D: 폐기(`56bbe9f2b` revert).** 리더의 새 커넥션도 리더가 연 소켓이라 안전하지 않다(위 재현 결과). 같은 구조(검증 공유)로 재시도하지 않는다. 당시 제안은 다음과 같았다: 웜 ping 이 진행 중이면 뒤따라 들어온 요청은 ping 을 건너뛰지 말고 그 검증(과 이어지는 재연결 `connectPromise`)을 함께 기다린다(single-flight). 4/4 실측 경로를 정면으로 막는다 — 503 쪽이 형제의 ping 실패 → 재연결을 기다려 새 커넥션을 탄다(예상 ≈ 형제 wall 4초, 8초 503 대신). 이웃이 **op 을 돌리는 중**(크론 등)이면 종전대로 ping 생략이라 `cron-shared-connection-teardown` 계약은 그대로다. 기존 장치 확인: `connectPromise` 는 수립만 공유하고 검증은 공유하지 않는다(db.js `if (!connectPromise)`). 롤백은 그 커밋 revert.
  - 한계(A 와 공통): 이웃이 op 을 돌리는 중에 들어온 요청은 여전히 ping 없이 풀의 끝난 요청 소켓을 받을 수 있다 — 근본은 C.
- B: 거짓 실패 가드를 "이 요청이 연 소켓"일 때로 좁힌다(AsyncLocalStorage). 이번 503 4건에는 개입하지 않았다 → 우선순위 낮춤.
- **C (구조, 큼, 이제 1순위):** 요청 범위 클라이언트. 매 요청 핸드셰이크 ~1.5초(스테이징 `[db-connect] elapsedMs` 1537~1565, 이번 재수립 1305~1882 실측) × 전 라우트. 위 재사용 실측대로라면 스테이징에서는 지금도 거의 같은 비용을 낸다. 크론(`cron-shared-connection-teardown`)·결제 전용 커넥션(`MONGO_PAYMENT_*`)·트랜잭션 경로와의 관계를 먼저 조사한다.
- E (계측만, 작음, C 의 선행): 성공한 명령에도 conn id 를 남겨(`commandSucceeded` → 소켓을 연 요청과 대조) 가설을 확정·반증한다. 프로덕션 `[db-ping]` 재사용률도 같은 계측으로 잰다(프로덕션 tail 은 읽기지만 실행 전 승인).
- 계약 테스트 유지: `db.mongoose-detach-contract`·`db.warm-teardown-off-critical-path`·`cron-shared-connection-teardown`.

## 남은 것
1. **설계안 E(계측) → 가설 확정 → 설계안 C 설계안 작성(승인 후 구현).** 같은 재현(`YN_READ_REPEATS=10 ... --staging-fixtures` + staging tail)으로 "다른 요청이 연 소켓 위 성공 명령 0건"인지 본다. 성공 기준(재현 4/4 PASS·끝난 요청 소켓 위 `[db-op-timeout]` 0건)은 그대로다.
   - 🔴 재현 러너를 도중에 죽이면 스크립트 `finally` 정리가 돌지 않는다. 이번 3회차 고아 픽스처 1건이 스테이징 `code_destiny_staging` 에 남았다: User `yn-edge-8633b567-…@example.invalid`(생성 2026-09-23T23:01:53Z) + 요청 3·Payment 2(`metadata.stagingQaRun`)·ProfileCard 1·RefreshTokenSession 1. 이 세션의 삭제 시도는 권한 분류기가 막았다. 사용자 승인 뒤 스크립트 finally 와 같은 범위로 지운다(run UUID 는 이메일에서, 요청 id 는 sha256(run+':'+n), n=0..2). 러너는 tail 종료 알림만 믿고 멈추지 말고 tail 파일이 계속 자라는지 확인한다.
2. **피해 주문 조회(읽기 전용, 운영 DB → 실행 전 승인):** `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny` 와 `payments` 중 `requestId:/^yn-[a-f0-9]{64}$/`, 결제 완료, `metadata.consumedBy:null`, `metadata.yeongnyangiRecoveryAfter` 가 미래인 건. 해제 쓰기는 별도 승인.
3. 범위 밖 보고: `verify-yeongnyangi-result-retry.mjs` 가 package.json·CI 에 배선돼 있지 않고, `paid-flow-gates.yml` 트리거에 `app/yeongnyangi/**`·`worker/yeongnyangi/**` 가 없다. 보안 가드 레인이 새 소켓 준비(~870ms)에 밀려 POST 마다 ~1초를 쓰고 fail-open 한다(그 순간 가드는 사실상 꺼짐). db.js catch 주석의 "이웃 op 은 빨리 실패" 서술은 위 실측과 어긋난다(D 와 함께 고쳤다가 revert 로 되돌아갔다 — C 작업 때 고친다).

다음 세션 첫 문장: "docs/handoff/yeongnyangi-paid-result-attach-503.md 를 읽고 남은 것 1(설계안 E 계측으로 다른 요청 소켓 가설 확정)을 진행해줘."
