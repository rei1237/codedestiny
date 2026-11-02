# CODE DESTINY SEO 아키텍처 재구축 설계

> 상태: 승인됨(2026-11-01). 구현은 인수인계 문서 `docs/handoff/2026-11-01-seo-architecture-rebuild.md`에서 이어 간다.
> - 반영함: 이력 감사(C), 코드 구조(A), 운영 실측(B), 워커 실행 검증, 설계 검토, 사용자 결정 5건
> - 아직 없음: Codex 수집본(폴더 미생성), 11/07 홈 title D+30 관찰. 둘 다 묶음 ④ 전에 반영한다.
> - 근거 자료: 10/29 감사 `D:\Development\seo-audit\code-destiny-20261029\`, 이번 감사 보존본 `D:\Development\seo-audit\code-destiny-20261101\`(에이전트 A·B·C 보고서, 운영 robots·사이트맵 사본)

## Context

- **문제**
  - 론칭 2개월. GA4 28일 활성 사용자 312명, 신규 293명.
  - 구글 자연 검색: 3개월 클릭 30, 노출 486. 10/04 기준 색인 370, 제외 2,402.
  - 네이버 일 노출: 10/08에 45,458 → 26,944(-40.7%).
  - SEO 패치를 여러 번 했지만 유입이 늘지 않았다.
- **증명된 것**
  - 수집 차단과 JS 렌더링은 원인이 아니다. 사이트맵 1,037 URL이 모두 200이고, canonical이 자기 자신이며, SSR 본문이 있다. Googlebot·Yeti·bingbot은 200을 받는다.
  - 색인 신호가 엇갈린다.
    - 홈이 둘이다(`/`, `/ggulggul/`).
    - URL을 대량으로 만들었다가 없앴다.
    - 해외 IP는 302로 영어판에 보낸다. GSC 실제 URL 테스트와 애드센스 크롤러도 여기에 걸린다.
    - HTML과 사이트맵의 hreflang이 181 URL에서 다르다.
    - og:url이 홈을 가리키는 페이지가 8쪽이다.
    - 색인 정책이 6곳 이상에 흩어져 있다.
  - 본문이 겹친다.
    - 네이버 상위였던 내일 페이지가 10/08부터 오늘 본문의 치환본이다.
    - 오늘↔내일 5-gram 62%, 월간↔오늘 허브 유사도 0.83~0.95.
- **목표**: 검색엔진이 가치 있는 공개 페이지를 안정적으로 발견·이해·색인하게 하고, 그 효과를 구글·네이버·GA4 실측으로 확인한다. 순위와 색인 시점은 보장하지 않는다.
- **원칙**
  - 증명된 원인부터 고친다.
  - 결제·로그인·운세 계산·디자인은 다시 쓰지 않는다.
  - 검사는 지우지 않고 더한다.

## 접근 방식

| 안 | 내용 | 판단 |
|---|---|---|
| A. 원인 순 표적 재구축 (채택) | 정적 export와 기존 기능은 유지한다. 증명된 원인(색인 신호 혼선, 해외 302, 본문 중복)을 승격 묶음 순서로 고치고, 흩어진 색인 정책을 원장 하나로 모은다. 검사는 먼저 더한다. | 감사에서 수집·렌더링은 원인이 아니었다. 결제·계산 회귀 위험이 가장 작다. |
| B. SSR·프레임워크 전면 이전 | 앱 전체를 서버 렌더링으로 옮긴다. | 정적 SSR 본문이 이미 있어 효과 근거가 없다. 결제·로그인·계산 회귀 위험이 크다. 사용자 지침도 무작정 이전을 금한다. |
| C. 기존 방식대로 국소 패치 | 문제가 보일 때마다 해당 파일만 고친다. | 여러 번 해 봤지만 유입이 늘지 않았다. 정책이 6곳 이상에 흩어진 구조가 그대로 남는다. |

### 사용자 결정 5건

| 주제 | 고른 안 | 고르지 않은 안 |
|---|---|---|
| 검색 데이터 | 내보내기 파일 제공(Codex가 수집) | API 연결 설정, 데이터 없이 진행 |
| 검색량 | 키워드도구 CSV 제공 | 검색광고 API 키 제공, 상대 지표로 진행 |
| 운영 승격 | 단계마다 확인 후 승격 | 검증 통과 시 자동 승격, 스테이징까지만 |
| 해외 언어 | URL이 언어 결정 | 302 유지 + 봇 예외 확대. 같은 나라의 사용자와 Googlebot이 다른 응답을 받고, 새 크롤러마다 목록을 고쳐야 한다. |
| 엣지 검증 | 규칙 유지 | 엣지 단계만 브랜치 예외, 모든 단계 브랜치 예외 |

## 확정된 결정

| 주제 | 결정 |
|---|---|
| 외부 데이터 | Codex가 `D:\Development\seo-data\code-destiny\2026-11-01\`에 모은다. 없는 수치는 추측하지 않는다. |
| 운영 승격 | 묶음마다 승인 패킷을 보고 승인한 뒤 승격한다. |
| 해외 언어 | URL이 언어를 정한다. 색인 페이지의 IP 302와 UA 봇 예외를 없애고, 해외 방문자에게는 제안 배너만 보여 준다. 해외 결제를 PayPal로만 받는 판정은 그대로 둔다. |
| 검증 경로 | 저장소 규칙을 지킨다. 브랜치는 push하지 않는다. 로컬 증거로 승인 → push → 스테이징 확인 → 곧바로 운영 dispatch → 문제가 있으면 즉시 revert. |

- **수용한 위험**: 내가 스테이징을 확인하기 전에 다른 세션이 main을 승격하면, 확인 전 변경이 잠시 운영에 나갈 수 있다.
  - 엣지 묶음(②)은 vm 하네스 증거(5개국 × 3UA)를 먼저 갖춰 이 위험을 줄인다.

### 설계 판단 (내 판단)

1. **리디렉션 정규화는 좁게 한다.**
   - ASSETS가 GET·HEAD에 301·308을 낼 때만 절대 Location 301로 바꾸고, 쿼리는 유지한다.
   - 302·307은 그대로 둔다. `public/_redirects` 94개는 이미 모두 301이다.
2. **결제 힌트 쿠키는 남긴다.**
   - `cd_geo_country`(`public/_worker.js:93`)는 결제 화면 힌트일 뿐이다. 상태·본문·Location은 국가와 무관해진다.
   - 운영 결제 판정은 API 워커(`worker/payments/region-policy.js:12`)가 하므로 건드리지 않는다.
3. **저자 표기**
   - 박병하(활동명 네오)는 실제 검수 기록이 있는 글에만 붙인다(유명인 사주 `page.tsx:789` 방식).
   - about 문구에 없는 경력은 쓰지 않는다. 세계관 텍스트에는 넣지 않는다.
4. **검사는 더하고 나중에 뺀다.**
   - 새 `verify-dist`는 기존 검증 옆에 둔다.
   - 겹치는 기존 검사는 main CI에서 10회 이상 같은 판정을 낸 뒤 별도 커밋으로 지운다(CLAUDE.md:54).
   - `check:pre-push`는 유지한다(AGENTS.md:28).
5. **안 쓰는 코드는 참조 0건을 확인한 것만 지운다.**
   - 고아 스크립트 4종
   - `app/HomeRedirectToStatic.tsx`, `app/components/SeoJsonLd.jsx`
   - `lib/seo-site-urls.ts`의 `getAllSitemapUrls`, `lib/seo-metadata.ts`의 중복, `lib/indexnow.ts`의 `submitIndexNowUrls`
6. **일시중지 게임**: 302·noindex는 의도된 임시 조치라 유지한다. 사이트맵·llms-full·entity-registry에서만 뺀다.
7. **`/yeongnyangi/free-fortune` 302**: 1단이라 그대로 둔다. 영구 여부는 후속 질문으로 남긴다.
8. **hreflang 코드 규칙**
   - 언어마다 대표 코드 1개: ko, en, ja, zh-CN, zh-TW. x-default는 한국어 URL.
   - 범위를 실제로 넓히는 별칭만 남긴다: 간체판에 `zh`·`zh-Hans`, 번체판에 `zh-Hant`. Google 문서 사이트도 스크립트 코드를 쓴다.
   - `ko-KR`·`ja-JP`는 중복이라 뺀다.
   - HTML과 사이트맵이 같은 함수에서 같은 집합을 낸다.
9. **운영 dispatch**
   - 명령: `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`
   - `target_sha`는 쓰지 않는다(pages_only 전용).
   - dispatch 전에 origin/main이 스테이징에서 확인한 SHA와 같은지 본다.
10. **verify-dist는 래칫이다.**
    - 경고로 시작하고, 이미 깨끗한 결정적 불변식만 실패로 둔다.
    - 다른 세션 배포와 00:10 일일 발행을 막지 않는다.
11. **미완성 번역은 실측으로 판정한다.**
    - 비한국어 본문의 한글 비율, 템플릿 공유율, 기존 i18n deployment-check 상태로 목록을 만든다.
    - 목록은 승인 패킷에 넣고 50~100쪽씩 적용한다.
12. **2027 신년 허브(E1)는 측정 후 보강한다.** 이미 운영 중이므로 X-S1 기준을 재고 미달한 쪽만 고친다.

## 목표 아키텍처

1. **공개 URL 원장** `lib/seo/index-policy.mjs`
   - 신규 파일이다. 의존성 없는 ESM으로 `lib/brand/brand-facts.mjs`와 같은 방식이다.
   - 경로 접두사별로 `{ index, sitemap, private }`를 둔다. robots 상수는 INDEX, NOINDEX_FOLLOW, NOINDEX 3종이다.
   - 사이트맵·메타·정적 셸·애드센스 검사·`app/robots.ts`·llms가 이 원장을 import한다.
   - `_worker.js`와 `_headers`의 X-Robots-Tag는 import하지 않고 원장과 대조해 검증한다.
2. **hreflang 단일 함수** `alternatesFor(path)`
   - 색인 가능한 형제 URL만 판단 8의 규칙으로 낸다.
   - HTML 메타와 사이트맵이 같은 함수를 쓴다.
3. **국가·UA와 무관한 엣지**
   - 같은 URL이면 상태·Location·본문·Cache-Control이 같다. `cd_geo_country` 값만 다르다.
   - 리디렉션은 절대 URL 301 한 번이다.
4. **메타 정합**
   - og:url은 canonical과 같거나 없다.
   - robots meta는 1개다.
   - JSON-LD는 `#organization`·`#website` @id 그래프 하나로 묶는다.
