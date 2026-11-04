# 3~5천 원 균일가와 라이트 운세 자유 이용 설계

작성일: 2026-11-04 · 기준 커밋: origin/main 6eec763f0 · 상태: 사용자 승인 대기

## 1. 의도

지금은 일부 상품만 팔린다. 일반 상품 가격을 3,000~5,000원으로 맞춰 고르기 쉽게 하고, 가장 싼 이용권(작은 꿀단지 9,900원)만 사도 라이트 운세를 횟수 제한 없이 쓰게 한다. 목적은 이용권 구매 증가다. 이용권 화면에서 이 혜택과 그 가치를 눈에 띄게 보여 준다.

## 2. 목표와 비목표

**목표**

- 라이트 운세 전 상품을 3,000~5,000원으로 맞춘다.
- 찻집, 3만 원 이상 대표·전문가 상담, 영냥이를 뺀 LLM 상품을 5,000원으로 낮추고 분량을 약 12,000자로 줄인다.
- 활성 이용권 전 등급에서 라이트 운세를 한도 차감 없이 쓰게 한다.
- LLM 한도를 다 써도 이용권을 유지하고 LLM만 막는다.
- 홈과 구매 화면에 혜택과 가치를 표시하고, 약관·안내 문구를 새 규칙에 맞춘다.

**비목표**

- 이용권 가격, LLM 한도, 건당 상한, 앱 SKU 변경
- 찻집(5천~1만5천 원), 3만 원 이상 상담, 영냥이 가격 변경
- 이미 결제한 주문의 차액 환불
- 소진으로 이미 종료된 이용권 복구
- 월정석 최소 금액(10,000원) 변경, 음악 트랙 정책 변경

**하지 말 것**

- 고객 문구에 "LLM", "비 LLM", "AI 미사용" 같은 내부 표현을 쓰지 않는다. 고객 표현은 "라이트 운세"다.
- 근거 없는 "상당" 금액을 쓰지 않는다. 가치는 판매 중인 상품의 정가에서 빌드 때 계산한다.
- 정책 버전을 새로 발행하지 않는다.
- 공용 상수 `PAID_REPORT_MIN_BODY_CHARS`(20,000)를 낮추지 않는다. 다른 고가 상품도 쓰는 값이다.

## 3. 사용자가 확정한 결정

| 항목 | 결정 |
| --- | --- |
| 한도 | 라이트 운세는 무제한, 금액 한도는 LLM 상품에만 적용 |
| LLM 인하 범위 | 찻집만 빼고 7천~1만 원 LLM을 5,000원, 약 12,000자로 |
| 상위 이용권 | 작은 꿀단지 혜택을 중간·큰·패밀리에도 포함 |
| 기존 이용권 | 활성 이용권 전체에 적용, 종료된 이용권은 복구하지 않음 |
| 혜택 표시 | 라이트 운세 가치를 포함해 강조, "비 LLM" 표현 금지 |

## 4. 접근 방식

**A안 (채택): 현행 정책 안에 상품 분류를 추가한다.** 레지스트리에 라이트 운세 표시를 두고, `evaluatePassCoverage`가 그 상품의 누적 한도 판정을 건너뛴다. `consumePassCoverage`에 이미 있는 `budgetApplies:false` 분기를 재사용하므로 코드가 적고, 활성 이용권 전체에 바로 적용된다.

**B안 (기각): 새 정책 버전을 발행한다.** 정책이 섞이면 `PASS_POLICY_CONFLICT`로 구매가 거부되고, 기존 구매자에게 혜택을 주려면 이관이 따로 필요하다. 사용자 결정(활성 이용권 전체 적용)과 맞지 않는다.

## 5. 묶음 ① 가격 인하와 분량 축소

### 5.1 먼저 할 일: 분류 감사

인벤토리는 정적 근거만 본다(`liveValidation: UNVERIFIED`). 게다가 `listProducts()`는 `FEATURE_KEY_PRICE_TABLE`만 읽으므로 `PIG_COIN_UNLOCK_PRODUCTS`에만 있는 해금 상품이 빠진다. 구현 첫 작업으로 아래를 확정한다.

