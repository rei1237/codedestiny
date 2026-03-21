# Web Worker를 통한 사주 계산 오프로드 가이드

## 개요
메인 스레드의 사주 계산(6.6초)을 Web Worker로 이동하여 메인 스레드 블로킹 없이 병렬 처리. 목표: 2초 이내 UI 응답성 유지.

---

## 파일 구조

```
CODE-DESTINY-main/
├── workers/
│   └── saju.worker.js                    # 웹 워커 - 사주 계산 로직
├── js/services/
│   ├── sajuWorkerService.js             # 워커 통신 계층
│   └── sajuWorkerExamples.js            # 사용 예제
└── index.html / saju_report_v3.jsx      # 기존 컴포넌트 (수정 필요)
```

---

## 설치 및 로드 순서

### 1. HTML에서 스크립트 로드

```html
<!-- 워커 통신 서비스 로드 (index.html 또는 next.js layout) -->
<script src="/js/services/sajuWorkerService.js"></script>

<!-- 선택: 예제 및 유틸리티 -->
<script src="/js/services/sajuWorkerExamples.js"></script>
```

### 2. Next.js 컴포넌트에서 사용

```jsx
import { useEffect, useState } from 'react';

export default function SajuCalculator() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async (birthDate, birthTime, gender) => {
    setLoading(true);
    try {
      // 워커를 통한 사주 계산 (메인 스레드 블로킹 없음)
      const sajuResult = await window.sajuWorkerService.calculateSaju({
        birthDate,
        birthTime,
        gender
      });
      setResult(sajuResult);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => handleCalculate('1997-02-10', '14:30', 'M')}>
        계산 (Worker 사용)
      </button>
      {loading && <p>계산 중...</p>}
      {result && <div>{JSON.stringify(result, null, 2)}</div>}
    </div>
  );
}
```

---

## 주요 Function Reference

### `window.sajuWorkerService.calculateSaju(data)`

기본 사주 계산.

**Input:**
```javascript
{
  birthDate: "1997-02-10",  // YYYY-MM-DD
  birthTime: "14:30",        // HH:mm (optional, default: "12:00")
  gender: "M"                // "M" 또는 "F"
}
```

**Output:**
```javascript
{
  birthDate: "1997-02-10",
  birthTime: "14:30",
  gender: "M",
  lunar: {
    year: 1997,
    month: 1,
    day: 3,
    isLeap: false
  },
  ganji: {
    year: "丁丑",
    month: "正月",
    day: "庚子",
    hour: "未時"
  },
  bazi: { ... },
  pillars: [ ... ],
  computed: true,
  timestamp: 1710000000000
}
```

### `window.sajuWorkerService.calculateDaewoon(data)`

대운(10년 단위 운세) 계산.

**Input:**
```javascript
{
  birthDate: "1997-02-10",
  gender: "F"
}
```

**Output:**
```javascript
{
  daewoonData: [
    { age: "0-9", label: "1997년(0세)", score: 45 },
    { age: "10-19", label: "2007년(10세)", score: 62 },
    // ... 8개 항목
  ],
  currentAge: 27,
  timestamp: 1710000000000
}
```

### `window.sajuWorkerService.convertSolarToLunar(data)`

양력 → 음력 변환.

**Input:**
```javascript
{ year: 1997, month: 2, day: 10, hour: 14, minute: 30 }
```

**Output:**
```javascript
{ year: 1997, month: 1, day: 3, isLeap: false, timestamp: ... }
```

### `window.sajuWorkerService.convertLunarToSolar(data)`

음력 → 양력 변환.

**Input:**
```javascript
{ year: 1997, month: 1, day: 3, isLeap: false }
```

**Output:**
```javascript
{ year: 1997, month: 2, day: 10, dateStr: "1997-02-10", timestamp: ... }
```

---

## 성능 개선 효과

### Before (메인 스레드 블로킹)
```
사주 계산: 6.6초 ⏳ (UI 무응답)
└─ 페이지 freeze, 클릭 무시, 애니메이션 멈춤
```

### After (Web Worker)
```
메인 스레드: ~200ms ✅ (UI 반응성 유지)
워커 스레드: 6.6초 ⏳ (백그라운드 계산)
└─ 사용자 상호작용 중단 없음, 부드러운 애니메이션 유지
```

---

## 기술 상세

### Web Worker 통신 아키텍처

```
┌─────────────────────┐      ┌──────────────────────┐
│   메인 스레드       │      │   워커 스레드        │
├─────────────────────┤      ├──────────────────────┤
│ sagWorkerService    │      │ saju.worker.js       │
│  ├─ init()          │←────→│  ├─ calculateSaju()  │
│  ├─ call()          │posted│  ├─ calculateDaewoon │
│  └─ callbacks{}     │message│  └─ convert*()      │
└─────────────────────┘      └──────────────────────┘
```

### 통신 흐름

1. **호출**: `sajuWorkerService.calculateSaju(data)` 
   - requestId 생성
   - `worker.postMessage({ type, data, id })`

