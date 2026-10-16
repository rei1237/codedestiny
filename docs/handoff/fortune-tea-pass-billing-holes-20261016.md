---
status: in-progress
updated: 2026-10-16
next: "1단계 — 운영 DB 읽기 전용 조회(승인됨) 결과를 4장에 기록한 뒤 A단계 핫픽스로 진행한다."
---

# 운명 찻집 10,000원: 이용권 차감 누락과 결제 증빙 재사용 구멍

작성: 2026-10-16 / 레포: `D:\Development\code-destiny` / 기준 커밋: main `3be4b029d`

## 0. 사용자 지시와 사건

- 2026-10-11부터 찻집 상담 5종의 가격은 10,000원(100코인)이다. 출처는 `worker/lib/paid-feature-registry.js:260-264` 한 곳이다.
- **사건:** 2026-10-15(어제)에 누군가 찻집 상담을 받았고, "확인됐다"고 보고됐다. 그런데 10,000원은 입금되지 않았다.
  - 사용자는 이용권 구매자로 추정한다. 이메일은 모른다.
- **사용자 지시:** "이런 구멍이 없도록 정확하게 분석하고 다른 세션에서 진행"할 것.
  - 이 문서의 결함 1~4를 모두 고쳐야 완료다.
- **작업 규칙:** `AGENTS.md`와 `CLAUDE.md`를 먼저 읽는다.
  - main에서 직접 작업한다. 브랜치·PR은 만들지 않는다.
  - 동시에 작업하는 세션이 있으면 워크트리를 쓴다.
  - **운영 DB 조회와 운영 쓰기는 사용자의 별도 승인이 필요하다.**

### 0.1 범위 확장 (2026-10-16, 이어받은 세션)

- **사용자 추가 지시:** "찻집 이외에도 다른 유료 상담 등이 결제 없이 열리거나 개발자 콘솔 등으로 조작이 불가능해야해"
- **완료 조건:** 서버가 아래 둘 중 하나를 확인하기 전에는 어떤 유료 본문도 주지 않는다. 본문·쿼리·localStorage 조작, 재전송, ID 재사용으로는 열리지 않아야 한다.
  - 이번 요청에 묶인 결제 증빙(1건 = 상담 1건)
  - 실제로 차감된 이용권
- **사용자 결정:** 운영 DB 읽기 전용 조회 승인 / 브라우저 계산 유료 리포트는 서버 계산으로 이전 / 낙샤트라 `PER_USE_ENFORCE` 지금 켜기. 운영 쓰기·회수·차단·환불은 미승인(매번 묻는다).
- **전 경로 감사 결과(코드로 확인한 구멍 유형 5가지)**
  1. **본문 신뢰:** `worker/lib/access-control.js:915` `requirePremiumReportAccess`가 요청 본문의 `_userDoc`를 사용자 문서로 채택한다. 본문을 그대로 넘기는 pet-saju-ai, destiny-compass-ai, oracle, saju-compat-basic, yoga-guru, celestial-harmony가 위조 문서 하나로 열린다.
  2. **결제 미강제:** `worker/routes/nakshatra-premium.js:294` `PER_USE_ENFORCE = false` → 무후르타·VVIP 코덱스 무료.
  3. **이용권·라이선스·월구독 무차감:** `canAccessPaidFeature`(`paid-feature-access.js:238-321`)의 허용 분기는 읽기 전용이다. 이 판정만 믿는 회당 라우트(찻집, dream, tarot 지름길, sukuyo-compatibility-ai, neo-operation-room, naming-prompt, ziwei-deep-report)와 `requirePremiumReportAccess` 이용권 분기는 차감하지 않는다(결함 1의 일반형).
  4. **증빙 재사용:** 본문의 결제·차감 ID를 userId+featureKey로만 대조한다(결함 2의 일반형). 찻집 외 karma, new-year, vedic, astrology, nakshatra-ai, neo, sukuyo-compat, life-book, love-secret, ziwei-ai, ziwei-island, master-love-codex, naming-prompt, fortune.js AI 프롬프트, 공용 `deferred-billing-proof.js:166`, `access-control.js` 토큰·최근 결제 창, `moonstone-spend-proof.js:133`.
  5. **브라우저 계산 유료 본문:** 테토겐 심화(`js/entertain-engine.js:2748`), 숙요 3종(`js/saju-engine-tarot-sukuyo-quantum.js:8719`), `cd_verified_unlock_grants_v1` 타일(`index.html:20750`)은 localStorage만 바꾸면 열린다.
