# 🎨 `styles/` — 글로벌 CSS 스타일

> 이 폴더는 모든 페이지에서 사용되는 **CSS 스타일**을 포함합니다.

---

## 📂 **주요 파일**

| 파일 | 용도 | 크기 |
|------|------|------|
| **core-ui.css** | ⭐ 핵심 UI (버튼, 카드, 레이아웃) | 주요 |
| **main-glass.css** | 글래스모피즘 디자인 효과 | 중간 |
| **mobile-totem-flower-fix.css** | 모바일 최적화 & 톤 수정 | 작음 |
| **entertain-system.css** | 엔터테인먼트 기능 스타일 | 중간 |
| **fortune.css** | 운세 페이지 스타일 | 중간 |
| **... (20+ 파일)** | 기능별 맞춤 스타일 | 다양 |

---

## 🎯 **핵심 스타일**

### **1. core-ui.css** (가장 중요)
```css
/* 토글 힌트 텍스트 */
.fc-toggle-hint__text {
  font-weight: 700;
  letter-spacing: 0.03em;
}

/* 컬렉션 카드 */
.feat-collection {
  /* 기본 스타일 */
}

/* 버튼 & 입력 */
.btn-main, .btn-secondary {
  /* 버튼 스타일 */
}
```

### **2. main-glass.css** (글래스모피즘)
```css
/* 글래스 효과 */
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 토글 힌트 */
.fc-toggle-hint {
  background: linear-gradient(120deg, rgba(255,255,255,0.08), ...);
  backdrop-filter: blur(6px);
}
```

### **3. mobile-totem-flower-fix.css** (모바일 최적화)
```css
/* 모바일 텍스트 가독성 */
#inputPage .fc-toggle-hint__text {
  font-size: clamp(0.92rem, 2.35vw, 1.04rem) !important;
  font-weight: 800 !important;
  color: rgba(246, 241, 255, 0.98) !important;
  text-shadow: 0 0 8px rgba(196, 171, 255, 0.45);
}

/* 반응형 레이아웃 */
@media (max-width: 768px) {
  /* 모바일 스타일 */
}
```

---

## 🎨 **색상 & 테마**

### **다크 모드 (기본)**
```css
/* 배경 */
--bg-dark: #040510;
--bg-darker: #020617;

/* 텍스트 */
--text-light: #f8fafc;
--text-muted: rgba(219, 234, 254, 0.8);

/* 악센트 */
--accent-gold: #c9a84c;
--accent-purple: #c4abfd;
--accent-blue: #5dd9ff;
```

### **라이트 모드** (지원 예정)
```css
/* 다크 모드와 반대 */
--bg-light: #ffffff;
--text-dark: #111827;
```

---

## 🔄 **파일 동기화**

```
styles/                  ←→  public/styles/
(개발 버전)                (배포 버전)
```

**규칙**:
- `styles/` 폴더의 파일 수정
- 빌드 시 자동으로 `public/styles/`로 복사
- 필요 시 수동 복사 또는 동기화 스크립트 실행

---

## 📐 **주요 클래스**

### **컬렉션 카드**
```html
<div class="feat-collection">
  <button class="feat-collection__header fc-toggle-btn">
    <h3 class="feat-collection__title">동물 & 관상</h3>
    <div class="fc-toggle-hint">
      <span class="fc-toggle-hint__arrow">▾</span>
      <span class="fc-toggle-hint__text">눌러서 열기</span>
    </div>
  </button>
</div>
```

### **버튼**
```html
<!-- 메인 버튼 -->
<button class="btn-main">사주 분석</button>

<!-- 보조 버튼 -->
<button class="btn-secondary">더 알아보기</button>

<!-- 유료 버튼 -->
<button class="btn-coin">유료 시작</button>
```

### **타일 (카드)**
```html
<div class="tarot-tile tarot-tile--love">
  <div class="tarot-tile__img-wrap">
    <img class="tarot-tile__img" src="...">
  </div>
  <span class="tarot-tile__badge">무료</span>
</div>
```

---

## 🎯 **수정 가이드**

### **텍스트 색상 변경**
```css
/* core-ui.css */
.fc-toggle-hint__text {
  color: rgba(255, 255, 255, 0.9); /* ← 변경 */
}
```

### **버튼 스타일 수정**
```css
/* core-ui.css */
.btn-main {
  background: linear-gradient(90deg, #c9a84c, #e5c05b);
  padding: 14px 24px; /* ← 변경 */
  border-radius: 12px; /* ← 변경 */
}
```

### **모바일 반응형**
```css
/* mobile-totem-flower-fix.css */
#inputPage .fc-toggle-hint__text {
  font-size: clamp(0.92rem, 2.35vw, 1.04rem) !important; /* 반응형 */
}
```

---

## ⚙️ **CSS 빌드 순서**

```
1. core-ui.css          (기본)
2. main-glass.css       (오버라이드)
3. mobile-totem-flower-fix.css (최종 모바일 최적화)
4. ... (기능별 스타일)
```

> **중요**: 로드 순서가 중요 (나중에 로드된 CSS가 우선)

---

## 🚀 **수정 & 배포**

### **즉시 반영 필요한 경우**
```bash
# 1. styles/ 폴더의 CSS 수정
vi styles/core-ui.css

# 2. public/styles/ 동일하게 수정
vi public/styles/core-ui.css

# 3. 캐시 무효화 (index.html의 버전 쿼리 업데이트)
<link rel="stylesheet" href="/styles/core-ui.css?v=20260419-fix1">

# 4. 배포
npm run build
git push
```

### **다음 배포 사이클**
```bash
# CSS 수정만 하면 자동 반영
vi styles/core-ui.css
npm run build
git push
```

---

## 📌 **주의사항**

### **⚠️ 파일 동기화**
```
styles/core-ui.css ≠ public/styles/core-ui.css
→ 배포 후 반영 안 될 수 있음
→ 양쪽 모두 수정 권장
```

### **⚠️ 캐시 문제**
```
브라우저 캐시로 인해 CSS가 업데이트 안 보일 수 있음
→ Ctrl+Shift+Delete (캐시 지우기)
→ 또는 버전 쿼리 변경
```

### **⚠️ !important 주의**
```css
/* 남용하면 추후 오버라이드 어려움 */
color: red !important; ← 피하기

/* 우선순위 조정으로 해결 */
#inputPage .class { color: red; }
```

---

## 🎯 **빠른 참고**

- **모바일 테스트**: DevTools → Device Toolbar (Ctrl+Shift+M)
- **반응형 값**: `clamp(min, preferred, max)` 사용
- **색상 팔레트**: 프로젝트 기본 색상은 주황·보라·청색
- **효과**: 글래스모피즘 (blur + transparency)

📖 **더 자세히**: [QUICK_START.md](../QUICK_START.md)
