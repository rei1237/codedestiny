---
status: measured-pilot-with-quality-followups
updated: 2026-09-30
next: Complete mock verification and CI for the separate evidence and wording fixes; review proposed pack terms without reusing the consumed live approval.
---

# 영냥이 고등어 6체계 원가·본문 품질 실측

## 실행 범위와 증거

사용자가 정확한 계획·모델·호출·예산을 승인한 단 한 번의 유료 검증이다. 운영 회원·결제·DB에 접근하지 않았으며, 승인된 실행이 끝난 뒤 추가 LLM 호출은 하지 않았다.

- 계획 SHA-256: `53a826fa0ed58794d95ab94d17eaf84ef491eae665a3e52ea7efcb815029e515`
- 실행 기준 HEAD: `a20bb6a4342254f27f5aea22373a8bba1aa9c08f`
- Production 실행 bundle: `7102cd5b173ec3b2595aa90ea41d53bbaafbb95d2f70665f2764e905e86b7a77`
- 실행기 소스 묶음: `b2a4bd8acf79438427400da72c9fd4749f689c9246b70d71c992060f252cf174`
- 모델: `gemini-2.5-flash` Standard. Prompt versions: `ask-chapter-v1-concise-20260930`, `chapter-v6-concise-20260930`.
- 신규 분량/예산 profile: `concise-reading-20260930`. 동일 합성 프로필(1997-02-10 12:00, F, 서울), 기준 2026-09-28, 체계별 8질문·5장.
- 사주·자미두수·숙요점·베다점·서양 점성술 질문 상담 각1권, 타로 career1권. 본문30+질문 분석5=생성35회, tokenizer35회.
- 사전 예약 한도 $1.105665 < 승인 $1.11. 호출당 입력 최대50,000, 전체 출력 상한232,266토큰(thinking 포함). timeout·실패도 예약을 소비하고 재시도하지 않는 고정 실행기를 사용했다.

**실행 결과:** 6권·30장 모두 첫 시도로 저장·전달됐다. 전35응답 finishReason STOP, 사용량 누락0. timeout·생성 실패·재시도·fallback·운영 DB·결제 접근은 모두0. 각 권의 q1~q8 답변 필드가 모두 존재한다. 이 구조상 성공을 의미 품질 완료로 간주하지 않는다.

실제 provider → `worker/lib/gemini.js` → `lib/llm-client.ts`가 구성한 요청을 그대로 사용했으며, 수동 serializer로 바꾸지 않았다. 정본 count/generation 요청 바이트와 KO·EN 언어 계약·잘린 응답 복구의 동등성, 예산·timeout·중복 실행 차단을 오프라인 8/8로 검증하고 실행했다.

## 사용자 검수용 전체 원문

본문은 요약으로 대체하지 않았다. 각 파일에 5장 전체, 8질문 답변, 전달된 전체 JSON을 함께 보존했다. 실제 회원 자료가 없는 합성 fixture이므로 가린 회원 개인정보는 없다. API 키·인증 URL은 산출물에 기록하지 않았다.

- [사주 전체 원문](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/readings/saju.md)
- [자미두수 전체 원문](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/readings/ziwei.md)
- [숙요점 전체 원문](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/readings/sukuyo.md)
- [베다점 전체 원문](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/readings/vedic.md)
- [서양 점성술 전체 원문](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/readings/astrology.md)
- [타로 전체 원문](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/readings/tarot.md)
- [상세 검수·경제성 보고서](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/README.md)
- [원문 위치를 포함한 품질 검수](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/quality-review.md)
- [권별 사용량·장별 분량·손익 수치](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/cost-and-quality-metrics.json)
- [실행 요약](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/summary.json), [호출별 사전 예산 예약](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/budget.json), [112파일 SHA 목록](C:/Users/user/.codex/visualizations/2026/09/30/01a0f064-7ff1-7953-8bc8-c43cb50ccd53/mackerel-benchmark-live-approved-1/evidence-sha256.json)

## 관측 사용량과 원가

실제 usageMetadata에 입력 $0.30/M·출력과 thinking $2.50/M를 적용했다. 일부 implicit cachedContentTokenCount가 있으나 캐시 할인을 차감하지 않은 보수적인 정가 환산이다. 실제 청구서 금액이 아니다. 환율1,400원은 가정이다. [Gemini 공식 Standard 가격](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash)을 실행 당일 확인했다.

| 체계 | 입력 토큰 | 출력 본문 | thinking | LLM 정가환산(원) |
|---|---:|---:|---:|---:|
| 사주 | 50,626 | 12,077 | 4,101 | 77.89 |
| 자미두수 | 44,907 | 13,393 | 4,293 | 80.76 |
| 숙요점 | 38,680 | 9,645 | 3,970 | 63.90 |
| 베다점 | 56,302 | 11,810 | 3,933 | 78.75 |
| 서양 점성술 | 51,622 | 11,461 | 4,102 | 76.15 |
| 타로 | 74,466 | 10,932 | 4,366 | 84.82 |

