---
status: active
updated: 2026-09-24
next: 설계안 C2(결제 레인 계측, 동작 변경 없음)를 main 에 올리고 스테이징에서 실측했다 — 결제 레인 줄이 lane·scope 와 함께 찍히고, 🔴 결제 레인도 끝난 요청이 연 소켓을 재사용해 8초 정지 뒤 재시도로 회복했다(조회 wall 9006ms). 다음은 C3 과 C4 의 순서 결정(C4 선행 검토), C3 전 autoCreate 처리와 프로덕션 재사용률 확인 여부, C5 전 보안 레인 예산 (a)/(b)
---
# 영냥이 결제 직후 "상담 기록에 잠시 연결하지 못했어요" — 인수인계 (2026-09-24)

## 끝난 것 (main)
- `dbeab8865` Result.tsx: activate 가 실패해도 읽은 요청 행 유지(`node scripts/verify-yeongnyangi-result-retry.mjs`). `89f4d3334` DB-503 문구. `7d1989347` recovery.js: DB 일시 오류면 5분 보류. `60d4cf1da` 재현 픽스처 `analysis` 수정.
- `011a3c527`(머지 `d2e138ca1`) db.js **계측만, 동작 변경 없음**: `[db-op-timeout]` 의 `lastCheckOutFailReason` 은 그 시도에 checkOutFailed 가 있을 때만 붙는다. `pending[]`(응답 없는 명령·커넥션) 추가. 풀이 소켓을 열 때 `[db-conn-open] {conn}` — 소켓을 연 요청의 tail 이벤트에 찍힌다.
- `0b644f4d6` db.js **설계안 A**: `countLiveMongoOps()` = 아직 호출자에게 안 돌아간 op. 웜 ping-skip 과 fresh 거짓 실패 가드의 이웃 판정만 이것으로 바꿨다(withMongoRetry finally 에서 `returnedToCaller`). 리셋 안전 회계(`countActiveMongoOps`)는 그대로. `[db-op-timeout]` 에 `liveOps` 추가. 테스트 2건(`db.warm-connection-revalidation`), 두 판정 지점 모두 변이로 테스트가 무는 것 확인. main CI(PR CI 1aa020451, 재실행 1회 — 러너 인증서 플레이크) 녹색.
- `04948d2bc` 재현 스크립트: 호라리는 무료 리딩에서 400 `HORARY_FREE_PROMPT_REQUIRED` 가 계약이므로(free-service.ts) 그 거절을 단언하고 나머지 15개만 저장 기대. 동시 attendance·unlock 은 **모든** 응답 200 을 단언(`attendance[0]` 만 보던 구멍 제거).
- `a7af98e15`(머지 `ea7d0381e`) 설계안 D → **revert `56bbe9f2b`**(아래 재현 결과). db.js·테스트는 D 이전과 동일.
- `ac815121e`(머지 `289c96d9a`) db.js **설계안 E, 계측만**: `APP_ENV=staging` 일 때 명령마다 `[db-cmd] {k,cmd,coll,conn}`(보낸 요청의 tail 이벤트)과 `[db-cmd-ok] {k,ms}`/`[db-cmd-fail] {k,ms,err}`(k 로 조인). 프로덕션은 APP_ENV 가 없어 새 로그 0. 테스트 1건(`db.op-timeout-instrumentation`, 프로덕션 무출력까지 단언). main CI 녹색.
- `3b338fbdf`(머지 `b746b17ad`) **설계안 C1, 동작 변경 없음**: 신규 `worker/lib/db-scope.js`(ALS 스토어 `{ id }`, `runInDbScope`·`currentDbScopeId`·`withDbScopes`). `worker/index.js` 는 `export default {` → `const app = {`, 맨 끝에 `export default withDbScopes(app)` — 핸들러를 이름 나열 없이 전부 감싼다(fetch 1건·queue 배치 1건·scheduled 1회 = 스코프 하나, id `f-/q-/s-` + 6자). `async scheduled(` 텍스트는 `app` 안에 남아 `verify-cron-mongo-op-coverage`·`verify-payment-reconcile` 통과. db.js: `[db-conn-open] {conn, scope}`(프로덕션도 출력), `[db-cmd] {…, scope}`(스테이징 전용). 테스트 1건 추가 + 기존 스테이징 단언에 `scope: null`(`db.op-timeout-instrumentation` 5/5, 변이로 무는 것 확인). check:fast 전체 jest 승격 통과, main CI `CI required`·Release 녹색.
- `f14d0e36d` **설계안 C2, 동작 변경 없음**: 결제 소켓 레인(`connectPaymentDb` 의 `establishLane`)에 `instrumentMongoClient(client, "payment")` — `createConnection` 직후·`asPromise()` 전에 걸어 첫 풀 소켓도 잡는다. `[db-conn-open]` 에 `lane: shared|payment`(`[db-cmd]`·`pending[]` 은 conn 으로 조인). 결제 요청은 `skipSharedConnect` 로 `connectDb` 를 건너뛰므로 `connectPaymentDb` 도 스테이징 `[db-cmd]` 추적 플래그를 스스로 정한다(결제만 받은 아이솔레이트에서 추적이 꺼져 있던 구멍). 테스트 1건 추가 + 기존 단언에 `lane: "shared"`(`db.op-timeout-instrumentation` 6/6, 변이 2종 — 수립 뒤 계측·플래그 줄 삭제 — 둘 다 새 테스트가 문다). `0b618a8ff` 재현 스크립트: 로그인 직후 픽스처 주문 `GET /api/payments/orders/qa-edge-<run>-0` 을 두 번 읽는다(withPaymentDb, 읽기 전용, 판정은 PASS 직전). check:fast(전체 jest 294/4190) 통과, main CI `PR CI` 포함 전부 녹색, 스테이징 배포 성공(프로덕션 release 잡 skipped).

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

