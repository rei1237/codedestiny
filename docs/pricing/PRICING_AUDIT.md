# 가격 인벤토리 감사 (Phase 1) — 2026-08-12

> ⚠️ **이 문서는 정비 착수 시점(2026-08-12)의 진단 스냅샷이다.** 여기 적힌 가격은 **정비 전 값**이며 현행이 아니다.
> **확정된 현행 티어는 [PRICING_TIERS.md](PRICING_TIERS.md)** 를 보고, Play Console 작업은 [PLAY_CONSOLE_TASKS.md](PLAY_CONSOLE_TASKS.md) 를 본다.
>
> 가격 체계를 고정 티어로 수렴시키기 위한 **진단 문서**. 코드 변경 0줄.
>
> 조사 방법: 가격 정본 키워드(`paid-feature-registry`, `KRW_PER_COIN`, `PASS_MONTHLY_WON`, `CONTENT_TIER_TABLE`)로 SSOT 계층을 먼저 특정한 뒤, 원화 리터럴(`\d{1,3},\d{3}\s*원`, `₩`, `KRW`)·코인 상수(`cost:`, `coinPrice`, `amountKRW`)로 사용처를 역추적했다.

---

## 0. 전제 불일치 — 먼저 읽을 것

작업 지시서가 가정한 저장소 구조와 실제가 다르다. Phase 2~5 설계를 그대로 적용할 수 없는 지점이다.

| 지시서 전제 | 이 저장소의 실제 |
|---|---|
| `lib/pricing/catalog.ts`, `config/pricing.tiers.json`, `config/pricing.products.json` | **전부 없음.** `config/`에는 `env.contract.json`·`payment-freeze.json` 두 개뿐 → 신규 생성 대상 |
| `pricing.app.ts` (손으로 관리하는 앱 가격표) | 파일명은 없으나 **기능은 이미 존재**. `worker/lib/app-store-pricing.js`에 13개 Play SKU 티어표가 있고 `verify:app-store-pricing`·`verify:play-console-products` 가드가 붙어 있다. "손으로 관리하던 앱 가격표를 흡수"가 아니라 **기존 SKU 체계를 통폐합**하는 작업이 된다 |
| 콘텐츠 검색 인덱스 + 검색 API에 `band` 파라미터 추가 | **검색 API도, `/search` 라우트도, 검색 인덱스도 없다.** 현재 검색은 `index.html`의 `#cdServiceIndex` — 런타임에 DOM 타일(`.moon-preview-card`, `.tarot-tile` 등)을 긁어 `indexOf` 부분문자열로 매칭하는 클라이언트 검색이며, **정적 셸 7벌에 사본**이 있다. Phase 4는 "인덱스 필드 추가 / API 파라미터"가 아니라 **DOM 데이터 속성 기반 필터**로 재설계해야 한다 |
| 대상 로케일 `ko, en, ja, zh-CN, zh-TW` 5개 | **2계층 12개.** 런타임 사전 12개(`ko,en,ja,zh-CN,zh-TW,vi,hi,es,fr,de,nl,ms` — `lib/i18n/locale-normalize.js:13`), SSR/SEO 라우팅 5개(`ko,ja,zh,zh-TW,en` — `lib/i18n/locales.ts`). 가격 문자열은 **12벌 전부**에 들어 있다 |
| 갤럭시아 머니트리 잔존 코드 | **코드에 없음.** 저장소 전체에서 `AUDIT.md:20` 문서 언급 1건뿐 |
| 결제 통화 KRW 고정 | 맞다. 단 `GlobalPricingCard.jsx`는 국가코드→통화 매핑(`BRL`/`MXN`/`KRW` 등)을 이미 갖고 랜딩에 렌더된다 — 표시 전용이지만 다통화 흔적이 남아 있다 |
| `sajuAdapter.ts` / `normalizeSaju.ts` / `calculateLocalResult` | 존재. 읽기 전용 규칙 그대로 유효 |
| PortOne 상점아이디 · Inicis | 유효. 실결제 경로는 PortOne V2(`pg:'KG_INICIS'`) + 앱 Google Play Billing |

### 가격 표현의 1차 단위는 원화가 아니라 **코인**이다

이 감사의 가장 중요한 구조적 사실이다.

- `KRW_PER_COIN = 100` — `worker/lib/billing-policy.js:1` (서버 정본), `lib/payment/coin-pricing.ts:3`, `worker/lib/profile-limits.js:9` **3중 정의**
- 상품 가격은 `cost`(코인)로 적히고 `amountKRW`가 명시되지 않으면 `cost × 100`으로 파생 (`normalizePaidFeaturePricingShape`, `billing-policy.js:29-62`)
- 따라서 **모든 가격은 100원 단위로만 표현 가능**하다. 제안된 `2,900 / 4,900 / 9,900 / 19,000 / 29,000`은 각각 29 / 49 / 99 / 190 / 290코인으로 표현 가능하다
- 월정석: `MEMBERSHIP_CREDIT_PER_COIN = 10` → **월정석 1개 = ₩10**
- 역산은 올림: `calculateCoinsFromKrwAmount = Math.ceil(KRW / 100)`

---

## 표 A — 현행 상품 인벤토리

가격 정본: **`worker/lib/paid-feature-registry.js`**. 아래는 코인가 오름차순 그룹.
`앱 SKU`는 `worker/lib/app-store-pricing.js`의 `CONTENT_TIER_TABLE`이 코인가로 매칭하는 Play 상품이다.

### A-0. 코인 5 = ₩500 · 앱 무료 통과

`APP_FREE_MAX_COIN_PRICE = 10`(`app-store-pricing.js:28`) — 10코인 이하는 앱에서 무료로 통과시킨다. Play 최저가 미달 때문.

| 상품명 | featureKey | 계열 | 웹가 | 앱가 | 유형 | 정의 |
|---|---|---|---|---|---|---|
| 포춘텔러 피쉬 행운 가챠 | `fortune-fish-gacha` | 기타 | ₩500 | 무료 | per-use | `paid-feature-registry.js:193` |
| 음악 트랙 MP3 다운로드 | (레지스트리 밖) | 음악 | ₩1,000 (10코인) | 무료 | unlock | `lib/music-access-policy.js:5-6` |

> 음악 ₩1,000은 임의 값이 아니다. KG이니시스가 **1,000원 미만 카드결제를 거부**해 300원→1,000원으로 올린 하한선이며 `verify:billing-pass-policy`가 강제한다.

### A-1. 코인 30 = ₩3,000 · 앱 `cd_content_tier_01` ₩3,900

