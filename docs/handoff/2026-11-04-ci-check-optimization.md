---
status: blocked
updated: 2026-11-04
next: "main CI가 초록이 되면 워크트리 wt/ci-check-opt-20261104-165659의 커밋을 rebase·check:fast·check:pre-push 뒤 push하고, 사용자 판단 4건(아래 '사용자 판단') 답을 받아 처리한다"
---

# CI·로컬 검사 최적화

## 왜

사용자 요구 원문: "불필요한 검사들이 있다면 후속 과제로 그런 검사들 없이 코딩할 수 있도록 최적화해줘 일단 조사부터하고 새 세션에 인수인계해서 진행하도록".

이전 요구(`pr-ci-optimization-2026-09-06.md`)도 유효하다: "속도를 위해 테스트나 보안 검증을 무작정 제거하지 말고 변경 영향도 기반 조건부 실행 + 캐시 + 중복 제거 + concurrency + artifact 재사용을 최우선 수단으로 사용해라."

## 지금 상태

- 구현 6커밋과 이 문서 커밋이 워크트리 `D:Developmentcodedestiny-worktreesci-check-opt-20261104-165659`에 있고 **push되지 않았다.** origin/main `ae4011920` 기준이며, rebase하면 아래 SHA는 바뀐다.
- 막힌 이유: main CI가 빨간색이다. `a7101ab6d`는 성공했지만 다음 `ae4011920`(런 41824034817)과 `b8847f333`(런 41825608004)이 실패했다. 다른 세션의 사주·자미 통합에서 온 것으로 보인다. 범위 밖이라 고치지 않았고, 빨간 main 위에는 push하지 않는다.
  - Critical checks(`ae4011920`): Jest 6개 스위트 83건. `'../lib/saju-ai-prompt.js' does not provide an export named 'selectSajuPromptAuthority'`. 원본에는 export가 있어 시험의 모듈 목이 낡은 것으로 보인다(추정).
  - Static guards(두 런): `__tests__/ui/ziwei-execution-lifecycle.test.mjs` 실패. 로그에 `git show 91021aa3a…:worker/routes/ziwei-ai.js` 실패가 함께 찍힌다.
- 이 커밋들의 검증: `ae4011920` 위 7커밋 전체를 critical 티어로 돌려 `test:node` 4,349건 통과, Jest는 7,282건 중 83건 실패다. 실패는 main CI의 Jest 실패와 스위트·건수·오류가 같고, 이 커밋들은 worker 파일을 건드리지 않는다. **`check:pre-push`는 아직 돌리지 않았다.**
- push된 것은 `65e841877`(1번) 하나다.

## 작업 결과

