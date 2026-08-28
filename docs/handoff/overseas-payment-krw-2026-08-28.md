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

### ② 서버가 `displayPrice` 를 ko-KR + "원" 으로 굳혀 보낸다 — **완료** (2026-08-28)

"쓰이지 않으면 서버에서 문자열을 만들지 말라"고 남겼지만, 전수 확인 결과 **실제로 쓰인다.**
그리고 서버에서 로케일을 반영할 수도 없다 — `/api/billing/features` 응답은 가격이 국가
불변이라 캐시되므로(§3 "국가별 캐시 오염") 로케일별 문자열을 만들면 캐시가 로케일마다
갈라진다. 그래서 **고칠 지점은 서버가 아니라 클라**였다.

실측한 경로 3개와 판정:
| 경로 | 판정 |
|---|---|
| `js/core/feature-pricing-store.js` (셸 타일 배지) | 🔴 서버 문자열이 이겼다 → **고침** |
| `app/_lib/billing-client.ts:2273` | 🔴 서버 문자열이 이겼다 → **고침** |
| `app/hooks/useServerPrice.ts` (React) | ✅ 이미 정상 — 빌드 타임 `FEATURE_KEY_PRICE_TABLE` 은 `displayPrice` 를 **안 갖는다**(실측 130키 중 0건)라 로케일 인식 `formatRegistryAmount` 로 떨어진다 |

고친 방식은 **기존 정본 재사용**이다(원칙 6 — 새 포맷터를 만들지 않았다):
`js/core/checkout-entry.js` `formatKrwAmount()` 가 `displayLocale()` 자릿수 +
`payment.currency.krw` 사전(12로케일 전부 보유, 실측)으로 이미 그리고 있었다.
`seedFromMarkup` 이 checkout-entry 부착 전에 돌 수 있어 store 시점 포맷만으로는 부족하다 —
**읽기 지점(`get`/`getOrLoad`)에서도 다시 그린다.** 모듈이 없으면 종전 한국어 표기로 물러난다.

- 한국어 화면 표기는 종전과 완전히 같다. 금액·통화·결제 요청은 안 건드렸다(표시 전용).
- 테스트: `__tests__/billing/feature-pricing-store-locale.test.js` 6건.
  음성 테스트로 **수정 전 코드에서 4건이 실제로 실패**함을 확인했다(ko·폴백 2건은 불변이라 통과).

🔴 **남은 같은 모양 1건 — `worker/routes/app-store.js:365`**
```js
displayPrice: `${pass.amountKRW.toLocaleString("ko-KR")}원`,
```
`buildPassPricingShape` 가 앱 이용권(`app-pass-<tier>`)에 같은 ko-KR 문자열을 굳힌다.
**선행 조건이었던 "실제로 어디에 렌더되는지"를 2026-08-28 에 실측했다 → 렌더되는 곳이 없다.**

검색 범위: `git grep displayPrice` 전수(추적 파일 전부, `public/` 미러 포함) = 15개 파일.
그중 이 응답(`/api/app-store/*`)을 읽는 클라이언트는 0곳이다.
- `app/app/store/AppPassStoreClient.tsx` 는 서버 `displayPrice` 를 **안 읽는다** — 금액을
  `coverageKRW`/`monthlyCapKRW` 로 자기가 그린다(`:44,46`)
- `scripts/app-payment-guard.js` · `scripts/app-native-bridge.js` 에 `pricing` 참조 0건
- 나머지 `displayPrice` 소비자(`js/core/feature-pricing-store.js` · `app/_lib/billing-client.ts` ·
  `app/hooks/useServerPrice.ts` · `index.html` 5곳)는 전부 `/api/billing/features` 계통이라
  이번에 이미 로케일 인식으로 바뀌었다

**그래서 그대로 둔다.** 화면에 안 나오므로 로케일 결함이 아니고, 반대로 응답 필드를 지우면
레포 밖에 있는 **네이티브 앱 배포본**이 읽고 있을 가능성을 확인할 수 없다(원칙 9 — "임포터 0"은
죽었다는 증거가 아니다). 앱 상점은 Play SKU 가 통화를 따로 지역화하는 별개 표면이기도 하다
(관련 메모 `new-price-point-needs-play-sku-in-three-places`).

