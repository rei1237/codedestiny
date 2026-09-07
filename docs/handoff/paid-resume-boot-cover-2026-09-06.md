# 결제 복귀 시 초기 화면 노출 제거 (부트 커버)

> 2026-09-06 작성. 선행 작업: `docs/handoff/paid-feature-resume-2026-09-06.md` (재개 배선 자체)
> 🔴 이 문서는 **계획**이다. 코드는 아직 하나도 안 고쳤다.

## 사용자 요구

> "숙요점 궁합에서 결제 후 홈을 거쳤다가 기능이 열린다. **모든 서비스**가 홈을 거치지 말고 그 자리에서 열려야 한다. 결제 자체는 잘 되니 그 부분만."

## 현상과 원인 (실측)

모바일 PortOne 은 상위 프레임을 리다이렉트하므로 결제 후 문서가 **새로 로드**된다. 재로드 자체는 PG 가 정하는 방식이라 없앨 수 없다. 없앨 수 있는 것은 **재로드된 표면의 초기 상태가 보이는 구간**이다.

셸 기준 순서:

1. 복귀 URL `/?portone_redirect=1&paymentId=…` → **홈 문서** 로드
2. `js/destiny-profile.js` 는 셸에 **`defer`** 로 실린다(`scripts/verify-direct-confirm-pending-recovery.mjs:98` 가 강제) → HTML 파싱이 끝난 **뒤**에야 복귀 처리가 시작된다
3. `_dpResumeDirectPaymentAfterRedirect`(`js/destiny-profile.js:4436`)가 confirm 왕복 후 재개
4. 재개는 `[data-action]` 노드를 클릭하는 방식(`js/core/checkout-entry.js:1379-1393`) → **홈이 렌더돼야 그 노드가 존재한다**

→ 2~4 구간 내내 홈이 온전히 보인다. 재개는 **고장이 아니라 의도대로** 돌고 있고, 초기 화면 노출이 부작용이다.

## 🔴 재사용할 기존 장치 (새로 만들지 말 것 — 원칙 6·15)

셸은 **이미 똑같은 문제를 딥링크 축에서 풀어 두었다.**

| 장치 | 위치 | 하는 일 |
|---|---|---|
| `html.cd-deeplink-boot` | `index.html:575-578` (CSS) · `index.html:606` (인라인 감지) | `?action=` 딥링크 진입 시 `body::after` 로 전면 커버(z-index 99000, 테마별 배경). **모바일에서만**(`isTouch`), 하드 상한 5초 |
| 커버 해제 | `js/core/index-inline-runtime.js:3216` | 모달이 실제로 열리면 클래스를 제거 |
| `cd-boot-gate` | `index.html:579-605` · 해제 `index.html:8541-8571` | 부팅 베일. 딥링크면 `cd-deeplink-boot` 가 걷힐 때까지 기다렸다 걷는다(하드 상한 8초) |

`index.html:8564` 주석이 이 작업의 목표를 그대로 적어 두었다 — *"딥링크(?action=) 진입은 모달이 실제로 열린 뒤에 걷어야 **홈이 잠깐 보이지 않는다**"*.

**즉 PG 복귀는 딥링크와 같은 축인데 트리거 조건에만 빠져 있다.** 새 오버레이를 만들면 커버가 2중이 된다(원칙 6 위반).

## 작업 계획 — 단계 → 검증

### 축 1. 정적 셸 (가장 큼, 숙요점 포함)

| 단계 | 검증 |
|---|---|
| 1-1. `index.html:606` 인라인 감지 조건에 `portone_redirect=1` 을 OR 로 추가 | 복귀 URL 로 셸을 열어 첫 프레임부터 `html.cd-deeplink-boot` 가 붙는지 |
| 1-2. 하드 상한 재조정 — 현재 5초는 **confirm 네트워크 왕복(1~3초) + 재개**보다 짧을 수 있다. `cd-boot-gate` 쪽 8초와 함께 본다 | 상한이 지나면 반드시 걷히는지(실패 주입) |
| 1-3. 커버 해제 신호 추가 — 재개가 모달을 열면 `index-inline-runtime.js:3216` 이 이미 걷는다. 다만 **숙요 궁합은 모달이 아니라 리포트 재렌더**라 그 신호가 안 올 수 있다. dp 가 이미 쏘는 `cd:direct-payment-resumed`(`js/destiny-profile.js:4643`)를 해제 신호로 추가한다 | 재개 성공/실패/PENDING 세 갈래에서 커버가 남지 않는지 |

