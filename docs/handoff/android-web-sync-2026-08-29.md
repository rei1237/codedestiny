---
status: active
updated: 2026-08-29
next: Play Console 에 `20260829-1918-1.0.37-37-aea4ce105\CodeDestiny-1.0.37-37.aab` 업로드(신원·서명 실측 완료). 그 뒤 로그인이 필요한 기기검증 잔여 항목.
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
- **AAB 무결성 실측(2026-08-29)** — `aapt2 dump badging` 으로 versionCode 37 · versionName
  1.0.37 · `com.codedestiny.app` · minSdk 24 · targetSdk 36. AAB 서명자 인증서 SHA-256 이
  `upload_certificate.pem`·BUILD_INFO 와 **일치**(`73:C0:04:…:14:27`). 폐기본 대조도 끝:
  1918 빌드는 이미지 55.3MB/992개, 1908 빌드는 72.6MB/1026개 — #1279 가 들어있는 쪽이 1918.
- 실기기 자동 검증 통과분(Galaxy M15 5G · Android 16 · 디버그 APK 19:43 빌드):
  - **D. `/api/*` 리타게팅 통과** — `fetch('/api/version')` 이 `application/json`,
    `environment:"production"`, `source:"worker-native"`. HTML 아님.
  - **이미지 깨짐 0건** — 표시된 img 16개 전건. 가로 스크롤 없음(scrollWidth=clientWidth=384).
  - **P1 `/today` 다크 배경 통과** — 면적 2500px² 이상 190개 요소에서 밝은 배경(solid·그라디언트
    정지색, alpha≥0.6 · 상대휘도>0.6) **0건**. body 는 `rgb(10,8,24)`.
  - **P1 약관·개인정보 링크 통과** — 회원가입 화면의 `target="_blank"` 링크를 실제 탭했더니
    **같은 웹뷰에서** `/terms/index.html` 로 이동(본문 12,262자 렌더), 백버튼으로 복귀.
    외부 브라우저로 나가지 않고 무반응도 아니다.
  - **백버튼 통과** — 앱 재시작 직후 루트에서 1회는 유지, 연속 2회에 MainActivity 가 내려간다.
  - **P3 가로 스크롤 통과** — 이 웹뷰에서 `100vw`(384px) = `clientWidth` = `innerWidth` 라
    세로 스크롤이 있어도 스크롤바 폭이 끼지 않는다. `.dream-ledger-overlay`(index.html:690)·
    `.golden-grain-modal`(index.html:2999) 은 둘 다 `overflow-x:hidden` 이라 구조적으로 불가능.

## 남은 작업

- [ ] **1. Play 업로드** — 위 AAB + `mapping.txt`(디버그 기호). versionCode 37.
- [ ] **2. 로그인이 필요한 기기검증** — 아래 "자동으로 못 하는 것". 항목 원문은
      `Desktop\CodeDestiny-업로드-준비\UPLOAD_CHECKLIST.md`(이번 검증 결과 반영해 갱신).
## 고친 결함 — 하단 네비 라벨 잘림 (2026-08-29)

탭 1칸의 텍스트 가용폭은 **58px** 인데(`.cd-mobile-bottom-nav__item`, 384px 뷰포트) 8개 값이
넘쳐 `text-overflow:ellipsis` 로 잘리고 있었다. 폭은 실기기 웹뷰에서 그 요소의 실제 폰트
(`900 10.36px CodeDestinyBody`)로 잰 값이다.

