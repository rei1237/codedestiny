---
status: active
updated: 2026-09-27
next: "1단계 B 의 상품별 선행 수정(서술자 충실도 9d8be5c91·ca6154fef)은 main 에 있다. 1B 절의 결정대로 등록 대상 상품의 결제 게이트가 소비 기록에 route 본문과 같은 featureKey·requestId 를 남기는지부터 확인한 뒤 결제 전 의도 등록(awaiting_payment)과 증빙 키 제외 병합 규칙을 구현하고, 상품 48개 미매핑과 전체 구간 계측을 이어서 완료한다."
---

# 결제 지연·유료 결과 복구·LLM 비용 통제 인수인계

## 현재 상태와 작업 위치

전체 계획은 미완료다. 1차 구현은 main과 스테이징에서 검증했지만 이 작업에서 프로덕션 승격은 하지 않았다. 승인 대기만 남은 작업이 아니다. 아래 서버 복구·상품 연결·계측 구현이 남아 있다.

- 주 저장소: `D:\Development\code-destiny`
- 재사용할 격리 작업 디렉터리: `C:\Users\user\.codex\worktrees\paid-delivery-reliability\code-destiny`
- 직전 이 작업 문서 커밋: `ff513e9da66c73cf4b67378d02b46d61fafbb9e3` (main에 병합됨).
- 인수인계 작성 기준 main/격리 HEAD: `06d651ce5` (전체 SHA는 `git rev-parse 06d651ce5`로 확인). 이후 main은 다른 세션에서 변경될 수 있다.
- 런타임 critical CI 및 양쪽 스테이징 SHA를 직접 검증한 기준: `3baf54db3d8250fcbe89f6357026ae35f039e89e`. 현재 HEAD 전체를 이 검증으로 대체하지 않는다.
- main에는 마케팅 파일, `next-env.d.ts`, 화면 캡처 등 다른 세션의 미커밋 작업이 있다. 격리 체크아웃을 재사용하며 reset/stash/일괄 stage를 하지 않는다. 이전 임시 파일 `paid-delivery-plan.json`, `paid-primary-before.txt`는 이번 문서 검사에 섞이지 않도록 시스템 TEMP의 고유 paid-delivery-handoff 디렉터리로 보존 이동했다.
- 이 문서만 추가했다. 이번 인수인계에서 런타임·정책·계정·주문은 수정하지 않는다.
- **2026-09-27 후속 세션(1단계 A):** 기준 `bb970446e` 위에 `94d583536`(엔진 DB 연산 withMongoRetry·서버 진입점) → `9f1d6f638`(oracle-consultation 테스트 목 보강) → `ba0326a27`(상품 어댑터 추출·레지스트리) → `dd0123537`(10분 크론 이어생성·모니터 지연) 을 격리 워크트리에서 만들어 main 에 fast-forward 로 전달했다. 1단계 B·2단계·3단계는 미착수다.
- **2026-09-27 후속 세션(1단계 B 선행 수정):** 기준 `6797c40a8` 위에 `9d8be5c91`(geomancy counts·animal-totem cards/birth 를 JSON 문자열로 서술자에 실음) → `ca6154fef`(guardian 이 질문 전 recentTurns 를 서술자에 고정) 를 격리 워크트리에서 만들어 이 문서 커밋과 함께 main 에 전달했다. 1B 본 구현(의도 등록·증빙 결속·병합 규칙)과 2·3단계는 미착수다. 실 PG·과금 LLM·운영 DB 0회.

상세 근거는 `docs/verification/paid-delivery-reliability-20260927.md`, 상품 표는 `docs/verification/paid-delivery-inventory-20260927.json`, 손익 표는 `docs/verification/yeongnyangi-pass-economics-20260927.json`, 스테이징 증거는 `docs/verification/paid-delivery-staging-20260927.json`에 있다. 먼저 이 문서로 재개하고 필요한 근거만 읽는다.

## 승인과 금지 경계

