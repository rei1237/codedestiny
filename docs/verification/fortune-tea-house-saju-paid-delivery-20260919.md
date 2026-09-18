# 운명 찻집 사주 상담 유료 전달 검증 — 2026-09-19

대상은 재검증표 25행(`fortune-tea-house-saju-consultation`, 100코인 / ₩10,000, [`worker/lib/paid-feature-registry.js`](../../worker/lib/paid-feature-registry.js) 243행)이다. 정본은 [`worker/routes/fortune-tea-house.js`](../../worker/routes/fortune-tea-house.js), 화면은 [`src/features/fortune-tea-house/FortuneTeaHousePage.tsx`](../../src/features/fortune-tea-house/FortuneTeaHousePage.tsx)로 23·24행과 같은 라우트다. 깨어남 복구(D축)는 23행 수정을 코드 변경 없이 상속하고, 이번에는 **타로와 갈리는 지점 = 명식(命式) 계산 근거**를 독립 실측했다.

**결론: B축에서 신규 결함 1건을 재현·수정했다.** 유료 사주 상담이 명식이 전혀 없는 상태로 200 완성본까지 나가고 100코인이 확정되는 경로가 살아 있었다. 서버·화면 양쪽에 fail-closed 가드를 넣고 회귀 2건을 추가했다. 커밋 `40a6373d1`(문서 `377b37599`), main 머지 `bee8f8c7e` 의 `CI required` success.

## 축별 판정

| 축 | 판정 | 실측 근거 |
|---|---|---|
| A 구매 | 기존 코드 정상 | featureKey 는 **서버가 요청 모양에서 도출**한다 — `expectedFortuneTeaHouseFeatureKey`(1071~1078행)가 `consultationMode === "saju"` 에서 69행 표의 `fortune-tea-house-saju-consultation` 을 돌려주고, `resolveFortuneTeaHouseFeatureKey`(1080~1089행)가 본문·`payment`·`_paymentContext` 의 명시 키와 도출값이 다르면 빈 문자열로 떨어뜨려 거부한다. 가격표 정본 [`consultPricing.ts`](../../src/features/fortune-tea-house/data/consultPricing.ts) 22행 ↔ 레지스트리 243행(100코인·₩10,000) 일치, 허용 키 배열 483행 등재 |
| B 생성 | 🔴 **결함 재현·수정** | 아래 "재현한 결함" 절. 명식이 닫힌 초안(또는 초안 없음)으로도 상담문이 완주했다. 한편 **명식 보존** 자체는 살아 있는 2중 가드다 — `pickTeaCheckpointFields` 허용목록과 `mergeLlmResult` 의 명시 보존(4031행 프롬프트 계약: `dayMaster/pillars/fiveElements/primaryTenGod/tenGodSnapshot preserve`)이 LLM 이 계산값을 덮어쓰지 못하게 막는다 |
| C 장애 | 구조적으로 무결함 | 23행과 동일한 **후불 과금**이다. `apply`(5549행)는 생성·저장이 모두 성공한 뒤에만 서버 도출 `access.featureKey`/`access.pricing` 으로 1회 돌고, 실패 경로는 `markFortuneTeaHouseGenerationFailed`(4525행) → `cancel`(5496행)로 예약을 되돌린다. 모드 분기가 없다 |
| D 전달 | 23행 수정 상속(코드 변경 없음) | `probeFortuneTeaPending`·깨어남 effect 는 모드 분기가 없다. 복구 시 사주 입력이 살아남는 것도 실측했다 — `/pending`(4767행)이 `requestPayload: state.requestBody` 를 돌려주고, 저장 시(4200행) 토큰류 키만 제거하므로 `consultationMode`·생년월일·`calendarType`·`draftResult`(명식 포함)가 그대로 복원된다. 즉 깨어난 탭의 재제출도 명식을 유지한 채 같은 100코인 경로로 간다 |
| E 저장·권한 | 기존 코드 정상 | 교차상품 fixture [`paid-completed-result-access-fixtures.mjs`](../../__tests__/fixtures/paid-completed-result-access-fixtures.mjs) 19행에 이 키가 등록돼 있고 해당 스위트가 통과한다. 저장본 GET 경로에 LLM 호출이 없다 |
| F 예산 | 기존 코드 정상 | `buildTeaCheckpointGroups`(4153행)가 사주에서 **15그룹**(요약 1 + 9섹션 + 공통 5)을 만들고 POST 당 최대 4그룹이라 **4회 POST / LLM 16회**로 완주한다(실측). 그 4회는 재과금이 아니다 — 앞선 3회는 202 부분 응답이고 `apply` 는 마지막 저장 성공 뒤 1회뿐이다. 같은 `attemptId` 재POST 는 `cached: true` 로 돌아온다 |
| 🟡 "품질 게이트 전량 모킹" 함정 | **해당 없음** | 스위트가 실제 `handleFortuneTeaHouseRoutes` 에 POST 하고 모킹은 인프라 경계(auth/db/billing/gemini)뿐임을 재확인 |

