---
status: in-progress
updated: 2026-11-17
next: 선행 main CI의 숙요/출석 검사 실패를 해결한 뒤 연화당 커밋들을 main으로 푸시하고 해당 CI 결과를 한 번 확인한다.
---

# 연화당 다각도 UI와 Android 출시 준비

## 첫 행동
`D:\Development\code-destiny`에서 이 문서와 `docs/design/moonlit-lotus-views.md`, `docs/design/moonlit-lotus-android-release-plan.md`를 읽고 현재 git 상태를 확인한다. 미완료 검증은 아래 상태에 따라 이어간다. 다른 사용자의 `.claude/skills/fire-your-seo-agency/`는 별도 저장소이므로 보존한다.

## 지금 상태
- main 직접 작업, 별도 워크트리 없음. 선행 입묘 완료 커밋은 `53216a36ea6558f2e594a28236145224ce42fd9e`.
- 자산 커밋: `88b2f03af7254bf6ed12bd0c7a330ece4966205d`, 아직 push하지 않았다. 실제 시점 그림 27개, 6.34MiB.
- UI 커밋 `f0128e649`, ASO·출시 계획 커밋 `37515015b2312ec0419163837920eb25375642f3`까지 로컬 구현을 완료했다. 아직 push하지 않았다.
- `npm run check:fast` 통과(exit 0): 타입/lint, Node 5,195/5,195, Jest 479 suites·8,012 tests 통과(기존 1 suite/test skipped), 계약 검사와 Worker dry-run. 새 시점 테스트 4개는 별도 재확인도 통과했다. 첫 실행의 새 테스트 변수명 module lint 오류는 loaded로 수정했다. 프런트 프로덕션 빌드는 공식 CI에 맡긴다.
- 선행 main CI **실패**: https://github.com/rei1237/codedestiny/actions/runs/44064192958 . Static guards의 `scripts/verify-sukuyo-reading-house.mjs:73`에서 honeyDetails.open이 false였다. 타입/lint와 빌드는 성공. 연화당 변경 전 실패이며 이 위에 새 push를 쌓지 않는 저장소 규칙을 따른다. 숙요/프로필 구현은 이번에 수정하지 않았다.
- 스토어 현재 1.0.59 프로덕션 100%를 읽기 전용으로 확인했다. 이번 단계에서는 AAB/APK 빌드·스토어 변경·실출시를 수행하지 않았다.

## 승인 상태
2026-11-17 사용자: “아 그 전에 절 달빛 연화당을 마치 3D처럼 둘러볼 수 있도록 여러 각도해서 볼 수 있도록 해주는 기능을 추가해주고 UI가 화면을 덮지 않도록하고 버튼이라든지 사용자 경험 최적화작업부터 진행 후 앱 빌드 계획을 세워줘”. 이어 “Please implement the plan.”
입묘 완료 뒤 진행, 여러 시점의 실제 일러스트, 기존 UI 유지·정리, 기존 8개국을 유지하기로 결정했다. 원래 Android 출시 요청은 있으나 최신 순서는 연화당 구현 후 앱 빌드 계획이다. 이미 승인한 구현을 다시 확인하지 않는다.

## 작업 규칙과 함정
- UI/테스트만 mock에서 검증. 결제·인증·API·DB·기존 구매 결과·private IndexedDB 계약은 변경하지 않는다. noindex 유지.
- 공식 CI를 기다리거나 반복 폴링하지 않는다. 이전 main의 빨간 CI 때문에 원격 전달은 별도 차단이다. 무관한 숙요/프로필 오류를 연화당 수정에 섞지 않는다.
- 브라우저 검수 ego-browser taskSpace 54는 finish로 닫았다. CDP viewport 설정은 새 script마다 재적용해야 한다. 실제 UI 스크린샷은 temple_visual_review 에이전트가 검수했다.
- 기존 34052/34053 mock 서버는 11월15일부터 실행된 다른 프로세스이므로 중단하지 않았다. 이번 34062/34063 서버와 API(PID 38572/18356)는 명령줄과 부모 PID를 확인하고 종료했다. `.tmp/moonlit-views` 스크래치는 완료 시 제거한다. 재검수는 기존 mock runner로 새 환경을 시작한다.
- 전역 `[tabindex]:not([tabindex=-1])`의 touch-action manipulation이 새 viewport보다 우선해 스와이프를 취소했다. 기존 viewport 선택자를 높여 해결했다. body pinch 허용은 `body:has(.page)`로 연화당에만 한정했다.
- 개발 결제 테스터·Next N 표시가 하단 버튼을 가리는 것은 개발 환경 표시다. 검증 시 이 표시만 숨겼고 서비스 UI는 숨기지 않았다. 실제 스토어 캡처는 release APK에서 다시 만든다.
- image_gen 원본은 사용자 Codex generated_images 폴더에 남겼다. 프로젝트 최종 WebP·해시·정규화 지시 manifest가 정본이다. 원본을 삭제하지 않는다.

## 설계
3장소 × 5시점. 모바일 세로/가로 별도 자산, 다음 이미지 decode 완료 후 교체, 실패 시 현재 그림 유지. 캐릭터 Canvas와 참배 상태는 시점 변경으로 remount하지 않는다. view는 replaceState, 장소/활동은 기존 pushState. 풍경·시점·패널·하단 주요 활동은 별도 grid 영역. 108배 count와 start/pause 및 기도 저장은 패널 scroll 밖이다. 사진·꾸미기·기록은 지연 로드한다.

## 단계
- [x] 입묘 완료 확인
- [x] 그림 27개 제작·압축·규격 검증·커밋
- [x] 다각도/그리드 UI와 주요 행동 배치
- [x] 모바일·desktop·가로 화면 시각 검수
- [x] 실패 decode/경쟁 요청/Canvas 보존 단위 검증, 브라우저 시점 왕복·참배·음악·사진 검증
- [x] 스토어 초안과 Android 출시 상세 계획
- [x] 로컬 check:fast 최종 통과·자산/UI/출시 계획 별도 커밋
- [ ] 선행 main CI 실패 해소 후 pre-push와 push 및 CI 1회 확인
- [ ] 실제 Android 확대/IME/edge-to-edge/시작 성능·장시간 메모리·업데이트 보존 검증, AAB 빌드·심사·출시 (후속 릴리스 단계)
