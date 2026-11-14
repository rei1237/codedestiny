# 꿀꿀 운세 네이버 SEO·AEO·GEO + 구매 동선 — Phase 0 보고서와 실행 계획

## Context

네이버 노출·CTR, 무료 결과 → 유료 전환, AI 답변 인용을 올리기 위한 작업이다. 2026-11-13에 읽기 전용 진단(Phase 0)을 마쳤고, 이 문서는 그 보고서와 승인받을 실행 계획이다. 아직 어떤 파일도 고치지 않았다.

- 진단 기준: origin/main `f2db2995d`(운영 배포본 `91e4261d8` + 문서 커밋 1개). 루트 체크아웃 `D:\Development\code-destiny`는 다른 브랜치에 있고 2,252커밋 뒤처져 기준으로 쓰지 않았다.
- 운영 측정: `https://code-destiny.com` 27개 라우트를 Yeti UA와 모바일 UA로 GET.
- UX 세션이 전달한 "가장 급한 문제" 목록과 브랜드 결정("꿀꿀 운세" 하나로 통일, 영냥이는 상담가·상품 이름)을 묶음 1에 반영했다. 이 계획을 승인하면 그 결정도 확정으로 본다.

## Phase 0 요약

1. Yeti와 일반 UA는 27개 라우트에서 같은 HTML을 받는다. 차단·챌린지는 없고 GPTBot·ClaudeBot·PerplexityBot·Googlebot도 같다.
2. 허브는 전부 정적 생성(SSG)이라 JS 없이도 본문 5,000~9,000자, FAQ, JSON-LD 5종이 나온다. 홈에도 JSON-LD가 있다.
3. 홈이 둘로 나뉘어 있다. `/`는 본문 1,645자에 title이 "서비스 선택"이고, hreflang의 ko·x-default는 `/ggulggul/`을 가리킨다.
4. `?action=` URL은 200·index로 열려 있고 canonical만 방어선이다. 27개 페이지에 링크 193개, `/?action=`은 302를 한 번 더 거친다.
5. `/ggulggul/`은 HTML 709KB에 "판정 대기" 등 로딩 문구 11개가 그대로 남는다.
6. 사이트맵 1,072개 중 597개의 lastmod가 측정 당일이다. 매일 바뀌는 운세는 정당하지만 `/`, `/saju/` 같은 허브도 당일로 찍힌다.
7. `/points/`는 robots 차단과 meta noindex가 겹쳐 있다. RSS(`/rss.xml`)와 `llms.txt`는 이미 있다.
8. 모든 허브가 "완성된 페이지를 한 건씩 사람이 검토하지는 않습니다" 고지를 낸다. 검수 원장(`lib/content/editorial-review.mjs`)은 있지만 비어 있다.
9. `/saju/` 랜딩은 입력 뒤 로그인 벽이 뜨고 가입에 휴대폰이 필수다. 로그인 없이 결과가 나오는 `/saju/free/`, `/ziwei/chart/`는 랜딩과 연결돼 있지 않다.
10. 표시 문구가 실제와 다른 곳이 여럿이다(무료 범위, 천원 운세, 챕터 8/5, 이용권 이름 3개, "302,000원 상당", 구 이용권 가격).

성능(LCP/CLS/INP)은 측정하지 못했다. Lighthouse는 설치가 필요했고 PageSpeed API는 429였다. 묶음 2에서 스테이징 대상으로 측정한다.

## 사전 관찰과 달랐던 점

| 사전 관찰 | 실제 |
|---|---|
| 홈에 JSON-LD가 안 보임 | 있음(Organization, WebSite, WebPage, Person, Service) |
| RSS 신설 필요 | `/rss.xml` 있음(60건). 서치어드바이저 제출만 남음 |
| 고지 문구 "템플릿 기반 자동 구성" | 실제 문구는 `ContentIntegrityNote.jsx:64`의 다른 문장 |
| `/points/`가 가격 안내 페이지 | 개인 상점·주문 내역 페이지이고 가격은 JS로만 뜸 |
| 페이지당 링크 약 150개 | 허브 105~179개, 푸터 66개는 접힌 `<details>` 안 |
| 영문 별자리 70개 이상 | `/en/fortune/` 101개, 5개 로케일 전부 색인 대상 |
| `/consultations/new-year/`가 신년운세 연결점 | noindex,nofollow라 검색 랜딩이 될 수 없음 |

