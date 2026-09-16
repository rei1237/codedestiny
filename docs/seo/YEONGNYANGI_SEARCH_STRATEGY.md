# 영냥이 검색 유입 전략 (천원사주 허브)

작성 2026-09-16. 대상: `code-destiny.com/yeongnyangi/**`(사주보는 고양이 영냥이)와 같은 도메인의 CODE DESTINY 무료 랜딩.
근거 표기: **[자동완성]** 2026-09-16 네이버 자동완성 실측 · **[네이버]** / **[GSC]** [SEO_STATE.json](SEO_STATE.json) 2026-09-14 로그인 실측 · **[편집]** 수요 미확인 편집 설계. 검색량 수치를 새로 만들지 않는다.

## 1. 확정 결정

1. **역할 분리**: 무료·정보형 검색어는 CODE DESTINY 기존 랜딩, 천원·캐릭터 브랜드 검색어는 영냥이. 영냥이 무료 허브는 만들지 않는다(`/yeongnyangi/free-fortune/` → `/today/` 302 유지).
2. **색인**: 천원사주 허브는 지금 index 로 커밋. 운영 노출은 다음 운영 승격(별도 승인) 때 시작하며, 승격 전 영냥이 고등어 결제 정상 확인이 조건이다.
3. **적중 기록 제외**: 사건 전에 공개된 원본이 없어 대통령·적중 키워드와 예측 아카이브를 만들지 않는다. 프롤로그 문구("두 대통령…")는 제목·설명·JSON-LD 에 쓰지 않는다.

## 2. 수정 전 감사 (2026-09-16 실측)

| 영역 | 현재 상태 | 문제 | 심각도 | 개선 |
| --- | --- | --- | --- | --- |
| 색인 | 영냥이 전 페이지 `noindex` | 검색엔진에 영냥이가 존재하지 않음 | P0 | 허브 1개 index. 홈은 본문 부족으로 noindex 유지(아래 6절) |
| sitemap | 영냥이 URL 0건 | 발견 경로 없음 | P0 | `/yeongnyangi/1000-won-fortune/` 추가(weekly, 0.8) |
| 라우팅 | `/yeongnyangi/1000-won-fortune*` 가 워커에서 302 | 천원 검색 착륙 URL 이 리다이렉트 | P0 | 워커 규칙·`_routes.json` include 삭제, 정적 허브로 교체 |
| 공유 카드 | 홈 og:title 이 루트 "꿀꿀 운세 \| 무료 사주·타로·궁합" 상속 | 영냥이 공유가 무료 CD 로 보임, 무료 의도와 충돌 | P1 | 홈·허브에 자체 openGraph·twitter |
| 본문 | 홈 서버 HTML 문장급 본문 286단위 | `verify:indexable-prose-depth`(900) 미달, 얇은 페이지 | P1 | 허브 2,891단위로 검색 착륙 담당 |
| 구조화 데이터 | 영냥이 JSON-LD 없음 | 브랜드·경로·FAQ 신호 없음 | P1 | 허브에 WebPage·BreadcrumbList·Service·FAQPage |
| 내부 링크 | CD 쪽 크롤 가능한 링크는 홈 정적 셸 1곳(`index.html`, utm 붙은 noindex 홈) | sitemap 페이지발 링크 0 | P1 | `/kkul-kkul-unse/` → 허브·영냥이, 영냥이 홈 천원 섹션 → 허브 |
| 키워드 | 천원 수요는 "천원사주/천원 사주"만 [자동완성] | 체계별 천원 페이지는 수요 없음 | P1 | 허브 1개 + 체계 앵커, 개별 페이지 보류 |
| 브랜드 | "영냥이" 자동완성은 "승냥이"로 교정 [자동완성] | 브랜드 인지 전 | P2 | "사주보는 고양이"를 보조 브랜드어로 병기 |
| 신뢰 자산 | 프롤로그 "두 대통령의 운명을 맞힌 밤"(본문) | 사전 공개 원본 없음 | 🔴 정책 | 메타·JSON-LD 사용 금지, 아카이브 미생성 |
| 사이트 전반 | 네이버 중복 제목 1,643·설명 1,642 [네이버] | `?v=` 변형 URL | P1 | 별도 세션(범위 밖) |

### 8개 축 평가 (영냥이 기준, 10점, 내부 평가)

운영 반영 전이라 "수정 후"는 커밋 기준 기대치다. 실제 노출은 승격 뒤 네이버·GSC 로 다시 잰다.

| 축 | 수정 전 | 수정 후(커밋) | 근거 |
| --- | --- | --- | --- |
| Technical SEO | 2 | 6 | 허브 index·canonical·sitemap·리다이렉트 제거. 홈 noindex 유지 |
| Naver SEO | 1 | 5 | 한국어 title 49폭·description 147폭, 본문 텍스트 SSR. 수집 요청은 승격 후 |
| Google SEO | 1 | 5 | 구조화 데이터 4종, googleBot index. URL 검사는 승격 후 |
| Content | 2 | 6 | 허브 본문 2,891단위, 가격·챕터를 카탈로그에서 빌드 시 주입 |
| Internal Linking | 1 | 5 | 브랜드 허브·영냥이 홈 → 천원 허브 → 7개 무료 랜딩 |
| Keywords | 2 | 6 | 실측 수요(천원사주)에 집중, 체계별은 앵커로 흡수 |
| Performance | 5 | 6 | 정적 export, 이미지 1장 width/height 지정·fetchPriority high, 클라이언트 JS 추가 없음 |
| Structured Data | 0 | 7 | WebPage·BreadcrumbList·Service(Offer 없음)·FAQPage(화면 FAQ 와 동일) |