전체 $0.3301884 ≈462.26원. 권당 평균77.04396원, 최대84.81872원이다. 이는 6고객이 아니라 **한 합성 프로필의 6체계 표본**이다. 가입 회원의 운영 평균·미래 최댓값·0% 실패율을 보장하지 않는다.

고등어 보수 판매 시나리오는 `관측 최대84.81872 × 2 + 별도 변동비 예비분50 = 219.63744원/회`로 계산한다. 두 배는 관측 재시도율이 아니라 예비 시나리오다. 연어·광어·참치는 실제 호출하지 않았으며 기존 코드의 입력/출력 상한·챕터별2회·질문분석 상한 시나리오872/1,329.84/2,337.01원(각50원 예비분 포함)을 사용한다. 고등어 원가를 상위 상품에 외삽하지 않는다.

## 전용 횟수권 검토 후보 — 미적용

월 전체50팩, 서버$70×1,400=98,000원, 가입혜택 월100회 사용, VAT10%, PG4%, 매출 대비 운영 잔여금 목표30%를 가정한다. 세율·수수료는 실제 계약/청구 확인값이 아니다. 목표30%는 검토용 기준이며 대표 급여·법인소득세는 미포함이다. 가입 사용은 매출이 없는 획득비다. 팩별 서버1,960원, 가입비2×219.63744원을 배분한다.

`월 잔여금 = 50×(가격/1.1 − 가격×0.04 − 횟수×회당비용) − 98,000 − 100×219.63744`

| 검토안 | 단건 대비 할인 | 팩당 잔여금 | 매출 대비 | 판정 |
|---|---:|---:|---:|---|
| 고등어5,000원/7회 | 28.57% | 408.72원 | 8.17% | 목표 미달 |
| 고등어9,900원/14회 | 29.29% | 3,129.80원 | 31.61% | 기본 가정에서 충족, 여유 작음 |
| 고등어9,900원/13회 | 23.85% | 3,349.44원 | 33.83% | 할인과 여유의 대안 |
| 연어11,900원/5회 | 20.67% | 3,582.91원 | 30.11% | 목표 여유0.11%p로 얇음 |
| 연어15,900원/7회 | 24.29% | 5,315.27원 | 33.43% | 여유를 늘린 대안 |
| 광어19,900원/5회 | 20.40% | 8,246.43원 | 41.44% | 기본 가정에서 충족 |
| 참치39,900원/5회 | 20.20% | 20,592.40원 | 51.61% | 기본 가정에서 충족 |

사용자에게 공유한4종 검토 후보는 고등어9,900원/13회(혜택 우선 비교안14회), 연어15,900원/7회, 광어19,900원/5회, 참치39,900원/5회다. 포함 횟수를 모두 단건 가격의 상담에 사용했을 때 할인이며, 미사용·쿠폰·추가 할인은 제외한다. 유효기간·환불·미사용분 조건은 정의되지 않았다. 이 표는 정책 승인이나 판매 적용이 아니다. 기존 이용권·월정석·단건 가격을 이 보고서가 바꾸지 않는다.

고등어9,900/14만 월50팩일 때 가입사용0/50/100/300회의 잔여금 비율은36.05/33.83/31.61/22.74%다. 가입 수는 미래 가정이며 자동 지급 횟수나 악용 비용의 생애 한도를 뜻하지 않는다. 다른 상품의 이익으로 낮은 상품 마진을 숨기지 않는다.

서버비에 같은 변동비가 포함되어 별도50원을0으로 둘 경우 5,000/7은17.17%,9,900/14는39.69%다. 실제 변동비0의 증거가 아니라 중복 가능성 비교다. 고등어9,900/14에서 FX1,400/1,500/1,600에 맞춰 LLM·서버비를 함께 환산하면31.61/28.24/24.87%이므로30%를 보장할 수 없다.

## 실측에서 발견한 의미 품질 문제

- 체계 혼합(P1): 자미두수 q7/q8에 사주 천간충·숙요·수비학, 숙요 q7에 사주 정재·오미합, 서양 점성술 q7에 사주 세운·육합을 근거로 사용했다. 실제 입력에도 `*.sajuYearlyLuck`, `*.todaySukuyo`, `*.todayNumerology`가 있어 자료 선택 경계 문제와 구별해야 한다.
- 성향·경험 단정(P2): 사주 “강점을 반복적으로 보여주십니다”, “타고난 성향이므로 항상”, 서양 “출생 차트 기반 성향으로 항상 나타납니다”, 숙요 “문서로 기록하는 습관을 계속 유지” 등 실제 행동 이력 없는 전제가 있었다.
- 기간 근거(P2): 베다 q7은 출생9하우스 배치만 이유로 들면서2026년 한 해를 붙였다. 타로 q1은 이번 카드의 선택 패턴을 “지속적으로 적용될 고유한 강점”으로 확장했다.
- 질문 답변은8/8 존재하고 작은 행동도 있지만, 일부 ‘올해 관찰할 신호’는 추상적 기회·변화로 답하거나 다른 체계 근거를 사용했다. 전문 의미의 정확성을 전수 재검산한 결과는 아니다.

