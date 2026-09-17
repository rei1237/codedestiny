# 운명의 업 전문가 상담 유료 전달 검증 — 2026-09-17

대상은 재검증표 13행 `karma-destiny-ai-consultation` 하나다. 활성 진입점은 `/karma-destiny-ai/` → `app/karma-destiny-ai/page.tsx` → `KarmaDestinyAiRouteClient.tsx`(순수 `next/dynamic` 코드 스플릿 래퍼, 별도 로딩 셸만 정적으로 포함) → `app/karma-destiny-ai/KarmaDestinyAiClient.tsx`(`FEATURE_KEY = "karma-destiny-ai-consultation"`, 43행) → `worker/routes/karma-destiny-ai.js`의 `handleEnsureAccess`(2329행)·`handleStart`(2460행)·`handleResult`(2742행)·`handleMessage`(2781행, 후속 질문) → 15장 프리미엄 리포트 생성기다. 결과 화면은 `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx`가 별도로 담당한다. 이전 사주·자미·네오·나크샤트라·점성술·베다·숙요 행과 같은 뼈대의 client-side 깨어남 복구 버그를 여기서도 재현·수정하는 좁은 범위로 진행했다. 다른 세션의 marketing/payment-freeze 자동조임 등 무관한 미커밋 변경은 건드리지 않았다.

## 발견과 수정

`KarmaDestinyAiClient.tsx`의 대기 세션 확인 `restore` effect와 `KarmaDestinyAiResultClient.tsx`의 재개 `resume` effect 둘 다 `online`·`visibilitychange` 두 이벤트만 구독하고 있었다. 이전 행들에서 이미 발견·수정된 것과 같은 결함 종류다 — bfcache 복귀(`pageshow`)나 창 재포커스(`focus`)만 발생하는 경우 `visibilitychange`는 발생하지 않을 수 있어, 이미 결제해 진행 중이던 15장 상담(4묶음 분할 생성)이 자동으로 다시 조회되지 않고 생성 중 화면에 멈춰 있을 수 있었다.

| 발견 | 기존 상태 | 이번 조치 |
|---|---|---|
| 시작 화면 `restore` effect의 이벤트 배선 누락 | `KarmaDestinyAiClient.tsx`가 `online`·`visibilitychange`만 구독 | `pageshow`·`focus` 리스너와 대응 cleanup 추가(+5/-1행) |
| 결과 화면 `resume` effect의 이벤트 배선 누락 | `KarmaDestinyAiResultClient.tsx`가 `online`·`visibilitychange`만 구독 | `pageshow`·`focus` 리스너와 대응 cleanup 추가(+5/-1행) |

`document.visibilityState`/시작 락(`startLockRef`)/`captureOwner` stale-owner 가드는 그대로이며 회귀 없음(아래 D 검사로 확인).

**재현·변이 검증:** 실제 파일의 `useEffect` 콜백 소스를 TypeScript AST로 직접 추출해(문자열 조작이 아님) `vm` 샌드박스에서 실행하는 신규 테스트(`__tests__/ui/karma-destiny-ai-wake-recovery.behavior.test.js`, 109행)를 작성했다. 수정이 워크트리에서 아직 미커밋 상태였으므로 `git checkout <sha> --`가 아니라 `git stash push -- <두 파일>`로 수정 전 코드를 일시 복원해 실행한 뒤 `git stash pop`으로 원복하는 방식으로 재현했다: 수정 전에는 2개 테스트 모두 `window:pageshow handler must be registered`에서 정확히 실패(2 fail)했고, 원복 후에는 2/2 통과로 전환됨을 확인했다 — 이 테스트가 실제로 무는 가드임을 실측했다. 가드(숨김 문서·시작 락·stale owner)와 cleanup의 리스너 전체 해제, 결과 화면의 `transientFailuresRef`/`generationStallRef` 리셋도 함께 검증한다.

## 대조 결과 (기존 코드가 이미 올바름 — 수정 없음)

