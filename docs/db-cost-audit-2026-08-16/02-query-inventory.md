# ② 쿼리 비용 인벤토리

> 조사 범위: `worker/` 전체 (routes 66 · lib 157 · payments 15), Mongo 호출 약 700곳.
> `app/api/**` 는 조사 대상이 아니다 — **라우트 핸들러가 0개**다(`output: "export"`, `public/_routes.json`).

## 순위를 매기는 기준

🔴 **구조적으로 나쁜 것과 지금 돈이 드는 것은 다르다.** 아래는 [raw/collections.json](raw/collections.json)
의 실제 문서 수·크기를 곱해 정렬한 것이다. "limit(6000)" 같은 표현이 아니라 "그 컬렉션에 문서가
몇 건인가"가 순위를 정한다.

그리고 티어 강등을 전제로 하면 기준이 하나 더 붙는다: **Flex 는 ops/sec 로 과금하므로
"쿼리 개수"가 요금이고 "쿼리가 읽는 바이트"는 요금이 아니다.**

## 실제 비용 순위

| # | 대상 | ops 절감 | 바이트/CPU 절감 | 상태 |
|:--:|---|:--:|:--:|---|
| 1 | **`/api/me/access-state` 중복 호출** — 로그인 React 라우트 진입마다 2회 | 🔴 **-1 op/진입** | 있음 | ⏸ **보류** — 감사 결과 아래 |
| 2 | **AI 상담 목록 정렬 키 불일치 5곳** | 없음 | 🔴 큼 | ✅ **수정됨** |
| 3 | `/google/restore` — `Payment` 전체 문서 200건 | 없음 | 🟡 있음 | ✅ **수정됨** |
| 4 | `ziwei-daehan` 조회 경로의 런타임 `createIndex` | 🟡 -1 op/콜드 아이솔레이트 | 미미 | ✅ **수정됨** |
| 5 | AI 상담 폴링 15곳 projection 부재 | **없음** | 🟡 있음 | ⏸ **보류** (아래) |
| 6 | `insights.js:364` · `:496` | 없음 | ⚪ 현재 0 | ⏸ 잠재 위험 |
| 7 | 결제 경로 동일 문서 반복 조회 | 🟡 있음 | 있음 | 🔴 **동결 대상 — 보고만** |

## 1. `/api/me/access-state` 중복 (최우선, ops 를 실제로 줄인다)

로그인 사용자가 React 라우트에 진입하면 같은 엔드포인트를 **두 번** 친다:

| 호출자 | URL | 로드 시점 |
|---|---|---|
| `js/core/access-store.js:824` | `/api/me/access-state?profileId=<id>` | `app/layout.js:188` `beforeInteractive` — 전 React 라우트 |
| `app/_lib/user-session-cache.ts:440` | `/api/me/access-state` (쿼리 없음) | `UserSessionProvider` `useLayoutEffect` |

`makeCacheKey`(`user-session-cache.ts:249-251`)가 쿼리스트링을 정규화해 키에 포함하고
`profileId` 는 `VOLATILE_QUERY_KEYS`(`:86`)에 없다. 따라서 **클라이언트 dedup 이 원리적으로 불가능**하다.

서버 쪽 60초 TTL 캐시가 두 번째 요청의 비용 일부를 흡수하지만, `requireUserFromRequest`
(`worker/routes/access-state.js:181`)가 **캐시 읽기(`:192`)보다 먼저** 돌기 때문에 `User.findOne` 은
캐시 히트에서도 그대로 나간다.

🔴 **`profileId` 를 `VOLATILE_QUERY_KEYS` 에 넣는 해법은 금지.** 프로필마다 응답이 다르므로
다른 프로필의 권한 상태를 반환하게 된다.

### 소비자는 2개가 아니라 3개다

`app/_lib/auth-store.ts:521` `refreshAccessState()` 도 쿼리 없는 `/api/me/access-state` 를 부른다.
이쪽은 `user-session-cache` 의 60초 fetch 캐시와 **같은 키를 공유해 dedupe 된다**
(`user-session-cache.ts:249-251`, `:262`). 따라서 중복을 없앨 때 셋 중 무엇이 남는지에 따라
실제 절감폭이 달라진다.

`auth-store.ts:533` 의 `if (!data || data.degraded === true || !data.userId) return true;` 는
**이 레포에서 이미 올바르게 쓰인 조건의 정본**이다. 재사용 가드를 만든다면 여기를 베껴야 한다.

