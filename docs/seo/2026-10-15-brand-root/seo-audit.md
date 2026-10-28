# 꿀꿀 운세 검색·AI 답변 진단 (2026-10-15)

## 요약

- 운영 `/` 는 301 로 `/ggulggul/` 에 넘어간다. Google 은 사이트 이름을 도메인 루트의 WebSite 구조화 데이터에서만 읽고 서브디렉터리는 지원하지 않는다. 그래서 대표 브랜드 신호가 루트에 실리지 않는다.
- 공개 페이지의 title·og:site_name·JSON-LD 에 공식명과 다른 표기("꿀꿀운세")와 과거명(꿀꿀 사주·꿀꿀사주)이 함께 있다. Organization 이름도 서비스명이라 서비스와 운영자가 구분되지 않는다.
- 크롤러 접근(A)은 문제가 아니다. 검색·AI 봇 UA 9종 모두 200 을 받았다.
- 콘솔 수치(GSC·네이버·Bing)는 직접 보지 못했다. 메일로 받은 알림만 간접 증거로 적는다.

## 측정 방법

- 측정일: 2026-10-15. 로그인 없이 `curl` 로 운영 HTML 을 받았다. 헤더는 `Accept: text/html`, UA 는 Googlebot.
- 과거명 건수는 HTML 전체에서 "꿀꿀 사주", "꿀꿀사주", "사주 달빛" 의 출현 수다(본문 이력 문장 포함).
- 실제 봇 IP 에서 요청한 검증은 하지 않았다. UA 만 바꿔 요청했다.

## 분류 기준

| 분류 | 뜻 |
|---|---|
| A | 페이지 자체를 수집하지 못하는 상태 |
| B | 수집했지만 색인하지 않은 상태 |
| C | 일부 페이지는 색인됐지만 브랜드 검색 대표 노출이 약한 상태 |
| D | 현재 HTML 자체에 과거 명칭이 남은 상태 |
| E | 현재 페이지는 수정됐지만 검색 정보가 갱신되지 않은 상태 |
| F | 외부 게시물·프로필이 과거 명칭을 계속 안내하는 상태 |

## 경로별 진단

| 경로 | 분류 | 증거(운영 실측) | 확인 여부 | 조치 | 우선 |
|---|---|---|---|---|---|
| `/` | C | 301 → `/ggulggul/`. GSC 2026-05 메일에서 `/` 가 클릭 1위 | 실측 확인 · 메일 간접 | 루트 200 대표 홈(canonical `/`, WebSite·Organization) | P0 |
| `/ggulggul/` | C·D | 200, 723KB. title "꿀꿀운세 — 사주·궁합·타로", og:site_name "꿀꿀운세". 과거명 18건(JSON-LD alternateName 포함). hreflang 13개, x-default 있음 | 실측 확인 | 사이트명 신호 "꿀꿀 운세", alternateName 정리 | P0 |
| `/kkul-kkul-unse/` | D · E(가설) | 200. title "꿀꿀운세 공식 사이트·카카오 채널 이용 안내". 과거명 21건(FAQ "꿀꿀 사주와 꿀꿀운세는 같은 서비스인가요" 등) | D 실측 확인. 네이버 옛 제목 노출(E)은 콘솔 미접근이라 가설 | 공식 주소·표기·이력 안내로 개편, FAQ 10 | P0 |
| `/about/` | D | 200. Organization 노드 3개(layout 공통 + 페이지 중복). 과거명 6건 | 실측 확인 | Organization 1개로 정리, 운영자 소개 | P0 |
| `/faq/` | C | 200, 19KB. 이용 안내 문항이 적다 | 실측 확인 | 이용·결제·재열람·출생시간·계정 문항 보강 | P0 |
| `/saju/` | D | 200. title 접미사 "꿀꿀운세". Organization 2개. 과거명 8건(공통 JSON-LD) | 실측 확인 | 공통 원본 수정 | P0 |
| `/insights/` | D | 200. title 접미사 "꿀꿀운세". 과거명 8건(공통 JSON-LD) | 실측 확인 | 공통 원본 수정 | P0 |
| `/robots.txt` | 정상 | 검색·AI 검색·사용자 요청형·학습 봇 그룹 명시. CCBot 만 `Disallow: /` | 실측 확인 | 변경 없음(학습 거부 정책 유지) | — |
| `/sitemap.xml` | B(가설) | `<loc>` 959개, 루트 `/` 없음. GSC 2026-09-06 메일에 "NOINDEX", "사용자가 선택한 표준이 없는 중복" 사유 신규 | 사이트맵 실측 확인 · 사유는 메일 간접 | `/` 추가, 색인 가능성 교차검사 | P0/P1 |
| 외부 채널 | F | Threads 프로필 이름 "꿀꿀 사주 공식". repo 의 Play 스토어 문안 "꿀꿀 사주(구 꿀꿀 운세)" | Threads 공개 페이지 확인 · 스토어는 repo 확인 | `external-brand-corrections.md` 정정 문안 | P1 |