## 설계안 E 재현 결과 (스테이징 3회, 워커 83f095d4 = 56155b3, E 포함) — 가설 확정
재현 3회 완주, 3/3 FAIL(동시 attendance 503, wall 8004·8003·11140). 픽스처 정리 3/3 PASS, PG·LLM 0. 요청 이벤트 64건, `[db-cmd]` 615건. 판정: `[db-cmd]`(보낸 요청) × `[db-conn-open]`(소켓을 연 요청) × `[db-cmd-ok|fail]`(k 조인). `endSessions` 는 close 때 응답을 기다리지 않아(ms=0 "성공") 표본에서 뺐다.

| 소켓을 연 쪽 | 응답 성공 | 서버 에러 응답 | 무응답 |
|---|---|---|---|
| 자기 요청 | 418 | 2 | 69 |
| 끝난 다른 요청 | **0** | 0 | 65 |
| 살아 있는 다른 요청 | **0** | 0 | 3 |

- ✅ **가설 확정(실측):** 다른 요청이 연 소켓 위 명령 68건 중 응답 0건. 소켓을 연 요청이 살아 있어도 0/3. 받은 응답 420건은 전부 보낸 요청의 이벤트에 찍혔다(다른 컨텍스트로 새는 응답 없음).
- 웜 ping: 자기 요청이 연 소켓 111/111 성공, 끝난 요청이 연 소켓 0/53. 요청 사이 웜 재사용은 **한 번도** 성공하지 않았고, DB 를 쓴 요청마다 ping 300ms + 재수립(62회, 1245~1741ms, 중앙 1627ms)을 낸다.
- 자기 소켓 무응답 69건은 전부 `create/<컬렉션>` 이고, 전부 그 클라이언트의 close(`endSessions`) 3초 안에 나갔다. 떼어 내는 낡은 클라이언트 위 모델 초기화 create 가 close 에 잘린 것으로 본다(추정 — close 와의 시간 관계만 실측). 사용자 경로와 무관.
- 503 3건: 1·2회차는 늦게 들어온 attendance 의 `find/users` 가 **직전 activate(402, 끝남)가 연 소켓**에서 8000ms 정지(A 의 알려진 한계). 3회차는 `find/yeongnyangi_anchovy_ledger` 가 **아직 살아 있던 형제 attendance 가 연 소켓** `444b#1` 에서 정지했다. → 전역 클라이언트를 유지한 채 "끝난 요청의 클라이언트만 교체"하는 설계로는 3회차를 못 막는다.
- 살아 있는 다른 요청 소켓 3건 = 1회차 동시 activate 둘이 서로의 소켓으로 보낸 `abuse_scores`(보안 레인, fail-open) 2 + 3회차 503 1.
- 분석기(스크래치, 레포에 없음): `%TEMP%\claude\d--Development-code-destiny\ea9cf83d-6325-49a8-bf53-534928dd7884\scratchpad\cmds.mjs <tail.json> summary|others|noreply|cmdtally <cmd>`. 위 조인 규칙이면 다시 만들 수 있다.

