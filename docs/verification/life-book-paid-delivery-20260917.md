# 인생의 책 전문가 상담 유료 전달 검증 — 2026-09-17

대상은 재검증표 7행 `life-book-ai-consultation` 하나다. 활성 진입점은 시작 화면 `app/life-book-ai/LifeBookAiClient.tsx`·결과 화면 `app/life-book-ai/result/LifeBookAiResultClient.tsx` → `worker/routes/life-book-ai.js`의 `/api/life-book-ai/prepare`·`/generate`·`/result` → 장(章)별 생성기다. 마스터·초융합·자미 심층·네오·나크샤트라(행 2~6)에서 이미 확인된 것과 같은 뼈대의 client-side 깨어남 복구 버그를 인생의 책에서도 재현·수정하는 좁은 범위로 진행했다. 결과 화면 컴포넌트는 8행(`life-fortune-ai-consultation`)과 공유되어 이번 수정의 혜택을 8행도 함께 받지만, 이번 완료 표시는 요청 범위인 7행에 한정한다. 다른 세션의 marketing/카드뉴스 미커밋 작업은 건드리지 않았다.

## 재현과 수정

| 재현 | 변경 전 | 변경 후 |
|---|---|---|
| 결과 화면이 백그라운드/모바일 bfcache 뒤 복귀 | `resume` effect가 `visibilitychange`/`online`만 연결, 모바일 bfcache 복원·데스크톱 재포커스에서 방치된 `partial`/`delivery_pending` 세션이 재조회되지 않아 생성 중 화면에 머문다 | 같은 `resume` 핸들러에 `pageshow`/`focus`를 추가 연결, cleanup에서도 4개 모두 해제(`app/life-book-ai/result/LifeBookAiResultClient.tsx:1490-1501`) — 기존 마스터·초융합·자미·네오·나크샤트라와 동일 패턴 |

`document.hidden` 가드, 폴링 간격(≈3.2초, 최초 800ms), `resumeCallsRef.current >= 12` 예산 캡은 그대로이며 회귀 없음(아래 검사로 확인).

## 대조 결과 (수정 없음 — 기존 코드가 이미 올바름)

- **시작 화면은 별도 결함 없음:** `app/life-book-ai/LifeBookAiClient.tsx`에는 애초에 `pageshow`/`focus`/`online`/`visibilitychange` 리스너가 전혀 없다(grep 0건). 이 화면은 생성 도중 탭이 백그라운드로 가면(`document.hidden`, `runGeneration` 웨이브 루프 1508행) 결과 화면으로 능동적으로 넘기고(`goToResult`, 1484~1489행) 자신은 폴링을 재개하지 않는 설계다. 복귀 후 재개 책임은 전부 결과 화면에 있으므로 시작 화면에 이벤트를 추가하는 것은 범위 밖이며, 코드 읽기로 의도된 설계임을 확인했다(버그 아님 — 새 테스트를 만들지 않았다, "재현된 오류만 수정한다"). `usePaidResume` 기반 결제 재개(1544~1573행)는 이미 검증된 공유 인프라로 별도 손대지 않았다.
- **구매 재개/멱등:** `findPaidPayment`(`worker/routes/life-book-ai.js:551`)·`resolveServerAccess`(578행)·`billingContractMatches`(785행)가 idempotencyKey/requestId/executionId/orderId/sourceId 및 중첩 metadata/result.deferredUsage 경로까지 대조하는 로직은 기존 `__tests__/ui/life-book-paid-delivery.behavior.test.js`("실제 클라이언트 생성 루프는 재개 ID를 재사용하고 완료 전 결제 복구 정보를 지우지 않는다" 등)로 이미 커버되어 새로 재현하지 않았다.
- **GET 재확인 대 POST 재개의 비대칭:** `handleResult`(GET, 2162행)만 `isStoredPaidResultRevoked`(2241행)를 호출해 매 조회마다 취소·환불을 재확인한다. `handleStart`(POST, 2272행)의 `resumeSessionId` 재개 경로(2275~2279행)는 이 재확인을 하지 않는데, 나크샤트라 6행·네오 5행에서 이미 같은 구조로 확인된 의도된 설계이며 `__tests__/worker/paid-completed-result-access.test.js`(교차 상품, 96/96)가 GET 경로의 재확인·차단을 계속 보장한다.
- **크론 백스톱 없음:** 마스터·초융합·자미 심층과 달리 인생의 책은 전용 `*-recovery-task.js`가 없다(`git ls-files`/`git grep` 확인, 0건) — 클라이언트 자신이 `resumeSessionId`로 `/api/life-book-ai/generate`를 이어 호출하는 구조(예산 상한 `resumeCallsRef.current >= 12`)이며, 네오·나크샤트라 행에서 이미 받아들여진 무크론 전례와 동일하다.