A(수집 불가)에 해당하는 경로는 없었다.

### 콘솔 경고(메일 간접 증거, 콘솔 직접 확인 아님)

- GSC 2026-05: `https://code-destiny.com/` 가 클릭 1위.
- 이후 "리디렉션이 포함된 페이지" 275건 검증 실패.
- 2026-09-06: 사이트맵 안에서 "NOINDEX" 와 "사용자가 선택한 표준이 없는 중복" 사유 신규 발생.
- Bing 9월 보고: 노출 +97%, 클릭 −63%.

### 빌드 산출물 교차검사 (로컬 `npm run build:cf` 산출물 dist/)

- 사이트맵 loc 1,026개: dist 파일 없음 0, canonical ≠ loc 0, noindex 메타 0.
- 내부 `<a href>` 가 `_redirects`(301 94줄) 또는 워커 `CONSOLIDATED_PAGE_REDIRECTS` 원천을 가리키는 경우 0.
- **공통 헤더(브랜드·"홈")와 푸터 브랜드 링크가 `/index.html` 이었다.** 1,065개 페이지 × 3개.
  - 운영 실측(개편 전): `/index.html` → 302 → `/ggulggul/`.
  - 개편 후(P0-4): `/index.html` → 301 → `/`.
  - 두 경우 모두 모든 공개 페이지가 리다이렉트 URL 로 링크한다. GSC "리디렉션이 포함된 페이지" 사유의 원인 후보 중 하나다(가설, 콘솔 미확인).
  - 조치: 링크를 `/` 로 바꿨다. 다른 로케일은 기존대로 로케일 홈으로 간다.
  - 재발 방지: postbuild `scripts/verify-sitemap-canonical.mjs` 가 위 세 가지를 빌드마다 검사한다.
- 남겨 둔 것: 콘텐츠 페이지의 `/index.html?action=open…Modal` 기능 링크 약 20개. 워커가 302 로 `/ggulggul/?action=…` 에 넘긴다. 기능 진입이라 이번 범위에서 바꾸지 않았다.

## 운영 승격 전후 실측

- 승격: 2026-10-16 02:33Z, 워크플로 run 38839146392(mode=production), 커밋 f801a1c8d.
  - Pages·Worker 모두 f801a1c8d04b 를 서빙한다(`verify-deployed-sha` PASS).
  - 배포 후 헬스체크 통과, deploy-smoke PASS. 결제 다이얼로그 검사는 게스트 진입 버튼이 보이지 않아 건너뛰었다.
  - 같은 배포에 main 의 다른 작업(포춘 찻집·상품 상세 개편, 홈 MV 위치)도 함께 나갔다. 관찰 때 함께 고려한다.
  - 워크플로가 기록한 롤백 대상: Pages deployment `b7e36345-bd93-44c6-8841-da05e709b07f`, Worker version `ef31c278-20a5-4c66-bc21-0fa7a753c2f1`.
- 측정: 승격 전 2026-10-15 12:38Z, 승격 후 2026-10-16 02:33Z. 같은 스크립트로 같은 요청을 보냈다(로그인 없음, UA·로케일 쿠키별).

