# 균일가와 라이트 운세 이용권 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일반 상품을 3,000~5,000원으로 맞추고, 모든 활성 이용권에서 라이트 운세를 한도 차감 없이 열며, 이용권을 새 가격(v5)으로 판매하고 그 혜택을 화면에 강조한다.

**Architecture:** 라이트 운세 판정은 서버의 상품 분류 하나로 결정하고, 기존 `budgetApplies:false` 분기를 재사용해 누적 한도만 면제한다. 소진은 이용권 종료가 아니라 "LLM만 차단"으로 바뀌며, 재구매 때만 새 이용권처럼 시작한다. 가격은 정책 버전 v5로 분리해 지난 주문과 Play 등록가를 보존한다.

**Tech Stack:** Cloudflare Worker(JS), Next.js(TS/JSX), 레거시 클래식 스크립트(`js/`), Jest(`node scripts/run-mock-tests.mjs jest --runTestsByPath <파일>`), `npm run verify:*`, `npm run check:payment`.

**Spec:** `docs/superpowers/specs/2026-11-04-pass-flat-pricing-design.md`

## Global Constraints

- 작업 위치: 워크트리 `D:\Development\codedestiny-worktrees\pass-flat-pricing-20261104`, 브랜치 `wt/pass-flat-pricing-20261104`. 푸시·배포는 사용자 요청 때만 한다.
- 고객 문구에 "LLM", "비 LLM", "AI 미사용"을 쓰지 않는다. 고객 표현은 "라이트 운세"다.
- 가격 인상 전 금액을 취소선이나 "인상 전 마지막 기회" 문구로 쓰지 않는다. 취소선은 단건 합계 비교에만 쓴다.
- 이용권 가격: 작은 14,900 / 중간 34,900 / 큰 64,900 / 패밀리 154,000원. 한도·건당 상한·프로필 수는 v4와 같다.
- 새 정책 버전은 `flower-20261104`, planId는 `{tier}_1m_v5`, 앱 SKU는 `cd_pass_{tier}_30d_v5`다. 패밀리는 웹 전용이다.
- 변경 금지: `LEGACY_UNLOCK_PRODUCTS_65DE451`, `PASS_MONTHLY_WON`, `PAID_REPORT_MIN_BODY_CHARS`(20,000), `marketing/campaigns/`, 찻집·3만 원 이상 상담·영냥이 가격, 월정석 최소 금액, 음악 트랙.
- 라이트 표시가 없는 상품은 LLM으로 보고 차감한다. 확인되지 않으면 항상 차감 쪽이다.
- 유료 LLM 분량은 목표다. 결제 뒤 전달 성공이 우선이므로 분량을 낮출 때 전달 하한도 함께 낮춘다.
- 이미 `expiresAt`이 지난 이용권은 되살리지 않는다.
- 표시 금액은 빌드 때 계산한다. 332,000원과 74종은 감사 전 값이므로 코드나 테스트 기준값에 직접 적지 않고 생성 파일에서 읽는다.
- 범위 밖 버그는 고치지 말고 최종 보고에 적는다(스펙 11절).
- 각 Task 끝에 커밋한다. 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`을 붙인다.

## Review Focus

1. 소진 이용권 사용자가 라이트 상품을 누른다 → 결제창이 아니라 서버 호출로 열린다. 서버는 `passEnded`를 보내지 않아 다음 클릭도 같다. (Task 8, Task 9)
2. `paymentMode` 없는 옛 coin-gate 요청으로 라이트 상품을 연다 → 한도를 차감하지 않고, 소진이어도 통과하며, 이용권을 닫지 않고, 환불 판단용 증빙을 남긴다. (Task 7)
3. 라이트 상품 생성이 실패해 서비스 실행 환불이 돈다 → `monthlySpendCoin`이 줄지 않아 공짜 한도가 생기지 않는다. (Task 6)
4. 소진된 v2·v3 이용권 보유자가 하위 등급을 사거나 선물을 받는다 → `PASS_POLICY_CONFLICT`·`DOWNGRADE_BLOCKED` 없이 사용액 0으로 시작한다. (Task 8)
5. 같은 라이트 요청을 동시에 두 번 보내고 재시도한다 → 카운터는 그대로이고 증빙은 한 건이다. 그 증빙이 있는 이용권 주문은 셀프 취소가 막힌다. (Task 6, Task 10)

---

## 묶음 ① 가격과 분량

### Task 1: 라이트 운세 분류 감사와 정본

**Files:**
- Create: `worker/lib/light-fortune-catalog.js`
- Create: `docs/superpowers/specs/2026-11-04-light-fortune-audit.md`
- Modify: `worker/payments/catalog.js:79` (`resolveProduct` 반환)
- Test: `__tests__/worker/light-fortune-catalog.test.js`

**Interfaces:**
- Produces: `LIGHT_FORTUNE_FEATURE_KEYS: readonly string[]`, `LIGHT_FORTUNE_UNLOCK_ONLY_KEYS: readonly string[]`(감사를 통과한 해금 전용 키, 앞 목록의 부분집합), `LIGHT_FORTUNE_AUDIT_EXCLUDED_KEYS: Readonly<Record<string,string>>`(제외 키 → 사유), `isLightFortuneFeatureKey(featureKey: unknown): boolean`(`normalizePaidFeatureKey` 적용 후 판정), `resolveProduct(input).lightFortune: boolean`.

- [ ] **Step 1: 감사 수행과 기록.** 대상은 `buildPaidDeliveryInventory()`의 `deliveryKind==='deterministic'` 상품과 스펙 5.1의 해금 전용 14종이다. 상품별로 라우트에서 import 경로까지 따라가 `callGemini|generateContent|callLlm|callLLM|runLlm|callVision|createChatCompletion` 호출을 찾는다. 파일 단위가 아니라 **이 상품의 결제 뒤 실행 경로**로 판단한다. 다음 라우트 파일에는 LLM 호출이 있으므로 같은 파일의 라이트 후보를 반드시 경로로 구분한다: `worker/routes/animal-totem.js`, `destiny-compass.js`, `destiny-compass-ai.js`, `nakshatra-ai.js`, `worker/lib/guardian-fortune-llm.js`. 결과를 감사 문서에 `| featureKey | 판매 여부 | 실행 경로 | 판정 | 근거 파일:행 |` 표로 남긴다.
- [ ] **Step 2: 판정 규칙 적용.** 경로를 확인하지 못한 상품은 LLM이다. 후보였다가 LLM으로 판명된 상품의 가격은 스펙 5.2의 LLM 규칙을 따른다(7천~1만 원이면 5,000원). 2만 원 이상 후보가 LLM으로 판명되면 가격을 내리지 말고 최종 보고에 "사용자 결정 필요"로 적는다.
- [ ] **Step 3: 실패 테스트 작성.** 다음 이름과 단언으로 쓴다.
  - `every light key is a deterministic product`: 각 키의 인벤토리 `deliveryKind`가 `deterministic`이거나 키가 `LIGHT_FORTUNE_UNLOCK_ONLY_KEYS`에 있다.
  - `no deterministic product is left out`: 인벤토리 deterministic 키 집합에서 `LIGHT_FORTUNE_AUDIT_EXCLUDED_KEYS`를 빼고 `LIGHT_FORTUNE_UNLOCK_ONLY_KEYS`를 더한 값이 `LIGHT_FORTUNE_FEATURE_KEYS`와 같다. 판매 종료(`historical`)와 미사용(`registry-only`) 키는 제외 목록에 사유와 함께 넣는다.
  - `resolveProduct flags only light products`: 라이트 예 `rpt_quantumCard`는 `lightFortune:true`, `tarot-celestial-harmony`와 표시 없는 임의 상품은 `false`.
  - `alias keys resolve through normalizePaidFeatureKey`.
- [ ] **Step 4: 실패 확인.** Run: `node scripts/run-mock-tests.mjs jest --runTestsByPath __tests__/worker/light-fortune-catalog.test.js` → FAIL(모듈 없음).
- [ ] **Step 5: 구현.** 목록은 레지스트리 파일이 아닌 `light-fortune-catalog.js`에 둔다. 클라이언트 미러와 표시 생성의 원본이 되어야 하기 때문이다. `resolveProduct` 반환 끝에 `lightFortune: isLightFortuneFeatureKey(featureKey)`를 더한다.
- [ ] **Step 6: 통과 확인.** 같은 명령 → PASS. `__tests__/worker`의 `paid-delivery-inventory`, `paid-non-llm-delivery`도 통과.
- [ ] **Step 7: 커밋.** `feat(pass): 라이트 운세 분류 감사와 정본 목록`

### Task 2: 상품 가격 인하와 복제본

**Files:**
- Modify: `worker/lib/paid-feature-registry.js` (`FEATURE_KEY_PRICE_TABLE` L416~, `RAW_PIG_COIN_UNLOCK_PRODUCTS` L487-518)
- Modify: 스펙 5.4의 서버 하드코딩·프론트 상수·표시·문서 파일 전부
- Test: `__tests__/worker/light-fortune-catalog.test.js`, 기존 가드 기준값

**Interfaces:**
- Consumes: `LIGHT_FORTUNE_FEATURE_KEYS`(Task 1).
- Produces: 라이트 전 상품 가격 ≤ 5,000원. Task 6의 건당 상한 유지 근거다.

- [ ] **Step 1: 실패 테스트 추가.**
  - `light products cost at most 5000 KRW and only the three keep 1000`: 1,000원 키는 정확히 `rpt_specialCharmCard`, `rpt_skillTreeCard`, `fun.quantumLotto.ritualReport`이고 나머지는 3,000 또는 5,000.
  - `lowered LLM products cost 5000`: 스펙 5.2 LLM 행 13종의 `amountKRW===5000`, `cost===50`.
  - `excluded products keep their price`: 찻집, `ziwei-deep-pdf`, `fusion-fortune-consultation`, `master-love-codex*`, `heukwol-warning-consultation`, `neo-email-consultation`, `premium-naming-prompt`, 영냥이 키가 변경 전 값과 같다(기준값은 변경 전 레지스트리에서 복사).
- [ ] **Step 2: 실패 확인.** 같은 파일 실행 → FAIL.
- [ ] **Step 3: 레지스트리 수정.** 스펙 5.2 표대로 `cost`와 `amountKRW`를 함께 바꾼다. `travelDestiny`, `section_*`는 Task 1에서 통과한 경우에만 내린다. `premium_divination_pack`은 판매 진입로가 있으면 5,000원, 없으면 그대로 두고 감사 문서에 근거를 적는다.
- [ ] **Step 4: 복제본 수정.** 스펙 5.4 목록을 `git grep`으로 main 기준 재검색해 고친다. `worker/lib/honey-unlock-catalog.js`, `review-product-catalog.js`는 자동 반영 여부만 확인한다. 의도한 가격 개정이므로 가드 기준값을 함께 옮긴다.
- [ ] **Step 5: 통과 확인.** Run: `npm run verify:paid-gate-price-coverage && npm run verify:i18n-price-drift && npm run verify:payment-policy-md && npm run verify:krw-copy-canonical`, 그리고 `node scripts/run-mock-tests.mjs jest __tests__/worker/light-fortune-catalog __tests__/.*per-use-price-registry-parity __tests__/.*discovery-prices`. 모두 PASS.
- [ ] **Step 6: 커밋.** `feat(pricing): 일반 상품 5천 원 이하 균일가`

### Task 3: 천체의 선율 분량 축소

**Files:**
- Modify: `worker/lib/celestial-report-delivery.js` (L37, L69-70, L79), 천체 프롬프트, `worker/lib/tarot-oracle-delivery.js` L16-17 주석
- Modify: `celestial-harmony.html`과 상품 안내의 분량 표기
- Test: `__tests__/worker/celestial-paid-delivery.test.js`, `celestial-melody-reading.quality.test.js`

**Interfaces:**
- Produces: `tarot-oracle-delivery`의 `CARD_BUDGET[50]`은 가격 변경으로 자동 적용되므로 값은 바꾸지 않는다.

- [ ] **Step 1: 실패 테스트 추가.**
  - `accepts a report with 11 cards at 120-char fields`: 카드 11장, 6필드 각 120자인 결과가 품질 판정을 통과하고 전달된다.
  - `rejects a field under 120 chars with a repair, not a refund`: 119자 필드는 기존 복구 흐름을 탄다.
  - `prompt asks for 130-150 chars per field`: 프롬프트에 옛 500자 지시가 없다.
- [ ] **Step 2: 실패 확인.** Run: `node scripts/run-mock-tests.mjs jest --runTestsByPath __tests__/worker/celestial-paid-delivery.test.js` → FAIL.
- [ ] **Step 3: 구현.** 11장 유지, 필드 최소 120자, 목표 130~150자, 종합은 합계 약 12,000자에 맞춘다. 체크포인트 호환을 위해 섹션 키는 유지한다. `maxOutputTokens`는 11,000에서 7,000으로 낮춘다. 잘리면 전달이 실패하므로 분량 감소 비율만큼 낮추지 않고 여유를 둔다.
- [ ] **Step 4: 통과 확인.** 위 두 테스트 파일과 `npm run verify:llm-generation-resilience` → PASS.
- [ ] **Step 5: 커밋.** `feat(celestial): 천체의 선율 12,000자로 축소`

### Task 4: 나머지 LLM 상품 분량 축소

**Files:**
- Modify: `worker/lib/feature-question-delivery.js:67`, `worker/lib/saju-ai-prompt.js`, `worker/lib/human-design-report-contract.js`, `worker/lib/destiny-compass-report-contract.js`, `worker/routes/relationship-boundary-test.js:161`, `worker/lib/saju-compat-schema.js`, `worker/lib/palm-result-delivery.js`, 각 상품 안내 문구
- Test: `__tests__/worker/` `feature-question-paid-delivery`, `feature-question-quality`, `human-design-paid-delivery`, `destiny-compass-paid-delivery`, `relationship-boundary-test.route`, `palm-paid-delivery`

**Interfaces:**
- Produces: `SAJU_AI_MIN_RESULT_CHARS = 12000`. 더 이상 `PAID_REPORT_MIN_BODY_CHARS`를 참조하지 않는다.

- [ ] **Step 1: 실패 테스트 추가.** 상품별로 `<상품> delivers a result at the new target` 하나를 쓴다. 기준값:

  | 상품 | 입력 |
  | --- | --- |
  | 전문가 상담 4종 | 10부 × 1,200자 |
  | 사주 AI 질문 | 5그룹 × 2,400자 |
  | 휴먼 디자인 | 18섹션 합계 12,000자, `HD_REPORT_TARGET_CHARS === 12000` |
  | 운명의 지도 심층 | 10섹션 × 1,200자 |
  | 바람끼 테스트 | 5장면 × 2,200자 |

- [ ] **Step 2: 실패 확인.** 해당 테스트 실행 → FAIL.
- [ ] **Step 3: 구현.** 표의 값으로 목표와 전달 하한을 함께 낮춘다. 섹션과 키는 유지한다. 사주 궁합과 손금은 현재 합계를 재서, 궁합은 약 12,000자로 조정하고 손금은 12,000자를 넘을 때만 줄인다. 옛 분량 표기("2만 자", "25,000자")를 `git grep`으로 찾아 고친다.
- [ ] **Step 4: 통과 확인.** 위 테스트와 `npm run verify:llm-generation-resilience` → PASS. `PAID_REPORT_MIN_BODY_CHARS`가 20,000 그대로인지 확인한다.
- [ ] **Step 5: 커밋.** `feat(llm): 5천 원 상담 분량 약 12,000자로 조정`

## 묶음 ② 이용권 규칙

Task 5~10은 Task 11~13과 같은 배포로 나간다. 먼저 내보내지 않는다.

### Task 5: v5 정책과 가격 사본

**Files:**
- Modify: `lib/payment/pass-policy.js`, `worker/payments/passes.js:48-70,192`, `worker/lib/profile-limits.js:113-132`, `worker/lib/app-store-pricing.js:79-88`, `worker/lib/payment-product-name.js`, `worker/payments/index.js:413`, `app/points/PointsClient.tsx:21-22,753`
- Modify: 스펙 6.5 "가격 사본" 전부, `scripts/verify-pass-tier-policy.mjs:215-230`(13→16개 SKU)
- Test: Create `__tests__/worker/pass-policy-v5.test.js`; Modify `pass-policy-v4.test.js`

**Interfaces:**
- Produces: `CURRENT_PASS_POLICY_VERSION === "flower-20261104"`, `V4_PASS_POLICY_VERSION === "flower-20260930"`, `V4_PASS_PLANS`, `v4PassPlan(tier)`. `CURRENT_PASS_PLANS`는 v5다. `isPassPolicyMix(prior, nextVersion, now)`는 v4↔v5에서 `false`다.

- [ ] **Step 1: 실패 테스트 작성.** `pass-policy-v5.test.js`:
  - `test.each`로 `[standard,14900,200,50]`, `[premium,34900,600,100]`, `[vvip,64900,1200,300]`, `[family,154000,3500,999999999]`의 가격·한도·상한을 단언한다.
  - `v4 plan keeps 9900/29900/59900/149000`.
  - `old v4 order still verifies and a 14900 amount on it drifts`: `hasPassDrift` 경로.
  - `new web order cannot pick a v4 plan`: `assertPassSaleAllowed` 거부.
  - `v5 play sale fails closed until approved`: 승인 목록이 v4인 동안 `googlePlay` 판매는 `PASS_SALE_NOT_READY`.
  - `v4 holder can extend and upgrade on v5`: `isPassPolicyMix` false, 활성화 뒤 사용액 유지, 같은 등급은 한도 누적.
  - `v3 holder with budget left is still blocked`: mix true.
- [ ] **Step 2: 실패 확인.** Run: `node scripts/run-mock-tests.mjs jest --runTestsByPath __tests__/worker/pass-policy-v5.test.js` → FAIL.
- [ ] **Step 3: 정책 구현.** v5 추가와 버전 사다리 확장을 위 파일에 적용한다. `pass-policy-v4.test.js`는 `currentPassPlan` 대신 `v4PassPlan`을 보게 옮긴다. `CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS`는 **v4 그대로 둔다**(Play 등록 뒤 Task 14에서 변경).
- [ ] **Step 4: 가격 사본 수정.** `index.html`과 `public/` 셸의 `data-cd-play-*`, `i18n/authored/passPricing-01.json`, `shellCopy-04.json`, `public/i18n/*.json`, `scripts/verify-*`, `create-play-console-products.mjs`의 `PASS_LISTINGS`, `export-play-localized-listings.mjs`, 픽스처, `tests/integration/gifts.replica.integration.js`. `marketing/campaigns/`는 건드리지 않는다. `index.html`의 `goldenPackages` 큰 꿀단지는 59,000에서 64,900으로 옮긴다. 옛 불일치가 함께 사라지므로 최종 보고에 그 사실만 적는다.
- [ ] **Step 5: 통과 확인.** Run: `npm run verify:pass-tier-policy && npm run verify:app-store-pricing && npm run verify:billing-pass-policy && npm run verify:i18n-price-drift && npm run verify:krw-copy-canonical`, 그리고 `pass-policy-v5`, `pass-policy-v4`, `pass-policy-v2`, `payments.subscription-purchase` 테스트. 모두 PASS.
- [ ] **Step 6: 커밋.** `feat(pass): 이용권 v5 가격 정책과 판매 사본`

### Task 6: 서버 라이트 운세 판정

**Files:**
- Modify: `worker/payments/passes.js:403-435,463-505,660`, `worker/lib/pass-consumption.js:166,273`, `worker/payments/index.js:1761,1769,1814,1830`
- Test: Create `__tests__/worker/pass-light-fortune.test.js`; Modify `pass-consumption.refund.test.js`

**Interfaces:**
- Consumes: `isLightFortuneFeatureKey`, `resolveProduct(...).lightFortune`(Task 1).
- Produces: `evaluatePassCoverage({user, entitlement, coinCost, lightFortune = false})`. 라이트면 `{budgetApplies:false, remainingCoin: max(0, budgetCoin-usedCoin)}`이고 건당 상한은 유지한다. PointHistory 증빙 `metadata.passBudgetExempt: true`.

- [ ] **Step 1: 실패 테스트 작성.**
  - `test.each(tiers)('%s light product is covered without touching budget')`: `monthlySpendCoin`, `premiumUseCount`가 변하지 않고 `coversNow`이다.
  - `exhausted pass still covers light and blocks LLM`: 같은 사용자에서 라이트는 통과, 50코인 LLM은 `monthly_pass_limit_exceeded`.
  - `missing lightFortune flag charges budget`.
  - `light product over the per-use cap is still rejected`: 상한을 넘는 가상 입력이 건당 상한으로 거부된다.
  - `remainingCoin reports the real remainder`.
  - `describePassEligibility quotes deductKRW 0 for light`.
  - `pass-check per-use and unlock paths exempt light`: `payments-v2.pass-check` 방식.
  - `evidence has passBudgetExempt and monthlySpendUsed equals usedCoin`.
  - `concurrent and retried light requests leave one evidence row and no counter change` (Review Focus 5).
  - `refundPassCoverage skips a light source` (Review Focus 3): `sourceFeatureKey`가 라이트면 `{refunded:false, skipped:true, reason:'PASS_BUDGET_EXEMPT'}`이고 카운터가 그대로다.
- [ ] **Step 2: 실패 확인.** Run: `node scripts/run-mock-tests.mjs jest --runTestsByPath __tests__/worker/pass-light-fortune.test.js` → FAIL.
- [ ] **Step 3: 구현.** `evaluatePassCoverage`에 플래그를 추가하고 `consumePassForFeature`(featureKey로 판정), pass-check(product의 `lightFortune`), `describePassEligibility`에 전달한다. `consumeYeongnyangiFamily`는 전달하지 않는다. `refundPassCoverage` 맨 앞에 라이트 건너뛰기를 넣는다. `worker/routes/fortune-tea-house.js:4992`, `fortune.js:4720,5720,5975`, `yeongnyangi/repository.js:783`은 라이트 상품을 다루지 않는지 확인하고, 다루는 곳은 `sourceFeatureKey`를 넘긴다.
- [ ] **Step 4: 통과 확인.** 새 테스트와 `pass-budget-hard-gate`, `payments-v2.pass-check`, `pass-consumption.refund`, `service-execution-pass-quota-refund`, `premium-pass-settlement` → PASS.
- [ ] **Step 5: 커밋.** `feat(pass): 라이트 운세 누적 한도 면제`

### Task 7: 옛 coin-gate 경로 면제

**Files:**
- Modify: `worker/lib/profile-limits.js:341`, `worker/routes/billing.js:668,783,824,872,1034,2019,3994`, `worker/lib/entitlement-policy.js:296`
- Test: Modify `__tests__/worker/billing.pass-first-gate.test.js`

**Interfaces:**
- Consumes: `isLightFortuneFeatureKey`.
- Produces: `resolveMonthlySpendQuota(sub, entitlement, coinCost, {lightFortune = false} = {})`. 라이트면 `{applies:false, used, remaining}`이고 실제 값을 돌려준다.

- [ ] **Step 1: 실패 테스트 추가.** (Review Focus 2)
  - `legacy gate opens light with exhausted budget and no spend increment`.
  - `legacy gate still blocks LLM with exhausted budget`.
  - `pre-check and consume agree for light`: L1034 사전 판정과 L783 소비의 답이 같다.
  - `entitlement policy does not raise MONTHLY_PASS_LIMIT_EXCEEDED for light`.
  - `legacy gate leaves a non-family light evidence row with passBudgetExempt`.
- [ ] **Step 2: 실패 확인.** Run: `node scripts/run-mock-tests.mjs jest --runTestsByPath __tests__/worker/billing.pass-first-gate.test.js` → FAIL.
- [ ] **Step 3: 구현.** 세 호출부에 옵션을 전달한다. `recordPassAccessIfNeeded`(L2019)가 비패밀리 라이트 사용에도 증빙을 남기게 한다. 이 경로의 증빙이 없으면 Task 10이 사용 이력을 놓친다.
- [ ] **Step 4: 통과 확인.** 위 테스트, `npm run verify:billing-pass-policy`, `music.pass-access-policy`, `saju-consultation-pass-access` → PASS.
- [ ] **Step 5: 커밋.** `feat(billing): 옛 결제 경로 라이트 운세 면제`

### Task 8: 소진 비종료, 재구매, 환불 회수

**Files:**
- Modify: `worker/lib/profile-limits.js:216,265,304,374-375,387`, `worker/payments/passes.js:272,520,637`, `worker/payments/index.js:599,1874-1881`, `worker/payments/gifts.js:132`, `worker/payments/compat.js:306,370`, `worker/routes/app-store.js:1019`, `worker/routes/billing.js:943-967,977,4119`, `lib/payment/pass-eligibility.ts:96`, `js/core/pass-verdict.js`(최소 코인 미러), `scripts/verify-pass-tier-policy.mjs:415-449`
- Test: Create `__tests__/worker/pass-exhaustion-repurchase.test.js`; Modify `pass-open-ended.test.js:66`, `pass-budget-hard-gate.test.js`

**Interfaces:**
- Produces, 모두 `worker/lib/profile-limits.js`: `isActivePassBudgetExhausted(sub, now): boolean`(활성이고 사이클 키가 맞지 않으면 사용액 0으로 계산), `isPassPolicyConflict(prior, nextVersion, now): boolean` = `isPassPolicyMix(...) && !isActivePassBudgetExhausted(prior, now)`. `MIN_PASS_COVERABLE_COIN === 50`, `FAMILY_MIN_PASS_COVERABLE_COIN === 50`.
- Consumes: `isPassPolicyMix`(Task 5).

- [ ] **Step 1: 실패 테스트 작성.**
  - `exhaustion does not close the pass`: V2 소비와 `consumeTierPassIfAvailable` 모두 `expiresAt`이 그대로이고 응답에 `passEnded`가 없다.
  - `compat membershipPass.passEnded stays false at exhaustion`.
  - `test.each(tiers)('exhausted %s buys any tier as new')`: `evaluatePassTierTransition`이 `{code:'NEW',activeTier:'free'}`이고, 활성화 뒤 `monthlySpendCoin===0`, `monthlyLimitCoin===base`, `premiumUseCycleKey`가 새 `expiresAt`과 같다. 낮은 등급 포함.
  - `exhaustion boundary is 50 coins`: 잔여 50코인은 소진이 아니어서 연장·하향 차단 규칙이 기존과 같고, 잔여 49코인은 소진이다.
  - `exhausted v3 holder buys v5, app-store and gift included` (Review Focus 4): passes, index, gifts, app-store 네 호출부 모두 충돌이 없다.
  - `expired pass is not revived`.
  - `refund of a repurchase keeps the pass while earlier limit remains`: `remainingLimitCoin>0`이면 사용액이 남은 한도를 넘어도 `downgraded:false`, 한도만 감소.
  - `refund of first purchase or upgrade terminates`.
- [ ] **Step 2: 실패 확인.** Run: `node scripts/run-mock-tests.mjs jest --runTestsByPath __tests__/worker/pass-exhaustion-repurchase.test.js` → FAIL.
- [ ] **Step 3: 구현.**
  - `applyBudgetExhaustionTermination`과 `billing.js:943-967`의 종료 쓰기를 제거한다. 함수를 쓰는 곳이 없어지면 함수도 지운다. `index.js:1874`, `billing.js:977,4119`, `compat.js`는 `passEnded`를 싣지 않는다. 클라이언트 `markPassEndedFromPayload`는 옛 응답용으로 남긴다.
  - `evaluatePassTierTransition`과 `buildPassCycleFields`는 소진이면 신규로 처리한다. `computePassExpiry`가 새 날짜를 만드는지 테스트로 확인한다. 같은 날짜면 사이클 키가 안 바뀌어 사용액 격리가 깨진다.
  - `isPassPolicyMix` 호출 4곳을 `isPassPolicyConflict`로 교체한다.
  - `buildPassRefundRevokeFields` 유지 조건을 `remainingLimitCoin > 0`으로 바꾸고, `pass-open-ended.test.js:66`의 기대값을 옮긴다.
  - `isPassBudgetExhausted`의 나머지 호출부를 점검해, 활성 이용권을 막는 데 쓰는 곳은 LLM 판정에만 쓰게 한다.
  - `verify-pass-tier-policy`는 "라이트를 뺀 판매 상품 최저가 = 50"을 `LIGHT_FORTUNE_FEATURE_KEYS`로 계산해 대조한다.
- [ ] **Step 4: 통과 확인.** 새 테스트, `pass-open-ended`, `pass-budget-hard-gate`, `payment-refund.pass-duration`, `pass-policy-v5`, `npm run verify:pass-tier-policy`, `npm run test:gifts:replica` → PASS. replica 테스트를 환경 문제로 못 돌리면 보고한다.
- [ ] **Step 5: 커밋.** `feat(pass): 한도 소진 뒤 이용권 유지와 재구매`

### Task 9: 클라이언트 판정 미러

**Files:**
- Modify: `js/core/pass-verdict.js:495,550`, `js/core/pass-verdict.d.ts`, `app/_lib/billing-client.ts:833,2376`, `js/destiny-profile.js:3321,3353,5482`, `scripts/verify-pass-tier-policy.mjs`
- Test: Create `__tests__/ui/pass-verdict-light.test.mjs`

**Interfaces:**
- Consumes: `LIGHT_FORTUNE_FEATURE_KEYS`(Task 1). 미러 대조는 `verify:pass-tier-policy`가 한다.
- Produces: `resolveVerdict(snapshot, coinCost, featureKey?)`, `coverageFromSnapshot(snapshot, coinCost, sourceLabel, featureKey?)`, `_dpResolveCertainPassMiss(coinPrice, featureKey)`. `featureKey`가 없으면 기존 동작이다.

- [ ] **Step 1: 실패 테스트 작성.** (Review Focus 1)
  - `exhausted snapshot covers a light key`: `monthlyRemaining:0`, 50코인, 라이트 키 → `coversNow:true`.
  - `exhausted snapshot does not cover an LLM key`: `REASON_MONTHLY_LIMIT`.
  - `no featureKey keeps the old answer`.
  - `per-use cap still applies to light on the snapshot`.
  - `mirror equals the server list`: `pass-verdict.js`의 미러 상수가 `LIGHT_FORTUNE_FEATURE_KEYS`와 같다.
  - `resolveSnapshotPassVerdict passes featureKey`: `billing-client` 입력의 `featureKey`가 판정까지 도달한다.
  - `destiny-profile certain-miss returns no miss for a light key`: L5482의 호출에 featureKey가 전달되어 결제창으로 빠지지 않는다.
- [ ] **Step 2: 실패 확인.** Run: `node --test __tests__/ui/pass-verdict-light.test.mjs` → FAIL.
- [ ] **Step 3: 구현.** 미러 상수와 인자를 추가하고 네 호출부에 featureKey를 전달한다. L833은 `input.featureKey`, L2376은 L2498과 같은 우선순위(`featureKey || subFeatureKey`)를 쓴다. 호출부에 키가 없으면 인자 없이 두고 서버 판정에 맡긴다. 이때 "미커버 확정"을 내리면 안 되므로 `_dpResolveCertainPassMiss`는 키가 없고 소진 사유일 때 서버 왕복을 택한다.
- [ ] **Step 4: 통과 확인.** 새 테스트와 `node scripts/run-mock-tests.mjs node`, `npm run verify:pass-tier-policy` → PASS.
- [ ] **Step 5: 커밋.** `feat(pass): 클라이언트 라이트 운세 판정 미러`

### Task 10: 사용 이력 환불 차단

**Files:**
- Modify: `worker/payments/passes.js`(`findPassUsageEvidence` 근처), `worker/routes/payments.js:2543,2655-2663`, `worker/payments/index.js:228-240`, `worker/routes/admin-orders.js:241`, `app/admin/orders/HqOrderFacts.tsx`, `app/admin/_hq/types.ts`
- Test: Create `__tests__/worker/pass-refund-use-history.test.js`

**Interfaces:**
- Consumes: 증빙 `passBudgetExempt`(Task 6, Task 7).
- Produces: `findPassUseSinceOrder(db, {userId, paidAt}) → Promise<{useCount:number, lightUseCount:number, ownedUnlockCount:number, hasUse:boolean}>`. `hasUse`는 PointHistory의 이용권 증빙(`accessMethod` PASS·FAMILY)이나 `ContentEntitlement` source PASS가 `paidAt` 뒤에 있으면 참이다. 오류 코드 `PASS_REFUND_REVIEW_REQUIRED`.

- [ ] **Step 1: 실패 테스트 작성.**
  - `self cancel of a pass order with light use is blocked and says contact support`: HTTP 응답에 코드와 고객센터 안내가 있고 PG 취소를 호출하지 않는다.
  - `self cancel with an owned PASS unlock is blocked`.
  - `self cancel with no use behaves as before`.
  - `use from before this order does not count`.
  - `operator refund is not blocked and returns the counts`.
  - `PG console cancel still revokes and leaves a review marker when use exists`.
  - `lookup failure blocks self cancel`: 조회 오류면 차단으로 닫는다.
- [ ] **Step 2: 실패 확인.** Run: `node scripts/run-mock-tests.mjs jest --runTestsByPath __tests__/worker/pass-refund-use-history.test.js` → FAIL.
- [ ] **Step 3: 구현.** `handleCancel`이 주문을 찾은 뒤 `paymentType === "membership_pass"`이면 헬퍼로 판단한다. 부분 환불 공식은 만들지 않는다. 관리자 주문 화면에 라이트 운세 사용 건수와 해금 보유 건수를 표시한다. 관리자 화면은 내부용이지만 표기는 "라이트 운세"로 통일한다.
- [ ] **Step 4: 통과 확인.** 새 테스트, `payment-refund.pass-duration`, `payments-v2.pass-confirm-order-only`, `npm run check:payment` → PASS.
- [ ] **Step 5: 커밋.** `feat(refund): 이용권 사용 이력 있으면 셀프 취소 차단`

## 묶음 ③ 표시와 약관

### Task 11: 생성 목록과 홈 이용권 화면

**Files:**
- Create: `scripts/lib/build-light-fortunes.mjs`, `lib/payment/light-fortunes.generated.json`
- Modify: `lib/marketing/pass-benefits.mjs`, `styles/pass-benefits.css`, `scripts/design/build-home-funnel.mjs:299-336`, `scripts/design/verify-home-funnel.cjs`, `i18n/authored/homeOverseas-09.json`, `package.json`(`verify:light-fortunes`)
- Test: Create `__tests__/ui/pass-benefits-light.test.mjs`

**Interfaces:**
- Consumes: `LIGHT_FORTUNE_FEATURE_KEYS`, 레지스트리 가격.
- Produces: 생성 파일 `{count:number, valueKRW:number, keys:string[]}`. `pass-benefits.mjs`는 이 JSON만 읽는다. `app/components/PassBenefits.tsx`가 이 파일을 import하므로 레지스트리를 앱 번들에 넣지 않는다.

- [ ] **Step 1: 실패 테스트 작성.**
  - `generated value equals registry sum`: 판매 중 라이트 상품 각 1회 정가 합계와 `valueKRW`가 같고, 판매 종료·미사용 키는 빠진다.
  - `generated file is fresh`: 빌드 결과와 커밋된 파일이 같다.
  - `offer math`: 각 등급 이용 가치 = `valueKRW + monthlyLimitCoin*100`, 절약률 = 내림(`(1 − 가격 ÷ 이용 가치) × 100`). 감사 결과가 그대로면 352,000/95%, 392,000/91%, 452,000/85%, 682,000/77%다.
  - `banner and panel copy`: 스펙 7.2의 배너 두 문장과 근거 문구가 렌더링 결과에 있다. 네 등급 모두 라이트 줄이 있다.
  - `no forbidden words`: 렌더링 결과와 `homeOverseas-09.json`에 `LLM`, `AI 미사용`이 없다.
  - `old ending copy is gone`: "이용 한도 소진 시 종료"가 없고 "상담 한도를 다 써도 라이트 운세는 계속 이용할 수 있어요."가 있다.
- [ ] **Step 2: 실패 확인.** Run: `node --test __tests__/ui/pass-benefits-light.test.mjs` → FAIL.
- [ ] **Step 3: 구현.** 스펙 7.2 문구와 패널을 그대로 쓴다. 라이트 포함 상품을 볼 수 있는 진입로는 조건 영역에 접힘 목록으로 두고, 생성 파일의 `keys`를 상품명으로 바꿔 보여 준다. 새 페이지는 만들지 않는다. 대표 상담은 건당 상한 때문에 작은 꿀단지로 이용할 수 없음을 등급 조건에 적는다. `home.gardenCopy.passNote`와 `home.benefitsCopy.*`를 12개 언어로 고친다. 빌드 산출물은 `scripts/design/build-home-funnel.mjs`로 다시 만든다.
- [ ] **Step 4: 통과 확인.** 새 테스트, `node scripts/design/verify-home-funnel.cjs`, `pass-economics`, `home-overseas-runtime`, `home-my-pass.behavior` → PASS. 모바일 폭 화면을 캡처해 배너와 패널이 넘치지 않는지 눈으로 확인한다.
- [ ] **Step 5: 커밋.** `feat(home): 라이트 운세 혜택과 가치 강조`

### Task 12: 구매·상태·안내 화면

**Files:**
- Modify: `app/points/PointsClient.tsx`, `app/points/SubscriptionStatusCard.tsx`, `app/checkout/checkout-copy.ts`, `app/_content/faq-copy.js`, `app/components/PolicyGuide.jsx`, `app/refund-policy/page.js`
- Test: Modify `__tests__/ui/pass-economics.test.*`, `home-my-pass.behavior` 또는 카드 인접 테스트

**Interfaces:**
- Consumes: 생성 파일(Task 11), `monthlyRemaining` 스냅샷.

- [ ] **Step 1: 실패 테스트 추가.**
  - `exhausted status card shows repurchase and light stays on`: 소진 스냅샷에서 "상담 한도 소진 · 라이트 운세 이용 중"과 재구매 버튼을 보여 주고 미보유로 표시하지 않는다.
  - `checkout and faq copy has the new rule and no old termination sentence`.
  - `refund policy says use history goes to support review`.
- [ ] **Step 2: 실패 확인.** 해당 테스트 실행 → FAIL.
- [ ] **Step 3: 구현.** 위 파일의 문구와 상태 카드를 고친다. `PointsClient`의 이용권 카드에 라이트 운세 줄을 넣는다. 금액은 `CURRENT_PASS_PLANS`와 생성 파일에서 읽는다.
- [ ] **Step 4: 통과 확인.** 해당 테스트와 `npm run verify:krw-copy-canonical` → PASS.
- [ ] **Step 5: 커밋.** `feat(points): 구매·상태 화면에 라이트 운세 규칙 반영`

### Task 13: 약관, 공지, 시행 버전

**Files:**
- Modify: `app/terms-of-service/TermsContent.jsx`(L12, L82, L85, L162-168, L211), `worker/payments/policy-versions.js:16`, `worker/routes/auth.js:95`, `__tests__/worker/payments-v2.policy-versions.test.js`, `PAYMENT_POLICY.md`, `lib/marketing/pass-benefits.mjs`(공지 링크)
- Test: `npm run verify:payment-legal-copy`

**Interfaces:**
- Produces: `TERMS_EFFECTIVE_DATE === ORDER_POLICY_VERSIONS.terms === AUTH_TERMS_VERSION`.

- [ ] **Step 1: 실패 검증 추가.** `verify-payment-legal-copy`에 기대 문구를 추가한다: 등급 금액 네 개가 `CURRENT_PASS_PLANS`와 일치, "라이트 운세" 기간 없음, "상담 한도를 모두 사용해도 이용권은 유지", 구매 완료 이용권의 가격 불변, 비정상 자동화 이용 제한 조항. 옛 문장 "이용 한도를 모두 사용하면 이용권이 종료", "판정 기준은 적용 가격 범위와 이용 한도 둘뿐"이 없음.
- [ ] **Step 2: 실패 확인.** Run: `npm run verify:payment-legal-copy` → FAIL.
- [ ] **Step 3: 약관과 공지 구현.** 약관 문단을 고치고 페이지 상단에 개정 안내 블록(시행일, 바뀐 점 3줄)을 넣는다. 스펙 7.3의 공지는 이 블록과 홈 배너 아래 링크로 한다. 사이트 전체 공지 기능을 새로 만들지 않는다.
- [ ] **Step 4: 시행 날짜 지정.** 세 값을 `2026-11-04`로 맞추고 테스트를 옮긴다. `worker/routes/auth.js`의 L1571, L2355, L2875, L5100에서 새 버전이 기존 회원의 재동의를 강제하는지 확인해 결과를 커밋 메시지와 최종 보고에 적는다. 강제하면 바꾸지 말고 보고한다. 실제 배포일이 다르면 배포 직전에 이 세 값과 약관 날짜만 고친다.
- [ ] **Step 5: 통과 확인.** `npm run verify:payment-legal-copy && npm run verify:payment-policy-md`, `payments-v2.policy-versions` → PASS.
- [ ] **Step 6: 커밋.** `docs(terms): 라이트 운세와 이용권 규칙 약관 개정`

### Task 14: 전체 검증과 Play 전환 준비

**Files:**
- Modify: `lib/payment/pass-policy.js:9-13`(사용자가 Play 등록을 마친 뒤에만)
- Create: `docs/handoff/2026-11-04-pass-flat-pricing-release.md`

- [ ] **Step 1: 전체 검증.** Run: `npm run check:payment`, `node scripts/run-mock-tests.mjs jest`, `node scripts/run-mock-tests.mjs node`, 그리고 스펙 8절의 필수 검증 목록. 실패는 원인과 함께 보고하고, 이 변경과 무관하면 main에서도 재현해 구분한다.
- [ ] **Step 2: 금지어 검색.** Run: `git diff origin/main -- app lib/marketing i18n public/i18n index.html` 결과에서 추가된 줄에 `LLM`이 없는지 확인한다.
- [ ] **Step 3: 경제성 보고.** Run: `node scripts/report-pass-economics.mjs`. 등급별 수익을 최종 보고에 적는다. 판매 승인 증빙으로 쓰지 않는다.
- [ ] **Step 4: 배포 인수인계 작성.** 배포 순서(① → ②+③ 동시), 사용자 몫(`node scripts/create-play-console-products.mjs --apply`로 v5 SKU 3종 등록 뒤 승인 목록 변경), 등록 전 앱 판매가 `PASS_SALE_NOT_READY`로 닫힌다는 위험, 배포일 날짜 수정, 스펙 11절 후속 항목, 추가 경계(소진 이용권 보유자가 새 이용권을 사서 환불하면 예전 이용권의 라이트 권리도 사라짐)를 적는다.
- [ ] **Step 5: 커밋.** `docs: 균일가·이용권 v5 배포 인수인계`
- [ ] **Step 6: 승인 목록 전환(사용자 등록 뒤).** `CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS`를 v5 3종으로 바꾸고 `v5 play sale fails closed until approved` 테스트를 판매 허용 단언으로 옮긴 뒤 `npm run verify:pass-tier-policy && npm run verify:app-store-pricing`을 통과시켜 커밋한다. 사용자가 등록을 알리기 전에는 실행하지 않는다.