| 상품명 | featureKey | 계열 | 유형 | L |
|---|---|---|---|---|
| 수비학 타로 리딩 | `tarot-numerology-reading` | 타로 | per-use | 189 |
| 마야점 상담 프롬프트 생성 | `maya-prompt-generator` | 기타 | per-use | 191 |
| IFÀ 오라클 리딩 | `ifa-oracle` | 오라클 | per-use | 195 |
| 네빌 명상 실습 (30분) | `neville-meditation` | 명상 | per-use | 196 |
| 정신분석 해몽 (`amountKRW:3000`) | `dream-psycho-analysis` | 기타 | per-use | 198 |
| 요가 구루 30분 코스 | `yoga-guru-per-use` | 명상 | per-use | 199 |
| 월별 숙요 운세 확장 | `sukuyo-monthly-fortune` | 숙요 | per-use | 211 |
| 주역 거북점 리딩 | `openJuyukModal` / `turtleIChing` | 주역 | per-use | 231 / 235 |
| 이집트 신탁 리딩 | `openKemetModal` / `egyptOracle` | 오라클 | per-use | 232 / 236 |
| 이집트 신탁 AI 질문 프롬프트 | `egyptian_oracle_ai_prompt` | 오라클 | per-use | 237 |
| 스톤헨지 룬 1-룬 리딩 | `stonehenge-runes-single` | 룬 | per-use | 240 |
| 스톤헨지 룬 AI 질문문 생성 | `stonehenge-runes-ai-prompt` | 룬 | per-use | 244 |
| 애니멀 토템 리딩 | `animal-totem-basic` | 기타 | per-use | 245 |
| 나의 매력 클래스 영구 해금 | `rpt_specialCharmCard` | 사주 | **unlock** | 314 |
| 인생 스킬 트리 영구 해금 | `rpt_skillTreeCard` | 사주 | **unlock** | 317 |
| RPG 캐릭터 해금 | `unlock.rpg_character` | 사주 | **unlock** | 333 |

### A-2. 코인 50 = ₩5,000 · 앱 `cd_content_tier_02` ₩6,000

가장 큰 그룹(50개 이상). 계열별로 묶는다.

| 계열 | featureKey (정의 라인) |
|---|---|
| 관상 | `physiognomy-compatibility`(179) · `physiognomy-pastlife-compatibility`(180) · `physiognomy-ogwan-mole-deep`(181) |
| 타로 | `tarot-love-relationship`(183) · `tarot-reunion-reading`(184) · `tarot-myeongri-three-card`(185) · `tarot-mindscan`(186) · `tarot-crystal-soul-reading`(188) · `tarot-prompt-maker`(190) · `tarot-ijik`(192) |
| 오라클/룬/지오맨시 | `royal-tea-oracle`(194) · `openGeomancyOracle`(233) · `geomancy`(238) · `stonehengeRunes`(239) · `stonehenge-runes-triad`(241) |
| 숙요 | `sukuyo-symbolic-comparison`(206, UI 미사용·이력보존) · **`sukuyo-extreme-t-relationship`(207, unlock)** · **`sukuyo-relationship-encyclopedia`(208, unlock)** · **`sukuyo-nature-deep-dive`(209, unlock)** · `compat-sukuyo-compatibility`(218) |
| 궁합 | `compat-astro-synastry`(214) · `compat-astro-direct-synastry`(215) · `compat-ziwei-compatibility`(216) · `compat-saju-compatibility`(217) · `vedic-compatibility-per-use`(219) |
| 점성술 심화 (전부 **unlock**) | `astro_career_talent_deep`(267) · `astro_talent_attraction_deep`(268) · `astro_relationship_deep`(269) · `astro_growth_shadow_deep`(270) · `astro_basic_deep_pack`(271) · `astro_stellar_career_room`(272) · `astro_stellar_talent_room`(273) · `astro_stellar_relationship_room`(274) · `astro_stellar_growth_room`(275) |
| 점성술 트랜짓 | `astro_monthly_transit`(276) · `astro_yearly_transit`(277) |
| 나크샤트라/베다 | `nakshatra-muhurta`(223, `amountKRW:5000`) · `vedic_prashna_prompt`(266) |
| 반려동물 | `pet-saju-ai-consultation`(229, KRW5000) · `pet-compatibility-ai`(230, KRW5000) |
| 찻집/꽃 | `fortune-tea-house-tarot-consultation`(201, KRW5000) |
| 자미두수 | **`ziwei-island-deep-report`(288, KRW5000, unlock)** |
| 상담 | `fortune-chat-consultation`(294, KRW5000) |
| 최애운명 | (없음 — 전면 무료) |
| 손금 | `palm-reading-ai-consult`(255, 레거시·호출 없음) |
| 사주 카드 (전부 **unlock**) | `rpt_energyCoordCard`(318) · `rpt_villainCard`(319) · `rpt_secretHouseEntryCard`(320) · `fun.quantumLotto.ritualReport`(321) · `unlock.section_daewun`(327) · `unlock.section_summary`(328) · `unlock.section_compat`(329) · `unlock.travel_destiny`(334) · `unlock.health_report`(335) · `unlock.secret_house_episodes`(340) |
| **프로필 카드 관리** | `profile-card-manage`(313) — **`passExcluded: true`**(`worker/payments/catalog.js:34`). 이용권으로 결제 불가, 단건/월정석만 |

### A-3. 코인 60~90 (중간 지대)

| 코인 | 웹가 | 앱 SKU | 상품 |
|---|---|---|---|
| 60 | ₩6,000 | `cd_content_tier_03` ₩7,500 | `animal-totem-deep`(246) 애니멀 토템 심화 |
| 70 | ₩7,000 | `cd_content_tier_04` ₩8,900 | `fortune-tea-house-tarot-five-consultation`(202, KRW7000) · `stonehenge-runes-deep`(242) |
| 90 | ₩9,000 | `cd_content_tier_05` ₩10,900 | (없음) |

### A-4. 코인 100 = ₩10,000 · 앱 `cd_content_tier_06` ₩13,000

| 계열 | featureKey (정의 라인) |
|---|---|
| 타로 | `tarot-year-fortune`(182, KRW10000) · `tarot-celestial-harmony`(187) · `premiumTarot`(250) |
| 숙요 | `sukuyo-past-life-reading`(210, 상대 1명당 1결제) · **`sukyo_yearly_fortune_unlock`(213, unlock)** |
| 나크샤트라 | `nakshatra-compat`(220, KRW10000) · `unlock.nakshatra_lord_report`(355) |
| 운명의 나침반 | `destiny-compass-crossroads`(225) · `destiny-compass-life-voyage`(226) · `destiny-compass-future-sim`(227) · `destiny-compass-deep-report`(228) — 모두 KRW10000 |
| 찻집 | `fortune-tea-house-saju-consultation`(203, KRW10000) |
| 룬 | `stonehenge-runes-yearly`(243) |
| 사주 (**unlock**) | `animal-destiny-unlock`(247) · `saju-guardian-unlock`(248) · `loveSimulation`(234) · `rpt_quantumCard`(315) · `rpt_healthReportCard`(316) · `unlock.saju_diary`(337, 레거시) · `unlock.saju_guardian`(338) · `unlock.olympus_fc`(331) |
| 사주 (per-use) | `destiny_meeting_place`(249) |
| 손금 | `palm-reading-general`(254) |
| AI 프롬프트 생성 | `ziwei_ai_prompt_generator`(262) · `astrology_ai_prompt_generator`(263) · `vedic_ai_prompt_generator`(264) · `sukuyo_ai_prompt_generator`(265) |
| 자미두수 (**unlock**) | `ziwei_decade_luck`(299/343) · `ziwei_twelve_palaces`(301/345) · `ziwei_symbolic_layer`(302/346) · `ziwei_life_yearly_flow`(303/347) |
| 시빌라 | `premium-sibyl-dominator`(298, **unlock**) |
| 테토에겐 | `tetogen_deep_report`(305/339, **unlock**) |

### A-5. 코인 120~200