## 3. CODE DESTINY 와 영냥이 역할

| 축 | CODE DESTINY (같은 도메인 루트) | 영냥이 `/yeongnyangi/` |
| --- | --- | --- |
| 검색 의도 | 무료 계산·정보형·시점별 운세 | 천원 상담·캐릭터 브랜드 |
| 대표 URL | `/today/` `/fortune/` `/saju/` `/sukuyo/` `/ziwei/` `/tarot/` `/compatibility/` `/vedic/` `/astrology/` `/manse/` | `/yeongnyangi/1000-won-fortune/` |
| 쓰는 말 | 무료, 사이트, 보는 법, 오늘·내일 | 천원, 1,000원, 고등어, 사주보는 고양이 |
| 쓰지 않는 말 | 천원(가격 상품명으로) | 무료(title·H1·description) |
| 결제 | 달빛 이용권·월정석·단건 | 단건 결제만(달빛 이용권·월정석 미적용) |

잠식 방지: 허브는 무료 랜딩으로 링크만 보내고 무료 키워드를 타깃하지 않는다. 무료 랜딩은 허브를 "다음 단계"로만 가리킨다.

## 4. Keyword Map

| URL | Primary | Secondary | Intent | Title | Meta Description | H1 | H2 | Schema | Internal Link | CTA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/yeongnyangi/1000-won-fortune/` ✅이번 커밋 | 천원사주 [자동완성] | 천원 사주풀이·천원 사주 사이트 [자동완성], 천원운세·1000원 사주 [편집], 사주보는 고양이 [자동완성] | C/T | 천원사주 · 천원 사주풀이 \| 사주보는 고양이 영냥이 | 천원사주·천원운세를 사주보는 고양이 영냥이와 봐요. 사주·자미두수·숙요점·베다점·점성술·타로 고등어 상담 1,000원 단건 결제, 결과는 다시 볼 수 있어요.(가격은 카탈로그 주입) | 천원사주 · 천원운세, 영냥이 고등어 상담 1,000원 | 천원사주·천원운세란 / 체계별 천원 상담 / 무료 운세와 천원 상담의 차이 / 천원 상담 이용 방법 / 생선별 가격과 상담 깊이 / 천원사주 자주 묻는 질문 / 영냥이에게 첫 이야기를 들려줘 | WebPage, BreadcrumbList, Service, FAQPage | ← `/kkul-kkul-unse/`, 영냥이 홈 / → 7개 무료 랜딩, `/compatibility/`, 정책 3종 | 사주 고등어 상담, 타로 고등어 상담, 영냥이의 방 |
| `/yeongnyangi/` (noindex 유지) | 사주보는 고양이 영냥이 | 영냥이 | N | 사주보는 고양이 영냥이 \| CODE DESTINY | 기존 CODE DESTINY 계정으로 영냥이의 사주, 자미두수, 숙요, 베다, 점성술, 타로 상담을 만나보세요. | 네 운명의 이야기, 내가 읽어줄게. | (기존 화면) | 없음 | → 허브(천원 섹션) | 1,000원 상담 알아보기 |
| `/kkul-kkul-unse/` | 꿀꿀운세 [네이버 13클릭/40노출] | 꿀꿀 운세, 꽃돼지 사주, 코드데스티니 | N | (기존 유지) | (기존 유지) | (기존 유지) | 기존 + 영냥이 소개 문단 | 기존 | → 허브, 영냥이 | 기존 |
| `/today/` | 오늘의 운세 | 오늘의운세, 생년월일 운세, 일일 운세 | T | 오늘의 운세 \| 생년월일 운세로 보는 오늘 재물운·연애운 | (기존) | 오늘의 운세 바로 확인 | (기존) | 기존 | → 허브(P1 ✅ nextStep) | 오늘 운세 보기 |
| `/fortune/` | 무료 운세 | 무료운세, 띠별 운세, 별자리 운세 | T | 무료 운세 \| 오늘·내일·주간·월간 별자리·띠별 운세 | (기존) | (기존) | (기존) | 기존 | 시점별 하위 | 기존 |
| `/saju/` | 무료 사주 | 무료사주, 무료 사주 풀이, 사주 [GSC 19위] | T/I | 무료 사주 풀이 \| 사주팔자 오행·십성·대운 보는 곳 | (기존) | 무료 사주 풀이 — 사주팔자 오행·십성·대운 | (기존) | 기존 | → 허브 `#saju`(P1 ✅ nextStep) | 기존 |
| `/sukuyo/` | 숙요점 사이트 [네이버 21/724] | 숙요점 [네이버 20/591], 무료 숙요점 | T | 숙요점 사이트 \| 무료 27수 본명숙·숙요 궁합 보기 | (기존) | 숙요점 사이트 — 생년월일로 내 본명숙 찾기 | (기존) | 기존 | → 허브 `#sukuyo`(P1 ✅ nextStep) | 기존 |
| `/ziwei/` | 자미두수 사이트 | 무료 자미두수, 자미두수 무료 | T | 자미두수 사이트 \| 무료 명반 12궁·명궁·사화 바로 보기 | (기존) | 자미두수 사이트 — 무료 명반과 12궁 풀이 | (기존) | 기존 | → 허브 `#ziwei`(P1 ✅ nextStep) | 기존 |
| `/tarot/` | 무료 타로 | 무료타로, 연애 타로 | T | 무료 타로 카드 리딩 \| 연애·재회·마음 해석 | (기존) | 무료 타로 카드 리딩 | (기존) | 기존 | → 허브 `#tarot`(P1 ✅ nextStep) | 기존 |
| `/compatibility/` | 무료 궁합 | 무료궁합, 사주 궁합, 숙요점 궁합 | T | 무료 궁합 보기 \| 사주·숙요점·타로 궁합 보는 곳 | (기존) | 무료 궁합 보기 — 세 가지 방식으로 | (기존) | 기존 | ← 허브 FAQ(천원 궁합) | 기존 |
| `/vedic/` | 베다점 사이트 | 인도 점성술 [네이버 20/355] | T | 베다점 사이트 \| 무료 인도 점성술 라그나·나크샤트라·다샤 | (기존) | (기존) | (기존) | 기존 | → 허브 `#vedic`(P1 ✅ nextStep) | 기존 |
| `/astrology/` | 무료 점성술 | 출생차트 무료, 별자리 운세 무료 | T | 무료 점성술 운세 사이트 \| 출생차트·별자리 운세 무료 보기 | (기존) | 무료 점성술 운세 — 출생차트로 보는 별자리 | (기존) | 기존 | → 허브 `#astrology`(P1 ✅ nextStep) | 기존 |

