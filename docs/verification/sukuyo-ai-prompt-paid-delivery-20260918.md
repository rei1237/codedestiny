# 숙요점 전문가 상담(AI 질문 프롬프트 생성) 유료 전달 검증 — 2026-09-18

대상은 재검증표 21행(`sukuyo_ai_prompt_generator`, "숙요점 전문가 상담")이다. 정본은 19·20행과 같은 공유 라우트 [`worker/routes/fortune.js`](../../worker/routes/fortune.js)의 `handleSukuyoAIPrompt`(5457행~, 라우팅 진입은 6715행)이며, 19·20행과 달리 **전용 lib** [`worker/lib/sukuyo-ai-prompt.js`](../../worker/lib/sukuyo-ai-prompt.js)가 feature key(13행)와 가격 상수 `SUKUYO_AI_PROMPT_PRICE = 100`(14행)·프롬프트 빌더를 갖는다. 실제 전달 로직은 형제 3개 상품(astrology/ziwei/vedic)과 공유하는 [`worker/lib/feature-question-delivery.js`](../../worker/lib/feature-question-delivery.js)의 `deliverFeatureQuestion`/`readFeatureQuestionRequest`(공유 원시함수 `runPaidNarrativeDelivery`)다.

클라이언트 진입점은 정적 셸 [`js/saju-engine-tarot-sukuyo-quantum.js`](../../js/saju-engine-tarot-sukuyo-quantum.js)의 `syRequestSukuyoPromptByQuestion`(16622행)이며, 화면 복구는 `syBindSukuyoPromptComposer`(16723행) 안에서 `_cdBindQuestionRecovery('sukuyo', ...)`(16752행)로 19행이 수정한 공유 함수에 위임한다.

## 발견과 수정 — 이용권(월정석) 커버리지 환불 누락 (C축, 결제 손실)

**재현된 결함 1건.** 숙요 핸들러는 생성이 모두 실패했을 때(`onExhausted`) 코인 환불(`isPointSpend`)과 카드 단건 취소(`isCardSpend`)만 처리하고, **이용권 커버리지로 이미 깎인 `monthlySpendCoin` 을 되돌리는 경로가 없었다.** 수정 전 코드는 `verify` 콜백이 `passRefund: null` 을 하드코딩해(`fortune.js` 수정 전 5599행) 소비 응답이 실어 보낸 `passRefund`(`{ cycleKey, cost }`)를 그대로 버렸고, `refundGeneration` 에도 대응 분기가 없었다.

- **도달 가능성(실측):** `worker/lib/profile-limits.js`의 `PASS_LIMITS`(105~110행)는 PREMIUM 100코인·VVIP 200코인·FAMILY 무제한이고 숙요 가격은 정확히 100코인이므로, `canUseByPass`(756행)가 프리미엄·VVIP·패밀리 이용권에 대해 참을 돌려준다(STANDARD 50코인은 미커버). 즉 프리미엄 이상 이용권 사용자가 숙요 상담을 열고 생성이 전부 실패하면 **결과 없이 월 예산 100코인이 소진된 채 남는다.**
- **소비 쪽 정본 주석도 자미만 가리키고 있었다:** `fortune.js` 1931행 부근 주석은 "뒤이은 AI 생성이 실패하면 handleZiweiAIPrompt 가 이 값으로 되돌린다"라고 적혀 있다 — `passRefund` 메타데이터 자체는 featureKey 무관하게 생성되지만 되돌리는 쪽이 자미 하나뿐이었다는 뜻이다.
- **수정:** 자미 구현(`handleZiweiAIPrompt` 5298·5341·5347·5350·5393~5408행)과 1:1 동일 구조로 배선했다 — `let passRefund = null`(5521행), 소비 응답에서 객체일 때만 채우기(5595행), `verify` proof 에 실어 보내기(5601행), `refund` 콜백에서 되돌려받기(5604행), `refundGeneration` 의 `else if (passRefund)` 분기에서 `refundPassCoverage({ userId, cycleKey, refundId: 'sukuyo-ai-prompt:'+requestId, cost })` 호출(5647~5659행). 실패해도 로그만 남기고 원래 500/503 응답을 가리지 않는 것까지 자미와 같다. `worker/routes/fortune.js` +19/-2행.
- **변이 검증:** 공유 스위트 `__tests__/worker/feature-question-paid-delivery.test.js:79`의 소진 환불 테스트는 `access==='pass'` 일 때 `kind` 를 `'Ziwei'` 로 고정해 형제 3종의 이용권 환불을 한 번도 실행하지 않고 있었다. `test.each` 를 `[[access, kind]]` 쌍으로 바꿔 `['pass','Sukuyo']` 조합을 추가했고(+1 케이스), **수정 전 코드에서 정확히 이 1건만 실패**(`refund` 호출 기대 1회 / 실제 0회, 27 passed·1 failed)한 뒤 수정 적용으로 **28/28 통과**로 전환함을 실측했다.

