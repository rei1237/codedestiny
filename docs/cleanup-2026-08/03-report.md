# Phase 3 — 등급 보고 (⛔ 승인 대기, 여기서 정지)

> 2026-08-09 / 베이스 `177e01a4d` / **파일 이동·삭제 0건**
> 근거: [00-baseline.md](00-baseline.md) · [01-static.md](01-static.md) · [02-dynamic.md](02-dynamic.md)

## 요약

- **후보 총 108건** — 파일 단위 86 + 구조·계약 단위 22
- **A(즉시 격리 가능) 54건 / B(조건부) 39건 / C(보류) 15건**
- **예상 효과 (정직하게)**
  - 프로덕션 **번들 감소: 0 KB** — A등급 54파일(455 KB)은 전부 이미 어느 번들에도 안 들어간다(그래서 고아다). 선행 감사(2026-07-25)와 같은 결론이다.
  - 실제 번들 이득은 Dead 가 아니라 **Perf 항목에서 나온다**: `serviceFeatureRegistry` 분리로 4개 타로 라우트에서 **−285 KB(초기 로드)**, 미지원 로케일 8종 제거로 소스 **−5,300줄**
  - 의존성 −1 (`@tanstack/react-virtual`, 단 `package-lock.json` 수정 필요)
  - 빌드·타입체크 시간 감소: 측정 가능한 수준 아님 (typecheck 31초, lint 15초)
  - **가장 큰 이득은 숫자가 아니다** — 다음 세션이 죽은 결제 모달·틀린 폴더 지도·안 도는 가드를 정본으로 오인하지 않게 되는 것

---

## 등급 정의

- **A** — 전 채널(코드·HTML·Android·Worker·i18n·설정) 참조 0. 정적·동적 검증 통과. 즉시 격리 가능
- **B** — 참조는 0이나 결제/권한 인접이거나, 하나의 기능 군집이거나, 정본 지정이 선행돼야 함
- **C** — 동적 참조 의심 또는 하드 제약 인접. **이번 회차 제외**

---

## 등급별 상세

### A등급 — 개별 고아 파일 (54건 / 455 KB)

