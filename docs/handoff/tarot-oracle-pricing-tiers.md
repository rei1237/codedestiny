# 인수인계 — 타로 오라클 상담 카드 수 구간별 가격 차등

> ✅ **완료 — PR #1171 (2026-08-27). 아래 본문은 착수 시점의 기록이고, 실제로 한 일과는 세 군데가 다르다.**
> 1. 3-2 표의 `클라이언트 ORACLE_CONSULTATION_MIN_COST` 는 **존재하지 않았다** — 클라는 `lookupServerCoinPrice` 로 레지스트리에서 읽는다.
> 2. ₩7,000(70코인)에 **앱 결제 티어가 없어** `verify:app-store-pricing` 이 깨졌다. 사용자 결정으로 4단계를 유지하고 `cd_content_tier_14` 를 신설했다 — 🔴 Play Console 등록은 아직 사람 손 미완이다(docs/pricing/PLAY_CONSOLE_TASKS.md 3절).
> 3. 8절의 `review-product-catalog` 관련 서술과 달리, `__tests__/worker/review-catalog-moderation.test.js` 는 **레지스트리 → 카탈로그 방향도 검사한다**. 신규 키 3개를 카탈로그에 넣어야 했다.
>
> 남은 부채는 8절 그대로다(`per-use-proof-roundtrip` 의 손으로 쓴 `ROUTE_KEY_SOURCES`, i18n fallback 드리프트, 법률 카테고리 실패 원인 미확정).

> 이 문서만 읽고 시작할 수 있게 쓴다. 🔴 **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
> 작성 2026-08-27 · 앞선 세션이 컨텍스트 한계로 넘김(CLAUDE.md 코딩 원칙 12)

## 1. 왜 하는 작업인가

사용자 요구 원문:

> "그리고 3카드 7,10,14 카드의 가격이 똑같은것 자체가 말이 안되는데 가격을 차등 해주면 좋을것 같다 14카드는 만원으로 설정해주고 나머지 3카드가 3천원으로 설정해서 나머지 상담도 적절하게 가격을 설정해줘"

`/tarot/prompt-maker`(타로 오라클 상담)는 지금 **1장이든 14장이든 일률 ₩5,000** 이다. 실측상 14카드는 3카드의 약 2배 분량에 출력 토큰도 2배라 같은 가격은 근거가 없다.

실측 2026-08-27 (`gemini-2.5-flash`, 사용자 허락 하 진단 호출):

| 카드 | 표시 한글 | 출력토큰 | 경과 |
|---|---|---|---|
| 3 | 3,132자 | 2,426 | 15.2초 |
| 14 | 6,128자 | 4,960 | 25.3초 |

## 2. 이미 끝난 것 — 🔴 다시 하지 마라

| PR | 상태 | 내용 |
|---|---|---|
| **#1159** | **머지됨** | 출력 스키마 확대 + 신규 섹션 4개(`positionAdvice`·`cardSynergies`·`timeline`·`categoryFocus`) + 카드 수 비례 목표 분량 + 분량 미달 재요청 게이트 |
| **#1161** | **머지됨** | 실패 사유 구분(400/402/429/502/503 + `retryable`) · 안전차단 파싱 · 재시도 백오프 · requestId 단위 재생성 상한(10분 4회) · 무과금 재시도 버튼 |
| **#1164** | **머지됨** | 목표 분량 상수를 실측에 결박(`2300 + 280×카드수`) · 데드라인 38→60초 · 가드 2개 |
| **#1165** | **PR 오픈, 머지 대기** | 16개 카테고리 전용 topic-lock 프로파일 + Workers AI 폴백 어댑터 |

🔴 **PR-D 는 #1165 가 머지된 뒤 `origin/main` 에서 새로 분기해 시작한다.** 이 레포 PR CI 는 `pull_request: branches: [main]` 만 트리거해서 **base 가 main 이 아닌 PR 에는 검사가 하나도 안 돈다**(#1161 에서 실제로 겪었다).