## 실측 이후의 별도 개선 — 유료 미재검증

이 절은 위 고정 plan 실행 이후의 코드다. 과거 원문·usage·SHA를 다시 생성하거나 새 버전의 실측인 것처럼 바꾸지 않는다.

1. 단일 체계 새 prepare에서 허브 crossDaily 추가를 생략하는 별도 수정: `service.ts`. 허브는 출생지 시간대를 보존하지 않는 별도 입력 계약이므로 같은 체계 이름이라도 원차트와 동일한 근거로 간주하지 않는다. 주체계 엔진 사실·시기 근거·원본 카탈로그 manifest·기존 저장 snapshot을 보존한다. 원차트에 시기 근거가 없으면 limited 답변을 유지한다. public hub/fusion 기본 동작과 API는 바꾸지 않는다.
2. `concise-reading-prompt.ts`의 `concise-evidence-language-20260930-r2`: 현재 습관·불변 기질 단정, 타로 카드의 고유 성격 확정, 기간 근거 없는 연간 해석을 명시적으로 구분한다. 기존4등급 tierDepth·목표·출력 토큰·재시도·검사 게이트는 바꾸지 않는다.

fortuneMaster/persona/domainRules/taskRules/consultation-quality/shared/ask prompt를 좁게 추적했으며, “항상/타고난 기질로 확정하라”는 반대 지시는 찾지 못했다. 기존 금지는 과거 사건·미래 사건 중심이라 현재 습관과 timing 필드의 성향 불변 주장을 구체적으로 한정하지 못한 빈틈을 보완했다. mock 계약은 실제 모델의 문장 개선을 증명하지 않는다.

이후 추가 LLM 호출은0회이며 기존 승인 marker는 소비된 채 유지한다. 프롬프트·근거 필터가 바뀌었으므로 이 실측값을 새 코드의 확정 원가·품질로 표시하지 않는다. 새 유료 검증은 필요성을 판단한 뒤 별도 정확 범위 승인 없이는 실행하지 않는다.

## 후속 mock 검증과 해시 갱신 근거

통합 targeted 검증 **39/39 통과**:

```powershell
node --test __tests__/ui/yeongnyangi-reading-invariance.test.mjs __tests__/ui/yeongnyangi-reading-v7-wiring.test.mjs __tests__/ui/yeongnyangi-provider-boundaries.test.mjs __tests__/ui/yeongnyangi-minimum-delivery.test.mjs __tests__/ui/yeongnyangi-native-daily-evidence.test.mjs
```

invariance123행에서 요청 ID와 원본 카탈로그 manifest 해시는 전부 불변이다. 새 단일 체계 legacy-client/ask 준비에서 별도 허브의 crossDaily facts를 제외해42행 prepare 해시, 그 근거 ID를 사용하는25행 mock 전달본 해시가 바뀌었다. 12개 fusion 준비/전달본 해시는 그대로다. 모든 신규 concise 요청은 글쓰기 계약이 바뀌므로123행 request 해시만 공통 변경된다. `legacy` 라벨은 기존에 저장된 구매가 아니라 consultationKind를 생략한 새 요청이다.

기존 저장 요청의 목표·예산·완료된 본문이 이 새 준비 경로로 마이그레이션되지 않는 회귀, 이전 profile의 provider 요청에 concise 계약이 들어가지 않는 회귀도 통과했다. 목표 분량·출력 토큰·4등급 tierDepth·섹션 구성·저장 사실의 소유 경계는 prompt 보완으로 바뀌지 않았다. 전체 CI와 개선 후 실제 모델의 의미 품질은 이39개 mock 결과만으로 증명하지 않는다.

검증 증거는 `build-cache/yeongnyangi-payment-alliance/mackerel-postpilot-native-only-proof.txt`와 `native-only-invariance-diff.json`에 보존했다. 금융 전 고정 커밋 `f8036cef613433d23cecc016f7b1fdf8f08ae97e`의 두 가격 registry를 메모리에서 치환한 비교에서도123행 해시가 같으며, 월정석 정책 변경은 이 준비 입력으로 직렬화되지 않는다. 실제 사용한 registry 바이트 SHA와 고정 커밋 일치는 `financial-baseline-invariance-provenance.json`에 기록했다.