| # | 경로 | 종류 | 근거(검증 방법) | 롤백 |
|---|---|---|---|---|
| A-1 | `app/components/**` 낱개 21건 (`ZiweiDeepChapterView` 34.9KB, `AnalysisLoadingScreen` 32.0KB, `TarotYearFortuneClient` 26.7KB, `OhangRadarChart` 24.2KB, `NightReflectionPlanner` 23.7KB, `MysticalLanding` 22.3KB, `LifeFortuneGraph` 21.7KB, `TarotReunionClient` 18.4KB, `ZiweiPalaceOrbit` 16.8KB, `HwatuLifeCardTest` 15.8KB, `TodayFortuneLeadMagnet` 12.9KB, `ZiweiCosmicHero` 11.5KB, `ZiweiPalaceTabs` 8.6KB, `AstrologyCosmicPage` 8.6KB, `SajuBasicPage` 5.5KB, `ServiceCTA` 2.1KB, `PremiumPreview` 1.7KB, `ZiweiStarField` 1.6KB, `WebVitalsConsole` 1.2KB, `PublicOptimizedImage` 1.1KB, `ServiceRenderSkeleton` 1.0KB) | Dead | knip ∩ basename 전역 스캔(HTML·Java·gradle·toml·i18n 포함) 참조 0 | 쉬움 (git mv 되돌리기) |
| A-2 | `app/components/icons/**` 5건 (`OmikujiSymbols` `FortuneSymbols` `CosmicIcon` `BiasSymbols` `AnimalSymbols`) | Dead | 동일 | 쉬움 |
| A-3 | `app/saju/destiny-bias/**` 4건 (`engine/reportTemplates.ts` 21.4KB, `BiasDestinyStageSummary` 10.9KB, `DestinyBiasDetailSections` 8.9KB, `BiasDestinyResultTabs` 6.9KB) | Dead | 동일 | 쉬움 |
| A-4 | `app/saju/love-simulation/**` 2건 (`_hooks/useSimulation.ts` 15.8KB, `_components/AffinityMeter.tsx` 1.1KB) | Dead | 동일 ⚠️ **`_engine/normalizeSaju.ts` 는 하드 제약이라 손대지 않음** | 쉬움 |
| A-5 | `lib/yeon/**` 2건 (`generateYeonPrompt.ts` 16.2KB, `sampleYeonMessages.ts` 9.6KB) | Dead | 동일 | 쉬움 |
| A-6 | `components/yeon/**` 3건 (`YeonShareCard` `YeonCardDownloadButton` `YeonTypewriterBubble`) | Dead | 동일. ⚠️ 선행 감사 B-3 이 "keep" 했던 4건과 겹침 — 그 결정 확인 필요 | 쉬움 |
| A-7 | `components/fortune/**` 2건 (`animal-twelve/AnimalResultSections` 9.7KB, `GuardianAnimalSprite` 4.3KB) | Dead | 동일 | 쉬움 |
| A-8 | `worker/lib/**` 5건 (`premium-chapter-json-contract.js` 8.6KB, `saju-premium-chapters.js` 5.5KB, `astro/test.astroGeneration.js` 3.6KB, `astro/normalizeAstroPayloadForStrictValidation.js` 3.1KB, `destiny-bias-prompts.js` 1.9KB) | Dead | 동일 + `worker/index.js` 디스패치·`wrangler.toml` 바인딩 스캔 포함 | 보통 (Worker 배포 필요) |
| A-9 | `app/hooks/useServiceExecutionGuard.ts` | Dead | 정의 1 / import 0 직접 확인. 🔴 **동명의 `worker/lib/service-execution-task.js:1036+` 는 살아 있음 — 같이 지우면 안 됨** | 쉬움 |
| A-10 | `app/_locale/LocaleShellPage.js`, `app/HomeClient.js`, `lib/i18n-locales.js` | Dead | 동일. `HomeClient` 는 "홈 = 정적 셸 승격본"이라는 CLAUDE.md 서술과 정합 | 쉬움 |
| A-11 | `app/tarot/mindscan/MindScanTarotClient.tsx` | Dead | `page.tsx` 가 `MindScanTarotRouteClient` 를 씀. `*RouteClient` 25쌍 중 유일한 진짜 고아 | 쉬움 |
| A-12 | `app/destiny-compass/_components/EngineGlyph.tsx`, `_stage/dialogue/beatTypes.ts` | Dead | 동일. ⚠️ `_engine/adapters/**` 는 하드 제약이라 제외 | 쉬움 |
| A-13 | `app/music/MoonAlbumArtwork.tsx`, `app/methodology/page.module.css`, `preview-all-features.cjs` | Dead | 동일 | 쉬움 |

### B등급 — 조건부 (39건)

