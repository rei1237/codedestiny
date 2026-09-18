# AI 작명 보고서 유료 전달 검증 — 2026-09-18

대상은 재검증표 16행(라벨 `premium-naming-report`)이다. **재검증표 라벨은 레거시 별칭이고, 실제 코드상 canonical `FEATURE_KEY`는 `premium-naming-prompt`**임을 `worker/routes/naming-prompt.js` 18~19행(`FEATURE_KEY`/`LEGACY_FEATURE_KEY` 둘 다 선언)과 28행 `ALLOWED_FEATURE_KEYS`(별칭 5개 허용)로 확인했다. 활성 진입점은 `/naming-ai/` → `app/naming-ai/NamingAiClient.tsx`(시작 화면, `MEMBERSHIP_CREDIT_COST = 3000` 등 가격 상수 보유) + `NamingAiRouteClient.tsx`(순수 `next/dynamic` 래퍼) → 결제 후 `app/naming-ai/result/NamingAiResultClient.tsx`(결과 화면, 15행까지와 달리 **별도 `result/` 하위 디렉터리가 실제로 존재**) → `worker/routes/naming-prompt.js`의 `handleCheckout`·`handleVerifyPayment`·`handleGenerate`·`handleResult` → 체크포인트 분할 생성기 `generateNamingWave`(`worker/lib/naming-report-delivery.js`, 8개 고정 장 제목, 장당 ≥2,500자·합계 ≥20,000자 하한, 매 시도마다 evidenceHash 대조로 사주 계산값 변형·환각 방지)다. 5~15행과 같은 뼈대의 client-side 깨어남 복구 버그를 결과 화면에서만 재현·수정했다. 다른 세션의 marketing/checkout 등 무관한 변경은 건드리지 않았다.

## 발견과 수정

`NamingAiResultClient.tsx`(201~205행)의 재개 effect는 `visibilitychange`·`online` 두 이벤트만 구독했다(`pageshow`·`focus` 누락). 이 effect가 올리는 `retryKey`는 메인 데이터 조회 effect(206~233행)의 의존성 배열에 있어, `retryKey`가 갱신돼야 `runNamingReader`가 재호출된다. bfcache 복귀(pageshow)나 창 포커스만 복귀(focus)하는 경로에서는 재조회가 발생하지 않아, 실제로는 서버에 정상 저장된 결과가 클라이언트 화면에는 "생성 중"으로 고착될 수 있었다.

**수정:** `window.addEventListener("pageshow", resume)`·`window.addEventListener("focus", resume)`와 대응 `removeEventListener`를 cleanup에 추가했다 — `love-secret-ai`·`new-year-ai` 등 기존 상품의 4-리스너 표준 패턴과 동일한 모양이다.

**재현·변이 검증:** 실제 파일의 `useEffect` 콜백 소스를 TypeScript AST로 직접 추출해(문자열 조작이 아님) `vm` 샌드박스에서 실행하는 신규 테스트(`__tests__/ui/naming-prompt-wake-recovery.behavior.test.js`)를 작성했다. 수정 전 코드에 대해 먼저 실행해 `AssertionError: window:pageshow handler must be registered`로 **실패**함을 확인한 뒤 수정을 적용했고, 재실행해 **통과**(1/1)함을 확인했다. `pageshow`·`focus`·`online`·`visibilitychange` 4개 모두 `retryKey`를 올리는지, `document.visibilityState === "hidden"`이거나 `navigator.onLine === false`일 때는 올리지 않는지(이 상품 고유의 이중 게이트 — 15행의 `document.hidden` 단일 게이트보다 조건이 하나 더 많음), cleanup이 리스너 4개를 전부 제거하는지까지 확인한다.

## 대조 결과 (기존 코드가 이미 올바름 — 수정 없음)

