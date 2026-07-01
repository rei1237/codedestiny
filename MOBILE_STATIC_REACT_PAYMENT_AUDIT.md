# Mobile Static React Payment Audit

## 1. 대상
- 정적 shell: `index.html`
- React/Next.js 결제 gate: `app/components/PaymentProcessingContext.tsx`
- React/Next.js 잠금 CTA: `app/components/PremiumBlurGate.tsx`
- 배포 mirror: `public/index.html`, `public/static/index.html`, `public/en/index.html`, `public/ja/index.html`, `public/zh/index.html`
- 최종 cache key: `build-a86dbf54634e`

## 2. 정적 페이지 점검 결과
| 항목 | 확인 결과 | 반영 |
|---|---|---|
| viewport meta | `viewport-fit=cover` 포함 | 유지 |
| 모바일 media query | 홈, bottom sheet, nav, pass 영역 존재 | 결제/잠금 전용 `cd-mobile-payment-lock-ux-v20260701` 추가 |
| 긴 결제 플랜 | 4개 플랜이 한 번에 노출될 수 있음 | 모바일 기본은 추천/선택 플랜 우선, `전체 플랜 보기`로 확장 |
| 카드/잠금 터치 | 잠금 CTA와 결제 버튼이 44px 이상 필요 | 결제/잠금 CTA `min-height` 보강 |
| fixed 요소 | 사업자 바가 하단 nav를 막을 수 있음 | 이전 nav 단계에서 `pointer-events:none`, safe-area 위치 조정 유지 |
| overlay pointer-events | 장식 레이어 다수 `pointer-events:none` 확인 | 결제 sheet 장식은 유지, CTA 레이어만 터치 가능 |
| 결제창 지연 | `openChargeModal()`이 잔량 sync를 기다릴 수 있음 | 모달 즉시 open, 잔량 sync는 sheet 내부 상태로 후속 갱신 |
| popup blocker | 이용권 상점 이동은 `window.location.assign` | 같은 탭 이동 유지 |
| audio preload | 정적 scan 대상에서 결제 UI audio 없음 | 변경 없음 |
| safe-area | body/nav/mobile-lite에 반영 | 결제 sheet padding에도 반영 |

## 3. React/Next.js 점검 결과
| 항목 | 확인 결과 | 반영 |
|---|---|---|
| heavy overlay | `PaymentProcessingOverlay` dynamic import 사용 | 유지 |
| Suspense/dynamic fallback | 결제 overlay dynamic fallback이 `null` | 즉시 보이는 `PaymentOverlayFallback` 추가 |
| mobile bottom sheet | `PaidFeatureGateProvider`가 fixed bottom sheet 구조 | max-height, overflow-y, safe-area padding 보강 |
| body scroll lock | open 시 body overflow lock, cleanup 있음 | 유지 |
| 잠금 CTA | `PremiumBlurGate` disabled/pending 상태 있음 | `min-h-12`, `touch-manipulation` 보강 |
| public cache | 결제/결과 API 호출부 `cache:"no-store"` 패턴 확인 | 변경 없음 |

## 4. 결제/잠금 정책 보존
- 가격, 플랜, 이용권/월정석/단건 결제 순서 변경 없음
- 서버 결제 판단 로직 변경 없음
- 권한 확인 API endpoint 변경 없음
- 구매/해금 완료 판단 로직 변경 없음

## 5. 브라우저 검증
| 시나리오 | 결과 |
|---|---|
| 모바일 viewport | 390 x 844 |
| 유료 카드 터치 | `openKemetModal` 카드가 모바일 기능 sheet로 정상 진입 |
| 기능 sheet CTA | CTA 높이 50px, 터치 가능 |
| 기능 sheet CTA 후 진입 | Kemet 기능 overlay 표시 |
| 결제 시트 함수 직접 호출 | in-app browser read-only context에서 page global 접근 제한 |

## 6. 검증 명령
| 명령 | 결과 |
|---|---|
| inline mobile nav syntax check | PASS |
| `git diff --check -- index.html app/components/PaymentProcessingContext.tsx app/components/PremiumBlurGate.tsx` | PASS |
| `npm run sync:public` | PASS |
| `npm run verify:locale-main-sync` | PASS |
| `npm run verify:runtime-cache-sync` | PASS |
| `npm run typecheck -- --pretty false` | PASS |
| `npm run verify:entry-encoding -- --strict-core` | PASS |
| mojibake pattern scan | PASS, 정상 다국어 악센트/SEO keyword 예외만 확인 |

## 7. 남은 전역 완료 감사 항목
- 모든 기능별 실제 결제/잠금 API 성공/실패/재시도는 계정 상태와 결제 sandbox가 필요하므로 별도 런타임 계정 검증이 필요하다.
- 전체 final goal 완료 판정 전에는 기능 registry 기준으로 사주, 타로, 상담, 신탁, 별자리, 꽃/해몽, VVIP, 작명소 진입을 다시 전수 확인해야 한다.
