# Google Search Console 실행 체크리스트

작성: 2026-09-08. 코드 수정은 아직 운영 배포가 아니다. GSC 계정에 접속하거나 색인 요청을 제출하지 않았다.

## 배포 후 제출할 사이트맵
- https://code-destiny.com/sitemap.xml
- https://code-destiny.com/sitemap-ko.xml
- https://code-destiny.com/sitemap-ja.xml
- https://code-destiny.com/sitemap-en.xml
- https://code-destiny.com/sitemap-zh.xml
- https://code-destiny.com/sitemap-zh-tw.xml (기존 번체 지원 보존)

기존 `/sitemap.xml`은 전체 URL 목록을 유지한다. 언어별 파일은 같은 canonical URL과 lastmod를 분할한 목록이다. 사이트맵 인덱스로 전환해 기존 CI 소비자를 깨뜨리지 않는다. 같은 URL이 전체 목록과 언어별 목록에 있는 것은 페이지 중복 생성과 다르다. GSC에서는 언어별 파일을 통해 발견·색인 추이를 구분할 수 있다.

## URL 검사와 요청 우선순위
1. `/`, `/ja/`: 실시간 테스트에서 200, robots 접근, 최초 HTML의 title·H1·본문·canonical 확인.
2. `/ja/about/`, `/ja/contact/`, `/ja/disclaimer/`, `/ja/faq/`: 신규 공개 신뢰 페이지의 배포·본문·내부 링크 확인.
3. `/ja/ziwei/`, `/ja/sukuyo/`, `/ja/today/`, `/ja/insights/`: 공통 푸터가 아닌 고유 본문과 같은 언어 이동 확인.
4. `/saju/`, `/ziwei/`, `/sukuyo/`, `/vedic/`, `/astrology/`, `/tarot/`, `/fortune-tea-house/`, `/destiny-compass/`: Google 선택 canonical과 사용자 선언 canonical 대조.
5. en/zh 신뢰 페이지와 주요 번역 페이지도 같은 순서로 확인.

실시간 테스트 성공이 색인 완료를 뜻하지 않는다. 중요한 변경 페이지를 우선 요청하고, 동일 URL을 반복 제출하기보다 마지막 크롤링 날짜와 처리 상태를 기록한다.

## noindex·비공개 점검
- `/admin/`, `/api/`, `/account/`, `/checkout/`, `/payment/`, `/payments/`, 성공·실패·callback·result 및 test/debug 경로는 공개 사이트맵에서 제외한다.
- robots의 Disallow만으로 색인 제거가 보장되지 않는다. 이미 색인된 URL은 응답의 noindex 또는 적절한 HTTP 상태를 Google이 읽을 수 있는지 별도 검토한다. 이 작업에서 결제·인증 접근 정책을 개방하지 않는다.
- staging/preview는 해당 호스트의 robots와 X-Robots-Tag를 확인한다. 운영 도메인의 robots로 다른 호스트를 제어할 수 없다.
- `/fusion-fortune/` 등 기존 개별 noindex는 이유와 공개 콘텐츠를 검토한 후 변경한다. 공개 설명이 존재한다는 이유만으로 잠금/실험 경로를 자동 색인하지 않는다.

## canonical·hreflang 점검
- canonical은 HTTPS 운영 도메인과 기존 후행 슬래시 정규화 규칙을 따른다.
- ko/ja/en/zh/x-default는 같은 콘텐츠의 실제 페이지끼리만 연결한다. 신규 신뢰 페이지는 ko↔ja↔en↔zh 상호참조한다.
- 기존 정책 정본: ko `/privacy/`, `/terms/`, `/refund-policy/`; 외국어 `/{locale}/privacy-policy/`, `terms-of-service/`, `refund-policy/`.
- 짧은 새 정책 별칭은 위 정본을 가리키며 사이트맵에 별도 중복 등록하지 않는다.
- 없는 언어 버전에는 hreflang을 만들지 않는다. 번체 신뢰 페이지가 아직 없는 경우 새 ko/ja/en/zh 묶음에 zh-TW를 임의로 넣지 않는다.

## 확인할 보고서
- 페이지 색인: 발견됨-현재 색인되지 않음, 크롤링됨-현재 색인되지 않음, Google이 다른 표준 페이지 선택, robots 차단, noindex, soft 404, 리디렉션 오류.
- 사이트맵: 가져오기 상태, 마지막 읽은 날짜, 발견 URL 수.
- 검색 실적: 일본/한국/미국 등 국가, 검색어, 페이지, 기기별 노출·클릭·CTR. 수정 전후 기간과 요일 구성을 맞춰 비교한다.
- 크롤링 통계: 호스트 가용성, 5xx/429, HTML·JS·CSS 응답. Cloudflare 봇 차단이 의심되면 서버 로그와 Google URL 검사 결과로 확인한다.
- Core Web Vitals: 현장 데이터와 로컬 Lighthouse 수치는 구분한다.
- 수동 조치·보안 문제 보고서도 확인한다.

## 공식 근거
- [사이트맵 작성](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [언어별 페이지 연결](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [robots 소개](https://developers.google.com/search/docs/crawling-indexing/robots/intro)

승인·색인·순위를 보장하지 않는다. GSC의 실제 제외 사유와 AdSense 거절 문구를 받아야 원인 우선순위를 더 정확하게 정할 수 있다.
