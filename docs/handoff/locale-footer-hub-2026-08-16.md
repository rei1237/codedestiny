# 로케일 페이지 한국어 크롬 제거 (C안) — 인수인계 (2026-08-16)

> ## ✅ 이 문서의 §3 은 **구현 완료**됐다 (PR #720, 2026-08-16)
>
> 아래 본문은 착수 전에 쓴 계획이며 **그대로 실행됐다.** 실측 결과와 계획이 어긋난 지점만 여기 적는다.
>
> | 항목 | 계획 | 실측 결과 |
> |---|---|---|
> | 한국어 문자수 | 1,433 → 36 예상 | **1,433 → 66~99 (평균 70)** |
> | 1,800자 게이트 | 마진 ≈410자 예상 | **41/41 통과, 최소 마진 +584자** (`/zh-tw/insights/` 2,384자) |
> | 클라이언트 번들 | **+0 바이트** 예상 | **+1,650B** (41,007 → 42,657B) |
> | 신규 번역 | 약 230문자열 | **약 308** (77 × 4로케일) + SocialFooter·로케일 네비 |
>
> **계획이 놓쳤던 것 2가지 (다음에 같은 실수를 하지 말 것):**
>
> 1. **`SocialFooter` 가 로케일 푸터 안에서도 한국어였다.** 계획은 `SiteFooterHub` 만 봤는데
>    `SocialFooter` 는 두 푸터가 공유하는 컴포넌트였다. 잔여 한국어가 예상 36자보다 많은
>    84~117자로 나와 출처를 열어 보고 발견했다.
> 2. 🔴 **그걸 순진하게 고치면 A안 기각 사유가 그대로 재현된다.** `SocialFooter` 는
>    `SiteFooterHub → AppChrome("use client")` 경로라 **클라이언트 번들에 포함된다.**
>    거기서 5개 로케일 카피 테이블을 import 하니 layout 청크가 **41,007B → 63,469B(+22KB)** 가 됐다.
>    → 카피는 **prop 으로 내린다**(`SiteFooterHub` 는 자기 ko 문자열만 보유).
>    `__tests__/ui/locale-footer.static.test.js` 가 두 파일의 `siteFooterHubCopy` import 를 막는다.
>
> **`+1,650B` 를 0으로 만들지 말 것** — `AppChrome` 이 `localeFromPathname` 을 쓰면서 `LOCALE_CONFIG` 가
> 클라이언트 그래프에 들어온 값이다. 프리픽스를 `AppChrome` 에 손으로 박으면 0이 되지만 같은 목록이
> 두 곳에 생겨(CLAUDE.md 원칙 10) 어긋나는 순간 푸터가 중복되거나 사라진다. 테스트가 그 하드코딩을 막는다.
>
> **함께 처리된 것**: `/ja/tokushoho` 고아 해소(로케일 네이티브 링크 그룹, ja 한정) ·
> WebSite `name` 3중 드리프트 정리 · 기계 번역 고지 공유 상수화.
>
> **다음 작업은 §7 로.**

> **이 문서만 읽고 시작할 수 있게 쓴다.** 수치는 전부 2026-08-16 실측이고 재현 명령을 함께 남긴다.
>
> 브랜치 `feature/locale-footer-hub` 와 worktree `D:/Development/cd-wt-locale-footer` 가 **이미 준비돼 있다**
> (`node_modules` 는 메인에 junction). 이 문서 커밋 하나만 올라가 있고 구현은 **0% 착수**다.
>
> **선행 조건은 이미 충족됐다** — PR #718(`fix/seo-structural-defects`)이 2026-08-16 main 에 머지됐다
> (`73c5f5c73`). 이 브랜치는 그 위에서 분기했으므로 `origin/main` 과의 차이는 이 문서 1개뿐이다.
> #718 이 `SiteFooterHub` 의 SEO 링크를 41 → 48 로 늘렸고 아래 §3-2-c 의 href 표가 그 48개 기준이다.
> **main 에서 새로 분기해도 무방하다** — 다만 48개 기준인지 반드시 확인하고 시작할 것.

