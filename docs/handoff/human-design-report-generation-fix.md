---
status: active
updated: 2026-08-31
next: **스테이징에 머지되면 `wrangler tail` 로 새 계측을 읽고 판정한다**(아래 *단계 계측 — 읽는 법과 판정표*). 잔여 두 축(Atlas 핸드셰이크 410–450ms · "라우트 진입 오버헤드" ≈235ms)은 *측정 수단이 없어서* 닫혀 있었고, PR #1366 이 그 분해 계측을 넣었다 — `pingMs`·`resetMs`·`dnsMs`·`helloRttMs`·`socketReadyMs`. 이 PR 자체는 아무것도 최적화하지 않는다. `MONGO_PING_TIMEOUT_MS` 1000→300 은 이미 프로덕션 검증 완료(선행 구간 1223–1264ms → **533–545ms**)
---

# 휴먼 디자인 유료 리포트 — 생성 복구 · 대기 씬 · 차트 병목

## 왜

> "휴먼 디자인 유료 리포트를 불러올때 애니메이션이 있었으면 하고 초기에 차트를 불러올때 너무
> 시간이 걸리는 것으로 볼때 병목이 있으니 해소되어야하며, 결제 이후에 리포트 생성이 안되는
> 심각한 버그가 있으므로 원인 파악 후 제대로 생성되도록 수정해줘"

## 지금 상태

- 요청 3건(생성 복구 · 대기 씬 · 차트 병목)은 코드상 전부 처리돼 `main` 에 있다.
- 일일 상한 결함도 처리됐다 — `/generate` 가 `ai:<svc>:generate(:daily)` 자기 버킷을 쓴다
  (일일 600 = 60리포트 × 서버 웨이브 상한 10, 분당 30). 리포트 1건은 이제 `/start` 예산 1건만
  먹는다. `/generate` 가 `/start` **별칭**인 5개 서비스(ziwei-ai·life-book-ai·love-secret-ai·
  ziwei-island-ai·sukuyo-compatibility-ai)는 그대로 `start` 버킷에 남는다.
- AI 라우트 우회도 닫혔다 — `aiActionFromPath` 가 미분류에 `""`(= 즉시 통과) 대신 기본 버킷
  `other` 를 돌려준다. 새 버킷 4종(`batch` 90 · `basis` 30 · `read` 100 · `unlock` 10)은
  경로별 호출 빈도를 재서 정했고, 기존 분류 79개 경로의 버킷은 하나도 안 바뀌었다.
- `/api/fortune/**` 는 이 작업의 대상이 아니었고, 2026-08-30 실측(`origin/main` db5f8a4ee)으로
  **별도 계층이 있음**을 확인했다. catch-all(`worker/index.js:1458`)이라 `enforceAiRouteSecurity`
  는 안 타지만, LLM 에 닿는 경로는 전부 `resolvePaidRouteAuth` 로 401 을 먼저 내고
  (`worker/routes/fortune.js:6636-6735`) Gemini 앞에 결제 증거 검사가 선다
  (`findAIPromptPaidAccessEvidence`, `:4545`). `saju-ai-consultation/basis` 는 LLM·DB·과금 0.
  비로그인 LLM 노출도 없다 — `GUARDIAN_FORTUNE_GUEST_LIMIT = 0` 이라 게스트 생성이 항상 막힌다
  (`worker/lib/guardian-fortune-usage.js:15`·`:290`). **없는 것**은 분당 상한·일일 AI 예산·
  소프트블록·페이로드 상한뿐이고, 결제가 앞을 막으므로 열린 문이 아니라 심층방어 공백이다.

## 차트 병목 실측 — 병목은 `AUTH` (2026-08-30, 스테이징 로그인 세션)

판정 기준 300ms. 출생입력 `1988-11-07 06:02 Asia/Seoul`, 미스 1회 + 히트 5회.

| 경로 | AUTH | ARCHIVE_LOOKUP / _HIT | 계산(PERS+SEARCH+DESIGN) | CHART | wall |
|---|---|---|---|---|---|
| miss | 3548ms | 429ms | 487ms | 596ms | 5789ms |
| hit ×5 중앙값 | **3122ms** | 413ms | – | – | 3688ms |

