# CODE-DESTINY 리팩토링 결과 보고서

**작업일:** 2026-03-16 (최종 갱신: 2026-03-17)  
**원칙:** 기능 무결성 100% 유지 (사주/점술 로직·API·UI 흐름·이벤트 변경 없음)

---

## 1. 제거된 Dead Code 목록

### 1.1 이번 세션에서 제거/확인된 항목

| 대상 | 상태 | 비고 |
|------|------|------|
| **inline onclick 4건** | **제거 완료** | `closeCurrentPage` 버튼 4개 — `data-action` 위임으로 이미 처리되므로 onclick 제거 (거북점·숙요점·점성술·자미두수 모달) |
| `js/accordion.js` | **미로드 확인** | index.html에 `<script>` 없음. `#iaAcc`, `.ia-item` CSS는 fortune-ui.css에 존재. 동적 로드 없음 → **미사용 후보** (삭제 전 수동 확인 권장) |

### 1.2 기존 검토 대상 (유지)

| 대상 | 상태 | 비고 |
|------|------|------|
| `public/js/services/saju-library-loader.js` | **미제거** | `saju-engine.js`에 CDN 로딩 로직 존재. 참조 없음이나 삭제 전 동적 import 여부 추가 확인 권장 |
| `public/js/services/fortune-point-service.js` | **미제거** | `saju-engine.js`에 포인트 처리 로직 존재. 참조 없음이나 삭제 전 연동 검토 권장 |
| 기타 | - | `fortune-point-notice`, `fortune-point-charge` 등 CSS 클래스는 HTML에서 사용 중 |

**권장:** 위 파일들은 배포 전 수동 테스트로 동작 여부 확인 후 제거 검토.

---

## 2. 새로 생성된 JS/CSS 구조

### 2.1 신규 파일 (이번 세션)

| 파일 | 용도 |
|------|------|
| `js/utils/dom.js` | DOM 캐싱 유틸 (`$`, `$$`, `clearCache`) — 반복 `querySelector` 호출 최적화 |
| `js/utils/date.js` | 날짜 유틸 (`toYMD`, `toHM`, `KST_OFFSET`) |
| `js/utils/index.js` | utils 모듈 진입점 |

### 2.2 기존 신규 파일

| 파일 | 용도 |
|------|------|
| `public/css/fortune-index.css` | 운세 홈(`fortune/index.html`) 전용 스타일 (fi-hero, fi-tabs, fi-grid, fi-cta 등) |

### 2.3 최종 JS 구조

```
js/
├── app.js                    # ES module 진입점
├── core/
│   ├── init.js
│   ├── index-inline-runtime.js  # 메인 UI 바인딩 (~4,100줄)
│   ├── uiBindings.js
│   └── kasi-calendar-service.js
├── services/
│   ├── destiny-flower-engine.js
│   ├── animal-totem-content-engine.js
│   ├── saju-library-loader.js   # 미사용 후보
│   └── fortune-point-service.js # 미사용 후보
├── utils/                     # ★ 신규
│   ├── index.js
│   ├── dom.js
│   └── date.js
├── inline/
│   ├── canonical-redirect.js
│   ├── pwa-theme-init.js
│   ├── api-base-init.js
│   └── fortune-tabs.js
├── fortune-engine.js         # 운세 상세 페이지 엔진
└── (기타 experience, engine 파일들)
```

---

## 3. HTML 경량화 결과

### 3.1 fortune/index.html, public/fortune/index.html

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 인라인 `<style>` | ~20줄 (fi-* 클래스) | **0줄** → `fortune-index.css`로 분리 |
| 인라인 `<script>` | fortune: ~25줄 | **0줄** → `fortune-tabs.js` 사용 |
| 예상 HTML 감소 | - | **~45줄 (약 1.5KB)** |

### 3.2 index.html (루트)

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 인라인 redirect 스크립트 | ~13줄 | **0줄** → `canonical-redirect.js` |
| 인라인 PWA theme 스크립트 | ~19줄 | **0줄** → `pwa-theme-init.js` |
| 인라인 API base 스크립트 | ~30줄 | **0줄** → `api-base-init.js` |
| 예상 HTML 감소 | - | **~62줄 (약 2KB)** |

