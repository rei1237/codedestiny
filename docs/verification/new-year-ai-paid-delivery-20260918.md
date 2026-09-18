# 신년운세 전문가 상담 유료 전달 검증 — 2026-09-18

대상은 재검증표 15행 `new-year-ai-consultation` 하나다. 활성 진입점은 `/new-year-ai-consultation/` → `app/new-year-ai-consultation/NewYearAiRouteClient.tsx`(순수 `next/dynamic` 코드 스플릿 래퍼, 정적 로딩 셸만 포함 — 13·14행과 동일 전례) → `app/new-year-ai-consultation/NewYearAiClient.tsx`(`FEATURE_KEY = "new-year-ai-consultation"`, 3,395행) → `worker/routes/new-year-ai.js`의 `handleStart`·`handleResult`·`handleMessage`(후속 질문, 항상 비활성) → 체크포인트 분할 생성기 `generateNewYearWave`(`NEW_YEAR_AI_SECTIONS` 5분야: 개관·재물·애정·월별·건강, 합산 20,000~28,000자 하한)다. **13·14행과 달리 별도 `result/` 하위 디렉터리가 없다** — 시작과 결과 화면을 `NewYearAiClient.tsx` 한 파일 안에서 함께 처리하는 구조임을 정독으로 확인했다(인수인계가 "미정독, 결함 단정 아님"으로 열어둔 항목을 실측으로 확정). 이전 사주·자미·네오·나크샤트라·점성술·베다·숙요·카르마·연애비책 행과 같은 뼈대의 client-side 깨어남 복구 버그를 여기서도 재현·수정했다. 다른 세션의 marketing/payment-freeze 등 무관한 미커밋 변경은 건드리지 않았다.

## 발견과 수정

`NewYearAiClient.tsx`의 재개(resume) effect는 `visibilitychange`·`online` 두 이벤트만 구독했다(`pageshow`·`focus` 누락). `startConsultation`의 웨이브 루프는 매 반복 시작에서 `document.hidden`이면 즉시 `status`를 `"ready"`로 바꾸고 중단한다 — 이 상품은 최대 18웨이브·40~55초 이상 걸릴 수 있어(기존 코드 주석 확인) 탭 백그라운드 전환이 실제로 자주 일어날 수 있는 시나리오다. 유일한 재개 경로는 포그라운드 복귀 시 `resume` 핸들러가 `reloadEpoch`를 올려 "재열람" effect가 `?sid=`/`pendingSessionId`를 다시 조회하고 `loadSession`→`startConsultation`을 재호출하는 것인데, `pageshow`·`focus`가 없으면 iOS Safari의 bfcache 복귀처럼 `visibilitychange`가 안정적으로 발화하지 않는 경로에서 재개가 조용히 실패해 결제된 세션이 부분 생성 상태로 멈출 수 있었다.

**수정:** `window.addEventListener("pageshow", resume)`·`window.addEventListener("focus", resume)`와 대응 `removeEventListener`를 cleanup에 추가했다 — `astrology-ai`·`vedic-ai`·`ziwei-ai`·`sukuyo-compatibility-ai` 등 기존 상품의 4-리스너 표준 패턴과 동일한 모양이다.

**재현·변이 검증:** 실제 파일의 `useEffect` 콜백 소스를 TypeScript AST로 직접 추출해(문자열 조작이 아님) `vm` 샌드박스에서 실행하는 신규 테스트(`__tests__/ui/new-year-ai-wake-recovery.behavior.test.js`, 50행)를 작성했다. 수정 전 코드에 대해 먼저 실행해 `AssertionError: window:pageshow handler must be registered`로 **실패**함을 확인한 뒤 수정을 적용했고, 재실행해 **통과**(1/1)함을 확인했다. `pageshow`·`focus`·`online`·`visibilitychange` 4개 모두 `reloadEpoch`를 올리는지, 문서가 숨겨진 동안은 올리지 않는지, cleanup이 리스너 4개를 전부 제거하는지까지 확인한다.

## 대조 결과 (기존 코드가 이미 올바름 — 수정 없음)

