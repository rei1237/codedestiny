---
status: active
updated: 2026-09-15
next: 5단계 S2 — 스테이징 실 LLM e2e 1회(A2 승인 필요: 과금 LLM 1회 + 스테이징 1,000원 테스트결제·취소). 절차는 아래 "5단계" 절 S2. S1 완료(2026-09-15): SoulCat `09f7954`(`codex/soulcat-staging-login-payment` == `origin/main`), 스테이징 워커 Version `09a0e59b`·Pages `01ace73d`(activation 없음, 28상품 전부 `available:false` 실측) — 2·3·4단계 코드도 스테이징에 실렸다. S3 전에 `wrangler.worker.jsonc` production D1 `database_id` 가 비어 있어 `deploy-production.mjs` 는 `Production isolation failed` 로 거부한다(의도). 이전 기록 — 5단계 운영 노출(RED, 1회 승인 필요 — SoulCat 워크트리 `C:\Users\user\Desktop\SoulCatProject-staging-login-payment`, `codex/soulcat-staging-login-payment` == `origin/main` `9d9247c`, 스테이징 워커는 아직 `498742e` — 2·3·4단계는 다음 `deploy-staging.mjs` 때 실린다). 4단계 탈퇴 연동은 완료(CD `c72551999`, SoulCat `9d9247c`). 5단계 체크리스트에 3단계 robots Sitemap 한 줄과 4단계 프로덕션 `SOULCAT_SERVICE` 바인딩이 묶여 있다. 보류: (a) 스테이징 e2e 1회와 2단계 실쿠키 프리필 확인은 사용자 요청 시에만; (b) 로컬 SoulCat main 워크트리(`C:\Users\user\Desktop\SoulCatProject`)는 그 세션이 정리 후 `git pull --ff-only`.
---

# 영냥이(SoulCat) 편입 — 기존 MID·기존 계정으로 전 서비스 정상 동작시키기

## 확정 사항 (2026-09-15, 사용자)

- **추가 MID 발급 없음.** 결제는 code-destiny.com 의 기존 PortOne 스토어·기존 MID·기존 결제창에서만 일어난다. SoulCat 전용 PortOne 스토어·비밀·별도 webhook 은 폐기 완료(2026-09-15).
- **구조는 하이브리드.** 신원·결제·프로필·SEO·탈퇴는 CD 로 통합, SoulCat Worker + D1 은 앱 상태(책·챕터·무료 운세·출석) 저장소로 유지. Mongo 이식 없음. 병합 전환 기준: 영냥이 월 유료 주문이 CD 유료 주문의 30% 초과, 또는 CD 엔진 정정이 SoulCat `server/vendor/code-destiny/` 사본에 반영되지 않아 결과 차이가 보고될 때.
- **결제 정책(2026-09-15 재확정).** 영냥이 세계는 "다른 차원"이라 **이용권도 월정석도 통하지 않는다.** 카드·카카오페이 단건 결제만 허용(등록소 `paymentScope:"direct_only"`). 홈 밴드·SoulCat 결제 화면에 이 설정을 명시하고 영냥이 대사("이용권? 월정석? 먹지도 못하는 걸 어디에 써? 나는 꽃돼지 연이처럼 그렇게 혜자는 아니야~")를 싣는다.

## 완료된 것

