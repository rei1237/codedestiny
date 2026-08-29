# Play Console 수동 작업 체크리스트 — 2026-08-12 가격 티어 정비

> 🔴 **이 문서의 작업은 코드가 하지 않는다.** Play Console 인앱 상품 등록·가격 변경·판매 중단은 사람이 직접 한다.
> 코드가 관리하는 것은 SKU ID ↔ 코인가 매핑(`worker/lib/app-store-pricing.js`)뿐이다.
> 정본 값과 문구는 [docs/play-console-submission-values.md](../play-console-submission-values.md)를 그대로 쓴다.

## 요약

가격 포인트가 16종 → 7종으로 줄면서 **콘텐츠 SKU 13개 → 7개**가 됐다. 이용권 SKU 4개는 변동 없다.

| 구분 | 변경 전 | 변경 후 |
|---|---:|---:|
| 콘텐츠 티어 SKU | 13 | **7** |
| 이용권 SKU | 4 | 4 (변동 없음) |
| **합계** | 17 | **11** |

## 1. 판매 중단할 SKU (6개)

대응하는 코인가가 레지스트리에서 사라졌다. `CONTENT_TIER_TABLE`에서 이미 제거했으므로 **앱은 이 SKU를 더 이상 요청하지 않는다.**

| productId | 기존 앱가 | 기존 대응 코인가(웹가) | 어디로 갔나 |
|---|---:|---|---|
| `cd_content_tier_03` | ₩7,500 | 60코인 (₩6,000) | 애니멀 토템 심화 → T2 (`cd_content_tier_02`) |
| `cd_content_tier_04` | ₩8,900 | 70코인 (₩7,000) | 찻집 5카드·룬 5룬 → T3 (`cd_content_tier_06`) |
| `cd_content_tier_05` | ₩10,900 | 90코인 (₩9,000) | 최애운명 심층 프로필 → T3 |
| `cd_content_tier_07` | ₩15,000 | 120코인 (₩12,000) | 최애운명 테마·숙요 정밀 궁합 → T3 |
| `cd_content_tier_08` | ₩19,000 | 150코인 (₩15,000) | 자미두수 부부궁·다샤 인생지도 등 → T3 |
| `cd_content_tier_12` | ₩65,000 | 500코인 (₩50,000) | 인생 총운·마스터 궁합판·VVIP·운명의 업 → T5 (`cd_content_tier_10`) |

### 기존 구매자 영향

**없다.** 이 SKU들은 전부 **일회성 소비/해금 상품(`inapp`, `managedUser`)** 이며 구독이 아니다.

- 이미 구매한 사용자의 **영수증·엔타이틀먼트는 그대로 유효**하다. 해금 기록은 Play 가 아니라 우리 DB(`User.unlockedFeatures` / `ContentEntitlement`)에 있고, 그 판정은 `featureKey` 기준이라 SKU 폐기와 무관하다.
- 판매 중단(`status: inactive`)은 **신규 구매만** 막는다. 복원(restore)·재다운로드는 계속 동작한다.
- 진행 중인 정기 결제가 없다(이 서비스는 자동갱신 상품 자체가 없다 — 이용권도 30일 단품이다).

### 작업 절차

1. Play Console → **수익 창출 → 인앱 상품** 에서 위 6개를 찾는다.
2. 각각 **비활성화(Deactivate)**. 🔴 **삭제하지 말 것** — 삭제하면 과거 주문 조회에서 상품 메타가 사라진다.
3. 🔴 **productId 를 재사용하지 말 것.** Play 는 한 번 만든 상품 ID 를 영구 점유하며, 폐기한 ID 를 다른 가격으로 되살리면 과거 구매자의 영수증이 새 가격을 가리킨다. 코드에도 같은 경고를 달아 뒀다(`worker/lib/app-store-pricing.js`).

## 2. 가격을 바꿔야 하는 SKU

**2026-08-12 정비 시점에는 없었다.** 웹가만 내려간 상품들이 이미 존재하던 하위 티어로 이동했을 뿐이라, Play 가격 변경에 따르는 사용자 고지·유예 기간 요구사항이 그 정비에는 적용되지 않았다.

**2026-08-29 에 전부 바뀌었다 — 앱가를 웹가와 같은 값으로 내렸다**(사용자 확정). Play Console 쪽 인하는 사용자가 2026-08-29 에 먼저 완료했고, 코드는 그 뒤에 따라갔다. 작업표 정본은 [PLAY_CONSOLE_PRICE_UPDATE_2026-08-29.md](./PLAY_CONSOLE_PRICE_UPDATE_2026-08-29.md).