| 요청 | 승격 전 | 승격 후 |
|---|---|---|
| `/` (한국어 사람 · Googlebot · 쿠키 없음) | 302(봇은 301) → `/ggulggul/` | 200. title "꿀꿀 운세 공식 사이트 \| 사주·타로·자미두수", canonical `https://code-destiny.com/` 1개, WebSite·Organization·WebPage 각 1개, hreflang 0 |
| `/` + 영어 명시 쿠키 | 302 → `/en/` | 같음 |
| `/?utm_source=x` | 302 → `/ggulggul/?utm_source=x` | 200 |
| `/?paymentId=x&portone_redirect=1` · `/?code=x&state=y` · `/?ref=abc` | 302 → `/ggulggul/?<원래 쿼리>` | 같음 |
| `/?question=x` | 302 → `/yeongnyangi/?question=x` | 같음 |
| `/index.html` | 302 → `/ggulggul/` | 301 → `/` |
| `http://code-destiny.com/` · `https://www.code-destiny.com/` | 301 → `https://code-destiny.com/` | 같음(1홉 뒤 200) |
| `/robots.txt` | sha256 앞 16자리 `07be6d947cb14a75`, CCBot `Disallow: /` | 같음(diff 0) |
| `/sitemap.xml` 의 `<loc>https://code-destiny.com/</loc>` | 0개 | 1개 |

대표 페이지 6개(`/ggulggul/` `/kkul-kkul-unse/` `/about/` `/faq/` `/saju/` `/insights/`)의 이름 신호:

| 항목 | 승격 전 | 승격 후 |
|---|---|---|
| title 의 서비스명 | 꿀꿀운세 | 꿀꿀 운세 |
| og:site_name | 꿀꿀운세(`/about/` `/faq/` 는 없음) | 꿀꿀 운세(6개 모두) |
| WebSite.name | 꿀꿀운세 | 꿀꿀 운세 |
| WebSite.alternateName | 꿀꿀 운세, 꿀꿀 사주, 꿀꿀사주, Ggulggul Fortune, CODE DESTINY, CodeDestiny, 코드데스티니, 코드 데스티니 | 꿀꿀운세 |
| Organization.name | 꿀꿀운세 | CODE DESTINY |
| `/about/` Organization 노드 | 2개 | 1개 |
| meta·JSON-LD 의 과거명 | 6개 페이지 모두 꿀꿀 사주·꿀꿀사주 | 5개 페이지 0건. `/kkul-kkul-unse/` 는 FAQ "사주 달빛 정원이나 꿀꿀 사주가 이름을 바꾼 서비스인가요?" 문답에만 있다(이력 안내, 의도한 것) |
| self canonical · 상태 | 200, self canonical | 같음 |

- IndexNow: 워크플로 "Notify IndexNow of changed URLs" 단계가 사이트맵 1,026개 중 변경 893건을 1회 배치로 보냈고 `200 OK` 를 받았다(재시도 없음). 수동 추가 제출은 하지 않았다.
- 판정: 코드·배포 계층의 기대값은 모두 맞았다. 검색 결과의 사이트 이름·대표 URL·과거명 노출과 AI 답변이 바뀌었는지는 아직 모른다. `seo-release-checklist.md` 7절 콘솔 작업과 8절 D+7/14/30 관찰 뒤에 판정한다.

## 루트 재디자인과 영냥이 신호 (2026-10-16)

- 왜: 10-16 승격 뒤 `/` 는 200 이 됐지만 화면이 깨져 보였다. 원래 크롤러용 대체 화면(20줄 `home-guide.module.css`)이 시각 재설계 없이 노출됐기 때문이다. 직전 검증은 태그·HTTP 만 봤고 화면을 보지 않았다.
- 사용자 결정(2026-10-16): `/` 는 사이트 메인(리다이렉트로 되돌리지 않음), 레이아웃은 낮·밤 두 문, 영냥이 상담의 대표 공개 이름은 "운세보는 영냥이"("사주보는 고양이"는 설명구).
- 화면: `app/page.js` + 새 `app/home-main.module.css`. 히어로 그림은 새로 그린 "해 질 녘 두 문"(출처·대조 판정 `docs/design/root-home-art.json`). 문 카드 캐릭터·배경은 기존 에셋을 그대로 쓴다.