### ③ PG 결제창 중국어(ZH_CN) — **보류 확정** (2026-08-28 근거 재조사 완료)

`js/core/checkout-entry.js:245-254` `pgWindowLocale()` 이 `KO_KR`/`EN_US` 둘만 낸다. 그대로 둔다.
**문서를 다시 읽는 방식으로는 열 수 없음이 확인됐다** — 아래가 그 재조사 결과다.

| 확인한 것 | 결과 |
|---|---|
| 인수인계의 전제 | **맞다.** 다만 **렌더된 공개 문서에서는 이 표가 사라졌고**(SDK `payment-request` 는 "PG마다 지원하는 언어 목록은 차이가 있습니다"만 말한다), 인용 가능한 출처는 문서 저장소 원본 하나뿐이다 — `portone-io/developers.portone.io` 의 `opi/ko/integration/pg/v2/inicis-v2.mdx`: "PC 결제의 경우 `KO_KR`, `EN_US`, `ZH_CN`을 지원하며, 모바일 결제의 경우 `KO_KR`, `EN_US`만을 지원합니다" |
| 모바일에 ZH_CN 을 보내면? | **여전히 미문서.** 🔴 다만 같은 문서의 가장 가까운 사례(모바일 빌링키 발급)는 "해당 파라미터를 지원하지 않고 **항상 한국어로 노출**됩니다" 라고 말한다 → 결제창도 같다면 zh-CN 모바일 사용자는 **지금의 영어 대신 한국어**를 본다. 개선 실패가 아니라 **회귀**다 |
| PG 의 PC/모바일 판정 기준 | 🔴 **어느 문서에도 없다.** 남은 경로는 `cdn.portone.io/v2/browser-sdk.js`(버전 없는 URL) 역공학뿐인데, 언제든 바뀌는 번들에 우리 판정을 묶는 것은 근거가 아니라 숨은 결합이다 |

**재개 조건은 실결제 1회 관찰 하나다**(🔴 사용자 허락 필요 — 규칙 2 급). 그 전까지 뒤집지 말 것.

근거는 가드 `scripts/verify-portone-single-payment-regression.mjs` 의 `PG_WINDOW_LOCALES` 머리주석에
날짜·출처·인용문과 함께 남겼다. 🔴 **정본 `js/core/checkout-entry.js` 는 일부러 안 건드렸다** —
주석 한 줄에도 core 캐시 핀이 22곳 돌아 90파일 diff 가 된다(§5-1).

### ④ i18n 사전에 구워진 가격 문자열 — **완료** (2026-08-28, 드리프트 가드로 해결)

🔴 **이 항목의 두 차례 수치는 둘 다 틀렸다.** "~500건" 도 "약 1,875건 / 80 네임스페이스" 도
느슨한 정규식의 오탐이었다 — `원\b` 가 `원국`·`지원` 같은 운세 본문을, 3자리 구분 숫자가
연도·개수를 함께 셌다. **실측 정정: 113키 / 35 네임스페이스 / 12벌 합계 1,254 문자열.**
그중 셸이 참조하는 것은 69키이고, 셸 마크업 텍스트가 금액을 담은 것은 **23키**다.

🔴 **그리고 원안(`{amount}` 보간 전환)의 전제가 성립하지 않았다 — 런타임 금액 주입 통로가
아예 없다.** 유일한 후보 `_applyRegistryPricingToTiles`(`index.html`)는
`cd:feature-pricing-loaded` 를 듣는데 그 이벤트는 **리포 어디서도 발화되지 않는다**
(검색 범위: `git grep feature-pricing-loaded` 전수 + 셸·`js/` 의 `dispatchEvent(new *Event(`
리터럴 전수 — 전부 문자열 리터럴이고 그 이름은 없다). 보간으로 가려면 통로부터 새로 만들어야
하고, 정적 금액을 런타임 조회로 바꾸면 홈 첫 페인트에 금액이 비어 CLS·체감성능 회귀가 따라온다.

