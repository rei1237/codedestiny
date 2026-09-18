---
status: done
updated: 2026-09-18
next: 2단계 ②③④(이용권 레일 환불 동의)는 main 에 들어갔다(머지 3471a307b · 58ce4f728) — 다음은 ① 영문 결제정보와 **단건 결제창** 환불 동의이며, 아래 "남은 작업"·"함정"과 docs/payment/inicis-overseas-card/01·02 부터 읽는다
---

# KG이니시스 해외카드 특약 대비 — 2단계 ②③④ (결제창 정책 링크·영문 결제 문의 진입점·서버측 환불 동의)

권장: 주력 모델(Opus 5) / effort max. 🔴 RED(결제창 마크업·12개 로케일 사전·동결 파일·캐시 핀)이고, 계획과 RED 사전 보고는 이미 사용자 승인을 받았다("승인할테니 진행해", 2026-09-18).

1단계 문서: [inicis-overseas-card-phase1.md](inicis-overseas-card-phase1.md). 원 요청은 그 문서의 프론트매터 `next` 가 가리킨 2단계다.

## 왜

1단계는 "없는 기능을 없다고 적는" 데까지였다. 2단계는 그중 UI 로 메울 수 있는 것을 메운다. 해외 고객이 결제창에서 약관·환불 규정·개인정보 처리방침·문의처에 **자기 언어로** 닿지 못하면 전자상거래법 표시 의무와 PG 심사 8번 문항(해외 고객 CS)이 동시에 비어 있다.

## 범위 — 3축 중 2축 + 뒤이은 세션의 ④ 절반

두 세션 모두 승인 시점에 범위를 잘랐다. 한 세션에 한 작업이 원칙이고, ①은 화면 4곳·문자열 수십 개짜리 별건이다.

| 축 | 어느 세션 | 상태 |
|---|---|---|
| ② 결제창 정책 링크 | 1차 · C2 | 완료 |
| ③ 영문 결제 문의 진입점 | 1차 · C1 | 완료 |
| ④ 서버측 환불 동의 — **이용권 레일** | 2차 · C5 | 완료 |
| ④ 서버측 환불 동의 — **단건 결제창** | 안 함 | **다음 세션** (체크박스 자체가 없다) |
| ① 영문 결제정보(이용권 모달·영냥이·선물 안내 한국어 하드코딩) | 안 함 | **다음 세션** |

## 지금 상태

- **2단계 ②③ 완료(2026-09-18).** 워크트리 `D:\Development\codedestiny-worktrees\inicis-overseas-card-p2-20260918-044006`(브랜치 `wt/inicis-overseas-card-p2-20260918-044006`, 베이스 `8ee6b4b88`)에서 구현·mock 검증하고 main 에 머지해 push 했다.
  - C1 `52b1e7c2e` — 영문·일문·중문 고객센터에 결제·환불 문의 항목 추가(17 files, 371+/368-).
  - C2 `8b7e3bbc4` — 결제창 하단 로케일별 정책 링크 줄(70 files, 1600+/1269-).
  - C3 `3a4df4a0e` — 결제 문서 01·02·06·09 갱신 + 이 문서.
  - 머지 `3471a307b`(origin/main `fe4938f9c` 위). push: `fe4938f9c..3471a307b -> main`.
  - C4 `459a3eab4` — 머지가 낸 미러 회귀 수정(아래 "함정" 첫 항목). 머지 직후 `sync:public` 을 1회만 돌려 `Main drift watchdog` 이 깨졌고, 고정점까지 돌려 고쳤다.
  - 머지 충돌은 `config/sitemap-lastmod.json` 하나뿐이었다(양쪽이 원장 갱신). 손으로 합치지 않고 origin/main 판으로 되돌린 뒤 합친 트리에서 `npm run sitemap:generate` 로 다시 유도했다. 합친 트리에서 `npm run check:fast` exit 0(281 suites / 3958 tests).
