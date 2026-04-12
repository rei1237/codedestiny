# AdSense 1단계 콘텐츠 아키텍처 (2026-04-13)

목표: 툴 중심 사이트를 콘텐츠 중심 플랫폼으로 전환해 AdSense 승인 가능성을 높인다.

## 1) 플랫폼 콘텐츠 구조

### A. Blog (발견형 트래픽)
- 목적: 최신 이슈, 시즌성 키워드, 트렌드형 검색 유입 확보
- URL 베이스: `/insights/blog`
- 포맷: 800~1500자(권장 1200~1800단어)

### B. Guides (고의도 검색 트래픽)
- 목적: "~하는 법" 중심의 문제 해결형 콘텐츠
- URL 베이스: `/insights/guides`
- 포맷: 1200~2500단어

### C. Educational Content (학습형 허브)
- 목적: 주제별 기초/심화 학습 동선 구축
- URL 베이스: `/insights/academy`
- 포맷: Pillar 2000+단어 + Supporting 800~1500단어

### D. Case Studies (신뢰도/경험 증명)
- 목적: 실제 사용 맥락, 전/후 비교, 해석 적용 사례 제시
- URL 베이스: `/insights/case-studies`
- 포맷: 1000~2000단어

## 2) 메인 기능별 10+ 아티클 구조

요구사항 충족 기준:
- fortune 12개
- saju 12개
- tarot 12개
- 총 36개 이상

### 2-1. Fortune 관련 아티클 (12)
1. `/insights/guides/fortune/how-to-read-daily-fortune-without-anxiety`
2. `/insights/guides/fortune/weekly-fortune-planning-template`
3. `/insights/guides/fortune/monthly-fortune-review-framework`
4. `/insights/blog/fortune/5-signs-your-luck-pattern-is-changing`
5. `/insights/blog/fortune/why-daily-fortune-feels-wrong-sometimes`
6. `/insights/academy/fortune/fortune-terminology-beginner-dictionary`
7. `/insights/academy/fortune/luck-vs-decision-making-model`
8. `/insights/case-studies/fortune/case-study-job-change-timing`
9. `/insights/case-studies/fortune/case-study-relationship-recovery`
10. `/insights/guides/fortune/good-date-selection-practical-checklist`
11. `/insights/blog/fortune/fortune-journaling-for-better-decisions`
12. `/insights/academy/fortune/common-fortune-reading-mistakes`

### 2-2. Saju 관련 아티클 (12)
1. `/insights/guides/saju/saju-reading-step-by-step-for-beginners`
2. `/insights/guides/saju/how-to-read-manseoryeok-correctly`
3. `/insights/academy/saju/four-pillars-core-concepts`
4. `/insights/academy/saju/ten-heavenly-stems-practical-meaning`
5. `/insights/academy/saju/twelve-earthly-branches-seasonal-logic`
6. `/insights/academy/saju/ten-gods-in-love-work-money`
7. `/insights/guides/saju/yongshin-thinking-framework`
8. `/insights/blog/saju/saju-myths-that-hurt-beginners`
9. `/insights/blog/saju/how-to-use-yearly-fortune-without-fear`
10. `/insights/case-studies/saju/case-study-career-pivot-with-daewoon`
11. `/insights/case-studies/saju/case-study-couple-conflict-pattern`
12. `/insights/guides/saju/monthly-saju-journal-template`

### 2-3. Tarot 관련 아티클 (12)
1. `/insights/guides/tarot/how-to-start-tarot-reading-at-home`
2. `/insights/academy/tarot/major-arcana-story-framework`
3. `/insights/academy/tarot/minor-arcana-suits-and-real-life`
4. `/insights/guides/tarot/3-card-spread-for-daily-questions`
5. `/insights/guides/tarot/love-tarot-questions-that-actually-help`
6. `/insights/blog/tarot/why-tarot-readings-feel-inaccurate`
7. `/insights/blog/tarot/tarot-journal-method-for-beginners`
8. `/insights/academy/tarot/reversed-card-interpretation-guide`
9. `/insights/case-studies/tarot/case-study-anxiety-to-clarity`
10. `/insights/case-studies/tarot/case-study-breakup-recovery-reading`
11. `/insights/guides/tarot/career-tarot-decision-framework`
12. `/insights/academy/tarot/ethical-tarot-reading-principles`

## 3) 카테고리 체계 (요구사항 반영)