🟡 **범위 밖(미조치, 보고만):** 같은 누락이 형제 두 상품에도 그대로 있다 — `handleAstrologyAIPrompt`(4246행)와 `handleVedicAIPrompt`(4408행)가 여전히 `passRefund: null` 을 하드코딩하고 각 `refundGeneration` 에 이용권 분기가 없다. 19행(astrology)은 이미 완료 처리된 행이고 22행(vedic)은 다음 차례 행이라, 코딩 원칙 14에 따라 이번 21행 범위에서는 고치지 않고 보고만 한다. **22행 세션은 이 결함을 먼저 확인할 것**(동일 수정 + `['pass','Vedic']` 케이스 추가로 끝난다). 19행은 별도 후속 과제다.

## 대조 결과

- **가격:** `worker/lib/paid-feature-registry.js:310` `{ cost: 100, reason: "숙요점 전문가 상담" }` = 100코인. `docs/payments/payment-inventory.json`의 `feature:sukuyo_ai_prompt_generator` 항목이 `priceKRW: 10000`·`priceCoins: 100`이며 prepare/grant 해석이 `matches: true` 로 일치한다. 클라이언트도 `cost: 100`·버튼 문구 "10,000원 AI 상담 받기"(`js/saju-engine-tarot-sukuyo-quantum.js` 16702·16745행)로 같은 값을 쓴다. 체크리스트 라벨과 레지스트리 `reason` 문자열이 정확히 일치한다.
- **별칭 구조(19·20행과 동일):** `paid-feature-registry.js:548`은 astrology/vedic/ziwei/sukuyo 4개 `*_ai_prompt_generator`가 함께 열거된 단순 배열 멤버십이며 별도 별칭 테이블이 없다.
- **품질 게이트 전량 모킹 함정(8·14행 반복 패턴) — 이번에도 해당 없음:** `feature-question-paid-delivery.test.js`는 `worker/routes/fortune.js`를 `ts.createSourceFile`로 파싱해 `handleSukuyoAIPrompt` 본문을 그대로 `vm.runInContext` 로 실행하고(41~63행), `readFeatureQuestionRequest`/`deliverFeatureQuestion` 은 실제 모듈에서 import 한다(30행). 모킹은 인프라 경계(`connectDb`·`requireAuth`·`access-control.js`·Mongo 모델·`callGeminiText`)와 이 파일 밖 결제 원시함수(`handlePigCoinConsume`/`handlePigCoinRefund`/`refundPassCoverage`)에만 한정된다.
- **무료 분기(21행 고유):** 숙요 핸들러에는 `SUKUYO_AI_PROMPT_PRICE <= 0` 일 때 결제 없이 서버가 직접 답변을 만드는 분기(5524~5559행)가 있으나 현재 상수는 100이므로 실행되지 않는 죽은 분기다. 가격 정책을 건드리지 않는다는 계약에 따라 삭제하지 않고 기록만 한다.

## A~F mock 근거와 경계