- **2단계 ④ 이용권 레일 완료(2026-09-18, 2차 세션).** 같은 워크트리를 재사용했다(베이스 `32f8ede85`).
  - C5 `8e7d94c31` — 이용권 주문에 `refundConsent` 기록(5 files, 79+/8-).
  - 머지 `58ce4f728`(main `15dd6f028` 위, FF). push: `15dd6f028..58ce4f728 -> main`.
  - 이번 머지는 충돌이 없었다. main 이 가져온 13파일과 내 5파일의 겹침이 0이었고(`git diff --name-only 32f8ede85..main` 으로 실측), 미러도 안 낡았다 — main 쪽 변경이 sitemap 원본·미러를 같은 커밋에 담아 왔기 때문이다. 그래도 머지 후 `sitemap:check` 를 한 번 돌려 확인했다(OK, URL 1281개).
- `FOREIGN_CARD_ENABLED` 는 두 세션 모두 어디에도 설정하지 않았다(OFF). 카드 브랜드명·환불 응답기한 약속은 한 글자도 넣지 않았다 — 특약은 여전히 미승인이다.

## 무엇을 바꿨나

### C1 — 영문 결제 문의 진입점 (`52b1e7c2e`)

- `lib/i18n/public-trust-copy.mjs`(**CRLF**)의 en·ja·zh 신뢰 페이지에 결제·환불 문의 절을 하나씩 추가했다. 세 절 모두 앵커 id `payment-help` 를 갖는다.
- 앵커를 실제로 그리려고 `app/components/LocalizedTrustPage.jsx:33` 의 구조분해를 `([heading, body])` → `([heading, body, id])` 로 넓히고 `id={id}` 를 붙였다. id 가 없는 기존 절은 그대로 `undefined` 라 마크업이 안 바뀐다.
- 한국어 `/contact-us` 의 결제·환불 문의 `<li>`(`app/contact-us/page.js:80`)에도 같은 앵커를 붙였다. 정적 사본 `public/static/policies/contact/index.html` 동기화.
- 문구는 **있는 것만** 적었다: 같은 이메일, 보낼 정보, 카드번호·보안코드 금지. 응답기한·전용 창구는 만들지 않았고 약속하지도 않았다.

### C2 — 결제창 정책 링크 줄 (`8b7e3bbc4`)

- 정본은 `js/core/checkout-entry.js` 하나다: `POLICY_LINKS_BY_LANG`(:478) · `policyLinkTargets()`(:490) · `buildPaymentPolicyLinksHtml()`(:506). 렌더러 3종은 전부 이 빌더에 위임한다 — `index.html:21771` · `js/destiny-profile.js:12603` · `app/_lib/billing-client.ts:1256`.
- 🔴 **URL 표가 코어 안에 있는 이유**: `checkout-entry.js` 는 UMD 클래식 스크립트/CommonJS 하이브리드라 `lib/i18n/routes.ts` 를 import 할 수 없다. 선례는 같은 파일의 `REFERENCE_FX_BY_LANG` 이다. 라우트를 바꾸면 이 표도 같이 고쳐야 하고, 안 고치면 결제 임계 화면에서 약관이 404 로 뜬다.
- 🔴 **번체(zh-TW)의 문의처만 `/en/contact#payment-help`** 다. `/zh-tw/contact` 라우트가 존재하지 않는다(세 경로로 확인: `lib/i18n/routes.ts`, 라우트 목록, 생성된 `sitemap.xml`). 그 라우트가 생기면 표를 같이 고친다.
- 링크는 전부 새 탭(`target="_blank" rel="noopener noreferrer"`)이다. 같은 탭으로 나가면 진행 중인 결제가 끊긴다.
- 🔴 **`[data-mode]` 를 붙이면 안 된다.** 렌더러 3종 모두 `[data-mode]` 노드를 "누르면 모달을 닫는" 훅으로 다룬다. 결제 중 약관을 열면 결제창이 통째로 사라진다. 새 노드는 `data-policy-links` 를 쓴다.
- 한국어 화면에서도 그린다. 해외 고지(`buildOverseasChargeNoticeHtml`)와 달리 표시 의무는 로케일과 무관하다.
- 12개 런타임 로케일 `public/i18n/*.json` 의 `payment.directModal.legal` 에 라벨 4개(`terms`·`refund`·`privacy`·`support`)를 넣었다. 저작은 en·ja·zh-CN·zh-TW, 나머지 7개는 영어 복사(레포 규칙). **ko 값은 코어 폴백과 바이트 일치**해야 한다 — `cdTranslate` 가 ko 는 사전을 건너뛴다.