- **라우트 분리 구조:** `KarmaDestinyAiRouteClient.tsx`는 `next/dynamic(() => import("./KarmaDestinyAiClient"))`만 감싸는 얇은 코드 스플릿 래퍼이며 정적 로딩 셸(`KarmaDestinyAiShell`) 외에 별도 상태·복구 로직이 없다 — 수정 대상은 정확히 시작·결과 화면 2개 파일뿐임을 확인했다.
- **로케일 라우팅 자체가 없음:** `app/[locale]/karma-destiny-ai/` 디렉터리가 존재하지 않고, middleware·next.config에도 이 라우트에 대한 언급이 없으며, `config/sitemap-lastmod.json`에도 `/karma-destiny-ai/` 항목 1개만 있다(로케일 변형 없음). 사주·숙요·점성술처럼 "다른 로케일은 정적 소개 화면"인 것도 아니라, 애초에 en/ja/zh 진입점 자체가 없는 ko 전용 라우트다 — 이번 수정이 사이트맵 서명 1건만 갱신한 것과 일치한다.
- **후속 질문 부모 내역 (이번 행의 보존 특성):** `handleMessage`(2781행)는 `sessionId`로 `KarmaDestinyAiConsultation.findOne({ id: sessionId, userId: auth.userId, status: "completed" })`로 소유자 범위 완료본만 조회한 뒤(2794~2797행), 새 질문·계산은 하지 않고 공유 모듈 `worker/lib/expert-follow-up-delivery.js`의 `deliverExpertFollowUp`에 그대로 위임한다(2799행). 이 모듈은 `worker/routes/love-secret-ai.js`도 동일하게 import해서 쓰는 교차 상품 공유 코드이며, 전용 테스트 `__tests__/worker/expert-follow-up-delivery.test.js`(6개 시나리오, 실행 12건)가 이미 검증하고 있다. 즉 "초기 장·후속 질문 부모 내역" 특성 중 후속 질문 절반은 카르마가 직접 구현하지 않고 이미 검증된 공유 모듈에 위임하는 구조이므로, 이번 행에서 새로 손볼 부분이 없음을 코드 정독으로 확정했다.
- **초기 장 내역 (이번 행의 보존 특성):** `"one interrupted chapter does not discard its successful siblings"`·`"checkpoint null preserves successful siblings and retries only the unsaved chapter"`(기존 워커 테스트)가 초기 장 저장이 부분 실패에도 형제 장을 지우지 않음을 이미 검증한다. 새로 재현되지 않았다.
- **정상 completed 대 취소 구매의 GET/POST 대조:** `handleResult`(GET, 2742행)가 취소·환불 증거를 재확인해 완료본이어도 403으로 차단하는 것을 기존 테스트 `"server discovery is account-scoped, preserves old completed results, and blocks them after cancellation"`(117행)이 검증한다 — 계정 전환 시 404, 취소 후 재조회 시 403, 정상 재조회 시 200을 한 시나리오에서 함께 확인한다. `"revoked store ${store} blocks resume before provider"`(113행, 4개 저장소 변형)는 POST(`/start` 재개) 경로도 provider 호출 전에 차단함을 확인한다. 두 경로 모두 이미 취소 증거를 검사하므로 GET 전용 설계였던 사주·숙요와 달리 카르마는 재개 POST에서도 재확인이 걸려 있음을 코드로 확인했다 — 더 보수적인 기존 설계이며 손대지 않았다.

## A~F mock 근거와 경계