- **`AUTH` 가 유일한 병목** — 기준의 10배, 히트 wall 의 84%. 아카이브 Mongo 읽기 413~429ms 는
  기준 초과지만 AUTH 의 1/7.5. 계산 구간 배제 판정은 그대로 유효하다(콜드 487ms · 웜 0ms).
- 🔴 **그때 쓴 대조군은 무효였다 (2026-08-30 정정).** 대조군으로 삼은
  `GET /api/billing/balance` 212~276ms 는 "웜 인증+Mongo" 가 아니다 — 그 라우트는
  `peekAccessTokenUserId`(로컬 JWT 검증, Mongo 0회)로 캐시 키를 만들고 45초 스냅샷 캐시에서
  인증·조회를 통째로 건너뛴다(`worker/routes/billing.js` 의 `BILLING_BALANCE_CACHE_TTL_MS` ·
  `readBillingSnapshot`). 표의 숫자로도 검산된다 — 관측된 `User.collection.findOne` 1왕복이
  ≈410ms 인데 212~276ms 는 그보다 짧으니 Mongo 를 탄 응답일 수 없다. 따라서 **"라우트 고유
  비용" 이라는 결론은 근거를 잃었고, 느린 공용 인증 경로가 배제되지 않았다.**
  AUTH 3.10~3.15s 라는 값 자체는 워커 내부 타이머라 그대로 유효하다.
  `enforceAiRouteSecurity` 래퍼와 지연 임포트가 타이머 바깥인 것도 그대로다(wall − 합계 ≈ 160ms).

### 범인 확정 — `connectMs` (2026-08-31, 스테이징 로그인 세션, 히트 6회)

`authDetail` 실측. 후보 (a)~(d) 는 **전부 기각**됐다.

| # | path | attempts | admissionMs | **connectMs** | opMs | AUTH | ARCHIVE_HIT |
|---|---|---|---|---|---|---|---|
| 0 | access-cookie | 1 | 0 | 1000 | 1108 | 2108ms | 545ms |
| 1 | access-cookie | 1 | 0 | 3549 | 182 | 3731ms | 546ms |
| 2 | access-cookie | 1 | 0 | 3538 | 174 | 3712ms | 524ms |
| 3 | access-cookie | 1 | 0 | 3475 | 171 | 3646ms | 516ms |
| 4 | access-cookie | 1 | 0 | 3483 | 172 | 3655ms | 512ms |
| 5 | access-cookie | 1 | 0 | 3496 | 175 | 3671ms | 531ms |

- (a) 기각 — `path` 가 6회 전부 `access-cookie`. 리프레시 폴백은 한 번도 안 탔다.
- (b) 기각 — `attempts` 가 6회 전부 1. `withMongoRetry` 는 재시도를 돌지 않았다.
- (c) 기각 — 재시도가 없으므로 "첫 시도가 죽고 두 번째가 성공"이 성립하지 않는다.
  **`3120ms ≈ 3122ms` 는 우연이었다** — 산술이 맞는다고 경로가 맞는 게 아니다.
- (d) 기각 — `admissionMs` 가 6회 전부 0. 슬롯 대기는 없다.
- 🔴 **실제 범인은 (e) 매 요청 커넥션 전면 재수립이다.** 인증 조회의 실제 쿼리(`opMs`)는
  **171~182ms** 로 싸고, AUTH 의 95% 가 그 앞의 `connectDb` 안에서 사라진다.
- 🔴 **라우트 문제가 아니다.** `connectDb` 는 `worker/lib/db.js` 의 공용 경로이고, 인증을 하는
  모든 워커 라우트가 요청당 첫 Mongo 접촉에서 같은 비용을 낸다. 차트가 유별난 게 아니라
  차트에만 계측이 붙어 있었을 뿐이다.
