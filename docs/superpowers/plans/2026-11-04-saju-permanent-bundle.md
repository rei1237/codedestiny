# 기본 사주 무료 축소·29,000원 영구 묶음 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기본 사주의 무료 범위를 원국(만세력·기본 차트)과 한 줄 성향으로 줄이고, 나머지 비 회당 사주 콘텐츠를 저장 프로필 출생 정보 단위의 29,000원 영구 묶음 하나로 판다.

**Architecture:** 새 키 `saju_lifetime_bundle` 한 행만 결제 때 부여하고, 포함 키는 읽을 때 묶음 행으로도 열리게 한다(읽기 별칭). 환불은 그 한 행을 회수하면 끝나고, 포함 키를 나중에 늘려도 기존 구매자에게 적용된다. 일주·십성·조후·억부·절기 해석은 `/api/saju/section`으로 옮기고, 나머지 브라우저 계산 콘텐츠는 해제 뒤에만 계산한다.

**Tech Stack:** Cloudflare Worker, MongoDB(ContentEntitlement), 정적 JS(`js/`, `public/` 미러), `scripts/extract-saju-section-runtime.mjs` 런타임 번들, jest(`scripts/run-mock-tests.mjs`), `node --test`.

**Spec:** `C:\Users\user\.claude\plans\memoized-finding-crescent.md` 2단계(승인됨). 이후 사용자 결정 "묶음 전용"이 우선한다. 관련 문서: `docs/context/payment-gating.md`, 균일가 스펙 `docs/superpowers/specs/2026-11-04-pass-flat-pricing-design.md`(별도 세션, 미머지).

## Global Constraints

- 가격: `saju_lifetime_bundle` 29,000원, 290코인, `cd_content_tier_19`(신규, Play Console 수동 등록 전까지 앱 결제는 503). 폐기 SKU 03,04,05,07,08,11,12,13 재사용 금지.
- 신원: `userId + birthKey + contentKey`. 저장 프로필 필수. 요청 본문의 생년월일로 권한을 판정하지 않는다.
- 무료 유지: 만세력·원국, 한 줄 성향, 자미·숙요·베다·서양 기본 차트, 휴먼 디자인 기본 차트(바디그래프·유형·권위).
- 회당 유지(묶음 제외): 상담 전반, 궁합 상담, `saju_ai_question_prompt`, `relationship-boundary-test`, `love-code`, `compat-saju-compatibility`, `life-book-ai-consultation`, 그 밖에 생성 모델을 호출하는 카드. 묶음 비포함: `saju-guardian-unlock`, `premium-sibyl-dominator`, `premiumDivinationPack`.
- 묶음 전용: 포함 키는 신규 개별 판매·이용권·서비스 팩 대상이 아니다. 키와 기존 구매 권리는 지우지 않는다.
- 기존 구매자: 산 항목은 계속 열린다. 묶음으로 자동 승급하거나 차액을 빼 주지 않는다. 과거 무료 열람자에게 권리를 주지 않는다.
- 금지: `sajuAdapter.ts::calculateLocalResult()` 수정, KASI prefetch timezone 주입, `normalizeSaju` timezone 필드, 6개 엔진 내부 수정, 저장된 유료 결과 재계산, PortOne/Inicis 실행 파일 수정, `.env*`·`package-lock.json`·`.wrangler/`·`dist/`·`out/`·`worker/wrangler.toml` 구조 수정, `[vars]` 추가.
- 금지: 과금 LLM 실호출, 실결제, 운영 DB 쓰기, Swiss Ephemeris·래퍼 로컬 실행, 전체 `npm run test:node`.
- 테스트 실행: 정적·node 테스트는 `node --test <파일>`, jest는 `node scripts/run-mock-tests.mjs jest <파일들>`. 전체 jest는 CI에 맡긴다.
- 고객 문구에 "LLM", "비 LLM", "AI 미사용"을 쓰지 않는다. 정확도 수치나 보장을 쓰지 않는다. "무료 사주" 대신 "무료 만세력"이라고 쓴다.
- `public/`은 `npm run sync:public`으로만 갱신한다. `runtime.generated.mjs`는 `scripts/extract-saju-section-runtime.mjs`로만 재생성한다.
- 작업 위치: 워크트리 `D:\Development\codedestiny-worktrees\saju-permanent-bundle-20261104`, 브랜치 `wt/saju-permanent-bundle-20261104`. 머지 전 균일가 묶음 ①이 main에 들어왔으면 먼저 병합한다. 균일가 세션의 미커밋 파일은 건드리지 않는다.
- 프로덕션 승격은 사용자의 별도 1회 승인 없이는 하지 않는다.