- 0단계 허브 하이재킹 해소(SoulCat 커밋 `d246d48`, codex 브랜치, 워크트리 `C:\Users\user\Desktop\SoulCatProject-staging-login-payment`). 실측: `/fortune/` CD 200, `/yeongnyangi/*`·`/api/yeongnyangi/*` 200. 워커 코드는 롤백된 `2348c4e` 버전이 돌지만 라우트가 없어 옛 302 는 도달 불가. 다음 정식 배포 때 새 코드가 실린다.
- 계정 통합. SoulCat `server/auth.ts` `sharedIdentity()` 가 CD 쿠키(`fortune_auth_token`/`fortune_auth_refresh`)를 Service Binding `AUTH_SERVICE`(→ `code-destiny-web-staging`)으로 CD `/api/auth/me` 에 넘겨 검증. D1 키 `codedestiny:<24hex>`. degraded/token-only 응답은 거부. 변경 불요.
- CD 홈 밴드(스테이징 게이트). `index.html` `<template id="cd-soulcat-navigation-template">` + 인젝터(`data-marker="cd-soulcat-new-world-v20260915"`).
- **1단계 결제 일원화 (2026-09-15 완료, 단건 전용).** CD main `46fbb8402`(레지스트리 28키 `paymentScope:"direct_only"` + `isDirectOnlyPaidFeatureKey` + 서버 5지점 fail-closed + `verify-billing-pass-policy` 분기 + payment-gating 문서 예외) → `c14efbd47`(`worker/routes/yeongnyangi-entitlement.js`: GET 증빙 목록 / POST 소비, `Payment.metadata.consumedBy` 로 멱등, 다른 requestId 는 409 `ALREADY_CONSUMED`) → `96ccbbd40`(`app/checkout/` 호스트 페이지: `runPaidAccessGate` 를 `allowedPaymentModes:["direct"]`+이용권 선검사 3종 off 로 호출, featureKey 는 `yeongnyangi-` 접두만, returnTo 는 `/yeongnyangi/` 접두만) → `b5a14dd10`(홈 밴드 다른 차원 안내 + 영냥이 대사, 미러 6개 sync). SoulCat codex 브랜치 `e612463`(`catalog.ts` `cdFeatureKey`+전 상품 enabled, 신규 `server/payments/cd-entitlement.ts`, `orders.ts` `findPaidOrder`·`grantProofOrder`(payments id `cd:<merchantUid>`), `api.ts` `POST orders` 가 증빙 없으면 402 `{code:"PAYMENT_REQUIRED",checkoutUrl}`·있으면 금액 일치 확인 → consume → grant → prepareBook → dispatch, `FortuneExperience.tsx` 결제 폼 → "<n>원 단건 결제하러 가기" CTA + 다른 차원 각주·대사, `tests/cd-entitlement.test.ts` 4건). SoulCat `origin/main` 은 `6382dd3..e612463` ff 로 push 됨. 스테이징 배포: Pages preview `https://411e82e9.soulcat.pages.dev` → `soulcat-service-staging` Version `f866a967-0fad-45fc-92bb-719e986775f3`. 실측: `/api/yeongnyangi/products` 28개 전부 `enabled:true`·`cdFeatureKey` 노출. 검증: CD `check:fast`+결제 verify 9종 통과, `paid-gate-auditor` 감사 2회; SoulCat `tsc --noEmit`·`npm test` 100/100·`wrangler deploy --dry-run --env staging --config wrangler.worker.jsonc`. 스테이징 e2e(실결제 테스트 모드)는 미수행. 🔴 activation 파일이 없어 스테이징 `ALLOW_LIVE_LLM=false` 이므로 `POST orders` 는 증빙 이전에 503 `LLM_NOT_CONFIGURED` — 책 생성 검증은 activation 절차(`docs/STAGING-LOGIN-PAYMENT-RUNBOOK.md`) 뒤에. 🔴 남은 PortOne 잔재는 규칙 6/9 로 삭제하지 않았다(아래 "남은 것").
- **1단계 후속 PortOne 잔재 삭제 (2026-09-15 완료, SoulCat `1c8965f`, `origin/main` ff).** 삭제: `server/payments/{portone,reconcile,staging-access,customer}.ts`, `api.ts` 의 `payments/webhook`·`payments/verify`·`checkout/customer` 라우트와 webhook origin 예외·`rawBody`, `@portone/browser-sdk`·`@portone/server-sdk`(lock −13줄), `PAYMENTS_ENABLED`(wrangler 3파일·`deploy-staging`·`staging-activation`·`dev-mock`·`dev-with-kasi`·`prepare-release`·`edge.ts` version), `src/lib/checkout.ts` PortOne SDK 코드(`apiRequest`만 남김), `CheckoutRecovery`·`FortuneLibrary` 의 PG 복귀/verify UI, `scripts/verify-{checkout,account}-ui.mjs`(package.json 미배선), `tests/customer.test.ts`. 이동: `stagingProductEnabled`·`validationRun` → `server/providers/budget.ts`; `tests/checkout-budget` → `llm-budget`, `staging-access` → `staging-llm-gate`. `orders.ts` `createOrder(db,userId,productId,profileId,key)` 로 축소, `grantPaidOrder` 제거. 문서 `DOMAIN-INTEGRATION.md`·`STAGING-LOGIN-PAYMENT-RUNBOOK.md` 결제 절을 CD 결제창 정책으로 교체. 의도적으로 남김: `testing/purchase`(APP_ENV=local+mock 전용 픽스처, `FortuneExperience.tsx` 사용), 마이그레이션 `0007`(수정 금지), `server/vendor/code-destiny` 사본, `tests/integration.test.ts` 의 CD 레거시 `/api/payments/webhook` 통과 단언. 검증: `tsc --noEmit` 통과, `npm test` 87/87, `wrangler deploy --dry-run --env staging` 통과(vars 에 `PAYMENTS_ENABLED` 없음). ⚠️ 의미 변화: 스테이징 `BudgetedGemini` 게이트가 `orders.staging_validation_run` 컬럼을 더 이상 요구하지 않는다(허용 계정 ≤3·검증 회차·`saju_mackerel` PAID 주문은 그대로 요구). 🔴 후속 보고: `server/worker-entry.ts:59` 의 `o.staging_validation_run IS NOT NULL` 실 LLM 가드는 이제 아무 코드도 그 컬럼을 쓰지 않아 항상 닫힘(dead) — 큐 소비 경로의 실 LLM 은 별도 정리 전까지 스테이징에서 열리지 않는다. 스테이징 워커 재배포는 하지 않았다(`f866a967` 그대로, `1c8965f` 는 다음 `deploy-staging.mjs` 때 실린다). **비밀 삭제 완료(2026-09-15, 사용자 승인):** staging `PORTONE_*` 는 실측 6종(`API_SECRET`·`CARD_CHANNEL_KEY`·`KAKAO_CHANNEL_KEY`·`KAKAO_TYPE`·`STORE_ID`·`WEBHOOK_SECRET`, 문서의 "7종"은 오기)이었고 `wrangler secret delete --env staging --config wrangler.worker.jsonc` 로 전부 삭제, 남은 secret 은 `GEMINI_API_KEY` 1종. secret 삭제는 워커 새 버전을 만들므로 스테이징은 이제 `f866a967` 코드(구 `e612463`) 가 PortOne 비밀 없이 도는 상태였다. **스테이징 재배포 완료(2026-09-15, 사용자 승인):** `498742e`(= `1c8965f` + 문서 커밋) 에서 typecheck·`npm test` 87/87·build·`verify:seo` 통과 → Pages preview `https://70c19532.soulcat.pages.dev` → `deploy-staging.mjs`(activation 파일 없음) → `soulcat-service-staging` Version `9ed1dd0b-623f-4106-8bad-d69ec6a3b0df`. 실측: `/api/yeongnyangi/version` sha `498742e`·`liveLlmEnabled:false`, `/yeongnyangi/`·`/api/yeongnyangi/products` 200. 구 `payments/verify` 경로는 이제 코드에서도 사라졌다. 역사 문서(`docs/OPERATIONS-READINESS.md`·`PAYMENT-LLM-DELIVERY.md`·`STAGING-READER-DELIVERY.md`·루트 `YEONGNYANGI_*.md`)의 PortOne 언급은 당시 기록이라 손대지 않았다.
- **2단계 프로필 재사용 (2026-09-15 완료, SoulCat `b77e4c3`·`927cd8e`, `origin/main` ff, 스테이징 미배포).** CD 변경 없음(`GET /api/profile/current` 는 기존 라우트, GET 보안 가드 없음, DB 장애는 200 `{ok:false,degraded:true}`). `b77e4c3`: 기존 결함 수정 — `6382dd3` 부터 유료 폼 `FortuneExperience.tsx` `submit()` 이 `BirthFields` 를 읽지 않고 출생지 항상 서울·달력 항상 양력으로 보냈다(음력·윤달·거주지 버려짐). `readBirthFields(data,prefix)` 로 교체, 죽은 `cities` 삭제. ⚠️ 의미 변화: 해외 출생지 사주는 이제 서버 `SAJU_KST_REQUIRED` 안내를 받는다. `927cd8e`: 신규 `server/cd-profile.ts`(`currentCdBirthPrefill` — `sharedIdentity` 와 같은 쿠키 2종·origin·`PUBLIC_ORIGIN` 검사, 10초, `redirect:"manual"`, 어떤 실패든 null; `prefillFromCdProfile` — 1901년 이상 실제 날짜, `lunar_leap`→`lunar`+`leapMonth`, **00:00 은 시간 비움**, `OTHER` 성별 비움, 빈 label·범위 밖 좌표·잘못된 tz 는 출생지 비움, 이름 미노출), `api.ts` `GET /api/yeongnyangi/cd-profile`(identity 확인 뒤, local 은 null), `src/lib/cd-profile.ts` 페이지당 1회 캐시 훅, `BirthFields` `cdPrefill` prop(빈 폼일 때만 1회 적용, 성별 select controlled, `PlaceSearch initial`, 안내 "코드 데스티니에 저장한 대표 프로필로 채워뒀어…"), 호출부 `FortuneExperience` a 만·`DailyWords`. 검증: `tsc --noEmit` 0, `npm test` 90/90(신규 `tests/cd-profile.test.ts` 3건), `wrangler deploy --dry-run --env staging --config wrangler.worker.jsonc` 통과(`AUTH_SERVICE`→`code-destiny-web-staging`), 로컬 mock 8791 스크래치 Playwright 11항목 통과(음력 윤4월 2020-04-15+부산 직접 입력 → D1 `originalCalendar{type:lunar,leapMonth:true}`·양력 `2020-06-06`·위도 35.1796; `page.route` 픽스처 프리필 → 그대로 제출해 차트 단계 진입; 숙요 궁합 b 비움; 입력 도중 늦게 온 프리필 무시; 시간 없는 카드는 시간 칸 비움+안내; 로컬 실엔드포인트는 빈 폼), `visual-checker` 390px 2장 통과(안내 대비 11.37:1). 로컬 mock D1 은 `.wrangler/` 대신 스크래치 `--persist-to` 에 마이그레이션 적용(기본 `.wrangler` 로컬 D1 은 테이블이 없어 `POST session` 500).
- **3단계 SEO 오픈 — SoulCat 쪽 완료 (2026-09-15, SoulCat `d2c9286`, `origin/main` ff, 스테이징 미배포).** `src/app/layout.tsx` 전역 `robots noindex` 삭제 — 스테이징·Pages preview 는 여전히 noindex(`server/edge.ts:127` 가 `APP_ENV !== "production"` 이면 `X-Robots-Tag: noindex, nofollow`, `prepare-release` `_headers` `/*` noindex 는 production 에서 edge 가 지움). library 는 페이지 메타+edge 둘 다 noindex, share 는 edge noindex 그대로. `/yeongnyangi/robots.txt` `Disallow: /`→`Allow: /`(크롤러는 호스트 루트 robots 만 읽으므로 실효는 없음). `seo.ts` `canonicalPath` 필드 추가: terms→CD `/terms/`, privacy→`/privacy/`, refund→`/refund-policy/`(CD `/refund` 는 `/refund-policy/` 로 수렴) + 세 개 sitemap 제외; `ggulggul-fortune` sitemap 제외(색인은 유지). SoulCat sitemap 실측 13 URL: `/yeongnyangi/`·`fortune/`·`room/`·`contact/`·`free-fortune/`·`1000-won-fortune/`·`about/`+6체계. `verify-seo.mjs` 를 새 정책(공개 페이지 robots 메타 없음, 법무 canonical, sitemap 포함/제외, robots Allow)으로 교체, `tests/staging-llm-gate.test.ts` 에 production 헤더 테스트 1건(공개 화면 x-robots-tag 제거, library 유지). 검증: `tsc --noEmit` 0, `npm run build` 통과, `verify:seo` 통과, `npm test` 91/91. **계획과 다르게 한 것:** CD `generate-sitemap.mjs` `coreRoutes` 등록은 하지 않았다 — `isPublicSitemapPath` → `isLiveRoute`(`scripts/lib/live-route-matcher.mjs:77`)가 CD `app/` 페이지나 정적 HTML 이 없는 경로를 조용히 걸러내고, 억지로 넣어도 `verify-adsense-readiness` 가 `out/` HTML 을 읽어 막는다. SoulCat 이 이미 `/yeongnyangi/sitemap.xml` 을 만들므로 CD 쪽은 루트 `robots.txt`(+`public/robots.txt`)에 `Sitemap: https://code-destiny.com/yeongnyangi/sitemap.xml` 한 줄이 정답이고, 그 줄은 운영 승격 즉시 404 sitemap 을 가리키게 되므로 5단계 릴리스에서 넣는다. CD 색인 판정 5개소는 `/yeongnyangi/*` 가 CD 트리에 없어 해당 없음.
- 주제 카드·초융합 모달 (2026-09-15, SoulCat codex 브랜치 `1ec222e`·`f2ab966`·`ba20e2f`, ff 머지, `e612463` 과 함께 push·배포됨, `498742e` 재배포 후 스테이징 브라우저 실측: 홈 카드 4개 링크, 모달 리스트 4장·CTA 0·grid 0·390/1280px 페이지 오류 0). 홈 "영냥이가 골라봤어" 4카드가 `/yeongnyangi/fortune/?domain=…&topic=love|money|year|relationship` 링크로 유료 책 파이프라인에 직진. 서버 `server/fortune/topics.ts` 가 topicId 허용목록 정본(`year` 추가). `readingManifest` 는 single 상품에서 행 집합·id 는 그대로 두고 주제 챕터를 `self` 다음으로 올려 `연애운 · ` 접두, 커버 packageName 은 `재물운 참치`. 모달은 융합 4상품만 `FishCatalog layout="list"`. 검증: typecheck·`npm test`(vendored saju 해시 1건은 새 워크트리 CRLF 체크아웃 탓, 코덱스 워크트리에서는 통과)·mock 8791 Playwright(홈 링크 4개, 모달 리스트 4장/CTA 0/가로 오버플로 0, 4주제 URL 입력 단계 직진, 잘못된 topic 은 선택 화면 폴백). 후속: `scripts/verify-fusion-ui.mjs`·`verify-fusion-final.mjs` 는 로그인 도입 전 기준이라 차트 단계에서 멎는다(경로만 `/yeongnyangi` 로 고침); 비융합 `FishCatalog` grid 경로 사용처 0(삭제는 별도); `books.ts` summary.title 미반영; `sukuyo&topic=relationship` 은 궁합 모드 강제(personB 필수).

