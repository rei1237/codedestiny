# 자미두수 전문가 상담 유료 전달 검증 — 2026-09-17

대상은 재검증표 9행 `ziwei-ai-consultation` 하나다. 활성 진입점은 `/ziwei-ai/` → `app/ziwei-ai/page.tsx`(SEO metadata·`buildKrwOffer("ziwei-ai-consultation", ...)`, 88행) → `ZiweiAiRouteClient.tsx`(순수 `next/dynamic` SEO 셸, 결제 로직 없음) → `app/ziwei-ai/ZiweiAiClient.tsx`(FEATURE_KEY 상수, 303행) → `worker/routes/ziwei-ai.js`의 `/api/ziwei-ai/prepare`·`/generate`(`/start`)·`/result`다.

**시작 전 확인해 둘 점 하나: 이번 행이 4행(`ziwei-deep-pdf`)과 화면을 공유한다는 최초 가정은 근거가 없다.** 실제로 대조해 보니 두 행은 독립 상품이다 — 정본 파일이 서로 다르고(9행 `worker/routes/ziwei-ai.js` vs 4행 `worker/routes/ziwei-deep-report.js`), 진입 화면도 다르며(9행 `/ziwei-ai/` vs 4행 `/ziwei/chart/` → `AdvancedZiweiSectionV2` → `ZiweiDeepPdfPanel`), 가격 레지스트리에도 각각 독립 항목으로 등록돼 있다(`worker/lib/paid-feature-registry.js:337` `ziwei-ai-consultation`과 341~342행 `ziwei-deep-pdf` — 우연히 둘 다 300코인/30,000원이지만 서로 다른 주석·문맥을 가진 별개 SKU다). 4행 자신의 검증 문서(`ziwei-deep-paid-delivery-20260917.md`)도 "독립 `/ziwei-ai/` 상품은 아직 이번 차례에 검사하지 않았다"고 명시하고 있어, 두 상품이 애초에 별개로 취급돼 왔음을 뒷받침한다. (참고로 2026-08-13 커밋 로그에 등장하는 `ZiweiAiConsultPanel`이라는 이름은 오늘의 독립 `/ziwei-ai/` 전체 페이지 상품과 무관한, 이미 `ZiweiDeepPdfPanel`에 흡수되어 사라진 옛 컴포넌트였다 — 이름의 유사성이 만든 착시였다.) 8행이 7행과 실제로 코드·화면을 공유했던 것과 달리, 9행은 4행과 공유하는 코드가 없다. 따라서 아래 검사는 4행 검증을 전제하지 않고 9행 고유 경로를 처음부터 전부 대조했다.

## 사전 확인 — "기존 회귀 있음" 문구의 정체

체크리스트에서 이 문구는 9행에만 있는 게 아니라 아직 개별 검사를 안 한 행 전체(9~46행)에 동일하게 반복되는 상용 문구였다(전수 grep 38건). 즉 자미두수 상담에 특정된 결함 보고가 아니라 "기존 회귀 테스트는 있으나 이번 라운드의 개별 E2E 대조가 아직이다"라는 상태 표시일 뿐이다. 실제로 `__tests__/worker/ziwei-paid-delivery.test.js`를 이번 세션에서 재실행한 결과 19/19 통과했고(아래), 그 안에 실제 회귀나 실패 이력은 없었다.

## 발견과 검사 추가

`ZiweiAiClient.tsx`의 화면 재개 `useEffect`(904~908행)가 `online`·`visibilitychange` 두 이벤트만 구독하고 있었다. 같은 저장소의 형제 유료 상담 화면(`app/components/ziwei/ZiweiDeepPdfPanel.tsx` 357~365행, `app/nakshatra/ai/NakshatraAiClient.tsx` 267~282행)은 모두 `pageshow`·`focus`까지 포함한 4개 이벤트를 구독한다 — 5~8행에서 이미 발견·수정된 것과 같은 결함 종류가 9행에도 그대로 남아 있었던 것이다. iOS Safari 등에서 생성 진행 중(6개 묶음, 최대 100초 근접) 탭을 전환했다가 bfcache로 복귀하거나 포커스만 돌아오는 경우 `pageshow`/`focus`는 발생하지만 `visibilitychange`는 발생하지 않을 수 있어, 이미 결제한 사용자가 진행 중이던 상담을 자동으로 다시 조회하지 못하고 수동 새로고침 전까지 멈춘 화면에 머무를 수 있었다.