1. 라이트 후보 전부의 서버 경로를 따라가 LLM·Vision 호출이 없는지 확인한다. 라우트 파일 10개를 대표 호출명으로 검색한 결과는 0건이었지만, 간접 호출은 아직 배제하지 못했다.
2. 해금 전용 상품의 판매 여부와 LLM 사용 여부를 확인한다: `saju-career-style`, `flower-fc`, `olympus-fc`, `rpgCharacter`, `travelDestiny`, `healthReport`, `section_daewun`, `section_summary`, `section_compat`, `secretHouseEpisodes`, `premiumDivinationPack`, `sajuDiary`, `nakshatra-lord-report`, `nakshatra-dasha-map`.
3. 확인되지 않은 상품은 LLM으로 취급한다. 차감이 유지되므로 안전한 쪽이다.

### 5.2 가격표

| 분류 | 상품 | 현재 | 변경 |
| --- | --- | --- | --- |
| 라이트 | `rpt_specialCharmCard`, `rpt_skillTreeCard`, `fun.quantumLotto.ritualReport` | 1,000 | **3,000** |
| 라이트 | 3,000원 13종, 5,000원 39종 | 3,000·5,000 | 유지 |
| 라이트 | `sukyo_yearly_fortune_unlock`, `nakshatra-muhurta`, `destiny-compass-crossroads`, `destiny-compass-life-voyage`, `destiny-compass-future-sim`, `love-code`, `animal-destiny-unlock`, `saju-guardian-unlock`, `destiny_meeting_place`, `rpt_energyCoordCard` | 7,000 | **5,000** |
| 라이트 | `tarot-year-fortune`, `cosmic-soul-meditation`, `sukuyo-past-life-reading`, `premium-fpti-report`, `rpt_quantumCard` | 10,000 | **5,000** |
| 라이트 | `nakshatra-compat`, `premium-sibyl-dominator` | 20,000 | **5,000** |
| 라이트 | `nakshatra-vvip-codex` | 30,000 | **5,000** |
| 해금 전용 (감사 통과 시 라이트) | `travelDestiny` 7,000, `section_daewun` 20,000, `section_summary`·`section_compat` 10,000 | 표시값 | **5,000** |
| LLM | `tarot-celestial-harmony`, `palm-reading-general`, `relationship-boundary-test`, `compat-saju-compatibility`, `saju_ai_question_prompt`, `tarot-prompt-maker-deep`, `tarot-prompt-maker-master`, `ziwei_ai_prompt_generator`, `astrology_ai_prompt_generator`, `vedic_ai_prompt_generator`, `sukuyo_ai_prompt_generator` | 10,000 | **5,000** |
| LLM | `human-design-report`, `destiny-compass-deep-report` | 7,000 | **5,000** |
| LLM | 기존 5,000원 상품 | 5,000 | 유지 |
| 유지 | 찻집, 3만 원 이상 상담, `ziwei-deep-pdf`, `fusion-fortune-consultation`, `master-love-codex*`, `heukwol-warning-consultation`, `neo-email-consultation`, `premium-naming-prompt`, 영냥이 전 상품 | 현행 | 유지 |
| 유지 | 판매 종료(`historical`)와 미사용(`registry-only`) 키, `profile-card-manage`, 음악 트랙 | 현행 | 유지 |

`premium_divination_pack`(30,000)은 판매 진입로가 없으면 그대로 두고, 있으면 5,000원으로 내린다.

### 5.3 분량 (LLM)

기본 원칙은 섹션과 카드 수를 유지하고 글자 수를 줄이는 것이다. 진행 중인 전달의 체크포인트와 호환되기 때문이다. 목표당 500자 미만으로 얇아지는 섹션만 합칠 수 있으며, 합칠 때는 계약 버전으로 기존 건을 구분한다.