## 1단계. 결제 일원화 (완료 2026-09-15 — 아래는 설계 기록. 실제 구현과 다른 점: `/checkout/` 은 신규 App Router 페이지로 만들었고, 이용권 제외는 `entitlement-policy.js` 가 아니라 레지스트리 `paymentScope:"direct_only"` 한 곳이 정본이며 월정석도 막는다. 증빙원은 `Payment` 단일(직접 결제만). `checkout-entry.js`·`portone.ts` returnTo 수정은 불필요했다 — `/checkout/` 페이지가 PortOne 복귀를 받아 `usePaidResume` 으로 returnTo 를 되살린다.)

### 목표 흐름

1. 사용자가 SoulCat 화면(`/yeongnyangi/fortune/`)에서 어종을 고른다.
2. SoulCat 은 결제를 직접 열지 않고 CD 결제 진입으로 보낸다: `/checkout/?featureKey=yeongnyangi-saju-mackerel&returnTo=/yeongnyangi/fortune/?profile=<id>&domain=saju`. 결제창·결제수단 선택·PortOne 호출·webhook·증빙 기록은 전부 CD 기존 코드가 처리한다.
3. 결제 완료 후 CD 가 `returnTo` 로 돌려보낸다. SoulCat 은 `POST /api/yeongnyangi/orders` 에서 CD 증빙 조회 API 를 Service Binding 으로 호출해 미소비 증빙이 있으면 `fortune_requests` 를 만들고 Queue 에 넣는다. 증빙은 requestId 로 소비 표시한다.
4. 책 생성·보관함·공유는 기존 SoulCat 파이프라인 그대로.

### CD 측 작업

