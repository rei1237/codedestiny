# 불필요한 서버 조회 감사 (2026-08-08)

> **이 문서의 목적**: 다른 세션이 읽고 **바로 착수**할 수 있게 만든 작업 목록이다.
> 각 항목은 `위치 → 왜 불필요한가 → 수정안 → 회귀 위험 → 검증 → 난이도` 순으로 자립적으로 적혀 있다.
> 조사 기준 커밋: `origin/main` = `16818eee2` (PR #418·#419·#420·#421·#422 머지 후).
> 선행 작업: PR #424(레거시 코인 잔재 4종)에서 `worker/routes/destiny-bias.js`의 죽은 위임과
> `__cdSetGoldenBalance` 오염 2곳이 이미 해소됐다 — 이 문서에는 **그 이후 남은 것만** 담았다.

**착수 규칙** (2026-08-08 개정 — PR·워크트리 정책 폐기에 맞춰 갱신):
`main`에서 직접 작업한다. 항목별 브랜치·PR·`verify:worktree-policy`는 더 이상 없다(스크립트 자체가 삭제됨).
수정 → 해당 검증 → `npm run deploy:preview` → 사용자 확인 → **승인 후** `npm run deploy:production`.
정본 계약은 [AGENTS.md](../AGENTS.md)의 "Delivery: Preview First, Then One Command".

## 진행 상황 (2026-08-08, 2차까지)

| 상태 | 항목 |
|---|---|
| ✅ 완료 | SEC-1 · SEC-2 · RC-1 · RC-3 · RC-5 · RC-6 · RC-7 · RC-9 · RC-10 · RC-11 · RC-12 · FE-1 · FE-2 · FE-3 |
| ❌ 하지 않기로 함 | **RC-15b** — 아래 참조 |
| 미착수 | RC-2 · RC-4 · RC-8 · RC-13 · RC-14 · RC-15a/c/d · FE-4~FE-10 · 죽은 코드 · 문서 정정 |

### 2차에서 바로잡은 것 (이 문서 자체의 오류 포함)

**🔴 FE-1 수정안은 반쪽이었다 — 그대로 따르면 순 회귀다.**
이 문서는 `shouldBypass(input, init)` 로 Request 헤더를 보게 하라고만 적었는데,
[auth-client.ts](../app/_lib/auth-client.ts) `buildAuthRequest` 가 `/api/auth/me` 에 refresh 헤더를
**force 여부와 무관하게 무조건** 붙이고 있었다(`refreshAuth({force})` 의 force 는 1.5초 쿨다운만 제어).
그래서 shouldBypass 만 고치면 ① 인증 사용자의 300초 세션 캐시가 통째로 꺼지고
② 게스트의 합성 응답 단축(user-session-cache.ts)까지 죽어 매번 실네트워크가 된다.
2차에서 짝을 맞췄다 — 무조건 헤더를 없애고 `refreshAuth → loadMeFromServer → authFetch({forceFresh})` 로
force 를 실제로 관통시켰다. 이제 force:false 는 캐시 히트(요청 감소), force:true 만 진짜 우회다.

**SEC-2 는 새로 설계할 필요가 없었다.** 이 문서는 `refundPaymentAsOperator`(운영자 환불)를 가리켰지만,
지급 실패 자동환불의 정본은 `autoRefundSinglePaymentDeliveryFailure`(당시 `worker/routes/payments.js`)였다.
그 함수를 [worker/lib/payment-refund.js](../worker/lib/payment-refund.js) 로 옮겨 fortune.js 6경로가 공유한다.
🔴 카드 Payment 는 **반드시 `{_id, userId, featureKey, status}` 로 재조회**한다 —
`consumePayload.transactionId` 체인에 클라이언트가 준 `body.payment._id` 폴백이 섞여 있어,
그대로 넘기면 남의 결제를 취소시킬 수 있다(`buildAIPromptCardRefundPaymentQuery`, 회귀 테스트 있음).

**❌ RC-15b 는 하면 안 된다.** 410 톰스톤 3종을 인증 앞으로 당기면 `users` 읽기 1회를 아끼지만,
비로그인 호출에 401 대신 410 이 나가 **미인증자에게 라우트 폐지 여부를 알려 준다**.
[__tests__/worker/api-status-normalization.test.js](../__tests__/worker/api-status-normalization.test.js) 가
401 을 강제하고 있고 그게 맞다. 시도했다가 되돌렸으니 다시 시도하지 말 것(코드에 주석으로 박아 뒀다).

**RC-1 은 "바깥만 제거"가 정답이다.** 안쪽 `getActiveMembershipPassForUser` 의 `User.findById` 에
재시도를 넣어 보상하려 하면 `resolvePaidContentAccess` 쪽이 즉시 중첩이 된다
(개선된 `verify:no-nested-retry` 가 바로 잡아냈다). authUserDoc 부재 경로의 일시 실패는
기존 `createPassLookupUnavailableMarker` degrade 가 받는다.

**가드가 이제 실제로 잡는다.** `verify:no-nested-retry` 가 ①콜백 길이 제한(600자) 대신 괄호 균형 절단
②화살표 `const` 인식 ③호출그래프 전이 폐포를 갖췄다. 인식하는 재시도 함수가 362종으로 늘었고,
RC-1 을 되돌린 픽스처에서 `billing.js → getMembershipPassForBillingRequest → … → auth.js` 를 실제로 검출한다.

---

## 🔴 P0 — 보안 취약점 (다른 모든 항목보다 우선)

### ✅ SEC-1 (완료 2026-08-08). `POST /api/fortune/pig-coin/refund` 로 레거시 코인을 임의 발행할 수 있다 → 월정석 1:10 전환

**심각도: 최상 (인증된 사용자 누구나 재현 가능, 유료 재화 발행)**

**취약 지점**: [worker/routes/fortune.js:2839-2845](../worker/routes/fortune.js#L2839)

```js
// 1차 조회 — 필터가 제대로 걸려 있다
const deductQuery = {
  userId: auth.userId, kind: "deduct", delta: -cost, featureKey,
  createdAt: { $gte: recentWindow },          // 48시간
};
if (isObjectIdLike(sourceTransactionId)) deductQuery._id = sourceTransactionId;
let deducted = await PointHistory.findOne(deductQuery).sort({ createdAt: -1 }).lean();

// 🔴 2차 조회 — delta · featureKey · 48시간 창이 전부 빠져 있다
if (!deducted && isObjectIdLike(sourceTransactionId)) {
  deducted = await PointHistory.findOne({
    userId: auth.userId, kind: "deduct", _id: sourceTransactionId,
  }).lean();
}
```
→ [worker/routes/fortune.js:2891](../worker/routes/fortune.js#L2891) `User.findByIdAndUpdate(auth.userId, { $inc: { points: cost } })`

**공격 체인 (전부 코드로 확인함)**

| 단계 | 근거 |
|---|---|
| 1. 라우트가 인증만으로 열려 있다 (관리자 검사 없음) | [fortune.js:6293](../worker/routes/fortune.js#L6293) `if (method === "POST" && path === "/pig-coin/refund") return await handlePigCoinRefund(request, auth);` |
| 2. `cost`·`featureKey`·`sourceTransactionId` 를 클라이언트가 준다 | [fortune.js:2787-2799](../worker/routes/fortune.js#L2787) `readJson(request)` |
| 3. 상한이 100,000 | [fortune.js:102](../worker/routes/fortune.js#L102) `PIG_COIN_MAX_COST = 100000` |
| 4. `delta:0` 감사행이 일상적으로 생성된다 | [profile.js:944-948](../worker/routes/profile.js#L944) — **프로필 카드 조작마다** `kind:"deduct", delta:0`. 그 외 [billing.js:1891](../worker/routes/billing.js#L1891)(FAMILY 이용권 접근), [fortune.js:5586](../worker/routes/fortune.js#L5586) |
| 5. 2차 조회가 그 행의 `_id` 만으로 매치 → `$inc: { points: cost }` | 위 인용 |
| 6. 남은 `points` 가 다음 `GET /api/billing/balance` 에서 **월정석으로 ×10 전환** | [billing.js:1474](../worker/routes/billing.js#L1474) `Math.floor(legacyPoints * MEMBERSHIP_CREDIT_PER_COIN)`, `MEMBERSHIP_CREDIT_PER_COIN = 10` ([billing-policy.js:2](../worker/lib/billing-policy.js#L2)) |

**재현 절차**: 로그인 → 프로필 카드 1회 추가/삭제(= `delta:0` 감사행 생성) → 그 PointHistory `_id` 확보 →
`POST /api/fortune/pig-coin/refund` `{ cost: 100000, featureKey: "아무거나", sourceTransactionId: "<그 _id>" }`
→ 1차 쿼리 실패(`delta`·`featureKey`·48h 불일치) → **2차 쿼리 매치** → `points += 100000`
→ `GET /api/billing/balance` → 미시드 계정이면 **월정석 1,000,000 적립**.

`alreadyRefunded` 검사([fortune.js:2874](../worker/routes/fortune.js#L2874))는 소스 행 1개당 1회만 막으므로,
프로필 카드 조작을 반복하면 행을 계속 만들 수 있다.

**수정안 (2단계, 둘 다 하는 것을 권장)**

1. **즉시 — 2차 조회 필터 복원** ([fortune.js:2839-2845](../worker/routes/fortune.js#L2839))
   ```js
   deducted = await PointHistory.findOne({
     userId: auth.userId,
     kind: "deduct",
     _id: sourceTransactionId,
     delta: { $lt: 0 },                       // delta:0 감사행 차단 (핵심)
     featureKey,                              // 기능 교차 차단
     createdAt: { $gte: recentWindow },       // 48시간 창 복원
   }).lean();
   ```
   2차 조회의 원래 취지는 "`cost` 가 미세하게 어긋나도 같은 행을 찾아준다"였으므로 `delta` 정확값만 빼고
   나머지 필터는 되살리는 게 의도에 맞다.

2. **근본 — 환불 라우트 톰스톤화** (아래 RC-3 과 동시 해결)
   신규 코인 차감은 [fortune.js:2495](../worker/routes/fortune.js#L2495)에서 전면 차단돼 있어
   `kind:"deduct", delta:<0` 행은 더 이상 생성되지 않는다. 48시간 창까지 지난 지금
   `POST /api/fortune/pig-coin/refund` 와 `POST /api/billing/refund` 는 **성공 경로가 없다**.
   410 톰스톤으로 바꾸면 취약점과 낭비를 동시에 없앤다.
   - ⚠️ 선행 확인: `js/tarot-reunion-experience.js`·`js/tarot-love-experience.js` 가 `/api/billing/refund` 를
     호출한다. 톰스톤화 시 이 호출들이 어떤 UI 를 띄우는지 확인하고 함께 정리할 것.

**회귀 위험**: 1번(필터 복원)은 없음 — 정상 환불은 1차 쿼리에서 잡힌다. 2번은 위 클라이언트 2곳 확인 필요.

**검증**: `npm run verify:billing-pass-policy` · `verify:paid-feature-billing-policy` ·
`npx jest __tests__/worker/coin-access.guard.test.js` + **회귀 테스트 신규 작성 권장**
(`delta:0` 행 `_id` 로 환불 요청 → 409 여야 함).

---

### ✅ SEC-2 (완료 2026-08-08). 카드결제 실패가 코인 환불 루틴으로 흘러간다

**심각도: 높음 (정합성 — 사용자가 환불을 못 받는다)**

[worker/routes/fortune.js:1504-1514](../worker/routes/fortune.js#L1504) `buildAIPromptVerifiedConsumePayload` 가
**DIRECT_KRW 결제에도 `chargedCoins = cost`** 를 싣는다(0 처리 대상은 `isPass`/`isMonthlyCredit` 뿐).

자동환불 가드가 `chargedCoins > 0 && sourceTransactionId` 뿐인 곳이 **5곳**:
[fortune.js:3338](../worker/routes/fortune.js#L3338) · [:3871](../worker/routes/fortune.js#L3871) ·
[:4034](../worker/routes/fortune.js#L4034) · [:4933](../worker/routes/fortune.js#L4933) · [:5169](../worker/routes/fortune.js#L5169).
`isPointSpend` 가드를 가진 곳은 사주 1곳뿐: [fortune.js:4479](../worker/routes/fortune.js#L4479).

**가장 명확한 사례 — 베다 프라슈나는 카드 전용인데도 코인 환불을 부른다**:
[fortune.js:3230](../worker/routes/fortune.js#L3230) 이 `accessMethod !== "single"` 을 402 로 막아 **카드 결제만** 통과시키는데,
[fortune.js:3352](../worker/routes/fortune.js#L3352) 가 `handlePigCoinRefund` 를 부른다. `sourceTransactionId` 가 Payment `_id` 라
PointHistory 매칭에 실패 → 409 → [fortune.js:3379](../worker/routes/fortune.js#L3379) `paymentStatus: "PAID"` →
**카드는 끝내 환불되지 않고 사용자에게는 "환불 실패"만 남는다.**

**수정안**: 5곳의 가드를 `isPointSpend &&` 로 통일하고
(`isPointSpend` 정의는 [fortune.js:948](../worker/routes/fortune.js#L948)),
카드 결제 실패는 PortOne 취소 경로([worker/lib/payment-refund.js](../worker/lib/payment-refund.js))로 보낸다.

**난이도**: 중 (가드 통일은 하, 카드 환불 경로 연결은 중)

---

## P1 — 사용자 체감이 큰 불필요 왕복

### ✅ RC-1 (완료 2026-08-08). `billing.js` 전이적 중첩 재시도 → 결제 임계경로에서 시도·재연결 4배

**위치**: [worker/routes/billing.js:3362](../worker/routes/billing.js#L3362)

```js
withMongoRetry(env, () => withDbAccessTimeout(getMembershipPassForBillingRequest(...), ...))
```
안쪽이 이미 재시도한다:
`getMembershipPassForBillingRequest`([:1454](../worker/routes/billing.js#L1454)) → `readSubscriptionStatusSnapshot`([:5278](../worker/routes/billing.js#L5278))
→ `getOptionalUserFromRequest` → [worker/lib/auth.js:387](../worker/lib/auth.js#L387) `withMongoRetry`
그리고 → `handleFortuneRoutes` → `handleSubscriptionStatus` → [fortune.js:6139](../worker/routes/fortune.js#L6139) 또 `withMongoRetry`.
`maxRetries` 기본 1([db.js:581](../worker/lib/db.js#L581)) = 레벨당 2회 시도 → **2×2 = 4 시도 / 최대 4회 `resetMongooseConnection`**.

**CLAUDE.md 원칙 6 위반**이며, 가드가 못 잡는다.

**수정안**: `billing.js:3362` 의 **바깥** `withMongoRetry` 만 제거하고 `withDbAccessTimeout` 과
`createPassLookupUnavailableMarker` degrade 경로는 유지한다.

**가드도 함께 고칠 것** — [scripts/verify-no-nested-retry.mjs](../scripts/verify-no-nested-retry.mjs) 의 3가지 한계:
- 콜백을 `[\s\S]{0,600}` 정규식으로 잘라 600자 초과 콜백을 놓침
- `function` 선언만 인식 → 화살표 `const`(예: `billing.js:3352 const resolveProfileIdFromDb = () => withMongoRetry(...)`) 미인식
- **1-hop 만** 봄 → 전이 폐포 없음. `getMembershipPassForBillingRequest` 본문에 `withMongoRetry` 문자열이 없어 후보에서 탈락한다.

**회귀 위험**: 타임아웃 상한(`PAID_PASS_DECISION_DB_TIMEOUT_MS = 10000`)을 함께 지우면 안 된다.
**검증**: `npm run verify:no-nested-retry`(가드 수정 후 이 항목을 실제로 잡는지 확인) · `verify:billing-pass-policy` · `verify:pass-snapshot`
**난이도**: 중

---

### RC-2. 구독 상태 내부 위임 — 인증 2회 + `users` 2회 + fortune 라우트 전체 디스패치

**위치**: [worker/routes/billing.js:1454-1465](../worker/routes/billing.js#L1454) → [:5276-5305](../worker/routes/billing.js#L5276)

결제창 **[이용권으로 구매]** 클릭 시 `directPass.isActive === false && hasSubscriptionSignal === true` 이면
`new Request` + `handleFortuneRoutes` 로 `/api/fortune/pig-coin/profile-subscription/status` 에 위임한다.
`membershipCreditBalance > 0` 만으로도 `hasSubscriptionSignal` 이 참이라 **월정석 보유·이용권 미보유 사용자 전원**이 이 경로다.

**불필요 근거 4가지**
1. projection 이 [:1332](../worker/routes/billing.js#L1332) 과 `destinyProfilesCurrentId` 하나만 다르고, 판정 함수는 양쪽 다
   `resolveActivePassPolicyWithProfileFallback` → **방금 false 나온 계산을 같은 데이터로 재수행**한다.
2. 위임 안의 `hasResolvableSubscriptionSignal(user)`([:5299](../worker/routes/billing.js#L5299))는 진입 조건의 부정이라 **항상 통과 분기**.
3. [:5278](../worker/routes/billing.js#L5278) 이 `getOptionalUserFromRequest` 를 직접 불러 요청 단위 메모(`BILLING_REQUEST_AUTH_MEMO`, [:164](../worker/routes/billing.js#L164))를 우회한다.
4. **위임의 존재 근거로 주석([:5257-5260](../worker/routes/billing.js#L5257))이 든 "자동갱신"이 죽어 있다** —
   [fortune.js:5326](../worker/routes/fortune.js#L5326) `let points = null` 이라 [:5342](../worker/routes/fortune.js#L5342) `points >= plan.coins` 가
   항상 false(`PROFILE_SUB_PLANS` 최소 coins 115).

**🔴 회귀 위험 — 그냥 지우면 안 된다**: [fortune.js:5321](../worker/routes/fortune.js#L5321) 의 `|| sub.registered === true` 가
[worker/lib/entitlement-policy.js:133-138](../worker/lib/entitlement-policy.js#L133) `explicitlyActive` 에는 **없다**.
`profileSubscription = { tier:"premium", registered:true }` + `expiresAt` 부재인 계정은
위임 경로에서만 활성으로 판정된다 → 위임을 지우면 **그 사용자가 결제창을 보게 된다**.

**수정안**: `registered === true` 를 `entitlement-policy.js` 의 `explicitlyActive` 로 **먼저 흡수**한 뒤 위임을 삭제한다.
**검증**: `verify:billing-pass-policy` · `verify:pass-snapshot` · `verify:checkout-pass-card` + `registered:true` 픽스처 테스트 추가
**난이도**: 중

---

### ✅ RC-3 (완료 2026-08-08). 정적 셸: 유료 클릭 실패 시 백오프 재시도가 왕복을 최대 6.5배로 증폭

**위치**: [index.html:32167-32170](../index.html#L32167) (메인 타일 회당 결제), [:32791-32805](../index.html#L32791) (타일 잠금 해제)

```js
for (var _puPassRetry = 1; _puPassRetry <= 2 && passAccess && passAccess.status === 'error'; _puPassRetry += 1) {
  await new Promise((resolve) => setTimeout(resolve, Math.round(800 * Math.pow(1.8, _puPassRetry - 1))));
  passAccess = await _cdResolvePaidContentAccess(passAccessRequest);   // 강제 auth/me + coin-gate POST 전체 재실행
}
```
프리체크 캐시가 `error` 를 담지 않으므로([index.html:28385](../index.html#L28385)) 재시도는 **반드시 네트워크로 나간다**.
인위 지연 800ms + 1440ms 도 붙는다.

**제거해도 안전한 근거**: [index.html:32186](../index.html#L32186) 주석대로 재시도 후에도 `error` 면 결제창으로 fall-through 한다
— **재시도 없이도 결제창은 열린다.**

**효과**: degrade 구간에서 최대 **-6왕복, -2.24초**.
**검증**: `verify:static-paid-gate-failsafe` · `verify:paid-gate-ui` · `verify:public-parity`(6미러)
**난이도**: 하

---

### RC-4. 정적 셸: 진입 선조회 5곳이 CLAUDE.md 정책을 위반하고, 가드가 못 잡는다

CLAUDE.md 정책: **진입 판정은 로컬 스냅샷만.** `_cdResolvePaidContentAccess` 는 `snapshotVerdictOnly: true` 가 있어야
왕복 없이 빠져나간다([index.html:28255](../index.html#L28255)).

| 위치 | 문제 |
|---|---|
| [index.html:31338](../index.html#L31338) (유료 섹션 [잠금 해제]) | `requireServerPassCheck: true` 로 탈출구를 건너뛰고 강제 `auth/me` + `coin-gate POST` 직행 |
| [index.html:32158](../index.html#L32158) (메인 타일 회당 결제) | 동일 |
| [index.html:32785](../index.html#L32785), [:32802](../index.html#L32802) (타일 잠금 해제) | 동일 |
| [js/coin-gate-helper.js:414](../js/coin-gate-helper.js#L414) | `allowSnapshotFastPath: true` 만 있고 `snapshotVerdictOnly` 없음 → `_cdRefreshMembershipCoverage` → `/api/subscription/status` |
| [js/destiny-profile.js:10221](../js/destiny-profile.js#L10221) | 동일 |

**🔴 가드가 무력하다**: [scripts/verify-portone-single-payment-regression.mjs:289-293](../scripts/verify-portone-single-payment-regression.mjs#L289) 이
`snapshotVerdictOnly: true` **파일 전체 개수 ≥ 2** 만 센다. 정상 2곳([index.html:22807](../index.html#L22807), [:24600](../index.html#L24600))이
카운트를 채우므로 위 5개 위반이 전부 통과한다. → **지점별 검사로 교체할 것.**

**제거해도 안전한 근거**: 결제창 안의 '이용권으로 구매' 카드([index.html:23106](../index.html#L23106), `allowSnapshotFastPath:false`)가
이미 스냅샷 없는 보유자의 복구를 담당한다.

**연관 — 진입 warm 이 완전히 죽어 있다**: [index.html:27951](../index.html#L27951)
`if (!__cdSubscriptionSnapshotEntryQueued && window.__cdEnableEntryMembershipWarmup === true)` —
**이 플래그를 세우는 코드가 레포에 0개**다(루트 1건 + 미러 5건 전부 읽기). 27951~27999 블록 전체가 사문화됐다.
가드([verify-portone…:310-320](../scripts/verify-portone-single-payment-regression.mjs#L310))는 문자열 존재만 확인해 통과한다.
다만 `NONE_STALE_MAX_MS = 24h`([js/core/pass-verdict.js:30](../js/core/pass-verdict.js#L30)) 덕에 스냅샷이 한 번 써지면
24시간 재사용되므로 실피해는 "24h 창당 첫 유료 클릭"이지 매 클릭이 아니다.

**검증**: `verify:portone-single-payment`(가드 수정 후) · `verify:paid-gate-ui` · `verify:checkout-pass-card` · `verify:public-parity`
**난이도**: 중

---

### ✅ RC-5 (완료 2026-08-08). 게스트가 꿀방울 잔량 조회를 4회 반복한다

**위치**: [src/features/fortune-tea-house/FortuneTeaHousePage.tsx:569](../src/features/fortune-tea-house/FortuneTeaHousePage.tsx#L569), [:586-595](../src/features/fortune-tea-house/FortuneTeaHousePage.tsx#L586)

성공 조건이 `serverHoneyDrops.authenticated === true` 인데 서버는 게스트에게 **200 + `authenticated:false`** 를 준다
([worker/routes/fortune-tea-house.js:3895-3909](../worker/routes/fortune-tea-house.js#L3895)).
→ 게스트는 정상 응답을 실패로 보고 백오프 재시도 → **비로그인 방문자 1명당 동일 요청 4회**.

**수정안**: `authenticated === false` 면 재시도하지 말고 성공 처리(또는 `hasClientAuthHint()` 선검사).
**회귀 위험**: 없음. **난이도: 하 (한 줄)** — 트래픽 대비 효과가 가장 크다.

---

### ✅ RC-6 (완료 2026-08-08). `primePaymentEligibility` 11곳이 게이트가 읽지 않는 `unlock-status` 를 미리 친다

**위치**: 11개 호출부 — `astrology-ai` · `island-consult` · `love-secret-ai` · `karma-destiny-ai` · `ziwei-ai` ·
`vedic-ai` · `new-year-ai-consultation` · `sukuyo-compatibility-ai` · `ZiweiDeepPdfPanel` · `ZiweiAiConsultPanel` · `MasterLoveCodexPage`

각 호출부 주석은 "게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다"고 하지만 **더 이상 사실이 아니다**:
[app/_lib/billing-client.ts:3909-3912](../app/_lib/billing-client.ts#L3909)
```js
const mayBeAlreadyUnlocked = resolvePaidFeatureBillingType(featureKey) !== "per-use";
... || !mayBeAlreadyUnlocked ? null : await fetchPaymentEligibility(...)
```
위 11개 featureKey 는 [worker/lib/paid-feature-registry.js:386-483](../worker/lib/paid-feature-registry.js#L386) 에서
**전부 per-use** 이고 `PDF_PAID_FEATURE_KEY_LIST` 는 여전히 빈 배열([:483](../worker/lib/paid-feature-registry.js#L483)) →
`eligibilityResult = null` → **프리페치 결과를 게이트가 한 번도 읽지 않는다.**

**수정안 (가장 싼 방법)**: 호출부 11곳을 건드리지 말고 [billing-client.ts:3583](../app/_lib/billing-client.ts#L3583) 의
`primePaymentEligibility` 안에 `resolvePaidFeatureBillingType(featureKey) === "per-use"` 면 조기 반환하는 **가드 1줄**을 넣는다.
**회귀 위험**: 스냅샷 저장 side-effect 는 `warmSubscriptionSnapshotOnEntry`([PaymentProcessingContext.tsx:1016-1060](../app/components/PaymentProcessingContext.tsx#L1016))가 이미 커버한다(경로 정정 — `app/providers/` 가 아니라 `app/components/`, 루트 레이아웃에 마운트).
**효과**: 유료 화면 진입마다 버려지던 왕복 1회 × 11개 기능. **난이도: 하**

---

## P2 — 서버 내부 중복 조회 (사용자 체감은 작지만 비용은 확정)

각 항목의 공통 패턴: **이미 읽은 `auth.authUserDoc` 을 안 넘겨서 같은 문서를 다시 읽는다.**
정답 패턴이 이미 레포 안에 있으므로(비대칭) 그대로 맞추면 된다.

| # | 위치 | 증상 | 정답 패턴(같은 레포) | 난이도 |
|---|---|---|---|---|
| **RC-7** ✅ | [billing.js:3488-3497](../worker/routes/billing.js#L3488) | `resolvePaidContentAccess` 에 `accountUnlockedFeatures` 미전달 → `User.exists()` 추가 왕복. 결제 임계경로 | 형제 호출부 [billing.js:6015](../worker/routes/billing.js#L6015) 가 이미 넘긴다 | **하 (1줄)** |
| **RC-8** | [billing.js:5159-5172](../worker/routes/billing.js#L5159) | `GET/POST /api/billing/access` 가 `users` **3회**(보안계층 + `getOptionalUserFromRequest` 메모 우회 + `canAccessPaidFeature` userDoc 미전달) | `dream.js:58` · `fortune-tea-house.js:1433` · `life-book-ai.js:587` · `guardian-image.js:139` 가 전부 `userDoc: auth.authUserDoc` 전달 | 중 |
| **RC-9** ✅ | [fortune.js:6142](../worker/routes/fortune.js#L6142) + [:2189-2194](../worker/routes/fortune.js#L2189) | `GET /pig-coin/balance` 가 `userProjection: isBalanceRoute ? null : ...` 로 일부러 제외해 `users` 2회 | 바로 옆 status 경로가 같은 기법으로 이미 해소 | 하 |
| **RC-10** ✅ | [fortune.js:6189~6279](../worker/routes/fortune.js#L6189) 10곳 | AI 프롬프트 라우트가 `resolvePaidRouteAuth(request, env)` 를 projection 없이 호출 → `authUserDoc` 미부착 → 내부 `handlePigCoinConsume` 이 또 읽음 | `sukuyo.js:1967/1996/2243` 이 `{ userProjection: ... }` 전달 | 하 (10줄 + 상수) |
| **RC-11** ✅ | [sukuyo.js:249-262](../worker/routes/sukuyo.js#L249) | `GET /api/sukuyo/calendar`(공개 화면) 이 `users` 2회 | `getOptionalUserFromRequest` 에 `userProjection: {destinyProfilesCurrentId:1}` | **하** |
| **RC-12** ✅ | [astrology-ai.js:614,618](../worker/routes/astrology-ai.js#L614) | `resolveStartAccess` 가 `loadUser` 로 읽고도 `canAccessPaidFeature` 에 `userDoc` 미전달 | 같은 파일 `resolveEnsureAccess`([:465,470](../worker/routes/astrology-ai.js#L465))가 넘긴다 | **하** |
| **RC-13** | [sukuyo.js:1293,1193](../worker/routes/sukuyo.js#L1293) + [access-control.js:954](../worker/lib/access-control.js#L954) | `past-life-reading` 이 `users` 3회 | 같은 파일 `resolveSukuyoYearlyProfile`([:1442-1450](../worker/routes/sukuyo.js#L1442))이 `auth.authUserDoc` 재사용 | 중 |

> ⚠️ **RC-8 선행 조건**: `BILLING_SNAPSHOT_USER_PROJECTION`([billing.js:5419~](../worker/routes/billing.js#L5419))에
> `paidFeatures` / `licenses` / `monthlySubscription` / `membershipPass` / `licensePass` / `accessGateResult` 가 **없다**
> (`PAID_FEATURE_ACCESS_USER_FIELDS`([paid-feature-access.js:307-313](../worker/lib/paid-feature-access.js#L307)) 대비).
> projection 확장 없이 그대로 넘기면 **오탐 거부**가 난다.

### RC-14. 내부 위임 5곳이 보안계층 전체를 재실행하고 사용자 레이트리밋 예산을 소모한다

**위치**: [ziwei-daehan.js:137](../worker/routes/ziwei-daehan.js#L137) · [karma-destiny-ai.js:2387](../worker/routes/karma-destiny-ai.js#L2387) ·
[fortune-tea-house.js:4637](../worker/routes/fortune-tea-house.js#L4637) · [new-year-ai.js:2081](../worker/routes/new-year-ai.js#L2081) ·
[life-book-ai.js:1658](../worker/routes/life-book-ai.js#L1658)

합성 `Request` 는 새 객체라 `BILLING_REQUEST_AUTH_MEMO`(WeakMap)를 못 타서 위임마다 다시 돈다:
`resolveBillingRequestAuth`(users 읽기 1) + `checkSoftBlock`(Mongo 읽기 1) +
`enforceRateLimit` → [security/index.js:361](../worker/lib/security/index.js#L361) `AbuseScore.findOneAndUpdate(..., {upsert:true})` **= Mongo 쓰기 1**.
레이트리밋 키가 `rateLimitKey || userId` 라 **사용자 본인의 예산을 내부 호출이 깎는다**(`/coin-gate` 20/60s).

**수정안**: `delegateToPayments`([billing.js:6198](../worker/routes/billing.js#L6198))처럼 `preverifiedAuth`/내부호출 마커를 받는
진입점을 만들고 보안계층을 1회로. **무조건 스킵은 위험하다.**
**난이도**: 중

### RC-15. 그 밖의 저비용 정리

| # | 위치 | 내용 | 난이도 |
|---|---|---|---|
| RC-15a | [billing.js:1882](../worker/routes/billing.js#L1882) | `recordPassAccessIfNeeded`(FAMILY 전용)가 `delta:0` 감사행의 `balanceAfter` 에 **폐지된 코인 잔액**을 찍으려고 `User.findById(...).select("points")` 왕복 1회 | 하 |
| RC-15b ❌ | [fortune.js:6287,6290](../worker/routes/fortune.js#L6287) | 410 톰스톤 3종(`charge-simulate`·`share-reward`·`subscribe`)이 `requireUserFromRequest` + `connectDb` **뒤에** 배치돼 410 하나에 `users` 1회 | 하 |
| RC-15c | [billing.js:5561](../worker/routes/billing.js#L5561) | `GET /api/billing/balance` 가 `seedLegacyCredit` 때문에 `authUserDoc` 을 버리고 `users` 2회. 실제 seed 조건은 "미시드 && points>0" 뿐이라 좁힐 수 있다. ⚠️ 조건 계산을 `withMongoRetry` **closure 안**에 둘 것(밖에서 잡으면 재시도 시 stale) | 중 |
| RC-15d | [access-control.js:999](../worker/lib/access-control.js#L999) vs [:1062](../worker/lib/access-control.js#L1062) | 메모리에 이미 있는 `hasUnlock` 판정을 `ContentEntitlement.findOne` × N회 **뒤로** 미룬다. ⚠️ `requiredRules.length === 0` 일 때만 앞당길 수 있음(강제 결제 바인딩 우회 방지) | 중 |

---

## P3 — 프론트엔드 정리 (요청 수 감소는 작지만 부채가 크다)

| # | 위치 | 내용 | 난이도 |
|---|---|---|---|
| **FE-1** ✅ | [app/_lib/user-session-cache.ts:231-234](../app/_lib/user-session-cache.ts#L231), [:581](../app/_lib/user-session-cache.ts#L581) | 🔴 **`force:true` 가 클라 캐시를 실제로 뚫지 못한다.** `shouldBypass` 가 `init.headers` 만 보는데 `authFetch` 는 헤더를 `Request` 에 담아 `fetch(request)` 로 부른다([auth-client.ts:509-531](../app/_lib/auth-client.ts#L509)) → `init.headers` 는 항상 undefined. 결제 후 갱신·탭 복귀 세션 확정이 300초 캐시에서 조용히 서빙될 수 있다. 수정: `shouldBypass(input, init)` 로 바꿔 `input instanceof Request ? input.headers : init?.headers` 를 함께 보게 한다 | **하 (한 줄)** |
| **FE-2** ✅ | [app/me/MeClient.tsx:548,554,658](../app/me/MeClient.tsx#L548) | 부트스트랩 useEffect deps 에 `refreshProfileActionBalance` 가 있고 그 콜백 deps 가 `[apiBase, user?.points]` 인데 본문이 `user.points` 를 바꾼다 → identity 변경 → **`/api/auth/me` + `/api/profile` + `/api/billing/balance` 3요청이 2회** | **하** (`useRef` 로 points 읽기) |
| **FE-3** ✅ | [src/features/neo-war-room/NeoOperationRoomPage.tsx:1142-1160](../src/features/neo-war-room/NeoOperationRoomPage.tsx#L1142) | `/api/billing/unlock-status` 를 치는데 쓰는 값이 `priceKRW` **하나뿐**. [useServerPrice.ts:86-110](../app/hooks/useServerPrice.ts#L86)이 같은 금액을 네트워크 0으로 준다 | 하 |
| **FE-4** | [app/tarot/prompt-maker/TarotPromptMakerClient.tsx:2558-2597](../app/tarot/prompt-maker/TarotPromptMakerClient.tsx#L2558) | 마운트 useEffect 가 `unlock-status` 를 치는데 소비처는 가격/상태 배지뿐. `useServerPrice` + `resolveSnapshotPassVerdict`([billing-client.ts:2130](../app/_lib/billing-client.ts#L2130))로 대체 | 소규모 |
| **FE-5** | [app/components/AppVersionGuard.tsx:248,554](../app/components/AppVersionGuard.tsx#L248) | 60초 폴링 + focus/visibility/online 재발사로 `/version.json?t=${Date.now()}`. focus 재발사가 이미 커버하므로 interval 을 5~10분으로 | 하 |
| **FE-6** | [index.html:23158-23161](../index.html#L23158) | 월정석 재조회 1클릭에 `/api/billing/balance` 를 **쿼리만 바꿔 2번**(`?moonlightStone=1` 실패 → `?sync=1`). 같은 엔드포인트라 실패 사유가 동일하게 재현된다 | 하 |
| **FE-7** | [index.html:30957-30959](../index.html#L30957) → [:27849](../index.html#L27849) | coin-gate 402 가 `/api/subscription/status` 파생 조회를 유발. 402 응답이 `membershipPass`/`accessGateResult` 정본을 실어오는데 [:28311](../index.html#L28311) 에서 버린다. 그 payload 를 `_cdWriteSubscriptionSnapshot` 으로 흘리면 파생 조회 0 | 중 |
| **FE-8** | [js/core/access-store.js:753](../js/core/access-store.js#L753) vs [index.html:359](../index.html#L359) | `/api/me/access-state` 를 `?profileId=X` 와 `?include=guardian`(profileId 없음)으로 **2번**. 캐시 키에 쿼리가 포함돼 별개 엔트리 + in-flight dedup 분리. 게다가 [js/guardian-fortune-home.js:950](../js/guardian-fortune-home.js#L950)이 `force:true` 로 캐시 파괴. 워커·스토어 모두 `?profileId=X&include=guardian` 조합을 이미 지원한다 | 중 |
| **FE-9** | [index.html:25469](../index.html#L25469) | `_cdPrepareMembershipPassAuth` 의 `force=true` 가 refresh 헤더로 300초 세션 캐시를 파괴해 `/api/auth/me` 가 **~30초에 1회** 나간다. 30초 결과 캐시([:25125](../index.html#L25125))가 이미 이중 조회를 막고 있으므로 `false` 로 낮출 수 있다 | 하 (한 글자) |
| **FE-10** | [index.html:30863-30866](../index.html#L30863), [:25141](../index.html#L25141) | 🔴 **`_cdApiGetResultCache` 가 TTL 외에는 무효화되지 않고 키에 유저 스코프가 없다.** 로그아웃·`__cdForceSignOut`·refresh 헤더 어디에도 purge 가 없어 ① 모든 `force:true` 호출자가 최대 30초 낡은 `/api/auth/me` 를 받고 ② 계정 전환 직후 30초간 이전 사용자 응답이 재생될 수 있다 | 중 (정합성) |

### 죽은 코드 (요청 감소 0, 부채 정리용 — 한 PR로 묶는 게 효율적)

| 위치 | 내용 |
|---|---|
| [billing-client.ts:3311,3322-3339](../app/_lib/billing-client.ts#L3311) + `750-815` + `817-837` | `hasServerLookupKey` 가 **항상 true**(모든 실호출부가 featureKey/reason 을 넘김) → 로컬 스냅샷 fast-path 와 `buildSnapshotPaymentEligibility`·`fetchPricingForSubscriptionSnapshot` 이 도달 불가. `snapshotAllowsLocalPass`([:3322](../app/_lib/billing-client.ts#L3322))도 다음 줄 조건에 완전히 포함돼 중복 |
| [app/hooks/useServiceExecutionGuard.ts](../app/hooks/useServiceExecutionGuard.ts) 전체 + [billing-client.ts:4648~4660](../app/_lib/billing-client.ts#L4648) | import 0건. ⚠️ **동명의 워커 함수([worker/lib/service-execution-task.js:1036+](../worker/lib/service-execution-task.js#L1036))는 살아 있으니 지우지 말 것** |
| [user-session-cache.ts:506,529,540](../app/_lib/user-session-cache.ts#L506) | `refreshUserAccessAfterPayment` / `useUserProfile` / `useRequireAccess` — import 0건 |
| [index.html:14612,14717,14838,14855](../index.html#L14612) | `__cdSyncSubscription` / `__cdSyncAuthMe` / `__cdScheduleSubscriptionRetry` / `__cdScheduleAuthFollowup` — 호출부 0개. [__tests__/ui/access-state-bootstrap.static.test.js:89-91](../__tests__/ui/access-state-bootstrap.static.test.js#L89)이 부활을 금지 중 |
| [index.html:27951-27999](../index.html#L27951) | 진입 warm 블록 전체 — `window.__cdEnableEntryMembershipWarmup` 을 세우는 코드가 0개 (RC-4 참조) |
| [js/destiny-profile.js:4089](../js/destiny-profile.js#L4089) vs [:10114](../js/destiny-profile.js#L10114) | 🔴 **같은 IIFE 안에서 `window._cdCoinGatePerUse` 가 무조건 두 번 대입**돼 뒤엣것이 이긴다. `4419-4503` 의 완전한 coin-gate POST 경로 포함 대부분이 영구 사문화 — **유지보수자가 앞쪽을 고치면 아무 일도 안 일어나는 함정** |
| [index.html:29225-29229](../index.html#L29225) | 원소 1개짜리 배열을 도는 폐지된 다중 엔드포인트 폴백 잔재 |

---

## 문서 정정 필요

**[CLAUDE.md:106](../CLAUDE.md#L106)** 이 `grantPassFreeAccessBeforeCardIfAvailable` 을
"카드 주문 직전 서버 최종 안전망"이라 서술하지만, `worker/` 전체에서 **정의 1건([billing.js:6295](../worker/routes/billing.js#L6295))뿐 호출부 0건**이고
[verify-billing-pass-policy.mjs:549,551](../scripts/verify-billing-pass-policy.mjs#L549) ·
[verify-paid-gate-ui-regression.mjs:377,379](../scripts/verify-paid-gate-ui-regression.mjs#L377) ·
[__tests__/worker/billing-payment-service-boundary.test.js:38,40](../__tests__/worker/billing-payment-service-boundary.test.js#L38) 이
오히려 checkout/confirm 에서의 호출을 **금지**한다. 2026-08-03 정책 개정("DIRECT_KRW 자동 전환 폐기")이 코드에만 반영된 상태다.
→ CLAUDE.md 를 "정의만 남은 미사용 함수 + checkout/confirm 사용 금지(가드 3종)"으로 정정하거나 함수를 제거할 것.

---

## 이전 감사에서 틀렸던 것 (재조사로 정정)

같은 실수를 반복하지 않도록 남긴다.

| 이전 주장 | 실제 |
|---|---|
| `authFetch` 의 무조건 refresh 헤더 때문에 `/api/auth/me` 세션 캐시가 죽어 있다 | **인과가 반대다.** `shouldBypass` 가 `init.headers` 만 보는데 `authFetch` 는 `Request` 에 헤더를 담으므로 `shouldBypass` 는 항상 false — 캐시는 살아 있고, 대신 **`force` 가 안 먹는다**(FE-1) |
| 유료 클릭 1회에 `/api/auth/me` 2왕복 | **WRONG.** [index.html:30865](../index.html#L30865) 의 30초 결과 캐시가 `runRequest` 앞에 있어 ②가 ①을 히트한다. 잔여 낭비는 "30초마다 세션 캐시 파괴"(FE-9) |
| 유료 타일 1클릭 최악 ~15왕복 | **과대.** `fetchJsonWithAuth` 의 3겹 재시도는 **GET 전용**([index.html:30754](../index.html#L30754))이라 `POST /api/billing/coin-gate` 는 내부 재시도가 없다. 실측 상한 **11~13** |
| `processCoinGateFromPricing` 이 무조건 return 2개로 양분돼 아래가 전부 죽음 | **WRONG.** 둘 다 `if` 가드다. 실제로 무조건 return 으로 죽은 본문은 [billing.js:614](../worker/routes/billing.js#L614) 아래 61줄과 [fortune.js:2495](../worker/routes/fortune.js#L2495) 아래 216줄 |
| `MeClient`/`auth-store` 의 `/api/billing/balance` 직접 호출이 dedup 을 못 탄다 | **웹에서는 WRONG** — `authGetDedupeKey` 의 `safePaths` 에 포함돼 있고 `paymentAccess`(120초) 캐시가 걸린다. 단 `MeClient` 는 `${apiBase}` 절대 URL 이라 **앱(Capacitor cross-origin) 런타임에서만** 캐시를 건너뛴다 |
| `useCoinGate` 의 결제 후 `refreshAuth` 가 매번 실네트워크 | 실낭비 ≈ 0 — `force:false` 라 1.5초 쿨다운 + single-flight + 300초 세션 캐시에 걸린다 |

---

## 권장 착수 순서

| 순위 | 항목 | 이유 |
|---|---|---|
| 1 | **SEC-1** | 유료 재화 임의 발행. 다른 무엇보다 먼저 |
| 2 | **SEC-2** | 카드 결제 실패 시 환불 불가 (사용자 금전 손실) |
| 3 | RC-5 | 한 줄, 게스트 트래픽 4→1 |
| 4 | RC-6 | 가드 1줄, 유료 화면 11개 × 왕복 1회 |
| 5 | RC-3 | 하 난이도, degrade 구간 -6왕복 |
| 6 | RC-7 | 1줄, 결제 임계경로 |
| 7 | FE-1 · FE-2 · FE-3 | 각각 한 줄~소규모 |
| 8 | RC-1 (+ 가드 개선) | 결제 임계경로 재연결 4배. 가드를 같이 안 고치면 재발이 통과한다 |
| 9 | RC-4 (+ 가드 개선) | 정책 위반 5곳. 가드가 지점별 검사로 바뀌어야 의미가 있다 |
| 10 | RC-2 | RC-1 의 원인 절반. `registered` 흡수가 선행 |
| 11 | RC-8~RC-14 | projection·`userDoc` 전달 위주. 저위험 |
| 12 | 죽은 코드 묶음 + 문서 정정 | 요청 감소 0, 부채 정리 |

**공통 검증**: 결제 경로를 건드리면 `verify:billing-pass-policy` · `verify:portone-single-payment` ·
`verify:paid-gate-ui` · `verify:payment-choice-parity` · `verify:checkout-pass-card` ·
`verify:paid-feature-billing-policy` · `verify:ai-prompt-billing-policy` 를 먼저 돌린다.
정적 셸을 건드리면 `npm run sync:public` 후 `verify:public-parity` · `verify:entry-encoding` · `verify:locale-main-sync` 를 추가한다.

**조사 방법 기록**: `buildRoutedRequest`·`handleFortuneRoutes`·`handleBillingRoutes`·`new Request(` 로 내부 위임 13곳 전수 →
`User.findById|findOne` × `getOptionalUserFromRequest|requireAuth|resolvePaidRouteAuth`(projection 유무) 교차 스캔 →
`withMongoRetry` 는 이름 grep 대신 괄호/중괄호 균형 파서 + 호출그래프 전이 폐포 →
도달성은 함수 본문을 중괄호 균형으로 잘라 depth-1 `return` 만 추출해 확정.
