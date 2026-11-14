# push 전 로컬 사전 점검 (빌드 산출물 기준)

- 작성일: 2026-11-14
- 대상: 브랜치 `wt/naver-seo-geo-20261113-234756`, 빌드한 HEAD `3e2f444bd`(origin/main `05211086c` 위). 그 뒤 origin/main `9a6ac23eb` 위로 한 번 더 rebase했고(HEAD는 이 문서 커밋 기준 `git log`로 확인), 그 사이 upstream 변경은 toss 앱·문서뿐이라 다시 빌드하지 않았다.
- 방법: `ALLOW_DEV_SERVER_DURING_BUILD=1 npm run build`가 만든 `dist/`의 `<경로>/index.html`을 읽어 정규식으로 뽑았다. 스테이징·운영 서버는 보지 않았다. 워커(`_worker.js`)가 응답에 붙이는 헤더(`X-Robots-Tag` 등)와 리다이렉트, Yeti UA 응답, Lighthouse는 이 점검에 들어 있지 않다(push 뒤 스테이징에서 확인).
- 글자 수는 유니코드 코드포인트 기준이다. robots 열은 `max-snippet` 등 미리보기 지시어를 생략해 적었다. H1 열은 태그를 걷어 낸 글자라 줄바꿈 자리의 띄어쓰기가 빠져 보일 수 있다.

## 핵심 20개 경로

