---
status: active
updated: 2026-10-02
next: "docs/handoff/2026-10-02-palm-reading-logic-and-token-cap.md 를 읽고 손금 로직 개선과 토큰 상한 정리를 1번부터 순서대로 끝까지 진행해. 0번(결제 전 본문 노출)은 RED 결정이 필요하니 착수 전에 선택지를 먼저 물어봐"
---

# 손금 로직 개선 + 비전 토큰 상한 정리

## 왜

사용자 원문: "다음 세션에서 할 일에 대해서 손금 로직 개선과 토큰 상한까지 작업해주도록 인수 인계 문서 만들어줘"
손금(`palm-reading-general`, 50코인=5,000원, 유료 판매 중)의 판독·해석·오류 표시를 개선하고, [llm-optimization-leftovers](llm-optimization-leftovers.md)에 남아 있던 손금 비전 `capTokens` 불일치를 정리한다.

## 지금 상태

- 2026-10-03 0~5번 모두 완료(커밋 9ddd2ea18·4934e352e·f5ef36d22·37641b4d6·e35dc8039, 0번은 사용자 선택 "POST는 메타만"). 아래 사실은 착수 전 2026-10-02 `origin/main` 기준 코드 실측(Explore 조사 + 직접 확인)이다. 줄 번호는 착수 전 `git grep` 으로 다시 확인한다.
- 흐름: `PalmDestinyMain.tsx` → `POST /api/palm/analyze`(`worker/routes/palm.js`) → 손별 비전 `analyzeHandWithGeminiVision`(병렬, `worker/lib/palm-vision.js`) + 결정론 엔진(`lib/palm/palm-map-engine.js`) 병합 → 심층 해석 `buildPalmDeepConsult` → `savePalmAnalysis` → 결제 → `GET /api/palm/result`(결제 증명 확인, `worker/lib/palm-result-delivery.js`).
- 결제 전에 생성·저장까지 끝내는 것은 의도된 설계다(`scripts/lib/paid-delivery-inventory.mjs` 의 `deliveryReadyBeforePayment`).

## 남은 작업 (항목당 커밋 하나, 순서대로)

- [x] **0. 🔴 RED·결정 필요 — 결제 전 유료 본문이 POST 응답으로 나간다.** `palm.js` 끝의 `return json(... savePalmAnalysis(...) : result)` 가 `interpretation.consultText` 전문을 돌려준다. 클라이언트도 결제 전에 sessionStorage에 저장한다(`PalmDestinyMain.tsx` 의 `runBillingCoinGate` 직전). 로그인 사용자는 POST만으로 본문을 얻는다. `requestId` 가 없으면 저장도 하지 않는다.
  - 추천 선택지: POST는 판독 가능 여부·`requestId`·`analysisSaved`·`mode`만 반환하고, 본문은 결제 뒤 `GET /result` 로만 받는다. 재열람 경로는 이미 있다(`recoverPalm`, `paid-result-recovery.ts`).
  - 영향: `verify-palm-mobile-payment-recovery`(Playwright mock), `__tests__/worker/palm-paid-delivery.test.js`, 결과 화면이 POST 응답을 쓰는 곳.
  - 사용자 승인 없이 착수하지 않는다. 결제 문서([payment-gating](../context/payment-gating.md))와 `paid-gate-auditor` 를 먼저 거친다.
- [x] **1. 토큰 상한 정합.** `palm-vision.js` 비전 호출의 `capTokens: 12288` 을 `Math.round(8192 * 1.3)`(=10650)으로 바꾼다.
  - 근거: `worker/lib/structured-consultation.js` 에서 비어 있지 않은 응답은 잘렸어도 바로 반환되고, 재시도는 최대 2회(`attemptLimit`)라 실제 최대는 10650이다. 손금은 결제 생성 컨텍스트 밖이라 `attempts: 2` 가 그대로 적용된다.
  - 절감 0, 코드가 사실을 말하게 하는 변경이다. 리터럴 단언 테스트는 없다. 🔴 leftovers 문서의 "assertBudget 동반 수정"은 틀렸다. 손금은 assertBudget 대상이 아니다.
- [x] **2. 503 오류 문구 덮어쓰기.** `lib/palm/palm-ui-state.js` 의 `mapPalmAnalyzeError` 가 `status === 503` 을 먼저 잡는다. 그래서 `PALM_INTERPRETATION_INCOMPLETE`·`RESULT_STORAGE_UNAVAILABLE` 이 전부 "일시적인 접속 문제" 문구로 바뀐다. 코드별 분기를 503 검사보다 앞에 둔다.
  - 판정 기준: 두 코드마다 다시 시도를 안내하는 고유 문구가 나온다.
