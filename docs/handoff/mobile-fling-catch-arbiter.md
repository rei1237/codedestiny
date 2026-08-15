# 인수인계 — 관성 캐치(fling catch) 차단을 제스처 중재자에 추가

> 작성 2026-08-15. 설계는 끝났고 구현도 돌아갔지만 **검증 수단이 없어 넘긴다**(CLAUDE.md 코딩 원칙 12·13).
> 이어받는 세션은 이 문서만 읽고 시작할 수 있어야 한다. 부족하면 그 자체를 이 문서에 보태라.

## 왜 하는 작업인가

사용자 요구 원문(2026-08-15):

> 스크롤하면서 터치가 되어서 기능으로 진입하는 짜증나는 문제를 수정해달라고 했는데 그래도이므로
> 모바일 환경에서 스크롤 중 기능으로 진입이 안되도록 다시 한번 수정해주고

선택지를 제시했을 때 사용자는 **"관성 캐치까지 차단"** 을 골랐다. 즉 이 작업은 사용자가 명시적으로 요청한 범위 안에 있다.

**관성 캐치** = 손을 뗀 뒤에도 흐르는(관성 스크롤 중인) 목록에 손가락을 대어 멈추는 동작. 손가락이 거의 안 움직이고 빨리 떼므로 중재자의 두 신호(`slop` 12px, `duration` 700ms)를 **둘 다 빠져나간다.** 지금 남아 있는 오탭의 정체다.

## 이미 끝난 것 (다시 하지 말 것)

| PR | 내용 | 상태 |
|---|---|---|
| #651 | 모바일에서 상단 플로팅 `[←][홈]` 숨김 | PR 생성 |
| #654 | **오탭 배선** — `touchend`/`pointerup` 에서 곧바로 기능을 여는 스택들이 중재자를 묻게 함 | PR 생성 |
| #656 | 모바일 카드 탭 = 즉시 진입(상세 팝업 우회) + 가격 대기 CTA + 합성 인계 클릭 예외 통합 | PR 생성 (#654 위에 스택) |

🔴 **#654 가 이 문제의 구조적 절반을 이미 해결했다.** 중재자의 유일한 차단 지점이 window capture `click` 하나뿐이라 `touchend`/`pointerup` 스택은 보호를 아예 못 받고 있었고, `js/core/*` 는 배선된 적조차 없었다. 남은 것은 **신호 자체가 관성 캐치를 못 잡는다**는 부분뿐이다.

## 남은 작업 — 정확히 두 가지

### 1. 중재자에 `fling-catch` 신호 추가 (설계 완료, 코드 검증 안 됨)

대상 파일: `js/inline/gesture-arbiter.js` (+ `public/js/inline/gesture-arbiter.js` 미러)

🔴 그 파일 43~55행 주석에 **실측으로 기각한 신호 세 가지**가 남아 있다. 셋 다 멀쩡한 탭을 죽였다. 다시 시도하지 말 것:

1. "직전에 스크롤이 있었나"(시간) — `scrollIntoView` 같은 프로그램적 점프와 구분 못 함
2. 제스처 중 scroll 이벤트 수 — 하이드레이션 잡음이 30ms 정지 탭에 `scrollTicks=2` 를 만듦
3. 제스처 중 문서 변위 — 앱 자신이 스크롤하는 순간(컬렉션 전환 직후)과 구분 안 됨

**공통 실패 원인**: 셋 다 *"문서가 움직였다"* 를 사용자 의도의 증거로 삼았다.

**설계(이 세션에서 도출, 위 셋을 재현하지 않는다)** — 세 조건의 **논리곱**:

- **(a) 직전에 사용자 손가락이 만든 드래그가 있었다**
  `end()` 안에서 `reason === 'slop'` 일 때**만** `lastUserDragEndAt = now()` 를 세운다.
  이게 (a)의 유일한 증거이고, 기각 사례 ①·③(프로그래매틱 점프·앱 자체 스크롤)을 원천 차단한다.
