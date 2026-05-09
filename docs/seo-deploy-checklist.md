# SEO 배포 체크리스트 (Google · Naver · Bing)

## 1) 배포 전 로컬 검증

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm run sitemap:generate`
5. `npm run seo:audit -- --base https://code-destiny.com`

## 2) 필수 URL 점검

- 홈: `/`
- 핵심 랜딩: `/saju`, `/ziwei/chart`, `/astrology/cosmic`, `/sukuyo/compatibility`, `/physiognomy`
- 인사이트 허브: `/insights`
- 인사이트 카테고리 허브: `/insights/saju`, `/insights/ziwei`, `/insights/sukuyo`, `/insights/tarot`, `/insights/astrology`, `/insights/vedic`, `/insights/dream`, `/insights/compatibility`

검사 기준:

- HTTP 200
- canonical 1개
- title/description/H1 존재
- OG/Twitter/JSON-LD 존재
- 공개 페이지 noindex 금지

## 3) robots / sitemap / redirect 확인

1. `https://code-destiny.com/robots.txt`가 200인지 확인
2. `https://code-destiny.com/sitemap.xml`이 200인지 확인
3. robots에서 아래 경로 disallow 확인
   - `/admin/`
   - `/me/`
   - `/mypage/private/`
4. 레거시 경로 redirect 확인
   - `/sukyo` -> `/sukuyo`
   - `/face-reading` -> `/physiognomy`

## 4) 검색엔진 제출

### Google Search Console

1. 사이트맵 제출: `https://code-destiny.com/sitemap.xml`
2. URL 검사로 핵심 페이지 즉시 색인 요청
3. 커버리지/개선 보고서 확인

### Naver Search Advisor

1. 사이트 등록 + 소유 확인
2. 사이트맵 제출: `https://code-destiny.com/sitemap.xml`
3. robots/수집 상태 점검

### Bing Webmaster Tools

1. 사이트 등록 + 소유 확인
2. 사이트맵 제출: `https://code-destiny.com/sitemap.xml`
3. URL 검사로 핵심 랜딩 크롤링 요청

## 5) 7/14/30일 운영 추적

### Day 7

- 핵심 URL 색인 여부 확인
- `/insights` 인덱스 커버리지 확인
- 브랜드 키워드 노출 확인

### Day 14

- 자미두수/숙요점 롱테일 유입 쿼리 확인
- CTR 낮은 페이지 title/description 개선
- 내부링크 클릭 동선 점검

### Day 30

- 카테고리 허브별 유입/체류/이탈 비교
- 노출 대비 클릭 저조 페이지 재작성
- 신규 인사이트 발행 계획 업데이트

## 6) 장애 대응

- `/insights` 글 수 0으로 보이면 즉시 배포 롤백 또는 seed 데이터/SSR 경로 점검
- sitemap 누락 발생 시 `npm run sitemap:generate` 재실행 후 재배포
- canonical 충돌 발생 시 해당 페이지 metadata 우선 수정
