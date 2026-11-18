# iOS Phase 1 — Apple 계정과 App Store Connect 준비 (2026-11-18)

- 입력 프롬프트: [docs/prompts/2026-11-18-02-ios-port.md](../../prompts/2026-11-18-02-ios-port.md) Phase 1
- 성격: 사람이 실행할 일의 체크리스트, 값 목록, 입력 문구 초안이다. 코드는 바꾸지 않았다.
- 근거 커밋: `5624caee0`(origin/main). 인용한 `파일:라인`은 이 커밋에서 다시 확인했다.
- 저장 경로 조정: 프롬프트는 `docs/ios/reports/phase-{N}.md`를 지정하지만, 루트 `.gitignore:145`의 `reports/` 규칙에 걸려 커밋되지 않는다. ignore 규칙은 그대로 두고 `docs/ios/phase-reports/phase-{N}.md`에 저장한다. 이후 Phase도 같은 경로를 쓴다.
- 실측과 추정을 구분한다. Apple 콘솔 화면은 직접 볼 수 없으므로, 콘솔 쪽 사실은 공식 문서·2차 자료 기준의 **추정**이며 사용자가 콘솔에서 확인해야 한다.

## 1. 요약

1. Phase 0(iOS)은 사용자 지시에 따라 건너뛰었다. Phase 1 값 중 Phase 0 결정에 기대는 항목(상품 유형, 셸 방식)은 **추천안 + 승인 필요**로 표시했다.
2. 프롬프트 전제 몇 가지가 저장소와 다르다(2절). 특히 앱가=웹가, Android는 Capacitor 셸, 앱 세션은 Bearer 토큰이다.
3. 사용자가 먼저 할 일은 개발자 등록 → 유료 앱 계약·세금·계좌 → Small Business Program 순서다(7절). 나머지는 등록 승인 뒤 같은 날 처리할 수 있다.

## 2. 프롬프트 전제와 저장소 실제 상태 (판단 관점: 7 레드팀, 4 백엔드)

| 프롬프트 전제 | 실제 (근거) | 영향 |
|---|---|---|
| 앱 가격은 웹보다 20–30% 높다, `pricing.app.ts` | 2026-08-29부터 **앱가 = 웹가**. 정본은 `worker/lib/app-store-pricing.js:5-9`이고 `pricing.app.ts` 파일은 없다. | IAP 가격은 웹가와 같게 등록한다(5절). |
| Android는 자체 `@JavascriptInterface` 브리지 | Capacitor 8 셸 + 자체 플러그인이다. `window.CodeDestinyNative` shim은 `scripts/app-native-bridge.js:565-665`([native-bridge-contract.md](../../native-bridge-contract.md) 1절). | 프롬프트 3-1의 "C. Capacitor △" 판정은 이 전제 위에서 나왔다. iOS도 Capacitor로 가면 계약이 하나로 유지된다. **Phase 2 첫 결정 항목**으로 넘긴다. |
| 세션은 쿠키 | 앱 런타임은 Bearer 토큰 + localStorage다(`scripts/app-native-bridge.js:182-205`). | Phase 2의 "HttpOnly 쿠키로 전환"은 인증 RED 변경이다. |
| 브랜치 `feat/ios-*` | 저장소 규칙: main 직접 개발, 브랜치·PR 금지(CLAUDE.md 절대 규칙 3). | 저장소 규칙을 따른다. Conventional Commits는 유지한다. |
| 엔드포인트 `/iap/apple/*`, `/auth/*` | 기존 규칙은 `/api/app-store/google/*`(docs/play-billing-app.md 파일 맵), `/api/auth/oauth/<provider>/callback`(`worker/routes/auth.js:1203`)이다. | Apple 쪽도 `/api/app-store/apple/*`, `/api/auth/oauth/apple/callback`으로 맞춘다(4절). |
| LLM 제공자 | `generativelanguage.googleapis.com`(Google Gemini)만 쓴다. 검색 범위 `worker/`·`lib/`에서 OpenAI·Anthropic·DeepSeek·xAI·OpenRouter 엔드포인트는 0건. | AI 동의 시트·방침의 제공자는 Google LLC(Gemini API)다. |
| Android 푸시가 FCM | `worker/`·Android `build.gradle`에서 FCM·Firebase·APNs 참조 0건. 푸시 인프라가 아직 없다. | APNs 키는 지금 만들어 두되, 발송 경로는 Phase 7에서 새로 정한다. |
| 서드파티 로그인 | Google, Naver, Kakao(`worker/routes/auth.js:62`) | 4.8에 따라 SIWA가 필수다. |

