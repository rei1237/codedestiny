# 02. 해외카드 구현 — 서버 판정·주문 스냅숏·결제창 파라미터

현재 상태: 1단계 C3~C5 로 서버 판정, 주문 스냅숏, 판정이 열린 주문에만 결제창 파라미터를 싣는 장치를 구현했다. `FOREIGN_CARD_ENABLED` 는 운영·스테이징 모두 미설정(꺼짐)이다. KG이니시스 해외카드 특약은 처리중(미승인)이라 해외 발급 카드 결제는 열려 있지 않다. 완료 보고가 아니다.

- 측정일: 2026-09-17. §8 판정은 2026-09-18 2단계(결제창 정책 링크) 반영. 심볼 이름을 정본으로 적고 `파일:줄` 은 워크트리 기준 참고값이다.
- 관련 문서: [01 결제 구조](01-current-payment-architecture.md) · [03 상품 범위](03-overseas-card-product-scope.md) · [05 이행·증빙](05-fulfillment-and-evidence.md) · [08 테스트 결과](08-test-results.md) · [09 신청 사실](09-inicis-application-facts.md)

## 1. 원칙과 강제선

- 서버가 판정하고 클라이언트는 전달만 한다. 모든 기본값은 닫힘이다.
- 강제선은 세 겹이다.
  1. 주문 생성·prepare·confirm 은 전부 JWT 필수다. 게스트 주문 경로가 없다(C2 테스트로 고정, [04](04-customer-authentication.md)).
  2. 서버 판정이 열린 주문에만 해외카드 결제창 파라미터를 보낸다(C3~C5).
  3. 실제 해외 발급 카드 승인은 PG 특약이 정한다. 특약 전에는 파라미터가 가도 승인을 보장하지 않는다.
- 승인 전 문구: 비한국어 결제창 고지는 "해외 발급 카드 결제는 준비 중이며 아직 보장되지 않는다"만 말한다(C1). 카드 브랜드명(VISA·Mastercard·JCB·Diners)을 적으면 가드가 실패한다(`scripts/verify-overseas-payment-notice.mjs`).

## 2. 판정 모듈

`worker/payments/foreign-card-policy.js` (I/O 없음 — prepare 의 Mongo 왕복을 늘리지 않는다)

| 심볼 | 내용 |
|---|---|
| `FOREIGN_CARD_POLICY_VERSION` | `"2026-09-17-v1"` — 판정 결과·주문 스냅숏에 함께 남는다 |
| `FOREIGN_CARD_PRODUCT_POLICY` | `digital_content`·`membership_pass`·`membership_pass_gift` 만 `true`. 한 줄을 `false` 로 바꾸면 그 유형만 꺼진다(D3) |
| `isForeignCardFlagEnabled(env)` | `String(env?.FOREIGN_CARD_ENABLED ?? "") === "1"` — `GIFTS_ENABLED` 와 같은 문자열 강제 비교. 미설정·`"0"`·`"true"`·`" 1"` 은 꺼짐 |
| `canUseForeignCard(input, { env })` | `{ offered, reason, policyVersion }` 을 돌려준다(아래 순서) |
| `narrowToOrderSnapshot(fresh, snapshot)` | 지금 판정과 주문 스냅숏이 **둘 다** 열려야 열림 |
| `toForeignCardSnapshot(decision, now)` | 주문 문서에 한 번 박는 `{ offered, reason, policyVersion, decidedAt }` |

판정 순서 (먼저 걸린 사유로 닫힌다)

| 순서 | 사유 | 조건 |
|---|---|---|
| 1 | `FLAG_OFF` | 플래그가 문자열 `"1"` 이 아니다 |
| 2 | `AUTH_REQUIRED` | `user.id` 가 없다 |
| 3 | `PRODUCT_NOT_ELIGIBLE` | 표에 없는 유형(`Object.hasOwn` 조회라 `constructor`·`__proto__` 도 불가), 또는 이용권·선물인데 `durationDays !== 30` |
| 4 | `CHANNEL_NOT_SUPPORTED` | 결제 채널(trim·소문자)이 `card_general` 이 아니다 — 카카오페이·계좌이체·상품권 제외 |
| 5 | `ELIGIBLE` | 위를 모두 통과 |
| — | `ORDER_SNAPSHOT_CLOSED` | 지금은 열렸지만 주문 스냅숏이 닫혀 있다(`narrowToOrderSnapshot`) |

- `billingCountry` 는 인자로 받지만 판정에 쓰지 않는다. 카드 발급국은 결제 전에 알 수 없고, IP·locale·이름으로 추정하지 않는다. 호출부는 `null` 을 넘긴다.
- 국적·내국인 여부로 가르지 않는다. 판정은 "이 주문에 해외카드 결제창을 **보여도 되는가**"의 상한이다.

## 3. 서버 연결 (C4)