- **분해는 추정이다(미검증).** 코드 경로상 `MONGO_PING_MIN_INTERVAL_MS=0`(매 요청 검증) →
  죽은 웜 소켓에 `ping` → `MONGO_PING_TIMEOUT_MS=1000` 소진 → `resetMongooseConnection` →
  새 TLS+인증 핸드셰이크. 근거 셋: ① #0 의 `connectMs` 가 **정확히 1000** 이고 그 요청만
  `opMs` 가 1108 로 튄다(= ping 실패 후 동시 op 가 있어 죽은 커넥션을 그대로 돌려주는 분기,
  `db.js` 의 `countActiveMongoOps() > activeOpsOwned`) ② 같은 요청 안 두 번째 Mongo 접촉인
  `ARCHIVE_HIT` 은 512~546ms 로 싸다(= 이 요청이 세운 소켓은 살아 있다) ③ `db.js` 주석의
  2026-08-16 프로덕션 실측이 "요청 컨텍스트가 끝나면 그 소켓은 못 쓴다"를 이미 기록했다.
  🔴 다만 그때 신규 커넥션은 **1.4초**였는데 지금 스테이징은 **3.5초**다 — 그 2.5배 격차는
  아직 설명되지 않았다(워커 로그 `[db-connect]` 를 못 봤다).
- 재현 하네스는 커밋하지 않았다(일회성). 만드는 법은 아래 *재현*. 🔴 **로그인이 필요 없는 더 싼
  재현이 있다** — `wrangler tail` + 비로그인 `GET /api/insights` 반복(아래 *프로덕션 실측*).
  `connectDb` 는 공용 경로라 그것으로 충분하고, 프로덕션·스테이징을 같은 방법으로 나란히 잰다.
- 🔴 **전부 스테이징 값이다** — 아래 *모르는 것* 의 "프로덕션에서 몇 ms" 는 여전히 미해결.
- 재현: 로그인한 브라우저에서 동일 출처로 `POST /api/human-design/chart` 에 출생 본문
  (`{birth:{birthDate,birthTime,timezone,calendar}}`)을 싣고 6회 돌린 뒤 응답의 `pipeline` 과
  `authDetail` 을 읽는다. 🔴 캐시버스터 없이 반복하면 `cache:"no-store"` 여도 0ms 가 찍혀 판독이
  통째로 오염된다. 🔴 Playwright 로 자동화할 때 **로그인 판정을 `/api/auth/me` 로 하지 말 것** —
  로그아웃 상태에서도 200 이라 대기 없이 401 만 6건 찍는다(2026-08-31 실측). 대상 라우트에
  빈 본문 `{}` 을 쏴 **`400`(로그인됨) 만** 통과시킨다. `401` 만 걸러 내는 방식도 안 된다 —
  일시 `404`·`503` 이 실제로 튀어 그 한 건에 측정이 시작된다.

### 프로덕션 실측 — 병리는 같고 격차는 핸드셰이크다 (2026-08-31)

🔴 **`/api/human-design/chart` 로는 못 쟀다.** 프로덕션은 `66bdb09ac`(2026-08-30 14:01 수동
승격)라 계측 PR #1344(`8f65403`)이 **안 올라가 있다** — `authDetail` 이 응답에 없다. 대신
공용 `connectDb` 를 그대로 타는 비로그인 읽기 라우트 `GET /api/insights` 를 6회씩 2라운드
(3초 간격) 돌리고 `wrangler tail` 로 워커 로그를 읽었다. 핸드오프가 못박은 대로 **범인은
라우트가 아니라 공용 경로**이므로 이 대체 측정이 같은 것을 잰다.

측정: `npx wrangler tail code-destiny-web --config worker/wrangler.toml --format json`
(+ 스테이징은 `code-destiny-web-staging` / `wrangler.staging.toml`), 동시에 대상 URL 에
캐시버스터를 붙여 6회. 값은 워커 이벤트의 `eventTimestamp` 기준 오프셋이다.

| | 요청 시작→`[db-connect] starting` | 핸드셰이크 `elapsedMs` | 워커 `wallTime` |
|---|---|---|---|
| **프로덕션** 웜 아이솔레이트 ×10 | 1222–1286ms | 417–501ms | 1761–1867ms |
| **프로덕션** 콜드 아이솔레이트 ×5 | 223–834ms | 1481–1611ms | – |
| **스테이징** 웜 아이솔레이트 ×4 | 1689–1692ms | 1247–1269ms | 3087–3110ms |