- **후속 상담은 설계상 비활성:** `handleMessage`(2484행)는 요청 내용과 무관하게 항상 410 `FOLLOW_UP_DISABLED`를 반환하며, "신년운세 전문가 상담은 처음 입력한 흐름을 기준으로 한 번 생성됩니다. 더 깊게 보고 싶은 내용은 상담 시작 전에 입력해 주세요"라는 안내 메시지까지 명시돼 있다. 인수인계가 열어둔 질문("`expert-follow-up-delivery.js` import 없음, 별도 확인 필요")은 버그가 아니라 **의도된 설계**임을 코드로 확정했다 — 13·14행과 달리 이 상품은 후속 질문 공유 모듈을 애초에 재사용하지 않는다.
- **"품질 게이트가 테스트에서 전부 모킹됨" 패턴 점검(8·14행 반복 함정, 15행 우선 확인 대상):** 기존 `scripts/verify-new-year-ai-flow.mjs`와 `__tests__/ui/new-year-paid-delivery.behavior.test.js` 둘 다 정독한 결과, `buildFirstPrompt`·`buildSystemPrompt`·`validateConsultationQuality`·`validateFortuneDataConsistency`·`buildMockConsultationText`·`buildBasicSajuProfile`·`generateNewYearWave`·`handleStart`·`assembleConsultationSections`·`finishNewYearDelivery`를 **실제 프로덕션 함수 그대로** 호출해 검증하고 있었다 — 모킹된 것은 LLM 네트워크 호출 경계(`generateConsultationSection` 내부 fetch) 하나뿐이다. 8·14행과 달리 **이 패턴은 15행에는 해당하지 않는다** — 실측으로 확인한 부정 단언이며, 별도 게이트 보강 테스트는 필요하지 않았다.
- **라우트 분리 구조:** `NewYearAiRouteClient.tsx`(39행)는 `next/dynamic(() => import("./NewYearAiClient"), { ssr: false })`만 감싸는 얇은 코드 스플릿 래퍼이며 정적 로딩 셸(`NewYearAiShell`) 외에 별도 상태·이펙트가 없다. 수정 대상은 정확히 `NewYearAiClient.tsx` 한 파일임을 확인했다.
- **이용 처리 분기(`finishNewYearDelivery`, 2366행):** `access.deferredUsage`(단건 결제)면 실제 billing 라우트 apply 호출, 월정석인데 `usageAlreadyApplied`가 아니면 `MONTHLY_CREDIT_GATE_REQUIRED`로 우회를 막고, 그 외(이용권 또는 이미 적용된 월정석)는 `applyUsageOnce`로 `sessionId` 기준 멱등 처리한다. `applyUsageOnce`가 `userId`를 필터에 쓰지 않지만, 호출 시점의 `pending.id`는 이미 상위에서 `{id, userId}`로 소유권이 확인된 문서라 별도 인가 공백은 아니다.
- **가격 정본:** `worker/lib/paid-feature-registry.js:327`에 `"new-year-ai-consultation": { cost: 300, amountKRW: 30000, reason: "신년운세 전문가 상담" }`가 존재함을 재확인했다. 인수인계 기재와 일치.

## A~F mock 근거와 경계

- **A 구매:** 위 가격 정본 대조 완료. 기존 `new-year-paid-delivery.behavior.test.js`의 이용권/월정석/단건 3경로 5웨이브 체크포인트 완료 테스트를 재실행해 원래 멱등 키로 재개됨을 재확인했다. 실제 PG는 호출하지 않았다.
- **B 생성:** `node scripts/verify-new-year-ai-flow.mjs`를 수정 전/후 두 차례 실행 — 둘 다 `[verify-new-year-ai-flow] ok`로 5분야 구조와 20,000~28,000자 하한 충족을 확인했다. 이 스크립트가 실제 `buildFirstPrompt`/`buildSystemPrompt`/`validateConsultationQuality`/`validateFortuneDataConsistency`를 모킹 없이 직접 호출한다는 점을 위에서 실측했다.
- **C 장애:** 새로 주입하지 않았다. 기존 `new-year-paid-delivery.behavior.test.js`의 "최종 저장 null→환불 없이 503", "apply 응답 유실 복구", "분야별 저장 실패는 분야를 잃지 않고 환불로 흐르지 않음", "동시 요청은 한 분야만 생성한다"(원자적 락 클레임), "짧은 분야는 거부", "19,999/20,000자 경계", 신뢰도 증거 우회 3변형을 재실행해 통과를 재확인했다. 이번 수정은 이 경로를 건드리지 않는다.
- **D 전달:** 이번 수정의 핵심. 신규 변이 테스트 1/1(수정 전 실패·수정 후 통과) + 기존 UI 회귀 16/16(무회귀) 재확인. 기존 테스트에 이미 포함된 실제 클라이언트 effect 검사(`startConsultation` 콜백을 AST로 추출해 부분 결과가 완료로 표시되지 않고 재개가 결제를 재트리거하지 않음을 확인)와 `RevealBlock` 렌더 검사(긴 결과에 애니메이션/가시성 게이팅 없음)도 함께 재확인했다. **실제 브라우저 렌더(390/430px·데스크톱 화면 증거)는 이번 차례에 만들지 않았다** — 함수 단위 행동 검사로만 확인했으며, 이전 행들과 동일한 경계다.
- **E 저장·권한:** 새로 주입하지 않았다. 기존 테스트의 입력 해시·소유권·`isStoredPaidResultRevoked` 무효화 증거 확인(GET 결과 조회 시 추가 LLM/결제 호출 0건), 신뢰도 증거 우회 3변형 파라미터화 테스트를 재실행해 재확인했다.
- **F 예산·운영 확인:** 별도 전후 호출/문자 비교 스크립트는 새로 만들지 않았다 — 이번 수정이 클라이언트 이벤트 리스너 2개 추가에 한정돼 provider 호출 경로를 바꾸지 않는다는 점을 근거로 생략했다(이전 행들과 동일한 경계). 기존 "동시 요청은 한 분야만 생성한다"(원자적 락 클레임) 테스트가 중복 생성 방지를 재확인한다.

