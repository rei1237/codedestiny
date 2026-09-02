---
status: active
updated: 2026-09-02
next: "§5 \"다음에 할 일\" 우선순위대로 — 착수 전 §3-A 가 PR #720(C안)으로 이미 끝났는지 대조한다"
---

# 색인 부진 대응 — 인수인계 (2026-08-15)

> 이 문서만 읽고 이어서 작업할 수 있게 쓴다. 진단은 전부 라이브 실측이며 재현 명령을 함께 남긴다.

## 1. 진단 결론 — 원인은 3층

| 층 | 원인 | 색인을 막는 방식 | 상태 |
|---|---|---|---|
| **1. 도메인 신뢰도** | 도메인 등록 **2026-03-01**(5.5개월), GSC 인증 2026-08-13, GA4 2026-08-14 | 신규 도메인 + 백링크 희박 → 크롤 예산 최소 배정 | ❌ 코드 밖 (§5) |
| **2. 언어·중복 신호 파괴** | 비한국어 로케일 페이지가 **한국어 78%**, `zh-tw` 하위 9개가 `<html lang="ko">` | 언어 판정 실패 → hreflang 무효, 로케일 페이지끼리 near-duplicate | zh-tw 는 PR #670 로 해결, **한국어 크롬은 미해결(§3-A)** |
| **3. 크롤 효율 낭비** | HTML 전면 `no-store`, 내부 링크 전부 308, lastmod 오염 | 크롤 예산을 재다운로드에 소진 | 일부 해결(§2), **후행 슬래시·lastmod 원장 미해결** |

🔴 **사이트맵·robots·canonical 자체에는 결함이 없다.** 329 URL 전수 200, canonical 불일치 0, noindex 오적용 0,
중복 title/description 0. **그쪽을 고치는 작업은 하지 말 것** — 이미 정상이다.

### 재현 명령

```bash
# 도메인 등록일 → registration 2026-03-01T00:14:59Z
curl -s https://rdap.verisign.com/com/v1/domain/code-destiny.com

# 사이트맵 329 URL 전수 상태 (Googlebot UA) → 329/329 = 200, 비정상 0건
curl -s https://code-destiny.com/sitemap.xml | grep -o '<loc>[^<]*' | sed 's/<loc>//' \
  | xargs -P8 -I{} curl -s -o /dev/null -w "%{http_code} {}\n" -A "Googlebot/2.1" {}
# 총 페이로드 40.4MB / median 93KB / 로케일 홈 5개가 6.7MB(17%)
```

로케일 페이지 언어 오염 실측 (HTML 태그 제거 후 문자종류 카운트):

| URL | hangul | kana | han | latin |
|---|---|---|---|---|
| `/ja/today/` | **1433** | 192 | 183 | 219 |
| `/en/today/` | **1433** | 0 | 12 | 1024 |
| `/zh/sukuyo/` | **1433** | 0 | 296 | 216 |
| `/ja/` (정적 셸) | 481 | 9142 | 7025 | 1891 |

🔴 **아직 미검증 — 사용자가 확인해 주기로 함:** GSC 「페이지」 리포트의 사유별 분포.
`발견됨–색인되지 않음`이 많으면 층 1·3, `크롤링됨–색인되지 않음`이 많으면 층 2가 주원인이다.

---

## 2. 머지 대기 중인 PR 4개

머지 순서는 **상관 없다** — 4개 모두 `182e6b523` 에서 독립 분기했고 파일이 겹치지 않는다.

| PR | 브랜치 | 내용 |
|---|---|---|
| #670 | `fix/locale-html-lang-zh-tw` | `scripts/fix-locale-html-lang.mjs` 의 `LOCALE_LANG` 에 `zh-tw` 누락 → `/zh-tw/**` 하위가 전부 `<html lang="ko">`. 로케일을 `lib/i18n/locales.ts` 의 `pathPrefix` 에서 전수 발견하고 미분류 시 빌드 실패(fail-closed)로 바꿈 |
| #671 | `fix/sitemap-lastmod-birthdate` | `generate-sitemap.mjs` 가 `celebrity-data.ts` 튜플 5번째(=**생년월일**)를 `updatedAt` 으로 읽어 13개 URL 에 `lastmod=2008-04-21` 을 붙이던 버그 제거 |
| #672 | `chore/rss-pipeline-wiring` | `rss:generate` 를 빌드에 배선(3개월 stale 해소) + **RSS 를 사이트맵 부분집합으로 필터**(51개 중 14개가 404였다) + API fetch 타임아웃 10초 |
| #673 | `fix/html-conditional-cache` | `_headers` 의 HTML 4블록 `no-store` → `no-cache`, `Pragma`/`Expires` 제거. ETag/304 개통. 규칙 수 96/100 순증 0 |

**머지 후 라이브 확인 (필수):**
```bash
curl -s https://code-destiny.com/zh-tw/ziwei/ | grep -o '<html lang="[^"]*"'      # → zh-TW 기대
curl -s https://code-destiny.com/sitemap.xml | grep -c '2008-04'                  # → 0 기대
curl -sI https://code-destiny.com/insights/sukuyo-ankai/ | grep -iE 'etag|cache-control|cf-cache-status'
curl -s https://code-destiny.com/rss.xml | grep -o '<lastBuildDate>[^<]*'         # → 최근 날짜 기대
```

🔴 **#673 의 미검증 2건 — 2026-09-02 에 둘 다 "아니다"로 종결됐다. 다시 조사하지 말 것.**
1. ~~`no-store` 를 지우면 Cloudflare Pages 가 실제로 `ETag` 를 발급하는가.~~
   → **아니다.** `no-cache` 는 적용됐지만 HTML 에는 여전히 검증자가 없다.
2. ~~대시보드 Cache Rules 가 `_headers` 를 이기고 있지는 않은가.~~
   → **아니다.** `no-cache` 를 가진 `/version.json`·`/manifest.json` 에는 ETag 가 멀쩡히 있고,
   `_headers` 가 Content-Type 을 재지정하는 `/ads.txt` 에도 있다. 규칙 축이 아니라 **HTML 축**이다.

