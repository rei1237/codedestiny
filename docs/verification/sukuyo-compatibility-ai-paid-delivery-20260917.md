# 숙요점 궁합 전문가 상담 유료 전달 검증 — 2026-09-17

대상은 재검증표 12행 `sukuyo-compatibility-ai` 하나다. 활성 진입점은 결과 화면 `app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx`(ko 전용 라우트 `app/sukuyo-compatibility-ai/page.tsx` → `SukuyoCompatibilityAiRouteClient.tsx`의 `next/dynamic` 코드 스플릿 래퍼를 거쳐 렌더) → `worker/routes/sukuyo-compatibility-ai.js`의 `/api/sukuyo-compatibility-ai/start`·`/result` → 27수(宿) 궁합 생성기다. 마스터·초융합·자미 심층·네오·나크샤트라 등 이전 행에서 이미 확인된 것과 같은 뼈대의 client-side 깨어남 복구 버그를 여기서도 재현·수정하는 좁은 범위로 진행했다. 다른 세션의 marketing/payment-freeze 자동조임 등 무관한 미커밋 변경은 건드리지 않았다.

## 재현과 수정

| 재현 | 변경 전 | 변경 후 |
|---|---|---|
| 결과 화면이 백그라운드/모바일 bfcache 뒤 복귀 | `resume` effect가 `online`/`visibilitychange`만 연결, 모바일 bfcache 복원·데스크톱 재포커스에서 방치된 세션이 재조회되지 않아 생성 중 화면에 머문다 | 같은 `resume` 핸들러에 `pageshow`/`focus`를 추가 연결, cleanup에서도 4개 모두 해제(`app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx` 1324~1332행) — 기존 마스터·초융합·자미·네오·나크샤트라와 동일 패턴 |

`document.hidden` 가드는 그대로이며 회귀 없음(아래 D 검사로 확인).

## 대조 결과 (수정 없음 — 기존 코드가 이미 올바름)

- **라우트 분리 구조:** `SukuyoCompatibilityAiRouteClient.tsx`는 `next/dynamic(() => import("./SukuyoCompatibilityAiClient"))`만 감싸는 얇은 코드 스플릿 래퍼이며 별도 복구 로직이 없다 — 수정 대상은 정확히 이 파일 하나뿐임을 확인했다.
- **로케일 라우팅:** `app/[locale]/sukuyo-compatibility-ai/page.js`(en/ja/zh)는 `SukuyoCompatibilityAiClient`나 `RouteClient`를 임포트하지 않고 `PublicFeatureIntroduction` + `lib/i18n/feature-introductions.mjs`의 `INTRO_LOCALES`만 사용하는 정적 마케팅 소개 화면이다 — 구매·생성 상태가 없는 페이지이므로 깨어남 복구 버그 자체가 성립하지 않는다. 인터랙티브 상담 플로우(및 이번 수정)는 ko 전용이 설계상 맞고, 사이트맵 재생성이 `/sukuyo-compatibility-ai/` 항목 1건만 갱신한 것과 일치한다.
- **구매 키 해석과 재개:** `handleStart`(`worker/routes/sukuyo-compatibility-ai.js:1822`)는 `resumeSessionId`가 오면 `{_id, userId}`로 저장 문서를 재조회해 completed면 즉시 반환, 미완료면 `llmMeta.resumeBody`로 원요청을 복원한다(1832~1841행). `idempotencyKey`는 body 또는 헤더에서 해석하고(1843행), `lockKey = userId:idempotencyKey`로 동시 재요청을 억제하며(1859~1860행), `{userId, idempotencyKey}`로 기존 문서를 재조회해(1865행) completed는 그대로 재사용한다(1867~1869행). 기존 `__tests__/worker/sukuyo-compatibility-ai.duplicate-generation.test.js`의 `"다섯 요청에 한 묶음씩 저장하고 완료 때만 결과를 확정한다"`(241행)·`"다른 isolate의 동시 요청도 한 묶음만 생성한다"`(258행)·`"서버 결과 ID만으로 원래 입력과 미완료 묶음을 재개한다"`(275행)가 이미 검증한다. 새로 재현되지 않았다.
- **정상 completed 대 취소 구매의 GET/POST 대조:** `handleResult`(GET, 2173행)만 `isStoredPaidResultRevoked`를 호출해(2236행) 매 조회마다 취소·환불을 재확인한다. 완료본 replay 경로(POST, 1867~1869행)는 이 재확인을 하지 않는데, 기존 테스트 `"예전 완료본은 현재 분량 검사나 추가 생성 없이 다시 읽는다"`(271행)가 이를 의도된 설계로 이미 단언한다 — 네오·나크샤트라에서 같은 구조로 이미 확인된 것과 동일한 결론이며 이번에도 손대지 않았다.

