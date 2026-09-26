---
status: active
updated: 2026-09-27
next: "P1(paid-narrative 공통 헬퍼 11개 서비스)부터 한 세션에 한 단계씩. 영냥이는 완료."
---

# 모든 유료 LLM: 분량 미달로 전달이 막히지 않게 (단계 계획)

## 요구 (사용자 원문, 2026-09-27)

> 모든 LLM 기능들이 분량 기준이 아니라 내용이 좋아야해 분량 실패로 생성 실패해서 고객에게 전달안되는 일이 없도록 최적화해주길 바란다

앞선 요구(2026-09-26, 영냥이 참치 사건): 소절 분량 부족으로 12회나 이미 만든 장을 버리고 다시 생성했다. LLM 비용이 낭비됐고 고객에게 결과가 제대로 전달되지 않았다.

## 규칙 (정본은 [ai-and-db](../context/ai-and-db.md#llm-안전-규칙-2026-08-28-agentsmd-에서-이관))

| # | 규칙 |
|---|---|
| L1 | 분량 미달만으로는 생성 실패가 되지 않는다. |
| L2 | 첫 시도가 하한에 못 미치면 기존 재시도 예산 안에서 보강을 1회 요청한다. 보강본(또는 마지막 시도)은 분량을 이유로 거부하지 않는다. 판정은 구조(파싱·필수 섹션·빈 본문)·안전·근거·반복만 한다. 후보가 여럿이면 가장 긴 유효본을 쓴다. |
| L3 | 상한을 넘으면 거부하지 않고 결정적으로 자르거나 나눈다. |
| L4 | 모델이 자주 어기는 형식(문단 수·문장부호 끝)은 분할·병합·정규화로 교정한다. |
| L5 | 출력 토큰은 `tokensRequiredForChars(목표 상한)` + thinking 이상으로 둔다. `attempts:1` 이면 `callGeminiJsonWithRetry` 의 cap 확장이 동작하지 않으므로, base 자체를 필요치 이상으로 둔다. |
| L6 | 총합 20,000자 하한(`PAID_REPORT_MIN_BODY_CHARS`)은 상품 문구와 연결돼 있을 수 있어 **사용자 결정이 필요하다**. 선택지는 미달 시 부족분 보강 1회 뒤 수용, 또는 현행 유지다. 결정 전에는 건드리지 않는다. |

## 완료: 영냥이

- 장·소절 거부선을 목표 하한의 70%로 낮췄다(1e50c2654).
- 분량 보강본은 분량으로 다시 거부하지 않는다(`LENGTH_FAILURES`, `validateReadingQuality` 의 `lengthRepair`).
  - `validateChapter` 는 직전 실패 코드가 분량일 때 이 옵션을 켠다.
  - 테스트: `__tests__/ui/yeongnyangi-reading-v6.test.mjs` "a length repair is never rejected…". 변이 검사로 가드가 동작함을 확인했다.
- 보관함·상세의 구매자 재시도 버튼을 보류 주문에도 연다(e8a221c70, a828e4959).
- 남은 영냥이 형식 거부: `worker/yeongnyangi/providers/chapter.ts:59-63` 필드 5000자 초과 시 `INVALID_CHAPTER`. P4 에서 분할 교정으로 바꾼다.

## 전수 조사 (2026-09-27, 읽기 전용·실호출 0)

- 방식: `git grep`/코드 읽기.
- 환산: `worker/lib/llm-budget.js` 1.5토큰/자 + 1,500자.
- 여유는 `floor(토큰/1.5) − 목표 상한` 이다.
- 표시가 없으면 코드로 확인한 값이고, [추정] 은 추론이다.

**공통 사실:** 유료 주 경로 어디에도 "마지막 시도가 짧아도 완료로 수용" 하는 장치가 없다. 섹션 하나가 분량 미달로 3회 거부되면 경로마다 다음 중 하나로 끝난다.

- 환불: 사주 2차, 점성술, 베딕, 자미, 낙샤트라, 네오, 자미 심층, 관계 궁합
- 이용 취소: 신년, 카르마
- 보류: 나침반·휴먼디자인 202, paid-narrative·작명·천체 `retryable:false`

부분 수용은 세 곳뿐이다: 초융합 degraded 배달, 찻집 레거시 degrade, 무료 숙요 200자 수용.

### 대형 유료 리포트