| 발견 | 기존 상태 | 이번 조치 |
|---|---|---|
| 화면 재개 이벤트 배선 누락(`pageshow`·`focus`) | `ZiweiAiClient.tsx` 904~908행이 `online`·`visibilitychange`만 구독 — bfcache 복귀·탭 재포커스 시 진행 중이던 유료 상담을 자동 재조회하지 못함 | 형제 화면과 동일한 4개 이벤트 구독으로 수정(`app/ziwei-ai/ZiweiAiClient.tsx`, +4/-1행). `__tests__/ui/ziwei-paid-resume.behavior.test.js`에 AST로 해당 `useEffect`를 직접 추출해 실행하는 신규 테스트 1건 추가(+12행) — `pageshow`·`focus`만 발생시켜도 재조회 카운터가 정확히 2회 증가하고 cleanup이 두 리스너를 모두 해제하는지 확인 |

**변이 검증:** 수정 전 코드로 되돌려 신규 테스트를 재실행한 결과 `AssertionError: window:pageshow ... actual: 'undefined', expected: 'function'`로 정확히 실패함을 확인했고(나머지 4건은 그대로 통과), 수정을 복원해 5/5 통과로 되돌아옴을 재확인했다 — 이 테스트가 실제로 무는 가드임을 실측했다.

## 대조 결과 (백엔드는 기존 코드가 이미 올바르게 동작함을 코드 정독으로 확인 — 수정 없음)

`worker/routes/ziwei-ai.js`의 결제·생성·조회 경로 전체를 처음부터 끝까지 정독해 `__tests__/worker/ziwei-paid-delivery.test.js`의 기존 시나리오 9개가 실제 코드와 1:1로 대응하는지 대조했다.

- **접근 판정(`handleEnsureAccess` 2307~2393행, `resolveStartAccess` 2395~2433행):** 입력·명식 계산가능성 검증 → 관리자 우회 → pass/월정석/코인 커버리지 즉시 토큰 발급 → 미충족 시 `createOrReusePaymentPayload`로 402. 시작 시점에는 접근 토큰(JWT) 재검증 + `PaidExecutionRecord`·`Payment`·`PointHistory`·`MonthlyCreditLedger` 4개 저장소에 걸친 취소(환불) 증거 차단까지 확인했다.
- **생성(`handleStart` 2435~2516행):** 세션ID 재개 시 소유자 다른 요청은 404로 격리, 이미 완료된 문서는 재생성 없이 그대로 반환(멱등), 종결 상태 `generation_failed`는 409로 재시도·추가 차감을 막는다. 잠금은 원자적 `findOneAndUpdate`(`generationLease` 비어있음 또는 120초 경과 시 획득 가능)로 동시 중복 생성을 막고, 중복키(11000) 경합도 별도 처리한다. 6개 묶음은 `enforceZiweiChartFacts`로 궁·사화 근거를 점검하며 `saveZiweiDelivery`로 진행 단계마다 체크포인트를 남긴다(체크리스트의 "궁·사화·미완성 묶음" 보존 특성이 여기 대응). **환불 안전장치**: 생성 완료 직후 원래 저장해 둔 `resumeBody`로 `resolveStartAccess`를 다시 호출해 생성 도중 접근이 취소되지 않았는지 재확인한 뒤(2499~2500행 부근)에만 `applyUsageOnce`로 차감하며, 재확인에 실패하면 차감 없이 실패를 반환한다. `catch` 블록은 이미 생성된 내용을 지키는 `delivery_pending`(503, 재시도 유도)과 콘텐츠 생성 전 실패(`generation_failed` + `restorePrepaidAccessOnFailure`로 결제 복원)를 구분하며, `finally`는 항상 잠금을 해제한다.
- **조회(`handleResult` 2518~2585행 부근):** `id` 없이 호출하면 완료된 최근 목록(최대 10건, 필드 프로젝션)과 `pendingSessionId`를 반환하고, `id`가 있으면 소유자 범위로만 조회(교차 계정·미존재는 404)하며 폴링 중에도 접근·취소 여부를 다시 검증한다.
- **가격표 단일 소스:** `worker/lib/paid-feature-registry.js:337`의 `{ cost: 300, amountKRW: 30000 }`, 클라이언트 상수(`ZiweiAiClient.tsx:303~307`, 코인/원화/월정석 환산액 3000까지 동일), SEO JSON-LD 오퍼(`page.tsx:88` `buildKrwOffer("ziwei-ai-consultation", ...)`가 서버 가격표에서 값을 풀어옴) 세 곳이 모두 같은 `featureKey`로 한 값을 참조한다 — 표시 가격과 실제 청구 가격이 어긋날 여지가 없다.
- **결제 게이트 금지 패턴 무재발 확인:** `buildPaymentPayload`(820~862행)·`createOrReusePaymentPayload`(864~933행) 전체와 파일 전수를 grep해 `DIRECT_KRW`·하드코딩된 `paymentMode` 리터럴이 0건임을 확인했다. `runtimeGate`는 `cost`(코인)·`amountKRW`·`membershipCreditCost`를 함께 실어 클라이언트 공용 결제창 렌더러가 선택지를 판단하게 하며, `readBillingAccessSignal`/`readBillingContext`(602~664행)는 `paymentMode`를 클라이언트가 보낸 값에서 읽기만 할 뿐 서버가 강제로 쓰지 않는다 — `docs/context/payment-gating.md` 금지 패턴 ⑤("과거 ziwei-ai에서 제거된 결함")가 재발하지 않았음을 확인했다.
- **화면 재개 이벤트는 전용 정적 가드 대상이 아님:** `npm run verify:paid-resume-wiring`은 PortOne 모바일 리다이렉트 복귀(결제 후 자동 재개 서술자 `resume:{kind,action,args}`) 축을 검사하는 것으로, 이번에 고친 bfcache/재포커스용 `pageshow`·`focus` 4-리스너 패턴과는 다른 축이다(스크립트 내 `ziwei-ai` 언급 0건으로 확인). 즉 이 패턴은 5~8행과 마찬가지로 전용 정적 가드가 없고, 화면별 행동 테스트로만 잡힌다 — 신규 테스트가 그 공백을 메운 것이다.

