# 삭제 기록 — 116파일 (2026-08-09)

> `_graveyard/` 격리 방식을 폐기하고 **직접 삭제**로 전환했다.
> 이유: 격리 디렉터리는 `tsconfig` `exclude` 와 빌드에서만 빠질 뿐, **grep·ripgrep·AI 코드 읽기에는 그대로 노출된다.**
> 이번 작업의 목적이 "다음 세션이 보고 복제하는 쓰레기 양산원 제거"인데, 격리는 그 목적을 절반만 달성한다.
> 안전망은 격리 디렉터리가 아니라 **git 히스토리**다.

## 되살리는 법

```bash
# 1차 감사분(67건) — 격리 커밋 직전 상태에서 원래 경로로 복원
git checkout fbbb43c85^ -- <원래경로>     # batch 1 (비-worker 고아 49건)
git checkout f230ef564^ -- <원래경로>     # batch 2 (worker/lib 5건)
git checkout 3c579e2d3^ -- <원래경로>     # batch 3 (결제·권한 인접 + 자미두수 13건)

# 2차 감사분(49건) — 이 삭제 커밋 직전 상태에서 복원
git checkout <이 커밋>^ -- <원래경로>

# 전체를 되돌리려면
git revert <이 커밋>
```

## 무엇을 지웠나

| 묶음 | 건수 | 판정 근거 |
|---|---:|---|
| 1차 A등급 — 개별 고아 파일 | 54 | 전 채널(코드·HTML·Android·Worker·i18n·설정) 참조 0 |
| 1차 B등급 — 결제·권한 인접 + 자미두수 구버전 | 13 | 참조 0 + 결제 verify 17종 통과 |
| 2차 — WebP 로 대체된 `.png` 원본 | 18 | 같은 이름 `.webp` 형제가 존재하고 그 webp 를 코드가 참조 (25.90 MB) |
| 2차 — `public/images/guardian-fortune/**` | 20 | 아래 별도 설명 |
| 2차 — 적용 완료된 일회성 코드모드 스크립트 | 11 | package.json·CI·다른 스크립트 어디서도 미참조 |
| **합계** | **116** | |

### `public/images/guardian-fortune/**` 20건 — 중복이 아니라 유물
코드가 다른 경로를 쓰는 게 **맞다.** 현재 guardian-fortune 은 `/images/fortune-tea-house/flower-pig-honey-hug.webp`(연이)와 `/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp`(네오)를 쓴다(`src/features/guardian-fortune/constants.ts:53`).

이 20개를 쓰던 것은 **홈 셸의 구 인라인 상담 위젯**이었고, `a26379552 refactor(billing): delete the two retired consultation currencies` 가 그 위젯과 함께 `js/guardian-fortune-home.js`·`styles/guardian-fortune.css`(+`public/` 미러 2개)를 지웠다. 그때 이미지만 남았다. 커밋 메시지에도 "the four browser scripts and stylesheet that served only it are gone from all six shells" 로 적혀 있다.

레포 내 바이트 중복은 **없다**(535개 에셋 SHA-256 전수 비교). 즉 같은 그림의 사본이 아니라, 삭제된 구현 전용으로 만들어졌던 자산이다.

## 지우지 않은 것

| 항목 | 이유 |
|---|---|
| `server/` 40파일 11,102 LOC | 사용자 판단 보류. 배포되는 곳은 없으나 레거시 폴백 의도일 수 있음 |
| 마이그레이션·수동 회귀·미배선 verify 스크립트 | 이력이자 재실행용. 1차에서 이미 C 판정 |
| 미사용 export 185건 | 트리셰이킹이 이미 제거해 실익 없음. 185곳 수정 위험만 남음 |
| `lib/stories/chapters/` 32파일 | `lib/stories/vn/index.ts:7` 이 집필 소스로 보존 명시 |
| animal-destiny 다마고치 UI 11 / 찻집 내러티브 9 | 미완성 기능 세트. 제품 판단 필요 |

