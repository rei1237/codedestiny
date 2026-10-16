# 브랜드·루트 홈 릴리스 체크리스트

대상 변경: 루트 `/` 200 대표 홈, 브랜드 원본(`lib/brand/brand-facts.mjs`), 사이트명 신호 "꿀꿀 운세", 대표 페이지 역할 분리.
배포 성공은 완료 판정이 아니다. 운영 재실측과 D+7/14/30 관찰로 판정한다.

## 1. 커밋 전

- [ ] `npm run check:fast -- --plan` → `npm run check:fast`
- [ ] `node --test __tests__/ui/brand-facts.test.mjs __tests__/ui/json-ld-serialize.test.mjs __tests__/ui/sitemap-canonical.test.mjs __tests__/ui/indexnow-delta.test.mjs`
- [ ] 생성물 최신: `npm run sync:public`, `node scripts/i18n-merge-authored.mjs`, `npm run llms:generate`, `npm run sitemap:generate`
- [ ] `npm run verify:business-identity`
- [ ] 커밋 후 `npm run check:pre-push` (홈 서비스 레지스트리, 공개 미러 최신, 사이트맵 원장, `generate-llms-txt.mjs --check`, `verify:seo-entity-registry` 를 차례로 돈다. 공개 미러 검사는 작업 트리가 깨끗해야 한다)

## 2. 로컬 빌드

- [ ] `npm run build:cf` (prebuild:cf 가 운세 데이터·공개 미러를 먼저 만든다. postbuild verify-adsense-readiness 통과)
- [ ] `node scripts/verify-home-identity.mjs` — `/`, `/ggulggul/`, `/kkul-kkul-unse/`, `/about/`, `/faq/`
  - title 1개, self canonical 1개, `/` 의 hreflang 0개, WebSite·Organization·WebPage 각 1개, 과거명 0건
- [ ] `node scripts/verify-sitemap-canonical.mjs` — 사이트맵 loc 의 dist 파일·canonical·noindex, 리다이렉트 원천을 가리키는 내부 링크 0
- [ ] 워커 단위 테스트: home-entry-redirect, visitor-country-routing

## 3. 스테이징

- [ ] push 후 main CI 1회 확인
- [ ] `npm run verify:staging -- --sha=<40자리>` (라우팅 변경이 있어 필수)
- [ ] 아래 재실측 표를 스테이징 주소로 실행
- [ ] 브라우저 확인(실결제 없음): 로그인 후 `/ggulggul/` 복귀, 하단 홈 탭, 결제 다이얼로그 진입, `/#readings` 해시 딥링크, PWA 시작

## 4. 운영 승격

- [ ] `npm run verify:release`
- [ ] `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production` (1회)
- [ ] 워크플로 로그에서 postDeployHealth·deploy-smoke 통과 확인
- [ ] 워크플로 "Notify IndexNow of changed URLs" 단계의 응답 코드 기록(200/202 정상, 4xx 는 키·호스트 확인). 수동 추가 제출은 하지 않는다
  - 429·5xx·시간 초과는 스크립트가 최대 3회 다시 보낸다(Retry-After 우선, 최대 60초). 로그에 `attempt N` 으로 남는다
  - 끝내 실패하면 체크포인트를 옮기지 않으므로 다음 운영 배포가 같은 변경을 다시 제출한다. 이 단계는 continue-on-error 라 배포를 롤백하지 않는다

## 5. 운영 재실측 (curl)

사람 방문 흉내는 `-H "Accept: text/html"` 과 로케일 쿠키 `cd_locale=<ko|en>; cd_locale_explicit=1` 을 붙인다(explicit 없이 cd_locale 만 주면 국가로 판정한다).

| 요청 | 기대 | 결과 |
|---|---|---|
| `/` (기본 · Googlebot UA · 한국어 사람) | 200, canonical 1개 `https://code-destiny.com/`, WebSite·Organization·WebPage 각 1개, title "꿀꿀 운세 공식 사이트 …" | 통과(2026-10-16) |
| `/` + 영어 명시 쿠키 사람 | 302 → `/en/` | 통과 |
| `/?utm_source=x` | 200 | 통과 |
| `/?paymentId=x&portone_redirect=1` · `/?code=x&state=y` · `/?ref=abc` | 302 → `/ggulggul/?<원래 쿼리>` | 통과(쿼리 보존) |
| `/?question=x` | 302 → `/yeongnyangi/?question=x` | 통과 |
| `/index.html` | 301 → `/` | 통과 |
| `/ggulggul/` `/kkul-kkul-unse/` `/about/` `/faq/` `/saju/` `/insights/` | 200, self canonical, title·og:site_name "꿀꿀 운세", 과거명 0건 | 통과. 6개 모두 "꿀꿀 운세". 과거명은 `/kkul-kkul-unse/` FAQ 이력 문답에만 |
| `http://code-destiny.com/` · `https://www.code-destiny.com/` | https 루트로 이동 후 200 (홉 수 기록) | 통과(301 1홉 뒤 200) |
| `/robots.txt` | 승격 전과 diff 0 | 통과(sha256 앞 16자리 07be6d947cb14a75) |
| `/sitemap.xml` | `<loc>https://code-destiny.com/</loc>` 1개 | 통과(1개) |

운영 결과 기록: 2026-10-16 run 38839146392(f801a1c8d). 전후 비교는 `seo-audit.md` "운영 승격 전후 실측".

## 6. 롤백

- 자동: postDeployHealth 실패 시 Pages·Worker 자동 롤백. 스모크·헬스체크는 신·구 루트 동작을 모두 허용한다.
- 수동: `npm run deploy:rollback -- --list` 로 ID 확인 → 같은 워크플로를 `mode=rollback`, `pages_deployment_id`, `worker_version_id` 로 실행.
- 코드: 루트 홈 커밋을 `git revert` → push → 스테이징 → production dispatch. 브랜드 원본·스모크 커밋은 구 라우팅에서도 중립이다.
- 캐시: `/` 와 HTML 은 `_headers` 에서 no-cache, SW 는 내비게이션 network-only 라 SW 버전을 올리지 않는다. CF 캐시 퍼지는 대시보드 작업이라 하지 않는다.

## 7. 콘솔 작업 (운영자 직접)

- [ ] Google Search Console: `/` URL 검사 → 색인 요청, 사이트맵 재제출, 선택된 canonical 확인
- [ ] 네이버 서치어드바이저: 사이트맵 재제출, `/` 수집 요청
- [ ] Bing Webmaster: 사이트맵 재제출, URL 검사
- [ ] 결과를 아래 관찰 기록에 적는다

## 8. 관찰

| 시점 | 확인 | 기록 |
|---|---|---|
| D+1 | 운영 재실측 반복, IndexNow 응답 코드 | |
| D+7 | Google·Naver·Bing 에서 "꿀꿀 운세", "꿀꿀운세", "꿀꿀 운세 공식": 사이트 이름 표시, 대표 URL, 과거명 노출 | |
| D+14 | 같은 검색 + `aeo-evaluation.csv` 질문 | |
| D+30 | 같은 검색 + GSC "리디렉션 포함 페이지"·"NOINDEX"·"사용자 미선택 canonical" 건수 추이(운영자 콘솔) | |

검색엔진의 사이트 이름 채택과 AI 답변은 외부 시스템이 결정한다. 신호를 맞춘다고 바로 바뀌지 않으며, 위 관찰로만 개선 여부를 말한다.
