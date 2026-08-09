# _graveyard — 격리 보관소

> **여기 있는 파일은 아직 삭제되지 않았다.** 되돌리려면 아래 표의 복구 명령을 그대로 실행하면 된다.
>
> 근거 문서: [docs/cleanup-2026-08/03-report.md](../docs/cleanup-2026-08/03-report.md)
> 승인: 2026-08-09 사용자 승인 (Phase 3 보고 후)
> 빌드 제외: `tsconfig.json` `exclude` 에 `_graveyard` 추가됨. `next lint` 기본 경로(app/pages/components/lib/src)와 `config/env.contract.json` `scanRoots` 밖이라 별도 조치 불필요.

## 판정 근거 (공통)

모든 항목은 아래 스캔에서 **코드·설정 참조 0건**으로 확인됐다. 제외한 경로는 `node_modules` `.next` `out` `dist` `.git` 과, 사용이 아니라 언급일 뿐인 `docs/**` `*.md` `reports/**` `.claude/**` 뿐이다. 따라서 다음 채널이 모두 포함됐다:

- `.ts .tsx .js .jsx .mjs .cjs .json .css` 소스 전체
- 정적 셸 6종(`index.html` + `public/{,en,ja,zh,static}/index.html`)
- Android 네이티브 `apps/mobile/android/**` (`*.java`, `AndroidManifest.xml`, `proguard-rules.pro`, `*.gradle`)
- Worker (`worker/index.js` 디스패치, `worker/wrangler.toml` 바인딩·크론)
- i18n 리소스 및 `js/` ↔ `public/js/` 미러

이동 직전 현재 HEAD 기준으로 54건 전부 재검증했다(다른 세션이 그 사이 4커밋을 올렸기 때문).

## 되돌리기

개별 파일은 표의 복구 명령을, 배치 전체는 그 커밋을 되돌리면 된다.

```bash
git revert <격리 커밋 sha>      # 배치 전체 복구
```

---

## Batch 1 — 비-worker 고아 49건 (2026-08-09)

