---
status: active
updated: 2026-09-06
next: 머지 후 새 세션이 3개 이상 쌓였는지 세고(2026-09-06 시점 2개 — 아직 부족), 쌓였으면 아래 "재측정"으로 After 열을 채운다. 안 쌓였으면 남은 후속 과제 3건 중 하나를 고른다.
---

# 개발 체감속도 — After 재측정과 후속 과제

## 왜

> "작업 중인 워크 트리가 있고 그건 큰 문제가 아니라면서? 실제 큰 문제를 분석해서 코딩 속도 최적화해줘 현재 작업 중인게 너무 많아"

모델을 바꾸지 않고, 추측이 아니라 실측으로 원인을 찾아 최소 변경으로 고친다.

## 지금 상태

- PR #1651 · #1654 **둘 다 머지됨**. 규칙(`CLAUDE.md` §검증·커밋, 원칙 13)·훅 임계·근거 문서까지 반영이 끝났다.
- 실측 근거 정본은 [docs/context/coding-principles.md](../context/coding-principles.md) §응답 지연 실측 (2026-09-06). **Before 수치는 전부 거기 있다 — 다시 재지 마라.**
- 워크트리 이동/정리 계획은 **측정으로 기각**됐다(Glob 12세션 2콜). 되살리지 마라.

## 남은 작업

- [ ] **After 재측정 1건.** 머지 이후 시작된 세션이 **3개 이상** 쌓여야 의미가 있다. 판정 기준: coding-principles.md 의 Before 표와 같은 4개 지표(총 지연 · `--watch` 대기 합계 · 사고 턴 평균 · 120~160k 구간 턴 평균)를 같은 방법으로 다시 내고, **셋 이상이 개선됐으면 성공**이다. 개선이 없으면 원인은 "규칙이 안 지켜졌다" 쪽을 먼저 본다(`git grep`·`sed -n` 콜 수를 세면 바로 나온다).
- [x] ~~`git diff` 63.8초~~ **2026-09-06 재검증으로 철회.** 미러는 원인이 아니고(전문 27,778줄 824ms) 꼬리는 **복합 명령의 대기**였다. 결론·수치는 [docs/context/coding-principles.md](../context/coding-principles.md) §재검증 — `git diff`. 🔴 **미러를 diff 에서 빼는 작업을 하지 마라.**
- [ ] **후속 과제 3건** (원칙 14 — 지난 작업 범위 밖이라 보고만 했다. 고칠지는 사용자가 정한다)
  - `build:cf` / `build:worker` 가 **로컬에서 exit 1** (`workers-og` 미해석). CI 에서만 통과한다.
  - `.claude.json` 에 이 레포 경로가 대소문자 중복(`d:/`·`D:/`)이고 둘 다 `hasTrustDialogAccepted` 미설정 → 프로젝트 `permissions.allow` 63개가 사문화. **속도 원인은 아니다**(권한 대기는 기각됐다).
  - 미머지 브랜치 48개 / 워크트리 26개 vs 열린 PR 3개. 관리 부채이지 속도 원인이 아니다.

## 정본 예시

- 실측 표와 기각 목록: [docs/context/coding-principles.md:71](../context/coding-principles.md#L71) 이하
- 임계와 그 근거 주석: [.claude/hooks/session-context-budget.mjs:38](../../.claude/hooks/session-context-budget.mjs#L38)

## 함정

- 🔴 **집계에서 현재 진단 세션을 빼라.** 안 빼면 측정 세션 자신의 긴 셸 호출이 결과를 오염시킨다.
- 🔴 **`isSidechain` 줄을 빼라.** 서브에이전트 usage 가 메인 컨텍스트로 잡힌다.
- 셸 명령을 묶을 때 `cd "<path>" &&` 프리픽스를 먼저 벗겨라. 안 벗기면 62%가 `cd` 버킷으로 몰린다.
- 훅 주석에 glob 을 쓸 때 블록 주석 종료 문자열이 들어가면 훅이 `SyntaxError` 로 죽는다. 지난번에 실제로 났고 훅 테스트가 잡았다 — **훅을 고치면 그 테스트를 먼저 돌려라.**

## 검증

```
node --test .claude/hooks/session-context-budget.test.mjs
npm run lint && npm run typecheck && npm run check:quick -- --skip-build
```

재측정 방법(4단계)은 coding-principles.md §응답 지연 실측 의 "재현:" 줄에 그대로 있다.

## 모르는 것

- 복합 명령의 긴 대기가 **승인 프롬프트인지는 미확증**이다(직접 증거는 "출력 486B · 50분 뒤 6콜 동시 반환"뿐). `.claude.json` 대소문자 중복(후속 과제)과 같은 축일 수 있다 — 확인하려면 승인 이벤트가 트랜스크립트에 남는지부터 봐야 한다.
- 규칙 변경(백그라운드 CI · Grep 툴 우선)이 실제로 지켜지는지는 After 측정 전에는 알 수 없다. 🔴 추측해서 "개선됐다"고 쓰지 마라.