- **A 구매:** `worker/lib/paid-feature-registry.js:343`(`{ cost: 300, amountKRW: 30000, reason: "운명의 업 전문가 상담" }`) 대조, `FEATURE_KEY` 캡처 일치 확인. 기존 워커 테스트 `for (paid of ["pass","monthly","paid","deferred"]) "${paid}: four bounded waves preserve chapters and original usage key"`(4변형)·`"fresh lease blocks duplicate generation, stale lease resumes only missing chapters"`(118행)를 재실행해 이용권·월정석·단건·지연결제 4경로 전부 원래 멱등 키로 재개됨을 재확인했다. 실제 PG는 호출하지 않았다.
- **B 생성:** `npm run verify:karma-destiny-ai-flow` 재실행 — `[verify-karma-destiny-ai-flow] ok`로 `PREMIUM_CHAPTERS` 15장 정의, 5렌즈(사주/자미/서양/베다/숙요) 분업, `energyDomain` 5종 고유성(중복 없음), 프롬프트·디버그 유출 검사(`validatePremiumReportQuality`)가 전부 통과함을 확인했다. 기존 워커 테스트 재실행으로 4묶음 분할 생성이 챕터를 보존함을 재확인했다.
- **C 장애:** 새로 주입하지 않았다. 기존 워커 테스트의 저장 장애 매트릭스 `for (status of ["delivery_pending","completed"]) for (kind of ["null","throw","confirm"]) "${status} ${kind}: storage failure preserves generated report"`(6변형)·`"one interrupted chapter does not discard its successful siblings"`·`"short output is bounded to three attempts per chapter and never charged"`(3회 제한·무차감)·`"apply response loss leaves delivery_pending and retries the same key"`(같은 멱등 키로 재시도, 환불 없음)·`"checkpoint null preserves successful siblings and retries only the unsaved chapter"`·`"calculation storage failure resumes from original server input"`을 재실행해 통과를 재확인했다. 이번 수정은 이 경로를 건드리지 않는다.
- **D 전달:** 실제 클라이언트 파일 2개에서 TypeScript AST로 `restore`/`resume` effect 본문을 추출해 `vm.runInNewContext`로 실행하는 행동 검사(`__tests__/ui/karma-destiny-ai-wake-recovery.behavior.test.js`, 신규 109행)를 작성했다. `git stash`로 수정 전 상태를 재현해 2/2 실패(`window:pageshow handler must be registered`)를 직접 측정했고, 원복 후 2/2 통과로 전환됨을 확인했다. 기존 UI 회귀 `__tests__/ui/karma-follow-up-recovery.test.js`(3건)·`__tests__/ui/karma-paid-resume.behavior.test.js`(4건)를 신규 2건과 함께 실행해 **9/9 통과**(무회귀)를 재확인했다. **실제 브라우저 렌더(390/430px·데스크톱 화면 증거)는 이번 차례에 만들지 않았다** — 함수 단위 행동 검사로만 확인했으며, 화면 스크린샷 수준 증거는 남은 경계다(사주·숙요 등 이전 행과 동일한 경계).
- **E 저장·권한:** 새로 주입하지 않았다. `"server discovery is account-scoped, preserves old completed results, and blocks them after cancellation"`(117행)·`"revoked store ${store} blocks resume before provider"`(113행, 4변형)를 재실행해 GET·POST 두 경로 모두 취소 증거 차단을 재확인했다. 공유 모듈 `expert-follow-up-delivery.js`의 전용 테스트 12건도 함께 재실행해 후속 질문 경로의 저장·권한도 재확인했다(위 대조 결과 참고).
- **F 예산·운영 확인:** 별도 전후 호출/문자 비교 스크립트는 새로 만들지 않았다. `"short output is bounded to three attempts per chapter and never charged"`가 챕터당 3회 상한과 무차감을, `"apply response loss leaves delivery_pending and retries the same key"`가 응답 유실 후 provider 재호출 없이 같은 멱등 키로만 재시도됨을 이미 검증하고 있어 재실행으로 재확인했다. **입력/모델/출력 기준의 전용 전후 diff 증거는 만들지 않았다** — 이번 수정이 클라이언트 이벤트 리스너 2개 추가에 한정돼 provider 호출 경로를 바꾸지 않는다는 점을 근거로 생략했다(이전 행들과 동일한 경계).

이번 차례는 client-side 깨어남 복구 버그 재현·수정 1건과 "후속 질문 부모 내역" 특성의 코드 대조 확인에 한정했다. **13행 자체도 D의 실제 화면 증거와 F의 전용 전후 diff는 아직 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정 파일 3개(워크트리 커밋 `e2ad699e2`, main은 fast-forward로 같은 SHA — 별도 병합 커밋 없음):

- 시작 화면: `app/karma-destiny-ai/KarmaDestinyAiClient.tsx` — `restore` effect에 `pageshow`/`focus` 추가(+5/-1행).
- 결과 화면: `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx` — `resume` effect에 `pageshow`/`focus` 추가(+5/-1행).
- 행동 검사: `__tests__/ui/karma-destiny-ai-wake-recovery.behavior.test.js`(신규, 109행).
- 사이트맵: `config/sitemap-lastmod.json`·미러 10개 — 클라이언트 파일 변경에 따른 `/karma-destiny-ai/` 서명 재생성(+origin/main 병합분 SEO 구조화 데이터 서명 갱신 포함).

```bash
# 수정 전 재현 (워크트리에 미커밋 상태였던 두 파일을 stash로 일시 복원)
git stash push -- app/karma-destiny-ai/KarmaDestinyAiClient.tsx app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx
node --test __tests__/ui/karma-destiny-ai-wake-recovery.behavior.test.js
git stash pop

# 수정 후
node --test __tests__/ui/karma-follow-up-recovery.test.js __tests__/ui/karma-paid-resume.behavior.test.js __tests__/ui/karma-destiny-ai-wake-recovery.behavior.test.js
node scripts/run-mock-tests.mjs jest __tests__/worker/karma-paid-delivery.test.js __tests__/worker/expert-follow-up-delivery.test.js --runInBand
npm run verify:karma-destiny-ai-flow
npm run check:fast -- --skip-build
```

