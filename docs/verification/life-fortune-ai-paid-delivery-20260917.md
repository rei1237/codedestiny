# 인생 총운 전문가 상담 유료 전달 검증 — 2026-09-17

대상은 재검증표 8행 `life-fortune-ai-consultation` 하나다. 활성 진입점은 시작 화면 `app/life-book-ai/LifeBookAiClient.tsx`·결과 화면 `app/life-book-ai/result/LifeBookAiResultClient.tsx` → `worker/routes/life-book-ai.js`의 `/api/life-book-ai/prepare`·`/generate`·`/result` → 장(章)별 생성기다. 같은 파일·같은 UI를 7행(`life-book-ai-consultation`)과 공유하지만 입력(총운 파라미터)·분량(3배, 15장)·가격(300코인/30,000원)이 달라 별도 행으로 완료한다. 인수인계 문서의 지시대로 "공유 컴포넌트라는 이유로 결함이 없다고 가정하지 않는다"를 원칙으로, 7행에서 이미 검증된 부분을 재확인하는 데 그치지 않고 총운 고유 요청 경로를 실제로 실행해 대조했다.

## 발견과 검사 추가

기존 유일한 행동 테스트(`__tests__/ui/life-book-paid-delivery.behavior.test.js`)는 실제 프로덕션 `handleStart`를 TypeScript AST로 추출해 vm 샌드박스에서 그대로 실행하는 구조이지만, 픽스처가 `isLifeFortuneInput: () => false`를 영구 고정 스텁해 왔다. 그 결과 `handleStart`의 총운 전용 사주 완전성 게이트(`hasRequiredLifeFortuneSaju`, `worker/routes/life-book-ai.js:2050` 부근, 호출부 2428~2453행)는 이 테스트 파일이 존재한 이래 단 한 번도 실행된 적이 없었다 — 결제·환불이 걸린 RED 등급 분기가 100% 미검증 상태였다.

| 발견 | 기존 상태 | 이번 조치 |
|---|---|---|
| 총운 사주 완전성 게이트 미검증 | `isLifeFortuneInput`이 항상 false라 게이트 코드가 실행되지 않음 — 불완전 사주로도 생성이 진행되는지, 환불이 정확히 도는지 실측 없음 | 실제 `isLifeFortuneInput`·`hasRequiredLifeFortuneSaju` 함수를 로드해 (a) 구조 불완전 사주(`majorLuck.cycles` 빈 배열) 입력 시 422 `SAJU_CALCULATION_FAILED`·환불 1회·LLM 호출 0회·문서 잔존 0, (b) 완전한 사주 입력 시 정상 202 첫 웨이브(4/15장) 진행·추가 환불 없음을 각각 새 테스트로 검증(`__tests__/ui/life-book-paid-delivery.behavior.test.js`, +38행) |

## 대조 결과 (수정 없음 — 기존 코드가 이미 올바르게 동작함을 처음 실측)

- **게이트 설계 자체의 정확성:** `worker/lib/life-book-ai-saju.js`의 실제 계산기(`calculateLifeBookAiSaju`)가 게이트 요구 필드(pillarDetails, tenGodsByPillar.month, seasonalBalance.monthBranch, natalInteractions, relationSummary, fortuneFacts, interpretationPlan 10개, majorLuck.available===true+cycles, yearlyLuck 5개)를 정상 입력에서 실제로 채우는지 소스 대조로 확인했다. 유일한 이론적 거짓-음성 경로(`buildMajorLuck`이 성별 미상 입력에 `available:false`를 반환)는 `normalizeConsultationInput`의 총운 전용 `gender === "unknown"` 거부 규칙이 계산기 도달 전에 이미 차단함을 확인했다 — 게이트가 우연이 아니라 설계상 서로 맞물려 있다.
- **장애·동시성 메커니즘은 모드 무관:** `reserveProviderCallOnce`·`runWithConcurrency`·`releaseSectionLock`·`saveLifeBookState`·`finishLifeBookDelivery` 전체를 grep한 결과 `isLifeFortuneInput`/`consultationType` 분기가 0건이었다. 7행에서 이미 검증된 락·체크포인트·웨이브 완료·중복 차감 방지 커버리지가 8행에도 코드 수준에서 동일하게 적용됨을 확인했으며 별도 재현은 필요하지 않았다.
- **저장·권한 재확인 경로:** `handleResult`의 `isStoredPaidResultRevoked`(2241행)는 저장된 문서 자신의 `featureKey`를 읽어 판정하므로 모드에 안전하다. `__tests__/fixtures/paid-completed-result-access-fixtures.mjs:7`가 `life-fortune-ai-consultation`을 `life-book-ai-consultation`과 별개의 독립 상품으로 등록하고 있음을 확인했다.
- **가격·카드 노출 등 정적 계약:** 기존 `scripts/verify-life-book-ai-flow.mjs`가 `FEATURE_KEY_PRICE_TABLE["life-fortune-ai-consultation"]`(cost 300/amountKRW 30,000)·`isPerUsePaidFeatureKey`·`FRONTEND_PAID_FEATURE_KEYS`·SKU 카드 `data-feature-key="life-fortune-ai-consultation"` 노출·총운 전용 분량/구조 품질 게이트 경계값(chapter_1_content_too_short, total_content_too_short/long, life_fortune_title_missing, evidence_refs_missing 등)을 이미 포함해 검사하고 있음을 재실행으로 재확인했다(신규 작성 아님).

