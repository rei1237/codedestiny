# 꿀꿀운세 실제 진입점 노출 개선 — Phase 0 진단·G1 검토안

상태: **진단 완료 범위 보고 / 구현 G1 대기**. 관측일 2026-10-05, Asia/Seoul. 기준 체크아웃 `D:/Development/code-destiny`, HEAD `a13ee2a647cdeddbebfdd0e373ea0378398593f2`.

## 1. 가장 먼저 해결할 문제

성공 조건은 **`꿀꿀운세`를 검색했을 때 꿀꿀운세 입구 `/ggulggul/`와 영냥이 입구 `/yeongnyangi/`가 각각 공식 서비스로 발견되는 것**이다. 도메인 전체 노출, 띠별 운세 유입, 브랜드 설명 글 하나의 노출을 이 목표의 달성으로 바꾸어 말하지 않는다.

실제 첫 페이지에서 두 입구가 함께 나오지 않는다는 사용자의 문제를 확인했다. 동시에 Google URL 검사에서는 **두 입구 모두 색인되었고 선언 정본과 Google 선택 정본이 일치**했다. 따라서 지금의 우선 작업은 사이트 전체를 다시 수집시키는 것보다 **두 입구의 브랜드 연관성·역할·내부 연결을 분명히 하는 것**이다. 검색엔진이 같은 도메인의 두 페이지를 동시에 선택하는 결과 자체는 보장할 수 없으며, 각 URL의 독립 노출을 측정한다.

**권장:** 현재 `/ggulggul/`와 `/yeongnyangi/` 정본 유지 → 두 페이지의 title/H1/첫 문단/OG/가시 서비스 관계 통일 → 현재 노출 중인 `/kkul-kkul-unse/` 첫 화면에 두 공식 입구 배치 → 모바일 성능과 확인된 마크업 오류 수정. 루트로의 정본 이동은 현재 근거로 우선하지 않는다.

이번 단계에서 서비스 코드·메타·URL·결제·인증·엔진·DB·배포·콘솔 제출은 변경하지 않았다. 사용자가 먼저 지시한 SEO 스킬 설치와 외부 진단 산출물 작성만 수행했다. 기존 미커밋 작업은 보존했다.

## 2. 작업 목록과 검증 범위

TaskCreate 도구가 제공되지 않아 아래 작업 목록으로 대체했다. 마지막 단계는 검증이다.

- [x] 스킬 설치와 SKILL 및 references 전체 읽기(SEO/AEO/GEO/LLMO/NEO/측정/콘텐츠).
- [x] 홈·허브·상세·5개 언어·오류·봇 응답의 JS 없는 HTML 수집.
- [x] 라우트·정본·내부 링크·sitemap·robots·JSON-LD·결제/앱 인접 목록.
- [x] 실제 브랜드 SERP, GSC·Naver·Bing 콘솔, AI 질문 기준선 확보.
- [x] 모바일 lab/CrUX 기준선 및 고아 코드 후보 확인.
- [x] 의도 갭·경쟁 후보·대통령 사주 원문 비교·실행 계획 작성.
- [x] **검증:** 증빙과 주장 대조, 미측정·보류 분리, G1 전 서비스 무변경 확인.

확보한 핵심 증빙: 자사 curl **105관측**, 정본 HTML **38표본**, App Router 템플릿 273개(동적 44), 홈 참조 687행/164파일, literal action 44종/251참조/28파일, 날짜 상세 12표본. 경쟁 후보 40개(39 HTTP200·1 HTTP403)와 별도로 **실제 Google 상위 결과 7개 의도군×5개 + 브랜드 표면 5개**를 직접 수집했다. 전체 사이트 HTTP 전수 크롤링은 아니다.

## 3. 5개 레인 점수표

점수는 측정된 강약을 표시한 상태표이며 검색 순위를 환산한 숫자가 아니다.

|레인|판정|근거와 먼저 할 일|
|---|---|---|
|SEO|⚠️ / 브랜드 목표 ❌|두 입구 색인·SSR·self-canonical은 정상. 붙여쓴 브랜드 검색에서 실제 입구가 선택되지 않음. 주요 브랜드 문구·직접 링크·모바일 비용 개선|
|AEO|⚠️|허브 FAQ·직답 기반은 존재. 날짜 상세12표본의 FAQ36문답이 JSON-LD에만 있고 본문에 없음|
|GEO|⚠️|Naver AI·ChatGPT·Perplexity·Bing 계열에서 일부 인용 확인. 오래된 가격·파라미터 URL 인용 및 운영자 질문 오인 존재|
|LLMO|❌ / 기반 ⚠️|Organization·Person @id와 sameAs는 있음. `코드데스티니` 질문이 여러 AI에서 게임으로 해석됨. 꿀꿀운세·영냥이·운영자 관계를 가시적으로 고정해야 함|
|NEO|⚠️ / 두 입구 ❌|사이트 등록·수집·기존 유입은 있음. 브랜드 검색은 설명 페이지 중심. `/ggulggul/`는 site: 결과에 있으므로 전면 수집 실패로 볼 수 없음|

## 4. 변경 전 기준선

### 실제 브랜드 검색 — 데스크톱 첫 페이지

O는 **독립 웹 검색결과의 제목 링크가 해당 정본으로 향함**을 뜻한다. crumb·이미지·블로그·AI 인용은 별도다. X는 관찰한 첫 페이지에서 찾지 못했다는 뜻이다. 로그인/맞춤설정·시각에 따라 결과가 달라질 수 있다.

|검색어|검색엔진|꿀꿀운세 `/ggulggul/`|영냥이 `/yeongnyangi/`|실제로 보인 표면|
|---|---|---|---|---|
|꿀꿀운세|Naver|X|X|`/kkul-kkul-unse/` 브랜드 설명|
|꿀꿀운세|Google|X|X|외부 채널·블로그 중심, 자사 도메인은 이미지 블록|
|꿀꿀운세|Bing|△ 파라미터 입구만|X|브랜드 설명 + `/?action=openPhysiognomyApp` 과거 파라미터 홈. 실제 홈으로 들어갈 수 있으나 깨끗한 정본 결과와 분리|
|꿀꿀 운세|Naver|X|X|브랜드 설명|
|꿀꿀 운세|Google|X|X|외부 채널·이미지 블록|
|꿀꿀 운세|Bing|O|X|두 번째 웹결과에 깨끗한 `/ggulggul/`|
|코드데스티니|Naver|X|X|브랜드 설명|
|코드데스티니|Google|X|X|공식 YouTube·게임 정보, AI 개요도 게임 해석|
|코드데스티니|Bing|X|X|공식 YouTube·게임 정보|

