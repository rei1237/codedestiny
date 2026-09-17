# 점성술 전문가 상담 유료 전달 검증 — 2026-09-17

대상은 재검증표 10행 `astrology-ai-consultation` 하나다. 활성 진입점은 `/astrology-ai/` → `app/astrology-ai/page.tsx`(SEO metadata, `robots: { index: false, follow: false }`로 비색인) → `AstrologyAiRouteClient.tsx`(순수 `next/dynamic` SEO 셸, 결제 로직 없음) → `app/astrology-ai/AstrologyAiClient.tsx`(`FEATURE_KEY = "astrology-ai-consultation"`, 1374행) → `worker/routes/astrology-ai.js`의 `handleEnsureAccess`(1653행)·`handleStart`(1703행)·`handleResult`(1797행)·`handleBasis`(1861행, LLM/DB 없는 차트 미리보기)다. 결과 화면은 `app/astrology-ai/result/AstrologyAiResultClient.tsx`가 별도로 담당한다.

## 사전 확인 — "기존 회귀 있음" 문구의 정체

9행 문서에서 이미 확인했듯 이 문구는 아직 개별 검사를 하지 않은 행 전체에 반복되는 상용 상태 표시이지, 점성술 상담에 특정된 결함 보고가 아니다. 실제로 `__tests__/worker/astrology-paid-delivery.test.js`(26개 시나리오)를 이번 세션에서 재실행한 결과 전부 통과했다.

## 발견과 수정

`AstrologyAiClient.tsx`의 대기 세션 확인 `useEffect`(수정 전 1586~1605행)와 `AstrologyAiResultClient.tsx`의 재개 `useEffect`(수정 전 476~481행) 둘 다 `online`·`visibilitychange` 두 이벤트만 구독하고 있었다. 5~9행에서 이미 발견·수정된 것과 같은 결함 종류다 — bfcache 복귀(`pageshow`)나 창 재포커스(`focus`)만 발생하는 경우 `visibilitychange`는 발생하지 않을 수 있어, 이미 결제해 진행 중이던 상담(6개 섹션 병렬 생성, 체크포인트+2차 부족분 재시도)을 자동으로 다시 조회하지 못하고 수동 새로고침 전까지 멈춘 화면에 머무를 수 있었다.

| 발견 | 기존 상태 | 이번 조치 |
|---|---|---|
| 시작 화면 대기 세션 확인 effect의 이벤트 배선 누락 | `AstrologyAiClient.tsx` 1586~1605행이 `online`·`visibilitychange`만 구독 | `pageshow`·`focus` 리스너와 대응 cleanup 추가(+10/-2행) |
| 결과 화면 재개 effect의 이벤트 배선 누락 | `AstrologyAiResultClient.tsx` 476~481행이 `online`·`visibilitychange`만 구독 | `pageshow`·`focus` 리스너와 대응 cleanup 추가(+9/-2행) |

**재현·변이 검증:** 실제 파일의 `useEffect` 콜백 소스를 TypeScript AST로 직접 추출해(문자열 조작이 아님) `vm` 샌드박스에서 실행하는 신규 테스트(`__tests__/ui/astrology-ai-wake-recovery.behavior.test.js`)를 작성했다. 수정 전 코드에 대해 먼저 실행해 두 테스트 모두 `window:pageshow handler must be registered`에서 정확히 실패함을 확인한 뒤(2/2 fail), 수정을 적용해 2/2 통과로 전환했다 — 이 테스트가 실제로 무는 가드임을 실측했다. 가드(숨김 문서·오프라인 유사 lock·stale owner)와 cleanup의 리스너 전체 해제도 함께 검증한다.

## 대조 결과 (백엔드는 기존 코드가 이미 올바르게 동작함을 코드 정독으로 확인 — 수정 없음)

`worker/routes/astrology-ai.js`를 906~1928행 전체 정독하고 `__tests__/worker/astrology-paid-delivery.test.js`의 기존 26개 시나리오와 1:1로 대응하는지 대조했다.