| 코인 | 웹가 | 앱 SKU | 상품 |
|---|---|---|---|
| 120 | ₩12,000 | `cd_content_tier_07` ₩15,000 | `premium-sukuyo-compat-extra`(307) |
| 150 | ₩15,000 | `cd_content_tier_08` ₩19,000 | `ziwei_love_deep`(300/344, **unlock**) · `unlock.nakshatra_dasha_map`(356) |
| 200 | ₩20,000 | `cd_content_tier_09` ₩25,000 | `cosmic-soul-meditation`(197) · `fortune-tea-house-saju-compatibility-consultation`(204, KRW20000) · `fortune-tea-house-sukuyo-compatibility-consultation`(205, KRW20000) · `saju_ai_question_prompt`(261) · `ziwei-island-palace-consult`(286, KRW20000) · `premium-fpti-report`(304, **unlock**) · `unlock.flower_fc`(330) · `unlock.premium_ziwei`(342) |

### A-6. 코인 300 = ₩30,000 · 앱 `cd_content_tier_10` ₩39,000

AI 상담의 표준 가격대. **`PREMIUM_QUOTA_MIN_COIN_COST = 300` 문턱과 정확히 일치**한다(표 D-5 참고).

| 상품명 | featureKey | L |
|---|---|---|
| 베다점 전문가 상담 | `vedic-ai-consultation` (KRW30000) | 178 |
| 숙요점 궁합 전문가 상담 | `sukuyo-compatibility-ai` (KRW30000) | 212 |
| 나크샤트라 통합 궁합 전문가 상담 | `nakshatra-compat-ai` (KRW30000) | 221 |
| 나크샤트라 결정판 전문가 심화 상담 | `nakshatra-ai-consultation` (KRW30000) | 222 |
| 인생의 책 전문가 상담 | `life-book-ai-consultation` (KRW30000) | 256 |
| 점성술 전문가 상담 | `astrology-ai-consultation` (KRW30000) | 259 |
| 네오의 팩폭 작전실 | `neo-operation-room-consultation` (KRW30000) | 260 |
| 신년운세 전문가 상담 | `new-year-ai-consultation` (KRW30000) | 278 |
| 연애 비책 전문가 상담 | `love-secret-ai-consultation` (KRW30000) | 279 |
| 마스터 인연의 서 | `master-love-codex` (KRW30000) | 283 |
| 자미두수 전문가 상담 | `ziwei-ai-consultation` (KRW30000) | 285 |
| 심화 자미두수 PDF 리포트 | `ziwei-deep-pdf` (KRW30000) | 290 |
| **초융합 운세 상담 1회** | `fusion-fortune-consultation` (KRW30000) | 297 |
| 사주 맞춤 작명 프롬프트 | `premium-naming-prompt` (KRW30000) | 306 |
| 프리미엄 베다점 궁합 확장 | `premium-veda-compatibility-addon` | 308 |
| 프리미엄 점술 팩 해금 | `unlock.premium_divination_pack` (**unlock**) | 341 |
| (reason) 사주 신년운세 PDF/AI 상담 | `COIN_GATE_PER_USE_REASON_COSTS` | 131-148 |

### A-7. ₩30,000 초과 — **정비 1차 타깃**

| 코인 | 웹가 | 앱 SKU | 상품 | 유형 | L |
|---|---|---|---|---|---|
| 390 | ₩39,000 | `cd_content_tier_11` ₩49,000 | `unlock.premium_astrology` (점성술 전체 해금) | unlock | 348 |
| 390 | ₩39,000 | ″ | `unlock.premium_sukuyo` (숙요 전체 해금) | unlock | 349 |
| 390 | ₩39,000 | ″ | `unlock.premium_veda` (베다 전체 해금) | unlock | 350 |
| 500 | ₩50,000 | `cd_content_tier_12` ₩65,000 | `nakshatra-vvip-codex` (나크샤트라 VVIP 통합서) | per-use | 224 |
| 500 | ₩50,000 | ″ | `life-fortune-ai-consultation` (인생 총운 전문가 상담) | per-use | 258 |
| 500 | ₩50,000 | ″ | `master-love-codex-compat` (마스터 인연의 서 · 궁합) | per-use | 284 |
| 500 | ₩50,000 | ″ | `karma-destiny-ai-consultation` (운명의 업 전문가 상담) | per-use | 291 |
| 500 | ₩50,000 | ″ | (reason) 인생의 책 생성 12/13챕터 · 사주 인생의 책 PDF | per-use | 131-148 |
| 690 | ₩69,000 | `cd_content_tier_13` ₩89,000 | (reason) "운명의 업 생성" | per-use | 131-148 |
| 700 | ₩70,000 | ″ | `unlock.all_paid_saju` (사주 유료 전체 해금) | unlock | 332 |
| 700 | ₩70,000 | ″ | `unlock.premium_naming` (작명 전체 해금) | unlock | 351 |

**레지스트리 상품 9개 + reason 전용 가격 2건이 상한 ₩29,000을 초과**한다. 상품 9개 중 **5개가 `unlock.*` 번들 해금**(점성술/숙요/베다 전체 해금 ₩39,000 ×3, 사주 전체 해금·작명 전체 해금 ₩70,000 ×2)이라, (b)기능 분할보다 **(a)인하 또는 (d)번들 재구성**이 자연스럽다.

> ✅ **2026-09-01 종결 — 번들 해금 5종을 삭제했다.** 결론은 (a)인하도 (d)재구성도 아닌 **삭제**다.
> 전수 `git grep`(소스 + `__tests__/` + `scripts/verify-*`, `sync:public` 미러 포함) 결과 이 5개 키로
> 결제를 여는 화면이 **0건**이었다 — 서비스가 존재한 적이 없는 상품이다. 5종 전용이던 Play SKU
> `cd_content_tier_11`(₩39,000)·`cd_content_tier_13`(₩70,000)도 `CONTENT_TIER_TABLE` 에서 함께 뺐다.
> Play Console 비활성화는 사람 손 — [PLAY_CONSOLE_TASKS.md](PLAY_CONSOLE_TASKS.md) 1절.
> **남은 상한 초과는 500코인 4종 + reason 전용 690코인 1건**이며 그 처리는 미결이다.

### A-8. 이용권 플랜 — **상한 적용 대상 아님** (사용자 확정)

정본: `worker/payments/passes.js:30` `PASS_MONTHLY_WON`. `planId = ${tier}_1m`, 30일 단품(자동갱신 없음).

| 등급 | planId | 웹가 | 앱 SKU (`PASS_TIER_TABLE`) | 앱가 | 배수 | 건당 커버 상한 | 월 누적 한도 | 프로필 수 |
|---|---|---:|---|---:|---:|---:|---:|---:|
| standard | `standard_1m` | ₩9,900 | `cd_pass_standard_30d` | ₩13,000 | 1.313 | 30코인 (₩3,000) | ₩30,000 | 3 |
| premium | `premium_1m` | ₩29,900 | `cd_pass_premium_30d` | ₩36,000 | 1.204 | 50코인 (₩5,000) | ₩100,000 | 7 |
| vvip | `vvip_1m` | ₩59,000 | `cd_pass_vvip_30d` | ₩75,900 | 1.286 | 100코인 (₩10,000) | ₩200,000 | 15 |
| family | `family_1m` | ₩149,000 | `cd_pass_family_30d` | ₩185,000 | 1.242 | 무제한 | ₩500,000 | 무제한 |

`/points?plan=` 허용값은 planId가 아니라 **tier 이름 4개**(`standard`/`premium`/`vvip`/`family`) — `app/points/PointsClient.tsx:3110-3120`.

### A-9. 앱 Play SKU 티어표 — **상한 적용 대상 아님** (사용자 확정)

`worker/lib/app-store-pricing.js:30-45`. 웹가는 참조용으로 함께 저장돼 있고, **실제 청구는 앱가**다(`worker/routes/app-store.js:710` 주석).