## 3. 진행 상태 표

상태: ☐ 미착수 · ◐ 진행 중 · ☑ 완료. 사용자가 갱신한다.

| # | 항목 | 담당 | 상태 | 선행 | 값·문구 |
|---|---|---|---|---|---|
| 1 | Apple Developer Program 개인 등록 | 사용자 | ☐ | — | 6-1 |
| 2 | 유료 앱 계약, 세금 정보, 은행 계좌 | 사용자 | ☐ | 1 | 6-2 |
| 3 | Small Business Program 신청 | 사용자 | ☐ | 2 | 6-3 |
| 4 | App ID `com.codedestiny.app` + Capabilities | 사용자 | ☐ | 1 | 4-1 |
| 5 | App Group, Services ID(웹 SIWA), 도메인·리턴 URL | 사용자 | ☐ | 4 | 4-2, 4-3 |
| 6 | 키 3종 생성(APNs, SIWA, In-App Purchase) | 사용자 | ☐ | 1 | 4-4 |
| 7 | 키를 Workers secret에 등록 | 사용자(또는 대행 승인) | ☐ | 6, 그리고 해당 Phase 코드 | 4-5 |
| 8 | SIWA 비공개 릴레이 메일 발송원 등록 | 사용자 | ☐ | 5 | 4-6 |
| 9 | App Store Connect 앱 레코드 생성 | 사용자 | ☐ | 4 | 6-4 |
| 10 | IAP 상품 생성 + 현지화 이름·설명 | 사용자 | ☐ | 2, 9, 그리고 5절 승인 | 5절 |
| 11 | IAP 심사용 스크린샷 | 사용자 | ☐ | Phase 6 페이월 화면 | 첫 바이너리와 함께 제출 |
| 12 | Server Notifications V2 URL | 사용자 | ☐ | Phase 6 엔드포인트 배포 | 4-3 |
| 13 | 샌드박스 테스트 계정 | 사용자 | ☐ | 9 | 6-5 |
| 14 | 개인정보처리방침·지원 URL, 연령 등급 설문 | 사용자 + 초안 | ☐ | 법률 검토(8절) | 6-4, 6-6 |

## 4. 식별자·키 값 목록 (판단 관점: 3 인증·보안, 2 StoreKit)

### 4-1. App ID

- 유형: App IDs → App, Explicit
- Bundle ID: `com.codedestiny.app` (Android 패키지와 같다)
- Description: `Code Destiny iOS`
- Capabilities (지금 켤 것)
  - Sign In with Apple: "Enable as a primary App ID"
  - Push Notifications
  - Associated Domains
  - App Groups (4-2의 그룹 연결)
  - In-App Purchase는 App ID에 기본 포함이다. 따로 켤 것이 없다.
- 위젯 확장(Phase 7)용 App ID는 그때 만든다: `com.codedestiny.app.widget`, App Groups만 켠다.

### 4-2. App Group

- `group.com.codedestiny.app` — 앱과 위젯이 공유하는 캐시 저장소. 앱 ID와 위젯 ID 양쪽에 연결한다.

### 4-3. 도메인과 URL

| 용도 | prod | staging | 등록 위치 |
|---|---|---|---|
| 웹 SIWA Services ID | `com.codedestiny.app.siwa` (하나로 두 도메인 모두 등록) | 같음 | Identifiers → Services IDs |
| SIWA Domains | `code-destiny.com` | `staging.code-destiny.com` | Services ID → Configure |
| SIWA Return URL | `https://code-destiny.com/api/auth/oauth/apple/callback` | `https://staging.code-destiny.com/api/auth/oauth/apple/callback` | 같은 화면 |
| Associated Domains (Phase 4) | `applinks:code-destiny.com`, `webcredentials:code-destiny.com` | `applinks:staging.code-destiny.com` (Staging 빌드만) | entitlements(코드) |
| Server Notifications V2 | `https://code-destiny.com/api/app-store/apple/notifications` | Sandbox URL: `https://staging.code-destiny.com/api/app-store/apple/notifications` | ASC → 앱 → 앱 정보 |

