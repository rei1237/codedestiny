---
status: active
updated: 2026-08-16
next: "§3 남은 것 — 비교 문서 `/compare/astrology-vs-myeongri` · `/compare/tarot-vs-saju`"
---

# SEO 작업 세션 인수인계 (2026-08-16)

> **이 문서만 읽고 시작할 수 있게 쓴다.** 수치는 전부 이 세션의 실측이고 재현 명령을 함께 남긴다.
>
> 이 세션은 `docs/handoff/locale-footer-hub-2026-08-16.md` §7 과
> `docs/handoff/seo-ai-and-content-opportunities-2026-08-16.md` 의 큐를 실행했다.
> **그 두 문서의 큐는 이제 대부분 비었다.** 남은 것은 §3 에 정리했다.

---

## 0. 30초 요약

| | |
|---|---|
| 머지됨 | #723 #724 #725 #726 #727 #728 #730 #735 (8건) |
| 머지 대기 | **#737** (브랜드 엔티티) — 이것만 확인하면 된다 |
| 사용자 결정 대기 | **GSC 데이터 1건** (아래 §3-1) |
| 바로 착수 가능 | §5-5 WebPage 노드 · 비교 문서 3·4호 |

🔴 **가장 중요한 것 하나만 고른다면**: 이 세션에서 **가드 3개가 "초록불인데 아무것도 안 지키는" 상태**였음이 드러났다(§4). 새 작업을 하기 전에 §4 를 읽는 편이 좋다 — 같은 부류가 더 있을 가능성이 높다.

---

## 1. 이번 세션에 머지된 것

### #723 — 사이트맵 lastmod 콘텐츠 서명 원장
`scripts/lib/sitemap-lastmod.mjs` 신규 · `config/sitemap-lastmod.json` 원장.

- **문제**: `route.lastmod || today` 때문에 429개 중 **315개가 빌드마다 "오늘 수정됨"**
- **해법**: 라우트별 소스 서명(페이지 파일 + **전이 import 그래프**). 서명이 같으면 저장된 날짜 유지
- **churn 315줄 → 2줄**. `build:cf` 2회 연속 → 사이트맵·원장 byte-identical
- 🔴 **캐시키 정규화가 결정적이다.** `sync:public`(build-cf-main :25)이 `sitemap:generate`(:26) **앞**에서 `index.html` 의 `?v=` 토큰 87개를 매 빌드 다시 쓴다. 정규화 없으면 셸 기반 라우트가 매번 갱신돼 **고친 것처럼 보이기만 한다**
- 🔴 페이지 파일만 해싱하면 껍데기다 — `app/saju/page.js` 는 16줄이고 본문은 `lib/seo-landing-pages.js` 에 있다
- `/fortune/**` 101개는 **의도적으로 계속 매일 오른다** — `buildWeekly`·`buildMonthly` 가 둘 다 `loadDailyPackage("today")` 를 부르므로 실제로 매일 바뀐다(정직한 신호)

### #724 · #726 — 내부 링크 후행 슬래시
`trailingSlash: true` 인데 링크에 슬래시가 없어 **모든 내부 링크가 308 을 한 번 탔다**.

- #724: `index.html` 163곳 · `SiteFooterHub` 48곳 · `siteFooterHubCopy.ts` 283곳
- #726: 평문 `<a>` · 객체 배열 · `fortune/index.html`
- 🔴 **`next/link` 는 렌더 시 슬래시를 자동으로 붙인다.** 소스에 `href="/contact"` 라도 산출물은 `href="/contact/"` 다. 그래서 **소스 측정은 무의미**하고 산출물을 재야 한다. 처음에 소스로 재서 "203곳 남음"이라고 잘못 보고했다 — **실제로는 32회**였다
- 최종: 산출물 693페이지 기준 **32회 → 2회**. 남은 2회는 **고치면 안 되는 것**(`/destiny-island` = `destiny-island.html` 실체, 슬래시 붙이면 404)
- 🔴 `/api/**` 는 제외 — OAuth 콜백에 슬래시 붙이면 로그인이 깨진다

### #725 — 로케일 프리픽스 301/404 제거
`__cdLocalePrefixMap` 이 `/ja-jp`·`/zh-cn`·`/en-us` 라는 **구 프리픽스**를 가리켰다.

| 언어 | 전 | 후 |
|---|---|---|
| ja·zh·en | `/ja-jp/insights/` → **301** | `/ja/insights/` 직행 |
| de·es·fr·hi·ms·nl | `/fr-fr/insights/` → 🔴 **404** | 한국어 `/insights/` |

- 404 쪽이 더 심각했다 — 그 6개는 **셸 언어 전환기(`data-lang`)가 실제 제공하는 값**이라 프랑스어를 고른 사용자가 없는 페이지로 갔다
- `isAppLocalized` 도 함께 좁혔다. 실측 결과 로케일 빌드가 있는 건 `/insights` 하나뿐 (`/olympus`·`/oracle/rune`·`/oracle/sikojen-povailu` 는 ja/zh/en 어디에도 산출물 없음)

