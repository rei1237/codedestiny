---
status: active
updated: 2026-09-06
next: **루트 독립 정적 HTML 10건.** Phase C ①②(명상 2종·토템 진입, PR #1667)·③(`js/saju-engine.js` 7건, PR #1674)·④(**기타 정적 5건, PR #1687 — 사용자 머지 대기**)까지 끝났다. 다음은 루트 독립 정적 HTML 10건 → React 36건. 🔴 루트 HTML 은 명상 2종(`neville-meditation.html` 의 `startCourseCore`)을 그대로 베낀다 — 페이지가 자기 자신으로 복귀하므로 `action` 은 빈 문자열이고, 결제 게이트를 안 타는 코어를 잘라내 핸들러가 그것만 부른다.
---

# 유료 기능 결제 후 자동 개방 (리다이렉트 복귀)

## 왜

"결제 이후에 콘텐츠 자체가 열려야 하는데 메인 화면으로 간다" (숙요점 기본 궁합, 스테이징·프로덕션 모두).
"숙요점 뿐만 아니라 **모든 기능들**이 결제하면 그 기능이 열려야 한다."

## 지금 상태

- 공통 뼈대 + 카카오페이 타일 정합성 완료. 배선된 기능은 **21건** — 숙요 기본 궁합 · 연애 타로 · 재회 타로 · 명리 타로 3카드 · 숙요 정밀 궁합 확장 · 숙요 인연 레이더 · 코스믹 명상 · 네빌 명상 · 애니멀 토템 진입(PR #1667) · **`js/saju-engine.js` 7건**(PR #1674 — 셜럭 시나스트리 · 직접입력 시나스트리 · 자미두수 궁합 · 사주 궁합 · AI 상담 3종) · **기타 정적 5건**(PR #1687 — 신년 타로 · 프로필 카드 추가/삭제 · 애니멀 토템 뽑기 · 케메트 · 주역).
- 🔴 **배관은 끝났다** — `window._cdCoinGatePerUse` 정의 2곳(`js/destiny-profile.js:5673`·`:12488`)이 `resume` 을 게이트로 넘긴다. 이전에는 안 넘겨서, 옵션 백 없는 축약형을 쓰는 기능(타로 3종)은 서술자를 만들어도 티켓에 안 실렸다. 회귀 가드는 `__tests__/ui/direct-payment-resume.behavior.test.js` 의 "_cdCoinGatePerUse 는 resume 서술자를…" 테스트.
- 원인: 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 결제 게이트의 `await` 가 페이지와 함께 죽는다 → `onGranted` 가 **어떤 기능에서도** 실행되지 않는다. 복귀 처리(`_dpResumeDirectPaymentAfterRedirect`)는 완료 오버레이만 띄우고 기능을 다시 열지 않았다.
- 🔴 회당 결제(per-use) 키는 `worker/lib/access-state.js` 가 보유 목록에서 걸러내므로, 재클릭하면 **또 결제된다**. 그래서 로컬 영수증이 필요했다.

## 이번에 생긴 계약 (새 기능도 이걸 쓴다)

1. **영수증** — `checkoutEntry.savePaidGrantReceipt / peek / consume`. `featureKey|contentKey|profileId` 3중 일치, **1회 소비**, 24h TTL. 게이트 진입에서 서버 왕복 0으로 무료 통과시킨다(게이팅 절대 순서 1 — 여기에 서버 조회를 붙이지 말 것).
2. **재개 서술자** — 게이트 옵션에 `resume: {kind, action, args}`. 직렬화 가능한 값만 살아남는다.
3. **핸들러** — 기능 파일이 `checkoutEntry.registerPaidResumeHandler(kind, fn)` 로 등록. `false` 를 돌려주면 '지금 열기' 지속 카드로 떨어진다.
4. **표면을 여는 책임은 `runPaidResume` 하나** — 기능 스크립트는 지연 로드라 복귀 시점엔 핸들러가 없다. `runPaidResume`(`js/core/checkout-entry.js:1465`)은 **`readPaidResumeHandler(kind)` 를 먼저 보고 이미 등록돼 있으면 그대로 부른다**(`:1472-1473`) — `openPaidResumeSurface(action)` + 8초 폴링은 **핸들러가 없을 때만** 돈다(`:1478`). 그래서 셸에 상주하는 파일은 `action` 이 빈 문자열이어야 하고(안 그러면 이중 오픈), 지연 로드 파일은 진짜 딥링크가 있어야 한다. 🔴 핸들러 안에서 또 열면 이중 이동으로 재개가 날아간다.

## 정본 예시

`js/saju-engine-tarot-sukuyo-quantum.js` 의 `syBuildCompatResumeDescriptor` ~ `syRunCompatResume` 블록과 그 아래 `window.triggerSynergyCheck`. 복귀 처리 쪽은 `js/destiny-profile.js` 의 `_dpResumeDirectPaymentAfterRedirect` 단계 ③·⑦.

## 남은 작업

수집 명령 — 🔴 **초판 수집 명령은 범위가 좁았다**(2026-09-06 감사). `-- index.html js app` 은 **루트 독립 정적 HTML 11개**와 `_cdCoinGatePerUse` 계열을 통째로 놓친다. 정본은 아래다.

```
git grep -n "_cdOpenPaidServiceGate(\|_cdCoinGatePerUse(\|syRequirePaidSukuyoFeature(" -- index.html js '*.html'
git grep -l "ensurePaidAccess(" -- app
git grep -l "runBillingCoinGate(\|runPaidAccessGate(" -- app | grep -v billing-client.ts
git grep -n "registerPaidResumeHandler(" -- js | grep -v '^public/'   # 배선 완료분
```

실측(2026-09-06 재감사):

| 계열 | 개수 | 지금 상태 |
|---|---|---|
| 정적·레거시 (`index.html`·`js/**`) | 23건 | **19건 배선**(saju-engine 7건 + 기타 정적 5건 포함), 4건 미배선 |

🔴 미배선 4건 중 이름이 있는 것은 **숙요 AI 프롬프트 1건**뿐이다. **나머지 3건은 초판부터 이름이 없다(미분류·미검증)** — 위 수집 명령을 다시 돌려 배선 완료분을 뺀 차집합으로 확정할 것. 🔴 `git grep -c` 는 **줄 수**라 기능 수가 아니다(saju-engine 7건은 IIFE 한 줄에서 등록된다).
| 루트 독립 정적 HTML | 12건 / 11파일 | **2건 배선**(명상 2종), 10건 미배선 |
| React `useCoinGate.ensurePaidAccess` | 17파일 | 영수증 단축으로 **재과금만** 막힘. 자동 재개 없음 |
| React 직접 호출(`runBillingCoinGate`·`runPaidAccessGate`) | 19곳 | 🔴 **영수증도 안 탄다** |

✅ **React resume 배관은 PR #1656 에서 생겼다.** 남은 것은 호출부 36곳이 서술자를 만들어 넘기는 일(Phase C). 분류 미실시라 fail-closed 로 전부 (a) 취급한다.

판정 기준:

- **(a)** `onGranted` 가 DOM/폼 상태에 의존한다 → `resume` 서술자 필수 (숙요 궁합이 이 유형).
- **(b)** 자기 라우트에서 자기완결 → `action` 딥링크만으로 충분(서술자의 `args` 를 비운다).
- **(c)** 서버가 영구 unlock 한다 → 영수증도 재개도 불필요. 복귀 후 access-state 갱신만으로 열린다.

### 분류 결과 (2026-09-06 실측 — 근거는 `worker/lib/paid-feature-registry.js` 의 과금 유형)

🔴 **2026-09-06 정정** — 초판 표가 숙요/명리 항목의 파일을 `js/destiny-profile.js` 로 잘못 적었다(그 파일은 12,786줄이라 `:14587`·`:16991` 자체가 없다). 전부 **`js/saju-engine-tarot-sukuyo-quantum.js`** 다. 아래 줄번호는 배선 후 기준.

**(a) 초판이 세던 8건 — 6건 배선 완료, 2건은 계약 공백.** 🔴 (a) 전체 모수는 8이 아니다 — 아래 "미배선 잔여" 가 정본이다.

| 기능 | 호출부 | 상태 |
|---|---|---|
| 숙요 기본 궁합 | `sukuyo-quantum.js:16223` | ✅ `sukuyo-compat` (정본) |
| 연애 타로 | `js/tarot-love-experience.js:638` | ✅ `tarot-love-final` |
| 재회 타로 | `js/tarot-reunion-experience.js:459` | ✅ `tarot-reunion-final` |
| 명리 타로 3카드 | `sukuyo-quantum.js:896` | ✅ `myeongri-tarot-three-card` |
| 숙요 정밀 궁합 확장 | `sukuyo-quantum.js:17258` | ✅ `sukuyo-compat-precision` |
| 숙요 인연 레이더 | `sukuyo-quantum.js:12677` | ✅ `sukuyo-bond-report` |
| 숙요 AI 프롬프트 | `sukuyo-quantum.js:15509` | 🔴 미배선 (계약은 닫혔다) |
| 사주·점성술·자미두수 AI 상담 | `js/saju-engine.js` 공통 게이트 `_cdAIPromptGate` | ✅ `saju-engine-{saju,astro,ziwei}-ai-prompt` (PR #1674) |

등록된 핸들러 전수: `git grep -n "registerPaidResumeHandler(" -- js '*.html' | grep -v '^public/'` → 9건. 🔴 명상 2종은 `js/**` 가 아니라 루트 HTML 의 인라인 스크립트에 있으므로 **`'*.html'` 를 범위에 넣어야 보인다.**

PR #1667 로 추가된 3건 — 코스믹 명상 `cosmic-soul-meditation.html` `cosmic-soul-meditation-session`(`args.mode`) · 네빌 명상 `neville-meditation.html` `neville-meditation-course`(`args.mins`) · 애니멀 토템 진입 `js/core/index-inline-runtime.js` `animal-totem-entry`(`args` 없음). 셋 다 `action` 이 **빈 문자열**이다 — 명상 2종은 PG 복귀 지점이 자기 자신이라 인라인 스크립트가 항상 함께 로드되고, 토템은 `action` 을 채우면 `runPaidResume` 이 타일을 다시 눌러 게이트가 한 번 더 돌아 이중 오픈이 된다.

**(b) 딥링크만 — 0건.** 🔴 초판이 (b) 로 분류한 신년 타로 `js/tarot-year-fortune-experience.js:432` 는 **(a) 다** — `_runTarotYearFortuneReading()`(`:799-829`)이 `state.requestId` 를 요구하는데 그 값이 **sessionStorage**(`getOrCreateYearRequestId:390`)라 카카오페이 새 탭 복귀 시 소실 → 재생성 → 서버 뽑기 결과가 유실된다.

**(c) 서버 영구 unlock — 6건. 🔴 "손댈 것 없음"은 오해다.**

(c) 가 보장하는 것은 **재과금 없음**뿐이고 **스스로 열리지는 않는다.** 근거: `js/destiny-profile.js:4604-4613` — 서술자가 없으면 `resumeAction` 이 비어 `_dpShowDirectResumeCard(..., null, '다시 누르면 무료')` 카드만 뜨고 표면은 안 열린다. 6건 전부 표면이 **재렌더된 숙요 리포트 내부**라 딥링크 `openSukuyoModal` 만으로도 부족하다.

극T `sukuyo-quantum.js:4747` · 본성 심화 `:9863` · 인연 도감 `:13063` · 1년운 `:14732` · 테토에겐 `js/entertain-engine.js:2866`(딥링크 미확인) · 시빌 `js/sibyl-system.js:3759`.

### 미배선 잔여 — 전수 (2026-09-06 감사)

**`js/saju-engine.js` 7건 — ✅ 배선 완료 (PR #1674).** 🔴 **초판의 "위치 인자라 optionBag 자체가 없다(난도 상)"는 오진이었다** — `_cdCoinGatePerUse(cost, reason, cb, onCancel, options)`(`js/destiny-profile.js:5686`)는 이미 옵션 백을 받고 `action`·`resume` 을 그대로 게이트로 넘긴다. 4번째 인자가 객체면 옵션 백으로 취급하는 shim 도 있어 **시그니처를 고칠 일이 전혀 없었다.** 같은 실수를 반복하지 않으려면 "인자 수가 적다"를 난도 근거로 쓰지 말고 **정의부를 열어 볼 것**(원칙 8).

배선 형태(다음 5건이 그대로 베낄 것): 파일 상단에 공통 배관 `_seRegisterResumeHandler` · `_seWaitForResumeTarget`(8000ms/200ms) · `_seSetFieldValue`(값 대입 후 `change` 디스패치) · `_seResumeEvidence`(grant → `_cdAIPromptGateEvidence`) 를 두고, 7 kind 를 최상위 IIFE 하나에서 등록한다.

| kind | action | 부르는 코어 |
|---|---|---|
| `saju-engine-astro-celeb-synastry` | `openAstroModal` | `_astroPickCelebCore` |
| `saju-engine-astro-direct-synastry` | `openAstroModal` | `_astroDirectSynastryCore` |
| `saju-engine-ziwei-compat` | `openZiweiModal` | `_runZwCompatibilityCore` |
| `saju-engine-saju-compat` | `cdSajuTabEntry` | `runCompatCore` |
| `saju-engine-saju-ai-prompt` | `cdSajuTabEntry` | `_sajuAiPromptResumeCore` |
| `saju-engine-astro-ai-prompt` | `openAstroModal` | `_astroAiPromptResumeCore` |
| `saju-engine-ziwei-ai-prompt` | `openZiweiModal` | `_zwAiPromptResumeCore` |

🔴 **`action` 은 반드시 게이트를 안 타는 딥링크여야 한다** — `runCompat`·`calculate` 를 넣으면 `__cdInvokeAction` 이 게이트를 다시 태워 **재결제**가 난다. 위 3개 action 은 전부 `index.html` 에 `data-action` 노드로 존재하면서 saju-engine.js 를 끌어온다(이 파일은 어떤 HTML 도 정적 로드하지 않는 지연 스크립트라 `action` 을 비울 수 없다 — 명상 2종과 다른 점).
🔴 **AI 상담 3종은 화면만 열어선 안 된다** — 생성 POST 에 결제 당시 `requestId` 가 실린 증빙이 없으면 서버가 402 를 준다. 그래서 세 화면 각각의 **기존 "재결제 없는 재시도" 슬롯**(사주 `lastPaidEvidence` · 점성술 `astroEvidenceStore` · 자미두수 `handleGenerate` 의 `paidEvidence` 분기)에 밀어 넣고 기존 핸들러를 그대로 재사용했다 — 원칙 6(병렬 경로 금지).

**기타 정적 5건 — ✅ 배선 완료 (PR #1687).**

| kind | action | 부르는 코어 | args |
|---|---|---|---|
| `tarot-year-fortune` | `openTarotYearFortuneModal` | `_runTarotYearFortuneReading` | `year`·`requestId` |
| `profile-card-manage` | `''` (셸 상주) | `_dpSendProfileMutation` | `action`·`profileId`·`requestId`·`profileJson` |
| `animal-totem-draw` | `openAnimalTotemModal` | `_totemRenderPaidSpread` | `mode`·`question` |
| `kemet-oracle` | `openKemetModal` | `_kemetEnterCardStage` | `question` |
| `iching-turtle` | `openJuyukModal` | `_doCrack` | `question` |

이 5건에서 새로 확인한 것:

- 🔴 **`runPaidResume` 은 핸들러가 이미 등록돼 있으면 표면을 열지 않는다** — `readPaidResumeHandler(kind)` 를 **먼저** 보고, 있으면 그대로 부른다. `openPaidResumeSurface` + 8초 폴링은 핸들러가 **없을 때만** 돈다. 그래서 지연 로드 기능은 `action` 에 진짜 딥링크가 필요하고(표면이 열려야 스크립트가 로드되고 핸들러가 등록된다), 셸 상주 파일은 `action` 이 빈 문자열이어야 한다.
- **`action` 딥링크가 게이트를 타는지 판정하는 법** — `__cdInvokeAction` → `__cdRequireTileLockGate(actionEl)` 는 노드에 `data-tile-lock-key` **와** `data-tile-lock-cost > 0` 이 **둘 다** 있을 때만 문다. `openTarotYearFortuneModal`·`openKemetModal`·`openJuyukModal` 타일은 `data-coin-cost`·`data-feature-key` 만 갖고 있어 안전하다(회당 코인 게이트는 클릭 경로의 델리게이션 `_cdRunPerUseCoinGate` 쪽에만 있다).
- **애니멀 토템 2단계** — 진입 재개 `animal-totem-entry`(`js/core/index-inline-runtime.js:3317`)는 `action:''` 을 그대로 둔다(`openTotemModal` 은 타일 클릭 핸들러라 재과금한다). 뽑기 재개만 `action:"openAnimalTotemModal"` 을 쓴다 — 셸의 `window.openAnimalTotemModal`(`js/core/index-inline-runtime.js:8868`)이 **게이트 없는 지연 로더 + 오픈**임을 확인했다.
- **프로필은 요청 조립을 한 곳으로 모았다** — `_dpSendProfileMutation(mutationAction, profileId, requestId, profileData, paymentContext)` 를 생성·수정·삭제·재개 4경로가 공유한다(원칙 6). 재개는 `_dpBuildProfileResumePaymentContext(grant, …)` 로 결제 증빙을 얹어 **같은 요청**을 재발행한다. 🔴 삭제는 공용 코인 게이트가 아니라 `_cdRunDirectKrwCheckout` 직행이라 서술자를 그 **opts** 에 실어야 `_dpWriteDirectResumeTicket` 이 티켓에 담는다. 월정석 분기는 리다이렉트가 없어 재개가 필요 없다.
- 🔴 **핸들러 등록 타이밍** — `js/destiny-profile.js` 는 `checkout-entry.js` 보다 먼저 실행될 수 있어 `_dpRegisterPaidResumeHandler` 가 8초 상한으로 재시도한다(`runPaidResume` 의 폴링 상한과 같은 값).

**루트 독립 정적 HTML 10건** — `celestial-harmony.html:2193` · `geomancy-oracle-v4.html:941` · `ifa_oracle_v2_full.html:515` · `royal-tea-oracle.html:2233` · `tarot-ijik.html:2139` · `yoga-guru.html:1484` · `vedic-astrology.html:3532`·`:4075`·`:7102` · `pet-saju.html`(아래 위반 항목). 🔴 배선 형태는 명상 2종을 그대로 베낀다 — 결제 게이트를 안 타는 **코어 함수**를 분리하고 핸들러는 코어만 부른다(`neville-meditation.html` 의 `startCourseCore`).

**React 36건** — 위 "계약 공백" 과 같은 이유로 배관부터 필요하다. 영수증만으로 여는 지름길을 붙이려면 `app/_lib/billing-client.ts:1724-1770` `hasVerifiedBillingAccess(data, expectedFeatureKey)` 를 만족시켜야 한다(featureKey 일치 + `accessGrant.*` 또는 `consume.*` 식별자).

### 계약 공백 (Phase B) — ✅ 닫혔다 (PR #1656)

`runPaidResume(descriptor, proof)` 가 확정 응답에서 `{requestId, merchantUid, featureKey, payload}` 를 조립해 **핸들러 2번째 인자**로 넘긴다. 인페이지 `onGranted(gateResult)` 와 같은 자리라 기능 파일의 기존 증빙 조립기가 고칠 것 없이 읽는다. 🔴 기능 파일에서 영수증을 직접 읽어 증빙을 조립하지 말 것 — 게이트의 영수증→grant 로직이 둘로 갈린다(원칙 6). 회귀 가드는 `__tests__/ui/direct-payment-resume.behavior.test.js` 의 "재개 핸들러는 서술자와 함께 결제 증빙…" 테스트.

인연 레이더 아카이브 공백(재개 시 `gateResult = null` 로 열려 서버 아카이브 쓰기가 402)도 같이 닫았다 — `syRunBondResume(descriptor, grant)` → `window._syRunSukuyoBondReportCore(grant || null)`.

React 배관도 같은 PR 에서 열렸다: `EnsurePaidAccessInput`/`BillingCoinGateInput` 의 `resume` → `runPaidAccessGate` → `runBillingCoinGate` → 런타임 게이트 → dp 복귀 티켓. **호출부 36곳은 아직 서술자를 안 만든다** — 배관만 있고 배선은 Phase C 다.

### 배선 레시피 (연애 타로를 그대로 베낀다)

1. 기능 파일에 `<KIND>` 상수 + `build…ResumeDescriptor()` — 🔴 `sanitizePaidResumeDescriptor` 가 **원시값만** 남기므로 카드 배열 같은 건 `JSON.stringify` 로 문자열 1개에 담는다.
2. `wait…Overlay(8000ms/200ms 폴링)` → 표면이 열릴 때까지 기다린 뒤 상태 복원.
3. `registerPaidResumeHandler(<KIND>, run…Resume)` 를 **모듈 최상위 IIFE** 로 등록(스크립트 eval 은 동기라 모달 오픈보다 먼저 끝난다).
4. 게이트 호출부는 결제 **전에** 서술자를 만들어 넘긴다. 🔴 핸들러는 게이트를 다시 타는 공개 함수가 아니라 **게이트 없는 코어**를 부른다(재결제 방지).

**코어가 렌더 클로저 안에 있을 때**(2026-09-06 신규 2건) — 렌더할 때마다 `window.<코어>` 에 최신 함수를 대입하고, 재개 핸들러는 **다시 그리기 전에 그 전역을 `null` 로 지운 뒤** 새 것이 뜰 때까지 폴링한다(지난 렌더의 죽은 클로저를 부르는 사고 방지). 현재 전역 2개: `_syRevealCompatPrecisionCore`(정밀 궁합) · `_syRunSukuyoBondReportCore`(인연 레이더). 인연 레이더는 제출 흐름을 `runBondReport(event, {skipGate:true})` 로 합쳐 계산·렌더 경로가 갈라지지 않게 했다.

"됐다"의 판정: 모바일 에뮬레이션에서 결제 → 복귀 시 그 기능이 **스스로** 열리고, 곧바로 다시 눌러도 결제창이 안 뜨며(영수증 소비), 그 다음 클릭에는 정상적으로 뜬다.

## 함정

- 🔴 **React 직접 호출 19곳에는 영수증 단축을 넣지 못했다.** `runBillingCoinGate` 는 결제 뒤 서버 응답을 `hasVerifiedBillingAccess` 로 검사하므로, 영수증만으로 통과시키려면 서버 모양의 `BillingCoinGateData` 를 위조해야 한다(호출부마다 `consume`·`pricing` 에서 읽는 필드가 다르다). 각 호출부에서 개별 판단이 필요하다.
- `useCoinGate` 의 영수증 검사는 **중첩 사전검사가 아니다**(원칙 6 확인 완료) — React 는 `internalMainGate: true` 로 dp 게이트에 들어가 거기 있는 같은 단축을 **타지 않는다**.
- 독립 정적 페이지의 `?v=` 핀은 `sync:public` 이 안 돌린다. `verify:payment-choice-parity` 가 낡은 핀을 잡아 새 값을 알려준다.
- 🔴 **핀 전건 치환은 확장자로 거르지 말 것**(2026-09-06 실측 — CI 전에 두 바퀴 헛돌았다). `grep -rl --include=*.html --include=*.js` 로 찾으면 `dp` 축 핀 보유자 중 **`app/_lib/billing-client.ts`(`PAID_SERVICE_RUNTIME_SRC`)와 그 값을 문자열로 단언하는 `scripts/verify-paid-gate-ui-regression.mjs`** 를 통째로 놓친다. 파서는 `git ls-files` 전수라 확장자를 안 가린다 — **확장자 필터 없이** 검색한다. 실제 보유자 4종: 루트 독립 정적 HTML · `app/_lib/billing-client.ts` · `scripts/verify-paid-gate-ui-regression.mjs` · 미러가 아닌 자체 정본 2개(`public/ifa-oracle.html`·`public/static/geomancy-oracle-v4.html`).
- 🔴 **`app/_lib/billing-client.ts` 는 결제 동결 `wholeFiles` 다** — 핀 한 글자만 돌려도 `verify:payment-freeze` 가 문다. `node scripts/verify-payment-freeze.mjs --update` 결과를 **같은 커밋에** 담는다(핀 회전은 결제 정책 변경이 아니므로 `worker/payments/` 대응은 불필요).
- 🔴 **코어를 잘라낼 때 유효성 판정을 전역 상태 대입보다 앞에 둔다.** 재개 핸들러는 신뢰할 수 없는 `args` 를 들고 들어오므로, `course = COURSES[mins]` 처럼 먼저 대입하고 나중에 검사하면 알 수 없는 키가 **진행 중이던 세션의 상태를 지운다**(네빌 명상에서 실제로 잡았다).

## 이번 범위 밖 인접 결함 (고치지 않았다 — 원칙 14)

**2026-09-06 재감사에서 새로 나온 3건**

- ✅ **게이팅 절대 순서 1 위반 — PR #1656 에서 제거.** `pet-saju.html` 의 진입 전 `_cdResolvePaidContentAccess` 선검사를 지우고 `_cdOpenPaidServiceGate` 에 위임했다. 🔴 그 페이지는 `_cdResolvePaidContentAccess` 를 정의하는 `index.html` 을 로드하지 않아 **실행되지 않던 죽은 코드**였다(스크립트 4개만 로드: pass-verdict·checkout-entry·payment-service·destiny-profile) — 형태 위반이라 지웠다. 같은 PR 에서 `js/destiny-profile.js` 진입점 2곳(`:5804`·`:12611`)에 빠져 있던 `snapshotVerdictOnly:true` 도 채웠다.
- 🔴 **판정 전 인증 선워밍 이중 (미해결 · 결제 동결 파일)** — `app/hooks/useCoinGate.ts:370-373` 과 `app/_lib/billing-client.ts:4011-4014` 가 각각 `Promise.race([refreshAuth({force:true,silent:true}), 4000ms])` 를 스냅샷 판정 전에 await 한다. `definitelySignedOut` 이 false 인 상태(`unknown`/`refreshing`/`temporarilyOffline`)에서는 **둘 다** 걸려 판정까지 최대 8초, 두 번째 `force:true` 가 `/me → /refresh → /me` 를 다시 태울 수 있다. 단일비행이 대개 합쳐 주지만 보장은 아니다. 두 파일 모두 payment-freeze `wholeFiles` 이고 주석에 양방향 회귀 이력이 남아 있어 **사용자 판단 후** 손댄다.
- ⚠️ **결제창 이용권 카드 제거 (의심)** — `app/music/MusicPlayerExample.tsx:1428-1434` 가 `isDownloadOnlyPurchase` 일 때 `disablePassChoice:true`·`allowedPaymentModes:["direct","monthly"]` 를 넘긴다. `docs/payment-policy-flow.md:55` 는 **`passExcluded` 등재 기능에 한해** 이 형태를 허용하는데, `music_track` 다운로드 전용 구매의 서버 등재 여부는 **미확인**이다.
- 🔴 **CI 트리거 구멍 (원칙 10)** — `.github/workflows/paid-flow-gates.yml` 의 `paths` 에 `js/saju-engine-tarot-sukuyo-quantum.js`·`js/tarot-*-experience.js`(신년 타로 포함)·`js/entertain-engine.js`·`js/sibyl-system.js`·`js/animal-totem-experience.js`·`js/iching-engine.js` 가 없다. **2026-09-06 재확인**: `js/destiny-profile.js`(`:135`)·`js/oracle-kcg.js`(`:145`)는 미러와 함께 등재돼 있고, 위 목록은 여전히 없다. 지금 이 파일들을 읽는 가드가 없어(동결 매니페스트에도 미등재) 무는 구멍은 아니지만, 가드를 하나라도 붙이는 순간 사각지대가 된다. 실제로는 `sync:public` 이 `index.html` 핀을 회전시켜 게이트가 깨어나지만(그건 우연이다), 이 파일들만 바뀌는 PR 은 결제 게이트를 안 깨운다. `scripts/lib/change-risk.mjs` 에서도 `level=medium`·`deepRequired=false` 로 떨어진다.

**초판에 있던 6건**

- `js/destiny-profile.js:12755` 부근 `_dpChooseServicePaymentMode` 폴백 경로는 아직 `resume` 을 안 넘긴다. `_cdOpenPaidServiceGate` 가 없을 때만 타는 길이라 지금 배선된 3건에는 영향이 없지만, 같은 옵션 백을 쓰는 길이 둘로 갈려 있다.


- `app/components/AppChrome.tsx:131-140` `isUnsafePaymentReferrer` — PG 복귀 직후 `document.referrer` 가 교차 출처라 뒤로가기가 `hardNavigateToShellHome()` 로 직행한다.
- React 복귀 핸들러가 `requestIdleCallback({timeout:4000})` / `setTimeout(2000)` 뒤에 있어 파라미터만 있고 핸들러가 없는 수 초의 창이 있다.
- `worker/routes/payments.js:1018-1030` `sanitizeReturnPath` 기본값이 `/` — 서버 생성 `redirectUrl` 을 쓰는 소비자는 무조건 홈이다(셸·dp 는 자체 URL 을 써서 지금은 안 걸린다).
- `app/_lib/paid-attempt-session.ts:221-241` 이 `session.route` 를 들고도 이동시키지 않는다. 홈행 차단 가드(`app/providers/NavigationProvider.tsx:200-210`)는 `app/**` 전용이라 셸·모바일 백스택에는 없다.
- "보던 화면으로 복귀"(`cd_checkout_return_v1`)가 **이용권 상점 왕복에만** 배선돼 있다. 쓰는 곳은 3곳(`app/_lib/billing-client.ts:969`·`index.html:21398-21402`·`js/destiny-profile.js:2996-3002`)인데 읽는 곳은 `app/points/PointsClient.tsx:3272` 하나뿐이라, **PG 리다이렉트 복귀는 이 기구를 안 탄다**. 이번 뼈대는 `resume` 서술자로 우회했으므로 둘 중 하나로 정리할 대상이다(원칙 6 — 같은 축의 장치가 둘이다).

## 검증

```
npm run verify:checkout-pass-card && npm run verify:payment-choice-parity
npm run verify:paid-gate-ui && npm run verify:portone-single-payment
npm run verify:billing-pass-policy && npm run verify:paid-feature-billing-policy
npm run verify:payment-freeze && npm run verify:guard-wiring
npm run verify:tarot-love-flow
node --test __tests__/ui/direct-payment-resume.behavior.test.js
npm run lint && npm run typecheck && npm run check:quick
```

- 🔴 배선 뒤 `npm run sync:public` 은 필수다. **핀 회전이 따라오는지는 무엇을 고쳤느냐로 갈린다** — 기능 파일만 고친 배선 3건에서는 `sync:public` 만으로 PASS 했지만, PR #1656 처럼 `js/core/checkout-entry.js`·`js/destiny-profile.js` 를 고치면 **두 축이 동시에 낡는다**: core 핀(`checkout-entry.js`+`pass-verdict.js` 유도)과 dp 핀(`destiny-profile.js` 유도). `verify:payment-choice-parity` 는 **한 번에 한 축만 알려주므로** 고치고 다시 돌리기를 반복한다. 🔴 `public/ifa-oracle.html` · `public/static/geomancy-oracle-v4.html` 은 미러가 아니라 자체 정본이라 `git grep -l "<낡은 핀>"` 전건 치환이 필요하다.
- 🔴 **워크트리에서는 `npm run setup:git` 을 먼저 돌린다**(2026-09-06 실측 — PR #1674 가 이것 때문에 `CONFLICTING` 이었다). `.gitattributes` 의 `index.html merge=cachebust` 는 **선언일 뿐**이고 드라이버 등록은 `.git/config` 에 있는데, **새 워크트리에는 그 설정이 안 따라온다.** 등록 전에는 `origin/main` 리베이스가 핀 90줄에서 통째로 충돌하고, 등록 후에는 같은 리베이스가 **충돌 0으로 통과**했다. 확인: `npm run verify:cachebust-merge`.
- 🔴 **순서는 핀 sed → `sync:public` 이다**(2026-09-06 CI 한 바퀴를 태웠다). 핀 치환이 `index.html`·루트 js 를 건드리므로 **셸 빌드 핀이 다시 낡는다** — 치환 뒤 `sync:public` 을 안 돌리면 로컬 `verify:payment-choice-parity` 는 PASS 인데 CI 의 `Static guards` → `verify:public-mirror-fresh` 가 19개 파일로 떨어진다. 커밋 전 `npm run verify:public-mirror-fresh` 로 확인한다.
- `build:worker` 는 `check:critical` 에 있다. 🔴 `check:quick -- --skip-build` 의 워크트리 결과는 **날마다 갈렸다**(2026-09-06 같은 날 두 실측): `origin/main` 리베이스 **전** 브랜치에서는 `Could not resolve "workers-og"` 로 BLOCKED, 리베이스 **후**에는 같은 워크트리에서 `EXIT=0` 이었다. 🔴 **원인 확정(2026-09-06 3회차 실측)**: `package.json:542` 에 `"workers-og": "^0.0.27"` 이 선언돼 있는데 **루트 `node_modules/workers-og` 가 아예 없다**(`ls -d ../../../node_modules/workers-og` → No such file). 워크트리에 `node_modules` 가 없어 상위로 올라가는데 거기에도 없으니 esbuild 가 못 푼다. 코드와 무관하므로, BLOCKED 가 나오면 그 앞 게이트(whitespace·changed-file lint·sitemap drift·typecheck·mock core smoke·env-parity) 출력으로 판정하고 빌드는 CI 에 맡긴다.
- 🔴 `app/**` 를 건드리면 `config/sitemap-lastmod.json` 이 무효화된다 — `npm run sitemap:generate` 결과를 같은 커밋에. 캐시 핀 치환이 `app/layout.js` 에 걸리므로 **핀을 돌린 뒤 한 번 더** 돌린다.
- 빌드가 `rss.xml`·`insights/rss.xml`(+ `public/` 미러)의 `lastBuildDate` 만 건드린다 — **커밋에 담지 말고 `git checkout --` 로 되돌린다.**

## 모르는 것

- **실결제 복귀 1건 미실측** — 규칙 2(실결제 금지)라 모바일 실기기 복귀는 사용자 확인이 필요하다. 배선 6건 전부 코드 독해 기반 판정이다.
- **React 36건의 호출부별 (a)/(b)/(c) 분류 미실시** — 배관 부재만 실측했다. fail-closed 로 전부 (a) 취급 중.
- **레지스트리 등재 미확인 featureKey**: `vedic_prashna_prompt` · `vedic-compatibility-per-use` · `saju_ai_prompt_generator`(↔`saju_ai_question_prompt` 별칭 여부) · `compat-astro-direct-synastry`.
- **호출부 본문 미확인**: `ifa_oracle_v2_full.html:515` · `yoga-guru.html` · `vedic-astrology.html` 3건의 성공 후 경로.
- 스테이징 카카오페이는 `/^PORTONE_/` 시크릿 미주입 정책이라 타일이 '준비 중'으로 뜨는 것이 정상이다. 실제 결제까지 보려면 테스트 채널키 동기화가 필요하고 **시크릿이라 사용자가 직접** 한다(`docs/handoff/kakaopay-golive-2026-08-31.md`).
