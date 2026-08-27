# 홈 LCP · INP — 실측과 남은 선택지 (2026-08-28)

> **이 문서만 읽고 이어서 작업할 수 있게 쓴다.** 모든 수치는 실측이고 재현 조건을 함께 남긴다.
> 선행 문서: [seo-followups-2026-08-27.md](seo-followups-2026-08-27.md) §5 (CWV 최초 실측)
> 이 문서는 **프로덕션 승격(2026-08-28) 이후** 홈 성능만 다룬다.

측정 조건은 전부 동일하다 — 모바일 에뮬레이션 390×844 · DPR 3 · **CPU 4x 스로틀** ·
**Slow 4G(1.6Mbps / 150ms)** · Playwright + CDP. 로컬 랩 값이며 필드(CrUX) 값이 아니다.

---

## 0. 한 줄 요약

홈의 **LCP 는 히어로 앞 57KB 안의 파서 차단 스크립트 8개**가 좌우하고,
**INP 는 핸들러가 아니라 "다음 프레임을 그리는 비용"(스타일 재계산)** 이 좌우한다.
**부팅 게이트와 문서 총 크기는 둘 다 LCP 의 원인이 아니다** — 실측으로 확인했다.

---

## 1. 현재 수치 (프로덕션, 승격 후)

| 지표 | 값 | 기준 | 판정 |
|---|---:|---:|---|
| LCP | 2,784~3,116 (중앙 3,116) | 2,500 | ❌ 초과 |
| FCP | 1,364~2,128 | 1,800 | ⚠️ 경계 |
| CLS (홈) | **0** | 0.1 | ✅ |
| **INP (홈)** | **568** | 200 | ❌ 나쁨 |
| INP (`/saju/`) | 40 | 200 | ✅ |
| TBT(근사) | 1,850 | 200 | ❌ |
| TTFB | ~650 | 800 | ✅ |
| 부팅 게이트 노출 | 1,170~1,387 → 8,262~8,719 | — | 🔴 체감 7.6초 |

LCP 요소는 4회 모두 `H1.moon-hero__title` 이었다.

🔴 `/fortune/today/` · `/insights/` 의 CLS 0.275 는 **PR #1203 이 고쳤지만 프로덕션 승격 전이라
아직 살아 있다.** 승격 후 재측정으로 0 을 확인할 것.

---

## 2. 🔴 실측으로 지운 오해 (다시 파지 말 것)

### 2-1. 부팅 게이트는 LCP 를 붙잡지 않는다

| run | 게이트 해제 | LCP | HTML 완료 |
|---:|---:|---:|---:|
| 1 | 11,511 | 5,636 | 6,579 |
| 2 | 8,719 | 3,116 | 3,849 |
| 3 | 8,262 | 2,784 | 3,544 |
| 4 | 8,486 | 2,960 | 3,889 |

**LCP 가 게이트 해제보다 항상 5초 이상 빠르다.** 히어로는 베일 *아래에서* 이미 페인트되고
LCP 는 그때 찍힌다. 게이트를 일찍 걷어도 **LCP 숫자는 안 변한다** — 체감만 바뀐다.

### 2-2. 문서 총 크기도 LCP 의 직접 원인이 아니다

히어로 H1 앞은 문서의 **4.6%(57,042B)** 뿐이고, run 3 은 LCP(2,784ms)가 HTML 다운로드
완료(3,544ms)보다 **먼저** 찍혔다. 즉 파서가 히어로에 도달하는 순간이 LCP 다.

히어로 앞 57,042B 의 내역:

| 구성 | 개수 | 바이트 |
|---|---:|---:|
| 인라인 `<style>` | 5 | 33,822 |
| **파서 차단 `<script src>`** | **8** | **30,660** |
| 인라인 `<script>` | 7 | 11,673 |

### 2-3. 이미 재서 기각한 레버 2개

[seo-followups-2026-08-27.md](seo-followups-2026-08-27.md) §3-3(5)·§5-3 참조.
인라인 CSS 외부화(첫 방문 **+3,849B**) · `<style>` 44개 head 모으기(**LCP +240ms**).

---

## 3. INP 568ms 의 정체 — 핸들러가 아니라 프레젠테이션 지연

게이트 해제 후 6초 정착시킨 뒤 12개 요소를 탭한 결과:

| dur | 입력지연 | 처리 | 프레젠테이션 | 대상 |
|---:|---:|---:|---:|---|
| **568** | 2 | **0** | **566** | `A.cd-mobile-bottom-nav__item` (`data-nav-key="fortunes"`) |
| 168 | 24 | 1 | 144 | `DIV.moon-hero__copy` |
| 120 | 38 | 0 | 81 | `BUTTON#cdCookieAcceptBtn` |
| 104 | 24 | 2 | 78 | `SPAN.lang-main` |
| 40 | 19 | 1 | 20 | `DIV#cdMobileFortuneOverview` |

🔴 **처리 시간이 0~2ms 다.** 자바스크립트 핸들러는 사실상 즉시 끝나고, 566ms 는 브라우저가
**다음 프레임을 만드는 데** 쓴다. 하단 탭바의 `is-active` 클래스 토글이 문서 전체의 스타일
재계산을 유발하는 모양이다.

이는 메인스레드 분해와 일치한다(스테이징 `/`, `Performance.getMetrics`):

| 항목 | 시간 | 비중 |
|---|---:|---:|
| TaskDuration | 9,809ms | 100% |
| **RecalcStyle** | **4,170ms** | **42.5%** (531회) |
| Layout | 1,885ms | 19.2% (174회) |
| Script | 1,133ms | 11.5% |

대조군 `/saju/` 는 RecalcStyle **220ms / 56회**(홈의 1/19), INP **40ms**.
홈은 DOM **2,234** 엘리먼트 · 시트 **100**개 · 규칙 **4,977**개다.

🔴 **그러므로 "JS 를 줄이면 INP 가 좋아진다"는 접근은 틀렸다.** 줄여야 하는 것은
**클래스 토글 한 번이 무효화하는 범위**다.

---

## 4. 남은 선택지

### A. 히어로 앞 파서 차단 스크립트 8개 심사 — **LCP 전용, 추천 착수점**

워터폴에서 히어로 앞에 있던 것들(2026-08-28):
`/js/inline/canonical-redirect.js` · `legacy-action-launcher.js` · `global-error-guard.js` ·
`gesture-arbiter.js` · `/js/core/pass-verdict.js` · `auth-hint.js` · `access-store.js` ·
`payment-service.js`

- **이득**: LCP 에 직접 작용하는 **유일한** 안. 몇 개만 히어로 뒤로 내려도 수백 ms.
- 🔴 **위험**: 개별 판정이 필수다.
  - `canonical-redirect` 는 첫 페인트 전에 돌아야 할 수 있다(리다이렉트).
  - `pass-verdict` · `access-store` · `payment-service` 는 **결제 게이팅 순서 의존**이다 —
    [docs/context/payment-gating.md](../context/payment-gating.md) 를 먼저 읽고
    `paid-gate-auditor` 서브에이전트를 돌린 뒤에 손댈 것. `config/payment-freeze.json` 등재
    여부도 확인해야 한다.
  - `global-error-guard` 는 이름 그대로 다른 스크립트보다 먼저 떠야 의미가 있을 수 있다.
- **비용**: 소스 `index.html` 수정 + `sync:public` 미러 13개(캐시키 회전으로 diff 가 크게 잡힌다
  — [sync-public-output-must-be-committed] 참고).
- 🔴 **진행 방법**: 8개를 한꺼번에 옮기지 말 것. **결제·리다이렉트와 무관한 것 1~2개**부터
  히어로 뒤로 내리고 아래 §5 재현 명령으로 A/B 를 잰다. 개선이 노이즈(±300ms) 밖일 때만 남긴다.

### B. 부팅 게이트 조기 해제 — 체감 전용, CWV 무관

사용자는 **7.6초간 베일만 본다**(1.2s→8.8s). §2-1 대로 LCP 숫자는 안 바뀐다.

- 🔴 **CWV 개선으로 보고하면 안 된다.** 이탈·체감 개선 과제로 분리할 것.
- 코드: `index.html` 의 `data-marker="cd-boot-gate-release-v20260730"` 블록.
  게이트는 `dom`·`auth`·`profile` 세 신호를 기다리는데, **비로그인 진입은 이미 `auth`·`profile`
  을 즉시 마킹**하므로 실질적으로 `DOMContentLoaded`(7.7~8.2초)만 기다린다.
  그 DCL 이 늦는 이유는 §4-C 의 파서 차단 스크립트 24개(717KB)다.
- 하드 상한은 비딥링크 8,000ms · 딥링크 5,000ms 이고, 그 8초의 근거(이용권 재시도 6.5초)가
  코드 주석에 적혀 있다 — **줄이려면 그 근거부터 다시 볼 것.**