| 신호 | 전 | 후 |
|---|---|---|
| `/` title | 꿀꿀 운세 공식 사이트 \| 사주·타로·자미두수 | 꿀꿀 운세 공식 사이트 \| 운세보는 영냥이·사주·타로 (폭 49/60) |
| `/` description 폭 | — | 140/160, 두 이름 모두 포함 |
| `/` H1 | 꿀꿀 운세 공식 홈페이지 | 같은 글자, 스타일만 입힘 |
| `/` JSON-LD | WebSite·Organization·WebPage | 같은 3개 + Service 2개(꿀꿀 운세 → `/ggulggul/`, 운세보는 영냥이 → `/yeongnyangi/`) |
| `/yeongnyangi/` title | 영냥이 사주 상담 — 내 고민과 시기를 함께 보는 운세 | 운세보는 영냥이 \| 꿀꿀 운세의 사주보는 고양이 상담 (폭 50/60) |
| `/yeongnyangi/` description 폭 | — | 156/160 |
| `/yeongnyangi/` H1 둘째 줄 | 영냥이에게 물어봐. | 운세보는 영냥이에게 물어봐. |
| `/yeongnyangi/` 리드 | 꿀꿀운세의 기본 상담, 영냥이. | 꿀꿀 운세의 기본 상담, 운세보는 영냥이. |
| `/yeongnyangi/` Service.name | 사주 보는 고양이 영냥이 운세 상담 | 운세보는 영냥이 + alternateName(사주보는 고양이 영냥이, 운세 보는 영냥이) |
| `/yeongnyangi/` Breadcrumb 첫 칸 | `/ggulggul/` | `/` (꿀꿀 운세) |
| `/yeongnyangi/` FAQ | — | "운세보는 영냥이와 꿀꿀 운세는 어떤 관계인가요?" 1문항 추가(FAQPage 자동 반영) |
| 엔티티·llms.txt | 영냥이 = 사주보는 고양이 | `/yeongnyangi` 프로필(primary "운세보는 영냥이"), llms.txt 캐릭터 줄에 이름과 URL |

- 바뀌지 않은 것: WebSite.alternateName `["꿀꿀운세"]`, `/` hreflang 0, 과거명은 `[data-brand-history]` 안에만, robots 학습 거부, 워커 루트 분기, 로그인·결제·보관함 로직.
- 계획과 다르게 한 것
  - 히어로 모바일 크롭은 1:1 이 아니라 4:3(원본 좌 330·상 176, 1024×768)이다. 두 캐릭터·찻상·고양이 꼬리를 다 담으면서 첫 화면 높이를 줄여 두 문 CTA 가 390×844 첫 화면에 들어오게 했다.
  - 무료 도구는 아이콘 타일 3/6열이 아니라 아이콘·제목·설명이 있는 카드 1/2/3열이다(기존 설명 문구를 살리기 위해).
  - CTA 문구를 줄였다: "연이의 정원 열기" / "영냥이에게 묻기". 낮 문 H2 는 "꿀꿀 운세", 부제 "꽃돼지 연이의 정원".
  - 640px 이하에서는 문 카드 배경 그림과 히어로 보조 문장을 숨기고(위 히어로 그림이 같은 역할), 문 설명을 CTA 아래에 둔다. 두 문 CTA 높이를 맞추려고 subgrid 를 쓴다.
  - 밤 문 보조 링크는 3개다: 생선별 상담 가격(`/yeongnyangi/#yn-prices`), 결제 전 상담 예시(`/yeongnyangi/#yn-example`), 구매한 상담 다시 열기.
  - 히어로는 981px 이 아니라 768px 부터 2열이다.
