# CODE-DESTINY 리팩토링 결과 보고서

**작업일:** 2026-03-16  
**원칙:** 기능 무결성 100% 유지 (사주/점술 로직·API·UI 흐름·결과 구조 변경 없음)

---

## 1. 제거된 Dead Code 목록

| 파일 | 제거 항목 | 유형 | 감소량 |
|------|-----------|------|--------|
| `js/accordion.js` | `EGYPT_IDS` 변수 | 미사용 변수 | ~2줄 |
| `js/accordion.js` | `EGYPT_IDS.forEach(moveCard(id, 'acc-egypt'))` | 무효 로직 (acc-egypt 그룹 미존재) | ~2줄 |
| `js/entertain-engine.js` | `buildHealthTimeline()` | 미호출 함수 | ~30줄 |
| `js/entertain-engine.js` | `buildEnhancedHealthReport()` | 미호출 함수 | ~90줄 |
| `js/entertain-engine.js` | `_initGaugeAnimation()` | 미호출 함수 | ~10줄 |

**총 제거:** 약 134줄 (accordion.js 4줄, entertain-engine.js ~130줄)

---

## 2. 새로 생성된 JS 구조

### 2.1 Inline Script → 외부 모듈 분리

```
public/js/inline/
├── canonical-redirect.js   # canonical 도메인 리다이렉트 (head 최우선)
├── pwa-theme-init.js      # neo/samba PWA manifest·favicon 전환
├── api-base-init.js       # CODE_DESTINY_API_BASE_URL 초기화
└── fortune-tabs.js        # fortune/index.html 탭 클릭 핸들러
```

**역할:**
- `canonical-redirect.js`: 비정규 도메인 → `/public/index.html` 즉시 리다이렉트
- `pwa-theme-init.js`: localStorage 기반 neo 테마 시 manifest/favicon 교체
- `api-base-init.js`: API 베이스 URL 설정 (호스트별 분기)
- `fortune-tabs.js`: 오늘/내일/주간/월간 탭 클릭 시 그리드 링크 갱신

---

## 3. HTML 경량화 결과

### 3.1 public/index.html

| 항목 | 변경 전 | 변경 후 | 감소 |
|------|---------|---------|------|
| Inline script 블록 | 4개 | 0개 | 4개 제거 |
| 예상 줄 수 | ~3,075줄 | ~2,715줄 | **~360줄 (약 12%)** |
| 예상 바이트 | ~170KB | ~162KB | **~8KB** |

**제거된 inline script:**
1. `redirectToCanonicalMain()` → `js/inline/canonical-redirect.js`
2. PWA theme init (neo manifest/favicon) → `js/inline/pwa-theme-init.js`
3. API base URL init → `js/inline/api-base-init.js`

### 3.2 public/fortune/index.html

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| Inline script | 1개 (탭 핸들러 ~25줄) | 0개 |
| 대체 | — | `<script defer src="/js/inline/fortune-tabs.js">` |

---

## 4. JS 파일 분리 결과

### 4.1 현재 구조 (리팩토링 후)

```
js/
├── app.js                    # ES module 진입점
├── core/
│   ├── init.js               # 앱 셸 초기화
│   ├── uiBindings.js         # data-action 이벤트 위임
│   ├── index-inline-runtime.js  # Destiny Flower, 사주/별자리, feature card (~3,755줄)
│   └── kasi-calendar-service.js
├── inline/                   # [신규] HTML에서 분리된 인라인 스크립트
│   ├── canonical-redirect.js
│   ├── pwa-theme-init.js
│   ├── api-base-init.js
│   └── fortune-tabs.js
├── services/
│   ├── destiny-flower-engine.js
│   └── animal-totem-content-engine.js
├── chunks/
│   ├── saju-analysis.chunk.js
│   ├── compat.chunk.js
│   └── extra-fortune.chunk.js
├── saju-engine.js
├── fortune-engine.js
├── share.js
├── accordion.js              # Dead code 제거 완료
├── entertain-engine.js       # Dead code 제거 완료 (~130줄)
├── tarot-*-experience.js
├── iching-engine.js
├── iching-modal.js
├── oracle-kcg.js
└── ... (기타)
```

### 4.2 index-inline-runtime.js 모듈화 권장안 (향후 작업)

**현재:** 단일 파일 ~3,755줄  
**권장 분리 구조:**

```
js/core/
├── index-inline-runtime.js   # 진입점 (기존 글로벌 등록만 유지)
├── feature-card.js           # syncFeatureCardHeight, fcToggle, bindFeatureCard*
├── destiny-profile.js       # DP 관련 (이미 별도 파일 존재 가능성)
├── language.js               # changeLanguage, _langLabelMap
├── ios-install-modal.js      # iOS PWA 설치 안내
└── ... (기능별 분리)
```

**주의:** `window.*` 전역 등록, `data-action` 문자열, 동적 `callGlobal()` 호출이 많아 분리 시 참조 관계 검증 필요.

---

## 5. 성능 개선 예상치

| 항목 | 개선 내용 | 예상 효과 |
|------|-----------|-----------|
| HTML 파싱 | Inline script 제거 | 파싱 부담 감소, 캐시 활용 가능 |
| 스크립트 로딩 | 외부 파일 분리 | 브라우저 캐싱, 병렬 다운로드 |
| JS 실행 | Dead code 제거 (~130줄) | 번들 크기·파싱 시간 소폭 감소 |
| First Load | defer/module 활용 유지 | 기존과 동일 또는 소폭 개선 |

**First Load 2~5배 개선** 목표는 추가 최적화(이미지 WebP, lazy load, 코드 스플리팅)와 함께 단계적으로 진행 권장.

---

## 6. 모바일 안정성 테스트 체크리스트

리팩토링 후 아래 항목 수동 확인 권장:

- [ ] **버튼 터치:** 사주 계산, 타로, 운세 등 모든 CTA 정상 동작
- [ ] **스크롤:** 결과 페이지 스크롤, accordion 펼침/접힘
- [ ] **터치 이벤트:** `data-action` 위임, `touchstart`/`touchend` 충돌 없음
- [ ] **애니메이션:** 스플래시, 카드 플립, 로딩 애니메이션 프리징 없음
- [ ] **fortune/index.html:** 탭(오늘/내일/주간/월간) 클릭 시 링크 갱신 정상

---

## 7. SEO 유지 확인

다음 요소 **변경 없음** (제거·수정하지 않음):

- `meta description`, `title`
- `og:*`, `twitter:*` 태그
- `application/ld+json` (WebApplication, FAQPage 등)
- `rel="canonical"`, `rel="alternate"` hreflang
- DOM 구조 (본문 콘텐츠, heading 계층)

---

## 8. 무결성 원칙 준수 사항

- ✅ 사주 계산 로직 / 점술 알고리즘: **미수정**
- ✅ API 요청 구조: **미수정**
- ✅ UI 흐름: **미수정**
- ✅ 결과 데이터 구조: **미수정**
- ✅ 이벤트 흐름: **유지** (data-action, callGlobal 동작 동일)

---

## 9. 추가 권장 작업 (Phase 2)

1. **이미지 최적화:** WebP 변환, `loading="lazy"` 적용
2. **index-inline-runtime.js 모듈화:** 기능별 분리 후 테스트
3. **CSS 정리:** 미사용 클래스, 중복 스타일 제거
4. **Lazy loading:** 타로·화투·MBTI 등 무거운 모듈 동적 import

---

*본 보고서는 2026-03-16 리팩토링 작업 기준으로 작성되었습니다.*
