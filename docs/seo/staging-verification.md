# 스테이징 검증 (2026-11-14)

대상은 `https://staging.code-destiny.com`이다. 이 문서의 값은 따로 적지 않으면 모두 직접 요청해서 본 것이다. 추론은 "추론"이라고 적었다.

## 1. 무엇을 올렸고 무엇이 서빙되는가

| 항목 | 값 |
|---|---|
| 승인 | 사용자 원문 "스테이징 푸시해" (2026-11-14, 조정 세션이 전달). 운영 승격은 미승인 |
| push | 2026-11-14 21:10 KST `git push origin HEAD:main` → `9a6ac23eb..cea92ad58` (72커밋, fast-forward) |
| 응답 프로브 때 스테이징이 서빙한 버전 | `cea92ad58` (`/api/version`·`/version.json`, 프로브 2026-11-14T12:34Z) |
| 화면·Lighthouse 때 서빙한 버전 | `438f6c16d` (그 사이 toss 작업 35커밋이 main에 들어왔다. 이 브랜치의 변경은 그대로 들어 있다) |

### CI (`cea92ad58`)

| 워크플로 | 결과 |
|---|---|
| PR CI (43593465811) | 성공 |
| Release Cloudflare Pages and Worker — push (43593465915), staging dispatch (43593526078) | 성공 |
| Paid Flow Gates, Yeongnyangi Browser Shadow, Landing Watchdog, Main drift watchdog, Gift transaction integrity, AI Locale Gate, Business Identity Gate | 성공 |
| Secret Scan (43593465827) | **실패** — 이 브랜치 범위 밖 |

Secret Scan은 gitleaks `generic-api-key` 규칙이 `worker/lib/saju-section/runtime.generated.mjs` 9행(커밋 `9bbc65bbf`, toss 작업)을 잡아서 실패한다. push 전 `9a6ac23eb`에서도 실패였고 마지막 성공은 `05211086c`다. 이후 `438f6c16d`에서도 실패 상태다. 번역 키를 비밀 값으로 잘못 잡은 것으로 보이나 이는 추론이다.

## 2. 스테이징에서 볼 수 없는 것

- 스테이징은 모든 응답에 `X-Robots-Tag: noindex, nofollow`, robots meta `noindex,nofollow`, `robots.txt`의 `Disallow: /`를 덮어쓴다. 운영용 robots meta와 robots.txt는 스테이징으로 확인할 수 없다. 빌드 산출물 기준 값은 `docs/seo/prepush-verification.md`에 있다.
- canonical과 hreflang은 스테이징에서도 `https://code-destiny.com/...`를 가리킨다. 의도된 동작이다.
- `js/core/analytics.js`는 운영 origin이 아니면 시작하자마자 빠져나간다(운영 GA 속성 보호). 그래서 유입 분류 쿠키는 스테이징 페이지에서 만들어지지 않는다. 5절은 스테이징이 배포한 스크립트 파일을 운영 origin으로 꾸민 격리 브라우저에서 돌린 결과다.
- 결과 화면은 로그인 뒤에만 열린다. 로그인하지 않았으므로 실제 결과 화면은 보지 못했다.

## 3. 핵심 20개 URL — Yeti UA와 모바일 UA

Yeti UA는 `Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)`다. 20개 모두 title·description·H1이 1개씩이고 canonical은 자기 자신의 운영 URL이다. robots meta와 응답 헤더는 20개 모두 스테이징 덮어쓰기 값(`noindex,nofollow` / `noindex, nofollow`)이라 표에서 뺐다. "본문 동일"은 Cloudflare가 UA에 따라 끝에 넣는 스크립트(봇 확인 / 방문 통계)를 뺀 뒤 비교한 결과다. 그대로 비교하면 20개 모두 다르다.