| 상품 | 현재 (코드 기준) | 변경 |
| --- | --- | --- |
| 천체의 선율 | 11장, 카드당 6필드 각 500자 이상, 합계 약 43,000~50,000자 | 11장 유지, 필드 최소 120자·목표 130~150자, 종합 축소로 합계 약 12,000자. `maxOutputTokens` 하향 |
| 타로 오라클 8~14장 | 최소 합계 약 12,000~12,800자 | 가격이 50코인이 되면 `CARD_BUDGET[50]`이 자동 적용되어 최소 합계 약 10,100~12,800자. 주석만 수정 |
| 전문가 상담 4종 (자미·점성·베다·숙요) | 10부 × 2,200자 | 10부 × 1,200자 |
| 사주 AI 질문 | 5그룹 × 4,000자, 경고 기준 20,000자 | 5그룹 × 2,400자. 경고 기준을 이 상품 전용 값으로 분리 |
| 휴먼 디자인 리포트 | 18섹션, 합계 약 25,900자 | 합계 약 12,000자. `HD_REPORT_TARGET_CHARS`와 전달 하한도 함께 하향 |
| 운명의 지도 심층 | 10섹션 × 2,500자 | 10섹션 × 1,200자 |
| 바람끼 테스트 | 5장면 × 4,400~5,000자 | 5장면 × 2,200~2,500자 |
| 사주 궁합 | 그룹별 필드 목표의 합 | 구현 때 합계를 재서 약 12,000자로 조정 |
| 손금 | Vision 판독 + 전달 경로 | 구현 때 재서 12,000자를 넘을 때만 축소 |

**전달 원칙:** 분량은 목표이고, 결제 뒤 전달 성공이 우선이다. 전달 하한과 품질 판정을 새 목표에 맞춰 함께 낮춘다. 낮추지 않으면 정상 결과가 환불로 빠질 수 있다.

**광고 문구:** 상품 페이지, 프롬프트, 주석에 있는 옛 분량 표기("2만 자", "25,000자" 등)를 새 값으로 고친다.

### 5.4 함께 바꿀 곳

정본은 `worker/lib/paid-feature-registry.js`다. 아래 복제본은 main에서 재검색해 함께 고친다.

- **서버 하드코딩:** `worker/routes/vedic-ai.js`, `ziwei-ai.js`, `sukuyo-compatibility-ai.js`, `sukuyo.js`, `naming-prompt.js`
- **프론트 상수:** `js/tarot-*-experience.js`, `js/saju-engine*.js`, `js/iching-engine.js`, `js/entertain-engine.js`, `celestial-harmony.html`, `app/components/ziwei/ZiweiDeepPdfPanel.tsx`, `app/astrology-ai/AstrologyAiClient.tsx`
- **표시:** `index.html`, `js/core/service-registry.js`, `public/i18n/*.json`, `lib/marketing/*.generated.json`, `scripts/lib/sync-saju-reading-prices.mjs`
- **문서:** `PAYMENT_POLICY.md`
- **기준선:** 의도한 개정이므로 관련 가드 테스트의 기준값을 함께 옮긴다. `LEGACY_UNLOCK_PRODUCTS_65DE451`은 과거 구매 증빙용이라 수정하지 않는다.
- **자동 반영 확인:** `worker/lib/honey-unlock-catalog.js`(꿀방울 가격), `worker/lib/review-product-catalog.js`
- **최저가 상수:** `MIN_PASS_COVERABLE_COIN`과 `FAMILY_MIN_PASS_COVERABLE_COIN`을 10에서 30으로 올린다. 판매 상품 최저가를 기준으로 `verify:pass-tier-policy`를 통과해야 한다.

새 가격은 모두 기존 앱 SKU 금액(3,000·5,000)이라 Play Console 등록이 필요 없다.

## 6. 묶음 ② 이용권 규칙

### 6.1 라이트 운세 판정