- `worker/lib/paid-feature-registry.js`
  - `RAW_FEATURE_KEY_PRICE_TABLE` 에 키 추가. SoulCat `server/payments/catalog.ts` 의 6 체계(saju·sukuyo·ziwei·vedic·astrology·tarot) × 4 어종(mackerel 1,000 / salmon 3,000 / flounder 5,000 / tuna 10,000) + 퓨전 4종(모둠 20,000·오마카세 30,000 등)을 `yeongnyangi-<system>-<tier>` 로 매핑. `cost` 는 `amountKRW / KRW_PER_COIN(100)`.
  - `PER_USE_PAID_FEATURE_KEY_LIST` 에 전부 등록(회당 결제). 언락 테이블에는 넣지 않는다.
  - `FRONTEND_PAID_FEATURE_KEYS` 에도 포함해야 결제창 진입이 키를 인식한다.
  - 🔴 `resolveByFeatureReason` 이 `resolveByFeatureKey` 보다 우선한다(`:157-167`). reason 테이블에는 넣지 말 것.
- 이용권 제외: `worker/lib/entitlement-policy.js` `resolveFeatureAccessPolicy` 에서 `yeongnyangi-` 접두 키를 passExcluded 로 판정. 월정석·카드·카카오는 허용. 정책 한 줄을 `docs/context/payment-gating.md` 에 추가.
- 증빙 조회 API(신규, Service Binding 전용): `GET /api/yeongnyangi-entitlement?featureKey=…` — `worker/index.js` 디스패치에 추가. 요청은 `/api/auth/me` 와 같은 쿠키 검증을 거치고, 응답은 `{ userId, featureKey, proofs:[{ source, id, paidAt, consumedBy }] }`. 증빙 4원(`PaidExecutionRecord`·`Payment`·`PointHistory`·`MonthlyCreditLedger`)은 `worker/routes/vedic-ai.js:633-636` 의 조회 방식을 그대로 재사용한다. `POST` 로 `consumedBy=<requestId>` 를 기록하는 소비 엔드포인트도 같은 파일에 둔다(idempotent, `IdempotencyKey`).
- 결제창 `returnTo` 허용: `js/core/checkout-entry.js` 와 `lib/payment/portone.ts` 의 복귀 경로 검증에 `/yeongnyangi/` 접두를 허용. 외부 origin 은 계속 거부.
- 가장 가까운 기존 구현: `worker/routes/vedic-ai.js`(상수 선언 `:32-39`, `getBillingFeaturePricing` `:376`, 증빙 확인 `:633-636`).
- 결제창 렌더러 3종은 건드리지 않는다. featureKey 등록만으로 기존 결제창이 그대로 쓰인다.

### SoulCat 측 작업 (codex 브랜치 워크트리)

- `server/payments/catalog.ts`: product 에 `cdFeatureKey` 필드 추가, `enabled:true` 로 전환(판매 여부는 CD 레지스트리가 결정).
- `server/api.ts`
  - `POST orders`: PortOne 파라미터 생성·`PAYMENTS_ENABLED`·`requireStagingProduct` 분기를 제거. 대신 `AUTH_SERVICE.fetch("/api/yeongnyangi-entitlement?featureKey=")` 로 미소비 증빙을 찾고, 없으면 402 `{ code:"PAYMENT_REQUIRED", checkoutUrl }` 을 돌려준다. 있으면 `createOrder`(status PAID, `payment_id` 에 CD 증빙 id)·`entitlements` ACTIVE·`prepareBook`·Queue 투입 후 CD 소비 엔드포인트 호출.
  - `payments/webhook`·`payments/verify`·`checkout/customer`·`testing/purchase` 삭제. `server/payments/portone.ts` 와 `@portone/server-sdk` 의존 제거.
  - `budget.ts` `productBudgetReady`·`LLM_VERIFIED_PRODUCTS` 게이트는 유지(LLM 예산은 SoulCat 책임).
- `src/components/FortuneExperience.tsx`·`RoomConsultation.tsx`: 유료 CTA 를 `checkoutUrl` 로 이동하는 링크로 교체. "준비 중" 각주는 CD 레지스트리에 키가 없을 때만 표시.
- `wrangler.worker.jsonc` staging vars `PAYMENTS_ENABLED` 삭제. `scripts/deploy-staging.mjs` 의 `paymentsEnabled !== false` 검사와 `staging-activation.mjs` 의 결제 활성화 항목 제거.
- 비밀 정리: `wrangler secret delete --env staging` 으로 `PORTONE_*` 제거 — 완료(6종, 2026-09-15).
- 문서: `docs/DOMAIN-INTEGRATION.md` 의 "별도 MID·기존 이용권 미적용·주문 미이관" 조항 폐기, `docs/STAGING-LOGIN-PAYMENT-RUNBOOK.md` 의 activation 파일 결제 절차 폐기.

### 검증 (전부 mock, 실결제 금지)

- CD: `npm run check:fast`, `verify:paid-feature-billing-policy`, `verify:ai-prompt-billing-policy`, `verify:billing-pass-policy`, `verify:portone-single-payment`, `verify:paid-gate-ui`, `verify:payment-choice-parity`, `verify:checkout-pass-card`. `paid-gate-auditor` 에이전트로 커밋 전 감사.
- SoulCat: `npm test`, `tsc --noEmit`, `wrangler deploy --dry-run --env staging`.
- 스테이징 e2e: 스테이징 1,000원 테스트 모드(`PAYMENT_TEST_AMOUNT_KRW`, CD `worker/lib/portone.js`)로 `yeongnyangi-saju-mackerel` 1회 → `returnTo` 복귀 → `POST orders` 200 → 책 5챕터 생성(LLM mock) → 보관함 표시. 이후 해당 주문 취소.
- 판정: 로그인 없이 CTA → CD 로그인 → 결제창 → 복귀 → 책 생성까지 새로고침 없이 이어지면 완료.

### 롤백

CD 는 레지스트리·API 커밋 revert. SoulCat 은 커밋 revert 후 `scripts/deploy-staging.mjs` 재배포. 두 쪽 모두 DB 스키마 변경이 없으므로 데이터 롤백 불요.

### 배포 함정 (0단계에서 실측)

SoulCat 워커는 반드시 `node scripts/deploy-staging.mjs <immutable-preview-url>` 로 배포한다. `wrangler deploy` 직접 호출은 `SOULCAT_PAGES_ORIGIN`·`RELEASE_SHA` 가 빠져 `/yeongnyangi/*` 전체가 503 이 된다. 스크립트는 고정 Pages preview 의 SHA 가 HEAD 와 같아야 하므로 새 커밋 뒤에는 build → Pages preview 업로드가 선행된다. 사고 시 `wrangler rollback --env staging` 으로 즉시 복구.

## 2단계. 프로필 재사용 (SoulCat)

`sharedIdentity()` 와 같은 방식으로 `AUTH_SERVICE.fetch("/api/profile/current")` 를 호출해 `ProfileCard`(`name`·`gender M|F|OTHER`·`birth{year,month,day,hour,minute,calType}`·`location{tz,lng,lat}`)를 SoulCat `profiles.input_json` 으로 프리필. SoulCat 자체 profiles 테이블은 유지.

## 3단계. SEO 오픈 (운영 노출과 함께)

> 2026-09-15 SoulCat 쪽 완료(`d2c9286`). 아래 CD `coreRoutes` 방식은 `isLiveRoute` 때문에 동작하지 않아 폐기 — CD 루트 `robots.txt` Sitemap 한 줄로 대체하고 5단계에서 넣는다(위 "완료된 것" 참조).

