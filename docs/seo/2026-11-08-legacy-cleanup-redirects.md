# 2026-11-08 레거시 페이지 정리와 301 매핑

서비스·법률 페이지만 남기고 개발용 화면, 이동만 하던 별칭, noindex 사본을 지웠다. 지운 공개 주소는 모두 가장 가까운 서비스 페이지로 301 한 번에 보낸다. `public/_redirects`는 95개 예산이 차 있어 새 규칙은 `public/_worker.js`에 둔다.

| 지운 주소 | 301 목적지 | 지운 파일 | 근거 |
|---|---|---|---|
| `/fpti` | `/saju-fpti/` | `app/fpti/page.tsx` | 클라이언트 307만 하던 별칭, 사이트맵 밖 |
| `/saju-picture` | `/saju-guardian/` | `app/saju-picture/*` | 같은 별칭, noindex 목록에만 있었다 |
| `/famous`, `/famous/` | `/insights/famous-saju/` | `public/famous/index.html`, `public/blog/blog-style.css` | noindex, 들어오는 링크 0 |
| `/fortune/sikojen-povailu` | `/oracle/sikojen-povailu/` | `public/fortune/sikojen-povailu/index.html` | 자동 이동 스텁. 같은 폴더 `images/piggyfortune.webp`는 서비스가 쓰므로 남긴다 |
| `/dev-status` | `/` | `app/dev-status/*` | 운영에서 빈 화면 |
| `/neo-war-room/asset-demo` | `/neo-operation-room/` | `app/neo-war-room/asset-demo/page.tsx` | 운영에서 notFound |
| `/fortune-tea-house/{tarot,tea-cup,ten-god}-debug` | `/fortune-tea-house/` | 라우트 3개 + `src/features/fortune-tea-house/components/*Debug*` 4개 | 운영에서 notFound, robots 차단 |
| `/static/geomancy-oracle-v4(.html)` | `/geomancy-oracle-v4` (질의 유지) | `public/static/geomancy-oracle-v4.html` | 동기화가 만들던 두 번째 사본. 원본 셸은 남긴다 |
| `/admin/hq-demo` | 없음(관리자 전용, robots 차단) | `app/admin/hq-demo/*` | 픽스처 데모 화면 |
| `/sukyo/relationship-encyclopedia` | `/sukuyo/` (기존 `_redirects` 규칙) | `app/sukyo/relationship-encyclopedia/page.js` | 규칙이 이미 앞에서 보낸다 |
| `/tadagochi(.html)` | `/ggulggul/#dpMasterCard` (기존 워커 규칙) | `tadagochi.html`, `public/tadagochi.html` | 589바이트 스텁 |

## 남긴 것

- `/nakshatra/codex/*` 27쪽: 사이트맵에 있고 `/vedic` 허브가 링크한다.
- `/saju/monthly/2026-09/*` 11쪽: 앱을 포함한 모든 홈 셸과 운세·오늘 페이지가 링크한다. 은퇴하려면 별도 작업으로 링크부터 옮긴다.
- `/compare/*` 3쪽: `/insights`와 엔티티 레지스트리가 링크한다.
- 세 묶음 모두 검색 유입 수치는 확인하지 못했다(10-18 URL 원장은 "미확인"). "트래픽 0"은 근거가 없어 지우지 않았다.

## 같이 고친 곳

- 워커 표 `CONSOLIDATED_PAGE_REDIRECTS`와 `/static/geomancy-oracle-v4` 정규식 줄, `__tests__/ui/consolidated-pages.test.mjs`
- `_headers`(원본과 `public/` 사본), `scripts/verify-adsense-readiness.mjs`, `lib/seo/siteSeo.ts`와 `scripts/generate-sitemap.mjs`의 noindex 짝
- `scripts/sync-legacy-static-to-public.mjs`(지운 파일을 다시 만들지 않게), `scripts/verify-profile-characters.mjs`, `scripts/verify-paid-feature-common-flow.mjs`
- `/fpti`로 걸던 링크 두 곳(`lib/records/service-registry.js`, `worker/lib/review-product-catalog.js`)은 `/saju-fpti/`로 바로 건다

운영 반영은 배포 승인 뒤다. SEO 재구축의 색인 원장 작업(묶음 ③)이 이 목록을 함께 반영해야 한다.
