---
status: active
updated: 2026-09-08
next: "사용자 머지 후 별도 승인으로 required check를 CI required 하나로 전환하고, 조직 이전 여부를 별도 결정"
---

# CI, 스테이징 감시, 세션 인수인계

## 작업 목적

- main 변경 때마다 PR을 수동 갱신하는 부담을 Merge Queue + `merge_group` 검증으로 줄인다.
- 작은 문구·CSS 변경은 빠르게 처리하고, DB·결제·인증·주요 데이터 흐름만 스테이징 도달까지 감시한다.
- 긴 Claude Code/Codex 세션은 표준 handoff 문서로 이어받는다.
- 브랜치: `codex/ci-merge-queue-handoff`
- PR: `#1759` (`https://github.com/rei1237/codedestiny/pull/1759`)

## 현재 상태

- `pr-ci.yml`에 `pull_request`·`merge_group`·`push(main)` 트리거와 안정된 aggregate 체크 `CI required`를 추가했다.
- 같은 PR의 새 커밋만 이전 실행을 취소한다. merge group과 main 건강 검사는 취소하지 않는다.
- Landing Watchdog 앞에 scope job을 두었다. 오타·UI 문구·CSS·정적 자산은 장기 감시를 생략하고, DB 스키마·결제/인증·유료 접근·주요 Worker 라우트는 감시한다. 판정 오류는 감시 실행으로 닫는다.
- `docs/dev/SESSION_HANDOFF_TEMPLATE.md`, `docs/dev/SESSION_WORKFLOW.md`, `npm run handoff`를 추가했다.
- GitHub CLI는 `rei1237` 계정으로 재인증됐다. 토큰 값은 출력·저장하지 않았다.
- PR #1759의 기존 required checks, `paid-flow-gates`, 새 aggregate `CI required`가 모두 통과했다.
- 저장소가 개인 계정 소유라 GitHub의 현재 제공 조건상 Merge Queue를 바로 활성화할 수 없음을 확인했다. `merge_group`은 향후 조직 이전을 위한 준비다.
- GitHub ruleset, secret, production deploy는 변경하거나 실행하지 않았다.

## 검증 결과

```text
git diff --check                                      PASS
node scripts/lib/change-risk.mjs --self-test          PASS (68 cases)
npm run verify:worker-single-deploy                   PASS
npm run verify:merge-landed-test                      PASS (92 cases)
npm run verify:handoff-contract                       PASS (110 docs)
npm run verify:guard-wiring                           PASS (307 verify scripts)
npm run verify:doc-freshness                          PASS
npm run lint                                          PASS (기존 warning만 존재)
npm run typecheck                                     PASS
npm run check:quick -- --skip-build                   PASS
  node tests                                           875 PASS
  Jest                                                 217 suites / 2,402 tests PASS
  Worker dry-run bundle                                PASS
```

Worker dry-run 중 로컬 Wrangler 로그 디렉터리 생성에 `EPERM` 경고가 있었지만 번들은 완료됐고 전체 명령은 exit 0이었다. 실제 배포는 없었다.

## 다음 세션에서 바로 할 일

1. 사용자가 PR #1759를 검토하고 머지한다. 에이전트는 별도 요청 없이 머지하지 않는다.
2. 머지된 뒤, 사용자 승인을 받아 main ruleset required check를 `CI required` 하나로 전환한다. strict up-to-date는 비활성 상태를 유지한다.
3. Merge Queue가 필요하면 저장소의 조직 이전을 별도 검토한다. 이전·Queue 활성화 모두 사용자 승인 전에는 실행하지 않는다.

## 주의사항

- 모든 main 머지는 계속 스테이징에 배포된다. 이번 변경은 **장기 도달 감시 범위만** 줄인다.
- 결제·인증·DB·유료 접근 판정은 보수적으로 유지하고, 분류 실패는 Quick Pass로 낮추지 않는다.
- required check를 먼저 `CI required`로 바꾸면 아직 main에 없는 워크플로를 기다리므로 머지가 막힐 수 있다. 반드시 이 PR 머지 후 전환한다.
- 개인 계정 소유 상태에서 Merge Queue 활성화를 전제로 후속 작업하지 않는다. 조직 이전은 URL·권한·연동 영향 검토가 필요한 별도 변경이다.
- 실제 LLM·결제·외부 API 테스트, secret 변경, production deploy는 사용자 승인 전 금지다.

## 다음 세션 시작 프롬프트

```text
docs/handoff/ci-merge-queue-session-workflow-2026-09-08.md와 docs/dev/SESSION_WORKFLOW.md를 먼저 읽어줘. git status와 origin/main 차이를 확인한 뒤, 인수인계 문서의 “다음 세션에서 바로 할 일” 1번부터 진행해줘. main 직접 push, 실제 LLM·결제 호출, secret 변경, 승인 없는 production deploy는 하지 마.
```
