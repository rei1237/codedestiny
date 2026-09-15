---
status: active
updated: 2026-09-15
next: 1단계 결제 일원화 착수 — CD `worker/lib/paid-feature-registry.js` 에 영냥이 상품을 회당 결제 featureKey 로 등록하고, Service Binding 전용 증빙 조회 API 를 추가한 뒤, SoulCat 결제 CTA 를 CD 결제창으로 보내고 SoulCat `POST orders` 가 CD 증빙으로 책 생성을 시작하게 바꾼다(RED, 양 레포, 승인 필요). 기존 MID 로 결제하며 추가 MID 는 발급하지 않는다(사용자 확정 2026-09-15).
---

# 영냥이(SoulCat) 편입 — 기존 MID·기존 계정으로 전 서비스 정상 동작시키기

## 확정 사항 (2026-09-15, 사용자)

- **추가 MID 발급 없음.** 결제는 code-destiny.com 의 기존 PortOne 스토어·기존 MID·기존 결제창에서만 일어난다. SoulCat 전용 PortOne 스토어·비밀 7종·별도 webhook 은 폐기 대상.
- **구조는 하이브리드.** 신원·결제·프로필·SEO·탈퇴는 CD 로 통합, SoulCat Worker + D1 은 앱 상태(책·챕터·무료 운세·출석) 저장소로 유지. Mongo 이식 없음. 병합 전환 기준: 영냥이 월 유료 주문이 CD 유료 주문의 30% 초과, 또는 CD 엔진 정정이 SoulCat `server/vendor/code-destiny/` 사본에 반영되지 않아 결과 차이가 보고될 때.
- **결제 정책(2026-09-15 재확정).** 영냥이 세계는 "다른 차원"이라 **이용권도 월정석도 통하지 않는다.** 카드·카카오페이 단건 결제만 허용(등록소 `paymentScope:"direct_only"`). 홈 밴드·SoulCat 결제 화면에 이 설정을 명시하고 영냥이 대사("이용권? 월정석? 먹지도 못하는 걸 어디에 써? 나는 꽃돼지 연이처럼 그렇게 혜자는 아니야~")를 싣는다.

## 완료된 것

- 0단계 허브 하이재킹 해소(SoulCat 커밋 `d246d48`, codex 브랜치, 워크트리 `C:\Users\user\Desktop\SoulCatProject-staging-login-payment`). 실측: `/fortune/` CD 200, `/yeongnyangi/*`·`/api/yeongnyangi/*` 200. 워커 코드는 롤백된 `2348c4e` 버전이 돌지만 라우트가 없어 옛 302 는 도달 불가. 다음 정식 배포 때 새 코드가 실린다.
- 계정 통합. SoulCat `server/auth.ts` `sharedIdentity()` 가 CD 쿠키(`fortune_auth_token`/`fortune_auth_refresh`)를 Service Binding `AUTH_SERVICE`(→ `code-destiny-web-staging`)으로 CD `/api/auth/me` 에 넘겨 검증. D1 키 `codedestiny:<24hex>`. degraded/token-only 응답은 거부. 변경 불요.
- CD 홈 밴드(스테이징 게이트). `index.html` `<template id="cd-soulcat-navigation-template">` + 인젝터(`data-marker="cd-soulcat-new-world-v20260915"`).
- 주제 카드·초융합 모달 (2026-09-15, SoulCat codex 브랜치 `1ec222e`·`f2ab966`·`ba20e2f`, ff 머지, 미푸시·미배포). 홈 "영냥이가 골라봤어" 4카드가 `/yeongnyangi/fortune/?domain=…&topic=love|money|year|relationship` 링크로 유료 책 파이프라인에 직진. 서버 `server/fortune/topics.ts` 가 topicId 허용목록 정본(`year` 추가). `readingManifest` 는 single 상품에서 행 집합·id 는 그대로 두고 주제 챕터를 `self` 다음으로 올려 `연애운 · ` 접두, 커버 packageName 은 `재물운 참치`. 모달은 융합 4상품만 `FishCatalog layout="list"`. 검증: typecheck·`npm test`(vendored saju 해시 1건은 새 워크트리 CRLF 체크아웃 탓, 코덱스 워크트리에서는 통과)·mock 8791 Playwright(홈 링크 4개, 모달 리스트 4장/CTA 0/가로 오버플로 0, 4주제 URL 입력 단계 직진, 잘못된 topic 은 선택 화면 폴백). 후속: `scripts/verify-fusion-ui.mjs`·`verify-fusion-final.mjs` 는 로그인 도입 전 기준이라 차트 단계에서 멎는다(경로만 `/yeongnyangi` 로 고침); 비융합 `FishCatalog` grid 경로 사용처 0(삭제는 별도); `books.ts` summary.title 미반영; `sukuyo&topic=relationship` 은 궁합 모드 강제(personB 필수).

## 1단계. 결제 일원화 (RED, 양 레포, 별도 승인 후 착수)

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
- 비밀 정리: `wrangler secret delete --env staging` 으로 `PORTONE_*` 7종 제거(배포 성공 확인 후).
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

CD `scripts/generate-sitemap.mjs` `coreRoutes` 에 `/yeongnyangi/`·`/yeongnyangi/fortune/`·`/yeongnyangi/room/` + SoulCat `seoRoutes` 의 `includeInSitemap:true` 9개 등록, 색인 판정 5개소 동기(`docs/context/seo-and-adsense.md:64-76`). SoulCat `src/app/layout.tsx:11` 전역 noindex 해제, `src/app/yeongnyangi/robots.txt/route.ts` Disallow 제거, library·share 는 noindex 유지. `/yeongnyangi/terms|privacy|refund` 는 CD 법무 페이지로 canonical. `/yeongnyangi/ggulggul-fortune/` 은 CD `/kkul-kkul-unse` 와 키워드 경쟁하므로 sitemap 제외.

## 4단계. 탈퇴 연동 (RED, 양 레포)

CD `POST /api/auth/withdraw`(`worker/routes/auth.js:5441-5468`)가 SoulCat D1 의 `codedestiny:<id>` 행을 모른다. SoulCat 에 `DELETE /api/yeongnyangi/account` 추가(사용자 소유 테이블: profiles·orders·entitlements·fortune_requests/results/books/chapters/reading_progress/shares·chart_snapshots·daily_messages·anchovy_ledger·free_readings), CD 탈퇴에서 Service Binding 으로 호출. 실패해도 탈퇴는 막지 않고 재시도 로그.

## 5단계. 운영 노출 (RED, 1회 승인)

SoulCat production env 에 routes/D1/Queue 생성, `AUTH_SERVICE` 는 `code-destiny-web`. CD 인젝터 게이트를 `code-destiny.com` 까지 확장, 홈 밴드 "🐟 생선가게 준비 중"·"영냥이가 손님 맞을 준비 중" 제거. 3단계 SEO 오픈을 같은 릴리스에 묶는다.

## 남은 것

- [ ] 1단계 결제 일원화
- [ ] 2단계 프로필 재사용
- [ ] 3단계 SEO 오픈
- [ ] 4단계 탈퇴 연동
- [ ] 5단계 운영 노출
- [ ] SoulCat codex 브랜치(미푸시 7커밋, 다른 세션이 LLM 최적화 작업 중)를 main 에 합치고 push — 그 세션 담당.
- 🔴 범위 밖: main CI `AI Locale Gate` 가 `9fa1c714f` 부터 `recoverGeomancy is not defined` 로 실패 중.

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