### 🔴 보류 결정 (2026-08-16) — `paid-gate-auditor` 감사 결과

"store 스냅샷이 신선하면 재사용" 정도의 단순 구현은 **위험**으로 판정됐다. 핵심 2건은 직접 확인했다.

**(1) degraded 응답이 "확답"으로 승격된다.**
`js/core/access-store.js:579-583` 의 `applyServerPayload` 는 payload 가 degraded 여도 무조건
`state.status='ready'` · `state.checkedAt=Date.now()` · `state.lastPayload=<봉투>` 를 찍는다.
그리고 degraded 응답은 `userId: ""` 라(`worker/routes/access-state.js:261-268` →
`worker/lib/access-state.js:107-128`) `applyAccessStateSnapshot`(`:598` `!source.userId`)이 false 를
반환해 **정확히 이 경로로 빠진다.** 즉 "`status==='ready'` + 60초 이내" 조건은 장애 응답을 통과시킨다.

덧붙여 `restoreCache`(`access-store.js:400-402`)는 localStorage 에서 `status`/`checkedAt` 은 복원하되
**`lastPayload` 는 복원하지 않는다** — 같은 조건이 `lastPayload === null` 상태도 통과시킨다.

**(2) 타입 함정.** `lastPayload.checkedAt` 은 ISO 문자열, `snapshot.checkedAt` 은 number(`:665`)다.
전자를 산술에 쓰면 NaN 이라 조건이 조용히 무력화된다. 그 number 도 로컬 수신 시각이 아니라
**서버의 `fetchedAt`** 이라, 워커 60초 TTL 캐시 히트를 감안하면 실효 신선도는 최대 ~120초다.

**안전하게 하려면 조건 9개가 필요하다**: `lastPayload` 존재 · 봉투면 `.data` 언랩(`:583` 과 `:667` 의
형태가 다르다) · `degraded !== true` · `completeness === 'full'` · `authority === 'server'` ·
`userId` 가 현재 사용자와 일치 · `currentProfileId` 가 현재 활성 프로필과 일치 ·
`options.force !== true`(결제 직후 `refreshUserAccessAfterPayment` 가 `force:true` 로 부른다,
`user-session-cache.ts:510-516`) · 동기 `getSnapshot()` 만 사용(`ensureLoaded()` await 금지 —
진입에 새 대기를 만들면 게이팅 1항 위반).

레포에 이미 정답이 있다: `index.html:22866-22868` 이 같은 `lastPayload` 를 소비할 때 쓰는
`status==='ready' && completeness==='full' && authority==='server'` 조합이다.

**보류 사유**: M10 고정요금 아래서 절감액이 0원인데 대상이 결제 게이팅 부트스트랩이다.
[티어 결정](04-tier-decision.md)이 Flex 로 확정되면 ops 절감이 곧 요금이 되므로 그때 재개한다.

**재개 시 주의 — 기존 가드가 이 회귀에 눈이 멀어 있다.** 같은 PR 에 단언을 새로 넣어야 한다:
- `__tests__/ui/access-state-bootstrap.static.test.js:12-23` 은 파일 전체 문자열 존재 검사라
  앞에 short-circuit 을 넣어도 그대로 통과한다.
- `scripts/verify-auth-session-stability.mjs:379-411`(T5)은 `/api/me/access-state` 호출 수를 세지만
  그 jsdom 하네스에 `CodeDestinyAccessStore` 가 설치되지 않아 새 분기가 한 번도 실행되지 않는다.

### 곁가지로 발견한 CI 구멍 — 닫았다

`app/_lib/user-session-cache.ts` 가 `paid-flow-gates.yml` 의 `paths` 에 없어
(짝인 `js/core/access-store.js` 는 `:51` 에 있다) **이 파일만 고친 PR 은 결제 게이트가 깨어나지 않았다.**
실측: `node scripts/lib/change-risk.mjs app/_lib/user-session-cache.ts` → `level=medium deepRequired=false`.

CLAUDE.md 원칙 10 위반이라 별도 PR 로 `paths` 에 추가했다.
`scripts/resolve-paid-gate-scope.mjs:172` 가 워크플로 YAML 의 `paths` 를 직접 읽으므로 목록은 하나뿐이고,
이 파일은 `SHELLS` 가 아니라 실변경이 있으면 `run: true` 가 된다(리졸버 본문 확인).

