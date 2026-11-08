# SEO 묶음 ③ (B 색인 원장 + A3 hreflang) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 흩어진 색인 정책을 원장 `lib/seo/index-policy.mjs` 하나로 모으고, HTML과 사이트맵의 hreflang을 한 함수 `alternatesFor`에서 같은 집합으로 낸다. 전 URL의 색인 상태는 바뀌지 않는다.

**Architecture:** 의존성 없는 ESM 원장(정본 예시 `lib/brand/brand-facts.mjs`, 이미 있는 `lib/seo/robots-policy.mjs`)을 앱(TS)과 빌드 스크립트(Node)가 함께 import한다. `_worker.js`·`_headers`는 import하지 않고 verify-dist가 원장과 대조한다. 색인 상태는 새 스냅숏 도구로 전후를 떠서 diff 0을 증명한다.

**Tech Stack:** Next.js static export, Node ESM 스크립트, `node:test`, `scripts/seo/verify-dist.mjs`·`scripts/seo/health-policy.mjs` 파서.

**Spec:** `docs/superpowers/specs/2026-11-01-seo-architecture-rebuild-design.md`의 '목표 아키텍처 1·2', 'B — 색인 원장', 'A3 — hreflang', 설계 판단 5·8·10, '배포 게이트'. 함정은 `docs/handoff/2026-11-01-seo-architecture-rebuild.md`. 설계의 줄 번호는 밀렸다. 이름으로 찾는다.

## Global Constraints