"(기존)"은 이번 세션에서 바꾸지 않았다는 뜻이다. CD 랜딩 데이터 `lib/seo-landing-pages.js` 는 다른 세션이 편집 중이라 손대지 않았다(허브 한 줄 링크는 같은 날 후속 커밋에서 `nextStep` 필드로 추가 — title·h1·description 은 그대로).

### 띄어쓰기·표기 변형

한 페이지가 흡수한다. 변형마다 페이지를 만들지 않는다.

- 천원사주 / 천원 사주 / 천원 사주풀이 / 1000원 사주 / 1,000원 사주 → 허브. title 에 "천원사주"와 "천원 사주풀이"를 함께 쓰고, 본문은 가격을 "1,000원"(카탈로그 값)으로 표기한다.
- 천원운세 / 천원 운세 / 1000원 운세 → 같은 허브(H1·OG 제목에 "천원운세").
- 사주보는 고양이 / 사주 보는 고양이 / 사주보는 고양이 영냥이 → 허브 title 브랜드부.
- 무료운세 / 무료 운세 → `/fortune/`. 오늘의운세 / 오늘의 운세 → `/today/`. 무료사주 / 무료 사주 → `/saju/`.
- 코드데스티니 / CODE DESTINY / 코드 데스티니 → `/`.

## 5. 퍼널

정보형(CD 가이드·인사이트) → 무료 계산(CD 랜딩) → 천원 상담(영냥이 허브 → 고등어) → 연어 3,000원 · 광어 5,000원 · 참치 10,000원 · 모둠 20,000원 · 오마카세 30,000원. 가격은 문서 작성일 카탈로그 값이며 화면은 `worker/yeongnyangi/payments/catalog.ts` 에서 빌드 시 읽는다.

## 6. 천원 축 SEO

### 천원운세 (브랜드 카테고리)
자동완성 수요는 없다 [자동완성]. 별도 URL 없이 허브의 H1·OG 제목·description 에 병기해 카테고리 이름으로만 쓴다.

### 천원사주 (주력)
유일하게 수요가 확인된 천원 키워드다(확장: 사주풀이·사이트·후기) [자동완성]. 허브의 title primary 로 둔다. "후기" 의도에는 가짜 후기가 아니라 결과 구성·다시 보기·환불 정책 링크로 답한다. 실제 이용 후기를 동의 받아 모으는 체계가 생기기 전에는 Review·AggregateRating 을 넣지 않는다.

### 천원숙요점
"천원 숙요" 자동완성은 없다 [자동완성]. 허브 `#sukuyo` 앵커로 흡수한다. 고등어 숙요 상담 중 관계 주제만 궁합 입력을 받으므로 "천원 궁합"은 숙요 관계 주제로만 안내하고, 나머지 궁합은 `/compatibility/` 로 보낸다. 단독 천원궁합 상품은 없다.

### 천원자미두수
"천원 자미두수" 자동완성은 없다 [자동완성]. 허브 `#ziwei` 앵커로 흡수한다. 천원타로는 "천안 타로"(지역 의도)로 교정되고, 천원 베다점·점성술도 같은 처리를 한다.

### 개별 천원 페이지 분리 조건
아래를 **모두** 만족할 때만 체계별 페이지를 만든다.

1. 네이버 서치어드바이저 또는 GSC 검색어 표에 해당 체계의 "천원/1000원 + 체계명" 검색어가 **2회 연속 월간 관측**에서 허브로 노출된다.
2. 허브의 해당 앵커 절이 그 검색어의 첫 답을 다 담지 못한다(입력·챕터·가격 외 고유 설명이 800단위 이상 필요).
3. 새 페이지가 `verify:indexable-prose-depth`(900) 를 복붙 없이 넘고, 허브와 제목·H1 이 겹치지 않는다.

