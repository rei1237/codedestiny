# PLAY_QUALITY_AUDIT — Google Play 신품질기준(2026-08-26 발표) 대응 감사

> 2026-09-04 · 대상 앱 `com.codedestiny.app`(Capacitor 8.4.1 WebView 셸) · 기준 산출물 vc42 AAB(`Desktop\CodeDestiny-Build\20260902-0025-1.0.42-42-676d602b8`)
> 결론 먼저: **① 메모리(2027-02)** 는 `onTrimMemory` 부재가 유일한 코드 결함이라 이번 PR 에서 고쳤고, **② R8 커버리지(2027-02)** 는 이미 74% 대이며 DEX 가 10 MB 미만이라 적용 대상도 아니다(기록 절차만 고정), **③ Zero-Tap Sign-In(2027-04)** 은 네이티브 뼈대까지 넣고 서버·호출부는 후속 PR 이다 → [ZERO_TAP_SIGNIN_DESIGN.md](ZERO_TAP_SIGNIN_DESIGN.md).
> 사용자 제약 준수: Google OAuth 는 커스텀탭만 · `@JavascriptInterface` keep 유지 · 엔진 코드(`calculateLocalResult()`·KASI prefetch·`normalizeSaju.ts`·6 엔진) 무수정 · PortOne/Inicis 결제 실행 파일 무수정.

---

## 우선순위 (기한순)

| 순위 | 기한 | 항목 | 이번 PR | 남은 것 |
|---|---|---|---|---|
| 1 | 지금 | 이용권 구매 재개본 vc43 업로드 | 코드 준비 | 머지 뒤 메인 체크아웃 빌드 → §빌드 판정 |
| 2 | 2027-02 | 메모리: 백그라운드 RSS·비트맵 해제 | `MainActivity.onTrimMemory/onLowMemory` + `measure:app-memory` | 에뮬레이터 수치 → BUILD_INFO 기록 |
| 3 | 2027-02 | R8 커버리지 ≥ 25% | 규칙 변경 없음(이미 충족) | 빌드마다 §Task 2 명령으로 기록 |
| 4 | 2027-04 | Zero-Tap Sign-In | 의존성 + 플러그인 뼈대 + JS 래퍼 + 설계 문서 | 서버 challenge/assert + 호출부(후속 PR, critical 티어) |

---

## Task 1 — 메모리 사용량 · 코드 최적화

### (a) 현황 진단

| 점검 | 결과 | 근거(2026-09-04 실측) |
|---|---|---|
| 네이티브 이미지 로더(Coil/Glide/Picasso/BitmapFactory) | **0건** — 비트맵은 전부 WebView(chromium) 안 | `git grep -n "Glide\|coil\|Picasso\|BitmapFactory" apps/mobile/android/app/src` → 0 |
| `android:largeHeap` | 없음(좋다) | `AndroidManifest.xml` grep 0 |
| `onTrimMemory` / `onLowMemory` / `ComponentCallbacks2` | **0건 → 이번 PR 에서 추가** | `git grep -n "onTrimMemory\|onLowMemory\|ComponentCallbacks2"` → 이전 0, 현재 `MainActivity.java` 만 |
| 백그라운드 상주 | `LockScreenForegroundService`(잠금화면 운세 ON 시)가 프로세스를 살려 둬 백그라운드 RSS 에 그대로 잡힌다 | `apps/mobile/android/app/src/main/java/com/codedestiny/app/LockScreenForegroundService.java` |
| WebView 렌더러 정책 | 기본값(렌더러 우선순위 waiver 없음) — **의도적으로 유지** | 아래 (b) "채택하지 않은 것" |
| 스플래시·아이콘 비트맵 | `core-splashscreen` 표준 경로, 액티비티 소유 Drawable 없음 | `build.gradle:112`, `MainActivity.java` |

메모리를 실제로 쥐는 것은 WebView 하나다. 따라서 앱이 할 수 있는 일은 **(1) 백그라운드에 갔을 때 WebView 리소스 캐시를 비우기**, **(2) 웹 셸에 압박 신호를 전달하기**, **(3) 수치를 재는 절차를 두기** 셋이다.

### (b) 변경 (이번 PR)