결과: 수정 전 재현 **2/2 실패**(`window:pageshow`/결과 화면 `pageshow` 핸들러 모두 `undefined`, `window:pageshow handler must be registered` 등으로 정확히 실패) → 수정 후 신규 UI 행동 검사 **2/2 통과**로 전환. 기존 UI 회귀(후속 질문 3건 + 재개 4건) 포함 **9/9 통과**(무회귀). 워커 jest는 `karma-paid-delivery.test.js` **22/22**·`expert-follow-up-delivery.test.js` **12/12**, 합계 **34/34 통과**(3.1초, 이 보고 작성 시점에 재실행해 재확인). `verify:karma-destiny-ai-flow`는 `[verify-karma-destiny-ai-flow] ok`.

`npm run check:fast -- --skip-build`(클라이언트 파일 변경으로 자동 승격)는 두 차례 실행했다. 1차는 `verify:sitemap-drift`에서 예상대로 BLOCKED(원장이 소스와 어긋남, 워크트리가 origin/main보다 5커밋 뒤처져 있었음) — `git fetch origin main && git merge origin/main`(fast-forward, 충돌 없음) 후 `npm run sitemap:generate`로 해소했다(`/karma-destiny-ai/` 서명 갱신 + origin/main이 가져온 무관한 SEO 구조화 데이터 커밋의 `/`·`/en/`·`/ja/`·`/zh-tw/`·`/zh/` 서명 갱신 포함, `git diff`로 예상 서명만 바뀌었음을 확인). 2차 전체 재실행은 `run-paid-gate-suite.mjs` 88/88 ok 포함 처음부터 끝까지 통과했고, `test:jest`는 **Test Suites: 277 passed, 277 total / Tests: 3,884 passed, 3,884 total**(234.075초), 종료 코드 0.

이 과정에서 `config/payment-freeze.json`의 `billing.js` `maxLines`가 게이트 실행 부작용으로 6909→6350 자동 조임된 것을 두 차례(origin/main 병합 후, 2차 check:fast 후) 발견했다 — 사주·숙요 등 이전 행과 동일한 무관 노이즈이며 origin/main은 여전히 6909다. 매번 `git checkout -- config/payment-freeze.json`으로 커밋 범위에서 제외했다.

## 전달

워크트리 `wt/karma-destiny-mock-20260917-212214`에서 4개 파일(+사이트맵 미러)만 커밋(`e2ad699e2`, `fix(karma-destiny-ai): 깨어남 복구 effect에 pageshow/focus 리스너 추가`)한 뒤 main에 `git merge --ff-only`했다 — 워크트리가 이미 origin/main 최신 상태였으므로 별도 병합 커밋 없이 main HEAD가 그대로 `e2ad699e2`가 됐다. `npm run sync:public`을 재실행했으나 이번 수정 파일(App Router 클라이언트 컴포넌트 2개 + 신규 테스트 1개)은 sync:public이 미러링하는 레거시 정적 경로 밖이라 diff가 없었다. `git push origin main`으로 푸시했다. main의 다른 미커밋 변경(marketing/card-news·payment-freeze.json 등 다른 세션 소관)은 이번에도 건드리지 않았다.

`e2ad699e2e41c83d415e904f63b8d81401a4260b`의 CI를 `gh run watch`(run `35223772793` "CI required", exit 0)로 끝까지 지켜본 뒤 `gh api .../check-runs`로 전체 체크런을 재확인했다: `CI required`·`Critical checks`·`Typecheck and lint`·`Static guards`·`Build Pages and Worker`·`paid-flow-gates`·`gitleaks`·`Risk tier`·`Main drift`·`AI locale pipeline invariants`·`Resolve release necessity`·`Queue asynchronous staging release` 전부 `completed`/`success`, `Deploy staging`은 비동기 스테이징 배포 진행 중(`in_progress`, 규약상 매 push마다 대기하지 않음)이었고 나머지(`release`·`rollback`·`Check that landed work reached staging`)는 조건부 `skipped`다. 실패 0.

**공정상 기록:** 이 행의 코드 수정 커밋(`e2ad699e2`)에는 실수로 `Co-Authored-By` 트레일러를 빠뜨렸다. 이미 push되어 origin main에 반영된 뒤라 CLAUDE.md의 "새 커밋 생성 원칙"에 따라 amend 대신 이 문서/체크리스트 커밋부터 트레일러를 정확히 포함시켰다.