## A~F mock 근거와 경계

- **A 구매:** `paid-feature-registry.js:337`(300코인/30,000원) 대조, `FEATURE_KEY = "ziwei-ai-consultation"`(worker 41행·client 303행) 캡처 일치, 가격표 3중 단일 소스(위) 확인. 구매 재개·멱등(`resolveServerAccess`/`createOrReusePaymentPayload`)은 코드 정독으로 확인했으며 실제 PG는 호출하지 않았다.
- **B 생성:** 프런트는 신규 재개 이벤트 테스트로 처음 실측(위). 백엔드는 기존 워커 회귀 9개 시나리오를 이번 세션에 재실행해 19/19 통과로 재확인했다 — 8행과 달리 이번 라운드에 새로 발견된 백엔드 생성 로직 결함은 없었다.
- **C 장애:** 새로 주입하지 않았다. 기존 워커 테스트의 잠금 만료(120초)·중복키 경합·`generation_failed` 종결·`delivery_pending` 재시도 시나리오 재실행 통과로 확인했다.
- **D 전달:** 이번 차례에 실제 화면·모바일 뷰포트 재현은 하지 않았다. **D 실화면 증거는 여전히 없다(경계, 5~8행과 동일).**
- **E 저장·권한:** `handleResult`의 소유자 범위 조회·교차 계정 404·4개 저장소 취소 증거 차단을 코드 정독으로 확인했고, 기존 워커 테스트의 세션ID 교차 소유자 격리 시나리오 재실행으로 재확인했다. 별도의 교차 상품 저장·권한 스위트(`paid-completed-result-access.test.js`)에 이번 라운드용 신규 케이스를 추가하지는 않았다.
- **F 예산·운영:** 기존 워커 테스트가 차감이 재확인 이후 정확히 1회만 발생하고 재시도 경로에서 추가 LLM 호출이 없음을 이미 담고 있어 재실행으로 재확인했다. **자미두수 상담 전체에 대한 별도 전후 호출 수 diff 스크립트나 예산 실측은 만들지 않았다(경계, 5~8행과 동일).**

이번 차례는 (1) 4행과의 화면 공유 가정이 근거 없음을 실측으로 정정하고, (2) 5~8행과 같은 종류의 화면 재개 이벤트 배선 누락을 발견·수정·변이검증했으며, (3) 백엔드 결제·생성·조회 경로 전체를 처음으로 정독해 기존 워커 회귀와의 1:1 대응을 확인하는 데 집중했다. **9행 A~F 전체 완료를 뜻하지 않으며, D의 실제 화면 증거와 F의 전후 diff는 아직 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정 파일(2개: `app/ziwei-ai/ZiweiAiClient.tsx` +4/-1행, `__tests__/ui/ziwei-paid-resume.behavior.test.js` +12행):

```bash
# 신규 재개 이벤트 검사 (기존 4건 + 신규 1건)
node --test __tests__/ui/ziwei-paid-resume.behavior.test.js

# 기존 백엔드 회귀 재확인 (신규 아님, 재실행으로 재확인)
node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/worker/ziwei-paid-delivery.test.js --runInBand

npm run check:fast
```