## Review Focus

1. 출생 정보를 고치거나 다른 프로필로 바꾸면 묶음이 닫히고, 원래 출생 정보로 돌아오면 추가 차감 없이 다시 열린다. → Task 2
2. 프로필을 저장하지 않은 직접 입력 사용자가 묶음을 누르면 프로필 저장 안내로 이어지고, 결제나 빈 화면으로 끝나지 않는다. → Task 5
3. 대운만 산 사람이 묶음을 사면 29,000원이 한 번만 차감되고, 묶음을 환불해도 대운은 계속 열린다. → Task 2
4. 배포 직전에 열린 결제가 배포 뒤 확정되면 권리가 부여되고, 캐시된 옛 화면이 판매 종료 키로 결제를 시도하면 묶음 안내로 이어진다. → Task 3, 5
5. 권한 조회 장애는 402가 아니라 503이고, 그때도 원국과 한 줄 성향은 보인다. 출생 시각을 모르면 시각이 필요한 해석을 지어내지 않는다. → Task 4, 5

---

### Task 1: 묶음 상품과 포함 키 정본

**Files:**
- Create: `worker/lib/saju-bundle-policy.js`
- Modify: `worker/lib/paid-feature-registry.js:233,487,694,748`, `worker/lib/app-store-pricing.js:42-57,147`, `scripts/create-play-console-products.mjs:50-56`, `worker/payments/catalog.js:44,140`, `worker/lib/payment-product-name.js:8`, `worker/lib/review-product-catalog.js:35`, `worker/lib/honey-unlock-catalog.js`, `i18n/authored/honeyUI-02.json`, `js/core/service-registry.js:671`, `app/_lib/serviceFeatureRegistry.ts:4055`, `worker/lib/billing-feature-registry.js:329`, `js/core/birth-scope-unlocks.js:31-72`, `worker/routes/fortune.js:2586`, `__tests__/fixtures/paid-non-llm-delivery-fixtures.mjs`, `docs/payments/payment-p0-inventory.json`, `docs/context/payment-gating.md`
- Test: `__tests__/worker/saju-bundle-policy.test.js`

**Interfaces:**
- Produces: `SAJU_BUNDLE_FEATURE_KEY = "saju_lifetime_bundle"`
- Produces: `SAJU_BUNDLE_ALIAS_MEMBER_KEYS`: `section_summary, section_daewun, section_compat, rpt_quantumCard, rpt_specialCharmCard, rpt_skillTreeCard, rpt_healthReportCard, rpt_energyCoordCard, rpt_villainCard, rpt_secretHouseEntryCard, animal-destiny-unlock, saju-career-style`. 전부 출생 기반 키이고 묶음 행으로 열린다.
- Produces: `SAJU_BUNDLE_SALE_CLOSED_KEYS`: 위 목록 + `tetogen_deep_report, fun.quantumLotto.ritualReport, travelDestiny, healthReport, rpgCharacter, secretHouseEpisodes`. 신규 판매만 닫는다. 뒤의 옛 키 4개는 기존 별칭이 그대로 처리한다. `tetogen_deep_report`와 로또 리포트는 Task 5의 화면 판정이 "개별 권리 또는 묶음"을 본다.
- Produces: `isSajuBundleAliasMember(featureKey): boolean`, `isSajuBundleSaleClosed(featureKey): boolean`. 둘 다 `normalizePaidFeatureKey`를 거친다.

- [ ] **Step 1:** 미확인 카드의 호출 경로를 코드로 확인한다. 대상은 시빌, 궁합 무료/유료 경계, 이집트, 오늘의 운세 상세, `destiny_meeting_place`, `rpt_lottoCard`다. 생성 모델을 호출하면 회당으로 두고 포함 키에 넣지 않는다. 결과를 카드·키·서버 전달 여부·묶음 포함 여부 표로 `docs/context/payment-gating.md` 새 절 "2026-11-04 사주 영구 묶음"에 적는다. 표가 Interfaces 목록과 다르면 목록을 고치고 사용자에게 보고한다.
- [ ] **Step 2: 실패하는 테스트를 쓴다.**

