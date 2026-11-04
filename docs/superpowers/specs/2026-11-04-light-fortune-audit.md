# 라이트 운세 실행 경로 감사

작성일: 2026-11-04. 정본 목록은 `worker/lib/light-fortune-catalog.js`다.

판정 기준은 파일이 아니라 결제 뒤 실행 경로다. 경로에서 `callGemini|generateContent|callLlm|callLLM|runLlm|callVision|createChatCompletion`이나 외부 생성 모델 호출을 찾으면 라이트에서 뺀다. 경로를 확인하지 못한 상품도 뺀다.

## 같은 파일에 언어 모델이 섞인 경로

- `worker/routes/tarot.js`: 언어 모델은 `/love-reading`, `/mindscan`, `/oracle-consultation`과 그 결과 조회뿐이다. `/reading`, `/numerology-reading`, `/ijik-reading`, `/crystal-soul`은 결정형이다(`buildCrystalSoulReading`의 source는 `deterministic`).
- `worker/routes/destiny-compass.js`: 언어 모델은 무료 `/narrate`이고 `CompassReport.tsx`만 부른다. 유료 3종(`Crossroads`, `LifeVoyage`, `FutureSim`)은 부르지 않는다.
- `worker/routes/destiny-compass-ai.js`: `destiny-compass-deep-report` 전용이다. 라이트 후보가 아니다.
- `worker/routes/animal-totem.js`: `animal-totem-basic`, `animal-totem-deep` 전용이다. `animal-destiny-unlock`은 `worker/routes/saju-section.js` 경로다.
- `worker/routes/nakshatra-ai.js`: `nakshatra-ai-consultation` 전용이다. `nakshatra.js`, `nakshatra-premium.js`의 import 범위에는 호출이 없다.
- `worker/lib/guardian-fortune-llm.js`: `guardian_fortune` 전용이다. `saju-guardian-unlock`은 쓰지 않지만 별도 이미지 모델 호출이 있어 제외했다.
- `worker/routes/sukuyo.js`: 언어 모델 라우트는 이관되어 응답만 남았고 import 범위에 호출이 없다.
- `worker/routes/fortune.js`: 라이트 키는 별칭 표와 프롬프트 생성에만 등장한다. `vedic_prashna_prompt`는 프롬프트 문자열만 만든다(`worker/lib/vedic-prashna-prompt.js:818`).

## 라이트