- [~] **1. `CI required` 5분 제한.** `65e841877`로 두 잡이 미디어를 받지 않는다. 10회 연속 판정은 아직이다(수정 후 4회 관찰, timeout 0).
- [~] **2. Checkout 병목.** `3b7c14d33`(미push)로 Typecheck·lint도 미디어를 받지 않는다. 병목은 이력 깊이가 아니라 HEAD 블롭이다. 런 41717397600에서 fetch 18초, checkout 457초였고, 작업 트리 1,049MiB 중 미디어가 약 767MiB다. 그래서 깊이를 줄이는 대신 미디어 제외 sparse를 쓴다. 미디어 없는 복제본에서 lint 16초, typecheck 144초, 오류 0건이었다. guards·critical·build는 전체 유지다. deploy·landing-watchdog·paid-flow-gates·secret-scan의 체크아웃은 조사하지 않았다. fast lane 전후 수치는 push 후에 잰다.
- [~] **3. 게이트 중복.** 표는 아래에 있다. CI 안의 큰 중복은 없었고, 큰 중복은 로컬(5번에서 해결)과 릴리스(4번, 남음)였다.
- [x] **4. 릴리스 재검사.** 설계와 실측이 끝났다. 재사용 가능했던 런이 표본 0/11이라 그대로 두자고 제안한다. 아래 절을 본다.
- [~] **5. 로컬 paid-gate-suite.** `72fc3ec92`(미push). check:fast가 이미 돈 항목을 스위트에서 `--skip-exact`로 뺀다. 측정은 아래 표에 있다.
- [~] **6. 미배선 `verify:*`.** 정본(`verify-guard-wiring --report`) 기준 343개 중 배선 276, 미배선 67이다. 문서의 83은 낡은 수치였고, 예시 중 adsense-readiness·seo-dist·deployed-assets·public-parity는 이미 배선돼 있다. 판정표는 아래에 있다. 삭제는 사용자 답을 받은 뒤에 한다.
- [x] **7. 불안정 테스트.** `2d7620f70`(미push). `sync-main-freshness` 시험은 훅의 git 제한 5초가 부하에서 걸릴 수 있어 시험에서 120초로 늘렸다. `mock-test-runner`는 25초 제한을 120초로 늘렸다. 제한을 1ms로 낮추면 16건 중 9건이 조용한 철수 형태로 실패해 제한이 원인이 될 수 있음을 확인했지만, 수정 전 코드로 동시 6회를 돌려도 재현되지 않아 평소 간헐 실패의 원인으로 확정하지는 못했다. `birth-profile-claim-card.behavior`는 1회 관측, 재실행 9회 통과라 고치지 않았다. 전수 판정은 하지 못했다. `Math.random` 시험 5개는 임시 파일명·ID 용도로 보이고, `new Date`·`Date.now` 사용 시험 146개(가짜 타이머 11개)는 읽지 않았다.
- [~] **8. 이전 문서 미결.** split은 해결(`faeb70256`, 미push). 같은 입력 96.7초→17.4초, 출력 해시 동일(1,876개 HTML + 합성 2개). 컴파일 캐시 효과는 미측정이다. 복원 적중 6회 표본이 77~88초이고 미적중 표본이 없다. 캐시 비용은 복원 17~39초 + 저장 15~26초, 크기 525MB다. schedule은 사용자 판단 사항이다.
- [x] **9. 고아 워크트리.** `e39abe3c1`(미push). `npm run worktree:remove -- <경로>`가 끝까지 지우고, 폴더나 등록이 남으면 실패한다. 임시 저장소 시험 5건 통과. 실제 첫 사용은 이 워크트리 배수다. `codedestiny-worktrees` 아래 미등록 폴더 `_tools`, `build-cache`, `inicis-overseas-card-p2-direct-legal-20260918-160111`, `sd-shots`, `ziwei-logs-20261017`은 지우지 않았다.
- [x] **10. `verify-deployed-assets`.** `ab4b8c0a9`(미push). 첫 요청이 실제 404일 때만 오염으로 분류하고, 타임아웃은 재시도한다. 진짜 엣지 404의 하드 실패는 시험으로 고정했다.

## 측정

### Checkout(실측, pr-ci main push 30회)

`65e841877` 이후가 4회뿐이고, 코드를 바꾸지 않은 잡도 함께 줄었다. CI required·Risk tier를 뺀 잡의 감소는 이번 변경의 효과가 아니다. 그 시간대 GitHub 쪽 편차로 보이며(추정), 수정 효과로 읽을 수 있는 것은 CI required와 Risk tier뿐이다.

| 잡 | 이전 평균/최대(초) | 이후 평균/최대(초) | 이번에 바꿈 |
|---|---|---|---|
| CI required | 64 / 299 | 2 / 3 | 예 |
| Risk tier | 64 / 299 | 14 / 17 | 예 |
| Typecheck and lint | 62 / 364 | 29 / 38 | push 대기 |
| Static guards | 109 / 542 | 25 / 28 | 아니오 |
| Critical checks | 134 / 399 | 28 / 31 | 아니오 |
| Build Pages and Worker | 99 / 449 | 18 / 23 | 아니오 |