진짜 원인은 Cloudflare **JavaScript Detections(Bot Fight Mode)** 다 — 엣지가 HTML 본문에
`/cdn-cgi/challenge-platform/scripts/jsd/main.js` 를 주입하며 응답을 다시 쓰고, 그때
`Content-Length` 와 `ETag` 가 함께 사라진다. 워커 경로와 정적 경로가 동일 증상이라 오리진이 아니라
엣지 후처리이며, `_headers` 로도 코드로도 못 고친다(대시보드 토글이 유일한 레버이고, 사용자는 봇
보호를 유지하기로 결정했다). 대조표는
[app-optimization-remaining-2026-09-02.md](app-optimization-remaining-2026-09-02.md) §2,
재현은 `npm run measure:shell-css` 의 `[1]` 절.

---

## 3. 남은 작업

### A. 🔴 P0 — 로케일 페이지의 한국어 크롬 (가장 큰 미해결 건)

**증상:** `AppChrome` 이 전 페이지에 붙이는 크롬이 로케일과 무관하게 한국어를 서버 렌더한다.
ja/zh/zh-tw/en 페이지의 고유(로컬라이즈) 본문이 **400~560자**, 나머지 **2,291자가 공통 한국어 블록**.
로케일 페이지끼리 12-shingle Jaccard **0.74~0.75** = 서로 near-duplicate.

| 컴포넌트 | 상태 |
|---|---|
| `app/components/SiteFooterHub.jsx` | `SITE_FOOTER_HUB_TEXT_TRANSLATIONS` 에 `ko` 키 하나뿐(`:4-24`). 링크 라벨 51개 + 환불정책 ~1,100자가 전부 한국어 리터럴 |
| `app/components/GlobalHeader.tsx` | `"홈"`,`"개인정보"`,`"이용약관"`,`"문의"`,`"소개"`,`"면책"` 한국어 리터럴 |
| `app/components/DisclaimerBanner.jsx` | 번역문은 있으나 로케일을 `document.cookie`/`useState("ko")` 로 **런타임** 결정(`:27-44`,`:138-142`) → 정적 HTML 은 한국어 |

**확정된 구현 방식: C안 (사용자 승인 완료).** A안·B안은 측정으로 기각됐다 — 다시 시도하지 말 것.

- ❌ **A안(컴포넌트에 locale prop + 번역 테이블)**: `AppChrome` 이 `"use client"` 라 번역 테이블이
  **클라이언트 번들로 간다**. 추가 ≈10,400자 ≈ **+26KB raw / +10KB gz**, 현재 `layout-*.js` 청크가 41,007B 이므로
  거의 2배. 로케일 페이지는 329개 중 41개(12%)인데 비용은 100% 사용자가 낸다.
  또 `verify-locale-table-coverage.mjs:31` 이 `|| TABLE.ko` 문법을 감지해 12개 로케일을 요구 → ratchet 파손.
- ❌ **B안(postbuild HTML 리라이터)**: **하이드레이션이 되돌린다.** `SiteFooterHub` 는 클라이언트 번들에 있다
  (실측: `out/_next/static/chunks/app/layout-29a004b263cfa8a6.js` 안에 `청약철회` 문자열 존재).
  크롤러만 속는 클로킹 + React mismatch 경고가 된다.
- ✅ **C안**: `app/[locale]/layout.js` + `app/ja/layout.js` 를 추가해 **서버 컴포넌트** `LocaleFooterHub` 를
  렌더하고, `AppChrome` 은 로케일 프리픽스에서 `SiteFooterHub` 를 건너뛴다.
  클라이언트 번들 **+0 바이트**, 하이드레이션 안전, 한국어 288페이지 **무변경**.

**🔴 절대 제약 — 크롬을 그냥 지우면 빌드가 죽는다.**
`scripts/verify-adsense-readiness.mjs:28,1356` 이 로케일 사이트맵 라우트에 **가시 텍스트 1,800자**를 강제한다.
(`/{ja,zh,zh-tw,en}/**` 는 `canLoadAdsense()` 가 false 라 이 게이트가 걸린다 — `adsense-route-policy.js:239`
의 `CONTENT_PREFIXES` 에 있는 `/insights` 가 `/ja/insights` 에는 매치되지 않기 때문.)
푸터 제거 시 **41개 중 28개 FAIL**. 예: `/ja/today` 2837→569, `/zh/insights` 2637→369.
→ **삭제가 아니라 번역만이 통과 경로다.**

**구현 단계**

1. `lib/i18n/locales.ts` 에 `LOCALE_ROUTE_PREFIXES`(= `LOCALE_CONFIG[*].pathPrefix` 파생)와
   `localeFromPathname(pathname)` 추가. 클라이언트(`AppChrome`)와 서버(레이아웃)가 이 하나를 공유한다
   — 손으로 쓴 목록을 두 곳에 두지 않는다(CLAUDE.md 원칙 10).
2. `lib/i18n/siteFooterHubCopy.ts` 신규 — `Record<Locale, {...}>` 를 **5개 로케일 전부** 채운다.
   그룹 제목 4 / SEO 링크 라벨 41 / 정책 링크 라벨 10 / 사업자정보 라벨 7 / 섹션 헤딩·인트로.
   - 배치 근거: `lib/seo/i18nKeywords.ts` 의 빌드타임 카피 패턴과 동일 계층이고,
     `verify-i18n-no-hardcoded-korean.mjs:69` 의 `EXCLUDED` 에 `/^lib\/i18n\//` 가 있어 ratchet 을 오염시키지 않는다.
   - 🔴 `|| TABLE.ko` / `?? TABLE.ko` 문법 **금지**(위 A안 각주와 같은 이유).
   - 🔴 CJK 신규 파일은 **UTF-8 BOM 없이** 저장(`verify-adsense-readiness.mjs:871,948` 의 모지바케 게이트).
   - ⚠️ 이 라벨들은 `public/i18n/*.json`(3,752키)에 **없다**(실측 9개 표본 중 2개만 hit) → 새로 작성해야 한다.
     이게 이 작업의 실질 분량이다(≈230 문자열 × 4언어).