- **수정 단계:** A(즉시 차단 핫픽스: `_userDoc`, 낙샤트라, fortune.js 본문 이용권 주장, VPU 빈 거부 코드) → B(`settlePerUseAccessDecision`: 이용권 허용 = 차감) → C(`billing-evidence-claim.js`: 증빙 1건 = 요청 1건, `_id` 유일성으로 인덱스 마이그레이션 불필요) → D(브라우저 계산 리포트 서버 이전) → E(저위험 정리) + 정적 가드 `verify:paid-access-integrity`.

## 1. 결론

정상 결제 경로(PortOne `paid` 확인 + 금액 일치)는 안전하다. 구멍은 **결제를 대신하는 경로**에 있다.

| # | 결함 | 심각도 | 위치 |
|---|---|---|---|
| 1 | 이용권으로 찻집을 열면 이용권 한도가 **한 번도 차감되지 않는다** → 이용권만 있으면 사실상 무제한 무료 | **P0 (이번 사건의 유력 원인)** | `worker/routes/fortune-tea-house.js:1639-1648`, `:6183-6192` |
| 2 | 결제 증빙(Payment·PointHistory·PaidExecutionRecord) 하나로 **여러 상담을 열 수 있다** | P0 | `fortune-tea-house.js:1308-1428`, `:4756-4768` |
| 3 | `licenses.{vvip,premium,standard}` 카운트가 있으면 **가격·한도 검사 없이** 열린다 | P1 | `worker/lib/paid-feature-access.js:147-162`, `:258-270` |
| 4 | 이용권 cycleKey가 없으면 월 한도를 **세지 않는다** | P1 | `worker/payments/passes.js:413-414` |
| - | 관리자 role 무료, 스테이징 1,000원 결제, 계좌이체·상품권 정산 지연 | 정상 동작. 사건 판별에만 사용 | 아래 3.3 |

### 결함 1 상세 — 이용권 차감 누락 (확정)

1. 화면은 먼저 `POST /api/fortune-tea-house/ensure-access`를 호출한다(`src/features/fortune-tea-house/FortuneTeaHousePage.tsx:1264-1288`).
   - 통과하면 **결제 게이트를 건너뛰고** 곧바로 `/consult`로 간다.
2. 서버 `verifyFortuneTeaHouseConsultAccess`(`fortune-tea-house.js:1525`)가 `canAccessPaidFeature`를 호출한다.
   - 이때 requestId는 넘기지 않는다(`:1593-1598`).
   - 이용권 보유자는 `resolveFeatureAccessPolicy`(`worker/lib/entitlement-policy.js:265-311`)가 `license_pass` 또는 `family_access` 판정을 내린다.
   - 이 판정은 **읽기 전용**이다.
3. `isReusableFortuneTeaAccessDecision`(`:1291-1301`)은 `pass|family|license` 문자열만 보고 통과시킨다. 이때 `deferredUsage: false`다.
4. 생성이 끝난 뒤 차감 호출(`callFortuneTeaDeferredUsageRoute ... "apply"`, `:6189-6192`)은 `deferredUsage`가 참일 때만 돈다.
   - **이용권 경로에서는 아무것도 차감하지 않는다.**
5. 결과
   - `monthlySpendCoin`이 늘지 않아 월 한도(중간 600 · 큰 1,200 · 패밀리 3,500코인)에 영원히 닿지 않는다.
   - 포함 횟수(`premiumUseCount`)도 늘지 않는다.
   - 예산 소진 종료(`terminatePassOnBudgetExhaustion`)도 일어나지 않는다.
   - 이용권 보유자에게 "10,000원 결제"가 요구되는 순간이 오지 않는다.
6. 다른 유료 서비스는 이미 공용 차감기 `consumePassForFeature`(`worker/lib/pass-consumption.js:166`)를 쓴다.
   - 사용처: fortune, astrology-ai, life-book-ai, love-secret-ai, master-love-codex, nakshatra-ai, karma-destiny-ai.
   - 파일 머리 주석(`pass-consumption.js:1-16`)이 바로 이 결함 유형을 설명한다.
   - **찻집만 빠져 있다.** `git log -S consumePassForFeature -- worker/routes/fortune-tea-house.js` 결과가 0건이다. 처음부터 연결된 적이 없다.