```js
test("묶음 상품 가격과 범위", () => {
  const spec = UNLOCK_PRODUCT_BY_FEATURE_KEY.saju_lifetime_bundle;
  expect(spec.cost).toBe(290);
  expect(spec.amountKRW).toBe(29000);
  expect(isBirthScopedUnlockFeatureKey("saju_lifetime_bundle")).toBe(true);
  expect(resolveAppContentTier("saju_lifetime_bundle")).toBe("cd_content_tier_19");
  expect(getPaidFeatureBillingType("saju_lifetime_bundle")).toBe("unlock");
});
test("회당 상담은 묶음 대상이 아니다", () => {
  for (const key of ["saju_ai_question_prompt", "love-code", "compat-saju-compatibility", "life-book-ai-consultation"]) {
    expect(isSajuBundleAliasMember(key)).toBe(false);
    expect(isSajuBundleSaleClosed(key)).toBe(false);
  }
});
test("별칭 포함 키는 전부 출생 기반 영구 해금이다", () => {
  for (const key of SAJU_BUNDLE_ALIAS_MEMBER_KEYS) expect(isBirthScopedUnlockFeatureKey(key)).toBe(true);
});
```

- [ ] **Step 3:** 실행해 실패를 확인한다. `node scripts/run-mock-tests.mjs jest __tests__/worker/saju-bundle-policy.test.js`
- [ ] **Step 4:** 정책 모듈을 만들고 Files의 등록 지점에 상품을 추가한다. 고객 표시 이름은 "사주 전체 풀이 평생 소장"이다. `saju-bundle-policy.js`는 레지스트리 외 의존성을 갖지 않는다.
- [ ] **Step 5:** 통과를 확인한다. 이어서 `npm run verify:paid-feature-billing-policy`, `npm run verify:birth-scope-client-mirror`, `npm run audit:payment-p0-inventory`, `npm run verify:app-store-pricing`, `npm run verify:play-console-products`를 실행한다. 스크립트 이름이 다르면 `package.json`에서 찾아 같은 검사를 돌린다. 모두 exit 0이어야 한다.
- [ ] **Step 6:** 커밋한다. `feat(saju): 사주 영구 묶음 상품과 포함 키 정본`

### Task 2: 읽기 별칭과 환불

**Files:**
- Modify: `worker/lib/content-unlocks.js:451`(`findActivePaidContentUnlock`), 같은 파일의 `getUnlockedContentSnapshot`, `worker/routes/fortune.js`(`PERSISTENT_UNLOCK_ALIAS_MAP` 2551, `resolvePersistedUnlockFeatures`), `worker/routes/access.js:38-42`
- Test: `__tests__/worker/saju-bundle-entitlement.test.js`

**Interfaces:**
- Consumes: Task 1의 `isSajuBundleAliasMember`, `SAJU_BUNDLE_ALIAS_MEMBER_KEYS`.
- Produces: `findActivePaidContentUnlock({ featureKey: 포함키, profileId })`가 개별 행이 없으면 같은 프로필의 묶음 행을 돌려준다. 프로필 스냅샷의 `featureKeys`는 묶음 행이 있으면 포함 키를 더해 내려간다. 프론트의 `unlockedFeatureMap`은 이 값으로 자동으로 열리므로 클라이언트에 별칭 표를 복제하지 않는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다.** `__tests__/worker/content-unlock-roundtrip.test.js`의 대역 방식을 따른다. 테스트 이름과 단정:
  - `묶음 행은 같은 출생 정보의 포함 키를 연다`: `section_daewun` 조회가 truthy.
  - `출생 정보를 고치면 닫히고 되돌리면 다시 열린다`: 생년월일 변경 뒤 null, 복원 뒤 truthy, 부여 행 수는 1.
  - `다른 프로필 출생 정보로는 열리지 않는다`: null.
  - `묶음 행은 비포함 키를 열지 않는다`: `saju-guardian-unlock`, `love-code` 모두 null.
  - `회당 키 경계가 우선한다`: `isPerUsePaidFeatureKey` 키는 묶음이 있어도 null.
  - `개별 구매 뒤 묶음을 환불해도 개별 권리는 남는다`: `section_daewun` 행과 묶음 행을 만들고 `revokePaymentContentAccess`로 묶음 결제만 회수하면 `section_daewun`은 열리고 `rpt_quantumCard`는 닫힌다.
  - `묶음 코인 게이트는 포함 키 보유와 무관하게 290코인을 한 번만 차감한다`: 재호출은 `already_unlocked`, 추가 차감 0.
  - `스냅샷은 묶음 행을 포함 키로 펼친다`: 묶음 행이 있는 프로필의 `featureKeys`가 포함 키 12개를 모두 포함하고, 다른 프로필은 포함하지 않는다.
