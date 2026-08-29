---
status: active
updated: 2026-08-29
next: F(실기기 검증) — USB 연결 후. G 는 업로드 키 재설정 승인 대기
---

# Android 앱 ↔ 웹 동기화 · 가격 동일화 · 릴리스

## 왜

> "웹 서비스와 Android 앱의 기능·UI·가격·결제·회원·API·로케일·정책을 완전히 동기화하고,
> 모바일 최적화 후, 최종 배포 파일을 바탕화면에 정리하라."

앱은 방치된 껍데기가 아니라 **Play 라이브 앱**이고 Play Billing·잠금화면·RouteProcessor 가
의도적 네이티브 통합이다. 계획 전문: 사용자 홈의
`.claude/plans/android-full-stack-devops-scalable-orbit.md`

## 지금 상태

- **A·B·C·D·E 완료. 남은 것은 F·G 둘.**
- D 는 PR **#1276**(`feat/app-api-retarget`) — CI 5/5 통과, **머지 대기**.
- 빌드 성립: `build:mobile:app` → `cap sync android` → `assembleDebug` **BUILD SUCCESSFUL**,
  `app-debug.apk` 126,867,785바이트. 릴리스 축소 경로도 사전 점검 통과
  (`:app:minifyReleaseWithR8` BUILD SUCCESSFUL, 2026-08-29).
- 바탕화면 **`CodeDestiny-업로드-준비/`** 에 키 재설정·서명·릴리스빌드 스크립트 4개 +
  `README.md` + `UPLOAD_CHECKLIST.md` + 기기테스트용 디버그 APK 를 놓았다.

## 남은 작업

- [ ] **F. 실기기 검증** — 사용자가 USB 연결 예정. 대상 목록은 바탕화면
      `CodeDestiny-업로드-준비/UPLOAD_CHECKLIST.md` 에 D·E 판정 항목과 함께 정리해 두었다
      (원본은 `docs/app-audit/DIAGNOSIS_REPORT.md` 의 "기기검증필요" 11건).
      D 판정: 웹뷰 콘솔에서 `await (await fetch('/api/version')).json()` 이 HTML 이 아니라 JSON.
- [ ] **G. 릴리스** — 🔴 **업로드 키스토어 분실**(재확인: `~/Documents/CodeDestinyKeys` 없음,
      `~/.android/debug.keystore` 만 존재). AAB 배포 중 = Play App Signing 가입 =
      **업로드 키 재설정 가능**. 절차는 위 README 의 1→4단계.
      🔴 **승인이 오기 전에는 업로드가 거부되므로 인증서 요청(4번)을 빌드보다 먼저 낸다.**

## 함정

- 🔴 **versionCode 는 36 이상이다 — 26 이 아니다.** 이전 인계본의 "25 / 26" 은 근거가 없었다.
  실측: 바탕화면 `CodeDestiny-Build/` 에 **1.0.35 / 35** 서명 빌드가 있다(2026-07-27).
  키 분실은 그 이후이므로 Play 최고값 ≤ 35. 올리기 전 **앱 번들 탐색기**로 한 번 확인할 것.
- 🔴 **APK 121MB 의 원인은 `public/codedestinyassets/` 가 아니다.** 이전 인계본의 진단은 틀렸다.
  그 폴더가 없으면 해당 자산이 **애초에 번들에 안 들어간다**(그래서 "제외 0개 / 0.0MB"가
  정상 출력이고 낭비가 아니다). 실측 dist 217MB 의 상위는
  `fuctionassets` 42 · `fortune` 25 · `i18n` 22 · `_next` 20 · `stories` 15 · `js` 15 · `images` 15 MB.
  줄이려면 여기를 봐야 한다(미착수).
- 🔴 **`npx cap sync android` 는 `apps/mobile/android/capacitor.settings.gradle` 의
  node_modules 상대경로를 워크트리 기준(`../../../../../../`)으로 다시 쓴다 — 커밋 금지.**
  `git checkout --` 로 되돌린다. 메인 체크아웃의 `../../../` 가 정답이다.
- 🔴 **gradlew 를 Bash 툴의 `cmd /c "..."` 로 부르면 조용히 안 돈다** — cmd 배너만 찍고 exit 0 이
  나와 **이전 APK 를 새로 빌드된 것으로 오해**하게 된다(이번에 한 번 걸렸다).
  PowerShell 툴에서 `& "<경로>\gradlew.bat" -p "<경로>" <task>` 로 부를 것.
- 🔴 **줄바꿈**: `verify-app-store-pricing.mjs`·`verify-app-store-billing-policy.mjs`·
  `create-play-console-products.mjs`·`build-mobile-app.mjs`·`verify-app-no-portone.mjs` 는
  **CRLF**. Edit/sed 로 고치면 전 파일 diff 가 된다 → node 패치 스크립트로.
  `app-native-bridge.js`·`app-payment-guard.js`·`app-store-pricing.js` 는 LF.
- 🔴 **Play 가격 변경이 코드 배포보다 먼저**다. 반대로 하면 화면 ₩3,000 / 실청구 ₩3,900 =
  정책 위반. 인하는 2026-08-29 에 그 순서로 끝냈다 — **다시 인상할 때도 같은 순서**다.
- 🔴 `play:products:apply` 는 Play 에 실제로 쓴다 — 실행 금지. 실결제 승인도 금지.
- 워크트리에서 `npm install` 금지(정션이라 공유 설치본에 쓴다). 정리는 `cmd /c rmdir` 로
  링크부터.
- `scripts/verify-app-remote-assets.mjs` 는 **존재하지 않는다**(주석 2곳이 있다고 거짓 기술).
  자산 80개 CDN 실재는 무검증이다.
- `build:cf` 가 다시 쓰는 추적 파일(`.ignore`·`rss.xml`·`insights/rss.xml` + `public/` 미러)은
  커밋 전에 되돌린다.

## D 가 어디에 있는지 (다시 손댈 때)

정본은 `scripts/app-native-bridge.js` 의 `installAppApiRetarget` 하나뿐이다.
셸 `index.html` 에도 같은 리타게팅이 있는데 **감싼 게 아니라 브릿지가 안쪽 층**이다 —
가드 태그가 `<meta charset>` 바로 뒤에 들어가 브릿지가 먼저 설치되고 셸이 그 위를 감싼다.
셸 쪽은 웹 스테이징(workers.dev)에서도 살아 있는 경로라 지우지 않았다.
행동 테스트 9건: `__tests__/ui/app-api-retarget.test.js` (`npm run test:node` 가 자동 포함).

## 검증

```
npm run build:mobile:app                    # dist 재생성 + 가드 주입 + 드리프트 검증
cd apps/mobile && npx --no-install cap sync android
# PowerShell 에서:
& "<repo>\apps\mobile\android\gradlew.bat" -p "<repo>\apps\mobile\android" assembleDebug --no-daemon
node --test __tests__/ui/app-api-retarget.test.js
npm run verify:app-no-portone
npm run verify:app-store-billing-policy
npm run verify:app-store-pricing
npm run verify:play-console-products
npm run verify:mobile-pricing-parity
npm run verify:payment-freeze
```

## 모르는 것

- 업로드 키 재설정 승인 소요 시간(통상 1~2 영업일). 그 전까지 G 는 진행 불가.
- Play 에 실제로 올라간 최고 versionCode. 코드로는 못 읽는다 — 앱 번들 탐색기를 볼 것.
- Play Console 등록가가 코드의 앱가와 실제로 같은지. 결제 시트 육안 대조가 유일한 확인이다.
- 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라.