`site:code-destiny.com`: Naver 첫 페이지 자사20개(`/ggulggul/` 첫 결과), Google10개(다국어·정보 페이지 중심), 총 결과수는 미표시. Bing은 CAPTCHA로 측정 불가. **20/10은 색인 총수가 아니다.** 세부 링크는 `brand-serp-baseline.md`.

### 소유자 콘솔 — 직접 읽은 값

|출처|기간/신선도|기준선|해석|
|---|---|---|---|
|GSC 검색 실적|2026-09-05~10-02, 28일|11클릭 /170노출 /CTR6.5% /평균순위16.4|전체 도메인 기준. 브랜드 두 입구 유입과 분리|
|GSC 페이지 색인|보고서 갱신일09-21|색인301 /제외2,617|오래된 보고서. 오늘의 색인 수처럼 말하지 않음|
|GSC `/ggulggul/` URL검사|최근 수집10-05 11:55:20|색인됨·스마트폰Googlebot·fetch성공·선택정본 일치|현재 브랜드 미노출을 미색인으로 오진하지 않음|
|GSC `/yeongnyangi/` URL검사|최근 수집10-03 15:08:20|색인됨·스마트폰Googlebot·fetch성공·선택정본 일치|sitemap.xml 인식, 참조 페이지는 감지 없음|
|Naver 검색 실적|최근30일,10-04갱신|UI표시 **3.3천클릭 /69.6만노출 /CTR0.5%**|반올림 표시를 정확한 정수로 바꾸지 않음|
|Naver `꿀꿀운세` 쿼리|같은 화면|27클릭 /66노출 /CTR40.9%|어떤 URL 클릭인지 결합되지 않아 두 입구 노출 증거로 사용하지 않음|
|Naver 사이트 진단|10-04갱신|색인8.3백(반올림), noindex945, 제목중복637, 설명중복638|과거·파라미터 포함. 아래 표본 확인 후 수정 결정|
|Bing 검색|07-05~10-04, 기본3개월|57클릭 /1.3K노출(UI표시)|28일 Google·30일 Naver와 직접 성장률 비교 불가|
|Bing AI Performance|09-05~10-04,30일|**87인용**, 평균 인용 페이지 표시1|Microsoft Copilots and Partners 범위. ChatGPT/Perplexity 수치로 일반화 금지|

Naver 실제 상위 유입 `/fortune/tomorrow/tiger/`233클릭, `/rat/`197, `/pig/`183, `/snake/`183은 **rolling 운세**다. 날짜 archive의 품질 문제를 이유로 이 유입 경로를 함께 없애면 안 된다.

중복 제목637개의 첫 그룹은 `/psychotest/tci/?v=<버전>` 23개였다. 첫10개 URL을 확인했고 첫 샘플은 Yeti/Googlebot200·정본 `/psychotest/tci/`·`noindex,follow`다. 637개가 서로 다른 공개 콘텐츠라는 가정은 기각한다. 남은 그룹 전수 원인과 설명중복638개는 미확인이다.

콘솔 수치는 `console-baseline.json`, 표본 중복 근거는 `duplicate-source-note.md`에 기록한다. GSC·Naver·Bing 사이트 등록이 이미 확인되었으므로 신규 등록부터 반복하지 않는다.

### AI 인용 기준선

동일 질문10개를 기준으로 측정했다. O=보이는 답변 출처에서 도메인 직접 인용, X=생성된 답변의 확인 범위에서 직접 인용 없음, —=AI 기능 미출현 또는 접근 제한. **미출현/미측정을 X나0으로 채우지 않는다.**

Naver AI 브리핑10질문 중 O3(브랜드 설명·본명숙·나크샤트라), X5, 미출현2. Google AI 개요10질문은 생성됐으나 확인한 가시 출처에서 자사 직접 인용0. 정확한 질문별 표는 `ai-serp-baseline.md/json`에 있다.

Perplexity는 게스트 독립 검색으로 3개 답변 확인: Q1브랜드소개 O(`/ggulggul/`), Q2영냥이이용처 O(루트만 안내), Q3제작자 X(게임으로 오인). 이후 가입 요구가 나타나 Q4~10은 미측정으로 남겼다. Q1은 공통 질문에 공식 URL 요청을 덧붙였으므로 타 플랫폼과 완전히 동일한 프롬프트는 아니다. 새 계정/제한 우회를 하지 않았다.

ChatGPT는 웹 검색·비개인화 임시 채팅으로 별도 측정했고 `chatgpt-baseline.md/json`에 기록한다. 직접 인용은 10질문 중 4개(브랜드 3/3, 비브랜드 1/7)에서 확인했다. 검색 인용이 있더라도 예전 가격·URL을 제시하는 사례가 있어 **인용 유무와 정보 정확도를 별도 KPI**로 둔다. 지금 읽은 답변의 가격을 사이트 정책으로 채택하지 않는다.

## 5. 원인 가설 순위 — 확인된 사실만 수정

P0는 사이트 기능 중단을 뜻하는 대신 이번 프로젝트 최우선 해결 목표에 사용한다. 검색 순위의 단일 원인을 확정했다는 의미는 아니다.