- 사용자는 남은 구현·검증·main 전달·스테이징 및 최종 프로덕션 반영을 요청했다. 이 승인된 구현 범위를 반복 확인하지 않는다.
- 실결제·과금 LLM은 **구체적 시험표 승인 후** 실행하라는 사용자 조건이 있다. 테스트 계정 제공은 과금 승인이 아니다. 현재 시험표 승인은 받지 않았다.
- 테스트 계정은 대화에서 지정한 Google 계정이다. 이메일을 저장소에 추가하지 않는다. 읽기 전용 조회로 활성 일반 사용자임을 확인했으며 권한·구매 기록은 바꾸지 않았다. 브라우저 로그인 표시만으로 계정 이메일 일치까지 입증되지 않았다.
- 운영 DB는 읽기 전용 집계만 했다. 고객 주문 재실행, 예산 증액, 운영 DB 쓰기, 환불은 별도 대상·사유·범위 승인 없이 실행하지 않는다.
- 현행 Family·월정석·단건 결제와 과거 구매 권리를 유지한다. 실제 원가 자료 없이 영냥이 이용권 범위를 확대하거나 `PASS_COST_EVIDENCE`를 채우지 않는다.
- 모델·토큰 상한·재시도 예산을 추측으로 늘리지 않는다. 상품의 명시적 총 분량 약속도 몰래 낮추지 않는다.

## 완료한 구현과 이어받을 파일

| 영역 | 파일 / 완료 내용 | 한계 |
|---|---|---|
| 결제 준비 | `app/_lib/billing-client.ts`, `app/checkout/CheckoutRouteClient.tsx`: 기존 SDK 예열을 세션 확인과 병렬화, 비동기 실패 처리 | 개선 후 실측 없음. 인증·금액·통화·서명·소유권 검증 유지 |
| 공통 초안 | `worker/lib/paid-narrative-delivery.js`, `paid-narrative-candidate.js`: 유효 초안 저장, 항목 1회 보완, 기존 3회 예산 공유, 만료 잠금 저장 차단, 총 분량 부족은 검토 상태 | 서버 자동 이어생성이나 승인 직후 입력 등록은 미완료 |
| 운영 알림 | `worker/lib/paid-narrative-monitor.js`, `worker/index.js`: 기존 10분 스케줄의 지연 탐지, 성공 발송 후 표시 | 생성 작업자가 아닌 모니터다. 실제 알림 발송 미검증 |
| 비용 귀속 | `worker/lib/paid-generation-context.js`, `worker/lib/gemini.js`, `lib/llm-client.ts`, 영냥이 `service.ts`와 `providers/code-destiny.ts` | 실행/장/시도/호출 종류 기록. 실패 usage 및 청구 누락은 별도 대조 필요 |
| 프롬프트 | 영냥이 provider의 system 중복 전송 제거 | 전체 상품의 컨텍스트 최적화 완료 아님 |
| 보고 | `scripts/report-paid-delivery-{inventory,health}.mjs`, `report-llm-token-usage.mjs`, `report-pg-window-latency.mjs`, `report-yeongnyangi-pass-economics.mjs`, `lib/payment/llm-cost-report.mjs` | 상품 전수 완료율·복구 성공률·실측 원가는 아직 불완전 |
| 서버 이어생성 | `worker/lib/paid-narrative-recovery-task.js`(신규), `paid-narrative-adapters.js`(레지스트리 18키), `paid-narrative-delivery.js`의 `resumePaidNarrativeOnServer`, `worker/index.js` 10분 분기 배선 | 이미 실행 기록이 생긴 건만. 승인 직후 첫 요청 전 이탈(기록 없음)은 1단계 B. 스테이징 `crons = []`라 자동 경로 스테이징 실증 없음 |
| 결제 재개 서술자 | `geomancy-oracle-v4.html`, `js/animal-totem-experience.js`(배열·객체를 JSON 문자열로 싣고 복귀 때 검증), `app/fortune-chat/FortuneChatClient.tsx`·`paid-turn-recovery.ts`(질문 전 recentTurns 고정) | 복귀 본문 = 페이지 내 본문까지(증빙 키는 다를 수 있음). pet 자정 날짜 미수정. 서버 등록은 1B 본 구현 |

**동시 작업 주의:** 현재 main에는 후속 `a572d4ae5`가 들어 있다. 반복되거나 무효인 보완 응답이 기존 유효 초안을 막던 문제와 섬 캐시 minChars 연결을 수정했다. `docs/handoff/2026-09-27-llm-length-never-fatal.md`의 P1 완료 기록과 최신 diff를 읽고 보존한다. 그 문서의 P1 이전 전수 조사와 이 작업의 원래 보고는 역사적 스냅샷이며 최신 구현과 다를 수 있다. 길이 품질 작업의 P2~P5와 여기의 복구 작업을 중복 구현하지 않는다. 타 세션에 메시지를 보내는 것은 사용자 허가 없이 하지 않는다.

