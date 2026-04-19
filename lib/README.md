# 📚 `lib/` — 공유 라이브러리 & 유틸

> 이 폴더는 **전체 앱에서 사용되는 공유 함수, 상수, 타입**을 포함합니다.

---

## 📂 **구조**

```
generate-page-metadata.ts           → 📝 SEO 메타데이터 생성
seo-metadata.ts                     → 🔍 SEO 설정·키워드
seo-site-urls.ts                    → 🌐 사이트맵 URL 목록

... (유틸, 헬퍼, 모델 등)
```

---

## 🎯 **핵심 모듈**

### **1. generate-page-metadata.ts** ⭐
```typescript
// 모든 페이지의 메타데이터를 생성하는 중앙 함수
export function generatePageMetadata(opts: FortunePageMeta) {
  return {
    title, description, keywords, // 기본
    openGraph: { ... },           // SNS 공유
    twitter: { ... },             // 트위터
    robots: { ... },              // 검색엔진
    alternates: { canonical, ... } // 다국어
  }
}
```

**사용 예**:
```typescript
// app/about/page.js
export function generateMetadata() {
  return generatePageMetadata({
    path: "/about",
    title: "서비스 소개",
    description: "Code Destiny 소개 페이지"
  });
}
```

### **2. seo-metadata.ts**
```typescript
export const SEO_CORE_KEYWORDS = [
  "사주", "무료사주", "타로", "점성술",
  // ... (기본 키워드)
];

export const SITE_ORIGIN = "https://code-destiny.com";
```

### **3. seo-site-urls.ts**
```typescript
// 사이트맵 생성용 모든 URL 목록
export const SITE_URLS = [
  "/",
  "/saju/basic",
  "/tarot/mingri",
  "/ziwei/chart",
  // ... (전체 라우트)
];
```

---

## 💾 **주요 유틸 함수**

### **메타데이터 병합**
```typescript
export function mergeKeywords(
  pageKeywords: string[],
  coreKeywords: string[]
): string[]
```

### **절대 URL 생성**
```typescript
export function toAbsoluteUrl(path: string): string
// 예: "/about" → "https://code-destiny.com/about"
```

### **로케일 정규화**
```typescript
export function normalizeLocale(locale: string): string
// 예: "en-US" → "en-us"
```

---

## 🌍 **다국어 메타데이터**

### **로케일 맵**
```typescript
const LOCALE_MAP = {
  ko: { slug: "", hrefLang: "ko" },
  en: { slug: "/en-us", hrefLang: "en" },
  ja: { slug: "/ja-jp", hrefLang: "ja" },
  // ... (9개 언어)
};
```

### **메타데이터 다국어 지원**
```typescript
// 경로별 고유 메타 코드 생성
buildRouteMetaCode(path, variantKey, language)
// 예: "home__ko-kr" → 중복 감지 방지
```

---

## 📐 **TypeScript 타입**

### **FortunePageMeta**
```typescript
interface FortunePageMeta {
  path: string;              // 페이지 경로
  title: string;             // 페이지 제목
  description: string;       // 설명
  keywords?: string[];       // 검색 키워드
  image?: string;            // OG 이미지
  updatedAt?: string;        // 수정 날짜
  inLanguage?: string;       // 언어 코드
  variantKey?: string;       // 변형 식별 키
}
```

---

## 🚀 **사용 패턴**

### **기본 사용**
```typescript
// app/about/page.js
export function generateMetadata() {
  return generatePageMetadata({
    path: "/about",
    title: "서비스 소개",
    description: "Code Destiny에 대해 알아보세요"
  });
}
```

### **고급 사용 (다국어 + 변형)**
```typescript
export function generateMetadata() {
  return generatePageMetadata({
    path: "/insights/[slug]",
    title: "인사이트 — ${article.title}",
    description: article.summary,
    variantKey: article.updatedAt,  // 변형 식별
    inLanguage: "ko-KR"
  });
}
```

### **구조화 데이터**
```typescript
// Schema.org JSON-LD 생성
export function buildFortuneJsonLd(opts: FortunePageMeta): string
```

---

## 📋 **SEO 체크리스트**

```
[ ] 페이지 생성 시 generatePageMetadata() 사용
[ ] 고유 title & description 작성
[ ] 핵심 keywords 3-5개 추가
[ ] OG 이미지 지정 (SNS 공유용)
[ ] 다국어 경로면 inLanguage 지정
[ ] 이미지 있으면 og:image 추가
[ ] npm run build로 검증
```

---

## 🔍 **검증 방법**

### **메타데이터 확인**
```bash
# 빌드 후 생성된 metadata 확인
npm run build
cat .next/server/app/[route]/page.js | grep -A 10 metadata
```

### **SEO 도구로 검증**
```
1. Google Search Console
   └─ 구조화 데이터 검증
   
2. Twitter Card Validator
   └─ https://card-validator.twitter.com
   
3. Open Graph Preview
   └─ 링크 미리보기 확인
```

---

## 💡 **주요 기능**

### **🔑 고유 메타 코드**
```typescript
// 같은 경로 내 query 변형을 구분
routeMetaCode = "home__topic-all__ko-kr"
uniqueTitle = "운세 FAQ [route:home__topic-all__ko-kr]"
```

**목적**:
- 검색엔진이 같은 경로 내 변형 페이지 감지
- 중복 콘텐츠 페널티 방지
- 각 변형에 고유 메타데이터 부여

### **🌐 Hreflang 링크**
```html
<!-- 다국어 버전 자동 생성 -->
<link rel="alternate" hreflang="ko" href="https://code-destiny.com/">
<link rel="alternate" hreflang="en" href="https://code-destiny.com/en-us">
<link rel="alternate" hreflang="ja" href="https://code-destiny.com/ja-jp">
<!-- ... (모든 언어) -->
```

---

## 🎯 **수정 & 배포**

### **메타데이터 수정**
```typescript
// lib/generate-page-metadata.ts 수정
export const SEO_CORE_KEYWORDS = [
  "사주", "...", "새로운키워드" // ← 추가
];
```

### **페이지 메타 업데이트**
```typescript
// app/[feature]/page.tsx
export function generateMetadata() {
  return generatePageMetadata({
    title: "새 제목",  // ← 수정
    description: "새 설명"
  });
}
```

### **배포**
```bash
npm run build
git add -- lib/generate-page-metadata.ts app/[feature]/page.tsx
git commit -m "fix: update metadata"
git push origin main
```

---

## 📚 **더 알아보기**

- **Schema.org 마크업**: https://schema.org/docs/schema_org_in_ld_json.html
- **OG 태그 가이드**: https://ogp.me/
- **Google Search Central**: https://developers.google.com/search
- **프로젝트 SEO 전략**: [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md)

---

## 🚀 **빠른 체크리스트**

```
신규 페이지 생성 시:
[ ] 1. app/[feature]/page.tsx 생성
[ ] 2. generatePageMetadata() 호출
[ ] 3. 고유 title/description 작성
[ ] 4. npm run build 검증
[ ] 5. git push 배포
```

📖 **더 자세히**: [QUICK_START.md](../QUICK_START.md)