5. **검증 2층**
   - 빌드 산출물 검사: `scripts/seo/verify-dist.mjs`(네트워크 없음, postbuild)
   - 운영 샘플 검사: `scripts/check-seo-health.mjs`(US 러너에서 매일)
6. **측정**: `docs/seo/SEO_STATE.json`에 승격 기록을 남기고, Codex 수집본으로 7·28·90일을 비교한다.

## 실행 순서 — 승격 묶음

| 묶음 | 단계 | 핵심 | 선행 조건 |
|---|---|---|---|
| ① | V0 + A2 + D1 | 검사 도구, 메타·JSON-LD·robots.txt 정리, 날짜 계약 | 없음 |
| ② | A1 | 엣지: 언어 302 제거, 301 한 번, RSS | ① 운영 확인 |
| ③ | B + A3 | 색인 원장, hreflang 단일 출처, 안 쓰는 코드 정리 | ② 운영 확인 |
| ④ | E1 + C + E2 | 2027 허브 측정, 핵심 페이지 title·H1, 내부 링크 | 11/07 이후, Codex 수집본 |
| ⑤ | D2 | 날짜 페이지 본문 차별화, 미완성 번역 noindex | ④ 이후, 50~100쪽씩 |
| 별도 | F | 성능(LCP·INP) | 따로 승격 |