- **시작 화면은 같은 결함이 없다(다른 이유로):** `NamingAiClient.tsx`에는 애초에 `pageshow`/`focus`는 물론 `visibilitychange`/`online` 리스너도 전혀 없다. 7행(인연의 서) 전례는 "결과 화면으로 능동 이관하는 `document.hidden` 분기 설계"였지만, 작명 시작 화면은 그 분기도 없다 — 대신 `/generate`가 **요청 안에서 LLM 생성을 동기적으로 끝내는 라우트**(코드 주석 확인: `worker/routes/naming-prompt.js`의 waitUntil 백그라운드 폴링은 Workers 요청 간 I/O 격리로 의도적으로 배제)이기 때문에 안전하다. 폴링 루프와 달리 단일 `await fetch`는 탭이 백그라운드로 전환돼도(완전히 evict되지 않는 한) 타이머 스로틀링의 영향을 받지 않고 그대로 응답을 받는다. 완전히 evict된 경우 리스너로도 복구할 수 없지만, `buildExecutionId`가 결정적이라 수동 재제출이 멱등해 이중 결제·이중 생성 위험이 없다. 클라이언트 타임아웃(`GENERATE_TIMEOUT_MS = 115000`)도 서버의 엣지 한계(~100초)보다 넉넉하게 잡혀 있음을 코드 주석(과거 동일 버그의 수정 이력)으로 확인했다. `worker/routes/naming-prompt.js`의 `handleGenerate`/`beginNamingGeneration`을 직접 읽어 백엔드가 실제로 요청 내에서 동기 생성함을 확인한 뒤 내린 결론이다 — 버그 아님.
- **"품질 게이트가 테스트에서 전부 모킹됨" 패턴 점검(8·14행 반복 함정, 16행 우선 확인 대상):** `__tests__/worker/naming-paid-delivery.test.js`를 정독한 결과, 모킹된 것은 raw LLM 호출(`callGeminiText`) 하나뿐이었다 — `generateNamingWave`·`namingReportComplete`·evidenceHash 대조·장 길이 게이트는 전부 실제 프로덕션 함수 그대로 실행된다. **이 패턴은 16행에는 해당하지 않는다** — 실측으로 확인한 부정 단언이다.
- **가격 정본 일치:** `scripts/verify-naming-prompt-flow.mjs`(255~261행)가 `calculateMembershipCreditCost(row.cost) === 3000`을 실제 `worker/lib/billing-policy.js` import로 런타임 계산해 클라이언트 하드코딩 상수(`MEMBERSHIP_CREDIT_COST = 3000`)와 일치를 이미 검증하고 있음을 확인했다 — 인수인계가 열어둔 교차 확인 항목이 이미 기존 검증기로 커버돼 있었다.
- **별칭 테이블 일치:** `worker/lib/paid-feature-registry.js` 705~720행 별칭 테이블에 `premium_naming_report`·`"premium-naming-report"` 등 8개 별칭이 전부 canonical `premium-naming-prompt`로 매핑됨을 확인했다. 인수인계 기재와 일치.
- **E축 취소·환불 차단 배선:** `naming-prompt.js`에서 `isPaidResultRevoked` 호출이 5곳(`handleCheckout` 인접, `handleGenerate` 멱등 반환 경로 2곳, `handleResult` GET)이며, 교차 상품 스위트(`__tests__/worker/paid-completed-result-access.test.js`)가 `PAID_COMPLETED_RESULT_ACCESS_FIXTURES`(16행에 `premium-naming-report` 등록)로 소스 내 마커 출현 횟수(≥2)를 정적으로 확인하고, 동일 스위트의 `test.each`가 실제 프로덕션 함수 `isStoredPaidResultRevoked`(DB 모델만 모킹)를 제네릭하게 호출해 재검증한다.

## A~F mock 근거와 경계

- **A 구매:** `handleCheckout`이 `membershipCreditCost: calculateMembershipCreditCost(COIN_PRICE)`를 포함해 체크아웃 페이로드를 구성함을 코드로 확인. 위 가격 정본 대조 완료. 실제 PG는 호출하지 않았다.
- **B 생성:** `generateNamingWave`가 8개 고정 장(작명가의 총평~이름을 올리기 전에)·장당 ≥2,500자·합계 ≥20,000자를 요구하며, `usable(ai)`가 mock provider(`/mock/i`)와 잘린 출력을 거부함을 확인. `naming-paid-delivery.test.js`의 19,999/20,000자 + 누락 장 경계 테스트를 재실행해 통과를 재확인했다.
- **C 장애:** 새로 주입하지 않았다. 기존 `naming-paid-delivery.test.js`의 저장 throw/null/낙관적 락 불일치 3변형×2 호출지점(6개), 동시 중복 요청 시 조기 완료 미노출, 취소 재열람 차단(403·provider 호출 수 고정), 교차 소유자 404, provider 중도 중단 복구(부분 장 보존, 누락분만 재시도), evidenceHash 변조 거부(단일 장만 복구) 테스트를 재실행해 113/113 통과를 재확인했다. 이번 수정은 이 경로를 건드리지 않는다.
- **D 전달:** 이번 수정의 핵심. 신규 변이 테스트 1/1(수정 전 실패·수정 후 통과) + 기존 UI 회귀 13/13(`naming-paid-reader.behavior.test.js` 3 + `naming-locale-pools.test.js` 10, 무회귀) 재확인. **실제 브라우저 렌더(390/430px·데스크톱 화면 증거)는 이번 차례에 만들지 않았다** — 함수 단위 행동 검사로만 확인했으며, 이전 행들과 동일한 경계다.
- **E 저장·권한:** 새로 주입하지 않았다. 위 "E축 취소·환불 차단 배선" 대조와 `naming-paid-delivery.test.js`의 PASS/MONTHLY/SINGLE 접근 경로별 재열람 0회 추가 provider 호출 재확인, 교차 상품 스위트(`paid-completed-result-access.test.js`) 전체 재실행으로 재확인했다.
- **F 예산·운영 확인:** 별도 전후 호출/문자 비교 스크립트는 새로 만들지 않았다 — 이번 수정이 클라이언트 이벤트 리스너 2개 추가에 한정돼 provider 호출 경로를 바꾸지 않는다는 점을 근거로 생략했다(이전 행들과 동일한 경계). 기존 "동시 중복 요청은 조기 완료를 노출하지 않는다" 테스트가 재실행되어 확인된다.

