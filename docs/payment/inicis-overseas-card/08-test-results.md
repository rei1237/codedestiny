# 08. 테스트 결과 — 커밋별 명령·출력·변이·NOT TESTED

현재 상태: 1단계 C1~C8 은 커밋마다 mock·정적 검증을 통과했고, 필수 변이 4종이 가드·테스트에서 실제로 실패했다. 실제 결제, PG 승인, 실기기, 알림 실도달은 하나도 확인하지 않았다(§5). 완료 보고가 아니다.

- 측정일: 2026-09-17. 기준 커밋 `6497807d2`, 워크트리 브랜치 `wt/inicis-overseas-card-p1-20260917-194753`.
- 전부 mock 이다. 실결제·환불·운영 DB 쓰기·과금 LLM 호출은 0회다.
- 출력은 결과 줄만 원문 그대로 옮겼다. 테스트 수는 커밋 시점 값이라 커밋이 쌓일수록 늘어난다.
- 출처 표기: **로그** = 실행 로그 파일에서 옮김, **본문** = 실행 직후 커밋 메시지에 적은 결과, **재실행** = 2026-09-17 C8 커밋(`af7bfaefc`) 위에서 다시 돌린 결과.
- 관련 문서: [02 해외카드 구현](02-overseas-card-implementation.md) · [05 이행·증빙](05-fulfillment-and-evidence.md) · [09 신청 사실](09-inicis-application-facts.md)

## 1. 커밋별 검증

### C1 `9dcbadb63` 결제창 고지 문구 + 브랜드명 부재 가드

| 명령 | 출력 | 출처 | 상태 |
|---|---|---|---|
| `npm run verify:payment-copy-dictionary` | `[verify-payment-copy-dictionary] PASS (167 literal keys + 18 derived wait keys x 12 locales, 5 wrappers, 16 gate-triggered paths, zh zh-cn 0/273 / zh-tw 93/273)` `exit=0` | 로그 | READY |
| `npm run verify:overseas-payment-notice` | `[verify-overseas-payment-notice] PASS (11 reference currencies, 3 renderers, 5 leak-guarded fields x 8 discovered targets, 12 notices + 2 ko fallbacks brand-free, 22 gate-triggered paths)` `exit=0` | 로그 | READY |
| `npm run i18n:check` | `[i18n:check] OK: 12 locale files share 12603 keys` … `[verify:ai-locale-pipeline] ok (14 invariants)` `exit=0` | 로그 | READY |
| `npm run verify:public-parity` | `[verify-public-parity] OK: html markers=4, jsPairs=5` `exit=0` | 로그 | READY |
| `npm run verify:payment-choice-parity` | `[verify-payment-choice-parity] PASS (10 renderers, 91 css rules, …, 66 copy keys x 12 locales, 25 gate-triggered paths)` `exit=0` | 로그 | READY |
| `npx --no-install jest __tests__/billing/checkout-entry.test.js` | `Tests: 62 passed, 62 total` `exit=0` | 로그 | READY |
| `npm run check:fast` 1회차 | `✖ 주간 라우트의 lastmod 는 주 시작일에 멈추고, 오늘·내일·월간만 날마다 올라간다` → `[paid-gate-suite] FAIL — 이 변경이 깨뜨린 가드 1개`. `sitemap:check` 는 `sitemap-ko.xml: URL 집합은 같지만 lastmod·priority 가 다르다` | 로그 | 실패 → 수정 |
| `npm run sitemap:generate` 후 산출물을 같은 커밋에 포함 | `[sitemap:check] OK — 추적본이 재생성 결과와 일치한다 (URL 1281개)` | 로그 | READY |
| `npm run check:fast` 2회차 | `Test Suites: 277 passed, 277 total` · `Tests: 3881 passed, 3881 total` · `check:fast exit=0` | 로그 | READY |