- 경로 근거: Google OAuth 콜백 `worker/routes/auth.js:1203`, Google RTDN `docs/play-billing-app.md` 등록 체크리스트(`/api/app-store/google/rtdn`). `code-destiny.com/api/*`와 `staging.code-destiny.com/api/*`는 워커 라우트다(`worker/wrangler.toml:29`, `worker/wrangler.staging.toml:61`).
- 🔴 Return URL과 알림 URL의 엔드포인트는 아직 없다. Services ID는 지금 만들어도 되지만 **Server Notifications URL은 Phase 6 엔드포인트가 배포된 뒤** 등록하고, "Request a Test Notification"으로 확인한다.
- 웹 SIWA 콜백은 `response_mode=form_post`라 POST로 들어온다. 기존 콜백 처리와 메서드가 다르다(Phase 2 구현 메모).

### 4-4. 키 3종 (Keys)

| 키 | 만드는 곳 | 기록할 값 | 비고 |
|---|---|---|---|
| APNs | Certificates, IDs & Profiles → Keys → Apple Push Notifications service | Key ID, Team ID, `.p8` | Sandbox·Production 겸용으로 만든다. |
| SIWA | 같은 화면 → Sign in with Apple → Primary App ID `com.codedestiny.app` | Key ID, `.p8` | client secret(ES256 JWT) 서명과 토큰 revoke에 쓴다. |
| In-App Purchase | App Store Connect → 사용자 및 액세스 → 통합 → 앱 내 구입 | Key ID, Issuer ID, `.p8` | App Store Server API 호출용 |

- 권장: 한 키에 여러 서비스를 켤 수 있지만 **키를 서비스별로 나눈다.** 하나가 새면 그것만 폐기한다(판단 관점: 3 인증·보안).
- `.p8`은 **한 번만 내려받을 수 있다.** 저장소 밖(비밀번호 관리자)에 보관한다. 저장소·채팅·이슈에 붙이지 않는다(불변 규칙 13, CLAUDE.md 절대 규칙 5).

### 4-5. Workers secret 이름 (제안 — 코드는 Phase 5·6에서 이 이름을 읽는다)

| secret | 값 | 쓰는 Phase |
|---|---|---|
| `APPLE_TEAM_ID` | Team ID | 5, 6, 7 |
| `APPLE_BUNDLE_ID` | `com.codedestiny.app` (vars로 둬도 된다) | 5, 6 |
| `APPLE_SIWA_SERVICES_ID` | `com.codedestiny.app.siwa` | 2, 5 |
| `APPLE_SIWA_KEY_ID` / `APPLE_SIWA_PRIVATE_KEY` | SIWA 키 | 2, 5 |
| `APPLE_IAP_KEY_ID` / `APPLE_IAP_ISSUER_ID` / `APPLE_IAP_PRIVATE_KEY` | In-App Purchase 키 | 6 |
| `APPLE_APNS_KEY_ID` / `APPLE_APNS_PRIVATE_KEY` | APNs 키 | 7 |

- 등록은 해당 Phase 코드가 들어간 뒤에 한다. 등록 명령은 `npm run secrets:cf:worker`(`package.json:100`)인데, 🔴 **키 하나만 올리는 옵션 없이 돌리면 프로덕션 시크릿 전체를 로컬 값으로 덮어쓴다.** 반드시 키 지정 옵션과 `secrets:cf:worker:dry`로 먼저 확인한다.
- staging 워커에도 같은 이름으로 넣는다. Sandbox 알림은 staging으로 오기 때문이다.

### 4-6. SIWA 비공개 릴레이 메일 발송원