| SKU | 코인 | 웹가 | 앱가 | 배수 |
|---|---:|---:|---:|---:|
| `cd_content_tier_01` | 30 | 3,000 | 3,900 | 1.30 |
| `cd_content_tier_02` | 50 | 5,000 | 6,000 | 1.20 |
| `cd_content_tier_03` | 60 | 6,000 | 7,500 | 1.25 |
| `cd_content_tier_04` | 70 | 7,000 | 8,900 | 1.27 |
| `cd_content_tier_05` | 90 | 9,000 | 10,900 | 1.21 |
| `cd_content_tier_06` | 100 | 10,000 | 13,000 | 1.30 |
| `cd_content_tier_07` | 120 | 12,000 | 15,000 | 1.25 |
| `cd_content_tier_08` | 150 | 15,000 | 19,000 | 1.27 |
| `cd_content_tier_09` | 200 | 20,000 | 25,000 | 1.25 |
| `cd_content_tier_10` | 300 | 30,000 | 39,000 | 1.30 |
| `cd_content_tier_11` | 390 | 39,000 | 49,000 | 1.26 |
| `cd_content_tier_12` | 500 | 50,000 | 65,000 | 1.30 |
| `cd_content_tier_13` | 690 / 700 | 70,000 | 89,000 | 1.27 |

**현행 배수는 이미 1.20~1.30으로 지시서의 1.20~1.35 규칙을 만족한다.** 반면 제안된 티어 사다리의 균일 배수 1.21은 현행보다 낮아, 6티어로 줄이면 앱 매출이 별도로 감소한다.

---

## 표 B — 가격 하드코딩 지점

> 범위: **P0(결제 실행 경로) 전수** · **P1(표시 문구) 파일 단위 요약** · P2/P3 그룹 요약. (사용자 확정)

### 🔴 중복 사본 경고 — 표 B 전체에 적용

다음 쌍은 **바이트 단위로 동일한 사본**이다. 한 곳만 고치면 반드시 어긋나고, `verify:public-parity`·`verify:style-sync`가 이를 잡는다.

- `js/*.js` ↔ `public/js/*.js` (destiny-profile, saju-engine, saju-engine-tarot-sukuyo-quantum, sibyl-system, entertain-engine, animal-totem-experience, vedic-ai-consultation, vedic-book 전부 확인)
- 정적 셸 7벌: 루트 `index.html` · `public/index.html` · `public/{en,ja,zh,zh-tw,static}/index.html`
- 루트 `*.html` ↔ `public/*.html` (celestial-harmony, vedic-astrology, tarot-ijik 등)

즉 아래 P0 목록의 파일 수에 **사본 배수를 곱해야 실제 수정 대상**이 된다.

### B-P0 — 결제 실행 경로 (전수)

#### P0-1. 이용권/포인트 결제 금액 — `app/points/PointsClient.tsx`

| 라인 | 값 | 맥락 |
|---|---|---|
| 575 / 593 / 611 / 630 | `baseWonPrice: 9900 / 29900 / 59000 / 149000` | `SUBSCRIPTION_BASE_PLANS` |
| 654 | `wonPrice = baseWonPrice * months * (1 - discount)` | 위 4개가 흘러드는 계산 |
| **3045** | `amount: plan.wonPrice` | `/api/payments/subscription/prepare` **실제 청구 금액** |
| 694 | `amount: 3000, points: 30` | `POINT_PACKAGES` `direct_paid_service` |
| **4206** | `paymentAmount: selectedPackage.amount` | `/api/payments/prepare` |
| 1047 / 1434 / 2864 | `* 100` | `formatKrwFromCoins` 대신 직접 환산 3곳 |

#### P0-2. React 폴백 상수 (서버 runtimeGate 실패 시 이 값이 결제창에 그대로 간다)

| 파일 | 라인 | 값 |
|---|---|---|
| `app/astrology-ai/AstrologyAiClient.tsx` | 84-85 | `300 / 30000` |
| `app/fusion-fortune/FusionFortuneClient.tsx` | 84 | `30000` |
| `app/karma-destiny-ai/KarmaDestinyAiClient.tsx` | 119-120 | `500 / 50000` |
| `app/island-consult/IslandConsultClient.tsx` | 25-27, 38 | `200 / 20000 / 2000`, `5000` |
| `app/ziwei-ai/ZiweiAiClient.tsx` | 159-161 | `300 / 30000 / 3000` |
| `app/components/ziwei/ZiweiAiConsultPanel.tsx` | 32-34 | `300 / 30000 / 3000` |
| `app/components/ziwei/ZiweiDeepPdfPanel.tsx` | 29-30 | `300 / 30000` |
| `app/vedic-ai/VedicAiClient.tsx` | 102-104 | `300 / 30000 / 3000` |
| `app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx` | 111-113 | `300 / 30000 / 3000` |
| `app/new-year-ai-consultation/NewYearAiClient.tsx` | 160-162 | `300 / 30000 / 3000` |
| `app/naming-ai/NamingAiClient.tsx` | 24, 26 | `30000 / 3000` |
| `app/nakshatra/vvip/VvipClient.tsx` | 22 | `50000` |
| `app/nakshatra/lord-report/LordReportClient.tsx` | 11 | `10000` |
| `app/nakshatra/dasha-map/DashaMapClient.tsx` | 12 | `15000` |
| `app/nakshatra/muhurta/MuhurtaClient.tsx` | 23 | `5000` |
| `app/nakshatra/compat/NakshatraCompatClient.tsx` | 101 | `cost:100, amountKRW:10000` (인라인) |
| `app/destiny-compass/_hooks/useCompassReport.ts` | 25 | `10000` |
| `app/destiny-compass/_components/Crossroads.tsx` | 50 | `10000` |
| `app/destiny-compass/_components/FutureSim.tsx` | 47 | `10000` |
| `app/destiny-compass/_components/LifeVoyage.tsx` | 40 | `10000` |
| `app/fortune-chat/FortuneChatClient.tsx` | 34 | `5000` |
| `app/love-secret-ai/LoveSecretAiClient.tsx` | 706 | `30000` |
| `app/life-book-ai/lifeBookCopy.ts` | 22-23 | `{300,30000,3000}` / `{500,50000,5000}` |
| `app/tarot/crystal-soul/CrystalSoulTarotClient.jsx` | 12-13 | `50`, `*100` |
| `src/features/master-love-codex/constants.ts` | 5-6, 11-12 | `300/30000`, `500/50000` |
| `src/features/fortune-tea-house/data/consultPricing.ts` | 13,18,23,28,33 | `5000/7000/10000/20000/20000` (+ 라벨 14,19,24,29,34) |

#### P0-3. 레거시 브라우저 번들 (`js/` — `public/js/`에 동일 사본)

