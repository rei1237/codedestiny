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
- `npm run worktree:status`는 필요할 때 실행하는 읽기 전용 권고 진단이다. 활성 worktree 중첩은 PR 입장 차단 조건이 아니며, 후보 clean 상태·최신 main·`git merge-tree --write-tree`·GitHub 병합 가능 상태·필수 CI를 기준으로 판정한다.
- 승인된 범위는 반복 확인하지 않는다. 실제 과금·운영 행위의 별도 승인과 외부 게이트는 유지한다.
- 작업 종료 전 검증한 변경을 커밋·원격 푸시하고 PR 생성/갱신 및 최신 커밋 검사를 확인한다. 인수인계 문서는 이 전달 절차를 대체하지 않는다. 예외·완료 기준은 [전달 완료 필수 규칙](docs/context/delivery-and-ci.md#전달-완료-필수-규칙)을 따른다.
- 인수인계를 보고할 때는 문서 파일명만 담은 코드 블록·클릭 가능한 절대 경로·다른 세션에 복사할 재개 명령어 코드 블록을 함께 제시한다. 파일명을 줄이거나 설명형 링크 이름에 숨기지 않는다. 명령어에는 실제 작업 디렉터리, 문서 절대 경로, 브랜치/PR, 다음 행동을 채우고, 답변 전 세 항목의 누락을 확인한다.
- npm run check:fast -- --plan으로 계획 확인, npm run check:fast로 실행한다. 위험 변경은 자동 승격된다.
- 최종 보고: 수정 파일·의도·유지 정책·명령과 출력·남은 확인. 실행하지 않은 검사는 미검증.

Ignore snapshot, archive, and one-off audit paths unless the user explicitly asks for them: `.claude/worktrees/**`, `.codex-worktrees/**`, `.cleanup/**`, `reports/**`. 현재 편집하는 격리 워크트리는 제외하지 않는다.

PR 전 `npm run ci:preflight` 통과는 필수다. 실패하면 PR을 생성하지 않는다. 검증 증거를 확인하는 `npm run pr:create`를 사용한다. 안전 조건 충족 시 순차 merge하고, staging SHA·smoke 확인은 비동기 후속 감시로 예약한다. 세부 규칙은 [PR preflight와 순차 전달](docs/context/delivery-and-ci.md#pr-preflight와-순차-전달)을 따른다. 이 규칙은 기존 PR 생성만으로 전달 완료/다음 세션 머지 규칙보다 우선한다.

## 2026-09-10 상시 연속 머지 정책

커밋 기반 PR은 각 최신 HEAD의 필수 CI와 delivery:admit을 확인한 뒤 연속 머지한다. PR 사이에 스테이징 도달을 기다리지 않는다. main 변경으로 무효화된 후보 검증만 갱신한다. PR 생성 전 ci:preflight와 보호 규칙은 유지한다. delivery:batch-plan은 의존성 계획 도구이며 PR별 admission을 대체하지 않는다.

마지막 병합의 전체 SHA를 고정해 npm run delivery:verify-batch -- --sha=<40자리 SHA>를 후속 실행하고 staging smoke·noindex·핵심 화면을 검증한다. 실패하면 운영 승격만 중단하고 원인·재조정을 보고한다. 다음 작업·PR·머지는 이 후속 검증을 기다리지 않는다. 이미 진행 중인 배포는 취소하지 않고 아직 배포하지 않은 낡은 staging 실행은 최신 main에 양보한다. 운영 승격은 별도 1회 승인 때만 수행한다. 이전의 PR별 staging 대기 조항보다 이 정책이 우선한다.
