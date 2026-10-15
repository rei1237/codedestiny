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
