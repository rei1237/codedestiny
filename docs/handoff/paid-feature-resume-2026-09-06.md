---
status: active
updated: 2026-09-06
next: **(a) 남은 2건은 배선 불가** — 아래 "계약 공백(Phase B)" 을 먼저 해결한다. `runPaidResume` 이 핸들러에 결제 증빙(`gateResult`)을 안 넘겨서 AI 상담 2건이 막혀 있다.
---

# 유료 기능 결제 후 자동 개방 (리다이렉트 복귀)

## 왜

"결제 이후에 콘텐츠 자체가 열려야 하는데 메인 화면으로 간다" (숙요점 기본 궁합, 스테이징·프로덕션 모두).
"숙요점 뿐만 아니라 **모든 기능들**이 결제하면 그 기능이 열려야 한다."

## 지금 상태

- 공통 뼈대 + 카카오페이 타일 정합성 완료. 배선된 기능은 **6건** — 숙요 기본 궁합 · 연애 타로 · 재회 타로 · **명리 타로 3카드 · 숙요 정밀 궁합 확장 · 숙요 인연 레이더**(뒤 3건 2026-09-06 추가).
- 🔴 **배관은 끝났다** — `window._cdCoinGatePerUse` 정의 2곳(`js/destiny-profile.js:5673`·`:12488`)이 `resume` 을 게이트로 넘긴다. 이전에는 안 넘겨서, 옵션 백 없는 축약형을 쓰는 기능(타로 3종)은 서술자를 만들어도 티켓에 안 실렸다. 회귀 가드는 `__tests__/ui/direct-payment-resume.behavior.test.js` 의 "_cdCoinGatePerUse 는 resume 서술자를…" 테스트.
- 원인: 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 결제 게이트의 `await` 가 페이지와 함께 죽는다 → `onGranted` 가 **어떤 기능에서도** 실행되지 않는다. 복귀 처리(`_dpResumeDirectPaymentAfterRedirect`)는 완료 오버레이만 띄우고 기능을 다시 열지 않았다.
- 🔴 회당 결제(per-use) 키는 `worker/lib/access-state.js` 가 보유 목록에서 걸러내므로, 재클릭하면 **또 결제된다**. 그래서 로컬 영수증이 필요했다.

## 이번에 생긴 계약 (새 기능도 이걸 쓴다)

1. **영수증** — `checkoutEntry.savePaidGrantReceipt / peek / consume`. `featureKey|contentKey|profileId` 3중 일치, **1회 소비**, 24h TTL. 게이트 진입에서 서버 왕복 0으로 무료 통과시킨다(게이팅 절대 순서 1 — 여기에 서버 조회를 붙이지 말 것).
2. **재개 서술자** — 게이트 옵션에 `resume: {kind, action, args}`. 직렬화 가능한 값만 살아남는다.
3. **핸들러** — 기능 파일이 `checkoutEntry.registerPaidResumeHandler(kind, fn)` 로 등록. `false` 를 돌려주면 '지금 열기' 지속 카드로 떨어진다.
4. **표면을 여는 책임은 `runPaidResume` 하나** — 기능 스크립트는 지연 로드라 복귀 시점엔 핸들러가 없다. `runPaidResume` 이 `action` 딥링크로 표면을 열어 스크립트를 부르고 등록될 때까지 8초 기다린다. 🔴 핸들러 안에서 또 열면 이중 이동으로 재개가 날아간다.

## 정본 예시

`js/saju-engine-tarot-sukuyo-quantum.js` 의 `syBuildCompatResumeDescriptor` ~ `syRunCompatResume` 블록과 그 아래 `window.triggerSynergyCheck`. 복귀 처리 쪽은 `js/destiny-profile.js` 의 `_dpResumeDirectPaymentAfterRedirect` 단계 ③·⑦.

## 남은 작업

수집 명령:

```
git grep -n "_cdOpenPaidServiceGate(" -- index.html js app | grep -v '^public/'
git grep -l "ensurePaidAccess(" -- app
git grep -l "runBillingCoinGate(\|runPaidAccessGate(" -- app | grep -v billing-client.ts
```

실측(2026-09-06):

| 계열 | 개수 | 지금 상태 |
|---|---|---|
| 정적·레거시 게이트 호출부 | 12곳 / 8파일 (기능 단위 17건) | **6곳 배선.** 아래 분류 결과 참조 |
| React `useCoinGate.ensurePaidAccess` | 17파일 | **영수증 단축으로 재과금은 막힘.** 자동 재개는 없음 |
| React 직접 호출(`runBillingCoinGate`·`runPaidAccessGate`) | 18파일 | 🔴 **영수증도 안 탄다** — 아래 참조 |