## 설계안 C1 재현 결과 (스테이징 1회, 워커 72b623bf = b746b17ad, C1 포함) — ALS 전파 확인
동작 변경이 없어 1회만 돌렸다. 버전 대응 근거: 모든 `[db-conn-open]`·`[db-cmd]` 줄에 `scope` 필드가 있고, 재현 시점 origin/main 이 b746b17ad 였다. 결과 FAIL(동시 attendance 503, wall 8007 — 예상대로, C1 은 동작을 바꾸지 않는다). 픽스처 정리 PASS, PG·LLM 0. 이벤트 24건, `[db-cmd]` 249줄, `[db-conn-open]` 99줄.
- ✅ **C3 의 전제 성립(실측):** 요청 흐름이 보낸 명령은 **전부** 스코프가 찍혔다 — find 70·ping 57·endSessions 22·findAndModify 9·commit/abortTransaction 5·insert 2·create 32(재연결 뒤 모델 재초기화). 한 tail 이벤트에 스코프 둘 이상 0건, 한 스코프가 이벤트 둘 이상 0건. 드라이버의 체크아웃 대기·풀 콜백을 지나도 ALS 가 끊기지 않는다.
- 스코프가 null 인 줄은 **`create` 52줄 + 그 create 가 연 소켓 10줄뿐**이다(POST auth/login 1건·queue 2건, 전부 아이솔레이트의 첫 연결 직후). mongoose 모델 초기화(`autoCreate` — db.js 는 `autoIndex:false` 만 끄고 `autoCreate` 는 기본값 true, mongoose 9.3.0)의 비동기 연속이 **모듈 로드 때** 걸려서 요청 스코프 밖이다. 그 직전에 workerd 가 "A promise was resolved or rejected from a different request context" 경고를 4번 찍었다. E 표의 "자기 소켓 무응답 create 69건"도 이 계열이다.
- 스코프 판정과 이벤트 판정은 null 을 뺀 175건에서 **100% 일치**(자기 154·다른 요청 21). 다른 요청 소켓 위 21건은 **전부 무응답**(E 와 합쳐 0/89): 끝난 요청 소켓 위 웜 ping 18, 동시 activate 끼리 보안 레인 `abuse_scores` 2(살아 있는 형제), 503 1 = 늦게 온 attendance 의 `find/users` 가 **직전 activate(402, 끝남)가 연 소켓**에서 정지(E 1·2회차와 같은 경로).
- 🔴 **C3 설계 입력:** 모델 프록시가 스코프 커넥션마다 `connection.model()` 을 컴파일하면 모델 초기화가 **요청마다** 모델 수만큼 `create` 를 낸다(63개). 스코프 커넥션은 `autoCreate:false` 가 필요하다 — 끄기 전에 스키마 옵션으로 컬렉션을 만드는 모델(capped·timeseries·collation·validator)이 있는지 전수 확인(없으면 첫 insert 가 컬렉션을 암묵 생성). 모듈 로드 때 걸리는 전역 모델 초기화도 C3 의 `[db-scope-miss]` fail-closed 판정에서 따로 분류해야 한다(지금 그대로면 매 첫 연결마다 miss).
- 범위 밖 관찰(실측+추정): 콜드 로그인 1건이 9695ms. 첫 연결 직후 create 47건이 풀을 점유했고(+2497~+6486ms), 로그인의 첫 시도가 정확히 4000ms(= `MONGO_WAIT_QUEUE_TIMEOUT_MS`) 뒤 `MongoWaitQueueTimeoutError` 로 재시도했다. create 뒤에 줄 서서 대기했다는 인과는 추정(시각 일치만 실측).
- 분석기: E 분석기 사본에 `scope` 모드 추가(`nullLines`·`multiScopeEvents`·`multiEventScopes`·스코프×이벤트 일치표, null 은 sender-null/opener-null/both-null 로 분리). `%TEMP%\claude\d--Development-code-destiny\389c9580-5b29-417e-a0b9-1052d09f4fc8\scratchpad\cmds.mjs <tail.json> summary|others|scope`. 스테이징 tail 은 main 체크아웃에서 띄운다 — 워크트리에서 띄운 `npx wrangler tail` 은 출력 없이 exit 0 으로 끝났다(원인 미확인).