|순위/가설|증거|판정·심각도|난이도·권고|
|---|---|---|---|
|1 H2 브랜드와 실제 입구 연결 부족|꿀꿀운세 title은 띄어쓰기, H1은 감성 문구. 영냥이도 붙여쓴 브랜드·코드데스티니가 주요 면에서 약함. 두 입구 색인됨에도 브랜드SERP X|**P0 주요 면의 브랜드 신호 약함 확인**, 순위 인과는 가설|중. i18n 기반 브랜드·서비스 관계를 가시 본문/메타/OG에 일치|
|2 새 가설 엔티티 충돌·오래된 검색 표면|운영자 질문에서 게임으로 오인, 파라미터 URL·예전 가격을 AI가 인용|P1 실측|중. 두 입구·브랜드·About·공식 채널의 관계/현행 안내 정합성|
|3 H4 탐색 링크의 action 의존|홈 대표6카드 중4개 query action,1개fragment,1개허브. 브랜드 안내 두 번째CTA는 영냥이가 아닌 만세력|P1 부분 확인|중. 실제 허브 anchor와 실행 enhancement 구분; 첫 화면 두 공식 입구|
|4 새 가설 모바일 초기 비용|홈 mobile lab3회중앙30점/LCP12.19s/TBT1.80s, DOM4,882. 영냥이37점|P1 실측 성능 문제, 순위원인 확정 아님|중. 이미지·sizes·비결제 CSS/DOM 범위부터|
|5 새 가설 FAQ 본문 불일치|날짜12표본·36QA가 JSON-LD에만 존재|P1 확정|하. 동일 데이터로 가시FAQ 렌더하거나 해당 LD 제거|
|6 H5 날짜 템플릿 가치|archive360개·전체27.5%, 12표본 반복률 높음. 무한 누적은 아님|P2 부분 확인, 사이트 제재 증거 없음|중. archive별 실적/가치 확인 후 축소 판단, rolling 보존|
|7 H7 sitemap 구조|5언어 선언, sitemap.xml은 같은1310URL의 flat집계. index아님|P2 확인, 검색불능 원인 아님|중. 생성기·검증기 함께 index전환, 기존 제출 URL 유지|
|8 H1 홈3중화|`/`와`/index.html`은1홉301→`/ggulggul/`; 정본/og/x-default/사이트맵 일치|**3개독립홈 가정 기각**. 내부index링크는P2|라우팅 전환은 고위험. 정본유지·내부anchor만 선별 개선|
|9 H6 수집 자체 부족|Naver유입·site홈, GSC두입구색인 확인|전면수집실패 기각. URL별문제는P2|계정이미등록. 색인추가요청보다 정확한 브랜드변경후요청|
|10 H3 봇 전면차단|14UA홈 모두200동일본문, 실제Googlebot수집성공|현재전면차단 기각. verifiedAI/Yeti로그 미확인P2|Cloudflare 실제로그 확인. WAF통째해제 금지|
|11 새 가설 한국어 본문 언어오류|SignFortuneView locale삼항식의 ko분기 없음|P2 소스 확인|하. 기존 i18n키로 교정, 운세 title실험 보존|
|12 새 가설 query footprint|Naver 제목중복 첫그룹 버전query23개, 검색·AI에action/from변형 잔존|P2 표본 확인|중. 정본내부링크 개선. 버전/콜백 강제제거는 인증인접 별도승인|

## 6. curl·SSR·정본·크롤러 증빙

|URL|Yeti / Googlebot|리다이렉트|응답 HTML 텍스트(대략)|정본|
|---|---|---|---:|---|
|`/`|301→200 /301→200|1홉|31,390자|`/ggulggul/`|
|`/index.html`|301→200 /301→200|1홉|31,390자|`/ggulggul/`|
|`/ggulggul/`|200 /200|0|31,390자|자기자신|
|`/yeongnyangi/`|200 /200|0|14,402자|자기자신|
|`/kkul-kkul-unse/`|200 /200|0|4,758자|자기자신|
|`/saju/`, `/ziwei/`, `/sukuyo/`, `/vedic/`, `/astrology/`, `/tarot/`|모두200 /200|0|5,713~7,381자|각자|
|`/insights/famous-saju/an-jung-geun/`|200 /200|0|5,593자|자기자신|
|`/insights/saju-2027-monthly-planning-framework/`|200 /200|0|5,412자|자기자신|
|`/없는페이지-test`|404 /404|0|229자|없음, noindex|

첫 화면과 숨은 모달을 포함한 **HTML 존재 증빙**이다. 글자 수가 많다고 고유 콘텐츠 품질이나 첫 화면 가독성이 높다는 의미는 아니다. 모든 메타·H1·OG·JSON-LD유형은 `meta-audit.md`, 원본은 `curl/`, 전체 요청은 `crawl-results.json`/CSV.

Next 응답에는 `BAILOUT_TO_CLIENT_SIDE_RENDERING` 표시가 있지만 RuntimeClientGuards/GlobalHeader의 의도적 `ssr:false` 영역 뒤에 실제 가시 본문이 있다. 38개 정본 HTML 표본에서 body텍스트0은 없었다. 이 문자열만으로 페이지 전체 CSR 실패로 진단하지 않았다. 신년 랜딩은 main태그가 비어 있어도 다른 요소에 H1·본문이 존재한다.

14UA: Yeti, Googlebot, Bingbot, Browser, OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended. 홈은 모두200·698,347bytes(비압축). CF JS Detection 스크립트 존재를 interstitial로 오탐하지 않도록 분리했다. 실제 챌린지 화면·cf-mitigated는 표본에서 없었다. UA를 바꾼 curl은 verified crawler IP 접근 증명은 아니다.

robots 소스/운영은 포맷 차이는 있으나 공개경로 허용·개인경로 차단·CCBot차단 의미가 같다. 소스 `app/robots.ts`의 모든AI를 인용용으로 묶은 주석은 부정확해 정리 대상이다.

|용도|봇/현행|계획|
|---|---|---|
|일반검색|Googlebot/Bingbot/Yeti wildcard공개허용|유지, 실제로그 확인|
|AI검색|OAI-SearchBot·PerplexityBot명시허용, Claude-SearchBot wildcard허용|용도를 설명하고 누락명시그룹 추가시 private규칙 함께 복제|
|사용자요청fetch|ChatGPT-User명시, Claude-User·Perplexity-User wildcard|자동수집과 다른 robots 동작을 공식문서 기준 구분|
|학습/기타제품제어|GPTBot·ClaudeBot·Google-Extended허용, Applebot-Extended wildcard, CCBot차단|현행유지. 검색노출을 이유로 학습허용을 강요하지 않음; 운영자정책 확인|

