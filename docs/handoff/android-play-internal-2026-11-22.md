---
status: in-progress
updated: 2026-11-23
next: 완료로 기록된 운명 찻집 Play 테스트 주문의 확인 실패와 결과 복귀 누락을 진단하고, 같은 주문을 중복 결제 없이 복구한다.
---

# Google Play 내부 테스트와 한국어 등록정보

## 첫 행동

- `adb -d shell dumpsys package com.codedestiny.app`으로 이미 설치된 1.0.62를 확인한다. 현재 테스트 계정으로는 새 Google 로그인과 재실행 후 보관함을 확인했다. 일반 테스트 계정 준비 여부를 물었다. Play 결제 화면에 테스트 수단이 명시된 때만 결제를 진행한다.
- `gh run view 44966532658 --json status,conclusion,headSha`와 `https://staging.code-destiny.com/api/version`으로 스테이징 배포 상태를 확인한다.
- Play Console에서 내부 62와 프로덕션 61을 확인했다. 기기에서 섞이지 않도록 설치 출처와 설치 버전 1.0.62를 대조한다.
- 기기에서 Android 9 이상과 테스트 계정을 확인한다. 로그인·결제·AI·보관함 검증에는 계정, 영수증 토큰, 출생정보 등의 로그를 남기지 않는다.

## 지금 상태

- 앱 소스 기준 SHA `0cb2f18c09ad8945c1082736d41d4164e820a2e8`은 main과 origin/main에 전달됐다.
- 공유 체크아웃 `D:/Development/code-destiny`에는 다른 세션의 미커밋 변경이 있다. 자체 작업은 `D:/Development/codedestiny-worktrees/android-internal-play-20261122-080050`의 `wt/android-internal-play-20261122-080050`에서 이어간다.
- `dd877cf3f`에서 앱 홈의 승인된 제작자 기록 문구 재사용을 바로잡았고 CI 44960291367이 통과했다. `3933c604c`와 `0cb2f18c0`은 스테이징 전용 Android 빌드와 Play 테스트 영수증 경계를 적용했다. 최신 main CI 44966348826의 CI required가 통과했고 스테이징 워크플로 44966532658도 통과했다. 공개 버전 엔드포인트에서 같은 SHA와 staging 환경을 대조했다.
- Play Console 한국어 기본 등록정보에 휴대전화 4장과 그래픽 1장을 적용하고 임시저장했다. 같은 편집기를 다시 열어 첨부 순서와 비활성 저장 버튼을 확인했다. 첫 스크린샷은 새 앱 화면을 담는다. 공개 시점은 실제 공개 앱 화면과 맞춘다. Play Console 내부 테스트 19번에 버전 62를 올리고 출시했다. 최신 버전 개요에서 내부 테스터에게 제공됨과 프로덕션 버전 61을 확인했다.
- AAB 서명 사전 확인, 스테이징 LLM 모의 검사, Android OAuth 및 API 전달 테스트 35개, Play 서버 모의 테스트 120개, pre-push가 통과했다. 첫 Android 빌드는 sharp의 로컬 메모리 부족으로 이미지 변환에서 멈췄다. 두 번째 빌드는 이미지 처리를 통과했으나 다른 체크아웃의 개발 서버를 감지하는 호스트 공용 가드에서 멈췄다. 세 번째 빌드는 자체 경로로 분리된 .next 및 출력 디렉터리를 확인한 뒤 가드의 지원 플래그를 사용했다. 최적화와 앱 결제 가드 검증(HTML 1,060개), Capacitor Android 복사가 통과했다. Gradle :app:bundleRelease 및 :app:testReleaseUnitTest가 통과했다. bundletool 1.18.1, jarsigner 및 기존 업로드 인증서 대조도 통과했다. Android 단위 테스트 11개가 성공했다. 로그는 D:/Development/releases/codedestiny/1.0.62/verification에 남긴다.
- Cloudflare 스테이징에는 Google OAuth와 Play 영수증 검증 서비스 계정 설정이 있다. Play Console에서 이 앱의 권한으로 서비스 계정이 활성임을 확인했고, 키는 메모리와 표준입력으로 스테이징 Worker 시크릿에 연결했다. 시크릿 연결 뒤에도 배포 SHA가 유지됐으며 실 LLM 사용자 허용 목록은 비어 있다. 스테이징 Google 시작 URL이 스테이징 콜백을 담아 Google 계정 선택 화면 200으로 전환되는 것을 확인했다. USB 디버깅 승인 후 삼성 기기에 연결했다. Play에서 내려받은 1.0.62는 ADB로 버전 코드 62 및 설치 관리자 `com.android.vending`을 확인했다. Google 계정 선택을 거쳐 앱으로 돌아온 뒤 인증 상태에서 보관함을 열었다. 연애 비책 AI에서 결제창 대신 저장 결과를 찾을 수 없다는 화면을 관찰했다. 스테이징 이용권 네 가지는 모두 판매 비활성이다. 운명 찻집 타로 단건 경로에서 가상 질문을 넣고 카드 준비를 눌렀으나 로그인 요청이 나와 결제창까지 도달하지 않았다. 코드상 이 문구는 카드 준비 API 호출 전 공유 인증 상태에 user가 없을 때 표시된다. 이 상태에서 ADB로 앱을 강제 종료하고 콜드 스타트한 뒤 보관함에서 로그인 요구를 확인했다. 세션 소실 원인은 아직 확정하지 않았다. 기존 보관함 기록은 새 테스트 결과로 계산하지 않는다.
- 초융합 운세는 앱 초기 화면의 마스터 상담 링크 경유로 연결되므로 그 링크만 제거했다. 꿀꿀운세 기존 경로는 유지했다. 커밋 `0ba3cf7112`은 `D:/Development/codedestiny-worktrees/native-home-entry-20261122-204549`에 있고 홈 테스트 7개와 pre-push가 통과했다. check:fast의 Node 5,795개 중 3개가 실패했고 공유 main에서 동일 사례를 개별 실행하자 세 개 모두 통과했다. 추가로 실행한 구형 홈 분리 테스트의 두 실패는 변경 전과 동일하다. 공유 main의 다른 작업과 사이트맵 원장이 충돌해 머지를 취소했고 해당 커밋은 푸시하지 않았다.

