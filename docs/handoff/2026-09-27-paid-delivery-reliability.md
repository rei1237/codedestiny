---
status: active
updated: 2026-09-27
next: "1단계 B(결제 전 의도 등록 `awaiting_payment`·크론 증명 승격·증빙 키 제외 병합, 등록 11키)는 main 에 있다. 먼저 0절 P0 후보 — 공통 엔진 첫 삽입이 `$setOnInsert.updatedAt`과 mongoose timestamps 의 `$set.updatedAt`을 함께 보내 MongoDB code 40 으로 거부될 수 있음(드라이버 입력 실측, 08-09 guardian 사고와 같은 모양) — 의 프로덕션 반영 여부를 읽기 전용으로 확인하고, 사용자 승인 뒤 고쳐 실제 Mongo 로 확인한 다음 2단계 상품 48개 미매핑 해소와 3단계 전체 구간 계측을 이어서 진행한다."
---

# 결제 지연·유료 결과 복구·LLM 비용 통제 인수인계

## 현재 상태와 작업 위치

전체 계획은 미완료다. 1차 구현은 main과 스테이징에서 검증했지만 이 작업에서 프로덕션 승격은 하지 않았다. 승인 대기만 남은 작업이 아니다. 아래 서버 복구·상품 연결·계측 구현이 남아 있다.

- 주 저장소: `D:\Development\code-destiny`
- 재사용할 격리 작업 디렉터리: `C:\Users\user\.codex\worktrees\paid-delivery-reliability\code-destiny`
- 직전 이 작업 문서 커밋: `ff513e9da66c73cf4b67378d02b46d61fafbb9e3` (main에 병합됨).
- 인수인계 작성 기준 main/격리 HEAD: `3d73f0a5d`(이 문서 커밋의 부모, 1B 본 구현 뒤 — 전체 SHA는 `git rev-parse 3d73f0a5d`로 확인). 이후 main은 다른 세션에서 변경될 수 있다.
- 런타임 critical CI 및 양쪽 스테이징 SHA를 직접 검증한 기준: `3baf54db3d8250fcbe89f6357026ae35f039e89e`. 현재 HEAD 전체를 이 검증으로 대체하지 않는다.
- main에는 마케팅 파일, `next-env.d.ts`, 화면 캡처 등 다른 세션의 미커밋 작업이 있다. 격리 체크아웃을 재사용하며 reset/stash/일괄 stage를 하지 않는다. 이전 임시 파일 `paid-delivery-plan.json`, `paid-primary-before.txt`는 이번 문서 검사에 섞이지 않도록 시스템 TEMP의 고유 paid-delivery-handoff 디렉터리로 보존 이동했다.
- 최초 인수인계 커밋은 이 문서만 추가했다(런타임·정책·계정·주문 변경 없음). 이후 런타임 변경은 아래 후속 세션 항목에 있다.
- **2026-09-27 후속 세션(1단계 A):** 기준 `bb970446e` 위에 `94d583536`(엔진 DB 연산 withMongoRetry·서버 진입점) → `9f1d6f638`(oracle-consultation 테스트 목 보강) → `ba0326a27`(상품 어댑터 추출·레지스트리) → `dd0123537`(10분 크론 이어생성·모니터 지연) 을 격리 워크트리에서 만들어 main 에 fast-forward 로 전달했다. 1단계 B·2단계·3단계는 미착수다.
- **2026-09-27 후속 세션(1단계 B 선행 수정):** 기준 `6797c40a8` 위에 `9d8be5c91`(geomancy counts·animal-totem cards/birth 를 JSON 문자열로 서술자에 실음) → `ca6154fef`(guardian 이 질문 전 recentTurns 를 서술자에 고정) 를 격리 워크트리에서 만들어 이 문서 커밋과 함께 main 에 전달했다. 첫 push(`3f27d4be0`)는 `9d8be5c91`의 sync:public 을 1회만 돌린 탓에 CI `Static guards`(`verify-public-mirror-fresh`, `?v=` 키 한 세대 차)에서 실패했고, `29605f577`에서 3회 수렴한 산출물로 수습했다. 1B 본 구현(의도 등록·증빙 결속·병합 규칙)과 2·3단계는 미착수다. 실 PG·과금 LLM·운영 DB 0회.
- **2026-09-27 후속 세션(1단계 B 본 구현):** 기준 `25ad5ee7e`에서 만든 `8261429ba`(서버: 결제 전 의도 등록·크론 증명 승격·증빙 키 제외 병합) → `d52cfb4e6`(등록 11키 페이지의 결제 직전 등록·pet 날짜 고정·sync:public·sitemap) → `3d73f0a5d`(의도 테스트)를 origin/main `18622016a` 위로 rebase 해 이 문서 커밋과 함께 main 에 전달했다. 작업 중 **P0 후보**(공통 엔진 첫 삽입이 MongoDB code 40 으로 거부될 수 있음)를 발견해 보고만 했다 — 아래 0절. 2·3단계는 미착수다. 실 PG·과금 LLM·운영/스테이징 DB 0회.

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
| 서버 이어생성 | `worker/lib/paid-narrative-recovery-task.js`(신규), `paid-narrative-adapters.js`(레지스트리 18키), `paid-narrative-delivery.js`의 `resumePaidNarrativeOnServer`, `worker/index.js` 10분 분기 배선 | 이미 실행 기록이 생긴 건과 1B 가 승격한 의도(등록 11키). 제외 7키는 첫 요청 전 이탈 시 여전히 기록이 없다. 스테이징 `crons = []`라 자동 경로 스테이징 실증 없음 |
| 결제 재개 서술자 | `geomancy-oracle-v4.html`, `js/animal-totem-experience.js`(배열·객체를 JSON 문자열로 싣고 복귀 때 검증), `app/fortune-chat/FortuneChatClient.tsx`·`paid-turn-recovery.ts`(질문 전 recentTurns 고정) | 복귀 본문 = 페이지 내 본문(증빙 키 차이는 1B 병합 규칙이 흡수). pet 자정 날짜는 1B 에서 수정. 이 행의 geomancy·`fortune-chat-consultation`(guardian)은 서버 등록 제외, totem 은 등록 11키(1B 절) |
| 결제 전 의도 등록 | `worker/lib/paid-narrative-intent.js`·`worker/routes/paid-narrative-intent.js`(신규), `paid-narrative-delivery.js` 증빙 키 제외 병합·증명된 실행의 verifier 생략, `paid-narrative-recovery-task.js` 틱 시작 승격, 등록 11키 페이지의 결제 직전 등록 | mock 만. 제외 7키는 1A 브라우저 재개만. P0 후보(엔진 첫 삽입 code 40) 미수정 |