## 7. 무료운세 전략 (CD 담당)

- 이미 노출 중인 곳에 집중한다: 네이버 상위 페이지는 `/vedic/`, `/fortune/tomorrow/*`(띠·별자리), `/sukuyo/`, `/naming-ai/` 다 [네이버].
- `/fortune/tomorrow/scorpio/` 는 노출 12,168회에 클릭 57회(0.47%)라 description·첫 문단 개선 여지가 가장 크다 [네이버 페이지 실측].
- `/fortune/`(title "무료 운세")와 `/today/`(keywords 에 "무료 운세")가 같은 말을 쓴다. 두 URL 이 같은 검색어로 번갈아 노출되는지 네이버·GSC 로 확인한 뒤에만 역할을 조정한다.
- 무료 랜딩에서 허브로 가는 링크는 "무료 결과 다음에 캐릭터 상담으로 이어 보기" 한 줄로만 둔다(P1). 무료 랜딩의 title·H1 에 천원을 넣지 않는다.

## 8. 숙요점 클러스터

기존 URL 31개(sitemap 기준)로 이미 클러스터가 있다. 새 글보다 역할 정리가 먼저다.

| 층 | URL | 역할 |
| --- | --- | --- |
| 서비스 | `/sukuyo/` | 내 본명숙 계산("숙요점 사이트") |
| 서비스 | `/sukuyo/compatibility/`, `/sukuyo/calendar/`, `/sukuyo-compatibility-ai/` | 두 사람 계산, 일운, AI 궁합 |
| 가이드 허브 | `/sukuyo/guide/`, `/insights/sukuyo/` | 체계 설명·글 목차 |
| 기초 | `/insights/sukuyo-what-is/`, `sukuyo-basics`, `sukuyo-27-mansions`, `sukuyo-beginner-terms-easy-dictionary`, `sukuyo-bonmyeongsuk-how-to-find`, `sukuyo-bonmyeongsuk-vs-wolmyeongsuk`, `sukuyo-three-group-types-guide`, `sukuyo-27-guardian-animals-origin-guide` | 용어·계산 원리 |
| 관계 | `sukuyo-myeongseong`(명), `sukuyo-antai`(업태), `sukuyo-eishin`(영친), `sukuyo-useo`(우쇠), `sukuyo-ankai`(안괴), `sukuyo-wiseong`(성위), `sukuyo-compatibility-guide` | 관계별 의미. 업태·영친은 GSC 8위대 [GSC] |
| 실전 | `sukuyo-love`, `sukuyo-marriage`, `sukuyo-love-communication-rules`, `sukuyo-couple-finance-rhythm-guide`, `sukuyo-friendship-teamwork-guide`, `sukuyo-boundary-setting-practical-guide`, `sukuyo-conflict-repair-dialogue-templates`, `sukuyo-day-by-day-rhythm-usage`, `sukuyo-qa-most-asked-questions`, `sukuyo-vs-saju-compatibility` | 적용 |
| 천원 상담 | `/yeongnyangi/1000-won-fortune/#sukuyo` | 고등어 숙요 상담 |

주의: 사용자는 "숙요점 위성"으로 검색하는데 [자동완성], SEO·인사이트 문안은 `8fec9124a` 에서 위성→성위로 이미 바뀌었다(다른 세션 축). 옛 표기를 별칭으로 한 번 병기할지는 숙요 축 세션이 결정한다.

## 9. 대통령·유명인 활용 현황

- 사건 전에 공개된 예측 원본이 없다. `celebrity-editorial.js:19` 규칙대로 출처 없는 적중 표기를 금지한다.
- 이번 변경에서 대통령·적중 관련 title·description·JSON-LD·키워드는 0건이다(허브 HTML 실측, "두 대통령" 미포함).
- 공개 유명인 콘텐츠 156건은 기존 [CELEBRITY_CONTENT_AUDIT.md](CELEBRITY_CONTENT_AUDIT.md) 기준을 그대로 따른다. 영냥이와 연결하지 않는다.
- 나중에 신뢰 자산을 만들려면 **사건 전 날짜가 찍힌 공개 게시물**(예: 발행일이 남는 블로그·SNS 원본)부터 쌓아야 한다. 사후 작성 글을 사전 적중처럼 쓰지 않는다.

## 10. 네이버 최적화

- [x] 본문 텍스트가 서버 HTML 에 있음(정적 export, 클라이언트 렌더 의존 없음).
- [x] title 49폭·description 147폭(한글 2폭 계산), 페이지 고유.
- [x] canonical 은 자기 URL(trailing slash), og:title·og:description·og:image·og:url.
- [x] H1 1개, H2 7개, 표는 `<table>`·`<caption>`.
- [x] robots.txt 가 `/yeongnyangi/` 를 막지 않음(`app/robots.ts` private 규칙에 없음).
- [ ] 운영 승격 후: 서치어드바이저 **웹페이지 수집 요청**(허브 URL), sitemap 재제출, 수집 현황에서 Yeti 수집 확인.
- [ ] 운영 승격 후: `curl -A "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)" -I https://code-destiny.com/yeongnyangi/1000-won-fortune/` 200 확인.
- 범위 밖: 사이트 전체 중복 제목 1,643·설명 1,642(`?v=` 변형 URL)가 네이버 품질 신호를 깎는다(P1).

