# Mobile Feature Detail Template — 계약

> 2026-07-28 개정. 이전 판(v20260701)은 이 래퍼를 **디자인 템플릿**으로 규정했고,
> 그 결과 18개 기능의 표면·타이포·헤더·닫기 버튼이 공통 스타일로 덮였다.
> 이 판은 래퍼를 **인체공학 층**으로 다시 규정한다.

## 1. 원칙

**모바일 최적화 = 탭이 잘 되고 화면에 맞는 것.** UI 재디자인이 아니다.
기능 화면은 모바일에서도 데스크탑과 같은 자기 디자인으로 보여야 한다.

- 적용 파일: `index.html`(정본, 미러 5개는 `npm run sync:public` 이 생성), `styles/mobile-lite.css`(+ `public/` 미러)
- 마커: `mobile-feature-detail-template-v20260701` (어노테이터 스크립트)
- 결제/잠금/로그인/운세 생성 로직: 변경 없음
- BGM/audio/video: 기능 상세 root 내부는 사용자 액션 전 `preload="none"` 유지
- 이미지: 기능 상세 root 내부 기본 `loading="lazy"`, `fetchpriority="low"` 보정

## 2. 경계 — 래퍼가 할 수 있는 일 / 없는 일

| 할 수 있다 (인체공학) | 할 수 없다 (재디자인) |
|---|---|
| 탭 타깃 `min-height:44px`, 주요 CTA 48px | 기능 소유 요소의 `color` / `background` / `border` |
| 입력 `font-size:16px` (iOS 자동 확대 방지) | `font-family` / `font-size` / `letter-spacing` / `line-height` |
| `max-width:100%`, `overflow-x:hidden` (가로 오버플로) | `position: sticky` / `fixed` (이름판·고정 닫기칩) |
| 세이프에어리어 패딩, 스크롤 컨테인 | `content: attr(...)` 로 마크업에 없는 배지 주입 |
| 닫기 버튼 **히트 영역** 44px | 닫기 버튼 **좌표** 이동 |
| 장식 레이어 `pointer-events:none` (탭 가로채기 방지) | `--cd-detail-*` 같은 공용 팔레트로 표면 재도색 |
| 액션 버튼 1열 스택 (390px 폭 맞춤) | 섹션에 카드 배경/테두리/라운드 씌우기 |

특정 기능의 모바일 문제는 **공용 래퍼가 아니라 그 기능의 CSS 에서** 고친다.

## 3. 속성 contract

| 속성 | 의미 |
|---|---|
| `data-component="MobileFeatureDetail"` | 모바일 기능 상세 화면 root |
| `data-mobile-detail-template="free\|paid\|consult"` | 기능 유형 (현재 CSS 소비처 없음 — 진단용) |
| `data-mobile-detail-shell="1"` | 세로 스크롤 컨테이너. 가로 오버플로만 막는다 |
| `data-mobile-detail-section="top\|start\|preview\|guide\|progress\|result"` | 구획 표식. 가로 오버플로 방지에만 쓰인다 |
| `data-mobile-detail-close="primary\|inline"` | `primary`=아이콘 ×(히트 영역 확대), `inline`=텍스트 CTA(건드리지 않음) |
| `data-mobile-detail-input="1"` | 입력 표식 |
| `data-mobile-detail-accordion="1"` | 최초 1회 접기 처리 완료 표식 (재적용 시 다시 닫지 않음) |
| `data-mobile-detail-keep-open` | 접기 제외 (마크업이 지정) |

**제거된 속성**: `data-mobile-detail-badge`(배지 주입), `data-mobile-detail-result-summary`(공용 요약칩).
배지·요약이 필요하면 기능이 자기 마크업에 직접 쓴다.

## 4. 적용 기능 (18)

`index.html` 어노테이터의 `registry` 가 정본이다. 항목당 `id` / `type` / `shell` / 섹션 셀렉터만 갖는다.

운명의 꽃 아틀리에 · 자기 기준 회복 타로 · 드림 프롬프트 · 정신분석 해몽 · 거북점 · 숙요점 ·
점성술 기본 차트 · 자미두수 · 명리학 타로 · 관계 타로 · 재회운 등대 타로 · 십이지신 천운 타로 ·
애니멀 토템 · 이집트 오라클 · 사주 결과 대시보드 · MBTI 궁합 · 카드 미리보기 · 이용권/결제

추가로 `#cdPaidFeatureGate`(권한/결제 확인)가 `annotateAll()` 에서 별도 처리된다.

## 5. 바텀시트

바텀시트 변형은 **원설계가 시트인 결제 UI 3종에만** 적용한다:
`#cdPaidFeatureGate` / `.cd-direct-payment-modal` / `.golden-grain-modal__card`.
일반 유료 기능을 시트로 바꾸던 규칙은 제거했다.

## 6. 검증

```bash
npm run verify:mobile-detail-nonintrusive   # 정적 — 허용 속성 화이트리스트 (CI 배선됨)
npm run verify:mobile-detail-render         # 실렌더 — Playwright 390x844, 연이/네오 × 4기능
```

정적 가드는 `styles/mobile-lite.css` 의 래퍼 규칙에서 인체공학 화이트리스트를 벗어난 속성과,
셸 6개의 어노테이터에 되살아난 배지/폴백헤더/요약칩 코드를 잡는다.

실렌더 검증의 핵심 불변식은 **"래퍼를 벗겨도 계산 스타일이 같아야 한다"** 이다 —
래퍼 적용/미적용 상태의 computed style 을 직접 비교하므로 새로운 종류의 덮어쓰기도 잡힌다.
겹침(제목 vs 닫기 버튼), `top` 섹션의 sticky/fixed, 가로 스크롤도 함께 실측한다.

**알려진 한계**: 숙요점·점성술은 헤더/제목이 런타임 렌더라 정적 마크업에 없어 제목 겹침 검사가
생략된다(셸 표면 재도색 검사는 수행). 실행 로그에 `·` 로 표시된다.