### 로컬 스위트

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 스위트 항목 수 | 90 | 77 |
| 스위트 벽시계 | 2,502.5초(동시 1) | 336.5초(동시 2), 131.1초(동시 4) |
| 실패 시 merge-base 재실행 | 약 1,250초 추가 | 측정 안 함(재실행 경로는 그대로) |
| check:fast 전체(7커밋, critical 티어) | 없음 | 1,066초(main 결함으로 Jest에서 실패 종료) |
| check:fast(테스트 커밋 1개 범위) | 없음 | 1,209초(통과) |

수정 전 값은 동시 실행 수가 달라 수정 후 값과 같은 조건의 비교가 아니다. 판정 기준인 "작은 변경의 push 전 대기 시간"은 `check:pre-push`까지 잰 값이 없어 아직 미달이다.

### 셰도 10회 비교

티어 판정은 critical 7, fast 3이었고 그중 failClosed가 5회다. fast로 판정된 3회에도 실제 CI는 Typecheck·Static guards를 모두 돌렸고, 문서만 바뀐 커밋에 1,412초가 들었다. 기존 검사는 하나도 끄지 않았다. 셰도 판정을 실제 건너뛰기로 올리는 일은 사용자 판단 사항이다.

## 3번 실행 위치 표

스크립트 283개 중 2곳 이상에서 도는 것이 58개다. `CI/...`는 pr-ci의 잡, `스위트`는 로컬 paid-gate-suite, `deploy-safe`는 릴리스 안의 검사다.

| 실행 위치 | 개수 | 스크립트 |
|---|---|---|
| deploy-safe + 스위트 | 26 | `verify:portone-single-payment` `verify:checkout-pass-card` `verify:paid-feature-billing-policy` `verify:ai-prompt-billing-policy` `verify:payment-choice-parity` `verify:payment-phone-consent` `verify:pass-recovery-path` `verify:paid-gate-ui` `verify:billing-pass-policy` `verify:pass-tier-policy` `verify:saju-unlock-entitlement-regression` `verify:ai-consultation-flows` `verify:astrology-ai-flow` `verify:ziwei-ai-consultation-flow` `verify:ziwei-deep-report-flow` `verify:ziwei-personality-context` `verify:karma-destiny-ai-flow` `verify:vedic-ai-flow` `verify:life-book-ai-flow` `verify:new-year-ai-flow` `verify:love-secret-ai-flow` `verify:saju-ai-consultation-recovery` `verify:saju-ai-section-plan` `verify:neo` `verify:neo-output-safety` `verify:destiny-compass-narration-policy` |
| deploy-safe + CI/critical | 9 | `verify:worker-no-undef` `verify:no-nested-retry` `verify:mongo-reset-callers` `verify:cron-mongo-op-coverage` `verify:admin-route-error-context` `verify:pass-snapshot` `verify:phone-encryption` `verify:signup-phone-required` `verify:staging-llm-mock` |
| 릴리스/release + 릴리스/staging + CI/critical | 6 | `verify:deploy-safe` `verify:pages-single-deploy-guard` `verify:worker-single-deploy` `verify:worker-config-parity` `verify:staging-noindex` `verify:deployed-sha` |
| deploy-safe + next-cache-warm/warm + CI/build + CI/critical | 2 | `build` `_build:cf:main` |
| deploy-safe + CI/guards | 2 | `test:node` `verify:analytics-events` |
| deploy-safe + CI/build | 2 | `build:worker` `smoke:core` |
| 릴리스/gate + landing-watchdog/watch | 1 | `verify:merge-landed` |
| 릴리스/release + 릴리스/staging | 1 | `verify:pages-single-deploy` |
| 릴리스/release + 릴리스/staging + deploy-safe + 스위트 + CI/critical | 1 | `verify:no-secret-leak` |
| 릴리스/release + main-drift-watchdog/drift | 1 | `verify:locale-main-sync` |
| 릴리스/staging + deploy-safe + CI/critical | 1 | `verify:env-parity` |
| main-drift-watchdog/drift + CI/guards | 1 | `verify:public-mirror-fresh` |
| deploy-safe + next-cache-warm/warm + CI/build | 1 | `build:cf` |
| paid-flow-gates/scope + CI/classify | 1 | `ci:tier` |
| paid-flow-gates/paid-flow-gates + 스위트 + CI/critical | 1 | `test` |
| deploy-safe + CI/fast | 1 | `typecheck` |
| deploy-safe + CI/build + CI/critical | 1 | `test:jest` |