- 🔴 **재수립은 프로덕션에서도 매 요청이다.** 창 전체에서 요청 이벤트 45건 중 18건이 새 연결을
  열었고, 내 프로브 12건은 **12건 전부** 열었다. 스테이징만의 퇴행이 아니다.
- 🔴 **분해(추정)가 확정됐다.** 웜(=`readyState===1`, 죽은 소켓)과 콜드(=ping 자체가 없음)의
  선행 구간 차이가 **약 1000ms** 로 `MONGO_PING_TIMEOUT_MS` 와 정확히 같고, 웜 10건의 산포가
  ±32ms 로 고정 타이머의 모양이다. 즉 **매 요청 1초를 실패가 예정된 ping 에 태운다.**
- **3.5s vs 1.4s 격차의 정체는 Atlas 핸드셰이크다** — 스테이징 1247–1269ms vs 프로덕션
  417–501ms(중앙값 493). ping 1초는 양쪽이 똑같이 낸다. 설정 드리프트가 아니다
  (`MONGO_PING_TIMEOUT_MS=1000` · `MONGO_PING_MIN_INTERVAL_MS=0` 이 양쪽 `[vars]` 에 동일).
- **콜드 아이솔레이트의 첫 연결이 오히려 비싸다**(1481–1611ms) — 살아 있는 아이솔레이트 안의
  재수립(417–501ms)보다 3배다. `db.js` 주석의 2026-08-16 "신규 커넥션 1.4초"는 콜드 값이었고,
  오늘 프로덕션의 재수립 값은 그보다 훨씬 싸다.
- **재사용이 아주 안 되는 건 아니다** — 프로덕션에서 `[db-connect]` 없이 353–380ms 로 끝난
  `/api/insights` 가 3건 있었다(= ping 이 통과한 살아 있는 소켓). 그 요청 **전체**가 380ms 라
  살아 있는 ping 의 왕복은 수십~수백 ms 다. 🔴 이 3건이 아래 2안 판단의 근거다.
- `[db-op-timeout]` · `[db-connect-error]` 는 양쪽 창에서 **0건** — 지금 문제는 실패가 아니라
  순수 지연이다.

## 씬 렌더 육안 확인 — 3항목 통과 (2026-08-30, 스테이징)

실제 번들에 리포트 API 만 가로채 확인했다. ① `data-state="writing"` 정확히 4줄(done 3 + writing 4
+ pending 11 = 18) ② 차트 로딩 세 점 존재(점 대비 9.79:1 · 제목 16.48:1) ③ `prefers-reduced-motion`
에서 18줄이 `animation:none; opacity:1` 로 남고 프레임 3장 md5 동일 — 모션 ON 대조군은 3장 전부
상이하므로 "정지 사진이라 같아 보인 것"이 아니다. 목록은 사라지지 않는다.
미수정 2건(범위 밖): 배지 우측 끝이 01–07 과 08–18 사이 1.5 CSS px 어긋남 · 배경 와이어프레임
대비 1.27~1.39:1.


## 남은 작업