CD `scripts/generate-sitemap.mjs` `coreRoutes` 에 `/yeongnyangi/`·`/yeongnyangi/fortune/`·`/yeongnyangi/room/` + SoulCat `seoRoutes` 의 `includeInSitemap:true` 9개 등록, 색인 판정 5개소 동기(`docs/context/seo-and-adsense.md:64-76`). SoulCat `src/app/layout.tsx:11` 전역 noindex 해제, `src/app/yeongnyangi/robots.txt/route.ts` Disallow 제거, library·share 는 noindex 유지. `/yeongnyangi/terms|privacy|refund` 는 CD 법무 페이지로 canonical. `/yeongnyangi/ggulggul-fortune/` 은 CD `/kkul-kkul-unse` 와 키워드 경쟁하므로 sitemap 제외.

## 4단계. 탈퇴 연동 (RED, 양 레포)

> 2026-09-15 완료 — CD `c72551999`, SoulCat `9d9247c`(`origin/main` ff). 스테이징은 둘 다 미배포: CD 바인딩은 이 push 의 스테이징 배포에, SoulCat 라우트는 다음 `deploy-staging.mjs` 에 실린다. 순서상 SoulCat 이 먼저 올라가야 스테이징 탈퇴가 `deleted` 가 된다(그 전엔 구 워커가 라우트 없음 오류를 줘 `failed/http_error` 로 예상 — 미실측, 어느 경우든 탈퇴 자체는 성공).

- **SoulCat `9d9247c`.** 신규 `server/account.ts` `deleteAccount(db,userId)` — 21개 DELETE 를 자식→부모 순서로 한 `db.batch`(트랜잭션)에 담는다(D1 외래 키 강제). 대상: fortune_shares·reading_progress·outbox·chapters·books·results·llm_reservations·fortune_requests·entitlements·order_chart_links·order_specs·payments·orders·chart_domain_contexts·chart_snapshots·profiles·daily_messages·anchovy_ledger·free_readings·sessions·users. 제외: `payment_webhooks`(사용자 열 없음)·`place_search_*`(공용 캐시). `api.ts`: 모든 `DELETE` 에 origin 동일 검사(403 `INVALID_ORIGIN`), identity 확인 뒤 `DELETE account` → `{ok:true,deletedRows}`(멱등, 두 번째도 200). 삭제된 책의 큐 메시지는 `runBookStep` 이 false → ack 라 재시도 루프 없음. 테스트 `tests/account.test.ts` 2건(두 사용자 21테이블 시드 → 검증된 사용자만 2→1, 재호출 200 / 외부 origin 403·쿠키 없음 401 무변경). 검증: `tsc --noEmit` 0, `npm test` 93/93.
- **CD `c72551999`.** 신규 `worker/lib/soulcat-account.js` `deleteSoulCatAccount(request, env)` — `env.SOULCAT_SERVICE.fetch` 로 `DELETE ${SITE_BASE_URL}/api/yeongnyangi/account`, 헤더는 인증 쿠키 2종만(없으면 Bearer → `fortune_auth_token=`)·`origin`=`SITE_BASE_URL`, 8초 타임아웃, `redirect:"manual"`, 던지지 않고 `{status:"deleted"|"skipped"|"failed", reason?, httpStatus?}` 반환. `handleWithdraw`: **비밀번호 확인 뒤·User 비식별화 전**에 호출(뒤에 부르면 SoulCat `sharedIdentity` → CD `/api/auth/me` 가 탈퇴 계정을 거부해 항상 실패). 실패는 탈퇴를 막지 않고 `partialFailure=true` + `console.error` + `deleted_account_logs.soulcatCleanup` 에 결과 저장 — 이것이 재시도 목록이다(탈퇴 후엔 쿠키가 무효라 자동 재시도 불가, 운영자가 SoulCat D1 에서 `codedestiny:<userId>` 로 직접 지워야 한다). 바인딩 없는 환경은 `skipped/binding_missing`(partialFailure 아님). `worker/wrangler.staging.toml` 에 `[[services]] SOULCAT_SERVICE → soulcat-service-staging` 추가 — **사용자 승인한 1회 예외**(같은 존 route 워커끼리는 공개 URL fetch 불가, 바인딩만 됨). `scripts/verify-worker-config-parity.mjs` 에 `services.SOULCAT_SERVICE.{binding,service}` 를 STAGING_ONLY_KEYS 로 분류. 테스트 `auth.withdraw.test.js` +4건(바인딩 없음 skipped / 호출 URL·origin·쿠키만 전달·비식별화보다 먼저 / 503·예외에도 200+partialFailure+비식별화 진행 / 비번 오류 403·이미 탈퇴 409 는 호출 안 함). 검증: withdraw jest 26/26(호출 순서 변이로 무는 것 확인), `test:worker:auth-payments` 599/599, `verify:worker-config-parity`·`verify:worker-no-undef`·`verify:entry-encoding --strict-core` OK, `build:worker`(dry-run) 통과. CI Critical checks 가 parity **self-test** 픽스처(`BASE_STAGING` 에 services 블록 없음)에서 실패해 `35bffefce` 로 수정 — 로컬 `--self-test` 19건 통과, 그 커밋 CI 는 Critical checks 가 skipped 라 CI 재확인은 다음 위험 lane 실행 때. 남은 main CI 실패는 이 변경과 무관한 기존 `sitemap:check` 드리프트(`468372ee6` 이전부터)와 AI Locale Gate `recoverGeomancy`. `check:fast` 는 기존 CRLF 헛실패(`integrity-unique-index-spec`, `models.js` 미변경)에서 멈춤 — 나머지는 개별 실행으로 대체. 실제 스테이징 e2e 탈퇴는 미수행.
- ⚠️ 의미 변화·위험: (a) `llm_reservations` 가 요청과 함께 지워져 그날 LLM 예산 합계가 줄어든다(일일 상한이 그만큼 느슨해짐); (b) SoulCat 삭제 뒤 CD 비식별화가 실패(500)하면 SoulCat 데이터만 사라진 채 사용자가 재시도 — 삭제가 멱등이라 재시도는 안전; (c) 프로덕션은 5단계 전까지 바인딩이 없어 모든 탈퇴가 `skipped` 로 기록된다(SoulCat production 도 아직 없으므로 지울 데이터도 없음).

## 5단계. 운영 노출 (RED, 1회 승인)

### 확정 계획 (2026-09-15, 사용자 승인 — 배포·과금 승인 A1~A5 는 각 세션에서 따로 받는다)

**사용자 결정: 유료는 `saju_mackerel`(1,000원 고등어 사주) 1종만.** 나머지 27종은 "준비 중".