## 남은 작업 순서와 통과 조건

### 1. 승인 주문 등록 및 공통 서버 이어생성 — 최우선

기존 주문 확정·실행 저장·큐/스케줄·라우트 호출부를 추적한다. 별도 결제 코어를 만들지 않는다. 공통 상담 18개 경로는 이제 A(아래)로 **이미 시작된 실행**을 서버가 이어 생성한다. 브라우저가 최초 생성 요청 전 닫히면 실행 기록 자체가 없어 A가 잡을 대상이 없다 — 이 구간이 B다.

#### 1A. 기존 실행의 서버 이어생성 — 완료 (`dd0123537`)

- 동작: 기존 10분 크론 분기에서 `runPaidNarrativeRecovery`가 `status:'pending'`·마지막 저장 후 5분 무진행(`timeoutAt ≤ now+5분`, 저장마다 +10분)·생성 24시간 이내·레지스트리 등록 `featureKey|reportType`·잠금 만료인 실행을 틱당 3건, 작업 예산 240초 안에서 이어 만든다. 파(최대 4항목)마다 기존 항목당 3회 예산(`attempts`)을 브라우저·GET 재개와 함께 소비한다. 새 공급자 예산 없음.
- 서버 진입점 `resumePaidNarrativeOnServer`는 `resumeResultId`로만 들어가 `seed`에 도달하지 않고, `verify`는 **무동작**이다(실행 생성 때 라우트가 이미 검증했다는 전제). 상품 verify를 서버에서 다시 돌리면 이용권 차감 분기·쿠키 의존으로 오작동한다. 환불·취소는 엔진 `revoked()`가 공급자 호출 전·완료 직전에 막는다.
- 제외: `karma-destiny-ai-consultation|expertFollowUp`, `love-secret-ai-consultation|expertFollowUp` — 라우트가 주입하는 생성기이고 답이 상담 GET 에서 붙으므로 서버 사본이 갈 곳이 없다(`PAID_NARRATIVE_SERVER_RESUME_EXCLUSIONS`). 미등록 조합은 로더가 null → 선택조차 안 된다(fail-closed, 커버리지 테스트가 fixture 목록과 대조).
- guardian(`fortune-chat-consultation`)은 실모델 플래그가 꺼져 있으면 어댑터가 null → `ADAPTER_UNAVAILABLE` 60분 백오프. 라우트가 그때 유료 턴을 거절하므로 저장된 시도만 태울 이유가 없다. guardian 생성기는 `requestId`를 라우트 클로저가 아니라 저장된 본문 `state.body.requestId`에서 읽도록 바뀌었다(값 동일).
- **서버 환불 없음:** 어댑터에 `onExhausted`가 없다. 서버에서 3회 소진되면 `metadata.paidNarrativeRecovery.reviewRequired`만 남기고, feature-question 의 기존 환불 청구는 사용자가 돌아와 라우트 요청을 보낼 때 라우트의 `onExhausted`가 한다.
- **정산 스윕과의 충돌 회피(실측 발견):** 일일 `sweepStaleServiceExecutions`는 최상위 `retryCount`·`nextRetryAt`로 선택·증가하고 소진 시 환불/실패 처리한다. 그래서 이어생성 백오프·검토 상태는 최상위 필드를 쓰지 않고 `metadata.paidNarrativeRecovery`(errors·code·nextAttemptAt·reviewRequired)에 둔다. 엔진 `persist()`가 저장마다 이 표시를 `null`로 비워 브라우저 진전이 검토 표시를 풀게 했다. 연속 오류 5회면 검토 상태.
- 계획에 있던 응답 추가 필드(`autoResume`·`nextAttemptAt`)는 넣지 않았다 — 소비하는 UI가 없고 응답 계약을 늘릴 근거가 없다. 보관함 연결은 1B/3단계 몫.
- 모니터(`stalledNarrativeFilter`)는 `timeoutAt ≤ now−10분`으로 늦춰 이어생성이 최소 한 틱 먼저 시도한다. 알림 ≠ 완료 원칙 유지.
- 첫 배포 백로그 상한: 24시간 창 밖의 오래된 pending 은 건드리지 않는다(과거 고객 주문 자동 재실행 방지).
- 기각한 대안: Cloudflare Queue 공유 — 기존 소비자가 64-hex 외 메시지를 조용히 ack 하고, 동시성 2를 영냥이와 나눠 쓴다.
- 운영 위험: 프로덕션 승격 뒤에는 서버가 **실 과금 LLM을 사용자 요청 없이 호출**한다(기존 항목당 3회 예산 안). 스테이징은 `crons = []`라 이 경로가 돌지 않아 스테이징 실증이 없다. 승격 전 시험표 승인 범위에 이 자동 경로를 포함할지 정하고, 승격 후 첫 틱의 `[paid-narrative-recovery]` 로그(executionKey·featureKey·결과 코드만, 질문·본문 없음)를 확인한다.
- 롤백: `git revert dd0123537` 하나로 크론 호출이 멈춘다. `94d583536`·`ba0326a27`은 동작 보존 리팩터라 남겨도 무해하다.

