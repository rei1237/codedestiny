# 운명 찻집 상담 가격 정책 (단일 진실 소스)

> 이 문서는 **운명 찻집(fortune-tea-house) 상담 가격**의 단일 진실 소스(Single Source of Truth)다.
> `docs/payment-policy-*.md`는 재화 정의·게이팅 순서·결제 플로우 등 **넓은 정책 산문**을 다루고,
> 이 파일은 그 중 **운명 찻집 상담의 권위 있는 가격표**만을 확정한다. 가격 수치가 코드와
> 어긋나면 이 문서를 기준으로 코드를 맞춘다(수치를 코드에 맞추지 말 것 — 이 문서가 정본).

## 런타임이 아닌 빌드/CI 시점 정합성 강제

Cloudflare Workers는 런타임에 파일을 읽을 수 없으므로, 이 문서와 코드의 정합성은 런타임 참조가
아니라 **빌드/CI 시점**에 `scripts/verify-payment-policy-md.mjs`(npm: `verify:payment-policy-md`)가
강제한다. 이 스크립트는 아래 가격표를 파싱해 다음 세 곳의 소스와 대조하고, 불일치 시 실패(exit 1)한다.

- `worker/lib/paid-feature-registry.js` — 런타임 가격표(`RAW_FEATURE_KEY_PRICE_TABLE`)
- `src/features/fortune-tea-house/data/consultPricing.ts` — 프론트 표시 가격표
- `__tests__/worker/paid-feature-registry.integrity.test.js` — 정본 가격 하드코딩 테스트

## 코인 ↔ KRW 환산 규칙

- **1코인 = 100원** (`KRW_PER_COIN = 100`, 정본: `worker/lib/billing-policy.js`)
- 따라서 `amountKRW = cost × 100` 이 항상 성립해야 한다.
- 코인은 폐지된 내부 단위이며, 사용자에게는 항상 KRW로 환산해 표시한다.

## 가격표 파싱 규약

아래 표의 각 행에서 스크립트는 두 값을 정규식으로 추출한다.

- **featureKey**: 코드 스팬(백틱) 안의 문자열 — 예: `` `fortune-tea-house-tarot-consultation` ``
- **가격(KRW)**: `5,000원` 처럼 쉼표 포함 숫자 뒤 `원` (쉼표 제거 후 정수)
- **cost(코인)**: 순수 정수 셀

헤더 행/구분 행에는 백틱 featureKey가 없어 자동으로 무시된다.

## 운명 찻집 상담 가격표 (정본)

| 상담 | featureKey | 가격(KRW) | cost(코인) | 비고 |
|------|-----------|-----------|-----------|------|
| 타로 상담 (3카드) | `fortune-tea-house-tarot-consultation` | 5,000원 | 50 | 단건 · 3카드 스프레드 |
| 타로 프리미엄 상담 (5카드) | `fortune-tea-house-tarot-five-consultation` | 7,000원 | 70 | 단건 · 5카드 스프레드 |
| 단독 사주 상담 | `fortune-tea-house-saju-consultation` | 10,000원 | 100 | 단건 |
| 사주 궁합 상담 | `fortune-tea-house-saju-compatibility-consultation` | 20,000원 | 200 | 단건 · 본인+상대 두 명식 |
| 숙요점 궁합 상담 | `fortune-tea-house-sukuyo-compatibility-consultation` | 20,000원 | 200 | 단건 |

## 분리 원칙

- **타로 3카드(5,000원)** 와 **타로 5카드 프리미엄(7,000원)** 은 **별도 featureKey**다. 두 상품은
  해석 품질(카드별 상세 해석·카드 간 상호작용·종합 해석·마음의 향)이 동일하고, **카드 장수와 그에 따른
  분량·깊이만** 다르다. 서버는 요청의 `tarotSpread` 값에서 featureKey를 결정하며, 클라이언트가 보낸
  featureKey가 스프레드와 불일치하면 **거부한다**(금액 조작 차단).
- **단독 사주 상담(10,000원)** 과 **사주 궁합 상담(20,000원)** 은 서로 **별도 featureKey**로 분리되어
  있어 한쪽 가격/로직 변경이 다른 쪽에 영향을 주지 않는다.
- **사주 궁합 상담** 과 **숙요점 궁합 상담** 역시 **별도 featureKey**다. 둘 다 20,000원(cost 200)이지만
  결제·접근 판정은 각자의 키로 독립적으로 이루어진다.

## 이번 정책 대상 아님 (현행 유지)

아래 레거시 compat-hub 키들은 이 정책의 대상이 아니며 **현행 가격을 그대로 유지**한다.
`verify:payment-policy-md`는 이 키들이 실수로 변경되지 않았는지 함께 방어한다(가드).

| 상담 | featureKey | 가격(KRW) | cost(코인) | 비고 |
|------|-----------|-----------|-----------|------|
| 레거시 사주 궁합 | `compat-saju-compatibility` | 5,000원 | 50 | 현행 유지 · 운명 찻집과 무관 |
| 레거시 숙요점 궁합 | `compat-sukuyo-compatibility` | 5,000원 | 50 | 현행 유지 · 운명 찻집과 무관 |
| 숙요점 궁합 AI | `sukuyo-compatibility-ai` | 30,000원 | 300 | 현행 유지 · 운명 찻집과 무관 |

> **2026-08-12 — `compat-sukuyo-compatibility` 10,000원(100) → 5,000원(50)**
> 이 한 건은 예외적으로 **코드가 아니라 이 문서를 고쳤다.** 인하가 의도된 정책 결정이고
> ([docs/payment-policy-content-access.md](docs/payment-policy-content-access.md) B유형 항목에 기록됨)
> 코드(`worker/lib/paid-feature-registry.js`)는 이미 반영돼 있었는데 이 가드 표만 갱신이 누락돼
> `verify:payment-policy-md`가 실패하고 있었다. 위 "이 문서가 정본" 규칙은 그대로 유효하며,
> 앞으로 이 표의 값을 바꿀 때는 **정책 결정을 먼저 문서에 적고 코드를 맞추는** 순서를 지킨다.
