# SEO · AdSense · i18n 인수인계

상태: 2026-09-08. 핵심 기술 SEO와 공개 소개/신뢰 페이지 구현 완료, 전체 다국어 작업은 미완료. 배포·PR·머지·GSC 제출·AdSense 재신청은 실행하지 않았다.

## 작업 위치
- 워크트리: `D:/Development/code-destiny-seo-20260908`
- 브랜치: `codex/seo-adsense-i18n-20260908`, 기준 `b2244641d`
- 원래 `D:/Development/code-destiny`의 미커밋 변경과 기존 21개 워크트리는 보존했다. 공통 홈·번역·package.json 통합 시 다른 작업과 비교 필요.

## 완료한 작업
1. 기존 canonical sitemap과 lastmod 원장을 재사용해 ko/ja/en/zh/zh-tw 분할 sitemap 생성. robots에 6개 sitemap 등록, 불필요 경로 차단 보강.
2. hreflang 후행 슬래시 정규화, 외국어 metadata에서 한국어 공통 키워드 제거. 기존 무료 범위를 새로 확대하지 않음.
3. ja/en/zh About·Contact·Disclaimer·FAQ 12페이지 추가. FAQ는 각 언어 12문항. 기존 정책 본문과 canonical을 재사용하는 terms/privacy/refund 별칭 추가.
4. ja/en/zh 사주·베다·서양 점성술·타로 소개 12페이지 추가. 한국어 원본과 reciprocal hreflang 연결. 실제 입력·결과·활용법·한계·공개 설명 범위·FAQ를 작성.
5. 기존 ziwei/sukuyo/today/insights의 ja/en/zh 본문과 ko insights 보강. 번체는 기존 상태 유지.
6. React 푸터와 정적 홈의 신뢰/정책 링크 현지화. 모바일 내비 초기 HTML 번역, 자미두수·숙요 CTA 자기순환 해소, 나침반 본문 낮은 대비 제거.
7. 4개 언어 사전의 근거 미확인 이용자수·국가수·평점·보안 인증 표현을 중립 문구로 교체. 실제 가격·혜택·환불 조건은 유지.
8. 정적 홈 CSS의 한국어 프로필 제목과 서비스 탐색 안내를 사전 기반으로 번역. 동일 2개 키를 12개 사전에 추가해 key parity 유지.
9. 오프라인 전수 HTML 감사, sitemap/소개 콘텐츠 회귀 테스트, 외부/API 요청을 차단하는 모바일 smoke 및 Lighthouse 스크립트 추가.

## 검증 결과
- `npm run build:cf`: 성공. 동일 Next 산출물에서 프로필 런타임 번역을 되돌린 후 `npm run sync:public`과 `npm run postbuild` 재실행 성공. dist는 되돌림 후 소스와 일치한다.
- `npm run seo:audit:complete -- --strict`: HTML787개 / 색인476개 / 누락0 / title·description·H1·canonical·hreflang·noindex 기술 오류0. 편집 검토29개는 언어 선택기의 한국어 표기·등록 사업자명·번체 짧은 본문 등이 포함됨.
- `npm run sitemap:check`: 476 URLs, 정본/locale 파일 재생성 일치.
- `node scripts/generate-mobile-nav-copy.mjs --check`: 10 keys × 4 locales 통과.
- `node --test __tests__/ui/seo-trust-locales.test.js`: 3 tests 통과.
- `npm run i18n:check`: 명령 통과. 12개 사전 key parity가 번역 품질 완성을 의미하지 않는다. ko 커버리지58.9%, 기존 no-fallback 경고 존재.
- `npm run verify:payment-choice-parity` / `npm run verify:payment-freeze`: 통과. js/destiny-profile.js, app/_lib/billing-client.ts, worker/, package-lock.json의 이번 작업 diff 없음.
- `npm run seo:smoke -- --lighthouse`: 최종 exit0. 476 URLs 모두200, 누락 경로404, 28개 viewport 조합 가로 넘침0/JS예외0. Lighthouse SEO는 /ja/, /ja/about/, /ja/saju/ 각100점. Windows Chrome 임시 프로필 정리 EPERM은 프로필을 보존하는 경고로 처리했다.
- `npm run check:fast -- --base=HEAD`: 최종 exit0. lint/typecheck, Node 878 tests, 소스/결제/배포 가드, worker dry-run, Jest217 suites/2402 tests 통과. 중간의 캐시 핀 실패를 일으킨 프로필 JS 번역은 되돌리고 재검증했다.
- Impeccable detector: 새 서버 컴포넌트 3개에서 항목0.