## 11. 구글 최적화

- [x] `robots: index, follow` + googleBot index.
- [x] JSON-LD 4종, FAQPage 는 화면 FAQ 8개와 문장 일치. Review·AggregateRating 없음.
- [x] Service 에 Offer 를 넣지 않음: `verify:paid-service-offer` 가 `buildKrwOffer` 사용 파일을 Paid Flow Gates 트리거에 묶도록 강제한다. 가격은 본문 표로만 노출한다.
- [ ] 운영 승격 후: GSC **URL 검사 → 색인 생성 요청**, 리치 결과 테스트(FAQ·Breadcrumb).
- IndexNow 는 배포 워크플로가 자동 제출한다(수동 불필요).

## 12. sitemap·robots

- `scripts/generate-sitemap.mjs` coreRoutes 에 허브 1건 추가 → `npm run sitemap:generate` 로 `sitemap.xml`·`sitemap-ko.xml`·public 미러·`config/sitemap-lastmod.json` 재생성. 손으로 머지하지 않는다.
- 영냥이 홈은 noindex 라 sitemap 에 넣지 않는다(noindex URL 의 sitemap 등재는 신호 충돌).
- noindex 대상 확인(2026-09-16 grep): `/login/` `/signup/` `/checkout/` `/admin/` `/points/` `/share/` `/dev-status/` `/neo-operation-room/` `/neo-war-room/` `/account/**`(레이아웃·페이지) `/auth/**` `/yeongnyangi/fortune/` `/yeongnyangi/library/` `/yeongnyangi/result/` `/yeongnyangi/room/` 모두 noindex. robots.txt 는 `/api/`(단 `/api/og` 허용) `/admin/` `/account/` `/auth/` `/checkout/` `/payment(s)/` `/result(s)/` `/test/` 등을 막는다.
- 확인 필요(범위 밖): `/premium-unlock/` 은 page 파일에 noindex 표기를 grep 으로 찾지 못했다(sitemap·robots 에도 없음). 상위 레이아웃 상속 여부를 별도 확인한다.

## 13. 내부 링크

- 추가: `/kkul-kkul-unse/`(sitemap 페이지) → `/yeongnyangi/`, `/yeongnyangi/1000-won-fortune/`. 영냥이 홈 천원 섹션 → 허브.
- 허브 → `/today/` `/saju/` `/ziwei/` `/sukuyo/` `/vedic/` `/astrology/` `/tarot/` `/compatibility/` `/refund-policy/` `/privacy-policy/` `/contact/` `/yeongnyangi/library/` 와 상담 CTA.
- 깊이: 홈 → 브랜드 허브 → 천원 허브로 2홉(`internal-link-depth` MAX_HOPS 2 안).
- P1 완료: 7개 무료 랜딩에서 허브 해당 앵커로 한 줄 링크(`lib/seo-landing-pages.js` 의 `yeongnyangiNextStep` → `SeoLandingTemplate` 면책 섹션 위, `/today/` 는 `TodayReadingGuide` 결과 목록 아래).

## 14. 성능

- 정적 HTML, 서버 컴포넌트만 사용해 클라이언트 JS 를 추가하지 않았다.
- 히어로 이미지 1장 480×480 명시(CLS 방지), `fetchPriority="high"`. 나머지 이미지 없음.
- CSS 모듈 1개, 레이아웃이 주는 `--yn-*` 토큰만 사용. 웹폰트 추가 없음.
- 표는 `overflow-x: auto` 컨테이너 안에 있어 모바일 본문 가로 스크롤이 없다.

## 15. SEO 자동 점검

새 도구를 만들지 않고 기존 가드를 쓴다(중복 가드 금지 원칙).

| 점검 | 명령 | 언제 |
| --- | --- | --- |
| title·description 폭, 홈 상속, 외부 링크 | `verify:adsense-readiness` | CI postbuild |
| 본문 깊이 900단위 | `npm run verify:indexable-prose-depth` (로컬 탐침: `PROSE_DEPTH_BASE_DIR=<html 폴더> … --report`) | CI 하드 게이트 |
| H1·제목 계층 | `seo-heading-integrity`, `hydrated-h1-integrity` | CI postbuild |
| 내부 링크 깊이 | `internal-link-depth` | CI postbuild |
| sitemap 원장 | `npm run verify:sitemap-drift` | 페이지 편집마다 |
| 리다이렉트·워커 include | `node scripts/verify-redirects-budget.mjs` | 라우팅 변경 시 |
| 유료 Offer 정합 | `npm run verify:paid-service-offer` | 가격 표기 변경 시 |
| 사이트명 신호 | `__tests__/ui/site-name-signals.static.test.js` | 메타 변경 시 |

## 16. 우선순위

