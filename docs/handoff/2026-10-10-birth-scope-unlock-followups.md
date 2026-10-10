---
status: active
updated: 2026-10-10
next: "docs/handoff/2026-10-10-birth-scope-unlock-followups.md 를 읽고 P0-1(지급 보류 오안내·웹훅 202·소급 주문)을 진행해줘"
---

# 출생 기반 해금 전환 — 남은 위험·후속 과제

## 왜

사용자 요청: "남은 위험과 후속 작업도 진행할 수 있도록 인수인계 문서 남겨서 완벽하게 처리되도록해줘"

## 지금 상태

- 출생 기반 해금(`userId + birthKey + contentKey`)과 프로필 카드 1,000원 인하가 main 41be9ef2c 에 들어가 있다. staging 은 push 로 배포됐고 **운영 승격은 아직이다.**
- 운영 DB·staging DB 모두 이관 마이그레이션을 **아직 돌리지 않았다.** 그래서 staging 의 기존 구매는 지금 잠겨 보인다.
- 정책 정본은 `docs/context/payment-gating.md:7-16`, `docs/PAYMENT_AND_ACCESS.md` 출생 기반 절이다. 신원 해석은 `worker/lib/birth-scoped-unlock-identity.js` 에 있다.

## 다음 세션 시작 명령

과제 하나에 세션 하나를 쓴다. 아래 문장의 과제 번호만 바꿔 붙여 넣는다.

```
docs/handoff/2026-10-10-birth-scope-unlock-followups.md 를 읽고 P0-1 을 진행해줘
```

- 🔴 **운영 승격 전 필수:** P0-1, P0-2. 순서는 P0-1 코드 → main push → P0-2 staging 리허설 → P0-2 운영 → 승격이다.
- 동시에 돌리지 않는다:
  - P0-1·P1-4 는 둘 다 `worker/routes/payments.js` 를 고친다.
  - P1-1·P1-2·P3-1 은 셋 다 `worker/routes/app-store.js` 를 고친다.
- 끝낸 과제는 제목 옆에 `✅ 완료 YYYY-MM-DD (커밋)` 를 붙인다. 전부 끝나면 `status: done` 으로 바꾼다.

## 과제 목록

### P0. 운영 승격 전 필수

**P0-1. 소급 주문 지급 보류: 결제됐는데 해금이 없고 "권한 정상 처리"로 안내** — 🔴 RED
- 대상 주문: 이번 변경 전에 만들어진 출생 기반 키 주문이다. `pricingSnapshot` 에 profileId·birthKey 가 없거나 그 프로필이 삭제된 경우다. 새 주문은 시작 단계에서 막힌다(`worker/routes/payments.js:1985-2000`).
- 웹(PortOne) 경로:
  - `upsertSinglePaymentUnlockRecord` 가 신원 오류를 던진다(`payments.js:1186-1201`).
  - 그러면 `refundOrDefer(..., {forceDefer:true})` 가 실행돼 환불 없이 `delivery_failed_manual_review` 를 남긴다(`:1698-1704`).
  - 응답은 202 이고 문구가 "결제와 이용 권한은 정상 처리됐습니다"다(`:1351-1360`). 그런데 출생 기반 키는 계정 배열을 근거로 쓰지 않는다(`worker/lib/paid-feature-access.js:430-436`). 그래서 **실제로는 열리지 않는다.**
  - 주석(`:1348-1350`)은 "2xx 로 processed 확정"이라고 하지만 `isSuccessfulWebhookResponse` 는 202 를 제외한다(`:591-596`). 결과적으로 웹훅이 재시도·재조정 대상으로 남는다.
- V2 경로:
  - `grantOrderEntitlement` 가 false 를 돌려준다(`worker/payments/index.js:994,1002-1010`).
  - 그러면 `regrantUnfulfilledOrders` 가 5분마다 무한히 재시도한다(`worker/payments/reconcile.js:82-86`). 환불은 없다.
