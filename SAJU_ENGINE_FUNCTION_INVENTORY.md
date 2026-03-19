# saju-engine.js 함수 인벤토리 (라인 번호 기준)

## 📍 Group A: KASI 음양력 변환 함수

| 함수명 | 라인 | 용도 | 노출 |
|--------|------|------|------|
| `_setRunButtonToRetry()` | 16 | 라이브러리 재시도 버튼 설정 | 개인 |
| `_hideLibOverlay()` | 41 | 로드 오버레이 숨김 | 개인 |
| `_kasiPad2(v)` | 65 | 2자리 패딩 (숫자) | 개인 |
| `_kasiSolarKey(y, m, d)` | 69 | 양력 캐시 키 생성 | 개인 |
| `_kasiLunarKey(y, m, d, isLeap)` | 73 | 음력 캐시 키 생성 | 개인 |
| `_clonePlain(obj)` | 77 | 깊은 복사 (JSON.stringify) | 개인 |
| `_applyKasiSeedGuard(store)` | 85 | 기본값 재적용 & 무결성 검사 | 개인 |
| `_loadKasiLocalPatchStore()` | 137 | localStorage에서 패치 로드 | 개인 |
| `_saveKasiLocalPatchStore(store)` | 155 | localStorage에 패치 저장 | 개인 |
| `_getPatchedSolarToLunar(y, m, d)` | 163 | 패치된 양→음 변환 조회 | 개인 |
| `_getPatchedLunarToSolar(y, m, d, isLeap)` | 176 | 패치된 음→양 변환 조회 | 개인 |
| `rememberKasiCalendarReference(ref)` | 189 | **📌 공개**: 기준점 저장 | **공개** |
| `KasiEngine.solarToLunar(date)` | ~260 | **📌 공개**: 양→음 변환 | **공개** |
| `KasiEngine.lunarToSolar(y, m, d, isLeap)` | ~320 | **📌 공개**: 음→양 변환 | **공개** |
| `KasiEngine.getGanji(date, opts)` | ~345 | **📌 공개**: 간지 추출 | **공개** |
| `getActualSolarDate(dateStr, typeStr)` | 301 | **📌 공개**: 실제 양력 계산 | **공개** |
| `parseKasiGanjiPair(raw)` | 323 | **📌 공개**: 간지쌍 파싱 | **공개** |
| `resolveKasiDateContextSafe(input, opts)` | ~355 | **📌 공개**: 날짜 문맥 해석 | **공개** |
| `normalizeCalendarTypeInput(typeVal)` | 356 | 달력 타입 표준화 | 개인? |
| `buildFallbackDateContext(input, reason)` | 363 | 폴백 날짜 컨텍스트 구성 | 개인? |
| `loadNext()` | 794 | CDN 라이브러리 다음 시도 | 개인 |
| `waitForSolar(n)` | 835 | Solar 라이브러리 대기 | 개인 |
| `onLibReady()` | 840 | 라이브러리 준비 완료 콜백 | 개인 |

**Data:**
- `KASI_LOCAL_PATCH_STORAGE_KEY` (L55)
- `KASI_LOCAL_PATCH_SEED` (L56)
- `KASI_GAN_MAP` (L314)
- `KASI_JI_MAP` (L318)
- `_kasiLocalPatchStore` (L160)

---

## 📍 Group B: 사주 핵심 분석 함수

### B1: 기초 오행 함수 (8개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `whoControls(e)` | 878 | 어떤 오행이 주어진 오행을 극제하는가 |
| `parentOf(e)` | 879 | 어떤 오행이 주어진 오행을 생하는가 |

### B2: 핵심 분석 함수 (3개) ⭐⭐⭐
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `analyzeJohu(p)` | **2034** | **조후(調候) 판정** - 신강/신약 근거 |
| `calcPower(p)` | **2086** | **용신 강도 계산** - 억부 점수 |
| `detectJong(p)` | **2125** | **종격 판정** - 특수 사주 판별 |

