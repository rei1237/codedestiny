# 📱 `app/` — Next.js App Router (페이지·API·컴포넌트)

> 이 폴더는 Code Destiny의 모든 **페이지, API 엔드포인트, React 컴포넌트**를 포함합니다.

---

## 📂 **폴더 구조**

### **핵심 페이지**
```
page.js              → 🏠 메인 홈 페이지
layout.js            → 🔧 전역 레이아웃 (헤더·푸터)
not-found.js         → ❌ 404 에러 페이지
robots.ts / sitemap.ts → 🔍 SEO (검색엔진 최적화)
```

### **기능별 페이지**
```
saju/                → 📊 사주 분석
  ├── basic/         → 기본 사주
  ├── lifebook/      → 프리미엄 (30,000원)
  ├── love-secret/   → 연애 비책 (30,000원)
  └── sibyl/         → 시빌라 진로 분석 (10,000원)

tarot/               → 🔮 타로 리딩
  ├── mingri/        → 명리학 타로 (3카드 5,000원)
  ├── love/          → 6카드 관계 분석
  ├── healing/       → 4카드 힐링 타로
  └── reunion/       → 5카드 재회운

ziwei/               → 🌟 자미두수
  └── chart/         → 12궁 명반 & 15챕터 분석

oracle/              → 🎯 오라클
  ├── royal-tea/     → 타세오그래피 찻잎 점
  ├── hwatu-life/    → 화투 인생 패
  └── sikojen-povailu/ → 핀란드 주석점

points/              → 💰 원화 결제 (포트원 결제)
login/ signup/       → 🔑 인증
about/ faq/          → 📖 정책 & 가이드
```

### **내부 구조**
```
_content/            → 📝 SEO 텍스트·메타데이터
  └── seo-copy.js    → 모든 페이지의 공유 텍스트

_lib/                → 🔐 라이브러리·모델
  ├── models/        → MongoDB 스키마 (User, PointHistory 등)
  └── callVertexGemini.js → AI 텍스트 생성

components/          → 🎨 React 컴포넌트
  ├── FeatureLandingPage.tsx → 기능 랜딩 페이지 템플릿
  ├── SajuBasicPage.tsx → 사주 기본 페이지
  ├── HPremiumZiweiSection.tsx → 자미두수 UI
  └── SeoJsonLd.tsx  → Schema.org 구조화 데이터

api/                 → 🌐 API 엔드포인트
  ├── tarot/reading  → 타로 리딩 API
  ├── sibyl/report   → 시빌라 리포트
  ├── astro/planets  → 점성술 API
  ├── auth/          → 인증 (OAuth, JWT)
  └── _lib/
      ├── paymentValidation.js → 💳 원화 결제 검증 엔진
      └── legacyApiProxy.js → 레거시 API 호출

[locale]/            → 🌍 다국어 라우팅 (en-us, ja-jp 등)
[adminHash]/[mode]/  → 🛠️ 관리자 패널 (동적)
```

---

## 🎯 **주요 파일 설명**

### **필수 파일**
| 파일 | 역할 |
|------|------|
| `page.js` | 메인 진입점 (렌더링은 `public/static/index.html`로 위임) |
| `layout.js` | 모든 페이지의 기본 구조 (메타, 스타일, 스크립트) |
| `robots.ts` | SEO (robots.txt 생성) |
| `sitemap.ts` | SEO (sitemap.xml 생성) |

### **주요 컴포넌트**
| 컴포넌트 | 용도 |
|---------|------|
| `FeatureLandingPage.tsx` | 모든 기능 랜딩 페이지 (템플릿) |
| `SajuBasicPage.tsx` | 사주 기본 해석 페이지 |
| `HPremiumZiweiSection.tsx` | 자미두수 UI |
| `SeoJsonLd.tsx` | Google Rich Result |

### **API 핵심**
| 엔드포인트 | 기능 |
|----------|------|
| `/api/tarot/reading` | 타로 리딩 (3,000원~10,000원/회, 스프레드별) |
| `/api/sibyl/report` | 시빌라 리포트 (10,000원/회) |
| `/api/auth/[provider]/callback` | OAuth 콜백 |

---

## 💡 **신기능 추가 체크리스트**

```
[ ] app/[feature]/page.tsx 생성
[ ] app/components/에 필요 컴포넌트 추가
[ ] app/_content/seo-copy.js에 메타 텍스트 추가
[ ] API 필요 시 app/api/[feature]/route.js 추가
[ ] public/index.html에 버튼 추가 (필요 시)
[ ] npm run build로 검증
```

---

## 🚀 **빠른 참고**

- **다국어 지원**: `app/[locale]/` 폴더 또는 `app/_content/seo-copy.js`에서 추가
- **결제 연동**: `app/api/_lib/paymentValidation.js`에서 결제 검증 로직 관리
- **메타데이터**: `lib/generate-page-metadata.ts`에서 생성 (경로별 고유 코드)
- **SEO**: `app/_content/seo-copy.js`와 `SeoJsonLd.tsx` 연동

📌 **더 자세히**: [QUICK_START.md](../QUICK_START.md)와 [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) 참고