### V0 — 검사 도구 (묶음 ①)

- **신규** `scripts/seo/verify-dist.mjs`: `dist/`를 읽어 '검증' 절의 규칙을 적용한다. 네트워크는 쓰지 않는다.
- **재사용**: `scripts/seo-audit.mjs`의 파서를 `scripts/seo/health-policy.mjs`로 옮겨 함께 쓴다.
  - getTitle(:151), getCanonical(:155), getHreflang(:163), getH1s(:174), getJsonLd(:178)
  - getInternalLinks(:202), hasNoindex(:215), parseHeaderRobotsRules(:484), readSitemapAlternates(:553)
- **연결**
  - `scripts/run-postbuild.mjs`의 검증 목록에 넣는다. 모바일 분기(:66-70)도 맞춘다.
  - `scripts/verify-guard-wiring.mjs`에 등록한다.
  - 기존 `:26`·`:29` 검증은 그대로 둔다.
- **테스트**: `__tests__/ui/sitemap-canonical.test.mjs`에 정상 1건, 위반 픽스처 1건을 더한다.
- **통과 기준**
  - 현재 산출물에서 실패 0
  - 경고가 감사 수치를 재현한다: og:url 8쪽 이상, hreflang 100/80/8, 308, 해외 302, 쿠키

### A2 — 메타·JSON-LD·robots (묶음 ①)

- **루트 og·twitter 상속 제거**
  - `app/layout.js`에서 지운다: openGraph url·title·description(:106, :108, :109), twitter title·description(:121, :122), 낡은 주석(:92-102).
  - og:image·siteName·locale은 남긴다.
  - 그러면 자기 openGraph가 없는 20쪽이 더 이상 홈의 og:url·og:title을 물려받지 않는다.
- **robots.txt 단일 출처**
  - 배포되는 것은 `app/robots.ts` 렌더 결과다.
  - 낡은 루트 `robots.txt`·`public/robots.txt`는 public-parity·sync·가드 기대값을 확인한 뒤 지운다.
  - `scripts/verify-sitemap-integrity.mjs:8`이 배포본(`dist/robots.txt`)을 보게 고친다.
  - `app/robots.ts`의 중복 UA 그룹 17개를 합치고 비표준 `Host:`를 뺀다. 첫 그룹만 읽는 크롤러가 규칙을 놓치지 않게 하려는 것이다.
  - 스테이징 noindex(`scripts/apply-staging-noindex.mjs:124`)는 dist 판을 덮어쓴다. 영향이 없는지 기존 테스트로 확인한다.
- **JSON-LD**
  - `scripts/build-fortune-hub-shell.mjs:177`: `isPartOf`를 `{"@id":"https://code-destiny.com/#website"}`로 바꾼다.
  - `app/insights/famous-saju/[slug]/page.tsx`: 브레드크럼 이름은 `BRAND_FACTS.service.name`(:820), publisher는 `#organization` 참조(:790-792).
  - `I18nSeoPageTemplate.jsx:370-374`, `SeoLandingTemplate.jsx:544-547`: `lib/seo/json-ld.mjs:11`의 `serializeJsonLd`로 이스케이프한다.
  - `index.html:995`·`:1102`의 "CODE DESTINY"는 영문 브랜드 표기라 그대로 둔다.
- **llms·레지스트리·사이트맵**
  - `scripts/generate-llms-txt.mjs:52`의 하드코딩 `/fusion-fortune`을 지우고, llms 출력을 사이트맵 집합으로 거른다.
  - 일시중지 경로를 세 곳에서 뺀다: 사이트맵 정적 목록(`scripts/generate-sitemap.mjs:248-249`), llms-full(:149), `lib/seo/entity-registry.mjs:353-362`.
- **`_headers` 충돌**: 423행(`/music/*`)과 438행(`/neo-operation-room/*`)의 자산 규칙을 자산 경로로 좁힌다. 규칙 예산 91/100 안에서 한다.
- **통과 기준**
  - og:url이 canonical과 다른 페이지 0, 하위 페이지의 홈 og:title 0
  - JSON-LD 파싱 실패 0, @id당 @type 1개, `#organization` name 1개
  - robots.txt: 대표 UA 6종 × 경로 표본의 허용·차단 판정이 전후 같다
  - 사이트맵 밖 llms URL 0
  - `verify:fortune-hub-shell`, `flower-home-hreflang.test.mjs`, `static-shell-noindex.static.test.js` 통과
- **바뀌는 URL**: 없음. 사이트맵에서 일시중지 경로만 빠진다.

### D1 — 날짜 계약 (묶음 ①)

- `app/fortune/[period]/[sign]/page.tsx:162`: datePublished를 생성 시각(현재 이하)으로 바꾸고 dateModified를 더한다.
- `scripts/lib/fortune-date-contract.mjs:64`의 계약
  - datePublished는 빌드 시각 이하
  - 날짜는 대상일이거나 그 전날
  - dateModified 필수
- **통과 기준**
  - 배포 직후 내일 상세의 datePublished가 미래가 아니고 dateModified가 있다(ACTION-PLAN 4번).
  - `verify:fortune-period-axis`, `verify:fortune-freshness` 통과

### A1 — 엣지 (묶음 ②), `public/_worker.js`