### 가드 — `scripts/verify-payment-choice-parity.mjs`(**CRLF**)

새 검사 4개를 기존 가드에 얹었다. 새 파일을 만들지 않았으므로 러너 배선이 필요 없다.

1. 빌더 마커 2개 추가(`data-policy-links`, `target="_blank" rel="noopener noreferrer"`) — 총 18개.
2. 렌더 픽스처에 정책 링크 줄을 포함시켜 금지 패턴 검사가 실제 출력까지 본다.
3. **§2-a-2 라우트 대조** — 5개 로케일을 실제로 렌더해 href 4개를 뽑고, `#fragment` 를 떼고 생성된 `sitemap.xml` 의 `<loc>` 과 대조한다. 표를 가드에 다시 적으면 같이 고쳐 쓰는 이중 장부가 되므로 실제 라우트 목록과 맞춘다.
   - 🔴 로케일을 돌리는 방법은 `globalThis.window = { cdGetCurrentLanguage: () => lang }` 뿐이다. 코어의 `runtimeWindow()` 가 `typeof window` 를 보므로 `globalThis.cdGetCurrentLanguage` 를 심어도 **아무 효과가 없고 5개 전부 ko 로 렌더된다**(한 번 당했다). `finally` 로 복원한다.
4. 렌더러 3종이 `buildPaymentPolicyLinksHtml` 를 참조하는지 전수 단언. 미러 한 곳만 직접 `<a href="/terms">` 를 적는 형태를 리터럴 검사로는 볼 수 없다.

### C5 — 서버측 환불 동의 기록, 이용권 레일 (`8e7d94c31`)

주문 문서에 `refundConsent` 를 남긴다. 전자상거래법 제17조 고지에 **결제 전** 동의받았다는 증빙이고, 다투는 자리는 제22조(사업자 입증책임)다. 그 전까지 서버에 남는 동의는 가입 때의 `User.legalConsents` 뿐이었다.

- 정본은 `worker/payments/policy-versions.js` 의 새 `buildRefundConsentRecord(agreed, { now, source })` 다 — `ORDER_POLICY_VERSIONS` 바로 옆이고, 그 파일 머리주석이 원래 "여긴 동의 기록이 아니다" 라고 적어 두었던 자리를 이제 이 함수가 가리킨다. 남기는 값: `agreed`(항상 true) · `agreedAt`(**서버가 받은 시각**, 체크박스를 누른 시각이 아니다) · `termsVersion`(환불정책이 약관 §12 라 약관 시행일) · `source`(지금은 `"pass_modal"` 하나).
- `worker/payments/passes.js` `createPassOrder` 의 **`$setOnInsert` 안에만** 넣었다 → 기존 주문 문서를 덮지 않는다. 재전송은 첫 기록이 이긴다(증빙으로 옳은 방향). `createPayablePassOrder` 는 `{ ...input }` 스프레드라 세대 사다리 전 구간에 그대로 흐른다 — 손댈 필요가 없었다.
- `worker/payments/index.js` `handlePassPrepare` 는 `body.refundConsent === true` 만 동의로 본다.
- 🔴 **없으면 거절이 아니라 `null` 이다(fail-open).** 400 으로 막으면 스토어에 남은 구버전 앱이 결제를 통째로 못 한다. 선례이자 같은 판단이 `worker/routes/auth.js:3597` 의 phoneConsent 머리주석에 있다. "동의 없이 만들어진 주문"이 그대로 보이는 편이 증빙으로도 정확하다.
  - 🔴 **그 선례가 fail-open 에 붙인 조건은 "구버전 보호"가 아니라 "UI 가 전 렌더러에서 막는다"** 였다. 이 레일에서도 충족된다: `/api/payments/subscription/prepare` 의 프로덕션 호출부는 `app/points/PointsClient.tsx:3131` **하나뿐**이고(미러 포함 전수 grep), 그 화면이 `disabled={isProcessing || !isSubscriptionRefundAgreed}` 로 결제수단 타일(`:4884`)과 상품권 칩(`:4917`)을 진짜 `disabled` 로 잠근다(`aria-disabled` 가 아니다). **이 전제가 깨지면 fail-open 의 근거가 사라진다** — 아래 "범위 밖 결함" 참조.