`/destiny-poker`는 standalone slashless 정본200, slash형은1홉리다이렉트다. 예외를 문서화하고 일괄 slash변경하지 않는다. 30일 밖 날짜 sample은 `/fortune/today/rat/`로 이동하며 영구기록의 안정성 문제로 별도 평가한다.

재현 명령(실제로 이 방식의 curl 수집 실행):

```powershell
curl.exe -sS -L -A "Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)" -o NUL -w "%{http_code} %{url_effective} %{size_download} %{num_redirects}" https://code-destiny.com/ggulggul/
curl.exe -sS -L -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://code-destiny.com/yeongnyangi/
curl.exe -sS -I -L https://code-destiny.com/
curl.exe -sS -o NUL -w "%{http_code}" https://code-destiny.com/없는페이지-test
```

## 7. sitemap·콘텐츠 품질·구조화 데이터

사이트맵 1310 unique: KO813/JA127/EN126/ZH126/ZH-TW118. 언어별 합집합 = 집계 sitemap 동일, 집계 내 중복 0. 날짜 360(27.5%), rolling 500(38.2%, 언어·허브 포함), insights 150, stories 71, 나머지 229. 날짜는 최근 30일×12개, priority 0.78·홈 1.0이므로 무한 누적/우선순위 동일 가정은 틀렸다.

lastmod는 내용 지문 원장 `scripts/lib/sitemap-lastmod.mjs`를 사용한다. 전부 오늘로 조작했다는 증거가 없다. 당일 587개 중 많은 rolling과 날짜 갱신이 포함되며 전수 정당성까지 검증한 것은 아니다. 고정 날짜 콘텐츠의 사후 수정 반영은 생성기 변경 시 검증한다.

날짜 12개 main 본문의 공백 제거·숫자 정규화·8문자 shingle 비교: 평균 Jaccard 39.7%, 작은 문서 기준 겹침 57.1%, 표본 내 고유 16.3~35.4%. 이는 반복 문구를 찾는 proxy이지 검색엔진 품질 점수/적중률/제재 증거가 아니다. **일괄 noindex하지 않고 archive의 검색 실적과 가치를 따로 확인한다.**

Organization `/#organization`·WebSite `/#website`·Person `/#author` 기존 연결은 재사용한다. Company sameAs 공식 5채널, neosaju는 Person 채널이라 무조건 회사 sameAs로 옮길 필요가 없다. React founder와 static founder의 동일 @id 표현을 정리할 여지는 있다. 검수하지 않은 모든 Article을 박병하 저자로 바꾸지 않는다.

FAQ 총 120문답 관측 중 날짜 36문답은 본문에 없다. 나머지는 HTML 문자열 포함을 확인했으며 CSS까지 계산한 가시성 전수 검사는 아니다. 수정은 같은 FAQ 배열을 본문과 LD에 사용하는 기존 패턴을 따른다. 가짜 Review/AggregateRating을 만들지 않는다.