---

## 0. 왜 이 작업이 P0 인가

`docs/handoff/seo-indexing-2026-08-15.md` §1 의 층 2 = **언어·중복 신호 파괴**. 그 문서의 실측:

| URL | hangul | kana | han | latin |
|---|---|---|---|---|
| `/ja/today/` | **1433** | 192 | 183 | 219 |
| `/en/today/` | **1433** | 0 | 12 | 1024 |
| `/zh/sukuyo/` | **1433** | 0 | 296 | 216 |

로케일 페이지의 고유(로컬라이즈) 본문은 **400~560자**인데 공통 한국어 블록이 **2,291자**다.
로케일 페이지끼리 12-shingle Jaccard **0.74~0.75** = 서로 near-duplicate.
→ Google 이 언어를 판정하지 못해 hreflang 이 무효화되고, 로케일 페이지들이 중복으로 묶인다.

**hreflang 자체는 정상이다**(2026-08-16 확인: `out/ja/ziwei/index.html` 에 11개 + x-default, 전부 후행 슬래시).
문제는 태그가 아니라 **렌더되는 언어**다. 그래서 이걸 고치기 전에는 다른 국제 SEO 작업의 효과가 안 난다.

---

## 1. 확정된 구현 방식 — C안 (사용자 승인 완료). A·B안 재시도 금지

- ❌ **A안 (컴포넌트에 locale prop + 번역 테이블)**: `AppChrome` 이 `"use client"` 라 번역 테이블이
  **클라이언트 번들로 간다**. 추가 ≈10,400자 ≈ **+26KB raw / +10KB gz**. 현재 `layout-*.js` 청크가
  41,007B 이므로 거의 2배. 로케일 페이지는 429개 중 41개(9.6%)인데 비용은 100% 사용자가 낸다.
  또 `verify-locale-table-coverage.mjs:31` 이 `|| TABLE.ko` 문법을 감지해 12개 로케일을 요구 → ratchet 파손.
- ❌ **B안 (postbuild HTML 리라이터)**: **하이드레이션이 되돌린다.** `SiteFooterHub` 는 클라이언트 번들에 있다
  (실측: `out/_next/static/chunks/app/layout-*.js` 안에 `청약철회` 문자열 존재).
  크롤러만 속는 클로킹 + React mismatch 경고가 된다.
- ✅ **C안**: `app/[locale]/layout.js` + `app/ja/layout.js` 를 추가해 **서버 컴포넌트** `LocaleFooterHub` 를
  렌더하고, `AppChrome` 은 로케일 프리픽스에서 `SiteFooterHub` 를 건너뛴다.
  클라이언트 번들 **+0 바이트**, 하이드레이션 안전, 한국어 388페이지 **무변경**.

---

## 2. 🔴 절대 제약 — 크롬을 그냥 지우면 빌드가 죽는다

`scripts/verify-adsense-readiness.mjs:28` 의 `minimumBlockedIndexableVisibleTextLength = 1800` 이
**로케일 사이트맵 라우트 41개**에 가시 텍스트 1,800자를 강제한다(:1356 에서 적용).

`/{ja,zh,zh-tw,en}/**` 가 이 게이트에 걸리는 이유: `canLoadAdsense()` 가 false 이기 때문이다
(`app/components/adsense-route-policy.js` 의 `CONTENT_PREFIXES` 에 있는 `/insights` 가 `/ja/insights` 에는 매치되지 않는다).

**푸터 제거 시 41개 중 28개 FAIL.** 예: `/ja/today` 2837→569, `/zh/insights` 2637→369.

> **→ 삭제가 아니라 번역만이 통과 경로다.** 링크를 줄이거나 환불정책을 요약하면 게이트에 걸린다.

재현:
```bash
grep -oE '<loc>https://code-destiny.com/(ja|zh|zh-tw|en)(/[^<]*)?</loc>' sitemap.xml | wc -l   # → 41
grep -n 'minimumBlockedIndexableVisibleTextLength' scripts/verify-adsense-readiness.mjs        # → 28, 1356
```

