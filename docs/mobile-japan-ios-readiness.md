---
status: done
updated: 2026-10-24
next: 실기기·일본 Play Console·Mac iOS 출시 게이트를 별도 확인한다.
---

# 일본 결제·Android·iPhone 앱 준비

## 현재 범위

기존 Capacitor 앱, 로그인 API, 서버 사용자 ID를 재사용한다. 가입 계정 병합이나 별도 앱 계정 생성은 하지 않는다. 이용권·월정석·단건 결제 가격표를 바꾸지 않는다. 운영 배포와 스토어 제출은 이 작업에 포함하지 않는다.

| 기능 | 앱 경로·처리 | 검증 경계 |
| --- | --- | --- |
| 사주·타로·자미두수·베다점·숙요점·점성술 | 기존 서비스 레지스트리와 내보낸 웹 페이지 | 기능별 결과까지는 기기 확인 필요 |
| 연이 찻집·네오 전략실 | 기존 셸과 상담 API | 새 유료 LLM 호출 없이 검사 |
| 영냥이 상담 보관함 | /yeongnyangi/library/ | /records/와 별개로 유지 |
| 일반 저장 기록 | /records/ | 재열람 시 새 상담 생성·추가 차감 경로 변경 없음 |
| 구매 내역 | /points/history/ → 기존 /api/payments/me?view=history | 같은 서버 계정의 내역 |
| Android 새 구매 | Google Play → 서버 검증 → 기존 권한 지급 | 실결제·Console 설정은 별도 |
| iPhone 새 구매 | 준비 중 안내, Google Play·웹 PG로 우회하지 않음 | StoreKit 상품·서버 영수증 검증 미구현, 출시 차단 |
| 부적 | /app/talismans/ | 승인 v2 15장, 화면 맞춤과 홈·잠금·둘 다 적용 흐름 구현 |

앱 후처리는 웹 결제 화면 /points/와 /premium-unlock/를 제거한다. /points/history/, /insights/, /insights/famous-saju/는 보존한다. 관리자 UI는 기존 정책대로 앱에서 제외한다.

## 일본 Google Play 편의점 현금 결제

Google Play의 일본 지원 결제수단이다. 앱이 편의점 버튼을 직접 만들거나 노출을 보장하지 않는다. 실제 노출은 사용자 국가·Play 계정·상품·Google 결제 화면에 따라 확인해야 한다.

- Android 구매 상태: PURCHASED=1, PENDING=2. 서버 Developer API 구매 상태는 PURCHASED=0이므로 서로 혼동하지 않는다.
- 입금 대기에서는 지급·acknowledge·consume을 실행하지 않는다. 앱 재개, 로그인 변경, Play 구매 갱신 때 서버 검증을 다시 한다.
- Google가 돌려준 cd-intent 식별자를 원래 상담에 연결한다. 같은 가격대의 최신 의도로 추측하지 않는다.
- 기존에 기록된 주문은 임시 의도 만료 뒤에도 같은 소유자의 결제 기록으로 복원한다. 타계정·취소/환불 영수증은 새 권한을 주지 않는다.
- Play가 돌려준 formattedPrice와 통화를 화면에 표시한다. 일본 실판매 가격·세금·정산은 Console 대조 전 미검증이다. 기존 서버 KRW 가격 스냅샷은 일본의 실제 청구액 증거가 아니다.

실출시 전: 일본 테스트 계정, license tester의 지연 승인·지연 취소 수단, 현행 SKU 23개 및 대상 국가·JPY 가격을 확인한다. 실제 현금 결제·환불은 별도 승인이 필요하다. 지급이 보류된 구형 미기록 영수증은 새 구매를 요구하지 않고 주문 검토 대상으로 남긴다.

