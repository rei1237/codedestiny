# Android 앱 Google Play Billing

> 앱 결제 전용 문서. **웹 결제(PortOne V2 + 이니시스)는 이 문서와 무관하며 변경되지 않는다.**
> 웹 결제 정책은 [payment-policy-overview.md](payment-policy-overview.md) 계열 문서를 본다.

## 원칙

- 앱 안에서는 **모든 유료 결제가 Google Play Billing만** 거친다. 외부 결제 유도 링크·문구·암시는 전면 금지(Play 정책).
- 🔴 **앱 판매가 = 웹 판매가**(2026-08-29 사용자 확정). 종전의 "웹 대비 20~30% 인상"은 폐기했다 — Play 수수료 15%를 그대로 부담한다. 되돌리는 것도 정책 결정이며, 그때는 **Play Console 등록가를 사람이 먼저 올린 뒤** 코드를 올린다(반대 순서면 그 사이가 "앱 표시가 < 실제 청구가" 정책 위반 구간이다).
- **화면에 표시하는 가격은 반드시 `ProductDetails.getFormattedPrice()`** — 코드 상수는 서버 검증·정산 대조 전용이다.
- 이용권 선(先)검사는 앱에서도 그대로 유지된다(CLAUDE.md 필수 규칙). 이용권이 커버하면 결제창 없이 무료 통과.
- 월정석은 이벤트 지급 재화라 구매 대상이 아니다 → Play 상품 없음. 앱에서의 월정석 차감은 결제가 아니므로 정책상 허용된다.

## 파일 맵

| 파일 | 역할 |
|---|---|
| `worker/lib/app-store-pricing.js` | **앱 가격표 정본.** 코인 티어 → productId·확정가 |
| `worker/lib/app-store-models.js` | `AppPurchaseIntent`(결제 의도, TTL 24h) |
| `worker/routes/app-store.js` | `/api/app-store/*` — products·intent·verify·restore·rtdn·free-grant |
| `apps/mobile/android/.../CodeDestinyBillingPlugin.java` | 네이티브 Billing(9.1.0) — purchase·consume·acknowledge·queryProducts·restore |
| `app/app/MobileAppRuntimeBridge.tsx` | `window.CodeDestinyNative` 브리지 |
| `app/_lib/billing-client.ts` | `isMobileAppRuntime()` 단일 분기 → `runNativeAppStorePayment()` |
| `scripts/app-payment-guard.js` | 정적 페이지의 PortOne 경로를 Play Billing으로 갈아끼우는 가드 |
| `scripts/build-mobile-app.mjs` | dist 앱 전용 후처리(가드 주입·`/points` 제거) |
| `app/app/**` | 앱 셸 UI(홈·이용권 스토어·탭바·복구) |

## Play Console 등록 상품 (17개)

**상품 ID는 등록 후 변경 불가**다. 아래 그대로 등록한다. 전부 유형은 **인앱 상품(one-time)** — 이용권도 자동갱신이 없어 `subs`가 아니다. 소비 여부는 앱이 `consume()`로 결정한다.

### 콘텐츠 티어 13개

판매 중인 8개다. 나머지 6개(`tier_03`·`04`·`05`·`07`·`08`·`12`)는 2026-08-12 에 판매 중단됐고 옛 앱가는
[pricing/PLAY_CONSOLE_TASKS.md](pricing/PLAY_CONSOLE_TASKS.md) 1절에 남겼다. 🔴 폐기 ID 는 재사용하지 않는다.

| productId | 확정가(KRW) | 웹가 | 옛 앱가 | 대상 |
|---|---|---|---|---|
| `cd_content_tier_01` | 3,000 | 3,000 | 3,900 | 30코인 기능 21개 |
| `cd_content_tier_02` | 5,000 | 5,000 | 6,000 | 50코인 기능 54개 |
| `cd_content_tier_14` | 7,000 | 7,000 | 8,900 | 70코인 (타로 오라클 8~10카드) |
| `cd_content_tier_06` | 10,000 | 10,000 | 13,000 | 100코인 기능 36개 |
| `cd_content_tier_09` | 20,000 | 20,000 | 25,000 | 200코인 |
| `cd_content_tier_10` | 30,000 | 30,000 | 39,000 | 300코인 기능 14개 |
| `cd_content_tier_11` | 39,000 | 39,000 | 49,000 | 390코인 |
| `cd_content_tier_13` | 70,000 | 70,000 | 89,000 | 700코인 |

