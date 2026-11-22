---
status: in-progress
updated: 2026-11-23
next: 최신 main CI 상태와 커밋된 후보의 pre-push를 확인한 뒤 이번 커밋만 main에 푸시한다.
---

# Android 내부 테스트 — 결제 후 상담 복귀와 달빛 예화

## 첫 행동

이 워크트리에서 `git -c core.fsmonitor=false status -sb`, `git log -4 --oneline`을 실행한다. 최신 origin/main과 후보를 대조한다. 공유 main에는 다른 세션의 작업이 있으므로 함께 푸시하지 않는다.

## 지금 상태

- 워크트리 `D:/Development/code-destiny/.tmp/play-result-work/play-result-resume-20261123-063108`
- 브랜치 `wt/play-result-resume-20261123-063108`
- 기준 main `6e951894a6aa7751933314ed796bc12f6b8aff86` (다른 세션도 푸시 중이다. 새 main에 반영할 때도 생성된 사이트맵 원장은 원격판을 바탕으로 실제 소스에서 생성한다.)
- 결제 `26eee6ffdf`, UI `c50e9337d5`. 이번 인수인계 커밋은 `git log -1 --format=%H -- docs/handoff/android-play-result-resume-2026-11-23.md`로 확인한다.
- Google Play Console 내부 테스트에서 현행 출시 1.0.62를 확인했다. Ego Lite 공간 9의 p1이 열려 있다. 다음 AAB 후보는 1.0.63이며 업로드 전에 버전 코드 사용 여부와 타깃 트랙을 다시 확인한다.
- 이전 버전, QA62PAY 사건 및 기존 영수증 복구 증거는 `D:/Development/codedestiny-worktrees/android-internal-play-20261122-080050/docs/handoff/android-play-internal-2026-11-22.md`에 있다. 해당 주문은 수동 복구 후 1.0.62를 종료하고 다시 열어 보관함에서 확인했다. 새 버전 검증과 구분한다.

## 승인 상태

- 2026-11-23 사용자 요청 “결제 직후 실패 안내가 뜨고 상담 결과로 안 넘어가는 버그도 수정해줘. CI 통과 후 새 AAB를 구글 플레이 내부 테스트에 올려서, 테스트 결제 한 번으로 모의 상담 결과가 자동으로 열리고 앱 재실행 후 보관함에서도 다시 볼 수 있는지 확인해줘.”
- 스테이징 연결, 내부 테스트, 스테이징 전용 Play 계정 설정은 사용자가 앞서 승인했다. 테스트 기기 USB 연결과 디버깅 승인 이력이 있으며 이번 턴에도 ADB 상태 `device`를 확인했다. Play에서 테스트 결제 수단과 청구되지 않는다는 안내가 보일 때만 구매를 한 번 승인한다. 실제 청구, 실 LLM, 운영 DB 쓰기, 프로덕션 출시를 수행하지 않는다.

## 작업 규칙과 함정

- `check:fast -- --plan`은 critical로 판정했다. `check:fast`의 최초 실행은 78개 결제 검사 중 76개 통과 후 2개 실패로 멈췄다. `verify:llm-generation-resilience`에서 임의 localhost 포트 EACCES가 확인됐고 폴백 비교 워크트리 생성도 샌드박스에서 막혔다. `verify:analysis-basis-contract`의 정밀 재확인이 필요하다. 직접 재실행 결과를 확인한 후 판단한다.
- 대기 중인 다른 세션 main CI는 동일 SHA의 run과 필수 체크를 확인한다. 확인된 실패가 현재 base에 있으면 실패 작업과 원인을 조사한다. 사용자가 새 후보 CI 통과를 업로드의 조건으로 요청했다.
- 샌드박스의 `.git`은 쓰기 제한이다. 커밋/푸시/리베이스에는 실행별 승인을 받았다. `core.fsmonitor=false`를 명령 또는 환경변수로 지정하면 윈도우 fsmonitor IPC 잡음이 줄어든다.
- `release-signing.properties`와 `local.properties`가 새 워크트리에 없다. 이전 확인된 Android 테스트 워크트리의 파일을 하드링크하고 내용을 출력하지 않는다. 이전 빌드/검증 스크립트와 bundletool은 `D:/Development/Temp/cd-play-cli-20261122`에 있다. 두 스크립트를 후보 SHA, CI run ID, 버전 1.0.63 및 워크트리 경로로 복제해 사용하며, SHA와 필수 CI를 고정한다. Sharp 메모리 부족 시 그 폴더의 `limit-image-memory.cjs`를 적용한다.
- 테스트 Android 경로 `C:/Users/user/AppData/Local/Android/Sdk/platform-tools/adb.exe`. 스크린샷은 계정 표기와 주문 식별자를 가린 다음 `D:/Development/releases/codedestiny/<버전>/verification`에 보존한다. 이전 실제 Play 결제 동선과 QA62PAY 증거는 기존 인수인계 문서를 참조한다.

## 설계

- Google Play에서 상태와 소유권을 검증하고 동일 주문을 저장한 뒤 회당 상품의 서버 acknowledge에 오류가 나도 그 구매의 접근 증빙을 앱에 반환한다. 앱 consume은 Play acknowledge도 수행한다. 다른 상품은 기존 서버 승인 규칙을 사용한다. 일시적 응답 오류는 같은 토큰과 요청 ID로 한 번 재확인한다. 결제 선택·가격·이용권·월정석·환불 판정 정책은 유지한다.
- QA62PAY 당시 서버 후속 처리의 정확한 HTTP 오류는 확보하지 못했다. 구버전의 구매 기록 저장 후 성공 응답이 끊기는 구간을 재현했고, 현재 회귀 테스트가 이를 검증한다. Android localhost WebView에서 개발자용 로컬 결과 미리보기도 사용하지 않도록 했다.
- 보관함 검색을 위로 올리고 다시 보기 버튼을 강조했다. 꽃돼지 연이 결과와 후기 폼에 크림 바탕과 진한 장밋빛 대비, 달빛 예화 꽃가지 자산을 적용했다. 상담 고르기의 소개와 상담 시작 동선을 구분한다. 후기 자격과 익명 공개 동의는 기존 서버 판정을 사용한다. 첫 앱 진입점의 중복 상담 바로가기를 제거하고 꿀꿀운세의 초융합 항목을 보존했다.

## 단계

- [x] 결제 영수증 응답 복귀 수정, Play UI 모의 11건 및 서버 모의 121건 통과.
- [x] 찻집 복구 33건, 보관함·후기 UI 33건 통과. 디자인 검사 기존 글꼴 권고 확인.
- [ ] 최신 기준에서 두 로컬 실패 검사 재확인, pre-push, 필요한 범위만 main fast-forward, 정확한 후보 SHA의 GitHub 필수 CI 통과 확인.
- [ ] main에서 해당 SHA로 Cloudflare staging 수동 배포 후 버전과 모의 AI·Play 스테이징 분리 확인. 같은 SHA로 AAB 서명·검증·Android 단위 테스트 실행.
- [ ] Play Console 내부 테스트 트랙에만 업로드·출시하고 실제 Play에서 연결 기기에 업데이트한다.
- [ ] 새 QA 질문으로 Google 로그인 상태 → Play 테스트 결제 1회 → 화면 자동 복귀·모의 결과 → 강제 종료와 콜드 스타트 → 보관함 검색·같은 결과 확인. 후기·보관함·상담 선택의 실화면도 함께 검수.
- [ ] 증거 정리, 인수인계 종료, 전달되지 않은 다른 세션 작업 보존.