3. `app/components/LocaleFooterHub.jsx` 신규 — `"use client"` **없는** 서버 컴포넌트.
   - SEO 링크 **href 41개 전부 유지**, 라벨만 번역 (내부 링크 그래프 무손실)
   - 환불정책은 **`getRefundSection(locale)`**(`lib/legal/refundContent.ts:48`) **전문**을 그대로 렌더.
     🔴 요약본 금지 — `/zh/insights` 는 자체 콘텐츠가 369자뿐이라 푸터가 **1,431자 이상**을 내야 게이트를 넘는다.
     zh 전문 971자 + 링크·라벨 ≈729자 ≈ 1,840자로 통과하지만 마진이 ≈410자뿐이다.
     **번역은 이미 존재한다** — `lib/legal/legalContent.ts` 의 `TERMS_CONTENT[locale]` 에 `id:"refund-policy"` 섹션이
     4개 로케일 전부 있다(`:77` en / `:152` ja / `:227` zh / `:302` zh-TW). **새 법률 번역을 만들지 말 것.**
     문단 총 길이 실측: ja 1,462 / zh 971 / zh-TW 968 / en 3,706자 (KO 푸터 8행 = 1,013자).
   - 번역 고지: `app/[locale]/refund-policy/page.js:17,26,35,44` 의 `translationNotice`
     ("기계 보조 번역 / 한국어 원문 우선")를 공유 모듈로 승격해 재사용
   - 사업자 정보: 라벨은 번역, **값은 등록 원문 유지** + 기존 `data-cd-no-trans` 유지(`SiteFooterHub.jsx:188-190`)
   - 로케일 네이티브 링크 그룹 추가 권장: `lib/i18n/routes.ts` 의 `I18N_ROUTE_MAP` 으로 같은 언어 목적지 제공
4. `app/[locale]/layout.js` 신규 — `resolveLocale(params.locale)`(`app/[locale]/_lib.js:4`) 후
   `<>{children}<LocaleFooterHub locale={locale} /></>`
5. `app/ja/layout.js` 신규 — 🔴 **빠뜨리면 `/ja/tokushoho` 가 3,168→900자로 게이트 실패**.
   `app/ja/tokushoho/page.js` 는 리터럴 세그먼트라 `[locale]` 레이아웃을 못 받는다.
6. `app/components/AppChrome.tsx:177` — `{!hideChrome && !isLocaleRoute && <SiteFooterHub />}`
7. 테스트
   - 🔴 **`__tests__/ui/mindscan-immersive.static.test.js:14`** 가
     `chrome.includes("{!hideChrome && <SiteFooterHub />")` 를 문자열로 단언한다 → **6번으로 확정 파손.** 갱신 필수.
   - 신규 `__tests__/ui/locale-footer.static.test.js` (node test — `npm run test:node` 의 `__tests__/ui/*.test.js`
     글롭에 자동 편입되므로 **새 `verify:*` npm 스크립트 불필요 → `verify-guard-wiring` 무영향**):
     ① `LOCALE_ROUTE_PREFIXES` ↔ 레이아웃 파일 1:1(드리프트 방지 — 스킵 목록과 레이아웃 커버리지가 어긋나면
     푸터가 중복되거나 사라진다) ② 5개 로케일 키 완비 + ko 외 값에 `[가-힣]` 없음
     ③ `SiteFooterHub` href 집합 ⊆ `LocaleFooterHub` href 집합 ④ AppChrome 스킵 동작

**참고 — `usePathname()` 은 `output:"export"` 프리렌더에서 실제 경로를 돌려준다(산출물로 증명됨).**
`AppChrome.tsx:157-160` 의 `hideChrome` 계산 결과가 `CHROMELESS_ROUTES` 와 정확히 일치한다:
`out/tarot/mindscan/`·`out/oracle/rune/`·`out/journey/`·`out/feedback/` 푸터 0개,
`out/about/`·`out/insights/`·`out/oracle/hwatu-life/` 1개.

**검증 — 게이트 마진을 수치로 확인할 것 (핵심)**
`getVisibleText()`(`verify-adsense-readiness.mjs`)와 같은 알고리즘으로 41개 로케일 라우트를 재고,
전 행이 `visible ≥ 1800`, `hangul ≤ 60`, `lang ≠ ko` 인지 본다. 그다음:
```powershell
npm run build:cf                    # verify-adsense-readiness 가 여기서 돈다
npm run verify:adsense-readiness
node scripts/verify-locale-table-coverage.mjs
node scripts/verify-i18n-no-fallback.mjs
npm run typecheck; npm run lint; npm run test:node
# C안의 핵심 이점 확인 — 클라이언트 번들 무증가
ls -l out/_next/static/chunks/app/layout-*.js
grep -rl "返金および契約解除" out/_next/static/chunks | wc -l    # 0 이어야 함(서버 전용)
# 푸터 중복/부재 드리프트
grep -c "서비스 링크 허브" out/ja/today/index.html out/ja/tokushoho/index.html   # 0 기대
grep -c "서비스 링크 허브" out/about/index.html out/insights/index.html          # 1 기대(무변경)
```

**남는 잔여:** `GlobalHeader`·`MobileBottomNav` 의 한국어 **약 36자**는 그대로 남는다
(`홈 메뉴 개인정보 이용약관 문의 소개 면책 광고정책` / `홈 命 사주 모든 운세 이용권 마이`).
1,433 → 36 이면 언어 판정 문제는 해소되지만 완전히 0은 아니다. 별건으로 둔다.

---

### B. P1 — 내부 링크 후행 슬래시 (308 리다이렉트 전면 발생)

`next.config.mjs:184` `trailingSlash: true` 인데 내부 링크에 슬래시가 없다.
실측: 셸 `index.html` 내부 링크 중 **슬래시 없음 160건(고유 94경로) / 있음 12건**, `SiteFooterHub` 48/2.
→ 크롤러가 발견하는 모든 URL 이 2회 요청. `/about → 308 → /about/`.