- **A 실제 입력·계산 사실:** 클라이언트가 실제 숙요 계산 결과를 그대로 보낸다 — `syRequestSukuyoPromptByQuestion`(16622행)이 `syGetPromptBasicResult()`(본명수 `mansionIdx` 등)과 `syGetPromptCompatibilityResult()`(`partnerIdx` 등)를 POST 본문 `basicResult`/`compatibilityResult`(16665·16666행)로 싣고, 서버는 `prepare` 콜백에서 `factsInput: { basicResult, compatibilityResult }`(5602행)로 넘겨 `questionFacts()` 가 고정 근거 배열을 만든다. 근거가 하나도 없으면 422 `MISSING_CALCULATED_FACTS`(`feature-question-delivery.js:36`)로 생성 자체가 막힌다. 궁합 도메인인데 궁합 계산이 없으면 클라이언트(16634행)·서버(5497행) 양쪽이 `MISSING_COMPATIBILITY_RESULT` 로 거절한다. 요청 키는 `profileId|domain|question|mansionIdx|partnerIdx|epoch` 로 결정적이라(16607~16619행) 새로고침 재시도가 재결제로 이어지지 않는다.
- **B 구매 내성·권한:** `feature-question-paid-delivery.test.js:77`(미결제 402·소유자 불일치 404·권한 취소 403)은 기본값 `kind='Astrology'` 실행이라 공유 원시함수 경유 증거다. 숙요 자신은 `requireExistingPaidAccess: true`·`categoryKey: 'sukuyo'`·`payloadHash` 를 붙여 `handlePigCoinConsume` 에 위임하는 구조(5565~5588행)를 자미와 코드 직접 대조로 확인했다.
- **C 장애 주입·환불:** 최종 저장 3종·체크포인트 3종(72·73행)은 공유 원시함수 경유. **소진 후 환불은 이번에 추가한 `['pass','Sukuyo']` 조합(79행)이 숙요 자신의 핸들러를 직접 실행하는 증거**이며, 재요청을 반복해도 환불이 정확히 1회만 실행됨을 단언한다.
- **D 전달·화면 재개:** 공유 함수 `_cdMountQuestionRecovery`/`_cdBindQuestionRecovery`는 19행 수정 이후 `kind` 분기가 없는 제네릭 코드임이 20행에서 실측 확인됐고, 숙요도 같은 함수를 호출한다(16752행). 이번 행은 코드 변경 없이 상속되며 `__tests__/ui/feature-question-recovery.behavior.test.js` 포함 node 스위트 전량 무회귀로 재확인했다. **실제 브라우저 렌더 화면 증거는 이번에도 없다** — 5~20행과 동일한 경계.
- **E 저장·권한·재열람 차단:** `__tests__/fixtures/paid-completed-result-access-fixtures.mjs:18`에 `sukuyo_ai_prompt_generator` 가 형제 3종과 함께 `runPaidNarrativeDelivery` 마커로 등록돼 있고 공유 스위트 `paid-completed-result-access.test.js` 96/96 통과.
- **F 재열람 무과금:** `feature-question-paid-delivery.test.js:68` `test.each`의 **Sukuyo 조합 3개(pass/monthly/single)는 숙요 자신의 핸들러로 직접 실행**되며, 10개 파트 완료(`provider` 10회) 후 같은 요청을 다시 열어도 `provider` 호출이 10회 그대로이고 `refund` 미호출임을 단언한다. 78행의 "같은 요청 키를 다른 질문으로 대체 불가(409)"는 기본 `kind='Astrology'` 실행이라 공유 원시함수 경유 증거다.

## 재검사 명령과 결과

- `node scripts/run-mock-tests.mjs jest --runInBand __tests__/worker/feature-question-paid-delivery.test.js` → 수정 전 27 passed·**1 failed**(`exhausted pass Sukuyo refund runs once...`), 수정 후 **28/28 통과**.
- `node scripts/run-mock-tests.mjs node --test __tests__/ui/feature-question-recovery.behavior.test.js` → node 스위트 **1,432/1,432 통과**(fail 0).
- `node scripts/run-mock-tests.mjs jest --runInBand __tests__/worker/paid-completed-result-access.test.js` → **96/96 통과**.
- `npm run check:fast` → 결제 인접 파일 수정으로 RED 자동 승격, 전체 게이트 통과.

실결제·과금 LLM·운영 DB 쓰기·운영 승격은 실행하지 않았다. 모든 결제·LLM 경로는 mock이다.
