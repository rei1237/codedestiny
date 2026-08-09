# Phase 2 — 동적 참조 검증

> 실행일: 2026-08-09 / 베이스: `177e01a4d`
> **파일은 하나도 옮기거나 지우지 않았다.** 이 문서는 Phase 1 후보를 등급으로 승격/강등한 근거만 담는다.

## 0. 검증 방법

Phase 1 의 파일 단위 후보 242건 전부에 대해 **basename(확장자 제외) 전역 문자열 스캔**을 돌렸다. 제외한 것은 `node_modules` · `.next` · `out` · `dist` · `.git` 뿐이다. 따라서 지시서가 요구한 5채널이 한 번에 커버된다:

| 채널 | 이번 스캔 포함 여부 |
|---|---|
| ① 심볼명 전체 grep (`.ts .tsx .js .jsx .mjs .cjs .json .css .html …`) | ✅ |
| ② 부분 문자열 grep (동적 조합 대비) | ✅ — 확장자를 뗀 stem 으로 매칭했으므로 `` `${dir}/${name}` `` 류도 걸린다 |
| ③ Android 채널 (`*.java`, `AndroidManifest.xml`, `proguard-rules.pro`, `*.gradle`) | ✅ |
| ④ Worker 채널 (`worker/index.js` 디스패치, `worker/wrangler.toml` 바인딩·크론) | ✅ |
| ⑤ i18n·문서·미러 채널 (`i18n/**`, 정적 셸 6종, `js/`↔`public/js/`) | ✅ |

2차 스캔에서는 `docs/**` · `*.md` · `reports/**` · `.claude/**` 를 추가로 제외했다. **감사 문서에 이름이 적혀 있는 것은 사용이 아니기 때문**이다.

### 결과 수렴
| 단계 | 건수 | 용량 |
|---|---:|---:|
| knip 원시 unused files | 643 | — |
| 앱 코드만 | 242 | 4,150 KB |
| 전 파일종류 참조 0 (docs 포함) | 2 | 17 KB |
| **코드·설정 참조 0 (docs 제외)** | **86** | **595 KB** |

### 표본 실검증 (오탐률 확인)
무작위가 아닌 "가장 위험해 보이는 것" 3건을 직접 열어 확인했다. 3건 모두 참조처가 `reports/unused-files-report.json`(2026-07-04 감사 산출물) **한 줄뿐**이었다.

| 파일 | 결과 |
|---|---|
| `app/points/BillingCardModal.tsx` | 30일 이용권 카드 입력 모달. 임포터 0. **결제 UI 인데 죽어 있다** |
| `app/components/AnalysisLoadingScreen.tsx` | "신뢰 프로세스" 대기 화면. 임포터 0 |
| `app/tarot/mindscan/MindScanTarotClient.tsx` | 동적 import 래퍼. 임포터 0 — 해당 `page.tsx` 는 `MindScanTarotRouteClient` 를 쓴다 |

---

## 1. 강등 — 후보였으나 살아 있음 (오탐 확정)

| 항목 | 왜 오탐인가 |
|---|---|
| `*RouteClient` / `*Client` **25쌍** | App Router `page.tsx` → `RouteClient`(동적 import 래퍼) → `Client`(본체) 는 **의도된 규약**이다. 25쌍 중 peer 참조 0은 `MindScanTarotClient.tsx` 1건뿐 |
| `js/**` 97파일 (7MB) | 정적 셸이 동적 로더로 실행. `verify:public-parity` 가 `public/js/` 미러를 강제 |
| `PhysiognomyUI.js` · `AnalysisEngine.js` · `HwatuFortune.js` (루트) | `index.html` `<script>` 태그 로드. knip 이 HTML 을 못 봄 |
| `styles/*.css` 상위 10개 (1.4MB) | 정적 셸·CSS `@import` 참조. 같은 이유 |
| depcheck "unused" 15종 중 `recharts` `zustand` `@tiptap/*` `ajv` `tz-lookup` `@capacitor/*` | 선행 감사(2026-07-25 `02-dynamic.md`)가 동적 사용을 확인. 이번에도 뒤집을 근거 없음 |
| worker 모듈 top-level 초기화 | 전수 스캔 결과 top-level `await` 0, 무거운 초기화 0 |
| framer-motion 번들 부담 | 전 사용처가 `LazyMotion` + `m` (올바른 패턴) |

---

## 2. 승격 — 코드·설정 참조 0건인 86파일 (595 KB)

아래는 **삭제 안전성**(지워도 참조가 끊기지 않음) 기준 분류다. "삭제해야 한다"는 뜻이 아니다.

### 2-A. 개별 고아 — A등급 (54파일, 455 KB)
결제·인증·엔진 하드제약과 인접하지 않고, 미완성 기능 군집도 아닌 낱개 파일.

