# iOS Phase 3 보고서: 프로젝트 골격과 WebShell

- 작성: 2026-11-19
- 기준 프롬프트: [02-ios-port Phase 3](../../prompts/2026-11-18-02-ios-port.md#phase-3--프로젝트-골격과-webshell)
- 이전 단계: [phase-2.md](phase-2.md)
- 환경: Windows 작업 PC. `xcodebuild`·`swift`·시뮬레이터가 없다. 프롬프트 6절에 따라 **코드 작성과 정적 검증까지만** 했고, 빌드·실행 검증은 6절 사용자 체크리스트로 넘긴다.

## 1. 요약 (3줄)

1. 기존 Capacitor 8.4.3 iOS 셸(Q1 결정)에 WKWebView 체크리스트를 채웠다. 흰 화면 방지 배경, UA 토큰, 스와이프 백, 키보드 내리기, 링크 미리보기 끄기, 한국어 대화창, `window.open`·외부 링크를 앱 안 Safari 시트로 여는 처리, 상태바 테마 동기화가 들어갔다.
2. 네이티브 문자열은 `Localizable.xcstrings`(en·ko·ja·zh-Hans·zh-Hant)에 두었다. 카메라 입력이 있는 화면(손금·문의 첨부) 때문에 `NSCameraUsageDescription`을 추가했고, 배포 타깃을 iOS 17로 올렸다.
3. 작성 시점에는 Mac이 없어 정적 검사만 했다. 2026-11-19에 macOS CI 러너에서 컴파일(오류 0)과 시뮬레이터 실행·스크린샷까지 확인했다(4절 "CI 시뮬레이터 검증"). 손 조작이 필요한 항목은 여전히 기기 확인 전이다.

## 2. 결정과 이유

| # | 결정 | 이유 | 전문가 관점 |
|---|---|---|---|
| D1 | SwiftUI 앱·새 프로젝트로 옮기지 않고 `CAPBridgeViewController` 하위 클래스를 확장한다 | Phase 0 Q1(Capacitor 유지). 브리지·플러그인·라우터가 이미 그 위에서 돈다. SwiftUI 생명주기는 Capacitor 템플릿(`AppDelegate` + storyboard)과 충돌한다 | iOS: 하이브리드 셸에서 생명주기 이원화는 버그 원천이다 |
| D2 | Capacitor의 UI 위임자를 **우리 프록시로 교체**하되 `prompt()` JSON 페이로드는 원래 처리기로 넘긴다 | Capacitor 기본값은 버튼이 영어("Ok")이고, confirm·prompt는 VC가 없으면 completion을 부르지 않아 웹이 멈출 수 있다. `window.open`은 무조건 `UIApplication.open`이라 앱 안 URL(`capacitor://`)은 아무 일도 일어나지 않는다. 쿠키·HTTP 동기 브리지는 prompt를 타므로 그 경로만 원본에 위임한다 | WebKit: completion 미호출은 WebKit 예외(크래시)·웹 정지의 대표 원인 |
| D3 | 외부 사이트로 가는 **사용자 탭**(`linkActivated` 또는 `_blank`)은 `SFSafariViewController`로 연다. 스크립트·리다이렉트 이동은 Capacitor 기본(Safari 앱)을 유지한다 | 체크리스트 "그 외는 SFSafariViewController". 리다이렉트까지 시트로 가로채면 결제·인증 리다이렉트 흐름을 예측하기 어렵다 | 심사: 앱 밖으로 튕기는 링크는 4.2 "웹 래퍼" 인상을 키운다 |
| D4 | 자기 도메인 `/api/` 최상위 이동은 무시하고, `/api/auth/`만 기존 동작(시스템 브라우저)을 남긴다 | Android `CodeDestinyNavigationPlugin.java`와 같은 규칙. OAuth를 WKWebView 안에서 진행하지 않는다(절대 규칙 7). ASWebAuthenticationSession 전환은 Phase 5 범위 | 보안: API JSON이 문서로 렌더되는 경로 차단 |
| D5 | 카메라·마이크 권한 자동 허용을 **앱 출처(`capacitor://localhost`)로만** 좁혔다 | Capacitor 기본은 모든 출처에 `.grant`다. 외부 iframe이 사용자 확인 없이 카메라를 쓰는 경로를 닫는다. 앱 자체는 `getUserMedia`를 쓰지 않는다(검색 범위: `app js lib index.html`, 0건) | 개인정보: 출처별 최소 권한 |
| D6 | 상태바는 Android와 같은 JS 표면 `Capacitor.Plugins.StatusBar.setStyle`을 iOS에서도 구현했다 | 셸 `applyTheme`가 이미 이 이름을 방어적으로 부른다(`index.html:38827`). 공식 플러그인을 넣으면 lockfile이 바뀐다 | 계약: 웹은 플랫폼을 몰라야 한다(4장) |
| D7 | UA 토큰 `CodeDestinyApp/iOS/{CFBundleShortVersionString}`을 `applicationNameForUserAgent`에 덧붙인다 | Safari UA는 그대로 두고 로그 식별만 추가한다. 서버·웹 분기는 이 토큰을 읽지 않는다(플랫폼 판별은 Phase 2 브리지 핸드셰이크) | 호환: UA 스니핑 회귀 없음 |
| D8 | 배포 타깃 15.0 → 17.0 (pbxproj 4곳). `CapApp-SPM/Package.swift`의 `.iOS(.v15)`는 CLI 관리 파일이라 두었다 | 프롬프트 "iOS 17+". 앱 타깃이 17이면 패키지 하한 15는 문제가 없다 | — |

### 보류 (근거와 함께)

| 항목 | 보류 이유 | 언제 |
|---|---|---|
| Swift 6 언어 모드 | 컴파일할 수 없는 환경에서 strict concurrency 오류를 대량으로 만들 위험. Capacitor 8 플러그인 API는 `@MainActor` 주석이 불완전하다 | Mac 빌드가 되는 첫 단계에서 경고 수부터 측정 |
| Staging xcconfig | 도메인·Worker URL은 웹 번들에 이미 있고, 네이티브가 읽는 값이 아직 없다. 크래시 리포터 DSN은 SDK 선정(승인 필요) 뒤 | Phase 8(크래시 리포터) |
| entitlements | Associated Domains(Phase 4), Sign in with Apple(Phase 5), Push가 아직 없다. 빈 파일은 서명만 복잡하게 한다 | Phase 4·5 |
| 네이티브 스켈레톤 + `app.ready` 크로스페이드 | 웹이 `app.ready`를 아직 보내지 않는다. 지금은 스플래시·웹 부팅 게이트·웹뷰 배경을 같은 `#1b1028`로 맞춰 흰 깜빡임을 막았다 | 03 UX 또는 Phase 8 |
| Dynamic Type `--cd-font-scale` | 이 변수를 쓰는 CSS가 없다. 지금 넣으면 죽은 코드 | 03 UX |
| 오프라인 화면(`NWPathMonitor`) | 셸이 번들 로컬(`capacitor://localhost`)이라 첫 로드는 네트워크와 무관하다. API 실패는 웹이 처리한다 | Phase 8 |
| 프로세스 종료 복구의 스크롤 복원 | Capacitor가 `bridge.reset()` + `webView.reload()`로 같은 URL을 다시 연다. 스크롤 위치는 복원하지 않는다 | Phase 8 |
| `app.resume` 이벤트 | 기존 `@capacitor/app`의 `appStateChange`가 이미 웹에 전달된다(`scripts/app-native-bridge.js` 1460·1710행 리스너) | 계약 v1 확정 때 이름만 맞춤 |
| `WKDownloadDelegate` | 결과 PDF·이미지 다운로드는 `CodeDestinyWallpaper.exportImage`(사진 저장·공유 시트)로 처리한다 | 해당 없음 |

## 3. 변경 파일

- [apps/mobile/ios/App/App/CodeDestinyViewController.swift](../../../apps/mobile/ios/App/App/CodeDestinyViewController.swift)
  - `:25` `CodeDestinyLinks`: 자기 도메인 판별, 앱 URL 변환, 최상위 VC 찾기, `presentInAppBrowser`(`:50`, SFSafariViewController)
  - `:68` `webViewConfiguration(for:)` 재정의: UA 토큰
  - `:81` `capacitorDidLoad`: StatusBar 플러그인 등록, 배경·`underPageBackgroundColor`(`:93`), `keyboardDismissMode`(`:94`), `allowsBackForwardNavigationGestures`(`:95`), UI 위임자 교체(`:101`)
  - `:109` `CodeDestinyUIDelegate`: alert `:127`, confirm `:133`, prompt `:140`(Capacitor 페이로드 위임 `:146`), 권한 `:158`, `createWebViewWith` `:167`
  - `:187` `CodeDestinyNavigationPlugin.shouldOverrideLoad`: `/api/auth/` 유지 `:193`, 외부 탭 → 시트 `:207`
  - `:218` `CodeDestinyStatusBarPlugin`(`setStyle`, `:229`)
- [apps/mobile/ios/App/App/Localizable.xcstrings](../../../apps/mobile/ios/App/App/Localizable.xcstrings) (신규) `dialog.ok`, `dialog.cancel` 5개 언어
- [apps/mobile/ios/App/App.xcodeproj/project.pbxproj](../../../apps/mobile/ios/App/App.xcodeproj/project.pbxproj): xcstrings 빌드 파일·파일 참조·그룹·Resources, `knownRegions`에 zh-Hans·zh-Hant, `IPHONEOS_DEPLOYMENT_TARGET = 17.0`(4곳)
- [apps/mobile/ios/App/App/Info.plist:9](../../../apps/mobile/ios/App/App/Info.plist#L9) `NSCameraUsageDescription`
- `apps/mobile/ios/App/App/ko.lproj/InfoPlist.strings`, `ja.lproj/InfoPlist.strings`: 카메라 문구
- [apps/mobile/capacitor.config.ts:36](../../../apps/mobile/capacitor.config.ts#L36) `ios` 블록(`backgroundColor`, `allowsLinkPreview: false`). Android 런타임은 읽지 않는다
- [package.json:525](../../../package.json#L525) `mobile:ios:sync`, `mobile:ios:open` (스크립트만, lockfile 변경 없음)

## 4. WKWebView 체크리스트와 검증 결과

"정적"은 Capacitor 8.4.3 원본 소스 대조와 파일 형식 검사, "CI"는 아래 "CI 시뮬레이터 검증"(macOS 러너 실측), "기기"는 6절 체크리스트로 사람 확인이 여전히 필요하다는 뜻이다.

| 항목 | 구현 | 근거 | 검증 |
|---|---|---|---|
| 공유 `WKWebViewConfiguration`, 영속 `WKWebsiteDataStore.default()` | 기존(Capacitor) | `CAPBridgeViewController.webViewConfiguration`이 `WKWebViewConfiguration()` 기본(영속 저장소)을 쓴다 | 정적 ✅ / 기기: 재실행 뒤 로그인 유지 |
| UA 토큰 | ✅ 신규 | `:68` | CI ✅ `…Mobile/15E148 CodeDestinyApp/iOS/1.0.59` |
| `isOpaque=false` + 배경·`underPageBackgroundColor` | ✅ 신규 + config | `:81-93`, `capacitor.config.ts:36` | CI 부분 ✅ 실행 30초 뒤 흰 화면 아님 / 기기: 콜드 스타트 순간·오버스크롤 |
| `contentInsetAdjustmentBehavior = .never` + `viewport-fit=cover` | 기존 | Capacitor 기본 `never`, `index.html:504` | CI 부분: 상태바·홈 인디케이터에 가린 콘텐츠 없음. ⚠️ 헤더 위 약 70pt 빈 띠(추정: 상단 safe-area 중복) / 기기 |
| `keyboardDismissMode`, 핀치 줌 끄기, `allowsLinkPreview=false` | ✅ 신규 / 기존 / ✅ config | `:94`, Capacitor `scrollViewWillBeginZooming`, config | 기기 |
| `allowsBackForwardNavigationGestures` | ✅ 신규 | `:95` | 기기: 하위 화면에서 왼쪽 가장자리 스와이프 |
| 내비게이션: 허용 도메인 내부, 그 외 SFSafariViewController, `tel:`·`mailto:`·`kakaotalk:`, `_blank` | ✅ 신규 + 기존 | `:187-212`, 비 http 스킴은 Capacitor가 `UIApplication.open` | 기기 |
| UIDelegate: alert·confirm·prompt, `window.open`, 파일 업로드 | ✅ 신규 / 파일 입력은 WebKit 기본 | `:109-180`, 카메라 문구 `Info.plist:9` | 기기: 손금 카메라·갤러리, 문의 첨부 |
| 프로세스 종료 복구 | 부분(기존) | Capacitor reload. 스크롤 복원 없음 → 보류 | 기기(어려움): 메모리 압박 |
| 오프라인 화면 | 보류 | 2절 | — |
| Dynamic Type | 보류 | 2절 | — |
| 다크 모드 + 상태바 동기화 | ✅ 신규 | `:218`, 셸 `index.html:38827` | CI 부분: 홈의 어두운 상단 띠 위 흰 아이콘 / 기기: 테마 전환 시 아이콘 색 |
| `isInspectable` Debug만 | 기존 | Capacitor는 `#if DEBUG` 또는 `CAPACITOR_DEBUG=true`(debug.xcconfig, Debug 구성만) | 정적 ✅ |
| `WKDownloadDelegate` | 해당 없음 | 2절 | — |

정적 검사(실측, 2026-11-19):
- `Localizable.xcstrings` JSON 파싱 성공, `Info.plist` XML 파싱 성공·키 21개 중복 0
- Swift 괄호 균형(문자열·주석 제외) `{}` 86/86, `()` 200/200, `[]` 28/28. 사용한 문자열 키 2개가 모두 카탈로그에 있다
- 대조한 Capacitor API: `InstanceConfiguration`(NS_SWIFT_NAME), `CAPBridgeViewController.webViewConfiguration(for:)`·`setStatusBarStyle(_:)`·`capacitorDidLoad()`(loadView 안 `prepareWebView` 뒤 호출), `WebViewDelegationHandler`(open, prompt 메서드 open). `bridge`는 `CAPBridgeProtocol`이라 `webViewDelegationHandler`가 보이지 않아, 설치된 `webView.uiDelegate`를 캐스팅해 쓴다
- `npm run check:fast`: 7절 커밋 기록 참조

### CI 시뮬레이터 검증 (2026-11-19, Mac 없이)

워크플로 [ios-shell-build.yml](../../../.github/workflows/ios-shell-build.yml)이 macOS 러너에서 서명 없이 Debug 빌드하고, 시뮬레이터에서 앱을 띄워 스크린샷·로그·셀프 테스트를 artifact로 남긴다. 게이트가 아니다(`CI required`에 없음). 수동 실행과, iOS 셸 경로를 건드린 main push 때 돈다. 시크릿을 쓰지 않는다. 공개 저장소라 표준 macOS 러너는 무료다.

| 실행 | SHA | 결과 | 시간 |
|---|---|---|---|
| [44468925274](https://github.com/rei1237/codedestiny/actions/runs/44468925274) (push) | `4f783670d` | ✅ 첫 컴파일에서 오류 0 | 55m57s. 웹 번들 45분, 그중 앱 이미지 재인코딩 34분(캐시 없음) |
| [44504839888](https://github.com/rei1237/codedestiny/actions/runs/44504839888) (push) | `b3b77221c` | ✅ 이미지 캐시 저장, 셀프 테스트 항목 확장 | 약 50분 |
| [44514144887](https://github.com/rei1237/codedestiny/actions/runs/44514144887) (dispatch) | `bcce826eb` | ✅ 캐시 적중 | 약 24분(웹 번들 12분) |

환경: Xcode 26.6(17F113), iPhone 17 Pro 시뮬레이터, iOS 26.5. 시뮬레이터 로케일은 영어라 홈이 영어로 뜬다(`?lang=en`).

자동 확인된 것
- 빌드: `** BUILD SUCCEEDED **`. 오류 0, `CodeDestinyViewController.swift` 경고 0. 그 밖의 경고는 `appintentsmetadataprocessor` 1건(AppIntents 미사용, 무해)
- 실행: 30초 뒤와 커스텀 스킴 열기 뒤에도 앱 프로세스가 살아 있다
- 홈 스크린샷(`visual-checker` 판정, run 44468925274): 흰 화면 아님. 헤더 "꿀꿀 운세", 카드 2장(꽃돼지·영냥이), 하단 탭 4개가 렌더됐다. 상태바 영역은 어두운 남색이고 흰 아이콘이 읽힌다. 홈 인디케이터 위 탭바는 잘리지 않았다
- 셀프 테스트(Debug 전용, 실행 인자 `-cdSelfTest`, `CodeDestinyViewController.swift` `#if DEBUG`): UA 토큰 있음, `Capacitor.getPlatform()` = `ios`, 바닐라 브리지 `<script src="/js/app-native-bridge.js">` 주입됨, `window.__CODE_DESTINY_RUNTIME_TARGET` = `mobile-app`, `window.CodeDestinyNative` 있음
- Capacitor 콘솔: 로케일 플러그인 `initialize` 왕복, `@capacitor/app` 리스너 등록, `[CD-APP] boot`
- 커스텀 스킴 `com.codedestiny.app://`이 이 앱에 등록됐다. 시뮬레이터가 `Open in "꿀꿀운세"?` 확인창을 띄운다. 누르기 전이라 `appUrlOpen` 수신은 확인하지 못했다

CI가 찾은 결함 (이 Phase 범위 밖, 후속)
- ✅ (be7c3671a에서 수정) **홈 `<html>`에 `data-platform`·`data-runtime-target`이 없다.** 원인(웹 빌드 `out/`에서 재현): 앱은 `appStartPath: "/index.html"`로 부팅하는데, 프리렌더는 `/` 기준이다. 그래서 `AppChrome`의 `usePathname()`이 클라이언트에서는 `/index.html`이 되어 `hideChrome`이 서버와 달라지고, `GlobalHeader`가 끼어들어 #418이 난다. React가 루트를 다시 렌더하면서 브리지가 찍은 `<html>` 속성을 지운다. 수정: 브리지가 하이드레이션 전에 주소의 `/index.html` 꼬리를 `history.replaceState`로 뗀다. 확인(run 44567360939): 홈 `htmlAttributes`에 `data-runtime-target,data-platform`이 있고 #418이 없다. Android도 같은 부팅 경로와 브리지를 쓰므로 함께 고쳐진다(코드로 추론, 기기 미확인)
- `__cdNativeBridgeClient`는 홈에 로드되지 않는다(`info: "missing"`). `getInfo()` 확인은 그 스크립트를 싣는 화면에서 해야 한다
- ⚠️ (일부 수정) 헤더 위 약 70pt 빈 띠. 원인: 브리지의 `body{padding-top:env(safe-area-inset-top)}`와 `GlobalHeader`의 자체 `padding-top:env(...)`가 겹쳤다. 홈에서만 보인 것은 위 #418 때문에 홈에 `GlobalHeader`가 끼어든 탓이다. 6c9dfb1f3은 `html[data-platform="ios"]`에서 `GlobalHeader`가 있는 페이지의 body 패딩을 0으로 둔다(Chrome 62px 인셋 에뮬레이션에서 헤더 top 0, 본문 68px로 웹과 같음). 그런데 run 44567360939의 `home.png`는 실제로는 `/about/` 화면이었고, 빈 띠는 사라졌지만 헤더 내용이 상태바와 겹쳤다. 기기에서 헤더의 `env()`가 0인지, 스크롤 상태 때문인지는 아직 측정하지 못했다. 다음 할 일: 셀프 테스트에 레이아웃 측정값(`scrollY`, `env(safe-area-inset-top)`, 헤더 `padding-top`·`top`)을 넣고, 홈 스크린샷을 링크 테스트 전에 찍도록 고친다. 측정값이 `env()`=0을 보이면 6c9dfb1f3을 되돌린다

## 5. 레드팀 (지금 제출하면 반려될 이유)

1. **4.2 최소 기능**: 아직 웹을 감싼 셸이다. 네이티브 가치 기능(Phase 7)이 없으면 반려 위험이 가장 크다.
2. **로그인**: Google·Naver·Kakao 시작이 시스템 브라우저(Safari 앱)로 빠졌다가 돌아온다. 4.8에 따라 Sign in with Apple이 필요하고, 앱 밖 이동은 UX 반려 사유다 → Phase 5.
3. **결제**: StoreKit이 없다. iOS 결제 진입은 Phase 2에서 막았지만(체크아웃 창 0) 유료 콘텐츠 접근 경로가 비어 있으면 2.1 "불완전한 앱"으로 볼 수 있다 → Phase 6.
4. `UIRequiredDeviceCapabilities`가 Capacitor 템플릿의 `armv7`이다. iOS 17 전용 arm64 빌드와 맞지 않아 업로드 검증 경고 가능성이 있다(추정, Mac 업로드에서 확인).
5. 가로 방향이 iPhone에서도 허용돼 있다. 웹이 세로 레이아웃만 다듬었다면 스크린샷 심사·UX에서 깨질 수 있다(추정).
6. 개인정보: `PrivacyInfo.xcprivacy`는 있으나 카메라 사용 추가에 따른 개인정보 라벨(App Store Connect) 갱신이 필요하다.

## 6. 사용자가 할 일 (Mac 체크리스트)

2026-11-19부터 빌드와 첫 실행은 CI가 대신한다(4절 "CI 시뮬레이터 검증"). 아래에서 "CI ✅"로 표시한 항목은 Mac이 없어도 확인됐다. 나머지는 손 조작·카메라·실제 터치 감각이 필요하다. Mac 없이 할 방법은 둘이다. (1) Apple Developer 등록 뒤 TestFlight로 실기기에 설치해 확인한다(UA·`data-platform`·콘솔 확인은 Debug 빌드 셀프 테스트 로그나 원격 Web Inspector가 없으면 어렵다). (2) 원격 Mac(시간제 대여)에서 Xcode·Safari Web Inspector로 확인한다.

준비
1. `git pull` → `npm.cmd install --prefix apps/mobile --no-package-lock --ignore-scripts`(Mac에서는 `npm install --prefix apps/mobile --no-package-lock --ignore-scripts`)
2. `npm run mobile:ios:sync` → `npm run mobile:ios:open`
3. Xcode 26에서 App 스킴, 서명 팀 선택, iPhone 기기 또는 시뮬레이터(iOS 17+)로 Debug 실행

빌드
- [x] 컴파일 오류 0 — CI ✅ (Xcode 26.6, 시뮬레이터 Debug)
- [x] `CodeDestinyViewController.swift` 경고 0 — CI ✅

WebShell (이번 Phase)
- [ ] 콜드 스타트에서 흰 화면 없이 보라 배경 → 홈 (CI: 30초 뒤 홈 렌더 ✅. 실행 직후 전환 순간은 미확인)
- [ ] 상하 오버스크롤 가장자리가 흰색이 아님
- [ ] 입력창을 누르면 확대되지 않고, 아래로 끌면 키보드가 내려감
- [ ] 하위 화면에서 왼쪽 가장자리 스와이프로 뒤로 감
- [ ] 링크를 길게 눌러도 미리보기가 뜨지 않음
- [ ] 외부 링크(예: 공식 채널, 약관의 외부 링크)를 누르면 앱 안 Safari 시트로 열리고 닫기 버튼으로 돌아옴
- [ ] `target=_blank`·`window.open`으로 여는 자기 사이트 링크가 앱 안에서 열림
- [ ] `tel:`·`mailto:`·카카오톡 링크가 해당 앱으로 열림
- [ ] 웹 `alert`·`confirm`의 버튼이 기기 언어(한국어면 "확인"·"취소")로 보이고 눌러도 화면이 멈추지 않음
- [ ] 손금: 카메라 버튼 → 카메라 권한 문구가 한국어로 뜨고 촬영 결과가 올라감. 갤러리 선택도 동작
- [ ] 문의 첨부: 카메라·사진 선택 동작
- [ ] 연이 ↔ 네오 테마 전환 시 상태바 아이콘이 배경과 대비됨(네오: 흰 아이콘, 연이: 검은 아이콘)
- [x] `navigator.userAgent`에 `CodeDestinyApp/iOS/1.0.59`가 붙음 — CI 셀프 테스트 ✅

Phase 2 이월 항목 ([phase-2.md](phase-2.md) 7절)
- [ ] 주입 순서: 첫 화면에서 `html[data-platform="ios"]` — CI ❌ 홈에서 비어 있음(4절 "CI가 찾은 결함", React #418). 브리지 주입·실행 자체는 ✅
- [ ] 콘솔 `await __cdNativeBridgeClient.getInfo()` → `{platform:"ios", available:true, ...}` — CI: 홈에는 이 스크립트가 없다. `Capacitor.getPlatform()`=`ios`, `CodeDestinyNative` 있음은 ✅
- [ ] API 요청 `Origin`이 `capacitor://localhost`이고 서버가 거부하지 않음
- [ ] 로그인(이메일 등 WebView 안 방식) 뒤 앱 재실행에도 로그인 유지, 토큰 갱신 동작
- [ ] iOS에서 결제 진입 버튼을 눌러도 체크아웃 창이 열리지 않음, 가격·웹 결제 문구 0건

## 7. 남은 위험과 다음 Phase 승인 요청

남은 위험
- Swift 코드는 CI에서 컴파일됐다(오류 0, 2026-11-19). 동작은 시뮬레이터 실행까지만 확인했다. 기기에서 회귀가 나면 셸 커밋만 되돌리면 이전 셸로 돌아간다(Android 영향 없음, iOS 바이너리 미출시).
- `/api/auth/oauth/` 시작은 여전히 Safari 앱으로 나갔다가 `com.codedestiny.app://auth`로 돌아온다. 돌아오는 경로는 기존 `appUrlOpen` 처리에 의존한다(Phase 5에서 교체).
- 외부 사이트로의 스크립트 이동(`location.assign`)은 Safari 앱으로 나간다(D3).

커밋 기록
- `check:fast` 결과와 커밋 SHA는 이 문서를 커밋하는 메시지와 세션 보고에 남긴다.

승인 요청
- **Phase 4(딥링크·유니버설 링크)** 진행 승인을 요청한다. 범위: `/.well-known/apple-app-site-association`을 `application/json`·리다이렉트 없이 제공(`_headers`, 워커 라우팅 확인 — RED: 라우팅), Associated Domains entitlement, 콜드·웜 스타트 링크 처리. Team ID가 필요하므로 Phase 1의 Apple Developer 등록 상태를 함께 알려 주면 좋다.
- 위 6절 Mac 체크리스트 결과를 먼저 받으면 Phase 4 전에 이번 셸 코드를 확정할 수 있다(권장).
