---
status: active
updated: 2026-10-17
next: "D단계 남은 상품 이전은 자미두수 생애·연간 흐름(ziwei_life_yearly_flow) 하나 — 사용자가 승인한 가드 확장(verify-saju-unlock-entitlement-regression이 paid-ziwei.src.js도 검사)이 자동 모드에 막혀 사용자 처리 대기, WIP 패치 D:/Development/codedestiny-worktrees/ziwei-life-yearly-flow-wip-20261017.patch. 사용자 결정 대기: 마야 홈 타일 1회 표기, 계정 묶음 구매의 프로필 무관 인정, CURRENT_DEV_BASELINE 큐레이션."
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
- 2026-10-16 (이어받은 세션) — **1단계 운영 DB 읽기 전용 조회 완료** (DB `code_destiny`, find/aggregate/countDocuments만 사용, 임시 스크립트는 실행 후 삭제)
  - **10-15 찻집 상담은 운영 DB에 없다.**
    - `fortune_tea_house_results`는 전체 35건뿐이다. 마지막 생성은 2026-09-07이고, 모두 1~2개 계정(개발·테스트로 보임)이며 `deliveryAccessKey` 필드가 있는 문서는 0건이다.
    - 찻집 `featureKey`(`^fortune-tea-house-`)의 Payment는 전 기간 0건이다.
    - 따라서 "reusable" 행 특정, 결함 2 흔적 집계(같은 accessKey 2건 이상)는 모두 0건이다.
  - **10-14~10-16(KST) 실제 유료 사용 내역** (이메일 마스킹)
    - `ju******@naver.com`: 수동 부여 가족 이용권(`lastPassOrderId: manual-grant:2026-10-13:…`, `source: event`, 이용권 구매 Payment 없음)으로 10-14 03:30 KST에 **융합 운세 50,000원(500코인)** 상담을 열었다. 이용권 차감은 기록됐다(`monthlySpendUsed 500`). 판정 기준상 "수동 부여 이용권으로 연 상담"이다. 이 계정은 조회 시점에 이미 `status: withdrawn`, 이용권 종료(`expiresAt 2026-10-16T05:01Z`) 상태였다 — 다른 세션이 회수 스크립트를 적용한 것으로 보인다.
    - `na*******@gmail.com`: 10-15 20:40 KST 영냥이 대화 5,000원 결제를 `pending`으로 두고, 20:41에 스탠다드 이용권 9,900원을 **실결제**한 뒤 대화 상담 3회를 이용권으로 썼다. 회당 50코인 차감이 정상 기록됐다(150/200). 정상 이용이다.
    - 그 밖의 결제(융합 50,000원 2건, 미래 시뮬 7,000원, 영냥이 5,000원 2건)는 모두 `paid`다.
  - **권한 규모 (B단계 판단용)**
    - `licenses.{vvip,premium,standard} > 0`: 0명 → 결함 3은 현재 악용 대상 계정이 없다.
    - `monthlySubscription.active`: 0명, `role: admin`: 0명
    - 활성 이용권 10명(source: pass 7, coin 1, event 2), **cycleKey 없음 0명** → 결함 4를 fail-closed로 바꿔도 영향받는 계정이 없다.
  - **`_userDoc`·낙샤트라 경로 10-01 이후 실행 대비 결제:** pet-saju·destiny-compass·geomancy·yoga·celestial·낙샤트라 무후르타·VVIP 코덱스는 실행 0건. `compat-saju-compatibility`는 실행 2건(완료 2) / 결제 1 / 코인 차감 3 → 결제 없는 실행 흔적 없음.
  - **결론:** 운영 데이터에서 "결제 없이 열린 찻집 상담"은 확인되지 않는다. 10-15 무렵 결제 없이 열린 고액 상담은 수동 부여 가족 이용권으로 연 융합 운세 1건이 유일하다. 코드상 구멍(결함 1~4, 0.1절 유형 1~5)은 실재하므로 수정은 계획대로 진행한다.
  - 후속 확인 거리(이번 범위 밖): 10-14 결제 완료된 융합 운세 2건(`dh*****@naver.com`, `hs********@naver.com`)의 상담 문서가 `status: partial`로 남아 있다.
- 2026-10-16 — **A단계 즉시 차단 핫픽스 커밋** (origin/main `588ebc59a` 위로 rebase)
  - `7c49b5fbf` A1: `requirePremiumReportAccess`가 요청 본문의 `_userDoc`를 믿지 않는다. 서버가 읽은 문서는 `options.preloadedUserDoc`로만 받는다.
  - `3c6d85013` A2: 낙샤트라 무후르타·VVIP 코덱스 `PER_USE_ENFORCE = true`. 가드 `verify-nakshatra-premium.mjs` 단언을 2단계로 바꿨다.
  - `b5bdf1588` A3: fortune.js AI 프롬프트 증빙 조회가 본문의 이용권 주장을 무시한다.
  - `984462140` A4: 차감되지 않은 이용권은 거부 코드가 비어도 항상 `PAYMENT_REQUIRED`다.
  - 기존 실패: `fortune-today-hub.route`(8건)는 rebase 전 루트 main에서도 같은 실패다. 이번 변경과 무관하다.