- **(b) 터치 시작 시점에 그 스크롤러가 아직 감속 중이었다**
  `scroll` 이벤트(capture·passive) 링버퍼에서 최근 ~140ms 구간 속도를 계산해 `begin()` 에서 스냅샷.
  임계값 후보 `FLING_MIN_PX_PER_MS = 0.35`(≈21px/frame). 속도 임계가 기각 사례 ②(하이드레이션 잡음)를 배제한다.
  🔴 **`begin()` 에서만 물을 수 있다** — `end()` 에서는 이미 늦다.
- **(c) 이 터치로 스크롤러가 사실상 멈췄다**
  `isArrested(gesture)`: `|scrollTop 현재값 − entryTop| <= 6px`.
  🔴 **실시간으로 읽어야 한다.** `blocksActivation()` 이 제스처 **진행 중에도** `blockReason(active)` 를 부르므로(`gesture-arbiter.js:135`), `end()` 가 채운 필드를 읽으면 진행 중 경로와 확정 경로의 동작이 갈린다.

배치: `blockReason()`(70~75행) 기존 두 줄 **뒤**에 `if (isArrested(gesture)) return 'fling-catch';` 한 줄.
프로그래매틱 스크롤은 `Element.prototype.scrollIntoView` / `scrollTo` / `scrollBy` / `window.scrollTo` / `scrollBy` 를 **한 곳에서 감싸** 표시 창(~500ms)을 세워 배제한다. 🔴 호출 지점을 배열에 열거하지 말 것 — 지정 5개 파일 안에만 42곳이고, 손으로 쓴 목록은 다음 호출자에서 바로 샌다(CLAUDE.md 원칙 11).
`lastBlock` 에 `entryVel`/`entryTop`/`exitTop` 을 추가할 것 — CDP 스모크가 `lastBlock()` 을 읽으므로 재현 근거가 된다.

**손대면 안 되는 곳**: `blocksActivation()` 본체(리더로 유지), window click 게이트(진입 시점 상태를 볼 수 없는 하류). 모든 `scrollTop` 접근은 try/catch, 이력이 없으면 통과(fail-open 유지).

### 2. 🔴 먼저 해야 할 것 — **CDP 하네스가 실제로 스크롤을 못 만든다**

이게 이번에 넘기는 진짜 이유다. 신호를 넣어도 **재현 검증을 할 수 없었다.**

`scripts/verify-mobile-cdp-smoke.mjs` 에서 `Input.synthesizeScrollGesture`(`gestureSourceType: "touch"`, `speed: 6000`, `yDistance: -420`, `preventFling: false`)를 쏜 뒤 측정한 값:

```
scroll: { pageY: 0, docTop: 0, bodyOverflow: "hidden auto", htmlOverflow: "hidden auto",
          docHeight: 17465, innerHeight: 844 }
lastBlock: { reason: "slop", maxDy: 435, heldMs: 68, entryVel: 0, entryTop: 0, exitTop: 0 }
```

17,465px 짜리 문서에서 420px 를 밀었는데 **`pageYOffset` 이 0 그대로다.** 제스처는 도달했지만(`maxDy: 435`) **문서가 전혀 스크롤되지 않았다.** 관성이 없으니 속도도 0 이고, 관성 캐치를 만들 방법이 없다.

> 참고: 기존 `swipeFromSelector` 회귀 케이스들도 **"스크롤이 실제로 일어났다"는 단언이 없다.** 그것들은 "카드가 안 열렸다"만 보므로 스크롤이 0 이어도 통과한다. 즉 이 하네스는 지금까지 한 번도 실제 스크롤을 만든 적이 없을 수 있다 — **미확인.**

**다음 세션이 먼저 할 일**: 하네스가 문서를 실제로 스크롤하게 만들고, 그것을 **단언으로 고정**한다.

```js
// 최소 형태 — 이게 통과하기 전에는 fling-catch 를 넣지 말 것
await send(cdp, "Input.synthesizeScrollGesture", { /* … */ });
const after = await evaluate(cdp, "window.pageYOffset");
assert(after > 100, "the harness can actually scroll the shell", { after });
```