**동시 작업 주의:** 현재 main에는 후속 `a572d4ae5`가 들어 있다. 반복되거나 무효인 보완 응답이 기존 유효 초안을 막던 문제와 섬 캐시 minChars 연결을 수정했다. `docs/handoff/2026-09-27-llm-length-never-fatal.md`의 P1 완료 기록과 최신 diff를 읽고 보존한다. 그 문서의 P1 이전 전수 조사와 이 작업의 원래 보고는 역사적 스냅샷이며 최신 구현과 다를 수 있다. 길이 품질 작업의 P2~P5와 여기의 복구 작업을 중복 구현하지 않는다. 타 세션에 메시지를 보내는 것은 사용자 허가 없이 하지 않는다.

## 남은 작업 순서와 통과 조건

### 0. P0 후보 — 공통 엔진 첫 삽입의 MongoDB code 40 (발견·보고만, 미수정)

1B 작업 중 발견했다. 범위 밖 결함이라 고치지 않았다. 고칠지와 범위는 사용자 판단이 먼저다.

- **실측(드라이버 입력):** `runPaidNarrativeDelivery`의 첫 삽입 `ServiceExecutionTransaction.findOneAndUpdate({ userId, executionKey }, { $setOnInsert: insert }, { upsert: true, returnDocument: "after" })`(`worker/lib/paid-narrative-delivery.js`, 삽입 모양은 `paidNarrativeInsert`)는 `$setOnInsert.updatedAt`을 싣는다. 스키마 timestamps 가 켜진 mongoose 9.3.0 은 `$set.updatedAt`을 항상 더하고 `$setOnInsert`는 건드리지 않는다(`node_modules/mongoose/lib/helpers/update/applyTimestampsToUpdate.js:52-81`, 75행 `updates.$set[updatedAt] = now`). 컬렉션 메서드를 바꿔 끼운 오프라인 프로브(DB 연결 없음) 출력: `route first insert (engine) -> findOneAndUpdate {"$set":["updatedAt"],"conflictingPaths":["updatedAt"]}`.
- **근거(문서·선례 — 여기서 서버 거부는 미실측):** 같은 경로가 `$set`과 `$setOnInsert`에 함께 있으면 MongoDB 는 ConflictingUpdateOperators(code 40)로 거부한다. 2026-08-09 guardian-fortune 사용량 upsert 가 같은 모양으로 운영에서 전부 실패했다(`29f0d0aed`). 로컬 mongod·mongodb-memory-server 가 없어 실제 서버 거부는 재현하지 못했다.
- **범위(일부 추정):** 도입 `4fe97827f`(2026-09-15), origin/main 에도 있다. 공통 엔진으로 첫 실행을 만드는 모듈 11개(`worker/lib/{expert-follow-up,feature-question,guardian-paid,love-tarot,mindscan,tarot-oracle}-delivery.js`, `worker/routes/{animal-totem,dream,oracle,pet-saju-ai,yoga-guru}.js`)의 첫 POST 가 대상이다. 거부되면 `isPermanentMongoError`로 500 이다. 프로덕션 반영 여부와 운영 로그의 code 40 발생은 **미확인**.
- **왜 안 잡혔나:** 정적 가드 `scripts/verify-no-timestamp-update-conflict.mjs`(UNWIRED_BY_DESIGN)는 `$setOnInsert`가 변수(`insert`)라 못 본다. jest mock 은 연산자 충돌을 흉내 내지 않는다. 1B 의도 테스트의 충돌 검사(`conflicts`)도 의도 쪽 쓰기만 보고 엔진의 findOneAndUpdate 는 대상이 아니다.
- **1B 쓰기는 안전(같은 프로브):** 의도 등록 `conflictingPaths: []`, 승격 `conflictingPaths: []`(승격은 `updatedAt`을 빼고 넣는다). 그래서 등록 11키는 route 첫 삽입이 거부돼도 결제 증명 뒤 크론이 실행을 만들 수 있다(그동안 브라우저는 오류를 볼 것으로 추정).
- **제안 수정(승인 필요):** `paidNarrativeInsert`에서 `updatedAt`을 빼거나 엔진 호출부에서 뺀다 → 실제 Mongo(승인된 격리 DB)로 첫 삽입 성공을 확인 → 가드가 변수 `$setOnInsert`도 보게 할지 정한다. 이미 운영에 반영됐다면 영향 주문 조회(읽기 전용)부터 한다.
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