상품명은 가격을 포함해 명확히 쓴다(예: `운세 콘텐츠 열람 10,000원`). 🔴 그래서 **가격을 바꾸면 이름도 같이 바꿔야 한다.** 티어 SKU라 결제 시트에 기능명이 아닌 일반명이 뜨므로, 이름만으로 무엇을 사는지 알 수 있어야 한다.

### 이용권 4개

30일 · 자동 갱신 없음 · **등급별 월 이용 한도 있음**. 🔴 `사용 횟수 제한 없음`·`무제한`으로 쓰지 않는다
(2026-08-24) — 모든 등급에 월 이용 한도가 있어 그 표현이 실제 정책과 모순된다. 표기는
`N원 이하 · 월 최대 N원 상당`이다.
**이용권가는 앱·웹이 같다**(2026-08-24 개정). 2026-08-29 에 콘텐츠 티어까지 같아져 이제 전 SKU 가 동일하다.
커버 한도는 웹 정본(`PASS_LIMITS`, 코인)에서 앱가로 파생된다(`resolveAppPassCoverageKRW`) —
**커버하는 기능 집합은 앱·웹이 동일**하고(코인으로 판정) 지금은 표시 금액도 같다.

| productId | 확정가(KRW) | 웹가 | 커버 한도(앱=웹 표시) | 월 이용 한도 |
|---|---|---|---|---|
| `cd_pass_standard_30d` | 9,900 | 9,900 | 5,000원 이하 | 30,000원 |
| `cd_pass_premium_30d` | 29,900 | 29,900 | 10,000원 이하 | 100,000원 |
| `cd_pass_vvip_30d` | 59,000 | 59,000 | 20,000원 이하 | 200,000원 |
| `cd_pass_family_30d` | 149,000 | 149,000 | 전체 | 500,000원 |

> `family`는 고액 상품이라 심사에서 환불 정책 고지를 엄격히 본다.
> 월 이용 한도는 `worker/lib/profile-limits.js` 의 `MONTHLY_PASS_LIMITS_KRW` 가 정본이며, Play 상품 설명은
> `scripts/create-play-console-products.mjs` 의 `passDescription()` 이 그 값에서 문장을 만든다 —
> 문서에 숫자를 다시 적지 말고 정본을 고친다. 대조 가드: `npm run verify:play-console-products`.

### SKU 없는 것

- **10코인 이하 콘텐츠** — `APP_FREE_MAX_COIN_PRICE = 10` 이하는 SKU를 만들지 않고 **앱에서만 무료**로 통과시킨다. 해당 상품은 `fortune-fish-gacha`(웹 ₩500)와 **음악 트랙 다운로드**(10코인 / 웹 ₩1,000). 둘 다 앱가로 인상해도 Play KRW 최저 판매가 근처라 SKU가 성립하지 않는다. 웹 가격은 그대로 유료다.
  > 🔴 이 값을 `5`로 되돌리면 앱에서 음악 구매가 **Play 티어 미등록 503으로 하드블록**된다(`worker/lib/app-store-pricing.js:21-28`). 되돌리지 말 것.
- **월정석** — 구매 불가 재화.

## 등록 체크리스트

- [ ] 인앱 상품 17개 등록 (위 표 그대로, ID 변경 불가)
- [ ] Play Console 가격 ↔ `worker/lib/app-store-pricing.js` 상수 육안 대조
- [ ] Play Developer API 서비스 계정 생성 + `androidpublisher` 권한
- [ ] Pub/Sub 토픽 생성 → RTDN 연결 → 푸시 엔드포인트 `https://<domain>/api/app-store/google/rtdn`
- [ ] RTDN "테스트 알림 보내기"로 200 확인 (`testNotification` 처리됨)
- [ ] 라이선스 테스터 계정 등록
- [ ] Data Safety 신고 (수집 항목: 이메일, 생년월일, 출생지 — 사주 입력값)
- [ ] 개인정보처리방침 URL 유효
- [ ] 환불 정책 고지 (Play 정책 + 국내 전자상거래법 병기)
- [ ] 오락 목적 고지 필요 여부 검토 (사주/운세 콘텐츠)
- [ ] targetSdk 36 (현재 충족)
- [ ] 앱 서명 키 (`CODE_DESTINY_ANDROID_KEYSTORE_*`)

## 환경변수

`worker/routes/app-store.js`가 이미 참조 중 — 값만 주입하면 된다. 주입은 `npm run secrets:cf:worker`.

