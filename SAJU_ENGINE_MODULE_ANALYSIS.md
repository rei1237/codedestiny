# saju-engine.js Module 분석 결과

> **2026-03:** 런타임 로드 순서는 `js/saju-engine.js` → `js/saju-engine-tarot-sukuyo-quantum.js` → `js/core/saju/reportDashboard.js` → `js/saju-engine-continuation.js` 입니다. 아래 라인·용량은 **과거 단일 파일 스냅샷** 기준 설명입니다.

## 파일 기본 정보
- **경로**: js/saju-engine.js (코어; 타로/숙요 청크·리포트 UI·continuation은 별도 파일)
- **총 라인수**: ~21,710 라인
- **파일 크기**: ~2.5 MB
- **접근 방식**: 단일 대형 자바스크립트 파일 (6개 논리 모듈 혼재)

---

## Group A: KASI 음양력 변환 (라인 1-800)

### 라인 범위
- **시작**: Line 1
- **종료**: Line 800 (라이브러리 로딩 및 초기화)

### 핵심 함수 (정확한 라인 번호)
1. `_setRunButtonToRetry()` - Line 16
2. `_hideLibOverlay()` - Line 41
3. `_kasiPad2(v)` - Line 65
4. `_kasiSolarKey(y, m, d)` - Line 69
5. `_kasiLunarKey(y, m, d, isLeap)` - Line 73
6. `_clonePlain(obj)` - Line 77
7. `_applyKasiSeedGuard(store)` - Line 85
8. `_loadKasiLocalPatchStore()` - Line 137
9. `_saveKasiLocalPatchStore(store)` - Line 155
10. `_getPatchedSolarToLunar(y, m, d)` - Line 163
11. `_getPatchedLunarToSolar(year, month, day, isLeap)` - Line 176
12. `rememberKasiCalendarReference(reference)` - Line 189
13. `KasiEngine` (객체) - Line ~260
14. `getActualSolarDate(dateStr, typeStr)` - Line 301
15. `parseKasiGanjiPair(raw)` - Line 323
16. `resolveKasiDateContextSafe(input, options)` - Line ~355
17. `normalizeCalendarTypeInput(typeVal)` - Line 356
18. `buildFallbackDateContext(input, reason)` - Line 363
19. `loadNext()` - Line 794
20. `waitForSolar(n)`, `onLibReady()` - Line 835-840

### 데이터 구조
- `KASI_LOCAL_PATCH_STORAGE_KEY` (Line 55)
- `KASI_LOCAL_PATCH_SEED` (Line 56)
- `KASI_GAN_MAP` (Line 314)
- `KASI_JI_MAP` (Line 318)
- `CDN_URLS` (Line 3)
- `_kasiLocalPatchStore` (Line 160)

### 크기 추정
- 약 800 라인 (40-50 KB)

### 의존성
- 외부: `Solar/Lunar` 라이브러리, `localStorage`
- 내부: 없음

### 공개 API (외부 호출 대상)
- `getActualSolarDate()`
- `rememberKasiCalendarReference()`
- `KasiEngine.solarToLunar()`, `KasiEngine.lunarToSolar()`, `KasiEngine.getGanji()`
- `normalizeCalendarTypeInput()`
- `retrySajuLibraryLoad()` (window.~로 노출)

### 추출 난이도
**낮음** - 자체 완결적이며 의존성 없음

---

## Group B: 사주 핵심 분석 (라인 858-5063)

### 라인 범위
- **시작**: Line 858 (GAN 데이터 시작)
- **종료**: Line 5063 (AstroEngine 끝, 이전까지 모두 Group B와 관련)

### 핵심 함수 (카테고리별)

#### B1: 오행 및 십성 관계 (Line 858-900)
- `whoControls(e)` - Line 878
- `parentOf(e)` - Line 879

#### B2: 조후(調候) 분석 (Line 2034-2125)
- `analyzeJohu(p)` - Line 2034 ⭐ 핵심
- `calcPower(p)` - Line 2086 ⭐ 핵심
- `detectJong(p)` - Line 2125 ⭐ 핵심

#### B3: 납음오행(納音五行) & 원소 (Line 2320-2378)
- `calcNatalElement(p)` - Line 2320
- `getQuantumElType(el, p, jg, pw, jh)` - Line 2334
- `evalDaewun(ganChar, zhiChar)` - Line 2378

