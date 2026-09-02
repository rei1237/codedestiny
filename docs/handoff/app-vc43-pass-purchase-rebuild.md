---
status: active
updated: 2026-09-03
next: 사용자가 "앱 빌드 진행" 을 말하면 — PR #1505 머지 확인 → 메인 체크아웃 main 을 ff-pull → vc43/1.0.43 빌드
---

# 앱 vc43 재빌드 — Google Play 이용권 구매 재개본

## 왜

"앱에서도 이용권 구매가 잘되는 것이 의도 … 앱도 제대로 이용권 구매가 되는 버전으로 다시 빌드해서 업로드할 수 있도록 해줘" (2026-09-02).
🔴 이어서 "아직 앱은 빌드하지 말아줘, 고칠 게 많아 보인다" — **빌드는 사용자 신호가 있을 때만 시작한다.**

## 지금 상태

- 서버·클라이언트 재개(PR #1502)와 결제 fetch 25초 타임아웃(PR #1496)은 main 에 머지됐고 **프로덕션 승격 완료**(`/api/version` = c6e221c72, 2026-09-03 03:4x KST).
- 앱 빌드 차단 결함: main 에서 `npm run build:mobile:app` 이 postbuild `verify-adsense-readiness` 로 실패(PR #1492 가 SEO 링크 허브를 `IS_APP_BUILD` 로 뺀 결과). 수정 PR #1505 — CI 통과, 머지 대기.
- 마지막 앱 산출물은 vc42(`Desktop\CodeDestiny-Build\20260902-0025-1.0.42-42-676d602b8`) — 이용권 구매가 **막힌** 번들이다. 다음은 **vc43 / 1.0.43**.

## 남은 작업

- [ ] PR #1505 머지 (없으면 앱 빌드가 postbuild 에서 죽는다)
- [ ] 사용자가 말한 "고칠 것" 목록 받기 — 빌드 전에 main 에 들어가야 할 PR 이 무엇인지
- [ ] 메인 체크아웃(`D:\Development\code-destiny`)에서 `git pull --ff-only` → `npm run build:mobile:app` → `apps/mobile` 에서 `npx --no-install cap sync android` → `gradlew.bat -p apps\mobile\android -PCODE_DESTINY_ANDROID_VERSION_CODE=43 -PCODE_DESTINY_ANDROID_VERSION_NAME=1.0.43 bundleRelease assembleRelease --no-daemon`
- [ ] 판정 기준: `aapt2 dump badging` versionCode 43 · 서명 SHA-256 `73c00468a54d…c501427` 일치 · dist 의 `/app/store/` 청크에 `billingNotReadyTitle` 문구가 있고 옛 "구매 중단" 문구가 없음 · 산출물을 `Desktop\CodeDestiny-Build\<yyyyMMdd-HHmm>-1.0.43-43-<sha>` 에 AAB·APK·mapping.txt·upload_certificate.pem·BUILD_INFO.txt 로 저장
- [ ] 빌드 뒤 `git checkout -- .ignore rss.xml insights/rss.xml public/rss.xml public/insights/rss.xml apps/mobile/android/capacitor.settings.gradle apps/mobile/android/app/capacitor.build.gradle`
- [ ] 사용자에게 Play Console 상품 `cd_pass_{standard,premium,vvip,family}_30d` 활성 여부 확인 요청 (여기서 못 본다 — 비활성이면 앱 상점 가격이 `—`)

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

- 사용자가 말한 "고칠 것" 의 구체 목록 — 물어볼 것.
- Play Console 이용권 SKU 4종의 활성 상태.
