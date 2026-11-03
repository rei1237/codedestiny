---
status: blocked
---
# 통합 운기 다이어리 인수인계

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\daily-home-20261104-040025`
- 기반: `origin/main`의 `bd6a07411a3ccead617ece5ad621e8143748d66f`을 병합한 `8ec998265`. 기존 구현 커밋 `2a96fc5d0`, `c27f330c3`, `376741e77`.
- 공개 홈 하단의 연이 진입점에서 `/diary/`로 들어간다. 다이어리 한 화면에서 기존 프로필 관리, 계정 공통 레벨·경험치, 꿀방울 출석, 퀘스트와 오늘 기록을 사용한다. 퀘스트와 오늘의 계획은 동일한 DiaryStoreProvider를 공유한다. 로그인 복귀는 `/diary/#daily-home-title`이다.
- 이미지 `public/images/home/yeoni-diary-garden-v1.webp`는 사용자가 지정한 `D:\CodeDestiny-Build\연이 프로필1.png`를 직접 참조해 만들었다. 제작 기록은 `docs/design/yeoni-diary-garden-art.md`에 있다.
- 정책: 기존 출석 API와 상품별 사용처를 그대로 사용하며 퀘스트 꿀방울을 신설하지 않는다. 다이어리 기록은 기존 기기 브라우저 저장소를 사용한다. 결제·인증·DB·API 계약은 변경하지 않았다.
- 검증: 사이트맵 1,058 URL 재생성 및 `npm run verify:sitemap-drift` 통과, ESLint·TypeScript 통과. 다이어리 저장·경로 테스트 26건, 기존 꿀방울 출석 mock 테스트 12건 통과. 실제 로컬 mock 화면에서 로그인 복귀, 5일째 5방울 지급과 출석 완료 상태, 퀘스트와 다이어리 계획 동기화를 확인했다. 360px 및 데스크톱 화면을 확인했다. 이전 검증에서 중복 출석 지급 방지도 확인했다. 임시 mock 서버 변경은 복원했다.
- 현재 main은 `C:\Users\user\Documents\Codex\worktrees\yeongnyangi-blue-passes-20261024-050530`에 체크아웃돼 있으며 다른 세션의 미커밋 변경 8개가 있다. 다른 세션의 파일을 이동·수정·삭제하지 않는다. 확인 시 원격 main `bd6a07411`의 CI에서 Critical checks와 AI locale pipeline invariants가 실패했다: https://github.com/rei1237/codedestiny/actions/runs/41714543536/job/126191664387 , https://github.com/rei1237/codedestiny/actions/runs/41714543461/job/126191000923 .
- 남은 일: 다른 세션의 변경이 안전하게 정리되고 원격 main CI가 복구되면 최신 main과 충돌 여부를 확인하고 이 작업을 main에 병합한다. 커밋된 트리에서 `npm run check:pre-push` 후 정상일 때만 `git push origin main`, 이후 main CI 확인. 완료 시 이 문서를 `status: done`으로 닫고 전용 워크트리를 정리한다. 운영 승격은 하지 않는다.
- 추가 확인: 프로필 조회 유틸은 서버 오류와 빈 목록을 모두 null로 반환한다. 화면은 이를 빈 카드라고 단정하지 않고 카드 확인을 안내한다. 공용 계약을 확장하면 두 상태를 더 명확히 구분할 수 있다.
