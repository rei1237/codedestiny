---
status: in-progress
updated: 2026-11-22
next: 1.0.62의 서명 빌드 결과를 확인하고, 통과한 번들을 내부 테스트 트랙에 올린다.
---

# Google Play 내부 테스트와 한국어 등록정보

## 첫 행동

- `gh run view 44966348826 --json status,conclusion,headSha`로 정확한 소스 CI 결과를 확인한다.
- `gh run view 44966532658 --json status,conclusion,headSha`와 `https://staging.code-destiny.com/api/version`으로 스테이징 배포 상태를 확인한다.
- AAB 버전은 Play Console 최신 버전 및 번들에서 확인한 뒤 정한다. Play Console에서 내부 및 프로덕션 최신 릴리스 버전 코드 61을 확인했다. 이번 내부 테스트용 번들은 62다.
- Android SDK의 `adb devices -l`과 격리 설정의 `gcloud auth list`로 테스트 기기, 관리자 인증 준비를 확인한다. 계정과 토큰은 출력하지 않는다.

## 지금 상태

- 앱 소스 기준 SHA `0cb2f18c09ad8945c1082736d41d4164e820a2e8`은 main과 origin/main에 전달됐다.
- 공유 체크아웃 `D:/Development/code-destiny`에는 다른 세션의 미커밋 변경이 있다. 자체 작업은 `D:/Development/codedestiny-worktrees/android-internal-play-20261122-080050`의 `wt/android-internal-play-20261122-080050`에서 이어간다.
- `dd877cf3f`에서 앱 홈의 승인된 제작자 기록 문구 재사용을 바로잡았고 CI 44960291367이 통과했다. `3933c604c`와 `0cb2f18c0`은 스테이징 전용 Android 빌드와 Play 테스트 영수증 경계를 적용했다. 최신 main CI 44966348826의 CI required가 통과했고 스테이징 워크플로 44966532658도 통과했다. 공개 버전 엔드포인트에서 같은 SHA와 staging 환경을 대조했다.
- Play Console 한국어 기본 등록정보에 휴대전화 4장과 그래픽 1장을 적용하고 임시저장했다. 같은 편집기를 다시 열어 첨부 순서와 비활성 저장 버튼을 확인했다. 첫 스크린샷은 새 앱 화면을 담는다. 공개 시점은 실제 공개 앱 화면과 맞춘다.
- AAB 서명 사전 확인, 스테이징 LLM 모의 검사, Android OAuth 및 API 전달 테스트 35개, Play 서버 모의 테스트 120개, pre-push가 통과했다. 첫 Android 빌드는 sharp의 로컬 메모리 부족으로 이미지 변환에서 멈췄다. 두 번째 빌드는 이미지 처리를 통과했으나 다른 체크아웃의 개발 서버를 감지하는 호스트 공용 가드에서 멈췄다. 세 번째 빌드는 자체 경로로 분리된 .next 및 출력 디렉터리를 확인한 뒤 가드의 지원 플래그를 사용했고, 앱 정적 검사를 통과해 Next 빌드 중이다. 로그는 D:/Development/releases/codedestiny/1.0.62/verification에 남긴다.
- Cloudflare 스테이징에는 Google OAuth와 Play 영수증 검증 서비스 계정 설정이 있다. Play Console에서 이 앱의 권한으로 서비스 계정이 활성임을 확인했고, 키는 메모리와 표준입력으로 스테이징 Worker 시크릿에 연결했다. 시크릿 연결 뒤에도 배포 SHA가 유지됐으며 실 LLM 사용자 허용 목록은 비어 있다. 스테이징 Google 시작 URL이 스테이징 콜백을 담아 Google 계정 선택 화면 200으로 전환되는 것을 확인했다. 마지막 ADB 확인 시 연결 기기가 없었고 사용자에게 USB 연결 상태 확인을 요청했다.

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

`docs/android-release.md`의 스테이징 빌드 절을 쓴다. JDK 21, Android SDK, 빌드 플래그 `CODE_DESTINY_MOBILE_STAGING_TEST=1`과 `NEXT_PUBLIC_API_URL=https://staging.code-destiny.com`를 같은 셸에 유지한다. 내부 테스트 앱은 기존 앱 ID와 업로드 키를 사용하며, Android 9 이상의 별도 WebView 저장소에서 운영 세션을 가져오지 않는다. 이전 번들과 서명 지문을 비교하고, 번들 매니페스트와 내장 스테이징 주소를 확인한다. 스크래치 `D:/Development/Temp/cd-play-cli-20261122/verify-internal-aab.ps1`은 공식 bundletool 1.18.1, jarsigner, 직전 서명 지문, 콘텐츠 경계 및 Android 단위 테스트 XML을 확인한다.

## 단계

- [x] 코드 수정, 모의 검사 및 원격 전달
- [x] 한국어 등록정보 그래픽과 모바일 이미지 임시저장 확인
- [x] 정확한 소스의 CI 및 스테이징 워크플로 성공 확인
- [x] Play 검증 전용 계정 설정
- [ ] 서명 AAB와 Android 단위 테스트 확인
- [ ] Play 내부 테스트 업로드 및 설치
- [ ] Google 로그인 → 테스트 결제 → 모의 AI 결과 → 앱 재실행 → 보관함 재열람 기기 실측
- [ ] 전달 보고와 자체 작업 파일 정리