## 설계안 C2 재현 결과 (스테이징 1회, 워커 e3d7fcf5 = 0b618a8ff, C2 포함) — 결제 레인 관측 확보
동작 변경이 없어 1회만 돌렸다. 버전 대응 근거: 모든 `[db-conn-open]` 에 `lane` 필드가 있고 tail 버전이 e3d7fcf5 하나다. 결과 FAIL(동시 attendance 503, wall 8079 — 예상대로). 결제 레인 프로브 2/2 200, 픽스처 정리 PASS, PG·LLM 0. 이벤트 26건, `[db-cmd]` 473줄, `[db-conn-open]` 116줄(payment 2).
- ✅ **C2 성공 기준 충족(실측):** 결제 레인 `[db-conn-open]` 2줄 모두 `lane:"payment"`·scope 있음, 레인 `[db-cmd]` 3줄 모두 scope 있음, `[db-op-timeout]` 이 레인 명령을 셌다(`delta.commandStarted:1`, `pending:[find@8eyv#1]`). 첫 소켓 `8eyv#1` 의 `[db-conn-open]`(+0.60s)이 `payment lane connected`(+1.32s)보다 먼저 찍혔다 = 수립 전 계측이 첫 소켓을 잡는다.
- 🔴 **결제 레인도 끝난 요청의 소켓을 재사용한다(실측, C4 위험 확정):** 첫 GET(wall 1486ms)이 레인을 세우고 `8eyv#1` 로 find 137ms. 0.24초 뒤 들어온 두 번째 GET 은 `readyState === 1` 만 보고(웜 ping 없음) **끝난 첫 요청이 연 `8eyv#1`** 으로 find → 무응답 8000ms → `[db-op-timeout]` → `retryOnOperationTimeout` 재시도가 같은 레인 클라이언트에서 새 소켓 `8eyv#2`(자기 요청이 연 것)를 받아 143ms 성공. 응답은 200 이지만 **wall 9006ms**(`[pay]` attempts 2). 재시도가 산 것은 `#1` 이 아직 체크아웃 중이라 풀이 새 소켓을 열었기 때문이다 — 풀에 끝난 요청의 유휴 소켓이 더 있으면 재시도도 그 위로 가서 503 이 될 수 있다(추정). 결제 레인은 스테이징·프로덕션 모두 ON 이라 프로덕션 결제 경로도 같은 아이솔레이트의 연속 결제 요청마다 8초를 낼 것으로 본다(추정 — IoContext 규칙은 환경 무관, 프로덕션 미측정).
- 공유 레인 scope=null 명령 259줄은 전부 콜드 아이솔레이트 6개의 첫 연결 직후 모델 초기화 `create`(51~52줄씩, queue 3)다 — C1 의 null 과 같은 계열이고 C2 회귀가 아니다(요청마다 `[db-connect] … attempt=1/3` 콜드 연결과 일치).
- attendance 503 = 늦게 온 attendance 의 `find/users` 가 **아직 살아 있던 형제 attendance 가 연 소켓** `oc0e#5` 에서 정지(E 3회차와 같은 경로, C3 영역). 다른 요청 소켓 위 명령은 그 외 끝난 클라이언트 close 3초 안의 무응답 24건뿐 — 성공 0건(누적 0/115).
- 분석기: C1 분석기 사본에 `lane` 모드 추가(레인별 소켓 개설·레인 명령의 소켓 소유×응답·레인 `[db-op-timeout]`·결제 라우트 이벤트). `%TEMP%\claude\d--Development-code-destiny\7acedd24-9b5d-42ee-b4a7-0736ae25ccc0\scratchpad\cmds.mjs <tail.json> summary|others|scope|lane`.