| 경로 | title (글자 수) | description (글자 수) | canonical | robots | hreflang | JSON-LD (파싱 성공/전체 · 유형) | H1 |
|---|---|---|---|---|---|---|---|
| `/` | 꿀꿀 운세 \| 사주·타로·자미두수 운세 상담 (24) | 꿀꿀 운세는 명리학자 박병하(네오)가 만든 운세 서비스예요. 사주·궁합·타로·자미두수를 살펴보고, 고민은 영냥이 상담에서 챕터별로 읽어 보세요. (80) | 자기 자신 | index, follow | 9개 (ko=/, x-default=/) | 2/2 · Organization, WebSite, WebPage, Person, Service | 1개 · 꿀꿀 운세 — 사주·타로·자미두수 운세 상담 |
| `/ggulggul/` | 꽃돼지 연이 운세 \| 사주·타로 시작하기 – 꿀꿀 운세 (30) | 꿀꿀 운세에서 사주·자미두수·숙요점·베다점·타로·점성술을 만나보세요. 꽃돼지 연이, 네오, 영냥이와 고민에 맞는 운세와 상담을 골라보세요. (77) | 자기 자신 | index, follow | 없음 | 1/1 · Organization, WebSite, WebPage, Person, ImageObject, ItemList | 1개 · 오늘은 어떤 이야기가궁금하세요? |
| `/saju/` | 사주 원국 확인·사주팔자 해석 안내 \| 꿀꿀 운세 (27) | 생년월일로 사주팔자 원국과 한 줄 성향을 무료로 확인하세요. 사주 해석을 읽는 순서와 출생시간을 모를 때의 한계도 함께 안내해요. (72) | 자기 자신 | index, follow | 9개 (ko=/saju/, x-default=/saju/) | 5/5 · Organization, WebSite, WebPage, Service, BreadcrumbList, FAQPage | 1개 · 사주 풀이,나의 오행과 삶의 흐름 |
| `/saju/free/` | 무료 사주 모음 \| 오늘의 운세, 운명의 꽃, 최애운명, 타로 (34) | 결제 없이 보는 무료 사주·운세를 한곳에 모았어요. 생년월일만 넣으면 이 페이지에서 네 기둥과 오행을 바로 확인하고, 사주 기본 풀이는 로그인 후 무료로 보세요. (90) | 자기 자신 | index, follow | 없음 | 5/5 · Organization, WebSite, WebPage, Service, BreadcrumbList, FAQPage | 1개 · 무료 사주·운세 모음 |
| `/manse/` | 무료 만세력 보는 법 \| 사주팔자 원국·오행 균형 확인 (30) | 생년월일로 무료 만세력에서 사주팔자 원국과 오행 균형을 확인해 보세요. 출생시간과 절기 경계에 따라 결과가 달라지는 이유도 설명해요. (74) | 자기 자신 | index, follow | 없음 | 5/5 · Organization, WebSite, WebPage, Service, BreadcrumbList, FAQPage | 1개 · 무료 만세력으로 내 명식 확인하기 |
| `/compatibility/` | 궁합 보기 \| 무료 안내·사주·숙요점·타로 비교 (26) | 사주·숙요점·타로 궁합의 차이를 무료 안내로 살펴보세요. 관계의 리듬과 갈등을 읽는 방법, 본명숙 등 무료 기본 결과와 숙요 궁합 등 유료 분석의 범위를 정리합니다. (92) | 자기 자신 | index, follow | 9개 (ko=/compatibility/, x-default=/compatibility/) | 5/5 · Organization, WebSite, WebPage, Service, BreadcrumbList, FAQPage | 1개 · 궁합 보기 — 무료 안내와 체계별 이용 범위 |
| `/saju/compatibility/` | 사주 궁합 — 두 사람의 성향과 관계 풀이 \| 꿀꿀 운세 (31) | 사주 궁합은 두 사람의 명식에서 일간의 관계와 오행의 보완·과잉을 항목별로 읽어요. 볼 때마다 결제하는 분석이며, 결제 전에 구성과 가격을 확인할 수 있어요. (88) | 자기 자신 | index, follow | 9개 (ko=/saju/compatibility/, x-default=/saju/compatibility/) | 5/5 · Organization, WebSite, WebPage, Service, BreadcrumbList, FAQPage | 1개 · 사주 궁합 — 두 사람의 일간과 오행 읽기 |
| `/tarot/` | 타로 카드·속마음·재회 질문 고르기 \| 꿀꿀 운세 (27) | 속마음·재회·연락운과 선택의 고민에 맞는 타로를 골라보세요. 출생정보 없이 카드와 기본 풀이를 확인하고, 내 질문에 맞춘 별도 유료 상담으로 이어갈 수 있어요. (89) | 자기 자신 | index, follow | 9개 (ko=/tarot/, x-default=/tarot/) | 5/5 · Organization, WebSite, WebPage, Service, BreadcrumbList, FAQPage | 1개 · 타로, 속마음과 재회부터지금의 선택까지 |
| `/ziwei/` | 무료 자미두수 명반 계산기·12궁 풀이 \| 꿀꿀 운세 (29) | 생년월일시로 자미두수 명반의 12궁·명궁·신궁과 별 배치를 확인하세요. 꽃돼지 연이와 기본 명반을 읽고, 사주와의 차이와 별도 심층 해설의 범위를 알아보세요. (88) | 자기 자신 | index, follow | 9개 (ko=/ziwei/, x-default=/ziwei/) | 5/5 · Organization, WebSite, WebPage, Service, BreadcrumbList, FAQPage | 1개 · 자미두수 명반,12궁으로 읽는 나의 삶 |
| `/ziwei/chart/` | 자미두수 심화 풀이 \| 가입 없이 무료로 보는 명반 (28) | 가입 없이 생년월일로 자미두수 명반을 세우고 총론·질문별 풀이와 오늘의 조언까지 무료로 읽어 보세요. 유료는 따로 선택하는 PDF 상담서뿐이에요. (81) | 자기 자신 | index, follow | 없음 | 2/2 · Organization, WebSite, FAQPage | 1개 · 자미두수 심화 풀이 — 가입 없이 무료로 보는 명반 |
| `/love/` | 연애운 사주로 읽는 법 \| 로그인 후 무료 기본 풀이 (29) | 연애운을 사주로 읽는 법을 안내해요. 관성·식상과 배우자 자리를 보는 법을 살펴보고, 로그인하면 명식·십성 중심의 사주 기본 풀이를 무료로 볼 수 있어요. (86) | 자기 자신 | index, follow | 없음 | 5/5 · Organization, WebSite, WebPage, Service, BreadcrumbList, FAQPage | 1개 · 연애운 — 사주로 읽는 지금의 관계 흐름 |
| `/fortune/2027/` | 2027년 띠별 운세·삼재띠 \| 정미년 12띠 무료 풀이 \| 꿀꿀 운세 (39) | 2027년 띠별 운세. 정미년(丁未年) 12띠의 지지 관계와 삼재띠(토끼띠·양띠·돼지띠), 년생별 차이, 절기 기준 월별 흐름을 무료로 정리했습니다. (83) | 자기 자신 | index, follow | 없음 | 4/4 · Organization, WebSite, WebPage, BreadcrumbList, FAQPage | 1개 · 2027년 띠별 운세 |
| `/new-year-ai-consultation/` | 2027 신년운세 보는 곳 \| 정미년 월별·재물·연애운 풀이 (33) | 2027년 정미년, 나에게 가장 중요한 일은 뭘까? 정미년 세운이 내 명식과 만나는 자리와 재물·연애·월별 흐름을 짚는 신년운세입니다. (75) | 자기 자신 | index, follow | 없음 | 2/2 · Organization, WebSite, Service, FAQPage, BreadcrumbList | 1개 · 2027 신년운세 보는 곳 — 정미년 흐름과 월별 운세 풀이올해 나에게 가장 중요한 일은 뭘까? |
| `/yeongnyangi/` | 영냥이 상담 \| 꿀꿀 운세의 사주보는 고양이 (24) | 꿀꿀 운세의 사주보는 고양이, 운세보는 영냥이에게 고민을 들려주세요. 사주·타로 상담에서 관계와 일상의 흐름, 지금 시기의 선택을 살피고 행동 조언을 만나보세요. (90) | 자기 자신 | index, follow | 9개 (ko=/yeongnyangi/, x-default=/yeongnyangi/) | 5/5 · Organization, WebSite, WebPage, BreadcrumbList, Service, FAQPage | 1개 · 꿀꿀 운세의 사주보는 고양이영냥이 상담어떤 고민이 있어? |
| `/yeongnyangi/1000-won-fortune/` | 영냥이 사주 상담 가격과 구성 \| 옛 천원 운세 안내 (29) | 영냥이 사주 상담의 가격(10,000원부터)과 챕터 구성을 안내해요. 천원 운세는 끝난 이벤트 이름이며, 그때의 사주 리포트 3종을 지금 보는 방법도 알려 드려요. (91) | 자기 자신 | index, follow | 없음 | 5/5 · Organization, WebSite, WebPage, BreadcrumbList, Service, FAQPage | 1개 · 영냥이 사주 상담, 가격과 구성 |
| `/about/` | 꿀꿀 운세 소개 \| 운영자·해석 기준·서비스 안내 (27) | 꿀꿀 운세는 명리학자 박병하(네오)가 운영하는 사주·타로·자미두수 운세 상담 서비스예요. 운영자, 해석 기준, 무료와 유료의 범위, 콘텐츠 운영 원칙을 소개합니다. (91) | 자기 자신 | index, follow | 7개 (ko=/about/, x-default=/about/) | 2/2 · Organization, WebSite, Person, AboutPage | 1개 · 마음은 가볍게.내 이야기는조금 더 깊게. |
| `/points/` | 이용권 상점 (6) | 꿀단지 이용권 구매와 주문 내역을 확인하는 개인 페이지입니다. (34) | 자기 자신 | noindex, nofollow | 없음 | 1/1 · Organization, WebSite | 1개 · 연이의 달빛 이용권 상점 |
| `/compare/fortune-apps/` | 운세 앱마다 답이 다른 이유 \| 점신·포스텔러·헬로우봇 비교 (33) | 점신, 포스텔러, 헬로우봇처럼 많이 쓰는 운세 앱이 같은 생년월일에 서로 다른 답을 내는 이유를 사주·타로·점성술이 각각 무엇에 답하는 체계인지로 정리합니다. (88) | 자기 자신 | index, follow | 없음 | 4/4 · Organization, WebSite, WebPage, BreadcrumbList, FAQPage | 1개 · 운세 앱마다 답이 다른 이유 |
| `/compare/saju-vs-ziwei/` | 사주와 자미두수는 무엇이 다른가 \| 꿀꿀 운세 (25) | 같은 생년월일로 사주와 자미두수를 보면 왜 다른 이야기가 나오는지, 두 체계가 각각 무엇을 세우고 무엇을 답하는지 비교해 정리합니다. (74) | 자기 자신 | index, follow | 없음 | 4/4 · Organization, WebSite, WebPage, BreadcrumbList, FAQPage | 1개 · 사주와 자미두수는 무엇이 다른가 |
| `/compare/sukuyo-vs-vedic/` | 숙요점 vs 베다 점성술 — 같은 27수를 다르게 읽는 이유 (33) | 숙요점과 베다 점성술은 27수라는 같은 재료를 쓰면서도 다른 것을 묻습니다. 본명숙과 라그나, 관계의 거리와 시간의 주기가 어떻게 갈리는지 비교해 정리합니다. (88) | 자기 자신 | index, follow | 없음 | 4/4 · Organization, WebSite, WebPage, BreadcrumbList, FAQPage | 1개 · 숙요점과 베다 점성술은 같은 27수를 왜 다르게 읽는가 |