Google 공식 변경 기록에 따라 **FAQ 리치 결과는 2026-05-07 중단**, llms.txt는 Google 노출/순위 개선 요소가 아니다. 스킬의 오래된 설명을 보정했다. 가시 FAQ의 효용과 다른 AI용 안내문 유지는 별개다. [Google 변경 기록](https://developers.google.com/search/updates), [AI 기능 안내](https://developers.google.com/search/docs/appearance/ai-features).

`llms.txt`는 200·생성기 검사 통과. 브랜드/방법론/운영자/정책 기반이 있다. 1차 산출 기준·공개 기록·인용 표기·실제 검수일을 보강하되 LLMO 성과로 포장하지 않는다. IndexNow는 production 변경 URL 자동 제출이 이미 구현되어 배선 검사 통과했다. 새로 만들지 않는다.

## 8. 모바일 성능과 잡코드 정리

|범위|측정|판정|
|---|---|---|
|CrUX 09-06~10-03 origin 전체 기기|LCP p75 1,335ms, CLS .02, FCP 1,046ms, TTFB 399ms|좋은 관측값이나 모바일만의 결과 아님|
|CrUX PHONE·개별 URL|데이터 없음, INP도 미제공|0점/실패로 간주하지 않음|
|홈 mobile Lighthouse 3회 중앙|30점(26~31), simulated LCP 12.191s, TBT 1,801ms, 전송 3,091KiB, DOM 4,882|저속 모바일 초기 부담 확인|
|영냥이 1회|37점, LCP 5.191s, TBT 2,756ms, 2,894KiB|선별값, 전후 비교는 3회씩 필요|
|사주 1회|54점, LCP 4.223s, TBT 1,161ms|공통 클라이언트 비용 점검|

Lighthouse 13/Chrome headless/412×823/DPR 1.75/CPU×4·네트워크 사후 시뮬레이션. 물리 Android 값이 아니다. 홈 observed LCP 중앙 1.43s와 simulated 12.19s를 섞지 않는다. 상세 환경/원본은 `mobile-audit.md`, `mobile/`.

1차 개선은 splash 약 355KiB, 작게 보이는 영냥이 이미지 112KiB, 실제 표시 폭과 sizes, 첫 화면 폰트·비결제 CSS/DOM 범위다. 홈은 Script보다 Style/Layout 비용이 컸다. `next/image`의 width만 바꾸면 현재 unoptimized 설정에서 수신 파일은 안 줄어든다.

`index.html`의 스플래시 해제는 dom/auth/profile 신호와 연결되어 있다. 신호·인증·결제 beforeInteractive 순서를 성능 명목으로 변경하지 않는다. 960px 레이아웃 및 360/390/430 모바일에서 CTA·키보드·모달 복귀를 검증한다.

확인된 격리 후보는 `public/js/features/tarotHealing/images.js` 0B, `public/js/cd-inline-click-binder.js` 963B, `public/js/cd-web-vitals-console-gated.js` 1,206B. 현재 참조 0이며 G1 후 `_graveyard/` 규약으로 국소 격리·검증한다. 초기 요청에 없는 고아 2KiB를 없애서 성능이 개선된다고 주장하지 않는다. 미사용 CSS 진단은 첫 화면 coverage일 뿐 전체 기능 미사용 증거가 아니다. `sukuyo-book.js`·베다 전역·정적 미러·fallback 홈·IndexNow 정본은 자동 삭제 대상에서 제외한다.

## 9. 검색의도 갭과 1차 배치

|의도|기존 실제 URL|상태|기존 자산 보강 방향|
|---|---|---|---|
|브랜드·영냥이|`/ggulggul/`, `/yeongnyangi/`, `/kkul-kkul-unse/`, `/about/`|약함|두 공식 입구의 관계·차이를 첫 화면과 메타에 명시|
|무료 도구·만세력|`/saju/`, `/manse/`, `/saju/basic/`, `/saju/five-elements/`, `/saju/ten-gods/`, `/saju/guide/`|범위 충분, 근거 약함|이미 있는 계산법·야자시 글에 실제 경계 입력/결과/근거 표|
|오늘·내일·주간·월간·2027|`/today/`, `/fortune/{period}/{sign}/`, `/insights/saju-2027-monthly-planning-framework/`, `/new-year-ai-consultation/`|rolling 강점, 2027 보강|이미 있는 정미년 글과 신년 상담 연결. 중복 신년 템플릿 금지|
|연애·재회·궁합·결혼·이직·재물·시험|`/love/`, `/compatibility/`, `/tarot/love/`, `/tarot/reunion/`, `/tarot/mindscan/`, `/life-book-ai/`, `/neo-operation-room/`|기본 범위 충분, 세부 질문 약함|주제별 실제 지원 범위·계산 근거·행동 예시, 확인 안 된 도구 약속 금지|
|자미두수·숙요·베다·점성술|`/ziwei/`, `/ziwei/chart/`, `/sukuyo/`, `/sukuyo/compatibility/`, `/vedic/`, `/nakshatra/`, `/astrology/`|기존 자산 상당|12궁·본명숙·나크샤트라 계산 조건/예시. 체계 혼합 금지|
|인물·대통령·유명인|`/insights/famous-saju/` 및 상세|회고 기록 flagship 없음|원문·사건·일치/불일치 표를 기존 insights 규약으로 추가|
|비교·신뢰·AI 정확도|`/compare/saju-vs-ziwei/`, `/compare/sukuyo-vs-vedic/`, `/compare/fortune-apps/`, `/methodology/`, `/editorial-policy/`|기반 충분|계산과 해석 구분·같은 입력 검증표, 임의 정확도 점수 금지|
|작명·꿈·관상|`/naming-ai/`, `/dream/`, `/dream/tarot/`, `/dream/psycho/`, `/physiognomy/`, `/face-reading/`|존재, 개별 품질 추가 확인|입력 처리·유료 범위·해석 근거·개인정보 설명|

2027 글은 `app/insights/articles.js:4558-4672`에 존재하고 live 200이다. `.ignore`에 가려진 대용량 정본을 명시 확인했다. 기존 글을 보강하며 승인일+14일 안에 배포/수집 요청 준비를 목표로 한다. 실제 배포 승인·계정 작업이 필요하므로 이미 완료했다고 쓰지 않는다.

1차 배치 상한 15개: 두 입구·브랜드·About 4개 + 6체계 허브 6개 + 기존 계산법/야자시 2개 + 사주 vs 자미두수 1개 + 2027 기존 글 1개 + 공개 기록 신규 1개. 각 페이지는 질문 직답·근거 표/예시·CTA·양방향 링크·가시 FAQ 3~5개를 갖추고 기존 컴포넌트를 쓴다. 15개 중 14개가 기존 페이지 보강이다.

경쟁 후보 40개와 각 H1·H2/H3·HTML 문자 수·FAQ는 `search-research.md`/`competitors.csv`에 있다. **검색 도구 후보를 네이버/구글 상위 5위로 가장하지 않는다.** 별도로 실제 Google에서 7개 의도군의 상위 외부 웹 결과 5개씩, 총 35개를 확인하고 같은 URL의 H1·목차·본문 길이·FAQ를 curl로 수집했다(`actual-competitor-content.md/json/csv`). 35개 모두 HTTP 200이지만 12개는 CSR·숨은 SSR·iframe·영상·유료 발췌 등으로 전체 본문 확인이 제한됐다. 브랜드 검색 상위 5개는 공식 채널과 운영자 글이 많아 경쟁자로 오분류하지 않고 `brand-serp-top5.json`에 유형을 구분했다. 네이버 의도군별 상위 5개 전수, 자동완성/PAA 전수는 미측정이며 현재 질문들은 경쟁 가시 제목/FAQ와 실제 콘솔 질문에서 선정했다.

경쟁도 이미 계산 기준·시간 보정·다체계를 제공한다. 우리의 첫 문단 차별점은 '체계가 많다'만이 아니라 **같은 입력의 경계 사례를 재현할 수 있는 계산 근거와 검증 자료**여야 한다. 아직 산출 검증하지 않은 예시는 홍보 카피에 넣지 않는다.

## 10. 대통령 공개 기록 — 주장 가능한 범위

Chrome에서 네이버 원문 3건을 직접 읽었다. 현재 표시 발행일과 현재 본문을 확인한 것이며 사건 전 독립 스냅샷/수정 이력은 미확보다.

|표시 공개일·원문|현재 본문 요약|이후 공적 사건|시점/방식 판정|
|---|---|---|---|
|[2022-09-16](https://blog.naver.com/neosaju/222876455500)|2025년 무렵 정치계 변화·사건|2025-04-04 파면|시점 △, 구체 사건·방식 미명시|
|[2024-05-12](https://blog.naver.com/neosaju/223444062729)|탄핵 가능성 제목, 2025년 악화·송사, 빠르면 2024년 10~11월도 제시|2024-12-14 탄핵소추 가결·2025-04-04 파면|2025 연도/주제 부합, 빠른 시점·촉발 방식까지 부합 주장 불가|
|[2024-05-27](https://blog.naver.com/neosaju/223459696339)|2025년 특정, 혁명·쿠데타 유사 방식 서술|2025-06-03 선거|연도 ○, **방식은 부합으로 판정할 수 없음**|

사건 출처: [헌법재판소 2024헌나8](https://www.ccourt.go.kr/site/kor/ex/bbs/View.do?bcIdx=4253958&cbIdx=1106), [중앙선관위 제21대 대선](https://www.nec.go.kr/vt/main.do). 둘째 글→파면 327일이므로 '1년 전' 대신 정확한 날짜 또는 약 11개월 전이다. 세 선택 사례로 전체 적중률을 만들지 않는다.

권장 flagship: **대통령 사주 공개 분석 기록 — 날짜·원문·실제 사건 비교**. 신규 URL은 `/insights/`의 기존 slug 시스템에 추가할 예정이며 아직 존재한다고 보고하지 않는다. 홈 신뢰 문구보다 두 공식 입구 노출 정리가 우선이다. 채택 문구는 공통 i18n 세트에서 전파하고 저자 경력과 모든 결과의 사람 검수를 혼동하지 않는다. 블로그 프로필의 10년 경력은 공개 자기서술과 사용자 제공 사실 수준이다.

## 11. Phase 1~6 구현 계획과 실제 확인 파일

모든 경로는 찾아서 확인한 기존 파일이다. 신규 콘텐츠 slug·번역 키·이미지 파생 파일은 G1 후 그 규약 안에서 생성한다. 각 Phase는 최소 변경 단위 Conventional Commit·대상 검사·CI·curl 증빙으로 나눈다. 현재 공유 체크아웃에 다른 세션 변경이 있어 구현 시 최신 AGENTS의 동시 작업 격리 규칙을 적용한다.

|Phase|변경과 합격 기준|실제 파일 후보|
|---|---|---|
|1 브랜드 입구·기술·모바일|두 입구 title/H1/OG/첫 문단 관계, 브랜드 첫 화면 2CTA, 허브 anchor, FAQ 누락 수정, 이미지·sizes 국소 개선, 고아 격리. sitemap index는 검증기 계약을 함께 변경. 두 입구 200/self canonical/SSR + 모바일 전후 3회|`app/kkul-kkul-unse/page.js`, `app/yeongnyangi/page.tsx`, `app/yeongnyangi/_components/YeongnyangiGuide.tsx`, `app/yeongnyangi/_original/FortuneHome.tsx`, `templates/home-funnel.html`, `lib/seo/siteSeo.ts`, `lib/seo/entity-registry.mjs`, `app/components/GlobalHeader.tsx`, `app/components/SiteFooterHub.jsx`, `app/fortune/date/[date]/[sign]/page.tsx`, `app/fortune/date/[date]/[sign]/DateSignFortuneView.tsx`, `app/fortune/[period]/[sign]/SignFortuneView.tsx`, `i18n/authored/shellRuntime-21.json`, `app/robots.ts`, `scripts/generate-sitemap.mjs`|
|2 1차 15개 이내 품질 개선|기존 계산법·희소 허브·비교·2027에 실계산 예시/근거 표/직답/FAQ/CTA. 기존 주장과 엔진 계산 일치, 신규 유형 sitemap 포함|`lib/seo-landing-pages.js`, `app/components/SeoLandingTemplate.jsx`, `app/insights/methodology-articles.js`, `app/insights/seo-growth-articles.js`, `app/insights/articles.js`, `app/insights/seed-articles.js`, `app/insights/seo-titles.js`, `app/insights/seo-descriptions.js`, `app/new-year-ai-consultation/page.tsx`|
|3 공개 기록|원문/공공 출처/연도·방식 판정/한계 표·저자 상자·i18n 공유. 모든 전파 문구가 가시 본문과 일치. 허브/flagship/체계별 CTR 3안은 채택 후 적용|`lib/brand/trust-stories.mjs`, `app/insights/seed-articles.js`, `app/insights/[slug]/page.js`, `app/about/page.js`, `app/about/ServiceIntroduction.jsx`, `app/insights/famous-saju/page.tsx`, `lib/structured-data.ts`, `scripts/design/build-home-funnel.mjs`|
|4 AEO/GEO/LLMO|두 입구와 운영자 엔티티 연결, 1차 소스/인용 규칙 llms 정리, FAQ 일치. IndexNow 기존 구현 확인|`lib/structured-data.ts`, `lib/seo/siteSeo.ts`, `lib/seo/entity-registry.mjs`, `scripts/generate-llms-txt.mjs`, `llms.txt`, `public/llms.txt`|
|5 Naver|기존 등록 확인, 수집 URL 우선순위, 공식 블로그 두 채널 브랜드/URL 수정안·주제 계획. 자동 발행 없음|`docs/seo/checklists.md`, `docs/seo/SEO-KEYWORD-MAP.md`, `docs/seo/SEO_AUDIT.md`|
|6 측정|배포일 확정 후 +14/+30 실제 예약, 두 입구 브랜드 노출·페이지 쿼리 CTR·AI 인용 정확성·봇·모바일 비교|`docs/seo/SEO_STATE.json`, `docs/seo/SEO-CHANGELOG.md`, `docs/seo-strategy/09-measurement-plan.md`|

홈 정본 소유 파일 `index.html`, `scripts/sync-legacy-static-to-public.mjs`, `scripts/design/build-home-funnel.mjs`, `i18n/authored/shellCopy-10.json`, `shellCopy-12.json`, `shellCopy-13.json`은 별도 표면·키별로 추적한다. public 미러만 고치지 않는다. **index.html은 결제 실행 함수도 포함하므로 파일 수정 전 별도 승인 목록에 포함**한다.

현재 CTR 선택지 3안씩을 작성한 대상은 브랜드 안내·`/ggulggul/`·`/yeongnyangi/` 3페이지이며 `ctr-copy-options.md`에서 검토할 수 있다. 허브/flagship/6체계별 3안은 Phase 3에서 작성·선택할 예정이며 미적용 상태다. 추천 정식 표기는 **꿀꿀운세 / 코드데스티니(Code Destiny)**, `/ggulggul/`은 B안, `/yeongnyangi/`는 A안. 새로운 루트 독립 홈은 만들지 않는다. 한글 약 30자 제목·80~100자 설명은 초안 기준이며 모바일 SERP 잘림은 배포 후 실측해야 한다. 가격·무료·로그인 조건을 새로 약속하지 않았다.

## 12. 별도 승인이 필요한 실제 파일·영향

G1은 일반 SEO/콘텐츠/성능 구현 게이트다. 다음 항목은 사용자가 지정한 예외여서 G1 전체 진행만으로 자동 수정하지 않는다.

|영역|파일·현재 연결|현재 행동|
|---|---|---|
|홈 동일 파일 결제|`index.html:23152-23179` PortOne redirectUrl=currentpage+query. 동결 설정 `config/payment-freeze.json`|메타/헤더/모바일 편집도 파일 승인 범위 명시 필요. 결제 함수는 불변|
|PortOne 실행|`lib/payment/portone.ts:444` redirectPath→origin SDK 전달|수정하지 않음|
|OAuth 복귀|`app/auth/_components/StaticOAuthCallbackRedirect.tsx:430-439`, `app/components/auth/AuthShell.tsx:519`, `app/_lib/auth-return.js:22-26`|루트/index 정규화 참조 목록만 보고|
|서비스·결제 query|`lib/navigation/legacy-home-target.mjs`, `lib/navigation/shellHome.ts`|query/hash 보존 계약. 강제 제거 금지|
|모바일 진입|`apps/mobile/capacitor.config.ts:21`, `apps/mobile/android/app/src/main/java/com/codedestiny/app/MainActivity.java:264,268,272`, `CodeDestinyNavigationPlugin.java:124`, `scripts/build-mobile-app.mjs:461`|영냥이 index 입구·index fallback·앱 링크 재작성 유지|
|스플래시·전역 실행|`index.html:5342-5413`, `app/layout.js:180-186`|auth/profile/결제 준비 순서 변경은 별도 승인|
|version query 정리|`app/components/AppVersionGuard.tsx:409-415,452-455`|세션 업데이트/결제 복귀 영향 때문에 단순 삭제 안 함|
|엔진·DB|사주 calculateLocalResult/normalizeSaju/KASI prefetch 및 6체계|read-only 유지. 모델/스키마/자산 형식 수정 계획 없음|

이 표의 파일 내용/함수는 현 단계에서 수정하지 않았다. 루트 정본 뒤집기를 보류하면 많은 위험 항목을 아예 건드릴 필요가 없다.

## 13. 사용자 직접 작업 체크리스트

**네이버 서치어드바이저**

- [x] 루트 사이트 등록·접근 및 지표 확인. 소유 확인 상태의 향후 만료는 사용자가 관리.
- [ ] 승인된 배포 후 sitemap index 제출 상태 확인. 현재 5언어 sitemap 정상이며 아직 index 아님.
- [ ] 우선 수집 요청: 아래 목록 순서로 일일 한도 범위. 설명 페이지에만 요청하지 않음.
- [ ] 주 1회 브랜드 쿼리·두 URL·전체 검색 실적 스냅샷. noindex/중복 오류는 URL 그룹별로 판정.
- [ ] RSS는 `/rss.xml`과 `/insights/rss.xml` 모두 200. 편집 글 신규 발행용 한 피드를 택해 내용·제출 상태 확인, 동일 feed 중복 제출 불필요.

**GSC/Bing**

- [x] GSC 도메인 속성, 두 입구 색인·정본, Bing 등록 및 AI 보고서 확인.
- [ ] 변경 배포 후 두 입구→브랜드→핵심 허브만 선별 색인 요청. 현재 미색인인 것처럼 반복 요청하지 않음.
- [ ] sitemap 수집 상태, 실제 28일 CSV의 query×page 분석을 추가. Bing은 기등록 상태라 GSC 임포트를 중복 실행하지 않음.

**Cloudflare**

- [ ] Security/Bots의 verified Yeti·Googlebot·Bingbot·AI 검색봇 최근 30일 2xx/403/challenge와 URL별 분류.
- [ ] Bot Fight/Super Bot Fight Mode, AI Crawl Control, Managed robots, WAF custom/managed rules, rate limiting·Bot score 조건·challenge 적용 범위.
- [ ] JavaScript Detections가 검색봇/첫 화면에 주는 영향과 검증봇 처리. 보호 설정 전체 해제 요청이 아님.
- [ ] managed robots와 이날 curl 응답 차이가 생기는지 확인. 현재 본문은 저장소 정책과 의미가 일치.

**공식 채널·공개 기록**

- [ ] neosaju는 분석자, goodbyejieun은 서비스 공식 채널이라는 역할 확정. 프로필/소개에 정식 브랜드와 두 진입점 관계 정리.
- [ ] 오래된 프로필·글 하단의 가격/무료 범위/메뉴명을 현행 registry와 대조. 게시된 글의 사실 정정은 필요 최소 범위만.
- [ ] 공개 기록의 사건 전 스냅샷/수정 이력 확보 가능 여부. 없다면 증거 한계를 그대로 명시.
- [ ] 네이버 블로그 계획: 주 2회 안(계산 경계 사례 1 + 상담/체계 설명 1), 글당 관련 사이트 링크 1~2개. 자동 발행/댓글/서로이웃 없음. 초안 작성 시 inline CSS HTML로 전달.

수집 요청 우선순위(현재 존재 URL):

1. https://code-destiny.com/ggulggul/
2. https://code-destiny.com/yeongnyangi/
3. https://code-destiny.com/kkul-kkul-unse/
4. https://code-destiny.com/about/
5. https://code-destiny.com/saju/
6. https://code-destiny.com/ziwei/
7. https://code-destiny.com/sukuyo/
8. https://code-destiny.com/vedic/
9. https://code-destiny.com/astrology/
10. https://code-destiny.com/tarot/
11. https://code-destiny.com/insights/saju-2027-monthly-planning-framework/

공개 기록 신규 URL은 생성·배포·curl 200 확인 뒤 11번 앞에 추가한다. 신규 URL을 현재 수집 가능한 주소처럼 제시하지 않는다.

## 14. 검증·측정 일정·완료 조건

실행 검증: 홈/query/hreflang/기존 title 관련 node 정적 테스트 **20pass/0fail**, IndexNow wiring **OK**, llms `--check` **통과**. 네트워크 105관측·콘솔·모바일 값은 앞 표 참조. 서비스 빌드/배포/CI는 이번 읽기 전용 단계에서 실행하지 않았다.

```powershell
node --test __tests__/ui/home-entry-redirect.test.mjs __tests__/ui/legacy-home-target.test.mjs __tests__/ui/flower-home-hreflang.test.mjs __tests__/ui/fortune-seo-title.test.mjs
node scripts/verify-indexnow-wiring.mjs
node scripts/generate-llms-txt.mjs --check
```

구현 후 `npm run check:fast -- --plan`→대상 검사→스코프 커밋→공식 CI. public 생성 변경은 정본 생성·미러 신선도 확인. canonical/redirect를 변경하는 경우 사용자 요구대로 staging 먼저 검증하며 일반 push마다 staging을 반복 poll하지 않는다. 운영 배포는 별도 권한 범위를 지킨다. `.github/workflows/cloudflare-pages-deploy.yml:141,624-658`에서 `staging.code-destiny.com`과 staging 배포·스모크 검사 단계의 존재를 확인했다.

운영 배포일 D는 아직 없다. **D+14일·D+30일 오전 10시 KST** 재측정을 예약할 계획이며 배포일이 확정된 Phase 6에 실제 도구로 등록한다. 10-05 배포라면 10-19/11-04이지만 현재 예약 완료일이 아니다. 기존 다른 배포용 10-18 `seo-14` 알림과 주간 SEO 작업은 보존했으며 덮어쓰지 않았다.

같은 조건으로 브랜드 3쿼리×3엔진×두 입구 O/X, query×page별 노출/클릭/CTR, 색인/정본, 동일 AI 질문 인용·정확성, Yeti/AI봇 로그, 모바일 3회 중앙/CrUX를 비교한다. 최신 3일은 제외하고 페이지군 메타는 14일에 한 번만 변경한다. 현재 기준선 간 기간이 달라 그대로 증감률을 계산하지 않는다.

## 15. 하지 않은 것·남은 확인

- G1 전 구현·배포·색인 제출·외부 채널 수정·예약 신규 생성 안 함. 사용자가 지정한 진단→보고서→승인 순서 유지.
- 루트 정본 뒤집기, 브랜드 설명 301/삭제, 날짜/언어 대량 noindex 안 함. 현재 증거가 이를 지지하지 않음.
- 인증/결제/엔진/DB 편집·실결제·유료 LLM API·운영 DB 쓰기 안 함. 브라우저 AI 검색 질문은 사용자가 요청한 기준선 측정 범위.
- 백링크 구매/품앗이·클로킹·숨은 SEO 문구·가짜 평점·적중률·허위 lastmod·자동 댓글/블로그 발행 안 함.
- 사용 중인 모달 CSS·정적 미러·fallback·엔진 인접 코드는 잡코드로 간주하지 않음.
- 미측정: Bing site 총수(CAPTCHA), Perplexity Q4~10(가입 제한), 자동완성/PAA 전수, 모바일 SERP 실제 잘림, Cloudflare verified 로그, 원문 과거 불변성, 물리 Android 성능. 계정 접근이 이미 있는 콘솔 스샷을 사용자에게 중복 요청하지 않음.
- 경로 조회 규칙을 1회 위반했다. `app/robots.js`의 존재를 사전에 확인하지 않고 읽으려다 파일 없음으로 실패했다. 해당 읽기를 중단하고 `rg --files`로 실제 `app/robots.ts`를 확인해 읽었다. 파일 수정은 없었으며 구현은 G1에서 정지한 상태다.

## G1에서 승인할 구체 범위

**추천안:** 현재 두 진입점 정본 유지, `/ggulggul/` 카피 B·영냥이 A를 바탕으로 가시 브랜드/메타 일치, 브랜드 안내 첫 화면 두 CTA, 검증된 SEO 결함·모바일 이미지/비결제 범위·고아 격리부터 진행하고 Phase 2~6까지 이어간다.

별도 명시가 필요한 항목은 **결제 실행 함수가 함께 있는 index.html의 SEO/표시 영역 수정 허용**이다. 허용받더라도 결제 함수·callback·인증/엔진/DB는 수정하지 않고 필요 시 해당 항목만 다시 중단한다. 루트 redirect/앱 진입/콜백 전환은 이번 권장 범위에 포함하지 않는다.

이 보고서와 부속 증빙 검토 후 G1 승인을 받을 때까지 서비스 구현은 대기한다.

## 증빙 파일 바로 열기

- [메타·H1·OG·정본·본문 HTML 표](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/meta-audit.md)
- [실제 브랜드 검색 결과](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/brand-serp-baseline.md)
- [브랜드 검색 상위 5개 표면의 본문 조사](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/brand-serp-content.md)
- [실제 Google 7개 의도군 상위 35개 콘텐츠 비교](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/actual-competitor-content.md)
- [Naver·Google AI 질문별 인용](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/ai-serp-baseline.md)
- [ChatGPT 질문별 인용](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/chatgpt-baseline.md)
- [콘솔·Perplexity 기준선 데이터](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/console-baseline.json)
- [모바일 성능·고아 코드 후보](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/mobile-audit.md)
- [라우트 소유권·위험 파일 목록](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/route-audit.md)
- [네이버 중복 제목 실제 표본](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/duplicate-source-note.md)
- [입구·브랜드 카피 3안](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/ctr-copy-options.md)
- [경쟁 후보·대통령 원문·공식 문서 조사](C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-phase0/search-research.md)

진단 산출물 자체의 JSON 파싱·105관측·14UA·사이트맵 합계·FAQ 불일치·날짜 표본 수·필수 증빙 파일 존재는 `validate-artifacts.mjs`로 검증하여 PASS했다. 이 검증은 서비스 CI나 검색 노출 개선 검증을 대신하지 않는다.