| 파일 | 라인 | 값 |
|---|---|---|
| `js/vedic-ai-consultation.js` | 10, 183-184, 203 | `VEDIC_COIN_COST = 390` → 게이트 전송 + "39,000원" 라벨 |
| `js/vedic-book.js` | 20, 1311-1312 | `VEDIC_COIN_COST = 390` |
| `js/saju-engine.js` | 7264-7266 | `cost:200, amountKrw:20000, paymentAmount:20000` |
| `js/saju-engine.js` | 5720, 20290 | `100`, `100` (AI 프롬프트 게이트) |
| `js/saju-engine.js` | 14191, 14452, 21339, 27059 | `_cdCoinGatePerUse(50, …)` ×4 |
| `js/saju-engine-tarot-sukuyo-quantum.js` | 819-820, 905-906 | `50 / 5000` |
| `js/saju-engine-tarot-sukuyo-quantum.js` | 7337-7344 | 숙요 유료 8종 `cost: 30/50/100/120` |
| `js/saju-engine-tarot-sukuyo-quantum.js` | 14375-14376, 15116 | `100 / 10000`, `(cost * 100)` |
| `js/destiny-profile.js` | 60, 2098-2099 | `PROFILE_CARD_MANAGE_COST = 50`, `100`, `200` |
| `js/animal-totem-experience.js` | 616, 623, 630 | `30 / 30 / 60` |
| `js/sibyl-system.js` | 3859 | `100` |
| `js/entertain-engine.js` | 2745 | `TETOGEN_DEEP_REPORT_COST = 100` |
| `js/tarot-year-fortune-experience.js` | 31 | `100` |
| `js/tarot-reunion-experience.js` | 57 | `50` |
| `js/tarot-love-experience.js` | 24 | `50` |
| `js/iching-engine.js` | 300 | `30` |
| `js/oracle-kcg.js` | 826 | `30` |
| `js/core/pass-verdict.js` | 61 | `PREMIUM_QUOTA_MIN_COIN_COST = 300` (커버 판정 문턱 사본) |
| `js/core/feature-pricing-store.js` | 21, 52-53, 57 | `*100`, `/100`, `toLocaleString + '원'` — 환산·표시 자체 구현 |
| `PhysiognomyUI.js` (루트 + `public/`) | 1202, 1948 | `_cdCoinGatePerUse(50, …)` |
| `PastLifeFaceUI.js` | 60 | `PLF_COMPAT_COIN_COST = 50` |

#### P0-4. 독립 정적 HTML (루트 + `public/` 사본)

| 파일 | 라인 | 값 |
|---|---|---|
| `vedic-astrology.html` | 3307, 3367, 3856, 6976 | `100`, `10000`, `5000`, `50` |
| `celestial-harmony.html` | 1008 | `100` |
| `geomancy-oracle-v4.html` | 805 | `50` |
| `tarot-ijik.html` | 1497 | `50` |
| `ifa_oracle_v2_full.html` | 283 | `30` |
| `royal-tea-oracle.html` | 2195 | `50` |
| `myungwun_final.html` | 781, 784 | `70,000원` (결제 버튼 포함) |

#### P0-5. 워커 (서버가 금액을 직접 씀)

| 파일 | 라인 | 값 |
|---|---|---|
| `worker/payments/passes.js` | 30 | `PASS_MONTHLY_WON` — 이용권 청구 정본 |
| `worker/routes/payments.js` | 353-356 | `9900/29900/59000/149000` — **passes.js와 이중 정의** |
| `worker/routes/naming-prompt.js` | 20 → 753,754,831,1301,1597,1621 | `30000` |
| `worker/routes/vedic-ai.js` | 32 → 337, 543 | `30000` |
| `worker/routes/ziwei-ai.js` | 36 → 471 | `30000` |
| `worker/routes/ziwei-island-ai.js` | 31 → 156 | `20000` |
| `worker/routes/ziwei-island-report.js` | 23 → 102 | `5000` |
| `worker/routes/sukuyo-compatibility-ai.js` | 23 → 876,894,895,1707 | `30000` |
| `worker/routes/sukuyo.js` | 23 | `30000` |
| `worker/routes/user.js` | 17-18 → 267, 275 | `50 / 5000` (프로필 카드) |
| `worker/routes/tarot.js` | 180, 46 | `amountCoins:100, amountKRW:10000`, `30` |
| `worker/routes/nakshatra-premium.js` | 35, 41 | `10000 / 15000` |
| `worker/routes/destiny-compass-ai.js` | 50 | `100` |
| `worker/routes/destiny-bias.js` | 24 | `50` |
| `worker/routes/celestial-harmony.js` | 21 | `100` |
| `worker/routes/ziwei-daehan.js` | 8 | `100` |
| `worker/routes/fpti.js` | 855 | `coinAmount: 200` |
| `worker/routes/fortune.js` | 104-105 | `PIG_COIN_DEFAULT_UNLOCK_COST=10`, `PIG_COIN_MAX_COST=100000` |
| `worker/lib/master-love-codex-prompt.mjs` | 29 | `30000` |
| `worker/lib/master-love-codex-compat-prompt.mjs` | 30 | `50000` |
| `worker/lib/profile-limits.js` | 9 | `KRW_PER_COIN = 100` — `billing-policy.js`와 **이중 정의** |
| `worker/lib/profile-limits.js` | 96-99 | `MONTHLY_PASS_LIMITS 300/1000/2000/5000` |
| `worker/payments/legacy-pricing.js` | 84 | `priceCoins * 100` |
| `lib/music-access-policy.js` | 5-6 | `1000 / 10` |
| `worker/lib/app-store-pricing.js` | 31-44, 55-61 | 앱 SKU 전량 (**정본이므로 여기 있는 게 맞다**) |

### B-P1 — 사용자에게 보이는 가격 표시 (파일 단위 요약)

| 대상 | 건수 | 비고 |
|---|---:|---|
| **정적 셸 7벌** (`index.html` + 6 미러) | **각 141건** | 값 분포 동일: `5,000원`×48 · `10,000원`×27 · `30,000원`×24 · `3,000원`×22 · `20,000원`×10 · `50,000원`×3 · `9,900원`×2 · `6,000원`×2 · `59,000`/`29,900`/`149,000` 각 1 |
| └ `index.html:1235` | 1 | **CSS `::after`의 `content:"전문가 상담 · 30,000원"`** — i18n 자체가 불가능한 형태 |
| └ `index.html:18906,18959,18987,19016,19045,19072,19098,19124,21603` | 9 | `data-cd-trans` 없는 배지 — 번역 누락 + 하드코딩 동시 |
| └ `index.html:22598-22601` | 4 | `goldenPackages` 이용권 가격(표시 전용, 구매는 `/points?plan=`로 인계) |
| └ `index.html:34098-34235` | ~30 | 기능 프리뷰 카탈로그 `cost:'🔒 해금 20,000원'` 형태 |
| **i18n 런타임 사전 12벌** (`public/i18n/*.json`) | ko 50 · en 93 · zh-cn/zh-tw 각 91 · nl 90 · de/es 각 86 · hi 77 · ja/ms 각 76 · vi 74 · fr 8 | 번역 **문장 안에** 금액이 박혀 있음. `{{price}}` 플레이스홀더 없음 |
| └ `public/i18n/*.json:1626, 1642` | 12벌 전부 | `"krwPrice": 9900` / `59000` — `GlobalPricingCard` 금액이 12개 언어에 복제 |
| `public/i18n/*/shellRuntime.json` (8개 로케일) | 다수 | 셸 런타임 문자열 |
| `i18n/authored/shellRuntime-{10,13,16,18,19}.json` · `i18n/pending/*` | 25+ | 저작 소스에도 12개 언어 동시 하드코딩 |
| `app/_lib/serviceSections.js` | ~18 | `fallbackDesc` — 사실상 서비스 카탈로그 |
| `app/_lib/serviceFeatureRegistry.ts` | 7 | `priceLabel`, `highlights` |
| `app/_lib/serviceMap.js` | 3 | `landingPoints` |
| `app/components/MainLandingPage.tsx` | ~17 | 카드 badge + **한→영 하드코딩 번역 맵**(185-194) |
| `app/components/GlobalPricingCard.jsx` | 3 | 랜딩에 실제 렌더 (표 D-2) |
| `app/saju-guardian/SajuGuardianClient.tsx` | 12 | `10,000원` + 자체 en 번역 맵 |
| `app/points/{PointsClient,SubscriptionStatusCard}.tsx` | 10 | 등급 혜택 문구 |
| 개별 기능 화면 (`island-consult`, `destiny-compass/*`, `fortune-chat`, `fusion-fortune`, `naming-ai`, `nakshatra/*`, `tarot/*`, `psychotest/*`, `fpti/*`, `maya/*`, `guardian-fortune` 등) | ~40 | 버튼 라벨·`fallbackLabel` |
| **약관 본문** `app/terms-of-service/TermsContent.jsx:82,85` · `lib/legal/legalContent.ts:57,78` | 4 | 법적 고지에 금액 명시 — 가격 변경 시 **약관도 함께 개정** 필요 |
| 워커 402 응답 메시지 (`fusion-fortune.js:832`, `guardian-fortune-usage.js:159,709`, `guardian-fortune-generate.js:25`, `fortune.js:3270,3498`, `user.js:261`) | 7 | 사용자에게 그대로 노출 |
| `worker/routes/sibyl.js:30` | 1 | **정규식으로 가격 문자열을 검증** — 가격 변경 시 조용히 깨진다 |
| 레거시 번들 표시 문구 (`js/saju-engine.js` ~35 · `js/saju-engine-tarot-sukuyo-quantum.js` ~22 · `js/destiny-profile.js` 11 · `js/sibyl-system.js` 5 · `PhysiognomyUI.js` 2 · `PastLifeFaceUI.js` 5 · 기타) | ~85 | `public/js/` 사본 포함 시 ×2 |
| 정적 마케팅 HTML (`celestial-harmony`, `cosmic-soul-meditation`, `neville-meditation`, `yoga-guru`, `ifa-oracle-about`, `tarot-ijik`, `vedic-astrology`) | ~35 | 루트 + `public/` 사본 |

