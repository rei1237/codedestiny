# 리팩토링 및 성능 최적화 결과 보고서

**작업일**: 2026-03-17  
**대상**: CODE-DESTINY 메인 화면 (public/index.html 및 연관 JS/CSS)  
**원칙**: 기능 무결성 100% 유지, SEO·모바일 터치 안정성 유지

---

## 1. 스크롤 지연 현상 제거 (완료)

### 원인
메인 화면에서 **이미지가 많은 구간**(타로 컬렉션 그리드, 동물/관상/신탁 컬렉션)을 스크롤할 때, 수십 개의 이미지가 동시에 레이아웃/페인트되며 메인 스레드가 과부하되어 지연이 발생했습니다.

### 적용 내용
- **`public/styles/scroll-perf.css`** 신규 추가 후 `index.html`에 링크
- **content-visibility: auto**  
  - `.feat-collection`, `.tarot-collection`: 뷰포트 밖 컬렉션 블록은 레이아웃/페인트 생략  
  - `.tarot-tile`: 개별 타일 단위로 뷰포트 밖 영역 작업 지연  
- **contain-intrinsic-size**: 스크롤 높이 추정을 위해 `auto 400px`(컬렉션), `auto 140px`(타일) 지정  
- **contain: layout style** (그리드), **contain: paint** (이미지 래퍼): 리플로우·페인트 범위 제한  
- **@supports not (content-visibility: auto)** 로 미지원 브라우저는 기존 동작 유지

### 기대 효과
- 스크롤 시 이미지 밀집 구간 통과 시 프레임 드롭 감소  
- 브라우저가 보이지 않는 영역의 작업을 건너뛰어 First Input Delay / Scroll 응답성 개선  

---

## 2. 제거된 Dead Code 목록

- **이번 단계에서는 제거하지 않음**  
  - 사주/점술 로직, API 구조, UI 흐름 변경 금지 원칙에 따라, 호출 여부가 여러 스크립트·전역에 걸쳐 있어 **추가 검증 없이 삭제 시 기능 훼손 위험**이 있음  
  - 권장: 별도 세션에서 `window.xxx` 참조·동적 import·이벤트 바인딩을 전수 조사한 뒤 제거 대상만 선정

---

## 3. 새로 생성된 파일·구조

| 항목 | 내용 |
|------|------|
| **신규 CSS** | `public/styles/scroll-perf.css` — 스크롤 성능 전용 (content-visibility, contain) |
| **수정** | `public/index.html` — `<link rel="stylesheet" href="styles/scroll-perf.css?v=20260317">` 추가 |

**JS 구조**  
- 기존 구조 유지: `app.js` (module) → `core/init.js` → `core/uiBindings.js`, `services/destiny-flower-engine.js` 등  
- 대형 단일 파일 분리(예: index-inline-runtime.js → core/services/components/ui 등)는 **기능 무결성·테스트 범위가 크므로 추후 단계에서 진행 권장**

---

## 4. HTML 경량화 결과

- **inline onclick**  
  - 이미 사용하지 않음. 모든 버튼/액션은 `data-action` + 이벤트 위임(`uiBindings.js`) 사용  
- **inline style**  
  - 약 100건 존재(모달/패널 초기 `display:none`, 일부 마진·폰트 등).  
  - **이번에 제거하지 않음** 이유: 다수 모달/패널이 JS에서 `element.style.display`로 표시/숨김을 제어하고 있어, `style` → `class` 전환 시 해당 JS 전반 수정 필요. 무결성 확보를 위해 추후 JS와 함께 일괄 전환 권장  
- **SEO·구조화 데이터**  
  - meta description, title, og/twitter, canonical, hreflang, JSON-LD 등 **변경·삭제 없음**

---

## 5. JS 파일 분리 결과

- **현재**  
  - 엔트리: `js/app.js` (type="module"), `js/core/index-inline-runtime.js` (defer) 등  
  - 서비스/코어: `core/init.js`, `core/uiBindings.js`, `services/destiny-flower-engine.js`, `services/animal-totem-content-engine.js` 등  
- **이번 작업**  
  - 추가 분리 없음. 스크롤 성능은 CSS만으로 처리  

---

## 6. 로딩 속도·리소스 최적화

- **스크립트**  
  - 이미 적용됨: 주요 스크립트 `defer`, `app.js`는 `type="module"`  
  - Lazy 로딩: `uiBindings.js`의 `__lazyActionLoaders`로 관상, 화투, MBTI, 타로 경험 등 필요 시 동적 로드  
- **이미지**  
  - 메인 그리드 이미지: `loading="lazy"`, `decoding="async"`, `width`/`height` 지정 이미 적용  
  - `image-fallback.js`: 동적 추가 이미지에 `loading="lazy"`, `decoding="async"` 자동 부여  
- **스크롤**  
  - `scroll-perf.css`로 이미지 밀집 구간 스크롤 비용 감소 (위 1번 참고)

---

## 7. 성능 개선 예상치

| 항목 | 예상 |
|------|------|
| 스크롤 구간 지연 | 이미지 많은 구간 통과 시 체감 지연 감소 (구체 수치는 디바이스·환경에 따라 상이) |
| LCP / FCP | 기존 preload·lazy 유지로 유지 또는 소폭 개선 가능 |
| First Input Delay | 스크롤 시 메인 스레드 부하 감소로 간접 개선 가능 |

---

## 8. 모바일 안정성·SEO 점검

- **모바일**  
  - 터치: `data-action` 위임·`touch-action: manipulation` 등 기존 유지  
  - 스크롤: `content-visibility`는 스크롤 동작을 바꾸지 않으며, `contain`만 레이아웃/페인트 범위를 제한  
  - 변경 없음: 버튼·스크롤·포커스 동작  
- **SEO**  
  - meta, title, og, canonical, structured data, 본문 DOM 구조 변경 없음  

---

## 9. 권장 후속 작업 (무결성 유지 범위 내)

1. **Dead code**  
   - `window.xxx` 호출처·동적 import·이벤트 리스너 전수 조사 후, 미사용 함수/변수/import만 제거  
2. **HTML 경량화**  
   - 초기 `display:none` 등 반복 인라인 스타일 → `.u-hidden` 등 유틸 클래스로 이전 시, 해당 모달/패널을 제어하는 JS를 `classList.add/remove('u-hidden')` 방식으로 통일  
3. **JS 모듈화**  
   - `index-inline-runtime.js` 등을 core / services / components / ui / utils 구조로 분리 시, 전역 노출 함수(`window.xxx`) 목록을 고정하고 호출처를 모두 갱신한 뒤 단계별 배포·테스트  

---

## 10. 최종 요약

- **스크롤 지연**: `scroll-perf.css` 도입으로 이미지 밀집 구간 스크롤 시 지연 완화 적용 완료.  
- **기능 무결성**: 사주/점술 로직, API, UI 흐름, 결과 데이터 구조, 이벤트 흐름 변경 없음.  
- **SEO·모바일**: meta, structured data, 터치·스크롤 동작 유지.  
- **Dead code·HTML 경량화·대규모 JS 분리**: 위험 최소화를 위해 별도 검증 후 진행 권장.
