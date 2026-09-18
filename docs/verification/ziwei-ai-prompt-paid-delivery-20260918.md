# 자미두수 AI 질문 프롬프트 생성 유료 전달 검증 — 2026-09-18

대상은 재검증표 20행(`ziwei_ai_prompt_generator`, "자미두수 AI 질문 프롬프트 생성")이다. 정본은 19행과 같은 공유 라우트 `worker/routes/fortune.js`의 `handleZiweiAIPrompt`(5213~5356행)이며, 실제 전달 로직도 19행과 동일하게 형제 3개 상품(astrology/sukuyo/vedic)과 공유하는 [`worker/lib/feature-question-delivery.js`](../../worker/lib/feature-question-delivery.js)의 `deliverFeatureQuestion`/`readFeatureQuestionRequest`(공유 원시함수 `runPaidNarrativeDelivery`)에 있다. 클라이언트 진입점은 정적 셸 [`js/saju-engine.js`](../../js/saju-engine.js)의 `_zwInitDeepAiPromptPanel`(21930행)이 `_cdBindQuestionRecovery('ziwei', ...)`(21960행)을 호출해, 19행이 수정한 공유 함수 `_cdMountQuestionRecovery`/`_cdBindQuestionRecovery`(7235·7289행)로 복구를 위임하는 구조다.

## 발견과 수정

이번 행은 새 결함이 없다. 19행이 `_cdMountQuestionRecovery`(7235행)에 추가한 `pageshow`(`event.persisted` 게이트)·`focus` 리스너는 `kind` 인자로 분기하지 않는 완전한 제네릭 코드다 — 직접 읽어 확인한 결과 `kind`는 URL 조립(`'/api/fortune/' + kind + ...'`)과 sessionStorage 키 네임스페이스(`'cd.question.result:' + owner + ':' + kind`)에만 쓰이고, 리스너 등록·게이트 조건 어디에도 `kind` 분기가 없다. 즉 ziwei가 19행 수정의 코드 변경 없이 그대로 혜택을 받는다는 19행 문서의 예측을, 이번 행에서 직접 소스 재확인으로 검증했다.

**신규 테스트를 추가하지 않았다.** `__tests__/ui/feature-question-recovery.behavior.test.js`의 기존 10건은 `kind` 인자로 리터럴 `'astrology'`를 쓰지만, 위에서 확인했듯 `kind`는 로직 분기에 관여하지 않으므로 같은 함수를 `'ziwei'`로 다시 호출하는 테스트를 추가해도 동일한 코드 경로를 동일하게 실행할 뿐 새로운 신호를 만들지 않는다. 대신 기존 스위트로 회귀 여부만 재확인했다(아래 "재검사 명령과 결과").

## 대조 결과

- **가격:** `worker/lib/paid-feature-registry.js:307` `{ cost: 100, reason: "자미두수 AI 질문 프롬프트 생성" }`. `docs/pricing/PRICING_AUDIT.md:105-124`의 "코인 100 = ₩10,000" 표에도 `ziwei_ai_prompt_generator`(120행)가 형제 astrology(263)·vedic(264)·sukuyo(265)와 같은 줄에 열거돼 있어 100코인=₩10,000임을 교차 확인했다. 체크리스트 라벨과 레지스트리 `reason` 문자열이 정확히 일치한다.
- **별칭 구조(19행과 동일):** `paid-feature-registry.js:543-548`은 astrology/vedic/ziwei/sukuyo 4개 `*_ai_prompt_generator`가 함께 열거된 단순 배열 멤버십이며 별도 별칭 테이블은 없다.
- **품질 게이트 전량 모킹 함정(8·14행 반복 패턴) — 이번에도 해당 없음:** `__tests__/worker/feature-question-paid-delivery.test.js`를 전체(80행) 재열람해 독립적으로 재확인했다(19행 결과를 그대로 재사용하지 않음). `worker/routes/fortune.js`를 `ts.createSourceFile`로 파싱해 `handleZiweiAIPrompt`를 포함한 4개 핸들러의 실제 함수 본문을 `getText`로 추출한 뒤 `vm.runInContext`로 그대로 실행하고(41~63행), `readFeatureQuestionRequest`/`deliverFeatureQuestion`도 `worker/lib/feature-question-delivery.js`에서 그대로 import한다(30행). 모킹은 인프라 경계(`connectDb`·`requireAuth`·`access-control.js`·Mongo 모델·`callGeminiText`)에만 한정된다.
- **"자미두수 6체계 계산 사실 보존" 표현 정정:** 19행 인수인계 메모는 20행의 보존 대상을 "자미두수 6체계 계산 사실"로 적었으나, 리포지토리 전체에서 "6체계"는 초융합(3행)·영냥이(74행) 등 사주+자미두수+숙요+베다+서양점성술+타로 6개 시스템을 조합하는 별도 상품군에서만 쓰이는 용어이고(`git grep` 확인), 자미두수 AI 질문 프롬프트 생성 자체에는 그런 개념이 코드에 없다. 실제로 보존해야 할 "계산 사실"은 `js/saju-engine.js`의 `_zwBuildPromptChartResult`(21759~21854행)가 만드는 `chartResult` 객체(사용자 생년월일시·명궁/신궁·연간·국·사화·대한/유년 흐름·12궁 주성/보좌성 등)다. 19행 메모의 서술은 부정확했던 것으로 판단되며, 이번 행 검증은 실제 `chartResult` 구조를 기준으로 진행했다.
- **형제 상품 영향:** 21행(sukuyo)도 `_cdMountQuestionRecovery`를 그대로 호출해(19행에서 grep 확인 완료) 이번 수정 혜택을 이미 받고 있으나, 여전히 독립적인 A~F 검증이 필요하다. vedic은 이 함수와 무관함이 19행에서 이미 확정됐다.