실측 출발점(2026-09-15):
- 운영 CD `78c4a554a` 는 main 보다 148커밋 뒤 — 1~4단계 커밋 전부 없음, `code-destiny.com` `/checkout/`·`/yeongnyangi/`·`/api/yeongnyangi/products` 모두 404.
- SoulCat `origin/main` `9d9247c`, 스테이징 워커 `498742e`(2·3·4단계 미반영).
- SoulCat `wrangler.worker.jsonc` `env.production`(:94-109) 은 `APP_ENV`·`PUBLIC_ORIGIN`·`AUTH_SERVICE→code-destiny-web`·mock·`ALLOW_LIVE_LLM=false` 만 있다. name·routes·D1·Queue/DLQ·cron·LLM 예산 vars·production 배포 스크립트 없음.
- `api.ts:331-332` LLM·예산 게이트가 `:341-348` 증빙 조회·402 checkoutUrl 보다 먼저 돈다 → 미개방 상품은 결제창 전에 503(제품 안에서는 돈만 받고 책 없음이 안 생김). 무료 운세는 LLM 미사용(`server/fortune/free/`).
- `productBudgetReady`(budget.ts:37-48): production 은 `LLM_VERIFIED_PRODUCTS[id]={model,chapters:5,maxKRW>0,manifestVersion:"destiny-book-v4",outputTokens:4096}` 필요 → 1종만 등록하면 1종만 열린다. `budgetConfig` 는 production 에 `LLM_COST_MODE=metered` 요구, `LLM_PRICING_VALID_UNTIL` 만료 시 조용히 503.
- v4 매니페스트는 실제 LLM 검증 이력 없음(RUNBOOK:18 "기존 실제 검증은 v3").
- CD: 홈 밴드 게이트 `index.html:20347` `location.hostname!=='staging.code-destiny.com'`(미러 6개 동일), 문구 `:20325`·`:20340`. 운영 `/robots.txt` 정본은 **`app/robots.ts:93`**(정적 두 파일은 폴백). 운영 `worker/wrangler.toml` 에 `[[services]]` 없음. 운영 승격 워크플로는 CI 녹색을 기다리지 않고 자체 검사(`verify:worker-config-parity`·`verify:sitemap` 등)만 돈다. www 는 apex 로 301. CD 개인정보처리방침·`lib/legal` 에 Gemini·국외이전 문구 없음(`git grep -i "gemini\|국외"`).

| 세션 | 내용 | 운영 영향 | 승인 |
|---|---|---|---|
| S1 | SoulCat 코드 준비 + 스테이징 재배포 | 없음 | A1 스테이징 배포 |
| S2 | 스테이징 실 LLM e2e 1회(maxKRW 실측·v4 품질 확인) | 없음 | A2 과금 LLM 1회 + 스테이징 1,000원 테스트결제·취소 |
| S3 | SoulCat 운영 리소스 생성 + 운영 배포(LLM OFF) | `/yeongnyangi/*` 공개(무료만) | A3 |
| S4 | CD 운영 릴리스 + SoulCat 유료 1종 활성화 | 홈 밴드·checkout·유료 1종 | A4·A5 |

**S1. SoulCat 코드 준비**(워크트리 `C:\Users\user\Desktop\SoulCatProject-staging-login-payment`)
1. `src/lib/seo.ts` 결제 일원화 이전 문안 10곳 교체(terms :55/:72/:89, privacy ~:98/:111, refund :155/:174, ggulggul-fortune :351, 1000-won-fortune :431, about :464) — CD 결제창·카드/카카오페이 단건·이용권·월정석 미적용·환불은 CD `/refund-policy/`. `verify:seo` 통과 유지.
2. `server/api.ts:126` `GET products` 에 상품별 `available`(`:331` 조건 + `productBudgetReady` try/catch 재사용, 새 판정 로직 금지). `FortuneExperience.tsx:445` CTA·카탈로그는 `available:false` 면 "준비 중" 비활성. 테스트 1건(`tests/staging-llm-gate.test.ts` 패턴: production + verified 1종 → 그 상품만 true).
3. `wrangler.worker.jsonc` `env.production` 완성(커밋 상태 LLM OFF): `name:"soulcat-service-production"`, routes 5개(`code-destiny.com/yeongnyangi*`·`/share/yeongnyangi/*`·`/_soulcat`·`/_soulcat/*`·`/api/yeongnyangi/*`), D1 `DB→soulcat-fortune-production`(id 는 S3), Queue `soulcat-book-production`+`-dlq`(staging 과 같은 consumer 설정), cron `*/2 * * * *`, vars `LLM_TIMEOUT_MS=60000`·`LLM_MAX_RETRIES=2`·`LLM_MAX_INPUT_TOKENS=32000`·`LLM_MAX_OUTPUT_TOKENS=4096`. 기존 `soulcat-fortune`(172413ab) 재사용 금지(`DOMAIN-INTEGRATION.md:47-49`).
4. 신규 `scripts/deploy-production.mjs` — `deploy-staging.mjs` 복제·반전(8hex preview, clean tree, version.json sha==HEAD·digest, 모든 route 가 `code-destiny.com/` 시작, service 에 `-staging` 금지, `--var RELEASE_SHA/RELEASE_SOURCE_DIGEST/SOULCAT_PAGES_ORIGIN`, activation 파일 선택 인자).
5. 신규 `scripts/production-activation.mjs` — allowlist. `LLM_PROVIDER=gemini`·`ALLOW_LIVE_LLM=true`·`LLM_COST_MODE=metered`·`GEMINI_MODEL==GEMINI_PRICING_MODEL`·가격 3종>0·미래 `LLM_PRICING_VALID_UNTIL`·`LLM_VERIFIED_PRODUCTS` 키는 정확히 `saju_mackerel`. 테스트 1건(2종·test 모드·만료 거부).
6. production 빌드는 `NEXT_PUBLIC_CODE_DESTINY_ORIGIN=https://code-destiny.com`(`src/lib/service-links.ts:8-10` staging 폴백 회피). `docs/DOMAIN-INTEGRATION.md` 에 production 배포·롤백 절.
7. 검증: `tsc --noEmit`, `npm test`, `npm run build`, `verify:seo`, `wrangler deploy --dry-run` staging·production. ff push. **A1**: build → Pages preview → `deploy-staging.mjs <preview>`(activation 없음) → `/api/yeongnyangi/version` sha·products 전부 `available:false` 실측.

**S2. 스테이징 실 LLM e2e 1회(A2).** 로컬 미커밋 activation(`LLM_STAGING_VALIDATION_MANIFEST=destiny-book-v4`, 운영자 CD 계정 1개, 예산 ≤1,000원) → 로그인 → 고등어 CTA → 402 → `/checkout/` → 1,000원 테스트 모드 결제 → 복귀 → `POST orders` 200 → 5챕터 → 보관함 → consume 멱등 확인. maxKRW 는 스테이징 D1 `llm_reservations` 해당 request `SUM(COALESCE(charged,reserved))` × 1.5 올림(근거 기록). 사용자 책 품질 확인 → CD 관리자 경로로 테스트결제 취소 → activation 없이 스테이징 재배포. 같이: 스테이징 탈퇴 연동 1회(`soulcatCleanup.status=deleted`·D1 행 0), 실쿠키 프리필 1회.