- 1회차 실패 원인: 결제 선택 스크립트의 핀을 돌리면서 라우트 서명이 바뀌었고, sitemap 추적본의 lastmod 가 재생성 결과와 어긋났다. 문구 변경의 회귀가 아니다.

### C2 `2f858e731` 비회원 결제 차단 기준선

| 명령 | 출력 | 출처 | 상태 |
|---|---|---|---|
| `jest __tests__/worker/payments-v2.context.test.js` | `63 passed` | 본문 | READY |
| `npm run verify:worker-security-guards` | `ok`. 재실행: `[verify-worker-security-guards] ok` `exit=0` | 본문·재실행 | READY |
| `npm run test:worker:auth-payments` | `Test Suites: 33 passed, 33 total` · `Tests: 635 passed, 635 total` | 로그 | READY |
| `npm run test:gifts:replica` | `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27029` · `Tests: 30 failed, 30 total` | 로그 | NOT TESTED(§5) |
| `npm run check:fast` | `Test Suites: 277 passed, 277 total` · `Tests: 3916 passed, 3916 total` · `check:fast exit=0` | 로그 | READY |

### C3 `5def9f385` 해외카드 판정 모듈 + `FOREIGN_CARD_ENABLED` env 계약

| 명령 | 출력 | 출처 | 상태 |
|---|---|---|---|
| `jest __tests__/worker/payments-v2.foreign-card-policy.test.js` | `9/9` | 본문 | READY |
| `npm run verify:env-parity` | `PASS`. 재실행: `[env-parity] PASS (8 warning(s))` `exit=0` | 본문·재실행 | READY |
| `npm run verify:worker-config-parity` | `OK`. 재실행: `[verify-worker-config-parity] OK — worker/wrangler.toml 와 worker/wrangler.staging.toml 의 차이가 전부 선언된 범위 안에 있다.` `exit=0` | 본문·재실행 | READY |
| `npx --no-install eslint` (변경 파일) | `0` | 본문 | READY |
| `npm run test:worker:auth-payments` | `644/644` | 본문 | READY |
| `npm run check:fast` | `Test Suites: 278 passed, 278 total` · `Tests: 3925 passed, 3925 total` · `check:fast exit=0` | 로그 | READY |

- env-parity 경고 8건은 로컬 `.env*` 의 별칭 이름 안내다. `FOREIGN_CARD` 를 언급한 경고는 0건이다(재실행 로그 검색).

### C4 `db9a98d64` 서버 판정 → 주문 스냅숏 → prepare 응답

| 명령 | 출력 | 출처 | 상태 |
|---|---|---|---|
| `npx --no-install eslint` (변경 파일) | `eslint exit=0` | 로그 | READY |
| `npm run test:worker:auth-payments` | `Test Suites: 34 passed, 34 total` · `Tests: 649 passed, 649 total` · `auth-payments exit=0` | 로그 | READY |
| `npm run check:payment` | `Tests: 3930 passed, 3930 total` · `check:payment exit=0` | 로그 | READY |
| `npm run test:gifts:replica` | `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27029` · `Tests: 31 failed, 31 total` · `gifts:replica exit=1` | 로그 | NOT TESTED(§5) |
| `npm run check:fast` | `Test Suites: 278 passed, 278 total` · `Tests: 3930 passed, 3930 total` · `check:fast exit=0` | 로그 | READY |

### C5 `111a4ed28` 결제창 파라미터를 판정이 열린 주문에만

