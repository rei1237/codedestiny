# Session Workflow

긴 Claude Code/Codex 작업은 한 세션에 모든 맥락을 쌓지 않는다. 작업 상태는 `docs/handoff/<주제 이름>.md`에 남기고, 새 세션은 그 문서와 최신 `origin/main`에서만 시작한다. 완료한 변경은 로컬에만 남겨두지 않고 반드시 커밋·push로 인계한다.

**2026-09-12부터 브랜치와 PR을 만들지 않는다.** 모든 작업은 `main` 체크아웃에서 직접 한다. 안전장치는 격리가 아니라 작은 커밋과 빠른 롤백이다.

## 작업 시작 시

```bash
git branch --show-current   # main 이어야 한다
git status                  # clean 이어야 한다
git pull --ff-only
```

- 루트 `CLAUDE.md`와 작업 축에 해당하는 `docs/context/*`를 먼저 읽는다.
- main이 아니면 브랜치를 새로 만들지 말고 안전하게 main으로 돌아온 뒤 시작한다.
- `docs/handoff/*` 문서에서 `status: active|blocked`인 현재 작업을 확인한다.
- 미커밋 변경이 남아 있으면 내 것인지 먼저 판별한다. 다른 세션의 것이면 보존하고 커밋에 섞지 않는다.

## 작업 중

- 5줄 이상 또는 고위험 변경 전에는 변경 단계와 검증 방법을 요약한다.
- 결제/권한/이용권/월정석/로그인/배포 코드는 최소 범위로 변경한다.
- LLM·결제·외부 API 검증은 mock/stub/fake만 사용한다.
- 불필요한 전체 리팩터링을 하지 않는다.
- 파일 삭제·리네임 전에는 소스, `__tests__/`, `scripts/verify-*`를 `git grep`으로 확인한다.
- 작업을 독립적으로 검증 가능한 단위로 쪼갠다. 하나가 동작하면 **바로 커밋한다.** 되돌려도 다른 기능이 흔들리지 않는 크기가 기준이다.
- 무관한 변경을 한 커밋에 섞지 않는다. 커밋 시점의 main은 항상 실행 가능해야 한다.
- 회귀가 나면 조건·try/catch·CSS 오버라이드를 덧대지 않는다. 미커밋은 `git reset --hard HEAD`, 나쁜 커밋은 그 커밋만 되돌린다. 이미 커밋된 다른 정상 작업까지 날리지 않는다.
- 되돌린 뒤에는 같은 구조로 재시도하지 않는다. 실패 원인·회귀 영역·새 접근을 보고한 다음 다르게 구현한다.

## 세션 종료 전

```bash
git status
git diff --stat
npm run check:fast -- --plan
npm run check:fast
npm run handoff
npm run verify:handoff-contract
# 검증한 변경만 논리 단위로 commit한 뒤
git push origin main
```

- `git add .` 전에 `git status`와 `git diff --stat`을 반드시 본다. `.env`·secret·API key·credential·개인 설정·로그·임시 파일·빌드 산출물·대형 파일은 제외한다.
- 주요 diff를 파일별로 확인한다.
- 실행한 테스트 명령과 실제 결과를 기록한다.
- 남은 위험과 TODO를 우선순위로 적는다.
- `docs/handoff/<주제 이름>.md`를 업데이트하고 같은 push에 포함한다. 완료 회고보다 현재 상태와 다음 행동을 우선한다.
- 검증 → commit → push → 인수인계까지 끝나기 전에는 세션을 완료로 표시하지 않는다.
- 다음 세션 시작 프롬프트에 실제 handoff 경로와 첫 TODO를 넣는다.
- production deploy, secret 변경, 실제 결제·환불·정산, 과금 LLM 호출은 사용자 승인 항목으로 분리한다.

## push와 CI 운영

- 커밋은 복구 지점, push는 원격 백업 겸 배포 지점이다. 로컬 마이크로 커밋은 자주, push는 작업 단위가 안정됐을 때 묶어서 한다.
- push 1회 → CI 1라운드가 목표다. 같은 코드에 CI를 두 번 돌리지 않는다.
- ruleset `main-protection`의 필수 체크는 내부 job이 아니라 안정된 aggregate 이름 `CI required` 하나를 사용한다.
- ruleset은 `deletion`·`non_fast_forward`를 유지한다. main이 유일한 복구 지점이므로 브랜치 삭제와 force-push 차단이 더 중요하다. 롤백은 `git revert`로 하며 force-push가 필요 없다.
- 스테이징은 main push마다 비동기로 배포된다. 배포 도달을 매번 기다리지 않는다.