| 경로 | 상태 Yeti/모바일 | title (길이) | description 길이 | canonical | hreflang 수 | JSON-LD 파싱 | head 동일 | 본문 동일 |
|---|---|---|---|---|---|---|---|---|
| `/` | 200/200 | 꿀꿀 운세 \| 사주·타로·자미두수 운세 상담 (24) | 80 | 자기 자신 | 9 | 2/2 | 예 | 예 |
| `/ggulggul/` | 200/200 | 꽃돼지 연이 운세 \| 사주·타로 시작하기 – 꿀꿀 운세 (30) | 77 | 자기 자신 | 0 | 1/1 | 예 | 예 |
| `/saju/` | 200/200 | 사주 원국 확인·사주팔자 해석 안내 \| 꿀꿀 운세 (27) | 72 | 자기 자신 | 9 | 5/5 | 예 | 예 |
| `/saju/free/` | 200/200 | 무료 사주 모음 \| 오늘의 운세, 운명의 꽃, 최애운명, 타로 (34) | 90 | 자기 자신 | 0 | 5/5 | 예 | 예 |
| `/manse/` | 200/200 | 무료 만세력 보는 법 \| 사주팔자 원국·오행 균형 확인 (30) | 74 | 자기 자신 | 0 | 5/5 | 예 | 예 |
| `/compatibility/` | 200/200 | 궁합 보기 \| 무료 안내·사주·숙요점·타로 비교 (26) | 92 | 자기 자신 | 9 | 5/5 | 예 | 예 |
| `/saju/compatibility/` | 200/200 | 사주 궁합 — 두 사람의 성향과 관계 풀이 \| 꿀꿀 운세 (31) | 88 | 자기 자신 | 9 | 5/5 | 예 | 예 |
| `/tarot/` | 200/200 | 타로 카드·속마음·재회 질문 고르기 \| 꿀꿀 운세 (27) | 89 | 자기 자신 | 9 | 5/5 | 예 | 예 |
| `/ziwei/` | 200/200 | 무료 자미두수 명반 계산기·12궁 풀이 \| 꿀꿀 운세 (29) | 88 | 자기 자신 | 9 | 5/5 | 예 | 예 |
| `/ziwei/chart/` | 200/200 | 자미두수 심화 풀이 \| 가입 없이 무료로 보는 명반 (28) | 81 | 자기 자신 | 0 | 2/2 | 예 | 예 |
| `/love/` | 200/200 | 연애운 사주로 읽는 법 \| 로그인 후 무료 기본 풀이 (29) | 86 | 자기 자신 | 0 | 5/5 | 예 | 예 |
| `/fortune/2027/` | 200/200 | 2027년 띠별 운세·삼재띠 \| 정미년 12띠 무료 풀이 \| 꿀꿀 운세 (39) | 83 | 자기 자신 | 0 | 4/4 | 예 | 예 |
| `/new-year-ai-consultation/` | 200/200 | 2027 신년운세 보는 곳 \| 정미년 월별·재물·연애운 풀이 (33) | 75 | 자기 자신 | 0 | 2/2 | 예 | 예 |
| `/yeongnyangi/` | 200/200 | 영냥이 상담 \| 꿀꿀 운세의 사주보는 고양이 (24) | 90 | 자기 자신 | 9 | 5/5 | 예 | 예 |
| `/yeongnyangi/1000-won-fortune/` | 200/200 | 영냥이 사주 상담 가격과 구성 \| 옛 천원 운세 안내 (29) | 91 | 자기 자신 | 0 | 5/5 | 예 | 예 |
| `/about/` | 200/200 | 꿀꿀 운세 소개 \| 운영자·해석 기준·서비스 안내 (27) | 91 | 자기 자신 | 7 | 2/2 | 예 | 예 |
| `/points/` | 200/200 | 이용권 상점 (6) | 34 | 자기 자신 | 0 | 1/1 | 예 | 예 |
| `/compare/fortune-apps/` | 200/200 | 운세 앱마다 답이 다른 이유 \| 점신·포스텔러·헬로우봇 비교 (33) | 88 | 자기 자신 | 0 | 4/4 | 예 | 예 |
| `/compare/saju-vs-ziwei/` | 200/200 | 사주와 자미두수는 무엇이 다른가 \| 꿀꿀 운세 (25) | 74 | 자기 자신 | 0 | 4/4 | 예 | 예 |
| `/compare/sukuyo-vs-vedic/` | 200/200 | 숙요점 vs 베다 점성술 — 같은 27수를 다르게 읽는 이유 (33) | 88 | 자기 자신 | 0 | 4/4 | 예 | 예 |