- `app/points/PointsClient.tsx`(**CRLF**)는 동의값을 **인자로** 넘긴다. `requestSubscriptionPrepare`·`startSubscriptionPrepare` 는 `useCallback` 이라 안에서 상태를 읽으면 stale closure 를 먹는다. 같은 파일이 `method` 에 대해 이미 쓰던 방식이다(`:3159`). 호출부 `handleSubscribe`(`:4385`)는 평범한 async 함수라 읽기가 신선하고, 이 줄은 `setPendingSubscriptionPaymentPlan(null)` 보다 먼저 돈다.
- 🔴 **409 IDEMPOTENCY_CONFLICT 재발급 호출부(`:4458`)에도 같이 넘겨야 한다.** 같은 구매 시도의 재발급이라 앞서 받은 동의가 따라가야 하고, 안 넘기면 **409 로 재시도된 주문만** 동의 기록을 잃는다. 이건 타입 오류로 드러났지 설계로 먼저 보이지 않았다(아래 "함정").
- 스키마는 안 고쳤다. `paymentSchema`(`worker/lib/models.js:296-369`)에 `refundConsent` 가 없어도 저장된다 — 결제 컨텍스트는 `worker/payments/db.js:111` 에서 **네이티브 드라이버**(`col(Model).findOneAndUpdate`)로 써서 mongoose strict 의 "미선언 필드를 조용히 버림"을 타지 않는다. 기존 `policyVersions`·`foreignCard` 가 같은 상태다(선례 일치).
- 사용자 노출 문구는 **0건 추가**했다. 체크박스와 문구(`copy.refundAgreement`)는 이미 ko·en 으로 있었다.

## 검증 (전부 mock, 실결제 없음)

### C1~C4 (1차 세션)

- `node scripts/verify-payment-choice-parity.mjs` → PASS(10 renderers, 93 css rules, 18 builder + 14 renderer markers, 3 banned, 70 copy keys × 12 locales, 25 gate-triggered paths) · `--self-test` → OK(음성 6 + 정상 2).
- **변이 3종으로 가드가 무는지 확인**(원칙 10). 없는 라우트로 바꾸기 → BITES. 미러에서 빌더 위임 제거 → BITES. 링크 4개를 3개로 줄이기 → BITES. 매번 메모리 사본으로 복원했다(git 명령 안 씀 — 옆 세션 보호).
- `node scripts/verify-payment-freeze.mjs --update` → 통과(region 4 · file 3 · 상한 2). 절차 1단계인 "`worker/payments/` 도 같은 변경이 필요한가"는 추정이 아니라 실측으로 답했다: `git grep 'cd-direct-payment|provisionTiming|directModal' -- worker/` 0건, `worker/payments/` 는 서버 모듈만 — 미러 불필요.
- `node scripts/verify-paid-gate-ui-regression.mjs` → PASS(핀 리터럴 회전 반영).
- `npm run sitemap:generate` → `[sitemap:check] OK (URL 1281개)`. 라우트가 안 늘었음을 `<loc>` 집합 diff 로 증명했다(1281 = 1281, 차집합 공집합).
- `npm run check:fast` → **exit 0**, Test Suites 280 passed / 280, Tests 3954 passed / 3954.

### C5 (2차 세션)

