# Technical SEO Checklist

> [세트 인덱스](README.md) · 이 문서는 8/10부다. 기술부채를 항목화한다. 수정은 여기서 하지 않는다
> (안전하고 회귀 위험이 낮다고 확인된 일부만 별도 PR로 실행 — [10-feedback-loop.md](10-feedback-loop.md)
> 참고).

## 1. 체크리스트

| 항목 | 현재 상태(근거) | 리스크 | 권장 조치 | 관련 verify | 상태 |
|---|---|---|---|---|---|
| SEO 유틸 9파일 분산 | `lib/seo.ts`, `seo.v2.ts`, `seo-metadata.ts`, `seo-site-urls.ts`, `generate-page-metadata.ts`, `lib/seo/siteSeo.ts`, `createI18nMetadata.ts`, `createHreflang.ts`, `siteConfig.ts` | 낮음(전수 조사 결과 **8개 전부 실사용 중**, 죽은 파일 0개) | 통합하지 않는다 — 2026-08 감사(`docs/cleanup-2026-08/03-report.md` B-11)에서 이미 "통합 말고 역할 문서화"로 결론. 이 문서가 그 문서화 역할 | — | 문서화 완료 |
| `lib/seo.v2.ts` 죽은 export | `buildSitemapEntriesV2()`, `getIndexableRouteEntries()` 호출부 0건(정의부 외) | 낮음(typecheck가 참조 누락을 즉시 잡음) | 삭제 | `typecheck` | **별도 PR로 처리** |
| `lib/README.md` 낡음 | SEO 유틸 9개 중 3개만 문서화, `LOCALE_MAP`에 실제 없는 `/en-us`/`/ja-jp` 경로 예시, "git push origin main" 배포 예시(현재 PR 기반 배포 계약과 모순) | 중간(다음 세션이 이 README를 정본으로 오인할 위험) | 이번 범위 밖 — SEO 작업과 무관한 전면 정비가 필요해 별도 이슈로 분리 권장 | — | 미착수 |
| GSC 인증 미확정 | `index.html`·`app/layout.js` 둘 다 `google-site-verification` placeholder | 중간(실측 데이터 확보 차단) | Cloudflare DNS TXT로 이미 인증됐는지 사용자 확인, 아니면 `SEO_SUBMISSION_GUIDE.md §1-2`대로 등록 | — | 사용자 확인 대기 |
| 네이버 인증 코드 2개 병기 | `naver-site-verification` 메타 2개, 어느 쪽이 유효한지 불명 | 낮음(기능상 문제 없음, 관리 혼선만) | 서치어드바이저 로그인해 유효 코드 확인 후 하나만 남김(`SEO_SUBMISSION_GUIDE.md §2`에 이미 안내됨) | — | 미착수 |
| 다국어 SSR 커버리지 격차 | ja/zh/en은 `home`/`ziwei`/`sukuyo`/`today`/`insights` 5개 라우트군뿐, 사주/타로/점성술/베다 없음 | 낮음(콘텐츠 공백이지 버그 아님) | [06-content-roadmap.md P1](06-content-roadmap.md) | — | 로드맵 등록됨 |
| `/insights/*` 서브허브 8개 registry 미등록 | `SeoLandingTemplate.jsx` 자동 상호링크 대상 아님 | 낮음 | [06-content-roadmap.md P2](06-content-roadmap.md) | `verify:seo-entity-registry` | 로드맵 등록됨 |
| `app/insights/adsense-ready-articles.js`/`methodology-articles.js` | 최초 죽은 코드로 의심됐으나 조사 결과 **둘 다 실사용**(`articles.js`/`seo-growth-articles.js`가 import해 렌더 파이프라인에 병합) | — | 조치 없음 — 삭제 대상 아님 | — | 확인 완료(취소) |
| famous-saju 카니발라이제이션 | [04-url-architecture.md §3](04-url-architecture.md) | 중간 | GSC 데이터 확보 후 판단 | `verify:adsense-readiness` | 확정 대기 |

## 2. 기존 `verify:*`/`seo:*` 스크립트 인벤토리

| 스크립트 | 검사 내용 | 위 항목과의 연결 |
|---|---|---|
| `npm run seo:check` | 핵심 URL 실제 HTTP 상태(리다이렉트 여부) 라이브 체크 | famous-saju 리다이렉트 확정 후 재사용 |
| `npm run seo:audit` | 로컬/원격 SEO 감사 리포트 생성(`--crawl-sitemap`) | [01-audit-framework.md](01-audit-framework.md) 전수 재검토 시 활용 |
| `npm run verify:seo-entity-registry` | `entity-registry.mjs`의 프로필/키워드/클러스터 링크 구조 무결성 | registry 신규 등록([06 P2](06-content-roadmap.md)) 시 필수 |
| `npm run verify:sitemap` | 루트/`public/` sitemap 동일성, 중복 URL, robots-disallow 충돌 | `/insights/fusion` sitemap 등록 검증 |
| `npm run verify:adsense-readiness` | AdSense 라우트별 정책 일치, sitemap 정합성, 콘텐츠 분량, 중복 지문 | famous-saju noindex 전환 시 최대 위험 지점 |
| `npm run verify:adsense-route-policy` | `adsense-route-policy.js`의 `canLoadAdsense` 단위 테스트 | famous-saju 정책 변경 시 필수 |
| `npm run verify:www-canonical` | www→apex 리다이렉트가 Cloudflare Redirect Rule로만 존재함을 실측 확인 | 무관(참고용) |

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 최초 작성. SEO 유틸 9파일 실사용 확인(죽은 파일 0, 죽은 export 2), adsense-ready-articles.js/methodology-articles.js 죽은 코드 의심 해소, lib/README.md 노후화 발견 |
