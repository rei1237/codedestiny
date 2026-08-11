# 해외 결제 활성화 시 필요한 결제 실행 파일 변경 목록 (미구현 — 별도 승인 필요)

> 🔒 **이 문서는 목록 제시용이다. 여기 적힌 어떤 항목도 이번 배치에서 구현하지 않았다.**
> PortOne/Inicis 결제 실행 파일(`lib/payment/portone.ts`, `worker/lib/portone.js` 등)은
> 원 프롬프트의 절대 제약에 따라 별도 승인 게이트 없이는 직접 수정하지 않는다.
> 아래는 "만약 실제로 해외 통화 결제를 활성화한다면 무엇을 바꿔야 하는가"의 조사 결과다.

## 왜 지금은 손대지 않는가

- `lib/market-policy/market-policy-registry.js`의 모든 해외 시장이 `enabled: false`,
  `paymentProcessor: "UNCONFIRMED"`, `launchMode: "blocked-until-local-legal-tax-payment-review"`다.
  결제 실행 코드를 먼저 바꾸는 것은 이 정책의 순서(법률·세무·PG 검토 → 활성화)를 거꾸로 뒤집는 것이다.
- `docs/INTERNATIONAL_MARKET_LOCALIZATION.md`의 Launch Gate: PG사 확정, 정산 통화 지원, 세무 모드
  해결, 번역 검토 완료 등 어느 하나라도 미충족이면 실결제는 막혀야 한다.
- 결제 실행 코드는 실제 돈이 오가는 경로라 변경 자체가 결제/인증 critical 티어로 분류되어
  전체 회귀 검증(`deploy:critical`)이 강제된다(`CLAUDE.md` PR CI 티어 표).

## 변경이 필요한 지점 (조사 결과, Phase 0 진단 기반)

### 1. 통화 파라미터화

| 파일 | 현재 상태 | 필요한 변경 |
|---|---|---|
| `lib/payment/portone.ts` | `PORTONE_CURRENCY = "CURRENCY_KRW"` 상수 고정 | 시장별 통화를 `lib/market-policy/context.js`의 `createCommerceContext()`가 반환하는 `settlementCurrency`/`displayCurrency`에서 받아오도록 파라미터화 |
| `worker/lib/portone.js` | `getPortOnePublicConfig()`가 `currency: "CURRENCY_KRW"` 고정 반환 | 요청의 시장 코드에 따라 `market-policy-registry.js`의 `settlementCurrencies`를 조회해 응답 통화 결정 |
| `worker/lib/paid-feature-registry.js` | `amountKRW` 등 원화 전용 필드만 존재, `currency` 필드 없음 | 상품별로 시장별 가격 테이블(예: `amountByMarket: { KR: { currency: "KRW", amount }, JP: { currency: "JPY", amount } }`) 도입 필요 — 단순 환율 자동 환산이 아니라 **시장별로 별도 확정 가격**을 둬야 함(환율 변동 리스크를 서비스가 떠안지 않도록) |
| `lib/payment/coin-pricing.ts` | `formatKrwFromCoins()`가 ko는 "원", 그 외는 "KRW" 고정 표기 | 시장별 통화 포맷터로 교체 |

### 2. PG사/결제수단 확장

Phase 0 웹 조사 결과, PortOne은 자체 PG가 아니라 제휴 PG를 통해 해외결제를 중개한다:

- **일본**: KG이니시스(카드) 또는 엑심베이(JCB·PayPay·편의점결제)
- **중국**: KICC 또는 엑심베이(Alipay/WeChat Pay/UnionPay)
- **대만**: 나이스정보통신(UnionPay) — 편의점/ATM 결제의 PortOne 실지원 여부는 **미확인, PortOne 헬프센터 직접 문의 필요**
- **미국/기타**: PayPal(SPB, 판매자→해외구매자 방향만 가능), KG이니시스(북미)

각 채널은 PortOne 콘솔에서 별도 채널키 발급과 가맹점 계약이 필요하며, 이는 코드 변경이 아니라
**비즈니스/계약 트랙**이다. 코드 변경은 계약 완료 후 채널키를 `PORTONE_CHANNEL_KEY_{시장코드}` 형태로
env에 추가하고, `worker/lib/portone.js`의 `getPortOneConfig(env)`가 시장별로 올바른 채널키를 선택하도록
분기를 추가하는 정도다.

### 3. 정산 통화와 표시 통화 분리

`market-policy-registry.js`에 이미 `settlementCurrencies`(정산 통화)와 `displayCurrencies`(표시 통화)가
분리되어 정의되어 있다(현재는 시장별로 동일 값). 웹 조사 결과 PortOne 해외결제는 대부분 **정산은
원화**로 이뤄지는 구조이므로, 실제로는 "사용자에게는 현지 통화로 보여주고 결제받되, 회사 정산은
원화로 받는" 하이브리드 처리가 필요할 수 있다 — PortOne과의 계약 조건 확인이 선행되어야 한다.

### 4. 세무 처리

`taxMode: "{시장}_TAX_REVIEW_REQUIRED"`가 모든 해외 시장에 걸려 있다. 예를 들어 EU는 VAT MOSS/OSS
등록이 필요하고, 미국은 주별 판매세(Sales Tax) 규정이 상이하다. 이는 결제 실행 코드 변경 이전에
세무사·현지 법률 자문이 선행되어야 하는 영역이며, 코드는 그 결과를 반영하는 후속 작업이다.

### 5. Google Play Billing(Android)과의 정합성

`apps/mobile/android/.../CodeDestinyBillingPlugin.java`는 이미 Play가 내려주는 통화로 자동 청구되고
있어(Play 자체 다중통화 지원), 웹 결제만 통화 파라미터화하면 된다. 다만 웹과 앱의 동일 상품 가격이
시장별로 정합성을 유지하도록 `worker/lib/app-store-pricing.js`(현재 KRW 전용)와 위 §1의 신규 가격
테이블을 함께 관리해야 한다.

## 승인 필요 시 다음 단계

1. 어느 시장(JP/US/TW 등)부터 먼저 열지 결정
2. 해당 시장의 PortOne 제휴 PG 계약 체결(비즈니스 트랙)
3. 해당 시장 세무 자문 완료, `taxMode` 확정
4. `legal-market-packs.js`의 해당 시장 팩을 실제 원어민·법률 검토 후 `LEGAL_REVIEW_STATUS.LEGAL_APPROVED`로 갱신
5. 위 §1~3의 코드 변경을 **별도 승인 하에** 진행
6. `market-policy-registry.js`의 해당 시장 `enabled: true`, `paymentProcessor` 확정 값으로 전환
7. `verify:market-policy-registry`, `verify:billing-pass-policy` 등 결제 게이트 전체 재검증
