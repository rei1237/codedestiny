# 결제 정책 — 결제 플로우 & 변경 이력 (2026-07-04)

> [1부. 개요](payment-policy-overview.md) · [2부. 콘텐츠 접근 유형](payment-policy-content-access.md) · **3부. 결제 플로우 & 변경 이력 (이 문서)**

## 게이팅 우선순위 (2026-08-01 개정)

> **개정 요지**: 규칙의 축이 "이용권을 **언제** 검사하는가"에서 "이용권 보유자가 **어떤 경로로도 돈을 내지 않는가**"로 바뀌었다.
> 진입 시 서버 왕복 선검사는 사라졌고, 그 보장은 아래 3중 방어로 옮겨졌다.

모든 유료 결제는 다음 순서로 판정한다(구현 정본: `worker/routes/billing.js`의 `buildPassPaymentDecision`·`grantPassFreeAccessBeforeCardIfAvailable`, `worker/lib/profile-limits.js`의 `canUseByPass`/`PASS_LIMITS`):

1. **로컬 스냅샷 판정** — 구독 스냅샷(`cd_subscription_snapshot_v2`, 판정 정본 `js/core/pass-verdict.js`)이 **커버를 확답하면 서버 왕복 없이 즉시 무료 통과**(낙관 grant, 서버 기록은 백그라운드). **미커버를 확답해도** 곧바로 결제창. **확답하지 못하면 기다리지 않고 결제창**을 연다 — 진입 경로에 서버 왕복은 없다.
2. **결제창에서 이용권 확인** — 결제창의 첫 카드가 **[이용권으로 구매]**(`data-mode="pass-store"`)이고, 이것이 이용권 검사 지점이다. 누르면 그 자리에서 서버에 물어 **커버되면 결제 없이 무료로 열고**, 아니면 이용권 상점으로 인계한다(`/points?plan=…&cdco=1` → 결제 확인 모달 자동 오픈, 결제 후 원래 화면 복귀).
3. **서버 최종 안전망** — 카드 주문이 만들어지기 직전 `grantPassFreeAccessBeforeCardIfAvailable`이 **결제수단을 DIRECT_KRW로 명시했더라도** 이용권 커버를 검사한다. 커버되면 PortOne 주문을 만들지 않고 `accessMethod:"PASS"` / `charged:0`을 반환한다. 스냅샷이 없는 이용권 보유자(새 기기·시크릿창·저장소 삭제·타 기기에서 방금 구매)가 결제되지 않는 근거가 여기다.
4. **결제창 3옵션** — **[이용권으로 구매]** · **단건결제(KRW, PortOne)** · **월정석**이 항상 함께 보인다. 단건/월정석은 동등 우선순위(`equalPriorityMethods: ["DIRECT_KRW", "MOONLIGHT_STONE"]`, `paymentPriority: "USER_CHOICE_EQUAL"`). 월정석 버튼은 잔액 ≥ `membershipCreditCost`(=코인×10)일 때만 활성, 부족하면 비활성(회색). **월정석은 자동 차감 단계가 아니라 결제창 안의 선택지다.**
5. **코인은 결제창 옵션이 아님** — 코인은 내부 계산 단위일 뿐 사용자에게 결제 수단으로 노출하지 않는다([1부 코인 표시 규칙](payment-policy-overview.md#2-코인레거시-내부-단위-표시-규칙)과 동일).

### 결제창 노출 규칙 (공통)

- 모든 유료 서비스(A 잠금·B 회당 공통)에 적용된다. **결제창에는 이용권/단건/월정석 세 옵션이 항상 함께 보여야 하며, [이용권으로 구매] 카드를 없애거나 단순 상점 링크로 되돌리는 구현 금지** — 그 카드가 사라지면 스냅샷 없는 이용권 보유자가 이용권을 확인할 방법 자체를 잃는다.
- **진입 시 이용권 서버 선검사를 되살리지 말 것** — 셸·React·독립 정적 모두 스냅샷 판정만 쓴다. 되살리면 유료 클릭마다 왕복(구 셸 6초 예산 + 재시도 2회, React 15초 프로브)이 결제창 앞에 다시 붙는다. 가드: `verify:portone-single-payment`(`CD_PASS_FIRST_BUDGET_MS`/`CD_PASS_SLOW_NOTE` 부활 금지, `snapshotVerdictOnly` 존재 강제).
- **서버 안전망의 조기 반환 금지** — `grantPassFreeAccessBeforeCardIfAvailable` 맨 앞에 `shouldCreateDirectPortOneOrder(body)` 바일아웃을 다시 넣지 말 것. 그게 있으면 DIRECT_KRW 요청 시 안전망이 스스로 꺼진다. 가드: `verify:billing-pass-policy`.
- 단, **결제수단이 이미 확정된 뒤의 UI 강제는 여전히 금지** — `paymentMode: "DIRECT_KRW"`를 클라이언트 게이트에 하드코딩하면 결제창에서 월정석 옵션이 사라진다(2026-07-08 ziwei-ai에서 제거). 결제수단 노출은 게이트가 `buildPassPaymentDecision` 결과로 스스로 정한다.
- **앱(Android WebView)에서는 `/points`로 프로그래매틱 이동 금지** — 앱 번들에 `/points`가 없고 `scripts/app-payment-guard.js`의 `PRUNED_ROUTES`는 앵커 클릭만 가로채므로 그대로 빈 화면이 된다. 반드시 `window.__cdOpenChargeModal`(가드가 `/app/store/`로 고정)을 먼저 탄다. 판정 정본은 `js/core/checkout-entry.js`의 `shouldUseAppStoreEntry()`이며, 애매하면 앱 경로로 폴백한다.
- 예외: 프로필 카드 추가·삭제(D유형) **모두** 이용권 결제 불가 기능(`passExcluded`)이므로, **어떤 이용권 등급(family 포함)으로도 결제되지 않으며** tier와 무관하게 이용권 선검사 없이 곧바로 결제창(단건결제/월정석)을 연다. 프론트에서 추가와 삭제가 동일하게 `disablePassFirst:true`·`disablePassChoice:true`·`allowedPaymentModes:['direct','monthly']`를 넘겨야 한다(과거 삭제만 지키고 추가는 이용권 선검사를 태워 막다른 길이 됐다). family 무료는 결제가 아니라 정책 계층의 0원 바이패스다 — [2부 D유형](payment-policy-content-access.md#d-프로필-카드-추가삭제-고정-관리-수수료) 참고.
- 결제창 UI 구현: React 폴백 `openReactPaymentChoiceModal`(`app/_lib/billing-client.ts`), 런타임 정본 `_cdChooseServicePaymentMode`(`public/js/destiny-profile.js`).

### 공통 흐름 (A 잠금 · B 회당 동일)
```
유료 기능 클릭
├─ (A유형만) 로컬 해금 상태 확인 → 이미 해금이면 무료 열람
├─ 스냅샷이 '커버' 확답 → 즉시 무료 실행 (서버 왕복 0, 대기 화면 0)
└─ 그 외 전부        → 즉시 결제창 (서버 왕복 0, 대기 화면 0)
      ├─ [이용권으로 구매] → 그 자리에서 서버 이용권 검사
      │      ├─ 커버       → 결제창 닫고 무료 실행
      │      └─ 미커버     → /points 이용권 결제 모달 자동 오픈 → 결제 → 원래 화면 복귀
      ├─ [단건 결제]       → 서버가 이용권 재확인(안전망) → 커버면 무료, 아니면 PortOne
      └─ [월정석]          → 월정석 차감 (코인은 내부 단위, 최종 청구는 원화)
```
이용권 보유자는 결제 선택창에서만 서버 상태를 확인하며, 메인 진입 시에는 월정석·레거시 잔액을 예열하지 않는다.

### Legacy COIN 요청 처리

- 구형 클라이언트가 `paymentMode=COIN`, `forceDeduct=true`, 또는 결제 방식 없는 요청을 보내도 서버는 `User.points`를 읽거나 차감하지 않고 `PAYMENT_REQUIRED`와 `legacyCoinDisabled: true`를 반환한다.
- 이미 존재하는 entitlement·이용권·검증된 과거 결제 증거는 결제 요구 전에 계속 승인한다. 새 결제는 이용권 → 월정석/단건 결제 선택 흐름으로만 진행한다.
- `ContentEntitlement`, `User.unlockedFeatures`, `PointHistory`, `daehan_purchases`는 삭제하지 않으며, 과거 거래 복구만 레거시 원장을 사용한다.
- 메인 진입과 잠금 상태 표시에서는 잔액 API를 예열하지 않는다. 잔액과 월정석 잔액은 결제 선택창을 열었을 때만 조회한다.

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-07-04 | 결제 정책 3부작 최초 작성(개요/콘텐츠 접근 유형/결제 플로우로 분할). 코인 단위 사용자 노출 UI 5곳을 원화 표시로 수정(코드 내부 변수명은 유지). 이용권=구독형(자동갱신 없음)/월정석=비구독 방침 확정. 숙요점 궁합은 유료 회당 결제로 유지 확정 |
| 2026-07-08 | 공통 결제 게이팅 정책 명문화: 모든 유료 결제는 이용권 선검사(등급 한도가 가격 커버 시 결제창 없이 통과) 후 미커버 시에만 결제창 노출, 결제창은 단건결제(KRW)+월정석 2옵션 동등 제시(월정석은 자동 차감 아님). "결제창 노출 규칙(공통)" 신설(서버 `paymentMode` 하드코딩 금지). ziwei-ai runtimeGate의 `paymentMode:"DIRECT_KRW"` 제거 |
| 2026-08-01 | **이용권 검사 지점을 진입 선검사 → 결제창으로 이동.** 진입 시 서버 왕복 선검사를 셸·React·독립 정적 전부에서 제거하고(스냅샷 낙관 판정은 유지), 결제창 첫 카드를 `[이용권으로 구매]`로 재정의해 누르면 그 자리에서 서버 검사 → 커버 시 결제 없이 무료, 미커버 시 이용권 상점으로 인계(`cdco=1` → 결제 확인 모달 자동 오픈 → 결제 후 원래 화면 복귀). 전제로 **서버 안전망의 DIRECT_KRW 조기 반환을 제거**(`grantPassFreeAccessBeforeCardIfAvailable`) — 그 구멍 때문에 스냅샷 없는 이용권 보유자가 카드로 결제될 수 있었다. 3옵션 설명 문구를 절차 서술에서 선택 기준으로 재작성하고 3렌더러 통일 + i18n 12로케일 등록. 결제 퍼널 최소 계측 신설(`POST /api/billing/funnel-event`, `CheckoutFunnelEvent` TTL 90일, 개인식별자 미저장) |