| 원 경로 | 이동일 | 사유 | 복구 명령 |
|---|---|---|---|
| `app/_locale/LocaleShellPage.js` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/_locale/LocaleShellPage.js app/_locale/LocaleShellPage.js` |
| `app/components/AnalysisLoadingScreen.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/AnalysisLoadingScreen.tsx app/components/AnalysisLoadingScreen.tsx` |
| `app/components/AstrologyCosmicPage.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/AstrologyCosmicPage.tsx app/components/AstrologyCosmicPage.tsx` |
| `app/components/HwatuLifeCardTest.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/HwatuLifeCardTest.tsx app/components/HwatuLifeCardTest.tsx` |
| `app/components/icons/AnimalSymbols.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/icons/AnimalSymbols.tsx app/components/icons/AnimalSymbols.tsx` |
| `app/components/icons/BiasSymbols.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/icons/BiasSymbols.tsx app/components/icons/BiasSymbols.tsx` |
| `app/components/icons/CosmicIcon.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/icons/CosmicIcon.tsx app/components/icons/CosmicIcon.tsx` |
| `app/components/icons/FortuneSymbols.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/icons/FortuneSymbols.tsx app/components/icons/FortuneSymbols.tsx` |
| `app/components/icons/OmikujiSymbols.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/icons/OmikujiSymbols.tsx app/components/icons/OmikujiSymbols.tsx` |
| `app/components/lifebook/LifeFortuneGraph.jsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/lifebook/LifeFortuneGraph.jsx app/components/lifebook/LifeFortuneGraph.jsx` |
| `app/components/luck-diary/NightReflectionPlanner.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/luck-diary/NightReflectionPlanner.tsx app/components/luck-diary/NightReflectionPlanner.tsx` |
| `app/components/MysticalLanding.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/MysticalLanding.tsx app/components/MysticalLanding.tsx` |
| `app/components/OhangRadarChart.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/OhangRadarChart.tsx app/components/OhangRadarChart.tsx` |
| `app/components/PremiumPreview.jsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/PremiumPreview.jsx app/components/PremiumPreview.jsx` |
| `app/components/PublicOptimizedImage.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/PublicOptimizedImage.tsx app/components/PublicOptimizedImage.tsx` |
| `app/components/SajuBasicPage.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/SajuBasicPage.tsx app/components/SajuBasicPage.tsx` |
| `app/components/ServiceCTA.js` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/ServiceCTA.js app/components/ServiceCTA.js` |
| `app/components/ServiceRenderSkeleton.jsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/ServiceRenderSkeleton.jsx app/components/ServiceRenderSkeleton.jsx` |
| `app/components/TarotReunionClient.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/TarotReunionClient.tsx app/components/TarotReunionClient.tsx` |
| `app/components/TarotYearFortuneClient.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/TarotYearFortuneClient.tsx app/components/TarotYearFortuneClient.tsx` |
| `app/components/TodayFortuneLeadMagnet.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/TodayFortuneLeadMagnet.tsx app/components/TodayFortuneLeadMagnet.tsx` |
| `app/components/WebVitalsConsole.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/WebVitalsConsole.tsx app/components/WebVitalsConsole.tsx` |
| `app/components/ziwei/ZiweiCosmicHero.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/ziwei/ZiweiCosmicHero.tsx app/components/ziwei/ZiweiCosmicHero.tsx` |
| `app/components/ziwei/ZiweiDeepChapterView.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/ziwei/ZiweiDeepChapterView.tsx app/components/ziwei/ZiweiDeepChapterView.tsx` |
| `app/components/ziwei/ZiweiPalaceOrbit.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/ziwei/ZiweiPalaceOrbit.tsx app/components/ziwei/ZiweiPalaceOrbit.tsx` |
| `app/components/ziwei/ZiweiPalaceTabs.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/ziwei/ZiweiPalaceTabs.tsx app/components/ziwei/ZiweiPalaceTabs.tsx` |
| `app/components/ziwei/ZiweiStarField.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/components/ziwei/ZiweiStarField.tsx app/components/ziwei/ZiweiStarField.tsx` |
| `app/destiny-compass/_components/EngineGlyph.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/destiny-compass/_components/EngineGlyph.tsx app/destiny-compass/_components/EngineGlyph.tsx` |
| `app/destiny-compass/_stage/dialogue/beatTypes.ts` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/destiny-compass/_stage/dialogue/beatTypes.ts app/destiny-compass/_stage/dialogue/beatTypes.ts` |
| `app/HomeClient.js` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/HomeClient.js app/HomeClient.js` |
| `app/hooks/useServiceExecutionGuard.ts` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/hooks/useServiceExecutionGuard.ts app/hooks/useServiceExecutionGuard.ts` |
| `app/methodology/page.module.css` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/methodology/page.module.css app/methodology/page.module.css` |
| `app/music/MoonAlbumArtwork.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/music/MoonAlbumArtwork.tsx app/music/MoonAlbumArtwork.tsx` |
| `app/saju/destiny-bias/components/BiasDestinyResultTabs.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/saju/destiny-bias/components/BiasDestinyResultTabs.tsx app/saju/destiny-bias/components/BiasDestinyResultTabs.tsx` |
| `app/saju/destiny-bias/components/BiasDestinyStageSummary.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/saju/destiny-bias/components/BiasDestinyStageSummary.tsx app/saju/destiny-bias/components/BiasDestinyStageSummary.tsx` |
| `app/saju/destiny-bias/components/DestinyBiasDetailSections.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/saju/destiny-bias/components/DestinyBiasDetailSections.tsx app/saju/destiny-bias/components/DestinyBiasDetailSections.tsx` |
| `app/saju/destiny-bias/engine/reportTemplates.ts` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/saju/destiny-bias/engine/reportTemplates.ts app/saju/destiny-bias/engine/reportTemplates.ts` |
| `app/saju/love-simulation/_components/AffinityMeter.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/saju/love-simulation/_components/AffinityMeter.tsx app/saju/love-simulation/_components/AffinityMeter.tsx` |
| `app/saju/love-simulation/_hooks/useSimulation.ts` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/saju/love-simulation/_hooks/useSimulation.ts app/saju/love-simulation/_hooks/useSimulation.ts` |
| `app/tarot/mindscan/MindScanTarotClient.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/app/tarot/mindscan/MindScanTarotClient.tsx app/tarot/mindscan/MindScanTarotClient.tsx` |
| `components/fortune/animal-twelve/AnimalResultSections.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/components/fortune/animal-twelve/AnimalResultSections.tsx components/fortune/animal-twelve/AnimalResultSections.tsx` |
| `components/fortune/GuardianAnimalSprite.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/components/fortune/GuardianAnimalSprite.tsx components/fortune/GuardianAnimalSprite.tsx` |
| `components/yeon/YeonCardDownloadButton.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/components/yeon/YeonCardDownloadButton.tsx components/yeon/YeonCardDownloadButton.tsx` |
| `components/yeon/YeonShareCard.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/components/yeon/YeonShareCard.tsx components/yeon/YeonShareCard.tsx` |
| `components/yeon/YeonTypewriterBubble.tsx` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/components/yeon/YeonTypewriterBubble.tsx components/yeon/YeonTypewriterBubble.tsx` |
| `lib/i18n-locales.js` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/lib/i18n-locales.js lib/i18n-locales.js` |
| `lib/yeon/generateYeonPrompt.ts` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/lib/yeon/generateYeonPrompt.ts lib/yeon/generateYeonPrompt.ts` |
| `lib/yeon/sampleYeonMessages.ts` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/lib/yeon/sampleYeonMessages.ts lib/yeon/sampleYeonMessages.ts` |
| `preview-all-features.cjs` | 2026-08-09 | 전 채널 참조 0 (A-batch1) | `git mv _graveyard/20260809/preview-all-features.cjs preview-all-features.cjs` |