#### 1B. 승인 직후 주문 영속 등록 — 완료 (`8261429ba`·`d52cfb4e6`·`3d73f0a5d`, 등록 11키)

선행 수정(상품별, `9d8be5c91`·`ca6154fef`)에 이어 본 구현을 넣었다. 결제창을 열기 전에 페이지가 결제 뒤 보낼 route 본문을 그대로 서버에 의도(`awaiting_payment`)로 맡기고, 10분 크론이 결제 게이트 자신의 소비 기록으로 결제를 증명하면 1A 가 이어받는 `pending` 실행으로 승격한다. 승격은 과금·이용권 차감을 하지 않는다. 공통 전제는 그대로다: 서버 등록 본문과 브라우저 POST 가 같은 실행이 되려면 복귀 본문이 결제 전 페이지 내 본문과 같아야 한다. 서술자 args 는 원시값만 `js/core/checkout-entry.js:1497` 정리기를 통과하므로 배열·객체는 JSON 문자열로 싣는다(TSX 는 `packPaidResumeArg`/`unpackPaidResumeArg`). 아래 앞 네 줄은 선행 수정 결과이며 1A 브라우저 재개에도 쓰인다.

- **geomancy — 수정(`9d8be5c91`).** `counts`(8~29 정수 16개)를 JSON 문자열로 싣고 복귀 때 `parseGeomancyResumeCounts`가 검증한다. 모양이 틀리면 예전처럼 새로 던진다(예전 배열 티켓도 받는다).
- **animal-totem — 수정(`9d8be5c91`).** `birth`는 JSON 문자열, `cards`는 복원에 필요한 `{slot, animalId}`만 JSON 문자열로 싣고 복귀 때 검증한다(카드 문구는 복원 뒤 `buildReadingCards`가 다시 만든다).
- **yoga — 수정 불필요(실측).** 서술자 `{mood, duration, requestId}`가 원시값이고, 페이지 내와 복귀가 같은 `invokeGuruCore`에서 상수 `buildSystemPrompt()`·(mood, duration)의 순수 함수 `buildUserPrompt`·숫자 `duration`(버튼 리터럴 30/60)으로 본문을 만든다(mood 는 양쪽 trim). 다를 수 있는 것은 증빙 키(`transactionId`·`purchaseId`·`sessionId`)뿐 — 아래 병합 규칙 몫.
- **guardian — 수정(`ca6154fef`).** 서버는 `recentTurns`를 '이전 대화'로 읽는데, 페이지 내 결제 호출은 결제창 대기 중 다시 그려진 `messagesRef`(현재 질문 포함)로, 복귀는 bootstrap 이 대화를 채우기 전의 빈 대화로 만들어 두 본문이 달랐다. `send`가 질문을 넣기 전 대화를 한 번 굳혀 페이지 내 본문과 서술자에 같이 쓴다. **동작 변화:** 유료 페이지 내 턴의 `recentTurns`에 현재 질문이 더는 들어가지 않는다(`concern`에는 있다 — 무료 경로와 같아졌다). **개인정보:** 최근 6턴 원문이 암호화된 결제 재개 컨텍스트(대기 30분·승인 7일)에 `concern`과 같은 등급으로 저장된다. 서버는 여전히 6턴·160자·민감 턴 제거로 다시 조인다.
- **pet — 수정(`d52cfb4e6`).** `pet-saju.html`의 `paidRequestBody`가 요청마다 `date: kstToday()`를 넣어 KST 자정을 넘긴 복귀·재시도 본문이 달라지던 것을, `runPaidGateOnce`가 결제 전에 `kstToday()`를 한 번 굳혀 의도 본문·서술자 `date`·결제 뒤 본문에 같이 쓰게 했다. 복귀는 서술자 `date`가 `YYYY-MM-DD`면 그 값을, 아니면 예전처럼 `kstToday()`를 쓴다. 서버 `normalizeRequestDate`(`worker/lib/pet/pet-input.js:95`)는 그대로다.
- **등록 — `POST /api/paid-narrative/intent?featureKey=…`**(`worker/routes/paid-narrative-intent.js`, `worker/lib/paid-narrative-intent.js`의 `registerPaidNarrativeIntent`). `requireAuth` + `enforceSensitiveEndpointSecurity`(POST·JSON·10분 20회·64KB). 상품의 route seed 로 본문을 route 와 똑같이 검증하고, oracle(카드 수)·totem(mode)은 route 가 본문에서 유도하는 featureKey 와 다르면 거부한다. 이미 실행이 있으면 200 `registered:false`, 이미 결제 증명이 있으면 409 `ALREADY_PAID`(route 로 바로 가면 된다), 증명 조회 불가 503, 사용자당 활성 의도 20건 초과 429. 저장: `status:'awaiting_payment'`, executionKey `paid-intent:sha256([userId, featureKey, requestId])`(엔진 키와 접두어가 달라 같은 문서가 되지 않는다), `metadata.paidIntent`(본문·requestId·locale·attempts·errors·첫 확인 시각=등록+5분·reviewRequired), `timeoutAt = retentionUntil = 등록+24시간`. reportType·reportId·sessionId·idempotencyKey 는 없다. 같은 의도를 다시 등록하면 본문·시각만 갱신한다.
- **증빙 결속 — 게이트 소비 기록 확인(실측) → 등록 11키.** 결제 게이트가 소비 기록(Payment·PointHistory·MonthlyCreditLedger·이용권 마커)을 route 본문과 같은 featureKey·requestId 로 남기고 route seed 가 본문에만 기대는 상품만 넣었다: `tarot-love-relationship`·`tarot-mindscan`·`tarot-prompt-maker`(+`-standard`·`-deep`·`-master`)·`pet-saju-ai-consultation`·`pet-compatibility-ai`·`animal-totem-basic`·`animal-totem-deep`·`dream-psycho-analysis`. 증명은 `verifyPerUsePayment(env, { userId, featureKey, requestId, requireExisting: true })` — 이미 있는 소비만 보고 차감 분기에 들어가지 않는다. admin 접근은 구매가 아니라서 승격하지 않는다.
- **제외 7키(fail-closed, 사유는 `PAID_INTENT_EXCLUSIONS` — 1A 브라우저 재개는 유지).** feature-question 4키(`astrology_`·`ziwei_`·`sukuyo_`·`vedic_ai_prompt_generator`): seed 가 route 의 `prepare()`를 부르고 환불이 route 자신의 결제 증빙에 묶인다. `fortune-chat-consultation`: 무료 슬롯·사용량 계산이 route 에 있고 결과 GET 이 상태 필터 없이 최신 기록을 재사용한다. `geomancy`: 게이트가 `openGeomancyOracle`로 기록하고 route 키는 `geomancy`라 이 키를 증명할 소비가 없다. `yoga-guru-per-use`: route 본문의 sessionId 가 결제 증빙에서 와 결제 전 본문과 맞을 수 없다. 테스트가 서버 재개 레지스트리의 모든 키를 등록/제외 중 하나로 강제한다(새 키 미분류는 실패).
- **승격 — `promotePaidIntents`**(`paid-narrative-recovery-task.js` 틱 시작에서 try/catch 로 호출, 실패해도 1A 는 돈다). 만료 의도를 `deleteMany`로 지운 뒤 `nextAttemptAt ≤ now`·검토 아님·등록 11키를 틱당 20건·30초 안에서 처리한다. 순서: 엔진 실행이 이미 있으면(브라우저가 route 에 먼저 도달) 의도 삭제 → 증명(null 이면 다음 틱, 미결제·admin 이면 10분부터 6시간까지 지수 백오프) → 환불·취소 표시면 삭제 → 저장된 locale 로 seed → route 첫 삽입과 같은 모양(`paidNarrativeInsert`, 10분 기한, `updatedAt` 제외)을 `updateOne $setOnInsert upsert`(11000 무시) → `metadata.paidNarrative` 존재 재조회로 확인 → 의도 삭제. 예외 3회면 `reviewRequired`. 증명 결과는 `metadata.paidNarrativeProof`(source·transactionId·requestId·provenAt)에 둔다. 승격된 실행은 1A 선택 조건(`timeoutAt ≤ now+5분`)을 맞는 다음 틱부터 이어 만든다 — 닫힌 브라우저의 첫 서버 생성은 결제 뒤 대략 10~25분(틱 간격에서 계산한 추정).
- **증빙 키 제외 병합 — 구현(`paid-narrative-delivery.js`).** 입력 해시(`paidNarrativeInputHash`)가 최상위 증빙 키 15개(`EVIDENCE_KEYS`: transactionId·purchaseId·paymentId·orderId·merchantUid·impUid·idempotencyKey·ledgerId·accessGrant·consume·payment·paymentContext·_paymentContext·accessDecision·paidAccess)를 빼고 키 순서와 무관하게 비교한다. 목록 밖 새 키는 입력으로 본다(fail-closed). 같은 입력이면 저장된 원본으로 같은 실행을 잇고, 다르면 여전히 409 `INPUT_MISMATCH`다.
- **엔진의 나머지 변경.** 조회가 `metadata.paidNarrative` 존재를 요구해 의도 문서는 엔진 GET·재개에 잡히지 않는다. `metadata.paidNarrativeProof`가 있는 실행(크론이 증명한 실행)은 route verifier 를 건너뛴다 — 저장 본문이 결제 증빙 이전 본문이라서다(예전 함정 ③). `revoked()`는 그대로 막고 증명 transactionId 도 대조한다. route 첫 삽입 모양을 `paidNarrativeInsert`로 빼 승격과 공유했다(route 동작은 그대로 — 그래서 0절 결함도 그대로다).
- **불가시성(실측, 예전 함정 ①).** 일일 `sweepStaleServiceExecutions`와 모니터는 `status:'pending'`만 고른다. oracle 재개 조회가 의도를 찾아도 엔진이 404 로 끝난다. service-execution 작업의 다른 읽기는 무해했다. 모델 enum 에 `awaiting_payment`를 더했다.
- **보존·정리(예전 함정 ②).** TTL 인덱스를 가정하지 않고 틱마다 만료 의도를 지운다. 운영 인덱스·마이그레이션 없음. 결제되지 않은 의도의 본문은 최대 24시간 남는다.
- **클라이언트 계약.** 결제창 호출 바로 앞에서 결제 뒤 첫 POST 와 **같은 본문**을 같은 fetch 경로로 보낸다(TSX 는 `authFetch` — 본문 locale 정렬 포함). keepalive, 응답 무시, 최대 1.5초만 기다리고 실패·지연이어도 결제는 진행한다. 위치: `app/_lib/oracle-delivery.ts`의 `registerPaidNarrativeIntent`(LoveRelationshipTarot·MindScanTarot·TarotPromptMakerClient), `pet-saju.html` `registerPetPaidIntent`, `js/psycho-dream-analyzer-freuds-study.js` `registerPaidIntent`, `js/animal-totem-experience.js` `registerTotemPaidIntent`. 테스트가 11키 페이지의 등록 호출이 결제 게이트 호출보다 앞에 있음을 소스로 고정하고, totem UI 테스트는 의도 본문 = 결제 뒤 본문을 단언한다.
- **남은 위험.** ① 승격 뒤 결제 중 언어를 바꾼 페이지가 다른 locale 본문을 보내면 409 가 날 수 있다(추정, mock 미재현). ② 프로덕션 승격 뒤 크론이 증명된 의도를 **사용자 요청 없이 실 과금 LLM 으로** 이어 간다(1A 와 같은 항목당 3회 예산). 스테이징 `crons = []`라 자동 경로 스테이징 실증 없음 — 1A 운영 위험 항목과 함께 시험표 승인 범위에 넣을지 정한다. ③ 게이트가 소비 기록에 requestId 를 남기지 못한 결제는 승격되지 않고 24시간 뒤 지워진다(1A 브라우저 재개만 남는다). ④ 실제 Mongo 회귀 없음(mock 만) — 0절과 함께 확인한다. ⑤ 범위 밖 관찰(수정 안 함): 표시 가격이 레지스트리와 다르다 — `pet-saju.html:568-569` 50코인·5,000원 대 `worker/lib/paid-feature-registry.js:274-275` 30·3,000, `worker/routes/animal-totem.js:60` deep `coinPrice: 50` 대 레지스트리 `:291` 30. 실제 청구액은 미검증.
- **롤백.** `git revert 3d73f0a5d d52cfb4e6 8261429ba`. 클라이언트만 되돌려도 결제 흐름은 그대로다(등록은 응답을 무시한다). 서버를 되돌리면 남은 `awaiting_payment` 문서를 지우는 작업이 없어지므로, 필요하면 별도 승인으로 정리한다(엔진·스윕은 그 문서를 읽지 않는다).
- **보관함 목록 API — 3단계로 미룬다.** 영냥이·꿀꿀 운세 보관함에 목록 API 가 없어(신규 기능) 진행/재시도/검토 상태 노출은 새 필드가 아니라 새 API 가 필요하다.