읽는 법:

- **한 커밋의 CI 안에서 겹치는 것은 6개지만 실제 중복은 적다.** `build`·`_build:cf:main`이 critical에 잡힌 것은 `npm run build --prefix apps/toss`의 오탐이다. `npm test`는 critical일 때 이미 `--skip`으로 끊겨 있다. `ci:tier`는 두 워크플로에 각각 필요하다.
- **남긴 중복 둘.** `smoke:core`(build lane 7~9초)는 critical 티어에서 `test:jest`의 부분집합이지만 "배포와 같은 조건" 주석대로 유지한다(`pr-ci.yml:1056-1062`). `verify:no-secret-leak`은 스위트와 CI에서 돌지만 로컬 4초이고 입력도 다르다.
- `check:critical`과 `deploy:critical`은 정의가 같을 뿐 같은 입력으로 두 번 돌지 않는다.
- **같은 SHA 재실행은 릴리스뿐이다.** deploy-safe와 CI가 겹치는 `test:node` 등은 4번에서 다룬다. 실측상 없앨 수단의 절감이 없어 남겨 두자고 제안하므로, 판정 기준 "두 번 도는 것을 없앤다"는 이 부분에서 **미달**이다.

## 4번 설계(미구현, 🔴 RED)

**실측(최근 릴리스 워크플로 60런).** push 9·schedule 25·dispatch 26이다. push 런 9회는 모두 33~67초에 끝나 게이트에서 멈춘 것으로 보인다(스텝은 안 봄). 5분 넘게 도는 최근 14런은 전부 `workflow_dispatch`이고, 배포 잡을 확인한 13런 중 12런이 스테이징 배포, 1런이 운영 릴리스다. 실행 주체는 보지 않았다.

배포 잡 시작 시각과 같은 SHA의 CI "static UI guards" 스텝 종료 시각을 비교할 수 있었던 11런의 결과는 다음과 같다.

- CI 스텝이 먼저 끝난 경우는 2런이고, 둘 다 결론이 failure라 증거로 쓸 수 없다.
- 나머지 9런은 CI 스텝이 배포 잡 시작보다 146~760초 늦게 끝났다. 그중 CI가 성공한 3런은 588~760초 늦었다.
- **재사용 가능했던 런은 0/11이다.** 다만 기준이 배포 잡의 첫 스텝이고 `test:node`는 그보다 뒤에 돌기 때문에, 실제로는 일부 런에서 CI가 먼저 끝났을 수 있다. 표본도 main이 빨간 구간이 많다.

**선택지.**

| 안 | 절감 | 비용 |
|---|---|---|
| A. 증거가 이미 있으면 재사용, 없으면 바로 실행(기다리지 않음) | 표본에서 0회. 같은 SHA를 나중에 다시 배포할 때만 약 408초 | 코드 소량, RED 경로에 분기 추가 |
| B. 릴리스가 CI 스텝을 기다린다 | 런마다 약 408초 | 기다림이 표본에서 146~760초라 절감과 비슷하거나 더 크고, CI가 빨간 커밋은 어차피 실행한다 |
| C. 그대로 둔다 | 없음 | 없음 |

**제안: C.** 실측상 절감이 없는데 결제·배포 경로에 분기만 늘어난다. 나중에 같은 SHA 재배포가 잦아지면 A를 다시 본다. 사용자가 A를 원할 때를 위해 조건을 남긴다.

**A의 조건.** 전부 만족할 때만 `test:node` 한 스텝을 건너뛰고, 하나라도 불확실하면 실행한다.