- **언어 302 제거**
  - 지운다
    - `COUNTRY_LANGUAGE_GROUPS`(:51-56), `visitorLanguage`(:64-68)
    - `visitorCookie`(:70-74)·`visitorLocaleHeaders`(:90-96)의 `cd_geo_locale` 부분
    - `visitorLocaleContext`(:76-88)의 UA 정규식(:80)
    - `localizedHome`(:148-150)·`localizedEntry`(:705-709)의 국가 입력
    - 쿠키 블록(:767-770)의 언어 부분
  - 남긴다
    - `?lang=` 매핑(`LANGUAGE_PATHS` :58, 토픽 :61-62). `LocalizedFortuneHome.tsx:18`이 쓴다.
    - 기능 키 302(:142-162), `/index.html` 301, 레거시 301, 마커(:49)
    - `cd_geo_country`(:93)
  - Cache-Control: 사람 응답의 `private, no-store`를 `private` + `_headers` 지시로 바꿔 bfcache를 허용한다. 정확한 값은 `visitorCookie`·`visitorLocaleHeaders` 구현을 보고 정한다.
- **클라이언트의 `cd_geo_locale` 읽기 제거**
  - `lib/i18n/dictionary.ts:285-286`
  - `js/cd-lang-native.js:147-149`와 public 사본
  - `StoryEdition.tsx:19`
  - `public/codedestiny-novel.html:2296`
- **언어 제안 배너** `js/cd-lang-suggest.js`와 public 사본
  - `navigator.languages`를 페이지의 hreflang 대안과 맞춰 본다. 일반 `<a>` 링크와 닫기 버튼만 보여 준다.
  - 자동 이동은 없고, SSR 출력에도 없다.
  - `cd_locale_explicit`가 있거나 닫은 적이 있으면 띄우지 않는다.
  - 앱 페이지는 `app/layout.js`에서 `next/script` lazyOnload로, 정적 셸은 `cd-lang-native.js`가 불러온다.
- **리디렉션 한 번**
  - `removePublicContentVersion`(:117-135)을 `canonicalRedirect`로 바꾼다.
    - `//`를 접고 `v`를 뺀다.
    - ASSETS에 HEAD 1회로 슬래시 보정 Location을 받아 301 한 번으로 보낸다.
    - `:695-697`과 `//` 처리에 쓴다.
  - `:756` 뒤에 판단 1을 둔다(301·308 → 절대 URL 301).
- **RSS**: `mergeRssXml`(:451-468)에서 중복을 없애고, pubDate 내림차순으로 정렬하고, 60개로 자른다.
- **바꾸지 않는다**: `proxyApiRequest`, `_routes.json`, `worker/`, `js/core/checkout-entry.js`, 결제 테스트
- **테스트**
  - `__tests__/ui/visitor-country-routing.test.mjs`를 불변성 테스트로 바꾼다.
    - KR·US·JP·TW·VN × Chrome·Googlebot·Yeti에서 상태·Location·본문·Cache-Control이 같다.
    - `cd_geo_locale`은 0이고, `cd_geo_country` 값만 다르다.
  - `/?lang=en` → `/en/?lang=en`은 유지한다.
  - JSDOM 매트릭스와 `novel-language-switch.test.mjs:25,30,45`를 KR 기준으로 맞춘다.
- **통과 기준**
  - 위 불변성
  - 절대 Location 301 한 번: `/fortune/tomorrow/pig`, `?v=` 포함 URL, `//ggulggul/`
  - `test:worker:auth-payments`와 PayPal 테스트 통과
- **바뀌는 URL**
  - 해외 `/`·진입 경로: 302 → 200
  - 무슬래시: 308 → 301
  - `?v=`: 2단 → 1단
  - `//ggulggul/`: 200 → 301
  - HTML Cache-Control

### B — 색인 원장 (묶음 ③)

- `lib/seo/index-policy.mjs`를 만든다(목표 아키텍처 1).
- import로 바꿀 곳
  - `lib/seo/siteSeo.ts:371-374`
  - `scripts/generate-sitemap.mjs`(:108-126과 죽은 coreRoutes)
  - `scripts/static-canonical-route-map.mjs`, `scripts/lib/static-shell-route-meta.mjs`
  - `scripts/verify-adsense-readiness.mjs`, `app/robots.ts`, `scripts/generate-llms-txt.mjs`
- 대조만 할 곳: `public/_worker.js` 일시중지 목록, `public/_headers` X-Robots-Tag(:460-469)
- googleBot 중복 43곳을 상수로 바꾸고, robots meta를 1개로 줄인다.
- 판단 5의 안 쓰는 코드를 지운다. `git grep` 0건을 먼저 확인한다.
- **통과 기준**
  - 전 URL의 색인 상태 변화 0(전후 diff)
  - robots 계열 meta 1개
  - verify-dist의 원장 불일치 규칙을 실패로 올린다.

### A3 — hreflang (묶음 ③)

- 로케일 데이터(`lib/i18n/routes.ts:18-25`, `lib/i18n/locales.ts:35-72`)를 `.mjs`로 옮겨 빌드 스크립트와 앱이 함께 쓴다.
- `alternatesFor(path)`로 바꿀 곳
  - `lib/seo.ts:86-92`
  - `app/fortune/[period]/page.tsx:99-105`, `app/fortune/[period]/[sign]/page.tsx:135-141`
  - `lib/generate-page-metadata.ts:89-92·161-175`
  - `lib/seo/createI18nMetadata.ts:36`. 그 뒤 `createHreflang.ts`를 지운다.
  - `scripts/generate-sitemap.mjs:335-350·563-567·710-730`
  - `scripts/build-fortune-hub-shell.mjs:227-232`
- `index.html:943-954`는 고치지 않고 검사만 한다.
- 사이트맵의 `/fortune/`에 alternates를 더한다.
- 홈 묶음의 ko·x-default는 홈 역할을 정할 때(묶음 ④)까지 `/ggulggul/`로 둔다.
- **통과 기준**: HTML 집합과 사이트맵 집합이 같고, 상호 참조하며, x-default가 1개다. 감사 수치 100/80/8 → 0.