- 배포 전 시각 검증(로컬 `npm run build` 산출물 dist/, 스크린샷은 레포 밖 작업 폴더에 보관)
  - 화면: 390×844(@2x)·768×1024·1366×900, 연이 라이트·네오 테마, 첫 화면과 전체 페이지. `/yeongnyangi/` 첫 화면 3장.
  - 실측: 모든 페이지 200, 가로 넘침 0, h1 1개. 두 문 CTA 는 높이 48px, 아래 끝이 같다(390: 701, 768: 804, 1366: 821) — 세 크기 모두 첫 화면 안.
  - 고친 결함: 라이트 테마 낮 문 CTA 글자가 배경과 같은 색(1.09:1)이었다. 모듈의 `.page :where(a){color:inherit}` 가 같은 특이도의 전역 버튼 글자색을 덮었기 때문이다. `.door .doorCta` 에서 버튼 글자색 토큰을 다시 지정해 15.06:1(라이트)·15.14:1(네오)이 됐다.
  - 고친 줄바꿈: `/yeongnyangi/` 390px 리드의 "하나 / 부터" 음절 끊김(`word-break: keep-all`), 밤 문 부제의 "고양이" 한 단어 줄, 모바일 문 링크의 마지막 한 단어 줄(`text-wrap: balance`), 낮 문 설명의 "사주· / 타로" 끊김, 사실 표 URL 의 하이픈 끊김(슬래시에서 끊기게 `<wbr>`). 1366 에서 밤 문 링크 구분선이 고양이 그림을 가로지르던 것(링크 폭 52%).
  - 2차 시각 검토(통과) 뒤 다듬기: 문장 안 "결제·결과 문의"와 서비스 정보 아래 링크에 밑줄을 넣었다(본문과 같은 색이라 링크로 안 보였다). 768 캐릭터 카드는 위로 맞췄다(`align-content: start`, 설명 줄 수 차이로 17px 어긋남). 캐릭터 설명의 외톨이 단어 줄을 없앴다(`text-wrap: balance`). 사실 표의 괄호 안은 줄이 끊기지 않게 했다. 비교 카드의 단독 링크는 탭 높이를 44px로 넓혔다.
  - 남은 것(후속): 섹션 도입문의 "비교할 / 수 있습니다." 끊김(`text-wrap: pretty`로는 안 고쳐진다). 네오 테마 낮 문 배경이 밤처럼 보인다. 언론 카드(기존 공용 컴포넌트)의 폭과 여백. 이전 이름 인용문의 줄바꿈(brand-facts 문자열을 쪼개야 한다). `/yeongnyangi/` 히어로의 리드와 CTA 사이 6–8px(이번 변경 전부터 같다).
  - 캡처 주의: 헤드리스 전체 페이지 캡처에서 히어로와 언론 카드 이미지가 빈 칸으로 찍히곤 한다. 페이지를 바꾸지 않고 연달아 찍은 3장이 빈 칸·그림·빈 칸으로 갈렸고(영역 편차 0.5 / 71.4 / 0.5), 끝까지 스크롤했다가 맨 위로 돌아온 화면은 정상으로 그려졌다(87.3). 라이트 768·1366에서는 6번 다시 찍어도 히어로가 빈 칸이었다. 같은 페이지를 `decoding` 값만 바꿔 연달아 4장씩 찍으면 async는 0.2 / 69.8 / 69.8 / 69.8이었고, auto와 sync는 4장 모두 69.8이었다. 화면에 보이는 첫 화면 캡처는 항상 정상이었으므로 사용자 화면 결함이 아니라 비동기 디코딩과 전체 페이지 캡처가 겹친 현상으로 판단했다. 그래도 LCP 히어로 이미지에는 비동기 디코딩이 이득이 없어 히어로에서만 `decoding="async"`를 뺐다. 촬영 스크립트는 화면 안 이미지 영역의 편차를 원시 픽셀로 재서 빈 칸이 있으면 다시 찍는다. 처음 쓴 측정(`sharp().extract().stats()`)은 잘라낸 영역이 아니라 이미지 전체 값을 돌려줘 이 현상을 놓쳤다.
  - 폰트: 글꼴 CDN 이 localhost 출처를 CORS 로 거부한다. 로컬 촬영은 글꼴 응답에 허용 헤더를 붙여 운영과 같은 서체로 찍었다(운영 설정 변경 아님).
  - 사이트맵: `lib/structured-data.ts`·`lib/brand/brand-facts.mjs` 같은 공용 모듈을 고쳐, 생성기 규칙(페이지 소스 묶음 해시)대로 그 모듈을 쓰는 페이지들의 lastmod 가 함께 갱신됐다.
  - 기존 실패(이번 변경과 무관): `verify:seo-entity-registry --built` 의 fusion-fortune 항목.
