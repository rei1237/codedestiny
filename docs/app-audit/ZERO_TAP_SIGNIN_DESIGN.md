# ZERO_TAP_SIGNIN_DESIGN — Android Restore Credentials 로 새 기기 자동 로그인

> 2026-09-04 · Google Play 필수화 2027-04 · 상태: **네이티브 뼈대까지 머지(이번 PR), 서버·호출부는 후속 PR**
> 🔴 사용자 제약: Google OAuth 는 **커스텀탭만** 유지한다. Restore Credentials 는 OAuth 를 대체하지 않는다 — 이미 로그인한 세션을 새 기기로 **복원**하는 층이다.

---

## 1. 현재 인증 흐름과 빈 자리

```
[앱] 로그인 버튼 → CodeDestinyNavigationPlugin.openAuth → 커스텀탭(code-destiny.com/api/auth/oauth/<provider>)
   → 딥링크 com.codedestiny.app://auth?code=… → scripts/app-native-bridge.js
   → POST /api/auth/oauth/complete → localStorage fortune_auth_token / fortune_auth_refresh_token / fortune_auth_user
   → window 이벤트 cd:auth-changed
```

- 토큰 3종은 WebView localStorage(앱 데이터)에만 있다. `android:allowBackup="false"` 라 기기 이전·재설치 시 **아무것도 넘어오지 않는다** → 매번 커스텀탭 로그인.
- 구매 복원은 별도로 부팅마다 `POST /api/app-store/google/restore` 가 돈다(`scripts/app-native-bridge.js`) — 세션만 복원되면 이용권 정합은 자동이다.

## 2. Restore Credentials 가 하는 일 (검증된 사실)

| 항목 | 값 | 출처 |
|---|---|---|
| 라이브러리 | `androidx.credentials:credentials:1.6.0` + `credentials-play-services-auth:1.6.0`(stable 2026-04-08; Restore Credentials 는 1.5.0 부터 stable) | Maven POM |
| 전이 의존 | `play-services-auth 21.1.1` · `play-services-fido` · `play-services-auth-blockstore` · `identity-credentials 16.0.0-alpha08` · `googleid` | POM |
| 동작 조건 | API 28+ · Google Play services ≥ 24220000 · 사용자 Google 계정 + 백업 ON + 화면잠금 | 공식 문서 |
| 생성 | `CreateRestoreCredentialRequest(requestJson, isCloudBackupEnabled)` → `CreateRestoreCredentialResponse.getResponseJson()` | 소스 |
| 복원 | `GetCredentialRequest` + `GetRestoreCredentialOption(requestJson)` → `RestoreCredential.getAuthenticationResponseJson()`; `userVerification` 은 `discouraged` 고정이고 **다른 옵션과 섞을 수 없다** | 소스 |
| 삭제 | `ClearCredentialStateRequest(TYPE_CLEAR_RESTORE_CREDENTIAL)` | 소스(개요 문서의 `ClearRestoreCredentialRequest` 는 이 상수의 별명) |
| E2EE 없음 | `E2eeUnavailableException` → `isCloudBackupEnabled=false` 로 1회 재시도(기기-로컬 전송만) | 공식 권장 |
| 새 기기 감지 | **브로드캐스트 없음.** `allowBackup=false` 라 `BackupAgent.onRestoreFinished` 경로도 없다 → "첫 실행에 localStorage 토큰이 없으면 `restore` 호출" 한 가지 | 소스·매니페스트 |
| 요청 JSON | WebAuthn `PublicKeyCredentialCreationOptionsJSON` / `PublicKeyCredentialRequestOptionsJSON`. `challenge`·`user.id` 는 base64url. `rp.id` 는 도메인 | 공식 문서 |

## 3. 이번 PR 에 들어간 뼈대

