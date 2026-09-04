---
status: active
updated: 2026-09-04
next: 사용자가 Desktop\CodeDestiny-Build\20260904-2025-1.0.43-43-4d2414fcd 의 AAB+mapping 을 Play 내부 테스트에 올리고 실기기에서 이용권 1건 구매 확인 → 그 다음이 Zero-Tap 서버 PR
---

# 앱 vc43 재빌드 — Google Play 이용권 구매 재개본

## 왜

"앱에서도 이용권 구매가 잘되는 것이 의도 … 앱도 제대로 이용권 구매가 되는 버전으로 다시 빌드해서 업로드할 수 있도록 해줘" (2026-09-02).
🔴 이어서 "아직 앱은 빌드하지 말아줘, 고칠 게 많아 보인다" — **빌드는 사용자 신호가 있을 때만 시작한다.**

## 지금 상태

- 이용권 구매 재개 PR #1496·#1502·#1505·#1538·#1543 은 main 에 있고 프로덕션 승격 완료(2026-09-03). vc42 는 구매가 **막힌** 번들이었다.
- 2026-09-04: Google Play 신품질기준(메모리·R8·Zero-Tap) 대응 PR #1560 머지(main `4d2414fcd`) — `MainActivity.onTrimMemory`, `CodeDestinyCredentialsPlugin` 뼈대 + `androidx.credentials 1.6.0`, `measure:app-memory`, 보고서 [docs/app-audit/PLAY_QUALITY_AUDIT_2026-09-04.md](../app-audit/PLAY_QUALITY_AUDIT_2026-09-04.md) · [docs/app-audit/ZERO_TAP_SIGNIN_DESIGN.md](../app-audit/ZERO_TAP_SIGNIN_DESIGN.md).
- 2026-09-04 20:25 KST: **vc43 / 1.0.43 빌드 완료** — `Desktop\CodeDestiny-Build\20260904-2025-1.0.43-43-4d2414fcd\` (AAB·APK·mapping.txt·upload_certificate.pem·BUILD_INFO.txt·감사 보고서 복사본). 판정 전 항목 통과 — 상세와 수치는 그 폴더의 BUILD_INFO.txt 가 정본. 요지: 서명 키 동일, dist 재개 마커 3종 존재, DEX 1.6 MB(임계 10 MB), R8 커버리지 ~76%(mapping 리네임 80.3%), 에뮬레이터 스모크(상점 렌더·가격 `—`·뒤로가기 계약·트림 후 복귀) 정상, 메모리 기준선 RSS 230→238 MB(fg→bg).
- 빌드 중 발견해 이 핸드오프와 같은 PR 로 고친 것: `measure:app-memory` 가 adb 가 PATH 에 없으면 "기기 없음" 으로 오진(ANDROID_HOME 폴백 추가), `Graphics` 열이 콜론 때문에 늘 `—`, gms `dumpsys package` 가 1 MB maxBuffer 초과로 `?`. 테스트 `__tests__/release/measure-app-memory-parse.test.js`.

## 남은 작업

- [ ] **사용자**: 위 폴더의 AAB(+mapping.txt) 를 Play 내부 테스트 트랙에 업로드 → 인앱 상품 `cd_pass_{standard,premium,vvip,family}_30d` 활성 확인 → 실기기에서 이용권 탭 가격 4종 표시·스탠다드 1건 테스트 구매·이용권 적용 확인. 권한 목록에 `USE_BIOMETRIC`·`USE_FINGERPRINT` 가 새로 보이는 것은 `androidx.biometric 1.1.0`(credentials 전이) 때문이며 normal 권한이라 신고 양식 없음.
- [ ] 후속 PR(critical 티어, 사전 보고 7항목): Zero-Tap 서버 3 라우트 + 로그인 후 `create` · 첫 실행 `restore` · 로그아웃 `clear` 호출부 — 설계 문서 §4. 첫 실측 항목: 디버그 빌드에서 `Capacitor.Plugins.CodeDestinyCredentials.isAvailable()/restore()` 실호출(릴리스 WebView 는 디버깅 불가라 vc43 에서 못 눌렀다; R8 이 `CredentialManager` 인터페이스를 REMOVED 로 표시했는데 구현 클래스로 디버추얼라이즈된 것으로 `추정`).
- [ ] 범위 밖 관찰(앱 UX, 별도 판단): 첫 실행 직후 "새 버전이 배포되었습니다" 토스트가 하단 도크의 이용권·마이 탭을 덮는다(로컬 dist 앱에도 배포 갱신 안내가 뜬다) · `/app/store/` 에서 도크 활성 탭이 홈으로 남는다(이용권 탭 href `/points/` ≠ 실제 경로).

## 정본 예시

- 앱 이용권 서버 경로: `worker/routes/app-store.js` (`/google/verify` → `buildEntitlementUpdate`)
- 앱 상점 클라이언트: `app/app/store/AppPassStoreClient.tsx`
- 버전 주입: `apps/mobile/android/app/build.gradle:71-72` (`-P` 가 `release-signing.properties` 값을 덮는다)

## 함정

- `release-signing.properties` 는 메인 체크아웃에만 있고 키스토어 비밀번호가 들어 있다 — 읽거나 출력하지 말 것. 사용자 스크립트 `Desktop\CodeDestiny-업로드-준비\_전부하기.ps1` 은 Read-Host 대화형이라 에이전트가 못 돌리고, `$VersionCode` 가 40 으로 낡아 있다.
- R8 릴리스 크래시·에뮬레이터 함정: [android-vc41-r8-crash-2026-09-01.md](android-vc41-r8-crash-2026-09-01.md)
- 워크트리에서 `cap sync` 를 돌리면 gradle 에 워크트리 깊이의 node_modules 경로가 박힌다 — 빌드는 메인 체크아웃에서.
- 워크트리 세션은 메인 체크아웃 안에서 워크트리 스크립트를 실행하는 명령을 오토 모드 분류기가 막는다 — 검증 빌드는 워크트리 안에서 돌릴 것.

## 검증

```
npm run build:mobile:app
node scripts/verify-app-no-portone.mjs --dist dist
npm run verify:app-store-billing-policy
```

## 모르는 것

- Play Console 이용권 SKU 4종의 활성 상태 — 에뮬레이터 상점 가격이 `—` 인 것이 상품 부재인지 비활성인지 여기서는 구분 못 한다.
- (해소) AVD `cdtest` 는 Google APIs 이미지다 — GMS versionCode 252635038, WebView 133.0.6943.137 (2026-09-04 실측).