🔴 **1-3 이 이 작업의 핵심 리스크다.** `cd:direct-payment-resumed` 는 성공 경로에서만 발생한다 — 실패 반환 지점 4곳(`js/destiny-profile.js:4506`·`4537`·`4542`·`4654` catch)에서는 안 나온다. 상한 타이머가 유일한 안전망이므로 **상한은 반드시 살아 있어야 한다.**

### 축 2. 루트 독립 정적 HTML 10건 (+ `public/**` 미러)

자기 자신으로 복귀하므로 "홈"은 안 거치지만 **그 페이지의 초기 상태**가 같은 이유로 보인다. 대상은 선행 핸드오프의 배선 목록과 같다(`neville-meditation.html`·`cosmic-soul-meditation.html`·`yoga-guru.html` 등).

- 셸과 같은 인라인 스니펫 + CSS 가 필요하다. **10건에 복붙하지 말고** 공통 인라인 청크(`js/inline/…`)로 뺄지 먼저 판단할 것.
- 🔴 `public/**` 미러는 `sync:public` 산출물이다 — 직접 패치하지 말고 원본을 고친 뒤 동기화하고 **산출물을 같은 커밋에 담는다.**

### 축 3. App Router 라우트

`/ziwei-ai`·`/island-consult` 등은 자기 URL 로 복귀하되 역시 초기 상태가 보인다. Next.js 라 셸 인라인과 같은 방법이 안 통한다 — `app/layout` 레벨의 `beforeInteractive` 스크립트가 필요하다.

🔴 **이 축은 선행 조사가 먼저다**: dp 는 App Router 전역에 프리로드된다(`js/destiny-profile.js:4255` 주석). 그래서 커버가 정말 필요한지, 아니면 React 쪽 대기 UI 가 이미 덮는지 **눈으로 확인한 뒤** 착수한다. 확인 없이 넣으면 중첩 커버가 된다.

## 범위 밖 (건드리지 않는다)

- 결제 로직 자체 — 사용자가 "결제는 잘 되니 그 부분만"이라고 명시했다
- 재개 배선 자체 — 이미 동작한다
- `config/payment-freeze.json` 등록 구간(`_cdRunDirectKrwCheckout`·`_cdOpenPaidServiceGate` 등). 위 계획은 **어느 것도 건드리지 않는다** — 건드리게 되면 매니페스트를 같은 커밋에 갱신할 것

## 미확인 (다음 세션이 먼저 확인)

- `cd-deeplink-boot` 이 **모바일에서만** 켜진다(`isTouch` 게이트). PC 리다이렉트 복귀가 존재하는지, 존재하면 커버가 필요한지 미검증
- 숙요 궁합 재개가 여는 표면이 모달인지 리포트 재렌더인지 — 1-3 의 해제 신호 선택이 여기에 달려 있다
- 축 2·3 에서 초기 화면 노출이 실제로 보이는지 (스테이징 실측 필요)

## 검증 명령

```bash
npm run lint && npm run typecheck && npm run check:quick -- --skip-build
npm run verify:payment-freeze
npm run verify:paid-gate-ui
npm run verify:public-mirror-fresh          # 축 2 를 하면 필수
node --test __tests__/ui/direct-payment-resume.behavior.test.js
```

스테이징 1,000원 테스트 모드로 **실제 왕복**을 돌아 초기 화면이 안 보이는지 눈으로 확인한다(상시 허용, CLAUDE.md 절대 규칙 2 예외).

## 선행 조건

PR #1710(React 축 재개 배선)이 **머지 대기 중**이다. 이 작업은 셸·정적 축이라 독립적이지만, 브랜치는 머지 이후 최신 `main` 에서 따는 것이 깔끔하다.