| 키 | 로케일 | 이전 → 이후 | 폭 |
|---|---|---|---|
| kxvio | fr | Quatre Piliers (BaZi) → **4 Piliers** | 95.5 → 38.8 |
| kxvio | en | Four Pillars (BaZi) → **Four Pillars** | 85.0 → 53.8 |
| kxvio | nl | Vier Pijlers (BaZi) → **Vier Pijlers** | 83.2 → 52.0 |
| kxvio | hi | फोर पिलर्स (बाज़ी) → **फोर पिलर्स** | 74.3 → 43.4 |
| kxvio | es | Cuatro Pilares → **4 Pilares** | 66.6 → 41.3 |
| k16cq4to | nl | Alle readings → **Alle** | 61.7 → 18.4 |
| k16cq4to | ja | すべての占い → **占い一覧** | 61.0 → 41.4 |
| k16cq4to | en | All Readings → **Readings** | 59.0 → 43.7 |

원인은 `i18n/glossary.json` 의 정식 용어(`Four Pillars (BaZi)`)를 탭 라벨에 그대로 쓴 것이다.
**vi `Tứ Trụ` · de `Vier Säulen` · ms `Empat Tiang` 은 이미 짧은 형이었다** — 그 패턴을 따랐다.

🔴 **이 수정은 1.0.37 AAB 에 없다.** 이미 서명된 빌드라 다음 앱 버전에 실린다(웹은 머지 후
스테이징에 바로 반영). 업로드를 미룰 이유는 아니다 — 잘려도 `…` 로 보일 뿐 기능은 멀쩡하다.

🔴 **두 키의 정본 위치가 다르다.** `k16cq4to` 는 `i18n/authored/shell-02.json` 에 있어 저작
파일과 `public/i18n/*.json` 을 **함께** 고쳐야 하고, `kxvio` 는 저작 파일에 아예 없어
`public/i18n/*.json` 이 정본이다. 🔴 저작 파일을 `JSON.parse`→`stringify` 로 왕복시키면 항목
사이 빈 줄이 전부 사라져 32줄짜리 무관 diff 가 난다 — 문자열 치환으로 고칠 것.

가드: `verify:mobile-bottom-nav-sync` 가 **한국어 라벨만** 대조하고 있어서 이 축을 못 잡았다.
같은 스크립트에 로케일 라벨 **12자 상한**을 붙였고(사전 12벌 전수 발견, 대상 0건이면 실패),
음성 테스트로 fr 을 되돌리면 exit 1 이 나는 것까지 확인했다. 🔴 다만 이건 **프록시**다 —
`All Readings` 는 12자인데도 59px 로 넘쳤다. 폭이 걱정되면 아래 재현 절차로 기기에서 직접 재라.
🔴 그리고 이 가드는 `verify-guard-wiring.mjs` 에 **"배선 후보(미승인)"** 으로 선언돼 있어
**CI 에서 안 돈다** — 네비 라벨을 건드렸으면 손으로 돌릴 것.

## 자동으로 못 하는 것

로그인 세션이 필요하다. 소셜 로그인 → 이용권 상태 → **결제창에 [이용권으로 구매]·단건·월정석
3옵션이 함께 뜨는지** → 잠금 콘텐츠 해제 → **콘텐츠 티어 8개 표시가 = 청구가 육안 대조**
(Play 등록가는 코드가 못 본다) → 잠금화면 오버레이 권한 → 회원가입 긴 폼·사주 입력 폼의
키보드 겹침(IME 는 웹뷰 밖) → 스플래시 밝음→어두움 플래시 체감.

🔴 **결과 페이지 하단 네비 겹침(P1)은 자동화 포기가 아니라 규칙 1 때문에 못 했다** — 결과를
만들려면 프로덕션 AI 실호출이 필요하다. 대신 정적 근거만 남긴다: 네비는 `position:fixed`
높이 **118.4px**, `bottomNavVisible:false` 는 `all-fortunes` 전체화면에서만 세워지므로
(index.html:13743) 결과 뷰에서는 네비가 **떠 있다**. 그런데 `#inputPage` 에는
`padding-bottom:calc(136px + safe-area)`(index.html:2963)가 있는 반면 **`#resultPage` 에는
대응 규칙이 없고** 감싸는 `.wrap` 은 22px 뿐이다(index.html:641). 겹칠 개연성이 높으니
사람이 볼 때 **여기를 먼저** 보라.

