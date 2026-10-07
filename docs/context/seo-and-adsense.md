# SEO 콘텐츠 게이트 · AdSense · ads.txt

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## 신규 페이지/라우트 추가 시 SEO 콘텐츠 게이트 (배포 차단 주의)

`scripts/verify-adsense-readiness.mjs`는 `build:cf`의 `postbuild` 단계에서 `out/sitemap.xml`에 있는 모든 라우트의 **서버 렌더링된 텍스트 분량**을 검사해 미달 시 배포 자체를 실패시킨다. 카운트 방식(`getVisibleText`, 같은 파일 527번째 줄 부근)은 `<script>`/`<style>`/`<svg>`만 제거하고 나머지 모든 태그 텍스트를 그대로 합산하므로, **클라이언트 전용(`ssr:false`)으로 마운트되는 인터랙티브 도구는 텍스트로 잡히지 않는다** — 서버 컴포넌트에 실제 문단/리스트/FAQ 등 실질 콘텐츠가 있어야 한다.

- 라우트가 `app/components/adsense-route-policy.js`의 `canLoadAdsense()` 기준으로 광고 게재 가능(AdSense-eligible)이면: sitemap에 self-canonical로 반드시 포함되어야 하고(`verifyAdsenseEligibleRouteSitemapAlignment`), noindex/nofollow가 없어야 한다.
- 광고 게재 **불가능**하지만 sitemap에 색인 가능 상태로 남아있는 라우트(예: `/`, 로케일 인덱스 `/ja`, `/zh`, `/en` 및 그 하위, `/today`, `/manse`, `/oracle/*`, `/psychotest/*` 등 다수)는 `verifyBlockedIndexableSitemapRouteQuality`가 **최소 1800자**의 렌더링 텍스트를 요구한다(2026-07 기준 실측 임계값, 같은 파일 상단 `minimumBlockedIndexableVisibleTextLength` 상수 참고 — 값이 바뀔 수 있으니 코드에서 재확인할 것).
- 신규 유틸리티/허브형 페이지(도구 UI가 `dynamic(..., { ssr: false })`로 마운트되는 경우 특히), 신규 로케일(`/ja`, `/zh`, `/en`) 인덱스·소개 페이지를 추가할 때는 한두 줄짜리 intro만 넣지 말고, 실제 설명 문단·지원 항목 목록·FAQ 등 서버 렌더링되는 실질 콘텐츠를 함께 작성한다.
- 페이지 추가/사이트맵 변경 후에는 `npm run build:cf` 로 실제 빌드를 통과시켜 확인한다. 이 게이트는 `out/` 산출물을 읽으므로 빌드가 끝나야만 돈다(업로드 없이 빌드만 돌리면 된다).
  - **Windows 로컬 `next build` 는 완주된다**(예전 서술은 폐기 — `/_not-found` prerender 이슈는 `scripts/next-build-with-pages-manifest.mjs` 의 매니페스트 복구·스텁·taskkill 워치독·재시도가 해결했다). 로컬 빌드가 끝내 실패하면 GitHub Actions "Release Cloudflare Pages and Worker" 를 `mode: preview` 로 디스패치해 CI 에서 확인한다.

## AdSense 승인·검증·ads.txt (2026-07 감사)