## 재현한 결함 — 명식 없는 100코인 상담문

### 증상

`consultationMode: "saju"` 요청에 `draftResult` 가 없거나 `draftResult.saju.available === false` 이면, 라우트는 그대로 생성에 들어가 **HTTP 200 · `generationMeta.mode: "gemini"` · degraded 아님**으로 완성본을 돌려주고 100코인을 확정했다. 그 리포트에는 `pillars`·`dayMaster`·`fiveElements`·대운이 전부 없고, `tenGodSnapshot` 은 `{ available: false, reason: "사주 초안이 전달되지 않았습니다.", source: "unavailable" }`(2636행)였다. ₩10,000 짜리 사주 상담이 **계산 근거 0** 으로 배달된 것이다.

### 왜 기존 게이트가 못 잡았나

- 명식 계산은 **클라이언트에만** 있다. 서버의 `buildMinimalDraft`(2509행)는 명식을 계산하지 않고 `available: false` 자리표시자를 채운다.
- 품질 게이트 `assertSajuDeepQuality`(3133행)는 9개 섹션·`SAJU_MIN_RESULT_CHARS`(48행, 10,000자)·공통 20,000자 하한(4236행)까지 보지만, 계산 근거는 **낱말 대조**로만 본다 — `["일간","오행","십성"]` 중 2개 이상 포함(3163행)과 `/현재 운|운의 흐름|대운|세운|월운/`(3167행). LLM 은 명식이 없어도 이 낱말들을 자연스럽게 쓰므로 전부 통과한다.
- 즉 "긴 글이면 통과"에 가까운 상태였고, 계산 근거의 존재는 아무도 확인하지 않았다.

### 도달 경로를 실측했다(가정 아님)

화면 쪽 명식 계산은 **3중 catch** 로 조용히 닫힌다 — [`sajuAdapter.ts`](../../src/features/fortune-tea-house/lib/sajuAdapter.ts) `snapshotFromNormalizedBirth`(523~570행)가 `buildSajuProfile` 예외를 `{ available:false, caution:"사주 계산이 잠시 흐려져…" }` 로 흡수하고, [`buildConsultResult.ts`](../../src/features/fortune-tea-house/lib/buildConsultResult.ts) 의 `safeBuildSajuSnapshot`(641~647행)·`safeBuildSajuSection`(649~655행)이 한 겹씩 더 감싼다. 사용자에게는 오류가 뜨지 않는다.

그리고 생년월일 입력은 **양력 기준으로만** 검증된다 — [`lib/birthDateInput.ts`](../../src/features/fortune-tea-house/lib/birthDateInput.ts) 는 `YYYY-MM-DD` 자유입력을 그레고리력 `Date` 왕복으로만 확인하고, `parseBirthDate`(220~231행)도 월과 무관하게 일 ≤ 31 을 받는다. 음력에는 없는 날짜(작은달 30일 등)가 그대로 통과한다.