#### B4: 종격 검증 (Line 2125-2867)
- `showJongVerificationModal(jongResult, p)` - Line 2795
- `extractSixPastTestingYears(jongResult, p)` - Line 2736
- `getDetailedGaeun(element, isGood)` - Line 2723

#### B5: 운세 분석 헬퍼 (Line 1176-1230)
- `_dfSafeNumber(v, fallback)` - Line 1176
- `_dfCloneElementWeights(natal)` - Line 1181
- `_dfSeasonFromMonthBranch(branch)` - Line 1193
- `_dfInferWaterLevel(weights, johuType)` - Line 1201
- `_dfInferEnvironment(weights, season)` - Line 1214
- `_dfArrayCopy(v)` - Line 1229

#### B6: 운명의 꽃 스냅샷 (Line 1233-1418)
- `_syncDestinyFlowerSajuSnapshot(reason)` - Line 1233
- `_clearDestinyFlowerSajuSnapshot()` - Line 1311

#### B7: 대운 계산 (Line 2378+)
- `evalDaewun(ganChar, zhiChar)` - Line 2378 (주요 대운 판정)
- `renderDaewun(bazi)` - Line 14851

#### B8: 호환도 분석 (Line 13965+)
- `analyzeCompat(p1, n1, pw1, jh1, jg1, p2, n2, pw2, jh2, jg2, type, name, blendInfo)` - Line 13965 ⭐ 핵심
- `analyzeSokCompat(jh1, mj1, jh2, mj2, p1, p2, type, n1, n2)` - Line 14268
- `analyzePastLifeCompat(p1, p2, name)` - Line 14436

### 데이터 구조 (중요 순)
1. **오행 기초** (Line 858-877)
   - `GAN` - 10 천간 (甲-癸)
   - `JI` - 12 지지 (子-亥)
   - `SHENG` - 오행 상생 맵
   - `KE` - 오행 극제 맵
   - `ANIMAL_EMOJI`, `EL_K`, `EL_E` - 표시용

2. **십성 데이터베이스** (Line 883+)
   - `TS_DB` - 십성 기호 및 설명
   - `TS_DEEP` - 십성 상세 분석 텍스트
   - Line 883-~1000

3. **자미두수 궁위** (Line 1097+)
   - `MING_GONG` - 12궁 설명
   - `BODEOK` - 복덕 설명
   - `JAEBAEK` - 재백 설명
   - `GWALROK` - 관록 설명
   - `BUCHEO` - 부처궁
   - `BUMOGUN` - 부모궁
   - `JANYEOGUN_DATA` - 자녀궁

4. **건강 및 개운** (Line 1000+)
   - `HEALTH_DATA` - 요소별 건강 정보
   - `GAEUN_DB` - 대운 길흉 해석

5. **기타 상수**
   - `ZHI_FEAT`, `ZHI_LIST` (Line ~1410)

### 글로벌 상태 변수
- `GENDER`, `USER_NAME`, `BIRTH_YEAR`, `DAY_GAN`, `JOHU_TYPE`, `JOHU_SCORE`, `CURRENT_AGE`
- `G_POWER`, `G_JONG`, `G_JOHU`
- `G_PILLARS`, `G_NATAL`, `G_BAZI`

### 크기 추정
- 약 4,200 라인 (400-500 KB, 20% 공백)

### 의존성
- 외부: Group A (KASI 변환), Solar/Lunar 라이브러리
- 내부: 자체 완결적

### 공개 API
- `analyzeJohu(p)` - 조후 판정
- `calcPower(p)` - 신강/신약 계산
- `detectJong(p)` - 종격 판정
- `evalDaewun(ganChar, zhiChar)` - 대운 평가
- `calcNatalElement(p)` - 오행 분포 계산
- `analyzeCompat(p1, n1, ...)` - 호환도 분석

### 추출 난이도
**중간** - 내부 의존성은 없으나 데이터 구조가 매우 크고 복잡. 모든 다른 그룹의 기초가 됨

---

## Group C: 천문학 계산 (AstroEngine) (라인 4702-5063)

### 라인 범위
- **시작**: Line 4702 `var AstroEngine = (function(){`
- **종료**: Line 5063 `/* ═══════════════════════════ END AstroEngine ═══════════════════════════════ */`

