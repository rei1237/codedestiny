---
status: blocked
updated: 2026-10-24
next: 최신 Android 산출물 검증, main CI 복구 후 전달, iOS Mac/StoreKit 검증
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

- 모의 서버 결제 94개, 앱 복귀/API/기록 보존 검사 26개(후속 메뉴 검사 1개 추가), iOS CORS 1개가 통과했다.
- 최신 v2 카탈로그·실제 원본 해시·맞춤 계산·앱 메뉴 검사 22개 통과. `npm run typecheck` 통과. 변경 UI ESLint는 오류 0, 정적 다중 페이지 링크·원본 img 관련 경고 6개다.
- 최신 Android `:app:compileDebugJavaWithJavac`: BUILD SUCCESSFUL, 24s, 68 tasks. APK/AAB·실기기 완료를 뜻하지 않는다.
- Worker dry build 통과. 정책·가격 검사는 코드 레지스트리 대조이며 일본 Play Console의 실제 JPY 판매 가격을 증명하지 않는다.
- 정적 앱 React #418 원인은 앱 헤더의 인라인 API 초기화였다. 외부 브릿지로 옮긴 뒤 실제 Next 출력+수정 후처리의 부적·상점에서 pageerror 0을 확인했다. 후속 v2 전체 `npm run build:mobile:app`도 통과했다. Next 1843개 페이지 생성, 앱 HTML 1850개 가드·결제 차단·기존 기록/읽기 경로 보존을 확인했다.
- `check:fast -- --plan`은 critical. 전체 실행은 90개 중 87개 통과 뒤 메모리 부족 등으로 실패했다. 두 정적 가드는 수정 후 개별 통과했지만 전체 Jest/공식 게이트 통과로 보고하지 않는다.
- origin/main a62384f3057afa885375feb1b9aac5fa35c821c7의 CI required·Static guards·paid-flow-gates 실패를 확인하여 그 위로 병합·push하지 않았다. 최종 전달 전 현재 결과를 한 번 재확인한다.

최종 v2 화면: 한국어 360/390/430px Android 모의·1280px 웹, 일본어 390px Android 모의, 한국어 390px iOS 모의의 6개 조건에서 넘침/실행 오류/44px 미만 조작 0개. 15장 선택 및 해시, 맞춤 PNG 크기, 홈/잠금/둘 다 전달, 원본 저장 해시, chooser 복귀·취소·미지원·사진 권한 안내가 통과했다. 시각 담당은 캡처와 맞춤 출력에 blocker 0, 제한된 ship 판정. 네이티브 시스템 응답은 mock이며 실기기 성공으로 확대하지 않는다. 공통 오프라인 화면은 연결이 끊기면 조작을 막으며 다시 연결하면 복귀한다.

남은 확인: Android 실기기의 저장·권한·홈/잠금/둘 다 적용과 하단 문구, 일본 Play 계정/상품·지연 승인/취소, 같은 계정의 웹↔Android↔iPhone 구매 내역과 보관함 재열람, Mac iOS 빌드·StoreKit. 연결된 adb 기기는 없었다. 운영 TTL 인덱스 변경, 실결제, 배포, 스토어 업로드는 실행하지 않았다.


## 실행 명령과 증거

- `npm run test:jest -- __tests__/worker/app-store.google-billing.test.js`: 94 passed.
- `node --test __tests__/ui/talisman-catalog.test.js __tests__/ui/talisman-wallpaper-fit.test.js __tests__/release/mobile-account-content.test.js`: 22 passed.
- `node --test __tests__/ui/app-shell-locale-hydration.test.js`: 1 passed. 일본어 상점은 정적 한국어와 초기 렌더를 맞춘 뒤 즉시 선택 언어를 반영하고 언어 변경 이벤트도 처리한다.
- `npm run typecheck`: 통과(최종 부적·native 연결 소스). 후속 언어 수정은 hook 회귀 검사와 해당 파일 ESLint 통과.
- `npx eslint app/app/talismans/TalismanStudio.tsx app/app/talismans/catalog.ts app/app/talismans/wallpaper-fit.ts`: 오류0, 기존 다중 페이지 링크/원본 img 경고6.
- `npm run build:mobile:app`: 최종 32bdae18207a0ca2fdf56802e3fc85ef1aadf97e 산출물 통과. 일본어 상점 초기 문구 불일치를 수정한 뒤 한국어/일본어 상점 모두 pageerror0, 신규 구매 차단·구매내역 링크를 확인했다. 부적6조건도 최종 산출물에서 다시 통과했다.
- `npx cap sync android`, `npx cap sync ios`: 최종 32bdae182 산출물로 두 플랫폼 동기화 통과. iOS 동기화는 Xcode 컴파일을 뜻하지 않는다.
- `gradlew.bat :app:compileDebugJavaWithJavac`: 최신 Java 코드 24초 BUILD SUCCESSFUL.
- `npm run verify:entry-encoding -- --strict-core`: 통과.

증거 보존 위치: `D:\Development\code-destiny\output\mobile-japan-ios-20261024-033316\evidence`. 승인 v2 원본→앱 15개 해시·해상도는 `talismans-v2-source-evidence.json`에 기록했다. 캡처의 시각 검토와 native 모의 검사는 실제 기기의 배경화면 변경 증거가 아니다.

전달 직전 한 번 다시 확인한 origin/main은 a62384f3057afa885375feb1b9aac5fa35c821c7이며 [CI required](https://github.com/rei1237/codedestiny/actions/runs/40014072839/job/120626899788)가 여전히 failure다. 이 작업의 변경은 아직 원격에 없다. 병합·push·공식 CI·배포 완료로 표시하지 않는다.

실출시 전에 운영 PurchaseIntent TTL 인덱스가 30일 설정과 일치하는지 승인된 운영 절차로 확인해야 한다. 모델 코드 수정만으로 기존 운영 인덱스의 변경을 증명하지 않는다.


## Android 설치 후보

최종 소스 32bdae18207a0ca2fdf56802e3fc85ef1aadf97e로 APK/AAB 생성 중이다. 로컬 후보 버전은 versionCode 52 / versionName 1.0.52이며 기존 서명 설정을 사용한다. Play Console의 최신 버전 번호·앱 서명과 대조한 번호는 아니므로 제출 가능 판정으로 쓰지 않는다. 앱 삭제나 데이터 초기화를 통한 설치 우회는 하지 않았다.

앱의 원시 웹 자산은 약 738.8MiB/11641파일이다. 실제 다운로드 크기는 로컬 AAB 파일 크기와 다르며 Console 또는 bundletool에서 별도 측정해야 한다. [Google Play 공식 크기 기준](https://support.google.com/googleplay/android-developer/answer/9859372?hl=en-GB)은 압축 다운로드 기준으로 base module 500MB다. 현재 작업에서는 Console 업로드·심사를 수행하지 않았다.