**🔴 그냥 고치면 CI 가 즉사한다 — 동반 수정 필수 9곳** (전부 `href="/x"` 를 문자열로 단언):

| 파일:줄 | 단언 문자열 |
|---|---|
| `scripts/verify-public-parity.mjs:16` | `'href="/naming-ai"'` |
| `scripts/verify-public-parity.mjs:17` | `'href="/privacy-policy"'` |
| `scripts/verify-naming-prompt-flow.mjs:68` | `'href="/naming-ai"'` |
| `scripts/verify-karma-destiny-ai-flow.mjs:39` | `'href="/karma-destiny-ai"'` |
| `scripts/verify-life-book-ai-flow.mjs:249` | `'href="/premium-unlock"'` |
| `scripts/verify-master-love-codex-flow.mjs:510` | `'href="/master-love-codex"'` |
| `scripts/verify-new-year-ai-flow.mjs:54` | `'href="/new-year-ai-consultation"'` |
| `scripts/verify-mobile-entry-actions.mjs:40` | `'href="/tarot/mingri"'` |
| `scripts/verify-mobile-cdp-smoke.mjs:126` | `.moon-preview-card[href="/tarot/mingri"]` |

**🔴 더 위험한 것 — `js/core/index-inline-runtime.js:624-636`**
```js
var basePath = cdStripLocalePrefix(u.pathname);
var isAppLocalized = (basePath === '/oracle/rune' || … || basePath === '/insights' || …);
var isStandaloneHtml = (basePath === '/vedic-ai' || …);
```
`href="/insights"` → `"/insights/"` 가 되면 `basePath` 가 `/insights/` 라 **모든 조건이 조용히 false** 가 되고,
ja/zh/en 사용자가 `/ja/insights` 대신 한국어 `/insights/` 로 간다.
**에러도 테스트도 없다 — 사용자 제보로만 발견된다.**
→ 이 함수의 슬래시 정규화가 **반드시** 같은 PR 에 포함돼야 한다.
미러(`public/js/core/index-inline-runtime.js`)는 `verify:runtime-cache-sync` 가 강제하므로 `sync:public` 으로 함께 간다.

**그 외**
- `data-fallback-href`(21건)·`data-service-detail-href`(18건)도 함께 고칠 것 —
  `js/mobile-interaction-patch.js:1362,1595` 가 실제 내비게이션 값(`window.location.href = href`)으로 쓴다.
  빼면 모바일 카드 탭만 308 을 계속 탄다.
- 🔴 미러 6개(`public/index.html`, `public/{en,ja,zh,zh-tw,static}/index.html`)는 **직접 패치 금지** —
  `npm run sync:public` 이 루트 `index.html` 에서 재생성한다. 같은 커밋에 담을 것.
- 제외 대상: 확장자 있는 경로(`/ifa-oracle.html`, `/codedestiny-novel.html`, `/blood-type-app.html` 등),
  `#`·`?` 시작, 외부 URL, `javascript:`.
- `_redirects` 충돌 실측: 셸 링크 94개 중 소스와 겹치는 것은 `/daily-fortune` 1건뿐이고
  슬래시 유무 양쪽 규칙이 이미 있어 **무해**. 이 PR 은 `_redirects` 를 건드리지 않는다.
- GA4 영향: `js/core/analytics.js:132` 의 `cross_sell_click.to_service` 값이 `/ziwei`→`/ziwei/` 로 바뀐다.
  기능 문제는 아니나 대시보드 세그먼트가 끊긴다. **GA4 설치가 2026-08-14 라 지금이 바꾸기 가장 싼 시점.**
- `paid-flow-gates`: `index.html` 은 결제창 정본이라 셸 변경이 검증기를 대량 깨울 수 있다
  (`scripts/resolve-paid-gate-scope.mjs` 가 diff **내용**으로 판정). 순수 href 변경이면 결제 모달 함수 본문 밖이라
  통과할 것으로 **추정** — PR 올린 뒤 scope 잡 출력을 확인할 것.
- 모바일 앱 빌드: `scripts/build-mobile-app.mjs:359` 의 `HREF_RE` 가 `/x/` 도 캡처하고 `:257` 이
  `replace(/\/+$/,"")` 로 벗기므로 **결과 동일**(실측). 그래도 `npm run build:mobile:app` 로 확인할 것.

**새 가드(fail-closed) 권장:** `verify:internal-link-trailing-slash` — 대상 파일을 소스에서 전수 발견,
예외는 인라인 마커로만 선언(배열 열거 금지), 대상 0개면 실패. `scripts/build-cf-main.mjs` steps 에 배선하면
워크플로 파일을 안 건드리고 게이트에 들어간다(`verify-guard-wiring.mjs:169` 가 `["run","<name>"]` 배열형을 인식).

---

### C. P1 — 사이트맵 lastmod 원장 (#671 의 후속)

#671 은 생년월일만 제거했다. **남은 문제: 329개 중 202개가 빌드 날짜.**
`scripts/generate-sitemap.mjs:577` `lastmod: route.lastmod || today` → 빌드마다 전부 "오늘 수정됨"으로 바뀌어
Google 이 lastmod 신호를 통째로 신뢰하지 않게 된다.

**사용자 확정 방식: 콘텐츠 서명 원장** (`config/sitemap-lastmod.json`).

1. 라우트별 소스 해석기(**하드코딩 목록 금지**): `app/<path>/page.*` → 그 파일 /
   `STATIC_CANONICAL_ROUTES`(`scripts/static-canonical-route-map.mjs`) → `index.html` + 라우트 엔트리 /
   로케일 루트 → `index.html` + `sync-legacy-static-to-public.mjs` 의 `LOCALE_SHELL_SEO` /
   famous-saju → published slug·category 집합.
   **어디에도 안 걸리면 exit 1**(원칙 10 — 미분류가 조용히 `today` 로 새는 경로를 막는다).
