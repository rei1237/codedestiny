# 꿀꿀운세 브랜드 검색 정비 — 2026-10-13

## 목표와 범위
사용자 요청: 카카오 채널 이름과 일치하도록 서비스명을 꿀꿀운세로 복원하고, Google·Naver 브랜드 검색을 개선한다. 첨부 이미지의 seo-audit, programmatic-seo, content-strategy 지침을 적용한다.

## 감사 근거와 우선순위
- P1: 운영 /ggulggul/ title·og:site_name은 꿀꿀 사주, /kkul-kkul-unse/는 꿀꿀 운세는 이제 꿀꿀 사주예요라고 안내한다. 요청한 브랜드와 반대인 신호를 삭제하고 공식명 꿀꿀운세로 통일한다.
- P1: 개명 안내 페이지는 공식 주소·카카오 채널·기존 계정·서비스 이용 FAQ로 다시 작성한다. 홈은 브랜드 탐색, 안내는 이용 방법으로 의도를 분리한다.
- P2: 한국어 화면·제목·공유 이미지·manifest·정적 미러·런타임 사전을 함께 갱신한다. 과거 이름은 필요한 별칭/이력에서만 유지한다.
- 2026-10-13 수정 전 읽기 전용 실측: /는 /ggulggul/로 이동, /ggulggul/·/kkul-kkul-unse/·/saju/ 모두 200, self-canonical, index follow, H1 1개. robots.txt와 sitemap-index.xml은 200. 이 표본에서는 홈 전체 수집 차단 근거가 없다.
- 홈 HTML 약 669천 문자: 큰 셸 비용은 후속 성능 측정 대상이다. 문자 수만으로 순위 하락 원인을 단정하거나 런타임을 삭제하지 않는다.
- GSC·네이버 로그인 보고서 및 현재 검색 순위는 이번 진단에서 확보하지 못했다. 일반 웹 검색은 Google/Naver 순위 증거가 아니다.

## 콘텐츠 전략 / programmatic-seo 적용
| 검색 의도 | 대표 페이지 | 고유 가치 |
| --- | --- | --- |
| 꿀꿀운세 브랜드 탐색 | /ggulggul/ | 바로 상담·도구를 선택하는 공식 홈 |
| 공식 주소·카카오·이용 방법 | /kkul-kkul-unse/ | 공식 채널 링크, 이름 관계, 기능별 입구 |
| 사주 계산 이해 | /saju/, /manse/ | 시간 보정·오행·십성 설명과 실제 계산 연결 |
| 관계와 선택 | /tarot/ | 질문 종류별 타로 입구와 해석 범위 |
| 오늘·내일 흐름 | /today/, /fortune/tomorrow/ | 날짜·체계별 실제 도구와 행동 안내 |

새 키워드만 바꾼 대량 페이지를 추가하지 않는다. 기존 날짜/띠별 페이지 삭제나 noindex는 실제 수집 상태·유입·고유 콘텐츠 표본이 확보된 뒤 결정한다. URL·canonical·robots 정책과 기존 링크를 유지한다.

## 유지 경계
결제 가격/정책, 이용권·월정석·단건 결제, 인증·API·DB·보관함 소유권은 변경하지 않는다. 법적 상호 CODE DESTINY 유지. 카카오 채널명과 과거 동의문 버전, 발행된 기사·과거 문서·스토어 제출 자료는 소급 변경하지 않는다. 로컬 실결제·유료 LLM·운영 DB 쓰기 없음. 운영 승격/검색엔진 제출 미실행.

## 검증과 전달 상태
main c96764241의 PR CI 38329231428 실패를 최종 확인했다. Static guards의 GA4 instrumentation 검사에서 app/components/PaymentLoading.tsx 교차판매 분류 누락이 원인이다. 기존 실패 위에 push하지 않는 규칙으로 main 통합·push·운영 반영을 보류하고 격리 커밋으로 보존한다. 다른 세션의 변경은 건드리지 않는다.

## 배포 후 확인
운영 반영 승인과 릴리스 검증 이후 GSC URL 검사·네이버 수집을 대표 두 URL에 요청한다. 재수집과 사이트 이름 채택/순위는 별개다. 같은 기간의 꿀꿀운세·꿀꿀 운세·꿀꿀 사주 질의별 노출/클릭/CTR과 canonical을 비교한다. 10/08·10/10 변경과 겹치므로 단독 효과로 단정하지 않는다.

