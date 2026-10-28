> 2026-10-24 사용자 승인: 영냥이 전용 횟수 이용권의 사용 기한을 없앱니다. 신규 v5 상품의 validityDays 및 지급/응답 expiresAt은 null입니다. 기존 v3/v4 주문 스냅샷과 저장된 만료일은 감사·결제 재개를 위해 보존하지만, 남은 횟수의 조회·차감에는 만료일을 적용하지 않습니다. 가격·횟수·지원 상담·환불 및 선물 수령 기한은 유지합니다. 아래 과거 기록의 30일 사용 기한보다 이 정책이 우선합니다. 운영 DB 일괄 수정은 필요하지 않습니다.

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

2026-09-21 사용자 승인으로 운명 찻집 5종을 5,000원으로 통일했고, 2026-10-11 프리미엄 가격 개편 승인으로 5종 모두 10,000원으로 조정한다. 기존 주문의 결제액·환불 기준은 변경하지 않는다. 상세 변경 정책은 [프리미엄 가격 개편 인수인계](docs/handoff/premium-repricing-20261011.md)를 따른다. 2026-10-16부터 5종 모두 결과 1건당 추가 질문 1회(같은 명식·카드·본명숙 근거, 카드 재추첨 없음)를 가격 변경 없이 포함한다. 횟수는 `worker/lib/fortune-tea-follow-up-contract.js`의 `TEA_FOLLOW_UP_LIMIT`가 정하고, 답변 생성에 실패하면 횟수를 쓰지 않는다.

