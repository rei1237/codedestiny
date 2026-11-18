# Android 출시 마무리 — Phase 0 진단 (2026-11-18)

- 입력 프롬프트: [docs/prompts/2026-11-18-01-android-release-hardening.md](../prompts/2026-11-18-01-android-release-hardening.md)
- 범위: 읽기 전용 진단이다. 코드는 바꾸지 않았다. 줄 번호는 커밋 a3bc671ac 기준으로 `git grep`과 `sed -n`으로 다시 대조했다.
- 위험도: P0는 출시를 막는 항목, P1은 매출·로그인 영향, P2는 UX·성능, P3는 개선이다.
- 실측과 추정을 구분한다. "실기기 확인 필요"로 표시한 항목은 코드 경로만 근거로 한 추정이다.

## 1. 요청 전제와 저장소 실제 상태 (판단 관점: 릴리스 엔지니어)

| 요청 전제 | 실제 / 정본 | 처리 |
|---|---|---|
| 브랜치 `feat/android-release-hardening` + PR | CLAUDE.md 절대 규칙 3: main 직접 개발, 브랜치·PR 금지 | 저장소 규칙을 따른다. Conventional Commits는 유지한다. |
| 앱가가 웹가보다 20–30% 높음, `pricing.app.ts` | 2026-08-29부터 앱가=웹가. 정본은 `worker/lib/app-store-pricing.js` (docs/play-billing-app.md) | 요청 쪽 전제가 낡았다. |
| 원격 도메인을 띄우는 WebView 앱, 세션 쿠키 | Capacitor 8 셸이 dist 번들을 `https://localhost`에서 서빙한다. 세션은 Bearer 토큰 + localStorage다. | 쿠키 주입 항목은 해당 없다. |
| targetSdk 36 / PBL 8+ 마이그레이션 | 이미 충족: `apps/mobile/android/variables.gradle:3-4`(compile·target 36), `apps/mobile/android/app/build.gradle:118`(billing 9.1.0) | 할 일 없음 |
| 비공개 테스트 12명×14일 | 조직 계정이라 해당 없다(2026-09-01 사용자 확인). | — |
| D1 분산락 | Play 결제 경로는 Mongo `impUid = google:<sha256(token)>` 기반이다. D1 락은 없다. | 중복 방지는 unique 인덱스에 달려 있다(P1 참고). |

공식 문서 재확인(2026-11-18):
- Target API 36은 2026-08-31부터 시행됐고, 연장 기한 11-01도 지났다. 이미 충족했다.
- AI 생성 콘텐츠 앱은 앱 안에 신고·플래그 기능이 있어야 한다.
- PBL 8 기한은 공식 문서끼리 날짜가 다르다(2026-08-31 / 2027-08-31). 9.1.0을 쓰고 있으니 영향 없다.
- 출처: Play Console Help 11926878, 13985936, developer.android.com/google/play/billing/deprecation-faq

## 2. P0 — 출시 차단

| 항목 | 현재 상태 | 근거 | 제안 | 검증 방법 |
|---|---|---|---|---|
| 앱 안 회원 탈퇴 (판단 관점: 인증·보안) | 실패할 가능성이 높다(실기기 확인 필요). 탈퇴 GET·POST가 절대 URL로 그냥 fetch를 부른다. 앱 런타임에서 apiBase는 프로덕션 출처다. 그런데 브리지 fetch 래퍼는 **같은 출처의 `/api/`만** 다시 써서 Bearer와 `X-Code-Destiny-Runtime`을 붙인다. 그래서 이 요청은 토큰 없이 교차 출처로 나간다. CSRF는 쿠키 double-submit 방식이라 localhost 출처에서는 쿠키가 왕복하지 않는다. 앱 셸에는 `/account/delete`로 가는 링크도 없다. | `app/components/WithdrawModal.jsx:91`, `:157`, `:162` · `app/_lib/api-config.ts:86-89` · `scripts/app-native-bridge.js:182-205` | 앱 런타임에서는 인증된 fetch 경로(Bearer)를 쓰고, 앱 요청 헤더를 기준으로 CSRF 대체 검증을 한다. 마이·설정 화면에 진입점을 추가한다. 인증 경로라 RED다. | 실기기 SM-M156S에서 테스트 계정을 탈퇴시키고, CDP로 GET·POST 응답 코드를 기록한다. 서버 로그에서 사용자 삭제를 확인한다. |
| AI 결과 신고 | 피드백 페이지에는 `ai-quality` 카테고리가 있다. 하지만 결과 화면에서 그 카테고리로 가는 진입점은 0건이다(검색 범위: app·js·scripts·index.html, app/feedback 제외). | `worker/lib/feedback-models.js:14` · `app/feedback/_lib/categories.ts:77` | LLM 결과 카드에 i18n 신고 버튼을 단다. `feedback?category=ai-quality`로 결과 식별자를 넘기고, 비로그인도 허용한다. | 결과 화면 3종에서 버튼 → 제출 → 운영 수신까지 확인한다. |
| 데이터 보안 신고와 개인정보처리방침 | 실제로는 Gemini가 출생 정보를 처리한다. 그런데 Play 신고 문안은 "제3자 공유: 아니오"이고 출생지 항목이 없다. 방침의 처리 위탁 목록은 결제 수탁자만 있고, LLM과 Google Play 결제가 빠져 있다. | `worker/routes/life-book-ai.js:25,53` · `worker/routes/love-secret-ai.js:21,85` · `worker/routes/new-year-ai.js:379` · `docs/play-console-submission-values.md:328-330` · `app/privacy-policy/PrivacyPolicyContent.jsx:137-161` | 방침에 LLM 처리 위탁(Google Gemini API)과 Google Play 결제를 추가한다. Data safety 문안을 고친다. 법적 문구라 **사용자 확인이 필요하다.** | 문안 diff를 사용자에게 확인받고, Play Console 입력값과 대조한다. |