### 핵심 함수
내부 IIFE(즉시 실행 함수) 내부의 비공개 함수들:
1. `JD(Y, M, D, ut)` - 율리우스력 계산
2. `deltaT(y)` - ΔT 보정 (1800-2050)
3. `obliquity(T)` - 황도 경사각 ε
4. `sunLon(jdTT)` - 태양 황경
5. `moonLon(jdTT)` - 달 황경
6. 기타 천문학 계산 함수 ~50개

**공개 인터페이스**:
```javascript
return {
  calcAll: calcAll,
  toSign: toSign,
  deltaT: deltaT
};
```

### 데이터 구조
- 내부 상수: 행성 데이터, VSOP87 계수 등
- 외부 노출: 최소한

### 크기 추정
- 약 360 라인 (25-30 KB)

### 의존성
- 외부: 수학 알고리즘만 (라이브러리 No)
- 내부: 없음

### 공개 API
- `AstroEngine.calcAll(year, month, day, localHour, lat, lon, tz, houseSystem)` - 종합 계산
- `AstroEngine.toSign(lon)` - 황도도 → 점성술 부호 변환
- `AstroEngine.deltaT(year)` - ΔT 값

### 추출 난이도
**매우 낮음** - 완전히 자체 완결적, 수학 알고리즘만 포함

---

## Group D: 자미두수(자미斗數) 팔궁 (라인 1418-8100)

### 라인 범위
- **시작**: Line 1418 `function zwDisplayPalaceName(name)`
- **주요**: Line 1422 `function calcZiweiPalaces(year, month, day, hour, minute)` ⭐ 핵심 계산
- **렌더링**: Line 7801 `function renderZiwei(p, natal, targetId)`
- **종료**: Line 8100 (renderZiwei 함수 종료 근처)

### 핵심 함수

#### D1: 팔궁 계산 (Line 1418-1732)
- `zwDisplayPalaceName(name)` - Line 1418
- `calcZiweiPalaces(year, month, day, hour, minute)` - Line 1422 ⭐ 핵심

#### D2: 별 강도 및 조화 계산 (Line 7266-7566)
- `zwCircularDistance12(a, b)` - Line 7266
- `zwElementAffinityScore(starElement, branchElement)` - Line 7270
- `zwGetStrengthContext()` - Line 7279
- `zwNormalizeStrength(level)` - Line 7316
- `zwStrengthToSymbol(level)` - Line 7326
- `zwStrengthToClass(level)` - Line 7331
- `zwStrengthStepUp(level, steps)` - Line 7339
- `zwStrengthStepDown(level, steps)` - Line 7348
- `zwStrengthToNumeric(level)` - Line 7357
- `zwNumericToStrength(v)` - Line 7365
- `zwBuildHarmonicProfile()` - Line 7372
- `zwEvalHarmonic(profile, branchIdx)` - Line 7398
- `zwComputeBrightnessScore(starName, zhi, ctxOverride)` - Line 7453
- `zwComputeStarStrength(starName, zhi, isBorrowed, ctxOverride)` - Line 7566

#### D3: 표 생성 (Line 7617)
- `buildZwSummaryTableHtml(palace)` - Line 7617

#### D4: 렌더링 (Line 7801부터 1000+ 라인)
- `renderZiwei(p, natal, targetId)` - Line 7801 ⭐

#### D5: 호환도 계산 (Line 627, 656)
- `_zwCompatPalSnapshotLite(zwData, palaceName)` - Line 627
- `computeZiweiCompatLite(meBirth, partnerBirth)` - Line 656

### 데이터 구조
1. **궁위 및 별 데이터** (Line 1450-7200)
   - `ZHI_FEAT` - 지지 특징 (Line ~1410)
   - `ZHI_LIST` - 지지 목록
   - `ZW_ELEMENT_GENERATES`, `ZW_ELEMENT_CONTROLS` - 오행 상생/극제
   - `ZW_CLASSICAL_STATE` - 전통 별 상태 표 (Line 7285+)
   - `ZW_STAR_DATA` - 별 기본 정보

2. **렌더링 스타일 데이터** (Line 7801 내부)
   - CSS 스타일, 팔궁 그리드 레이아웃

### 글로벌 상태
- `window._ziweiBirth` - 자미두수 생년월일시
- `window._currentZiweiData` - 현재 팔궁 계산 결과
- `window.getZiweiStructuredData()` - 접근 API