## A~F mock 근거와 경계

- **A 구매:** `FEATURE_KEY_PRICE_TABLE`(300코인/30,000원) 대조와 `featureKey` 캡처 로직(`worker/routes/life-book-ai.js:2455` 부근, "🔴 실제로 돈이 움직인 SKU" 주석) 코드 대조로 확인했다. 구매 재개/멱등(`findPaidPayment`/`resolveServerAccess`/`billingContractMatches`)은 7행에서 이미 검증된 공유 로직이며 모드 분기가 없어 재검사하지 않았다. 실제 PG는 호출하지 않았다.
- **B 생성:** 신규 saju 완결성 게이트 테스트로 총운 전용 생성 전제조건을 처음 실측했다(위). `verify-life-book-ai-flow.mjs` 재실행으로 총운 전용 분량·구조 경계도 재확인했다.
- **C 장애:** 새로 주입하지 않았다. 위 "장애·동시성 메커니즘은 모드 무관" 코드 대조로 확인하고 기존 테스트 재실행 통과로 재확인했다.
- **D 전달:** 이번 차례에 실제 화면 재현·모바일 뷰포트 검사는 하지 않았다. 결과 화면(`LifeBookAiResultClient.tsx`)은 7행에서 이미 수정된 `pageshow`/`focus` 복구를 공유해 혜택을 받지만, 그 검증은 7행 작업이며 8행에서 별도로 재실행하지 않았다. **D 실화면 증거는 여전히 없다(경계, 5~7행과 동일).**
- **E 저장·권한:** 신규 게이트 테스트가 실패 경로에서 문서 잔존 0(zombie doc 없음)·환불 정확히 1회임을 확인했고, `__tests__/worker/paid-completed-result-access.test.js`(교차 상품, 96/96, 재실행)로 재열람·취소/환불·타 계정 차단을 재확인했다. GET 경로 기준이며 POST 재개 경로의 재확인 제외는 7행 대조 결과와 동일하게 의도된 설계다.
- **F 예산·운영 확인:** 신규 게이트 테스트가 실패 경로에서 LLM 호출 0회(`calls.length === 0`), 성공 경로에서 첫 웨이브 정확히 4회(초과 호출 없음)를 확인해 이 신규 분기에 한해 호출 예산 준수를 실측했다. **총운 15장 전체에 대한 별도 전후 호출 diff 스크립트나 예산 실측은 만들지 않았다(경계, 7행과 동일).**

이번 차례는 총운 전용 사주 완전성 게이트의 미검증 상태를 발견·해소하는 데 집중했다. **8행 A~F 전체 완료를 뜻하지 않으며, D의 실제 화면 증거와 F의 총운 전용 전후 diff는 아직 없다.**실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정 파일(커밋 `f151ee39dd32c6a16499884cf63afebe7de7beb7`, 1개 파일·38행 추가):

- 행동 검사: `__tests__/ui/life-book-paid-delivery.behavior.test.js` — `completeLifeFortuneSaju()` 헬퍼와 신규 `test(...)` 1건 추가.