B 의 요구와 통과 조건(원래 목록). 이 중 브라우저 종료·DB 응답 유실·만료 작업자의 늦은 저장·동시 복구·환불 경합·소진 검토는 A 경로에서 mock 으로 확인했다(`__tests__/worker/paid-narrative-recovery-task.test.js`). 승인 응답 유실·큐 등록 실패·중복/역순 콜백·보관함은 B 에서 새로 증명한다. 1B 본 구현은 결제 뒤 브라우저 종료(게이트 기록으로 증명 → 서버 전달)·브라우저 선도착과 승격 뒤 복귀(같은 실행)·승격 upsert 의 DB 응답 유실·중복 키·동시 틱·환불/admin/조회 장애를 mock 으로 확인했다. PG 승인 응답 유실은 게이트가 브라우저 없이 소비 기록을 남기는지에 달려 있어 미검증이고, 큐 등록 실패는 해당 없다(큐 대신 크론 재확인·백오프). 격리 DB 회귀와 보관함은 남았다.

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
- 1단계 B 본 구현(mock 전용): 신규 `__tests__/worker/paid-narrative-intent.test.js` 10건 — 등록은 정확한 route 본문만 저장하고 엔진 읽기에 안 보임, 결제됨·조회 불가·과다 등록 거부, oracle/totem 은 route 가 유도하는 키로만 등록, 닫힌 브라우저는 게이트 기록 증명 뒤 전달, 승격 뒤 돌아온 페이지는 같은 기록·입력 검사 유지, 브라우저가 먼저 도달하면 의도 종료, 환불·admin·조회 장애는 전달 없음, 응답 유실·중복 키·동시 틱은 한 기록·반복 예외는 검토, 서버 재개 상품 전수 등록/제외, 11키 페이지의 결제 직전 등록. 변이 8종 모두 검출. totem UI `node --test` 3/3(의도 본문 단언 변이 검출), `expert-follow-up-delivery` 12/12, paid-gate-suite 88/88. 개별 검사기 통과: worker-security-guards·ai-locale-browser-contract·paid-feature-common-flow·payment-freeze·mongo-query-index-shapes(979 쿼리, 위반 0)·route-await-dispatch·per-use-never-unlocks 23/23·payment-concurrency-guards·payment-service-boundary·credential-cache·no-nested-retry. `check:fast` critical 등급 exit 0 — test:node 1756·jest 305 스위트 4392건·paid-gate-suite 88/88 통과(리베이스 전 `25ad5ee7e` 위 작업 트리 기준). 리베이스(`18622016a`) 뒤 대상 jest 18 스위트 536건·totem UI 3/3·`verify:sitemap-drift` 일치·`sync:public` 무변경을 다시 확인했다. 실 PG·과금 LLM·운영/스테이징 DB 0회.