## 3. P1 — 매출·로그인 영향

| 항목 | 현재 상태 | 근거 | 제안 | 검증 방법 |
|---|---|---|---|---|
| B1 RTDN 오회수 (판단 관점: Play 결제·서버 검증) | Google API의 4xx가 모두 400으로 바뀐다. RTDN 비환불 경로는 5xx만 다시 던지고 나머지는 삼킨 뒤 `active=false`로 회수한다. 서비스 계정 권한(401·403)이 깨지면 정상 구매까지 회수된다. | `worker/routes/app-store.js:663`, `:1621-1629` | 404·410만 "구매 없음"으로 보고, 401·403·429는 재시도 오류로 던진다. 회수는 명시적인 상태에서만 한다. | mock 단위 테스트: 401·403·404·5xx 응답별로 회수 여부를 검사한다. |
| B2 이용권 지급 충돌 뒤 미승인 | `Payment.create`가 지급보다 먼저 성공 기록을 남긴다. 그 뒤 지급 충돌로 throw하면 acknowledge에 도달하지 못한다. Google은 3일 뒤 자동 환불하는데 장부에는 성공으로 남는다. | `worker/routes/app-store.js:974`, `:1184` | 지급과 승인 순서를 정리하고, 실패하면 장부 상태를 보정한다. 미승인 토큰은 운영 대기열에 넣는다. | mock: 지급 충돌을 주입하고 장부 상태와 ack 호출을 확인한다. |
| B3 verify와 복구 동시 실행 | 결제 시트에서 돌아올 때 appStateChange 복구가 결제 가드의 verify와 겹칠 수 있다. 서버는 조회 후 생성 방식이라 하나가 unique 충돌로 실패한다. | `scripts/app-native-bridge.js:1688` · `scripts/app-payment-guard.js:177` | 진행 중인 구매 토큰이 있으면 복구를 건너뛰는 단일 비행 잠금을 둔다. 서버 쪽은 중복 키 오류를 멱등 성공으로 처리한다. | 실기기에서 결제 직후 앱 전환을 반복해 재현한다. |
| 결제 경로 401 refresh 없음 | 결제 가드는 raw fetch(`apiBase()+path`)라 브리지 래퍼를 거치지 않는다. 401이 나도 refresh·재시도를 하지 않는다. 액세스 토큰(30분)이 만료된 뒤 verify가 실패할 수 있다. | `scripts/app-payment-guard.js:47-75` | 401이면 refresh하고 한 번만 재시도한다. | mock으로 401 → refresh → 200 흐름을 검사한다. |
| `payments.impUid` unique 인덱스 | 모델이 `autoIndex:false`라 운영 DB에 인덱스가 실제로 있는지 저장소만으로는 증명할 수 없다. | worker 결제 모델 | 읽기 전용 실측(별도 승인)을 한다. | `getIndexes()` 결과를 기록한다. |
| social_grant 재사용 | jti를 발급하지만 소비 기록이 없다. 그래서 유효기간 안에 같은 grant를 다시 쓸 수 있다. | `worker/routes/auth.js:1443-1461` | jti를 1회 소비 처리한다(KV 또는 DB, TTL은 grant 만료와 같게). | mock: 같은 grant를 두 번 교환하면 두 번째가 거부되는지 확인한다. |
| 탈퇴 뒤 클라이언트 정리 | 성공하면 `clearClientStorage()` 후 `/`로 이동한다. 앱의 refresh 토큰, 사용자 정보, Credentials(Restore Credentials)가 정리되는지 증명되지 않았다. | `app/components/WithdrawModal.jsx:183-196` | 앱 런타임에서 `CodeDestinyNative.credentials.clear()`를 부르고, 토큰 저장소를 비운다. | 실기기에서 탈퇴한 뒤 재실행해 자동 로그인이 되지 않는지 본다. |
| 렌더러 크래시 미처리 | onRenderProcessGone을 처리하지 않아 앱이 종료된다(주석으로 인정됨). | `apps/mobile/android/app/src/main/java/com/codedestiny/app/MainActivity.java:335` | WebViewClient에서 처리해 WebView를 다시 만들고 현재 경로를 복원한다. | `chrome://crash`나 adb로 렌더러를 종료시켜 복구되는지 확인한다. |
| 관측 공백 | 크래시 수집 SDK가 없다. GA는 출처가 프로덕션이 아니면 noop이라 앱(localhost)에서 이벤트가 0건이다. 결제 퍼널 클라이언트 이벤트도 0건이다. | `js/core/analytics.js:44-51` | Crashlytics 또는 서버 수집 엔드포인트를 둔다. 앱 전용 측정 속성을 쓰고, 퍼널 이벤트(intent·launch·verify·consume)를 추가한다. | 내부 테스트 트랙에서 이벤트 수신을 확인한다. |
| 브리지 버전 핸드셰이크 | 앱 버전 노출, 최소 버전 게이팅, In-App Update가 모두 없다. | [native-bridge-contract.md](../native-bridge-contract.md) §5 | `app.getInfo`와 `/app/config`의 `minSupportedBuild`를 쓴다. | 낮은 build로 강제 업데이트 화면이 뜨는지 확인한다. |
| Capacitor 경로 불일치 | `capacitor.settings.gradle`은 `../node_modules/@capacitor/*`(apps/mobile/node_modules)를 가리키는데, 그 폴더가 없다. 실제 설치본은 8.4.1이고 선언은 8.4.3이다. | `apps/mobile/android/capacitor.settings.gradle:3` | 설치 위치와 버전을 고정하고 CI 빌드에서 검증한다. | 깨끗한 클론에서 `assembleRelease`를 돌린다. |
| Play 문안 불일치 | 콘텐츠 등급 메모에 AI 생성 콘텐츠 언급이 없다. 또 FGS 신고 문서는 `FOREGROUND_SERVICE_SPECIAL_USE`를 신고하라고 하는데, 매니페스트에는 포그라운드 서비스와 그 권한이 없다(`foreground`/`special` 검색 0건). | `docs/play-console-submission-values.md:380-389` · `apps/mobile/android/app/src/main/AndroidManifest.xml` | 문안을 실제 매니페스트에 맞추고, AI 생성 콘텐츠를 명시한다. | Play Console 입력값과 대조한다. |