| 키 | 필수 | 비고 |
|---|---|---|
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | **필수** | 또는 `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PLAY_PRIVATE_KEY` |
| `GOOGLE_PLAY_PACKAGE_NAME` | 선택 | 기본 `com.codedestiny.app` |
| `GOOGLE_PLAY_RTDN_TOKEN` | **필수** | 미설정 시 RTDN이 503으로 비활성 → **환불 회수가 동작하지 않는다** |
| `GOOGLE_PLAY_PRODUCT_MAP` / `_PREFIX` | 선택 | 티어 표를 덮어쓰는 오버라이드(호환용) |

Android 릴리스 키는 [ANDROID_DEPLOY_READINESS.md](ANDROID_DEPLOY_READINESS.md) 참고.

## 결제 흐름

**앱도 웹과 같은 게이팅을 탄다.** 앱이라고 결제창을 건너뛰고 Play로 직행하면 월정석이
도달 불가해진다(CLAUDE.md 금지 패턴 ②). 앱에서 바뀌는 것은 **표시 금액과 단건 결제의 실행
수단**뿐이다.

```
이용권 선검사 (커버 → 결제창 없이 무료 통과)          ← 웹·앱 동일
      ↓ 미커버
결제창: 단건 결제 + 월정석 (동등 노출)                ← 웹·앱 동일. 금액만 앱 확정가로 표시
      ├─ 월정석 선택 → 서버 차감 (결제 아님 → Play Billing 대상 아님)
      └─ 단건 선택 ↓
POST /api/app-store/google/intent   ← 의도 기록(티어 SKU 역해석용) + obfuscatedAccountId 발급
      ↓
launchBillingFlow (Play 결제 시트)
      ↓
POST /api/app-store/google/verify   ← purchases.products.get 검증 → 지급 → acknowledge
      ↓
consume()  ← PER_USE만. 안 하면 다음 구매가 ITEM_ALREADY_OWNED로 막힌다
```

**단건 결제가 Play로 가는 지점**: 정본 게이트(`js/destiny-profile.js`)의 `_cdRunDirectKrwCheckout`를
앱 결제 가드(`scripts/app-payment-guard.js`)가 접근자로 고정해 Play Billing 구현으로 바꿔친다.
게이트 자체(이용권 선검사·결제창)는 웹 코드 그대로 재사용한다.

**fail-closed 2가지** (`app/_lib/billing-client.ts`):
- 가드가 없으면(`__cdAppPaymentGuard` 미설치) 결제를 열지 않는다 — 열면 원래 구현인 PortOne이 뜬다.
- 앱 표시 금액(`/api/app-store/products`)을 확인 못 하면 결제창을 열지 않는다 — 웹가를 띄우면
  결제창 금액과 Play 청구액이 어긋난다.

**PER_USE와 UNLOCK의 차이가 핵심이다.**
- `PER_USE`(회당 결제): `unlockedFeatures`에 넣지 않는다. 소비해야 재구매가 열린다.
- `UNLOCK`/`PDF`(영구 해금): `unlockedFeatures`에 기록. 소비하지 않는다. 복원 대상.

티어 SKU라 같은 티어의 **다른 기능**도 소비 실패에 함께 막힌다 — 소비는 선택이 아니다.

## 앱 번들 프루닝 (173MB → 108MB)

`scripts/build-mobile-app.mjs`가 앱 빌드에서만 걷어낸다. **웹 자산은 건드리지 않는다.**

| 대상 | 절감(압축 후) | 근거 |
|---|---|---|
| `/insights`, `/famous-saju` (+로케일) | ~28 MB | SEO 전용 문서. 앱 사용자는 도달할 일이 없다 |
| webp 쌍이 있는 죽은 PNG 원본 25개 | ~36 MB | `X.png`와 `X.webp`가 같이 있는데 `X.png`는 dist 어디서도 참조되지 않는다(`-photoroom` 등 배경제거 툴 원본) |

**자산은 목록으로 지우지 않는다 — 반드시 참조 검사를 거친다.** `buildReferencedNameIndex()`가 dist의 모든 텍스트 파일에서 파일명을 색인해 대조하고, 참조가 하나라도 잡히면 남긴다(fail-safe). 지운 목록은 빌드 로그에 남으므로 이미지가 깨지면 거기부터 본다.

> ⚠️ 한때 `fuctionassets/tadagochi*`(25MB)를 "참조 0건"으로 보고 하드코딩 목록에 넣었다가 다마고치 기능을 깨뜨릴 뻔했다. `tadagochi.html`이 그 이미지를 쓰고 `index.html`이 `/tadagochi`로 링크한다. 목록 방식은 이런 오판을 걸러낼 수 없어서 규칙 기반으로만 간다. `verify-app-no-portone.mjs`가 다마고치 자산 **존치**를 검사한다.