| 파일 | 내용 |
|---|---|
| `apps/mobile/android/variables.gradle` · `app/build.gradle` | 의존성 2줄 |
| `apps/mobile/android/app/src/main/java/com/codedestiny/app/CodeDestinyCredentialsPlugin.java` | `@CapacitorPlugin(name="CodeDestinyCredentials")` — `isAvailable()` → `{ok, available, sdk, playServices}` · `create({requestJson})` → `{ok, cloudBackup, responseJson}`(E2EE 폴백 포함) · `restore({requestJson})` → `{ok, responseJson}` · `clear()` → `{ok}`. 모든 실패는 `resolve({ok:false, code:<예외 simpleName>, message})`, 본문 전체 `try/catch(Throwable)`. `NoCredentialException` 은 정상 부재다 |
| `MainActivity.java` | `registerPlugin(CodeDestinyCredentialsPlugin.class)` |
| `app/proguard-rules.pro` | `-keep class com.codedestiny.app.CodeDestinyCredentialsPlugin { *; }` |
| `scripts/app-native-bridge.js` | `window.CodeDestinyNative.credentials.{isAvailable,create,restore,clear}` — 플러그인 부재 시 `{ok:false, code:"NATIVE_CREDENTIALS_UNAVAILABLE"}` |

**호출부는 0곳이다.** 런타임 영향은 의존성으로 늘어나는 DEX 크기뿐.

## 4. 목표 흐름 (후속 PR)

```
A. 등록 — 로그인 성공 직후 (app-native-bridge.js 의 oauth/complete 성공 콜백 뒤)
   1. credentials.isAvailable() → available=false 면 끝(조용히)
   2. POST /api/auth/restore-credential/challenge  { purpose:"create" }
        ← { requestJson }   (rp.id=code-destiny.com, user.id=<userId base64url>, challenge, pubKeyCredParams ES256)
   3. credentials.create({ requestJson }) → { ok, responseJson, cloudBackup }
   4. POST /api/auth/restore-credential/register  { responseJson }
        서버: attestation 파싱 → 공개키·credentialId 저장 users.restoreCredentials[]
   실패는 전부 무시(로그만) — 로그인 자체는 이미 끝났다.

B. 복원 — 앱 첫 실행 (app-native-bridge.js 부팅 경로, localStorage 토큰 3종이 전부 없을 때만)
   1. credentials.isAvailable() → false 면 끝
   2. POST /api/auth/restore-credential/challenge  { purpose:"assert" }  ← { requestJson }
   3. credentials.restore({ requestJson })
        → { ok:false, code:"NoCredentialException" } 이면 끝(신규 사용자·미등록)
   4. POST /api/auth/restore-credential/assert  { responseJson }
        서버: credentialId 로 공개키 조회 → 서명·challenge·rpIdHash 검증 → 기존 세션 발급기와 같은 access+refresh 발급
   5. 기존 저장 경로 재사용: localStorage 3종 저장 → cd:auth-changed → 부팅 restore(구매 복원)가 그대로 이어진다

C. 해제 — 로그아웃 · 탈퇴
   /api/auth/logout · /api/auth/withdraw 응답 뒤 클라이언트에서 credentials.clear()
   서버는 withdraw 시 users.restoreCredentials 삭제, logout 시 유지(다른 기기의 복원 키는 살아 있어야 한다)
```

### 서버 초안 (critical 티어 — 사전 보고 7항목 뒤 착수)

- `worker/routes/auth.js` 에 3 라우트: `/restore-credential/challenge`, `/restore-credential/register`, `/restore-credential/assert`.
- challenge 저장: 기존 OAuth state 저장소와 같은 TTL 컬렉션(5분, 1회용).
- 스키마: `users.restoreCredentials: [{ credentialId, publicKeyCose, algorithm, signCount, cloudBackup, createdAt, lastUsedAt, deviceLabel }]` — 추가만(forward-fix-only).
- assert 성공 시 발급은 **기존 refresh 회전 로직을 그대로 호출**한다. 새 발급 경로를 만들지 않는다.
- register 는 access 토큰 인증 필수(로그인 직후라 있음). assert 는 비인증 + rate-limit(IP·credentialId).