- 2026-10-16 — **사용자 추가 지시와 결정**
  - "들어보니까 이용권 9900원 짜리로 뚫린것으로 보여진다." → 실측 결과 위 `na*******` 계정의 **연이 운명 상담(`fortune-chat-consultation`, 5,000원)** 이용권 3건이다. standard 건당 상한(5,000원) 안이라 정상 차감이다. 사용자 결정: **standard가 연이 상담을 커버하는 규칙은 유지**.
  - "운명 찻집 가격이 현재 5천원 맞아? 그렇다면 그냥 유지하도록해" → 찻집 5종은 모두 10,000원이다. 사용자 결정: **10,000원 유지**.
  - "이용권마다 커버 가능한 금액이 메인 화면 UI에 표시가 안 되고, 영냥이 상담 이용권은 아예 표시가 안 된다" → F단계로 추가(홈 "내 이용권" 줄, 판매 배너 영냥이 세트 카드, 구 한도표 덮어쓰기 수정, 가드).
- 2026-10-16 — **F단계 홈 이용권 표시 push** (`76e048f9f`, `b15e57aa2` → main)
  - 홈 "내 이용권" 줄: 꽃돼지 이용권은 건당 커버 금액·남은 한도를, 영냥이 세트는 남은 횟수·기한을 보여 준다. 조회 실패·미보유면 숨긴다(표시용, 판정 근거 아님).
  - 판매 배너에 영냥이 세트 카드를 추가했다. 서버 passLimit를 구 한도표(vvip 20,000원)로 덮어쓰던 두 곳을 고쳤다.
  - 가드: 이용권 정책 단언에 홈 건당 문구·세트 가격 정본 일치를 추가했다.
- 2026-10-16 — **B단계: 이용권·라이선스·월구독 허용 = 실제 차감** (`be008c6a9`)
  - 공용 함수 `settlePerUseAccessDecision`(계획의 `pass-consumption.js`가 아니라 `worker/lib/nakshatra-paid-access.js`에 뒀다 — 정본 `verifyPerUsePayment` 바로 옆).
    - 결제 행(paidFeatures) 허용 외의 허용은 모두 VPU로 넘긴다. VPU가 이번 requestId의 결제를 먼저 찾고, 없으면 이용권을 실제로 차감한다. 그래서 이중 차감이 없고, 라이선스·월구독만으로는 열리지 않는다.
    - requestId가 없으면 거부한다. DB 일시 장애는 503(allowed:null)이다.
  - 연결: 찻집(차감 + 최종 실패 시 환불), dream, tarot 지름길 3곳(+올해 타로), ziwei-deep-report, sukuyo-compatibility-ai, neo-operation-room, naming-prompt. 지름길은 결제 행일 때만 받는다.
  - `requirePremiumReportAccess`의 이용권 분기(8개 리포트): 해금·결제 증빙을 모두 본 뒤 맨 끝에서만 차감과 함께 연다. 게이트(`coin-gate/pass-check`)가 이미 같은 featureKey+requestId로 차감했으면 재생만 한다(지오맨시는 게이트 키 `openGeomancyOracle`). 영구 해금형(FPTI·시빌)은 게이트가 남긴 해금 행으로만 열린다.
  - 라이선스 분기에 건당 상한(`canUseByPass`) 검사를 추가했다(운영 영향 0명).
  - 확인만: astrology·nakshatra-ai·life-book은 완료 직전 차감이라 이미 안전하다.
  - 가드 `verify:paid-access-integrity` 추가(유료 게이트 스위트 등록): 본문 `_userDoc` 읽기, `PER_USE_ENFORCE = false`, `canAccessPaidFeature` 판정만 쓰고 정산을 안 거치는 파일, 리포트 이용권 분기의 무차감 허용을 잡는다. base `e64ad7ba2` 코드에 돌리면 네 유형을 모두 잡는다.
  - 테스트: `premium-pass-settlement`(6), `fortune-tea-house-pass-settlement`(6), `consultation-per-use-payment` 보강. 옛 구멍을 단언하던 테스트(numerology·직감 타로·마인드스캔·dream 월구독)는 "증빙 없으면 402"로 바꿨다.
  - 남은 위험(후속): dream·tarot·ziwei·sukuyo·neo·naming은 생성 실패 시 이용권 환불이 없다. `findRecentDeductionEvidence` 최근 결제 창은 C단계에서 없앤다. 엔티틀먼트가 생기기 전에 이용권으로 본 옛 FPTI 사용자는 게이트를 한 번 거쳐야 한다.