문제가 있는 URL은 없다. title·description 길이, hreflang 수, JSON-LD 수는 `docs/seo/prepush-verification.md`의 빌드 산출물 표와 같다. `/`의 hreflang은 ko와 x-default가 모두 `https://code-destiny.com/`이고 `/ggulggul/`은 0개다(홈 이원화 A안).

### `?action=`과 기타 응답

| 요청 | 상태 | Location | X-Robots-Tag |
|---|---|---|---|
| `/?action=cdOneStepFreeSajuEntry` | 302 | `/ggulggul/?action=cdOneStepFreeSajuEntry` | noindex, follow |
| `/ggulggul/?action=cdOneStepFreeSajuEntry` | 200 | - | noindex, nofollow |
| `/?utm_source=test` | 200 | - | noindex, nofollow |
| `/index.html` | 301 | `/` | - |

- `/?action=…`의 302에 `noindex, follow`가 붙는다. push 전 같은 요청에는 이 헤더가 없었다(push 전 기준 프로브로 확인).
- `/ggulggul/?action=…`의 200에는 스테이징 덮어쓰기 값만 보인다. 운영에서 `noindex, follow`가 되는지는 `public/_worker.js`의 `ACTION_ROBOTS_TAG` 코드로만 확인했다(추론).

### 파일

| 파일 | 상태 | 크기(bytes) | 확인한 것 |
|---|---|---|---|
| `/robots.txt` | 200 | 137 | 스테이징 전용 `Disallow: /`. 운영 robots는 확인할 수 없음 |
| `/sitemap.xml` | 200 | 796,138 | `<loc>` 1,081개 |
| `/sitemap-index.xml` | 200 | 485 | 응답 확인 |
| `/rss.xml` | 200 | 338,874 | item 60개 |
| `/llms.txt` | 200 | 7,332 | 정의 문장 "꿀꿀 운세는 명리학자 박병하(네오)가 운영하는 사주·타로·자미두수 운세 상담 서비스예요." 있음 |
| `/llms-full.txt` | 200 | 19,192 | 같은 정의 문장 1회 |
| `/version.json`, `/api/version` | 200 | 639, 306 | gitSha `cea92ad58` |

## 4. 화면 확인 (Playwright, 로그인·결제 없음)

모바일 390×844, 데스크톱 1280×900으로 봤다. 스크린샷은 `D:\Development\Temp\naver-seo-staging\`에 있다. GA와 네이버 분석 호스트는 막고 돌렸다.

| 화면 | 모바일 | 데스크톱 |
|---|---|---|
| 홈 `/` | 가로 넘침 없음(390/390). H1 "꿀꿀 운세 — 사주·타로·자미두수 운세 상담". 페이지 오류 0 | 가로 넘침 없음(1280/1280). 같은 H1. 오류 0 |
| `/saju/` | 넘침 없음. `/saju/free/` 링크 1개. 오류 0 | 같음 |
| `/saju/free/` 무료 결과 | 1990-05-15(임의 예시)를 넣으면 "년주 庚午 · 월주 辛巳 · 일주 庚辰 · 시주 미상"과 오행 해석 한 단락이 로그인 없이 나옴 | 같은 결과 |
| 결과 화면 "관련 상담 더 보기" | 확인 못 함(아래) | `details.cd-result-more`가 `#resultPage` 안에 있고 기본이 닫힘(open=false). 요약 문구 "관련 상담 더 보기". 누르면 열림. 로그인 전이라 `#resultPage`를 강제로 보이게 한 화면이다(파일명에 FORCED) |
| 영냥이 상품 안내 `/yeongnyangi/readings/saju/` | 넘침 없음. "질문 없이 전체 성향 리포트 고르기"를 펼치면 등급 버튼이 "고등어 10,000원 5개 챕터", "연어 15,000원 8개 챕터", "광어 20,000원 13개 챕터", "참치 30,000원 28개 챕터"로 나오고, 선택 요약은 "**10,000원 · 5개 챕터** 고등어"(가격+분량이 굵게, 생선 이름은 보조) | 같음 |

