---
description: 머지 안 된 작업을 실측으로 분류해 한 갈래만 골라 이어받는다 (세션이 날아간 뒤 처음 돌리는 것)
---

# 미머지 작업 이어받기

세션이 날아갔거나 다른 사람이 하던 작업을 넘겨받을 때 쓴다.
🔴 **아래 순서를 지킨다. 특히 1번을 건너뛰면 낡은 로컬 상태로 오진한다.**

## 1. 원격 상태를 먼저 맞춘다

```bash
git fetch origin --prune
```

## 2. 실측으로 분류한다 — 기억이나 직관으로 판단하지 않는다

```bash
npm run worktree:unmerged
```

읽는 법:

- **`🔴 이어받을 것`** 만 후보다. `OPEN #N` 은 PR 이 열려 있는 것, `UNMERGED (PR 없음)` 은 커밋도 PR 도 없이 살아 있는 작업이다.
- **`LOCKED`** 는 다른 세션이 쓰는 중이다. **읽지도 고치지도 지우지도 않는다.** 잠금 사유의 pid 로 이 세션 것인지 구분한다.
- **`MERGED` / `LANDED`** 는 다 쓴 작업장이다. 정리는 사용자가 요청할 때만 한다.
- `~` 표시가 붙은 파일은 생성 산출물이다(캐시버스트 해시·sitemap 서명). 리베이스만 해도 바뀌므로 **작업이 남아 있다는 증거가 아니다.**

🔴 `gh 조회 실패` 가 찍혔으면 거기서 멈춘다. PR 축을 못 본 상태에서는 어떤 워크트리도 지우지 않는다.

## 3. 갈래별 인수인계 문서를 읽는다

```bash
ls docs/handoff/
grep -l "^status: active" docs/handoff/*.md | xargs grep -H "^next:"
```

`next:` 한 줄만 보고도 이어받을지 정해진다. 그게 이 규약의 목적이다(`npm run verify:handoff-contract` 가 강제).

## 4. 🔴 한 세션은 한 갈래만 잡는다

여러 갈래를 한 세션에 담으면 컨텍스트가 끊기고, 그러면 **지금 이 상황이 다시 반복된다.**
고른 갈래 하나만 정하고 격리된 작업장으로 들어간다:

- PR 이 이미 있는 갈래 → 그 워크트리로 들어간다 (`EnterWorktree` 에 `path` 를 준다)
- 새로 시작하는 갈래 → `EnterWorktree` 로 새 워크트리를 만든다

🔴 저장소 루트(`D:\Development\code-destiny`)에서 파일을 고치지 않는다. 여러 세션이 공유하는 디렉터리다.

## 5. 진행

- 리베이스 충돌이 셸·로더 JS 에서 무더기로 나면 대부분 캐시버스트 해시다 → `npm run resolve:cachebust`
- 🔴 GitHub 의 `mergeable=CONFLICTING` 은 착시일 수 있다. GitHub 은 `merge=cachebust` 드라이버를 돌리지 않는다. 조치는 **로컬 리베이스 + force-push** 다
- 고친 기능의 `verify:*` 를 먼저 돌린다. 전체 목록의 정본은 `npm run verify:guard-wiring` 출력이다
- CI 는 폴링도 블로킹도 하지 않는다 — `gh pr checks <번호> --watch --fail-fast` 를 `run_in_background: true` 로 한 콜

## 6. 끝내기

- 인수인계 문서의 `updated` 와 `next` 를 갱신한다. **끝났으면 `status: done`**
- 사용자 보고에 그 문서의 전체 경로를 적는다 — 안 적으면 다음 세션이 못 찾는다
- `/clear` 로 다음 갈래를 새 세션에서 시작한다