- 2026-10-16 — **C단계: 결제 증빙 1건 = 유료 요청 1건** (C1 `6a49a75d0`, C2 `015ad2c12`)
  - 공용 모듈 `worker/lib/billing-evidence-claim.js`
    - 컬렉션 `billing_evidence_claims`, `_id = sha256("evidence:"+증빙ID)`다. `_id`가 원래 유일해서 인덱스 마이그레이션이 없다(운영 쓰기 없음).
    - 같은 계정·같은 requestId면 재생 통과, 다르면 409 `EVIDENCE_ALREADY_USED`, 저장소 장애면 503 `PAYMENT_VERIFY_UNAVAILABLE`다. 결제한 사람이 402로 막히지 않게 장애는 402로 바꾸지 않는다.
    - 생성이 최종 실패해 본문을 주지 못했을 때만 풀고(release), 새 시도가 같은 결제로 다시 받을 수 있다. 남의 claim은 풀지 않는다.
  - C1 `requirePremiumReportAccess`(8개 리포트): 본문·토큰 증빙과 최근 결제 창 모두 claim을 거친다. 최근 결제 창은 아직 안 쓴 차감만 연다(차감 2건이면 새 요청 2건까지).
    - 숙요 전생 인연 리딩: 클라이언트가 requestId를 카드마다 고정해서, 같은 차감으로 상대만 바꿔 리딩을 몇 번이든 열 수 있었다. 서버는 조합(signature)까지 claim에 묶고(`claimBindingKey`), 클라이언트는 회당 결제(`perPayment`)로 바꿨다.
  - C2 라우트 13곳: karma·new-year·vedic·astrology·neo-operation-room·nakshatra-ai·sukuyo-compatibility·life-book·love-secret·ziwei-ai·ziwei-island·찻집·fortune.js AI 프롬프트(`requireExistingPaidAccess`).
    - claim 위치는 "중복 제거·조기 반환 뒤, 실제 시작 직전" 한 곳이다. ensure-access·재확인(fresh)·배치 재해석에는 걸지 않는다(같은 요청의 재시도가 409로 막히지 않게).
    - 본문 토큰이 아니라 서버 문서의 정본 ID(Payment `_id`, PointHistory `_id`, 월정석 ledgerId, 실행 기록 `_id`)와 원래 결제 요청 키(record.requestId·metadata.requestId·sourceId)를 함께 claim한다. 그래서 같은 결제를 실행 기록·차감 행·결제 행 중 어느 경로로 내밀어도 같은 claim에 부딪힌다.
    - life-book은 claim featureKey로 `getConsultationFeatureKey`(상담 종류별 키)를 쓴다.
    - 이용권 경로는 claim하지 않는다(차감이 이미 requestId별이다). life-book `resolveBillingGateAccess`·ziwei `verifyPaymentForStart`는 이미 요청 키에 묶여 있어 그대로 둔다.
    - 찻집의 claim 주인은 `fortune-tea-house:<attemptId>`다. 클라이언트가 같은 결제의 재시도에 같은 attemptId를 쓰므로 거짓 409가 없다.
  - billing `deferred/register`는 `resolveExecutionRegistration`이 이미 실행 기록 1건에 묶는다. 1회용 토큰은 FPTI·dream만 쓴다(확인만).
  - 가드 `verify:paid-access-integrity`에 claim 규칙을 추가했다: `claimEvidenceId(s)`를 고르는 파일은 claim을 호출한다 / claim 결과를 변수로 받는다 / `.ok`가 false면 바로 return한다. 호출 파일은 전수 발견하고 10곳 미만이면 실패다.
  - 테스트: `billing-evidence-claim`(헬퍼 9), `premium-report-evidence-claim`(4), karma 라우트 "같은 결제·다른 요청 키 → 409, 계산 재실행 없음"(paid·monthly·deferred). karma의 claim을 끄면 3건 모두 실패하는 것을 확인했다.
  - 검증: check:fast 통과(jest 410 스위트 / 6,186 테스트).
  - 남은 위험·후속
    - 배포 전에 이미 쓰인 증빙은 claim 기록이 없어서 배포 뒤 한 번은 더 쓰일 수 있다. 소급 차단은 하지 않는다.
    - fortune.js AI 프롬프트는 자동 환불이 실패한 경우 claim을 풀지 않는다(환불된 증빙은 조회에서 빠지므로 정상 경로는 문제없다).
    - 찻집 `FORTUNE_TEA_HOUSE_BILLING_STATUSES`에 아직 `generation_failed`가 있다.
    - ziwei-ai `resolveServerAccess`의 월구독·이용권 분기는 ensure-access에서만 쓰여 start에서 악용할 수 없다(apply가 선결제 없는 구독을 거부하고 이용권은 apply에서 차감).
    - `requirePremiumReportAccess`의 Payment 출처 공백, 바인딩 전용 대체 조회의 과잉 일치, karma `generation_failed` 409, 숙요 전생 리딩 일부가 클라이언트 렌더라는 점, neo `settled` 줄 들여쓰기.