현재 메일은 Resend로 `Code Destiny <admin@code-destiny.com>`에서 보낸다(`worker/lib/resend.js:3`). 릴레이(`@privaterelay.appleid.com`) 주소로 보내려면 Apple에 발송원을 등록해야 한다.

1. Certificates, IDs & Profiles → Services → Sign in with Apple for Email Communication → Configure
2. Email Sources
   - Domains: `code-destiny.com`, 그리고 Resend가 쓰는 envelope sender(Return-Path) 도메인. Resend 대시보드 → Domains에서 MAIL FROM 서브도메인(보통 `send.code-destiny.com`)을 **실측해서** 넣는다(추정 — 확인 필요).
   - Email Addresses: `admin@code-destiny.com`
3. 통과 조건: SPF(등록 도메인과 envelope sender 도메인이 정확히 일치) 또는 DKIM(서명 도메인과 From 도메인 일치). Resend는 From 도메인으로 DKIM 서명하므로 DKIM 쪽이 통과 근거가 될 가능성이 높다. 표에 SPF 결과가 뜨는지 확인한다.
4. Account Holder 계정의 릴레이 전달 실패 알림을 켜 둔다(SPF 녹색이어도 전달 실패 사례가 보고됨).

- 실제로 메일을 보내는 기능: 마케팅 메일(`worker/lib/email-marketing-task.js`), 일일 운세(`worker/lib/daily-fortune-task.js`), 피드백 알림. 릴레이 주소 사용자는 등록 전까지 이 메일을 못 받는다.

## 5. IAP 상품 표 (판단 관점: 2 StoreKit — 🔴 유형·ID는 승인 필요)

현재 판매 상품을 코드에서 직접 뽑았다(명령: `listAppContentTiers()`, `currentPassPlan()` — `worker/lib/app-store-pricing.js`, `lib/payment/pass-policy.js:6` `CURRENT_PASS_POLICY_VERSION = "flower-20261104"`). 문서 `docs/play-billing-app.md`의 상품 표는 이보다 낡았다.

### 5-1. 결정이 필요한 세 가지 (추천 먼저)

1. **상품 ID는 Play와 같은 ID를 쓴다(추천).** 프롬프트 규칙 `com.codedestiny.app.<type>.<name>` 대신 `cd_content_tier_01` 등을 그대로 쓴다. 이유: 서버가 이미 `findAppStoreProductById()`로 ID → 티어를 역해석한다. ID를 같게 두면 매핑 표가 하나로 끝난다. Apple은 ID를 영구 점유하고 삭제 뒤에도 재사용할 수 없으니, 등록 전에 확정해야 한다.
2. **콘텐츠 티어는 소모성(Consumable)으로 한다(추천).** 티어 SKU 하나가 회당 결제 기능과 영구 해금 기능을 함께 덮는다. 결과는 계정에 영구 보관되고 재열람은 무료다(CLAUDE.md 보관함 규칙). 그래서 "복원"은 Apple 영수증이 아니라 **로그인한 계정의 서버 원장**이 맡는다. 🔴 영구 해금 기능을 소모성으로 파는 것은 3.1.1 지적 위험이 있다(10절 레드팀). 단, `cd_content_tier_19`(라이트 사주 영구 이용권)는 상품 자체가 영구 권한이라 **비소모성**으로 한다.
3. **이용권 4종은 비갱신 구독(Non-Renewing Subscription)으로 한다(추천, 확인 필요).** ID에 `_30d`가 붙어 있고 자동 갱신이 없다. Apple의 비갱신 구독은 기간 관리와 기기 간 동기화를 개발자 계정 시스템이 맡는 유형이라 구조가 맞는다. 🔴 다만 v5 Play 설명 문구(`scripts/create-play-console-products.mjs:95-96`)에는 기간 언급이 없고 이전 세대 설명에는 "기간 제한이 없으며"가 있다. **v5 이용권이 30일 기간형인지 한도 소진형인지** 사용자가 확정해야 유형이 정해진다. 한도 소진형이면 소모성으로 바꾼다.

### 5-2. 상품 목록 (15개, 가격 = 웹가)