| 파일 | 크기 |
|---|---:|
| `app/components/ziwei/ZiweiDeepChapterView.tsx` | 34.9 KB |
| `app/components/AnalysisLoadingScreen.tsx` | 32.0 KB |
| `app/components/TarotYearFortuneClient.tsx` | 26.7 KB |
| `app/components/OhangRadarChart.tsx` | 24.2 KB |
| `app/components/luck-diary/NightReflectionPlanner.tsx` | 23.7 KB |
| `app/components/MysticalLanding.tsx` | 22.3 KB |
| `app/components/lifebook/LifeFortuneGraph.jsx` | 21.7 KB |
| `app/saju/destiny-bias/engine/reportTemplates.ts` | 21.4 KB |
| `app/components/TarotReunionClient.tsx` | 18.4 KB |
| `app/components/ziwei/ZiweiPalaceOrbit.tsx` | 16.8 KB |
| `lib/yeon/generateYeonPrompt.ts` | 16.2 KB |
| `app/saju/love-simulation/_hooks/useSimulation.ts` | 15.8 KB |
| `app/components/HwatuLifeCardTest.tsx` | 15.8 KB |
| `app/components/TodayFortuneLeadMagnet.tsx` | 12.9 KB |
| `app/components/ziwei/ZiweiCosmicHero.tsx` | 11.5 KB |
| `app/saju/destiny-bias/components/BiasDestinyStageSummary.tsx` | 10.9 KB |
| `components/fortune/animal-twelve/AnimalResultSections.tsx` | 9.7 KB |
| `lib/yeon/sampleYeonMessages.ts` | 9.6 KB |
| `app/saju/destiny-bias/components/DestinyBiasDetailSections.tsx` | 8.9 KB |
| `worker/lib/premium-chapter-json-contract.js` | 8.6 KB |
| `app/components/ziwei/ZiweiPalaceTabs.tsx` | 8.6 KB |
| `app/components/AstrologyCosmicPage.tsx` | 8.6 KB |
| `app/saju/destiny-bias/components/BiasDestinyResultTabs.tsx` | 6.9 KB |
| `worker/lib/saju-premium-chapters.js` | 5.5 KB |
| `app/components/SajuBasicPage.tsx` | 5.5 KB |
| `app/_locale/LocaleShellPage.js` | 5.2 KB |
| `app/methodology/page.module.css` | 4.6 KB |
| `lib/i18n-locales.js` | 4.4 KB |
| `components/fortune/GuardianAnimalSprite.tsx` | 4.3 KB |
| `app/destiny-compass/_components/EngineGlyph.tsx` | 4.2 KB |
| `worker/lib/astro/test.astroGeneration.js` | 3.6 KB |
| `worker/lib/astro/normalizeAstroPayloadForStrictValidation.js` | 3.1 KB |
| `app/hooks/useServiceExecutionGuard.ts` | 2.7 KB |
| `components/yeon/YeonShareCard.tsx` | 2.4 KB |
| `components/yeon/YeonCardDownloadButton.tsx` | 2.3 KB |
| `app/music/MoonAlbumArtwork.tsx` | 2.1 KB |
| `app/components/ServiceCTA.js` | 2.1 KB |
| `worker/lib/destiny-bias-prompts.js` | 1.9 KB |
| `components/yeon/YeonTypewriterBubble.tsx` | 1.9 KB |
| `app/components/PremiumPreview.jsx` | 1.7 KB |
| `app/components/ziwei/ZiweiStarField.tsx` | 1.6 KB |
| `app/HomeClient.js` | 1.5 KB |
| `preview-all-features.cjs` | 1.4 KB |
| `app/components/WebVitalsConsole.tsx` | 1.2 KB |
| `app/saju/love-simulation/_components/AffinityMeter.tsx` | 1.1 KB |
| `app/components/PublicOptimizedImage.tsx` | 1.1 KB |
| `app/components/ServiceRenderSkeleton.jsx` | 1.0 KB |
| `app/destiny-compass/_stage/dialogue/beatTypes.ts` | 0.8 KB |
| `app/tarot/mindscan/MindScanTarotClient.tsx` | 0.2 KB |
| `app/components/icons/{OmikujiSymbols,FortuneSymbols,CosmicIcon,BiasSymbols,AnimalSymbols}.tsx` | 각 0.1~0.4 KB |

> ⚠️ `app/HomeClient.js` 는 홈이 정적 셸 승격본이라는 CLAUDE.md 서술과 일치한다(App Router 홈은 미사용). 그래도 `app/page.js` 와의 관계를 격리 직전에 한 번 더 확인할 것.

### 2-B. 결제·권한 인접 — B등급 (12파일, 88 KB)
참조는 0이지만 결제/권한 도메인이라 **지우기 전에 "왜 만들어졌고 왜 안 쓰이는가"를 먼저 확인**해야 한다. 죽은 결제 UI 를 다음 세션이 정본으로 오인하는 것이 이 카테고리의 진짜 위험이다.