## 문제 목록

| ID | 영역 | 증거 | 영향 | 심각도 | 작업량 |
|---|---|---|---|---|---|
| C1 | 무료 배너 | `i18n/authored/freePromo-01.json` "지금만 전부 무료"; 제외 고지에 수호신 3,000원·사주 궁합 5,000원 누락; 무료 판정에 기간 조건 없음(`lib/payment/free-fortune-policy.mjs`) | 표시광고·신뢰 | P0 | 소 |
| C2 | 로그인 안내 | `/saju/` CTA → `js/saju-engine.js:4445-4468` 로그인 벽, 랜딩에 고지 없음; 1000-won 페이지는 "로그인 후 결과" | 전환 | P0 | 중 |
| C3 | 천원 운세 | `app/yeongnyangi/1000-won-fortune/page.tsx:81,111`; 최저가 10,000원 | 표시광고 | P0 | 소 |
| C4 | 챕터 8/5 | 같은 파일 `:113,134`(8) vs `:151,160`(5); 운영 HTML "8개" 3회, "5개" 9회 | 표시광고 | P0 | 소 |
| C5 | 이용권 이름 3개 | 꿀단지 이용권 31파일, 문라이트 패스 15, 달빛 이용권 34 | 전환·신뢰 | P1 | 중 |
| C6 | 구 이용권 가격 | `app/components/CommerceDisclosure.jsx:34`가 9,900~149,000원 표시 | 표시광고 | P0 | 소 |
| C7 | "66종 · 302,000원 상당" | `lib/marketing/pass-benefits.mjs:55,65` 외; 66종 중 65종이 무료 | 표시광고 | P0 | 결정 필요 |
| C8 | 29,000원 묶음 | 포함 12개 중 10개가 무료(`worker/lib/saju-bundle-policy.js:14-27`) | 표시광고 | P1 | 결정 필요 |
| B1 | 브랜드 표기 | `app/page.js:30,67,90`; 404 title "Code Destiny"; title 접미사 불일치 | 엔티티·CTR | P0 | 중 |
| B2 | 홈 title·H1 | `app/page.js:30,31,98`; 검색용 제목은 서빙되지 않음 | CTR | P0 | 소 |
| B3 | 홈 이원화 | `/` hreflang 없음, `/ggulggul/`이 ko·x-default | 노출 | P1 | 결정 필요 |
| K1 | `/points/` | `lib/seo/robots-policy.mjs` Disallow + `app/points/layout.tsx` noindex | 노출 | P1 | 소 |
| K2 | lastmod | 597/1,072이 당일, 허브는 원장 폴백(`scripts/generate-sitemap.mjs:413`), 8개 누락 | 노출 | P1 | 중 |
| K3 | `?action=` | 200·index, 링크 193개, `/?action=` 302(`public/_worker.js:187-207`) | 크롤 예산 | P1 | 중 |
| K4 | 색인 불가 URL로 내부 링크 | `app/page.js:145-148`, `SeoLandingTemplate.jsx:456`, 푸터 → `/consultations/` 등 | 노출 | P2 | 소 |
| K5 | `/ggulggul/` 무게 | 709KB, 로딩 문구 11개 | 노출 | P2 | 대 |
| K6 | HTML 캐시 없음 | 전부 `private, no-cache` | 크롤 속도 | P2 | 중 |
| M1 | description 잘림 | `/saju/`, `/manse/` 90자에서 "…"로 끝남(`lib/seo.ts:47-69`) | CTR | P1 | 소 |
| T1 | 검수 고지 | `ContentIntegrityNote.jsx:64`, `editorial-review.mjs:3` 비어 있음 | AI 인용 | P1 | 중 |
| T2 | 반복 문단 | `SeoLandingTemplate.jsx:447-457` 10개 허브 동일, `DEFAULT_FAQS :29-46` | 노출 | P2 | 중 |
| F1 | 결과 화면 유료 CTA 12개 이상 | `index.html:18672~19305` | 전환 | P1 | 중 |
| F2 | `/ziwei/` 로그인 뒤 홈으로 복귀 | `js/destiny-profile.js:9782` | 전환 | P1 | 소 |
| F3 | 인앱 브라우저 미대응 | UA 감지 없음, 복귀 티켓이 sessionStorage | 전환 | P1 | 제안서 |
| F4 | 작은 꿀단지 상한 5,000원 < 고등어 10,000원 | `lib/payment/pass-policy.js:36` | 전환 | P2 | 결정 필요 |
| A1 | 일반 UTM이 주문에 안 실림 | `js/core/analytics.js:264-318`; 셸 결제 본문에 attribution 없음 | 측정 | P1 | 제안서 |
| A2 | `free_saju_started`가 로그인 뒤에만 발화 | `js/saju-engine.js:4786` | 측정 | P1 | 소 |
| A3 | `/compare/` 404, 신년운세 페이지 noindex | 운영 응답 | 노출 | P2 | 중 |