#### 1B. 승인 직후 주문 영속 등록 — 선행 수정 완료, 본 구현은 다음 세션

선행 수정(상품별) — 2026-09-27 결과. 서술자 충실도(아래 앞 다섯 줄)는 main 에 있고, 증빙 결속·병합·구조·보관함은 결정만 기록했다(미구현). 공통 전제: 서버 등록 본문과 브라우저 POST 가 같은 실행이 되려면 복귀 본문이 결제 전 페이지 내 본문과 같아야 한다. 서술자 args 는 원시값만 `js/core/checkout-entry.js:1497` 정리기를 통과하므로 배열·객체는 JSON 문자열로 싣는다(TSX 는 `packPaidResumeArg`/`unpackPaidResumeArg`).

- **geomancy — 수정(`9d8be5c91`).** `counts`(8~29 정수 16개)를 JSON 문자열로 싣고 복귀 때 `parseGeomancyResumeCounts`가 검증한다. 모양이 틀리면 예전처럼 새로 던진다(예전 배열 티켓도 받는다).
- **animal-totem — 수정(`9d8be5c91`).** `birth`는 JSON 문자열, `cards`는 복원에 필요한 `{slot, animalId}`만 JSON 문자열로 싣고 복귀 때 검증한다(카드 문구는 복원 뒤 `buildReadingCards`가 다시 만든다).
- **yoga — 수정 불필요(실측).** 서술자 `{mood, duration, requestId}`가 원시값이고, 페이지 내와 복귀가 같은 `invokeGuruCore`에서 상수 `buildSystemPrompt()`·(mood, duration)의 순수 함수 `buildUserPrompt`·숫자 `duration`(버튼 리터럴 30/60)으로 본문을 만든다(mood 는 양쪽 trim). 다를 수 있는 것은 증빙 키(`transactionId`·`purchaseId`·`sessionId`)뿐 — 아래 병합 규칙 몫.
- **guardian — 수정(`ca6154fef`).** 서버는 `recentTurns`를 '이전 대화'로 읽는데, 페이지 내 결제 호출은 결제창 대기 중 다시 그려진 `messagesRef`(현재 질문 포함)로, 복귀는 bootstrap 이 대화를 채우기 전의 빈 대화로 만들어 두 본문이 달랐다. `send`가 질문을 넣기 전 대화를 한 번 굳혀 페이지 내 본문과 서술자에 같이 쓴다. **동작 변화:** 유료 페이지 내 턴의 `recentTurns`에 현재 질문이 더는 들어가지 않는다(`concern`에는 있다 — 무료 경로와 같아졌다). **개인정보:** 최근 6턴 원문이 암호화된 결제 재개 컨텍스트(대기 30분·승인 7일)에 `concern`과 같은 등급으로 저장된다. 서버는 여전히 6턴·160자·민감 턴 제거로 다시 조인다.
- **pet — 발견만, 미수정(결함은 후속 과제로 보고).** `pet-saju.html`의 `paidRequestBody`가 요청할 때마다 `date: kstToday()`를 넣어 KST 자정을 넘긴 복귀·재시도는 본문이 달라진다. 서버 `normalizeRequestDate`(`worker/lib/pet/pet-input.js:95`)는 허용 창이 없고 `handlePetDelivery`가 이 날짜로 시드한다. 서술자의 pets 는 이미 JSON 문자열이다. 1B 등록 전에 고칠 방법: 결제창 전에 `kstToday()`를 한 번 굳혀 서술자 `date`와 페이지 내 본문에 쓰고, 복귀 때 유효하면 그 값을 쓴다.
- **증빙 결속 — 결정.** geomancy·yoga·pet 의 verify 는 쿠키/헤더/120분 창에 묶여(`worker/lib/access-control.js:767` 부근) 서버에서 재검증할 수 없고, 상품 verify 를 서버에서 다시 돌리면 이용권 차감 분기가 탄다. 그래서 `verifyPerUsePayment(env, { userId, featureKey, requestId, requireExisting: true })`로 **이미 있는 소비만** 증명한다(`worker/lib/nakshatra-paid-access.js:107`, 선례 `worker/lib/palm-result-delivery.js:41`·fusion·ziwei 복구). 실측: 단건(Payment)·코인/월정석(PointHistory deduct)·월정석 원장(MonthlyCreditLedger)·이용권(`worker/lib/pass-consumption.js:136` 마커·사용 증빙)·admin 을 (userId, featureKey, requestId)로 조회하고, 앞의 세 헬퍼는 requestId 가 비면 null 이며, `requireExisting`이면 차감 분기 전에 `NO_EXISTING_CONSUMPTION`으로 끝난다. **미검증 — 다음 세션 첫 조사:** 등록 대상 상품마다 결제 게이트가 소비 기록에 route 본문과 같은 featureKey·requestId 를 남기는지. 안 남기는 상품은 등록 대상에서 빼거나 게이트를 고친다(fail-closed). 증명 결과(source·transactionId)는 실행 문서 metadata 에 둔다.
- **409 `INPUT_MISMATCH` 병합 — 결정.** 지금 `cleanBody`(`worker/lib/paid-narrative-delivery.js:14`)는 토큰 5종만 빼고 비교하므로 증빙 키가 다르면 같은 주문도 409 다. 해시에서 명시적 증빙 키 목록(`transactionId`·`purchaseId`·`sessionId`·`accessGrant`·`consume` 등 — 상품별 게이트가 싣는 키를 전수 확인해 확정)만 빼고, 목록에 없는 새 키는 입력으로 본다(fail-closed). 같은 입력이면 같은 실행으로 합치고 저장된 원본을 쓴다.
- **권장 1B 구조 — 결정.** 결제창을 열기 전에 정확한 route 본문을 같은 executionKey(`paid-narrative:${hash([userId, featureKey, requestId])}`)의 `awaiting_payment` 의도로 등록 → 10분 크론이 위 증명으로 `pending` 전환 → 1A 이어생성이 넘겨받는다. 함정: ① 일일 `sweepStaleServiceExecutions`가 `awaiting_payment`를 고르지 않게 한다. ② 미결제 의도는 TTL·개인정보 정리가 필요하다. ③ 엔진은 `verify(original)`(`paid-narrative-delivery.js:64`)로 **저장된** 본문의 증빙을 검사하므로, 증빙 없는 의도 문서는 들어온 본문의 증빙이나 크론 증명으로 검증하게 바꿔야 한다.
- **보관함 목록 API — 3단계로 미룬다.** 영냥이·꿀꿀 운세 보관함에 목록 API 가 없어(신규 기능) 진행/재시도/검토 상태 노출은 새 필드가 아니라 새 API 가 필요하다.

