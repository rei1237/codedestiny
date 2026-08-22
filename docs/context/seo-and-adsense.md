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
- **홈 `/`은 정적 셸 `index.html`의 승격본**이다(`scripts/promote-static-shell-to-root.mjs`가 `public/index.html`→루트 `dist/index.html`). 따라서 **홈 콘텐츠·메타는 `app/page.js`가 아니라 정적 셸에 둔다**(`app/page.js`는 승격에 덮여 홈에서 미사용). 홈 하단 운세 입문 콘텐츠 섹션(`.cd-home-guide`, theme-tokens `--cd-*` 사용)은 **한국어 3개 셸**(루트 `index.html`, `public/index.html`, `public/static/index.html`)에만 있고 전 뷰포트에 노출한다(숨김 금지). en/ja/zh 셸 현지화 콘텐츠는 후속 과제.

## 정적 셸 사본 라우트 11개는 검색 최적화 대상이 아니다 (2026-08-23 확정)

`scripts/static-canonical-route-map.mjs` 의 `source: "static-shell"` 항목들
(`/saju/basic` `/saju/sibyl` `/tarot/mingri` `/tarot/love` `/tarot/reunion`
`/tarot/self-esteem` `/tarot/year` `/astrology/cosmic` `/oracle/juyuk`
`/oracle/hwatu` `/oracle/sukuyo`)은 **루트 `index.html` 을 그대로 복사하고 `<head>`
만 갈아 끼운 SPA 딥링크**다. `cd-static-canonical-action` 으로 홈 셸의 모달을 연다.

- **body 가 홈과 사실상 동일하므로 색인시키지 않는다** — 사용자 확정(2026-08-23).
  `generate-sitemap.mjs` 의 `noindexPathPrefixes` 에 11개 전부 있고 사이트맵에도 없다.
- 따라서 **이 라우트들의 title·description 을 검색 키워드용으로 고쳐도 효과가 없다.**
  그 문구가 실제로 쓰이는 곳은 브라우저 탭과 **소셜 공유 카드**다(공유 유입은 실재한다).
- `<head>` 교체 정본은 **`scripts/lib/static-shell-route-meta.mjs` 하나뿐**이다.
  예전에는 같은 함수가 `prepare-cloudflare-dist.mjs` 와 `promote-static-shell-to-root.mjs`
  에 복사돼 있었고 robots(`index` vs `noindex`)와 canonical 후행 슬래시가 서로 달랐다.
  🔴 **다시 각 스크립트에 복사해 넣지 말 것.**
- 이 결정을 지키는 가드: `__tests__/ui/static-shell-noindex.static.test.js`
  (`npm run test:node` 로 PR CI 에서 돈다). 대상은 `getStaticShellCanonicalRoutes()`
  에서 전수 발견하므로 셸 사본 라우트를 새로 추가하면 자동으로 검사에 걸린다.
- 이 11개를 실제로 색인시키려면 라우트마다 고유 본문이 필요하다(AdSense 하한 1,800자).
  그건 별도 결정이지, 제목만 고쳐서 되는 일이 아니다.