- 앱(Google Play) 경로: `birthUnlockReviewRequired` 표시만 남는다(`worker/routes/app-store.js:868,902,920-925`).
- 위 표시(`delivery_failed_manual_review`·`birthUnlockReviewRequired`·`UNLOCK_RECORD_DEFERRED`)를 읽는 worker 코드는 **하나도 없다.**
- 할 일:
  1. 신원 실패 응답 문구를 사실대로 고친다. 예: "결제는 확인됐고 열람할 프로필 확인이 필요합니다". 202 와 processed 계약 중 하나로 정하고 주석과 맞춘다.
  2. V2 regrant 에서 신원 오류를 종결 상태로 빼서 무한 재시도를 멈춘다.
  3. 읽기 전용 조회로 대상 주문 수를 센다. 조건은 결제 완료 + 출생 기반 featureKey + `pricingSnapshot.birthKey` 없음이다. staging(`code_destiny_staging`)과 운영(`code_destiny`) 각각 센다.
  4. 처리 방식(환불 또는 사용자가 프로필을 고른 뒤 지급)은 **사용자에게 묻는다.**
  5. 관리자가 볼 수 있게 표시 기반 목록이나 알림을 하나 만든다.
- 알려진 한계: 프로필이 살아 있는 소급 주문은 구매 시점이 아니라 **현재** 출생 정보로 지급된다. 바꿀지 사용자에게 함께 묻는다.
- 완료 기준:
  - 신원 실패 시 "권한 정상 처리" 문구가 나가지 않는다.
  - V2 에서 신원 오류 주문이 재시도 루프를 빠져나온다.
  - 대상 주문 수를 사용자에게 보고했다.
  - 테스트: `__tests__/worker/birth-scope-unlock-policy.test.js` 에 "소급 주문 + 스냅샷 없음" 정산·재조정 사례를 각 1건씩 추가한다.
- 검증: `npm run verify:portone-single-payment`, `npm run verify:saju-unlock-entitlement-regression`, `npm run test:jest -- birth-scope payments-v2`

**P0-2. 이관 마이그레이션: staging 리허설 → 운영** — 🔴 RED, DB 쓰기라 **사용자 승인 필수**
- 스크립트는 `scripts/migrations/20261010-birth-scope-unlocks.mjs` 다.
  - 플래그 없이 돌리면 dry-run 이다. `--apply`, `--create-index`, `--check` 가 있다.
  - 출력 마지막 줄은 `RESULT DRY_RUN|APPLIED|OK|MISSING_INDEX|DUPLICATES` 중 하나다.
- 함정:
  - `.env.local` 에서 접속 정보를 읽는다(`:23-33`). staging 과 운영은 Mongo URI 가 같고 **DB 이름만 다르다**(`worker/wrangler.toml:183` `code_destiny`, `worker/wrangler.staging.toml:239` `code_destiny_staging`).
  - DB 이름은 `MONGO_DB_NAME` 이 우선한다. staging 을 치려면 반드시 `MONGO_DB_NAME` 을 덮어쓴다. `MONGODB_DB_NAME` 만 바꾸면 운영을 친다.
  - `npm run migrate:birth-scope-unlocks -- --apply` 도 **실제로 적용된다**(`package.json:140`). `node` 로 직접 부른다.
  - 운영 배포 워크플로(`.github/workflows/cloudflare-pages-deploy.yml`)에는 마이그레이션 단계가 없다. 그래서 손으로 먼저 돌린다.
- 명령. 각 단계 출력을 사용자에게 보여주고 승인받은 뒤 다음 단계로 넘어간다.
  ```
  npm run backup:mongo -- --out <레포 밖 경로>
  MONGO_DB_NAME=code_destiny_staging node scripts/migrations/20261010-birth-scope-unlocks.mjs
  MONGO_DB_NAME=code_destiny_staging node scripts/migrations/20261010-birth-scope-unlocks.mjs --apply
  MONGO_DB_NAME=code_destiny_staging node scripts/migrations/20261010-birth-scope-unlocks.mjs --create-index
  MONGO_DB_NAME=code_destiny_staging node scripts/migrations/20261010-birth-scope-unlocks.mjs --check
  # 운영: MONGO_DB_NAME=code_destiny 로 같은 네 단계
  # 그다음 Actions → Release Cloudflare Pages and Worker → mode: production
  ```
