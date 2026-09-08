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
- 수정 시작 시 워크트리를 자동 생성한다. main·공유 체크아웃에서 편집하지 않는다. 기존 미커밋 변경은 보존한다.
- PR 머지와 스테이징 SHA·정상 응답 확인 후 이 작업의 clean 워크트리만 제거한다. 미커밋 파일이 있으면 보존하고 보고한다.
- 수정 전 `npm run worktree:status`로 다른 작업의 파일 중첩을 확인하고, 겹치는 공통 파일은 순서대로 통합한다.
- 승인된 범위는 반복 확인하지 않는다. 실제 과금·운영 행위의 별도 승인과 외부 게이트는 유지한다.
- 작업 종료 전 검증한 변경을 커밋·원격 푸시하고 PR 생성/갱신 및 최신 커밋 검사를 확인한다. 인수인계 문서는 이 전달 절차를 대체하지 않는다. 예외·완료 기준은 [전달 완료 필수 규칙](docs/context/delivery-and-ci.md#전달-완료-필수-규칙)을 따른다.
- npm run check:fast -- --plan으로 계획 확인, npm run check:fast로 실행한다. 위험 변경은 자동 승격된다.
- 최종 보고: 수정 파일·의도·유지 정책·명령과 출력·남은 확인. 실행하지 않은 검사는 미검증.

Ignore snapshot, archive, and one-off audit paths unless the user explicitly asks for them: `.claude/worktrees/**`, `.codex-worktrees/**`, `.cleanup/**`, `reports/**`. 현재 편집하는 격리 워크트리는 제외하지 않는다.