## 근거
- https://developers.google.com/search/docs/appearance/site-names
- https://searchadvisor.naver.com/guide/seo-help
- https://searchadvisor.naver.com/guide/content-basic
- .claude/skills/seo-audit/SKILL.md
- .claude/skills/programmatic-seo/SKILL.md
- .claude/skills/content-strategy/SKILL.md

## 로컬 검증 근거
- node --test: site-name-signals, public-brand-chrome, review-reward-copy, library-retention-contract — 19/19 통과.
- verify-payment-freeze — region 4, file 3, 상한 2 통과.
- verify-i18n-public-parity --all 통과.
- Playwright 로컬 정적 서버: 390×844, 1280×844 모두 가로 넘침 없음, title/H1/og:site_name/WebSite.name 꿀꿀운세 일치. 외부 요청과 API를 차단한 UI 확인이며 실서비스 상담 기능 검증은 아님.
- 화면 근거: output/brand-seo-20261013/home-390.png, home-1280.png. 공유 카드 1200×630 렌더 및 육안 확인, 이미지 해시 78417fecff.
- app/lib/js/src 변경 73개 중 68개는 서비스명·자산 해시만 변경. 나머지 5개는 서비스 안내/브랜드 SEO 설명을 검토함.
- 생성: sync:public, llms:generate, sitemap:generate(955 URL, URL 집합 유지).
- check:fast -- --plan 실행. check:fast는 paid-gate-suite의 전체 mock 검사 도중 중단했다. 다른 활성 세션 검사와 겹치고 본 Jest 프로세스 RSS가 약 4GB로 증가해 공유 환경 부하를 줄였다. 대상 19검사 성공과 구분하며 전체 검증 통과로 취급하지 않는다.

