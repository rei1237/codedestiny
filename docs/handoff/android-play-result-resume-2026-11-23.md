---
status: done
updated: 2026-11-23
next: 완료. Android 1.0.63의 QA63PAY 실기기 검증과 증거를 확인한다.
---

# Android 내부 테스트 — 결제 후 상담 복귀와 달빛 예화

## 첫 행동

이 워크트리에서 `git -c core.fsmonitor=false status -sb`, `git log -4 --oneline`을 실행한다. 최신 origin/main과 후보를 대조한다. 이미 출시한 AAB와 스테이징의 SHA를 먼저 확인한다. 공유 main의 다른 세션 변경은 보존한다.

## 지금 상태

- 워크트리 `D:/Development/code-destiny/.tmp/play-result-work/play-result-resume-20261123-063108`
- 브랜치 `wt/play-result-resume-20261123-063108`
- AAB 소스와 main 반영 커밋 `022889e91ce708315273b89e8255818fe8618c60`. 결제 `26eee6ffdf`, UI `a8124d9103`.
- [필수 CI](https://github.com/rei1237/codedestiny/actions/runs/45075805562/attempts/2) 2차 성공. 1차는 모든 Node 테스트 5,822건과 타입·빌드 및 critical 검사가 통과했고 데스크톱 종합 사주 표시만 시간 초과했다. 같은 검사는 로컬 360·390·430·1280px와 CI 재실행에서 통과했다.
- [스테이징 배포](https://github.com/rei1237/codedestiny/actions/runs/45079735277)에서 Pages와 Worker 모두 `e9c25b886046dbcfda82c2b5544aa5685a0a4322`를 서비스한다. AAB 소스와 문서 세 개만 다르다. 모의 AI 활성화, Workers AI 비활성화, 실 LLM 허용 목록 없음, Play 검증 자격 등록을 확인했다.
- Gradle `:app:bundleRelease`, `:app:testReleaseUnitTest` 성공. Android 단위 테스트 11건과 번들 서명·매니페스트·스테이징 내장 설정 검증이 통과했다. AAB `D:/Development/releases/codedestiny/1.0.63/codedestiny-1.0.63-staging.aab`, SHA256 `15c1555427ac9bdcf537fe27ce46cdfd1a1edb0fc84d3823a36a7838824069f3`.
- [Play 내부 출시 20](https://play.google.com/console/u/0/developers/8929260153073799668/app/4971977067602742831/tracks/4701642016388647854/releases/20/details)은 1.0.63, 버전 코드 63, 내부 테스터에게 제공됨 상태를 확인했다. Ego Lite 공간 12, p1.
- 실제 스테이징 모바일 보관함에서 기존 QA62PAY를 한 건 찾아 다시 열었다. 상담 고르기와 보관함은 360·390·430px 가로 넘침이 없고 주요 CTA 44px, 후기 제출은 48px와 공개 동의 기본 해제를 확인했다. 검수 그림과 로그는 `D:/Development/releases/codedestiny/1.0.63/verification`.
- 연결된 Android 기기에 Play 스토어를 통해 1.0.63, 코드 63을 설치했다. ADB 설치 관리자는 `com.android.vending`이다. Google 테스트 계정을 선택하고 앱 복귀와 로그인 상태를 확인했다.
- 이전 버전, QA62PAY 사건 및 기존 영수증 복구 증거는 `docs/handoff/android-play-internal-2026-11-22.md`(2026-11-24 main 에 머지)에 있다. 해당 주문은 수동 복구 후 1.0.62를 종료하고 다시 열어 보관함에서 확인했다. 새 버전 검증과 구분한다.

## 승인 상태

- 2026-11-23 사용자 요청 “결제 직후 실패 안내가 뜨고 상담 결과로 안 넘어가는 버그도 수정해줘. CI 통과 후 새 AAB를 구글 플레이 내부 테스트에 올려서, 테스트 결제 한 번으로 모의 상담 결과가 자동으로 열리고 앱 재실행 후 보관함에서도 다시 볼 수 있는지 확인해줘.”
- 스테이징 연결, 내부 테스트, 스테이징 전용 Play 계정 설정은 사용자가 앞서 승인했다. 테스트 기기 USB 연결과 디버깅 승인 이력이 있으며 이번 턴에도 ADB 상태 `device`를 확인했다. Play에서 테스트 결제 수단과 청구되지 않는다는 안내가 보일 때만 구매를 한 번 승인한다. 실제 청구, 실 LLM, 운영 DB 쓰기, 프로덕션 출시를 수행하지 않는다.

## 작업 규칙과 함정

- `check:fast -- --plan`은 critical로 판정했다. 최초 `check:fast`의 결제 검사 78개 중 76개 통과 후 localhost 모의 서버 접근 제한 때문에 두 검사가 멈췄다. `verify:llm-generation-resilience`와 `verify:analysis-basis-contract`는 localhost 모의 서버를 사용할 수 있는 환경에서 각각 재실행해 통과했다.
- 대기 중인 다른 세션 main CI는 동일 SHA의 run과 필수 체크를 확인한다. 확인된 실패가 현재 base에 있으면 실패 작업과 원인을 조사한다. 사용자가 새 후보 CI 통과를 업로드의 조건으로 요청했다.
- 샌드박스의 `.git`은 쓰기 제한이다. 커밋/푸시/리베이스에는 실행별 승인을 받았다. `core.fsmonitor=false`를 명령 또는 환경변수로 지정하면 윈도우 fsmonitor IPC 잡음이 줄어든다.
- `release-signing.properties`와 `local.properties`가 새 워크트리에 없다. 이전 확인된 Android 테스트 워크트리의 파일을 하드링크하고 내용을 출력하지 않는다. 이전 빌드/검증 스크립트와 bundletool은 `D:/Development/Temp/cd-play-cli-20261122`에 있다. 두 스크립트를 후보 SHA, CI run ID, 버전 1.0.63 및 워크트리 경로로 복제해 사용하며, SHA와 필수 CI를 고정한다. Sharp 메모리 부족 시 그 폴더의 `limit-image-memory.cjs`를 적용한다.
- 테스트 Android 경로 `C:/Users/user/AppData/Local/Android/Sdk/platform-tools/adb.exe`. 스크린샷은 계정 표기와 주문 식별자를 가린 다음 `D:/Development/releases/codedestiny/<버전>/verification`에 보존한다. 이전 실제 Play 결제 동선과 QA62PAY 증거는 기존 인수인계 문서를 참조한다.

## 설계

- Google Play에서 상태와 소유권을 검증하고 동일 주문을 저장한 뒤 회당 상품의 서버 acknowledge에 오류가 나도 그 구매의 접근 증빙을 앱에 반환한다. 앱 consume은 Play acknowledge도 수행한다. 다른 상품은 기존 서버 승인 규칙을 사용한다. 일시적 응답 오류는 같은 토큰과 요청 ID로 한 번 재확인한다. 결제 선택·가격·이용권·월정석·환불 판정 정책은 유지한다.
- QA62PAY 당시 서버 후속 처리의 정확한 HTTP 오류는 확보하지 못했다. 구버전의 구매 기록 저장 후 성공 응답이 끊기는 구간을 재현했고, 현재 회귀 테스트가 이를 검증한다. Android localhost WebView에서 개발자용 로컬 결과 미리보기도 사용하지 않도록 했다.
- 보관함 검색을 위로 올리고 다시 보기 버튼을 강조했다. 꽃돼지 연이 결과와 후기 폼에 크림 바탕과 진한 장밋빛 대비, 달빛 예화 꽃가지 자산을 적용했다. 상담 고르기의 소개와 상담 시작 동선을 구분한다. 후기 자격과 익명 공개 동의는 기존 서버 판정을 사용한다. 첫 앱 진입점의 중복 상담 바로가기를 제거하고 꿀꿀운세의 초융합 항목을 보존했다.

## 실기기 최종 결과

- 2026-11-23 09:37 KST에 운명 찻집 3카드 타로에 합성 질문 `QA63PAY How can I start a difficult conversation calmly`를 입력했다. Google Play의 “테스트 카드, 항상 승인”과 “테스트 주문이므로 청구되지 않습니다”를 확인하고 원탭 구매를 한 번만 눌렀다.
- Google Play “결제 완료”의 확인 버튼을 닫자 앱이 QA63PAY 결과와 본문을 자동으로 열었다. 후기 입력 폼과 기본 해제 상태의 익명 공개 동의를 기기에서 확인했다. 후기 제출은 하지 않았다.
- ADB `am force-stop`으로 앱 프로세스가 종료된 상태를 확인하고 같은 앱을 새 프로세스로 실행했다. 꿀꿀운세 보관함에서 QA63PAY 한 건을 검색하고 다시 보기로 같은 상담 본문을 열었다. 로그인과 결제 안내는 다시 나오지 않았다.
- 재열람 뒤 스테이징 읽기 전용 대조 결과는 같은 요청 ID의 Google Play 라이선스 테스트 주문 1건(`fulfilled`, `UNLOCKED`)과 완료 상담 결과 1건(`completed`, `local_fallback`)이다. 기기 화면의 안내와 서버의 테스트 구매 유형을 모두 확인했다.
- 별도 탐색 관찰. 달빛 상담 편지의 운명 찻집 버튼을 탭했을 때 화면이 전환되지 않았다. 일반 대표 상담 카드와 상세 버튼을 통해 들어갔다. 저장된 결과에서 상담 고르기를 여는 동작은 정상이며, 그 화면에서 Android 시스템 뒤로 가기를 누르면 WebView 오류(`ERR_CONNECTION_REFUSED`) 화면이 표시됐다. 결제 후 복귀와 콜드 스타트 후 재열람은 확인했다.
- 실제 기기와 주문 검증 자료는 `D:/Development/releases/codedestiny/1.0.63/verification`의 `qa63pay-*`, `qa63-consultation-picker.png`, `qa63-navigation-note.json`이다. 다음 내부 번들은 새 버전 코드 배정 확정 전까지 업로드를 보류한다.

## 단계

- [x] 결제 영수증 응답 복귀 수정, Play UI 모의 11건 및 서버 모의 121건 통과.
- [x] 찻집 복구 33건, 보관함·후기 UI 33건 통과. 디자인 검사 기존 글꼴 권고 확인.
- [x] 두 로컬 모의 검사 재확인, pre-push, main fast-forward, 정확한 후보 SHA의 GitHub 필수 CI 통과 확인.
- [x] Cloudflare staging 수동 배포, Pages·Worker SHA, 모의 AI·Play 스테이징 분리 확인. AAB 서명·검증·Android 단위 테스트 통과.
- [x] Play Console 내부 테스트 트랙 출시 및 테스터 제공 상태 확인.
- [x] Play 스토어에서 연결 기기에 1.0.63 업데이트.
- [x] Google 로그인, QA63PAY Play 테스트 결제 1회, 모의 결과 자동 열기, 콜드 스타트 후 보관함에서 같은 결과 재열람 확인. 후기·보관함·상담 고르기 실화면 검수.
- [x] 증거 저장, 인수인계 완료, 다른 세션 작업 보존.