### B-P2 — 정적 마케팅·SEO 문구 (요약)

`app/fusion-fortune/{page.tsx,FusionFortuneSeoContent.tsx}` · `app/naming-ai/page.tsx` · `app/saju/sibyl/page.tsx` 등 SEO 본문 약 10건.
`app/README.md:21-23,95-96`은 **현행 가격과 이미 불일치**(`49,000/29,000/10,000/1,000원`).
CSS 주석 2건(`fusion-fortune.module.css:802`, `codex.module.css:470`).

### B-P3 — 주석·테스트·검증 스크립트·문서 (요약, 200건+)

- `worker/lib/*`·`worker/routes/*` 주석 다수
- `__tests__/worker/*` — `payments.prepare-idempotency`, `payments-v2.subscription`, `paid-feature-registry.integrity` 등이 금액 리터럴로 단언
- `scripts/verify-*.mjs` — `verify-payment-policy-md`, `verify-billing-pass-policy`, `verify-portone-single-payment-regression` 등이 금액 문자열을 검사
- `scripts/create-play-console-products.mjs:48,83` — Play 상품 생성 스크립트에 `"AI 상담 39,000원"`, `₩3,900`
- 루트/`docs/` 마크다운 — `PAYMENT_POLICY.md`, `MOBILE_FEATURE_REGISTRY.md`(20건+), `CLAUDE.md:124,125,144`, `docs/payment-policy-*.md`, `docs/play-console-submission-values.md`

> **가격 변경 시 P3도 실질 작업이다** — 테스트·verify 스크립트가 금액을 단언하고 있어, 티어를 바꾸면 이들이 먼저 빨갛게 된다.

---

## 표 C — 가격 분포 요약

### 고유 가격 포인트: **16개** (레지스트리 코인 14종 + reason 전용 690 + 음악 10코인)

집계 방법: `sed -n '177,322p'`(가격표) / `'326,357p'`(unlock 상품) 에서 `cost:` 리터럴을 세고, 두 표에 같은 featureKey로 중복 등장하는 7건(ziwei 4종 · `saju-guardian-unlock` · `tetogen_deep_report` · `ziwei_love_deep`)을 1건으로 합쳤다. destiny-bias 4종과 `flower-studio-per-use` 는 2026-08-24 에 레지스트리에서 제거됐다(청구처 0곳).

| 코인 | 웹가 | 가격표 | unlock 표 | 고유 상품 수 | 앱 SKU |
|---:|---:|---:|---:|---:|---|
| 5 | ₩500 | 1 | — | **1** | 무료 |
| 10 | ₩1,000 | (레지스트리 밖) | — | **1** (음악) | 무료 |
| 30 | ₩3,000 | 17 | 1 | **18** | tier_01 |
| 50 | ₩5,000 | 51 | 6 | **57** | tier_02 |
| 60 | ₩6,000 | 1 | — | **1** | tier_03 |
| 70 | ₩7,000 | 2 | — | **2** | tier_04 |
| 90 | ₩9,000 | 1 | 1 | **1** | tier_05 |
| 100 | ₩10,000 | 29 | 9 | **32** | tier_06 |
| 120 | ₩12,000 | 2 | 1 | **2** | tier_07 |
| 150 | ₩15,000 | 2 | 3 | **3** | tier_08 |
| 200 | ₩20,000 | 6 | 2 | **8** | tier_09 |
| 300 | ₩30,000 | 15 | 1 | **16** | tier_10 |
| 390 | ₩39,000 | — | 3 | **3** | tier_11 |
| 500 | ₩50,000 | 4 | — | **4** | tier_12 |
| 690 | ₩69,000 | reason 전용 | — | **1** | tier_13 |
| 700 | ₩70,000 | — | 2 | **2** | tier_13 |
| | | **131** | **29** | **≈152** | |

- **최저 ₩500 · 최고 ₩70,000** (이용권 제외)
- **₩5,000(57개) · ₩10,000(32개) · ₩30,000(16개) 세 가격대에 105개, 전체의 약 69%가 몰려 있다.** 6티어 수렴의 실질 난이도는 낮다 — 진짜 문제는 양극단이다
- 히스토그램: `≤₩1,000` 2 · `₩3,000~9,000` 22 · `₩10,000~20,000` 45 · `₩30,000` 16 · `>₩30,000` **10** (390×3 · 500×4 · 690×1 · 700×2)

### 지시서 티어 사다리 대비 예비 관측 (Phase 2 입력용, 제안 아님)

| 제안 티어 | 웹가 | 코인 | 흡수될 현행 가격대 | 이동폭 |
|---|---:|---:|---|---|
| `T1_LITE` | 2,900 | 29 | ₩500 · ₩1,000 · ₩3,000 | +480% / +190% / **-3.3%** |
| `T2_BASIC` | 4,900 | 49 | ₩5,000 · ₩6,000 · ₩7,000 | **-2%** / -18% / -30% |
| `T3_PLUS` | 9,900 | 99 | ₩9,000 · ₩10,000 · ₩12,000 | +10% / **-1%** / -17.5% |
| `T4_PREMIUM` | 19,000 | 190 | ₩15,000 · ₩20,000 | +27% / **-5%** |
| `T5_MASTER` | 29,000 | 290 | ₩30,000 · ₩39,000 · ₩50,000 · ₩69,000 · ₩70,000 | **-3.3%** / -26% / -42% / -58% / -59% |

**확장 슬롯 `T3H_PLUS_HIGH(₩14,900)` 활성화를 권고한다** — ₩9,000~₩20,000 구간에 44개 상품(전체의 약 30%)이 몰려 있어, T3(9,900)와 T4(19,000) 둘로만 받으면 ₩12,000·₩15,000 상품 5개가 각각 -17.5%/+27%로 크게 튄다.