### 크기 추정
- 약 6,700 라인 (500-600 KB)
  - 계산: ~500 라인
  - 렌더링: ~1000+ 라인
  - 데이터+스타일: ~5,200 라인

### 의존성
- 외부: Group B (Saju Core - 오행 맵), Solar/Lunar 라이브러리
- 내부: 자체 완결적

### 공개 API
- `calcZiweiPalaces(year, month, day, hour, minute)` - 팔궁 계산
- `renderZiwei(p, natal, targetId)` - 렌더링
- `computeZiweiCompatLite(meBirth, partnerBirth)` - 호환도 계산

### 추출 난이도
**높음** - 렌더링이 매우 복잡하고 DOM 조작 코드 혼재. 계산 부분만 추출 쉬움

---

## Group E: 타로 & 숙요 운세 (라인 16315-20974)

### 라인 범위
- **시작**: Line 16315 `var TAROT_DATA = [`
- **타로 카드**: Line 16315-17600
- **숙요**: Line 19029 `function calcSukuyoData(lunarObj, opt = ...)`
- **렌더링**: Line 19393 `function renderSukuyo(p, natal, bazi, lunarObj)`
- **종료**: Line 20974 (renderQuantumStrategy)

### 핵심 함수

#### E1: 타로 데이터 & 상태 (Line 16315-16900)
- `TAROT_DATA` - 타로 카드 데이터베이스 (Line 16315)
- `TAROT_CONTEXT` - 타로 해석 컨텍스트 (Line 16377)
- `TAROT_SPREAD_LABELS` - 스프레드 라벨 (Line 16668)
- `TAROT_SHORT_TO_FILENAME` - 파일명 맵핑 (Line 16874)
- `TAROT_CARD_DEEP_PROFILE` - 카드 심화 정보 (Line 17072)

#### E2: 타로 선택 및 카드 처리 (Line 16771-16907)
- `invalidateTarotFlow()` - Line 16649
- `isTarotModalActive()` - Line 16662
- `getTarotSpreadLabels(cat)` - Line 16673
- `setTarotMode(mode)` - Line 16679
- `selectTarotCategory(cat, btn)` - Line 16710
- `pickThreeUniqueCards()` - Line 16771
- `pickThreeUniqueCardsForMingri(labels)` - Line 16782
- `pickOneCardForMingri()` - Line 16798
- `mapTarotCategoryToEngine(cat)` - Line 16811
- `getEngineSpreadType(mode, labels)` - Line 16826
- `normalizeEngineCard(card)` - Line 16837
- `callTarotEngine(endpoint, payload)` - Line 16853

#### E3: 타로 이미지 처리 (Line 16904-17047)
- `getTarotImageCandidates(shortName)` - Line 16904
- `loadTarotImage(shortName, onReady)` - Line 16952
- `applyTarotImageToFace(frontEl, imgEl, shortName, altText)` - Line 16985
- `syncTarotSpreadCardFace(cardEl)` - Line 17047

#### E4: 타로 해석 (Line 17097-17227)
- `getTarotDeepProfile(card)` - Line 17097
- `getTarotMingriLens(card, isReversed, category)` - Line 17108
- `buildTarotCardCounselHtml(card, isReversed, category, slotLabel)` - Line 17120
- `summarizeDominantSipsin(cardsData)` - Line 17144
- `buildTarotRealityPlan(cardsData, category, labels)` - Line 17158
- `startThreeCardFlow()` - Line 17184
- `flipTarotSpreadCard(index)` - Line 17227

#### E5: 타로 최종 해석 (Line 17268-17442)
- `playTarotFlipSound()` - Line 17268
- `showTarotFinalInterpretation()` - Line 17286
- `startTarotReading()` - Line 17346
- `enterDivineFocus(cardEl)` - Line 17442
- `exitDivineFocus()` - Line 17449
- `streamRitualText(text, targetId, callback)` - Line 17456
- `streamRitualHtmlTyped(htmlStr, targetId, onComplete)` - Line 17506
- `createGoldDust(element)` - Line 17561

#### E6: 운세 분석 (Line 17580-17869)
- `switchFortune(tab, btn)` - Line 17580
- `getGanZhiForDate(y, m, d, h)` - Line 17601
- `getMonthGanZhi(y, m)` - Line 17608
- `analyzeFortuneGZ(gz, p, label)` - Line 17616
- `buildFortuneHTML(res, p)` - Line 17766