- 완료 기준:
  - 두 DB 모두 `--check` 가 `RESULT OK` 다.
  - dry-run 의 `STAT` 숫자(생성·병합·삭제 프로필·제외 USER 행·영향 사용자)를 사용자에게 보고했다.
  - staging 에서 기존 구매 계정 하나로 종합풀이가 열리는 것을 확인했다.

### P1. 결제 정확성

**P1-1. RTDN 환불·무효 회수가 중간 실패하면 BIRTH 행이 영구 ACTIVE** — 🔴 RED
- 위치는 `worker/routes/app-store.js:1386-1430` 이다. 순서가 다음과 같다.
  1. Payment `cancelled` CAS(`:1395-1408`)
  2. 배열 pull(`:1409-1420`)
  3. `revokePaymentContentAccess`(`:1423-1429`)
- 2나 3이 던지면 Pub/Sub 이 재전송한다. 그런데 이미 `cancelled` 라 CAS 가 실패하고 `:1408` 에서 바로 반환한다. 회수가 영영 다시 실행되지 않는다.
- 할 일: 회수를 CAS 앞으로 옮기거나 `cancelling` 중간 상태를 둬서 재전송 때 이어서 하게 한다. 회수는 멱등이어야 한다.
- 완료 기준: "회수가 던진 뒤 재전송 → 회수됨" 테스트 1건을 `__tests__/worker/app-store.google-billing.test.js` 의 `:532`·`:567` 옆에 추가하고 통과한다.
- 검증: `npm run test:worker:auth-payments`, `npm run verify:app-store-billing-policy`

**P1-2. `settlePurchaseIntent` 가 productId 로 아무 OPEN 의도나 정산** — 🔴 RED
- `worker/routes/app-store.js:383-399` 는 `{userId, productId, status:"OPEN"}` 조건에서 가장 최근 것을 정산한다. 티어 SKU 는 여러 featureKey 가 함께 쓴다(`:301-310`).
- `findOpenBirthIntent`(`:450-457`)도 같은 기능의 OPEN 의도가 둘 이상이면 가장 최근 것을 고른다.
- 위험:
  - 기능 Y 를 샀는데 기능 X 의 의도가 정산된다.
  - P1 용으로 결제했는데 버려진 P2 의도의 birthKey 로 지급된다.
- 할 일: 의도 `_id` 로 정산한다. 클라이언트가 `:809` 에서 받은 intentId 를 돌려보내거나 `obfuscatedProfileId` 로 실어 보낸다. 후보가 여럿이면 fail-closed 로 관리자 검토에 넘긴다.
- 완료 기준: 같은 SKU 에 OPEN 의도 2건이 있는 테스트 2건(다른 기능, 같은 기능·다른 프로필)이 통과한다.

**P1-3. 이관 행 환불 회수가 두 번의 쓰기라 원자적이지 않음** — 🟡 YELLOW
- `worker/lib/content-unlocks.js:470-496` 에서 `mergedOrderIds` 를 pull 하는 것과 비게 된 행을 회수하는 것이 별도 쓰기다. 둘 사이에 죽으면 ACTIVE 이면서 `mergedOrderIds` 가 빈 행이 남고, 재시도해도 잡히지 않는다.
- 할 일: 파이프라인 업데이트 한 번으로 합치거나, "BACKFILL + ACTIVE + 빈 mergedOrderIds" 를 회수하는 청소 단계를 추가한다.
- 완료 기준: 이 함수의 실제 동작 테스트가 생긴다. 지금은 mock 만 있다.

**P1-4. cron Mongo 부채 장부를 0으로 되돌리기** — 🟡 YELLOW
- 장부는 `scripts/verify-cron-mongo-op-coverage.mjs:57-61` 에 있다. 이번에 `payments.js` 16, `content-unlocks.js` 8 로 올렸다. 미커버 26건의 함수 목록은 `handleSinglePaymentComplete` 그래프(`payments.js:859-934,1167-1301,1331-1739`, `content-unlocks.js:347-385,470-616,646-796`)다.
- 막힌 이유: `withMongoRetry` 는 시도마다 `connectDb` 를 부른다(`worker/lib/db.js:1711`). 그런데 `scripts/verify-portone-single-payment-regression.mjs` 는 Mongo 없이 돈다.
- 할 일:
  1. 하네스를 esbuild 로 `db.js` 를 갈아끼우는 패턴(`scripts/verify-nakshatra-renewal.mjs:8,15`)으로 옮긴다.
  2. 그래프를 감싼다. 중첩 재시도는 금지다.
  3. 장부를 실제 값으로 내린다.