- 실기기 재검증: 앞서 열었던 Google 화면에서 계정을 선택했을 때 스테이징 브라우저의 인증 오류 화면으로 이동했다. 코드에서 OAuth 상태 유효시간이 10분임을 확인했다. 앱에서 새 Google 요청을 시작하고 사용자 선택 직후 앱 보관함으로 정상 복귀했다. 운명 찻집에서 가상 질문 QA62W로 타로 3장을 뽑고 접근 권한 확인 뒤 스테이징 결과를 생성했다. ADB로 앱을 완전히 종료하고 콜드 스타트한 뒤 로그인을 다시 하지 않고, 보관함에서 QA62W를 검색하고 동일 결과를 다시 열었다. 증거는 `D:/Development/releases/codedestiny/1.0.62/verification/tea-archive-reopen-qa62w.png`이다. 같은 계정으로 꿀꿀운세 상담 목록의 초융합 운세(QA62F)도 생성됐으며 두 경로 모두 Play 구매창을 열지 않았다. 스테이징 이용권 네 개는 판매 비활성이다. 실제 청구와 실 LLM 호출 없이 진행했다. Play 테스트 구매 및 영수증 승인 확인은 남았다.

- 일반 테스트 계정 실기기 검수(11-23 KST): 이전 계정의 QA62W 기록이 없는 상태에서 사용자가 다른 Google 테스트 계정을 선택했다. 운명 찻집의 처음 카드 준비에서 로그인을 다시 요청했다. 찻집 오류 화면의 링크로 Google 로그인을 다시 하니 질문이 복구됐고 카드 선택과 단건 결제 진입에 성공했다. 가상 질문은 QA62PAY다. Play의 “테스트 카드, 항상 승인” 및 “테스트 주문이므로 청구되지 않습니다”를 확인하고 한 번만 결제했다. Play는 완료로 표시했으나 앱은 “결제 확인 실패 / 결제창을 열지 못했습니다.”를 표시했다. 포그라운드 복귀와 완전 종료 후 재실행 뒤 앱 결제 내역에 00:59 운명 찻집 타로 상담(3카드) 5,000원이 결제 완료로 기록됐다. 보관함 QA62PAY 검색과 찻집 내 상담함에서는 같은 결과나 이어갈 항목이 나오지 않았다. 앱은 재로그인 없이 보관함을 열었다. 앱의 결제 내역에서 뒤로 이동할 때 localhost 서비스 페이지 오류도 관찰했다.
- 코드상 Google 영수증 처리에서 주문을 저장한 다음 acknowledge 호출이 이어진다(`worker/routes/app-store.js`). 결제 기록이 남아도 이후 오류로 클라이언트가 성공 응답을 받지 못할 수 있다. 실기기 오류의 정확한 HTTP 상태 및 acknowledge 여부는 확보하지 못했다. 이미 결제 완료 기록이 있으므로 새 구매를 만들지 않고 해당 주문의 복구와 상담 요청 연결을 추적한다. 증거 폴더는 `D:/Development/releases/codedestiny/1.0.62/verification`의 `*qa62pay.png`이다.

