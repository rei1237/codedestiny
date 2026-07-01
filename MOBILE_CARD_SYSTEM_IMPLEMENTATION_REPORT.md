# Mobile Card System Implementation Report

## 1. 적용 범위
- 대상 소스: `index.html`
- 동기화 산출물: `public/index.html`, `public/static/index.html`, `public/en/index.html`, `public/ja/index.html`, `public/zh/index.html`
- 모바일 카드 시스템 마커:
  - `cd-mobile-card-system-v20260701`
  - `mobile-card-system-v20260701`
  - `mobile-feature-bottom-sheet-v20260701`

## 2. 추가한 모바일 컴포넌트
| 컴포넌트 | 적용 위치 | 역할 |
|---|---|---|
| `MobileFeatureCard` | 기존 컬렉션 무료/일반 카드 | 1열 compact feature card |
| `MobileCompactCard` | 모바일 홈 추천/최근/전체 기능 카드 | 낮은 높이의 빠른 진입 카드 |
| `MobileCategoryTabs` | 모바일 홈 카테고리 탐색 | 가로 스크롤 탭 |
| `MobileFeatureRail` | Quick Start/보조 CTA 묶음 | 짧은 CTA rail |
| `MobileLockedCard` | 유료/잠금 카드 | 작은 가격/잠금 배지와 결제 진입 유지 |
| `MobilePassCard` | Moonlight Pass compact | 이용권 확인 중심 카드 |
| `MobileQuickAction` | 무료 사주/타로/오늘 운세 CTA | 44px 이상 터치 영역 |
| `MobileFeatureBottomSheet` | 기능 preview, 로딩/결제 sheet | 모바일 하단 sheet 분류 |

## 3. 핵심 UI 규칙 반영
- 모바일 컬렉션 카드는 1열 compact grid로 강제했다.
- 카드 제목은 1줄, 설명은 2줄 clamp로 제한했다.
- 썸네일은 54px 정사각형으로 제한하고 기존 카드 대형 이미지는 lazy/async/low priority로 보정했다.
- 카드 장식 overlay, divider, gem 레이어는 `pointer-events:none`으로 정리했다.
- 카드 내부에 새 중첩 interactive 구조를 만들지 않았다.
- 모바일 기능 preview CTA는 화면 하단 고정 touch 영역으로 보정했다.
- `header.logo-area`가 모바일 quick 탐색 터치를 가로막지 않도록 header 자체는 `pointer-events:none`, 내부 실제 입력/버튼/링크는 `pointer-events:auto`로 분리했다.

## 4. 기능별 동작 정책
| 유형 | 모바일 카드 동작 | 정책 변경 여부 |
|---|---|---|
| 단순 이동 | registry 기반 href/link 유지 | 없음 |
| 모달 기능 | 기존 `data-action`/preview 흐름 유지 | 없음 |
| 결제/잠금 | 기존 `__cdRunPerUseCoinGateFromTile`, tile lock 흐름이 있으면 그대로 위임 | 없음 |
| 외부 이동 | `data-mobile-external="1"`에 한해 user gesture 내 `window.open` 후 fallback | 없음 |
| 음악/BGM | `data-mobile-media="defer"` 표시, 사용자 재생 전 audio 생성 없음 | 없음 |
| 스프라이트/컷신 | 기존 lazy loader 유지, 카드 시스템에서 선로딩 추가 없음 | 없음 |

## 5. 모바일 검증 결과
| 시나리오 | 결과 |
|---|---|
| 모바일 홈 첫 진입 | `cdMobileDestinyHub`가 첫 콘텐츠로 표시됨 |
| 초기 audio | `audio` DOM 0개 확인 |
| 카드 중첩 interactive | 중첩 `<a>/<button>` 0개 확인 |
| 타로 카테고리 touch 진입 | `dom_cua` node 클릭으로 `tarotCollection` 열림 |
| 유료 타로 카드 touch 진입 | preview bottom sheet 열림 |
| preview CTA 위치 | 390x844 viewport에서 CTA `top:749`, `bottom:799`로 첫 화면 안에 고정 |
| preview paywall | 유료 카드에서 paywall 영역 표시 |
| 카드 compact grid | 타로 카드 1열, 카드 높이 76px, 썸네일 54px 확인 |

## 6. 확인된 제한 사항
- 로컬 정적 서버 검증 중 결제 게이트 전역 함수 `window.__cdRunPerUseCoinGateFromTile`, `window.__cdPaidFeatureGate`, `window._cdChooseServicePaymentMode`가 `undefined`로 관측되어 CTA 이후 실제 결제 선택 sheet까지는 로컬에서 끝까지 확인하지 못했다.
- 해당 결제/권한 함수는 `index.html` 소스에 존재하며, 이번 작업에서는 결제 정책/잠금 정책/가격/권한 판단 순서를 수정하지 않았다.
- CTA 이후에는 기존 fallback 동작으로 `tarotLoveOverlay`가 열리는 것을 확인했다. 결제 런타임 전역 노출 문제는 별도 결제 런타임 디버깅 범위로 분리하는 것이 안전하다.

## 7. 실행한 검증
- `npm run sync:public`
- `npm run verify:locale-main-sync`
- `npm run verify:runtime-cache-sync`
- 모바일 브라우저 검증: 390x844 viewport, `dom_cua` touch node click, DOM geometry 확인

## 8. 변경 마커
- `cd-mobile-card-system-v20260701`
- `mobile-card-system-v20260701`
- `mobile-feature-bottom-sheet-v20260701`
- `pointer-events: none !important;` on mobile `#inputPage > header.logo-area`
