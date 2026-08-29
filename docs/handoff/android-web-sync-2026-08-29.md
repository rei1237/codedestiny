---
status: active
updated: 2026-08-29
next: Play Console 에 `20260829-1918-1.0.37-37-aea4ce105\CodeDestiny-1.0.37-37.aab` 업로드. 그 뒤 사람 손이 필요한 기기검증 잔여 항목.
---

# Android 앱 ↔ 웹 동기화 · 가격 동일화 · 릴리스

## 왜

> "웹 서비스와 Android 앱의 기능·UI·가격·결제·회원·API·로케일·정책을 완전히 동기화하고,
> 모바일 최적화 후, 최종 배포 파일을 바탕화면에 정리하라."

앱은 **Play 라이브 앱**이고 Play Billing·잠금화면·RouteProcessor 가 의도적 네이티브 통합이다.
계획 전문: 사용자 홈의 `.claude/plans/android-full-stack-devops-scalable-orbit.md`

## 끝난 것

- A~E 완료 · 이미지 최적화 PR #1279 · 업로드 키 재설정은 **불필요**(등록된 업로드 키가 없어
  첫 업로드가 곧 등록이다 — 2026-08-29 화면 확인).
- **Play 인앱 상품 가격 인하 완료**(사용자 확인, 2026-08-29). 업로드 순서 제약은 해소됐다.
- 🔴 **올릴 AAB: `Desktop\CodeDestiny-Build\20260829-1918-1.0.37-37-aea4ce105\`** — 93.8MB
  (98,382,807 B). 같은 버전의 **19:08 폴더(`-8e5ada7ed`)는 폐기**다: 소스가 2커밋 낡아
  이미지 최적화가 빠진 116.6MB 였다. BUILD_INFO.txt 에 `[G] … PR #1279` 줄이 있으면 맞는 것.
- 실기기 자동 검증 통과분(Galaxy M15 5G · Android 16 · 디버그 APK 19:43 빌드):
  - **D. `/api/*` 리타게팅 통과** — `fetch('/api/version')` 이 `application/json`,
    `environment:"production"`, `source:"worker-native"`. HTML 아님.
  - **이미지 깨짐 0건** — 표시된 img 16개 전건. 가로 스크롤 없음(scrollWidth=clientWidth=384).

## 남은 작업

- [ ] **1. Play 업로드** — 위 AAB + `mapping.txt`(디버그 기호). versionCode 37.
- [ ] **2. 사람 손이 필요한 기기검증** — 아래 "자동으로 못 하는 것" 참조. 항목 원문은
      `Desktop\CodeDestiny-업로드-준비\UPLOAD_CHECKLIST.md`(1.0.37 기준으로 갱신됨).

## 자동으로 못 하는 것 (CDP 로도 판정 불가)

로그인 세션과 화면 조작이 필요하다. 소셜 로그인 → 이용권 상태 → **결제창에 [이용권으로 구매]·
단건·월정석 3옵션이 함께 뜨는지** → 잠금 콘텐츠 해제 → **콘텐츠 티어 8개 표시가 = 청구가 육안
대조**(Play 등록가는 코드가 못 본다) → 잠금화면 오버레이 권한 → 백버튼 2회 종료 →
결과 페이지 마지막 콘텐츠가 하단 네비(`.cd-mobile-bottom-nav`, 높이 118px)에 깔리는지.

## 이번에 확인한 함정

- 🔴 **빌드 스크립트의 "최신 판정"이 기능 마커였다** — `_전부하기.ps1` 이
  `installAppApiRetarget` 존재 여부로 pull 을 결정해, 그 기능 이후에 머지된 #1279 를 통째로
  놓쳤다. **origin/main SHA 대조**로 바꿨고, 웹 번들 스킵도 `.마지막-웹번들-커밋.txt` 와
  대조하게 했다. 같은 게이트를 다시 만들지 말 것.
- 🔴 **폰이 잠겨 있으면 웹뷰 DevTools 가 응답하지 않는다** — 소켓(`@webview_devtools_remote_<pid>`)은
  열려 있고 TCP 연결도 되는데 HTTP 응답이 0바이트다. `dumpsys window | grep isKeyguardShowing`
  으로 먼저 볼 것. 릴리스 APK 는 웹뷰 디버깅이 꺼져 있어 **디버그 APK 로만** 이 검증이 된다.
- **흐려 보이는 이미지 2건은 #1279 탓이 아니다** — 히어로·카드 이미지는
  `assets.code-destiny.com/cdn-cgi/image/width=1280,...` 에서 오는데 **원본 자체가 299px·168px**
  이라 확대되지 않는다(웹에도 같이 있는 문제). 셸 로고 `img.honeypig-logo-icon` 의
  `naturalWidth=130` 은 `srcset` 이 **같은 파일을 96w/130w/512w 로 거짓 선언**한 탓이고,
  실제로 디코드되는 건 512×512 원본이라 화면은 선명하다. 둘 다 이번 릴리스와 무관.

## 정본 위치

- 앱 전용 후처리: `scripts/build-mobile-app.mjs`(`shrinkOversizedImages`·`removeRedundantImageCopies`).
  **웹 배포는 이 스크립트를 타지 않는다.**
- `/api/*` 리타게팅 정본은 `scripts/app-native-bridge.js` 의 `installAppApiRetarget`(30-88줄).

## 검증 방법 (재현)

```
# 용량은 AAB 안에서 잰다 — 소스 기준은 이미 수확된 절감을 두 번 센다
unzip -v <AAB> | awk '/\.(png|jpg|jpeg|webp)$/ {s+=$3;n++} END {print s,n}'

# 웹뷰 판정: 폰 잠금 해제 → 디버그 APK 실행 후
adb shell cat /proc/net/unix | grep webview_devtools
adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
# CDP 로 표현식 평가 (Node 22+ 내장 WebSocket): 스크래치의 cdp-eval.mjs 패턴
```

## 모르는 것

- Play 최고 versionCode — 화면에서 `2 (1.0.1)` 이 보였다. 37 이면 안전하다고 보지만
  거부되면 앱 번들 탐색기로 확인할 것.
- 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라.
