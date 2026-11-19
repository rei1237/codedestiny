# iOS Phase 4 보고서: 딥링크와 유니버설 링크

- 작성: 2026-11-19
- 기준 프롬프트: [02-ios-port Phase 4](../../prompts/2026-11-18-02-ios-port.md#phase-4--딥링크와-유니버설-링크)
- 이전 단계: [phase-3.md](phase-3.md)
- 환경: Windows 작업 PC, Apple Developer 미등록(Team ID 없음). 구현 커밋은 로컬에만 있다(push 보류, 7절).

## 1. 요약 (3줄)

1. 유니버설 링크의 앱 쪽 배선을 끝냈다. `App.entitlements`(applinks·webcredentials, `code-destiny.com`), 두 빌드 구성의 `CODE_SIGN_ENTITLEMENTS`, 그리고 웹 브리지의 `appUrlOpen`이 자사 https 링크를 앱 번들 안의 같은 경로로 연다.
2. 사이트 쪽 AASA는 Team ID가 있어야만 생성된다. 원본은 `lib/app-links/apple-app-site-association.mjs`이고, 지금은 Team ID가 비어 있어 배포 산출물은 바뀌지 않는다. `_headers`에 `application/json` 규칙만 미리 넣었다.
3. 검증: 단위 테스트 9개 통과(변이 1건으로 가드가 무는 것 확인), 운영 엣지 실측으로 `_headers`가 워커 경유 응답에 적용되고 AASA 경로가 리다이렉트 없이 404임을 확인했다. macOS CI 재빌드는 push 보류로 아직 돌리지 못했다.

## 2. 결정과 이유

| 결정 | 근거 | 관점 |
|---|---|---|
| AASA는 Team ID가 있을 때만 만든다. 값은 커밋된 상수(`APPLE_TEAM_ID = ""`) 하나다. 형식이 틀리면 빌드를 실패시킨다(fail-closed) | 자리표시자 AASA는 Apple CDN에 캐시되어 실제 앱 연결을 늦춘다. Team ID는 비밀이 아니고(AASA 자체가 공개 파일) 워크플로 변수·시크릿 배선을 늘릴 이유가 없다. 넣는 순간 한 줄 커밋으로 끝난다 | 릴리스·보안 |
| 생성은 웹 postbuild 단계(`scripts/write-apple-app-site-association.mjs`, `write-version-json` 뒤). 앱 번들 빌드에서는 건너뛴다 | `dist/`가 Pages 배포 정본이다. 앱 번들에는 필요 없는 웹 도메인 파일이다 | 빌드 |
| 도메인은 apex `code-destiny.com`만 | 실측: `https://www.code-destiny.com/.well-known/apple-app-site-association` → 301 `https://code-destiny.com/...`(Cloudflare). Apple은 AASA 리다이렉트를 따르지 않는다 | 플랫폼 |
| `_headers`에 `/.well-known/apple-app-site-association` → `Content-Type: application/json`, `Cache-Control: public, max-age=3600` | 확장자가 없어 규칙이 없으면 octet-stream으로 나간다. 실측: `_routes.json`이 `/*`를 워커로 보내지만 `/version.json`의 `_headers` no-store가 운영 응답에 붙는다 → 워커의 `env.ASSETS.fetch` 응답에도 `_headers`가 적용된다. 규칙 수 89 → 90(상한 100) | 인프라 |
| 워커(`public/_worker.js`)는 고치지 않았다 | 경로 추적: 이 경로는 `?v=`·이중 슬래시·통합 리다이렉트·로케일(HTML Accept 아님)·`/api`·레거시 로케일·fortune·famous-saju·공유 카드 어느 분기에도 걸리지 않고 `env.ASSETS.fetch`로 간다. `hardenResponse`는 `application/json`을 유지하고 charset만 붙인다. Next.js 미들웨어는 정적 export라 없다 | 인프라 |
| AASA 제외 경로: `/api/*`, `/admin/*`, `/checkout/*`, `/share/*`, `/fortune/share/*`, `/.well-known/*`, `/og/*`, `*.xml`, `*.txt`, `*.json`. 나머지 `/*`는 앱으로 | `/api`는 화면이 아니다(OAuth 콜백 포함). `/admin`은 앱 번들에서 지운다. 앱 번들은 PortOne이 없고 StoreKit은 Phase 6이라 웹 결제 링크는 Safari에 둔다. 공유 카드는 워커가 요청마다 그려 번들에 같은 화면이 없다 | 결제 정책·UX |
| 웹 URL ↔ 앱 경로는 같은 체계 | 앱은 같은 정적 export를 번들에 싣고, `CodeDestinyViewController`의 라우터가 `/route` → `/route/index.html`로 해석한다(없는 경로는 홈) | 아키텍처 |
| 브리지: https + 자사 호스트(`code-destiny.com`, `www.`)만, `api.` 호스트와 `/api` 경로는 무시, `window.location.assign(path+search+hash)` | 외부 호스트·http·API로 앱 안 이동이 일어나면 안 된다. 기존 외부 링크 가드(`installExternalLinkGuard`)와 같은 이동 방식 | 보안 |
| 콜드 스타트는 별도 코드 없음 | `@capacitor/app` iOS `AppPlugin.swift`가 `appUrlOpen`을 `retainUntilConsumed: true`로 보낸다(원본 소스 확인). 첫 페이지가 리스너를 붙이는 순간 전달된다. 웜 스타트는 현재 페이지의 리스너가 받는다 | 플랫폼 |
| 로그인 필요 경로는 새 코드 없이 기존 게이트에 맡긴다 | 앱 안에서 웹과 같은 페이지가 열리므로 `app/_lib/auth-store.ts:786`·`CheckoutClient.tsx:104`의 `/login?next=<원래 경로>`가 그대로 동작하고, 앱 OAuth 복귀는 `next`로 원래 목적지에 돌아간다(`completeMobileOAuth`) | UX |
| Android App Links는 이번 범위 밖 | Android는 커스텀 스킴만 있다. https 링크는 Android 리스너로 오지 않으므로 이번 브리지 변경은 Android 동작을 바꾸지 않는다 | 범위 |

### 라우팅 표

| 웹 URL | 앱 내부 라우트 | 푸시 `route` | 위젯 탭 대상 | 비고 |
|---|---|---|---|---|
| `https://code-destiny.com/<path>?<q>#<h>` | `/<path>?<q>#<h>`(번들, `/<path>/index.html`) | `/<path>`(같은 체계, Phase 8에서 사용) | `/<path>`(같은 체계, Phase 8) | 기본 규칙 |
| `/records/` | `/records/` | `/records/` | 오늘 결과 등 | 로그인 필요 → `/login?next=/records/` |
| `/yeongnyangi/library/` | 같음 | 같음 | — | 로그인 필요 |
| `/api/*`, `/admin/*`, `/checkout/*`, `/share/*`, `/fortune/share/*`, 파일형 경로 | 앱으로 오지 않음(Safari) | 쓰지 않음 | 쓰지 않음 | AASA 제외 |
| `com.codedestiny.app://auth?...` | OAuth 복귀(기존) | — | — | 커스텀 스킴, Android와 공통 |
| `https://www.code-destiny.com/...` | 앱으로 오지 않음(AASA 없음) | — | — | apex 301 |

## 3. 변경 파일

커밋 `f72deb1a0`(로컬, push 전)

| 파일:라인 | 이유 |
|---|---|
| `apps/mobile/ios/App/App/App.entitlements:1-14` | associated-domains: `applinks:code-destiny.com`, `webcredentials:code-destiny.com` |
| `apps/mobile/ios/App/App.xcodeproj/project.pbxproj:325,348` | Debug·Release 타깃 구성에 `CODE_SIGN_ENTITLEMENTS = App/App.entitlements;`(CRLF 보존) |
| `lib/app-links/apple-app-site-association.mjs:1-66` | Team ID 상수(빈 값), 번들 ID, 도메인, 제외 경로, `buildAppleAppSiteAssociation()`(Team ID 없으면 null, 형식 오류면 예외) |
| `scripts/write-apple-app-site-association.mjs:1-27` | postbuild: Team ID가 있으면 `dist/.well-known/apple-app-site-association` 작성, 없으면 로그만 |
| `scripts/run-postbuild.mjs:17-18` | 위 단계를 `write-version-json` 뒤에 배선 |
| `_headers:222-226`, `public/_headers:222-226` | AASA 경로 `application/json` 규칙(두 파일 동일, CRLF·BOM 보존) |
| `scripts/app-native-bridge.js:772-788,798-807` | `universalLinkPath()` 추가, `appUrlOpen`에서 자사 https 링크를 앱 안 경로로 이동 |
| `__tests__/ui/oauth-app-handoff.test.js:79-216` | 유니버설 링크 이동·거부, AASA 생성 조건·제외 경로, `_headers`·entitlements·pbxproj 정적 확인 |

## 4. 검증 결과

| 시나리오 | 방법 | 결과 |
|---|---|---|
| 자사 https 링크 3종(쿼리·해시 포함, www, 루트) → 앱 안 같은 경로 | `node --test __tests__/ui/oauth-app-handoff.test.js` | 통과. OAuth 교환·진행 화면·브라우저 닫기 없음, 기존 세션 유지 |
| `/api/...`, `/api`, `api.` 호스트, 외부 호스트, 유사 호스트(`code-destiny.com.evil.example`), http → 이동 없음 | 같은 테스트 | 통과. 진행 화면을 걷어 냄 |
| 가드가 실제로 무는지 | `/api` 거부 줄을 지운 변이 → 테스트 | 1건 실패(의도대로), 원복 뒤 9/9 통과 |
| 기존 OAuth 복귀 2건 | 같은 테스트 | 통과(회귀 없음) |
| AASA 생성 조건 | 같은 테스트 + `node scripts/write-apple-app-site-association.mjs` | 빈 Team ID → null, 형식 오류 4종 → 예외, 유효 값 → appIDs·webcredentials·제외 규칙 순서 확인. 스크립트 출력: `APPLE_TEAM_ID 가 비어 있어 파일을 만들지 않음`. `NEXT_PUBLIC_RUNTIME_TARGET=mobile-app`이면 `앱 번들 빌드라 건너뜀` |
| 운영 엣지가 `_headers`를 워커 경유 응답에 적용하는지 | `curl -sI https://code-destiny.com/version.json` | `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` → 적용됨 |
| AASA 경로가 지금 리다이렉트 없이 응답하는지 | `curl -sI https://code-destiny.com/.well-known/apple-app-site-association` | `404`, Location 없음(파일이 없으니 정상) |
| www | `curl -sI https://www.code-destiny.com/.well-known/apple-app-site-association` | `301` → apex. 그래서 entitlements에서 뺐다 |
| 변경 기반 검사 | `npm run check:fast -- --committed-head` | test:node 에서 영냥이 v7 골든 3파일만 BLOCKED(하위 프로세스 exit 143, 약 120초 타임아웃). 단독 재실행 4/4 통과 → 동시 부하 타임아웃, 이번 변경과 무관 |
| macOS CI 컴파일·시뮬레이터 | `ios-shell-build.yml` | 통과(2026-11-20, [44574289524](https://github.com/rei1237/codedestiny/actions/runs/44574289524), [44585851632](https://github.com/rei1237/codedestiny/actions/runs/44585851632)) |
| 커스텀 스킴 전달(OS 경유) | DEBUG `-cdSelfTest`가 앱 안에서 `UIApplication.shared.open(com.codedestiny.app://cd-selftest?probe=scheme)` → CI "Assert link delivery" | **실측 통과**. 앱이 자기 스킴을 열면 확인창 없이 LaunchServices → `AppDelegate` → `CapacitorOpenURLNotification` → `appUrlOpen` 리스너까지 도착(trace `appUrlOpen` 기록). 바깥 `simctl openurl`은 여전히 `Open in "꿀꿀운세"?` 확인창에서 멈추며, 스킴 등록 확인용으로만 남겼다 |
| 유니버설 링크 앱 내 처리 | 같은 셀프 테스트가 `NSUserActivityTypeBrowsingWeb`(webpageURL `https://code-destiny.com/about/?cd_selftest=universal`)을 `AppDelegate.application(_:continue:…)`에 전달 | **실측 통과**. `CapacitorOpenUniversalLinkNotification` → `appUrlOpen` → 브리지 `universalLink /about/` → 웹뷰 `capacitor://localhost/about/?cd_selftest=universal&lang=en`(제목 "꿀꿀 운세 소개 …") |
| 유니버설 링크 실수신(콜드·웜) | 실기기 | 미검증. Team ID·서명·AASA 배포가 모두 필요해 OS의 도메인 연결 단계는 시뮬레이션으로 대신했다(위 행) |
| 콜드 스타트 경합 | 실행 [44562306732](https://github.com/rei1237/codedestiny/actions/runs/44562306732) | 첫 페이지 로드가 끝나기 전에 유니버설 링크가 오면 "Frame load interrupted" 뒤 index.html 로 다시 로드돼 이동이 사라졌다. 셀프 테스트는 페이지 안정 뒤 보내도록 고쳤고, 제품 동작(콜드 스타트 링크 유실 가능성)은 후속 과제 |
| 상단 safe area(레이아웃 측정) | 셀프 테스트 layout probe, 실행 44585851632 | 홈: `env(safe-area-inset-top)` 62px, body padding 62px, 헤더 top 62 → 정상. `/about/`(정적 `public/static/policies/about/index.html`, `header.policy-site-header` sticky): `env()` **0px**, body padding 0, 헤더 top 0 → 스크린샷에서도 상태바와 겹침. 원인: 이 정적 페이지의 viewport 메타에 `viewport-fit=cover`가 없다(`width=device-width,initial-scale=1`). GlobalHeader CSS(6c9dfb1f3)와는 무관. 미수정(후속 과제) |

## 5. 레드팀: 지금 제출하면 반려될 사유

1. 서명할 수 없다. Team ID가 없어 Associated Domains capability가 든 프로비저닝 프로파일을 만들 수 없다. 지금 entitlements를 넣은 상태로 자동 서명하면 "Provisioning profile doesn't include the com.apple.developer.associated-domains entitlement"가 난다. Developer 등록 뒤 App ID에 Associated Domains를 켜야 한다.
2. AASA가 없다. 유니버설 링크는 동작하지 않고, 커스텀 스킴(OAuth 복귀)만 동작한다. 심사 반려 사유는 아니지만 Phase 4 완료 조건은 아니다.
3. Phase 5(Sign in with Apple)·Phase 6(StoreKit) 미구현은 그대로 반려 사유다(가이드라인 4.8, 3.1.1).
4. 홈 `<html>`에 `data-platform`이 없는 문제(Phase 3 CI 발견, React 하이드레이션 오류 #418 추정)는 그대로다. 이번 구현은 이 속성에 기대지 않는다.

## 6. 사용자가 할 일

1. Apple Developer Program 등록(phase-1.md 3절 1행). Membership 화면에서 Team ID(영문 대문자·숫자 10자)를 알려 준다.
2. App ID `com.codedestiny.app`에 Associated Domains capability를 켠다(Xcode 자동 서명이면 등록 뒤 자동으로 켜진다).
3. Team ID를 받으면 에이전트가 할 일: `APPLE_TEAM_ID` 한 줄과 pbxproj `DEVELOPMENT_TEAM`을 커밋 → 스테이징 배포 → `curl -sI <staging>/.well-known/apple-app-site-association`로 200·`application/json`·리다이렉트 없음 확인 → 운영 승격(별도 1회 승인) → `https://app-site-association.cdn-apple.com/a/v1/code-destiny.com`에서 Apple CDN 반영 확인.
4. 🔴 Cloudflare 봇 보호(대시보드)가 Apple CDN 크롤러를 막지 않는지 AASA 배포 뒤 위 CDN URL로 확인한다. 막히면 `/.well-known/*` 예외 규칙이 필요하다(대시보드 작업이라 사용자 승인 필요).
5. (선택) www에서도 유니버설 링크를 원하면 www의 301에서 `/.well-known/apple-app-site-association`을 예외로 두는 Cloudflare 규칙이 필요하다. 지금은 apex만으로 충분하다고 본다.

## 7. 남은 위험과 다음 Phase 승인 요청

### 위험·검증·롤백(RED: 라우팅·헤더·빌드 단계)

- 위험: `_headers` 규칙 1개 추가(89 → 90, 상한 100). postbuild 단계 1개 추가(Team ID가 비면 아무것도 쓰지 않는다). 워커·`_redirects`·`_routes.json`·`worker/wrangler.toml`은 바꾸지 않았다. 앱 쪽은 링크 이동 분기 1개와 entitlements다.
- 검증: 위 4절. 배포 산출물 영향은 `_headers` 한 블록뿐이고 대상 경로는 지금 404다.
- 롤백: `git revert f72deb1a0` 한 번. 다른 커밋과 섞이지 않았다.

### 남은 위험

- **push 보류**: 로컬 main에 다른 세션의 결제 동결 문구 커밋 4개(`23b5c55c0`, `82fd0491d`, `c724bfece`, `5c200552b`)가 먼저 있고 origin/main에는 로컬에 없는 `e3f3adfcc`가 있다. push 여부는 사용자 결정이다. 그 전까지 macOS CI 재빌드(entitlements 포함 컴파일)를 돌릴 수 없다.
- `CODE_SIGNING_ALLOWED=NO` 시뮬레이터 빌드는 entitlements를 서명에 쓰지 않는다. entitlements 오류는 실서명(Team ID) 때 처음 드러날 수 있다.
- `wrangler pages deploy`가 점 디렉터리(`.well-known`)를 올리는지는 Team ID를 넣은 첫 스테이징 배포에서 확인한다(6절 3).
- 경로 전체(`/*`)를 앱으로 보내므로, 앱 번들에 없는 동적 화면이 더 있으면 앱에서 홈으로 떨어진다. 알려진 동적 화면(공유 카드 2종)은 제외했다.

### 다음 Phase 승인 요청

- Phase 5(인증: Sign in with Apple, ASWebAuthenticationSession)는 아직 승인되지 않았다. 진행하려면 승인이 필요하고, Sign in with Apple도 Team ID·서비스 ID가 있어야 끝까지 확인할 수 있다.