## A~F mock 근거와 경계

- **A 구매 내성:** `feature-question-paid-delivery.test.js:77` 미결제(402류)·소유자 불일치·권한 취소 3개 경로 — `beforeEach` 기본값 `kind='Astrology'`로 실행되지만, `handleZiweiAIPrompt`(fortune.js:5213-5356)를 직접 읽어 동일한 `deliverFeatureQuestion` 위임 형태(`verify`/`prepare`/`refund` 3개 콜백 구조)임을 확인했으므로 이 축은 공유 원시함수 검증으로 대체된다 — Ziwei 자신의 핸들러로 직접 실행된 것은 아니라는 경계를 명시한다.
- **B 생성·품질 계약:** 같은 파일 74~76행(분량 미달·해시 불일치·클레임 오류·truncated) — 위와 동일하게 공유 원시함수 경유로 커버, Ziwei 핸들러 직접 실행은 아님.
- **C 장애 주입:** 72·73행(최종 저장 3종·체크포인트 3종, 공유 원시함수 경유) + **79행 소진 후 환불 1회 실행 테스트는 `access==='pass'` 서브케이스에서 `kind`를 명시적으로 `'Ziwei'`로 설정한다** — 이 서브케이스만큼은 Ziwei 자신의 핸들러가 직접 실행된 진짜 Ziwei 전용 증거다.
- **D 전달:** 웨이크/복구 축은 19행 수정을 코드 변경 없이 상속 — 위 "발견과 수정" 절 참조. `__tests__/ui/feature-question-recovery.behavior.test.js` 10/10 재실행 통과(무회귀, 신규 테스트 없음). **실제 브라우저 렌더 화면 증거는 이번에도 없다** — 5~19행과 동일한 경계.
- **E 저장·권한·재열람:** `__tests__/fixtures/paid-completed-result-access-fixtures.mjs:18`에 `ziwei_ai_prompt_generator`가 astrology·sukuyo·vedic과 함께 `runPaidNarrativeDelivery` 마커로 등록돼 있어 공유 스위트 `paid-completed-result-access.test.js`(96/96)로 커버됨을 확인.
- **F 재열람 예산("계산 사실·같은 질문 결과"):** `feature-question-paid-delivery.test.js:68` `test.each([...4개 kind × 3개 access mode])`의 **Ziwei 조합 3개(pass/monthly/single)는 Ziwei 자신의 핸들러로 직접 실행**된다 — 10개 파트 완료(`provider` 10회) 후 같은 요청을 다시 열어도 `provider` 호출이 그대로 10회(재호출 없음), `refund` 미호출을 명시적으로 단언한다. 78행 `'same input key cannot substitute new calculations'`(같은 요청 키를 다른 질문으로 대체 불가, 409)는 기본 `kind='Astrology'`로 실행돼 공유 원시함수 경유 증거다.

Ziwei 자신의 핸들러가 직접 실행되는 증거는 F축 3개 조합(68행)과 C축 소진 환불 1개 서브케이스(79행 pass)이며, 나머지 A/B/C(final save·checkpoint)/E축은 구조적으로 동일한 `deliverFeatureQuestion` 위임(코드 직접 대조로 확인)을 경유하는 공유 원시함수 증거다. 이 구분은 19행 문서에는 명시되지 않았던 것으로, "공유 함수 검증=완료"라는 안일한 결론을 피하기 위해 이번 행에서 직접 추가했다.

이번 차례는 웨이크/복구 결함의 무수정 상속 재확인 1건, "품질 게이트 모킹" 함정 부정 재확인 1건, 가격·별칭 대조 확인 각 1건, 인수인계 메모 오류("6체계") 정정 1건에 한정했다. 백엔드(`worker/routes/fortune.js`·`worker/lib/feature-question-delivery.js`)와 클라이언트(`js/saju-engine.js`) 모두 이번 행에서 수정하지 않았다 — 공유 테스트 전체 무회귀가 그 재확인이다. **D의 실제 화면 증거는 여전히 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

이번 행은 소스 코드 수정이 없다(19행 수정을 코드 변경 없이 그대로 상속하고, 20행 고유 계약은 전부 기존 상태로 통과). 수정/신규 파일은 검증 기록뿐이다:

- `docs/verification/ziwei-ai-prompt-paid-delivery-20260918.md`(이 문서, 신규)
- `docs/verification/paid-llm-service-checklist-20260916.md` 20행(체크 갱신)

```bash
node --test __tests__/ui/feature-question-recovery.behavior.test.js
node scripts/run-mock-tests.mjs jest __tests__/worker/feature-question-paid-delivery.test.js --silent
node scripts/run-mock-tests.mjs jest __tests__/worker/paid-completed-result-access.test.js --silent
npm run check:fast
```

결과: UI 행동 검사 **10/10 통과**(무회귀, 신규 없음). Worker jest **27/27 통과**(4개 형제 상품 × 여러 축, 무회귀). 교차 상품 E축 **96/96 통과**(무회귀). `check:fast`가 결제 인접 변경으로 자동 승격돼 전체 Jest로 이어졌고 **281 suite / 3,966 test 전부 통과**(종료 코드 0) — 19행 종료 시점과 정확히 같은 개수로, 이번 행에서 테스트를 추가하지 않았다는 판단과 일치한다.

## 전달

문서 전용 커밋(검증 기록 신규 + 체크리스트 20행 갱신 + 인수인계 문서 갱신)을 워크트리 `ziwei-ai-prompt-mock-20260918-210417`(브랜치 `wt/ziwei-ai-prompt-mock-20260918-210417`, base `62e8389e5`)에서 만들었다. 화면 파일을 고치지 않았으므로 `sitemap:generate`·`sync:public`은 필요 없다.