| 명령 | 출력 | 출처 | 상태 |
|---|---|---|---|
| `npm run verify:portone-single-payment` | `[verify-portone-single-payment-regression] PASS` | 로그 | READY |
| `npm run verify:payment-freeze` | `[payment-freeze] 통과 — region 4 · file 3 · 상한 2` | 로그 | READY |
| `npm run typecheck` | `tsc --noEmit` 출력 없음, `exit 0` | 로그·본문 | READY |
| `npm run verify:public-parity` | `[verify-public-parity] OK: html markers=4, jsPairs=5` | 로그 | READY |
| `npm run verify:js-module-graph` | `[verify-js-module-graph] OK — 소스 195개에서 지역 import 지정자 28개, 죽은 참조 0 · 수기 캐시 키 0.` | 로그 | READY |
| `npm run check:critical` | `중첩 재시도 검사 통과.` … `exit 0` | 로그·본문 | READY |
| `npm run verify:paid-gate-ui` | `[verify-paid-gate-ui-regression] PASS` | 로그 | READY |
| `npm run verify:payment-choice-parity` | `[verify-payment-choice-parity] PASS (10 renderers, 91 css rules, 16 builder + 14 renderer markers, 3 banned, 66 copy keys x 12 locales, 25 gate-triggered paths)` | 로그 | READY |
| `npm run verify:payment-choice-single-instance` | `[verify-payment-choice-single-instance] PASS` | 로그 | READY |
| `jest __tests__/billing/checkout-entry.test.js` | `63/63` | 본문 | READY |
| `npm run verify:doc-freshness` · `npm run verify:billing-pass-policy` | `[verify:doc-freshness] OK` · `billing pass policy regression checks passed` | 로그 | READY |
| `npm run check:fast` | `Test Suites: 278 passed, 278 total` · `Tests: 3931 passed, 3931 total` | 로그 | READY |

- 동결 매니페스트 `--update` 변경은 2줄이다: `index.html` `_cdRunDirectKrwCheckout` region sha 1줄, `worker/routes/billing.js` maxLines 자동 하향 1줄(6909→6350).
- 계획 이탈: `js/destiny-profile.js`·`lib/payment/portone.ts` 는 고치지 않았다. 무인자 호출이 그대로라 새 코어가 항상 닫는다. 판정 전달은 플래그 ON 선결 조건으로 넘겼다([02](02-overseas-card-implementation.md) §7).

### C6 `539da91b0` 주문 시점 게시 약관·개인정보 버전

| 명령 | 출력 | 출처 | 상태 |
|---|---|---|---|
| `jest __tests__/worker/payments-v2.policy-versions.test.js` | `2/2` | 본문 | READY |
| `npx --no-install eslint` (변경 파일) | `0` | 본문 | READY |
| `npm run test:worker:auth-payments` | `Test Suites: 35 passed, 35 total` · `Tests: 651 passed, 651 total` | 로그 | READY |
| `npm run verify:payment-reconcile` | `[verify-payment-reconcile] PASS (crons=["0 22 * * *","*/10 * * * *"], reconcile="*/10 * * * *")` | 로그 | READY |
| `npm run verify:payment-concurrency-guards` | `[verify-payment-concurrency-guards] OK` | 로그 | READY |
| `npm run check:fast` | `Test Suites: 279 passed, 279 total` · `Tests: 3933 passed, 3933 total` | 로그 | READY |

### C7 `73215eb42` 결제 후 미이행·PG 대조 실패 운영자 알림

| 명령 | 출력 | 출처 | 상태 |
|---|---|---|---|
| `jest payments-v2.fulfillment-alert` + `payments-v2.reconcile` | `Test Suites: 2 passed, 2 total` · `Tests: 27 passed, 27 total` | 로그 | READY |
| `npm run test:worker:auth-payments` | `Test Suites: 36 passed, 36 total` · `Tests: 661 passed, 661 total` | 로그 | READY |
| `npm run verify:payment-reconcile` | `[verify-payment-reconcile] PASS (crons=["0 22 * * *","*/10 * * * *"], reconcile="*/10 * * * *")` | 로그 | READY |
| `npm run verify:payment-concurrency-guards` | `[verify-payment-concurrency-guards] OK` | 로그 | READY |
| `npm run verify:doc-freshness` · `npm run verify:payment-freeze` | `[verify:doc-freshness] OK` · `[payment-freeze] 통과 — region 4 · file 3 · 상한 2` | 로그 | READY |
| `npx --no-install eslint` (변경 파일) | `exit 0` | 본문 | READY |
| `npm run check:fast` | `Test Suites: 280 passed, 280 total` · `Tests: 3943 passed, 3943 total` | 로그 | READY |

