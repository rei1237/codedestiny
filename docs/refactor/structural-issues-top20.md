# 구조적 문제 TOP 20

측정일 **2026-09-12**(20번의 가드 전수 실측만 **2026-09-13**). 전부 실측이며 줄번호는 그 날짜 기준이다. 순위는 "회귀를 만드는 힘"이다 — 빈도 × 피해 × 조용함.

상태 열: `미해소` / `Phase N` 진행 중 / `해소 (커밋)`. Phase 를 끝낼 때 이 열을 고친다.

| # | 문제 | 근거 | 상태 |
|---|---|---|---|
| 1 | 38,517줄 수작업 `index.html` 이 production `/` — 인라인 스크립트 21,803줄, 단일 블록 12,721줄 | 120일 커밋 24%(1,525/6,436), 렌더링 테스트 0, 가드 61개가 텍스트로만 읽음 | 미해소 (Phase 5) |
| 2 | 사주 엔진 5벌이 한 생일에 다른 답을 낼 수 있다 | `js/saju-engine.js:5072`, `app/saju/animal-destiny/engine/localSajuCalculator.ts`, `worker/lib/destiny-bias-engine.js:936`, `life-book-ai-saju.js:723`, `saju-snapshot-from-birth.js:56` | 미해소 (Phase 7) |
| 3 | 이용권 판정 3벌이 하드코딩돼 있고 값이 불일치 | 실측 2026-09-13: **값 불일치는 없다.** 세 사본 전부 `scripts/verify-pass-tier-policy.mjs:219-252` 가 서버 정본(`PASS_LIMITS`·`MONTHLY_PASS_LIMITS`)을 **import 해서** 대조하고, 그 가드는 `check:critical`·`deploy:critical` 차단 경로다. 변이 2/2 탐지 | **오진 (2026-09-13 재측정)** — 아래 참조. 남은 것은 죽은 4번째 판정 하나 |
| 4 | 권한 상태 writer 4개 × TTL 4종 → 결제한 잠금이 화면마다 보였다 안 보임 | 실측 2026-09-13: TTL 은 4종이 아니라 **9종** — `js/core/access-store.js:14-16`(60s·30m·24h), `app/_lib/optimistic-unlock-ledger.ts:17-18`(72h·10m), `app/_lib/user-session-cache.ts:90`(180s), `js/core/pass-verdict.js:26-46`(60s·5m·24h·35d). **엇갈림 4종을 실행으로 재현**(`__tests__/ui/permission-writer-divergence.behavior.test.js`, 변이 5/5 탐지) | **실재 확정 (Phase 4)** — 재현됨, 수렴 대상. 아래 참조 |
| 5 | `window.fetch` 몽키패치 | 실측 2026-09-13: 실재한다(`app/_lib/user-session-cache.ts:552-619`). **재정정(설계 단계 실측)**: 셸도 설치한다 — `index.html:74` `cd-user-access-session-cache-v20260703`. 구현이 **두 벌**이고 TTL 은 **이미 동일**하다(`index.html:267-277` ↔ `user-session-cache.ts:255-261`). 갈리는 것은 TTL 이 아니라 캐시를 뚫는 헤더의 유무다 | 미해소 (Phase 4) — 원장의 "`js/**` 전부"·"React 뿐" 둘 다 정정, 아래 참조 |
| 6 | `/api/auth/me` 를 독립 시계 3개가 호출(8s / 30s / 30·15·2s) | 실측 2026-09-13: 인증 폴링 `setInterval` 은 **1개**(`app/_lib/auth-store.ts:704` `SESSION_HEARTBEAT_INTERVAL_MS`). `verify:entry-fanout` 의 "[6] 세션 검증 단일화 — force 합류 + 공유 세션 시계"가 셸 7종·클라 2종에서 PASS | **해소로 재판정 (2026-09-13)** — 아래 참조 |
| 7 | repository 계층 부재 | worker 69파일에 인라인 모델 접근 ~681곳. 동일 30필드 projection 이 `worker/routes/profile.js` 945·1024·1057·1245·1391·1427 에 6번 | 미해소 (Phase 6) |
| 8 | `worker/routes/fortune.js` 6,915줄이 결제·권한·인증·Mongo·LLM·프롬프트·엔진을 융합 | 손으로 만든 402 응답 ~20개 | 미해소 (Phase 6) |
| 9 | AI 상담 라우트 8개 17,805줄이 각자 전 과정을 재구현 | 공용 `permission-service.js`·`payment-service.js` import **0** | 미해소 (Phase 6) |
| 10 | LLM 추상화 우회 3곳 + mock 게이트 5벌 재구현 | 실측 2026-09-13: 우회는 **2곳**(`mindscan-reading.mjs:841`·`love-reading-llm.mjs:167`) — oracle 은 이미 어댑터 주입으로 닫혀 있었다. 게이트는 런타임 **4벌** + jest 목 1벌 | 부분 해소 (`85fa2d10a`) — 게이트는 정본 1개로 수렴. 우회 2곳은 **RED 선보고 대기**, 아래 참조 |
| 11 | 🔴 목 매퍼가 아니라 **가드가 러너에만 있어서** 테스트가 실과금 LLM 호출을 했다 | 실측 2026-09-13: `npx jest <파일>` 이 `generativelanguage.googleapis.com` 까지 실제로 나갔다(status 400). 원장이 적은 "깊이가 다른 테스트" 는 오진 — 아래 참조 | 해소 (`817161297`) |
| 12 | 결제 스택 2개를 body-sniffing 으로 중개, PortOne 로더 3개 경쟁, 환불 경로 4개, identity 2개 | `worker/index.js:1327-1448`; `index.html:22061`, `js/destiny-profile.js:3968`, `lib/payment/portone.ts:294` | 미해소 (Phase 8) |
| 13 | 주문 상태기 정본 외 병렬 status enum 6개 이상 | 정본 `worker/payments/orders.js:35`; 경쟁 `worker/lib/models.js:315,316,462,732,738,772,781,821` | 미해소 (Phase 8) |
| 14 | resume 영속 스키마 3개 | `checkout-entry.js:154,1549`, `app/_lib/paid-attempt-session.ts:42`, `access-store.js:10` | 미해소 (Phase 8) |
| 15 | fetch 래퍼 5개 + 재시도·서킷브레이커 정책 4종, API base 재도출 ~20곳, 기본 origin 4개 | 경로 정정 2026-09-13: `lib/http-client.ts` 가 아니라 **`app/_lib/http-client.ts`** 다. 재시도 언급 수는 `auth-client.ts` 8 · `billing-client.ts` 18 · `service-read-client.ts` 8 · `access-store.js` 1 · `http-client.ts` **0** | 미해소 (Phase 4) |
| 16 | 동일 상수 재선언 | `KRW_PER_COIN` 이 3곳이 아니라 **5곳**(정본 `billing-policy.js:1`, 복사 `profile-limits.js:9`·`coin-pricing.ts:3`, 가드 내 하드코딩 `verify-payment-policy-md.mjs:12`·`verify-krw-copy-canonical.mjs:60`). pass 가격은 **이미 묶여 있었다** | 해소 (`dc93b4545`·`6559cb245`·`827248162`) — 원화 **포맷** 인라인은 이관, 아래 참조 |
| 17 | 범용 유틸 중복 | `normalizeGender` 31벌, `Asia/Seoul` 하드코딩 **179**파일(121 은 글롭 범위가 달랐다), Julian day 9벌, `iana-offset` 정본 importer 6 vs 경쟁 파서 4 | **C급 오분류** — 아래 참조. Phase 1 에서 하지 않는다 |
| 18 | 타입·린트 사각지대 | 실측 2026-09-13: `worker/` 는 73 이 아니라 **309**파일이고 `verify:worker-no-undef` 로 **이미 덮여 있었다**. 진짜 사각지대는 `lib/`(89파일, 유료 LLM·결제 경로 포함) — `next lint` 대상이지만 `no-undef` 가 꺼져 있고 `checkJs` 가 없어 tsc 도 안 본다. `next.config.mjs`·`--quiet` 는 **의도된 계약**, 아래 참조 | 부분 해소 (`ea63cd451`) — `lib/` 그물 신설·fail-open 제거. `scripts/`·`js/` 는 후속 |
| 19 | 필수 CI 가 `skipped` 를 통과로 인정 | `.github/workflows/pr-ci.yml:969-972` `ci-required` 가 `if: always()` + `needs:[classify,fast,guards,build,critical]` → `classify` 오분류가 초록불과 구분되지 않는다 | 해소 (`53536305b`) — 선언(`runs_*`)과 실행(`result`) 대조로 교체, 변이 3/3 탐지 |
| 20 | 가드 44개가 "배선 후보(미승인)"로 아무것도 지키지 않음 | `scripts/verify-guard-wiring.mjs` `UNWIRED_BY_DESIGN`. 2026-09-13 전수 실측: **41개 통과 / 3개 실패** — 통과분을 안 돌리는 것은 순수 손실 | **해소 (2026-09-13)** — 41개를 `pr-ci.yml` guards lane 으로 차단 승격(15런 × 41스텝 오탐 0 + 사용자 승인). 남은 3개는 지금도 실패 상태라 `UNWIRED_BY_DESIGN` 유지 — 배선 전에 원인부터 고쳐야 한다 |

