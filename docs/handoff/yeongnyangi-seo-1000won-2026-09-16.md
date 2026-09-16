---
status: active
updated: 2026-09-16
next: 천원사주 허브는 main 에 index 로 들어갔고 운영 노출은 다음 승격부터다. 승격 전 영냥이 고등어 결제 정상 확인이 조건이고, 승격 뒤 네이버 수집 요청·GSC URL 검사가 남았다.
---

# 영냥이 검색 유입 P0 — 천원사주 허브

작성: 2026-09-16 · 워크트리 `wt/yeongnyangi-seo-1000won-20260916-175031` → main 직접 머지(PR 없음)
전략 정본: [docs/seo/YEONGNYANGI_SEARCH_STRATEGY.md](../seo/YEONGNYANGI_SEARCH_STRATEGY.md)

## 다음 세션 첫 문장

"천원사주 허브(`/yeongnyangi/1000-won-fortune/`)가 main 에 index 로 들어갔다. 다음은 운영 승격 전 영냥이 고등어 결제 정상 확인 → 승격(사용자 1회 승인) → 네이버 웹페이지 수집 요청·GSC URL 검사이고, P1 은 무료 랜딩 7곳에서 허브 앵커로 가는 한 줄 링크다."

## 원래 요청

광고비 없이 네이버·구글 오가닉으로 "사주보는 고양이 영냥이" 신규 사용자를 만든다. CODE DESTINY 와 키워드가 잠식되지 않게 역할을 나누고, 무료 축(무료운세·무료사주·무료숙요점·무료자미두수·무료타로·무료궁합·오늘의운세)과 천원 축(천원운세·천원사주·천원숙요점·천원자미두수·천원타로·천원베다점·천원점성술·천원궁합)을 설계한다. 로그인·결제·운세 생성은 깨지면 안 되고, 허위 적중·후기·도어웨이·얇은 페이지 대량 생성은 금지다. 20개 항목 최종 보고 포함.

## 사용자 결정 3개

1. 무료·정보형은 CODE DESTINY 기존 랜딩, 천원·캐릭터 브랜드는 영냥이. 영냥이 무료 허브는 만들지 않는다.
2. 지금 index 로 커밋. 운영 노출은 다음 운영 승격 때. **승격 전 영냥이 고등어 결제 정상 확인.**
3. 사건 전 공개 원본이 없으므로 대통령·적중 키워드와 아카이브 제외. "두 대통령" 문구는 메타·JSON-LD 금지.

## 커밋

| 커밋 | 내용 | 되돌리면 |
| --- | --- | --- |
| C1 `9399b21e3` | 허브 `app/yeongnyangi/1000-won-fortune/page.tsx`·`page.module.css`, 워커 302·`@routes-include` 마커 삭제, `_routes.json` include 삭제, sitemap coreRoutes 추가·재생성, `/kkul-kkul-unse/` 소개 문단 링크 | 302 리다이렉트·include 복원, 허브·링크 제거 |
| C2 `0c256fc83` | `app/yeongnyangi/page.tsx` 자체 title·description·OG·twitter(noindex 유지) | 루트 OG 상속으로 복귀 |
| C3 `837a9f6fb` | `app/yeongnyangi/_original/FortuneHome.tsx` 천원 섹션에 허브 링크 1개(CRLF 보존) | 링크만 제거 |
| C4 | 전략 문서·의도맵 3행·이 인수인계 | 문서만 |

롤백: 해당 커밋만 `git revert` → `npm run sitemap:generate` → `npm run verify:sitemap-drift`.

## 실측 (2026-09-16, 로컬 dev 서버 HTML)

- 허브: title 표시폭 49(≤60), description 147(≤160), h1 1개, main 1개, canonical `https://code-destiny.com/yeongnyangi/1000-won-fortune/`, robots index/follow, JSON-LD WebPage·BreadcrumbList·Service·FAQPage(화면 FAQ 8개와 일치), 문장급 본문 2,891단위(게이트 900), "두 대통령" 0건.
- 가격·챕터는 `worker/yeongnyangi/payments/catalog.ts`·`reading-policy.ts`·`reading-manifest.ts` 에서 빌드 시 읽는다. 고등어 사주 ≠ 1,000원, 생선별 체계 가격 불일치, 모둠·오마카세 가격 불일치면 빌드가 throw 한다(fail-closed).
- 영냥이 홈: 서버 본문 286단위 → index 불가(하드 게이트 `verify:indexable-prose-depth`, pr-ci.yml). 문구를 부풀리지 않고 noindex 유지, sitemap 미등재.
- 시각 검사(visual-checker) PASS: 데스크톱·모바일 전 섹션, 표 대비 11.16:1 이상, 보조 링크 금색 밑줄.
- 영냥이 홈 천원 섹션: `1,000원 상담 알아보기 → · 천원사주 안내 보기` 로 렌더 확인(스크린샷 판정은 생략, 기존 링크 스타일 상속).

## 검증 명령

