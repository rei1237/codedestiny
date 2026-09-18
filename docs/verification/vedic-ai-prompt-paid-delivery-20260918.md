# 베다 점성술 전문가 상담(AI 질문 프롬프트 생성) 유료 전달 검증 — 2026-09-18

대상은 재검증표 22행(`vedic_ai_prompt_generator`, "베다 점성술 AI 질문 프롬프트 생성")이다. 정본은 19~21행과 같은 공유 라우트 [`worker/routes/fortune.js`](../../worker/routes/fortune.js)의 `handleVedicAIPrompt`(4313행~, 라우팅 진입은 6786행)이고, 전용 lib [`worker/lib/vedic-ai-prompt.js`](../../worker/lib/vedic-ai-prompt.js)가 feature key(10행)와 가격 상수 `VEDIC_AI_PROMPT_PRICE = 100`(11행)을 갖는다. 전달 로직은 형제 3종과 공유하는 [`worker/lib/feature-question-delivery.js`](../../worker/lib/feature-question-delivery.js)(`runPaidNarrativeDelivery`)다.

**이 상품의 유일한 화면은 정적 셸 [`vedic-astrology.html`](../../vedic-astrology.html)의 인라인 스크립트다.** feature key 전수 grep(app/·src/·js/·*.html) 결과 이 파일 하나만 나오고, `docs/payments/payment-inventory.json`의 `feature:vedic_ai_prompt_generator` 항목도 `routes: ["/vedic-astrology.html"]` 단일이다. `index.html:32143`이 이 페이지로 이동시킨다. 🔴 **이 페이지는 `js/saju-engine.js` 를 로드하지 않는다** — 19행이 만든 공유 복구·재시도 원시함수(`_cdRetryTransientPost`, `_cdMountQuestionRecovery`)를 상속받지 못하는 유일한 형제다. 20·21행이 무결함으로 상속됐던 축이 여기서는 전부 공백이었다. (별개 상품인 `vedic-ai-consultation`(App Router `app/vedic-ai/`, 30,000원)과 혼동하지 말 것 — 다른 feature key·다른 라우트다.)

## 발견과 수정 — 재현된 결함 3건

### 1. 이용권(월정석) 커버리지 환불 누락 (C축, 결제 손실 / 워커)

21행에서 후속 과제로 넘긴 그 결함이 그대로 있었다. 생성이 모두 실패했을 때(`onExhausted`) 코인 환불·카드 단건 취소만 처리하고 **이용권 커버로 이미 깎인 `monthlySpendCoin` 을 되돌리는 경로가 없었다** — `verify` 콜백이 `passRefund: null` 을 하드코딩해 소비 응답의 `{ cycleKey, cost }` 를 버렸고 `refundGeneration` 에 대응 분기가 없었다.

- **도달 가능성(실측):** `worker/lib/profile-limits.js`의 `PASS_LIMITS`(105~110행) 프리미엄 상한 100코인 = 베다 가격 100코인이므로 `canUseByPass`(756행)가 프리미엄·VVIP·패밀리에 참을 돌려준다(STANDARD 50코인은 미커버). 프리미엄 이상 이용권 사용자가 상담을 열고 생성이 전부 실패하면 **결과 없이 월 예산 100코인이 소진된 채 남는다.**
- **수정:** 자미·숙요 구현과 1:1 동일 구조 — `let passRefund = null`(4368행), 소비 응답이 객체일 때만 채우기(4404행), `verify` proof 에 싣기(4411행), `refund` 콜백에서 되돌려받기(4414행), `refundGeneration` 의 `else if (passRefund)` 분기에서 `refundPassCoverage({ userId, cycleKey, refundId: 'vedic-ai-prompt:'+requestId, cost })`(4458~4470행). 환불이 실패해도 로그만 남기고 원래 500/503 응답을 가리지 않는다. `worker/routes/fortune.js` +19/-2행.
- **변이 검증:** 공유 스위트 `__tests__/worker/feature-question-paid-delivery.test.js:79`의 소진 환불 `test.each` 에 `['pass','Vedic']` 조합을 추가했다. **수정 전 이 1건만 실패**(`refund` 기대 1회 / 실제 0회, 28 passed·1 failed) → 수정 후 **29/29 통과**.

### 2. 202 부분 응답을 완성으로 확정 (D축, 잘린 상담 확정 / 화면)

**재현된 결함.** 워커는 상담을 10개 부분으로 나눠 만들고 첫 POST 는 202(`status: 'partial'`, `saved: false`, `resumeBody`)로 돌아온다. `vedicAiGeneratePromptCore` 는 **단 한 번만 POST 하고 202 응답을 성공으로 읽었다** — `resp.ok` 가 202에도 참이기 때문이다. 결과: 결제는 확정된 채 3/10 만 적힌 본문이 최종 결과로 굳고, 결제 증거(`paidEvidence`)까지 비워져 **무료 재시도 경로도 닫혔다.**