## 결정 사항과 추천

1. 대표 사이트명: "꿀꿀 운세"(띄어쓰기). alternateName에 "꿀꿀운세", "코드 데스티니", "Code Destiny". 전달받은 결정.
2. 영냥이 표기: 상담가·상품 이름으로만. "운세보는 영냥이"·"사주보는 영냥이"는 description과 alternateName에만. 전달받은 결정.
3. 화폐·이용권: 확정(2026-11-13) — 이름 통일과 표기 정리만, 결제 구조와 가격은 그대로.
4. 생선 등급: 확정(2026-11-13) — 주 표기를 "가격 + 분량", 생선명은 보조 라벨.
5. `/points/`: 확정(2026-11-13) — robots 차단만 풀고 noindex 유지, 가격 안내는 공개 페이지(개편한 천원 운세 페이지)가 맡음.
6. 영문 등 번역 페이지: 이번에는 유지. 기존 SEO 재구축의 번역 noindex 결정에 맡긴다.
7. sameAs: 확정해 준 URL만 넣는다. 받기 전에는 건드리지 않는다.
8. 로그인 벽: 확정(2026-11-13) — 무료 결과는 로그인 없이. 랜딩 CTA를 로그인 없는 결과 경로로 연결하고 저장·유료 구매 때만 로그인.
9. 작업 방식: 확정(2026-11-13) — 저장소 규칙대로. origin/main 기반 전용 워크트리에서 작업하고, 묶음마다 승인 뒤 내 커밋만 main에 push(스테이징). 운영 승격은 따로 승인.
10. C7·C8·F4는 이용권·약관 영역이라 문구를 어떻게 바꿀지 따로 승인받는다.

## 실행 계획

origin/main에서 새 워크트리를 만들어 작업한다. 묶음마다 커밋을 작게 나누고, push(스테이징)와 운영 승격은 묶음마다 승인받는다.

### 묶음 1 — 급한 문제(전달받은 목록)