- 2026-10-16 — **D단계 착수: 브라우저 계산 유료 본문**
  - 사용자 결정(2026-10-16)
    - 범위: 공용 구멍을 먼저 막고, 그다음 상품을 높은 가격 순서로 서버로 옮긴다. 남은 상품은 이 문서에 목록으로 남긴다.
    - 가격 불일치: 화면 가격 표시를 서버 정본(`worker/lib/paid-feature-registry.js`)에 맞춘다. 서버 가격은 바꾸지 않는다.
  - 공용 구멍 점검 결과
    - ① `cd_verified_unlock_grants_v1` 원장이 서버 스냅샷 뒤에 다시 얹힌다(`index.html` `mergeAccessStoreUnlocksIntoLegacyMap`). React 쪽(`app/_lib/optimistic-unlock-ledger.ts`)의 `mode:'confirmed'`는 만료되지 않는다.
      - 결론: 원장만 조여서는 막을 수 없다. `unlockedFeatureMap` 전역과 access-store 캐시(localStorage)도 콘솔에서 고칠 수 있어서, 클라이언트 판정은 원래 위조할 수 있다.
      - 원장을 조이면 위험도 생긴다. 회당 상품은 서버가 영구 해금으로 남기지 않아서, 원장이 72시간 다시보기의 근거다. 조이면 결제한 사람이 재잠금된다(전달 최우선 원칙과 충돌).
      - 그래서 원장은 화면 힌트로 둔다. 해결책은 상품별 서버 이전(유료 본문을 서버만 만들고 클라이언트 번들에서 뺀다)이다.
    - ② `_cdPendingGateBodies`(`js/saju-engine.js`): 잠긴 본문을 DOM 대신 전역에 보관한다. 본문 계산 엔진이 번들에 있어서 콘솔로 직접 부를 수 있다. ①과 같은 이유로 상품 이전으로 푼다(자미두수 5칸·대한 10년운·점성술 심화).
    - ③ 숙요 인연 레이더 전체 리포트: 서버(`/api/sukuyo/past-life-reading`)가 실패해도 `reveal(true)` 했다. 복귀 경로(skipGate)를 증빙 없이 타면 결제 없이 열렸다. → **수정**(`eaf477d8f`)
      - 4xx(결제 거절)면 열지 않는다.
      - 5xx·네트워크 장애는 이 화면에서 게이트를 막 통과한 결제가 있을 때만 연다(결제한 사람의 전달 보장).
    - ④ 십이운성 동물점(`/saju/animal-destiny`, 정본 70코인)·비밀의 집(`secret-house_real.html`, 50코인): 페이지 자체에 게이트가 없고 계산이 전부 브라우저에서 돈다. 결제는 리포트 대시보드 카드 클릭에서만 받는다. 페이지 전체를 서버 본문으로 바꾸는 상품 이전 대상이다.
  - 가격 표시 불일치(점검 중 발견): 2026-10-12 가격 재조정(`dbecc8bf2`)이 서버 정본만 올리고 화면 가격을 고치지 않았다. 37곳에서 화면이 서버 청구액보다 낮게 보인다(결제 모달 `opts.coinPrice`·본문 "N원" 문구). 서버는 featureKey로 정본 가격을 청구하므로 사용자는 본 가격보다 더 낸다.
    - 대상 예: 테토겐 심화 1,000→5,000원, 주역·케메트 1,000→3,000원, 숙요 연간운 5,000→7,000원, 동물점·만남의 장소·러브코드 5,000→7,000원, 베다 기본 1,000→5,000원, 홈 타일 배지 3,000→5,000원.
    - 기존 가드가 못 잡았다: `verify-paid-gate-price-coverage`는 `app/src/components`만, `verify-krw-copy-canonical`은 금액 집합만 본다.
    - 수정은 별도 커밋(화면을 정본에 맞춤 + featureKey별 화면 가격 = 정본 가드).
    - 후속: 클라이언트 롤백 환불(`rollbackCoinBestEffort`)이 클라이언트 가격을 쓴다. `js/core/feature-pricing-store.js`는 쓰이지 않는다.
  - 상품 이전 목록(높은 가격 순서, 정본 가격 기준)
    - 퀀텀 명리 전략 `rpt_quantumCard`(100): `renderQuantumStrategy`가 전역이라 콘솔로 전체 본문을 그릴 수 있다. `/api/saju/section` 템플릿으로 이전 중.
    - 리포트 카드: 에너지 좌표(70)·건강(50)·악연(50)·매력(10)·재능(10). 본문을 미리 DOM에 그려 두고 `reportDashboard.js`가 숨긴다. 빠른 처방은 해금 뒤에만 렌더.
    - 숙요 유료 6종(50)·전생 리딩(100)·연간운(70)·AI 프롬프트(100).
    - 자미두수 5칸·대한 10년운(50): `renderZiwei` 한 함수 안이라 분리 리팩터가 먼저다(규모 큼).
    - 점성술 심화·시나스트리.
    - 십이운성 동물점·비밀의 집: 페이지 재설계가 필요하다.
- 2026-10-16 — **D단계 화면 가격 정본 일치** (`6eb36d31d`, `c3acd6f22`, `aeeb86c22`)
  - 회당 화면 26곳(i18n·공개 미러 포함)의 가격 표시를 `worker/lib/paid-feature-registry.js`에 맞췄다. 2026-10-12 재가격(dbecc8bf2) 뒤 화면이 따라오지 않은 것이 원인이다. 서버 가격은 바꾸지 않았다.
    - 화면 coinPrice가 서버와 다르면 결제가 400 `CLIENT_COIN_PRICE_MISMATCH`로 막힌다(`worker/routes/payments.js`). 그래서 이 수정은 결제한 사람이 막히는 일도 함께 없앤다.
    - 자미 기본 게이트 10→50, 관상 30→50, 전생 얼굴 궁합 30→50, 숙요 회당 6종 30→50(전생 인연 리딩 50→100), 마야 홈 타일, 전생 얼굴 페이지의 숙요 링크 3,000원→10,000원.
  - 가드 `__tests__/ui/per-use-price-registry-parity.test.mjs`(60행): 화면 가격 상수가 레지스트리와 다르면 실패한다.
  - 사용자 결정이 필요한 것
    - 애니멀 토템 `worker/routes/animal-totem.js` `MODE_SPEC` one/three의 coinPrice가 30이고 레지스트리는 50이다. 게이트를 거치지 않는 직접 호출의 이용권 분기에서만 쓰여서 이용권 예산이 30만 차감된다. 서버 값이라 바꾸지 않았다(`verify-animal-totem-reading.mjs`가 30을 고정한다).
    - 마야 홈 타일이 "1회"로 표시되지만 마야 리딩 자체는 무료다. 기획 판단이 필요하다.
