# 성능 리팩토링 보고서 — 로딩 속도 & 스크롤 반응 개선

**작업일**: 2026-03-16  
**목표**: HTML 경량화, JS 모듈화, Dead Code 제거, 로딩 속도 최적화, SEO 유지, 모바일 터치 안정성 유지

---

## 1. 제거된 Dead Code / 중복 로직

| 항목 | 위치 | 내용 |
|------|------|------|
| **이미지 loading/decoding 중복** | `js/touch-perf.js` | `touch-perf`가 전체 이미지에 `loading`/`decoding` 설정하던 로직 제거. `mobile-performance-bootstrap.js`의 `setupImageOptimization`이 단일 책임으로 처리 (chunked 처리, fetchpriority, img-ph 클래스 포함) |
| **data-src lazy load만 유지** | `js/touch-perf.js` | `data-src` 속성이 있는 이미지에 대한 IntersectionObserver만 유지. `data-src`가 없는 이미지는 bootstrap에서 처리 |
| **RAF 무한 루프** | `js/fsn-navbar.js` | `requestAnimationFrame(tick)` 무한 루프 제거 → 스크롤/리사이즈 이벤트 기반으로 변경 |

---

## 2. 스크롤 반응 개선 (핵심)

### 2.1 fsn-navbar.js — 스크롤 진행률 리본

**기존**: `requestAnimationFrame` 무한 루프로 매 프레임(60fps) DOM 업데이트  
**변경**: 스크롤/리사이즈 이벤트 시에만 `requestAnimationFrame` 1회 실행

```javascript
// 기존: 매 프레임 실행 → 메인 스레드 과부하
function tick() {
  progressEl.style.width = pct + '%';
  rafId = requestAnimationFrame(tick);  // 무한 루프
}
tick();

// 변경: 스크롤/리사이즈 시에만 업데이트
window.addEventListener('scroll', requestProgressUpdate, { passive: true });
window.addEventListener('resize', requestProgressUpdate, { passive: true });
```

**효과**: 스크롤 시 메인 스레드 부하 감소, 스크롤 지연 완화

### 2.2 resize 핸들러 RAF 쓰로틀링

| 파일 | 적용 내용 |
|------|----------|
| `js/core/index-inline-runtime.js` | `syncFeatureCardHeight` resize 호출에 RAF 쓰로틀링 적용 |
| `js/saju-engine.js` | `syncReportBlockHeight` resize 호출에 RAF 쓰로틀링 적용 |

---

## 3. HTML 경량화

### 3.1 Blocking 스크립트 → Defer 전환

| 스크립트 | 기존 | 변경 |
|----------|------|------|
| `js/kill-switch.js` | Sync (blocking) | `defer` |
| `js/inline/api-base-init.js` | Sync (blocking) | `defer` |
| `js/inline/canonical-redirect.js` | Sync | 유지 (리다이렉트는 파싱 전 실행 필요) |
| `js/inline/pwa-theme-init.js` | Sync | 유지 (favicon 렌더 전 실행 필요) |

**효과**: HTML 파싱 블로킹 감소, First Paint 개선

### 3.2 Canonical 리다이렉트 수정

- **기존**: `/public/index.html`로 리다이렉트 (잘못된 경로)
- **변경**: `/index.html`로 리다이렉트

---

## 4. JS 파일 변경 요약

| 파일 | 변경 내용 |
|------|----------|
| `js/fsn-navbar.js` | RAF 무한 루프 제거, 스크롤/리사이즈 이벤트 기반으로 전환 |
| `js/touch-perf.js` | 이미지 loading/decoding 중복 제거, data-src lazy load만 유지 |
| `js/core/index-inline-runtime.js` | resize 핸들러 RAF 쓰로틀링 |
| `js/saju-engine.js` | resize 핸들러 RAF 쓰로틀링 |
| `js/inline/canonical-redirect.js` | 리다이렉트 대상 경로 수정 |
| `index.html` | kill-switch, api-base-init에 defer 추가 |

---

## 5. 성능 개선 예상치

| 항목 | 예상 효과 |
|------|----------|
| **First Load** | blocking 스크립트 2개 defer → HTML 파싱 지연 감소 |
| **스크롤 반응** | fsn-navbar RAF 무한 루프 제거 → 스크롤 시 메인 스레드 부하 감소 |
| **resize 반응** | RAF 쓰로틀링 → 리사이즈 시 불필요한 리플로우 감소 |
| **이미지 처리** | 중복 처리 제거 → 초기 로딩 시 DOM 순회 1회로 축소 |

---

## 6. 모바일 안정성 유지

- **passive 이벤트**: scroll, resize, touchstart 등 모두 `{ passive: true }` 유지
- **터치 피드백**: `touch-perf.js`의 `is-touching` 클래스, 햅틱 피드백 유지
- **GPU 안전 모드**: `mobile-performance-bootstrap.js`의 `mobile-gpu-lite` 적용 유지
- **기능 무결성**: 사주 계산, API, UI 흐름, 이벤트 바인딩 변경 없음

---

## 7. SEO 유지

- meta description, title, og tag, structured data 유지
- canonical, hreflang 유지
- canonical 리다이렉트 수정으로 올바른 경로 유지

---

## 8. 테스트 권장 사항

1. **모바일**: 버튼 터치, 스크롤, 모달 열기/닫기
2. **데스크탑**: 스크롤 진행률 리본, 결과 페이지 표시
3. **리다이렉트**: 비정규 도메인 접속 시 `/index.html`로 이동 확인
4. **테마**: neo/samba 모드 전환 시 favicon 정상 표시 확인