### 웹 셸 호출부 위치

- 등록: `scripts/app-native-bridge.js` 의 `oauth/complete` 성공 뒤(토큰 저장 직후).
- 복원: 같은 파일 부팅 경로에서 구매 복원(`/api/app-store/google/restore`) **앞**에 — 세션이 있어야 구매 복원의 사용자 매핑이 맞는다.
- 해제: 로그아웃 버튼 핸들러(셸 `js/` 의 logout 경로)와 탈퇴 완료 핸들러.

## 5. Play Billing 과의 관계

- 이용권은 서버 `users` 엔타이틀먼트에 있고 Play 구매는 `purchaseToken` 으로 서버가 사용자와 묶는다. 세션이 복원되면 부팅 `restore` 가 기존대로 돌아 정합된다. **Billing 코드 변경 없음.**
- 새 기기에서 세션 복원 전에 사용자가 구매하면 게스트 매핑이 되는 기존 문제는 이 설계와 무관하다(현재도 같다).

## 6. 위험

| 위험 | 대응 |
|---|---|
| 리프레시 토큰 회전의 재사용 탐지와 충돌(구 기기·새 기기 동시 세션) | assert 는 **새 refresh 패밀리**를 만든다(구 기기 세션은 그대로). 패밀리 수 상한은 기존 정책 따름 |
| 복원 키 탈취 → 영구 로그인 | 키는 Play services E2EE/기기-로컬에만 있고 서버는 공개키만 보관. assert rate-limit + `signCount` 단조 증가 검사 |
| `identity-credentials` 가 alpha 버전 | stable 1.6.0 이 고정하는 전이값 — 수용. 업그레이드는 `variables.gradle` 한 줄 |
| API<28·GMS 없음(중국 ROM 등) | `available=false` 로 닫힘 — 커스텀탭 로그인 그대로 |
| DEX 증가 | vc43 빌드 뒤 실측 기록(10 MB 임계 대비) |

## 7. 미검증 (후속 PR 의 첫 실측 항목)

1. `allowBackup=false` 상태에서 Block Store 클라우드 백업으로 복원 키가 새 기기에 실제로 오는지 — 문서는 앱 백업과 무관하다고 하지만 실측 없음.
2. `rp.id=code-destiny.com` 에 Digital Asset Links(`/.well-known/assetlinks.json` 의 `delegate_permission/common.get_login_creds`) 검증이 요구되는지 — 패스키와 같은 규칙이면 필요. 이미 `assetlinks.json` 을 앱 링크용으로 서빙하고 있으니 항목 추가만이면 된다.
3. 에뮬레이터 `cdtest` 가 Google APIs 이미지인지(`adb shell dumpsys package com.google.android.gms | grep versionCode` ≥ 24220000) — 아니면 `isAvailable` 이 false 라 뼈대 테스트가 거기서 끝난다.

## 8. 테스트 (뼈대, vc43 릴리스 APK)

```
adb logcat -s Capacitor                         # 플러그인 등록 로그(vc41 회귀 방지)
# chrome://inspect 콘솔
Capacitor.Plugins.CodeDestinyCredentials.isAvailable()
CodeDestinyNative.credentials.restore({ requestJson: JSON.stringify({ challenge:"AAAA", rpId:"code-destiny.com" }) })
   → 계정 없는 AVD: { ok:false, code:"NoCredentialException" | "GetCredentialProviderConfigurationException" }
CodeDestinyNative.credentials.create({ requestJson: "<WebAuthn creation options>" })
   → E2EE 없는 AVD: cloudBackup=false 폴백 경로 또는 CreateCredentialProviderConfigurationException
CodeDestinyNative.credentials.clear()             → { ok:true }
```

전체 흐름(A→B) 테스트는 후속 PR 에서: Google 계정 + 백업 ON 인 AVD 두 대, 1대에서 로그인 → 2대에서 첫 실행 자동 로그인.
