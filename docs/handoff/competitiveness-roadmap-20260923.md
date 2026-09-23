---
status: active
updated: 2026-09-24
next: "S3 핵심 랜딩 답변 우선 개편 ①(GREEN·Opus/medium) — 선행 조건이 풀린 첫 대기 행이다(S2는 U2 대기). 순서 근거인 GSC 페이지별 노출(S2·U4)이 없으면 표에 적힌 순서로 한다. S6도 S1으로 풀렸고(완료 확인은 S1 운영 승격 뒤), S5 신년 허브는 10월 중순 운영 승격이 기한이다."
---

# 경쟁력 로드맵 — 측정 정합 → 모수 확대 → 공유 루프 → 속도 → 비용

## 왜

- 사용자 요청(2026-09-23): 경쟁 서비스 비교 개선을 이어받아 UI/UX·결제 속도·서버 최적화·SEO·GEO까지 끝까지 가는 계획.
- 판단: 병목은 전환율이 아니라 **모수**다. 순서 = ① 측정이 맞는지 ② 유입(검색·AI·소셜·공유) ③ 첫인상·결제·결과 속도 ④ 고정비. 전환 UI는 실제 결함 제거만 한다.
- 🔴 **세션 순서의 정본은 이 문서다.** 선행 문서는 세부 기록으로 둔다: [conversion-sharing-20260922.md](conversion-sharing-20260922.md) · [google-seo-rebuild-20260921.md](google-seo-rebuild-20260921.md) · [business-refactor.md](business-refactor.md) · [service-reform-20260920.md](service-reform-20260920.md) · `docs/conversion-sharing-plan-20260922.md` · `docs/consultation-sharing-coverage-20260923.md`.

## 지금 상태

- 운영 `11d0be467`(run 35860013925, 2026-09-23 12:22:00Z 시작·12:33:08Z 완료). S0 착수 시 main은 11커밋 앞섰다(`git log --oneline 11d0be467..origin/main`). 🔴 그중 결제 변경 `bc2c873d0`(패밀리 이용권·융합 가격 재개)·`9b7affb12`(홈 레지스트리 융합 가격 동기화)는 **다음 승격 요청에 따로 적는다.**
- S0 완료(2026-09-24) — 로드맵 `96d346da9`, 홈 정본 드리프트 정정 `2b005068f`(문서 8개 + `docs/CONTEXT_AUDIT.md` 2026-09-24 항목). 인이시스 문서 시각 정정만 아래처럼 보류.
- 🔴 **보류한 정정**(인이시스 세션이 같은 파일을 쓰는 중 — 마지막 커밋 `be8211a8b`, 2026-09-24 00:19 KST) — `docs/handoff/inicis-security-advisory-2026-09.md`. 줄 번호는 `be8211a8b` 기준이며 그 세션이 고치면 움직이므로 문구로 찾는다:
  - 48줄 "(12:22 KST = 03:22Z)" → "(2026-09-23 12:22:00Z 시작·12:33:08Z 완료 = 21:22–21:33 KST, run 35860013925)"
  - 54줄 `ISODate("2026-09-23T03:22:00Z")` → `ISODate("2026-09-23T12:33:08Z")`. 58줄(`2026-09-16`)은 그대로.
  - 이유: 지금 값이면 승격 전 약 9시간의 결제가 "absent"로 잡힌다. `be8211a8b`의 실측(승격 뒤 확정 1건, channel matched)에는 영향이 드러나지 않았지만, 그 문서가 "확정 20건 이상이면 다시 집계"라고 적어 두었으므로 재집계(U4) 전에 반영한다.
- BL 완료 `1a202247a` — `docs/CURRENT_DEV_BASELINE.md` `Last curated: 2026-09-24`. `verify:doc-freshness`(14일 한도)는 10-09에 다시 실패하므로 **10-08까지** 재큐레이션한다(`.github/workflows/pr-ci.yml`은 fast가 아닌 tier마다 이 검사를 돌린다).
- S1 완료 `03c3956ec` — 원인·대조 규칙·UTM 규칙의 정본은 `docs/analytics-kpi.md` "S1" 절.
  - GA4 0 ↔ DB 5(08-24~09-20)의 원인은 전송 부재다. `purchase`는 09-21 00:46 KST, `view_item`은 09-22 23:54 KST 운영 승격부터 나간다.
  - 09-21 승격부터 `page_location`이 쿼리를 통째로 떼어 UTM 귀속이 없었다 → S1이 `utm_*`만 남긴다. 구매 `item_id`가 `fortune`으로 떨어지던 것도 `accessGrant.featureKey`로 고쳤다. mock 결제 1회(대기→지급→재응답) = `purchase` 1·중복 0.
  - GA4 `purchase`는 동의 사용자만 잡히는 하한이다. 건수 정본은 서버 원장이다(U7).
  - 🔴 효과는 운영 승격 뒤부터다(push = 스테이징). React 경로는 `app/layout.js:198`의 고정 `?v=`와 7일 캐시 때문에 최대 7일 늦게 닿는다(운영 헤더 실측).