| 서비스 | 위치 | 하한/목표 하한 | 문제 |
|---|---|---|---|
| 숙요 궁합 | `worker/routes/sukuyo-compatibility-ai.js:1442-1492,1553` | 1500/1500 = **1.0** | `attempts:1` 이라 실효 토큰이 8000(5333자)이다. 그룹 하한 4500자에 필요한 9000토큰에도 못 미친다(**부족**). 잘리면 그룹 3섹션을 통째로 버린다. 카드 결제는 환불 제외(`:1684`). |
| 수호 운세 | `worker/lib/guardian-fortune-llm.js:124,170`, `guardian-fortune-prompt.js:313` | 2600/2600 = **1.0** | 5200토큰(3466자)으로 목표 상한 3600자에 **−134자**다. 주석의 "글자당 1토큰" 이 틀렸다(`guardian-fortune-llm-policy.js:7-9`). |
| 초융합 | `worker/lib/fusion-fortune.js:663-667,745-760` | 3600/4300 = 0.84 | 자체 환산(×1.8+900 = 8640)이 필요치 10350 보다 작다. 섹션 `section_depth` 는 하드 거절이다. |
| 신년운세 | `worker/routes/new-year-ai.js:74-123,2305-2350` | 4000/4000 = **1.0** | 토큰 여유가 +1500으로 최소치에 딱 걸린다. |
| 운명 나침반 | `worker/lib/destiny-compass-report-contract.js:392-430` | 2000/2000 = **1.0** | 소진되면 202 보류(환불 없음)다. |
| 휴먼디자인 | `worker/routes/human-design-report.js:545-632` | 비율 **1.0** | 202 partial 보류. 총합이 미달이면 섹션을 degraded 로 강등한다. |
| 카르마 | `worker/routes/karma-destiny-ai.js:145-317,2637-2644` | **0.857~0.89** | 이용 취소 503. |
| 인생책 | `worker/routes/life-book-ai.js:1300-1360` | 전문가 **0.857** | 장은 공백 포함 `.length`, 총합은 공백 제외로 센다(기준 불일치). |
| 자미 AI | `worker/routes/ziwei-ai.js:1490,1791-1843` | 0.79~0.80 | 목표×1.25를 넘으면 거절한다. 프롬프트 `:1490` 은 1.35×를 허용해 서로 충돌한다. |
| 점성술 AI | `worker/routes/astrology-ai.js:1179-1188` | 0.79 | 6000자를 넘으면 거절한다(L3 위반). |
| 베딕 AI | `worker/routes/vedic-ai.js:1450-1462` | 0.80 | 7000자를 넘으면 거절한다(L3 위반). |
| 자미 심층 | `worker/routes/ziwei-deep-report.js:245-286` | 실효 >1 [추정 약 1.2] | 프롬프트는 "공백 포함 최소 min", 판정은 공백 제외다. |
| 네오 작전실 | `worker/routes/neo-operation-room.js:1698-1743` | 0.83 | 섹션 하한 합이 20050이다. 총합이 20000에 못 미치면 즉시 `LLM_FAILED` 다. 공백 기준이 `:818`·`:1708` 에서 서로 다르다. |
| 낙샤트라 | `worker/routes/nakshatra-ai.js:692-710` | 0.83 | 환불 503. |
| 운명의 섬 12궁 | `worker/lib/island/consult/palace-delivery.js:37-54`, `worker/routes/ziwei-island-ai.js:538` | 0.83 | 캐시에 `minChars` 를 넘기지 않아 30일 캐시가 미달 응답을 저장할 수 있다. |
| 찻집 | `worker/routes/fortune-tea-house.js:4157-4252` | 0.83 | 소진되면 202 보류. |
| 사주 AI | `worker/routes/fortune.js:470-474,1137-1152` | 0.80 | 2차에서 자동 환불된다. |
| 연애 비밀 | `worker/routes/love-secret-ai.js:788-809` | 0.70 | 결제 게이트 복원 503. |
| 마스터 연애 코덱스 | `worker/lib/master-love-codex-quality.js:162-186` | 약 0.6 | 원시 `body.length` 로 센다. 부분 책은 보류된다. |

### paid-narrative 공통 헬퍼 (`worker/lib/paid-narrative-delivery.js:110-113`)

- 적용 서비스: 질문형 상담, 꿈 심리, 지오맨시 오라클, 연애 타로, 마인드스캔, 타로 오라클, 요가 구루, 애니멀 토템, 반려동물 사주, 전문가 후속, 수호 운세 전달.
- 판정: 공백 제외 본문이 `task.minChars` 미만이면 거절한다. task당 3회까지 시도한다.
- 소진 시: 202 `retryable:false` 보류, 또는 `onExhausted` 로 환불(질문형 상담).
- 형식 거절:
  - 연애 타로: matrix 정확히 4문단 (`worker/lib/love-tarot-delivery.js`)
  - 마인드스캔: summary 정확히 10문단 (`worker/lib/mindscan-delivery.js`)
  - 질문형 상담: 문장부호로 끝나야 함 (`worker/lib/feature-question-delivery.js:67`)

### 그 밖

