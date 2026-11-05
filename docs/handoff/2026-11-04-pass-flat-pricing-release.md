---
status: active
updated: 2026-11-06
next: 배포 순서와 검증 결과를 대조한다.
---

# 균일가·이용권 v5 배포 인수인계

브랜치 `wt/pass-flat-pricing-20261104`. origin/main(`7b2175491`까지)을 병합했다. 약관 시행일은 2026-11-05다.

정본: `docs/superpowers/specs/2026-11-04-pass-flat-pricing-design.md`, `docs/superpowers/plans/2026-11-04-pass-flat-pricing.md`.

## 무엇이 바뀌나

- 일반 상품 3,000~5,000원, 7천~1만 원 상담은 5,000원·약 12,000자(찻집 제외). 3만 원 이상 상담은 유지.
- 라이트 운세 65종(합계 299,000원)은 유효한 이용권이면 차감 없이 횟수 제한 없이 이용. 상담 한도를 다 써도 이용권은 유지.
- 이용권 v5: 14,900 / 34,900 / 64,900 / 154,000원. 이미 산 이용권의 결제 금액과 한도는 그대로.
- 영냥이: 고등어 10,000 / 연어 15,000 / 광어 20,000 / 참치 30,000 / 모둠 50,000 / 오마카세 70,000원. 전용 이용권 40,000 / 60,000 / 80,000 / 120,000원(8회·90일).
- 연이·네오 채팅 질문 상담: 10,000 / 15,000 / 20,000 / 30,000원. `fortune-chat-consultation`은 5,000원 유지. main은 고정했던 값이라 병합에서 인상 쪽으로 되돌렸다.
- 사주 18키는 라이트가 아니고 29,000원 묶음으로만 판다. 명리 타로는 main에서 판매 종료되어 라이트에서 뺐다.

## 함께 내보내는 꿀단지 통합 (2026-11-05 승인)

영냥이 전용 이용권 판매 중단과 전 등급 영냥이 개방은 v5와 **함께** 승격한다. 화면 문구가 v5 한도를 기준으로 하기 때문이다. 그 전까지 운영은 전용 이용권을 계속 판매한다. 정책은 [payment-gating](../context/payment-gating.md)의 2026-11-05 승인 절을 따른다.

롤백은 범위 열기(`24aed20e7`)와 판매 중단(`9ea0c8c1e`), 그리고 그 위 화면 커밋만 되돌린다. 증빙 읽기 확대(`ea2d602c4`)는 되돌리지 않는다. 그 사이 일반 등급으로 시작한 상담의 재개·복원에 필요하다. DB 마이그레이션은 없다. 해시는 main에 올린 뒤의 값으로 다시 확인한다.

## 배포 순서

순서는 ① → ②+③ 동시다. ②(이용권 규칙)가 ③(표시·약관·공지)과 떨어져 나가면 안 된다.

| 묶음 | 내용 | 커밋 |
|---|---|---|
| 영냥이 | 가격·전용 이용권 | `88f68ed4e` |
| ① | 가격 인하·분량 축소 | `0269a79`, `ddd164481`, **`d9a021415`** |
| ② | 이용권 규칙 | `e0e4fb005`, `09d4e4238`, `09372d6f4`, `f842802b3`, `10f71e639`, `4820bdf15`, `d9a021415`, `7ce881983`, `54cfaa1a5` |
| ③ | 표시·약관·공지 | `3928449ff`, `38f463913`, `960c3f67c` |

`d9a021415`에는 ①의 결제 금액 버그 수정(VVIP `AMOUNT_KRW` 30000 잔존, 화면 5,000원과 승인 금액 불일치)이 들어 있다. ①만 먼저 내보내면 이 수정을 반드시 포함한다.

## 배포 전에 할 일

1. **시행일 맞추기.** 약관 시행일은 2026-11-05로 적혀 있다. 실제 배포일이 다르면 아래를 같은 값으로 고치고 `npm run sync:public`을 돌린다.
   - `app/terms-of-service/TermsContent.jsx`의 `TERMS_EFFECTIVE_DATE`
   - `lib/legal/legalContent.ts`의 약관 4벌 `effectiveDate`
   - `worker/payments/policy-versions.js`의 `terms`, `worker/routes/auth.js`의 `AUTH_TERMS_VERSION`
   - `__tests__/worker/payments-v2.policy-versions.test.js`, `PAYMENT_POLICY.md` 맨 위 승인 줄
2. **Play 등록(사용자 몫).** `node scripts/create-play-console-products.mjs --apply`로 v5 SKU 3종을 등록한다.

## Play 등록 전 위험

승인 목록 `CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS`는 v4를 유지한다. 그래서 등록 전에 배포하면 **앱의 이용권 판매가 `PASS_SALE_NOT_READY`(409)로 닫힌다.** 웹 판매는 영향이 없다.

등록을 마친 뒤 할 일:

1. `lib/payment/pass-policy.js`의 승인 목록을 v5 3종으로 바꾼다.
2. `v5 play sale fails closed until approved` 테스트를 판매 허용 단언으로 옮긴다.
3. `npm run verify:pass-tier-policy && npm run verify:app-store-pricing`을 통과시켜 커밋한다.

## 검증 상태

`npm run check:payment`(병합 트리 `d85bd52f5`): 끝까지 통과. Jest 7,629개, node 4,573개, 유료 게이트 77개 모두 통과했다.