2. 🔴 **서명 정규화 필수**: 해시 전에 `?v=[a-zA-Z0-9_-]+` → `?v=__CACHE_KEY__` 치환.
   빼면 `sync:public`(build-cf-main 순서상 `sitemap:generate` 앞)이 매 빌드 캐시키를 다시 써서
   `index.html` 해시가 매번 바뀌고 **지금과 똑같이 전부 오늘 날짜가 된다**(= "고쳤다"고 착각하기 딱 좋다).
   기존 `normalizeForCacheKey`(`sync-legacy-static-to-public.mjs:247-252`)와 같은 로직 — `scripts/lib/` 로 공용 추출 권장.
3. 서명이 원장과 같으면 저장된 lastmod 유지, 다르거나 신규면 `today` 로 갱신 후 원장 재기록.
4. 🔴 **git log 방식은 쓸 수 없다** — `.github/workflows/pr-ci.yml:170` 의 build 잡에 `fetch-depth` 지정이 없어
   shallow(=1) 다. `git log -1 -- <file>` 이 빈 값을 내고 `|| today` 로 되돌아가 지금과 같아진다.
   (release 워크플로는 `fetch-depth: 0` 이라 두 환경이 다른 값을 낸다는 점이 더 나쁘다.)
5. 새 가드 `verify:sitemap-lastmod`: ①서명 재계산 불일치(원장 미갱신) ②원장에 없는 사이트맵 URL
   ③원장에만 있는 URL ④미해석 라우트 ⑤**lastmod 가 미래거나 2020-01-01 이전**이면 실패.
   ⑤가 생년월일 재발 방지선이다. 배선은 `build-cf-main.mjs` steps 의 `sitemap:generate` 바로 뒤.

**최대 위험:** 개발자가 로컬 빌드 없이 PR 을 올리면 CI 가 원장을 새로 계산해 `today` 를 쓰고 그 산출물은 버려진다
→ 결함이 그대로 남는다. 위 가드가 fail-closed 로 막아야 한다.

---

### D. P1 — IndexNow 배선 (워크플로 스텝 **사용자 승인 완료**)

현재 `lib/indexnow.ts`·`scripts/indexnow-submit.ts`·키파일 `public/5bc08c66f3854c4bb6591216cfa84d29.txt` 는
있는데 **`scripts/indexnow-submit.ts:3` 이 안내하는 `npm run seo:indexnow` 가 package.json 에 없다** → 실행 경로 0.

- 🔴 **`lib/seo-site-urls.ts` 를 쓰지 말 것.** 현행 `indexnow-submit.ts:13` 이 부르는 `getAllSitemapUrls()` 는
  실제 배포되는 `sitemap.xml`(329, `generate-sitemap.mjs` 산출)과 **완전히 별개의 병렬 목록**이다.
  (그 파일 헤더 주석의 "Shared with app/sitemap.ts" 는 거짓 — `app/sitemap.ts` 는 존재하지 않는다.)
  그대로 배선하면 사이트맵이 명시적으로 제외한 URL(noindex 인 famous-saju 상세 130개 등)을 검색엔진에 제출하게 된다
  — 색인 품질을 개선하려다 정반대가 된다.
- `.ts` 유지 불가: `tsx`·`ts-node`·`esbuild` 어느 것도 devDependencies 에 없고, 확장자 없는 상대 import 가
  순수 Node ESM 에서 해석되지 않는다(`npm run seo:indexnow` 가 애초에 없던 진짜 이유로 **추정**).
  → `scripts/indexnow-submit.mjs` 로 다시 쓰고 **`sitemap.xml` 을 파싱**한다.
  키 상수는 복제하지 말고 `lib/indexnow.ts:6-30` 을 **파일로 읽어 일치를 단언**한다(원칙 9).
- 델타 제출: `lastmod` 가 오늘인 URL 만. **C(원장)가 선행돼야 한다** — 안 그러면 202개가 매 배포 today 라
  매번 전량 제출이 되고 Bing/Naver 가 스팸으로 취급해 신호가 죽는다. 델타 0건이면 건너뛰고 정상 종료.
- 워크플로: `cloudflare-pages-deploy.yml` 의 `Verify deployed SHA` 스텝(`:246-253`) **뒤**에
  `if: success()` + 🔴 **`continue-on-error: true`**.
  후자를 빼면 IndexNow 장애가 `deploy-safe` 를 통해 멀쩡한 배포를 롤백시킨다.
- 새 가드 `verify:indexnow-wiring`: `seo:indexnow` 존재·실재 파일 지시 / `INDEXNOW_KEY` ↔ `public/<key>.txt`
  파일명·내용 일치(키 회전 시 조용한 403 방지) / 제출 소스가 `sitemap.xml` 인지(`lib/seo-site-urls` import 시 실패).
- Google 은 IndexNow 를 받지 않는다 — 기대치를 정확히 할 것(Bing·Naver·Yandex).
- 🔴 실제 POST 는 외부 상태를 바꾸므로 **최초 1회 실행 승인**을 받고 돌린다. `--dry-run` 플래그를 함께 구현할 것.

---

### E. P2 — `sameAs` 가 남의 블로그를 공식 계정으로 신고 중

`lib/seo/siteSeo.ts:68-73` 의 `sameAs` 와 `app/_components/SocialFooter.js` 의 실제 링크가 어긋난다.
**라이브 실측 (2026-08-15, `<title>`/`og:title` 확인):**

| 항목 | `sameAs` 값 | 실체 | 판정 |
|---|---|---|---|
| 네이버 블로그 | `blog.naver.com/codedestiny` | 제목 **"수고했어 오늘도."** | ❌ **타인의 블로그** |
| 네이버 블로그(진짜) | — | `blog.naver.com/goodbyejieun` = **"코드데스니티"**, "사주 자미두수 타로 등…" | 푸터에만 있음 |
| Instagram | `instagram.com/code_destiny_official/` | 제목이 generic `Instagram` | ❌ **존재하지 않음** |
| Instagram(진짜) | — | `instagram.com/codedestiny_official/` = "Code:Destiny_official" | 푸터에만 있음 |
| YouTube | 없음 | `youtube.com/@CodeDestiny_Official` = "코드 데스티니" | ⚠️ 누락 |
| Threads | 없음 | `threads.com/@codedestiny_official` = "Code:Destiny 공식" | ⚠️ 누락 |
| X | 없음 | `x.com/sajuseongj97497` = "Code:Destiny" | ⚠️ 누락 |