### C. 스타일 재계산 범위 축소 — INP·TBT 의 진짜 원인, 대공사

- 홈 전체 파서 차단 `<script src>` 는 **24개 717KB**(상위 2개가 306,002B + 246,748B = 553KB).
  이들은 `scripts/externalize-dist-inline-scripts.mjs` 가 만든 것이고, **의도적으로 `defer` 가
  없다** — 남은 인라인 블록과의 실행 순서를 보존해야 하기 때문이다(그 스크립트 머리말에 근거).
  전부 defer 로 바꾸려면 8KB 미만 인라인 블록 53개까지 함께 외부화해야 순서가 유지된다.
- 🔴 그런데 INP 의 원인은 스크립트가 아니라 **클래스 토글의 무효화 범위**다(§3).
  셸 CSS 는 `!important` 4,990개에 `html body .x` 류 셀렉터가 많아 문서 전체를 무효화한다.
- 손대려면 범위를 먼저 자를 것: **하단 탭바 `is-active` 토글 한 경로만** 잡고
  `Performance.getMetrics` 의 `RecalcStyleCount` 로 전후를 재는 것이 최소 단위다.

### D. TTFB / 문서 캐시 — [seo-followups-2026-08-27.md](seo-followups-2026-08-27.md) §4 와 한 묶음

HTML 이 Worker 를 타고 `no-cache`·`cf-cache-status: DYNAMIC` 으로 나가 ETag 재검증이 없다.
TTFB ~650ms 는 기준 안이라 LCP 기여도는 A 보다 작다. 사용자가 2026-08-27 에 보류한 항목이다.

---

## 5. 재현 명령 (측정기는 레포에 없다 — 스크래치에서 돌렸다)

전부 Playwright(`require.resolve('playwright')` = 저장소 루트 설치본) + CDP 다.
공통 설정: `newContext({viewport:{width:390,height:844}, deviceScaleFactor:3, isMobile:true, hasTouch:true})`
+ `Network.emulateNetworkConditions({latency:150, downloadThroughput:1.6*1024*1024/8})`
+ `Emulation.setCPUThrottlingRate({rate:4})`.

| 재고 싶은 것 | 방법 |
|---|---|
| LCP·CLS·FCP | `addInitScript` 로 `PerformanceObserver`(`largest-contentful-paint`·`layout-shift`·`paint`) |
| 메인스레드 분해 | `Performance.enable` → `Performance.getMetrics` 의 `TaskDuration`/`RecalcStyleDuration`/`LayoutDuration`. 🔴 `npm run perf:style-cost` 로 재지 말 것([perf-style-cost-inflates-recalc]) |
| recalc 원인 | `Tracing.start` 에 `disabled-by-default-devtools.timeline.stack` 포함 → `UpdateLayoutTree` 의 `args.beginData.stackTrace` 집계. **스택 없는 것이 파서 몫** |
| INP | 게이트 해제까지 `waitForFunction` → 정착 → `PerformanceObserver({type:'event', durationThreshold:16})`, `interactionId` 별 최댓값. `processingStart/End` 로 입력지연·처리·프레젠테이션을 쪼갤 것 |
| 부팅 게이트 | Node 쪽에서 100ms 폴링으로 `documentElement.classList.contains('cd-boot-gate')` 관찰. 🔴 `addInitScript` 안의 MutationObserver 는 이 사이트에서 빈 결과를 돌려줬다 — 폴링을 쓸 것 |

🔴 **CLS 는 반드시 프로덕션에서 잰다** — 스테이징은 `noindex` 라 광고 경로가 막혀 CLS 를
0 으로 과소평가한다([staging-cwv-hides-ad-driven-cls]).

---

## 6. 진행 순서 (사용자가 2026-08-28 에 승인한 순서)

1. ~~INP 실측~~ — ✅ 이 문서 §3. **홈 568ms(나쁨), 원인은 프레젠테이션 지연**
2. **A — 히어로 앞 스크립트 8개** ← 다음 착수점. 결제 무관한 것부터 1~2개
3. B — 부팅 게이트(체감 과제로 분리)
4. C·D — 1·2 결과를 보고 판단

🔴 **먼저 할 것**: PR #1203(CLS 수정)이 머지됐지만 **프로덕션 승격 전이다.**
승격 후 `/fortune/today/` · `/insights/` 의 CLS 가 0.275 → 0 인지 재측정해서 닫을 것.