## A~F mock 근거와 경계

- **A 구매:** `findPaidPayment`/`resolveServerAccess`/`billingContractMatches` 코드 대조(위)와 기존 `life-book-paid-delivery.behavior.test.js`의 재개 ID 재사용·결제 복구 정보 보존 테스트로 확인. 실제 PG는 호출하지 않았다.
- **B 생성:** 기존 `__tests__/worker/life-book-ai.sections.test.js` 재실행(13/13, 무회귀) — 장별 생성 계약 확인. `life-book-paid-delivery.behavior.test.js`의 wave/checkpoint 계약도 재확인.
- **C 장애:** 새로 주입하지 않았다. 기존 테스트에 내장된 동시 중복 요청 시 DB 잠금으로 초과 생성 방지, 요청 사이 실행 제한으로 중단돼도 완료분 보존 후 이어서 진행 등 장애·동시성 계약을 재실행해 통과를 재확인했다. 이번 수정은 이 경로를 건드리지 않는다.
- **D 전달:** 실제 클라이언트 파일에서 TypeScript AST로 `resume` effect 본문을 추출해 `vm.runInNewContext`로 실행하는 행동 검사(`__tests__/ui/life-book-wake-recovery.behavior.test.js`, 신규 59행)를 작성했다. `git stash push`로 수정 전 코드를 임시 복원해 재현 1/1 실패(`window:pageshow` 핸들러 미등록, `actual 'undefined'` vs `expected 'function'`)를 직접 측정했고, `git stash pop` 복원 후 통과로 전환됨을 확인했다(마운트 시 4개 이벤트 전부 등록·hidden 가드·cleanup 시 전부 해제). **실제 Playwright 브라우저 렌더 화면 증거는 만들지 않았다** — 나크샤트라 6행·네오 5행과 동일한 경계다.
- **E 저장·권한:** 새로 주입하지 않았다. `__tests__/worker/paid-completed-result-access.test.js`(교차 상품, 96/96)가 `life-book-ai-consultation`·`life-fortune-ai-consultation` 둘 다 포함해(`__tests__/fixtures/paid-completed-result-access-fixtures.mjs:7`) 정상 재열람·취소/환불 차단·타 계정 차단을 검사함을 재실행으로 재확인했다. GET 경로 기준이며 POST 재개 경로는 위 대조 결과에서 서술한 대로 의도적으로 재확인에서 제외된다.
- **F 예산·운영 확인:** 별도 전후 호출 diff 스크립트는 만들지 않았다 — 이번 수정이 클라이언트 이벤트 리스너 2개 추가에 한정되어 provider/생성 호출 경로를 바꾸지 않는다는 점을 근거로 생략했다(나크샤트라 6행과 동일 경계). `resumeCallsRef.current >= 12` 예산 캡은 기존 코드 그대로이며 이번 수정으로 변경되지 않았다.

이번 차례는 client-side 깨어남 복구 버그 재현·수정 1건에 한정했다. **7행 A~F 전체 완료를 뜻하지 않으며, D의 실제 화면 증거와 F의 전용 전후 diff는 아직 없다.** 8행(`life-fortune-ai-consultation`)은 같은 컴포넌트를 공유해 이번 수정의 혜택을 받지만 별도 상품으로서의 완료 표시는 이번에 하지 않았다 — 체크리스트는 7행만 갱신한다. 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정 파일(커밋 `c7793e21905d46e114d93c4979a5c6d30072864e`):

- 결과 화면: `app/life-book-ai/result/LifeBookAiResultClient.tsx` — 복구 effect에 `pageshow`/`focus` 추가(4행 diff, 1490~1501행).
- 행동 검사: `__tests__/ui/life-book-wake-recovery.behavior.test.js`(신규, 59행).