| # | 경로 | 종류 | 등급 근거 | 롤백 |
|---|---|---|---|---|
| **B-1** | `app/points/BillingCardModal.tsx` (35.7KB) + `PremiumFeatureCard.tsx` + `FlowerUnlockGate.jsx` + `app/_lib/featureUnlocks.js` | Dead/Propagator | 참조 0이지만 **결제·해금 UI**. 죽은 결제 모달이 남아 있으면 다음 세션이 정본으로 오인한다. 지우기 전 "왜 만들어졌나" 확인 필요 | 보통 |
| **B-2** | `app/_lib/models/**` 8건 (`PaymentModel` `PaymentFailureLogModel` `PointHistoryModel` `AuditLogModel` `FortuneContentModel` `FortuneViewLogModel` `DeletedAccountLogModel` `DailyFortuneSubscriptionModel`) | Dead | 임포터 0 = Mongoose 등록도 안 됨. 🔴 **`UserModel.js` 는 살아 있음**(스크립트 5곳). `server/models/PointHistory` 는 **다른 파일** | 보통 |
| **B-3** | `app/saju/animal-destiny/components/**` 11건 | Dead | 같은 디렉터리 27개 중 11개만 고아 — 다마고치 UI 한 세트. 기능을 접을지 살릴지 결정이 먼저 | 쉬움 |
| **B-4** | `src/features/fortune-tea-house/**` 9건 | Dead | **선행 감사 B-2 가 "keep" 결정한 항목** — 뒤집으려면 그 결정 재검토가 먼저 | 쉬움 |
| **B-5** | `app/components/AdvancedZiweiSection.tsx` (36KB) | Propagator | V2(151KB)만 사용됨. **V2 를 정본으로 확정**하고 흡수 | 쉬움 |
| **B-6** | `worker/lib/fortune-access-guard.js` ↔ `worker/routes/fortune.js` **175줄 동일 코드** | Propagator | jscpd 98+77줄. 🔴 **결제 게이팅 경로** — `verify:billing-pass-policy`·`verify:paid-gate-ui`·`verify:saju-unlock-entitlement-regression` 통과가 전제 | 어려움 |
| **B-7** | `app/_lib/serviceFeatureRegistry.ts` (9,504줄) | **Perf** | `en` 블록 764줄이 `vi hi es fr de nl ms` 7개와 **바이트 동일**. 서비스 지원 로케일은 ko/ja/zh/en 4종 → **−5,300줄** | 보통 |
| **B-8** | 같은 파일에서 `lookupServerCoinPrice` 분리 | **Perf** | 청크 `1156` **285.3 KB** 가 `/tarot/{crystal-soul,mindscan,numerology,prompt-maker}` 4개 HTML 에 **정적 참조**돼 초기 로드에 실린다. 그 4개 클라이언트가 쓰는 건 가격 조회 함수 하나뿐 | 보통 |
| **B-9** | `app/insights/InsightsCosmicClient.js:330` 의 `INSIGHT_SEED_ARTICLES` 런타임 import | **Perf** | 청크 `8102` **1,491.6 KB**. HTML 정적 참조는 없어 초기 로드엔 안 실리나, 목록 확장 시 1.5MB 다운로드 | 보통 |
| **B-10** | `app/admin/cms/_lib/base-values.ts:77` 의 `STORY_EPISODES` 런타임 import | **Perf** | 청크 `1832` **1,626.0 KB**. 호출자 `app/admin/cms/page.tsx` 가 `"use client"` → 관리자 화면 진입 시 웹소설 전문 1.6MB 다운로드 | 보통 |
| **B-11** | `lib/seo.ts` ↔ `lib/seo.v2.ts` 공존 | Propagator | 둘 다 살아 있음. 통합이 아니라 **역할 문서화**가 답 | 쉬움 |
| **B-12** | `lib/llm-client.ts` ↔ `lib/llm-cache.ts` 순환 참조 | Propagator | madge 기준 전 레포 유일한 순환 | 보통 |
| **B-13** | `js/tarot-reunion-experience.js:143` ↔ `tarot-year-fortune-experience.js:48` (118줄), `worker/routes/{nakshatra-ai,neo-operation-room,astrology-ai,ziwei-ai,ziwei-island-ai}.js` 클론 5쌍 | Propagator | jscpd. 프롬프트 조립 로직 복붙 | 보통 |

### C등급 — 이번 회차 제외 (15건)