- 작명 `worker/lib/naming-report-delivery.js`: 0.78. 빈 품질 실패는 503, 그 외는 보류.
- 천체 조화 `worker/lib/celestial-report-delivery.js`: 0.77. 보류.
- 관계 궁합 `worker/lib/relationship-report-delivery.js:50-100`: **한 파트라도 3회 무효면 다른 파트가 있어도 환불로 끝난다.**
- 공통 헬퍼 `worker/lib/structured-consultation.js:57-104` `callGeminiJsonWithRetry`: 길이 검사가 없고 가장 긴 성공본을 돌려준다. `attempts:1` 이면 cap 확장이 동작하지 않는다(숙요 궁합·섬·초융합·관계 궁합·애니멀 토템).
- mock 가드 `scripts/verify-llm-generation-resilience.mjs:1080-1120`: `MAX_FLOOR_TO_TARGET` 0.8. dream·master-love-codex 는 예외로 빠져 있다. 런타임에서는 강제하지 않는다.

### 확인 못 한 곳

- 초융합 복구 태스크의 최종 처리 (`worker/lib/fusion-fortune-recovery-task.js:82`)
- 섬 일부 파트 소진 시의 retryable 값
- 찻집 필드 절단과 글자 수 판정의 순서
- 애니멀 토템 3·5장 모드
- 전문가 후속·반려동물의 토큰
- `worker/routes/fortune.js:5226` 이후의 형제 기능
- 비고객 출력(threads·admin·i18n)은 범위 밖이다.
- 실제 출력 분량은 실호출 금지로 측정하지 않았다. 코드 주석의 실측값만 참고했다.

## 단계 (한 세션에 한 단계; 모두 RED; 검증은 mock만)

| 단계 | 범위 | 핵심 변경 | 검증 |
|---|---|---|---|
| **P1** | `paid-narrative-delivery.js` (11개 서비스) | 분량만 미달인 마지막 시도를 수용한다(L2). 그 외 거부 사유는 그대로 둔다. 섬 캐시에 `minChars` 를 추가한다. | 헬퍼 단위 테스트(분량 미달 3회 → 수용, 반복·잘림 → 기존대로). 변이 검사. `paid-gate-auditor`. |
| **P2** | 토큰 부족 3곳 + 신년 | 숙요 궁합 base ≥ 12,375, 하한 = 목표 하한×0.8. 수호 ≥ 7,650(env 범위 포함)과 주석 수정. 초융합 환산을 `tokensRequiredForChars` 로 교체. 신년 여유 확대. | `verify-llm-generation-resilience` 확장. 각 라우트 mock 테스트. |
| **P3** | 대형 리포트 라우트 18개 | 섹션 분량 판정에 L2(보강본 수용)를 적용한다. 점성술·베딕·자미 상한 거절은 자르기로 바꾼다(L3). 자미·자미 심층·네오·인생책 프롬프트의 공백 기준을 판정 기준(`countPaidReportBodyChars`, 공백 제외)과 통일한다. 비율 1.0·0.85+ 인 곳은 프롬프트 목표를 하한/0.8 이상으로 올린다. | 라우트별 mock 테스트. 서비스 3~4개씩 나눠 커밋한다. |
| **P4** | 형식 교정 | 연애 타로 4문단·마인드스캔 10문단은 분할·병합으로 맞춘다. 질문형 문장부호 끝은 정규화한다. 영냥이 필드 5000자는 분할한다. | 단위 테스트. |
| **P5** | 구조 | 관계 궁합이 한 파트 실패로 전체 환불되는 구조를 부분 수용 + 재시도로 바꾼다. L6(총합 20,000) 결정을 사용자에게 받는다. | 결정 뒤 설계. |

각 단계 공통 절차:

1. 가장 가까운 기존 구현을 먼저 읽는다(원칙 15).
2. `regression-scout` 로 공유 헬퍼의 영향을 확인한다.
3. 변경마다 `npm run check:fast` 를 돌린다.
4. `paid-gate-auditor` 로 결제 정책 이탈을 감사한다.
5. commit → push → CI 까지 진행한다. 운영 승격은 별도로 1회 승인을 받는다.
6. 과금 LLM 실호출로 통과율을 확인하려면 호출 1회마다 정확한 승인을 받는다.

## 기각한 것

- **하한을 일괄 0으로 낮추기:** 빈 본문이나 한 줄짜리 응답까지 통과한다. 구조·반복 판정은 남긴다.
- **한 번에 30개 경로 수정:** 결제 경로 전체가 한 커밋 묶음에 들어가 롤백 단위가 사라진다.

## 다음 세션 첫 문장

"docs/handoff/2026-09-27-llm-length-never-fatal.md 를 읽고 main·clean 확인과 git pull --ff-only 후 P1(paid-narrative-delivery 공통 헬퍼: 분량만 미달인 마지막 시도 수용)을 진행하라."