- [ ] **Step 2:** 실행해 실패를 확인한다.
- [ ] **Step 3:** 별칭은 공유 리더 `findActivePaidContentUnlock` 한 곳에 넣는다. 개별 조회가 비면 `featureKey`를 묶음 키로 바꿔 재귀 호출한다. 묶음 키 자체는 재귀하지 않는다. 호출부마다 감싸지 않는다. `findActivePaidContentUnlockByServiceKeys`의 호출자도 확인해, 포함 키를 판정하는 호출자가 있으면 같은 처리를 넣는다. `saju-section.js`의 `BIRTH_ALIAS_KEYS`, `BUNDLE_ALIAS_KEYS`는 그대로 둔다.
- [ ] **Step 4:** 통과를 확인한다. 이어서 기존 회귀 `__tests__/worker/saju-section.test.js`, `fortune.birth-scope-unlocks.test.js`, `birth-scope-unlock-policy.test.js`, `content-unlock-roundtrip.test.js`, `billing.legacy-birth-unlock.test.js`를 jest로 돌리고 `npm run verify:per-use-never-unlocks`, `verify:saju-unlock-entitlement-regression`, `verify:paid-access-integrity`를 실행한다.
- [ ] **Step 5:** 커밋한다. `feat(saju): 묶음 권리로 포함 키를 읽는다`

### Task 3: 개별 판매 종료와 이용권 제외

**Files:**
- Modify: `worker/routes/billing.js`(코인 게이트 입구 ~3470), KRW 주문 생성 경로 `worker/payments/catalog.js:44,140`, `worker/lib/honey-unlock-catalog.js`, `worker/lib/app-store-pricing.js`, `worker/lib/pass-cost-catalog.js:9`, `worker/payments/service-pack-policy.js`
- Test: `__tests__/worker/saju-bundle-sale-closed.test.js`

**Interfaces:**
- Consumes: `isSajuBundleSaleClosed`.
- Produces: 신규 구매 시도 응답은 HTTP 409, 코드 `PRODUCT_SALE_ENDED`(`worker/payments/errors.js:46` 재사용), `bundleFeatureKey: "saju_lifetime_bundle"`. Task 5의 화면이 이 필드로 묶음 안내를 연다.

- [ ] **Step 1: 실패하는 테스트를 쓴다.**
  - `판매 종료 키의 신규 코인 결제는 409이고 차감이 없다`: `section_daewun`.
  - `이미 산 키는 already_unlocked로 그대로 열린다`: 판매 종료 판정보다 보유 판정이 먼저다.
  - `묶음을 가진 프로필의 포함 키 요청은 already_unlocked다`.
  - `KRW 주문 생성은 409다`, `꿀방울 카탈로그와 앱 티어에 포함 키 신규 판매가 없다`.
  - `판매 종료 전에 만든 주문의 확정은 권리를 부여한다`: 생성 차단이 확정 경로에 닿지 않는다.
  - `활성 이용권은 묶음과 판매 종료 키를 공짜로 열지 않는다`: 이용권 커버리지가 covered false, 차감 없음.
  - `회당 키와 타로·숙요·베다·점성은 영향이 없다`: 대표 키 각 1개가 기존 결과와 같다.
- [ ] **Step 2:** 실행해 실패를 확인한다.
- [ ] **Step 3:** 판정은 보유 확인 뒤, 차감·주문 생성 전에 넣는다. 레지스트리 가격행, `LEGACY_UNLOCK_PRODUCTS_65DE451`, 환불·확정 경로는 그대로 둔다. 과거 구매 증빙 비교가 이 값을 쓰기 때문이다.
- [ ] **Step 4:** 통과를 확인하고 `npm run verify:billing-pass-policy`, `verify:paid-feature-billing-policy`, `verify:app-store-billing-policy`, `verify:mobile-pricing-parity`, `verify:paid-gate-price-coverage`를 실행한다. 판매 종료를 몰라서 실패하는 가드는 "판매 종료 키는 판매 표면에 없어야 한다"로 고치고, 그 가드가 무엇을 잡게 됐는지 커밋 메시지에 적는다.
- [ ] **Step 5:** 커밋한다. `feat(saju): 묶음 포함 항목의 개별 신규 판매를 닫는다`

