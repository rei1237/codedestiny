---
status: blocked
updated: 2026-11-05
next: 이 문서는 과거 경과 기록이다. 이어받을 일은 daily-home-claude-20261105.md를 따른다
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

## 2026-11-04 추가 진행
- 원격 main `5f4fff87f2f791248ecf93768001932c69c94392`의 필수 CI 통과를 확인했고, 이를 전용 작업 트리에 병합한 커밋은 `2192c8a5eaa5119bd8e9af83a1cb3d3b8c2692f5`다. 다른 세션의 main 작업 공간은 건드리지 않았다.
- `npm run check:fast -- --plan --base=5f4fff87f2f791248ecf93768001932c69c94392`, `npm run check:fast -- --base=5f4fff87f2f791248ecf93768001932c69c94392`, `npm run check:pre-push` 통과. 사이트맵 검증은 1,059개 URL 일치.
- main 작업 공간의 다른 세션 미커밋 파일 8개 중 5개가 최신 main 변경과 겹쳐 안전한 main 갱신이 차단된다. main 병합, push, 배포는 아직 하지 않았다. 해당 세션이 변경을 안전하게 정리한 뒤 최신 main과 CI를 다시 확인하고 남은 전달 절차를 진행한다.

## 2026-11-04 게임형 카드 구현 재개
- 사용자 승인 초안을 기준으로 연이 캐릭터, 계정 공통 레벨·경험치, 출석·꿀방울, 오늘의 실천과 기존 한 줄 기록을 한 카드로 묶었다. 원본 시트를 직접 참조한 투명 WebP `public/images/home/yeoni-diary-companion-v1.webp`를 사용한다. 구현 커밋: `d7856f90b`.
- 기존 출석 API, RPG 경험치와 DiaryStoreProvider의 저장 쓰기 경로를 그대로 사용한다. 퀘스트에 꿀방울을 지급하지 않는다. 출석·결제·인증·DB 정책은 바꾸지 않았다.
- mock 화면에서 5일째 5방울 지급, 중복 출석 비활성화, 퀘스트·오늘의 계획 연동과 한 줄 기록의 새로고침 후 유지를 확인했다. 360·390·430px 화면과 데스크톱 화면을 살폈다. 다이어리 저장·경로 26건, 출석 원장 12건, `npm run check:fast -- --base=5f4fff87f2f791248ecf93768001932c69c94392`, `npm run check:pre-push` 통과. mock 서버 임시 변경은 원복했다.
- 현재 main 작업 공간에 다른 세션 미커밋 8개가 남아 있고 원격 main `31776bc83` CI는 확인 시 진행 중이다. main 병합·push·배포는 아직 하지 않았다. 다른 세션 작업을 건드리지 않고 작업이 정리되면 최신 main 및 CI와 staging 배포를 확인해 안전하게 병합하고 검증·배포한다.

## 2026-11-04 카드 길이 단축
- 구현 커밋 `c0615473d`: 연이·레벨을 유지하면서 출석·실천·기록을 카드 안에서 메뉴 또는 가로 스와이프로 전환한다. 기존 흐름·기분·계획은 기본 접힘으로 유지한다. 이전 기록 해시 링크는 기록 패널을 연다.
- `npm run check:fast -- --plan`, `npm run check:fast`, `npm run check:pre-push` 통과. 390px mock 화면에서 메뉴 전환, 기록 입력 후 전환 시 보존, 상세 기능 펼치기를 확인했다. 실제 터치 기기의 스와이프와 기록 해시 링크는 브라우저 연결 제한으로 미검증이다.
- 확인 시 원격 main `74a9339b7b9ef884d0cf46faa49edcc9306da858`의 CI는 성공했으나 다른 세션의 main 작업 공간에 미커밋 변경 8개가 남아 있다. 해당 변경을 건드리지 않고 정리 후 최신 main CI·배포 상태와 터치 동작을 확인해 전달한다.

## 2026-11-04 대표 진입 화면 적용 및 이미지 최적화
- 구현 커밋 `f3ad4819e`: 공개 홈 `/` 하단에 기존 다이어리 저장소를 연결한 연이 프로필 카드를 직접 표시하고, 기존 연이·영냥이 진입 및 SEO 콘텐츠를 유지한다. 홈 로그인 복귀는 `/#daily-home-title`, 카드의 기록에서 기존 `/diary/`로 이어진다.
- 기존 `honey-drop-jewel-v1.webp`를 96px WebP `honey-drop-jewel-96-v1.webp`로 축소해 10,254B에서 3,014B로 줄였고 카드에 사용한다. 새 보상·결제·인증·DB 정책은 없다.
- 모바일 mock 홈에서 출석 5일째 5방울, 퀘스트 완료 및 홈 기록과 다이어리 기록 일치를 확인했다. 스와이프 판정 3건과 다이어리·홈 경로 총 33건, 홈 SEO·진입 22건 통과. `npm run check:fast -- --plan`, `npm run check:fast` 전체 통과(Jest 445스위트 7,282건), `npm run check:pre-push` 통과. 사이트맵 1,059개 일치. 실제 단말기는 연결되지 않았으며 사용자가 이번에는 모바일 브라우저 검증으로 진행하도록 선택했다. 브라우저 버튼 전환은 확인했고 실제 터치 스와이프는 미검증이다. mock 파일은 원복했다.
- 원격 main `5aa052f5c8b122e7af25bc213485d6f90fee4704`의 CI는 통과했으나 다른 세션 main 작업 공간에 미커밋 8개가 남아 있다. main 병합·push·배포는 하지 않았다. 해당 작업을 건드리지 않고 정리될 때 최신 main 및 CI·배포 상태를 확인한 뒤 안전하게 전달한다.