## 이용권 결론 및 아직 승인되지 않은 시험표

Family v3 149,000원/30일/누적 5,000단위는 무제한 생성이 아니다. 고등어·연어·광어·참치·융합의 한도 비례 회당 매출 배분은 298/894/1,490/2,980/5,960/14,900원이다. 이는 정책 산술이며 실제 정산 매출이 아니다. PG·LLM 평균/p95·재시도/복구·운영비가 미확인이므로 수익성 판단 불가, 현행 정책 유지.

제시한 시험표는 고등어 웹 1,000원 + 모바일 별도 1,000원 + 참치 10,000원, 총 PG 12,000원이다. gemini-2.5-flash 장/분석 합계 최대 250호출·공급자 세전 US$12.07, 세금/환율/카드 수수료 별도. 고등어 웹 1건만 선택하면 1,000원·50호출·세전 US$2.414. 비용은 과거 조회 단가에 의한 제안 상한이며 실측 원가가 아니다. 실행 전 모델/가격/새 v6 manifest/기존 자동3+서버2 예산을 확인하고 달라지면 재산정한다. 사용자 추가 복구/수동 예산 증액은 이 시험에 포함되지 않는다.

상세 시험표와 가상 QA 입력·영수증 보존 절차는 기존 검증 문서에 있다. 자동 환불 없음. 실제 모바일 외부 앱 복귀에는 실제 기기/결제 수단이 필요하다. 승인 질문에 답이 없고 계정 제공만 있었으므로 아직 어느 시험도 실행하면 안 된다.

## 재개 명령

### 이번 인수인계 전달 검사

- 문서 커밋 `3a9a7adcccf2af90627e24d3a7b1581fb42fa32a`는 main push 완료. `check:fast -- --plan` fast, `check:fast` 통과, `verify:handoff-contract` 199개 문서 통과, `git diff --check` 통과.
- [해당 main CI](https://github.com/rei1237/codedestiny/actions/runs/36266664180)의 Static guards는 `verify:hero-firstpaint-lock`에서 실패했다: `Only the shared hero/payment art is preloaded` (`scripts/verify-hero-firstpaint-lock.mjs:77`). 부모 `06d651ce5`와 이 커밋 사이 변경은 이 인수인계 문서 1개뿐이며 해당 검사/hero 소스는 변경하지 않았다. 문서 전달을 CI 전체 통과라고 보고하지 않는다. 이후 main 에서 해결됐다 — 1B 세션이 `25ad5ee7e` 기준 로컬 `verify:hero-firstpaint-lock` PASS 를 확인했다. 이 요청 밖 UI/가드를 임의 수정하지 않았다.

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
