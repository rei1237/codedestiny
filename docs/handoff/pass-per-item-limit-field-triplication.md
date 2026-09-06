---
status: active
updated: 2026-09-06
next: consumePassCoverage 가 maxCoveredCoin 만 갱신하고 passLimit·freeLimit 은 두고 가는 것이 실제 오답을 만드는지부터 확인한다 — 아니면 필드를 지우지 말고 "쓰지 않는다"만 고정한다.
---

# 건당 상한 3중 저장 (maxCoveredCoin · passLimit · freeLimit)

## 왜

PR #1673 본문의 후속 과제 #5. 사용자가 "꼭 해야 하는 일인지" 물었고, **필수가 아니라 위생 작업**으로 분류됐다. 셋 중 둘은 사실상 레거시 사본이다.

## 지금 상태

- 미착수. 관련 정리 PR 은 #1678.
- 실측(2026-09-06): 구독 문서에 세 필드가 전부 존재하고, 구매 시 **같은 값**(`plan.maxCoveredCoin`)으로 함께 쓰이며 해지 시 함께 0이 된다.

## 남은 작업

- [ ] **드리프트가 실제 오답이 되는지 판정한다.** 유일한 비대칭 지점은 소비 경로다 — 거기서 `maxCoveredCoin` 만 갱신되고 `passLimit`·`freeLimit` 은 구매 시점 값으로 남는다. 커버 판정의 정본 읽기는 `PASS_LIMITS[passTier] || activePass.maxCoveredCoin` 이라 **뒤 두 필드를 보지 않는다** — 그래서 지금은 표시·레거시 폴백 외에는 영향이 없다는 것이 현재 판단이다(전수 확인은 안 했다).
- [ ] 뒤 두 필드를 **읽는** 지점을 전수로 세운다(소스 + `__tests__/` + `scripts/verify-*`, `git grep`). 읽는 곳이 표시용뿐이면 → 필드를 지우지 말고 **읽기를 끊는다**.
- [ ] 판정 기준: 세 필드 중 정본은 하나(`maxCoveredCoin`)이고, 나머지 둘을 **읽는 코드가 0**이며, 그 사실이 가드로 고정됐으면 끝.
- [ ] 🔴 **스키마에서 필드를 제거하는 것은 별건이다** — 기존 문서 마이그레이션이 붙고 프로덕션 DB 쓰기 축이라 절대 규칙 2(사용자 명시 허락)에 걸린다. 이 작업의 기본 범위에 넣지 않는다.

## 정본 예시

`worker/payments/passes.js:234-236` (구매 시 세 필드 동시 기록) · 같은 파일 `:514` (소비 시 `maxCoveredCoin` 만) · `worker/lib/profile-limits.js:749` (커버 판정의 정본 읽기) · 스키마 `worker/lib/models.js:136-138`

## 함정

- 🔴 `freeLimit` 이라는 이름은 **다른 곳에도 있다** — `worker/lib/models.js:1700` 의 `freeLimit`(기본 3, 최대 3)은 무관한 필드다. 이름 grep 결과만으로 묶지 말 것(원칙 8).
- 정적 셸 `index.html` 의 `goldenPackages[].freeLimit` 도 같은 이름의 **표시용 사본**이다(`worker/lib/profile-limits.js:92` 주석 참고). 미러는 `sync:public` 산출물이라 직접 패치하지 않는다.
- 결제 동결 대상 파일을 건드리면 `config/payment-freeze.json` 을 같은 커밋에 갱신한다.

## 검증

```
npm run verify:billing-pass-policy
npm run verify:pass-tier-policy
npm run test:jest -- __tests__/worker/pass-budget-hard-gate.test.js __tests__/worker/payments-v2.pass-check.test.js
```

## 모르는 것

- 프로덕션 문서에서 세 값이 실제로 어긋난 사례가 있는지. DB 조회가 필요해 확인하지 않았다 — 하려면 읽기 전용 조회로 한정하고 사용자 허락을 받는다.