**그래서 레버를 바꿨다.** ④의 실제 위험은 "가격이 바뀌면 12벌이 조용히 어긋나는 것"이므로
보간이 아니라 fail-closed 드리프트 가드로 막는다 — `scripts/verify-i18n-price-drift.mjs`
(`npm run verify:i18n-price-drift`, `run-paid-gate-suite` 배선 완료).

| 검사 | 내용 |
|---|---|
| ① | 키별로 로케일 간 금액 집합이 같다 (ko 의 `3만원`·`5천원` 표기는 숫자로 정규화) |
| ② | 키를 가진 로케일에서 금액만 사라지지 않았다 (ko 에 **없는** 키는 드리프트가 아니다 — cdTranslate 가 ko 에서 사전을 건너뛴다) |
| ③ | 셸 마크업(`data-cd-trans`) 금액 == 사전 금액 |
| ④ | `PASS_MONTHLY_WON` 네 값이 사전에 실제로 나타난다 |
| 바닥 | 합집합 100키 **+ 로케일별 85키** (합집합만 두면 한 벌을 통째로 비워도 나머지가 수를 채워 통과한다) |

③ 이 사슬의 핵심이다 — 셸 리터럴은 `__tests__/worker/payments.subscription-purchase.test.js`
가 이미 `lib/payment/pass-pricing.js` 와 대조하므로, 사전이 그 사슬로 코드 정본에 묶인다.

**가드가 즉시 찾아낸 실제 결함 19건 (전부 수정)**
- 🔴 **vi 14건이 원화를 베트남 동으로 적고 있었다** — `30.000đ` 13건 + `20.000 VNĐ` 1건.
  30,000원을 약 1,600원이라 말한 셈이다. 그중 **3건은 화면에 살아 있다**
  (`featurePreview.paywall.ziweiConsultDesc` · `shell.lifebookTileInner...n30000` ·
  `shell.lovebibleTileCoinGroup...n30000`). 나머지 11건은 구세대 고아 키다.
- 타일 alt 3건(`home.tiles.{westernAstrology,ziweiBasic,vedicAstrology}Alt`) — ko 정본이
  개정되며 가격 문구가 빠졌는데 11벌이 옛 번역을 들고 있었다. 가격은 바로 옆 `...Desc` 키가
  12벌 전부 말하므로 화면에서 잃는 정보는 없다.
- `premiumPdf.lifeBook.badgePrice`(hi) — 통화 기호를 잃고 `पीढ़ी`(세대)로 오역돼 있었다.

hi 의 `वॉन`(won 음차)은 **정당한 원 표기**라 단위 목록에 넣었다. 오표기가 아니다.

음성 테스트 6건으로 가드가 무는 것을 확인했다(로케일 단독 변경 · 금액 삭제 · 다른 통화 ·
셸만 변경 · 정본만 변경 · 한 벌 비우기).

**남은 것 — `premium.priceDisplay` (손대지 않음)**
사전 11벌에 서로 다른 **외화** 가격이 박혀 있다(en `From $39` · de `Ab 2,90€` ·
ja `¥3,900〜` · zh `¥28起` · hi `₹200 से शुरू` · ms `Dari RM10`). 금액도 통화도 제각각이라
번역 모델이 만들어 낸 값으로 보인다. **소비자 0건**(`git grep priceDisplay` 전수 — 걸리는 것은
`src/features/master-love-codex/` 의 CSS 모듈 클래스명뿐이고, `premium.` 조합 키 사용처도 0건)
이라 화면에는 안 나온다. ko 에는 이 키가 없다. 지우는 것이 맞아 보이지만 **키 삭제는 요청 범위
밖**이라 보고만 남긴다. 이 키는 가드의 KRW 검사에 걸리지 않는다 — 원화 금액이 아예 없어서
"금액 보유 키" 집합에 안 들어오기 때문이다.


### ⑤ `app/nakshatra/_lib/copy.ts` 의 환산 — **완료** (2026-08-28)

🔴 **이 항목의 수치 "66건" 은 틀렸다. 실측 정정: 가격 라벨 8키 × 12로케일 = 96 문자열이고,
그중 외화 환산을 가진 것은 88건이다**(ko 8건은 원화만 말한다). 그리고 **이 항목을 파는 도중
인수인계에 없던 live 결함을 찾았다.**

