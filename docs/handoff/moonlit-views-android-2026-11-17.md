---
status: in-progress
updated: 2026-11-17
next: 긴급 흑월 결제 전달 오류를 먼저 운영 배포(heukwol-delivery-hotfix-2026-11-17.md)한 뒤, 절의 차분한 대기 효과를 구현하고 Android 60 빌드·검증·Play 출시를 재개한다.
---

# 연화당 다각도 UI와 Android 출시 준비

## 첫 행동
`D:\Development\code-destiny`에서 이 문서와 `docs/design/moonlit-lotus-views.md`, `docs/design/moonlit-lotus-android-release-plan.md`를 읽고 현재 git 상태를 확인한다. 미완료 검증은 아래 상태에 따라 이어간다. 다른 사용자의 `.claude/skills/fire-your-seo-agency/`는 별도 저장소이므로 보존한다.

## 지금 상태
- **우선순위 변경**: 2026-11-17 흑월 결제 후 전달 오류 긴급 수정·운영 배포를 먼저 승인받았다. 상세는 `heukwol-delivery-hotfix-2026-11-17.md`. 절의 새 대기 효과는 아직 구현 전이다.
- 긴급 수정의 로컬 검사 동안 메모리를 확보하기 위해 자기 AVD `cd-temple-release60`임을 adb로 확인하고 emulator-5556을 정상 종료했다. 기기 데이터는 보존했으며 Android 검수 재개 시 이 AVD를 다시 시작한다.
- 사용자 추가 요청: “절 기능에서 가만히 있어도 지루하지 않도록 어느정도 몰입감있는 효과도 주도록하고 그 이후에 완벽하게 안드로이드 앱에 이식해서 새로운 버전으로 론칭해줘”. 차분한 달빛/물결/연꽃 움직임, reduced-motion·가볍게 보기·백그라운드 정지를 반영한 뒤 빌드한다.
- **격리 빌드 공간**: `D:\Development\codedestiny-worktrees\android-temple-release60-20261117-220709`, 브랜치 `wt/android-temple-release60-20261117-220709`, 기준 `2bbcccbd2514b76af9685172b546422a94ef181a`까지 main push 완료. node_modules는 정션, 모바일 이미지 캐시는 일반 복사본. 서명 속성 파일은 main과 하드링크이며 비밀값을 읽거나 변경하지 않는다.
- 기존 main 개발 서버 34052 때문에 루트 빌드는 중단했다. 격리 `.next`임을 확인하고 `ALLOW_DEV_SERVER_DURING_BUILD=1`로 워크트리 빌드를 진행했으나 새 몰입 효과 요청 시 Next 빌드 전에 자기 프로세스 PID 11540만 종료했다. 최종 효과 반영 후 새로 빌드해야 한다. 로그는 루트 `.tmp/android-temple-release/mobile-isolated.log`.
- **최신 검증**: CI 수정 커밋 `5ce2aac1b`. `check:fast` exit 0, Node 5,195/5,195, Jest 479 suites·8,012 tests 통과(기존 1 suite/test skipped), 타입/lint/계약/Worker dry-run 통과. 한국어·영어 4개 지역·일본어 ASO 모두 Console 임시보관함 저장 확인, 아직 심사 제출 안 함. 현재 ego p1은 기존 빈 내부 테스트 초안 17의 prepare 화면(다른 버전·문구 없음)이며 업로드 전이다.
- **출시 재개 (2026-11-17 저녁)**: `scripts/verify-sukuyo-reading-house.mjs`의 오래된 자동 펼침 기대를 기본 접힘·사용자 토글로 수정했다. `23ed6e79e`가 의도적으로 자동 펼침을 제거한 것이 원인이다. 수정 전 line 73 실패 재현, 수정 후 27숙요/25글/4화면 폭·콘솔 오류 0 통과. 출석 POST는 진입 시 0회/버튼 누르면 1회 검증을 추가했다. check:fast 전체 실행 중이며 Node 5,195개 통과, Jest 진행 중이다.
- Play Console 모든 번들 최대 코드 59 확인: 후보 60/1.0.60. 현재 프로덕션은 1.0.59이며 실제 국가 설정은 **19개국**이다(이전 8개국 기록 정정, 목록은 출시 계획). 한국어 ASO를 임시보관함에 저장했다. 영어 4개 로케일·일본어도 같은 초안으로 반영 중이며 아직 심사 제출하지 않았다. ego-browser taskSpace **56**, p1=스토어 기본 등록정보 수정. 작업 스크립트는 `.tmp/android-temple-release/round-*.mjs`.
- 별도 새 AVD `cd-temple-release60`, Android 16/API36, emulator-5556을 생성했다. PID 26784/27732, `-no-window -no-audio -no-snapshot-save`. 기존 cdtest(코드60)는 건드리지 않고 종료했다. 새 AVD는 비행기모드+Wi-Fi/data 비활성으로 운영 API를 차단했다. Play 서명 59.apk를 내려받아 새 AVD에 설치했으나 Play 라이선스 Activity가 Google Play 없는 기기에서 실행을 차단한다. 보호 설정은 변경하지 않았다. Play 59→60 업데이트 보존 검증은 미완료이며 새 로컬 서명 후보 QA로 진행한다. APK는 `.tmp/android-temple-release/play-59.apk`.
- `android-release-check.ps1 -RequireSigning` 통과. JDK21/SDK36/adb 확인. 실제 AAB/APK 빌드는 CI 수정 푸시 후 진행한다. 기존 시작 측정 스크립트는 mock 전용 `com.codedestiny.app.benchmark`만 허용한다(계획의 잘못된 명령 정정).

