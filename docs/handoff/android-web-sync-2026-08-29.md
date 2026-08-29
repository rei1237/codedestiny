---
status: active
updated: 2026-08-29
next: G-2 — 사용자가 Play Console 에서 업로드 키 재설정 요청. 승인 대기 중 F 를 병행한다.
---

# Android 앱 ↔ 웹 동기화 · 가격 동일화 · 릴리스

## 왜

> "웹 서비스와 Android 앱의 기능·UI·가격·결제·회원·API·로케일·정책을 완전히 동기화하고,
> 모바일 최적화 후, 최종 배포 파일을 바탕화면에 정리하라."

앱은 **Play 라이브 앱**이고 Play Billing·잠금화면·RouteProcessor 가 의도적 네이티브 통합이다.
계획 전문: 사용자 홈의 `.claude/plans/android-full-stack-devops-scalable-orbit.md`

## 끝난 것

- A·B·C·D·E 완료 (D = PR #1276 앱 `/api/*` 리타게팅, E = PR #1274 앱가 인하).
- **G-1. 릴리스 AAB 생성 완료** (2026-08-29 17:46, main `8e5ada7ed`).
  산출물 `Desktop\CodeDestiny-Build\20260829-1745-1.0.36-36-8e5ada7ed\` — AAB 111MB · APK ·
  mapping.txt · upload_certificate.pem · BUILD_INFO.txt.
  실측 검증: `jarsigner -verify` → jar verified 이고 AAB 서명 인증서 SHA-256 이 PEM·BUILD_INFO 와
  일치한다. AAB 안 `base/assets/public/index.html` 첫 줄에 가드 태그
  (`CODE_DESTINY_API_BASE_URL="https://code-destiny.com"`) + 브릿지 선로드가 들어 있어 **D 탑재 확인**.
- 새 업로드 키스토어: `~/Documents/CodeDestinyKeys/upload-keystore.jks`.
  🔴 **비밀번호는 사용자만 안다.** 스토어 비밀번호와 키(alias) 비밀번호가 **서로 다르다**.
- 빌드 스크립트(`_전부하기.ps1`) 결함 4건은 고쳐서 통과했다 — 그대로 재실행하면 된다.
  다시 실패하면 `CodeDestiny-업로드-준비\빌드로그.txt` 가 지점을 알려준다.

## 남은 작업

- [ ] **G-2. Play 업로드 키 재설정 요청 (사용자)** — 옛 키 분실. AAB 배포 중이라 재설정은 가능하다.
      첨부파일·새 지문·옛 지문·Console 경로를 한 장에 모아 두었다:
      `Desktop\CodeDestiny-업로드-준비\3_Play키재설정-요청서.md`.
      🔴 **승인(1~2 영업일) 전에는 업로드가 거부된다.**
- [ ] **G-3. 승인 후 AAB 업로드** — 올리기 전 **앱 번들 탐색기**로 Play 최고 versionCode 가 35 이하인지
      확인한다(36 이상이면 `_전부하기.ps1` 의 `$VersionCode` 를 올려 재빌드).
      그리고 🔴 **Play 인앱 상품 가격 인하가 이 빌드 출시보다 먼저**다.
- [ ] **F. 실기기 검증** — `CodeDestiny-업로드-준비\기기테스트-app-debug.apk`(121MB, 리타게팅
      탑재 확인됨)로 승인 대기 중 지금 바로 가능. 볼 항목은 같은 폴더 `UPLOAD_CHECKLIST.md`
      (원본: `docs/app-audit/DIAGNOSIS_REPORT.md` 의 "기기검증필요" 11건).
      D 판정: 웹뷰 콘솔에서 `await (await fetch('/api/version')).json()` 이 HTML 아닌 JSON.

## 함정

- 🔴 **Play 가격 변경이 코드 배포보다 먼저**다. 반대면 표시가≠청구가 = 정책 위반.
- 🔴 `play:products:apply` 는 Play 에 실제로 쓴다 — 실행 금지. 실결제 승인도 금지.
- 🔴 **keytool 로 키를 만드는 호출은 에이전트 환경에서 차단된다**(2회 시도, 2회 거부).
  그래서 키 생성만 사용자 손이고 나머지는 자동화했다. 우회하지 말 것.
- 🔴 옛 키 비밀번호가 2026-07 채팅 로그에 평문으로 남아 있다 — **재사용 금지**(파일도 없다).
- 🔴 **APK 121MB 의 원인은 `public/codedestinyassets/` 가 아니다.** 없는 자산은 애초에
  번들에 안 들어가므로 "제외 0개 / 0.0MB"가 정상 출력이다. 실측 dist 217MB 상위:
  `fuctionassets` 42 · `fortune` 25 · `i18n` 22 · `_next` 20 · `stories`/`js`/`images` 각 15 MB.
- 🔴 `npx cap sync android` 는 `capacitor.settings.gradle` 의 node_modules 상대경로를
  워크트리 기준으로 다시 쓴다 — **커밋 금지**, `git checkout --` 로 되돌린다.
- 🔴 **머지는 사용자가 한다.** 브랜치 → PR → CI → 사용자 머지. `main` 직접 작업 금지.
- 워크트리에서 `npm install` 금지(정션이라 공유 설치본에 쓴다).
- `build:cf` 가 다시 쓰는 추적 파일(`.ignore`·`rss.xml`·`insights/rss.xml` + `public/` 미러)은
  커밋 전에 되돌린다.

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
