# Mobile Touch Routing Modal Audit

## 1. 점검 범위
- 대상 파일: `index.html`, `js/mobile-interaction-patch.js`
- 정적 마크업 집계: `data-action` 221개, 링크 85개, 버튼 253개, 오버레이/모달성 ID 32개
- 이벤트 집계: `preventDefault` 26개, `stopPropagation` 5개, touch listener 15개, pointer listener 2개
- 중첩 인터랙티브 정적 검사: `script/style` 제외 기준 `<a>` 안의 `<button>`, `<button>` 안의 `<a>` 0건

## 2. 위험 지점과 처리 결과
| 항목 | 확인 결과 | 처리 |
|---|---|---|
| touch/pointer/click 충돌 | 모바일 브리지가 touch, pointer, click을 모두 위임하고 있었으나 `touchend`가 passive로 선언된 상태에서 `preventDefault()`를 호출할 수 있었다. | `touchend` listener를 passive false로 변경했다. |
| 탭 즉시 피드백 | 기능 실행 전 시각 피드백이 일관되지 않았다. | `[data-action]`, 링크, 버튼, 모바일 카드에 `cd-mobile-tap-feedback`을 즉시 부여하고 이동/취소/스크롤 시 제거한다. |
| 스크롤 후 오탭 | 스크롤 직후 단순 탭도 막힐 수 있는 경로가 있었다. | 실제 move 이벤트가 있었을 때만 스크롤 가드를 적용하도록 보강했다. |
| 닫힌 overlay/backdrop | 일부 모달이 닫힌 뒤 투명 레이어나 body scroll lock이 남을 가능성이 있었다. | 닫힌 overlay는 `pointer-events:none`으로 고정하고, 열린 모달이 없으면 body overflow/class lock을 정리하는 lifecycle guard를 추가했다. |
| 결제/잠금 진입 | 권한 확인 전에 화면이 늦게 열리면 모바일에서 반응이 없어 보일 수 있었다. | 기존 결제/잠금 정책은 유지하고, 잠금 카드 탭 시 preview/bottom sheet가 먼저 열리는 흐름을 보존했다. |
| iOS viewport | 작명소 모바일 시트가 `100vh` 고정이라 키보드/주소창 변화에 취약했다. | `--cd-safe-vh`, `100svh`, `100dvh` fallback을 적용했다. |
| popup fallback | `window.open` 사용부는 실패 시 같은 탭 이동 fallback이 있었다. | 기존 fallback 유지, 정책 변경 없음. |
| 장식 레이어 터치 방해 | 카드 내부 이미지/장식 레이어의 pointer event 예외가 일부 기능군 중심이었다. | 모바일 브리지 CSS에서 카드 장식/썸네일 레이어의 `pointer-events:none` 범위를 유지 및 보강했다. |
| 모바일 에뮬레이션 no-touch | 모바일 폭이어도 브라우저가 fine pointer/no-touch이면 모바일 브리지가 스킵될 수 있었다. | `max-width:768px`에서는 브리지가 항상 동작하도록 조건을 조정했다. |
| click 직전 스크롤 보정 | 컬렉션 오픈/locator 클릭 직후의 자동 스크롤이 click을 무조건 차단할 수 있었다. | 실제 touch move가 있었던 경우에만 click scroll guard가 동작하도록 조정했다. |
| data-action fallback | 특정 카드에서 bridge rule이 놓치면 lazy load나 모달 오픈이 시작되지 않을 수 있었다. | 모바일 기능 카드로 분류되는 `[data-action]`에 한정해 capture fallback을 추가했다. |
| fallback 바인딩 의존성 | touch delegator가 환경별로 바인딩되지 않으면 data-action fallback도 함께 빠질 수 있었다. | fallback 바인더를 독립 함수로 분리하고 init에서 직접 바인딩한다. |
| preview suppress 과차단 | 컬렉션 이동 직후 click이 최근 스크롤로만 판단되어 preview/gate listener에서 차단될 수 있었다. | click은 실제 touch move 또는 카드 scroll move가 있었을 때만 suppress한다. |
| preview 데이터 누락 카드 | 유료 카드가 preview registry `D`에 없으면 클릭이 조용히 return될 수 있었다. | 기존 `__cdRunPerUseCoinGateFromTile`을 우선 호출하고, 실패 시 기존 paid feature gate UI를 여는 fallback을 추가했다. |
| 컬렉션 카드 위임 누락 | 환경별로 document capture 위임이 기능 카드까지 도달하지 않을 수 있었다. | 모바일 기능 카드 자체에 직접 action listener를 바인딩해 위임 실패 시에도 진입한다. |

## 3. 반영 내용
- `js/mobile-interaction-patch.js`
  - 모바일 탭 즉시 피드백 추가
  - 닫힌 오버레이 pointer 방지 CSS 추가
  - body scroll lock lifecycle guard 추가
  - `touchend` passive 설정 수정
  - scroll/move/cancel/pagehide/visibilitychange에서 피드백과 lock 정리
- `index.html`
  - `mobile-interaction-patch.js` 캐시 키를 `build-mobile-touch-route-20260701`로 갱신
  - marker: `mobile-touch-route-modal-guard-v20260701`
  - 작명소 모바일 시트 viewport fallback 적용

## 4. 검증해야 할 모바일 시나리오
| 시나리오 | 기대 결과 |
|---|---|
| 대표 무료 CTA 탭 | 즉시 탭 피드백 후 기능 진입 |
| 타로/신탁 카드 탭 | bottom sheet 또는 모달 즉시 열림 |
| 잠금/VVIP 카드 탭 | 결제/권한 확인 전에 preview/gate 화면이 먼저 열림 |
| 모달 닫기 후 다른 카드 탭 | 투명 backdrop이 터치를 막지 않음 |
| 작명소 열기 후 입력 focus | 키보드가 올라와도 시트 높이가 viewport에 맞음 |
| 스크롤 중 카드 영역 터치 | 스크롤은 유지되고 오탭 실행 없음 |
| `target="_blank"` 또는 외부 이동 | popup 차단 시 같은 탭 fallback |

## 5. 정책 보존
- 결제/잠금/이용권/월정석/단건 결제 판단 순서 변경 없음
- 가격, 무료/유료 조건 변경 없음
- 운세 계산, AI 프롬프트, 결과 생성 로직 변경 없음
- 로그인/회원가입 로직 변경 없음
