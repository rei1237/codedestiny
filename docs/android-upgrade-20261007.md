# Android 고도화 실행 기록 · 2026-10-07

상태: 구현·서명 빌드 후보 작성. 전체 출시 인수는 미완료이며 아래 외부 검증·남은 구현을 따른다. 코드·mock·에뮬레이터·실기기·Play 검증을 분리한다.

## 실행 계획
1. 기존 Capacitor/Java 구조와 기능·저장 계약 조사.
2. 꺼진 설정 보존, 개인정보 보호, 표준 알림·비정확 예약 전환.
3. 영냥이 에셋과 상세·설정 사용성 개선. 기존 다섯 탭과 서비스 엔진 재사용.
4. 웹 번들, 네이티브 동기화, 테스트, APK/AAB 빌드 및 가용 에뮬레이터 검증.
5. 변경만 커밋·main 전달·CI 확인. 외부 계정·실기기 차단은 명시.

## 변경 전 확인
- 소스 기준: `0af4f6836e3c281f07fbe5ffbea5016d89739c75`. 다른 세션 변경은 격리 워크트리로 보존.
- Capacitor 8 + Java `:app`, 로컬 정적 웹 번들 `https://localhost`, API `https://code-destiny.com`. localhost는 Capacitor 로컬 origin이며 운영 API가 아니다.
- applicationId/namespace `com.codedestiny.app`, min 24, compile/target 36, Gradle 8.14.3, AGP 8.13.0, JDK 21.0.11, Billing 9.1.0.
- 버전은 Gradle property/env/서명 설정 순서로 읽음. 로컬 서명 설정은 41로 오래됨. 9월 30일 문서 후보 46은 현재 Console 증거가 아님.
- 기존 잠금화면: `LockScreenForegroundService`가 SCREEN_ON에서 `LockScreenActivity` 시작. overlay/specialUse/exact alarm 권한 사용. 실제 기기 동작은 아직 미검증.
- 저장 계약: SharedPreferences `cd_lockscreen`의 `enabled`, `state_json`; 웹 `cd_lockscreen_state_v1`; 설정·읽은 문구 최대 200개·통계. 원래 key 유지.
- 기존 알림 채널 `cd_lockscreen_service`, `cd_lockscreen_alarm` 유지. 채널 차단 우회 금지.
- 문제: 화면 진입 시 기본 ON 재적용 가능, 자동 overlay 권한 요청, 일반 알림 본문만 제공, 잠금 화면에서 별도 WebView에 개인 데이터 표시 가능.

## 기능 보존표 (구현 조사, 실행 결과는 후속 기록)
| 기능 | 기존 진입점 / 구현 근거 | 저장 정보 | 개편 후 / 보존 방법 | 검증 | 제약 |
|---|---|---|---|---|---|
| 명언 | /lock-screen-fortune, lib/lock-screen-content.ts | 읽은 문구·설정 | 동일 상세 + 표준 알림, 기존 풀 재사용 | API36 실제 잠금 알림의 제어 문구·연이 표시 확인; 웹/네이티브 풀 일치 테스트 통과 | 명언 출처 전수 검증 별도 |
| 일일 운세 | 같은 화면, lib/lock-screen-daily-fortune.ts, /api/fortune/today-hub | 프로필·선택 체계 | 같은 상세, 잠금 상태에는 공개 안내 | API36 잠금 상태의 공개 요약 확인; 개인 서버 결과 미검증 | 기존 로컬 해석과 웹 개인 결과는 동일하지 않음 |
| 긍정 확언 | 같은 화면, lib/lock-screen-content.ts | 분야·읽은 문구 | 동일 상세 + 표준 알림 | API36 실제 잠금 알림의 제어 문구·연이 표시 확인 | 펼친 전문은 잠금 해제 후 확인 |
| 전체 화면 자동 표시 | SCREEN_ON → FGS → LockScreenActivity | enabled | 표준 알림 → 잠금 해제 후 상세로 변경 | 미검증 | 자동 전체 화면과 동등하지 않음 |
| 영냥이 6체계·모둠·오마카세 | /yeongnyangi, worker/yeongnyangi/payments/catalog.ts | 기존 주문/상담/보관함 | 기존 라우트·엔진·상품 재사용 | 미검증 | 실제 구매·생성 미실시 |
| 꿀꿀 전체 운세 | /ggulggul, index.html, 서비스 registry | 기존 프로필·결과 | 기존 전체 운세·검색·액션 재사용 | 미검증 | 기능별 전체 E2E 필요 |
| 연이·네오·대표 상담 | /fortune-tea-house, /fortune-chat, /neo-operation-room, /consultations | 기존 서버 상담 | 기존 서비스 렌더러 유지 | 미검증 | 유료 LLM 호출 금지 |
| 로그인·계정·언어 | app/_lib/auth-client, scripts/app-native-bridge.js | 기존 계정/세션 | custom tab + com.codedestiny.app://auth 유지 | 미검증 | 공급자 계정 필요 |
| 구매·취소·복구 | CodeDestinyBillingPlugin, worker/routes/app-store.js | 주문·token·권한 | Play Billing/서버 검증 유지 | 미검증 | Console SKU·라이선스 테스트 필요 |
| 기록·결과 재열람 | /my-records, /yeongnyangi/library | 기존 서버 결과 | 서비스별 원본 결과 화면 유지 | 미검증 | 전체 상품 실결과 필요 |
| 공유·업로드·다운로드 | CodeDestinyNavigationPlugin + Capacitor WebView | 기존 결과/파일 | 기존 시스템 chooser·브라우저 기능 유지 | 미검증 | 카카오·파일 앱 확인 필요 |
| 문의·계정 삭제 | /account/delete, 기존 사이트 문의 진입 | 기존 계정 | 기존 경로 유지 | 미검증 | 운영 삭제 실행 안 함 |

