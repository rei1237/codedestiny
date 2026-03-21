# Phase 6: Runtime Validation Guide

**Status:** Ready for Testing  
**Objective:** Verify that Phase 5 dead code removal didn't break application functionality  
**Timeframe:** Manual browser testing + automated validation  

---

## 1. 검증 범위

### 1.1. 제거된 함수들의 Runtime 가용성
```
✅ getTenGod (십신 계산)
✅ analyzeJohu (조후 분석)
✅ calcPower (신강약)
✅ detectJong (종격 판별)
✅ calcZiweiPalaces (자미두수 12궁)
```

### 1.2. 보존된 헬퍼 함수들
```
✅ zwDisplayPalaceName (궁 이름 표시)
✅ zwComputeStarStrength (별 강약 계산)
✅ zwNormalizeStrength (강약 정규화)
✅ zwStrengthToSymbol (강약→기호 변환)
```

### 1.3. 글로벌 상태 보존
```
✅ GENDER (성별 전역 변수)
✅ GAN, JI, ZHI_LIST (천간/지지/12지 데이터)
✅ Global event handlers
```

---

## 2. 자동화 검증 (Automated)

### 2.1. Node.js 기반 검증 스크립트
**파일:** `validate-phase6-runtime.mjs`  
**용도:** 모듈 로드 여부, 함수 서명, 기본 계산 확인  

#### 실행 방법 (개발 환경)
```bash
# 브라우저에서 로드된 후 콘솔에서 실행
node validate-phase6-runtime.mjs

# 또는 브라우저 콘솔에 복사-붙여넣기
```

#### 출력 예시
```
═══════════════════════════════════════════════════════
SECTION 1: MODULE AVAILABILITY TESTS
═══════════════════════════════════════════════════════

1.1. sajuAnalyzer.js module functions
✅ [1] getTenGod should be available globally
✅ [2] analyzeJohu should be available globally
✅ [3] calcPower should be available globally
✅ [4] detectJong should be available globally

1.2. ziwei-doushu.js module functions
✅ [5] calcZiweiPalaces should be available globally
✅ [6] evalStar should be available globally
✅ [7] calcDahuan should be available globally
✅ [8] buildZiweiChart should be available globally

...

═══════════════════════════════════════════════════════
SUMMARY
═══════════════════════════════════════════════════════

Tests passed: 35/35 (100%)
Status: Phase 6 Runtime Validation - PASS ✅
```

### 2.2. Chrome DevTools 자동 검증법

#### Step 1: 개발자 콘솔 열기
```
Windows/Linux: F12
Mac: Cmd+Option+I
```

#### Step 2: Console 탭에서 스크립트 실행
```javascript
// 1. 모듈 로드 확인
console.log('getTenGod:', typeof window.getTenGod);
console.log('calcZiweiPalaces:', typeof window.calcZiweiPalaces);

// 2. 함수 호출 테스트
const result = calcZiweiPalaces(1997, 2, 10, 14, 0);
console.log('Ziwei result keys:', Object.keys(result).length, 'properties');

// 3. 십신 계산 테스트
const tenGod = getTenGod('甲', '己');
console.log('Ten Gods (甲 vs 己):', tenGod);
```

---

## 3. 수동 검증 (Manual Testing)

### 3.1. 브라우저 기반 검증

#### 접근 방법 1: 웹사이트 방문
```
URL: https://code-destiny-web.pages.dev/
또는 로컬: http://localhost:3000 (개발 서버)
```

#### 검증 체크리스트

**[필수] 차트 기본 기능**
- [ ] 페이지 로드 성공 (콘솔 에러 없음)
- [ ] 자미두수 차트 렌더링 완료
- [ ] 12궁 표시 (명궁, 형제궁, 부처궁, ... 부모궁)
- [ ] 14주성 표시 (자미, 천기, 태양, 무곡, ...)
- [ ] 大漢(10년) 표 표시

**[필수] 인터랙션**
- [ ] 궁 클릭 → 상세 정보 표시
- [ ] 부모궁 ↔ 부부궁 표시 전환 동작
- [ ] 성별 전환 버튼 (M/F) 동작
- [ ] 터치 이벤트 (모바일) 반응 확인

