# 📂 `public/` — 정적 자산 & 배포 파일

> 이 폴더는 **Cloudflare Pages로 배포되는 정적 파일**을 포함합니다.

---

## 📂 **구조**

```
index.html                → 🔴 메인 서비스 (메인 진입점)
static/index.html         → 정적 스냅샷 (빌드 시 생성)
[locale]/index.html       → 🌍 언어별 정적 버전
  ├── en-us/
  ├── ja-jp/
  ├── zh-cn/
  └── ... (총 9개 언어)

styles/                   → 🎨 CSS 자산
  ├── core-ui.css        → 핵심 스타일
  ├── main-glass.css     → 글래스모피즘 디자인
  └── *.css              → 기능별 스타일

js/                       → 🔧 JavaScript 번들
  ├── core/
  │   ├── index-inline-runtime.js    → 🔑 런타임 초기화 (다국어, 토글)
  │   ├── index-inline-saju.js       → 사주 계산 번들
  │   └── index-inline-tarot.js      → 타로 번들
  └── *.js               → 기능별 JS

icons/                    → 🖼️ 이미지·아이콘
sample/                   → 📋 샘플 결과 페이지
  ├── saju-result.html
  ├── tarot-result.html
  └── today-fortune.html

_headers                  → ☁️ Cloudflare Pages 헤더 설정
```

---

## 🎯 **핵심 파일**

### **메인 페이지**
| 파일 | 역할 |
|------|------|
| `index.html` | 🔴 **가장 중요** — 메인 서비스 렌더링 |
| `static/index.html` | 빌드 시 생성되는 스냅샷 |
| `[locale]/index.html` | 각 언어별 정적 버전 |

> ⚠️ `index.html`에는 다국어 문구, 컬렉션 카드 텍스트 등이 **하드코딩**되어 있습니다.

### **런타임 스크립트**
```
js/core/index-inline-runtime.js
├── 다국어 딕셔너리
├── 토글 힌트 텍스트 주입
├── 번역 UI 초기화
└── 렌더링 성능 최적화
```

> 📌 **중요**: 컬렉션 카드 텍스트는 HTML에서 직접 설정되므로, JS 재실행만으로는 반영 안 됨.

---

## 🔄 **동기화 규칙**

```
root/index.html ←→ public/index.html
     (개발)            (배포)
```

- **수정 시**: 양쪽 모두 업데이트 필요
- **스크립트**: `scripts/sync-legacy-static-to-public.mjs`가 자동 동기화
- **배포**: `public/` 폴더만 Cloudflare Pages로 전송

---

## 🌍 **다국어 파일**

```
public/
├── index.html          → 기본 (한국어)
├── en-us/index.html    → 영어
├── ja-jp/index.html    → 일본어
├── zh-cn/index.html    → 중국어 (간체)
├── hi-in/index.html    → 힌디어
├── es-es/index.html    → 스페인어
├── fr-fr/index.html    → 프랑스어
├── de-de/index.html    → 독일어
├── nl-nl/index.html    → 네덜란드어
└── ms-my/index.html    → 말레이어
```

> 문구 변경 시 모든 언어 파일에 반영 필요

---

## 🎨 **CSS 파일**

| 파일 | 용도 |
|------|------|
| `core-ui.css` | 버튼, 카드, 레이아웃 기본 스타일 |
| `main-glass.css` | 글래스모피즘 디자인 요소 |
| `*.css` | 기능별 맞춤 스타일 |

---

## ⚙️ **배포 설정**

### **Cloudflare Pages 헤더** (`_headers`)
```
Cache-Control 정책
│
├── js/ → max-age=604800 (7일) + SWR 30일  ※ /js/shell/* 는 내용 해시라 immutable
├── css/ → styles/ 는 immutable (전량 ?v=build-… 를 단다)
└── 이미지 → 장기 캐시 (max-age=31536000)
※ HTML(`/` · `/index.html` · `/*.html` · `/*/`)은 브라우저·CDN 양쪽 no-cache 다.
  그래서 `?v=build-…` 를 단 참조는 배포 즉시 새 파일을 받는다 — 7일 창은 **무버전 참조에만** 걸린다.
```

---

## 🚀 **주요 작업**

### **텍스트 수정**
```
1. public/index.html 수정
2. root/index.html도 동기화 (필요 시)
3. npm run build
4. git push → 자동 배포
```

### **스타일 수정**
```
1. public/styles/*.css 수정
2. npm run build (캐시 무효화)
3. git push
```

### **다국어 추가**
```
1. 기본 index.html에 문구 추가
2. 모든 public/[locale]/index.html에 적용
3. npm run build
```

---

## 📌 **팁**

- **캐시 문제**: `_headers`의 `max-age=0`으로 실시간 반영 가능
- **배포 시간**: Cloudflare Pages는 git push 후 ~1-2분 내 배포 완료
- **검증**: `https://code-destiny-web.pages.dev`에서 라이브 확인

📖 **더 자세히**: [QUICK_START.md](../QUICK_START.md) 참고
