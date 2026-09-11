---
status: done
updated: 2026-09-08
next: "새 세션은 merge된 인수인계 문서를 지정해 npm run session:start를 통과한 뒤 작업한다"
---

# 세션별 PR과 안전한 적층

## 왜

- 완료한 변경이 다른 worktree에만 남아 staging에서 사라지는 일을 막는다.
- 다음 세션이 미머지 branch나 낡은 main을 기반으로 작업해 충돌·누락을 만드는 일을 막는다.

## 지금 상태

- `npm run session:start -- --handoff=...`는 linked worktree, clean 상태, 최신 `origin/main`, main에 merge된 인수인계 문서를 검사한다.
- `npm run session:close -- --handoff=... --pr=N`는 clean 상태, push 완료, Ready PR의 branch/SHA, 현재 PR에 포함된 인수인계 문서를 검사한다.
- 순차 통합은 기존 `npm run delivery:admit -- --pr=N`을 사용한다. 스테이징 도달은 머지 조건이 아니다(2026-09-12 개정, 머지는 사용자).

## 검증

```bash
npm run verify:handoff-contract
npm run session:start -- --help
npm run session:close -- --help
npm run check:fast -- --plan
npm run check:fast
```

## 모르는 것

- GitHub가 외부 세션 자체의 종료를 강제로 차단할 수는 없다. 저장소 안에서는 `session:close`와 문서 규칙을 표준 완료 조건으로 사용한다.