- `npm run check:fast` → 마지막 단계 `test:jest` 까지 완주, **281 suites / 3959 tests 통과**. lint OK · `[sitemap:check] OK (1281개)` · `[paid-gate-suite] 통과 88 / 실패 0` · `tsc --noEmit` exit 0.
- 새 테스트 1개(`__tests__/worker/payments-v2.subscription.test.js` — "환불 동의를 보내면 주문에 기록하고, 안 보내도 거절하지 않는다"). **변이 2종으로 무는지 확인**(원칙 10): 핸들러 배선 제거 → 1 failed. 빌더가 항상 레코드를 반환하게 → 1 failed. 매번 메모리 사본으로 복원(32 passed, git 명령 안 씀 — 옆 세션 보호).
- `paid-gate-auditor` 감사 → **정책 위반 0건**. 게이팅 4단계·금지 패턴 7종·렌더러 3종 정합성·재화 표시·동결·CI 배선 6축 판정. verify 22종 전건 PASS(`payment-freeze` · `payment-choice-parity` 10 renderers/93 css/70 keys×12 locales · `payment-phone-consent` · `checkout-pass-card` 포함).
- 이용권 3중 방어 무손상 확인: `enforcePassPurchasePolicy` 호출 위치·인자 불변, `resolvePassRequest` 무변경(월정석 별칭 거부·이용권으로 이용권 구매 거부 경로 그대로), `hasPassDrift` 는 `paymentAmount`·`subscriptionTier` 둘만 보므로 `refundConsent` 가 재가격 신호·멱등 사다리를 안 흔든다. 스테이징 1,000원 계약도 무관(`payments-v2.staging-test-amount.test.js` 통과).
- 머지 후 재확인: `sitemap:check` OK · `verify-payment-freeze` 통과 · 결제 2스위트 34 tests 통과.
- **미검증**: 실 Mongo 왕복(`agreedAt` 이 실제로 `Date` 로 들어가는지는 fake DB 로만 확인 — 실 DB 쓰기는 금지 범위). 브라우저 실화면에서 "체크 해제면 타일이 안 눌린다"를 눈으로 본 적 없음(소스의 `disabled` 속성까지만). 스테이징 검증 안 함(선택).

## 함정 — 다음 세션이 같은 데서 막힌다

- **캐시 핀 회전이 계획에 없었는데 필요했다.** `js/core/checkout-entry.js` 나 `js/destiny-profile.js` 를 한 글자라도 고치면 정적 페이지 23개 + `app/layout.js` + `app/_lib/billing-client.ts` + `scripts/verify-paid-gate-ui-regression.mjs` 의 핀 리터럴이 전부 낡는다. 이번엔 26파일 73곳이었다. `index.html` 계열은 `sync:public` 이 관리하니 손대지 않는다.
  - 🔴 `PIN_GROUPS` 순서는 [destiny-profile, core] 이고 가드는 **첫 실패 그룹에서 던진다**. 그래서 1회차에 core 만, core 를 고친 2회차에 destiny-profile 이 나왔다. 두 그룹을 한 번에 유도해 한 번에 고치는 게 맞다(유도식: `sha1(rel + "\n" + normalizeForPin(content) + "\n---\n")` 앞 12자, 접두사 `build-`).
  - 🟠 (보고만) 이 가드에는 fail-open 이 있다. `index.html` 계열 중 하나라도 낡은 핀 값을 들고 있으면 그 값이 "sync 관리 대상"으로 분류되어, 같은 값을 쓰는 손관리 페이지 전부가 낡음 검사에서 빠진다.