---

## 3. 구현 단계

### 3-1. `lib/i18n/locales.ts` — 공유 프리미티브 추가

`LOCALE_ROUTE_PREFIXES`(= `LOCALE_CONFIG[*].pathPrefix` 에서 **파생**, 손으로 쓰지 말 것)와
`localeFromPathname(pathname)` 을 추가한다. 클라이언트(`AppChrome`)와 서버(레이아웃)가 이 하나를 공유한다
— 같은 목록을 두 곳에 두면 CLAUDE.md 원칙 10 위반이고, 스킵 목록과 레이아웃 커버리지가 어긋나면
**푸터가 중복되거나 사라진다.**

기존 export 참고: `LOCALES`(5) · `PUBLIC_LOCALES`(4, ko 제외) · `LOCALE_CONFIG`(:20) ·
`localeUrlSegment`(:109, 소문자 `zh-tw` 반환) · `localizePath`(:113).

### 3-2. `lib/i18n/siteFooterHubCopy.ts` — 신규, 이 작업의 실질 분량

`Record<Locale, {...}>` 를 **5개 로케일 전부** 채운다. ko 값은 `SiteFooterHub.jsx` 의 현재 리터럴을 그대로 옮긴다.

**문자열 인벤토리 (로케일당 77개 → ko 제외 4로케일 = 308개 신규 번역)**

| 묶음 | 개수 | 출처 (`app/components/SiteFooterHub.jsx`) |
|---|---|---|
| 그룹 제목 | 4 | `siteFooter.001~004` (핵심 운세 / 타로 리딩 / 신탁 & 특화 / 추천 가이드) |
| SEO 링크 라벨 | **48** | `SEO_LINK_GROUPS` (12 + 12 + 16 + 8) — #718 이후 수치 |
| 정책 링크 라벨 | 10 | `POLICY_LINKS` |
| 사업자정보 라벨 | 7 | `siteFooter.005~011` |
| 섹션 헤딩·인트로·copyright | 8 | 아래 §3-2-a |
| **합계** | **77** | |

**a. 섹션 헤딩 8개 위치**: `sfhKicker`("Constellation Navigation") · `sfhTitle`("서비스 링크 허브") ·
`sfhSubtitle` · 환불 `<h2>`("디지털 운세 서비스 환불 안내") · 환불 인트로 `<p>` ·
환불 마무리 `<p>` 2개 · "사업자 정보" `<h2>`. 그리고 `aria-label` 4종("서비스 하단 정책 정보",
"환불 정책 안내", "사업자 정보", "정책 및 안내 링크")과 copyright 줄.

**b. 🔴 규칙**
- `|| TABLE.ko` / `?? TABLE.ko` 폴백 문법 **금지** (A안 각주와 같은 이유 — `verify-locale-table-coverage.mjs:31`).
- CJK 신규 파일은 **UTF-8 BOM 없이** 저장 (`verify-adsense-readiness.mjs:871,948` 의 모지바케 게이트).
- 배치 근거: `verify-i18n-no-hardcoded-korean.mjs:69` 의 `EXCLUDED` 에 `/^lib\/i18n\//` 가 있어
  이 경로에 두면 ratchet 을 오염시키지 않는다.
- ⚠️ 이 라벨들은 `public/i18n/*.json`(3,752키)에 **없다**(표본 9개 중 2개만 hit) → 새로 작성해야 한다.

**c. SEO 링크 48개 href 전량 (라벨만 번역, href 는 그대로 — 내부 링크 그래프 무손실)**