- 미커버 목록 출력: `analyzeCronMongoCoverage`(`:148`)를 import 해서 `uncovered` 를 출력한다.
- 완료 기준: 두 파일의 장부 값이 0 이거나 이전 값(15, 4) 이하이고 아래 세 검증이 모두 통과한다.
- 검증: `npm run verify:cron-mongo-op-coverage`, `npm run verify:no-nested-retry`, `npm run verify:portone-single-payment`

### P2. 유료 내용 우회

**P2-1. 사주 종합풀이·대운 본문이 브라우저에서 계산됨** — 🔴 RED, 규모 L
- `js/saju-engine.js:5790-5791` 이 `window.__cdLastSummaryArgs` 를 노출한다.
- 관문 `_cdSajuGateUnlocked`(`:26803-26820`)는 `window.isTileKeyUnlocked` 에 묻기만 한다. 콘솔에서 덮어쓰면 `renderSummary`(`:26845`)와 `renderDaewun`(`:30025`)이 그대로 열린다.
- 본문 문구 표(`TS_DEEP`·`TS_DB`·`HEALTH_DATA`)도 공개 JS 에 들어 있다. 이 본문을 돌려주는 서버 경로는 없다.
- 할 일:
  1. 서버 경로를 만든다. 예: `POST /api/saju/section {profileId, featureKey}`. `readProfileBirthUnlock`(`worker/lib/paid-content-read-access.js:89`)로 열람 권한을 확인한다.
  2. 저장 프로필의 출생 정보로 계산하고, 렌더 결과를 서버에서 돌려준다.
  3. 문구 표와 렌더 코드를 worker 전용 모듈로 옮긴다.
- 서버로 추출된 것은 계산 핵심(`scripts/extract-saju-runtime.mjs:13`)뿐이다.
- 🔴 운세 엔진 계산을 바꾸면 RED 다. 그때는 `--write` 재생성과 `__tests__/ui/yeongnyangi-reading-invariance.test.mjs` 해시 갱신이 따른다. 먼저 설계 문서를 쓰고 사용자 승인을 받는다.
- 완료 기준:
  - 콘솔 우회(`isTileKeyUnlocked` 덮어쓰기)로 본문이 나오지 않는다.
  - 공개 JS 에 본문 문구 표가 없다.
- 검증: `npm run verify:saju-unlock-entitlement-regression`, `npm run verify:saju-summary-browser`

**P2-2. FPTI 프리미엄 리포트가 클라이언트가 보낸 결과로 생성됨** — 🔴 RED, 규모 M
- `worker/routes/fpti.js:881-934` `normalizeInput` 가 `body.result` 를 그대로 받는다.
- `handleDeepReport`(`:1119-1182`)는 저장 프로필의 해금만 확인하고, 리포트는 본문 입력으로 만든다. 그래서 한 번 사면 어떤 유형이든 서명만 바꿔 받을 수 있다.
- 할 일:
  1. `access.birth` 로 서버에서 다시 계산한다. 계산 경로는 `lib/fpti/fpti-adapter.ts:228,272` 에 있다. 단 `fpti-engine.ts:2` 가 `@/constants/loadingMessages` 를 import 하므로 worker 용으로 분리해야 한다.
  2. `reportSignature` 를 userId + birthKey 로 만든다.
- 완료 기준: 본문 `result` 를 바꿔 보내도 같은 리포트가 나오는 테스트를 `__tests__/worker/fpti-deep-report.birth-profile.test.js` 에 추가한다.