## Batch 2 — worker/lib 고아 5건 (2026-08-09)

worker 는 배포 경로가 달라(롤백 비용이 다름) 배치를 분리했다. 이동 직전 현재 워킹트리 기준으로 5건 전부 재검증했다 — 다른 세션이 그 시각에도 `worker/lib` 를 수정 중이었기 때문이다.

| 원 경로 | 이동일 | 사유 | 복구 명령 |
|---|---|---|---|
| `worker/lib/astro/normalizeAstroPayloadForStrictValidation.js` | 2026-08-09 | 전 채널 참조 0 (A-batch2) | `git mv _graveyard/20260809/worker/lib/astro/normalizeAstroPayloadForStrictValidation.js worker/lib/astro/normalizeAstroPayloadForStrictValidation.js` |
| `worker/lib/astro/test.astroGeneration.js` | 2026-08-09 | 전 채널 참조 0 (A-batch2) | `git mv _graveyard/20260809/worker/lib/astro/test.astroGeneration.js worker/lib/astro/test.astroGeneration.js` |
| `worker/lib/destiny-bias-prompts.js` | 2026-08-09 | 전 채널 참조 0 (A-batch2) | `git mv _graveyard/20260809/worker/lib/destiny-bias-prompts.js worker/lib/destiny-bias-prompts.js` |
| `worker/lib/premium-chapter-json-contract.js` | 2026-08-09 | 전 채널 참조 0 (A-batch2) | `git mv _graveyard/20260809/worker/lib/premium-chapter-json-contract.js worker/lib/premium-chapter-json-contract.js` |
| `worker/lib/saju-premium-chapters.js` | 2026-08-09 | 전 채널 참조 0 (A-batch2) | `git mv _graveyard/20260809/worker/lib/saju-premium-chapters.js worker/lib/saju-premium-chapters.js` |

### 번들 크기 실측 — 줄지 않았다 (예상대로)

`npm run build:worker` (wrangler `--dry-run`) 기준:

| 시점 | Total Upload |
|---|---:|
| 격리 전 (2026-08-09 20:35) | 13,577.42 KiB |
| batch2 격리 후 | 13,581.29 KiB |

**+3.87 KiB.** 격리로 줄어든 것이 0이고, 그 사이 다른 세션이 guardian-fortune 코드를 늘렸다. 참조가 없던 파일은 애초에 esbuild 가 번들에 넣지 않았으므로 당연한 결과다 — [03-report.md](../docs/cleanup-2026-08/03-report.md) 의 "프로덕션 번들 감소 0 KB" 예측이 실측으로 확인됐다.

---

## Batch 3 — 결제·권한 인접 + 자미두수 구버전 13건 (2026-08-09)

[03-report.md](../docs/cleanup-2026-08/03-report.md) 의 B-1 · B-2 · B-5. 참조는 0이지만 도메인이 결제/권한이라 배치를 분리하고 **결제 verify 17종 전건**을 함께 돌렸다.