### Task 4: 일주·십성·조후·억부·절기 해석의 서버 전달

**Files:**
- Create: `worker/lib/saju-section/paid-natal-reading.src.js`
- Modify: `scripts/extract-saju-section-runtime.mjs`, `worker/lib/saju-section/runtime.generated.mjs`(재생성), `worker/lib/saju-section/report.js:23,386`, `worker/routes/saju-section.js`, `js/core/saju/section-client.js:516-545`, `js/saju-engine.js:9314,9962,10046,10066,10340`, `js/core/saju/reading-personas.js`, `__tests__/ui/saju-section-server-gate.static.test.js:47-91,125`
- Test: `__tests__/worker/saju-section.test.js`(기존 파일에 추가)

**Interfaces:**
- Consumes: Task 2의 별칭. 요청 키는 `saju_lifetime_bundle`이다.
- Produces: `POST /api/saju/section { featureKey: "saju_lifetime_bundle", ... }` → `{ ok, unlocked, featureKey, parts: { ilju, ten, climate, strength, terms } }`. 값은 HTML 문자열이고, 출생 시각 미상으로 낼 수 없는 값은 `""`다.
- Produces: `CdSajuSectionClient.loadNatalReading(): Promise<void>`. 각 값을 `iljuCard`, `tsGrid`, `johuCard`, `ukbuCard`, `terms24Card` 본문 칸에 넣는다. 402이면 잠금 스텁을 유지한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다.**
  - `미구매는 402이고 응답에 본문이 없다`, `section_summary만 산 계정은 묶음 응답을 받지 못한다`.
  - `구매 계정은 다섯 parts를 받는다`, `요청 본문 생년월일을 바꿔도 프로필 출생 정보로 계산한다`.
  - `권한 조회 장애는 503이다`, `출생 시각 미상은 시각 의존 값을 지어내지 않는다`.
  - 정적 가드 FORBIDDEN에 옮긴 생성 함수 이름과 해석 전용 문장을 일주·십성·조후·억부·절기 각 3개 이상 추가한다. 계산에 쓰는 공용 표(`ILJU_DB` 이름 자체, `TS_DB` 키 등)는 넣지 않는다.
- [ ] **Step 2:** 실행해 실패를 확인한다.
- [ ] **Step 3:** `renderIlju`, `render24Terms`, `renderTenshin`, `renderJohu`, `renderUkbu`의 해석 HTML을 만드는 부분을 `paid-natal-reading.src.js`로 옮기고 런타임을 재생성한다. 런타임에 이미 있는 `SajuReadingPresentation`을 쓴다. 브라우저 쪽 같은 이름 함수는 무료 틀과 잠금 스텁만 깐다. `johu`, `G_POWER` 등 전역 계산 값은 다른 렌더러가 쓰므로 그대로 계산한다.
- [ ] **Step 4:** `reading-depth.generated.js`, `reading-rich.js`, `reading-personas.js`의 브라우저 소비자를 확인한다. 옮긴 해석 문장이 남아 있으면 브라우저 로드에서 뺀다. Task 5의 한 줄 성향은 별도 생성 파일을 쓴다. 뺄 수 없는 소비자가 있으면 사용자에게 보고하고 해당 문장을 FORBIDDEN에서 제외한 이유를 커밋 메시지에 적는다.
- [ ] **Step 5:** 통과를 확인한다. `node --test __tests__/ui/saju-section-server-gate.static.test.js`, `node scripts/extract-saju-section-runtime.mjs --check`, `node scripts/run-mock-tests.mjs jest __tests__/worker/saju-section.test.js`. `sync:public` 뒤 정적 가드를 다시 돌린다.
- [ ] **Step 6:** 커밋한다. `feat(saju): 원국 해석을 묶음 서버 전달로 옮긴다`

### Task 5: 무료 결과 화면과 묶음 안내