Apple 제한: 표시 이름 30자, 설명 45자. Play 설명은 이보다 길어서 새로 줄였다.

| 제품 ID | 유형(추천) | 가격(KRW) | 표시 이름 (ko) | 설명 (ko, 45자 이하) |
|---|---|---|---|---|
| `cd_content_tier_15` | 소모성 | 1,000 | 운세 콘텐츠 1,000원 | 선택한 운세 콘텐츠 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_01` | 소모성 | 3,000 | 운세 콘텐츠 3,000원 | 선택한 운세·타로·사주 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_02` | 소모성 | 5,000 | 운세 콘텐츠 5,000원 | 선택한 운세·타로·관상 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_14` | 소모성 | 7,000 | 운세 콘텐츠 7,000원 | 선택한 심화 운세 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_06` | 소모성 | 10,000 | 운세 콘텐츠 10,000원 | 선택한 운세·상담 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_16` | 소모성 | 15,000 | 운세 콘텐츠 15,000원 | 선택한 심화 운세 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_09` | 소모성 | 20,000 | 운세 콘텐츠 20,000원 | 선택한 궁합·심화 상담 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_10` | 소모성 | 30,000 | AI 상담 30,000원 | 선택한 AI 운세 상담 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_17` | 소모성 | 50,000 | AI 상담 50,000원 | 선택한 AI 운세 상담 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_18` | 소모성 | 70,000 | AI 상담 70,000원 | 선택한 AI 운세 상담 1건을 엽니다. 결과는 계정에 보관됩니다. |
| `cd_content_tier_19` | 비소모성 | 29,000 | 라이트 사주 영구 이용권 | 저장한 프로필의 라이트 사주·대운 풀이를 계속 봅니다. |
| `cd_pass_standard_30d_v5` | 비갱신 구독(확인 필요) | 14,900 | 작은 꿀단지 | 5,000원 이하 상담에 월 한도 안에서 씁니다. 자동 갱신 없음. |
| `cd_pass_premium_30d_v5` | 비갱신 구독(확인 필요) | 34,900 | 중간 꿀단지 | 10,000원 이하 상담에 월 한도 안에서 씁니다. 자동 갱신 없음. |
| `cd_pass_vvip_30d_v5` | 비갱신 구독(확인 필요) | 64,900 | 큰 꿀단지 | 30,000원 이하 상담에 월 한도 안에서 씁니다. 자동 갱신 없음. |
| `cd_pass_family_30d_v5` | 비갱신 구독(확인 필요) | 154,000 | 패밀리 꿀단지 | 이용권 대상 상담 전체에 월 한도 안에서 씁니다. 자동 갱신 없음. |

- 🔴 이름에 가격이 들어간다. 가격을 바꾸면 이름도 같이 바꾼다(Play와 같은 규칙, `docs/play-billing-app.md`). 화면에 표시하는 가격은 `Product.displayPrice`만 쓴다.
- 🔴 **Apple 원화 가격 단계 대조가 필요하다.** Apple은 통화별로 정해진 가격 단계만 허용한다. 정확한 KRW 단계표는 App Store Connect → 가격 → "모든 가격 내보내기(CSV)"에서 받아, 위 15개 금액이 단계에 **정확히** 있는지 확인한다. 없는 금액이 있으면 가장 가까운 단계를 고르는 것은 가격 정책 결정이다(앱가=웹가 원칙과 충돌). 그때는 조용히 고르지 않고 사용자에게 묻는다.
- 기준 국가(base storefront)는 **대한민국**으로 둔다. 다른 기준 국가를 쓰면 환율·세금 변동 때 Apple이 KRW 가격을 자동 조정한다.
- 판매 국가는 v1에서 **대한민국만** 추천한다(6-2 DSA, 법률 검토 범위 축소).
- SKU를 만들지 않는 것: 10코인 이하 무료 기능(음악 트랙 다운로드, `worker/lib/app-store-pricing.js` `APP_FREE_MAX_COIN_PRICE`), 월정석(구매 불가 재화).
- 심사 메모(상품마다 입력, 영문 초안): `Unlocks one fortune reading selected in the app. Results are saved to the user's account and can be re-opened without another purchase. Test: Sign in with the demo account → open any locked reading → tap Purchase.`
- 같이 보고: Play 앱 승인 이용권 목록은 아직 v4다(`CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS` = `cd_pass_*_30d_v4` 3개). 현재 판매 정책은 v5다. Android 쪽 정합성 확인이 필요하다(이번 범위 밖, 보고만).