### B3: 원소/능력 함수 (6개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `_dfSafeNumber(v, fallback)` | 1176 | 안전한 숫자 변환 |
| `_dfCloneElementWeights(natal)` | 1181 | 오행 가중치 복사 |
| `_dfSeasonFromMonthBranch(branch)` | 1193 | 지지로부터 계절 추론 |
| `_dfInferWaterLevel(weights, johuType)` | 1201 | 수분 정도 추론 |
| `_dfInferEnvironment(weights, season)` | 1214 | 환경 추론 |
| `_dfArrayCopy(v)` | 1229 | 배열 복사 |
| `_syncDestinyFlowerSajuSnapshot(reason)` | 1233 | **운명의 꽃** 동기화 |
| `_clearDestinyFlowerSajuSnapshot()` | 1311 | **운명의 꽃** 초기화 |

### B4: 대운 분석 (2개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `evalDaewun(ganChar, zhiChar)` | **2378** | **대운 간지 평가** |
| `getDetailedGaeun(element, isGood)` | 2723 | 대운 팁 제시 |

### B5: 검증 및 보조 (5개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `showJongVerificationModal(result, p)` | 2795 | 종격 검증 모달 |
| `extractSixPastTestingYears(result, p)` | 2736 | 과거 6년 테스트 추출 |
| `calcNatalElement(p)` | 2320 | 납음오행 계산 |
| `getQuantumElType(el, p, jg, pw, jh)` | 2334 | 양자 요소 타입 결정 |
| `getDetailedGaeun(element, isGood)` | 2723 | 세분화된 대운 조언 |
| `getGaeunTips(strongE)` | 2729 | 대운 팁 생성 |
| `getFortuneApiBaseUrl()` | 2873 | 운세 API URL |
| `getFortuneAuthToken()` | 2887 | 운세 인증 토큰 |
| `formatPointAmount(points)` | 2867 | 포인트 포맷팅 |

### B6: 호환도 분석 (3개) 🔄
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `analyzeCompat(p1, n1, pw1, jh1, jg1, p2, n2, pw2, jh2, jg2, type, name, blend)` | **13965** | **호환도 종합 분석** |
| `analyzeSokCompat(jh1, mj1, jh2, mj2, p1, p2, type, n1, n2)` | 14268 | 속궁 호환도 |
| `analyzePastLifeCompat(p1, p2, name)` | 14436 | 전생 인연 분석 |

### B7: 타로/운세 연동 (5개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `formatPointAmount(points)` | 2867 | 포인트 금액 포맷 |
| `getFortuneApiBaseUrl()` | 2873 | 운세 API 기본 URL |
| `getFortuneAuthToken()` | 2887 | 운세 API 인증 토큰 |
| `getStoredAuthUser()` | 2895 | 저장된 인증 사용자 |
| `isGuestFortuneModeEnabled()` | 2904 | 게스트 운세 모드 확인 |

**Data Structures:**

| 객체명 | 라인 | 크기 | 설명 |
|--------|------|------|------|
| `GAN` | 858 | 10개 | 천간 (甲-癸) |
| `JI` | ~867 | 12개 | 지지 (子-亥) |
| `SHENG` | 876 | 5개 | 오행 상생 |
| `KE` | 877 | 5개 | 오행 극제 |
| `ANIMAL_EMOJI` | ~870 | 12개 | 띠별 이모지 |
| `EL_K` | ~871 | 5개 | 오행 한글명 |
| `EL_E` | ~872 | 5개 | 오행 이모지 |
| `TS_DB` | 883+ | 10개 | 십성 (비견-정인) |
| `TS_DEEP` | ~930 | 10개 | 십성 상세 설명 |
| `MING_GONG` | 1097+ | 12개 | 자미두수 12궁 |
| `BODEOK` | ~1130 | 5개 | 복덕 |
| `JAEBAEK` | ~1160 | 5개 | 재백 |
| `GWALROK` | ~1180 | 3개 | 관록 |
| `BUCHEO` | ~1200 | 2개 | 부처궁 |
| `BUMOGUN` | ~1230 | 5개 | 부모궁 |
| `JANYEOGUN_DATA` | ~1300 | 5개 | 자녀궁 |
| `GAEUN_DB` | ~1000 | 5개 | 대운 길흉 |
| `HEALTH_DATA` | ~950 | 5개 | 오행별 건강 |
| `ZHI_FEAT` | ~1410 | 12개 | 지지 특징 |
| `ZHI_LIST` | ~1415 | 12개 | 지지 목록 |

**Global Variables:**
```javascript
GENDER, USER_NAME, BIRTH_YEAR, DAY_GAN, JOHU_TYPE, JOHU_SCORE, CURRENT_AGE
G_POWER, G_JONG, G_JOHU, G_PILLARS, G_NATAL, G_BAZI (L1232+)
```

