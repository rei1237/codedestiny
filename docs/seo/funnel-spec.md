# 검색 유입 퍼널 계측 명세

작성 2026-11-14 · 근거 브랜치 `wt/naver-seo-geo-20261113-234756` · 구현 없음(명세만)

이 문서는 검색으로 들어온 방문자가 결제까지 가는 길에서 **지금 실제로 나가는 이벤트**와 **비어 있는 구간**을 적는다. 수치는 없다. 운영 GA4와 DB를 조회하지 않았고, 코드만 읽었다.

표기: 「확인」은 이번에 코드에서 직접 읽은 것, 「문서 기준」은 `docs/analytics-kpi.md`에 적힌 것을 그대로 옮긴 것(이번에 줄 번호를 다시 대조하지 않음), 「추정」은 코드로 확정하지 못한 것이다.

## 1. 계측 채널 두 가지

| 채널 | 무엇 | 정본 파일 | 한계 |
|---|---|---|---|
| GA4 | 브라우저 이벤트. 정적 셸과 Next 라우트가 같은 전역 `window.cdTrack`을 쓴다 | `js/core/analytics.js` (`lib/analytics.ts`는 타입 래퍼뿐) | 분석 동의를 거부한 방문, 광고 차단, 탭 닫기에서 빠진다. 하한으로만 쓴다 |
| 자체 수집 | 결제창 단계 6종만 받는 수집구 `POST /api/billing/funnel-event` | `worker/routes/billing.js` `handleCheckoutFunnelEvent`, 보내는 쪽 `js/core/checkout-entry.js:179-181` | 유입 경로·캠페인 필드가 없다(아래 4절). 결제 동결 파일이다 |

결제 완료·환불의 정본은 GA4가 아니라 서버 주문 원장이다(`docs/analytics-kpi.md` 2026-10-02 절).

## 2. 단계별로 지금 나가는 이벤트

| 단계 | 지금 나가는 이벤트 | 발화 위치 | 상태 |
|---|---|---|---|
| ① 검색 유입 | `page_view` (`page_location`에 경로와 허용 목록에 든 `utm_*`만 실림) | `js/core/analytics.js:161` `pageLocation`, `:203` config | 확인. 네이버·구글 자연 검색은 UTM이 없어 GA4의 리퍼러 분류에만 의존한다. 검색엔진별 전용 이벤트는 없다 |
| ② 랜딩 | `page_view`. 랜딩 시작 버튼을 누르면 `cross_sell_click` (`from_service`·`to_service`, 표식이 있으면 `placement`) | `js/core/analytics.js:780-792` (표식 `data-cd-cross-sell` 안의 링크만) | 확인. 사주·자미두수 랜딩 시작 버튼에는 표식이 있다(`app/components/FortuneLandingHero.tsx:21`). 가이드 하단 CTA에도 있다(`app/components/GuideCta.jsx:29`) |
| ③ 무료 결과 | 셸 사주: `free_saju_started`, `free_saju_completed` | `js/saju-engine.js:4786`, `:5306` | 확인. **`free_saju_started`는 로그인 확인을 통과한 뒤에만 나간다(A2).** 로그인하지 않은 방문자는 대신 `fortune_login_required`(`js/saju-engine.js:4462`)가 나간다 |
| ③ 무료 결과 | `/saju/free/` 명식 계산, `/ziwei/chart/` 명반 계산 | `app/saju/free/FreeSajuForm.tsx`, `app/components/AdvancedZiweiSectionV2.tsx` | 확인. **이벤트가 하나도 없다.** 두 화면 모두 가입 없이 결과가 나오는데 시작·완료가 잡히지 않는다 |
| ④ 상품 보기 | 영냥이 `view_item`, 꿀꿀 운세 `checkout_opened` | `lib/analytics.ts` `trackDiscovery`, `js/core/checkout-entry.js:181` `FUNNEL_EVENTS` | 문서 기준 |
| ⑤ 로그인 | `login`(비밀번호 로그인만), `sign_up`(비밀번호·소셜) | `app/components/auth/AuthShell.tsx:590`, `:617`, `:646`. `signup`은 `js/core/analytics.js:331`에서 `sign_up`으로 바뀐다 | 확인. **소셜 로그인 성공(기존 회원)은 `login`이 나가지 않는다**(해당 파일에서 `login` 발화는 590행 하나) |
| ⑥ 결제창 진입 | `checkout_option_click`, `checkout_pg_opened`(이때 `begin_checkout`도 함께) | `js/core/checkout-entry.js:181`, `js/core/analytics.js:354-356` | 확인(begin_checkout), 문서 기준(나머지). GA4와 자체 수집 양쪽으로 나간다 |
| ⑦ 결제 완료 | `purchase` | `js/core/analytics.js:623-641` `cdTrackConfirmedPurchase` | 확인. 서버 승인 응답을 본 브라우저만 보낸다. 정본은 서버 주문 |

## 3. 비어 있는 구간과 제안 이벤트

이름은 기존 규칙(소문자 snake_case, `free_saju_*`·`fortune_*` 접두)을 따랐다. 어떤 이벤트에도 생년월일·이름·질문 원문은 싣지 않는다.