#### E7: 숙요 (Line 19029-19393)
- `calcSukuyoData(lunarObj, opt = { leapRule: 'current' })` - Line 19029 ⭐
- `getDailyKarmicGuidance(lunarObj, m)` - Line 19332
- `renderSukuyo(p, natal, bazi, lunarObj)` - Line 19393

### 데이터 구조
1. **타로 카드 DB** (Line 16315-17200)
   - 78개 타로 카드 상세 정보
   - 정방향/역방향 의미

2. **숙요 데이터** (내부)
   - 28숙 정보
   - 길흉 판정
   - 카르마 지도

### 글로벌 상태
- `tarotSpreadMode` (Line 16644) - 'one' | 'three'
- `tarotThreeCardState` (Line 16645)
- `tarotReadingTimer` (Line 16646)
- `tarotLifecycleToken` (Line 16647)

### 크기 추정
- 약 4,600 라인 (350-400 KB)
  - 타로 카드 DB: ~900 라인
  - 함수/로직: ~3,700 라인

### 의존성
- 외부: API 호출 (타로 엔진), Group B (Saju Core)
- 내부: 자체 완결적

### 공개 API
- `calcSukuyoData(lunarObj, opt)` - 숙요 계산
- `renderSukuyo(p, natal, bazi, lunarObj)` - 렌더링
- `startTarotReading()` - 타로 시작
- `showTarotFinalInterpretation()` - 타로 결과 표시
- `selectTarotCategory(cat, btn)` - 카테고리 선택

### 추출 난이도
**중간** - 타로 DB 큼, 렌더링 복잡하나 계산은 독립적

---

## Group F: UI & DOM 렌더링 (라인 1730-21700)

### 라인 범위
- **시작**: Line 1730 (초기 UI 셋업)
- **주요 렌더링**: Line 2034+ (분석 함수들과 혼재)
- **종료**: Line 21700+ (마지막 리포트 표시)

### 핵심 함수 (카테고리별)

#### F1: 초기화 및 선택자 (Line 1730-1983)
- `setGender(g)` - Line 1732
- `getTenGod(dayGan, target)` - Line 1738
- `parseTimeZoneOffsetName(name)` - Line 1747
- `getTimeZoneOffsetHoursAtDate(...)` - Line 1757
- `resolveBirthTimezoneOffset(...)` - Line 1787
- `populateBirthCountrySelector()` - Line 1920
- `initSelectors()` - Line 1964
- `updateCorrectedTimePreview()` - Line 1983

#### F2: 주요 요약 렌더링 (Line 13096+)
- `renderSummary(p, johu, natal)` - Line 13096 ⭐ 메인 요약

#### F3: 만세력 렌더링 (Line 4106-4448)
- `renderManse(p)` - Line 4106
- `renderTenshin(p)` - Line 4128
- `renderJohu(johu)` - Line 4147
- `renderUkbu(p)` - Line 4318
- `_buildHeroSVG(elColor)` - Line 4448

#### F4: 일주(日柱) 렌더링 (Line 3944-4028)
- `renderIlju(p)` - Line 3944 ⭐
- `iljuSanitizeText(html)` - Line 3800
- `iljuSentenceList(text)` - Line 3808
- `iljuBullets(text, maxCount)` - Line 3821
- `iljuEscapeHtml(str)` - Line 3827
- `iljuSetList(id, items, fallback)` - Line 3836
- `iljuSetBar(barId, valId, value)` - Line 3845
- `buildIljuElementScores(pillars)` - Line 3853
- `buildIljuKeywords(key, data, stem, branch, elementLabel)` - Line 3915
- `showCharDetail(clickedChar, charType, g, j, posLabel, isDayStem)` - Line 4028

#### F5: 기술나무(스킬트리) 렌더링 (Line 4547+)
- `renderSkillTree(p, natal)` - Line 4547

#### F6: 천문학 렌더링 (Line 5370+)
- `renderAstroInsight()` - Line 5370
- `calcAstroApiChartOrThrow(...)` - Line 5345
- `renderAstroApiUnavailable(reason)` - Line 5355

#### F7: 자미두수 렌더링 (Line 7801+)
- `renderZiwei(p, natal, targetId)` - Line 7801 ⭐ (Group D와 공유)