### #727 — IndexNow 배선
- 🔴 **실행 경로가 0이었다** — `indexnow-submit.ts:3` 이 안내하는 `npm run seo:indexnow` 가 package.json 에 없었다
- 제출 소스를 `lib/seo-site-urls.ts`(경로 95개) → **`sitemap.xml`(429개)** 로. 그대로 배선했으면 사이트맵이 일부러 뺀 noindex URL 을 제출할 뻔했다
- **델타만** 제출(오늘 `lastmod`). #723 없이는 델타가 사실상 전량이라 스팸 취급된다
- 🔴 **실제 POST 는 아직 한 번도 하지 않았다.** 배포 워크플로가 `Verify deployed SHA` 뒤 `continue-on-error: true` 로 처음 쏜다

### #728 — llms.txt
- `lib/seo/entity-registry.mjs` 에서 **생성**한다(손으로 안 쓴다). `build-cf-main` 에 배선돼 드리프트가 구조적으로 불가능
- 🔴 가격을 적지 않는다(코인 노출 금지 + 낡은 가격은 없는 가격보다 나쁨). `/points` 로 링크도 안 한다(비색인 경로)
- 🔴 사이트맵에 넣지 않는다 — `verify-adsense-readiness` 가 HTML 산출물을 요구한다

### #730 — 체계 간 비교 문서 2개
`/compare/saju-vs-ziwei` · `/compare/sukuyo-vs-vedic`. 레시피는 `docs/handoff/system-comparison-docs-2026-08-16.md`.

### #735 — 저자 표기 + AI 크롤러 정책
- `Article.author` → `Person` **필명 "네오"**(운영자 결정). 🔴 **이름만** — 경력·자격·소개 없음. 신뢰 신호는 `isBasedOn` → `/methodology`
- AI 크롤러: 인용 봇 8종 명시 허용, 학습 전용 `CCBot` 차단. 동작은 안 바뀐다(원래 차단 0건) — **의도 기록**이 목적

---

## 2. 머지 대기 — #737

**브랜드/회사 엔티티 분리.** `WebSite.name` = **꿀꿀 운세**, `Organization.name` = **CODE DESTINY**.

- 기존에 같은 `@id` 에 이름이 **3개**였고 `app/layout.js` 에 그걸 설명하는 주석까지 있었다 → 레이아웃의 손글씨 `name` 을 **지워** 세 번째 값이 생길 자리를 없앴다
- 🔴 `siteSeo.siteName` 은 **제목 접미사용 표기**지 법인명이 아니다. 조직 노드 5곳이 그걸 빌려 쓰고 있었다
- 최종: `WebSite.name` 690 전부 단일 · `Organization.name` 1,199 전부 단일

---

## 3. 남은 것

### 3-1. 🔴 GSC 데이터 — 유일하게 사람이 필요한 것

**「크롤링됨 – 색인되지 않음」 사유별 분포**가 있어야 근중복 55개(17%) 처리를 판단할 수 있다.
`seo-indexing-2026-08-15.md` §1 부터 계속 대기 중이다.

🔴 **실데이터 없이 콘텐츠를 지우거나 noindex 로 돌리지 말 것** — 근거 없는 삭제는 절대규칙 6 위반이다.

대상(이미 근중복으로 지목됨): `nakshatra/codex` 토큰 72% 공유 · `famous-saju/category/*` 79% 공유 · `/flower/*` 390~441자.

### 3-2. §5-5 페이지 단위 WebPage 노드 (결정 불필요)