공식 근거: [일본 Play 결제수단](https://support.google.com/googleplay/answer/9462077?hl=ja), [pending 처리](https://developer.android.com/google/play/billing/integrate#pending).

## 부적과 원본

사용자가 v2 15장과 앱의 홈·잠금화면 설정 연결을 승인했다. 캐릭터는 영냥이와 연이(꽃돼지) 두 정체성이고, 장면은 영냥이·연꽃 속 연이·찻집의 연이 세 가지다. 학업·재물·연애·연락·취업/합격 다섯 주제마다 세 장면을 제공한다.

승인 출처는 `C:\Users\user\Documents\Codex\2026-10-24\x20-2\outputs\talismans-v2`와 `talisman-collection-v2-manifest.json`이다. `public/assets/talismans/originals/`에 원본 바이트를 그대로 복사했고 카탈로그에 실제 크기와 SHA-256을 등록했다. 14장은 941×1672, contact-flower-pig는 940×1672다. 15개 원본의 한글 제목·키워드와 영냥이 표정을 시각 담당이 확인했다. 일본어 UI에서도 그림 속 글자는 한국어임을 안내한다. 4K 원본이라고 표시하지 않는다.

- 선택: 세 장면 × 다섯 주제, 홈·잠금·둘 다, 그림 크기와 위아래 위치.
- 원본 저장: PNG 헤더·실제 크기·SHA-256 검증 후 원본 바이트 그대로 저장한다. 최적화·중복 제거는 원본 폴더를 제외한다.
- 맞춤 이미지: 전체 원본을 비율대로 축소하고 밤 배경 여백을 더한 별도 PNG다. 원본을 자르거나 늘리거나 픽셀 이상 확대하지 않는다. 미리보기와 출력은 같은 `wallpaperFit` 계산을 사용한다.
- 시계·위젯·아이콘은 위치 예시이며 출력에 합성하지 않는다. 실제 기기의 배치는 확인이 필요하다. 원본·맞춤 출력 픽셀 크기를 함께 표시한다.
- 원본 허용 범위: 720×1280 이상, 4096×8192 이하, 25MP·16MiB 이하. 맞춤 캔버스는 최대 2160×4096으로 제한한다.

Android는 사용자가 적용 버튼을 눌렀을 때만 `WallpaperManager.setStream`을 호출한다. 홈은 FLAG_SYSTEM, 잠금은 FLAG_LOCK, 둘 다는 두 플래그를 사용한다. 일반 권한 SET_WALLPAPER만 추가하며 사진 읽기·저장소 전체 권한은 요청하지 않는다. 기기 지원·관리 정책을 먼저 확인하고 양의 wallpaper ID가 반환된 경우에만 적용 응답으로 처리한다. 별도 시스템 선택 화면에서 돌아왔을 때는 적용 여부를 단정하지 않는다. 저장은 ACTION_CREATE_DOCUMENT, 공유는 FileProvider와 시스템 chooser를 사용한다.

iPhone은 저장 동작에서 사진 추가 전용 권한을 요청한다. 저장 성공 후 대상별 설정 안내를 연다. 홈은 기존 배경화면의 홈 화면 사용자화, 잠금은 새로운 배경화면 추가 뒤 홈 화면을 별도 선택, 둘 다는 한 쌍으로 설정하도록 안내한다. 사진 저장을 배경화면 적용 완료로 표시하지 않는다. 비공개 자동 적용 API는 사용하지 않는다.

공식 근거: [Android WallpaperManager](https://developer.android.com/reference/android/app/WallpaperManager), [iPhone 배경화면 변경](https://support.apple.com/ko-kr/102638).

## iOS 빌드와 출시 게이트

Windows에서 공식 Capacitor 8.4.1 SPM 프로젝트를 생성했다. 정적 다중 페이지 라우터, 기존 OAuth URL scheme, App/Browser 플러그인, 원본 저장·공유와 언어 연결을 준비했다. 기존 승인 브랜드 아이콘·시작 화면을 재사용한다.

Mac에서 Xcode 26 이상을 준비한 뒤 다음 순서로 확인한다. 유료 멤버십 가입, 약관 동의, 인증서 생성·업로드는 자동 실행하지 않는다.

```sh
npm ci
npm install --prefix apps/mobile --ignore-scripts
npm run build:mobile:app
node scripts/build-ios-brand-assets.mjs
cd apps/mobile
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

실제 iOS 컴파일·서명·실기기·TestFlight·스토어 심사는 미검증이다. StoreKit 구성, Apple 로그인/계정 삭제 심사 요건, 개인정보·전체 privacy manifest, App Store Connect 상품과 계약 상태를 확인하기 전 제출하지 않는다. 일본의 외부 결제 선택지는 별도 계약·고지·수수료 조건이 있으므로 자동 도입하지 않는다.

앱 자체의 UserDefaults 사용에는 PrivacyInfo.xcprivacy의 CA92.1을 선언했다. 전체 SDK/수집 정보 심사는 별도다. Windows의 cap update가 생성한 SPM 로컬 경로는 슬래시로 정규화했으며 Mac에서는 cap sync ios로 다시 생성한다.

공식 근거: [Capacitor 환경](https://capacitorjs.com/docs/getting-started/environment-setup), [iOS SPM](https://capacitorjs.com/docs/ios/spm), [Apple 일본 배포 조건](https://developer.apple.com/support/app-distribution-in-japan/).

## 검증 기록

- `npm run test:jest -- __tests__/worker/app-store.google-billing.test.js`: 통합 후 94 passed. 입금 대기·지연 복구·원래 주문과 소유자 연결을 mock으로 확인했다.
- `node --test __tests__/ui/talisman-catalog.test.js __tests__/ui/talisman-wallpaper-fit.test.js __tests__/release/mobile-account-content.test.js __tests__/ui/app-shell-locale-hydration.test.js`: 통합 후 23 passed.
- `npm run typecheck`: 부적·native 연결 소스 통과. 후속 언어 수정은 실제 SSR/hydrate 회귀 검사와 ESLint 통과. 변경 UI ESLint 오류0·정적 링크/원본 img 경고6.
- `npm run build:mobile:app`: 고정 통합 소스 `c247d4ec353c730841b8b686791fa1b3d533dfdc` 통과. 앱 결제 차단 및 구매·기록·읽기 경로 보존 검사 포함.
- `npx cap copy android`, `npx cap copy ios`: 같은 최종 웹 자산 복사 성공. native53 release build 성공. 재현 스크립트 `evidence/v53-run-mobile-gradle-direct.ps1`에 JVM·Gradle8.14.3·버전 인자를 보존했다.
- 최종 정적 산출물 UI: ko360/390/430 Android 모의·ko1280 웹·ja390 Android 모의·ko390 iOS 모의 6조건, 넘침/pageerror/44px 미만 조작0. 15장 선택·원본 해시·맞춤 PNG·홈/잠금/둘 다 전달·취소·미지원·권한 오류·재연결 처리 통과. ko/ja iOS 상점은 신규 구매 차단과 내역 경로 유지.
- Worker dry build, iOS CORS, 앱 복귀/API/기록 검사, strict-core encoding 통과. 유료 LLM·실결제·운영 DB를 사용하지 않았다.
- `npm run check:fast -- --plan`: critical. 이전 전체 실행은 90개 중87개 통과 뒤 메모리 부족 등으로 실패했다. 해당 정적 가드2개는 수정 후 개별 통과. 이 로컬 전체 실행을 성공으로 보고하지 않는다.
- `npm run check:pre-push`: 서비스 레지스트리56·public 미러·사이트맵1019·llms·SEO 프로필62 통과.
- 전달 CI: `7e301512c6945c0af069cb874953d6e89a1e52a9`의 [CI](https://github.com/rei1237/codedestiny/actions/runs/40044483012)는 `success`. 코드 통합은 다른 세션의 체크아웃을 변경하지 않고 격리 워크트리에서 처리했다. 강제 push·PR 생성 없음.
- 빌드 소스와 전달 CI 소스의 차이는 테스트 변수명·문서·결제 동결 검증 해시의 5개 파일뿐이다. 실행 소스가 동일함을 `evidence/mobile-53-runtime-equivalence.json`으로 확인했다. 테스트의 예약 변수명은 기존 main 수정을 통합했고, 상위 main의 결제 파일 캐시 버전 변경은 공식 해시 갱신 명령으로 반영했다. 결제 검증을 우회하지 않았다.
- 최종 CI의 `CI required`, 타입·린트, 정적 가드, 중요 영역 검사와 Pages/Worker 빌드가 성공했다. `Paid Flow Gates`도 같은 전달 SHA에서 성공했다. 시각 검수는 14장 직접 확인 결과 새 차단 이슈0이며 실제 기기 검증은 남는다.

증거: `D:\Development\code-destiny\output\mobile-japan-ios-20261024-033316\evidence`. 실제 기기 배경화면 변경은 mock/캡처 검증으로 대체하지 않는다. 공통 오프라인 화면은 기존 정책대로 조작을 막고 재연결 시 복귀한다.

## 유지한 정책과 남은 출시 확인

이 작업에서 이용권·월정석·단건 결제의 가격과 혜택을 새로 정하지 않았다. 통합한 main의 승인된 이용권 v5 정책을 그대로 포함한다. 기존 로그인 API와 서버 계정, 구매 내역, `/records/`와 `/yeongnyangi/library/`의 분리, 저장 결과 재열람을 유지한다. 결제 지연 상태/영수증 연결 및 PurchaseIntent 보존 코드 변경은 요청 범위에 포함된다. 운영 DB 인덱스는 변경하지 않았다.

실출시 전 확인: Android 실기기의 저장·공유·권한·홈/잠금/둘 다 적용, 같은 계정의 웹↔앱 구매 내역과 결과 재열람, 일본 Play 국가·현행SKU23개·JPY 가격·지연 승인/취소, 운영 PurchaseIntent TTL30일 인덱스, Mac Xcode·서명·StoreKit·개인정보/심사 요건. 연결된 adb 기기는 없었다. iOS 신규 구매는 준비 중이며 StoreKit 미구현은 출시 차단 조건이다. 실결제·환불·운영 DB 변경·운영 승격·스토어 업로드는 실행하지 않았다.

## Android 1.0.53 설치 후보

빌드 소스: `c247d4ec353c730841b8b686791fa1b3d533dfdc`. 검증된 main의 이용권 v5/유효기간 정책과 후속 캐릭터 렌더 수정을 통합한 고정 스냅샷이다. APK/AAB 생성, release lint와 signing task가 성공했다. 기존 1.0.52는 통합 전 부적 기능 검수본으로 별도 보존하며 최신 전달본으로 사용하지 않는다.

| 파일 | 크기 | SHA-256 |
| --- | --- | --- |
| codedestiny-1.0.53-c247d4ec3.apk | 461,392,402 bytes / 440.0 MiB | `a2df9df70395fb7f4c8dada0f8967857951a89345b5ff17a026e2f48384ad4a7` |
| codedestiny-1.0.53-c247d4ec3.aab | 461,788,286 bytes / 440.4 MiB | `569cf2c555ebf1d16669c7e04457611d6b19505d9d0b44c0c8e1b356beb384a3` |

저장 위치: `D:\Development\code-destiny\output\mobile-japan-ios-20261024-033316`. `artifact-manifest-1.0.53.json`, `SHA256SUMS.txt`, `mapping-1.0.53-c247d4ec3.txt`와 검증 로그를 함께 보존했다.

- APK: apksigner v2 검증, `com.codedestiny.app`, versionCode 53 / versionName 1.0.53, minSdk 24 / targetSdk 36 확인.
- AAB: jarsigner `jar verified` 확인. 자체 서명 인증서·타임스탬프 경고는 남으며 Play Console의 업로드 인증서와 대조하지 않았다.
- 두 패키지의 version.json 소스 SHA, 승인 원본 15장의 SHA-256, 부적·상점·구매 내역·일반 기록·영냥이 보관함·인사이트·유명인 사주 7개 경로와 복사본 해시가 일치한다.
- iOS 웹 자산도 같은 소스 SHA/원본 15장과 일치한다. Xcode 컴파일·서명·실기기 성공을 뜻하지 않는다.

53 / 1.0.53은 로컬 후보 번호이며 Play Console의 최신 버전과 대조하지 않았다. AAB 파일 크기는 실제 다운로드 크기와 다르다. 2026-10-24 확인한 [Google Play 크기 기준](https://support.google.com/googleplay/android-developer/answer/9859372?hl=en-GB)은 기본 모듈의 압축 다운로드 크기 500 MB다. 최종 다운로드 크기는 Console 또는 bundletool로 별도 측정하며, 현재 파일 크기만으로 제출 가능 판정을 내리지 않는다. 업로드·심사·운영 배포는 수행하지 않았다.