## 이번에 확인한 함정

- 🔴 **빌드 스크립트의 "최신 판정"이 기능 마커였다** — `_전부하기.ps1` 이
  `installAppApiRetarget` 존재 여부로 pull 을 결정해, 그 기능 이후에 머지된 #1279 를 통째로
  놓쳤다. **origin/main SHA 대조**로 바꿨고, 웹 번들 스킵도 `.마지막-웹번들-커밋.txt` 와
  대조하게 했다. 같은 게이트를 다시 만들지 말 것.
- 🔴 **폰이 잠겨 있으면 웹뷰 DevTools 가 응답하지 않는다** — 소켓(`@webview_devtools_remote_<pid>`)은
  열려 있고 TCP 연결도 되는데 HTTP 응답이 0바이트다. `dumpsys window | grep isKeyguardShowing`
  으로 먼저 볼 것. 릴리스 APK 는 웹뷰 디버깅이 꺼져 있어 **디버그 APK 로만** 이 검증이 된다.
- 🔴 **앱이 앞에 없으면 CDP 는 멀쩡히 답하는데 모든 `getBoundingClientRect` 가 0 이다** —
  `document.visibilityState==='hidden'` 이면 레이아웃이 정지한다. 그래서 "면적 N 이상인 것 중
  위반" 식의 스캔이 **대상 0건으로 조용히 통과**한다(이번에 `/today` 흰 카드 판정이 한 번
  위양성으로 통과했다). 스캔 결과에 `visibilityState` 와 **검사한 요소 수**를 같이 찍고 0 이면
  INVALID 로 떨어뜨릴 것. 앞으로 올리는 건 `am start -n com.codedestiny.app/.MainActivity`.
- 🔴 **`Page.captureScreenshot` 에 `captureBeyondViewport:true` 를 주면 웹뷰가 죽는다** —
  이 기기의 긴 페이지에서 응답이 없고 렌더러가 재시작하며 devtools pid 가 바뀐다(재-forward
  필요). 화면 캡처가 필요하면 `adb exec-out screencap -p` 를 쓸 것.
- **좌표 탭은 `elementFromPoint` 로 확인하고 나서** — `scrollIntoView` 뒤 레이아웃이 다시
  움직여 링크가 화면 밖(cssY -87.8)으로 나간 채 엉뚱한 곳을 탭했고, "무반응"이라는 **틀린 결론**을
  낼 뻔했다. 탭 직전에 그 좌표의 `elementFromPoint` 가 그 요소인지 단언할 것.
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

# AAB 신원·서명 (aapt2 는 AAB 를 직접 못 읽으니 badging 은 옆의 APK 로)
<SDK>/build-tools/37.0.0/aapt2 dump badging <APK>
unzip -p <AAB> META-INF/UPLOAD.RSA > u.rsa
openssl pkcs7 -inform DER -in u.rsa -print_certs -out s.pem
openssl x509 -in s.pem -noout -fingerprint -sha256   # upload_certificate.pem 과 대조

# 웹뷰 판정: 폰 잠금 해제 → 디버그 APK 실행 후
adb shell dumpsys window | grep isKeyguardShowing        # 잠김이면 응답 0바이트
adb shell cat /proc/net/unix | grep webview_devtools     # pid 는 앱 재시작마다 바뀐다
adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
# CDP 로 표현식 평가 (Node 22+ 내장 WebSocket): 스크래치의 cdp-eval.mjs 패턴.
# 🔴 판정 표현식에는 반드시 visibilityState 와 검사 대상 수를 함께 반환시킨다.
```

## 모르는 것

- Play 최고 versionCode — 화면에서 `2 (1.0.1)` 이 보였다. 37 이면 안전하다고 보지만
  거부되면 앱 번들 탐색기로 확인할 것.
- 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라.