- 첫 실행에서는 `/saju/free/` 결과가 비어 보였다. 쿠키 배너가 화면을 덮은 채 hydration 전에 버튼을 눌렀기 때문이다. 네트워크가 잠잠해질 때까지 기다린 재실행에서는 두 폭 모두 결과가 나왔다. 결함이 아니다.
- **모바일 결과 화면은 확인하지 못했다.** 모바일 폭에서는 셸이 DOMContentLoaded 직후 `#resultPage`를 DOM에서 떼어 낸다. 운영(`code-destiny.com`)에서도 같은 동작이라 이 브랜치가 만든 것이 아니다. 떼어 낸 노드가 결과를 그릴 때 그대로 돌아오는지, 그 안의 "관련 상담 더 보기"가 접힌 채 보이는지는 로그인이 필요해 보지 못했다. 응답 HTML에는 모바일 UA에서도 마크업이 들어 있다.
- 영냥이 홈 `/yeongnyangi/` 첫 화면에는 가격+분량 요약 줄이 없다. 상품 페이지에서도 접힌 영역을 펼쳐야 보인다. 접어 둘지는 설계 판단이라 고치지 않았다.
- 이 PC의 헤드리스 브라우저로는 스테이징 정적 자산이 느렸다(페이지 load 10~50초, 한 번은 90초 안에 DOMContentLoaded가 오지 않음). curl로는 문서가 1~4초에 온다.

## 5. 유입 분류와 `cd_paid_campaign` 쿠키

스테이징 페이지에서는 7개 경우 모두 쿠키가 만들어지지 않았다. 2절에 적은 대로 스크립트가 운영 origin이 아니면 빠져나가기 때문이다. 아래 표는 스테이징이 배포한 `/js/core/analytics.js`(빌드 산출물과 해시 동일)를 `https://code-destiny.com` origin으로 꾸민 격리 브라우저에서 돌린 결과다. 모든 요청은 로컬에서 채우거나 막았고 운영이나 GA로 나간 요청은 없다. 테스트 페이지에 viewport 메타가 없어 device가 desktop으로 찍혔다. 실제 페이지에서는 폭 768 미만이면 mobile이다(코드 기준).

| 경우 | 동의 쿠키 | 세션 라벨 | `cd_paid_campaign` 값 | 수명(초) | 사이트 안 이동 뒤 |
|---|---|---|---|---|---|
| 네이버 검색 referrer | accepted | organic_naver | `{"campaignId":"organic_naver","consent":true,"version":"entry-20261114-v1","device":"desktop"}` | 1800 | 유지 |
| 네이버 검색 referrer | 없음(배너 선택 안 함) | 없음 | 없음 | - | 없음 |
| 네이버 검색 referrer | essential(필수만) | 없음 | 없음 | - | 없음 |
| `NaPm` 파라미터 | accepted | paid_search | `{"campaignId":"paid_search","consent":true,"version":"entry-20261114-v1","device":"desktop"}` | 1800 | 유지 |
| `NaPm` + 네이버 referrer | accepted | paid_search | 위와 같음 | 1800 | 유지 |
| `NaPm` 파라미터 | 없음 | 없음 | 없음 | - | 없음 |
| 직접 진입 | accepted | 없음 | 없음 | - | 없음 |
| m.search.naver referrer → 홈 | accepted | organic_naver | campaignId `organic_naver` | 1800 | 유지 |
| 구글 referrer | accepted | organic_google | campaignId `organic_google` | 1800 | 유지 |

- 분석 쿠키에 동의(`cd_cookie_consent=accepted`)한 방문만 라벨이 붙는다. 배너를 누르지 않았거나 "필수만"이면 쿠키도 세션 값도 없다.
- 네이버 검색 referrer는 `organic_naver`, `NaPm` 파라미터는 referrer가 네이버여도 `paid_search`다. 쿠키 수명은 30분이고 사이트 안에서 이동해도 유지된다.
- `NaPm`을 광고 유입으로 보는 것은 이 브랜치의 가정이다. 네이버가 자연 검색 결과 링크에도 `NaPm`을 붙인다면 유료 쪽으로 잘못 잡힌다. 운영 데이터로 확인해야 한다.

