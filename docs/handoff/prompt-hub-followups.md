---
status: active
updated: 2026-09-04
next: 심리테스트(`psych`) 배선을 할지 사용자에게 물어 답을 받는다 — 배선이 아니라 새 퀴즈 UI 기능이라 착수 전 승인이 필요하다
---

# 프롬프트 허브 — PR #1553 후속 잔여 1건

## 왜

"PR #1553 본문 하단 후속 5건을 진행해줘" → #1·#2·#4 는 PR #1556, #5(임포터 0인 계산 모듈)는 PR #1557, 매화역수 괘 이름 조사는 PR #1559 로 끝났다. 남은 것이 아래 1건이다.

## 지금 상태

- PR #1553 · #1556 · #1557 머지됨. PR #1559(괘 이름 조사)는 CI 통과 후 **사용자 머지 대기**.
- 배선된 도구는 dangsaju·kusei·meihua 포함 9개(`buildComputedFactsFor` 의 case 수). 가드 `verify:prompt-hub-facts-wiring` 이 이 배선과 매화역수 64괘 조사를 지킨다.

## 남은 작업 — 심리테스트(`psych`) 배선 · 🔴 착수 전 사용자 승인 필요

- `psych-prompt-tools.ts` 의 `buildPsychPrompt` 는 **완료된 다지선다 퀴즈 결과**(`PsychQuestion`/`PsychOption`/`PsychArchetype`)를 받는다. 허브 도구(`PromptHubClient.tsx:538`)에는 주제·대상·문항 수·결과 유형뿐이라 넘길 값이 없다.
- 즉 배선이 아니라 **새 퀴즈 UI 기능**이다. 원칙 16(큰 디자인 변경은 목업 발행 → 승인 → 구현)에 걸리므로, 코드부터 고치지 말고 사용자에게 할지 여부부터 물을 것.
- 파일명이 `-calc.ts` 가 아니라 가드는 이 도구를 요구하지 않는다(의도된 것).

## 함정

- `PromptHubClient.tsx` 를 건드리면 sitemap 원장이 어긋난다 → `npm run sitemap:generate` 후 `config/sitemap-lastmod.json` 을 같은 커밋에. 🔴 `check:quick` 의 `build:cf` 가 `rss.xml`·`public/rss.xml`·`insights/rss.xml`·`public/insights/rss.xml`·`.ignore` 를 되쓰므로 커밋 전에 되돌린다(실측 2026-09-04).
- `meihua-calc.ts` 는 CRLF 다 — Edit/sed 로 고치면 파일 전체가 diff 로 부풀어 오른다. node 패치 스크립트로 앵커 치환할 것.

## 검증

```
npm run verify:prompt-hub-facts-wiring
npm run lint && npm run typecheck && npm run check:quick
```

## 모르는 것

이 작업을 할지 말지. 퀴즈 UI 는 허브의 다른 도구에 전례가 없어 화면 형태를 지어내야 한다 — **추측하지 말고 사용자에게 물을 것.**