## 디자인 기준
작은 휴대폰에서 읽는 Operate/Read 화면. 짙은 네이비·아이보리·은은한 보라·앤틱 골드, 기존 폰트 유지. 첫 화면의 문장 한 개와 명시적인 전환·설정·닫기. 시스템 시계/잠금 해제 UI를 모사하지 않는다. 영냥이 원본 hero-800.webp를 시각 확인: 흰 장모, 큰 머리·짧은 몸, 보라/금빛 눈, 남색 천체 모자·망토. 연이 두 포즈 선택은 유지.

## 공식 문서 확인
- [Target API](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Payments](https://support.google.com/googleplay/android-developer/answer/9858738): 대체 결제 프로그램 가입은 미확인, 기존 Play Billing 유지.
- [Background Activity](https://developer.android.com/guide/components/activities/secure-bal): OS 동작 허용과 Play 허용은 별개.
- [Notifications](https://developer.android.com/develop/ui/views/notifications/custom-notification)
- [Privacy](https://developer.android.com/develop/ui/compose/notifications/create-notification)
- [16KB](https://developer.android.com/guide/practices/page-sizes)
- [Signing](https://developer.android.com/studio/publish/app-signing)
- [Android 16](https://developer.android.com/about/versions/16/behavior-changes-16)

## 외부 검증 경계
실결제·유료 LLM·운영 DB 쓰기·Play 업로드·프로덕션 승격은 실행하지 않는다. 테스트는 mock이며 실연동으로 폴백하지 않는다. 기존 업로드 키와 Play 앱 서명 인증서는 구분한다. Console 최신 버전과 실제 앱 서명 인증서의 현행 확인 전에는 배포 준비 완료로 판정하지 않는다.

## 실제 구현 변경
- 강제 SCREEN_ON 전체 화면 대신 기존 채널을 사용하는 표준 BigTextStyle 알림. 원래 전체 화면 자동 노출과 동등하다고 판정하지 않는다. 오버레이·정확한 알람·specialUse FGS 권한 제거. 새 권한·SDK·데이터 수집 없음.
- 새 설치는 OFF. 기존 enabled/state_json/로컬 키, 읽은 문구, 누적 통계, 캐릭터, 빈 알림 시간 배열을 유지. 양쪽 설정이 충돌하면 OFF 우선. 구버전 사용자에게 조용한 시간을 임의로 켜지 않음.
- 명언/확언/일일 운세 개별 선택, 조용한 시간, 선호 시각, 캐릭터·기존 배경·글자·버튼 스타일, 테스트 알림, OS 알림 설정 진입. 앱 글자 크기와 OS 알림 글자 크기를 구분.
- 알림의 private/publicVersion 모두 개인 운세·생년·질문·결제 정보 없음. 일일 운세 알림은 잠금 해제 후 상세로 안내. 앱 상세는 /api/fortune/today-hub의 동일 프로필·언어·KST 기준일을 사용. astro/ziwei는 공통 API에 없어 기존 한국어 오프라인 해석을 접힌 참고 영역으로 보존.
- 기존 알림 채널 ID·차단 상태 유지, 비정확 AlarmManager 창(30분), 부팅/업데이트/시간대 변경 재예약. 정각·강제중지 이후 자동 실행을 보장하지 않는다.
- 명언/확언 공개 CMS 풀만 네이티브 캐시에 저장. 웹과 같은 KST epoch-day 및 offset(명언 5, 확언 7)으로 선택하므로 앱을 열지 않아도 예약 시 날짜에 맞게 갱신. 선택 확언 분야도 같은 풀을 사용. 개인 API 결과는 메모리에서만 캐시. 계정 변경 시 표시 알림·캐시 폐기; 이용권 동기화 이벤트 되울림은 제외.
- 상세 Activity는 MainActivity의 동일 라우트 해석기·SDK 등록·WebView 설정을 재사용. 잠금 해제 우회 플래그 제거. AndroidX 뒤로가기 콜백에서 열린 설정→웹 기록→닫기 순서 처리.
- 홈의 작은 잠금화면 카드와 기존 다섯 탭 유지. 엔진·상담 프롬프트·생시 보정·가격·이용권/월정석/단건 결제·서버 DB 스키마 변경 없음.
- 대량 이미지 후처리는 동일 인코딩 품질/크기 안전장치를 유지하면서 최대 4개 파일만 병렬 처리.

## 에셋·화면 검증
- 새 연이: 사용자가 지정한 `C:/Users/user/Desktop/CodeDestiny-Build/연이 프로필1.png`를 시각 확인하고 편집 참조. 연꽃·보라 스카프·분홍 코·짧은 몸 비율 유지. 상세 선택과 알림 largeIcon에 연결.
- 영냥이: 기존 hero를 기준으로 책을 읽는 명언 포즈, 별자리 구슬을 보는 운세 포즈 제작. 기본/확언/홈 진입은 기존 원본 재사용.
- PNG 원본과 WebP 배포본, 크기·SHA256·적용 위치는 `public/assets/yeongnyangi/companion/manifest.json`.
- 알림 small icon은 별도 단색 벡터; 기존 adaptive icon 유지 + API33 monochrome 레이어 추가. 밝은/어두운 배경은 기존 CSS 선택지 유지. 별도 휴식·호흡 애니메이션은 미제작.
- `output/android-20261007/ui-mock/`: 실제 React 컴포넌트 + mock native/profile/API. 기존 12개 언어, 360/390/412/768 폭, 한국어 200% 글자, 설정 열기/닫기, 연이 선택과 오프라인 카드 유지. 시스템 잠금화면/실기기 캡처로 사용하면 안 됨.
- visual-checker: 큰 글자 줄바꿈·스위치 트랙·이미지 로드 대기 수정 후 통과. 두 TSX impeccable detector 0건. 수동 발견한 금색 버튼 대비·선택 aria-pressed·저장 피드백 보완.

## 현재 확보한 검증 증거
|검사|결과|범위|
|---|---|---|
|상태 마이그레이션 node:test|5 통과|실제 TS 함수 AST 실행; OFF/빈 예약/pig2/문구/통계 보존|
|웹/네이티브 공개 풀 계약|1 통과|366일 × 분야 선택 4종; 동일 문구·KST 날짜·개인정보 없는 풀|
|이미지 후처리 node:test|4 통과|크기/화질/중복 안전장치|
|TypeScript --noEmit|통과|최신 소스 재확인|
|서비스 범위 검사|통과|55 routes, 7 groups, 16 actions, 15 performance markers; 전체 E2E 아님|
|기존 check:fast|88 중 87 통과 후 auth listener registry 1 실패|추가 리스너 등록·되울림 필터 수정 후 해당 단독 검사 통과|
|두 번째 check:fast|자원 경합으로 중단|첫 결과를 대체하는 합격 증거 아님; 최종 CI 필요|
|Android 순수 JUnit|3 통과|조용한 시간 경계·잘못된 시간 입력·KST 자정 콘텐츠 변경|
|기존 인증·Google Billing 서버 mock|41/41 통과|auth.app-refresh-token + app-store.google-billing; 운영 DB/Google API 대체, 실결제 아님|
|Android Lint|통과, 0 errors / 33 warnings|기존 리소스·Credentials·locale 등 경고는 보고서에 보존|
|예비 APK instrumentation|5개 검증 통과 + 조건부 캡처 1개 생략|실제 API36, 최종 공개 풀·권한 거부·중복 게시 추가 검사는 후속 기록|
|최종 API36 instrumentation|일반 8개 검증 + 권한 거부 단독 1개 통과|전체 runner 10개 중 권한 거부·캡처 조건부 2개 생략; 거부는 adb로 먼저 회수 후 단독 실행|
|앱 API 리타게팅·오프라인 읽기|11/11 통과|실제 bridge 함수 실행, 다른 화면의 연결 안내 유지|
|실제 OAuth/Play 구매/외부 앱 복귀|미검증|Google/Kakao/Naver 공급자와 Play 라이선스 계정 필요|
|Samsung One UI/실기기/16KB 실행|미검증|가용 환경 없음|

## Play Console 현행 읽기 전용 확인
- 앱: 꿀꿀운세, com.codedestiny.app. Console에서 최고 번들 45(1.0.45), 내부 테스트 활성 확인. 과거 로컬 46 후보와 구분해 이번 후보는 47(1.0.47).
- 기존 업로드 인증서 SHA256: `73:C0:04:68:A5:4D:59:9F:42:96:4E:B2:E2:05:BD:EE:50:B1:66:94:45:32:EE:95:55:40:FC:2E:2C:50:14:27`.
- Play 배포 앱 서명 SHA256(Digital Asset Links 표시): `8C:7A:CE:8C:BB:98:35:78:81:FE:F0:E6:49:EB:D3:94:51:86:4A:4A:31:F4:0E:ED:7F:86:B4:27:E0:3D:53:E0`.
- 업로드 키 APK로 Play 설치본 업데이트가 된다고 주장하지 않는다. Play 내부 테스트 업로드는 이번에 실행하지 않음.
- target/compile 36 유지, min24 유지. 대체 결제 프로그램 가입은 미확인. 기존 Play Billing 서버 검증 흐름 보존.

## 재현 절차와 외부 검증 매트릭스
1. JDK21/Android SDK36 설치, npm 의존성/기존 release-signing.properties(비밀 파일) 준비. 새 키로 대체하지 않는다.
2. `npm run build:mobile:app` → `apps/mobile`에서 `node ../../node_modules/@capacitor/cli/bin/capacitor sync android`.
3. PowerShell에서 `$env:CODE_DESTINY_ANDROID_VERSION_CODE='47'`, `$env:CODE_DESTINY_ANDROID_VERSION_NAME='1.0.47'`을 설정한 뒤 `apps/mobile/android`에서 `gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest :app:bundleRelease :app:assembleRelease --console=plain`. 버전 env가 오래된 로컬 signing properties보다 우선한다. JDK는 설치된 21을 사용한다.
4. 전용 테스트 에뮬레이터에서 `:app:connectedDebugAndroidTest`. 운영 요청 차단. mock 테스트에서 실제 연동 폴백 금지.
5. API24, API33 알림 허용/거부, API34+ 백그라운드 제한, API36/16KB, Pixel/Samsung에서 테스트. OFF 업데이트·빈 시간·한 콘텐츠만 ON·조용한 시간·채널 차단·재부팅·시간대 변경·오프라인·프로세스 종료·큰 글자·TalkBack.
6. Play 라이선스 테스트 계정으로 상품별 성공/취소/실패/pending/통신 단절/중복 webhook·resume/결과 저장·복원. 실제 SKU 가격과 purchase token 검증·acknowledge/consume·환불 반영은 해당 환경에서 확인. 실결제 금지.
7. OAuth 공급자 설정에 업로드 키와 Play 앱 서명 지문을 구분 등록하고 원래 화면 복귀 검증. 현재 native scheme은 com.codedestiny.app://auth.

## 남은 구현·검증 제약 (외부 정보와 구분)
- 시스템 잠금화면 표시는 OEM·OS 설정에 따름. 이전 SCREEN_ON 전체 화면 노출은 유지하지 않음.
- 공개 명언·확언은 캐시된 동일 CMS 풀에서 매일 오프라인 선택한다. CMS 원본 변경은 앱 상세 진입/업데이트 때 새 풀로 반영되며, 개인 결과를 백그라운드 LLM으로 생성하지 않는다.
- 새 부가 문구·분류명도 기존 12개 언어에 제공. OS 앱별 언어 설정과 웹 언어의 완전한 양방향 연동은 미구현. 독일어 좁은 탭의 Tagesdeutung 단어 내부 줄바꿈은 P2 개선 사항이며 내용 누락은 없음.
- astro/ziwei 공통 서버 오늘 결과와 모든 상품별 실제 결과 fixture가 없음. 전체 입력→결과→저장→재열람 검증은 완료로 표시하지 않음.
- 저장 문구의 원래 CMS 명언 출처 전수 조사, 별도 휴식/대기 포즈, 모든 설정 변경의 앱 재생성 UI 복원은 추가 검증 필요.
- 스토어 스크린샷은 실제 최종 APK 화면에서만 채택. mock 그림을 실제 시스템 잠금화면 광고로 사용하지 않는다.

## 빌드·환경 진단
- 예비 웹 번들 기준 SHA: `01f8e8bd869360ced25000443eb4ee3a78d78a8d`. 이 예비 파일은 최종 전달 대상으로 사용하지 않는다.
- `npm run build:mobile:app` 성공(Next 1697 정적 페이지, 운영 API https://code-destiny.com). 로컬 ephemeris 서버 3188을 빌드 입력으로 사용했고 실제 유료 API 폴백 없음. Capacitor sync 성공.
- 이미지 후처리 결과: 2114개 검사, 1282개 최적화/캐시 재사용, 약 47.6MB 절감. 네이티브 public 6844파일, 543600939바이트.
- JDK21.0.11 Gradle 시도는 Java 컴파일/순수 테스트 진행 후 Lint 또는 asset hash 단계에서 장시간 지연해 중단. 완료/합격으로 집계하지 않는다.
- 여유 물리 메모리 190MB까지 하락 관찰. 자체 테스트 에뮬레이터 종료 후 약 4GB 확보. 다른 세션 프로세스는 종료하지 않았다.
- 같은 빌드 파일 100개(23.2MB) 읽기 진단: Android Studio JBR21.0.10 65ms, JDK21.0.11 249ms. JBR21 + Xmx2g + worker1로 Debug 패키징 재시도. 이 비교만으로 전체 지연의 단일 원인을 확정하지 않는다.
- 구버전 cdtest 캡처는 `System UI isn't responding` 대화상자여서 정상 전후 비교에서 제외. 시스템 UI ANR 원인은 미확인이고 CODE DESTINY 자체 ANR로 단정하지 않는다.
- main `3b33ab5982b4d9cdfca1d8f24a512cb6cf43fe79` CI: 핵심/타입·린트 통과, 추천 화면 H1/사이트맵 실패. 다른 세션이 `a2e0c69f0`/`4edfb575e`로 수정한 것을 확인하고 동기화. 최종 CI 상태는 후속 기록.
- 예비 Debug APK 47 빌드 성공: JBR21.0.10, Gradle 3m24s, 304504151바이트. 실제 설치 성공. 최종 오프라인 수정 전 후보라 최종 배포 파일과 구분한다.
- 실제 상세 진입에서 공통 OfflineOverlay가 로컬 문구까지 가림을 발견. `20aaec4f9`에서 읽기 화면만 자체 오프라인 처리를 사용하도록 수정. 다른 화면의 기존 연결 안내 유지 테스트 통과.
- `fc41e0a90`에서 12개 언어와 공개 풀 일일 갱신을 추가. 웹 최종 기준 merge `171bd73bd28420680f25125adec3a335d051e757`에는 동시에 진행된 유료 기록 정책 작업도 포함된다. 이 Android 작업에서 무료 결과 저장 정책을 변경한 것은 아니다.
- 최종 웹 재빌드 첫 시도는 기존 dev 서버 감지로 중단. dev PID16124 시작(10월5일)보다 이번 워크트리/.next 생성(10월7일)이 늦고, main/.next와 별도 실제 디렉터리임을 확인해 문서화된 `ALLOW_DEV_SERVER_DURING_BUILD=1` 사용. 다른 세션 서버는 종료하지 않음.
- `check:fast -- --committed-head`: paid-gate 88/88 통과 후 작업 중 소스 변경에 따른 sitemap drift에서 중단. 원장 재생성 뒤 `verify:sitemap-drift` 통과. 전체 check:fast가 끝까지 통과했다고 집계하지 않는다.
- [공식 앱 크기 가이드](https://support.google.com/googleplay/android-developer/answer/9859372?hl=en-EN)와 [AAB FAQ](https://developer.android.com/guide/app-bundle/faq?hl=en)는 base module 최대 압축 다운로드 500MB를 안내한다. 200MB 초과 시 모바일 데이터 안내가 있을 수 있음. 실제 기기별 Play 제공 크기는 Console 업로드 전 미확인.
- 자동 승인 검토가 생성 RSS/llms 6파일의 git restore를 다른 세션 변경 가능성 때문에 거절. 되돌리지 않고 파일을 보존했으며, 검증된 코드 파일만 별도 stage/commit/push했다.

## 최종 후보 검증
- 최종 웹 `dist/version.json` SHA: `171bd73bd28420680f25125adec3a335d051e757`; 빌드 시각 `2026-10-06T18:33:00.403Z` (KST 10월 7일). `npm run build:mobile:app`와 Capacitor sync 완료. PortOne 차단/Play 전환·기존 서비스 링크 보존 산출물 검사 통과.
- 이 SHA의 [GitHub CI 37510964728](https://github.com/rei1237/codedestiny/actions/runs/37510964728) 전체 통과. 핵심 검사, 타입/린트, 정적 가드, Pages/Worker 빌드 성공. 운영 배포나 실제 결제 증거가 아니다.
- 구버전 `CodeDestiny-1.0.45-45.apk`를 SDK 36.1.0 apksigner로 검증: SHA256 `73c00468a54d599f42964eb2e205bdee50b166944532ee955540fc2e2c501427`, 기존 업로드 키와 일치. Play 설치본 인증서와는 다름.
- 최종 네이티브 명령: JBR 21.0.10, `:app:testDebugUnitTest :app:compileDebugAndroidTestJavaWithJavac :app:lintDebug`, worker 1 / heap 1536m. 1분 4초 성공. Lint 0 errors, 33 warnings; 순수 정책 JUnit 3/3 통과.
- 실제 API36 에뮬레이터 `quote-yeoni-locked.png`, `affirmation-yeoni-locked.png`, `daily-yeoni-locked.png`: PIN 잠금 상태를 dumpsys trust로 확인한 시스템 알림. 새 연이 largeIcon 표시 확인. 명언·확언 전문은 잠금 해제 후 펼친 알림에서 확인했으며, 잠긴 상태에서 펼쳐졌다고 주장하지 않는다.
- `daily-detail.png`는 펼친 시스템 알림이며 앱 상세가 아니다. PIN 입력창·검은 화면·SystemUI ANR 캡처는 정상 증거/스토어 이미지에서 제외한다.
- API36 재부팅 후 최초 PIN 해제 전에는 credential-encrypted 저장소에 접근할 수 없어 instrumentation이 시작되지 않았다. 최초 잠금 해제 후 재실행했다. Direct Boot 자동 동작을 주장하지 않는다.
- 권한을 검사 프로세스 안에서 회수한 첫 시도는 Android 16의 프로세스 종료로 실패했다. adb 권한 회수 → 새 instrumentation 프로세스에서 `allowed=false`, `postContent=false`를 검사하도록 수정해 통과했다.
- 알림 탭 뒤 홈으로 나온 첫 캡처는 이전에 대기 중이던 instrumentation의 종료였다. ActivityManager의 `stop ... due to finished inst` 확인. 해당 캡처는 앱 상세 증거에서 제외했다.
- 후속 실제 Debug WebView: `https://localhost/lock-screen-fortune/index.html?content=quote`, online=false, 연이 `naturalWidth=462`, 가로 overflow=false. 명언·출처·저장·공유 표시와 전체 OfflineOverlay 제거 확인. 시각 검사에서 기존 native bridge의 작은 오프라인 배너가 보조 문구를 덮어 `97f403b73de6eda354afbc5127ca5a8b156b2d88`에서 해당 읽기 화면만 자체 상태 처리로 변경했다.
- 최종 전달 후보의 React 정적 번들 기준은 `171bd73b`, 앱 전용 bridge/네이티브 소스 기준은 `97f403b7`이다. bridge만 바뀌어 기존 모바일 빌드의 `installGuardAsset`과 같은 파일 복사 단계로 `dist/js/app-native-bridge.js`를 갱신한 뒤 `verify-app-no-portone.mjs --dist dist`, Capacitor sync, Gradle APK/AAB 빌드를 다시 실행했다. Next 페이지를 재컴파일했다고 주장하지 않는다.
- Release AAB: Google bundletool 1.18.1 `validate` 통과, jarsigner `jar verified`, 기존 업로드 SHA256 일치. jarsigner의 self-signed/타임스탬프/JarInputStream 순서 경고를 원문 로그에 보존했다. Play 업로드 승인 증거는 아니다.
- Release APK: apksigner 검증과 `zipalign -c -P 16 -v 4` 통과. APK/AAB 내 `.so` 없음; 실제 실행 에뮬레이터는 PAGE_SIZE 4096이므로 16KB 실행은 미검증이다.
- 최종 네이티브 소스 `e3868a2bd1c14c0409b1a475c88c6cdfb732bea5`: 알림 권한 대화상자 복귀 시 열린 설정의 권한 표시 갱신. 최종 Gradle Lint/단위 테스트/Debug APK/Release APK/AAB 명령 3분 58초 성공. 0 errors / 33 warnings 유지.
- 실제 최종 Release: 권한을 거부 상태로 만든 뒤 설정 ON → OS 권한 팝업 → 허용. POST_NOTIFICATIONS granted=true, 이전 차단 안내 0개 확인. 실제 설정의 테스트 알림 게시 성공.
- Release에서 테마 설정의 `Yeoni · 연이`를 선택하고 테스트 알림 게시 → PIN 잠금 상태 `deviceLocked=1`의 새 연이 알림 표시 확인. 알림 탭 → OS `Enter PIN` → PIN 입력 → `LockScreenActivity`, `deviceLocked=0`, 같은 명언·연이 상세로 복귀했다. 이 마지막 경로는 instrumentation 문구 주입이나 내부 Activity 직접 시작을 사용하지 않았다.
- `release47-yeoni-locked.png`: 실제 Release CMS 명언, 접힌 알림은 본문 말줄임이며 앱명 글자는 표시되지 않았다. small icon/연이 largeIcon 정상. 전문·출처·앱명 전체 가독성과 구분한다.
- 기존 `cdtest` VM 연결 소실과 별도 전용 AVD의 background launcher 종료 때문에 구버전 시도가 중단됐다. 실행 세션에 연결한 에뮬레이터에서 다시 시도해 45 → 47 `adb install -r` 성공과 versionCode47/Release 실행을 확인했다. 사용자 설정 전체·실계정 구매 이력의 실제 업데이트 보존은 별도 미검증이다.
- 성능: Debug 오프라인 상세 WebView navigation DOMContentLoaded 967ms / load 1098.8ms. Release MainActivity cold launch `am start -W` 12154ms, 내부 상세 warm 348ms, 최종 상세 cold 7620ms. 자원 경합이 있는 에뮬레이터의 단일 관찰이며 실기기 벤치마크나 성능 개선율이 아니다. cold start 후속 프로파일링 필요.

## 최종 빌드 파일
공통: applicationId `com.codedestiny.app`, versionName `1.0.47`, versionCode `47`, min24/target36. 경로 `D:/Development/code-destiny/output/android-20261007/`.

|파일|바이트|SHA256|서명|
|---|---:|---|---|
|CodeDestiny-1.0.47-47-debug.apk|304974990|95c2feb8bacea2fbbecc2af4b402874b2aab2e3f799228f56a59cdf8a5fadaf2|debug 개발용|
|CodeDestiny-1.0.47-47-release.apk|285472349|c6dc356d7ce772264082f61947c15cc327fe3162ea5c31d747ca0a0e5e5eef6a|기존 업로드 키|
|CodeDestiny-1.0.47-47-release.aab|286706622|d5d191e2e1cafd0074c54d1c7ddfd43680c028d2560053f5b6c272943440ed58|기존 업로드 키|

- `build-artifacts.json`, `logs/`, `mapping/`에 도구 결과와 R8 mapping/seeds/usage/configuration 보존. 공개 서명 지문은 위 Console 절과 일치한다.
- `README.md`에 설치 대상·스토어 변경 설명·실제 화면과 mock 구분. 자동 전체 화면을 광고하지 않는다. 새 권한/SDK/수집 추가 없음; 제거 권한과 기존 수집 범위의 Play 선언·개인정보 정합성 운영 검토는 남는다.
- 자동 검토가 막은 생성 파일은 `preserved-generated/`에 원문 8개(동기화 Gradle 2개 포함), binary diff, 파일별 SHA256으로 보존했다. 생성 변경을 공유 main에 덮어쓰지 않는다.
- 최종 소스 `e3868a2bd1c14c0409b1a475c88c6cdfb732bea5` [CI 37518284491](https://github.com/rei1237/codedestiny/actions/runs/37518284491) 성공. 직전 bridge 포함 변경의 CI 37514953305도 성공. Play 업로드/운영 승격은 실행하지 않았다.

## 이번 Android 작업의 변경 파일

- `__tests__/ui/android-lockscreen-public-pool.test.mjs`
- `__tests__/ui/android-lockscreen-state.test.mjs`
- `__tests__/ui/app-offline-reader.test.js`
- `app/app/AppHomeClient.tsx`
- `app/components/DailyCompanionEntry.tsx`
- `app/components/OfflineOverlay.tsx`
- `app/lock-screen-fortune/companion-copy.ts`
- `app/lock-screen-fortune/companion.css`
- `app/lock-screen-fortune/LockScreenFortuneClient.tsx`
- `app/lock-screen-fortune/page.tsx`
- `app/lock-screen-fortune/use-companion-daily.ts`
- `app/yeongnyangi/_components/Home.tsx`
- `apps/mobile/android/app/src/androidTest/java/com/codedestiny/app/LockScreenNotificationTest.java`
- `apps/mobile/android/app/src/main/AndroidManifest.xml`
- `apps/mobile/android/app/src/main/java/com/codedestiny/app/BootReceiver.java`
- `apps/mobile/android/app/src/main/java/com/codedestiny/app/CodeDestinyLockScreenPlugin.java`
- `apps/mobile/android/app/src/main/java/com/codedestiny/app/LockScreenActivity.java`
- `apps/mobile/android/app/src/main/java/com/codedestiny/app/LockScreenAlarmReceiver.java`
- `apps/mobile/android/app/src/main/java/com/codedestiny/app/LockScreenAlarmScheduler.java`
- `apps/mobile/android/app/src/main/java/com/codedestiny/app/LockScreenNotify.java`
- `apps/mobile/android/app/src/main/java/com/codedestiny/app/LockScreenPolicy.java`
- `apps/mobile/android/app/src/main/java/com/codedestiny/app/MainActivity.java`
- `apps/mobile/android/app/src/main/res/drawable/ic_stat_yeongnyangi.xml`
- `apps/mobile/android/app/src/main/res/mipmap-anydpi-v33/ic_launcher_round.xml`
- `apps/mobile/android/app/src/main/res/mipmap-anydpi-v33/ic_launcher.xml`
- `apps/mobile/android/app/src/test/java/com/codedestiny/app/LockScreenPolicyTest.java`
- `config/sitemap-lastmod.json`
- `lib/lock-screen-content.ts`
- `public/assets/yeongnyangi/companion/daily-original.png`
- `public/assets/yeongnyangi/companion/daily.webp`
- `public/assets/yeongnyangi/companion/manifest.json`
- `public/assets/yeongnyangi/companion/quote-original.png`
- `public/assets/yeongnyangi/companion/quote.webp`
- `public/assets/yeongnyangi/companion/yeoni-original.png`
- `public/assets/yeongnyangi/companion/yeoni.webp`
- `scripts/app-native-bridge.js`
- `scripts/build-mobile-app.mjs`
- `scripts/verify-android-companion-ui.mjs`
- `scripts/verify-auth-changed-listener-coverage.mjs`