- 캡처 검토 피드백 반영(2026-10-16, 운영 반영 전)
  - 히어로 그림: 영냥이가 든 잔 말고도 앞발 아래 탁자에 잔이 하나 더 있어 "찻잔 2개"로 보였다(생성 프롬프트의 "two cups" 탓). 승인 원본을 다시 그리지 않고 부분 편집해 그 잔만 지웠다(`docs/design/root-home-art.json` 후보 3). 이제 두 캐릭터가 잔을 하나씩 든다.
  - 천원 표기 정정: 영냥이 상담에는 1,000원 상품이 없다(고등어 5,000원부터, 정본 `worker/lib/paid-feature-registry.js`). 1,000원은 무료 사주 결과에서 여는 재미 사주 콘텐츠 3종뿐이다. 메인 밤 문·비교 카드, `/kkul-kkul-unse/`, `/yeongnyangi/` 안의 "천원 운세" 링크를 영냥이 가격표(`#yn-prices`)·예시(`#yn-example`)로 바꾸고, 시작 가격은 결제 카탈로그에서 읽는다. `/yeongnyangi/1000-won-fortune/` 은 주소·색인을 그대로 두고 제목·Service·빵부스러기·키워드·엔티티 프로필에서 영냥이와 천원을 묶던 표현을 뺐다. FAQ 의 "다섯 가지"는 3종으로 고쳤다.
  - 확인 필요(고치지 않음): `/yeongnyangi/1000-won-fortune/` FAQ 의 "월정석은 적용되지 않으며"가 정본의 `membershipCreditAllowed: true` 와 어긋난다. 결제 정책이라 운영자 확인 뒤 고친다.
- 타로 카드 선택 UI·첫 화면 고급화(2026-10-16, 운영 반영 전)
  - 두 문 카드를 "타로 카드 한 장 뽑기"로 바꿨다. 낮·밤 구도 대신 I 꿀꿀 운세 = 연이의 종합 운세 백화점(무료부터 재미 사주·프리미엄 리포트·꿀단지 이용권까지), II 운세보는 영냥이 = 질문 특화 상담(고등어 등급부터)이다. 카드 그림 2장은 새로 그렸다(출처·판정 `docs/design/root-home-art.json` `cards`).
  - 검색 신호는 그대로다: 카드 이름은 계속 h2(`#dayDoorTitle`, `#nightDoorTitle`)이고, 두 안내 패널과 링크는 모두 HTML 에 있다. 고르지 않은 패널은 `display:none` 이지만 DOM 에 남는다. `/ggulggul/` 링크 순서·h1 1개·JSON-LD 는 바뀌지 않았다.
  - 980px 이하는 제목 → 카드 고르기 → 히어로 그림 순서다. 390×844 첫 화면에 두 카드와 고른 서비스의 시작 버튼이 함께 든다.

## 크롤러 4분류

| 분류 | 예 | robots.txt 현재 정책 | 운영 응답(UA 기준, 2026-10-15) |
|---|---|---|---|
| 검색 | Googlebot, Bingbot, Yeti | 허용(비공개 경로 제외) | 200 |
| AI 검색 | OAI-SearchBot, Claude-SearchBot, PerplexityBot | 허용(비공개 경로 제외) | 200 |
| 사용자 요청형 | ChatGPT-User, Claude-User, Perplexity-User | 허용(비공개 경로 제외) | 200 (ChatGPT-User 측정) |
| 학습 | GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot | CCBot 만 `Disallow: /`. 나머지는 기존 허용 유지 | GPTBot 200 · CCBot 200(robots 로 거부, 서버 차단 아님) |