- **수정:** 전달 루프를 최상위 함수 `vedicAiDeliverUntilSaved(headers, initialBody, state)`(3760행)로 분리했다 — 200(completed)이 나올 때까지 서버가 준 `resumeBody` 만 이어 보내고, 진행 상황을 상태 문구(`n/10`)로 노출하며, 일시 장애(503·`SERVICE_TEMPORARILY_UNAVAILABLE`·`PAID_ACCESS_VERIFY_RETRYABLE`·`DB_DEGRADED`)는 3회까지 백오프 재시도한다. `retryable: false` 이거나 파도 40회 상한에 걸리면 `paymentRetainedForRetry: true` 로 떨어뜨려 **결제 권한을 남긴 실패**로 만든다(무료 재시도가 열린다). 상한·백오프 값은 `js/saju-engine.js`의 `_cdRetryTransientPost`(7235~7359행)와 같은 의미로 맞췄다 — 원칙 6에 따라 기존 장치를 먼저 확인했고, 이 페이지가 그 파일을 로드하지 않아 같은 의미를 페이지 안에 둔다.
- **변이 검증:** 신규 `__tests__/ui/vedic-ai-prompt-partial-delivery.behavior.test.js`. HTML 인라인 스크립트에서 `ts.createSourceFile` 로 **실제 함수 본문을 그대로 꺼내** `vm` 에서 실행하며, 모킹은 화면·네트워크 경계뿐이다. 수정 전 "202 를 받고도 재요청하지 않으면 결제한 상담의 7/10 이 영영 생성되지 않는다"로 실패(1,432 pass·1 fail) → 수정 후 통과.

### 3. 깨어남 복구 부재 (D축, 결제한 상담 유실 / 화면)

**재현된 결함.** 워커에는 `GET /api/fortune/vedic/ai-result` 저장본 조회 라우트가 있는데(`fortune.js:6786` 같은 분기) **화면이 한 번도 호출하지 않았다.** 모바일에서 생성 중 탭이 백그라운드로 내려가 fetch 가 끊기면, 결제와 부분 저장은 서버에 남아 있는데도 돌아온 화면은 빈 상태였다 — 5~20행에서 공유 함수로 중앙 수정한 바로 그 결함 유형이다.

- **수정:** `vedicAiRecoverSavedConsultation()`(4025행) + `vedicAiMountWakeRecovery()`(4073행)를 추가하고, 결제창 진입점 유무와 무관하게 마운트한다(7829행 — 잠들었다 깨어난 탭은 결제창을 거치지 않으므로 기존 `registerVedicResumeHandlers` IIFE 안에 두면 안 된다). 복구는 **GET 저장본 조회로 시작**하고(새 POST 는 재결제·재생성 위험) 202면 `vedicAiDeliverUntilSaved` 로 이어받는다. 가드: `pageshow` 는 `persisted === true` 일 때만(첫 진입 load 직후에도 오기 때문), 문서가 hidden 이면 조회하지 않음, `state.inFlight` 중이면 끼어들지 않음, 토큰 없으면 조회하지 않음, 복구 성공 후에는 더 조회하지 않음. 404·401·403 은 조용히 물러난다(결제한 적 없는 방문자에게 오류 문구를 띄우지 않는다). 신호는 `pageshow`(persisted)·`focus`·`online`·`visibilitychange` 넷 — 자미 화면과 같은 조합이다.
- **변이 검증:** 같은 behavior 테스트에 4건 추가. 복구의 202 이어받기 분기를 `false` 로 바꾸는 변이를 넣자 **"잠들었다 깨어나면…" 1건만 실패**(1,436 pass·1 fail)했고 되돌리자 1,437/1,437 로 복귀함을 실측했다.

## 대조 결과

- **가격:** `worker/lib/paid-feature-registry.js:309` `{ cost: 100, reason: "베다 점성술 AI 질문 프롬프트 생성" }` = 100코인. `docs/payments/payment-inventory.json`의 `feature:vedic_ai_prompt_generator` 가 `priceKRW: 10000`·`billingType: per_use`·`routes: ["/vedic-astrology.html"]` 로 일치(100코인 = 10,000원).
- **별칭 구조(19~21행과 동일):** `paid-feature-registry.js:547`은 형제 4종이 함께 열거된 단순 배열 멤버십이며 별도 별칭 테이블이 없다.
- **품질 게이트 전량 모킹 함정(8·14행 패턴) — 이번에도 해당 없음:** 워커 스위트는 `handleVedicAIPrompt` 본문을 AST 로 꺼내 그대로 실행하고 `readFeatureQuestionRequest`/`deliverFeatureQuestion` 은 실제 모듈에서 import 한다. 모킹은 인프라 경계(`connectDb`·`requireAuth`·`access-control.js`·Mongo 모델·`callGeminiText`)와 이 파일 밖 결제 원시함수에만 한정된다. `short/hash/claim/truncated` 4종 테스트가 실물 품질 게이트가 물고 있음을 증명한다.
- **사이트맵:** `npm run sitemap:generate` 재실행 결과 1,282 URL·lastmod 갱신 0 — 라우트가 바뀌지 않아 산출물 무변경.