#### F8: 호환도 분석 및 렌더링 (Line 13965-14560)
- `analyzeCompat(...)` - Line 13965 (계산, Group B)
- `analyzeSokCompat(...)` - Line 14268 (계산, Group B)
- `analyzePastLifeCompat(...)` - Line 14436 (계산, Group B)
- `generateDetailedAdvice(...)` - Line 14560
- `_dwElType(el)` - Line 14646
- `_getDwHapResults(g, j)` - Line 14662
- `getDwQmBadge(g, j)` - Line 14751
- `buildDwQmSection(g, j)` - Line 14768

#### F9: 대운 렌더링 (Line 14851-15073)
- `renderDaewun(bazi)` - Line 14851 ⭐
- `showDwDetail(age, gan, zhi, evaluation, score)` - Line 14913
- `toggleYear(el, event)` - Line 15073

#### F10: 인생 그래프 (Line 15104-15476)
- `renderLifeGraph(bazi)` - Line 15104
- `findSimilarCelebs(p)` - Line 15343
- `renderVillain(p, power)` - Line 15476
- `calculateHormoneVibe(p, power)` - Line 15772
- `renderHormoneVibe(p, power)` - Line 15858

#### F11: 퀀텀 분석 (Line 16168-20974)
- `startQuantumAnalysis()` - Line 16168
- `showQuantumResult()` - Line 16189
- `renderTodayDestinyCard(p)` - Line 16140
- `renderQuantumStrategy(p, natal, bazi)` - Line 20974 ⭐

#### F12: 편지(Letter) 렌더링 (Line 17915-18024)
- `renderLetter(p)` - Line 17915
- `renderEnergyCoord(natal)` - Line 18024
- `elColor(e)` - Line 17869

#### F13: 특화 리포트 (Line 18196-18748)
- `renderTTest(p, natal, johu, pw)` - Line 18196
- `renderHealthReport(p, natal, johu, pw, jg)` - Line 18329
- `renderLottoNumbers(natal, bazi)` - Line 18748

#### F14: 유명인 유사도 (Line 13643-13732)
- `populateCelebList()` - Line 13643
- `setCeleb(c)` - Line 13732

#### F15: 모달 및 공통 (Line 2795-21700)
- `showJongVerificationModal(jongResult, p)` - Line 2795
- `formatPointAmount(points)` - Line 2867
- `getFortuneApiBaseUrl()` - Line 2873
- `getFortuneAuthToken()` - Line 2887
- `getStoredAuthUser()` - Line 2895
- `isGuestFortuneModeEnabled()` - Line 2904
- `updateFortunePointNotice(points)` - Line 2908
- `redirectToLoginForFortune()` - Line 2928
- `redirectToPointRecharge()` - Line 2933
- `showFortuneConfirmModal(costPoints)` - Line 2938
- `closePrivacyModal()` - Line 3103
- `closeModal(e)` - Line 21371
- `resetApp()` - Line 21376
- `handleReportThumbError(imgEl)` - Line 21493

#### F16: 리포트 대시보드 (Line 21523-21700)
- `renderReportDashboard()` - Line 21523 ⭐
- `syncReportBlockHeight(block)` - Line 21610
- `_bindReportHeightWatcher(block)` - Line 21620
- `_unbindReportHeightWatcher(block)` - Line 21656
- `syncReportHeightFromNode(node)` - Line 21665
- `toggleReportFeatureCard(btn)` - Line 21671

### 데이터 구조
- 인라인 HTML 문자열 (매우 많음)
- CSS 스타일 블록 (매우 많음)
- DOM 선택자 상수들

### 글로벌 상태 (수정)
- `G_POWER`, `G_JONG`, `G_JOHU` (계산 결과 캐시)
- `window._currentZiweiData` (자미두수)
- `window._astroBirth` (천문학 생년월일시)
- 다수의 모달/UI 상태 변수

### 크기 추정
- 약 10,000+ 라인 (800+ KB)
  - HTML/CSS: ~6,000+ 라인
  - 함수: ~4,000 라인

### 의존성
- 외부: DOM API, 모든 계산 모듈 (A, B, C, D, E)
- 내부: 모든 다른 그룹의 결과 사용

### 공개 API (이벤트 핸들러)
- `initSelectors()` - 초기화
- `resetApp()` - 초기화
- `renderSummary()`, `renderManse()`, `renderIlju()`, `renderZiwei()`, 등 - 렌더링 함수들
- 매우 많은 click/change 핸들러