```
그룹1 핵심 운세(12)  /kkul-kkul-unse  /saju  /manse  /today  /compatibility  /premium
                    /saju/basic  /ziwei/chart  /astrology/cosmic  /saju/sibyl
                    /life-book-ai  /love-secret-ai
그룹2 타로 리딩(12)  /tarot  /physiognomy  /tarot/mingri  /tarot/love  /tarot/healing
                    /tarot/self-esteem  /tarot/reunion  /tarot/prompt-maker  /tarot/year
                    /tarot/mindscan/  /tarot/crystal-soul/  /animal/mbti/
그룹3 신탁&특화(16)  /ziwei  /astrology  /sukuyo  /vedic  /nakshatra  /dream
                    /oracle/hwatu-life  /ifa-oracle.html  /oracle/royal-tea  /oracle/rune
                    /oracle/sikojen-povailu  /high-value
                    /flower/destiny/  /flower/astrology/  /flower/jamidusu/  /flower/sukuyo/
그룹4 추천 가이드(8) /insights  /high-value  /high-value/complete-guide-to-saju
                    /high-value/how-tarot-actually-works  /high-value/understanding-your-destiny
                    /insights/fusion/  /reviews/  /faq
정책 링크(10)       /privacy  /terms  /contact  /about  /disclaimer  /advertising-policy
                    /terms#refund-policy  /faq  /methodology  /insights
```

> 뒤 7개(`/animal/mbti/` · `/flower/*` 4 · `/insights/fusion/` · `/reviews/`)는 #718 이 추가한
> 고아 해소 링크다. 후행 슬래시가 붙어 있는 것은 의도다 — 없으면 각각 308 을 한 번 탄다.

### 3-3. `app/components/LocaleFooterHub.jsx` — 신규, `"use client"` **없는** 서버 컴포넌트

- SEO 링크 **href 48개 전부 유지**, 라벨만 번역.
- 환불정책은 **`getRefundSection(locale)`**(`lib/legal/refundContent.ts:47`) **전문**을 그대로 렌더.
  🔴 **요약본 금지** — `/zh/insights` 는 자체 콘텐츠가 369자뿐이라 푸터가 **1,431자 이상**을 내야 한다.
  zh 전문 971자 + 링크·라벨 ≈729자 ≈ 1,840자로 통과하지만 **마진이 ≈410자뿐**이다.
- 🔴 **새 법률 번역을 만들지 말 것.** 이미 있다 — `lib/legal/legalContent.ts` 의 `TERMS_CONTENT[locale]`
  에 `id:"refund-policy"` 섹션이 4개 로케일 전부 존재 (**실측 줄번호**: `:77` en / `:152` ja / `:227` zh / `:302` zh-TW).
  문단 총 길이: **ja 1,462 / zh 971 / zh-TW 968 / en 3,706자** (KO 푸터 8행 = 1,013자).
- 번역 고지: `app/[locale]/refund-policy/page.js` 의 `translationNotice`
  ("기계 보조 번역 / 한국어 원문 우선")를 공유 모듈로 승격해 재사용.
- 사업자 정보: **라벨은 번역, 값은 등록 원문 유지** + 기존 `data-cd-no-trans` 유지
  (`SiteFooterHub.jsx:188-190` — 상호·대표자·신고번호·주소는 등록된 그대로가 법적 형식).
