# 인수인계 — 홈 성능 재기준선 + 하단 내비 관찰자 지연 ablation (2026-08-21)

> `docs/handoff/mobile-home-perf.md`(4차, 08-15)·`docs/handoff/desktop-perf-2026-08-16.md`(PR #716까지)를
> 대체하지 않는다 — 두 문서의 이력·함정 목록은 그대로 유효하다. 이 문서는 **그 이후(08-16→08-21,
> PR #872 홈 섹션 재배치 포함 수십 커밋) 베이스가 움직였는지 재확인**하고 저위험 후보 1건을 실측 검증한
> 세션의 결과만 담는다. 결론: **채택된 코드 변경 없음**(아래 §2 참고). 다음 세션은 §4 부터 시작.

## 0. 이번 세션 요약

- 재기준선(§1): 모바일 로컬 dist Performance **58**(54–68), TBT **794ms**(535–1022, 🔴 밴드 폭 487ms —
  이 환경에서 TBT 판정에 필요한 최소 개선폭이 그만큼 크다는 뜻). 데스크탑 Performance **63**(59–71).
  구 문서 수치(모바일 51–53대, 데스크탑 76–82)와 **직접 비교 불가** — Lighthouse/Chrome 버전, 기계,
  그리고 PR #872 등 그 사이 수십 커밋이 섞여 있어 원인을 못 가른다. **다음 세션은 이 문서의 §1 수치를
  베이스로 쓸 것.**
- 새로 발견한 후보(§3): 모바일 강제 동기 레이아웃 **1위가 307.0ms**(구 문서엔 없던 지점) —
  `#cdSignatureConsult`(대표 운명 상담) 카드 레일의 "가운데 카드 활성화" 판정 함수. **이번엔 손대지
  않았다** — 구조가 이미 CLS로 기각된 데스크탑 패럴랙스 rAF 실험과 같은 패턴이라 재현 없이 시도하면
  같은 함정(읽기를 미루면 그 사이 DOM 이 더 쌓여 오히려 악화)에 빠질 위험이 있다.
- 시도한 것(§2): 하단 내비 `bindOverlayObservers()` 부팅 중 동기 호출 1줄 제거(이미 있는 지연 경로로
  자연스럽게 미루기) → **판정 기준(사전 고정: 5회 중앙값이 베이스라인 min~max 밴드 밖) 미달** →
  **코드 되돌림**. 안전한 개선을 못 찾았다는 것도 유효한 결과로 정직하게 보고한다.

---

## 1. 🔴 재기준선 (2026-08-21, 커밋 `d9bd0c38667c` 기준 + 이 워크트리에서 재빌드)

재현 명령:
```bash
npm run build:cf   # ALLOW_DEV_SERVER_DURING_BUILD=1 필요할 수 있음 — 다른 세션 dev 서버 오탐
npm run perf:home -- --runs=5 --preset=both --label=<라벨> --out=<경로>
```

### 모바일 (median of 5)

| 지표 | 중앙값 | min–max |
|---|---:|---|
| Performance | 58 | 54–68 |
| FCP | 2,763ms | 2,713–2,780 |
| **LCP** | **4,583ms** | 3,909–4,629 |
| **TBT** | **794ms** | 535–1,022 |
| CLS | 0.001 | 0.001–0.001 |
| Speed Index | 4,281ms | 3,969–4,589 |

LCP 요소는 5/5 회 `h1.moon-hero__title`(텍스트) — 구 문서와 동일. LCP 분해: Element render delay 515ms + TTFB 3ms.

### 데스크탑 (median of 5)

| 지표 | 중앙값 | min–max |
|---|---:|---|
| Performance | 63 | 59–71 |
| FCP | 618ms | 617–619 |
| **LCP** | **2,143ms** | 2,048–2,299 |
| **TBT** | **513ms** | 323–740 |
| CLS | 0.000 | 0.000–0.000 |
| Speed Index | 1,944ms | 1,797–2,262 |

LCP 요소는 5/5 회 히어로 이미지(`.cd-hero-island__img`, 1154×769 렌더) — 구 문서와 동일.
데스크탑 강제 동기 레이아웃 1위는 여전히 `js/shell/…:0:6824` **182.9ms** — grep 대조 결과 이건
`desktop-perf-2026-08-16.md §3-2`가 이미 조사·rAF 이월 실험까지 끝내고 **기각**한 배경 패럴랙스
`window.scrollY` 읽기와 **같은 코드**다(문자열 대조로 확인, 좌표만 6824→달라 보일 뿐 내용 동일).
**재조사 불필요 — 그 문서의 결론이 그대로 유효하다.**

전체 원본 LHR·md·json: `perf-out/perf-baseline-20260821.{md,json}`(워크트리 상위, 커밋 대상 아님 — 다음
세션이 필요하면 재생성할 것, 이 디렉터리는 저장소 밖이라 세션이 끝나면 사라질 수 있음).

---

## 2. 시도 — 하단 내비 `bindOverlayObservers()` 부팅 중 동기 호출 제거

### 배경

`index.html`(`mobile-bottom-navigation-v20260701` 블록, `bindOverlayObservers()` 함수 정의부 근처)에
다음 5개의 재바인딩 경로가 있었다: ①부팅 중 무조건 즉시 호출 ②`load` 리스너 ③`pointerdown` 리스너
④`document.readyState==='loading'`이면 `DOMContentLoaded` ⑤아니면 `setTimeout(fn,0)`.
④⑤는 if/else 라 **부팅 직후 반드시 한 번은 이미 자동으로 실행된다** — 즉 ①은 ④⑤보다 앞서 실행되는
**중복**이었다. 각 노드는 `__cdMobileBottomNavObserved` 가드로 idempotent 하므로, ①만 지워도 모달
열림 판정(`overlayIds` 관찰) 자체는 부팅 직후 그대로 걸린다 — 모달은 사용자 상호작용 전엔 열릴 수
없으므로 그 사이 창(1 macrotask)에 놓치는 이벤트도 없다.

이건 desktop-perf 문서의 §3-2(rAF 로 "레이아웃을 강제하는 읽기" 자체를 이월 — 기각됨)와 **다른 종류의
변경**이다: `bindOverlayObservers()`는 강제 레이아웃을 유발하지 않는다(`getElementById`+
`MutationObserver.observe`뿐 — 이번 재기준선의 강제 동기 레이아웃 표에서 이 스크립트 청크
`s-d6dc5634f99828ae.js`의 기여는 2.7ms×2뿐이었다). 목표는 레이아웃 강제 이동이 아니라 **순수 스크립트
CPU 총량 축소**였고, 이건 이미 `mobile-home-perf.md §4-4`(부트 태스크 8종 `setTimeout(0)` 이월)가
**성공시킨 것과 같은 패턴**이라 시도할 근거는 있었다.

### 결과 — 판정 기준 미달, 코드 되돌림

| 지표 | 베이스라인(§1) 중앙값 (밴드) | 후보 중앙값 (밴드) | 밴드 밖? |
|---|---:|---:|---|
| Performance | 58 (54–68) | 59 (54–69) | ❌ 밴드 안 |
| TBT | 794ms (535–1,022) | 791ms (351–1,055) | ❌ 밴드 안 |
| FCP | 2,763ms (2,713–2,780) | 2,764ms (2,702–2,765) | ❌ 밴드 안(예상대로 무변화) |
| LCP | 4,583ms (3,909–4,629) | 4,584ms (4,582–4,641) | ❌ 밴드 안 |
| Speed Index | 4,281ms (3,969–4,589) | 3,988ms (3,837–4,759) | ❌ 밴드 안(중앙값은 293ms 낮지만 베이스라인 밴드 하한 3,969 안쪽) |

**판정(사전 고정 기준 적용)**: 5개 지표 전부 베이스라인 min~max 밴드 안 → **개선으로 인정 불가**.
`git checkout -- .` 로 코드·빌드산출물 전부 원복(커밋 없음).

**해석**: 이 스크립트 청크의 부팅 스크립트 CPU(§1 기준 데이터 재사용 시 `s-d6dc5634f99828ae.js`
bootup-time 331ms, `desktop-perf-2026-08-16.md`§2-2 표와 동일 파일)에서 `bindOverlayObservers()`가
차지하는 비중이 전체 부팅 예산(TBT 밴드 폭만 487ms) 대비 유의미한 신호로 잡히기엔 작았거나,
5회로는 표본이 부족했을 수 있다(구 문서 §5-4 "n=12 에서 보였지만 n=51 에선 사라진" 전례와 같은 종류의
함정 — 여기선 n 을 늘려 재검증하지 않았다, **미검증**으로 남긴다).

---

## 3. 🔴 새로 발견 — `#cdSignatureConsult` 카드 레일의 부팅 중 강제 레이아웃 307ms (미착수)

재기준선 측정에서 모바일 강제 동기 레이아웃 1위가 이번엔 `js/shell/s-89c377f35da94de1.js:0:4598`
**307.0ms**로 나왔다(2위는 63.2ms — 압도적 1위). dist 청크를 직접 열어 오프셋을 대조한 결과, 이 코드는
"대표 운명 상담" 카드 레일(`querySelector('.cd-sig-card__title')` 로 확인 — `data-marker` 미상이라
정확한 `index.html` 줄 번호는 재빌드 시 청크가 바뀌므로 여기 적지 않는다, `.cd-sig-card` 로 grep할 것)의
"스크롤 중 어느 카드가 가운데인지" 판정 함수다:

```js
function b(){  // 가운데 카드 판정 — i.length(카드 수, 4개) 만큼 getBoundingClientRect() 루프
  for (var t=e.getBoundingClientRect(), a=..., h=0; h<i.length; h+=1) {
    var k=i[h].getBoundingClientRect(), R=...;  // 강제 레이아웃 지점으로 추정
  }
  ...
}
function D(){ s || (s=!0, window.requestAnimationFrame(function(){ s=!1, b() })); }
```

스크롤 이벤트에서 호출될 때는 이미 `D()`가 rAF 로 코얼레싱한다(좋은 패턴). **307ms는 스크롤이 아니라
부팅 중 초기 1회 호출에서 나온 것으로 보이며**, 카드 4개짜리 루프 자체가 300ms 씩 걸릴 리는 없다 —
**"부팅 후 첫 강제 레이아웃 계산" 이 우연히 여기 귀속된 것일 가능성이 높다**(이 레포에서 이미 실증된
패턴: `desktop-perf-2026-08-16.md §3-2`가 스크롤 패럴랙스의 rAF 이월을 시도했을 때 "그 지점의 시간이
사라지지 않고 다른 곳으로 옮겨갔을 뿐"이라고 결론지은 것과 같은 구조).

🔴 **이번 세션은 시도하지 않았다.** 손대려면:
1. **부팅 시점의 초기 호출을 rAF/idle 로 미루는 실험을 먼저 dist 레벨(uncommitted)로 해서, 307ms 가
   실제로 사라지는지 아니면 다른 지점으로 옮겨가기만 하는지부터 확인**해야 한다(패럴랙스 실험과 같은
   함정 재현 여부 확인 없이 소스를 고치면 §2 와 같은 결과이거나 그보다 나쁠 수 있다).
2. 카드가 4개뿐이라 활성 카드 표시가 없어도 스와이프 자체는 되므로, 초기 활성 카드 판정을
   `requestIdleCallback`으로 미뤄도 기능 손실은 작아 보이지만 **시각적으로 "첫 카드가 잠깐 활성 표시
   없이 보이는" 여지가 있는지 확인 필요**(탭 인디케이터 `o.querySelectorAll('button')`의
   `aria-selected` 초기값이 `a===0` 로 이미 설정되므로 아마 무방해 보이나, 미검증).

---

## 4. 다음 세션 우선순위 (미변경 — 구 문서 승계)

1. `styles/cosmic-main.css`(264KB) 렌더블로킹 해제 — 여전히 `<link rel="stylesheet">`(`?v=` 캐시키만
   갱신됨, grep 재확인함 — `index.html`에서 `cosmic-main.css` 검색). `fortune-ui.css` 때 썼던
   `build-fortune-ui-critical.mjs` 류 전용 크리티컬 CSS 추출 도구 없이는 위험(과거 통짜 지연 시도가
   CLS 로 리버트된 이력, `8fc05dd53`).
2. §3의 카드 레일 307ms — ablation 부터.
3. `mobile-home-perf.md §5 N3`(Style & Layout 축소, 매칭 규칙 수가 진짜 지렛대) — 큰 작업.
4. 데스크탑 INP 측정 도구 확장(`desktop-perf-2026-08-16.md §4`) — 신규 도구 개발 선행.
5. `content-visibility` 재시도(N4) — **사용자에게 "예전에 되돌린 이유(무엇이 보였는지)" 먼저 물을 것**
   (`mobile-home-perf.md §5 N4`, 아직 안 물어봄).

---

## 5. 검증 절차 (변경 없음 — 구 문서와 동일)

```bash
npm run build:cf
npm run perf:home -- --runs=5 --preset=both --label=<R>
npm run perf:style-cost -- --runs=3 --preset=mobile --label=<R>
node scripts/verify-home-visual-parity.mjs --snapshot --label=<R>
node scripts/verify-home-visual-parity.mjs --compare=<이전>,<R> --noise=<R>,<R2>
MOBILE_CDP_TARGET=dist npm run verify:mobile-cdp-smoke
npm run typecheck && npm run lint
npm run verify:public-parity && npm run verify:locale-main-sync && npm run verify:payment-freeze
npm run verify:mobile-detail-nonintrusive && npm run verify:mobile-detail-render && npm run verify:hero-contrast
```
**판정 규칙(사전 고정)**: 5회 중앙값이 베이스라인 min~max 밴드 밖일 때만 개선으로 인정.

이번 세션은 §2의 ablation 이 밴드 안에 머물러 이 검증 스위트까지 갈 필요가 없었다(코드 변경 자체가
되돌려졌으므로). **CI 에 새 게이트 추가 없음** — 측정 도구는 기존 `perf:*` 만 사용했고 신규 스크립트를
만들지 않았다.
