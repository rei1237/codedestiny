---
status: blocked
---
# 매일 돌아오는 홈 인수인계

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\daily-home-20261104-040025`
- 구현 커밋: `2a96fc5d0645ff714a838ee63979f5886430f931`, `c27f330c3`, `376741e77` (push 전). 이전 인수인계 커밋 `fd69555da`.
- 공개 홈에 연이 일러스트, 프로필 카드 관리, 계정 공통 레벨·경험치, 기존 꿀방울 출석과 서버 상품별 사용처, 기기별 다이어리 퀘스트를 추가했다. 퀘스트 꿀방울은 지급하지 않으며 로그인 시 기존 RPG 서버 규칙에 따라 경험치를 적립한다. 로그인 복귀는 `/#daily-home-title`이다.
- 검증: 최종 ESLint·typecheck 통과. 사이트맵 1,058 URL 재생성 후 `npm run verify:sitemap-drift` 통과. `npm run check:pre-push` 통과(c27f330c3 기준; 후속 변경은 안내 문구와 원장). `npm run smoke:core`는 Jest 115건과 Node 47건 통과. 출석 원장 mock 12건과 다이어리 저장 왕복 22건 통과. 360·390·430px 및 데스크톱 화면, mock 로그인 복귀·5일째 5방울 지급·중복 0방울·퀘스트와 다이어리 동기화 확인. 개발 서버 mock 임시 변경은 복원했다.
- `npm run check:fast -- --base=9cd5aff9226a5c507f04f5a311514f83a998fe40`는 권한 재실행 후 기존 영냥이 `saju_mackerel:legacy` 준비 요청 불변성 검사 실패로 중단됐다. 같은 커밋의 원격 CI `Static guards`와 `CI required`도 동일하게 실패했다: https://github.com/rei1237/codedestiny/actions/runs/41676210944/job/126063823701 . 실패 기준을 임의로 갱신하지 않는다.
- main은 `C:\Users\user\Documents\Codex\worktrees\yeongnyangi-blue-passes-20261024-050530`에서 체크아웃 중이며 다른 세션의 미커밋 8개가 남아 있다. 그중 5개는 기존 main과 원격 main 사이의 변경과 겹친다. 다른 세션의 파일을 이동·수정·삭제하지 않는다. 원격 main은 확인 시 `9cd5aff9226a5c507f04f5a311514f83a998fe40`이었다.
- 남은 일: 다른 세션의 변경이 안전하게 정리되고 원격 main CI가 복구되면 최신 main을 확인한다. 이 작업을 안전하게 병합한 뒤 변경 기준 `npm run check:fast`와 커밋된 트리의 `npm run check:pre-push`를 실행하고, 정상일 때만 `git push origin main` 후 main CI를 확인한다. 완료 시 이 문서를 `status: done`으로 닫고 전용 워크트리를 정리한다. 운영 승격은 별도 요청 없이 하지 않는다.
- 추가 확인: 프로필 조회 유틸은 서버 오류와 빈 목록을 모두 null로 반환한다. 홈은 이를 빈 카드라고 단정하지 않고 카드 확인을 안내한다. 추후 공용 계약을 확장하면 두 상태를 더 명확히 구분할 수 있다. 새로운 정책·보상은 만들지 않는다.
- 재개: `Set-Location -LiteralPath 'D:\Development\code-destiny\.codex-worktrees\daily-home-20261104-040025'` 후 이 문서를 읽고 `git status --short`와 `git log -1`을 확인한다.