- **무료 문구(C1)**: `i18n/authored/freePromo-01.json`의 title과 note를 실제 범위에 맞춘다. 제외 고지는 `free-fortune-policy.mjs` allowlist 밖의 유료 항목과 일치시킨다. 12개 언어 모두. `lib/marketing/free-promo.mjs`는 UX 세션과 겹치므로 그쪽 push 뒤에 rebase한다.
- **로그인 안내(C2)**: `lib/fortune-landings.mjs`와 `app/components/guide-cta-targets.js`의 사주·자미두수 시작 CTA를 `/saju/free/`, `/ziwei/chart/`로 바꾸고, "로그인 후 확인" 문구 9곳과 1000-won 페이지 안내를 맞춘다. `js/saju-engine.js`의 게이트 자체는 건드리지 않는다.
- **천원 운세·챕터(C3·C4)**: `app/yeongnyangi/1000-won-fortune/page.tsx`의 title·H1을 "영냥이 사주 상담 가격과 구성"으로, 첫 문단에 "천원 운세는 종료된 이벤트명"을 둔다. 챕터 수는 `consultation-expansion.ts`와 `reading-policy.ts`를 참조해 "종류 선택 5개 / 질문 상담 8개"를 한 곳에서만 설명한다. URL은 유지한다.
- **이용권 이름·구 가격(C5·C6)**: 표시 문자열을 "꿀단지 이용권"으로 통일한다(`lib/brand/moonlight-guide.mjs` 등). `CommerceDisclosure.jsx`는 `lib/payment/pass-policy.js`의 v5 가격을 읽게 한다. 정책 파일 자체는 고치지 않는다.
- **브랜드(B1)**: `lib/brand/brand-facts.mjs`의 영냥이 serviceName 결정을 바꾸고 version·reviewedAt을 올린다. `app/page.js`(워드마크, 카드명), 404 title, 브랜드 없는 title 접미사, `lib/structured-data.ts`의 WebSite·Organization alternateName을 맞춘다. `scripts/verify-home-identity.mjs` 기대값도 함께 고친다.
- **홈 title·H1(B2)**: `app/page.js:30,31,98`. H1을 검색 의도형으로 바꾸고 기존 문구는 서브카피로 둔다. 확정 문구는 `docs/seo/meta-table.md`의 현재 → 제안 표로 먼저 승인받는다.
- **`/points/`(K1)**: `lib/seo/robots-policy.mjs`에서 `/points/` Disallow를 빼고 사유를 주석으로 남긴다. `app/points/layout.tsx`의 noindex는 유지한다.
- **lastmod(K2)**: `scripts/lib/sitemap-lastmod.mjs`의 폴백을 소스 파일의 git 커밋일로 바꾸고, lastmod 없는 8개를 채운다. 매일 재생성되는 운세 라우트는 그대로 둔다.
- **`?action=`(K3)**: `public/_worker.js`에서 `action` 쿼리가 있는 응답에 `X-Robots-Tag: noindex, follow`를 붙인다. 내부 링크의 `/?action=`과 `/index.html?action=`은 `/ggulggul/?action=`으로 바꿔 302를 없앤다(UX 세션의 새 상세 페이지 9개 포함). 외부에 퍼진 기존 링크는 계속 동작한다. 라우팅 영역이라 변경 범위는 이 두 가지로 한정한다.
- **검수 절차(T1)**: `lib/content/editorial-review.mjs` 원장에 항목이 있으면 `ContentIntegrityNote`가 "검수: 이름 · 검수일"을 내고, `SeoLandingTemplate.jsx:485`가 그 값을 넘기게 한다. 검수 체크리스트는 `docs/seo/editorial-review-checklist.md`. 원장 항목은 실제 검수했다고 알려 준 페이지만 넣는다. 그 전까지 기존 고지는 그대로다.

### 묶음 2 — 검색 결과 표시와 크롤 정리

- description 잘림(M1): `lib/seo.ts`의 절단을 문장 경계 기준으로 바꾸고 허브 description을 80자 안팎으로 다시 쓴다.
- 전체 title/description 표와 키워드 → 페이지 매핑(`docs/seo/meta-table.md`, `keyword-page-map.md`) 승인 뒤 일괄 적용.
- 색인 불가 URL로 가는 내부 링크 정리(K4), about 한 문장 정의, `llms.txt` 갱신.
- 2027 신년운세 허브: `/consultations/new-year/`가 noindex라 색인 가능한 허브 1개를 새로 둔다(같은 URL을 매년 재사용 추천). 12월 초 전 색인 목표.
- 홈 이원화(B3)와 `/compare/` 인덱스(A3)는 선택지를 정리해 따로 결정받는다.
- 스테이징에서 Lighthouse로 LCP/CLS/INP 측정.