- 런의 `head_sha`가 `git rev-parse HEAD`와 같고 작업 트리가 깨끗하다.
- 워크플로 경로가 `.github/workflows/pr-ci.yml`이고 이벤트가 `push`이며 저장소가 같다.
- `Static guards` 잡의 "Run the static UI guards the release runs" 스텝 결론이 `success`다. 워크플로 전체 결론은 보지 않는다.
- GitHub API 오류, 시간 초과, 응답 형식 불일치는 모두 "증거 없음"으로 처리한다.

**재사용하지 않는 것.** `test:worker:auth-payments`, `verify:portone-single-payment`, `deploy:critical`, typecheck, lint, smoke는 항상 돈다. 결제·인증 fail-closed는 약해지지 않는다. 건너뛴 경우 사용한 런 번호를 로그에 남긴다.

**검증.** 증거 없음·SHA 불일치·스텝 실패·API 오류마다 실행으로 떨어지는 시험을 먼저 쓴다. 스테이징 배포 인프라 변경이므로 스테이징 검증이 필요하다. **롤백.** 해당 커밋 revert 한 번.

## 6번 판정표

제안의 뜻은 다음과 같다. 코드 참조는 모두 `verify-guard-wiring.mjs`의 `UNWIRED_BY_DESIGN`과 `package.json`뿐이다. "참조"는 docs와 `*.md` 파일 수 / `docs/handoff` 파일 수다.

- **유지(41):** 문서가 사용법을 설명하거나 스테이징·운영 절차에 들어 있다.
- **별칭 삭제 후보(17):** 일회성 마이그레이션의 `--check` 별칭인데 문서 참조가 0이다. `package.json` 별칭과 `UNWIRED_BY_DESIGN` 항목만 지우고 마이그레이션 파일은 남긴다. 필요하면 `node scripts/migrations/<파일> --check`로 부를 수 있다.
- **사용자 확인(7):** 문서 참조가 0인 수동 도구다. 사람이 쓰는지는 저장소만으로 알 수 없다.
- **배선 후보(2):** 현재 실패한다. `no-timestamp-conflict`는 worker/payments 3건 오탐이다. 게이트 추가라 사용자 승인 사항이다.

이 67개는 CI와 로컬 어디서도 돌지 않으므로 **지워도 대기 시간은 줄지 않는다.** 정리의 이득은 목록이 짧아지는 것뿐이다. 🔴 표시 2개는 실제 Gemini를 부르므로 과금 금지 규칙상 임의로 돌리면 안 된다.