## 오탐으로 걸러낸 것 (지웠으면 깨졌을 것들)

| 군집 | 개수 | 실제 참조 방식 |
|---|---:|---|
| `public/sudda/hwatu/*.webp` | 40 | `HwatuFortune.js` 가 `` `${month}_${index}.webp` `` 조립 |
| `public/neo-operation-room/sprites/transparent/*` | 38 | `` `s${sheetNumber}-f${paddedFrame}.webp` `` 조립 |
| `public/fuctionassets/*.webp` | 14 | 파일명 공백 → URL 인코딩(`ai%20animal.webp`) |
| `public/images/novel/remaster/yeon|crow/*` | 14 | `manifest.json` 글롭 + `verify-novel-runtime.mjs` 가 디렉터리 검사 |
| `public/images/fortune-chat/persona/*` | 10 | `personaSprite.ts:23` 이 `` `${persona}-${mood}.webp` `` 조립 |
| `apps/mobile/**/mipmap-*/` | 12 | Android 리소스 ID(`@mipmap/ic_launcher`) |
| `styles/*.css` | 22 | 전부 참조 있음 |

---

## 삭제 파일 전체 목록

- `app/HomeClient.js`
- `app/_lib/featureUnlocks.js`
- `app/_lib/models/AuditLogModel.js`
- `app/_lib/models/DailyFortuneSubscriptionModel.js`
- `app/_lib/models/DeletedAccountLogModel.js`
- `app/_lib/models/FortuneContentModel.js`
- `app/_lib/models/FortuneViewLogModel.js`
- `app/_lib/models/PaymentFailureLogModel.js`
- `app/_lib/models/PaymentModel.js`
- `app/_lib/models/PointHistoryModel.js`
- `app/_locale/LocaleShellPage.js`
- `app/components/AdvancedZiweiSection.tsx`
- `app/components/AnalysisLoadingScreen.tsx`
- `app/components/AstrologyCosmicPage.tsx`
- `app/components/FlowerUnlockGate.jsx`
- `app/components/HwatuLifeCardTest.tsx`
- `app/components/MysticalLanding.tsx`
- `app/components/OhangRadarChart.tsx`
- `app/components/PremiumFeatureCard.tsx`
- `app/components/PremiumPreview.jsx`
- `app/components/PublicOptimizedImage.tsx`
- `app/components/SajuBasicPage.tsx`
- `app/components/ServiceCTA.js`
- `app/components/ServiceRenderSkeleton.jsx`
- `app/components/TarotReunionClient.tsx`
- `app/components/TarotYearFortuneClient.tsx`
- `app/components/TodayFortuneLeadMagnet.tsx`
- `app/components/WebVitalsConsole.tsx`
- `app/components/icons/AnimalSymbols.tsx`
- `app/components/icons/BiasSymbols.tsx`
- `app/components/icons/CosmicIcon.tsx`
- `app/components/icons/FortuneSymbols.tsx`
- `app/components/icons/OmikujiSymbols.tsx`
- `app/components/lifebook/LifeFortuneGraph.jsx`
- `app/components/luck-diary/NightReflectionPlanner.tsx`
- `app/components/ziwei/ZiweiCosmicHero.tsx`
- `app/components/ziwei/ZiweiDeepChapterView.tsx`
- `app/components/ziwei/ZiweiPalaceOrbit.tsx`
- `app/components/ziwei/ZiweiPalaceTabs.tsx`
- `app/components/ziwei/ZiweiStarField.tsx`
- `app/destiny-compass/_components/EngineGlyph.tsx`
- `app/destiny-compass/_stage/dialogue/beatTypes.ts`
- `app/hooks/useServiceExecutionGuard.ts`
- `app/methodology/page.module.css`
- `app/music/MoonAlbumArtwork.tsx`
- `app/points/BillingCardModal.tsx`
- `app/saju/destiny-bias/components/BiasDestinyResultTabs.tsx`
- `app/saju/destiny-bias/components/BiasDestinyStageSummary.tsx`
- `app/saju/destiny-bias/components/DestinyBiasDetailSections.tsx`
- `app/saju/destiny-bias/engine/reportTemplates.ts`
- `app/saju/love-simulation/_components/AffinityMeter.tsx`
- `app/saju/love-simulation/_hooks/useSimulation.ts`
- `app/tarot/mindscan/MindScanTarotClient.tsx`
- `components/fortune/GuardianAnimalSprite.tsx`
- `components/fortune/animal-twelve/AnimalResultSections.tsx`
- `components/yeon/YeonCardDownloadButton.tsx`
- `components/yeon/YeonShareCard.tsx`
- `components/yeon/YeonTypewriterBubble.tsx`
- `lib/i18n-locales.js`
- `lib/yeon/generateYeonPrompt.ts`
- `lib/yeon/sampleYeonMessages.ts`
- `preview-all-features.cjs`
- `public/images/fortune-tea-house/flower-pig-5-sprite-safe.png`
- `public/images/fortune-tea-house/flower-pig-honey-hug.png`
- `public/images/fortune-tea-house/honey-drop-counter.png`
- `public/images/fortune-tea-house/talking-flower-pig-yeoni3-sprite-cropped.png`
- `public/images/fortune-tea-house/tea-cups-corrected-photoroom.png`
- `public/images/fortune-tea-house/tea-cups-labeled-photoroom.png`
- `public/images/fortune-tea-house/ten-gods-photoroom.png`
- `public/images/fortune-tea-house/yeoni-cup-pose-photoroom.png`
- `public/images/fortune-tea-house/yeoni-cup-pose-sprite-sheet-photoroom.png`
- `public/images/fortune-tea-house/yeoni-sprite2-thanks-photoroom.png`
- `public/images/fortune-tea-house/yeoni-sprite6-waiting-photoroom.png`
- `public/images/fortune-tea-house/yeoni-sprite7-tarot-photoroom.png`
- `public/images/fortune-tea-house/yeoni-tarot-card-back-photoroom.png`
- `public/images/fortune-tea-house/yeoni-tarot-pose-1.png`
- `public/images/fortune-tea-house/yeoni-tarot-pose-2.png`
- `public/images/fortune-tea-house/yeoni-tarot-pose-3.png`
- `public/images/fortune-tea-house/yeoni-tarot-pose-4.png`
- `public/images/fortune-tea-house/yeoni-tea-chat-loading-sprite.png`
- `public/images/guardian-fortune/guardian-button-neo.webp`
- `public/images/guardian-fortune/guardian-button-yeoni.webp`
- `public/images/guardian-fortune/guardian-room-neo-bg.webp`
- `public/images/guardian-fortune/guardian-room-yeoni-bg.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f01.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f02.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f03.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f04.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f05.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f06.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f07.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f08.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f09.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f10.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f11.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f12.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f13.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f14.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f15.webp`
- `public/images/guardian-fortune/yeoni/flower-pig-f16.webp`
- `scripts/_check_sizes.mjs`
- `scripts/fix-critical-css-loading.cjs`
- `scripts/fix-main-glass-fouc.cjs`
- `scripts/fix-saju-onclick.mjs`
- `scripts/gen-daily-2026-03-21.mjs`
- `scripts/inject-godlife.mjs`
- `scripts/optimize-static-thirdparty-loading.cjs`
- `scripts/patch-diary-ui.mjs`
- `scripts/patch-index-html-optimized-images.mjs`
- `scripts/rewrite-png-refs-to-webp.mjs`
- `scripts/rm-godlife.mjs`
- `worker/lib/astro/normalizeAstroPayloadForStrictValidation.js`
- `worker/lib/astro/test.astroGeneration.js`
- `worker/lib/destiny-bias-prompts.js`
- `worker/lib/premium-chapter-json-contract.js`
- `worker/lib/saju-premium-chapters.js`