| 등급 | 작업 | 상태 |
| --- | --- | --- |
| P0 | 천원사주 허브 index·sitemap·리다이렉트 제거·구조화 데이터 | ✅ 커밋(운영 미반영) |
| P0 | 운영 승격 전 영냥이 고등어 결제 정상 확인 → 승격 → 네이버 수집 요청·GSC URL 검사 | ⏳ 사용자 승인 필요 |
| P1 | 영냥이 홈·허브 OG 분리 | ✅ 커밋 |
| P1 | 무료 랜딩 7곳 → 허브 앵커 한 줄 링크 | ✅ 커밋(운영 노출은 다음 승격부터) |
| P1 | `?v=` 중복 제목·설명 정리 | 별도 세션 |
| P1 | `/fortune/tomorrow/*` 저CTR description 개선 | 별도 세션 |
| P2 | 영냥이 전용 OG 이미지 1200×630 | 대기(현재 CD OG 사용, `og-yeongnyangi.jpg` 는 스크린샷) |
| P2 | 영냥이 홈 서버 본문 900단위 확보 후 index 재판정 | 대기 |
| P2 | `lib/seo/entity-registry.mjs` 에 허브 등록 | 대기 |
| P3 | 체계별 천원 페이지 | 6절 분리 조건 충족 시만 |
| P3 | 실제 이용 후기 수집 체계 | 동의·검증 구조 설계 후 |

## 17. 기준선 (운영 반영 전)

2026-09-14 로그인 실측, [SEO_STATE.json](SEO_STATE.json) 인용.

| 지표 | 값 |
| --- | --- |
| 네이버 최근 30일 | 클릭 1.4천 · 노출 13.7만 · CTR 1% · 색인 4.4백 |
| 네이버 상위 검색어 | 숙요점 사이트 21/724 · 숙요점 20/591 · 인도 점성술 20/355 · 무료작명사이트 15/101 · 꿀꿀운세 13/40 (클릭/노출) |
| GSC 2026-06-12~09-11 | 클릭 31 · 노출 377 · CTR 8.2% · 평균 25.1위 · 색인 276 |
| 영냥이 | 색인 0 · sitemap 0 · 검색 유입 측정 불가(noindex) |

다음 측정: 운영 승격 후 2주·4주에 허브 URL 의 네이버 노출·클릭, GSC 검색어 "천원사주/천원 사주/사주보는 고양이" 를 같은 필터로 기록한다.

## 18. 집중 키워드 TOP 100

등급: **A** 실측 수요 + 맞는 페이지 존재 → 지금 집중 · **B** 핵심 무료·브랜드 카테고리, 페이지 있음, 검색어 수치 미확인 · **C** 정보형 롱테일·클러스터 보강 · **D** 보류·제외.
"네이버 페이지"는 페이지 단위 실측이라 검색어 순위가 아니다.