---

## 표 D — 리스크 노트

### D-1. 🔴 레지스트리에 없는 featureKey로 결제가 진행된다 — 베다 프리미엄

| 위치 | 값 |
|---|---|
| `js/vedic-ai-consultation.js:9-10` · `js/vedic-book.js:8,20` | `featureKey = 'premium_pdf_vedic'`, `cost = 390` |
| `js/vedic-ai-consultation.js:203` | 라벨 `'베다점 AI 상담 결과 생성 · 39,000원'` |
| `worker/lib/paid-feature-registry.js` | **`premium_pdf_vedic` 항목 없음** (별칭 표에도 없음) |
| `paid-feature-registry.js:350` | `unlock.premium_veda` → `premium-veda`, cost **390** |
| `paid-feature-registry.js:178` | `vedic-ai-consultation` cost **300** / `amountKRW: 30000` |
| `app/vedic-ai/VedicAiClient.tsx:102-104` | `300 / 30000` |
| `index.html:30539` | 셸 로컬 매핑 `premium_pdf_vedic → 'premium-vedic-report'` |

**세 가지가 어긋나 있다.** 클라이언트가 보내는 키(`premium_pdf_vedic`)는 가격 레지스트리에 존재하지 않고, 금액 390코인은 `unlock.premium_veda`(전체 해금)의 값이며, 화면 라벨은 `vedic-ai-consultation`(300코인/₩30,000)과 같은 문구를 쓴다. `app/astrology-ai/AstrologyAiClient.tsx:81-83` 주석이 정확히 이 유형의 사고("결제창엔 39,000원, 실제론 30,000원 청구")를 기록해 뒀는데, 레거시 번들에만 그대로 남았다.
`scripts/verify-vedic-ai-flow.mjs:62,108`은 **React 클라이언트와 워커 라우트에 `premium_pdf_vedic`가 없을 것**을 단언한다 — 즉 이 키는 의도적으로 폐기된 경로이고 레거시 번들만 살아 있다.

**위험도: 높음 / 우선 확인 필요.** Phase 2 이전에 별건으로 처리할지 결정 권장.

> ✅ **2026-09-01 종결 — 이 경로는 이미 사라져 있었다.** 표 첫 줄의 `js/vedic-ai-consultation.js` ·
> `js/vedic-book.js` 는 **레포에 없다**. 전수 `git grep premium_pdf_vedic` 로 남은 자리는 셋뿐이다:
> `index.html:29322`(결제 개시가 아니라 **결제 후 응답 featureKey 정규화표**) ·
> `scripts/verify-vedic-ai-flow.mjs:63,122`(부재 단언) · `worker/lib/vedic-premium-generator.js:1874`
> (산출 JSON 의 메타 필드). `premium_pdf_vedic` 는 지금도 가격 레지스트리·별칭 표 어디에도 없어
> **이 키로는 390코인이 매겨지지 않는다.** 390 가격대 자체도 2026-09-01 에 없어졌다(A-7 종결 노트).

### D-2. 🔴 랜딩 가격 카드가 환산 규칙과 정면 충돌 — `GlobalPricingCard.jsx`

`app/components/GlobalPricingCard.jsx:44-69`

| 티어 | 표시 금액 | 코인 | `KRW_PER_COIN=100` 기준 정합 금액 | 배율 |
|---|---:|---:|---:|---:|
| Starter | ₩9,900 | 10 | ₩1,000 | **9.9배** |
| Standard | ₩29,000 | 35 | ₩3,500 | **8.3배** |
| Premium | ₩59,000 | 80 | ₩8,000 | **7.4배** |

`app/components/MainLandingPage.tsx:401,645`에서 `dynamic()`으로 **실제 렌더된다**(`reports/unused-files-report.json:145`의 "미사용" 등재는 오류). 같은 값이 **12개 로케일 JSON `*.json:1626,1642`에도 복제**돼 있다.
금액 자체는 이용권 가격(9,900/59,000)과 비슷해 "코인팩"이 아니라 이용권 카드의 잔재로 보이나, 코인 수량이 함께 표시돼 있어 **사용자가 10코인을 9,900원에 사는 것으로 읽을 수 있다.**

**위험도: 높음(표시 오류) / 결제 실행 경로는 아님** — `onSelectTier`가 결제를 직접 태우지 않는지 Phase 2에서 확인 필요.

### D-3. `AppSettingsModel.js` 이름·값 10배 불일치

`app/_lib/models/AppSettingsModel.js:16-18` — `"기본팩 50,000원"` / `priceKRW: 5000`, `"표준팩 1,20,000원"`(오타) / `10000`, `"프리미엄팩 22,000원"` / `22000`. `reports/unused-files-report.json:39`에 미사용 등재 — 실사용 여부 확인 후 삭제 또는 정정 대상.

### D-4. 🔴 티어 값이 이용권 커버 여부를 직접 바꾼다

`worker/lib/profile-limits.js:77-82` `PASS_LIMITS`는 **코인 정수**다: standard 30 · premium 50 · vvip 100 · family 무제한.

| 제안 티어 | 코인 | 커버하는 등급 | 현행 대비 |
|---|---:|---|---|
| T1_LITE 2,900 | 29 | standard · premium · vvip | **신규** — 현재 이 가격대 상품 없음. standard 이용권이 처음으로 콘텐츠를 무료 커버하게 된다 |
| T2_BASIC 4,900 | 49 | premium · vvip | 현행 50코인과 동일 |
| T3_PLUS 9,900 | 99 | vvip | 현행 100코인과 동일 |
| T4/T5 | 190 / 290 | family only | 현행 200/300코인과 동일 |

제안 값이 각 한도 **바로 아래**(29<30, 49<50, 99<100)라 커버 구조는 우연히 보존된다. 다만 **₩3,000 상품 16개가 T1(₩2,900)으로 내려가면 standard 이용권 보유자에게 전부 무료가 된다** — 현재도 30코인=한도 30이라 이미 커버되므로 실질 변화는 없으나, T1에 ₩500·₩1,000 상품까지 흡수시키면 그것들도 standard 커버 대상이 된다.

### D-5. 🔴 `PREMIUM_QUOTA_MIN_COIN_COST = 300` 문턱을 T5가 통과하지 못한다

`worker/lib/profile-limits.js:21` (사본: `js/core/pass-verdict.js:61`)

현재 `fusion-fortune-consultation`은 300코인(₩30,000)으로 이 문턱과 **정확히 일치**해, VVIP는 건당 상한(100코인)을 초과함에도 **이용권 기간당 3회 포함** 혜택을 받는다(family 10회). T5(₩29,000 = 290코인)로 내리면 `price >= 300`이 거짓이 되어 **VVIP의 3회 포함 혜택이 조용히 사라진다.**

같은 문턱에 걸린 A-6 상품 16개 전부가 영향권이다. Phase 2에서 T5를 ₩30,000(300코인)으로 하거나, 문턱을 290으로 함께 내리는 결정이 필요하다.

### D-6. 🔴 최저가 하한 충돌

- 음악 다운로드 ₩1,000 — **KG이니시스가 1,000원 미만 카드결제를 거부**해 300원→1,000원으로 올린 값. `verify:billing-pass-policy`가 하한을 강제한다
- `fortune-fish-gacha` ₩500 — 위 하한 미만. 현재 앱에서는 `APP_FREE_MAX_COIN_PRICE = 10`으로 무료 통과, 웹에서는 이용권/월정석으로만 사실상 소비되는 것으로 보인다
- T1(₩2,900)으로 흡수하면 각각 **+190% / +480%**이고, 앱 무료 통과 경로가 사라진다

