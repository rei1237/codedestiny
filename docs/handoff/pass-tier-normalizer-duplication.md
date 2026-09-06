---
status: active
updated: 2026-09-06
next: 4벌의 정규화기에 같은 입력 20종을 넣어 답이 갈리는 입력이 실제로 있는지부터 확인한다 — 갈리지 않으면 통합하지 말고 가드만 세운다.
---

# 이용권 등급 정규화기 4벌 중복

## 왜

PR #1673 본문의 후속 과제 #4("등급 정규화 로직 5벌 중복"). 사용자가 "꼭 해야 하는 일인지" 물었고, **필수가 아니라 위생 작업**으로 분류됐다. 하려면 이 문서대로 한다.

## 지금 상태

- 미착수. 관련 정리 PR 은 #1678(도달 불가 코드·죽은 import·낡은 주석·ja/zh 문구).
- 🔴 원 본문의 "5벌"은 미확인이다. 함수명 grep 으로 실제 확인된 것은 **4벌**이다.

## 남은 작업

- [ ] 4벌에 같은 입력(자유 문자열 planId·productId·label·한글 표기·대소문자·`standard-3m` 류)을 넣어 **답이 갈리는 입력을 표로** 만든다. 갈리는 입력이 0이면 통합하지 않는다 — 그때 할 일은 아래 가드 하나뿐이다.
- [ ] 갈리는 입력이 있으면 **어느 답이 옳은지 먼저 정한다**(정본은 worker 쪽). 클라이언트가 더 느슨해지는 방향은 결제 게이트가 아니라 표시용이라도 위험하다.
- [ ] `scripts/verify-pass-tier-policy.mjs` 에 **4벌 대조 검사**를 추가한다 — 지금 이 가드의 "하드코딩 사본" 항목은 **한도 숫자**(앱 SKU 테이블·정적 셸)만 보고 정규화기는 보지 않는다. 즉 현재 정규화기 드리프트는 **아무도 안 잡는다**.
- [ ] 판정 기준: 정한 입력 표 전체에서 4벌의 답이 같고, 그 표가 가드로 고정됐으면 끝.

## 정본 예시

`worker/lib/profile-limits.js:454` (`normalizePassTier` — 별칭·한글 표기 처리의 정본)

나머지 3벌: `app/_lib/billing-client.ts:3387` · `js/core/pass-verdict.js:95` · `lib/payment/pass-eligibility.ts:72`

## 함정

- 🔴 **런타임이 서로 다르다** — `js/core/pass-verdict.js` 는 번들러를 거치지 않는 정적 셸의 ES5 파일이라 `import` 로 공용 모듈을 끌어올 수 없다. "한 파일로 합치기"는 이 한 곳 때문에 성립하지 않는다. 현실적인 착지점은 **공용 정본 + 셸용 사본 + 사본을 고정하는 가드**다.
- 🔴 **반환 계약이 다르다** — worker/TS 쪽은 미해당 시 `null`, 셸은 `"free"` 를 돌려준다. 한쪽으로 통일하면 호출부의 `||` 폴백이 조용히 뒤집힌다.
- 결제 동결 대상 파일을 건드리면 `config/payment-freeze.json` 을 같은 커밋에 갱신한다.

## 검증

```
npm run verify:pass-tier-policy
npm run verify:billing-pass-policy
npm run test:jest -- __tests__/worker/profile-limits.tier-aliases.test.js __tests__/billing/pass-verdict.test.js
```

## 모르는 것

- 원 본문이 센 "5벌"의 다섯 번째가 무엇인지. 함수명이 다른 사본(예: 셸의 `_cdNormalizeMembershipTier` 계열)일 가능성이 있으나 **미검증**이다.
- 답이 갈리는 입력이 프로덕션 데이터에 실제로 존재하는지. 이건 DB 조회가 필요해 확인하지 않았다.