| # | 항목 | 제외 사유 |
|---|---|---|
| C-1 | ts-prune 830건 / knip unused exports 690 + types 182 | **개별 동적 참조 검증 미실시.** export 단위는 파일 단위보다 오탐이 훨씬 많다 |
| C-2 | 미배선 `verify-*.mjs` 16개 | 선행 감사가 "위임 실행·문서화·의도적 보관"으로 결론. `verify-mindscan-reading.mjs`·`verify-workers-ai-fallback.mjs` 는 CLAUDE.md 가 **mock 정본**으로 지정 |
| C-3 | `@tanstack/react-virtual` (사용처 0 확인) | 제거하려면 `package-lock.json`(수정 금지) 갱신 필요 |
| C-4 | depcheck "unused" 나머지 14종 | 동적 import 오탐 가능성 |
| C-5 | `lib/stories/data.ts` + `chapters/` 32파일 312KB | 임포터 0이지만 `lib/stories/vn/index.ts:7` 이 "산문 초고 = 로그라인 집필 소스"로 **의도적 보관** 명시 |
| C-6 | `service-worker.js`·캐시 키·`AppVersionGuard` | 하드 제약 위험군 |
| C-7 | Android `@JavascriptInterface`·Custom Tabs·`proguard-rules.pro` | 하드 제약. R8 스트립 전례 |
| C-8 | 6개 역술 엔진 / `calculateLocalResult` / KASI prefetch / `normalizeSaju.ts` | 하드 제약 (read-only) |
| C-9 | PortOne·Inicis·Play Billing·RTDN 실행 경로 | 하드 제약 |
| C-10 | `js/` ↔ `public/js/` 미러 | 관리되는 미러(`sync:public` + `verify:public-parity`) |
| C-11 | 루트 `PhysiognomyUI.js`·`AnalysisEngine.js`·`HwatuFortune.js` | 정적 셸 `<script>` 로드. knip 오탐 |
| C-12 | `styles/*.css` 상위 10개 (1.4MB) | 정적 셸·CSS `@import` 참조. knip 오탐 |
| C-13 | `app/page.js` | 홈이 셸 승격본이라 미사용처럼 보이나 승격 스크립트와 얽힘 |
| C-14 | 데스크톱 PSI 37 / TBT 2,525ms | 원인이 이번 스캔 범위 밖(에셋·서드파티). 별도 과제 |
| C-15 | `styles/mobile-lite.css` | 모바일 공용 래퍼. 하드 제약 인접 |

---

## 정본(canonical) 지정 제안

| 중복 그룹 | 남길 것 (정본) | 흡수될 것 |
|---|---|---|
| 자미두수 심화 섹션 | `app/components/AdvancedZiweiSectionV2.tsx` | `AdvancedZiweiSection.tsx` (임포터 0) |
| 운세 접근 게이트 | `worker/lib/fortune-access-guard.js` | `worker/routes/fortune.js:1657,1733` 의 동일 175줄 |
| 서비스 가격 조회 | **신규 분리 모듈** (`FEATURE_KEY_PRICE_TABLE` + `lookupServerCoinPrice` 만) | `serviceFeatureRegistry.ts` 에서 클라이언트가 끌어오는 경로 |
| 서비스 카피 로케일 | `ko` `ja` `zh-CN` `zh-TW` `en` | `vi` `hi` `es` `fr` `de` `nl` `ms` (전부 `en` 사본) |
| 마인드스캔 타로 진입 | `app/tarot/mindscan/MindScanTarotRouteClient.tsx` | `MindScanTarotClient.tsx` |
| SEO 메타 | 통합하지 말 것 — `lib/seo.ts`(라우트 메타) / `lib/seo.v2.ts`(사이트 상수·robots) **역할을 문서에 명시** | — |
| 웹소설 원문 | `lib/stories/vn` (리더가 실제로 읽는 곳) | 없음 — `chapters/`·`data.ts` 는 집필 소스로 보존, **CLAUDE.md 서술만 정정** |

---

## 🔴 위험 신호