| 빈 구간 | 제안 이벤트 | 파라미터 | 넣을 위치 | 비고 |
|---|---|---|---|---|
| 로그인 전 사주 입력 시작이 안 잡힘(A2) | 기존 `free_saju_started`를 로그인 확인 **앞**으로 옮기고 `signed_in: true/false`를 실어 보낸다 | `signed_in` | `js/saju-engine.js` (`ensureSajuResultSession` 호출 전) | 사주 엔진 파일이라 이번 범위 밖. 옮기면 과거 수치와 분모가 달라지므로 `metric_version: 2`를 붙이는 편이 안전하다 |
| `/saju/free/` 명식 계산 | `free_saju_chart_started`, `free_saju_chart_completed` | `surface: "saju_free"`, `time_known: true/false` | `app/saju/free/FreeSajuForm.tsx` (제출 시, 결과 렌더 시) | 결제·엔진 파일이 아니다. `lib/analytics.ts` `trackEvent` 사용 |
| `/ziwei/chart/` 명반 계산 | `free_ziwei_chart_started`, `free_ziwei_chart_completed` | `surface: "ziwei_chart"`, `time_known` | `app/components/AdvancedZiweiSectionV2.tsx` (`handleCompute` 시작, 결과 단계 진입) | 위와 같음 |
| 랜딩 입력 폼 제출(셸로 넘어가기 직전) | `landing_form_submit` | `from_service`(랜딩 경로), `to_action` | `app/components/SeoLandingBirthForm.tsx` (셸로 이동 직전) | `/love/`처럼 폼이 셸로 넘기는 랜딩에서 "폼 제출 → 로그인 벽" 이탈을 재려면 필요 |
| 무료 결과에서 유료 상품으로 넘어가는 클릭 | 새 이름 대신 기존 `cross_sell_click`에 `placement: "free_result"`를 쓴다 | `from_service`, `to_service`, `placement` | 결과 화면의 상품 링크에 `data-cd-cross-sell` 표식 | 표식만 달면 기존 리스너가 받는다 |
| 소셜 로그인 성공 | 기존 `login`에 `method: "social"` | `method` | `app/components/auth/AuthShell.tsx` (소셜 복귀 처리부) | 로그인 화면 파일. 게이트 동작은 건드리지 않고 발화만 추가 |
| 로그인 벽에서 로그인 완료까지 | 기존 `fortune_login_required` → `login`/`sign_up`으로 잇는다. 새 이벤트 불필요 | — | — | 위 두 줄이 채워지면 계산 가능 |

구현할 때 함께 고칠 것: `scripts/verify-analytics-events.mjs`(이름이 기존 발화·GA4 예약어와 겹치지 않는지 검사하는 가드가 있다), `docs/analytics-kpi.md` 이벤트 표.

## 4. UTM·귀속이 어디까지 따라가는가

| 구간 | 지금 동작 | 근거 |
|---|---|---|
| 첫 페이지 | `page_location`에 **허용 목록에 든 값만** 남긴다. 예: `utm_source`는 naver·google·naver_blog·youtube·instagram·kakao 등, `utm_medium`은 cpc·social·organic·referral 등, `utm_campaign`은 정해진 캠페인 코드만 | `js/core/analytics.js:178-183` |
| 이후 이벤트 | 허용된 캠페인 3종류만 세션에 30분 보관해 이벤트마다 `growth_campaign`·`growth_version`을 붙인다: Threads 코드, 2026-10 성장 캠페인(블로그·YouTube·TikTok·X), 네이버 검색광고 3개(`paid_20261028_naver`·`paid_20261028_brand`·`ggulggul_2027_test`) | `js/core/analytics.js:264-318`, `:343-349` |
| AI 유입 | 리퍼러가 ChatGPT·Perplexity·Gemini·Copilot·Claude 호스트일 때 `ai_source` 라벨 | `js/core/analytics.js:240-256` |
| 주문 | 위 **허용 캠페인만** 주문에 실린다. 네이버 검색광고는 쿠키 `cd_paid_campaign`으로, 영냥이는 요청 본문으로 전달되고 서버가 다시 허용 목록으로 거른다 | `lib/marketing/growth-attribution.mjs`, `worker/payments/index.js:1402`, `:1547`, `worker/payments/orders.js:189`, `app/yeongnyangi/_lib/api.ts:40` |
| 주문(그 밖의 UTM) | **실리지 않는다(A1).** 자연 검색, 일반 소셜 UTM, 이메일 UTM은 GA4 세션에만 남고 주문 원장에는 흔적이 없다 | 같은 파일들. 허용 목록 밖의 값은 `normalizeGrowthAttribution`이 버린다 |
| 자체 수집(`funnel-event`) | 캠페인·유입 필드가 아예 없다. 저장 항목은 이벤트명, 상품 키, 옵션, 렌더러, 런타임, 가격, 이용권 힌트, 체류 시간, 단계뿐 | `worker/routes/billing.js` `handleCheckoutFunnelEvent` |
| 동의 거부 | 분석 동의가 없으면 세션 보관·쿠키를 모두 지우고 주문에도 싣지 않는다 | `js/core/analytics.js:268`, `lib/marketing/growth-attribution.mjs` `readCheckoutAttribution` |

따라서 "네이버 자연 검색으로 들어와 결제한 사람"은 지금 **GA4 안에서만**(동의한 방문자에 한해) 볼 수 있고, 주문 원장으로는 볼 수 없다. 이를 바꾸는 안은 `docs/seo/payment-change-proposal.md`의 A1 절에 적었다.

## 5. 확인하지 못한 것

- 운영 GA4·DB의 실제 수치. 이 문서는 발화 코드의 존재만 확인했다.
- ④ 상품 보기, ⑥ 결제창의 세부 이벤트 줄 번호는 `docs/analytics-kpi.md` 기준이다.
- 소셜 로그인 복귀 뒤 다른 경로로 `login`이 나가는지(추정: 나가지 않는다. `app/components/auth/AuthShell.tsx` 밖은 찾지 않았다).