## 16·17 재측정 (2026-09-13, Phase 1)

원장의 16·17 은 "같은 값이 여러 벌"만 보고 전부 C급(기계적 수렴)으로 묶었다. 변이 검증까지 해 보니 **네 축 중 둘은 이미 묶여 있었고, 둘은 C급이 아니었다.** 남은 하나만 실제 작업이었다.

| 축 | 실측 | 판정 |
|---|---|---|
| pass 가격 4종 | `PASS_MONTHLY_WON.standard` → 10900 변이 시 `verify:pass-tier-policy` 가 "앱 SKU cd_pass_standard_30d: 웹가 정본 일치"·셸 `goldenPackages` 까지 3건으로 탐지 | 이미 묶임. `app-store-pricing.js` 의 `webAmountKRW` 는 [의도된 복사](../../worker/lib/app-store-pricing.js)다(10-13행: 합치면 Play Console 등록가가 조용히 따라 움직인다). 건드리지 않는다 |
| `KRW_PER_COIN` worker 2벌 | `profile-limits.js` → 120 변이 시 가드 3개 탐지 | 이미 묶임. 그래도 재선언은 제거(수렴 후 4개가 탐지) |
| `KRW_PER_COIN` 가드 내 2벌 | `billing-policy.js` → 120 변이 시 `verify-payment-policy-md` **PASS(미탐)** — 지킬 상수를 자기 안에 다시 적어 둔 탓 | 실제 구멍. 정본 import 로 수정 |
| `coin-pricing.ts` 프론트 2벌 | `scripts/**`·`__tests__/**` 참조 **0**. 주석만 "반드시 일치해야 한다" | 실제 구멍. `verify:krw-copy-canonical` 에 대조 추가 |
| 원화 **포맷** 인라인 | 번들 도달 범위에서 11곳. 정본 `formatKrwAmount` 는 이미 있고 20곳 넘게 쓴다 | **기계적 수렴 불가** — 사이트마다 계약이 다르다. `useServerPrice.ts:50` 은 `Math.floor`+`""`, 정본은 `Math.round`+`"0원"`. 바꾸면 동작이 바뀐다 |
| `normalizeGender` 31벌 | 토큰 집합(`남자`·`man` 포함 여부)·`clean()` 상한(20/40/무제한)·폴백(`""`/`"unknown"`/`"other"`/`text\|\|""`)·반환 집합(`male`/`M`/`GenderLean`/`ProfileGender`)이 전부 다름. 완전 동일 쌍은 3쌍뿐 | **C급 아님**. 하나로 수렴하면 입력 정규화 결과가 라우트마다 바뀐다 = 동작 변경 |
| `Asia/Seoul` 179파일 | 값이 하나뿐인 리터럴이라 드리프트가 성립하지 않는다. 정적 셸(번들러 없음)·worker·app·scripts 네 세계에 공통 import 경로가 없다 | **C급 아님**. 상수화해도 얻는 보호가 0이고 CSP 해시 청크만 흔든다 |