이번 차례는 client-side 깨어남 복구 버그 재현·수정 1건, "품질 게이트 모킹" 함정 부정 확인 1건(8·14행과 달리 해당 없음), 시작 화면 무결함 확인 1건(7행과 다른 근거로), 가격·별칭·E축 배선 코드 대조 확인에 한정했다. **16행 자체도 D의 실제 화면 증거와 F의 전용 전후 diff는 아직 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정/신규 파일:

- 화면(결과): `app/naming-ai/result/NamingAiResultClient.tsx` — 재개 effect에 `pageshow`/`focus` 추가.
- 행동 검사(신규): `__tests__/ui/naming-prompt-wake-recovery.behavior.test.js`.
- 검증 기록(신규): 이 문서.

```bash
node --test __tests__/ui/naming-prompt-wake-recovery.behavior.test.js __tests__/ui/naming-paid-reader.behavior.test.js __tests__/ui/naming-locale-pools.test.js
node scripts/run-mock-tests.mjs jest --runInBand __tests__/worker/naming-paid-delivery.test.js __tests__/worker/paid-completed-result-access.test.js
node scripts/verify-naming-prompt-flow.mjs
npm run sitemap:generate
npm run check:fast
```

결과: UI 행동 검사 **14/14 통과**(신규 1 + 기존 13, 무회귀). Worker jest **113/113 통과**. `verify-naming-prompt-flow` PASS(수정 후). 사이트맵 재생성 드리프트 0. `npm run check:fast`(결제 인접 파일 변경으로 critical 등급 자동 승격)는 `verify:staging-llm-mock`·`verify:analytics-events`·`verify:no-nested-retry`·`verify:worker-no-undef`·`verify:mongo-reset-callers`·`verify:cron-mongo-op-coverage`·`verify:admin-route-error-context`·`build:worker`(dry-run)·`verify:entry-encoding`을 전부 OK로 통과한 뒤 전체 Jest로 승격해 **281개 스위트 / 3,959개 테스트 전부 통과**(186.4초, 종료 코드 0)로 끝났다.

## 전달

워크트리 `naming-prompt-mock-20260918-125648`(base `5b04b0e36`)에서 2개 파일을 `3d74f79f8`로 커밋했다. 이 워크트리 브랜치가 origin/main보다 3커밋(무관한 checkout 다국어 배선·SEO 감사·인수인계 문서 커밋) 뒤처져 있어 ff-only가 불가능했으므로 `git fetch origin main` 후 `git merge origin/main`으로 병합했다(파일 겹침 없이 충돌 없음, 머지 커밋 `937cd7404`). 병합 직후 `npm run sitemap:generate`·`npm run sync:public`을 재실행해 각각 드리프트 0을 확인했다(정적 미러 재오염 없음). `git push origin HEAD:main`으로 origin main에 fast-forward push했다(`81dd4ee06..937cd7404`).

**CI 확인(`937cd7404`):** `gh api .../check-runs`로 전수 조회한 결과 `Static guards` 1건과 그 집계 `CI required` 1건이 실패, 나머지(`paid-flow-gates`·`Typecheck and lint`·`Build Pages and Worker`·`gitleaks`·`Main drift`·`Risk tier`·`AI locale pipeline invariants`·`Critical checks`·`scope`·`Resolve staging watch scope`·`Resolve release necessity` 등)는 전부 success 또는(조건부 릴리스/롤백 매트릭스) skipped였다. `Static guards`의 실패 원인은 `verify:handoff-contract`(인수인계 문서 프론트매터 계약) — 로그로 `docs/handoff/checkout-i18n-wiring-20260918.md`가 프론트매터 없이 커밋됐음을 확인했다. **이 실패는 16행 작업과 무관하다**: 병합 이전 origin/main HEAD였던 `81dd4ee06`에서 이미 동일하게 `Static guards`/`CI required`가 실패 중이었음을 그 커밋의 체크런으로 대조 확인했다(다른 세션이 커밋한 `/checkout` 다국어 배선 인수인계 문서의 프론트매터 누락). 트리비얼한 GREEN 등급 수정(프론트매터 3줄 추가, 행동 변경 없음)으로 고쳐 커밋 `b99272cce`를 워크트리에 만들었으나, 이 세션에서는 `git push` 권한이 자동 모드 분류기에 의해 거부돼 아직 push하지 못했다 — **다음 세션 또는 사용자 승인이 필요한 유일한 남은 단계**다. push 후에는 이 문서·재검증표·인수인계 문서의 CI 수치를 최종 green 기준으로 다시 확인해야 한다.