**[필수] 계산 결과**
- [ ] 십신(비견/겁재/식신/상관/...) 표시
- [ ] 조후 점수 표시
- [ ] 종격 인식 (종격인 경우)
- [ ] 화사(化祿/化權/化果/化忌) 표시

**[선택] 성능**
- [ ] 차트 로드 시간 < 2초
- [ ] 궁 클릭 응답 < 100ms
- [ ] 성별 전환 응답 < 50ms
- [ ] 메모리 누수 없음 (콘솔에서 gc() 후 메모리 회수 되는지 확인)

### 3.2. 모바일 검증

#### iOS (Safari DevTools)
```
1. Safari에서 개발 메뉴 활성화
   Settings → Safari → Advanced → Web Inspector
2. 아이패드/아이폰과 Mac 연결
3. Safari에서 Develop 메뉴 → 기기 선택
4. Web Inspector 열기
```

#### Android (Chrome Remote Debugging)
```
1. USB로 안드로이드 기기 연결
2. Chrome에서 chrome://inspect/#devices 방문
3. 원격 검사 활성화
4. 터치 이벤트 테스트
```

#### 모바일 체크리스트
- [ ] 터치로 궁 선택 가능
- [ ] 스크롤 부드러움
- [ ] 차트 레이아웃 반응형 (모바일 크기에 맞음)
- [ ] 텍스트 가독성 (너무 작지 않음)
- [ ] 성능 (30 FPS 이상)

### 3.3. 엣지 케이스 테스트

#### 테스트 날짜들
```
입력 형식: (년, 월, 일, 시, 분)
```

**테스트 Case 1: 한국 표준시 기준일**
```javascript
calcZiweiPalaces(1997, 2, 10, 14, 0)
// 예상: 을축년 정월 초삼일 오후 2시
// 검증: 자미 위치, 12궁 정렬 확인
```

**테스트 Case 2: 음력 윤월**
```javascript
calcZiweiPalaces(2000, 5, 1, 12, 0)  // 윤5월이 있는 연도
// 검증: isLeap 플래그 확인
```

**테스트 Case 3: 하루 시간대별**
```javascript
calcZiweiPalaces(2020, 6, 15, 0, 0)   // 자시(자정)
calcZiweiPalaces(2020, 6, 15, 6, 0)   // 인시
calcZiweiPalaces(2020, 6, 15, 12, 0)  // 오시(정오)
calcZiweiPalaces(2020, 6, 15, 18, 0)  // 유시
// 검증: 시지 변화에 따른 궁 위치 변화
```

---

## 4. 문제 진단

### 4.1. 함수가 없다는 에러 (Uncaught ReferenceError)

```javascript
Uncaught ReferenceError: getTenGod is not defined
```

**원인:**
1. 모듈이 로드되지 않음
2. 로드 순서 잘못됨 (saju-engine.js가 모듈보다 먼저 로드됨)

**해결:**
```
1. index.html에서 script 로드 순서 확인
2. saxAnalyzer.js와 ziwei-doushu.js가 saju-engine.js 이전에 로드되는지 확인
3. window.getTenGod 존재 여부 확인: console.log(window.getTenGod)
```

### 4.2. 계산 결과가 NaN

```javascript
getTenGod('甲', '己')
// Output: "십신값이 아닌 NaN"
```

**원인:**
1. GAN 데이터 미로드
2. 함수 인자 형식 오류

**해결:**
```javascript
// 1. GAN 데이터 확인
console.log(window.GAN);

// 2. 입력값 확인 (간단한 한자 확인)
console.log('甲' in window.GAN);  // true여야 함

// 3. 함수 소스 확인
console.log(getTenGod.toString());
```

### 4.3. 자미두수 차트가 빈 화면

**원인:**
1. calcZiweiPalaces 실패
2. HTML 렌더링 실패
3. CSS 로드 실패