## 승인 상태

2026-11-22 KST 사용자 답변 원문.

- 앱 인증과 영수증 복구 수정에 “코드 수정 승인 · 모의 테스트만”.
- 서버 Play 검증 오류 분류 수정에 “서버 수정 승인 · 모의 테스트만”.
- Google Play 라이선스 테스터 기기 연결에 “테스트 기기를 연결할게요”.
- 스테이징 배포와 내부 테스트 번들에 “스테이징 연결과 내부 테스트 승인”.
- 스테이징 Play 검증 계정 설정에 “스테이징 전용 Play 계정 설정 승인”.
- 최신 요청은 CI 통과 후 AAB를 내부 테스트에 올리고 Google 로그인, 테스트 결제, 모의 생성, 재실행과 보관함 재열람을 확인하는 일이다. 한국어 스토어 이미지 변경과 결과 표시 역시 요청했다.

## 작업 규칙과 함정

- 사용할 Play 결제 수단에 테스트 표기가 있어야 한다. 스테이징 서버는 Google 응답 purchaseType 0만 수락한다.
- 운영 DB 쓰기, 운영 서버 배포, 실결제와 실 LLM은 승인 범위 밖이다. 인증 토큰과 서비스 계정 키를 파일·채팅·로그·커밋에 두지 않는다.
- Play 검증 서비스 계정은 staging 전용이며 Android Publisher API에 필요한 앱 범위 권한만 부여한다. 기존 운영 자격증명을 복사하지 않는다.
- 공유 main의 다른 세션 변경을 보존한다. 로컬 서명 설정과 빌드 산출물은 커밋하지 않는다.
- Play 등록정보의 새 앱 첫 화면은 공개 앱과 맞춰 반영한다. Play 게시 개요로 다른 대기 변경을 일괄 제출하지 않는다.

## 설계

`docs/android-release.md`의 스테이징 빌드 절을 쓴다. 앱 코드와 리소스 소스는 CI가 통과한 0cb2f18c0과 같으며 작업트리 HEAD에 추가된 커밋은 이 문서뿐이다. JDK 21, Android SDK, 빌드 플래그 `CODE_DESTINY_MOBILE_STAGING_TEST=1`과 `NEXT_PUBLIC_API_URL=https://staging.code-destiny.com`를 같은 셸에 유지한다. 내부 테스트 앱은 기존 앱 ID와 업로드 키를 사용하며, Android 9 이상의 별도 WebView 저장소에서 운영 세션을 가져오지 않는다. 이전 번들과 서명 지문을 비교하고, 번들 매니페스트와 내장 스테이징 주소를 확인한다. 스크래치 `D:/Development/Temp/cd-play-cli-20261122/verify-internal-aab.ps1`은 공식 bundletool 1.18.1, jarsigner, 직전 서명 지문, 콘텐츠 경계 및 Android 단위 테스트 XML을 확인한다.

## 단계

- [x] 코드 수정, 모의 검사 및 원격 전달
- [x] 한국어 등록정보 그래픽과 모바일 이미지 임시저장 확인
- [x] 정확한 소스의 CI 및 스테이징 워크플로 성공 확인
- [x] Play 검증 전용 계정 설정
- [x] 서명 AAB와 Android 단위 테스트 확인
- [x] Play 내부 테스트 업로드 및 출시
- [x] 테스터 기기에 Play 설치 및 Google 로그인 후 앱 복귀
- [x] 새 Google 로그인 → 기존 접근 권한으로 스테이징 결과 생성 → 앱 콜드 스타트 → 보관함 재열람 실측
- [x] Google Play 단건 테스트 결제와 앱 결제 완료 기록 실측
- [ ] 같은 결제의 결과 복구, 재실행 후 재열람 검증
- [ ] 전달 보고와 자체 작업 파일 정리

## 내부 테스트 산출물

- AAB `D:/Development/releases/codedestiny/1.0.62/codedestiny-1.0.62-staging.aab`
- SHA-256 `ed00c908b06cea150c07a6fbb301e445e5c765320a0e6e9497fa60b5a3209d09`
- 패키지 `com.codedestiny.app`, 버전 코드 62, Android 9 이상, target SDK 36.
- Play 상세 `https://play.google.com/console/u/0/developers/8929260153073799668/app/4971977067602742831/tracks/4701642016388647854/releases/19/details`
- 검증 기록 `D:/Development/releases/codedestiny/1.0.62/verification`