B 의 요구와 통과 조건(원래 목록). 이 중 브라우저 종료·DB 응답 유실·만료 작업자의 늦은 저장·동시 복구·환불 경합·소진 검토는 A 경로에서 mock 으로 확인했다(`__tests__/worker/paid-narrative-recovery-task.test.js`). 승인 응답 유실·큐 등록 실패·중복/역순 콜백·보관함은 B 에서 새로 증명한다.

- 승인된 원래 주문과 소유권·입력·상품 버전을 영속적으로 연결하고, 큐 전송 실패는 재조정 작업으로 회수한다. 개인정보는 로그가 아닌 필요한 접근 제어 저장소에만 보관한다.
- 콜백·모바일 복귀·여러 기기 복구가 같은 실행을 사용해야 한다. 기존 실행 레코드와 잠금의 원자적 전이·만료 소유권 검사를 활용한다.
- 완료 파트와 유효 초안을 재사용하고 미완료 파트부터 재개한다. 자동·큐·수동 경로가 같은 영속 예산을 소비해야 한다.
- 실패 분류/백오프/다음 시각/운영 검토 상태를 저장한다. 환불·취소와 경합하면 새 과금 호출을 막는다. 저장 후 재조회 및 필수 구성 확인 전 COMPLETED 금지.
- 영냥이와 꿀꿀 운세 보관함에 진행/재시도 시각/복구 가능/운영 확인 상태를 연결하고 기존 API 필드를 보존한다. 재결제 없는 복구와 중복 클릭 병합을 검증한다.
- 통과 조건: 브라우저 종료, 승인 응답 유실, 큐 등록 실패, 중복·역순 콜백, DB 응답 유실, 만료 작업자의 늦은 저장, 동시 복구, 환불 경합 mock 및 격리 DB 회귀. 알림이 왔다는 이유로 생성 완료로 표시하지 않는다.