| 파일 | 크기 | 비고 |
|---|---:|---|
| `app/points/BillingCardModal.tsx` | 35.7 KB | 30일 이용권 카드 입력 모달 |
| `app/components/PremiumFeatureCard.tsx` | 23.3 KB | |
| `app/components/FlowerUnlockGate.jsx` | 9.8 KB | 해금 게이트 |
| `app/_lib/featureUnlocks.js` | 1.7 KB | |
| `app/_lib/models/{PaymentModel,PaymentFailureLogModel,PointHistoryModel}.js` | 5.4 KB | Mongoose 모델. 임포트되지 않으면 등록도 안 된다 |
| `app/_lib/models/{AuditLogModel,FortuneContentModel,FortuneViewLogModel,DeletedAccountLogModel,DailyFortuneSubscriptionModel,AppSettingsModel}.js` | 12.6 KB | 같은 이유. `UserModel.js` 는 **살아 있음**(스크립트 5곳 사용) — 혼동 금지 |

### 2-C. 미완성/보류 기능 군집 — B등급 (20파일, 51 KB)
낱개가 아니라 하나의 기능 세트다. 기계적으로 지울 게 아니라 **그 기능을 살릴지 접을지**를 정해야 한다.

| 군집 | 파일 | 비고 |
|---|---|---|
| animal-destiny 다마고치 UI | `app/saju/animal-destiny/components/` 11개 (`AnimalDestinyInputForm`, `AnimalDestinyHero`, `AnimalSummaryCard`, `AnimalRevealAnimation`, `TamagotchiDeviceFrame`, `AnimalCharacterHero`, `AnimalGameStats`, `AnimalPersonalityPanel`, `AnimalCareerPanel`, `AnimalLovePanel`, `AnimalLuckItems`) | 같은 디렉터리 27파일 중 11개만 고아. 라우트는 `AnimalDestinyRouteClient` 경유로 나머지를 쓴다 |
| 찻집 내러티브 인트로 | `src/features/fortune-tea-house/components/` 6개 + `lib/tarotAssetMap.ts` + `data/tarotAnimationAtlas.ts` | **선행 감사(2026-07-25) B-2 에서 "keep" 결정된 항목** — 뒤집으려면 그 결정을 먼저 재검토 |

### 2-D. 정본 통합 필요 — B등급 (기능 변경 0 조건)
| # | 항목 | 정본 제안 |
|---|---|---|
| B-정본1 | `app/components/AdvancedZiweiSection.tsx`(36 KB, 임포터 0) vs `AdvancedZiweiSectionV2.tsx`(151 KB, 사용 중) | **V2 를 정본으로 확정**하고 비-V2 흡수. 단 이름에서 `V2` 를 떼는 리네임은 별도 커밋 |
| B-정본2 | `worker/lib/fortune-access-guard.js` ↔ `worker/routes/fortune.js` 의 **175줄 동일 코드** | `fortune-access-guard.js` 를 정본으로. 🔴 결제 게이팅 경로라 `verify:billing-pass-policy` · `verify:paid-gate-ui` · `verify:saju-unlock-entitlement-regression` 통과가 전제 |
| B-정본3 | `lib/seo.ts`(`buildSeoMetadata`, 다수 라우트) vs `lib/seo.v2.ts`(`SEO_V2_SITE`, robots·metadata) | 둘 다 살아 있음. **통합이 아니라 역할을 문서화**하는 쪽이 안전 |
| B-정본4 | `serviceFeatureRegistry.ts` 의 `en` 블록 764줄 × 8로케일 사본 | 가격 조회(`lookupServerCoinPrice`)를 별도 모듈로 분리 + 미지원 로케일 8종 제거 |
| B-정본5 | `lib/stories/data.ts` + `lib/stories/chapters/` 32파일 312 KB | 코드 임포터 0. 단 `lib/stories/vn/index.ts:7` 주석이 "산문 초고를 로그라인 집필 소스로 보관"이라 명시 → **의도적 보관**. 지우지 말고 CLAUDE.md 서술만 정정 |

### 2-E. 보류 — C등급
| 항목 | 왜 보류인가 |
|---|---|
| ts-prune 830건 · knip unused exports 690 + types 182 | **개별 동적 참조 검증을 하지 않았다.** export 단위는 파일 단위보다 오탐이 훨씬 많다(테스트 유틸 `__*TestUtils`, 문자열 조합 접근 등). 다음 회차 과제 |
| 미배선 `verify-*.mjs` 16개 | 선행 감사가 13개를 "위임 실행·문서화·의도적 보관"으로 결론. `verify-mindscan-reading.mjs` · `verify-workers-ai-fallback.mjs` 는 CLAUDE.md 가 **mock 정본**으로 지정 |
| `@tanstack/react-virtual` | 사용처 0 확인. 그러나 제거하려면 `package-lock.json`(수정 금지) 갱신 필요 |
| depcheck "unused" 나머지 14종 | 동적 import 오탐 가능성 |
| `service-worker.js` 및 캐시 키 | 지시서 하드 제약 위험군 |
| Android `@JavascriptInterface` · Custom Tabs 경로 | 하드 제약. R8 스트립 전례 |
| 6개 역술 엔진 · `calculateLocalResult` · KASI prefetch · PortOne/Inicis · Play Billing/RTDN | 하드 제약 (read-only) |