- 2026-10-16 — **E단계: 낮은 위험 정리** (`79de243c8`, 환불 `3e7c89e8e`·`e547fadb1`, 문서 `117ae0d5e`·`75c8cdf4e`)
  - app-store: Google Play 상품 가격을 서버 정본(`pricing`)으로만 정한다. `resolveProductCoinPrice`가 요청 본문의 `coinPrice`/`cost`로 대체하던 분기를 없앴다.
  - 꿀코인(pig-coin) 환불: "결제 → 열람 → 환불" 구멍을 막았다.
    - 새 모듈 `worker/lib/coin-refund-eligibility.js`가 환불 전에 이 차감으로 전달된 증거를 찾는다. 증거는 success/delivered/completed 상태의 결과, 비어 있지 않은 본문, completed/partial/delivery_pending 실행 기록이다.
    - 전달됐으면 409 `REFUND_NOT_ELIGIBLE`, 확인 저장소 장애면 503 `REFUND_VERIFY_UNAVAILABLE`다. 영구 해금은 회수하지 않는다.
    - 실패한 프리미엄 리포트는 claim만 있고 전달 증거가 없으면 환불된다(결제한 사람 보호).
  - 개발용 결제 테스터: 이미 명시적 비운영 표식(`DEV_PAYMENT_TESTER_ENVS`)을 요구한다. 수정 없음.
  - 받아들인 위험(수정하지 않음)
    - moonstone "부여 → 차감 → 실패 시 부여 되돌림" 순서: 순서를 바꾸면 결제했는데 전달되지 않는 경우가 생긴다.
    - Google Play `obfuscatedExternalAccountId`가 빈 구매: 예전 구매 복원을 위해 통과시킨다.
  - 정책 문서: `PAYMENT_POLICY.md`와 `docs/payment-policy-flow.md`에 원칙 3줄(증빙 1건 = 요청 1건, 이용권 허용 = 차감, 유료 본문은 서버만 생성)과 환불 규칙을 적었다.
  - 후속
    - 생성 중에 환불하면 여전히 전달될 수 있다(`isPaidResultRevoked`가 pig-coin 환불 표식을 보지 않는다).
    - 서버 전달 기록이 없는 라우트는 "열람 후 환불"을 막을 수 없다: destiny-compass 저장 실패, tarot-ijik, mindscan, crystal-soul, 재회 `/api/tarot/reading`. 재회 리딩은 서버 게이트도 없다.
    - moonstone 차감은 레거시 포인트로 환불된다.
    - 클라이언트 롤백 환불은 클라이언트가 보낸 cost를 쓴다.
    - `docs/context/payment-gating.md`가 현행과 다르다.
- 2026-10-16 — **D단계 상품 이전 1: 퀀텀 명리 엔진 카드(`rpt_quantumCard`, 100코인)** (`245ce5a6e`, 미러 `0b929332e`, 사이트맵 원장 `e78e5ff19`)
  - 유료 본문 `renderQuantumStrategy`(약 1,126줄)를 클라이언트 번들에서 지우고 서버 `worker/lib/saju-section/paid-quantum.src.js`로 옮겼다. `/api/saju/section`이 해금을 확인한 뒤에만 본문을 만든다.
    - 무료 스텁(`renderQuantumStrategyStub`)과 `analyzeFortuneGZ`는 클라이언트에 남겼다.
    - 정적 가드 FORBIDDEN 목록에 본문 표식 7개를 넣었다. js/·public/·index.html에 다시 들어오면 실패한다.
  - 해금 판정: 해금 없음 402, 같은 출생 BIRTH 해금·레거시 USER 해금 200, 다른 프로필·다른 출생 402, DB 장애 503(재시도).
    - 이용권·가족 구매도 같은 ContentEntitlement 행을 쓰므로 열람권을 잃지 않는다.
  - 패리티: 원본 클라이언트와 서버 출력이 13개 사례에서 해시가 같다(`__tests__/fixtures/saju-section-client-parity.json`).
  - 의도 밖의 변화: 추출기 I18N_KEYS 범위 버그(`slice(16)`→`slice(17)`)를 고쳐서, 서버의 비한국어 종합·대운 본문이 "Translation pending" 대신 실제 번역으로 나온다.
  - 후속
    - `__cdQuantumRendered`가 차트를 바꿔도 초기화되지 않는다(원래 있던 문제).
    - 브라우저 QA 스크립트 `scripts/verify-saju-daewun-quality-browser.mjs`·`scripts/verify-crafted-quantum-saju.cjs`가 아직 클라이언트 함수를 부른다(check에 연결돼 있지 않음).
    - AI 프롬프트 다이제스트가 비동기가 되어, 해금 직후 첫 프롬프트에는 퀀텀 본문이 빠질 수 있다.
  - 남은 이전 대상(높은 가격 순서): 리포트 카드(energyCoord 70 → health·villain 50 → charm·skill 10), 숙요 극T·본성·관계 백과, 자미두수 5칸·대한 10년운(L), 점성술 심화, 십이운성 동물점(70)·비밀의 집(50).
- 2026-10-17 — **D단계 상품 이전 2: 숙요 극T 관계 회로·인연 도감(각 50코인)** (`dd49743f9`, `eee12f66d`, 미러 `0c095e5c3`, 사이트맵 원장 `38f5701b5`, llms.txt `085b5d2f0`·`8d157c304`)
  - 극T 관계 회로(`sukuyo-extreme-t-relationship`)와 27숙 인연 도감(`sukuyo-relationship-encyclopedia`)의 해금 본문을 클라이언트 번들에서 지우고 `/api/saju/section`이 만든다. 판정은 퀀텀과 같다(해금 없음 402, DB 장애 503).
  - 본성 심층(`sukuyo-nature-deep-dive`)은 옮기지 않았다. 서버가 출생 정보로 본명숙을 다시 계산해야 한다. 클라이언트가 보낸 숙 값으로 만들면 결제 1건으로 27숙 본문을 모두 받을 수 있기 때문이다.
  - 사고: `085b5d2f0`을 push할 때 `check:pre-push` 실패(`.ignore`에 `/public/llms.txt` 누락)를 `;` 체인이 무시하고 push했다. 곧바로 `8d157c304`로 고쳤다. 이후 push는 `check:pre-push && … && git push`로만 한다.
  - 후속
    - 극T는 화면 프로필이 아니라 계정 프로필의 생년월일을 쓴다.
    - 인연 도감 필터의 경계값 버그(원래 있던 문제).
    - 클라이언트에 본문 캐시가 없어 다시 그릴 때마다 서버를 왕복한다.