- `npm run check:fast`: exit 0 (jest 274 스위트·3,807 테스트, BLOCKED 없음)
- `node --test __tests__/ui/site-name-signals.static.test.js`: 7/7 통과
- `node scripts/verify-redirects-budget.mjs`: 규칙 94/95, 워커 include 5개 정합
- `npm run verify:sitemap-drift`: OK(URL 1,265)
- `npm run verify:seo-entity-registry`·`verify:adsense-route-policy`·`verify:paid-service-offer`(유료 9·교차 9·게이트 경로 12): 통과
- paid-gate-auditor 권고로 `verify-payment-freeze`·`verify:billing-pass-policy`·`verify:payment-choice-parity`: 통과
- postbuild 가드(`verify:adsense-readiness`·`seo-heading-integrity`·`hydrated-h1-integrity`·`internal-link-depth`)는 main CI 빌드 잡으로 판정: `837a9f6fb` PR CI 전 잡 success(Build Pages and Worker 의 "Verify SEO heading integrity"·"Verify hydrated H1 integrity"·"Verify indexable prose depth", Static guards 의 sitemap 정합 포함), Main drift watchdog·Secret Scan·AI Locale Gate·Landing Watchdog·Release 도 success
- 스테이징(라우팅 변경): `npm run verify:staging -- --sha=837a9f6fb…` PASS(Pages·Worker 837a9f6fb84a). curl: 허브 200(끝 슬래시 없으면 308), `/yeongnyangi/free-fortune/` 302→`/today/`, title·canonical·FAQPage·BreadcrumbList 렌더, h1 1개, "두 대통령" 0건, `/kkul-kkul-unse/` 허브 링크 1개, sitemap.xml 허브 1건, 영냥이 홈 og:title 교체 확인. 스테이징 robots 는 `noindex,nofollow`(스테이징 정상)
- 운영 색인(Yeti·Googlebot 수집, sitemap 반영): **미검증** — 운영 승격 전이다.

## 결정 이유 (다음 세션이 되돌리지 않게)

- **Service 에 Offer 없음**: `verify:paid-service-offer` 는 `buildKrwOffer(` 를 쓰는 파일에 큰따옴표 featureKey 리터럴과 `.github/workflows/paid-flow-gates.yml` 트리거 편입을 요구한다. 허브를 결제 게이트 트리거에 묶을 이유가 없어 Offer 를 빼고 가격은 본문 표로만 낸다.
- **결제수단 문구 "카드·카카오페이 등"**: 영냥이는 단건 전용(`worker/lib/paid-feature-registry.js` direct_only)이지만 결제창은 카드·계좌이체·카카오페이(채널 키 있을 때)·상품권 3종을 띄운다(`checkout-entry.js:619-638`). "만"으로 한정하지 않았다.
- **OG 이미지**: `og-yeongnyangi.jpg` 는 화면 스크린샷이라 CD OG(`code-destiny-og-vvip.png`)를 쓴다.
- **SeoLandingTemplate 미사용**: 자체 `<main>` 중첩과 CD 스타일, 데이터 파일(`lib/seo-landing-pages.js`)을 다른 세션이 편집 중.

## 사용자 수동 작업 (운영 승격 뒤)

1. 승격 **전**: 스테이징 또는 운영에서 영냥이 고등어 결제가 정상인지 확인한다(실결제는 승인 절차대로).
2. 네이버 서치어드바이저 → 웹페이지 수집 요청: `https://code-destiny.com/yeongnyangi/1000-won-fortune/`, sitemap 재제출.
3. GSC → URL 검사 → 색인 생성 요청(같은 URL), 리치 결과 테스트(FAQ·Breadcrumb).
4. IndexNow 는 배포 워크플로가 자동 제출한다.
5. 2주·4주 뒤 허브 노출·클릭과 검색어 "천원사주/천원 사주/사주보는 고양이" 를 SEO_STATE 같은 필터로 기록.

## 남은 일

| 등급 | 일 | 비고 |
| --- | --- | --- |
| P0 | 운영 승격 + 수집 요청 | 사용자 1회 승인 |
| P1 | 무료 랜딩 7곳 → 허브 앵커 한 줄 링크 | `lib/seo-landing-pages.js` 편집 세션 종료 후 |
| P1 | 네이버 중복 제목 1,643·설명 1,642(`?v=` URL) | 별도 세션 |
| P1 | `/fortune/tomorrow/*` 저CTR description | 별도 세션 |
| P2 | 영냥이 전용 OG 1200×630 | 자산 제작 |
| P2 | 영냥이 홈 서버 본문 900단위 확보 후 index 재판정 | 부풀리기 금지 |
| P2 | `lib/seo/entity-registry.mjs` 허브 등록 | 다른 페이지 렌더 영향 확인 후 |
| P3 | 체계별 천원 페이지 | 전략 문서 6절 분리 조건 충족 시만 |

## 기각

영냥이 무료 허브(잠식) · 체계별 천원 랜딩 6개(자동완성 수요 없음) · 적중 아카이브(원본 없음) · Offer JSON-LD(위 이유) · 영냥이 홈 index(286 < 900).

## 범위 밖 발견 (보고만)

- `worker/yeongnyangi/…/service.ts:15` `GEMINIF_API_KEY` 오타 의심 — 상품 가용성에 영향 가능.
- `domain-registry.ts` 의 requiredInput·freeEntry 가 실제 입력(`shared/input.ts`)과 어긋남.
- `index.html:20330-20333` 하드코딩 가격과 호스트 조건 없는 영냥이 프로모 블록.
- `/compatibility/` 제목 "무료 궁합" vs 사주궁합 5,000원.
- human-design 주석이 현재 정책과 충돌.
- 결제 문서는 영냥이를 "카드·카카오페이만"이라 적지만 결제창은 계좌이체·상품권도 띄움 — 정책 결정 필요.
- CI 트리거 구멍: `app/checkout/**`·`worker/yeongnyangi/payments/catalog.ts` 변경이 Paid Flow Gates 를 깨우지 않음.
- `/premium-unlock/` page 파일에서 noindex 표기를 grep 으로 찾지 못함(상위 상속 여부 미확인).
- 영냥이 홈 hero H1 에 브랜드어가 없음(noindex 라 지금은 영향 없음).
- 릴리스는 영냥이 방 복구 전까지 보류 상태(다른 세션), `yeongnyangi-mongo` 워크트리 활성, 메인 체크아웃에 마케팅 세션 미커밋 작업 있음.