| featureKey | 판매 여부 | 실행 경로 | 판정 | 근거 파일:행 |
|---|---|---|---|---|
| physiognomy-compatibility | 판매 | PhysiognomyUI.js `window.faceAnalysisEngine.calculateCompatibility` | 라이트 | PhysiognomyUI.js:2360 |
| physiognomy-pastlife-compatibility | 판매 | PastLifeFaceUI.js `calculatePastLifeCompatibility(plfSelfResult, pl` | 라이트 | PastLifeFaceUI.js:3661 |
| physiognomy-ogwan-mole-deep | 판매 | PhysiognomyUI.js `function applyOgwanMoleUnlock()` | 라이트 | PhysiognomyUI.js:1695 |
| tarot-year-fortune | 판매 | worker/routes/tarot.js `YEAR_TAROT_FEATURE_KEY = "tarot-year-fortune"` | 라이트 | worker/routes/tarot.js:61 |
| tarot-reunion-reading | 판매 | worker/routes/tarot.js `const payload = buildReadingPayload({` | 라이트 | worker/routes/tarot.js:1691 |
| tarot-myeongri-three-card | 판매 | js/saju-engine-tarot-sukuyo-quantum.js `function _runShowTarotFinalInterpretation()` | 라이트 | js/saju-engine-tarot-sukuyo-quantum.js:3008 |
| tarot-crystal-soul-reading | 판매 | worker/routes/tarot.js `CRYSTAL_SOUL_FEATURE_KEY = "tarot-crystal-soul-r` | 라이트 | worker/routes/tarot.js:57 |
| tarot-numerology-reading | 판매 | worker/routes/tarot.js `NUMEROLOGY_TAROT_READING_FEATURE_KEY = "tarot-nu` | 라이트 | worker/routes/tarot.js:48 |
| maya-prompt-generator | 판매 | src/lib/maya-prompt-generator.ts `generateMayaReadingPrompt` | 라이트 | src/lib/maya-prompt-generator.ts:47 |
| tarot-ijik | 판매 | worker/routes/tarot.js `buildIjikReading(cards)` | 라이트 | worker/routes/tarot.js:1848 |
| royal-tea-oracle | 판매 | royal-tea-oracle.html `buildCupMap` | 라이트 | royal-tea-oracle.html:2073 |
| ifa-oracle | 판매 | ifa_oracle_v2_full.html `buildPatternDisplay` | 라이트 | ifa_oracle_v2_full.html:321 |
| neville-meditation | 판매 | neville-meditation.html `function startCourseCore(` | 라이트 | neville-meditation.html:1564 |
| cosmic-soul-meditation | 판매 | cosmic-soul-meditation.html `function _startSessionCore(mode)` | 라이트 | cosmic-soul-meditation.html:1573 |
| sukuyo-extreme-t-relationship | 판매 | js/saju-engine-tarot-sukuyo-quantum.js `syRequirePaidSukuyoFeature(` | 라이트 | js/saju-engine-tarot-sukuyo-quantum.js:4014 |
| sukuyo-relationship-encyclopedia | 판매 | js/saju-engine-tarot-sukuyo-quantum.js `syRequirePaidSukuyoFeature(` | 라이트 | js/saju-engine-tarot-sukuyo-quantum.js:4014 |
| sukuyo-nature-deep-dive | 판매 | js/saju-engine-tarot-sukuyo-quantum.js `syRequirePaidSukuyoFeature(` | 라이트 | js/saju-engine-tarot-sukuyo-quantum.js:4014 |
| sukuyo-past-life-reading | 판매 | js/saju-engine-tarot-sukuyo-quantum.js `syRequirePaidSukuyoFeature(` | 라이트 | js/saju-engine-tarot-sukuyo-quantum.js:4014 |
| sukyo_yearly_fortune_unlock | 판매 | worker/routes/sukuyo.js `sukyo_yearly_fortune_unlock` | 라이트 | worker/routes/sukuyo.js:29 |
| compat-astro-synastry | 판매 | js/saju-engine.js `_astroPickCelebCore` | 라이트 | js/saju-engine.js:5923 |
| compat-astro-direct-synastry | 판매 | js/saju-engine.js `_astroDirectSynastryCore` | 라이트 | js/saju-engine.js:5954 |
| compat-ziwei-compatibility | 판매 | js/saju-engine.js `_runZwCompatibilityCore` | 라이트 | js/saju-engine.js:5990 |
| compat-sukuyo-compatibility | 판매 | js/saju-engine-tarot-sukuyo-quantum.js `_triggerSynergyCheckCore` | 라이트 | js/saju-engine-tarot-sukuyo-quantum.js:13344 |
| vedic-compatibility-per-use | 판매 | vedic-astrology.html `doCompatCalcCore` | 라이트 | vedic-astrology.html:7459 |
| nakshatra-compat | 판매 | worker/routes/nakshatra.js `assembleNakshatraCompat(personA, personB)` | 라이트 | worker/routes/nakshatra.js:67 |
| nakshatra-muhurta | 판매 | worker/routes/nakshatra-premium.js `const report = buildNakshatraMuhurta({` | 라이트 | worker/routes/nakshatra-premium.js:385 |
| nakshatra-vvip-codex | 판매 | worker/routes/nakshatra-premium.js `const report = buildNakshatraVvipCodex({` | 라이트 | worker/routes/nakshatra-premium.js:436 |
| destiny-compass-crossroads | 판매 | app/destiny-compass/_components/Crossroads.tsx `computeCrossroad(field, a, b)` | 라이트 | app/destiny-compass/_components/Crossroads.tsx:45 |
| destiny-compass-life-voyage | 판매 | app/destiny-compass/_components/LifeVoyage.tsx `const phase = field.timeline[key];` | 라이트 | app/destiny-compass/_components/LifeVoyage.tsx:88 |
| destiny-compass-future-sim | 판매 | app/destiny-compass/_components/FutureSim.tsx `field.timeline[k]` | 라이트 | app/destiny-compass/_components/FutureSim.tsx:92 |
| openJuyukModal | 판매 | js/iching-engine.js `function _renderResult(` | 라이트 | js/iching-engine.js:629 |
| openKemetModal | 판매 | js/oracle-kcg.js `showKemetSpread` | 라이트 | js/oracle-kcg.js:339 |
| love-code | 판매 | app/saju/love-simulation/_components/LoveSimulationEngine.tsx `startSimulationScene(` | 라이트 | app/saju/love-simulation/_components/LoveSimulationEngine.tsx:1570 |
| stonehenge-runes-single | 판매 | StonehengeRune.jsx `drawRunes(spread)` | 라이트 | StonehengeRune.jsx:740 |
| stonehenge-runes-triad | 판매 | StonehengeRune.jsx `drawRunes` | 라이트 | StonehengeRune.jsx:57 |
| stonehenge-runes-deep | 판매 | StonehengeRune.jsx `drawRunes(spread)` | 라이트 | StonehengeRune.jsx:740 |
| stonehenge-runes-yearly | 판매 | StonehengeRune.jsx `drawRunes(spread)` | 라이트 | StonehengeRune.jsx:740 |
| animal-destiny-unlock | 판매 | app/saju/animal-destiny/components/AnimalDestinyPage.tsx `<AnimalResultScreen` | 라이트 | app/saju/animal-destiny/components/AnimalDestinyPage.tsx:160 |
| daily-fortune-reading | 판매 | app/today/TodayHubClient.tsx `setData(payload)` | 라이트 | app/today/TodayHubClient.tsx:1035 |
| fortune-prompt-hub-generate | 판매 | app/fortune/prompt-hub/PromptHubClient.tsx `await runPromptGeneration(shortfall.toolId, shor` | 라이트 | app/fortune/prompt-hub/PromptHubClient.tsx:2221 |
| dream-prompt-generator | 판매 | js/dream-ledger.js `openDreamModalCore` | 라이트 | js/dream-ledger.js:1932 |
| mbti-animal-compat | 판매 | js/astral-soul.js `openMbtiModalCore` | 라이트 | js/astral-soul.js:466 |
| nakshatra-basic-reading | 판매 | app/nakshatra/NakshatraFormClient.tsx `resolveReading(body)` | 라이트 | app/nakshatra/NakshatraFormClient.tsx:100 |
| destiny-bias-analyze | 판매 | app/saju/destiny-bias/DestinyBiasClient.tsx `const report = buildChemiReport({` | 라이트 | app/saju/destiny-bias/DestinyBiasClient.tsx:365 |
| destiny_meeting_place | 판매 | app/saju/destiny-meeting-place/components/DestinyMeetingPlacePage.tsx `generateDestinyMeetingPlaceResult(` | 라이트 | app/saju/destiny-meeting-place/components/DestinyMeetingPlacePage.tsx:125 |
| vedic_prashna_prompt | 판매 | worker/routes/fortune.js `prashnaResult = await generatePrashnaPromptResul` | 라이트 | worker/routes/fortune.js:3928 |
| vedic_basic_reading | 판매 | vedic-astrology.html `else if(id==='personality')html=renderPersonalit` | 라이트 | vedic-astrology.html:6715 |
| astro_career_talent_deep | 판매 | js/saju-engine.js `_astroCounselSection(` | 라이트 | js/saju-engine.js:26626 |
| astro_talent_attraction_deep | 판매 | js/saju-engine.js `_astroCounselSection(` | 라이트 | js/saju-engine.js:26626 |
| astro_relationship_deep | 판매 | js/saju-engine.js `_astroCounselSection(` | 라이트 | js/saju-engine.js:26626 |
| astro_growth_shadow_deep | 판매 | js/saju-engine.js `_astroCounselSection(` | 라이트 | js/saju-engine.js:26626 |
| astro_stellar_career_room | 판매 | js/saju-engine.js `_astroCounselSection(` | 라이트 | js/saju-engine.js:26626 |
| astro_stellar_talent_room | 판매 | js/saju-engine.js `_astroCounselSection(` | 라이트 | js/saju-engine.js:26626 |
| astro_stellar_relationship_room | 판매 | js/saju-engine.js `_astroCounselSection(` | 라이트 | js/saju-engine.js:26626 |
| astro_stellar_growth_room | 판매 | js/saju-engine.js `_astroCounselSection(` | 라이트 | js/saju-engine.js:26626 |
| astro_yearly_transit | 판매 | js/saju-engine.js `R.renderYearSection(` | 라이트 | js/saju-engine.js:26889 |
| ziwei_decade_luck | 판매 | worker/lib/saju-section/paid-ziwei.src.js `html: dahanTimelineHtml,` | 라이트 | worker/lib/saju-section/paid-ziwei.src.js:3190 |
| ziwei_love_deep | 판매 | worker/lib/saju-section/paid-ziwei.src.js `ziwei_love_deep: sec_love_compat_spread + sec_lo` | 라이트 | worker/lib/saju-section/paid-ziwei.src.js:3199 |
| ziwei_twelve_palaces | 판매 | worker/lib/saju-section/paid-ziwei.src.js `ziwei_twelve_palaces: sec2,` | 라이트 | worker/lib/saju-section/paid-ziwei.src.js:3198 |
| ziwei_symbolic_layer | 판매 | worker/lib/saju-section/paid-ziwei.src.js `ziwei_symbolic_layer: sec_olympus_ziwei,` | 라이트 | worker/lib/saju-section/paid-ziwei.src.js:3200 |
| ziwei_life_yearly_flow | 판매 | js/saju-engine.js `buildZwYearlyFlowDeepHtml(pd)` | 라이트 | js/saju-engine.js:14141 |
| premium-fpti-report | 판매 | worker/routes/fpti.js `async function createAndArchiveDeepReport(` | 라이트 | worker/routes/fpti.js:793 |
| tetogen_deep_report | 판매 | js/entertain-engine.js `function buildTetogenDeepReportBody(` | 라이트 | js/entertain-engine.js:2803 |
| premium-sukuyo-compat-extra | 판매 | js/saju-engine-tarot-sukuyo-quantum.js `syRequirePaidSukuyoFeature(` | 라이트 | js/saju-engine-tarot-sukuyo-quantum.js:4014 |
| rpt_specialCharmCard | 판매 | worker/lib/saju-section/paid-charm.src.js `function renderSpecialCharm(p, natal)` | 라이트 | worker/lib/saju-section/paid-charm.src.js:5 |
| rpt_quantumCard | 판매 | worker/lib/saju-section/paid-quantum.src.js `function renderQuantumStrategy(p, natal, bazi)` | 라이트 | worker/lib/saju-section/paid-quantum.src.js:6 |
| rpt_healthReportCard | 판매 | worker/lib/saju-section/paid-health.src.js `w.renderHealthReport = function` | 라이트 | worker/lib/saju-section/paid-health.src.js:2252 |
| rpt_skillTreeCard | 판매 | worker/lib/saju-section/paid-skill.src.js `function renderSkillTree(p, natal){` | 라이트 | worker/lib/saju-section/paid-skill.src.js:172 |
| rpt_energyCoordCard | 판매 | worker/lib/saju-section/paid-energy.src.js `function renderEnergyCoord(natal)` | 라이트 | worker/lib/saju-section/paid-energy.src.js:8 |
| rpt_villainCard | 판매 | worker/lib/saju-section/paid-villain.src.js `function renderVillain(p, power)` | 라이트 | worker/lib/saju-section/paid-villain.src.js:1208 |
| rpt_secretHouseEntryCard | 판매 | js/core/saju/reportDashboard.js `var target = '/secret-house_real.html';` | 라이트 | js/core/saju/reportDashboard.js:344 |
| fun.quantumLotto.ritualReport | 판매 | js/saju-engine-tarot-sukuyo-quantum.js `function buildLottoRitualReport(state)` | 라이트 | js/saju-engine-tarot-sukuyo-quantum.js:4323 |
| saju-career-style | 판매 | app/saju/career-style/CareerStyleClient.tsx 로컬 계산, worker/lib/career-style-access.js 권한 확인 | 라이트 | worker/lib/career-style-access.js |
| flower-fc | 판매 | worker/routes/destiny-flower.js 서버 계산 매칭 | 라이트 | worker/routes/destiny-flower.js:15 |
| olympus-fc | 판매 | js/destiny-profile.js 해금 뒤 saju-section 정적 본문 | 라이트 | js/destiny-profile.js:2286 |
| rpgCharacter | 판매 | worker/routes/saju-section.js 정적 본문 | 라이트 | worker/routes/saju-section.js |
| travelDestiny | 판매 | worker/routes/saju-section.js 정적 본문 | 라이트 | worker/routes/saju-section.js |
| healthReport | 판매 | worker/lib/saju-section/paid-health.src.js 정적 본문 | 라이트 | worker/lib/saju-section/paid-health.src.js |
| section_daewun | 판매 | worker/lib/saju-section/report.js 정적 본문 | 라이트 | worker/lib/saju-section/report.js |
| section_summary | 판매 | worker/lib/saju-section/report.js 정적 본문 | 라이트 | worker/lib/saju-section/report.js |
| section_compat | 판매 | worker/lib/content-unlocks.js 해금, saju-section 정적 본문 | 라이트 | worker/lib/content-unlocks.js |
| secretHouseEpisodes | 판매 | worker/routes/saju-section.js 정적 본문 | 라이트 | worker/routes/saju-section.js |
| nakshatra-lord-report | 판매 | worker/routes/nakshatra-premium.js 결정형 조립 | 라이트 | worker/routes/nakshatra-premium.js |
| nakshatra-dasha-map | 판매 | worker/routes/nakshatra-premium.js 결정형 조립 | 라이트 | worker/routes/nakshatra-premium.js |