## A~F mock 근거와 경계

- **A 실제 입력·계산 사실:** 화면이 실제 베다 계산 결과를 그대로 보낸다 — `buildCurrentVedicDataSnapshot()` 과 `G.chart`/`G.report`/`G.vedicCompatibilityResult` 를 `vedicResult`/`compatibilityResult` 로 싣고, 서버가 `prepare` 콜백에서 `factsInput` 으로 넘겨 고정 근거 배열을 만든다. 근거가 없으면 422 `MISSING_CALCULATED_FACTS`(`feature-question-delivery.js:36`)로 생성 자체가 막힌다. `evidenceHash`·`claims` 불일치 응답은 품질 게이트가 완료로 치지 않는다.
- **B 구매 내성·권한:** 미결제 402·소유자 불일치 404·권한 취소 403(워커 스위트 77행)은 공유 원시함수 경유 증거. 베다 자신은 `requireExistingPaidAccess: true`·`payloadHash` 로 `handlePigCoinConsume` 에 위임하며, F축 `test.each` 의 Vedic 조합 3개(pass/monthly/single)가 베다 핸들러를 직접 실행한다.
- **C 장애 주입·환불:** 최종 저장 3종·체크포인트 3종(72·73행)은 공유 원시함수 경유. **소진 후 환불은 이번에 추가한 `['pass','Vedic']` 조합(79행)이 베다 핸들러를 직접 실행하는 증거**이며, 재요청을 반복해도 환불이 정확히 1회만 실행됨을 단언한다.
- **D 전달·화면 재개:** 이번 행에서 처음으로 **화면 코드 자체를 고쳤다**(결함 2·3). 202 이어받기와 깨어남 복구를 실제 함수 본문 실행으로 검증했다. **실제 브라우저 렌더 증거는 이번에도 없다** — 5~21행과 동일한 경계(테스트는 `vm` 안에서 실제 함수를 돌리지만 DOM·네트워크는 스텁).
- **E 저장·권한·재열람 차단:** `__tests__/fixtures/paid-completed-result-access-fixtures.mjs:18`에 `vedic_ai_prompt_generator` 가 형제 3종과 함께 `runPaidNarrativeDelivery` 마커로 등록돼 있고 공유 스위트 96/96 통과.
- **F 재열람 무과금:** 워커 스위트 68행 `test.each` 의 Vedic 조합 3개가 베다 핸들러로 직접 실행되며, 10개 파트 완료(`provider` 10회) 후 같은 요청을 다시 열어도 `provider` 호출이 10회 그대로이고 `refund` 미호출임을 단언한다.

## 재검사 명령과 결과

- `node scripts/run-mock-tests.mjs jest --runInBand __tests__/worker/feature-question-paid-delivery.test.js` → 수정 전 28 passed·**1 failed**(`exhausted pass Vedic refund runs once...`), 수정 후 **29/29 통과**.
- `node scripts/run-mock-tests.mjs node --test __tests__/ui/vedic-ai-prompt-partial-delivery.behavior.test.js` → node 스위트 **1,437/1,437 통과**(fail 0). 변이(202 이어받기 분기 제거) 시 1,436 pass·1 fail 로 물림을 확인.
- `node scripts/run-mock-tests.mjs jest --runInBand __tests__/worker/paid-completed-result-access.test.js` → **96/96 통과**.
- `npm run sitemap:generate` → 1,282 URL, 산출물 무변경. `npm run sync:public` → `public/vedic-astrology.html` 미러 재생성.
- `npm run check:fast` → 결제 인접 파일 수정으로 RED 자동 승격, 전체 게이트 통과.

## 남은 후속 과제 (범위 밖, 보고만)

🟡 `handleAstrologyAIPrompt`(19행, `fortune.js:4246`)에 같은 이용권 환불 누락이 남아 있다. 이미 완료 처리된 행이라 코딩 원칙 14에 따라 이번 범위에서 고치지 않는다 — 형제 3종과 동일한 5점 배선 + `['pass','Astrology']` 케이스 추가로 끝난다.

실결제·과금 LLM·운영 DB 쓰기·운영 승격은 실행하지 않았다. 모든 결제·LLM 경로는 mock이다.