**실측: 171 / 695 페이지 보유** = **524개에 없다**(2026-08-16, #737 브랜치 빌드 기준).

```bash
node -e "const fs=require('fs'),p=require('path');const f=[];const w=d=>{for(const n of fs.readdirSync(d)){const q=p.join(d,n);const s=fs.statSync(q);if(s.isDirectory()){if(n==='_next')continue;w(q)}else if(n==='index.html')f.push(q)}};w('out');
console.log(f.filter(x=>fs.readFileSync(x,'utf8').includes('\"@type\":\"WebPage\"')).length,'/',f.length)"
```

🔴 **착수 전에 회귀 위험을 먼저 보고할 것**(원칙 7). `SeoLandingTemplate`·`buildFortuneJsonLd`·`I18nSeoPageTemplate` 이 이미 WebPage 를 만들고 있어, 공통 지점에 넣으면 **한 페이지에 WebPage 가 둘** 나갈 수 있다.
🔴 `app/layout.js:173` 주석 필독 — 예전에 여기에 WebPage 를 박아 **전 페이지가 "나는 홈페이지"라고 선언**한 사고가 있다.

### 3-3. 비교 문서 3·4호

`docs/handoff/system-comparison-docs-2026-08-16.md` 에 게이트 수치·레시피·용어 확인 절차가 있다.
남은 주제: `/compare/astrology-vs-myeongri` · `/compare/tarot-vs-saju`.

### 3-4. 코드로 못 푸는 것 (계속 열려 있음)

네이버 서치어드바이저 제출 · Bing Webmaster 등록 · 다음 검색등록 · 블로그 포스팅 · 커뮤니티 참여.
🔴 유료 백링크·링크 팜·자동 디렉터리 대량 제출은 **하지 않는다** — 운세는 스팸 감시가 강한 카테고리다.

---

## 4. 🔴 이 세션에서 드러난 가드 결함 — 다음 사람이 반드시 읽을 것

`docs/guard-integrity-2026-08-13.md` 의 G-1~G-8 과 **같은 부류가 3건 더** 나왔다.

### G-9. robots 가드 2개가 User-agent 그룹을 무시했다

`verify-sitemap-integrity` 와 `verify-adsense-readiness` **둘 다** robots.txt 를 평문으로 훑어,
파일 어디의 `Disallow:` 든 전역 규칙처럼 취급했다.

**증상**: AI 크롤러 정책으로 `User-agent: CCBot` + `Disallow: /` 를 넣자
- 전자 → 홈(`/`)이 "사이트맵에 있는 비공개 경로"로 잡힘
- 후자 → `blocks the entire site` 로 빌드 중단. 게다가 Googlebot 검사의 `[\s\S]*?` 가
  **그룹 경계를 넘어** CCBot 줄에 매치돼 오탐까지

**지금까지 무해했던 이유**: 모든 `Disallow` 가 `*` 와 `Mediapartners-Google` 아래에만 있었다.
**봇별 규칙이 처음 생긴 순간 둘 다 오작동했고 빌드가 두 번 멈췄다.**

→ `scripts/lib/robots-groups.mjs` 로 파싱을 공용화했다. 🔴 **세 번째 사본을 만들지 말 것.**

### G-10. 부정 단언이 슬래시 하나로 영원히 통과할 뻔했다

`verify-master-love-codex-flow.mjs` 가 `!includes('href="/destiny-compass"')` 로 검사했다.
슬래시를 붙이자 그 문자열이 영영 나타나지 않아 **빈 검사**가 됐다(통과하지만 아무것도 안 지킨다).

→ 슬래시 유무 양쪽을 보게 고쳤다. 🔴 **부정 단언은 대상 표기가 바뀌면 조용히 죽는다** — 링크·경로 표기를 바꿀 때 `doesNotMatch`·`!includes` 를 함께 찾을 것.

### G-11. 핸드오프가 나열한 파손처가 실제보다 적었다

`locale-footer-hub` §7-1 이 verify 스크립트 8개를 나열했지만 실제로는 **13개 + 테스트 4개**였다
(실측: `git diff --name-only 292aedfc8~3 292aedfc8 | grep -c 'scripts/verify-'` → 13).
`verify-adsense-readiness`(빌드 차단)와 `verify-astrology-ai-flow`(paid-gate 스위트가 잡음)가 빠져 있었다.

→ **하나씩 발견하지 말 것.** 바꾼 값 전체를 뽑아 `scripts/`·`__tests__/` 를 **전수 검색**하는 편이 빠르다:

```bash
# 예: 슬래시를 붙인 경로 전체를 590개 파일에서 역검색
node -e "/* 변경한 값 목록을 만들고 scripts·__tests__ 를 훑는다 */"
```

---

## 5. 작업 방식에서 반복해서 유효했던 것

- 🔴 **산출물을 재라, 소스를 재지 말라.** "203곳 남음"이 실제로는 32회였던 것, `Organization.name` 이중화가 소스 grep 으로는 안 보이고 693페이지 조사로만 드러난 것 둘 다 이 교훈이다
- 🔴 **가드가 실패하면 완화하지 말고 강화하라.** #737 에서 드리프트 테스트가 실패했을 때 정본을 보도록 바꾸고 조건을 2개 **추가**했다
- 🔴 **음성 테스트 없는 가드는 가드가 아니다.** 이 세션의 모든 신규/수정 가드는 "되돌리면 실패하는가"를 실제로 확인했다
- **결제 게이트는 로컬에서 미리 돌릴 수 있다** — `node scripts/run-paid-gate-suite.mjs --base origin/main` (49개, 약 80초). merge-base 재실행으로 귀책까지 가려 준다
- PR 이 `sitemap.xml`·`config/sitemap-lastmod.json` 을 건드리면 **main 병렬 분기 금지, 스택으로 쌓을 것**

---

## 6. 재현 명령 모음

```bash
# lastmod 원장이 도는지 (2회 연속 → diff 비어야 함)
npm run build:cf && npm run build:cf && git diff --stat sitemap.xml

# IndexNow 델타 (외부 호출 없음)
npm run seo:indexnow -- --dry-run

# 배선 가드
node scripts/verify-indexnow-wiring.mjs
npm run verify:guard-wiring

# 결제 게이트 49개
node scripts/run-paid-gate-suite.mjs --base origin/main

# 산출물에 남은 슬래시 없는 내부 링크 (api 제외)
# → /destiny-island 2회만 나와야 한다(의도적 제외)
```