### D-7. 결제 동결 매니페스트

`config/payment-freeze.json`에 다음이 등재돼 있다: `index.html`의 `_cdChooseServicePaymentMode`/`_cdRunDirectKrwCheckout`/`_cdOpenPaidServiceGate`, `js/destiny-profile.js`의 `_dpRenderStandalonePaymentChoice`, `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `lib/payment/portone.ts`, `js/coin-gate-helper.js`.

Phase 3에서 이 영역의 가격 문자열을 건드리면(**순수 문구 변경이라도**) `verify:payment-freeze`가 CI에서 실패한다. `node scripts/verify-payment-freeze.mjs --update`로 매니페스트를 갱신해 **같은 커밋에** 담아야 한다.

### D-8. 주문 스냅샷 필드 부재 (Phase 5 대상, 이번엔 기록만)

`worker/lib/models.js` `paymentSchema` (L242–310) 실제 필드:

| 지시서가 요구한 필드 | 실제 |
|---|---|
| `paid_amount` | **`paymentAmount`** (L247) — 존재 |
| `currency` | **없음.** `metadata.currency = "KRW"`로만 저장(`worker/payments/passes.js:144`). 스키마 필드는 `serviceExecutionTransactionSchema:656`에만 존재 |
| `price_tier_id` | **없음.** 앱 SKU는 `productId`(L251, 예 `cd_content_tier_06`)와 `pricingSnapshot.productId`로 간접 표현 |
| `catalog_version` | **없음** (저장소 전체 미검출) |
| `platform` | **없음.** `paymentMethod:"GOOGLE_PLAY"` / `pricingSnapshot.provider` / `metadata.provider`로 표현 |

실질적 금액 스냅샷 정본은 **`pricingSnapshot`(Mixed)** 이다. Google Play 경로는 `webAmountKRW`·`amountKRW`·`cashPrice`·`provider` 등을 여기 넣는다(`worker/routes/app-store.js:721-734`).
**과거 거래는 `paymentAmount` + `pricingSnapshot`으로 이미 불변 보존되고 있으므로 소급 재계산 위험은 낮다.** 다만 `price_tier_id`/`catalog_version`이 없어 "이 주문이 어느 카탈로그 버전의 어느 티어였나"를 사후 재구성할 수 없다.

### D-9. 정본이 여러 벌인 지점 (가격 변경 시 동시 수정 필수)

| 값 | 정의 위치 |
|---|---|
| `KRW_PER_COIN = 100` | `worker/lib/billing-policy.js:1` · `lib/payment/coin-pricing.ts:3` · `worker/lib/profile-limits.js:9` — **3벌** |
| 이용권 가격 | `worker/payments/passes.js:30` · `worker/routes/payments.js:353-356` · `app/points/PointsClient.tsx:571-644` · 셸 `goldenPackages`(`index.html:22598-22601`) — **4벌** |
| `PREMIUM_QUOTA_MIN_COIN_COST` | `worker/lib/profile-limits.js:21` · `js/core/pass-verdict.js:61` — **2벌** |
| 일부 코인가 | `worker/lib/billing-feature-registry.js:18-49`가 palm-reading·stonehenge-runes·animal-totem의 cost를 **리터럴로 재기입**(값은 현재 일치) |
| 코인↔원 환산·표시 | `lib/payment/coin-pricing.ts` · `js/core/feature-pricing-store.js:21,52-53,57` — 브라우저 런타임이 자체 구현 |

### D-10. 앱/웹 배수는 이미 규칙을 만족하며, 6티어화가 **앱 매출을 별도로 낮춘다**

현행 배수 1.20~1.30(A-9)은 지시서의 1.20~1.35 범위 안이다. 제안된 균일 배수 1.21은 현행 평균(약 1.27)보다 낮아, 웹가 인하와 별개로 앱 측 추가 인하가 발생한다.
또한 **Play SKU 13개 → 5개 통폐합**은 기존 SKU의 판매 중단을 의미한다. 이미 구매한 사용자에 대한 영향과 Play Console 정책상 유예 기간은 Phase 5 `PLAY_CONSOLE_TASKS.md`에서 다룬다.

### D-11. 🔴 `verify:payment-policy-md`가 **현재 실패 상태**다 (이 감사와 무관한 선행 결함)

```
[verify-payment-policy-md] FAIL — PAYMENT_POLICY.md 와 코드 가격이 어긋났습니다:
  - paid-feature-registry.js: 레거시 'compat-sukuyo-compatibility' cost=50 (문서 100) — 현행 유지 위반
  - paid-feature-registry.js: 레거시 'compat-sukuyo-compatibility' cost×100=5000 이 문서 KRW 10000과 다릅니다.
```

`PAYMENT_POLICY.md:63`은 `compat-sukuyo-compatibility`를 **10,000원 / 100코인 · 현행 유지**로 적고 있으나, `paid-feature-registry.js:218`은 **50코인(₩5,000)** 이다. `CLAUDE.md`에 2026-08-12 인하(100코인→50코인)가 기록돼 있으니 **정책 문서만 갱신되지 않은 드리프트**다.

이 감사 문서는 새 파일이고 위 스크립트는 `PAYMENT_POLICY.md`와 레지스트리만 읽으므로 **이번 작업이 만든 실패가 아니다.** 다만 Phase 3에서 가격을 실제로 바꾸기 전에 먼저 해소해야 한다 — 그러지 않으면 티어 정비로 인한 실패와 이 선행 실패가 섞여 원인 판별이 어려워진다.

### D-12. 판매 데이터 접근 불가

상품별 판매 비중·매출 데이터에 **접근할 수 없다**. 표 G(영향 시뮬레이션)의 매출 영향 추정은 Phase 2에서 **"데이터 없음"으로 명시**하고 추정치를 지어내지 않는다. `PointHistory`·`Payment` 컬렉션을 읽는 read-only 집계가 필요하면 별도 승인 요청 대상이다.

---

## 다음 단계 — STOP 1

Phase 2(티어 사다리 확정 + 상품별 매핑)로 넘어가기 전에 확인이 필요한 결정 사항:

0. **D-11 (선행)** — `verify:payment-policy-md`가 이미 실패 중이다. 가격을 실제로 바꾸기 전에 `PAYMENT_POLICY.md:63`의 스테일 값을 먼저 해소할 것
1. **D-5** — T5를 ₩29,000으로 할 것인가, ₩30,000(300코인)으로 하여 `PREMIUM_QUOTA_MIN_COIN_COST` 문턱을 보존할 것인가
2. **D-6** — ₩500 가챠와 ₩1,000 음악 다운로드를 (a) T1로 인상 (b) 무료 전환 (c) 예외 티어 신설 중 무엇으로 할 것인가
3. **표 C 하단** — `T3H_PLUS_HIGH(₩14,900)` 확장 슬롯을 활성화할 것인가 (₩9,000~20,000 구간에 44개 상품 밀집)
4. **D-1 / D-2** — 발견된 두 결함을 Phase 2 이전에 별건 수정할 것인가, 티어 정비에 흡수할 것인가
5. **Phase 4 재설계** — 검색 인프라가 없으므로 "가격대 필터"를 `#cdServiceIndex`(셸 7벌 클라이언트 검색)에 붙일지, 별도 카탈로그 페이지를 새로 만들지