### 2. 상품 대응표의 미매핑 48개 해소

`report-paid-delivery-inventory.mjs`의 카탈로그 158개 중 영냥이 28개와 공통 18개 외 개별 경로를 대조한다. 현재 48개 미매핑으로 exit 2다. 이는 48개 모두 판매 중 LLM 상품이라는 뜻은 아니다. 공통 18키의 `serverRecovery`는 이제 `worker/lib/paid-narrative-recovery-task.js`로 채워진다(레지스트리에 실제 등록된 키만).

범위 밖이라 보고만 한 사실(수정하지 않음):
- 인벤토리는 `saju_ai_question_prompt`를 feature-question-delivery 로 매핑하지만 실제 처리는 `worker/routes/fortune.js`다. 공통 엔진 레지스트리에는 넣지 않았고(`saju_ai_question_prompt|featureQuestionConsultation`은 null 로 고정 테스트), `backgroundRecoveryNotMapped`에 남아 있다. 2단계에서 경로를 바로잡는다.
- 일일 타임아웃 정산의 체크포인트 보호(`worker/lib/checkpoint-refund-guard.js:19`)는 공통 13키만 `recoverable`로 미룬다. feature-question 4키(`astrology_/ziwei_/sukuyo_/vedic_ai_prompt_generator`)와 `fortune-chat-consultation`은 `unmanaged`라 정산 시각까지 완료되지 않으면 기존 정책대로 환불된다. 이어생성이 그 전에 끝내면 `status`가 바뀌어 정산 대상이 아니다. 목록을 늘리는 것은 환불 정책 변경이라 별도 승인 사항이다.

가격 등록소 → 실제 판매 진입 → 주문 확정 → 생성 → 부분/최종 저장 → 복구 → 보관함을 연결한다. 비LLM/종료/과거 구매용은 근거와 함께 구분하고 단순 제외로 통과시키지 않는다. 파일 존재만으로 전달 검증 완료 표시 금지. 모든 활성 유료 결과 생성 상품의 검증 매트릭스와 누락 시 실패 검사를 연결한다.

### 3. 전체 구간 계측과 비용·품질

- 로그인 시작/세션 확인/주문 준비/PG 표시/승인/확정/작업 등록/첫 저장/최종 저장/보관함 노출을 주문 상관관계로 연결한다. 네트워크·세션 갱신·Mongo 연결/조회·PG 조회·LLM 호출을 분리한다. 개인정보·질문·인증 토큰 로그 금지.
- 7일 표본 수·오류율·p50·p95를 모바일 복귀/신규 로그인/기존 세션/상품 등급으로 분리한다. 단계별 percentile을 합산하거나 request 생성→완료를 LLM 시간이라고 보고하지 않는다.
- 의미적 필수 구성·질문 직접 답변·시기·근거·반복·잘림은 유지한다. 분량만 부족한 항목을 보완하고 완료 장을 재생성하지 않는다. 후속 길이 품질 인수인계와 변경 충돌을 먼저 확인한다.
- 주문 단위로 모델별 입력/출력 및 최초/보완/복구/실패 비용을 합산한다. 청구·수수료·변동 운영비와 대조한다. 미확인 값은 null이며 0원 대체 금지.
- 개인 컨텍스트 재사용은 사용자·입력·상품·정책 버전 격리, 공통 계산/정적 차트 재사용은 버전 구분을 확인한다.

### 4. 실제 시험·릴리스·관찰

위 구현과 관련 CI가 통과하면 요청된 스테이징 전체 경로를 검증한다. 일상 push마다 스테이징을 기다리지 않는다. 실제 시험표 승인 후에만 승인 범위의 PG/LLM을 실행하며, 시험 대상 SHA가 수정된 코드인지 먼저 확인한다. 오래된 프로덕션에서 실행한 거래로 새 코드 전달을 입증하지 않는다. 스테이징 실 공급자 키를 임의로 켜지 않는다.