### 결함 2 상세 — 증빙 재사용 (코드상 가능, 재현 테스트 필요)

1. `collectFortuneTeaBillingEvidenceIds(body)`(`:1203`)는 **클라이언트 본문**에서 ID를 모은다.
   - 같은 사용자, 같은 featureKey이고 상태가 `paid/success/fulfilled`인 Payment가 하나라도 맞으면 통과한다(`:1401-1425`).
   - PointHistory `deduct`(`:1357-1379`)와 PaidExecutionRecord(`:1318-1355`)도 같은 방식이다.
2. 중복 차단은 `beginFortuneTeaHouseGeneration`(`:4756-4768`)의 `deliveryAccessKey` 비교 하나뿐이다.
   - 이 비교는 **같은 resultId 안에서만** 작동한다.
   - resultId는 클라이언트가 보낸 `resultId/jobId/attemptId`로 정해진다(`buildHoneyResultId`, `:4696-4711`).
3. 따라서 attemptId만 바꾸고 같은 증빙 ID를 실어 보내면 새 상담이 열릴 수 있다.
4. 금액 비교를 추가하는 것은 해결책이 아니다.
   - 2026-10-11 이전 5,000원 주문은 그 금액을 유지하는 것이 정책이다(`PAYMENT_POLICY.md:36-44`).
   - **해결은 "증빙 1건 = 상담 1건" 바인딩**이다.

### 결함 3 상세 — 직접 라이선스

`resolveDecisionFromUserDoc`(`paid-feature-access.js:258-270`)은 `user.licenses.*` 카운트가 0보다 크면 `coinCost`를 보지 않고 허용한다.
- 작은 꿀단지 등급(건당 50코인 한도)이어도 `licenses.standard > 0`이면 100코인 찻집이 열린다.
- 이 경로도 차감하지 않는다.
- 이 함수는 공용이라 찻집 밖에도 영향이 있다.
- **수정 전에 운영에 `licenses.*`가 남은 계정이 몇 개인지 먼저 센다.** 0이면 찻집에서만 막아도 된다.

### 결함 4 상세

`evaluatePassCoverage`는 cycleKey(이용권 만료일 기반)가 비어 있으면 `budgetApplies=false`로 처리하고 월 한도를 통과시킨다. 주석은 "못 세는 상태는 막지 않는다(구 정책 승계)"다.
- 수동 부여 스크립트 `scripts/grant-family-pass.mjs`는 cycle 필드를 채우므로 이 경로에 해당하지 않는다.

## 2. 이번 사건과 관련된 단서

- **미커밋 스크립트 2개가 있다. 다른 세션이 만들었으므로 지우지 말 것.**
  - `scripts/grant-family-pass.mjs` (2026-10-14 02:33)
    - 특정 계정(`ju*****@naver.com`)에 **결제 없이** 패밀리 이용권을 부여한다(`source: "event"`, 만료 100년, Payment 미생성).
  - `scripts/revoke-pass-and-block-account.mjs` (2026-10-16 14:00)
    - 같은 계정의 이용권을 회수하고 계정을 차단한다.
  - 이 계정이 이번 사건의 사용자인지 1단계에서 확인한다. 사용자가 말한 "이용권 구매자"와 다를 수 있으므로 단정하지 않는다.
- **판별 신호:** 이용권·관리자 경로로 열린 상담은 결과 문서의 `deliveryAccessKey`가 문자열 **`"reusable"`**이다.
  - 근거: `fortune-tea-house.js:6070`, `access.accessDecision?.paymentId || "reusable"`.
  - 결제·월정석 증빙으로 열린 상담은 결제 ID가 들어 있다.
- **화면 문구 주의:** 생성 중 문구 "결제는 확인되었고 상담문은 아직 생성 중입니다"(`:6099`)는 이용권 경로에서도 나온다. "확인됐다"는 보고의 출처일 수 있다.

## 3. 작업 순서

### 1단계 — 사건 특정 (읽기 전용, 사용자 승인 필요)

1. 사용자에게 "운영 DB 읽기 전용 조회" 승인을 받는다. 승인이 없으면 이 단계를 건너뛰고 문서에 "미조회"로 남긴다.
2. 스크립트는 `scripts/` 아래 기존 패턴으로 만든다. `scripts/revoke-pass-and-block-account.mjs`의 연결 코드를 참고한다(`buildMongoEnv`, `connectDb`).
   - 연결 직후 DB 이름을 출력한다.
   - **find/aggregate만 사용한다.** 실행이 끝나면 스크립트는 지운다.