### E1 — 2027 신년 허브 측정 (묶음 ④)

- X-S1 기준으로 13쪽을 잰다.
  - SSR 본문 1,800자 이상
  - 12띠 사이 공유 본문 50% 미만
  - 고유 본문 40% 이상. 30% 미만이면 멈춘다.
- 미달한 쪽만 보강한다.

### C — 핵심 페이지 (묶음 ④, Codex 수집본 이후)

- GSC 검색어 × 페이지 데이터로 아래 잠정 매핑을 확정한다.
- title·H1·description은 묶음으로 바꾸고 `SEO_STATE.json`에 기록한다.
  - 대상: `app/page.js:46·58-65`, `/ggulggul/`(원본 `index.html`, head는 `scripts/lib/static-shell-route-meta.mjs`), `/saju/`, `/manse/`, `/ziwei/`, `/sukuyo/`, `/fortune/tomorrow/`, `ROOT_SEO`
- 무료 도구 진입을 첫 화면에 둔다. 디자인과 캐릭터는 유지한다.
- 홈 역할: `/`를 홈 hreflang 묶음의 ko·x-default로 바꿀지, `/ggulggul/`을 앱 진입점으로 둘지 Codex 데이터와 11/07 관찰로 정해 승인 패킷에 넣는다.

| 키워드(월 검색량) | 대상 URL | 의도 |
|---|---|---|
| 만세력 (140,300) | `/manse/` | 도구 |
| 사주 (모바일 83,000), 무료사주 (30,770) | `/saju/` | 도구 |
| 내일운세 (21,260) | `/fortune/tomorrow/` | 정보 |
| 자미두수 (13,700) | `/ziwei/` | 도구 |
| 2027신년운세 (1,010) | `/fortune/2027/` | 정보 → 구매 |
| 숙요점 (410) | `/sukuyo/` | 도구 |
| 꿀꿀 운세(브랜드) | `/` | 탐색 |

- **키워드 잠식 쌍(풀어야 할 대상)**
  - `/` ↔ `/ggulggul/`, `/` ↔ `/saju/`, `/saju/` ↔ `/manse/`
  - `/today/` ↔ `/fortune/today/`, `/fortune/today/` ↔ `/fortune/monthly/`
  - `/fortune/2027/` ↔ `/new-year-ai-consultation/`

### E2 — 내부 링크 (묶음 ④)

- 궁합 조합표(X-S3)를 만든다.
- 내부 링크가 2~3개뿐인 페이지 5개를 보강한다(`pr-ci.yml:990` internal-link-depth 기준).
- BreadcrumbList를 원장 기준으로 만든다.
- 심리테스트는 공유 본문 50% 미만을 실측한 것만 다시 색인한다.

### D2 — 날짜 페이지 본문 (묶음 ⑤)

- 같은 띠의 오늘↔내일 5-gram을 50% 미만으로 낮추고, 내일 페이지의 '오늘' 문구를 0으로 만든다.
- 미완성 번역 페이지는 원장으로 noindex하고 사이트맵·hreflang에서 뺀다(판단 11). 페이지는 지우지 않는다.
- 50~100쪽씩 승격하고 2~4주 색인 추이를 본다.

### F — 성능 (별도 승격)

- 실패 기준: 모바일 LCP 중앙값이 8쪽 중 4쪽 이상에서 4초를 넘는다. INP는 CrUX p75로 본다.
- 후보: 한국어 페이지의 ko.json 지연 로드, 동의 배너 축소, 렌더 차단 CSS 정리, `/ggulggul/` 모바일 LCP

## 배포 게이트 (묶음마다)

1. **작업**
   - `scripts/create-safe-worktree.ps1`(PowerShell `-NoProfile`)로 origin/main 기반 워크트리를 만든다.
   - 작은 커밋 → `npm run check:fast` → `npm run check:pre-push`. `git add` 전에 `git status`·`git diff --stat`을 본다.
   - lastmod 원장은 생성기로만 바꾸고 `verify:sitemap-drift`로 확인한다.
2. **로컬 증거**: `npm run build:cf`, verify-dist 전후 diff(URL × 신호 표), vm 하네스, 회귀 묶음
3. **승인 패킷**
   - 바뀌는 URL과 증거
   - 함께 실려 나갈 다른 세션 커밋(`git log <운영 SHA>..origin/main`)
   - 롤백할 SHA
4. **승인 → push**: 공유 main 절차를 따른다. `git log origin/main..main`을 보고, 내 커밋만 cherry-pick해 `git push origin HEAD:main`(fast-forward)으로 올린다.
5. **스테이징**
   - main CI를 1회 확인하고 `npm run verify:staging -- --sha=<40자리 SHA>`를 돌린다.
   - main이 남의 커밋으로 빨간색이면 그 커밋을 보고하고 위에 올리지 않는다.
6. **운영**: origin/main이 확인한 SHA와 같은지 본 뒤 `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`
7. **운영 확인**: `/version.json` SHA, 한국 IP 실측, `gh workflow run seo-operations.yml -f cycle=daily`(US 러너, 읽기 전용)
8. **기록**
   - `docs/seo/SEO_STATE.json`에 SHA·KST 시각·바뀐 URL을 남긴다. 낡은 `productionObservedSha`(06b0ad911)도 고친다.
   - 인수인계 문서를 갱신한다.

- **롤백**
  - 기본: `git revert <SHA>` → push → 운영 dispatch
  - `mode=rollback`은 다른 세션 작업까지 되돌리므로 비상시에만 쓴다.
  - force-push는 금지다.

## 검증

### verify-dist 규칙