- 레지스트리에 라이트 운세 표시를 추가하고 `worker/payments/catalog.js`의 `resolveProduct`로 노출한다. 표시가 없으면 LLM으로 보고 차감한다.
- `evaluatePassCoverage`에 `featureKey` 또는 카탈로그 판정을 전달한다. `consumePassForFeature`, unlock 경로, `pass-check` 모든 호출부에 전달해야 한다. 인자가 없으면 LLM으로 처리한다.
- 라이트 상품은 `budgetApplies:false`로 판정해 누적 한도를 면제한다. 전 상품이 5,000원 이하이고 모든 등급의 건당 상한이 5,000원 이상이므로 건당 상한은 건드리지 않는다.
- `remainingCoin`이 면제 분기에서 전체 한도를 돌려주지 않도록 실제 잔여(`budgetCoin - usedCoin`)를 돌려준다.
- `recordPassUsageEvidence`의 PointHistory 0원 증빙과 멱등 마커는 그대로 남긴다. 지연 차감 402를 막고 환불 판단 근거가 된다.
- 판정 정본은 서버 하나다. `js/core/pass-verdict.js`는 `coinCost`만 받으므로 서버 스냅샷 또는 생성 목록에서 라이트 표시를 받아 미러링한다. 판정 로직을 복제하지 않는다.

### 6.2 LLM 한도 소진

- `applyBudgetExhaustionTermination`은 더 이상 `expiresAt`을 닫지 않는다. 활성 상태와 라이트 운세가 유지되고, LLM은 `monthly_pass_limit_exceeded`로 막혀 단건 결제나 재구매로 안내된다.
- `isPassBudgetExhausted`의 모든 호출부를 점검한다. 활성 이용권을 막는 데 쓰는 곳이 있으면 라이트 운세까지 막히기 때문이다.
- **재구매 회귀 방지:** 지금은 소진 시 이용권이 종료되어 새 이용권이 사용액 0으로 시작한다. 활성으로 유지하면 `evaluatePassTierTransition`이 업그레이드로 보고 사용액을 이월한다. 예를 들어 소진된 작은 꿀단지(사용 20,000원)에서 중간 꿀단지를 사면 60,000원 한도 중 40,000원만 남는다. 또 하위 등급 재구매가 막힐 수 있다. 그래서 **소진 상태에서 구매하면 현재와 똑같이 새 이용권으로 시작하고, 어떤 등급이든 살 수 있어야 한다.** 웹(`worker/payments/passes.js`)과 앱(`worker/routes/app-store.js`) 경로 모두 해당한다.
- 이미 `expiresAt`이 지난 소진 이용권은 복구하지 않는다.

### 6.3 환불

약관(`app/terms-of-service/TermsContent.jsx`)은 혜택 사용 시작 후 청약철회 제한 가능성을 규정한다. 라이트 운세는 한도를 차감하지 않으므로, 한도 사용액만 보는 경로는 "미사용"으로 오판해 전액 환불할 수 있다.

요구사항: 이용권 환불 경로(`worker/payments/index.js`, `worker/lib/payment-refund.js`)의 사용 판단에 라이트 운세 증빙을 포함한다. 사용 이력이 있으면 자동 전액 환불을 하지 않고 기존 부분 사용 절차로 넘긴다.

### 6.4 남용 방지

기존 인증과 요청 제한을 유지한다. 해금 상품은 출생 프로필 단위라 프로필 수로 제한된다. 약관에 "비정상적인 자동화 이용 제한"이 없으면 추가한다.

## 7. 묶음 ③ 표시와 약관

### 7.1 가치 계산

표시 금액은 `lib/marketing/pass-benefits.mjs`에서 빌드 때 계산한다.

- **라이트 운세 가치** = 판매 중인 라이트 상품 각 1회의 인하 후 정가 합계
- **이용 가치** = 라이트 운세 가치 + 등급별 상담 한도

판매 종료 키와 미사용 키는 합계에서 뺀다. 카탈로그 74종 기준 첫 계산은 아래와 같다. 해금 전용 상품이 감사를 통과하면 커진다.