3. 조회할 항목
   - **찻집 결과:** `fortune_tea_house_results`
     - 조건: `createdAt`이 `2026-10-14T15:00:00Z` 이상 `2026-10-15T15:00:00Z` 미만(KST 10-15 하루)
     - 출력 필드: `userId, resultId, featureKey, status, deliveryAccessKey, deliveryRequestId, createdAt`
   - `deliveryAccessKey`가 `"reusable"`인 행의 userId로 `users`를 조회한다.
     - 출력 필드: `role, status, profileSubscription.{tier, passTier, source, planId, lastPassOrderId, expiresAt, monthlySpendCoin, monthlyLimitCoin, premiumUseCycleKey, premiumUseCount}, licenses, passGrantOrderIds`
     - 이메일은 마스킹해서 출력한다.
   - 같은 userId의 `payments`
     - 이용권 구매: `productType: "membership_pass"`
     - 찻집 결제: `featureKey ^fortune-tea-house-`
     - 출력 필드: `status, paymentAmount, paymentMethod, paidAt, merchantUid`
   - **결함 2 흔적:** 10-01 이후 결과 중 같은 `deliveryAccessKey`(`"reusable"` 제외)가 두 개 이상의 resultId에 쓰였는지 집계한다.
   - **결함 3 규모:** `users`에서 `licenses.vvip|premium|standard > 0`인 계정 수를 센다.
4. 판정 기준
   - `source: "event"`이고 이용권 구매 Payment가 없다 → 수동 부여 이용권으로 연 상담
   - 이용권 구매 Payment가 있다 → 결함 1(차감 누락)로 무료 이용
   - `role: admin` → 관리자 무료
5. 결과를 이 문서 4장에 적는다.
6. 이용권 회수, 계정 차단, 환불은 **사용자가 결정**한다. 미커밋 회수 스크립트를 임의로 실행하지 않는다.

### 2단계 — 결함 1 수정: 찻집 이용권 경로에 차감 연결

**원칙:** 판정 로직은 새로 만들지 않는다. `consumePassForFeature`, `hasConsumedPassFeature`, `refundPassCoverage`, `passDenialCode`(`worker/lib/pass-consumption.js`)만 사용한다.

**참고 구현** — 먼저 읽고 같은 모양으로 맞춘다.
- `worker/routes/master-love-codex.js:950-1077` — 생성 전 차감, 멱등 재생 처리
- `master-love-codex.js:1230` — 실패 시 `refundPassCoverage`
- `worker/routes/love-secret-ai.js:1013-1026` — 전달 시 차감, 실패하면 결제로 인계

**변경 내용**
1. 차감 시점: `handleConsult`에서 `beginFortuneTeaHouseGeneration`이 새 생성을 잡은 직후, LLM 호출 전.
   - 대상은 `accessDecision`이 이용권 판정인 경우다. 정규화는 `normalizeConsultAccessType`(`entitlement-policy.js:323`)를 사용한다.
   - 차감 키:
     - `featureKey` = `access.featureKey`
     - `requestId` = 화면의 attemptId(`readFortuneTeaRequestId`, `:1430`)
     - `coinCost` = `access.pricing`의 코인 가격
   - 같은 requestId로 오는 폴링·재시도는 `hasConsumedPassFeature`가 멱등으로 처리한다.
   - `covered: false`이면 생성 잠금을 풀고 402 결제창 응답을 보낸다. 코드는 `buildFortuneTeaPaymentRequiredResponse`와 `passDenialCode(reason)`를 쓴다.
   - 시점을 생성 후 전달 시점으로 정할 수도 있다. 그 경우 동시 요청 두 개가 모두 생성을 마친 뒤 하나가 402가 되어 LLM 비용이 낭비된다. 그래서 생성 전 차감을 권장한다.
     - 구현자가 참고 구현을 읽고 다르게 판단하면 근거를 이 문서에 남긴다.
2. 생성이 최종 실패(재시도 불가)하면 `refundPassCoverage`로 되돌린다.
   - 기존 `markFortuneTeaHouseGenerationFailed` 분기(`:6115-6141`) 옆에 둔다.
   - 재시도 가능한 partial 202에서는 되돌리지 않는다.