**S3. SoulCat 운영 리소스 + 배포, LLM OFF(A3).** (1) 읽기 조회로 이름 미사용 확인(`wrangler deployments list --name soulcat-service-production`, `d1 list`, `queues list`). (2) `wrangler d1 create soulcat-fortune-production`, `queues create soulcat-book-production`·`-dlq` → id 커밋. (3) 새 빈 D1 에 `wrangler d1 migrations apply soulcat-fortune-production --env production --config wrangler.worker.jsonc --remote`(0001~0007; 0007 은 `worker-entry.ts:59` 쿼리 때문에 필수) — 신규 DB 스키마 생성으로 승인 범위 명시. (4) `GEMINI_API_KEY` 는 사용자가 직접 `wrangler secret put --env production`. (5) production origin build → Pages preview(branch `production-release`) → `deploy-production.mjs <preview>` — SoulCat 은 CI 배포가 없어 로컬 운영 배포 1회 예외로 명시. (6) 실측: `code-destiny.com/yeongnyangi/`·`/yeongnyangi/sitemap.xml`·`/_soulcat/assets/hero-800.webp` 200, `/yeongnyangi/` 에 `x-robots-tag` 없음·`/yeongnyangi/library/` 에는 있음, version sha==HEAD, products 전부 `available:false`, CD `/api/version` 200, 비로그인 `POST /api/yeongnyangi/orders` 401.

**S4. CD 운영 릴리스 + 유료 1종(A4·A5).** 시작 전 `git status` 로 다른 세션 미커밋(현재 `marketing/`) 확인, 쓰는 세션 둘 이상이면 워크트리.
1. 밴드 `index.html:20345-`: 게이트를 staging+apex 로, **fail-closed** — `/api/yeongnyangi/products` 200 이고 `saju_mackerel.available===true` 일 때만 template 삽입. `:20325`·`:20340` 준비 중 문구 → 오픈 문구(예 "🐟 고등어 사주 1,000원 · 단건 결제"). `npm run sync:public`, 미러 6개 함께 커밋.
2. robots: `app/robots.ts:93`·`robots.txt`·`public/robots.txt` 에 `Sitemap: https://code-destiny.com/yeongnyangi/sitemap.xml`(S3 200 확인 뒤).
3. `worker/wrangler.toml` `[[services]] SOULCAT_SERVICE → soulcat-service-production`(구조 변경, A4 명시). `verify-worker-config-parity.mjs` STAGING_ONLY_KEYS :93-94 삭제, `.service` 를 MUST_DIFFER_KEYS 로, fixture `BASE_PRODUCTION`(:389-415) 에 services 블록, 주석 이름 갱신, `--self-test` 통과.
4. 로컬: `check:fast`, parity + `--self-test`, `verify:sitemap`, withdraw jest. 커밋 3개(밴드/robots/바인딩) → push → main CI.
5. 승격 전: `node scripts/verify-merge-landed.mjs --check=drift --json --soft --base=origin/main --origin=https://code-destiny.com` 로 미반영 148+커밋 요약 보고, 스테이징 `npm run verify:release`.
6. **A4** `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` → run URL 전달(폴링 안 함) → 실측: `/checkout/` 200, 밴드 미표시(fail-closed), `/robots.txt` Sitemap 줄, `/api/version` sha.
7. **A5** 로컬 미커밋 `production-activation.json`(maxKRW=S2 실측, 가격 vars 는 사용자가 현행 Gemini 단가 확인) → 같은 SHA preview 로 `deploy-production.mjs <preview> production-activation.json` → 실측: `saju_mackerel` 만 `available:true`, 밴드 표시, 로그인 `POST orders` 402 checkoutUrl, 결제창 **열림까지만**(운영 실결제 금지, 필요 시 별도 승인).

**롤백.** S1: `wrangler rollback --env staging` 또는 이전 preview 재배포. S3: `wrangler rollback --env production`, 노출 철회는 routes 뺀 config 재배포(새 D1·Queue 는 남겨도 무해). S4 CD: 같은 워크플로 `mode: rollback` + `worker_version_id`/`pages_deployment_id`(`npm run deploy:rollback -- --list`), 코드는 해당 커밋만 `git revert`. A5: activation 없이 같은 preview 재배포 → 결제창 전 503. 바인딩 없는 CD 로 롤백해도 탈퇴는 `skipped` 기록만.

**남는 위험(보고).** (a) CD `/checkout/` 은 `yeongnyangi-` 28키를 다 받는다 — URL 직접 조작으로 미개방 상품을 결제하면 SoulCat 이 소비 전 503 → 수동 환불. 방어(checkout 에서 `available` 선검사)는 결제 코드라 후속. (b) `LLM_PRICING_VALID_UNTIL` 만료 시 조용히 판매 중단 — 갱신일 기록, 결제된 증빙은 미소비로 남아 재활성 후 재시도 가능. (c) 결제 후 생성 FAILED/UNCERTAIN 은 자동 환불 없음(`PAYMENT-LLM-DELIVERY.md:52`). (d) 법무: CD 개인정보처리방침에 Gemini 국외이전 문구 없음, RUNBOOK:120-122 §13·§17·국외이전 미결 — 운영 판매 전 사용자 판단, 문안은 GREEN 별도 커밋. (e) 운영 승격에 1~4단계 외 148커밋 동반. (f) 없는 service 바인딩이 CD 배포를 실패시키는지는 미실측 — S3→S4 순서로 회피.

### 이전 메모 (계획 확정 전)

SoulCat production env 에 routes/D1/Queue 생성, `AUTH_SERVICE` 는 `code-destiny-web`. CD 인젝터 게이트를 `code-destiny.com` 까지 확장, 홈 밴드 "🐟 생선가게 준비 중"·"영냥이가 손님 맞을 준비 중" 제거. 3단계 SEO 오픈을 같은 릴리스에 묶는다: CD 루트 `robots.txt` 와 `public/robots.txt` 의 Sitemap 목록에 `Sitemap: https://code-destiny.com/yeongnyangi/sitemap.xml` 추가(SoulCat production 이 200 을 준 뒤에만), SoulCat production `APP_ENV=production` 확인(이 값이 edge noindex 해제 스위치다), 배포 후 `curl -sI https://code-destiny.com/yeongnyangi/` 에 `x-robots-tag` 없음·`/yeongnyangi/library/` 에는 있음을 실측. 4단계 탈퇴 연동도 같은 릴리스: CD `worker/wrangler.toml` 에 `[[services]] SOULCAT_SERVICE → soulcat-service`(SoulCat production 워커 이름으로 실측 확인, `wrangler.toml` 구조 변경이라 승인 범위에 명시) 추가, `verify-worker-config-parity.mjs` 의 STAGING_ONLY_KEYS 에서 `services.SOULCAT_SERVICE.*` 두 줄 삭제 + `.service` 를 MUST_DIFFER_KEYS 로 이동. 바인딩은 SoulCat production 배포 **뒤**에 넣는다(없는 서비스 바인딩은 CD 워커 배포를 실패시킬 수 있다 — 미실측).

## 남은 것