- 2026-10-17 — **D단계 상품 이전 3: 리포트 카드 5종** (에너지 좌표 `ce80879ab`, 악연 `be096b3a8`, 건강 `9587cc5cd`, 매력 `9a72f32fe`, 재능 `e3ed63fca`, 미러·사이트맵 `04cc0a046`·`96b24bad5`)
  - 에너지 좌표(70)·악연(50)·건강(50)·매력(10)·재능(10)의 유료 본문(약 6천 줄)을 `js/saju-engine.js`·`js/entertain-engine.js`·`js/saju-engine-tarot-sukuyo-quantum.js`와 공개 미러에서 지우고 `worker/lib/saju-section/paid-{energy,villain,health,charm,skill}.src.js`로 옮겼다. 무료 스텁은 남겼다.
  - 해금 판정: 퀀텀과 같은 경로(단건·이용권·가족 이용권). 예전에 산 사람이 열람권을 잃지 않게 다음도 인정한다.
    - 출생 기반 옛 키: 에너지 → `travelDestiny`, 건강 → `healthReport`
    - 계정 묶음(`hasLegacyBundlePurchase`, `worker/lib/paid-content-read-access.js`): `allPaidSaju` → 에너지·건강·재능, `rpgCharacter` → 재능. 읽기 전용이고 DB 오류는 503이다.
    - 악연·매력은 자기 키로만 연다.
  - 검증: 패리티 해시 픽스처, FORBIDDEN 정적 가드, worker 테스트(402/200/503), check:fast exit 0.
  - 후속
    - 계정 묶음은 프로필과 상관없이 인정된다. 정책 확인이 필요하다.
    - `ENERGY_COORD_DB` 데이터와 재능 카드의 퀘스트 섹션은 아직 클라이언트에 있다.
    - 매력 영어 출력에 한국어가 섞인다. 응답마다 CSS를 다시 보낸다. 건강 카드의 브라우저 대체 경로 정리.
  - 남은 이전 대상: 숙요 본성 심층(서버 본명숙 재계산 필요)·궁합 2종, 자미두수 5칸·대한 10년운(L), 점성술 심화·시나스트리, 십이운성 동물점(70)·비밀의 집(50).
- 2026-10-17 — **CI 복구 1: 달력 가드** (`24b572760`)
  - 리포트 카드 이전 뒤 PR CI "Static guards"의 `verify-shell-korean-calendar`가 실패했다. 문자열 제거기가 정규식 리터럴 속 따옴표(`/"/g`)로 짝이 어긋나 `lottoWeekKey`까지 "문자열"로 지웠다.
  - 수정: `'`·`"` 문자열은 줄 끝에서 끊는다. 그 결과 새로 보인 24절기 카드 표시용 `new Date` 2건을 사유와 함께 허용 목록에 넣었다(후속: 벽시계 부품으로 바꾸기).
- 2026-10-17 — **D단계 상품 이전 4: 숙요 본성 심층·궁합 2종** (본성 `0cf3fc7d4`, 궁합 `89826021a`, 미러 `3f4f3b741`, gitleaks `746b9fce0`)
  - 본성 심층(`sukuyo-nature-deep-dive`, 출생 해금)은 서버가 해금된 카드의 출생 정보로 달 황경을 다시 계산해 본명숙을 정한다. 클라이언트가 보낸 숙 값은 쓰지 않는다.
  - 기본 궁합(`compat-sukuyo-compatibility`)·정밀 확장(`premium-sukuyo-compat-extra`, 각 50코인)은 회당 결제다.
    - requestId(`sukuyo-paid:<기능>|<카드>|<꼬리>`)가 다른 카드·기능이면 400.
    - `verifyPerUsePayment(requireExisting:true)`로 이번 결제를 찾고, `claimRequestBillingEvidence`로 증빙을 `requestId|sha256(두 사람의 숙·성별)`에 묶는다. 같은 조합 재요청은 다시 주고, 같은 결제로 상대만 바꾸면 409.
    - 그린 뒤에 결제를 확인하므로 계산 실패는 차감 없이 503. 결제 DB·claim 저장소 장애도 503(결제한 사람에게 402를 주지 않는다).
  - 검증: worker 244개(궁합 18개, HEAD 생성기와 해시 패리티 9건), FORBIDDEN 정적 가드, `per-use-proof-roundtrip` 72개, check:fast·pre-push 통과.
  - 후속: 서버 쪽 CMS 문구 덮어쓰기 미적용, 인연 도감·아카이브는 아직 클라이언트 숙 인덱스를 받는다, 상대 출생지는 내 출생지를 쓴다, 이용권 차감 뒤 claim 실패 시 환불 경로 없음(그리기 선행이라 위험 낮음), 예전 정밀 확장 복귀 서술자에 baseRequestId 없음, `verify-sukuyo-role-direction`이 check에 연결되지 않음.