🟡 **남은 비대칭**: `scripts/lib/change-risk.mjs:53` 은 `js/core/access-store.js` 를
`deepVerificationRules`("접근 상태 저장소")로 올려 `deepRequired=true` 인데 React 짝은 `medium` 이다.
`deepVerificationRules` 추가는 전체 `deploy:critical` 을 강제하는 **게이트 범위 변경**이라 보고만 한다.

### 검토했으나 채택하지 않은 것

`access-state.js:181` 의 `requireUserFromRequest` 를 TTL 캐시 뒤로 옮기면 캐시 히트에서 DB 읽기가
사라진다. `peekAccessTokenUserId`(`:165`)가 JWT 서명·issuer·audience 를 실제로 검증하므로
(`worker/lib/auth.js:619`) 캐시 키 산출 자체는 안전하다.

**그러나** 캐시 히트 60초 동안 계정 상태(탈퇴·차단) DB 재확인이 사라진다.
사용자 지시 "회원 인증 로직 변경 금지"에 정면으로 걸리므로 **실행하지 않는다.**

## 2. AI 상담 목록 정렬 키 불일치 — 수정 완료

5개 목록 엔드포인트가 `.sort({updatedAt:-1})` 인데, 해당 컬렉션의 실제 인덱스는
`{userId:1, createdAt:-1}` 하나뿐이다(2026-08-16 `listIndexes` 실측).

결과: IXSCAN(userId) 로 좁힌 뒤 **해당 사용자의 상담 문서를 전부 FETCH → 메모리 SORT** 했다.
그리고 **projection 은 SORT 뒤에 적용되므로 기존 `.select()` 가 아무 일도 하지 않고 있었다.**
문서 평균 40~54 KB 짜리 컬렉션들이라 낭비가 그대로 드러난다.

수정: `.sort({createdAt:-1})` — 기존 인덱스를 그대로 탄다(인덱스 추가 0, 쓰기 비용 증가 0).
대상: `new-year-ai.js:2459` · `vedic-ai.js:1567` · `ziwei-ai.js:2373` · `ziwei-island-ai.js:665` ·
`sukuyo-compatibility-ai.js:2122`.

🔴 **화면에 보이는 순서가 바뀐다** — 재생성·수정된 상담이 더 이상 목록 맨 위로 올라오지 않는다.
사전 승인받은 변경이다.

> `worker/lib/fusion-fortune-consultation.js:108` 은 **이미 `createdAt` 정렬**이라 대상이 아니었고,
> `neo-operation-room.js:1222` 는 목록이 아니라 배지 백필 경로다.

## 5. AI 상담 폴링 projection — 보류 (실측이 전제를 뒤집었다)

15개 결과 폴링 핸들러가 `findOne(...).lean()` 을 projection 없이 부른다
(`ziwei-ai.js:2390` · `life-book-ai.js:2162` · `karma-destiny-ai.js:2627,2672,2834` ·
`nakshatra-ai.js:988,1072,1111,1154` · `master-love-codex.js:981,1007,1060,1081` ·
`love-secret-ai.js:1478,1554,1600` · `astrology-ai.js:1761,1797` · `neo-operation-room.js:1514,1566` ·
`vedic-ai.js:1589` · `destiny-compass-ai.js:752` 외). 클라이언트는 `Retry-After: 3` 으로 폴링한다.

**보류 사유 3가지:**

1. **ops 절감이 0이다.** `findOne` 은 projection 유무와 무관하게 1 op 다. Flex 과금 단위가
   ops/sec 이므로 요금은 1원도 안 줄어든다.
2. **문서가 생각보다 작다.** 스키마 상한 80,000자(`models.js:821`)를 실제 크기로 오인했었다.
   실측 평균 0.6~54 KB, 최대 203 KB다.
3. 🔴 **응답 형식이 바뀔 위험이 실재한다.** `publicSession()`(예: `life-book-ai.js:1853-1883`)이
   **생성 중 응답에도** `messages` · `reportJson` · `sajuResult` · `birthInfo` 를 실어 보낸다
   (`:2240` 이 202 와 함께 `publicSession(consultation)` 을 반환). projection 을 좁히면 이 필드들이
   빠져 응답 바디가 달라진다 — "기존 API 응답 형식 변경 금지" 위반이다.

