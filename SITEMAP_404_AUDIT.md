# Sitemap 404 Audit

## 1. sitemap 생성 방식
- 정적 / 동적: 메인 sitemap은 정적 생성, `/sitemap-insights.xml`은 Worker 주석 기준 별도 동적 경로
- 생성 파일: `scripts/generate-sitemap.mjs`
- 관련 script: `npm run sitemap:generate`, `npm run seo:generate`
- 운영 sitemap URL: `https://code-destiny.com/sitemap.xml`

## 2. sitemap URL 출처
- 하드코딩: `coreRoutes`
- route scan: 없음
- CMS/DB: 선택적 `INSIGHTS_API_BASE_URL` 기반 published insights fetch, 기본은 로컬 seed article 사용
- feature registry: `STATIC_CANONICAL_ROUTES`
- 기타:
  - `buildI18nRouteEntries()`
  - `extractInsightRoutes()`
  - `extractFamousSajuRoutes()`
  - `extractPsychotestRoutes()`
  - `extractHighValueRoutes()`

## 3. 검증 방식
- local:
  - 저장소 `sitemap.xml` / `public/sitemap.xml` 파싱
  - 생성 스크립트와 `_headers` noindex 정책 비교
  - `robots.txt` disallow 규칙 비교
  - 로컬 재생성 결과 `306` URL 확인
- preview:
  - 확인 필요
- production:
  - 운영 `https://code-destiny.com/sitemap.xml` 조회
  - 저장소 sitemap과 URL 목록 동등성 비교
  - 운영 sitemap 포함 URL 상태코드 `307`건 전수 확인
  - 운영 `https://code-destiny.com/sitemap-insights.xml` 별도 상태 확인
- HEAD/GET 사용 여부:
  - 기본 HEAD
  - HEAD 차단 또는 비정상 응답 시 GET 재검증

## 4. 발견한 404 URL 목록
| URL | 상태코드 | 원인 추정 | 처리 방향 | 근거 |
|---|---:|---|---|---|
| `https://code-destiny.com/sitemap-insights.xml` | 404 | Worker 주석상 별도 동적 경로이지만 현재 robots/main sitemap에서 선언하지 않음 | 보류 | 메인 sitemap 범위 밖, 운영 HEAD 확인 결과 404 |

메인 sitemap 관련 추가 확인:
- `https://code-destiny.com/sitemap.xml`의 운영 URL `307`건은 `2026-08-02` 기준 모두 `200`
- 현재 운영 sitemap과 로컬 정리본의 차이 URL은 `https://code-destiny.com/account/delete/` 1건

## 5. 처리 분류
- sitemap에서 제거:
  - `/account/delete/`
- route 복구:
  - 없음
- redirect 추가:
  - 없음
- 보류:
  - `/sitemap-insights.xml` 운영 404 여부 기록만 유지, 이번 작업에서는 선언/복구하지 않음

## 6. 회귀 위험
- SEO 영향:
  - 계정 액션 안내 페이지 `/account/delete/`는 sitemap 및 index 대상에서 제외
  - exact-match noindex 누락으로 future regenerate 시 비색인 URL이 재유입될 위험을 차단
- 내부 링크 영향:
  - `/account/delete/` 내부 링크는 유지
  - 접근 가능한 도움말 페이지 역할은 그대로 유지
- 기존 사용자 영향:
  - 페이지 접근, 계정 삭제 기능, 인증/결제/API/DB 동작은 변경하지 않음