고정 카테고리:
- Love / Relationship
- Wealth / Career
- Personality / Destiny
- Daily Fortune

URL 패턴:
- `/insights/category/love-relationship`
- `/insights/category/wealth-career`
- `/insights/category/personality-destiny`
- `/insights/category/daily-fortune`

## 4) 카테고리별 Pillar + Supporting 구성

### 4-1. Love / Relationship
- Pillar (2000+): `/insights/category/love-relationship/love-relationship-pillar-guide`
- Supporting (800~1500):
  - `/insights/guides/saju/saju-compatibility-beyond-score`
  - `/insights/guides/tarot/relationship-spread-5-questions`
  - `/insights/blog/fortune/relationship-timing-vs-communication`
  - `/insights/case-studies/saju/case-study-couple-conflict-pattern`
  - `/insights/case-studies/tarot/case-study-breakup-recovery-reading`
  - `/insights/blog/tarot/love-reading-common-biases`

### 4-2. Wealth / Career
- Pillar (2000+): `/insights/category/wealth-career/wealth-career-pillar-guide`
- Supporting (800~1500):
  - `/insights/guides/fortune/good-date-selection-practical-checklist`
  - `/insights/guides/saju/career-pivot-timing-with-daewoon`
  - `/insights/guides/tarot/career-tarot-decision-framework`
  - `/insights/blog/saju/how-to-use-yearly-fortune-without-fear`
  - `/insights/case-studies/fortune/case-study-job-change-timing`
  - `/insights/case-studies/saju/case-study-career-pivot-with-daewoon`

### 4-3. Personality / Destiny
- Pillar (2000+): `/insights/category/personality-destiny/personality-destiny-pillar-guide`
- Supporting (800~1500):
  - `/insights/academy/saju/four-pillars-core-concepts`
  - `/insights/academy/saju/ten-gods-in-love-work-money`
  - `/insights/academy/tarot/major-arcana-story-framework`
  - `/insights/academy/fortune/luck-vs-decision-making-model`
  - `/insights/blog/saju/saju-myths-that-hurt-beginners`
  - `/insights/blog/tarot/why-tarot-readings-feel-inaccurate`

### 4-4. Daily Fortune
- Pillar (2000+): `/insights/category/daily-fortune/daily-fortune-pillar-guide`
- Supporting (800~1500):
  - `/insights/guides/fortune/how-to-read-daily-fortune-without-anxiety`
  - `/insights/guides/fortune/weekly-fortune-planning-template`
  - `/insights/guides/fortune/monthly-fortune-review-framework`
  - `/insights/blog/fortune/fortune-journaling-for-better-decisions`
  - `/insights/guides/tarot/3-card-spread-for-daily-questions`
  - `/insights/guides/saju/monthly-saju-journal-template`

## 5) URL 구조 표준

기본 규칙:
- 영어 소문자 + 하이픈 slug
- 한 페이지 1개 검색 의도(primary intent)
- URL 깊이 2~4단계 유지

정규 패턴:
- Hub: `/insights`
- Section Index: `/insights/blog`, `/insights/guides`, `/insights/academy`, `/insights/case-studies`
- Feature Index: `/insights/{section}/{feature}`
- Article: `/insights/{section}/{feature}/{slug}`
- Category Index: `/insights/category/{category-slug}`
- Category Pillar: `/insights/category/{category-slug}/{pillar-slug}`

## 6) 카테고리 계층 (Hierarchy)

- Insights Hub
- Blog
- Guides
- Academy
- Case Studies
- Category
- Love / Relationship
- Wealth / Career
- Personality / Destiny
- Daily Fortune
- Feature
- Fortune
- Saju
- Tarot

## 7) 편집 우선순위 (실행 순서)

1. Category Pillar 4개 먼저 발행 (각 2000+단어)
2. 메인 기능별 10+ 아티클 충족 (fortune/saju/tarot 각 10개 이상)
3. Case Studies 6개 이상 확보
4. 내부링크 강화 (Pillar -> Supporting, Supporting -> Tool 페이지)
5. 최종적으로 sitemap, rss, 내부 허브 페이지 반영

## 8) AdSense 관점 최소 체크

- 얇은 페이지(단문) 비율 축소
- 검색 의도별 독립 문서 확보
- 광고보다 본문 비중 우선
- 작성자/업데이트일/근거 출처 노출
- 카테고리 허브 및 탐색 동선 명확화
