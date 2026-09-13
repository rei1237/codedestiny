# 리팩터링 Phase 계획

작성일 **2026-09-12**. 번호는 고정이다 — 순서를 바꾸면 번호를 재사용하지 않고 근거를 적는다.

## 진행 상태

| Phase | 내용 | 대상 TOP20 | 상태 |
|---|---|---|---|
| 0 | 감사 문서 + 가드 shadow 배선 + guardian 가드 현행화 | 20 | **완료 (2026-09-13)** — `517939421` · `ecc17b406` · `9163a7dac` + 이 문서 커밋 |
| 1 | C급 중복 수렴: 환산 상수 5벌 → 정본 1개 (원화 포맷·`normalizeGender`·`Asia/Seoul` 은 재분류) | 16, 17 | **완료 (2026-09-13)** — `dc93b4545` · `6559cb245` · `827248162` + 이 문서 커밋 |
| 2 | LLM 경계 닫기: 실호출 차단을 설정으로 + mock 게이트 정본 수렴 | 10, 11 | **부분 완료 (2026-09-13)** — `817161297` · `85fa2d10a` + 이 문서 커밋. 우회 2곳은 RED 선보고 대기 |
| 3 | 안전망 보강: `tsconfig` 범위·eslint 가시화·CI `skipped` 구멍 | 18, 19 | **완료 (2026-09-13)** — `53536305b` · `ea63cd451`. 네 축 중 셋은 오진이었고 진짜 사각지대는 `lib/` 였다 |
| 4 | 권한 판정 단일화: writer 4개 → 서버 SoT 하나에 묻기 | ~~3~~, 4, 5, ~~6~~, 15 | 진행 중 (2026-09-13) — 재측정으로 **3·6 제외**, 실작업은 4·5·15. 보호 테스트 완료: 엇갈림 4종 재현·변이 5/5 (`__tests__/ui/permission-writer-divergence.behavior.test.js`, [근거](structural-issues-top20.md#4-는-재현된다-엇갈림-4종-보호-테스트-2026-09-13)). 4 는 재판정 대상이 아니라 **수렴 대상 확정**. 수렴 설계 완료 → [Phase 4 의 내용](#phase-4-의-내용-2026-09-13--수렴-설계) (커밋 7단계, D1~D6) |
| 5 | 정적 셸 추출: `js/inline/` 패턴으로 12,721줄 블록 단계 분리 | 1 | 대기 |
| 6 | repository 계층: projection·모델 접근 수렴 | 7, 8, 9 | 대기 |
| 7 | 엔진 단일화: characterization 고정 후 계산·표현 분리 | 2 | 대기 |
| 8 | 결제 스택 수렴: 상태기·resume·환불 경로 | 12, 13, 14 | 대기 |
| 9 | cleanup + 최종 구조 검증 | — | 대기 (shadow→차단 승격은 2026-09-13 에 먼저 닫았다) |

## 순서 근거

기본값은 **C → B → A → S** 다. 여기서 딱 하나를 비틀었다: **안전망 성격의 Phase 2·3 을 앞으로 당겼다.**

- Phase 4(권한 판정 단일화)가 "결제한 고객에게 서비스가 제공되지 않는 상태"를 직접 없애는 **최고가치** 작업이다. 그런데 동결 파일 2개(`billing-client.ts`, `useCoinGate.ts`)를 건드린다.
  (🔴 **2026-09-13 정정** — 수렴 설계 결과 건드리지 않는다. 근거는 [왜 동결 파일을 건드리지 않아도 되는가](#왜-동결-파일을-건드리지-않아도-되는가). 이 순서 판단 자체는 유지한다 — Phase 2·3 의 안전망은 Phase 4 의 7커밋이 그대로 쓴다.)
- Phase 2 는 **지금 테스트가 실과금 LLM 호출을 할 수 있는 상태**를 닫는다(TOP 11). 이건 가치가 아니라 사고 예방이다.
- Phase 3 은 `worker/`(73파일)를 타입 검사 밖에 두고 CI 가 `skipped` 를 통과로 인정하는 상태를 닫는다. **Phase 4 이후의 모든 작업이 이 안전망을 쓴다.**

즉 1순위(회귀 방지)를 위해 최고가치 작업을 세 번째로 미룬 것이다.

## 각 Phase 의 작업 루프 (고정)

```
분석 → 영향 범위 확인 → 보호 테스트 → 작은 리팩터링 → 관련 테스트
     → build/typecheck → 정상 확인 → 마이크로 커밋
```

보호 테스트가 **먼저** 온다. 테스트 없이 고친 것은 "고쳤다"가 아니다.

마이크로 커밋의 기준: **이 커밋 하나를 되돌려도 다른 기능이 거의 흔들리지 않는가.** 서로 무관한 변경을 한 커밋에 섞지 않는다.

## Phase 종료 보고 형식 (고정)

```
[Phase N 완료]
- 변경: …
- 삭제: …
- 추가: …
- 테스트: PASS / FAIL
- 회귀: 없음 / 있음(무엇)
- 다음 작업: …
```

테스트가 FAIL 인 상태로 다음 Phase 에 들어가지 않는다.

## Phase 0 의 내용 (이번 세션)

마이크로 커밋 4개:

1. **guardian 가드를 정책 정본에 묶는다** — `scripts/verify-guardian-fortune-failure-contract.mjs` 가 2026-08-17 정책 변경(계정 3회→1회, 게스트 1회→0회) 전의 숫자 3·2·1 을 하드코딩한 채 7건 실패로 방치돼 있었다. 기대값을 `guardian-fortune-usage.js` 의 상수에서 유도한다. 운영 코드 0줄.
2. **`verify-guard-wiring.mjs` 에 `SHADOW_OBSERVING` 버킷 + 양방향 축** — `isWired()` 는 도달 가능성만 보므로, shadow 에 올린 것을 기존 버킷에서 지우면 감사가 "없는 보호를 있다"고 단언한다. shadow 항목은 전체 기준으로는 배선돼 있고 shadow 워크플로를 제외하면 미배선이어야 한다.
3. **`.github/workflows/guards-shadow.yml` + 통과 가드 41개 이관** (`9163a7dac`) — 44개 전수 실측(2026-09-13, mock 네트워크 가드 on) 결과 41 통과 / 3 실패. 통과분만 `SHADOW_OBSERVING` 으로 옮겼다. `ci-required` 의 `needs` 에 넣지 않고 가드 스텝마다 `continue-on-error: true` — 차단력 0.

   🔴 계획과 다른 점: **잡 레벨에는 `continue-on-error` 를 걸지 않았다.** 걸면 `npm ci` 가 깨진 런도 초록이라 "41개 전부 통과" 와 "한 번도 안 돌았다" 가 구분되지 않는다 — 이 버킷이 막으려던 실패 모양이 바로 그것이다. 셋업이 깨지면 워크플로가 빨갛게 보이되 막는 것은 없다(`needs` 에 없으므로).

   실패 3개는 `UNWIRED_BY_DESIGN` 에 그대로 뒀다. 통과하지 않는 것을 관측에 넣으면 승격 조건의 "오탐 0" 기준이 처음부터 무의미해진다. 원인은 범위 밖이라 보고만 한다(코딩 원칙 14) — `verify:no-timestamp-conflict`($setOnInsert ↔ timestamps 충돌 3건) · `verify:today-hub-gate`(부분 실패 안내·지연 공개 계산 누락) · `verify:animal-totem-reading`(five 티어 판정 1건).
4. **감사 문서 4종** — 이 폴더.

### 왜 shadow 부터인가

CLAUDE.md: "CI 선택 실행은 10회 push 비교 전까지 shadow다. 기존 검사를 삭제하지 않는다." 차단 게이트에 바로 넣으면 오탐 하나가 main 을 세운다. 오탐 여부는 관측으로만 안다.

### shadow → 차단 승격 조건 — **충족·완료 (2026-09-13)**

- main push **10회** 이상 관측 (관측시작일 **2026-09-13**, 대상 41개) → **15런 관측**
- 그 기간 오탐 0 → **15런 × 41스텝 = 615건 전부 `success`**
- **사용자의 명시적 승인** (게이트 추가는 승인 사항 — CLAUDE.md CI gate scope) → **2026-09-13 승인**

Phase 9 를 기다리지 않고 닫았다. 41개는 `.github/workflows/pr-ci.yml` 의 `guards` lane(= `ci-required`
aggregate 의 `needs`)으로 옮겼고 `guards-shadow.yml` 은 삭제했다. `SHADOW_OBSERVING` 은 **빈 채로
유지**한다 — 버킷과 양방향 축은 다음 관측 때 다시 쓴다.

승격과 함께 닫은 사각지대: `guards` lane 은 `shouldRunStaticGuards` 로 평문 문서 전용 push 에서
skip 되는데, 41개 중 2개가 **루트 계약 문서**를 읽는다(`verify:payment-policy-md` →
`PAYMENT_POLICY.md`, `verify:mobile-entry-actions` → `MOBILE_FEATURE_REGISTRY.md`). shadow 는 매
push 돌았으므로 그냥 옮기면 가격 정본만 고친 push 에서 조용히 꺼진다. 루트 `.md` 를 평문 문서
분류에서 뺐다(`scripts/resolve-ci-tier.mjs`, 자기검사 3케이스 추가).

관측 집계(다음 관측 때 재사용): `gh run list --workflow=<파일> -R <repo>` → `gh run view <id> --json jobs`
의 `steps[].conclusion`. 🔴 잡 레벨 `conclusion` 은 근거가 못 된다 — `continue-on-error` 때문에
스텝이 전부 실패해도 잡은 `success` 다.

## Phase 1 의 내용 (2026-09-13)

```
[Phase 1 완료]
- 변경: worker/lib/profile-limits.js(KRW_PER_COIN 재선언 제거 → billing-policy.js import 후 되내보내기),
        scripts/verify-payment-policy-md.mjs · scripts/verify-krw-copy-canonical.mjs(하드코딩 환산율 → 정본 import),
        scripts/verify-krw-copy-canonical.mjs(lib/payment/coin-pricing.ts 상수 대조 + 게이트 커버리지 추가),
        config/sitemap-lastmod.json(유료 라우트 13개 의존 서명 재생성 — lastmod 변화 없음)
- 삭제: 없음
- 추가: coin-pricing.ts ↔ billing-policy.js 상수 대조 2건(fail-closed)
- 테스트: PASS — npm run check:payment(guard 20종 + jest 231 suites / 2,699 tests), 변이 검증 7건 전부 탐지
- 회귀: 없음
- 다음 작업: Phase 2(LLM 경계 닫기 — TOP 10·11)
```

계획과 다른 점: **Phase 1 의 네 축 중 실제 작업은 하나였다.** pass 가격과 worker 내 `KRW_PER_COIN` 은 이미 가드가 묶고 있었고(변이로 확인), 원화 포맷과 `normalizeGender`·`Asia/Seoul` 은 C급이 아니었다. 근거와 이관처는 [structural-issues-top20.md 의 "16·17 재측정"](structural-issues-top20.md#1617-재측정-2026-09-13-phase-1) 에 적었다.

대신 계획에 없던 것을 하나 찾아 고쳤다: **가드 2개가 지켜야 할 환산율을 자기 안에 하드코딩**하고 있었다. `verify-payment-policy-md` 는 `billing-policy.js` 의 `KRW_PER_COIN` 을 120 으로 바꿔도 PASS 였다 — 환산율이 바뀌면 결제 정책 문서가 낡은 환율 기준으로 계속 초록불이 된다.

🔴 이 Phase 에서 "보호 테스트 먼저"는 **변이 검증**으로 대신했다. 상수 수렴은 새 동작을 만들지 않으므로 새 테스트를 남기지 않고, 대신 기존 가드가 실제로 무는지를 값을 틀어서 확인했다(코딩 원칙 10, 도는 가드 ≠ 무는 가드).

## Phase 2 의 내용 (2026-09-13) — 부분 완료

```
[Phase 2 부분 완료]
- 변경: jest.config.cjs(실네트워크 가드를 setupFiles 로, 목 매퍼를 상대 깊이 → 대상 기준),
        lib/llm-client.ts · lib/tarot/mindscan-reading.mjs · lib/tarot/love-reading-llm.mjs
        (staging mock 게이트 재선언 제거 → worker/lib/staging-llm-mock.js import),
        worker/lib/staging-llm-mock.js(정본 표기 + 재구현 금지 주석)
- 삭제: 게이트 재구현 3벌(같은 파일 안에서 import 로 대체. 외부 계약 변화 없음)
- 추가: __tests__/ui/mock-test-runner.test.mjs 정적 가드 2축(setupFiles 실재+실제로 무는지,
        llm-client 임포터 전수 ↔ 매퍼 커버리지),
        scripts/verify-staging-llm-mock.mjs 진리표 224 케이스(jest 목 ↔ 정본)
- 테스트: PASS — check:fast 33스텝 EXIT=0 (typecheck · build:worker · jest 231 suites / 2,699 tests),
          변이 7건 전부 탐지
- 회귀: 없음
- 다음 작업: TOP 10 의 나머지 — 우회 2곳(mindscan · love) 어댑터 이관. **RED 선보고 후**
```

계획과 다른 점: **Phase 2 의 제목이 틀렸다.** TOP 11 은 "경로 의존 목" 문제가 아니었고(매퍼는 임포터 문자열에 걸린다 — 테스트 깊이와 무관), 진짜 구멍은 **실호출 차단이 러너에만 있었던 것**이다. `npx jest <파일>` 한 번으로 보호가 통째로 사라져 요청이 실제 공급자까지 나갔다. TOP 10 의 우회도 3곳이 아니라 2곳이었다 — oracle 은 이미 어댑터 주입으로 닫혀 있다. 근거는 [structural-issues-top20.md 의 "10·11 재측정"](structural-issues-top20.md#1011-재측정-2026-09-13-phase-2).

🔴 **가드는 러너가 아니라 설정이 져야 한다.** 러너에만 있는 보호는 "러너를 안 쓰면 없는 보호"다. 단 `mock-network-guard` 를 CI 잡의 `NODE_OPTIONS` 로 올리지는 않는다 — `npm ci` 까지 막힌다.

우회 2곳을 남긴 이유: `worker/routes/tarot.js:2020`(love)·`:2109`(mindscan)을 oracle 패턴으로 옮기면 재시도 소유권·Workers AI 폴백·토큰 로깅·타임아웃이 어댑터 계약으로 넘어가 **유료 기능의 실행 경로가 바뀐다**. 코딩 원칙 7 의 RED 선보고 대상이다.

## Phase 4 의 내용 (2026-09-13) — 수렴 설계

보호 테스트는 끝났다(엇갈림 4종 재현·변이 5/5). 이 절은 그 다음 단계인 **수렴 설계**다.
줄번호는 2026-09-13 실측이다. 착수 상태와 함정은 [refactor-phase4-2026-09-13.md](../handoff/refactor-phase4-2026-09-13.md).

### 이 설계가 답하는 질문

**"네 writer 를 어떻게 지우나"가 아니다.** 지우지 않는다.
**"같은 사용자·같은 기능·같은 순간에 답이 하나만 나오게 하려면 무엇을 바꾸나"**다.

TOP 4 와 TOP 5 를 한 설계로 묶는 이유는 실측으로 확정됐다: W1 × W4 의 엇갈림은 "몽키패치가 있냐
없냐"가 아니라 **access-store 가 캐시를 뚫는 헤더를 한 번도 안 보낸다**는 한 가지 사실에서 나온다
(D4). 두 행은 같은 한 줄을 가리킨다.

### 🔴 재측정 — 원장·핸드오프와 달라진 것 5건

| 기존 기록 | 실측 (2026-09-13) |
|---|---|
| TOP 5: "몽키패치는 React 만 설치한다" | **셸도 설치한다.** `index.html:74` `<script id="cd-user-access-session-cache-v20260703">` 가 `window.fetch` 를 감싼다. 구현이 **두 벌**이지 한 벌 + 없음이 아니다 |
| 두 캐시의 TTL 이 엇갈린다 | **이미 통일돼 있다.** 셸 `index.html:267-277` 이 "React `getCacheTtlMs` 와 동일 값으로 통일"이라 적고 실제로 같다(`accessState` 60s · `session` 300s · `profile` 120s · `entitlement` 180s). 셸만 `systemStatus` 300s 가 더 있다 |
| `revokedFeatureIds` 로 회수한다 | **생산자가 레포 전체에 없다.** 소비자는 `access-store.js:643-644` 와 그 `public/` 미러뿐(테스트 2건 제외). 프로덕션에서 한 번도 실행되지 않는 분기다 |
| access-store 가 60초를 쥔다 | **신선도 사다리는 6층이고 access-store 는 그중 3층만 쥔다.** 위에 서버 스냅샷 캐시 60s / stale 30m 가 더 있다(`worker/lib/access-state-cache.js:13-14`) |
| access-store 가 재검증한다 | **재검증이 아니다.** `startFetch` 는 `headers: { Accept: 'application/json' }` 만 싣는다(`js/core/access-store.js:849`). 캐시를 뚫는 유일한 레버를 안 보낸다 |

### 신선도 사다리 — 경로 A: `/api/me/access-state` (판정 집합의 정본)

| 층 | 코드 | TTL | 비우는 레버 |
|---|---|---|---|
| 1. 서버 스냅샷 캐시 | `worker/lib/access-state-cache.js:13-14` | 60s / stale 30m | `x-code-destiny-cache-refresh: 1` (라우트가 그 자리에서 비운다) |
| 2. 런타임 fetch 캐시 | 셸 `index.html:273` · React `user-session-cache.ts:256` | 60s (양쪽 동일) | 같은 헤더 (`shouldBypass`) |
| 3. access-store | `js/core/access-store.js:13-17` | fresh 60s / stale 30m / grace 24h | **없음** — 스스로 `force` 를 만들지만 헤더로 번역하지 않는다 |
| 4. 낙관 | `access-store.js:996-1010` · 원장 `optimistic` | 10m (양쪽 동일) | 결제 확정 / 롤백 |
| 5. 원장 | `optimistic-unlock-ledger.ts:41-42` | `legacy_verified` 72h / `confirmed` **∞** | 없음 |
| 6. pass-verdict | `js/core/pass-verdict.js:26-46` | 60s / 5m / 24h / 35d | 없음 |

회수 1회가 소비자에게 닿기까지 **최소 60+60+60 = 180초**, 서버가 stale 모드면 30분+, grace 까지 세면
24시간, 원장 `confirmed` 가 걸려 있으면 **영영**. 각 층이 저마다 "나는 신선하다"고 믿는다.

### 경로 B: `/api/billing/unlock-status` (`getAccessDecision`)

| 층 | 코드 | TTL | 런타임 |
|---|---|---|---|
| 셸 API 결과 캐시 | `index.html` `getApiResultCacheTtl` | 10s | **셸에만 있다** |
| access-store 판정 캐시 | `access-store.js:741` | 15s | 양쪽 |
| 런타임 fetch 캐시 (`paymentAccess`) | 셸 `:277` · React `:260` | 120s | 양쪽 |

즉 TOP 5 의 "런타임에 따라 다른 답"은 두 갈래다 — **경로 A 는 헤더 부재 때문**이고,
**경로 B 는 층 수 자체가 다르기 때문**이다.

### 뿌리 1 — 지연이 몸통이 아니다. `access-store.js:638` 이다

```js
var authoritativeFull = source.degraded !== true && completeness === 'full' && authority === 'server';  // :636
if (authoritativeFull) {
  Object.keys(unlocks).forEach(function (key) { state.confirmedUnlocks[key] = true; });                 // :638  ← 덧쓰기
}
state.persistentUnlocks = authoritativeFull ? copyMap(unlocks) : copyMap(merged);                       // :654  ← 치환
```

`persistentUnlocks` 는 권위 페이로드로 **치환**된다 — 여기까진 옳다. 그런데 `confirmedUnlocks` 는
같은 페이로드로 **덧쓰기만** 된다. 그리고 `isUnlocked` 가 둘을 OR 한다(`:957-961`).

**치환이 무효다.** 서버가 집합에서 뺀 항목은 `confirmedUnlocks` 에 영원히 남는다. 죽은
`revokedFeatureIds` 분기(`:643-650`)가 존재하는 이유가 이것이다 — 자라기만 하는 맵을 지울 방법이
없어서 명시적 회수 목록을 요구하게 됐고, 그 목록의 생산자는 끝내 없었다.

> TOP 4 의 뿌리는 **writer 가 4개라는 사실이 아니라**, 한 writer 안에서 "치환되는 맵"과
> "자라기만 하는 맵"을 OR 하는 것이다.

### 뿌리 2 — 파싱 계층이 이미 5방향 합집합이다

`extractUnlockMap`(`access-store.js:449-460`)은 한 페이로드에서 다섯 배열을 union 한다:
`unlockedContentKeys` · `unlockedFeatures` · `unlockedFeatureIds` ·
`entitlementSnapshot.unlockedFeatureIds` · `unlockedFeatureMap`.
"치환"을 정의하려면 **어느 필드가 정본인지 먼저 못 박아야 한다.** 안 그러면 치환 대상 집합이 다른 네
배열로 다시 부풀어 회수가 또 무효가 된다.

### 설계 결정

**D1 — 판정 집합의 정본 필드를 하나로 못 박는다.** 권위 페이로드(`authoritativeFull`)일 때
`extractUnlockMap` 은 `unlockedFeatureIds` 와 `entitlementSnapshot.unlockedFeatureIds` **만** 읽는다.
나머지 세 배열은 비권위 페이로드에서만 보강용으로 남긴다. 서버는 이미 이 필드를 완전 집합으로 내고
(`worker/lib/access-state.js:136-148`, per-use 키는 걸러 냄) `version` 을 항상 함께 낸다(`:262`).

**D2 — 권위 집합 치환 (핵심 한 줄).** `:637-639` 을 덧쓰기에서 치환으로 —
`state.confirmedUnlocks = copyMap(unlocks)`. 그러면 `:642` 의 재합집합은 같은 집합을 union 하므로
무해해지고 `:654` 의 치환이 실효를 얻는다.
- **fail-closed 방향**(원칙 10): `authoritativeFull` 이 아니면 **절대 치환하지 않는다.**
  degraded-200 보호(`payloadCarriesUnlockAuthority :545-553`)는 그대로다.
- `revokedFeatureIds` 분기는 **남긴다.** 생산자가 없다는 이유로 지우는 것은 별 변경이다(원칙 6·9).

**D3 — 원장은 답이 아니라 대기 버퍼다.** `app/_lib/use-content-unlock.ts:66` 의
`next[key] = snapshotIncludesFeature(...) || ledger[key] === true` 에서 `confirmed` 모드를 뺀다.
원장은 **아직 서버 페이로드에 안 보이는 낙관**만 기여하고, 권위 페이로드가 도착하면 기여를 멈춘다.
이 한 줄이 W1 × W3 두 축을 동시에 닫는다 — 롤백 잔존과 수명 무한(`confirmed` 가 +365일에도 산다).
🔴 **원장의 쓰기 API 는 건드리지 않는다.** `app/_lib/billing-client.ts:3956`(동결)이
`forgetOptimisticUnlock` 을 직접 import 한다. 읽기 쪽만 고치면 동결 파일이 안 바뀐다.

**D4 — 신선도 레버를 하나로 잇는다 (TOP 5 의 몸통).** access-store 가 강제 갱신할 때
`x-code-destiny-cache-refresh: 1` 을 싣는다. 그러면 사다리 **1·2층이 같은 호출 하나로 비워진다.**

| 주체 | 헤더 | 근거 |
|---|---|---|
| 셸 세션 캐시 `ensureLoaded({force:true})` | ✅ | `index.html:389-392` |
| React `ensureUserAccessLoadedUncached({force})` | ✅ | `user-session-cache.ts:424` |
| 셸 인증 하트비트 | ✅ | `index.html:24852` |
| `authFetch` | ⚠️ `/api/auth/me`·`/api/auth/refresh` 에만 | `auth-client.ts:299` + `isAuthoritativeAuthPath:267-273` |
| **access-store `startFetch`** | ❌ **한 번도** | `access-store.js:849` |

React 는 access-store 에 `authFetch` 를 요청 어댑터로 꽂는다(`app/providers/UnlockProvider.tsx:85`
→ `access-store.js:259` `requestJson`). 그래서 React 의 access-state 호출은 `authFetch` 를 타지만,
`/api/me/access-state` 는 `isAuthoritativeAuthPath` 가 아니라 **헤더가 붙지 않는다.** 셸은 어댑터가
없어 전역 `fetch`(= 셸 몽키패치)로 바로 간다.

> **"같은 `access-store.js` 의 같은 호출이 런타임에 따라 다른 답을 받는다"의 실제 기계가 이것이다.**
> 두 캐시의 TTL 은 같다. 다른 것은 그 호출이 어느 래퍼를 지나는지, 그리고 어느 쪽도 뚫는 헤더를
> 받지 못한다는 사실이다.

**D5 — 두 캐시 구현은 합치지 않고 계약으로 묶는다.** 파일 통합·이동은 아래 "하지 않는 것"이다. 대신:
1. `scripts/verify-session-cache-contract.mjs` 신설 — 셸 `kind()`/`cacheTtl()`(`index.html`)과 React
   `resolveCacheKind()`/`getCacheTtlMs()`(`user-session-cache.ts`)를 파싱해 **표를 비교**한다. 선례는
   `scripts/verify-pass-tier-policy.mjs`. fail-closed: 한쪽에만 엔드포인트가 추가되면 깨진다.
2. 설치 가드 플래그가 서로 다르다 — 셸 `__cdUserAccessSessionCacheInstalled`(`index.html:75`), React
   `__cdUserAccessFetchCacheInstalled`(`user-session-cache.ts:555`). 같은 문서에 둘이 다 실리면 `fetch`
   가 **2중 래핑**된다. 지금은 문서가 갈려 있어 발생하지 않지만 가드는 fail-closed 여야 한다(원칙 10)
   → 각자 상대 플래그도 본다.
3. 경로 B 의 층 차이(셸만 10초 API 결과 캐시)는 계약 가드의 **2차 대상**으로 적어 두고 이번엔 고치지
   않는다 — 경로 A 수렴과 독립이고 결제창 진입 지연에 닿는다.

**D6 — provenance: 서버에 이미 있고 API 경계에서 지워진다.** ContentEntitlement 문서는
`source`(`COIN`/`PAYMENT`/`PASS`/`MONTHLY`/`ADMIN`/`BACKFILL`, `worker/lib/models.js:468-475`) ·
`grantType` · `passId` · `expiresAt` · `status` 를 들고 있고(`worker/lib/content-unlocks.js:433-520`,
`:580-668`), `buildAccessState` 가 `string[]` 로 평탄화한다(`worker/lib/access-state.js:136-148`).
핸드오프가 예측한 스키마 변경 지점이 여기다. 추가 전용 필드로 되살린다 —
`unlockedFeatureIds`(소비자 30곳)는 **그대로 둔다**:

```
unlockedFeatures: [{ featureKey, source, grantType, passId, expiresAt, grantedAt }]
```

그러면 W1 × W2 가 데이터 수준에서 닫힌다. 이용권으로 열린 해금은 `source:'PASS'` + `passId` 를 들고
있으므로 이용권이 끝나면 그 항목만 집합에서 빠진다 — `isUnlocked=true` 인데 `coversNow=false` 인
상태가 성립할 수 없게 된다. 서버만 바뀌므로 동결 파일과 무관하다.
🔴 **D6 은 D1~D5 와 독립이고 더 크다. 순서상 맨 뒤에 둔다.**

### 왜 동결 파일을 건드리지 않아도 되는가

🔴 이 절은 위 "순서 근거"의 "Phase 4 는 동결 파일 2개를 건드린다"를 **정정한다.**

소비자는 많다 — 셸 `index.html` 4곳(`:29942`·`:29944`·`:29952`·`:30048`),
`components/fpti/FptiResultCard.tsx` 약 20곳, `app/_lib/billing-client.ts:296-297,3516`(**동결**),
`app/hooks/useCoinGate.ts`(**동결**), `app/_lib/use-content-unlock.ts`,
`app/components/DeferredAdsense.tsx:113`, `js/destiny-profile.js:2370`,
`js/saju-engine-tarot-sukuyo-quantum.js:14953`.

**전부 `isUnlocked(featureKey)` 하나를 부른다.** 수렴을 `isUnlocked` **안쪽**에서 하면 호출부는 한
줄도 안 바뀐다. D1·D2·D4 는 전부 `js/core/access-store.js` 내부, D3 은 비동결
`use-content-unlock.ts` 한 줄, D5 는 `scripts/` + 플래그, D6 은 `worker/`.
→ **`config/payment-freeze.json` 절차가 필요 없다.** 동결 파일은 호출부일 뿐이다.
(절차가 필요해지면 `node scripts/verify-payment-freeze.mjs --update` 후 같은 커밋에 매니페스트를 담는다.)

서버 쪽에는 이미 단일 판정 함수가 있다 — `worker/lib/permission-service.js` 의
`PermissionService.canUse`. 클라이언트 `isUnlocked` 는 그 판정 형태에 수렴한다.

### 작업 순서 (커밋 단위)

| # | 커밋 | 파일 | 등급 | 보호 테스트 |
|---|---|---|---|---|
| 1 | 세션 캐시 계약 가드 신설 (D5.1) | `scripts/` + `package.json` 배선 | GREEN | 영향 없음 |
| 2 | 설치 가드 fail-closed (D5.2) | `index.html` + 미러, `user-session-cache.ts` | GREEN | 영향 없음 |
| 3 | 신선도 레버 연결 (D4) | `js/core/access-store.js` + 미러 | RED | W1×W4 단언 뒤집기 |
| 4 | 정본 필드 못 박기 (D1) | `js/core/access-store.js` + 미러 | RED | 영향 없음(같은 집합) |
| 5 | 권위 집합 치환 (D2) | `js/core/access-store.js` + 미러 | RED | W1×W4 회수 단언 뒤집기 |
| 6 | 원장 OR 합류 축소 (D3) | `app/_lib/use-content-unlock.ts` | RED | W1×W3 단언 2건 뒤집기 |
| 7 | provenance 추가 (D6) | `worker/lib/access-state.js` | RED | W1×W2 단언 뒤집기 |

`js/core/*.js` 를 고치는 커밋은 `public/` 미러 재생성(`sync:public`)까지 같은 커밋에 담는다.
각 커밋: `npm run check:fast` + `node --test __tests__/ui/permission-writer-divergence.behavior.test.js`
+ `node --test __tests__/ui/access-store.static.test.js`(`unlockedFeatureIds` 단언 15곳).

### 🔴 핸드오프 정정 — 보호 테스트는 한 커밋에서 뒤집히지 않는다

핸드오프는 "수렴 커밋에서 단언이 깨지는 게 정상"이라 적었다. 커밋이 7개로 갈리므로 **단언은 그 동작을
바꾸는 커밋에서 각각 뒤집는다.** "커밋 시점 main 은 항상 실행 가능"이므로 테스트가 빨간 커밋을 남길 수
없다. 뒤집을 때 **단언을 지우지 않고 방향만 바꾼다** — 그래야 수렴이 되돌아가면 다시 잡힌다.

### 변이 검증 계획 (도는 가드 ≠ 무는 가드)

| 커밋 | 변이 | 기대 |
|---|---|---|
| 1 | 한쪽 TTL 만 바꾼다 / 한쪽에만 엔드포인트를 추가한다 | 계약 가드 실패 |
| 3 | 헤더를 다시 뗀다 | 회수 단언 실패 |
| 5 | 치환을 덧쓰기로 되돌린다 | 회수 단언 실패 |
| 6 | `confirmed` 를 OR 에 다시 넣는다 | 롤백 단언 실패 |

핸드오프 함정 2 를 그대로 적용한다 — **미탐지를 보면 단언을 의심하기 전에 변이를 의심한다.**

### 위험·롤백

**가장 큰 위험은 커밋 5다.** 권위 페이로드가 실제로 완전하지 않은 경로가 있으면 **정당한 해금이
회수된다.** 방어는 `authoritativeFull` 삼중 조건 하나뿐이다. 다만 그 조건은 이미 프로덕션에서
`persistentUnlocks` 치환에 쓰이고 있다(`:654`) — 새 위험을 만드는 것이 아니라 **같은 조건을 두 번째
맵에 적용**하는 것이다.

**커밋 5 전에 반드시 측정할 것 (지금 미확인):** 환불·권한취소 경로가 어떤 페이로드를 보내는가. 그
경로가 `completeness:'full'` + `authority:'server'` 를 안 보내면 치환이 일어나지 않아 회수도 안 된다 —
그러면 커밋 5 는 효과가 없고 D6 이나 서버 쪽 변경이 먼저다.

**롤백:** 각 커밋 단독 `git revert`. 커밋 5·6 은 사용자에게 보이는 경계를 바꾸므로 push 전에
`__tests__/ui/` 의 access-store · pass-optimistic 계열을 같이 돌린다.

### 열린 판단 (사용자 결정 대기 — 착수를 막지는 않는다)

1. **D6(provenance)을 Phase 4 에 넣는가, Phase 5 로 넘기는가.** 추천: **D1~D5 를 먼저 끝내고
   판단한다.** D6 은 서버 스키마 추가라 Phase 4 의 성격(클라이언트 판정 수렴)과 다르고, D1~D5 만으로도
   재현된 엇갈림 4종 중 3종이 닫힌다(W1×W4 2종, W1×W3 2종). W1×W2 만 D6 을 기다린다.
2. 커밋 3(헤더 연결)은 **서버 캐시 무효화 빈도를 올린다.** 강제 갱신 경로에만 붙으므로 평시 부하는
   그대로지만, 결제 직후 갱신이 몰리는 창에서 스냅샷 재계산이 늘어난다. 미확인: 그 재계산 비용.
   커밋 3 전에 `worker/lib/access-state.js` 의 쿼리 수를 세어 둔다.

### TOP 15 는 이 설계에 없다

경로는 겹친다 — `app/_lib/auth-client.ts:2` 가 `app/_lib/http-client.ts` 의 `fetchWithTimeout` 을 쓰고
그 위에 몽키패치가 얹힌다. 커밋 1~7 뒤에 손대면 계약 가드가 먼저 서 있다.

### 범위 밖 결함 (원칙 14 — 보고만)

원장 `optimistic-unlock-ledger.ts:42` 의 `confirmed` 무한 수명 / `revokedFeatureIds` 생산자 부재 /
경로 B 의 셸 전용 10초 층 / `verify:sitemap-drift` 선행 실패.

## 이번 리팩터링에서 하지 않는 것

- 전체 재작성(Big Bang Rewrite) — 가장 금지하는 것
- 파일·폴더 이동 ([architecture-map.md](architecture-map.md) 6절)
- PR 생성 — 이 레포는 main 직접 개발이다
- 실 LLM 호출 · 실결제 · 운영 DB 쓰기
- legacy 로 보인다는 이유만의 삭제
- 범위 밖 결함의 수정(보고만 — 코딩 원칙 14)