## 변경 파일 목록
- .ignore
- CLAUDE.md
- __tests__/ui/library-retention-contract.test.mjs
- __tests__/ui/public-brand-chrome.static.test.js
- __tests__/ui/review-reward-copy.test.mjs
- app/about/page.js
- app/admin/recommendations/page.jsx
- app/checkout/payment-alliance-copy.ts
- app/components/GlobalHeader.tsx
- app/components/QuestionJourney.tsx
- app/components/SeoJsonLd.jsx
- app/components/SeoLandingTemplate.jsx
- app/components/SiteFooterHub.jsx
- app/components/recommendations/RecommendationBrowse.jsx
- app/components/service-packs/service-pack-copy.ts
- app/consultations/page.tsx
- app/guides/[slug]/page.js
- app/human-design/guide/page.tsx
- app/insights/[slug]/page.js
- app/insights/astrology/page.js
- app/insights/compatibility/page.js
- app/insights/discovery-copy.mjs
- app/insights/dream/page.js
- app/insights/famous-saju/[slug]/page.tsx
- app/insights/fusion/page.js
- app/insights/page.js
- app/insights/public-record-article.js
- app/insights/saju/page.js
- app/insights/sukuyo/page.js
- app/insights/tarot/page.js
- app/insights/vedic/page.js
- app/insights/ziwei/page.js
- app/kkul-kkul-unse/page.js
- app/layout.js
- app/nakshatra/NakshatraLanding.jsx
- app/oracle/rune/page.tsx
- app/oracle/sikojen-povailu/layout.tsx
- app/oracle/sikojen-povailu/play/page.tsx
- app/page.js
- app/points/PointsClient.tsx
- app/records/page.tsx
- app/records/view/page.tsx
- app/reviews/ReviewsClient.tsx
- app/saju-guardian/layout.js
- app/saju-picture/layout.js
- app/saju/basic/page.tsx
- app/saju/destiny-anatomy/page.js
- app/saju/destiny-bias/components/chemi/ChemiShareCard.tsx
- app/share/ResultShareClient.tsx
- app/world/page.js
- app/yeongnyangi/1000-won-fortune/page.tsx
- app/yeongnyangi/_components/NightHero.tsx
- app/yeongnyangi/_components/QuestionScope.tsx
- app/yeongnyangi/_components/YeongnyangiGuide.tsx
- app/yeongnyangi/_original/FortuneHome.tsx
- app/yeongnyangi/_original/ServiceNavigation.tsx
- app/yeongnyangi/page.tsx
- config/sitemap-lastmod.json
- destiny-poker.html
- docs/context/seo-and-adsense.md
- fortune/index.html
- i18n/authored/fortuneTeaHouse-09.json
- i18n/authored/fortuneTeaHouse-47.json
- i18n/authored/homeOverseas-01.json
- i18n/authored/homeSimple-01.json
- i18n/authored/shellCopy-02.json
- i18n/authored/shellCopy-09.json
- i18n/authored/shellCopy-13.json
- i18n/authored/shellRuntime-20.json
- index.html
- js/core/index-inline-runtime.js
- js/core/saju/destiny-anatomy/copy.js
- js/review-reward-copy.mjs
- js/share.js
- lib/brand/trust-stories.mjs
- lib/fortune/tomorrow-copy.ts
- lib/i18n/fortune-hub-copy.mjs
- lib/i18n/locales.ts
- lib/i18n/siteFooterHubCopy.ts
- lib/pdf/export-result-pdf.ts
- lib/records/copy.ts
- lib/seo-landing-pages.js
- lib/seo/brand-copy.mjs
- lib/seo/entity-registry.mjs
- lib/seo/intent-copy.mjs
- lib/seo/press-coverage.mjs
- lib/seo/public-record-copy.mjs
- lib/seo/siteSeo.ts
- lib/structured-data.ts
- llms.txt
- manifest-neo.json
- manifest.json
- public/destiny-poker.html
- public/en/index.html
- public/famous/index.html
- public/fortune/index.html
- public/ggulggul/index.html
- public/i18n/ko.json
- public/i18n/ko/shellRuntime.json
- public/index.html
- public/ja/index.html
- public/js/core/index-inline-runtime.js
- public/js/core/saju/destiny-anatomy/copy.js
- public/js/review-reward-copy.mjs
- public/js/share.js
- public/llms.txt
- public/manifest-neo.json
- public/manifest.json
- public/og/code-destiny-og-vvip.png
- public/og/presidential-public-records.png
- public/sitemap-en.xml
- public/sitemap-ja.xml
- public/sitemap-ko.xml
- public/sitemap-zh-tw.xml
- public/sitemap-zh.xml
- public/sitemap.xml
- public/static/index.html
- public/static/policies/about/index.html
- public/static/policies/contact/index.html
- public/static/policies/faq/index.html
- public/static/policies/privacy/index.html
- public/static/policies/refund/index.html
- public/static/policies/terms/index.html
- public/zh-tw/index.html
- public/zh/index.html
- scripts/build-fortune-hub-shell.mjs
- scripts/build-public-record-og.mjs
- scripts/design/build-static-policy-pages.mjs
- scripts/generate-llms-txt.mjs
- scripts/og/vvip-card.html
- sitemap-en.xml
- sitemap-ja.xml
- sitemap-ko.xml
- sitemap-zh-tw.xml
- sitemap-zh.xml
- sitemap.xml
- src/features/fortune-tea-house/components/FortuneTeaHouseLanding.tsx
- src/features/fortune-tea-house/components/HoneyDropRewardOverlay.tsx
- templates/home-funnel.html

## 최종 전달 기록
- 수정 커밋 f39680144. 브랜드 SEO 5개 파일 ESLint 통과.
- 커밋 상태 check:pre-push 통과: home-service-registry, public-mirror-fresh, sitemap-drift(955 URL).
- 최신 main d8a868f09 결합 뒤 전체 check:fast 통과: paid suite 88/88, Node 3196/3196, Jest 394 suites·6026 tests, lint·typecheck·Worker dry-run 통과.
- 기존 GA4 차단은 b31597016에서 해소됐다. 후속 public mirror drift는 f39680144의 `.ignore` 생성 제외 항목으로 해소했고, AI Locale inventory drift는 e6f5b3112로 복구했다.
- Secret Scan은 과거 9,741개 커밋에서 기존 34건을 찾은 별도 이력 문제다. 이번 변경에서 새 비밀값·운영 설정을 추가하지 않았으며 운영/검색 반영은 별도 승인 범위다.
- 재개 문서: docs/handoff/ggulggul-brand-seo-20261013.md.