## 6. 콘솔 입력 문구 초안

### 6-1. 개발자 등록 (개인)

- 등록 주체: 개인. 스토어 판매자명은 **본인 실명**으로 표시된다. 브랜드명으로 표시하려면 조직 등록(D-U-N-S, 법인 필요)이어야 한다. 개인 간이과세자는 법인이 아니므로 v1은 실명 표시를 받아들인다(판단 관점: 7 레드팀 — 판매자명과 앱 이름 불일치는 반려 사유가 아니다).
- 2단계 인증이 켜진 Apple 계정이 필요하다. 연회비 결제 후 승인까지 시간이 걸릴 수 있다.

### 6-2. 유료 앱 계약, 세금, 계좌

- 🔴 유료 앱 계약(Paid Apps Agreement)이 "활성"이 아니면 샌드박스에서도 IAP 상품이 로드되지 않는다. 가장 먼저 처리한다.
- 세금: 미국 세금 양식(비미국 개인은 W-8BEN 계열)과 대한민국 세금 정보. 조세조약 적용 여부와 간이과세자 신고 방식은 **세무 검토**(8절).
- 은행: 본인 명의 원화 계좌(SWIFT 코드 필요).
- EU 판매 시 DSA "거래자(trader)" 신고가 필요하고, 거래자로 신고하면 **주소·전화번호가 EU 스토어에 공개**된다. v1을 대한민국 한정으로 출시하면 이 공개를 피할 수 있다(추천).

### 6-3. Small Business Program

- 조건: 전년도 수익금(Apple 수수료 공제 후)이 연 100만 달러 이하. 관련 개발자 계정을 모두 신고해야 한다.
- 선행: Account Holder이고, 최신 유료 앱 계약에 동의해야 한다.
- 신청: developer.apple.com/app-store/small-business-program/enroll/. 승인 전 매출은 30% 수수료가 적용될 수 있으니 출시 전에 신청한다.

### 6-4. App Store Connect 앱 레코드

| 필드 | 값 (초안) | 비고 |
|---|---|---|
| 플랫폼 | iOS | |
| 이름 (30자) | `꿀꿀 운세: 명리학자의 사주·타로` | 공식명 "꿀꿀 운세"(`lib/brand/brand-facts.mjs:31`). 이름은 전 세계에서 유일해야 하니 예비안 2개를 둔다: `꿀꿀 운세 - 사주 타로 상담`, `꿀꿀 운세` |
| 부제 (30자) | `6가지 동서양 점술을 하나로` | Phase 10에서 확정 |
| 기본 언어 | 한국어 | |
| 번들 ID | `com.codedestiny.app` | |
| SKU | `codedestiny-ios` | 내부용, 공개 안 됨 |
| 사용자 액세스 | 전체 액세스 | |
| 카테고리 | 1차 라이프스타일, 2차 엔터테인먼트 (Phase 10 확정) | |
| 개인정보처리방침 URL | `https://code-destiny.com/privacy-policy/` | `app/privacy-policy/page.js` 있음. 8절 수정 뒤 제출 |
| 지원 URL | `https://code-destiny.com/contact/` | `app/contact/page.js` 있음 |
| 저작권 | `© 2026 박병하` | 개인 등록이라 실명 |
| 연락처(심사) | `admin@code-destiny.com`, `+82-50-6664-7398` | `lib/site-policy-config.js:45-46` |

### 6-5. 샌드박스 테스트 계정

- App Store Connect → 사용자 및 액세스 → Sandbox → 테스터. 국가는 **대한민국**.
- 실제 Apple 계정과 겹치지 않는 새 이메일이 필요하다. 플러스 주소(`admin+sbx1@code-destiny.com`)가 수신되는지 먼저 확인한다(추정).
- 최소 3개: ① 구매 없음 ② 구매 이력 있음(복원 시험) ③ Ask to Buy 시험용(가족 공유 설정은 기기에서).

