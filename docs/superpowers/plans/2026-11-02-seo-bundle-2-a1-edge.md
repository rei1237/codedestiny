# SEO 묶음 ② (A1 엣지) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 같은 URL이면 국가·UA와 무관하게 상태·Location·본문·Cache-Control이 같게 만들고, 리디렉션을 절대 URL 301 한 번으로 줄인다. 해외 방문자에게는 자동 이동 대신 언어 제안 배너를 보여 준다.

**Architecture:** `public/_worker.js`에서 국가→언어 추론을 지운다. 언어는 `?lang=`·URL 접두사·명시 쿠키에서만 정해지고, `cd_geo_country` 쿠키만 국가를 전한다. 정규화 리디렉션은 `canonicalRedirect`(핸들러 앞)와 자산 301·308 정규화(핸들러 뒤) 두 곳에 모은다. 언어 제안은 클라이언트 전용 스크립트 하나(`js/cd-lang-suggest.js`)가 맡는다.

**Tech Stack:** Cloudflare Pages advanced-mode worker(import 불가), Next.js static export, `node:test` + vm 하네스, JSDOM, `scripts/seo/edge-probe.mjs`·`verify-dist.mjs`, Playwright(설치된 chromium_headless_shell-1228, `npx playwright install` 금지).

**Spec:** `docs/superpowers/specs/2026-11-01-seo-architecture-rebuild-design.md`의 'A1 — 엣지 (묶음 ②)'와 '배포 게이트'. 함정 목록은 `docs/handoff/2026-11-01-seo-architecture-rebuild.md`. 설계의 `_worker.js` 줄 번호는 약 5줄 밀렸다. 이 계획의 줄 번호를 쓴다.

## Global Constraints