---

## 📍 Group C: 천문학 (AstroEngine) 함수

**Entry Point**: `var AstroEngine = (function(){ ... })();` (L4702-5063)

**내부 함수 (비공개)**:
- `JD(Y, M, D, ut)` - 율리안 날짜
- `deltaT(y)` - ΔT 보정
- `obliquity(T)` - 황도 경사각
- `sunLon(jdTT)` - 태양 황경
- `moonLon(jdTT)` - 달 황경
- `mercuryLon(jdTT)`, `venusLon(jdTT)`, ... (행성) 
- `planetLon(planet, jd)` - 행성별 황경
- `calcAll(...)` - 종합 계산
- `toSign(lon)` - 황도 부호 변환
- 50+ 더 있음

**공개 인터페이스**:
```javascript
AstroEngine = {
  calcAll: function(year, month, day, localHour, lat, lon, tz, houseSystem) {...},
  toSign: function(lon) {...},
  deltaT: function(y) {...}
};
```

**이후 래퍼 함수**:
- `calcAstroApiChartOrThrow(...)` (L5345)
- `renderAstroApiUnavailable(reason)` (L5355)
- `renderAstroInsight()` (L5370)

---

## 📍 Group D: 자미두수(紫微) 함수

### D1: 기본 함수 (2개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `zwDisplayPalaceName(name)` | 1418 | 궁명 표시 |
| `calcZiweiPalaces(year, m, d, h, min)` | **1422** | **🌟 자미두수 팔궁 계산 핵심** |

### D2: 별 강도 평가 (12개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `zwCircularDistance12(a, b)` | 7266 | 12궁 원형 거리 |
| `zwElementAffinityScore(starEl, branchEl)` | 7270 | 오행 친화도 점수 |
| `zwGetStrengthContext()` | 7279 | 강도 컨텍스트 추출 |
| `zwNormalizeStrength(level)` | 7316 | 강도 정규화 |
| `zwStrengthToSymbol(level)` | 7326 | 강도→기호 변환 |
| `zwStrengthToClass(level)` | 7331 | 강도→CSS 클래스 |
| `zwStrengthStepUp(level, steps)` | 7339 | 강도 증가 |
| `zwStrengthStepDown(level, steps)` | 7348 | 강도 감소 |
| `zwStrengthToNumeric(level)` | 7357 | 강도→숫자 |
| `zwNumericToStrength(v)` | 7365 | 숫자→강도 |
| `zwBuildHarmonicProfile()` | 7372 | 조화 프로필 빌드 |
| `zwEvalHarmonic(profile, branchIdx)` | 7398 | 조화 평가 |

### D3: 별 계산 (2개) ⭐
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `zwComputeBrightnessScore(starName, zhi, ctx)` | 7453 | **별 밝기 점수** |
| `zwComputeStarStrength(starName, zhi, isBorrowed, ctx)` | 7566 | **별 강도 계산** |

### D4: 테이블 생성 (1개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `buildZwSummaryTableHtml(palace)` | 7617 | 궁별 요약 테이블 HTML |

### D5: 렌더링 (1개) 🎨
| 함수명 | 라인 | 크기 | 용도 |
|--------|------|------|------|
| `renderZiwei(p, natal, targetId)` | **7801** | **1000+ 라인** | **🌟 자미두수 전체 렌더링** |

### D6: 호환도 (2개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `_zwCompatPalSnapshotLite(zwData, palName)` | 627 | 궁위 스냅샷 (호환도) |
| `computeZiweiCompatLite(meBirth, partnerBirth)` | 656 | 자미두수 호환도 계산 |

**Data:**
- `ZHI_FEAT`, `ZHI_LIST` (L~1410)
- `ZW_ELEMENT_GENERATES, ZW_ELEMENT_CONTROLS` (오행 맵)
- `ZW_CLASSICAL_STATE` (L7285+) - 14 별 × 12 궁 상태 매트릭스
- `ZW_STAR_DATA` - 별 기본 정보

---

## 📍 Group E: 타로 & 숙요 함수