### 6-6. 연령 등급 설문 (초안 — 설문 문항은 콘솔에서 확인)

Apple은 2025년에 등급을 4+/9+/13+/16+/18+로 바꾸고, 앱 내 통제·기능·의료/웰니스·폭력 주제 문항을 추가했다. 2026-01-31 이후로는 새 문항에 답하지 않으면 업데이트가 막힌다.

| 문항 군 | 답 (초안) | 근거 |
|---|---|---|
| 폭력, 성적 콘텐츠, 공포, 약물·음주 | 없음 | 운세 콘텐츠 |
| 도박, 시뮬레이션 도박 | 없음 | 유료 확률형 아이템 없음(`fortune-fish-gacha`는 무료 전환, docs/play-billing-app.md) |
| 확률형 아이템(loot box) | 없음 | 같음 |
| 의료·웰니스 주제 | 없음 | 진단·치료 안내를 하지 않는다. 오락 목적 고지와 함께 Phase 10에서 재확인 |
| 무제한 웹 접근 | 아니요 | 허용 도메인 외 링크는 외부 브라우저로 연다(Phase 3 설계). 셸 구현 뒤 재확인 |
| 사용자 생성 콘텐츠·메시징 | 없음 / AI 생성 콘텐츠·AI 대화 문항이 있으면 "예" | AI 상담 기능. 신고 기능(Android Phase 0 P0)과 함께 답한다 |
| 앱 내 통제(보호자 설정) | 없음 | |
| 예상 등급 | 13+ 또는 그 이상(추정) | 콘솔 결과로 확정 |

## 7. 사용자가 해야 할 일 (순서대로)

1. Apple Developer Program 개인 등록 (오늘)
2. 승인 후: 유료 앱 계약 동의 → 세금 → 은행 계좌 (같은 날)
3. Small Business Program 신청
4. 5-1의 세 가지 결정에 답하기: 상품 ID(Play와 동일 추천), 콘텐츠 티어 소모성(추천), **v5 이용권이 기간형인지 한도 소진형인지**
5. App ID, App Group, Services ID 등록 (4-1~4-3)
6. 키 3종 생성, `.p8`·Key ID·Issuer ID를 비밀번호 관리자에 보관 (4-4). 채팅에 붙이지 않는다.
7. ASC 앱 레코드 생성 (6-4), 판매 국가 대한민국 한정 여부 결정
8. ASC 가격 CSV를 내려받아 5-2 금액 15개가 원화 단계에 있는지 확인
9. 결정 뒤 IAP 상품 등록 (스크린샷은 Phase 6 이후)
10. Resend 대시보드에서 MAIL FROM 도메인을 확인하고 릴레이 발송원 등록 (4-6)
11. 샌드박스 테스터 3개 생성 (6-5)
12. 8절 법률·세무 검토 의뢰

## 8. 법률·세무 검토 필요 항목 (구현 전 전달용)

| # | 항목 | 현재 상태 (근거) | 필요한 결정 |
|---|---|---|---|
| L1 | LLM 국외 이전 | Gemini가 출생 정보·질문을 처리한다. 방침 처리 위탁 목록에는 결제 수탁자만 있다(`app/privacy-policy/PrivacyPolicyContent.jsx:137-161`, Android Phase 0 P0와 같은 결함). 국외 이전 절은 앱인토스 이용자 한정이다(`:163-179`). | 이전받는 자(Google LLC), 국가, 항목, 목적, 보유기간 문안. AI 동의 시트(Phase 7) 문구와 일치 |
| L2 | Apple 결제 처리 | 방침에 Apple(인앱 결제) 언급이 없다. | 처리 위탁·제3자 제공 항목 추가 여부 |
| L3 | 청약철회 제한 고지 | 디지털콘텐츠는 열람 시작 뒤 철회가 제한된다는 고지를 결제 전에 해야 한다. Apple 환불은 Apple 정책이 우선이다. | 페이월 문구(Phase 6). 두 규정이 충돌하지 않는 문안 |
| L4 | 마케팅 푸시 | 정보통신망법: 사전 동의, 야간 별도 동의, "(광고)" 표기, 수신거부 안내, 정기 확인 | 동의 문안과 2년 주기 확인 절차(Phase 7) |
| L5 | 세금 | 개인 간이과세자의 Apple 수익 신고, 미국 조세조약 원천징수, 부가세 처리 | 세무사 확인 |
| L6 | EU DSA | EU 판매 시 주소·전화 공개 | v1 대한민국 한정 여부 |
| L7 | 계정 삭제·환불 뒤 접근 | 탈퇴·환불 시 접근 회수 규칙 유지(CLAUDE.md 보관함 절) | SIWA revoke 포함 탈퇴 고지 문안(Phase 5) |