## 설계안 C 제안 — 요청 범위 연결 (RED: DB·결제·인증·라우팅 진입, 승인 전 구현 금지)
목표: 한 요청(fetch 1건·queue 배치 1건·scheduled 1회)의 Mongo 명령은 **그 요청이 연 소켓으로만** 나간다. 3회차대로 살아 있는 동시 요청끼리도 소켓을 나눌 수 없으므로, "소유권 확인 후 재사용"이 아니라 요청마다 자기 연결이다.
- **스코프:** C1 완료 — `worker/lib/db-scope.js` 스토어 `{ id }`, `export default withDbScopes(app)`(위 "끝난 것"). C3 은 스토어에 `connection`·`paymentConnection`·`models` 를 더하고, 닫기에 필요한 `ctx` 는 `withDbScopes` 가 핸들러 인자에서 받는다(fetch·scheduled 는 3번째, queue 도 3번째). ALS 선례: `worker/lib/ai-locale-context.js`.
- **연결:** 스코프 안의 `connectDb` 는 스코프에 `mongoose.createConnection()` 을 한 번 만들고 재사용한다(요청당 풀 2). 웜 ping·detach·거짓 실패 가드·이웃 판정은 스코프 안에서 할 일이 없어진다. 결제 레인 `connectPaymentDb` 도 아이솔레이트 전역(`paymentConnection`)이라 같은 위험이 있으므로 스코프로 옮긴다.
- **모델:** 63개(models.js 52·yeongnyangi-models 4·gift-models 3·app-store/feedback/review/purchase-entitlement 각 1)가 전역 기본 커넥션에 묶여 있고, 호출부는 connectDb 291곳(78파일)·withMongoRetry 329곳(68파일)이다. 호출부를 바꾸지 않도록 모델 export 를 **스코프 해석 프록시**로 바꿔 접근 시 `scope.connection.model(name, schema)` 를 지연 컴파일해 돌려준다. 스코프 밖(테스트·모듈 초기화)은 전역 커넥션으로 폴백하되, 워커 런타임의 스코프 밖 DB 접근은 `[db-scope-miss]` 로그 + 스테이징 재현에서 실패로 센다(fail-closed).
- **트랜잭션:** `mongoose.startSession()` 10곳(payment-service·routes/payments·routes/rpg·guardian-fortune-usage 각 1·yeongnyangi repository 4·free-repository 2) + `mongoose.connection.startSession()` 1곳(pass-consumption)은 전역 커넥션 세션이라 스코프 모델과 섞이면 안 된다 → `startScopedSession()` 헬퍼로 바꾼다. `mongoose.connection` 직접 사용 7곳(6파일, db.js 제외, pass-consumption 포함)도 같은 헬퍼로. `worker/payments/db.js` 의 레인 세션은 레인 커넥션을 따라간다(C4).
- **닫기:** 진입 래퍼가 `ctx.waitUntil(scope.closeWhenIdle())` — 스코프의 live op 0 + 짧은 grace 뒤 close. 스트리밍 응답(SSE·LLM)은 핸들러 반환 뒤에도 op 이 이어지므로 "반환 = 종료"로 닫지 않는다.
- **`cron-shared-connection-teardown`:** 이 계약은 "이웃의 ping 실패가 남의 소켓을 끊는다"를 막는다. 스코프마다 연결이면 그 이웃이 없어 전제가 사라진다. 테스트는 지우지 않고 "같은 아이솔레이트에서 겹친 크론 둘이 서로의 연결을 닫지 않는다"로 의미를 옮긴다. `verify-cron-mongo-op-coverage` 는 admission 회계 때문에 유지. admission(`__mongoOperationAdmission`·`__mongoPaymentAdmission`)은 아이솔레이트 동시 op 상한이라 그대로.
- 🔴 **보안 레인(결정 필요):** 요청의 첫 DB 접촉은 대개 보안 가드(`SECURITY_DB_TIMEOUT_MS=1000`, fail-open)다. 스코프 연결의 핸드셰이크(1245~1741ms)가 그 예산 안에 끝나지 않으므로 C 를 그대로 넣으면 **가드가 매 요청 fail-open** 한다. (a) 가드 예산에서 연결 수립을 빼고 명령만 1000ms — 추천, 라우트 지식이 진입으로 새지 않는다. (b) 진입 래퍼가 DB 라우트에서 연결을 선착수. 보안 동작 변경이라 별도 커밋·별도 승인.
- **비용:** 스테이징은 지금도 요청마다 ping 300 + 재수립 ~1.6초를 내므로 C 는 ~300ms 줄인다. 프로덕션 재사용률은 미측정(IoContext 규칙은 환경과 무관하니 같을 것 — 추정). 확인은 프로덕션 tail 의 `[db-ping]` 줄 읽기(실행 전 승인). 연결 생성은 지금의 재수립 빈도와 같아 M10 신규 커넥션 생성률(노드당 15/s) 부담은 늘지 않는다(추정).
- **미검증 위험(C3 전 확인):** 스코프 커넥션의 `autoCreate:false` 와 그 전제(위 "C1 재현 결과"의 C3 설계 입력). 프록시가 깨는 패턴(`instanceof 모델`·모듈 최상위 모델 사용·`Model.schema` 정적 접근) 전수 grep. 요청당 모델 컴파일 비용·메모리. close 를 놓친 클라이언트의 드라이버 타이머(poll 모니터)가 IoContext 종료 뒤 어떻게 되는지.
- **단계(각각 revert 가능한 커밋):** C1 스코프 도입 + `[db-conn-open]` 에 스코프 id(동작 변경 없음 — opener 판정이 tail 이벤트 추정에서 실측이 된다) → C2 결제 레인 계측(아래 범위 밖 보고의 누락 보완, 계측만) → C3 공유 레인 스코프 연결 + 모델 프록시 + 세션 헬퍼 → C4 결제 레인 스코프 연결(payment-freeze 절차·paid-gate-auditor) → C5 보안 레인 예산. 스코프 밖 폴백에만 남는 웜 ping·detach 코드 정리는 그 뒤 별도 변경(3면 grep).
- **판정·롤백:** 매 단계 스테이징 재현 4회 + E 분석기. 성공 = 재현 4/4 PASS, 다른 요청 소켓 위 명령 0건(`others` 모드 빈 출력), 끝난 요청 소켓 위 `[db-op-timeout]` 0건. 회귀 시 그 단계 커밋만 revert.
- 버린 대안: 전역 클라이언트 + 요청 소유권 태그로 낡은 클라이언트만 즉시 교체(1·2회차만 막고 3회차 못 막음). 아이솔레이트 뮤텍스로 DB 요청 직렬화(처리량 붕괴, 스트리밍이 잠금을 오래 쥠). Durable Object DB 프록시(쿼리 전부 RPC·모델·트랜잭션 재작성, DO 안 소켓 재사용도 미검증).

