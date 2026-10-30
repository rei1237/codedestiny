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
- **대표 홈은 `/`(200·자기 canonical·사이트맵 포함), 꽃돼지 앱은 `/ggulggul/`, 영냥이 상담은 `/yeongnyangi/`다**(2026-10-18 승인 계획). 대표 홈의 원본은 `app/page.js`, 꽃돼지 정적 셸은 `index.html`이다. `/kkul-kkul-unse/`의 브랜드·이용 안내를 메인으로 흡수하고 301로 통합했다. 기능 쿼리·결제 복귀·기존 해시 링크는 앱으로 가는 기존 동작을 보존한다. 메인의 두 캐릭터 카드 아래에는 분야·고민·공개 결과 예시·체계 차이·FAQ를 서버 HTML로 제공한다. 대표 주소는 `lib/brand/brand-facts.mjs`와 `lib/seo/entity-registry.mjs`를 함께 확인한다. 과거 root301 서술을 현재 규칙으로 적용하지 않는다.

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

### 후속 승인: 운영 배포·측정 및 유명인·인사이트 노출

- 사용자가 최신 main의 상담 구매 간소화와 함께 운영 배포·측정, 유명인 사주·운세 인사이트 유입 최적화를 추가 승인했다. 실제 배포 SHA와 시각은 `docs/seo/SEO_STATE.json`의 후속 측정 기록으로 확정한다.
- 홈 생성 정본 `templates/home-funnel.html`에서 유명인 사주·인사이트 진입 링크를 접힌 더보기 밖에 둔다. 후속 이미지 UI 요청에 따라 기존 유명인·융합운세 일러스트를 재사용하는 편집형 카드로 표시한다. 960px 폭, 모바일 1열·데스크톱 2열, 이미지 고정 비율과 지연 로딩, 기존 색 토큰과 i18n을 적용하며 새 JS는 추가하지 않는다. 허브에서도 같은 유명인 삽화를 사용한다.
- `/insights/`에 `getCelebrityEditorial(...).reviewedAt`을 충족하는 원고만 가시 SSR 링크로 제공한다(현재 12건). 미검수 템플릿 noindex와 기존 sitemap 선별 규칙은 유지한다. 검수일·유명인 생시·조회수는 생성하거나 추정하지 않는다.
- 유명인 허브에서 사주 가이드·오늘/내일 운세·인사이트로 연결한다. URL과 결제 정책은 유지한다.
- 허브 title 변경: `/insights/`는 “운세 인사이트 허브 · 사주·타로·자미두수 | Code Destiny” → “운세 인사이트, 사주·타로 해석 가이드 | 꿀꿀운세”; `/insights/famous-saju/`는 “유명인 사주 분석 | 운세 인사이트 허브” → “유명인 사주 분석, 인물별 명식 풀이 | 꿀꿀운세”. description은 `app/insights/discovery-copy.mjs`에서 관리한다.
- 후속 CTR 집계에 인사이트·유명인 허브와 검수 상세를 별도 군으로 추가한다. 동시 변경이 있으므로 특정 제목의 단독 효과로 해석하지 않는다.
- 2026-10-08 서치어드바이저 재확인: 최근 업데이트 10/06, 최근 30일 PC+Mobile 상위 웹문서 27위 `/insights/famous-saju/iu/?v=086b7d63fd62`는 38클릭·1,844노출·표시 CTR 2.1%. 유명인 전체 합계가 아니며, `?v=` 주소 원문을 보존한 뒤 정규 URL 군으로 비교한다. 상위 30개 밖 글의 수치는 미확인이다.

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

### 메타 변경 전후 (2026-10-08 운영 반영)