결과: `node --test`는 **5 pass / 5 total, 0 fail**(기존 4건 무회귀 + 신규 1건). 변이 검증(수정 되돌리기 → 신규 테스트만 예상대로 실패 → 복원 → 5/5 재통과)도 함께 확인했다(위 "발견과 검사 추가" 참고). 워커 회귀는 **Tests: 19 passed, 19 total**(Test Suites: 1 passed).

`npm run check:fast`는 결제 인접 파일 수정으로 RED 등급 자동 승격되어 88항목 paid-gate-suite를 백그라운드로 돌렸다 — **88개 전부 통과**(`npm test` 포함, 벽시계 225.1초)했고 이어서 `eslint --quiet app components lib pages src`도 통과했다. 다음 단계인 `verify:sitemap-drift`에서 이 러너가 멈췄다. 순차 러너라 그 뒤 단계(`verify:admin-route-error-context`·`build:worker`·`verify:entry-encoding`·`test:jest`)에 도달하지 못했으므로, 이 4개는 이번 세션에서 개별적으로 직접 실행해 확인했다: `verify:admin-route-error-context` OK(관리자 라우트 5개), `verify:entry-encoding --strict-core` OK, `build:worker` dry-run 종료 코드 0(오류 없음), `test:jest` **Test Suites: 277 passed, 277 total / Tests: 3,881 passed, 3,881 total**(169.8초).

**정정:** 이 sitemap 드리프트를 처음에는 "9행과 무관한 선행 결함"(원인 246f34ad0 numerology 커밋)으로 오판해 보고했다. 이후 `npm run sitemap:generate`로 실제 재생성해 diff를 뜬 결과 바뀐 항목은 `/ziwei-ai/` 하나뿐이었고, `246f34ad0` 시점의 원장을 직접 열람해 그 시그니처(`bcb4058b269e4a32`)가 당시 이미 정상이었음을 확인했다 — 즉 드리프트의 실제 원인은 numerology 커밋이 아니라 **이번 행의 `14e197394`(ZiweiAiClient.tsx 수정) 자신**이었다. 콘텐츠 시그니처가 바뀌었는데 같은 커밋에서 `sitemap:generate`를 돌리지 않아 원장이 어긋났다. "마지막으로 건드린 커밋"만 보고 원인을 단정한 것이 오판의 원인이었다(코딩 원칙 8 위반 — 재생성·diff라는 직접 실측 없이 부정 단언함). 커밋 `867153e58`로 5개 파일을 재생성·재커밋해 바로잡았고, `verify:sitemap-drift` 재실행으로 OK를 확인했다.

## 전달

커밋 `14e197394`(`fix(ziwei-ai): restore pageshow/focus resume listeners on paid consultation screen`)를 `app/ziwei-ai/ZiweiAiClient.tsx`·`__tests__/ui/ziwei-paid-resume.behavior.test.js` 2개 파일만 스테이징해 main에 직접 생성했다(동시 세션의 marketing 미커밋 변경은 건드리지 않음 — 커밋 전후 `git status`로 그대로 보존됨을 확인). 이어서 이 기록과 체크리스트 9행 갱신을 담은 문서 커밋(`baabc088f`)을 추가하고 `git fetch`로 origin과 분기가 없음을 확인한 뒤 `main`에 push했다(`ccf4fb7d8..baabc088f`).

push 직후 `baabc088f`의 GitHub CI를 실측했다: `paid-flow-gates`·`Critical checks`·`Build Pages and Worker`·`Typecheck and lint`를 포함해 대부분 통과했으나, **`CI required` 애그리게이트는 실패**로 떴다(https://github.com/rei1237/codedestiny/actions/runs/35188449265). 원인은 `Static guards` 잡 안의 단일 스텝 `Verify the tracked sitemap matches its sources`(`npm run verify:sitemap-drift`)로, 같은 잡의 나머지 수백 개 검사(자미두수·결제·재개 관련 정적 가드 포함)는 전부 통과했다.

이 실패를 최초에는 "9행과 무관한 선행 드리프트(원인 246f34ad0)"로 잘못 판단해 보고했다. 위 "정정"에서 밝혔듯 실제 원인은 이번 행의 `14e197394` 자신(ZiweiAiClient.tsx 수정 후 sitemap 재생성 누락)이었다 — CI가 잡아낸 것이 맞았다. `867153e58`(`fix(sitemap): regenerate ziwei-ai lastmod after pageshow/focus edit`)로 5개 파일을 재생성·커밋·push했고, 로컬 `verify:sitemap-drift` 재실행으로 OK를 확인했다. 이 커밋의 CI 재확인은 아래에 잇는다.