**P2-3. astro·nakshatra 출생지·시간대가 요청 본문에서 옴** — 🟡 YELLOW, 규모 S–M
- `worker/routes/astro-basic-deep.js:53-60` 과 `worker/routes/nakshatra-premium.js:83-112,234-236` 이 해당한다. 같은 생년월일로 시간대를 바꾸면 사실상 다른 차트를 받는다.
- ProfileCard 에는 `location {label,tz,lng,lat}` 가 있다(`worker/lib/models.js:261-266,289`). 하지만 `readProfileBirthUnlock` 는 이 값을 select 하지 않는다(`paid-content-read-access.js:100`).
- 할 일: `location` 을 select 해서 넘기고, 본문의 장소 값은 무시한다.
- 주의: 스키마 기본값(서울) 때문에 미입력과 서울을 구분할 수 없다. 처리 방식은 사용자에게 묻는다.
- 완료 기준: 본문 tz·lat·lng 를 바꿔도 결과가 같은 테스트가 `nakshatra-premium-birth-unlock.test.js` 와 `astro-basic-deep.test.js` 에 각 1건씩 있다.

**P2-4. 회당 과금 키가 영구 해금 목록에 남음** — 🟡 YELLOW, 규모 S
- `worker/routes/fortune.js:2538` `fun.quantumLotto.ritualReport` 와 `:2527` `love-code` 가 `PERSISTENT_UNLOCK_KEY_SET` 에 들어 있다. 그런데 레지스트리에서는 두 키 모두 `per_use` 다(`worker/lib/paid-feature-registry.js:391,341`).
- `resolvePersistedUnlockFeatures`(`fortune.js:2634-2675`)는 이용권 차감 행을 영구 해금으로 바꾸고 계정 배열에도 써 넣는다.
- 문서 `docs/context/payment-gating.md:61` 도 lotto 를 "영구 해금"으로 적고 있다. 같은 문서 `:26` 의 회당 1,000원과 모순된다.
- 할 일:
  1. lotto 를 목록에서 뺀다.
  2. love-code 는 `:29` 기존 영구 지급을 존중하는 규칙 때문에 일부러 남겼을 수 있다. **사용자에게 묻는다.**
  3. 문서를 고친다.
  4. `scripts/verify-per-use-never-unlocks.mjs` 에 "이 목록과 per_use 목록이 겹치지 않는다" 검사를 추가한다.
- 검증: `npm run verify:per-use-never-unlocks`, `npm run verify:love-code-permanent-unlock`, `npm run verify:payment-policy-md`

### P3. 요금·정리

**P3-1. 앱에서 프로필 카드 결제를 열 ₩1,000 Play SKU** — 🔴 RED, **Play Console 은 사용자가 직접 한다**
- 지금은 `profile-card-manage` 가 `APP_PAID_LOW_PRICE_FEATURE_KEYS`(`worker/lib/app-store-pricing.js:128-149`)에 있다. 10코인 티어가 없어서 503 `APP_SKU_NOT_VERIFIED` 가 난다(`worker/routes/app-store.js:218-224`).
- 이 키를 목록에서 **빼면 안 된다.** 빼면 앱에서 무료가 된다.
- 순서. Play Console 에 상품을 먼저 만들고 그다음 코드를 고친다(`app-store-pricing.js:8-9`).
  1. Play Console 에 `cd_content_tier_15` 를 ₩1,000 으로 만든다. ID 01–14 는 사용 중이거나 재사용 금지다. ID 는 추정이므로 사용자에게 확인한다.
  2. `CONTENT_TIER_TABLE`(`app-store-pricing.js:41-58`)에 `{productId:"cd_content_tier_15", amountKRW:1000, webAmountKRW:1000, coinPrices:[10]}` 을 추가한다.
  3. `scripts/create-play-console-products.mjs:39-52` 와 `docs/play-console-submission-values.md:62-67` 에도 추가한다.
  4. `__tests__/worker/app-store.google-billing.test.js:702-729` 의 기대값을 바꾼다.
  5. 문서 `docs/pricing/PLAY_CONSOLE_TASKS.md:119`, `docs/play-billing-app.md:75`, `docs/context/payment-gating.md:63` 을 고친다.
- 🔴 부작용: 이 티어 하나로 목록의 1,000원 키 약 45개가 앱에서 **한꺼번에** 결제 가능해진다. 사용자에게 먼저 알린다.
- 검증: `npm run verify:play-console-products`, `node scripts/verify-app-store-pricing.mjs`, `npm run play:products:dry`(Google API 호출 — 사용자 승인 필요)