## 4. P2 · P3

| 항목 | 현재 상태 | 근거 | 위험도 | 제안 |
|---|---|---|---|---|
| intent:// 처리 | Navigation 플러그인이 `Intent.parseUri` 없이 처리한다. | `CodeDestinyNavigationPlugin.java:42` | P2 | `parseUri`로 처리하고 fallback URL을 쓴다. 패키지를 검증한다. |
| textZoom | 시스템 글꼴 배율을 그대로 따라가서 레이아웃이 깨질 수 있다. 설정 코드는 0건이다. | `apps/mobile` 검색 | P2 | 상한을 두거나 CSS에서 대응한다(03 UX의 200% 기준과 함께). |
| 오류 화면 | Capacitor `errorPath`가 없다. | `apps/mobile/capacitor.config.ts` | P2 | 오프라인·로드 실패용 정적 화면을 둔다. |
| 오프라인일 때 게스트 UI | 503 응답으로 로그아웃하지는 않는다. 다만 네트워크가 끊기면 게스트 UI가 보인다. | — | P2 | 세션 확인 실패를 오프라인 상태로 표시한다. |
| App Links | assetlinks와 App Links가 없다. 커스텀 스킴 `com.codedestiny.app://auth`로 처리한다. | `scripts/app-native-bridge.js:546` | P2 | `/.well-known/assetlinks.json`과 autoVerify를 둔다. |
| PKCE | OAuth 앱 흐름에 PKCE가 없다. | `scripts/app-native-bridge.js:540-556` | P2 | 서버 중계 흐름에 code_verifier를 추가한다. |
| Billing 재연결 | `enableAutoServiceReconnection`을 쓰지 않는다. | `CodeDestinyBillingPlugin.java` | P3 | PBL 8+ 옵션을 켠다. |
| 복원 범위 | 복원 기본값이 `productType: "all"`이라 SUBS까지 조회한다. | `scripts/app-native-bridge.js:574`, `:807` | P3 | 실제 상품 유형으로 좁힌다. |
| RTDN 인증 | 공유 토큰을 `===`로 비교한다. OIDC 검증이 없다. | `worker/routes/app-store.js` | P2 | Pub/Sub push OIDC 토큰을 검증한다. |
| intent TTL 문서 불일치 | 코드는 30일, 문서는 24시간이다. | `worker/lib/app-store-models.js:48` · `docs/play-billing-app.md:19,204` | P3 | 문서를 코드에 맞춘다. |
| versionCode 폴백 | 값이 없으면 1로 폴백한다. 이렇게 빌드하면 업로드에서 거부된다. | `apps/mobile/android/app/build.gradle:71` | P3 | 릴리스 빌드에서 값이 없으면 실패시킨다. |
| 낡은 진단 문서 | 옛 진단 보고서의 줄 번호가 현재 코드와 맞지 않는다. | `docs/app-audit/DIAGNOSIS_REPORT.md:109` | P3 | 보고만 한다(이번 범위에서 수정하지 않음). |