### E1: 데이터 (5개)
| 항목명 | 라인 | 크기 | 설명 |
|--------|------|------|------|
| `TAROT_DATA` | **16315** | **900 라인** | 78개 타로 카드 |
| `TAROT_CONTEXT` | 16377 | ~200라인 | 해석 컨텍스트 |
| `TAROT_SPREAD_LABELS` | 16668 | ~40라인 | 스프레드 라벨 |
| `TAROT_SHORT_TO_FILENAME` | 16874 | ~150라인 | 파일명 맵핑 |
| `TAROT_CARD_DEEP_PROFILE` | 17072 | ~200라인 | 카드 심화 정보 |

### E2: 상태 변수 (4개)
| 변수명 | 라인 | 설명 |
|--------|------|------|
| `tarotSpreadMode` | 16644 | 'one' \| 'three' |
| `tarotThreeCardState` | 16645 | 카드 상태 & 플립 인덱스 |
| `tarotReadingTimer` | 16646 | 타이밍 타이머 |
| `tarotLifecycleToken` | 16647 | 라이프사이클 토큰 |

### E3: 모드/흐름 제어 (6개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `invalidateTarotFlow()` | 16649 | 타로 플로우 무효화 |
| `isTarotModalActive()` | 16662 | 모달 활성 여부 |
| `getTarotSpreadLabels(cat)` | 16673 | 스프레드 라벨 조회 |
| `setTarotMode(mode)` | 16679 | 모드 설정 |
| `selectTarotCategory(cat, btn)` | 16710 | 카테고리 선택 |

### E4: 카드 선택 (3개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `pickThreeUniqueCards()` | 16771 | 3장 무작위 선택 |
| `pickThreeUniqueCardsForMingri(labels)` | 16782 | 명리 전용 3장 선택 |
| `pickOneCardForMingri()` | 16798 | 명리 전용 1장 선택 |

### E5: 매핑/정규화 (3개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `mapTarotCategoryToEngine(cat)` | 16811 | 카테고리→엔진 매핑 |
| `getEngineSpreadType(mode, labels)` | 16826 | 스프레드 타입 결정 |
| `normalizeEngineCard(card)` | 16837 | 카드 정규화 |

### E6: API 호출 (1개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `callTarotEngine(endpoint, payload)` | 16853 | **API 호출** |

### E7: 이미지 처리 (3개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `getTarotImageCandidates(shortName)` | 16904 | 이미지 후보 목록 |
| `loadTarotImage(shortName, onReady)` | 16952 | 이미지 로드 |
| `applyTarotImageToFace(frontEl, imgEl, short, alt)` | 16985 | 이미지 적용 |
| `syncTarotSpreadCardFace(cardEl)` | 17047 | 카드 페이스 동기화 |

### E8: 해석 (5개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `getTarotDeepProfile(card)` | 17097 | 카드 심화 정보 |
| `getTarotMingriLens(card, isReversed, cat)` | 17108 | 명리 렌즈 |
| `buildTarotCardCounselHtml(card, rev, cat, slot)` | 17120 | 카드 상담 HTML 빌드 |
| `summarizeDominantSipsin(cardsData)` | 17144 | 지배 십신 요약 |
| `buildTarotRealityPlan(cardsData, cat, labels)` | 17158 | 현실 계획 빌드 |

### E9: 플로우/플립 (6개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `startThreeCardFlow()` | 17184 | 3장 플로우 시작 |
| `flipTarotSpreadCard(index)` | 17227 | 카드 뒤집기 |
| `playTarotFlipSound()` | 17268 | 효과음 재생 |
| `showTarotFinalInterpretation()` | 17286 | 최종 해석 표시 |
| `startTarotReading()` | 17346 | 타로 읽기 시작 |
| `enterDivineFocus(...)` / `exitDivineFocus()` | 17442-17449 | 포커스 진입/퇴출 |

### E10: 스트리밍 (2개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `streamRitualText(text, targetId, callback)` | 17456 | 텍스트 스트리밍 |
| `streamRitualHtmlTyped(htmlStr, targetId, onComplete)` | 17506 | HTML 스트리밍 타입 |
| `createGoldDust(element)` | 17561 | 골드 더스트 애니메이션 |

### E11: 운세 분석 (5개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `switchFortune(tab, btn)` | 17580 | 운세 탭 전환 |
| `getGanZhiForDate(y, m, d, h)` | 17601 | 날짜 간지 추출 |
| `getMonthGanZhi(y, m)` | 17608 | 월간지 추출 |
| `analyzeFortuneGZ(gz, p, label)` | 17616 | 운세 간지 분석 |
| `buildFortuneHTML(res, p)` | 17766 | 운세 HTML 빌드 |
| `elColor(e)` | 17869 | 오행 색상 맵핑 |