이번 차례는 client-side 깨어남 복구 버그 재현·수정 1건, "품질 게이트 모킹" 함정 부정 확인 1건(8·14행과 달리 해당 없음), 후속 상담 비활성·이용 처리 분기·가격 정본의 코드 대조 확인에 한정했다. **15행 자체도 D의 실제 화면 증거와 F의 전용 전후 diff는 아직 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정/신규 파일:

- 화면(시작+결과 겸용): `app/new-year-ai-consultation/NewYearAiClient.tsx` — 재개 effect에 `pageshow`/`focus` 추가.
- 행동 검사(신규): `__tests__/ui/new-year-ai-wake-recovery.behavior.test.js`(50행).
- 사이트맵: `config/sitemap-lastmod.json`·미러 4개 — 클라이언트 파일 변경에 따른 서명 재생성.
- 검증 기록(신규): 이 문서.

```bash
node --test __tests__/ui/new-year-ai-wake-recovery.behavior.test.js __tests__/ui/new-year-paid-delivery.behavior.test.js
node scripts/verify-new-year-ai-flow.mjs
npm run sitemap:generate
npm run check:fast
```

결과: UI 행동 검사 **17/17 통과**(신규 1 + 기존 16, 무회귀). `verify-new-year-ai-flow`는 수정 전(실패 재현용 별도 실행 없이 기존 상태 그대로) 및 수정 후 두 차례 모두 `[verify-new-year-ai-flow] ok`. `npm run check:fast`(클라이언트 파일 변경으로 critical 등급 자동 승격)는 `verify:staging-llm-mock`·`verify:analytics-events`·`verify:no-nested-retry`·`verify:worker-no-undef`·`verify:mongo-reset-callers`·`verify:cron-mongo-op-coverage`·`verify:admin-route-error-context`·`build:worker`(dry-run)·`verify:entry-encoding`을 전부 OK로 통과한 뒤 전체 Jest로 승격해 **281개 스위트 / 3,958개 테스트 전부 통과**(178.5초, 종료 코드 0)로 끝났다.

## 전달

워크트리 `new-year-ai-mock-20260918-112131`에서 7개 파일을 `538848bb9`로 커밋했다. 이 워크트리 브랜치가 origin/main보다 1커밋(무관한 SEO 세션의 `SEO-CHANGELOG.md`/P7 인수인계 문서 커밋 `3afe11f1b`) 뒤처져 있어 ff-only가 불가능했으므로 `git fetch origin main` 후 `git merge origin/main`으로 병합했다(문서 파일만 겹쳐 충돌 없이 자동 병합, 머지 커밋 `b1cbb618c`). 병합 직후 `npm run sitemap:generate`·`npm run sync:public`을 재실행해 각각 드리프트 0을 확인했다(정적 미러 재오염 없음). `git push origin HEAD:main`으로 origin main에 fast-forward push했다(`3afe11f1b..b1cbb618c`). CI(`gh api commits/b1cbb618c/check-runs`)는 push 직후 대부분 `in_progress`였으나, 백그라운드 `until` 루프로 전체 체크런이 `completed`로 정착할 때까지 능동 대기한 뒤 재확인한 결과 [28개 중 `CI required`·`Critical checks`·`Static guards`·`Typecheck and lint`·`gitleaks`·`Build Pages and Worker`·`Main drift`·`Risk tier`·`AI locale pipeline invariants`·`paid-flow-gates` 포함 17개 success·11개 skipped(조건부 `release`/`rollback` 매트릭스·중복 `Deploy staging`/`Queue asynchronous staging release` 잡 등 비대상)·실패 0](https://github.com/rei1237/codedestiny/commit/b1cbb618c/checks)을 확인했다. 실결제·운영 DB 쓰기·운영 승격은 진행하지 않았다.