- 수정 금지: `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, `worker/wrangler.toml` 구조. `ads.txt`는 지우지 않는다.
- 건드리지 않음: 결제·이용권·인증·DB·운세 계산 로직, 메인 디자인·캐릭터, `public/_worker.js` 동작, `.github/workflows/*`. LLM 실호출 없음.
- 금지: 새 FAQPage·HowTo, 허위 구조화 데이터, 클로킹.
- 색인 결정(index/follow, 사이트맵 포함, canonical)은 어느 URL에서도 바뀌지 않는다. 바뀌면 그 태스크를 멈추고 원인을 적는다.
- hreflang 코드(판단 8): ko, en, ja, zh-CN(+별칭 zh, zh-Hans), zh-TW(+별칭 zh-Hant), x-default = 한국어 URL. `ko-KR`·`ja-JP`·`en-US`는 뺀다. 홈 묶음 ko·x-default는 `/ggulggul/` 유지.
- verify-dist 규칙을 `fail`로 올리는 것은 실제 build:cf dist 0건 확인 후. 00:10 KST 일일 발행을 막으면 안 된다.
- 겹치는 기존 검사는 지우지 않는다(CLAUDE.md:54).
- 페이지 소스나 공유 모듈을 바꾸면 `npm run sitemap:generate` 결과를 같은 커밋에 넣는다. 빌드 뒤 rss 변동은 `git checkout -- rss.xml insights/rss.xml public/rss.xml public/insights/rss.xml`.
- 새 package.json 스크립트는 ~:188에서 떨어진 곳에 둔다(함정 6).
- 태스크마다 `npm run check:fast` → `git status`·`git diff --stat` → 커밋. 커밋 끝줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. push·배포는 묶음 승인 때만.
- 증거 파일은 `D:\Development\seo-audit\code-destiny-20261101\bundle-3\`(저장소 밖). 기준 빌드 `build-before.log`, `verify-dist-before.json`은 이미 있다.

## 설계에서 구체화한 판단

- **robots.txt 원장은 `lib/seo/robots-policy.mjs`로 이미 있다**(묶음 ①). `app/robots.ts`는 그대로 두고, `index-policy.mjs`가 그 상수를 재내보내 import 창구를 하나로 만든다.
- **원장은 지금 목록을 바꾸지 않고 옮긴다.** `siteSeo.ts`의 `noindexPathPrefixes`(메타 noindex, `/flower` 없음 — 공유 버튼 때문)와 `generate-sitemap.mjs`의 `noindexPathPrefixes`·`privateRoutePatterns`·`excludedExactSitemapPaths`는 뜻이 다르다. 원장의 항목 하나가 `{ path, match, meta, sitemap, private }`를 갖고, 기존 목록은 원장에서 파생한다. 파생 결과가 지금 배열과 순서까지 같다는 테스트로 고정한다.
- **robots 계열 meta 1개**: `googleBot` 키를 지우고 그 지시(max-image-preview 등)는 `robots`에 합친다. 구글은 `robots` meta의 같은 지시를 읽는다. 상수는 `ROBOTS_META.INDEX`·`NOINDEX_FOLLOW`·`NOINDEX`(Next `Metadata["robots"]` 모양).
- **`alternatesFor`는 형제 지도를 받는다.** 형제 URL은 호출 쪽(라우트 지도, 기간·띠 경로)이 이미 안다. 함수는 원장으로 색인 불가 형제를 빼고, 남은 언어가 2개 미만이면 빈 배열을 낸다. 한국어 형제가 없으면 x-default도 없다.
- **SeoJsonLd.jsx는 지우지 않는다.** `scripts/verify-seo-entity-registry.mjs:96`이 소스를 읽어 참조가 0이 아니다(판단 5). 후속으로 보고한다. `app/HomeRedirectToStatic.tsx`는 이미 없다.

## Review Focus

1. 원장 접두사 매칭이 이웃을 삼키면 안 된다(`/premium` 이 `/premium-reports` 를, `/my` 가 `/mythology` 를) → Task 2 `prefix boundary` 테스트.
2. 끝 슬래시·쿼리·`//`가 섞인 경로도 같은 판정을 받아야 한다(`/checkout`, `/checkout/`, `/checkout/?x=1`) → Task 2 `normalizes` 테스트.
3. 형제 중 noindex인 로케일(예: 일시중지 경로의 `/en/…`)은 hreflang에서 빠져야 하고 HTML과 사이트맵이 똑같이 빼야 한다 → Task 5 `drops noindex sibling` 테스트, Task 8 dist 비교.
4. `zh` 키와 `zh-TW` 키를 섞어 쓰는 기존 지도(`zh-tw` 소문자 경로 포함)가 같은 코드로 나와야 한다 → Task 5 `zh-tw key forms` 테스트.
5. noindex 페이지가 `googleBot` 제거 뒤 `index`로 풀리면 안 된다 → Task 4 스냅숏 diff 0.

---

### Task 1: 색인 상태 스냅숏 도구

**Files:**
- Create: `scripts/seo/index-state.mjs`
- Test: `scripts/seo/index-state.test.mjs`

**Interfaces:**
- Consumes: `scripts/seo/health-policy.mjs`의 `getCanonical`, `hasNoindex`, `parseHeaderRobotsRules`, `readSitemapAlternates`(실제 이름은 파일에서 확인)
- Produces: `collectIndexState(distDir: string): Array<{ path: string, robots: string[], indexable: boolean, follow: boolean, headerRobots: string|null, canonical: string|null, inSitemap: boolean }>`(path 정렬), CLI `node scripts/seo/index-state.mjs --dist=dist --json=<경로>`, `diffIndexState(before, after): string[]`(index/follow/headerRobots/canonical/inSitemap 중 하나라도 다르면 `"<path> <필드> <전>→<후>"`)

- [ ] **Step 1:** 테스트 — 임시 dist 픽스처(index 페이지 1, `noindex, follow` 페이지 1, googlebot meta만 다른 페이지 1, `_headers` X-Robots-Tag 1, sitemap 1)로 `collectIndexState` 결과와 `diffIndexState`가 robots 문자열 순서·대소문자 차이를 무시하고 index/follow 판정 차이만 내는지 단언한다. `robots`에는 `robots`·`googlebot` 이름의 meta 내용을 모두 담는다.
- [ ] **Step 2:** `node --test scripts/seo/index-state.test.mjs` → FAIL.
- [ ] **Step 3:** 구현. `indexable` = robots·googlebot·헤더 어디에도 noindex 없음.
- [ ] **Step 4:** 테스트 PASS. 기준 dist(소스 변경 전 빌드)에서 `--json=D:\Development\seo-audit\code-destiny-20261101\bundle-3\index-state-before.json`을 만든다. 기준 dist가 이미 다른 빌드로 덮였으면 `git stash` 없이 Task 1 커밋 상태에서 `npm run build:cf`를 다시 돌린다.
- [ ] **Step 5:** check:fast → 커밋 `test(seo): snapshot index state of dist pages`

### Task 2: 원장 `lib/seo/index-policy.mjs`

**Files:**
- Create: `lib/seo/index-policy.mjs`
- Test: `__tests__/ui/index-policy.test.mjs`

**Interfaces:**
- Produces:
  - `INDEX_POLICY: ReadonlyArray<{ path: string, match: "prefix"|"exact"|"pattern", meta: "noindex"|null, sitemap: boolean, private: boolean, note?: string }>`
  - `ROBOTS_META: { INDEX, NOINDEX_FOLLOW, NOINDEX }` (Next robots 객체. INDEX = `{ index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 }`, 나머지 둘은 index:false + follow true/false. 값은 지금 `googleBot`·`robots` 객체에서 가장 많이 쓰는 형태를 따른다)
  - `META_NOINDEX_PREFIXES: readonly string[]` — `lib/seo/siteSeo.ts`의 지금 `noindexPathPrefixes`와 순서까지 같다
  - `SITEMAP_NOINDEX_PREFIXES: readonly string[]`, `SITEMAP_PRIVATE_ROUTE_PATTERNS: readonly RegExp[]`, `SITEMAP_EXCLUDED_EXACT_PATHS: ReadonlySet<string>` — `scripts/generate-sitemap.mjs`의 지금 값과 같다
  - `normalizePolicyPath(pathOrUrl: string): string`(siteSeo `normalizeSeoPath`와 같은 규칙), `isMetaNoindexPath(p): boolean`, `isSitemapExcludedPath(p): boolean`, `isIndexablePath(p): boolean`(= !isMetaNoindexPath && !isSitemapExcludedPath)
  - 재내보내기: `robots-policy.mjs`의 `PRIVATE_DISALLOW_RULES`, `buildRobotsRules`

- [ ] **Step 1:** 테스트 — (a) 파생 배열이 지금 두 파일의 리터럴과 deepEqual(테스트에 현재 리터럴을 복사해 고정), (b) `prefix boundary`: `/premium-reports`는 `/premium` 항목이 아니라 자기 항목으로만 걸리고 `/mythology`·`/mypage`는 `/my`에 걸리지 않는다, (c) `normalizes`: `/checkout`, `/checkout/`, `/checkout/?x=1`, `https://code-destiny.com//checkout/` 판정이 같다, (d) `/flower`는 meta noindex 아님·사이트맵 제외.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현. 각 기존 주석의 사유(🔴 포함)는 해당 항목의 `note` 또는 원장 주석으로 옮긴다.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** check:fast → 커밋 `feat(seo): add index policy ledger`

### Task 3: 원장 import로 바꾸기

**Files:**
- Modify: `lib/seo/siteSeo.ts`(`noindexPathPrefixes`, `isNoindexPath`), `scripts/generate-sitemap.mjs`(`excludedExactSitemapPaths`, `noindexPathPrefixes`, `privateRoutePatterns`, 죽은 `coreRoutes`가 있으면 그 블록), `scripts/static-canonical-route-map.mjs`, `scripts/lib/static-shell-route-meta.mjs`(robots 문자열), `scripts/verify-adsense-readiness.mjs`(`privateNoindexRoutes`, `xRobotsNoindexHeaderPatterns`, `sitemapForbiddenPrefixes` 중 원장과 뜻이 같은 것만), `scripts/generate-llms-txt.mjs`(색인 판정)
- Test: 기존 테스트 + `__tests__/ui/index-policy.test.mjs`에 importer 1건씩 단언

**Interfaces:** Consumes Task 2 전부. `siteSeo.ts`는 `noindexPathPrefixes`·`isNoindexPath` 이름을 계속 내보낸다(호출처 유지).

- [ ] **Step 1:** 테스트 — `siteSeo.noindexPathPrefixes === META_NOINDEX_PREFIXES` 내용 동일, generate-sitemap이 원장 상수를 쓰는지(소스 import 문 단언 또는 내보낸 함수 비교), adsense 검사기가 원장에서 파생한 목록을 쓰는지.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 바꾼다. 뜻이 다른 목록(광고 불가 유료 경로 등)은 그대로 두고 원장 주석에 "원장 밖, 이유"를 남긴다. `.ts`에서 `.mjs` import가 되는지 `lib/brand/brand-facts.mjs` 사용처와 같은 방식으로 한다.
- [ ] **Step 4:** `npm run sitemap:generate` 후 `git diff --stat config/ public/sitemap*` 가 lastmod 외 URL 변화 0인지 본다. `node --test __tests__/ui/index-policy.test.mjs __tests__/ui/sitemap-canonical.test.mjs`, `node scripts/verify-adsense-readiness.mjs`, `node scripts/generate-llms-txt.mjs --check` PASS.
- [ ] **Step 5:** check:fast → 커밋 `refactor(seo): read index policy from the ledger`

### Task 4: robots 계열 meta 1개

**Files:**
- Modify: `googleBot` 키가 있는 약 40곳(`git grep -l googleBot -- app lib components`), `lib/seo.ts`, `lib/generate-page-metadata.ts`, `lib/seo/createI18nMetadata.ts`, `app/layout.js`
- Test: `__tests__/ui/index-policy.test.mjs`에 `no googleBot key` 소스 검사

**Interfaces:** Consumes `ROBOTS_META`.

- [ ] **Step 1:** 테스트 — `git grep`과 같은 소스 스캔으로 app·lib·components에 `googleBot` 키 0건.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 각 `robots`/`googleBot` 객체를 `ROBOTS_META.*`로 바꾼다. 페이지가 쓰던 index/follow 값은 그대로 둔다(noindex+nofollow 페이지는 NOINDEX).
- [ ] **Step 4:** `npm run build:cf` → `node scripts/seo/index-state.mjs --json=…\bundle-3\index-state-t4.json` → `diffIndexState(before, t4)` 0줄. 페이지당 robots 계열 meta 개수 최대 1(정적 셸 포함). 1이 아닌 쪽은 원인을 고친다(정적 셸 head의 중복 meta는 `static-shell-route-meta.mjs`에서).
- [ ] **Step 5:** sitemap:generate → check:fast → 커밋 `refactor(seo): emit one robots meta per page`

### Task 5: 로케일 데이터 `.mjs`와 `alternatesFor`

**Files:**
- Create: `lib/i18n/locale-data.mjs`(LOCALE_CONFIG의 `htmlLang`·`pathPrefix`·`ogLocale`·`hrefLang`·별칭, `I18N_ROUTE_MAP` 데이터, `SEO_INDEXABLE_LOCALES`), `lib/seo/hreflang.mjs`
- Modify: `lib/i18n/locales.ts`, `lib/i18n/routes.ts`(데이터를 import해 타입만 입힌다)
- Test: `__tests__/ui/hreflang.test.mjs`

**Interfaces:**
- Produces:
  - `HREFLANG_CODES = { ko: ["ko"], ja: ["ja"], en: ["en"], zh: ["zh-CN", "zh", "zh-Hans"], "zh-TW": ["zh-TW", "zh-Hant"] }`
  - `alternatesFor(routeByLocale: Partial<Record<"ko"|"ja"|"zh"|"zh-TW"|"en", string>>, options?: { isIndexable?: (path: string) => boolean }): Array<{ hreflang: string, href: string }>` — href는 운영 오리진 절대 URL + 끝 슬래시(파일 확장자 경로 제외). 순서: ko, ja, zh 묶음, zh-TW 묶음, en, x-default. `isIndexable` 기본값은 `index-policy.mjs`의 `isIndexablePath`. 남은 언어 2개 미만이면 `[]`. ko가 있으면 x-default = ko href.
  - `toNextLanguages(list): Record<string, string>`
  - `localeSiblings(basePath: string, locales?: string[]): Record<locale, string>` — `/fortune/today` → `{ ko: "/fortune/today", ja: "/ja/fortune/today", zh: "/zh/…", "zh-TW": "/zh-tw/…", en: "/en/…" }`

- [ ] **Step 1:** 테스트 — 홈 지도(`I18N_ROUTE_MAP.home`)에서 x-default가 `https://code-destiny.com/ggulggul/`, `ko-KR`·`ja-JP`·`en-US` 없음, `drops noindex sibling`(isIndexable가 `/en/x`를 거부하면 en 코드가 빠진다), `zh-tw key forms`(키 `zh-TW`와 경로 `/zh-tw/…`가 `zh-TW`·`zh-Hant`로 나온다), 형제 1개면 `[]`, `locales.ts`·`routes.ts`의 내보낸 값이 전과 같다(별칭 필드는 제외).
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS + `npx tsc --noEmit -p .`(프로젝트에 typecheck 스크립트가 있으면 그것) 통과.
- [ ] **Step 5:** check:fast → 커밋 `feat(seo): single hreflang builder from shared locale data`

### Task 6: HTML 쪽 hreflang을 `alternatesFor`로

**Files:**
- Modify: `lib/seo.ts`(options.hreflang), `app/fortune/[period]/page.tsx`, `app/fortune/[period]/[sign]/page.tsx`, `lib/generate-page-metadata.ts`(languages 만드는 두 곳), `lib/seo/createI18nMetadata.ts`, `createHreflangFromRoutes` 사용처 5곳(`app/fortune-tea-house/page.tsx`, `app/insights/page.js`, `app/sukuyo-compatibility-ai/page.tsx`, `app/today/page.js`, `app/yeongnyangi/page.tsx`), `scripts/build-fortune-hub-shell.mjs`(hreflang 출력)
- Delete: `lib/seo/createHreflang.ts`(사용처 0 확인 후)
- Test: 기존 `flower-home-hreflang.test.mjs`, `verify:fortune-hub-shell`, `__tests__/ui/hreflang.test.mjs`에 fortune 기간 페이지 1건

**Interfaces:** Consumes `alternatesFor`, `toNextLanguages`, `localeSiblings`.

- [ ] **Step 1:** 테스트 — 한국어 운세 기간·띠 페이지 메타의 languages에 x-default가 있다(감사의 100쪽 원인).
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 바꾼다. `index.html`의 hreflang 블록은 고치지 않는다.
- [ ] **Step 4:** `git grep -n "createHreflang\|ko-KR\|ja-JP\|en-US" -- app lib scripts`에서 hreflang 용도 0. 관련 테스트 PASS.
- [ ] **Step 5:** sitemap:generate → check:fast → 커밋 `refactor(seo): build html hreflang with alternatesFor`

### Task 7: 사이트맵 쪽 hreflang을 `alternatesFor`로

**Files:**
- Modify: `scripts/generate-sitemap.mjs`(i18n 그룹 `buildI18nAlternates`·`localeHreflangAliases`, 운세 `hreflang(base)`, INTRO·TRUST 묶음), `/fortune/`에 alternates 추가
- Test: `__tests__/ui/sitemap-canonical.test.mjs`에 `/fortune/` alternates 1건, x-default 1개 단언

- [ ] **Step 1:** 테스트 — 생성된 사이트맵에서 `/fortune/` 항목에 alternates, 모든 항목의 x-default 개수 ≤ 1, `ko-kr` 없음.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 바꾼다.
- [ ] **Step 4:** `npm run sitemap:generate`, 사이트맵 URL 집합은 전과 같고(alternates만 변화) 테스트 PASS.
- [ ] **Step 5:** check:fast → 커밋 `refactor(seo): build sitemap hreflang with alternatesFor`

### Task 8: verify-dist 규칙 — 원장 대조, robots meta 1개, hreflang

**Files:**
- Modify: `scripts/seo/verify-dist.mjs`, `scripts/seo/health-policy.mjs`(필요 시 파서)
- Test: `__tests__/ui/sitemap-canonical.test.mjs`(정상 1, 위반 픽스처 1씩 — 묶음 ① 방식)

**Interfaces:** 새 규칙 이름 `robots-meta-count`, `index-ledger`, `hreflang-reciprocal`. `hreflang-sitemap`은 유지.

- [ ] **Step 1:** 위반 픽스처 테스트 — robots+googlebot 두 meta, 원장 meta noindex인데 index인 페이지, `_headers` X-Robots-Tag noindex 경로가 원장에서 색인 대상, `_worker.js` 일시중지 목록 경로가 원장에서 색인 대상, A→B만 있고 B→A 없는 hreflang, x-default 2개.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현. 새 규칙은 `warn`으로 넣는다.
- [ ] **Step 4:** `npm run build:cf` → `node scripts/seo/verify-dist.mjs --json=…\bundle-3\verify-dist-after.json`. 네 규칙(`robots-meta-count`, `index-ledger`, `hreflang-sitemap`, `hreflang-reciprocal`)이 0이면 `fail`로 올린다. 0이 아니면 원인을 고치고(Task 4~7 몫이면 거기서), 끝내 남는 것은 warn으로 두고 승인 패킷에 적는다.
- [ ] **Step 5:** check:fast → 커밋 `test(seo): gate ledger and hreflang invariants in verify-dist`

### Task 9: 안 쓰는 코드 정리(판단 5)

**Files:**
- Delete/Modify(각각 `git grep` 0건 확인 뒤): `lib/indexnow.ts`의 `submitIndexNowUrls`, `lib/seo-site-urls.ts`의 `getAllSitemapUrls`(+ `scripts/indexnow-submit.mjs` 주석 정리), `lib/seo-metadata.ts`의 중복(`SEO_CORE_KEYWORDS = []`, `toAbsoluteUrl`), 고아 스크립트 `seo-build-inventory`·`seo-search-inventory`·`seo-locale-browser-check`·`seo-search-browser-check`(npm 스크립트·CI·import 0건일 때만)
- Keep: `app/components/SeoJsonLd.jsx`(검사기가 읽음)

- [ ] **Step 1:** 항목마다 `git grep -n <이름> -- . ':!docs'` 결과를 증거 폴더 `dead-code-grep.txt`에 남긴다.
- [ ] **Step 2:** 0건인 것만 지운다.
- [ ] **Step 3:** check:fast, `npx tsc --noEmit` 통과.
- [ ] **Step 4:** 커밋 `chore(seo): remove unreferenced seo helpers and scripts`

### Task 10: 묶음 증거와 승인 패킷

- [ ] **Step 1:** `npm run build:cf` → verify-dist after JSON, index-state after JSON, `diffIndexState(before, after)` 0줄, verify-dist 전후 표(규칙 × 개수).
- [ ] **Step 2:** 회귀 묶음(설계 '회귀 묶음'): `test:worker:auth-payments`, `smoke:core`, `verify:portone-single-payment`, `paypal-ui.test.js`, 라이브러리 테스트, `core-landing-calculation-examples.test.mjs`, `verify:fortune-period-axis`, `verify:fortune-freshness`, `deploy:critical`, `verify:ads-txt` + `npm run check:pre-push`. 로그는 `bundle-3\regression\`.
- [ ] **Step 3:** `bundle-3\approval-packet.md`: 바뀌는 신호(hreflang 코드·x-default·`/fortune/` alternates, googlebot meta 제거), 바뀌지 않는 것(색인 상태 diff 0), 운영 `/version.json` SHA 기준 `git log <운영 SHA>..HEAD`, 롤백 SHA, 받을 승인(main push + 운영 dispatch 1회).
- [ ] **Step 4:** 인수인계 문서 갱신·커밋. push는 하지 않는다.
