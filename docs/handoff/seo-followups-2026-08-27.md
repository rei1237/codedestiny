# SEO 렌더 감사 — 남은 작업 인수인계 (2026-08-27)

> **이 문서만 읽고 이어서 작업할 수 있게 쓴다.** 모든 수치는 실측이고 재현 명령을 함께 남긴다.
> 선행 문서: [seo-render-audit-2026-08-27.md](seo-render-audit-2026-08-27.md) (1차 감사 + 2차 세션 §10)
> 이 문서는 **PR #1184 · #1186 이후 남은 것**만 다룬다.

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
| **설명 표시 폭 초과 183개** | ❌ **§1** | 미착수 — 결정 먼저 |
| 아웃바운드 링크 0인 색인 대상 18개 | ❌ **§2** | UI 정책 결정 필요 |
| `/insights` HTML 1.83MB | ❌ **§3** | 리팩터링 설계 선행 |
| HTML 에 ETag/Last-Modified 없음 | ❌ **§4** | 배포 파이프라인 결정 |
| CWV·모바일 UX·검색 의도·네이버 | ❌ **§5** | 한 번도 재지 않았다 |

---

## 1. 🔴 설명(description) 표시 폭 — 183개 초과 (최우선)

### 1-1. 왜 이제야 보이나

제목과 **같은 측정축 오류**다. 1차 감사는 설명 길이를 **글자 수**로 쟀는데, Google 은
설명도 픽셀 폭(데스크톱 약 920px)으로 자른다. 한중일 글자는 라틴의 약 2배 폭이다.

| 측정축 | 160 초과 | "너무 짧다"(70 미만 / 폭 110 미만) |
|---|---:|---:|
| 글자 수 (1차 감사) | 4 | 79 |
| **표시 폭 (정정)** | **183** | 64 |

즉 1차 감사 §5-6 의 두 숫자는 **둘 다 뒤집힌다.** "70자 미만 79개" 는 폭으로 재면 대부분
정상 범위이고, 실제 문제는 반대쪽에 183개가 쌓여 있었다.

현재값(색인 388개): 폭 **중앙 153 · 최소 73 · 최대 277**.

### 1-2. 어디에 몰려 있나

```
/insights  114   (그중 기사 /insights/<slug> 가 114 중 대부분 — 기사 125개 중 114개가 초과)
/nakshatra  28   (28개 전부 초과. 최대 217)
나머지      41   (라우트당 1~3개씩 흩어져 있음)
```

재현:

```bash
npm run build:cf
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap
node -e "const r=require('./seo-audit-report-out.json');\
const W=/[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/;\
const w=s=>[...String(s)].reduce((n,c)=>n+(W.test(c)?2:1),0);\
const d=r.routes.filter(x=>x.shouldBeIndexed!==false&&x.metaDescription);\
console.log(d.filter(x=>w(x.metaDescription)>160).length)"
```

🔴 폭 정규식을 손으로 다시 쓰지 말 것 — 정본은 `scripts/verify-adsense-readiness.mjs` 의
`EAST_ASIAN_WIDE`·`serpTitleWidth` 다. 이 세션에서 CJK 통합 한자(U+4E00–U+9FFF)를 빠뜨린
범위를 한 번 썼고, 일본어 제목이 61 → 48 로 잘못 나왔다.

### 1-3. 🔴 결정이 먼저다 — 두 갈래

**기사 설명은 이미 잘리고 있다.** `app/insights/[slug]/page.js` 의 `articleDescription()` 이
`seoDescription → metaDescription → description → excerpt → subtitle` 순으로 고른 뒤
**`.slice(0, 160)`** 한다. 글자 수로 자르므로 한국어에서는 **잘린 뒤에도 폭 320** 이다.
실측: 설명이 정확히 160자인 페이지가 **58개** — 전부 이 절단의 흔적이다.

| 안 | 내용 | 비용 | 위험 |
|---|---|---|---|
| **A. 절단 기준을 폭으로 (추천)** | `.slice(0,160)` 을 "폭 160 에서 단어 경계 절단" 으로 교체 | 코드 1곳 + 가드 | 문장 중간에서 끊긴 설명이 그대로 남는다 — **잘림은 없어지지만 문장이 완결되지 않는다** |
| B. 제목처럼 별도 표 | `app/insights/seo-descriptions.js` 를 만들어 183개를 손으로 | 문안 183개 | 크지만 품질이 가장 좋다 |
| C. A + 초과분만 손으로 | 폭 절단으로 전부 안전권에 넣고, `/nakshatra` 28개처럼 뭉친 곳만 재작성 | 중간 | — |

**추천은 C** 다. A 만으로는 "잘린 문장" 이 남고, B 는 183개 문안이 필요하다. C 는 폭 절단으로
바닥을 깔고 뭉친 두 덩어리(`/insights` 기사·`/nakshatra`)만 손으로 정리한다.

🔴 어느 안이든 **`/nakshatra` 28개는 같은 템플릿에서 나온다** — 템플릿 한 곳을 고치면 28개가
함께 움직인다. 먼저 그 생성 지점을 찾을 것(`/nakshatra` 최대 217, 전수 초과).

### 1-4. 가드는 어디에 붙이나

제목과 **같은 자리**에 붙인다 — `scripts/verify-adsense-readiness.mjs` 안,
`verifyIndexableTitleWidth` 바로 옆. 신규 `verify:*` npm 스크립트를 만들면
`verify-guard-wiring` 이 배선을 요구하고 CI 게이트 추가는 사용자 승인 사항이다
(`docs/CURRENT_DEV_BASELINE.md` §6). 기존 가드에 판정을 하나 더 다는 것은 그 제약을 안 건드린다.

`getMetaContent(html, "description")` 이 이미 그 파일에 있다. 한계값은 **160**(제목 60 과 같은
근사 기준). 🔴 반드시 **음성 테스트**를 할 것 — dist 의 아무 페이지 설명을 길게 되돌려 넣어
실패하는지 보고 복원한다(대상이 없어서 통과하는 가드는 가드가 아니다).

---

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

1. **§1 설명 폭** — 결정(A/B/C) → 구현 → 가드 → 음성 테스트. 지금 가장 큰 단일 덩어리다
2. **§2 몰입형 18개** — 결정만 받으면 구현은 작다. 넣지 않기로 해도 예외 등재는 할 것
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

## 8. 참고 문서

- [seo-render-audit-2026-08-27.md](seo-render-audit-2026-08-27.md) — 1차 감사 전문 + 2차 세션 §10
- [seo-content-expansion-roadmap.md](seo-content-expansion-roadmap.md) — §I 의 P1 미착수분,
  §2 의 무료→유료 CTA 공백 9곳(페이지별 사전 조사가 선행돼야 한다)
- [seo-indexing-2026-08-15.md](seo-indexing-2026-08-15.md) — §2 의 미해결 2건은 §4 가 답한다
- [korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md) — 충돌을 만든 E 시리즈