| 이용권 | 가격 | 라이트 운세 | 상담 한도 | 이용 가치 | 최대 절약 |
| --- | --- | --- | --- | --- | --- |
| 작은 꿀단지 | 9,900 | 338,000 | 20,000 | 358,000 | 97% |
| 중간 꿀단지 | 29,900 | 338,000 | 60,000 | 398,000 | 92% |
| 큰 꿀단지 | 59,900 | 338,000 | 120,000 | 458,000 | 86% |
| 패밀리 꿀단지 | 149,000 | 338,000 | 350,000 | 688,000 | 78% |

"각 1회 이용 기준" 근거 문구를 금액 가까이에 항상 표시한다.

### 7.2 홈 이용권 화면 (`renderPassBenefits`)

고르기 영역 위에 배너를 추가한다.

> **작은 꿀단지 하나면, 라이트 운세 {N}종이 전부 열려요.**
> 대표 상담을 제외한 라이트 운세를 횟수 제한 없이 이용하세요. 중간·큰·패밀리 꿀단지에도 똑같이 포함돼요.

등급 패널은 다음처럼 바꾼다.

```text
작은 꿀단지                                  최대 97% 절약
단건 결제 기준 이용 가치                        358,000원(취소선)
이용권 구매 가격                                   9,900원

✓ 라이트 운세 {N}종 횟수 제한 없이   338,000원 상당
✓ 전문가 상담 이용 한도              20,000원 (건당 5,000원 이하)
라이트 운세 각 1회와 상담 한도를 모두 이용했을 때의 단건 가격 비교예요.
```

- 등급 차이는 상담 한도와 건당 상한으로 보여 준다.
- 라이트 운세에 포함되는 상품을 볼 수 있는 진입로를 조건 영역에 둔다.
- 대표 상담은 건당 상한 때문에 작은 꿀단지로 이용할 수 없음을 명시한다.

고칠 기존 문구: "이용 한도 소진 시 종료"(`pass-benefits.mjs` 39, 42행) → "상담 한도를 다 써도 라이트 운세는 계속 이용할 수 있어요." 그리고 `home.gardenCopy.passNote`, `i18n/authored/homeOverseas-09.json`의 `home.benefitsCopy.*`, `scripts/design/verify-home-funnel.cjs`의 기대값을 함께 고친다.

### 7.3 구매·상태 화면과 고지

- **구매·안내 화면:** `app/points/PointsClient.tsx`, `app/points/SubscriptionStatusCard.tsx`, `lib/payment/pass-eligibility.ts`, `app/checkout/checkout-copy.ts`, `app/_content/faq-copy.js`, `app/components/PolicyGuide.jsx`, `app/refund-policy/page.js`
- **상태 카드:** 소진 시 "상담 한도 소진 · 라이트 운세 이용 중"으로 표시하고 재구매 버튼을 보여 준다.
- **약관:** `app/terms-of-service/TermsContent.jsx`의 "이용 한도를 모두 사용하면 이용권이 종료", "판정 기준은 적용 가격 범위와 이용 한도 둘뿐"을 새 규칙으로 고친다. 같은 문단의 등급 금액은 main에서 다시 확인해 `CURRENT_PASS_PLANS`와 일치시킨다. 시행일을 표시하고 `verify-payment-legal-copy`로 검증한다.
- **금지어 가드:** 고객 표시 파일에 "LLM"과 "비 LLM"이 들어가지 않는지 확인한다.

## 8. 배포 순서와 위험

순서는 ① → ② → ③이다. 약관과 표시는 ②와 함께 나가야 하고, ②보다 먼저 나가면 안 된다. 푸시와 배포는 사용자 요청 때만 한다.

