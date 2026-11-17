# 달빛 연화당 반영 후 Android 출시 계획

기준일: 2026-11-17. 사용자 지정 순서: 입묘 개선 완료 → 연화당 다각도·UI/UX 구현 → 앱 빌드 및 출시 준비. 이번 단계는 연화당 구현과 출시 준비 문서·스토어 문안까지다. AAB 업로드와 프로덕션 출시는 아직 실행하지 않았다.

## 확인한 현재 상태

- 입묘 작업: `53216a36ea6558f2e594a28236145224ce42fd9e`, main 전달 완료.
- Play Console 직접 확인: `com.codedestiny.app`, 기존 프로덕션 1.0.59, 배포 100%, 기존 8개국 KR/JP/US/GB/CA/AU/NZ/IE 유지. 신규 앱 등록이 아닌 업데이트다.
- 개발환경: JDK 21, Android SDK/build-tools 36, adb 및 서명 설정 파일 존재 확인. 실제 서명 인증서·AAB 생성 검증은 빌드 단계에서 한다.
- Capacitor 8.4.3, minSdk 24, target/compile 36, release R8·리소스 축소 설정 유지.
- 이전 커밋 main CI가 실패했다: [44064192958](https://github.com/rei1237/codedestiny/actions/runs/44064192958). Static guards의 `verify:sukuyo-reading-house` 73행에서 출석 영역 펼침 기대값이 false였다. Typecheck/lint와 Pages/Worker 빌드는 통과했다. 연화당 변경 전 실패이며 숙요/프로필 코드 수정은 이번 범위 밖이다. 이 실패가 해소되기 전 새 변경을 main 위에 푸시하지 않는다.

## 1. 연화당 구현과 인수 기준

마당·법당·연못 × 5시점, 기존 정면 가로 그림 3개와 새 WebP 27개를 사용한다. 세로 768×1152, 가로 1536×1024. 새 자산 합계 6,652,174bytes(약 6.34MiB), 세로 최대 215,042bytes, 가로 최대 347,014bytes다. 모바일에서 가로 그림 전체를 받아 잘라 보여주는 방식을 피한다.

다음 그림을 decode한 뒤 바꾸며 실패하면 현재 풍경을 유지한다. 인접 시점만 미리 준비하고 훅의 이미지 참조는 최대 3개다. 이 수치는 앱 전체 메모리 상한을 의미하지 않는다. 사진·기록·꾸미기는 필요할 때 코드를 로드한다.

검수 증거는 `moonlit-lotus-views.md`의 결과 절에 기록한다. 변경된 시점은 URL의 선택적 view로 보존하며 캐릭터 Canvas와 108배 집계는 유지한다. noindex, 기기 내 비공개 기록, 이용권·월정석·단건 결제 및 기존 구매 결과 정책은 그대로다.

## 2. 릴리스 후보 만들기

1. 선행 CI 실패 해결 후 검증된 변경을 main으로 전달한다. `npm run check:pre-push`와 해당 커밋 CI를 확인한다. 공식 CI가 출시 게이트다.
2. Play Console 모든 트랙의 최대 versionCode를 다시 조회한다. 59나 다음 버전을 추측해 고정하지 않는다. 기존 앱 서명과 applicationId를 유지한다.
3. `powershell -File scripts/android-release-check.ps1 -RequireSigning`으로 환경을 재확인한다. 서명 비밀값은 로그나 문서에 쓰지 않는다.
4. `npm run mobile:android:sync`로 모바일 정적 결과와 Capacitor 자산을 만든다. dist/out은 생성기만 사용한다. 새 views-v1의 27개 파일, 정면 그림, 캐릭터 atlas가 패키지에 모두 포함되는지 확인한다. 모바일 이미지 압축 후 atlas의 프레임 크롭을 반드시 재검증한다.
5. `apps/mobile/android`에서 `./gradlew.bat :app:bundleRelease :app:assembleRelease -PCODE_DESTINY_ANDROID_VERSION_CODE=<확인한 다음 코드> -PCODE_DESTINY_ANDROID_VERSION_NAME=<릴리스 이름>`을 실행한다. 산출물은 `app/build/outputs/bundle/release/app-release.aab`, `app/build/outputs/apk/release/app-release.apk`다. SHA-256·버전·서명 인증서 지문·크기를 기록한다.
6. SDK 36 edge-to-edge 및 폐기 API 경고를 기존 MainActivity와 Capacitor 동작에 대조한다. 시스템바·컷아웃·3버튼/제스처 내비게이션에서 버튼이 가려지면 출시 전 수정한다. AAB의 native .so 유무와 16KB 페이지 정렬을 검증한다. 존재하지 않는 경고를 통과로 기재하지 않는다.

## 3. 기기·성능 검증

| 영역 | 확인 내용 | 완료 증거 |
|---|---|---|
| 업데이트 | 1.0.59 위에 설치, 로그인·구매 결과·연화당 기기 기록 보존 | 업데이트 전후 동일 기록 확인 |
| 화면 | 360/390/430dp, 태블릿, 가로, 글자 200%, 키보드, 컷아웃 | 릴리스 APK 캡처·동작 기록 |
| 참배 | 9/27/108배, 일시정지/재개, 속도 변경, 새로고침·앱 전환·화면 잠금 | 중복·누락 없는 횟수 |
| 시점 | 3장소×5시점, 스와이프/방향키, 뒤로가기, 오프라인 실패, 사진 편집 | 캐릭터·현재 시점·집계 보존 |
| 성능 | 저사양 기기에서 냉시작 5회, 화면 준비 시간, 20회 시점 왕복, 5분 참배 | 중앙값/p95·메모리 추세·끊김 비교 |
| 오디오 | 최초 재생 사용자 입력, 중지/재시도, 백그라운드·복귀, 다른 탭 | 자동 재생·중첩·계속 재생 없음 |
| 결제·계정 | mock 계약 검사, 스토어 내부 테스트의 승인된 테스트 계정·결제 경로 | 실결제·실 LLM 폴백 없이 검증 |

`node scripts/measure-android-startup.mjs --package com.codedestiny.app --serial <기기> --runs 5`는 Activity 시작 시간이다. 풍경이 준비되는 WebView 시간과 별도로 기록한다. 개발 서버의 요청 속도를 출시 성능으로 사용하지 않는다. JS heap과 디코딩 이미지·GPU 메모리도 구분한다.

## 4. 검색·스토어 준비

정본 초안은 `apps/mobile/store-listings.json`이며 status=draft를 유지한다. 한국어 제목은 **꿀꿀운세 - 사주·자미두수·타로**(17자), 짧은 설명은 67자다. 사주·자미두수 명반·베다점·점성술·연애운·신년운세를 기능 설명에 자연스럽게 분산했다. 영어·일본어 설명에는 자미두수와 연화당을 추가하고 연화당 조작이 현재 한국어임을 명시했다. 제공하지 않는 무료·무제한 혜택이나 결과 보장은 추가하지 않는다.

스토어 캡처는 release APK에서 제작한다: 사주 → 자미두수 명반 → 연애/타로 → 베다/점성술 → 연화당 둘러보기 → 108배/명상. 개발 도구 표시와 테스트 데이터는 제외한다. 실제 구현과 캡처가 일치해야 한다. 검색 노출·순위·설치 수는 보장하지 않는다.

개인 연화당 URL은 계속 noindex다. 공개 SEO 진입은 기존 운세 소개·검색 의도에 맞는 페이지를 사용한다. 개인 기도나 기록을 검색 콘텐츠로 전환하지 않는다.

## 5. 심사 제출·출시

1. 내부 테스트 트랙에 검증된 AAB를 업로드하고 사전 출시 보고서, 충돌/ANR, 접근성·보안 및 16KB/edge-to-edge 경고를 처리한다.
2. 기존 8개국과 가격/상품 구성을 유지한다. 콘텐츠 등급, 데이터 보안, 개인정보처리방침, 계정 삭제 URL, 광고 유무, 생성형 AI 콘텐츠 신고 진입의 실제 동작을 대조한다.
3. 스토어 문안·스크린샷·릴리스 노트를 함께 반영하고 심사 제출한다. 심사 완료와 다운로드 가능 상태는 별개로 확인한다.
4. 기존 앱 업데이트의 단계 배포를 사용한다. 권장 관찰 단위는 5% → 20% → 50% → 100%이며 각 단계에서 실제 vitals·오류 추세·핵심 플로를 보고 진행한다. 배포 중단은 신규 업데이트 확산을 멈추며 기존 설치 앱을 다운그레이드하지 않으므로, 필요 시 더 높은 versionCode의 수정본을 준비한다.
5. Play 공개 상세 페이지 및 설치/업데이트 버튼을 확인한다. ASO 효과는 Console 검색어·상세 페이지 방문·설치 전환의 출시 전후 기간을 비교한다.

## 공식 근거

- [스토어 등록정보와 글자 제한](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en): 제목 30/짧은 설명 80/상세 4000자.
- [대상 API 요구사항](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-en), [16KB 페이지 크기](https://developer.android.com/guide/practices/page-sizes).
- [생성형 AI 콘텐츠 정책](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en), [업데이트 단계 배포](https://support.google.com/googleplay/android-developer/answer/6346149?hl=en-en).
- [Android vitals](https://developer.android.com/google/play/vitals). 지표의 임계값은 제출 시 최신 Console 기준으로 다시 확인한다.