- 2026-10-17 — **CI 복구 2: gitleaks 오탐 지문 11개** (`746b9fce0`, 사용자 승인)
  - 비밀값이 아니다. i18n 사전 줄의 인도네시아어 값 "Api Karma"(`sajuQuantum.sq_8978_prop_label`)와 localStorage 키 이름 `energyCoordRecentDestinationsV1`이 `generic-api-key`에 걸렸다.
  - 주의: `runtime.generated.mjs` 8행(사전 전체가 한 줄)은 다시 생성할 때마다 새 커밋에서 다시 잡힌다. 이후 이 파일을 바꾸는 push 전에 로컬 gitleaks로 지문을 확인한다. 경로 단위 허용(.gitleaks.toml)은 규칙 변경이라 별도 승인이 필요하다.
- 2026-10-17 — **D단계 상품 이전 5: 비밀의 집·십이운성 동물점** (비밀의 집 `8804c968c`, 동물점 `28e7768a8`, 미러 `76006792e`, 사이트맵 원장 `9826feae3`)
  - 비밀의 집(`rpt_secretHouseEntryCard`): 에피소드 엔진을 페이지에서 지우고 `worker/lib/saju-section/paid-secret-house.src.js`·`secret-house.js`로 옮겼다. 일지는 해금된 카드의 출생으로 서버가 계산한다. 옛 계정 해금만 화면 값을 받는다. 묶음 키 `allPaidSaju`·`secretHouseEpisodes`도 인정한다.
  - 동물점(`animal-destiny-unlock`, 70코인): 유료 풀이를 `paid-animal.src.js`로 옮기고 화면의 `twelveGrowthAnimalResults.ts`·`animalInterpretation.ts`를 지웠다. 무료 표는 화면 TS를 추출기가 타입만 지워 함께 묶는다. 해금 없음·다른 프로필 402, 비로그인 401, DB 장애 503.
  - 검증: worker 297개(동물점 사례별·단계별 sha256 패리티), 추출기 `--check`, check:fast 통과.
  - 후속: 서버 계산에 CMS 덮어쓰기 미반영(stage-result 관리자 항목 제거됨), 페이지 안 구매 버튼 없음, 동물점 페이지 제목에 "무료" 표기, `payment-p0-inventory.json` 갱신 필요.
- 2026-10-17 — **가격 정합·가드 정밀화** (애니멀 토템 `a55672e6a`, KRW 가드 `66dadc2a9`, 사용자 결정)
  - 애니멀 토템: 화면은 등록소대로 1·3·5장 모두 50코인을 청구하는데 서버 `MODE_SPEC`은 1·3장을 30으로 확인했다. 서버와 `verify-animal-totem-render`를 정본 50으로 맞췄다.
  - `verify-krw-copy-canonical`: 접두 `KRW` 앞이 영문·숫자·base64 문자면 금액으로 읽지 않는다. 비밀의 집 인라인 이미지 조각 `kRw3560`이 3,560원으로 잡힌 오탐이다. 진짜 `KRW 3,560`·소문자 `krw 3,560`은 계속 잡는다(self-test 추가).
  - 남은 이전 대상: 자미두수 5칸·대한 10년운(L), 점성술 심화·시나스트리.
- 2026-10-17 — **D단계 상품 이전 6: 점성술 상담 심화 4종·봉인된 별의 방 4종** (심화 `feb722584`, 별의 방 `3e9d3fc77`, 미러 `737cecff5`, 사이트맵 `0bb0528d5`, 게이트 가격 `da9d69260`, 미러 `2d984a5fc`)
  - 대상(출생 해금, 각 50코인): `astro_career_talent_deep`·`astro_talent_attraction_deep`·`astro_relationship_deep`·`astro_growth_shadow_deep`, `astro_stellar_career_room`·`_talent_room`·`_relationship_room`·`_growth_room`. 본문은 `worker/lib/astro-section/paid-*.src.js` 원문 사본으로 옮기고 `scripts/extract-astro-section-runtime.mjs`가 런타임을 만든다. 화면 생성기는 지웠다.
  - `POST /api/astro/section`: 비로그인 401, 해금 없음·다른 프로필 402(coinPrice·amountKRW만), DB 장애 503, 계산 실패 503. 차트는 서버 Swiss 계산으로만 만들고, 프로필이 있으면 그 카드의 생년월일·시각만 쓴다(출생지·시간대는 birthKey 밖이라 요청 값). 프로필 없으면 계정 단위 옛 해금만 인정.
  - 게이트 가격: 화면은 1,000원(12개월 흐름 3,000원)·`data-unlock-cost` 10/30이었는데 서버는 레지스트리 50코인을 차감했다. 9개 게이트를 50으로 맞추고 `per-use-price-registry-parity`에 묶었다(사용자 결정 "화면을 서버 가격에 맞춤").
  - 검증: 서버 사본과 HEAD 생성기 sha256 480건 일치(`astro-section-client-parity.json`), check:fast 31단계·pre-push 통과, gitleaks 유출 없음. `verify:doc-freshness`만 실패 — `CURRENT_DEV_BASELINE.md` 정리일 10-02가 15일을 넘겼다(origin/main도 동일). 사용자 결정: 그대로 push, 문서 정리는 따로.
  - 건너뜀: `astro_basic_deep_pack`(이미 서버), `astro_monthly_transit`(유료 본문 없음). 남음: `astro_yearly_transit`(트랜짓 엔진 전체 필요), 시나스트리 2종(회당).
  - 후속: 직접 입력 시나스트리 결과에 이름이 이스케이프 없이 들어간다(self-XSS), product-ledger 문서 갱신.