**Files:**
- Create: `js/core/saju/bundle-offer.js`, `js/core/saju/natal-one-liner.generated.js`, `scripts/generate-natal-one-liner.mjs`
- Modify: `js/saju-engine.js:5284-5364,22642`, `index.html:28201,30400-30427,30525,32155-32215`, `public/ggulggul/index.html:29899`, `js/core/saju/reportDashboard.js:153-178`, `js/saju-engine-tarot-sukuyo-quantum.js:3747,3790`, `js/core/access-store.js:19-69`, 내 뇌구조 `boot.js`
- Test: `__tests__/ui/saju-bundle-free-surface.static.test.js`, 기존 `saju-result-first-frame.static.test.js`, `destiny-anatomy-boot.test.mjs`

**Interfaces:**
- Consumes: Task 2의 `unlockedFeatureMap` 펼침, Task 3의 `PRODUCT_SALE_ENDED`·`bundleFeatureKey`, Task 4의 `loadNatalReading`.
- Produces: `window.CdSajuBundleOffer.open({ source: string }): void`. 포함 항목 목록, 샘플, 29,000원, 영구 소장 설명, 결제 버튼을 보여 준다. 저장 프로필이 없으면 프로필 저장 안내로 먼저 보낸다.
- Produces: `window.CdSajuBundleOffer.isOpen(): boolean`. `isTileKeyUnlocked("saju_lifetime_bundle")`를 쓴다.
- Produces: `window.CdSajuNatalOneLiner.get(dayPillarKey): string`. 60갑자 전부 비어 있지 않다.

- [ ] **Step 1: 실패하는 테스트를 쓴다.**
  - `한 줄 성향은 60갑자 모두 한 문장이고 서로 겹치지 않는다`: 생성 파일에 유료 해석 문장이 들어가지 않는다.
  - `미해제 첫 렌더는 원국·한 줄 성향·묶음 안내 순서다`: `renderManse`와 한 줄 성향이 동기 호출이고, 일진·월운, 편지, 오늘의 운명, 닮은 유명인, 로또 번호, 뇌구조, 극T 기본, 테토/에겐, 네컷, 도파민 렌더러는 `isOpen` 검사 뒤에만 호출된다.
  - `판매 종료 응답은 묶음 안내를 연다`, `옛 게이트 버튼은 묶음 결제로 이어진다`: `SECTION_GATE_KEYS`에 `purchaseKey`가 있고, 판정 키는 그대로 `section_daewun`, `section_summary`다.
  - `프로필 미저장 입력은 프로필 저장 안내로 간다`, `권한 조회 실패 때도 원국과 한 줄 성향은 렌더된다`.
  - `기존 section_summary 구매자의 공유 타일은 계속 열린다`: 극T 기본, 테토/에겐, 네컷, 도파민 타일의 잠금 키가 `section_summary`로 유지된다.
  - `테토/에겐 상세와 로또 리포트는 개별 권리 또는 묶음으로 열린다`.
  - 뇌구조 부트: 미해제면 `import`가 호출되지 않고 `#destinyAnatomyCard`에 계산 결과가 없다. 영냥이의 모자 표면은 영향이 없다.
- [ ] **Step 2:** 실행해 실패를 확인한다. `node --test <각 파일>`
- [ ] **Step 3:** `scripts/generate-natal-one-liner.mjs`로 `lib/saju/reading-depth.mjs`의 `dayReading` 첫 문장을 60갑자 표로 뽑아 생성 파일을 만든다. 일주 표기만 쓰고 단정 용신, 격국을 넣지 않는다.
- [ ] **Step 4:** 결과 화면을 고친다. 묶음 안에 든 렌더러는 `isOpen`일 때만 호출하고, `cd:unlock`류 기존 해금 이벤트에서 재렌더한다. `cd:saju-summary-ready`와 `__cdLastSummaryArgs`는 무료 경로에서도 그대로 발행한다. 기존 구독자와 연이 첫걸음 보상이 이를 기다리기 때문이다. `renderSajuQuestionPromptGenerator`처럼 회당인 카드는 묶음 판정에 넣지 않는다.
- [ ] **Step 5:** 통과를 확인하고 `npm run sync:public` 뒤 `verify:paid-gate-ui`, `verify:paid-gate-no-dead-end`, `verify:paid-gate-scope`, `verify:static-paid-gate-failsafe`, `verify:paid-gate-profile-scope`, `verify:paid-resume-wiring`, `verify:paid-feature-common-flow`를 실행한다. 잠금 전 미노출과 해제 뒤 노출을 함께 보도록 `verify-saju-reading-personas.mjs`, `verify-compact-home.cjs`, `verify-destiny-anatomy-browser.cjs`를 고친다.
- [ ] **Step 6:** 커밋한다. `feat(saju): 무료 결과를 원국과 한 줄 성향으로 줄이고 묶음 안내를 붙인다`

