# SEO·AdSense 체크리스트 (통합)

루트에 흩어져 있던 SEO/AdSense 관련 체크리스트 3개를 병합했다. 각 절은 원문을 그대로 옮겼고, 구획만 나눴다. `SEO_ADSENSE_AUDIT.md`는 이 통합 대상이 아니다 — `npm run seo:audit:complete`가 생성하는 산출물이라 `reports/`에 있고(커밋하지 않음), 참조는 [GROWTH_OPERATIONS.md](GROWTH_OPERATIONS.md)에 정리돼 있다.

- 검색엔진 등록 & 검증 가이드 — GSC·네이버·Bing·다음 등록 절차 전체 (구 `SEO_SUBMISSION_GUIDE.md`). 하위 번호(1~8)는 원문을 그대로 유지했다 — 다른 문서가 `§N`으로 이 절을 가리킨다.
- Google Search Console 실행 체크리스트 — URL 검사·noindex·canonical 점검 (구 `GOOGLE_INDEXING_CHECKLIST.md`)
- AdSense 재신청 전 체크리스트 (구 `ADSENSE_APPROVAL_CHECKLIST.md`)

## 검색엔진 등록 & 검증 가이드 — code-destiny.com (꿀꿀 운세)

> 2026-07-04 SEO 정비 작업 기준. **배포가 라이브에 반영된 뒤** 아래 순서대로 진행하세요.
>
> 🔴 2026-08-13 정정: 이 문서가 원래 안내하던 `deploy:cf:pages` / `deploy:cf:worker` 로컬 배포는
> **폐기됐습니다.** 지금은 PR 을 머지하면 "Release Cloudflare Pages and Worker" 가 그 커밋으로
> 자동 배포합니다(`scripts/lib/production-deploy-guard.mjs` 가 로컬 프로덕션 배포를 막습니다).
> 아래 절차는 그 자동 배포가 끝난 뒤에 진행하면 됩니다.
>
> 이 사이트의 사이트맵은 **`https://code-destiny.com/sitemap.xml` 하나뿐**입니다.
> `scripts/generate-sitemap.mjs`가 만들어 커밋하는 정적 파일이며, 배포 게이트
> (`scripts/verify-adsense-readiness.mjs`)가 이 파일만 품질 검사합니다.
>
> `sitemap-insights.xml`은 **더 이상 존재하지 않습니다**(2026-07 제거). Pages `_worker.js`의
> `DYNAMIC_FEED_PATHS`에 그 경로가 없어 항상 404였고, 워커 동적 피드에는 페이지가 없는
> 슬러그가 섞여 있어 사이트맵에 병합하면 죽은 URL이 색인 대상으로 올라갑니다.
> 관리자 신규 발행분은 `npm run sitemap:generate` → 커밋 경로로 사이트맵에 반영하세요.

### 1. Google Search Console (GSC)

#### 1-1. 속성 등록 — 도메인 vs URL 접두어

| 방식 | 커버 범위 | 인증 방법 | 권장 |
|------|----------|----------|:---:|
| **도메인 속성** (`code-destiny.com`) | http/https, www 유무, 서브도메인(music. 등) 전부 | **DNS TXT 레코드만 가능** | ✅ 권장 |
| URL 접두어 (`https://code-destiny.com/`) | 해당 프로토콜+호스트만 | HTML 태그/파일, DNS 등 다양 | 보조용 |

도메인 속성을 권장합니다 — `music.code-destiny.com`(음원 CDN) 등 서브도메인 트래픽까지 한 속성에서 보입니다.

#### 1-2. 인증

