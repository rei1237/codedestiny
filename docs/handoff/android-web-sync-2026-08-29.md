---
status: active
updated: 2026-08-29
next: D(앱 `/api/*` 리타게팅)부터. E(가격 동일화)는 Play 콘솔 가격 인하가 선행이라 사용자 조치가 먼저다
---

# Android 앱 ↔ 웹 동기화 · 가격 동일화 · 릴리스

## 왜

> "웹 서비스와 Android 앱의 기능·UI·가격·결제·회원·API·로케일·정책을 완전히 동기화하고,
> 모바일 최적화 후, 최종 배포 파일을 바탕화면에 정리하라."

앱은 방치된 껍데기가 아니라 **Play 라이브 앱**(versionCode 25 / 1.0.25)이고
Play Billing·잠금화면·RouteProcessor 가 의도적 네이티브 통합이다.
계획 전문: 사용자 홈의 `.claude/plans/android-full-stack-devops-scalable-orbit.md`

## 지금 상태

- 워크트리 `android-web-sync-release` / 브랜치 `worktree-android-web-sync-release`.
  **커밋 2건, 아직 push·PR 없음.**
- **베이스라인 성립**(A 완료) — `npm run build:mobile:app` 통과 → `npx cap sync android`
  → `assembleDebug` **BUILD SUCCESSFUL**, `app-debug.apk` **126,867,785바이트**.
- 드리프트 가드 6종 전부 통과(아래 검증 명령 그대로).
- B·C 완료. 남은 것은 D·E·F·G 넷.

## 남은 작업

- [ ] **D. 앱 `/api/*` 리타게팅 (31개 호출 지점)**
      정본 구현은 `index.html:209-252`(설치 지점 `:418`). 이식 위치는
      `scripts/app-native-bridge.js:25` 뒤 — 앱 전 HTML 에 주입되는 유일한 파일이라
      웹 blast radius 가 0이다. 🔴 호출부 31곳(`app/_lib/api-config.ts:110-114`)을
      직접 고치면 **웹 동작까지 바뀐다.**
      판정: 기기에서 `fetch('/api/version')` 이 HTML 200 이 아니라 JSON 을 준다.
- [ ] **E. 가격 동일화** — 콘텐츠 티어 **8개만**(이용권 4종은 이미 앱가=웹가).
      편집 5파일 + 문서 4. 상세 표는 스크래치의 `cd-android/EDIT-PLAN.md`.
      가격 정본: `worker/lib/app-store-pricing.js:35-49`(콘텐츠) / `:66-71`(이용권).
- [ ] **F. 실기기 검증** — 사용자가 USB 연결 예정.
      `docs/app-audit/DIAGNOSIS_REPORT.md` 의 "기기검증필요" 11건이 우선 대상.
- [ ] **G. 릴리스** — 🔴 **업로드 키스토어 분실**(C 드라이브·D 드라이브·휴지통 전수 검색 0건).
      AAB 배포 중 = Play App Signing 가입 = **업로드 키 재설정 가능**. 승인 전엔 못 올린다.
      versionCode **26**, versionName `1.0.26`.

## 함정

- 🔴 **APK 가 121MB 다.** 원인은 코드 결함이 아니라 `public/codedestinyassets/` 가 이 PC 에
  없어서 VN·음원 CDN 오프로드가 **0건**("참조 0건 재작성 / 제외 0개 / 0.0 MB")인 것.
  릴리스 전에 `node scripts/fetch-novel-assets.mjs` 로 채워야 하고, 안 채우면 이 빌드의
  VN·노벨 자산도 깨진다.
- 🔴 **`npx cap sync android` 는 `apps/mobile/android/capacitor.settings.gradle` 의
  node_modules 상대경로를 워크트리 기준(`../../../../../../`)으로 다시 쓴다 — 커밋 금지.**
  `git checkout --` 로 되돌린다. 메인 체크아웃의 `../../../` 가 정답이다.
- 🔴 **줄바꿈**: `verify-app-store-pricing.mjs`·`verify-app-store-billing-policy.mjs`·
  `create-play-console-products.mjs`·`build-mobile-app.mjs`·`verify-app-no-portone.mjs` 는
  **CRLF**. Edit/sed 로 고치면 전 파일 diff 가 된다 → node 패치 스크립트로.
  `app-native-bridge.js`·`app-payment-guard.js`·`app-store-pricing.js` 는 LF.
- 🔴 `verify:app-store-billing-policy` 는 **CI 배선돼 있고** 가격 동일화 시 반드시 깨진다
  (`:102` `amountKRW > webAmountKRW`, `:154` 커버리지 상수). 같은 커밋에 고칠 것.
- 🔴 **Play 가격 인하가 코드 배포보다 먼저**다. 반대로 하면 화면 ₩3,000 / 실청구 ₩3,900 =
  정책 위반.
- 🔴 `play:products:apply` 는 Play 에 실제로 쓴다 — 실행 금지. 실결제 승인도 금지.
- 워크트리에서 `npm install` 금지(정션이라 공유 설치본에 쓴다). 정리는 `cmd /c rmdir` 로
  링크부터.
- `scripts/verify-app-remote-assets.mjs` 는 **존재하지 않는다**(주석 2곳이 있다고 거짓 기술).
  자산 80개 CDN 실재는 무검증이다.
- `npm run build:cf` 는 `prebuild:cf` 를 **두 번** 돈다 — npm 의 `pre` 생명주기 훅이 자동
  실행하고 `build:cf` 본문이 또 부른다. 웹 경로도 원래 그렇다. 두 번째는 멱등이라
  무해하지만 시간 낭비다(미수정).
- `build:cf` 가 다시 쓰는 추적 파일(`rss.xml`·`insights/rss.xml` + `public/` 미러)은
  커밋 전에 되돌린다. `.ignore`·`capacitor.build.gradle` 은 EOL 차이뿐이라 내버려 둔다.

## 검증

```
npm run build:mobile:app                    # dist 재생성 + 가드 주입 + 드리프트 검증
cd apps/mobile && npx --no-install cap sync android
apps/mobile/android/gradlew.bat assembleDebug --no-daemon   # cmd 는 절대경로로 호출할 것
npm run verify:app-store-billing-policy
npm run verify:app-store-pricing
npm run verify:play-console-products
npm run verify:mobile-pricing-parity
npm run verify:payment-freeze
```

## 모르는 것

- 업로드 키 재설정 승인 소요 시간. 그 전까지 G 는 진행 불가.
- D 를 브릿지에 넣을 때 앱의 OAuth 딥링크·잠금화면 위젯이 같은 `/api/*` 를 타는지
  (`app-native-bridge.js` 밖의 네이티브 호출 경로) — 미확인.
- 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라.