### 이전 구현 단계 기록
- main 직접 작업, 별도 워크트리 없음. 선행 입묘 완료 커밋은 `53216a36ea6558f2e594a28236145224ce42fd9e`.
- 자산 커밋: `88b2f03af7254bf6ed12bd0c7a330ece4966205d`, 아직 push하지 않았다. 실제 시점 그림 27개, 6.34MiB.
- UI 커밋 `f0128e649`, ASO·출시 계획 커밋 `37515015b2312ec0419163837920eb25375642f3`까지 로컬 구현을 완료했다. 아직 push하지 않았다.
- `npm run check:fast` 통과(exit 0): 타입/lint, Node 5,195/5,195, Jest 479 suites·8,012 tests 통과(기존 1 suite/test skipped), 계약 검사와 Worker dry-run. 새 시점 테스트 4개는 별도 재확인도 통과했다. 첫 실행의 새 테스트 변수명 module lint 오류는 loaded로 수정했다. 프런트 프로덕션 빌드는 공식 CI에 맡긴다.
- `npm run check:pre-push`와 `npm run verify:handoff-contract`도 통과했다. 원격 실패 커밋 위에 push하지 않는 규칙에 따라 코드·문서 커밋은 모두 로컬에 보존했다.
- 선행 main CI **실패**: https://github.com/rei1237/codedestiny/actions/runs/44064192958 . Static guards의 `scripts/verify-sukuyo-reading-house.mjs:73`에서 honeyDetails.open이 false였다. 타입/lint와 빌드는 성공. 연화당 변경 전 실패이며 이 위에 새 push를 쌓지 않는 저장소 규칙을 따른다. 숙요/프로필 구현은 이번에 수정하지 않았다.
- 스토어 현재 1.0.59 프로덕션 100%를 읽기 전용으로 확인했다. 이번 단계에서는 AAB/APK 빌드·스토어 변경·실출시를 수행하지 않았다.

## 승인 상태
2026-11-17 추가 승인: “선행 숙요·출석 CI 오류도 해결하고 main에 푸시한 뒤, 안드로이드 앱 빌드와 검증을 거쳐 스토어 출시까지 계속 진행해줘.” 아래의 이전 준비 단계 제한은 이 요청으로 확장됐다. CI 수정·main 푸시·서명 빌드·스토어 심사 제출과 출시를 다시 묻지 않는다. 실제 결제·유료 LLM·운영 DB 테스트 쓰기는 포함하지 않는다.

2026-11-17 사용자: “아 그 전에 절 달빛 연화당을 마치 3D처럼 둘러볼 수 있도록 여러 각도해서 볼 수 있도록 해주는 기능을 추가해주고 UI가 화면을 덮지 않도록하고 버튼이라든지 사용자 경험 최적화작업부터 진행 후 앱 빌드 계획을 세워줘”. 이어 “Please implement the plan.”
입묘 완료 뒤 진행, 여러 시점의 실제 일러스트, 기존 UI 유지·정리, 기존 8개국을 유지하기로 결정했다. 원래 Android 출시 요청은 있으나 최신 순서는 연화당 구현 후 앱 빌드 계획이다. 이미 승인한 구현을 다시 확인하지 않는다.

## 작업 규칙과 함정
- UI/테스트만 mock에서 검증. 결제·인증·API·DB·기존 구매 결과·private IndexedDB 계약은 변경하지 않는다. noindex 유지.
- CI는 다른 빌드·검증 작업을 진행하는 사이 의미 있는 단계에서 확인한다. 숙요·출석 실패는 사용자 추가 승인으로 수정 범위에 포함됐으며 별도 커밋으로 전달한다. 릴리스는 CI 통과 후 진행한다.
- 브라우저 검수 ego-browser taskSpace 54는 finish로 닫았다. CDP viewport 설정은 새 script마다 재적용해야 한다. 실제 UI 스크린샷은 temple_visual_review 에이전트가 검수했다.
- 기존 34052/34053 mock 서버는 11월15일부터 실행된 다른 프로세스이므로 중단하지 않았다. 이번 34062/34063 서버와 API(PID 38572/18356)는 명령줄과 부모 PID를 확인하고 종료했다. 재검수는 기존 mock runner로 새 환경을 시작한다.
- 정리 예외: `D:\Development\code-destiny\.tmp\moonlit-views`의 절대 경로, reparse point 0개, 이번 작업 파일 43개만 있음을 확인했으나 자동 승인 검토가 삭제를 두 번 차단했다(`blocked by policy`). 재귀 삭제와 더 좁은 파일 단위 삭제 모두 실행되지 않았다. 우회하지 않고 이 임시 폴더만 남겼다. 원본 image_gen 자산은 의도적으로 Codex generated_images에 유지한다.
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