### C8 `af7bfaefc` storeId 가 있을 때만 상점 대조

| 명령 | 출력 | 출처 | 상태 |
|---|---|---|---|
| `jest __tests__/worker/payments-v2.db-pg.test.js` | `Test Suites: 1 passed, 1 total` · `Tests: 16 passed, 16 total` | 로그 | READY |
| `npm run test:worker:auth-payments` | `Test Suites: 36 passed, 36 total` · `Tests: 663 passed, 663 total` | 로그 | READY |
| `npm run verify:payment-reconcile` | `[verify-payment-reconcile] PASS (crons=["0 22 * * *","*/10 * * * *"], reconcile="*/10 * * * *")` | 로그 | READY |
| `npm run verify:payment-concurrency-guards` | `[verify-payment-concurrency-guards] OK` | 로그 | READY |
| `npm run verify:portone-single-payment` · `npm run verify:worker-security-guards` | `[verify-portone-single-payment-regression] PASS` · `[verify-worker-security-guards] ok` | 로그 | READY |
| `npm run verify:doc-freshness` · `npm run verify:payment-freeze` | `[verify:doc-freshness] OK` · `[payment-freeze] 통과 — region 4 · file 3 · 상한 2` | 로그 | READY |
| `npx --no-install eslint` (변경 파일) | `exit 0` | 본문 | READY |
| `npm run check:fast` | `Test Suites: 280 passed, 280 total` · `Tests: 3945 passed, 3945 total` | 로그 | READY |

## 2. 필수 변이 4종 — 가드가 무는지

2026-09-17 C8 커밋(`af7bfaefc`) 위에서 다시 돌렸다. 방법: 파일 하나를 바꾸고 명령을 돌린 뒤 원본 바이트로 되돌리고 sha1 로 복원을 확인한다. 끝난 뒤 대상 4개 파일의 `git hash-object` 값이 실행 전과 같고 `git status` 는 비어 있었다.

| # | 변이 | 명령 | 출력 | 결과 |
|---|---|---|---|---|
| 1 | `js/core/checkout-entry.js` `portoneBypass` 의 `if (!decision \|\| decision.offered !== true)` 를 `if (decision && …)` 로 바꿔 무인자 호출이 파라미터를 반환 | `node scripts/verify-portone-single-payment-regression.mjs` | `AssertionError [ERR_ASSERTION]: portoneBypass() 무인자가 undefined 가 아닙니다 — 판정을 넘기지 않는 호출부(js/destiny-profile.js·lib/payment/portone.ts)가 해외카드 파라미터를 싣습니다.` `exit=1` | 물림 |
| 1 | 같음 | `npx --no-install jest __tests__/billing/checkout-entry.test.js` | `Tests: 1 failed, 62 passed, 63 total` `exit=1` | 물림 |
| 2 | `public/i18n/en.json` `payment.overseas.chargedInKrw` 를 C1 이전 영문(카드 브랜드 4종을 나열하며 "accepted")으로 복원 | `node scripts/verify-overseas-payment-notice.mjs` | `AssertionError [ERR_ASSERTION]: public/i18n/en.json: payment.overseas.chargedInKrw 에 카드 브랜드명이 있습니다 — 특약 승인 전에는 해외 발급 카드 결제를 "준비 중" 으로만 적습니다.` `exit=1` | 물림 |
| 3 | `worker/payments/fulfillment-alert.js` 발송기가 `notifyOperators` 대신 텔레그램 API 로 `env.TELEGRAM_CHAT_ID` 에 보냄 | `npx --no-install jest __tests__/worker/payments-v2.fulfillment-alert.test.js` | `Tests: 3 failed, 6 passed, 9 total` `exit=1` | 물림 |
| 4 | `worker/payments/foreign-card-policy.js` 가 정책 표에 없는 유형 `physical_goods` 를 offered | `npx --no-install jest __tests__/worker/payments-v2.foreign-card-policy.test.js` | `Tests: 2 failed, 7 passed, 9 total` `exit=1` | 물림 |

