# 인수인계 — 서비스 카드 이용권 배지 · /points 한도 위젯 (PR③)

> 이 문서만 읽고 시작할 수 있게 쓴다. 2026-08-24 이용권 정책 개편의 **마지막 조각**이며,
> 앞의 두 PR 이 머지된 뒤에 착수한다.

## 선행 상태 (이미 끝난 것 — 다시 하지 말 것)

| PR | 브랜치 | 내용 |
|---|---|---|
| ① #1109 | `fix/pass-tier-price-band` | 서버 정책: 건당 적용 가격 범위 상향(5,000/10,000/20,000, family 상한 없음), 상담 포함횟수 폐지, 앱 SKU 가 = 웹가, `describePassEligibility`, `access-state.passUsage`, 신규 가드 `verify:pass-tier-policy` |
| ② | `feat/pass-tier-copy` (①위에 스택) | 사용자에게 보이는 문구 전량 정합(이용약관·결제창·앱상점·/points·홈 카드·프로필 한도 UX) + i18n 12로케일 |

**확정된 정책** (바꾸지 말 것 — 사용자 확정):

| 등급 | 가격 | 적용 가격 범위 | 월 이용 한도 | 프로필 |
|---|---|---|---|---|
| 🍯 스탠다드 꿀 | 9,900원 | 5,000원 이하 | 30,000원 | 3개 |
| ✨ 프리미엄 꿀 `BEST` | 29,900원 | 10,000원 이하 | 100,000원 | 7개 |
| 🔮 VVIP 꿀단지 | 59,000원 | 20,000원 이하 | 200,000원 | 15개 |
| 👑 Code Destiny Family | 149,000원 | 상한 없음 | 500,000원 | 무제한 |

문구 규칙: `무제한`·`월 누적`·`횟수 제한 없음`·`마음껏` 금지(Family 의 "프로필 무제한"만 예외 — 실제로 무제한). 표기는 `N원급 콘텐츠까지 · 월 최대 N원 상당 · 프로필 최대 N개`. 가드 `verify:pass-tier-policy` 가 등급 카드 문구를 검사한다.

## 남은 일 두 가지

### A. 서비스 카드에 이용권 적용 범위 배지 (요청 13항)

구매 **전** 화면에는 지금 배지가 없다. 결과 화면 한 곳(`src/features/master-love-codex/data/premium.ts` 의 `codexAccessLabel`)만 "이용권 포함"을 보여 준다 — 그건 사후 표시라 재사용할 수 없다.

표시할 것:

```
정상가 5,000원   → 스탠다드 꿀 이상 이용권 포함
정상가 10,000원  → 프리미엄 꿀 이상 이용권 포함
정상가 20,000원  → VVIP 꿀단지 이상 이용권 포함
20,000원 초과    → 이용권 미포함 · 단건 구매
월 한도 소진     → 이용권 적용 대상이지만 이번 달 이용 한도를 모두 사용했어요
                   + 대안(다음 이용기간에 다시 이용 / 단건 구매)
```

🔴 **각 페이지가 가격을 비교하게 만들지 말 것**(요청 5·22항). 지금 클라이언트에는 판정 함수가 없어서, 그대로 두면 카드마다 `price <= 5000` 같은 비교가 흩어진다 — 가격이 하나 바뀌면 화면이 조용히 어긋난다.

**권하는 방법**: 프론트 전용 판정 유틸을 하나 만든다.

