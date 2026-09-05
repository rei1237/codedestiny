---
status: active
updated: 2026-09-06
next: 아래 "분류 결과" 표의 **(a) 미배선 5건**을 배선한다 — 연애 타로(`js/tarot-love-experience.js`) 배선을 그대로 따라 한다.
---

# 유료 기능 결제 후 자동 개방 (리다이렉트 복귀)

## 왜

"결제 이후에 콘텐츠 자체가 열려야 하는데 메인 화면으로 간다" (숙요점 기본 궁합, 스테이징·프로덕션 모두).
"숙요점 뿐만 아니라 **모든 기능들**이 결제하면 그 기능이 열려야 한다."

## 지금 상태

- 공통 뼈대 + 카카오페이 타일 정합성 완료. 배선된 기능은 **숙요 기본 궁합 · 연애 타로 · 재회 타로 3건**.
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
| 정적·레거시 게이트 호출부 | 12곳 / 8파일 (기능 단위 17건) | **3곳 배선.** 아래 분류 결과 참조 |
| React `useCoinGate.ensurePaidAccess` | 17파일 | **영수증 단축으로 재과금은 막힘.** 자동 재개는 없음 |
| React 직접 호출(`runBillingCoinGate`·`runPaidAccessGate`) | 18파일 | 🔴 **영수증도 안 탄다** — 아래 참조 |

판정 기준:

- **(a)** `onGranted` 가 DOM/폼 상태에 의존한다 → `resume` 서술자 필수 (숙요 궁합이 이 유형).
- **(b)** 자기 라우트에서 자기완결 → `action` 딥링크만으로 충분(서술자의 `args` 를 비운다).
- **(c)** 서버가 영구 unlock 한다 → 영수증도 재개도 불필요. 복귀 후 access-state 갱신만으로 열린다.

### 분류 결과 (2026-09-06 실측 — 근거는 `worker/lib/paid-feature-registry.js` 의 과금 유형)

**(a) 서술자 필수 — 7건 중 3건 배선, 5건 남음**

| 기능 | 호출부 | 상태 |
|---|---|---|
| 숙요 기본 궁합 | `js/saju-engine-tarot-sukuyo-quantum.js:15865` | ✅ 정본 |
| 연애 타로 | `js/tarot-love-experience.js:638` | ✅ `tarot-love-final` |
| 재회 타로 | `js/tarot-reunion-experience.js:459` | ✅ `tarot-reunion-final` |
| 명리 타로 3카드 | `js/destiny-profile.js:896` | ⬜ |
| 숙요 인연 레이더 | `js/destiny-profile.js:12531` | ⬜ |
| 숙요 정밀 궁합 확장 | `js/destiny-profile.js:16991` | ⬜ |
| 숙요 AI 프롬프트 | `js/destiny-profile.js:15364` | ⬜ |
| 사주·점성술·자미두수 AI 상담 | `js/saju-engine.js:5825` | ⬜ |

**(b) 딥링크만 — 1건**: 신년 타로 `js/tarot-year-fortune-experience.js:432`.

**(c) 서버 영구 unlock — 손댈 것 없음 6건**: 극T `destiny-profile.js:4619` · 본성 심화 `:9735` · 인연 도감 `:12918` · 1년운 `:14587` · 테토에겐 `js/entertain-engine.js:2866` · 시빌 `js/sibyl-system.js:3759`. (전부 `EXTRA_UNLOCK_PAID_FEATURE_KEY_LIST` 또는 `UNLOCK_PRODUCT_BY_FEATURE_KEY` 에 있다.)

### 배선 레시피 (연애 타로를 그대로 베낀다)

1. 기능 파일에 `<KIND>` 상수 + `build…ResumeDescriptor()` — 🔴 `sanitizePaidResumeDescriptor` 가 **원시값만** 남기므로 카드 배열 같은 건 `JSON.stringify` 로 문자열 1개에 담는다.
2. `wait…Overlay(8000ms/200ms 폴링)` → 표면이 열릴 때까지 기다린 뒤 상태 복원.
3. `registerPaidResumeHandler(<KIND>, run…Resume)` 를 **모듈 최상위 IIFE** 로 등록(스크립트 eval 은 동기라 모달 오픈보다 먼저 끝난다).
4. 게이트 호출부는 결제 **전에** 서술자를 만들어 넘긴다. 🔴 핸들러는 게이트를 다시 타는 공개 함수가 아니라 **게이트 없는 코어**를 부른다(재결제 방지).

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

- 🔴 배선 뒤 `npm run sync:public` 은 필수고, 그러면 `verify:payment-choice-parity` 가 독립 정적 페이지 `?v=` 핀(25곳)을 새 값으로 바꾸라고 요구한다. 그 25곳에는 `app/_lib/billing-client.ts` 가 있고 **그 파일은 결제 동결 대상**이라 `node scripts/verify-payment-freeze.mjs --update` 까지 같은 커밋에 담아야 한다.
- 🔴 격리 워크트리에는 `node_modules` 가 없어 `check:quick` 의 마지막 `build:worker` 가 `workers-og` 미해결로 실패한다. 워커 파일을 안 건드렸으면 환경 문제다(CI 에서 통과).

## 모르는 것

- **실결제 복귀 1건 미실측** — 규칙 2(실결제 금지)라 모바일 실기기 복귀는 사용자 확인이 필요하다.
- 스테이징 카카오페이는 `/^PORTONE_/` 시크릿 미주입 정책이라 타일이 '준비 중'으로 뜨는 것이 정상이다. 실제 결제까지 보려면 테스트 채널키 동기화가 필요하고 **시크릿이라 사용자가 직접** 한다(`docs/handoff/kakaopay-golive-2026-08-31.md`).