- **ads.txt는 삭제 금지 파일**(레코드: `google.com, pub-9863227498729828, DIRECT, f08c47fec0942fa0`). 과거 대량 "sync local development state" 커밋(`2fbe1502`)이 실수로 지운 사건이 있어, `scripts/ensure-ads-txt.mjs`가 `prebuild:cf` 맨 앞에서 root·`public`의 ads.txt를 **자가치유**(누락·불일치 시 재기록)하고, `npm run verify:ads-txt`(= ensure `--check`)가 CI("Deploy Cloudflare Pages")와 postbuild(`verify-adsense-readiness`의 4위치 단언)에서 존재를 강제한다. git에서 지워져도 빌드 산출물엔 항상 존재한다. **root·public의 `ads.txt`를 지우지 말 것.**
- **`google-adsense-account` 검증 메타태그**(`ca-pub-9863227498729828`)는 소유권 확인용(광고 미서빙)이라 `app/layout.js`의 `metadata.other`와 **6개 정적 셸 `<head>` 전부**에 둔다. 광고 **서빙 코드**(`adsbygoogle.js`/`<ins class=adsbygoogle>`/`adsbygoogle.push`)만 `app/components/DeferredAdsense.tsx`로 중앙화 강제된다 — `verify-adsense-readiness.mjs`의 `embedsAdsenseCode()`가 검증 메타태그(HTML `<meta>` + layout JS 선언)를 걷어낸 뒤에만 광고코드를 검사하므로, 검증 메타태그는 어느 페이지·셸에 있어도 게이트를 통과한다(다른 파일에 실제 광고코드를 넣으면 게이트가 여전히 막는다).
- **브랜드 대표 URL은 꿀꿀 운세 `/ggulggul/`, 영냥이 `/yeongnyangi/` 두 개다**(2026-10-02). 운영 `/`는 `public/_worker.js`가 쿼리를 유지해 `/ggulggul/`로 **301** 하고 sitemap 에 넣지 않는다. `app/page.js`(canonical `/ggulggul/`)는 폴백이다. `/yeongnyangi/`는 서버 렌더 안내(`YeongnyangiGuide`, 가격은 결제 카탈로그에서 빌드 시 읽음)로 색인 대상이 됐다(그 전엔 noindex). "사주 보는 고양이"·"사주보는고양이" 질의는 이 페이지가 받는다. 아래 설명의 "홈 `/`"은 이 폴백 페이지를 뜻한다. (이력: 2026-09-21 `3a9a0378d` 전환, 2026-09-24 정정 — 그 전에는 정적 셸 `index.html`의 승격본이었다.) `scripts/promote-static-shell-to-root.mjs`는 `public/`을 `dist/`에 복사한 뒤 셸 경로 6개(`ggulggul/`·`static/`·`en/`·`ja/`·`zh/`·`zh-tw/`)를 뺀 모든 라우트 HTML(루트 포함)을 Next 산출물로 되돌린다. 따라서 **홈 콘텐츠·메타는 `app/page.js`와 `app/yeongnyangi/_components/`에 둔다.** 운세 입문 콘텐츠 섹션(`.cd-home-guide`, theme-tokens `--cd-*` 사용)은 정적 셸 마크업(루트 `index.html`과 미러 전부, 2026-09-24 실측)에만 있고 React 홈에는 없어서, 지금은 `/`가 아니라 `/ggulggul/`·로케일 셸에서 보인다(숨김 금지). en/ja/zh 셸 현지화 콘텐츠는 후속 과제.

## 정적 셸 사본 라우트 — 2개만 남았다 (2026-08-23 확정)

`scripts/static-canonical-route-map.mjs` 의 `source: "static-shell"` 항목은 **루트
`index.html` 을 그대로 복사하고 `<head>` 만 갈아 끼운 SPA 딥링크**다. 홈 셸의 런타임
(`js/core/index-inline-runtime.js` 의 `__cdStaticCanonicalPathActions`)이 경로를 보고
모달을 연다. body 가 홈과 사실상 동일해 색인시키지 않는다.

- 남은 것은 **`/oracle/juyuk` · `/oracle/hwatu` 둘뿐**이다. app 페이지가 없어
  셸 사본이 곧 본문이라 고유 콘텐츠가 없다. `noindexPathPrefixes` · `public/_headers`
  · `verify-adsense-readiness` 의 X-Robots 단언 목록 세 곳이 함께 색인을 막는다.
- **이 둘의 title·description 을 검색 키워드용으로 고쳐도 효과가 없다.** 그 문구가
  실제로 쓰이는 곳은 브라우저 탭과 **소셜 공유 카드**다(공유 유입은 실재한다).
- `<head>` 교체 정본은 **`scripts/lib/static-shell-route-meta.mjs` 하나뿐**이다.
  예전에는 같은 함수가 `prepare-cloudflare-dist.mjs` 와 `promote-static-shell-to-root.mjs`
  에 복사돼 있었고 robots(`index` vs `noindex`)와 canonical 후행 슬래시가 서로 달랐다.
  🔴 **다시 각 스크립트에 복사해 넣지 말 것.**