| 명령 | 종류 | 마지막 수정 | 문서/인수인계 참조 | 제안 |
|---|---|---|---|---|
| `verify:access-unlock-indexes` | 실 DB | 2026-08-02 | 1/0 | 유지 |
| `verify:account-sheet` | 실브라우저·실호출 | 2026-10-02 | 0/0 | 사용자 확인 |
| `verify:admin-audit-log-indexes` | 실 DB | 2026-08-12 | 0/0 | 별칭 삭제 후보 |
| `verify:all-fortunes-journey` | 실브라우저·실호출 | 2026-11-03 | 0/0 | 사용자 확인 |
| `verify:animal-totem-reading` | 정적(현재 실패) | 2026-09-15 | 1/0 | 배선 후보 |
| `verify:app-bottom-clearance` | 실브라우저·실호출 | 2026-08-30 | 0/1 | 유지 |
| `verify:app-store-pricing` | 실브라우저·실호출 | 2026-10-27 | 8/1 | 유지 |
| `verify:birth-scope-migrated-user` | 실 DB | 2026-10-11 | 2/0 | 유지 |
| `verify:birth-scope-unlock-index` | 실 DB | 2026-10-11 | 0/0 | 별칭 삭제 후보 |
| `verify:cachebust-merge` | 리포트·도구 | 2026-09-02 | 1/2 | 유지 |
| `verify:checkout-funnel-ttl` | 실 DB | 2026-08-12 | 1/0 | 유지 |
| `verify:compass-report-indexes` | 실 DB | 2026-08-01 | 0/0 | 별칭 삭제 후보 |
| `verify:daehan-purchase-index` | 실 DB | 2026-08-16 | 1/0 | 유지 |
| `verify:desktop-cdp-smoke` | 실브라우저·실호출 | 2026-10-17 | 0/1 | 유지 |
| `verify:drop-redundant-prefix-indexes` | 실 DB | 2026-08-20 | 0/0 | 별칭 삭제 후보 |
| `verify:drop-unused-secondary-indexes` | 실 DB | 2026-08-24 | 1/0 | 유지 |
| `verify:fortune-chat-indexes` | 실 DB | 2026-08-05 | 0/0 | 별칭 삭제 후보 |
| `verify:fusion-consultation-indexes` | 실 DB | 2026-08-12 | 0/0 | 별칭 삭제 후보 |
| `verify:fusion-fortune-indexes` | 실 DB | 2026-08-08 | 1/0 | 유지 |
| `verify:fusion-fortune-live` | 실브라우저·실호출 🔴 실 Gemini | 2026-09-06 | 0/1 | 유지 |
| `verify:ghost-user-fields` | 실 DB | 2026-08-12 | 0/0 | 별칭 삭제 후보 |
| `verify:guardian-fortune-indexes` | 실 DB | 2026-08-09 | 0/0 | 별칭 삭제 후보 |
| `verify:guardian-fusion-ttl-indexes` | 실 DB | 2026-08-21 | 0/0 | 별칭 삭제 후보 |
| `verify:human-design-indexes` | 실 DB | 2026-08-23 | 0/0 | 별칭 삭제 후보 |
| `verify:human-design-report-indexes` | 실 DB | 2026-08-23 | 0/0 | 별칭 삭제 후보 |
| `verify:hybrid-desktop-cdp-smoke` | 실브라우저·실호출 | 2026-10-17 | 0/1 | 유지 |
| `verify:i18n-no-fallback` | 실브라우저·실호출 | 2026-07-30 | 1/1 | 유지 |
| `verify:i18n-rendered-korean` | 실브라우저·실호출 | 2026-07-27 | 1/1 | 유지 |
| `verify:inicis-local-auth` | 실브라우저·실호출 | 2026-06-22 | 0/0 | 사용자 확인 |
| `verify:insight-public-read-indexes` | 실 DB | 2026-09-08 | 0/1 | 유지 |
| `verify:insights-famous-coverage` | 리포트·도구 | 2026-08-13 | 0/0 | 사용자 확인 |
| `verify:integrity-unique-indexes` | 실 DB | 2026-08-24 | 1/0 | 유지 |
| `verify:legacy-points` | 실 DB | 2026-08-12 | 0/0 | 별칭 삭제 후보 |
| `verify:master-love-codex-live` | 실브라우저·실호출 🔴 실 Gemini | 2026-09-20 | 0/0 | 사용자 확인 |
| `verify:mobile-bottom-nav-clearance` | 실브라우저·실호출 | 2026-09-04 | 1/2 | 유지 |
| `verify:mobile-cdp-smoke` | 실브라우저·실호출 | 2026-10-17 | 3/8 | 유지 |
| `verify:mobile-detail-render` | 실브라우저·실호출 | 2026-07-28 | 4/3 | 유지 |
| `verify:mobile-feature-coverage` | 리포트·도구 | 2026-10-24 | 1/0 | 유지 |
| `verify:mobile-final-audit` | 리포트·도구 | 2026-10-07 | 1/0 | 유지 |
| `verify:mobile-runtime-readiness` | 리포트·도구 | 2026-10-03 | 2/1 | 유지 |
| `verify:mongo-launch-indexes` | 실 DB | 2026-09-16 | 7/0 | 유지 |
| `verify:monthly-credit-expiry` | 실 DB | 2026-07-11 | 0/0 | 사용자 확인 |
| `verify:no-timestamp-conflict` | 정적(현재 실패) | 2026-08-13 | 1/1 | 배선 후보 |
| `verify:palm-mobile-payment-recovery` | 실브라우저·실호출 | 2026-10-16 | 0/1 | 유지 |
| `verify:permanent-unlock-index` | 실 DB | 2026-08-11 | 0/0 | 별칭 삭제 후보 |
| `verify:phone-encryption-key` | 실 DB | 2026-08-12 | 1/0 | 유지 |
| `verify:play-console-products` | 실브라우저·실호출 | 2026-07-16 | 4/2 | 유지 |
| `verify:point-history-feature-lookup-index` | 실 DB | 2026-08-10 | 0/0 | 별칭 삭제 후보 |
| `verify:purge-test-reports` | 실 DB | 2026-10-12 | 1/0 | 유지 |
| `verify:r2-fonts` | 실브라우저·실호출 | 2026-10-03 | 3/0 | 유지 |
| `verify:r2-public-cache` | 실브라우저·실호출 | 2026-07-02 | 0/0 | 사용자 확인 |
| `verify:reconcile-index-drift` | 실 DB | 2026-09-06 | 2/2 | 유지 |
| `verify:redirects:live` | 실브라우저·실호출 | 2026-08-16 | 0/2 | 유지 |
| `verify:relationship-inline-browser` | 실브라우저·실호출 | 2026-10-05 | 0/1 | 유지 |
| `verify:release` | 스테이징·릴리스 | - | 8/8 | 유지 |
| `verify:repo-hygiene` | push 전용 | 2026-11-02 | 1/0 | 유지 |
| `verify:request-path-indexes` | 실 DB | 2026-08-30 | 1/0 | 유지 |
| `verify:rpg-indexes` | 실 DB | 2026-07-21 | 0/0 | 별칭 삭제 후보 |
| `verify:security-events-ttl` | 실 DB | 2026-09-06 | 1/1 | 유지 |
| `verify:seo-entity-registry` | 리포트·도구 | 2026-11-03 | 8/0 | 유지 |
| `verify:staging` | 스테이징·릴리스 | 2026-09-10 | 22/10 | 유지 |
| `verify:test-account-all-paid-services` | 실브라우저·실호출 | 2026-08-12 | 1/0 | 유지 |
| `verify:test-account-payment-flow` | 실브라우저·실호출 | 2026-08-12 | 1/1 | 유지 |
| `verify:truncate-consume-ids` | 실 DB | 2026-08-12 | 1/0 | 유지 |
| `verify:user-status-backfill` | 실 DB | 2026-08-12 | 0/0 | 별칭 삭제 후보 |
| `verify:v2-entitlement-service-keys` | 실 DB | 2026-08-13 | 0/0 | 별칭 삭제 후보 |
| `verify:www-canonical` | 실브라우저·실호출 | 2026-08-08 | 1/0 | 유지 |

