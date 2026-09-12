# Codex 진입점

Code Destiny는 한국어 운세·상담 서비스다. 한국어로 보고한다.

## 시작
1. 짧은 공통 정본 [CLAUDE.md](CLAUDE.md)를 읽는다.
2. 위치가 불명확하면 [ARCHITECTURE.md](ARCHITECTURE.md)의 해당 기능에서 시작한다.
3. 관련 심볼 → import → 호출부 순으로 추적한다. 전체 저장소 설명을 다시 만들지 않는다.
4. 해당 주제의 상세 문서만 읽고 결과는 변경 전까지 재사용한다.

## 적용 경계
- Claude 설정·훅·슬래시 명령은 Codex 집행 장치가 아니다. 이 파일은 지시문이며 실행 가능한 검사는 npm과 CI가 담당한다.
- 개발환경 검증에는 실 LLM·실결제·운영 DB·배포를 사용하지 않는다. mock에서 실제 연동으로 폴백하지 않는다.
- main 체크아웃에서 직접 편집한다. 기능·작업·임시 브랜치와 워크트리를 새로 만들지 않는다. 다른 세션의 미커밋 변경은 보존하고 커밋에 섞지 않는다.
- 작업 단위가 검증되면 즉시 커밋한다. 되돌려도 다른 기능이 흔들리지 않는 크기가 기준이며, 무관한 변경을 한 커밋에 섞지 않는다.
- `npm run worktree:status`는 남아 있는 과거 워크트리를 배수할 때만 쓰는 읽기 전용 진단이다. 새 작업의 진입·전달 판정에는 쓰지 않는다.
- Do not scan or read the entire repository unless explicitly required. Use git grep/rg/git ls-files to locate relevant files first.
- 승인된 범위는 반복 확인하지 않는다. 실제 과금·운영 행위의 별도 승인과 외부 게이트는 유지한다.
- 작업 종료 전 검증한 변경을 커밋하고 `git push origin main` 뒤 main CI 결과를 확인한다. 인수인계 문서는 이 전달 절차를 대체하지 않는다. 예외·완료 기준은 [전달 완료 필수 규칙](docs/context/delivery-and-ci.md#전달-완료-필수-규칙)을 따른다.
- 인수인계를 보고할 때는 문서 파일명만 담은 코드 블록·클릭 가능한 절대 경로·다른 세션에 복사할 재개 명령어 코드 블록을 함께 제시한다. 파일명을 줄이거나 설명형 링크 이름에 숨기지 않는다. 명령어에는 실제 작업 디렉터리, 문서 절대 경로, 마지막 커밋 SHA, 다음 행동을 채우고, 답변 전 세 항목의 누락을 확인한다.
- npm run check:fast -- --plan으로 계획 확인, npm run check:fast로 실행한다. 위험 변경은 자동 승격된다.
- 최종 보고: 수정 파일·의도·유지 정책·명령과 출력·남은 확인. 실행하지 않은 검사는 미검증.

Ignore snapshot, archive, and one-off audit paths unless the user explicitly asks for them: `.claude/worktrees/**`, `.codex-worktrees/**`, `.delivery-worktrees/**`, `.cleanup/**`, `reports/**`. 이 경로들은 레포 전체 사본이라 grep 결과를 오염시킨다.

로컬 전체 preflight는 폐기했다(2026-09-12). **유일한 공식 검증 게이트는 GitHub CI다.** 기본 흐름은 `main`에서 코드 수정 → 관련 targeted 검사(`npm run check:fast`) → commit → (안정 시점에) push → main CI 통과 확인이다. 브랜치도 PR도 만들지 않는다. push 전에 전체 lint/typecheck/test/build를 로컬에서 반복하지 않는다. 회귀가 나면 조건·try/catch·CSS 오버라이드를 덧대지 말고 되돌린다(미커밋은 `git reset --hard HEAD`, 나쁜 커밋은 그 커밋만). 스테이징 검증은 선택이다 — 조건과 명령은 [CLAUDE.md](CLAUDE.md)의 2026-09-12 전달 흐름 절, 세부 규칙은 [전달 흐름과 위험 영역 검증](docs/context/delivery-and-ci.md#전달-흐름과-위험-영역-검증)을 따른다.

Do not wait for or manually verify staging deployment after every push. Once CI passes, continue to the next task. Verify staging only when explicitly requested, when deployment infrastructure changed, or during a final release verification.
Do not poll staging URLs, deployment status, commit SHA, or freshness markers after routine pushes.
