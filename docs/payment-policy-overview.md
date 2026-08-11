# 결제 정책 — 개요 (2026-07-04)

> 이 문서는 결제/잠금 로직 구현 기준이 되는 공식 정책 문서 3부작 중 1부다. 정책 변경 시 반드시 이 문서들을 먼저 수정한 뒤 코드에 반영할 것.
> - **1부. 개요 (이 문서)** — 결제 수단, 단위, 재화 정의
> - **2부. [콘텐츠 접근 유형](payment-policy-content-access.md)** — 잠금 콘텐츠 vs 회당 결제 vs 무료 구분
> - **3부. [결제 플로우 & 변경 이력](payment-policy-flow.md)** — 실제 게이팅 순서, 변경 이력

## 1. 결제 수단 및 단위

### 단건 결제 (KRW)
- 서비스 이용 시마다 PG사(PortOne V2 · KG이니시스)를 통해 원화로 결제
- 가격 단위: **원(KRW)**

### 월정석
- 이벤트·프로모션으로 지급되는 충전형 포인트
- 사용자가 직접 구매 불가
- **유효기간 30일 · 지급분별 소멸**: 월정석은 **각 지급분(가입/추천/이벤트 등)이 지급된 날로부터 30일간만 유효**하며, 그 기간 내에 사용하지 않은 지급분은 **자동 소멸**한다. 여러 번 나눠 지급받은 경우 각 지급분은 자기 지급일 기준으로 개별 만료하고, 사용 시에는 **오래된(먼저 만료되는) 지급분부터 차감(FIFO)** 한다. 소멸된 월정석은 복구·환불되지 않는다.
- **구독이 아님** — 이용권(아래)과 절대 혼동하지 말 것. 코드: `membership_credit` / `moonlight_stone`, `MonthlyCreditLedger`
- 구현: 지급분은 `profileSubscription.membershipCreditLots[]`(각 `{ lotId, amount, remaining, grantedAt, expiresAt }`)에 기록되며, 스칼라 `membershipCreditBalance`는 "미만료 lot 잔량 합계"의 파생 캐시다. 만료 판정·차감은 `worker/lib/monthly-credit-lots.js`, 지급/차감/환불 DB 반영은 `worker/lib/monthly-credit-store.js`, 미사용분 소멸 스윕은 매일 크론 `worker/lib/monthly-credit-expiry-task.js`(원장 `MONTHLY_CREDIT_EXPIRE`)가 담당한다. TTL 상수 = 30일(`MONTHLY_CREDIT_TTL_MS`).

### 이용권
- 구매 방식: 단건 구매(1회 결제) 후 **30일간 지속**
- 30일 지속되므로 "구독(형 이용권)"으로 불러도 무방하나, **자동결제(auto-renewal)는 없음** — 만료 후 사용자가 매번 직접 재결제해야 한다. 이 차이만 명확히 인지할 것
- 혜택: 이용권 종류에 따라 일정 금액 이하의 서비스를 30일간 무료 이용 가능(단, **등급별 30일 누적 한도** 이내) + 프로필 등록 개수 기준값
- 이용권 종류별 세부 정책: `worker/lib/profile-limits.js`의 `HONEY_PASS_POLICY`/`PASS_LIMITS`(건당 상한)/`MONTHLY_PASS_LIMITS`(월 누적 한도, 2026-08 도입) (⚠️ 서버 DB 정책 테이블이 아닌 **하드코딩된 JS 상수**, `worker/routes/billing.js`에도 `tier === "family"` 분기가 중복 하드코딩되어 있음 — 정책 변경 시 두 곳 모두 확인)
- **프로필 개수 "상한"은 하드 상한이 아님**: 등급별 개수(standard 3 / premium 7 / vvip 15)는 UI 표시·안내용 기준값일 뿐이며, 이 값을 초과해도 **건당 5,000원(또는 월정석 500) 단건 결제로 무제한 추가**할 수 있다. 자세한 규칙은 [2부. D. 프로필 카드 추가/삭제](payment-policy-content-access.md#d-프로필-카드-추가삭제) 참고
- **등급별 건당 상한 · 월 누적 한도 · 상담 포함횟수**(2026-08 개정): 스탠다드(건당 3,000원 이하, 월 누적 30,000원) · 프리미엄(건당 5,000원 이하, 월 누적 100,000원) · VVIP(건당 10,000원 이하, 월 누적 200,000원, 300코인 이상 전문가 상담 30일 3회 포함) · Family(건당 상한 없음, 월 누적 500,000원, 300코인 이상 전문가 상담 30일 10회 포함). 월 누적 한도는 이용권 사이클(만료일)마다 자동 리셋되며, 한도를 넘겨도 서비스가 막히지 않고 남은 기간은 단건 결제/월정석으로 넘어간다.
- **family 이용권 (특수)**: 프로필 추가/삭제 무료(개수 무제한), 건당 가격 상한 없음(금액 무관 커버), 다만 위 30일 누적 500,000원 한도는 동일하게 적용된다
- 코드 내부 명칭(`profileSubscription`, `accessSource: "subscription"`, `monthlySubscription`)은 위 방침과 일치하므로 변경하지 않는다

## 2. 코인(레거시 내부 단위) 표시 규칙

- **코인은 폐지된 개념이며 사용자에게 결제 수단으로 노출되지 않는다.** 서버 내부 계산에만 남아있는 레거시 단위다.
- 가격은 항상 **통화 단위(현재 KRW, 향후 해외 진출 시 해당 국가 통화)** 로만 표시한다.
- 환산 고정값: **1코인 = 100원** (`worker/lib/billing-policy.js`의 `KRW_PER_COIN = 100`, 프론트는 `lib/payment/coin-pricing.ts`의 동일 상수 사용)
- 신규 UI를 작성할 때 `coinPrice`/`cost` 같은 코인 정수를 그대로 렌더링하지 말고, `formatKrwFromCoins()`(프론트) 또는 `calculateKrwAmountFromCoins()`(서버)를 거쳐 통화 문자열로 변환해서 표시한다.
- 내부 변수명(`coinPrice`, `coinCost` 등)은 전면 리네이밍하지 않는다 — 표시 레이어만 통화 기준으로 맞추면 된다.

관련 진단 기록: [docs/coin-unit-audit-2026-07-04.md](coin-unit-audit-2026-07-04.md)
