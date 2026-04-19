# 🚀 Code Destiny — 빠른 폴더 네비게이션

> **VS Code Explorer에서 각 폴더 클릭 시 README.md를 열어 상세 정보 확인 가능합니다.**

---

## 📱 **주요 폴더 구조**

### 🎯 **메인 애플리케이션**
| 폴더 | 용도 | 상세 문서 |
|------|------|---------|
| `app/` | Next.js App Router (페이지·API) | [📖 app/README.md](app/README.md) |
| `public/` | 정적 자산·HTML·배포 버전 | [📖 public/README.md](public/README.md) |
| `lib/` | 공유 라이브러리 (메타데이터·유틸) | [📖 lib/README.md](lib/README.md) |
| `styles/` | 글로벌 CSS 스타일 | [📖 styles/README.md](styles/README.md) |

---

### 🔧 **개발 & 빌드**
| 폴더 | 용도 | 상세 문서 |
|------|------|---------|
| `scripts/` | 자동화 & 배포 스크립트 | [📖 scripts/README.md](scripts/README.md) |
| `js/` | 레거시 및 런타임 JS | [📖 js/README.md](js/README.md) |

---

### ⚙️ **설정**
```
next.config.mjs      → Next.js 빌드 & 라우팅 설정
tsconfig.json        → TypeScript 경로 별칭
package.json         → 의존성 & NPM 스크립트
wrangler.toml        → Cloudflare Workers 설정
.env.example         → 환경변수 템플릿
```

---

## 🎯 **기능별 폴더 맵**

```
🏠 홈 화면 & 메인 서비스
├── app/page.js                 → 메인 페이지
├── index.html / public/index.html → 레거시 서비스 진입점
└── app/layout.js               → 전역 레이아웃

📊 사주 분석 (Saju)
├── app/saju/basic/              → 기본 사주
├── app/saju/lifebook/           → 프리미엄 라이프북
├── app/saju/love-secret/        → 연애 비책
└── app/saju/sibyl/              → 시빌라 시스템 (진로·적성)

🔮 타로 리딩 (Tarot)
├── app/tarot/mingri/            → 명리학 타로
├── app/tarot/love/              → 우리는 무슨 사이? (6카드)
├── app/tarot/healing/           → 힐링 타로 (4카드)
└── app/tarot/reunion/           → 재회운 타로 (5카드)

🌟 자미두수 (Ziwei)
├── app/ziwei/chart/             → 자미두수 명반 & 분석
└── app/components/HPremiumZiweiSection.tsx → 프리미엄 UI

💎 오라클 & 특수 기능
├── app/oracle/royal-tea/        → 타세오그래피 찻잎 점
├── app/oracle/hwatu-life/       → 화투 인생 패
└── app/oracle/sikojen-povailu/  → 핀란드 주석점

💰 결제 & 인증
├── app/points/                  → 코인 충전 (포트원)
├── app/login/ / app/signup/     → 인증
└── app/api/auth/                → OAuth & JWT

🌍 다국어 & SEO
├── app/[locale]/                → 언어별 라우팅 (en-us, ja-jp 등)
├── public/[locale]/index.html   → 정적 언어 버전
├── app/_content/seo-copy.js     → 공유 텍스트
└── lib/generate-page-metadata.ts → 메타데이터 생성

📝 정책 & 가이드
├── app/about/                   → 서비스 소개
├── app/faq/                     → 자주 묻는 질문
├── app/methodology/             → 콘텐츠 방법론
├── app/privacy-policy/          → 개인정보처리방침
└── app/terms-of-service/        → 이용약관

🛠️ 관리자 & 특수
├── app/[adminHash]/[mode]/      → 관리자 패널 (동적 라우팅)
├── app/dev-status/              → 개발 상태 페이지
└── app/not-found.js             → 404 페이지
```

---

## 🚀 **빠른 명령어**

```bash
# 빌드
npm run build                      # Next.js 빌드
npm run build:cf                   # Cloudflare Pages 배포

# 개발
npm run dev                        # 로컬 dev 서버 (port 3000)

# 테스트
npm run build                      # 빌드 검증

# 배포
git add -- [파일]                  # 선택적 스테이징
git commit -m "feat: [기능명]"     # 커밋
git push origin main               # 자동 배포 (Cloudflare Pages)
```

---

## 📂 **각 폴더에서 README 보기**

각 주요 폴더를 VS Code에서 우클릭 → "Open in File Explorer" 또는 직접 클릭하면 해당 README 문서가 나타납니다:

```
📍 app/README.md          → 페이지·API·컴포넌트 구조
📍 public/README.md       → 정적 자산·배포 파일
📍 js/README.md           → 런타임·레거시 JS
📍 scripts/README.md      → 배포·자동화 스크립트
📍 styles/README.md       → CSS 조직·테마
📍 lib/README.md          → 공유 라이브러리·유틸
```

---

## 🎯 **자주 하는 작업**

### ✅ 신기능 추가
```
1. app/[feature]/page.tsx 생성
2. app/_content/seo-copy.js에 메타 추가
3. npm run build로 검증
4. git push
```

### 🐛 버그 수정
```
1. 파일 수정
2. git add -- [파일]
3. git commit -m "fix: [문제]"
4. git push
```

### 🌍 다국어 추가
```
1. app/_content/seo-copy.js 업데이트
2. public/[new-locale]/index.html 추가
3. npm run build
4. git push
```

---

💡 **팁**: VS Code의 "Breadcrumb" 기능(상단 경로 표시)을 켜면 현재 위치를 더 명확하게 볼 수 있습니다.  
📌 **즐겨찾기**: 자주 방문하는 폴더를 우클릭 → "Add to Favorites"로 등록하세요.
