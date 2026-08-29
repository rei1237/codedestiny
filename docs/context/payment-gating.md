# 결제 시스템 & 잠금 콘텐츠 — 상세 규칙

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## 결제 시스템 & 잠금 콘텐츠 규칙

본 서비스는 3가지 재화(이용권/월정석/코인)와 2가지 과금 방식(회당 결제/영구 해금)으로 유료 기능을 관리한다. 상세 정책은 문서로 분리되어 있으니 신규 기능 추가 전 반드시 참고할 것:

- [docs/payment-policy-overview.md](../payment-policy-overview.md) — 재화 정의(이용권/월정석/코인), 코인 표시 규칙
- [docs/payment-policy-content-access.md](../payment-policy-content-access.md) — 잠금 콘텐츠 vs 회당 결제 vs 무료 판별 기준 및 현재 목록
- [docs/payment-policy-flow.md](../payment-policy-flow.md) — 게이팅 우선순위, 결제 플로우, 변경 이력

**핵심 요약**:
- **이용권**(30일, 구독형이나 자동갱신 없음) → **월정석**(이벤트 지급, 구매 불가, 구독 아님) → **코인**(레거시 내부 단위) 순으로 게이팅
- 🔒 **[필수·예외없음] 모든 유료 결제 게이팅 순서** (2026-08-01 개정 — 축이 "언제 검사하는가"에서 "이용권 보유자가 어떤 경로로도 돈을 내지 않는가"로 바뀌었다). 신규/수정 불문 모든 유료 기능은 아래를 그대로 따른다. 벗어나는 결제 구현은 금지이며, 발견 시 즉시 사용자에게 보고한다(작업 중 우연히 마주쳐도 그냥 지나치지 말 것):
  1. **진입 판정은 로컬 스냅샷만** — 구독 스냅샷(`cd_subscription_snapshot_v2`, 판정 정본 `js/core/pass-verdict.js`)이 커버를 확답하면 서버 왕복 없이 **즉시 무료 통과**(낙관 grant, 서버 기록은 백그라운드). 확답하지 못하면 **기다리지 말고 결제창**을 연다. 🔴 **진입 시 서버 이용권 선검사를 되살리지 말 것** — 그 왕복(구 셸 6초 예산+재시도 2회, React 15초 프로브)이 결제창 앞 지연의 본체였다.
  2. **결제창이 이용권 검사 지점** — 결제창 첫 카드는 **[이용권으로 구매]**(`data-mode="pass-store"`)이고, 누르면 그 자리에서 서버에 물어 커버되면 결제 없이 무료로 열고, 아니면 이용권 상점으로 인계한다(`/points?plan=…&cdco=1` → 결제 확인 모달 자동 오픈 → 결제 후 원래 화면 복귀). 결제창에는 **[이용권으로 구매] · 단건결제(KRW, PortOne) · 월정석 3옵션이 항상 함께** 보이고, 단건/월정석은 동등 우선순위다(`equalPriorityMethods: ["DIRECT_KRW","MOONLIGHT_STONE"]`).
  3. **스냅샷 없는 이용권 보유자의 구제 지점은 2번(결제창 이용권 카드) 하나다** (2026-08-08 정정). 새 기기·시크릿창·저장소 삭제로 스냅샷이 없는 보유자는 진입에서 커버를 확답받지 못해 결제창을 보게 되는데, 거기서 **[이용권으로 구매]를 누르면 그 자리에서 서버가 판정**해 무료로 열어 준다. 🔴 **카드 주문 직전에 서버 이용권 재검사를 넣지 말 것** — `worker/routes/billing.js`에 `grantPassFreeAccessBeforeCardIfAvailable`(6439~)이 남아 있지만 **호출자가 없는 죽은 코드**이고, `scripts/verify-billing-pass-policy.mjs`·`verify-paid-gate-ui-regression.mjs`가 checkout/confirm 경로에서 이 함수를 쓰면 **실패시킨다**("DIRECT_KRW prepare performs zero pass lookups"). 사용자가 단건을 명시적으로 고른 뒤의 왕복은 결제 임계경로를 늘리는 비용일 뿐이라 의도적으로 제거됐다. 죽은 함수를 되살리려면 그 verify 단언 4곳을 함께 뒤집어야 하며, 그건 정책 변경이므로 임의로 하지 말 것.
  4. **단건 결제(PortOne)는 사용자가 결제창에서 '단건'을 고른 이후에만** 실행(`_cdRunDirectKrwCheckout`/`_dpRunDirectKrwCheckout`에 도달). 🔴 2026-08-24부터 그 사이에 **결제수단 2단계**가 하나 더 있다 — 단건 카드를 누르면 같은 창에서 신용카드·간편결제 / 실시간 계좌이체 / 휴대폰 소액결제(**유일한 준비 중**) / 컬쳐랜드·도서문화·스마트문상 상품권 6종 + `[뒤로]` 로 바뀐다(계좌이체·상품권은 2026-08-29 개방). 정본은 `js/core/checkout-entry.js`의 `DIRECT_PAY_METHODS` 표 + `buildDirectPayMethodStepHtml` 하나이며, 세 렌더러는 그것을 호출만 한다. 🔴 **표의 키는 카드 id 이고 PortOne `payMethod` 는 항목 안에 있다** — 상품권 3종이 `GIFT_CERTIFICATE` 를 공유하고 `giftCertificateType` 이 필수라서다. 🔴 **2단계 노드에 `data-mode`를 붙이지 말 것**(선택 `data-pay-method`, 복귀 `data-pay-step="back"`) — `[data-mode]`는 "고르면 모달을 닫는" 노드라 붙이면 수단을 고르는 대신 창이 닫힌다. 🔴 **1단계 그리드를 innerHTML로 교체하거나 2단계 진입에서 카드를 잠그지 말 것** — `[뒤로]`로 돌아온 카드가 죽는다(둘 다 `verify:checkout-pass-card` ⑬이 실행으로 잡는다). 앱(Play Billing)에서는 2단계를 만들지 않는다. 반환 계약은 그대로 `'direct'`이고, 고른 값은 `resolveDirectPayFields()`를 거쳐 PortOne 요청의 `payMethod`(+ 상품권이면 `giftCertificate`)가 된다(서버 `getPortOnePublicConfig`의 `payMethod:"CARD"`는 폴백). 범위는 콘텐츠 단건결제뿐 — `/points`·앱 이용권 상점은 그대로다. 상세: [payment-policy-flow.md](../payment-policy-flow.md).
  - **금지 패턴(=위반, 발견 시 보고 대상)**: ① 결제창에서 **[이용권으로 구매] 카드를 없애거나 단순 상점 링크로 되돌리기**(스냅샷 없는 보유자가 확인할 방법을 잃는다) ② 진입 경로에 서버 이용권 선검사 부활(`CD_PASS_FIRST_BUDGET_MS`·`CD_PASS_SLOW_NOTE` 부활 금지, `snapshotVerdictOnly` 제거 금지) ③ 카드 주문(checkout/confirm) 경로에 서버 이용권 조회 재삽입(`grantPassFreeAccessBeforeCardIfAvailable` 되살리기 포함 — verify 가드 4곳이 막는다) ④ 결제창에 단건 또는 월정석 한쪽만 노출 ⑤ 서버 runtimeGate/paymentPayload에 `paymentMode:"DIRECT_KRW"` 하드코딩(월정석 옵션 소거 — 과거 ziwei-ai에서 제거된 결함) ⑥ 공유 게이트(`useCoinGate`/`_cdOpenPaidServiceGate`/정적 결제 모달) 우회하는 커스텀 체크아웃 ⑦ 🔴 **앱에서 `/points`로 프로그래매틱 이동**(앱 번들에 없고 `app-payment-guard`는 앵커 클릭만 가로챈다 → 빈 화면). 반드시 `window.__cdOpenChargeModal`(가드가 `/app/store/`로 고정)을 먼저 타며, 판정 정본은 `js/core/checkout-entry.js`의 `shouldUseAppStoreEntry()`(애매하면 앱 경로로 폴백).
  - **예외**: 프로필 카드 추가·삭제(D유형, `passExcluded`) **모두** 이용권 결제 불가라 이용권 옵션 없이 곧바로 결제창(단건/월정석)을 연다 — 그래도 두 결제수단은 동등 노출. **family 포함 모든 등급**이 이용권 커버 대상이 아니며(서버 정본은 `isPassExcludedPricing` 하나 — featureKey별 예외 분기 금지), family 무료는 이용권 결제가 아니라 정책 계층(`profile-card-mutation-policy.js`)의 0원 바이패스로 처리된다. 계정당 첫 카드도 등급 무관 무조건 무료. 상세는 [content-access D유형](../payment-policy-content-access.md#d-프로필-카드-추가삭제-고정-관리-수수료).
  - **검증**: 결제 관련 수정 시 `npm run verify:billing-pass-policy`·`verify:portone-single-payment`·`verify:paid-gate-ui`·`verify:payment-choice-parity`·`verify:checkout-pass-card`·`verify:paid-feature-billing-policy`·`verify:ai-prompt-billing-policy`를 먼저 실행. `verify:checkout-pass-card`는 문자열이 아니라 **jsdom에서 이용권 카드를 실제로 눌러** 두 갈래(커버→무료 통과 / 미커버→상점 인계)와 앱 분기를 확인한다. 뒤 두 개는 가격/과금유형 정본(`paid-feature-registry.js`)과 프론트 게이트·워커 라우트의 정합성을 보는 가드로, GitHub Actions "Paid Flow Gates"에서도 차단한다. 상세 규칙은 [flow 문서 결제창 노출 규칙](../payment-policy-flow.md) 참고.
  - 🔴 **결제수단 선택창 UI는 단일 규격이다** — 렌더러가 3종(정적 셸 `index.html` `_cdChooseServicePaymentMode` + 5미러 / React `app/_lib/billing-client.ts` `openReactPaymentChoiceModalInner` / 독립 정적 폴백 `js/destiny-profile.js` `_dpRenderStandalonePaymentChoice` + `public/js` 사본)이지만 **정본은 셸 인라인 하나**다. CSS 정본은 `_cdEnsureDirectPaymentStyles`의 규칙 배열이고 클래스 프리픽스는 `cd-direct-payment-*`로 고정. 세 곳 모두 "달빛 결제 방식 선택" 제목 + 달 헤더 + **[이용권으로 구매]/단건 결제/월정석 3옵션**(이용권 카드가 맨 위 + `추천` 배지, 클릭 시 그 자리에서 서버 이용권 검사)를 렌더해야 하며, `npm run verify:payment-choice-parity`가 CSS 텍스트 동일성·구조 마커·**3옵션 설명 문구 동일성**을 강제한다(예전에는 문구가 렌더러마다 달라도 통과했다). 🔴 **결제창은 열릴 때 월정석 잔량을 조회하지 않는다**(2026-08-12, 자동 조회·잔여바·`월정석 재조회` 버튼 제거). 그 `/api/billing/balance` 왕복(22초 예산·재시도 없음)이 간헐 503과 "잔량 확인 중" 고착의 원인이었고, 월정석을 고르면 서버 `coin-gate`가 같은 1왕복 안에서 확인+차감하므로 열 때의 표시용 조회는 순수 부가 비용이었다. 세 렌더러 모두 **열 때는 호출부가 넘긴 잔량만** 쓴다 — 402 부족 후 재노출 경로가 lot 정본 잔량을 실어 보내면 그때만 월정석 카드가 회색이 된다. 🔴 **단, 잔량 표시 자체는 온디맨드로 돌아왔다**(2026-08-13): 월정석 카드 **아래 형제**로 `[보유 월정석 확인]` 버튼(`.cd-direct-payment-balance-check` + `data-monthly-balance-check`, 결과 줄 `data-monthly-balance-text`)이 항상 있고, **눌렀을 때만** 조회한다. 첫 클릭은 기존 캐시(셸 15초 memo + access-state 60초 스냅샷 / React `fetchBillingBalance` recent)를 그대로 허용해 값이 신선하면 네트워크 0회로 끝나고, 두 번째부터만 `fresh`로 서버 캐시를 우회한다. 조회 실패는 문구로만 알리고 **월정석 카드의 활성 상태를 절대 건드리지 않는다**(미확정 ≠ 부족). 🔴 **`data-mode`를 붙이지 말 것** — 세 렌더러가 `[data-mode]`를 "고르면 모달을 닫는" 노드로 일괄 처리하므로 붙이면 확인 버튼이 결제창을 닫는다. 옛 자동 조회 잔여바 마커(`cd-direct-payment-moonbal-current`·`data-mode="monthly-refresh"`·`data-monthly-current`)는 **계속 금지**이며 되살아나면 parity 가드가 실패시킨다. `verify:paid-gate-ui`는 각 렌더러의 잔량 조회 호출이 **정확히 1곳**이고 그 위치가 확인 버튼 마크업보다 뒤(=핸들러 안)인지까지 본다. 진입·복귀·계측 배관은 `js/core/checkout-entry.js` 하나를 공유한다. 페이지 전용 결제창을 새로 만들지 말 것(과거 `celestial-harmony.html`의 `.celestial-pay-*`는 이용권 상점 카드가 없어 제거됨 — 독립 정적 페이지는 `/js/destiny-profile.js`를 로드하면 정본 폴백이 자동 인계된다).
- **코인은 폐지된 개념** — 서버 내부 계산에만 남아있고, 사용자에게는 항상 통화(현재 KRW, `1코인=100원` 고정 — `worker/lib/billing-policy.js`, 프론트는 `lib/payment/coin-pricing.ts`)로 환산해 표시. 신규 UI 작성 시 `coinPrice`/`cost`를 그대로 렌더링하지 말 것
- 신규 유료 기능은 "재열람 가능한 고정 콘텐츠"인지 "매번 생성되는 개인화 결과"인지에 따라 잠금 콘텐츠(`unlock.*`, `forceDeduct: true`) 또는 회당 결제(`PER_USE_PAID_FEATURE_KEY_LIST`)로 등록 — 판별 기준은 [content-access 문서](../payment-policy-content-access.md) 참고

### 관련 핵심 파일 레퍼런스

| 파일 | 역할 |
|------|------|
| `worker/lib/paid-feature-registry.js` | 모든 유료 기능 가격/유형 정의 |
| `worker/lib/content-unlocks.js` | 콘텐츠 잠금 해제 관리 (`ContentEntitlement`, `getUnlockedContentSnapshot`) |
| `worker/lib/billing-policy.js` | 코인↔KRW 환산 상수/함수 (`KRW_PER_COIN = 100`) |
| `lib/payment/coin-pricing.ts` | 프론트용 코인→KRW 표시 유틸(`formatKrwFromCoins`) |
| `worker/lib/models.js` | DB 스키마 (`profileSubscription`, `MonthlyCreditLedger`, `pointHistorySchema`) |
| `worker/routes/fortune.js` | 사주/자미두수 접근 게이팅 (`accessSource` 분기) · `PERSISTENT_UNLOCK_KEY_SET` |
| `worker/lib/nakshatra-paid-access.js` | 회당결제 라우트의 서버측 결제 증빙 확인 (`verifyPerUsePayment`) |
| `worker/lib/moonstone-spend-proof.js` | 🔴 **월정석 차감 증빙 조회의 유일한 정본** (`findMoonstoneSpendEvidence`) — 새 사본을 만들지 말 것 |
| `app/hooks/useCoinGate.ts` | 프론트 단건 결제 훅 |

🔴 **월정석 증빙 쿼리를 라우트에 복제하지 말 것** (2026-08-16) — 월정석의 회계 정본은 `MonthlyCreditLedger` 하나이고 쓰는 곳도 `worker/payments/moonstone.js` 하나인데, **읽는 곳이 15곳에 각자 손으로 적힌 쿼리로** 흩어져 있었다. writer 가 바뀔 때마다 그중 몇 곳이 조용히 죽고, 죽은 자리에서 **월정석이 차감된 사용자가 402(미결제)** 를 받았다(초융합 ₩30,000 · 네오 팩폭 전략실, 두 번 재발). 이제 조회는 `worker/lib/moonstone-spend-proof.js` 하나이며, 정산 판정은 `settledAt` 단독이 아니라 **① `settledAt` ② 구 billing.js 행의 `afterBalance` ③ 미정산이면 `User.recentConsumeRequestIds`(차감의 정본 증거)** 3갈래다 — ③ 이 없으면 "차감은 끝났는데 정산 write 가 아직 안 내려앉은 창"에서 돈 낸 사용자가 402 를 맞는다(크론 sweep 은 5~10분 뒤). writer↔reader 왕복 계약은 `__tests__/worker/per-use-proof-roundtrip.test.js` 가 **소비 라우트 전수**로 고정한다.

🔴 **`PERSISTENT_UNLOCK_KEY_SET`은 영구 해금의 기록 주체가 아니다** — 위치도 `content-unlocks.js`가 아니라 `worker/routes/fortune.js`다. 해금을 실제로 기록하는 곳은 `User.unlockedFeatures`이고, coin-gate(`billing.js`)와 카드 단건결제(`payments.js` `recordUserPaidFeature`)가 `isUnlockPaidFeatureKey` 기준으로 함께 쓴다. 저 상수는 `/api/fortune/*` 응답의 `unlockedFeatures`/`unlockMap` 필터와 PointHistory 복구 경로 전용이라, **신규 잠금 기능을 추가할 때 여기 등록하지 않아도 결제·재열람은 정상 동작한다**(같은 계약의 `ziwei-island-deep-report`·`nakshatra-lord-report`·`nakshatra-dasha-map`이 모두 미등록 상태로 동작 중). 등록이 필요한 경우는 그 키를 `/api/fortune/*` 응답으로 내보내야 할 때뿐이다.

## 결제 안전 규칙 (2026-08-28 `AGENTS.md` 에서 이관)

- 결제 작업 전 [docs/PAYMENT_AND_ACCESS.md](../PAYMENT_AND_ACCESS.md) 와 결제 정책 3부작([overview](../payment-policy-overview.md) · [content-access](../payment-policy-content-access.md) · [flow](../payment-policy-flow.md))을 먼저 읽는다.
- **결제 정본 파일 6종** — 이 목록 밖에서 결제 판정 로직을 새로 만들지 않는다.

  | 파일 | 역할 |
  |---|---|
  | `worker/routes/billing.js` | coin-gate 경로 |
  | `worker/routes/payments.js` | 카드 단건 결제 경로 |
  | `worker/lib/paid-feature-registry.js` | 유료 기능 가격·유형 정의 |
  | `worker/lib/billing-policy.js` | 환산·정책 상수 |
  | `worker/lib/profile-limits.js` | 프로필 한도 |
  | `worker/lib/payment-refund.js` | 환불 경로 |

- 🔴 **결제 문구는 제품 용어 3종을 유지한다**: `이용권` · `월정석` · `단건 결제`. 사용자에게 보이는 새 문구에 **코인 중심 표현을 도입하지 않는다** — 코인은 레거시 내부 계산 단위다.
- 모든 유료 흐름은 현재의 접근 옵션 3종(이용권 · 단건 결제 · 월정석)을 그대로 보존한다.
- **클라이언트는 최종 과금 판정을 하드코딩하지 않는다.** 서버의 registry/policy 가 결정한다.
- 서버는 **명시적 `MEMBERSHIP_PASS` 커맨드에서만** 이용권 커버리지를 조회한다. `DIRECT_KRW` 와 `MONTHLY` 는 이용권 상태를 묻지 않는다 — 서버 권위의 가격·잔액·결제·엔타이틀먼트 검사는 그대로 적용된다.
- 결제는 됐는데 서비스가 전달되지 않았으면 엔타이틀먼트 복구 · 월정석 크레딧 복원 · 환불 경로를 검토한다.
- 🔴 프로덕션 대상 실제 취소·환불·정산은 **명시적 승인 없이 실행하지 않는다.**
- 결제 정책 · 가격 · 접근 순서 · 환불 동작 · 인증 · DB 스키마 · Worker 바인딩 · 배포 설정을 가볍게 바꾸지 않는다.