- [x] **3. 모델 장애가 "손바닥 인식 실패"(422)로 보인다.** 비전이 null(장애·JSON 파싱 실패)인데 클라이언트 랜드마크가 없으면 `PALM_NOT_DETECTED` 가 나간다. 모델이 명시적으로 `palmDetected:false` 를 준 경우와 구분해 재시도 가능한 503 코드로 돌려준다.
  - `palm-paid-delivery.test.js` 가 지금의 422 동작을 고정하고 있다. 기대값을 함께 바꾸고 커밋 메시지에 의도를 적는다.
  - "결정론 엔진으로 degrade한다"는 `palm.js` 주석은 낡았다. 이미지가 있으면 비전 없이는 전달되지 않는다. 주석을 고치되, 아래 함정의 마커 문장은 유지한다.
- [x] **4. 기본값이 판정을 정하는 지점.** 모델이 값을 빼면 `palmCoverage` 를 0.58/0.36(`palm-vision.js`)으로 채운다. 이 두 값이 품질 문턱 0.42(`palm.js` `isEnoughQuality`)의 양쪽에 걸쳐 있어, 판정이 "선이 하나라도 잡혔나"로만 결정된다.
  - 깊이·길이 기본값 `"medium"` 때문에 양손 비교가 "유사"로 수렴한다(`lib/palm/both-hands-comparison.js`).
  - 기본값으로 채운 필드를 표시해 두고, 비교·품질 판정에서는 "모름"으로 취급한다.
  - 판정 기준: 필드가 빠진 mock 응답에서 비교가 "유사"로 단정되지 않는다.
- [x] **5. 심층 해석 분량 계약.** 합격선은 공백 제외 120자(`PALM_CONSULT_FALLBACK_MIN_CHARS`)다. `PALM_CONSULT_MIN_CHARS=1200` 은 어디서도 쓰이지 않는다. 프롬프트에는 전체 분량 목표가 없고 18개 ■ 섹션에 "각 항목 최소 3문장"만 있다. `maxOutputTokens` 는 8192다.
  - CLAUDE.md 원칙 17을 따른다: 목표를 명시하고, 하한은 목표의 80% 이하, 출력 토큰은 목표 상한 + 여유 이상, 결과가 안 나오는 상황은 만들지 않는다.
  - 분량 상향은 비용이 늘 수 있어 수치를 먼저 보고한다. 실호출 검증은 정확한 1회 승인 없이 하지 않는다.
  - `normalizeNarrativeBody` 는 문장부호 없는 문단을 버린다. "■ 제목" 줄이 단독 문단이면 사라지는지 mock으로 확인한다.

## 범위 밖 (보고만)

분석 목적 UI가 없어 `general` 고정, 캐시·rate limit 없음([leftovers](llm-optimization-leftovers.md) F), 오류·비교 문구 한국어 하드코딩, `PalmDestinyMain.tsx` 가격 주석 "100코인/10,000원"(실제 50코인), 품질 오류에 HTTP 423 사용.

## 함정

- `scripts/verify-palm-flow.mjs` 는 소스 리터럴을 단언한다. 비전 호출 블록을 `callGeminiJsonWithRetry(env` ~ `if (!ai?.ok)` 로 잘라 `geminiParts: parts`·`fallbackToWorkersAI: false` 를 보고, `PALM_CONSULT_FALLBACK_MIN_CHARS = 120` 도 본다. 바꾸면 검증기도 같은 커밋에서 고친다.
- `verify-llm-generation-resilience.mjs` 는 `palm-vision.js` 의 LLM 호출부를 정확히 2개로 센다.
- `__tests__/fixtures/paid-non-llm-delivery-fixtures.mjs` 는 `palm.js` 의 주석 "구 palm-reading-ai-consult(별도 5,000원 과금)가 하던 일을 기본 분석에 통합했다"를 마커로 쓴다.
- 비전은 `fallbackToWorkersAI:false` 를 유지한다. 폴백 경로는 사진을 버리고 판독을 지어낸다(`palm-vision.js` 상단 주석).
- `worker/` 를 고치면 CI가 critical 티어로 돈다.

## 검증

```
npm run verify:palm-flow
npm run verify:palm-mobile-payment-recovery
node scripts/verify-llm-generation-resilience.mjs
npm run check:fast -- --base=<시작 SHA>
```

## 모르는 것

- 실제 비전 잘림률·JSON 파싱 실패율(`[palm-vision] json parse failed` 로그). 1번 이후 cap 상향이 필요한지는 이 수치로 정한다.
- 서버 최악 시간(비전 20초 + 해석 25초 + DB)이 클라이언트 게이트 `holdPaidFeatureGateOpen maxMs 45000` 을 넘을 때 화면이 어떻게 되는지(추정, 미확인).