## A~F mock 근거와 경계

- **A 구매:** 코드 대조(위, `handleStart` 1822~1871행)와 기존 테스트 `"다섯 요청에 한 묶음씩 저장하고 완료 때만 결과를 확정한다"`(241행)·`"다른 isolate의 동시 요청도 한 묶음만 생성한다"`(258행)·`"서버 결과 ID만으로 원래 입력과 미완료 묶음을 재개한다"`(275행)·`"목록은 진행 중 ID를 별도로 제공하고 과거 완료 목록을 유지한다"`(280행)로 확인. 실제 PG는 호출하지 않았다.
- **B 생성:** `npm run verify:sukuyo-role-direction` 재실행 — `[sukuyo-role-direction] 27거리 자리·관계명 정본 일치 / OK`로 27수 관계명·자리 정본이 계산 엔진과 일치함을 확인(회귀 없음). 기존 테스트 `for (mode of ["subscription","paid"])` `"${mode}: 원래 차감 증빙과 다섯 요청으로 완료한다"`(287행)가 이용권·단건 결제 두 경로 모두 다섯 묶음 완료를 검사하며 재확인했다.
- **C 장애:** 새로 주입하지 않았다. 기존 테스트의 저장 장애 매트릭스 `for (status of ["delivery_pending","completed"]) for (kind of ["null","throw"])` `"저장 ${status}/${kind}: 503 후 정상 묶음을 재사용한다"`(250행, 4변형)와 `"짧은 결과는 세 번만 보완한 뒤 실패로 남긴다"`(265행, 불확실한 분량은 완료·차감 처리하지 않음)를 재실행해 통과를 재확인했다. 이번 수정은 이 경로를 건드리지 않는다.
- **D 전달:** 실제 클라이언트 파일에서 TypeScript AST로 `resume` effect 본문을 추출해 `vm.runInNewContext`로 실행하는 행동 검사(`__tests__/ui/sukuyo-compatibility-ai-wake-recovery.behavior.test.js`, 신규 49행)를 작성했다. 수정 전 코드(커밋 `1a2c8db52`의 파일 스냅샷을 `git checkout <sha> -- <path>`로 임시 교체해 실행 후 `git checkout HEAD --`로 즉시 복원, 작업 트리는 교체 전후 `git diff --stat` 무출력으로 원복 확인)는 `window:pageshow` 리스너 미등록으로 실패(`actual 'undefined'` vs `expected 'function'`)함을 이번 세션에서 직접 재현·측정했고, 수정 후(현재 코드)는 `pageshow`/`focus`/`online`/`visibilitychange` 4개 이벤트 각각 `resumeEpoch` 증가·`document.hidden` 가드 억제·언마운트 시 리스너 전부 해제까지 전부 통과로 전환됨을 확인했다(1/1 pass). 추가로 `SukuyoCompatibilityAiRouteClient.tsx`가 별도 로직 없는 순수 코드 스플릿 래퍼임과, en/ja/zh 로케일이 정적 소개 화면뿐이라 복구 버그 자체가 성립하지 않음(위 대조 결과)을 확인해 수정 범위가 ko 단일 파일로 완결됨을 검증했다. **실제 브라우저 렌더(390/430px·데스크톱 화면 증거)는 이번 차례에 만들지 않았다** — 함수 단위 행동 검사로만 확인했으며, 화면 스크린샷 수준 증거는 남은 경계다(나크샤트라 6행과 동일한 경계).
- **E 저장·권한:** 새로 주입하지 않았다. 기존 테스트의 `for (index of [0,1,2,3])` `"취소·환불 저장소 ${index}은 재개 시 다시 확인한다"`(291행, 4개 증빙 소스 각각 재개 시 재확인)를 재실행해 통과를 재확인했다. 추가로 상품에 무관한 공유 검사 픽스처 `__tests__/fixtures/paid-completed-result-access-fixtures.mjs:12`가 `sukuyo-compatibility-ai`를 `isStoredPaidResultRevoked` 마커와 함께 등록해 "정상 과거 구매본은 재검사 없이 재열람"·"취소·환불된 구매본은 completed여도 차단"을 교차 상품으로 함께 검사한다 — 단일 파일 증거보다 넓은 교차 상품 증거다. 전액 취소·타 계정 차단은 GET 경로 기준이며, POST 완료 재생 경로는 의도적으로 이 재확인에서 제외됨을 위 대조 결과에서 서술했다.
- **F 예산·운영 확인:** 별도 전후 호출/문자 비교 스크립트는 새로 만들지 않았다. `worker/lib/paid-feature-registry.js:252`의 `sukuyo-compatibility-ai`(cost 300, amountKRW 30000) 항목은 이번 수정으로 건드리지 않았고, 기존 테스트에 내장된 provider 호출/저장 단언들이 이번 수정과 무관하게 그대로 유지됨을 재확인해 생성 경로 자체는 손대지 않았음을 간접 확인했다. **입력/모델/출력 기준의 전용 전후 diff 증거는 만들지 않았다** — 이번 수정이 클라이언트 이벤트 리스너 2개 추가에 한정돼 provider 호출 경로를 바꾸지 않는다는 점을 근거로 생략했다(나크샤트라 6행과 동일한 경계).