| URL | 변경 전 title | 변경 후 title |
|---|---|---|
| /ggulggul/ | 꿀꿀운세 코드데스티니 \| 연이·네오와 상담 | 꿀꿀운세 \| 오늘·내일 운세와 사주 상담 |
| /saju/ | 사주·만세력 시간 보정 기준 \| 꿀꿀운세 | 사주·만세력 시간 보정 기준 \| 꿀꿀운세 |
| /ziwei/ | 자미두수 명반·12궁 보는 법 \| 꿀꿀운세 | 자미두수 명반·12궁 보는 법 \| 꿀꿀운세 |
| /sukuyo/ | 숙요점 본명숙·궁합 기준 \| 꿀꿀운세 | 숙요점 본명숙·궁합 기준 \| 꿀꿀운세 |
| /vedic/ | 베다점·나크샤트라 읽는 법 \| 꿀꿀운세 | 베다점·나크샤트라 읽는 법 \| 꿀꿀운세 |
| /astrology/ | 점성술 출생차트 읽는 법 \| 꿀꿀운세 | 점성술 출생차트 읽는 법 \| 꿀꿀운세 |
| /tarot/ | 타로·속마음·재회 질문 고르기 \| 꿀꿀운세 | 타로·속마음·재회 질문 고르기 \| 꿀꿀운세 |
| /today/ | 오늘의 운세 \| 생년월일 운세로 보는 오늘 재물운·연애운 | 오늘·내일 운세, 사주부터 숙요점까지 \| 꿀꿀운세 |
| /tarot/mindscan/ | 상대 마음 타로 무료 \| 마음 흐름과 관계 신호 읽기 | 상대 마음 타로·관계 신호 읽기 \| 꿀꿀운세 |

| URL | 변경 전 description | 변경 후 description |
|---|---|---|
| /ggulggul/ | 관계와 선택이 고민될 때 꿀꿀운세에서 상담을 시작해보세요. 연이의 다정한 해석과 네오의 현실적인 조언으로 다음 행동을 정리해요. | 꿀처럼 달콤하고, 일상에 꿀같이 유익한 꿀꿀운세. 오늘·내일의 흐름을 살피고 연이·네오와 관계와 선택의 고민을 정리해요. |
| /saju/ | 같은 생년월일인데 사주가 다른 이유를 꿀꿀운세에서 확인하세요. 절기·출생지·서머타임과 23시 경계의 계산 기준, 실제 어댑터로 대조한 입력 예시를 읽고 사주 풀이로 이어집니다. | 사주·만세력의 시간 보정 기준을 꿀꿀운세에서 확인하세요. 절기·출생지·23시 경계의 계산 예시로 같은 생년월일의 차이를 살펴봅니다. |
| /ziwei/ | 자미두수 명반을 어디부터 읽어야 할까요? 꿀꿀운세에서 명궁·신궁과 12궁의 역할, 별의 밝기와 삼방사정을 살펴보세요. 같은 출생정보의 사주와 비교해 서로 다른 해석 기준도 확인합니다. | 자미두수 명반의 명궁·신궁과 12궁을 꿀꿀운세에서 살펴보세요. 별의 밝기와 삼방사정을 읽고 같은 출생정보의 사주와 비교합니다. |
| /sukuyo/ | 숙요점 본명숙과 기본 성향을 꿀꿀운세에서 살펴보세요. 천문식 27숙과 음력 날짜표 방식의 차이를 확인하고, 본명숙 해설과 두 사람의 별도 유료 궁합 분석을 구분해 안내합니다. | 숙요점 본명숙과 기본 성향을 꿀꿀운세에서 살펴보세요. 천문식 27숙과 음력표의 차이, 본명숙 해설과 별도 유료 궁합의 범위를 안내합니다. |
| /vedic/ | 베다점의 라그나·라시·나크샤트라를 꿀꿀운세에서 구분해 보세요. 출생지와 시각을 입력하기 전에 확인할 조건, 숙요점·서양 점성술과 좌표계가 다른 이유를 안내합니다. | 베다점의 라그나·라시·나크샤트라를 꿀꿀운세에서 구분해 보세요. 출생지와 시각을 입력하기 전에 확인할 조건, 숙요점·서양 점성술과 좌표계가 다른 이유를 안내합니다. |
| /astrology/ | 태양 별자리만으로 알기 어려운 나의 출생차트를 꿀꿀운세에서 살펴보세요. 태양·달·상승궁과 하우스의 역할을 구분하고, 출생 시각이 불확실할 때 해석할 수 있는 범위를 안내합니다. | 점성술 출생차트를 꿀꿀운세에서 살펴보세요. 태양·달·상승궁과 하우스를 구분하고 출생 시각이 불확실할 때의 해석 범위를 안내합니다. |
| /tarot/ | 속마음·재회·선택 중 지금 궁금한 질문으로 꿀꿀운세 타로를 시작하세요. 카드의 상징과 상대에 대한 추측을 구분하고, 확인할 수 있는 행동과 대화의 선택지로 해석을 정리합니다. | 속마음·재회·선택 중 궁금한 질문으로 꿀꿀운세 타로를 시작하세요. 카드의 상징과 추측을 구분하고 실천할 행동과 대화를 정리합니다. |
| /today/ | 오늘의 운세를 생년월일 기준으로 확인해 보세요. 그날의 일진이 내 일간과 만나 어떤 십성을 끌어올리는지 보고, 오늘 힘을 쓸 곳과 하루 미뤄 둘 일을 나눠 드립니다. | 오늘·내일 운세를 꿀꿀운세에서 무료로 살펴보세요. 사주·숙요점·베다점·수비학의 흐름을 비교하고, 내일을 위해 준비할 작은 실천을 골라요. |
| /tarot/mindscan/ | 그 사람의 말과 행동, 왜 다를까? 보이는 신호와 내 추측을 나눠 읽고 확인할 질문을 정리하는 상대 마음 타로입니다. | 그 사람의 말과 행동, 왜 다를까? 보이는 신호와 내 추측을 나눠 읽고 확인할 질문을 정리하는 상대 마음 타로입니다. |