- 위치: `lib/payment/pass-eligibility.ts` (프론트와 워커가 함께 import 할 수 있는 자리 — `lib/payment/pass-pricing.js` 가 쓰는 것과 같은 방식)
- 서버 정본 `worker/lib/profile-limits.js` 의 `PASS_LIMITS` / `MONTHLY_PASS_LIMITS_KRW` 를 **import** 한다(숫자를 다시 적지 않는다). 이 파일은 순수 상수 테이블이라 클라이언트 번들에 안전하다 — `app/app/store/AppPassStoreClient.tsx` 가 PR②에서 이미 같은 방식으로 import 한다.
- 입력은 `(canonicalPriceKRW, passUsage)` 뿐. `passUsage` 는 PR①이 넣은 `entitlementSnapshot.passUsage`(`worker/lib/access-state.js`)에서 온다.
- 반환: `{ minimumTier, coveredByCurrentPass, monthlyExhausted, label }`
- 🔴 게이트가 아니다. 실제 허용/차감은 서버 `evaluatePassCoverage` + `consumePassCoverage` 가 한다. 이 값을 보고 결제 흐름을 건너뛰는 코드를 만들지 말 것(CLAUDE.md 원칙 6 — 중첩 사전검사 금지).

**붙이는 곳**:
- `app/components/ServiceCard.tsx` — `Badge.tone` 에 값 추가(현재 `"free" | "coin" | "new" | "soft"`), 색상은 `badgeClass()`
- `app/components/FeatureLandingPage.tsx` — CTA 하단
- 가격 자체는 기존 `app/components/PriceBadge.tsx` / `app/hooks/useServerPrice.ts` 재사용 — 새로 만들지 말 것
- ⚠️ 홈 서비스 카드의 배지는 `app/components/MainLandingPage.tsx:299-385` 에 **리터럴 문자열**로 박혀 있다(`{ text: "3,000원", tone: "coin" }`). 레지스트리에서 오지 않으므로, 여기 배지를 붙이려면 그 데이터부터 featureKey 기반으로 바꿔야 한다 — 범위가 커지니 별도 판단이 필요하다.

**i18n**: 신규 문구 5~6개 × 12로케일. 🔴 자동 번역기 금지(Gemini 유료 실호출). 키 수를 먼저 줄이고 손으로 쓴다.

### B. `/points` 에 월 이용 한도 현황 (요청 14항 두 번째 위치)

위젯 자체는 **이미 완성돼 있다** — `app/points/history/PointHistoryClient.tsx` 의 `PassCycleCard`(진행률 바 + 사용/한도/잔여 + 등급별 색상 + 다국어). 새로 만들지 말 것.

문제는 위치가 `/points/history` 하나라는 것이다. `/points`(이용권 페이지)에도 필요하다.

- `PassCycleCard` 는 `PointHistoryClient.tsx` 내부 함수라 export 가 없다. 공용 컴포넌트로 뽑아내되, **스타일이 `PointHistoryClient.module.css`(`:230~`)에 묶여 있으니** CSS 모듈도 함께 옮기거나 공유해야 한다.
- 데이터: `/points` 는 PR①의 `entitlementSnapshot.passUsage` 를 쓰면 추가 왕복이 0이다. `/points/history` 는 `dataNode.passCycleCapWon`/`passCycleSpentWon` 을 쓰는 별개 경로다 — 두 경로가 같은 숫자를 내는지 확인할 것.
- 모바일에서 2줄을 넘기지 않는다(요청 24항).

## 착수 전에 읽을 것

- 정책 3부작: [docs/payment-policy-overview.md](../payment-policy-overview.md) · [content-access](../payment-policy-content-access.md) · [flow](../payment-policy-flow.md) — PR①에서 전부 갱신했다
- [docs/context/payment-gating.md](../context/payment-gating.md) — 결제창 3렌더러 규격, 금지 패턴 7종

## 실패했거나 함정이었던 것 (같은 데서 두 번 넘어지지 말 것)

