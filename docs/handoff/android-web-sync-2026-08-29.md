---
status: active
updated: 2026-08-29
next: 사용자가 `2_전부하기.bat` 실행 → 1.0.37 AAB → Play 가격 인하 후 업로드. 병행 F(실기기 검증).
---

# Android 앱 ↔ 웹 동기화 · 가격 동일화 · 릴리스

## 왜

> "웹 서비스와 Android 앱의 기능·UI·가격·결제·회원·API·로케일·정책을 완전히 동기화하고,
> 모바일 최적화 후, 최종 배포 파일을 바탕화면에 정리하라."

앱은 **Play 라이브 앱**이고 Play Billing·잠금화면·RouteProcessor 가 의도적 네이티브 통합이다.
계획 전문: 사용자 홈의 `.claude/plans/android-full-stack-devops-scalable-orbit.md`

## 끝난 것

- A~E 완료(D=PR #1276, E=#1274) · 앱 번들 이미지 최적화 **PR #1279 머지**(110.7→약 93MB).
- **G-1 AAB 생성·검증 완료** — 1.0.36 빌드가 서명·리타게팅 탑재까지 실측 확인됨.
- 🔴 **G-2(업로드 키 재설정)는 취소됐다** — 불필요. 근거는 아래.

## 🔴 업로드 키 재설정은 필요 없다 (2026-08-29 화면 확인)

Play Console > 앱 서명 의 "업로드 키 인증서" 가 **"첫 App Bundle 을 업로드하면 여기에 인증서
지문이 표시됩니다"** 상태다 — 등록된 업로드 키가 **아직 없다.** 첫 업로드가 곧 업로드 키
등록이므로, 새 키(`~/Documents/CodeDestinyKeys/upload-keystore.jks`)로 서명한 AAB 를 그대로
올리면 된다. 승인 대기도 없다. 그래서 바탕화면의 재설정 요청서는 폐기했다.

## 남은 작업

- [ ] **1. 1.0.37 AAB 빌드 (사용자)** — `Desktop\CodeDestiny-업로드-준비\2_전부하기.bat` 실행.
      🔴 비밀번호는 사용자만 안다(스토어·키 두 값이 **다르다**). 버전은 이미 37/1.0.37 로
      올려 뒀다. 이미지 800여 장을 재인코딩하므로 이전보다 몇 분 더 걸린다.
      절차 전문: 같은 폴더 `3_업로드와-기기검증.md`.
- [ ] **2. Play 업로드** — 🔴 **인앱 상품 가격 인하가 업로드보다 먼저**다(표시가≠청구가 = 정책 위반).
- [ ] **3. F. 실기기 검증** — `기기테스트-app-debug.apk` 로. 2026-08-29 시점 **막혀 있다**:
      윈도우는 기기를 본다(`Get-PnpDevice` → "SAMSUNG Mobile USB Composite Device" Status OK)는데
      `adb devices` 는 빈 목록이다(서버 재시작해도 동일). ADB 인터페이스가 안 올라온 것이므로
      **폰에서 USB 디버깅을 켜야** 진행된다 — 설정 > 휴대전화 정보 > 소프트웨어 정보 >
      빌드번호 7번 탭 → 개발자 옵션 > USB 디버깅 ON → 케이블 재연결 후 "허용" 팝업 수락.
      항목은 `UPLOAD_CHECKLIST.md`
      (원본 `docs/app-audit/DIAGNOSIS_REPORT.md` "기기검증필요" 11건). adb 명령은 위 데스크톱 문서.
      **D 판정**: 웹뷰 콘솔에서 `await (await fetch('/api/version')).json()` 이 HTML 아닌 JSON.
      이번엔 **이미지가 흐려지거나 깨진 곳**도 함께 본다 — #1279 가 건드린 표면이다.

## 함정

- 🔴 **용량은 `public/` 이 아니라 AAB 안에서 잰다** — 소스 기준은 `removeDeadPngOriginals` 가
  이미 걷어낸 절감을 두 번 센다. `unzip -v` 로 **압축** 크기를 집계하고, 이름은 4번째 필드가
  아니라 **줄 끝까지** 자른다(한글 자산명이 공백에서 잘린다). 스캐너는 매칭 행 수로 검산할 것.
- 🔴 **keytool 로 키를 만드는 호출은 에이전트 환경에서 차단된다** — 키 작업만 사용자 손.
- 🔴 옛 키 비밀번호가 2026-07 채팅 로그에 평문으로 남아 있다 — **재사용 금지**(파일도 없다).
- 🔴 `play:products:apply` 는 Play 에 실제로 쓴다 — 실행 금지. 실결제 승인도 금지.
- 🔴 `npx cap sync android` 는 `capacitor.settings.gradle` 의 node_modules 상대경로를 다시 쓴다 — 커밋 금지.
- 🔴 **머지는 사용자가 한다.** 브랜치 → PR → CI → 사용자 머지. `main` 직접 작업 금지.
  파일을 고치는 작업은 격리 워크트리에서 한다.
- `build:cf` 가 다시 쓰는 추적 파일(`.ignore`·`rss.xml`·`insights/rss.xml` + `public/` 미러)은
  커밋 전에 되돌린다. 워크트리에서 `npm install` 금지(정션이라 공유 설치본에 쓴다).

## 정본 위치

- 앱 전용 후처리(리타게팅 주입·라우트 제거·이미지 축소): `scripts/build-mobile-app.mjs`.
  이미지 축소는 `shrinkOversizedImages`, 중복 제거는 `removeRedundantImageCopies`.
  **웹 배포는 이 스크립트를 타지 않는다** — 그래서 `public/` 원본은 안 건드린다.
- `/api/*` 리타게팅 정본은 `scripts/app-native-bridge.js` 의 `installAppApiRetarget` 하나뿐(30-88줄).
  셸 `index.html:236` 에도 같은 게 있으나 브릿지가 안쪽 층이라 멱등이다.

## 검증

```
npm run test:node                      # 584 pass (2026-08-29)
node --test __tests__/release/mobile-image-shrink.test.js
npm run verify:app-no-portone
npm run verify:app-store-billing-policy
npm run verify:app-store-pricing
npm run verify:mobile-pricing-parity
npm run verify:payment-freeze
```

## 모르는 것

- Play 최고 versionCode — 사용자 화면에서 `2 (1.0.1)` 이 보였다. 37 이면 안전하다고 보지만
  업로드가 거부되면 앱 번들 탐색기로 확인할 것.
- Play Console 등록가가 코드의 앱가와 같은지 — 결제 시트 육안 대조가 유일한 확인이다.
- 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라.