- [x] 1단계 결제 일원화 (CD `46fbb8402`…`b5a14dd10`, SoulCat `e612463`, 스테이징 `f866a967`)
- [x] 1단계 후속 — SoulCat PortOne 잔재 삭제(SoulCat `1c8965f`, 3면 grep 완료) + staging `PORTONE_*` 비밀 6종 삭제(2026-09-15 승인). 스테이징 워커 `498742e` 반영(Version `9ed1dd0b`). 후속: `worker-entry.ts:59` dead 가드 정리.
- [ ] 1단계 후속 — 스테이징 e2e 1회(사용자 요청 시): activation 으로 `ALLOW_LIVE_LLM` 을 켠 뒤(LLM 은 mock/test 예산) 1,000원 테스트 모드 결제 → 복귀 → `POST orders` 200 → consume 멱등 확인 → 주문 취소.
- [ ] 로컬 SoulCat main 워크트리(`C:\Users\user\Desktop\SoulCatProject`, `main`@`6382dd3`)는 다른 세션 미커밋 75수정+18신규 파일(브랜치 변경 파일 23개와 겹침) 때문에 ff 하지 않았다. 그 세션이 커밋/정리 후 `git pull --ff-only`(origin/main = `e612463`).
- [x] 2단계 프로필 재사용(SoulCat `b77e4c3` 폼 제출 결함 수정 + `927cd8e` CD 대표 프로필 프리필). 후속: (a) CD `ProfileCard` 에 "시간 모름" 필드가 없어 00:00 을 비울 수밖에 없다 — 실제 자정 출생자는 다시 입력; (b) CD fetch 헬퍼가 `auth.ts`·`payments/cd-entitlement.ts`·`cd-profile.ts` 3중 복제; (c) 다음 스테이징 배포 뒤 실제 CD 쿠키로 프리필 1회 확인(사용자 요청 시).
- [x] 3단계 SEO 오픈 — SoulCat 쪽(`d2c9286`). CD `robots.txt` Sitemap 한 줄은 5단계 체크리스트로 이관. 후속(보고만): SoulCat SEO·법무 문안이 결제 일원화 이전 서술 — `seo.ts` terms/refund "SoulCat 결제 화면·별도 상품 카탈로그", privacy "준비 중인 로그인·보관함을 실제 저장 기능처럼 안내하지 않습니다", about FAQ "mock 또는 준비 중인 기능", free-fortune/1000-won FAQ 의 "SoulCat 별도 결제 정책" — 운영 색인 전에 CD 결제창·단건 전용 정책으로 갱신 필요.
- [x] 4단계 탈퇴 연동(CD `c72551999`, SoulCat `9d9247c`). 후속: (a) 다음 SoulCat 스테이징 배포 뒤 테스트 계정으로 스테이징 탈퇴 1회 → `deleted_account_logs.soulcatCleanup.status` `deleted`·D1 행 0 확인(사용자 요청 시); (b) `failed` 로그 재처리 절차(운영자 D1 수동 삭제)는 문서화만 됨, 도구 없음; (c) 프로덕션 바인딩은 5단계.
- [ ] 5단계 운영 노출 — 계획 확정(2026-09-15, 위 "확정 계획"). [x] S1 SoulCat 코드+스테이징 [ ] S2 스테이징 실 LLM e2e [ ] S3 SoulCat 운영(LLM OFF) [ ] S4 CD 승격+유료 1종
- [x] 5단계 S1(2026-09-15, A1). SoulCat 커밋: `7147dae` seo 문안 13곳(계획 10곳 + privacy 하이라이트·ggulggul :339/:346 에 남은 이전 결제 서술까지 — 3단계 후속 문안 항목 해소), `c3d2474` 카탈로그 `available`(주문 경로와 같은 `assertProductLive` 공유, `FortuneExperience` CTA·`FishCatalog` 카드 "준비 중", local-mock 은 기존대로 열림), `1fb9c60` `env.production`(D1 id 없음), `29b6573` `deploy-production.mjs`·`production-activation.mjs`+테스트, `09f7954` `DOMAIN-INTEGRATION.md` 운영 배포·롤백 절. 검증: `tsc` 0, `npm test` 95/95, `build`, `verify:seo`, dry-run staging·production 통과. 새 테스트 2건은 변이(판정 catch→true, 키 1종 검사 완화)로 실패 확인. `deploy-production.mjs` 는 Pages 홈 HTML 에 `staging.code-destiny.com` 이 있으면 거부 — 실측 기본 빌드 HTML 20파일(홈 포함) 포함, `NEXT_PUBLIC_CODE_DESTINY_ORIGIN=https://code-destiny.com` 빌드 0파일. A1 실측: `staging.code-destiny.com/api/yeongnyangi/version` sha `09f7954…`·`liveLlmEnabled:false`, products 28개 전부 `available:false`, `/yeongnyangi/` 200(배포 직후 수십 초는 이전 버전 응답 — 전파 지연). 롤백: `wrangler rollback --env staging`(직전 `9ed1dd0b`) 또는 `70c19532` preview 재배포. 이제 4단계 후속 (a) 스테이징 탈퇴 e2e 가 가능하다(S2 에 묶임).
- 🔴 범위 밖(보고만): main CI `AI Locale Gate` 가 `9fa1c714f` 부터 `recoverGeomancy is not defined` 로 실패 중. `passExcluded` 의미가 v1(`billing.js` 월정석 허용)과 v2(`payments/index.js` 월정석 거부)에서 다름. `KRW_PER_COIN` 3중 선언(`billing-policy.js`·`lib/payment/coin-pricing.ts`·`music-access-policy.js`). 결제창 렌더러 3종이 서버 `hiddenMethods` 를 읽지 않아 호출부 옵션에 의존(`app/checkout/CheckoutClient.tsx` 주석). `app/checkout/**` 이 `paid-flow-gates`·deepRequired 목록에 없다. SoulCat 페르소나 상수(`yeongnyangi.ts`)와 `PRODUCT.md` 의 "~냥" 어미 규칙 불일치. 윈도우 CRLF 체크아웃에서 vendored saju 해시 테스트·`integrity-unique-index-spec` 정적 테스트가 헛실패.

## 함정

- 밴드는 `<template>` 이라 서버 HTML 에 직접 안 보인다. 렌더는 브라우저에서.
- 에셋은 SoulCat 워커가 서빙하는 `/_soulcat/assets/*` 참조 — SoulCat 배포가 내려가면 이미지만 빈다.
- 생선 이미지(240×108)는 `object-fit:contain` 으로 통째 표시.
- `/fortune/` 302 가 보이면 엣지 캐시다. `?cb=` 를 붙여 재확인.

## 검증 명령

```
npm run check:fast
curl -s https://staging.code-destiny.com/ | grep -c cd-soulcat-navigation-template
curl -s -o NUL -w "%{http_code}" "https://staging.code-destiny.com/fortune/?cb=1"                    # 200 (CD)
curl -s -o NUL -w "%{http_code}" "https://staging.code-destiny.com/yeongnyangi/free-fortune/?cb=1"  # 200 (SoulCat)
```
