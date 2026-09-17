---
status: active
updated: 2026-09-17
next: "죽은 코인 차감 코드 제거 — fortune.js:2917-3127 + billing.js:3026-3057,4534-5060, 동반 테스트 2개 재작성"
---

# pig-coin 코인 차감 데드코드 제거

## 배경

원 요청(이전 세션): billing.js coin-gate 핸들러 전체 + PortOne 승인 왕복 미검증분 조사. 그 조사 중
발견한 버그(웹훅 끝슬래시 라우팅 누락)는 이미 수정·커밋·푸시 완료(`c25e5bbb5`, main) — 이 문서와는 무관,
재조사하지 말 것.

그 조사 후 사용자 질문: "pig-coin consume은 현재 어디에 쓰이고 있어? 이제 코인 체계는 없앴는데 아직도
필요한가?" — 이 질문에 답하려고 `deletion-auditor` 서브에이전트로 3면(소스/테스트/verify) 전수 grep
감사를 돌렸다(2026-09-17). 이 문서는 그 감사 결과를 다음 세션이 바로 실행할 수 있게 정리한 것 —
**아직 아무 코드도 지우지 않았다.**

## 판정 요약

이름 하나("pig-coin consume") 아래 성격이 다른 조각들이 섞여 있다. 삭제 가능/불가 판정이 조각마다 다르다.

| 조각 | 판정 |
|---|---|
| `handlePigCoinConsume` 함수 자체(fortune.js:2680), `/pig-coin/consume` 라우트(fortune.js:6886), `isExplicitLegacyCoinPaymentMode`(billing.js:247) | **삭제 불가 — 라이브.** 지우면 유료 기능 7개 이상이 깨진다 |
| 그 함수 안의 "코인 차감" 실행 코드(fortune.js:2917-3127) | **삭제 가능 — 도달 불가능한 죽은 코드** |
| billing.js의 `consumeCoinWithRetry`(3026) + 유일 호출부(4881-5060) | **삭제 가능 — 이중으로 도달 불가능** |
| "코인"을 가격 단위로 쓰는 부분(coinPrice, chargedCoins 등) | **무관 — 건드리지 않음.** 이용권/월정석 가격 표시에 여전히 씀 |
| `User.points` 필드 자체 | **무관 — 건드리지 않음.** 환불/롤백 경로가 여전히 증감시킴 |

## 왜 함수는 살아있는데 안은 죽었는가

`handlePigCoinConsume`(fortune.js:2680-3128)은 사주·점성술·베다AI·자미두수·숙요AI 등 최소 7개 유료
상담 라우트가 "이용권 커버리지 판정"을 위해 직접 호출하는 유일한 창구다(주석 fortune.js:1886-1891:
"차감은 실제 통과를 내주는 handlePigCoinConsume 한 곳에서만 한다"). 직접 호출부:
fortune.js:3153, 3780, 4442, 4604, 4828, 5542, 5795. `/api/fortune/pig-coin/consume` HTTP
라우트(fortune.js:6886)도 이 함수로 직결된다.

그런데 함수 내부 2896-2915에서 `LEGACY_COIN_DISABLED` 402를 **무조건** 먼저 반환한다. 그래서 그 아래
2917-3127(실제 코인 차감 로직)은 **코드 흐름상 도달 불가능** — 함수는 패스 커버리지 판정 게이트로만
살아있고, 원래 목적이던 코인 차감 기능은 이미 죽어 있다.

billing.js 쪽도 같은 패턴이다: `coinPaymentRequested`(3382에서 계산, `const`로 재할당 없음 —
3382/3389/4425/4453/4496 5곳이 전부)가 어떤 값이든 4496-4532 블록에서 무조건 반환하므로, 4534줄
이후(주석으로 이미 "legacy debit implementation below is intentionally unreachable"라고 자인)와
`consumeCoinWithRetry`(3026, non-export) + 그 유일 호출부(4903, `delegatedBody` 구성 4881부터)는
전부 도달 불가능.

## 삭제 대상 (정확한 범위)

1. **`worker/routes/fortune.js:2917-3127`** — 코인 차감 꼬리만.
   **2896-2915(402 반환)와 2680-2896(패스 커버리지 판정), 2680/3128(시그니처·닫는 괄호)은 보존.**
2. **`worker/routes/billing.js:4534-4879`** (주석 "legacy debit implementation below is
   intentionally unreachable" 포함) **+ `4881-5060`**(delegatedBody 구성~consumeCoinWithRetry
   호출~응답 처리). **`4496-4532`(coinPaymentRequested 체크+402 반환)와 3382/4425/4453(게이팅
   로직)은 보존.**
3. **`worker/routes/billing.js:3026-3057`** — `consumeCoinWithRetry` 함수 정의. 2번과 함께 삭제
   (export 안 됨 — 다른 파일에서 참조 없음, 이 함수의 유일한 호출부가 2번이므로 동반 삭제 필수).

## 같은 커밋에서 반드시 같이 고쳐야 하는 테스트

- **`__tests__/worker/legacy-coin-disabled.static.test.js:40-50`** — 지금은 "X가 Y보다 먼저
  나온다"는 순서 단언(`indexOf` 비교)인데, Y(`$inc: { points: -requiredCoins`,
  `$inc: { points: -cost`)가 파일에서 완전히 사라지면 `indexOf`가 `-1`을 반환해 의도와 다르게
  통과/실패할 수 있다. "이제 존재하지 않는다"는 단언으로 바꿔야 한다.