또 `sameAs` 에 자기 사이트 URL(`/about`,`/insights`)이 들어 있는데 `sameAs` 는 **외부 프로필 전용**이라 무의미하다.

**영향:** Google 이 브랜드 엔티티를 통합하지 못한다. 실재 4개 채널의 신호가 스키마에 안 실리고
무관한 타인 블로그가 실린다 → **백링크 작업을 해도 엔티티로 귀속되지 않는다.** 백링크의 코드 측 전제 조건이다.

**수정:** 실측 확인된 5개로 교체 + 자기 URL 제거. 푸터와 `sameAs` 를 **한 곳에서 파생**시켜 재드리프트를 막는다.

> ⚠️ 사용자 확인 필요: `goodbyejieun` 이 본인 블로그가 맞는지(본문에 `code-destiny` 4회 언급 확인됨).
> 맞다면 블로그 제목 오타 **"코드데스니티" → "코드데스티니"** 도 고치는 게 브랜드 검색에 유리하다(레포 밖).

---

### F. P2 — 고아 페이지 8개 (사이트맵에 있으나 내부 링크 0)

`/animal/mbti/` `/flower/astrology/` `/flower/destiny/` `/flower/jamidusu/` `/flower/sukuyo/`
`/insights/fusion/` `/ja/tokushoho/` `/reviews/`
(`/reviews/` 는 priority 0.85 / changefreq daily 인데 링크 0)

- 🔴 `/ja/tokushoho/` 는 **한국어 푸터가 아니라 JA 로케일 셸**에 넣을 것
  (`sync-legacy-static-to-public.mjs` 의 `applyLocaleSeoMeta:588-616` 경로).
  일본 특정상거래법 고지를 한국어 푸터에 넣으면 관련성 신호가 오염된다.
- 🔴 루트 `index.html` 에 넣으면 `sync:public` 이 6개 미러 전부에 복제한다 → 한국어 홈에 일본 법정 고지가 뜬다.
- 푸터 링크 인플레 주의: `SiteFooterHub` 는 **모든 Next 라우트**에 렌더된다(51 → 59 링크). 8개가 상한선.
- 새 링크는 처음부터 후행 슬래시를 달 것(B 의 가드가 강제). 새 링크 텍스트에 `data-cd-trans` 마커 누락 시
  `verify:i18n-*` 계열 마커 수 일치 검사에 걸린다.
- 새 가드 권장: `verify:no-orphan-sitemap-routes` — 사이트맵 경로집합 A 와 소스 전수 링크집합 B 를 만들고
  `A − B` 가 비면 통과. 정당한 고아는 인라인 마커로만 선언. A 나 B 가 0개면 실패.
  **이번 8개를 고치는 것보다 이 가드의 값이 크다** — 새 라우트를 사이트맵에만 넣고 링크를 안 다는 실수를 막는다.

---

## 4. 근중복 페이지 (이번 범위에서 **제외**, GSC 데이터 확인 후 별건)

- `famous-saju/category/*` 12개 — actor↔singer 토큰 **79% 공유**, 고유 본문 282~431자
- `nakshatra/codex/*` 27개 — codex/0↔codex/1 토큰 **72% 공유**
- `high-value/category/*` — 282~568자
- `/flower/*` 4개 — 결제 유도 스텁, 390~441자
- 색인 가능 허브가 둘: `/famous-saju/`(16,408자)와 `/insights/famous-saju/`(18,156자), Jaccard 0.369.
  둘 다 self-canonical 이고 둘 다 **noindex 인 상세 130개**를 나열한다
  (`app/insights/famous-saju/[slug]/page.tsx:113`).
- 전체 329개의 보일러플레이트 비율 중앙값 32%, **70% 초과가 55개(17%)**.

이들의 색인 정책(noindex 전환 / 통합 / 본문 보강) 판단은 **GSC 「크롤링됨–색인되지 않음」 실데이터를 본 뒤**에 한다.
지금 손대면 근거 없이 콘텐츠를 지우는 셈이 된다(CLAUDE.md 절대규칙 6).

---

## 5. 백링크 — 사람이 해야 하는 것

**전제:** 도메인 5.5개월. `무료 사주` 같은 초경쟁어는 당분간 포기하고 **롱테일 + 브랜드 + 니치**로 간다.
사용자 확인: 네이버 블로그 운영 중 · 공식 SNS 운영 중 · 커뮤니티 참여 가능.

| # | 작업 | 왜 |
|---|---|---|
| 1 | **네이버 서치어드바이저**에 사이트 + RSS 제출 | 네이버는 GSC 와 별개 색인. 한국 트래픽의 실질 관문. **#672 머지 후에 할 것**(그 전 피드는 3개월 낡았고 14개가 404였다) |
| 2 | **네이버 블로그 주 2~3회 포스팅**, 본문에 인사이트 URL 링크 | `SEO_SUBMISSION_GUIDE.md:80` 이 "실질적으로 가장 효과가 큼"으로 지목. Google 에는 nofollow 지만 네이버 색인·브랜드 검색에 직접 작용 |
| 3 | **Bing Webmaster Tools** — GSC 에서 임포트 | 클릭 몇 번. Bing 색인은 Google 보다 훨씬 관대 |
| 4 | **다음(카카오) 검색등록** | 국내 3번째 관문 |
| 5 | 커뮤니티 참여 | 실측: `숙요점 안괴 궁합` 검색 상위를 dcinside 숙요 마이너 갤러리·포스타입·cboard 가 점유. **이 니치의 실제 트래픽 소재지.** 광고성 링크 투척은 역효과이니 답변 기여 중심으로 |
| 6 | GSC 「페이지」 사유별 분포 회신 | §1 의 층 2 vs 층 3 우선순위 확정 |