- S1 후속(보고만, 미착수):
  1. React `analytics.js` 고정 `?v=20260814-ga4-v1`(`app/layout.js:198`) — analytics.js 변경이 매번 최대 7일 늦는다.
  2. 셸의 내부 UTM 버튼 2개(`index.html:20333`, 테스트 `__tests__/ui/yeongnyangi-free-fortune.test.mjs:20`가 href 고정) — S1 승격부터 구매 귀속을 `code_destiny / referral`로 덮는다. `cross_sell_click`으로 대체한다.
  3. `purchase`가 없는 경로: Play·선물·마스터 연애/영냥이 활성화 복구·`analytics.js` 없는 정적 페이지 12개.
  4. dp 결제 경로(`js/destiny-profile.js` 5788–5803, 동결 region)에 GRANT_PENDING 분기가 없다 — 200 대기 응답도 "결제 완료"를 띄운다(이중 전송은 아님).
  5. `/points`는 확인 뒤 약 1.2초 만에 이동한다(`app/points/PointsClient.tsx` 3364·3389). 그때 analytics.js가 아직 설치 전이면 대기열 이벤트가 사라질 수 있다(미검증).
  6. `cd_ga_last_visit_v1`을 동의 전에 쓴다. 공개 공유 `utm_medium=share`는 GA4에서 Unassigned다(`share_receive` 계약이라 유지). 광고 클릭 ID(gclid 등)도 떼진다 — 광고를 집행할 때만 문제다.

## 로드맵 — 1 세션 = 1행

- 착수할 때 상태 칸을 "진행 중"으로, 끝나면 "완료 + SHA"로 바꾸고 `updated`·`next`를 갱신한다. 선행 조건(U = 사용자 결정)이 안 풀린 행은 시작하지 않는다.
- RED 행은 착수 전 7항목(관련 파일·현재 구조·예상 원인·변경 범위·회귀 위험·mock 검증·롤백)을 선보고한다. 등급 옆은 권장 모델/effort.

### A. 기반

| # | 작업 | 등급·권장 | 핵심 파일·재사용 | 완료 기준 | 상태 |
|---|---|---|---|---|---|
| S0 | 로드맵 정본 + 홈 정본 문서 드리프트 정정(+`CONTEXT_AUDIT`) | GREEN · Opus/medium | `ARCHITECTURE.md`, `docs/CURRENT_DEV_BASELINE.md`, `docs/CONTEXT_AUDIT.md` 외 문서 5개 | CI green | 완료 `96d346da9`·`2b005068f`(인이시스 정정 보류) |
| BL | `CURRENT_DEV_BASELINE.md` 큐레이션 — 낡은 항목 정리 후 `Last curated` 갱신. **09-26까지** | GREEN · Sonnet/medium | `scripts/verify-doc-freshness.mjs` | `npm run verify:doc-freshness` OK | 완료 `1a202247a` |
| S1 | 측정 정합: GA4 구매 0 vs DB 5 원인(시간대·필터·테스트 주문·전송 조건) → 결제 완료 이벤트 정합 + 소셜 링크 UTM 규칙 | RED(결제 인접) · Opus/high | `docs/analytics-kpi.md` 11·43줄(기존 발사 지점 — 새 이벤트를 만들기 전에 재사용) | mock 결제 1회에 구매 이벤트 1건·중복 0 | 완료 `03c3956ec` |

### B. 모수 확대 — 검색·AI·소셜 (최우선)