최종 검증 SHA를 기존 GitHub Actions 릴리스로 승격하고 Pages `/version.json` 및 Worker `/api/version` 일치·스모크를 확인한다. 실패하면 양쪽 롤백. 로컬 직접 배포 금지. 24시간·7일 관찰 보고 경로를 제공하되 경과 전 수치를 완료로 표시하지 않는다.

## 검증된 범위와 수치

- critical CI 기준 `3baf54db3d8250fcbe89f6357026ae35f039e89e`: [main CI 성공](https://github.com/rei1237/codedestiny/actions/runs/36263991647), [스테이징 성공](https://github.com/rei1237/codedestiny/actions/runs/36264016297). 이후 main 전체 검증은 최신 CI를 별도로 확인한다.
- local paid gates 88/88, 관련 테스트 통과. check:fast는 마지막 sitemap drift에서 중단됐고 원장 생성 후 drift 검사 통과; 전체 공식 판정은 위 critical CI 성공이다.
- 실제 staging Mongo fixture 28/28 및 staging HTTP/Mongo 검증·fixture 정리 통과. PG/LLM은 fixture다. [Browser Shadow 후속 성공](https://github.com/rei1237/codedestiny/actions/runs/36264438572)은 mock 모바일 행렬이며 실제 앱 복귀 검증 아님.
- 참치 15항목 중 9번째 실패 → 앞 8개 보존 → 동시 재개·추가 결제 없음은 mock 회귀에서 확인. 실 LLM/실 PG에서는 미검증.
- 과거 7일 웹 PG 표본 10건: checkout p50/p95 1,078/2,055ms, SDK 1/6,825ms. 모바일/신규 세션 표본 및 개선 후 수치는 없다.
- 운영 DB 읽기 전용 과거 집계: 결제 연결 3건, 누락 0건. 이 소표본을 전체 상품 주문 누락률로 일반화하지 않는다. request 생성→완료는 대기시간 포함이다.
- 실 PG 0회, 과금 LLM 0회, 운영 주문 복구/환불 0회. 이 작업의 프로덕션 배포 미실행.
- 1단계 A(mock 전용): 신규 이어생성 테스트 9건(미완료 3항목만 호출·기존 파트 보존·확인 재조회 후 완료·GET `?resultId=` completed, 살아 있는 잠금 건너뜀·동시 두 틱 중복 호출 0, 환불 표시 시 공급자 0회·검토 표시, 저장 응답 유실 throw/null/confirm 3종 → 완료 금지·`retryCount` 불변·백오프 후 재개, 늦은 저장 거부, 소진 시 `exhaustionClaimed`·`failureResult` 없음, 전문가 후속 미선택), 어댑터 레지스트리 21건, 호출부 회귀 포함 jest 19개 스위트 544건, ziwei `node --test` 51건 통과. `verify:cron-mongo-op-coverage`(보호 밖 21건 원장 유지), `verify:no-nested-retry`, `verify:paid-gate-ui`, `verify-llm-generation-resilience`, `audit-ai-locale-calls --check` 통과. 인벤토리 exit 2(48개, 예상대로), `serverRecovery` 18키 채워짐. 실 LLM·실 PG·운영 DB 0회.
- 1단계 B 선행 수정(mock 전용): 실제 `checkout-entry.js` 정리기를 통과한 티켓으로 복귀 본문 = 페이지 내 본문을 geomancy(`__tests__/ui/geomancy-paid-delivery.test.js`)·animal-totem(`__tests__/ui/animal-totem-paid-delivery.test.js`)·guardian(`__tests__/ui/guardian-paid-turn-recovery.test.js`, 수정 전 코드에서 실패 확인)으로 증명했다. `check:fast`는 두 커밋에 한 번씩 모두 tier critical·jest 304 스위트 4,368건 통과·exit 0. 실 PG·과금 LLM·운영 DB 0회.

## 이용권 결론 및 아직 승인되지 않은 시험표

Family v3 149,000원/30일/누적 5,000단위는 무제한 생성이 아니다. 고등어·연어·광어·참치·융합의 한도 비례 회당 매출 배분은 298/894/1,490/2,980/5,960/14,900원이다. 이는 정책 산술이며 실제 정산 매출이 아니다. PG·LLM 평균/p95·재시도/복구·운영비가 미확인이므로 수익성 판단 불가, 현행 정책 유지.

제시한 시험표는 고등어 웹 1,000원 + 모바일 별도 1,000원 + 참치 10,000원, 총 PG 12,000원이다. gemini-2.5-flash 장/분석 합계 최대 250호출·공급자 세전 US$12.07, 세금/환율/카드 수수료 별도. 고등어 웹 1건만 선택하면 1,000원·50호출·세전 US$2.414. 비용은 과거 조회 단가에 의한 제안 상한이며 실측 원가가 아니다. 실행 전 모델/가격/새 v6 manifest/기존 자동3+서버2 예산을 확인하고 달라지면 재산정한다. 사용자 추가 복구/수동 예산 증액은 이 시험에 포함되지 않는다.

상세 시험표와 가상 QA 입력·영수증 보존 절차는 기존 검증 문서에 있다. 자동 환불 없음. 실제 모바일 외부 앱 복귀에는 실제 기기/결제 수단이 필요하다. 승인 질문에 답이 없고 계정 제공만 있었으므로 아직 어느 시험도 실행하면 안 된다.

## 재개 명령

### 이번 인수인계 전달 검사

- 문서 커밋 `3a9a7adcccf2af90627e24d3a7b1581fb42fa32a`는 main push 완료. `check:fast -- --plan` fast, `check:fast` 통과, `verify:handoff-contract` 199개 문서 통과, `git diff --check` 통과.
- [해당 main CI](https://github.com/rei1237/codedestiny/actions/runs/36266664180)의 Static guards는 `verify:hero-firstpaint-lock`에서 실패했다: `Only the shared hero/payment art is preloaded` (`scripts/verify-hero-firstpaint-lock.mjs:77`). 부모 `06d651ce5`와 이 커밋 사이 변경은 이 인수인계 문서 1개뿐이며 해당 검사/hero 소스는 변경하지 않았다. 문서 전달을 CI 전체 통과라고 보고하지 않는다. 다음 코드 작업 전에 최신 main에서 이 실패의 해결 여부를 확인한다. 이 요청 밖 UI/가드를 임의 수정하지 않았다.

다음은 읽기 및 로컬 보고 명령이다. 운영 DB 접근·실거래·배포를 자동 실행하지 않는다.

전달 중 main 후속 변경도 병합했다: `76d122fd2` hero 이미지 로딩 우선순위 수정, `bebf4cd18` 관련 sitemap 갱신, `63b7bc03e` LLM P2 토큰 예산 수정. 따라서 위 길이 품질 P2 상태와 CI 실패는 최신 후속 커밋의 결과를 확인해 갱신해야 한다. 이 세 변경은 다른 세션 작업이며 이 문서 작성자가 새로 검증한 구현으로 간주하지 않는다.

```powershell
Set-Location 'C:\Users\user\.codex\worktrees\paid-delivery-reliability\code-destiny'
git status --short
git branch --show-current
git rev-parse HEAD
Get-Content 'C:\Users\user\.codex\worktrees\paid-delivery-reliability\code-destiny\docs\handoff\2026-09-27-paid-delivery-reliability.md'
git fetch origin main
git log -5 --oneline origin/main
# tracked 변경이 없고 병합 가능함을 확인한 뒤 기존 격리 checkout을 최신화한다.
git merge --ff-only origin/main
node scripts/report-paid-delivery-inventory.mjs
# 현재 exit 2 예상: 미매핑 48개. 실패를 숨기지 말고 각 경로를 조사한다.
node scripts/report-yeongnyangi-pass-economics.mjs
```

변경 후 검증·전달:

```powershell
npm run check:fast -- --plan
npm run check:fast
npm run verify:handoff-contract
git diff --check
# 변경 단위의 실제 파일만 stage/commit한다. 일괄 add나 reset을 하지 않는다.
# main의 다른 세션 상태를 다시 확인하고 검증 커밋만 병합 → git push origin main.
# 푸시한 정확한 SHA의 GitHub CI required 성공을 확인한다.
```

스테이징 fixture 명령은 기존 검증 문서의 두 `verify-yeongnyangi-*-mongo-staging.mjs --staging-fixtures` 절차를 사용한다. 별도 테스트 DB와 정리 대상을 확인하고 최종 릴리스 검증 시 실행한다. 운영 고객 복구는 먼저 기존 `recover-yeongnyangi-request.mjs`의 dry-run과 증빙 확인부터 시작하며 적용 명령을 이 문서에서 자동 실행하지 않는다.

최종 보고에는 원인·수정 파일·유지 정책·전후 실측·상품별 검증·손익·실 PG/LLM/DB 구분·배포 SHA·남은 위험을 나누어 적는다. 현재 막힌 실시험과 독립적인 구현은 계속 진행할 수 있다.