## 설계안 (RED, 공용 DB 계층 — 승인 후)
- A: 완료(`0b644f4d6`). 좀비 op 이 ping 을 끄던 경로는 막혔다.
- **D: 폐기(`56bbe9f2b` revert).** 리더의 새 커넥션도 리더가 연 소켓이라 안전하지 않다(위 재현 결과). 같은 구조(검증 공유)로 재시도하지 않는다. 당시 제안은 다음과 같았다: 웜 ping 이 진행 중이면 뒤따라 들어온 요청은 ping 을 건너뛰지 말고 그 검증(과 이어지는 재연결 `connectPromise`)을 함께 기다린다(single-flight). 4/4 실측 경로를 정면으로 막는다 — 503 쪽이 형제의 ping 실패 → 재연결을 기다려 새 커넥션을 탄다(예상 ≈ 형제 wall 4초, 8초 503 대신). 이웃이 **op 을 돌리는 중**(크론 등)이면 종전대로 ping 생략이라 `cron-shared-connection-teardown` 계약은 그대로다. 기존 장치 확인: `connectPromise` 는 수립만 공유하고 검증은 공유하지 않는다(db.js `if (!connectPromise)`). 롤백은 그 커밋 revert.
  - 한계(A 와 공통): 이웃이 op 을 돌리는 중에 들어온 요청은 여전히 ping 없이 풀의 끝난 요청 소켓을 받을 수 있다 — 근본은 C.