## 모바일에서 남은 문제
- /ja/about, /ja/faq, /ja/saju, /ja/sukuyo, /en/about, /zh/about 샘플: 본문 한국어 혼입0, CLS0.
- /ja/ 홈: 동적 프로필의 연속일·퀘스트·로그인 안내와 손금 이름 일부가 한국어. 로컬390px/초기1.2초 관측 CLS 약0.2135. 이는 현장 Core Web Vitals 수치가 아니다.
- 프로필 퀘스트 번역을 시도했으나 해당 파일이 결제 런타임과 공유되어 billing-client 및 독립 페이지 캐시 참조 갱신까지 필요했다. 결제 경계를 보존하려고 js/destiny-profile.js 변경을 전부 되돌렸다. 가드를 약화하거나 결제 파일을 수정하지 않았다.
- 정적 홈의 모바일 hero 문장 잘림과 쿠키 안내/하단 내비 주변 여백은 추가 점검 필요. 새 소개·신뢰 페이지에는 가로 넘침이 없었다.

## 미완료 작업
1. 초융합 사주·찻집·오늘의 귀인·나침반·심리/성향·별도 숙요 궁합의 모든 언어 본문. 기존 한국어 공개 소개가 있더라도 외국어 전체 대응을 완료한 것은 아님.
2. 모든 모달·토스트·오류·온보딩·결과 문구의 전수 현지화. 하드코딩 후보12390건에는 한국어 전용 기사·관리자·fixture·결제 보호 파일이 섞여 있다.
3. 번체의 ziwei/sukuyo/today/insights 짧은 본문. 없는 번체 trust/소개 번역을 hreflang에 억지로 추가하지 않았다.
4. 운영 GSC 제외 사유, Google 선택 canonical, Googlebot 실제 렌더링/Cloudflare 차단 여부. 관련 connector 없음. 실제 AdSense 거절 사유 미확인.
5. 운영 연락처 수신 가능 여부, 경력 증빙, 실제 후기·통계의 진위, 광고/동의 운영 설정 검토.
6. 배포 후 실제 URL 응답·sitemap 제출·색인 요청·AdSense 재신청. 이번 세션에서는 미실행.

## 추가 언어 운영 판단
- 번역 사전12개, 검색용 독립 URL은 ko/ja/en/zh/zh-tw 5개 언어다. de/es/fr/hi/ms/nl/vi는 주로 언어 선택기와 사전 지원으로, 사전 삭제가 색인 URL 제거와 같지 않다.
- 사용자는 나머지 언어 폐기가 나은지 질문했다. 권고는 한·일 우선 완성, 영어·중국어 품질 확인 후 유지, 나머지7개 신규 확장 보류 및 번역 자산 보관이다.
- 사용자 질문은 삭제나 일괄 noindex 승인으로 간주하지 않았다. 언어 선택기·라우트·기존 사용자 설정을 제거하지 않았다.
- 공식 지원을 축소할 경우 언어별 방문/전환, 사용자 기존 선택, 결과/오류/정책의 번역 완성도부터 확인한다. 메뉴만 번역된 상태를 완성으로 판단하지 않는다.
- 근거: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites

## 다음 세션 명령
```powershell
Set-Location D:/Development/code-destiny-seo-20260908
git status --short
Get-Content seo-check-fast.log -Tail 12
Get-Content seo-smoke.log -Tail 12
npm run seo:audit:complete -- --strict
npm run sitemap:check
node --test __tests__/ui/seo-trust-locales.test.js
npm run check:fast -- --plan --base=HEAD
npm run check:fast -- --base=HEAD
```
정적 산출물을 새로 만들 때만:
```powershell
$env:ALLOW_DEV_SERVER_DURING_BUILD='1'
$env:SITEMAP_USE_INSIGHTS_API='0'
npm run build:cf
npm run seo:smoke -- --lighthouse
```
ALLOW_DEV_SERVER_DURING_BUILD는 별도 공유 체크아웃 dev server 때문에 이 격리 빌드에만 사용했다. 공유 서버를 종료하거나 공유 .next를 삭제하지 않는다.

