---
status: active
updated: 2026-09-04
next: 사용자가 Desktop\CodeDestiny-Build\20260904-2344-1.0.44-44-42f414e0d 의 AAB+mapping 을 Play 내부 테스트에 올리고, 실기기에서 ① Zero-Tap 재설치 자동 로그인 ② 이용권 1건 구매 를 확인
---

# 앱 vc43 재빌드 — Google Play 이용권 구매 재개본

## 왜

"앱에서도 이용권 구매가 잘되는 것이 의도 … 앱도 제대로 이용권 구매가 되는 버전으로 다시 빌드해서 업로드할 수 있도록 해줘" (2026-09-02).
🔴 이어서 "아직 앱은 빌드하지 말아줘, 고칠 게 많아 보인다" — **빌드는 사용자 신호가 있을 때만 시작한다.**

## 지금 상태

- 이용권 구매 재개 PR #1496·#1502·#1505·#1538·#1543 은 main 에 있고 프로덕션 승격 완료(2026-09-03). vc42 는 구매가 **막힌** 번들이었다.
- 2026-09-04: Google Play 신품질기준(메모리·R8·Zero-Tap) 대응 PR #1560 머지(main `4d2414fcd`) — `MainActivity.onTrimMemory`, `CodeDestinyCredentialsPlugin` 뼈대 + `androidx.credentials 1.6.0`, `measure:app-memory`, 보고서 [docs/app-audit/PLAY_QUALITY_AUDIT_2026-09-04.md](../app-audit/PLAY_QUALITY_AUDIT_2026-09-04.md) · [docs/app-audit/ZERO_TAP_SIGNIN_DESIGN.md](../app-audit/ZERO_TAP_SIGNIN_DESIGN.md).
- 2026-09-04 20:25 KST: **vc43 / 1.0.43 빌드 완료** — `Desktop\CodeDestiny-Build\20260904-2025-1.0.43-43-4d2414fcd\` (AAB·APK·mapping.txt·upload_certificate.pem·BUILD_INFO.txt·감사 보고서 복사본). 판정 전 항목 통과 — 상세와 수치는 그 폴더의 BUILD_INFO.txt 가 정본. 요지: 서명 키 동일, dist 재개 마커 3종 존재, DEX 1.6 MB(임계 10 MB), R8 커버리지 ~76%(mapping 리네임 80.3%), 에뮬레이터 스모크(상점 렌더·가격 `—`·뒤로가기 계약·트림 후 복귀) 정상, 메모리 기준선 RSS 230→238 MB(fg→bg).
- 2026-09-04 23:44 KST: **vc44 / 1.0.44 빌드 완료** (main `42f414e0d`) — `Desktop\CodeDestiny-Build\20260904-2344-1.0.44-44-42f414e0d\`. Zero-Tap 호출부가 실제로 들어간 첫 빌드. 수치와 절차는 그 폴더의 BUILD_INFO.txt 가 정본. 요지: 서명 지문 vc43 과 동일, AAB 안 `app-native-bridge.js` 에 `runRestoreCredentialFlow` 4건, **`apps/mobile/android` 변경 0건이라 dex 크기·mapping.txt 해시가 vc43 과 완전 동일**(R8 수치 재측정 불필요), 에뮬레이터 콜드 스타트 FATAL 0건·홈 렌더 정상. 🔴 vc43 은 이제 올리지 말 것.
- 빌드 중 발견해 이 핸드오프와 같은 PR 로 고친 것: `measure:app-memory` 가 adb 가 PATH 에 없으면 "기기 없음" 으로 오진(ANDROID_HOME 폴백 추가), `Graphics` 열이 콜론 때문에 늘 `—`, gms `dumpsys package` 가 1 MB maxBuffer 초과로 `?`. 테스트 `__tests__/release/measure-app-memory-parse.test.js`.

## 남은 작업

- [ ] **사용자**: vc44 폴더의 AAB(+mapping.txt) 를 Play 내부 테스트 트랙에 업로드 → 인앱 상품 `cd_pass_{standard,premium,vvip,family}_30d` 활성 확인 → 실기기에서 이용권 탭 가격 4종 표시·스탠다드 1건 테스트 구매·이용권 적용 확인. 권한 목록에 `USE_BIOMETRIC`·`USE_FINGERPRINT` 가 새로 보이는 것은 `androidx.biometric 1.1.0`(credentials 전이) 때문이며 normal 권한이라 신고 양식 없음.
- [x] Zero-Tap **1차 PR #1562** (머지됨 `fa6fcb409`): 서버 3라우트 `/api/auth/restore-credential/{challenge,register,assert}` + 검증 코어 `worker/lib/webauthn-restore.js` + `users.restoreCredentials`. **호출부 0** 이라 런타임 영향 없다. 판단이 들어간 지점(공개키를 COSE 아닌 JWK 로 저장 · WebCrypto ES256 · origin 대신 rpIdHash 결속 · challenge 저장소로 `IdempotencyKey` 재사용)은 PR 본문이 정본.
- [x] Zero-Tap **2차 PR #1564** (머지됨 `42f414e0d`): `scripts/app-native-bridge.js` 호출부 A·B·C. **등록을 로그인 직후가 아니라 부팅에 뒀다**(설계 문서 §4-A 와 다른 지점 — 로그인 직후는 60ms 뒤 `location.replace` 가 요청을 죽이고, 기존 로그인 사용자는 영영 등록되지 않는다). 판단 지점은 PR 본문이 정본.
- [ ] 🔴 **실기기 Zero-Tap 확인**(vc44 로 가능해졌다): 로그인 → 앱 재시작(등록) → 앱 삭제 → 재설치 → 첫 화면이 로그인 상태인가. **에뮬레이터로는 여기까지 못 간다** — 릴리스 WebView 가 콘솔을 logcat 에 안 흘리고(vc44 실측: 전체 logcat 에 `CONSOLE` 0줄) 로그인할 계정도 없다. vc44 스모크로 확인된 것은 "복원 시도가 기동을 깨지 않는다"까지다. 실패하면 첫 용의자는 아래 `assetlinks.json`.
- [ ] 🔴 **`assetlinks.json` 이 없다** — 설계 문서 §7-2 는 "이미 서빙 중"이라고 적었지만 **사실이 아니다**(2026-09-04 실측: `git grep assetlinks` 는 문서 4건뿐, `https://code-destiny.com/.well-known/assetlinks.json` 은 404). 앱이 App Links 가 아니라 커스텀 스킴 `com.codedestiny.app://auth` 를 쓰기 때문이다. Restore Credentials 가 `delegate_permission/common.get_login_creds` 를 요구하면 **Play 앱 서명 키의 SHA-256** 으로 새로 만들어야 하고, 그 값은 Play Console 에서 **사용자만** 읽을 수 있다(업로드 키 지문으로는 안 된다).
- [ ] 범위 밖 관찰(앱 UX, 별도 판단): 첫 실행 직후 "새 버전이 배포되었습니다" 토스트가 하단 도크의 이용권·마이 탭을 덮는다(로컬 dist 앱에도 배포 갱신 안내가 뜬다) · `/app/store/` 에서 도크 활성 탭이 홈으로 남는다(이용권 탭 href `/points/` ≠ 실제 경로).