- B: 거짓 실패 가드를 "이 요청이 연 소켓"일 때로 좁힌다(AsyncLocalStorage). 이번 503 4건에는 개입하지 않았다 → 우선순위 낮춤.
- **C (구조, 큼, 1순위):** 요청 범위 연결 — 위 "설계안 C 제안" 절. 사용자가 "C1 스코프 도입부터" 진행을 요청했다(2026-09-24). C1 완료(`3b338fbdf`), C2 완료(`f14d0e36d`). C4 는 payment-freeze 절차, C5 는 보안 동작 변경이라 각각 별도 승인이 필요하다.
- E: 완료(`ac815121e`). 가설 확정(위 "설계안 E 재현 결과"). 스테이징 전용이라 C 판정이 끝날 때까지 유지한다.
- 계약 테스트 유지: `db.mongoose-detach-contract`·`db.warm-teardown-off-critical-path`·`cron-shared-connection-teardown`.

## 남은 것
1. **C3·C4 순서 결정 → 구현.** C2 는 끝났다(위 "C2 재현 결과"). 결정할 것 셋: ① **C4(결제 레인 스코프 연결)를 C3 보다 먼저 할지** — 추천: 먼저. 결제 레인 재사용 정지가 실측으로 확정됐고(연속 결제 조회 wall 9006ms), 레인은 `worker/payments` 만 쓰는 전용 커넥션이라 C3 의 모델 프록시(63개)·세션 헬퍼 없이도 옮길 수 있을 가능성이 크다(추정 — 결제 모델이 레인 커넥션에 어떻게 묶이는지 `worker/payments/db.js`·`worker/payments/orders.js` 부터 확인). payment-freeze 절차·paid-gate-auditor 대상이라 별도 승인. ② C3 전에 프로덕션 재사용률 확인(프로덕션 tail 읽기, 실행 전 승인)을 할지 — 이제 결제 레인 `[db-conn-open]` 에 lane 이 찍히므로 같은 tail 로 결제 레인 재사용도 함께 볼 수 있다. ③ C5 전 보안 레인 예산 (a)/(b). C3 은 위 "C1 재현 결과"의 autoCreate 입력을 반영한다. 재현은 `YN_READ_REPEATS=10 node scripts/verify-yeongnyangi-worker-mongo-staging.mjs --staging-fixtures`(결제 레인 프로브 2회 포함) + staging tail(main 체크아웃에서 띄움), 판정은 C2 분석기 `summary|others|scope|lane`. C4 성공 기준에 "두 번째 결제 조회가 자기 요청이 연 레인 소켓만 쓴다(`lane` 모드 byReq 에 other-* 0건)"를 더한다.
   - 🔴 재현 러너를 도중에 죽이면 스크립트 `finally` 정리가 돌지 않는다. 설계안 D 재현 3회차 고아 픽스처 1건이 스테이징 `code_destiny_staging` 에 남았다(E 재현 3회는 정리 PASS): User `yn-edge-8633b567-…@example.invalid`(생성 2026-09-23T23:01:53Z) + 요청 3·Payment 2(`metadata.stagingQaRun`)·ProfileCard 1·RefreshTokenSession 1. 이 세션의 삭제 시도는 권한 분류기가 막았다. 사용자 승인 뒤 스크립트 finally 와 같은 범위로 지운다(run UUID 는 이메일에서, 요청 id 는 sha256(run+':'+n), n=0..2). 러너는 tail 종료 알림만 믿고 멈추지 말고 tail 파일이 계속 자라는지 확인한다.