### 2026-10-08 운영 배포와 즉시 측정 완료

- 운영 SHA `f610e521f85377b0dfd1dc6bea7812fdd17070af`. [최종 CI](https://github.com/rei1237/codedestiny/actions/runs/37677389287), [스테이징](https://github.com/rei1237/codedestiny/actions/runs/37677453268), `npm run verify:release` 모두 통과 후 [운영 배포](https://github.com/rei1237/codedestiny/actions/runs/37680098001)를 **1회** 실행했다. Actions 성공 2026-10-08 05:26:44 KST, 운영 Pages·Worker SHA 일치 확인 05:27:56 KST. 재배포·롤백 실행 없음.
- 동시 main 변경을 통합하는 동안 영냥이 접근성 설명과 i18n 사전의 불일치 1건을 발견해 원본 템플릿을 사전 문구로 동기화했다. 대상 검사 4/4 및 최종 CI 통과. 다른 세션의 홈·상담 허브 UI도 함께 반영됐으므로 효과를 개별 변경에 귀속하지 않는다.
- Yeti User-Agent로 핵심 6페이지의 200·본문·메타·canonical 확인. 한국어 sitemap은 454 URL이며 대상 6개와 검수 유명인 상세 12개 모두 포함. 12개 상세 모두 200/index follow/정규 URL 일치. 이는 실제 네이버 로봇 방문·색인 확인이 아니다.
- 실제 운영 390/960px에서 오늘↔내일과 네 시스템 결과, 빠른 탭 전환 후 최종 선택, 이미지·콘텐츠 링크, 모바일 하단 내비를 확인했다. 기존 브라우저 프로필의 개인화 결과이며 익명 API 측정과 구분한다. 중복 요청 1회·지연 응답 정리는 앞선 로컬 mock 근거다. 실결제·로그인 수행·유료 LLM 호출 없음.
- Lighthouse 13.1.0, 동일 기기/프리셋, 매회 새 프로필, 모바일·데스크톱 각 3회. 초기 기준선은 로컬 검증과 겹쳐 원본을 보존하고, 추가 큰 로컬 검증과 겹치지 않은 `before-quiet`를 비교 기준으로 삼았다. 공유 기기 부하와 공용 네트워크/CDN은 완전히 통제하지 못했다. 아래는 **실험실 시뮬레이션** 중앙값(최소–최대)이며 실제 사용자 CWV가 아니다.

| URL | 기기 | LCP 초 전 → 후 | TBT ms 전 → 후 | CLS 전 → 후 | 점수 전 → 후 |
|---|---|---|---|---|---|
| /ggulggul/ | mobile | 11.90 (7.46–12.55) → 13.33 (13.07–13.49) | 1713 (727–1760) → 793 (576–844) | 0.0037 (0.0037–0.0037) → 0.0157 (0.0157–0.0157) | 32 (31–40) → 39 (37–43) |
| /ggulggul/ | desktop | 4.33 (4.10–4.57) → 4.46 (4.39–4.48) | 140 (79–150) → 33 (31–37) | 0.0059 (0.0059–0.0075) → 0.0006 (0.0006–0.0006) | 59 (59–64) → 63 (62–63) |
| /today/ | mobile | 12.14 (11.22–14.13) → 11.29 (11.25–11.79) | 320 (187–1911) → 150 (139–158) | 0.0012 (0.0012–0.0012) → 0.0012 (0.0012–0.0012) | 59 (39–63) → 63 (63–64) |
| /today/ | desktop | 3.65 (2.25–4.33) → 4.17 (3.72–4.66) | 150 (0–244) → 0 (0–0) | 0.0003 (0.0003–0.0035) → 0.0003 (0.0003–0.0003) | 73 (61–83) → 71 (69–71) |
| /fortune/tomorrow/ | mobile | 5.54 (4.92–5.70) → 4.19 (4.02–5.57) | 248 (221–484) → 178 (165–196) | 0.0001 (0.0001–0.0001) → 0.0001 (0.0001–0.0001) | 66 (59–68) → 75 (67–76) |
| /fortune/tomorrow/ | desktop | 2.27 (2.17–2.65) → 2.10 (1.99–2.17) | 3 (0–336) → 0 (0–0) | 0.0005 (0.0002–0.0022) → 0.0007 (0.0003–0.0025) | 80 (62–81) → 82 (81–82) |

- 공개 API는 준비 2회+측정 10회. 오늘 p50 300.3→301.8ms, p95 3106.2→965.7ms, 오류 전후 0/10. 신규 내일 p50 289.4ms/p95 292.0ms/오류 0/10. 기존 tomorrow 쿼리는 오늘을 반환했으므로 신규 기능 개선율은 계산하지 않는다. 운영 응답 날짜는 오늘 10/08·내일 10/09, 각 네 시스템을 확인했다.
- **남은 문제:** 홈 모바일 LCP 11.90→13.33초, 오늘 데스크톱 LCP 3.65→4.17초. 전체 성능 개선으로 결론 내리지 않는다. 홈의 큰 legacy DOM/CSS/JS 비용, 실사용자 지표와 변경 후 CTR은 후속 확인 대상이다. 최초 기준선과 각 회차 원본도 남겼다.
- CTR 자동화 `10-8-ctr-d-14-d-30` 활성: D+14 **10/22**, D+30 **11/07**, KST 10:40 확인. 측정일 전과 변화 없는 기간에는 알리지 않는다. 갱신 지연이면 완전한 배포 후 30일이 쌓일 때 다시 확인하며 저노출은 판단 유보. 홈·오늘·내일 허브/상세·인사이트·유명인 군을 분리한다. 최근 30일 기준선을 28일로 바꾸지 않으며 상세 title 기존 실험은 유지한다.
- 원시 수치·전후 메타·화면 근거: `D:/Development/code-destiny/output/release-20261008-measurement/release-results.md`, `comparison.json`, `visual/production-result.json`. 지속 기록은 [SEO_STATE.json](../seo/SEO_STATE.json)의 `naver20261008.releaseMeasurement`. 측정 자체의 API·결제 정책·DB 스키마 변경 없음.

## 2026-10-13 공식명 복원

공식 서비스명은 모든 언어에서 **꿀꿀 운세**다. **꿀꿀운세**는 띄어쓰기 없는 검색 변형이며 WebSite.alternateName에만 사용한다. Organization의 공개 name은 꿀꿀 운세, legalName은 기존 사업자 정보 정본으로 분리한다. 10/10 개명 지침은 아래 이력으로만 남기며 현재 명칭 기준으로 적용하지 않는다. 대표 URL·법적 상호·결제 정책은 유지한다. 진단과 검증 기록은 [브랜드 검색 정비](../seo/2026-10-13-ggulggul-brand-search.md)를 따른다.

## 2026-10-10 꿀꿀 사주 개명 (이력; 현재 지침 아님)

- 한국어 서비스 공식명은 **꿀꿀 사주**(별칭 꿀꿀사주)다. 꿀꿀 운세·꿀꿀운세는 옛 이름이다. WebSite.name·og:site_name·application-name·manifest·한국어 title 접미사가 모두 "꿀꿀 사주"이며, og:site_name과 WebSite.name은 전 로케일에서 같다. CODE DESTINY(Organization)·법적 상호·경로·저장 키는 바꾸지 않았다.
- 옛 이름은 `/kkul-kkul-unse/` 전환 안내와 alternateName에만 남긴다. 모든 title이나 푸터에 옛 이름을 나열하지 않는다. 의도적으로 남긴 곳과 이유, GSC·네이버 수동 작업, 관찰표는 [개명 문서](../seo/2026-10-10-ggulggul-saju-rename.md)가 정본이다.
- 10/08 제목 변경과 기간이 겹친다. CTR 자동화 D+14(10/22)·D+30(11/07) 수치를 개명 단독 효과로 해석하지 않는다.


## 변경 동반 SEO 점검

2026-10-18 사용자 요청: 앞으로 기능이나 콘텐츠가 바뀔 때 관련 SEO도 같은 작업에서 점검한다. 별도 SEO 작업 요청을 기다리지 않는다. 작업 시작 시 영향받는 공개 URL과 검색 의도를 적고, 아래 중 관련 항목을 기존 정본에서 확인한다.

- 본문·기능 변경: 첫 문단과 H1이 실제 제공 범위를 설명하는지, title/description이 본문과 맞는지, 설명 중복·과장·미구현 혜택이 없는지 확인한다. 바뀔 이유가 없는 메타는 유지한다.
- 탐색·URL 변경: 실제 href가 있는 내부 링크, 정규 URL·HTTP 상태, canonical, 의도된 noindex, 기존 sitemap 선별 정책을 함께 확인한다. 인증·결제·개인 결과를 검색 대상으로 만들지 않는다.
- 다국어 변경: 본문·FAQ·이미지 속 문구·alt·CTA를 해당 언어로 확인하고, 실제 존재하는 번역 URL만 hreflang과 내부 링크에 사용한다. 번역되지 않은 목적지를 번역 페이지처럼 안내하지 않는다.
- 이미지·레이아웃 변경: 이미지 크기/비율·대체 텍스트·로딩 방식과 모바일 가독성, 콘텐츠 이동·버튼/광고 혼동 여부를 확인한다. 실사용자 CWV와 실험실 검사를 구분한다.
- 구조화 데이터·광고: 보이는 본문과 동일한 데이터 소스를 사용하고 허구의 저자/리뷰/FAQ를 만들지 않는다. 유료 결과·로딩·로그인·결제 화면 광고 차단을 보존한다.

검증은 기존 check:fast 계획과 관련 대상 검사부터 수행한다. 생성 미러와 sitemap lastmod는 기존 생성기로만 갱신하며, 실제 콘텐츠 변경 없이 날짜만 새롭게 만들지 않는다. PR/배포마다 전체 사이트 크롤링을 추가하지 않는다. 전체 HTTP 감사는 기존 예약 작업을 유지한다.

완료 기록에는 영향 URL, 바꾼 내용과 이유, 유지한 색인 정책, 실행한 검증, 미검증 항목을 적는다. SEO_STATE.json의 현재 실적 관측일·검색 수치를 코드 수정일로 덮지 않는다. 사용자에게 제공되는 실제 품질 개선과 검색순위/CTR 개선은 별도로 보고한다. 운영 배포·계정 제출·아웃리치 발송 권한은 확대하지 않는다.

공식 기준: [Google의 사람 중심 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [다국어 사이트 관리](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).


### 2026-10-22 D+14 네이버 중간 관찰

- 로그인된 서치어드바이저에서 10/21 갱신 PC+Mobile 최근30일·7일의 웹문서 TOP30 각3페이지를 직접 읽었다. 14일 필터는 없고 집계 시작·종료일도 UI 미표시여서 미확인이다. 30일에는 배포 전 기간이 섞인다.
- 최근30일 표시 전체 클릭 3.5천→4.3천, 노출78.1만→88.3만, 평균 문서CTR0.4→0.5%. 반올림 값이며 네이버 평균 문서CTR을 합산 클릭/노출 CTR로 바꾸지 않는다.
- 내일 허브55클릭/5,374노출/1.0%→100/7,686/1.3%; 아이유 원시 ?v= URL38/1,844/2.1%→44/1,879/2.3%. 정국 원시 ?v= URL52/1,038/5.0%, 기준선 미확인. 유명인 전체 합계가 아니다.
- 최근7일 약900클릭/12.4만노출/평균CTR0.7%, 전주 대비 클릭-16.8%·노출-28.1%. CTR 상승을 유입 증가·제목 단독 효과로 단정하지 않는다.
- /ggulggul/, /today/, /insights/, /insights/famous-saju/는 TOP30 밖으로 미확인. /kkul-kkul-unse/·/fortune/today/로 대체하지 않는다. 내일 상세 TOP30 부분집합은18개2,278클릭/455,896노출/가중CTR0.500%; 기준선과 동일 URL 집합인지는 미확인이다.
- 관측 정본: [SEO_STATE.json](../seo/SEO_STATE.json)의 naver20261008.d14Measurement(각기간 원문30행 포함). 읽기 전용 측정만 했고 운영 설정·기능·메타·결제·API·DB·배포 변경 없음. D+14 관찰 완료, 11/07 D+30 자동화 유지.

### 2026-10-22 D+14 수집·색인 확인과 읽기 경로 개선

- 네이버 URL 검사 및 색인 상태 UI에서 `/fortune/tomorrow/pig/`, `/fortune/tomorrow/snake/` 모두 200·수집 허용/완료·색인 허용/완료 확인. 최종 업데이트 표시는 각각 `1시간 전`, `8시간 전`이며 절대 시각으로 환산하지 않았다. 현재 색인 누락 증거는 없고 과거 노출 감소 원인은 미확정이다. 수집 요청은 제출하지 않았다.
- 한국어 돼지띠·뱀띠 내일 상세에 계산 근거·분야별 점수를 읽고 약속/지출/질문을 준비하는 고유 가이드를 추가했다. 날짜별 예언이나 새 계산을 만들지 않는다. i18n 문구 정본은 `lib/i18n/search-reading-paths.mjs`다.
- 자미두수 관련 링크의 앞 3개에 명반 가이드·자미두수 인사이트·사주 비교를 배치했다. 인사이트 허브에는 접지 않은 가시 링크를, 유명인 상세의 기존 CTA에는 명리 읽는 법·체계 비교·개인 명반 경로를 제공한다. 유명인 공개/검수 필터와 noindex는 유지한다.
- 10/03 상세 title 실험과 title/description 생성, URL·canonical·hreflang·robots·sitemap 선별 정책·이미지·광고 정책은 변경하지 않았다. 결제·인증·API·DB·운세 계산은 변경하지 않았다. main 전달과 운영 배포는 구분하며, 이번 변경의 CTR 효과는 후속 관찰 대상이다.

### 2026-10-29 SEO·AEO·GEO 감사와 최적화

- 요청: 네이버 노출·클릭 급감 → claude-seo(v2.5.0)로 진단 후 SEO·AEO·GEO 최적화만. 감사 요약 [2026-10-29-seo-aeo-geo-audit.md](../seo/2026-10-29-seo-aeo-geo-audit.md)(SEO Health 68/100), 후속 [seo-followups-20261029.md](../handoff/seo-followups-20261029.md). 하락 원인은 미확정이다. 서치어드바이저·검색광고 키워드도구는 이번에 조회하지 못해 경쟁도 실측값이 없다.
- 신규 색인 URL: `/fortune/2027/` 허브와 `/fortune/2027/{12띠}/`(한국어만, sitemap-ko 13개, 자기 canonical, index). 띠 지지와 丁未 세운의 결정 관계(합·충·형·해·원진)로 띠별 본문을 계산한다. 공통 월건표는 허브 `#months`에만 둔다. 12쪽 공통 5-gram 46.7%(<50%), 쌍별 최대 포함률 61.8%(돼지↔토끼), 본문 2,937~3,542자. 해설 문장의 생성형 AI 고지를 화면에 두고, 박병하(네오)를 저자·검수자로 표기하지 않는다.
- AEO·GEO: `llms-full.txt` 신설(레지스트리 파생, 17,135자), `llms.txt`에 공식 서비스명 정의 문장과 `/fortune/*` 허브를 넣었다. `generate-llms-txt.mjs --check`로 생성본과 커밋본의 일치를 본다.
- JSON-LD: 운세 허브(오늘·내일·주간·월간)와 `/fortune/date/`의 중복 WebPage 노드를 없애 `#webpage` CollectionPage 하나로 두고 dateModified를 단다(S1·S12). 편집팀 author를 `#organization` "CODE DESTINY" 하나로 맞춘다(S2). FAQ가 없는 유명인 상세에서 빈 FAQPage를 내지 않는다(S3, 0/288).
- 내부 링크: `/new-year-ai-consultation/` → `/fortune/2027/`(무료 정보와 유료 상담 의도 분리).
- sitemap lastmod는 기존 생성기로만 갱신했다. `lib/seo/entity-registry.mjs`·`lib/structured-data.ts`가 대부분 경로의 import 폐쇄에 들어 있어, 최신 main 기준으로 기존 경로 176개의 lastmod가 바뀌고(629개는 서명만 바뀌고 날짜는 이미 오늘) 신규 13개가 들어간다. 날짜만 만든 것이 아니라 서명 변화이며, 정확도 개선은 후속 D 절이다.
- 되돌림: 내일 상세의 미래 datePublished(T5)를 발행일로 바꿨다가 `scripts/lib/fortune-date-contract.mjs:64`("Article datePublished = 대상일") 게이트에 막혀 되돌렸다. 계약을 먼저 정해야 한다.
- 유지: title/description과 10/03 제목 실험, 기존 URL·canonical·hreflang·robots, 심리테스트 22종·유명인 3쪽·`/human-design/` noindex와 다섯 곳 색인 정책, 결제·인증·API·DB·운세 계산.
- 검증: `build:cf`(postbuild `verify-adsense-readiness` OK, 사이트맵 6개·loc 1,033), typecheck·lint 통과, jest 435 스위트·7,119 테스트 통과, node 테스트 3,965 통과·2 실패(Playwright Chromium 미설치 환경의 브라우저 테스트, 이번 변경과 무관). 리베이스(origin/main `12f0b1831`) 뒤 재빌드는 upstream `5f2b10b55` 때문에 멈췄다(FAQ 모듈 파싱, 문의 페이지 `Contact Us` 마커). 커밋하지 않은 로컬 임시 우회로 Next 출력을 만든 뒤 `verify-adsense-readiness`(문의 마커만 건너뜀)·`verify-home-identity`·`verify-sitemap-canonical`이 통과함을 확인하고 우회는 되돌렸다. 스테이징 배포([런 40907636662](https://github.com/rei1237/codedestiny/actions/runs/40907636662))는 같은 이유로 실패해 스테이징 확인은 하지 못했다. 운영 배포·서치어드바이저/GSC 제출·수집 요청은 하지 않았다(승인 대기). 검색 실적 효과는 미관측이다.

### 2026-10-30 매년 신년 시즌 점검

- 요청: "/fortune/2027/ 수집 이외에도 매년도마다 수집". 시즌 페이지는 해마다 새 원고가 필요해 자동 생성하지 않는다. 대신 해마다 그 해와 다음 해 페이지가 운영에 있는지 보고, 사람이 할 수집 요청 목록을 낸다.
- 변경: `scripts/seo/new-year-season.mjs`(+ `new-year-season.test.mjs`)를 `.github/workflows/seo-operations.yml` 주간·월간 실행에 붙였다.
  - KST 기준으로 올해 `/fortune/{YYYY}/`+12띠는 상시 실패 조건이다. 다음 해는 8월부터 경고, 10월부터 실패다. 첫 시즌은 2027이다.
  - 검사 항목: 200, noindex 없음, 자기 canonical, title·description, 선언 sitemap 포함, Googlebot·Yeti robots 허용.
  - 살아 있는 해는 서치어드바이저·GSC 수동 요청 체크리스트를 요약(`seo-qa/operations/new-year-season.md`)에 낸다.
  - GET만 보내고 외부 제출은 하지 않는다. IndexNow는 운영 배포의 델타 통지가 그대로 맡는다. 새 URL과 lastmod 서명이 바뀐 URL이 대상이며, 네이버·Bing에 공유된다.
- 첫 실행 기대값: 운영 미배포라 `/fortune/2027/` 404로 실패한다. 의도된 신호다.
- 스테이징: main `0e64bb929`에서 PR CI 전부 통과, 스테이징 배포 성공, `verify:staging` PASS. 빌드를 막던 문의 마커·FAQ 미러·2027 12띠 3홉 링크 깊이는 다른 세션이 `5f09b9457`·`0e64bb929`로 고쳤다. 같은 SHA의 스테이징 대상 점검은 13쪽 모두 200이다. noindex·robots·canonical 항목은 스테이징 보호로 걸린 것이다.
- 재제출: 사용자가 승인했다. 이 세션은 Chrome 확장이 연결되지 않았고 GSC API 자격이 없어 하지 못했다. 운영 배포 뒤 체크리스트로 한다. 해마다 할 일은 [seo-followups-20261029.md](../handoff/seo-followups-20261029.md) I절에 있다.