## 정본 예시

- 앱 이용권 서버 경로: `worker/routes/app-store.js` (`/google/verify` → `buildEntitlementUpdate`)
- 앱 상점 클라이언트: `app/app/store/AppPassStoreClient.tsx`
- 버전 주입: `apps/mobile/android/app/build.gradle:71-72` (`-P` 가 `release-signing.properties` 값을 덮는다)

## 함정

- `release-signing.properties` 는 메인 체크아웃에만 있고 키스토어 비밀번호가 들어 있다 — 읽거나 출력하지 말 것. 사용자 스크립트 `Desktop\CodeDestiny-업로드-준비\_전부하기.ps1` 은 Read-Host 대화형이라 에이전트가 못 돌리고, `$VersionCode` 가 40 으로 낡아 있다.
- R8 릴리스 크래시·에뮬레이터 함정: [android-vc41-r8-crash-2026-09-01.md](android-vc41-r8-crash-2026-09-01.md)
- 워크트리에서 `cap sync` 를 돌리면 gradle 에 워크트리 깊이의 node_modules 경로가 박힌다. **해법은 `sync` 대신 `cap copy` 뿐이다**(vc44 실증): 워크트리 루트에 메인 체크아웃 `node_modules` 정션 + `apps/mobile/android/capacitor-cordova-android-plugins` 복사본을 넣으면 기존 상대경로가 그대로 풀린다. 셋 다 gitignored 라 `git status` 가 깨끗하다.
- 릴리스 서명은 `apps/mobile/android/release-signing.properties` 가 **파일로 존재해야** 성립한다(`build.gradle:52-62` 이 없으면 릴리스 태스크를 중단시킨다 — 디버그 서명 폴백 없음). 워크트리에서는 메인 체크아웃 것을 **읽지 말고 복사**해 쓰고 빌드 후 지운다. 서명 지문이 vc43 과 같은지로 절차가 맞았는지 확인된다.

## 검증

```
npm run build:mobile:app
node scripts/verify-app-no-portone.mjs --dist dist
npm run verify:app-store-billing-policy
```

## 모르는 것

- Play Console 이용권 SKU 4종의 활성 상태 — 에뮬레이터 상점 가격이 `—` 인 것이 상품 부재인지 비활성인지 여기서는 구분 못 한다.
- (해소) AVD `cdtest` 는 Google APIs 이미지다 — GMS versionCode 252635038, WebView 133.0.6943.137 (2026-09-04 실측).