| # | 작업 | 등급·권장 | 핵심 파일·재사용 | 완료 기준 | 상태 |
|---|---|---|---|---|---|
| S2 | 색인 효율: GSC 페이지별 데이터로 URL 묶음(날짜 띠 운세·로케일·insights)의 노출 기여를 먼저 확인 → sitemap은 색인할 정본만, lastmod는 본문 변경만. 날짜 띠 운세는 "매일 갱신되는 상록 띠 URL + 날짜 아카이브 sitemap 제외" 구조를 7항목으로 제안. 사이트 이름 정렬, 중복 Organization, `/ggulggul/` WebPage `@id` 중복(기준선 참고), 낡은 셸 주석(`app/components/GlobalHeader.tsx:222`, `app/components/SiteFooterHub.jsx:182`) | RED(SEO 전역) · Opus/high | `scripts/generate-sitemap.mjs`, `__tests__/release/sitemap-*`, `lib/seo/siteSeo.ts`, `lib/seo/entity-registry.mjs`, `__tests__/ui/site-name-signals.static.test.js` | 재생성 diff 전부 설명 가능, 페이지·URL 삭제 0 | 대기(U2 후) |
| S3 | 핵심 랜딩 답변 우선 개편 ①: 숙요 2개(09-21 완료)의 패턴(정의형 첫 문단·계산 예시·보이는 FAQ = JSON-LD·설명형 앵커)을 `/saju/`·`/saju/guide/`·`/manse/`·`/ziwei/`·`/ziwei/chart/`에 적용 + 업데이트 날짜·허브→가이드→도구 링크. 순서는 S2의 GSC 노출 순 | GREEN · Opus/medium | `docs/seo/core-landings-20260921.md`, `lib/seo-landing-pages.js`, `app/components/SeoLandingTemplate.jsx`. 저자 근거는 `lib/brand/founder.ts`만 | 얇은 신규 페이지 0, SSR FAQ = JSON-LD | 대기 |
| S4 | ② `/vedic/`·`/vedic/guide/`·`/nakshatra/`·`/astrology/`·`/astrology/guide/` + 체계 비교·계산 예시(기존 가이드·insights 확장 우선, 새 URL은 7항목 선보고) + 나크샤트라 융합 27개 대조(계산 원천 불변) | GREEN · Opus/medium | `constants/nakshatra-fusion.js`, `constants/nakshatra-crosswalk.js` | 27/27 대조표 | 대기 |
| S5 | **2027 정미년 신년운세 허브**(총운·띠별·토정비결 해설 → 천원·신년 상담 CTA). 10월 중순 운영 승격 → 11월 초 색인이 기한 | RED(신규 라우트) · Opus/high | `app/new-year-ai-consultation/`, `scripts/generate-sitemap.mjs` | 11월 초 색인 확인 | 대기 |
| S6 | 소셜→사이트: Threads 자동 게시물 링크·UTM(템플릿만 — 새 크론·변수 금지), 네오 네이버 블로그 글 초안(랜딩 1:1), 셀럽 사주 2차 묶음 | GREEN · Sonnet/medium | Threads 자동화 템플릿(이미 S1 규칙대로 `utm_source=threads&utm_medium=social&utm_campaign=daily_<type>` — `worker/lib/threads-daily-providers/shared.js:58`), `lib/famous-saju/`, UTM 규칙은 `docs/analytics-kpi.md` S1 절 | UTM 유입이 GA4에서 분리됨 | 대기(완료 확인은 S1 운영 승격 뒤) |

### C. 공유 루프

| # | 작업 | 등급·권장 | 핵심 파일·재사용 | 완료 기준 | 상태 |
|---|---|---|---|---|---|
| S7 | 공유 차단 해제: 카카오 공유 키 반영, 운영 `ENABLE_RESULT_SHARE` 활성 방법(워커 변수 슬롯 포화 — `wrangler.toml` 구조 변경 없이) | RED(공유·워커) · Opus/high | `worker/wrangler.toml`, `docs/handoff/kakao-share-viral-loop-2026-09-13.md` | 스테이징 mock 공유 성공 | 대기(U3 후) |
| S8 | 정적 셸 결과 공유 묶음(사주·타로·점성술·숙요·자미두수) | RED(공유) · Opus/high | `js/share.js`, `js/share-service.mjs`, `scripts/verify-conversion-sharing.mjs`, sync:public 미러 | verify 통과, 미러 커밋 | 대기 |
| S9 | 남은 묶음(나크샤트라 3·손금·융합·자미 상담·전문가 상담 프레임) + 받은 친구의 다음 행동("나도 해보기"→같은 상품) + 천원사주 공유 이미지 + 공유 수신 측정 | RED(공유) · Opus/high | `components/fortune/ConsultationShare.tsx`, `lib/consultation-sharing.ts`, `app/yeongnyangi/_lib/result-share.ts`, `/api/og` | `docs/consultation-sharing-coverage-20260923.md` 표 전부 적용 | 대기 |

### D. 첫 구매 경험 — UX·속도·결함