판정 기준:

- **(a)** `onGranted` 가 DOM/폼 상태에 의존한다 → `resume` 서술자 필수 (숙요 궁합이 이 유형).
- **(b)** 자기 라우트에서 자기완결 → `action` 딥링크만으로 충분(서술자의 `args` 를 비운다).
- **(c)** 서버가 영구 unlock 한다 → 영수증도 재개도 불필요. 복귀 후 access-state 갱신만으로 열린다.

### 분류 결과 (2026-09-06 실측 — 근거는 `worker/lib/paid-feature-registry.js` 의 과금 유형)

🔴 **2026-09-06 정정** — 초판 표가 숙요/명리 항목의 파일을 `js/destiny-profile.js` 로 잘못 적었다(그 파일은 12,786줄이라 `:14587`·`:16991` 자체가 없다). 전부 **`js/saju-engine-tarot-sukuyo-quantum.js`** 다. 아래 줄번호는 배선 후 기준.

**(a) 서술자 필수 — 8건 중 6건 배선, 2건 남음**

| 기능 | 호출부 | 상태 |
|---|---|---|
| 숙요 기본 궁합 | `sukuyo-quantum.js:16223` | ✅ `sukuyo-compat` (정본) |
| 연애 타로 | `js/tarot-love-experience.js:638` | ✅ `tarot-love-final` |
| 재회 타로 | `js/tarot-reunion-experience.js:459` | ✅ `tarot-reunion-final` |
| 명리 타로 3카드 | `sukuyo-quantum.js:896` | ✅ `myeongri-tarot-three-card` |
| 숙요 정밀 궁합 확장 | `sukuyo-quantum.js:17258` | ✅ `sukuyo-compat-precision` |
| 숙요 인연 레이더 | `sukuyo-quantum.js:12677` | ✅ `sukuyo-bond-report` |
| 숙요 AI 프롬프트 | `sukuyo-quantum.js:15509` | 🔴 계약 공백 (아래) |
| 사주·점성술·자미두수 AI 상담 | `js/saju-engine.js:5825` | 🔴 계약 공백 (아래) |

등록된 핸들러 전수: `git grep -n "registerPaidResumeHandler(" -- js | grep -v '^public/'` → 6건.

**(b) 딥링크만 — 1건**: 신년 타로 `js/tarot-year-fortune-experience.js:432`.

**(c) 서버 영구 unlock — 손댈 것 없음 6건**: 극T `sukuyo-quantum.js:4747` · 본성 심화 `:9863` · 인연 도감 `:13063` · 1년운 `:14732` · 테토에겐 `js/entertain-engine.js:2866` · 시빌 `js/sibyl-system.js:3759`. (전부 `EXTRA_UNLOCK_PAID_FEATURE_KEY_LIST` 또는 `UNLOCK_PRODUCT_BY_FEATURE_KEY` 에 있다.)

### 계약 공백 (Phase B) — 남은 2건이 막힌 이유

`runPaidResume(descriptor)` 는 **정제된 서술자만** 핸들러에 넘긴다. confirm/grant 응답(`gateResult`)은 전달 경로가 없다. AI 상담 2건은 `onGranted(gateResult)` 를 서버에 결제 증빙으로 그대로 실어 보내므로, 서술자만으로는 핸들러가 만들 수 없다 → **재개하면 402 가 난다.** 배선은 계약을 넓힌 뒤에 한다.

- 안: `runPaidResume` 이 영수증(`peekPaidGrantReceipt`)에서 `requestId`·`merchantUid` 를 꺼내 `invokePaidResumeHandler(kind, descriptor, grant)` 2번째 인자로 넘긴다. 🔴 기능 파일에서 영수증을 직접 읽어 증빙을 조립하지 말 것 — 게이트의 영수증→grant 로직이 둘로 갈린다(원칙 6).
- 같은 공백의 **부분 사례**: 인연 레이더는 재개 시 `gateResult = null` 로 연다. 클라이언트 리포트는 정상 개방되지만 서버 아카이브 쓰기(`worker/routes/sukuyo.js` `/past-life-reading`)가 402 로 실패할 수 있고, 그 실패는 이미 삼켜지는 경로다. **결과: 리포트는 열리나 아카이브 행이 없어 나중에 다시 열면 재과금될 수 있다.** Phase B 에서 같이 닫는다.