## 회귀 주의와 금지 영역
- app/page.js는 운영 홈 정본이 아니다. index.html → sync/prerender/promote 경로를 사용. 생성 public HTML 직접 편집 금지.
- index.html 및 일부 JS의 diff는 sync가 갱신한 콘텐츠 해시 쿼리다. 수동 캐시 참조와 자동 참조는 구분한다.
- lastmod를 실행일로 일괄 갱신하지 않는다. 기존 원장과 콘텐츠 해시를 유지한다.
- noindex와 robots Disallow는 같은 의미가 아니다. 결제·인증 접근 정책을 색인 목적으로 개방하지 않는다.
- 기존 약관·개인정보·환불 본문/시행일/정책 의미 변경 금지.
- 절대 건드리지 말 것: 결제 로직, 이용권 차감, PG, PortOne/KG이니시스, 결제 성공/실패/resume, 실제 LLM 호출, 실결제/운영 DB 테스트, 가짜 리뷰, cloaking, keyword stuffing.
- 브라우저 smoke는 dist만 제공하고 외부/API/쓰기 요청을 mock503으로 차단. Lighthouse는 외부 통신 불가 proxy로 격리. 실제 API 폴백 금지.

## 문서/산출물
- SEO_ADSENSE_AUDIT.md: route별 최초 HTML 표, 관측/조치/남은 위험.
- I18N_TRANSLATION_MATRIX.md: route별 언어/본문/meta 상태와 하드코딩 후보. 런타임 전수 검증은 미완료로 표기.
- GOOGLE_INDEXING_CHECKLIST.md: 운영 제출/URL검사 순서.
- ADSENSE_APPROVAL_CHECKLIST.md: 재신청 전 운영 확인사항.
- seo-qa/: 재생성 가능한 JSON, viewport PNG, Lighthouse 결과. gitignore 대상이며 로컬 증거용.
- seo-*.log: 로컬 실행 기록. 결과 요약은 본 문서에 보존.
- 관련 없는 RSS 빌드 날짜 변경 4개는 원복했다. index.html 및 캐시 참조 JS7개의 변경은 ?v= 값만임을 HEAD와 정규화 비교로 확인했다.

## 수정 파일 (추적 파일)
- `.gitignore`
- `.ignore`
- `app/[locale]/insights/page.js`
- `app/about/page.js`
- `app/astrology/page.js`
- `app/components/I18nSeoPageTemplate.jsx`
- `app/components/LocaleFooterHub.jsx`
- `app/components/MobileBottomNav.tsx`
- `app/contact/page.js`
- `app/destiny-compass/page.tsx`
- `app/disclaimer/page.js`
- `app/faq/page.js`
- `app/insights/page.js`
- `app/robots.ts`
- `app/saju/page.js`
- `app/tarot/page.js`
- `app/vedic/page.js`
- `config/sitemap-lastmod.json`
- `index.html`
- `js/app.js`
- `js/core/bootstrapDestinyFlower.js`
- `js/core/home-service-finder.js`
- `js/core/index-inline-runtime.js`
- `js/core/init.js`
- `js/core/uiBindings.js`
- `js/mobile-interaction-patch.js`
- `lib/generate-page-metadata.ts`
- `lib/seo/createHreflang.ts`
- `lib/seo/createI18nMetadata.ts`
- `lib/seo/i18nKeywords.ts`
- `package.json`
- `public/en/index.html`
- `public/i18n/de.json`
- `public/i18n/en.json`
- `public/i18n/es.json`
- `public/i18n/fr.json`
- `public/i18n/hi.json`
- `public/i18n/ja.json`
- `public/i18n/ko.json`
- `public/i18n/ms.json`
- `public/i18n/nl.json`
- `public/i18n/vi.json`
- `public/i18n/zh-cn.json`
- `public/i18n/zh-tw.json`
- `public/index.html`
- `public/ja/index.html`
- `public/js/app.js`
- `public/js/core/bootstrapDestinyFlower.js`
- `public/js/core/home-service-finder.js`
- `public/js/core/index-inline-runtime.js`
- `public/js/core/init.js`
- `public/js/core/uiBindings.js`
- `public/js/mobile-interaction-patch.js`
- `public/robots.txt`
- `public/sitemap.xml`
- `public/static/index.html`
- `public/zh-tw/index.html`
- `public/zh/index.html`
- `robots.txt`
- `scripts/generate-sitemap.mjs`
- `scripts/sync-legacy-static-to-public.mjs`
- `scripts/verify-adsense-readiness.mjs`
- `sitemap.xml`