| 원 경로 | 이동일 | 사유 | 복구 명령 |
|---|---|---|---|
| `app/points/BillingCardModal.tsx` | 2026-08-09 | 참조 0. 30일 이용권 카드 입력 모달 (B-1) | `git mv _graveyard/20260809/app/points/BillingCardModal.tsx app/points/BillingCardModal.tsx` |
| `app/components/PremiumFeatureCard.tsx` | 2026-08-09 | 참조 0 (B-1) | `git mv _graveyard/20260809/app/components/PremiumFeatureCard.tsx app/components/PremiumFeatureCard.tsx` |
| `app/components/FlowerUnlockGate.jsx` | 2026-08-09 | 참조 0. 해금 게이트 (B-1) | `git mv _graveyard/20260809/app/components/FlowerUnlockGate.jsx app/components/FlowerUnlockGate.jsx` |
| `app/_lib/featureUnlocks.js` | 2026-08-09 | 참조 0 (B-1) | `git mv _graveyard/20260809/app/_lib/featureUnlocks.js app/_lib/featureUnlocks.js` |
| `app/_lib/models/PaymentModel.js` | 2026-08-09 | 참조 0 (B-2) | `git mv _graveyard/20260809/app/_lib/models/PaymentModel.js app/_lib/models/PaymentModel.js` |
| `app/_lib/models/PaymentFailureLogModel.js` | 2026-08-09 | 참조 0 (B-2) | `git mv _graveyard/20260809/app/_lib/models/PaymentFailureLogModel.js app/_lib/models/PaymentFailureLogModel.js` |
| `app/_lib/models/PointHistoryModel.js` | 2026-08-09 | 참조 0 (B-2) | `git mv _graveyard/20260809/app/_lib/models/PointHistoryModel.js app/_lib/models/PointHistoryModel.js` |
| `app/_lib/models/AuditLogModel.js` | 2026-08-09 | 참조 0 (B-2) | `git mv _graveyard/20260809/app/_lib/models/AuditLogModel.js app/_lib/models/AuditLogModel.js` |
| `app/_lib/models/FortuneContentModel.js` | 2026-08-09 | 참조 0 (B-2) | `git mv _graveyard/20260809/app/_lib/models/FortuneContentModel.js app/_lib/models/FortuneContentModel.js` |
| `app/_lib/models/FortuneViewLogModel.js` | 2026-08-09 | 참조 0 (B-2) | `git mv _graveyard/20260809/app/_lib/models/FortuneViewLogModel.js app/_lib/models/FortuneViewLogModel.js` |
| `app/_lib/models/DeletedAccountLogModel.js` | 2026-08-09 | 참조 0 (B-2) | `git mv _graveyard/20260809/app/_lib/models/DeletedAccountLogModel.js app/_lib/models/DeletedAccountLogModel.js` |
| `app/_lib/models/DailyFortuneSubscriptionModel.js` | 2026-08-09 | 참조 0 (B-2) | `git mv _graveyard/20260809/app/_lib/models/DailyFortuneSubscriptionModel.js app/_lib/models/DailyFortuneSubscriptionModel.js` |
| `app/components/AdvancedZiweiSection.tsx` | 2026-08-09 | 임포터 0. **V2 가 정본** (B-5) | `git mv _graveyard/20260809/app/components/AdvancedZiweiSection.tsx app/components/AdvancedZiweiSection.tsx` |

### `AdvancedZiweiSection.tsx` 는 왜 앞 배치에서 빠졌었나
basename 스캔이 `AdvancedZiweiSectionV2` 와 `ziwei-normalization.ts` 의 **동명 인터페이스**, `ZiweiChartClientLoader.tsx` 의 **동명 지역변수**에 걸려 "참조 있음"으로 보였다. import 경로 기준으로 다시 보니 이 파일을 import 하는 곳은 0이고, 실제 렌더되는 것은 `AdvancedZiweiSectionV2.tsx` 다.

### 되돌릴 때 함께 확인할 것
`app/_lib/models/` 에는 `UserModel.js`(스크립트 5곳 사용)와 `AppSettingsModel.js` 가 **남아 있다**. 위 8개만 격리됐다. Mongoose 모델은 import 되어야 등록되므로, 격리된 8개는 격리 전에도 이미 미등록 상태였다.

---

### 주의 — 함께 지우면 안 되는 동명 항목
- `app/hooks/useServiceExecutionGuard.ts` 를 격리했지만, **동명의 `worker/lib/service-execution-task.js:1036+` 는 살아 있다.** 이름이 같다고 함께 지우지 말 것.
- `app/_lib/models/**` 는 이 배치에 없다(B등급). 그중 `UserModel.js` 는 스크립트 5곳이 쓰는 **살아 있는 모델**이다.