- 🔴 **머지 후 `sync:public` 은 한 번으로 안 끝난다 — 이번에 회귀를 냈다.** 캐시 키가 한 실행에 한 단계씩만 전파된다: 머지로 `uiBindings.js` 키가 돌면 그 실행은 `js/core/init.js` 까지만 다시 쓰고, `js/app.js` 는 *새* `init.js` 를 입력으로 본 **다음** 실행에서야 돈다. 1회만 돌리고 push 해서 `Main drift watchdog`(`verify:public-mirror-fresh`)이 `js/app.js`·`public/js/app.js` 로 물었다(머지 `3471a307b` → 수정 `459a3eab4`, 정적 셸·미러 9개). 1단계 인수인계에도 "4회째 변경 0"으로 남아 있던 성질이다.
  - 고정점 판정은 `git status` 가 아니라 **"한 번 더 돌려도 새 변경이 없는가"** 다. 중간에 `git add` 하면 status 가 계속 같은 파일을 보여줘 수렴한 것처럼 안 보인다(한 번 헷갈렸다).
  - `verify:public-mirror-fresh` 는 **깨끗한 트리를 전제**로 한다(스크립트 헤더 주석). 미커밋 변경이 있으면 방금 고친 파일까지 FAIL 로 나열한다 — 커밋한 뒤 판정할 것.
- **핀을 회전하면 sitemap 원장이 드리프트한다.** `scripts/lib/sitemap-lastmod.mjs` 가 라우트의 import 폐포로 서명을 만드는데 `app/layout.js` 가 거의 모든 라우트의 폐포에 있다. 원인 추정 말고 `npm run sitemap:generate` 후 재생성본 커밋으로 끝낸다.
- **CRLF 파일은 Edit/sed 가 줄바꿈을 떨군다.** 이번 대상 중 `lib/i18n/public-trust-copy.mjs` 와 `scripts/verify-payment-choice-parity.mjs` 가 CRLF다. node 로 읽어 `eol` 을 보존해 쓴다(스크립트는 세션 스크래치패드에 있었고 남기지 않았다).
- **Bash 호출마다 cwd 가 `d:\Development\code-destiny` 로 되돌아간다.** 모든 명령을 `cd <워크트리> &&` 로 시작한다.
- 🔴 **`npx --no-install jest <파일>` 은 여기서 안 돈다** — `SyntaxError: Cannot use import statement outside a module`. 이 레포 jest 는 ESM 플래그가 필요하고, 그걸 주입하는 건 공식 러너다: `node scripts/run-mock-tests.mjs jest <패턴...>`. 러너가 `NODE_OPTIONS=--experimental-vm-modules --require=mock-network-guard.cjs` 와 `CD_MOCK_TESTS=true` 를 같이 걸어 주므로, "검증은 전부 mock" 규칙도 이걸로 써야 지켜진다(맨 jest 로 돌리면 네트워크 가드가 빠진다).
- **`$TMPDIR` 이 비어 있다.** heredoc 으로 `"$TMPDIR/patch.mjs"` 를 쓰면 `/patch.mjs` 가 되어 Permission denied → MODULE_NOT_FOUND 로 이어진다. 스크래치패드 경로를 변수에 직접 박는다.
- 🔴 **인자를 하나 늘리면 호출부가 하나가 아니다.** `requestSubscriptionPrepare` 에 동의값을 더했더니 409 재발급 경로(`PointsClient.tsx:4458`)가 남아 있었고, 이걸 잡아 준 건 코드 읽기가 아니라 `tsc --noEmit` 의 `TS2554: Expected 4 arguments, but got 3` 였다. 타입 오류로 안 보였으면 "409 로 재시도된 주문만 동의 기록이 빈다"는 조용한 결함으로 남았을 것이다. 시그니처를 바꾸면 typecheck 를 호출부 전수 조사로 쓴다.
- **`check:fast` 는 실패 단계에서 즉시 멈춘다**(`[check:changed] BLOCKED` 출력 후 exit 1). 그래서 `| tail` 로 잘라 봐도 "마지막 계획 단계가 출력에 있으면 완주"로 판정할 수 있다. 계획상 마지막 단계는 `npm run check:fast -- --plan` 으로 확인한다(이번엔 `test:jest`). 파이프가 exit code 를 가리므로 이 대조가 필요하다.

## 남은 작업