### 결제·엔진 결정성·WebView 에 영향 가능한 항목
| 항목 | 위험 |
|---|---|
| B-6 `fortune-access-guard` 175줄 통합 | **결제 게이팅 경로.** 한쪽만 고치면 이용권 판정이 갈린다. 통합 시 기능 변경 0 이어야 하고 `verify:billing-pass-policy`·`verify:paid-gate-ui`·`verify:saju-unlock-entitlement-regression`·`verify:paid-feature-common-flow` 전부 통과가 전제 |
| B-1 결제 UI 4건 | 지우는 것 자체는 안전(참조 0)하나, **왜 죽었는지 모른 채 지우면** 미완성 결제 개편의 흔적을 잃는다 |
| B-2 Mongoose 모델 8건 | 임포트가 곧 등록이라 지금도 미등록 상태. 다만 운영 DB 에 해당 컬렉션이 있으면 스키마 정의를 잃는다 |
| A-8 `worker/lib` 5건 | Worker 배포가 필요해 롤백 비용이 다르다. 🔴 배포 전 `worker-deploy-base-guard` 확인 |
| B-7/B-8 `serviceFeatureRegistry` 손질 | `verify:adsense-route-policy`·`verify:mobile-entry-actions`·`verify:ziwei-ai-consultation-flow` 3개가 **이 파일을 텍스트로 읽어 단언**한다. 구조를 바꾸면 함께 깨진다 |

### 엔진 결정성
A/B 어느 항목도 6개 역술 엔진·`calculateLocalResult`·KASI prefetch·`normalizeSaju.ts` 를 건드리지 않는다. 다만 격리 배치마다 `verify:destiny-compass`·`verify:love-compat`·`verify:pet-saju`·`verify:master-love-codex-compat` 4종 결정성 가드를 돌려야 한다.

### WebView
A/B 항목 중 Android 채널에 참조가 걸린 것은 **0건**(전수 스캔 확인). 단 R8 스트립 전례가 있으므로 격리 후 **릴리스 빌드**로 확인해야 한다(디버그 빌드 통과는 근거가 아니다).

---

## 지울 게 아니라 "배선해야" 하는 것

죽어 있어서 오히려 버그를 만드는 항목이다. **삭제 후보가 아니다.**

| # | 항목 | 문제 |
|---|---|---|
| ~~W-1~~ **해소됨 (2026-08-13 확인)** | `/api/auth/app/exchange` — 호출자 0 | 원 서술("앱은 30분 뒤 갱신 수단이 없어 로그아웃된다")은 **더 이상 사실이 아니다.** 앱 갱신은 이 엔드포인트가 아니라 **다른 방식으로 이미 배선됐다**: 앱 로그인·회원가입 응답이 본문에 `refreshToken` 을 싣고, 클라이언트가 `mobileAppAuthHeaders()` 로 `x-code-destiny-refresh-token` 헤더에 실어 `/api/auth/refresh` 를 부른다. 회전된 토큰은 `persistMobileAppRefreshToken` 이 즉시 갈아끼운다(`app/_lib/auth-client.ts`, `worker/routes/auth.js` `APP_REFRESH_TOKEN_HEADER`, 가드 `__tests__/worker/auth.app-refresh-token.test.js`). 따라서 `app/exchange` 는 "배선해야 할 것"이 아니라 **그냥 죽은 코드**이며 삭제 대상이다 |
| ~~W-2~~ **해소됨 (2026-08-13)** | `npm run verify:worker-size` — 아무것도 검사하지 않음 | 원인은 OpenNext 산출물(`handler.mjs`)을 찾은 것이었다. 프로덕션 워커는 `wrangler deploy --config worker/wrangler.toml` 로 빌드되므로 그 파일은 애초에 없다. 이제 `build:worker` 의 `--outdir` 산출물을 재고, 없으면 통과가 아니라 **실패**한다. 고친 뒤 첫 실측: **gzip 2.89 MiB / 무료 플랜 3 MiB = 96.3%** |
| W-3 | `__tests__/guardian-fortune/contract.test.js` — **어느 러너에서도 안 돎** | jest `testPathIgnorePatterns` 제외 + `test:node` 글롭 미포함. 파일은 2026-08-08 에 수정됐다 |
| W-4 | `server/services/kasi-calendar.service.js` 가 **미설치 `redis`** 를 import | 레거시 Express 경로. 실행 즉시 실패 |
| W-5 | 배선된 verify 2개가 미선언 의존성 의존 | `verify:mobile-cdp-smoke`→`ws`, `verify:i18n-no-hardcoded-korean`→`@babel/parser`. transitive 해결이 끊기면 조용히 깨진다 |

