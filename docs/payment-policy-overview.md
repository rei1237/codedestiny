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
- 혜택: 이용권 종류에 따라 **등급별 적용 가격 범위** 안의 서비스를 30일간 결제 없이 이용 가능(단, **등급별 월 이용 한도** 이내) + 프로필 등록 개수 기준값
- 🔴 **문구 규칙(2026-08-24)**: 모든 등급에 월 이용 한도가 있으므로 사용자 화면에 "무제한"·"횟수 제한 없음"·"마음껏"을 쓰지 않는다. 표기는 `N원급 콘텐츠까지 · 월 최대 N원 상당 · 프로필 최대 N개`이며, "월 누적" 대신 "월 이용 한도"/"월 최대 N원 상당"을 쓴다. 예외는 Family 의 "프로필 무제한" 하나뿐이다(실제로 무제한이라 모순이 없다). 가드: `verify:pass-tier-policy`
- 이용권 종류별 세부 정책: `worker/lib/profile-limits.js`의 `HONEY_PASS_POLICY`/`PASS_LIMITS`(적용 가격 범위)/`MONTHLY_PASS_LIMITS`(월 이용 한도) (⚠️ 서버 DB 정책 테이블이 아닌 **하드코딩된 JS 상수**, `worker/routes/billing.js`에도 `tier === "family"` 분기가 중복 하드코딩되어 있음 — 정책 변경 시 두 곳 모두 확인)
- 🔴 **같은 숫자의 하드코딩 사본이 5곳 더 있다.** `worker/lib/app-store-pricing.js`(앱 SKU `coinLimit`) · `js/core/pass-verdict.js`(`PASS_LIMIT_BY_TIER`) · `index.html`(`goldenPackages[].freeLimit` + 미니 배지 `freeLimits`) · `app/points/PointsClient.tsx`(`freeUpTo`). 전수 대조 가드는 `npm run verify:pass-tier-policy` 이며, 사본에서 4등급을 다 못 뽑으면 **통과가 아니라 실패**다(fail-closed).
- **판정 정본은 한 곳**: `worker/payments/passes.js`의 `evaluatePassCoverage`(읽기 0회). 화면용 설명은 같은 파일의 `describePassEligibility`가 그 결과를 옮겨 담을 뿐 **다시 계산하지 않는다** — 판정이 두 벌이 되면 "판정은 커버라 했는데 소비가 거부"하는 막다른 길이 생긴다. 월 한도 현황은 `worker/lib/access-state.js`의 `entitlementSnapshot.passUsage`가 추가 왕복 없이 내려준다.
- **프로필 개수 "상한"은 하드 상한이 아님**: 등급별 개수(standard 3 / premium 7 / vvip 15)는 UI 표시·안내용 기준값일 뿐이며, 이 값을 초과해도 **건당 5,000원(또는 월정석 500) 단건 결제로 무제한 추가**할 수 있다. 자세한 규칙은 [2부. D. 프로필 카드 추가/삭제](payment-policy-content-access.md#d-프로필-카드-추가삭제) 참고
- **등급별 적용 가격 범위 · 월 이용 한도 · 프로필 수**(2026-08-24 개정 — 규칙은 이 둘뿐이다):

  | 등급 | 가격 | 적용 가격 범위 | 월 이용 한도 | 프로필 |
  |---|---|---|---|---|
  | 🍯 스탠다드 꿀 | 9,900원 | 5,000원 이하 | 30,000원 | 3개 |
  | ✨ 프리미엄 꿀 | 29,900원 | 10,000원 이하 | 100,000원 | 7개 |
  | 🔮 VVIP 꿀단지 | 59,000원 | 20,000원 이하 | 200,000원 | 15개 |
  | 👑 Code Destiny Family | 149,000원 | 상한 없음(이용권 대상 전체) | 500,000원 | 무제한 |

  월 이용 한도는 이용권 사이클(만료일)마다 자동 리셋되며, 한도를 넘겨도 서비스가 막히지 않고 남은 기간은 단건 결제/월정석으로 넘어간다. 차감액은 **정상 판매가(canonical price)** 기준이다 — 할인가·쿠폰가·PG 실결제액이 아니다.
- 🔴 **'프리미엄 상담 포함 횟수'는 2026-08-24 폐지됐다.** 구 정책에는 세 번째 규칙으로 family 10회 · VVIP 3회가 있었고 그 대상 건은 건당 상한을 우회했다. VVIP 상한이 10,000원 → 20,000원으로 오르면서 우회를 남기면 20,001~29,999원만 미커버인 설명 불가능한 구간이 생겨 폐지했다. 정본은 `PREMIUM_QUOTA_INCLUDED_USES_BY_TIER = {}`(빈 표가 정책이다). 등급을 되살리면 가격 페이지 문구와 서버 판정이 어긋난다.
- **family 이용권 (특수)**: 프로필 추가/삭제 무료(개수 무제한), 건당 가격 상한 없음(금액 무관 커버 — 초융합 심층 리딩 30,000원을 커버하는 유일한 등급), 다만 위 월 이용 한도 500,000원은 동일하게 적용된다
- 코드 내부 명칭(`profileSubscription`, `accessSource: "subscription"`, `monthlySubscription`)은 위 방침과 일치하므로 변경하지 않는다

## 2. 코인(레거시 내부 단위) 표시 규칙

- **코인은 폐지된 개념이며 사용자에게 결제 수단으로 노출되지 않는다.** 서버 내부 계산에만 남아있는 레거시 단위다.
- 가격은 항상 **통화 단위(현재 KRW, 향후 해외 진출 시 해당 국가 통화)** 로만 표시한다.
- 환산 고정값: **1코인 = 100원** (`worker/lib/billing-policy.js`의 `KRW_PER_COIN = 100`, 프론트는 `lib/payment/coin-pricing.ts`의 동일 상수 사용)
- 신규 UI를 작성할 때 `coinPrice`/`cost` 같은 코인 정수를 그대로 렌더링하지 말고, `formatKrwFromCoins()`(프론트) 또는 `calculateKrwAmountFromCoins()`(서버)를 거쳐 통화 문자열로 변환해서 표시한다.
- 내부 변수명(`coinPrice`, `coinCost` 등)은 전면 리네이밍하지 않는다 — 표시 레이어만 통화 기준으로 맞추면 된다.

관련 진단 기록: [docs/coin-unit-audit-2026-07-04.md](coin-unit-audit-2026-07-04.md)