- [x] 머지·push(`3471a307b` · `58ce4f728`). 운영 승격과 `FOREIGN_CARD_ENABLED` 켜기는 하지 않았다.
- [x] 서버측 환불 동의 기록 — **이용권 레일**(C5 `8e7d94c31`).
- [ ] 2단계 ① 영문 결제정보 — 이용권 모달 `app/points/PointsClient.tsx:4829-4874`, 영냥이 `app/checkout/CheckoutClient.tsx:194-226`, 선물 안내 `GIFT_GUIDANCE` 의 한국어 하드코딩.
  - 🔴 **"7개 로케일 `payment.directModal` 영어화"는 이미 끝나 있었다**(2차 세션 실측). `public/i18n/*.json` 12개를 전수 조사한 결과 비-ko 11개 로케일 전부 `payment.directModal` 47키에 한글 0자다. 이 항목은 남은 작업이 아니다.
  - 🔴 `app/checkout/CheckoutClient.tsx` 는 233줄 중 한글 39줄이고 **i18n 배선이 아예 없다**(`useT` 계열 import 0건). 사전 키를 채우는 일이 아니라 배선부터 까는 일이다 — 여기가 ① 의 실제 무게중심이다.
- [ ] 서버측 환불 동의 기록 — **단건 결제창**. 이쪽은 체크박스 자체가 없어([05](../payment/inicis-overseas-card/05-fulfillment-and-evidence.md) §4) 서버만 고쳐선 기록할 게 없다. 필요한 것: `js/core/checkout-entry.js` 에 체크박스 + 렌더러 3종 반영 + 12개 로케일 라벨 + 가드. 🔴 **`checkout-entry.js` 를 건드리는 순간 위 캐시 핀 회전(26파일 73곳)이 딸려 온다** — 이용권 레일이 그걸 안 건드린 건 우연이 아니라 범위를 그렇게 잘랐기 때문이다. 서버 쪽은 이미 준비돼 있다: `buildRefundConsentRecord(agreed, { source })` 에 `source` 를 `"direct_modal"` 로 주면 된다.
- [ ] 3단계(법무, LEGAL REVIEW REQUIRED)는 그대로 남아 있다.
- 플래그 ON 은 [02](../payment/inicis-overseas-card/02-overseas-card-implementation.md) §7 체크리스트 10개 순서를 따른다. 이번 변경으로 체크리스트 항목이 켜지지는 않았다(§7 에 정책 링크 항목이 없다 — 표시 의무는 플래그와 독립이다).

## 갱신한 문서

| 문서 | 무엇 |
|---|---|
| [01](../payment/inicis-overseas-card/01-current-payment-architecture.md) §4 | "약관·환불·개인정보 링크와 동의 체크박스 없음" → 링크는 생겼고 체크박스는 여전히 없다 |
| [02](../payment/inicis-overseas-card/02-overseas-card-implementation.md) §8 | 정책 링크 READY 행 + 환불 동의 NOT READY 행 추가 |
| [06](../payment/inicis-overseas-card/06-customer-support-and-incident-response.md) §1·§5 | C1 이 낡게 만든 근거 줄번호 갱신(`public-trust-copy.mjs` ja 14/35 · en 74/95 · zh 134/155), 결제창 링크 진입점 행 추가, "없는 것" 목록에서 진입점과 응답기한을 분리 |
| [09](../payment/inicis-overseas-card/09-inicis-application-facts.md) 8번·§7·§8 | 8번 문항 NOT READY → READY(한계는 답에 그대로), 2단계 목록에서 ②③ 완료 표기 |

2차 세션(C5)이 추가로 갱신한 곳 — 이번 변경이 낡게 만든 단언들이다.

| 문서 | 무엇 |
|---|---|
| [01](../payment/inicis-overseas-card/01-current-payment-architecture.md) §4 표 | 이용권 모달 행에 서버 기록 추가, 단건 행은 "체크박스가 없으니 남길 동의도 없다"로 분리 |
| [02](../payment/inicis-overseas-card/02-overseas-card-implementation.md) §8 | 한 줄이던 NOT READY 를 레일 두 줄로 쪼갬(이용권 READY / 단건 NOT READY) |
| [05](../payment/inicis-overseas-card/05-fulfillment-and-evidence.md) §4·증빙표 | "서버측 환불 동의 기록 없음" → 이용권 레일 필드 정의·fail-open 이유까지 적고, 단건만 남김 |
| [09](../payment/inicis-overseas-card/09-inicis-application-facts.md) 2단계 목록 | ④ 완료 표기 + "7개 로케일 영어화는 이미 돼 있었다" 실측 반영 |