## 9. 검증 결과

| 확인 | 방법 | 결과 |
|---|---|---|
| 현재 판매 상품 15개 | `node --input-type=module` 로 `listAppContentTiers()`, `currentPassPlan()` 출력 | 5-2 표와 일치 |
| LLM 제공자 | `git grep -l` 엔드포인트 6종, 범위 `worker/` `lib/` | Gemini 5파일, 나머지 0 |
| 푸시 인프라 | `git grep -i "FCM\|firebase\|apns"`, 범위 `worker/`, Android `build.gradle` | 0건 |
| 메일 발송원 | `worker/lib/resend.js:3` | `admin@code-destiny.com` |
| 콘솔 쪽 사실 | Apple 공식 문서·2차 자료 검색 | 미검증(사용자 콘솔 확인 필요) |

Apple 요건 재확인 (2026-11-18 검색): Xcode 26·iOS 26 SDK 업로드 요건(2026-04-28 시행), 새 연령 등급 체계(2025-07 발표, 2026-01-31 응답 기한), SIWA 릴레이 SPF/DKIM 조건, Small Business Program 조건. 프롬프트 2절과 다른 점은 없었다. KRW 가격 단계표는 공개 문서에서 찾지 못해 CSV 확인으로 넘겼다.

## 10. 레드팀: 이 상태로 제출하면 반려될 사유 (판단 관점: 7)

1. **바이너리가 없다.** Phase 3 이전에는 제출 자체가 불가하다.
2. 3.1.1: 영구 해금 기능을 소모성 티어로 판다고 보면 "복원 수단 없음"으로 지적될 수 있다. 대응: 페이월과 설정에 "구매한 결과는 계정 보관함에서 다시 열 수 있다"를 명시하고, 심사 메모에 계정 기반 복원 경로를 적는다. 비소모성 `cd_content_tier_19`에는 [구입 복원] 버튼이 필요하다.
3. 2.1: 유료 앱 계약이 비활성이거나 IAP를 바이너리와 함께 제출하지 않으면 상품이 안 떠서 반려된다.
4. 5.1.1(i)·5.1.2(i): 방침에 LLM 국외 이전과 Apple 결제가 없다(L1·L2). AI 동의 시트도 아직 없다.
5. 4.8: Google·Naver·Kakao 로그인이 있는데 SIWA가 아직 없다.
6. 3.1.1: 웹 결제(PortOne)·웹 가격 노출이 iOS 컨텍스트에서 차단되지 않았다(Phase 2 대상).
7. 2.3: 이름·부제·스크린샷이 아직 없다. 이름에 "운세"만 강조하면 4.3(b) 포화 카테고리 판정을 부른다.

## 11. 남은 위험과 다음 Phase 승인 요청

- 남은 위험: Apple KRW 단계에 없는 가격, v5 이용권 유형 미확정, Phase 0(iOS) 설계 공백(셸 방식·브리지 v1·페이월 방식·저장소 구성).
- 다음: Phase 2(웹 플랫폼 레이어). 인수인계 문서 [docs/handoff/ios-phase2-2026-11-18.md](../../handoff/ios-phase2-2026-11-18.md)에 시작 절차와 승인 항목을 적었다. Phase 2는 인증·결제 진입 분기를 건드리는 RED라 **진단 → 승인 → 구현** 순서로 진행한다.