## 생성 파일
- `ADSENSE_APPROVAL_CHECKLIST.md`
- `GOOGLE_INDEXING_CHECKLIST.md`
- `HANDOFF_SEO_ADSENSE_I18N.md`
- `I18N_TRANSLATION_MATRIX.md`
- `SEO_ADSENSE_AUDIT.md`
- `__tests__/ui/seo-trust-locales.test.js`
- `app/[locale]/about/page.js`
- `app/[locale]/astrology/page.js`
- `app/[locale]/contact/page.js`
- `app/[locale]/disclaimer/page.js`
- `app/[locale]/faq/page.js`
- `app/[locale]/privacy/page.js`
- `app/[locale]/refund/page.js`
- `app/[locale]/saju/page.js`
- `app/[locale]/tarot/page.js`
- `app/[locale]/terms/page.js`
- `app/[locale]/vedic/page.js`
- `app/components/LocalizedTrustPage.jsx`
- `app/components/PublicFeatureIntroduction.jsx`
- `app/components/PublicReadingGuide.jsx`
- `app/refund/page.js`
- `lib/i18n/feature-introductions.mjs`
- `lib/i18n/mobile-nav-ssr-copy.ts`
- `lib/i18n/public-reading-copy.mjs`
- `lib/i18n/public-trust-copy.mjs`
- `public/sitemap-en.xml`
- `public/sitemap-ja.xml`
- `public/sitemap-ko.xml`
- `public/sitemap-zh-tw.xml`
- `public/sitemap-zh.xml`
- `scripts/audit-seo-adsense-i18n.mjs`
- `scripts/generate-mobile-nav-copy.mjs`
- `scripts/lib/locale-sitemaps.mjs`
- `scripts/seo-public-smoke.mjs`
- `sitemap-en.xml`
- `sitemap-ja.xml`
- `sitemap-ko.xml`
- `sitemap-zh-tw.xml`
- `sitemap-zh.xml`

## 2026-09-08 추가 진행: 공개 소개 확장·색인 경계

### 이번에 완료한 작업
- `ja/en/zh`에 운명의 찻집, 운명의 나침반, 심리테스트, 숙요 궁합 상담의 공개 소개 페이지를 각 1개씩 추가했다(총 12 URL).
- 각 소개에는 실제 입력/해석 방식/활용 방법/한계와 공개 안내를 넣었고, CTA는 결제 흐름이 아닌 기존 기능의 정식 URL만 가리킨다.
- 한국어 원본 4개 페이지에 reciprocal hreflang을 연결했고, sitemap 생성기로 루트·public·언어별 sitemap을 488 URL로 동기화했다.
- 번체 기존 색인 허브(`home`, `ziwei`, `sukuyo`, `today`)에 읽기용 안내 문단과 FAQ를 보강했다. 번체 신규 소개 URL은 만들지 않았다.
- `SEO_INDEXABLE_LOCALES`의 허용 범위(ko/ja/zh/zh-TW/en)를 회귀 테스트로 고정했다. `de/es/fr/hi/ms/nl/vi`는 언어 선택기와 사전을 보존하지만 sitemap·hreflang 색인 대상이 아니다.

### 검증 완료
- `node --test __tests__/ui/seo-trust-locales.test.js` — 5개 통과.
- `npm run sitemap:check` — 488 URLs, 생성 결과와 추적본 일치.
- `npm run i18n:check` — 통과. 기존 한국어 fallback 인자 경고는 기준선 비교상 통과이며 이번 변경에서 추가하지 않았다.
- `npm run check:fast -- --plan --base=HEAD` 및 `npm run check:fast -- --base=HEAD` 실행 완료.
- Impeccable 정적 detector — 신규 공개 소개 UI 대상 0건.

### 남은 작업
1. 정적 산출물 기준으로 `npm run build:cf`, `npm run seo:audit:complete -- --strict`, `npm run seo:smoke -- --lighthouse`를 재실행한다. 빌드 시 기존 격리 환경 변수와 외부/API 차단 smoke 계약을 유지한다.
2. 외국어 런타임 모달·토스트·오류·온보딩·결과 문구의 전수 현지화는 아직 미완료다. 결제 보호 파일과 실제 LLM/PG 경계는 변경 대상에서 제외하고, 실제 노출 경로부터 좁혀 진행한다.
3. `/ja/` 홈의 동적 프로필 한국어 혼입·초기 CLS, 정적 홈 mobile hero/쿠키 안내/하단 내비 여백은 별도 모바일 작업으로 남아 있다.
4. 운영 GSC 제외 사유·선택 canonical·Googlebot 실제 렌더·Cloudflare 차단 여부, 운영 연락처·증빙·광고/동의 설정, sitemap 제출·색인 요청·AdSense 재신청은 배포 후 운영 권한으로 수행한다.

### 다음 세션 권장 명령
```powershell
Set-Location D:/Development/code-destiny-seo-20260908
npm run sitemap:check
node --test __tests__/ui/seo-trust-locales.test.js
$env:ALLOW_DEV_SERVER_DURING_BUILD='1'
$env:SITEMAP_USE_INSIGHTS_API='0'
npm run build:cf
npm run seo:audit:complete -- --strict
npm run seo:smoke -- --lighthouse
```