- 로케일 네이티브 링크 그룹 추가 권장: `lib/i18n/routes.ts` 의 `I18N_ROUTE_MAP` 으로 같은 언어 목적지 제공.
  (같은 파일에 #718 이 추가한 `I18N_POLICY_ROUTE_MAP` 도 있다 — 정책 3종의 로케일별 URL.)

### 3-4. `app/[locale]/layout.js` — 신규

`resolveLocale(params.locale)`(`app/[locale]/_lib.js:4`) 후
`<>{children}<LocaleFooterHub locale={locale} /></>`.

### 3-5. `app/ja/layout.js` — 신규

🔴 **빠뜨리면 `/ja/tokushoho` 가 3,168 → 900자로 게이트 실패.**
`app/ja/tokushoho/page.js` 는 리터럴 세그먼트라 `[locale]` 레이아웃을 못 받는다
(실측: `app/ja/` 아래에 `tokushoho` 하나 존재).

### 3-6. `app/components/AppChrome.tsx` — 로케일 라우트에서 스킵

**현재 위치는 `:183`** (핸드오프 원문의 `:177` 은 그 뒤 변경으로 밀렸다):
```tsx
{!hideChrome && <SiteFooterHub />}
```
→ `{!hideChrome && !isLocaleRoute && <SiteFooterHub />}`

`isLocaleRoute` 는 §3-1 의 `localeFromPathname(pathname)` 으로 계산한다.
`pathname` 은 이미 `:163` 에서 `usePathname() ?? "/"` 로 잡혀 있다.

> 참고 — `usePathname()` 은 `output:"export"` 프리렌더에서 실제 경로를 돌려준다(산출물로 증명됨).
> `hideChrome`(`:166`) 계산 결과가 `CHROMELESS_ROUTES`(`:25`)와 정확히 일치한다:
> `out/tarot/mindscan/`·`out/oracle/rune/`·`out/journey/`·`out/feedback/` 푸터 0개,
> `out/about/`·`out/insights/`·`out/oracle/hwatu-life/` 1개.

### 3-7. 테스트

- 🔴 **`__tests__/ui/mindscan-immersive.static.test.js:14`** 가
  `chrome.includes("{!hideChrome && <SiteFooterHub />")` 를 **문자열로 단언**한다 → §3-6 으로 **확정 파손**. 갱신 필수.
  (같은 파일 :13·:15 의 `GlobalHeader`·`DisclaimerBanner` 단언은 그대로 둔다.)
- 신규 `__tests__/ui/locale-footer.static.test.js` — node test. `npm run test:node` 의
  `__tests__/ui/*.test.js` 글롭에 **자동 편입**되므로 새 `verify:*` npm 스크립트가 필요 없다
  (→ `verify-guard-wiring` 무영향, 신규 CI 게이트 추가 아님).
  단언 4가지:
  1. `LOCALE_ROUTE_PREFIXES` ↔ 레이아웃 파일 **1:1** (드리프트 = 푸터 중복 또는 부재)
  2. 5개 로케일 키 완비 + ko 외 값에 `[가-힣]` 없음
  3. `SiteFooterHub` href 집합 **⊆** `LocaleFooterHub` href 집합
  4. `AppChrome` 스킵 동작

---

## 4. 검증 — 게이트 마진을 **수치로** 확인할 것 (핵심)

`getVisibleText()`(`scripts/verify-adsense-readiness.mjs`)와 **같은 알고리즘**으로 41개 로케일 라우트를 재고,
전 행이 `visible ≥ 1800`, `hangul ≤ 60`, `lang ≠ ko` 인지 본다. 그다음:

```bash
npm run lint
npm run typecheck
npm run build:cf                    # verify-adsense-readiness 가 postbuild 에서 돈다
npm run verify:adsense-readiness
node scripts/verify-locale-table-coverage.mjs
node scripts/verify-i18n-no-fallback.mjs
npm run test:node

# C안의 핵심 이점 확인 — 클라이언트 번들 무증가
ls -l out/_next/static/chunks/app/layout-*.js
grep -rl "返金および契約解除" out/_next/static/chunks | wc -l    # 0 이어야 함(서버 전용)

# 푸터 중복/부재 드리프트
grep -c "서비스 링크 허브" out/ja/today/index.html out/ja/tokushoho/index.html   # 0 기대
grep -c "서비스 링크 허브" out/about/index.html out/insights/index.html          # 1 기대(무변경)
```

빌드 후 커밋 전: `git restore` 로 `sitemap.xml`·`public/sitemap.xml`·`rss.xml` 4종을 되돌린다
(빌드가 `lastmod`/`lastBuildDate` 날짜만 바꾸는 churn 이다 — #718 도 같은 처리를 했다).

---

## 5. 남는 잔여 (이 작업 범위 밖)

`GlobalHeader`·`MobileBottomNav` 의 한국어 **약 36자**는 그대로 남는다
(`홈 메뉴 개인정보 이용약관 문의 소개 면책 광고정책` / `홈 命 사주 모든 운세 이용권 마이`).
1,433 → 36 이면 언어 판정 문제는 해소되지만 완전히 0은 아니다. **별건으로 둔다.**

`/ja/tokushoho` 는 사이트맵 등재 + 내부 링크 0인 고아로 아직 남아 있다(#718 이 나머지 7개만 처리).
🔴 **한국어 푸터가 아니라 JA 로케일 셸**에 넣어야 한다
(`sync-legacy-static-to-public.mjs` 의 `applyLocaleSeoMeta:588-616` 경로).
루트 `index.html` 에 넣으면 `sync:public` 이 6개 미러 전부에 복제해 **한국어 홈에 일본 법정 고지가 뜬다.**
이 작업에서 `app/ja/layout.js` 를 만드는 김에 함께 처리하기 좋다.

---

## 6. 이 작업 전후로 열려 있는 다른 SEO 건

`docs/handoff/seo-indexing-2026-08-15.md` 기준:

| 항목 | 상태 |
|---|---|
| §3-A 로케일 한국어 크롬 | **이 문서** — 미착수 |
| §3-B 내부 링크 후행 슬래시 (P1) | 미착수. 동반 수정 9곳 + 🔴 `js/core/index-inline-runtime.js:624-636` 이 **같은 PR** 에 필수 |
| §3-C 사이트맵 lastmod 원장 (P1) | 미착수. #718 이 사이트맵 churn 을 커밋에서 뺀 이유가 이것 |
| §3-D IndexNow 배선 (P1) | 미착수. C 선행 필요 + 외부 POST 1회 승인 필요 |
| §3-E `sameAs` 오등록 (P2) | ✅ **#718 에서 해결** |
| §3-F 고아 페이지 8개 (P2) | ✅ **7개 #718 에서 해결**, `/ja/tokushoho` 만 잔존(위 §5) |
| 부록 §5-5 페이지 단위 WebPage 노드 | 미착수. #718 이후 524페이지가 WebPage 0개(이전엔 **틀린** 노드 1개라 손실 아님) |
| 부록 §5-6 WebSite `name` 3중 드리프트 | 미착수 |

---

# 7. 다음 작업 — §3-B 와 §3-C (2026-08-16 실측 갱신)

§3-A(위)가 끝난 뒤 남은 P1 두 건이다. 원본 핸드오프
`docs/handoff/seo-indexing-2026-08-15.md` §3-B·§3-C 의 수치를 **오늘 다시 쟀다.**

## 7-1. §3-B — 내부 링크 후행 슬래시 (P1)

`next.config.mjs:184` 가 `trailingSlash: true` 인데 내부 링크에 슬래시가 없어 **크롤러가 발견하는
모든 URL 이 2회 요청**된다(`/about` → 308 → `/about/`). 크롤 예산 낭비다.

**2026-08-16 실측 대상 수:**

| 대상 | 슬래시 없는 링크 수 |
|---|---|
| `index.html` (루트 셸) | **160** (확장자 있는 경로 제외) |
| `app/components/SiteFooterHub.jsx` | **48** |
| `index.html` 의 `data-fallback-href` + `data-service-detail-href` | **40** |

> `LocaleFooterHub` 는 이미 전부 슬래시가 붙어 있다(§3-A 에서 처음부터 그렇게 만들었다).

**🔴 동반 수정 필수 — 안 하면 CI 가 즉사한다.** `href="/x"` 를 **문자열로 단언**하는 verify 스크립트
(2026-08-16 재확인, 괄호 안이 오늘 센 매치 수):

```
scripts/verify-public-parity.mjs            (2)
scripts/verify-naming-prompt-flow.mjs       (1)
scripts/verify-karma-destiny-ai-flow.mjs    (1)
scripts/verify-life-book-ai-flow.mjs        (1)
scripts/verify-master-love-codex-flow.mjs   (1)
scripts/verify-new-year-ai-flow.mjs         (1)
scripts/verify-mobile-cdp-smoke.mjs         (1)
scripts/verify-mobile-entry-actions.mjs     (0 — 매치 0. 원본 핸드오프의 :40 단언이 이미 바뀐 듯하니
                                                 고치기 전에 파일을 직접 열어 확인할 것)
```

**🔴 가장 위험한 것 — `js/core/index-inline-runtime.js`** (원본 핸드오프의 `:624-636` → **오늘 `:618`·`:647-652`** 로 이동):

```js
function cdStripLocalePrefix(pathname) { ... }        // :618
var basePath = cdStripLocalePrefix(u.pathname);        // :647
var isAppLocalized = (basePath === '/oracle/rune' ||
  basePath === '/oracle/sikojen-povailu' ||
  basePath === '/insights' || basePath === '/olympus'); // :649-652
```

`href="/insights"` → `"/insights/"` 가 되면 `basePath` 가 `/insights/` 라 **모든 비교가 조용히 false**
가 되고, ja/zh/en 사용자가 `/ja/insights` 대신 한국어 `/insights/` 로 간다.
**에러도 테스트도 없다 — 사용자 제보로만 발견된다.** 이 함수의 슬래시 정규화가 **반드시 같은 PR** 에 들어가야 한다.
미러(`public/js/core/index-inline-runtime.js`)는 `verify:runtime-cache-sync` 가 강제하므로 `sync:public` 으로 함께 간다.

**그 외 주의**
- 🔴 미러 6개(`public/index.html`, `public/{en,ja,zh,zh-tw,static}/index.html`)는 **직접 패치 금지** —
  `npm run sync:public` 이 루트 `index.html` 에서 재생성한다. 같은 커밋에 담을 것.
- 제외 대상: 확장자 있는 경로(`/ifa-oracle.html` 등), `#`·`?` 시작, 외부 URL, `javascript:`.
- `_redirects` 충돌: 셸 링크 94개 중 소스와 겹치는 것은 `/daily-fortune` 1건뿐이고 슬래시 유무 양쪽
  규칙이 이미 있어 **무해**. 이 PR 은 `_redirects` 를 건드리지 않는다.
- GA4: `js/core/analytics.js` 의 `cross_sell_click.to_service` 값이 `/ziwei` → `/ziwei/` 로 바뀐다.
  기능 문제는 아니나 대시보드 세그먼트가 끊긴다.
- 🔴 `paid-flow-gates`: `index.html` 은 결제창 정본이라 셸 변경이 검증기를 대량 깨울 수 있다
  (`scripts/resolve-paid-gate-scope.mjs` 가 diff **내용**으로 판정). 순수 href 변경이면 결제 모달 함수
  본문 밖이라 통과할 것으로 **추정** — PR 올린 뒤 scope 잡 출력을 확인할 것.
- 모바일 앱 빌드: `scripts/build-mobile-app.mjs` 의 `HREF_RE` 가 `/x/` 도 캡처하고 뒤에서
  `replace(/\/+$/,"")` 로 벗기므로 **결과 동일**(원본 핸드오프 실측). 그래도 `npm run build:mobile:app` 확인.

## 7-2. §3-C — 사이트맵 lastmod 원장 (P1)

**현재 상태 (2026-08-16 실측, 커밋된 `sitemap.xml` 429 URL):**

```
2026-08-15 : 315   ← 마지막 빌드 날짜. 이게 문제다
2026-07-10 :  37
2026-07-04 :  32
2026-07-11 :  30
2026-08-04 :   6
2026-06-14 :   5
2026-07-27 :   3
2026-05-29 :   1
```

`scripts/generate-sitemap.mjs:619` 의 `lastmod: route.lastmod || today` 때문에 **429개 중 315개가
빌드마다 "오늘 수정됨"** 으로 바뀐다 → Google 이 lastmod 신호를 통째로 신뢰하지 않게 된다.
(#718·#720 이 사이트맵을 커밋에서 뺀 이유가 이 churn 이다 — 두 PR 모두 316줄이 날짜만 바뀌었다.)

**사용자 확정 방식: 콘텐츠 서명 원장 `config/sitemap-lastmod.json`.**

1. 라우트별 소스 해석기(**하드코딩 목록 금지**):
   `app/<path>/page.*` → 그 파일 / `STATIC_CANONICAL_ROUTES` → `index.html` + 라우트 엔트리 /
   로케일 루트 → `index.html` + `sync-legacy-static-to-public.mjs` 의 `LOCALE_SHELL_SEO` /
   famous-saju → published slug·category 집합.
   **어디에도 안 걸리면 exit 1** (원칙 10 — 미분류가 조용히 `today` 로 새는 경로를 막는다).
2. 🔴 **서명 정규화 필수**: 해시 전에 `?v=[A-Za-z0-9_-]+` → `?v=__CACHE_KEY__` 치환.
   빼면 `sync:public`(build-cf-main 순서상 `sitemap:generate` **앞**)이 매 빌드 캐시키를 다시 써서
   `index.html` 해시가 매번 바뀌고 **지금과 똑같이 전부 오늘 날짜가 된다** — "고쳤다"고 착각하기 딱 좋다.
   기존 로직은 `sync-legacy-static-to-public.mjs:267-272` 의 `normalizeForCacheKey` 다.
   **`scripts/lib/` 로 공용 추출**하고 양쪽이 import 할 것(복제 금지).
3. 서명이 원장과 같으면 저장된 lastmod 유지, 다르거나 신규면 `today` 로 갱신 후 원장 재기록.
4. 🔴 **git log 방식은 쓸 수 없다** — `.github/workflows/pr-ci.yml` 의 build 잡에 `fetch-depth` 지정이
   없어 shallow(=1) 다. `git log -1 -- <file>` 이 빈 값을 내고 `|| today` 로 되돌아간다.
   (release 워크플로는 `fetch-depth: 0` 이라 두 환경이 다른 값을 낸다는 점이 더 나쁘다.)
5. 원본 핸드오프가 권한 `verify:sitemap-lastmod` 가드는 **사용자가 이번 범위에서 제외 결정**했다.
   다만 위 1번의 "미분류 시 exit 1" 은 가드가 아니라 **해석기 자체의 동작**이므로 반드시 넣을 것.

**검증 방법**: `npm run build:cf` 를 **연속 2회** 돌려 `git diff sitemap.xml` 이 **비어 있으면** 성공.
(지금은 2회차에 315줄이 바뀐다.)

**착수 전 판단**: 이 작업은 빌드 경로에 있는 `generate-sitemap.mjs` 에 fail-closed 해석기를 넣는다.
라우트 계열을 하나라도 빠뜨리면 **빌드가 막힌다.** 반쯤 하고 커밋하지 말 것 — 위 2회 빌드 검증까지가 한 단위다.

## 7-3. 그 밖에 열려 있는 것

| 항목 | 상태 |
|---|---|
| §3-D IndexNow 배선 (P1) | 미착수. §3-C 선행 필요 + 🔴 실제 POST 는 **최초 1회 실행 승인** 필요. `--dry-run` 함께 구현. 🔴 `lib/seo-site-urls.ts` 를 쓰지 말고 `sitemap.xml` 을 파싱할 것 |
| 페이지 단위 WebPage 노드 | #718 이후 524페이지가 WebPage 0개다(이전엔 **틀린** 홈 노드 1개였으므로 손실은 아니다). `SeoLandingTemplate`·`buildFortuneJsonLd` 를 안 쓰는 라우트에 올바른 노드를 주는 건 별건 |
| `verify:locale-table-coverage` `+41` | **기존 실패**. clean main 에서도 동일(2026-08-16 `f20a15596` 확인). 빌드·CI 미배선 수동 가드라 지금도 main 이 빨간 채로 굴러간다 |
| `GlobalHeader`·`MobileBottomNav` 한국어 ~40자 | 로케일 페이지 잔여. 1,433 → 70 이면 언어 판정은 해소됐고 이건 별건 |
| 근중복 페이지(famous-saju·codex 등) | GSC 「크롤링됨–색인되지 않음」 실데이터 확인 후 판단 |
