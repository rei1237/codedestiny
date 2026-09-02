# PRICING_FINDINGS — 가격/결제 관련 발견사항 (기록만, 수정 없음)

> Phase 0 진단 중 마주친 가격·결제 영역 관찰 기록. 프롬프트 §1-A/§1-B에 따라 **1줄도 수정하지 않았다.**
> 이 목록은 "고쳐야 한다"가 아니라 "별도 트랙에서 판단할 것"이다.

## 1. 앱 이용권 신규 구매가 코드로 비활성화되어 있음 — 해소(2026-09-03)
- (당시) `app/app/store/AppPassStoreClient.tsx:73` — `APP_PASS_PURCHASE_DISABLED = true`. Google Play 이용권 신규 구매가 꺼져 있고 "웹 PG 단건 결제로만" 안내 문구를 렌더(:208-216).
- 판정: 임시 조치였다. 앱 내 이용권 구매가 의도된 동작이라 플래그와 서버 4개 게이트(`PASS_PURCHASE_CHANNEL_DISABLED`)를 걷어냈다.

## 2. 금액 포맷터가 정본 외 로컬 중복 5곳
- 정본: `lib/payment/coin-pricing.ts` `formatKrwFromCoins`
- 중복: `app/points/PointsClient.tsx:1046` `formatCoinValue` / `app/_lib/billing-client.ts:857` `formatCoinValueWon` / `app/tarot/prompt-maker/TarotPromptMakerClient.tsx:1759` / `components/fortune/destiny-meeting-place/DestinyMeetingPlaceResult.tsx:531` / `app/admin/monthly-credits/page.tsx` `formatAmount`
- 표시 규칙(1코인=100원) 변경 시 5곳이 따로 노는 구조.

## 3. 프롬프트가 참조한 가격 파일명은 이 레포에 없음
- `pricing.app.ts`/`pricing.web.ts` → 실제 정본은 `worker/lib/app-store-pricing.js`(앱)·`worker/lib/paid-feature-registry.js`(웹)·`worker/lib/billing-policy.js`(정책). 앱↔웹 가격 대조는 `scripts/verify-app-store-pricing.mjs`가 전수 검사.

## 4. 앱 결제 가드의 봉쇄 방식 메모 (동작 확인용 참고)
- `scripts/app-payment-guard.js:161-167` — `window.PortOne`을 undefined로 고정(configurable:false), `:180-181` `_cdRunDirectKrwCheckout`/`_dpRunDirectKrwCheckout` 핀 고정, `:207-214` alert에서 PG 문구 제거. 앱 결제 진입은 `window.__cdOpenChargeModal` → `/app/store/` 고정(:184-200).
- 이 가드 스크립트 자체가 **빌드 후처리 주입**이므로, 주입 실패 시 웹 결제 UI가 앱에 그대로 노출될 수 있는 구조적 의존이 있다(판별 단일화 이슈 — DIAGNOSIS_REPORT §0-1 P0 #2와 동일 뿌리).

## 5. 앱 상점의 가격 칸이 전부 `—`로 렌더되는 상태 — 해소(2026-09-03, 1번과 같은 원인)
- (당시) `APP_PASS_PURCHASE_DISABLED = true`의 연쇄: `loadProducts()`가 `nativeReady=false`로 조기 종료(`AppPassStoreClient.tsx:104-108`) → Play `formattedPrice`가 채워지지 않아 모든 가격 칸이 `—`(`:264`). 레이아웃 버그가 아니라 플래그 상태의 결과.
- productId 정본: `cd_pass_{standard,premium,vvip,family}_30d`(`:30-53`). 커버 금액은 `/api/app-store/products?passTier=` 서버 응답.

## 6. 앱 번들에 남는 PortOne 흔적 (가드가 런타임에만 봉쇄)
- `index.html:436-438` — `cdn.portone.io` preconnect가 앱 번들 `<head>`에 그대로 주입됨.
- `index.html:23552-23594` — PortOne V2 SDK 로더(`_cdLoadPortOneV2Sdk` 등)가 셸에 상주. 가드는 진입점만 바꾸고 로더는 남긴다.
- `index.html:7383` — "PG 결제창 열림" 전용 CSS 잔존.
- `scripts/app-payment-guard.js:207-214` — `window.alert` 래핑으로 `포트원|PortOne|이니시스` 문구를 표시 직전 제거(원본 문구는 번들에 존재, 예: `js/destiny-profile.js:3398`).

## 7. 하드코딩 원화 가격 문자열 (서버 가격 정본과 이원화)
- `index.html`에 정적 원화 문자열 다수: `:1235`(30,000원), `:13356-13486`, `:17848-17912`(3,000/6,000원), `:18011-18036`(10,000/20,000원), `:18188-18251` 등 — Play `queryProducts` 결과가 아님.
- 타로 버튼 라벨 "5,000원"(`index.html:20270,20329`)도 하드코딩 — React 쪽은 `useServerPrice`로 "UI fallback 가격 미사용" 원칙(`app/components/FeatureLandingPage.tsx:615-617` 주석)인 것과 대비됨.
- `index.html:6600` 부근 `0010 원` 문자열 잔재(오염 가능성).

## 8. 6개 엔진의 게이트 경유 방식 확인 (위반 없음)
- 6개 엔진 전부 `_cdOpenPaidServiceGate`/`runBillingCoinGate` 정규 경로 사용, 우회 커스텀 체크아웃 없음.
- 기능키·가격: 타로 `tarot-myeongri-three-card`(50코인, `js/saju-engine-tarot-sukuyo-quantum.js:818-820`), 숙요 6종(30~100코인, `:7337-7342`), 점성술 AI `astrology-ai-consultation`(300코인), 베다 AI `vedic-ai-consultation`(300코인).
- 숙요는 45초 TTL in-flight 락(`:7396-7430`), 프로필 정합성은 `_sajuPromptResolveProfileId()` 공용 리졸버(`js/saju-engine.js:5864-5871`)로 통일돼 있음.
