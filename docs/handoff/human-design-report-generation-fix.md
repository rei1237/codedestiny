---
status: active
updated: 2026-08-31
next: AUTH 3.1s 의 범인은 **매 요청 Mongo 커넥션 전면 재수립**으로 확정됐다(2026-08-31 실측, 아래 표). 후보 (a)~(d) 는 전부 기각. 다음 판단은 라우트가 아니라 공용 `worker/lib/db.js` 의 연결 재사용 정책이며, 손대기 전에 프로덕션에서 같은 측정을 한 번 해야 한다
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
- 재현 하네스는 커밋하지 않았다(일회성). 만드는 법은 아래 *재현*.
- 🔴 **전부 스테이징 값이다** — 아래 *모르는 것* 의 "프로덕션에서 몇 ms" 는 여전히 미해결.
- 재현: 로그인한 브라우저에서 동일 출처로 `POST /api/human-design/chart` 에 출생 본문
  (`{birth:{birthDate,birthTime,timezone,calendar}}`)을 싣고 6회 돌린 뒤 응답의 `pipeline` 과
  `authDetail` 을 읽는다. 🔴 캐시버스터 없이 반복하면 `cache:"no-store"` 여도 0ms 가 찍혀 판독이
  통째로 오염된다. 🔴 Playwright 로 자동화할 때 **로그인 판정을 `/api/auth/me` 로 하지 말 것** —
  로그아웃 상태에서도 200 이라 대기 없이 401 만 6건 찍는다(2026-08-31 실측). 대상 라우트에
  빈 본문 `{}` 을 쏴 **`400`(로그인됨) 만** 통과시킨다. `401` 만 걸러 내는 방식도 안 된다 —
  일시 `404`·`503` 이 실제로 튀어 그 한 건에 측정이 시작된다.

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
- [ ] 🔴 **프로덕션에서 같은 6회를 재기 — 다음 세션의 첫 작업.** 스테이징 `connectMs` 3.5s 가
      `db.js` 주석의 2026-08-16 프로덕션 실측(신규 커넥션 1.4s)의 2.5배다. 이 격차가 티어·리전
      차이인지 스테이징만의 퇴행인지 모르는 채로 공용 연결 정책을 손대면 안 된다. 재는 법은
      아래 *재현* 과 같고 로그인만 프로덕션 계정으로 바꾼다. **설정 드리프트는 아니다** —
      `MONGO_PING_MIN_INTERVAL_MS=0` · `MONGO_PING_TIMEOUT_MS=1000` 이 양쪽 wrangler `[vars]` 에
      동일하게 있다(2026-08-31 확인).
- [ ] **`[db-connect]` 워커 로그로 위 분해(추정)를 확정.** ping 실패 → reset → 재연결이 요청마다
      실제로 찍히는지 본다. 이게 확인돼야 "무엇을 고칠지"가 정해진다.
- [ ] 🔴 **고치는 것은 그 다음이고, 대상은 `worker/lib/db.js` 다 — 차트 라우트가 아니다.**
      요청 경계에서 소켓이 죽는 게 Cloudflare 의 성질이라면 매 요청 1초짜리 ping 은 값을 못 내는
      대기다. 다만 그 ping 은 2026-08-16 에 "죽은 소켓 위에서 7.8초 태우는" 사고를 막으려고
      들어온 장치이므로, 지우는 게 아니라 **요청 경계에서는 검증 없이 바로 재수립**하는 쪽으로
      가야 한다. 🔴 인증하는 모든 라우트가 지나는 공용 경로라 원칙 7(회귀 선보고) 대상이고,
      `db.vars-code-default-parity.test.js` 가 코드 기본값과 `[vars]` 를 함께 묶는다.

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

- 차트 초기 로딩에서 **AUTH · ARCHIVE_LOOKUP · ARCHIVE 가 프로덕션에서 몇 ms 인지**. 계산 구간은
  위에서 실측으로 배제했지만 이 셋은 Mongo·인증이라 node 로는 못 잰다.
- `/generate` 일일 600 이 실사용에서 넉넉한지. 서버 상한(10웨이브)에서 역산한 값이고 실제
  소진 로그를 본 적은 없다 — 429 신고가 오면 `AI_DAILY_BUDGETS.generate` 부터 본다.
