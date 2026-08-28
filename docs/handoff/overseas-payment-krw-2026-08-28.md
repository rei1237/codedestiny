# 해외 결제(이니시스 해외카드) — 2026-08-28 인수인계

> 이 문서만 읽고 이어서 시작할 수 있게 쓴다. PR #1242 에서 **1단계 + SEO Offer** 를 끝냈고,
> 아래는 남은 항목과 그 판단 근거다.

## 0. 가장 먼저 알아야 할 사실 — 통화 작업은 없다

**KG이니시스 해외카드결제 특약은 승인·정산이 모두 KRW 다.**
출처: [help.portone.io/content/inicis-international](https://help.portone.io/content/inicis-international) (2026-08-28 확인)

| 항목 | 값 |
|---|---|
| 지원 통화 | **KRW (승인/정산)** |
| 결제창 언어 | 한국어 · 영어 · 중국어 |
| 카드사 | VISA · MASTER · JCB · DINERS |
| 신청 | 기존 MID 에 `1.2.3 특약 서비스 추가 > 1. 해외 카드` — **별도 채널키 아님** |
| 비실물 콘텐츠 | PG사 심사(협의) 후 가능 — 자동 승인 아님 |
| 계약 주체 | 국내 사업자만 |

🔴 **그래서 USD/GBP/EUR 다통화 Price Book 을 만들면 안 된다.** 화면 금액 ≠ 승인 금액이 되어
PG 심사 탈락 사유이고, 환율이 움직일 때마다 판매가가 바뀌는 가격 정책이 되어 버린다.
다통화가 실제로 필요해지는 건 **일본결제(JPY) 계약**뿐이며, 그건 별도 계약이다(§7).

관련 메모: `inicis-overseas-card-is-krw`

## 1. 이번에 끝낸 것 (PR #1242)

| 층 | 파일 | 내용 |
|---|---|---|
| 정본 | `js/core/checkout-entry.js` | `REFERENCE_FX_BY_LANG`(11통화, 2026-08) · `REFERENCE_FX_AS_OF` · `formatReferenceAmount()` · `buildOverseasChargeNoticeHtml()` |
| 타입 | `js/core/checkout-entry.d.ts` | 위 3개 시그니처 |
| 결제창 3종 | `index.html` `_cdChooseServicePaymentMode` · `app/_lib/billing-client.ts` `openReactPaymentChoiceModalInner` · `js/destiny-profile.js` `_dpRenderStandalonePaymentChoice` | `overseasNoticeHtml` 을 legal 문단 앞에 삽입 |
| 이용권 상점 2종 | `app/points/PointsClient.tsx` `useOverseasCharge()` · `index.html` `overseasStoreNoticeHtml` | 플랜 카드 개산가 + 섹션 하단 고지 |
| 사전 | `public/i18n/*.json` 12벌 | `payment.overseas.{approx,chargedInKrw}` |
| SEO | `lib/seo/paid-offer.ts`(신규) · `lib/structured-data.ts` · 유료 페이지 8개 | `Offer` / `priceCurrency: "KRW"` |
| 가드 | `scripts/verify-overseas-payment-notice.mjs` · `scripts/verify-paid-service-offer.mjs` | 둘 다 fail-closed, `paid-flow-gates` 스위트 배선 완료 |
| 테스트 | `__tests__/billing/checkout-entry.test.js` | 해외카드 describe 9건 |

### 설계 계약 (깨면 안 되는 것)
- 🔴 **환산값은 표시 전용**이다. `totalAmount`·`paymentAmount`·`currency` 로 흘러가면
  `verify:overseas-payment-notice` 가 막는다. 실시간 환율 API 를 부르지 않는다.
- 🔴 **문구 정본은 공유 코어 하나**다. 렌더러가 카드 브랜드 문구를 직접 적으면 가드가 실패한다.
- 🔴 고지 노드에 `data-mode` 를 붙이지 않는다(세 렌더러가 "누르면 닫는" 노드로 처리).
- 🔴 기존 `.cd-direct-payment-legal` / `.golden-grain-modal__footer-copy` 스타일을 상속한다 —
  CSS 를 늘리면 `PAYMENT_CHOICE_CSS_RULES` 가 바뀌어 `verify:payment-choice-parity` 가 세 곳을
  다시 맞추라고 요구한다.
- 한국어 화면에서는 전부 빈 문자열 → 기존 마크업과 완전히 동일.

### 실측값 (재현: 아래 §8)
| 금액(원) | en | ja | zh-CN | zh-TW | de | vi |
|---|---|---|---|---|---|---|
| 1,000 | $0.74 | ¥110 | ¥5.3 | NT$23 | €0,68 | ₫18.000 |
| 10,000 | $7.4 | ¥1,100 | ¥53 | NT$230 | €6,8 | ₫180.000 |
| 30,000 | $22 | ¥3,300 | ¥160 | NT$700 | €21 | ₫540.000 |
| 149,000 | $110 | ¥16,000 | ¥790 | NT$3,500 | €100 | ₫2.700.000 |

개산가는 **유효숫자 2자리**다 — `$7.41` 처럼 확정가로 보이면 안 되기 때문.

## 2. 남은 항목 (우선순위 순)

### ① 폐지 재화 표현 정리 — **완료** (남은 것은 URL 경로명 하나)

포트원 위험업종 문서에 **'사주/운세'가 등재**돼 있고 "보통 '포인트 충전'으로 사이트를 구축해
충전 조건 제한을 받는다"고 명시돼 있어, **'충전형 사이트'로 읽히는 것 자체가 PG 심사에 불리하다.**
2026-08-28 전수 점검 결과와 조치:

**고친 것 (2건)**
- `withdrawModal.warningPointsPrefix` **12로케일** — "보유 포인트 및 모든 데이터가" → "보유 이용권 및…"
  (각 로케일에 이미 확립된 이용권 표현을 씀: en `passes` · ja `利用券` · zh `通行券` · es `pases` · vi `Thẻ` …)
- `app/account/delete/page.js` — "앱에서는 **포인트 화면**의" → "**이용권 상점 화면**의"

**이미 정책과 맞아서 손대지 않은 것 (실측)**
- `/points` 화면 문구는 전부 **"연이의 달빛 이용권 상점"** — h1(`PointsClient.tsx:2363`) ·
  layout title 3로케일(`이용권 상점`/`Pass Store`/`利用券ストア`) · 주문내역 `결제·이용권 기록`
- `/app/store/` 앱 상점 화면에 충전·포인트·코인 문구 **0건**
- 남아 있는 "충전" 문구는 전부 **부정문**(`월정석은 구매·충전할 수 없습니다` — PointsClient 5건 ·
  `lib/legal/refund-policy-rows.js` · `lib/i18n/siteFooterHubCopy.ts`). 정책을 못박는 문구라 **유지가 맞다.**
- ko.json 의 나머지 충전/포인트 23건은 **운세 본문**(`용신 충전` · `핵심 포인트`)이라 결제 무관
- `index.html`·`js/destiny-profile.js`·`worker/routes/payments.js` 의 "충전"은 **코드 주석**이며,
  실제 함수명 `__cdOpenChargeModal` 을 가리킨다 — 주석만 고치면 코드와 어긋나므로 두었다

**재발 방지 가드 추가**
`__tests__/worker/legacy-coin-disabled.static.test.js` 에 사용자 문구 검사를 넣었다.
기존 검사는 `forceDeduct`·`paymentMode:"COIN"`·pig-coin 엔드포인트 같은 **코드 플래그만** 봐서
화면에 "포인트 충전"이라 써 놓아도 통과했다. 금지 패턴은 `보유 (포인트|코인)` ·
`(포인트|코인)(을|를)? ?충전` · `(포인트|코인) ?구매` · `(포인트|코인) ?잔액` 이며,
운세 본문과 위 부정문은 걸리지 않는다. fail-closed(스캔 500개 미만이면 실패).
음성 테스트: ko.json 을 옛 문구로 되돌리면 파일명을 지목하며 실패함을 확인.

**남은 것 — URL 경로명 `/points`**
화면 문구는 다 고쳤지만 **경로명만 레거시**다. 바꾸려면 함께 봐야 할 곳:
- `scripts/app-payment-guard.js` 가 `/points` **앵커 클릭을 가로채** `/app/store/` 로 보낸다
  (🔴 앱 번들에 `/points` 가 없어 프로그래매틱 이동은 빈 화면이 된다)
- `js/core/checkout-entry.js` `buildPassStoreUrl()` · 결제창 인계 `/points?plan=…&cdco=1`
- `docs/context/payment-gating.md` · verify 스크립트 · 테스트의 문자열
- 리다이렉트를 남기지 않으면 기존 링크·북마크가 죽는다
경로 변경은 **화면 문구가 이미 맞으므로 급하지 않다.** 심사에서 실제로 지적을 받으면 그때 하는 편이 낫다.

### ② 서버가 `displayPrice` 를 ko-KR + "원" 으로 굳혀 보낸다
`worker/lib/billing-feature-registry.js:156`
```js
displayPrice: `${resolvedAmountKRW.toLocaleString("ko-KR")}원`,
```
비한국어 사용자에게 한국식 표기가 그대로 나갈 수 있다. **어디서 실제로 렌더되는지 먼저
전수 확인**하고(미확인), 쓰이지 않으면 서버에서 문자열을 만들지 말고 `amountKRW` 만 내려
클라의 `formatKrwAmount()` 가 그리게 하는 편이 맞다.

### ③ PG 결제창 중국어(ZH_CN) — **근거 선행 필요**
`js/core/checkout-entry.js:245-254` `pgWindowLocale()` 이 `KO_KR`/`EN_US` 둘만 낸다.
공식 문서상 해외카드결제는 중국어를 지원하지만, **모바일 결제창은 ZH_CN 미지원**이고
지원 밖 값의 최악은 "결제창이 아예 안 뜬다"(PR #104 windowType 회귀와 같은 모양)다.

켜려면 먼저 필요한 것:
- 우리 UA 판정과 PG 의 PC/모바일 판정이 어긋나지 않는다는 근거
- 또는 실결제 1회 확인(🔴 사용자 허락 필요)

지금은 **의도적으로 보류**된 상태이며, 그 판단은 타당하다. 근거 없이 뒤집지 말 것.

### ④ i18n 사전에 구워진 가격 문자열 ~500건
`public/i18n/*.json` 12벌 + `i18n/authored/passShopPackages-01.json` 에 금액이 문자열로
박혀 있다(en 88건 · hi 78 · ms 76 · nl 63 · ko 55 …). 가격이 바뀌면 12벌을 손으로 고쳐야 한다.
예: `home.tiles.price10000 = "One time KRW 10,000"`, `payment.passShop.packages.*.desc`

해결 방향은 문구에서 금액을 빼고 `{amount}` 보간으로 돌리는 것인데, 12로케일 전수 수정이라
별도 PR 이어야 한다. 관련 메모: `new-shell-copy-costs-12-hand-written-locales`

### ⑤ `app/nakshatra/_lib/copy.ts` 의 환산 66건
`:5-7` 주석에 환율표가 있고 계산 결과가 66개 문자열에 손으로 박혀 있다. 이제 정본
(`checkout-entry.js` `REFERENCE_FX_BY_LANG`)이 생겼으므로 통합 가능하지만, 대규모 문자열
리팩터링이라 이번 범위에서 뺐다. **두 표의 환율값이 갈라지지 않게** 주의(현재는 같다).

### ⑥ Offer 미배선 페이지
`buildServiceJsonLd` 를 쓰는 12개 중 8개에 배선했다. 나머지:
- `app/master-love-codex/page.tsx` — 클라이언트에 결제 featureKey 가 **없다**(미확인: 무료인지 다른 기전인지)
- `app/oracle/rune/page.tsx` · `app/today/page.js` · `app/nakshatra/NakshatraLanding.jsx` · `app/components/SeoLandingTemplate.jsx`

`verify:paid-service-offer` 의 `MIN_WIRED_PAGES = 8` 을 함께 올릴 것.

### ⑦ Webhook 타임스탬프 허용오차 없음
`worker/payments/webhook.js` — `webhook-timestamp` 를 서명 입력으로만 쓰고 신선도 비교를
하지 않는다. replay 는 `{provider,eventId}` unique 가 막으므로 **실질 위험은 낮다**.
보고만 하고 손대지 않았다.

## 3. 손대면 안 되는 것 (이번에 확인 완료)

전수 확인 결과 아래는 **이미 정상**이다. "해외 결제 최적화"라는 이름으로 다시 뜯지 말 것.

| 항목 | 근거 |
|---|---|
| 서버 금액 결정권 | `worker/payments/index.js:785` 클라 금액은 대조만, `:874` confirm 은 클라 금액을 **읽지도 않는다** |
| 금액 변조 방지 | `worker/payments/pg.js:88,96,111,120` — paymentId·status·amount·currency 4중, 기대 금액은 DB `order.paymentAmount` |
| Webhook 중복 | `{provider,eventId}` unique + stale 2분 재점유 + **실패에 200 안 줌**(`webhook.js:19-23`) |
| 멱등성 | `deriveOrderId(userId, key)` 결정적 + 유니크 인덱스 14종 + 세대 사다리(`orders.js:264-330`) |
| 상태 머신 | 전이마다 단일문서 CAS, `markOrderFailed` 는 `status:"pending"` 정확 일치 → **PAID→FAILED 불가** |
| 가격 스냅샷 | `Payment.paymentAmount` — 가격표가 바뀌어도 기존 주문은 그대로 |
| 프론트 콜백 지급 | **경로 0건**. `POST /api/unlocks/confirm` 도 `access.js:583` 증빙 필수 |
| IP 기반 가격 | 안 쓴다. `detectLocale()` 은 `?lang=`→경로→`cd_lang`→`cd_locale`→ko |
| 국가별 캐시 오염 | 가격이 국가 불변이라 오염 대상 자체가 없다 |
| PortOne V1 잔재 | 실행 코드 0건(필드 별칭만) |

## 4. 하지 않기로 한 것과 근거

| 안 한 것 | 근거 |
|---|---|
| 다통화 Price Book | 계약이 KRW 단일 (§0) |
| `resolvePaymentChannel` 채널 추상화 | 특약은 기존 MID 추가 → 채널키 하나 |
| `User` 스키마 `country`/`currency` | 통화가 안 바뀌어 가격 결정에 국가 불필요 |
| `resolveCommerceMarket()` 배선 | 호출자 0인 채로 둔다. 시장이 실제로 열릴 때 |
| `worker/payments/pg.js` 통화 단언 완화 | KRW 가 정답인 상태. 가드가 고정한다 |
| `worker/routes/{payments,billing}.js` 수정 | freeze `growthCeilings` 여유가 **각 1줄** |

## 5. 이 작업에서 실제로 걸렸던 함정

1. **캐시 핀 2종이 산재** — `js/destiny-profile.js` 를 고치면 독립 정적 페이지 13곳 +
   `PAID_SERVICE_RUNTIME_SRC`(`app/_lib/billing-client.ts:453`) + 그걸 리터럴로 단언하는
   `scripts/verify-paid-gate-ui-regression.mjs:224` 를 함께 돌려야 한다.
   `js/core/checkout-entry.js` 를 고치면 **또 다른 핀**(core 런타임, `app/layout.js` 포함 22곳)이
   같이 돈다. `sync:public` 은 이 `?v=` 를 돌리지 않는다 — `verify:payment-choice-parity` 가 잡아 준다.
2. **sitemap 원장 300줄** — `app/layout.js`·`lib/structured-data.ts` 가 공유 소스라 의존 라우트
   서명이 함께 갱신된다. `npm run sitemap:generate` 후 같은 커밋에 담을 것.
3. **`checkoutText` 는 `globalThis.cdTranslate(key, vars, fallback)`** 를 본다 — `window` 가 아니다.
   테스트 하네스를 `window.cdTranslate` 로 만들면 전 로케일이 ko 폴백으로 떨어져
   "번역이 안 된다"는 오진이 난다(이번에 실제로 한 번 겪었다).
4. **CRLF 파일** — `app/_lib/billing-client.ts` · `app/points/PointsClient.tsx` ·
   `js/core/checkout-entry.d.ts` · `lib/structured-data.ts` 는 CRLF다. Edit/sed 로 건드리면
   전 파일 diff 로 부푼다. node 패치 스크립트 + 개행 개수 검산으로 갈 것.
5. **`.ignore` 개행 경고** — 내용 변경 0인데 Windows 에서 modified 로 뜬다. 스테이징하지 말 것.

## 6. 검증 명령 (이 영역을 고쳤을 때)

```
npm run lint && npm run typecheck
npm run verify:overseas-payment-notice     # 신규
npm run verify:paid-service-offer          # 신규
npm run verify:payment-choice-parity       # 3렌더러 + 캐시 핀
npm run verify:payment-copy-dictionary     # 폴백==ko.json · 12로케일
npm run verify:checkout-pass-card          # jsdom 실클릭
npm run verify:paid-gate-ui
npm run verify:portone-single-payment
npm run verify:payment-freeze              # 바뀌었으면 --update 를 같은 커밋에
npm run verify:public-parity
npm run verify:guard-wiring
npm run verify:sitemap-drift               # 실패하면 sitemap:generate
npm run test:node
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest
```

## 7. 일본결제(JPY) 를 열게 된다면

**여기서부터가 진짜 통화 작업이다.** 순서 주의:

1. 🔴 원천사 심사 선행조건이 **"일본어 사이트 + 일본 결제서비스 연동"** 이다 — 닭-달걀이므로
   순서를 계획에 반영할 것. 특정상거래법 표기는 이미 `app/ja/tokushoho/page.js` 에 있다.
2. 🔴 일본 편의점 결제는 **PG 가 환불하지 않는다**(가맹점 직접 처리) — 켜기 전에 환불 운영 절차 필요.
3. 코드 변경 지점(조사 완료, `docs/payment-execution-changes-needed.md` 와 동일):
   - `worker/payments/pg.js:120` KRW 단언 → 시장별 통화
   - `worker/lib/portone.js:259` `currency: "CURRENCY_KRW"` → 시장별
   - `lib/payment/portone.ts:86` `PORTONE_CURRENCY` 상수
   - `worker/payments/index.js:246` 구독 통화 검사
   - `worker/lib/paid-feature-registry.js` → 시장별 확정가 테이블(환율 자동환산 금지)
   - `lib/market-policy/market-policy-registry.js` JP `enabled: true` + `paymentProcessor` 확정
   - `scripts/verify-overseas-payment-notice.mjs` ⑤ 단언과 `lib/seo/paid-offer.ts` 의
     `OFFER_PRICE_CURRENCY` 를 함께 뒤집어야 한다(일부러 막아 뒀다)

## 8. 실측 재현

```bash
# 로케일별 개산가·고지 렌더 (하네스는 globalThis.cdTranslate 를 쓸 것)
node --input-type=module -e "
import { getBillingFeaturePricing } from './worker/lib/billing-feature-registry.js';
for (const k of ['vedic-ai-consultation','fusion-fortune-consultation'])
  console.log(k, getBillingFeaturePricing({featureKey:k}).pricing.amountKRW);
"
```
`__tests__/billing/checkout-entry.test.js` 의 "해외카드 결제 —" describe 가 위 표를 고정한다.

## 9. 남아있는 위험요소

1. **특약이 심사 중** — 승인 전에는 해외카드 탭이 실제로 뜨는지 검증 불가.
   코드는 승인되면 **추가 배포 없이** 동작한다(채널키가 그대로이므로).
2. **비실물 콘텐츠는 PG사 협의 후 승인** — 자동으로 켜지지 않는다. §2① 이 여기 걸린다.
3. **환산율 수기 갱신** — `REFERENCE_FX_AS_OF = "2026-08"` 이 낡아도 자동으로 알 수 없다.
   참고 표기라 결제에는 무영향이지만 주기적 갱신이 필요하다.