이번 차례는 client-side 깨어남 복구 버그 재현·수정 1건에 한정했다. **12행 자체도 D의 실제 화면 증거와 F의 전용 전후 diff는 아직 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정 파일(워크트리 커밋 `677092e1c`, main 병합 커밋 `23cf9995d`):

- 고객 화면: `app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx` — 복구 effect에 `pageshow`/`focus` 추가(6행 diff).
- 행동 검사: `__tests__/ui/sukuyo-compatibility-ai-wake-recovery.behavior.test.js` (신규, 49행).
- 사이트맵: `config/sitemap-lastmod.json` — 클라이언트 파일 변경에 따른 `/sukuyo-compatibility-ai/` 서명 재생성.

```powershell
# 수정 전 재현 (main 커밋 1a2c8db52 스냅샷으로 파일 임시 교체 후 즉시 원복)
git checkout 1a2c8db52 -- app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx
node --test __tests__/ui/sukuyo-compatibility-ai-wake-recovery.behavior.test.js
git checkout HEAD -- app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx

# 수정 후
node --test __tests__/ui/sukuyo-compatibility-ai-wake-recovery.behavior.test.js
node scripts/run-mock-tests.mjs jest __tests__/worker/sukuyo-compatibility-ai.duplicate-generation.test.js --runInBand
npm run verify:sukuyo-role-direction
npm run check:fast --skip-build
```

결과: 수정 전 재현 1/1 실패(`window:pageshow` 핸들러 미등록, `actual 'undefined'` vs `expected 'function'`) → 수정 후 신규 UI 행동 검사 1/1 통과로 전환. 기존 worker 회귀 16/16 통과(무회귀). `verify:sukuyo-role-direction` OK(27거리 자리·관계명 정본 일치).