| productId | 옛 앱가 | **새 앱가 = 웹가** | 비고 |
|---|---:|---:|---|
| `cd_content_tier_01` | ₩3,900 | **₩3,000** | — |
| `cd_content_tier_02` | ₩6,000 | **₩5,000** | — |
| `cd_content_tier_14` | ₩8,900 | **₩7,000** | 3절 신규 등록 대상 |
| `cd_content_tier_06` | ₩13,000 | **₩10,000** | — |
| `cd_content_tier_09` | ₩25,000 | **₩20,000** | — |
| `cd_content_tier_10` | ₩39,000 | **₩30,000** | — |
| `cd_content_tier_11` | ₩49,000 | **₩39,000** | 번들 예외 |
| `cd_content_tier_13` | ₩89,000 | **₩70,000** | 번들 예외, 대응 코인가에서 690 제거 → 700만 |
| `cd_pass_{standard,premium,vvip,family}_30d` | 13,000 / 36,000 / 75,900 / 185,000 | **9,900 / 29,900 / 59,000 / 149,000** | 이용권은 2026-08-24 에 먼저 같아졌다 |

🔴 상품 **이름에도 금액이 박혀 있다**("운세 콘텐츠 3,900원") — 가격만 바꾸면 이름이 거짓말이 된다. 새 이름 전문은 위 작업표 1절.

## 3. 신규 생성이 필요한 SKU

> 2026-08-12 정비 시점에는 **없었다**(남은 7개 티어가 전부 기존 SKU 재사용). 아래는 그 뒤에 생긴 건이다.

### 🔴 2026-08-27 — `cd_content_tier_14` 신규 등록 (미완료 · 사람 손)

타로 오라클 상담을 카드 수 구간 4단계로 나누면서 **₩7,000(70코인)** 가격 포인트가 새로 생겼다
([PRICING_TIERS.md](./PRICING_TIERS.md) 의 2026-08-27 항목). 코드 쪽 매핑은 이미 들어갔고
(`worker/lib/app-store-pricing.js` 의 `CONTENT_TIER_TABLE`), **Play Console 등록만 남았다.**

| 항목 | 값 |
|---|---|
| productId | `cd_content_tier_14` |
| 유형 | 인앱 상품 (일회성, `inapp` / `managedUser`) |
| 앱가 | **₩7,000** (웹가와 동일 — 2026-08-29 정책) |
| 대응 코인가 | 70코인 |
| 대응 기능 | `tarot-prompt-maker-deep` (타로 오라클 상담 8~10카드, 스프레드 16종) |

제목·설명 문구는 [play-console-submission-values.md](../play-console-submission-values.md) 의 같은 티어 항목 형식을 따른다.

🔴 **`cd_content_tier_04` 를 되살리지 말 것.** 그 SKU 도 70코인/₩8,900 이었지만 2026-08-12 에
판매 중단됐고, Play 는 상품 ID 를 영구 점유한다 — 되살리면 과거 구매자의 영수증이 새 가격을 가리킨다.

**등록 전까지의 영향**: 안드로이드 앱에서 **8~10카드 스프레드만** 티어 미등록 503 으로 결제가 막힌다.
웹 결제와 나머지 세 구간(1~4·5~7·11~14장)은 영향 없다.

## 4. 앱에서 무료로 통과하는 항목

`APP_FREE_MAX_COIN_PRICE = 10` 이하는 SKU 를 만들지 않고 앱에서 무료 통과시킨다.

| 항목 | 코인 | 웹가 | 앱 |
|---|---:|---:|---|
| 음악 트랙 MP3 다운로드 | 10 | ₩1,000 | 무료 |

> 이번 정비 전에는 `fortune-fish-gacha`(5코인/₩500)도 여기 있었으나, 웹에서도 무료로 전환돼 레지스트리에서 빠졌다.
> 🔴 `APP_FREE_MAX_COIN_PRICE` 를 5로 되돌리면 앱에서 음악 구매가 **Play 티어 미등록 503 으로 하드블록**된다.

## 5. 배포 후 확인

1. `npm run verify:app-store-pricing` — 레지스트리 가격대가 전부 앱 티어로 커버되는지(미커버 = 앱 결제 하드블록)
2. `npm run verify:play-console-products` — 정본·등록 스크립트·제출 문서 3자 일치
3. 앱에서 각 티어 상품 1건씩 결제 시트를 열어 **표시 금액이 위 표와 같은지** 육안 확인
4. Play Console 에서 비활성화한 6개 SKU 가 앱 결제 시트에 더는 나타나지 않는지 확인

## 6. 등록 스크립트

`scripts/create-play-console-products.mjs` 는 `listAppContentTiers()` / `listAppPassProducts()` 에서 SKU 를 읽으므로 **가격을 하드코딩하지 않는다**(`verify:play-console-products` 가 강제). 기본은 dry-run 이며 실제 쓰기는 `--apply` 가 있을 때만 일어난다.

```bash
node scripts/create-play-console-products.mjs          # dry-run (기본)
node scripts/create-play-console-products.mjs --apply  # 실제 Play 에 쓰기
```