### 발견한 결함 — analytics.js 캐시 핀

- 증상: Next 페이지(`/saju/` 등)는 `app/layout.js`에서 `/js/core/analytics.js?v=20261113-regional-consent-v1`를 부른다. 이 브랜치가 `analytics.js`를 고치면서 이 핀을 올리지 않았다. 그 URL은 `Cache-Control: public, max-age=604800`이고 스테이징과 운영 모두 CDN에 옛 내용으로 올라가 있다. 스테이징에서 cf-cache HIT, Age 약 21시간, `entry-20261114-v1` 문자열 0회였고, 쿼리를 바꿔 받으면 새 내용(1회)이 온다.
- 영향: 그대로 운영에 올리면 Next 페이지에서는 최대 7일 동안 옛 스크립트가 내려가, 유입 분류와 이번에 넣은 측정 이벤트가 동작하지 않는다. 셸(`index.html`)은 빌드 해시(`?v=build-…`)를 써서 영향이 없다.
- 조치: 핀을 `20261114-entry-source-v1`로 올렸다(로컬 커밋). **아직 push하지 않았다.** 7절 참고.

## 6. Lighthouse (모바일, 13.1.0, 1회 측정)

`node_modules`의 Lighthouse를 로컬 Chrome 헤드리스로 돌렸다. 기본 설정(느린 4G와 CPU 4배 감속 시뮬레이션)이다. 1회 측정이라 편차가 있을 수 있고 push 전 기준값은 없다.

| 페이지 | 성능 | SEO | LCP | CLS | TBT | FCP | 감속 없는 실측 LCP |
|---|---|---|---|---|---|---|---|
| `/` | 55 | 69 | 11.8 s | 0.004 | 50 ms | 8.7 s | 5.4 s |
| `/saju/` | 52 | 69 | 21.9 s | 0.02 | 200 ms | 8.6 s | 9.2 s |
| `/ggulggul/` | 54 | 69 | 15.4 s | 0.015 | 120 ms | 12.8 s | 3.2 s |

- SEO 69는 세 페이지 모두 `is-crawlable` 하나만 실패한 값이다. 스테이징 noindex 때문이고 나머지 SEO 감사는 통과했다.
- `/saju/`의 LCP 요소는 쿠키 안내 배너의 문단이다(렌더 지연 약 8.3초). 배너가 늦게 뜨면서 LCP로 잡힌다.
- 전송량은 `/` 1,953 KiB(요청 123개), `/saju/` 3,298 KiB(154개), `/ggulggul/` 3,032 KiB(254개)다. 렌더 차단 자원 절감 추정은 차례로 3.0초, 3.8초, 7.8초다.
- LCP가 세 페이지 모두 느리다. 이 브랜치 때문인지는 기준값이 없어 판단하지 못했다. 성능 개선은 이번 범위가 아니라 고치지 않았다.
- Lighthouse 명령은 종료 코드 1로 끝났다. 보고서 JSON은 정상으로 만들어졌고 오류는 측정 뒤 Chrome 임시 폴더를 정리하는 단계에서 났다.

## 7. push하지 않은 것

- `fix(analytics): Next 레이아웃의 analytics.js 캐시 핀 갱신`과 그 뒤 문서 커밋은 로컬에만 있다. 저장소 규칙이 "main이 다른 사람 커밋으로 이미 빨간 상태면 그 위에 push하지 말고 그 커밋을 보고"인데, Secret Scan이 `9bbc65bbf` 때문에 계속 실패 중이다. 첫 push 때는 최근 run 5개만 보고 이를 놓쳤다.
- 올릴 때는 이 워크트리에서 `git fetch origin && git rebase origin/main`, `npm run check:pre-push`, `git push origin HEAD:main` 순서다. 올린 뒤 스테이징에서 `/saju/`의 HTML이 새 핀을 부르는지 확인한다.