### 링크 제거 — 라우트를 지우면 링크도 지워야 한다

파일만 지우고 링크를 두면 그대로 404다. `scripts/app-payment-guard.js`의 `PRUNED_ROUTES`가 빌드의 `REMOVED_ROUTE_DIRS`와 짝을 이룬다:

- **대체 화면 있음**(`/points`, `/premium-unlock`) → 링크는 두고 클릭만 `/app/store`로 돌린다.
- **대체 화면 없음**(`/insights`, `/famous-saju`) → 링크 자체를 제거한다.

`/insights` 링크는 푸터(`SiteFooterHub`)·가이드 칩·`SajuBasicPage`(앱 탭!) 등 공용 컴포넌트에 흩어져 있어, 각각 고치면 웹까지 바뀐다. 그래서 런타임 가드가 걷어낸다:
1. 홈의 SEO 섹션(`#cd-insights-body`·`#cd-famous-body`)은 **부모째** 제거 — 앵커만 지우면 제목만 남은 빈 카드가 된다.
2. 흩어진 앵커 제거.
3. `MutationObserver`로 나중에 붙는 링크(유명인 카드 그리드)도 처리.
4. 클릭 백스톱.

**검증**: `verify-app-no-portone.mjs`가 실제 산출물(`dist/index.html`, `dist/saju/basic/index.html`)을 jsdom으로 열어 가드를 돌리고, 프루닝 링크 **0건**·기능 링크 **존치**·홈 허브 **존치**를 확인한다.

## 배포 절차

```bash
npm run typecheck
npm run verify:app-store-pricing            # 티어 ↔ 레지스트리 전수 일치
npm run verify:app-store-billing-policy     # PER_USE 재구매·이용권·앱가·환불 해석
npm run verify:billing-pass-policy          # 웹 결제 무회귀
npm run verify:portone-single-payment
npm run verify:paid-gate-ui

npm run migrate:app-purchase-intent-indexes # DB 1회 (autoIndex:false라 필수)
npm run deploy:cf:worker                    # app-store.js 변경분 (Pages는 GH Actions)

npm run mobile:android:sync                 # build:mobile:app(가드 주입·/points 제거·검증) → cap sync
npm run mobile:android:open                 # Android Studio에서 bundleRelease
```

## 테스트 시나리오 (라이선스 테스터, internal testing 트랙)

1. **정상 구매(PER_USE)** — 구매 → 콘텐츠 열림 → `consume` → **같은 기능 재구매 성공** ← 최우선
2. **정상 구매(UNLOCK)** — 구매 → 영구 해금 → 재진입 시 결제창 미노출
3. **티어 공유** — 같은 티어의 다른 기능 A→B 연속 구매 (`ITEM_ALREADY_OWNED` 미발생)
4. **결제 중 강제 종료** — 결제 시트 후 앱 kill → 재실행 → 자동 복구(intent로 featureKey 역해석) → 지급
5. **PENDING 구매** — 테스트 카드 "지연 승인" → 지급 보류 + 안내 UI → 승인 후 지급
6. **환불 → RTDN** — Play Console 환불 → `voidedPurchaseNotification` → 콘텐츠 회수
7. **중복 purchaseToken** — 동일 토큰 2회 전송 → `idempotent: true`, 중복 지급 없음
8. **타 계정 토큰** — A 계정 토큰을 B 계정으로 → 409 (`GOOGLE_PLAY_PURCHASE_ACCOUNT_MISMATCH`)
9. **네트워크 단절** — 구매 성공 후 verify 실패 → 재실행 시 복구
10. **이용권 선검사** — 이용권 보유자가 커버 범위 기능 진입 → 결제창 없이 통과
11. **PortOne 부재** — 앱 전 화면 순회, 외부 결제창 노출 0건, `/points` 접근 불가
12. **무료 전환** — `fortune-fish-gacha` → 결제창 없이 열림

## 알려진 한계

- **고아 구매 역해석은 intent TTL 24시간에 의존한다.** 24시간이 지난 미검증 구매는 `APP_STORE_INTENT_NOT_FOUND`(409)로 떨어진다. `PER_USE`는 소비로 종료되지만 `UNLOCK`이면 수동 대응이 필요하다.
- **`purchases.products.get`은 가격을 돌려주지 않는다.** 서버가 기록하는 금액은 `app-store-pricing.js`의 확정가다 — Play Console 가격과 어긋나면 정산이 틀어지므로 대조가 필수다(`verify:app-store-pricing`은 티어 존재만 검사하지 Play 실제 등록가는 모른다).