분량 문제는 해결됐다. **남은 것은 가격뿐이다.**

## 3. 남은 작업 — 정확한 대상

### 3-1. 가격 사다리 (사용자 확정 — 4단계, 임의로 바꾸지 마라)

| 구간 | 서비스키 | cost | amountKRW | 해당 스프레드 |
|---|---|---|---|---|
| 1~4장 | `tarot-prompt-maker` (**기존 키 재사용**) | 30 | 3,000 | 4종 |
| 5~7장 | `tarot-prompt-maker-standard` (신규) | 50 | 5,000 | 55종 |
| 8~10장 | `tarot-prompt-maker-deep` (신규) | 70 | 7,000 | 16종 |
| 11~14장 | `tarot-prompt-maker-master` (신규) | 100 | 10,000 | 2종 |

- 🔴 기존 키를 1~4장 티어로 **재사용**한다. 새 키 3개만 추가하면 되고, 기존 결제 이력·감사 스크립트(`scripts/audit-tarot-prompt-maker-purchasers.mjs`)가 가리키는 키가 살아 있다.
- 그 키의 가격은 5,000 → 3,000 으로 **인하**되므로 기존 구매자 소급 이슈는 없다.
- `1코인 = 100원` 고정(`worker/lib/billing-policy.js` 의 `KRW_PER_COIN`).

### 3-2. 고쳐야 할 곳 (전부 확인된 실제 위치)

| 파일 | 줄 | 할 일 |
|---|---|---|
| `lib/tarot/oracle-consultation-pricing.mjs` | 신규 | 티어 정본. `ORACLE_CONSULTATION_TIERS` + `resolveOracleConsultationTier(cardCount)`. 🔴 `.mjs` 로 둔다 — 클라(`.tsx`)·워커(`.js`)·verify(node)가 같은 정본을 읽어야 한다 |
| `worker/lib/paid-feature-registry.js` | 57, 188, 401 | 가격표에 신규 키 3개 + 기존 키를 `cost: 30, amountKRW: 3000` 으로. 🔴 상단 키 목록(57)과 `PER_USE_PAID_FEATURE_KEY_LIST`(401) **둘 다** 등록(하나라도 빠지면 회당결제로 인식 안 됨) |
| `worker/routes/tarot.js` | 53-54, 404, 411, 442-443, 446 | `ORACLE_CONSULTATION_FEATURE_KEY`/`_MIN_COST` 단일 상수를 없애고 `verifyOracleConsultationAccess` 안에서 카드 수로 역산 |
| `app/tarot/prompt-maker/TarotPromptMakerClient.tsx` | 2415, 2739, 2741, 2988, 2989 | 피처키·cost 를 `selectedSpread.cardCount` 에서 파생 |
| 〃 | 2593, 3919-3958 | 스프레드 피커 각 항목에 가격 표시 |
| `app/_lib/serviceFeatureRegistry.ts` | 346·1110·1874·2638·3402·3971 | 가격 문구를 "₩3,000~₩10,000 (카드 수에 따라)" 로 |
| `index.html` | 홈 타일 | `🔒 해금 10,000원` 이 **이미 낡았다**(실제는 회당 결제). 티어 범위로 교체 |
| `docs/pricing/PRICING_TIERS.md` | 102 부근 | 이력 표에 새 행. 기존 행의 "카드 수와 무관하게 고정 ₩5,000" 서술도 함께 갱신 |

## 4. 방법 — 무엇을 근거로 판정하나

### 4-1. 🔴 최우선: 지불 티어를 카드 수에 결박한다 (보안)

**클라이언트가 보낸 티어·키·가격을 절대 신뢰하지 않는다.** 그러지 않으면 ₩3,000 티어로 결제하고 14장을 제출하는 경로가 열린다.