| 규칙 | 실패로 올리는 단계 |
|---|---|
| 사이트맵 URL: 산출물 존재, 리디렉션 출발점 아님, noindex 아님, 자기 canonical | V0 |
| `/sitemap.xml`(빙이 읽음)과 `sitemap-index.xml` 하위 사이트맵의 URL 집합이 같다 | V0 |
| 절대 URL 자기 canonical 1개, H1 1개, 본문 있음 | V0 |
| 내부 링크 404 (리디렉션은 경고) | V0 |
| 홈 정체성 | V0 |
| 중복 title·description | 경고로 유지 |
| og:url이 있으면 canonical과 같다 | A2 |
| JSON-LD 문법, @id 그래프, 날짜 | A2·D1 |
| robots 계열 meta 1개, 원장 불일치 | B |
| hreflang 상호 참조, HTML = 사이트맵 | A3 |
| 오늘↔내일 5-gram | D2 |

### 운영 샘플 검사 — `scripts/check-seo-health.mjs` 확장 (매일 US 러너)

- **표본 약 40개**: 홈 6, 핵심 15, 로케일 허브 4, 파일 4(robots.txt·sitemap·llms·ads.txt), 리디렉션 탐침 8
  - 핵심 15: `/saju/` `/manse/` `/ziwei/` `/sukuyo/` `/fortune/`, 오늘·내일 허브와 띠 1개씩, `/fortune/2027/` `/today/` `/yeongnyangi/` `/new-year-ai-consultation/` `/about/` `/faq/`, 인사이트 1
- **검사**
  - 리디렉션을 따르지 않고 200
  - Chrome·모바일·Googlebot·Yeti가 같은 상태·Location·canonical·H1·hreflang을 받는다
  - `cd_geo_locale` 없음, `no-store` 아님
  - 리디렉션은 절대 URL 301 한 번
  - og:url, robots, hreflang ↔ 사이트맵, JSON-LD, 중복, 사이트맵 표본
- canonical 기대값은 항상 운영 호스트다. 스테이징에서는 noindex 검사를 건너뛴다.
- `/today/` 200 검사는 그대로 둔다.

### 회귀 묶음 (묶음마다)

`test:worker:auth-payments`, `smoke:core`, `verify:portone-single-payment`, `paypal-ui.test.js`, 라이브러리 테스트, `core-landing-calculation-examples.test.mjs`, `verify:fortune-period-axis`, `verify:fortune-freshness`, `deploy:critical`, `verify:ads-txt`

### 그대로 두는 검사

verify-adsense-readiness, verify-redirects-budget, sitemap-drift(`pr-ci.yml:254`), `pr-ci.yml:964-990`의 4종, seo-public-inventory, 월간 전체 크롤

### 실제 검색엔진 확인

- **구글**: 승격 뒤 Codex가 핵심 URL 검사와 실제 URL 테스트 HTML을 다시 받는다. 해외 302가 사라졌는지도 본다. 사이트맵 재제출·수집 요청은 사용자가 승인한 건만 한다.
- **네이버**: 서치어드바이저 수집 로그, 웹 페이지 최적화 진단, Yeti UA 실측
- **빙·네이버**: 운영 배포마다 IndexNow 변경분 제출(`scripts/indexnow-submit.mjs`)이 실제로 나갔는지 로그로 확인한다.

## KPI와 성과 확인

- **저장**: 원자료는 `D:\Development\seo-data\code-destiny\<날짜>\`에 둔다. `docs/seo/SEO_STATE.json`에는 경로와 승격 기록만 남긴다.
- **지표** (페이지 그룹 × 브랜드/일반 검색어로 나눈다)
  - 구글·네이버 노출, 클릭, CTR, 평균 순위
  - 원장상 색인 대상인 핵심 페이지의 색인 비율
  - GA4 자연 검색 활성 사용자
  - 자연 검색 → 무료 기능: free_saju_started/completed, free_feature_start, free_result_view
  - 자연 검색 → 결제: checkout_opened, begin_checkout, purchase
- **비교 방법**
  - 7일(수집·CTR), 28일(순위·클릭), 90일(매출)
  - 손대지 않은 페이지 그룹과 이중 차분으로 비교한다.
  - 노출 100 미만은 '데이터 부족'으로 표시한다.
  - 다른 세션 배포 시점을 표시한다. 신년 시즌에는 전년 동기를 보조로 본다.
- 매출 퍼널(`scripts/report-revenue-funnel.mjs`)은 운영 DB를 읽으므로 실행할 때마다 승인을 받는다.
- 추정치를 실제 성과로 보고하지 않는다.

## 작업 경계

- **수정 금지**: `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, `worker/wrangler.toml` 구조. `ads.txt`는 지우지 않는다.
- **건드리지 않음**: 결제·이용권·인증·DB·운세 계산 로직, 메인 디자인·캐릭터. LLM 실호출 없음.
- **금지**: 클로킹, 대량 자동 생성, 허위 구조화 데이터(리뷰·평점·자격), 새 FAQPage·HowTo, 인위적 백링크
- **권한**
  - 운영 배포는 묶음 승인 때만 한다.
  - 계정 제출(사이트맵 재제출·수집 요청)은 사용자가 승인한 건만 한다.
  - 워크플로 변경(T1, seo-operations 입력)은 따로 승인받는다.
- **병합 주의**: `wt/infra-deploy-20261031-190620`이 `index.html`(:974, :983, :1105 이후)과 `package.json` ~:188을 건드린다. 새 package.json 스크립트는 :188에서 떨어진 곳에 둔다.
- **보장하지 않음**: 순위, 색인 시점

## 진행 방식

1. 승인 직후(2026-11-01) 설계 문서와 인수인계 문서를 워크트리 브랜치 `wt/seo-architecture-rebuild-20261101-135310`에 커밋했다. push는 보류했다.
2. 구현은 새 세션에서 인수인계 문서로 이어 간다.
   - superpowers:writing-plans로 묶음 ① 작업 계획을 만든다.
   - 그다음 구현 → 배포 게이트 순서로 간다.
