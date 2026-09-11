# Session Workflow

긴 Claude Code/Codex 작업은 한 세션에 모든 맥락을 쌓지 않는다. 작업 상태는 `docs/handoff/<주제 이름>.md`에 남기고, 새 세션은 **merge된 직전 PR의 인수인계 문서**와 최신 `origin/main`에서만 시작한다. 완료한 변경은 로컬 브랜치나 worktree에만 남겨두지 않고 반드시 PR로 인계한다.

## 작업 시작 시

```bash
git status
git branch --show-current
git fetch origin
git rev-list --left-right --count HEAD...origin/main
git diff --stat origin/main...HEAD
npm run session:start -- --handoff=docs/handoff/<주제>.md
```

- 루트 `CLAUDE.md`와 작업 축에 해당하는 `docs/context/*`를 먼저 읽는다.
- 직전 PR이 merge되었는지 확인한다. staging 도달은 선택이며 시작 조건이 아니다.
- 직전 PR에 포함된 `docs/handoff/*` 문서에서 `status: active|blocked`인 현재 작업을 확인한다.
- 새 작업 브랜치의 첫 SHA는 최신 `origin/main`과 같아야 한다. 이전 세션의 미머지 branch 위에 새 작업을 쌓지 않는다.
- 다른 세션의 변경이 있는 기본 체크아웃에서는 수정하지 않고 격리 worktree를 사용한다.

## 작업 중

- 5줄 이상 또는 고위험 변경 전에는 변경 단계와 검증 방법을 요약한다.
- 결제/권한/이용권/월정석/로그인/배포 코드는 최소 범위로 변경한다.
- LLM·결제·외부 API 검증은 mock/stub/fake만 사용한다.
- 불필요한 전체 리팩터링을 하지 않는다.
- 파일 삭제·리네임 전에는 소스, `__tests__/`, `scripts/verify-*`를 `git grep`으로 확인한다.
- Quick Pass(오타·UI 문구·CSS·정적 자산)는 경량 CI만 사용하고 스테이징 도달 감시 대상에서 제외한다.
- Staging 필수(DB 스키마·결제/인증 로직·주요 Worker 데이터 흐름)는 전체 CI와 스테이징 도달 감시를 유지한다.

## 세션 종료 전

```bash
git diff --stat
git diff --name-only
git diff --numstat
npm run handoff
npm run verify:handoff-contract
npm run check:fast -- --plan
npm run check:fast
# 변경을 논리 단위로 commit한 뒤
git push -u origin <branch>
gh pr create --base main --fill
npm run session:close -- --handoff=docs/handoff/<주제>.md --pr=<번호>
```

- 주요 diff를 파일별로 확인한다.
- 실행한 테스트 명령과 실제 결과를 기록한다.
- 남은 위험과 TODO를 우선순위로 적는다.
- `docs/handoff/<주제 이름>.md`를 업데이트하고 같은 PR에 포함한다. 완료 회고보다 현재 상태와 다음 행동을 우선한다.
- 검증 → commit → push → Ready PR → `session:close`까지 끝나기 전에는 세션을 완료로 표시하지 않는다.
- PR이 아직 merge되지 않았으면 다음 세션은 그 branch를 이어서 마무리할 수는 있지만, 별도 작업을 그 위에 쌓지 않는다.
- 다음 세션 시작 프롬프트에 실제 handoff 경로와 첫 TODO를 넣는다.
- production deploy, secret 변경, 실제 결제·환불·정산, 과금 LLM 호출은 사용자 승인 항목으로 분리한다.

## PR과 머지 운영

- PR에는 변경 범위, 검증 결과, 인수인계 경로를 남긴다. PR 없는 완료 세션은 허용하지 않는다.
- 다음 작업은 PR merge → 최신 `origin/main` 기반 새 worktree 순서로 시작한다. staging SHA 확인을 기다리지 않는다.
- 순차 통합은 `npm run delivery:admit -- --pr=<번호>` 통과를 확인하고 한 PR씩 진행한다. 머지는 사용자가 하며, staging SHA 확인 전에도 다음 PR의 admission을 확인할 수 있다.
- 같은 PR의 새 커밋은 이전 PR CI를 취소할 수 있지만, `merge_group`과 main 건강 검사는 취소하지 않는다.
- Merge Queue가 활성화되면 PR 브랜치를 반복해서 수동 rebase하지 않고 큐의 최신 main 합성 커밋을 검증한다.
- ruleset의 필수 체크는 내부 job이 아니라 안정된 aggregate 이름 `CI required` 하나를 사용한다.