### Task 6: 상세·마케팅·SEO 문구

**Files:**
- Modify: `js/basic-fortune-detail.mjs`, `js/core/saju/crafted-product-details.mjs`, `content/product-details/`, `lib/saju/saju-service-catalog.mjs`, `index.html:37153-37158`, `/saju` 메타데이터, `llms.txt`, `lib/seo/entity-registry.mjs`, `js/core/service-registry.js`, 사이트맵 입력, `app/yeongnyangi/1000-won-fortune/page.tsx`, `PAYMENT_POLICY.md`
- Test: `__tests__/ui/saju-bundle-copy.static.test.js`

**Interfaces:**
- Consumes: Task 1의 상품 표시 이름과 가격.

- [ ] **Step 1: 실패하는 테스트를 쓴다.**
  - `판매 표면에 판매 종료 키의 개별 가격이 없다`, `묶음 가격 표기는 29,000원 하나다`.
  - `무료 사주 표기가 사라졌다`: 대상 파일에 "무료 사주"가 없고 "무료 만세력"이 있다.
  - `고객 문구에 금지어가 없다`: "LLM", "비 LLM", "AI 미사용".
  - `URL을 바꾸지 않는다`: `/saju`, `/saju/destiny-anatomy`, `/yeongnyangi/1000-won-fortune/`가 사이트맵 입력에 그대로 있다.
- [ ] **Step 2:** 실행해 실패를 확인한다.
- [ ] **Step 3:** 문구를 고친다. `/saju/destiny-anatomy` 등 색인 페이지의 소개와 예시는 공개로 둔다. 천원 페이지는 URL을 유지하고 묶음 안내로 바꾼다. 마케팅 사본은 `npm run sync:marketing-copy`, 가격 사본은 `scripts/lib/sync-saju-reading-prices.mjs`로 갱신한다. 탐색이 찾은 궁합 표기 불일치(5,000/10,000)는 고치지 않고 보고만 한다.
- [ ] **Step 4:** 통과를 확인하고 `verify:i18n-price-drift`, `verify:paid-service-offer`, `verify:sitemap-drift`, `verify:public-mirror-fresh`, `verify:home-service-registry`를 실행한다.
- [ ] **Step 5:** 커밋한다. `docs(saju): 무료 만세력·영구 묶음 기준으로 상품 문구를 고친다`

### Task 7: 통합 검증과 인수인계

**Files:**
- Modify: `docs/context/payment-gating.md`, `docs/handoff/` 새 문서 `2026-11-04-saju-permanent-bundle.md`

- [ ] **Step 1:** 균일가 묶음 ①이 main에 들어왔으면 origin/main을 병합하고, `worker/lib/light-fortune-catalog.js`의 라이트 목록과 `SAJU_BUNDLE_SALE_CLOSED_KEYS`의 교집합이 비어 있는지 확인한다. 교집합이 있으면 사용자에게 보고하고 멈춘다.
- [ ] **Step 2:** 화면을 mock으로 확인한다. 비로그인, 로그인 무료, 대운 구매자, 묶음 구매자 네 계정 상태를 390·960px에서 본다. 원국과 한 줄 성향, 묶음 안내, 해제 뒤 전체 카드, 기본 차트 4종과 휴먼 디자인 차트의 무료 유지를 확인한다. `verify-service-results.mjs`, `verify-natal-ui.mjs`는 다른 무거운 검사와 동시에 돌리지 않는다.
- [ ] **Step 3:** `npm run check:pre-push`를 실행하고 전체 로그를 스크래치패드 `gates/`에 남긴다.
- [ ] **Step 4:** 인수인계 문서에 Play Console `cd_content_tier_19` 수동 등록, 공개 JS 우회 한계(뇌구조·재미 콘텐츠), 승격 후 2주 지표(`/saju` 유입, 결과 이탈, 묶음 구매, 매출)와 revert 기준을 적는다.
- [ ] **Step 5:** 커밋한다. 사용자에게 RED 위험·검증 결과·롤백(`git revert`)을 보고한 뒤 main push를 진행한다. 프로덕션 승격은 별도 1회 승인을 받는다.