- **섹션 계약(`ASTROLOGY_SECTIONS`, 915행):** 6개 섹션 × `minChars: 3400 / maxChars: 5000`. 병렬 1차 생성 + 체크포인트 저장 + 2차 웨이브에서 부족분만 재시도(`generateSectionedConsultation`, 1119행)하는 구조로, "모델이 ~6000자에서 멈추는" 실패 모드를 섹션 분할로 우회한다. 잘리거나 짧은 섹션은 완성본으로 인정하지 않는 검사(테스트 기준)를 코드가 실제로 만족한다.
- **접근 판정(`handleEnsureAccess`, 1653행):** 입력·계산 가능성 검증 → pass/월정석/코인 커버리지 판정 순서를 확인했다.
- **생성·저장(`handleStart`, 1703행 / `saveAstrologyDelivery`, 1693행):** `resumeSessionId` 기반 멱등 재개, lease 기반 동시성 직렬화, 완료 직전 접근 재검증 후 차감(실패 시 `refundCardPaymentOnFailure`/`failRefundableExecution`로 환불), 쓰기 후 재조회로 저장을 확인하고 불일치 시 `resultStorageUnavailable`을 던지는 저장 확인 절차까지 코드에 존재함을 확인했다.
- **조회(`handleResult`, 1797행):** 생성 중/부분/`delivery_pending`에서 202 응답과 재검증된 접근 판정, `isStoredPaidResultRevoked`를 통한 취소 증거 차단, 빈 본문 409를 확인했다.
- **가격표:** `worker/lib/paid-feature-registry.js:304`의 `{ cost: 300, amountKRW: 30000, reason: "점성술 전문가 상담" }` — 체크리스트에 기재된 300코인/30,000원과 일치한다.
- **교차 상품 저장·권한 스위트:** `astrology-ai-consultation`은 `__tests__/fixtures/paid-completed-result-access-fixtures.mjs`(10행)에 이미 `{ products: ["astrology-ai-consultation"], file: "worker/routes/astrology-ai.js", marker: "isStoredPaidResultRevoked" }`로 등록돼 있어 `paid-completed-result-access.test.js`의 완료본 재접근 차단 시나리오를 그대로 상속받는다 — 이번 세션에서 필터 재실행으로 통과를 재확인했다(신규 케이스 추가는 하지 않음).
- **탐색 중 확인만 하고 건드리지 않은 것:** `generateConsultation`(1259행)은 섹션 분할 없는 단일 호출 생성기로, 라우터 어디에서도 호출부가 확인되지 않는 사용되지 않는 것으로 보이는 함수다. 이번 결함과 무관하고 범위 밖이라 삭제·수정하지 않고 기록만 남긴다(후속 과제 후보).

## A~F mock 근거와 경계

- **A 구매:** `paid-feature-registry.js:304`(300코인/30,000원) 대조, `FEATURE_KEY` 캡처 일치 확인. 실제 PG는 호출하지 않았다.
- **B 생성:** 6섹션 병렬+체크포인트+2차 재시도 구조를 코드 정독으로 확인, 기존 워커 회귀 26개 재실행으로 재확인. 이번 라운드에 새로 발견된 백엔드 생성 로직 결함은 없다.
- **C 장애:** 새로 주입하지 않았다. 기존 워커 테스트의 3회 짧은 섹션 컷오프, 저장 실패(null/throw/확인 유실) × `delivery_pending`/`completed` 조합, lease 만료, 동시 요청 직렬화 시나리오 재실행으로 확인했다.
- **D 전달:** 프런트 재개 배선 결함을 이번에 재현·수정·변이검증했다(위). 실제 화면·모바일 뷰포트 렌더링 재현은 하지 않았다. **D 실화면 증거는 여전히 없다(경계, 5~9행과 동일).**
- **E 저장·권한:** `handleResult`의 소유자 범위 조회·`isStoredPaidResultRevoked` 취소 증거 차단을 코드 정독 + 기존 워커 회귀 + 교차 상품 스위트 재실행으로 확인했다.
- **F 예산·운영:** 기존 워커 테스트가 재확인 이후 정확히 1회 차감·재시도 경로 추가 LLM 호출 없음을 이미 담고 있어 재실행으로 재확인했다. **전용 전후 호출 수 diff 스크립트나 예산 실측은 만들지 않았다(경계, 5~9행과 동일).**

## 재검사 명령과 결과

수정 파일 3개(`app/astrology-ai/AstrologyAiClient.tsx` +10/-2행, `app/astrology-ai/result/AstrologyAiResultClient.tsx` +9/-2행, `__tests__/ui/astrology-ai-wake-recovery.behavior.test.js` 신규 99행):