## 표에서 확인한 것

- 20개 모두 title·description·canonical·robots meta·H1이 각각 1개다. canonical은 모두 자기 자신이다.
- JSON-LD는 20개 경로의 블록 76개가 모두 `JSON.parse`에 성공했다(스키마 유효성 검사는 하지 않았다). `Review`·`AggregateRating` 유형은 없다.
- `/points/`는 `noindex, nofollow`이고 사이트맵에 없다(결정 "차단만 풀고 noindex 유지"와 같다). 나머지 19개는 `index, follow`이고 사이트맵에 있다.
- hreflang: `/`는 9개(ko·x-default = `/`), `/ggulggul/`은 없음(B3 A안과 같다). `/about/`은 7개로 zh-TW가 없는데, `dist/zh-tw/about/`이 없어서다(번역 페이지가 없는 것과 맞음).
- title 길이는 6~39자, description은 34~92자다. 50자 미만 description은 `/points/`(34자, noindex 개인 페이지) 하나다.

## 눈에 띄는 점 (결함으로 판단하지 않음, 보고용)

| 항목 | 내용 | 이 브랜치 탓인가 |
|---|---|---|
| `/saju/free/`·`/manse/`·`/love/`·`/ziwei/chart/` 등 hreflang 없음 | 번역 대응 페이지가 없는 경로다 | 아님(기존 구조) |
| `/yeongnyangi/`·`/about/` robots에 `max-snippet` 등 미리보기 지시어 없음 | 다른 허브는 `max-snippet:-1` 등을 함께 낸다 | 확인하지 않음(이 브랜치는 이 두 페이지의 robots를 고치지 않았다 — 추정: 기존) |
| `/saju/free/` title에 브랜드 접미사 없음 | "무료 사주 모음 \| 오늘의 운세, 운명의 꽃, 최애운명, 타로" | 아님(이 브랜치는 description만 고침) |
| `/fortune/2027/` title 39자 | 20개 중 가장 길다. 빌드의 title 폭 검사(60)는 통과 | 아님(제목은 그대로 둠) |
| 사이트맵 lastmod | 1081개 중 635개가 2026-11-14 | 이 브랜치(공용 컴포넌트·문구 변경으로 소스 서명이 바뀜, 원장 설계대로) + 같은 날 upstream 변경이 섞여 있다. 비율은 나누어 세지 않았다 |