🔴 **하지 않을 것:** 유료 백링크·링크 팜·자동 디렉터리 대량 제출.
운세는 Google 이 스팸 감시를 강하게 하는 카테고리라 신규 도메인에서 이걸 하면 회복이 오래 걸린다.

---

## 6. 효과 측정

GSC 「페이지」 리포트의 `크롤링됨–색인되지 않음` / `발견됨–색인되지 않음` 수를 **머지 전에 기록**해 둔다.
색인 개선 판정에는 최소 **2~4주**가 걸린다 — 그 전에 "개선됐다"고 말하지 않는다.
GA4 는 2026-08-14 설치라 비교 기준선 자체가 아직 얇다는 점도 감안할 것.

---

# 부록 — 2026-08-16 후속 감사 (구조 결함 4건 수정)

> 이 절은 위 본문(2026-08-15)을 **대체하지 않는다.** 위 §1 의 결론
> *"사이트맵·robots·canonical 자체에는 결함이 없다"* 는 이번 재감사에서도 유지된다.
> 이번에 고친 것은 위 문서가 다루지 않은 **구조화 데이터·hreflang 클러스터·내부 링크** 결함이다.
> 위 §3 의 잔여 작업 A~F 는 A·B·C·D 가 **여전히 미착수**이고, E·F 는 이번에 처리했다.

## 1. 감사 범위와 방법

- 감사 프레임: `.claude/skills/{seo-audit,schema,site-architecture,ai-seo}` (2026-08-16 설치,
  `npx skills add coreyhaines31/marketingskills`). 프레임만 차용했고 스킬이 권하는
  "페이지 대량 생성·키워드 삽입·스키마 추가"류는 적용하지 않았다(CLAUDE.md 절대규칙 6).
- 판정 근거는 **빌드 산출물 실측**이다. 소스 grep 만으로 단언한 항목은 없다.
  탐색 중간 단계에서 나온 "hreflang 이 슬래시 없이 나간다", "루트 languages 맵이 전 페이지로 샌다"
  두 주장은 **산출물 대조로 오판임을 확인해 기각**했다(아래 §4).

## 2. 고친 것 (PR `fix/seo-structural-defects`)

| # | 문제 | 실측 근거 | 수정 |
|---|---|---|---|
| P1 | **전 페이지가 "나는 홈페이지"라고 선언** | 직전 빌드 산출물 **593개 중 587개**가 `"@id":"https://code-destiny.com/#webpage"` 를 홈 name·url 로 달고 있었다. 그중 **518개는 자기 WebPage 가 아예 없어** 그 잘못된 노드가 유일한 WebPage 였다 | `app/layout.js` 의 `@graph` 에서 WebPage 노드 제거. Organization·WebSite 는 `@id` 앵커 사이트 엔티티라 유지 |
| P1 | **정책 페이지 hreflang 클러스터가 통째로 버려지는 상태** | `HreflangPathMap` 에 `zh-TW` 키가 없어 `/zh-tw/**` 정책 3종이 **자기 자신을 hreflang 집합에 못 넣었다**(자기참조 누락 = 전체 무시). `x-default` 는 `/privacy-policy`·`/terms-of-service` 를 가리켰는데 둘 다 `/privacy`·`/terms` 로 canonical 되는 **별칭**이다(비정본 대상 = 클러스터 폐기). ko 원본은 hreflang 을 **아예 안 냈다**(리턴 태그 없음 = 단방향 = 쌍 폐기) | `lib/i18n/routes.ts` 에 `I18N_POLICY_ROUTE_MAP` 신설(사이트맵 `i18nRouteGroups` 마지막 3그룹과 동일 값). 5개 페이지가 이 하나를 공유 |
| P1 | **`sameAs` 가 타인 블로그를 공식 계정으로 신고** | `blog.naver.com/codedestiny` = **"수고했어 오늘도."**(타인), `instagram.com/code_destiny_official/` = **없는 계정**, 나머지 2개는 자기 사이트 URL(`sameAs` 는 외부 프로필 전용) | 실계정 5개로 교체. `SOCIAL_PROFILES` 하나에서 `sameAs` 와 푸터 링크를 **함께 파생**시켜 재드리프트 차단 |
| P2 | **고아 라우트 7개** (사이트맵 등재, 내부 링크 0) | `app/ components/ src/ index.html` 전수 `href="<path>/?"` 검색 결과 7개 전부 0건 | `SiteFooterHub.jsx` 에 후행 슬래시 포함 링크 추가 (41→48 SEO 링크) |
| P3 | `lib/seo.v2.ts` 죽은 export 2개 | 3면 grep(소스 + `__tests__/` + `scripts/verify-*`) 결과 참조 파일이 자기 정의부 1개뿐 | `buildSeoMetadataV2`·`buildWebPageJsonLdV2` 삭제. 파일 자체는 `app/robots.ts`·`lib/share.v2.ts`·`lib/generate-page-metadata.ts` 가 쓰므로 **유지** |

### 수정 후 실측

```
WebPage 노드 분포 (out/, HTML 693개)
  2개 이상: 0     (before 69)
  1개:      169
  0개:      524
  홈 노드 오염: 1  (out/index.html = 홈 자신, 정상)   before: 587/593

hreflang — out/zh-tw/privacy-policy/ 가 자기 자신 포함 6개 선언, 전부 후행 슬래시,
           x-default → https://code-destiny.com/privacy/ (실제 정본)
           out/privacy/ 가 동일 집합을 리턴 태그로 선언
sameAs   — 실계정 5개만
고아 7개  — out/about/ 에서 전부 1건씩 링크 확인
사이트맵  — 429 URL 불변
```

검증 명령과 결과: `lint`(에러 0) · `typecheck` · `build:cf`(`[adsense-readiness] OK`) ·
`verify:sitemap`(429) · `verify:seo-heading-integrity`(429 라우트 H1 정확히 1개) ·
`verify:seo-entity-registry`(profiles=17) · `test:node`(221/221).