**🔴 결함 — 다샤 인생지도 가격이 12로케일 전부 틀렸다**

| 근거 | 값 |
|---|---|
| 실제 결제 | `app/nakshatra/dasha-map/DashaMapClient.tsx:129` `amountKRW: 10000` |
| 레지스트리 | `worker/lib/paid-feature-registry.js:361` `unlock.nakshatra_dasha_map` `cost: 100` (=10,000원) |
| 화면 라벨 | `dashaPriceLabel` — 12벌 전부 **15,000원** |
| 같은 상품 다른 화면 | `resultPaidProductDashaPrice` 는 10,000원 — 두 화면이 서로 다른 가격을 말했다 |

그 라벨은 결제 버튼 바로 위 `UnlockGate priceLabel`(`DashaMapClient.tsx:161`)이다. 출처는
로케일화가 아니라 그 이전 — `git show 9e6227854^:…DashaMapClient.tsx:172` 에
`priceLabel="15,000원 · 1회 해금"` 이 `amountKRW: 10000` 과 나란히 있었다(PR #228).
**화면 금액 ≠ 승인 금액**이라 §0 의 PG 심사 리스크에 정면으로 걸린다.

**환산 88건도 정본과 달랐다.** 정본은 유효숫자 2자리로 잘라 확정가로 안 보이게 하는데
(`$22`), 여기 값은 4자리였다(`$22.20`). 정본 함수를 로케일별로 실제 호출해 대조한 결과
zh-CN 4건·ms 3건·ja 1건만 우연히 일치하고 **76건이 어긋나 있었다.**

| | en 30k | ja 30k | zh-TW 30k | vi 30k | hi 30k | EUR 30k | ms 30k |
|---|---|---|---|---|---|---|---|
| 종전 | $22.20 | ¥3,260 | NT$698 | ₫544.500 | ₹1,852 | 20,60 € | RM104 |
| 정정 | $22 | ¥3,300 | NT$700 | ₫540.000 | ₹1,900 | €21 | RM100 |

**설계 판단 — 정본을 안 건드렸다.** `js/core/checkout-entry.js` 를 고치면
`verify:payment-choice-parity` 의 **콘텐츠 유도 캐시 핀**이 정적 HTML 12개 + 미러에서 함께
돌아 90파일 diff 가 된다(PR #1242 실적). 표 하나 옮기자고 결제 런타임 핀을 돌리는 건 대가가
안 맞는다. 대신 **리터럴을 그대로 두고**(하이드레이션·CLS 위험 0) 가드가 정본을 `require` 해
`formatReferenceAmount` 를 로케일별로 실제 호출한 결과와 글자 단위로 대조한다 — ④와 같은
드리프트 가드 레버다. 환율표가 갱신되면 가드가 즉시 `copy.ts` 를 지목한다.

머리주석의 **중복 환율표는 걷어냈다** — 이제 정본 포인터만 있고, 가드가 사본 재등장
(`krwPerUnit` · `REFERENCE_FX_BY_LANG =`)을 막는다.

**가드 `scripts/verify-nakshatra-price-copy.mjs`** (`npm run verify:nakshatra-price-copy`,
`run-paid-gate-suite` + `paid-flow-gates` 트리거 `app/nakshatra/**` 배선 완료)

| 검사 | 내용 |
|---|---|
| ① | 라벨↔금액 바인딩을 **소스에서 발견** — 각 `*Client.tsx` 의 `amountKRW`(상수 경유 포함) + 결과 카탈로그의 `price: copy.X … href:` 짝 |
| ② | 라벨의 원화 숫자 == 그 화면이 실제로 청구하는 금액 (12로케일 전부) |
| ③ | 괄호 속 외화가 정본 **호출 결과**로 끝나고, 통화 기호 개수가 정본과 같다 |
| ④ | ko 에는 환산 괄호가 없다 |
| ⑤ | 🔴 미분류 금액 문구를 실패시킨다 — 가격 라벨 아닌 줄의 외화는 금지, 원화만 말하는 줄(`vvipGateNote` 등 33건)은 상품 금액 집합 안에 있어야 한다 |
| 바닥 | 라벨 8 · 로케일 12 · 키마다 12벌 · 단언 180 |

실측 통과: `8 price labels x 12 locales, 184 assertions, 33 KRW-only mentions checked`.
음성 테스트 **7/7** 확인(옛 15,000원 복원 · 옛 4자리 환산 복원 · 로케일 키 삭제 · 비가격 줄에
외화 부착 · 환율표 사본 · **클라이언트 amountKRW 변경** · 트리거 경로 제거).

**한계(의도적)**: ⑤의 원화 전용 줄은 "상품 금액 집합에 속한다" 까지만 본다. 지배성 리포트와
다샤 지도가 둘 다 10,000원인 동안에는 서로 바뀌어도 통과한다. 금액 자체가 바뀌면 잡힌다.

**남은 것 — 없음.** de/es/fr/nl 의 기호 위치가 `20,60 €` → `€21` 로 바뀌었다(정본이 항상
기호를 앞에 붙인다). 덜 관용적이지만 **몇 초 뒤 뜨는 결제창과 같은 표기**가 되므로 의도한
결과다. 되돌리려면 정본 `formatReferenceAmount` 를 고쳐야 하고 그러면 캐시 핀이 돈다.

### ⑥ Offer 미배선 페이지 — **완료** (2026-08-28)

**8 → 9.** `app/master-love-codex/page.tsx` 에 배선했다(`master-love-codex`, 20,000원).
"클라이언트에 결제 featureKey 가 없다"고 남겼던 것은 틀렸다 — 상수는 `app/` 이 아니라
`src/features/master-love-codex/constants.ts:4` 에 있다.

🔴 그 오독이 곧 **가드의 사각**이었다. `verify:paid-service-offer` 의 §3 대조가 페이지
디렉터리만 뒤져서, 상수를 feature 모듈에 두는 몰입형 페이지는 `declared` 가 비어
**대조가 조용히 건너뛰어졌다**(fail-open — Offer 의 featureKey 가 틀려도 아무도 못 잡는다).
가드가 `src/features/<이름>/constants.ts` 도 읽게 하고 그 경로를 `READ_PATHS` 에 넣어
트리거 커버리지를 스스로 강제하게 했다. **대조 페이지 7 → 9**(다른 페이지 사각도 함께 닫힘).
`MIN_WIRED_PAGES = 9` · `MIN_COMPARED = 8` 로 올렸다.
음성 테스트로 Offer 키를 다른 상품으로 바꾸면 파일명을 지목하며 실패함을 확인했다.

**의도적으로 배선하지 않은 나머지 4개** — 다시 열어보지 말 것:
- `app/oracle/rune/page.tsx` — **무료 페이지**다. 본문이 "둘 다 무료로 가볍게 시작할 수
  있습니다"라고 말한다. 유료 룬(`stonehenge-runes-*`)은 5개 티어라 단일 `Offer.price` 로
  표현할 수도 없다(그건 `AggregateOffer` 이며 지금 헬퍼의 범위 밖이다).
- `app/today/page.js` · `app/nakshatra/NakshatraLanding.jsx` · `app/components/SeoLandingTemplate.jsx`
  — 페이지 메타로만 구동되는 **SEO 허브/템플릿**이라 파는 단일 상품이 없다.
- 궁합판 `master-love-codex-compat`(30,000원)은 별도 결제라 한 Offer 에 두 가격을 안 섞는다.

### ⑦ Webhook 타임스탬프 허용오차 — **완료** (2026-08-28)

`worker/payments/webhook.js` 가 서명 검증 뒤에 `webhook-timestamp` 신선도를 본다
(`isWebhookTimestampStale`, 새 오류코드 `WEBHOOK_TIMESTAMP_STALE` = 401).
라이브 경로임을 확인했다 — `worker/index.js:1304-1317`·`:1338-1342` 가 두 진입
(`/api/webhooks/portone` 콘솔 Endpoint · `/api/payments/webhook`)을 모두 V2 로 보낸다.

🔴 **이 항목에서 가장 중요한 것은 허용치다. Standard Webhooks 참조구현의 5분을 쓰면 안 된다.**
PortOne 은 실패한 webhook 을 `0 → 1 → 4 → 16 → 64 → 256분` backoff(+jitter)로 최대 5회
재전송하므로 첫 발송에서 마지막 재전송까지 **약 5시간 41분**이다. 그리고 **재전송이 헤더
타임스탬프를 갱신하는지 첫 발송 값으로 고정하는지는 문서에 없다** — 문서가 "재시도에도 동일하게
유지된다"고 말하는 것은 **본문의 RFC 3339 `timestamp` 필드**이지 이 헤더가 아니다. 그 둘을 같은
것으로 읽고 5분을 잡으면 **모든 재전송이 401 로 거부**되고, 재전송은 이 레포에서 결제 확정의
유일한 복구 경로다(파일 머리주석). 그래서 `WEBHOOK_TIMESTAMP_MAX_AGE_MS = 24시간` — 지평의 네 배다.

설계 계약(깨면 안 되는 것):
- **서명 검증 뒤에 본다.** 순서를 뒤집으면 위조된 숫자를 판정하게 되어 아무것도 막지 못한다.
- **판정할 수 없는 값은 통과시킨다.** 이건 replay 방어의 *두 번째* 층이고, 첫 층인
  `{provider,eventId}` unique 는 TTL 이 없어 영구적이다(`worker/lib/models.js:541` — 실측,
  이 컬렉션에 `expireAfterSeconds` 인덱스가 없다). 반면 형식을 오독하면 대가가 **webhook 전량
  거부 = 결제 확정 정지**다. 그래서 미래 방향은 아예 보지 않고(포획된 요청의 타임스탬프는 언제나
  과거다) 초 단위가 아닌 값도 막지 않는다 — 밀리초 값이 오면 자연히 미래가 되어 통과한다.
  **단위 분기 코드를 새로 넣지 말 것.** 그게 이 설계가 분기 없이 사는 이유다.
- 오류코드를 `WEBHOOK_SIGNATURE_INVALID` 와 **나눴다.** 합치면 다음 사람이 시크릿·서명
  알고리즘을 뒤지게 되고 실제 원인(시각)은 영영 안 나온다.

🔴 **고정 타임스탬프 리터럴을 쓰는 테스트가 있으면 며칠 뒤 통째로 401 이 된다.** 실제로
`__tests__/worker/payments-v2.webhook-events.test.js` 의 `1786000000`(2026-08-06)이 그랬다 —
`Math.floor(Date.now()/1000)` 로 바꿨다. `acceptWebhook` 을 타는 하네스는 전부 그래야 한다.

테스트: `__tests__/worker/payments-v2.webhook.test.js` 의 "타임스탬프 신선도" describe 5건.
그중 하나가 재전송 지평(341분) 전체가 허용 범위 안임을 못 박아, 허용치를 5분으로 낮추면 실패한다.
음성 테스트: `acceptWebhook` 의 throw 를 `false &&` 로 죽이면 해당 케이스 1건이 실패함을 확인했다.

### ⑧ 셸 가격 배지 옆 한국어 라벨 — **완료** (2026-08-28, PR #1249)

타일 배지 금액은 ②에서 로케일 표기로 바뀌었지만 그 옆 라벨은 셸에 한국어로 박혀 있었다.
비한국어 화면에서 `전문가 상담 · 30,000 KRW` 처럼 절반만 번역된 채로 보였다.

🔴 **이 항목의 원래 서술은 틀렸다.** "`nav.aiConsult` 같은 기존 키는 12벌 어디에도 없다"고
적었지만 **`nav.aiConsult` 로 조회한 오독**이다. 실제 키는 `home.nav.aiConsult` 이고
**12로케일 전부 저작돼 있다**. `가격 확인 중`·`가격 확인 필요`도 마찬가지로
`preview.priceLoading`·`preview.priceUnknown` 이 12벌 전부에 있었고, 그 두 키는
React 쪽 `app/components/FeatureMarketingDetailModal.tsx:535-536` 이 **이미 쓰던 키**다
(셸만 리터럴로 박아 두 표면이 갈려 있었다). **신규 사전 저작은 0건이었다.**

→ 그래서 ④와 묶을 이유도 없었다. ④는 사전 저작 비용이 아니라 렌더 지점 구조 변경 비용이다.

고친 방식은 `index.html` 7곳(`:32795` `:32814` `:33206` `:33209` `:33566` `:33573` `:33632`)을
기존 `_pvwTr()` 경유로 바꾼 순수 치환이다. **폴백 인자의 한국어는 유지**해 `cdTranslate`
미로드 시 종전 표기로 물러나며, **한국어 화면 표기는 종전과 완전히 동일**하다.
가드는 새 스크립트를 만들지 않고 이 표면을 이미 갖고 있던
`__tests__/ui/mobile-pricing-source.static.test.js` 를 확장했다(원칙 6). 사전 파일 목록을
디스크에서 발견해 12개 미만이면 실패시킨다(fail-closed). 음성 테스트 확인 완료.

**잔여 3건 — 완료** (2026-08-28)

1. `_applyLifeBookAiPrice` **삭제**. 호출자 0(3면 grep: 정의 + `sync:public` 미러 6벌뿐,
   `__tests__/`·`scripts/verify-*` 0건).
2. `index.html:1475-1476` 의 배지 라벨 CSS **삭제**. 🔴 **인수인계가 적은 장애물은 사실이
   아니었다** — `_applyRegistryPricingToTiles` 는 `cd:feature-pricing-loaded` 가 발화되지
   않아 도달 불가라 배지를 덮어쓰지 않는다(④ 참조). 그래서 CSS 를 걷어내면 정적 마크업의
   `shell.tarotTile.tarotTileImgWrap.n300005` 번역이 그대로 살아난다. 기본 배지 폰트도
   `.7rem` 로 `::after` 와 같아 **한국어 표기는 종전과 동일**하다(구성상 동일 — 픽셀 실측은
   하지 않았다).
3. `상세 확인` · `_setCtaMeta` 한국어 3건을 `_pvwTr` 키로 배선. 신규 저작은
   `preview.priceDetailCheck` · `featurePreview.cta.pricingCheckingMeta` ·
   `featurePreview.cta.pricingMissing` 셋뿐이다.

🔴 **같은 표면에서 인수인계에 없던 결함을 하나 더 찾았다.** `featurePreview.cta.pricingChecking`
· `pricingFailed` · `pricingUnavailable` 은 셸이 **이미 `_pvwTr` 로 부르고 있었는데 사전 12벌
어디에도 없었다.** 누락 키는 폴백으로 물러나지 않고 `missingText` 를 그리므로
(`js/cd-lang-native.js` `resolveValue`) 비한국어 화면 11개에 "번역 준비 중" 이 뜨고 있었다.
함께 저작했다.

가드(`__tests__/ui/mobile-pricing-source.static.test.js`)는 이제 배선 키 목록을 손으로 적지
않고 **셸에서 `_pvwTr` 리터럴 키를 전수 발견해** 비-ko 사전 11벌과 대조한다(ko 는 cdTranslate
가 사전을 건너뛰므로 제외). 음성 테스트 4건 확인 완료.

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
6. 🔴 **`npm run lint` 는 `__tests__/` 를 안 본다** — `next lint` 범위가 `pages/ app/ components/ lib/ src/`
   뿐이라, 테스트 파일의 eslint 위반은 로컬 `lint` 초록불을 그대로 통과하고 PR CI 의
   `Lint changed files exactly as the release does`(`npm run lint:changed`)에서만 터진다.
   이번에 실제로 걸린 것: `__tests__/billing/checkout-entry.test.js` 의 로케일 세팅 헬퍼 이름이
   `useLocale` 이라 `react-hooks/rules-of-hooks` 가 **루프 안에서 부르는 React 훅**으로 읽었다
   (→ `setLocale` 로 개명해 해소). **테스트 헬퍼에 `use` 접두사를 쓰지 말 것.**
   재현: `node scripts/lint-changed-files.mjs --base=$(git merge-base origin/main HEAD)`

## 6. 검증 명령 (이 영역을 고쳤을 때)

```
npm run lint && npm run typecheck
npm run verify:overseas-payment-notice     # 신규
npm run verify:i18n-price-drift            # 신규 — 사전 12벌의 금액 드리프트(④)
npm run verify:nakshatra-price-copy         # 신규 — 나크샤트라 12로케일 가격 라벨(⑤)
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