### 남은 것을 어디로 보냈나

- 원화 **포맷** 인라인 11곳 · `normalizeGender` 31벌: 동작 변경을 동반하므로 "보호 테스트 → 계약 통일 → 호출부 이관" 순서가 필요하다. 계약을 고르는 일은 판정 수렴이라 **Phase 6**(repository 계층, 라우트 공통화)에서 라우트별 입력 정규화와 함께 다룬다.
- `Asia/Seoul` · Julian day · `iana-offset`: 이번 리팩터링에서 **하지 않는다**. 상수화는 보호를 만들지 않고, 날짜 엔진 통합은 Phase 7(엔진 단일화)의 characterization 뒤에야 안전하다.

🔴 교훈: "같은 값이 N벌"은 그 자체로 C급 근거가 아니다. **이미 묶여 있는지(변이로 확인)** 와 **벌끼리 계약이 같은지** 를 먼저 봐야 한다. 이 표의 여섯 축 중 실제 작업은 둘이었다.

## 10·11 재측정 (2026-09-13, Phase 2)

원장의 10·11 도 절반이 오진이었다. 16·17 때와 같은 이유다 — **"N벌이 있다"만 보고 "그래서 어떤 실패가 나는가"를 보지 않았다.**

| 축 | 원장이 적은 것 | 실측 | 판정 |
|---|---|---|---|
| 11 목 매퍼 | "깊이가 다른 테스트는 목을 못 받는다" | `moduleNameMapper` 는 **임포터가 적은 문자열**에 걸린다. 테스트 깊이와 무관하다. 현재 임포터 2개는 둘 다 깊이 2라 덮여 있었다. 매핑을 못 받은 `.ts` 는 조용히 실호출하는 게 아니라 babel 파싱에서 **크게 실패**한다 | 오진. 단 매퍼는 대상 기준(`(^\|/)(lib/)?llm-client(\.ts)?$`)으로 넓혀 두었다 |
| 11 실제 구멍 | (없음) | 실호출 차단이 `scripts/run-mock-tests.mjs` 의 `NODE_OPTIONS --require` 에만 있었다. `npx jest <파일>` 로 러너를 우회하면 보호가 통째로 사라진다 — 그 상태에서 요청이 `generativelanguage.googleapis.com` 까지 실제로 나갔다(status 400). 키가 env 에 있었으면 **과금됐다** | 실제 구멍. `jest.config.cjs` 의 `setupFiles` 로 올려 호출 방식과 무관하게 적용 |
| 10 우회 3곳 | oracle·mindscan·love | oracle 은 **이미 닫혀 있다** — `worker/routes/tarot.js:1853-1860` 이 `worker/lib/tarot-oracle-llm.js` 의 어댑터를 `callJson` 으로 주입한다. `oracle-consultation.mjs:299` 의 raw fetch 는 어댑터가 없을 때만 쓰는 폴백이다 | 우회는 **2곳**(mindscan·love) |
| 10 게이트 5벌 | "5벌 재구현" | 런타임 4벌(`worker/lib/staging-llm-mock.js` 정본, `lib/llm-client.ts`, `mindscan-reading.mjs`, `love-reading-llm.mjs`) + jest 목 1벌. 네 벌 모두 `String(x\|\|"").trim().toLowerCase()` 에 같은 허용값 배열 = **완전 동일** | C급. 정본 하나로 수렴(`85fa2d10a`) |
| jest 목 사본 | — | `__tests__/__mocks__/llm-client.js` 는 CJS 라 ESM 정본을 `require` 할 수 없다. 임포터는 0 이지만 export 를 지우면 `gemini.js` 의 named import 가 파싱 단계에서 깨진다(과거 19 스위트 동시 실패) | **수렴 불가**. 지우지 말고 `verify:staging-llm-mock` 의 진리표(4×8×7=224 케이스)로 정본과 대조 |