| 경로 | 판정 입력 | 저장·응답 |
|---|---|---|
| 단건 `POST /api/payments/prepare`(`/api/billing/checkout` 재작성 포함) | `product.type: "digital_content"`, `paymentChannel` = 요청의 결제수단 | `createPayableOrder({…, foreignCard})` → 주문 `foreignCard` 스냅숏. 응답 `toLegacyPrepareOrder` 의 `order.foreignCard = narrowToOrderSnapshot(지금 판정, 주문 스냅숏)` |
| 이용권·선물 `handlePassPrepare` | SELF = `plan.productType`, GIFT = `membership_pass_gift`, `durationDays` | `createPayablePassOrder({…, foreignCard})` → 스냅숏. 응답 `order.foreignCard` 도 좁힌 판정 |
| V2 `POST /orders` | 판정하지 않음 | 스냅숏 `null`(닫힘). 이 응답으로 결제창을 여는 호출부는 없다 |

- 응답 키 `foreignCard` 는 `{ offered: offered === true, reason, policyVersion }` 뿐이다(`worker/payments/compat.js` `toLegacyPrepareOrder`).
- 요청 본문의 `foreignCard`·`bypass`·`offered` 는 읽지 않는다(C4 테스트: 위조 무시).
- 스냅숏 규칙: 닫힌 채 만든 주문은 나중에 플래그를 켜도 `ORDER_SNAPSHOT_CLOSED` 로 닫혀 있고, 열린 주문도 플래그를 내리면 즉시 `FLAG_OFF` 로 닫힌다.
- `orderId` 도출(`deriveOrderId`) 입력은 바뀌지 않았다 — 같은 멱등키 재호출은 같은 주문이다.
- env 계약: `config/env.contract.json` 에 `FOREIGN_CARD_ENABLED`(server, secret 아님, targets worker)를 선언했다. wrangler toml `[vars]` 에는 올리지 않았다 — 운영 바인딩 0자리, 기본 꺼짐 유지(`docs/DEPLOYMENT_AND_INFRA.md`).

## 4. 클라이언트 전달 (C5)

- `js/core/checkout-entry.js` `portoneBypass(decision)` 은 `decision.offered === true` 일 때만 `{ inicis_v2: { P_RESERVED: ["global_visa3d=Y"] } }` 를 돌려준다. 무인자·`null`·`{}`·`{offered:"true"}`·`{offered:1}` 은 `undefined` → 파라미터를 보내지 않는다.
- 호출부별 상태

| 호출부 | 넘기는 값 | 결과 |
|---|---|---|
| 정적 셸 `index.html` `_cdRunDirectKrwCheckout`(동결 region) | `_cdPortoneBypass(order && order.foreignCard)` | 서버 판정을 따른다 |
| 이용권·선물 `app/points/PointsClient.tsx` | `checkoutEntry.portoneBypass(order.foreignCard)` | 서버 판정을 따른다 |
| App Router 유료 공용 dp 코어 `js/destiny-profile.js` | `_dpPortoneBypass()` 무인자 | **항상 닫힘** — 플래그를 켜도 이 경로의 결제창엔 파라미터가 가지 않는다 |
| `lib/payment/portone.ts` | 무인자 | 임포터 0(가드 정본 파일, 런타임 경로 아님) → 닫힘 |

- dp 를 무인자로 남긴 이유: dp 를 고치면 `verify:payment-choice-parity` 가 독립 페이지 캐시 핀 회전을 요구하고, 그 핀은 통파일 동결 `app/_lib/billing-client.ts` 에 있다. 1단계의 동결 변경 허용 범위(`_cdRunDirectKrwCheckout` sha 1줄 + `billing.js` 상한 1줄)를 넘으므로 플래그 ON 준비 작업으로 넘겼다(아래 §7).
- 카카오페이 등 채널키 결제는 호출식이 `channelKeyName ? null : …` 이라 판정과 무관하게 파라미터가 붙지 않는다.
- `checkout-entry.js?v=` 캐시 핀을 새 코어 값으로 돌렸다. 구 코어가 캐시에 남으면 인자를 무시하고 항상 파라미터를 붙이기 때문이다.

## 5. 한계 (서버가 막을 수 없는 것)