- 수정 금지: `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, `worker/wrangler.toml` 구조. `ads.txt`는 지우지 않는다.
- 바꾸지 않는다: `proxyApiRequest`, `public/_routes.json`, `worker/`, `js/core/checkout-entry.js`, 결제 테스트. 결제·이용권·인증·DB·운세 계산 로직, 메인 디자인·캐릭터도 건드리지 않는다. LLM 실호출 없음.
- 금지: 클로킹, 해외 방문자 자동 이동, 배너의 SSR 출력.
- 남긴다: `?lang=` 매핑(`LANGUAGE_PATHS`, 토픽 집합), 기능 키 302, `/index.html` 301, 레거시 301, `@routes-include` 마커, `cd_geo_country`.
- 함정 4: `cd_geo_country` Set-Cookie가 있는 동안 HTML 응답은 `private`를 유지한다. `public`·`s-maxage`로 두지 않는다.
- verify-dist 등급을 `fail`로 올리는 것은 실제 dist 0건 확인 후. 00:10 KST 일일 발행을 막으면 안 된다.
- 페이지 소스나 공유 모듈을 바꾸면 `npm run sitemap:generate` 결과를 같은 커밋에 넣는다. 빌드 뒤 rss 변동은 `rss.xml insights/rss.xml public/rss.xml public/insights/rss.xml`만 되돌린다.
- 태스크마다 `npm run check:fast` → `git status`·`git diff --stat` → 커밋. 커밋 끝줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. push·배포는 묶음 승인 때만.
- 증거 파일은 `D:\Development\seo-audit\code-destiny-20261101\bundle-2\`에 둔다(저장소 밖).

## 설계에서 구체화한 판단

- **`visitorLanguage`는 남긴다.** 설계는 삭제 목록에 넣었지만, 같은 절이 남기라는 `?lang=` 매핑에 `zh-Hant`→`zh-TW` 정규화가 필요하다. `VISITOR_LANGUAGES`는 `COUNTRY_LANGUAGE_GROUPS`에 의존하므로 리터럴로 바꿔 지금과 같은 12개 언어를 유지한다.
- **명시 언어 쿠키 302는 유지한다.** 설계는 국가 입력만 제거한다. 크롤러는 쿠키가 없어 불변식에 영향이 없고, 이 응답은 쿠키로 갈리므로 `private, no-store`를 유지한다.
- **`Accept` 검사는 유지한다.** 설계는 UA 정규식만 제거한다. `Accept: */*` 클라이언트는 쿠키 없이 자산의 Cache-Control을 받는다. 알려진 제한으로 승인 패킷에 적는다.
- **Cache-Control 값:** 실측 자산 기본값이 `no-cache`이므로 HTML은 `private, no-cache`가 된다. 자산이 `no-store`인 비공개 경로는 `private, no-store`로 남는다.
- **해외 방문자의 무접두 경로(`/checkout/` 등)는 저장값이 없으면 ko다.** 설계가 의도한 결과이며 승인 패킷에 적는다.
- **`//` 레거시 경로와 `?v=` 레거시 경로는 2홉이 남는다**(`canonicalRedirect` 뒤에 레거시 판정이 있다). 만료 날짜 무슬래시 경로도 301→404→301로 2홉이다. 모두 기존 동작이거나 드문 입력이라 후속으로 보고한다.
- **`/`의 배너 폴백:** `/`는 묶음 ④ 전까지 hreflang이 없다. 배너 내부에 `/` 전용 표를 둔다. 클라이언트 전용이라 SEO 신호가 아니다.
- **운영 샘플 검사는 이 묶음에 넣는다**(Task 6). 승격 전 일일 점검이 빨간색이 되지 않도록 push와 승격을 같은 자리에서 한다.

## Review Focus

1. `_headers`가 `no-store`를 준 비공개 HTML(`/checkout/`, `/account/`)이 `private, no-cache`로 풀리면 안 된다 → Task 1 `keeps no-store` 테스트.
2. `If-None-Match` 재검증에서 자산이 304를 내면 본문 없이 그대로 나가고 쿠키가 붙지 않아야 한다(no-cache로 바뀌며 처음 실제로 쓰인다) → Task 1 `304` 테스트.
3. `/en/`에서 받은 언어가 `/checkout/`까지 이어져야 한다. geo 쿠키가 사라지면 저장값이 유일한 근거다 → Task 2 `saved language` 행렬.
4. 앱 WebView(`__cdAppLanguage`), 저장소 접근이 throw하는 브라우저, hreflang이 없는 페이지에서 배너가 깨지거나 잘못 뜨면 안 된다 → Task 3 테스트.
5. `//evil.com/x`가 다른 호스트로 나가면 안 되고, 서명 쿼리는 보존되며, POST·`/api//x`는 정규화되지 않아야 한다 → Task 4 테스트.

---

## File Structure

| 파일 | 책임 | 태스크 |
|---|---|---|
| `public/_worker.js` | 언어 추론 제거·Cache-Control | 1 |
| 〃 | `canonicalRedirect`·자산 301 정규화 | 4 |
| 〃 | RSS 병합 | 5 |
| `__tests__/ui/visitor-country-routing.test.mjs` | 불변성 테스트(리디렉션 테스트는 Task 4에서 추가) | 1, 2, 4 |
| `lib/i18n/dictionary.ts`, `js/cd-lang-native.js`, `public/js/cd-lang-native.js`, `app/stories/StoryEdition.tsx`, `public/codedestiny-novel.html` | `cd_geo_locale` 읽기 제거 | 2 |
| `__tests__/ui/novel-language-switch.test.mjs` | 기준 교체 | 2 |
| `js/cd-lang-suggest.js`, `public/js/cd-lang-suggest.js` (신규) | 언어 제안 배너 | 3 |
| `app/layout.js`, `js/cd-lang-native.js` | 배너 로드 | 3 |
| `__tests__/ui/lang-suggest.test.mjs` (신규) | 배너 JSDOM 테스트 | 3 |
| `__tests__/ui/rss-merge.test.mjs` (신규) | RSS 병합 테스트 | 5 |
| `scripts/seo/edge-probe.mjs`, `scripts/seo/verify-dist.mjs`, `__tests__/ui/sitemap-canonical.test.mjs` | 크롤러 규칙 재정의·등급 승격 | 6 |
| `scripts/seo/health-policy.mjs`, `scripts/seo/health-policy.test.mjs`, `scripts/check-seo-health.mjs` | 운영 샘플 검사 | 6 |

---

### Task 1: 워커에서 국가→언어 추론을 지운다

**Files:**
- Modify: `public/_worker.js:55-115`(언어 블록), `:147-167`(`brandHomeRedirect`), `:703-714`, `:772-775`
- Test: `__tests__/ui/visitor-country-routing.test.mjs`

**Interfaces:**
- Produces:
  - `visitorLocaleContext(request, url): { country: string, locale: string } | null`. `locale`은 `queryLocale || pathLocale || explicitLocale`이고 없으면 `""`.
  - `visitorLocaleHeaders(headers, context, cacheControl = "private, no-store"): Headers`. `cd_geo_country`만 붙인다.
  - `privateCacheControl(value: string | null): string`.

- [ ] **Step 0: 전 기준선을 남긴다**

Run: `npm run build:cf` 후 `node scripts/seo/verify-dist.mjs --json` 결과를 `bundle-2\verify-dist-before.json`에 저장한다(옵션 이름은 스크립트 CLI를 보고 맞춘다). rss 변동은 되돌린다.

- [ ] **Step 1: 실패하는 테스트로 교체한다**

`visitor-country-routing.test.mjs`에서 `:13-23`(그룹과 API 대조), `:34-68`, `:145-163`을 지우고 아래를 넣는다. `edge()` 컨텍스트에 `Request`를 추가한다. `:70-89`는 JP 기대값을 새 규칙으로 고치고(`/?question=…` → `/yeongnyangi/?question=…`, `/?paymentId=…` → `/ggulggul/?paymentId=…`, `/?lang=en` → `/en/?lang=en` 유지), `:91-121` 결제 테스트는 그대로 둔다. `:123-143` JSDOM 테스트는 Task 2 소관이므로 이 태스크에서 건드리지 않는다.

```js
const COUNTRIES = ['KR', 'US', 'JP', 'TW', 'VN'];
const AGENTS = { chrome: 'Mozilla/5.0 … Chrome/126.0.0.0 Safari/537.36', googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', yeti: 'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)' };

test('same URL gives the same status, Location, body and Cache-Control for every country and agent', …)
// 경로: '/', '/?utm_source=test', '/saju/', '/en/', '/zh-tw/sukuyo/', '/contact/', '/?lang=en', '/?question=money', '/?paymentId=x&code=y'
// COUNTRIES × AGENTS 전부 첫 응답의 [status, Location, body, Cache-Control]과 deepEqual.
// Set-Cookie에 cd_geo_locale 없음. HTML 200이면 cd_geo_country=<그 국가>가 있고, 그 값을 빼면 Set-Cookie도 같다.

test('overseas visitors get 200 on / and entry paths with no redirect', …)
// US·JP·TW의 '/', '/saju/', '/today/', '/contact/', '/ggulggul/': status 200, Location null.

test('the URL decides the language: ?lang= and explicit cookie still redirect, privately', …)
// '/?lang=en' → https://code-destiny.test/en/?lang=en (302, 'private, no-store')
// '/saju/?lang=zh-Hant' → /zh-tw/saju/?lang=zh-Hant
// '/saju/' + Cookie 'cd_locale=en; cd_locale_explicit=1' → /en/saju/ (302, 'private, no-store')
// '/ggulggul/' + Cookie 'cd_locale=ko; cd_locale_explicit=1' → 200

test('HTML keeps the asset cache directives under private', …)
// 자산 'no-cache' → 'private, no-cache'
// 자산 'public, max-age=3600, s-maxage=60' → 'private, max-age=3600'
// 자산 값 없음 → 'private, no-cache'

test('keeps no-store on private HTML', …)
// 자산 'no-store' → 'private, no-store'

test('a conditional 304 passes through without a body or geo cookie', …)
// 자산 fetch가 If-None-Match를 보면 new Response(null,{status:304,headers:{ETag:'"a"'}}) 반환
// status 304, Set-Cookie null, ETag '"a"'

test('non-HTML assets get no geo cookie', …)  // '/logo.png' JP: Set-Cookie null
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test __tests__/ui/visitor-country-routing.test.mjs`
Expected: 새 테스트가 FAIL(해외 302, `cd_geo_locale`, `private, no-store`).

- [ ] **Step 3: 워커를 고친다**

- `COUNTRY_LANGUAGE_GROUPS`를 지우고 `VISITOR_LANGUAGES = new Set(["en","ko","ja","zh-CN","zh-TW","vi","hi","ms","de","nl","fr","es"])`로 쓴다.
- `visitorLocaleContext`에서 UA 정규식과 `countryLocale`을 지운다. 반환은 위 Interfaces대로.
- `visitorLocaleHeaders`에서 `cd_geo_locale` 줄을 지우고 세 번째 인자로 Cache-Control을 받는다.
- 🔴 `localizedEntryPath` 맨 앞에 `if (!locale) return null;`을 둔다. 없으면 빈 문자열이 `locale !== "ko" && !prefix`에 걸려 CORE 토픽을 `/en/…/`로 보낸다.
- `privateCacheControl`: 값을 쉼표로 나눠 `public`·`private`·`s-maxage=*`를 빼고, 남은 게 없으면 `no-cache`를 넣어 앞에 `private, `을 붙인다.
- `:772-775`의 HTML 분기는 `visitorLocaleHeaders(response.headers, visitorLocale, privateCacheControl(response.headers.get("Cache-Control")))`로 바꾼다.
- `brandHomeRedirect` 위 주석의 "overseas visitors still land on their locale home"과 `:55` 주석을 새 동작으로 고친다.

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test __tests__/ui/visitor-country-routing.test.mjs __tests__/ui/home-entry-redirect.test.mjs __tests__/ui/consolidated-pages.test.mjs __tests__/ui/fortune-only-exposure.test.mjs __tests__/ui/recommendations-footer.test.mjs`
Expected: `:123-143` JSDOM 테스트 외 전부 PASS. JSDOM 테스트는 아직 클라이언트를 안 고쳤어도 통과해야 한다(쿠키를 직접 심기 때문).

- [ ] **Step 5: `npm run check:fast` 후 커밋한다**

```bash
git add public/_worker.js __tests__/ui/visitor-country-routing.test.mjs
git commit -m "fix(edge): stop inferring language from country and agent"
```

---

### Task 2: 클라이언트의 `cd_geo_locale` 읽기를 지운다

**Files:**
- Modify: `lib/i18n/dictionary.ts:280-287`, `js/cd-lang-native.js:147-149`, `public/js/cd-lang-native.js`(sync), `app/stories/StoryEdition.tsx:19`, `public/codedestiny-novel.html:2296`
- Test: `__tests__/ui/visitor-country-routing.test.mjs:123-143`, `__tests__/ui/novel-language-switch.test.mjs:25,30,45`

**Interfaces:**
- Produces: 언어 감지 순서는 native runtime → `?lang` → 경로 → 저장값 → `ko`. `cd_geo_locale`은 어디서도 읽지 않는다.

- [ ] **Step 1: JSDOM 행렬을 KR 기준으로 바꾼다**

테스트 이름은 `static and React language detection follow the URL and saved language, never a stale geo cookie`. 행(경로, localStorage, 쿠키, 기대값). 잔존 세션 쿠키 `cd_geo_locale=ja`를 일부러 심어 무시되는지 본다.

| 경로 | localStorage | 쿠키 | 기대 |
|---|---|---|---|
| `/checkout/` | 없음 | `cd_geo_locale=ja` | `ko` |
| `/checkout/` | `cd_lang=ko, cd_locale_ack=1` | `cd_geo_locale=ja` | `ko` |
| `/checkout/` | `cd_lang=en, cd_locale_ack=1` | `cd_geo_locale=ja` | `en` (saved language) |
| `/zh-tw/` | `cd_lang=ko` | `cd_geo_locale=ja` | `zh-TW` |
| `/checkout/?lang=en` | `cd_lang=ko` | `cd_geo_locale=ja` | `en` |
| `/ggulggul/` | 없음 | 없음 | `ko` |

- [ ] **Step 2: 소설 테스트를 바꾼다**

`novel-language-switch.test.mjs`의 `cd_geo_locale=fr`을 `cd_locale=fr`로 바꾸고 'country default' 이름을 'saved locale'로 고친다. 같은 파일에 `cd_geo_locale=fr` 쿠키만 있을 때 프랑스어가 되지 않는다는 단언을 하나 넣는다(`navigator.language`는 픽스처 기본값).

- [ ] **Step 3: 실패를 확인한다**

Run: `node --test __tests__/ui/visitor-country-routing.test.mjs __tests__/ui/novel-language-switch.test.mjs`
Expected: FAIL(`ja`가 나온다).

- [ ] **Step 4: 읽기를 지운다**

- `dictionary.ts`: `:280-287` try 블록 전체를 지운다(`storedExplicit`·`explicit`는 여기서만 쓴다).
- `js/cd-lang-native.js`: `geoLang`·`explicitLang` 세 줄을 지운다.
- `StoryEdition.tsx:19`, `public/codedestiny-novel.html:2296`: `||cookie('cd_geo_locale')`를 지운다.
- `npm run sync:public`으로 public 사본을 맞춘다. `git status`에서 이 태스크와 무관한 변동은 스테이지하지 않는다.

- [ ] **Step 5: 통과를 확인한다**

Run: `node --test __tests__/ui/visitor-country-routing.test.mjs __tests__/ui/novel-language-switch.test.mjs` 그리고 `git grep -n cd_geo_locale -- app lib js public scripts __tests__`
Expected: PASS. grep 결과는 잔존 쿠키를 일부러 심는 테스트뿐이다.

- [ ] **Step 6: `npm run sitemap:generate`, `npm run check:fast` 후 커밋한다**

```bash
git commit -m "fix(i18n): drop the geo locale cookie from language detection"
```

---

### Task 3: 언어 제안 배너

**Files:**
- Create: `js/cd-lang-suggest.js`, `public/js/cd-lang-suggest.js`(sync), `__tests__/ui/lang-suggest.test.mjs`
- Modify: `app/layout.js`(`<Script>` 묶음), `js/cd-lang-native.js`(`init` 끝), `public/js/cd-lang-native.js`(sync)

**Interfaces:**
- Consumes: `link[rel=alternate][hreflang]`, `navigator.languages`, 쿠키 `cd_locale_explicit`, localStorage `cd_lang_explicit`.
- Produces: `window.__cdLangSuggestLoaded`(중복 실행 방지), localStorage `cd_lang_suggest_dismissed=1`, DOM `#cd-lang-suggest`.

판정 순서(IIFE, ES5 문법, 외부 의존 없음):

1. 띄우지 않는다: `window.__cdLangSuggestLoaded`, `window.__cdAppLanguage`, URL에 `lang` 쿼리, 쿠키 `cd_locale_explicit=1`, localStorage `cd_lang_explicit=1`, 닫기 기록. 저장소 접근은 try/catch로 감싸고 실패하면 기록 없음으로 본다.
2. 현재 언어는 URL 접두사로 판정한다(`/en`→en, `/ja`→ja, `/zh-tw`→zh-TW, `/zh`→zh-CN, 그 외 ko). html lang은 런타임에 바뀌므로 쓰지 않는다.
3. 대안 표 = `link[rel=alternate][hreflang]`(x-default 제외, 코드는 아래 규칙으로 정규화). 경로가 `/`이면 `{en:'/en/', ja:'/ja/', 'zh-CN':'/zh/', 'zh-TW':'/zh-tw/'}`.
4. `navigator.languages`(없으면 `[navigator.language]`)를 순서대로 정규화한다. zh-TW/HK/MO/Hant → zh-TW, 나머지 zh → zh-CN, 그 외 기본 부속 태그. 현재 언어를 먼저 만나면 끝낸다. 대안 표에 있는 언어를 먼저 만나면 그 언어로 띄운다. 둘 다 아니면 다음 항목.
5. 링크는 일반 `<a href>`로 대안의 pathname만 쓴다(스테이징에서 운영으로 튀지 않게). `hreflang` 속성을 함께 단다. 닫기는 `<button type="button" aria-label=…>`. 둘 다 키보드로 닿는다. 바깥 요소에 `translate="no"`, `role="region"`.

문구(대상 언어로 쓴다. 이 문구를 그대로 쓴다):

| 언어 | 문장 | 링크 | 닫기 |
|---|---|---|---|
| en | This page is also available in English. | View in English | Close |
| ko | 이 페이지는 한국어로도 볼 수 있어요. | 한국어로 보기 | 닫기 |
| ja | このページは日本語でもご覧いただけます。 | 日本語で見る | 閉じる |
| zh-CN | 此页面也有简体中文版。 | 查看简体中文版 | 关闭 |
| zh-TW | 此頁面也有繁體中文版。 | 查看繁體中文版 | 關閉 |

표시: `position:fixed`, 화면 위쪽 중앙, `max-width: calc(100vw - 16px)`, 인라인 스타일(CSP `style-src 'unsafe-inline'` 허용 확인함). `position:fixed`라 CLS를 만들지 않는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lang-suggest.test.mjs`는 JSDOM(`runScripts:'outside-only'`)에 `navigator.languages`를 정의하고 소스를 `eval`한다. 테스트:

```js
test('offers the first browser language that has an alternate', …)
// /saju/ + alternates en·ja·ko, languages ['en-US','ko'] → 링크 pathname '/en/saju/', 문구 'View in English'
// languages ['fr-FR','ja'] → '/ja/saju/'
test('stays silent when the browser reaches the page language first', …)
// /saju/ + ['ko-KR','en'] → 없음. /en/saju/ + ['en','ko'] → 없음
test('offers Korean on an English page', …)  // /en/saju/ + ['ko-KR'] → '/saju/', '한국어로 보기'
test('maps Chinese scripts', …)  // ['zh-HK'] → zh-TW 대안, ['zh-CN'] → zh-CN 대안
test('uses the root table only on /', …)  // '/' 대안 없음 + ['ja'] → '/ja/'. '/checkout/' 대안 없음 + ['ja'] → 없음
test('uses the alternate path, not its host', …)  // href 'https://code-destiny.com/en/saju/' → getAttribute('href') === '/en/saju/'
test('never shows after an explicit choice or dismissal', …)  // 쿠키·localStorage·?lang=·__cdAppLanguage 각각 없음
test('close removes it and remembers', …)  // 버튼 클릭 → 요소 없음, cd_lang_suggest_dismissed=1, 다시 실행해도 없음
test('survives storage that throws', …)  // localStorage getter throw → 예외 없이 표시, 닫기도 예외 없음
test('x-default is not an alternate', …)  // x-default만 있고 ['en'] → 없음
test('never navigates by itself', …)  // 실행 전후 location.href 동일
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test __tests__/ui/lang-suggest.test.mjs`
Expected: FAIL(파일 없음).

- [ ] **Step 3: 구현하고 연결한다**

- `js/cd-lang-suggest.js`를 쓰고 `npm run sync:public`으로 사본을 만든다. 사본이 생기지 않으면 `scripts/sync-legacy-static-to-public.mjs`의 목록을 확인한다.
- `app/layout.js`: `<Script src="/js/cd-lang-suggest.js" strategy="lazyOnload" />`.
- `js/cd-lang-native.js`의 `init` 끝: 창 `load` 뒤(이미 complete면 바로) `script` 요소를 만들어 `/js/cd-lang-suggest.js`를 async로 불러온다. `window.__cdLangSuggestLoaded`가 있으면 만들지 않는다.

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test __tests__/ui/lang-suggest.test.mjs __tests__/ui/visitor-country-routing.test.mjs`
Expected: PASS.

- [ ] **Step 5: 화면을 확인한다**

로컬 정적 서버로 빌드 산출물을 띄우고 Playwright로 찍는다. 로케일 `en-US`, `/saju/`, `/ggulggul/`, `/`를 390×844와 1280×800에서. 동의 배너·상단 내비·하단 CTA와 겹치는지, 닫기가 동작하는지, 가로 스크롤이 없는지 본다. 스크린샷은 `bundle-2\banner\`에 둔다. 겹치면 위치만 조정한다.

- [ ] **Step 6: `npm run sitemap:generate`, `npm run check:fast` 후 커밋한다**

```bash
git commit -m "feat(i18n): suggest a language instead of redirecting"
```

---

### Task 4: 리디렉션을 절대 URL 301 한 번으로 줄인다

**Files:**
- Modify: `public/_worker.js:122-139`, `:684-702`, `:763`
- Test: `__tests__/ui/visitor-country-routing.test.mjs`(같은 파일에 추가)

**Interfaces:**
- Produces: `async canonicalRedirect(request, env, url, pathCollapsed): Promise<Response | null>`. `removePublicContentVersion`은 내부 헬퍼로 남고 consolidated 분기(`:697`)도 계속 쓴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

자산 픽스처는 Pages처럼 동작한다. `/saju`·`/fortune/tomorrow/pig`·`/ggulggul`이면 상대 Location 308(요청 search 포함), `/saju/`·`/ggulggul/`·`/fortune/tomorrow/pig/`·`/`이면 HTML 200, `/moved`이면 상대 `/new/` 301, `/temp`이면 302, 나머지 404. HEAD 호출 수를 센다.

```js
test('one absolute 301 for slashless, version and double-slash URLs', …)
// [요청 → Location]
// '/fortune/tomorrow/pig' → 'https://code-destiny.test/fortune/tomorrow/pig/'
// '/saju?utm_source=a' → '…/saju/?utm_source=a'
// '/saju/?v=1' → '…/saju/'
// '/saju?v=1&utm_source=a' → '…/saju/?utm_source=a'
// '//ggulggul/' → '…/ggulggul/'
// '//ggulggul?x=1' → '…/ggulggul/?x=1'
// 각각 status 301, Cache-Control 'no-store', 그리고 Location을 다시 요청하면 200(홉 1개)
// GET·HEAD 둘 다, COUNTRIES × AGENTS 전부 같다.

test('version removal asks ASSETS at most once', …)  // '/saju?v=1' HEAD 1회. '/saju/' 0회
test('a failing HEAD still redirects to the cleaned URL', …)  // HEAD가 throw → '/saju?v=1' → '…/saju' 301
test('//evil.com/x stays on this host', …)  // Location host === code-destiny.test, pathname '/evil.com/x'
test('signed queries keep their full URL', …)  // '/saju/?v=1&sig=a%2Bb' → 200, Location 없음
test('asset redirects become absolute 301 and keep the query', …)
// '/moved?a=1' → 301 '…/new/?a=1'. '/temp' → 302 원본 그대로
test('POST and API paths are not normalized', …)
// POST '/saju' → 자산 308 그대로. POST '//x' → 자산으로 전달. GET '/api//x' → 프록시 경로(301 아님)
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test __tests__/ui/visitor-country-routing.test.mjs`
Expected: FAIL.

- [ ] **Step 3: 구현한다**

핸들러 맨 앞(`url` 바로 뒤):

```js
const pathCollapsed = ["GET", "HEAD"].includes(request.method)
  && !/^\/(?:api|app)(?:\/|$)/.test(url.pathname) && /\/{2,}/.test(url.pathname);
if (pathCollapsed) url.pathname = url.pathname.replace(/\/{2,}/g, "/");
```

`:700-702`는 `const canonical = await canonicalRedirect(request, env, url, pathCollapsed); if (canonical) return canonical;`로 바꾼다.

`canonicalRedirect`: `removePublicContentVersion`의 결과와 `pathCollapsed`가 둘 다 거짓이면 null. 아니면 `url.toString()`을 target으로 두고, try 안에서 `env.ASSETS.fetch(new Request(target, { method: "HEAD", redirect: "manual" }))`를 한 번 부른다. 301·308에 Location이 있으면 target 기준으로 해석하고, 그 URL에 search가 없으면 `url.search`를 붙인다. catch는 target을 그대로 둔다. 응답은 `301` + `Cache-Control: no-store`.

자산 정규화는 `:763` 뒤, `assetResponse.status === 404` 분기 앞에 둔다. GET·HEAD이고 상태가 301·308이고 Location이 있으면 같은 해석 규칙으로 301 + `no-store`를 반환한다. Location 해석은 헬퍼 `absoluteRedirectTarget(location, base, search): string`으로 둘이 함께 쓴다.

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test __tests__/ui/visitor-country-routing.test.mjs __tests__/ui/home-entry-redirect.test.mjs __tests__/ui/consolidated-pages.test.mjs __tests__/ui/legacy-locale-and-date-redirect.static.test.js __tests__/ui/fortune-legacy-redirect.static.test.js`
Expected: PASS.

- [ ] **Step 5: `npm run check:fast` 후 커밋한다**

```bash
git commit -m "fix(edge): collapse canonical redirects into one absolute 301"
```

---

### Task 5: RSS 병합을 고친다

**Files:**
- Modify: `public/_worker.js:456-474`
- Create: `__tests__/ui/rss-merge.test.mjs`

**Interfaces:**
- Produces: `mergeRssXml(staticXml, dynamicXml): string`(이름 유지). 상수 `RSS_ITEM_LIMIT = 60`.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

워커 소스에서 `extractXmlBlocks`부터 `mergeRssXml` 끝까지 잘라 vm으로 평가하는 대신, `/rss.xml` 요청을 `edge(fetchImpl)`로 통과시켜 본문을 검사한다(`fetchImpl`이 동적 피드를 돌려준다).

```js
test('merged feed drops duplicates by guid then link', …)
test('merged feed sorts by pubDate, newest first, across static and dynamic items', …)
test('items with a missing or invalid pubDate sort last, in their original order', …)
test('merged feed keeps at most 60 items', …)  // 정적 50 + 동적 50 → 60, 가장 최신 60개
test('channel metadata before the items survives and the document stays well formed', …)
// <title>·<link>·atom:link 유지, </channel></rss> 유지, 항목 사이에 잘린 태그 없음
test('items with neither guid nor link are dropped', …)
test('a failing feed API still serves the static file', …)  // 기존 동작 고정
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test __tests__/ui/rss-merge.test.mjs`
Expected: 정렬·60개·키 없는 항목 테스트가 FAIL.

- [ ] **Step 3: 구현한다**

`base`에 `</channel>`이 없으면 지금처럼 `dynamicXml`을 그대로 돌려준다. 아니면 첫 `<item`(없으면 `</channel>`)을 경계로 머리를 떼고, 정적·동적 항목을 합쳐 guid||link로 중복을 없앤다(먼저 나온 쪽, 즉 정적 우선). `Date.parse`로 내림차순 안정 정렬하고(NaN은 뒤), 60개로 잘라 `머리 + 항목들 + </channel> 이후`로 다시 조립한다.

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test __tests__/ui/rss-merge.test.mjs`
Expected: PASS.

- [ ] **Step 5: `npm run check:fast` 후 커밋한다**

```bash
git commit -m "fix(rss): dedupe, sort and cap the merged feed"
```

---

### Task 6: 검사 규칙을 새 계약으로 올린다

**Files:**
- Modify: `scripts/seo/edge-probe.mjs:86-92`, `scripts/seo/verify-dist.mjs:50-52`, `__tests__/ui/sitemap-canonical.test.mjs:36-60,274-292`
- Modify: `scripts/seo/health-policy.mjs`, `scripts/seo/health-policy.test.mjs`, `scripts/check-seo-health.mjs`

**Interfaces:**
- Produces:
  - `probeEdge`의 `crawlerCookie` 위반은 `cd_geo_locale` Set-Cookie 또는 Cache-Control `no-store`다. `private`와 `cd_geo_country`는 위반이 아니다. 반환 키는 그대로 둔다.
  - `edgeSampleIssues(samples): string[]`(`health-policy.mjs`, 순수 함수). `samples`는 `{ path, agent, status, location, cacheControl, setCookie, challenge }[]`.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`sitemap-canonical.test.mjs`:
- `:36` 픽스처의 크롤러 응답을 `cd_geo_locale=en` + `private, no-store`로 바꾸고, `cd_geo_country=US` + `private, no-cache`만 주는 워커는 `crawlerCookie` 0건이라는 단언을 추가한다.
- `:283` `result.warnings.length` 단언은 승격 뒤 위반이 `failures`로 잡히는 것에 맞춰 고친다(`inspectDist` 반환 필드를 확인한다).
- `:51` 'crawler probe' 픽스처도 `cd_geo_locale`을 쓰도록 바꾼다(`Google-InspectionTool`·`Mediapartners-Google` 라벨 단언은 유지).
- 새 테스트 `the repository worker passes every edge rule`: `public/_worker.js`를 distAssets 픽스처로 돌려 세 배열이 모두 비어 있다.

`health-policy.test.mjs`, `edgeSampleIssues`:

```js
// 같은 path의 status·location·cacheControl이 agent마다 다르면 이슈 1건
// setCookie에 cd_geo_locale이 있으면 이슈. cacheControl에 no-store가 있는 200 HTML이면 이슈
// path '/saju'(슬래시 없음)가 301이 아니거나 Location이 https://로 시작하지 않으면 이슈
// challenge가 있거나 status 403인 표본은 비교·판정에서 뺀다(가짜 크롤러 UA 차단은 사이트 문제가 아니다)
// 전부 정상이면 []
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test __tests__/ui/sitemap-canonical.test.mjs scripts/seo/health-policy.test.mjs`
Expected: FAIL.

- [ ] **Step 3: 구현한다**

- `edge-probe.mjs`의 판정을 위 규칙으로 바꾼다.
- `check-seo-health.mjs`: `issues.push(...declared.issues)` 근처 다음에 Chrome·Googlebot·Yeti × `/`, `/saju/`, `/en/`, `/saju`를 `Accept: text/html`, `redirect: 'manual'`로 받아 `edgeSampleIssues`에 넘긴다. 기존 `get()`은 Accept를 보내지 않으므로 헤더 인자를 추가한다. 보고서 JSON에 `edgeSamples`를 넣는다.

- [ ] **Step 4: 실제 dist 0건을 확인하고 등급을 올린다**

Run: `npm run build:cf` 후 verify-dist 결과에서 `edge-slash-308`, `edge-country-302`, `edge-crawler-cookie`가 모두 0인지 본다(rss 변동은 되돌린다).
0건이면 세 규칙을 `fail`로 올리고 근거를 `jsonld-dates`처럼 주석 한 줄로 적는다(기준선 시각 포함). 0건이 아니면 올리지 말고 원인을 먼저 찾는다.

- [ ] **Step 5: 통과를 확인한다**

Run: `node --test __tests__/ui/sitemap-canonical.test.mjs scripts/seo/health-policy.test.mjs`
Expected: PASS.

- [ ] **Step 6: `npm run check:fast` 후 커밋한다**

```bash
git commit -m "test(seo): gate the edge invariants in verify-dist and health"
```

---

### Task 7: 로컬 증거와 승인 패킷

코드 변경 없음. 컨트롤러가 직접 한다.

- [ ] **Step 1: 전체 브랜치 검토**: 새 검토자에게 `ba3b19318..HEAD`와 이 계획, 설계 A1 절을 준다. 지적을 처리한다.
- [ ] **Step 2: 빌드와 전후 diff**: `npm run build:cf`, `verify-dist-after.json` 저장, before와 diff.
- [ ] **Step 3: 회귀 묶음**: `test:worker:auth-payments`, `smoke:core`, `verify:portone-single-payment`, `paypal-ui.test.js`, 라이브러리 테스트, `core-landing-calculation-examples.test.mjs`, `verify:fortune-period-axis`, `verify:fortune-freshness`, `deploy:critical`, `verify:ads-txt`. 로그는 `bundle-2\regression\`.
- [ ] **Step 4: dist 워커 실측**: `distAssets` 하네스로 바뀌는 URL 표(요청·전·후)를 뽑아 `bundle-2\url-matrix.md`에 저장한다.
- [ ] **Step 5: 승인 패킷**: `bundle-2\approval-packet.md`에 바뀌는 URL과 증거, `git log 6d514ecaf..origin/main`, 롤백 SHA, 위 '구체화한 판단'의 사용자 영향을 적고 사용자에게 승인을 요청한다.
- [ ] **Step 6: 승인 뒤**: push → `npm run verify:staging -- --sha=<40자리>` → 운영 dispatch → `/version.json`·한국 IP 실측·`gh workflow run seo-operations.yml -f cycle=daily` → `docs/seo/SEO_STATE.json`(낡은 `productionObservedSha` 06b0ad911 수정 포함)과 인수인계 문서 갱신.