조사할 후보(전부 **미검증 추정**):
- 셸의 어떤 `touchmove` 리스너가 `passive:false` 로 `preventDefault()` 하고 있는가 (`js/mobile-interaction-patch.js`, `index.html` 인라인)
- `Input.dispatchTouchEvent` 로 직접 touchStart→touchMove 여러 번→touchEnd 를 쏘면 스크롤되는가
- 헤드리스 크롬에서 `synthesizeScrollGesture` 가 컴포지터 스크롤을 만들려면 추가 플래그가 필요한가

## 검증 — 통과해야 하는 것

새 신호는 **차단 1건 + 과차단 방지 3건**을 함께 통과해야 한다. 뒤 3건은 이미 스모크에 있고 **기각된 세 신호가 각각 죽였던 바로 그 케이스**다:

| 단언 | 무엇을 지키나 |
|---|---|
| (신규) 흐르는 목록을 만진 터치가 `fling-catch` 로 판정된다 | 신호가 실제로 발화 |
| `a deliberate tap after scrolling settles still opens the card` | 기각 사례 ① |
| `rapid tarot-to-oracle touch switch remains interactive` · `immersive all-fortunes removes the bottom-nav layout and touch target` | 기각 사례 ③ |
| `a deliberate tap on the animal totem tile still opens it` | #654 가 추가한 포지티브 컨트롤 |

```bash
MOBILE_CDP_DEBUG=1 npm run verify:mobile-cdp-smoke   # 기본 MOBILE_CDP_TARGET=source
npm run verify:desktop-cdp-smoke
npm run verify:hybrid-desktop-cdp-smoke
node scripts/verify-rpt-preview-cta-flow.mjs
npm run verify:mobile-entry-actions
npm run verify:mobile-runtime-readiness
npm run verify:mobile-detail-nonintrusive
npm run typecheck && npm run lint
```

🔴 `verify:mobile-cdp-smoke` 는 CI 에 없는 **로컬 전용** 가드다(`scripts/verify-guard-wiring.mjs` 의 `UNWIRED_BY_DESIGN`). 손으로 돌려야 한다.

**정본 예시 — 이 세션에서 "가드가 아무것도 안 지키던" 실측 사례**: #654 에 토템 타일 회귀 케이스를 넣을 때 처음엔 단순 세로 스와이프로 썼는데, **가드를 꺼도 통과했다.** 그 제스처는 타일 자체의 `TAP_THRESH`(시작점↔해제점 거리, `js/core/index-inline-runtime.js`)가 이미 잡기 때문이다. `swipeOutAndBackFromSelector`(끌었다가 시작점으로 되돌아와 떼기)로 바꾸고 나서야 가드 비활성 시 `{"after":{"totemOpen":true}}` 로 실패했다. **새 단언을 넣으면 반드시 고치기 전 상태에서 실패하는지 먼저 확인할 것.**

## 이 레포 고유의 작업 규칙

- 브랜치 → 커밋 → push → PR. `main` 직접 push 불가. **머지는 사용자가 한다.**
- 이 문서의 세 PR(#651·#654·#656)은 `index.html` 과 그 미러 생성물을 공유하므로 **스택**돼 있다. `main` 에서 병렬 분기하지 말 것.
- `js/inline/gesture-arbiter.js` 를 고치면 `npm run sync:public` 으로 `public/` 미러를 재생성해 **같은 커밋에** 담는다.
- `js/mobile-interaction-patch.js` 를 고치면 `scripts/sync-legacy-static-to-public.mjs` 의 `MOBILE_INTERACTION_PATCH_CACHE_KEY` 를 새 SHA-256 앞 12자로 **손으로** 갱신한다(자동 계산 아님).
- 동시 세션이 작업 디렉터리를 공유하므로 격리된 git worktree 에서 작업한다.

## 마지막

🔴 **근거를 못 찾으면 추측으로 채우지 말고 사용자에게 물어라.** 이 영역은 과차단이 오탭보다 훨씬 비싼 실수이고(`gesture-arbiter.js:21-23` fail-open 정책), 실제로 2026-08-14 에 유료 진입이 두 릴리스 동안 죽은 채로 스모크는 초록이었던 사고가 있었다. **검증 못 한 차단 신호는 넣지 않는 것이 맞다** — 이번 세션이 그래서 넘겼다.