### E12: 숙요 (3개) 🌙
| 함수명 | 라인 | 크기 | 용도 |
|--------|------|------|------|
| `calcSukuyoData(lunarObj, opt)` | **19029** | **300라인** | **숙요 계산** |
| `getDailyKarmicGuidance(lunarObj, m)` | 19332 | 일일 카르마 지도 |
| `renderSukuyo(p, natal, bazi, lunarObj)` | 19393 | **렌더링** |

---

## 📍 Group F: UI & DOM 렌더링 함수

### F1: 초기화 (8개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `setGender(g)` | 1732 | 성별 설정 |
| `getTenGod(dayGan, target)` | 1738 | 십신 조회 |
| `parseTimeZoneOffsetName(name)` | 1747 | TZ 오프셋 파싱 |
| `getTimeZoneOffsetHoursAtDate(...)` | 1757 | 날짜별 TZ 오프셋 |
| `resolveBirthTimezoneOffset(...)` | 1787 | 생년월일시 TZ 해석 |
| `populateBirthCountrySelector()` | 1920 | 국가 선택자 채우기 |
| `initSelectors()` | 1964 | 선택자 초기화 |
| `updateCorrectedTimePreview()` | 1983 | 보정 시간 미리보기 |

### F2: 요약 렌더링 (1개) ⭐
| 함수명 | 라인 | 크기 | 용도 |
|--------|------|------|------|
| `renderSummary(p, johu, natal)` | **13096** | **500+ 라인** | **🌟 메인 요약** |

### F3: 만세력 (4개)
| 함수명 | 라인 | 크기 | 용도 |
|--------|------|------|------|
| `renderManse(p)` | 4106 | ~100 라인 | 만세력 표 |
| `renderTenshin(p)` | 4128 | ~50 라인 | 천신 표 |
| `renderJohu(johu)` | 4147 | ~150 라인 | 조후 표 |
| `renderUkbu(p)` | 4318 | ~100 라인 | 일주 분석 |

### F4: 일주 (8개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `renderIlju(p)` | 3944 | **일주 렌더링** |
| `iljuSanitizeText(html)` | 3800 | HTML 새니타이즈 |
| `iljuSentenceList(text)` | 3808 | 문장 리스트 |
| `iljuBullets(text, maxCount)` | 3821 | 불릿 리스트 |
| `iljuEscapeHtml(str)` | 3827 | HTML 이스케이프 |
| `iljuSetList(id, items, fallback)` | 3836 | 리스트 설정 |
| `iljuSetBar(barId, valId, value)` | 3845 | 바 설정 |
| `buildIljuElementScores(pillars)` | 3853 | 요소 점수 빌드 |
| `buildIljuKeywords(key, data, stem, branch, el)` | 3915 | 키워드 빌드 |
| `showCharDetail(clicked, type, g, j, pos, isDayStem)` | 4028 | 문자 상세 표시 |

### F5: 스킬트리 (1개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `renderSkillTree(p, natal)` | 4547 | 기술 나무 렌더링 |
| `_buildHeroSVG(elColor)` | 4448 | 히어로 SVG 빌드 |

### F6: 천문학 (3개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `calcAstroApiChartOrThrow(...)` | 5345 | API 차트 계산 |
| `renderAstroApiUnavailable(reason)` | 5355 | 불가 메시지 |
| `renderAstroInsight()` | 5370 | 통찰 렌더링 |

### F7: 자미두수 (1개) 🔄
| 함수명 | 라인 | 크기 | 용도 |
|--------|------|------|------|
| `renderZiwei(p, natal, targetId)` | 7801 | 1000+ 라인 | (Group D와 공유) |

### F8: 호환도 상세 (2개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `generateDetailedAdvice(p, pw, jg, dom, dayMaster, ...)` | 14560 | 상세 조언 생성 |
| `_dwElType(el)` / `_getDwHapResults(g, j)` / `getDwQmBadge(g, j)` | 14646+ | 궁합 관련 헬퍼 |
| `buildDwQmSection(g, j)` | 14768 | 궁합 섹션 빌드 |