## 범위 밖 결함 (보고만, 이번에 안 고침)

- `/zh-tw/contact` 라우트가 없다. 번체 사용자는 결제 문의에서 영어 페이지로 간다.
- 이용권 상점 오버레이(`index.html:29230`·`:29240` `overseasStoreNoticeHtml`)에는 정책 링크가 없다. 해외 고지만 있고 약관·환불·문의로 가는 길이 없다. 축 ① 영역이다.
- 위 핀 가드 fail-open.
- ko 와 비-ko 개인정보 처리방침의 시행일이 다르다.
- `verify:payment-choice-single-instance` 가 폐기된 PR 워크플로에만 배선돼 있어 지금은 아무 데서도 안 돈다.
- 🟡 **`refundConsent` 의 fail-open 전제를 지키는 가드가 없다.** phoneConsent 쪽은 `verify:payment-phone-consent` 가 3정본 + 7미러의 동의 줄을 지키는데, 이쪽엔 대응물이 없다. `PointsClient.tsx:4884/4917` 의 `disabled` 가 `aria-disabled` 로 퇴화해도 아무것도 안 울린다 — 같은 파일 `:4881` 이 "준비 중" 상태에 대해 이미 `aria-disabled` 패턴을 쓰고 있어 실수 유인이 크다. 앱 상점 레일이 이 엔드포인트를 쓰게 되는 경우도 같은 전제를 깬다.
- 🟡 `startSubscriptionPrepare` 의 엔트리 재사용 키(`PointsClient.tsx:3166`)가 `planId`+`method` 뿐이고 `refundAgreed` 를 안 본다. 지금은 모달이 닫힐 때 ref 가 null 로 초기화되고(`:3198`) 동의 전 클릭이 불가라 도달 불가지만, 구조적으로 "동의 false 엔트리 재사용" 경로가 열려 있다. 결과가 안전 방향(기록 누락)이라 차단 사유는 아니었다.
- 🟡 `app/points/PointsClient.tsx` 가 `scripts/lib/change-risk.mjs` 에서 `level=medium` · `deepRequired` 없음이다. `paid-flow-gates.yml:95` 트리거에는 있고 verify 8종이 이 파일을 열어 읽는데도 그렇다. 이번엔 `worker/payments/**` 가 deep 을 켜 줘서 가려졌지만, **PointsClient 단독 변경이면 standard 티어로 떨어진다**(`useCoinGate.ts` 와 같은 계열의 구멍).

## 재개 절차

```powershell
Set-Location 'D:\Development\code-destiny'
git branch --show-current
git status --short
git pull --ff-only
powershell -File scripts/create-safe-worktree.ps1 -Slug inicis-overseas-card-p2-rest
```

워크트리 `D:\Development\codedestiny-worktrees\inicis-overseas-card-p2-20260918-044006` 는 두 세션이 이어서 썼고 지금도 남아 있다(브랜치 `wt/inicis-overseas-card-p2-20260918-044006`, HEAD `58ce4f728` = main). 다음 세션이 안 쓸 거면 `git worktree remove` 로 정리한다. **2026-09-18 기준 워크트리가 6개 살아 있다** — 공유 체크아웃은 `marketing/` 만 더티였고 두 머지 모두 그 밖을 건드리지 않았다.

쓰는 세션이 이미 둘 이상이면 공유 체크아웃 대신 워크트리에서 작업하고, 머지도 워크트리 안에서 한다 — 공유 체크아웃의 `reset --hard`·`stash`·`checkout --` 는 옆 세션의 미커밋 작업을 복구 불가로 지운다. 이번 머지도 그래서 워크트리에서 했다.

운영 승격과 `FOREIGN_CARD_ENABLED` 켜기는 **명시적 1회 승인** 없이는 하지 않는다. 스테이징 화면 검증은 선택이다.