- 이 결정을 지키는 가드: `__tests__/ui/static-shell-noindex.static.test.js`
  (`npm run test:node` 로 PR CI 에서 돈다). 대상은 `getStaticShellCanonicalRoutes()`
  에서 전수 발견하므로 셸 사본 라우트를 새로 추가하면 자동으로 검사에 걸린다.

### 🔴 2026-08-23: 셸 사본 9개를 걷고 app 랜딩을 살렸다

`/saju/basic` · `/saju/sibyl` · `/tarot/mingri` · `/tarot/love` · `/tarot/reunion` ·
`/tarot/self-esteem` · `/tarot/year` · `/astrology/cosmic` · `/oracle/sukuyo` 는
**이미 만들어진 app 랜딩 페이지가 있는데도 셸 사본이 postbuild 에서 그 산출물을
덮어쓰고 있었다.** 8개가 `FeatureLandingPage`(예: `/oracle/sukuyo` 559줄,
`/astrology/cosmic` 551줄), `/tarot/reunion` 은 `SeoLandingTemplate` 이다. 즉 사람이
쓴 고유 한국어 본문 수백 줄이 매 빌드 버려지고, 그 자리에 홈 사본이 noindex 로 나갔다.

`source` 를 `"app"` 으로 돌려 랜딩이 그대로 서빙되게 했다(`/ziwei/chart`·
`/life-book-ai` 가 이미 쓰던 기존 모드). 그리고 세 곳의 noindex 목록에서 뺐다 —
`generate-sitemap.mjs` 의 `noindexPathPrefixes`, `public/_headers` 의 X-Robots-Tag,
`verify-adsense-readiness.mjs` 의 `xRobotsNoindexHeaderPatterns`. 사이트맵 `coreRoutes`
에는 원래 있었으므로 접두사만 빼면 자동으로 색인 대상이 된다.

🔴 **바뀐 동작**: 예전에는 `/tarot/reunion` 을 열면 홈 셸이 뜨면서 모달이 바로 열렸다.
이제는 랜딩 페이지가 먼저 뜨고, 도구는 랜딩의 CTA(`/index.html?action=…`)로 연결된다
— `__cdGetRouteActionParam()` 이 `?action=` 을 경로 매핑보다 먼저 보므로 모달은 그대로
열린다. `/sukuyo`·`/ziwei`·`/vedic` 이 쓰는 것과 같은 패턴이고, 클릭이 한 번 는다.
이전 세션의 `_headers` 주석은 "셸 덮어쓰기를 제거하면 기능이 깨진다"고 적어 두었지만,
실제로 깨지는 것은 **URL 직행 자동 오픈**뿐이고 도구 자체는 CTA 로 도달한다. 유입을
위해 그 한 번의 클릭을 감수하기로 사용자가 결정했다(2026-08-23).

### 🔴 라우트의 색인 여부는 **다섯 곳**이 함께 정한다

한 곳만 고치면 "사이트맵에는 있는데 noindex" 같은 GSC 오류가 나고, 빌드가 그때서야
막힌다(실제로 이번 작업에서 네 곳만 고쳤다가 `verify-adsense-readiness` 가
`sitemap route has noindex robots: /astrology/cosmic` 으로 잡았다).

| # | 위치 | 무엇을 정하나 |
|---|---|---|
| 1 | `scripts/static-canonical-route-map.mjs` 의 `source` | 셸 사본으로 덮을지, app 페이지를 서빙할지 |
| 2 | `scripts/generate-sitemap.mjs` 의 `noindexPathPrefixes` | 사이트맵 포함 여부 |
| 3 | **`lib/seo/siteSeo.ts` 의 `noindexPathPrefixes`** | 페이지 메타의 robots (2번과 짝 — 양쪽 주석이 서로를 가리킨다) |
| 4 | `public/_headers` 의 `X-Robots-Tag` | HTTP 헤더 (규칙 예산 100개 상한) |
| 5 | `scripts/verify-adsense-readiness.mjs` 의 `xRobotsNoindexHeaderPatterns` | 4번이 실제로 걸려 있는지 강제하는 단언 |