### F9: 대운 (3개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `renderDaewun(bazi)` | **14851** | **대운 렌더링** |
| `showDwDetail(age, gan, zhi, eval, score)` | 14913 | 대운 상세 |
| `toggleYear(el, event)` | 15073 | 연도 토글 |

### F10: 인생 그래프 (3개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `renderLifeGraph(bazi)` | 15104 | 인생 그래프 |
| `findSimilarCelebs(p)` | 15343 | 유사 유명인 찾기 |
| `renderVillain(p, power)` / `calculateHormoneVibe(p, power)` | 15476-15772 | 악당/호르몬 바이브 |
| `renderHormoneVibe(p, power)` | 15858 | 호르몬 바이브 렌더링 |

### F11: 퀀텀 분석 (3개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `startQuantumAnalysis()` | 16168 | 분석 시작 |
| `showQuantumResult()` | 16189 | 결과 표시 |
| `renderTodayDestinyCard(p)` | 16140 | 운명 카드 렌더링 |
| `renderQuantumStrategy(p, natal, bazi)` | 20974 | 양자 전략 렌더링 |

### F12: 편지/에너지 (2개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `renderLetter(p)` | 17915 | 편지 렌더링 |
| `renderEnergyCoord(natal)` | 18024 | 에너지 좌표 렌더링 |

### F13: 특화 리포트 (3개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `renderTTest(p, natal, johu, pw)` | 18196 | T 테스트 렌더링 |
| `renderHealthReport(p, natal, johu, pw, jg)` | 18329 | 건강 리포트 |
| `renderLottoNumbers(natal, bazi)` | 18748 | 로또 숫자 렌더링 |

### F14: 유명인 (2개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `populateCelebList()` | 13643 | 유명인 목록 채우기 |
| `setCeleb(c)` | 13732 | 유명인 설정 |

### F15: 모달 & 공통 (15개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `showJongVerificationModal(result, p)` | 2795 | 종격 검증 모달 |
| `formatPointAmount(points)` | 2867 | 포인트 포맷 |
| `getFortuneApiBaseUrl()` | 2873 | API URL 조회 |
| `getFortuneAuthToken()` | 2887 | 인증 토큰 |
| `getStoredAuthUser()` | 2895 | 저장된 사용자 |
| `isGuestFortuneModeEnabled()` | 2904 | 게스트 모드 |
| `updateFortunePointNotice(points)` | 2908 | 포인트 공지 업데이트 |
| `redirectToLoginForFortune()` | 2928 | 로그인 리다이렉트 |
| `redirectToPointRecharge()` | 2933 | 충전 리다이렉트 |
| `showFortuneConfirmModal(costPoints)` | 2938 | 확인 모달 |
| `closePrivacyModal()` | 3103 | 개인정보 모달 닫기 |
| `closeModal(e)` | 21371 | 모달 닫기 |
| `resetApp()` | 21376 | 앱 초기화 |
| `handleReportThumbError(imgEl)` | 21493 | 썸네일 오류 처리 |

### F16: 리포트 대시보드 (5개)
| 함수명 | 라인 | 용도 |
|--------|------|------|
| `renderReportDashboard()` | **21523** | **리포트 대시보드** |
| `syncReportBlockHeight(block)` | 21610 | 높이 동기화 |
| `_bindReportHeightWatcher(block)` | 21620 | 높이 감시자 바인드 |
| `_unbindReportHeightWatcher(block)` | 21656 | 감시자 언바인드 |
| `syncReportHeightFromNode(node)` | 21665 | 노드로부터 높이 동기화 |
| `toggleReportFeatureCard(btn)` | 21671 | 기능 카드 토글 |

---

## 📊 함수 통계

| 그룹 | 함수 개수 | 데이터 객체 | 총 라인 | 난이도 |
|------|----------|-----------|--------|--------|
| A | 23 | 3 | 800 | 🟢 낮음 |
| B | 35+ | 20+ | 4,200 | 🟡 중간 |
| C | 50+ | - | 360 | 🟢 낮음 |
| D | 20 | 5+ | 6,700 | 🔴 높음 |
| E | 40+ | 5 | 4,600 | 🟡 중간 |
| F | 60+ | - | 10,000+ | 🔴 매우높음 |
| **합계** | **230+** | **33+** | **26,660** | |

---

**작성일**: 2026-03-19  
**용도**: 모듈화 계획 및 코드 네비게이션