- **`__tests__/worker/billing.coin-gate-consume-retry.static.test.js`** — 전체가
  `sliceFunction(billingSource, "async function consumeCoinWithRetry(")`로 함수를 찾아 정적
  검증하는 구조라, 함수 삭제 시 그대로 실패한다. 파일 헤더 주석이 이미 "그 아래 실제 코인 차감
  쓰기는 LEGACY_COIN_DISABLED(402) 조기 반환에 막힌 죽은 코드"라고 자인하고 있어 재작성 근거는
  이미 문서화돼 있다 — 제거 또는 재작성.

## 삭제 후 실행할 검증

```bash
npx jest __tests__/worker/legacy-coin-disabled.static.test.js __tests__/worker/billing.coin-gate-consume-retry.static.test.js __tests__/worker/coin-access.guard.test.js __tests__/ui/ai-prompt-pass-recovery.behavior.test.js __tests__/worker/feature-question-paid-delivery.test.js __tests__/worker/saju-paid-delivery-recovery.test.js
npm run verify:guard-wiring
npm run check:critical
```

`coin-access.guard.test.js`(라이브 서브시스템 행동 테스트)와 나머지 3개(`handlePigCoinConsume`을
jest mock으로 대체해 그 호출자인 AI 프롬프트 라우트를 검증)는 삭제 범위와 겹치지 않지만, 이번
변경이 그 호출자들에 영향 없다는 걸 확인하는 회귀 방지용으로 같이 돌린다.

`worker/routes/fortune.js`·`worker/routes/billing.js` 둘 다 `.github/workflows/paid-flow-gates.yml`의
`paths:`에 등록돼 있어 push 시 자동으로 깨어난다. **fortune.js 삭제와 billing.js 삭제를 별도 커밋으로
나눈다면, 두 커밋이 모두 반영된 최종 main에서 `npm run check:critical`을 한 번 더 돌릴 것** —
"A만 통과, B만 통과인데 A+B가 깨지는" 조합 결함은 커밋 단위 검증으로 못 잡는다.

## 참고만 — 이번 범위 아님, 손대지 말 것

- **`worker/routes/fortune.js:1886-1891` 주석** — "차감은 handlePigCoinConsume 한 곳에서만
  한다"는 문구가 삭제 후엔 부정확해질 수 있음(코인 차감 자체가 없어지므로). 수정하고 싶으면
  GREEN 등급 별도 변경으로. 이번 삭제에 강제 동반 아님.
- **`config/payment-freeze.json`의 `growthCeilings.maxLines=6909`**(billing.js, 현재 6908줄) —
  삭제로 줄어드는 방향이라 상한 위반 걱정 없음. 참고로만 적어둔다.
- **`scripts/verify-test-account-payment-flow.mjs`, `scripts/verify-all-paid-services-payment-flow.mjs`**
  — `paymentMode:"COIN"` 전송 후 200+포인트차감을 기대하는 코드가 있는데, 이는 이번에 확인한
  데드코드 분석과 이미 모순되는 것으로 보인다(기존 결함 추정, 이번 삭제가 새로 만드는 문제 아님).
  둘 다 라이브 DB 쓰기가 필요해 `UNWIRED_BY_DESIGN`("사용자 승인 후 수동")으로 CI 밖에 있다 —
  이번 삭제 조사에서 실행해 확인하지 않았다(실결제 금지 제약). 삭제 후엔 이 기대치가 더 명백히
  틀리게 되지만, 고치는 건 별도 과제로 사용자에게 보고만 할 것.
- **`isExplicitLegacyCoinPaymentMode`, `User.points`, coin 가격단위** — 위 표에 이미 정리,
  손대지 않음.

## 작업 시 주의 (CLAUDE.md)

- **RED 등급** — 라우팅 인접·공유 동작 수정. 편집 전에 위험·검증·롤백을 먼저 보고할 것(코딩 원칙 7).
- 삭제이므로 **원칙 9**(git grep으로 소스·테스트·verify 3면 확인, 미러 포함)를 실행 시점에 다시
  확인할 것 — 이 문서의 줄 번호는 2026-09-17 기준이며, 그 사이 다른 커밋이 fortune.js/billing.js를
  건드렸다면 줄 번호가 밀렸을 수 있다. 먼저 재확인:
  ```bash
  git grep -n "consumeCoinWithRetry\|handlePigCoinConsume\|LEGACY_COIN_DISABLED\|isExplicitLegacyCoinPaymentMode"
  ```
- main 직접 커밋. 브랜치·PR 없음. 작은 단위로 나눠 각각 검증→커밋(예: billing.js 커밋 1개,
  fortune.js 커밋 1개, 테스트 재작성은 각 코드 커밋과 같은 커밋에 포함).
- 삭제 후 되돌릴 일 생기면 조건·try/catch로 덧대지 말고 `git revert`.

## 다음 세션 시작 프롬프트

```text
docs/handoff/pig-coin-dead-code-removal-2026-09-17.md 를 먼저 읽고, "삭제 대상 (정확한 범위)" 절의
3개 항목부터 git grep 으로 줄 번호 재확인 후 진행해줘. RED 등급이니 편집 전에 위험·검증·롤백부터 보고.
```