- 병합 복구 뒤 `verify:worker-no-undef`가 `09d4e4238`의 선언 위치 오류를 잡았다. `/coin-gate/pass-check`가 운영(strict)에서 `ReferenceError`로 실패할 코드였고 `d85bd52f5`에서 고쳤다. jest는 느슨한 모드라 이 오류를 잡지 못한다.
- `verify-home-funnel.cjs`는 끝까지 돌지 못한다. `location.hash='services'` 단계(224행)가 낡은 기대값이다. 해시 단계를 뺀 임시 사본으로 새 표시 항목만 확인했다.
- 실행하지 못한 것: `npm run test:gifts:replica`(이 PC 실행 불가), 실결제, 운영 DB, 과금 LLM 실호출.

## 경제성 (판매 승인 증빙 아님)

`node scripts/report-pass-economics.mjs`의 기획 시나리오다. 실제 생성 비용(`actualGenerationCost`)은 측정값이 없다.

이 표의 "상품 원가 허용액"은 고정비를 뺀 뒤 쓸 수 있는 금액이고, "최악 원가"는 마인드 스캔 1회 6,300원(모든 재시도와 대체 모델까지 소진)을 한도만큼 반복한 값이다. 설정 파일 `config/pass-cost-planning-20260921.json`은 마인드 스캔을 아직 3,000원으로 적고 있어 스크립트 출력의 반복 횟수는 6 / 20 / 40 / 116회다. 아래 표는 현재 5,000원으로 다시 계산한 값이다.

| 등급 | 판매가 | 상담 한도 | 원가 허용액(웹) | 허용액(Play 15%) | 허용액(Play 30%) | 5,000원 기준 반복 | 최악 원가 |
|---|---|---|---|---|---|---:|---:|
| 작은 꿀단지 | 14,900 | 20,000 | 7,307 | 5,892 | 3,657 | 4회 | 25,200 |
| 중간 꿀단지 | 34,900 | 60,000 | 17,116 | 13,801 | 8,566 | 12회 | 75,600 |
| 큰 꿀단지 | 64,900 | 120,000 | 31,830 | 25,664 | 15,929 | 24회 | 151,200 |
| 패밀리 꿀단지 | 154,000 | 350,000 | 75,530 | 60,900 | 37,800 | 70회 | 441,000 |

**모든 등급에서 최악 원가가 허용액을 넘는다.** 한도를 전부 쓰고 모든 호출이 재시도까지 소진되는 경우에만 나는 값이지만, 정상 이용 때의 실제 비용을 재지 않았으므로 안전하다고 말할 근거도 없다. 배포 뒤 등급별 실제 호출 비용과 한도 소진율을 먼저 확인한다. 설정 파일의 가격과 분량(`parts`)도 이번 인하를 반영해 갱신해야 한다.

## 규칙 변경으로 생기는 경계

- 고등어 질문(100코인)은 작은 꿀단지 건당 상한(50), 연어 질문(150코인)은 중간 꿀단지 상한(100)을 넘어 해당 등급으로 쓸 수 없게 된다.
- 패밀리 꿀단지의 고등어 차감이 2배가 되어 이용 가능 횟수가 70회에서 35회로 줄어든다.
- 남은 한도 49코인 이하(5,000원 미만)에서 재구매하면 잔여분은 소멸한다. 약관에는 적었지만 상점 화면에는 안내가 없다.
- 소진 상태에서 산 이용권을 환불하면 앞선 이용권이 소진 상태 그대로 돌아와 라이트 권리가 유지된다. 활성 이용권에서 업그레이드한 주문을 환불하면 기존 규칙대로 종료되어 앞선 이용권의 라이트 권리도 함께 사라진다.
- 라이트 운세를 쓴 이용권은 자동 환불되지 않고 고객센터 확인으로 넘어간다. 관리자 HQ 화면에는 라이트 사용 건수가 표시되지 않는다.
- 사주 18키의 단건 신규 판매는 닫혀 있고, 기존 구매자의 재열람만 유지한다.
- 5,000원으로 내린 상품은 월정석 최소 금액(10,000원)에 못 미쳐 월정석으로 결제할 수 없다.
- 앱에서 인상 전 만든 결제 의도를 복구하면 `APP_STORE_INTENT_PRICE_CHANGED`로 거부된다.

## 후속 항목 (수정하지 않음)

가격·문구:

- `app/_lib/serviceSections.js` 옛 가격
- `MayaPromptGeneratorCard.tsx`(3,000 vs 5,000)와 `worker/routes/tarot.js`(30 vs 50코인)
- `index.html:18761` 라이프북 라벨 "전문가 상담 · 10,000원"
- `home.tiles.sajuGuardianPrice` 등 미사용 사전 키, goldenPackages 설명
- `scripts/i18n-translate-remaining.mjs` 낡은 가격
- `PointsClient.tsx`·`cancelAtPeriodEnd`의 "이용권이 종료될 때까지" 문구
- 약관 조각 사전 `i18n/authored/shellRuntime-62.json`(가입 화면 임베드 약관의 비한국어 표시)

동작:

- `worker/payments/index.js`의 planId 없는 요청 레거시 해석
- `worker/routes/fortune.js:6314` `legalVersion` 기본값 2026-04-11
- `dream.js` 낡은 프롬프트 후보
- 천체 생성 소진 시 자동 환불 경로
- `describePassEligibility`의 비라이트 소진 판정이 건당 상한을 반영하지 않음
- `result.product.priceKRW`가 옛 구매 재열람에도 현재가를 돌려줌

결정 필요:

- `sajuDiary`(10,000원) 소비처 없음
- `premium-sibyl-dominator`, `premiumDivinationPack` 라이트 분류

기존 실패:

- `home-choice-carousel` 4건, `sitemap-volatile-lastmod-kst` 1건
- `verify-home-funnel.cjs` 낡은 단계