**나중에 하려면**: 15곳을 개별로 열어 `publicSession()` 이 읽는 필드를 전수로 세고, 응답이
1바이트도 안 변하는 곳에만 적용한다. 유료 플로우라 회귀는 "결과 미표시"로 나타난다.

## 6. `insights` — 구조는 최악, 현재 비용은 0

- `insights.js:364-369`: `limit(6000)` + `.select()` 에 `content contentHtml body` 포함.
  status 필터·정렬·페이징을 **전부 메모리에서** 한다.
- `insights.js:496-505`: **모든 상세 페이지뷰마다** `limit(5000)` + 인덱스 없는 `publishedAt` 정렬.
  이전/다음 링크 2개를 얻으려고 전 코퍼스를 정렬한다.

둘 다 코드를 직접 열어 확인했다. **그러나 `insights` 컬렉션은 문서가 1건이다.**

🔴 **SEO 콘텐츠를 늘리는 순간 단일 최악이 된다.** 함께 고쳐야 할 것:
`/api/content` 목록 응답이 `content`/`contentHtml` 를 그대로 싣기 때문에
(`content.js:184-186`, `toContentItem`), projection 축소가 곧 응답 형식 변경이다.
`{status,updatedAt}` · `{publishedAt:-1}` 인덱스도 없다.

## 7. 결제 경로 — 동결 대상이라 보고만 한다

`config/payment-freeze.json` 이 `worker/routes/payments.js` 와 `billing.js` 를 동결하고 있고,
사용자 지시가 "결제 로직 변경 금지"다. 위치와 왕복 수만 기록한다.

| 위치 | 내용 |
|---|---|
| `payments.js:1882,3111,3235,4250,4269,4305,4347,4385,4412` | 응답 조립용으로 같은 `Payment` 를 최대 4회 재조회 |
| `payments.js:3562,4096,4162,4251,4780` | 같은 `User` 를 최대 5회 재조회 (각각 다른 projection) |
| `payments.js:469` `findRecentPaymentsForUser` | projection 에 `rawPortOne`(PG 원본 blob) 포함, 10건 |
| `payments.js:5687,5690` | `pointhistories` · `monthly_credit_ledger` projection 없음 (문서가 각 0.7 KB 라 실익 작음) |
| `billing.js:5566` | `buildRoutedRequest` 로 새 `Request` 를 만들어 fortune 라우트 재진입 → `BILLING_REQUEST_AUTH_MEMO`(WeakMap on request, `:178-189`) 무효화 → 인증 `User` 재조회. `:5573-5580` 주석이 과거 503 주범으로 기록 |
| `billing.js:1674,1723,1789` + `lib/monthly-credit-store.js:103,136,159,170` | 월정석 차감 CAS 재시도 루프에서 `users` 반복 조회 |

## 그 밖 — 우선순위 밖으로 분류한 것

| 위치 | 내용 | 판정 |
|---|---|---|
| `lib/service-execution-task.js:1460` | 크론 스윕: 30회 순차 lock × 항목당 6~10 조회 | `serviceexecutiontransactions` 5건이라 현재 무해 |
| `routes/access.js:259→272` | `PointHistory.find(limit 20)` 후 루프 안에서 `Payment.findOne` 순차 (N+1, 최대 21왕복 직렬) | 🟡 실제 N+1. 호출 빈도가 낮아 후속 |
| `lib/daily-fortune-task.js:437` | 구독자 전량 로드 (`limit` 없음, `select` 없음) | `dailyfortunesubscriptions` 2건. 선형 폭발 위험만 기록 |
| `routes/admin.js:3986-4010` | 인덱스 불가 조건 포함 `countDocuments` 11개 병렬 | 관리자 진입 시에만 |
| `routes/admin.js:4323` | `distinct("featureKey", {$nin})` → `pointhistories` 19,684건 전량 스캔 | 🟡 관리자 전용이나 유일하게 대형 컬렉션을 훑는다 |
| `routes/rpg.js:1051,1063,1067` / `:1605,1622` | 진입 3왕복 + 동일 `progress` 3회 재조회 | 후속 PR 후보 |
| `ziwei-deep-report.js:445→450` · `destiny-compass-ai.js:352→359` | 비-lean 하이드레이트 후 `doc.save()` = 문서 전체 재기록 | 두 컬렉션 모두 **0건** — 현재 비용 0 |