---

## 문서 정정 필요 (Propagator, 코드 변경 아님)

| # | 파일 | 현재 서술 | 실제 |
|---|---|---|---|
| D-1 | `CLAUDE.md` Folder Structure | `veda/` — "베다 점성술 엔진 (ephemeris, knowledge-base)" | **디렉터리 없음.** 실체는 `lib/vedicSwissChart.js`·`lib/vedicCalculator.js`·`worker/lib/vedic-*.js`·`worker/lib/nakshatra-*.js` |
| D-2 | `CLAUDE.md` Folder Structure | `models/` — "Mongoose 모델 (Story, Chapter)" | **디렉터리 없음** |
| D-3 | `CLAUDE.md:138` | 웹소설 원문 = `lib/stories/chapters/*` + `data.ts` | 실제 리더는 `lib/stories/vn` 의 `STORY_EPISODES` |
| D-4 | `CLAUDE.md:106` | `grantPassFreeAccessBeforeCardIfAvailable`(**6368~**) | `worker/routes/billing.js:6439` (71줄 드리프트) |
| D-5 | `tsconfig.json` `exclude` | 7개 경로 | **전부 존재하지 않음** (`_scripts-archive` `.codex-worktrees` `.claude/worktrees` `.release-clean` `_release-clean` `veda` `build`) |
| D-6 | `.env.example` | — | 계약(`config/env.contract.json`) 미등록 키 **17개**. `verify:env-parity` 가 INFO 로 흘려보냄 |
| D-7 | `next.config.mjs` | — | `eslint.ignoreDuringBuilds: true` + `typescript.ignoreBuildErrors: true` — 빌드가 타입/린트 오류를 막지 않는다 |

---

## 이번 회차에서 **하지 않은** 것 (은폐 없이 명시)

- **파일 이동·삭제 0건.** `_graveyard/` 생성 안 함
- **`npm run build:cf` 미실행** — 측정 시점에 다른 세션이 스모크 통과한 `dist/` 아티팩트를 물고 `deploy:safe` 대기 중이었다. 그래서 빌드 시간·라우트별 First Load JS·`ANALYZE` 리포트가 **미측정**이다
- **실제 LLM 호출 0건** — `--live`·`verify:ai-locale-live` 등 미실행
- **원격/배포본 호출 0건** — `env-parity:remote`·`deployed-assets`·`mobile-live-deployment` 미실행
- **WebView 실기 테스트 미실시** — 실기/에뮬레이터 필요
- **ts-prune 830 / knip 690 export 단위 개별 검증 미실시** — 전부 C등급으로 내렸다. 파일 단위만 5채널 검증을 마쳤다
- **CI 가드 추가 안 함** — 지시서 Phase 6 항목이나, 요청 없이 게이트를 늘리지 않는다는 기존 방침에 따라 제안으로만 남긴다

---

## 다음 단계 (승인 시)

1. **A등급 54건을 `_graveyard/20260809/` 로 `git mv`** — 선행 감사(`docs/orphan-audit/04-quarantine.md`)의 관례 그대로, `tsconfig.json` `exclude` 에 `_graveyard` 임시 추가
2. 배치 직후 회귀 검증: `lint` → `typecheck` → `npm test` → `check:critical` → 결정성 4종(`verify:destiny-compass`·`verify:love-compat`·`verify:pet-saju`·`verify:master-love-codex-compat`) → `verify:public-parity`
3. B등급은 **한 항목 = 한 커밋**으로 분리. 특히 B-6(결제 게이트 통합)은 단독 커밋 + 결제 verify 전건
4. D-1~D-7 문서 정정은 코드 변경이 없으므로 별도 커밋으로 먼저 처리 가능
5. W-1~W-5 는 정리가 아니라 **버그 수정**이므로 이 작업과 분리해 별도로 진행