### 커밋 시점에 돌린 추가 변이

| 커밋 | 변이 | 결과 | 출처 |
|---|---|---|---|
| C2 | 라우트 `auth` 를 `none` 으로 강등 → jest `Tests: 2 failed, 59 passed, 61 total` / `payments.js` 에 해외카드 마커 주입 → 가드 실패 / `handleCheckout` 선두에 위임 주입 → 가드 실패 | 3/3 물림 | 로그 |
| C3 | 표에 없는 유형 offered `2 failed` / 표에 행 추가 `2 failed` / `in` 연산자로 프로토타입 키 통과 `1 failed` | 3/3 물림 | 로그 |
| C4 | 주문 스냅숏 미기록 → `Tests: 4 failed, 9 passed, 13 total`. 이용권 응답의 스냅숏 좁힘 제거 → **1회차 `Tests: 44 passed, 44 total` 로 물리지 않음** → 테스트 보강 후 `Tests: 1 failed, 43 passed, 44 total` | 2/2 물림(1건은 보강 후) | 로그 |
| C5 | 코어 무인자 파라미터 반환(가드·jest 각각) / offered truthy 판정 `1 failed` / `_cdPortoneBypass` 판정 누락 / PointsClient 무인자 / dp 위조 `{offered:true}` → 각 가드 실패 | 6/6 물림 | 로그 |
| C6 | 약관 버전 드리프트 / 이용권 주문 `policyVersions` 누락 → 각 jest 실패 | 2/2 물림 | 본문 |
| C7 | 알림 모듈이 `TELEGRAM_CHAT_ID` 사용 `3 failed` / 공개 대화방 이름을 우회해 조합 `3 failed` | 2/2 물림 | 로그 |
| C8 | 대조 제거 `1 failed` / storeId 가 없을 때도 불일치 처리 `3 failed` / 오류 meta 에 storeId 값 싣기 `1 failed` / `rawV2` 무시 `1 failed` | 4/4 물림 | 로그 |

## 3. 마지막 1회 확인 (C9 커밋 전, `af7bfaefc` 위)

| 명령 | 출력 | 상태 |
|---|---|---|
| `npm run verify:billing-pass-policy` | `billing pass policy regression checks passed` `exit=0` | READY |
| `npm run verify:payment-legal-copy` | `[verify-payment-legal-copy] PASS (청약철회 7일 정본 · 사전 12벌에서 기한 요약 0건 · 고지 24건 + 미성년자 12건 · 14 gate-triggered paths)` `exit=0` | READY |
| `node scripts/run-paid-gate-suite.mjs` | `[paid-gate-suite] 벽시계 226.6s · 통과 88 / 실패 0` `exit=0` | READY |
| `npx --no-install jest __tests__/worker/payments-v2 __tests__/billing/checkout-entry.test.js` | `Test Suites: 31 passed, 31 total` · `Tests: 647 passed, 647 total` `exit=0` | READY |
| `npm run verify:overseas-payment-notice` | `[verify-overseas-payment-notice] PASS (… 12 notices + 2 ko fallbacks brand-free, 22 gate-triggered paths)` `exit=0` | READY |
| 정적 가드 재실행 | `payment-copy-dictionary PASS` · `public-parity OK` · `payment-reconcile PASS` · `payment-concurrency-guards OK` · `payment-freeze 통과 — region 4 · file 3 · 상한 2` · `portone-single-payment PASS` (모두 `exit=0`) | READY |
| `npm run check:fast` (C9 문서 변경분) | `[check:changed] whitespace` · `[check:changed] verify:doc-freshness` · `[verify:doc-freshness] OK` · `check:fast exit=0`. 문서 01~09 상대 링크 67개 깨짐 0, 시크릿·사업자번호·연락처 형식 검색 0건 | READY |