```bash
node --test __tests__/ui/astrology-ai-wake-recovery.behavior.test.js __tests__/ui/astrology-paid-resume.behavior.test.js

NODE_OPTIONS=--experimental-vm-modules npx --no-install jest \
  __tests__/worker/astrology-paid-delivery.test.js \
  __tests__/worker/astrology-ai-prompt-domain-templates.test.js \
  __tests__/worker/paid-completed-result-access.test.js \
  -t "astrology-ai-consultation" --runInBand

npm run sitemap:generate
npm run check:fast
```

결과: `node --test` **6 pass / 6 total, 0 fail**(신규 2건 + 기존 4건, 병합된 main에서 재확인). 변이 검증(수정 되돌리기 → 신규 2건만 `window:pageshow handler must be registered`로 정확히 실패 → 복원 → 6/6 재통과)도 확인했다(위 "발견과 수정" 참고). 워커 jest는 astrology-paid-delivery·astrology-ai-prompt-domain-templates **26/26 통과** + paid-completed-result-access 필터 매칭 **2/2 통과**(94건 스킵, 전부 무관 상품). `sitemap:generate`는 갱신 0건(`/astrology-ai/`는 `robots: noindex`로 애초에 사이트맵 비대상) — 워크트리 커밋 전과 main 병합 후 두 시점 모두 diff 없음을 확인했다.

`npm run check:fast`는 결제 인접 파일 수정으로 RED 등급 자동 승격돼 전체 게이트(`verify:ai-consultation-flows`·`verify:staging-llm-mock`·`verify:analytics-events`·`verify:no-nested-retry`·`verify:worker-no-undef`·`verify:mongo-reset-callers`·`verify:cron-mongo-op-coverage`·`verify:admin-route-error-context`·`build:worker` dry-run·`verify:entry-encoding --strict-core`·`test:jest`)를 끝까지 실행했다 — **전부 통과**, `test:jest`는 **Test Suites: 277 passed, 277 total / Tests: 3,881 passed, 3,881 total**(156.6초), 종료 코드 0.

## 전달

동시 편집 상태를 `ListAgents`로 확인한 결과 쓰기 세션이 2개(이 세션 포함)라 워크트리(`D:\Development\codedestiny-worktrees\astrology-ai-mock-20260917-160308`, 브랜치 `wt/astrology-ai-mock-20260917-160308`, origin/main HEAD `d6350fcfb` 기준 생성)에서 작업했다. 수정 파일 3개만 스테이징해 커밋 `d12980b05`(`fix(astrology-ai): pageshow·focus 복구 누락 재현·수정`)를 생성한 뒤, 공유 main 체크아웃으로 돌아와 동시 세션(`code-destiny-a0`, 확인 시점 idle)이 이미 커밋해 둔 문서 커밋 2개(`873bdf254`·`03a1c9b53`, SEO 감사 관련, 미푸시 상태)를 건드리지 않고 `git merge`로 병합했다(병합 커밋 `bf4996793`, main·origin 끝점 이전 `d6350fcfb`). 병합 전후 `git status`로 마케팅 폴더의 기존 미커밋 변경(다른 세션 소관)이 그대로 보존됨을 확인했다. 병합 후 `sitemap:generate` 재실행으로 드리프트 없음을 재확인한 뒤 `git push origin main`(`d6350fcfb..bf4996793`)했다.

push 직후 같은 SHA(`bf499679381665d6e1933188b97d62634d8674d9`)의 GitHub CI를 `gh run list`·`gh api .../check-runs`로 직접 실측했다(백그라운드 `Monitor` 폴링은 15분간 이벤트 0건으로 만료돼 신뢰하지 않고 별도 직접 조회로 재확인). [체크런 목록](https://github.com/rei1237/codedestiny/commit/bf499679381665d6e1933188b97d62634d8674d9/checks) 기준 워크플로 실행 9건(Landing Watchdog·Release Cloudflare Pages and Worker ×3·PR CI·Secret Scan·AI Locale Gate·Main drift watchdog) 전부 `completed`/`success`이며, 체크런 28개 중 `CI required`·`Critical checks`·`Build Pages and Worker`·`Typecheck and lint`·`Static guards`·`Main drift`·`gitleaks`·`Risk tier`·`AI locale pipeline invariants`를 포함한 16개가 success, 나머지 12개(`Deploy staging`·`Queue asynchronous staging release`·`release`·`rollback`·`Check that landed work reached staging`의 조건부 매트릭스 잡)는 skipped, 실패·취소·대기 0건이었다. 실결제·과금 LLM·운영 DB·운영 승격은 이번 세션에서 실행하지 않았다.