3. Codex 수집본이 도착하면 원인 판정표와 묶음 ④의 매핑을 확정한다.
4. 다 끝나면 워크트리를 정리한다: junction 해제 → `git worktree remove` → 병합된 `wt/*` 삭제

## 최종 산출물

- SEO 감사 보고서: 문제별 근거, 심각도, 영향
- 아키텍처 변경 보고서: 제거·통합·신규 코드
- 페이지별 SEO 매핑: 키워드, 의도, URL, title, H1, canonical, 색인 정책
- 기술 검증 결과: HTML, 수집, 색인 설정, 성능, 회귀
- 운영 배포 결과: 커밋, 배포 상태, 검증 URL, 롤백 방법
- 검색 유입 개선 계획: 우선순위와 KPI

## 후속 과제 (범위 밖, 보고만)

- `/api/version`과 `/version.json`이 SHA·커밋 메시지를 노출한다.
- `codedestiny-5md.pages.dev`에 noindex가 없다. canonical이 운영을 가리켜 위험은 낮다.
- API 호스트에 별도 `/sitemap.xml`이 있다(`worker/routes/content.js:371`).
- 운영 dispatch에 ref 검사가 없다.
- `/yeongnyangi/free-fortune` 302를 영구로 둘지 정해야 한다.
- ETag는 zone의 봇 JavaScript 감지가 지운다. 보안 기능은 유지하기를 권한다.
- T1 자정 지연: 7일 측정한 뒤 워크플로 변경 승인을 요청한다.
- 대체된 기존 검사는 10회 shadow 뒤에 지운다.
- 낡은 문서: `ARCHITECTURE.md:9,37`, `docs/ROUTE_MAP.md`, `docs/seo-deploy-checklist.md`, 배포 워크플로 주석 ~:669, `verify-www-canonical.mjs:14`
- RSS 원본 피드의 갱신 체계
- 미병합 브랜치(보고만): `wt/seo-five-elements-20261011-20261011-235701`, `wt/infra-*`
- 코드 밖: 외부 프로필 sameAs 통일, 보도 운영사명 정정, 네이버 블로그 운영

## 근거 부록

### 1. 네이버 하락 — 이력 감사(C)

- 일 노출 45,458(10/07) → 26,944(10/08). 주간 270,008(10/03~09) → 165,417(10/10~16) → 약 124k(~10/21)
- 10/08 05:26 운영 반영 `f610e521f`에 세 변경이 함께 실렸다.
  - `8d9843c1b`: `/fortune/date/*`를 noindex로 바꾸고 사이트맵에서 361 URL을 뺐다(sitemap-ko 814 → 453).
  - `c6e9cfe7b`: 국가별 302를 넣었다. Yeti 예외는 10/23 `952a76208`에서야 들어갔다.
  - `b34d8dc7b`: 내일 운세를 오늘 출력의 '오늘'→'내일' 치환으로 만들었다. 이 페이지들이 네이버 상위였다(내일 쥐띠 330클릭/47,464노출).
- 앞뒤로 겹친 변경: title 교체(10/03, 10/07), `/` 301(10/02~10/16), '꿀꿀 사주' 개명(10/10~10/16)
- 복구: 10/16 브랜드와 `/` 200 복원, 10/23 `?v=` 제거·301 통합·Yeti 예외. 10/22 이후 네이버 데이터가 없어 효과는 아직 모른다.
- 서치어드바이저: 중복 title 1,519(09/20) → 330, 중복 description 332(10/18, 원인은 `?v=` URL)

### 2. 구글·빙 — 이력 감사(C)

- 10/04 제외 사유: 발견됨-미색인 931, 크롤링됨-미색인 249, 404 765, 리디렉션 296, noindex 107
- 원인 후보
  - 도메인 나이(2026-03-01 등록)
  - URL 대량 생성·폐기: 09/11 날짜 URL +372, 09/14 로케일 URL +400, 이후 대량 noindex·301
  - 홈 URL 변경 반복
  - 로케일·오늘/내일 유사(5-gram 62%)
- lastmod 생성기는 정상이다. 운영본 → main 383건 중 376건은 본문이 매일 바뀌는 날짜형 운세이고, 7건은 실제 코드 변경이다.
- 빙: `/sitemap.xml`을 읽는다. 지금은 1,037 URL로 인덱스와 수가 같다. 28일 클릭 13, 노출 555, Copilot 인용 78회(10/12)

### 3. 크롤러 접근 — 워커 실행 검증 (origin/main 워커, 국가 US)

| UA | `/` `/saju/` `/tarot/` `/ziwei/` `/ggulggul/` | `/manse/` `/fortune/today/` |
|---|---|---|
| Googlebot, bingbot, Yeti | 200 | 200 |
| Google-InspectionTool(GSC 실제 URL 테스트) | 302 → `/en/…` + 쿠키 | 200 + 쿠키 |
| Mediapartners-Google(애드센스) | 302 → `/en/…` + 쿠키 | 200 + 쿠키 |
| GoogleOther, Perplexity-User, 일반 사용자 | 302 → `/en/…` + 쿠키 | 200 + 쿠키 |

- 원인: `visitorLocaleContext`가 봇을 UA 정규식으로만 예외 처리한다.
- 302가 없는 한국어 URL에서도 `cd_geo_locale` 쿠키가 있으면 클라이언트가 화면 언어를 바꾼다(`lib/i18n/dictionary.ts` `detectLocale`, `js/cd-lang-native.js` `getSavedLang`).
- 구글 다국어 가이드(추정 언어로 자동 리디렉션하지 말 것)와 사용자 지침(강제 리다이렉트 최소화, 클로킹 금지)에 어긋난다.

### 4. 운영 실측(B) — 사이트맵 1,037 URL (11/01, 한국 IP, 빌드 2a6ca424)