### 묶음 3 — AEO·GEO 구조

- `SeoLandingTemplate.jsx`의 반복 섹션을 페이지당 1회로, `DEFAULT_FAQS` 의존을 줄이고, 질문형 H2 아래 결론 문단을 `lib/seo-landing-pages.js`에 추가한다.
- 가격·무료 기간 옆 기준일 표시, 비교 페이지 3종 강화. 후기 스키마는 쓰지 않는다.

### 묶음 4 — 구매 동선

- 결과 화면 유료 CTA를 추천 1개 중심으로 줄인다(F1). `index.html` 결과 영역과 `js/core/saju/bundle-offer.js`만, 결제 동결 영역은 제외.
- 상품 사다리 표기(결정 3·4), 하드코딩 가격을 카탈로그 참조로 교체, `/ziwei/` 로그인 복귀 경로(F2).
- 인앱 브라우저(F3)와 UTM 주문 전달(A1)은 결제 실행 파일을 건드려야 하므로 `docs/seo/payment-change-proposal.md` 제안서만 쓰고 멈춘다.

### 묶음 5 — 측정

- `js/core/analytics.js`, `lib/analytics.ts`에 퍼널 이벤트를 기존 이름 체계에 맞춰 보강(A2), `scripts/verify-analytics-events.mjs`와 `docs/analytics-kpi.md` 갱신.
- `docs/seo/funnel-spec.md`, `docs/seo/naver-console-checklist.md` 작성.

### 손대지 않는 것

- `config/payment-freeze.json`의 동결 영역과 파일, `worker/payments/` 전체, `js/core/checkout-entry.js`, `worker/lib/portone.js`, 가격·이용권 정책 정본.
- `sajuAdapter.ts`의 `calculateLocalResult()`, KASI prefetch, `normalizeSaju.ts`, 6개 엔진.
- 기존 고지 문구 삭제, 후기·평점 스키마, 봇 전용 응답.

## 다른 세션과의 겹침

- UX 세션(`wt/ux-conversion-20261113-215142`, 미푸시 11커밋)이 `SeoLandingTemplate.jsx`, `lib/marketing/free-promo.mjs`, `app/page.js`(L67-68), `scripts/generate-sitemap.mjs`를 고친다. 그쪽 push 뒤 rebase하고, 겹치는 파일은 그 뒤에 손댄다.
- 기존 SEO 재구축 인수인계 문서는 ④를 "미승인"으로 적고 있지만 운영에 이미 있다. 묶음 1 문서 작업 때 함께 고친다.

## 검증

- 묶음마다: `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:fast`, `npm run i18n:check`와 `verify:i18n-*`, `node scripts/verify-sitemap-integrity.mjs`, `node scripts/verify-home-identity.mjs`, `npm run build`.
- 빌드 산출물과 스테이징(`staging.code-destiny.com`)에서 Yeti UA로 핵심 20개 URL을 받아 상태, title·description 길이, canonical, robots, JSON-LD 파싱을 표로 남긴다. `?action=` 응답의 X-Robots-Tag와 302 제거도 확인한다.
- 사이트맵 lastmod를 git 커밋일과 샘플 대조한다.
- 동선 변경은 스테이징에서 모바일 웹·PC로 랜딩 → 무료 결과 → 상품 → 로그인 → 결제창 진입 직전까지 확인한다. 실결제는 하지 않는다.
- 변경 전·후 비교표(title, description, H1, 링크 수, 본문 길이)를 PR 설명 대신 `docs/seo/`에 남긴다.

## 산출물

`docs/seo/phase0-report.md`(이 보고서), `keyword-page-map.md`, `meta-table.md`, `funnel-spec.md`, `naver-console-checklist.md`, `editorial-review-checklist.md`, `payment-change-proposal.md`.
