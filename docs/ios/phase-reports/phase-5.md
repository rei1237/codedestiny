# iOS Phase 5 — 인증 (2026-11-20)

승인: 사용자 원문 "다음 페이즈 5 진행해줘"(2026-11-20). 범위는 진단·구현·main push(스테이징)까지. 운영 승격·시크릿 등록·콘솔 변경·실로그인·Phase 6 은 비승인.

## 0. RED 선보고 (구현 전 작성)

### 위험

1. 공유 인증 경로(`/api/auth/oauth/complete`)에 1회용 소비를 넣으면 웹·안드로이드 재시도가 깨질 수 있다.
   - 웹 콜백(app/auth/_components/StaticOAuthCallbackRedirect.tsx)은 5xx·네트워크 실패 때 같은 grant 로 다시 부른다. 재시도 전에 `/me` 를 먼저 확인하므로, 첫 호출이 성공했으면 그 탐침에서 끝난다.
   - 서버가 503(인프라 실패)으로 끝난 호출은 소비를 되돌려야 재시도가 산다 → 503 경로에서 소비 기록을 지운다.
   - 남는 경우: 앱에서 성공 응답이 유실되면 재교환이 거부되어 다시 로그인해야 한다. 이것은 재생 차단의 대가로 받아들인다.
2. 앱 handoff 페이지(buildAppOAuthHandoffResponse)는 안드로이드 intent:// 만 안다. iOS 분기를 넣다가 안드로이드 이동 URL 이 바뀌면 안드로이드 로그인이 전면 중단된다.
   - 안드로이드 기대값은 __tests__/ui/oauth-app-handoff.test.js 가 그대로 지킨다.
3. 네이티브 SIWA 엔드포인트는 비인증 경로다. id_token 검증이 느슨하면 남의 Apple 신원으로 로그인된다.
   - Apple JWKS 서명, iss, aud(=번들 ID), exp, nonce(=sha256(원 nonce)), sub 를 모두 확인한다.
   - 설정(Team ID·키 ID·.p8·번들 ID) 중 하나라도 없으면 503 `apple_signin_not_configured` 만 돌려준다(fail-closed). 아무것도 쓰지 않는다.
   - 웹 SIWA 와 같이 계정을 자동 생성하지 않는다. 신규는 가입 마무리(생년 확인)로 보낸다. 같은 이메일 계정에 자동 연결하지 않는다.
4. Apple refresh token 은 장기 비밀이다.
   - worker/lib/pii-crypto.js 의 AES-256-GCM 키(PII_ENC_KEY)로 암호화하고, Apple sub 를 AAD 로 묶는다.
   - 키가 없으면 저장을 건너뛴다(평문 저장 금지).
5. 탈퇴에 Apple revoke 를 넣으면 외부 호출 실패가 탈퇴를 막을 수 있다.
   - revoke 는 거부 조건을 모두 통과한 뒤 best-effort 로 부른다. 실패하거나 미설정이면 로그만 남기고 탈퇴는 계속한다.
   - 보관함 분리·구매 기록 보존, 환불 규칙은 바꾸지 않는다.
6. 앱 오류 분류를 잘못 고치면 일시 장애에서 사용자를 로그아웃시킨다. 401 만 재로그인, 503·네트워크는 재시도 안내로 둔다.

### 검증

- 서버 단위 테스트(mock, 실 Apple 호출 없음): 로컬에서 만든 RSA·EC 키로 JWKS·토큰 엔드포인트를 흉내 낸다. 확인 항목:
  - nonce·aud·exp·서명 오류 거부
  - 미설정이면 503
  - grant 재사용 거부와 503 뒤 재시도 허용
  - handoff 의 iOS 커스텀 스킴과 안드로이드 intent 유지
  - revoke 미설정 건너뜀
- `npm run check:fast`(종료 코드 직접 확인) → `npm run check:pre-push` → push → `gh workflow run ios-shell-build.yml --ref main` 1회(Swift 컴파일 + 기존 링크 전달 7건).
- 실제 Apple·Google·카카오·네이버 로그인은 비승인이다. 사용자 기기 체크리스트로 남긴다.

### 롤백

- 커밋을 축별로 나눈다. 회귀가 나면 해당 커밋만 `git revert` 한다.
  - grant 1회용
  - handoff iOS 분기
  - 네이티브 SIWA
  - 탈퇴 revoke
  - 브리지
  - Swift