🔴 **커밋에서 뺀 것**: 빌드가 재생성한 `sitemap.xml`·`public/sitemap.xml`(316줄, **전부 `lastmod` 날짜만**)과
`rss.xml` 4종(`lastBuildDate` 1줄씩). 이번 변경과 무관한 §3-C 의 날짜 churn 이고, 배포되는 사이트맵은
커밋본이 아니라 빌드 산출물(`promote-static-shell` 이 `out/sitemap.xml` → `dist/`)이라 프로덕션 영향이 없다.

## 3. 점수 (판단값 — 측정값이 아님)

| 영역 | before | after | 근거 |
|---|---|---|---|
| Technical SEO | 78 | 78 | 이번 변경 대상 아님. 감점 요인은 §3-C(lastmod 202/429 가 빌드 날짜), 사이트맵 인덱스·크기 가드 부재, `verify:sitemap` 이 PR CI 에 없음 |
| On-page SEO | 82 | 82 | 제목·설명 전역 유일성과 H1 1개는 이미 게이트가 강제 중 |
| International SEO | 55 | 68 | 정책 3그룹 클러스터 복구. **§3-A(로케일 페이지 한국어 78%)가 미해결이라 상한이 낮다** |
| Structured Data | 45 | 78 | WebPage 오염·`sameAs` 오등록 제거. 잔여: 518페이지에 페이지 단위 WebPage 부재, WebSite `name` 이 3곳에서 서로 다름 |
| Site Architecture | 72 | 78 | 고아 7개 해소. 잔여: `coreRoutes` 15개가 선언만 되고 사이트맵에 못 들어감 |
| Internal Linking | 65 | 68 | 링크는 늘었으나 **§3-B(내부 링크 후행 슬래시 미적용 → 전 경로 308)** 미해결 |
| AI/GEO SEO | 58 | 70 | 엔티티 일관성(공식 채널 5개) 복구가 핵심. 잔여: `llms.txt` 없음 |
| **Overall** | **64** | **74** | |

## 4. 조사했으나 **고치지 않은** 것 (근거 포함 — 다시 파지 말 것)

| 항목 | 판정 |
|---|---|
| hreflang 후행 슬래시 / `createHreflang.ts` 가 슬래시 없는 URL 을 낸다는 의심 | ❌ **오판**. `out/ja/ziwei/index.html` 에 11개 + x-default 가 **전부 후행 슬래시로** 정상 출력된다. Next 가 `trailingSlash:true` 에 맞춰 정규화한다 |
| 루트 `alternates.languages` 가 전 페이지로 샌다는 의심 | ❌ **오판**. `out/saju`·`out/tarot` hreflang 0건. 자체 `alternates` 를 세우는 페이지가 루트 값을 통째로 대체한다 |
| SEO 유틸 9파일 통합 | `docs/seo-strategy/08-technical-seo-checklist.md:11` 에서 이미 감사 후 "죽은 파일 0개 → 통합하지 않는다"로 결론. 뒤집을 근거 없음 |
| `lib/seo-site-urls.ts`·`app/components/SeoJsonLd.jsx` 삭제 | 🔴 **임포터 0이지만 살아있는 가드 참조다.** `verify-master-love-codex-flow.mjs:482,488` 과 `verify-seo-entity-registry.mjs:78` 이 **파일로 읽어 단언**한다. 지우면 CI 즉사 |
| `app/oracle/ifa/page.tsx:32` canonical → noindex 대상(`/ifa-oracle.html`) | `_redirects:45-46` 이 `/oracle/ifa` 를 `/ifa-oracle` 로 301 시키고 리다이렉트가 정적 자산을 이긴다 → **이 페이지는 서빙되지 않는다**. 게다가 자체 `index:false`. 실 영향 0이라 방치가 더 안전 |
| noindex 26개 페이지가 루트 canonical `/` 상속 | 실측: hreflang 은 안 새고 canonical 만 상속. 전부 `noindex, nofollow` 라 noindex 가 우선 |
| 근중복 페이지(famous-saju·codex 등) 정책 | §4 그대로 — GSC 「크롤링됨–색인되지 않음」 실데이터 확인 후 판단 |
| 신규 fail-closed 가드 3종 | 사용자가 이번 범위에서 제외 결정 |

## 5. 다음에 할 일 (우선순위)

1. **§3-A 로케일 한국어 크롬 (P0, 색인 최대 레버)** — 승인된 C안. 실질 분량은 ja/zh/zh-TW/en 약 230문자열 신규 번역.
   🔴 푸터를 **삭제**하면 `verify-adsense-readiness` 의 1,800자 게이트에서 41개 중 28개가 FAIL 한다 — **번역만이 통과 경로**.
2. **§3-B 내부 링크 후행 슬래시 (P1)** — 동반 수정 9곳 + `js/core/index-inline-runtime.js:624-636` 이 같은 PR 에 반드시 포함.
3. **§3-C lastmod 원장 (P1)** — 이번 PR 이 사이트맵 churn 을 뺀 이유가 이 미해결 항목이다.
4. **§3-D IndexNow (P1)** — C 선행 필요. 외부 POST 1회 승인 필요.
5. 페이지 단위 WebPage 노드 — 이번 수정으로 524페이지가 WebPage 0개가 됐다(이전엔 **틀린** 노드 1개). 손실은 아니지만
   `SeoLandingTemplate`·`buildFortuneJsonLd` 를 안 쓰는 라우트에 올바른 노드를 주는 것은 별건으로 남는다.
6. WebSite `name` 3중 드리프트 — `lib/structured-data.ts`(오버라이드) / 정적 셸 `index.html:876` / `prompt-hub-3004.html` 이
   같은 `@id` 에 서로 다른 이름을 선언한다.

## 6. 코드로 해결 불가 — 사람이 해야 하는 것

- GSC 「페이지」 리포트 사유별 분포 회신 (§1 의 층 2 vs 층 3 우선순위 확정에 필요)
- 네이버 서치어드바이저 사이트 + RSS 제출 / Bing Webmaster (GSC 임포트) / 다음 검색등록
- 백링크 (§5) — 특히 네이버 블로그 주 2~3회 포스팅
- 색인 재요청 및 2~4주 후 재측정. **그 전에 "개선됐다"고 말하지 않는다.**