별도로 `D:\Development\Storage-Maintenance\2026-11-04\script-verdicts.md`가 배선 후보로 든 6개(verify-admin-saju-prompt-kasi-calendar, verify-cro-search.test, verify-heukwol, verify-innate-temperament-prompts, verify-palm-dev-module-boundary, verify-ziwei-basic-consult-prompt)는 호출처가 없고 정적 검증을 통과한다. 게이트 추가라 사용자 승인 사항이다.

## 사용자 판단

1. **6번:** 별칭 삭제 후보 17개를 지워도 되는가. 사용자 확인 7개 중 쓰는 것이 있는가. 배선 후보 8개(2+6)를 게이트에 넣을 것인가.
2. **4번:** 제안대로 C(그대로 둠)로 닫을 것인가, 절감이 적어도 A를 구현할 것인가.
3. **8번 schedule:** `cloudflare-pages-deploy.yml`의 20분 주기(하루 72회)를 유지할 것인가. 30회 표본 전부 성공, 평균 42초이고 게이트 판정으로 끝나는 것으로 보인다(추정).
4. **셰도:** 10회 비교 결과를 근거로 문서만 바뀐 커밋에서 Static guards 등을 건너뛰게 할 것인가. 기존 검사를 끄는 변경이라 승인 없이는 하지 않는다.