1. `apps/mobile/android/app/src/main/java/com/codedestiny/app/MainActivity.java` — `onTrimMemory(int level)` 오버라이드.
   - `level >= TRIM_MEMORY_UI_HIDDEN(20)` 일 때만 `bridge.getWebView().clearCache(false)` — RAM 리소스 캐시만 비우고 디스크 캐시는 남긴다(복귀 시 네트워크 재요청 없음). 보이는 중(`RUNNING_*`, 5~15)에는 비우지 않는다.
   - 레벨 무관하게 `bridge.triggerWindowJSEvent("cd:app-memory-trim", "{\"level\":N}")` — 웹 셸용 훅. **현재 리스너는 없다.** 셸이 메모리 캐시를 들고 있는 지점이 생기면 그때 `window.addEventListener("cd:app-memory-trim", …)` 로 붙인다.
   - `onLowMemory()` → `onTrimMemory(TRIM_MEMORY_COMPLETE)` 위임.
   - 전체 `try/catch` + `getBridge()==null` 검사 — Capacitor 는 플러그인·액티비티 예외를 프로세스 크래시로 바꾼다.
2. `scripts/measure-app-memory.mjs` + `package.json` `measure:app-memory` — 아래 §측정 체크리스트.
3. **채택하지 않은 것과 이유**
   - `WebView.freeMemory()` — deprecated(API 19+에서 no-op에 가깝고 시스템 압박 시 자동 해제).
   - `WebView.onPause()` / `pauseTimers()` — JS 타이머·애니메이션이 멎어 배경 음악·잠금화면 FGS 와 충돌한다(사용자 가시 동작 변경, 규칙 6).
   - `setRendererPriorityPolicy(RENDERER_PRIORITY_WAIVED, true)` — 렌더러가 회수되면 Capacitor `BridgeWebViewClient.onRenderProcessGone` 이 `false` 를 돌려 **프로세스 크래시**가 된다(`node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeWebViewClient.java`).
   - `LockScreenForegroundService` 축소 — 사용자 가시 기능이라 범위 밖. 보고만: 잠금화면 ON 사용자는 백그라운드 RSS 가 포그라운드와 거의 같게 나올 것이다(FGS 가 프로세스를 캐시 상태로 내려가지 못하게 한다).

### (c) 위험 · 테스트

- **위험**: 백그라운드 복귀 시 이미지 재디코딩으로 첫 프레임이 한 박자 늦을 수 있다(디스크 캐시는 남아 네트워크 재요청은 없다). 결제 중(Play 시트 오버레이)은 `onPause` 만 오고 `UI_HIDDEN` 은 오지 않아 결제 경로 무영향. 커스텀탭 로그인 중엔 `UI_HIDDEN` 이 오지만 그 시점 JS 는 대기 상태가 없다(딥링크로 재진입).
- **테스트**(릴리스 APK, AVD `cdtest`):
  1. `npm run measure:app-memory` → 표 4행(foreground / background / trimmed:RUNNING_CRITICAL / trimmed:BACKGROUND). 기대: `background` 와 `trimmed:BACKGROUND` 의 Native Heap 이 foreground 보다 작다.
  2. `adb shell am send-trim-memory com.codedestiny.app HIDDEN` 뒤 앱 복귀 → 결과 화면·음악 상태 유지.
  3. `adb logcat -s Capacitor chromium AndroidRuntime` 에 크래시·`Render process gone` 없음.
  4. chrome://inspect 콘솔에 `window.addEventListener("cd:app-memory-trim", e => console.log(e))` 걸고 2번 반복 → 이벤트 수신.

### 측정 체크리스트

| 도구 | 경로 | 보는 것 |
|---|---|---|
| `npm run measure:app-memory` | 기기 연결 + 앱 설치 | TOTAL RSS / PSS / Graphics / Native Heap 4 시나리오. `--json` 으로 BUILD_INFO 에 첨부 |
| `adb shell dumpsys meminfo com.codedestiny.app` | 수동 | 위 열의 원문. `TOTAL RSS` 가 Play 기준 본 지표, `Graphics` 가 비트맵·합성 레이어 |
| Android Studio Profiler | Run → Profile 'app' → Memory | 백그라운드 60초 뒤 힙 덤프에서 `android.graphics.Bitmap` 인스턴스 수(WebView 셸은 0 근처가 정상) |
| Play Console | 품질 → Android vitals → 메모리(신품질기준 출시 후 노출) | 백그라운드 RSS 상위 분포 |