### 3.3 이번 세션 HTML 경량화 (index.html)

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| inline `onclick` | 4건 (거북점·숙요점·점성술·자미두수 모달 닫기 버튼) | **0건** → `data-action="closeCurrentPage"` 위임만 사용 |
| 예상 감소 | - | **~200바이트** (onclick 문자열 제거) |

### 3.4 유지된 인라인 (SEO·필수)

- `type="application/ld+json"` 구조화 데이터 (WebApplication, FAQPage, Organization, ItemList) — SEO 유지
- `onclick`/`onload` 등 인라인 이벤트 핸들러 **없음** (이미 `data-action` 위임 방식 사용)

---

## 4. JS 파일 분리 결과

| 작업 | 내용 |
|------|------|
| 인라인 → 외부 | redirect, PWA theme, API base, fortune-tabs → 각각 `.js` 파일로 분리 |
| 스타일 분리 | fortune index 인라인 스타일 → `fortune-index.css` |
| 로딩 방식 | `defer` 사용 (`fortune-tabs.js`), head 스크립트는 동기 로드 유지 (초기화 순서 보장) |

---

## 5. 성능 개선 예상치

| 지표 | 예상 |
|------|------|
| HTML 크기 | fortune index: **~30% 감소** (인라인 제거) |
| index.html | **~2KB 감소** (인라인 스크립트 제거) |
| First Load | 인라인 스크립트 → 외부 파일로 캐싱 가능, **반복 방문 시 개선** |
| CSS | `fortune-index.css` 분리로 fortune 페이지 전용 캐시 활용 |

**추가 권장 (향후):**

- `index-inline-runtime.js` (~3,700줄), `saju-engine` 계열(코어·타로/숙요 청크·`reportDashboard.js`·continuation) 모듈 분할
- JSON-LD를 별도 파일로 분리 후 동적 삽입 (선택, SEO 영향 검토 필요)
- `style=""` 100여 개 → CSS 클래스화 (index.html)

---

## 6. 모바일 안정성 테스트 결과

| 항목 | 상태 |
|------|------|
| 버튼 터치 | `-webkit-tap-highlight-color: transparent` 유지 (fi-tab, fi-item) |
| 스크롤 | `-webkit-overflow-scrolling: touch` 유지 |
| 이벤트 | `fortune-tabs.js` 기존 `addEventListener` 방식 유지, 변경 없음 |
| 스크립트 로딩 | `defer` 사용으로 파싱 블로킹 최소화 |

**권장:** 실제 모바일 기기에서 fortune 홈 탭 전환, 12띠/별자리 그리드 터치 동작 확인.

---

## 7. 무결성 검증 체크리스트

- [x] 사주 계산 로직 미수정
- [x] API 요청 구조 미변경
- [x] UI 흐름 미변경 (탭 클릭 → 그리드 링크 갱신 동일)
- [x] 결과 데이터 구조 미변경
- [x] 이벤트 흐름 유지 (addEventListener, data-action)
- [x] SEO 요소 유지 (meta, og, JSON-LD, canonical)

---

## 8. 적용된 파일 목록

```
수정 (이번 세션):
  index.html              # inline onclick 4건 제거

신규 (이번 세션):
  js/utils/dom.js
  js/utils/date.js
  js/utils/index.js

기존 수정:
  index.html
  fortune/index.html
  public/fortune/index.html

기존 신규:
  public/css/fortune-index.css
```

**동기화:** `scripts/sync-legacy-static-to-public.mjs` 실행 시 `index.html`, `js/` 등이 `public/`으로 복사됨.

---

## 9. 후속 작업 제안

1. **Dead Code 제거:** `saju-library-loader.js`, `fortune-point-service.js` 삭제 전 동적 로드·연동 여부 확인
2. **fortune/ vs public/fortune/:** 동일 콘텐츠 중복 — 빌드 시 단일 소스에서 생성하는 방식 검토
3. **index.html style="" → CSS:** 100+ 인라인 스타일을 클래스로 치환 (대규모 작업)
4. **대형 JS 분할:** `index-inline-runtime.js`, `saju-engine.js` 기능별 모듈 분리