| # | 키워드 | 등급 | 대상 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 천원사주 | A | 허브 | 자동완성 |
| 2 | 천원 사주 | A | 허브 | 자동완성 |
| 3 | 천원 사주풀이 | A | 허브 | 자동완성 확장 |
| 4 | 천원 사주 사이트 | A | 허브 | 자동완성 확장 |
| 5 | 천원사주 후기 | A | 허브(결과 구성·정책으로 응답) | 자동완성 확장 |
| 6 | 사주보는 고양이 | A | 허브 | 자동완성 |
| 7 | 꿀꿀운세 | A | `/kkul-kkul-unse/` | 네이버 13/40 |
| 8 | 숙요점 사이트 | A | `/sukuyo/` | 네이버 21/724 |
| 9 | 숙요점 | A | `/sukuyo/` | 네이버 20/591 · GSC 24.6위 |
| 10 | 인도 점성술 | A | `/vedic/` | 네이버 20/355 |
| 11 | 무료작명사이트 | A | `/naming-ai/` | 네이버 15/101 |
| 12 | 숙요점 업태 | A | `/insights/sukuyo-antai/` | GSC 8위 |
| 13 | 숙요점 영친 | A | `/insights/sukuyo-eishin/` | GSC 8.7위 |
| 14 | 숙요 궁합 | A | `/sukuyo/compatibility/` | GSC 4회 28.8위 |
| 15 | 만세력 | A | `/manse/` | GSC 5회 19.6위 |
| 16 | 사주 | A | `/saju/` | GSC 2/2 19위 |
| 17 | 만세력 사주 | A | `/manse/` | GSC 1/1 |
| 18 | 소띠 내일 운세 | A | `/fortune/tomorrow/ox/` | 네이버 페이지 71/5,092 |
| 19 | 전갈자리 내일 운세 | A | `/fortune/tomorrow/scorpio/` | 네이버 페이지 57/12,168 |
| 20 | 처녀자리 내일 운세 | A | `/fortune/tomorrow/virgo/` | 네이버 페이지 53/7,258 |
| 21 | 천칭자리 내일 운세 | A | `/fortune/tomorrow/libra/` | 네이버 페이지 51/6,271 |
| 22 | 쥐띠 내일 운세 | A | `/fortune/tomorrow/rat/` | 네이버 페이지 59/2,056 |
| 23 | 돼지띠 내일 운세 | A | `/fortune/tomorrow/pig/` | 네이버 페이지 57/2,079 |
| 24 | 베다점 | A | `/vedic/` | 네이버 페이지 78/1,687 |
| 25 | 숙요점 위성 | A | `/insights/sukuyo-wiseong/` | 자동완성(용어 교체 주의) |
| 26 | 천원운세 | B | 허브 | 자동완성 없음 · 카테고리 |
| 27 | 천원 운세 | B | 허브 | 편집 |
| 28 | 1000원 사주 | B | 허브 | 편집 |
| 29 | 1000원 운세 | B | 허브 | 자동완성 없음 |
| 30 | 영냥이 | B | 허브 | 자동완성은 "승냥이" 교정 |
| 31 | 사주보는 고양이 영냥이 | B | 허브 | 편집 |
| 32 | 사주 보는 고양이 | B | 허브 | 편집 |
| 33 | 코드데스티니 | B | `/` | 편집 |
| 34 | CODE DESTINY | B | `/` | 편집 |
| 35 | 꿀꿀 운세 | B | `/kkul-kkul-unse/` | 편집 |
| 36 | 무료 사주 | B | `/saju/` | 편집 |
| 37 | 무료사주 | B | `/saju/` | 편집 |
| 38 | 무료 사주 풀이 | B | `/saju/` | 편집 |
| 39 | 무료 운세 | B | `/fortune/` | 편집 |
| 40 | 무료운세 | B | `/fortune/` | 편집 |
| 41 | 오늘의 운세 | B | `/today/` | 편집 |
| 42 | 오늘의운세 | B | `/today/` | 편집 |
| 43 | 무료 숙요점 | B | `/sukuyo/` | 편집 |
| 44 | 무료 자미두수 | B | `/ziwei/` | 편집 |
| 45 | 자미두수 사이트 | B | `/ziwei/` | 편집 |
| 46 | 자미두수 | B | `/ziwei/`, `/ziwei/guide/` | 편집 |
| 47 | 무료 타로 | B | `/tarot/` | 편집 |
| 48 | 무료타로 | B | `/tarot/` | 편집 |
| 49 | 무료 궁합 | B | `/compatibility/` | 편집 |
| 50 | 무료궁합 | B | `/compatibility/` | 편집 |
| 51 | 사주 궁합 | B | `/compatibility/` | 편집 |
| 52 | 베다점 사이트 | B | `/vedic/` | 편집 |
| 53 | 무료 점성술 | B | `/astrology/` | 편집 |
| 54 | 무료 만세력 | B | `/manse/` | 편집 |
| 55 | 꽃돼지 사주 | B | `/kkul-kkul-unse/` | 편집 |
| 56 | 숙요점 궁합 | C | `/sukuyo/compatibility/` | 편집 |
| 57 | 본명숙 찾기 | C | `/insights/sukuyo-bonmyeongsuk-how-to-find/` | 편집 |
| 58 | 본명숙 월명숙 차이 | C | `/insights/sukuyo-bonmyeongsuk-vs-wolmyeongsuk/` | 편집 |
| 59 | 숙요점 27수 | C | `/insights/sukuyo-27-mansions/` | 편집 |
| 60 | 숙요점 안괴 | C | `/insights/sukuyo-ankai/` | 편집 |
| 61 | 숙요점 명관계 | C | `/insights/sukuyo-myeongseong/` | 편집 |
| 62 | 숙요점 우쇠 | C | `/insights/sukuyo-useo/` | 편집 |
| 63 | 숙요점 성위 | C | `/insights/sukuyo-wiseong/` | 편집 |
| 64 | 숙요점 연애 | C | `/insights/sukuyo-love/` | GSC 페이지 9위 |
| 65 | 숙요점 결혼 | C | `/insights/sukuyo-marriage/` | 편집 |
| 66 | 숙요점이란 | C | `/insights/sukuyo-what-is/` | 편집 |
| 67 | 숙요점 용어 | C | `/insights/sukuyo-beginner-terms-easy-dictionary/` | 편집 |
| 68 | 숙요 사주 궁합 차이 | C | `/insights/sukuyo-vs-saju-compatibility/` | 편집 |
| 69 | 숙요 일운 | C | `/sukuyo/calendar/` | 편집 |
| 70 | 숙요점 수호동물 | C | `/insights/sukuyo-27-guardian-animals-origin-guide/` | 편집 |
| 71 | 자미두수 보는법 | C | `/ziwei/guide/` | 편집 |
| 72 | 자미두수 명반 | C | `/ziwei/` | 편집 |
| 73 | 사주팔자 풀이 | C | `/saju/` | GSC 16.5위 |
| 74 | 만세력 보는 법 | C | `/manse/` | 편집 |
| 75 | 나크샤트라 | C | `/vedic/` | 편집 |
| 76 | 점성술 | C | `/astrology/` | GSC 4회 89.3위 |
| 77 | 점성술 연애운 | C | `/insights/astrology-synastry-compatibility-fun-guide/` | GSC 54위 |
| 78 | 별자리 운세 무료 | C | `/astrology/` | 편집 |
| 79 | 띠별 운세 | C | `/fortune/` | 편집 |
| 80 | 연애운 | C | `/love/` | 편집 |
| 81 | 재물운 | C | `/saju/` | 편집 |
| 82 | 초융합운세 | C | `/insights/fusion/` | 편집 |
| 83 | 사주 잘보는 곳 | C | `/saju/` | 편집 |
| 84 | 무료 사주 사이트 | C | `/saju/` | 편집 |
| 85 | 천원 숙요 궁합 | C | 허브 `#sukuyo` | 편집(숙요 관계 주제만) |
| 86 | 천원 숙요점 | C | 허브 `#sukuyo` | 자동완성 없음 |
| 87 | 천원 자미두수 | C | 허브 `#ziwei` | 자동완성 없음 |
| 88 | 천원 타로 | C | 허브 `#tarot` | 자동완성은 "천안 타로" |
| 89 | 대통령 사주 적중 | D | 없음 | 사전 공개 원본 없음 |
| 90 | 두 대통령 운명 | D | 없음 | 메타 사용 금지 |
| 91 | 사주 적중 사이트 | D | 없음 | 검증 불가 주장 |
| 92 | 천원궁합 | D | 허브 FAQ 만 | 단독 상품 없음 |
| 93 | 천원 베다점 | D | 허브 앵커만 | 수요 미확인, 개별 페이지 보류 |
| 94 | 천원 점성술 | D | 허브 앵커만 | 수요 미확인, 개별 페이지 보류 |
| 95 | 영냥이 무료 운세 | D | `/today/`(302) | 역할 분리 |
| 96 | 천원사주 무료 | D | 없음 | 모순 의도, 허브에 무료 표기 금지 |
| 97 | 영냥이 후기 | D | 없음 | 가짜 후기 금지, 수집 체계 전 보류 |
| 98 | 무료 AI 사주 무제한 | D | 없음 | 사실과 다름 |
| 99 | 천안 타로 | D | 없음 | 지역 의도 |
| 100 | 승냥이 | D | 없음 | 오탈자 교정 대상 |