`buildSajuProfile`(`worker/lib/destiny-bias-engine.js`)을 직접 호출해 격자 조사했다.

| 격자 | 음력 예외 | 양력 예외 |
|---|---|---|
| 1960~2005년 · 전월 · 28·29·30일 (각 1,656건) | **251건 = 15.2%** (`korean-calendar core cannot convert lunar Y-M-D`) | **0건** |
| 1900~2100년 유효해 보이는 조합 2,010건 | **82건** (예: 1900.11.30 · 2099.11.30 · 2100.12.29) | 0건 |

즉 음력을 고른 사용자가 "그 달에 없는 30일" 을 입력하면 **아무 경고 없이** 100코인을 내고 명식 없는 리포트를 받았다. 실사용 도달 가능 경로다. (입력 자체가 비어 있는 경우는 [`QuestionInputScene.tsx:748`](../../src/features/fortune-tea-house/components/QuestionInputScene.tsx#L748) 이 이미 제출을 막으므로 해당 경로가 아니다.)

### 수정

fail-closed 2겹(원칙 10). 화면에서 먼저 멈추고, 직접 API 호출까지 서버가 막는다.

1. **서버** — `assertSajuCalculationBasis`(5401행)를 생성 진입 직전 첫 문장(5477행)에서 호출한다. `consultationMode === "saju"` 이고 `draft.saju.available !== true` 면 `status 422` / `code FORTUNE_TEA_HOUSE_SAJU_BASIS_MISSING` 으로 던진다. 여기서 던지면 **기존 실패 경로가 그대로 이어져** 실행 기록 정리(4525행)와 deferred `cancel`(5496행, 예약 해제)까지 돌고, 바깥 catch 가 `error.status` 를 422 JSON 으로 바꾼다. `apply` 는 저장 성공 뒤에만 있으므로 **차감이 확정되지 않는다**.
2. **화면** — 초안을 만든 직후, `localPreviewResult` 대입 **앞**(1090~1094행)에서 같은 조건을 확인해 던진다. 이 위치가 중요하다 — 대입 뒤였다면 catch 의 로컬 프리뷰 분기가 이 오류를 삼켜 가짜 성공으로 만들었다. 지금은 `setSubmitError` + `goToStage("questionInput")` 로 흘러, **결제창을 열기 전에** 날짜를 다시 받는다.

### 가드 강도를 `available === true` 로 한정한 이유

`dayMaster`·`pillars` 같은 개별 필드까지 단언하려 했으나, 기존 정상 테스트들이 최소 초안(`{ available: true }` 만 있거나, 실제 화면이 만드는 배열이 아닌 객체 모양 `pillars`)을 쓰고 있어 타이밍 해석 계열 테스트가 깨진다. 결함의 본질은 "계산이 닫혔다"이고 그 신호가 `available` 이므로, 실측으로 뒷받침되는 최소 조건만 조였다. 필드 단위 강화는 초안 계약을 함께 정리해야 하는 별도 과제다.

**`sajuCompatibility` 는 의도적으로 제외했다.** 그 모드의 초안 모양(최상위 `birthDate` 인지 `sajuCompatibility.user.birthDate` 인지)을 이번에 실측하지 않았으므로 같은 가드를 확장하면 오차단 위험이 있다. 26행에서 같은 결함이 성립하는지 확인하고 닫아야 한다 — **현재는 fail-open 인 채로 인계**한다.

## 가드 변이 검증 — 도는 가드인가, 무는 가드인가

| 변이 | 기대 | 결과 |
|---|---|---|
| `assertSajuCalculationBasis` 본문 첫 줄에 `if (true) return;` 삽입 | 신규 2건만 실패 | **물림** — 정확히 신규 2건만 실패(422/`ok:false` 기대 자리에 202/`ok:true`), 나머지 전 스위트는 그대로 통과 |

🔴 변이 원복 시 `git checkout <파일>` 을 쓰면 **같은 파일에 있던 실제 수정까지 통째로 날아간다**(이번에 한 번 겪고 grep 으로 감지·복구했다). 변이는 넣을 때와 같은 방식의 국소 편집으로 되돌린다.

## 신규 회귀

[`__tests__/worker/fortune-tea-house-saju-timing.test.js`](../../__tests__/worker/fortune-tea-house-saju-timing.test.js) 에 "운명 찻집 사주 — 명식 계산 근거" 2건을 추가했다. 초안 없음 / 명식 닫힘 각각에서 **422 · `ok:false` · 메시지에 "사주 명식" 포함 · `callGeminiText` 호출 0회**를 단언한다(생성 전에 멈춘다는 증명).

가드 도입에 맞춰 기존 하네스 2곳의 초안을 실제 화면 산출물과 같게 고쳤다(테스트 약화가 아니라 사실 정합).

- [`fortune-tea-house-honey-drops.test.js`](../../__tests__/worker/fortune-tea-house-honey-drops.test.js) — 사주 모드 본문에 `draftResult: { consultationMode:"saju", saju:{ available:true } }`
- [`fortune-tea-house-recovery.behavior.test.js`](../../__tests__/ui/fortune-tea-house-recovery.behavior.test.js) — `buildFortuneTeaHouseConsultResult` 스텁이 `saju: { available: true }` 를 포함

## 측정

- `npm run test:jest -- --testPathPatterns fortune-tea-house` → **6스위트 118/118**
- `npm run test:jest`(전체) → **281스위트 3,970건**
- 찻집 화면 `node --test` 8파일 → **50/50**
- `npm run sitemap:generate` → 1,282 URL, 원장 786(유지 785 / 갱신 1) — `.tsx` 수정과 동일 커밋에 포함
- `npm run sync:public` → exit 0, 추가 변경 파일 없음
- `npm run check:fast` → **exit 0**, RED 승격 확인(lint·lint-changed·typecheck 레인 + verify-checkout-pass-card / verify-paid-feature-billing-policy / verify-ai-prompt-billing-policy / verify:pass-recovery-path / verify:ai-consultation-flows / verify:staging-llm-mock / verify:analytics-events / verify:no-nested-retry / verify:worker-no-undef / verify:mongo-reset-callers / verify:cron-mongo-op-coverage / build:worker / verify:entry-encoding / test:jest 전부 PASS)
- 🔴 워크트리에서는 `npx jest` 금지 — `npm run test:jest --`(`scripts/run-mock-tests.mjs`)로만 돌린다

## 범위 밖 관측 (보고만, 수정하지 않음)

1. **24행 검증 문서의 POST 횟수 기재가 실측과 다르다.** "3카드는 1회 POST, 5카드는 2회" 로 적혀 있으나 이번 실측은 **타로 3카드 = 3회 POST / LLM 9회**, **타로 5카드 = 3회 POST / LLM 11회**, **사주 = 4회 POST / LLM 16회** 다. 체크포인트 그룹이 카드당 1개가 아니라 공통 그룹을 함께 포함하기 때문이다. 해당 문서와 재검증표 24행 칸을 이번에 정정했다(과금 결론 자체는 `apply` 1회로 동일해 영향 없음).
2. **품질 게이트가 계산 근거를 낱말로만 본다**(3163·3167행). 이번 가드로 "명식이 아예 없는" 경우는 막혔지만, 명식이 있는데 LLM 이 그 값과 무관한 서술을 해도 게이트는 통과한다. 값 대조 게이트는 별도 과제다.

## 남은 위험

- **D 실화면 증거 없음(경계).** 사주 4회 POST(202×3 → 200)를 실제 브라우저에서 눈으로 확인하지 않았다. 워커·화면 테스트 대조까지다.
- **`sajuCompatibility`(26행)는 같은 결함에 대해 fail-open 상태다.** 26행에서 초안 모양을 실측하고 닫아야 한다.