서버는 `body.cards.length` 에서 **직접 역산**한다. 그 값은 `validateOracleConsultationInput` 이 이미 1~14 로 검증한다(#1161 이후 라우트 진입 직후에 돈다 — `worker/routes/tarot.js` 의 `/oracle-consultation` 분기 맨 앞).

이게 이 PR 에서 **가장 중요한 단언**이다:
> `₩3,000` 티어 증빙으로 14장을 제출하면 **402**

### 4-2. 이용권 커버는 티어 무관 동일하게 둔다

등급별 건당 상한(`canUseByPass`, `worker/lib/profile-limits.js`)이 가격을 보므로, ₩10,000 티어가 하위 등급 이용권에서 미커버가 되는 것은 **기존 정책의 정상 동작**이다. featureKey 별 예외 분기를 만들지 마라(`isPassExcludedPricing` 원칙).

### 4-3. 클라이언트 함정 2개

1. `billingSnapshot` 로딩(2739 부근)이 **마운트 시 1회**만 돈다. 의존성에 카드 수를 넣지 않으면 스프레드를 바꿔도 상단 요금 배지가 옛 티어를 유지한다.
2. `buildOracleConsultationRequestId`(2417 부근) 접두사도 티어 키 기준으로 바꾼다 — 증빙 조회가 `featureKey` + `requestId` 로 걸리므로 접두사가 티어와 어긋나면 안 된다.

### 4-4. 가격 표시

🔴 `cost`/`coinPrice` 를 그대로 렌더링하지 마라(코인은 폐지된 개념). `lib/payment/coin-pricing.ts` 의 `formatKrwFromCoins` 를 쓴다.

## 5. 정본 예시 — 이 레포에 이미 있는 같은 패턴

`worker/lib/paid-feature-registry.js:197-198`:

```js
"fortune-tea-house-tarot-consultation": { cost: 50, amountKRW: 5000, reason: "운명 찻집 타로 상담 (3카드)" },
"fortune-tea-house-tarot-five-consultation": { cost: 100, amountKRW: 10000, reason: "운명 찻집 타로 프리미엄 상담 (5카드)" },
```

**카드 수 구간마다 별도 서비스키**를 두는 방식이 이미 쓰이고 있다. 같은 패턴을 따르면 된다.

## 6. 이 레포 고유의 작업 규칙

- 🔴 **작업 전 `EnterWorktree` 로 격리한다.** 기본 작업 디렉터리는 여러 세션이 동시에 쓴다.
- 🔴 워크트리에서 jest 는 `NODE_OPTIONS=--experimental-vm-modules npx --no-install jest` 로 손수 줘야 한다. `node_modules` 심링크는 대개 안 생기지만 도구는 상위 디렉터리를 타고 올라가 동작한다.
- 🔴🔴 **`config/payment-freeze.json` 에 `paid-feature-registry` 가 등재돼 있다**(실측 확인). `worker/lib/paid-feature-registry.js` 를 고치면 **같은 커밋에** `node scripts/verify-payment-freeze.mjs --update` 로 매니페스트를 갱신해야 한다. 안 하면 `paid-flow-gates` 가 실패한다.
- 🔴 `index.html` 을 고치면 `npm run sync:public` 산출물(미러 13개)을 **같은 커밋에** 담는다.
- 🔴 라우트 소스(`app/tarot/prompt-maker/**`)를 고치면 `verify:sitemap-drift` 가 깨진다 → `npm run sitemap:generate` 산출물을 같은 커밋에.
- 🔴 새 env 키를 읽으면 `config/env.contract.json` 에 선언해야 `verify:env-parity` 가 통과한다.
- 🔴 **머지는 사용자가 한다.** 브랜치 → 커밋 → push → PR → CI 까지만. `main` 직접 작업·직접 배포 금지.
- 🔴 커밋 전 `git diff --name-only`(범위 일치) · `git diff --numstat`(대량 변경 · `- -` 바이너리 표시) 확인.
- 🔴 `.tsx` 편집은 CRLF 를 떨굴 수 있다. 커밋 전 `file <경로>` 로 개행이 유지됐는지, `numstat` 이 변경량에 비례하는지 본다.
- 🔴 **결제 정책 변경이므로 커밋 전 `paid-gate-auditor` 서브에이전트 감사를 받는다.**
- 🔴 **LLM 실호출 금지.** 이 작업에는 필요 없다. 모든 검증은 mock.

## 7. 검증 명령

```
npm run verify:paid-feature-billing-policy   # 레지스트리 ↔ 프론트 ↔ 워커 정합
npm run verify:ai-prompt-billing-policy
npm run verify:billing-pass-policy
npm run verify:portone-single-payment
npm run verify:paid-gate-ui
npm run verify:payment-choice-parity
npm run verify:checkout-pass-card
npm run verify:oracle-consultation
node scripts/verify-payment-freeze.mjs --update   # 🔴 결과를 같은 커밋에
npm run verify:sitemap-drift
npm run verify:mirror-fresh                       # index.html 을 고쳤다면
npm run verify:env-parity
npm run verify:guard-wiring
npm run typecheck && npm run lint
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest    # 직전 기준 176 스위트 / 1,977 테스트
```

### 새로 만들어야 할 가드 (🔴 fail-closed, 손으로 쓴 목록 금지)

1. `scripts/verify-oracle-consultation.mjs` 에 추가 — `app/tarot/prompt-maker/data/tarotSpreadLibrary.ts` 에서 **모든 스프레드의 `cardCount` 를 소스에서 파싱**해 ① 전부 1~14 범위 ② 전부 **정확히 한 티어**에 매핑 ③ **파싱 결과가 0건이면 실패**. 스프레드가 15장짜리로 늘면 여기서 먼저 깨진다.
   - 참고: 기존 케이스 7-2 가 `types.ts` 유니온을 같은 방식으로 파싱한다. 그 코드를 그대로 본떠라.
2. `__tests__/worker/oracle-consultation.route.test.js` 에 추가 — **₩3,000 티어 증빙으로 14장 제출 → 402**.

## 8. 미해결 부채 (이 작업 범위 밖, 기록만)

- `__tests__/worker/per-use-proof-roundtrip.test.js` 의 `ROUTE_KEY_SOURCES` 가 손으로 쓴 목록이고 tarot 이 빠져 있다(CLAUDE.md 원칙 10 위반 소지). 단순 추가로는 안 되고 `readRouteFeatureKeys` 정규식을 `^const [A-Z_]*FEATURE_KEY` 로 넓혀야 하는데, 그러면 다른 12개 라우트의 기대값에도 영향이 간다 → **별도 소형 PR**. 🔴 PR-D 가 서비스키를 3개 늘리므로 이 부채가 더 커진다.
- `verify:i18n-no-fallback` 의 `fallbackCalls` 가 기준선 181 대비 197 로 드리프트(경고 전용, exit 0). 이 작업 이전부터 있던 것이고 타로 파일들에는 해당 래퍼 호출이 0건임을 확인했다.
- **법률/송사 카테고리 실패의 실제 사유는 여전히 미확정이다.** 진단 실호출 6회(3·7·10·14카드 × legal)가 전부 성공해 안전차단·토큰 상한·데드라인 초과 가설은 기각됐다. 남은 유력 후보는 429(레이트리밋)다. #1161 이 배포된 뒤 재발하면 화면에 사유가 표시되므로 그때 확정한다. 🔴 **추측으로 고치지 마라.**

## 9. 판단이 애매하면

이 문서에 근거가 없는 것은 **추측하지 말고 사용자에게 묻는다.** 특히:

- 가격 사다리의 구간 경계를 바꾸고 싶어질 때 (사용자가 4단계로 확정했다)
- 이용권/월정석 커버 정책을 티어별로 다르게 하고 싶어질 때 (하지 마라 — 4-2 참조)
- 기존 `tarot-prompt-maker` 키를 버리고 새 키 4개를 만들고 싶어질 때 (결제 이력이 그 키에 붙어 있다)
