# Phase 8 — 내부 링크 구조 & 사이트 아키텍처 구현 완료

## P8-0: 현재 내부 링크 현황 파악 ✓
- 서비스 독립 페이지: `app/[adminHash]/[mode]/page.js` (라우트: `/tarot/healing` 등)
- Insights 포스트: `app/insights/[slug]/page.js` 
- 메인 페이지: `app/page.js` (레거시 HTML 기반)

## P8-A: 서비스 독립 페이지 — 관련 서비스 링크 추가 ✓

### 1. serviceMap.js 수정
- `cardTitle` 필드 추가 (모든 서비스에 추가)
- `related` 필드 추가 (주요 12개 서비스 추가):
  - tarot/healing, tarot/solar, tarot/mingri, tarot/love
  - saju/basic
  - astrology/cosmic, ziwei/chart
  - animal/physio, animal/mbti, animal/totem
  - vedic/jyotish(예정)

### 2. RelatedServices.js 컴포넌트 생성
- 위치: `app/components/RelatedServices.js`
- 기능:
  - `SERVICE_MAP[currentSlug].related` 참조
  - 관련 서비스 카드 표시
  - 상위 3개 서비스만 표시
  - `related` 없으면 자동 숨김

### 3. app/[adminHash]/[mode]/page.js 수정
```javascript
import RelatedServices from "../../components/RelatedServices";
... 
<ServiceComponent service={service} />
<RelatedServices currentSlug={slug} />  // ← 추가됨
```

## P8-B: Insights 포스트 → 서비스 CTA 링크 ✓

### 1. articles.js 수정
포스트 데이터에 `relatedService` 필드 추가:
```javascript
{
  slug: "saju-four-pillars-basics",
  title: "사주 명리학 기초",
  // ...
  relatedService: "saju/basic",  // ← 추가됨
  // ...
}
```

### 2. ServiceCTA.js 컴포넌트 생성
- 위치: `app/components/ServiceCTA.js`
- 기능:
  - `article.relatedService` 참조
  - 서비스 링크 CTA 버튼 표시
  - `relatedService` 없으면 자동 숨김

### 3. InsightArticleCosmicClient.js 수정
```javascript
import ServiceCTA from "../../components/ServiceCTA";
...
{article.relatedService && <ServiceCTA slug={article.relatedService} />}  // ← 추가됨
```

## P8-C: 브레드크럼 네비게이션 & JSON-LD ✓

### 1. Breadcrumb.js 컴포넌트 생성
- 위치: `app/components/Breadcrumb.js`
- 기능:
  - Schema.org `BreadcrumbList` 구조 포함
  - Google Rich Results 지원
  - 현재 페이지는 링크 없음

### 2. SECTION_LABELS 추가
serviceMap.js에 섹션별 라벨 정의:
```javascript
export const SECTION_LABELS = {
  tarot: '타로 리딩',
  oracle: '신탁 & 점술',
  astrology: '점성술',
  ziwei: '자미두수',
  animal: '동물 & 관상',
  saju: '사주',
  vedic: '베다',
  flower: '운명의 꽃',
  dream: '해몽',
};
```

### 3. 서비스 페이지 Breadcrumb 추가
app/[adminHash]/[mode]/page.js:
```javascript
const breadcrumbItems = [
  { label: '홈', href: '/' },
  { label: SECTION_LABELS[slugParts[0]], href: '/' },
  { label: service.cardTitle, href: `/${slug}` },
];

<Breadcrumb items={breadcrumbItems} />  // ← 추가됨
```

### 4. Insights 포스트 Breadcrumb 추가
InsightArticleCosmicClient.js:
```javascript
const breadcrumbItems = [
  { label: '홈', href: '/' },
  { label: 'Insights', href: '/insights' },
  { label: article.category, href: `/insights?topic=${article.category}` },
  { label: article.title, href: `/insights/${article.slug}` },
];

<Breadcrumb items={breadcrumbItems} />  // ← 추가됨
```

## 검증 항목

### P8-A 검증
- [ ] `/tarot/healing` 하단에 관련 서비스 섹션 표시
- [ ] 관련 서비스 링크 클릭 → 해당 페이지 정상 이동
- [ ] `related` 없는 서비스 → 섹션 미표시
- [ ] 기존 서비스 기능 영향 없음

### P8-B 검증
- [ ] 사주팔자 포스트 하단에 사주 서비스 CTA 표시
- [ ] CTA 링크 클릭 → 서비스 페이지 이동
- [ ] `relatedService` 없는 포스트 → CTA 미표시

### P8-C 검증
- [ ] `/tarot/healing` → 홈 > 타로 리딩 > 따뜻한 태양 회복 타로 표시
- [ ] Breadcrumb 링크 클릭 정상 이동
- [ ] Google Rich Results Test 통과
  - https://search.google.com/test/rich-results

---

## 파일 요약

생성/수정 파일:
1. `app/components/RelatedServices.js` (생성)
2. `app/components/ServiceCTA.js` (생성)
3. `app/components/Breadcrumb.js` (생성)
4. `app/_lib/serviceMap.js` (수정: cardTitle, related, SECTION_LABELS 추가)
5. `app/[adminHash]/[mode]/page.js` (수정: import 추가, Breadcrumb/RelatedServices 추가)
6. `app/insights/articles.js` (수정: relatedService 필드 추가)
7. `app/insights/[slug]/InsightArticleCosmicClient.js` (수정: Breadcrumb, ServiceCTA 추가)