### 남은 것 — 우회 2곳은 왜 이번에 안 했나

`worker/routes/tarot.js:2020`(love)·`:2109`(mindscan)은 어댑터 없이 `env` 만 넘기고, 모듈 안에서 Gemini 를 직접 친다. oracle 패턴으로 옮기면 **유료 기능의 실행 경로가 바뀐다** — 재시도 소유권, Workers AI 폴백(`fallbackMinChars` 필요), 토큰 로깅, 타임아웃이 전부 어댑터 쪽 계약으로 넘어간다. 코딩 원칙 7 에 따라 **위험·검증·롤백 선보고 후**에만 착수한다. 게이트 수렴은 그 앞의 무해한 절반이라 먼저 끝냈다.

**2026-09-13 선보고 실측 결과 — 리터럴 이관은 기능 축소다.** 두 경로를 8축으로 대조하니 어댑터가 값을 **바꾼다**: 전송 시도 3→2, 잘림 증폭 계수 0.4→0.3, 총 데드라인(`*_TOTAL_TIMEOUT_MS` 42000) **소실**, `topP` 는 `lib/llm-client.ts` 가 아예 지원하지 않아 **조용히 사라지고**, `thinkingBudget`(현재 0)·`temperature`(0.7)는 어댑터가 안 넘겨 기본값이 되며, Workers AI 폴백이 **새로 켜진다**(두 기능엔 `targetChars` 가 없어 `fallbackMinChars` 근거도 없다). 결정타는 `config/env.contract.json:1054-1219` — `LOVE_READING_*`·`MINDSCAN_*` **12키의 `consumers` 가 이 두 파일뿐**이라 이관 시 노브가 선언만 남고 아무 데도 안 걸린다. 또 `scripts/verify-mindscan-reading.mjs` 는 **npm 미배선**이라 mindscan 쪽은 보호 테스트가 0 이다. 근거표는 [refactor-phase2 핸드오프의 "착수 전 실측"](../handoff/refactor-phase2-2026-09-13.md#-착수-전-실측-2026-09-13--리터럴-이관은-지금-하면-안-된다).

→ **판정: 우회 2곳은 `미해소`.** oracle 어댑터로의 리터럴 이관은 폐기하고, Phase 6(라우트 공통화)에서 AI 상담 라우트 8개와 함께 다룬다 — 값 보존을 하려면 `llm-client` 에 `topP` 를 더하고 총 데드라인을 어댑터 계약에 넣어야 하는데, 그건 라우트 2개가 아니라 LLM 코어의 문제다. 그 전에 필요한 선행 작업이던 **mindscan 보호막은 2026-09-13 에 만들었다** — `verify:mindscan-reading` 을 유료 게이트 스위트에 배선하고(`scripts/run-paid-gate-suite.mjs` + `paid-flow-gates.yml` 트리거), staging mock 케이스와 love 등가 단언을 더했다. 변이 2/2 탐지. 배선하자마자 낡은 단언 1건이 터졌다(케이스 5 — `a1e9b397b` 가 `ko` 출력 계약을 넣은 2026-09-09 이후 19일간 미탐지). 유료 실행 경로는 무변경이다.

🔴 교훈: **"같은 패턴으로 옮긴다"는 패턴이 같을 때만 무해하다.** oracle 은 총 데드라인도 튜닝 노브도 없이 태어난 라우트라 어댑터가 그 계약을 안 갖는다. love·mindscan 은 둘 다 갖고 있어서, 이관이 수렴이 아니라 축소가 된다. 다음에 "N곳을 정본 하나로"를 볼 때는 **정본이 각 호출부의 계약을 전부 담는지**부터 실측한다.

🔴 교훈(16·17 과 같다): 원장의 "N벌·N곳"은 **가설**이다. Phase 를 시작할 때 그 행만 다시 재보고, 다르면 원장을 고친다. 이번 Phase 에서 10·11 네 축 중 원장 그대로였던 것은 **게이트 중복 하나**뿐이다.

## 18·19 재측정 (2026-09-13, Phase 3)

세 번째 Phase 에서도 원장의 전제가 틀렸다. 18 은 **네 축 중 셋이 오진**이었고, 19 는 원장 그대로였다.

| 축 | 원장이 적은 것 | 실측 | 판정 |
|---|---|---|---|
| 18 `worker/` 미검사 | "73파일 전부 미검사" | 파일 수는 **309**. 그리고 `scripts/verify-worker-no-undef.mjs` 가 이미 `deploy:critical`·`check:critical`·`pr-ci.yml:900` 에 배선돼 돌고 있었다 | 오진. 이미 덮여 있다 |
| 18 `tsconfig` 로 JS 검사 | "include 를 넓히면 된다" | `allowJs` 는 있고 `checkJs` 가 없다. worker/ 하나만 `checkJs` 로 켜 보니 **2,734 에러**. 전역 타입 검사는 이번 Phase 범위로 불가능하다 | C급 아님. 넓히는 게 답이 아니다 |
| 18 `next.config.mjs` 무시 | "`ignoreBuildErrors: true` 가 구멍" | typecheck·lint 는 `fast` lane 의 `ci:fast` 가 **따로** 돌린다. 빌드 단계 무시는 중복 판정 제거이지 구멍이 아니다 | 의도된 계약. 건드리지 않는다 |
| 18 `eslint --quiet` | "warn 전부 비가시" | 비가시는 맞지만 **잠겨 있다** — `scripts/deploy-safe.mjs:1248` 이 `--quiet` 가 빠지거나 `--max-warnings=0` 이 붙으면 릴리스를 실패시킨다(`:702` 가 인자를 만든다). 현재 에러 0 / warn 793 | 의도된 계약. 풀려면 793건을 먼저 처리해야 한다 = 별도 과제 |
| 18 진짜 사각지대 | (없음) | `lib/` 89파일. `next lint` **대상 디렉터리**에는 있지만 `.eslintrc.json` 이 `next/*` 만 extend 해 `no-undef` 가 프로젝트 전역에서 꺼져 있고, `.js`/`.mjs` 라 tsc 도 안 본다. 그 안에 `lib/tarot/{mindscan-reading,love-reading-llm}.mjs`(유료 LLM)·`lib/payment/*` 가 있다 | 실제 구멍. 기존 가드를 표면 테이블로 넓혀 수정 |
| 18 기존 가드의 fail-open | (없음) | 문법이 깨진 파일은 `no-undef` 메시지를 만들지 않는다 → `message.fatal` 을 안 세면 **"위반 0" 으로 통과**한다. 검사되지 않은 것과 통과한 것이 구분되지 않았다 | 실제 구멍(코딩 원칙 10). 같은 커밋에서 수정 |
| 19 `skipped` 구멍 | "`classify` 오분류가 초록불과 구분되지 않는다" | 원장 그대로. 모든 lane 의 실행 조건이 `needs.classify.outputs.runs_X == 'true'` 라, `classify` 가 **성공하면서 출력을 비우면**(출력 키 오타·step id 드리프트·`GITHUB_OUTPUT` 쓰기 실패) 4개 lane 이 전부 skip 되고, 룰셋의 유일한 필수 체크가 **검사 0건으로 초록**이 된다 | 실제 구멍. 수정 |

### 무엇을 고쳤나

- **19 (`53536305b`)**: `ci-required` 의 인라인 bash 루프("failure 가 아니면 통과")를 `scripts/verify-ci-required-lanes.mjs` 로 교체했다. 판정은 **선언 대 실행 대조**다 — `classify` 가 내보낸 `runs_*` 가 티어 매핑과 맞는지, 그리고 `runs_X=true` 인 lane 이 실제로 `success` 인지·`false` 인 lane 이 실제로 `skipped` 인지를 본다. 티어→lane 매핑은 `scripts/resolve-ci-tier.mjs` 의 `TIERS` 를 **export 해서 읽는다**(거기서 다시 적으면 고치려던 드리프트를 재현한다). 자기검사 17케이스를 CI 안에서 먼저 돌린 뒤 실판정한다. `if: always()` 와 `needs:` 목록은 `scripts/verify-worker-single-deploy-guard.mjs:335-338` 이 단언하므로 그대로 뒀다.
- **18 (`ea63cd451`)**: `verify-worker-no-undef.mjs` 를 `SURFACES` 테이블(`worker` / `lib`)로 넓히고, 표면마다 **필요한 전역만** 줬다(`lib` 추가분은 `window`·`document` + CJS 3종뿐 — 넉넉히 주면 오타가 전역 이름과 겹칠 때 조용히 통과한다). 같은 커밋에서 `message.fatal` 을 위반으로 센다. 파일명은 **바꾸지 않았다** — 배선 3곳이 경로 모양에 묶여 있다. 결과 390파일 0위반.
- 변이 검증: 19 는 3/3 탐지(빈 출력 전부 skip · 티어↔runs 불일치 · `classify` 성공 검사 제거), 18 은 2/2 탐지(`lib/tarot/mindscan-reading.mjs` 에 미선언 식별자 주입 · 문법 파괴). 변이 C(`classify !== "success"` 제거)는 처음에 16케이스를 **전부 통과했다** — 문서 전용 PR 에서 `verify:doc-freshness`(= `runs_fast != 'true'` 일 때만 `classify` 안에서 돈다)가 실패하면 선언과 실행이 완벽히 일치한 채로 `classify` 만 빨간 시나리오가 실재한다. 그 케이스를 17번째로 추가해 탐지시켰다.

### 안 한 것 — 후속 과제

- `scripts/` no-undef: 750위반. 전부 `page.evaluate()` 본문의 브라우저 전역이다(Playwright 스크립트가 노드 파일 안에 브라우저 코드를 문자열로 들고 있다). node+browser 합집합 전역으로 한 표면 더 추가하면 깨끗해질 가능성이 높다 — 실제 결함 없음.
- `js/` no-undef: 480위반 / 120이름. 112종은 크로스-`<script>` 전역이라 정상이고, "어디에도 선언 없음"으로 뜬 8종도 전수 확인 결과 **전부 오탐**이었다 — `CURRENT_AGE` 는 `js/saju-engine.js:2586` 의 다중 선언자 `var`, `G_JONG`·`G_JOHU`·`G_NATAL`·`G_BAZI` 는 `js/saju-engine-continuation.js:110` 의 암묵 전역 할당(읽기는 `window.G_*`), 나머지 `google`·`Chart`·`NodeFilter` 는 외부/브라우저 전역이다. 🔴 **프로덕션 결함은 0건**. 이 표면을 가드로 덮으려면 파일 간 최상위 선언을 모으는 패스가 필요하다.
- `**/*.ts` include 가 `.d.mts` 6개를 안 잡는다. 선언 파일이라 피해가 작다.

🔴 교훈: 원장의 "전부 미검사"는 **가드 배선을 안 본 판정**이었다. 사각지대를 찾을 때는 `tsconfig`·`next lint` 설정만 보지 말고 `verify-guard-wiring.mjs --report` 로 **이미 도는 가드가 무엇을 덮는지** 먼저 본다. 그리고 새 가드를 만들기 전에 **기존 가드를 넓힐 수 있는지** 본다 — 파일명이 배선에 묶인 레포에서는 그게 유일하게 안전한 확장 방향이다.

## 3·4·5·6·15 재측정 (2026-09-13, Phase 4 착수 전)

네 번째 Phase 에서도 같은 결과다 — **다섯 행 중 둘이 이미 닫혀 있었다.** Phase 4 는 코드를 한 줄도
쓰기 전에 40% 작아졌다.

| 축 | 원장이 적은 것 | 실측 | 판정 |
|---|---|---|---|
| 3 판정 3벌 | "하드코딩돼 있고 **값이 불일치**" | 하드코딩은 맞다. 불일치는 **아니다** — `scripts/verify-pass-tier-policy.mjs` 가 `worker/lib/profile-limits.js` 의 `PASS_LIMITS`·`MONTHLY_PASS_LIMITS` 를 **import** 해서(:32-36) 사본 3개를 전부 대조한다: pass-verdict(:219-232) · billing-client(:234-242) · 셸 goldenPackages(:244-252). `check:critical`·`deploy:critical` 차단 경로 | 오진. 구조적으로 묶여 있다 |
| 3 변이 검증 | — | `pass-verdict.js` 와 `billing-client.ts` 의 vvip 를 **동시에** 200→210 으로 틀었더니 가드가 `실패 2건` 으로 둘 다 지목 | **2/2 탐지.** 도는 가드가 아니라 무는 가드다 |
| 3 남은 것 | (없음) | `app/_lib/billing-client.ts:579` `maxCoinCoveredForPlan` 은 **월 이용 한도를 모르는** 4번째 판정이다. 그런데 유일한 호출부가 `:3734` `debugAccessDecision` 이고, 그 반환값은 `debugEntitlement()` 로그로만 쓰인다(:3739-3740, `NODE_ENV !== production` 에서만 출력). 게이트가 아니다 | **죽은 판정.** 값은 가드가 묶고 있으나, `export` 라 누가 배선하면 월 한도 없는 게이트가 된다 |
| 4 writer·TTL | "writer 4개 × TTL **4종**" | writer 4개는 맞다. TTL 은 **9종**이다 — access-store 60s/30m/24h · optimistic-unlock-ledger 72h/10m · user-session-cache 180s · pass-verdict 60s/5m/24h/35d | 실재. **원장보다 크다.** 보호 테스트로 엇갈림 4종 재현 완료, 아래 참조 |
| 5 몽키패치 | "`js/**` 의 raw fetch **전부**가 우회된다" | 패치는 실재한다(`installUserAccessFetchCache`). React 설치처는 `app/providers/UserSessionProvider.tsx:13`·`user-session-cache.ts:421`. 🔴 **2026-09-13 재정정**: "정적 셸은 설치하지 않는다"는 **틀렸다** — `index.html:74` 가 `window.fetch` 를 감싼다. 설치 가드 플래그도 서로 다르다(`__cdUserAccessSessionCacheInstalled` ↔ `__cdUserAccessFetchCacheInstalled`) | 실재하되 **범위가 다르다.** 아래 참조 |
| 6 시계 3개 | "8s / 30s / 30·15·2s, 실측 5회" | 인증 폴링 `setInterval` 은 `app/_lib/auth-store.ts:704` **하나**뿐이다(나머지 `setInterval` 4개는 결제 팝업 폴링·애니메이션 타이머로 `/api/auth/me` 와 무관). 원장이 지목한 계측기 `verify:entry-fanout` 자신이 지금 PASS 이고, 그 안에 "[6] 세션 검증 단일화 — force 합류 + 공유 세션 시계" 축이 셸 7종·클라 2종으로 들어 있다 | **해소로 재판정** |
| 15 래퍼 5개 | "`lib/http-client.ts`" | 그 경로에 파일이 **없다**. 실제 경로는 `app/_lib/http-client.ts` | 실재, 경로만 정정 |

### 4 는 재현된다: 엇갈림 4종 (보호 테스트, 2026-09-13)

계획서의 고정 작업 루프대로 **보호 테스트를 먼저** 썼다. 프로덕션 코드는 0줄이다.
`__tests__/ui/permission-writer-divergence.behavior.test.js` 가 네 writer 를 한 `node:vm` 샌드박스에
함께 올리고(셸 classic script 2개는 그대로, TS 2개는 `ts.transpileModule`), `Date` 를 `Proxy` 로 감싸
시계를 손으로 돌린다 — TTL 자체가 관측 대상이라 가짜 시계가 필수다.

결론: **TOP 4 는 재현된다.** 3·6 처럼 재판정 대상이 아니라 실제 수렴 대상이다. 같은 사용자·같은
기능·같은 순간에 답이 갈리는 조합 4종을 실행으로 고정했다.

| 축 | 재현된 엇갈림 | 원인 |
|---|---|---|
| W1 × W4 | 서버가 권한을 회수한 직후 **셸은 즉시 잠그고**(서버 도달 2회) **React 는 60초 동안 열어 둔다**(서버 도달 1회). +61초 뒤에는 둘 다 잠긴다 | `access-store` 의 `revalidate({force})` 도 `cache:'no-store'` 도 몽키패치에는 보이지 않는다. `user-session-cache.ts:229-232` 의 유일한 우회 열쇠는 `x-code-destiny-cache-refresh` 헤더인데 `access-store` 는 이 헤더를 **한 번도 보내지 않는다**(전수 grep 0건) |
| W1 × W3 | 결제 실패로 `rollbackOptimisticUpdate` 를 부르면 **access-store 는 비고 원장은 남는다** → 셸은 잠그고 React 는 계속 열려 있다 | `access-store.js:1179-1180` 은 자기 `state.optimistic` 만 비운다. `use-content-unlock.ts:66` 이 `snapshotIncludesFeature(...) \|\| ledger[key] === true` 로 **OR** 합류시키므로 원장 한쪽만 남아도 React 는 열린다. `forgetOptimisticUnlock` 을 쓰면 둘 다 지워진다 |
| W1 × W2 | 이용권 만료 직후 **한 화면이 세 답을 동시에** 쥔다 — `isUnlocked=true` · `getEffectiveTier='free'` · `coversNow=false` | `unlockedFeatureIds` 에 출처(provenance)가 없다. 이용권으로 열린 것과 따로 구매한 것을 구분할 수 없으니 만료가 잠금 목록에 반영되지 않는다. `coversNow=false` 는 세 가드가 **각각 독립적으로** 만든다: `pass-verdict.js:186`(만료 스냅샷 폐기) · `:503`(`stale` 판정) · `access-store` 의 등급 만료 검사 |
| W1 × W3 수명 | 같은 해금의 수명이 다르다. 원장 `legacy_verified` 는 **+72h 에 죽고** access-store 는 그대로 열려 있다. 원장 `confirmed` 는 **+365일에도 살아 있다** | 원장 `:42` 가 `entry.mode !== "confirmed"` 조건 때문에 confirmed 를 TTL 검사에서 아예 제외한다 — 자기 문서 주석(`:13`)과 어긋난다. access-store 쪽은 `confirmedUnlocks` 가 캐시 만료를 넘겨 살아남는다(`:388-393`) |

🔴 원장이 암시한 방향이 **반대였다.** "access-store 가 24h GRACE 로 먼저 닫히고 원장이 72h 로 더
버틴다"고 읽힐 만하게 적혀 있었는데, 실측은 그 반대다 — `ensureLoaded` 로 컨텍스트를 세우면
access-store 는 +73h 에도 열려 있고, 먼저 죽는 쪽은 원장이다. 가설이 아니라 측정을 적는다.

같은 이유로 가설 하나를 **기각**했다: access-store 의 낙관 TTL 은 `:996-1010` 에서 10분이고
원장의 `OPTIMISTIC_TTL_MS` 도 10분이다. 여기에는 불일치가 없다.

변이 검증 **5/5 탐지** — 네 축 각각과 confirmed 수명까지 다섯 지점을 틀었을 때 전부 실패로 잡혔다.
처음 두 번은 미탐이었는데, 원인은 단언이 약해서가 아니라 **변이가 무효**여서였다(TTL 을 `0` 으로
바꿔도 시계가 안 움직이는 테스트에서는 `0 > 0` 이 거짓이라 아무 일도 안 일어난다). 유효한 변이로
바꿔 다시 돌렸다.

이 파일은 **옳은 동작이 아니라 수렴 전의 실측**을 고정한다. 네 writer 를 한 서버 정본으로 모으면
위 단언들은 깨진다 — 그때가 수렴이 끝난 시점이고, 그 커밋에서 이 테스트를 뒤집는다.

### 4 와 5 가 만나는 지점

W1 × W4 축은 TOP 4 의 몸통인 동시에 **TOP 5 그 자체**다. 원장은 둘을 따로 세었지만 실행해 보면
한 사건이다 — 몽키패치(5)가 있고 없고에 따라 같은 `access-store.js` 의 같은 호출이 다른 답을 받는
것(4)이 곧 "런타임에 따라 답이 갈린다"다. 수렴 설계는 두 행을 같이 다뤄야 한다.

### 5 는 왜 "범위가 다르다" 인가 — 🔴 2026-09-13 재정정

**"셸은 몽키패치를 설치하지 않는다"는 틀렸다.** 설계 단계 실측에서 셸도 설치한다는 것이 확인됐다 —
`index.html:74` `<script id="cd-user-access-session-cache-v20260703">` 가 `window.fetch` 를 감싼다.
즉 **한 벌 + 없음이 아니라 두 벌**이다. 그리고 두 벌의 TTL 은 **이미 통일돼 있다**(셸 `:267-277` 이
"React `getCacheTtlMs` 와 동일 값으로 통일"이라 적고 실제로 같다).

그래서 "런타임에 따라 답이 갈린다"의 원인은 캐시의 유무도 TTL 도 아니다. 둘이다:

1. **경로 A(`/api/me/access-state`)는 헤더 부재.** 두 캐시를 뚫는 유일한 열쇠
   `x-code-destiny-cache-refresh` 를 셸 세션 캐시(`index.html:389-392`)와 React
   (`user-session-cache.ts:424`)는 보내는데, **`access-store` 는 한 번도 보내지 않는다**
   (`access-store.js:849` 는 `Accept` 만 싣는다). React 는 access-store 에 `authFetch` 를 어댑터로
   꽂지만(`app/providers/UnlockProvider.tsx:85`) `/api/me/access-state` 는
   `isAuthoritativeAuthPath`(`auth-client.ts:267-273`)가 아니라 거기서도 헤더가 안 붙는다.
2. **경로 B(`/api/billing/unlock-status`)는 층 수 차이.** 셸에만 10초 API 결과 캐시가 하나 더 있다
   (`index.html` `getApiResultCacheTtl`).

`js/core/*.js` 가 양쪽 런타임에서 로드되는 것(`app/layout.js:182`·`:187`)은 그대로 사실이다. 진짜
위험도 그대로다 — **런타임에 따라 같은 코드가 다른 답을 받는 것.** 바뀐 것은 그 원인의 이름이다.

수렴 설계(D1~D6·커밋 7단계)는 [phase-plan.md 의 "Phase 4 의 내용"](phase-plan.md#phase-4-의-내용-2026-09-13--수렴-설계)에 있다.

### 3 을 닫으려면

값 대조는 이미 끝났다. 남은 건 `decidePaidFeatureAccess`/`maxCoinCoveredForPlan` 제거인데,
`app/_lib/billing-client.ts` 는 **동결 파일**이라 `config/payment-freeze.json` 절차를 따라야 하고,
`export` 를 지우는 일이라 코딩 원칙 9(소스·테스트·verify 3면 확인)의 대상이다. 값이 틀어질 위험은
없으므로 **급하지 않다** — 삭제는 별도 변경으로 다룬다(CLAUDE.md 절대규칙 6).

🔴 교훈(16·17 · 10·11 · 18·19 와 같다, 네 번 연속이다): 원장의 "N벌·불일치"는 **가설**이다.
이번에는 특히 **"하드코딩 사본이 있다" 와 "값이 불일치한다" 가 다른 주장**이라는 점이 드러났다 —
사본이 셋이어도 가드가 정본을 import 해서 대조하면 드리프트는 일어나지 않는다. Phase 를 시작할 때
그 행만 다시 재보고, 다르면 이 표에 적는다.

## 측정 방법 재현

```bash
# 줄 수·커밋 수
git ls-files | xargs wc -l | sort -rn | head -20
git log --since=120.days --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20
# 공동 변경(동반 수정 덩어리)
git log --since=120.days --name-only --pretty=format:%H | node scripts/... # 임시 집계로 측정했다
# 중복 판정
git grep -n "normalizeGender" -- '*.js' '*.ts' '*.mjs' | wc -l
git grep -ln "Asia/Seoul" | wc -l
# 가드 배선
node scripts/verify-guard-wiring.mjs --report
```

🔴 이 원장의 숫자를 **다시 전수 측정하지 않는다.** 필요한 항목만 위 명령으로 재확인하고 그 행의 날짜를 갱신한다. 반복 전수 분석은 토큰 낭비이며, 그게 애초에 이 문서를 만든 이유다.