`npm run check:fast --skip-build`(파일 기반 `critical` 등급 자동 승격, base/head `253c288f0`)는 두 차례 실행했다. 1차는 클라이언트 파일 변경 직후라 `verify:sitemap-drift`에서 예상대로 BLOCKED(원장이 소스와 어긋남) — `git merge origin/main`(fast-forward, 충돌 없음) 후 `npm run sitemap:generate`(784 유지/1 갱신, `/sukuyo-compatibility-ai/` 서명만 변경)로 해소했다. 2차 전체 재실행은 처음부터 끝까지 막힘 없이 통과했다: `whitespace`·`verify:doc-freshness` OK, `run-paid-gate-suite.mjs` 88/88 ok(벽시계 235.6s, `failClosed:false`), `lint` 0 오류, `verify:sitemap-drift` OK(추적본 일치, URL 1281개), `typecheck` 0 오류, `test:node` 전체 통과(개별 회귀 스위트 다수, ✗ 없음), `verify:env-parity`·`verify:billing-pass-policy`·`verify:pass-tier-policy`·`verify:portone-single-payment`·`verify:phone-encryption`·`verify:signup-phone-required`·`verify:paid-gate-ui`·`verify:payment-choice-parity`·`verify:payment-phone-consent`·`verify:checkout-pass-card`·`verify:paid-feature-billing-policy`·`verify:ai-prompt-billing-policy`·`verify:pass-snapshot`·`verify:pass-recovery-path`·`verify:saju-unlock-entitlement-regression`·`verify:ai-consultation-flows`·`verify:staging-llm-mock`·`verify:analytics-events`·`verify:no-nested-retry`·`verify:worker-no-undef`·`verify:mongo-reset-callers`·`verify:cron-mongo-op-coverage`·`verify:admin-route-error-context` 전부 통과, `build:worker` dry-run 정상(바인딩 목록 출력, 오류 0), `verify:entry-encoding --strict-core` OK, `test:jest` 277 suite·3,884/3,884 통과(174.265초). 실패 0.

이 과정에서 `config/payment-freeze.json`의 `billing.js` `maxLines`가 게이트 실행 부작용으로 6909→6350 자동 조임된 것을 발견했다(`scripts/verify-payment-freeze.mjs`의 `growthCeilings` 자가 조임 로직, `--update` 불필요). origin/main은 여전히 6909이며 이번 행과 무관해 `git checkout --`로 커밋 범위에서 제외했다.

## 전달

워크트리 `wt/sukuyo-compat-mock-20260917-201435`에서 3개 파일만 커밋(`677092e1c`)한 뒤 main(당시 origin과 동일한 `1a2c8db52`)에 `git merge`(ort, 충돌 없음)하고 `git push origin main`(`1a2c8db52..23cf9995d`)했다. 병합 직후 `npm run sync:public`을 재실행했으나 관리 대상 경로(`public/`·`styles/`·`app/sukuyo-compatibility-ai/_art/`·`lib/marketing/`·`js/core/`·`index.html`)에 diff가 없어 추가 커밋은 없었다. main의 다른 미커밋 변경(marketing/card-news·payment-freeze.json)은 이번에도 건드리지 않았다.

`23cf9995d118188ff48a4db3d3607cff4f9ffba8`의 CI를 `gh run watch`(run `35217732726`, exit 0)로 끝까지 지켜본 뒤 `gh api .../check-runs`로 개별 결과를 재확인했다: `CI required`·`Critical checks`·`Typecheck and lint`·`Build Pages and Worker`·`Static guards`·`paid-flow-gates`·`gitleaks`·`Main drift`·`AI locale pipeline invariants`·`Cloudflare Pages` 전부 `completed`/`success`, 나머지(`Deploy staging`·`Queue asynchronous staging release`·`rollback`·`release` 등)는 `skipped` 또는 비대상 잡의 `success`다. 실패 0.