- 2026-10-17 — **D단계 상품 이전 7: 자미두수 5종** (대한 `c2d3fec8b`, 12궁 `2e9d0e1d0`, 미러 `b2e52bc2d`, 부부궁 `289529d76`, 상징 `5ecc693f8`, 궁합 `5b219ba24`, 미러 `f35a34ea5`)
  - 출생 해금(각 50코인): `ziwei_decade_luck`·`ziwei_twelve_palaces`·`ziwei_love_deep`·`ziwei_symbolic_layer`. 본문은 `worker/lib/saju-section/paid-ziwei.src.js` 원문 사본(현재 시각만 `ctx.now`)으로 옮기고 화면 생성기를 지웠다. 해금된 카드의 출생으로만 계산, 해금 없음·다른 프로필 402, DB 장애 503, 옛 계정 해금 인정. `daehan_purchases`는 해금으로 인정하지 않는다.
  - 자미 궁합(`compat-ziwei-compatibility`, 회당 50): requestId `compat-archive:compat-ziwei-compatibility:<꼬리>`만 받고, 그린 뒤 `verifyPerUsePayment(requireExisting)` → `claimRequestBillingEvidence(requestId|sha256(내 출생·성별·출생지 + 상대 입력))`. 같은 조합 재요청 200, 같은 결제로 다른 상대·카드 409, 결제·claim 장애 503. 숙요 궁합의 결제 확인을 공용 `provePerUseCompat`·`perUseBirth`로 뺐다(동작 동일).
  - 검증: 출생 해금 13건·궁합 6조합(날짜 넘김·뉴욕 서머타임·1988 한국 서머타임·시각 모름) HEAD와 sha256 일치, jest 411/6594, check:fast 31단계(doc-freshness 제외)·pre-push 통과. gitleaks "Api Karma" 오탐 지문 1개 추가.
  - 남음: `ziwei_life_yearly_flow` — 장 안의 10년운 칸 생산 줄이 서버로 옮겨져 `verify-saju-unlock-entitlement-regression`(브라우저 파일만 검사)이 실패한다. 사용자는 가드가 `paid-ziwei.src.js`도 검사하도록 넓히는 안을 승인했으나 그 수정이 자동 모드 분류기에 막혔다. WIP: `D:\Development\codedestiny-worktrees\ziwei-life-yearly-flow-wip-20261017.patch`.
  - 후속: `verify-ziwei-report-browser`의 가격 30이 낡음, 결제 뒤 서버 호출 실패 시 재시도가 결제 게이트를 다시 거침(같은 requestId 재사용 검토), USER_NAME 이중 escape(기존), 서버 로딩 상태 스타일.
- 2026-10-17 — **D단계 상품 이전 8: 점성술 시나스트리 2종·12개월 흐름** (시나스트리 `1a5885b63`, 12개월 `a4b444a38`, 미러 `799fe43f3`, 사이트맵 `56dac5077`, claim 결과 바인딩 `3bfa0d0ce`, 미러 `6ef9a3bcf`)
  - 시나스트리(`compat-astro-synastry`·`compat-astro-direct-synastry`, 회당 50): 새 `/api/astro/synastry`(`worker/routes/astro-synastry.js`). 그린 뒤 `verifyPerUsePayment(requireExisting)`가 이번 requestId 결제를 찾고, `claimRequestBillingEvidence(requestId|sha256(내 출생 + 상대))`로 묶는다. 같은 조합 재요청 200, 다른 상대 409, 장애 503. 차트는 서버 Swiss, 유명인 출생은 서버 사본, profileId가 오면 내 출생은 저장 카드에서 읽는다. 브라우저에는 무료 유명인 목록·입력·게이트만 남는다. 직접 입력 머리글 이름은 이제 HTML escape.
  - 12개월 흐름(`astro_yearly_transit`, 출생 해금 50): `year()`·`renderYear()`와 사전을 `worker/lib/astro-section/paid-yearly.cjs`로 원문 이전. `/api/astro/section`이 출생 해금을 확인하고 서버 Swiss로 출생 차트·통과 위치를 만들며, "오늘"은 서버 시계 + 기기 시간대(`transitTz`, 없으면 KST)다. 페이지에는 오늘 카드와 무료 머리("가장 큰 변화의 달")만 남는다.
  - 검증: 시나스트리 c5952bc88 대비 469 비교 0 불일치, 12개월 HEAD 해시 90/90(12건 fixture). 자미두수 이전 위로 rebase하며 `saju-section-server-gate.static.test.js` 충돌은 두 테스트 블록을 모두 살려 풀었다. check:fast 단계(doc-freshness 제외)·pre-push 통과, gitleaks 누출 없음.
  - 후속: `scripts/verify-crafted-astro-unlocks.cjs`는 로컬 서버가 필요하고 npm 스크립트에 연결돼 있지 않다. docs/product-details·docs/payments가 아직 클라이언트 `year/renderYear`를 언급한다.
- 2026-10-17 — **후속 과제 분리**: 이 문서의 단계별 "후속"·"남은 위험"을 origin/main에서 다시 확인해 우선순위대로 `docs/handoff/paid-access-followups-20261017.md`에 모았다. 이 문서는 `ziwei_life_yearly_flow` 이전만 남는다.