## 다음 세션 순서

1. `gh run list --repo rei1237/codedestiny --workflow pr-ci.yml --branch main --limit 5`로 main을 확인한다. 빨간색이면 push하지 않고 보고한다.
2. 워크트리에서 `git fetch origin`, `git rebase origin/main`, `npm run check:fast -- --committed-head --base=$(git merge-base HEAD origin/main)`, `npm run check:pre-push`, `git push origin HEAD:main`.
3. push 후 CI required·Risk tier 10회 누적과 Typecheck and lint Checkout을 잰다.
4. 사용자 답에 따라 6번 삭제, 4번 구현, schedule, 셰도를 처리한다.
5. 다른 체크아웃에서 `npm run worktree:remove -- <이 워크트리 경로>`로 배수하고, 메모리 `worktree-remove-long-paths`를 새 명령 기준으로 고친다.

## 범위 밖으로 발견한 것(보고만)

- `check:fast -- --committed-head`는 `HEAD^`만 기준으로 삼는다. 여러 커밋을 묶어 검증하려면 `--base`가 필요하다. 문서 커밋이 끝에 있으면 문서 검사만 돌고 rc=0으로 끝난다(실측 1초).
- 스테이징 검증에서 bare=ERR bypass=ERR이어도 빌드에 파일이 있으면 lagging 경고로 통과한다. artifact 모드의 404/404도 같다.
- Windows Node 24에서 `process.exit`의 libuv assert가 난다.
- 런 41744152744, 41747190225, 41800291681, 41794290573의 실패는 조사하지 않았다.
- test:node 로그에 `[ops-hq] sync failed: runOpsHqSync is not a function`이 찍힌다. 시험 실패는 아니고 미조사다.

## 함정

- CLAUDE.md: "CI 선택 실행은 10회 push 비교 전까지 shadow다. 기존 검사를 삭제하지 않는다."
- 새 가드 추가는 사용자 승인 사항이다(`scripts/verify-guard-wiring.mjs:51`).
- 필수 체크 이름 `CI required`와 룰셋 `main-protection`을 깨면 push가 막힌다. 워크플로 변경은 RED로 다룬다.
- `workflow_dispatch` 런은 봇 staging일 수 있다. 실행 주체는 `gh api .../runs/<id>`의 `triggering_actor`로 본다.
- `run-paid-gate-suite.mjs`의 SUITE 목록에서 항목을 지우면 guard-wiring 간선이 사라진다. 빼려면 `--skip-exact`를 쓴다.
- 운영 영향: fusion_all 질문 상담의 추정 입력은 카드에 따라 40,056까지 올라가 소프트 목표 40,000을 살짝 넘는다. 하드 한도는 Gemini countTokens 50,000이다. 축소 사다리를 worker에서 손볼지는 별도 판단이다.

## 정본 예시

- 티어 판정: `scripts/lib/change-risk.mjs`, `scripts/resolve-ci-tier.mjs`
- 로컬 선택 실행: `scripts/check-changed.mjs`, `scripts/lib/verification-plan.mjs`
- 배선 계산: `scripts/verify-guard-wiring.mjs --report`
- 재현: `gh api repos/rei1237/codedestiny/actions/jobs/<job id>/logs`의 줄머리 시각 차이

## 검증

```
npm run check:pre-push
gh run list --repo rei1237/codedestiny --workflow pr-ci.yml --branch main --limit 10
```

## 모르는 것

- 미배선 verify 중 사람이 손으로 쓰는 것의 수. 사용자에게 물어야 한다.
- 컴파일 캐시 미적중 시 시간. 표본이 없다.
- 릴리스의 `test:node` 시작 시각 기준 CI 증거 비율. 4번 표본은 배포 잡 첫 스텝을 기준으로 쟀다.