### 추출 난이도
**매우 높음** - 계산 로직과 DOM 렌더링이 완전히 혼재. 점진적 리팩토링 필요

---

## 공유 전역 변수 & 초기화

### 사용자 정보 (Line 1232)
```javascript
var GENDER='F', USER_NAME='', BIRTH_YEAR=0, DAY_GAN='', 
    JOHU_TYPE='', JOHU_SCORE=0, CURRENT_AGE=0;
```

### 계산 결과 캐시 (Line 1233)
```javascript
var G_POWER=null, G_JONG=null, G_JOHU=null;
var G_PILLARS=null, G_NATAL=null, G_BAZI=null;
```

### 입력 데이터 (Line 1235-1236)
```javascript
window._ziweiBirth = {year:0, month:0, day:0, hour:12, minute:0};
window._astroBirth = {year:0, month:0, day:0, hour:12, minute:0, lat:37.6, lon:127.0, tz:9};
```

---

## 초기화 순서

1. **Line 1-828**: CDN 라이브러리 로드 (Group A)
2. **Line 858+**: 데이터 구조 선언 (Group B)
3. **Line 1232+**: 전역 상태 변수
4. **Line 4702+**: AstroEngine (Group C) - 순수 함수
5. **Page Ready**: 이벤트 핸들러 연결 (Group F)

---

## 추출 전략 권장순서

### Phase 1: 독립적 모듈 (난이도 낮음)
1. **Group C (AstroEngine)** - 360 라인, 순수 수학
2. **Group A (KASI)** - 800 라인, 자체 완결

### Phase 2: 핵심 데이터 & 계산 (난이도 중간)
3. **Group B (Saju Core)** - 4,200 라인, 만능 기초
4. **Group E (Tarot/Sukkuyo)** - 4,600 라인, Group B 의존

### Phase 3: Ziwei (난이도 높음)
5. **Group D (Ziwei)** - 6,700 라인, 렌더링 분리 필요

### Phase 4: UI 레이어 (난이도 매우 높음)
6. **Group F (UI)** - 10,000+ 라인, 계산과 분리 후 리팩토링

---

## 주요 발견사항

| 항목 | 값 |
|------|-----|
| 단일 파일 크기 | 2.5 MB, 21,710 라인 |
| 함수 개수 | ~200+ 함수 |
| 데이터 구조 | 60+ 대형 객체/배열 |
| 전역 변수 | 30+ 개 |
| 의존성 복잡도 | 높음 (F → D,E,C,B,A 계층) |
| 테스트 가능성 | 낮음 (DOM 강결합) |
| 유지보수성 | 매우 낮음 (혼재) |
| 모듈화 난이도 | **높음** (UI와 계산 분리 필수) |

---

## 모듈화 시 고려사항

1. **Global State 관리**
   - G_POWER, G_JONG 등 ~20개 전역 변수 → State 객체로 포장
   
2. **Event Handler 위임**
   - 렌더링 함수들이 클릭 핸들러를 인라인으로 생성
   - 이벤트 위임 시스템으로 중앙화 필요

3. **타로 카드 데이터**
   - 16,315-17,200 라인의 거대한 데이터베이스
   - JSON 파일로 외부화 권장

4. **CSS 분리**
   - 렌더링 함수 내 인라인 CSS (매우 많음)
   - CSS 모듈로 분리

5. **API 호출**
   - 타로 엔진, 포인트 API 등
   - 서비스 레이어로 추상화

---

## 추출 예상 난이도 & 일정

| 그룹 | 라인 | 난이도 | 예상 시간 |
|------|------|--------|----------|
| A (KASI) | 800 | 낮음 | 1-2시간 |
| C (Astro) | 360 | 낮음 | 1시간 |
| B (Saju Core) | 4,200 | 중간 | 4-6시간 |
| E (Tarot) | 4,600 | 중간 | 4-6시간 |
| D (Ziwei) | 6,700 | 높음 | 8-12시간 |
| F (UI) | 10,000+ | 매우높음 | 20-30시간+ |

**총 예상**: 40-60시간 (점진적 리팩토링 포함)

---

**작성일**: 2026-03-19  
**분석 대상**: saju-engine.js (js/saju-engine.js & public/js/saju-engine.js) 동일 버전
