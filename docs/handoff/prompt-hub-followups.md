---
status: active
updated: 2026-09-04
next: 매화역수 괘 이름 조사(`meihua-calc.ts:242`)를 한글 독음 기준으로 고치고 가드에 검사를 추가한다
---

# 프롬프트 허브 — PR #1553 후속 잔여 2건

## 왜

"PR #1553 본문 하단 후속 5건을 진행해줘" → #1·#2·#4 는 PR #1556, #5(임포터 0인 계산 모듈)는 PR #1557 로 끝났다. 남은 것이 아래 2건이고, 사용자는 "남은 후속 작업도 진행해줘"라고 요청한 상태다.

## 지금 상태

- PR #1553 · #1556 · #1557 전부 머지됨. 열린 PR·미커밋 변경 없음.
- 배선된 도구는 dangsaju·kusei·meihua 포함 9개(`buildComputedFactsFor` 의 case 수). 가드 `verify:prompt-hub-facts-wiring` 이 이 배선을 지킨다.

## 남은 작업

### 1. 매화역수 괘 이름 조사 (작업량 작음 — 먼저 할 것)

- 대상 **1곳**: `app/fortune/prompt-hub/meihua-calc.ts:242` 의 `coreSummary` 가 `${changedHexagramName}으로` 로 조사를 고정한다. 이 문자열은 `buildMeihuaPrompt` 계열 3곳(416·507줄 근처)에서 그대로 프롬프트에 실린다.
- 🔴 **한자→한글 독음 표는 필요 없다.** 앞선 세션의 "표가 있어야 고칠 수 있다"는 보고는 **틀렸다.** `HEXAGRAM_NAMES`(같은 파일 137줄)의 값이 `"수천수 水天需"` 처럼 **한글 독음 + 공백 + 한자** 형태라, 공백 앞 토큰의 마지막 글자로 받침을 판정하면 된다.
- 판정 기준: `화천대유 火天大有으로` 같은 출력이 사라지고, `수천수 水天需에서` 처럼 받침 있는 쪽도 그대로 맞을 것. 궁합 모드(367줄 호출부)도 함께 볼 것.

### 2. 심리테스트(`psych`) 배선 — 🔴 착수 전 사용자 승인 필요

- `psych-prompt-tools.ts` 의 `buildPsychPrompt` 는 **완료된 다지선다 퀴즈 결과**(`PsychQuestion`/`PsychOption`/`PsychArchetype`)를 받는다. 허브 도구(`PromptHubClient.tsx:538`)에는 주제·대상·문항 수·결과 유형뿐이라 넘길 값이 없다.
- 즉 배선이 아니라 **새 퀴즈 UI 기능**이다. 원칙 16(큰 디자인 변경은 목업 발행 → 승인 → 구현)에 걸리므로, 코드부터 고치지 말고 사용자에게 할지 여부부터 물을 것.
- 파일명이 `-calc.ts` 가 아니라 가드는 이 도구를 요구하지 않는다(의도된 것).

## 정본 예시

받침 판정 헬퍼의 형태: `app/fortune/prompt-hub/kusei-calc.ts` 의 `subjectParticle` / `objectParticle`.

## 함정

- 가드의 조사 검사(`scripts/verify-prompt-hub-facts-wiring.mjs:97`)는 **오행 5글자만** 본다 — 괘 이름은 잡지 않는다. 1번을 고치면 그 검사를 괘 이름까지 넓히고, **더미 파일로 변이 확인**해서 실제로 무는지 볼 것.
- `PromptHubClient.tsx` 를 건드리면 sitemap 원장이 어긋난다 → `npm run sitemap:generate` 후 `config/sitemap-lastmod.json` 을 같은 커밋에.
- 워크트리에서 `check:quick` 의 마지막 `build:worker` 는 `workers-og` 미설치로 로컬에서만 실패한다(CI 는 통과). 코드 회귀가 아니다.

## 검증

```
npm run verify:prompt-hub-facts-wiring
npm run lint && npm run typecheck && npm run check:quick
```

## 모르는 것

2번을 할지 말지. 퀴즈 UI 는 허브의 다른 도구에 전례가 없어 화면 형태를 지어내야 한다 — **추측하지 말고 사용자에게 물을 것.**