| # | 작업 | 등급·권장 | 핵심 파일·재사용 | 완료 기준 | 상태 |
|---|---|---|---|---|---|
| S10 | 속도 기준선: 홈 측정 도구 기본 경로 정정(기본 `/`가 이제 React 홈인데 셸 요소를 기다린다 — `scripts/measure-home-interaction.mjs` 75·158줄, `scripts/measure-home-lighthouse.mjs` 54·718줄, 코드 판독·미실행) → 운영 `/`·`/ggulggul/`·`/saju/` 실험실(`perf:home --url`, React는 `perf:app-route`) + U4 데이터 + 결제→첫 챕터 시간 측정 방법 | GREEN · Sonnet/medium | 기존 perf 스크립트(새 RUM 비콘 금지) | 수치표를 이 문서 기준선에 추가 | 대기 |
| S11 | 첫인상 CWV: React 공통 경로 렌더 차단 CSS(임계 CSS), 한국어 `ko.json` 요청 중단(사용자 결정 — S10 수치와 함께 선택지 제시), `/ggulggul/` `#iljuCard` CLS·`activateNavItem` INP. `/js/core` 6개 지연은 결제 민감이라 S13 | GREEN~RED · Opus/high | `app/layout.js`, `lib/i18n/useT.ts`, `index.html`(+sync:public). 재시도 금지 목록: `home-lcp-inp-2026-08-28.md`·`global-css-render-blocking-2026-09-17.md` | 전후 실측 비교 | 대기(S10 후) |
| S12 | 고민별 진입(기존 홈 고민 버튼 재사용) + 상품 상세에 예시 질문·챕터·"예시" 표기 샘플·가격 | GREEN · Opus/medium | `scripts/verify-premium-detail.mjs`, `scripts/verify-premium-finder.mjs` | 5초 안에 차이 이해(방문자 과제) | 대기 |
| S13 | 결제창 속도: 유료 게이트 선조회(`app/_lib/billing-client.ts` `beginPaidFeatureGateCheck`·`loadPaidServiceRuntimeGate`), 영냥이 결제 진입의 중복 신원 확인(후보 — `app/checkout/CheckoutClient.tsx`·`purchaseFeature`, 착수 시 재확인), `/points` PortOne SDK 로더(`app/points/PointsClient.tsx` `portone-v2-sdk`)·`refundConsentHtml` 폴백, `/js/core` 6개 로드 시점(`app/layout.js` 181–187줄), 구매 직전 DB_FALLBACK 원인 | RED(결제 동결) · Opus/high | paid-gate-auditor, `config/payment-freeze.json`, `scripts/verify-yeongnyangi-browser.mjs` | mock 결제 흐름 통과, 운영 p75는 승격 뒤 S10 도구로 | 착수 가능 — U6 승인(2026-09-24), 영냥이 우선: `yeongnyangi-paid-flow-speed-2026-09-24` |
| S14 | 결과 첫 챕터 속도(스트리밍·첫 챕터 우선·계산 캐시) | RED(LLM) · Opus/high | `docs/handoff/paid-llm-service-delivery-20260916.md` | mock 전후 시간 | 대기 |
| S15 | 고가 상담 UI 잔여(마스터 연애·카르마·서양점성·베다): 결함·일관성만, 한 표지 복제 금지 | GREEN · Opus/medium | `docs/premium-consultation-design-20260923.md`, `DESIGN.md` | 실화면 검증 | 대기 |

### E. 서버·비용