1. **`sed -i` 가 CRLF 를 떨군다.** `app/_lib/billing-client.ts` 에서 실제로 발생했다. 결제 동결 해시는 워킹트리 내용으로 계산되므로 로컬만 LF 가 되면 CI 와 갈릴 수 있다. 편집 후 `file <path>` 로 확인하고, 떨어졌으면 되돌린다.
2. **Bash heredoc 이 백슬래시를 한 겹 벗긴다.** quoted heredoc(`<<'EOF'`) 안에서도 그렇다. `'\n'` 을 포함한 패턴 매칭이 조용히 실패한다 — 그런 편집은 Write 툴로 스크립트를 만들어 실행할 것.
3. **가드 주석에 금지어를 그대로 적으면 그 가드가 자기 주석을 잡는다.** `index.html` 주석에 "월 누적"을 적었다가 `fusion-fortune.static.test.js` 가 실패했다. 금지 토큰은 가드 파일에만 두고 주석에서는 참조만 한다.
4. **캐시 핀은 두 종류이고 `sync:public` 이 돌리지 않는다.** `js/core/*`(checkout-entry + pass-verdict 유도)와 `js/destiny-profile.js` 유도, 각각 23개 안팎의 독립 정적 페이지 + `app/layout.js` + `.ts`/`.mjs` 에 흩어져 있다. `verify:payment-choice-parity` 가 기대 해시를 알려 주니 그 값으로 전부 치환한다. **`--include=*.html --include=*.js` 만 걸면 `.ts`/`.mjs` 를 놓친다.**
5. **테스트가 정책 숫자를 리터럴로 들고 있으면 그 테스트는 정책이 아니라 옛 숫자를 지킨다.** PR①에서 5곳을 서버 정본 파생으로 바꿨다. 새 테스트를 쓸 때 `PASS_LIMITS` 를 import 할 것.
6. **`profile-limits.js` 를 전량 모킹하지 말 것.** `access-state.route.test.js` 가 스텁 하나만 담은 객체로 대체해, 그 모듈에서 상수를 하나 더 가져오는 순간 스위트 전체가 죽었다. 부분 모킹(`...actualProfileLimits`)으로 고쳐 뒀다.

## 사람이 확인해야 할 것 (아직 미해결)

1. 🔴 **Play Console 이용권 SKU 4개 가격**을 9,900 / 29,900 / 59,000 / 149,000 으로 수정. 코드 상수와 1:1 계약이다.
2. **AI 원가 경제성** — 5,000원 LLM 상품이 스탠다드(9,900원)에 열린다. 월 3만원 한도로 최대 6회이므로 회당 원가가 1,650원을 넘으면 역마진이다. 상품별 실제 LLM 원가는 `미검증`.
3. **기존 VVIP 보유자**가 초융합 심층 리딩(30,000원) 커버를 잃는다. 공지 여부는 사업 판단.

## 범위 밖으로 남겨 둔 것

- `/points` 는 i18n JSON 을 전혀 쓰지 않는다 — `POINTS_PAGE_COPY`(ko/en 인라인, 나머지 7개는 en 별칭)와 컴포넌트 안 한국어 리터럴이 섞여 있다. 이번 개편에서는 그 객체 안 문구만 맞췄고 구조는 건드리지 않았다.
- `app/points/PointsClient.tsx` 의 `SubscriptionSection`(`:1644~`)은 `{false && …}` 안의 죽은 코드다. 정리 대상이지만 이번 범위에서 손대지 않았다.
- 레거시 `worker/routes/billing.js` 의 `premiumUseCount` 경로. writer 는 그 파일 한 곳인데 reader 는 18개 라우트에 걸쳐 있다. V2 는 이 카운터를 올리지 않는다(의도된 설계). 정리는 별건이다.
- `docs/pricing/PRICING_AUDIT.md` 가 기록한 `verify:payment-policy-md` 선행 FAIL(compat-sukuyo 문서 100코인 vs 코드 50코인) — 이번 작업 이전부터 있던 불일치다.
- `verify:i18n-no-fallback` 의 "fallback 인자 181 → 192" 경고. 이번 변경을 제외하고 측정해도 192라 **선행 상태**이며 경고일 뿐 CI 를 막지 않는다.