**진단:**
```javascript
// 1. 함수 호출 확인
const result = calcZiweiPalaces(1997, 2, 10, 14, 0);
console.log(result);  // 객체가 나와야 함

// 2. 별 배치 확인
console.log('Stars:', result.stars);  // 12개 배열이어야 함

// 3. DOM 확인
console.log(document.getElementById('zweiChart'));  // 요소 확인
```

---

## 5. 성능 벤치마크

### 5.1. Lighthouse 측정

#### 설정
```
Throttling: Fast 3G
Mobile emulation: Enabled
Cache: Disabled
```

#### 측정 대상
```
✅ Performance (성능)
✅ Accessibility (접근성)
✅ Best Practices (권장 사항)
✅ SEO
✅ PWA (Progressive Web App)
```

#### Phase 5 이전 예상값 vs After
| 메트릭 | Before | After | Expected Gain |
|------|--------|-------|----------------|
| Largest Contentful Paint (LCP) | ~2.5s | ~2.3s | -8% |
| First Input Delay (FID) | ~50ms | ~48ms | -4% |
| Cumulative Layout Shift (CLS) | 0.15 | 0.15 | 0% (CSS unchanged) |
| Bundle Size | ~150KB | ~145KB | -3.3% (559L removed) |

### 5.2. Chrome DevTools Performance Tab

```
Steps:
1. F12 → Performance 탭
2. Start Recording
3. 사용자 상호작용 수행 (1분)
4. Stop Recording
5. 결과 분석
```

**측정 항목:**
- Main thread 활동 (CPU%)
- FPS (프레임 레이트)
- Rendering time
- Event handling time

---

## 6. 테스트 결과 제출

### 6.1. 성공 기준

```
✅ PASS THRESHOLD (모두 해당)
- 모든 제거 함수가 전역 namespace에서 접근 가능
- 자미두수 차트 정상 렌더링
- 십신/조후/종격 계산이 이전과 동일한 결과 도출
- 브라우저 콘솔에 에러 없음 (warnings 무시)
- 모바일 터치 이벤트 작동
- 성능 저하 < 5%

✅ CONDITIONAL PASS
- 일부 엣지 케이스에서 minor 에러가 있으나 주요 기능은 정상
- → Phase 7에서 추가 디버깅

❌ FAIL THRESHOLD
- 자미두수 차트 로드 실패
- getTenGod/calcZiweiPalaces 미작동
- 콘솔 에러 > 5개
- 계산 결과 이전과 다름
```

### 6.2. 이슈 리포팅 형식

```markdown
## [PHASE 6] Issue Report

### 이슈 제목
_____

### 심각도
- [ ] Critical (기능 불가)
- [ ] High (부분 불가)
- [ ] Medium (결과 오류)
- [ ] Low (성능/UI)

### 재현 절차
1. ...
2. ...
3. ...

### 예상 결과
_____

### 실제 결과
_____

### 스크린샷/콘솔 에러
_____

### 영향 범위
- [ ] Ziwei chart
- [ ] Ten Gods
- [ ] Temperature/Moisture
- [ ] Jonggyeok detection
- [ ] Mobile interaction
```

---

## 7. 다음 단계 (Phase 7)

Phase 6 검증 완료 후:
- [ ] Phase 7: 성능 측정 & 최적화 보고서 생성
- [ ] Phase 8: 추가 dead code 스캔 (evalStar, calcDahuan 등)
- [ ] Phase 9: 번들 최적화 (tree-shaking, minification)

---

## 8. 참고 자료

**주요 함수 문서:**
- [getTenGod](./docs/) - 십신 계산
- [calcZiweiPalaces](./docs/) - 자미두수 배궁
- [analyzeJohu](./docs/) - 조후 분석

**모듈 위치:**
- `js/services/sajuAnalyzer.js` - getTenGod, analyzeJohu, calcPower, detectJong
- `js/engines/ziwei-doushu.js` - calcZiweiPalaces, evalStar, calcDahuan, buildZiweiChart

**설정 파일:**
- `index.html` - 스크립트 로드 순서
- `app/page.js` (또는 Next.js 엔트리) - 메인 로직

---

*Phase 6 Runtime Validation Guide v1.0*  
*Last Updated: 2026-03-14*  
*Status: Ready for Testing* ✅