| # | 작업 | 등급·권장 | 핵심 파일·재사용 | 완료 기준 | 상태 |
|---|---|---|---|---|---|
| S16 | Worker↔Mongo 꼬리 지연: 콜드 이중 연결, 닫힌 풀 8s 소진, `insights.js` 재시도, 라우트 지표 복구(`WORKER_ROUTE_METRICS` — 변수 슬롯 포화라 vars 예외 문서 절차) | RED(DB) · Opus/high | `worker/lib/db.js`, `worker/routes/insights.js`, `docs/handoff/mongo-m10-phase2-2026-09-06.md`. 금지: ping 타임아웃 상향·요청 간 Promise 캐시·autoIndex | 09-06 방식 재측정 전후 비교 | 대기 |
| S17 | 고정비: Mongo M10(약 10만원) → Atlas Flex 적합성 결정 메모(아래 메모). 데이터 크기·ops/s·연결 수·Atlas Search(#1810 `$search`) 지원을 읽기 전용 실측, 이전은 별도 승인 | RED(DB) · Opus/high | S16 수치 재사용 | 결정 메모 | 대기(S16 후) |
| S18 | LLM 잔여: 토큰 미집계 호출·빈 `serviceId`, 명시 캐시를 다중 호출 경로로 확대(프롬프트 앞부분 재배열 전 측정), responseSchema 검토 | RED(LLM) · Opus/high | `lib/tarot/mindscan-reading.mjs`, `lib/tarot/love-reading-llm.mjs`, `worker/lib/fusion-fortune-prompt.js`, `scripts/report-llm-token-usage.mjs` | mock | 대기 |
| S19 | 유료 전달 누수(인수인계 기재·미재현): 점성술 이용권 환불 누락(`worker/routes/fortune.js:4246` `passRefund: null`), 나크샤트라 환불 기록 전 차감(`worker/lib/nakshatra-paid-access.js:141-143`), 관계 경계 "high" 도달 불가(`worker/routes/relationship-boundary-test.js:75-78`), `/api/destiny-compass/narrate` 무인증 LLM, 재회 타로 서버 결제 검증 → 읽기 전용 재현, 확인된 것만 건별 RED 수정 | RED(결제) · Opus/high | paid-gate-auditor | 재현 여부·수정 커밋 | 대기 |
| S20 | 엣지 캐시: 한국 TTFB가 나쁘면 정적 HTML·공용 API 캐시 정책 | RED(배포) · Opus/high | `_headers`(규칙 80/100 사용 중) | 전후 TTFB | 대기(S10 후) |

### F. 릴리스·측정 (단계 끝마다)

`npm run verify:release` → 운영 승격 1회 승인 요청(결제 변경 명시) → 승격 SHA를 이 문서에 기록 → 28일 뒤 GSC 동일 URL 비교·AI 인용 패널 재측정 → 다음 분기 계획.

## 사용자만 할 수 있는 일 (추천 먼저)

| # | 결정·작업 | 추천과 이유 |
|---|---|---|
| U1 | Cloudflare AI 크롤러 허용 | **GPTBot·PerplexityBot·ClaudeBot 허용.** robots.txt는 이미 허용인데 엣지만 403이다. 막으면 Perplexity 색인·모델 브랜드 학습이 빠진다. 절차: ① 대시보드 → code-destiny.com → Security → Events에서 User agent `GPTBot` 필터 → 차단한 규칙(Service 열) 확인 ② AI Crawl Control 또는 Security → Bots의 AI 봇 차단에서 세 봇 허용(메뉴 이름은 대시보드 개편에 따라 다를 수 있다) ③ 아래 기준선의 재현 명령이 세 줄 모두 200 ④ 롤백 = 같은 토글 원복 |
| U2 | Google 사이트 이름 | **"꿀꿀 운세" 유지 + 홈 title 접미사 정렬.** 09-06 결정·가드 테스트·바꿀 수 없는 카카오 채널명·소셜 해시태그가 모두 꿀꿀 운세다. 09-21 브랜드 지도(CODE DESTINY 운영 브랜드)를 우선하면 반대로 WebSite 이름을 바꾼다. S2 전에 결정 |
| U3 | 카카오 공유 키 A/B/C | S7 전에 결정. 선택지는 `docs/handoff/kakao-share-viral-loop-2026-09-13.md` |
| U4 | 운영 채널·데이터 | 인스타 프로필에 사이트 링크, 카카오 채널 메뉴 등록, GSC 페이지별 내보내기(지금·28일 뒤), 네이버 서치어드바이저·빙 재제출, CF Web Analytics 경로별 CWV 내보내기(S10), 운영 읽기 스크립트 실행(`scripts/report-pg-window-latency.mjs --days 30`·결제 성공률·channelCheck 집계 — 정정된 시각으로) · S1: GA4 보고 시간대(Asia/Seoul)·내부 트래픽 필터 확인, S1 운영 승격 뒤 셸 경로 UTM 링크 1회 실시간 확인(쿠키 동의 후), 이미 등록한 카카오 채널 메뉴 링크는 `utm_source=kakao&utm_medium=social&utm_campaign=channel_menu`로 |
| U5 | 사업 판단 | 이용권 7일 관찰 판정: 실제 변동비가 제공 가치의 30%를 넘는 상품부터 조정(`docs/pass-pricing-20260921.md` 16줄). 119,800원 등 스트레스 최소가는 폐기된 89,000원 체계의 과거 분석이라 판매 차단 근거가 아니다(같은 문서 18줄). 패밀리 이용권(09-23 재개) 마진 점검, 3,000/5,000원 상품 처리, 윈백 메일 경로 A/B, Play v3 SKU |
| U6 | 결제 브라우저 시나리오 CI | **`scripts/verify-yeongnyangi-browser.mjs`(104 시나리오)를 결제 파일 경로 한정 섀도 잡으로 편입.** 결제 게이트 범주이고 영냥이 결제 버튼 장애가 2일 넘게 미탐지됐다. 새 CI 게이트는 사용자 지시가 있어야 하므로 S13 전에 결정. **승인 2026-09-24** — 구현은 S13 속도 세션 첫 단계(`yeongnyangi-paid-flow-speed-2026-09-24.md`) |
| U7 | 북극성 정의 | **서버 원장의 주간 결제 완료 주문 수(테스트 주문 제외)로 바꾼다.** S1 실측상 GA4는 동의 사용자만 잡는 하한이고, `purchase_complete`는 월정석 사용에도 발사되어 결제 건수가 아니다. GA4 `purchase`는 유입 귀속에만 쓴다. 바꾸면 아래 측정 규칙 첫 줄과 `docs/analytics-kpi.md` 3-1을 함께 고친다 |

## 기준선 — 2026-09-23 운영 실측(읽기 전용)

AI 크롤러(UA 위장·미국 출구 — 실제 봇 IP 판정은 U1의 Events로 재확인):

| UA | `/` | `/saju/` | `/llms.txt` | `/robots.txt` |
|---|---|---|---|---|
| GPTBot · PerplexityBot · ClaudeBot | 403 | 403 | 403 | 200 |
| 브라우저 · OAI-SearchBot · ChatGPT-User · Perplexity-User · Claude-SearchBot · Claude-User · Googlebot · bingbot · Yeti | 200 | 200 | 200 | 200 |

- 403 응답은 `Server: cloudflare`·`text/plain`·`cf-mitigated` 없음·colo SJC. 레포에 차단 코드 없음 → Cloudflare 존 설정.
- 재현(U1 확인에도 쓴다):

```
for ua in GPTBot/1.2 PerplexityBot/1.0 ClaudeBot/1.0; do curl -s -o /dev/null -w "$ua %{http_code}\n" -A "Mozilla/5.0 (compatible; $ua)" https://code-destiny.com/saju/; done
```

TTFB(브라우저 UA 3회, 출구 MIA·ATL·PDX·SJC·DFW — 한국 미측정, 전부 `cf-cache-status: DYNAMIC`):

| 경로 | TTFB(s) | 압축 크기 |
|---|---|---|
| `/` | 0.76–1.22 | 22,126 B |
| `/ggulggul/` | 0.66–1.09 | 132,907 B |
| `/saju/` | 0.56–0.73 | 24,667 B |
| `/sukuyo/` | 0.79–1.52 | 24,310 B |
| `/sitemap.xml` | 0.76–0.83 | 약 20.3 KB |
| `/llms.txt` | 0.55–0.69 | 2,364 B |

sitemap 1,284 URL:

| 묶음 | URL 수 |
|---|---|
| 날짜별 띠 운세 `/fortune/date/YYYY-MM-DD/<띠>/`(08-25~09-23, 30일×12) | 360 |
| 로케일(`/ja/` 127·`/en/` 126·`/zh/` 126·`/zh-tw/` 118) | 497 |
| `/insights/` | 138 |
| `/fortune/`(날짜 제외) | 103 |
| `/stories/` | 45 |
| `/nakshatra/` 28·`/saju/` 22·`/guides/` 13·`/tarot/` 11 | 74 |
| 그 밖의 허브·정책 | 67 |

- lastmod: 09-23 = 611(47.6%), 09-20 = 154, 09-21 = 62, 07-10 = 27.

제목·구조화 데이터:

| 경로 | HTML · script 수 | title | JSON-LD |
|---|---|---|---|
| `/` | 123,790 B · 78 | 사주보는 고양이 영냥이 \| 사주·타로·궁합 — CODE DESTINY | Organization `#organization`(CODE DESTINY)+WebSite `#website`(꿀꿀 운세) · 같은 Organization 한 번 더 · WebPage `/#webpage` |
| `/saju/` | 160,154 B · 93 | 무료 사주 풀이 \| 사주팔자 오행·십성·대운 보는 곳 | Organization+WebSite · WebPage `/saju/#webpage` · Service · BreadcrumbList · FAQPage |
| `/ggulggul/` | 655,591 B · 106 | 꿀꿀 운세 \| 꽃돼지 연이와 보는 무료 사주·타로 | 한 블록: Organization+WebSite+**WebPage `@id` = `https://code-destiny.com/#webpage`(홈과 같은 @id — S2)**+Person `#author`+ImageObject+ItemList |

- `/`의 og:site_name은 "꿀꿀 운세". 홈 title 접미사만 "— CODE DESTINY"로 갈라진다(U2).

문서·사용자 제공 수치(재측정 전까지 출처 그대로):

- 사업: 매출 월 약 5만원(사용자) < 고정비 약 10.8만원(Mongo 약 10만원 + Cloudflare $5). Gemini 약 1만원.
- 측정: GA4 구매 0건 vs DB 결제 5건(08-24~09-20 — S1: 그 기간엔 `purchase` 이벤트가 없었다). Threads 월 약 6.8만 조회·팔로워 353 vs GA4 90일 방문자 325(인스타 프로필 링크·소셜 UTM 없음).
- GSC 06-19~09-18: 클릭 30·노출 356·평균 25.4위, 색인 292·발견-미색인 1,023.
- 속도: 옛 셸(지금 `/ggulggul/`) 필드 LCP P75 1,340ms·INP poor 12%(09-06). **새 React `/`는 기준선 없음.** React 공통 경로 차단 CSS: `/saju/` 스로틀 FCP=LCP 2,660–2,720ms → 제거 시 1,120–1,260ms(`global-css-render-blocking-2026-09-17.md`). `/js/core` 6개가 `beforeInteractive`(`app/layout.js` 181–187줄). 한국어 페이지도 `ko.json`(519KB·압축 132KB)을 받는다(`lib/i18n/useT.ts` 86줄 → `lib/i18n/dictionary.ts` 150줄). `/ggulggul/` `#iljuCard` CLS 1.517·`activateNavItem` 519–542ms·44px 미만 탭 타깃 37%. CrUX 404.
- 결제: 클릭→결제창 p50 2,187 / p90 9,963ms(n=5, 08-16, 원인 = 죽은 Mongo 소켓 재사용) — #691 예열 뒤 재측정 없음. 결제→결과 시간은 측정 자체가 없다. 영냥이 결제 버튼 미표시 장애(09-16~18)가 2일 넘게 미탐지.
- 서버: Worker↔Mongo 3동시×5 요청 4.4–16.3s(09-06). LLM 명시 캐시는 사주만(입력비 −55%), 토큰 미집계 호출 2곳·빈 `serviceId`.
- 공유: 정적 셸 `ENABLE_RESULT_SHARE` 운영 미설정(워커 변수 슬롯 포화), 카카오 공유 키 결정 09-13부터 대기.

## 포지션

"**공개 기록으로 확인되는 상담가 네오가 만든 곳, 여러 명리 체계를 천 원부터**"

- 싸울 곳: 검증 가능한 전문가(날짜 있는 공개 예측 기록) · 롱테일 체계(숙요·나크샤트라·자미두수·베다·휴먼 디자인) + 고민 의도(재회·궁합·연애 타로·천원 사주) · 가격 계단(천원 단건 → 이용권 → 월정석) · 캐릭터 결과 카드 공유 · 신년 시즌(11~2월).
- 피할 곳: "오늘의 운세" 헤드 키워드, 네이버 운세 박스, 앱 설치·광고비 경쟁.
- 경쟁사 강점: 포스텔러 = 일상 질문·시즌 콘텐츠, 청월당 = 고민별 번들·캐릭터·후기·보관함, 점신 = 일일 리포트·전문가 상담, 사주아이 = 카드에 가격·상품명·무로그인 일일운세.

## 측정 규칙

- 북극성: 주간 `purchase_complete` 건수(`docs/analytics-kpi.md` 3-1, 테스트 주문 제외). 추정 목표치 없이 기준선 대비 실측만 쓴다. S1: GA4는 동의 사용자 하한이고 `purchase_complete`는 월정석 사용도 센다 — 정본 교체 여부는 U7.
- 선행 지표: GSC 동일 URL 28일 비교, AI 봇 403 수, AI 답변 인용 패널(고정 질문 20개 × ChatGPT·Perplexity·Gemini·네이버 AI 브리핑, 월 1회), UTM별 소셜 유입, 공유 수신 유입. 중간 지표: 결제창 열림 p75, 첫 챕터 표시 p75, 결과→공유율.
- SEO·GEO 효과는 **운영 승격 뒤**부터다(push는 스테이징까지).

## 인수인계 문서 상태 — 다른 문서의 `next:`를 다시 쫓지 않는다

| 판정 | 문서 → 이어받는 세션 |
|---|---|
| 완료 | `checkout-i18n-wiring-20260918`, `inicis-overseas-card-phase2-20260918` |
| 차단 | `llm-prompt-json-slicing`(사주 `evidenceRefs` 설계 결정 대기) |
| 활성·유효 | S10·S11 ← `home-perf-cwv-2026-09-07`, `home-lcp-inp-2026-08-28`, `desktop-perf-2026-08-16`, `global-css-render-blocking-2026-09-17`, `mobile-home-perf`, `n3-shell-inline-css-externalization`, `app-optimization-remaining-2026-09-02` · S13 ← `pg-window-latency-2026-08-16`, `payment-503-and-renderer-unification`, `payment-stabilization`, `checkout-soulcat-requestid-gate-p0-20260918`, `yeongnyangi-paid-flow-speed-2026-09-24`(영냥이 우선·U6 배선부터) · S14·S19 ← `paid-llm-service-delivery-20260916` · S16·S17 ← `mongo-m10-phase2-2026-09-06` · S18 ← `llm-optimization-leftovers` · U5 ← `business-refactor` · 인이시스 세션 ← `inicis-security-advisory-2026-09` |
| `active` 표기지만 낡음 | `llm-explicit-context-caching`(#659 머지), `sukuyo-duplicate-generation-window`(#652 머지), `app-optimization-roadmap-2026-09-02`(remaining 문서로 대체), `inp-round3-2026-08-16`, `desktop-tbt-2026-08-29`, `payments-confirm-v2-cutover`, `kakaopay-golive-2026-08-31`, `devloop-perf-followups`, `music-lounge-perf-2026-09-16`, `payment-mobile-audit-20260909`, `worker-cpu-atlas-search-2026-09-08` |

- 🔴 문서에 적힌 #1810 `3541904e9`·#1845 `3080b0a02`는 스쿼시 전 SHA다. main 커밋은 `7e221cdfa`(#1810, 09-08)·`8422192d9`(#1845, 09-09).

## Atlas Flex 메모 (S17 입력)

- $8 기본·$30 상한, 100→500 ops/s, 저장 5GB(09-23 확인). 출처: https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/ · https://www.mongodb.com/pricing · https://www.mongodb.com/products/updates/now-ga-mongodb-atlas-flex-tier/
- 미확인: Flex의 Atlas Search 지원·연결 수 한도.

## 함정

- 이번 기준선은 UA 위장·미국 출구 측정이다. 한국 TTFB·CWV는 없다.
- 홈 측정 도구는 기본값 `/`(이제 React 홈)에서 셸 요소를 기다린다 — S10 전까지 `--url` 필수.
- 홈 `/`에는 운세 입문 콘텐츠 섹션(`.cd-home-guide`)이 없다 — 정적 셸 8벌에만 있어 지금은 `/ggulggul/`·로케일 셸에서 보인다(2026-09-24 실측). 홈 콘텐츠·AdSense 품질 판단은 `app/page.js` 기준으로 한다(S2·S3 입력).
- 홈 `/`의 canonical은 `app/page.js` metadata가 낸다(운영 확인). hreflang HTML 태그는 0개라 사이트맵 alternate가 유일한 전달 수단이다(S2에서 확인). `app/layout.js` 97줄 등 코드 주석 5곳은 아직 `/`를 정적 셸로 설명한다 — 목록은 `docs/CONTEXT_AUDIT.md` 2026-09-24 항목(S2에서 정리).
- KST 자정(15:00 UTC)이 지나면 `verify:sitemap-drift`가 사이트맵과 무관한 push도 실패시킨다. `/fortune/date/<날짜>/<띠>` 30일 창은 KST 날짜로 밀리는데, `--check`는 매일 바뀌는 lastmod만 정규화하고 URL 집합은 정규화하지 않기 때문이다(#1895, 2026-09-11부터). 09-24 자정 직후 문서 커밋 3개가 이렇게 실패했고 `a6ba3185d`로 재생성해 복구했다. 복구 절차: `npm run sitemap:generate` → diff가 날짜 URL 12개 교체와 KST 운세 lastmod(전날→오늘)뿐인지 확인 → 사이트맵 12개와 `config/sitemap-lastmod.json`을 커밋. 가드 구조 해소는 S2의 "날짜 아카이브는 sitemap 제외" 제안에 함께 넣는다.
- 쓰는 세션이 둘 이상이면 워크트리(`scripts/create-safe-worktree.ps1`). `marketing/**` 미커밋은 다른 세션 소유라 스테이징하지 않는다.
- push ≠ 배포. 새 CI 게이트는 사용자 지시 없이 추가하지 않는다(U6 은 2026-09-24 승인).
- 가짜 후기·통계 금지. "두 대통령 적중"은 유지하고 "모든 예측 적중·유일·정확한 날짜"는 쓰지 않는다. `humanReview`·`adsAllowed`는 임의로 승격하지 않는다.

## 검증

```
npm run check:fast
npm run verify:handoff-contract
npm run verify:doc-freshness
```

축별: SEO는 생성기 재실행 + diff, 공유는 `node scripts/verify-conversion-sharing.mjs`·`verify-consultation-sharing.mjs`·`verify-yeongnyangi-result-sharing.mjs`, 결제·LLM은 paid-gate-auditor + 결제 동결 매니페스트 + mock. 승격 때만 `npm run verify:release`와 AI 봇 3종 UA 스모크(200).

## 모르는 것

- 403을 내는 Cloudflare 규칙의 정체(U1).
- 한국 기준 TTFB·CWV, 새 React `/`의 필드 CWV(S10).
- 구매 직전 DB_FALLBACK 원인(S13).
- GA4 보고 시간대·내부 트래픽 필터 설정(U4 — S1 대조 규칙의 전제), 엣지가 배포 때 `/js/*.js` 캐시를 비우는지(React 경로 반영 지연).
- Atlas Flex의 Search·연결 한도(S17).

## 재개

- 작업 위치 `D:\Development\code-destiny`(main). 시작: `git branch --show-current` → `git status` → `git pull --ff-only`. 쓰는 세션이 이미 있으면 워크트리.
- 이 문서: `D:\Development\code-destiny\docs\handoff\competitiveness-roadmap-20260923.md`
- 다음: 선행 조건이 풀린 첫 "대기" 행 — 지금은 S3(S2는 U2 대기). S6도 풀렸다(완료 확인은 S1 운영 승격 뒤).
