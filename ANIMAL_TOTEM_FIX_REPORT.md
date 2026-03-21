# 애니멀 토템 기능 수정 보고서

## 문제 분석

### 발견된 문제점
1. **URL 쿼리 파라미터 미지원**: `/?action=openAnimalTotemModal` 형태의 액션 파라미터가 처리되지 않음
2. **라우팅 구조 불일치**: `serviceMap.js`에서 `/animal/totem`이 정보성 페이지(`FeatureLandingPage`)로만 매핑되고, 실제 기능(`AnimalTotem.tsx`)이 사용되지 않음
3. **레거시-Next.js 혼재**: 메인 화면은 레거시 HTML을 사용하면서 Next.js 라우터 액션을 전달할 메커니즘이 부재

### 기존 코드 동작 흐름
```
FeatureLandingPage (/animal/totem)
  ↓
"기능 바로 실행" 클릭
  ↓
/?action=openAnimalTotemModal 로 리다이렉트 (레거시 HTML로)
  ↓
❌ 액션 파라미터 미처리 → 아무것도 일어나지 않음
```

---

## 해결 방안

### 수정 내용

#### 1. index.html 수정 (줄 3580~3630)
- Phase 6-7 검증 스크립트 다음에 새로운 액션 파라미터 핸들러 추가
- **파일**: `c:\Users\Neo\Desktop\CODE-DESTINY-main\index.html`

```javascript
<!-- ✅ URL 쿼리 파라미터 액션 처리 (/?action=openAnimalTotemModal 등) -->
<script>
(function initActionParamHandler(){
  function handleActionParam(){
    try {
      var params = new URLSearchParams((window.location.search || '?').slice(1));
      var action = params.get('action');
      
      if(!action) return;
      
      // 필요한 스크립트가 로드될 때까지 대기하는 재시도 로직
      var retries = 0;
      var maxRetries = 30; // 최대 3초 (100ms * 30)
      
      function tryInvokeAction(){
        if(typeof window[action] === 'function'){
          try {
            console.log('[action-param] Invoking: ' + action);
            window[action]();
            // 성공하면 clean-up (주소창에서 파라미터 제거)
            if(window.history && window.history.replaceState){
              window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
            }
            return;
          } catch(e){
            console.error('[action-param] Invocation error: ' + action, e);
            return;
          }
        }
        
        if(retries < maxRetries){
          retries += 1;
          setTimeout(tryInvokeAction, 100);
          return;
        }
        
        console.warn('[action-param] Function not found after retries: ' + action);
      }
      
      // document.readyState 확인 후 시작
      if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', tryInvokeAction, { once: true });
      } else {
        tryInvokeAction();
      }
    } catch(err){
      console.error('[action-param] Handler error:', err);
    }
  }
  
  // 페이지 로드 후 실행 (스크립트들이 로드될 시간 확보)
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(handleActionParam, 500);
    }, { once: true });
  } else {
    setTimeout(handleActionParam, 500);
  }
})();
</script>
```

#### 2. public/index.html 수정 (줄 3411~3461)
- 동일한 액션 파라미터 핸들러 추가
- **파일**: `c:\Users\Neo\Desktop\CODE-DESTINY-main\public\index.html`

---

## 해결 후 동작 흐름

### 경로 1: 타일 직접 클릭
```
메인 페이지 애니멀 토템 타일
  ↓
data-action="openAnimalTotemModal"
  ↓
index-inline-runtime.js의 __cdBindAnimalTotemTileDirect() 감지
  ↓
openAnimalTotemModal() 함수 호출
  ↓
✅ 모달 열림
```

### 경로 2: 랜딩 페이지 → 쿼리 파라미터 (이제 수정됨)
```
FeatureLandingPage (/animal/totem)
  ↓
"기능 바로 실행" 클릭
  ↓
/?action=openAnimalTotemModal 리다이렉트
  ↓
initActionParamHandler() 실행
  ↓
window.openAnimalTotemModal() 호출 (500ms 지연 후)
  ↓
✅ 모달 열림
```

### 경로 3: 직접 URL 접근
```
사용자가 /?action=openAnimalTotemModal 직접 입력
  ↓
페이지 로드
  ↓
initActionParamHandler() → window.openAnimalTotemModal() 호출
  ↓
✅ 모달 자동 열림
```

---

## 핵심 기술 상세

### 액션 파라미터 핸들러의 특징

1. **자동 스크립트 대기**: 
   - 필요한 JS 파일(`animal-totem-content-engine.js`, `animal-totem-experience.js`)이 아직 로드되지 않았을 가능성을 대비
   - `maxRetries=30` (최대 3초)까지 재시도

2. **안전한 실행**:
   - 함수가 존재하는지 사전 확인 후 호출
   - 에러 발생 시 콘솔에 로깅하되 페이지 전체 중단 방지

3. **URI 정리**:
   - 성공 후 `history.replaceState()`로 주소창에서 쿼리 파라미터 제거
   - 사용자 인식 개선

---

## 테스트 방법

### 1. 직접 호출 테스트
```javascript
// DevTools 콘솔에서
window.openAnimalTotemModal()
```
**예상 결과**: 애니멀 토템 모달이 열림

### 2. 쿼리 파라미터 테스트
브라우저 주소창에 다음 입력:
```
https://code-destiny.com/?action=openAnimalTotemModal
```
**예상 결과**: 페이지 로드 후 약 0.5초 내에 모달 자동 열림

### 3. 랜딩 페이지 테스트
1. `https://code-destiny.com/animal/totem` 접속
2. "기능 바로 실행" 버튼 클릭
3. **예상 결과**: 모달 열림

### 4. 타일 클릭 테스트
1. 메인 페이지 (`https://code-destiny.com/`) 접속
2. 애니멀 토템 타일 클릭
3. **예상 결과**: 모달 열림

---

## 관련 파일 목록

| 파일 | 용도 |
|------|------|
| `index.html` | 메인 HTML (프로덕션) |
| `public/index.html` | 대체 레거시 HTML |
| `js/animal-totem-experience.js` | 모달 UI 제어 |
| `js/services/animal-totem-content-engine.js` | 동물 데이터 & 콘텐츠 엔진 |
| `app/AnimalTotem.tsx` | React 컴포넌트 (직접 사용 안 함) |
| `app/_lib/serviceMap.js` | 라우팅 설정 |
| `test-animal-totem.html` | 테스트 페이지 |

---

## 추가 개선 사항 (향후)

1. **라우팅 통일화**: `serviceMap.js`에서 `animal/totem`을 `AnimalTotem.tsx` 컴포넌트로 직접 매핑
2. **전역 액션 레지스트리**: 쿼리 파라미터로 지원할 모든 액션을 중앙에서 관리
3. **Deep Linking**: 모달 상태(예: 선택된 카드 수)를 URL에 반영

---

**수정 완료 날짜**: 2026-03-22  
**검증**: `/?action=openAnimalTotemModal` 쿼리 파라미터로 애니멀 토템 모달 자동 오픈 기능 정상 작동 확인
