# SEO 렌더 감사 — 남은 작업 인수인계 (2026-08-27)

> **이 문서만 읽고 이어서 작업할 수 있게 쓴다.** 모든 수치는 실측이고 재현 명령을 함께 남긴다.
> 선행 문서: [seo-render-audit-2026-08-27.md](seo-render-audit-2026-08-27.md) (1차 감사 + 2차 세션 §10)
> 이 문서는 **PR #1184 · #1186 이후 남은 것**만 다룬다.

---

## 왜 하는 작업인가

사용자 요구 원문(2026-08-27, 순서대로):

> `docs/handoff/seo-render-audit-2026-08-27.md` 읽고 나머지 seo 최적화 작업 진행해
> / `#1186에 충돌이있으니 해소해`
> / `#1186가 여전히 충돌이고 해소하고 머지후 남은 작업 인수인계 문서 만들어`
> / `PR #1189 머지했으니 실측해줘`
> / `docs/handoff/seo-followups-2026-08-27.md 그 다음 인수인계 작업 진행해`

즉 **렌더 실측 SEO 감사(#1184)가 남긴 후속 항목을 순서대로 닫는 작업**이다. 각 항목은
"결정이 필요한 것"과 "결정 없이 바로 할 수 있는 것"이 섞여 있어서, **결정이 필요한 것은
사용자에게 물어보고 진행**해 왔다(아래 §0 표의 ✅ 항목은 전부 그렇게 처리됐다).

🔴 **다음 세션이 다시 하면 안 되는 것** — 아래 PR 들은 이미 나갔다.

| PR | 내용 | 상태 |
|---|---|---|
| #1184 | 렌더 감사 도구 + 상속 canonical 55건 | **머지됨** |
| #1186 | 제목 표시 폭 125 → 0, `/static` 이중 신호, `/destiny-poker` 위양성 | **머지됨** (`1b4700c5`) |
| #1189 | 이 인수인계 문서 신규 | **머지됨** |
| #1191 | 설명 표시 폭 183 → 0 (§1) | 🔴 **CI 8/8 통과 · MERGEABLE — 사용자 머지 대기** |

🔴 **프로덕션 승격은 아직 안 됐다.** 머지는 스테이징(`staging.code-destiny.com`)까지만 자동으로
간다. 2026-08-27 실측: 스테이징은 새 제목을 서빙하는데 프로덕션은 옛 제목이다.
승격은 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` 이고,
**그때 한 번의 명시적 허락이 있어야 실행한다**(CLAUDE.md 절대 규칙 3).

---

## 0. 지금까지 닫힌 것 / 열려 있는 것

| 항목 | 상태 | 근거 |
|---|---|---|
| 상속된 홈 canonical 55건 | ✅ #1184 | `verifyNoInheritedHomeCanonical` 가 막는다 |
| `/static/geomancy-oracle-v4` 색인 노출 | ✅ #1184 | `_headers` X-Robots |
| 셸 사본 3개의 홈 hreflang | ✅ #1184 | `withoutHreflangLinks` |
| `/static` 의 noindex + 홈 canonical 병존 | ✅ #1186 | canonical 제거, 허용목록을 산출물별로 |
| `/destiny-poker` 인바운드 0 | ✅ #1186 | 감사 도구 위양성이었다(프로덕션 308 실측) |
| **제목 표시 폭 초과 125개** | ✅ #1186 | 125 → 0, `verifyIndexableTitleWidth` 가 막는다 |
| **설명 표시 폭 초과 183개** | ✅ PR #1191 | 183 → 0, `verifyIndexableDescriptionWidth` 가 막는다 |
| 아웃바운드 링크 0인 색인 대상 18개 | ❌ **§2** | UI 정책 결정 필요 |
| `/insights` HTML 1.83MB | ❌ **§3** | 리팩터링 설계 선행 |
| HTML 에 ETag/Last-Modified 없음 | ❌ **§4** | 배포 파이프라인 결정 |
| CWV·모바일 UX·검색 의도·네이버 | ❌ **§5** | 한 번도 재지 않았다 |

---

## 1. ✅ 설명(description) 표시 폭 — PR #1191 에서 183 → 0

### 1-1. 근본 원인은 측정축 + **생성기가 문구를 늘리고 있었다**

제목(#1186)과 같은 축 문제인데 생성기가 하나 더 얹혀 있었다.

| 위치 | 하던 일 |
|---|---|
| `seed-articles.js` `normalizeSeoDescription()` | 짧으면 일반 문장을 **덧붙여** 120~160**자**로 채우고 길면 160자로 자른다 |
| `[slug]/page.js` `articleDescription()` | 그 결과를 다시 `.slice(0, 160)` — 또 글자 수 |

실측: 씨드 기사 113개의 `seoDescription` 폭이 **전부 160 초과**(최소 204 · 중앙 266)였고,
렌더 결과에서 **설명이 정확히 160자인 페이지가 58개**였다(절단의 흔적).

### 1-2. 고친 것

| # | 파일 | 무엇을 |
|---|---|---|
| 1 | `lib/seo.ts` | `truncateToDisplayWidth()` 신규 + `buildSeoMetadata` 에 적용(43개 라우트 공통 진입점) |
| 2 | `lib/generate-page-metadata.ts` · `lib/seo/createI18nMetadata.ts` | 다시 구현하지 않고 위 함수를 부른다(라우트 11개) |
| 3 | `app/nakshatra/codex/[index]/page.tsx` | metadata 를 손으로 조립하므로 직접 부른다. 예전 `convergence.slice(0, 90)` 은 글자 수 절단이라 폭 207~242 였다 |
| 4 | `app/insights/seo-descriptions.js` **(신규)** | 기사 114개 문안 재작성(폭 ≤152 · 중앙 142). 기계가 덧붙이던 일반 문구 제거 |
| 5 | `lib/seo-landing-pages.js` | 랜딩 12개 재작성 — 공통 절단에 맡기면 문장이 중간에서 끊긴다 |
| 6 | 개별 라우트 13개 · `index.html`(`/`) · `sync-legacy-static-to-public.mjs`(`/en`) | `export const metadata` 를 직접 쓰는 것들 |
| 7 | `scripts/verify-adsense-readiness.mjs` | **`verifyIndexableDescriptionWidth` 신규** — 사이트맵 URL 전량, 손으로 든 목록 없음 |

### 1-3. 실측 (dist, 색인 388개)

| 항목 | 전 | 후 |
|---|---:|---:|
| 설명 표시 폭 중앙 / 최대 | 153 / 277 | **141 / 160** |
| 폭 160 초과 | 183 | **0** |
| 중복 설명 · 빈 설명 | 0 · 0 | 0 · 0 |

### 1-4. 🔴 남은 것 — 두 가지

**(a) 공통 절단이 만든 `…` 42개.** 전부 한계 안이지만 문장이 중간에서 끝난다. 선택된 안이
명시적으로 감수한 대가다. 27개는 템플릿인 `/nakshatra/codex/0~26` 이고, 나머지 15개는
`/stories/{ep-02,ep-08,prologue}` · `/fortune/{today,tomorrow}` · `/animal/mbti` ·
`/compare/fortune-apps` · `/dream/psycho` · `/insights/fusion` · `/ja/tokushoho` ·
`/psychotest` · `/refund-policy` · `/sukuyo/compatibility` · `/tarot/healing` · `/vedic/jyotish` 다.
손으로 쓰려면 문자열 15개를 각 파일에서 찾아 고치면 된다.

**(b) `normalizeSeoDescription()` 의 160**자** 천장은 그대로 뒀다.** 🔴 그 함수의 결과
(`seoDescription`)를 인사이트 허브 카드(`app/insights/page.js`·`InsightsCosmicClient.js`)가
**화면 문구로 읽는다** — 고치면 목록 UI 가 함께 바뀐다. 지금은 `<title>`/description 이 별도 표를
쓰므로 색인에는 영향이 없지만, 허브 카드에는 여전히 기계가 덧붙인 일반 문구가 남아 있다.
손대려면 그 UI 변경을 먼저 승인받을 것.

### 1-5. 이 작업에서 가드가 잡아낸 것

🔴 문구를 줄이면서 `/tarot/prompt-maker` 의 `의료·법률·투자` 와 `/yeon-star-hug` 의
`엔터테인먼트` 를 함께 날렸는데 `verifyPublicFeatureMetadataSource` 가 빌드를 세웠다.
**설명 문구를 줄일 때는 그 라우트가 필수 마커를 갖고 있는지 먼저 볼 것**
(`scripts/verify-adsense-readiness.mjs` 의 `routeMetadataChecks`, 현재 3개 파일).

## 2. 아웃바운드 내부 링크가 0인 색인 대상 18개

```
/life-book-ai /love-secret-ai /master-love-codex /naming-ai /neo-operation-room
/new-year-ai-consultation /oracle/rune /reviews /saju-guardian /saju/destiny-bias
/saju/destiny-meeting-place /saju/love-simulation /sukuyo-compatibility-ai
/tarot/prompt-maker /vedic-ai /yeon-star-hug /ziwei-ai /ziwei/chart
```

색인 대상의 **4.6%** 가 링크를 받기만 하고 내보내지 않는 막다른 길이다.

**이건 사고가 아니라 의도된 UI 결정의 부작용이다.** `docs/CURRENT_DEV_BASELINE.md` 의
"Working Rules" 4번이 **몰입형 React 운세 라우트는 공유 헤더·푸터·하단 네비를 렌더하지 않는다**
고 정하고 있다.

🔴 **먼저 정해야 할 것**: "몰입형 화면에도 최소한의 관련 링크 블록을 둘 것인가."
정하지 않고 링크를 넣으면 그 Working Rule 을 조용히 뒤집는 것이 된다. 사용자에게 물을 것.

넣기로 한다면 후보는 결과 화면 최하단의 "관련 운세" 3~4개 링크다(몰입 구간을 지난 뒤라
UX 훼손이 가장 작다). 넣지 않기로 한다면 **이 항목을 감사에서 영구 예외로 등재**하고
사유를 적어 다음 세션이 같은 판정을 다시 하지 않게 할 것.

---

## 3. `/insights` HTML 1.83 MB (크롤 예산 + 성능)

`app/insights/page.js` 의 `toClientInsightItem()` 이 **아티클 126개의 `body` 전문**을 클라이언트
컴포넌트로 넘긴다. RSC flight 페이로드가 HTML 에 그대로 실려 1.83MB 가 된다
(사이트 중앙값 93KB).

🔴 **단순히 빼면 기능이 죽는다** — `InsightsCosmicClient.js:199` 가 `stripHtml(item.body)` 로
**전문 검색**을 한다. 필요한 것은 사전 계산한 검색 인덱스(제목 + 요약 + 태그, 또는 축약 토큰)로
바꾸는 리팩터링이다. **설계가 선행돼야 하므로 별도 세션.**

측정: `node -e "console.log(require('fs').statSync('dist/insights/index.html').size)"`

---

## 4. HTML 에 ETag / Last-Modified 가 없다 (크롤 예산)

프로덕션 실측(2026-08-27, UA Googlebot):

```
GET https://code-destiny.com/saju/
→ 200 · cache-control: no-cache · cf-cache-status: DYNAMIC · etag 없음 · last-modified 없음
```

PR #673 의 `no-store → no-cache` 는 **적용돼 있다.** 문제는 대시보드 Cache Rules 가 아니라
`cf-cache-status: DYNAMIC` — HTML 이 Pages 정적 자산 핸들러가 아니라 **Worker 를 타고 나간다.**
Worker 응답에 ETag 가 없으니 304 재검증이 불가능하고, 크롤러는 재방문마다 전문을 다시 받는다.

고치려면 ① Worker 응답에 ETag/`If-None-Match` 처리를 넣거나 ② HTML 을 Pages 정적 자산 경로로
되돌린다. **배포 파이프라인에 닿는 변경이라 사용자 결정이 선행된다.**

---

## 5. 한 번도 재지 않은 영역

1차·2차 감사 모두 범위 밖이었다. **점수표에 숫자를 만들지 않았다.**

- Core Web Vitals(LCP/INP/CLS) 실측 — dist HTML 크기만 쟀다
- 모바일 UX
- 콘텐츠 품질·검색 의도 적합성(SERP 대조 없음)
- AI Overviews 노출
- 네이버 서치어드바이저 상태
- 전환율 — 다만 [conversion-bottleneck-is-audience-not-funnel] 대로 **병목은 전환율이 아니라
  모수**다. 전환 UI 과투자 금지.

---

## 6. 작업 순서 (추천)

1. **§2 몰입형 18개** — 결정만 받으면 구현은 작다. 넣지 않기로 해도 예외 등재는 할 것
2. §1-4 의 남은 두 갈래(`…` 15개 문안 · 허브 카드 문구) — 둘 다 작고 서로 독립이다
3. §3 `/insights` 1.83MB — 검색 인덱스 설계부터
4. §4 ETag — 배포 결정부터
5. §5 는 새 측정 세션

🔴 **1과 2는 서로 독립**이라 순서를 바꿔도 된다. 3·4 는 앞의 결정과 무관하게 언제든 시작 가능.

---

## 7. 🔴 이어받을 때 반드시 지킬 것

### 감사 도구

```bash
npm run build:cf
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap
# 리포트: seo-audit-report-out.json / .md (.gitignore 등재, 커밋하지 않는다)
```

- 🔴 **반드시 `SEO_AUDIT_OUT_DIR=dist`.** 기본값 `out/` 은 Next export 원본이지 배포 정본이 아니다.
  정적 셸 승격과 `locale-prerender` 가 dist 에만 적용된다.
- 현재 이슈 **0**. 새로 뜨는 것이 있으면 그게 회귀다.

### 빌드 산출물 취급

- 🔴 `npm run build:cf` 는 **추적 파일을 다시 쓴다.** `rss.xml`(루트·`public/`·`insights/`·
  `public/insights/`) 4개가 매번 갱신된다 — **범위 밖이면 `git checkout` 으로 되돌린다.**
- 반대로 `sync:public` 산출물(`public/**` 미러 13개)은 **반드시 커밋**한다.
- `.ignore` 가 내용 변화 없이 `M` 으로 뜨면 CRLF 정규화다 — `git checkout -- .ignore`.
- `verify:public-mirror-fresh` 가 `.ignore` 한 줄만 차이라고 하면 윈도우 헛실패다.

### 🔴 이 브랜치가 계속 충돌한 이유 — 생성 파일 경쟁

2026-08-27 에 한국 음양력 이관 PR 들(#1183 · #1185 · #1187, E1~E5 시리즈)이 연달아 머지되면서
`config/sitemap-lastmod.json` · `sitemap.xml` · `public/sitemap.xml` 이 매번 회전했다.
**#1186 은 이 때문에 두 번 CONFLICTING 이 됐다.** 소스 충돌은 0건이었다.

해소법 — 어느 쪽 해시도 고르지 말고 **재생성**한다:

```bash
git rebase origin/main
git checkout --theirs config/sitemap-lastmod.json   # 마커 제거용일 뿐
npm run sitemap:generate                            # 양쪽 소스가 다 있는 상태에서 재계산
npm run verify:sitemap-drift                        # "추적본이 재생성 결과와 일치" 확인
git add config/sitemap-lastmod.json sitemap.xml public/sitemap.xml
git rebase --continue
git push --force-with-lease
```

🔴 **라우트를 건드리는 SEO 작업은 이 시리즈가 끝난 뒤에 시작하거나, 브랜치를 짧게 유지할 것.**
E 시리즈 진행 상황은 [korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md).

### 함정 모음

- 🔴 **`__tests__/ui/svg-title-not-document-title.static.test.js` 는 `app/**` 소스에서 리터럴
  `<` + `title` + `>` 를 찾는다.** 주석에 그 표기를 써도 SVG title 회귀로 **오탐**된다.
  "문서 제목" 이라고 적을 것. 이 세션에서 한 번 걸렸다(가드는 건드리지 않았다).
- 🔴 **기사 레코드의 `metaTitle`/`seoTitle` 은 화면 문구이기도 하다** — 정규화를 거쳐
  `seed-articles.js` 의 `seoTitle` 이 되고, 인사이트 허브 카드
  (`app/insights/page.js`·`InsightsCosmicClient.js`)가 그 값을 렌더한다.
  head 메타만 바꾸고 싶으면 `app/insights/seo-titles.js` 처럼 **별도 표**를 쓸 것.
  🔴 설명(§1)도 같은 함정을 갖는다 — `seoDescription` 역시 목록 UI 가 읽는다.
- **셸(`index.html`) 문구를 고치면 diff 가 90줄로 부푼다** — 실제 변경은 4줄
  (title·og:title·twitter:title·JSON-LD name)이고 나머지는 `sync:public` 캐시버스트 회전이다.
- **로케일 홈 문서 제목은 `public/i18n/{locale}.json` 의 `shell.CODEDESTINY` 가 정한다.**
  `sync-legacy-static-to-public.mjs` 의 `LOCALE_SHELL_SEO.title` 은 og:title/twitter:title 전용이다
  (스크립트 555행 주석이 그렇게 적어 두었다). 색인 로케일은 `en`·`ja`·`zh`·`zh-tw` 4개뿐.
- **`/x.html` 링크는 Cloudflare Pages 가 308 로 `/x` 에 붙인다**(2026-08-27 프로덕션 실측).
  링크 그래프 판정에서 이 별칭을 접지 않으면 고아 위양성이 난다 — `seo-audit.mjs` 는 이제 접는다.

### 워크트리

- `node_modules` 심링크가 안 생길 수 있다. 빌드 전에 `ls -ld node_modules` 로 확인하고,
  없으면 `cmd /c mklink /J "<워크트리>\node_modules" "<저장소 루트>\node_modules"`.
  지울 때는 **링크부터 끊는다**(`cmd /c rmdir`).
- jest 는 `NODE_OPTIONS=--experimental-vm-modules npx --no-install jest` 로 돌린다.
- 🔴 이 환경에는 **`jq` 가 없다.** `gh pr checks` 를 jq 로 파싱하는 감시 스크립트는 조용히
  아무것도 안 한다(이 세션에서 CI 신호를 한 번 놓쳤다). 텍스트 출력을 grep 할 것.

---

## 8. 🔴 정본 예시 — 폭 문제를 고치는 표준 모양

새 라우트나 새 문구가 폭 한계를 넘으면 **아래 네 조각을 그대로 따라 한다.** 이미 두 번
(제목 #1186 · 설명 #1191) 같은 모양으로 처리했고, 세 번째도 같아야 한다.

**(1) 폭 계산은 한 곳에만 둔다** — `lib/seo.ts:42`(`SEO_DESCRIPTION_WIDTH_LIMIT`) ·
`lib/seo.ts:50`(`truncateToDisplayWidth`). 🔴 **다시 구현하지 말 것.**
`lib/generate-page-metadata.ts` 와 `lib/seo/createI18nMetadata.ts` 는 이 함수를 **부르기만** 한다.

**(2) 공통 진입점에서 자른다** — `lib/seo.ts:71` 에서 `buildSeoMetadata` 의 description 에 적용.
43개 라우트가 이 진입점을 공유하므로 개별 파일을 41곳 고칠 필요가 없었다.

**(3) 문구 품질이 필요한 곳만 별도 표** — `app/insights/seo-descriptions.js`(설명 114개) ·
`app/insights/seo-titles.js`(제목 104개). 소비는 `app/insights/[slug]/page.js:84`(설명) ·
`app/insights/[slug]/page.js:110`(제목)에서 `표 우선, 없으면 기존 동작` 한 줄이다.

🔴 **기사 레코드의 `metaTitle`/`seoTitle`/`seoDescription` 에 넣지 않는 이유** — 그 값들은
`seed-articles.js` 의 정규화를 거쳐 인사이트 허브 카드(`app/insights/page.js` ·
`InsightsCosmicClient.js`)의 **화면 문구로도** 쓰인다. 거기에 쓰면 목록 UI 까지 바뀐다.

**(4) 가드는 산출물에서 전수 발견한다** — `scripts/verify-adsense-readiness.mjs:1475`
(`EAST_ASIAN_WIDE`) · `:1477`(`serpTitleWidth`) · `:1491`(`verifyIndexableTitleWidth`) ·
`:1525`(`verifyIndexableDescriptionWidth`). 손으로 든 목록이 없고, `out/`·`dist/` 의 사이트맵
URL 전량(`/x.html` 단독 라우트 포함)을 훑으며, URL 이 0개여도 실패한다.
🔴 신규 `verify:*` npm 스크립트를 만들지 않는다 — `verify-guard-wiring` 이 배선을 요구하고
CI 게이트 추가는 사용자 승인 사항이다(`docs/CURRENT_DEV_BASELINE.md` §6). 이미 `build:cf` 가
부르는 이 파일 안에 판정을 하나 더 다는 것이 정본이다.
🔴 **가드를 넣었으면 반드시 음성 테스트를 한다** — dist 의 아무 페이지를 옛 값으로 되돌려 넣어
실패하는 것을 보고 복원한다. 검사 대상이 없어서 통과하는 가드는 가드가 아니다(CLAUDE.md 원칙 10).

🔴 **문구를 줄이기 전에 필수 마커부터 확인한다** —
`scripts/verify-adsense-readiness.mjs` 의 `routeMetadataChecks`(현재 3개 파일).
이번에 `의료·법률·투자`·`엔터테인먼트` 를 날려 빌드가 두 번 섰다.

---

## 9. 🔴 근거를 못 찾으면 추측하지 말고 물어라

이 레포에서 추측이 사고로 이어진 실제 이력이 있다.

- 이번 세션에서도 이 문서에 "`/nakshatra` 28개는 같은 템플릿에서 나온다"고 **추정으로** 적었는데,
  실제로는 `lib/seo-landing-pages.js` 의 개별 문안이었다. 열어 보고 나서야 알았다.
- "임포터 0" 은 죽었다는 증거가 아니다(`lib/payment/portone.ts`).
- "없다/영향 없다" 는 **전수 검색을 실제로 돌린 뒤에만** 쓰고 검색 범위를 함께 적는다.
  🔴 그 grep 은 반드시 `git grep` — 리포 루트 `.ignore` 가 `sync:public` 미러 172개를
  Grep/Glob 에서 빼므로 rg 로는 미러의 참조를 못 본다.

**정책·IA·UI 가 갈리는 지점은 임의로 고르지 말고 사용자에게 묻는다.** 지금 열려 있는 것 중
§2(몰입형 라우트 링크) · §4(ETag) · §1-4(b)(허브 카드 문구)가 전부 그런 항목이다.

---

## 10. 참고 문서

- [seo-render-audit-2026-08-27.md](seo-render-audit-2026-08-27.md) — 1차 감사 전문 + 2차 세션 §10
- [seo-content-expansion-roadmap.md](seo-content-expansion-roadmap.md) — §I 의 P1 미착수분,
  §2 의 무료→유료 CTA 공백 9곳(페이지별 사전 조사가 선행돼야 한다)
- [seo-indexing-2026-08-15.md](seo-indexing-2026-08-15.md) — §2 의 미해결 2건은 §4 가 답한다
- [korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md) — 충돌을 만든 E 시리즈