**P3-2. 옛 요금(월정석 500·₩5,000) 인정 제거** — 🟢 GREEN, 운영 승격 후 30일 이후에 한다
- 근거: `worker/lib/profile-card-mutation-policy.js:10-16`, 사용처는 `worker/lib/profile-moonstone-mutation.js:15` 하나다.
- 제거 전에 읽기 전용 조회로 아래 세 가지가 0건인지 확인한다.
  - `profile-card-manage` 의 미완료 월정석 500 차감
  - 비종결 ₩5,000 결제
  - OPEN 앱 의도
- 함께 수정할 곳: `__tests__/worker/profile-moonstone-roundtrip.test.js:68-69`, `scripts/verify-profile-card-action-policy.mjs:267`, `scripts/verify-profile-client-first.mjs:52`.
- 앱의 소비되지 않은 `cd_content_tier_02`(옛 50코인) 구매를 복원할 수 없는 문제(`app-store.js:343-347,1217-1221`)도 함께 판단한다. Play 운영 트랙이 비활성이라 노출은 내부 테스터 정도다.

**P3-3. 결제 인벤토리 문서에 5,000원이 남아 있음** — 🟢 GREEN
- `docs/payments/payment-inventory.md:92` 와 `.json:87`: 생성기(`scripts/payment-inventory.mjs`)가 삭제됐다(60d7c42c2). 손으로 1,000원으로 고친다.
- `docs/payments/payment-p0-inventory.md:132` 와 `.json:4292-4300`: `npm run audit:payment-p0-inventory` 로 다시 만든다. diff 가 크다.
- `docs/payment-policy-content-access.md:58` 의 `CLIENT_AMOUNT_MISMATCH` 위치 참조가 낡았다. 정본은 `worker/payments/index.js:1213-1222` 다.

**P3-4. `50coin` 마커 이름** — 🟢 GREEN
- 해당 줄은 `js/destiny-profile.js:9984-9985` 다. 읽는 코드가 없어 이름만 바꾸면 된다.
- 고친 뒤 `npm run sync:public` 과 `verify-payment-choice-parity` 로 `destiny-profile.js?v=` pin 을 다시 맞춘다. 수동 pin 파일 약 25개를 함께 커밋한다.

**P3-5. 궁합(`section_compat`) 구매 UI 없음** — 사용자 결정 필요
- 서버는 지원한다(`worker/lib/birth-key.js:79`). 하지만 `data-partner-profile-id` 를 넣는 화면이 없다. 지금 화면의 궁합 카드는 다른 키(`compat-saju-compatibility`, 회당 과금)를 쓴다(`js/saju-engine.js:28576-28620`).
- 선택지:
  - (a) 저장 프로필 선택 UI, 결제 페이로드(`index.html:23160,23694,28050`), 본문 라우트를 만든다. 규모 M.
  - (b) 레지스트리와 인벤토리에서 이 키를 정식으로 은퇴시킨다. 규모 S.

## 과제가 아닌 것 (의도된 동작)

- 프로필을 지우고 같은 출생 정보로 다시 만들면 다시 열린다. 해금 단위가 출생 정보이기 때문이다.
- 옛 JS 캐시로 5,000원을 보내면 400 `CLIENT_AMOUNT_MISMATCH` 와 "새로고침 후 다시 시도" 문구가 나온다. 새로고침하면 해결된다.
- 브라우저 캐시 누수는 점검 결과 남은 곳이 없다. 다만 다른 기기에서 생년월일을 고친 뒤 72시간 안에는 이 기기의 옛 지급 기록이 브라우저 관문을 열 수 있다. P2-1 을 끝내면 함께 사라진다.

## 모르는 것 — 추측하지 말고 사용자에게 묻는다

- P0-1: 소급 주문을 환불할지, 프로필을 고르게 한 뒤 지급할지.
- P2-3: 출생지 미입력(서울 기본값)을 어떻게 처리할지.
- P2-4: love-code 를 영구 해금 목록에 남길지.
- P3-1: Play 에서 ₩1,000 가격을 허용하는지, 상품 ID 를 무엇으로 할지.
- P3-5: 궁합 기능을 만들지, 은퇴시킬지.

## 공통 검증

```
npm run check:fast
npm run verify:birth-scope-client-mirror
npm run verify:paid-gate-profile-scope
```