## 4. 스테이징·수동 확인

- 스테이징 모바일 수동 확인(결제창이 열리는지, 해외카드 탭이 없는지, 비한국어 고지가 "준비 중"인지)은 하지 않았다. 선택 항목이며 결제 완료는 금지다.
- 운영 승격과 `FOREIGN_CARD_ENABLED` 켜기는 이번 범위가 아니다.

## 5. NOT TESTED

| 항목 | 이유 | 누가·언제 |
|---|---|---|
| 실제 해외 발급 카드 승인·3DS·해외 BIN | 실결제 금지, PG 특약 미승인 | PG 승인 후 |
| 실제 이니시스 결제창이 `P_RESERVED` `global_visa3d=Y` 를 받아 해외카드 결제를 여는지 | 실결제창을 부르지 않았다 | PG 승인 후 |
| 실기기·인앱 브라우저 결제 복귀 | 기기 확인 없음 | 2단계 |
| 실결제창의 사용자 취소 코드 | 실결제창을 부르지 않았다 | PG 승인 후 |
| PortOne 실웹훅 도착 간격·순서 | mock 만 | 운영 관찰 |
| 카드사 환율·해외 결제 수수료 | 카드사·PG 영역 | PG·카드사 |
| C7 알림 메일·Discord·Slack 실도달 | 실발송 금지 | OWNER INPUT REQUIRED |
| 운영 알림 채널 env(`ADMIN_FEEDBACK_EMAIL`·`FEEDBACK_DISCORD_WEBHOOK_URL`·`FEEDBACK_SLACK_WEBHOOK_URL`) 설정 여부 | 이름만 확인, 값은 보지 않았다 | OWNER INPUT REQUIRED |
| C8 PortOne V2 결제 조회 응답에 `storeId` 가 오는지, 어느 필드인지 | mock 으로 확인 불가. 응답에 없으면 대조를 건너뛰고 `storeIdCheck: "absent"` 로 남는다 | PG 승인 후 스테이징 조회 응답으로 |
| 스테이징 정가 승인(`PAYMENT_TEST_AMOUNT_KRW` 청구액 치환, `__tests__/worker/payments-v2.staging-test-amount.test.js:134`) | 스테이징 결제 금지 | 사용자 |
| `npm run test:gifts:replica`(C2·C4) | 로컬 replica Mongo(`127.0.0.1:27029`) 없음 → `ECONNREFUSED`. CI `Gift transaction integrity`(`.github/workflows/gift-integrity.yml:41`)가 main push 때 `worker/payments/**` 경로 변경으로 돌린다 | main push 후 CI |
| `js/destiny-profile.js`·`lib/payment/portone.ts` 의 판정 전달 | C5 계획 이탈. 무인자로 남아 항상 닫힌다(가드로 고정). 판정을 넘기려면 동결 파일의 핀 회전이 필요하다 | 플래그 ON 전, 동결 절차 |

## 6. 판정

| 항목 | 상태 |
|---|---|
| C1~C8 커밋별 mock·정적 검증 | READY |
| 필수 변이 4종 | READY |
| 선물 replica 트랜잭션 테스트 | NOT READY(로컬 환경 없음, CI 결과로 확인) |
| 실결제창·PG 승인·실기기·알림 실도달 | NOT READY(NOT TESTED) |
| PortOne 응답의 storeId 형식 | NOT READY(NOT TESTED) |

**최종 판정: PG APPROVAL REQUIRED** — mock 으로 확인할 수 있는 범위는 통과했다. 해외카드 결제가 실제로 열리고 승인되는지, 응답에 storeId 가 오는지는 PG 특약 승인 뒤에만 확인할 수 있다.