## 19. 추가 콘텐츠 30

기존 URL 개선을 먼저 한다. 키워드별 얇은 신규 페이지를 대량으로 만들지 않는다. LLM 으로 샘플 결과를 생성하려면 과금 1회 승인이 필요하다.

| # | 대상 | 내용 | 등급 |
| --- | --- | --- | --- |
| 1 | `/sukuyo/` | "숙요점 사이트" 첫 답: 본명숙 계산 위치를 첫 화면 문장으로(네이버 724노출) | P1 |
| 2 | `/insights/sukuyo-wiseong/` | 옛 검색어 "위성" 별칭 병기 여부(성위로 교체 완료 뒤) | P1 |
| 3 | `/insights/sukuyo-antai/` | 업태 첫 답 보강(GSC 8위) | P1 |
| 4 | `/insights/sukuyo-eishin/` | 영친 첫 답 보강(GSC 8.7위) | P1 |
| 5 | `/sukuyo/compatibility/` | 입력 → 결과 구조 설명 | P2 |
| 6 | `/insights/sukuyo-compatibility-guide/` | 관계 6종 읽는 순서 목차화 | P2 |
| 7 | `/insights/sukuyo/` | 기초·관계·실전 3갈래 목차 | P2 |
| 8 | `/vedic/` | "인도 점성술" 의도 문장 보강(네이버 355노출) | P1 |
| 9 | `/naming-ai/` | 무료 범위와 가격 정책 명확화 | P1 |
| 10 | `/manse/` | 만세력 읽는 순서 | P2 |
| 11 | `/fortune/tomorrow/scorpio/` 외 별자리 | CTR 1% 미만 description·첫 문단 | P1 |
| 12 | `/fortune/tomorrow/<띠>/` | 동일 | P1 |
| 13 | `/fortune/` vs `/today/` | "무료 운세" 잠식 여부 측정 후 역할 문장 | P2 |
| 14 | `/compatibility/` | "무료 궁합" 제목 vs 사주궁합 5,000원 정합 | P1 |
| 15 | `/saju/` | 무료 범위 다음 단계로 허브 `#saju` 한 줄 | P1 |
| 16 | `/ziwei/` | 허브 `#ziwei` 한 줄 | P1 |
| 17 | `/sukuyo/` | 허브 `#sukuyo` 한 줄 | P1 |
| 18 | `/tarot/` | 허브 `#tarot` 한 줄 | P1 |
| 19 | `/vedic/` · `/astrology/` | 허브 앵커 한 줄 | P1 |
| 20 | `/today/` | 허브 한 줄 | P1 |
| 21 | `/about/` | 운영 주체와 브랜드 관계(꿀꿀 운세·영냥이) | P2 |
| 22 | `/yeongnyangi/` | 서버 본문 900단위 확보 후 index 재판정 | P2 |
| 23 | 허브 | 영냥이 전용 OG 이미지 | P2 |
| 24 | 허브 `#prices` | 생선별 차이를 실제 챕터 목록으로 보강(카탈로그 주입 유지) | P2 |
| 25 | 허브 | 동의 받은 실제 후기 섹션(수집 체계 생긴 뒤) | P3 |
| 26 | 허브 | "예시" 표시한 가상 인물 결과 구조(실제 엔진·과금 승인 후) | P3 |
| 27 | `/insights/sukuyo-27-mansions/` | 27수 개별 페이지 대신 한 페이지 앵커 강화 | P2 |
| 28 | `/new-year-ai-consultation/` | 2027 신년운세 시즌 갱신 | P2 |
| 29 | 체계별 천원 페이지 | 6절 분리 조건 충족 시만 | P3 |
| 30 | 적중 기록 | 사건 전 날짜가 남는 공개 게시물부터 축적(아카이브는 그 뒤) | P3 |

## 20. 기각한 것

- 영냥이 무료 허브: CD 무료 랜딩과 잠식.
- 체계별 천원 랜딩 6개: 자동완성 수요 없음, 얇은 페이지 반복.
- 대통령·유명인 적중 아카이브: 사전 공개 원본 없음.
- Service Offer JSON-LD: Paid Flow Gates 트리거 편입 없이 넣으면 가드 실패. 가격은 본문 표로.
- 영냥이 홈 index: 본문 286단위로 하드 게이트 미달. 문구를 부풀리지 않는다.
