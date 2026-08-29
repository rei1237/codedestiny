---
status: active
updated: 2026-08-29
next: G — 사용자가 바탕화면 `2_전부하기.bat` 재실행 → AAB 생성 → Play 키 재설정 요청. 그 뒤 F
---

# Android 앱 ↔ 웹 동기화 · 가격 동일화 · 릴리스

## 왜

> "웹 서비스와 Android 앱의 기능·UI·가격·결제·회원·API·로케일·정책을 완전히 동기화하고,
> 모바일 최적화 후, 최종 배포 파일을 바탕화면에 정리하라."

앱은 **Play 라이브 앱**이고 Play Billing·잠금화면·RouteProcessor 가 의도적 네이티브 통합이다.
계획 전문: 사용자 홈의 `.claude/plans/android-full-stack-devops-scalable-orbit.md`

## 끝난 것

- A·B·C·E 완료. **D(앱 `/api/*` 리타게팅) = PR #1276 머지됨**(main `83b933d96`).
- 새 업로드 키스토어 생성됨: `~/Documents/CodeDestinyKeys/upload-keystore.jks` (2026-08-29 16:36).
  🔴 **비밀번호는 사용자만 안다 — 어디에도 기록되어 있지 않다.**

## 남은 작업

- [ ] **G-1. 릴리스 AAB 생성** — 사용자가 바탕화면
      `CodeDestiny-업로드-준비\2_전부하기.bat` 을 실행한다(비밀번호 1회 입력, 10~30분).
      산출물은 `Desktop\CodeDestiny-Build\<날짜>-1.0.36-36-<sha>\` 에 기존 규칙대로 생긴다.
      🔴 첫 시도는 스크립트 버그로 실패했고 **고쳐 두었다**(아래 "함정" 1번).
      실패하면 같은 폴더의 `빌드로그.txt` 가 지점을 알려준다.
- [ ] **G-2. Play 업로드 키 재설정 요청** — 옛 키 분실. AAB 배포 중이라 재설정은 가능하다.
      G-1 이 만든 `upload_certificate.pem` 첨부 + `BUILD_INFO.txt` 의 새 지문.
      교체 대상(옛) 지문은 `CodeDestiny-업로드-준비\분실된-업로드키-정보.md`.
      **승인(1~2 영업일) 전에는 업로드가 거부된다.** 그래서 빌드보다 요청이 먼저다.
- [ ] **F. 실기기 검증** — `CodeDestiny-업로드-준비\기기테스트-app-debug.apk`(121MB, 리타게팅
      탑재 확인됨)로 지금 바로 가능. 볼 항목은 같은 폴더 `UPLOAD_CHECKLIST.md`
      (원본: `docs/app-audit/DIAGNOSIS_REPORT.md` 의 "기기검증필요" 11건).
      D 판정: 웹뷰 콘솔에서 `await (await fetch('/api/version')).json()` 이 HTML 아닌 JSON.

## 함정

- 🔴 **사용자에게 넘기는 `.ps1` 에서 네이티브 명령에 `2>&1` 금지.** PS 5.1 이 stderr 를
  ErrorRecord 로 감싸 `$ErrorActionPreference="Stop"` 과 만나면 **exit 0 인데도 즉사**한다.
  keytool 은 JKS 마다 경고를 stderr 로 뱉어 항상 걸린다 — 이것 때문에 첫 빌드가 통째로
  안 돌았다. 판정은 `$LASTEXITCODE`·`Test-Path` 로만, 출력 버리기는 `| Out-Null`.
  재현: `& cmd /c "echo boom 1>&2 & exit 0" > $null 2>&1` (던짐) vs `| Out-Null` (통과).
- 🔴 **keytool 로 키를 만드는 호출은 에이전트 환경에서 차단된다**(2회 시도, 2회 거부).
  그래서 키 생성만 사용자 손이고 나머지는 자동화했다. 우회하지 말 것.
- 🔴 **gradlew 를 Bash 툴의 `cmd /c "..."` 로 부르면 조용히 안 돈다** — 배너만 찍고 exit 0 이라
  **이전 APK 를 새 산출물로 오인**한다. PowerShell 툴에서
  `& "<경로>\gradlew.bat" -p "<경로>" <task>` 로 부를 것.
- 🔴 **versionCode 는 36. 26 이 아니다.** 바탕화면 `CodeDestiny-Build/` 에 **1.0.35 / 35**
  서명 빌드가 있다(2026-07-27). 키 분실은 그 이후라 Play 최고값 ≤ 35.
  올리기 전 **앱 번들 탐색기**로 확인할 것. 바꾸려면 `_전부하기.ps1` 의 `$VersionCode`.
- 🔴 **APK 121MB 의 원인은 `public/codedestinyassets/` 가 아니다.** 없는 자산은 애초에
  번들에 안 들어가므로 "제외 0개 / 0.0MB"가 정상 출력이다. 실측 dist 217MB 상위:
  `fuctionassets` 42 · `fortune` 25 · `i18n` 22 · `_next` 20 · `stories`/`js`/`images` 각 15 MB.
- 🔴 `npx cap sync android` 는 `capacitor.settings.gradle` 의 node_modules 상대경로를
  워크트리 기준으로 다시 쓴다 — **커밋 금지**, `git checkout --` 로 되돌린다.
- 🔴 **Play 가격 변경이 코드 배포보다 먼저**다. 반대면 표시가≠청구가 = 정책 위반.
- 🔴 `play:products:apply` 는 Play 에 실제로 쓴다 — 실행 금지. 실결제 승인도 금지.
- 🔴 **머지는 사용자가 한다.** 브랜치 → PR → CI → 사용자 머지. `main` 직접 작업 금지.
- 워크트리에서 `npm install` 금지(정션이라 공유 설치본에 쓴다).
- `build:cf` 가 다시 쓰는 추적 파일(`.ignore`·`rss.xml`·`insights/rss.xml` + `public/` 미러)은
  커밋 전에 되돌린다.
- 옛 키 비밀번호가 2026-07 채팅 로그에 평문으로 남아 있다 — **재사용 금지**(파일도 없다).

## D 가 어디에 있는지 (다시 손댈 때)

정본은 `scripts/app-native-bridge.js` 의 `installAppApiRetarget` **하나뿐**이다(파일 30-88줄).
셸 `index.html:236` 에도 같은 리타게팅이 있는데 **감싼 게 아니라 브릿지가 안쪽 층**이다 —
가드 태그가 `<meta charset>` 바로 뒤에 주입돼(`scripts/build-mobile-app.mjs` `injectGuardTag`)
브릿지가 먼저 설치되고 셸이 그 위를 감싼다. 셸이 절대 URL 로 바꿔 넘기면 브릿지는 교차
출처라 통과시킨다(멱등). 셸 쪽은 웹 스테이징(workers.dev)에서도 사는 경로라 지우지 않았다.
행동 테스트 9건: `__tests__/ui/app-api-retarget.test.js`.

## 검증

```
node --test __tests__/ui/app-api-retarget.test.js
npm run test:node                      # 580 pass (2026-08-29)
npm run verify:app-no-portone
npm run verify:app-store-billing-policy
npm run verify:app-store-pricing
npm run verify:play-console-products
npm run verify:mobile-pricing-parity
npm run verify:payment-freeze
```

## 모르는 것

- Play 에 실제로 올라간 최고 versionCode — 코드로는 못 읽는다. 앱 번들 탐색기를 볼 것.
- Play Console 등록가가 코드의 앱가와 같은지 — 결제 시트 육안 대조가 유일한 확인이다.
- 업로드 키 재설정 승인 소요 시간.
- 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라.