2. **피해 주문 조회(읽기 전용, 운영 DB → 실행 전 승인):** `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny` 와 `payments` 중 `requestId:/^yn-[a-f0-9]{64}$/`, 결제 완료, `metadata.consumedBy:null`, `metadata.yeongnyangiRecoveryAfter` 가 미래인 건. 해제 쓰기는 별도 승인.
3. 범위 밖 보고: `verify-yeongnyangi-result-retry.mjs` 가 package.json·CI 에 배선돼 있지 않고, `paid-flow-gates.yml` 트리거에 `app/yeongnyangi/**`·`worker/yeongnyangi/**` 가 없다. 보안 가드 레인이 새 소켓 준비(~870ms)에 밀려 POST 마다 ~1초를 쓰고 fail-open 한다(그 순간 가드는 사실상 꺼짐). db.js catch 주석의 "이웃 op 은 빨리 실패" 서술은 위 실측과 어긋난다(D 와 함께 고쳤다가 revert 로 되돌아갔다 — C 작업 때 고친다). 결제 레인 계측 누락은 C2(`f14d0e36d`)로 해소. 🔴 `[pay]`·`[db-slow-op]` 의 `connectMs` 는 결제 레인 수립 시간을 세지 않는다 — 첫 결제 GET 이 `payment lane connected. elapsedMs=1324` 를 냈는데 `[pay]` 는 `connectMs:0, opMs:1461` 이다(수립이 op 시간에 섞임, 실측). `docs/handoff/yeongnyangi-paid-flow-speed-2026-09-24.md` 의 checkout 지연 분해(`[pay]` breakdown)가 이 값을 쓰면 연결 비용이 쿼리 비용으로 보인다 — 그 문서의 "connect-vs-query 분해" 검증에 이 사실과 위 "C2 재현 결과"의 레인 재사용 정지(9006ms)를 함께 넘긴다. `/api/payments/recoveries` 는 v2(withPaymentDb)로 라우팅되지 않고 레거시 `handlePaymentRoutes` 로 간다(worker/index.js — 프로브를 `orders/:id` 로 고른 이유). 아이솔레이트 첫 연결의 모델 초기화 create 47건이 콜드 로그인을 9.7초로 늘린 정황(위 "C1 재현 결과", 인과는 추정).

다음 세션 첫 문장: "docs/handoff/yeongnyangi-paid-result-attach-503.md 를 읽고 남은 것 1(C3·C4 순서 결정)부터 진행해줘."