```bash
# 신규 게이트 검사 (기존 15건 + 신규 1건)
node --test __tests__/ui/life-book-paid-delivery.behavior.test.js

# 총운 전용 정적/구조 검사 재확인 (신규 아님, 재실행으로 재확인)
node scripts/verify-life-book-ai-flow.mjs

# 교차 상품 저장·권한 재확인 (신규 아님, 재실행으로 재확인)
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest __tests__/worker/paid-completed-result-access.test.js --testEnvironment node

npm run check:fast
```

결과: `node --test`는 최초 실행에서 응답 본문 이중 읽기(`Body is unusable`) 자체 결함으로 1건 실패했고, `.json()` 단일 호출로 고쳐 재실행하니 **16 pass / 16 total, 0 fail**(기존 15건 무회귀 + 신규 1건)로 전환됐다. `verify-life-book-ai-flow.mjs`는 PASS. `paid-completed-result-access.test.js`는 **Test Suites: 1 passed, 1 total / Tests: 96 passed, 96 total**(러너를 `node --test`로 잘못 실행해 불명확한 실패를 먼저 겪었고, 파일 자체의 jest pragma를 확인해 올바른 러너로 재실행한 결과다).

`npm run check:fast`는 결제 인접 파일 수정으로 RED 등급 자동 승격되어 전체 게이트로 백그라운드 실행되었다(종료 코드 0). 저장된 로그에 다음이 남아 있다: `verify:staging-llm-mock` PASS, `verify:analytics-events` 통과(11개 계약), `verify:no-nested-retry` 통과(worker 343개 파일), `verify:worker-no-undef` OK(436개 파일, 기지 데드코드 3건 제외), `verify:mongo-reset-callers` PASS, `verify:cron-mongo-op-coverage` 통과(모델 52개·크론 진입점 13개·도달 함수 336개), `verify:admin-route-error-context` OK(관리자 라우트 5개), `build:worker` dry-run 정상(Upload 12096.55 KiB / gzip 3395.42 KiB, 오류 0), `verify:entry-encoding --strict-core` OK, `test:jest` **277 suite·3,880/3,880 통과**(168.9초). 이 러너는 한 단계라도 실패하면 다음 단계로 넘어가지 않는 순차 구조이므로 마지막 단계까지 도달·통과했다는 사실이 앞 단계 전부의 통과를 뒷받침한다.

## 전달

커밋 `f151ee39dd32c6a16499884cf63afebe7de7beb7`(`test(life-book): cover life-fortune saju-completeness gate before generation`)를 `__tests__/ui/life-book-paid-delivery.behavior.test.js` 한 파일만 스테이징해 생성했다(동시 세션의 marketing 미커밋 변경은 건드리지 않음 — 이 커밋이 워크트리 `wt/life-fortune-af-mock-20260917-132205`에서 만들어진 이유이기도 하다). 이어서 이 기록·체크리스트·인수인계 갱신을 담은 문서 커밋 `31ed6264a`를 같은 워크트리에서 추가했다.

병합 시점 `origin/main`이 다른 세션의 `c25e5bbb5`(`fix(payments): allow trailing slash on /api/payments/webhook V2 hook`, 무관한 파일)만큼 앞서 있어 fast-forward 대신 `git merge --no-ff`로 병합했다(머지 커밋 `e68a309c2ca877fbdf884b0f4f3a471a25acf414`). 병합이 건드린 파일은 의도한 4개(신규 테스트·행별 기록·체크리스트·인수인계)뿐이었고, 동시 세션의 marketing 미커밋 84개는 병합 전후 그대로 보존됨을 `git status`로 확인한 뒤 push했다.

검증 SHA `e68a309c2ca877fbdf884b0f4f3a471a25acf414`의 [CI](https://github.com/rei1237/codedestiny/actions/runs/35183457403)는 체크런 21개 중 `CI required`·`Static guards`·`Typecheck and lint`·`Build Pages and Worker`·`Critical checks`·`gitleaks`·`Risk tier`·`Main drift`·`AI locale pipeline invariants`·`Resolve release necessity`·`Queue asynchronous staging release`·`Resolve staging watch scope` 등 13개 success·7개 skipped(비대상 잡)·실패 0을 확인했다. 비동기 `Deploy staging` 1건은 확인 시점 진행 중이었다 — main push 후 자동 배포이며 사용자 요청·릴리스 전 등 명시 조건이 아니므로 완료를 별도로 대기·확인하지 않았다(CLAUDE.md 전달 흐름 절 원칙).