### 배선 레시피 (연애 타로를 그대로 베낀다)

1. 기능 파일에 `<KIND>` 상수 + `build…ResumeDescriptor()` — 🔴 `sanitizePaidResumeDescriptor` 가 **원시값만** 남기므로 카드 배열 같은 건 `JSON.stringify` 로 문자열 1개에 담는다.
2. `wait…Overlay(8000ms/200ms 폴링)` → 표면이 열릴 때까지 기다린 뒤 상태 복원.
3. `registerPaidResumeHandler(<KIND>, run…Resume)` 를 **모듈 최상위 IIFE** 로 등록(스크립트 eval 은 동기라 모달 오픈보다 먼저 끝난다).
4. 게이트 호출부는 결제 **전에** 서술자를 만들어 넘긴다. 🔴 핸들러는 게이트를 다시 타는 공개 함수가 아니라 **게이트 없는 코어**를 부른다(재결제 방지).

**코어가 렌더 클로저 안에 있을 때**(2026-09-06 신규 2건) — 렌더할 때마다 `window.<코어>` 에 최신 함수를 대입하고, 재개 핸들러는 **다시 그리기 전에 그 전역을 `null` 로 지운 뒤** 새 것이 뜰 때까지 폴링한다(지난 렌더의 죽은 클로저를 부르는 사고 방지). 현재 전역 2개: `_syRevealCompatPrecisionCore`(정밀 궁합) · `_syRunSukuyoBondReportCore`(인연 레이더). 인연 레이더는 제출 흐름을 `runBondReport(event, {skipGate:true})` 로 합쳐 계산·렌더 경로가 갈라지지 않게 했다.

"됐다"의 판정: 모바일 에뮬레이션에서 결제 → 복귀 시 그 기능이 **스스로** 열리고, 곧바로 다시 눌러도 결제창이 안 뜨며(영수증 소비), 그 다음 클릭에는 정상적으로 뜬다.

## 함정

- 🔴 **React 직접 호출 18파일에는 영수증 단축을 넣지 못했다.** `runBillingCoinGate` 는 결제 뒤 서버 응답을 `hasVerifiedBillingAccess` 로 검사하므로, 영수증만으로 통과시키려면 서버 모양의 `BillingCoinGateData` 를 위조해야 한다(호출부마다 `consume`·`pricing` 에서 읽는 필드가 다르다). 각 호출부에서 개별 판단이 필요하다.
- `useCoinGate` 의 영수증 검사는 **중첩 사전검사가 아니다**(원칙 6 확인 완료) — React 는 `internalMainGate: true` 로 dp 게이트에 들어가 거기 있는 같은 단축을 **타지 않는다**.
- 독립 정적 페이지의 `?v=` 핀은 `sync:public` 이 안 돌린다. `verify:payment-choice-parity` 가 낡은 핀을 잡아 새 값을 알려준다.

## 이번 범위 밖 인접 결함 6건 (고치지 않았다)

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

- 🔴 배선 뒤 `npm run sync:public` 은 필수다. **다만 초판이 적은 "`?v=` 핀 25곳 + payment-freeze `--update` 가 따라온다"는 매번은 아니다** — 2026-09-06 3건 배선에서는 `sync:public` 만으로 `verify:payment-choice-parity` 가 PASS 했다(핀 회전은 `index.html`·루트 js 6개와 그 `public/` 미러에서 자동 처리됨). 실패했을 때만 그 절차를 탄다.
- `build:worker` 는 `check:critical` 에 있고 `check:quick`(= `node scripts/check-changed.mjs`)에는 없다. 워크트리에 `node_modules` 가 없어도 `check:quick` 은 exit 0 이었다(2026-09-06 실측).
- 빌드가 `rss.xml`·`insights/rss.xml`(+ `public/` 미러)의 `lastBuildDate` 만 건드린다 — **커밋에 담지 말고 `git checkout --` 로 되돌린다.**

## 모르는 것

- **실결제 복귀 1건 미실측** — 규칙 2(실결제 금지)라 모바일 실기기 복귀는 사용자 확인이 필요하다.
- 스테이징 카카오페이는 `/^PORTONE_/` 시크릿 미주입 정책이라 타일이 '준비 중'으로 뜨는 것이 정상이다. 실제 결제까지 보려면 테스트 채널키 동기화가 필요하고 **시크릿이라 사용자가 직접** 한다(`docs/handoff/kakaopay-golive-2026-08-31.md`).