명령 참고: `adb shell am send-trim-memory <pkg> HIDDEN|BACKGROUND|RUNNING_CRITICAL|COMPLETE`. API 34+ 에서 살아 있는 레벨은 `HIDDEN(20)`·`BACKGROUND(40)` 둘이다(나머지 deprecated).

---

## Task 2 — 코드 축소(DEX 커버리지 ≥ 25%)

### (a) 현황 진단

| 점검 | 결과 | 근거(2026-09-04 실측) |
|---|---|---|
| R8 설정 | `minifyEnabled true` · `shrinkResources true` · `proguard-android-optimize.txt` | `apps/mobile/android/app/build.gradle:95-97` |
| 적용 대상 여부 | vc42 `base/dex/classes.dex` = **1,418,220 B(1.4 MB)**. Play 요건은 **DEX 10 MB 초과 앱**에 적용 → 현재 대상 아님 | `unzip -l app-release.aab | grep classes.dex` |
| 커버리지(AAB 메타) | `BUNDLE-METADATA/com.android.tools/r8.json` `stats`: noObfuscation 25.84 / noOptimization 27.4 / noShrinking 26.33 % → **약 74%** | `unzip -p app-release.aab BUNDLE-METADATA/com.android.tools/r8.json` |
| 커버리지(mapping) | 클래스 1,957 중 1,524 리네임 = **77.9%**. 유지 433 중 270 이 `com.android.billingclient.**` | 아래 명령 |
| `@JavascriptInterface` keep | `-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }` — **메서드 멤버 한정**, 클래스 keep 아님, `com.codedestiny.**` 와일드카드 없음 → 과대하지 않다 | `proguard-rules.pro:32-34` |
| 가장 넓은 규칙 | `-keep class com.android.billingclient.** { *; }`(270 클래스) — 결제 경로 이중 방어 목적, **좁히지 않는다**(장애 위험 대비 이득 몇 %p) | `proguard-rules.pro:36-38` |
| mapping.txt 업로드 | AAB 에 `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map` 으로 **자동 동봉** → Play Console 이 자동 수취. 별도 업로드 불필요 | vc42 BUILD_INFO |
| 애노테이션 keep | `-keep class com.getcapacitor.annotation.** { *; }` — vc41 크래시 근본원인 방지, 유지 | `proguard-rules.pro:20-26` |

Play 가 커버리지 계산에 `r8.json` 을 읽는지는 **미검증**(계산식 미공개). 그래서 r8.json 과 mapping 두 지표를 모두 기록한다.

### (b) 변경

- 규칙 파일 변경 **없음**. 새 플러그인 keep 1줄만 추가(`CodeDestinyCredentialsPlugin`, Task 3).
- 빌드 절차에 기록을 고정 — BUILD_INFO.txt 에 아래 세 값을 적는다.

```
# r8.json stats
unzip -p app-release.aab BUNDLE-METADATA/com.android.tools/r8.json

# mapping.txt 클래스 리네임 비율 + 패키지별 유지 수
node -e "const fs=require('fs');const L=fs.readFileSync(process.argv[1],'utf8').split(/\r?\n/).filter(l=>/^[^ ].* -> .*:$/.test(l));let r=0;const kept={};for(const l of L){const [a,b]=l.replace(/:$/,'').split(' -> ');if(a!==b)r++;else{const p=a.split('.').slice(0,3).join('.');kept[p]=(kept[p]||0)+1;}}console.log({classes:L.length,renamed:r,ratio:(r/L.length*100).toFixed(1)+'%'});console.log(Object.entries(kept).sort((x,y)=>y[1]-x[1]).slice(0,8));" apps/mobile/android/app/build/outputs/mapping/release/mapping.txt

# classes.dex 크기 (10 MB 임계 대비)
unzip -l app-release.aab | grep "dex/classes"
```

### (c) 위험 · 테스트

- 규칙 무변경이라 회귀 위험 없음. 새 플러그인 keep 누락 시 릴리스에서만 메서드가 사라진다 → 릴리스 APK 에뮬레이터에서 `Capacitor.Plugins.CodeDestinyCredentials.isAvailable()` 호출 확인.
- 이번 PR 로 `androidx.credentials` + GMS 전이 의존(auth·fido·auth-blockstore·identity-credentials·googleid)이 들어와 DEX 가 커진다 — vc43 빌드 뒤 `classes.dex` 크기와 vc42 대비 증가분을 BUILD_INFO 에 적는다. 10 MB 를 넘으면 그때부터 Play 커버리지 요건이 실제 적용된다.