## robots.txt · sitemap.xml · rss.xml · llms.txt

| 파일 | 확인한 것 | 결과 |
|---|---|---|
| `dist/robots.txt` | `/points/`가 들어간 줄 | 0줄(Disallow 없음). Disallow는 모두 29줄, `Sitemap: https://code-destiny.com/sitemap-index.xml` |
| `dist/sitemap.xml` | URL 수, lastmod | 1081개, lastmod 없는 URL 0개, 오늘(2026-11-14)보다 뒤 날짜 0개. 날짜 분포 상위: 2026-11-14 635개, 2026-11-08 152개, 2026-11-13 78개, 2026-10-15 69개, 2026-07-11 26개, 2026-09-26 25개 |
| `dist/sitemap.xml` | 핵심 경로 lastmod 샘플 | 사이트맵에 있는 19개 모두 2026-11-14. 사이트맵에 없는 것: /points/ |
| `dist/rss.xml` | item 수, pubDate | 60건, 날짜 파싱 실패 0건, 미래 날짜 0건, 최신순 정렬 맞음. 가장 최근 Sat, 31 Oct 2026 00:00:00 GMT(/insights/fortune-service-selection-guide/), 가장 오래된 Sun, 05 Apr 2026 00:00:00 GMT |
| `dist/llms.txt` | 정의 문장 | 있음 — "꿀꿀 운세는 명리학자 박병하(네오)가 운영하는 사주·타로·자미두수 운세 상담 서비스예요."(첫 인용 문단의 첫 문장, about 첫 문장과 같음) |
| `dist/llms-full.txt` | 같은 문장 | 있음 |

RSS pubDate가 2026-10-31에서 멈춰 있는 것은 "pubDate = 최초 발행일" 결정대로다(수정일은 사이트맵 lastmod가 맡는다).

## 결론

이 점검에서 고쳐야 할 이 브랜치의 결함은 찾지 못했다. 코드 수정 없음.
