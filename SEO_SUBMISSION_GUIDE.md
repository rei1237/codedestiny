# 검색엔진 등록 & 검증 가이드 — code-destiny.com (꿀꿀 운세)

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

---

## 1. Google Search Console (GSC)

### 1-1. 속성 등록 — 도메인 vs URL 접두어

| 방식 | 커버 범위 | 인증 방법 | 권장 |
|------|----------|----------|:---:|
| **도메인 속성** (`code-destiny.com`) | http/https, www 유무, 서브도메인(music. 등) 전부 | **DNS TXT 레코드만 가능** | ✅ 권장 |
| URL 접두어 (`https://code-destiny.com/`) | 해당 프로토콜+호스트만 | HTML 태그/파일, DNS 등 다양 | 보조용 |

도메인 속성을 권장합니다 — `music.code-destiny.com`(음원 CDN) 등 서브도메인 트래픽까지 한 속성에서 보입니다.

### 1-2. 인증

**방법 A — DNS TXT (도메인 속성, 권장)**
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

### 1-3. 사이트맵 제출
GSC → 색인 생성 → Sitemaps에서 아래 하나를 제출:
```
https://code-destiny.com/sitemap.xml
```

### 1-4. 색인 요청
- 핵심 페이지(홈, /saju, /tarot, /ziwei, /insights 등)는 상단 **URL 검사** 창에 입력 → "색인 생성 요청" (하루 요청 한도 있음, 10~15개면 충분)
- 대량 색인은 사이트맵 제출로 충분합니다. 참고: 레포에 IndexNow 제출 스크립트(`scripts/indexnow-submit.ts`)가 있으니 Bing/네이버 계열 즉시 반영에 활용 가능

---

## 2. 네이버 서치어드바이저

> ⚠️ 현재 코드에는 네이버 확인 코드가 **2개 병기**되어 있습니다 (`7b6c0226…`, `b0fd5fe5…`).
> [searchadvisor.naver.com](https://searchadvisor.naver.com) → 웹마스터 도구에 로그인해 `code-destiny.com`이 어느 계정/코드로 등록돼 있는지 확인하고,
> **유효한 쪽 하나만 남기고** `index.html`과 `app/layout.js`에서 나머지를 제거하세요 (기능상 문제는 없지만 관리 혼선 방지).

### 2-1. 사이트 등록 & 소유 확인
1. 웹마스터 도구 → 사이트 등록 → `https://code-destiny.com` 입력
2. 소유 확인: "HTML 태그" 선택 → 이미 심어진 `naver-site-verification` 메타와 값이 일치하면 즉시 확인됨. 새 코드가 발급되면 위 1-2-B와 같은 두 곳에 반영
3. www 별칭(`www.code-destiny.com`)도 등록해 두면 통합 리포트에 유리

### 2-2. 사이트맵 · RSS 제출
- 요청 → 사이트맵 제출: `https://code-destiny.com/sitemap.xml`
- 요청 → RSS 제출: `https://code-destiny.com/rss.xml` (인사이트 최신 글 피드 — 네이버는 RSS를 적극 수집하므로 꼭 제출)

### 2-3. robots.txt 확인
검증 → robots.txt에서 수집 가능 여부 확인. 현재 `robots.txt`는 `Allow: /` + 관리자/결제 경로 차단 + 사이트맵 1개(`/sitemap.xml`) 명시 상태로 정상이어야 합니다.

### 2-4. "꿀꿀 운세" 브랜드 검색 노출 개선 팁
- **웹마스터 도구 → 요청 → 웹 페이지 수집**에서 홈 URL 수동 수집 요청 (브랜드 변경 후 재수집 유도)
- 홈 `<title>`과 JSON-LD `WebSite.name`/`alternateName`에 "꿀꿀 운세", "꿀꿀 만세력"이 이미 들어가 있음 — 유지할 것
- 네이버는 **블로그/카페/지식iN 등 자사 생태계 신호**를 브랜드 판단에 크게 반영합니다. 운영 중인 `blog.naver.com/codedestiny`에서 "꿀꿀 운세" 명칭으로 주기적 포스팅 + 본문에 사이트 링크를 넣는 것이 실질적으로 가장 효과가 큽니다
- 네이버 스마트플레이스/모두(modoo) 등록은 해당 없음. 대신 **네이버 서치어드바이저 → 리포트 → 사이트 최적화**에서 "사이트 이름" 인식이 "꿀꿀 운세"로 잡히는지 확인

---

## 3. Bing Webmaster Tools

1. [bing.com/webmasters](https://www.bing.com/webmasters) 로그인
2. **"GSC에서 가져오기(Import from Google Search Console)"** 클릭 → Google 계정 연동 → 속성 선택
   - 인증·사이트맵이 GSC 설정 그대로 복사되므로 별도 메타태그 불필요
3. 가져오기가 안 될 경우 수동 등록 후 사이트맵 제출

---

## 4. 다음(카카오) 검색 등록

1. [카카오 검색등록](https://register.search.daum.net/index.daum) 접속
2. "신규 등록하기" → 사이트 URL `https://code-destiny.com` 입력
3. 사이트 소개 문구에 브랜드명 포함: "꿀꿀 운세 — 무료 사주팔자·타로·자미두수·오늘의 운세"
4. 등록 후 심사(보통 5영업일 내외). 다음은 별도 웹마스터 콘솔이 없으므로 등록만으로 완료

---

## 5. 콘솔별 상태 리포트 확인법

| 확인 항목 | GSC | 네이버 서치어드바이저 |
|----------|-----|----------------------|
| 색인 상태 | 색인 생성 → **페이지** (색인된/제외된 페이지와 사유) | 리포트 → **콘텐츠 수집·색인** |
| 사이트맵 처리 | 색인 생성 → Sitemaps (발견된 URL 수) | 요청 → 사이트맵 제출 내역의 처리 상태 |
| Core Web Vitals | **실험실 아님, 실사용자(CrUX) 기준**: 환경 → 코어 웹 바이탈 | 해당 없음 (Lighthouse로 대체) |
| 모바일 사용성 | 페이지 색인 리포트 내 모바일 오류 항목 | 검증 → 모바일 최적화 |
| 검색 성과(노출/클릭) | 실적 → 검색 결과 (쿼리별 노출·클릭·CTR·순위) | 리포트 → 검색 노출 |

**주기 권장**: 배포 직후 1회 → 1주차에 색인 커버리지 확인 → 이후 격주. "제출된 URL에 noindex 있음" 오류가 나오면 `public/_headers`의 noindex 목록과 `scripts/generate-sitemap.mjs`의 `noindexPathPrefixes`가 어긋난 것이므로 동기화할 것.

---

## 6. 배포 후 검증 명령·도구

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

---

## 7. 일본(및 다국어) 검색 유입 체크리스트

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

---

## 8. 인증 코드 플레이스홀더 위치 (요약)

| 파일 | 위치 | 할 일 |
|------|------|------|
| `index.html` (루트) | `naver-site-verification` 메타 2개 아래, 주석 처리된 `google-site-verification` | 주석 해제 + 실제 코드 → `npm run sync:public` |
| `app/layout.js` | `metadata` 객체 내 주석 처리된 `verification.google` | 주석 해제 + 실제 코드 |
| `app/layout.js` / `index.html` | `naver-site-verification` 2개 병기 중 | 서치어드바이저에서 유효 코드 확인 후 하나로 정리 |

> 수정 후 반드시: `npm run sync:public` → 커밋 → PR 머지(머지가 곧 배포). index.html 계열은 Pages 배포만으로 반영된다.