**방법 A — DNS TXT (도메인 속성, 권장)** — ✅ **2026-08-13 완료.** 존에 TXT 레코드가 반영되어 있으므로 아래는 재등록·다른 도메인 추가 시 참고용입니다. 방법 B 는 쓰지 않습니다.
1. [search.google.com/search-console](https://search.google.com/search-console) → 속성 추가 → "도메인" 선택 → `code-destiny.com` 입력
2. 표시되는 `google-site-verification=XXXX` TXT 값을 복사
3. Cloudflare 대시보드 → code-destiny.com zone → **DNS → Records → Add record** → Type `TXT`, Name `@`, Content에 복사한 값 붙여넣기
4. 몇 분 후 GSC에서 "확인" 클릭

**방법 B — HTML 태그 (URL 접두어 속성)**
1. GSC가 주는 `<meta name="google-site-verification" content="...">`의 `content` 값을 복사
2. 코드 두 곳의 플레이스홀더를 실제 값으로 교체:
   - `index.html` (루트) 약 413~415행 — 주석 처리된 `google-site-verification` 메타의 주석을 해제하고 값 교체 → **`npm run sync:public` 실행** (public/, static/, 로케일 사본으로 전파됨)
   - `app/layout.js` 약 128~133행 — 주석 처리된 `verification: { google: ... }` 블록 주석 해제 + 값 교체
3. 커밋 → 배포 → GSC에서 "확인"

#### 1-3. 사이트맵 제출
GSC → 색인 생성 → Sitemaps에서 아래 하나를 제출:
```
https://code-destiny.com/sitemap.xml
```

#### 1-4. 색인 요청
- 핵심 페이지(홈, /saju, /tarot, /ziwei, /insights 등)는 상단 **URL 검사** 창에 입력 → "색인 생성 요청" (하루 요청 한도 있음, 10~15개면 충분)
- 대량 색인은 사이트맵 제출로 충분합니다. 참고: 레포에 IndexNow 제출 스크립트(`scripts/indexnow-submit.ts`)가 있으니 Bing/네이버 계열 즉시 반영에 활용 가능

### 2. 네이버 서치어드바이저

> ⚠️ 현재 코드에는 네이버 확인 코드가 **2개 병기**되어 있습니다 (`7b6c0226…`, `b0fd5fe5…`).
> [searchadvisor.naver.com](https://searchadvisor.naver.com) → 웹마스터 도구에 로그인해 `code-destiny.com`이 어느 계정/코드로 등록돼 있는지 확인하고,
> **유효한 쪽 하나만 남기고** `index.html`과 `app/layout.js`에서 나머지를 제거하세요 (기능상 문제는 없지만 관리 혼선 방지).

#### 2-1. 사이트 등록 & 소유 확인
1. 웹마스터 도구 → 사이트 등록 → `https://code-destiny.com` 입력
2. 소유 확인: "HTML 태그" 선택 → 이미 심어진 `naver-site-verification` 메타와 값이 일치하면 즉시 확인됨. 새 코드가 발급되면 위 1-2-B와 같은 두 곳에 반영
3. www 별칭(`www.code-destiny.com`)도 등록해 두면 통합 리포트에 유리

#### 2-2. 사이트맵 · RSS 제출
- 요청 → 사이트맵 제출: `https://code-destiny.com/sitemap.xml`
- 요청 → RSS 제출: `https://code-destiny.com/rss.xml` (인사이트 최신 글 피드 — 네이버는 RSS를 적극 수집하므로 꼭 제출)

#### 2-3. robots.txt 확인
검증 → robots.txt에서 수집 가능 여부 확인. 현재 `robots.txt`는 `Allow: /` + 관리자/결제 경로 차단 + 사이트맵 1개(`/sitemap.xml`) 명시 상태로 정상이어야 합니다.

#### 2-4. "꿀꿀 운세" 브랜드 검색 노출 개선 팁
- **웹마스터 도구 → 요청 → 웹 페이지 수집**에서 홈 URL 수동 수집 요청 (브랜드 변경 후 재수집 유도)
- 홈 `<title>`과 JSON-LD `WebSite.name`/`alternateName`에 "꿀꿀 운세", "꿀꿀 만세력"이 이미 들어가 있음 — 유지할 것
- 네이버는 **블로그/카페/지식iN 등 자사 생태계 신호**를 브랜드 판단에 크게 반영합니다. 운영 중인 `blog.naver.com/codedestiny`에서 "꿀꿀 운세" 명칭으로 주기적 포스팅 + 본문에 사이트 링크를 넣는 것이 실질적으로 가장 효과가 큽니다
- 네이버 스마트플레이스/모두(modoo) 등록은 해당 없음. 대신 **네이버 서치어드바이저 → 리포트 → 사이트 최적화**에서 "사이트 이름" 인식이 "꿀꿀 운세"로 잡히는지 확인

### 3. Bing Webmaster Tools

1. [bing.com/webmasters](https://www.bing.com/webmasters) 로그인
2. **"GSC에서 가져오기(Import from Google Search Console)"** 클릭 → Google 계정 연동 → 속성 선택
   - 인증·사이트맵이 GSC 설정 그대로 복사되므로 별도 메타태그 불필요
3. 가져오기가 안 될 경우 수동 등록 후 사이트맵 제출

### 4. 다음(카카오) 검색 등록

1. [카카오 검색등록](https://register.search.daum.net/index.daum) 접속
2. "신규 등록하기" → 사이트 URL `https://code-destiny.com` 입력
3. 사이트 소개 문구에 브랜드명 포함: "꿀꿀 운세 — 무료 사주팔자·타로·자미두수·오늘의 운세"
4. 등록 후 심사(보통 5영업일 내외). 다음은 별도 웹마스터 콘솔이 없으므로 등록만으로 완료

### 5. 콘솔별 상태 리포트 확인법

| 확인 항목 | GSC | 네이버 서치어드바이저 |
|----------|-----|----------------------|
| 색인 상태 | 색인 생성 → **페이지** (색인된/제외된 페이지와 사유) | 리포트 → **콘텐츠 수집·색인** |
| 사이트맵 처리 | 색인 생성 → Sitemaps (발견된 URL 수) | 요청 → 사이트맵 제출 내역의 처리 상태 |
| Core Web Vitals | **실험실 아님, 실사용자(CrUX) 기준**: 환경 → 코어 웹 바이탈 | 해당 없음 (Lighthouse로 대체) |
| 모바일 사용성 | 페이지 색인 리포트 내 모바일 오류 항목 | 검증 → 모바일 최적화 |
| 검색 성과(노출/클릭) | 실적 → 검색 결과 (쿼리별 노출·클릭·CTR·순위) | 리포트 → 검색 노출 |

**주기 권장**: 배포 직후 1회 → 1주차에 색인 커버리지 확인 → 이후 격주. "제출된 URL에 noindex 있음" 오류가 나오면 `public/_headers`의 noindex 목록과 `scripts/generate-sitemap.mjs`의 `noindexPathPrefixes`가 어긋난 것이므로 동기화할 것.

### 6. 배포 후 검증 명령·도구

```powershell
# 1) 사이트맵이 정적 종합본으로 서빙되는지 (Worker 인터셉트 해제 확인)
#    → <loc>에 /saju/, /tarot/ 등 랜딩이 보여야 정상. insights만 보이면 Worker/_routes 배포 누락
curl.exe -s https://code-destiny.com/sitemap.xml | Select-String -Pattern "/saju/" -SimpleMatch | Select-Object -First 3

# 2) robots.txt 가 존재하지 않는 사이트맵을 선언하지 않는지 (404 선언은 GSC 가져오기 실패 원인)
curl.exe -s https://code-destiny.com/robots.txt | Select-String -Pattern "sitemap-insights" -SimpleMatch  # 결과 없음 기대

# 3) OG 이미지 (이전에 404였음 — 반드시 확인)
curl.exe -s -o NUL -w "%{http_code}" https://code-destiny.com/og/code-destiny-og.png  # 200 기대

# 4) robots.txt에 사이트맵 1줄(/sitemap.xml)
curl.exe -s https://code-destiny.com/robots.txt

# 5) 레포 내장 SEO 헬스체크
npm run seo:check
```

**웹 도구 검증**:
- 리치 결과 테스트: https://search.google.com/test/rich-results → 홈, `/saju/`, `/insights/` 아무 글, `/oracle/rune/` 입력 (FAQPage·Article·Organization 인식 확인)
- 스키마 검증: https://validator.schema.org
- OG/카톡 미리보기: https://developers.facebook.com/tools/debug + 카카오톡 채팅방에 URL 붙여넣기 (카카오 캐시 초기화: https://developers.kakao.com/tool/debugger/sharing)
- 모바일 친화성: Chrome DevTools Lighthouse (구 Google Mobile-Friendly Test는 2023년 종료됨)
- PageSpeed(CWV): https://pagespeed.web.dev

### 7. 일본(및 다국어) 검색 유입 체크리스트

2026-07 작업으로 다국어 색인이 개방되었습니다 (`SEO_INDEXABLE_LOCALES = ["ko","ja","zh","zh-TW","en"]` — `lib/i18n/locales.ts` 가 정본):
- `/ja/`, `/zh/`, `/en/` 랜딩 셸: 해당 언어 title/description/키워드 + self-canonical + index 상태, 방문 시 자동 언어 전환
- `/ja/ziwei/`, `/ja/sukuyo/`, `/ja/today/`, `/ja/insights/*`: 네이티브 일본어 SSR 페이지, hreflang 상호참조 포함
- 사이트맵에 전 로케일 URL + `xhtml:link` hreflang 포함

**일본 시장 등록 포인트**:
1. **Yahoo! JAPAN은 Google 검색엔진을 사용**하므로 GSC 색인 = Yahoo Japan 노출. 별도 등록 불필요
2. GSC에서 `/ja/` 핵심 URL 5개(위 목록) 수동 색인 요청
3. GSC → 실적 리포트에서 국가 필터 "일본"으로 유입 모니터링. 타겟 키워드: `四柱推命 無料`, `紫微斗数 命盤`, `宿曜占星術 相性`, `今日の運勢`
4. hreflang 검증: GSC URL 검사에서 `/ja/` 페이지가 "색인 생성됨 + 사용자 선언 표준 URL 자체"로 나오는지 확인 (한국어 페이지로 canonical이 넘어가면 배포 누락)
5. Bing Webmaster(일본 점유율 소폭)는 GSC 임포트로 자동 커버

### 8. 인증 코드 플레이스홀더 위치 (요약)

| 파일 | 위치 | 할 일 |
|------|------|------|
| `index.html` (루트) | `naver-site-verification` 메타 2개 아래, 주석 처리된 `google-site-verification` | 주석 해제 + 실제 코드 → `npm run sync:public` |
| `app/layout.js` | `metadata` 객체 내 주석 처리된 `verification.google` | 주석 해제 + 실제 코드 |
| `app/layout.js` / `index.html` | `naver-site-verification` 2개 병기 중 | 서치어드바이저에서 유효 코드 확인 후 하나로 정리 |

> 수정 후 반드시: `npm run sync:public` → 커밋 → PR 머지(머지가 곧 배포). index.html 계열은 Pages 배포만으로 반영된다.

## Google Search Console 실행 체크리스트

작성: 2026-09-08. 코드 수정은 아직 운영 배포가 아니다. GSC 계정에 접속하거나 색인 요청을 제출하지 않았다.

### 배포 후 제출할 사이트맵
- https://code-destiny.com/sitemap.xml
- https://code-destiny.com/sitemap-ko.xml
- https://code-destiny.com/sitemap-ja.xml
- https://code-destiny.com/sitemap-en.xml
- https://code-destiny.com/sitemap-zh.xml
- https://code-destiny.com/sitemap-zh-tw.xml (기존 번체 지원 보존)

기존 `/sitemap.xml`은 전체 URL 목록을 유지한다. 언어별 파일은 같은 canonical URL과 lastmod를 분할한 목록이다. 사이트맵 인덱스로 전환해 기존 CI 소비자를 깨뜨리지 않는다. 같은 URL이 전체 목록과 언어별 목록에 있는 것은 페이지 중복 생성과 다르다. GSC에서는 언어별 파일을 통해 발견·색인 추이를 구분할 수 있다.

### URL 검사와 요청 우선순위
1. `/`, `/ja/`: 실시간 테스트에서 200, robots 접근, 최초 HTML의 title·H1·본문·canonical 확인.
2. `/ja/about/`, `/ja/contact/`, `/ja/disclaimer/`, `/ja/faq/`: 신규 공개 신뢰 페이지의 배포·본문·내부 링크 확인.
3. `/ja/ziwei/`, `/ja/sukuyo/`, `/ja/today/`, `/ja/insights/`: 공통 푸터가 아닌 고유 본문과 같은 언어 이동 확인.
4. `/saju/`, `/ziwei/`, `/sukuyo/`, `/vedic/`, `/astrology/`, `/tarot/`, `/fortune-tea-house/`, `/destiny-compass/`: Google 선택 canonical과 사용자 선언 canonical 대조.
5. en/zh 신뢰 페이지와 주요 번역 페이지도 같은 순서로 확인.

실시간 테스트 성공이 색인 완료를 뜻하지 않는다. 중요한 변경 페이지를 우선 요청하고, 동일 URL을 반복 제출하기보다 마지막 크롤링 날짜와 처리 상태를 기록한다.

### noindex·비공개 점검
- `/admin/`, `/api/`, `/account/`, `/checkout/`, `/payment/`, `/payments/`, 성공·실패·callback·result 및 test/debug 경로는 공개 사이트맵에서 제외한다.
- robots의 Disallow만으로 색인 제거가 보장되지 않는다. 이미 색인된 URL은 응답의 noindex 또는 적절한 HTTP 상태를 Google이 읽을 수 있는지 별도 검토한다. 이 작업에서 결제·인증 접근 정책을 개방하지 않는다.
- staging/preview는 해당 호스트의 robots와 X-Robots-Tag를 확인한다. 운영 도메인의 robots로 다른 호스트를 제어할 수 없다.
- `/fusion-fortune/` 등 기존 개별 noindex는 이유와 공개 콘텐츠를 검토한 후 변경한다. 공개 설명이 존재한다는 이유만으로 잠금/실험 경로를 자동 색인하지 않는다.

### canonical·hreflang 점검
- canonical은 HTTPS 운영 도메인과 기존 후행 슬래시 정규화 규칙을 따른다.
- ko/ja/en/zh/x-default는 같은 콘텐츠의 실제 페이지끼리만 연결한다. 신규 신뢰 페이지는 ko↔ja↔en↔zh 상호참조한다.
- 기존 정책 정본: ko `/privacy/`, `/terms/`, `/refund-policy/`; 외국어 `/{locale}/privacy-policy/`, `terms-of-service/`, `refund-policy/`.
- 짧은 새 정책 별칭은 위 정본을 가리키며 사이트맵에 별도 중복 등록하지 않는다.
- 없는 언어 버전에는 hreflang을 만들지 않는다. 번체 신뢰 페이지가 아직 없는 경우 새 ko/ja/en/zh 묶음에 zh-TW를 임의로 넣지 않는다.

### 확인할 보고서
- 페이지 색인: 발견됨-현재 색인되지 않음, 크롤링됨-현재 색인되지 않음, Google이 다른 표준 페이지 선택, robots 차단, noindex, soft 404, 리디렉션 오류.
- 사이트맵: 가져오기 상태, 마지막 읽은 날짜, 발견 URL 수.
- 검색 실적: 일본/한국/미국 등 국가, 검색어, 페이지, 기기별 노출·클릭·CTR. 수정 전후 기간과 요일 구성을 맞춰 비교한다.
- 크롤링 통계: 호스트 가용성, 5xx/429, HTML·JS·CSS 응답. Cloudflare 봇 차단이 의심되면 서버 로그와 Google URL 검사 결과로 확인한다.
- Core Web Vitals: 현장 데이터와 로컬 Lighthouse 수치는 구분한다.
- 수동 조치·보안 문제 보고서도 확인한다.

### 공식 근거
- [사이트맵 작성](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [언어별 페이지 연결](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [robots 소개](https://developers.google.com/search/docs/crawling-indexing/robots/intro)

승인·색인·순위를 보장하지 않는다. GSC의 실제 제외 사유와 AdSense 거절 문구를 받아야 원인 우선순위를 더 정확하게 정할 수 있다.

## AdSense 재신청 전 체크리스트

작성: 2026-09-08. AdSense 승인을 보장하지 않으며 재신청을 제출하지 않았다.

### 공개 콘텐츠와 탐색
- [ ] 수정된 브랜치가 실제 운영 도메인에 배포되었는지 SHA로 확인.
- [ ] 로그인 없이 홈, 기능 소개, About, Contact, FAQ, 면책, 약관, 개인정보, 환불 문서를 읽을 수 있음.
- [ ] 일본어 방문자가 일본어 신뢰 페이지로 이동 가능. 정적 홈과 React 페이지를 각각 확인.
- [ ] 고유 본문이 모바일에서도 읽히며 공통 푸터로 분량을 채우는 상태가 아님.
- [ ] 로그인·잠금·로딩·오류 화면만 보이는 경로에 광고를 게재하지 않음.
- [ ] 한국어 전용 페이지와 미완성 번역 페이지를 구분하고, 없는 번역 URL을 링크·사이트맵에 넣지 않음.
- [ ] 버튼을 눌렀을 때 현재 페이지로 되돌아오기만 하는 CTA가 없는지 확인.

### 신뢰 정보
- [ ] 운영 주체와 문의 이메일은 기존 `lib/site-policy-config.js` 정본과 일치.
- [ ] 10년 경력은 기존 About의 본인 진술 범위로만 설명. 공인 자격·제3자 인증으로 확대하지 않음.
- [ ] 의료·법률·세무·투자·심리치료·긴급 판단 대체 불가와 결과 미보장을 모든 대상 언어로 안내.
- [ ] 약관·개인정보·환불 조건 및 시행일은 기존 법률 콘텐츠와 동일.
- [ ] 연락처가 실제 수신 가능하고 문의 처리 절차가 운영되고 있는지는 운영자가 확인.
- [ ] 가짜 리뷰·사용자 수·국가 수·평점·검증되지 않은 보안 인증 표현 없음.

기존 ja/en/zh/zh-TW 사전에 있던 10만 사용자·80개국·4.9점·Stripe 인증 등 증거가 확인되지 않은 문구를 중립적인 서비스 안내로 바꿨다. 현재 렌더링에서 사용되는지와 별개로 재사용 시 오인 위험을 줄이는 수정이다. 실제 고객 후기의 진위나 이용자 통계는 확인하지 않았다.

### 기술·정책
- [ ] ads.txt가 정상 응답하고 기존 게시자 레코드가 유지됨.
- [ ] 소유권 검증 메타와 광고 서빙 코드를 구분. 검증 메타가 있다는 이유로 광고가 게재되는 것은 아님.
- [ ] 광고 코드는 기존 DeferredAdsense 및 route policy 경계를 사용. 새 정책·면책 페이지에 임의 삽입하지 않음.
- [ ] 광고 클릭 유도, 본문처럼 보이는 광고, 실수 클릭을 유도하는 배치가 없음.
- [ ] 쿠키·광고 관련 고지는 실제 운영 설정과 일치. 동의 관리 및 지역별 요구사항은 운영 설정과 함께 확인.
- [ ] CSS/JS/이미지가 검색 크롤러에게 열려 있고 주요 URL에서 404/5xx가 없음.
- [ ] 모바일 footer 링크가 가려지지 않고 긴 번역이 가로 넘침을 일으키지 않음.
- [ ] 승인 거절의 실제 메시지를 기록하고 해당 정책 항목과 변경 근거를 대응시킴.

### 남은 범위
전체 12,390건의 하드코딩 후보를 모두 번역 완료했다고 보지 않는다. 한국어 전용 기사·관리자·fixture·보호된 결제 코드가 섞여 있으며 런타임 모달·토스트의 전수 검증도 별도다. 무료·유료 범위나 환불 정책을 콘텐츠 분량 확보를 위해 새로 만들지 않는다.

### 공식 근거
- [광고 게재 준비가 되지 않은 사이트](https://support.google.com/adsense/answer/12176698)
- [사이트 페이지 준비](https://support.google.com/adsense/answer/7299563)
- [AdSense 프로그램 정책](https://support.google.com/adsense/answer/48182)

글자 수나 페이지 개수만으로 승인되는 기준은 없다. 독창성, 실질적인 이용 가치, 탐색성, 정책 준수를 함께 확인해야 한다.