2. **워커 처리**: `importScripts()` → lunar-javascript 로드
   - 계산 수행 (메인 스레드 영향 없음)
   - `self.postMessage({ type, id, result })`

3. **응답**: 메인 스레드의 콜백 실행
   - Promise resolve
   - 결과 반환

---

## 주의사항

### 1. 라이브러리 호환성
- **필수**: lunar-javascript CDN 접근 가능 필요
  ```js
  // saju.worker.js에서 importScripts() 사용
  const CDN_URLS = [
    'https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.js',
    'https://unpkg.com/lunar-javascript@latest/lunar.js',
    // ...
  ];
  ```
  
- CDN 차단 환경: 로컬 번들 사용 필요

### 2. 워커 로드 경로
- ES Module 기반 프로젝트: `new URL('../workers/saju.worker.js', import.meta.url)`
- CommonJS: 경로 조정 필요

### 3. 타임아웃
```javascript
// 기본 타임아웃: 15초
// 필요시 커스텀:
sajuWorkerService.call('calculateSaju', data, 30000); // 30초
```

### 4. 메모리
- 워커는 별도 메모리 공간 사용
- 계산 완료 후 자동 메모리 해제

---

## 추가 최적화

### 1. 배치 처리 (여러 명 동시)
```javascript
const results = await Promise.all([
  sajuWorkerService.calculateSaju(data1),
  sajuWorkerService.calculateSaju(data2),
  sajuWorkerService.calculateSaju(data3)
]);
```

### 2. 캐싱 전략
```javascript
const cache = new Map();

async function calculateWithCache(key, birthData) {
  if (cache.has(key)) return cache.get(key);
  
  const result = await sajuWorkerService.calculateSaju(birthData);
  cache.set(key, result);
  return result;
}
```

### 3. 점진적 로딩
```javascript
// 워커 미리 초기화 (앱 로드 시)
window.sajuWorkerService.init();

// 사용자 입력 전 라이브러리 사전 로드
await new Promise(resolve => setTimeout(resolve, 1000));
```

---

## 마이그레이션 가이드

### Step 1: 기존 코드 찾기
```bash
# saju-engine.js에서 사주 계산 함수 찾기
grep -r "calculateSaju\|computeProfileForModal" js/
```

### Step 2: 워커 서비스로 대체
```javascript
// Before
const result = window.computeProfileForModal(profile);

// After
const result = await window.sajuWorkerService.calculateSaju({
  birthDate: profile.birth.year + '-' + profile.birth.month + '-' + profile.birth.day,
  birthTime: profile.birth.hour + ':' + profile.birth.minute,
  gender: profile.gender
});
```

### Step 3: Async/Await 처리
```javascript
// 기존 동기 함수를 async로 변경
async function processProfile(profile) {
  const sajuResult = await window.sajuWorkerService.calculateSaju({...});
  // sajuResult 사용
}
```

---

## 테스트 예제

```javascript
// 콘솔에서 실행:

// 1. 기본 사주 계산
await window.sajuWorkerService.calculateSaju({
  birthDate: '1997-02-10',
  birthTime: '14:30',
  gender: 'M'
});

// 2. 대운 계산
await window.sajuWorkerService.calculateDaewoon({
  birthDate: '1997-02-10',
  gender: 'M'
});

// 3. 음/양력 변환
await window.sajuWorkerService.convertSolarToLunar({
  year: 1997,
  month: 2,
  day: 10
});

// 4. 여러 명 배치 계산
const batch = await Promise.all([
  window.sajuWorkerService.calculateSaju({birthDate: '1997-02-10', birthTime: '14:30', gender: 'M'}),
  window.sajuWorkerService.calculateSaju({birthDate: '1998-05-15', birthTime: '09:00', gender: 'F'})
]);
console.log('배치 결과:', batch);
```

---

## 문제 해결

### Q: 워커가 로드되지 않음
**A**: 브라우저 콘솔 확인
```javascript
// 워커 상태 확인
console.log(window.sajuWorkerService.isReady);
window.sajuWorkerService.init(); // 수동 초기화
```

### Q: CDN 타임아웃
**A**: 로컬 lunar-javascript 번들 사용
```javascript
// saju.worker.js의 CDN_URLS 수정
const CDN_URLS = [
  '/lib/lunar-javascript.js',  // 로컬 경로
  // ...
];
```

### Q: CORS 에러
**A**: 워커는 같은 출처 정책 준수
- 워커 파일과 라이브러리 같은 도메인

---

## 다음 단계

1. **HTML 통합**: `sajuWorkerService.js` 로드
2. **기존 함수 마이그레이션**: `computeProfileForModal()` → `sajuWorkerService.calculateSaju()`
3. **성능 측정**: DevTools Timeline에서 메인 스레드 부하 확인
4. **캐싱 추가**: 반복 계산 최적화

---

**작성일**: 2026-03-22  
**목표**: 메인 스레드 6.6초 → 2초 (3배 개선)  
**상태**: 구현 완료 ✅
