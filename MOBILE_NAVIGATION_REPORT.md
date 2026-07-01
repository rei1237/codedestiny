# Mobile Navigation Report

## 1. 적용 범위
- 원본 수정 파일: `index.html`
- 배포 mirror 동기화: `public/index.html`, `public/static/index.html`, `public/en/index.html`, `public/ja/index.html`, `public/zh/index.html`
- 변경 marker: `mobile-bottom-navigation-v20260701`
- 최종 static cache key: `build-24ccab18953a`

## 2. 모바일 하단 내비게이션
| 영역 | 구성 | 동작 |
|---|---|---|
| 하단 메인 nav | 홈 · 사주 · 타로 · 상담 · 마이 | 모바일에서만 표시, 현재 위치 active 표시 |
| 빠른 탐색 chip | 무료 · 사주 · 타로 · 상담 · 신탁 · 별자리 · 꽃/해몽 · 음악 · VVIP | 컬렉션 open 또는 대상 영역 scroll |
| 음악 | `/music` 링크 | 사용자 직접 터치로 같은 탭 이동 |
| 사업자 고정 바 | nav 위로 이동 | `pointer-events:none`, nav 터치 차단 방지 |

## 3. 터치/라우팅 처리
| 항목 | 적용 결과 |
|---|---|
| touch/pointer | `pointerup` 우선 처리, `click` fallback 유지 |
| 중복 실행 방지 | pointer 이후 450ms 내 합성 click 중복 차단 |
| 카드/링크 중첩 | scroll/open 기능은 `button`, 음악 이동은 `a`로 분리 |
| active 상태 | URL, 열린 컬렉션, 현재 scroll 위치 기준 갱신 |
| safe-area | `env(safe-area-inset-bottom)` 반영 |

## 4. 모달/결제 레이어 처리
| 항목 | 적용 결과 |
|---|---|
| nav z-index | `960` |
| 사업자 바 z-index | `930`, nav 아래 |
| 모달 감지 | overlay id + 열린 dialog/modal/bottom-sheet selector 감지 |
| lazy mount 대응 | body `MutationObserver`에 `childList:true` 적용 |
| 모달 열림 상태 | `body.cd-mobile-nav-hidden`으로 nav와 사업자 바 숨김 |

## 5. 모바일 브라우저 검증
| 검증 | 결과 |
|---|---|
| viewport | 390 x 844, mobile/touch |
| nav rect | top 741, bottom 844, height 103 |
| 하단 타로 좌표 hit-test | `BUTTON` / `타로` |
| 기존 사업자 바 터치 차단 | `pointer-events:none`, bottom 112px |
| 타로 nav 진입 | `tarotCollection` open, toggle `aria-expanded=true` |
| active 표시 | `tarot` active |
| pointer listener marker | `document.addEventListener('pointerup', activateNavItem, true)` 확인 |

## 6. 검증 명령
| 명령 | 결과 |
|---|---|
| `node` inline script syntax check | PASS |
| `git diff --check -- index.html` | PASS |
| `npm run sync:public` | PASS |
| `npm run verify:locale-main-sync` | PASS |
| `npm run verify:runtime-cache-sync` | PASS |
| `npm run typecheck -- --pretty false` | PASS |
| `npm run verify:entry-encoding -- --strict-core` | PASS |