## 5. 회귀 확인 결과 정상

- 서비스 워커 이중 로드 없음: 앱 런타임에서는 `boot()`가 `native()`이면 바로 반환해 SW를 등록하지 않는다(`js/pwa-lifecycle.js:158`).
- `@JavascriptInterface` keep 규칙이 있다(`apps/mobile/android/app/proguard-rules.pro`).
- 503 응답으로 로그아웃하지 않는다.
- 앱에서 PortOne은 봉인돼 있고 fail-closed다(`scripts/app-payment-guard.js`, `verify-app-no-portone.mjs`).
- predictive back은 `@capacitor/app`의 OnBackPressedCallback과 웹 핸들러로 처리한다.
- edge-to-edge와 IME 인셋은 CSS 변수로 전달한다.
- Google OAuth는 Custom Tabs로만 연다(`scripts/app-native-bridge.js` `openAuth`, `CodeDestinyNavigationPlugin.java:178-179`). 불변 규칙 7을 지킨다.

## 6. 구현 계획 (Phase마다 별도 승인)

- **Phase 1 — P0 해소**
  - (a) 앱 탈퇴 경로를 고친다(RED: 위험·검증·롤백을 먼저 보고한다).
  - (b) AI 결과 신고 버튼을 단다.
  - (c) 방침과 Data safety 문안을 고친다(사용자 확인 필요).
  - (d) AAB에서 16KB 정렬과 .so를 실측하고 Capacitor 경로를 고정한다.
  - (e) 렌더러 크래시를 복구한다.
- **Phase 2 — 결제 하드닝**: 별도 승인 게이트와 paid-gate-auditor를 거친다. PortOne/Inicis 파일은 건드리지 않는다.
  - B1·B2·B3를 고친다.
  - 401 refresh 재시도를 추가한다.
  - 미승인 토큰을 운영 대기열에 넣는다.
  - RTDN OIDC 검증을 추가한다.
  - 인덱스를 실측한다.
  - 환불 시 회수 정책은 사용자가 결정한다.
- **Phase 3~5**
  - grant jti 1회 소비, PKCE, App Links
  - 버전 핸드셰이크와 In-App Update
  - 크래시·퍼널 관측
  - 성능 측정(콜드 스타트, 첫 화면)

## 7. 실기기 검증 매트릭스 (SM-M156S, Android 16 / 에뮬레이터 API 24·36)

| 시나리오 | 기대 결과 | 증빙 |
|---|---|---|
| 앱 탈퇴 | GET·POST가 200이고 계정이 삭제되며, 재실행해도 자동 로그인이 되지 않는다. | CDP 네트워크 로그, 서버 로그 |
| AI 결과 신고 | 결과 화면 → 신고 제출 → 운영 수신 | 화면 녹화 |
| 단건 결제(라이선스 테스터) | intent → 결제 → verify → consume → 해금 | adb logcat, 서버 로그 |
| 결제 직후 앱 전환 반복 | verify가 한 번만 성공하고 중복 오류가 없다. | 서버 로그 |
| 토큰 만료 뒤 결제 | refresh 뒤 verify 성공 | CDP 로그 |
| 렌더러 종료 | WebView를 다시 만들고 경로를 복원한다. | 화면 녹화 |
| 시스템 글꼴 200% | 주요 화면 레이아웃이 깨지지 않는다. | 스크린샷 |
| 오프라인 실행 | 오류 화면이 뜨고 재시도할 수 있다. | 스크린샷 |