- 기존 학습 거부(CCBot)는 바꾸지 않았다.
- 봇 판정은 UA 문자열만 믿지 않는다. 워커는 UA 로 로케일 리다이렉트만 건너뛰고, 인증·권한 검사는 UA 와 무관하게 그대로 적용된다.
- 실제 봇 IP 검증(역방향 DNS·공개 IP 목록)과 Cloudflare AI Crawl Control·WAF·Bot 설정은 대시보드 접근이 없어 확인하지 못했다.

## 개인정보 경로 보호

| 경로 | 보호 방식 |
|---|---|
| `/records/*`, `/consultations/*`, `/yeongnyangi/library/*` | 로그인 필요, `noindex, nofollow` |
| `/payment(s)/*`, `/checkout/*`, `/success/*`, `/fail/*` | robots Disallow, noindex |
| `/profile/*`, `/me/*`, `/my/*`, `/account/*`, `/auth/*` | robots Disallow, noindex |
| `/admin/*`, `/api/*` | 인증, robots Disallow, `noindex, nofollow` |

- 위 경로는 사이트맵과 공개 JSON-LD 에 들어가지 않는다(`noindexPathPrefixes`, 사이트맵 생성기 제외 규칙).
- 이번 변경은 이 보호를 넓히거나 줄이지 않았다.

## 분석 도구(GA4) 점검

- `page_location`: 경로와 `utm_*` 만 보낸다. 토큰·결과 ID·결제 키 같은 나머지 쿼리는 뗀다(`js/core/analytics.js` `pageLocation()`).
- 이벤트: 프로필·질문 본문·결과 텍스트·요청 ID 를 보내지 않는다(`verify:analytics-events` 가 검사).
- `question` 쿼리: 자유 입력이 아니라 사전 정의된 질문 가이드 ID 다(`getQuestionGuide`).
- `page_title`: 공개 페이지 제목만 들어간다. 생년월일·질문이 제목에 들어가는 화면은 찾지 못했다.
- **남은 위험(후속)**: `page_referrer` 는 따로 정리하지 않는다. 같은 사이트 안에서 이동하면 브라우저가 이전 URL 의 쿼리까지 referrer 로 넘긴다(`strict-origin-when-cross-origin`). 쿼리에 결제 키·인증 코드가 남은 화면에서 전체 페이지 이동이 일어나면 GA4 로 넘어갈 수 있다. `gtag("config")` 에 정리된 `page_referrer` 를 넘기는 수정을 제안한다(이번 릴리스 범위 밖).

## 기존 정책의 공백(이번에 고치지 않음, 보고만)

- 워커 봇 판정 정규식(`public/_worker.js` `visitorLocaleContext`)은 `bot|crawler|spider|…` 만 본다. Yeti, ChatGPT-User, Claude-User, Perplexity-User, Mediapartners-Google, Google-InspectionTool 은 사람으로 판정된다. 이 UA 가 해외 IP 에서 입구 경로(`/`, `/ggulggul/`)로 오면 `/en/` 등으로 302 된다. 사이트맵의 개별 URL 은 영향이 없다.
- 콘텐츠 사실 충돌 후보: 자미두수 설명(compare/saju-vs-ziwei vs advanced-ziwei-copy), naming-ai 의 "전문가가 직접" 표현, 네오 1:1 상담의 현재 접수 여부.
- 본문 "꿀꿀운세" 표기는 공식 별칭이라 이번에는 대표 5개 페이지만 고쳤다. 나머지는 콘텐츠를 고칠 때 바꾼다.

## 확인하지 못한 것

- Google Search Console, 네이버 서치어드바이저, Bing Webmaster 의 실제 수치와 URL 검사 결과
- Cloudflare 대시보드: Redirect·Page·Cache Rules, AI Crawl Control, WAF, Bot 설정, www·http 규칙
- 외부 SNS·스토어 관리 화면, 네이버 블로그·X·Play 스토어 공개 페이지(가져오기 실패)
- 외부 AI 답변 본문(별도 관찰 실험, `aeo-evaluation.csv`)
