---
status: in-progress
updated: 2026-11-13
next: Apple 계정으로 App Store Connect에 로그인하고 macOS/Xcode에서 iOS 1.0.59(빌드 59)를 Archive·업로드한다.
---

# Android 부적 앱 및 iOS 출시 인수인계

## 첫 행동

1. `D:\Development\codedestiny-worktrees\android-talisman-launch-20261113-140159`에서 `git status --short`를 확인한다.
2. `apps/mobile`의 현재 버전과 Android 서명 파일 존재 여부를 값 노출 없이 확인한다.
3. `npm run mobile:android:sync`와 Android 단위 테스트·릴리스 검사를 실행한다.

## 지금 상태

- 작업 브랜치: `wt/android-talisman-launch-20261113-140159`
- 작업 디렉터리: `D:\Development\codedestiny-worktrees\android-talisman-launch-20261113-140159`
- 기준 커밋: `1acf1327841ea7a954d2c9e0dddcf3d58655a48c` (`origin/main`)
- 마지막 작업 커밋: `0d9bffb97` (`chore: prepare ios 1.0.59 release`)
- 원래 체크아웃 `D:\Development\code-destiny`는 다른 기능 브랜치와 미추적 파일이 있어 건드리지 않는다.
- 다른 Android 워크트리 두 곳은 다른 세션 소유이므로 읽기 외 변경·정리를 하지 않는다.
- Android 1.0.59 AAB: 293,245,248 bytes, SHA-256 `9080BA1B508C74E4AEB6D3E90F164FB521EE5ED0938CD466E4599E0D03D52C45`, `jarsigner -verify` 통과.
- Play Console: `꿀꿀운세 1.0.59 — 타로 부적과 마음 쉼`, 버전 코드 59, 타겟 SDK 36, 기존 19개 국가 100% 출시로 제출했으며 현재 `검토 중인 변경사항`이다.
- iOS: 최신 웹 자산과 Capacitor 플러그인 동기화 성공. `MARKETING_VERSION=1.0.59`, `CURRENT_PROJECT_VERSION=59`, Capacitor Swift PM 8.4.3으로 준비했다.
- App Store Connect는 Apple 계정 로그인 화면까지 확인했으나 로그인 세션이 없고, Windows에는 Xcode/Apple 서명 도구가 없어 Archive·업로드는 외부 Mac 단계로 남는다.

## 승인 상태

- 사용자는 2026-11-13에 최신 Android 앱 제작과 Google Play 론칭, 이후 iOS 론칭 절차 진행을 명시적으로 요청했다.
- 따라서 스토어 제출과 출시 승인은 요청 범위에 포함한다.
- 계정의 법적 선언, 개인정보 처리 사실, 서명 자격 증명처럼 코드에서 사실을 확인할 수 없는 항목은 추측하지 않는다.

## 작업 규칙과 함정

- 결제 정책과 이용권·월정석·단건 결제 구조, 인증, API, DB는 변경하지 않는다.
- 실결제·실 LLM·운영 DB로 개발 검증하지 않는다.
- 새 이미지는 텍스트와 워터마크가 없고 기존 영냥이·꽃돼지 연이 세계관을 따른다.
- `process.env.NEXT_PUBLIC_RUNTIME_TARGET`을 부적 격리 검증에 정의하지 않으면 브라우저 검증이 실패한다.
- 잠금화면 위젯 파일명은 `-yeongnyangi-v<숫자>` 접미사를 제거해 해석한다.
- `npm run check:fast`의 첫 실행은 오늘 날짜 운세 데이터 누락 1건과 새 부적 잠금화면 정규화 1건으로 실패했다. 정규화는 수정·재검증 완료했고, 운세 데이터는 `npm run fortune:build-data` 선행이 필요하다.
- Android Gradle 단위 테스트는 Capacitor 동기화 전 `cordova.variables.gradle` 누락으로 실패하므로 먼저 모바일 동기화를 한다.
- 공식 전체 검증 게이트는 GitHub CI다. 로컬에서는 관련 targeted 검사와 `check:pre-push`를 사용한다.

## 설계

- 부적 카탈로그에 `마음 쉼` 범주와 승인된 원본 이미지 3장을 추가했다.
- 서울 날짜를 기준으로 같은 날에는 같은 그림을 고르는 `오늘의 부적 추천`을 추가했다. 운세 예언이나 결과 보장 문구는 없다.
- 장면·소원 선택에 축소 그림을 보여주되 기존 라디오 입력과 접근성 구조를 유지했다.
- Android 홈 위젯과 잠금화면에서 새 그림 3장을 로컬 자산으로 해석하도록 연결했다.
- 12개 로케일 문구와 360/390/430px 모바일 overflow 검증을 포함했다.
- 부적 스튜디오에 영냥이 달빛 덱과 연이의 운명 찻집 덱 78장을 연결하고 정·역방향, 계열 필터, 기존 상담 정본 기반 카드 해설을 추가했다.
- 영냥이 타로 결과와 운명의 찻집 카드 상세에서 선택 카드·방향을 보존한 채 부적 스튜디오로 이동한다.

## 단계

- [x] 기존 구조·정책·스토어 자료 조사
- [x] 부적 이미지 3장 생성·육안 검수·카탈로그 등록
- [x] 부적 추천 UX와 시각 선택 UI 구현
- [x] Android 홈 위젯·잠금화면 연동
- [x] 12개 로케일·오류 상태·모바일 폭·로컬 자산 검증
- [x] 첫 구현 커밋
- [x] 영냥이·운명의 찻집 타로 카드 부적과 고급 해설 UI 구현
- [x] Android 버전과 서명 준비 확인
- [x] 타로 추가 전 Capacitor Android 동기화·단위 테스트·AAB 빌드
- [x] 타로 포함 최종 Capacitor Android 동기화·단위 테스트·AAB 빌드
- [x] Google Play Console 업로드·제출·상태 확인
- [x] iOS 동기화·App Store Connect 제출 가능 상태 확인
- [ ] 최종 targeted 검사와 `check:pre-push`
- [ ] `origin/main` 전달·main CI 확인
- [ ] Apple 로그인·Mac/Xcode Archive·App Store Connect 업로드
- [ ] 인수인계 문서 `done` 처리와 자기 워크트리 정리
