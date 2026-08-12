# 📦 Code Destiny — 프로젝트 구조 & 기능 맵

**프로젝트명**: Code Destiny (꿀꿀 만세력)  
**기술 스택**: Next.js 15 (App Router) + TypeScript + Node.js  
**배포 환경**: Cloudflare Pages + Workers  
**생성 일자**: 2026-04-19

---

## 🏗️ 디렉터리 구조 (기능별)

### 📱 **메인 웹 앱 (Next.js App Router)**
```
app/
├── page.js                          # 🏠 홈 페이지 (메인 서비스)
├── layout.js                        # 🔧 전역 레이아웃 (헤더, 푸터)
├── not-found.js                     # ❌ 404 에러 페이지
├── robots.ts / sitemap.ts           # 🔍 SEO (robots.txt, sitemap.xml 생성)
│
├── _content/                        # 📝 SEO 콘텐츠 & 메타데이터
│   └── seo-copy.js                  # 정적 텍스트 (FAQ, 소개, 가이드)
│
├── _lib/                            # 🔐 내부 라이브러리
│   ├── models/                      # MongoDB 스키마
│   │   ├── UserModel.js
│   │   └── PointHistoryModel.js
│   └── adminAccess.js              # 관리자 권한 검증
│
├── api/                             # 🌐 API 엔드포인트
│   ├── tarot/reading                # 타로 리딩 API
│   ├── sibyl/report                 # 시빌라 리포트 (10,000원)
│   ├── astro/planets                # 점성술 행성 API
│   ├── auth/                        # 인증 (OAuth, JWT)
│   └── _lib/
│       ├── paymentValidation.js     # 💳 코인 검증 & 차감 엔진
│       └── legacyApiProxy.js        # 레거시 API 호출
│
├── components/                      # 🎨 React 컴포넌트
│   ├── FeatureLandingPage.tsx       # 기능별 랜딩 페이지 템플릿
│   ├── SajuBasicPage.tsx            # 사주 기본 페이지
│   ├── HPremiumZiweiSection.tsx     # 프리미염 자미두수 섹션
│   ├── SeoJsonLd.tsx                # Schema.org 구조화 데이터
│   └── ...
│
├── saju/                            # 🎴 사주 기능
│   ├── basic/play                   # 기본 사주 분석 화면
│   ├── lifebook/                    # 라이프북 (프리미엄)
│   ├── love-secret/                 # 연애 비책
│   └── sibyl/                       # 시빌라 시스템 (진로·적성)
│
├── tarot/                           # 🔮 타로 기능
│   ├── mingri/play                  # 명리학 타로
│   ├── love/                        # 우리는 무슨 사이? (6카드)
│   ├── healing/start                # 힐링 타로 (4카드)
│   ├── reunion/                     # 재회운 타로 (5카드)
│   └── ...
│
├── ziwei/                           # 🌟 자미두수 기능
│   └── chart/                       # 자미두수 명반 & 16챕터 분석
│
├── oracle/                          # 🎯 오라클 & 특수 기능
│   ├── royal-tea/                   # 타세오그래피 찻잎 점
│   ├── hwatu-life/play              # 화투 인생 패 테스트
│   └── sikojen-povailu/             # 핀란드 주석점
│
├── points/                          # 💰 코인 충전 페이지
│   └── page.tsx                     # 포트원 결제 연동
│
├── login/ signup/                   # 🔑 인증 페이지
├── about/ faq/ methodology/         # 📖 정책 & 가이드 페이지
├── privacy-policy/ terms-of-service/
│
├── [adminHash]/[mode]/              # 🛠️ 관리자 패널 (동적 라우팅)
└── [locale]/                        # 🌍 다국어 라우팅 (en-us, ja-jp 등)
```

---

### 🎯 **정적 콘텐츠 & 레거시 파일**
```
index.html                          # 📄 메인 HTML (레거시 진입점)
public/
├── index.html                       # 메인 서비스 (배포 버전)
├── static/index.html                # 정적 생성 용 스냅샷
├── [locale]/index.html              # 다국어 정적 버전 (en-us, ja-jp 등)
├── sample/                          # 📋 샘플 결과 페이지
│   ├── saju-result.html
│   ├── tarot-result.html
│   └── today-fortune.html
├── styles/                          # 🎨 CSS 자산
│   ├── core-ui.css                  # 핵심 UI 스타일
│   ├── main-glass.css               # 글래스모피즘 디자인
│   └── *.css
├── js/
│   ├── core/
│   │   ├── index-inline-runtime.js  # 🔑 런타임 초기화 (다국어, 토글 힌트)
│   │   ├── index-inline-saju.js
│   │   └── index-inline-tarot.js
│   ├── *.js                         # 기능별 JavaScript
│   └── kill-switch.js               # 🛑 긴급 중단 신호
├── icons/                           # 🖼️ 이미지 & 아이콘
└── _headers                         # 🌐 Cloudflare Pages 헤더 설정
```

---

### 🛠️ **개발 & 빌드 스크립트**
```
scripts/
├── verify-runtime-cache-sync.mjs    # ✅ 런타임 캐시 검증
└── sync-legacy-static-to-public.mjs # 🔄 레거시 ↔ Public 동기화

_*.mjs / _*.ps1 / _*.bat            # 📝 임시 작업 자동화
├── _bump_versions.mjs               # 버전 업데이트
├── _clean_sitemap.mjs               # 사이트맵 정리
├── _setup_vertex_secrets.mjs        # Vertex AI 시크릿 설정
├── _fix_api_imports.mjs             # API 임포트 수정
└── ... (총 20+ 유틸리티)
```