3. `ensure-access`는 계속 읽기 전용으로 둔다.
   - 차감이 쌓이기 시작하면 기존 `monthlyQuota` 검사(`entitlement-policy.js:296-299`)가 자연스럽게 작동한다.
4. 관리자(`accessSource: "admin"`)는 차감 대상이 아니다. 현 동작을 유지한다.

### 3단계 — 결함 2 수정: 증빙 1건 = 상담 1건

1. `beginFortuneTeaHouseGeneration`에서 새 문서를 claim하기 전에 같은 사용자의 다른 결과 문서를 확인한다.
   - 조건: `deliveryAccessKey`가 같은 accessKey이고(`"reusable"` 제외) resultId가 현재와 다른 문서
   - 있으면 409("기존 상담과 같은 요청으로 다시 확인해 주세요.")를 반환한다.
   - 동시성: `fortune_tea_house_results`에 `{userId, deliveryAccessKey}` 부분 유니크 인덱스를 둔다(`deliveryAccessKey`가 `"reusable"`이 아닌 문서만).
     - 인덱스 마이그레이션은 기존 `scripts/migrations/*` 패턴(`--check` 포함)을 따른다.
     - 운영 적용 전에 1단계 집계로 중복이 없는지 확인한다.
2. Payment 증빙(`:1401-1425`)도 요청 단위로 좁힌다.
   - `requestId/idempotencyKey/metadata.requestId`가 현재 요청의 attemptId와 같을 때만 인정한다.
   - 근거: `paid-feature-access.js:450-500` 주석의 "회당 결제는 이번 요청의 결제" 원칙
   - 예외: 결제 후 리다이렉트 재개 경로(`FortuneTeaHousePage.tsx:1243-1262`)는 같은 attemptId를 보존하므로 깨지지 않는다. 테스트로 확인한다.
3. 금액 비교는 넣지 않는다(이유는 1장 결함 2의 4번).

### 4단계 — 결함 3·4

- **결함 3:** 1단계 집계를 본 뒤 정한다.
  - 운영에 `licenses.*` 보유 계정이 없으면 찻집 접근 판정에서 `accessSource: "licenses"`를 거부(결제 필요)한다.
  - 보유 계정이 있으면 사용자에게 처리 방침을 묻는다.
- **결함 4:** cycleKey가 없는 활성 이용권은 차감 시 `budgetApplies=false`로 통과한다.
  - 2단계 연결 뒤 이 상태로 통과하면 `console.warn`으로 계정 수를 관측한다.
  - 차단(fail-closed)으로 바꿀지는 사용자에게 묻는다. 공용 정본(`passes.js`)이므로 다른 서비스에도 영향이 있다.

### 5단계 — 테스트·검증·전달

- 테스트 파일 하나를 추가한다: `__tests__/worker/fortune-tea-house-pass-consumption.test.js`
  - 모킹은 `__tests__/worker/fortune-tea-house-honey-drops.test.js:240-300` 패턴을 따른다.
  - 케이스:
    - (a) 이용권 통과 시 `monthlySpendCoin`이 100 증가한다
    - (b) 같은 requestId 재요청은 한 번만 차감된다
    - (c) 한도가 소진되면 402를 반환한다
    - (d) 생성이 최종 실패하면 되돌린다
    - (e) 같은 결제 증빙을 다른 resultId로 보내면 409를 반환한다
- 기존 테스트 실행: `fortune-tea-house-*.test.js`, `pass-policy-v2.test.js`
- 가드 실행:
  - `npm run verify:payment-policy-md`
  - `npm run verify:per-use-never-unlocks`
  - `npm run verify:paid-feature-common-flow`
  - `npm run verify:payment-concurrency-guards`
- 표준 절차: `npm run check:fast` → 커밋 → `npm run check:pre-push` → `git push origin main` → main CI를 한 번 확인한다.
- `PAYMENT_POLICY.md`에 "찻집 이용권 차감" 한 줄을 추가한다. `docs/payment-policy-flow.md`가 같은 내용을 다루면 그쪽도 맞춘다.

## 4. 진행 기록

- 2026-10-16
  - 코드 분석을 완료했다(이 문서).
  - 코드 변경, 운영 조회, 커밋은 하지 않았다.
  - 이 문서는 아직 커밋되지 않았다.