---

## Task 3 — Zero-Tap Sign-In

설계·흐름·서버 초안·미검증 항목은 [ZERO_TAP_SIGNIN_DESIGN.md](ZERO_TAP_SIGNIN_DESIGN.md) 하나가 정본이다. 이번 PR 에 들어간 것:

- `apps/mobile/android/variables.gradle` `androidxCredentialsVersion = '1.6.0'`, `app/build.gradle` `androidx.credentials:credentials` + `credentials-play-services-auth`.
- `apps/mobile/android/app/src/main/java/com/codedestiny/app/CodeDestinyCredentialsPlugin.java` — `isAvailable / create / restore / clear`. 모든 실패는 `resolve({ok:false, code, message})`.
- `MainActivity.registerPlugin(CodeDestinyCredentialsPlugin.class)`, `proguard-rules.pro` keep 1줄.
- `scripts/app-native-bridge.js` `window.CodeDestinyNative.credentials` 래퍼. **호출부 없음.**

---

## UI/UX "앱 형태" 점검 (사용자 요청)

APP_UIUX_SPEC §4 의 차별화 항목은 코드가 전부 존재한다(커스텀탭 OAuth·딥링크, 하드웨어 백버튼 계약, 크로스도큐먼트 View Transition, 오프라인 배너, 롱프레스 억제, 스플래시 색 연속, 터치 타깃 44px, `/points` 앱 제거). 이번 PR 은 재구현하지 않고 빌드 뒤 릴리스 APK 스모크에서 동작만 확인한다.

- **IME 가림**: Capacitor 8.4.1 코어의 `SystemBars` 플러그인이 WebView ≥140 + `viewport-fit=cover` 면 IME 높이만큼 패딩을 준다. 셸 `index.html` 은 `viewport-fit=cover, interactive-widget=resizes-content` 선언 → 최신 WebView 는 커버. 잔여 위험은 WebView<140 + API 30-34 조합만이고 AVD 로 재현 불가 → **"출시 WebView ≥140 가정"** 으로 남긴다. 손수 인셋 리스너는 넣지 않는다(SystemBars 리스너를 덮어 safe-area CSS 주입이 끊긴다).
- **예측 뒤로가기(Android 16, targetSdk 36)**: `@capacitor/app 8.1.0` 이 `OnBackPressedDispatcher` 만 쓰고 코어에 `onBackPressed` 오버라이드가 없어 매니페스트 변경 불필요. 제스처 뒤로가기 → 히스토리 후퇴·2회 종료 토스트만 확인.

---

## 빌드 판정 (vc43, 머지 뒤 메인 체크아웃)

절차 정본: [docs/handoff/app-vc43-pass-purchase-rebuild.md](../handoff/app-vc43-pass-purchase-rebuild.md). 판정 항목:

- `aapt2 dump badging` versionCode 43 / versionName 1.0.43
- 서명 SHA-256 `73c00468a54d599f42964eb2e205bdee50b166944532ee955540fc2e2c501427`
- dist `/app/store/` 청크에 `billingNotReadyTitle` 있고 옛 "구매 중단" 0건; `js/core/checkout-entry.js` 에 `cd_direct_payment_resume`
- §Task 2 세 값(r8.json stats · mapping 비율 · dex 크기)
- dex 에 `CodeDestinyCredentialsPlugin` 존재
- 에뮬레이터: 부팅 → 이용권 탭 → `/app/store/` 가격 4종(Play 상품 비활성이면 `—`) → 뒤로가기 2회 종료 → 백그라운드 60s 복귀 정상 → `measure:app-memory`

## 범위 밖 · 보고만

- `docs/play-billing-app.md:23` 의 `runNativeAppStorePayment()` 참조는 레포에 없는 함수다(`verify:app-store-billing-policy` 가 부재를 단언한다). 문서 정정은 범위 밖.
- `LockScreenForegroundService` 상주로 인한 백그라운드 RSS — 기능 유지 결정, 수치만 기록.