- **정상**
  - 전 URL 200, 자기 canonical. title·description 고유, H1 1개, lang 일치.
  - JSON-LD 파싱 오류 0(BreadcrumbList 954, Article 741, FAQPage 628)
  - 없는 페이지는 실제 404. http·www·`/index.html`은 301 한 번.
- **문제**
  1. HTML에 ETag가 없다. zone의 봇 JavaScript 감지(`__CF$cv$params`)가 지운다. pages.dev에는 있다.
  2. 봇 예외 정규식이 Google-InspectionTool과 Mediapartners-Google을 놓친다.
  3. og:url이 홈을 가리키는 8쪽: /consultation-samples/, /neo-operation-room/, /saju-fpti/, /saju/animal-destiny/, /saju/destiny-meeting-place/, /saju/sibyl/, /tarot/numerology/, /tarot/self-esteem/
  4. 사이트맵의 `/fortune/`에 hreflang이 없어 단방향 주석이 8개 생긴다.
  5. HTML↔사이트맵 hreflang 불일치 181 URL. 한국어 운세 100쪽은 HTML에 x-default가 없고, 핵심 80쪽은 지역 코드가 사이트맵에만 있다.
  6. `_headers` 423·438행 자산 규칙이 `/music/guide/`·`/neo-operation-room/` HTML에 걸린다.
  7. robots meta가 2개인 페이지 1,030쪽
  8. `//ggulggul/`이 200을 낸다.
  9. llms.txt가 noindex인 `/fusion-fortune/`을 링크한다.
  10. RSS가 중복되고 멈췄다(43개, 최신 09-09).
  11. title 브랜드 표기가 섞였다: '꿀꿀 운세' 97, '꿀꿀운세' 75, 없음 364, 404는 'Code Destiny'
  12. `/api/version`·`/version.json` 정보 노출(후속 과제)
  13. pages.dev에 noindex 없음(후속 과제)
- **확정 전 신호**
  - JS 실행 후 본문 감소: `/ggulggul/` 26,044 → 13,520자, `/en/` 50,148 → 26,626자
  - 로케일 홈 HTML 690~805KB
  - 유사도: 월간↔오늘 허브 0.83~0.95, en 오늘↔내일 0.81, 유명인 사주 중앙값 0.52·최대 0.75
  - 내부 링크 2~3개 페이지 5개, robots.txt 중복 그룹 17개와 `Host:`, 사람 응답 `private, no-store`
- **사이트맵**
  - robots.txt는 `sitemap-index.xml`만 선언한다.
  - ko 536(그중 410은 hreflang 없음), ja 128, en 127, zh 127, zh-tw 119
  - HTML 응답 중앙값 0.67초, 캐시 상태 전부 DYNAMIC

### 5. 코드 구조(A) 요점

- Next.js 정적 export(`next.config.mjs:160`, trailingSlash :194), 미들웨어 없음.
- HTML은 Pages 고급 모드 워커 `public/_worker.js`를 거친다. 운영 `/api/*`는 zone 라우트로 API 워커(`worker/`)가 받는다.
- 홈이 둘이다. `/`(`app/page.js`, hreflang 없음)와 `/ggulggul/`(3.1MB 셸 `index.html`) 모두 색인되고 priority 1.0이다. 홈 hreflang의 ko·x-default는 `/ggulggul/`이다.
- 메타 헬퍼 4종: `lib/seo.ts`, `lib/generate-page-metadata.ts`, `lib/seo/createI18nMetadata.ts`, `lib/seo/createHreflang.ts`. 끝 슬래시 규칙이 서로 반대다(`siteSeo.ts:477-481` 대 `seo.v2.ts:108-122`).
- robots.txt 출처가 둘이다. 배포는 `app/robots.ts`이고, 루트·`public/` 사본은 낡았다.
- html lang은 SSR이 늘 `ko`를 내고 postbuild 정규식이 고친다.
- IndexNow는 운영 배포마다 변경분만 제출한다(빙·네이버. 구글은 쓰지 않는다).

### 6. 원인 판정 (잠정 — Codex 데이터로 확정)

| 가설 | 판정 | 근거 |
|---|---|---|
| 수집 차단(robots·WAF·5xx) | 낮음 | 전 URL 200, 주요 봇 200. WAF 이벤트는 Cloudflare 수집본으로 확인한다. |
| 렌더링(JS 의존) | 낮음 | 정적 SSR 본문이 있다. JS 실행 후 본문 감소는 GSC로 확인한다. |
| 색인 신호 혼선 | 높음 | 홈 이원화, URL 대량 생성·폐기, 해외 302, hreflang 불일치, og:url |
| 콘텐츠 품질·중복 | 높음 | 내일 페이지 본문 교체, 오늘↔내일·월간↔오늘·로케일 유사도 |
| 경쟁력·권위 | 중간 | 2026-03 등록 도메인, 적은 외부 언급(코드 밖 과제) |

### 7. 정본 규칙 (`docs/context/seo-and-adsense.md`)

- 색인 정책 다섯 곳은 서로 맞아야 한다. 원장(B)으로 묶는다.
  - `static-canonical-route-map.mjs`, `generate-sitemap.mjs`의 noindexPathPrefixes, `siteSeo.ts`의 noindexPathPrefixes, `_headers` X-Robots-Tag(규칙 예산 100), `verify-adsense-readiness.mjs`
- 광고를 못 붙이는 색인 경로는 SSR 본문 1,800자 이상. 광고 경로는 사이트맵에 있고, 자기 canonical이며, index다.
- 정적 셸 head의 단일 출처는 `scripts/lib/static-shell-route-meta.mjs`다.
- lastmod는 생성기로만 바꾼다. 배포·PR마다 전체 크롤을 붙이지 않는다.
- 허구 저자·리뷰·FAQ 금지. FAQ 리치 결과는 2026-05-07에 종료됐다. HowTo는 쓰지 않는다. CWV는 INP로 본다.
