# 🔧 `js/` — 런타임 JavaScript & 레거시 번들

> 이 폴더는 **브라우저에서 실행되는 JavaScript 파일**을 포함합니다.

---

## 📂 **구조**

```
core/
├── index-inline-runtime.js      → 🔑 핵심 런타임 (다국어, 토글)
├── index-inline-saju.js         → 사주 계산 번들
└── index-inline-tarot.js        → 타로 번들

kill-switch.js                  → 🛑 긴급 중단 신호
psycho-dream-analyzer-*.js      → 꿈 해몽 분석 엔진
sibyl-system.js                 → 시빌라 시스템
ziwei-book.js                   → 자미두수 계산
... (20+ 기능별 파일)
```

---

## 🎯 **핵심 파일**

### **필수 런타임** (모든 페이지에서 실행)
```javascript
// index-inline-runtime.js
├── 🌍 다국어 딕셔너리
│   ├── ko: { open: '눌러서 열기', close: '닫기' }
│   ├── en: { open: 'Tap to open', close: 'Close' }
│   └── ... (9개 언어)
│
├── 🔄 토글 힌트 텍스트 주입
│   └── cdApplyCollectionToggleHintTexts()
│
├── 🌐 번역 UI 관리
│   └── initTranslateLangUI()
│
└── 📋 로케일 링크 재타겟
    └── cdRetargetLocaleSensitiveLinks()
```

### **기능별 번들**
| 파일 | 기능 |
|------|------|
| `index-inline-saju.js` | 사주 계산 (천간·지지·오행) |
| `index-inline-tarot.js` | 타로 카드 해석 |
| `sibyl-system.js` | 시빌라 도미네이터 리포트 |
| `ziwei-book.js` | 자미두수 16챕터 |
| `psycho-dream-analyzer-*.js` | 꿈 해몽 분석 |

---

## 💡 **주요 기능**

### **1. 다국어 토글 텍스트** (가장 많이 수정됨)
```javascript
// 컬렉션 카드 텍스트 설정
cdApplyCollectionToggleHintTexts(lang)
│
└── 현재 언어에 맞는 "눌러서 열기" 주입
    ├── 한국어: "눌러서 열기"
    ├── 영어: "Tap to open"
    └── 기타 언어
```

**수정 시나리오**:
```
❌ 문제: 컬렉션 카드 텍스트 누락
✅ 해결: 
   1. HTML에 기본값 추가 → <span class="fc-toggle-hint__text">눌러서 열기</span>
   2. JS도 동시 실행 → 추가 언어 전환 시 반영
```

### **2. 사주 계산 번들**
```
입력: 생년월일시
│
├─ 천간·지지 생성
├─ 오행 강약 계산
├─ 십성 도출
└─ 해석 문장 생성
```

### **3. 시빌라 리포트**
```
index-inline-runtime.js → 기본 초기화
         ↓
sibyl-system.js → 사용자 상호작용
         ↓
/api/sibyl/report → 백엔드 (유료 처리)
         ↓
20,000자 + 리포트 생성
```

---

## 🚀 **수정 & 배포 흐름**

### **텍스트 수정**
```
1. js/core/index-inline-runtime.js 수정
   (다국어 딕셔너리, 함수 로직)
   
2. public/js/core/ 동기화
   (배포 버전도 수정)
   
3. public/index.html의 버전 쿼리 업데이트
   <script src="/js/core/index-inline-runtime.js?v=20260419-fix1"></script>
   
4. npm run build → git push
```

### **버전 쿼리 규칙**
```
format: ?v=YYYYMMDD-desc1
예시:  ?v=20260419-textfix1

목적: 브라우저 캐시 무효화
```

---

## 📌 **주의사항**

### **⚠️ 파일 동기화 필수**
```
js/core/*.js ←→ public/js/core/*.js
(개발)          (배포)

양쪽 모두 수정하지 않으면 배포 시 반영 안 됨
```

### **⚠️ 문법 검증**
```bash
# 문법 오류 확인
node --check js/core/index-inline-runtime.js
```

### **⚠️ 버전 쿼리 중복**
```
같은 버전으로 여러 수정 시 캐시 고착 가능
→ 매번 새 버전 부여 필요
```

---

## 🎯 **자주 하는 작업**

### **다국어 문구 추가**
```javascript
// js/core/index-inline-runtime.js
var __cdCollectionToggleHintTextByLang = {
  ko: { open: '눌러서 열기', close: '닫기' },    ← 여기 수정
  en: { open: 'Tap to open', close: 'Close' },
  // ... 기타 언어
};
```

### **새 기능 JS 추가**
```
1. js/[feature-name].js 생성
2. public/js/[feature-name].js도 생성
3. index.html에 <script src="/js/[feature-name].js?v=..."></script> 추가
4. npm run build
```

---

## 📖 **더 알아보기**

- **다국어 전체 플로우**: `QUICK_START.md` 참고
- **더 자세한 런타임 구조**: `PROJECT_STRUCTURE.md` 참고
- **배포 과정**: `scripts/README.md` 참고