🔴 **3번은 색인 말고도 딸린 게 있다.** `isNoindexPath` → `lib/seo.v2.ts` 의
`isPrivateRoute` → `lib/share.v2.ts` 로 흘러 **ShareWidget 표시 여부까지 좌우한다**
(`app/components/ShareWidget.tsx`). 같은 파일 주석이 `/flower/*` 를 "공유 버튼을
살리려고 일부러 이 목록에서 뺐다"고 적어 둔 이유가 그것이다. 위 9개도 이 목록에서
빠지면서 공유 버튼이 새로 노출된다 — 의도한 부수 효과이지 사고가 아니다.

## 2026-10-08 꿀꿀운세·내일 운세 개선

- 사용자 승인: 꿀꿀운세 브랜드(달콤한 위로·유익한 조언), 오늘 화면의 내일 기능, 다양한 내일 콘텐츠 및 성능 개선. 공식 블로그는 https://blog.naver.com/neosaju.
- 관측 정본: [SEO_STATE.json](../seo/SEO_STATE.json)의 naver20261008. 서치어드바이저 최근 **30일**(10/06 갱신)이며 28일 기준선으로 바꾸어 표기하지 않는다. 상위 30 URL 중 내일 상세 18개의 2,103클릭/484,641노출, CTR 0.434%는 부분집합이다. 순위 및 CTR 원인 미확인.
- 내일 계산: 기존 네 엔진을 수정하지 않고 today-hub 어댑터에 period=tomorrow를 전달한다. KST 날짜를 요청당 한 번 고정하고 공개 캐시 키에 기간·대상 날짜를 포함한다. 생년 입력은 private 캐시를 유지한다.
- 품질: 띠·별자리 허브에서 사주·숙요점·베다점·수비학의 서로 다른 관점과 준비 행동을 소개한다. 무료 일일 계산과 유료 상담을 구분하며 성공 보장·점수 합산을 하지 않는다.
- 성능 범위: 주간 화면은 선택할 때 마운트하고 전체 시스템을 포함하는 상세 요청은 진행 중 중복 호출하지 않는다. 홈 전체 CSS 지연 등 과거 기각 접근은 반복하지 않는다.
- 기존 URL·canonical·hreflang·noindex·sitemap 정책 및 10/03 상세 title 실험을 유지한다. RSS 두 경로가 이미 있어 새 피드를 만들지 않는다. 네이버 제출 변경·배포·결제/가입 계측은 이번 변경에 포함하지 않는다.

### 키워드 매핑 (2026-10-08 검색광고 도구 관측)

| 페이지 | 주 키워드 | 보조 키워드 | 주 키워드 월간 PC+모바일 |
|---|---|---|---:|
| /ggulggul/ | 꿀꿀운세 | 꿀꿀 운세, 코드데스티니 | 미확인 |
| /fortune/tomorrow/ | 내일운세 | 내일 띠별 운세, 내일 별자리 운세 | 21,260 |
| /today/ | 오늘의 운세 | 생년월일 일일 운세, 개인 일진 | 미확인 |
| /manse/ | 만세력 | 사주 원국, 일간 확인 | 140,300 |
| /saju/ | 무료사주 | 사주 풀이, 사주 시간 보정 | 30,770 |
| /ziwei/ | 자미두수 | 자미두수사이트, 무료자미두수 | 13,700 |
| /sukuyo/ | 숙요점 | 숙요점사이트, 본명숙 | 410 |

주 키워드의 중복 배정을 피한다. 검색량은 사이트 유입 예측값이 아니다. 재회·신년 키워드는 상품 URL 및 공개 일정 확정 후 배정한다.

### 검증·되돌리기·CTR 기록

관련 라우트 및 날짜 경계 mock 검사, 공개 캐시 격리 검사, check:fast와 main CI를 따른다. 되돌리기는 이 작업 커밋만 revert하고 다른 세션 작업을 보존한다. 기간 파라미터가 없는 기존 호출은 오늘로 유지된다. 변경 전후 메타는 같은 디렉터리 SEO_STATE.json에 기록한다. 운영 반영일은 배포 확인 후 기록하고 그때부터 최소 14일 관찰한다. 검색순위·기기·날짜 구간을 함께 비교하며 복합 변경의 결과를 title만의 효과로 해석하지 않는다.