- 네이티브 SIWA 는 env 가 없으면 꺼져 있으므로 운영 영향은 grant 1회용·handoff 두 커밋뿐이다.
- 새 스키마 필드(`socialAccounts.apple.refreshTokenEnc`)는 기본값 "" 인 추가 필드다. 되돌려도 기존 문서와 충돌하지 않는다.

## 1. 요약 3줄

1. iOS 앱의 구글·네이버·카카오 로그인은 WKWebView 나 SFSafariViewController 대신 ASWebAuthenticationSession(callbackURLScheme `com.codedestiny.app`)으로 연다. Apple 로그인은 네이티브 SIWA 시트 → 새 서버 엔드포인트 `/api/auth/oauth/apple/native` → 기존 `/oauth/complete` 교환으로 한다.
2. 공유 인증 결함 2건을 고쳤다. `social_grant` 를 jti 기준 1회용으로 바꿨다(503 이면 소비를 되돌려 재시도 허용). 앱 handoff 페이지는 iOS 에서 커스텀 스킴으로 돌아오게 했다(안드로이드 intent:// 는 그대로).
3. 네이티브 SIWA·refresh token 암호화 저장·탈퇴 revoke 는 모두 설정이 있을 때만 동작한다(fail-closed). 시크릿이 등록되기 전까지 Apple 네이티브 로그인은 503 `apple_signin_not_configured`, 탈퇴 revoke 는 건너뜀+로그다.

## 2. 결정과 근거

- **쿠키 주입(WKHTTPCookieStore) 대신 기존 social_grant 교환**(프롬프트와 다름): 앱 인증은 쿠키가 아니라 localStorage Bearer + `X-Code-Destiny-Runtime: mobile-app` 이다(worker/lib/auth.js `isMobileAppAuthRequest`). 쿠키를 주입해도 앱 API 는 읽지 않는다. 같은 목적(외부 인증 결과를 앱 세션으로 안전하게 넘김)의 기존 장치가 social_grant(180초 JWT) → POST `/api/auth/oauth/complete` 다. 이 장치를 1회용으로 강화했다. 보안 관점: 쿠키 주입은 세션 토큰을 네이티브 계층에 노출하는 반면, grant 는 수명이 짧고 1회용이며 교환 결과는 기존 저장소로만 간다.
- **grant 1회용 = IdempotencyKey 고유 인덱스**: 새 컬렉션 없이 기존 `{userId, endpoint, keyHash}` 고유 인덱스를 쓴다(endpoint `auth_social_grant`, keyHash = sha256(`social-grant:${jti}`)). 재사용은 409 `social_grant_used` 다. 503 으로 끝난 교환은 소비 기록을 지워, 웹 콜백(StaticOAuthCallbackRedirect)의 기존 재시도가 계속 동작한다. jti 없는 grant 는 400 이다.
- **ASWebAuthenticationSession**: 커스텀 스킴 콜백을 시스템이 받아 시트를 닫는다. SFSafariViewController 는 스킴 302 를 막는 경우가 있다. `prefersEphemeralWebBrowserSession` 은 false 로 둬 사파리 로그인 상태를 재사용한다(재로그인 마찰↓).
- **네이티브 SIWA 서버 검증**: Apple JWKS 서명·iss·aud(=번들 ID `com.codedestiny.app`)·exp·nonce(=sha256(raw nonce) hex)·sub 를 확인한다. 웹 SIWA 와 같이 계정을 자동 생성·자동 연결하지 않는다. 새 사용자는 기존 소셜 가입 경로(signupPath)로, 같은 이메일의 기존 계정은 409 `apple_link_required` 다.
- **refresh token**: 네이티브 code 교환(redirect_uri 없음, client_id=번들 ID)은 best-effort 다. 토큰은 `encryptBoundSecret`(AES-256-GCM, `PII_ENC_KEY`, AAD=`apple-refresh:<sub>`)으로만 저장하고, 키가 없거나 교환이 실패하면 저장하지 않으며 로그인은 막지 않는다.
- **탈퇴 revoke**: 기존 handleWithdraw 의 익명화 직전에 한 단계를 넣었다. 결과는 no_apple / skipped_no_token / skipped_not_configured / revoked / failed 이고 어떤 경우에도 탈퇴를 막지 않는다. 보관함 분리·구매 기록 보존·환불 규칙은 바꾸지 않았다.
- **오류 분류**: 401 만 "다시 로그인" 안내다. 0(네트워크)·5xx·abort 는 재시도 안내이고 토큰을 지우지 않는다. 시트 취소(AUTH_CANCELLED)는 안내 없이 끝난다.
- **자격 상태 확인**: 부팅 때 저장된 Apple user ID 의 credential state 가 revoked/notFound 이면 앱 인증 키를 지우고 로그아웃 이벤트를 보낸다(Apple 가이드라인 요구).
- **xcstrings**: Swift 의 reject 문자열은 개발용 코드이고 사용자 문구는 브리지의 기존 12개 언어 사전으로 나간다. 새 네이티브 사용자 문구가 없어 Localizable.xcstrings 는 바꾸지 않았다.
- **iOS 결제 UI**: 이번 변경은 결제 UI 를 추가하지 않는다(Phase 6 범위).

## 3. 변경 파일

- worker/routes/auth.js
  - :1169, :6088 `/oauth/apple/native` 를 동일 출처 가드 예외·설정 점검 목록에 추가
  - :1293-1333 handoff 페이지 iOS 분기(UA 판정 → `com.codedestiny.app://auth?...`, 안드로이드 intent:// 유지)
  - :1500 `consumeSocialGrant`, :1516 `releaseSocialGrant`, :5442-5544 `/oauth/complete` 의 1회 소비·409·503 되돌림
  - :4212 탈퇴 중 `revokeAppleTokenForWithdraw`
  - :4972-5115 `handleAppleNativeSignIn`, :5121 `revokeAppleTokenForWithdraw`
  - :6154 라우트
- worker/lib/apple-signin.js:69-121 `readAppleNativeConfig`·`isAppleNativeSiwaConfigured`·`hashAppleNativeNonce`·`revokeAppleToken`
- worker/lib/pii-crypto.js:104-130 `encryptBoundSecret`·`decryptBoundSecret`(`secret-v1:` 봉투)
- worker/lib/models.js:121 `socialAccounts.apple.refreshTokenEnc`(기본 "")
- scripts/app-native-bridge.js:540 `iosAuthPlugin`, :548 `describeAuthExchangeError`, :558 `openNativeAppleSignIn`, :615 `checkAppleCredentialState`, :760-818 `openAuth` iOS 분기, :850 `completeMobileOAuth` 상태 코드 전달, :1870 부팅 시 상태 확인
- apps/mobile/ios/App/App/CodeDestinyViewController.swift:386 `CodeDestinyAuthSession`, :426-511 `CodeDestinyAuthPlugin`(startOAuth·signInWithApple·getAppleCredentialState), :88 등록, :358 놓친 OAuth 링크 보조 처리
- apps/mobile/ios/App/App/App.entitlements `com.apple.developer.applesignin` = Default
- 테스트: __tests__/worker/auth.social-grant-single-use.test.js(신규 3), __tests__/worker/auth.apple-native.test.js(신규 19), __tests__/ui/app-ios-auth.test.js(신규 7), __tests__/ui/oauth-app-handoff.test.js(+iOS 분기, 10), __tests__/ui/native-app-copy.behavior.test.js(부팅 스텁 1줄)

## 4. 검증

- 신규·수정 테스트(모두 mock, 실제 Apple·소셜 호출 없음):
  - 로컬 생성 키 JWKS 로 aud·nonce·exp·서명 실패 → 401, nonce 누락 → 400
  - 설정 4종 중 하나라도 없으면 503 `apple_signin_not_configured`, DB 쓰기 없음
  - 앱 요청이 아니면 403 `app_only`
  - grant 재사용 409, 503 뒤 재시도 허용, jti 없음 400
  - refresh token 은 암호문으로만 저장, 다른 sub 로는 복호화 실패, 키 없으면 미저장, 교환 실패는 로그인 비차단
  - 탈퇴 revoke 5경우(no_apple·토큰 없음·미설정·성공·실패) 모두 탈퇴 계속
  - 브리지: iOS 는 ASWebAuthenticationSession, 안드로이드는 Browser, 취소 무안내, 401/503/네트워크 분류
  - handoff: iOS UA 는 커스텀 스킴, 안드로이드 intent:// 기대값 그대로
- 기존 인증·탈퇴 jest 19개 스위트 201건 통과(pii-crypto 를 mock 하는 4개 스위트가 깨지지 않도록 namespace import 사용).
- `npm run check:fast`, `npm run check:pre-push`, ios-shell-build 결과는 핸드오프 문서(docs/handoff/ios-phase5-2026-11-20.md)의 단계 기록을 정본으로 한다.
- 미검증: 실제 기기에서의 Apple·구글·네이버·카카오 로그인(승인 범위 밖, 시크릿 미등록).

## 5. 레드팀 반려 사유(스스로 막은 것)

- "쿠키를 WKHTTPCookieStore 에 주입" — 앱 API 가 쿠키를 읽지 않아 효과가 없고, 세션 토큰을 네이티브 계층에 하나 더 둔다. 기존 grant 교환을 1회용으로 강화하는 쪽을 택했다.
- "네이티브 SIWA 에서 새 계정 자동 생성" — 웹 SIWA 와 정책이 달라지고 동의·약관 절차를 건너뛴다. 기존 소셜 가입 경로로 보낸다.
- "같은 이메일 계정에 Apple 자동 연결" — 계정 탈취 경로가 된다. 409 로 막는다.
- "revoke 실패 시 탈퇴 중단" — 외부 장애가 사용자의 탈퇴권을 막는다. 로그만 남기고 계속한다.
- "503 에서도 grant 소비 유지" — 일시 장애 뒤 웹·안드로이드 재시도가 깨진다. 503 에서는 소비를 되돌린다.
- "키 없을 때 refresh token 평문 저장" — 금지. 저장하지 않는다.

## 6. 사용자 할 일 (하기 전까지 꺼져 있는 것)

1. 워커 시크릿 등록(스테이징 먼저): `APPLE_TEAM_ID`, `APPLE_SIWA_KEY_ID`, `APPLE_SIWA_PRIVATE_KEY`(.p8), `APPLE_APP_BUNDLE_ID=com.codedestiny.app`. 이것이 없으면 iOS Apple 로그인은 503 `apple_signin_not_configured` 이고 탈퇴 revoke 는 건너뛴다. 웹 SIWA 는 종전대로 `APPLE_SIWA_SERVICES_ID` 가 필요하다.
2. `PII_ENC_KEY` 가 해당 환경에 있는지 확인. 없으면 refresh token 을 저장하지 않아 탈퇴 revoke 가 `skipped_no_token` 이 된다.
3. Apple Developer: App ID `com.codedestiny.app` 에 Sign in with Apple capability 를 켜고 프로비저닝 프로필 재발급. entitlements 는 이미 들어 있다.
4. Team ID 를 lib/app-links/apple-app-site-association.mjs 에 넣기(Phase 4 와 같은 항목).
5. 구글·네이버·카카오 콘솔은 바꿀 필요 없음(서버 콜백 URL 그대로, 앱 복귀는 기존 handoff 페이지).
6. 실기기 확인: 4개 공급자 로그인, 시트 취소, 비행기 모드 재시도 안내, 설정 > Apple ID 에서 앱 연결 해제 후 재실행 시 로그아웃, 탈퇴 뒤 Apple 연결 해제 확인.

## 7. 남은 위험

- 네이티브 SIWA 로 처음 가입한 사용자(가입 티켓 경로)와 웹 SIWA 사용자는 refresh token 이 저장되지 않아, 탈퇴 때 revoke 가 건너뛰어진다. 다음 Apple 로그인 때 저장된다.
- revoke 실패는 탈퇴를 막지 않으므로 Apple 쪽 연결이 남을 수 있다(로그로만 확인).
- 자격 상태 확인은 로컬에 저장된 Apple user ID 에 기대므로, 이번 버전 이전에 로그인한 사용자는 다음 Apple 로그인까지 확인되지 않는다.
- grant 1회용은 웹·안드로이드에도 적용된다. 성공 응답이 유실되면 같은 grant 로 재시도할 수 없어 다시 로그인해야 한다.
- 실기기·실공급자 검증 없음. macOS CI 는 컴파일과 기존 링크 전달 시나리오만 본다.

## 8. SEO 변경 동반 점검

공개 URL·메타·본문·내부 링크·canonical/hreflang·robots·sitemap·이미지 변경 없음. API·브리지·네이티브 코드만 바뀌었다. handoff 페이지는 `/api/auth/` 아래의 비색인 응답이다. → 영향 없음.