## 제외

| featureKey | 판매 여부 | 실행 경로 | 판정 | 근거 파일:행 |
|---|---|---|---|---|
| premium-sibyl-dominator | 판매 | worker/routes/sibyl.js:485 → readOrGenerateSibyl → generateSibylCounsel | 제외: 결제 뒤 generateSibylCounsel이 Gemini를 호출한다 | worker/lib/sibyl-report-store.js:39 |
| saju-guardian-unlock | 판매 | /api/guardian/generate-image → requestGuardianImage(NVIDIA flux) | 제외: 해금 뒤 호출마다 외부 이미지 모델(NVIDIA flux)을 부른다 | worker/routes/guardian-image.js:116 |
| premiumDivinationPack | 판매 | access-control이 celestialHarmony 등 권한을 연다 | 제외: 천체의 선율 등 언어 모델 상품 권한을 함께 연다 | worker/lib/access-control.js:18 |
| sajuDiary | 판매 | 서버·클라이언트 소비처 없음 | 제외: 결제 뒤 실행 경로를 찾지 못했다 | worker/lib/paid-feature-registry.js:505 |
| sukuyo-symbolic-comparison | 판매 | - | 제외: 판매 종료 | scripts/lib/paid-delivery-inventory.mjs |
| human-design-chart | 판매 | - | 제외: 판매 종료 | scripts/lib/paid-delivery-inventory.mjs |
| psychotest-reading | 판매 | - | 제외: 판매 종료 | scripts/lib/paid-delivery-inventory.mjs |
| palm-reading-ai-consult | 판매 | - | 제외: 판매 종료 | scripts/lib/paid-delivery-inventory.mjs |
| ziwei-island-palace-consult | 판매 | - | 제외: 판매 종료 | scripts/lib/paid-delivery-inventory.mjs |
| ziwei-island-deep-report | 판매 | - | 제외: 판매 종료 | scripts/lib/paid-delivery-inventory.mjs |
| profile-card-manage | 판매 | - | 제외: 판매 종료 | scripts/lib/paid-delivery-inventory.mjs |
| sukuyo-monthly-fortune | 판매 | - | 제외: 등록만 있고 쓰지 않는다 | scripts/lib/paid-delivery-inventory.mjs |
| turtleIChing | 판매 | - | 제외: 등록만 있고 쓰지 않는다 | scripts/lib/paid-delivery-inventory.mjs |
| egyptOracle | 판매 | - | 제외: 등록만 있고 쓰지 않는다 | scripts/lib/paid-delivery-inventory.mjs |
| egyptian_oracle_ai_prompt | 판매 | - | 제외: 등록만 있고 쓰지 않는다 | scripts/lib/paid-delivery-inventory.mjs |
| stonehengeRunes | 판매 | - | 제외: 등록만 있고 쓰지 않는다 | scripts/lib/paid-delivery-inventory.mjs |
| stonehenge-runes-ai-prompt | 판매 | - | 제외: 등록만 있고 쓰지 않는다 | scripts/lib/paid-delivery-inventory.mjs |
| premiumTarot | 판매 | - | 제외: 등록만 있고 쓰지 않는다 | scripts/lib/paid-delivery-inventory.mjs |
| astro_basic_deep_pack | 판매 | - | 제외: 등록만 있고 쓰지 않는다 | scripts/lib/paid-delivery-inventory.mjs |
| astro_monthly_transit | 판매 | - | 제외: 등록만 있고 쓰지 않는다 | scripts/lib/paid-delivery-inventory.mjs |

## 사용자 결정 필요

- `premium-sibyl-dominator`(20,000원)와 `premiumDivinationPack`(30,000원)은 2만 원 이상 후보였지만 모델 호출이나 모델 상품 권한이 있다. 가격을 내리지 않았다.