- [x] **켜진 적 없는 rate limit — 완료** (PR #1337 / `82318cd8b`). 호출부를 `try` 안으로 옮기고,
      양쪽 `[vars]` 에 `GUARDIAN_FORTUNE_RATE_LIMIT_ENABLED = "true"` 를 넣고,
      `scripts/verify-worker-config-parity.mjs` 의 `REQUIRED_ON_KEYS` 가 "양쪽에 있고 켜져 있음"
      을 fail-closed 로 지킨다. 🔴 끌 일이 생기면 값을 `"false"` 로 바꾸지 말고 그 목록에서
      사유와 함께 뺄 것 — 그래야 "꺼졌다" 가 리뷰에 보인다.
- [x] **AUTH 3.1s 확정 측정 — 완료** (2026-08-31, 위 *범인 확정* 표). 후보 (a)~(d) 전부 기각,
      범인은 `connectDb` 안의 커넥션 재수립이다.
- [x] **프로덕션 6회 재측정 — 완료** (2026-08-31, 위 *프로덕션 실측*). 스테이징 퇴행이 아니라
      양쪽 공통 병리로 확정.
- [x] **`[db-connect]` 워커 로그로 분해 확정 — 완료.** 웜/콜드 선행 구간 차이 ≈1000ms 로
      ping 타임아웃 전량 소진이 확인됐다.
- [x] **`MONGO_PING_TIMEOUT_MS` 1000 → 300 — 완료 · 프로덕션 승격 후 검증까지 끝났다**
      (PR #1354 / `e91ffa04f`, 승격 `256c63b99`). 코드 기본값과 `[vars]` 양쪽을 함께 옮겼다 —
      `__tests__/worker/db.vars-code-default-parity.test.js` 가 둘을 묶는다.
      🔴 **150 이 아니라 300 인 이유**: `worker/lib/db.js` 의 `clampTimeoutMs(raw, fallback,
      min, max)` 에서 이 노브의 `min` 이 **300** 이라 그 아래 값은 조용히 300 으로 올려 잡힌다.
      더 내리려면 하한 자체를 먼저 내려야 하고, 그 판단 근거인 *살아 있는 소켓의 ping 왕복*
      단독 수치는 아직 없다(전체 요청 353–380ms 안에 묻혀 있다).
- [x] **`clampTimeoutMs` 하한 300 → 150 — 기각(2026-08-31, 사용자 판단).** 내려서 얻는 최대치는
      요청당 150ms 인데, 그게 안전한지 가릴 *살아 있는 소켓의 ping 왕복* 단독 수치가 없다 —
      가진 근거는 프로덕션 3건의 **요청 전체** 353–380ms 뿐이고 거기서 ping 만 떼어낸 값은
      미측정이다. 하한을 내리면 정상 소켓을 죽은 것으로 오판할 확률이 오르고, 대가는 재수립과
      Atlas 신규 커넥션 생성률 제한(노드당 초당 15) 압박이다. 🔴 **다시 여는 선행 조건은 하나** —
      `connectDb` 의 ping 왕복만 따로 계측해 300ms 대비 여유를 수치로 보이는 것. 그 전에는
      이 하한을 손대지 않는다.
- [ ] 🔴 **잔여 두 축의 분해 계측 — 코드는 들어갔고(PR #1366), 수치를 아직 안 읽었다.**
      아래 *단계 계측* 절이 읽는 법과 판정표다. **이 PR 은 아무것도 최적화하지 않는다** —
      teardown 을 비블로킹으로 바꾸거나 예산을 줄이는 것은 2026-08-08 재연결 폭주 사고가 난
      바로 그 경로라, 수치를 보기 전에 손대지 않는다.

## 승격 후 검증 — 선행 구간이 정확히 700ms 줄었다 (2026-08-31)

재현: `npx --no-install wrangler tail --config worker/wrangler.toml --format json` 을 켜 두고
`https://code-destiny.com/api/insights/<없는-슬러그>` 를 4초 간격 10회 친다. 🔴 목록 경로
(`/api/insights`)는 `readCmsThroughCache` 가 데워지면 1–3ms 로 응답해 **DB 를 안 타므로
대조군이 못 된다**. 없는 슬러그의 404 는 캐시에 저장되지 않아(`worker/routes/insights.js:544`)
매번 Mongo 를 강제한다 — 로그인·쓰기·LLM 이 전혀 없는 측정이다.

| 값 | 변경 전(1000ms) | 변경 후(300ms) |
|---|---|---|
| 요청 시작 → `[db-connect] starting` | 1223–1264ms | **533–545ms** |
| 워커 `wallTime` | 1761–1910ms | **1031–1087ms** |
| `[db-connect]` elapsedMs (Atlas 핸드셰이크) | 417–554ms | 410–450ms |

선행 구간이 **약 700ms** 줄었고 핸드셰이크는 그대로다 — 예상과 정확히 일치한다.
선행 구간 잔량 ≈235ms 는 ping 예산 밖이라 이 노브로는 못 줄인다. 🔴 **다만 그 잔량에 붙여 둔
"라우트 진입 오버헤드"라는 이름은 근거가 없다** — 진입 자체는 목록 경로가 1–3ms 로 응답하는 것이
반증한다. 유력 후보는 임계 경로 위의 `resetMongooseConnection()` teardown 이고, 아래 절이 그
산술을 확정하거나 기각한다.
이벤트 24건 전부 `outcome=ok`, `db-connect-error`·`db-op-timeout` **0건** — 300ms 예산이
정상 소켓을 죽은 것으로 오판해 실패시킨 사례는 이 표본에 없다.

🔴 **남아 있는 회귀 감시(원칙 7).** `connectDb` 는 인증하는 모든 워커 라우트의 공용 경로다.
Atlas 가 느려져 ping 왕복이 300ms 를 넘으면 살아 있던 소켓도 버리고 재수립한다 — 실패는
아니지만 그 요청만 예전 비용이 되고, Atlas M10 의 **노드당 초당 15개 신규 커넥션 생성률
제한**(`maxIdleTimeMS` 주석)을 향해 밀린다. 판정법은 같은 tail 로 `[db-connect]` **건수 비율**
(요청 대비)을 보는 것이고, 변경 전 기준선은 프로덕션 45건 중 18건이다. 되돌리기는 값 하나다.

## 단계 계측 — 읽는 법과 판정표 (PR #1366, 아직 안 읽음)

재현은 위 *승격 후 검증* 과 **같은 절차**다(없는 슬러그 404 를 4초 간격). 로그 두 줄이 늘었다.

```
[db-ping]     warm socket alive. rttMs=<ping 왕복> budgetMs=300
[db-connect]  starting ... warmPingMs=<소진분> warmResetMs=<teardown 실비용>
[db-connect]  mongodb connected successfully. elapsedMs=<핸드셰이크>
              dnsMs=<SRV 조회> hosts=<노드 수> helloRttMs=<hello 1왕복> socketReadyMs=<소켓 준비>
```

`warmPingMs=-1` 은 "이 요청은 웜 판정을 안 탔다"(콜드 아이솔레이트)는 뜻이지 결측이 아니다.
같은 값들은 `options.timings` 로도 나가므로 차트 응답의 `authDetail` 에서도 읽힌다.

| 읽은 값 | 결론과 다음 행동 |
|---|---|
| `warmResetMs` ≈ 200–250 | ≈235ms 의 정체는 teardown 이다. 재수립을 기다리게 하지 말고 경계를 조인다. 🔴 2026-08-08 재연결 폭주 경로라 별도 PR + 재측정. |
| `warmResetMs` 한 자릿수 | teardown 은 무죄. 잔량은 다른 데 있고 원점에서 다시 쪼개야 한다. |
| `dnsMs` 가 `elapsedMs` 의 큰 몫 | `MONGO_URI` 를 `mongodb+srv://` → 시드리스트로 바꿔 SRV+TXT 2왕복을 없앤다. **시크릿 변경이라 사용자가 `--only-key` 로** 넣는다. |
| `elapsedMs` ≈ `helloRttMs` × 6~7 | 핸드셰이크는 전부 왕복 비용(DNS·TCP·TLS·SCRAM)이다. **코드로 줄일 것이 없다** — 남는 레버는 워커 콜로(LAX)와 Atlas(서울)의 거리뿐. |
| `rttMs` 가 300 대비 넉넉 | `clampTimeoutMs` 하한 300→150 기각을 되돌릴 근거가 생긴다(위 *남은 작업* 마지막 항목의 유일한 선행 조건). |

🔴 표본은 한두 건으로 끊지 말 것 — 웜/콜드가 섞이고 프로덕션에서는 콜드가 45건 중 18건이었다.

## 정본 예시

- 웨이브 계약 상수: `worker/lib/human-design-report-contract.js:49`
- 버킷 분류기 · 이어짓기 서비스 목록: `worker/lib/security/index.js` 의
  `WAVE_GENERATE_SERVICE_KEYS` · `AI_DAILY_BUDGETS` · `aiActionFromPath`
- 그 목록을 라우트 소스에서 전수 대조하는 가드: `scripts/verify-worker-security-guards.mjs`
- 버킷 계약 테스트: `__tests__/worker/security.ai-route-buckets.test.js`
- 새 가드 ⑧절: `scripts/verify-human-design-report.mjs` 의 "⑧ 생성 화면 · 차트 인계 · 계측"
- 인증 계측 싱크의 소비처: `worker/lib/db.js` 의 `options.timings` (호출부가 객체를 주면 채운다)
- 그 싱크를 인증으로 끌어낸 지점: `worker/lib/auth.js` 의 `resolveActiveUserAuth` 4번째 인자와
  `getOptionalUserFromRequest` 의 `markAuthPath`
- 4계층 통과가 끊기지 않았는지 보는 테스트: `__tests__/worker/auth.require-auth.fallback.test.js`
  의 "requireAuth 계측 싱크(authTimings)"

## 함정

- 🔴 **경과 시간으로 진행률을 칠하지 않는다**(요구사항 22). 생성 화면의 "작성 중"은
  `HD_REPORT_SECTION_CONCURRENCY` 에서 나온다. 가드가 두 수를 **값으로** 대조한다.
- 🔴 **차트 인계(`app/human-design/_lib/chart-handoff.ts`)는 표시 전용**이다. 결제 상태·이용권·
  `reportId` 를 넣는 순간 클라이언트가 고칠 수 있는 값이 유료 판정에 닿는다. 가드가 막는다.
- 🔴 **모션 감소는 끄는 게 아니라 최종 상태로 앉힌다.** `animation: none` 만 두면 등장
  키프레임의 `opacity: 0` 이 남아 항목이 사라진다.
- 🔴 계측을 넓히려고 공용 `worker/lib/swiss-ephemeris.js` 에 워밍업 export 를 뚫지 말 것 —
  사주·서양점성술·베딕이 함께 쓴다.
- `verify:public-mirror-fresh` 가 `.ignore` 하나만 들고 실패하면 윈도우 개행 위양성이다
  (`git diff .ignore` 가 비어 있는지로 판별).

## 검증

```
npm run verify:human-design-report      # ⑧절 26건 포함
npm run verify:worker-security-guards   # 버킷 분류를 라우트 소스에서 전수 대조
npm run hd:snapshot:check               # 차트 경로를 건드렸으면 필수 (33케이스)
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand --testEnvironment node __tests__/worker
node --test __tests__/ui/human-design-report.static.test.js __tests__/ui/human-design-immersive.static.test.js
```

## 모르는 것

- 차트 초기 로딩에서 **AUTH · ARCHIVE_LOOKUP · ARCHIVE 가 프로덕션에서 몇 ms 인지**. 계측
  PR #1344(`8f65403`)는 승격 `256c63b99` 에 포함돼 이제 프로덕션에서도 `authDetail` 을 읽을 수
  있지만 재지 않았다 — 갈래를 닫아 필요가 없어졌다. 필요해지면 위 *범인 확정* 의 재현 절차 그대로.
- **살아 있는 소켓의 ping 왕복 단독 ms.** 위 하한 인하 기각을 되돌릴 유일한 근거다. 이제
  `[db-ping] rttMs` 로 분리돼 나오지만 **아직 읽지 않았다**.
- **≈235ms 잔량이 teardown 인지.** `warmResetMs` 가 답을 준다 — 미측정.
- **핸드셰이크 410–450ms 가 몇 왕복인지.** `helloRttMs` 대비 배수로 갈린다 — 미측정.
  프로덕션 ≈430/≈60 ≈ 7, 스테이징 1250/175 ≈ 7.1 이라는 **추정**은 있으나 hello 왕복을
  실제로 잰 값이 아니라 총합끼리 나눈 것이다.
- 스테이징 핸드셰이크가 프로덕션의 2.7배인 **이유**(Atlas 티어·리전·클러스터 차이 중 무엇인지).
  수정 방향에는 영향이 없다 — 병리와 ping 1초는 양쪽이 같다.
- `/generate` 일일 600 이 실사용에서 넉넉한지. 서버 상한(10웨이브)에서 역산한 값이고 실제
  소진 로그를 본 적은 없다 — 429 신고가 오면 `AI_DAILY_BUDGETS.generate` 부터 본다.
