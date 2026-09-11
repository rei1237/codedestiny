# AI 인수인계 규약

세션 간 인수인계는 주제별 문서 하나로 한다. 이 파일은 규약만 담고, 목록을 담지 않는다.

## 위치와 형식

- 경로: `docs/handoff/<주제>.md` — 주제 하나에 파일 하나.
- 형식 정본: `docs/handoff/_TEMPLATE.md` (프론트매터 `status` · `updated` · `next` 세 줄).
- `status` 는 `active` | `blocked` | `done`. 기계 검사: `npm run verify:handoff-contract` (`scripts/verify-handoff-contract.mjs`).

## 수명

- 작업이 끝나 `status: done` 이 되면 파일을 지운다. 내용은 git 히스토리에 남는다.
- 다른 문서에서 지운 핸드오프를 가리키던 링크는 "(완료 핸드오프, git 히스토리 참조)" 로 바꾼다.

## 찾기

```
git grep -l "^status: active" -- docs/handoff
```

## 두지 않는 것

- 전체 핸드오프를 모은 생성형 단일 색인. 병렬 PR 이 같은 파일을 고쳐 매번 충돌한다. 목록은 위 명령으로 그때그때 뽑는다.