| 위험 | 대응 |
| --- | --- |
| 실제로는 LLM을 쓰는 상품이 라이트로 분류되어 비용 무제한 발생 | 5.1 감사, 레지스트리 표시와 인벤토리 일치를 확인하는 가드 테스트, 미확인 상품 차감 |
| 복제된 가격이 어긋나 결제 금액과 표시가 다름 | `verify-paid-gate-price-coverage`, `verify-i18n-price-drift`, `per-use-price-registry-parity`, 서버 정본 결제 |
| 분량 축소 후 품질 판정이 정상 결과를 거부 | 하한 동시 하향, 천체·휴먼 디자인·지도의 전달 테스트 |
| 진행 중인 전달이 새 계약과 충돌 | 섹션 키 유지, 합칠 때 계약 버전 구분 |
| 소진 후 재구매 조건 악화 | 6.2 회귀 테스트 |
| 라이트 운세 사용 뒤 전액 환불 | 6.3 사용 판단 |
| 가치 표시 과장 시비 | 빌드 계산, 판매 상품만 합산, 근거 문구 상시 표시 |

**필수 검증:** `verify-billing-pass-policy`, `verify-pass-tier-policy`, `verify-payment-legal-copy`, `verify-paid-gate-price-coverage`, `verify-i18n-price-drift`, `verify-payment-policy-md`, `verify-llm-generation-resilience.mjs`, `scripts/design/verify-home-funnel.cjs`, 그리고 `__tests__`의 `pass-policy-v4`, `pass-budget-hard-gate`, `pass-open-ended`, `pass-economics`, `per-use-price-registry-parity`, `discovery-prices`, `paid-non-llm-delivery`, `paid-delivery-inventory`, `celestial-paid-delivery`, `payments-v2.pass-check`.

**새 테스트(동작별 1개):** 라이트 상품 무차감 전 등급, 소진 후 라이트 허용·LLM 차단, 소진 후 재구매 시 새 사용액, 라이트 사용 이력의 환불 판단, 표시 없는 상품 차감, 라이트 표시와 인벤토리 일치, 가치 합계와 레지스트리 일치.

## 9. 설계자 판단 (사용자가 뒤집을 수 있음)

1. **1,000원 상품 3종을 3,000원으로 올린다.** 요청의 "3천~5천 원으로 모두"를 그대로 따랐다. 유일한 가격 인상이다.
2. **타로 오라클 1~14장이 모두 5,000원이 된다.** 카드 수에 따른 가격 차이가 사라지고, 분량 차이만 남는다.
3. **`nakshatra-vvip-codex`(30,000), `nakshatra-compat`·`premium-sibyl-dominator`(20,000)도 5,000원으로 내린다.** 인하 폭이 크지만 라이트 운세이므로 요청 규칙을 그대로 적용했다.
4. **10,000원에서 5,000원이 되는 상품은 월정석 결제 대상에서 빠진다.** 최소 금액이 10,000원이기 때문이다. 찻집과 고가 상담은 계속 쓸 수 있다.
5. **작은 꿀단지의 절약률이 가장 높게 나온다(97%).** 진입 유도에는 좋지만, 상위 등급은 상담 한도와 건당 상한으로 설득해야 한다. 큰 금액·높은 비율이 과장으로 보일 수 있어 근거 문구를 상시 표시한다.
6. **약관 변경 고지:** 이용자에게 유리한 변경이지만 시행일과 사이트 공지를 함께 내는 것을 권한다. 필요하면 법률 검토를 받는다.

## 10. 구현자 재량

- 라이트 표시의 형태(스펙 필드 또는 별도 집합)와 클라이언트 전달 방식
- 천체 필드별 글자 배분과 토큰 상한의 정확한 값
- 배너와 패널의 시각 구성(기존 `styles/pass-benefits.css` 안에서)
- 12개 언어 번역 문구

## 11. 범위 밖 후속 보고 항목

수정하지 않고 보고한다. 로컬 브랜치 조사에서 나온 항목이므로 main에서 다시 확인한다.

- `app/_lib/serviceSections.js`의 옛 가격
- `MayaPromptGeneratorCard.tsx`(3,000 대 5,000), `worker/routes/tarot.js`(30 대 50코인)
- `pass-pricing.js`와 `index.html` goldenPackages의 큰 꿀단지 59,000 대 59,900
- `worker/payments/index.js`의 planId 없는 요청 레거시 해석
- `dream.js`의 낡은 프롬프트 후보
- 천체 생성 소진 시 자동 환불 경로
