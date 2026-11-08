---
status: in-progress
updated: 2026-11-09
next: 사이트맵 드리프트를 생성기로 수정·커밋한 뒤 check:pre-push 및 check:fast 전체를 완료한다.
---

# 고가 운세 개선 main 전달

## 첫 행동

이 문서와 `docs/verification/premium-generation-repair-2026-11-09.md`를 읽고 작업 디렉터리의 git 상태 및 실행 중인 검사 로그를 확인한다. 같은 검사를 중복 시작하지 않는다.

## 지금 상태

- 작업 디렉터리: `D:\Development\codedestiny-worktrees\premium-main-delivery-20261109-015412`
- 브랜치: `wt/premium-main-delivery-20261109-015412`
- 기준 main: `87c6e54dd0ed74b333c6b6f38a7e668371008dd5`
- 통합 대상: `feat/premium-llm-chapter-upgrade`의 `b52216502`. `git merge --no-commit --no-ff`로 충돌 없이 통합한 상태에서 시작했다.
- 통합·미러 갱신 커밋: `158f29e26` (원격 push 전).
- 이전 집중·회귀 검사 790개 통과. 이번에는 통합된 트리에서 종합 검사를 완료한다.
- `node_modules`는 공유 정션이다. 제거 시 정션만 먼저 해제한다. 다른 체크아웃은 정리하지 않는다.
- 공유 Next는 15.5.15, 현재 package.json은 ^15.5.28이다. sync 종료 뒤 이 워크트리의 정션만 해제하고 `npm ci --no-audit --no-fund --prefer-offline`로 로컬 의존성을 설치한다. 잠금 파일과 다른 세션의 공유 모듈은 수정하지 않는다.
- 로컬 `npm ci` 완료(1412 packages), Next 15.5.29. 공유 정션은 해제됐고 현재 node_modules는 이 워크트리의 실 디렉터리다. 잠금 파일 변경 없음.

## 승인 상태

2026-11-09 사용자 원문: "정적 미러 불일치도 수정하고 중단한 검사까지 끝까지 완료해서 main 통합하고 push까지 마무리해줘. 다른 작업의 변경은 보존해줘."

미러 수정·검사 실패 해결·통합·main push가 승인됐다. 실제 LLM 호출·실결제·운영 DB 쓰기·프로덕션 승격은 하지 않는다.

## 작업 규칙과 함정

- 기존 세 체크아웃을 수정·stash·reset·청소하지 않는다. 미커밋 변경은 통합 대상에 넣지 않는다.
- 원본 premium 워크트리에는 PDF·숙요·기존 인수인계 수정 4개가 있다. 시작 시 `git diff --binary | git hash-object --stdin` 값은 `9955293779ff3d66a16dd01a3b23d7189cd599ce`다.
- 루트 `D:\Development\code-destiny`는 `feat/world-cast-page`이며 다른 작업이 있다. 시작 diff hash `009f252801072ee385dd0fc77f0742e993ff42f1`.
- 로컬 main은 `C:\Users\user\Documents\Codex\worktrees\yeongnyangi-blue-passes-20261024-050530`에 체크아웃되어 있고 다른 미커밋 파일 8개가 있다. 시작 diff hash `67ca74bb09f584b2dea71cf4ef96e658fcca17f7`. main 체크아웃을 강제로 바꾸지 않는다. 검증된 격리 HEAD를 원격 main으로 fast-forward push한다.
- `check:fast`가 critical로 승격되면 시간이 걸려도 끝까지 실행한다. 로그는 이 워크트리 `.tmp/`에만 둔다. 실 공급자 요청은 mock 네트워크 가드로 차단한다.
- `check:pre-push`의 미러 검사는 커밋된 깨끗한 트리에서만 실행한다. 생성물은 소스 생성기로 만들고 직접 편집하지 않는다.
- main CI는 push 전/최종 보고 시 확인한다. 기존 main이 타 작업 때문에 실패하면 그 위에 push하지 않는다. push 뒤 CI를 반복 폴링하거나 staging을 감시하지 않는다.

## 설계

최신 원격 main에 진행 중인 premium 브랜치의 커밋된 작업만 병합한다. 충돌 시 양쪽 기능의 의도를 보존한다. `sync:public`로 미러를 재생성하고 실제 검사 실패 원인을 고친다. 정책·가격 변경 및 대규모 리팩터링은 범위 밖이다.

## 단계

- [x] 다른 작업의 상태와 보존 기준 기록
- [x] 최신 원격 main 기반 격리 워크트리 생성
- [x] premium 브랜치 커밋 병합, 충돌 없음
- [x] 정적 미러 16개 재생성 및 커밋, 미러 신선도 검사 통과
- [ ] check:fast 계획 확인 및 전체 실행, 실패 해결
- [ ] 커밋된 트리에서 check:pre-push 통과
- [ ] 최신 main을 확인하고 fast-forward push
- [ ] main CI 1회 확인, 보존 상태 확인
- [ ] 문서 done 및 자기 임시 워크트리 배수

## 검증 진행

- `npm run sync:public`: 통과. 로더 해시·로케일 셸 16개 갱신. 마케팅·이미지 상세 생성도 완료.
- `git diff --check 87c6e54dd...HEAD`: 통과. 기존 UI 헬퍼 마지막 빈 줄 1개를 정리했다.
- `npm run check:fast -- --base=87c6e54dd0ed74b333c6b6f38a7e668371008dd5 --committed-head --plan`: critical 전체 단계 확인. `.tmp/premium-check-plan.log`.
- 첫 `npm run check:pre-push`: 홈 레지스트리·미러 신선도는 통과. `verify:sitemap-drift`에서 수정일 원장 5개 드리프트 확인. `.tmp/premium-pre-push.log`. 사이트맵 URL 집합은 동일하다.