| 한계 | 설명 | 대응 |
|---|---|---|
| 조작된 클라이언트 | 브라우저에서 SDK 호출에 `bypass` 를 직접 붙이는 것은 서버가 사전에 막을 수 없다 | 확정 시 재조회로 금액·KRW·paymentId·storeId(있을 때) 대조는 그대로 적용된다. 해외카드 승인 자체는 PG 특약 범위가 결정한다 |
| 발급국 판별 불가 | PortOne V2 `Card` 에 해외 발급 전용 필드가 없다(publisher·issuer·brand·type·ownerType·bin·number 뿐, 국내 발급 VISA 도 brand=VISA) | 결제 후 해외카드 여부를 확정하지 않는다. **추정 기반 자동 취소는 하지 않는다** |
| 결제수단은 클라이언트 신고값 | `paymentChannel` 은 요청의 결제수단이다 | 판정은 "보내도 되는 상한"이고 클라이언트 `channelKeyName` 게이트와 AND 다. 같은 멱등키로 수단을 바꿔 재호출하면 스냅숏·현재 판정 중 하나가 어긋나 닫힌다 |
| 앱(Capacitor) 구분 없음 | 판정에 앱 결제 경로 구분이 없다(선물은 `X-CD-App` 헤더로 차단 — `worker/payments/gifts.js`) | 플래그 ON 선결 조건 |
| V2 레이트리밋 없음 | prepare·confirm 반복 실패 탐지·레이트리밋이 없다 | NOT READY, 플래그 ON 선결 조건 |

## 6. `market-policy-registry` 와의 관계

- `lib/market-policy/market-policy-registry.js` `canUseMarketForLivePayment` 는 호출자가 없다(2026-09-17 `git grep canUseMarketForLivePayment` 전 레포: 정의 1곳 + 인수인계 문서 언급 1곳).
- 1단계 판정은 이 레지스트리에 연결하지 않았다. 레지스트리는 "시장(국가) 단위 라이브 결제 가능 여부", 해외카드 판정은 "주문 단위 결제창 노출 상한"으로 축이 다르다. 연결 여부는 플래그 ON 준비 때 결정한다.
- `docs/PAYMENT_AND_ACCESS.md` "International payment market gate" 절의 원칙(IP·locale 로 결제국을 정하지 않음)과 판정의 `billingCountry` 미사용은 일치한다.

## 7. 플래그 ON 선결 조건 (체크리스트)

순서대로. 하나라도 비면 `FOREIGN_CARD_ENABLED` 를 켜지 않는다.

1. [ ] KG이니시스 해외카드 특약 승인 확인(승인 범위: 브랜드·결제창 방식·3DS) — PG APPROVAL REQUIRED
2. [ ] 운영 워커 텍스트 바인딩 1자리 확보(한도 128 도달 기록, `scripts/verify-worker-config-parity.mjs`)
3. [ ] 승인 범위 기준으로 결제창 고지 문구 재작성 + C1 브랜드명 부재 가드 의도적 해제
4. [ ] dp 핀 회전(동결 절차) 후 `js/destiny-profile.js` 가 `order.foreignCard` 를 넘기게 변경
5. [ ] 국내 휴대폰 필수 해소 — PG 구매자 전화 필드 요건 확인 후 별도 RED 변경([04](04-customer-authentication.md))
6. [ ] vedic·ziwei 생성 실패 환불·알림([05](05-fulfillment-and-evidence.md))
7. [ ] D4 알림 채널 운영 설정 확인(`ADMIN_FEEDBACK_EMAIL`·`FEEDBACK_DISCORD_WEBHOOK_URL`·`FEEDBACK_SLACK_WEBHOOK_URL` 중 1개 이상, [06](06-customer-support-and-incident-response.md))
8. [ ] V2 prepare·confirm 레이트리밋 결정
9. [ ] 앱(Capacitor) 결제 경로에서 판정·파라미터 동작 확인
10. [ ] 스테이징 확인(결제 완료 금지) 후 운영 반영 1회 승인

## 8. 판정

| 항목 | 상태 |
|---|---|
| 서버 판정 모듈·env 계약(기본 꺼짐) | READY |
| 주문 스냅숏·prepare 응답 전달 | READY |
| 판정 없으면 파라미터 미전송(정적 셸·/points) | READY |
| 결제창 하단 정책 링크(이용약관·환불·개인정보·결제 문의, 화면 언어별 URL) | READY(2026-09-18 2단계, 렌더러 3종 공유 빌더 + sitemap 대조 가드) |
| 서버측 환불 동의 기록 — 이용권 레일 | READY(2026-09-18). 주문 문서 `refundConsent`. 🔴 동의가 없어도 **거절하지 않고** `null` 을 남긴다(구버전 앱 보호, phoneConsent 와 같은 판단) |
| 결제창 환불 동의 체크박스·서버측 동의 기록 — 단건 레일 | NOT READY([05](05-fulfillment-and-evidence.md) §4, 2단계 잔여). 체크박스가 없어 기록할 값 자체가 없다 |
| dp 코어 경로 판정 전달 | NOT READY(항상 닫힘, §7-4) |
| 조작된 클라이언트 사전 차단·발급국 사후 판별 | NOT READY(구조상 불가, §5) |
| 앱 경로 구분·V2 레이트리밋 | NOT READY |
| 해외카드 특약 승인 | NOT READY(처리중) |

**최종 판정: PG APPROVAL REQUIRED** — 코드는 닫힌 상태로 준비됐고, 여는 순서는 §7 이다. 승인 전에는 플래그를 켜지 않는다.