2026-10-17 승인된 [개인 사주 상담 찻집 통합](docs/context/payment-gating.md#2026-10-17-승인-개인-사주-상담-찻집-통합)에 따라 신규 단독 사주 상담만 15,000원(cost 150)을 적용한다. 다른 네 가지 상담과 기존 주문의 가격 스냅샷은 유지한다. 이 문서 갱신은 해당 승인으로 이미 반영된 가격을 기록하며 새 가격 변경을 도입하지 않는다.

| 상담 | featureKey | 가격(KRW) | cost(코인) | 비고 |
|------|-----------|-----------|-----------|------|
| 타로 상담 (3카드) | `fortune-tea-house-tarot-consultation` | 5,000원 | 50 | 단건 · 3카드 스프레드 · 추가 질문 1회 포함 |
| 타로 프리미엄 상담 (5카드) | `fortune-tea-house-tarot-five-consultation` | 7,000원 | 70 | 단건 · 5카드 스프레드 · 추가 질문 1회 포함 |
| 단독 사주 상담 | `fortune-tea-house-saju-consultation` | 10,000원 | 100 | 단건 · 추가 질문 1회 포함 |
| 연이·네오 공동 사주 상담 | `fortune-tea-house-saju-joint-consultation` | 15,000원 | 150 | 별도 상품 · 기존 공동 상담 가격 유지 |
| 사주 궁합 상담 | `fortune-tea-house-saju-compatibility-consultation` | 10,000원 | 100 | 단건 · 본인+상대 두 명식 · 추가 질문 1회 포함 |
| 숙요점 궁합 상담 | `fortune-tea-house-sukuyo-compatibility-consultation` | 10,000원 | 100 | 단건 · 추가 질문 1회 포함 |

## 분리 원칙

- **타로 3카드(10,000원)** 와 **타로 5카드 프리미엄(10,000원)** 은 **별도 featureKey**다. 두 상품은
  해석 품질(카드별 상세 해석·카드 간 상호작용·종합 해석·마음의 향)이 동일하고, **카드 장수와 그에 따른
  분량·깊이만** 다르다. 서버는 요청의 `tarotSpread` 값에서 featureKey를 결정하며, 클라이언트가 보낸
  featureKey가 스프레드와 불일치하면 **거부한다**(금액 조작 차단).
- **단독 사주 상담(15,000원)** 과 **사주 궁합 상담(10,000원)** 은 서로 **별도 featureKey**로 분리되어
  있어 한쪽 가격/로직 변경이 다른 쪽에 영향을 주지 않는다.
- **사주 궁합 상담** 과 **숙요점 궁합 상담** 역시 **별도 featureKey**다. 둘 다 10,000원(cost 100)이지만
  결제·접근 판정은 각자의 키로 독립적으로 이루어진다.

## 기존 궁합 허브 가격

2026-09-21 승인된 꽃돼지 일반 상품 인하에 따라 기존 compat-hub 두 상품을 3,000원으로 조정했다. 이후 2026-10-04 사용자 승인으로 레거시 사주 궁합(`compat-saju-compatibility`)을 LLM 서술형 서비스로 전환하며 5,000원(cost 50)으로 올렸다. 2026-10-11 프리미엄 가격 개편에서는 AI 사주 궁합을 10,000원(cost 100), 계산 기반 숙요점 궁합을 5,000원(cost 50)으로 조정한다. 기존 30,000원 전문가 상담은 유지한다.
`verify:payment-policy-md`는 이 키들이 실수로 변경되지 않았는지 함께 방어한다(가드).

| 상담 | featureKey | 가격(KRW) | cost(코인) | 비고 |
|------|-----------|-----------|-----------|------|
| 레거시 사주 궁합 | `compat-saju-compatibility` | 10,000원 | 100 | 2026-10-11 승인 인상 · LLM 서술형 · 운명 찻집과 무관 |
| 레거시 숙요점 궁합 | `compat-sukuyo-compatibility` | 5,000원 | 50 | 2026-10-11 승인 인상 · 계산 기반 · 운명 찻집과 무관 |
| 숙요점 궁합 AI | `sukuyo-compatibility-ai` | 30,000원 | 300 | 현행 유지 · 운명 찻집과 무관 |

> **2026-08-12 — `compat-sukuyo-compatibility` 10,000원(100) → 5,000원(50)**
> 이 한 건은 예외적으로 **코드가 아니라 이 문서를 고쳤다.** 인하가 의도된 정책 결정이고
> ([docs/payment-policy-content-access.md](docs/payment-policy-content-access.md) B유형 항목에 기록됨)
> 코드(`worker/lib/paid-feature-registry.js`)는 이미 반영돼 있었는데 이 가드 표만 갱신이 누락돼
> `verify:payment-policy-md`가 실패하고 있었다. 위 "이 문서가 정본" 규칙은 그대로 유효하며,
> 앞으로 이 표의 값을 바꿀 때는 **정책 결정을 먼저 문서에 적고 코드를 맞추는** 순서를 지킨다.

## 운세 프롬프트 허브 — 꿀방울과 대체 결제

2026-10-12 사용자 승인. 프롬프트 1회 생성 = 꿀방울 1개이며, 꿀방울은 현재 코드 기준 출석 하루 1개 지급된다(`HONEY_ATTENDANCE_EVERY = 1`)
(찻집과 같은 지갑 `fortune_tea_house_honey_wallets`). 꿀방울이 없을 때만 아래 단건 결제로 1회 생성한다.

2026-10-18 사용자 후속 결정: 같은 날 숙요 작업의 "종합 프롬프트 신규 꿀방울 사용 차단"을 **프롬프트에 한해** 되돌려 1회 = 꿀방울 1개를 복원한다.
꿀편지·타로 앨범·프로필 정령 차단은 유지한다. 서버는 홈 사용처 24상품 목록(`HONEY_UNLOCK_PRODUCTS`)에 프롬프트를 넣지 않고
`isHoneyPromptHubSpend()` 전용 판정으로만 허용한다. 3,000원 단건 결제(`fortune-prompt-hub-generate`, cost 30)는 그대로다.
조립 템플릿은 서버(`lib/fortune/prompt-hub-template.js`)에만 있고 `POST /api/fortune/prompt-hub/generate` 가 차감 후 내려준다.

| 상품 | featureKey | 가격(KRW) | cost(코인) | 비고 |
|------|-----------|-----------|-----------|------|
| 운세 프롬프트 1회 생성 | `fortune-prompt-hub-generate` | 3,000원 | 30 | 단건 · 꿀방울 대체 · Play `cd_content_tier_01` |

## 연이 운명 상담 — 꿀방울 30개로 열기 (2026-10-18)

2026-10-18 사용자 승인. 연이 단독 운명 상담(`/fortune-chat`, `fortune-chat-consultation` 1회 5,000원)은 이용권·단건 결제에 더해
**꿀방울 30개**로도 1건을 열 수 있다(30방울 = 5,000원 1회와 같은 값으로 본다). 같은 지갑(`fortune_tea_house_honey_wallets`)에서 차감하며,
출석 보상은 현재 코드 기준 하루 1개(`HONEY_ATTENDANCE_EVERY = 1`)다.

- 정본: 차감·환불 `worker/lib/honey-wallet.js`(`FORTUNE_CHAT_HONEY_COST`, ledger `fortune-chat:<uid>:fc-<id>`), 연결 `worker/yeongnyangi/repository.js` `attachChatHoney`.
- 연이 기본 상담 키에만 쓴다. 질문 티어·네오·공동 상담에는 꿀방울을 쓰지 않는다(409 `HONEY_NOT_AVAILABLE`).
- 이미 있는 증빙(카드 결제·코인·월정석·이용권·과거 무료 1회)이 먼저다. 그 증빙으로 열리면 꿀방울을 차감하지 않고, 결제창이 열린 상담은 꿀방울로 열지 않는다.
- 잔액이 모자라면 402 `INSUFFICIENT_HONEY_DROPS`, 재시도는 같은 ledger 로 한 번만 차감된다.
- 답을 전달하기 전에 생성이 최종 실패한 경우에만 30방울을 한 번 돌려준다(`HONEY_RESTORED`). 전달된 상담은 돌려주지 않는다.
- 꿀방울 해금 카탈로그(`HONEY_UNLOCK_PRODUCTS`)에는 넣지 않는다 — 상담 1건 접근이지 콘텐츠 영구 해금이 아니다.

## 접근 무결성 (2026-10-16)

운명 찻집 상담도 [결제 플로우 문서](docs/payment-policy-flow.md)의 "유료 접근 무결성 원칙"을 따른다. 결제 증빙 1건은 상담 1건(claim 주인 `fortune-tea-house:<attemptId>`)에만 쓰이고, 이용권은 이번 요청에서 실제로 차감된 경우에만 상담을 연다. 최종 생성 실패 시 이용권 차감은 `refundPassCoverage`로 되돌린다.