---

### ⚙️ **설정 파일**
```
next.config.mjs                     # ⚙️ Next.js 설정 (rewrites, redirects)
tsconfig.json                       # 📘 TypeScript 설정
package.json                        # 📦 의존성 & 스크립트
wrangler.toml / wrangler.json       # ☁️ Cloudflare Workers 설정
.env.example / .env.cloudflare      # 🔐 환경변수 템플릿
auth.config.ts                      # 🔑 NextAuth.js 설정
```

---

## 🎯 **핵심 기능 & 워크플로우**

### 1️⃣ **사주 분석 (Saju)**
- **무료**: 기본 오행·십성 분석
- **프리미엄** (30,000원): 라이프북 + 대운·용신 심화
- **연애 비책** (30,000원): 11챕터 연애 전략
- **시빌라** (10,000원): 진로·적성 분석

### 2️⃣ **타로 리딩 (Tarot)**
- 명리학 타로 3카드 — 5,000원 (`tarot-myeongri-three-card`)
- 5카드 재회운 — 5,000원 (`tarot-reunion-reading`)
- 크리스탈 소울 타로 — 5,000원 (`tarot-crystal-soul-reading`)
- 그 외 스프레드 — 3,000원~10,000원. 전수 목록은 [docs/pricing/PRICING_AUDIT.md](docs/pricing/PRICING_AUDIT.md) 참고

### 3️⃣ **자미두수 (Ziwei)**
- 명반 생성 — 무료
- 12궁 기본 해석 — 무료
- 16챕터 심화 분석 — 무료

### 4️⃣ **결제 & 포인트**
- **API 엔드포인트**: `/api/tarot/reading`, `/api/sibyl/report`
- **결제 엔진**: `app/api/_lib/paymentValidation.js`
- **차감 로직**: 
  - ✅ JWT 토큰 검증
  - ✅ 코인 잔액 원자적 확인
  - ✅ 중복 결제 방지 (30분 타임아웃)
  - ✅ 구독 등급별 무료 한도 제공
  - ✅ 402 에러 (잔액부족) 처리

### 5️⃣ **다국어 지원**
- **기본언어**: 한국어 (ko)
- **지원 언어**: 영어(en), 일본어(ja), 중국어 간체(zh-CN), 힌디어(hi), 스페인어(es), 프랑스어(fr), 독일어(de), 네덜란드어(nl), 말레이어(ms)
- **동기화 위치**:
  - `index-inline-runtime.js` — 다국어 문구 딕셔너리
  - 각 locale/ 폴더 — 정적 HTML 버전

---

## 🚀 **배포 & CI/CD**

### **빌드 프로세스**
```bash
npm run build                       # Next.js 빌드
npm run build:cf                    # Cloudflare Pages 배포 빌드
scripts/sync-legacy-static-to-public.mjs  # 정적 파일 동기화
```

### **배포 대상**
- **메인**: `code-destiny-web.pages.dev` (Cloudflare Pages)
- **GitHub**: `main` 브랜치 push → 자동 배포
- **Workers**: 인증, 결제 검증 로직 실행

---

## 📋 **현재 타스크 상태** (VS Code Tasks)

| 타스크명 | 용도 | 단축키 |
|---------|------|--------|
| Git Status Short | 변경사항 확인 | `npm run git:status` |
| Git Add Adsense Stage Files | 특정 파일 스테이징 | 커스텀 |
| Git Commit Adsense Final | 커밋 | 커스텀 |
| Git Push Main | 메인 푸시 | 커스텀 |
| Next.js Build | 빌드 | `Ctrl+Shift+B` |
| NPM Build CMD | npm 빌드 | 커스텀 |

---

## 🔍 **최근 주요 변경** (2026-04-19)

✅ **완료된 작업**:
1. **컬렉션 카드 텍스트 복구** — "눌러서 열기" 텍스트 재추가 (6개 카드)
2. **결제 검증 강화** — 백엔드 코인 차감 엔진 추가
3. **SEO 콘텐츠** — 메타데이터 & FAQ 문서화
4. **다국어 메타데이터** — 경로별 고유 메타 코드 생성

❌ **미완료**:
- 모바일 결제 리디렉트 UX 개선 (진행 중)
- Vertex AI 연동 최적화
- 관리자 패널 권한 심화 검증

---

## 🎯 **다음 단계 가이드**

### 🔧 **신기능 추가 시**
1. `app/[feature]/page.tsx` 생성 (Next.js 라우팅)
2. `app/_content/seo-copy.js`에 메타 문구 추가
3. `index-inline-runtime.js`에 다국어 문구 추가 (필요 시)
4. `public/[locale]/index.html` 동기화

### 🐛 **버그 수정 시**
1. 영향받는 파일 특정 (`git diff`)
2. 수정 후 로컬 테스트 (`npm run build`)
3. `git add -- [파일]` (범위 제한 스테이징)
4. 커밋 (범위 명확히)

### 📤 **배포 전**
```bash
npm run build:cf                    # 빌드
git status                          # 상태 확인
git add -- [수정파일만]             # 선택적 스테이징
git commit -m "feat: [기능명]"     # 커밋
git push origin main                # 푸시
```

---

✨ **프로젝트는 기능별로 명확히 분리되어 있으며, 모듈화 구조로 유지보수가 용이합니다.**