```bash
# 수정 전 재현 (같은 파일을 임시 stash로 되돌려 실행, 이후 pop 으로 원복)
git stash push -- app/life-book-ai/result/LifeBookAiResultClient.tsx
node --test __tests__/ui/life-book-wake-recovery.behavior.test.js
git stash pop

# 수정 후
node --test __tests__/ui/life-book-wake-recovery.behavior.test.js __tests__/ui/life-book-paid-delivery.behavior.test.js __tests__/ui/life-book-ux.static.test.js
npm run test:jest -- --runInBand __tests__/worker/life-book-ai.sections.test.js __tests__/worker/paid-completed-result-access.test.js
npm run check:fast
```

결과: 수정 전 재현 1/1 실패(`window:pageshow` 핸들러 미등록) → 수정 후 통과로 전환. `git stash pop` 직후 `git status`로 다른 세션의 marketing 미커밋 변경 84개가 그대로임을 확인했다.

UI 행동/정적 검사 3파일 25/25 통과(신규 1 + 기존 24, 무회귀). worker jest 2 suite·109/109 통과(섹션 생성 13 + 교차 상품 접근 96, 무회귀).

`npm run check:fast`는 결제 인접 파일 수정으로 RED 등급 자동 승격되어 전체 게이트로 실행되었다(590초 전경 제한을 넘겨 백그라운드로 전환, 종료 코드 0). 백그라운드 저장 로그의 마지막 구간에 다음이 그대로 남아 있다: `verify:staging-llm-mock` PASS, `verify:analytics-events` 통과(11개 계약), `verify:no-nested-retry` 통과(worker 343개 파일, 4개 검사 전부 OK), `verify:worker-no-undef` OK(436개 파일, 기지 데드코드 3건 제외), `verify:mongo-reset-callers` PASS, `verify:cron-mongo-op-coverage` 통과(모델 52개·크론 진입점 13개·도달 함수 336개·모델 op 90건, 보호 밖 21건은 결제 웹훅 정산 원장으로 고정), `verify:admin-route-error-context` OK(관리자 라우트 5개), `build:worker` dry-run 정상(Upload 12096.55 KiB / gzip 3395.42 KiB, 오류 0), `verify:entry-encoding --strict-core` OK, `test:jest` 277 suite·3,880/3,880 통과(168.3초). **이 파이프라인에서 런타임 순서상 `verify:staging-llm-mock` 이전에 실행되는 lint·typecheck·`test:node`·`run-paid-gate-suite.mjs`·`verify:sitemap-drift` 등은 590초 전경 구간에서 실행되어 종료 코드 0으로 이어졌으나, 백그라운드 전환 이후 저장된 로그에는 남지 않아 이번 문서에 개별 정확한 수치를 인용하지 않는다** — 이 러너는 한 단계라도 실패하면 다음 단계로 넘어가지 않는 순차 실행 구조이므로, `verify:staging-llm-mock` 이후 전 단계가 실행·통과했다는 사실 자체가 앞 구간의 통과를 뒷받침한다.

## 전달

커밋 `c7793e21905d46e114d93c4979a5c6d30072864e`(`fix(life-book): resume abandoned AI consultation on pageshow/focus`)를 `app/life-book-ai/result/LifeBookAiResultClient.tsx`·`__tests__/ui/life-book-wake-recovery.behavior.test.js` 두 파일만 스테이징해 생성했다(marketing 미커밋 84개·`marketing/HANDOFF.md`는 `git status`로 그대로임을 확인 후 제외). push 시점에 `origin/main`은 직전 커밋(`0cbe50794`, love-secret-ai 스테이징 mock 수정)에서 진행이 없어 별도 병합 없이 fast-forward로 반영했다(`0cbe50794..c7793e219`).

검증 SHA `c7793e21905d46e114d93c4979a5c6d30072864e`의 [CI](https://github.com/rei1237/codedestiny/actions/runs/35179949320)는 체크런 21개 중 `CI required`·`Static guards`·`Typecheck and lint`·`Build Pages and Worker`·`Critical checks`·`gitleaks`·`Risk tier`·`Main drift`·`AI locale pipeline invariants` 등 13개 success·7개 skipped(비대상 잡)·실패 0을 확인했다. 비동기 `Deploy staging` 1건은 확인 시점에 진행 중이었다 — main push 후 자동 배포이며 사용자 요청·릴리스 전 등 명시 조건이 아니므로 완료를 별도로 대기·확인하지 않았다(CLAUDE.md 전달 흐름 절 원칙).
